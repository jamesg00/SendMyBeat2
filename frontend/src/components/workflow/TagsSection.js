import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp, Copy, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DemandLegend, TagDetailDialog, TagLimitMeter, TagRanking, TagViewToggle } from "@/components/workflow/TagInsights";

const TAG_SCORE_GREEN_MIN = 60;
const TAG_SCORE_YELLOW_MIN = 45;

const getTagScoreBadgeStyle = (score) => {
  const value = Number(score);
  if (!Number.isFinite(value) || value <= 0) {
    return { borderColor: "var(--border-color)", color: "var(--text-secondary)", background: "transparent" };
  }
  if (value >= TAG_SCORE_GREEN_MIN) {
    return { borderColor: "#22c55e", color: "#166534", background: "rgba(34, 197, 94, 0.12)" };
  }
  if (value >= TAG_SCORE_YELLOW_MIN) {
    return { borderColor: "#f59e0b", color: "#92400e", background: "rgba(245, 158, 11, 0.12)" };
  }
  return { borderColor: "#ef4444", color: "#991b1b", background: "rgba(239, 68, 68, 0.12)" };
};

const buildTagScoreTooltip = (entry, fallbackTag) => {
  if (!entry) return fallbackTag;
  const parts = [entry.reason || fallbackTag];
  const breakdown = entry.breakdown || {};
  if (breakdown.demand != null || breakdown.competition != null) {
    parts.push(
      `Demand: ${breakdown.demand ?? "—"} · Competition: ${breakdown.competition ?? "—"} · Relevance: ${breakdown.relevance ?? "—"}`
    );
  }
  if (breakdown.monthly_search_proxy != null) {
    parts.push(`YouTube median views (top 5): ${Number(breakdown.monthly_search_proxy).toLocaleString()}`);
  }
  return parts.filter(Boolean).join("\n");
};

const TagsSection = ({
  mode = "full",
  showInlineOutput = true,
  tagHistory,
  selectedTagHistoryIds,
  joiningTagsLoading,
  joiningTagsProgress,
  handleJoinSelectedTagHistory,
  handleClearTagSelection,
  formatTagHistoryLabel,
  activeTagHistoryId,
  handleTagHistoryTileClick,
  handleDeleteTagHistoryItem,
  generatedTags,
  loadingTags,
  handleGenerateTags,
  copyTags,
  generatedTagScores,
  normalizeTagKey,
  handleRemoveGeneratedTag,
  additionalTags,
  setAdditionalTags,
  tagLimit,
  handleAddMoreTags,
  canViewTagDebug,
  tagDebug,
  showTagDebug,
  setShowTagDebug,
  tagQuery,
  setTagQuery,
  minPublishScore = 58,
}) => {
  const [resultsCollapsed, setResultsCollapsed] = useState(mode === "results");
  const hasGeneratedTags = generatedTags.length > 0;
  // Tags as chips, or ranked best to worst; clicking a tag opens why it got its score.
  const [tagView, setTagView] = useState("tags");
  const [tagDetail, setTagDetail] = useState(null);
  const scoreFor = (tag) => generatedTagScores[normalizeTagKey(tag)];
  const hasScores = generatedTags.some((tag) => scoreFor(tag)?.score);
  const rankOf = (tag) =>
    generatedTags
      .map(scoreFor)
      .filter((entry) => entry?.score)
      .sort((a, b) => b.score - a.score)
      .findIndex((entry) => normalizeTagKey(entry.tag) === normalizeTagKey(tag)) + 1;
  const copyOneTag = async (tag) => {
    try {
      await navigator.clipboard.writeText(tag);
      toast.success("Tag copied");
    } catch (error) {
      toast.error("Could not copy the tag");
    }
  };
  const removeTagByName = async (tag) => {
    const index = generatedTags.findIndex((t) => normalizeTagKey(t) === normalizeTagKey(tag));
    setTagDetail(null);
    if (index >= 0) await handleRemoveGeneratedTag(index);
  };

  const renderResultsPanel = ({ inline = false } = {}) => (
    <div
      className={`workflow-output-card ${hasGeneratedTags ? "" : "workflow-output-card--empty"} ${inline ? "workflow-inline-output" : ""}`}
      data-testid="generated-tags-section"
    >
      <div className="workflow-inline-output-header">
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              Generated Tags {hasGeneratedTags ? `(${generatedTags.length})` : ""}
            </h3>
            {hasGeneratedTags ? (
              <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                High-intent tags only (YouTube search score ≥ {minPublishScore}). Green ≥ 60.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto xl:justify-end">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setResultsCollapsed((prev) => !prev)}
              className="gap-1 text-xs sm:text-sm whitespace-nowrap shrink-0"
              aria-expanded={!resultsCollapsed}
            >
              {resultsCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              {resultsCollapsed ? "Expand" : "Collapse"}
            </Button>
            {hasGeneratedTags ? (
              <div className="flex flex-wrap gap-2 flex-1 xl:flex-none min-w-0">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateTags}
                  className="gap-1 sm:gap-2 text-xs sm:text-sm flex-1 xl:flex-none py-2 whitespace-nowrap"
                  disabled={loadingTags}
                  data-testid="refine-tags-btn"
                >
                  <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
                  Refine
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={copyTags}
                  className="gap-1 sm:gap-2 text-xs sm:text-sm flex-1 xl:flex-none py-2 whitespace-nowrap"
                  data-testid="copy-tags-btn"
                >
                  <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
                  Copy All
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <TagDetailDialog detail={tagDetail} onClose={() => setTagDetail(null)} onCopy={copyOneTag} onRemove={removeTagByName} />
      {!resultsCollapsed && (
        <div className="workflow-inline-output-body">
          {hasGeneratedTags ? (
            <div className="space-y-3 mb-3">
              <TagLimitMeter tags={generatedTags} />
              {hasScores ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <TagViewToggle value={tagView} onChange={setTagView} />
                  {tagView === "tags" ? <DemandLegend tags={generatedTags} scoreFor={scoreFor} /> : null}
                </div>
              ) : null}
            </div>
          ) : null}
          {hasGeneratedTags && tagView === "ranking" && hasScores ? (
            <TagRanking tags={generatedTags} scoreFor={scoreFor} onOpen={(entry, rank) => setTagDetail({ entry, rank })} />
          ) : hasGeneratedTags ? (
            <div className="tag-cloud" data-testid="tags-list">
              {generatedTags.map((tag, index) => {
                const scoreEntry = generatedTagScores[normalizeTagKey(tag)];
                const badgeStyle = getTagScoreBadgeStyle(scoreEntry?.score);
                return (
                <span
                  key={index}
                  className="tag-item group relative"
                  data-testid={`tag-${index}`}
                  title={buildTagScoreTooltip(scoreEntry, tag)}
                  onClick={scoreEntry?.score ? () => setTagDetail({ entry: scoreEntry, rank: rankOf(tag) }) : undefined}
                  style={scoreEntry?.score ? { cursor: "pointer" } : undefined}
                >
                  {scoreEntry?.score ? (
                    <span className="mr-2 inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-semibold" style={badgeStyle}>
                      {scoreEntry.score}
                    </span>
                  ) : null}
                  {tag}
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await handleRemoveGeneratedTag(index);
                    }}
                    className="ml-2 smb-danger opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete tag"
                    aria-label="Delete tag"
                  >
                    x
                  </button>
                </span>
              );
              })}
            </div>
          ) : (
            <div className="workflow-output-empty-state rounded-lg border border-dashed px-4 py-6 text-center text-sm" style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>
              Your high-intent tag set will appear here after generation. If nothing passes the score gate, try a broader artist query or add custom tags.
            </div>
          )}

          {hasGeneratedTags && (
            <div className="workflow-inline-output-tools">
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="additional-tags" className="font-semibold text-sm sm:text-base">
                    <Plus className="inline h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    Add More Tags
                  </Label>
                  <span className="text-xs sm:text-sm" style={{ color: "var(--text-secondary)" }}>
                    {generatedTags.length}/{tagLimit}
                  </span>
                </div>
                <Textarea
                  id="additional-tags"
                  placeholder="Add more tags (comma-separated)"
                  value={additionalTags}
                  onChange={(e) => setAdditionalTags(e.target.value)}
                  rows={2}
                  disabled={generatedTags.length >= tagLimit}
                  className="text-sm sm:text-base"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddMoreTags}
                  disabled={generatedTags.length >= tagLimit || !additionalTags.trim()}
                  className="w-full gap-1 sm:gap-2 text-sm py-2.5"
                >
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                  {generatedTags.length >= tagLimit ? `Limit Reached (${tagLimit})` : "Add Tags"}
                </Button>
              </div>
            </div>
          )}

          {canViewTagDebug && hasGeneratedTags && (
            <div className="workflow-inline-output-tools">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm sm:text-base font-semibold">Tag Generation Debug</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowTagDebug((prev) => !prev)}
                  className="text-xs sm:text-sm"
                  disabled={!tagDebug}
                >
                  {showTagDebug ? "Hide Debug" : "Show Debug"}
                </Button>
              </div>
              {tagDebug ? (
                <>
                  <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                    Source mix, selected tags, and de-duplication drops for this generation.
                  </p>

                  {showTagDebug && (
                    <div className="mt-3 space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        {Object.entries(tagDebug?.source_counts || {}).map(([key, value]) => (
                          <div key={key} className="rounded-md border px-2 py-1" style={{ borderColor: "var(--border-color)" }}>
                            <p className="font-semibold">{String(value)}</p>
                            <p style={{ color: "var(--text-secondary)" }}>{key.replaceAll("_", " ")}</p>
                          </div>
                        ))}
                      </div>

                      {Object.keys(tagDebug?.source_status || {}).length > 0 && (
                        <div className="rounded-md border px-2 py-2 text-xs" style={{ borderColor: "var(--border-color)" }}>
                          <p className="font-semibold mb-1">Source Status</p>
                          {Object.entries(tagDebug?.source_status || {}).map(([key, value]) => (
                            <p key={key} style={{ color: "var(--text-secondary)" }}>
                              {key}: {String(value)}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p className="mt-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                  Debug data will appear here after a tag generation is loaded.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const [showAllRuns, setShowAllRuns] = useState(false);
  const visibleRuns = showAllRuns ? tagHistory : tagHistory.slice(0, 6);

  const renderEditorCard = () => (
    <Card className="dashboard-card tags-studio-card h-full">
      <CardHeader className="px-4 sm:px-6 pt-5 pb-3">
        <div className="wf-head">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="h-5 w-5 flex-shrink-0" />
            <CardTitle className="text-lg sm:text-xl">Generate YouTube Tags</CardTitle>
          </div>
          <span className="smb-mono smb-t3 text-xs whitespace-nowrap">60–80 tags · 1 credit</span>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-5">
        <form onSubmit={handleGenerateTags} className="space-y-5" data-testid="tag-generator-form">
          <div className="space-y-2">
            <Label htmlFor="tag-query" className="smb-eyebrow">Search Query</Label>
            <div className="wf-search">
              <Input
                id="tag-query"
                placeholder="e.g., lil uzi, travis scott, dark trap beat"
                value={tagQuery}
                onChange={(e) => setTagQuery(e.target.value)}
                data-testid="tag-query-input"
              />
              <Button type="submit" className="smb-btn smb-btn--pri" disabled={loadingTags} data-testid="generate-tags-btn">
                <Sparkles className="h-4 w-4" />
                {loadingTags ? "Generating…" : "Generate"}
              </Button>
            </div>
            <p className="smb-t3 text-xs">Tip: include the artist’s name to get “type beat” variations people search for.</p>
          </div>

          <div className="space-y-2">
            <div className="wf-head">
              <p className="smb-eyebrow">
                Recent Runs{tagHistory.length ? ` · ${tagHistory.length}` : ""}
              </p>
              <div className="flex items-center gap-2">
                {selectedTagHistoryIds.length > 0 && (
                  <Button type="button" variant="ghost" size="sm" onClick={handleClearTagSelection} className="text-xs h-8">
                    Clear
                  </Button>
                )}
                {selectedTagHistoryIds.length >= 2 || joiningTagsLoading ? (
                  <Button type="button" size="sm" onClick={handleJoinSelectedTagHistory} disabled={joiningTagsLoading} className="smb-btn smb-btn--sec smb-btn--sm">
                    {joiningTagsLoading ? `Joining… ${joiningTagsProgress}%` : `Join ${selectedTagHistoryIds.length} with AI`}
                  </Button>
                ) : tagHistory.length > 1 ? (
                  <span className="smb-t3 text-xs">Pick two or more to join them</span>
                ) : null}
              </div>
            </div>
            {joiningTagsLoading && <p className="smb-t2 text-xs">Optimizing combined tags with AI…</p>}
            {tagHistory.length > 0 ? (
              <>
                <div className="wf-runs">
                  {visibleRuns.map((item) => {
                    const displayLabel = formatTagHistoryLabel(item.query);
                    const isSelected = selectedTagHistoryIds.includes(item.id);
                    const isActive = activeTagHistoryId === item.id;
                    return (
                      <div
                        key={item.id}
                        role="button"
                        tabIndex={0}
                        className={`wf-run group ${isActive ? "is-active" : isSelected ? "is-selected" : ""}`}
                        onClick={() => handleTagHistoryTileClick(item)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleTagHistoryTileClick(item);
                          }
                        }}
                        data-testid="tag-history-item"
                      >
                        <span className="wf-run-dot" aria-hidden="true" />
                        <span className="wf-run-name" title={displayLabel}>{displayLabel}</span>
                        <span className="smb-mono smb-t3 text-xs whitespace-nowrap">{item.tags.length} tags</span>
                        <span className="wf-run-status">{isActive ? "Current set" : isSelected ? "Queued to join" : "Reopen"}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity smb-danger hover:bg-[var(--c-dangersoft)] flex-shrink-0"
                          aria-label={`Delete ${displayLabel}`}
                          onClick={async (e) => {
                            e.stopPropagation();
                            await handleDeleteTagHistoryItem(item.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
                {tagHistory.length > 6 ? (
                  <Button type="button" variant="ghost" size="sm" className="w-full text-xs" onClick={() => setShowAllRuns((v) => !v)}>
                    {showAllRuns ? "Show fewer" : `Show all ${tagHistory.length} runs`}
                  </Button>
                ) : null}
              </>
            ) : (
              <div className="wf-empty">Your tag runs show up here. Type an artist above to make the first one.</div>
            )}
          </div>

          {showInlineOutput ? renderResultsPanel({ inline: true }) : null}
        </form>
      </CardContent>
    </Card>
  );

  if (mode === "editor") return renderEditorCard();
  if (mode === "results") return renderResultsPanel();

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
      {renderEditorCard()}
      {renderResultsPanel()}
    </div>
  );
};

export default TagsSection;
