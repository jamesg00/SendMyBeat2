import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as api from '@/api/endpoints';
import type { CheckoutPlan } from '@/api/endpoints';
import { useRequest } from '@/api/use-request';
import { Button } from '@/components/ui';
import { dollars, markPaywallOpen, startPlan, useSubscription, type PaywallReason } from '@/state/billing';
import { F, R, display, font, makeStyles, useColors } from '@/theme';

// The plans: the free trial, Plus ($5) and Pro ($10). Opened when something needs a plan (any
// 402 with a plan code) or from Profile. Paying happens on Stripe's page in an in-app browser.

const FALLBACK = {
  plus: { price_cents: 500, generations: 50, uploads: 50 },
  max: { price_cents: 1000, generations: 100, uploads: 100 },
  trial: { days: 3, daily_generations: 3, daily_uploads: 3 },
};

const HEADLINE: Record<PaywallReason, string> = {
  needs_plan: 'Start making uploads',
  needs_pro: 'That’s part of Pro',
  trial_limit: 'That’s today’s trial',
};

export default function PaywallScreen() {
  const s = useStyles();
  const C = useColors();
  const insets = useSafeAreaInsets();
  const { reason = 'needs_plan', message } = useLocalSearchParams<{ reason?: PaywallReason; message?: string }>();
  const sub = useSubscription();
  const config = useRequest(api.billingConfig);
  const [pick, setPick] = useState<'plus' | 'max'>(reason === 'needs_pro' ? 'max' : 'plus');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    markPaywallOpen(true);
    return () => markPaywallOpen(false);
  }, []);

  const plans = config.data?.plans ?? [];
  const plus = plans.find((p) => p.id === 'plus') ?? FALLBACK.plus;
  const pro = plans.find((p) => p.id === 'max') ?? FALLBACK.max;
  const trial = config.data?.trial ?? FALLBACK.trial;
  const current = sub?.trial ? 'trial' : sub?.plan === 'max' || sub?.plan === 'pro' ? 'max' : sub?.plan === 'plus' ? 'plus' : 'free';
  const canTrial = !!sub?.trial_available && pick === 'plus';

  const go = async (plan: CheckoutPlan, withTrial = false) => {
    setBusy(withTrial ? 'trial' : plan);
    setError(null);
    try {
      if (await startPlan(plan, { trial: withTrial })) setDone(withTrial ? 'Your free trial is on' : plan === 'max' ? 'You’re on Pro' : 'You’re on Plus');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t open checkout. Try again.');
    } finally {
      setBusy(null);
    }
  };

  if (done) {
    return (
      <View style={[s.root, s.center, { paddingBottom: insets.bottom }]}>
        <View style={s.doneTick}>
          <Text style={s.doneMark}>✓</Text>
        </View>
        <Text style={s.title}>{done}</Text>
        <Text style={[s.sub, { textAlign: 'center' }]}>Thanks for supporting SendMyBeat.</Text>
        <Button title="Keep going" onPress={() => router.back()} style={{ alignSelf: 'stretch', marginHorizontal: 24 }} />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <View style={s.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button">
          <Text style={s.topAction}>Not now</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24, gap: 18 }}>
        <View style={{ gap: 8 }}>
          <Text style={s.title}>{HEADLINE[reason] ?? HEADLINE.needs_plan}</Text>
          <Text style={s.sub}>{message || 'Generate tags and descriptions, and upload straight to YouTube.'}</Text>
        </View>

        <PlanCard
          name="Plus"
          price={`${dollars(plus.price_cents)}/month`}
          selected={pick === 'plus'}
          current={current === 'plus'}
          onPress={() => setPick('plus')}
          lines={[`${plus.generations} generations a month`, `${plus.uploads} uploads a month`, 'Upload Studio, tags and descriptions']}
        />
        <PlanCard
          name="Pro"
          price={`${dollars(pro.price_cents)}/month`}
          selected={pick === 'max'}
          current={current === 'max'}
          badge="Best for growing"
          onPress={() => setPick('max')}
          lines={[
            `${pro.generations} generations and ${pro.uploads} uploads a month`,
            'Copy a pro producer’s style, with the plan agent',
            'Pro breakdowns and You vs them',
            'Channel analytics',
            'Job queue: run several jobs at once',
          ]}
        />

        {error ? <Text style={{ color: C.danger, fontSize: 13, ...font() }}>{error}</Text> : null}

        <View style={{ gap: 10 }}>
          {canTrial ? (
            <>
              <Button title={busy === 'trial' ? 'Opening…' : `Start ${trial.days}-day free trial`} onPress={busy ? undefined : () => void go('plus', true)} />
              <Text style={s.fine}>
                {trial.daily_generations} generations and {trial.daily_uploads} uploads a day for {trial.days} days, then {dollars(plus.price_cents)}/month. Cancel
                any time before it ends and you won’t be charged.
              </Text>
            </>
          ) : current === pick ? (
            <Button title="This is your plan" variant="secondary" />
          ) : (
            <Button
              title={busy === pick ? 'Opening…' : current === 'free' ? `Get ${pick === 'max' ? 'Pro' : 'Plus'}` : `Switch to ${pick === 'max' ? 'Pro' : 'Plus'}`}
              onPress={busy ? undefined : () => void go(pick)}
            />
          )}
          <Text style={s.fine}>Payments go through Stripe. Cancel anytime from Profile → Plan and billing.</Text>
        </View>

        {sub?.founding_spots_left ? (
          <Pressable onPress={() => router.push('/support')} accessibilityRole="link" style={{ alignSelf: 'center', padding: 6 }}>
            <Text style={s.quiet}>Founding member offer ›</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

function PlanCard({
  name,
  price,
  lines,
  selected,
  current,
  badge,
  onPress,
}: {
  name: string;
  price: string;
  lines: string[];
  selected: boolean;
  current: boolean;
  badge?: string;
  onPress: () => void;
}) {
  const s = useStyles();
  const C = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={[s.card, selected && { borderColor: C.text, borderWidth: 2, padding: 15 }]}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${name}, ${price}`}>
      <View style={s.cardHead}>
        <View style={[s.radio, selected && { borderColor: C.text }]}>{selected ? <View style={s.radioDot} /> : null}</View>
        <Text style={s.planName}>{name}</Text>
        {current ? <Text style={s.tag}>Your plan</Text> : badge ? <Text style={s.tag}>{badge}</Text> : null}
        <Text style={s.price}>{price}</Text>
      </View>
      <View style={{ gap: 6, paddingLeft: 30 }}>
        {lines.map((l) => (
          <View key={l} style={{ flexDirection: 'row', gap: 8 }}>
            <Text style={{ color: C.acc, fontSize: 13, ...font('700') }}>✓</Text>
            <Text style={s.line}>{l}</Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((C) => ({
  root: { flex: 1, backgroundColor: C.bg },
  center: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },
  topAction: { color: C.t2, fontSize: 15, ...font() },
  title: { color: C.text, fontSize: 28, lineHeight: 32, ...display },
  sub: { color: C.t2, fontSize: 14.5, lineHeight: 21, ...font() },
  card: { padding: 16, gap: 12, borderRadius: R.card, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.text },
  planName: { color: C.text, fontSize: 19, ...display },
  tag: { color: C.t2, fontSize: 10.5, letterSpacing: 0.3, fontFamily: F.monoMedium, paddingHorizontal: 6, paddingVertical: 2, borderRadius: R.chip, borderWidth: 1, borderColor: C.line },
  price: { marginLeft: 'auto', color: C.text, fontSize: 15, ...font('600') },
  line: { flex: 1, color: C.t2, fontSize: 13.5, lineHeight: 19, ...font() },
  fine: { color: C.t3, fontSize: 12, lineHeight: 17, textAlign: 'center', ...font() },
  quiet: { color: C.t3, fontSize: 12.5, ...font('500') },
  doneTick: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.acc, alignItems: 'center', justifyContent: 'center' },
  doneMark: { color: C.onAcc, fontSize: 26, ...font('700') },
}));
