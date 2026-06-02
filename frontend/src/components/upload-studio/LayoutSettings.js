import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const LayoutSettings = ({
  videoAspectRatio,
  setVideoAspectRatio,
  backgroundColor,
  setBackgroundColor,
  removeWatermark,
  setRemoveWatermark,
  subscriptionStatus,
  onUpgrade,
}) => {
  const isPaid = Boolean(subscriptionStatus?.is_subscribed);
  const isBlackBg = backgroundColor === "black";
  const isWhiteBg = backgroundColor === "white";
  const isBlurredBg = backgroundColor === "blurred";

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
