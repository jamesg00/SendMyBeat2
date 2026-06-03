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
    description: "Smoother motion for GIFs, overlays, or when you want a standard video feel.",
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
};

export const VISUALIZER_PRESETS = {
  "ncs-clean": {
    mode: "circle",
    bars: 96,
    intensity: 0.82,
    particleIntensity: 0.3,
    shakeIntensity: 0.08,
    rotateSpeed: 0.0018,
    radius: 0.23,
    maxBarLength: 0.16,
    multiColorReactive: false,
    spectrumStyle: "fill",
    spectrumBorderColor: "#ffffff",
  },
  "ncs-aggressive": {
    mode: "circle",
    bars: 124,
    intensity: 1.12,
    particleIntensity: 0.85,
    shakeIntensity: 0.45,
    rotateSpeed: 0.0026,
    radius: 0.235,
    maxBarLength: 0.19,
    multiColorReactive: true,
    spectrumStyle: "fill",
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
