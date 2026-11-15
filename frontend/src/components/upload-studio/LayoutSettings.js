import React from "react";
import { Film } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEFAULT_VIDEO_RENDER_FPS, VIDEO_RENDER_FPS_OPTIONS } from "@/lib/constants";
import StudioSection, { StudioSwitch } from "@/components/upload-studio/StudioSection";

// Video: the frame shape, frame rate, background behind the artwork, and the watermark.

const ASPECTS = [
  { value: "16:9", label: "YouTube", w: 32, h: 18 },
  { value: "9:16", label: "Shorts", w: 14, h: 24 },
  { value: "1:1", label: "Square", w: 22, h: 22 },
  { value: "4:5", label: "Portrait", w: 19, h: 24 },
];
const BACKGROUNDS = [
  { value: "black", label: "Black" },
  { value: "white", label: "White" },
  { value: "blurred", label: "Blurred art" },
];

const LayoutSettings = ({
  videoAspectRatio,
  setVideoAspectRatio,
  backgroundColor,
  setBackgroundColor,
  removeWatermark,
  setRemoveWatermark,
  videoRenderFps,
  setVideoRenderFps,
  visualizerEnabled = false,
  isAnimatedVisual = false,
  subscriptionStatus,
  onUpgrade,
  imagePreviewUrl,
}) => {
  const isPaid = Boolean(subscriptionStatus?.is_subscribed);
  const selectedFpsOption = VIDEO_RENDER_FPS_OPTIONS.find((option) => option.value === String(videoRenderFps)) || VIDEO_RENDER_FPS_OPTIONS[0];
  const aspect = ASPECTS.find((a) => a.value === videoAspectRatio) || ASPECTS[0];

  const toggleWatermark = (next) => {
    if (!isPaid && next) {
      onUpgrade?.();
      return;
    }
    setRemoveWatermark(next);
  };

  let note = null;
  if (isAnimatedVisual && String(videoRenderFps) === "2") note = { tone: "warn", text: "Animated artwork at 2 fps will look choppy. Use 30 fps for smooth motion." };
  else if (visualizerEnabled) note = { tone: "acc", text: "The visualizer is recorded into the video. Use 30 or 60 fps so it moves smoothly." };
  else if (!isAnimatedVisual && ["30", "60"].includes(String(videoRenderFps))) note = { tone: "warn", text: "Still artwork looks the same at 2 fps and uploads much faster. Higher rates are for GIFs and visualizers." };

  return (
    <StudioSection icon={Film} tone="amber" title="Video" summary={`${aspect.value} ${aspect.label} · ${selectedFpsOption.label.split(" ")[0]} fps · ${BACKGROUNDS.find((b) => b.value === backgroundColor)?.label || "Black"} background`}>
      <div className="us-field">
        <span className="us-label">Shape</span>
        <div className="us-aspects" role="radiogroup" aria-label="Video shape">
          {ASPECTS.map((a) => (
            <button key={a.value} type="button" role="radio" aria-checked={videoAspectRatio === a.value} className={`us-aspect ${videoAspectRatio === a.value ? "is-active" : ""}`} onClick={() => setVideoAspectRatio(a.value)}>
              <span className="us-aspect-frame" style={{ width: a.w, height: a.h }} aria-hidden="true" />
              <b>{a.value}</b>
              <span>{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="us-field">
        <span className="us-label">Background</span>
        <div className="us-bgs" role="radiogroup" aria-label="Background">
          {BACKGROUNDS.map((b) => (
            <button key={b.value} type="button" role="radio" aria-checked={backgroundColor === b.value} className={`us-bg ${backgroundColor === b.value ? "is-active" : ""}`} onClick={() => setBackgroundColor(b.value)}>
              <span
                className={`us-bg-swatch us-bg-swatch--${b.value}`}
                style={b.value === "blurred" && imagePreviewUrl ? { backgroundImage: `url(${imagePreviewUrl})` } : undefined}
                aria-hidden="true"
              />
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <div className="us-field">
        <span className="us-label">Frame rate</span>
        <Select value={String(videoRenderFps || DEFAULT_VIDEO_RENDER_FPS)} onValueChange={setVideoRenderFps}>
          <SelectTrigger className="us-input">
            <SelectValue placeholder="Choose FPS" />
          </SelectTrigger>
          <SelectContent>
            {VIDEO_RENDER_FPS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="us-hint">{selectedFpsOption.description}</span>
        {note ? <span className={`us-note us-note--${note.tone}`}>{note.text}</span> : null}
      </div>

      <div className="us-row">
        <div className="us-row-text">
          <b>Remove watermark</b>
          <span>{isPaid ? "Hide the SendMyBeat link at the top of the video." : "On paid plans. The free version shows a small SendMyBeat link."}</span>
        </div>
        <StudioSwitch checked={removeWatermark} onChange={toggleWatermark} label="Remove watermark" />
      </div>
    </StudioSection>
  );
};

export default LayoutSettings;
