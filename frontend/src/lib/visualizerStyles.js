// The visualizer styles (all except Monstercat and Spectrum, which live in AudioVisualizer).
// Each one draws a frame from the smoothed bars onto viz.ctx, in the design size (viz.viewW ×
// viz.viewH). They keep their own smoothing state on viz.styleState so switching style is clean.

const rgbOf = (text, fallback) => (text || fallback).split(",").map((v) => Number(v.trim())).join(", ");

const stateFor = (viz, key, length) => {
  if (!viz.styleState) viz.styleState = {};
  const state = viz.styleState[key];
  if (state && state.value.length === length) return state;
  viz.styleState[key] = { value: new Array(length).fill(0), trail: new Array(length).fill(0) };
  return viz.styleState[key];
};

/**
 * `count` bands from bass to highs, ready to draw:
 *  - skips the rumble below the kick and the dull top highs,
 *  - widens the gap between quiet and loud (`contrast`),
 *  - the first few bands take the strongest of their neighbours, so the bass end is one peak,
 *  - smoothed along the row and over time; `trail` jumps up with the value and sinks slowly.
 */
export function bands(viz, bars, count, key, { contrast = 1.6, gain = 1.15, attack = 0.6, release = 0.22, trailDecay = 0.955, passes = 2 } = {}) {
  const from = Math.floor(bars.length * 0.11);
  const to = Math.max(from + 8, Math.floor(bars.length * 0.78));
  const out = new Array(count);
  for (let i = 0; i < count; i += 1) {
    const pos = count === 1 ? from : from + (i / (count - 1)) * (to - 1 - from);
    out[i] = Math.pow(Math.max(0, viz.sampleArrayAt(bars, pos)), contrast) * gain;
  }
  let strongest = 0;
  for (let i = Math.min(count - 1, Math.max(1, Math.floor(count * 0.12))); i >= 0; i -= 1) {
    strongest = Math.max(strongest, out[i]);
    out[i] = strongest;
  }
  for (let pass = 0; pass < passes; pass += 1) {
    let prev = out[0];
    for (let i = 0; i < count; i += 1) {
      const next = out[Math.min(count - 1, i + 1)];
      const cur = out[i];
      out[i] = prev * 0.25 + cur * 0.5 + next * 0.25;
      prev = cur;
    }
  }
  const state = stateFor(viz, key, count);
  for (let i = 0; i < count; i += 1) {
    const prev = state.value[i];
    const target = Math.min(1.1, out[i]);
    const value = prev + (target - prev) * (target > prev ? attack : release);
    state.value[i] = value;
    state.trail[i] = Math.max(value, state.trail[i] * trailDecay);
  }
  return state;
}

const palette = (viz) => {
  const front = rgbOf(viz.options.spectrumColor, "255, 255, 255");
  const accent = rgbOf(viz.options.particleColor, "140, 200, 255");
  const multi = Boolean(viz.options.multiColorReactive);
  return {
    front,
    accent,
    multi,
    /** Solid colour for a band of loudness `amp` (rainbow mode maps loudness to colour). */
    color: (amp, alpha, useAccent = false) => (multi ? viz.getReactiveColor(amp, alpha, 1.18, true) : `rgba(${useAccent ? accent : front}, ${alpha})`),
  };
};

/** Closed smooth outline around the centre: radius + value × length, mirrored left and right. */
function ringPath(c, values, baseRadius, length) {
  const n = values.length;
  const points = [];
  for (let i = 0; i < n; i += 1) {
    const a = -Math.PI / 2 + ((i + 0.5) / n) * Math.PI;
    const r = baseRadius + values[i] * length;
    points.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  for (let i = n - 1; i >= 0; i -= 1) {
    const a = -Math.PI / 2 - ((i + 0.5) / n) * Math.PI;
    const r = baseRadius + values[i] * length;
    points.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  const total = points.length;
  const last = points[total - 1];
  const first = points[0];
  c.beginPath();
  c.moveTo((last[0] + first[0]) / 2, (last[1] + first[1]) / 2);
  for (let i = 0; i < total; i += 1) {
    const p0 = points[i];
    const p1 = points[(i + 1) % total];
    c.quadraticCurveTo(p0[0], p0[1], (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2);
  }
  c.closePath();
}

/** The disc in the middle of the ring styles: your image, a colour, or a hole showing the artwork. */
function centerDisc(viz, ring) {
  const c = viz.ctx;
  const modeRaw = String(viz.options.fillCenter || "color").toLowerCase();
  const mode = modeRaw === "white" ? "color" : modeRaw;
  const transparent = mode === "transparent";
  const image = mode === "image" || mode === "ncs";
  const inner = Math.max(6, ring);

  if (transparent) {
    c.save();
    c.globalCompositeOperation = "destination-out";
    c.beginPath();
    c.arc(0, 0, inner, 0, Math.PI * 2);
    c.fill();
    c.restore();
  } else {
    c.save();
    c.beginPath();
    c.arc(0, 0, inner, 0, Math.PI * 2);
    c.clip();
    const [cr, cg, cb] = (viz.options.fillCenterColor || "255, 255, 255").split(",").map((v) => Number(v.trim()));
    c.fillStyle = image ? "rgba(0, 0, 0, 1)" : `rgba(${cr}, ${cg}, ${cb}, 1)`;
    c.fillRect(-inner, -inner, inner * 2, inner * 2);
    const img = viz.centerImage;
    if (image && img && img.complete && img.naturalWidth > 0) {
      const scale = Math.max((inner * 2) / img.naturalWidth, (inner * 2) / img.naturalHeight); // cover the disc
      c.save();
      if (viz.options.centerImageSpin) c.rotate(viz.recordRotation);
      c.drawImage(img, (-img.naturalWidth * scale) / 2, (-img.naturalHeight * scale) / 2, img.naturalWidth * scale, img.naturalHeight * scale);
      c.restore();
    }
    c.restore();
  }
  if (viz.recordImage) viz.drawRecordDisc(inner);
  if (viz.options.spectrumBorderEnabled || transparent) {
    c.beginPath();
    c.strokeStyle = `rgba(${rgbOf(viz.options.spectrumBorderColor, "255, 255, 255")}, 0.95)`;
    c.lineWidth = transparent ? 2 : 3.5;
    c.arc(0, 0, inner, 0, Math.PI * 2);
    c.stroke();
  }
}

const ringRadius = (viz, radius) => radius * (1 + viz.bassSlew * 0.07 + viz.beatPulse * 0.05);
const loudness = (viz, values) => Math.min(1.6, values.reduce((acc, n) => acc + n, 0) / Math.max(1, values.length) + viz.beatPulse * 0.55 + viz.impactPulse * 0.7);

// ---- NCS: crisp bars radiating from the logo, over a soft halo that lingers after each hit.
export function drawNcsRing(viz, bars, cx, cy, radius) {
  const c = viz.ctx;
  const p = palette(viz);
  const n = Math.max(24, Math.min(72, Math.round((viz.options.bars || 96) * 0.6)));
  const state = bands(viz, bars, n, "ncs", { contrast: 1.7 });
  const ring = ringRadius(viz, radius);
  const maxLen = Math.min(viz.viewW, viz.viewH) * viz.runtime.maxBarLength;
  const loud = loudness(viz, state.value);

  c.save();
  c.translate(cx, cy);

  // halo
  c.globalCompositeOperation = "lighter";
  ringPath(c, state.trail, ring + 4, maxLen * 1.25);
  c.fillStyle = p.color(loud * 1.2, 0.2, true);
  c.fill();
  ringPath(c, state.trail, ring + 2, maxLen * 0.8);
  c.fillStyle = p.color(loud, 0.26, true);
  c.fill();

  // bars
  c.globalCompositeOperation = "source-over";
  c.lineCap = "round";
  c.lineWidth = Math.max(1.6, ((Math.PI * ring) / n) * 0.52);
  c.shadowBlur = 12 * viz.pixelScale;
  c.shadowColor = p.multi ? viz.getReactiveColor(loud, 0.9, 1.2, true) : `rgba(${p.accent}, 0.95)`;
  const start = ring + 5;
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < n; i += 1) {
      const a = -Math.PI / 2 + side * ((i + 0.5) / n) * Math.PI;
      const len = 2 + state.value[i] * maxLen;
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      c.strokeStyle = p.color(state.value[i] + viz.beatPulse * 0.4, 0.97);
      c.beginPath();
      c.moveTo(dx * start, dy * start);
      c.lineTo(dx * (start + len), dy * (start + len));
      c.stroke();
    }
  }
  c.shadowBlur = 0;

  centerDisc(viz, ring);
  c.restore();
}

// ---- Trap blob: filled shapes swelling around the logo, three layers deep.
export function drawBlob(viz, bars, cx, cy, radius) {
  const c = viz.ctx;
  const p = palette(viz);
  const state = bands(viz, bars, 48, "blob", { contrast: 2, passes: 3 });
  const ring = ringRadius(viz, radius);
  const maxLen = Math.min(viz.viewW, viz.viewH) * viz.runtime.maxBarLength * 1.15;
  const loud = loudness(viz, state.value);

  c.save();
  c.translate(cx, cy);
  c.globalCompositeOperation = "lighter";
  ringPath(c, state.trail, ring + 6, maxLen * 1.6);
  c.fillStyle = p.color(loud * 1.3, 0.2, true);
  c.fill();
  ringPath(c, state.trail, ring + 3, maxLen * 1.25);
  c.fillStyle = p.color(loud, 0.36, true);
  c.fill();
  c.globalCompositeOperation = "source-over";
  ringPath(c, state.value, ring + 1.5, maxLen);
  c.shadowBlur = 22 * viz.pixelScale;
  c.shadowColor = p.multi ? viz.getReactiveColor(loud, 0.9, 1.2, true) : `rgba(${p.accent}, 0.9)`;
  c.fillStyle = p.color(loud * 0.85, 0.96);
  c.fill();
  c.shadowBlur = 0;
  centerDisc(viz, ring * 0.97);
  c.restore();
}

// ---- Dot ring: each band is a ray of dots that lights up further out the louder it gets.
export function drawDotRing(viz, bars, cx, cy, radius) {
  const c = viz.ctx;
  const p = palette(viz);
  const n = 44;
  const state = bands(viz, bars, n, "dots", { contrast: 1.5 });
  const ring = ringRadius(viz, radius);
  const maxLen = Math.min(viz.viewW, viz.viewH) * viz.runtime.maxBarLength * 1.1;
  const gap = 7;
  const maxDots = Math.max(3, Math.floor(maxLen / gap));

  c.save();
  c.translate(cx, cy);
  c.shadowBlur = 8 * viz.pixelScale;
  c.shadowColor = `rgba(${p.accent}, 0.9)`;
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < n; i += 1) {
      const a = -Math.PI / 2 + side * ((i + 0.5) / n) * Math.PI;
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      const lit = state.value[i] * maxDots;
      const trail = state.trail[i] * maxDots;
      for (let d = 0; d < maxDots; d += 1) {
        const strength = d < lit ? 1 : d < trail ? 0.35 : d === 0 ? 0.25 : 0;
        if (!strength) break;
        const r = ring + 8 + d * gap;
        c.fillStyle = p.color(state.value[i] + d / maxDots, strength * (1 - (d / maxDots) * 0.45));
        c.beginPath();
        c.arc(dx * r, dy * r, 2.1 - (d / maxDots) * 0.7, 0, Math.PI * 2);
        c.fill();
      }
    }
  }
  c.shadowBlur = 0;
  centerDisc(viz, ring);
  c.restore();
}

/** Bands laid out across the width with the bass in the middle: index 0 is the centre. */
const mirroredSlots = (count) => {
  const slots = [];
  for (let i = count - 1; i >= 0; i -= 1) slots.push(i);
  for (let i = 0; i < count; i += 1) slots.push(i);
  return slots;
};

// ---- Proximity: thin glowing lines growing up and down from the centre line.
export function drawProximity(viz, bars, w, h) {
  const c = viz.ctx;
  const p = palette(viz);
  const half = Math.max(24, Math.min(80, Math.round((viz.options.bars || 128) * 0.5)));
  const state = bands(viz, bars, half, "proximity", { contrast: 1.5, release: 0.26 });
  const slots = mirroredSlots(half);
  const span = w * 0.7;
  const left = (w - span) / 2;
  const mid = h * 0.5;
  const maxHalf = h * 0.24;
  const slotW = span / slots.length;
  const barW = Math.max(1.2, Math.min(3, slotW * 0.42));

  c.save();
  c.lineCap = "round";
  c.lineWidth = barW;
  c.shadowBlur = 14 * viz.pixelScale;
  c.shadowColor = `rgba(${p.accent}, 0.95)`;
  slots.forEach((band, slot) => {
    const len = 1.5 + state.value[band] * maxHalf;
    const x = left + (slot + 0.5) * slotW;
    c.strokeStyle = p.color(state.value[band] + viz.beatPulse * 0.4, 0.97);
    c.beginPath();
    c.moveTo(x, mid - len);
    c.lineTo(x, mid + len);
    c.stroke();
  });
  c.shadowBlur = 0;
  c.restore();
}

// ---- Mirror bars: bars rising from the bottom edge and hanging from the top edge.
export function drawMirrorBars(viz, bars, w, h) {
  const c = viz.ctx;
  const p = palette(viz);
  const half = Math.max(24, Math.min(72, Math.round((viz.options.bars || 128) * 0.45)));
  const state = bands(viz, bars, half, "mirror", { contrast: 1.4 });
  const slots = mirroredSlots(half);
  const slotW = w / slots.length;
  const barW = Math.max(1.5, slotW - 2);
  const maxLen = h * 0.24;

  c.save();
  c.shadowBlur = 12 * viz.pixelScale;
  c.shadowColor = `rgba(${p.accent}, 0.9)`;
  slots.forEach((band, slot) => {
    const len = Math.max(2, state.value[band] * maxLen);
    const x = slot * slotW + (slotW - barW) / 2;
    c.fillStyle = p.color(state.value[band] + viz.beatPulse * 0.4, 0.94);
    c.fillRect(x, h - len, barW, len);
    c.fillRect(x, 0, barW, len);
  });
  c.shadowBlur = 0;
  c.restore();
}

// ---- Wave: glowing ribbons that ripple with the music, widest where the band is loudest.
export function drawWave(viz, bars, w, h) {
  const c = viz.ctx;
  const p = palette(viz);
  const half = 40;
  const state = bands(viz, bars, half, "wave", { contrast: 1.3, passes: 3, release: 0.3 });
  const slots = mirroredSlots(half);
  const mid = h * 0.52;
  const maxAmp = h * 0.2;
  viz.wavePhase = (viz.wavePhase || 0) + 0.035 + viz.energySlew * 0.05;
  const phase = viz.wavePhase;

  const ribbon = (scale, shift, alpha, width, useAccent) => {
    c.beginPath();
    for (let s = 0; s <= slots.length; s += 1) {
      const band = slots[Math.min(slots.length - 1, s)];
      const x = (s / slots.length) * w;
      // The band's loudness sets how tall the ripple is here; the sine makes it travel.
      const edge = Math.sin((s / slots.length) * Math.PI); // pinned at both screen edges
      const y = mid + Math.sin(s * 0.42 + phase * (1 + shift * 0.6) + shift * 2.1) * state.value[band] * maxAmp * scale * edge;
      if (s === 0) c.moveTo(x, y);
      else {
        const prevBand = slots[Math.min(slots.length - 1, s - 1)];
        const prevX = ((s - 1) / slots.length) * w;
        const prevEdge = Math.sin(((s - 1) / slots.length) * Math.PI);
        const prevY = mid + Math.sin((s - 1) * 0.42 + phase * (1 + shift * 0.6) + shift * 2.1) * state.value[prevBand] * maxAmp * scale * prevEdge;
        c.quadraticCurveTo(prevX, prevY, (prevX + x) / 2, (prevY + y) / 2);
      }
    }
    c.strokeStyle = p.color(0.6 + shift * 0.5, alpha, useAccent);
    c.lineWidth = width;
    c.stroke();
  };

  c.save();
  c.lineCap = "round";
  c.lineJoin = "round";
  c.globalCompositeOperation = "lighter";
  c.shadowBlur = 16 * viz.pixelScale;
  c.shadowColor = `rgba(${p.accent}, 0.9)`;
  ribbon(1.35, 2, 0.35, 2, true);
  ribbon(1.1, 1, 0.55, 2.4, true);
  c.globalCompositeOperation = "source-over";
  ribbon(1, 0, 0.97, 3, false);
  c.shadowBlur = 0;
  c.restore();
}

/** Which family a style belongs to: decides where particles come from and whether there's a logo. */
export const STYLE_KIND = {
  circle: "ring",
  blob: "ring",
  dots: "ring",
  spectrum: "line",
  proximity: "line",
  wave: "line",
  mirror: "edges",
  monstercat: "monstercat",
};
