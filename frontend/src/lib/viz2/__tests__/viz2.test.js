import { Band, BeatEngine, createFrame, NB } from "../engine";
import { buildBeatTrack } from "../track";
import { STYLES, applyRuntime } from "../styles";

const SR = 48000;

/** A beat: 24 short low thumps in 10 s over quiet noise. */
function syntheticBeat(seconds = 10, pulses = 24) {
  const samples = new Float32Array(seconds * SR);
  let seed = 7;
  const rand = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296) * 2 - 1;
  for (let i = 0; i < samples.length; i += 1) samples[i] = rand() * 0.004;
  const gap = seconds / pulses;
  for (let p = 0; p < pulses; p += 1) {
    const start = Math.floor((0.2 + p * gap) * SR);
    for (let i = 0; i < SR * 0.12; i += 1) {
      const t = i / SR;
      samples[start + i] += Math.sin(2 * Math.PI * 60 * t) * Math.exp(-t * 30) * 0.8;
    }
  }
  return { samples, sampleRate: SR, duration: seconds };
}

describe("Band", () => {
  it("fires once per pulse and stays quiet on steady noise", () => {
    const band = new Band({ refractory: 0.13, jump: 1.9, minRel: 0.12, envTau: 0.18 });
    let hits = 0;
    for (let n = 0; n < 600; n += 1) {
      const t = n / 60;
      const inPulse = n % 25 < 3;
      band.update(inPulse ? 0.5 : 0.01, 1 / 60, t);
      if (band.hit) hits += 1;
    }
    expect(hits).toBeGreaterThanOrEqual(22);
    expect(hits).toBeLessThanOrEqual(24);

    const quiet = new Band({ refractory: 0.13, jump: 1.9, minRel: 0.12 });
    let noiseHits = 0;
    for (let n = 0; n < 600; n += 1) {
      quiet.update(0.2, 1 / 60, n / 60);
      if (quiet.hit && n > 10) noiseHits += 1;
    }
    expect(noiseHits).toBe(0);
  });
});

describe("BeatEngine", () => {
  it("is silent without a spectrum", () => {
    const engine = new BeatEngine();
    const A = createFrame();
    engine.step(A, null, 23.4, [0, 0, 0], 1 / 60, 0);
    expect(A.live).toBe(false);
    expect(Array.from(A.spec).every((v) => v === 0)).toBe(true);
  });
});

describe("buildBeatTrack", () => {
  it("finds the kicks of a synthetic beat and reads frames by time", async () => {
    const track = await buildBeatTrack(syntheticBeat());
    let kicks = 0;
    const A = createFrame();
    for (let n = 0; n < track.steps; n += 1) {
      track.fillStep(n, A);
      if (A.kickHit) kicks += 1;
      for (let b = 0; b < NB; b += 1) {
        expect(Number.isFinite(A.spec[b])).toBe(true);
        expect(A.spec[b]).toBeGreaterThanOrEqual(0);
        expect(A.spec[b]).toBeLessThanOrEqual(1);
      }
    }
    expect(kicks).toBeGreaterThanOrEqual(20);
    expect(kicks).toBeLessThanOrEqual(26);

    // Reading by time at 30 fps still sees every kick (skipped steps are OR'ed in).
    let viaTime = 0;
    for (let f = 0; f < 300; f += 1) {
      track.fillAtTime(f / 30, A);
      if (A.kickHit) viaTime += 1;
    }
    expect(Math.abs(viaTime - kicks)).toBeLessThanOrEqual(2);
  });
});

// A canvas that records nothing but checks every coordinate is a finite number.
function mockContext() {
  const bad = [];
  const check = (name) => (...args) => {
    for (const a of args) if (typeof a === "number" && !Number.isFinite(a)) bad.push(name);
  };
  const gradient = { addColorStop: () => {} };
  const ctx = new Proxy(
    { canvas: { width: 960, height: 540 } },
    {
      get(target, prop) {
        if (prop in target) return target[prop];
        if (prop === "createLinearGradient" || prop === "createRadialGradient") return () => gradient;
        if (prop === "getImageData") return () => ({ data: new Uint8ClampedArray(4) });
        if (prop === "measureText") return () => ({ width: 10 });
        return check(String(prop));
      },
      set(target, prop, value) {
        target[prop] = value;
        return true;
      },
    },
  );
  return { ctx, bad };
}

describe("styles", () => {
  beforeAll(() => {
    global.Path2D = class {
      moveTo() {}
      lineTo() {}
      arc() {}
      rect() {}
      closePath() {}
      ellipse() {}
      quadraticCurveTo() {}
      bezierCurveTo() {}
    };
  });
  // CRA resets mocks before every test, so the canvas stub goes in beforeEach.
  beforeEach(() => {
    const realCreate = Document.prototype.createElement.bind(document);
    jest.spyOn(document, "createElement").mockImplementation((tag) => {
      if (tag !== "canvas") return realCreate(tag);
      const { ctx } = mockContext();
      return { width: 1, height: 1, getContext: () => ctx };
    });
  });

  it("has the 17 styles", () => {
    expect(Object.keys(STYLES)).toHaveLength(17);
  });

  it.each(Object.keys(STYLES))("%s draws 240 frames of a beat without NaN", async (mode) => {
    const track = await buildBeatTrack(syntheticBeat(5, 12));
    applyRuntime({ primary: [139, 255, 208], secondary: [76, 141, 255], user: [255, 255, 255] });
    const { ctx, bad } = mockContext();
    const S = { dpr: 1 };
    const A = createFrame();
    for (let n = 0; n < 240; n += 1) {
      track.fillStep(n, A);
      STYLES[mode].draw(ctx, 960, 540, A, S, 1 / 60);
    }
    expect(bad).toEqual([]);
  });
});

describe("AudioVisualizer with the new styles", () => {
  beforeEach(() => {
    window.matchMedia = jest.fn().mockImplementation(() => ({ matches: false, addListener: () => {}, removeListener: () => {} }));
    global.Path2D = class {
      moveTo() {}
      lineTo() {}
      arc() {}
      rect() {}
      closePath() {}
      ellipse() {}
      quadraticCurveTo() {}
      bezierCurveTo() {}
    };
  });

  it.each(["dot-record", "circle", "terrain-sun"])("draws %s from a beat track", async (mode) => {
    const AudioVisualizer = (await import("../../AudioVisualizer")).default;
    const track = await buildBeatTrack(syntheticBeat(3, 6));
    const { ctx, bad } = mockContext();
    const canvas = { width: 960, height: 540, clientWidth: 960, clientHeight: 540, getContext: () => ctx, style: {}, getBoundingClientRect: () => ({ width: 960, height: 540 }) };
    const viz = new AudioVisualizer(canvas, { mode, spectrumColor: "139, 255, 208", particleColor: "76, 141, 255", fillCenter: "transparent" });
    viz.setDesignSize(960, 540);
    viz.setOutputSize(960, 540);
    let step = 0;
    viz.setBeatProvider((A) => track.fillStep(step, A));
    for (; step < 120; step += 1) viz.renderFrame(1 / 60);
    expect(bad).toEqual([]);
    expect(viz.getZoom()).toBeGreaterThanOrEqual(1);
  });
});
