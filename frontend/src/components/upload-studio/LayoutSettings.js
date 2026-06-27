import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEFAULT_VIDEO_RENDER_FPS, VIDEO_RENDER_FPS_OPTIONS } from "@/lib/constants";

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
}) => {
  const isPaid = Boolean(subscriptionStatus?.is_subscribed);
  const isBlackBg = backgroundColor === "black";
  const isWhiteBg = backgroundColor === "white";
  const isBlurredBg = backgroundColor === "blurred";
  const selectedFpsOption =
    VIDEO_RENDER_FPS_OPTIONS.find((option) => option.value === String(videoRenderFps)) ||
    VIDEO_RENDER_FPS_OPTIONS[0];

  const handleWatermarkToggle = () => {
    if (!isPaid && !removeWatermark) {
      onUpgrade?.();
      return;
    }
    setRemoveWatermark(!removeWatermark);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Video Layout</Label>
        <Select value={videoAspectRatio} onValueChange={setVideoAspectRatio}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="16:9">16:9 YouTube</SelectItem>
            <SelectItem value="1:1">1:1 Square</SelectItem>
            <SelectItem value="9:16">9:16 Shorts/TikTok</SelectItem>
            <SelectItem value="4:5">4:5 Portrait</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Render frame rate</Label>
        <Select value={String(videoRenderFps || DEFAULT_VIDEO_RENDER_FPS)} onValueChange={setVideoRenderFps}>
          <SelectTrigger>
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
        <p className="text-xs text-muted-foreground leading-relaxed">
          {selectedFpsOption.description}
        </p>
        {isAnimatedVisual && String(videoRenderFps) === "2" ? (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            GIF or animated artwork at 2 fps will look choppy. Try 30 fps for smoother motion.
          </p>
        ) : null}
        {visualizerEnabled ? (
          <p className="text-xs text-green-600 dark:text-green-400">
            The visualizer will be recorded and baked into your YouTube video. Use 30 or 60 fps for smooth motion.
          </p>
        ) : null}
        {!visualizerEnabled && !isAnimatedVisual && ["30", "60"].includes(String(videoRenderFps)) ? (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Static cover art is encoded at 2 fps for speed (looks the same on YouTube). Use 30/60 fps for GIFs or video loops.
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label>Background</Label>
        <div className="grid grid-cols-3 gap-2">
          <Button
            type="button"
            variant={isBlackBg ? "default" : "outline"}
            size="sm"
            onClick={() => setBackgroundColor("black")}
          >
            Black
          </Button>
          <Button
            type="button"
            variant={isWhiteBg ? "default" : "outline"}
            size="sm"
            onClick={() => setBackgroundColor("white")}
          >
            White
          </Button>
          <Button
            type="button"
            variant={isBlurredBg ? "default" : "outline"}
            size="sm"
            onClick={() => setBackgroundColor("blurred")}
          >
            Blurred
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Blurred uses the artwork as a pre-rendered background. Black and white use a flat canvas.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-md border p-3" style={{ borderColor: "var(--border-color)" }}>
        <div>
          <Label>Remove Watermark</Label>
          <p className="text-xs text-muted-foreground">Available on paid plans.</p>
        </div>
        <Button
          type="button"
          variant={removeWatermark ? "default" : "outline"}
          size="sm"
          onClick={handleWatermarkToggle}
        >
          {removeWatermark ? "Removed" : "Keep"}
        </Button>
      </div>
    </div>
  );
};

export default LayoutSettings;
