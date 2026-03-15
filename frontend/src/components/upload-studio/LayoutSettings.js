import React from "react";
import { Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const LayoutSettings = ({
  videoAspectRatio,
  setVideoAspectRatio,
  backgroundColor,
  setBackgroundColor,
  removeWatermark,
  setRemoveWatermark,
  subscriptionStatus,
  onUpgrade
}) => {
  const isBlackBg = backgroundColor === "black";
  const isWhiteBg = backgroundColor === "white";

  return (
    <Card className="border-l-4 border-l-orange-500 shadow-sm">
       <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
             <ImageIcon className="h-4 w-4" /> Layout & Background
          </CardTitle>
       </CardHeader>
       <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label>Aspect Ratio</Label>
                <Select value={videoAspectRatio} onValueChange={setVideoAspectRatio}>
                   <SelectTrigger className="text-foreground"><SelectValue /></SelectTrigger>
                   <SelectContent>
                      <SelectItem value="16:9">16:9 (YouTube)</SelectItem>
                      <SelectItem value="9:16">9:16 (Shorts/TikTok)</SelectItem>
                      <SelectItem value="1:1">1:1 (Square)</SelectItem>
                      <SelectItem value="4:5">4:5 (Insta)</SelectItem>
                   </SelectContent>
                </Select>
             </div>
             <div className="space-y-2">
                <Label>Background</Label>
                <div className="flex overflow-hidden rounded-md border" style={{ borderColor: "var(--border-color)" }}>
                   <button
                     type="button"
                     onClick={() => setBackgroundColor("black")}
                     className="h-10 flex-1 transition-colors"
                     style={{
                       background: isBlackBg ? "#050505" : "var(--card-bg)",
                       color: isBlackBg ? "#f8fafc" : "var(--text-primary)"
                     }}
                   >
                      Black
                   </button>
                   <button
                     type="button"
                     onClick={() => setBackgroundColor("white")}
                     className="h-10 flex-1 border-l font-medium transition-colors"
                     style={{
                       borderColor: "var(--border-color)",
                       background: isWhiteBg ? "color-mix(in srgb, var(--bg-secondary) 78%, white 22%)" : "var(--card-bg)",
                       color: isWhiteBg ? "var(--text-primary)" : "var(--text-secondary)"
                     }}
                   >
                      White
                   </button>
                </div>
             </div>
          </div>

          <div
            className="upload-wm-row rounded-md border p-3"
            style={{
              backgroundColor: subscriptionStatus?.is_subscribed
                ? "color-mix(in srgb, var(--accent-primary) 12%, transparent)"
                : "var(--bg-secondary)",
              borderColor: subscriptionStatus?.is_subscribed
                ? "color-mix(in srgb, var(--accent-primary) 38%, transparent)"
                : "transparent"
            }}
          >
             <div className="flex items-center gap-2 min-w-0">
                <input
                   type="checkbox"
                   id="wm-check"
                   checked={removeWatermark}
                   onChange={(e) => {
                      if (!subscriptionStatus?.is_subscribed && e.target.checked) {
                         onUpgrade();
                         return;
                         }
                         setRemoveWatermark(e.target.checked);
                   }}
                   className="h-4 w-4 rounded"
                   style={{ accentColor: "var(--accent-primary)" }}
                />
                <label htmlFor="wm-check" className="upload-wm-label text-sm font-medium cursor-pointer">Remove Watermark</label>
             </div>
             {!subscriptionStatus?.is_subscribed && (
                <Button size="sm" variant="link" className="upload-wm-upgrade h-auto p-0 text-xs" style={{ color: "var(--accent-primary)" }} onClick={onUpgrade}>
                   Upgrade to Remove
                </Button>
             )}
          </div>
       </CardContent>
    </Card>
  );
};

export default LayoutSettings;
