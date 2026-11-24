import React, { useEffect, useRef, useState } from "react";
import AudioVisualizer from "@/lib/AudioVisualizer";
import { DEFAULT_VISUALIZER_SETTINGS, VISUALIZER_PRESETS, VISUALIZER_STYLES } from "@/lib/constants";
import { OfflineAnalyser, decodeBeat } from "@/lib/offlineAnalysis";
import { buildVisualizerOptions, designSizeFor, outputDimsFor } from "@/lib/visualizerOptions";
import { canExportOffline, exportVisualizerVideo } from "@/lib/visualizerExport";
import { buildBeatTrack } from "@/lib/viz2/track";

// The visualizer for the mobile app. The app opens this page in a WebView, so phones draw and
// render exactly what the website does: same styles, same beat analysis, same video export.
//
// The app talks to the page with injectJavaScript, calling window.__smbViz.receive(message):
//   { type: "audio", index, count, data }  one base64 chunk of the beat (decoded after the last)
//   { type: "cover", dataUrl }             the artwork
//   { type: "settings", settings, aspect, background, scale, rotation }
//   { type: "time", t, playing }           where the app's player is
//   { type: "bake", fps, token }           render the video and upload it with the user's token
//   { type: "cancel" }
// The page answers with window.ReactNativeWebView.postMessage(JSON):
//   ready, analysed, progress, baked, error.

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_API_BASE_URL;
const API = `${(BACKEND_URL || window.location.origin).replace(/\/$/, "")}/api`;

const send = (message) => {
  try {
    window.ReactNativeWebView?.postMessage(JSON.stringify(message));
  } catch {
    // not inside the app
  }
};

const BG = { black: "#000000", white: "#ffffff" };

/** Website settings from the app's few choices: the style's preset, then the app's colours. */
function settingsFrom(app = {}) {
  const style = VISUALIZER_STYLES.find((item) => item.mode === app.mode) || VISUALIZER_STYLES[0];
  return {
    ...DEFAULT_VISUALIZER_SETTINGS,
    ...(VISUALIZER_PRESETS[style.preset] || {}),
    mode: style.mode,
    ...(app.color ? { spectrumColor: app.color } : {}),
    ...(app.color2 ? { particleColor: app.color2 } : {}),
    ...(app.intensity ? { intensity: app.intensity } : {}),
    fillCenter: "image",
    fxZoomPulse: app.zoom ?? 0.4,
  };
}

/** Background and artwork, the way the server lays out a plain upload (artwork fit at 78% height). */
function paintBackdrop(ctx, w, h, cover, look) {
  ctx.fillStyle = BG[look.background] || "#000000";
  ctx.fillRect(0, 0, w, h);
  if (!cover || !cover.complete || !cover.naturalWidth) return;
  if (look.background === "blurred") {
    ctx.save();
    ctx.filter = `blur(${Math.round(Math.min(w, h) * 0.03)}px)`;
    const s = Math.max(w / cover.naturalWidth, h / cover.naturalHeight) * 1.1;
    ctx.drawImage(cover, (w - cover.naturalWidth * s) / 2, (h - cover.naturalHeight * s) / 2, cover.naturalWidth * s, cover.naturalHeight * s);
    ctx.restore();
  }
  const box = Math.min(w, h * 0.78) * (look.scale || 1);
  const s = Math.min(box / cover.naturalWidth, box / cover.naturalHeight);
  ctx.save();
  ctx.translate(w / 2, h / 2);
  if (look.rotation) ctx.rotate((look.rotation * Math.PI) / 180);
  ctx.drawImage(cover, (-cover.naturalWidth * s) / 2, (-cover.naturalHeight * s) / 2, cover.naturalWidth * s, cover.naturalHeight * s);
  ctx.restore();
}

export default function VizEmbed() {
  const backdropRef = useRef(null);
  const canvasRef = useRef(null);
  const store = useRef({
    chunks: [],
    beat: null,
    analysis: null,
    track: null,
    cover: null,
    look: { aspect: "16:9", background: "black", scale: 1, rotation: 0 },
    settings: settingsFrom(),
    clock: { t: 0, playing: false, at: 0 },
    viz: null,
    abort: null,
  });
  const [layoutKey, setLayoutKey] = useState(0);

  // Where the beat is now: the app's last report, moved on by the time since.
  const now = () => {
    const c = store.current.clock;
    return c.playing ? c.t + (performance.now() - c.at) / 1000 : c.t;
  };

  const redrawBackdrop = () => {
    const el = backdropRef.current;
    if (!el) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    el.width = Math.max(1, Math.floor(el.clientWidth * dpr));
    el.height = Math.max(1, Math.floor(el.clientHeight * dpr));
    paintBackdrop(el.getContext("2d"), el.width, el.height, store.current.cover, store.current.look);
  };

  const applySettings = () => {
    const st = store.current;
    const options = buildVisualizerOptions(st.settings, { imagePreviewUrl: st.cover?.src || "", centerVisualizerImageUrl: st.cover?.src || "" });
    if (!st.viz) st.viz = new AudioVisualizer(canvasRef.current, options);
    else st.viz.setOptions(options);
    const viz = st.viz;
    viz.setDesignSize(...designSizeFor(st.look.aspect));
    viz.onFrame = (v) => {
      const el = backdropRef.current;
      if (!el) return;
      const zoom = v.getZoom();
      el.style.transform = zoom > 1.0005 ? `scale(${zoom.toFixed(4)})` : "";
    };
    viz.setAnalysisProvider(
      st.analysis
        ? {
            fftSize: st.analysis.fftSize,
            sampleRate: st.analysis.sampleRate,
            fill: (out) => {
              if (!store.current.clock.playing) out.fill(0);
              else st.analysis.fillAtTime(now(), out);
            },
          }
        : null,
    );
    viz.setBeatProvider(
      st.track
        ? (A) => {
            if (store.current.clock.playing) {
              st.track.fillAtTime(now(), A);
              return true;
            }
            for (let i = 0; i < A.spec.length; i += 1) {
              A.spec[i] *= 0.9;
              A.specFast[i] *= 0.85;
            }
            A.kick *= 0.85;
            A.kickHit = false;
            A.snareHit = false;
            A.hatHit = false;
            A.live = false;
            return true;
          }
        : null,
    );
    requestAnimationFrame(() => {
      viz.resize();
      redrawBackdrop();
    });
    viz.start();
  };

  const analyse = async () => {
    const st = store.current;
    const bytes = Uint8Array.from(atob(st.chunks.join("")), (ch) => ch.charCodeAt(0));
    st.chunks = [];
    const beat = await decodeBeat(new File([bytes], "beat"));
    st.beat = beat;
    st.analysis = new OfflineAnalyser(beat);
    st.track = await buildBeatTrack(beat);
    applySettings();
    send({ type: "analysed", duration: beat.duration });
  };

  const bake = async ({ fps, token }) => {
    const st = store.current;
    if (!st.analysis || !st.track) throw new Error("The beat isn't ready yet.");
    if (!canExportOffline()) throw new Error("This phone can't render video here. Update iOS or Android System WebView, or render on sendmybeat.com.");
    st.abort?.abort();
    const abort = new AbortController();
    st.abort = abort;
    const size = outputDimsFor(st.look.aspect);
    const exportFps = Number(fps) === 60 ? 60 : 30;
    let lastSent = 0;
    const progress = (stage, value) => {
      const t = performance.now();
      if (value < 1 && t - lastSent < 250) return;
      lastSent = t;
      send({ type: "progress", stage, value });
    };
    const result = await exportVisualizerVideo({
      analyser: st.analysis.clone(),
      beatTrack: st.track,
      options: buildVisualizerOptions(st.settings, { imagePreviewUrl: st.cover?.src || "", centerVisualizerImageUrl: st.cover?.src || "" }),
      size,
      designSize: designSizeFor(st.look.aspect),
      fps: exportFps,
      duration: st.analysis.duration,
      drawBackdrop: (ctx, w, h) => paintBackdrop(ctx, w, h, st.cover, st.look),
      onProgress: (v) => progress("rendering", v),
      signal: abort.signal,
    });
    progress("uploading", 0);
    const form = new FormData();
    form.append("file", new File([result.blob], "visualizer.mp4", { type: "video/mp4" }));
    const res = await fetch(`${API}/upload/image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
      signal: abort.signal,
    });
    if (!res.ok) throw new Error(`The rendered video couldn't be uploaded (${res.status}).`);
    const data = await res.json();
    if (!data?.file_id) throw new Error("The rendered video couldn't be uploaded.");
    send({ type: "baked", fileId: data.file_id, fps: exportFps });
  };

  useEffect(() => {
    document.body.style.background = "#000";
    const receive = (message) => {
      const st = store.current;
      if (!message || typeof message !== "object") return;
      switch (message.type) {
        case "audio":
          if (message.index === 0) st.chunks = [];
          st.chunks.push(message.data);
          if (message.index === message.count - 1) {
            analyse().catch((error) => send({ type: "error", stage: "analyse", message: error?.message || "Couldn't read the beat." }));
          }
          break;
        case "cover": {
          const img = new Image();
          img.onload = () => {
            st.cover = img;
            applySettings();
          };
          img.src = message.dataUrl;
          break;
        }
        case "settings":
          st.settings = settingsFrom(message.settings);
          st.look = {
            aspect: message.aspect || st.look.aspect,
            background: message.background || st.look.background,
            scale: message.scale ?? st.look.scale,
            rotation: message.rotation ?? st.look.rotation,
          };
          setLayoutKey((k) => k + 1);
          applySettings();
          break;
        case "time":
          st.clock = { t: Number(message.t) || 0, playing: Boolean(message.playing), at: performance.now() };
          break;
        case "bake":
          bake(message).catch((error) => {
            if (error?.name === "AbortError") return;
            send({ type: "error", stage: "bake", message: error?.message || "The visualizer video couldn't be made." });
          });
          break;
        case "cancel":
          st.abort?.abort();
          break;
        default:
      }
    };
    window.__smbViz = { receive };
    send({ type: "ready", canExport: canExportOffline() });
    const onResize = () => {
      store.current.viz?.resize();
      redrawBackdrop();
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      delete window.__smbViz;
      store.current.viz?.destroy();
      store.current.abort?.abort();
    };
  }, []);

  const [aw, ah] = store.current.look.aspect.split(":").map(Number);
  return (
    <div data-layout={layoutKey} style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", background: "#000" }}>
      <div style={{ position: "relative", aspectRatio: `${aw} / ${ah}`, width: aw >= ah ? "100%" : "auto", height: aw >= ah ? "auto" : "100%", maxWidth: "100%", maxHeight: "100%", overflow: "hidden" }}>
        <canvas ref={backdropRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", transformOrigin: "50% 50%" }} />
        <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      </div>
    </div>
  );
}
