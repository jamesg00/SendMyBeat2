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
};

export const VISUALIZER_PRESETS = {
  // Ring around your logo with a star field flying out behind it.
  "ncs-clean": {
    mode: "circle",
    bars: 96,
    intensity: 0.9,
    particleEnabled: true,
    trailsEnabled: true,
    particleIntensity: 0.8,
    shakeIntensity: 0.12,
    radius: 0.2,
    maxBarLength: 0.2,
    multiColorReactive: false,
    spectrumStyle: "fill",
    fillCenter: "image",
    centerImageSpin: false,
    spectrumColor: "#ffffff",
    spectrumBorderEnabled: true,
    spectrumBorderColor: "#ffffff",
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
};
