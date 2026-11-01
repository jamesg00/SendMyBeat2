import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import * as api from '@/api/endpoints';
import { useRequest } from '@/api/use-request';
import { AppIcon, Button } from '@/components/ui';
import { dollars, markPaywallOpen, startPlan, useSubscription, type PaywallReason } from '@/state/billing';
import { F, R, display, font, makeStyles, useColors } from '@/theme';

// The plans: the free trial, Plus ($5) and Pro ($10). Opened when something needs a plan (any
// 402 with a plan code), for free accounts when the app opens, or from Profile. Paying happens on
// Stripe's page in an in-app browser, which comes straight back here.

const FALLBACK = {
  plus: { price_cents: 500, generations: 50, uploads: 50 },
  max: { price_cents: 1000, generations: 100, uploads: 100 },
  trial: { days: 3, daily_generations: 3, daily_uploads: 3 },
};

const HEADLINE: Record<PaywallReason, { title: string; sub: string }> = {
  needs_plan: { title: 'Make every upload count', sub: 'Tags that rank, descriptions that sell, and uploads straight to YouTube.' },
  needs_pro: { title: 'Unlock Pro', sub: 'Copy what works for the biggest producers, and see what’s working on your channel.' },
  trial_limit: { title: 'That’s today’s trial', sub: 'Your credits come back tomorrow, or pick a plan to keep going now.' },
  out_of_credits: { title: 'You’re out of credits', sub: 'Pro gives you twice the generations and uploads every month.' },
};

type PlanId = 'plus' | 'max';

export default function PaywallScreen() {
  const s = useStyles();
  const C = useColors();
  const insets = useSafeAreaInsets();
  const { reason = 'needs_plan', message } = useLocalSearchParams<{ reason?: PaywallReason; message?: string }>();
  const sub = useSubscription();
  const config = useRequest(api.billingConfig);
  const [pick, setPick] = useState<PlanId>(reason === 'needs_pro' || reason === 'out_of_credits' ? 'max' : 'plus');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<PlanId | null>(null);

  useEffect(() => {
    markPaywallOpen(true);
    return () => markPaywallOpen(false);
  }, []);

  const plans = config.data?.plans ?? [];
  const plus = plans.find((p) => p.id === 'plus') ?? FALLBACK.plus;
  const pro = plans.find((p) => p.id === 'max') ?? FALLBACK.max;
  const trial = config.data?.trial ?? FALLBACK.trial;
  const current: PlanId | 'trial' | 'free' = sub?.trial ? 'trial' : sub?.plan === 'max' || sub?.plan === 'pro' ? 'max' : sub?.plan === 'plus' ? 'plus' : 'free';
  const canTrial = !!sub?.trial_available && pick === 'plus';
  const onPlan = !canTrial && current === pick;
  const head = HEADLINE[reason] ?? HEADLINE.needs_plan;
  const name = pick === 'max' ? 'Pro' : 'Plus';
  const price = pick === 'max' ? pro.price_cents : plus.price_cents;

  // What each plan gets, side by side. A number, or true / false for a check or a dash.
  const rows: { label: string; plus: string | boolean; pro: string | boolean }[] = [
    { label: 'AI generations a month', plus: String(plus.generations), pro: String(pro.generations) },
    { label: 'YouTube uploads a month', plus: String(plus.uploads), pro: String(pro.uploads) },
    { label: 'Tags, descriptions, Upload Studio', plus: true, pro: true },
    { label: 'Copy a pro’s style', plus: false, pro: true },
    { label: 'Pro breakdowns and channel analytics', plus: false, pro: true },
    { label: 'Several jobs at once', plus: false, pro: true },
  ];

  const go = async () => {
    setBusy(true);
    setError(null);
    try {
      if (await startPlan(pick, { trial: canTrial })) setDone(pick);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t open checkout. Try again.');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <View style={[s.root, s.center, { paddingBottom: insets.bottom + 24 }]}>
        <Animated.View entering={FadeIn.duration(400)} style={s.doneTick}>
          <Check size={30} color={C.onAcc} />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(120)} style={{ alignItems: 'center', gap: 8, paddingHorizontal: 24 }}>
          <Text style={s.doneTitle}>{sub?.trial ? 'Your free trial is on' : `You’re on ${done === 'max' ? 'Pro' : 'Plus'}`}</Text>
          <Text style={[s.sub, { textAlign: 'center' }]}>Everything’s unlocked. Thanks for backing SendMyBeat.</Text>
        </Animated.View>
        <Button title="Start creating" onPress={() => router.back()} style={{ alignSelf: 'stretch', marginHorizontal: 24, marginTop: 12 }} />
      </View>
    );
  }

  const cta = busy ? 'Opening…' : canTrial ? 'Start free trial' : onPlan ? 'This is your plan' : current === 'free' ? `Continue with ${name}` : `Switch to ${name}`;

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.topBar}>
          <AppIcon size={40} />
          <Pressable onPress={() => router.back()} hitSlop={12} style={s.close} accessibilityRole="button" accessibilityLabel="Close">
            <Svg width={12} height={12} viewBox="0 0 12 12">
              <Path d="M1 1l10 10M11 1L1 11" stroke={C.t2} strokeWidth={1.8} strokeLinecap="round" />
            </Svg>
          </Pressable>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={s.title}>{head.title}</Text>
          <Text style={s.sub}>
            {message || (sub?.trial_available && reason === 'needs_plan' ? `Try everything free for ${trial.days} days. Cancel anytime in Profile.` : head.sub)}
          </Text>
        </View>

        <View style={s.plans} accessibilityRole="radiogroup">
          <PlanCard
            name="Plus"
            price={dollars(plus.price_cents)}
            selected={pick === 'plus'}
            badge={current === 'plus' ? 'YOUR PLAN' : sub?.trial_available ? `${trial.days} DAYS FREE` : undefined}
            onPress={() => setPick('plus')}
          />
          <PlanCard
            name="Pro"
            price={dollars(pro.price_cents)}
            selected={pick === 'max'}
            badge={current === 'max' ? 'YOUR PLAN' : 'MOST POPULAR'}
            solid={current !== 'max'}
            onPress={() => setPick('max')}
          />
        </View>

        <View accessible accessibilityLabel={rows.map((r) => `${r.label}: Plus ${say(r.plus)}, Pro ${say(r.pro)}`).join('. ')}>
          <View style={s.tableHead}>
            <Text style={[s.th, { flex: 1, textAlign: 'left' }]}>WHAT YOU GET</Text>
            <Text style={[s.th, pick === 'plus' && { color: C.text }]}>PLUS</Text>
            <Text style={[s.th, pick === 'max' && { color: C.text }]}>PRO</Text>
          </View>
          {rows.map((r, i) => (
            <View key={r.label} style={[s.tr, i === rows.length - 1 && { borderBottomWidth: 1 }]}>
              <Text style={s.td}>{r.label}</Text>
              <Cell value={r.plus} />
              <Cell value={r.pro} />
            </View>
          ))}
        </View>

        {sub?.founding_spots_left ? (
          <Pressable onPress={() => router.push('/support')} accessibilityRole="link" style={s.founding}>
            <Text style={s.foundingText}>Founding member: a year of Pro for $40 ›</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <View style={[s.footer, { paddingBottom: insets.bottom + 14 }]}>
        {error ? <Text style={s.error}>{error}</Text> : null}
        <Button title={cta} onPress={busy || onPlan ? undefined : () => void go()} variant={onPlan ? 'secondary' : 'primary'} />
        <Text style={s.fine}>
          {canTrial
            ? `${trial.days} days free, then ${dollars(plus.price_cents)}/month. Cancel anytime.`
            : `${dollars(price)}/month through Stripe. Cancel anytime in Profile.`}
        </Text>
      </View>
    </View>
  );
}

function Check({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12" accessibilityElementsHidden importantForAccessibility="no">
      <Path d="M2 6.4l2.6 2.6L10 3.4" stroke={color} strokeWidth={1.9} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const say = (v: string | boolean) => (v === true ? 'included' : v === false ? 'not included' : v);

function Cell({ value }: { value: string | boolean }) {
  const s = useStyles();
  const C = useColors();
  return (
    <View style={s.cell}>
      {value === true ? <Check size={13} color={C.acc} /> : <Text style={value === false ? s.dash : s.num}>{value === false ? '–' : value}</Text>}
    </View>
  );
}

function PlanCard({
  name,
  price,
  selected,
  badge,
  solid,
  onPress,
}: {
  name: string;
  price: string;
  selected: boolean;
  badge?: string;
  solid?: boolean;
  onPress: () => void;
}) {
  const s = useStyles();
  const C = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.plan, selected && { borderColor: C.acc, backgroundColor: C.accSoft }, pressed && { opacity: 0.85 }]}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${name}, ${price} a month${badge ? `, ${badge.toLowerCase()}` : ''}`}>
      {badge ? <Text style={[s.badge, solid && { color: C.onPrimary, backgroundColor: C.primary, borderColor: C.primary }]}>{badge}</Text> : <View style={{ height: 19 }} />}
      <Text style={s.planName}>{name}</Text>
      <Text style={s.price}>
        {price}
        <Text style={s.per}>/mo</Text>
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles((C) => ({
  root: { flex: 1, backgroundColor: C.bg },
  center: { alignItems: 'center', justifyContent: 'center', gap: 16 },
  scroll: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 24, gap: 24 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  plans: { flexDirection: 'row', gap: 10 },
  plan: { flex: 1, gap: 6, padding: 14, borderRadius: R.card + 4, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.card },
  badge: {
    alignSelf: 'flex-start',
    color: C.acc,
    fontSize: 10,
    letterSpacing: 0.4,
    fontFamily: F.monoMedium,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: R.chip,
    borderWidth: 1,
    borderColor: C.accLine,
    overflow: 'hidden',
  },
  planName: { color: C.text, fontSize: 17, ...display },
  price: { color: C.text, fontSize: 24, ...font('700') },
  per: { color: C.t3, fontSize: 12, ...font() },
  tableHead: { flexDirection: 'row', alignItems: 'center', paddingBottom: 8 },
  th: { width: 56, textAlign: 'center', color: C.t3, fontSize: 11, letterSpacing: 0.6, fontFamily: F.monoMedium },
  tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderTopWidth: 1, borderColor: C.lineSoft },
  td: { flex: 1, color: C.text, fontSize: 13.5, ...font() },
  cell: { width: 56, alignItems: 'center' },
  num: { color: C.text, fontSize: 13.5, fontFamily: F.mono },
  dash: { color: C.t3, fontSize: 13.5, ...font() },
  close: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.card2, alignItems: 'center', justifyContent: 'center' },
  title: { color: C.text, fontSize: 32, lineHeight: 36, ...display },
  sub: { color: C.t2, fontSize: 15, lineHeight: 22, ...font() },
  founding: { alignSelf: 'center', paddingVertical: 4, paddingHorizontal: 8 },
  foundingText: { color: C.t3, fontSize: 12.5, ...font('500') },
  footer: { paddingHorizontal: 22, paddingTop: 12, gap: 10, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.bg },
  error: { color: C.danger, fontSize: 13, textAlign: 'center', ...font() },
  fine: { color: C.t3, fontSize: 12, lineHeight: 17, textAlign: 'center', ...font() },
  doneTick: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.acc, alignItems: 'center', justifyContent: 'center' },
  doneTitle: { color: C.text, fontSize: 28, textAlign: 'center', ...display },
}));
