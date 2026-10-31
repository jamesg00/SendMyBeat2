import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import * as api from '@/api/endpoints';
import type { PlanAssist, PlanStep, StylePlan } from '@/api/endpoints';
import { openPro, Ring } from '@/components/pros';
import { Button, JobProgress, Meter } from '@/components/ui';
import { useDraft } from '@/state/draft';
import { agentBusy, dismissAgent, runAgent, useAgentRuns, type AgentRun } from '@/state/plan-agent';
import { useStudio } from '@/state/studio';
import { F, display, font, makeStyles, useColors } from '@/theme';

// Your plan on Workflow: every step with what you can do about it right here. The plan agent
// drafts the description change, the titles, or the message for a step; you look it over and
// one tap applies it. Upload steps tick themselves off from your uploads.

type Action = { label: string; agent: boolean };

function actionFor(step: PlanStep): Action | null {
  if (step.done) return null;
  if (step.kind === 'uploads') return { label: 'Open Upload Studio', agent: false };
  if (step.kind === 'title_formula' || step.kind === 'title_pair') return { label: 'Write titles', agent: true };
  if (step.link === 'descriptions') return { label: 'Do it for me', agent: true };
  return { label: 'Help me', agent: true };
}

export function PlanWorkflow({ plan, onChange }: { plan: StylePlan; onChange: (plan: StylePlan | null) => void }) {
  const s = useStyles();
  const C = useColors();
  const runs = useAgentRuns();
  const studio = useStudio();
  const [ticking, setTicking] = useState<string | null>(null);

  const tick = async (step: PlanStep, done: boolean) => {
    if (step.kind !== 'manual' || ticking) return;
    setTicking(step.id);
    try {
      onChange((await api.tickPlanStep(step.id, done)).plan);
    } finally {
      setTicking(null);
    }
  };

  const act = (step: PlanStep, action: Action) => {
    if (action.agent) return void runAgent(step.id);
    studio.open();
    router.push('/studio');
  };

  return (
    <View style={s.plan}>
      <Pressable
        onPress={() => openPro(plan.pro_id)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}
        accessibilityRole="button"
        accessibilityHint="Opens the producer's page">
        <Ring value={plan.total ? plan.done / plan.total : 0} size={52} stroke={6} label={`${plan.done}/${plan.total}`} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.kicker}>YOUR PLAN · {plan.pro_name.toUpperCase()}’S STYLE</Text>
          <Text style={s.title}>{plan.next ? 'Next up, step by step' : 'Every step done'}</Text>
        </View>
        <Text style={{ color: C.t3, fontSize: 18, ...font() }}>›</Text>
      </Pressable>

      <View>
        {plan.steps.map((step, i) => {
          const action = actionFor(step);
          const run = runs[step.id];
          const isNext = plan.next?.id === step.id;
          return (
            <View key={step.id} style={[s.step, i === 0 && { borderTopWidth: 0 }]}>
              <View style={s.stepHead}>
                <Pressable
                  onPress={() => void tick(step, !step.done)}
                  disabled={step.kind !== 'manual'}
                  hitSlop={8}
                  accessibilityRole={step.kind === 'manual' ? 'checkbox' : undefined}
                  accessibilityState={{ checked: step.done }}
                  accessibilityLabel={step.text}>
                  <View style={[s.check, step.done && { backgroundColor: C.acc, borderColor: C.acc }]}>
                    {step.done ? <Text style={s.checkMark}>✓</Text> : null}
                  </View>
                </Pressable>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={[s.stepText, step.done && { color: C.t3 }, isNext && !step.done && font('600')]}>{step.text}</Text>
                  <Text style={s.meta}>
                    {step.move}
                    {step.target ? ` · ${step.count ?? 0}/${step.target} from your uploads` : ''}
                    {ticking === step.id ? ' · Saving…' : ''}
                  </Text>
                  {step.target && !step.done ? <Meter value={(step.count ?? 0) / step.target} color={C.acc} height={2} /> : null}
                </View>
              </View>

              {action && !run ? (
                <View style={s.actions}>
                  <Button title={action.label} size="sm" variant={isNext ? 'primary' : 'secondary'} onPress={() => act(step, action)} />
                  {action.agent ? <Text style={s.credit}>1 credit · you approve it first</Text> : null}
                </View>
              ) : null}

              {run ? <AgentPanel step={step} run={run} onTicked={onChange} /> : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function AgentPanel({ step, run, onTicked }: { step: PlanStep; run: AgentRun; onTicked: (plan: StylePlan | null) => void }) {
  const s = useStyles();
  if (agentBusy(run)) {
    return (
      <JobProgress
        title="Plan agent"
        startedAt={run.startedAt}
        expectedSec={25}
        progress={run.progress}
        steps={['Reading their titles and yours', 'Drafting it', 'Checking the draft']}
      />
    );
  }
  if (run.error) {
    return (
      <View style={s.panel}>
        <Text style={s.error}>{run.error}</Text>
        <View style={s.row}>
          <Button title="Try again" size="sm" variant="secondary" onPress={() => void runAgent(step.id)} />
          <Button title="Dismiss" size="sm" variant="plain" onPress={() => dismissAgent(step.id)} />
        </View>
      </View>
    );
  }
  return run.result ? <Draft step={step} result={run.result} onTicked={onTicked} /> : null;
}

// What the agent drafted, with the one-tap way to use it.
function Draft({ step, result, onTicked }: { step: PlanStep; result: PlanAssist; onTicked: (plan: StylePlan | null) => void }) {
  const s = useStyles();
  const studio = useStudio();
  const { setDescription } = useDraft();
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const markDone = async () => {
    if (step.kind === 'manual' && !step.done) onTicked((await api.tickPlanStep(step.id, true)).plan);
  };
  const copy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    setNote('Copied');
  };
  const pickTitle = (title: string) => {
    studio.open();
    studio.set({ title });
    router.push('/studio');
  };
  const saveDescription = async () => {
    if (result.mode !== 'description' || busy) return;
    setBusy(true);
    setNote(null);
    try {
      // Saved as a new description so your old one stays; it becomes the one Upload Studio uses.
      const d = await api.createDescription(result.title, result.content);
      setDescription({ id: d.id, title: d.title, content: d.content, saved: true });
      await markDone();
      dismissAgent(step.id);
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Could not save it.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.panel}>
      <Text style={s.kicker}>PLAN AGENT · DRAFT</Text>
      {result.summary ? <Text style={s.summary}>{result.summary}</Text> : null}

      {result.mode === 'titles' ? (
        <View>
          {result.titles.map((t) => (
            <View key={t} style={s.titleRow}>
              <Text style={s.titleText} selectable>
                {t}
              </Text>
              <Pressable onPress={() => pickTitle(t)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Use “${t}” in Upload Studio`}>
                <Text style={s.use}>Use</Text>
              </Pressable>
            </View>
          ))}
          <Text style={s.credit}>Use one in Upload Studio; this step ticks itself off when you upload.</Text>
        </View>
      ) : (
        <Text style={s.content} selectable>
          {result.content}
        </Text>
      )}

      {note ? <Text style={s.credit}>{note}</Text> : null}
      <View style={s.row}>
        {result.mode === 'description' ? (
          <Button title={busy ? 'Saving…' : 'Save and use'} size="sm" onPress={() => void saveDescription()} />
        ) : result.mode === 'help' ? (
          <Button title="Copy" size="sm" onPress={() => void copy(result.content)} />
        ) : null}
        {result.mode === 'help' && step.kind === 'manual' && !step.done ? (
          <Button title="Mark done" size="sm" variant="secondary" onPress={() => void markDone().then(() => dismissAgent(step.id))} />
        ) : null}
        <Button title="Redo" size="sm" variant="secondary" onPress={() => void runAgent(step.id)} />
        <Button title="Dismiss" size="sm" variant="plain" onPress={() => dismissAgent(step.id)} />
      </View>
    </View>
  );
}

const useStyles = makeStyles((C) => ({
  plan: { padding: 16, gap: 14, borderRadius: 16, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  kicker: { color: C.acc, fontSize: 11, letterSpacing: 0.4, fontFamily: F.monoMedium },
  title: { color: C.text, fontSize: 17, ...display },
  step: { gap: 10, paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.lineSoft },
  stepHead: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  check: {
    width: 22,
    height: 22,
    marginTop: 1,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: C.onAcc, fontSize: 12, ...font('700') },
  stepText: { color: C.text, fontSize: 14.5, lineHeight: 20, ...font() },
  meta: { color: C.t3, fontSize: 12, ...font() },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 34 },
  credit: { color: C.t3, fontSize: 11.5, lineHeight: 16, ...font() },
  panel: { marginLeft: 34, padding: 12, gap: 10, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: C.bg },
  summary: { color: C.t2, fontSize: 13, lineHeight: 18, ...font() },
  content: { color: C.text, fontSize: 13.5, lineHeight: 20, ...font() },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40, borderTopWidth: 1, borderTopColor: C.lineSoft },
  titleText: { flex: 1, color: C.text, fontSize: 13, fontFamily: F.mono },
  use: { color: C.text, fontSize: 13, ...font('600') },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  error: { color: C.danger, fontSize: 13, ...font() },
}));
