import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/api/auth';
import * as api from '@/api/endpoints';
import type { VerificationApplication } from '@/api/endpoints';
import { useRequest } from '@/api/use-request';
import { Avatar, openWebLink } from '@/components/producer';
import { Button, confirmAction, Segmented, TopLight } from '@/components/ui';
import { F, display, font, makeStyles, useColors } from '@/theme';

// Admins only: verification requests, waiting or already decided. Approving a claim from the
// Pros list also links that Pros page to the producer's profile.

type Filter = 'pending' | 'approved' | 'rejected';
const statusOf = (a: VerificationApplication): Filter => a.verification_status ?? 'pending';

export default function AdminVerifyScreen() {
  const s = useStyles();
  const C = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const list = useRequest(api.allVerifications);
  const [filter, setFilter] = useState<Filter>('pending');

  if (!user?.is_admin) {
    return (
      <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={s.sub}>Only admins can review verification.</Text>
      </View>
    );
  }

  const all = list.data?.applications ?? [];
  const apps = all.filter((a) => statusOf(a) === filter);
  const count = (f: Filter) => all.filter((a) => statusOf(a) === f).length;
  const decided = (userId: string, status: Filter) =>
    list.setData((cur) => ({
      applications: (cur?.applications ?? []).map((x) => (x.user_id === userId ? { ...x, verification_status: status } : x)),
    }));
  return (
    <View style={s.root}>
      <View style={s.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button">
          <Text style={s.topAction}>Close</Text>
        </Pressable>
        <Text style={s.topTitle}>Admin · Verification</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40, gap: 12 }}>
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'pending', label: `Waiting ${count('pending')}` },
            { value: 'approved', label: `Approved ${count('approved')}` },
            { value: 'rejected', label: `Rejected ${count('rejected')}` },
          ]}
        />
        {list.loading && !list.data ? <ActivityIndicator color={C.t2} style={{ alignSelf: 'flex-start' }} /> : null}
        {list.error ? <Text style={s.error}>{list.error}</Text> : null}
        {list.data && !apps.length ? <Text style={s.sub}>{filter === 'pending' ? 'No requests waiting.' : 'Nothing here yet.'}</Text> : null}
        {apps.map((a) => (
          <Request key={a.user_id} app={a} onDone={(status) => decided(a.user_id, status)} />
        ))}
      </ScrollView>
    </View>
  );
}

function Request({ app, onDone }: { app: VerificationApplication; onDone: (status: Filter) => void }) {
  const s = useStyles();
  const C = useColors();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const a = app.verification_application ?? {};

  const review = async (action: 'approve' | 'reject') => {
    setBusy(true);
    setError(null);
    try {
      await api.reviewVerification(app.user_id, action);
      onDone(action === 'approve' ? 'approved' : 'rejected');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save that.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.card}>
      <TopLight />
      <Pressable
        onPress={() => router.push({ pathname: '/producer/[id]', params: { id: app.user_id } })}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
        accessibilityRole="button">
        <Avatar producer={{ user_id: app.user_id, username: app.username ?? '', avatar_url: app.avatar_url }} size={40} />
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{a.stage_name || app.username}</Text>
          <Text style={s.mono}>@{app.username}</Text>
        </View>
      </Pressable>
      {app.pro_name ? <Text style={s.claim}>Claims the Pros profile for {app.pro_name}</Text> : null}
      {a.main_platform_url ? (
        <Pressable onPress={() => openWebLink(a.main_platform_url!)} accessibilityRole="link">
          <Text style={s.link} numberOfLines={1}>
            {a.main_platform_url} ↗
          </Text>
        </Pressable>
      ) : null}
      {a.notable_work ? <Text style={s.sub}>{a.notable_work}</Text> : null}
      {a.reason ? <Text style={[s.sub, { color: C.text }]}>{a.reason}</Text> : null}
      {error ? <Text style={s.error}>{error}</Text> : null}
      {statusOf(app) !== 'pending' ? (
        <Text style={s.mono}>
          {statusOf(app) === 'approved' ? 'Approved' : 'Rejected'}
          {app.verification_note ? ` · ${app.verification_note}` : ''}
        </Text>
      ) : null}
      {statusOf(app) === 'pending' ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button title="Approve" size="sm" onPress={busy ? undefined : () => void review('approve')} />
          <Button
            title="Reject"
            size="sm"
            variant="secondary"
            onPress={busy ? undefined : () => confirmAction('Reject this request?', 'They can send a new one later.', 'Reject', () => void review('reject'))}
          />
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((C) => ({
  root: { flex: 1, backgroundColor: C.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
  topAction: { color: C.t2, fontSize: 16, width: 60, ...font() },
  topTitle: { color: C.text, fontSize: 16, ...font('600') },
  card: { padding: 14, gap: 10, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  name: { color: C.text, fontSize: 16, ...display },
  mono: { color: C.t3, fontSize: 12, fontFamily: F.mono },
  claim: { color: C.acc, fontSize: 13, ...font('600') },
  link: { color: C.text, fontSize: 13, textDecorationLine: 'underline', ...font() },
  sub: { color: C.t2, fontSize: 13.5, lineHeight: 19, ...font() },
  error: { color: C.danger, fontSize: 13, ...font() },
}));
