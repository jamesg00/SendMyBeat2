import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import * as api from '@/api/endpoints';
import { useRequest } from '@/api/use-request';
import { Button } from '@/components/ui';
import { F, R, display, font, makeStyles, useColors } from '@/theme';

// Copy their style: pick the moves that fit you; they become your plan (shown on Workflow and
// Profile, with upload steps ticking themselves off). Starting a plan replaces the one you had.
export default function CopyStyleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useStyles();
  const C = useColors();
  const insets = useSafeAreaInsets();
  const pro = useRequest(() => api.pro(id));
  const [picked, setPicked] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!pro.data) {
    return (
      <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}>
        {pro.error ? <Text style={s.sub}>{pro.error}</Text> : <ActivityIndicator color={C.t2} />}
      </View>
    );
  }
  const p = pro.data;
  // The first two moves start ticked.
  const chosen = picked ?? p.moves.slice(0, 2).map((m) => m.id);
  const toggle = (moveId: string) => setPicked(chosen.includes(moveId) ? chosen.filter((x) => x !== moveId) : [...chosen, moveId]);
  const steps = p.moves.filter((m) => chosen.includes(m.id)).flatMap((m) => m.steps);

  const start = async () => {
    if (!chosen.length || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.createStylePlan(p.id, chosen);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the plan.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.root}>
      <View style={s.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ minHeight: 44, justifyContent: 'center' }} accessibilityRole="button">
          <Text style={s.cancel}>Cancel</Text>
        </Pressable>
        <Text style={s.topTitle}>Copy their style</Text>
        <View style={{ width: 52 }} />
      </View>
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 24 }]}>
        <View style={{ gap: 4 }}>
          <Text style={s.title}>{p.name}’s moves</Text>
          <Text style={s.sub}>Pick what fits you. They become steps on Workflow and Profile.</Text>
        </View>

        <View style={s.list} accessibilityRole="list">
          {p.moves.map((m, i) => {
            const on = chosen.includes(m.id);
            return (
              <Pressable
                key={m.id}
                onPress={() => toggle(m.id)}
                style={[s.item, i < p.moves.length - 1 && s.itemDivider]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}>
                <View style={[s.check, on && { backgroundColor: C.acc, borderColor: C.acc }]}>
                  {on ? (
                    <Svg width={12} height={12} viewBox="0 0 12 12">
                      <Path d="M2 6.5 L5 9 L10 3" stroke={C.onAcc} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                  ) : null}
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={s.itemTitle}>{m.title}</Text>
                  <Text style={s.itemBody}>{m.body}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={{ gap: 8 }}>
          <Text style={s.label}>Your plan</Text>
          <View style={s.preview}>
            {steps.length ? (
              steps.map((step, i) => (
                <Text key={step} style={s.step}>
                  {i + 1}. {step}
                </Text>
              ))
            ) : (
              <Text style={s.sub}>Pick at least one move.</Text>
            )}
          </View>
          <Text style={s.fine}>Upload steps tick themselves off from your SendMyBeat uploads.</Text>
        </View>

        {error ? <Text style={{ color: C.danger, fontSize: 14, ...font() }}>{error}</Text> : null}
        <Button title={busy ? 'Starting…' : 'Start my plan'} onPress={chosen.length ? () => void start() : undefined} />
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((C) => ({
  root: { flex: 1, backgroundColor: C.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12 },
  cancel: { color: C.t2, fontSize: 16, ...font() },
  topTitle: { color: C.text, fontSize: 17, ...display },
  content: { paddingHorizontal: 20, paddingTop: 16, gap: 20 },
  title: { color: C.text, fontSize: 24, letterSpacing: -0.4, ...display },
  sub: { color: C.t2, fontSize: 14.5, lineHeight: 21, ...font() },
  label: { color: C.t2, fontSize: 13, ...font('500') },
  fine: { color: C.t3, fontSize: 12, ...font() },
  list: { borderRadius: R.card, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 60 },
  itemDivider: { borderBottomWidth: 1, borderBottomColor: C.lineSoft },
  itemTitle: { color: C.text, fontSize: 15, ...font('500') },
  itemBody: { color: C.t3, fontSize: 12.5, lineHeight: 17, ...font() },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: C.t3, alignItems: 'center', justifyContent: 'center' },
  preview: { padding: 14, gap: 10, borderRadius: R.card, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  step: { color: C.text, fontSize: 14, lineHeight: 20, ...font() },
  mono: { color: C.t3, fontSize: 12, fontFamily: F.mono },
}));
