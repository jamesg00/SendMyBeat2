import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

// The Upload Studio preview on the landing page: a 16:9 render with blurred artwork behind the
// cover and a visualizer that moves with a made-up beat. Pick a style to see how it changes.
// The styles and names match VISUALIZER_STYLES in lib/constants.js; the drawing here is a light
// sketch of each one, not the real renderer.

export const RENDER_STYLES = [
  { mode: "circle", name: "NCS" },
  { mode: "monstercat", name: "Monstercat" },
  { mode: "spectrum", name: "Spectrum" },
  { mode: "proximity", name: "Proximity" },
  { mode: "jelly", name: "Jelly", pro: true },
];
const STYLE_COUNT = 21; // 8 free styles plus 13 Pro styles in lib/constants.js

const COVER = "/landing/cover.jpg";
const MINT = "#8BFFD0";
const BLUE = "#4C8DFF";
const BPM = 140;
const START = 42; // seconds
const LENGTH = 178; // 2:58

const clamp = (v) => Math.max(0, Math.min(1, v));
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const reduced = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// A pretend spectrum: louder lows, a kick on every beat, and some movement up top.
function spectrum(t, n) {
  const beat = (t * BPM) / 60;
  const kick = Math.exp(-(beat % 1) * 7);
  const snare = Math.floor(beat) % 2 === 1 ? Math.exp(-(beat % 1) * 9) : 0;
  return Array.from({ length: n }, (_, i) => {
    const x = i / (n - 1);
    const v =
      0.5 - 0.32 * x +
      0.16 * Math.sin(t * 3.1 + i * 0.55) +
      0.1 * Math.sin(t * 5.7 + i * 1.9) +
      kick * 0.5 * Math.max(0, 1 - x * 2.4) +
      snare * 0.28 * Math.max(0, 1 - Math.abs(x - 0.45) * 3);
    return clamp(v);
  });
}
// Bass in the middle, highs at both ends.
const mirror = (a) => {
  const half = a.slice(0, Math.ceil(a.length / 2));
  return [...half.slice().reverse(), ...half].slice(0, a.length);
};

function drawCover(ctx, img, cx, cy, size, round) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = size * 0.18;
  ctx.shadowOffsetY = size * 0.06;
  ctx.beginPath();
  if (round) ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
  else if (ctx.roundRect) ctx.roundRect(cx - size / 2, cy - size / 2, size, size, size * 0.04);
  else ctx.rect(cx - size / 2, cy - size / 2, size, size);
  ctx.fillStyle = "#0b1418";
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.clip();
  if (img?.complete && img.naturalWidth) ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
  ctx.restore();
  if (round) {
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = Math.max(1.5, size * 0.012);
    ctx.stroke();
  }
}

function draw(ctx, w, h, mode, t, img, state) {
  ctx.clearRect(0, 0, w, h);
  // A few stars, like the free styles add.
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  for (let i = 0; i < 26; i += 1) {
    const x = ((i * 97.3) % 100) / 100;
    const y = ((i * 53.7) % 100) / 100;
    const a = 0.25 + 0.25 * Math.sin(t * 1.3 + i);
    ctx.globalAlpha = a;
    ctx.fillRect(x * w, y * h, 1.4, 1.4);
  }
  ctx.globalAlpha = 1;

  const raw = spectrum(t, 64);
  // Fast rise, slow fall, so it reads as audio.
  const lv = (state.lv = raw.map((v, i) => {
    const prev = state.lv?.[i] ?? v;
    return v > prev ? prev + (v - prev) * 0.6 : prev + (v - prev) * 0.18;
  }));
  const kick = Math.exp(-(((t * BPM) / 60) % 1) * 7);

  if (mode === "circle") {
    const cx = w / 2;
    const cy = h / 2;
    const r = h * 0.2 * (1 + kick * 0.03);
    const n = 120;
    const ring = mirror(spectrum(t, n));
    ctx.strokeStyle = "#fff";
    ctx.lineCap = "butt";
    ctx.lineWidth = Math.max(1.5, (Math.PI * 2 * r) / n - 1.6);
    for (let i = 0; i < n; i += 1) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      const len = 3 + ring[i] * h * 0.17;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (r + 4), cy + Math.sin(a) * (r + 4));
      ctx.lineTo(cx + Math.cos(a) * (r + 4 + len), cy + Math.sin(a) * (r + 4 + len));
      ctx.stroke();
    }
    drawCover(ctx, img, cx, cy, r * 2, true);
  } else if (mode === "monstercat") {
    drawCover(ctx, img, w / 2, h * 0.38, h * 0.46, false);
    const n = 56;
    const x0 = w * 0.1;
    const span = w * 0.8;
    const bw = span / n;
    const base = h * 0.9;
    ctx.fillStyle = "#fff";
    for (let i = 0; i < n; i += 1) {
      const v = lv[Math.floor((i / n) * lv.length)];
      const bh = 2 + v * h * 0.24;
      ctx.fillRect(x0 + i * bw + 1, base - bh, bw - 2, bh);
    }
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(x0, base + 3, span, 1);
  } else if (mode === "spectrum") {
    drawCover(ctx, img, w / 2, h * 0.34, h * 0.4, false);
    const n = 48;
    const vals = mirror(lv.slice(0, n));
    const x0 = w * 0.18;
    const span = w * 0.64;
    const bw = span / n;
    const base = h * 0.78;
    state.caps = state.caps || vals.map(() => ({ y: 0, v: 0 }));
    for (let i = 0; i < n; i += 1) {
      const bh = 2 + vals[i] * h * 0.2;
      const x = x0 + i * bw + 1;
      ctx.fillStyle = "#fff";
      ctx.fillRect(x, base - bh, bw - 2, bh);
      // Reflection in fine lines.
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      for (let y = 2; y < bh * 0.55; y += 2) ctx.fillRect(x, base + 2 + y, bw - 2, 1);
      // Caps hang, then fall.
      const cap = state.caps[i];
      if (bh >= cap.y) {
        cap.y = bh;
        cap.v = 0;
      } else {
        cap.v += 0.25;
        cap.y = Math.max(bh, cap.y - cap.v);
      }
      ctx.fillStyle = "#fff";
      ctx.fillRect(x, base - cap.y - 4, bw - 2, 1.5);
    }
  } else if (mode === "proximity") {
    const n = 110;
    const vals = mirror(spectrum(t, n));
    const x0 = w * 0.06;
    const span = w * 0.88;
    const cy = h * 0.5;
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.fillStyle = "#fff";
    ctx.lineWidth = 1;
    for (let i = 0; i < n; i += 1) {
      const x = x0 + (i / (n - 1)) * span;
      const half = 2 + vals[i] * h * 0.2;
      ctx.beginPath();
      ctx.moveTo(x, cy - half);
      ctx.lineTo(x, cy + half);
      ctx.stroke();
      ctx.fillRect(x - 1, cy - half - 1, 2, 2);
      ctx.fillRect(x - 1, cy + half - 1, 2, 2);
    }
    ctx.fillStyle = `rgba(255,255,255,${0.35 + kick * 0.6})`;
    ctx.fillRect(x0, cy - 0.5, span, 1);
  } else if (mode === "jelly") {
    const cx = w / 2;
    const cy = h / 2;
    const r = h * 0.2;
    const pts = 72;
    const lows = lv.slice(0, 16).reduce((a, b) => a + b, 0) / 16;
    const blob = (lag, grow) => {
      const path = new Path2D();
      for (let i = 0; i <= pts; i += 1) {
        const a = (i / pts) * Math.PI * 2;
        const wob = Math.sin(a * 3 + t * 2.2 - lag) * 0.5 + Math.sin(a * 5 - t * 1.7 - lag) * 0.3 + Math.sin(a * 2 + t * 0.9) * 0.2;
        const rr = r + 6 + grow + (lows * 0.7 + kick * 0.3) * h * 0.08 * (1 + wob * 0.6);
        const x = cx + Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr;
        if (i === 0) path.moveTo(x, y);
        else path.lineTo(x, y);
      }
      path.closePath();
      return path;
    };
    const g = ctx.createLinearGradient(cx - r * 1.6, cy - r * 1.6, cx + r * 1.6, cy + r * 1.6);
    g.addColorStop(0, MINT);
    g.addColorStop(1, BLUE);
    ctx.fillStyle = g;
    ctx.globalAlpha = 0.95;
    ctx.fill(blob(0, 0));
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 1;
    ctx.stroke(blob(0.5, 8));
    drawCover(ctx, img, cx, cy, r * 2, true);
  }
}

export default function RenderPreview() {
  const [mode, setMode] = useState("circle");
  const [playing, setPlaying] = useState(() => !reduced());
  const [pos, setPos] = useState(START);
  const frameRef = useRef(null);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const stateRef = useRef({});
  const tRef = useRef(START);
  const visibleRef = useRef(true);

  useEffect(() => {
    const img = new Image();
    img.src = COVER;
    imgRef.current = img;
  }, []);

  useEffect(() => {
    stateRef.current = {};
  }, [mode]);

  useEffect(() => {
    const frame = frameRef.current;
    const canvas = canvasRef.current;
    if (!frame || !canvas) return undefined;
    const ctx = canvas.getContext("2d");
    let size = { w: 0, h: 0 };
    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const { width, height } = frame.getBoundingClientRect();
      size = { w: width, h: height };
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(frame);
    const io = new IntersectionObserver(([e]) => {
      visibleRef.current = e.isIntersecting;
    });
    io.observe(frame);

    let raf = 0;
    let last = performance.now();
    let lastPos = 0;
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (playing) tRef.current = START + ((tRef.current - START + dt) % (LENGTH - START));
      if (visibleRef.current && size.w) draw(ctx, size.w, size.h, mode, tRef.current, imgRef.current, stateRef.current);
      if (now - lastPos > 250) {
        lastPos = now;
        setPos(tRef.current);
      }
      if (playing) raf = requestAnimationFrame(tick);
    };
    if (playing) raf = requestAnimationFrame(tick);
    else {
      // One still frame when paused; wait for the cover so it isn't blank.
      const still = () => size.w && draw(ctx, size.w, size.h, mode, tRef.current + 0.12, imgRef.current, stateRef.current);
      still();
      imgRef.current?.addEventListener("load", still, { once: true });
    }
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [mode, playing]);

  const style = RENDER_STYLES.find((s) => s.mode === mode);
  const played = Math.round((pos / LENGTH) * 72);

  return (
    <div className="lp-prev lp-render">
      <div className="lp-video" ref={frameRef}>
        <img className="lp-video-bg" src={COVER} alt="" aria-hidden="true" />
        <canvas ref={canvasRef} className="lp-video-canvas" role="img" aria-label={`Example render with the ${style.name} visualizer around the cover art`} />
        <span className="lp-video-badge smb-mono">16:9 · 1080p · Blurred art</span>
      </div>

      <div className="lp-viz-pick" role="radiogroup" aria-label="Visualizer style">
        {RENDER_STYLES.map((s) => (
          <button key={s.mode} type="button" role="radio" aria-checked={mode === s.mode} className={`lp-viz ${mode === s.mode ? "is-active" : ""}`} onClick={() => setMode(s.mode)}>
            <img src={`/visualizer-icons/${s.mode}.png`} alt="" aria-hidden="true" loading="lazy" draggable="false" />
            <span>
              {s.name}
              {s.pro ? <em className="lp-pro">Pro</em> : null}
            </span>
          </button>
        ))}
      </div>
      <p className="lp-viz-note">{RENDER_STYLES.length} of {STYLE_COUNT} visualizer styles. Each one moves with your beat.</p>

      <div className="lp-player">
        <button type="button" className="lp-play" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause the preview" : "Play the preview"}>
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </button>
        <span className="smb-mono lp-time">{fmt(pos)}</span>
        <div className="lp-wave" aria-hidden="true">
          {Array.from({ length: 72 }, (_, i) => (
            <i key={i} className={i < played ? "is-played" : ""} style={{ height: `${22 + 70 * Math.abs(Math.sin(i * 0.7) * Math.cos(i * 0.23))}%` }} />
          ))}
        </div>
        <span className="smb-mono lp-time">{fmt(LENGTH)}</span>
      </div>

      <div className="lp-prev-rows">
        <div><span>Title</span><b>ken carson type beat – “vamp”</b></div>
        <div><span>Tags</span><b>ken carson · 64 tags</b></div>
        <div><span>Visualizer</span><b>{style.name}</b></div>
        <div><span>Privacy</span><b>Public</b></div>
      </div>
    </div>
  );
}
