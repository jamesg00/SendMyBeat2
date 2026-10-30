import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/api/auth';
import * as api from '@/api/endpoints';
import { useRequest } from '@/api/use-request';
import { Avatar } from '@/components/producer';
import { Button, ListGroup, ListRow, Meter, Screen, styles as ui } from '@/components/ui';
import { C, F, font } from '@/theme';

const site = (path: string) => WebBrowser.openBrowserAsync(`https://www.sendmybeat.com${path}`);

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const sub = useRequest(api.subscriptionStatus);
  const yt = useRequest(api.youtubeStatus);
  const descriptions = useRequest(api.descriptions);
  const me = useRequest(api.myProducer);
  const reloadMe = me.reload;
  // Coming back from Edit profile shows the new picture and details.
  useFocusEffect(useCallback(() => reloadMe(), [reloadMe]));

  const plan = sub.data ? sub.data.plan.charAt(0).toUpperCase() + sub.data.plan.slice(1) : '…';

  return (
    <Screen title="Profile">
      <Pressable
        style={({ pressed }) => [s.profile, pressed && { opacity: 0.7 }]}
        onPress={() => (me.data ? router.push({ pathname: '/producer/[id]', params: { id: me.data.user_id } }) : undefined)}
        accessibilityRole="button"
        accessibilityLabel="Open your Spotlight profile">
        {me.data ? (
          <Avatar producer={me.data} size={52} />
        ) : (
          <View style={s.avatar} accessibilityRole="image" accessibilityLabel={user?.username}>
            <Text style={s.avatarText}>{user?.username.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={s.name}>{user?.username}</Text>
          <Text style={s.sub}>{plan} plan</Text>
        </View>
        <Button title="Edit profile" variant="secondary" size="sm" onPress={() => router.push('/profile-edit')} />
      </Pressable>

      {sub.data ? (
        <View style={{ gap: 8 }}>
          <Text style={ui.sectionLabel}>Usage today</Text>
          <View style={s.panel}>
            <Usage label="AI credits" left={sub.data.daily_credits_remaining} total={sub.data.daily_credits_total} />
            <Usage label="Uploads" left={sub.data.upload_credits_remaining} total={sub.data.upload_credits_total} last />
          </View>
        </View>
      ) : null}

      <View style={{ gap: 8 }}>
        <Text style={ui.sectionLabel}>Account</Text>
        <ListGroup>
          <ListRow
            title="YouTube"
            right={
              <View style={s.status}>
                {yt.data?.connected ? <View style={s.dot} /> : null}
                <Text style={s.sub}>{yt.loading ? '…' : yt.data?.connected ? 'Connected' : 'Not connected'}</Text>
                <Text style={ui.chevron}>›</Text>
              </View>
            }
            onPress={() => site('/dashboard')}
          />
          {me.data ? (
            <ListRow
              title="My Spotlight profile"
              onPress={() => router.push({ pathname: '/producer/[id]', params: { id: me.data!.user_id } })}
            />
          ) : null}
          <ListRow title="Plan and billing" value={plan} onPress={() => site('/dashboard')} />
          <ListRow
            title="Descriptions"
            right={
              <View style={s.status}>
                <Text style={s.mono}>{descriptions.data?.length ?? '–'}</Text>
                <Text style={ui.chevron}>›</Text>
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
    </Screen>
  );
}

function Usage({ label, left, total, last }: { label: string; left: number; total: number; last?: boolean }) {
  return (
    <View style={[s.usage, !last && { borderBottomWidth: 1, borderBottomColor: C.lineSoft }]}>
      <View style={s.usageHead}>
        <Text style={s.label}>{label}</Text>
        <Text style={s.mono}>
          {left} / {total}
        </Text>
      </View>
      <Meter value={total > 0 ? left / total : 0} />
    </View>
  );
}

const s = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: C.t2, fontSize: 20, ...font('600') },
  name: { color: C.text, fontSize: 18, letterSpacing: -0.3, ...font('600') },
  sub: { color: C.t2, fontSize: 13, ...font() },
  label: { color: C.text, fontSize: 14, ...font() },
  mono: { color: C.t2, fontSize: 13, fontFamily: F.mono },
  panel: { borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, overflow: 'hidden' },
  usage: { gap: 8, padding: 14 },
  usageHead: { flexDirection: 'row', justifyContent: 'space-between' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.acc },
  external: { color: C.t3, fontSize: 14, ...font() },
  signOut: { color: C.danger, fontSize: 15, ...font() },
});
