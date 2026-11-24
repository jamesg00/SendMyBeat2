// Renders a transparent PNG of each prototype style after ~4.7 s of a synthetic 140 BPM beat.
// Usage: npm i @napi-rs/canvas; extract the prototype script to proto.js, then
//   node render-icons.js proto.js out-dir 11,26,27,31,32,33,34,35,36,37,38,39,40 icon 4.744
// Output is trimmed to the drawing with 4% padding. The repo copies were scaled to 480 px and quantized to 256 colours.
const fs = require('fs');
const { createCanvas, Path2D } = require('@napi-rs/canvas');
global.Path2D = Path2D;
global.document = { createElement: () => createCanvas(1, 1), getElementById: () => ({ value: 0.7 }) };
global.window = {};
let js = fs.readFileSync(process.argv[2], 'utf8').split('// ---------------------------------------------------------------- page wiring')[0];
const OUT = process.argv[3], picks = process.argv[4].split(',').map(Number), mode = process.argv[5] || 'icon';
eval(js + `
if (mode === 'icon') coverDisc = function (c, cx, cy, r, k = 0) {
  const g = c.createLinearGradient(cx - r, cy - r, cx + r, cy + r); g.addColorStop(0, 'rgb(28,34,36)'); g.addColorStop(1, 'rgb(14,17,18)');
  c.fillStyle = g; c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.fill();
  c.strokeStyle = rgba(C.paper, 0.45 + k * 0.3); c.lineWidth = Math.max(1.25, r * 0.03); c.stroke();
};
const styles = ROUNDS.flatMap(r => r.styles).filter(s => picks.includes(s.n));
const W = 640, H = 360, SC = 1.5, FPS = 60;
const rnd = rng(42);
for (const s of styles) {
  const cv = createCanvas(W * SC, H * SC), c = cv.getContext('2d');
  const S = { dpr: SC };
  const frames = Math.round(${process.argv[6] || 4.6} * FPS);
  for (let f = 0; f < frames; f++) {
    const t = f / FPS, beat = 60 / 140, ph = (t % beat) / beat, step8 = Math.floor(t / (beat / 2));
    A.t = t; A.dt = 1 / FPS; A.live = true;
    const kickEnv = Math.exp(-ph * 6), sn = Math.floor(t / beat) % 2 === 1 ? Math.exp(-ph * 9) : 0;
    for (let b = 0; b < NB; b++) {
      const x = b / NB;
      let v = 0.78 * Math.exp(-Math.pow((x - 0.1) / 0.09, 2)) * (0.45 + 0.55 * kickEnv)
        + 0.5 * Math.exp(-Math.pow((x - 0.42) / 0.16, 2)) * (0.55 + 0.45 * sn + 0.2 * Math.sin(t * 3 + b * 0.7))
        + 0.32 * Math.exp(-Math.pow((x - 0.78) / 0.12, 2)) * (0.6 + 0.4 * rnd());
      v += 0.38 * Math.exp(-Math.pow((x - (0.3 + 0.25 * Math.sin(t * 0.9))) / 0.05, 2));
      v = clamp(v * 1.25 + 0.05 * rnd());
      A.spec[b] += (v - A.spec[b]) * 0.5; A.specFast[b] = Math.max(v, A.specFast[b] * 0.8);
    }
    for (let i = 0; i < 2048; i++) A.wave[i] = 0.5 * kickEnv * Math.sin(i / 2048 * 6.28 * 3 + t) + 0.18 * Math.sin(i / 7.3 + t * 5) + 0.06 * (rnd() - 0.5);
    const kh = ph < 1 / (beat * FPS); A.kickHit = kh; A.kickStrength = 0.9; A.kick = kickEnv;
    A.snareHit = kh && Math.floor(t / beat) % 2 === 1; A.snareStrength = 0.7;
    A.hatHit = (t % (beat / 2)) < 1 / FPS; A.hatStrength = 0.5;
    A.low = kickEnv; A.mid = 0.5; A.high = 0.4; A.energy = 0.4;
    c.setTransform(SC, 0, 0, SC, 0, 0); c.clearRect(0, 0, W, H);
    s.draw(c, W, H, A, S, 1 / FPS);
  }
  const name = String(s.n) + '-' + s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.png';
  // trim transparent margins, keep 4% padding
  const id = c.getImageData(0, 0, cv.width, cv.height).data; let x0 = cv.width, y0 = cv.height, x1 = 0, y1 = 0;
  for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) if (id[(y * cv.width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.04); x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(cv.width - 1, x1 + pad); y1 = Math.min(cv.height - 1, y1 + pad);
  const out = createCanvas(x1 - x0 + 1, y1 - y0 + 1); out.getContext('2d').drawImage(cv, -x0, -y0);
  fs.writeFileSync(OUT + '/' + name, out.toBuffer('image/png'));
  console.log('wrote', name);
}
`);
