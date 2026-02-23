import React, { useEffect, useRef } from "react";
import AudioVisualizer from "@/lib/AudioVisualizer";

const VisualizerCanvas = ({
  visualizerRef,
  audioPlayerRef,
  visualizerEnabled,
  visualizerSettings,
  studioOpen,
  previewDims,
  audioPreviewUrl,
  imagePreviewUrl,
  centerVisualizerImageUrl,
  spectrumRecordImageUrl
}) => {
  const visualizerCanvasRef = useRef(null);

  const hexToRgbString = (hex, fallback = "255, 255, 255") => {
    const clean = (hex || "").replace("#", "");
    if (clean.length !== 6) return fallback;
    const value = Number.parseInt(clean, 16);
    if (Number.isNaN(value)) return fallback;
    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;
    return `${r}, ${g}, ${b}`;
  };

  useEffect(() => {
    const canvas = visualizerCanvasRef.current;
    const audioEl = audioPlayerRef.current;

    // Helper to get options (defined inside effect to capture current props)
    const getVisualizerOptions = () => ({
      bars: visualizerSettings.bars,
      gain: visualizerSettings.intensity * 0.8,
      maxBarLength: visualizerSettings.maxBarLength,
      radius: visualizerSettings.radius,
      rotateSpeed: visualizerSettings.rotateSpeed,
      trailsEnabled: visualizerSettings.trailsEnabled,
      particleEnabled: visualizerSettings.particleEnabled,
      particleIntensity: visualizerSettings.particleIntensity,
      monstercatParticleEnabled: visualizerSettings.monstercatParticleEnabled,
      maxSpawnRate: Math.round(120 * visualizerSettings.particleIntensity),
      baseSpawnRate: Math.round(10 * Math.max(0.5, visualizerSettings.particleIntensity)),
      particleSpeed: 72 * visualizerSettings.particleIntensity,
      mode: visualizerSettings.mode,
      shakeIntensity: visualizerSettings.shakeIntensity * 0.7,
      multiColorReactive: visualizerSettings.multiColorReactive,
      spectrumStyle: visualizerSettings.mode === "circle" ? "fill" : visualizerSettings.spectrumStyle,
      fillCenter: visualizerSettings.fillCenter,
      fillCenterColor: hexToRgbString(visualizerSettings.fillCenterColor, "255, 255, 255"),
      centerImageSpin: visualizerSettings.centerImageSpin,
      spectrumColor: hexToRgbString(visualizerSettings.spectrumColor, "255, 255, 255"),
      centerImageUrl: centerVisualizerImageUrl || imagePreviewUrl || "",
      particleColor: hexToRgbString(visualizerSettings.particleColor, "140, 200, 255"),
      spectrumBorderEnabled:
        visualizerSettings.mode === "circle" && visualizerSettings.fillCenter === "transparent"
          ? false
          : visualizerSettings.spectrumBorderEnabled,
      spectrumBorderWidth: 5,
      spectrumBorderColor: hexToRgbString(visualizerSettings.spectrumBorderColor, "255, 255, 255"),
      spectrumRecordImageUrl,
      monstercatYOffset: visualizerSettings.monstercatYOffset,
      monstercatSpacing: visualizerSettings.monstercatSpacing,
      monstercatParticleSpeed: visualizerSettings.monstercatParticleSpeed,
      monstercatParticleSize: visualizerSettings.monstercatParticleSize,
      monstercatParticleCount: visualizerSettings.monstercatParticleCount,
      monstercatGlow: visualizerSettings.monstercatGlow,
      lowSensitivity: visualizerSettings.lowSensitivity,
      midSensitivity: visualizerSettings.midSensitivity,
      highSensitivity: visualizerSettings.highSensitivity,
      monstercatSmoothing: visualizerSettings.monstercatSmoothing,
    });

    if (!canvas || !audioEl || !visualizerEnabled) {
      if (visualizerRef.current) {
        visualizerRef.current.stop();
        const ctx = canvas?.getContext("2d");
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const options = getVisualizerOptions();

    if (!visualizerRef.current) {
      visualizerRef.current = new AudioVisualizer(canvas, options);
    } else {
      visualizerRef.current.attachCanvas(canvas);
      visualizerRef.current.setOptions(options);
    }
    visualizerRef.current.resize();
    requestAnimationFrame(() => visualizerRef.current?.resize());

    const initViz = async () => {
      try {
        await visualizerRef.current.connectMediaElement(audioEl);
        if (!audioEl.paused && !audioEl.ended) {
          await visualizerRef.current.resumeAudioContext();
          visualizerRef.current.start();
        }
      } catch (err) { console.error(err); }
    };
    initViz();

  }, [
    visualizerEnabled,
    audioPreviewUrl,
    imagePreviewUrl,
    centerVisualizerImageUrl,
    spectrumRecordImageUrl,
    visualizerSettings,
    studioOpen,
    previewDims,
    visualizerRef,
    audioPlayerRef
  ]);

  return (
    <canvas ref={visualizerCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
  );
};

export default VisualizerCanvas;
