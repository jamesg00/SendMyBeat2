export const AUDIO_EXTENSIONS = [".mp3", ".wav", ".m4a", ".flac", ".ogg"];
export const AUDIO_MIME_TYPES = ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/flac", "audio/ogg"];
export const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".heic", ".heif"];
export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "image/heic", "image/heif"];

/** YouTube render frame rate presets (must match backend YOUTUBE_RENDER_FPS_ALLOWED). */
export const VIDEO_RENDER_FPS_OPTIONS = [
  {
    value: "2",
    label: "2 fps — Fastest",
    description: "Best for static cover art. Uploads finish much faster (TunesToTube-style).",
  },
  {
    value: "30",
    label: "30 fps — Medium",
    description: "For GIFs, animation is cached up to 15 fps (faster upload); static images use full 30 fps.",
  },
  {
    value: "60",
    label: "60 fps — High quality",
    description: "Slowest encode; use for smooth animation or future visualizer exports.",
  },
];

export const DEFAULT_VIDEO_RENDER_FPS = "2";

export const DEFAULT_VISUALIZER_SETTINGS = {
  bars: 128,
  intensity: 1,
  particleIntensity: 1,
  monstercatParticleSpeed: 1,
  monstercatParticleSize: 1,
  monstercatParticleCount: 900,
  monstercatGlow: 15,
  monstercatSpacing: 2,
  rotateSpeed: 0.002,
  radius: 0.23,
  maxBarLength: 0.18,
  trailsEnabled: true,
  particleEnabled: true,
  monstercatParticleEnabled: false,
  mode: "circle",
  shakeIntensity: 1,
  multiColorReactive: false,
  backgroundOpacity: 1,
  spectrumStyle: "fill",
  fillCenter: "color",
  fillCenterColor: "#ffffff",
  centerImageSpin: true,
  spectrumColor: "#ffffff",
  particleColor: "#8cc8ff",
  spectrumBorderEnabled: true,
  spectrumBorderWidth: 5,
  spectrumBorderColor: "#ffffff",
  monstercatYOffset: 0,
  lowSensitivity: 1,
  midSensitivity: 1,
  highSensitivity: 1,
  monstercatSmoothing: 0.35,
  // Spectrum Analyzer settings
  spectrumBarThickness: 4,
  spectrumGlow: 20,
  spectrumOpacity: 1.0,
  spectrumRgb: false,
  spectrumSmoothing: 0.3,
  spectrumMirror: true,
  // Effects (any style)
  fxZoomPulse: 0,
  fxFlash: false,
  fxVignette: false,
};

export const VISUALIZER_PRESETS = {
  // Crisp bars around your logo with a soft halo and a star field flying out behind it.
  "ncs-clean": {
    mode: "circle",
    bars: 96,
    intensity: 0.95,
    particleEnabled: true,
    trailsEnabled: true,
    particleIntensity: 0.9,
    shakeIntensity: 0.1,
    radius: 0.19,
    maxBarLength: 0.17,
    multiColorReactive: false,
    spectrumStyle: "fill",
    fillCenter: "image",
    centerImageSpin: false,
    spectrumColor: "#ffffff",
    spectrumBorderEnabled: true,
    spectrumBorderColor: "#ffffff",
    fxZoomPulse: 0.5,
  },
  // Rounded bars from a centre line, with peak caps and a reflection.
  "spectrum-analyzer": {
    mode: "spectrum",
    bars: 128,
    intensity: 1.0,
    particleEnabled: true,
    trailsEnabled: true,
    particleIntensity: 0.45,
    spectrumBarThickness: 6,
    spectrumGlow: 16,
    spectrumOpacity: 1.0,
    spectrumRgb: false,
    spectrumSmoothing: 0.35,
    spectrumMirror: true,
    spectrumColor: "#ffffff",
    multiColorReactive: false,
  },
  "monstercat-tight": {
    mode: "monstercat",
    bars: 128,
    intensity: 0.9,
    multiColorReactive: false,
    monstercatSpacing: 1,
    monstercatYOffset: 0,
    monstercatGlow: 16,
    monstercatSmoothing: 0.42,
    monstercatParticleEnabled: true,
    monstercatParticleSpeed: 1,
    monstercatParticleSize: 1.1,
    monstercatParticleCount: 700,
  },
  // Filled shapes swelling around the logo, three layers deep.
  "trap-blob": {
    mode: "blob",
    bars: 96,
    intensity: 1.0,
    particleEnabled: true,
    trailsEnabled: true,
    particleIntensity: 0.7,
    shakeIntensity: 0.2,
    radius: 0.2,
    maxBarLength: 0.16,
    multiColorReactive: true,
    fillCenter: "image",
    centerImageSpin: false,
    spectrumBorderEnabled: true,
    spectrumBorderColor: "#ffffff",
    fxZoomPulse: 0.7,
    fxFlash: true,
  },
  // Thin glowing lines from a centre line.
  proximity: {
    mode: "proximity",
    bars: 128,
    intensity: 1.0,
    particleEnabled: true,
    trailsEnabled: true,
    particleIntensity: 0.8,
    shakeIntensity: 0,
    multiColorReactive: false,
    spectrumColor: "#ffffff",
    fxZoomPulse: 0.4,
    fxVignette: true,
  },
  // Rippling ribbons of light.
  wave: {
    mode: "wave",
    bars: 96,
    intensity: 1.0,
    particleEnabled: true,
    trailsEnabled: false,
    particleIntensity: 0.4,
    shakeIntensity: 0,
    multiColorReactive: false,
    spectrumColor: "#ffffff",
    fxVignette: true,
  },
  // Bars on the top and bottom edges, leaving the artwork clear.
  "mirror-bars": {
    mode: "mirror",
    bars: 128,
    intensity: 0.95,
    particleEnabled: false,
    shakeIntensity: 0,
    multiColorReactive: false,
    spectrumColor: "#ffffff",
    fxZoomPulse: 0.5,
  },
  // Rays of dots around the logo.
  "dot-ring": {
    mode: "dots",
    bars: 96,
    intensity: 1.0,
    particleEnabled: true,
    trailsEnabled: true,
    particleIntensity: 0.5,
    shakeIntensity: 0.05,
    radius: 0.19,
    maxBarLength: 0.2,
    multiColorReactive: false,
    fillCenter: "image",
    centerImageSpin: false,
    spectrumColor: "#ffffff",
    spectrumBorderEnabled: true,
    spectrumBorderColor: "#ffffff",
  },
};

// The 13 premium styles (paid plans: Plus, and Pro which is the max plan). Each starts in mint and blue with the logo in the middle.
const PRO_STYLE_LIST = [
  ["ridgeline", "Ridgeline", "Stacked lines of the spectrum"],
  ["ring-ridges", "Ring Ridges", "Spectrum rings around your logo"],
  ["analyzer-dots", "Analyzer Dots", "Columns of dots with falling peaks"],
  ["dot-record", "Dot Record", "A record of dots that spins"],
  ["dot-rings", "Dot Rings", "Rings of dots around your logo"],
  ["jelly-dots", "Jelly Dots", "A wobbling ring of dots"],
  ["jelly", "Jelly", "A soft ring that wobbles on the beat"],
  ["waterfall", "Waterfall", "The spectrum scrolling down"],
  ["dot-terrain", "Dot Terrain", "A field of dots in 3D"],
  ["terrain", "Terrain", "Mountains made of your beat"],
  ["groove", "Groove", "A record groove that ripples"],
  ["turntable", "Turntable", "A spinning deck with your logo"],
  ["terrain-sun", "Terrain Sun", "Mountains under a sun"],
];

for (const [mode] of PRO_STYLE_LIST) {
  VISUALIZER_PRESETS[`pro-${mode}`] = {
    mode,
    intensity: 1,
    spectrumColor: "#8bffd0",
    particleColor: "#4c8dff",
    fillCenter: "image",
    fillCenterColor: "#ffffff",
    spectrumBorderEnabled: true,
    particleEnabled: false,
    trailsEnabled: false,
    multiColorReactive: false,
    shakeIntensity: 0,
    fxFlash: false,
    centerImageSpin: false,
  };
}

/** Premium styles are for paying members (Plus or Pro). */
export const canUsePremiumVisualizers = (status) => Boolean(status?.is_subscribed);

// The styles shown in the Visualizer tab, in order. `preset` is applied when you pick one.
export const VISUALIZER_STYLES = [
  { mode: "circle", preset: "ncs-clean", name: "NCS", blurb: "Bars around your logo, with a soft afterimage" },
  { mode: "monstercat", preset: "monstercat-tight", name: "Monstercat", blurb: "Bars along the bottom with falling caps" },
  { mode: "spectrum", preset: "spectrum-analyzer", name: "Spectrum", blurb: "A clean line of the spectrum" },
  { mode: "proximity", preset: "proximity", name: "Proximity", blurb: "Lines that bend toward the beat" },
  { mode: "blob", preset: "trap-blob", name: "Trap", blurb: "Colour blob around your logo" },
  { mode: "wave", preset: "wave", name: "Wave", blurb: "Rippling ribbons" },
  { mode: "mirror", preset: "mirror-bars", name: "Mirror", blurb: "Bars top and bottom" },
  { mode: "dots", preset: "dot-ring", name: "Dots", blurb: "Rays of dots" },
  ...PRO_STYLE_LIST.map(([mode, name, blurb]) => ({ mode, preset: `pro-${mode}`, name, blurb, premium: true })),
];
