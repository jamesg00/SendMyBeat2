import React from "react";
import { Wand2, ChevronUp, ChevronDown, Target, Sparkles, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import SearchResultImage from "@/components/upload-studio/SearchResultImage";

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
  generatedImageSearchQuery,
  setGeneratedImageSearchQuery,
  onUseGeneratedImage,
  beatAnalysis,
  thumbnailCheckResult
}) => {
  const actionButtonStyle = (accent) => ({
    color: accent,
    borderColor: `color-mix(in srgb, ${accent} 34%, var(--border-color))`,
    backgroundColor: "transparent"
  });

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
             <div className="space-y-2 rounded-md border border-border bg-secondary/20 p-3">
                <div className="text-sm font-semibold">Artwork Search</div>
                <div className="text-xs text-muted-foreground">
                   Search artist visuals, cover moods, or artwork styles and apply one to this upload.
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                   <Input
                      value={generatedImageSearchQuery}
                      onChange={(e) => setGeneratedImageSearchQuery?.(e.target.value)}
                      placeholder="Lil Uzi cover art"
                      className="min-w-0 sm:flex-1"
                   />
                   <Button
                      variant="outline"
                      onClick={() => handleGenerateImage({ query: generatedImageSearchQuery })}
                      disabled={generatingImages}
                      className="transition-colors hover:bg-secondary/70"
                      style={actionButtonStyle("var(--text-primary)")}
                   >
                      {generatingImages ? "..." : <><Search className="mr-2 h-4 w-4"/><span className="hidden md:inline">Web Image Search</span><span className="md:hidden">Search</span></>}
                   </Button>
                </div>
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                   variant="outline"
                   onClick={handleAnalyzeBeat}
                   disabled={analyzingBeat}
                   className="transition-colors hover:bg-secondary/70"
                   style={actionButtonStyle("var(--accent-primary)")}
                >
                   {analyzingBeat ? "..." : <><Target className="mr-2 h-4 w-4"/> Analyze Beat</>}
                </Button>
                <Button
                   variant="outline"
                   onClick={handleThumbnailCheck}
                   disabled={checkingThumbnail}
                   className="transition-colors hover:bg-secondary/70"
                   style={actionButtonStyle("var(--accent-secondary)")}
                >
                   {checkingThumbnail ? "..." : <><Sparkles className="mr-2 h-4 w-4"/> Check Thumb</>}
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
                      No thumbnail yet? Search artist visuals and apply one.
                   </div>
                   <div className="text-[11px] text-muted-foreground">
                      Source: {generatedImageQuery || "artist search"}
                   </div>
                   <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {generatedImages.map((img) => (
                        <button
                          key={img.id}
                          type="button"
                          className="group rounded-md overflow-hidden border border-border hover:border-primary transition-colors bg-background"
                          onClick={() => onUseGeneratedImage?.(img)}
                        >
                          <SearchResultImage
                             result={img}
                             alt={img.artist || "Generated option"}
                             className="aspect-square w-full object-cover object-center"
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
