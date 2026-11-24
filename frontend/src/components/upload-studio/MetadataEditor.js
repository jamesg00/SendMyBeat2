import React, { useState } from "react";
import { Eye, EyeOff, Globe, Link2, Tags, Type } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import StudioSection, { StudioSeg } from "@/components/upload-studio/StudioSection";
import TitleHelper from "@/components/workflow/TitleHelper";

// Details: what YouTube shows for the video. Title, description template, tags and privacy.

const TITLE_LIMIT = 100; // YouTube's title limit

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
  setPrivacyStatus,
  beatName = "",
}) => {
  const [tagsPreviewOpen, setTagsPreviewOpen] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const formatTagHistoryLabel = (query = "") => {
    if (!query) return "Untitled";
    return query.replace(/\([^)]*\)/g, "").trim() || query;
  };

  const selectedTagEntry = tagHistory.find((entry) => entry.id === selectedTagsId);
  const selectedTagList = (selectedTagEntry?.tags || []).filter(Boolean);
  const titleLength = (uploadTitle || "").length;
  const selectedDescription = descriptions.find((d) => d.id === selectedDescriptionId);

  return (
    <StudioSection icon={Type} tone="blue" title="Details" summary="Title, description, tags and who can see it">
      <label className="us-field">
        <span className="us-label">
          Title
          <span className={`us-count ${titleLength > TITLE_LIMIT ? "is-over" : ""}`}>
            {titleLength}/{TITLE_LIMIT}
          </span>
        </span>
        <Input value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder="e.g. FREE Future Type Beat 2026 – “Pluto”" className="us-input us-input--lg" />
      </label>
      <TitleHelper tagRunId={selectedTagsId} beatName={beatName} title={uploadTitle} onPickTitle={setUploadTitle} />

      <div className="us-grid2">
        <div className="us-field">
          <span className="us-label">Description</span>
          <Select value={selectedDescriptionId} onValueChange={setSelectedDescriptionId}>
            <SelectTrigger className="us-input">
              <SelectValue placeholder="Pick a template" />
            </SelectTrigger>
            <SelectContent>
              {descriptions.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="us-field">
          <span className="us-label">Tags</span>
          <Select value={selectedTagsId} onValueChange={setSelectedTagsId}>
            <SelectTrigger className="us-input">
              <SelectValue placeholder="Pick a tag run" />
            </SelectTrigger>
            <SelectContent>
              {tagHistory.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {formatTagHistoryLabel(t.query)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedDescription || selectedTagList.length ? (
        <div className="us-pills">
          {selectedDescription ? (
            <button type="button" className="us-pill-btn" onClick={() => setShowDescription((v) => !v)} aria-expanded={showDescription}>
              {showDescription ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {showDescription ? "Hide description" : "Edit description"}
            </button>
          ) : null}
          {selectedTagList.length ? (
            <button type="button" className="us-pill-btn" onClick={() => setTagsPreviewOpen(true)}>
              <Tags className="h-3.5 w-3.5" />
              {selectedTagList.length} tags
            </button>
          ) : null}
        </div>
      ) : null}

      {selectedDescriptionId && showDescription ? (
        <Textarea value={uploadDescriptionText} onChange={(e) => setUploadDescriptionText(e.target.value)} rows={6} className="us-input us-textarea" aria-label="Description" />
      ) : null}

      <div className="us-field">
        <span className="us-label">Visibility</span>
        <StudioSeg
          label="Visibility"
          value={privacyStatus}
          onChange={setPrivacyStatus}
          options={[
            { value: "public", label: "Public", icon: Globe, hint: "Anyone can find and watch it" },
            { value: "unlisted", label: "Unlisted", icon: Link2, hint: "Only people with the link" },
            { value: "private", label: "Private", icon: EyeOff, hint: "Only you" },
          ]}
        />
      </div>

      <Dialog open={tagsPreviewOpen} onOpenChange={setTagsPreviewOpen}>
        <DialogContent className="max-w-lg bg-[var(--card-bg)] border border-[var(--border-color)]">
          <DialogHeader>
            <DialogTitle>{formatTagHistoryLabel(selectedTagEntry?.query)}</DialogTitle>
            <DialogDescription>{selectedTagList.length} tags go on this upload</DialogDescription>
          </DialogHeader>
          <div className="us-tag-list">
            {selectedTagList.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </StudioSection>
  );
};

export default MetadataEditor;
