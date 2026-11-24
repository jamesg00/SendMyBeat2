import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Check, Circle } from "lucide-react";
import { API } from "@/App";

// Title help for an upload: ideas built from the chosen tag run's best keywords (tap one to use
// it) and live checks on the title as it's typed. Neither costs a credit or YouTube quota.

const CHECK_DELAY_MS = 400;

export function useTitleIdeas(tagRunId, beatName = "") {
  const [ideas, setIdeas] = useState([]);
  useEffect(() => {
    if (!tagRunId) {
      setIdeas([]);
      return undefined;
    }
    let alive = true;
    axios
      .get(`${API}/tags/history/${tagRunId}/titles`, { params: { beat_name: beatName || "" } })
      .then((res) => alive && setIdeas(res.data?.titles || []))
      .catch(() => alive && setIdeas([]));
    return () => {
      alive = false;
    };
  }, [tagRunId, beatName]);
  return ideas;
}

export function useTitleChecks(title, tagRunId) {
  const [result, setResult] = useState(null);
  const latest = useRef(0);
  useEffect(() => {
    const text = (title || "").trim();
    if (!text) {
      setResult(null);
      return undefined;
    }
    const ticket = ++latest.current;
    const timer = setTimeout(() => {
      axios
        .post(`${API}/titles/score`, { title: text, tag_id: tagRunId || null })
        .then((res) => ticket === latest.current && setResult(res.data))
        .catch(() => ticket === latest.current && setResult(null));
    }, CHECK_DELAY_MS);
    return () => clearTimeout(timer);
  }, [title, tagRunId]);
  return result;
}

const TitleHelper = ({ tagRunId, beatName, title, onPickTitle }) => {
  const ideas = useTitleIdeas(tagRunId, beatName);
  const checks = useTitleChecks(title, tagRunId);
  const misses = (checks?.checks || []).filter((check) => !check.ok);

  if (!ideas.length && !checks) return null;

  return (
    <div className="th">
      {ideas.length ? (
        <div className="th-ideas">
          <span className="th-label">Title ideas from your tag run · tap to use</span>
          <div className="th-chips">
            {ideas.map((idea) => (
              <button
                type="button"
                key={idea.title}
                className={`th-chip${idea.title === title ? " is-on" : ""}`}
                onClick={() => onPickTitle(idea.title)}
                aria-pressed={idea.title === title}
              >
                <span className="th-chip-text">{idea.title}</span>
                {typeof idea.score === "number" ? <span className="th-chip-score">{idea.score}</span> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {checks ? (
        <div className="th-checks" aria-live="polite">
          <span className="th-score">
            Title score <b>{checks.score}</b>
            {misses.length ? null : <span className="th-allgood"> · every check passes</span>}
          </span>
          <ul>
            {(checks.checks || []).map((check) => (
              <li key={check.id} className={check.ok ? "is-ok" : "is-miss"}>
                {check.ok ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Circle className="h-3.5 w-3.5" aria-hidden="true" />}
                <span>{check.message}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

export default TitleHelper;
