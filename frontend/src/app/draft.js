import { useSyncExternalStore } from "react";

import * as api from "@/app/api";
import { DESCRIPTION_TEMPLATES } from "@/app/templates";

// What Workflow hands to Upload Studio: the chosen tag run and description. Tag generation lives
// here too, so it keeps going while you look at other tabs, and a job that was running when the
// page closed is picked back up (mobile/src/state/draft.tsx).

const JOB_KEY = "smb_tag_job";
const first = DESCRIPTION_TEMPLATES[0];
const readJob = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(JOB_KEY) || "null");
    return saved?.jobId ? saved : null;
  } catch {
    return null;
  }
};
const writeJob = (job) => {
  try {
    if (job) localStorage.setItem(JOB_KEY, JSON.stringify(job));
    else localStorage.removeItem(JOB_KEY);
  } catch {
    // resuming after a reload is best effort
  }
};

let state = {
  run: null,
  description: { id: first.id, title: first.name, content: first.content, saved: false },
  /** { query, startedAt, jobId?, progress } while tags are being generated. */
  generation: readJob(),
  generationError: null,
  /** The most recent run this session produced, for lists that loaded before it finished. */
  lastGenerated: null,
};
const listeners = new Set();
const set = (patch) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useDraft = () => useSyncExternalStore(subscribe, () => state);
export const setRun = (run) => set({ run });
export const setDescription = (description) => set({ description });
export const clearGenerationError = () => set({ generationError: null });
export function resetDraft() {
  writeJob(null);
  set({ run: null, generation: null, generationError: null, lastGenerated: null });
}

let cancelled = false;
const follow = (jobId) =>
  api.pollJob(jobId, {
    intervalMs: 2000,
    onProgress: (progress, message) => state.generation && set({ generation: { ...state.generation, progress, message } }),
    signal: { get aborted() { return cancelled; } },
  });

function settle(result, error) {
  writeJob(null);
  if (result) set({ generation: null, run: result, lastGenerated: result });
  else set({ generation: null, generationError: error?.code === "cancelled" ? null : error?.message || "Tag generation failed." });
  return result ?? null;
}

/** Generate tags for a search. Resolves with the run, or null if it failed or was cancelled. */
export async function generate(query, customTags) {
  if (state.generation) return null;
  cancelled = false;
  const g = { query, startedAt: Date.now(), progress: 0 };
  set({ generation: g, generationError: null });
  try {
    const res = await api.startTagGeneration(query, customTags);
    if (!res.job?.id) return settle(res);
    const withJob = { ...g, jobId: res.job.id };
    set({ generation: withJob });
    writeJob(withJob);
    return settle(await follow(res.job.id));
  } catch (e) {
    return settle(null, e);
  }
}

/** Stop the running generation. */
export function cancelGeneration() {
  const jobId = state.generation?.jobId;
  cancelled = true;
  if (jobId) api.cancelJob(jobId).catch(() => {});
  settle(null, { code: "cancelled" });
}

/** After a reload: keep following a job that was still running. Call once when the app opens. */
let resumed = false;
export function resumeGeneration() {
  if (resumed) return;
  resumed = true;
  const saved = state.generation;
  if (!saved?.jobId) return;
  cancelled = false;
  follow(saved.jobId).then(
    (r) => settle(r),
    (e) => settle(null, e),
  );
}
