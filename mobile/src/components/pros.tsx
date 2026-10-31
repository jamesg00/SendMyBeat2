import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import * as api from '@/api/endpoints';
import type { PlanStep, ProCard, StylePlan } from '@/api/endpoints';
import { useRequest } from '@/api/use-request';
import { Button, Card, Meter, useUiStyles } from '@/components/ui';
import { F, R, display, font, makeStyles, useColors } from '@/theme';

// The Pros tab: producers who made it on YouTube, and the plan you copied from one of them.
// Photos and banners are each producer's own YouTube channel art, linked back to the channel.

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
export const openPro = (id: string) => router.push({ pathname: '/pro/[id]', params: { id } });
export const copyPro = (id: string) => router.push({ pathname: '/pro-plan/[id]', params: { id } });

/** Your active plan, refreshed whenever the screen comes into view. */
export function usePlan() {
  const req = useRequest(api.stylePlan);
  const refresh = req.refresh;
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );
  return { plan: req.data?.plan ?? null, setPlan: (plan: StylePlan | null) => req.setData(() => ({ plan })), refresh };
}

// Swipe through the producers; the buttons act on the one in view.
export function ProsGallery() {
  const s = useStyles();
  const C = useColors();
  const ui = useUiStyles();
  const list = useRequest(api.pros);
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const cardW = width - 40 - 28;

  if (list.loading) return <ActivityIndicator color={C.t2} style={{ alignSelf: 'flex-start' }} />;
  if (list.error || !list.data) {
    return (
      <Card>
        <Text style={s.error}>{list.error ?? 'Could not load the pros.'}</Text>
        <Button title="Try again" variant="secondary" size="md" onPress={list.reload} />
      </Card>
    );
  }
  const items = list.data.pros;
  const current = items[Math.min(index, items.length - 1)];

  return (
    <View style={{ gap: 14 }}>
      <View style={s.rowBetween}>
        <Text style={ui.sectionLabel}>Producers who made it on YouTube</Text>
        <Text style={s.mono}>
          {index + 1} / {items.length}
        </Text>
      </View>
      <ScrollView
        horizontal
        snapToInterval={cardW + 12}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -20 }}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
        onMomentumScrollEnd={(e) => setIndex(Math.max(0, Math.round(e.nativeEvent.contentOffset.x / (cardW + 12))))}>
        {items.map((p) => (
          <ProCardView key={p.id} pro={p} width={cardW} />
        ))}
      </ScrollView>
      <View style={s.dots} accessibilityElementsHidden>
        {items.map((p, i) => (
          <View key={p.id} style={[s.dot, i === index && s.dotOn]} />
        ))}
      </View>
      {current ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button title="Open profile" onPress={() => openPro(current.id)} style={{ flex: 1 }} />
          <Button title="Copy style" variant="secondary" onPress={() => copyPro(current.id)} />
        </View>
      ) : null}
    </View>
  );
}

function ProCardView({ pro, width }: { pro: ProCard; width: number }) {
  const s = useStyles();
  return (
    <Pressable
      onPress={() => openPro(pro.id)}
      style={({ pressed }) => [s.card, { width }, pressed && { opacity: 0.85 }]}
      accessibilityRole="button"
      accessibilityLabel={`${pro.name}. ${pro.tagline}`}>
      <ProPhoto pro={pro} height={250} />
      <View style={{ padding: 16, gap: 8 }}>
        <Text style={s.name}>{pro.name}</Text>
        <Text style={s.tagline} numberOfLines={2}>
          {pro.tagline}
        </Text>
        <View style={s.chips}>
          {pro.sound.map((tag) => (
            <Text key={tag} style={s.chip}>
              {tag}
            </Text>
          ))}
          {pro.subscribers ? <Text style={s.chip}>{compact.format(pro.subscribers)} subs</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

/** Their channel banner with the channel picture over it, or a quiet placeholder until it loads. */
export function ProPhoto({ pro, height }: { pro: ProCard; height: number }) {
  const s = useStyles();
  const size = Math.round(height * 0.44);
  return (
    <View style={[s.photoBox, { height }]}>
      {pro.banner ? <Image source={{ uri: pro.banner }} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0.45 }} contentFit="cover" /> : null}
      {pro.photo ? (
        <Image
          source={{ uri: pro.photo }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          contentFit="cover"
          accessibilityLabel={pro.photo_credit ? `${pro.name}, ${pro.photo_credit}` : `${pro.name}’s YouTube channel picture`}
        />
      ) : (
        <Text style={s.mono}>photo from YouTube</Text>
      )}
      {pro.photo_credit ? <Text style={[s.mono, { position: 'absolute', right: 10, bottom: 8, fontSize: 10.5 }]}>{pro.photo_credit}</Text> : null}
      <Text style={s.group}>{pro.group}</Text>
    </View>
  );
}

const describeStep = (step: PlanStep) => (step.target ? `${step.count ?? 0}/${step.target} · from your uploads` : step.done ? 'Done' : 'Tap when done');

// Your plan: the compact card on Workflow, or the full checklist on Profile.
export function PlanCard({ plan, full, onChange }: { plan: StylePlan; full?: boolean; onChange: (plan: StylePlan | null) => void }) {
  const s = useStyles();
  const C = useColors();
  const [busy, setBusy] = useState<string | null>(null);

  const tick = async (step: PlanStep) => {
    if (step.kind !== 'manual' || busy) return;
    setBusy(step.id);
    try {
      onChange((await api.tickPlanStep(step.id, !step.done)).plan);
    } finally {
      setBusy(null);
    }
  };
  const end = async () => {
    await api.endStylePlan();
    onChange(null);
  };

  return (
    <View style={s.plan}>
      <Pressable onPress={() => openPro(plan.pro_id)} style={s.rowBetween} accessibilityRole="button" accessibilityHint="Opens the producer's page">
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.planTitle}>Your plan · {plan.pro_name}’s style</Text>
          <Text style={s.mono}>
            {plan.done} of {plan.total} steps
          </Text>
        </View>
        <Text style={{ color: C.t3, fontSize: 18, ...font() }}>›</Text>
      </Pressable>
      <Meter value={plan.total ? plan.done / plan.total : 0} color={C.acc} />
      {full ? (
        <View>
          {plan.steps.map((step) => (
            <Pressable
              key={step.id}
              onPress={() => void tick(step)}
              disabled={step.kind !== 'manual'}
              style={s.step}
              accessibilityRole={step.kind === 'manual' ? 'checkbox' : undefined}
              accessibilityState={{ checked: step.done }}>
              <Check on={step.done} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[s.stepText, step.done && { color: C.t3 }]}>{step.text}</Text>
                <Text style={s.stepMeta}>
                  {step.move} · {busy === step.id ? 'Saving…' : describeStep(step)}
                </Text>
              </View>
            </Pressable>
          ))}
          <Pressable onPress={() => void end()} style={s.endBtn} accessibilityRole="button">
            <Text style={s.endText}>End this plan</Text>
          </Pressable>
        </View>
      ) : plan.next ? (
        <Text style={s.next}>
          Next: {plan.next.text}
          {plan.next.target ? ` (${plan.next.count ?? 0}/${plan.next.target})` : ''}
        </Text>
      ) : (
        <Text style={s.next}>Every step done. Pick another producer to keep going.</Text>
      )}
    </View>
  );
}

function Check({ on }: { on: boolean }) {
  const s = useStyles();
  const C = useColors();
  return (
    <View style={[s.check, on && { backgroundColor: C.acc, borderColor: C.acc }]}>
      {on ? (
        <Svg width={12} height={12} viewBox="0 0 12 12">
          <Path d="M2 6.5 L5 9 L10 3" stroke={C.onAcc} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((C) => ({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mono: { color: C.t3, fontSize: 12, fontFamily: F.mono },
  error: { color: C.danger, fontSize: 14, ...font() },
  card: { borderRadius: 16, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, overflow: 'hidden' },
  photoBox: { backgroundColor: C.card2, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: C.lineSoft, overflow: 'hidden' },
  group: {
    position: 'absolute',
    left: 12,
    top: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.bg,
    color: C.t2,
    fontSize: 11,
    fontFamily: F.mono,
    overflow: 'hidden',
  },
  name: { color: C.text, fontSize: 24, letterSpacing: -0.4, ...display },
  tagline: { color: C.t2, fontSize: 14, lineHeight: 20, ...font() },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    color: C.t2,
    fontSize: 11.5,
    fontFamily: F.mono,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: R.chip,
    borderWidth: 1,
    borderColor: C.line,
    overflow: 'hidden',
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.wave },
  dotOn: { width: 18, backgroundColor: C.text },
  plan: { gap: 10, padding: 14, borderRadius: R.card, borderWidth: 1, borderColor: C.accLine, backgroundColor: C.card },
  planTitle: { color: C.text, fontSize: 15, ...font('600') },
  next: { color: C.t2, fontSize: 13.5, lineHeight: 19, ...font() },
  step: { flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 56, borderTopWidth: 1, borderTopColor: C.lineSoft, paddingVertical: 8 },
  stepText: { color: C.text, fontSize: 14.5, lineHeight: 20, ...font() },
  stepMeta: { color: C.t3, fontSize: 11.5, fontFamily: F.mono },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: C.t3, alignItems: 'center', justifyContent: 'center' },
  endBtn: { minHeight: 44, justifyContent: 'center', borderTopWidth: 1, borderTopColor: C.lineSoft },
  endText: { color: C.danger, fontSize: 14, ...font('500') },
}));
