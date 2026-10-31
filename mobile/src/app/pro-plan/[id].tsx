import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as api from '@/api/endpoints';
import { useRequest } from '@/api/use-request';
import { Button } from '@/components/ui';
import { F, display, font, makeStyles, useColors } from '@/theme';

// Copy their style: pick the moves that fit you and see your next 14 days; they become your plan
// (shown on Workflow and Profile, with upload steps ticking themselves off). Starting a plan
// replaces the one you had.

const DAY = 24 * 60 * 60 * 1000;

/** Spread `count` uploads evenly over the next 14 days, starting today. */
function uploadDays(count: number): Set<number> {
  const days = new Set<number>();
  for (let i = 0; i < Math.min(count, 14); i++) days.add(Math.floor((i * 14) / count));
  return days;
}

export default function CopyStyleScreen() {
  const { id, moves } = useLocalSearchParams<{ id: string; moves?: string }>();
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
  // Moves picked on the previous screen start ticked; otherwise the first two.
  const preset = (moves ?? '').split(',').filter((m) => p.moves.some((x) => x.id === m));
  const chosen = picked ?? (preset.length ? preset : p.moves.slice(0, 2).map((m) => m.id));
  const toggle = (moveId: string) => setPicked(chosen.includes(moveId) ? chosen.filter((x) => x !== moveId) : [...chosen, moveId]);
  const picks = p.moves.filter((m) => chosen.includes(m.id));
  const steps = picks.flatMap((m) => m.steps);
  const uploads = Math.max(0, ...picks.map((m) => m.uploads));
  const onDays = uploadDays(uploads);
  const today = new Date();
  const first = new Date(today.getTime() - ((today.getDay() + 6) % 7) * DAY); // Monday of this week
  const offset = (today.getDay() + 6) % 7;

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
          <Text style={s.title}>
            Your 14 days,{'\n'}
            {p.name}’s way
          </Text>
          <Text style={s.sub}>Pick the moves. We fill your calendar.</Text>
        </View>

        <View style={s.chips} accessibilityRole="list">
          {p.moves.map((m) => {
            const on = chosen.includes(m.id);
            return (
              <Pressable
                key={m.id}
                onPress={() => toggle(m.id)}
                style={[s.chip, on && { borderColor: C.acc, backgroundColor: C.accSoft }]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityHint={m.body}>
                <Text style={[s.chipText, on && { color: C.acc, ...font('600') }]}>{m.title}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={s.panel}>
          <View style={s.rowBetween}>
            <Text style={s.label}>Your next 14 days</Text>
            <Text style={s.mono}>{uploads ? `${uploads} uploads` : 'no upload target'}</Text>
          </View>
          <View style={s.week}>
            {'MTWTFSS'.split('').map((d, i) => (
              <Text key={i} style={[s.mono, { flex: 1, textAlign: 'center' }]}>
                {d}
              </Text>
            ))}
          </View>
          {[0, 1, 2].map((w) => (
            <View key={w} style={s.week}>
              {Array.from({ length: 7 }, (_, d) => {
                const day = w * 7 + d - offset; // days from today
                const inRange = day >= 0 && day < 14;
                const on = inRange && onDays.has(day);
                const date = new Date(first.getTime() + (w * 7 + d) * DAY);
                return (
                  <View
                    key={d}
                    style={[s.day, !inRange && { opacity: 0.25 }, on && { backgroundColor: day < 7 ? C.acc : C.accLine }]}
                    accessibilityLabel={on ? `Upload on ${date.toDateString()}` : undefined}>
                    <Text style={[s.dayNum, on && { color: day < 7 ? C.onAcc : C.text }]}>{on ? '↑' : date.getDate()}</Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {steps.length ? (
          <View style={s.first}>
            <Text style={s.kicker}>YOUR PLAN · {steps.length} STEPS</Text>
            {steps.map((step, i) => (
              <Text key={step} style={s.step}>
                {i + 1}. {step}
              </Text>
            ))}
            <Text style={s.fine}>Upload steps tick themselves off from your SendMyBeat uploads.</Text>
          </View>
        ) : (
          <Text style={s.sub}>Pick at least one move.</Text>
        )}

        {error ? <Text style={{ color: C.danger, fontSize: 14, ...font() }}>{error}</Text> : null}
        <Button title={busy ? 'Starting…' : 'Start my 14 days'} onPress={chosen.length ? () => void start() : undefined} />
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
  title: { color: C.text, fontSize: 30, lineHeight: 34, letterSpacing: -0.8, ...display },
  sub: { color: C.t2, fontSize: 14.5, lineHeight: 21, ...font() },
  label: { color: C.t2, fontSize: 13, ...font('500') },
  fine: { color: C.t3, fontSize: 12, ...font() },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 38, paddingHorizontal: 14, borderRadius: 19, justifyContent: 'center', borderWidth: 1, borderColor: C.line },
  chipText: { color: C.text, fontSize: 13.5, ...font('500') },
  panel: { padding: 14, gap: 8, borderRadius: 16, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  week: { flexDirection: 'row', gap: 6 },
  day: { flex: 1, aspectRatio: 1, borderRadius: 8, backgroundColor: C.card2, alignItems: 'center', justifyContent: 'center' },
  dayNum: { color: C.t3, fontSize: 11.5, fontFamily: F.mono },
  first: { padding: 16, gap: 8, borderRadius: 16, borderWidth: 1, borderColor: C.accLine, backgroundColor: C.accSoft },
  kicker: { color: C.acc, fontSize: 11, letterSpacing: 0.4, fontFamily: F.monoMedium },
  step: { color: C.text, fontSize: 14, lineHeight: 20, ...font() },
  mono: { color: C.t3, fontSize: 12, fontFamily: F.mono },
}));
