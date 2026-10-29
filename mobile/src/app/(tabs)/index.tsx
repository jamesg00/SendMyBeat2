import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/api/auth';
import * as api from '@/api/endpoints';
import type { Description, TagRun } from '@/api/endpoints';
import { useRequest } from '@/api/use-request';
import {
  Button,
  Card,
  IconTile,
  JobProgress,
  ListGroup,
  ListRow,
  Meter,
  Pill,
  Screen,
  SectionLabel,
  Segmented,
  styles as ui,
} from '@/components/ui';
import { DESCRIPTION_TEMPLATES } from '@/data/templates';
import { useDraft, type DraftDescription } from '@/state/draft';
import { useStudio } from '@/state/studio';
import { C, F, R, font } from '@/theme';

type Step = 'build' | 'review' | 'upload';

// YouTube rejects tag lists longer than this (tags joined with commas).
const TAG_CHAR_LIMIT = 500;

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
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('build');
  const draft = useDraft();
  const sub = useRequest(api.subscriptionStatus);
  const history = useRequest(api.tagHistory);
  const descriptions = useRequest(api.descriptions);

  // A run that finished after the list loaded (e.g. resumed after a restart) still shows up.
  const last = draft.lastGenerated;
  const runs = last && !(history.data ?? []).some((r) => r.id === last.id) ? [last, ...(history.data ?? [])] : (history.data ?? []);

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
          <View style={s.avatar} accessibilityLabel={user?.username} accessibilityRole="image">
            <Text style={s.avatarText}>{user?.username.charAt(0).toUpperCase()}</Text>
          </View>
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

function openStudio(open: () => void) {
  open();
  router.push('/studio');
}

// Shown while Upload Studio holds a draft or an upload, so it's one tap to get back to it.
function StudioBanner() {
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

  return (
    <Card style={s.banner}>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={[s.cardTitle, { fontSize: 15, ...font() }, phase.kind === 'error' && { color: C.danger }]}>{title}</Text>
        <Text style={s.muted} numberOfLines={1}>
          {detail}
        </Text>
        {phase.kind === 'job' ? <Meter value={(phase.job.progress ?? 0) / 100} /> : null}
      </View>
      <Button title="Open" size="sm" onPress={() => openStudio(studio.open)} />
    </Card>
  );
}

function UsageMeter({ label, left, total }: { label: string; left: number; total: number }) {
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
  const { generation, generationError, lastGenerated, run } = useDraft();
  const [query, setQuery] = useState('');

  const generate = () => {
    if (!query.trim() || generation) return;
    void onGenerate(query.trim());
    setQuery('');
  };

  return (
    <>
      <Card>
        <View style={s.cardHead}>
          <Text style={s.cardTitle}>Generate YouTube tags</Text>
          <Text style={s.muted}>{runs.length} saved runs</Text>
        </View>
        {generation ? (
          <JobProgress
            title={`Tags for “${generation.query}”`}
            startedAt={generation.startedAt}
            expectedSec={45}
            progress={generation.progress}
            steps={TAG_STEPS}
          />
        ) : (
          <>
            <Text style={ui.sectionLabel}>SEARCH QUERY</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="e.g. lil uzi, travis scott"
              placeholderTextColor={C.t3}
              style={s.input}
              returnKeyType="go"
              onSubmitEditing={generate}
              autoCapitalize="none"
              accessibilityLabel="Search query"
            />
            <Text style={s.muted}>Include the artist name for &ldquo;type beat&rdquo; variations.</Text>
            {generationError ? <Text style={s.error}>{generationError}</Text> : null}
            <Button title="Generate 60–80 tags" onPress={generate} />
          </>
        )}
        {generation ? <Text style={s.muted}>You can switch tabs or close the app. Generation keeps going.</Text> : null}
        {!generation && lastGenerated && lastGenerated.id === run?.id ? (
          <View style={s.done}>
            <Text style={{ color: C.acc, fontSize: 15, ...font() }}>✓</Text>
            <Text style={[s.muted, { flex: 1, color: C.t2 }]}>
              {lastGenerated.tags.length} tags ready for “{lastGenerated.query}”
            </Text>
            <Button title="Review" size="sm" onPress={() => onOpen(lastGenerated)} />
          </View>
        ) : null}
      </Card>

      <DescriptionEditor saved={descriptions} onSaved={onDescriptionSaved} onDeleted={onDescriptionDeleted} />

      <SectionLabel>Recent runs</SectionLabel>
      {historyLoading ? (
        <ActivityIndicator color={C.acc} />
      ) : historyError ? (
        <Text style={s.error}>{historyError}</Text>
      ) : runs.length === 0 ? (
        <Text style={s.muted}>Your generated tag sets will show up here.</Text>
      ) : (
        <ListGroup>
          {runs.slice(0, 8).map((r, i, arr) => (
            <ListRow
              key={r.id}
              title={r.query}
              value={`${r.tags.length} tags`}
              last={i === arr.length - 1}
              right={<Button title="Open" variant="secondary" size="sm" onPress={() => onOpen(r)} />}
            />
          ))}
        </ListGroup>
      )}
    </>
  );
}

type Editing = { id?: string; title: string; content: string };

// Pick, write, edit and delete descriptions, like the website's description manager.
function DescriptionEditor({
  saved,
  onSaved,
  onDeleted,
}: {
  saved: Description[];
  onSaved: (d: Description) => void;
  onDeleted: (id: string) => void;
}) {
  const { description, setDescription } = useDraft();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options: DraftDescription[] = [
    ...saved.map((d) => ({ id: d.id, title: d.title, content: d.content, saved: true })),
    ...DESCRIPTION_TEMPLATES.map((t) => ({ id: t.id, title: t.name, content: t.content, saved: false })),
  ];
  const current = options.find((o) => o.id === description.id) ?? options[0];

  const edit = (d: DraftDescription) =>
    // Templates aren't editable on the server, so editing one saves your own copy.
    setEditing(d.saved ? { id: d.id, title: d.title, content: d.content } : { title: `${d.title} (mine)`, content: d.content });

  const save = async () => {
    if (!editing || !editing.title.trim() || !editing.content.trim()) {
      setError('Add a title and some text first.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const d = editing.id
        ? await api.updateDescription(editing.id, editing.title.trim(), editing.content)
        : await api.createDescription(editing.title.trim(), editing.content);
      onSaved(d);
      setDescription({ id: d.id, title: d.title, content: d.content, saved: true });
      setEditing(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the description.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!editing?.id) return;
    setBusy(true);
    setError(null);
    try {
      await api.deleteDescription(editing.id);
      onDeleted(editing.id);
      if (description.id === editing.id) {
        const t = DESCRIPTION_TEMPLATES[0];
        setDescription({ id: t.id, title: t.name, content: t.content, saved: false });
      }
      setEditing(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete the description.');
    } finally {
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <Card>
        <View style={s.cardHead}>
          <Text style={s.cardTitle}>{editing.id ? 'Edit description' : 'New description'}</Text>
          <Text style={[s.muted, { fontFamily: F.mono }]}>{editing.content.length} chars</Text>
        </View>
        <TextInput
          value={editing.title}
          onChangeText={(title) => setEditing({ ...editing, title })}
          placeholder="Name it, e.g. Dark trap template"
          placeholderTextColor={C.t3}
          style={s.input}
          accessibilityLabel="Description title"
        />
        <TextInput
          value={editing.content}
          onChangeText={(content) => setEditing({ ...editing, content })}
          placeholder={'Write your description.\nPurchase links, contact info, credits…'}
          placeholderTextColor={C.t3}
          style={[s.input, s.textArea]}
          multiline
          textAlignVertical="top"
          accessibilityLabel="Description text"
        />
        {error ? <Text style={s.error}>{error}</Text> : null}
        <View style={s.row}>
          <Button title="Cancel" variant="secondary" size="md" style={{ flex: 1 }} onPress={() => setEditing(null)} />
          {editing.id ? (
            <Button title="Delete" variant="secondary" size="md" style={{ flex: 1 }} onPress={busy ? undefined : remove} />
          ) : null}
          <Button title={busy ? 'Saving…' : 'Save'} size="md" style={{ flex: 1 }} onPress={busy ? undefined : save} />
        </View>
      </Card>
    );
  }

  return (
    <Card>
      <View style={s.cardHead}>
        <Text style={s.cardTitle}>Description</Text>
        <Button title="+ New" variant="secondary" size="sm" onPress={() => setEditing({ title: '', content: '' })} />
      </View>
      <ListGroup>
        {options.map((o, i) => (
          <ListRow
            key={o.id}
            title={o.title}
            subtitle={o.saved ? undefined : 'Template'}
            last={i === options.length - 1}
            onPress={() => setDescription(o)}
            right={o.id === current.id ? <Text style={{ color: C.acc, fontSize: 16, ...font() }}>✓</Text> : <View />}
          />
        ))}
      </ListGroup>
      <Text style={s.description} numberOfLines={6}>
        {current.content}
      </Text>
      <Button title={current.saved ? 'Edit description' : 'Customize this template'} variant="secondary" size="md" onPress={() => edit(current)} />
    </Card>
  );
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

const keyOf = (t: string) => t.trim().toLowerCase();

// Remove tags with a tap, add your own, and save back to the run (the server learns from removals).
function TagEditor({ run, onSaved }: { run: TagRun; onSaved: (r: TagRun) => void }) {
  const [tags, setTags] = useState(run.tags);
  const [input, setInput] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<{ text: string; error?: boolean } | null>(null);

  const original = new Set(run.tags.map(keyOf));
  const current = new Set(tags.map(keyOf));
  const removed = run.tags.filter((t) => !current.has(keyOf(t)));
  const added = tags.filter((t) => !original.has(keyOf(t)));
  const dirty = removed.length > 0 || added.length > 0;
  const chars = tags.join(',').length;
  const visible = showAll ? tags : tags.slice(0, 24);

  const add = () => {
    const next = [...tags];
    const seen = new Set(next.map(keyOf));
    for (const part of input.split(',')) {
      const t = part.trim();
      if (t && !seen.has(keyOf(t))) {
        next.push(t);
        seen.add(keyOf(t));
      }
    }
    setTags(next);
    setInput('');
    setNote(null);
  };

  const save = async () => {
    if (!dirty || saving || tags.length === 0) return;
    setSaving(true);
    setNote(null);
    try {
      const updated = await api.updateTags(run.id, tags, removed, added);
      onSaved(updated);
      setNote({ text: 'Tags saved ✓' });
    } catch (e) {
      setNote({ text: e instanceof Error ? e.message : 'Could not save tags.', error: true });
    } finally {
      setSaving(false);
    }
  };

  const copy = async () => {
    await Clipboard.setStringAsync(tags.join(', '));
    setNote({ text: 'Copied ✓' });
  };

  return (
    <Card>
      <View style={s.cardHead}>
        <Text style={s.cardTitle} numberOfLines={1}>
          {run.query}
        </Text>
        <Pill label={`${tags.length} tags`} />
      </View>

      <View style={{ gap: 6 }}>
        <View style={s.meterHead}>
          <Text style={ui.sectionLabel}>YOUTUBE TAG LIMIT</Text>
          <Text style={[s.meterValue, chars > TAG_CHAR_LIMIT && { color: C.warn }]}>
            {chars}
            <Text style={{ color: C.t3, ...font() }}>/{TAG_CHAR_LIMIT}</Text>
          </Text>
        </View>
        <Meter value={Math.min(1, chars / TAG_CHAR_LIMIT)} color={chars > TAG_CHAR_LIMIT ? C.warn : C.acc} />
        {chars > TAG_CHAR_LIMIT ? (
          <Text style={[s.muted, { color: C.warn }]}>Over YouTube&apos;s limit. Tap tags to remove the weakest ones.</Text>
        ) : null}
      </View>

      <View style={s.chips}>
        {visible.map((tag) => {
          const isNew = !original.has(keyOf(tag));
          return (
            <Pressable
              key={tag}
              onPress={() => setTags(tags.filter((t) => t !== tag))}
              style={({ pressed }) => [s.chip, isNew && s.chipNew, pressed && { opacity: 0.6 }]}
              accessibilityRole="button"
              accessibilityLabel={`Remove tag ${tag}`}>
              <Text style={[s.chipText, isNew && { color: C.acc }]}>{tag}</Text>
              <Text style={s.chipX}>×</Text>
            </Pressable>
          );
        })}
        {tags.length > 24 ? (
          <Pressable onPress={() => setShowAll(!showAll)} style={[s.chip, { backgroundColor: 'transparent' }]} accessibilityRole="button">
            <Text style={[s.chipText, { color: C.t2 }]}>{showAll ? 'Show less' : `+${tags.length - 24} more`}</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={s.row}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Add tags, separated by commas"
          placeholderTextColor={C.t3}
          style={[s.input, { flex: 1 }]}
          returnKeyType="done"
          onSubmitEditing={add}
          autoCapitalize="none"
          accessibilityLabel="Add tags"
        />
        <Button title="Add" variant="secondary" size="md" onPress={add} />
      </View>

      {dirty ? (
        <Text style={s.muted}>
          {[removed.length && `${removed.length} removed`, added.length && `${added.length} added`].filter(Boolean).join(' · ')}
        </Text>
      ) : null}
      {note ? <Text style={[s.muted, { color: note.error ? C.danger : C.acc }]}>{note.text}</Text> : null}

      <View style={s.row}>
        <Button title="Copy" variant="secondary" size="md" style={{ flex: 1 }} onPress={copy} />
        {dirty ? (
          <Button title="Undo" variant="secondary" size="md" style={{ flex: 1 }} onPress={() => setTags(run.tags)} />
        ) : null}
        <Button
          title={saving ? 'Saving…' : 'Save tags'}
          variant={dirty ? 'primary' : 'secondary'}
          size="md"
          style={{ flex: 1 }}
          onPress={dirty && !saving ? save : undefined}
        />
      </View>
    </Card>
  );
}

function UploadStep({ run }: { run: TagRun | null }) {
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
              <Text style={{ color: '#fff', fontSize: 14, ...font() }}>▶</Text>
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

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
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
  chipNew: { borderColor: C.accLine, backgroundColor: '#06140E' },
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
});
