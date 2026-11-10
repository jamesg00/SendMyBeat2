import { useState } from "react";

import * as api from "@/app/api";
import { setDescription, useDraft } from "@/app/draft";
import { copyText, useFlash } from "@/app/store";
import { DESCRIPTION_TEMPLATES } from "@/app/templates";
import { Button, Card, ListGroup, Meter, Segmented, Sheet, cx } from "@/app/ui";

// The description and tag editors (mobile/src/components/editors.tsx).

// YouTube rejects tag lists longer than this. It joins tags with commas and wraps a tag that
// has a space in quotes, which count too (the server counts the same way).
export const TAG_CHAR_LIMIT = 500;
const tagCost = (t) => t.length + (t.includes(" ") ? 2 : 0);
export const tagChars = (tags) => (tags.length ? tags.reduce((n, t) => n + tagCost(t), 0) + tags.length - 1 : 0);

// Pick, write, edit and delete descriptions.
export function DescriptionEditor({ saved, onSaved, onDeleted }) {
  const { description } = useDraft();
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [copied, flashCopied] = useFlash();

  const options = [
    ...saved.map((d) => ({ id: d.id, title: d.title, content: d.content, saved: true })),
    ...DESCRIPTION_TEMPLATES.map((t) => ({ id: t.id, title: t.name, content: t.content, saved: false })),
  ];
  const current = options.find((o) => o.id === description.id) ?? options[0];

  // Templates can't be edited on the server, so editing one saves your own copy.
  const edit = (d) => setEditing(d.saved ? { id: d.id, title: d.title, content: d.content } : { title: `${d.title} (mine)`, content: d.content });

  const save = async () => {
    if (!editing.title.trim() || !editing.content.trim()) {
      setError("Add a title and some text first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const d = editing.id ? await api.updateDescription(editing.id, editing.title.trim(), editing.content) : await api.createDescription(editing.title.trim(), editing.content);
      onSaved(d);
      setDescription({ id: d.id, title: d.title, content: d.content, saved: true });
      setEditing(null);
    } catch (e) {
      setError(e.message || "Could not save the description.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (d) => {
    if (!d.id || !window.confirm(`Delete “${d.title}”?\n\nThis description is removed. Uploads that already used it keep their text.`)) return;
    setBusy(true);
    setError(null);
    try {
      await api.deleteDescription(d.id);
      onDeleted(d.id);
      if (description.id === d.id) setDescription({ id: DESCRIPTION_TEMPLATES[0].id, title: DESCRIPTION_TEMPLATES[0].name, content: DESCRIPTION_TEMPLATES[0].content, saved: false });
      if (editing?.id === d.id) setEditing(null);
    } catch (e) {
      setError(e.message || "Could not delete the description.");
    } finally {
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <Card>
        <div className="s-row-between">
          <span className="s-card-title">{editing.id ? "Edit description" : "New description"}</span>
          <span className="s-hint">{editing.content.length} chars</span>
        </div>
        <input className="s-input" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Name it, e.g. Dark trap template" aria-label="Description title" />
        <textarea
          className="s-input"
          value={editing.content}
          onChange={(e) => setEditing({ ...editing, content: e.target.value })}
          placeholder={"Write your description.\nPurchase links, contact info, credits…"}
          aria-label="Description text"
        />
        {error ? <span className="s-error">{error}</span> : null}
        <div style={{ display: "flex", gap: 8 }}>
          <Button title="Cancel" variant="secondary" size="md" style={{ flex: 1 }} onClick={() => setEditing(null)} />
          {editing.id ? <Button title="Delete" variant="secondary" size="md" style={{ flex: 1 }} disabled={busy} onClick={() => void remove(editing)} /> : null}
          <Button title={busy ? "Saving…" : "Save"} size="md" style={{ flex: 1 }} disabled={busy} onClick={() => void save()} />
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="s-row-between">
        <span className="s-card-title">Description</span>
        <Button title="+ New" variant="secondary" size="sm" onClick={() => setEditing({ title: "", content: "" })} />
      </div>
      <ListGroup>
        {options.map((o) => (
          <div key={o.id} className="s-row" style={{ padding: 0 }}>
            <button
              type="button"
              onClick={() => setDescription(o)}
              aria-pressed={o.id === current.id}
              style={{ all: "unset", boxSizing: "border-box", flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 12, minHeight: 50, padding: "8px 14px", cursor: "pointer" }}>
              <span className="s-row-main">
                <span className="s-truncate">{o.title}</span>
                {o.saved ? null : <span className="s-sub">Template</span>}
              </span>
              {o.id === current.id ? <span style={{ color: "var(--acc)", fontSize: 16 }}>✓</span> : null}
            </button>
            {o.saved ? (
              <button type="button" className="s-hair-x" style={{ marginRight: 8 }} onClick={() => void remove(o)} aria-label={`Delete ${o.title}`}>
                ×
              </button>
            ) : null}
          </div>
        ))}
      </ListGroup>
      {error ? <span className="s-error">{error}</span> : null}
      <div className="s-quote s-quote--clamp">{current.content}</div>
      <div style={{ display: "flex", gap: 8 }}>
        <Button title={current.saved ? "Edit description" : "Customize this template"} variant="secondary" size="md" style={{ flex: 1 }} onClick={() => edit(current)} />
        <Button
          title={copied ? "Copied ✓" : "Copy"}
          variant="secondary"
          size="md"
          onClick={async () => {
            if (await copyText(current.content)) flashCopied();
          }}
        />
      </div>
    </Card>
  );
}

const keyOf = (t) => t.trim().toLowerCase();
const DEMAND = { high: "High demand", medium: "Some demand", low: "Low demand", unknown: "" };
const COMPETITION = { low: "Low competition", medium: "Medium competition", high: "High competition", unknown: "" };

// High demand is the good-news status, so it gets the mint dot; some demand is grey, low is a ring.
function DemandDot({ level }) {
  if (!level || level === "unknown") return null;
  return <span className={cx("s-dot", level === "medium" && "s-dot--mid", level === "low" && "s-dot--low")} />;
}

const record = (entry) => {
  const n = entry.signals?.record_videos ?? 0;
  if (entry.signals?.record === "proven") return `Proven on ${n} uploads`;
  if (entry.signals?.record === "weak") return `Underperforms on ${n} uploads`;
  return "";
};
const levels = (entry) => [DEMAND[entry.signals?.demand ?? "unknown"], COMPETITION[entry.signals?.competition ?? "unknown"], record(entry)].filter(Boolean).join(" · ");

// Remove tags with the ×, add your own, and save back to the run (the server learns from removals).
export function TagEditor({ run, onSaved }) {
  const [tags, setTags] = useState(run.tags);
  const [input, setInput] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState(null);
  const [detail, setDetail] = useState(null);
  const [view, setView] = useState("tags");

  const original = new Set(run.tags.map(keyOf));
  const scores = new Map((run.scored_tags ?? []).map((e) => [keyOf(e.tag), e]));
  const demandCounts = ["high", "medium", "low"].map((level) => [level, tags.filter((t) => scores.get(keyOf(t))?.signals?.demand === level).length]).filter(([, n]) => n > 0);
  const current = new Set(tags.map(keyOf));
  const removed = run.tags.filter((t) => !current.has(keyOf(t)));
  const added = tags.filter((t) => !original.has(keyOf(t)));
  const dirty = removed.length > 0 || added.length > 0;
  const chars = tagChars(tags);
  const over = chars > TAG_CHAR_LIMIT;
  const visible = showAll ? tags : tags.slice(0, 36);

  // Tags that would push the list past YouTube's limit aren't added.
  const add = () => {
    const next = [...tags];
    const seen = new Set(next.map(keyOf));
    let used = tagChars(next);
    const skipped = [];
    for (const part of input.split(",")) {
      const t = part.trim();
      if (!t || seen.has(keyOf(t))) continue;
      const cost = tagCost(t) + (next.length ? 1 : 0);
      if (used + cost > TAG_CHAR_LIMIT) {
        skipped.push(t);
        continue;
      }
      next.push(t);
      seen.add(keyOf(t));
      used += cost;
    }
    setTags(next);
    setInput(skipped.join(", "));
    setNote(
      skipped.length
        ? { text: `${skipped.length === 1 ? "That tag doesn’t" : `${skipped.length} tags don’t`} fit in YouTube’s ${TAG_CHAR_LIMIT} characters. Remove some first.`, error: true }
        : null,
    );
  };

  const save = async () => {
    if (!dirty || saving || tags.length === 0) return;
    if (over) {
      setNote({ text: `Remove tags until you’re under ${TAG_CHAR_LIMIT} characters, then save.`, error: true });
      return;
    }
    setSaving(true);
    setNote(null);
    try {
      onSaved(await api.updateTags(run.id, tags, removed, added));
      setNote({ text: "Tags saved ✓" });
    } catch (e) {
      setNote({ text: e.message || "Could not save tags.", error: true });
    } finally {
      setSaving(false);
    }
  };

  const copy = async () => {
    if (await copyText(tags.join(", "))) setNote({ text: "Copied ✓" });
  };

  const counts = [`${tags.length} tags`, removed.length && `${removed.length} removed`, added.length && `${added.length} added`].filter(Boolean).join(" · ");

  return (
    <div className="s-stack" style={{ gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
        <div className="s-row-main" style={{ gap: 3 }}>
          <span className="s-truncate" style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4 }}>
            {run.query}
          </span>
          <span className="s-sub">{counts}</span>
        </div>
        <button type="button" className="s-link s-sub" onClick={() => void copy()}>
          Copy all
        </button>
      </div>

      <div className="s-stack" style={{ gap: 6 }}>
        <Meter value={Math.min(1, chars / TAG_CHAR_LIMIT)} color={over ? "var(--warn)" : undefined} />
        <div className="s-row-between" style={{ alignItems: "baseline", color: over ? "var(--warn)" : undefined }}>
          <span className="s-muted" style={{ color: over ? "inherit" : undefined }}>
            {over ? "Over the YouTube limit. Remove some tags." : "YouTube tag limit"}
          </span>
          <span className="s-mono" style={{ color: over ? "inherit" : undefined }}>
            {chars} / {TAG_CHAR_LIMIT}
          </span>
        </div>
      </div>

      {scores.size ? (
        <Segmented
          compact
          value={view}
          onChange={setView}
          label="Tags or ranking"
          options={[
            { value: "tags", label: "Tags" },
            { value: "ranking", label: "Ranking" },
          ]}
        />
      ) : null}

      {view === "ranking" && scores.size ? <Ranking tags={tags} scores={scores} /> : null}

      {view === "tags" && demandCounts.length ? (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 12, rowGap: 4 }}>
          {demandCounts.map(([level, n]) => (
            <span key={level} style={{ display: "inline-flex", alignItems: "center", gap: 6 }} className="s-muted">
              <DemandDot level={level} />
              {n} {DEMAND[level].toLowerCase()}
            </span>
          ))}
          <span className="s-muted">Click a tag to see why</span>
        </div>
      ) : null}

      <TagDetail
        entry={detail}
        rank={detail ? rankOf(tags, scores, detail.tag) : 0}
        onClose={() => setDetail(null)}
        onRemove={(tag) => {
          setTags((cur) => cur.filter((t) => keyOf(t) !== keyOf(tag)));
          setDetail(null);
        }}
      />

      {view === "tags" ? (
        <div className="s-chips">
          {visible.map((tag) => {
            const isNew = !original.has(keyOf(tag));
            const scored = scores.get(keyOf(tag));
            const remove = () => setTags(tags.filter((t) => t !== tag));
            return (
              <span key={tag} className={cx("s-chip", isNew && "s-chip--new")} style={{ cursor: scored ? "pointer" : "default" }}>
                <button
                  type="button"
                  onClick={scored ? () => setDetail(scored) : undefined}
                  style={{ all: "unset", display: "inline-flex", alignItems: "center", gap: 8, cursor: "inherit" }}
                  aria-label={scored ? `${tag}, score ${scored.score}. ${DEMAND[scored.signals?.demand ?? "unknown"]}. Open details.` : tag}>
                  {scored ? <DemandDot level={scored.signals?.demand} /> : null}
                  <span>{isNew ? `+ ${tag}` : tag}</span>
                  {scored ? <span className="s-chip-score">{scored.score}</span> : null}
                </button>
                <button type="button" onClick={remove} aria-label={`Remove tag ${tag}`} className="s-chip-x" style={{ all: "unset", cursor: "pointer", color: isNew ? "var(--acc)" : "var(--t3)", fontSize: 14, padding: "0 2px" }}>
                  ×
                </button>
              </span>
            );
          })}
          {tags.length > 36 ? (
            <button type="button" className="s-chip s-chip--more" onClick={() => setShowAll(!showAll)}>
              {showAll ? "Show less" : `Show ${tags.length - 36} more`}
            </button>
          ) : null}
        </div>
      ) : null}

      <form
        className="s-input-row"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Add tags, comma separated" aria-label="Add tags" autoCapitalize="none" />
        <button type="submit" className="s-kbd">
          return
        </button>
      </form>

      {note ? (
        <span className="s-muted" style={{ color: note.error ? "var(--danger)" : "var(--acc)" }} role="status">
          {note.text}
        </span>
      ) : null}

      <div style={{ display: "flex", gap: 8 }}>
        <Button title="Undo" variant="secondary" size="md" style={{ flex: 1 }} disabled={!dirty} onClick={() => setTags(run.tags)} />
        <Button title={saving ? "Saving…" : "Save tags"} variant={dirty && !over ? "primary" : "secondary"} size="md" style={{ flex: 2 }} disabled={!dirty || saving} onClick={() => void save()} />
      </div>
    </div>
  );
}

// Where a tag sits in the ranking (1 = best), counting only scored tags.
const rankOf = (tags, scores, tag) =>
  tags
    .map((t) => scores.get(keyOf(t)))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .findIndex((e) => keyOf(e.tag) === keyOf(tag)) + 1;

const verdict = (score) => (score >= 80 ? "Strong tag" : score >= 60 ? "Good tag" : score >= 40 ? "Okay tag" : "Weak tag");
const LEVEL_WORD = { high: "High", medium: "Medium", low: "Low", unknown: "Not measured" };

// Click a tag: a sheet with its score, what the score is made of, and why.
function TagDetail({ entry, rank, onClose, onRemove }) {
  const [copied, flashCopied] = useFlash();
  const demand = entry?.signals?.demand ?? "unknown";
  const competition = entry?.signals?.competition ?? "unknown";
  const strong = (entry?.score ?? 0) >= 60;
  return (
    <Sheet open={!!entry} onClose={onClose} label="Tag details">
      {entry ? (
        <>
          <div className="s-stack" style={{ gap: 6 }}>
            <span className="s-section">{rank ? `#${rank} IN THIS RUN` : "TAG"}</span>
            <span style={{ font: "400 20px/26px var(--mono)", overflowWrap: "anywhere" }}>{entry.tag}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ font: "500 44px/48px var(--mono)", minWidth: 64, color: strong ? "var(--acc)" : undefined }}>{entry.score}</span>
            <div className="s-row-main" style={{ gap: 8 }}>
              <div className="s-row-between" style={{ alignItems: "baseline" }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{verdict(entry.score)}</span>
                <span className="s-mono">/100</span>
              </div>
              <Meter value={entry.score / 100} color={strong ? "var(--acc)" : undefined} height={4} />
            </div>
          </div>

          <div style={{ borderRadius: "var(--r-card)", border: "1px solid var(--line-soft)", background: "var(--card2)", padding: "0 14px" }}>
            <Signal label="Search demand" value={LEVEL_WORD[demand]} good={demand === "high"} bad={demand === "low"} hint="How often people search it on YouTube" />
            <Signal label="Competition" value={LEVEL_WORD[competition]} good={competition === "low"} bad={competition === "high"} hint="How many videos already fight for it" />
            {entry.signals?.record ? (
              <Signal label="On real uploads" value={record(entry)} good={entry.signals.record === "proven"} bad={entry.signals.record === "weak"} hint="How videos with this tag did against their channel's normal" last />
            ) : (
              <Signal label="On real uploads" value="Not enough uploads yet" hint="Shows once videos with this tag have results" last />
            )}
          </div>

          {entry.reason ? (
            <div className="s-stack" style={{ gap: 6 }}>
              <span className="s-section">WHY THIS SCORE</span>
              <p className="s-body">{entry.reason}</p>
            </div>
          ) : null}

          <div style={{ display: "flex", gap: 8 }}>
            <Button
              title={copied ? "Copied" : "Copy tag"}
              variant="secondary"
              size="md"
              style={{ flex: 1 }}
              onClick={async () => {
                if (await copyText(entry.tag)) flashCopied();
              }}
            />
            <Button title="Remove tag" variant="secondary" size="md" style={{ flex: 1 }} onClick={() => onRemove(entry.tag)} />
          </div>
          <Button title="Done" size="md" onClick={onClose} />
        </>
      ) : null}
    </Sheet>
  );
}

function Signal({ label, value, hint, good, bad, last }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: last ? 0 : "1px solid var(--line-soft)" }}>
      <div className="s-row-main">
        <span style={{ fontSize: 14, fontWeight: 500 }}>{label}</span>
        <span className="s-muted">{hint}</span>
      </div>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, maxWidth: "45%" }}>
        <span className={cx("s-dot", bad && "s-dot--bad")} style={{ width: 7, height: 7, background: good ? "var(--acc)" : bad ? undefined : "var(--t3)" }} />
        <span style={{ fontSize: 13, fontWeight: 700, textAlign: "right", color: good ? "var(--acc)" : "var(--t2)" }}>{value}</span>
      </span>
    </div>
  );
}

const RANK_VISIBLE = 10;

// Every tag best to worst: rank, score bar and what the score is made of. The top 10 first, then "Show all".
function Ranking({ tags, scores }) {
  const [all, setAll] = useState(false);
  const rows = tags.map((tag) => ({ tag, entry: scores.get(keyOf(tag)) })).sort((a, b) => (b.entry?.score ?? -1) - (a.entry?.score ?? -1));
  const more = rows.length > RANK_VISIBLE;
  return (
    <div className="s-stack" style={{ gap: 8 }}>
      {more ? (
        <span className="s-muted">
          {rows.length} tags · {all ? "all shown" : `top ${RANK_VISIBLE} shown`}
        </span>
      ) : null}
      <div>
        {(all ? rows : rows.slice(0, RANK_VISIBLE)).map(({ tag, entry }, i) => (
          <div key={tag} className="s-hair" style={{ minHeight: 68 }}>
            <span className="s-mono" style={{ width: 22, fontSize: 13, fontWeight: 500 }}>
              {entry ? i + 1 : "–"}
            </span>
            <div className="s-row-main" style={{ gap: 5 }}>
              <div className="s-row-between" style={{ alignItems: "baseline" }}>
                <span className="s-truncate" style={{ font: "400 13.5px var(--mono)" }}>
                  {tag}
                </span>
                <span style={{ font: "500 13.5px var(--mono)" }}>{entry ? entry.score : "–"}</span>
              </div>
              {entry ? <Meter value={entry.score / 100} color={entry.signals?.demand === "high" ? "var(--acc)" : undefined} /> : null}
              <span className="s-muted s-truncate">{entry ? levels(entry) || "Scored on relevance" : "Save to score this tag"}</span>
            </div>
          </div>
        ))}
      </div>
      {more ? (
        <button type="button" className="s-link" style={{ alignSelf: "center", padding: "6px 12px", color: "var(--t2)" }} onClick={() => setAll((v) => !v)}>
          {all ? `Show top ${RANK_VISIBLE}` : `Show all ${rows.length} tags`}
        </button>
      ) : null}
    </div>
  );
}
