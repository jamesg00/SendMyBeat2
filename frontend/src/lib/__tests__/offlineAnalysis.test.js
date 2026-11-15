import { ANALYSIS_STEP_HZ, OfflineAnalyser } from "@/lib/offlineAnalysis";

const SAMPLE_RATE = 48000;
const FFT = 4096;

const tone = (hz, seconds, from = 0, to = seconds) => {
  const samples = new Float32Array(Math.round(SAMPLE_RATE * seconds));
  for (let i = 0; i < samples.length; i += 1) {
    const t = i / SAMPLE_RATE;
    if (t >= from && t < to) samples[i] = 0.8 * Math.sin(2 * Math.PI * hz * t);
  }
  return { samples, sampleRate: SAMPLE_RATE, duration: seconds };
};

const loudestBin = (bytes) => bytes.reduce((best, value, index) => (value > bytes[best] ? index : best), 0);

describe("OfflineAnalyser", () => {
  it("puts a tone in the bin for its frequency", () => {
    const analyser = new OfflineAnalyser(tone(1000, 1), FFT);
    const out = new Uint8Array(FFT / 2);
    analyser.fillAtTime(0.5, out);
    const expected = Math.round((1000 / (SAMPLE_RATE / 2)) * (FFT / 2));
    expect(Math.abs(loudestBin(out) - expected)).toBeLessThanOrEqual(1);
    expect(out[expected]).toBeGreaterThan(200);
  });

  it("is silent before the sound starts and loud once it has", () => {
    const analyser = new OfflineAnalyser(tone(440, 2, 1, 2), FFT);
    const out = new Uint8Array(FFT / 2);
    analyser.fillAtTime(0.5, out);
    expect(Math.max(...out)).toBe(0);
    analyser.fillAtTime(1.5, out);
    expect(Math.max(...out)).toBeGreaterThan(200);
  });

  it("gives the same numbers every time for the same moment (preview and export agree)", () => {
    const beat = tone(220, 2);
    const a = new OfflineAnalyser(beat, FFT);
    const b = a.clone();
    const outA = new Uint8Array(FFT / 2);
    const outB = new Uint8Array(FFT / 2);
    const lastStep = ANALYSIS_STEP_HZ; // one second in
    for (let step = 0; step <= lastStep; step += 1) a.fillStep(step, outA);
    for (let step = 0; step <= lastStep; step += 1) b.fillStep(step, outB);
    expect(Array.from(outA)).toEqual(Array.from(outB));
  });

  it("rebuilds its history after a seek instead of carrying the old sound over", () => {
    const analyser = new OfflineAnalyser(tone(440, 3, 0, 1), FFT);
    const out = new Uint8Array(FFT / 2);
    analyser.fillAtTime(0.5, out);
    expect(Math.max(...out)).toBeGreaterThan(200);
    analyser.fillAtTime(2.5, out); // jump into the silent part
    expect(Math.max(...out)).toBe(0);
  });
});
