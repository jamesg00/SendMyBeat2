// The beat engine behind the new visualizers (the 13 Pro styles and the redrawn NCS, Monstercat,
// Spectrum and Proximity). It turns one spectrum plus three band energies into a frame:
//   spec / specFast  64 log bands from 32 Hz to 16 kHz, 0..1 (smoothed / instant attack)
//   kickHit, snareHit, hatHit  true on the step an onset fires, with an envelope and a strength
// The same class runs over the decoded beat (track.js, used by the preview and the export) and,
// until decoding finishes, over the live analyser (fillFromAnalyser below).

export const NB = 64;
export const F_LO = 32;
export const F_HI = 16000;
export const SPEC_FFT = 2048;

const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);

/** Onset detector for one band: a hit when energy jumps over its recent floor or its average. */
export class Band {
  constructor(o) {
    Object.assign(this, { refractory: 0.12, jump: 1.8, over: 2.2, minRel: 0.1, release: 0.14, envTau: 0.16 }, o);
    this.reset();
  }

  reset() {
    this.slow = 1e-7;
    this.peak = 1e-5;
    this.hist = [0, 0, 0];
    this.level = 0;
    this.last = -9;
    this.hit = false;
    this.strength = 0;
    this.env = 0;
  }

  update(rms, dt, t) {
    const e = rms * rms;
    this.peak = Math.max(e, this.peak * Math.exp(-dt / 5), 1e-7);
    const floor = Math.min(this.hist[0], this.hist[1], this.hist[2]);
    this.hit = false;
    if ((e > floor * this.jump || e > this.slow * this.over) && e > this.peak * this.minRel && t - this.last > this.refractory && e > 1e-6) {
      this.hit = true;
      this.last = t;
      this.strength = clamp(Math.sqrt(e / this.peak) * 1.15, 0.25, 1);
    }
    this.slow += (e - this.slow) * (1 - Math.exp(-dt / 0.3));
    this.hist[0] = this.hist[1];
    this.hist[1] = this.hist[2];
    this.hist[2] = e;
    const lvl = Math.sqrt(e / this.peak);
    this.level = lvl > this.level ? lvl : this.level + (lvl - this.level) * (1 - Math.exp(-dt / this.release));
    this.env = this.hit ? Math.max(this.env, this.strength) : this.env * Math.exp(-dt / this.envTau);
  }
}

/** A frame the styles draw from. */
export function createFrame() {
  return {
    t: 0,
    dt: 1 / 60,
    spec: new Float32Array(NB),
    specFast: new Float32Array(NB),
    wave: new Float32Array(SPEC_FFT),
    low: 0,
    mid: 0,
    high: 0,
    energy: 0,
    kickHit: false,
    kick: 0,
    kickStrength: 0,
    snareHit: false,
    snare: 0,
    snareStrength: 0,
    hatHit: false,
    hat: 0,
    hatStrength: 0,
    live: false,
  };
}

/** Band edges in Hz, shared by every caller. */
export const BAND_EDGES = (() => {
  const edges = new Float32Array(NB + 1);
  for (let b = 0; b <= NB; b += 1) edges[b] = F_LO * Math.pow(F_HI / F_LO, b / NB);
  return edges;
})();

export class BeatEngine {
  constructor() {
    this.bands = {
      low: new Band({ refractory: 0.13, jump: 1.9, minRel: 0.12, envTau: 0.18 }),
      mid: new Band({ refractory: 0.1, jump: 2.2, minRel: 0.16, envTau: 0.14 }),
      high: new Band({ refractory: 0.06, jump: 2.0, minRel: 0.12, envTau: 0.08 }),
    };
    this.raw = new Float32Array(NB);
    this.reset();
  }

  reset() {
    this.peakDb = -40;
    for (const k of ["low", "mid", "high"]) this.bands[k].reset();
  }

  /**
   * Advance one step.
   * @param {object} A       frame to write (createFrame)
   * @param {Float32Array|null} db  dB per FFT bin (as AnalyserNode.getFloatFrequencyData), or null for silence
   * @param {number} binHz   Hz per bin
   * @param {number[]} rms   [low, mid, high] RMS of the three taps
   */
  step(A, db, binHz, rms, dt, t) {
    const live = Boolean(db);
    A.live = live;
    A.t = t;
    A.dt = dt;
    const raw = this.raw;
    let frameMax = -200;
    for (let b = 0; b < NB; b += 1) {
      const f0 = BAND_EDGES[b];
      const f1 = BAND_EDGES[b + 1];
      const fc = Math.sqrt(f0 * f1);
      let v = -200;
      if (live) {
        const k0 = f0 / binHz;
        const k1 = f1 / binHz;
        if (k1 - k0 < 1.5) {
          const k = fc / binHz;
          const i = Math.floor(k);
          const fr = k - i;
          v = db[i] * (1 - fr) + db[Math.min(db.length - 1, i + 1)] * fr;
        } else {
          for (let i = Math.floor(k0); i <= Math.ceil(k1) && i < db.length; i += 1) if (db[i] > v) v = db[i];
        }
        v = Number.isFinite(v) ? v + 4.5 * Math.log2(fc / 1000) : -200;
      }
      raw[b] = v;
      if (v > frameMax) frameMax = v;
    }
    if (live) {
      if (frameMax > this.peakDb) this.peakDb += (frameMax - this.peakDb) * 0.4;
      else this.peakDb = Math.max(-70, this.peakDb - 5 * dt);
    }
    const range = 52;
    const aUp = 1 - Math.exp(-dt / 0.01);
    const aDown = 1 - Math.exp(-dt / 0.13);
    const fDown = Math.exp(-dt / 0.06);
    let sum = 0;
    for (let b = 0; b < NB; b += 1) {
      let v = live ? clamp((raw[b] - (this.peakDb - range)) / range) : 0;
      v = Math.pow(v, 1.6);
      const s = A.spec[b];
      A.spec[b] = s + (v - s) * (v > s ? aUp : aDown);
      A.specFast[b] = v > A.specFast[b] ? v : A.specFast[b] * fDown;
      sum += A.spec[b];
    }
    A.energy = sum / NB;
    const { low: L, mid: M, high: H } = this.bands;
    L.update(live ? rms[0] : 0, dt, t);
    M.update(live ? rms[1] : 0, dt, t);
    H.update(live ? rms[2] : 0, dt, t);
    A.low = L.level;
    A.mid = M.level;
    A.high = H.level;
    A.kickHit = L.hit;
    A.kick = L.env;
    A.kickStrength = L.strength;
    A.snareHit = M.hit;
    A.snare = M.env;
    A.snareStrength = M.strength;
    A.hatHit = H.hit;
    A.hat = H.env;
    A.hatStrength = H.strength;
  }
}

/**
 * Fallback while the beat is still decoding: read the live AnalyserNode (bytes) the old styles use
 * and feed the engine. Band energies stand in for the filtered taps.
 */
export function fillFromAnalyser(engine, A, analyser, bytes, dt, t, playing) {
  if (!analyser || !bytes || !playing) {
    engine.step(A, null, 1, [0, 0, 0], dt, t);
    return;
  }
  analyser.getByteFrequencyData(bytes);
  const n = bytes.length;
  const db = engine.liveDb && engine.liveDb.length === n ? engine.liveDb : (engine.liveDb = new Float32Array(n));
  const minDb = analyser.minDecibels ?? -100;
  const maxDb = analyser.maxDecibels ?? -30;
  const binHz = (analyser.context?.sampleRate || 48000) / (n * 2);
  const power = [0, 0, 0];
  const count = [0, 0, 0];
  for (let i = 0; i < n; i += 1) {
    const d = bytes[i] ? minDb + (bytes[i] / 255) * (maxDb - minDb) : -200;
    db[i] = d;
    const hz = i * binHz;
    const band = hz < 32 ? -1 : hz < 120 ? 0 : hz < 900 ? -1 : hz < 4200 ? 1 : hz > 7000 ? 2 : -1;
    if (band >= 0 && d > -200) {
      power[band] += 10 ** (d / 10);
      count[band] += 1;
    }
  }
  const rms = power.map((p, i) => (count[i] ? Math.sqrt(p / count[i]) : 0));
  engine.step(A, db, binHz, rms, dt, t);
}
