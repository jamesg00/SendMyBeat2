/*
 * Generates src/styles/tokens.css from the palette table below.
 * Palettes mirror mobile/src/theme.ts, except Ocean and Midnight, which are
 * reworked for the website. Run: node scripts/build-theme-tokens.js
 */
const fs = require("fs");
const path = require("path");

const base = {
  dark: true,
  sheen: "rgba(255,255,255,0.045)",
  shadow: "0 1px 0 rgba(255,255,255,0.04) inset, 0 12px 32px -18px rgba(0,0,0,0.9)",
};

const palettes = {
  console: {
    label: "Console", ...base,
    bg: "#000000", card: "#0A0A0A", card2: "#111111", line: "#262626", lineSoft: "#1F1F1F",
    text: "#EDEDED", t2: "#A1A1A1", t3: "#8F8F8F",
    pri: "#EDEDED", onpri: "#0A0A0A", priHi: "#FFFFFF", seg: "#1C1C1E", thumb: "#48484A",
    acc: "#2EE59D", onacc: "#03140C", acc2: "#9BF7D0", danger: "#FF6B6B", warn: "#F5A524", wave: "#3A3A3A",
    glow1: "rgba(255,255,255,0.07)", glow2: "rgba(46,229,157,0.07)",
  },
  light: {
    label: "Light", dark: false,
    bg: "#F5F5F7", card: "#FFFFFF", card2: "#E9E9EE", line: "rgba(0,0,0,0.09)", lineSoft: "rgba(0,0,0,0.063)",
    lineSolid: "#E1E1E5",
    text: "#1D1D1F", t2: "#55555B", t3: "#6A6A70",
    pri: "#0066D6", onpri: "#FFFFFF", priHi: "#2E86EA", seg: "rgba(0,0,0,0.06)", thumb: "#FFFFFF",
    acc: "#0066D6", onacc: "#FFFFFF", acc2: "#5AA9FF", danger: "#C9302C", warn: "#B26B00", wave: "rgba(0,0,0,0.16)",
    glow1: "rgba(0,102,214,0.09)", glow2: "rgba(255,166,92,0.10)",
    sheen: "rgba(255,255,255,0.7)",
    shadow: "0 1px 2px rgba(0,0,0,0.04), 0 12px 30px -20px rgba(20,30,60,0.35)",
  },
  graphite: {
    label: "Dark", ...base,
    bg: "#1C1C1E", card: "#2A2A2D", card2: "#38383C", line: "rgba(255,255,255,0.09)", lineSoft: "rgba(255,255,255,0.06)",
    lineSolid: "#3A3A3E",
    text: "#F2F2F4", t2: "#AEAEB4", t3: "#8E8E94",
    pri: "#F2F2F4", onpri: "#1C1C1E", priHi: "#FFFFFF", seg: "rgba(255,255,255,0.07)", thumb: "#545458",
    acc: "#0A84FF", onacc: "#FFFFFF", acc2: "#64B0FF", danger: "#FF6961", warn: "#FFB340", wave: "rgba(255,255,255,0.2)",
    glow1: "rgba(10,132,255,0.10)", glow2: "rgba(255,255,255,0.05)",
  },
  noir: {
    label: "Noir", ...base,
    bg: "#000000", card: "#0D0D0D", card2: "#1C1C1C", line: "#2A2A2A", lineSoft: "#1F1F1F",
    text: "#FFFFFF", t2: "#A8A8A8", t3: "#8A8A8A",
    pri: "#FFFFFF", onpri: "#000000", priHi: "#FFFFFF", seg: "#1C1C1C", thumb: "#3A3A3A",
    acc: "#FFFFFF", onacc: "#000000", acc2: "#CFCFCF", danger: "#FF6B6B", warn: "#F5A524", wave: "#3A3A3A",
    glow1: "rgba(255,255,255,0.08)", glow2: "rgba(255,255,255,0.04)",
  },
  paper: {
    label: "Paper", dark: false,
    bg: "#FFFFFF", card: "#F3F3F3", card2: "#E2E2E2", line: "rgba(0,0,0,0.10)", lineSoft: "rgba(0,0,0,0.06)",
    lineSolid: "#E0E0E0",
    text: "#000000", t2: "#4A4A4A", t3: "#666666",
    pri: "#000000", onpri: "#FFFFFF", priHi: "#2A2A2A", seg: "rgba(0,0,0,0.06)", thumb: "#FFFFFF",
    acc: "#000000", onacc: "#FFFFFF", acc2: "#444444", danger: "#C9302C", warn: "#B26B00", wave: "rgba(0,0,0,0.16)",
    glow1: "rgba(0,0,0,0.05)", glow2: "rgba(0,0,0,0.03)",
    sheen: "rgba(255,255,255,0.6)",
    shadow: "0 1px 2px rgba(0,0,0,0.05), 0 12px 30px -20px rgba(0,0,0,0.3)",
  },
  mint: {
    label: "Mint", ...base,
    bg: "#060D09", card: "#0B1510", card2: "#14231B", line: "rgba(200,255,225,0.09)", lineSoft: "rgba(200,255,225,0.06)",
    lineSolid: "#1C2E24",
    text: "#E7F2EC", t2: "#9DB8A9", t3: "#7F9A8B",
    pri: "#E7F2EC", onpri: "#06120B", priHi: "#FFFFFF", seg: "rgba(231,242,236,0.07)", thumb: "rgba(231,242,236,0.16)",
    acc: "#2EE59D", onacc: "#03140C", acc2: "#9BF7D0", danger: "#FF7B7B", warn: "#F0B860", wave: "rgba(231,242,236,0.2)",
    glow1: "rgba(46,229,157,0.12)", glow2: "rgba(255,255,255,0.04)",
  },
  midnight: {
    label: "Midnight", ...base,
    bg: "#0B0C15", card: "#121423", card2: "#1A1D31", line: "rgba(226,224,255,0.09)", lineSoft: "rgba(226,224,255,0.06)",
    lineSolid: "#23263D",
    text: "#ECEBF4", t2: "#A6A6BE", t3: "#8888A2",
    pri: "#F1E7D2", onpri: "#16130B", priHi: "#FFF9EC", seg: "rgba(236,235,244,0.07)", thumb: "rgba(241,231,210,0.16)",
    acc: "#9EB1FF", onacc: "#0D1233", acc2: "#CCD6FF", danger: "#FF8A8A", warn: "#F0C27A", wave: "rgba(236,235,244,0.2)",
    glow1: "rgba(76,88,168,0.30)", glow2: "rgba(241,205,150,0.10)",
    sheen: "rgba(226,224,255,0.05)",
    shadow: "0 1px 0 rgba(226,224,255,0.05) inset, 0 14px 36px -20px rgba(0,0,8,0.95)",
  },
  ocean: {
    label: "Ocean", ...base,
    bg: "#081316", card: "#0D1C20", card2: "#14282D", line: "rgba(214,240,235,0.10)", lineSoft: "rgba(214,240,235,0.07)",
    lineSolid: "#1D3237",
    text: "#E6EFED", t2: "#9DB5B1", t3: "#7E9793",
    pri: "#ECE5D8", onpri: "#0A1A1C", priHi: "#FFFCF5", seg: "rgba(230,239,237,0.07)", thumb: "rgba(236,229,216,0.17)",
    acc: "#62D6BD", onacc: "#03201A", acc2: "#B4EEDF", danger: "#FF7F72", warn: "#E9B872", wave: "rgba(230,239,237,0.2)",
    glow1: "rgba(46,128,124,0.34)", glow2: "rgba(233,196,150,0.09)",
    sheen: "rgba(214,240,235,0.05)",
    shadow: "0 1px 0 rgba(214,240,235,0.05) inset, 0 14px 36px -20px rgba(0,8,10,0.95)",
  },
  sunset: {
    label: "Sunset", ...base,
    bg: "#1F1311", card: "#2B1B17", card2: "#3C2620", line: "rgba(255,226,214,0.10)", lineSoft: "rgba(255,226,214,0.06)",
    lineSolid: "#46302A",
    text: "#F6ECE8", t2: "#C4ABA3", t3: "#A68E86",
    pri: "#F6ECE8", onpri: "#1F1311", priHi: "#FFFFFF", seg: "rgba(246,236,232,0.07)", thumb: "rgba(246,236,232,0.16)",
    acc: "#FF9F6B", onacc: "#2A1206", acc2: "#FFC9A8", danger: "#FF7B7B", warn: "#F5C46B", wave: "rgba(246,236,232,0.2)",
    glow1: "rgba(255,159,107,0.14)", glow2: "rgba(255,90,90,0.06)",
  },
  rose: {
    label: "Rose", ...base,
    bg: "#1F1218", card: "#2B1822", card2: "#3D2231", line: "rgba(255,220,236,0.10)", lineSoft: "rgba(255,220,236,0.06)",
    lineSolid: "#472B3A",
    text: "#F7EAF0", t2: "#C6A8B7", t3: "#A88A99",
    pri: "#F7EAF0", onpri: "#1F1218", priHi: "#FFFFFF", seg: "rgba(247,234,240,0.07)", thumb: "rgba(247,234,240,0.16)",
    acc: "#FF7EB6", onacc: "#2A0716", acc2: "#FFB8D7", danger: "#FF8080", warn: "#F5C46B", wave: "rgba(247,234,240,0.2)",
    glow1: "rgba(255,126,182,0.13)", glow2: "rgba(255,200,150,0.06)",
  },
};

const hexToRgb = (hex) => {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const parseColor = (c) => {
  if (c.startsWith("#")) return { rgb: hexToRgb(c), a: 1 };
  const m = c.match(/rgba?\(([^)]+)\)/);
  const parts = m[1].split(",").map((s) => parseFloat(s));
  return { rgb: parts.slice(0, 3), a: parts[3] ?? 1 };
};
// Flatten an alpha color over a background so shadcn gets an opaque HSL triplet.
const flatten = (c, bg) => {
  const { rgb, a } = parseColor(c);
  const b = parseColor(bg).rgb;
  return rgb.map((v, i) => Math.round(v * a + b[i] * (1 - a)));
};
const toHsl = ([r, g, b]) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return `${Math.round(h * 10) / 10} ${Math.round(s * 1000) / 10}% ${Math.round(l * 1000) / 10}%`;
};
const hsl = (c, bg) => toHsl(flatten(c, bg));
const alpha = (hex, a) => {
  const [r, g, b] = parseColor(hex).rgb;
  return `rgba(${r},${g},${b},${a})`;
};

const block = (p) => {
  const line = p.lineSolid || p.line;
  const v = {
    "color-scheme": p.dark ? "dark" : "light",
    "--c-bg": p.bg, "--c-card": p.card, "--c-card2": p.card2,
    "--c-line": p.line, "--c-line-soft": p.lineSoft,
    "--c-text": p.text, "--c-t2": p.t2, "--c-t3": p.t3,
    "--c-pri": p.pri, "--c-onpri": p.onpri, "--c-pri-hi": p.priHi,
    "--c-seg": p.seg, "--c-thumb": p.thumb,
    "--c-acc": p.acc, "--c-onacc": p.onacc, "--c-acc2": p.acc2,
    "--c-accsoft": alpha(p.acc, 0.13), "--c-accline": alpha(p.acc, 0.38),
    "--c-danger": p.danger, "--c-dangersoft": alpha(p.danger, 0.12),
    "--c-warn": p.warn, "--c-warnsoft": alpha(p.warn, 0.14), "--c-wave": p.wave,
    "--c-glow1": p.glow1, "--c-glow2": p.glow2, "--c-sheen": p.sheen, "--c-shadow": p.shadow,
    // shadcn/ui (HSL triplets)
    "--background": hsl(p.bg, p.bg), "--foreground": hsl(p.text, p.bg),
    "--card": hsl(p.card, p.bg), "--card-foreground": hsl(p.text, p.bg),
    "--popover": hsl(p.card, p.bg), "--popover-foreground": hsl(p.text, p.bg),
    "--primary": hsl(p.pri, p.bg), "--primary-foreground": hsl(p.onpri, p.bg),
    "--secondary": hsl(p.card2, p.bg), "--secondary-foreground": hsl(p.text, p.bg),
    "--muted": hsl(p.card2, p.bg), "--muted-foreground": hsl(p.t2, p.bg),
    "--accent": hsl(p.card2, p.bg), "--accent-foreground": hsl(p.text, p.bg),
    "--destructive": hsl(p.danger, p.bg), "--destructive-foreground": hsl(p.dark ? "#0A0A0A" : "#FFFFFF", p.bg),
    "--border": hsl(line, p.bg), "--input": hsl(line, p.bg), "--ring": hsl(p.t2, p.bg),
    // legacy variables still read by older components and inline styles
    "--bg-primary": p.bg, "--bg-secondary": p.card, "--bg-tertiary": p.card2,
    "--text-primary": p.text, "--text-secondary": p.t2,
    "--accent-primary": p.text, "--accent-secondary": p.acc,
    "--border-color": line, "--card-bg": p.card,
    "--shadow": "transparent", "--glow": "transparent",
  };
  return Object.entries(v).map(([k, val]) => `  ${k}: ${val} !important;`).join("\n");
};

let css = `/* Generated by scripts/build-theme-tokens.js. Edit the palettes there, not here. */\n`;
css += `/* Each palette is set on <html data-palette="...">. Console is the default. */\n\n`;
css += `:root,\nhtml[data-palette="console"] {\n${block(palettes.console)}\n}\n\n`;
for (const [id, p] of Object.entries(palettes)) {
  if (id === "console") continue;
  css += `html[data-palette="${id}"] {\n${block(p)}\n}\n\n`;
}
css += `:root {\n  --radius: 0.625rem;\n  --r-card: 12px;\n  --r-control: 10px;\n  --r-thumb: 8px;\n  --r-chip: 6px;\n`;
css += `  --ease: cubic-bezier(.2,.8,.2,1);\n  --t-fast: 180ms;\n  --t-med: 350ms;\n  --t-slow: 450ms;\n`;
css += `  --font-sans: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;\n`;
css += `  --font-display: "Space Grotesk", "Inter", ui-sans-serif, system-ui, sans-serif;\n`;
css += `  --font-mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;\n`;
css += `  --font-brand: "Karmatic Arcade", "IBM Plex Mono", monospace;\n}\n`;

fs.writeFileSync(path.join(__dirname, "..", "src", "styles", "tokens.css"), css);
module.exports = { palettes };
console.log("wrote tokens.css with", Object.keys(palettes).length, "palettes");
