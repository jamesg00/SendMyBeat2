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
  shakeIntensity: 1.0,
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
    };
    this.runtime = {
      gain: this.options.gain,
      rotateSpeed: this.options.rotateSpeed,
      maxBarLength: this.options.maxBarLength,
      radius: this.options.radius,
      baseSpawnRate: this.options.baseSpawnRate,
      maxSpawnRate: this.options.maxSpawnRate,
      particleSpeed: this.options.particleSpeed,
    };

    this.audioContext = null;
    this.analyser = null;
    this.sourceNode = null;
    this.connectedElement = null;
    this.dataArray = null;
    this.frequencyBins = [];
    this.smoothedBars = [];
    this.prevSmoothedBars = [];
    this.barTransition = 0;
    this.barTransitionDuration = 0.22;

    this.animationFrame = null;
    this.lastTs = 0;
    this.rotation = 0;
    this.running = false;

    this.particles = [];
    this.spawnRemainder = 0;

    this.energy = 0;
    this.bassEnergy = 0;

    // Shake state
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;

    this.resize = this.resize.bind(this);
    this.loop = this.loop.bind(this);
    this.buildBinMap();
    this.resize();
    window.addEventListener("resize", this.resize);
  }

  setOptions(next = {}) {
    this.options = { ...this.options, ...next };
    if (typeof next.bars === "number" || typeof next.minHz === "number" || typeof next.maxHz === "number") {
      this.buildBinMap();
    }
  }

  lerp(current, target, speed, dt) {
    const t = 1 - Math.exp(-speed * dt);
    return current + (target - current) * t;
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
    this.smoothedBars = new Array(bars).fill(0);
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
    }
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

    const bars = new Array(this.frequencyBins.length).fill(0);
    for (let i = 0; i < this.frequencyBins.length; i += 1) {
      const [b0, b1] = this.frequencyBins[i];
      let sum = 0;
      let count = 0;
      for (let b = b0; b < b1; b += 1) {
        sum += this.dataArray[b] || 0;
        count += 1;
      }
      let v = count ? sum / (count * 255) : 0;
      v = Math.max(0, v - this.options.noiseFloor);
      v = Math.pow(v, this.options.curvePower) * this.runtime.gain;
      v = Math.max(0, Math.min(1.6, v));

      const prev = this.smoothedBars[i] || 0;
      const smoothed = v > prev
        ? prev + (v - prev) * this.options.attack
        : prev + (v - prev) * this.options.release;
      this.smoothedBars[i] = smoothed;
      bars[i] = smoothed;
    }

    const total = bars.reduce((acc, n) => acc + n, 0);
    this.energy = total / Math.max(1, bars.length);
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
    const minRate = this.runtime.baseSpawnRate;
    const maxRate = this.runtime.maxSpawnRate;
    const rate = minRate + (maxRate - minRate) * Math.min(1, this.energy * 1.25);
    const toSpawnFloat = rate * dt + this.spawnRemainder;
    const toSpawn = Math.floor(toSpawnFloat);
    this.spawnRemainder = toSpawnFloat - toSpawn;

    for (let i = 0; i < toSpawn; i += 1) {
      const angle = Math.random() * Math.PI * 2 + this.rotation;
      const px = cx + Math.cos(angle) * radius;
      const py = cy + Math.sin(angle) * radius;
      const outward = this.runtime.particleSpeed * (0.45 + Math.random() * 0.9);
      const tangent = (Math.random() - 0.5) * this.options.particleJitter;
      const vx = Math.cos(angle) * outward + -Math.sin(angle) * tangent;
      const vy = Math.sin(angle) * outward + Math.cos(angle) * tangent;
      const life = this.options.particleLifeMin + Math.random() * (this.options.particleLifeMax - this.options.particleLifeMin);
      this.particles.push({
        x: px,
        y: py,
        vx,
        vy,
        life,
        maxLife: life,
      });
    }
  }

  updateParticles(dt) {
    const keep = [];
    for (let i = 0; i < this.particles.length; i += 1) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.985;
      p.vy *= 0.985;
      keep.push(p);
    }
    this.particles = keep.slice(-700);
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

      c.beginPath();
      c.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.22})`;
      c.arc(p.x, p.y, this.options.particleGlowSize, 0, Math.PI * 2);
      c.fill();

      c.beginPath();
      c.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      c.arc(p.x, p.y, this.options.particleSize, 0, Math.PI * 2);
      c.fill();
    }
  }

  drawSpectrum(bars, cx, cy, radius) {
    const c = this.ctx;
    const count = bars.length;
    const [sr, sg, sb] = this.options.spectrumColor.split(",").map((v) => Number(v.trim()));
    const [gr, gg, gb] = this.options.glowColor.split(",").map((v) => Number(v.trim()));
    const step = (Math.PI * 2) / count;
    const maxBarPx = Math.min(this.canvas.clientWidth, this.canvas.clientHeight) * this.runtime.maxBarLength;

    c.save();
    c.translate(cx, cy);
    c.rotate(this.rotation);
    c.globalCompositeOperation = "lighter";

    // Draw main spectrum path
    c.beginPath();
    c.strokeStyle = `rgba(${sr}, ${sg}, ${sb}, 0.9)`;
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
    c.stroke();

    // Draw bars (classic style) inside
    for (let i = 0; i < count; i += 1) {
      const a = i * step;
      const amp = Math.max(0, bars[i]);
      const len = amp * maxBarPx;
      const x0 = Math.cos(a) * radius;
      const y0 = Math.sin(a) * radius;
      const x1 = Math.cos(a) * (radius + len);
      const y1 = Math.sin(a) * (radius + len);

      c.beginPath();
      c.strokeStyle = `rgba(${gr}, ${gg}, ${gb}, 0.16)`;
      c.lineWidth = this.options.glowWidth;
      c.moveTo(x0, y0);
      c.lineTo(x1, y1);
      c.stroke();
    }
    c.restore();
  }

  drawMonstercat(bars, w, h) {
    const c = this.ctx;
    const count = Math.min(bars.length, 63); // Limit bars for cleaner look
    const [sr, sg, sb] = this.options.spectrumColor.split(",").map((v) => Number(v.trim()));

    const barWidth = this.options.monstercatBarWidth || (w / count * 0.6);
    const spacing = this.options.monstercatSpacing || (w / count * 0.2);
    const totalWidth = count * (barWidth + spacing);
    const startX = (w - totalWidth) / 2;
    const maxHeight = h * 0.4;

    c.fillStyle = `rgba(${sr}, ${sg}, ${sb}, 0.9)`;
    c.shadowBlur = 15;
    c.shadowColor = `rgba(${sr}, ${sg}, ${sb}, 0.5)`;

    for (let i = 0; i < count; i++) {
      const barHeight = Math.max(2, bars[i] * maxHeight * 1.5);
      const x = startX + i * (barWidth + spacing);
      const y = h - barHeight - 20; // 20px padding from bottom

      c.fillRect(x, y, barWidth, barHeight);
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
    c.fillStyle = this.options.trailsEnabled
      ? `rgba(2, 6, 17, ${this.options.backgroundFade})`
      : "rgba(2, 6, 17, 1)";
    c.fillRect(0, 0, w, h);

    const bars = this.computeBars();

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

    if (this.options.mode === 'circle') {
        const radius = Math.min(w, h) * this.runtime.radius;
        const displayBars = this.getDisplayBars(bars);

        this.rotation += this.runtime.rotateSpeed + this.energy * 0.0008;
        this.spawnParticles(dt, cx, cy, radius);
        this.updateParticles(dt);
        this.drawParticles();
        this.drawSpectrum(displayBars, cx, cy, radius);
    } else if (this.options.mode === 'monstercat') {
        this.drawMonstercat(this.getDisplayBars(bars), w, h);
    }

    this.drawVignette();

    if (this.barTransition > 0) {
      this.barTransition = Math.max(0, this.barTransition - (dt / this.barTransitionDuration));
      if (this.barTransition === 0) {
        this.prevSmoothedBars = [];
      }
    }

    this.animationFrame = requestAnimationFrame(this.loop);
  }
}
