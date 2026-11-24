// Builds frontend/src/lib/viz2/styles.js from the prototype page, so the app draws exactly what
// the prototype shows. Run from the repo root after changing a style in the prototype:
//   node docs/visualizers/tools/build-viz2.mjs
// It copies the shared helpers and the chosen styles verbatim, then makes the few app changes
// listed in PATCHES (real cover art, user colours, Logo size and Reach for NCS).

import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const html = fs.readFileSync(path.join(root, "docs/visualizers/prototype.html"), "utf8");
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const src = scripts.sort((a, b) => b.length - a.length)[0];

// Mode id, tile name, prototype number, and whether it has the cover in the middle.
export const PICKS = [
  ["ridgeline", "Ridgeline", 11, false, true],
  ["ring-ridges", "Ring Ridges", 26, true, true],
  ["analyzer-dots", "Analyzer Dots", 27, false, true],
  ["dot-record", "Dot Record", 31, true, true],
  ["dot-rings", "Dot Rings", 32, true, true],
  ["jelly-dots", "Jelly Dots", 33, true, true],
  ["jelly", "Jelly", 34, true, true],
  ["waterfall", "Waterfall", 35, false, true],
  ["dot-terrain", "Dot Terrain", 36, false, true],
  ["terrain", "Terrain", 37, false, true],
  ["groove", "Groove", 38, true, true],
  ["turntable", "Turntable", 39, true, true],
  ["terrain-sun", "Terrain Sun", 40, true, true],
  ["circle", "NCS", 41, true, false],
  ["monstercat", "Monstercat", 42, false, false],
  ["spectrum", "Spectrum", 43, false, false],
  ["proximity", "Proximity", 44, false, false],
];

const between = (startMark, endMark) => {
  const i = src.indexOf(startMark);
  const j = src.indexOf(endMark, i + startMark.length);
  if (i < 0 || j < 0) throw new Error(`Missing section ${startMark}`);
  return src.slice(i, j);
};

function styleObject(n) {
  const at = src.indexOf(`      n: ${n}, name:`);
  if (at < 0) throw new Error(`Style ${n} not found`);
  let start = src.lastIndexOf("{", at);
  let depth = 0;
  for (let k = start; k < src.length; k += 1) {
    if (src[k] === "{") depth += 1;
    else if (src[k] === "}") {
      depth -= 1;
      if (depth === 0) return src.slice(start, k + 1);
    }
  }
  throw new Error(`Unbalanced style ${n}`);
}

const replaceOnce = (text, from, to, label) => {
  if (!text.includes(from)) throw new Error(`Patch failed: ${label}`);
  return text.replace(from, to);
};

let helpers = between("// ---------------------------------------------------------------- palette + helpers", "// ---------------------------------------------------------------- audio engine");
helpers = helpers.replace("const C = {", "export const C = {");
let r3 = between("// ---- shared pieces for round 3 on", "ROUNDS.push({");
let r4 = between("// ---- shared pieces for round 4", "ROUNDS.push({");
let r5 = between("// ---- round 5:", "ROUNDS.push({");

// The cover: the real logo or artwork (or the colour / see-through choice), not the placeholder.
const coverStart = r3.indexOf("/** Placeholder disc");
const coverEnd = r3.indexOf("/** Mint and blue only");
r3 = r3.slice(0, coverStart) + `/** The cover in the middle: the logo upload (or the beat artwork), a colour, or nothing. */
function coverDisc(c, cx, cy, r, k = 0) {
  if (r <= 0) return;
  if (COVER.fill !== "transparent") {
    c.save();
    c.beginPath(); c.arc(cx, cy, r, 0, TAU);
    c.fillStyle = COVER.fill === "color" ? rgba(COVER.color, 1) : rgba(C.ink, 0.94);
    c.fill();
    const img = COVER.image;
    if (COVER.fill === "image" && img && img.complete && img.naturalWidth > 0) {
      c.clip();
      const s = Math.max((r * 2) / img.naturalWidth, (r * 2) / img.naturalHeight);
      c.drawImage(img, cx - (img.naturalWidth * s) / 2, cy - (img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s);
    }
    c.restore();
  }
  if (COVER.ring) {
    c.strokeStyle = rgba(C.paper, 0.4 + k * 0.4); c.lineWidth = 1.25;
    c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.stroke();
  }
}
` + r3.slice(coverEnd);

// The free styles draw in the user's colour.
r5 = replaceOnce(r5, "const U = C.paper;", "let U = C.paper;", "U");

const PATCHES = {
  41: [
    ["ring = m * 0.19 * (1 + k * 0.04)", "ring = m * (OPTS.radius || 0.19) * (1 + k * 0.04)"],
    ["maxLen = m * 0.2;", "maxLen = m * (OPTS.reach || 0.2);"],
  ],
  39: [
    [
      "c.fillStyle = rgba(C.ink, 0.95); c.beginPath(); c.arc(0, 0, rin * 0.9 * sc, 0, TAU); c.fill();\n        c.strokeStyle = rgba(C.paper, 0.4 + k * 0.4); c.lineWidth = 1.25; c.stroke(); c.restore();",
      "coverDisc(c, 0, 0, rin * 0.9 * sc, k); c.restore();",
    ],
  ],
};

const styles = PICKS.map(([mode, , n]) => {
  let o = styleObject(n);
  for (const [from, to] of PATCHES[n] || []) o = replaceOnce(o, from, to, `style ${n}`);
  return `  ${JSON.stringify(mode)}: ${o.replace(/\n {4}/g, "\n  ")},`;
}).join("\n");

const out = `// GENERATED by docs/visualizers/tools/build-viz2.mjs from docs/visualizers/prototype.html.
// Change a style in the prototype, then rerun the script; don't edit this file by hand.
/* eslint-disable */

// Runtime knobs, set by applyRuntime() before each frame.
const COVER = { image: null, fill: "image", color: [255, 255, 255], ring: true };
const OPTS = { radius: 0.19, reach: 0.2 };
const DEFAULTS = { mint: [139, 255, 208], blue: [76, 141, 255], deep: [22, 46, 104], brand: [46, 229, 157] };

${helpers}
${r3}
${r4}
${r5}
export const STYLES = {
${styles}
};

/** Colours, cover and sizes for the next draw calls. */
export function applyRuntime({ primary, secondary, user, cover, fill, fillColor, ring, radius, reach } = {}) {
  C.mint = primary || DEFAULTS.mint;
  C.blue = secondary || DEFAULTS.blue;
  C.deep = secondary ? [secondary[0] * 0.3, secondary[1] * 0.33, secondary[2] * 0.41] : DEFAULTS.deep;
  C.brand = primary ? mix(primary, C.blue, 0.15) : DEFAULTS.brand;
  U = user || C.paper;
  COVER.image = cover || null;
  COVER.fill = fill || "image";
  COVER.color = fillColor || [255, 255, 255];
  COVER.ring = ring !== false;
  OPTS.radius = radius || 0.19;
  OPTS.reach = reach || 0.2;
}
`;

fs.writeFileSync(path.join(root, "frontend/src/lib/viz2/styles.js"), out);
console.log(`wrote frontend/src/lib/viz2/styles.js (${PICKS.length} styles, ${out.length} chars)`);
