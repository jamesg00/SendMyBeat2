import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp, Copy, Edit, Save, Trash2 } from "lucide-react";

const DescriptionsSection = ({
  mode = "full",
  descriptions,
  newDescription,
  visibleDescriptionTemplates,
  descriptionTemplates,
  showAllDescriptionTemplates,
  setShowAllDescriptionTemplates,
  handleApplyDescriptionTemplate,
  setNewDescription,
  handleSaveDescription,
  loadingDescriptions,
  expandedDescriptions,
  editingDesc,
  setEditingDesc,
  handleUpdateDescription,
  handleDeleteDescription,
  copyDescription,
  toggleDescriptionExpand,
}) => {
  const [savedCollapsed, setSavedCollapsed] = useState(mode === "results");
  const draftWords = newDescription.content.trim() ? newDescription.content.trim().split(/\s+/).filter(Boolean).length : 0;
  const hasSavedDescriptions = descriptions.length > 0;

  const renderSavedPanel = ({ inline = false } = {}) => (
    <div className={`workflow-output-card ${hasSavedDescriptions ? "" : "workflow-output-card--empty"} ${inline ? "workflow-inline-output" : ""}`}>
      <div className="workflow-inline-output-header">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm sm:text-base font-semibold">Saved Descriptions</h3>
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
              Reusable versions live here once you save them.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSavedCollapsed((prev) => !prev)}
              className="gap-1 text-xs sm:text-sm"
              aria-expanded={!savedCollapsed}
            >
              {savedCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              {savedCollapsed ? "Expand" : "Collapse"}
            </Button>
            <span className="description-inline-stat">{hasSavedDescriptions ? `${descriptions.length} saved` : "Waiting for first save"}</span>
          </div>
        </div>
      </div>
      {!savedCollapsed && (
        <div className="workflow-inline-output-body">
          {!hasSavedDescriptions ? (
            <div
              className="workflow-output-empty-state rounded-lg border border-dashed px-4 py-6 text-center text-sm"
              style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
              data-testid="no-descriptions-msg"
            >
              No saved descriptions yet. Your reusable versions will show up here after you save one.
            </div>
          ) : (
            <div className="description-saved-grid" data-testid="descriptions-list">
              {descriptions.map((desc) => {
                const isExpanded = expandedDescriptions.has(desc.id);
                const preview = desc.content.substring(0, 150);
                const showPreview = !isExpanded && desc.content.length > 150;
                const words = desc.content.trim() ? desc.content.trim().split(/\s+/).filter(Boolean).length : 0;

                return (
                  <div key={desc.id} className="description-entry-card description-saved-card" data-testid={`desc-item-${desc.id}`}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate" style={{ color: "var(--text-primary)" }}>{desc.title}</h3>
                        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{words} words</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyDescription(desc.content)}
                          data-testid={`copy-desc-${desc.id}`}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingDesc(desc)}
                              data-testid={`edit-desc-${desc.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Description</DialogTitle>
                              <DialogDescription>Make changes to your description</DialogDescription>
                            </DialogHeader>
                            {editingDesc && (
                              <div className="space-y-4">
                                <Input
                                  value={editingDesc.title}
                                  onChange={(e) => setEditingDesc({ ...editingDesc, title: e.target.value })}
                                  data-testid="edit-title-input"
                                />
                                <Textarea
                                  rows={8}
                                  value={editingDesc.content}
                                  onChange={(e) => setEditingDesc({ ...editingDesc, content: e.target.value })}
                                  data-testid="edit-content-input"
                                />
                                <Button onClick={handleUpdateDescription} className="w-full" data-testid="update-desc-btn">
                                  Save Changes
                                </Button>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteDescription(desc.id)}
                          data-testid={`delete-desc-${desc.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div
                      className="text-sm whitespace-pre-wrap cursor-pointer"
                      style={{ color: "var(--text-primary)" }}
                      onClick={() => toggleDescriptionExpand(desc.id)}
                    >
                      {showPreview ? (
                        <>
                          {preview}...
                          <span className="description-expand-hint">Click to expand</span>
                        </>
                      ) : (
                        <>
                          {desc.content}
                          {desc.content.length > 150 && (
                            <span className="description-expand-hint block mt-2">Click to collapse</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderEditorCard = () => (
    <Card className="dashboard-card description-studio-card h-full">
      <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
            <Save className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
            <CardTitle className="text-base sm:text-lg md:text-xl">Template Descriptions</CardTitle>
          </div>
          <CardDescription className="text-xs sm:text-sm max-w-2xl">
            Pick a starter, shape the draft, save only the versions worth reusing.
          </CardDescription>
          <div className="grid grid-cols-2 gap-2">
            <div className="description-studio-chip">
              <p className="description-studio-chip-value">{visibleDescriptionTemplates.length}</p>
              <p className="description-studio-chip-label">Starter Templates</p>
            </div>
            <div className="description-studio-chip">
              <p className="description-studio-chip-value">{draftWords}</p>
              <p className="description-studio-chip-label">Draft Words</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4 sm:space-y-5">
        <div className="description-templates-panel">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <Label>Quick Starts</Label>
              <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                Built-in starters. They do not save until you edit and keep one.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs description-inline-meta" style={{ color: "var(--text-secondary)" }}>
                {visibleDescriptionTemplates.length}/{descriptionTemplates.length}
              </span>
              {descriptionTemplates.length > 2 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 text-xs"
                  onClick={() => setShowAllDescriptionTemplates((prev) => !prev)}
                >
                  {showAllDescriptionTemplates ? "Show Less" : "Show All"}
                </Button>
              )}
            </div>
          </div>
          <div className="description-template-grid">
            {visibleDescriptionTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                className="description-template-button"
                onClick={() => handleApplyDescriptionTemplate(template)}
              >
                <p className="text-sm font-semibold description-template-name" style={{ color: "var(--text-primary)" }}>
                  {template.name}
                </p>
                <p className="mt-1 text-xs description-template-blurb" style={{ color: "var(--text-secondary)" }}>
                  {template.blurb}
                </p>
              </button>
            ))}
          </div>
          <p className="description-panel-note">
            Applying one fills the description body only.
          </p>
        </div>

        <div className="description-editor-grid">
          <div className="space-y-2">
            <Label htmlFor="desc-title">Template Name</Label>
            <Input
              id="desc-title"
              placeholder="e.g., Free For Profit Template"
              value={newDescription.title}
              onChange={(e) => setNewDescription({ ...newDescription, title: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newDescription.content.trim()) {
                  e.preventDefault();
                  handleSaveDescription();
                }
              }}
              data-testid="desc-title-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc-content">Content</Label>
            <Textarea
              id="desc-content"
              placeholder="Write your description here..."
              rows={9}
              value={newDescription.content}
              onChange={(e) => setNewDescription({ ...newDescription, content: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.shiftKey && newDescription.title.trim()) {
                  e.preventDefault();
                  handleSaveDescription();
                }
              }}
              data-testid="desc-content-input"
            />
            <div className="flex justify-between items-center text-xs gap-3">
              <p style={{ color: "var(--text-secondary)" }}>
                Press Enter for a new line. Use Shift+Enter to save.
              </p>
              <p style={{ color: "var(--text-secondary)" }}>
                {(newDescription.content || "").length} chars
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={handleSaveDescription}
          className="w-full"
          disabled={loadingDescriptions}
          data-testid="save-desc-btn"
        >
          Save to My Templates
        </Button>

        {renderSavedPanel({ inline: true })}
      </CardContent>
    </Card>
  );

  if (mode === "editor") return renderEditorCard();
  if (mode === "results") return renderSavedPanel();

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
      {renderEditorCard()}
      {renderSavedPanel()}
    </div>
  );
};

export default DescriptionsSection;
