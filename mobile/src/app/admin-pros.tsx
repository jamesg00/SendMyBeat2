import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/api/auth';
import * as api from '@/api/endpoints';
import type { ProCard } from '@/api/endpoints';
import { useRequest } from '@/api/use-request';
import { Button } from '@/components/ui';
import { F, R, display, font, makeStyles, useColors } from '@/theme';

// Admins only: set a producer's press photo (used with permission) and credit, or pin their YouTube
// channel. Kept off the producer pages so nobody else ever sees it.

export default function AdminProsScreen() {
  const s = useStyles();
  const C = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const list = useRequest(api.pros);
  const [open, setOpen] = useState<string | null>(null);

  if (!user?.is_admin) {
    return (
      <View style={[s.root, s.center]}>
        <Text style={s.sub}>Only admins can edit producers.</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <View style={[s.topBar, { paddingTop: 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button">
          <Text style={s.topAction}>Close</Text>
        </Pressable>
        <Text style={s.topTitle}>Admin · Pros</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40, gap: 12 }} keyboardShouldPersistTaps="handled">
        <Text style={s.fine}>Only use a photo the producer or their team gave permission for, and credit it.</Text>
        {list.loading && !list.data ? <ActivityIndicator color={C.t2} style={{ alignSelf: 'flex-start' }} /> : null}
        {list.error ? <Text style={s.error}>{list.error}</Text> : null}
        {(list.data?.pros ?? []).map((p) => (
          <View key={p.id} style={s.card}>
            <Pressable onPress={() => setOpen(open === p.id ? null : p.id)} style={s.cardHead} accessibilityRole="button" accessibilityState={{ expanded: open === p.id }}>
              {p.photo ? <Image source={{ uri: p.photo }} style={s.photo} contentFit="cover" /> : <View style={s.photo} />}
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={s.name}>{p.name}</Text>
                <Text style={s.mono} numberOfLines={1}>
                  {p.photo_source === 'press' ? `Press photo · ${p.photo_credit ?? 'no credit'}` : `Photo from ${p.photo_source ?? 'nowhere yet'}`}
                </Text>
                <Text style={s.mono} numberOfLines={1}>
                  {p.channel_title ?? 'No channel'} · {p.channel_url.replace('https://www.youtube.com/', '')}
                </Text>
              </View>
              <Text style={{ color: C.t3, fontSize: 18, ...font() }}>{open === p.id ? '⌄' : '›'}</Text>
            </Pressable>
            {open === p.id ? <ProForm p={p} onSaved={list.reload} /> : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function ProForm({ p, onSaved }: { p: ProCard; onSaved: () => void }) {
  const s = useStyles();
  const C = useColors();
  const [photo, setPhoto] = useState(p.photo_source === 'press' ? (p.photo ?? '') : '');
  const [credit, setCredit] = useState(p.photo_credit ?? '');
  const [channel, setChannel] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      // An empty photo or credit clears it; the channel is only sent when you type one.
      const body: { photo?: string; photo_credit?: string; channel_id?: string } = { photo: photo.trim(), photo_credit: credit.trim() };
      if (channel.trim()) body.channel_id = channel.trim();
      await api.updatePro(p.id, body);
      setMsg('Saved.');
      onSaved();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: 10 }}>
      <TextInput style={s.input} value={photo} onChangeText={setPhoto} placeholder="Press photo https:// link" placeholderTextColor={C.t3} autoCapitalize="none" autoCorrect={false} keyboardType="url" accessibilityLabel="Press photo link" />
      <TextInput style={s.input} value={credit} onChangeText={setCredit} placeholder="Credit, e.g. Photo: Jane Doe" placeholderTextColor={C.t3} accessibilityLabel="Photo credit" />
      <TextInput style={s.input} value={channel} onChangeText={setChannel} placeholder="Pin YouTube channel id (UC…)" placeholderTextColor={C.t3} autoCapitalize="none" autoCorrect={false} accessibilityLabel="YouTube channel id" />
      {msg ? <Text style={s.fine}>{msg}</Text> : null}
      <Button title={busy ? 'Saving…' : 'Save'} size="md" onPress={busy ? undefined : () => void save()} />
    </View>
  );
}

const useStyles = makeStyles((C) => ({
  root: { flex: 1, backgroundColor: C.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  topAction: { color: C.t2, fontSize: 16, width: 60, ...font() },
  topTitle: { color: C.text, fontSize: 16, ...font('600') },
  card: { padding: 14, gap: 12, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  photo: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.card2 },
  name: { color: C.text, fontSize: 16, ...display },
  mono: { color: C.t3, fontSize: 11.5, fontFamily: F.mono },
  sub: { color: C.t2, fontSize: 14, ...font() },
  fine: { color: C.t3, fontSize: 12, lineHeight: 17, ...font() },
  error: { color: C.danger, fontSize: 13, ...font() },
  input: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: R.ctl,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.bg,
    color: C.text,
    fontSize: 14,
    ...font(),
  },
}));
