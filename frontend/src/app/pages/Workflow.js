import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import * as api from "@/app/api";
import { cancelGeneration, generate, setRun, useDraft } from "@/app/draft";
import { DescriptionEditor, TagEditor } from "@/app/editors";
import { PlanCard, usePlan } from "@/app/pros";
import { copyText, openPaywall, refreshSubscription, requireCredit, useFlash, useRequest, useSubscription, useUser } from "@/app/store";
import { Button, Card, Checklist, JobProgress, ListGroup, ListRow, Meter, PlayPauseIcon, Screen, SectionLabel, Segmented, Spinner, cx } from "@/app/ui";
import UploadStudio from "@/components/UploadStudio";

// Workflow: build your tags and description, review them, then upload (the app's first tab).

const TAG_STEPS = [
  "Reading your search…",
  "Searching YouTube for top type beats…",
  "Pulling tags from similar videos…",
  "Asking AI for type beat variations…",
  "Scoring and ranking tags…",
  "Almost there…",
];

const upsert = (list, item) => [item, ...(list ?? []).filter((x) => x.id !== item.id)];

function shortDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days < 1) return "Today";
  if (days < 2) return "Yesterday";
  return d.toLocaleDateString("en", { month: "short", day: "numeric" });
}

export default function Workflow() {
  const [step, setStep] = useState("build");
  const draft = useDraft();
  const sub = useSubscription();
  const history = useRequest(api.tagHistory);
  const descriptions = useRequest(api.descriptions);
  const { plan, setPlan } = usePlan();

  // A run that finished after the list loaded (e.g. resumed after a reload) still shows up.
  const last = draft.lastGenerated;
  const runs = last && !(history.data ?? []).some((r) => r.id === last.id) ? [last, ...(history.data ?? [])] : (history.data ?? []);

  const openRun = (r) => {
    setRun(r);
    setStep("review");
  };

  const onGenerate = async (query, customTags) => {
    if (!requireCredit("ai")) return;
    const r = await generate(query, customTags);
    void refreshSubscription();
    if (r) history.setData((cur) => upsert(cur, r));
  };

  return (
    <Screen title="Workflow" wide>
      {sub && !sub.is_subscribed ? (
        <FreePlanCard trialAvailable={!!sub.trial_available} />
      ) : (
        <button type="button" onClick={() => openPaywall(sub?.pro_access ? "needs_plan" : "needs_pro")} aria-label="Credits and plans" style={{ all: "unset", cursor: "pointer", display: "flex", gap: 20, maxWidth: 520 }}>
          {sub ? (
            <>
              <UsageMeter label={sub.trial ? "AI credits left today" : "AI credits left"} left={sub.daily_credits_remaining} total={sub.daily_credits_total} />
              <UsageMeter label={sub.trial ? "Uploads left today" : "Uploads left"} left={sub.upload_credits_remaining} total={sub.upload_credits_total} />
            </>
          ) : (
            <span className="s-muted">Loading your plan…</span>
          )}
        </button>
      )}

      <div style={{ maxWidth: 520, width: "100%" }}>
        <Segmented
          value={step}
          onChange={setStep}
          label="Workflow step"
          options={[
            { value: "build", label: "Build" },
            { value: "review", label: "Review" },
            { value: "upload", label: "Upload" },
          ]}
        />
      </div>

      {step === "build" ? (
        <BuildStep
          plan={plan}
          setPlan={setPlan}
          runs={runs}
          history={history}
          onGenerate={onGenerate}
          onOpen={openRun}
          descriptions={descriptions.data ?? []}
          onDescriptionSaved={(d) => descriptions.setData((cur) => upsert(cur, d))}
          onDescriptionDeleted={(id) => descriptions.setData((cur) => (cur ?? []).filter((d) => d.id !== id))}
        />
      ) : null}
      {step === "review" ? (
        <ReviewStep onBack={() => setStep("build")} onDone={() => setStep("upload")} onTagsSaved={(r) => history.setData((cur) => (cur ?? []).map((x) => (x.id === r.id ? r : x)))} />
      ) : null}
      {step === "upload" ? <UploadStep runs={runs} descriptions={descriptions.data ?? []} onBuild={() => setStep("build")} /> : null}
    </Screen>
  );
}

// Free accounts have no credits: the way in is the trial or a plan.
function FreePlanCard({ trialAvailable }) {
  return (
    <Card style={{ maxWidth: 520 }}>
      <div className="s-stack" style={{ gap: 6 }}>
        <span className="s-card-title">{trialAvailable ? "Try SendMyBeat free for 3 days" : "Pick a plan to start"}</span>
        <span className="s-muted">
          {trialAvailable
            ? "3 generations and 3 uploads a day, then Plus at $5/month. Cancel any time."
            : "Plus is 50 generations and 50 uploads a month for $5. Pro is 100 of each, plus pro styles and analytics, for $10."}
        </span>
      </div>
      <Button title={trialAvailable ? "Start free trial" : "See plans"} onClick={() => openPaywall("needs_plan")} />
    </Card>
  );
}

function UsageMeter({ label, left, total }) {
  return (
    <span className="s-stack" style={{ flex: 1, gap: 8 }}>
      <span className="s-row-between" style={{ alignItems: "baseline" }}>
        <span className="s-label">{label}</span>
        <span className="s-mono" style={{ color: "var(--text)", fontSize: 13 }}>
          {left}
          <span style={{ color: "var(--t3)" }}>/{total}</span>
        </span>
      </span>
      <Meter value={total > 0 ? left / total : 0} />
    </span>
  );
}

function BuildStep({ plan, setPlan, runs, history, onGenerate, onOpen, descriptions, onDescriptionSaved, onDescriptionDeleted }) {
  const { generation, generationError, lastGenerated, run } = useDraft();
  const [query, setQuery] = useState("");
  const [extra, setExtra] = useState("");
  const [showExtra, setShowExtra] = useState(false);
  const [merging, setMerging] = useState(false);
  const [picked, setPicked] = useState([]);
  const [mergeJob, setMergeJob] = useState(null);
  const [error, setError] = useState(null);

  const submit = (e) => {
    e.preventDefault();
    if (!query.trim() || generation) return;
    void onGenerate(
      query.trim(),
      extra
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    );
    setQuery("");
    setExtra("");
  };

  const remove = async (r) => {
    if (!window.confirm(`Delete “${r.query}”?\n\nIts ${r.tags.length} tags are removed from your history.`)) return;
    setError(null);
    try {
      await api.deleteTagRun(r.id);
      history.setData((cur) => (cur ?? []).filter((x) => x.id !== r.id));
      if (run?.id === r.id) setRun(null);
    } catch (e) {
      setError(e.message || "Could not delete it.");
    }
  };

  // Merge two or more runs into one tag list with AI.
  const merge = async () => {
    const chosen = runs.filter((r) => picked.includes(r.id));
    if (chosen.length < 2 || mergeJob || !requireCredit("ai")) return;
    setError(null);
    setMergeJob({ startedAt: Date.now(), progress: 0 });
    try {
      const res = await api.joinTags(
        chosen.map((r) => r.query),
        chosen.flatMap((r) => r.tags),
        { onProgress: (progress) => setMergeJob((j) => j && { ...j, progress }) },
      );
      if (!res?.tags?.length) throw new Error("The merge came back empty. Try again.");
      const saved = await api.saveTagRun(chosen.map((r) => r.query).join(" x "), res.tags);
      history.setData((cur) => upsert(cur, saved));
      setPicked([]);
      setMerging(false);
      onOpen(saved);
    } catch (e) {
      setError(e.message || "Could not merge those runs.");
    } finally {
      setMergeJob(null);
      void refreshSubscription();
    }
  };

  return (
    <div className="s-cols">
      <div className="s-col">
        {plan ? <PlanCard plan={plan} onChange={setPlan} /> : null}

        {generation ? (
          <div className="s-stack" style={{ gap: 8 }}>
            <JobProgress title={generation.query} startedAt={generation.startedAt} expectedSec={45} progress={generation.progress} steps={TAG_STEPS} onCancel={cancelGeneration} />
            <span className="s-muted">Runs in the background. You can switch tabs while it works.</span>
          </div>
        ) : (
          <Card>
            <div className="s-row-between">
              <span className="s-card-title">Generate tags</span>
              <span className="s-mono">60–80 tags · 1 credit</span>
            </div>
            <form onSubmit={submit} className="s-stack" style={{ gap: 12 }}>
              <div className="s-input-row">
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Artist or vibe, e.g. travis scott" aria-label="Search query" autoCapitalize="none" autoFocus />
                <span className="s-kbd" aria-hidden="true">
                  return
                </span>
              </div>
              {showExtra ? (
                <input className="s-input" value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Tags to always include, comma separated" aria-label="Tags to always include" />
              ) : (
                <button type="button" className="s-link s-sub" style={{ alignSelf: "flex-start" }} onClick={() => setShowExtra(true)}>
                  + Add your own tags to include
                </button>
              )}
              {generationError ? <span className="s-error">{generationError}</span> : null}
              <Button title="Generate" type="submit" disabled={!query.trim()} />
            </form>
          </Card>
        )}

        {!generation && lastGenerated && lastGenerated.id === run?.id ? (
          <button type="button" className="s-done-row" onClick={() => onOpen(lastGenerated)}>
            <span className="s-mono s-ok">✓</span>
            <span style={{ flex: 1 }}>
              {lastGenerated.tags.length} tags ready for <span style={{ color: "var(--text)" }}>{lastGenerated.query}</span>
            </span>
            <span style={{ color: "var(--text)" }}>Review ›</span>
          </button>
        ) : null}

        <div>
          <div className="s-row-between" style={{ alignItems: "baseline", paddingBottom: 8 }}>
            <span className="s-label">Recent runs</span>
            {runs.length > 1 ? (
              <button
                type="button"
                className="s-link s-hint"
                onClick={() => {
                  setMerging(!merging);
                  setPicked([]);
                }}>
                {merging ? "Cancel merge" : "Merge runs"}
              </button>
            ) : null}
          </div>
          {error ? <p className="s-error" style={{ paddingBottom: 8 }}>{error}</p> : null}
          {history.loading ? (
            <Spinner />
          ) : history.error ? (
            <span className="s-error">{history.error}</span>
          ) : runs.length === 0 ? (
            <span className="s-muted">Your generated tag sets will show up here.</span>
          ) : (
            runs.slice(0, merging ? 30 : 10).map((r) => {
              const on = picked.includes(r.id);
              return (
                <div key={r.id} className="s-hair">
                  <button
                    type="button"
                    onClick={() => (merging ? setPicked(on ? picked.filter((id) => id !== r.id) : [...picked, r.id]) : onOpen(r))}
                    aria-pressed={merging ? on : undefined}
                    style={{ all: "unset", boxSizing: "border-box", flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 12, minHeight: 52, cursor: "pointer" }}>
                    {merging ? <span className={cx("s-box", on && "on")} style={{ width: 18, height: 18 }} /> : null}
                    <span className="s-truncate" style={{ flex: 1 }}>
                      {r.query}
                    </span>
                    <span className="s-mono">{r.tags.length} tags</span>
                    <span className="s-sub" style={{ width: 64, textAlign: "right", color: "var(--t3)" }}>
                      {shortDate(r.created_at)}
                    </span>
                  </button>
                  {merging ? null : (
                    <button type="button" className="s-hair-x" onClick={() => void remove(r)} aria-label={`Delete ${r.query}`}>
                      ×
                    </button>
                  )}
                </div>
              );
            })
          )}
          {merging ? (
            <div className="s-stack" style={{ gap: 8, paddingTop: 12 }}>
              {mergeJob ? (
                <JobProgress title="Merging runs" startedAt={mergeJob.startedAt} expectedSec={30} progress={mergeJob.progress} steps={["Combining the tag lists…", "Picking the strongest tags…", "Scoring the merged set…"]} />
              ) : (
                <Button title={picked.length < 2 ? "Pick two or more runs" : `Merge ${picked.length} runs with AI · 1 credit`} size="md" disabled={picked.length < 2} onClick={() => void merge()} />
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className="s-col">
        <DescriptionEditor saved={descriptions} onSaved={onDescriptionSaved} onDeleted={onDescriptionDeleted} />
      </div>
    </div>
  );
}

function ReviewStep({ onBack, onDone, onTagsSaved }) {
  const { run, description } = useDraft();
  const [copied, flashCopied] = useFlash();

  if (!run) {
    return (
      <Card style={{ maxWidth: 520 }}>
        <span className="s-card-title">No tags yet</span>
        <span className="s-muted">Generate tags or open a recent run first.</span>
        <Button title="Go to Build" variant="secondary" size="md" onClick={onBack} />
      </Card>
    );
  }

  return (
    <div className="s-cols">
      <div className="s-col">
        <TagEditor
          key={run.id}
          run={run}
          onSaved={(r) => {
            setRun(r);
            onTagsSaved(r);
          }}
        />
      </div>
      <div className="s-col">
        <Card>
          <div className="s-row-between">
            <span className="s-card-title s-truncate">{description.title}</span>
            <Button title="Change" variant="secondary" size="sm" onClick={onBack} />
          </div>
          <div className="s-quote s-quote--clamp">{description.content}</div>
          <Button
            title={copied ? "Copied ✓" : "Copy description"}
            variant="secondary"
            size="md"
            onClick={async () => {
              if (await copyText(description.content)) flashCopied();
            }}
          />
        </Card>
        <Checklist
          title="BEFORE YOU UPLOAD"
          items={[
            { label: "Tags", done: run.tags.length > 0 },
            { label: "Description", done: !!description.content.trim(), onClick: onBack },
          ]}
        />
        <Button title="Continue to upload" onClick={onDone} />
      </div>
    </div>
  );
}

function UploadStep({ runs, descriptions, onBuild }) {
  const { run, description } = useDraft();
  const user = useUser();
  const sub = useSubscription();
  const navigate = useNavigate();
  const yt = useRequest(api.youtubeStatus);
  const connected = !!yt.data?.connected;

  const connect = async () => {
    try {
      window.location.href = (await api.youtubeAuthUrl()).auth_url;
    } catch (e) {
      toast.error(e.message || "Could not start the YouTube connection.");
    }
  };
  const disconnect = async () => {
    if (!window.confirm("Disconnect this YouTube account?\n\nYou can connect it, or another one, again at any time.")) return;
    try {
      await api.youtubeDisconnect();
      yt.setData(() => ({ connected: false }));
    } catch (e) {
      toast.error(e.message || "Could not disconnect YouTube.");
    }
  };

  // Upload Studio reads the plan after an upload to show the credits left.
  useEffect(() => () => void refreshSubscription(), []);

  return (
    <div className="s-col">
      <div className="s-cols">
        <div className="s-col" style={{ gap: 8 }}>
          <SectionLabel>YouTube</SectionLabel>
          <ListGroup>
            <ListRow
              title={yt.loading ? "Checking…" : connected ? (yt.data.name ?? "Connected") : "Not connected"}
              subtitle={connected ? (yt.data.email ?? "Ready to upload to this channel") : (yt.error ?? "Connect the channel you upload to")}
              height={60}
              left={
                connected && yt.data.profile_picture ? (
                  <img className="s-avatar" src={yt.data.profile_picture} alt="" style={{ width: 32, height: 32 }} />
                ) : (
                  <span className="s-tile s-tile--line" style={{ background: "var(--youtube)", borderColor: "transparent" }}>
                    <PlayPauseIcon playing={false} size={13} color="#fff" />
                  </span>
                )
              }
              right={yt.loading ? <Spinner /> : connected ? <Button title="Disconnect" variant="secondary" size="sm" onClick={() => void disconnect()} /> : <Button title="Connect" size="sm" onClick={() => void connect()} />}
            />
          </ListGroup>
        </div>
        <Checklist
          title="BEFORE YOU OPEN UPLOAD STUDIO"
          items={[
            { label: "YouTube connected", done: connected, onClick: () => void connect() },
            { label: run ? `${run.tags.length} tags` : "Tags", done: !!run, optional: true, onClick: onBuild },
            { label: description.saved ? "Description" : "Saved description", done: description.saved && !!description.content.trim(), onClick: onBuild },
          ]}
        />
      </div>
      {!description.saved ? (
        <p className="s-muted">
          Upload Studio uses your saved descriptions. To use the “{description.title}” template, open Build and choose “Customize this template” to save your own copy.
        </p>
      ) : null}

      <UploadStudio
        user={user}
        analyticsData={null}
        subscriptionStatus={sub}
        youtubeConnected={connected}
        youtubeProfilePicture={yt.data?.profile_picture ?? ""}
        youtubeName={yt.data?.name ?? ""}
        youtubeEmail={yt.data?.email ?? ""}
        descriptions={descriptions}
        tagHistory={runs}
        API={api.API}
        onUpgrade={() => openPaywall(sub?.is_subscribed ? "needs_pro" : "needs_plan")}
        onDisconnectYouTube={() => void disconnect()}
        onConnectYouTube={() => void connect()}
        initialTagsId={run?.id}
        initialDescriptionId={description.saved ? description.id : undefined}
      />
      <button type="button" className="s-link s-sub" style={{ alignSelf: "flex-start" }} onClick={() => navigate("/analytics")}>
        After it’s live: see how your uploads are doing in Analytics →
      </button>
    </div>
  );
}
