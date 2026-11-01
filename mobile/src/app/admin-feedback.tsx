import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/api/auth';
import * as api from '@/api/endpoints';
import { FEEDBACK_STATUS_LABEL, type FeedbackItem, type FeedbackStatus } from '@/api/endpoints';
import { useRequest } from '@/api/use-request';
import { Button, Segmented } from '@/components/ui';
import { F, R, display, font, makeStyles, useColors } from '@/theme';

// Admins only: bug reports and feature ideas from producers, newest first.

type Filter = 'open' | 'fixed' | 'closed';
const IN_FILTER: Record<Filter, FeedbackStatus[]> = { open: ['new', 'planned'], fixed: ['fixed'], closed: ['closed'] };

export default function AdminFeedbackScreen() {
  const s = useStyles();
  const C = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const list = useRequest(api.allFeedback);
  const [filter, setFilter] = useState<Filter>('open');

  if (!user?.is_admin) {
    return (
      <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={s.sub}>Only admins can read feedback.</Text>
      </View>
    );
  }

  const all = list.data?.items ?? [];
  const shown = all.filter((f) => IN_FILTER[filter].includes(f.status));
  const count = (f: Filter) => all.filter((x) => IN_FILTER[f].includes(x.status)).length;
  const setStatus = (id: string, status: FeedbackStatus) =>
    list.setData((cur) => ({ items: (cur?.items ?? []).map((x) => (x.id === id ? { ...x, status } : x)) }));

  return (
    <View style={s.root}>
      <View style={s.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button">
          <Text style={s.topAction}>Close</Text>
        </Pressable>
        <Text style={s.topTitle}>Admin · Feedback</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40, gap: 12 }}>
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'open', label: `Open ${count('open')}` },
            { value: 'fixed', label: `Fixed ${count('fixed')}` },
            { value: 'closed', label: `Closed ${count('closed')}` },
          ]}
        />
        {list.loading && !list.data ? <ActivityIndicator color={C.t2} style={{ alignSelf: 'flex-start' }} /> : null}
        {list.error ? <Text style={s.error}>{list.error}</Text> : null}
        {list.data && !shown.length ? <Text style={s.sub}>Nothing here.</Text> : null}
        {shown.map((f) => (
          <Report key={f.id} item={f} onStatus={(status) => setStatus(f.id, status)} />
        ))}
      </ScrollView>
    </View>
  );
}

function Report({ item, onStatus }: { item: FeedbackItem; onStatus: (s: FeedbackStatus) => void }) {
  const s = useStyles();
  const C = useColors();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const move = async (status: FeedbackStatus) => {
    setBusy(true);
    setError(null);
    try {
      await api.updateFeedback(item.id, status);
      onStatus(status);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save that.');
    } finally {
      setBusy(false);
    }
  };

  const meta = [item.screen, item.device, item.app_version && `v${item.app_version}`].filter(Boolean).join(' · ');
  return (
    <View style={s.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={[s.kind, item.kind === 'bug' ? { color: C.danger, borderColor: C.danger } : { color: C.acc, borderColor: C.accLine }]}>
          {item.kind === 'bug' ? 'BUG' : 'IDEA'}
        </Text>
        <Text style={s.name}>{item.username ?? 'Someone'}</Text>
        <Text style={[s.mono, { marginLeft: 'auto' }]}>{item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}</Text>
      </View>
      <Text style={s.message} selectable>
        {item.message}
      </Text>
      {meta ? <Text style={s.mono}>{meta}</Text> : null}
      {error ? <Text style={s.error}>{error}</Text> : null}
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <Text style={[s.mono, { flex: 1 }]}>{FEEDBACK_STATUS_LABEL[item.status]}</Text>
        {item.status === 'new' ? <Button title="Planned" size="sm" variant="secondary" onPress={busy ? undefined : () => void move('planned')} /> : null}
        {item.status !== 'fixed' ? <Button title="Fixed" size="sm" variant="secondary" onPress={busy ? undefined : () => void move('fixed')} /> : null}
        {item.status !== 'closed' ? (
          <Button title="Close" size="sm" variant="secondary" onPress={busy ? undefined : () => void move('closed')} />
        ) : (
          <Button title="Reopen" size="sm" variant="secondary" onPress={busy ? undefined : () => void move('new')} />
        )}
      </View>
    </View>
  );
}

const useStyles = makeStyles((C) => ({
  root: { flex: 1, backgroundColor: C.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
  topAction: { color: C.t2, fontSize: 16, width: 60, ...font() },
  topTitle: { color: C.text, fontSize: 16, ...font('600') },
  card: { padding: 14, gap: 10, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  kind: { fontSize: 10.5, letterSpacing: 0.4, fontFamily: F.monoMedium, paddingHorizontal: 6, paddingVertical: 2, borderRadius: R.chip, borderWidth: 1, overflow: 'hidden' },
  name: { color: C.text, fontSize: 15, ...display },
  message: { color: C.text, fontSize: 14.5, lineHeight: 21, ...font() },
  mono: { color: C.t3, fontSize: 12, fontFamily: F.mono },
  sub: { color: C.t2, fontSize: 13.5, lineHeight: 19, ...font() },
  error: { color: C.danger, fontSize: 13, ...font() },
}));
