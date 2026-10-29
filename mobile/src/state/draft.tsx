import { createContext, useContext, useState, type ReactNode } from 'react';

import type { TagRun } from '@/api/endpoints';
import { DESCRIPTION_TEMPLATES } from '@/data/templates';

// What the Workflow tab hands to Upload Studio: the chosen tag run and description.
export type DraftDescription = { id: string; title: string; content: string; saved: boolean };

type Draft = {
  run: TagRun | null;
  setRun: (r: TagRun | null) => void;
  description: DraftDescription;
  setDescription: (d: DraftDescription) => void;
};

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
  return <DraftContext.Provider value={{ run, setRun, description, setDescription }}>{children}</DraftContext.Provider>;
}

export function useDraft() {
  const ctx = useContext(DraftContext);
  if (!ctx) throw new Error('useDraft must be used inside DraftProvider');
  return ctx;
}
