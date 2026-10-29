import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { pollJob } from '@/api/client';
import * as api from '@/api/endpoints';
import type { TagRun } from '@/api/endpoints';
import { DESCRIPTION_TEMPLATES } from '@/data/templates';
import { readJSON, removeJSON, writeJSON } from '@/state/persist';

// What the Workflow tab hands to Upload Studio: the chosen tag run and description.
// Tag generation also lives here, so it keeps going when you switch steps or tabs,
// and a running job is picked back up after the app restarts.
export type DraftDescription = { id: string; title: string; content: string; saved: boolean };
export type TagGeneration = { query: string; startedAt: number; jobId?: string; progress: number; message?: string };

type Draft = {
  run: TagRun | null;
  setRun: (r: TagRun | null) => void;
  description: DraftDescription;
  setDescription: (d: DraftDescription) => void;
  generation: TagGeneration | null;
  generationError: string | null;
  /** The most recent run this session produced, for lists that loaded before it finished. */
  lastGenerated: TagRun | null;
  generate: (query: string) => Promise<TagRun | null>;
};

const JOB_FILE = 'tag-job';
const DraftContext = createContext<Draft | null>(null);

export function DraftProvider({ children }: { children: ReactNode }) {
  const [run, setRun] = useState<TagRun | null>(null);
  const first = DESCRIPTION_TEMPLATES[0];
  const [description, setDescription] = useState<DraftDescription>({
    id: first.id,
    title: first.name,
    content: first.content,
    saved: false,
  });
  const [generation, setGeneration] = useState<TagGeneration | null>(() => {
    const saved = readJSON<TagGeneration>(JOB_FILE);
    return saved?.jobId ? saved : null;
  });
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState<TagRun | null>(null);
  const resumed = useRef(false);

  const follow = (jobId: string) =>
    pollJob<TagRun>(jobId, {
      intervalMs: 2000,
      onProgress: (progress, message) => setGeneration((g) => g && { ...g, progress, message }),
    });

  const settle = (result: TagRun | null, error?: unknown) => {
    removeJSON(JOB_FILE);
    setGeneration(null);
    if (result) {
      setRun(result);
      setLastGenerated(result);
    } else {
      setGenerationError(error instanceof Error ? error.message : 'Tag generation failed.');
    }
    return result;
  };

  // A job that was running when the app closed: keep following it.
  useEffect(() => {
    if (resumed.current) return;
    resumed.current = true;
    const saved = readJSON<TagGeneration>(JOB_FILE);
    if (!saved?.jobId) {
      removeJSON(JOB_FILE);
      return;
    }
    follow(saved.jobId).then(
      (r) => settle(r),
      (e: unknown) => settle(null, e),
    );
  }, []);

  const generate = async (query: string) => {
    if (generation) return null;
    const g: TagGeneration = { query, startedAt: Date.now(), progress: 0 };
    setGenerationError(null);
    setGeneration(g);
    try {
      const res = await api.startTagGeneration(query);
      if (!res.job?.id) return settle(res as TagRun);
      const withJob = { ...g, jobId: res.job.id };
      setGeneration(withJob);
      writeJSON(JOB_FILE, withJob);
      return settle(await follow(res.job.id));
    } catch (e) {
      return settle(null, e);
    }
  };

  return (
    <DraftContext.Provider
      value={{ run, setRun, description, setDescription, generation, generationError, lastGenerated, generate }}>
      {children}
    </DraftContext.Provider>
  );
}

export function useDraft() {
  const ctx = useContext(DraftContext);
  if (!ctx) throw new Error('useDraft must be used inside DraftProvider');
  return ctx;
}
