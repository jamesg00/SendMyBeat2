// Spectrum analysis straight from the decoded beat, instead of from whatever the speakers are
// playing. It reproduces what the browser's AnalyserNode returns (Blackman window, FFT, smoothing
// over time, dB mapped to 0–255), but for any moment in the song, so the preview and the exported
// video read exactly the same numbers.

export const ANALYSIS_SAMPLE_RATE = 48000;
export const ANALYSIS_FFT_SIZE = 16384;
export const ANALYSIS_STEP_HZ = 60; // one analysis step per simulation step

const SMOOTHING = 0.75; // AnalyserNode.smoothingTimeConstant used by the live preview
const MIN_DB = -100;
const MAX_DB = -30;

/** Decode an audio file to mono samples at a fixed rate, so results don't depend on the device. */
export async function decodeBeat(file) {
  const bytes = await file.arrayBuffer();
  const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const ctx = new Offline(1, 1, ANALYSIS_SAMPLE_RATE);
  const buffer = await ctx.decodeAudioData(bytes);
  const length = buffer.length;
  const mono = new Float32Array(length);
  for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i += 1) mono[i] += data[i];
  }
  if (buffer.numberOfChannels > 1) {
    const scale = 1 / buffer.numberOfChannels;
    for (let i = 0; i < length; i += 1) mono[i] *= scale;
  }
  return { samples: mono, sampleRate: buffer.sampleRate, duration: buffer.duration };
}

// ---- radix-2 FFT with tables shared by every analyser of the same size
const tableCache = new Map();
export function tablesFor(size) {
  let tables = tableCache.get(size);
  if (tables) return tables;
  const bits = Math.log2(size);
  const reverse = new Uint32Array(size);
  for (let i = 0; i < size; i += 1) {
    let r = 0;
    for (let b = 0; b < bits; b += 1) r |= ((i >> b) & 1) << (bits - 1 - b);
    reverse[i] = r;
  }
  const cos = new Float32Array(size / 2);
  const sin = new Float32Array(size / 2);
  for (let i = 0; i < size / 2; i += 1) {
    cos[i] = Math.cos((2 * Math.PI * i) / size);
    sin[i] = Math.sin((2 * Math.PI * i) / size);
  }
  const window = new Float32Array(size);
  for (let i = 0; i < size; i += 1) {
    // Blackman window, alpha 0.16 (the one AnalyserNode uses)
    window[i] = 0.42 - 0.5 * Math.cos((2 * Math.PI * i) / size) + 0.08 * Math.cos((4 * Math.PI * i) / size);
  }
  tables = { reverse, cos, sin, window };
  tableCache.set(size, tables);
  return tables;
}

export function fft(re, im, tables) {
  const n = re.length;
  const { cos, sin } = tables;
  for (let size = 2; size <= n; size <<= 1) {
    const half = size >> 1;
    const stride = n / size;
    for (let start = 0; start < n; start += size) {
      for (let k = 0, t = 0; k < half; k += 1, t += stride) {
        const a = start + k;
        const b = a + half;
        const wr = cos[t];
        const wi = -sin[t];
        const xr = re[b] * wr - im[b] * wi;
        const xi = re[b] * wi + im[b] * wr;
        re[b] = re[a] - xr;
        im[b] = im[a] - xi;
        re[a] += xr;
        im[a] += xi;
      }
    }
  }
}

export class OfflineAnalyser {
  constructor(beat, fftSize = ANALYSIS_FFT_SIZE) {
    this.samples = beat.samples;
    this.sampleRate = beat.sampleRate;
    this.duration = beat.duration;
    this.fftSize = fftSize;
    this.frequencyBinCount = fftSize / 2;
    this.tables = tablesFor(fftSize);
    this.re = new Float32Array(fftSize);
    this.im = new Float32Array(fftSize);
    this.smoothed = new Float32Array(fftSize / 2);
    this.lastStep = null;
  }

  /** A second analyser over the same samples with its own smoothing history (for the export). */
  clone() {
    return new OfflineAnalyser({ samples: this.samples, sampleRate: this.sampleRate, duration: this.duration }, this.fftSize);
  }

  reset() {
    this.smoothed.fill(0);
    this.lastStep = null;
  }

  /** One analysis step: FFT of the fftSize samples ending at this step, blended into the history. */
  advanceTo(step) {
    const { re, im, tables, fftSize, samples } = this;
    const end = Math.floor((step / ANALYSIS_STEP_HZ) * this.sampleRate);
    const start = end - fftSize;
    const { reverse, window } = tables;
    for (let i = 0; i < fftSize; i += 1) {
      const index = start + i;
      const sample = index >= 0 && index < samples.length ? samples[index] : 0;
      const j = reverse[i];
      re[j] = sample * window[i];
      im[j] = 0;
    }
    fft(re, im, tables);
    const smoothed = this.smoothed;
    const scale = 1 / fftSize;
    for (let k = 0; k < smoothed.length; k += 1) {
      const magnitude = Math.hypot(re[k], im[k]) * scale;
      smoothed[k] = SMOOTHING * smoothed[k] + (1 - SMOOTHING) * magnitude;
    }
    this.lastStep = step;
  }

  /**
   * Fill `out` with the 0–255 spectrum at analysis step `step` (step / 60 seconds into the song).
   * Steps normally arrive in order; after a jump (a seek) the history is rebuilt from a few steps back.
   */
  fillStep(step, out) {
    // The audio clock can wobble back a step or two while playing; keep the current frame then.
    if (this.lastStep !== null && step < this.lastStep && this.lastStep - step <= 2) step = this.lastStep;
    if (this.lastStep === null || step < this.lastStep || step - this.lastStep > 6) {
      this.smoothed.fill(0);
      for (let s = Math.max(0, step - 12); s < step; s += 1) this.advanceTo(s);
    } else {
      for (let s = this.lastStep + 1; s < step; s += 1) this.advanceTo(s);
    }
    if (this.lastStep !== step) this.advanceTo(step);
    const smoothed = this.smoothed;
    const range = 255 / (MAX_DB - MIN_DB);
    for (let k = 0; k < out.length; k += 1) {
      const value = smoothed[k];
      const db = value > 0 ? 20 * Math.log10(value) : -Infinity;
      const byte = Math.floor(range * (db - MIN_DB));
      out[k] = byte < 0 || Number.isNaN(byte) ? 0 : byte > 255 ? 255 : byte;
    }
  }

  fillAtTime(seconds, out) {
    this.fillStep(Math.max(0, Math.round(seconds * ANALYSIS_STEP_HZ)), out);
  }
}
