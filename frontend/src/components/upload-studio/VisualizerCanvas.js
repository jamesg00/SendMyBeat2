import React, { useEffect, useRef } from "react";
import AudioVisualizer from "@/lib/AudioVisualizer";
import { buildVisualizerOptions, designSizeFor } from "@/lib/visualizerOptions";

// The live visualizer over the preview. It draws in the same design size and reads the same
// analysis of the decoded beat as the video export, so what you see is what gets rendered.
// Until the beat is decoded (or if decoding fails) it falls back to the live audio analyser.

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
  spectrumRecordImageUrl,
  analysis = null,
  beatTrack = null,
  aspectRatio = "16:9",
  backdropRef = null,
}) => {
  const visualizerCanvasRef = useRef(null);

  useEffect(() => {
    const canvas = visualizerCanvasRef.current;
    const audioEl = audioPlayerRef.current;

    if (!canvas || !audioEl || !visualizerEnabled) {
      if (backdropRef?.current) backdropRef.current.style.transform = "";
      if (visualizerRef.current) {
        visualizerRef.current.onFrame = null;
        visualizerRef.current.stop();
        const ctx = canvas?.getContext("2d");
        if (ctx) {
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.restore();
        }
      }
      return;
    }

    const options = buildVisualizerOptions(visualizerSettings, { imagePreviewUrl, centerVisualizerImageUrl, spectrumRecordImageUrl });

    if (!visualizerRef.current) {
      visualizerRef.current = new AudioVisualizer(canvas, options);
    } else {
      visualizerRef.current.attachCanvas(canvas);
      visualizerRef.current.setOptions(options);
    }
    const viz = visualizerRef.current;
    viz.setDesignSize(...designSizeFor(aspectRatio));
    // The artwork zooms a little on each kick (same amount the export uses).
    viz.onFrame = (v) => {
      const el = backdropRef?.current;
      if (!el) return;
      const zoom = v.getZoom();
      el.style.transform = zoom > 1.0005 ? `scale(${zoom.toFixed(4)})` : "";
    };
    requestAnimationFrame(() => visualizerRef.current?.resize());

    // The new styles read the beat engine's frames for wherever the player is. Paused, the
    // levels fall away instead of freezing, and nothing fires.
    viz.setBeatProvider(
      beatTrack
        ? (A) => {
            const player = audioPlayerRef.current;
            if (player && !player.paused && !player.ended) {
              beatTrack.fillAtTime(player.currentTime, A);
              return true;
            }
            for (let i = 0; i < A.spec.length; i += 1) {
              A.spec[i] *= 0.9;
              A.specFast[i] *= 0.85;
            }
            A.low *= 0.9;
            A.mid *= 0.9;
            A.high *= 0.9;
            A.energy *= 0.9;
            A.kick *= 0.85;
            A.snare *= 0.85;
            A.hat *= 0.85;
            A.kickHit = false;
            A.snareHit = false;
            A.hatHit = false;
            A.live = false;
            return true;
          }
        : null,
    );

    if (analysis) {
      // Read the spectrum for wherever the player is right now. Paused = silence.
      viz.setAnalysisProvider({
        fftSize: analysis.fftSize,
        sampleRate: analysis.sampleRate,
        fill: (out) => {
          const player = audioPlayerRef.current;
          if (!player || player.paused || player.ended) out.fill(0);
          else analysis.fillAtTime(player.currentTime, out);
        },
      });
      if (!audioEl.paused && !audioEl.ended) viz.start();
      return;
    }

    viz.setAnalysisProvider(null);
    const initViz = async () => {
      try {
        await viz.connectMediaElement(audioEl);
        if (!audioEl.paused && !audioEl.ended) {
          await viz.resumeAudioContext();
          viz.start();
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
    audioPlayerRef,
    analysis,
    beatTrack,
    aspectRatio,
    backdropRef,
  ]);

  return (
    <canvas ref={visualizerCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
  );
};

export default VisualizerCanvas;
