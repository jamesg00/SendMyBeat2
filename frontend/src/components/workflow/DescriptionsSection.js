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
  showInlineOutput = true,
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
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-semibold">Saved Descriptions</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto xl:justify-end">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSavedCollapsed((prev) => !prev)}
              className="gap-1 text-xs sm:text-sm whitespace-nowrap shrink-0"
              aria-expanded={!savedCollapsed}
            >
              {savedCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              {savedCollapsed ? "Expand" : "Collapse"}
            </Button>
            <span className="description-inline-stat whitespace-nowrap">{hasSavedDescriptions ? `${descriptions.length} saved` : "Waiting for first save"}</span>
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
                  <div key={desc.id} className="description-entry-card description-saved-card min-w-0 overflow-hidden" data-testid={`desc-item-${desc.id}`}>
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
                          className="smb-danger hover:bg-[var(--c-dangersoft)]"
                          onClick={() => handleDeleteDescription(desc.id)}
                          data-testid={`delete-desc-${desc.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div
                      className="description-saved-content text-sm whitespace-pre-wrap cursor-pointer"
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
      <CardHeader className="px-4 sm:px-6 pt-5 pb-3">
        <div className="wf-head">
          <div className="flex items-center gap-2 min-w-0">
            <Save className="h-5 w-5 flex-shrink-0" />
            <CardTitle className="text-lg sm:text-xl">Template Descriptions</CardTitle>
          </div>
          <span className="smb-mono smb-t3 text-xs whitespace-nowrap">{descriptions.length} saved</span>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-5 space-y-5">
        <div className="space-y-2">
          <div className="wf-head">
            <Label className="smb-eyebrow">Quick Starts</Label>
            {descriptionTemplates.length > 2 ? (
              <Button type="button" variant="ghost" size="sm" className="text-xs h-8" onClick={() => setShowAllDescriptionTemplates((prev) => !prev)}>
                {showAllDescriptionTemplates ? "Show fewer" : `Show all ${descriptionTemplates.length}`}
              </Button>
            ) : null}
          </div>
          <div className="wf-templates">
            {visibleDescriptionTemplates.map((template) => (
              <button key={template.id} type="button" className="wf-template" onClick={() => handleApplyDescriptionTemplate(template)}>
                <span className="wf-template-name">{template.name}</span>
                <span className="wf-template-blurb">{template.blurb}</span>
              </button>
            ))}
          </div>
          <p className="smb-t3 text-xs">Picking one fills the content below; the name stays as you typed it.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="desc-title" className="smb-eyebrow">Template Name</Label>
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
          <div className="wf-head">
            <Label htmlFor="desc-content" className="smb-eyebrow">Content</Label>
            <span className="smb-mono smb-t3 text-xs">
              {draftWords} words · {(newDescription.content || "").length} chars
            </span>
          </div>
          <Textarea
            id="desc-content"
            placeholder="Write your description here: purchase links, contact, credits…"
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
        </div>

        <div className="wf-head">
          <p className="smb-t3 text-xs">Shift+Enter saves.</p>
          <Button onClick={handleSaveDescription} className="smb-btn smb-btn--pri" disabled={loadingDescriptions} data-testid="save-desc-btn">
            <Save className="h-4 w-4" />
            Save to My Templates
          </Button>
        </div>

        {showInlineOutput ? renderSavedPanel({ inline: true }) : null}
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
