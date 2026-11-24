// The new visualizers: 13 premium styles (Plus and Pro plans) and the redrawn NCS, Monstercat, Spectrum and
// Proximity, which stay free. All of them draw from the beat engine's frame (engine.js).

import { STYLES, applyRuntime } from "./styles";

export const PREMIUM_MODES = [
  "ridgeline",
  "ring-ridges",
  "analyzer-dots",
  "dot-record",
  "dot-rings",
  "jelly-dots",
  "jelly",
  "waterfall",
  "dot-terrain",
  "terrain",
  "groove",
  "turntable",
  "terrain-sun",
];
const PREMIUM_SET = new Set(PREMIUM_MODES);

/** Styles with the cover (logo or artwork) in the middle. */
const COVER_SET = new Set(["ring-ridges", "dot-record", "dot-rings", "jelly-dots", "jelly", "groove", "turntable", "terrain-sun", "circle"]);

export const isV2Mode = (mode) => Object.prototype.hasOwnProperty.call(STYLES, mode);
export const isPremiumMode = (mode) => PREMIUM_SET.has(mode);
export const v2HasCover = (mode) => COVER_SET.has(mode);

/** "r, g, b" (the drawing options' colour format) to [r, g, b]. */
export const rgbArray = (text, fallback = null) => {
  if (!text) return fallback;
  const parts = String(text).split(",").map((v) => Number(v.trim()));
  return parts.length === 3 && parts.every((v) => Number.isFinite(v)) ? parts : fallback;
};

/** Draw one frame of a new style. `runtime` carries colours, cover and sizes (see applyRuntime). */
export function drawV2(ctx, mode, w, h, frame, state, dt, runtime) {
  applyRuntime(runtime);
  STYLES[mode].draw(ctx, w, h, frame, state, dt);
}
