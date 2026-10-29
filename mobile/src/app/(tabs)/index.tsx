import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/api/auth';
import * as api from '@/api/endpoints';
import type { TagRun } from '@/api/endpoints';
import { useRequest } from '@/api/use-request';
import {
  Button,
  Card,
  IconTile,
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
import { C, F, R } from '@/theme';

type Step = 'build' | 'review' | 'upload';

export default function WorkflowScreen() {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('build');
  const { run, setRun, description, setDescription } = useDraft();
  const sub = useRequest(api.subscriptionStatus);
  const history = useRequest(api.tagHistory);

  const openRun = (r: TagRun) => {
    setRun(r);
    setStep('review');
  };

  return (
    <Screen
      title="Workflow"
      header={
        <View style={s.header}>
          <View style={{ gap: 4 }}>
            <Text style={s.brand}>SENDMYBEAT</Text>
            <Text style={s.username}>{user?.username}</Text>
          </View>
          {sub.data ? <Pill label={planLabel(sub.data.plan)} /> : null}
        </View>
      }>
      <Card style={s.usage}>
        {sub.data ? (
          <>
            <UsageMeter label="AI credits left" left={sub.data.daily_credits_remaining} total={sub.data.daily_credits_total} />
            <UsageMeter label="Uploads left" left={sub.data.upload_credits_remaining} total={sub.data.upload_credits_total} />
          </>
        ) : (
          <Text style={s.muted}>{sub.error ?? 'Loading your plan…'}</Text>
        )}
      </Card>

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
          history={history.data ?? []}
          historyError={history.error}
          historyLoading={history.loading}
          onGenerated={(r) => {
            history.setData((cur) => [r, ...(cur ?? []).filter((x) => x.id !== r.id)]);
            void sub.reload();
            openRun(r);
          }}
          onOpen={openRun}
        />
      )}
      {step === 'review' && (
        <ReviewStep
          run={run}
          description={description}
          onDescription={setDescription}
          onBack={() => setStep('build')}
          onDone={() => setStep('upload')}
        />
      )}
      {step === 'upload' && <UploadStep run={run} />}
    </Screen>
  );
}

function planLabel(plan: api.SubscriptionStatus['plan']) {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

function UsageMeter({ label, left, total }: { label: string; left: number; total: number }) {
  return (
    <View style={{ flex: 1, gap: 8 }}>
      <View style={s.meterHead}>
        <Text style={ui.sectionLabel}>{label.toUpperCase()}</Text>
        <Text style={s.meterValue}>
          {left}
          <Text style={{ color: C.t3, fontWeight: '400' }}>/{total}</Text>
        </Text>
      </View>
      <Meter value={total > 0 ? left / total : 0} />
    </View>
  );
}

function BuildStep({
  history,
  historyError,
  historyLoading,
  onGenerated,
  onOpen,
}: {
  history: TagRun[];
  historyError: string | null;
  historyLoading: boolean;
  onGenerated: (r: TagRun) => void;
  onOpen: (r: TagRun) => void;
}) {
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    if (!query.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      onGenerated(await api.generateTags(query.trim()));
      setQuery('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tag generation failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card>
        <View style={s.cardHead}>
          <Text style={s.cardTitle}>Generate YouTube tags</Text>
          <Text style={s.muted}>{history.length} saved runs</Text>
        </View>
        <Text style={ui.sectionLabel}>SEARCH QUERY</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="e.g. lil uzi, travis scott"
          placeholderTextColor={C.t3}
          style={s.input}
          returnKeyType="go"
          onSubmitEditing={generate}
          editable={!busy}
          autoCapitalize="none"
          accessibilityLabel="Search query"
        />
        <Text style={s.muted}>Include the artist name for &ldquo;type beat&rdquo; variations.</Text>
        {error ? <Text style={s.error}>{error}</Text> : null}
        {busy ? (
          <View style={s.busy}>
            <ActivityIndicator color={C.acc} />
            <Text style={s.muted}>Generating tags from AI + YouTube signals. This takes about 45 seconds.</Text>
          </View>
        ) : (
          <Button title="Generate 60–80 tags" onPress={generate} />
        )}
      </Card>

      <SectionLabel>Recent runs</SectionLabel>
      {historyLoading ? (
        <ActivityIndicator color={C.acc} />
      ) : historyError ? (
        <Text style={s.error}>{historyError}</Text>
      ) : history.length === 0 ? (
        <Text style={s.muted}>Your generated tag sets will show up here.</Text>
      ) : (
        <ListGroup>
          {history.slice(0, 8).map((r, i, arr) => (
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

function ReviewStep({
  run,
  description,
  onDescription,
  onBack,
  onDone,
}: {
  run: TagRun | null;
  description: DraftDescription;
  onDescription: (d: DraftDescription) => void;
  onBack: () => void;
  onDone: () => void;
}) {
  const saved = useRequest(api.descriptions);
  const [copied, setCopied] = useState<'tags' | 'desc' | null>(null);

  if (!run) {
    return (
      <Card>
        <Text style={s.cardTitle}>No tags yet</Text>
        <Text style={s.muted}>Generate tags or open a recent run first.</Text>
        <Button title="Go to Build" variant="secondary" size="md" onPress={onBack} />
      </Card>
    );
  }

  const options: DraftDescription[] = [
    ...DESCRIPTION_TEMPLATES.map((t) => ({ id: t.id, title: t.name, content: t.content, saved: false })),
    ...(saved.data ?? []).map((d) => ({ id: d.id, title: d.title, content: d.content, saved: true })),
  ];
  const current = options.find((o) => o.id === description.id) ?? options[0];

  const copy = async (what: 'tags' | 'desc') => {
    await Clipboard.setStringAsync(what === 'tags' ? run.tags.join(', ') : current.content);
    setCopied(what);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <>
      <Card>
        <View style={s.cardHead}>
          <Text style={s.cardTitle} numberOfLines={1}>
            {run.query}
          </Text>
          <Pill label={`${run.tags.length} tags`} />
        </View>
        <View style={s.chips}>
          {run.tags.slice(0, 12).map((tag) => (
            <Text key={tag} style={s.chip}>
              {tag}
            </Text>
          ))}
          {run.tags.length > 12 ? (
            <Text style={[s.chip, { backgroundColor: 'transparent', color: C.t2 }]}>+{run.tags.length - 12} more</Text>
          ) : null}
        </View>
        <Button title={copied === 'tags' ? 'Copied ✓' : 'Copy all tags'} variant="secondary" size="md" onPress={() => copy('tags')} />
      </Card>

      <Card>
        <View style={s.cardHead}>
          <Text style={s.cardTitle}>Description</Text>
          <Text style={s.muted}>{saved.data?.length ?? 0} saved</Text>
        </View>
        <ListGroup>
          {options.map((o, i) => (
            <ListRow
              key={o.id}
              title={o.title}
              last={i === options.length - 1}
              onPress={() => onDescription(o)}
              right={o.id === current.id ? <Text style={{ color: C.acc, fontSize: 16 }}>✓</Text> : <View />}
            />
          ))}
        </ListGroup>
        <Text style={s.description} numberOfLines={8}>
          {current.content}
        </Text>
        <Button title={copied === 'desc' ? 'Copied ✓' : 'Copy description'} variant="secondary" size="md" onPress={() => copy('desc')} />
      </Card>

      <Button title="Continue to upload" onPress={onDone} />
    </>
  );
}

function UploadStep({ run }: { run: TagRun | null }) {
  const yt = useRequest(api.youtubeStatus);
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
              <Text style={{ color: '#fff', fontSize: 14 }}>▶</Text>
            </IconTile>
          }
        />
      </ListGroup>

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 }}>
        <Text style={{ color: run ? C.acc : C.t3, fontSize: 16 }}>{run ? '✓' : '–'}</Text>
        <Text style={[s.muted, { fontSize: 14, color: C.t2, flex: 1 }]}>
          {run ? `${run.tags.length} tags from “${run.query}” ready to attach` : 'No tags selected yet'}
        </Text>
      </Card>

      <Button title="Open Upload Studio" onPress={() => router.push('/studio')} />
    </>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { fontFamily: F.brand, fontSize: 13, letterSpacing: 3, color: C.acc },
  username: { color: C.t2, fontSize: 13 },
  usage: { flexDirection: 'row', gap: 16, paddingVertical: 14 },
  meterHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  meterValue: { color: C.text, fontSize: 13, fontWeight: '600' },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  cardTitle: { color: C.text, fontSize: 17, fontWeight: '600', flexShrink: 1 },
  muted: { color: C.t3, fontSize: 12, lineHeight: 17, flexShrink: 1 },
  error: { color: C.danger, fontSize: 13 },
  busy: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 50 },
  input: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: R.ctl,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.card2,
    color: C.text,
    fontSize: 15,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: C.card2,
    color: C.text,
    fontFamily: F.mono,
    fontSize: 12,
  },
  description: {
    padding: 14,
    borderRadius: R.ctl,
    overflow: 'hidden',
    backgroundColor: C.card2,
    color: C.t2,
    fontSize: 14,
    lineHeight: 21,
  },
});
