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

const StatCard = ({ icon: Icon, label, value }) => (
  <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border-color)", background: "rgba(255,255,255,0.05)" }}>
    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--text-secondary)" }}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </div>
    <div className="mt-3 text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>{value}</div>
  </div>
);

const StudioSection = ({ title, description, badge, open, onOpenChange, children }) => (
  <Collapsible open={open} onOpenChange={onOpenChange}>
    <div className="overflow-hidden rounded-3xl border" style={{ borderColor: "var(--border-color)", background: "rgba(255,255,255,0.03)" }}>
      <CollapsibleTrigger asChild>
        <button type="button" className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left sm:px-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>{title}</p>
              {badge ? <Badge className="border-transparent bg-[var(--accent-primary)]/15 text-[var(--text-primary)]">{badge}</Badge> : null}
            </div>
            {description ? <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>{description}</p> : null}
          </div>
          <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} style={{ color: "var(--text-secondary)" }} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t px-4 py-4 sm:px-5" style={{ borderColor: "var(--border-color)" }}>
          {children}
        </div>
      </CollapsibleContent>
    </div>
  </Collapsible>
);

const AssetDropzone = ({ title, subtitle, accept, loading, files, selectedFileId, onSelect, onFileUpload, emptyLabel }) => {
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
          <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>{subtitle}</p>
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
        className={`w-full rounded-3xl border border-dashed px-5 py-6 text-left transition ${dragActive ? "scale-[1.01]" : ""}`}
        style={{
          borderColor: dragActive ? "var(--accent-primary)" : "var(--border-color)",
          background: dragActive ? "color-mix(in srgb, var(--accent-primary) 12%, transparent)" : "rgba(255,255,255,0.025)",
        }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl border p-3" style={{ borderColor: "var(--border-color)", background: "rgba(255,255,255,0.04)" }}>
              <UploadCloud className="h-5 w-5" style={{ color: "var(--accent-primary)" }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Drag and drop or click to add a file</p>
              <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>Upload straight into BeatHelper without leaving the queue flow.</p>
            </div>
          </div>
          <div className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--text-secondary)" }}>Drop Here</div>
        </div>
      </button>

      <Select value={selectedFileId} onValueChange={onSelect}>
        <SelectTrigger><SelectValue placeholder={emptyLabel} /></SelectTrigger>
        <SelectContent>
          {files.map((file) => (
            <SelectItem key={file.id} value={file.id}>{formatUploadLabel(file)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
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
}) => (
  <div className="rounded-3xl border p-4 sm:p-5" style={{ borderColor: "var(--border-color)", background: "color-mix(in srgb, var(--bg-secondary) 88%, transparent)" }}>
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[160px_minmax(0,1fr)]">
      <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "var(--border-color)", background: "var(--bg-primary)" }}>
        {preview?.kind === "video" ? (
          <video src={preview.src} className="h-40 w-full object-cover" muted playsInline autoPlay loop />
        ) : preview?.src ? (
          <img src={preview.src} alt={item.image_original_filename || "Queued thumbnail"} className="h-40 w-full object-cover" />
        ) : (
          <div className="flex h-40 items-center justify-center text-xs" style={{ color: "var(--text-secondary)" }}>No preview</div>
        )}
      </div>
      <div className="min-w-0 space-y-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{item.generated_title || item.beat_original_filename}</h3>
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] ${STATUS_CLASS[item.status] || STATUS_CLASS.queued}`}>{item.status}</span>
          </div>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>{item.target_artist} - {item.beat_type}</p>
          <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>Scheduled (UTC): {item.scheduled_for_utc || "n/a"}</p>
        </div>

        {!edit ? (
          <>
            <div className="rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: "var(--border-color)", background: "rgba(255,255,255,0.03)", color: "var(--text-secondary)" }}>
              {(item.generated_tags || []).slice(0, 8).join(", ") || "No tags generated yet"}
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
          <div className="space-y-4 rounded-2xl border p-4" style={{ borderColor: "var(--border-color)", background: "rgba(255,255,255,0.03)" }}>
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
                  <button key={title} type="button" className="rounded-full border px-3 py-1.5 text-xs" style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }} onClick={() => setEditingQueueById((prev) => ({ ...prev, [item.id]: { ...prev[item.id], generated_title: title } }))}>{title}</button>
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
  </div>
);

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
    newTemplateName,
    setNewTemplateName,
    newTemplateTags,
    setNewTemplateTags,
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
    handleBeatHelperCreateTemplate,
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
    metadata: true,
    imageSearch: false,
    automation: false,
    contacts: false,
    templates: false,
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
    () => formatUploadLabel(beatHelperUploads.audio_uploads.find((file) => file.id === beatHelperForm.beat_file_id)),
    [beatHelperForm.beat_file_id, beatHelperUploads.audio_uploads]
  );
const selectedImageLabel = useMemo(
    () => formatUploadLabel(beatHelperUploads.image_uploads.find((file) => file.id === beatHelperForm.image_file_id)),
    [beatHelperForm.image_file_id, beatHelperUploads.image_uploads]
  );

  const setSectionOpen = (key, value) => setOpenSections((prev) => ({ ...prev, [key]: value }));

  const handleReminderBootstrap = async () => {
    const nextContact = preferredReminderChannel === "email"
      ? { ...beatHelperContact, email_enabled: true, sms_enabled: false }
      : { ...beatHelperContact, email_enabled: false, sms_enabled: true };
    setBeatHelperContact(nextContact);
    await handleBeatHelperSaveContact(nextContact);
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border" style={{ borderColor: "color-mix(in srgb, var(--accent-primary) 34%, var(--border-color))", background: "radial-gradient(circle at top left, color-mix(in srgb, var(--accent-primary) 18%, transparent), transparent 42%), linear-gradient(135deg, color-mix(in srgb, var(--bg-secondary) 92%, black), color-mix(in srgb, var(--bg-primary) 90%, black))" }}>
        <CardContent className="px-5 py-6 sm:px-7 sm:py-7">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.24em]" style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)", background: "rgba(255,255,255,0.04)" }}>
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
                  <Button type="button" variant="outline" onClick={handleBeatHelperCleanupUploads} disabled={loadingBeatHelper}>Clean Unqueued Uploads</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border-color)", background: "rgba(255,255,255,0.035)" }}><p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: "var(--text-secondary)" }}>Selected Beat</p><p className="mt-2 truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>{beatHelperForm.beat_file_id ? selectedAudioLabel : "None yet"}</p></div>
                <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border-color)", background: "rgba(255,255,255,0.035)" }}><p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: "var(--text-secondary)" }}>Selected Visual</p><p className="mt-2 truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>{beatHelperForm.image_file_id ? selectedImageLabel : beatHelperForm.ai_choose_image ? "AI fallback enabled" : "None yet"}</p></div>
                <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border-color)", background: "rgba(255,255,255,0.035)" }}><p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: "var(--text-secondary)" }}>Target</p><p className="mt-2 truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>{beatHelperForm.target_artist?.trim() || "No artist yet"}</p></div>
                <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border-color)", background: "rgba(255,255,255,0.035)" }}><p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: "var(--text-secondary)" }}>Beat Type</p><p className="mt-2 truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>{beatHelperForm.beat_type?.trim() || "No beat type yet"}</p></div>
              </div>

              <form onSubmit={handleBeatHelperQueue} className="space-y-4">
                <StudioSection title="Assets" description="Drag in your beat and thumbnail here, or pick from your existing BeatHelper-safe uploads." badge={`${beatHelperUploads.audio_uploads.length} audio / ${beatHelperUploads.image_uploads.length} image`} open={openSections.assets} onOpenChange={(value) => setSectionOpen("assets", value)}>
                  <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                    <AssetDropzone title="Beat Audio" subtitle="MP3, WAV, M4A, FLAC, or OGG" accept=".mp3,.wav,.m4a,.flac,.ogg,audio/*" loading={uploadingBeatHelperAudio} files={beatHelperUploads.audio_uploads} selectedFileId={beatHelperForm.beat_file_id} onSelect={(value) => setBeatHelperForm((prev) => ({ ...prev, beat_file_id: value }))} onFileUpload={handleBeatHelperAudioUpload} emptyLabel="Select BeatHelper audio" />
                    <AssetDropzone title="Visual" subtitle="JPG, PNG, WEBP, WEBM, MP4, or MOV" accept=".jpg,.jpeg,.png,.webp,.webm,.mp4,.mov,.m4v,image/*,video/webm,video/mp4,video/quicktime" loading={uploadingBeatHelperImage} files={beatHelperUploads.image_uploads} selectedFileId={beatHelperForm.image_file_id} onSelect={(value) => setBeatHelperForm((prev) => ({ ...prev, image_file_id: value, ai_choose_image: false }))} onFileUpload={handleBeatHelperImageUpload} emptyLabel="Select BeatHelper visual" />
                  </div>
                  <label className="mt-4 flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}><input type="checkbox" checked={beatHelperForm.ai_choose_image} onChange={(e) => setBeatHelperForm((prev) => ({ ...prev, ai_choose_image: e.target.checked }))} />Use AI image if no thumbnail is selected</label>
                </StudioSection>

                <StudioSection title="Beat Metadata" description="Core naming and SEO context for the queue item." open={openSections.metadata} onOpenChange={(value) => setSectionOpen("metadata", value)}>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2"><Label>Target Artist</Label><Input value={beatHelperForm.target_artist} onChange={(e) => setBeatHelperForm((prev) => ({ ...prev, target_artist: e.target.value }))} placeholder="e.g. Lil Uzi Vert" /></div>
                    <div className="space-y-2"><Label>Beat Type</Label><Input value={beatHelperForm.beat_type} onChange={(e) => setBeatHelperForm((prev) => ({ ...prev, beat_type: e.target.value }))} placeholder="e.g. rage" /></div>
                    <div className="space-y-2"><Label>Title Override</Label><Input value={beatHelperForm.generated_title_override} onChange={(e) => setBeatHelperForm((prev) => ({ ...prev, generated_title_override: e.target.value }))} placeholder="Leave blank for AI title" /></div>
                    <div className="space-y-2"><Label>Tag Template</Label><Select value={beatHelperForm.template_id || "none"} onValueChange={(value) => setBeatHelperForm((prev) => ({ ...prev, template_id: value === "none" ? "" : value }))}><SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger><SelectContent><SelectItem value="none">No template</SelectItem>{beatHelperTemplates.map((template) => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}</SelectContent></Select></div>
                  </div>
                  <div className="mt-4 space-y-2"><Label>Context Tags</Label><Textarea rows={3} value={beatHelperForm.context_tags} onChange={(e) => setBeatHelperForm((prev) => ({ ...prev, context_tags: e.target.value }))} placeholder="baby pluto, pink tape, melodic rage" /></div>
                </StudioSection>

                <StudioSection title="Web Image Search" description="Search artist or song visuals, then import the exact one you want." badge={visibleBeatHelperImageResults.length ? `${visibleBeatHelperImageResults.length} results` : null} open={openSections.imageSearch} onOpenChange={(value) => setSectionOpen("imageSearch", value)}>
                  <div className="rounded-3xl border p-4" style={{ borderColor: "var(--border-color)", background: "rgba(255,255,255,0.025)" }}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Search directly or auto-build from beat info</p>
                        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Auto mode uses your artist, beat type, title override, and context tags.</p>
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
                        <div key={result.id} className="overflow-hidden rounded-3xl border p-3" style={{ borderColor: "var(--border-color)", background: "rgba(255,255,255,0.028)" }}>
                          <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "var(--border-color)", background: "var(--bg-primary)" }}>
                            <img src={result.image_url} alt={result.title || result.query} className="h-40 w-full object-cover" loading="lazy" onError={() => setBrokenSearchImageIds((prev) => ({ ...prev, [result.id]: true }))} />
                          </div>
                          <Badge className="mt-3 border-emerald-400/40 bg-emerald-500/10 text-emerald-300">{String(result.source || "web").toUpperCase()}</Badge>
                          <p className="mt-3 line-clamp-1 text-base font-semibold" style={{ color: "var(--text-primary)" }}>{result.title || result.query || "Web image"}</p>
                          <p className="mt-1 line-clamp-2 text-sm" style={{ color: "var(--text-secondary)" }}>{result.query || beatHelperImageSearchQuery || "Suggested image"}</p>
                          <Button type="button" variant="ghost" className="mt-3 px-0" disabled={importingBeatHelperImageUrl === result.image_url} onClick={() => handleBeatHelperImportSearchImage(result)}>
                            {importingBeatHelperImageUrl === result.image_url ? "Importing..." : "Use this image"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-3xl border px-4 py-6 text-center text-sm" style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)", background: "rgba(255,255,255,0.02)" }}>
                      Search results will show here. Broken image results are removed automatically.
                    </div>
                  )}
                </StudioSection>

                <StudioSection title="Automation and Delivery" description="Approval timing, notification channel, privacy, and queue automation." open={openSections.automation} onOpenChange={(value) => setSectionOpen("automation", value)}>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="space-y-2"><Label>Auto-skip Hours</Label><Input type="number" min="1" max="72" value={beatHelperForm.approval_timeout_hours} onChange={(e) => setBeatHelperForm((prev) => ({ ...prev, approval_timeout_hours: e.target.value }))} /></div>
                    <div className="space-y-2"><Label>Notify Via</Label><Select value={beatHelperForm.notify_channel} onValueChange={(value) => setBeatHelperForm((prev) => ({ ...prev, notify_channel: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem><SelectItem value="email">Email</SelectItem><SelectItem value="sms">SMS</SelectItem><SelectItem value="email_sms">Email + SMS</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><Label>Privacy</Label><Select value={beatHelperForm.privacy_status} onValueChange={(value) => setBeatHelperForm((prev) => ({ ...prev, privacy_status: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="public">Public</SelectItem><SelectItem value="unlisted">Unlisted</SelectItem><SelectItem value="private">Private</SelectItem></SelectContent></Select></div>
                  </div>
                  <label className="mt-4 flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}><input type="checkbox" checked={beatHelperForm.auto_upload_if_no_response} onChange={(e) => setBeatHelperForm((prev) => ({ ...prev, auto_upload_if_no_response: e.target.checked }))} />Auto-upload if no response comes in</label>
                </StudioSection>

                <StudioSection title="Notification Contact" description="Collapsed by default so it stays out of your way." open={openSections.contacts} onOpenChange={(value) => setSectionOpen("contacts", value)}>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2"><Label>Email</Label><Input value={beatHelperContact.email || ""} onChange={(e) => setBeatHelperContact((prev) => ({ ...prev, email: e.target.value }))} placeholder="you@domain.com" /></div>
                    <div className="space-y-2"><Label>Phone</Label><Input value={beatHelperContact.phone || ""} onChange={(e) => setBeatHelperContact((prev) => ({ ...prev, phone: e.target.value }))} placeholder="+15551234567" /></div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-4 text-sm">
                    <label className="flex items-center gap-2"><input type="checkbox" checked={!!beatHelperContact.email_enabled} onChange={(e) => setBeatHelperContact((prev) => ({ ...prev, email_enabled: e.target.checked }))} />Enable email</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={!!beatHelperContact.sms_enabled} onChange={(e) => setBeatHelperContact((prev) => ({ ...prev, sms_enabled: e.target.checked }))} />Enable SMS</label>
                  </div>
                  <Button type="button" variant="outline" className="mt-4" onClick={handleBeatHelperSaveContact}>Save Contact Settings</Button>
                </StudioSection>

                <StudioSection title="Tag Templates" description="Reusable template bundles tucked behind one panel." badge={beatHelperTemplates.length ? `${beatHelperTemplates.length} saved` : null} open={openSections.templates} onOpenChange={(value) => setSectionOpen("templates", value)}>
                  <div className="space-y-4">
                    <Input value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} placeholder="Template name" />
                    <Textarea rows={3} value={newTemplateTags} onChange={(e) => setNewTemplateTags(e.target.value)} placeholder="tag1, tag2, tag3" />
                    <Button type="button" variant="outline" onClick={handleBeatHelperCreateTemplate}>Save Template</Button>
                    {beatHelperTemplates.length > 0 ? (
                      <div className="space-y-2">
                        {beatHelperTemplates.slice(0, 6).map((template) => (
                          <div key={template.id} className="rounded-2xl border px-3 py-2 text-sm" style={{ borderColor: "var(--border-color)" }}>
                            <div className="font-medium" style={{ color: "var(--text-primary)" }}>{template.name}</div>
                            <div className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>{(template.tags || []).slice(0, 10).join(", ")}</div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </StudioSection>

                <div className="flex flex-wrap items-center gap-3 rounded-3xl border px-4 py-4" style={{ borderColor: "var(--border-color)", background: "rgba(255,255,255,0.03)" }}>
                  <Button type="submit" disabled={loadingBeatHelper} className="gap-2"><Sparkles className="h-4 w-4" />{loadingBeatHelper ? "Queuing..." : "Queue Beat"}</Button>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>One beat plus one thumbnail per queue item.</p>
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
