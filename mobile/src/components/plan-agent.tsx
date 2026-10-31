import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import * as api from '@/api/endpoints';
import type { PlanAssist, PlanStep, StylePlan } from '@/api/endpoints';
import { openPro, Ring } from '@/components/pros';
import { Button, JobProgress, Meter } from '@/components/ui';
import { useDraft, type DraftDescription } from '@/state/draft';
import { agentBusy, dismissAgent, runAgent, useAgentRuns, type AgentRun } from '@/state/plan-agent';
import { useStudio } from '@/state/studio';
import { F, display, font, makeStyles, useColors } from '@/theme';

// Your plan on Workflow: every step with what you can do about it right here. The plan agent
// does the step in the app for you: it rewrites the description Upload Studio uses (with undo)
// and puts a title in Upload Studio; for anything outside the app it writes what to send.
// Upload steps tick themselves off from your uploads.

type Action = { label: string; agent: boolean; note?: string };

function actionFor(step: PlanStep): Action | null {
  if (step.done) return null;
  if (step.kind === 'uploads') return { label: 'Open Upload Studio', agent: false };
  if (step.kind === 'title_formula' || step.kind === 'title_pair')
    return { label: 'Write titles', agent: true, note: '1 credit · fills your Upload Studio title' };
  if (step.link === 'descriptions') return { label: 'Do it for me', agent: true, note: '1 credit · edits your description, you can undo' };
  return { label: 'Help me', agent: true, note: '1 credit · writes it for you to copy' };
}

// Results the agent already put into the app, so that happens once (the panel remounts as you
// move around), with the description Upload Studio used before, for undo.
const applied = new WeakMap<PlanAssist, { before?: DraftDescription }>();

/** The description Upload Studio is using, in the shape the agent takes. */
const agentDescription = (d: DraftDescription) => (d.saved ? { id: d.id } : { content: d.content });

export function PlanWorkflow({ plan, onChange }: { plan: StylePlan; onChange: (plan: StylePlan | null) => void }) {
  const s = useStyles();
  const C = useColors();
  const runs = useAgentRuns();
  const studio = useStudio();
  const { description } = useDraft();
  const [ticking, setTicking] = useState<string | null>(null);
  const run = (stepId: string) => void runAgent(stepId, agentDescription(description));

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
    if (action.agent) return run(step.id);
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
          const agentRun = runs[step.id];
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

              {action && !agentRun ? (
                <View style={s.actions}>
                  <Button title={action.label} size="sm" variant={isNext ? 'primary' : 'secondary'} onPress={() => act(step, action)} />
                  {action.note ? <Text style={s.credit}>{action.note}</Text> : null}
                </View>
              ) : null}

              {agentRun ? <AgentPanel step={step} run={agentRun} onTicked={onChange} redo={() => run(step.id)} /> : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

type Panel = { step: PlanStep; onTicked: (plan: StylePlan | null) => void; redo: () => void };

function AgentPanel({ step, run, onTicked, redo }: Panel & { run: AgentRun }) {
  const s = useStyles();
  if (agentBusy(run)) {
    return (
      <JobProgress
        title="Plan agent"
        startedAt={run.startedAt}
        expectedSec={25}
        progress={run.progress}
        steps={['Reading their titles and yours', 'Writing it', 'Putting it in the app']}
      />
    );
  }
  if (run.error) {
    return (
      <View style={s.panel}>
        <Text style={s.error}>{run.error}</Text>
        <View style={s.row}>
          <Button title="Try again" size="sm" variant="secondary" onPress={redo} />
          <Button title="Dismiss" size="sm" variant="plain" onPress={() => dismissAgent(step.id)} />
        </View>
      </View>
    );
  }
  if (!run.result) return null;
  return run.result.mode === 'description' ? (
    <DescriptionDone step={step} result={run.result} onTicked={onTicked} redo={redo} />
  ) : (
    <Draft step={step} result={run.result} onTicked={onTicked} redo={redo} />
  );
}

const openStudio = (studio: ReturnType<typeof useStudio>) => {
  studio.open();
  router.push('/studio');
};

// A description step, already done: the server saved it and ticked the step. This makes it the
// description Upload Studio uses, says so plainly, and offers undo.
function DescriptionDone({ step, result, onTicked, redo }: Panel & { result: Extract<PlanAssist, { mode: 'description' }> }) {
  const s = useStyles();
  const C = useColors();
  const studio = useStudio();
  const { description, setDescription } = useDraft();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const title = result.title;

  useEffect(() => {
    if (applied.has(result)) return;
    applied.set(result, { before: description });
    if (result.description_id) setDescription({ id: result.description_id, title, content: result.content, saved: true });
    // The server ticked the step; show it.
    api.stylePlan().then((r) => onTicked(r.plan), () => {});
    // Once per result: a later description or onTicked change must not apply it again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const undo = async () => {
    if (busy || !result.description_id) return;
    setBusy(true);
    setNote(null);
    try {
      const before = applied.get(result)?.before;
      if (result.created) {
        await api.deleteDescription(result.description_id);
        if (before) setDescription(before);
      } else {
        const d = await api.updateDescription(result.description_id, title, result.previous_content ?? '');
        setDescription({ id: d.id, title: d.title, content: d.content, saved: true });
      }
      if (step.kind === 'manual') onTicked((await api.tickPlanStep(step.id, false)).plan);
      dismissAgent(step.id);
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Could not undo it.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.panel}>
      <View style={s.doneHead}>
        <View style={s.doneTick}>
          <Text style={s.checkMark}>✓</Text>
        </View>
        <Text style={[s.summary, { flex: 1, color: C.text }]}>
          {result.created ? `Saved a new description, “${title}”.` : `Rewrote your description “${title}”.`} Upload Studio uses it for
          your next upload.
        </Text>
      </View>
      {result.summary ? <Text style={s.summary}>{result.summary}</Text> : null}
      <Pressable onPress={() => setExpanded((v) => !v)} accessibilityRole="button" accessibilityHint={expanded ? 'Shows less' : 'Shows the whole description'}>
        <Text style={s.content} numberOfLines={expanded ? undefined : 6}>
          {result.content}
        </Text>
        <Text style={s.more}>{expanded ? 'Show less' : 'Show all'}</Text>
      </Pressable>
      {note ? <Text style={s.error}>{note}</Text> : null}
      <View style={s.row}>
        <Button title="Open Upload Studio" size="sm" onPress={() => openStudio(studio)} />
        <Button title={busy ? 'Undoing…' : 'Undo'} size="sm" variant="secondary" onPress={() => void undo()} />
        <Button title="Redo" size="sm" variant="secondary" onPress={redo} />
        <Button title="Close" size="sm" variant="plain" onPress={() => dismissAgent(step.id)} />
      </View>
    </View>
  );
}

// Titles and messages. The top title goes straight into Upload Studio when its title is empty;
// tap another to swap it in.
function Draft({ step, result, onTicked, redo }: Panel & { result: Exclude<PlanAssist, { mode: 'description' }> }) {
  const s = useStyles();
  const C = useColors();
  const studio = useStudio();
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (applied.has(result) || result.mode !== 'titles') return;
    applied.set(result, {});
    if (!studio.title.trim() && result.titles[0]) studio.set({ title: result.titles[0] });
    // Once per result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const markDone = async () => {
    if (step.kind === 'manual' && !step.done) onTicked((await api.tickPlanStep(step.id, true)).plan);
  };
  const copy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    setNote('Copied');
  };

  return (
    <View style={s.panel}>
      <Text style={s.kicker}>{result.mode === 'titles' ? 'PLAN AGENT · TITLES' : 'PLAN AGENT · READY TO SEND'}</Text>
      {result.summary ? <Text style={s.summary}>{result.summary}</Text> : null}

      {result.mode === 'titles' ? (
        <View>
          {result.titles.map((t) => {
            const on = t === studio.title;
            return (
              <Pressable
                key={t}
                onPress={() => studio.set({ title: t })}
                style={s.titleRow}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`Use “${t}” as your Upload Studio title`}>
                <View style={[s.radio, on && { borderColor: C.acc, backgroundColor: C.acc }]}>{on ? <Text style={s.radioMark}>✓</Text> : null}</View>
                <Text style={[s.titleText, on && { color: C.text }]}>{t}</Text>
              </Pressable>
            );
          })}
          <Text style={s.credit}>
            {result.titles.includes(studio.title) ? 'That one is your Upload Studio title now. ' : 'Tap one to make it your Upload Studio title. '}
            This step ticks itself off when you upload.
          </Text>
        </View>
      ) : (
        <Text style={s.content} selectable>
          {result.content}
        </Text>
      )}

      {note ? <Text style={s.credit}>{note}</Text> : null}
      <View style={s.row}>
        {result.mode === 'titles' ? (
          <Button title="Open Upload Studio" size="sm" onPress={() => openStudio(studio)} />
        ) : (
          <Button title="Copy" size="sm" onPress={() => void copy(result.content)} />
        )}
        {result.mode === 'help' && step.kind === 'manual' && !step.done ? (
          <Button title="Mark done" size="sm" variant="secondary" onPress={() => void markDone().then(() => dismissAgent(step.id))} />
        ) : null}
        <Button title="Redo" size="sm" variant="secondary" onPress={redo} />
        <Button title="Close" size="sm" variant="plain" onPress={() => dismissAgent(step.id)} />
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
  titleText: { flex: 1, color: C.t2, fontSize: 13, fontFamily: F.mono },
  more: { color: C.t2, fontSize: 12, marginTop: 4, ...font('600') },
  doneHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  doneTick: { width: 20, height: 20, marginTop: 1, borderRadius: 10, backgroundColor: C.acc, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  radioMark: { color: C.onAcc, fontSize: 10, ...font('700') },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  error: { color: C.danger, fontSize: 13, ...font() },
}));
