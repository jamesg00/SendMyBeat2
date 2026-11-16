import { STYLE_KIND, drawBlob, drawDotRing, drawMirrorBars, drawNcsRing, drawProximity, drawWave } from "@/lib/visualizerStyles";
const IS_MOBILE = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(max-width: 768px)").matches;

// Magic Number Constants for better maintainability and readability
const FREQ_BANDS = {
  LOW_MID_SPLIT: 220,
  MID_HIGH_SPLIT: 3200,
};

const DEFAULT_TRANSITION_DURATION = 0.22;

const REACTIVE_COLOR_PALETTE = [
  [68, 120, 255],  // blue
  [0, 210, 255],   // cyan
  [50, 236, 150],  // mint
  [165, 255, 60],  // lime
  [255, 212, 64],  // yellow
  [255, 126, 52],  // orange
  [255, 62, 88],   // pink-red
];

const DEFAULT_OPTIONS = {
  // FFT & Audio Analysis Settings
  fftSize: 16384,
  minHz: 20,
  maxHz: 18000,
  bars: 128,
  noiseFloor: 0.06,

  // Curve / Smoothing / Gain
  curvePower: 0.6,
  attack: 0.55,
  release: 0.12,
  gain: 0.75, // Reduced from 1.0 to prevent clipping/bass boost

  // Visual Layout (Circle Mode)
  radius: 0.23,
  maxBarLength: 0.18,
  rotateSpeed: 0.002,
  lineWidth: 2,
  glowWidth: 5,
  backgroundFade: 0.16,

  // Particles (Circle Mode)
  baseSpawnRate: 10,
  maxSpawnRate: 120,
  particleLifeMin: 0.8,
  particleLifeMax: 2.2,
  particleSpeed: 72,
  particleJitter: 26,
  particleSize: 1.8,
  particleGlowSize: 5,
  particleAlpha: 0.65,
  particleEnabled: true,
  particleIntensity: 1,
  trailsEnabled: true,
  particleColor: "140, 200, 255",

  // Spectrum Appearance
  spectrumColor: "90, 160, 255",
  glowColor: "125, 185, 255",
  spectrumStyle: "fill",
  fillCenter: "color",
  fillCenterColor: "255, 255, 255",
  centerImageSpin: true,
  centerImageUrl: "",
  spectrumBorderWidth: 2,
  spectrumBorderColor: "255, 255, 255",
  spectrumBorderEnabled: true,
  spectrumRecordImageUrl: "",

  // Mode Selection
  mode: "circle", // "circle", "monstercat", or "spectrum"

  // Spectrum Analyzer Mode Settings
  spectrumBarThickness: 4,
  spectrumGlow: 20,
  spectrumOpacity: 1.0,
  spectrumRgb: false,
  spectrumSmoothing: 0.3,
  spectrumMirror: true,

  // Monstercat Mode Settings
  monstercatBarWidth: 10,
  monstercatSpacing: 2,
  monstercatYOffset: 20,
  monstercatParticleEnabled: false,
  monstercatParticleSpeed: 1,
  monstercatParticleSize: 1,
  monstercatParticleCount: 900,
  monstercatGlow: 15,
  monstercatSmoothing: 0.35,

  // Sensitivity Tuning
  lowSensitivity: 1,
  midSensitivity: 1,
  highSensitivity: 1,

  // Effects
  shakeIntensity: 0.6, // Reduced from 1.0
  multiColorReactive: false,
  fxZoomPulse: 0, // 0..1: how much the artwork zooms in on each kick
  fxFlash: false, // a soft flash of light on hard hits
  fxVignette: false, // darker corners

  // Reactivity Pipeline (Musicvid-like behavior)
  reactivity: {
    startBin: 0,
    endBin: null,
    amplitudeScale: 1.7, // Reduced from 2.4 to fix bass boost
    normalizeByWindowSize: true,
    maxAmount: 1.0,
    minAmount: 0,
    minThreshold: 0.08, // Increased from 0.03 to reduce noise
    useDeltaSmoothing: false,
    minDeltaNeededToTrigger: 0.025,
    deltaDecay: 0.85,
  },
};

export default class AudioVisualizer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: true });
    this.options = {
      ...DEFAULT_OPTIONS,
      ...(IS_MOBILE ? { bars: 72, maxSpawnRate: 48, glowWidth: 4, fftSize: 8192 } : {}),
      ...options,
      reactivity: {
        ...DEFAULT_OPTIONS.reactivity,
        ...(options.reactivity || {}),
      },
    };
    this.centerImage = null;
    this.centerImageUrl = "";
    this.recordImage = null;
    this.recordImageUrl = "";
    this.setCenterImageUrl(this.options.centerImageUrl || "");
    this.setRecordImageUrl(this.options.spectrumRecordImageUrl || "");
    this.runtime = {
      gain: this.options.gain,
      rotateSpeed: this.options.rotateSpeed,
      maxBarLength: this.options.maxBarLength,
      radius: this.options.radius,
      baseSpawnRate: this.options.baseSpawnRate,
      maxSpawnRate: this.options.maxSpawnRate,
      particleSpeed: this.options.particleSpeed,
      lowSensitivity: this.options.lowSensitivity,
      midSensitivity: this.options.midSensitivity,
      highSensitivity: this.options.highSensitivity,
      monstercatSmoothing: this.options.monstercatSmoothing,
    };

    this.audioContext = null;
    this.analyser = null;
    this.sourceNode = null;
    this.connectedElement = null;
    this.ownsAudioNodes = true;
    this.dataArray = null;
    this.frequencyBins = [];
    this.barCenterFreqs = [];
    this.smoothedBars = [];
    this.prevSmoothedBars = [];
    this.barTransition = 0;
    this.barTransitionDuration = DEFAULT_TRANSITION_DURATION;
    this.lastPipelineBars = [];
    this.lastGlobalImpact = 0;

    this.animationFrame = null;
    this.lastTs = 0;
    this.rotation = 0;
    this.running = false;

    this.particles = [];
    this.spawnRemainder = 0;

    this.energy = 0;
    this.bassEnergy = 0;
    this.energySlew = 0;
    this.bassSlew = 0;
    this.lastBassEnergy = 0;
    this.beatPulse = 0;
    this.impactPulse = 0;
    this.silenceSeconds = 0;
    this.hasAudioSignal = false;

    // Shake state
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
    this.recordRotation = 0;
    this.bandRefs = { low: 0.32, mid: 0.3, high: 0.26 };
    this.levelRef = 0.34;
    this.monstercatSmoothedBars = [];
    this.monstercatParticles = [];
    this.spectrumSmoothedBars = [];

    // Deterministic drawing: a fixed design size (so the preview and the exported video are the
    // same picture at different scales), a fixed 60 Hz step, and a seeded random source.
    this.designW = 0;
    this.designH = 0;
    this.fixedOutput = false;
    this.viewW = 0;
    this.viewH = 0;
    this.pixelScale = 1;
    this.stepAccumulator = 0;
    this.analysisProvider = null;
    this.seedRandom(0x5eed1e55);

    this.resize = this.resize.bind(this);
    this.loop = this.loop.bind(this);
    this.buildBinMap();
    this.resize();
    window.addEventListener("resize", this.resize);
  }

  setOptions(next = {}) {
    if (Object.prototype.hasOwnProperty.call(next, "centerImageUrl")) {
      this.setCenterImageUrl(next.centerImageUrl || "");
    }
    if (Object.prototype.hasOwnProperty.call(next, "spectrumRecordImageUrl")) {
      this.setRecordImageUrl(next.spectrumRecordImageUrl || "");
    }
    this.options = {
      ...this.options,
      ...next,
      reactivity: {
        ...this.options.reactivity,
        ...(next.reactivity || {}),
      },
    };
    if (typeof next.bars === "number" || typeof next.minHz === "number" || typeof next.maxHz === "number") {
      this.buildBinMap();
    }
  }

  /** Seeded random (mulberry32), so particles and shake repeat exactly from the same seed. */
  seedRandom(seed) {
    let a = seed >>> 0;
    this.rand = () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Everything is laid out in this size; the canvas scales it to whatever size it really is. */
  setDesignSize(width, height) {
    this.designW = Math.max(0, width || 0);
    this.designH = Math.max(0, height || 0);
    this.resize();
  }

  /** Export: draw into an exact pixel size, ignoring the page layout and screen scaling. */
  setOutputSize(width, height) {
    this.fixedOutput = true;
    this.canvas.width = width;
    this.canvas.height = height;
    this.applyViewTransform();
  }

  applyViewTransform() {
    const designW = this.designW || this.canvas.width;
    const designH = this.designH || this.canvas.height;
    const scale = this.canvas.width / Math.max(1, designW);
    this.viewW = designW;
    this.viewH = designH;
    this.pixelScale = scale;
    this.ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }

  /**
   * Where the spectrum comes from. Default: the live audio analyser. A provider
   * ({ fftSize, sampleRate, fill(Uint8Array) }) reads it from the decoded beat instead, which is
   * what makes the preview and the export identical.
   */
  setAnalysisProvider(provider) {
    this.analysisProvider = provider || null;
    if (provider) {
      const bins = provider.fftSize / 2;
      if (!this.dataArray || this.dataArray.length !== bins) this.dataArray = new Uint8Array(bins);
    }
    this.buildBinMap();
  }

  attachCanvas(nextCanvas) {
    if (!nextCanvas || this.canvas === nextCanvas) return;
    this.canvas = nextCanvas;
    this.ctx = nextCanvas.getContext("2d", { alpha: true });
    this.resize();
  }

  attachAudioAnalysisFrom(sourceVisualizer, audioEl = null) {
    if (!sourceVisualizer?.audioContext || !sourceVisualizer?.analyser) {
      return false;
    }
    this.audioContext = sourceVisualizer.audioContext;
    this.analyser = sourceVisualizer.analyser;
    this.sourceNode = sourceVisualizer.sourceNode || null;
    this.connectedElement = audioEl || sourceVisualizer.connectedElement || null;
    this.ownsAudioNodes = false;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.buildBinMap();
    return true;
  }

  lerp(current, target, speed, dt) {
    const t = 1 - Math.exp(-speed * dt);
    return current + (target - current) * t;
  }

  clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }

  getReactiveColor(amp = 0, alpha = 1, boost = 1, forceReactive = false) {
    const safeAlpha = this.clamp01(alpha);
    if (!this.options.multiColorReactive && !forceReactive) {
      const [r, g, b] = this.options.spectrumColor.split(",").map((v) => Number(v.trim()));
      return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
    }

    const palette = REACTIVE_COLOR_PALETTE;

    const intensity = this.clamp01(Math.pow(Math.max(0, amp) / 1.35, 0.8));
    const scaled = intensity * (palette.length - 1);
    const i0 = Math.floor(scaled);
    const i1 = Math.min(palette.length - 1, i0 + 1);
    const t = scaled - i0;
    const p0 = palette[i0];
    const p1 = palette[i1];
    const rgbBoost = Math.max(0.7, boost);
    const r = Math.round((p0[0] * (1 - t) + p1[0] * t) * rgbBoost);
    const g = Math.round((p0[1] * (1 - t) + p1[1] * t) * rgbBoost);
    const b = Math.round((p0[2] * (1 - t) + p1[2] * t) * rgbBoost);
    return `rgba(${Math.min(255, r)}, ${Math.min(255, g)}, ${Math.min(255, b)}, ${safeAlpha})`;
  }

  setCenterImageUrl(url = "") {
    if (!url) {
      this.centerImage = null;
      this.centerImageUrl = "";
      return;
    }
    if (url === this.centerImageUrl) return;
    this.centerImageUrl = url;
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    this.centerImage = img;
  }

  setRecordImageUrl(url = "") {
    if (!url) {
      this.recordImage = null;
      this.recordImageUrl = "";
      return;
    }
    if (url === this.recordImageUrl) return;
    this.recordImageUrl = url;
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    this.recordImage = img;
  }

  drawRecordDisc(radius) {
    if (
      !this.recordImage ||
      !this.recordImage.complete ||
      this.recordImage.naturalWidth <= 0
    ) {
      return;
    }

    const c = this.ctx;
    const discRadius = Math.max(10, radius * 0.62);
    const discSize = discRadius * 2;

    c.save();
    c.rotate(this.recordRotation);
    c.beginPath();
    c.arc(0, 0, discRadius, 0, Math.PI * 2);
    c.closePath();
    c.clip();
    c.drawImage(this.recordImage, -discSize / 2, -discSize / 2, discSize, discSize);
    c.restore();

    c.beginPath();
    c.strokeStyle = "rgba(255,255,255,0.5)";
    c.lineWidth = 1.5;
    c.arc(0, 0, discRadius, 0, Math.PI * 2);
    c.stroke();

    c.beginPath();
    c.fillStyle = "rgba(255,255,255,0.95)";
    c.arc(0, 0, Math.max(3, discRadius * 0.08), 0, Math.PI * 2);
    c.fill();
  }

  async connectMediaElement(audioEl) {
    if (!audioEl) return;

    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (!this.analyser) {
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.closestFftSize(this.options.fftSize);
      this.analyser.smoothingTimeConstant = 0.75;
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.buildBinMap();
    }

    if (this.connectedElement !== audioEl) {
      if (this.ownsAudioNodes && this.sourceNode) {
        try {
          this.sourceNode.disconnect();
        } catch (_) {
          // no-op
        }
      }
      this.sourceNode = this.audioContext.createMediaElementSource(audioEl);
      this.sourceNode.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
      this.connectedElement = audioEl;
      this.ownsAudioNodes = true;
    }
  }

  async connectMicrophone() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Microphone input not supported");
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (!this.analyser) {
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.closestFftSize(this.options.fftSize);
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    }
    const mic = this.audioContext.createMediaStreamSource(stream);
    mic.connect(this.analyser);
    this.sourceNode = mic;
    this.connectedElement = null;
    this.ownsAudioNodes = true;
    this.buildBinMap();
    return stream;
  }

  async resumeAudioContext() {
    if (this.audioContext && this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTs = 0;
    this.stepAccumulator = 0;
    this.animationFrame = requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  destroy() {
    this.stop();
    window.removeEventListener("resize", this.resize);
    if (this.ownsAudioNodes && this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch (_) {
        // no-op
      }
    }
    if (this.ownsAudioNodes && this.analyser) {
      try {
        this.analyser.disconnect();
      } catch (_) {
        // no-op
      }
    }
  }

  closestFftSize(size) {
    const allowed = [32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768];
    return allowed.includes(size) ? size : 16384;
  }

  buildBinMap() {
    const previousBars = this.smoothedBars && this.smoothedBars.length
      ? this.smoothedBars.slice()
      : [];
    const bars = Math.max(8, this.options.bars | 0);
    this.frequencyBins = new Array(bars);
    this.barCenterFreqs = new Array(bars);
    this.smoothedBars = new Array(bars).fill(0);
    this.monstercatSmoothedBars = new Array(bars).fill(0);
    this.prevSmoothedBars = previousBars;
    this.barTransition = previousBars.length ? 1 : 0;

    const sampleRate = this.analysisProvider?.sampleRate || this.audioContext?.sampleRate || 48000;
    const fftSize = this.analysisProvider?.fftSize || this.analyser?.fftSize || this.closestFftSize(this.options.fftSize);
    const nyquist = sampleRate / 2;
    const minHz = Math.max(10, this.options.minHz);
    const maxHz = Math.min(nyquist, this.options.maxHz);

    const logMin = Math.log10(minHz);
    const logMax = Math.log10(maxHz);
    for (let i = 0; i < bars; i += 1) {
      const t0 = i / bars;
      const t1 = (i + 1) / bars;
      const f0 = 10 ** (logMin + (logMax - logMin) * t0);
      const f1 = 10 ** (logMin + (logMax - logMin) * t1);
      const b0 = Math.max(0, Math.floor((f0 / nyquist) * (fftSize / 2)));
      const b1 = Math.max(b0 + 1, Math.floor((f1 / nyquist) * (fftSize / 2)));
      this.frequencyBins[i] = [b0, b1];
      this.barCenterFreqs[i] = Math.sqrt(f0 * f1);
    }
  }

  getFreqBand(hz) {
    if (hz < FREQ_BANDS.LOW_MID_SPLIT) return "low";
    if (hz < FREQ_BANDS.MID_HIGH_SPLIT) return "mid";
    return "high";
  }

  getSelectedBinRange() {
    const totalBins = this.dataArray?.length || 0;
    if (!totalBins) return [0, 0];
    const cfg = this.options.reactivity || DEFAULT_OPTIONS.reactivity;
    const start = Math.max(0, Math.min(totalBins - 1, cfg.startBin ?? 0));
    const end = Math.max(start, Math.min(totalBins - 1, cfg.endBin ?? (totalBins - 1)));
    return [start, end];
  }

  runReactivityPipeline(sumValue, lastValue, windowSize) {
    const cfg = this.options.reactivity || DEFAULT_OPTIONS.reactivity;
    // Stage 1: amplitude scaling similar to sum/1024 style pipelines.
    let value = cfg.normalizeByWindowSize && windowSize > 0 ? sumValue / windowSize : sumValue;
    value = (value / 1024) * cfg.amplitudeScale;
    // Stage 2: floor tiny values to avoid noise chatter.
    if (value < cfg.minThreshold) value = 0;
    // Stage 3: clamp into usable range.
    value = Math.max(cfg.minAmount, Math.min(cfg.maxAmount, value));
    // Stage 4: optional delta gate for punchy but stable response.
    if (cfg.useDeltaSmoothing && value - lastValue < cfg.minDeltaNeededToTrigger) {
      value = Math.max(cfg.minAmount, lastValue * cfg.deltaDecay);
    }
    return value;
  }

  resize() {
    if (this.fixedOutput) return; // export canvases keep their exact size
    const rect = this.canvas.getBoundingClientRect();
    const cssW = Math.floor(rect.width || this.canvas.clientWidth || 0);
    const cssH = Math.floor(rect.height || this.canvas.clientHeight || 0);
    if (!cssW || !cssH) return;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.floor(cssW * dpr));
    this.canvas.height = Math.max(1, Math.floor(cssH * dpr));
    if (this.designW && this.designH) {
      this.applyViewTransform();
    } else {
      this.viewW = cssW;
      this.viewH = cssH;
      this.pixelScale = dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    // Keep caches aligned with new viewport to avoid warped transitions.
    if (this.monstercatSmoothedBars.length > this.options.bars) {
      this.monstercatSmoothedBars = this.monstercatSmoothedBars.slice(0, this.options.bars);
    }
  }

  computeBars() {
    if (this.analysisProvider && this.dataArray) {
      this.analysisProvider.fill(this.dataArray);
    } else if (this.analyser && this.dataArray) {
      this.analyser.getByteFrequencyData(this.dataArray);
    } else {
      return this.smoothedBars.map(() => 0);
    }
    const [selectedStart, selectedEnd] = this.getSelectedBinRange();

    const bars = new Array(this.frequencyBins.length).fill(0);
    const rawBars = new Array(this.frequencyBins.length).fill(0);
    for (let i = 0; i < this.frequencyBins.length; i += 1) {
      const [b0, b1] = this.frequencyBins[i];
      const hz = this.barCenterFreqs[i] || 0;
      const band = this.getFreqBand(hz);
      const w0 = Math.max(selectedStart, b0);
      const w1 = Math.min(selectedEnd + 1, b1);
      let sum = 0;
      let count = 0;
      for (let b = w0; b < w1; b += 1) {
        sum += this.dataArray[b] || 0;
        count += 1;
      }
      const lastPipeline = this.lastPipelineBars[i] || 0;
      let v = this.runReactivityPipeline(sum, lastPipeline, count);
      const sensitivity = band === "low"
        ? this.runtime.lowSensitivity
        : band === "mid"
          ? this.runtime.midSensitivity
          : this.runtime.highSensitivity;
      v *= sensitivity * this.runtime.gain;
      // Soft-knee compression keeps loud masters from pinning bars at max.
      v = 1 - Math.exp(-Math.max(0, v) * 1.05);
      this.lastPipelineBars[i] = v;
      rawBars[i] = v;
    }

    // Frame-level adaptive normalization keeps dynamics readable without hard pinning.
    const rawAvg = rawBars.reduce((acc, n) => acc + n, 0) / Math.max(1, rawBars.length);
    // Faster adaptation to loud volume (0.15) to prevent staying maxed
    const levelFollow = rawAvg > this.levelRef ? 0.15 : 0.02;
    this.levelRef += (rawAvg - this.levelRef) * levelFollow;
    const frameNorm = 0.52 / Math.max(0.2, this.levelRef);

    for (let i = 0; i < rawBars.length; i += 1) {
      let v = Math.pow(this.clamp01(rawBars[i] * frameNorm), 0.92) * 1.05;
      v = Math.max(0, Math.min(1.05, v));

      const prev = this.smoothedBars[i] || 0;
      const smoothed = v > prev
        ? prev + (v - prev) * this.options.attack
        : prev + (v - prev) * this.options.release;
      this.smoothedBars[i] = smoothed;
      bars[i] = smoothed;
    }

    let globalSum = 0;
    let globalCount = 0;
    for (let b = selectedStart; b <= selectedEnd; b += 1) {
      globalSum += this.dataArray[b] || 0;
      globalCount += 1;
    }
    const globalImpact = this.runReactivityPipeline(globalSum, this.lastGlobalImpact, globalCount);
    this.lastGlobalImpact = globalImpact;

    const total = bars.reduce((acc, n) => acc + n, 0);
    const barsEnergy = total / Math.max(1, bars.length);
    this.energy = barsEnergy * 0.7 + globalImpact * 0.3;
    const bassCount = Math.max(1, Math.floor(bars.length * 0.2));
    this.bassEnergy = bars.slice(0, bassCount).reduce((acc, n) => acc + n, 0) / bassCount;

    return bars;
  }

  sampleArrayAt(arr, pos) {
    if (!arr || !arr.length) return 0;
    if (arr.length === 1) return arr[0];
    const clamped = Math.max(0, Math.min(arr.length - 1, pos));
    const i0 = Math.floor(clamped);
    const i1 = Math.min(arr.length - 1, i0 + 1);
    const t = clamped - i0;
    return arr[i0] * (1 - t) + arr[i1] * t;
  }

  getDisplayBars(currentBars) {
    if (!this.barTransition || !this.prevSmoothedBars.length) {
      return currentBars;
    }
    const count = currentBars.length;
    const blendOld = this.barTransition;
    const blendNew = 1 - this.barTransition;
    const oldLen = this.prevSmoothedBars.length;
    const out = new Array(count);

    for (let i = 0; i < count; i += 1) {
      const oldPos = oldLen === 1 ? 0 : (i * (oldLen - 1)) / Math.max(1, count - 1);
      const oldValue = this.sampleArrayAt(this.prevSmoothedBars, oldPos);
      out[i] = oldValue * blendOld + currentBars[i] * blendNew;
    }
    return out;
  }

  // ---- Star field (NCS / Proximity look): specks fly out from the centre toward the camera,
  // growing and speeding up as they go. Bass pushes them faster; quiet parts drift slowly.

  /** A soft glowing dot, drawn once per colour and reused for every particle. */
  getGlowSprite(rgb) {
    if (this.glowSprite && this.glowSpriteColor === rgb) return this.glowSprite;
    const size = 64;
    const sprite = document.createElement("canvas");
    sprite.width = size;
    sprite.height = size;
    const g = sprite.getContext("2d");
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, "rgba(255, 255, 255, 1)");
    grad.addColorStop(0.16, `rgba(${rgb}, 0.9)`);
    grad.addColorStop(0.45, `rgba(${rgb}, 0.22)`);
    grad.addColorStop(1, `rgba(${rgb}, 0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    this.glowSprite = sprite;
    this.glowSpriteColor = rgb;
    return sprite;
  }

  spawnParticles(dt, cx, cy, radius) {
    if (!this.options.particleEnabled || this.options.mode === "monstercat") return;
    const amount = Math.max(0, this.options.particleIntensity || 0);
    if (amount <= 0) return;
    const drive = Math.min(1.4, this.energySlew * 0.8 + this.bassSlew * 0.9 + this.beatPulse * 0.6);
    const rate = (10 + drive * 70) * amount;
    const toSpawnFloat = rate * dt + this.spawnRemainder;
    let toSpawn = Math.floor(toSpawnFloat);
    this.spawnRemainder = toSpawnFloat - toSpawn;
    if (this.impactPulse > 0.75) toSpawn += Math.floor(this.impactPulse * 3 * amount);
    const maxCount = Math.round(380 * Math.min(1.6, Math.max(0.3, amount)));
    const startRadius = Math.max(8, radius);

    for (let i = 0; i < toSpawn && this.particles.length < maxCount; i += 1) {
      const angle = this.rand() * Math.PI * 2;
      const depth = 0.35 + this.rand() * 1.25; // near specks are bigger and faster
      this.particles.push({
        angle,
        dist: startRadius * (0.85 + this.rand() * 0.5),
        born: startRadius,
        depth,
        size: (0.7 + this.rand() * 1.5) * depth,
        alpha: 0.45 + this.rand() * 0.55,
        speed: 0,
      });
    }
  }

  updateParticles(dt) {
    if (!this.particles.length) return;
    const w = this.viewW;
    const h = this.viewH;
    const maxDist = Math.hypot(w, h) / 2 + 30;
    const push = 0.3 + this.bassSlew * 2.4 + this.beatPulse * 1.7 + this.impactPulse * 1.2;
    const base = Math.max(8, this.runtime.particleSpeed);
    let kept = 0;
    for (let i = 0; i < this.particles.length; i += 1) {
      const p = this.particles[i];
      // Perspective: the further out, the faster it moves across the screen.
      p.speed = base * p.depth * push * (1 + (p.dist / maxDist) * 2.4);
      p.dist += p.speed * dt;
      if (p.dist < maxDist) {
        this.particles[kept] = p;
        kept += 1;
      }
    }
    this.particles.length = kept;
  }

  drawParticles(cx, cy) {
    if (!this.options.particleEnabled || this.options.mode === "monstercat" || !this.particles.length) return;
    const c = this.ctx;
    const maxDist = Math.hypot(this.viewW, this.viewH) / 2 + 30;
    const rgb = this.options.particleColor || "140, 200, 255";
    const sprite = this.getGlowSprite(rgb);
    const trails = this.options.trailsEnabled !== false;
    c.save();
    c.globalCompositeOperation = "lighter";
    c.lineCap = "round";
    for (let i = 0; i < this.particles.length; i += 1) {
      const p = this.particles[i];
      const t = p.dist / maxDist;
      const fadeIn = Math.min(1, (p.dist - p.born * 0.85) / 36);
      const alpha = Math.max(0, fadeIn) * (1 - t * t * t) * p.alpha * (this.options.particleAlpha ?? 0.65) * 1.3;
      if (alpha <= 0.01) continue;
      const dx = Math.cos(p.angle);
      const dy = Math.sin(p.angle);
      const x = cx + dx * p.dist;
      const y = cy + dy * p.dist;
      const size = p.size * (0.7 + t * 2.4);
      if (trails && p.speed > 90) {
        const streak = Math.min(46, p.speed * 0.045);
        c.strokeStyle = `rgba(${rgb}, ${Math.min(1, alpha * 0.55)})`;
        c.lineWidth = Math.max(0.6, size * 0.7);
        c.beginPath();
        c.moveTo(x - dx * streak, y - dy * streak);
        c.lineTo(x, y);
        c.stroke();
      }
      c.globalAlpha = Math.min(1, alpha);
      const d = size * 5;
      c.drawImage(sprite, x - d / 2, y - d / 2, d, d);
    }
    c.restore();
  }

  spawnMonstercatParticles(dt, w, h) {
    if (!this.options.monstercatParticleEnabled || this.options.mode !== "monstercat") return;
    const intensity = Math.max(0, Math.min(1.4, this.energySlew * 0.9 + this.bassSlew * 0.7 + this.impactPulse * 0.8));
    const rate = (8 + intensity * 48) * Math.max(0.25, this.options.particleIntensity || 1);
    const toSpawn = Math.floor(rate * dt + this.rand() * 0.7);
    const speedScale = Math.max(0.25, this.options.monstercatParticleSpeed || 1);
    const yPad = 14;

    for (let i = 0; i < toSpawn; i += 1) {
      const y = yPad + this.rand() * Math.max(1, h - yPad * 2);
      const vx = (110 + intensity * 260 + this.rand() * 150) * speedScale;
      const life = (w + 120) / Math.max(1, vx) + this.rand() * 0.9;
      this.monstercatParticles.push({
        x: -40 - this.rand() * 100,
        y,
        vx,
        life,
        maxLife: life,
        size: (1.2 + this.rand() * 2.2) * Math.max(0.35, this.options.monstercatParticleSize || 1),
        seed: this.rand() * Math.PI * 2,
      });
    }
  }

  updateMonstercatParticles(dt, w, h) {
    if (!this.monstercatParticles.length) return;
    const keep = [];
    for (let i = 0; i < this.monstercatParticles.length; i += 1) {
      const p = this.monstercatParticles[i];
      p.life -= dt;
      if (p.life <= 0) continue;
      p.x += p.vx * dt;
      p.y += Math.sin((p.maxLife - p.life) * 6 + p.seed) * dt * 8;
      if (p.x > w + 80 || p.y < -40 || p.y > h + 40) continue;
      keep.push(p);
    }
    const maxCount = Math.max(40, Math.floor(this.options.monstercatParticleCount ?? 900));
    this.monstercatParticles = keep.slice(-maxCount);
  }

  drawMonstercatParticles() {
    if (!this.options.monstercatParticleEnabled || this.options.mode !== "monstercat") return;
    const c = this.ctx;
    const [pr, pg, pb] = this.options.particleColor.split(",").map((v) => Number(v.trim()));
    for (let i = 0; i < this.monstercatParticles.length; i += 1) {
      const p = this.monstercatParticles[i];
      const t = p.life / Math.max(0.001, p.maxLife);
      const alpha = Math.max(0, Math.min(0.55, t * 0.55));
      if (alpha <= 0) continue;
      const amp = Math.min(1.35, 1 - t + this.energySlew * 0.35);
      c.fillStyle = this.options.multiColorReactive
        ? this.getReactiveColor(amp, alpha, 1.15, true)
        : `rgba(${pr}, ${pg}, ${pb}, ${alpha})`;
      c.beginPath();
      c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      c.fill();

      c.strokeStyle = this.options.multiColorReactive
        ? this.getReactiveColor(amp, alpha * 0.65, 1.2, true)
        : `rgba(${pr}, ${pg}, ${pb}, ${alpha * 0.65})`;
      c.lineWidth = Math.max(1, p.size * 0.75);
      c.beginPath();
      c.moveTo(p.x - p.size * 4.2, p.y);
      c.lineTo(p.x, p.y);
      c.stroke();
    }
  }

  drawMonstercat(bars, w, h) {
    const c = this.ctx;
    const maxBarsForWidth = Math.max(24, Math.floor(w / 4));
    const count = Math.max(16, Math.min(bars.length, maxBarsForWidth));
    const smoothing = Math.max(0.05, Math.min(0.95, this.runtime.monstercatSmoothing || 0.35));

    // Exact edge-to-edge layout: last bar always reaches the right edge.
    let spacing = Math.max(0, this.options.monstercatSpacing ?? 2);
    const barSlot = w / Math.max(1, count);
    if (barSlot - spacing < 1) {
      spacing = Math.max(0, barSlot - 1);
    }
    const maxHeight = h * 0.44;
    const baselineY = h - (this.options.monstercatYOffset ?? 20);
    const transparentBars = this.options.spectrumStyle === "transparent";

    for (let i = 0; i < count; i++) {
      const rawAmp = Math.max(0, bars[i]);
      const prevAmp = this.monstercatSmoothedBars[i] || 0;
      const amp = prevAmp + (rawAmp - prevAmp) * (1 - smoothing);
      this.monstercatSmoothedBars[i] = amp;
      const barHeight = Math.max(2, Math.min(maxHeight, amp * maxHeight * 1.02));
      const x = i * barSlot;
      const barWidth = Math.max(1, barSlot - spacing);
      const y = baselineY - barHeight;
      const barReactive = Math.min(1.6, amp + this.beatPulse * 0.45 + this.impactPulse * 0.7);
      if (transparentBars) {
        c.fillStyle = this.getReactiveColor(barReactive, 0.14, 1.1, true);
        c.fillRect(x, y, barWidth, barHeight);
        c.strokeStyle = this.getReactiveColor(barReactive, 0.96, 1.18, true);
        c.lineWidth = Math.max(1, barWidth * 0.08);
        c.strokeRect(x, y, barWidth, barHeight);
        c.beginPath();
        c.moveTo(x, y + barHeight);
        c.lineTo(x + barWidth, y + barHeight);
        c.stroke();
      } else {
        c.fillStyle = this.getReactiveColor(barReactive, 0.92, 1.15);
        c.shadowBlur = Math.max(0, this.options.monstercatGlow ?? 15) * this.pixelScale;
        c.shadowColor = this.getReactiveColor(barReactive, 0.6, 1.1);
        c.fillRect(x, y, barWidth, barHeight);
      }
    }

    c.shadowBlur = 0;
  }

  // ---- Spectrum: rounded bars rising from a centre line with a faded reflection below it and a
  // small cap that hangs at each bar's peak before falling. Mirrored, the bass sits in the middle.
  drawSpectrumAnalyzer(bars, w, h) {
    const c = this.ctx;
    const smoothing = Math.max(0.05, Math.min(0.95, this.options.spectrumSmoothing ?? 0.3));
    const thickness = Math.max(1, this.options.spectrumBarThickness ?? 4);
    const glow = Math.max(0, this.options.spectrumGlow ?? 20);
    const opacity = Math.max(0, Math.min(1, this.options.spectrumOpacity ?? 1.0));
    const mirror = this.options.spectrumMirror !== false;
    const rainbow = this.options.multiColorReactive || this.options.spectrumRgb;
    const [r, g, b] = (this.options.spectrumColor || "255,255,255").split(",").map((v) => Number(v.trim()));

    // Layout: a band across the middle 84% of the frame, sitting a little below centre.
    const span = w * 0.84;
    const left = (w - span) / 2;
    const baseline = h * 0.6;
    const maxUp = h * 0.38;
    const slot = Math.max(3, thickness + 3);
    const total = Math.max(16, Math.floor(span / slot));
    const sideCount = mirror ? Math.floor(total / 2) : total;
    const slotW = span / (mirror ? sideCount * 2 : sideCount);
    const barW = Math.max(1.5, Math.min(thickness, slotW - 1.5));
    const from = Math.floor(bars.length * 0.1); // skip the rumble below the kick, so the centre is the peak
    const use = Math.max(from + 8, Math.floor(bars.length * 0.82)); // and the dull top highs

    if (this.spectrumSmoothedBars.length !== sideCount) this.spectrumSmoothedBars = new Array(sideCount).fill(0);
    if (!this.spectrumPeaks || this.spectrumPeaks.length !== sideCount) this.spectrumPeaks = new Array(sideCount).fill(0);

    const drawBar = (slotIndex, height, peak, color, glowColor) => {
      const x = left + slotIndex * slotW + (slotW - barW) / 2;
      const radius = barW / 2;
      // bar
      c.shadowBlur = glow * this.pixelScale;
      c.shadowColor = glowColor;
      c.fillStyle = color;
      c.beginPath();
      if (c.roundRect) c.roundRect(x, baseline - height, barW, height, [radius, radius, 0, 0]);
      else c.rect(x, baseline - height, barW, height);
      c.fill();
      c.shadowBlur = 0;
      // peak cap
      c.fillRect(x, baseline - peak - 3, barW, 1.5);
      // reflection
      const refl = c.createLinearGradient(0, baseline + 2, 0, baseline + 2 + height * 0.55);
      refl.addColorStop(0, glowColor.replace(/[\d.]+\)$/, `${0.3 * opacity})`));
      refl.addColorStop(1, glowColor.replace(/[\d.]+\)$/, "0)"));
      c.fillStyle = refl;
      c.fillRect(x, baseline + 2, barW, height * 0.55);
    };

    // Sample the bands, then let the innermost bars take the strongest of their neighbours so the
    // middle is one peak instead of a dip between two.
    const raw = new Array(sideCount);
    for (let i = 0; i < sideCount; i += 1) {
      const pos = sideCount === 1 ? from : from + (i / (sideCount - 1)) * (use - 1 - from);
      raw[i] = Math.max(0, this.sampleArrayAt(bars, pos));
    }
    let strongest = 0;
    for (let i = Math.min(sideCount - 1, Math.floor(sideCount * 0.1)); i >= 0; i -= 1) {
      strongest = Math.max(strongest, raw[i]);
      raw[i] = strongest;
    }

    for (let i = 0; i < sideCount; i += 1) {
      const rawAmp = raw[i];
      const prev = this.spectrumSmoothedBars[i] || 0;
      const amp = prev + (rawAmp - prev) * (1 - smoothing);
      this.spectrumSmoothedBars[i] = amp;
      const height = Math.max(2, Math.min(maxUp, amp * maxUp * 1.05));
      // The cap jumps up with the bar, then falls slowly.
      this.spectrumPeaks[i] = Math.max(height, this.spectrumPeaks[i] - maxUp * 0.006);
      const peak = this.spectrumPeaks[i];

      const reactive = Math.min(1.6, amp + this.beatPulse * 0.45 + this.impactPulse * 0.7);
      const color = rainbow ? this.getReactiveColor(reactive, opacity, 1.18, true) : `rgba(${r}, ${g}, ${b}, ${opacity})`;
      const glowColor = rainbow ? this.getReactiveColor(reactive, 0.85, 1.2, true) : `rgba(${r}, ${g}, ${b}, 0.85)`;

      if (mirror) {
        drawBar(sideCount - 1 - i, height, peak, color, glowColor); // left of centre
        drawBar(sideCount + i, height, peak, color, glowColor); // right of centre
      } else {
        drawBar(i, height, peak, color, glowColor);
      }
    }

    // centre line
    c.fillStyle = rainbow ? this.getReactiveColor(0.6, 0.5 * opacity, 1.1, true) : `rgba(${r}, ${g}, ${b}, ${0.5 * opacity})`;
    c.fillRect(left, baseline, span, 1);
    c.shadowBlur = 0;
  }

  drawVignette() {
    const c = this.ctx;
    const w = this.viewW;
    const h = this.viewH;
    const grad = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.7);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.5)");
    c.fillStyle = grad;
    c.fillRect(0, 0, w, h);
  }

  calculateShake() {
    if (this.bassEnergy > 0.45 && this.options.shakeIntensity > 0) { // Threshhold 0.4 -> 0.45
        const shakeAmt = (this.bassEnergy - 0.45) * 10 * this.options.shakeIntensity; // Mult 15 -> 10
        this.shakeOffsetX = (this.rand() - 0.5) * shakeAmt;
        this.shakeOffsetY = (this.rand() - 0.5) * shakeAmt;
    } else {
        this.shakeOffsetX *= 0.9;
        this.shakeOffsetY *= 0.9;
    }
  }

  loop(ts) {
    if (!this.running) return;
    // Advance in fixed 1/60 s steps so motion is the same on any monitor and in the export.
    const STEP = 1 / 60;
    const elapsed = this.lastTs ? Math.min(0.1, (ts - this.lastTs) / 1000) : STEP;
    this.lastTs = ts;
    this.stepAccumulator += elapsed;
    let steps = 0;
    while (this.stepAccumulator >= STEP * 0.9 && steps < 2) {
      this.stepAccumulator -= STEP;
      this.renderFrame(STEP);
      steps += 1;
    }
    if (steps && this.onFrame) this.onFrame(this);
    if (this.stepAccumulator > STEP) this.stepAccumulator = 0; // too far behind: drop the backlog
    this.animationFrame = requestAnimationFrame(this.loop);
  }

  /** How much to zoom the artwork behind the visualizer this frame (1 = none). */
  getZoom() {
    const amount = Math.max(0, Math.min(1, this.options.fxZoomPulse || 0));
    return 1 + amount * 0.05 * (this.framePulse || 0);
  }

  /** Advance the simulation by dt seconds and draw one frame. */
  renderFrame(dt) {
    const c = this.ctx;
    const w = this.viewW;
    const h = this.viewH;
    if (!w || !h) return;

    c.globalCompositeOperation = "source-over";
    // Keep the visualizer transparent so it does not darken the background image.
    c.clearRect(0, 0, w, h);

    const bars = this.computeBars();

    // Smooth global energy and detect beat pulses for audio-reactive particles
    this.energySlew = this.lerp(this.energySlew, this.energy, 10, dt);
    this.bassSlew = this.lerp(this.bassSlew, this.bassEnergy, 14, dt);
    const bassDelta = this.bassSlew - this.lastBassEnergy;
    if (bassDelta > 0.035 && this.bassSlew > 0.14) {
      this.beatPulse = Math.min(1, this.beatPulse + bassDelta * 5.2);
    } else {
      this.beatPulse *= Math.exp(-6.2 * dt);
    }
    if (bassDelta > 0.02) {
      this.impactPulse = Math.min(1, this.impactPulse + bassDelta * 10.5);
    } else {
      this.impactPulse *= Math.exp(-13.5 * dt);
    }
    this.lastBassEnergy = this.bassSlew;
    this.hasAudioSignal = this.energySlew > 0.02 || this.bassSlew > 0.015 || this.beatPulse > 0.08;
    if (this.hasAudioSignal) {
      this.silenceSeconds = 0;
    } else {
      this.silenceSeconds += dt;
    }

    // Update Shake
    this.calculateShake();

    const cx = w / 2 + this.shakeOffsetX;
    const cy = h / 2 + this.shakeOffsetY;

    this.runtime.gain = this.lerp(this.runtime.gain, this.options.gain, 8.5, dt);
    this.runtime.rotateSpeed = this.lerp(this.runtime.rotateSpeed, this.options.rotateSpeed, 9, dt);
    this.runtime.maxBarLength = this.lerp(this.runtime.maxBarLength, this.options.maxBarLength, 8.5, dt);
    this.runtime.radius = this.lerp(this.runtime.radius, this.options.radius, 8.5, dt);
    this.runtime.baseSpawnRate = this.lerp(this.runtime.baseSpawnRate, this.options.baseSpawnRate, 10, dt);
    this.runtime.maxSpawnRate = this.lerp(this.runtime.maxSpawnRate, this.options.maxSpawnRate, 10, dt);
    this.runtime.particleSpeed = this.lerp(this.runtime.particleSpeed, this.options.particleSpeed, 10, dt);
    this.runtime.lowSensitivity = this.lerp(this.runtime.lowSensitivity, this.options.lowSensitivity, 9, dt);
    this.runtime.midSensitivity = this.lerp(this.runtime.midSensitivity, this.options.midSensitivity, 9, dt);
    this.runtime.highSensitivity = this.lerp(this.runtime.highSensitivity, this.options.highSensitivity, 9, dt);
    this.runtime.monstercatSmoothing = this.lerp(this.runtime.monstercatSmoothing, this.options.monstercatSmoothing, 9, dt);

    const mode = this.options.mode;
    const kind = STYLE_KIND[mode] || "ring";
    // How hard the music is hitting right now, 0..1 (drives the artwork zoom).
    this.framePulse = this.lerp(this.framePulse || 0, Math.min(1, this.bassSlew * 0.8 + this.beatPulse * 0.7), 18, dt);

    if (kind === "monstercat") {
        this.spawnMonstercatParticles(dt, w, h);
        this.updateMonstercatParticles(dt, w, h);
        this.drawMonstercatParticles();
        this.drawMonstercat(this.getDisplayBars(bars), w, h);
    } else {
        const displayBars = this.getDisplayBars(bars);
        const radius = Math.min(w, h) * this.runtime.radius;
        this.rotation += this.runtime.rotateSpeed + this.energy * 0.0008;
        this.recordRotation += this.runtime.rotateSpeed * 2.6 + this.energy * 0.02 + this.beatPulse * 0.01;

        // Stars fly out from the logo (ring styles) or from the middle of the bars.
        const originY = kind === "ring" ? cy : (mode === "spectrum" ? h * 0.6 : h * 0.5) + this.shakeOffsetY;
        this.spawnParticles(dt, cx, originY, kind === "ring" ? radius * 0.9 : 10);
        this.updateParticles(dt);
        this.drawParticles(cx, originY);

        c.save();
        if (kind !== "ring") c.translate(this.shakeOffsetX, this.shakeOffsetY);
        if (mode === "circle") drawNcsRing(this, displayBars, cx, cy, radius);
        else if (mode === "blob") drawBlob(this, displayBars, cx, cy, radius);
        else if (mode === "dots") drawDotRing(this, displayBars, cx, cy, radius);
        else if (mode === "proximity") drawProximity(this, displayBars, w, h);
        else if (mode === "wave") drawWave(this, displayBars, w, h);
        else if (mode === "mirror") drawMirrorBars(this, displayBars, w, h);
        else this.drawSpectrumAnalyzer(displayBars, w, h);
        c.restore();
    }

    // Effects over any style.
    if (this.options.fxFlash && this.impactPulse > 0.08) {
      c.save();
      c.globalCompositeOperation = "lighter";
      c.fillStyle = `rgba(255, 255, 255, ${Math.min(0.12, this.impactPulse * 0.1)})`;
      c.fillRect(0, 0, w, h);
      c.restore();
    }
    if (this.options.fxVignette) this.drawVignette();

    if (this.barTransition > 0) {
      this.barTransition = Math.max(0, this.barTransition - (dt / this.barTransitionDuration));
      if (this.barTransition === 0) {
        this.prevSmoothedBars = [];
      }
    }
  }
}
