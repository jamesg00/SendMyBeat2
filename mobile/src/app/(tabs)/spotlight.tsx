import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import * as api from '@/api/endpoints';
import type { Producer } from '@/api/endpoints';
import { useRequest } from '@/api/use-request';
import { Avatar, isVerified, LikeButton, profileEditCount, rememberProducers, TopBeat, topBeatOf, VerifiedBadge } from '@/components/producer';
import { PlanCard, ProsGallery, usePlan } from '@/components/pros';
import { Button, Card, Screen, Segmented, useUiStyles } from '@/components/ui';
import { loadSocial, useSocial } from '@/state/social';
import { F, R, display, font, makeStyles, useColors } from '@/theme';

type Tab = 'community' | 'pros';

const points = (p: Producer) => p.spotlight_score ?? p.likes ?? 0;
const open = (p: Producer) => router.push({ pathname: '/producer/[id]', params: { id: p.user_id } });

const loadSpotlight = async () => {
  const res = await api.spotlight();
  rememberProducers([...res.featured_producers, ...res.trending_producers, ...res.new_producers, ...(res.all_producers ?? [])]);
  return res;
};

type Request<T> = ReturnType<typeof useRequest<T>>;

export default function SpotlightScreen() {
  const [tab, setTab] = useState<Tab>('community');
  const list = useRequest(loadSpotlight);
  const me = useRequest(api.myProducer);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    void loadSocial();
  }, []);

  const refreshList = list.refresh;
  const refreshMe = me.refresh;
  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshList(), refreshMe(), loadSocial(true)]);
    setRefreshing(false);
  }, [refreshList, refreshMe]);

  // Back from editing your profile: fetch again so your changes show.
  const seenEdits = useRef(profileEditCount());
  useFocusEffect(
    useCallback(() => {
      if (profileEditCount() === seenEdits.current) return;
      seenEdits.current = profileEditCount();
      void refreshList();
      void refreshMe();
    }, [refreshList, refreshMe]),
  );

  return (
    <Screen title="Spotlight" refreshing={refreshing} onRefresh={() => void refresh()}>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'community', label: 'Community' },
          { value: 'pros', label: 'Pros' },
        ]}
      />
      {tab === 'community' ? <Community list={list} me={me} /> : <Pros />}
    </Screen>
  );
}

function Community({ list, me }: { list: Request<api.Spotlight>; me: Request<Producer> }) {
  const C = useColors();
  const s = useStyles();
  const ui = useUiStyles();
  const { data, error, loading, reload } = list;
  const social = useSocial();

  if (loading) return <ActivityIndicator color={C.t2} style={{ alignSelf: 'flex-start' }} />;
  if (error || !data) {
    return (
      <Card>
        <Text style={s.error}>{error ?? 'Could not load Spotlight.'}</Text>
        <Button title="Try again" variant="secondary" size="md" onPress={reload} />
      </Card>
    );
  }

  // The server ranks all_producers by its trending score, so position = rank.
  const ranked = data.all_producers?.length ? data.all_producers : data.trending_producers;
  const star = data.featured_producers[0] ?? ranked[0];
  const trending = data.trending_producers.filter((p) => p.user_id !== star?.user_id).slice(0, 10);
  const top = ranked.slice(0, 10);
  const myRank = me.data ? ranked.findIndex((p) => p.user_id === me.data!.user_id) : -1;

  if (!star) return <Text style={s.muted}>No producers in Spotlight yet.</Text>;
  const notice = social.error ? <Text style={s.error}>{social.error}</Text> : null;

  return (
    <>
      {notice}
      <Featured producer={star} label={data.featured_producers[0] ? 'Producer of the week' : 'Top producer'} />

      {trending.length > 0 ? (
        <View style={{ gap: 10 }}>
          <View style={s.rowBetween}>
            <Text style={ui.sectionLabel}>Trending</Text>
            <Text style={s.muted}>Swipe</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: 10, paddingHorizontal: 20 }}>
            {trending.map((p, i) => (
              <Pressable
                key={p.user_id}
                onPress={() => open(p)}
                style={({ pressed }) => [s.trendCard, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityLabel={`${p.username}, trending number ${i + 1}`}>
                <Avatar producer={p} size={40} />
                <View style={s.nameRow}>
                  <Text style={s.trendName} numberOfLines={1}>
                    {p.username}
                  </Text>
                  {isVerified(p) ? <VerifiedBadge size={12} /> : null}
                </View>
                <Text style={s.mono}>
                  #{i + 1} · {points(p)} pts
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View>
        <View style={[s.rowBetween, { paddingBottom: 8 }]}>
          <Text style={ui.sectionLabel}>Leaderboard</Text>
          <Text style={s.muted}>{ranked.length} producers</Text>
        </View>
        {top.map((p, i) => (
          <LeaderRow key={p.user_id} producer={p} rank={i + 1} you={p.user_id === me.data?.user_id} last={i === top.length - 1 && myRank < 10} />
        ))}
        {me.data && myRank >= 10 ? <LeaderRow producer={ranked[myRank]} rank={myRank + 1} you last /> : null}
        {me.data && myRank < 0 ? (
          <View style={[s.leader, s.you, s.lastRow]}>
            <Text style={[s.rank, { color: C.text }]}>–</Text>
            <Text style={[s.leaderName, { ...font('600') }]}>You</Text>
            <Text style={s.muted}>Not ranked yet. Keep your streak going.</Text>
          </View>
        ) : null}
      </View>
    </>
  );
}

function Featured({ producer: p, label }: { producer: Producer; label: string }) {
  const s = useStyles();
  return (
    <View style={s.featured}>
      <Pressable onPress={() => open(p)} accessibilityRole="button" accessibilityLabel={`Open ${p.username}`}>
        <View style={s.banner} />
        <View style={s.featuredHead}>
          <View style={s.featuredAvatar}>
            <Avatar producer={p} size={56} />
          </View>
          <View style={{ flex: 1, gap: 2, paddingBottom: 2 }}>
            <View style={s.nameRow}>
              <Text style={s.featuredName} numberOfLines={1}>
                {p.username}
              </Text>
              {isVerified(p) ? <VerifiedBadge /> : null}
            </View>
            <Text style={s.sub}>
              {label}
              {p.spotlight_tier ? ` · ${p.spotlight_tier}` : ''}
            </Text>
          </View>
          <LikeButton producer={p} />
        </View>
      </Pressable>
      <View style={{ gap: 10, paddingHorizontal: 14, paddingBottom: 14 }}>
        {p.bio ? (
          <Text style={s.sub} numberOfLines={2}>
            {p.bio}
          </Text>
        ) : null}
        {topBeatOf(p) ? <TopBeat beat={topBeatOf(p)!} /> : null}
        <View style={s.chips}>
          {(p.tags ?? []).slice(0, 3).map((t) => (
            <Text key={t} style={s.chip}>
              {t}
            </Text>
          ))}
          {p.current_streak ? <Text style={s.chip}>{p.current_streak}d streak</Text> : null}
        </View>
      </View>
    </View>
  );
}

function LeaderRow({ producer: p, rank, you, last }: { producer: Producer; rank: number; you?: boolean; last?: boolean }) {
  const C = useColors();
  const s = useStyles();
  return (
    <Pressable
      onPress={() => open(p)}
      accessibilityRole="button"
      style={({ pressed }) => [s.leader, you && s.you, last && s.lastRow, pressed && { backgroundColor: C.card }]}>
      <Text style={[s.rank, (rank <= 3 || you) && { color: C.text }]}>{rank}</Text>
      <Avatar producer={p} size={28} />
      <View style={[s.nameRow, { flex: 1 }]}>
        <Text style={[s.leaderName, you && font('600')]} numberOfLines={1}>
          {you ? 'You' : p.username}
        </Text>
        {isVerified(p) ? <VerifiedBadge size={12} /> : null}
      </View>
      <Text style={[s.mono, you && { color: C.text }]}>{points(p)}</Text>
    </Pressable>
  );
}

// Pros: your plan (if you have one) above the gallery of producers.
function Pros() {
  const { plan, setPlan } = usePlan();
  return (
    <>
      {plan ? <PlanCard plan={plan} onChange={setPlan} /> : null}
      <ProsGallery />
    </>
  );
}

const useStyles = makeStyles((C) => ({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  muted: { color: C.t3, fontSize: 13, ...font() },
  sub: { color: C.t2, fontSize: 13, lineHeight: 18, ...font() },
  mono: { color: C.t2, fontSize: 12, fontFamily: F.mono },
  error: { color: C.danger, fontSize: 14, ...font() },
  cardTitle: { color: C.text, fontSize: 17, ...font('600') },
  featured: { borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, overflow: 'hidden' },
  banner: { height: 86, backgroundColor: C.card2, borderBottomWidth: 1, borderBottomColor: C.lineSoft },
  featuredHead: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, paddingHorizontal: 14, marginTop: -28, paddingBottom: 12 },
  featuredAvatar: { borderRadius: 32, borderWidth: 3, borderColor: C.card },
  featuredName: { color: C.text, fontSize: 18, flexShrink: 1, ...display },
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
  trendCard: { width: 132, gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  trendName: { color: C.text, fontSize: 14, flexShrink: 1, ...font('600') },
  leader: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 52, borderTopWidth: 1, borderTopColor: C.lineSoft },
  you: { backgroundColor: C.card, marginHorizontal: -20, paddingHorizontal: 20 },
  lastRow: { borderBottomWidth: 1, borderBottomColor: C.lineSoft },
  rank: { width: 22, color: C.t2, fontSize: 13, fontFamily: F.monoMedium },
  leaderName: { color: C.text, fontSize: 15, flexShrink: 1, ...font() },
}));
