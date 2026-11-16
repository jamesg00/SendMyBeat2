import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp, Copy, Edit, Save, Trash2 } from "lucide-react";

// Descriptions: write one (or start from a template or a saved one), save it, reuse it.

const YOUTUBE_LIMIT = 5000; // YouTube's description limit

const wordCount = (text = "") => (text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0);
const firstLine = (text = "") => (text.split("\n").find((line) => line.trim()) || "").trim();

/**
 * "Start from" picker: one button that opens a list of templates and your saved descriptions,
 * with a preview of whichever one you're pointing at.
 */
const StartFromPicker = ({ templates, saved, onPickTemplate, onPickSaved, current }) => {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(null);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const items = [
    ...templates.map((t) => ({ key: `t-${t.id}`, kind: "template", name: t.name, blurb: t.blurb, content: t.content || "", source: t })),
    ...saved.map((d) => ({ key: `s-${d.id}`, kind: "saved", name: d.title, blurb: firstLine(d.content) || `${wordCount(d.content)} words`, content: d.content || "", source: d })),
  ];
  const preview = items.find((item) => item.key === hover) || items[0];
  const pick = (item) => {
    if (item.kind === "template") onPickTemplate(item.source);
    else onPickSaved(item.source);
    setOpen(false);
  };
  const group = (kind, title) => {
    const list = items.filter((item) => item.kind === kind);
    if (!list.length) return null;
    return (
      <div className="ds-pick-group" role="group" aria-label={title}>
        <p className="ds-pick-label">{title}</p>
        {list.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`ds-pick-item ${preview?.key === item.key ? "is-hot" : ""} ${current === item.key ? "is-current" : ""}`}
            onMouseEnter={() => setHover(item.key)}
            onFocus={() => setHover(item.key)}
            onClick={() => pick(item)}
          >
            <b>{item.name}</b>
            <span>{item.blurb}</span>
          </button>
        ))}
      </div>
    );
  };
  const currentItem = items.find((item) => item.key === current);

  return (
    <div className="ds-pick" ref={rootRef}>
      <button type="button" className="ds-pick-trigger" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="listbox">
        <span className="ds-pick-trigger-text">
          <span className="ds-pick-label">Start from</span>
          <b>{currentItem ? currentItem.name : "A template or a saved description"}</b>
        </span>
        <ChevronDown className={`h-4 w-4 ds-pick-chevron ${open ? "is-open" : ""}`} aria-hidden="true" />
      </button>
      {open ? (
        <div className="ds-pick-panel" role="listbox" aria-label="Start from">
          <div className="ds-pick-list">
            {group("template", "Templates")}
            {group("saved", "Your saved")}
          </div>
          {preview ? (
            <div className="ds-pick-preview" aria-live="polite">
              <p className="ds-pick-label">{preview.kind === "template" ? "Template preview" : "Saved description"}</p>
              <pre>{preview.content}</pre>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

const DescriptionsSection = ({
  mode = "full",
  showInlineOutput = true,
  descriptions,
  newDescription,
  descriptionTemplates,
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
  const [startedFrom, setStartedFrom] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const draftWords = wordCount(newDescription.content);
  const draftChars = (newDescription.content || "").length;
  const hasSavedDescriptions = descriptions.length > 0;

  const renderSavedPanel = ({ inline = false } = {}) => (
    <div className={`workflow-output-card ds-saved ${hasSavedDescriptions ? "" : "workflow-output-card--empty"} ${inline ? "workflow-inline-output" : ""}`}>
      <button type="button" className="ds-saved-head" onClick={() => setSavedCollapsed((prev) => !prev)} aria-expanded={!savedCollapsed}>
        <span className="ds-saved-title">
          <h3>Saved Descriptions</h3>
          <span className="description-inline-stat">{hasSavedDescriptions ? `${descriptions.length} saved` : "None yet"}</span>
        </span>
        <span className="ds-saved-toggle">
          {savedCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          {savedCollapsed ? "Expand" : "Collapse"}
        </span>
      </button>
      {!savedCollapsed && (
        <div className="ds-saved-body">
          {!hasSavedDescriptions ? (
            <div className="ds-empty" data-testid="no-descriptions-msg">
              No saved descriptions yet. Your reusable versions will show up here after you save one.
            </div>
          ) : (
            <ul className="ds-saved-list" data-testid="descriptions-list">
              {descriptions.map((desc) => {
                const isExpanded = expandedDescriptions.has(desc.id);
                const words = wordCount(desc.content);
                return (
                  <li key={desc.id} className={`ds-saved-item ${isExpanded ? "is-open" : ""}`} data-testid={`desc-item-${desc.id}`}>
                    <div className="ds-saved-row">
                      <button type="button" className="ds-saved-main" onClick={() => toggleDescriptionExpand(desc.id)} aria-expanded={isExpanded}>
                        <b className="truncate">{desc.title}</b>
                        <span className="ds-saved-meta">
                          {words} words
                          {!isExpanded && firstLine(desc.content) ? <span className="ds-saved-first"> · {firstLine(desc.content)}</span> : null}
                        </span>
                      </button>
                      <div className="ds-saved-actions">
                        <Button size="sm" variant="ghost" className="ds-icon-btn" onClick={() => copyDescription(desc.content)} title="Copy" aria-label={`Copy ${desc.title}`} data-testid={`copy-desc-${desc.id}`}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="ds-icon-btn"
                          onClick={() => {
                            setEditingDesc(desc);
                            setEditOpen(true);
                          }}
                          title="Edit"
                          aria-label={`Edit ${desc.title}`}
                          data-testid={`edit-desc-${desc.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="ds-icon-btn ds-icon-btn--danger" onClick={() => handleDeleteDescription(desc.id)} title="Delete" aria-label={`Delete ${desc.title}`} data-testid={`delete-desc-${desc.id}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {isExpanded ? <pre className="ds-saved-content">{desc.content}</pre> : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <Dialog open={editOpen && Boolean(editingDesc)} onOpenChange={setEditOpen}>
        <DialogContent className="ds-edit-dialog bg-[var(--card-bg)] border border-[var(--border-color)]">
          <DialogHeader>
            <DialogTitle>Edit description</DialogTitle>
            <DialogDescription>Changes are saved to this description.</DialogDescription>
          </DialogHeader>
          {editingDesc && (
            <div className="ds-edit">
              <label className="ds-field">
                <span className="ds-label">Name</span>
                <Input value={editingDesc.title} onChange={(e) => setEditingDesc({ ...editingDesc, title: e.target.value })} data-testid="edit-title-input" />
              </label>
              <label className="ds-field">
                <span className="ds-label">
                  Content
                  <span className={(editingDesc.content || "").length > YOUTUBE_LIMIT ? "smb-danger" : ""}>
                    {(editingDesc.content || "").length}/{YOUTUBE_LIMIT}
                  </span>
                </span>
                <Textarea rows={12} className="ds-textarea" value={editingDesc.content} onChange={(e) => setEditingDesc({ ...editingDesc, content: e.target.value })} data-testid="edit-content-input" />
              </label>
              <div className="ds-edit-actions">
                <Button className="smb-btn smb-btn--sec" onClick={() => setEditOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    await handleUpdateDescription();
                    setEditOpen(false);
                  }}
                  className="smb-btn smb-btn--pri"
                  data-testid="update-desc-btn"
                >
                  Save changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
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
      <CardContent className="px-4 sm:px-6 pb-5 ds-editor">
        <div className="ds-field">
          <span className="ds-label">Quick Starts</span>
          <StartFromPicker
            templates={descriptionTemplates}
            saved={descriptions}
            current={startedFrom}
            onPickTemplate={(template) => {
              setStartedFrom(`t-${template.id}`);
              handleApplyDescriptionTemplate(template);
            }}
            onPickSaved={(desc) => {
              setStartedFrom(`s-${desc.id}`);
              setNewDescription({ title: `${desc.title} (copy)`, content: desc.content });
            }}
          />
          <p className="smb-t3 text-xs">Picking one fills the content below. Fill in the blanks, then save it under your own name.</p>
        </div>

        <div className="ds-field">
          <Label htmlFor="desc-title" className="ds-label">
            Template Name
          </Label>
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

        <div className="ds-field">
          <div className="ds-label">
            <Label htmlFor="desc-content">Content</Label>
            <span className={draftChars > YOUTUBE_LIMIT ? "smb-danger" : ""}>
              {draftWords} words · {draftChars}/{YOUTUBE_LIMIT}
            </span>
          </div>
          <Textarea
            id="desc-content"
            className="ds-textarea"
            placeholder="Write your description here: purchase links, contact, credits…"
            rows={10}
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

        <div className="ds-save-row">
          <p className="smb-t3 text-xs">Shift+Enter saves.</p>
          <div className="ds-save-actions">
            {newDescription.content || newDescription.title ? (
              <Button
                type="button"
                className="smb-btn smb-btn--sec"
                onClick={() => {
                  setNewDescription({ title: "", content: "" });
                  setStartedFrom(null);
                }}
              >
                Clear
              </Button>
            ) : null}
            <Button onClick={handleSaveDescription} className="smb-btn smb-btn--pri" disabled={loadingDescriptions} data-testid="save-desc-btn">
              <Save className="h-4 w-4" />
              Save to My Templates
            </Button>
          </div>
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
