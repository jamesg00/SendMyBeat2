import { useEffect, useMemo, useState } from "react";
import { Bot, CheckCircle2, Clock3, Image as ImageIcon, LoaderCircle, Mail, Music2, Phone, RefreshCw, Search, Send, Sparkles, Trash2, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
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
  <div
    className="rounded-2xl border px-4 py-3"
    style={{ borderColor: "var(--border-color)", background: "rgba(255,255,255,0.05)" }}
  >
    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--text-secondary)" }}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </div>
    <div className="mt-3 text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
      {value}
    </div>
  </div>
);

const BeatHelperStudio = ({
  loadingBeatHelper,
  beatHelperUploads,
  beatHelperQueue,
  beatHelperImagePreview,
  loadingBeatHelperPreview,
  beatHelperQueueImagePreviews,
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
}) => {
  const queued = beatHelperQueue.length;
  const pending = beatHelperQueue.filter((item) => item.status === "pending_approval").length;
  const uploaded = beatHelperQueue.filter((item) => item.status === "uploaded").length;
  const [preferredReminderChannel, setPreferredReminderChannel] = useState("email");
  const [brokenSearchImageIds, setBrokenSearchImageIds] = useState({});

  useEffect(() => {
    if (beatHelperContact.sms_enabled && beatHelperContact.phone) {
      setPreferredReminderChannel("sms");
      return;
    }
    setPreferredReminderChannel("email");
  }, [beatHelperContact.email, beatHelperContact.phone, beatHelperContact.email_enabled, beatHelperContact.sms_enabled]);

  useEffect(() => {
    setBrokenSearchImageIds({});
  }, [beatHelperImageResults]);

  const contactConfigured = useMemo(() => (
    Boolean((beatHelperContact.email || "").trim() && beatHelperContact.email_enabled) ||
    Boolean((beatHelperContact.phone || "").trim() && beatHelperContact.sms_enabled)
  ), [beatHelperContact.email, beatHelperContact.phone, beatHelperContact.email_enabled, beatHelperContact.sms_enabled]);

  const daysSinceLastActivity = useMemo(() => {
    const timestamps = beatHelperQueue
      .flatMap((item) => [item?.uploaded_at, item?.updated_at, item?.created_at])
      .filter(Boolean)
      .map((value) => {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
      })
      .filter((value) => typeof value === "number");

    if (!timestamps.length) {
      return null;
    }

    const latest = Math.max(...timestamps);
    return Math.floor((Date.now() - latest) / (1000 * 60 * 60 * 24));
  }, [beatHelperQueue]);

  const showReminderNudge = !contactConfigured || daysSinceLastActivity === null || daysSinceLastActivity >= 3;
  const visibleBeatHelperImageResults = useMemo(
    () => beatHelperImageResults.filter((result) => !brokenSearchImageIds[result.id]),
    [beatHelperImageResults, brokenSearchImageIds]
  );

  const handleReminderBootstrap = async () => {
    const nextContact =
      preferredReminderChannel === "email"
        ? { ...beatHelperContact, email_enabled: true, sms_enabled: false }
        : { ...beatHelperContact, email_enabled: false, sms_enabled: true };
    setBeatHelperContact(nextContact);
    await handleBeatHelperSaveContact(nextContact);
  };

  return (
    <div className="space-y-6">
      <Card
        className="overflow-hidden border"
        style={{
          borderColor: "color-mix(in srgb, var(--accent-primary) 34%, var(--border-color))",
          background:
            "radial-gradient(circle at top left, color-mix(in srgb, var(--accent-primary) 18%, transparent), transparent 42%), linear-gradient(135deg, color-mix(in srgb, var(--bg-secondary) 92%, black), color-mix(in srgb, var(--bg-primary) 90%, black))",
        }}
      >
        <CardContent className="px-5 py-6 sm:px-7 sm:py-7">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.24em]" style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)", background: "rgba(255,255,255,0.04)" }}>
                <Bot className="h-3.5 w-3.5" />
                BeatHelper Studio
              </div>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl" style={{ color: "var(--text-primary)" }}>
                  A calmer queue builder for BeatHelper.
                </h2>
                <p className="mt-2 max-w-2xl text-sm sm:text-base" style={{ color: "var(--text-secondary)" }}>
                  Compose a queue item on the left, manage automation below, and review the lineup on the right.
                </p>
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

      {showReminderNudge && (
        <Card
          className="overflow-hidden border"
          style={{
            borderColor: "color-mix(in srgb, var(--accent-secondary) 38%, var(--border-color))",
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--accent-secondary) 14%, var(--bg-secondary)), color-mix(in srgb, var(--bg-secondary) 92%, black))",
          }}
        >
          <CardContent className="px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em]" style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>
                  <Clock3 className="h-3.5 w-3.5" />
                  BeatHelper Reminder
                </div>
                <h3 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
                  {daysSinceLastActivity === null
                    ? "Set up reminders before your queue goes cold."
                    : `You haven't uploaded in ${daysSinceLastActivity} day${daysSinceLastActivity === 1 ? "" : "s"}.`}
                </h3>
                <p className="text-sm sm:text-base" style={{ color: "var(--text-secondary)" }}>
                  BeatHelper can ping you when your queue is empty or stale. Pick one contact method and it will send a confirmation automatically.
                </p>
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
                      <Input
                        className="pl-10"
                        value={beatHelperContact.email || ""}
                        onChange={(e) => setBeatHelperContact((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder="you@domain.com"
                      />
                    </div>
                  ) : (
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60" />
                      <Input
                        className="pl-10"
                        value={beatHelperContact.phone || ""}
                        onChange={(e) => setBeatHelperContact((prev) => ({ ...prev, phone: e.target.value }))}
                        placeholder="+15551234567"
                      />
                    </div>
                  )}
                </div>

                <Button
                  type="button"
                  className="self-end"
                  disabled={
                    loadingBeatHelper ||
                    (preferredReminderChannel === "email"
                      ? !(beatHelperContact.email || "").trim()
                      : !(beatHelperContact.phone || "").trim())
                  }
                  onClick={handleReminderBootstrap}
                >
                  Enable Reminders
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <div className="space-y-6">
          <Card className="dashboard-card">
            <CardHeader className="border-b pb-5" style={{ borderColor: "var(--border-color)" }}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Wand2 className="h-5 w-5 text-[var(--accent-primary)]" />
                    Queue Composer
                  </CardTitle>
                  <CardDescription>Pick the beat, thumbnail, and delivery rules. BeatHelper handles the rest.</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={fetchBeatHelperData} disabled={loadingBeatHelper} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </Button>
                  <Button type="button" variant="outline" onClick={handleBeatHelperDispatchNow} disabled={loadingBeatHelper}>
                    Send Today's Approval
                  </Button>
                  <Button type="button" variant="outline" onClick={handleBeatHelperCleanupUploads} disabled={loadingBeatHelper}>
                    Clean Unqueued Uploads
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleBeatHelperQueue} className="space-y-6">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.15fr)_320px]">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Beat Audio</Label>
                        <Select value={beatHelperForm.beat_file_id} onValueChange={(value) => setBeatHelperForm((prev) => ({ ...prev, beat_file_id: value }))}>
                          <SelectTrigger><SelectValue placeholder="Select queued beat audio" /></SelectTrigger>
                          <SelectContent>
                            {beatHelperUploads.audio_uploads.map((file) => (
                              <SelectItem key={file.id} value={file.id}>{formatUploadLabel(file)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                          Only BeatHelper queue-linked uploads appear here.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Thumbnail Image</Label>
                        <Select value={beatHelperForm.image_file_id} onValueChange={(value) => setBeatHelperForm((prev) => ({ ...prev, image_file_id: value }))}>
                          <SelectTrigger><SelectValue placeholder="Select queued thumbnail" /></SelectTrigger>
                          <SelectContent>
                            {beatHelperUploads.image_uploads.map((file) => (
                              <SelectItem key={file.id} value={file.id}>{formatUploadLabel(file)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                          <input
                            type="checkbox"
                            checked={beatHelperForm.ai_choose_image}
                            onChange={(e) => setBeatHelperForm((prev) => ({ ...prev, ai_choose_image: e.target.checked }))}
                          />
                          Use AI image if no thumbnail is selected
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Target Artist</Label>
                        <Input value={beatHelperForm.target_artist} onChange={(e) => setBeatHelperForm((prev) => ({ ...prev, target_artist: e.target.value }))} placeholder="e.g. Lil Uzi Vert" />
                      </div>
                      <div className="space-y-2">
                        <Label>Beat Type</Label>
                        <Input value={beatHelperForm.beat_type} onChange={(e) => setBeatHelperForm((prev) => ({ ...prev, beat_type: e.target.value }))} placeholder="e.g. rage" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Title Override</Label>
                        <Input value={beatHelperForm.generated_title_override} onChange={(e) => setBeatHelperForm((prev) => ({ ...prev, generated_title_override: e.target.value }))} placeholder="Leave blank for AI title" />
                      </div>
                      <div className="space-y-2">
                        <Label>Tag Template</Label>
                        <Select value={beatHelperForm.template_id || "none"} onValueChange={(value) => setBeatHelperForm((prev) => ({ ...prev, template_id: value === "none" ? "" : value }))}>
                          <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No template</SelectItem>
                            {beatHelperTemplates.map((template) => (
                              <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Context Tags</Label>
                      <Textarea rows={3} value={beatHelperForm.context_tags} onChange={(e) => setBeatHelperForm((prev) => ({ ...prev, context_tags: e.target.value }))} placeholder="baby pluto, pink tape, melodic rage" />
                    </div>

                    <div className="rounded-3xl border p-4" style={{ borderColor: "var(--border-color)", background: "rgba(255,255,255,0.035)" }}>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Search Web Images</p>
                          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                            Search rapper or song visuals directly, then import only the one you want.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="gap-2"
                          onClick={() => handleBeatHelperImageSearch({ autoBuild: true })}
                          disabled={loadingBeatHelperImageSearch}
                        >
                          <Sparkles className="h-4 w-4" />
                          Auto From Beat Info
                        </Button>
                      </div>

                      <div className="mt-4 flex flex-col gap-3 lg:flex-row">
                        <div className="relative flex-1">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60" />
                          <Input
                            className="pl-10"
                            value={beatHelperImageSearchQuery}
                            onChange={(e) => setBeatHelperImageSearchQuery(e.target.value)}
                            placeholder="Search Lil Baby, Gunna album cover, trap skyline..."
                          />
                        </div>
                        <Button
                          type="button"
                          className="gap-2"
                          onClick={() => handleBeatHelperImageSearch({ autoBuild: false })}
                          disabled={loadingBeatHelperImageSearch}
                        >
                          {loadingBeatHelperImageSearch ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                          Search
                        </Button>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                        {visibleBeatHelperImageResults.length ? visibleBeatHelperImageResults.map((result) => {
                          const isImporting = importingBeatHelperImageUrl === result.image_url;
                          return (
                            <button
                              key={result.id}
                              type="button"
                              className="group overflow-hidden rounded-2xl border text-left transition hover:-translate-y-0.5"
                              style={{
                                borderColor: "var(--border-color)",
                                background: "rgba(255,255,255,0.045)",
                                boxShadow: "0 14px 40px rgba(0,0,0,0.16)",
                              }}
                              onClick={() => handleBeatHelperImportSearchImage(result)}
                              disabled={isImporting}
                            >
                              <div className="aspect-[4/3] overflow-hidden bg-black/20">
                                <img
                                  src={result.thumbnail_url || result.image_url}
                                  alt={result.artist || result.query_used || "BeatHelper search result"}
                                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                                  loading="lazy"
                                  onError={() => {
                                    setBrokenSearchImageIds((prev) => ({ ...prev, [result.id]: true }));
                                  }}
                                />
                              </div>
                              <div className="space-y-2 p-3">
                                <div className="flex items-center justify-between gap-2">
                                  <Badge variant="outline" className="max-w-full truncate text-[10px] uppercase tracking-[0.18em]">
                                    {result.source}
                                  </Badge>
                                  {isImporting ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : null}
                                </div>
                                <div>
                                  <p className="truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                                    {result.artist || result.query_used || "Web image"}
                                  </p>
                                  <p className="truncate text-xs" style={{ color: "var(--text-secondary)" }}>
                                    {result.query_used || "Suggested search"}
                                  </p>
                                </div>
                                <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                                  {isImporting ? "Importing..." : "Use this image"}
                                </p>
                              </div>
                            </button>
                          );
                        }) : (
                          <div className="col-span-full rounded-2xl border border-dashed p-5 text-sm" style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>
                            Search manually or use auto-build to pull rapper and beat-inspired web images here without storing anything until you pick one.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border p-4" style={{ borderColor: "var(--border-color)", background: "color-mix(in srgb, var(--bg-secondary) 85%, transparent)" }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Selected Thumbnail</p>
                        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Quick visual check</p>
                      </div>
                      <ImageIcon className="h-4 w-4" style={{ color: "var(--accent-primary)" }} />
                    </div>
                    <div className="mt-4 overflow-hidden rounded-2xl border" style={{ borderColor: "var(--border-color)", background: "var(--bg-primary)", minHeight: "220px" }}>
                      {loadingBeatHelperPreview ? (
                        <div className="flex h-[220px] items-center justify-center text-sm" style={{ color: "var(--text-secondary)" }}>Loading image preview...</div>
                      ) : beatHelperImagePreview ? (
                        <img src={beatHelperImagePreview} alt="Selected thumbnail preview" className="h-[220px] w-full object-contain" />
                      ) : (
                        <div className="flex h-[220px] flex-col items-center justify-center gap-2 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                          <ImageIcon className="h-8 w-8 opacity-60" />
                          <span>Select an image or let AI choose one.</span>
                        </div>
                      )}
                    </div>
                    <Separator className="my-4" />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Auto-skip Hours</Label>
                        <Input type="number" min="1" max="72" value={beatHelperForm.approval_timeout_hours} onChange={(e) => setBeatHelperForm((prev) => ({ ...prev, approval_timeout_hours: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Notify Via</Label>
                        <Select value={beatHelperForm.notify_channel} onValueChange={(value) => setBeatHelperForm((prev) => ({ ...prev, notify_channel: value }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="sms">SMS</SelectItem>
                            <SelectItem value="email_sms">Email + SMS</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Privacy</Label>
                        <Select value={beatHelperForm.privacy_status} onValueChange={(value) => setBeatHelperForm((prev) => ({ ...prev, privacy_status: value }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="public">Public</SelectItem>
                            <SelectItem value="unlisted">Unlisted</SelectItem>
                            <SelectItem value="private">Private</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <label className="mt-4 flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                      <input
                        type="checkbox"
                        checked={beatHelperForm.auto_upload_if_no_response}
                        onChange={(e) => setBeatHelperForm((prev) => ({ ...prev, auto_upload_if_no_response: e.target.checked }))}
                      />
                      Auto-upload if no response comes in
                    </label>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button type="submit" disabled={loadingBeatHelper} className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    {loadingBeatHelper ? "Queuing..." : "Queue Beat"}
                  </Button>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    One beat + one thumbnail per queue item.
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="dashboard-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Mail className="h-4 w-4 text-[var(--accent-primary)]" />
                  Notification Contact
                </CardTitle>
                <CardDescription>Approval nudges and delivery settings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={beatHelperContact.email || ""} onChange={(e) => setBeatHelperContact((prev) => ({ ...prev, email: e.target.value }))} placeholder="you@domain.com" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={beatHelperContact.phone || ""} onChange={(e) => setBeatHelperContact((prev) => ({ ...prev, phone: e.target.value }))} placeholder="+15551234567" />
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={!!beatHelperContact.email_enabled} onChange={(e) => setBeatHelperContact((prev) => ({ ...prev, email_enabled: e.target.checked }))} />
                    Enable email
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={!!beatHelperContact.sms_enabled} onChange={(e) => setBeatHelperContact((prev) => ({ ...prev, sms_enabled: e.target.checked }))} />
                    Enable SMS
                  </label>
                </div>
                <Button variant="outline" onClick={handleBeatHelperSaveContact}>
                  Save Contact Settings
                </Button>
              </CardContent>
            </Card>

            <Card className="dashboard-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Bot className="h-4 w-4 text-[var(--accent-primary)]" />
                  Tag Templates
                </CardTitle>
                <CardDescription>Reusable tag bundles for faster queueing.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} placeholder="Template name" />
                <Textarea rows={3} value={newTemplateTags} onChange={(e) => setNewTemplateTags(e.target.value)} placeholder="tag1, tag2, tag3" />
                <Button variant="outline" onClick={handleBeatHelperCreateTemplate}>
                  Save Template
                </Button>
                {beatHelperTemplates.length > 0 && (
                  <div className="space-y-2">
                    {beatHelperTemplates.slice(0, 5).map((template) => (
                      <div key={template.id} className="rounded-2xl border px-3 py-2 text-sm" style={{ borderColor: "var(--border-color)" }}>
                        <div className="font-medium" style={{ color: "var(--text-primary)" }}>{template.name}</div>
                        <div className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                          {(template.tags || []).slice(0, 8).join(", ")}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="dashboard-card overflow-hidden">
          <CardHeader className="border-b pb-5" style={{ borderColor: "var(--border-color)" }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Clock3 className="h-5 w-5 text-[var(--accent-primary)]" />
                  Queue Review
                </CardTitle>
                <CardDescription>Approve, edit, skip, or remove beats without leaving the studio.</CardDescription>
              </div>
              <Badge className="border-transparent bg-[var(--accent-primary)]/15 text-[var(--text-primary)]">
                {queued} item{queued === 1 ? "" : "s"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {queued === 0 ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 px-6 py-12 text-center">
                <Music2 className="h-10 w-10 opacity-60" style={{ color: "var(--accent-primary)" }} />
                <div>
                  <p className="text-lg font-medium" style={{ color: "var(--text-primary)" }}>No queued beats yet.</p>
                  <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                    Build the first queue item on the left and BeatHelper will handle the rest.
                  </p>
                </div>
              </div>
            ) : (
              <ScrollArea className="h-[920px]">
                <div className="space-y-4 p-4">
                  {beatHelperQueue.map((item) => {
                    const edit = editingQueueById[item.id];
                    const preview = beatHelperQueueImagePreviews[item.image_file_id];
                    return (
                      <div key={item.id} className="rounded-3xl border p-4 sm:p-5" style={{ borderColor: "var(--border-color)", background: "color-mix(in srgb, var(--bg-secondary) 88%, transparent)" }}>
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[160px_minmax(0,1fr)]">
                          <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "var(--border-color)", background: "var(--bg-primary)" }}>
                            {preview ? (
                              <img src={preview} alt={item.image_original_filename || "Queued thumbnail"} className="h-40 w-full object-cover" />
                            ) : (
                              <div className="flex h-40 items-center justify-center text-xs" style={{ color: "var(--text-secondary)" }}>No preview</div>
                            )}
                          </div>
                          <div className="min-w-0 space-y-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="truncate text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                                    {item.generated_title || item.beat_original_filename}
                                  </h3>
                                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] ${STATUS_CLASS[item.status] || STATUS_CLASS.queued}`}>
                                    {item.status}
                                  </span>
                                </div>
                                <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                                  {item.target_artist} - {item.beat_type}
                                </p>
                                <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                                  Scheduled (UTC): {item.scheduled_for_utc || "n/a"}
                                </p>
                              </div>
                            </div>

                            {!edit ? (
                              <>
                                <div className="rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: "var(--border-color)", background: "rgba(255,255,255,0.03)", color: "var(--text-secondary)" }}>
                                  {(item.generated_tags || []).slice(0, 8).join(", ") || "No tags generated yet"}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Button size="sm" variant="outline" onClick={() => handleBeatHelperRequestApproval(item.id)} className="gap-1">
                                    <Send className="h-3 w-3" />
                                    Request Approval
                                  </Button>
                                  <Button size="sm" onClick={() => handleBeatHelperApproveUpload(item.id)}>
                                    Approve + Upload
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => handleBeatHelperSetStatus(item.id, "skipped")}>
                                    Skip
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => startEditBeatHelperItem(item)}>
                                    Edit
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={() => handleBeatHelperDelete(item.id)} className="gap-1">
                                    <Trash2 className="h-3 w-3" />
                                    Remove
                                  </Button>
                                  {item.video_url && (
                                    <Button size="sm" variant="outline" onClick={() => window.open(item.video_url, "_blank")}>
                                      Open Video
                                    </Button>
                                  )}
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
                                      {beatHelperTemplates.map((template) => (
                                        <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                  <Select value={edit.beat_file_id} onValueChange={(value) => setEditingQueueById((prev) => ({ ...prev, [item.id]: { ...prev[item.id], beat_file_id: value } }))}>
                                    <SelectTrigger><SelectValue placeholder="Beat" /></SelectTrigger>
                                    <SelectContent>
                                      {beatHelperUploads.audio_uploads.map((file) => (
                                        <SelectItem key={file.id} value={file.id}>{formatUploadLabel(file)}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Select value={edit.image_file_id} onValueChange={(value) => setEditingQueueById((prev) => ({ ...prev, [item.id]: { ...prev[item.id], image_file_id: value } }))}>
                                    <SelectTrigger><SelectValue placeholder="Image" /></SelectTrigger>
                                    <SelectContent>
                                      {beatHelperUploads.image_uploads.map((file) => (
                                        <SelectItem key={file.id} value={file.id}>{formatUploadLabel(file)}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <Textarea rows={2} value={edit.generated_tags_text} onChange={(e) => setEditingQueueById((prev) => ({ ...prev, [item.id]: { ...prev[item.id], generated_tags_text: e.target.value } }))} placeholder="Comma separated tags" />
                                <Textarea rows={4} value={edit.generated_description} onChange={(e) => setEditingQueueById((prev) => ({ ...prev, [item.id]: { ...prev[item.id], generated_description: e.target.value } }))} placeholder="Description" />
                                {assistTitlesById[item.id]?.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {assistTitlesById[item.id].map((title) => (
                                      <button
                                        key={title}
                                        type="button"
                                        className="rounded-full border px-3 py-1.5 text-xs"
                                        style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                                        onClick={() => setEditingQueueById((prev) => ({ ...prev, [item.id]: { ...prev[item.id], generated_title: title } }))}
                                      >
                                        {title}
                                      </button>
                                    ))}
                                  </div>
                                )}
                                <div className="flex flex-wrap gap-2">
                                  <Button size="sm" variant="outline" onClick={() => handleBeatHelperAssistTitle(item.id)}>
                                    AI Titles
                                  </Button>
                                  <Button size="sm" onClick={() => handleBeatHelperSaveEdit(item.id)}>
                                    Save Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditingQueueById((prev) => {
                                      const next = { ...prev };
                                      delete next[item.id];
                                      return next;
                                    })}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BeatHelperStudio;
