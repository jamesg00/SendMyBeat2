import React from "react";
import { Youtube } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
                <div
                  className="rounded-md border px-3 py-2 text-xs"
                  style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-secondary)", color: "var(--text-secondary)" }}
                >
                  {selectedTagList.length > 0 ? (
                    <>
                      <div className="mb-2 font-medium" style={{ color: "var(--text-primary)" }}>
                        {selectedTagList.length} tags selected
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedTagList.slice(0, 10).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border px-2 py-1 leading-none"
                            style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                          >
                            {tag}
                          </span>
                        ))}
                        {selectedTagList.length > 10 && (
                          <span className="rounded-full border px-2 py-1 leading-none" style={{ borderColor: "var(--border-color)" }}>
                            +{selectedTagList.length - 10} more
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <span>No saved tags selected yet.</span>
                  )}
                </div>
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
    </Card>
  );
};

export default MetadataEditor;
