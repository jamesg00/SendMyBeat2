import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, type ReactNode } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useAuth } from '@/api/auth';
import * as api from '@/api/endpoints';
import type { SubscriptionStatus } from '@/api/endpoints';
import { useRequest } from '@/api/use-request';
import { Avatar } from '@/components/producer';
import { PlanCard, usePlan } from '@/components/pros';
import { manageBilling, openPaywall, planName, refreshSubscription, useSubscription } from '@/state/billing';
import { AppIcon, Button, ListGroup, ListRow, Meter, Screen } from '@/components/ui';
import { F, R, font, makeStyles, THEMES, useColors, useThemeId } from '@/theme';

const VERIFICATION: Record<string, string> = { none: 'Get verified', pending: 'Under review', approved: 'Verified ✓', rejected: 'Try again' };

const site = (path: string) => WebBrowser.openBrowserAsync(`https://www.sendmybeat.com${path}`);

export default function ProfileScreen() {
  const s = useStyles();
  const themeId = useThemeId();
  const { plan: stylePlan, setPlan: setStylePlan } = usePlan();
  const { user, signOut } = useAuth();
  const sub = useSubscription();
  const yt = useRequest(api.youtubeStatus);
  const descriptions = useRequest(api.descriptions);
  const me = useRequest(api.myProducer);
  const reloadMe = me.reload;
  // Coming back from Edit profile shows the new picture and details.
  useFocusEffect(
    useCallback(() => {
      reloadMe();
      void refreshSubscription();
    }, [reloadMe]),
  );

  const plan = planName(sub);
  const openBilling = () => (sub?.is_subscribed ? void manageBilling() : openPaywall('needs_plan'));
  const openSpotlight = me.data ? () => router.push({ pathname: '/producer/[id]', params: { id: me.data!.user_id } }) : undefined;

  return (
    <Screen title="Profile" icon={<AppIcon size={26} />}>
      <View style={s.card}>
        <View style={s.cardHead}>
          <Pressable onPress={openSpotlight} disabled={!openSpotlight} accessibilityRole="button" accessibilityLabel="Open your Spotlight profile">
            {me.data ? (
              <Avatar producer={me.data} size={56} />
            ) : (
              <View style={s.avatar} accessibilityRole="image" accessibilityLabel={user?.username}>
                <Text style={s.avatarText}>{user?.username.charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </Pressable>
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={s.name} numberOfLines={1}>
              {user?.username}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {sub ? <Text style={[s.chip, sub.is_subscribed && s.chipOn]}>{planChip(sub)}</Text> : null}
              <Text style={s.sub} numberOfLines={1}>
                {planLine(sub)}
              </Text>
            </View>
          </View>
          <Button title="Edit" variant="secondary" size="sm" onPress={() => router.push('/profile-edit')} />
        </View>

        {sub?.is_subscribed ? (
          <View style={s.meters}>
            <Usage label={sub.trial ? 'AI today' : 'AI this month'} left={sub.daily_credits_remaining} total={sub.daily_credits_total} />
            <Usage label={sub.trial ? 'Uploads today' : 'Uploads'} left={sub.upload_credits_remaining} total={sub.upload_credits_total} />
          </View>
        ) : null}

        {sub && !sub.pro_access ? (
          <Pressable
            onPress={() => openPaywall(sub.is_subscribed ? 'needs_pro' : 'needs_plan')}
            style={({ pressed }) => [s.upgrade, pressed && { opacity: 0.8 }]}
            accessibilityRole="button">
            <Text style={s.upgradeText}>
              {!sub.is_subscribed ? (sub.trial_available ? 'Start your 3-day free trial' : 'Choose a plan') : 'Upgrade to Pro: 100 of each, $10/mo'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {stylePlan ? <PlanCard plan={stylePlan} onChange={setStylePlan} full /> : null}

      <View style={{ gap: 8 }}>
        <Text style={s.section}>APP</Text>
        <ListGroup>
          <ListRow
            left={<Tile icon="check" accent />}
            title="Verification"
            value={VERIFICATION[me.data?.verification_status ?? 'none'] ?? 'Get verified'}
            onPress={() => router.push('/verify')}
          />
          <ListRow left={<Tile icon="chat" />} title="Report a bug or idea" onPress={() => router.push('/feedback')} />
          <ListRow
            left={<Tile icon="theme" />}
            title="Appearance"
            value={THEMES.find((t) => t.id === themeId)?.label}
            onPress={() => router.push('/appearance')}
          />
          <ListRow left={<Tile icon="heart" />} title="Support SendMyBeat" onPress={() => router.push('/support')} last={!user?.is_admin} />
          {user?.is_admin ? <ListRow title="Admin · Pros photos and channels" onPress={() => router.push('/admin-pros')} /> : null}
          {user?.is_admin ? <ListRow title="Admin · Verification requests" onPress={() => router.push('/admin-verify')} /> : null}
          {user?.is_admin ? <ListRow title="Admin · Feedback" onPress={() => router.push('/admin-feedback')} last /> : null}
        </ListGroup>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={s.section}>ACCOUNT</Text>
        <ListGroup>
          <ListRow
            title="YouTube"
            right={
              <View style={s.status}>
                {yt.data?.connected ? <View style={s.dot} /> : null}
                <Text style={s.sub}>{yt.loading ? '…' : yt.data?.connected ? 'Connected' : 'Not connected'}</Text>
                <Text style={s.chevron}>›</Text>
              </View>
            }
            onPress={() => site('/dashboard')}
          />
          {openSpotlight ? <ListRow title="My Spotlight profile" onPress={openSpotlight} /> : null}
          <ListRow title="Plan and billing" value={plan} onPress={openBilling} />
          <ListRow
            title="Descriptions"
            right={
              <View style={s.status}>
                <Text style={s.mono}>{descriptions.data?.length ?? '–'}</Text>
                <Text style={s.chevron}>›</Text>
              </View>
            }
            onPress={() => site('/dashboard')}
          />
          <ListRow title="Privacy policy" right={<Text style={s.external}>↗</Text>} onPress={() => site('/privacy-policy')} />
          <ListRow title="Terms" right={<Text style={s.external}>↗</Text>} onPress={() => site('/terms')} last />
        </ListGroup>
      </View>

      <Pressable onPress={signOut} accessibilityRole="button" hitSlop={8} style={{ alignSelf: 'flex-start', paddingVertical: 4 }}>
        <Text style={s.signOut}>Sign out</Text>
      </Pressable>

      <View style={s.about} accessible accessibilityLabel={`SendMyBeat version ${Constants.expoConfig?.version ?? ''}`}>
        <AppIcon size={36} />
        <Text style={s.aboutText}>SendMyBeat {Constants.expoConfig?.version ?? ''}</Text>
      </View>
    </Screen>
  );
}

const planChip = (sub: SubscriptionStatus) =>
  sub.trial ? 'TRIAL' : sub.plan === 'max' || sub.plan === 'pro' ? (sub.founding_member ? 'PRO · FOUNDING' : 'PRO') : sub.plan === 'plus' ? 'PLUS' : 'FREE';

function planLine(sub: SubscriptionStatus | null) {
  if (!sub) return '…';
  if (sub.trial) return sub.trial_ends_at ? `Ends ${new Date(sub.trial_ends_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : '3 a day';
  if (sub.is_subscribed) return `${sub.daily_credits_total} AI · ${sub.upload_credits_total} uploads a month`;
  return 'Browse free. Pick a plan to create.';
}

function Usage({ label, left, total }: { label: string; left: number; total: number }) {
  const s = useStyles();
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <View style={s.usageHead}>
        <Text style={s.usageLabel}>{label}</Text>
        <Text style={s.usageValue}>
          {left}/{total}
        </Text>
      </View>
      <Meter value={total > 0 ? left / total : 0} height={3} />
    </View>
  );
}

const TILE_ICONS: Record<string, (color: string) => ReactNode> = {
  check: (c) => <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={c} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />,
  chat: (c) => <Path d="M4 5h16v11H8l-4 4z" stroke={c} strokeWidth={2} fill="none" strokeLinejoin="round" />,
  theme: (c) => (
    <>
      <Circle cx={12} cy={12} r={8} stroke={c} strokeWidth={2} fill="none" />
      <Path d="M12 4a8 8 0 0 0 0 16z" fill={c} />
    </>
  ),
  heart: (c) => <Path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" stroke={c} strokeWidth={2} fill="none" strokeLinejoin="round" />,
};

// A small rounded icon square at the start of a row.
function Tile({ icon, accent }: { icon: keyof typeof TILE_ICONS; accent?: boolean }) {
  const s = useStyles();
  const C = useColors();
  return (
    <View style={s.tile}>
      <Svg width={15} height={15} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
        {TILE_ICONS[icon](accent ? C.acc : C.text)}
      </Svg>
    </View>
  );
}

const useStyles = makeStyles((C) => ({
  card: { padding: 16, gap: 14, borderRadius: R.card + 6, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.card2,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: C.t2, fontSize: 20, ...font('600') },
  name: { color: C.text, fontSize: 18, letterSpacing: -0.3, ...font('600') },
  chip: {
    color: C.t2,
    fontSize: 10.5,
    letterSpacing: 0.4,
    fontFamily: F.monoMedium,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: R.chip,
    borderWidth: 1,
    borderColor: C.line,
    overflow: 'hidden',
  },
  chipOn: { color: C.acc, borderColor: C.accLine },
  sub: { color: C.t2, fontSize: 12.5, flexShrink: 1, ...font() },
  meters: { flexDirection: 'row', gap: 14 },
  usageHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  usageLabel: { color: C.t2, fontSize: 12, ...font() },
  usageValue: { color: C.text, fontSize: 12, fontFamily: F.mono },
  upgrade: { height: 42, borderRadius: R.ctl, borderWidth: 1, borderColor: C.accLine, backgroundColor: C.accSoft, alignItems: 'center', justifyContent: 'center' },
  upgradeText: { color: C.acc, fontSize: 14, ...font('600') },
  section: { color: C.t3, fontSize: 11, letterSpacing: 0.8, fontFamily: F.monoMedium },
  tile: { width: 28, height: 28, borderRadius: 8, backgroundColor: C.card2, alignItems: 'center', justifyContent: 'center' },
  mono: { color: C.t2, fontSize: 13, fontFamily: F.mono },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.acc },
  chevron: { color: C.t3, fontSize: 20, marginTop: -2 },
  external: { color: C.t3, fontSize: 14, ...font() },
  signOut: { color: C.danger, fontSize: 15, ...font() },
  about: { alignItems: 'center', gap: 8, paddingTop: 8 },
  aboutText: { color: C.t3, fontSize: 12, fontFamily: F.mono },
}));
