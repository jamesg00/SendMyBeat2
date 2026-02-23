import React from "react";
import { toast } from "sonner";
import { Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".heic", ".heif"];

const VisualizerSettings = ({
  visualizerEnabled,
  setVisualizerEnabled,
  visualizerSettings,
  setVisualizerSettings,
  applyVisualizerPreset,
  handleCenterVisualizerImageUpload,
  centerVisualizerImageName,
  centerVisualizerImageInputRef
}) => {
  return (
    <Card className="border-l-4 border-l-purple-500 shadow-sm">
       <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
             <Music className="h-4 w-4" /> Audio Visualizer
          </CardTitle>
          <Button
            size="sm"
            variant={visualizerEnabled ? "default" : "outline"}
            onClick={() => setVisualizerEnabled(!visualizerEnabled)}
            className={visualizerEnabled ? "bg-purple-600 hover:bg-purple-700" : ""}
          >
             {visualizerEnabled ? "Enabled" : "Disabled"}
          </Button>
       </CardHeader>

       {visualizerEnabled && (
       <CardContent className="space-y-5 animate-in slide-in-from-top-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
             <Button
               type="button"
               variant="outline"
               size="sm"
               className="text-xs"
               onClick={() => applyVisualizerPreset("ncs-clean")}
             >
               NCS Clean
             </Button>
             <Button
               type="button"
               variant="outline"
               size="sm"
               className="text-xs"
               onClick={() => applyVisualizerPreset("ncs-aggressive")}
             >
               NCS Aggressive
             </Button>
             <Button
               type="button"
               variant="outline"
               size="sm"
               className="text-xs"
               onClick={() => applyVisualizerPreset("monstercat-tight")}
             >
               Monstercat Tight
             </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Style</Label>
                <Select
                   value={visualizerSettings.mode}
                   onValueChange={(v) => setVisualizerSettings(s => ({...s, mode: v}))}
                >
                   <SelectTrigger className="text-foreground"><SelectValue /></SelectTrigger>
                   <SelectContent>
                      <SelectItem value="circle">NCS Circle</SelectItem>
                      <SelectItem value="monstercat">Linear Bars</SelectItem>
                   </SelectContent>
                </Select>
             </div>
             <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Spectrum Color</Label>
                <div className="flex flex-wrap gap-2">
                  <Input
                     type="color"
                     value={visualizerSettings.spectrumColor}
                     onChange={(e) => setVisualizerSettings(s => ({...s, spectrumColor: e.target.value, spectrumBorderColor: e.target.value}))}
                     className="w-10 h-10 p-1 cursor-pointer"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs whitespace-nowrap px-2"
                    onClick={() => setVisualizerSettings(s => ({...s, multiColorReactive: !s.multiColorReactive}))}
                  >
                    {visualizerSettings.multiColorReactive ? "Rainbow On" : "Rainbow Off"}
                  </Button>
                </div>
             </div>
             <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Particle Color</Label>
                <div className="flex flex-wrap gap-2">
                  <Input
                     type="color"
                     value={visualizerSettings.particleColor}
                     onChange={(e) => setVisualizerSettings(s => ({...s, particleColor: e.target.value}))}
                     className="w-10 h-10 p-1 cursor-pointer"
                  />
                </div>
             </div>
          </div>

          <div className="space-y-4 pt-2">
             {visualizerSettings.mode === 'circle' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Center Mode</Label>
                      <Select
                         value={visualizerSettings.fillCenter}
                         onValueChange={(v) => setVisualizerSettings(s => ({...s, fillCenter: v}))}
                      >
                         <SelectTrigger className="text-foreground"><SelectValue /></SelectTrigger>
                         <SelectContent>
                            <SelectItem value="color">Color Fill</SelectItem>
                            <SelectItem value="image">Image</SelectItem>
                            <SelectItem value="transparent">Transparent</SelectItem>
                         </SelectContent>
                      </Select>
                   </div>
                   {visualizerSettings.fillCenter === "color" && (
                     <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Center Fill Color</Label>
                        <Input
                          type="color"
                          value={visualizerSettings.fillCenterColor}
                          onChange={(e) => setVisualizerSettings(s => ({...s, fillCenterColor: e.target.value}))}
                          className="w-10 h-10 p-1 cursor-pointer"
                        />
                     </div>
                   )}
                   {visualizerSettings.fillCenter === "image" && (
                     <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Image Spin</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => setVisualizerSettings(s => ({...s, centerImageSpin: !s.centerImageSpin}))}
                        >
                          {visualizerSettings.centerImageSpin ? "Spin On" : "Spin Off"}
                        </Button>
                        <Input
                          ref={centerVisualizerImageInputRef}
                          type="file"
                          accept={IMAGE_EXTENSIONS.join(',')}
                          className="hidden"
                          onChange={handleCenterVisualizerImageUpload}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            toast("Upload image");
                            centerVisualizerImageInputRef.current?.click();
                          }}
                        >
                          Upload Image
                        </Button>
                        {!!centerVisualizerImageName && (
                          <p className="text-[11px] text-muted-foreground truncate">{centerVisualizerImageName}</p>
                        )}
                     </div>
                   )}
                   <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Circle Border</Label>
                      <Button
                        variant={visualizerSettings.spectrumBorderEnabled ? "default" : "outline"}
                        size="sm"
                        className="w-full"
                        onClick={() => setVisualizerSettings(s => ({ ...s, spectrumBorderEnabled: !s.spectrumBorderEnabled }))}
                      >
                        {visualizerSettings.spectrumBorderEnabled ? "Border On" : "Border Off"}
                      </Button>
                      {visualizerSettings.spectrumBorderEnabled && (
                        <div className="flex items-center gap-2">
                          <Input
                            type="color"
                            value={visualizerSettings.spectrumBorderColor}
                            onChange={(e) => setVisualizerSettings(s => ({ ...s, spectrumBorderColor: e.target.value }))}
                            className="w-10 h-10 p-1 cursor-pointer"
                          />
                          <div className="flex-1 text-[11px] text-muted-foreground">
                            NCS thickness enabled
                          </div>
                        </div>
                      )}
                      {visualizerSettings.fillCenter === "transparent" && (
                        <p className="text-[11px] text-muted-foreground">
                          Border is auto-disabled in Transparent mode.
                        </p>
                      )}
                   </div>
                </div>
             )}

             <div className="space-y-2">
                <div className="flex justify-between text-xs">
                   <Label>Reactivity / Intensity</Label>
                   <span className="text-muted-foreground">{visualizerSettings.intensity.toFixed(2)}</span>
                </div>
                <input
                   type="range" min="0.5" max="2.0" step="0.1"
                   value={visualizerSettings.intensity}
                   onChange={(e) => setVisualizerSettings(s => ({...s, intensity: parseFloat(e.target.value)}))}
                   className="studio-slider studio-slider-purple"
                />
             </div>

             <div className="space-y-2">
                <div className="flex justify-between text-xs">
                   <Label>Bar Count</Label>
                   <span className="text-muted-foreground">{visualizerSettings.bars}</span>
                </div>
                <input
                   type="range" min="32" max="160" step="4"
                   value={visualizerSettings.bars}
                   onChange={(e) => setVisualizerSettings(s => ({...s, bars: parseInt(e.target.value)}))}
                   className="studio-slider studio-slider-purple"
                />
             </div>

             {visualizerSettings.mode === 'circle' && (
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                         <Label>Particles</Label>
                         <span className="text-muted-foreground">{visualizerSettings.particleIntensity.toFixed(1)}</span>
                      </div>
                      <input
                         type="range" min="0" max="2" step="0.1"
                         value={visualizerSettings.particleIntensity}
                         onChange={(e) => setVisualizerSettings(s => ({...s, particleIntensity: parseFloat(e.target.value)}))}
                         className="studio-slider studio-slider-purple"
                      />
                   </div>
                   <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                         <Label>Shake</Label>
                         <span className="text-muted-foreground">{visualizerSettings.shakeIntensity.toFixed(1)}</span>
                      </div>
                      <input
                         type="range" min="0" max="2" step="0.1"
                         value={visualizerSettings.shakeIntensity}
                         onChange={(e) => setVisualizerSettings(s => ({...s, shakeIntensity: parseFloat(e.target.value)}))}
                         className="studio-slider studio-slider-purple"
                      />
                   </div>
                </div>
             )}

             {visualizerSettings.mode === 'monstercat' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                         <Label>Monstercat Y Position</Label>
                         <div className="flex items-center gap-2">
                           <span className="text-muted-foreground">{visualizerSettings.monstercatYOffset}px</span>
                           <Button
                             type="button"
                             variant="outline"
                             size="sm"
                             className="h-6 px-2 text-[10px]"
                             onClick={() => setVisualizerSettings(s => ({...s, monstercatYOffset: 0}))}
                           >
                             Reset Position
                           </Button>
                         </div>
                      </div>
                      <input
                         type="range" min="0" max="320" step="5"
                         value={visualizerSettings.monstercatYOffset}
                         onChange={(e) => setVisualizerSettings(s => ({...s, monstercatYOffset: parseInt(e.target.value, 10)}))}
                         className="studio-slider studio-slider-purple"
                      />
                   </div>
                   <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                         <Label>Bar Spacing</Label>
                         <span className="text-muted-foreground">{visualizerSettings.monstercatSpacing.toFixed(1)}</span>
                      </div>
                      <input
                         type="range" min="0" max="12" step="0.5"
                         value={visualizerSettings.monstercatSpacing}
                         onChange={(e) => setVisualizerSettings(s => ({...s, monstercatSpacing: parseFloat(e.target.value)}))}
                         className="studio-slider studio-slider-purple"
                      />
                   </div>
                   <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                         <Label>Glow</Label>
                         <span className="text-muted-foreground">{visualizerSettings.monstercatGlow.toFixed(0)}</span>
                      </div>
                      <input
                         type="range" min="0" max="36" step="1"
                         value={visualizerSettings.monstercatGlow}
                         onChange={(e) => setVisualizerSettings(s => ({...s, monstercatGlow: parseInt(e.target.value, 10)}))}
                         className="studio-slider studio-slider-purple"
                      />
                   </div>

                   <div className="md:col-span-2 border rounded-md p-3 bg-secondary/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Linear Particles</Label>
                        <Button
                          type="button"
                          size="sm"
                          variant={visualizerSettings.monstercatParticleEnabled ? "default" : "outline"}
                          className={visualizerSettings.monstercatParticleEnabled ? "bg-purple-600 hover:bg-purple-700" : ""}
                          onClick={() => setVisualizerSettings(s => ({...s, monstercatParticleEnabled: !s.monstercatParticleEnabled}))}
                        >
                          {visualizerSettings.monstercatParticleEnabled ? "On" : "Off"}
                        </Button>
                      </div>

                      {visualizerSettings.monstercatParticleEnabled && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <Label>Particle Speed</Label>
                              <span className="text-muted-foreground">{visualizerSettings.monstercatParticleSpeed.toFixed(1)}</span>
                            </div>
                            <input
                              type="range" min="0.2" max="3.5" step="0.1"
                              value={visualizerSettings.monstercatParticleSpeed}
                              onChange={(e) => setVisualizerSettings(s => ({...s, monstercatParticleSpeed: parseFloat(e.target.value)}))}
                              className="studio-slider studio-slider-purple"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <Label>Particle Size</Label>
                              <span className="text-muted-foreground">{visualizerSettings.monstercatParticleSize.toFixed(1)}</span>
                            </div>
                            <input
                              type="range" min="0.4" max="4" step="0.1"
                              value={visualizerSettings.monstercatParticleSize}
                              onChange={(e) => setVisualizerSettings(s => ({...s, monstercatParticleSize: parseFloat(e.target.value)}))}
                              className="studio-slider studio-slider-purple"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <Label>Particle Count</Label>
                              <span className="text-muted-foreground">{visualizerSettings.monstercatParticleCount}</span>
                            </div>
                            <input
                              type="range" min="120" max="3000" step="20"
                              value={visualizerSettings.monstercatParticleCount}
                              onChange={(e) => setVisualizerSettings(s => ({...s, monstercatParticleCount: parseInt(e.target.value, 10)}))}
                              className="studio-slider studio-slider-purple"
                            />
                          </div>
                        </div>
                      )}
                   </div>
                </div>
             )}
          </div>
       </CardContent>
       )}
    </Card>
  );
};

export default VisualizerSettings;
