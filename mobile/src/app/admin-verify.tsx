import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/api/auth';
import * as api from '@/api/endpoints';
import type { VerificationApplication } from '@/api/endpoints';
import { useRequest } from '@/api/use-request';
import { Avatar, openWebLink } from '@/components/producer';
import { Button, confirmAction } from '@/components/ui';
import { F, display, font, makeStyles, useColors } from '@/theme';

// Admins only: verification requests waiting for review. Approving a claim from the Pros list
// also links that Pros page to the producer's profile.

export default function AdminVerifyScreen() {
  const s = useStyles();
  const C = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const list = useRequest(api.pendingVerifications);

  if (!user?.is_admin) {
    return (
      <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={s.sub}>Only admins can review verification.</Text>
      </View>
    );
  }

  const apps = list.data?.applications ?? [];
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
        {list.loading && !list.data ? <ActivityIndicator color={C.t2} style={{ alignSelf: 'flex-start' }} /> : null}
        {list.error ? <Text style={s.error}>{list.error}</Text> : null}
        {list.data && !apps.length ? <Text style={s.sub}>No requests waiting.</Text> : null}
        {apps.map((a) => (
          <Request key={a.user_id} app={a} onDone={() => list.setData((cur) => ({ applications: (cur?.applications ?? []).filter((x) => x.user_id !== a.user_id) }))} />
        ))}
      </ScrollView>
    </View>
  );
}

function Request({ app, onDone }: { app: VerificationApplication; onDone: () => void }) {
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
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save that.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.card}>
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
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button title="Approve" size="sm" onPress={busy ? undefined : () => void review('approve')} />
        <Button
          title="Reject"
          size="sm"
          variant="secondary"
          onPress={busy ? undefined : () => confirmAction('Reject this request?', 'They can send a new one later.', 'Reject', () => void review('reject'))}
        />
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
  name: { color: C.text, fontSize: 16, ...display },
  mono: { color: C.t3, fontSize: 12, fontFamily: F.mono },
  claim: { color: C.acc, fontSize: 13, ...font('600') },
  link: { color: C.text, fontSize: 13, textDecorationLine: 'underline', ...font() },
  sub: { color: C.t2, fontSize: 13.5, lineHeight: 19, ...font() },
  error: { color: C.danger, fontSize: 13, ...font() },
}));
