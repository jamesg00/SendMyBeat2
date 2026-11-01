import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import * as api from '@/api/endpoints';
import { useRequest } from '@/api/use-request';
import { Button } from '@/components/ui';
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

  const benefits =
    pick === 'max'
      ? [
          `${pro.generations} generations and ${pro.uploads} uploads a month`,
          'Copy a pro producer’s style, with the plan agent',
          'Pro breakdowns and You vs them',
          'Channel analytics and title fixes',
          'Run several jobs at once',
        ]
      : [
          `${plus.generations} generations and ${plus.uploads} uploads a month`,
          'Tags scored against real YouTube searches',
          'Descriptions and Upload Studio',
          'Upload straight to YouTube',
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
          <Pressable onPress={() => router.back()} hitSlop={12} style={s.close} accessibilityRole="button" accessibilityLabel="Close">
            <Svg width={12} height={12} viewBox="0 0 12 12">
              <Path d="M1 1l10 10M11 1L1 11" stroke={C.t2} strokeWidth={1.8} strokeLinecap="round" />
            </Svg>
          </Pressable>
        </View>

        <View style={{ gap: 10 }}>
          <Text style={s.kicker}>SENDMYBEAT {name.toUpperCase()}</Text>
          <Text style={s.title}>{head.title}</Text>
          <Text style={s.sub}>{message || head.sub}</Text>
        </View>

        <View style={{ gap: 12 }}>
          {benefits.map((b, i) => (
            <Animated.View key={`${pick}-${b}`} entering={FadeIn.delay(i * 40)} style={s.benefit}>
              <View style={s.benefitIcon}>
                <Check size={12} color={C.acc} />
              </View>
              <Text style={s.benefitText}>{b}</Text>
            </Animated.View>
          ))}
        </View>

        <View style={{ gap: 10 }} accessibilityRole="radiogroup">
          <PlanRow
            name="Plus"
            detail={`${plus.generations} generations · ${plus.uploads} uploads`}
            price={dollars(plus.price_cents)}
            selected={pick === 'plus'}
            tag={current === 'plus' ? 'Your plan' : sub?.trial_available ? `${trial.days} days free` : undefined}
            onPress={() => setPick('plus')}
          />
          <PlanRow
            name="Pro"
            detail={`${pro.generations} of each · pro styles · analytics`}
            price={dollars(pro.price_cents)}
            selected={pick === 'max'}
            tag={current === 'max' ? 'Your plan' : 'Most popular'}
            highlight={current !== 'max'}
            onPress={() => setPick('max')}
          />
        </View>

        {canTrial ? (
          <Animated.View entering={FadeIn} style={s.timeline}>
            <Step title="Today" body={`Full access: ${trial.daily_generations} generations and ${trial.daily_uploads} uploads a day.`} active />
            <Step title={`Day ${trial.days}`} body={`Your trial ends and Plus starts at ${dollars(plus.price_cents)}/month.`} />
            <Step title="Anytime" body="Cancel from Profile before then and you won’t be charged." last />
          </Animated.View>
        ) : null}

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

function PlanRow({
  name,
  detail,
  price,
  selected,
  tag,
  highlight,
  onPress,
}: {
  name: string;
  detail: string;
  price: string;
  selected: boolean;
  tag?: string;
  highlight?: boolean;
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
      accessibilityLabel={`${name}, ${price} a month. ${detail}`}>
      <View style={[s.radio, selected && { borderColor: C.acc, backgroundColor: C.acc }]}>{selected ? <Check size={11} color={C.onAcc} /> : null}</View>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={s.planName}>{name}</Text>
          {tag ? <Text style={[s.tag, highlight && { color: C.onAcc, backgroundColor: C.acc, borderColor: C.acc }]}>{tag}</Text> : null}
        </View>
        <Text style={s.planDetail} numberOfLines={1}>
          {detail}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={s.price}>{price}</Text>
        <Text style={s.per}>/month</Text>
      </View>
    </Pressable>
  );
}

function Step({ title, body, active, last }: { title: string; body: string; active?: boolean; last?: boolean }) {
  const s = useStyles();
  const C = useColors();
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <View style={{ alignItems: 'center', width: 12 }}>
        <View style={[s.stepDot, active && { backgroundColor: C.acc, borderColor: C.acc }]} />
        {last ? null : <View style={s.stepLine} />}
      </View>
      <View style={{ flex: 1, gap: 2, paddingBottom: last ? 0 : 14 }}>
        <Text style={s.stepTitle}>{title}</Text>
        <Text style={s.stepBody}>{body}</Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((C) => ({
  root: { flex: 1, backgroundColor: C.bg },
  center: { alignItems: 'center', justifyContent: 'center', gap: 16 },
  scroll: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 24, gap: 24 },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end' },
  close: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.card2, alignItems: 'center', justifyContent: 'center' },
  kicker: { color: C.acc, fontSize: 11, letterSpacing: 1.2, fontFamily: F.monoMedium },
  title: { color: C.text, fontSize: 32, lineHeight: 36, ...display },
  sub: { color: C.t2, fontSize: 15, lineHeight: 22, ...font() },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  benefitIcon: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.accSoft, alignItems: 'center', justifyContent: 'center' },
  benefitText: { flex: 1, color: C.text, fontSize: 14.5, lineHeight: 20, ...font('500') },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderRadius: R.card + 4,
    borderWidth: 1.5,
    borderColor: C.line,
    backgroundColor: C.card,
  },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: C.t3, alignItems: 'center', justifyContent: 'center' },
  planName: { color: C.text, fontSize: 17, ...display },
  planDetail: { color: C.t2, fontSize: 12.5, ...font() },
  tag: {
    color: C.t2,
    fontSize: 10,
    letterSpacing: 0.3,
    fontFamily: F.monoMedium,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: R.chip,
    borderWidth: 1,
    borderColor: C.line,
    overflow: 'hidden',
  },
  price: { color: C.text, fontSize: 18, ...font('700') },
  per: { color: C.t3, fontSize: 11, ...font() },
  timeline: { padding: 16, borderRadius: R.card + 4, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  stepDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, borderColor: C.t3, marginTop: 3 },
  stepLine: { flex: 1, width: 1.5, backgroundColor: C.line, marginTop: 3 },
  stepTitle: { color: C.text, fontSize: 14, ...font('600') },
  stepBody: { color: C.t2, fontSize: 13, lineHeight: 18, ...font() },
  founding: { alignSelf: 'center', paddingVertical: 4, paddingHorizontal: 8 },
  foundingText: { color: C.t3, fontSize: 12.5, ...font('500') },
  footer: { paddingHorizontal: 22, paddingTop: 12, gap: 10, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.bg },
  error: { color: C.danger, fontSize: 13, textAlign: 'center', ...font() },
  fine: { color: C.t3, fontSize: 12, lineHeight: 17, textAlign: 'center', ...font() },
  doneTick: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.acc, alignItems: 'center', justifyContent: 'center' },
  doneTitle: { color: C.text, fontSize: 28, textAlign: 'center', ...display },
}));
