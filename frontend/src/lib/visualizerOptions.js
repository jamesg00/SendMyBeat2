// One place that turns the Upload Studio visualizer settings into drawing options, used by the
// live preview and by the video export so the two can't drift apart.

export const OUTPUT_DIMS = {
  "16:9": [1920, 1080],
  "1:1": [1080, 1080],
  "9:16": [1080, 1920],
  "4:5": [1080, 1350],
};

export const outputDimsFor = (aspectRatio) => OUTPUT_DIMS[aspectRatio] || OUTPUT_DIMS["16:9"];

/** The visualizer is laid out at half the output size; the preview and the export scale that. */
export const designSizeFor = (aspectRatio) => {
  const [w, h] = outputDimsFor(aspectRatio);
  return [w / 2, h / 2];
};

export const hexToRgbString = (hex, fallback = "255, 255, 255") => {
  const clean = (hex || "").replace("#", "");
  if (clean.length !== 6) return fallback;
  const value = Number.parseInt(clean, 16);
  if (Number.isNaN(value)) return fallback;
  return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
};

export const buildVisualizerOptions = (s, { imagePreviewUrl = "", centerVisualizerImageUrl = "", spectrumRecordImageUrl = "" } = {}) => ({
  bars: s.bars,
  gain: s.intensity * 0.8,
  maxBarLength: s.maxBarLength,
  radius: s.radius,
  rotateSpeed: s.rotateSpeed,
  trailsEnabled: s.trailsEnabled,
  particleEnabled: s.particleEnabled,
  particleIntensity: s.particleIntensity,
  monstercatParticleEnabled: s.monstercatParticleEnabled,
  maxSpawnRate: Math.round(120 * s.particleIntensity),
  baseSpawnRate: Math.round(10 * Math.max(0.5, s.particleIntensity)),
  particleSpeed: 72 * s.particleIntensity,
  mode: s.mode,
  shakeIntensity: (s.shakeIntensity || 0) * 0.7,
  multiColorReactive: s.multiColorReactive,
  spectrumStyle: s.mode === "circle" ? "fill" : s.spectrumStyle,
  fillCenter: s.fillCenter,
  fillCenterColor: hexToRgbString(s.fillCenterColor, "255, 255, 255"),
  centerImageSpin: s.centerImageSpin,
  spectrumColor: hexToRgbString(s.spectrumColor, "255, 255, 255"),
  centerImageUrl: centerVisualizerImageUrl || imagePreviewUrl || "",
  particleColor: hexToRgbString(s.particleColor, "140, 200, 255"),
  spectrumBorderEnabled: s.mode === "circle" && s.fillCenter === "transparent" ? false : s.spectrumBorderEnabled,
  spectrumBorderWidth: 5,
  spectrumBorderColor: hexToRgbString(s.spectrumBorderColor, "255, 255, 255"),
  spectrumRecordImageUrl,
  monstercatYOffset: s.monstercatYOffset,
  monstercatSpacing: s.monstercatSpacing,
  monstercatParticleSpeed: s.monstercatParticleSpeed,
  monstercatParticleSize: s.monstercatParticleSize,
  monstercatParticleCount: s.monstercatParticleCount,
  monstercatGlow: s.monstercatGlow,
  lowSensitivity: s.lowSensitivity,
  midSensitivity: s.midSensitivity,
  highSensitivity: s.highSensitivity,
  monstercatSmoothing: s.monstercatSmoothing,
  spectrumBarThickness: s.spectrumBarThickness ?? 4,
  spectrumGlow: s.spectrumGlow ?? 20,
  spectrumOpacity: s.spectrumOpacity ?? 1.0,
  spectrumRgb: s.spectrumRgb ?? false,
  spectrumSmoothing: s.spectrumSmoothing ?? 0.3,
  spectrumMirror: s.spectrumMirror !== false,
  fxZoomPulse: s.fxZoomPulse ?? 0,
  fxFlash: Boolean(s.fxFlash),
  fxVignette: Boolean(s.fxVignette),
});
