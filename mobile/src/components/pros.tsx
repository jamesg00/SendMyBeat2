import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { type ReactNode, useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import * as api from '@/api/endpoints';
import type { PlanStep, ProCard, StylePlan } from '@/api/endpoints';
import { useRequest } from '@/api/use-request';
import { Button, Card, Meter, useUiStyles } from '@/components/ui';
import { F, display, font, makeStyles, useColors } from '@/theme';

// The Pros tab: producers who made it on YouTube, and the plan you copied from one of them.
// Pictures: a press photo used with permission (credited), else their YouTube channel picture,
// else the still from their most-viewed upload.

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
export const openPro = (id: string) => router.push({ pathname: '/pro/[id]', params: { id } });
/** Open Copy their style, optionally with some moves already picked. */
export const copyPro = (id: string, moves?: string[]) =>
  router.push({ pathname: '/pro-plan/[id]', params: moves?.length ? { id, moves: moves.join(',') } : { id } });

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

// Pros home: a deck of tilted producer cards you swipe through, then who's closest to your style.
export function ProsGallery() {
  const s = useStyles();
  const C = useColors();
  const ui = useUiStyles();
  const list = useRequest(api.pros);
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const cardW = width - 40 - 24;
  const step = cardW + 12;
  const x = useSharedValue(0);
  const shown = useSharedValue(0);
  // The dots follow x frame by frame; the card's buttons switch as soon as a card is mostly in view.
  const onScroll = useAnimatedScrollHandler((e) => {
    x.value = e.contentOffset.x;
    const i = Math.max(0, Math.round(e.contentOffset.x / step));
    if (i !== shown.value) {
      shown.value = i;
      scheduleOnRN(setIndex, i);
    }
  });

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
  const closest = items.filter((p) => p.match != null).sort((a, b) => (b.match ?? 0) - (a.match ?? 0));

  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 4 }}>
        <Text style={s.kicker}>PROS · {items.length} PRODUCERS</Text>
        <Text style={s.headline} accessibilityRole="header">
          They blew up on YouTube.
        </Text>
        <Text style={s.tagline}>See why, read their numbers, and copy the moves into your own uploads.</Text>
      </View>
      <Animated.ScrollView
        horizontal
        snapToInterval={step}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={{ marginHorizontal: -20 }}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingVertical: 8 }}>
        {items.map((p, i) => (
          <DeckCard key={p.id} pro={p} width={cardW} index={i} step={step} x={x} />
        ))}
      </Animated.ScrollView>
      <View style={s.dots} accessibilityElementsHidden>
        {items.map((p, i) => (
          <DeckDot key={p.id} index={i} step={step} x={x} />
        ))}
      </View>
      {current ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button title={`Why ${current.name} blew up`} onPress={() => openPro(current.id)} style={{ flex: 1 }} />
          <Button title="Copy style" variant="secondary" onPress={() => copyPro(current.id)} />
        </View>
      ) : null}

      {closest.length ? (
        <View>
          <Text style={[ui.sectionLabel, { paddingBottom: 8 }]}>Closest to your style</Text>
          {closest.map((p, i) => (
            <Pressable
              key={p.id}
              onPress={() => openPro(p.id)}
              style={({ pressed }) => [s.matchRow, i === closest.length - 1 && s.matchLast, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel={`${p.name}, ${p.match}% match`}>
              {p.photo ? <Image source={{ uri: p.photo }} style={s.avatar} contentFit="cover" /> : <View style={s.avatar} />}
              <Text style={s.matchName}>{p.name}</Text>
              <View style={s.matchBar}>
                <View style={{ width: `${p.match ?? 0}%`, height: 4, borderRadius: 2, backgroundColor: C.acc }} />
              </View>
              <Text style={s.matchPct}>{p.match}%</Text>
            </Pressable>
          ))}
          <Text style={[s.fine, { paddingTop: 8 }]}>From your SendMyBeat uploads vs their last 50.</Text>
        </View>
      ) : null}
    </View>
  );
}

// One card in the deck: the cards beside the one in view lean back and shrink a little.
// One page dot: it stretches and darkens as its card slides into view, in step with your finger.
function DeckDot({ index, step, x }: { index: number; step: number; x: SharedValue<number> }) {
  const s = useStyles();
  const C = useColors();
  const style = useAnimatedStyle(() => {
    const near = interpolate(Math.abs(x.value / step - index), [0, 1], [1, 0], Extrapolation.CLAMP);
    return { width: 6 + near * 12, backgroundColor: interpolateColor(near, [0, 1], [C.wave, C.text]) };
  });
  return <Animated.View style={[s.dot, style]} />;
}

function DeckCard({ pro, width, index, step, x }: { pro: ProCard; width: number; index: number; step: number; x: SharedValue<number> }) {
  const s = useStyles();
  const C = useColors();
  const tilt = useAnimatedStyle(() => {
    const d = (x.value - index * step) / step;
    return {
      transform: [
        { scale: interpolate(d, [-1, 0, 1], [0.92, 1, 0.92], Extrapolation.CLAMP) },
        { rotateZ: `${interpolate(d, [-1, 0, 1], [4, 0, -4], Extrapolation.CLAMP)}deg` },
      ],
      opacity: interpolate(Math.abs(d), [0, 1], [1, 0.6], Extrapolation.CLAMP),
    };
  });
  return (
    <Animated.View style={[{ width }, tilt]}>
      <Pressable
        onPress={() => openPro(pro.id)}
        style={({ pressed }) => [s.deckCard, pressed && { opacity: 0.9 }]}
        accessibilityRole="button"
        accessibilityLabel={`${pro.name}. ${pro.why ?? pro.tagline}`}>
        <ProHero pro={pro} height={440}>
          <Text style={s.deckName} numberOfLines={1} adjustsFontSizeToFit>
            {pro.name}
          </Text>
          <Text style={s.deckWhy} numberOfLines={3}>
            {pro.why ?? pro.tagline}
          </Text>
          <View style={s.stats}>
            <Stat value={pro.subscribers ? compact.format(pro.subscribers) : '–'} label="subscribers" />
            <Stat value={pro.match != null ? `${pro.match}%` : '–'} label="your match" accent />
            <Stat value={pro.sound[0] ?? '–'} label="known for" />
          </View>
        </ProHero>
      </Pressable>
      <View style={[s.edge, { borderColor: C.line }]} pointerEvents="none" />
    </Animated.View>
  );
}

function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  const s = useStyles();
  const C = useColors();
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={[s.statValue, accent && { color: C.acc }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

/** Full-bleed producer picture fading into the page, with whatever sits on the fade as children. */
export function ProHero({ pro, height, children }: { pro: ProCard; height: number; children?: ReactNode }) {
  const s = useStyles();
  const C = useColors();
  const credit = pro.photo_source === 'press' ? (pro.photo_credit ?? 'Press photo') : pro.photo_source === 'youtube' ? 'YouTube channel' : pro.photo_source === 'video' ? 'From their top upload' : null;
  return (
    <View style={[s.hero, { height }]}>
      {pro.photo ? (
        <Image
          source={{ uri: pro.photo }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          contentPosition="top"
          transition={200}
          accessibilityLabel={pro.photo_source === 'press' ? `${pro.name}, ${credit}` : `${pro.name}’s picture from YouTube`}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={s.monogram}>{pro.name.slice(0, 1)}</Text>
        </View>
      )}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={C.bg} stopOpacity={0.35} />
            <Stop offset="0.35" stopColor={C.bg} stopOpacity={0} />
            <Stop offset="0.55" stopColor={C.bg} stopOpacity={0.15} />
            <Stop offset="1" stopColor={C.bg} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#scrim)" />
      </Svg>
      <View style={s.heroChips}>
        <Text style={s.heroChip}>{pro.group}</Text>
        {credit ? <Text style={s.heroChip}>{credit}</Text> : null}
      </View>
      {children ? <View style={s.heroBottom}>{children}</View> : null}
    </View>
  );
}

/** A ring that fills to `value` (0-1) with a label in the middle. */
export function Ring({ value, size, stroke, label, sub }: { value: number; size: number; stroke: number; label: string; sub?: string }) {
  const C = useColors();
  const r = (size - stroke) / 2;
  const len = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={sub ? `${label} ${sub}` : label}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.lineSoft} strokeWidth={stroke} fill="none" />
        {value > 0 ? (
          <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={C.acc}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${Math.min(1, value) * len} ${len}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </Svg>
      <Text style={{ color: C.text, fontSize: size * 0.24, ...display }}>{label}</Text>
      {sub ? <Text style={{ color: C.t3, fontSize: Math.max(10, size * 0.1), fontFamily: F.mono }}>{sub}</Text> : null}
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
      <Pressable
        onPress={() => openPro(plan.pro_id)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}
        accessibilityRole="button"
        accessibilityHint="Opens the producer's page">
        <Ring value={plan.total ? plan.done / plan.total : 0} size={56} stroke={6} label={`${plan.done}/${plan.total}`} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.kicker}>YOUR PLAN · {plan.pro_name.toUpperCase()}’S STYLE</Text>
          <Text style={s.planTitle} numberOfLines={2}>
            {plan.next ? plan.next.text : 'Every step done'}
          </Text>
        </View>
        <Text style={{ color: C.t3, fontSize: 18, ...font() }}>›</Text>
      </Pressable>
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
        plan.next.target ? (
          <View style={{ gap: 6 }}>
            <Meter value={(plan.next.count ?? 0) / plan.next.target} color={C.acc} height={3} />
            <Text style={s.next}>
              {plan.next.count ?? 0} of {plan.next.target} so far · ticks off from your uploads
            </Text>
          </View>
        ) : (
          <Text style={s.next}>Tap the plan to tick this off when it’s done.</Text>
        )
      ) : (
        <Text style={s.next}>Pick another producer to keep going.</Text>
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
  fine: { color: C.t3, fontSize: 12, ...font() },
  kicker: { color: C.acc, fontSize: 11, letterSpacing: 0.4, fontFamily: F.monoMedium },
  headline: { color: C.text, fontSize: 34, lineHeight: 38, letterSpacing: -0.8, ...display },
  tagline: { color: C.t2, fontSize: 14, lineHeight: 20, ...font() },
  deckCard: { borderRadius: 24, backgroundColor: C.card2, overflow: 'hidden' },
  edge: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: 24, borderWidth: 1 },
  deckName: { color: C.text, fontSize: 44, lineHeight: 48, letterSpacing: -1.4, ...display },
  deckWhy: { color: C.text, fontSize: 15, lineHeight: 21, opacity: 0.9, ...font('500') },
  stats: { flexDirection: 'row', gap: 10, paddingTop: 10, marginTop: 4, borderTopWidth: 1, borderTopColor: C.line },
  statValue: { color: C.text, fontSize: 17, ...display },
  statLabel: { color: C.t3, fontSize: 10.5, fontFamily: F.mono },
  hero: { backgroundColor: C.card2, overflow: 'hidden' },
  heroChips: { position: 'absolute', left: 14, right: 64, top: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  heroChip: {
    color: C.text,
    fontSize: 10.5,
    fontFamily: F.mono,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: C.bg,
    opacity: 0.85,
    overflow: 'hidden',
  },
  heroBottom: { position: 'absolute', left: 18, right: 18, bottom: 18, gap: 6 },
  monogram: { color: C.t3, fontSize: 120, ...display },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.card2 },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, borderTopWidth: 1, borderTopColor: C.lineSoft },
  matchLast: { borderBottomWidth: 1, borderBottomColor: C.lineSoft },
  matchName: { width: 110, color: C.text, fontSize: 14.5, ...font('500') },
  matchBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: C.lineSoft },
  matchPct: { width: 40, textAlign: 'right', color: C.text, fontSize: 13, fontFamily: F.monoMedium },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.wave },
  plan: { gap: 12, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: C.accLine, backgroundColor: C.accSoft },
  planTitle: { color: C.text, fontSize: 17, lineHeight: 22, ...display },
  next: { color: C.t2, fontSize: 13.5, lineHeight: 19, ...font() },
  step: { flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 56, borderTopWidth: 1, borderTopColor: C.lineSoft, paddingVertical: 8 },
  stepText: { color: C.text, fontSize: 14.5, lineHeight: 20, ...font() },
  stepMeta: { color: C.t3, fontSize: 11.5, fontFamily: F.mono },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: C.t3, alignItems: 'center', justifyContent: 'center' },
  endBtn: { minHeight: 44, justifyContent: 'center', borderTopWidth: 1, borderTopColor: C.lineSoft },
  endText: { color: C.danger, fontSize: 14, ...font('500') },
}));
