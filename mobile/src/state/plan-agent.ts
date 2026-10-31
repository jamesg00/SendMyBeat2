import { useSyncExternalStore } from 'react';

import { pollJob } from '@/api/client';
import * as api from '@/api/endpoints';
import type { PlanAssist } from '@/api/endpoints';

// The plan agent's runs, one per plan step. They live here (not in a screen) so a draft keeps
// going, and stays ready, while you move around the app.

export type AgentRun = {
  startedAt: number;
  progress: number;
  message?: string;
  result?: PlanAssist;
  error?: string;
};

let runs: Record<string, AgentRun> = {};
const listeners = new Set<() => void>();
const put = (stepId: string, run: AgentRun | null) => {
  const next = { ...runs };
  if (run) next[stepId] = run;
  else delete next[stepId];
  runs = next;
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useAgentRuns() {
  return useSyncExternalStore(subscribe, () => runs);
}

export const agentBusy = (run?: AgentRun) => !!run && !run.result && !run.error;

/** Ask the agent to do a step; resolves when its draft is ready (or it failed). */
export async function runAgent(stepId: string) {
  if (agentBusy(runs[stepId])) return;
  const startedAt = Date.now();
  put(stepId, { startedAt, progress: 0, message: 'Starting the plan agent…' });
  try {
    const { job } = await api.assistPlanStep(stepId);
    const result = await pollJob<PlanAssist>(job.id, {
      intervalMs: 2000,
      onProgress: (progress, message) => put(stepId, { startedAt, progress, message }),
    });
    put(stepId, { startedAt, progress: 100, result });
  } catch (e) {
    put(stepId, { startedAt, progress: 100, error: e instanceof Error ? e.message : 'The plan agent failed.' });
  }
}

export const dismissAgent = (stepId: string) => put(stepId, null);

/** Forget every draft (on sign-out, or when the plan ends). */
export function resetAgent() {
  runs = {};
  listeners.forEach((l) => l());
}
