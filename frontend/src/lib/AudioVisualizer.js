const DEFAULT_OPTIONS = {
  fftSize: 16384,
  minHz: 20,
  maxHz: 18000,
  bars: 128,
  noiseFloor: 0.06,
  curvePower: 0.6,
  attack: 0.72,
  release: 0.16,
  gain: 1.35,
  radius: 0.23,
  maxBarLength: 0.18,
  rotateSpeed: 0.002,
  lineWidth: 2,
  glowWidth: 5,
  backgroundFade: 0.16,
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
  trailsEnabled: true,
  spectrumColor: "90, 160, 255",
  glowColor: "125, 185, 255",
  particleColor: "140, 200, 255",
  mode: "circle", // "circle" or "monstercat"
  monstercatBarWidth: 10,
  monstercatSpacing: 2,
  monstercatYOffset: 20,
  lowSensitivity: 1,
  midSensitivity: 1,
  highSensitivity: 1,
  monstercatSmoothing: 0.35,
  shakeIntensity: 1.0,
  multiColorReactive: false,
  spectrumStyle: "fill",
  fillCenter: "white",
  centerImageUrl: "",
  spectrumBorderWidth: 2,
  spectrumBorderColor: "255, 255, 255",
  spectrumRecordImageUrl: "",
  // FFT-to-reactivity pipeline settings (Musicvid-like behavior, custom implementation)
  reactivity: {
    startBin: 0,
    endBin: null,
    amplitudeScale: 4.2,
    normalizeByWindowSize: true,
    maxAmount: 1.2,
    minAmount: 0,
    minThreshold: 0.02,
    useDeltaSmoothing: true,
    minDeltaNeededToTrigger: 0.025,
    deltaDecay: 0.93,
  },
};

const IS_MOBILE = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(max-width: 768px)").matches;

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
    this.dataArray = null;
    this.frequencyBins = [];
    this.barCenterFreqs = [];
    this.smoothedBars = [];
    this.prevSmoothedBars = [];
    this.barTransition = 0;
    this.barTransitionDuration = 0.22;
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
    this.centerImage = null;
    this.centerImageUrl = "";
    this.recordImage = null;
    this.recordImageUrl = "";
    this.recordRotation = 0;
    this.bandRefs = { low: 0.32, mid: 0.3, high: 0.26 };
    this.monstercatSmoothedBars = [];

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

  attachCanvas(nextCanvas) {
    if (!nextCanvas || this.canvas === nextCanvas) return;
    this.canvas = nextCanvas;
    this.ctx = nextCanvas.getContext("2d", { alpha: true });
    this.resize();
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

    const palette = [
      [68, 120, 255],  // blue
      [0, 210, 255],   // cyan
      [50, 236, 150],  // mint
      [165, 255, 60],  // lime
      [255, 212, 64],  // yellow
      [255, 126, 52],  // orange
      [255, 62, 88],   // pink-red
    ];

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
      this.analyser.smoothingTimeConstant = 0.05;
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.buildBinMap();
    }

    if (this.connectedElement !== audioEl) {
      if (this.sourceNode) {
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
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch (_) {
        // no-op
      }
    }
    if (this.analyser) {
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

    const sampleRate = this.audioContext?.sampleRate || 48000;
    const fftSize = this.analyser?.fftSize || this.closestFftSize(this.options.fftSize);
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
    if (hz < 220) return "low";
    if (hz < 3200) return "mid";
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
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  computeBars() {
    if (!this.analyser || !this.dataArray) {
      return this.smoothedBars.map(() => 0);
    }
    this.analyser.getByteFrequencyData(this.dataArray);
    const [selectedStart, selectedEnd] = this.getSelectedBinRange();

    const bars = new Array(this.frequencyBins.length).fill(0);
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
      v = 1 - Math.exp(-Math.max(0, v) * 1.35);
      this.lastPipelineBars[i] = v;
      const prevBandRef = this.bandRefs[band] || 0.42;
      const bandRefFollow = v > prevBandRef ? 0.06 : 0.012;
      const nextBandRef = prevBandRef + (v - prevBandRef) * bandRefFollow;
      this.bandRefs[band] = Math.max(0.22, Math.min(1.2, nextBandRef));
      const regionalNorm = v / Math.max(0.34, this.bandRefs[band] * 1.2);
      v = Math.pow(this.clamp01(regionalNorm), 0.9) * 1.05;
      v = Math.max(0, Math.min(1.2, v));

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

  spawnParticles(dt, cx, cy, radius) {
    if (!this.options.particleEnabled || this.options.mode !== 'circle') return;
    if (!this.hasAudioSignal) return;
    const minRate = this.runtime.baseSpawnRate;
    const maxRate = this.runtime.maxSpawnRate;
    const energyDrive = Math.min(1, this.energySlew * 0.9 + this.bassSlew * 0.9);
    const burstBoost = this.beatPulse * 0.65 + this.impactPulse * 0.6;
    const rateMix = Math.min(1, energyDrive + burstBoost);
    const rate = minRate + (maxRate - minRate) * rateMix;
    const toSpawnFloat = rate * dt + this.spawnRemainder;
    const burstCount = this.beatPulse > 0.7 ? Math.floor(this.beatPulse * 4) : 0;
    const toSpawn = Math.floor(toSpawnFloat) + burstCount;
    this.spawnRemainder = toSpawnFloat - Math.floor(toSpawnFloat);

    for (let i = 0; i < toSpawn; i += 1) {
      const angle = Math.random() * Math.PI * 2 + this.rotation;
      const px = cx + Math.cos(angle) * radius;
      const py = cy + Math.sin(angle) * radius;
      const speedBurst = 1 + this.beatPulse * 1.1 + this.impactPulse * 1.35;
      const baseSpeed = this.runtime.particleSpeed * speedBurst * (0.4 + Math.random() * 1.25);
      const tangent = (Math.random() - 0.5) * this.options.particleJitter;
      const vx = Math.cos(angle) * baseSpeed + -Math.sin(angle) * tangent;
      const vy = Math.sin(angle) * baseSpeed + Math.cos(angle) * tangent;
      const baseLife = this.options.particleLifeMin + Math.random() * (this.options.particleLifeMax - this.options.particleLifeMin);
      const maxToEdge = Math.max(
        Math.hypot(px, py),
        Math.hypot((this.canvas.clientWidth || 0) - px, py),
        Math.hypot(px, (this.canvas.clientHeight || 0) - py),
        Math.hypot((this.canvas.clientWidth || 0) - px, (this.canvas.clientHeight || 0) - py)
      );
      const minLifeToEdge = maxToEdge / Math.max(1, baseSpeed * 0.92);
      const life = Math.max(baseLife, minLifeToEdge);
      this.particles.push({
        x: px,
        y: py,
        vx,
        vy,
        life,
        maxLife: life,
        baseSpeed,
        spin: (Math.random() - 0.5) * (0.85 + Math.random() * 0.75),
        seed: Math.random() * Math.PI * 2,
        age: 0,
      });
    }
  }

  updateParticles(dt, cx, cy) {
    const keep = [];
    const drive = Math.max(0, Math.min(2.8, this.energySlew * 0.9 + this.bassSlew * 1.35 + this.beatPulse * 1.15 + this.impactPulse * 1.35));
    const accel = 20 + drive * 72;
    const silentFade = this.silenceSeconds > 0.2;

    for (let i = 0; i < this.particles.length; i += 1) {
      const p = this.particles[i];
      p.life -= dt * 0.6;
      p.age += dt;
      if (silentFade) {
        p.life -= dt * (2.2 + this.silenceSeconds * 2.8);
      }
      if (p.life <= 0) continue;

      const dx = p.x - cx;
      const dy = p.y - cy;
      const dist = Math.max(0.0001, Math.hypot(dx, dy));
      const nx = dx / dist;
      const ny = dy / dist;
      const tx = -ny;
      const ty = nx;

      const speedNow = Math.hypot(p.vx, p.vy);
      const targetSpeed = p.baseSpeed * (0.75 + drive * 1.25);
      const speedAdjust = (targetSpeed - speedNow) * 0.22;

      const wobble = (Math.sin(p.age * 8.5 + p.seed) + Math.cos(p.age * 5.7 + p.seed * 0.67)) * 0.5;
      const turbulence = this.options.particleJitter * (0.012 + drive * 0.018) * wobble;
      const swirl = (this.options.particleJitter * 0.006) * p.spin * (0.6 + drive);

      p.vx += nx * (accel + speedAdjust) * dt + tx * (swirl + turbulence) * dt;
      p.vy += ny * (accel + speedAdjust) * dt + ty * (swirl + turbulence) * dt;

      const drag = silentFade
        ? Math.max(0.88, 0.95 - this.silenceSeconds * 0.08)
        : Math.max(0.93, 0.985 - drive * 0.02);
      p.vx *= drag;
      p.vy *= drag;

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const margin = 40;
      if (
        p.x < -margin ||
        p.x > (this.canvas.clientWidth || 0) + margin ||
        p.y < -margin ||
        p.y > (this.canvas.clientHeight || 0) + margin
      ) {
        continue;
      }
      keep.push(p);
    }

    this.particles = keep.slice(-900);
    if (this.silenceSeconds > 1.2) {
      this.particles = [];
      this.spawnRemainder = 0;
    }
  }
  drawParticles() {
    if (!this.options.particleEnabled || this.options.mode !== 'circle') return;
    const c = this.ctx;
    const [r, g, b] = this.options.particleColor.split(",").map((v) => Number(v.trim()));

    for (let i = 0; i < this.particles.length; i += 1) {
      const p = this.particles[i];
      const t = p.life / p.maxLife;
      const fade = t < 0.85 ? t : (1 - t) * 6;
      const alpha = Math.max(0, Math.min(1, fade * this.options.particleAlpha));
      if (alpha <= 0) continue;

      const speed = Math.hypot(p.vx, p.vy);
      const speedNorm = this.clamp01((speed / Math.max(1, this.runtime.particleSpeed * 2.2)) * 0.9 + this.beatPulse * 0.45 + this.impactPulse * 0.6);
      const coreColor = this.options.multiColorReactive
        ? this.getReactiveColor(speedNorm * 1.35, alpha, 1.12)
        : `rgba(${r}, ${g}, ${b}, ${alpha})`;
      const glowColor = this.options.multiColorReactive
        ? this.getReactiveColor(speedNorm * 1.35, alpha * 0.25, 1.25)
        : `rgba(${r}, ${g}, ${b}, ${alpha * 0.22})`;

      c.beginPath();
      c.fillStyle = glowColor;
      c.arc(p.x, p.y, this.options.particleGlowSize, 0, Math.PI * 2);
      c.fill();

      c.beginPath();
      c.fillStyle = coreColor;
      c.arc(p.x, p.y, this.options.particleSize, 0, Math.PI * 2);
      c.fill();
    }
  }

  drawSpectrum(bars, cx, cy, radius) {
    const c = this.ctx;
    const count = bars.length;
    const step = (Math.PI * 2) / count;
    const maxBarPx = Math.min(this.canvas.clientWidth, this.canvas.clientHeight) * this.runtime.maxBarLength;
    const avgAmp = bars.reduce((acc, n) => acc + Math.max(0, n), 0) / Math.max(1, count);
    const reactiveAmp = Math.min(1.6, avgAmp + this.beatPulse * 0.55 + this.impactPulse * 0.7);

    c.save();
    c.translate(cx, cy);
    c.rotate(this.rotation);
    c.globalCompositeOperation = "lighter";
    const fillMode = this.options.spectrumStyle === "fill";

    // Draw main spectrum path
    c.beginPath();
    c.lineWidth = this.options.lineWidth;

    // Create points for smooth curve
    const points = [];
    for (let i = 0; i < count; i++) {
        const a = i * step;
        const amp = Math.max(0, bars[i]);
        const len = amp * maxBarPx;
        const x = Math.cos(a) * (radius + len);
        const y = Math.sin(a) * (radius + len);
        points.push({x, y});
    }

    // Connect last point to first for closed loop
    points.push(points[0]);
    points.push(points[1]);

    c.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        const midX = (p0.x + p1.x) / 2;
        const midY = (p0.y + p1.y) / 2;
        c.quadraticCurveTo(p0.x, p0.y, midX, midY);
    }
    c.closePath();
    if (fillMode) {
      c.fillStyle = "rgba(255, 255, 255, 0.86)";
      c.fill();
      c.strokeStyle = "rgba(255, 255, 255, 0.95)";
      c.stroke();

      const innerRadius = Math.max(6, radius * 0.94);
      c.save();
      c.beginPath();
      c.arc(0, 0, innerRadius, 0, Math.PI * 2);
      c.closePath();
      c.clip();
      if (
        (this.options.fillCenter === "image" || this.options.fillCenter === "ncs") &&
        this.centerImage &&
        this.centerImage.complete &&
        this.centerImage.naturalWidth > 0
      ) {
        const drawSize = innerRadius * 2;
        if (this.options.fillCenter === "ncs") {
          const intensity = Math.min(1.6, this.energySlew + this.beatPulse * 0.6 + this.impactPulse * 0.8);
          const zoom = 1.08 + intensity * 0.12;
          const renderSize = drawSize * zoom;

          c.save();
          c.filter = "blur(10px) saturate(1.35) contrast(1.06) brightness(1.04)";
          c.drawImage(this.centerImage, -renderSize / 2, -renderSize / 2, renderSize, renderSize);
          c.restore();

          const ringGrad = c.createRadialGradient(0, 0, innerRadius * 0.35, 0, 0, innerRadius);
          ringGrad.addColorStop(0, "rgba(255,255,255,0)");
          ringGrad.addColorStop(1, this.getReactiveColor(intensity, 0.34, 1.2));
          c.fillStyle = ringGrad;
          c.fillRect(-innerRadius, -innerRadius, innerRadius * 2, innerRadius * 2);
        } else {
          c.drawImage(this.centerImage, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
        }
      } else {
        c.fillStyle = "rgba(255, 255, 255, 1)";
        c.fillRect(-innerRadius, -innerRadius, innerRadius * 2, innerRadius * 2);
      }
      c.restore();
    } else {
      c.strokeStyle = this.getReactiveColor(reactiveAmp, 0.95, 1.14);
      c.stroke();
    }

    if (this.options.mode === "circle" && this.options.spectrumRecordImageUrl) {
      this.drawRecordDisc(radius);
    }

    if ((this.options.spectrumBorderWidth || 0) > 0) {
      const [br, bg, bb] = this.options.spectrumBorderColor.split(",").map((v) => Number(v.trim()));
      c.beginPath();
      c.strokeStyle = `rgba(${br}, ${bg}, ${bb}, 0.92)`;
      c.lineWidth = this.options.spectrumBorderWidth;
      c.arc(0, 0, radius, 0, Math.PI * 2);
      c.stroke();
    }

    // Draw bars (classic style) inside
    for (let i = 0; i < count; i += 1) {
      const a = i * step;
      const amp = Math.max(0, bars[i]);
      const len = amp * maxBarPx;
      const x0 = Math.cos(a) * radius;
      const y0 = Math.sin(a) * radius;
      const x1 = Math.cos(a) * (radius + len);
      const y1 = Math.sin(a) * (radius + len);
      const xTip0 = Math.cos(a) * (radius + len * 0.72);
      const yTip0 = Math.sin(a) * (radius + len * 0.72);
      const barReactive = Math.min(1.6, amp + this.beatPulse * 0.45 + this.impactPulse * 0.7);

      c.beginPath();
      c.strokeStyle = fillMode
        ? "rgba(255, 255, 255, 0.88)"
        : this.getReactiveColor(barReactive, 0.25, 1.2);
      c.lineWidth = fillMode ? Math.max(1.5, this.options.lineWidth * 0.95) : this.options.glowWidth;
      c.moveTo(x0, y0);
      c.lineTo(x1, y1);
      c.stroke();

      c.beginPath();
      c.strokeStyle = fillMode
        ? this.getReactiveColor(barReactive, 0.98, 1.2, true)
        : this.getReactiveColor(barReactive, 0.95, 1.12);
      c.lineWidth = Math.max(1, this.options.lineWidth * 0.9);
      c.moveTo(fillMode ? xTip0 : x0, fillMode ? yTip0 : y0);
      c.lineTo(x1, y1);
      c.stroke();
    }
    c.restore();
  }

  drawMonstercat(bars, w, h) {
    const c = this.ctx;
    const count = Math.min(bars.length, 63); // Limit bars for cleaner look
    const smoothing = Math.max(0.05, Math.min(0.95, this.runtime.monstercatSmoothing || 0.35));

    const barWidth = this.options.monstercatBarWidth || (w / count * 0.6);
    const spacing = this.options.monstercatSpacing || (w / count * 0.2);
    const totalWidth = count * (barWidth + spacing);
    const startX = (w - totalWidth) / 2;
    const maxHeight = h * 0.44;
    const baselineY = h - (this.options.monstercatYOffset || 20);
    const transparentBars = this.options.spectrumStyle === "transparent";

    for (let i = 0; i < count; i++) {
      const rawAmp = Math.max(0, bars[i]);
      const prevAmp = this.monstercatSmoothedBars[i] || 0;
      const amp = prevAmp + (rawAmp - prevAmp) * (1 - smoothing);
      this.monstercatSmoothedBars[i] = amp;
      const barHeight = Math.max(2, Math.min(maxHeight, amp * maxHeight * 1.02));
      const x = startX + i * (barWidth + spacing);
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
        c.shadowBlur = 15;
        c.shadowColor = this.getReactiveColor(barReactive, 0.6, 1.1);
        c.fillRect(x, y, barWidth, barHeight);
      }
    }

    c.shadowBlur = 0;
  }

  drawVignette() {
    const c = this.ctx;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const grad = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.7);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.26)");
    c.fillStyle = grad;
    c.fillRect(0, 0, w, h);
  }

  calculateShake() {
    if (this.bassEnergy > 0.4 && this.options.shakeIntensity > 0) {
        const shakeAmt = (this.bassEnergy - 0.4) * 15 * this.options.shakeIntensity;
        this.shakeOffsetX = (Math.random() - 0.5) * shakeAmt;
        this.shakeOffsetY = (Math.random() - 0.5) * shakeAmt;
    } else {
        this.shakeOffsetX *= 0.9;
        this.shakeOffsetY *= 0.9;
    }
  }

  loop(ts) {
    if (!this.running) return;
    const dt = this.lastTs ? Math.min(0.06, (ts - this.lastTs) / 1000) : 0.016;
    this.lastTs = ts;

    const c = this.ctx;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (!w || !h) {
      this.animationFrame = requestAnimationFrame(this.loop);
      return;
    }

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

    if (this.options.mode === 'circle') {
        const radius = Math.min(w, h) * this.runtime.radius;
        const displayBars = this.getDisplayBars(bars);

        this.rotation += this.runtime.rotateSpeed + this.energy * 0.0008;
        this.recordRotation += this.runtime.rotateSpeed * 2.6 + this.energy * 0.02 + this.beatPulse * 0.01;
        this.spawnParticles(dt, cx, cy, radius);
        this.updateParticles(dt, cx, cy);
        this.drawParticles();
        this.drawSpectrum(displayBars, cx, cy, radius);
    } else if (this.options.mode === 'monstercat') {
        this.drawMonstercat(this.getDisplayBars(bars), w, h);
    }

    if (this.barTransition > 0) {
      this.barTransition = Math.max(0, this.barTransition - (dt / this.barTransitionDuration));
      if (this.barTransition === 0) {
        this.prevSmoothedBars = [];
      }
    }

    this.animationFrame = requestAnimationFrame(this.loop);
  }
}
