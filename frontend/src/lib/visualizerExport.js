import { ArrayBufferTarget, Muxer } from "mp4-muxer";
import AudioVisualizer from "@/lib/AudioVisualizer";
import { ANALYSIS_STEP_HZ } from "@/lib/offlineAnalysis";
import { visualizerBitrate } from "@/lib/visualizerUpload";

// Renders the visualizer video frame by frame, for the whole song, at the exact output size and
// frame rate, and encodes it with the browser's own video encoder. Nothing is recorded from the
// screen: frame N is drawn for time N / fps from the decoded beat, so the result is in sync, never
// drops frames, and doesn't depend on the tab being visible or on how fast the computer is.

const SIM_HZ = ANALYSIS_STEP_HZ; // the drawing code advances in 1/60 s steps

/** Can this browser encode video itself? (Chrome, Edge, Safari 16.4+, Firefox 130+.) */
export const canExportOffline = () => typeof window !== "undefined" && "VideoEncoder" in window && "VideoFrame" in window;

const waitForImage = (img) =>
  !img || (img.complete && img.naturalWidth > 0)
    ? Promise.resolve()
    : new Promise((resolve) => {
        img.addEventListener("load", resolve, { once: true });
        img.addEventListener("error", resolve, { once: true });
      });

/** Pick a codec the browser can encode at this size: H.264 first, then VP9. */
async function pickEncoderConfig(width, height, fps, bitrate) {
  const candidates = [
    { muxer: "avc", codec: fps > 30 ? "avc1.64002a" : "avc1.640028", avc: { format: "avc" } }, // High profile
    { muxer: "avc", codec: fps > 30 ? "avc1.4d002a" : "avc1.4d0028", avc: { format: "avc" } }, // Main profile
    { muxer: "vp9", codec: "vp09.00.40.08" },
  ];
  for (const candidate of candidates) {
    const { muxer, ...rest } = candidate;
    const config = { ...rest, width, height, framerate: fps, bitrate, bitrateMode: "variable", latencyMode: "quality" };
    try {
      const support = await window.VideoEncoder.isConfigSupported(config);
      if (support?.supported) return { muxerCodec: muxer, config };
    } catch {
      // try the next one
    }
  }
  return null;
}

/**
 * @param {object} job
 * @param {import("./offlineAnalysis").OfflineAnalyser} job.analyser  analysis of the decoded beat
 * @param {import("./viz2/track").BeatTrack} [job.beatTrack]  beat-engine frames for the new styles
 * @param {object} job.options        drawing options (buildVisualizerOptions)
 * @param {[number, number]} job.size       output size in pixels
 * @param {[number, number]} job.designSize layout size the visualizer is designed in
 * @param {number} job.fps            30 or 60
 * @param {number} job.duration       seconds of video to produce
 * @param {(ctx: CanvasRenderingContext2D, w: number, h: number) => void} job.drawBackdrop
 *        draws everything behind the visualizer (background + artwork); called once
 * @param {(fraction: number) => void} [job.onProgress]
 * @param {AbortSignal} [job.signal]
 * @returns {Promise<{ blob: Blob, frames: number, fps: number, width: number, height: number, codec: string, seconds: number }>}
 */
export async function exportVisualizerVideo({ analyser, beatTrack, options, size, designSize, fps, duration, drawBackdrop, onProgress, signal }) {
  if (!canExportOffline()) throw new Error("This browser can't encode video.");
  const [width, height] = size;
  const totalFrames = Math.max(1, Math.ceil(duration * fps));
  const stepsPerFrame = Math.max(1, Math.round(SIM_HZ / fps));

  // Bitrate: plenty for bars over a still picture, and capped so a long beat stays under the
  // server's 200 MB upload limit.
  const bitrate = visualizerBitrate(fps, duration);
  const picked = await pickEncoderConfig(width, height, fps, bitrate);
  if (!picked) throw new Error("No video encoder is available for this size.");

  // Static layer: drawn once, reused for every frame.
  const backdrop = document.createElement("canvas");
  backdrop.width = width;
  backdrop.height = height;
  drawBackdrop(backdrop.getContext("2d"), width, height);

  // The visualizer draws into its own canvas at the exact output size.
  const vizCanvas = document.createElement("canvas");
  const viz = new AudioVisualizer(vizCanvas, options);
  viz.setDesignSize(designSize[0], designSize[1]);
  viz.setOutputSize(width, height);
  let step = 0;
  viz.setAnalysisProvider({
    fftSize: analyser.fftSize,
    sampleRate: analyser.sampleRate,
    fill: (out) => analyser.fillStep(step, out),
  });
  if (beatTrack) viz.setBeatProvider((A) => beatTrack.fillStep(step, A));
  await Promise.all([waitForImage(viz.centerImage), waitForImage(viz.recordImage)]);

  const composite = document.createElement("canvas");
  composite.width = width;
  composite.height = height;
  const ctx = composite.getContext("2d", { alpha: false });

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({ target, video: { codec: picked.muxerCodec, width, height, frameRate: fps }, fastStart: "in-memory" });
  let encodeError = null;
  const encoder = new window.VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (error) => {
      encodeError = error;
    },
  });
  encoder.configure(picked.config);

  const started = performance.now();
  const frameDuration = 1_000_000 / fps;
  try {
    for (let frame = 0; frame < totalFrames; frame += 1) {
      if (signal?.aborted) throw new DOMException("Export cancelled", "AbortError");
      if (encodeError) throw encodeError;

      for (let s = 0; s < stepsPerFrame; s += 1) {
        viz.renderFrame(1 / SIM_HZ);
        step += 1;
      }
      const zoom = viz.getZoom();
      if (zoom > 1.0005) {
        // Artwork zoom on the kick: scale the whole backdrop about the centre of the frame.
        const zw = width * zoom;
        const zh = height * zoom;
        ctx.drawImage(backdrop, (width - zw) / 2, (height - zh) / 2, zw, zh);
      } else {
        ctx.drawImage(backdrop, 0, 0);
      }
      ctx.drawImage(vizCanvas, 0, 0);

      const videoFrame = new window.VideoFrame(composite, { timestamp: Math.round(frame * frameDuration), duration: Math.round(frameDuration) });
      encoder.encode(videoFrame, { keyFrame: frame % (fps * 2) === 0 });
      videoFrame.close();

      // Don't let frames pile up in the encoder, and let the page breathe so progress can show.
      if (encoder.encodeQueueSize > 6 || frame % 15 === 0) {
        onProgress?.(frame / totalFrames);
        await new Promise((resolve) => setTimeout(resolve, 0));
        while (encoder.encodeQueueSize > 6) {
          await new Promise((resolve) => setTimeout(resolve, 4));
        }
      }
    }
    await encoder.flush();
    if (encodeError) throw encodeError;
    muxer.finalize();
  } finally {
    try {
      if (encoder.state !== "closed") encoder.close();
    } catch {
      // already closed
    }
    viz.destroy();
  }
  onProgress?.(1);
  return {
    blob: new Blob([target.buffer], { type: "video/mp4" }),
    frames: totalFrames,
    fps,
    width,
    height,
    codec: picked.config.codec,
    seconds: (performance.now() - started) / 1000,
  };
}
