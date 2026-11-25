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
//   { type: "settings", settings, aspect, background, scale, scaleX, scaleY, posX, posY, flipH, flipV, rotation }
//   { type: "logo", dataUrl }              a picture for the middle of the visualizer (null: use the artwork)
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

// The app's names for the look and effect controls, and the website setting each one sets.
const APP_KEYS = {
  center: "fillCenter",
  centerColor: "fillCenterColor",
  outline: "spectrumBorderEnabled",
  zoom: "fxZoomPulse",
  vignette: "fxVignette",
  flash: "fxFlash",
  stars: "particleEnabled",
  shake: "shakeIntensity",
  rainbow: "multiColorReactive",
  brightness: "backgroundOpacity",
  shadow: "vizShadow",
  glow: "vizGlow",
  opacity: "vizOpacity",
  thickness: "vizThickness",
  size: "vizSize",
};

/** Website settings from the app's choices: the style's preset, then whatever the app set. */
function settingsFrom(app = {}) {
  const style = VISUALIZER_STYLES.find((item) => item.mode === app.mode) || VISUALIZER_STYLES[0];
  const out = {
    ...DEFAULT_VISUALIZER_SETTINGS,
    ...(VISUALIZER_PRESETS[style.preset] || {}),
    mode: style.mode,
    ...(app.color ? { spectrumColor: app.color } : {}),
    ...(app.color2 ? { particleColor: app.color2 } : {}),
    ...(app.intensity ? { intensity: app.intensity } : {}),
    // App versions from before the look controls send none of them; they always had the artwork in the middle.
    fillCenter: "image",
    fxZoomPulse: 0.4,
  };
  for (const [key, setting] of Object.entries(APP_KEYS)) {
    if (app[key] !== undefined && app[key] !== null) out[setting] = app[key];
  }
  if (out.multiColorReactive) out.spectrumRgb = true;
  return out;
}

const num = (v, fallback) => (Number.isFinite(Number(v)) ? Number(v) : fallback);

/**
 * Background and artwork, the same way the website's Upload Studio renders a visualizer video and
 * the server lays out a plain upload: the artwork fits the whole frame, then it's scaled, moved
 * (in half-frames from the centre), rotated and flipped.
 */
function paintBackdrop(ctx, w, h, cover, look, opacity = 1) {
  const ready = cover && cover.complete && cover.naturalWidth;
  if (look.background === "blurred" && ready) {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, w, h);
    const s = Math.max(w / cover.naturalWidth, h / cover.naturalHeight) * 1.08;
    ctx.save();
    ctx.globalAlpha = 0.72;
    // 18px at 1080p, like the website, scaled to this canvas.
    ctx.filter = `blur(${Math.max(1, Math.round((18 * Math.min(w, h)) / 1080))}px)`;
    ctx.drawImage(cover, (w - cover.naturalWidth * s) / 2, (h - cover.naturalHeight * s) / 2, cover.naturalWidth * s, cover.naturalHeight * s);
    ctx.restore();
    ctx.filter = "none";
  } else {
    ctx.fillStyle = BG[look.background] || "#000000";
    ctx.fillRect(0, 0, w, h);
  }
  if (!ready) return;
  const fit = Math.min(w / cover.naturalWidth, h / cover.naturalHeight);
  const artW = cover.naturalWidth * fit * look.scaleX;
  const artH = cover.naturalHeight * fit * look.scaleY;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(w / 2 + look.posX * w * 0.5, h / 2 + look.posY * h * 0.5);
  if (look.rotation) ctx.rotate((look.rotation * Math.PI) / 180);
  ctx.scale(look.flipH ? -1 : 1, look.flipV ? -1 : 1);
  ctx.drawImage(cover, -artW / 2, -artH / 2, artW, artH);
  ctx.restore();
  ctx.globalAlpha = 1;
}

/** The layout from a settings message, keeping what it leaves out. */
function lookFrom(message, prev) {
  const scale = num(message.scale, null);
  return {
    aspect: message.aspect || prev.aspect,
    background: message.background || prev.background,
    scaleX: num(message.scaleX, scale ?? prev.scaleX),
    scaleY: num(message.scaleY, scale ?? prev.scaleY),
    posX: num(message.posX, prev.posX),
    posY: num(message.posY, prev.posY),
    rotation: num(message.rotation, prev.rotation),
    flipH: message.flipH ?? prev.flipH,
    flipV: message.flipV ?? prev.flipV,
  };
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
    logo: null,
    look: { aspect: "16:9", background: "black", scaleX: 1, scaleY: 1, posX: 0, posY: 0, rotation: 0, flipH: false, flipV: false },
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
    const st = store.current;
    paintBackdrop(el.getContext("2d"), el.width, el.height, st.cover, st.look, st.settings.backgroundOpacity ?? 1);
  };

  const applySettings = () => {
    const st = store.current;
    const options = buildVisualizerOptions(st.settings, { imagePreviewUrl: st.cover?.src || "", centerVisualizerImageUrl: st.logo || st.cover?.src || "" });
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
      options: buildVisualizerOptions(st.settings, { imagePreviewUrl: st.cover?.src || "", centerVisualizerImageUrl: st.logo || st.cover?.src || "" }),
      size,
      designSize: designSizeFor(st.look.aspect),
      fps: exportFps,
      duration: st.analysis.duration,
      drawBackdrop: (ctx, w, h) => paintBackdrop(ctx, w, h, st.cover, st.look, st.settings.backgroundOpacity ?? 1),
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
        case "logo":
          st.logo = typeof message.dataUrl === "string" && message.dataUrl.startsWith("data:image/") ? message.dataUrl : null;
          applySettings();
          break;
        case "settings": {
          const next = settingsFrom(message.settings);
          const look = lookFrom(message, st.look);
          const restyle = !st.viz || JSON.stringify(next) !== JSON.stringify(st.settings) || look.aspect !== st.look.aspect;
          st.settings = next;
          st.look = look;
          // Dragging the artwork only moves the backdrop; the visualizer is rebuilt when its look changes.
          if (restyle) {
            setLayoutKey((k) => k + 1);
            applySettings();
          } else {
            redrawBackdrop();
          }
          break;
        }
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
