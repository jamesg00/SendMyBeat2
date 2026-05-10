import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp, Copy, Plus, Sparkles, Trash2 } from "lucide-react";

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
}) => {
  const [resultsCollapsed, setResultsCollapsed] = useState(mode === "results");
  const hasGeneratedTags = generatedTags.length > 0;

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
            {!hasGeneratedTags && (
              <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                Run a search to load your first tag set.
              </p>
            )}
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
            ) : (
              <span className="tags-inline-stat">Waiting for first run</span>
            )}
          </div>
        </div>
      </div>

      {!resultsCollapsed && (
        <div className="workflow-inline-output-body">
          {hasGeneratedTags ? (
            <div className="tag-cloud" data-testid="tags-list">
              {generatedTags.map((tag, index) => (
                <span
                  key={index}
                  className="tag-item group relative"
                  data-testid={`tag-${index}`}
                  title={generatedTagScores[normalizeTagKey(tag)]?.reason || tag}
                >
                  {generatedTagScores[normalizeTagKey(tag)]?.score ? (
                    <span className="mr-2 inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-semibold" style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>
                      {generatedTagScores[normalizeTagKey(tag)]?.score}
                    </span>
                  ) : null}
                  {tag}
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await handleRemoveGeneratedTag(index);
                    }}
                    className="ml-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-700"
                    title="Delete tag"
                    aria-label="Delete tag"
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <div className="workflow-output-empty-state rounded-lg border border-dashed px-4 py-6 text-center text-sm" style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>
              Your generated tag set will appear here after the first run.
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

  const renderEditorCard = () => (
    <Card className="dashboard-card tags-studio-card h-full">
      <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
            <CardTitle className="text-base sm:text-lg md:text-xl">Generate YouTube Tags</CardTitle>
          </div>
          <CardDescription className="text-xs sm:text-sm max-w-2xl">
            Run one query, get a usable tag set, refine only if needed.
          </CardDescription>
          <div className="grid grid-cols-2 gap-2">
            <div className="tags-studio-chip">
              <p className="tags-studio-chip-value">{tagHistory.length}</p>
              <p className="tags-studio-chip-label">Saved Runs</p>
            </div>
            <div className="tags-studio-chip">
              <p className="tags-studio-chip-value">{generatedTags.length || "--"}</p>
              <p className="tags-studio-chip-label">Current Tags</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
        <form onSubmit={handleGenerateTags} className="space-y-3 sm:space-y-4" data-testid="tag-generator-form">
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="tag-query" className="text-sm sm:text-base">Search Query</Label>
            <Input
              id="tag-query"
              placeholder="e.g., lil uzi, travis scott, dark trap beat"
              value={tagQuery}
              onChange={(e) => setTagQuery(e.target.value)}
              data-testid="tag-query-input"
              className="text-sm sm:text-base"
            />
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Tip: Include artist name for popular song "type beat" variations
            </p>
          </div>

          <div className="tags-recent-panel">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
              <div>
                <p className="text-sm sm:text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                  Recent Runs
                </p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  Reopen an older tag set without leaving the flow.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <span className="tags-inline-stat">
                  {selectedTagHistoryIds.length} selected
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleJoinSelectedTagHistory}
                  disabled={selectedTagHistoryIds.length < 2 || joiningTagsLoading}
                  className={`text-xs sm:text-sm ${selectedTagHistoryIds.length < 2 ? "opacity-60" : ""}`}
                >
                  {joiningTagsLoading ? `Joining... ${joiningTagsProgress}%` : "Join Selected"}
                </Button>
                {selectedTagHistoryIds.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearTagSelection}
                    className="text-xs sm:text-sm"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
            {joiningTagsLoading && (
              <p className="mt-2 text-xs sm:text-sm" style={{ color: "var(--text-secondary)" }}>
                Optimizing combined tags with AI...
              </p>
            )}
            {tagHistory.length > 0 ? (
              <div className="mt-3">
                <div className="tags-recent-grid">
                  {tagHistory.slice(0, 6).map((item) => {
                    const displayLabel = formatTagHistoryLabel(item.query);
                    const isSelected = selectedTagHistoryIds.includes(item.id);
                    const isActive = activeTagHistoryId === item.id;
                    return (
                      <div
                        key={item.id}
                        className="tags-recent-tile group"
                        style={{
                          borderColor: isActive ? "var(--accent-primary)" : isSelected ? "var(--accent-secondary)" : "var(--border-color)"
                        }}
                        onClick={() => handleTagHistoryTileClick(item)}
                        data-testid="tag-history-item"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <p
                              className="text-sm font-medium leading-snug break-words"
                              style={{ color: "var(--text-primary)" }}
                              title={displayLabel}
                            >
                              {displayLabel}
                            </p>
                            <p className="mt-1 text-xs break-words" style={{ color: "var(--text-secondary)" }}>
                              {item.tags.length} tags
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                            onClick={async (e) => {
                              e.stopPropagation();
                              await handleDeleteTagHistoryItem(item.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span className="tags-recent-status">
                            {isActive ? "Current set" : isSelected ? "Queued to join" : "Reopen"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mt-3 rounded-lg border border-dashed px-3 py-5 text-center text-xs sm:text-sm" style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>
                Your recent tag generations will show up here.
              </div>
            )}
          </div>

          <Button
            type="submit"
            className="w-full text-sm sm:text-base py-5 sm:py-6"
            disabled={loadingTags}
            data-testid="generate-tags-btn"
          >
            {loadingTags ? "Generating Tags..." : "Generate 60-80 Tags"}
          </Button>

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
