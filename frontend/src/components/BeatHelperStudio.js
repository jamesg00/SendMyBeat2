import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Image as ImageIcon,
  LoaderCircle,
  Mail,
  Music2,
  Phone,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Trash2,
  UploadCloud,
  Wand2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const STATUS_CLASS = {
  queued: "bg-amber-500/15 text-amber-200 border-amber-300/30",
  pending_approval: "bg-sky-500/15 text-sky-200 border-sky-300/30",
  approved: "bg-emerald-500/15 text-emerald-200 border-emerald-300/30",
  uploaded: "bg-green-500/15 text-green-200 border-green-300/30",
  skipped: "bg-zinc-500/20 text-zinc-200 border-zinc-300/20",
};

const formatUploadLabel = (file) => {
  if (!file) return "Unknown file";
  const date = file.uploaded_at ? new Date(file.uploaded_at).toLocaleDateString() : "";
  return date ? `${file.original_filename} - ${date}` : file.original_filename;
};

const formatSectionBadge = (audioCount = 0, imageCount = 0) => {
  return `${audioCount}A / ${imageCount}V`;
};

const SURFACE_BORDER = "color-mix(in srgb, var(--text-primary) 18%, var(--border-color))";
const SURFACE_BG = "color-mix(in srgb, var(--bg-secondary) 92%, black)";
const INNER_SURFACE_BG = "color-mix(in srgb, var(--bg-secondary) 82%, black)";

const compactTags = (tags = [], limit = 4) => {
  const safeTags = Array.isArray(tags) ? tags.filter(Boolean) : [];
  return {
    visible: safeTags.slice(0, limit),
    remaining: Math.max(0, safeTags.length - limit),
  };
};

const StatCard = ({ icon: Icon, label, value }) => (
  <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border-color)", background: "rgba(255,255,255,0.05)" }}>
    <div className="flex items-center gap-2 whitespace-nowrap text-[11px] uppercase tracking-[0.12em] sm:tracking-[0.18em]" style={{ color: "var(--text-secondary)" }}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </div>
    <div className="mt-3 text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>{value}</div>
  </div>
);

const StudioSection = ({ title, description, badge, open, onOpenChange, locked = false, lockMessage = "Complete the previous step to unlock this section.", children }) => (
  <Collapsible open={open} onOpenChange={onOpenChange}>
    <div
      className="overflow-hidden rounded-3xl border-2 shadow-[0_10px_40px_rgba(0,0,0,0.18)]"
      style={{ borderColor: SURFACE_BORDER, background: SURFACE_BG }}
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          disabled={locked}
          className="flex w-full items-start justify-between gap-3 border-b px-4 py-4 text-left sm:px-5"
          style={{ borderColor: open ? SURFACE_BORDER : "transparent", opacity: locked ? 0.6 : 1, cursor: locked ? "not-allowed" : "pointer" }}
        >
          <div className="min-w-0 flex-1 pr-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="break-words text-base font-semibold leading-6" style={{ color: "var(--text-primary)" }}>{title}</p>
              {badge ? <Badge className="inline-flex max-w-full shrink-0 whitespace-nowrap border px-2.5 py-1 text-[10px] uppercase tracking-[0.08em] sm:tracking-[0.14em]" style={{ borderColor: SURFACE_BORDER, background: "color-mix(in srgb, var(--accent-primary) 14%, transparent)", color: "var(--text-primary)" }}>{badge}</Badge> : null}
              {locked ? <Badge className="inline-flex shrink-0 whitespace-nowrap border px-2.5 py-1 text-[10px] uppercase tracking-[0.08em] sm:tracking-[0.14em]" style={{ borderColor: SURFACE_BORDER, background: "rgba(255,255,255,0.04)", color: "var(--text-secondary)" }}>Locked</Badge> : null}
            </div>
            <p className="mt-1 break-words text-sm leading-6" style={{ color: "var(--text-secondary)" }}>{locked ? lockMessage : description}</p>
          </div>
          <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} style={{ color: "var(--text-secondary)" }} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent forceMount={locked}>
        <div className="px-4 py-4 sm:px-5" style={{ background: INNER_SURFACE_BG }}>
          {locked ? (
            <div className="rounded-2xl border-2 px-4 py-4 text-sm" style={{ borderColor: SURFACE_BORDER, color: "var(--text-secondary)", background: "rgba(255,255,255,0.02)" }}>
              {lockMessage}
            </div>
          ) : children}
        </div>
      </CollapsibleContent>
    </div>
  </Collapsible>
);

const AssetDropzone = ({ title, subtitle, accept, loading, onFileUpload, currentLabel, emptyLabel }) => {
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = (fileList) => {
    const file = fileList?.[0];
    if (file) onFileUpload(file);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Label>{title}</Label>
          {subtitle ? <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>{subtitle}</p> : null}
        </div>
        {loading ? (
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs" style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            Uploading
          </div>
        ) : null}
      </div>

      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`w-full rounded-3xl border-2 border-dashed px-5 py-6 text-left transition ${dragActive ? "scale-[1.01]" : ""}`}
        style={{
          borderColor: dragActive ? "var(--accent-primary)" : SURFACE_BORDER,
          background: dragActive ? "color-mix(in srgb, var(--accent-primary) 12%, transparent)" : INNER_SURFACE_BG,
        }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl border-2 p-3" style={{ borderColor: SURFACE_BORDER, background: "rgba(255,255,255,0.04)" }}>
              <UploadCloud className="h-5 w-5" style={{ color: "var(--accent-primary)" }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--beathelper-text-primary, var(--text-primary))" }}>Drag and drop or click to add a file</p>
            </div>
          </div>
          <div className="hidden shrink-0 whitespace-nowrap text-xs uppercase tracking-[0.12em] sm:block sm:tracking-[0.18em]" style={{ color: "var(--beathelper-text-primary, var(--text-primary))" }}>Drop Here</div>
        </div>
      </button>

      <div className="rounded-2xl border px-4 py-3" style={{ borderColor: SURFACE_BORDER, background: "rgba(255,255,255,0.03)" }}>
        <p className="text-[11px] uppercase tracking-[0.08em] sm:tracking-[0.14em]" style={{ color: "var(--text-secondary)" }}>
          Current Selection
        </p>
        <p className="mt-2 truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          {currentLabel || emptyLabel}
        </p>
      </div>
    </div>
  );
};

const QueueCard = ({
  item,
  preview,
  edit,
  beatHelperUploads,
  beatHelperTemplates,
  assistTitlesById,
  setEditingQueueById,
  handleBeatHelperRequestApproval,
  handleBeatHelperApproveUpload,
  handleBeatHelperSetStatus,
  startEditBeatHelperItem,
  handleBeatHelperDelete,
  handleBeatHelperAssistTitle,
  handleBeatHelperSaveEdit,
}) => {
  const [showAllTags, setShowAllTags] = useState(false);
  const tagGroups = compactTags(item.generated_tags, 4);

  return (
  <div className="rounded-3xl border-2 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.16)] sm:p-5" style={{ borderColor: SURFACE_BORDER, background: "color-mix(in srgb, var(--bg-secondary) 88%, transparent)" }}>
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[140px_minmax(0,1fr)]">
      <div className="mx-auto aspect-square w-full max-w-[140px] overflow-hidden rounded-2xl border-2 lg:mx-0" style={{ borderColor: SURFACE_BORDER, background: "var(--bg-primary)" }}>
        {preview?.kind === "video" ? (
          <video src={preview.src} className="h-full w-full object-cover" muted playsInline autoPlay loop />
        ) : preview?.src ? (
          <img src={preview.src} alt={item.image_original_filename || "Queued thumbnail"} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs" style={{ color: "var(--text-secondary)" }}>No preview</div>
        )}
      </div>
      <div className="min-w-0 space-y-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{item.generated_title || item.beat_original_filename}</h3>
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] whitespace-nowrap sm:tracking-[0.18em] ${STATUS_CLASS[item.status] || STATUS_CLASS.queued}`}>{item.status}</span>
          </div>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>{item.target_artist} - {item.beat_type}</p>
          <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>Scheduled (UTC): {item.scheduled_for_utc || "n/a"}</p>
        </div>

        {!edit ? (
          <>
            <div className="rounded-2xl border-2 px-4 py-3" style={{ borderColor: SURFACE_BORDER, background: INNER_SURFACE_BG }}>
              <p className="text-[11px] uppercase tracking-[0.08em] sm:tracking-[0.16em]" style={{ color: "var(--text-secondary)" }}>Key Tags</p>
              {tagGroups.visible.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {tagGroups.visible.map((tag) => (
                    <span
                      key={`${item.id}-${tag}`}
                      className="rounded-full border px-2.5 py-1 text-[11px]"
                      style={{ borderColor: SURFACE_BORDER, color: "var(--text-primary)", background: "rgba(255,255,255,0.03)" }}
                    >
                      {tag}
                    </span>
                  ))}
                  {tagGroups.remaining > 0 ? (
                    <button
                      type="button"
                      className="rounded-full border px-2.5 py-1 text-[11px] transition hover:border-[var(--accent-primary)] hover:text-[var(--text-primary)]"
                      style={{ borderColor: SURFACE_BORDER, color: "var(--text-secondary)", background: "rgba(255,255,255,0.03)" }}
                      onClick={() => setShowAllTags((prev) => !prev)}
                    >
                      +{tagGroups.remaining} more
                    </button>
                  ) : null}
                </div>
              ) : (
                <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>No tags generated yet</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => handleBeatHelperRequestApproval(item.id)} className="gap-1"><Send className="h-3 w-3" />Request Approval</Button>
              <Button size="sm" onClick={() => handleBeatHelperApproveUpload(item.id)}>Approve + Upload</Button>
              <Button size="sm" variant="outline" onClick={() => handleBeatHelperSetStatus(item.id, "skipped")}>Skip</Button>
              <Button size="sm" variant="outline" onClick={() => startEditBeatHelperItem(item)}>Edit</Button>
              <Button size="sm" variant="destructive" onClick={() => handleBeatHelperDelete(item.id)} className="gap-1"><Trash2 className="h-3 w-3" />Remove</Button>
              {item.video_url ? <Button size="sm" variant="outline" onClick={() => window.open(item.video_url, "_blank")}>Open Video</Button> : null}
            </div>
          </>
        ) : (
          <div className="space-y-4 rounded-2xl border-2 p-4" style={{ borderColor: SURFACE_BORDER, background: INNER_SURFACE_BG }}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input value={edit.generated_title} onChange={(e) => setEditingQueueById((prev) => ({ ...prev, [item.id]: { ...prev[item.id], generated_title: e.target.value } }))} placeholder="Title" />
              <Input value={edit.target_artist} onChange={(e) => setEditingQueueById((prev) => ({ ...prev, [item.id]: { ...prev[item.id], target_artist: e.target.value } }))} placeholder="Artist" />
              <Input value={edit.beat_type} onChange={(e) => setEditingQueueById((prev) => ({ ...prev, [item.id]: { ...prev[item.id], beat_type: e.target.value } }))} placeholder="Beat type" />
              <Select value={edit.template_id || "none"} onValueChange={(value) => setEditingQueueById((prev) => ({ ...prev, [item.id]: { ...prev[item.id], template_id: value === "none" ? "" : value } }))}>
                <SelectTrigger><SelectValue placeholder="Template" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No template</SelectItem>
                  {beatHelperTemplates.map((template) => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Select value={edit.beat_file_id} onValueChange={(value) => setEditingQueueById((prev) => ({ ...prev, [item.id]: { ...prev[item.id], beat_file_id: value } }))}>
                <SelectTrigger><SelectValue placeholder="Beat" /></SelectTrigger>
                <SelectContent>
                  {beatHelperUploads.audio_uploads.map((file) => <SelectItem key={file.id} value={file.id}>{formatUploadLabel(file)}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={edit.image_file_id} onValueChange={(value) => setEditingQueueById((prev) => ({ ...prev, [item.id]: { ...prev[item.id], image_file_id: value } }))}>
                <SelectTrigger><SelectValue placeholder="Image" /></SelectTrigger>
                <SelectContent>
                  {beatHelperUploads.image_uploads.map((file) => <SelectItem key={file.id} value={file.id}>{formatUploadLabel(file)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Textarea rows={2} value={edit.generated_tags_text} onChange={(e) => setEditingQueueById((prev) => ({ ...prev, [item.id]: { ...prev[item.id], generated_tags_text: e.target.value } }))} placeholder="Comma separated tags" />
            <Textarea rows={4} value={edit.generated_description} onChange={(e) => setEditingQueueById((prev) => ({ ...prev, [item.id]: { ...prev[item.id], generated_description: e.target.value } }))} placeholder="Description" />
            {assistTitlesById[item.id]?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {assistTitlesById[item.id].map((title) => (
                  <button key={title} type="button" className="rounded-full border-2 px-3 py-1.5 text-xs" style={{ borderColor: SURFACE_BORDER, color: "var(--text-primary)" }} onClick={() => setEditingQueueById((prev) => ({ ...prev, [item.id]: { ...prev[item.id], generated_title: title } }))}>{title}</button>
                ))}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => handleBeatHelperAssistTitle(item.id)}>AI Titles</Button>
              <Button size="sm" onClick={() => handleBeatHelperSaveEdit(item.id)}>Save Edit</Button>
              <Button size="sm" variant="outline" onClick={() => setEditingQueueById((prev) => {
                const next = { ...prev };
                delete next[item.id];
                return next;
              })}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    </div>
    {showAllTags && Array.isArray(item.generated_tags) && item.generated_tags.length > 0 ? (
      <div className="fixed inset-0 z-40 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.42)" }}>
        <div
          className="w-full max-w-sm rounded-3xl border-2 px-5 py-5 shadow-[0_24px_60px_rgba(0,0,0,0.36)] backdrop-blur-md"
          style={{ borderColor: SURFACE_BORDER, background: "color-mix(in srgb, var(--bg-secondary) 76%, black)" }}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.12em]" style={{ color: "var(--text-secondary)" }}>All Tags</p>
            <button
              type="button"
              className="rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] transition hover:border-[var(--accent-primary)] hover:text-[var(--text-primary)]"
              style={{ borderColor: SURFACE_BORDER, color: "var(--text-secondary)", background: "rgba(255,255,255,0.03)" }}
              onClick={() => setShowAllTags(false)}
            >
              Close
            </button>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {item.generated_tags.filter(Boolean).map((tag) => (
              <span
                key={`${item.id}-all-${tag}`}
                className="rounded-full border px-2.5 py-1 text-[11px]"
                style={{ borderColor: SURFACE_BORDER, color: "var(--text-primary)", background: "rgba(255,255,255,0.03)" }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    ) : null}
  </div>
  );
};

export default function BeatHelperStudio(props) {
  const {
    loadingBeatHelper,
    beatHelperUploads,
    beatHelperQueue,
    beatHelperImagePreview,
    loadingBeatHelperPreview,
    beatHelperQueueImagePreviews,
    uploadingBeatHelperAudio,
    uploadingBeatHelperImage,
    beatHelperContact,
    setBeatHelperContact,
    beatHelperTemplates,
    beatHelperImageSearchQuery,
    setBeatHelperImageSearchQuery,
    beatHelperImageResults,
    loadingBeatHelperImageSearch,
    importingBeatHelperImageUrl,
    beatHelperForm,
    setBeatHelperForm,
    editingQueueById,
    setEditingQueueById,
    assistTitlesById,
    handleBeatHelperQueue,
    fetchBeatHelperData,
    handleBeatHelperDispatchNow,
    handleBeatHelperCleanupUploads,
    handleBeatHelperAudioUpload,
    handleBeatHelperImageUpload,
    handleBeatHelperImageSearch,
    handleBeatHelperImportSearchImage,
    handleBeatHelperSaveContact,
    handleBeatHelperRequestApproval,
    handleBeatHelperApproveUpload,
    handleBeatHelperSetStatus,
    handleBeatHelperDelete,
    startEditBeatHelperItem,
    handleBeatHelperAssistTitle,
    handleBeatHelperSaveEdit,
  } = props;

  const queued = beatHelperQueue.length;
  const pending = beatHelperQueue.filter((item) => item.status === "pending_approval").length;
  const uploaded = beatHelperQueue.filter((item) => item.status === "uploaded").length;
  const [preferredReminderChannel, setPreferredReminderChannel] = useState("email");
  const [brokenSearchImageIds, setBrokenSearchImageIds] = useState({});
  const [openSections, setOpenSections] = useState({
    assets: true,
    imageSearch: true,
    metadata: false,
    automation: false,
    contacts: false,
  });
  const [workflowProgress, setWorkflowProgress] = useState({
    assetsConfirmed: false,
    tagsConfirmed: false,
    deliveryConfirmed: false,
    contactConfirmed: false,
  });

  useEffect(() => {
    if (beatHelperContact.sms_enabled && beatHelperContact.phone) {
      setPreferredReminderChannel("sms");
      return;
    }
    setPreferredReminderChannel("email");
  }, [beatHelperContact.email, beatHelperContact.phone, beatHelperContact.sms_enabled]);

  useEffect(() => {
    setBrokenSearchImageIds({});
  }, [beatHelperImageResults]);

  const contactConfigured = useMemo(
    () => Boolean((beatHelperContact.email || "").trim() && beatHelperContact.email_enabled) || Boolean((beatHelperContact.phone || "").trim() && beatHelperContact.sms_enabled),
    [beatHelperContact.email, beatHelperContact.phone, beatHelperContact.email_enabled, beatHelperContact.sms_enabled]
  );

  const daysSinceLastActivity = useMemo(() => {
    const timestamps = beatHelperQueue.flatMap((item) => [item?.uploaded_at, item?.updated_at, item?.created_at]).filter(Boolean).map((value) => {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
    }).filter((value) => typeof value === "number");
    if (!timestamps.length) return null;
    return Math.floor((Date.now() - Math.max(...timestamps)) / (1000 * 60 * 60 * 24));
  }, [beatHelperQueue]);

  const showReminderNudge = !contactConfigured || daysSinceLastActivity === null || daysSinceLastActivity >= 3;
  const visibleBeatHelperImageResults = useMemo(
    () => beatHelperImageResults.filter((result) => !brokenSearchImageIds[result.id]),
    [beatHelperImageResults, brokenSearchImageIds]
  );
  const selectedAudioLabel = useMemo(
    () => beatHelperForm.beat_file_name || formatUploadLabel(beatHelperUploads.audio_uploads.find((file) => file.id === beatHelperForm.beat_file_id)),
    [beatHelperForm.beat_file_id, beatHelperForm.beat_file_name, beatHelperUploads.audio_uploads]
  );
  const selectedImageLabel = useMemo(
    () => beatHelperForm.image_file_name || formatUploadLabel(beatHelperUploads.image_uploads.find((file) => file.id === beatHelperForm.image_file_id)),
    [beatHelperForm.image_file_id, beatHelperForm.image_file_name, beatHelperUploads.image_uploads]
  );

  const setSectionOpen = (key, value) => setOpenSections((prev) => ({ ...prev, [key]: value }));

  const assetsReady = Boolean(beatHelperForm.beat_file_id && (beatHelperForm.image_file_id || beatHelperForm.ai_choose_image));
  const tagsReady = Boolean((beatHelperForm.target_artist || "").trim() && (beatHelperForm.beat_type || "").trim());
  const deliveryReady = Boolean((beatHelperForm.privacy_status || "").trim());
  const contactReady = contactConfigured || Boolean((beatHelperContact.email || "").trim()) || Boolean((beatHelperContact.phone || "").trim());

  const tagsUnlocked = workflowProgress.assetsConfirmed;
  const deliveryUnlocked = tagsUnlocked && workflowProgress.tagsConfirmed;
  const contactsUnlocked = deliveryUnlocked && workflowProgress.deliveryConfirmed;
  const queueReady = contactsUnlocked && workflowProgress.contactConfirmed;

  const confirmWorkflowStep = async (step) => {
    if (step === "assets") {
      if (!assetsReady) return;
      setWorkflowProgress((prev) => ({ ...prev, assetsConfirmed: true }));
      setSectionOpen("assets", false);
      setSectionOpen("imageSearch", false);
      setSectionOpen("metadata", true);
      return;
    }

    if (step === "tags") {
      if (!tagsReady) return;
      setWorkflowProgress((prev) => ({ ...prev, tagsConfirmed: true }));
      setSectionOpen("metadata", false);
      setSectionOpen("automation", true);
      return;
    }

    if (step === "delivery") {
      if (!deliveryReady) return;
      setWorkflowProgress((prev) => ({ ...prev, deliveryConfirmed: true }));
      setSectionOpen("automation", false);
      setSectionOpen("contacts", true);
      return;
    }

    if (step === "contact") {
      await handleBeatHelperSaveContact();
      setWorkflowProgress((prev) => ({ ...prev, contactConfirmed: true }));
      setSectionOpen("contacts", false);
    }
  };

  const handleReminderBootstrap = async () => {
    const nextContact = preferredReminderChannel === "email"
      ? { ...beatHelperContact, email_enabled: true, sms_enabled: false }
      : { ...beatHelperContact, email_enabled: false, sms_enabled: true };
    setBeatHelperContact(nextContact);
    await handleBeatHelperSaveContact(nextContact);
  };

  return (
    <div
      className="beathelper-studio space-y-6"
      style={{
        "--beathelper-text-primary": "var(--text-primary)",
        "--beathelper-text-secondary": "var(--text-secondary)",
      }}
    >
      <Card className="overflow-hidden border" style={{ borderColor: "color-mix(in srgb, var(--accent-primary) 34%, var(--border-color))", background: "radial-gradient(circle at top left, color-mix(in srgb, var(--accent-primary) 18%, transparent), transparent 42%), linear-gradient(135deg, color-mix(in srgb, var(--bg-secondary) 92%, black), color-mix(in srgb, var(--bg-primary) 90%, black))" }}>
        <CardContent className="px-5 py-6 sm:px-7 sm:py-7">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1 text-xs uppercase tracking-[0.12em] sm:tracking-[0.24em]" style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)", background: "rgba(255,255,255,0.04)" }}>
                <Bot className="h-3.5 w-3.5" />
                BeatHelper Studio
              </div>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl" style={{ color: "var(--text-primary)" }}>Build queue items without the clutter.</h2>
                <p className="mt-2 max-w-2xl text-sm sm:text-base" style={{ color: "var(--text-secondary)" }}>Upload assets here, expand only what you need, and keep queue review isolated on the right like a real studio panel.</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:min-w-[320px]">
              <StatCard icon={Clock3} label="Queued" value={queued} />
              <StatCard icon={Send} label="Pending" value={pending} />
              <StatCard icon={CheckCircle2} label="Uploaded" value={uploaded} />
            </div>
          </div>
        </CardContent>
      </Card>

      {showReminderNudge ? (
        <Card className="overflow-hidden border" style={{ borderColor: "color-mix(in srgb, var(--accent-secondary) 38%, var(--border-color))", background: "linear-gradient(135deg, color-mix(in srgb, var(--accent-secondary) 14%, var(--bg-secondary)), color-mix(in srgb, var(--bg-secondary) 92%, black))" }}>
          <CardContent className="px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl space-y-2">
                <h3 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
                  {daysSinceLastActivity === null ? "Set up reminders before your queue goes cold." : `You haven't uploaded in ${daysSinceLastActivity} day${daysSinceLastActivity === 1 ? "" : "s"}.`}
                </h3>
                <p className="text-sm sm:text-base" style={{ color: "var(--text-secondary)" }}>Pick one contact method and BeatHelper will confirm reminder setup automatically.</p>
              </div>
              <div className="grid w-full gap-3 lg:max-w-xl lg:grid-cols-[140px_minmax(0,1fr)_auto]">
                <div className="space-y-2">
                  <Label>Channel</Label>
                  <Select value={preferredReminderChannel} onValueChange={setPreferredReminderChannel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">Phone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{preferredReminderChannel === "email" ? "Email Address" : "Phone Number"}</Label>
                  {preferredReminderChannel === "email" ? (
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60" />
                      <Input className="pl-10" value={beatHelperContact.email || ""} onChange={(e) => setBeatHelperContact((prev) => ({ ...prev, email: e.target.value }))} placeholder="you@domain.com" />
                    </div>
                  ) : (
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60" />
                      <Input className="pl-10" value={beatHelperContact.phone || ""} onChange={(e) => setBeatHelperContact((prev) => ({ ...prev, phone: e.target.value }))} placeholder="+15551234567" />
                    </div>
                  )}
                </div>
                <Button type="button" className="self-end" disabled={loadingBeatHelper || (preferredReminderChannel === "email" ? !(beatHelperContact.email || "").trim() : !(beatHelperContact.phone || "").trim())} onClick={handleReminderBootstrap}>
                  Enable Reminders
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.04fr)_minmax(360px,0.96fr)]">
        <div className="space-y-6">
          <Card className="dashboard-card overflow-hidden">
            <CardHeader className="border-b pb-5" style={{ borderColor: "var(--border-color)" }}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Wand2 className="h-5 w-5 text-[var(--accent-primary)]" />
                    Queue Composer
                  </CardTitle>
                  <CardDescription>BeatHelper now uses studio sections instead of one giant stacked form.</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={fetchBeatHelperData} disabled={loadingBeatHelper} className="gap-2"><RefreshCw className="h-4 w-4" />Refresh</Button>
                  <Button type="button" variant="outline" onClick={handleBeatHelperDispatchNow} disabled={loadingBeatHelper}>Send Today's Approval</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border-2 px-4 py-3" style={{ borderColor: SURFACE_BORDER, background: INNER_SURFACE_BG }}><p className="text-[11px] uppercase tracking-[0.08em] sm:tracking-[0.16em]" style={{ color: "var(--text-secondary)" }}>Selected Beat</p><p className="mt-2 truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>{beatHelperForm.beat_file_id ? selectedAudioLabel : "None yet"}</p></div>
                <div className="rounded-2xl border-2 px-4 py-3" style={{ borderColor: SURFACE_BORDER, background: INNER_SURFACE_BG }}><p className="text-[11px] uppercase tracking-[0.08em] sm:tracking-[0.16em]" style={{ color: "var(--text-secondary)" }}>Selected Visual</p><p className="mt-2 truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>{beatHelperForm.image_file_id ? selectedImageLabel : beatHelperForm.ai_choose_image ? "AI fallback enabled" : "None yet"}</p></div>
                <div className="rounded-2xl border-2 px-4 py-3" style={{ borderColor: SURFACE_BORDER, background: INNER_SURFACE_BG }}><p className="text-[11px] uppercase tracking-[0.08em] sm:tracking-[0.16em]" style={{ color: "var(--text-secondary)" }}>Target</p><p className="mt-2 truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>{beatHelperForm.target_artist?.trim() || "No artist yet"}</p></div>
                <div className="rounded-2xl border-2 px-4 py-3" style={{ borderColor: SURFACE_BORDER, background: INNER_SURFACE_BG }}><p className="text-[11px] uppercase tracking-[0.08em] sm:tracking-[0.16em]" style={{ color: "var(--text-secondary)" }}>Beat Type</p><p className="mt-2 truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>{beatHelperForm.beat_type?.trim() || "No beat type yet"}</p></div>
              </div>

              <form onSubmit={handleBeatHelperQueue} className="space-y-4">
                <StudioSection title="Beat Audio + Video" description="Step 1: add your beat audio and visual first." badge={formatSectionBadge(beatHelperForm.beat_file_id ? 1 : 0, beatHelperForm.image_file_id || beatHelperForm.ai_choose_image ? 1 : 0)} open={openSections.assets} onOpenChange={(value) => setSectionOpen("assets", value)}>
                  <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                    <AssetDropzone title="Beat Audio" accept=".mp3,.wav,.m4a,.flac,.ogg,audio/*" loading={uploadingBeatHelperAudio} onFileUpload={handleBeatHelperAudioUpload} currentLabel={selectedAudioLabel} emptyLabel="No beat audio selected" />
                    <AssetDropzone title="Visual" accept=".jpg,.jpeg,.png,.webp,.webm,.mp4,.mov,.m4v,image/*,video/webm,video/mp4,video/quicktime" loading={uploadingBeatHelperImage} onFileUpload={handleBeatHelperImageUpload} currentLabel={selectedImageLabel} emptyLabel={beatHelperForm.ai_choose_image ? "AI fallback enabled" : "No visual selected"} />
                  </div>
                  <label
                    className="mt-4 flex w-full items-start gap-4 rounded-2xl border-2 px-4 py-4 transition hover:border-[var(--accent-primary)]"
                    style={{ borderColor: SURFACE_BORDER, background: INNER_SURFACE_BG }}
                  >
                    <span
                      className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2"
                      style={{ borderColor: SURFACE_BORDER, background: "rgba(255,255,255,0.03)" }}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 shrink-0 accent-[var(--accent-primary)]"
                        checked={beatHelperForm.ai_choose_image}
                        onChange={(e) => setBeatHelperForm((prev) => ({ ...prev, ai_choose_image: e.target.checked }))}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium leading-6" style={{ color: "var(--text-primary)" }}>
                        AI image fallback
                      </span>
                      <span className="mt-1 block break-words text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                        Use AI image if no thumbnail is selected.
                      </span>
                    </span>
                  </label>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3" style={{ borderColor: SURFACE_BORDER, background: INNER_SURFACE_BG }}>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Confirm this step after your beat audio and visual are ready.</p>
                    <Button type="button" onClick={() => confirmWorkflowStep("assets")} disabled={!assetsReady}>Confirm Media</Button>
                  </div>
                </StudioSection>

                <StudioSection title="Web Image Search" description="Step 1A: search a web image before moving on." badge={visibleBeatHelperImageResults.length ? `${visibleBeatHelperImageResults.length} results` : null} open={openSections.imageSearch} onOpenChange={(value) => setSectionOpen("imageSearch", value)}>
                  <div className="rounded-3xl border-2 p-4" style={{ borderColor: SURFACE_BORDER, background: INNER_SURFACE_BG }}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Search directly or build from your beat info</p>
                      </div>
                      <Button type="button" variant="outline" className="gap-2" onClick={() => handleBeatHelperImageSearch({ autoBuild: true })} disabled={loadingBeatHelperImageSearch}><Sparkles className="h-4 w-4" />Auto From Beat Info</Button>
                    </div>
                    <div className="mt-4 flex flex-col gap-3 lg:flex-row">
                      <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60" />
                        <Input className="pl-10" value={beatHelperImageSearchQuery} onChange={(e) => setBeatHelperImageSearchQuery(e.target.value)} placeholder="Search Lil Baby, Gunna album cover, trap skyline..." />
                      </div>
                      <Button type="button" onClick={() => handleBeatHelperImageSearch({ autoBuild: false })} disabled={loadingBeatHelperImageSearch}>{loadingBeatHelperImageSearch ? "Searching..." : "Search Images"}</Button>
                    </div>
                  </div>
                  {visibleBeatHelperImageResults.length > 0 ? (
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                      {visibleBeatHelperImageResults.map((result) => (
                        <button
                          key={result.id}
                          type="button"
                          className="overflow-hidden rounded-3xl border-2 p-3 text-left transition hover:scale-[1.01]"
                          style={{ borderColor: SURFACE_BORDER, background: INNER_SURFACE_BG }}
                          disabled={importingBeatHelperImageUrl === result.image_url}
                          onClick={async () => {
                            await handleBeatHelperImportSearchImage(result);
                            setSectionOpen("imageSearch", false);
                            setSectionOpen("assets", true);
                          }}
                        >
                          <div className="mx-auto aspect-square w-full max-w-[180px] overflow-hidden rounded-2xl border-2 sm:max-w-full" style={{ borderColor: SURFACE_BORDER, background: "var(--bg-primary)" }}>
                            <img src={result.image_url} alt={result.title || result.query} className="h-full w-full object-cover" loading="lazy" onError={() => setBrokenSearchImageIds((prev) => ({ ...prev, [result.id]: true }))} />
                          </div>
                          <Badge className="mt-3 border-emerald-400/40 bg-emerald-500/10 text-emerald-300">{String(result.source || "web").toUpperCase()}</Badge>
                          <p className="mt-3 line-clamp-1 text-base font-semibold" style={{ color: "var(--text-primary)" }}>{result.title || result.query || "Web image"}</p>
                          <p className="mt-1 line-clamp-2 text-sm" style={{ color: "var(--text-secondary)" }}>{result.query || beatHelperImageSearchQuery || "Suggested image"}</p>
                          <p className="mt-3 text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                            {importingBeatHelperImageUrl === result.image_url ? "Importing..." : "Click image to select"}
                          </p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-3xl border-2 px-4 py-6 text-center text-sm" style={{ borderColor: SURFACE_BORDER, color: "var(--text-secondary)", background: INNER_SURFACE_BG }}>
                      Search results show here.
                    </div>
                  )}
                </StudioSection>

                <StudioSection title="Tags" description="Step 2: add the artist and beat type info." open={openSections.metadata} onOpenChange={(value) => setSectionOpen("metadata", value)} locked={!tagsUnlocked} lockMessage="Confirm Beat Audio + Video first to unlock Tags.">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2"><Label>Target Artist</Label><Input value={beatHelperForm.target_artist} onChange={(e) => setBeatHelperForm((prev) => ({ ...prev, target_artist: e.target.value }))} placeholder="e.g. Lil Uzi Vert" /></div>
                    <div className="space-y-2"><Label>Beat Type</Label><Input value={beatHelperForm.beat_type} onChange={(e) => setBeatHelperForm((prev) => ({ ...prev, beat_type: e.target.value }))} placeholder="e.g. rage" /></div>
                    <div className="space-y-2"><Label>Title Override</Label><Input value={beatHelperForm.generated_title_override} onChange={(e) => setBeatHelperForm((prev) => ({ ...prev, generated_title_override: e.target.value }))} placeholder="Leave blank for AI title" /></div>
                    <div className="space-y-2"><Label>Tag Template</Label><Select value={beatHelperForm.template_id || "none"} onValueChange={(value) => setBeatHelperForm((prev) => ({ ...prev, template_id: value === "none" ? "" : value }))}><SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger><SelectContent><SelectItem value="none">No template</SelectItem>{beatHelperTemplates.map((template) => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}</SelectContent></Select></div>
                  </div>
                  <div className="mt-4 space-y-2"><Label>Context Tags</Label><Textarea rows={3} value={beatHelperForm.context_tags} onChange={(e) => setBeatHelperForm((prev) => ({ ...prev, context_tags: e.target.value }))} placeholder="baby pluto, pink tape, melodic rage" /></div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3" style={{ borderColor: SURFACE_BORDER, background: INNER_SURFACE_BG }}>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Confirm this step when your tag setup is ready.</p>
                    <Button type="button" onClick={() => confirmWorkflowStep("tags")} disabled={!tagsReady}>Confirm Tags</Button>
                  </div>
                </StudioSection>

                <StudioSection title="Delivery" description="Step 3: choose how this queue item should go out." open={openSections.automation} onOpenChange={(value) => setSectionOpen("automation", value)} locked={!deliveryUnlocked} lockMessage="Confirm Tags first to unlock Delivery.">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="space-y-2"><Label>Auto-skip Hours</Label><Input type="number" min="1" max="72" value={beatHelperForm.approval_timeout_hours} onChange={(e) => setBeatHelperForm((prev) => ({ ...prev, approval_timeout_hours: e.target.value }))} /></div>
                    <div className="space-y-2"><Label>Notify Via</Label><Select value={beatHelperForm.notify_channel} onValueChange={(value) => setBeatHelperForm((prev) => ({ ...prev, notify_channel: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem><SelectItem value="email">Email</SelectItem><SelectItem value="sms">SMS</SelectItem><SelectItem value="email_sms">Email + SMS</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><Label>Privacy</Label><Select value={beatHelperForm.privacy_status} onValueChange={(value) => setBeatHelperForm((prev) => ({ ...prev, privacy_status: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="public">Public</SelectItem><SelectItem value="unlisted">Unlisted</SelectItem><SelectItem value="private">Private</SelectItem></SelectContent></Select></div>
                  </div>
                  <label
                    className="mt-4 flex w-full items-start gap-4 rounded-2xl border-2 px-4 py-4 transition hover:border-[var(--accent-primary)]"
                    style={{ borderColor: SURFACE_BORDER, background: INNER_SURFACE_BG }}
                  >
                    <span
                      className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2"
                      style={{ borderColor: SURFACE_BORDER, background: "rgba(255,255,255,0.03)" }}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 shrink-0 accent-[var(--accent-primary)]"
                        checked={beatHelperForm.auto_upload_if_no_response}
                        onChange={(e) => setBeatHelperForm((prev) => ({ ...prev, auto_upload_if_no_response: e.target.checked }))}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium leading-6" style={{ color: "var(--text-primary)" }}>
                        Auto-upload fallback
                      </span>
                      <span className="mt-1 block break-words text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                        Auto-upload if no response comes in.
                      </span>
                    </span>
                  </label>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3" style={{ borderColor: SURFACE_BORDER, background: INNER_SURFACE_BG }}>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Confirm delivery settings to unlock contact details.</p>
                    <Button type="button" onClick={() => confirmWorkflowStep("delivery")} disabled={!deliveryReady}>Confirm Delivery</Button>
                  </div>
                </StudioSection>

                <StudioSection title="Notification Contact" description="Step 4: choose where BeatHelper should notify you." open={openSections.contacts} onOpenChange={(value) => setSectionOpen("contacts", value)} locked={!contactsUnlocked} lockMessage="Confirm Delivery first to unlock Notification Contact.">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2"><Label>Email</Label><Input value={beatHelperContact.email || ""} onChange={(e) => setBeatHelperContact((prev) => ({ ...prev, email: e.target.value }))} placeholder="you@domain.com" /></div>
                    <div className="space-y-2"><Label>Phone</Label><Input value={beatHelperContact.phone || ""} onChange={(e) => setBeatHelperContact((prev) => ({ ...prev, phone: e.target.value }))} placeholder="+15551234567" /></div>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                    <label
                      className="flex w-full items-start gap-4 rounded-2xl border-2 px-4 py-4 transition hover:border-[var(--accent-primary)]"
                      style={{ borderColor: SURFACE_BORDER, background: INNER_SURFACE_BG }}
                    >
                      <span
                        className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2"
                        style={{ borderColor: SURFACE_BORDER, background: "rgba(255,255,255,0.03)" }}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 shrink-0 accent-[var(--accent-primary)]"
                          checked={!!beatHelperContact.email_enabled}
                          onChange={(e) => setBeatHelperContact((prev) => ({ ...prev, email_enabled: e.target.checked }))}
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium leading-6" style={{ color: "var(--text-primary)" }}>
                          Email alerts
                        </span>
                        <span className="mt-1 block break-words text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                          Send BeatHelper notifications to your email.
                        </span>
                      </span>
                    </label>
                    <label
                      className="flex w-full items-start gap-4 rounded-2xl border-2 px-4 py-4 transition hover:border-[var(--accent-primary)]"
                      style={{ borderColor: SURFACE_BORDER, background: INNER_SURFACE_BG }}
                    >
                      <span
                        className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2"
                        style={{ borderColor: SURFACE_BORDER, background: "rgba(255,255,255,0.03)" }}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 shrink-0 accent-[var(--accent-primary)]"
                          checked={!!beatHelperContact.sms_enabled}
                          onChange={(e) => setBeatHelperContact((prev) => ({ ...prev, sms_enabled: e.target.checked }))}
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium leading-6" style={{ color: "var(--text-primary)" }}>
                          SMS alerts
                        </span>
                        <span className="mt-1 block break-words text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                          Send BeatHelper notifications to your phone.
                        </span>
                      </span>
                    </label>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3" style={{ borderColor: SURFACE_BORDER, background: INNER_SURFACE_BG }}>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Save and confirm contact settings to finish the workflow.</p>
                    <Button type="button" variant="outline" onClick={() => confirmWorkflowStep("contact")} disabled={!contactReady}>Confirm Contact</Button>
                  </div>
                </StudioSection>

                <div className="flex flex-wrap items-center gap-3 rounded-3xl border-2 px-4 py-4" style={{ borderColor: SURFACE_BORDER, background: INNER_SURFACE_BG }}>
                  <Button type="submit" disabled={loadingBeatHelper || !queueReady} className="gap-2"><Sparkles className="h-4 w-4" />{loadingBeatHelper ? "Queuing..." : "Queue Beat"}</Button>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{queueReady ? "Workflow complete. Queue this beat when you're ready." : "Finish each confirmed step to unlock queueing."}</p>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <Card className="dashboard-card overflow-hidden">
          <CardHeader className="border-b pb-5" style={{ borderColor: "var(--border-color)" }}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl"><Clock3 className="h-5 w-5 text-[var(--accent-primary)]" />Queue Review</CardTitle>
                <CardDescription>Preview the current thumbnail, then approve, edit, skip, or remove queued items.</CardDescription>
              </div>
              <Badge className="border-transparent bg-[var(--accent-primary)]/15 text-[var(--text-primary)]">{queued} item{queued === 1 ? "" : "s"}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="border-b px-4 py-4 sm:px-5" style={{ borderColor: "var(--border-color)", background: "rgba(255,255,255,0.02)" }}>
              <div className="overflow-hidden rounded-3xl border" style={{ borderColor: "var(--border-color)", background: "var(--bg-primary)" }}>
                {beatHelperImagePreview?.kind === "video" ? (
                  <video src={beatHelperImagePreview.src} className="h-[240px] w-full object-cover" muted playsInline autoPlay loop controls />
                ) : beatHelperImagePreview?.src ? (
                  <img src={beatHelperImagePreview.src} alt="BeatHelper selected visual preview" className="h-[240px] w-full object-cover" />
                ) : loadingBeatHelperPreview ? (
                  <div className="flex h-[240px] items-center justify-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}><LoaderCircle className="h-4 w-4 animate-spin" />Loading preview...</div>
                ) : (
                  <div className="flex h-[240px] flex-col items-center justify-center gap-2 text-center text-sm" style={{ color: "var(--text-secondary)" }}><ImageIcon className="h-8 w-8 opacity-60" /><span>Select a visual or let AI choose one.</span></div>
                )}
              </div>
            </div>
            {queued === 0 ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 px-6 py-12 text-center">
                <Music2 className="h-10 w-10 opacity-60" style={{ color: "var(--accent-primary)" }} />
                <div>
                  <p className="text-lg font-medium" style={{ color: "var(--text-primary)" }}>No queued beats yet.</p>
                  <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>Build the first queue item on the left and BeatHelper will handle the rest.</p>
                </div>
              </div>
            ) : (
              <ScrollArea className="h-[920px]">
                <div className="space-y-4 p-4">
                  {beatHelperQueue.map((item) => <QueueCard key={item.id} item={item} preview={beatHelperQueueImagePreviews[item.image_file_id]} edit={editingQueueById[item.id]} beatHelperUploads={beatHelperUploads} beatHelperTemplates={beatHelperTemplates} assistTitlesById={assistTitlesById} setEditingQueueById={setEditingQueueById} handleBeatHelperRequestApproval={handleBeatHelperRequestApproval} handleBeatHelperApproveUpload={handleBeatHelperApproveUpload} handleBeatHelperSetStatus={handleBeatHelperSetStatus} startEditBeatHelperItem={startEditBeatHelperItem} handleBeatHelperDelete={handleBeatHelperDelete} handleBeatHelperAssistTitle={handleBeatHelperAssistTitle} handleBeatHelperSaveEdit={handleBeatHelperSaveEdit} />)}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
