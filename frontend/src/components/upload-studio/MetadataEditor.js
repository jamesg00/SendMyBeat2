import React, { useState } from "react";
import { Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const MetadataEditor = ({
  uploadTitle,
  setUploadTitle,
  descriptions,
  selectedDescriptionId,
  setSelectedDescriptionId,
  tagHistory,
  selectedTagsId,
  setSelectedTagsId,
  uploadDescriptionText,
  setUploadDescriptionText,
  privacyStatus,
  setPrivacyStatus
}) => {
  const [tagsPreviewOpen, setTagsPreviewOpen] = useState(false);
  const formatTagHistoryLabel = (query = "") => {
    if (!query) return "Untitled";
    return query.replace(/\([^)]*\)/g, "").trim() || query;
  };

  const selectedTagEntry = tagHistory.find((entry) => entry.id === selectedTagsId);
  const selectedTagList = (selectedTagEntry?.tags || []).filter(Boolean);

  return (
    <Card className="border-l-4 border-l-blue-500 shadow-sm">
       <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
             <Youtube className="h-4 w-4" /> Video Metadata
          </CardTitle>
       </CardHeader>
       <CardContent className="space-y-4">
          <div className="space-y-2">
             <Label>Video Title</Label>
             <Input
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="Enter Beat Title Here"
                className="font-medium"
             />
          </div>
          <div className="grid grid-cols-2 gap-3">
             <div className="space-y-2">
                <Label>Template</Label>
                <Select value={selectedDescriptionId} onValueChange={setSelectedDescriptionId}>
                   <SelectTrigger className="text-foreground">
                      <SelectValue placeholder="Select description..." />
                   </SelectTrigger>
                   <SelectContent>
                      {descriptions.map(d => (
                         <SelectItem key={d.id} value={d.id} className="text-foreground">{d.title}</SelectItem>
                      ))}
                   </SelectContent>
                </Select>
             </div>
             <div className="space-y-2">
                <Label>Tags</Label>
                <Select value={selectedTagsId} onValueChange={setSelectedTagsId}>
                   <SelectTrigger className="text-foreground">
                      <SelectValue placeholder="Select tags..." />
                   </SelectTrigger>
                   <SelectContent>
                      {tagHistory.map(t => (
                         <SelectItem key={t.id} value={t.id} className="text-foreground">{formatTagHistoryLabel(t.query)}</SelectItem>
                      ))}
                   </SelectContent>
                </Select>
                {selectedTagList.length > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full justify-between text-xs"
                    onClick={() => setTagsPreviewOpen(true)}
                  >
                    <span className="truncate">{formatTagHistoryLabel(selectedTagEntry?.query)}</span>
                    <span className="shrink-0">{selectedTagList.length} tags</span>
                  </Button>
                ) : null}
             </div>
          </div>
          {selectedDescriptionId && (
             <Textarea
                value={uploadDescriptionText}
                onChange={(e) => setUploadDescriptionText(e.target.value)}
                rows={4}
                className="text-xs font-mono bg-secondary/30 text-foreground"
             />
          )}
          <div className="space-y-2">
             <Label>Privacy</Label>
             <Select value={privacyStatus} onValueChange={setPrivacyStatus}>
                <SelectTrigger className="text-foreground">
                   <SelectValue />
                </SelectTrigger>
                <SelectContent>
                   <SelectItem value="public">Public</SelectItem>
                   <SelectItem value="unlisted">Unlisted</SelectItem>
                   <SelectItem value="private">Private</SelectItem>
                </SelectContent>
             </Select>
          </div>
       </CardContent>
       <Dialog open={tagsPreviewOpen} onOpenChange={setTagsPreviewOpen}>
          <DialogContent className="max-w-lg">
             <DialogHeader>
                <DialogTitle>{formatTagHistoryLabel(selectedTagEntry?.query)}</DialogTitle>
                <DialogDescription>{selectedTagList.length} selected tags</DialogDescription>
             </DialogHeader>
             <div className="max-h-[50vh] overflow-y-auto rounded-md border p-3" style={{ borderColor: "var(--border-color)" }}>
                <div className="flex flex-wrap gap-1.5">
                   {selectedTagList.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border px-2 py-1 text-xs leading-none"
                        style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                      >
                        {tag}
                      </span>
                   ))}
                </div>
             </div>
          </DialogContent>
       </Dialog>
    </Card>
  );
};

export default MetadataEditor;
