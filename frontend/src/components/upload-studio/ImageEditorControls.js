import React from "react";
import { Move } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".heic", ".heif"];

const ImageEditorControls = ({
  imageSettingsOpen,
  setImageSettingsOpen,
  applyImageSettings,
  handleImageUpload,
  studioImageInputRef,
  imageScaleX,
  setImageScaleX,
  setImageScaleY,
  lockImageScale,
  imageRotation,
  setImageRotation,
  fitImageToFrame,
  centerImagePosition,
  centerLockEnabled,
  setCenterLockEnabled
}) => {
  return (
    <Card className="border-l-4 border-l-amber-500 shadow-sm">
       <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
             <Move className="h-4 w-4" /> Image Settings
          </CardTitle>
       </CardHeader>
       <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
             <Button
                type="button"
                variant={imageSettingsOpen ? "default" : "outline"}
                onClick={() => setImageSettingsOpen((v) => !v)}
                className={imageSettingsOpen ? "bg-amber-600 hover:bg-amber-700" : ""}
             >
                {imageSettingsOpen ? "Close Editor" : "Open Image Editor"}
             </Button>
             {imageSettingsOpen && (
                <Button type="button" variant="outline" onClick={applyImageSettings}>
                  Apply (Lock)
                </Button>
             )}
          </div>

          {imageSettingsOpen && (
            <div className="space-y-4 border rounded-md p-3 bg-secondary/30">
              <p className="text-xs text-muted-foreground">
                Edit mode is ON: drag/touch the preview to move image, pinch to zoom, adjust rotation below.
              </p>

              <Input
                 ref={studioImageInputRef}
                 type="file"
                 accept={IMAGE_EXTENSIONS.join(',')}
                 className="hidden"
                 onChange={(e) => handleImageUpload(e.target.files?.[0])}
              />

              <div className="space-y-2">
                 <div className="flex justify-between text-xs">
                    <Label>Image Scale</Label>
                    <span className="text-muted-foreground">{imageScaleX.toFixed(2)}x</span>
                 </div>
                 <input
                    type="range" min="0.1" max="1.5" step="0.05"
                    value={imageScaleX}
                    onChange={(e) => {
                       const val = parseFloat(e.target.value);
                       setImageScaleX(val);
                       if (lockImageScale) setImageScaleY(val);
                    }}
                    className="studio-slider studio-slider-amber"
                 />
              </div>

              <div className="space-y-2">
                 <div className="flex justify-between text-xs">
                    <Label>Rotation</Label>
                    <span className="text-muted-foreground">{Math.round(imageRotation)}°</span>
                 </div>
                 <input
                    type="range" min="-180" max="180" step="1"
                    value={imageRotation}
                    onChange={(e) => setImageRotation(parseFloat(e.target.value))}
                    className="studio-slider studio-slider-amber"
                 />
              </div>

              <div className="grid grid-cols-2 gap-2">
                 <Button
                    type="button"
                    variant="outline"
                    onClick={() => studioImageInputRef.current?.click()}
                 >
                    Change Photo
                 </Button>
                 <Button
                    type="button"
                    variant="outline"
                    onClick={fitImageToFrame}
                 >
                    Fit Image
                 </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                 <Button
                    type="button"
                    variant="outline"
                    onClick={centerImagePosition}
                 >
                    Center Image
                 </Button>
                 <Button
                    type="button"
                    variant={centerLockEnabled ? "default" : "outline"}
                    onClick={() => {
                      setCenterLockEnabled((v) => {
                        const next = !v;
                        if (next) centerImagePosition();
                        return next;
                      });
                    }}
                    className={centerLockEnabled ? "bg-amber-600 hover:bg-amber-700" : ""}
                 >
                    {centerLockEnabled ? "Center Locked" : "Lock Center"}
                 </Button>
              </div>
            </div>
          )}
       </CardContent>
    </Card>
  );
};

export default ImageEditorControls;
