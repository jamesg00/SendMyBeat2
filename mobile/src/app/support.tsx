import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as api from '@/api/endpoints';
import { useRequest } from '@/api/use-request';
import { Button } from '@/components/ui';
import { dollars, sendTip, startPlan, useSubscription } from '@/state/billing';
import { F, R, display, font, makeStyles, useColors } from '@/theme';

// Support SendMyBeat: the founding member deal (Pro for a year at a discount, limited spots) and
// one-time tips. Kept quiet on purpose: reached from a row in Profile and a link on the plans.

export default function SupportScreen() {
  const s = useStyles();
  const C = useColors();
  const insets = useSafeAreaInsets();
  const sub = useSubscription();
  const config = useRequest(api.billingConfig);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const founding = config.data?.founding ?? { price_cents: 4000, interval: 'year', limit: 50 };
  const tips = config.data?.tip_amounts_cents ?? [300, 500, 1000];
  const spots = sub?.founding_spots_left ?? null;

  const run = async (key: string, fn: () => Promise<boolean>, thanks: string) => {
    setBusy(key);
    setNote(null);
    try {
      if (await fn()) setNote(thanks);
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Couldn’t open the payment page.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={s.root}>
      <View style={s.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button">
          <Text style={s.topAction}>Close</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 32, gap: 18 }}>
        <View style={{ gap: 8 }}>
          <Text style={s.title}>Support SendMyBeat</Text>
          <Text style={s.sub}>Early support pays for building the iPhone app and keeps SendMyBeat going.</Text>
        </View>

        <View style={s.card}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Text style={s.kicker}>FOUNDING MEMBER</Text>
            {spots != null ? <Text style={s.kicker}>{spots > 0 ? `${spots} of ${founding.limit} left` : 'All taken'}</Text> : null}
          </View>
          <Text style={s.cardTitle}>A year of Pro for {dollars(founding.price_cents)}</Text>
          <Text style={s.sub}>
            Everything in Pro for 12 months (normally $120), and Founding member on your account for good.
          </Text>
          {sub?.founding_member ? (
            <Text style={[s.sub, { color: C.acc, ...font('600') }]}>You’re a founding member. Thank you.</Text>
          ) : spots === 0 ? null : (
            <Button
              title={busy === 'founding' ? 'Opening…' : 'Become a founding member'}
              onPress={busy ? undefined : () => void run('founding', () => startPlan('founding'), 'Welcome, founding member. Pro is on.')}
            />
          )}
          <Text style={s.fine}>If you already pay for a plan, it switches to this one.</Text>
        </View>

        <View style={{ gap: 10 }}>
          <Text style={s.kicker}>OR LEAVE A TIP</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {tips.map((cents) => (
              <Button
                key={cents}
                title={busy === `tip-${cents}` ? '…' : dollars(cents)}
                variant="secondary"
                style={{ flex: 1 }}
                onPress={busy ? undefined : () => void run(`tip-${cents}`, () => sendTip(cents), 'Thank you for the tip!')}
              />
            ))}
          </View>
          <Text style={s.fine}>A one-time payment. It doesn’t change your plan.</Text>
        </View>

        {note ? <Text style={[s.sub, { textAlign: 'center' }]}>{note}</Text> : null}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((C) => ({
  root: { flex: 1, backgroundColor: C.bg },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },
  topAction: { color: C.t2, fontSize: 15, ...font() },
  title: { color: C.text, fontSize: 26, ...display },
  sub: { color: C.t2, fontSize: 14, lineHeight: 20, ...font() },
  card: { padding: 16, gap: 12, borderRadius: R.card, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  kicker: { color: C.t3, fontSize: 11, letterSpacing: 0.4, fontFamily: F.monoMedium },
  cardTitle: { color: C.text, fontSize: 20, ...display },
  fine: { color: C.t3, fontSize: 12, lineHeight: 17, ...font() },
}));
