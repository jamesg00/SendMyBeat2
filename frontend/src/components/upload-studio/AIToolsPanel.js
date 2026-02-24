import React from "react";
import { Wand2, ChevronUp, ChevronDown, Target, Sparkles, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const AIToolsPanel = ({
  showTools,
  setShowTools,
  analyzingBeat,
  handleAnalyzeBeat,
  checkingThumbnail,
  handleThumbnailCheck,
  generatingImages,
  handleGenerateImage,
  generatedImages,
  generatedImageQuery,
  onUseGeneratedImage,
  beatAnalysis,
  thumbnailCheckResult
}) => {
  return (
    <Card className="border-l-4 border-l-emerald-500 shadow-sm">
       <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
             <Wand2 className="h-4 w-4" /> AI Tools
          </CardTitle>
          <Button size="sm" variant="ghost" onClick={() => setShowTools(!showTools)}>
             {showTools ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>}
          </Button>
       </CardHeader>
       {showTools && (
          <CardContent className="space-y-4">
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button
                   variant="outline"
                   onClick={handleAnalyzeBeat}
                   disabled={analyzingBeat}
                   className="text-yellow-600 border-yellow-200 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                >
                   {analyzingBeat ? "..." : <><Target className="mr-2 h-4 w-4"/> Analyze Beat</>}
                </Button>
                <Button
                   variant="outline"
                   onClick={handleThumbnailCheck}
                   disabled={checkingThumbnail}
                   className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                >
                   {checkingThumbnail ? "..." : <><Sparkles className="mr-2 h-4 w-4"/> Check Thumb</>}
                </Button>
                <Button
                   variant="outline"
                   onClick={handleGenerateImage}
                   disabled={generatingImages}
                   className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                >
                   {generatingImages ? "..." : <><ImagePlus className="mr-2 h-4 w-4"/> Generate Image</>}
                </Button>
             </div>

             {beatAnalysis && (
                <div className="p-3 bg-secondary/50 rounded-md text-sm space-y-2">
                   <div className="flex justify-between font-bold">
                      <span>Score: {beatAnalysis.overall_score}/100</span>
                      <span>{beatAnalysis.predicted_performance}</span>
                   </div>
                   <div className="text-xs text-muted-foreground">
                      {beatAnalysis.suggestions[0]}
                   </div>
                </div>
             )}
             {thumbnailCheckResult && (
                <div className="p-3 bg-secondary/50 rounded-md text-sm space-y-2">
                   <div className="flex justify-between font-bold">
                      <span>Score: {thumbnailCheckResult.score}/100</span>
                      <span>{thumbnailCheckResult.verdict}</span>
                   </div>
                   {thumbnailCheckResult.issues?.length > 0 && (
                      <div className="text-xs">
                         <div className="font-semibold">Main Issues</div>
                         <ul className="list-disc pl-4 text-muted-foreground space-y-1">
                            {thumbnailCheckResult.issues.slice(0, 2).map((issue, idx) => (
                               <li key={`issue-${idx}`}>{issue}</li>
                            ))}
                         </ul>
                      </div>
                   )}
                   {thumbnailCheckResult.suggestions?.length > 0 && (
                      <div className="text-xs">
                         <div className="font-semibold">Best Next Fixes</div>
                         <ul className="list-disc pl-4 text-muted-foreground space-y-1">
                            {thumbnailCheckResult.suggestions.slice(0, 3).map((tip, idx) => (
                               <li key={`tip-${idx}`}>{tip}</li>
                            ))}
                         </ul>
                      </div>
                   )}
                   {(thumbnailCheckResult.text_overlay_suggestion || thumbnailCheckResult.branding_suggestion) && (
                      <div className="text-xs text-muted-foreground space-y-1">
                         {thumbnailCheckResult.text_overlay_suggestion && (
                            <div>
                               <span className="font-semibold">Text Overlay: </span>
                               {thumbnailCheckResult.text_overlay_suggestion}
                            </div>
                         )}
                         {thumbnailCheckResult.branding_suggestion && (
                            <div>
                               <span className="font-semibold">Branding: </span>
                               {thumbnailCheckResult.branding_suggestion}
                            </div>
                         )}
                      </div>
                   )}
                </div>
             )}

             {generatedImages?.length > 0 && (
                <div className="space-y-2">
                   <div className="text-xs font-semibold text-muted-foreground">
                      Generated from: {generatedImageQuery || "artist search"}
                   </div>
                   <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {generatedImages.map((img) => (
                        <button
                          key={img.id}
                          type="button"
                          className="group rounded-md overflow-hidden border border-border hover:border-primary transition-colors bg-background"
                          onClick={() => onUseGeneratedImage?.(img)}
                        >
                          <img
                            src={img.thumbnail_url || img.image_url}
                            alt={img.artist || "Generated option"}
                            className="w-full h-24 object-cover"
                            loading="lazy"
                          />
                          <div className="px-2 py-1 text-[10px] text-left text-muted-foreground truncate">
                            {img.artist || img.source}
                          </div>
                        </button>
                      ))}
                   </div>
                </div>
             )}
          </CardContent>
       )}
    </Card>
  );
};

export default AIToolsPanel;
