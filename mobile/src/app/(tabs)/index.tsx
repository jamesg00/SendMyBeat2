import * as Clipboard from 'expo-clipboard';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/api/auth';
import * as api from '@/api/endpoints';
import type { Description, TagRun } from '@/api/endpoints';
import { useRequest } from '@/api/use-request';
import { Button, Card, IconTile, JobProgress, ListGroup, ListRow, Meter, Pill, PlayPauseIcon, Screen, SectionLabel, Segmented, SwipeToDelete, useUiStyles } from '@/components/ui';
import { DescriptionEditor, TagEditor } from '@/components/editors';
import { Avatar } from '@/components/producer';
import { PlanWorkflow } from '@/components/plan-agent';
import { usePlan } from '@/components/pros';
import { useDraft } from '@/state/draft';
import { useStudio } from '@/state/studio';
import { F, R, font, makeStyles, useColors } from '@/theme';

type Step = 'build' | 'review' | 'upload';


const TAG_STEPS = [
  'Reading your search…',
  'Searching YouTube for top type beats…',
  'Pulling tags from similar videos…',
  'Asking AI for type beat variations…',
  'Scoring and ranking tags…',
  'Almost there…',
];

function upsert<T extends { id: string }>(list: T[] | null, item: T) {
  return [item, ...(list ?? []).filter((x) => x.id !== item.id)];
}

export default function WorkflowScreen() {
  const s = useStyles();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('build');
  const draft = useDraft();
  const sub = useRequest(api.subscriptionStatus);
  const history = useRequest(api.tagHistory);
  const descriptions = useRequest(api.descriptions);

  // A run that finished after the list loaded (e.g. resumed after a restart) still shows up.
  const last = draft.lastGenerated;
  const runs = last && !(history.data ?? []).some((r) => r.id === last.id) ? [last, ...(history.data ?? [])] : (history.data ?? []);

  const { plan, setPlan } = usePlan();

  // Your Spotlight profile, for the picture in the header; refreshed whenever you come back here.
  const me = useRequest(api.myProducer);
  const refreshMe = me.refresh;
  useFocusEffect(
    useCallback(() => {
      void refreshMe();
    }, [refreshMe]),
  );
  const openProfile = me.data ? () => router.push({ pathname: '/producer/[id]', params: { id: me.data!.user_id } }) : undefined;

  const openRun = (r: TagRun) => {
    draft.setRun(r);
    setStep('review');
  };

  const generate = async (query: string) => {
    const r = await draft.generate(query);
    if (!r) return;
    history.setData((cur) => upsert(cur, r));
    void sub.reload();
  };

  return (
    <Screen
      title="Workflow"
      accessory={
        <View style={s.header}>
          {sub.data ? <Pill label={planLabel(sub.data.plan)} tone="muted" /> : null}
          <Pressable
            onPress={openProfile}
            disabled={!openProfile}
            hitSlop={6}
            style={({ pressed }) => pressed && { opacity: 0.7 }}
            accessibilityRole="button"
            accessibilityLabel="Your Spotlight profile">
            {me.data ? (
              <Avatar producer={me.data} size={32} />
            ) : (
              <View style={s.avatar}>
                <Text style={s.avatarText}>{user?.username.charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </Pressable>
        </View>
      }>
      <View style={s.usage}>
        {sub.data ? (
          <>
            <UsageMeter label="AI credits left" left={sub.data.daily_credits_remaining} total={sub.data.daily_credits_total} />
            <UsageMeter label="Uploads left" left={sub.data.upload_credits_remaining} total={sub.data.upload_credits_total} />
          </>
        ) : (
          <Text style={s.muted}>{sub.error ?? 'Loading your plan…'}</Text>
        )}
      </View>

      <StudioBanner />

      <Segmented
        value={step}
        onChange={setStep}
        options={[
          { value: 'build', label: 'Build' },
          { value: 'review', label: 'Review' },
          { value: 'upload', label: 'Upload' },
        ]}
      />

      {step === 'build' && plan ? <PlanWorkflow plan={plan} onChange={setPlan} /> : null}
      {step === 'build' && (
        <BuildStep
          runs={runs}
          historyError={history.error}
          historyLoading={history.loading}
          onGenerate={generate}
          onOpen={openRun}
          descriptions={descriptions.data ?? []}
          onDescriptionSaved={(d) => descriptions.setData((cur) => upsert(cur, d))}
          onDescriptionDeleted={(id) => descriptions.setData((cur) => (cur ?? []).filter((d) => d.id !== id))}
        />
      )}
      {step === 'review' && (
        <ReviewStep
          onBack={() => setStep('build')}
          onDone={() => setStep('upload')}
          onTagsSaved={(r) => history.setData((cur) => (cur ?? []).map((x) => (x.id === r.id ? r : x)))}
        />
      )}
      {step === 'upload' && <UploadStep run={draft.run} />}
    </Screen>
  );
}

function planLabel(plan: api.SubscriptionStatus['plan']) {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

// Alert.alert does nothing on web, so the web preview uses the browser's confirm.
function confirmAction(title: string, message: string, action: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onYes();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Keep', style: 'cancel' },
    { text: action, style: 'destructive', onPress: onYes },
  ]);
}

function openStudio(open: () => void) {
  open();
  router.push('/studio');
}

// Shown while Upload Studio holds a draft or an upload, so it's one tap to get back to it.
function StudioBanner() {
  const C = useColors();
  const s = useStyles();
  const studio = useStudio();
  if (!studio.active) return null;
  const { phase, audio, image } = studio;

  let title = 'Upload Studio draft saved';
  let detail = [audio && 'beat', image && 'artwork'].filter(Boolean).join(' + ') || 'Settings saved';
  if (phase.kind === 'sending') {
    title = 'Upload starting…';
  } else if (phase.kind === 'job') {
    title = `Uploading · ${Math.round(phase.job.progress ?? 0)}%`;
    detail = phase.job.message ?? 'Rendering and uploading to YouTube';
  } else if (phase.kind === 'done') {
    title = 'Upload finished';
    detail = phase.message;
  } else if (phase.kind === 'error') {
    title = 'Upload failed';
    detail = phase.message;
  }

  const running = phase.kind === 'job' || phase.kind === 'sending';
  const askToDelete = () =>
    running
      ? confirmAction('Cancel this upload?', 'SendMyBeat stops rendering and uploading it, and the draft is deleted.', 'Cancel upload', () => void studio.discard())
      : confirmAction('Delete this draft?', 'The beat, artwork and settings in Upload Studio are removed.', 'Delete', () => void studio.discard());

  return (
    <SwipeToDelete onDelete={askToDelete} label={running ? 'Cancel upload' : 'Delete'}>
      <Card style={s.banner}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={[s.cardTitle, { fontSize: 15, ...font() }, phase.kind === 'error' && { color: C.danger }]}>{title}</Text>
          <Text style={s.muted} numberOfLines={1}>
            {detail}
          </Text>
          {phase.kind === 'job' ? <Meter value={(phase.job.progress ?? 0) / 100} /> : null}
          <Text style={s.swipeHint}>Swipe left to {running ? 'cancel' : 'delete'}</Text>
        </View>
        {phase.kind === 'error' ? (
          <Button title="Retry" size="sm" onPress={() => void studio.retry()} />
        ) : (
          <Button title="Open" size="sm" onPress={() => openStudio(studio.open)} />
        )}
      </Card>
    </SwipeToDelete>
  );
}

function UsageMeter({ label, left, total }: { label: string; left: number; total: number }) {
  const C = useColors();
  const s = useStyles();
  const ui = useUiStyles();
  return (
    <View style={{ flex: 1, gap: 8 }}>
      <View style={s.meterHead}>
        <Text style={ui.sectionLabel}>{label}</Text>
        <Text style={s.meterValue}>
          {left}
          <Text style={{ color: C.t3, ...font() }}>/{total}</Text>
        </Text>
      </View>
      <Meter value={total > 0 ? left / total : 0} />
    </View>
  );
}

function BuildStep({
  runs,
  historyError,
  historyLoading,
  onGenerate,
  onOpen,
  descriptions,
  onDescriptionSaved,
  onDescriptionDeleted,
}: {
  runs: TagRun[];
  historyError: string | null;
  historyLoading: boolean;
  onGenerate: (query: string) => Promise<void>;
  onOpen: (r: TagRun) => void;
  descriptions: Description[];
  onDescriptionSaved: (d: Description) => void;
  onDescriptionDeleted: (id: string) => void;
}) {
  const C = useColors();
  const s = useStyles();
  const ui = useUiStyles();
  const { generation, generationError, lastGenerated, run } = useDraft();
  const [query, setQuery] = useState('');

  const generate = () => {
    if (!query.trim() || generation) return;
    void onGenerate(query.trim());
    setQuery('');
  };

  return (
    <>
      {generation ? (
        <View style={{ gap: 8 }}>
          <JobProgress
            title={generation.query}
            startedAt={generation.startedAt}
            expectedSec={45}
            progress={generation.progress}
            steps={TAG_STEPS}
          />
          <Text style={s.muted}>Runs in the background. You can switch tabs or close the app.</Text>
        </View>
      ) : (
        <Card>
          <View style={s.cardHead}>
            <Text style={s.cardTitle}>Generate tags</Text>
            <Text style={s.mono}>60–80 tags · 1 credit</Text>
          </View>
          <View style={s.inputRow}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Artist or vibe, e.g. travis scott"
              placeholderTextColor={C.t3}
              style={s.inputBare}
              returnKeyType="go"
              onSubmitEditing={generate}
              autoCapitalize="none"
              accessibilityLabel="Search query"
            />
            <Text style={s.kbd}>return</Text>
          </View>
          {generationError ? <Text style={s.error}>{generationError}</Text> : null}
          <Button title="Generate" onPress={generate} />
        </Card>
      )}

      {!generation && lastGenerated && lastGenerated.id === run?.id ? (
        <Pressable onPress={() => onOpen(lastGenerated)} style={({ pressed }) => [s.done, pressed && { opacity: 0.7 }]} accessibilityRole="button">
          <Text style={{ color: C.acc, fontSize: 13, fontFamily: F.mono }}>✓</Text>
          <Text style={[s.sub, { flex: 1 }]}>
            {lastGenerated.tags.length} tags ready for <Text style={{ color: C.text }}>{lastGenerated.query}</Text>
          </Text>
          <Text style={[s.sub, { color: C.text }]}>Review ›</Text>
        </Pressable>
      ) : null}

      <DescriptionEditor saved={descriptions} onSaved={onDescriptionSaved} onDeleted={onDescriptionDeleted} />

      <View>
        <Text style={[ui.sectionLabel, { paddingBottom: 8 }]}>Recent runs</Text>
        {historyLoading ? (
          <ActivityIndicator color={C.t2} style={{ alignSelf: 'flex-start' }} />
        ) : historyError ? (
          <Text style={s.error}>{historyError}</Text>
        ) : runs.length === 0 ? (
          <Text style={s.muted}>Your generated tag sets will show up here.</Text>
        ) : (
          runs.slice(0, 8).map((r, i, arr) => (
            <Pressable
              key={r.id}
              onPress={() => onOpen(r)}
              accessibilityRole="button"
              style={({ pressed }) => [s.hairRow, i === arr.length - 1 && s.hairLast, pressed && { backgroundColor: C.card }]}>
              <Text style={s.hairTitle} numberOfLines={1}>
                {r.query}
              </Text>
              <Text style={s.mono}>{r.tags.length} tags</Text>
              <Text style={s.hairDate}>{shortDate(r.created_at)}</Text>
            </Pressable>
          ))
        )}
      </View>
    </>
  );
}

function shortDate(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days < 1) return 'Today';
  if (days < 2) return 'Yesterday';
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

function ReviewStep({
  onBack,
  onDone,
  onTagsSaved,
}: {
  onBack: () => void;
  onDone: () => void;
  onTagsSaved: (r: TagRun) => void;
}) {
  const s = useStyles();
  const { run, setRun, description } = useDraft();
  const [copied, setCopied] = useState(false);

  if (!run) {
    return (
      <Card>
        <Text style={s.cardTitle}>No tags yet</Text>
        <Text style={s.muted}>Generate tags or open a recent run first.</Text>
        <Button title="Go to Build" variant="secondary" size="md" onPress={onBack} />
      </Card>
    );
  }

  const copyDescription = async () => {
    await Clipboard.setStringAsync(description.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
      <TagEditor
        key={run.id}
        run={run}
        onSaved={(r) => {
          setRun(r);
          onTagsSaved(r);
        }}
      />

      <Card>
        <View style={s.cardHead}>
          <Text style={s.cardTitle} numberOfLines={1}>
            {description.title}
          </Text>
          <Button title="Change" variant="secondary" size="sm" onPress={onBack} />
        </View>
        <Text style={s.description} numberOfLines={8}>
          {description.content}
        </Text>
        <Button title={copied ? 'Copied ✓' : 'Copy description'} variant="secondary" size="md" onPress={copyDescription} />
      </Card>

      <Button title="Continue to upload" onPress={onDone} />
    </>
  );
}

function UploadStep({ run }: { run: TagRun | null }) {
  const C = useColors();
  const s = useStyles();
  const yt = useRequest(api.youtubeStatus);
  const studio = useStudio();
  return (
    <>
      <SectionLabel>YouTube</SectionLabel>
      <ListGroup>
        <ListRow
          title={yt.loading ? 'Checking…' : yt.data?.connected ? 'Connected' : 'Not connected'}
          subtitle={yt.data?.connected ? (yt.data.email ?? yt.data.name ?? undefined) : yt.error ?? 'Connect on sendmybeat.com for now'}
          height={60}
          last
          left={
            <IconTile tint={C.youtube}>
              <PlayPauseIcon playing={false} size={13} color="#fff" />
            </IconTile>
          }
        />
      </ListGroup>

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 }}>
        <Text style={{ color: run ? C.acc : C.t3, fontSize: 16, ...font() }}>{run ? '✓' : '–'}</Text>
        <Text style={[s.muted, { fontSize: 14, color: C.t2, flex: 1, ...font() }]}>
          {run ? `${run.tags.length} tags from “${run.query}” ready to attach` : 'No tags selected yet'}
        </Text>
      </Card>

      <Button title={studio.active ? 'Resume Upload Studio' : 'Open Upload Studio'} onPress={() => openStudio(studio.open)} />
    </>
  );
}

const useStyles = makeStyles((C) => ({
  swipeHint: { color: C.t3, fontSize: 11.5, fontFamily: F.mono },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.card2,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: C.t2, fontSize: 13, ...font('600') },
  usage: { flexDirection: 'row', gap: 20 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  meterHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  meterValue: { color: C.text, fontSize: 13, fontFamily: F.mono },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  cardTitle: { color: C.text, fontSize: 17, flexShrink: 1, ...font('600') },
  muted: { color: C.t3, fontSize: 12, lineHeight: 17, flexShrink: 1, ...font() },
  error: { color: C.danger, fontSize: 13, ...font() },
  done: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: R.ctl,
    backgroundColor: C.card2,
    borderWidth: 1,
    borderColor: C.line,
  },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  sub: { color: C.t2, fontSize: 13, ...font() },
  mono: { color: C.t2, fontSize: 12.5, fontFamily: F.mono },
  kbd: {
    color: C.t2,
    fontSize: 12,
    fontFamily: F.mono,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: R.chip,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.card2,
    overflow: 'hidden',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    paddingLeft: 14,
    paddingRight: 7,
    borderRadius: R.ctl,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.card,
  },
  inputBare: { flex: 1, height: '100%', color: C.text, fontSize: 15, ...font() },
  hairRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 52,
    borderTopWidth: 1,
    borderTopColor: C.lineSoft,
  },
  hairLast: { borderBottomWidth: 1, borderBottomColor: C.lineSoft },
  hairTitle: { flex: 1, color: C.text, fontSize: 15, ...font() },
  hairDate: { width: 64, textAlign: 'right', color: C.t3, fontSize: 13, ...font() },
  reviewHead: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  reviewTitle: { color: C.text, fontSize: 20, letterSpacing: -0.4, ...font('600') },
  chipMore: {
    height: 30,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: R.chip,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: C.line,
  },
  input: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: R.ctl,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.card,
    color: C.text,
    fontSize: 15,
    ...font(),
  },
  textArea: { height: 220, paddingTop: 12, paddingBottom: 12, lineHeight: 21 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 30,
    paddingLeft: 10,
    paddingRight: 8,
    borderRadius: R.chip,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
  },
  chipNew: { borderColor: C.accLine, backgroundColor: C.accSoft },
  chipText: { color: C.text, fontFamily: F.mono, fontSize: 12.5 },
  chipX: { color: C.t3, fontSize: 14, marginTop: -1, ...font() },
  description: {
    padding: 14,
    borderRadius: R.ctl,
    overflow: 'hidden',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.lineSoft,
    color: C.t2,
    fontSize: 14,
    lineHeight: 21,
    ...font(),
  },
}));
