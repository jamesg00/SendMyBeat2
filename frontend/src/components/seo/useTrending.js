import { useEffect, useState } from "react";
import axios from "axios";
import { API } from "@/App";

// GET /api/seo/trending, shared by the trending page and every "artists rising" box, fetched
// once per page load. A list with artists is kept for the session; an empty list (the server
// hasn't built its first snapshot yet) or a failed request is forgotten, so the next page
// that asks tries again.
let cached = null; // the normalised response, once it has artists
let pending = null; // the request in flight, shared by everyone who asks meanwhile

const num = (value) => (typeof value === "number" && Number.isFinite(value) ? value : null);

// Keep only rows we can show and link: a name and a slug. Score is clamped to 0-100.
export const normaliseTrending = (data) => {
  const artists = (Array.isArray(data?.artists) ? data.artists : [])
    .filter((a) => a && typeof a.name === "string" && a.name.trim() && typeof a.slug === "string" && a.slug.trim())
    .map((a) => ({
      name: a.name.trim(),
      slug: a.slug.trim(),
      query: typeof a.query === "string" && a.query.trim() ? a.query.trim() : `${a.name.trim().toLowerCase()} type beat`,
      score: Math.max(0, Math.min(100, num(a.score) ?? 0)),
      change: num(a.change),
    }));
  return {
    updatedAt: typeof data?.updated_at === "string" ? data.updated_at : null,
    windowDays: num(data?.window_days) ?? 7,
    rankedBy: data?.ranked_by === "change" ? "change" : "demand",
    artists,
  };
};

export const fetchTrending = () => {
  if (cached) return Promise.resolve(cached);
  if (!pending) {
    pending = axios
      .get(`${API}/seo/trending`)
      .then((res) => {
        const data = normaliseTrending(res.data);
        if (data.artists.length) cached = data;
        return data;
      })
      .finally(() => {
        pending = null;
      });
  }
  return pending;
};

// { status: "loading" | "ready" | "empty" | "error", data }
export const useTrending = () => {
  const [state, setState] = useState(() => (cached ? { status: "ready", data: cached } : { status: "loading", data: null }));

  useEffect(() => {
    if (cached) return undefined;
    let alive = true;
    fetchTrending().then(
      (data) => {
        if (alive) setState({ status: data.artists.length ? "ready" : "empty", data });
      },
      () => {
        if (alive) setState({ status: "error", data: null });
      }
    );
    return () => {
      alive = false;
    };
  }, []);

  return state;
};

// "Most in-demand" until the server has a week-old snapshot to compare with, then "rising".
export const trendingHeading = (rankedBy, { short = false } = {}) => {
  if (rankedBy === "change") return short ? "Rising this week" : "Artists rising this week";
  return short ? "Most in-demand" : "Most in-demand artists";
};

// "Updated Nov 26, 6:00 PM" in the visitor's own time zone; null when there's no date.
export const formatUpdated = (iso) => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};
