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
                <div className="flex border rounded-md overflow-hidden">
                   <button
                     onClick={() => setBackgroundColor("black")}
                     className={`flex-1 h-10 ${backgroundColor === "black" ? "bg-black text-white" : "bg-white text-black hover:bg-gray-100"}`}
                   >
                      Black
                   </button>
                   <button
                     onClick={() => setBackgroundColor("white")}
                     className={`flex-1 h-10 border-l ${backgroundColor === "white" ? "bg-gray-200 text-black font-bold" : "bg-white text-black hover:bg-gray-100"}`}
                   >
                      White
                   </button>
                </div>
             </div>
          </div>

          <div className={`flex items-center justify-between p-3 rounded-md border ${subscriptionStatus?.is_subscribed ? 'bg-green-500/10 border-green-500/30' : 'bg-secondary border-transparent'}`}>
             <div className="flex items-center gap-2">
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
                   className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="wm-check" className="text-sm font-medium cursor-pointer">Remove Watermark</label>
             </div>
             {!subscriptionStatus?.is_subscribed && (
                <Button size="sm" variant="link" className="h-auto p-0 text-xs text-blue-500" onClick={onUpgrade}>
                   Upgrade to Remove
                </Button>
             )}
          </div>
       </CardContent>
    </Card>
  );
};

export default LayoutSettings;
