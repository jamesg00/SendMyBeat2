import React from "react";
import { Wand2, ChevronUp, ChevronDown, Target, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const AIToolsPanel = ({
  showTools,
  setShowTools,
  analyzingBeat,
  handleAnalyzeBeat,
  checkingThumbnail,
  handleThumbnailCheck,
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
             <div className="grid grid-cols-2 gap-3">
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
                   <div className="text-xs text-muted-foreground">
                      {thumbnailCheckResult.suggestions[0]}
                   </div>
                </div>
             )}
          </CardContent>
       )}
    </Card>
  );
};

export default AIToolsPanel;
