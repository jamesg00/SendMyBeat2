import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// The detail the app shows for a tag run: how full YouTube's tag limit is, every tag ranked best
// to worst, and why one tag got its score (mobile/src/components/editors.tsx).

// YouTube rejects tag lists longer than this. It joins tags with commas and wraps a tag that has a
// space in quotes, which count too (the server counts the same way).
export const TAG_CHAR_LIMIT = 500;
const tagCost = (tag) => tag.length + (tag.includes(" ") ? 2 : 0);
export const tagChars = (tags) => (tags.length ? tags.reduce((n, t) => n + tagCost(t), 0) + tags.length - 1 : 0);

const DEMAND = { high: "High demand", medium: "Some demand", low: "Low demand" };
const COMPETITION = { low: "Low competition", medium: "Medium competition", high: "High competition" };
const LEVEL_WORD = { high: "High", medium: "Medium", low: "Low" };

const recordText = (entry) => {
  const n = entry?.signals?.record_videos || 0;
  if (entry?.signals?.record === "proven") return `Proven on ${n} uploads`;
  if (entry?.signals?.record === "weak") return `Underperforms on ${n} uploads`;
  return "";
};
const levelsText = (entry) => [DEMAND[entry?.signals?.demand], COMPETITION[entry?.signals?.competition], recordText(entry)].filter(Boolean).join(" · ");
export const verdictFor = (score) => (score >= 80 ? "Strong tag" : score >= 60 ? "Good tag" : score >= 40 ? "Okay tag" : "Weak tag");

/** How much of YouTube's 500 characters the tags use. */
export const TagLimitMeter = ({ tags }) => {
  const chars = tagChars(tags);
  const over = chars > TAG_CHAR_LIMIT;
  return (
    <div className="smb-meter" data-testid="tag-limit-meter">
      <div className="smb-meter-row">
        <span className={over ? "smb-warn" : "smb-meter-label"}>{over ? "Over YouTube's tag limit. Remove some tags before uploading." : "YouTube tag limit"}</span>
        <span className={`smb-meter-value ${over ? "smb-warn" : ""}`}>
          {chars} / {TAG_CHAR_LIMIT}
        </span>
      </div>
      <span className="smb-bar">
        <span className={`smb-bar-fill ${over ? "smb-bar-fill--warn" : ""}`} style={{ width: `${Math.min(100, (chars / TAG_CHAR_LIMIT) * 100)}%` }} />
      </span>
    </div>
  );
};

/** Tags or Ranking, as a small segmented control. */
export const TagViewToggle = ({ value, onChange }) => (
  <div className="pro-seg" role="tablist" aria-label="Tags or ranking">
    {[
      ["tags", "Tags"],
      ["ranking", "Ranking"],
    ].map(([id, label]) => (
      <button key={id} type="button" role="tab" aria-selected={value === id} className={value === id ? "is-active" : ""} onClick={() => onChange(id)}>
        {label}
      </button>
    ))}
  </div>
);

/** How many of the tags have high, some and low search demand. */
export const DemandLegend = ({ tags, scoreFor }) => {
  const counts = ["high", "medium", "low"].map((level) => [level, tags.filter((t) => scoreFor(t)?.signals?.demand === level).length]).filter(([, n]) => n > 0);
  if (!counts.length) return null;
  return (
    <div className="tag-legend">
      {counts.map(([level, n]) => (
        <span key={level}>
          <i className={`tag-dot tag-dot--${level}`} /> {n} {DEMAND[level].toLowerCase()}
        </span>
      ))}
      <span>Click a tag to see why</span>
    </div>
  );
};

const RANK_VISIBLE = 10;

/** Every tag best to worst: rank, score bar and what the score is made of. */
export const TagRanking = ({ tags, scoreFor, onOpen }) => {
  const [all, setAll] = useState(false);
  const rows = tags.map((tag) => ({ tag, entry: scoreFor(tag) })).sort((a, b) => (b.entry?.score ?? -1) - (a.entry?.score ?? -1));
  const more = rows.length > RANK_VISIBLE;
  return (
    <div className="space-y-2" data-testid="tag-ranking">
      {more ? (
        <p className="smb-t3 text-xs">
          {rows.length} tags · {all ? "all shown" : `top ${RANK_VISIBLE} shown`}
        </p>
      ) : null}
      <div className="tag-rank">
        {(all ? rows : rows.slice(0, RANK_VISIBLE)).map(({ tag, entry }, i) => (
          <button key={tag} type="button" className="tag-rank-row" onClick={() => entry && onOpen(entry, i + 1)} disabled={!entry}>
            <span className="smb-mono smb-t2 tag-rank-num">{entry?.score ? i + 1 : "–"}</span>
            <span className="min-w-0 flex-1 space-y-1">
              <span className="smb-meter-row">
                <span className="smb-mono truncate">{tag}</span>
                <span className="smb-mono">{entry?.score || "–"}</span>
              </span>
              {entry?.score ? (
                <span className="smb-bar">
                  <span className={`smb-bar-fill ${entry.signals?.demand === "high" ? "smb-bar-fill--acc" : ""}`} style={{ width: `${entry.score}%` }} />
                </span>
              ) : null}
              <span className="smb-t3 text-xs block truncate">{entry ? levelsText(entry) || entry.reason || "Scored on relevance" : "Not scored yet"}</span>
            </span>
          </button>
        ))}
      </div>
      {more ? (
        <Button type="button" variant="ghost" size="sm" onClick={() => setAll((v) => !v)} className="w-full">
          {all ? `Show top ${RANK_VISIBLE}` : `Show all ${rows.length} tags`}
        </Button>
      ) : null}
    </div>
  );
};

const Signal = ({ label, hint, value, good, bad }) => (
  <div className="tag-signal">
    <span className="min-w-0">
      <b>{label}</b>
      <span className="smb-t3 text-xs block">{hint}</span>
    </span>
    <span className={`smb-pill ${good ? "smb-pill--ok" : bad ? "smb-pill--bad" : ""}`}>{value}</span>
  </div>
);

/** One tag's score, what it is made of, and why. */
export const TagDetailDialog = ({ detail, onClose, onCopy, onRemove }) => {
  const entry = detail?.entry;
  const demand = entry?.signals?.demand;
  const competition = entry?.signals?.competition;
  const breakdown = entry?.breakdown || {};
  const strong = (entry?.score || 0) >= 60;
  return (
    <Dialog open={!!entry} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="smb-sheet max-w-md">
        {entry ? (
          <>
            <DialogHeader>
              <DialogDescription className="smb-eyebrow">{detail.rank ? `#${detail.rank} in this run` : "Tag"}</DialogDescription>
              <DialogTitle className="smb-mono text-xl break-words">{entry.tag}</DialogTitle>
            </DialogHeader>

            <div className="flex items-center gap-4">
              <span className={`tag-score ${strong ? "smb-acc" : ""}`}>{entry.score}</span>
              <div className="flex-1 space-y-2">
                <div className="smb-meter-row">
                  <b>{verdictFor(entry.score)}</b>
                  <span className="smb-mono smb-t3">/100</span>
                </div>
                <span className="smb-bar">
                  <span className={`smb-bar-fill ${strong ? "smb-bar-fill--acc" : ""}`} style={{ width: `${entry.score}%` }} />
                </span>
              </div>
            </div>

            <div className="tag-signals">
              <Signal
                label="Search demand"
                hint="How often people search it on YouTube"
                value={LEVEL_WORD[demand] || (breakdown.demand != null ? String(breakdown.demand) : "Not measured")}
                good={demand === "high"}
                bad={demand === "low"}
              />
              <Signal
                label="Competition"
                hint="How many videos already fight for it"
                value={LEVEL_WORD[competition] || (breakdown.competition != null ? String(breakdown.competition) : "Not measured")}
                good={competition === "low"}
                bad={competition === "high"}
              />
              <Signal
                label="On real uploads"
                hint="How videos with this tag did against their channel's normal"
                value={recordText(entry) || "Not enough uploads yet"}
                good={entry.signals?.record === "proven"}
                bad={entry.signals?.record === "weak"}
              />
            </div>

            {entry.reason ? (
              <div className="space-y-1">
                <p className="smb-eyebrow">Why this score</p>
                <p className="smb-t2 text-sm">{entry.reason}</p>
              </div>
            ) : null}

            <div className="smb-row-2">
              <Button type="button" className="smb-btn smb-btn--sec" onClick={() => onCopy(entry.tag)}>
                Copy tag
              </Button>
              <Button type="button" className="smb-btn smb-btn--sec" onClick={() => onRemove(entry.tag)}>
                Remove tag
              </Button>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
