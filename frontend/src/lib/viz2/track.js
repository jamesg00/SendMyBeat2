// The beat engine run over the whole decoded beat once, so the preview (by playback time) and the
// video export (step by step) read exactly the same frames. One step is 1/60 s.
//
// Per step: a 2048-point Blackman FFT of the samples ending at that moment, in dB the way
// AnalyserNode.getFloatFrequencyData reports it with no smoothing, plus the RMS of three filtered
// taps (low, mid, high) run through the same biquads Web Audio uses. BeatEngine turns those into
// the frame; we keep its numbers (about 0.5 KB a step) and read the waveform from the samples.

import { BeatEngine, NB, SPEC_FFT, createFrame } from "./engine";
import { fft, tablesFor } from "../offlineAnalysis";

export const TRACK_STEP_HZ = 60;
const AUX = 12; // low mid high energy kick kickStrength snare snareStrength hat hatStrength live t
const HIT_KICK = 1;
const HIT_SNARE = 2;
const HIT_HAT = 4;

/** Web Audio's biquad (Audio EQ Cookbook with Q in dB for lowpass and highpass). */
function biquad(type, freq, qDb, sampleRate) {
  const w0 = (2 * Math.PI * freq) / sampleRate;
  const alpha = Math.sin(w0) / (2 * Math.pow(10, qDb / 20));
  const cos = Math.cos(w0);
  let b0;
  let b1;
  let b2;
  if (type === "lowpass") {
    b0 = (1 - cos) / 2;
    b1 = 1 - cos;
    b2 = (1 - cos) / 2;
  } else {
    b0 = (1 + cos) / 2;
    b1 = -(1 + cos);
    b2 = (1 + cos) / 2;
  }
  const a0 = 1 + alpha;
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: (-2 * cos) / a0, a2: (1 - alpha) / a0, x1: 0, x2: 0, y1: 0, y2: 0 };
}

function runChain(chain, x) {
  for (let i = 0; i < chain.length; i += 1) {
    const f = chain[i];
    const y = f.b0 * x + f.b1 * f.x1 + f.b2 * f.x2 - f.a1 * f.y1 - f.a2 * f.y2;
    f.x2 = f.x1;
    f.x1 = x;
    f.y2 = f.y1;
    f.y1 = y;
    x = y;
  }
  return x;
}

const TAPS = [
  { size: 1024, filters: [["lowpass", 120, 0.7], ["lowpass", 120, 0.7], ["highpass", 32, 0.7]] },
  { size: 1024, filters: [["highpass", 900, 0.7], ["lowpass", 4200, 0.7]] },
  { size: 512, filters: [["highpass", 7000, 0.7], ["highpass", 7000, 0.7]] },
];

export class BeatTrack {
  constructor(beat, steps) {
    this.samples = beat.samples;
    this.sampleRate = beat.sampleRate;
    this.duration = beat.duration;
    this.steps = steps;
    this.specs = new Float32Array(steps * NB * 2);
    this.aux = new Float32Array(steps * AUX);
    this.hits = new Uint8Array(steps);
    this.lastStep = -1;
  }

  /** Copy step n into the frame `A`. `hitsFrom` ORs the hits of skipped steps so no kick is lost. */
  fillStep(n, A, hitsFrom = n) {
    const step = Math.max(0, Math.min(this.steps - 1, n | 0));
    const o = step * NB * 2;
    A.spec.set(this.specs.subarray(o, o + NB));
    A.specFast.set(this.specs.subarray(o + NB, o + NB * 2));
    const x = step * AUX;
    const aux = this.aux;
    A.low = aux[x];
    A.mid = aux[x + 1];
    A.high = aux[x + 2];
    A.energy = aux[x + 3];
    A.kick = aux[x + 4];
    A.kickStrength = aux[x + 5];
    A.snare = aux[x + 6];
    A.snareStrength = aux[x + 7];
    A.hat = aux[x + 8];
    A.hatStrength = aux[x + 9];
    A.live = aux[x + 10] > 0 && n < this.steps;
    A.t = step / TRACK_STEP_HZ;
    let h = 0;
    for (let s = Math.max(0, Math.min(step, hitsFrom)); s <= step; s += 1) h |= this.hits[s];
    A.kickHit = Boolean(h & HIT_KICK);
    A.snareHit = Boolean(h & HIT_SNARE);
    A.hatHit = Boolean(h & HIT_HAT);
    // Waveform: the 2048 samples ending now.
    const end = Math.floor((step / TRACK_STEP_HZ) * this.sampleRate);
    const wave = A.wave;
    const start = end - wave.length;
    for (let i = 0; i < wave.length; i += 1) {
      const j = start + i;
      wave[i] = j >= 0 && j < this.samples.length ? this.samples[j] : 0;
    }
    return A;
  }

  /** Preview: the frame at playback time `seconds`, with the hits since the last call. */
  fillAtTime(seconds, A) {
    const step = Math.max(0, Math.floor(seconds * TRACK_STEP_HZ));
    const prev = this.lastStep;
    // A seek (or a jump back) drops the hits of the gap instead of firing them all at once.
    const from = prev >= 0 && step > prev && step - prev <= 6 ? prev + 1 : step;
    this.lastStep = step;
    this.fillStep(step, A, from);
    if (prev >= 0 && (step < prev || step - prev > 6)) {
      A.kickHit = false;
      A.snareHit = false;
      A.hatHit = false;
    }
    return A;
  }
}

/**
 * Run the engine over the whole beat. Yields to the page every `chunk` steps.
 * @param {{ samples: Float32Array, sampleRate: number, duration: number }} beat  from decodeBeat
 */
export async function buildBeatTrack(beat, { signal, onProgress, chunk = 1500 } = {}) {
  const { samples, sampleRate } = beat;
  const steps = Math.max(1, Math.ceil(beat.duration * TRACK_STEP_HZ) + 1);
  const track = new BeatTrack(beat, steps);
  const engine = new BeatEngine();
  const A = createFrame();
  const tables = tablesFor(SPEC_FFT);
  const re = new Float32Array(SPEC_FFT);
  const im = new Float32Array(SPEC_FFT);
  const db = new Float32Array(SPEC_FFT / 2);
  const binHz = sampleRate / SPEC_FFT;
  const chains = TAPS.map((tap) => tap.filters.map(([type, f, q]) => biquad(type, f, q, sampleRate)));
  const rings = TAPS.map((tap) => ({ buf: new Float32Array(tap.size), pos: 0, sum: 0 }));
  const rms = [0, 0, 0];
  const dt = 1 / TRACK_STEP_HZ;
  let filtered = 0; // samples pushed through the tap filters so far
  const { reverse, window } = tables;
  const scale = 1 / SPEC_FFT;

  for (let n = 0; n < steps; n += 1) {
    const end = Math.min(samples.length, Math.floor((n / TRACK_STEP_HZ) * sampleRate));
    // Taps: filter every sample up to `end`, keeping a running sum of squares per window.
    for (; filtered < end; filtered += 1) {
      const x = samples[filtered];
      for (let k = 0; k < 3; k += 1) {
        const y = runChain(chains[k], x);
        const ring = rings[k];
        const old = ring.buf[ring.pos];
        ring.buf[ring.pos] = y;
        ring.pos = (ring.pos + 1) % ring.buf.length;
        ring.sum += y * y - old * old;
      }
    }
    for (let k = 0; k < 3; k += 1) rms[k] = Math.sqrt(Math.max(0, rings[k].sum) / rings[k].buf.length);

    // Spectrum of the 2048 samples ending at this step.
    const start = Math.floor((n / TRACK_STEP_HZ) * sampleRate) - SPEC_FFT;
    let energy = 0;
    for (let i = 0; i < SPEC_FFT; i += 1) {
      const j = start + i;
      const s = j >= 0 && j < samples.length ? samples[j] : 0;
      energy += s * s;
      re[reverse[i]] = s * window[i];
      im[reverse[i]] = 0;
    }
    const playing = n < steps - 1 && energy > 1e-9;
    if (playing) {
      fft(re, im, tables);
      for (let k = 0; k < db.length; k += 1) {
        const mag = Math.hypot(re[k], im[k]) * scale;
        db[k] = mag > 0 ? 20 * Math.log10(mag) : -Infinity;
      }
    }
    engine.step(A, playing ? db : null, binHz, rms, dt, n * dt);

    const o = n * NB * 2;
    track.specs.set(A.spec, o);
    track.specs.set(A.specFast, o + NB);
    const x = n * AUX;
    const aux = track.aux;
    aux[x] = A.low;
    aux[x + 1] = A.mid;
    aux[x + 2] = A.high;
    aux[x + 3] = A.energy;
    aux[x + 4] = A.kick;
    aux[x + 5] = A.kickStrength;
    aux[x + 6] = A.snare;
    aux[x + 7] = A.snareStrength;
    aux[x + 8] = A.hat;
    aux[x + 9] = A.hatStrength;
    aux[x + 10] = playing ? 1 : 0;
    track.hits[n] = (A.kickHit ? HIT_KICK : 0) | (A.snareHit ? HIT_SNARE : 0) | (A.hatHit ? HIT_HAT : 0);

    if (n % chunk === chunk - 1) {
      if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
      onProgress?.(n / steps);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  onProgress?.(1);
  return track;
}
