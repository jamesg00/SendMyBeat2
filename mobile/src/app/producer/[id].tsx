import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as api from '@/api/endpoints';
import type { Producer, ProducerBeat } from '@/api/endpoints';
import { useRequest } from '@/api/use-request';
import { Avatar, followerCount, FollowButton, isVerified, knownProducer, LikeButton, openWebLink, TopBeat, topBeatOf, VerifiedBadge } from '@/components/producer';
import { styles as ui } from '@/components/ui';
import { loadSocial, useSocial } from '@/state/social';
import { C, F, R, font } from '@/theme';

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const SOCIAL_LABELS: Record<string, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  twitter: 'X',
  x: 'X',
  beatstars: 'BeatStars',
  soundcloud: 'SoundCloud',
  spotify: 'Spotify',
};

// A producer's Spotlight profile, opened from the Community tab as a sheet.
export default function ProducerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const stats = useRequest(() => api.producerStats(id));
  const social = useSocial();

  useEffect(() => {
    void loadSocial();
  }, []);
  const p: Producer | undefined = stats.data?.profile ?? knownProducer(id);

  if (!p) {
    return (
      <View style={[s.root, s.center]}>
        {stats.error ? <Text style={s.sub}>{stats.error}</Text> : <ActivityIndicator color={C.t2} />}
      </View>
    );
  }

  const st = stats.data?.stats;
  const perf = stats.data?.channel?.performance;
  const beats: ProducerBeat[] = (stats.data?.channel_top_beats?.length ? stats.data.channel_top_beats : stats.data?.top_beats) ?? [];
  const topBeat = topBeatOf(p);
  const socials = Object.entries(p.social_links ?? {}).filter((e): e is [string, string] => typeof e[1] === 'string' && /^https?:\/\//.test(e[1]));

  return (
    <ScrollView style={s.root} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
      {p.banner_url ? <Image source={{ uri: p.banner_url }} style={s.banner} contentFit="cover" /> : <View style={s.banner} />}
      <Pressable onPress={() => router.back()} style={[s.back, { top: 14 }]} accessibilityRole="button" accessibilityLabel="Close profile">
        <Text style={{ color: C.text, fontSize: 15, ...font('600') }}>✕</Text>
      </Pressable>

      <View style={s.body}>
        <View style={s.head}>
          <View style={s.avatarRing}>
            <Avatar producer={p} size={76} />
          </View>
          <View style={s.actions}>
            <LikeButton producer={p} size="md" />
            <FollowButton producer={p} />
          </View>
        </View>

        <View style={{ gap: 4 }}>
          <View style={s.nameRow}>
            <Text style={s.name}>{p.username}</Text>
            {isVerified(p) ? <VerifiedBadge size={16} /> : null}
          </View>
          <Text style={s.role}>
            {compact.format(followerCount(social, p))} followers{p.role_tag ? ` · ${p.role_tag}` : ''}
          </Text>
          {social.error ? <Text style={[s.sub, { color: C.danger }]}>{social.error}</Text> : null}
          {p.bio ? <Text style={s.sub}>{p.bio}</Text> : null}
          {socials.length > 0 ? (
            <View style={s.socials}>
              {socials.map(([key, url]) => (
                <Pressable key={key} onPress={() => openWebLink(url)} accessibilityRole="link" hitSlop={6}>
                  <Text style={s.social}>{SOCIAL_LABELS[key.toLowerCase()] ?? key} ↗</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        <View style={s.stats}>
          <Stat label="Tier" value={p.spotlight_tier ?? '–'} />
          <Stat label="Score" value={String(p.spotlight_score ?? 0)} mono divider />
          <Stat label="Streak" value={`${st?.current_streak ?? p.current_streak ?? 0}d`} mono divider />
          <Stat label="Best" value={`${st?.longest_streak ?? 0}d`} mono divider />
        </View>

        {perf?.subscriber_count ? (
          <Text style={s.sub}>
            YouTube: <Text style={s.mono}>{compact.format(perf.subscriber_count)}</Text> subscribers ·{' '}
            <Text style={s.mono}>{compact.format(perf.total_views ?? 0)}</Text> views
          </Text>
        ) : null}

        {topBeat ? (
          <View style={{ gap: 8 }}>
            <Text style={ui.sectionLabel}>Top beat</Text>
            <TopBeat beat={topBeat} />
          </View>
        ) : null}

        {(p.tags ?? []).length > 0 ? (
          <View style={s.chips}>
            {(p.tags ?? []).slice(0, 6).map((t) => (
              <Text key={t} style={s.chip}>
                {t}
              </Text>
            ))}
          </View>
        ) : null}

        <View>
          <Text style={[ui.sectionLabel, { paddingBottom: 8 }]}>Latest uploads</Text>
          {stats.loading ? (
            <ActivityIndicator color={C.t2} style={{ alignSelf: 'flex-start' }} />
          ) : beats.filter((b) => b.url).length === 0 ? (
            <Text style={s.muted}>No YouTube channel linked yet.</Text>
          ) : (
            beats
              .filter((b) => b.url)
              .map((b, i, arr) => (
                <Pressable
                  key={b.url ?? i}
                  onPress={() => openWebLink(b.url)}
                  accessibilityRole="link"
                  style={({ pressed }) => [s.video, i === arr.length - 1 && s.lastRow, pressed && { backgroundColor: C.card }]}>
                  {b.thumbnail ? <Image source={{ uri: b.thumbnail }} style={s.thumb} contentFit="cover" /> : null}
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={s.videoTitle} numberOfLines={2}>
                      {b.title}
                    </Text>
                    {b.published_at ? <Text style={s.mono}>{new Date(b.published_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</Text> : null}
                  </View>
                  {b.views != null ? <Text style={s.mono}>{compact.format(b.views)}</Text> : null}
                </Pressable>
              ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function Stat({ label, value, mono, divider }: { label: string; value: string; mono?: boolean; divider?: boolean }) {
  return (
    <View style={[s.stat, divider && s.statDivider]}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statValue, mono && { fontFamily: F.monoMedium }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  banner: { height: 150, backgroundColor: '#111111', borderBottomWidth: 1, borderBottomColor: C.lineSoft },
  back: {
    position: 'absolute',
    right: 16,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { paddingHorizontal: 20, gap: 18 },
  head: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -36 },
  avatarRing: { borderRadius: 42, borderWidth: 4, borderColor: C.bg },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: C.text, fontSize: 22, letterSpacing: -0.4, ...font('600') },
  role: { color: C.t2, fontSize: 12, fontFamily: F.mono },
  sub: { color: C.t2, fontSize: 14, lineHeight: 20, ...font() },
  muted: { color: C.t3, fontSize: 13, ...font() },
  mono: { color: C.t2, fontSize: 12.5, fontFamily: F.mono },
  socials: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingTop: 4 },
  social: { color: C.text, fontSize: 13, ...font() },
  stats: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.lineSoft },
  stat: { flex: 1, paddingVertical: 12, gap: 3 },
  statDivider: { borderLeftWidth: 1, borderLeftColor: C.lineSoft, paddingLeft: 10 },
  statLabel: { color: C.t2, fontSize: 11, ...font() },
  statValue: { color: C.text, fontSize: 16, ...font('600') },
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
  video: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.lineSoft },
  thumb: { width: 72, height: 40, borderRadius: 6, backgroundColor: '#1A1A1A' },
  videoTitle: { color: C.text, fontSize: 14, lineHeight: 19, ...font() },
  lastRow: { borderBottomWidth: 1, borderBottomColor: C.lineSoft },
});
