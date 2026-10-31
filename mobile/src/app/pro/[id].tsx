import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as api from '@/api/endpoints';
import type { TitlePatterns } from '@/api/endpoints';
import { useRequest } from '@/api/use-request';
import { openWebLink } from '@/components/producer';
import { copyPro, ProPhoto, usePlan } from '@/components/pros';
import { Button, Segmented, useUiStyles } from '@/components/ui';
import { F, R, display, font, makeStyles, useColors } from '@/theme';

// A pro producer's page: who they are, what they did, and how your channel compares.
const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

export default function ProScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useStyles();
  const C = useColors();
  const ui = useUiStyles();
  const insets = useSafeAreaInsets();
  const pro = useRequest(() => api.pro(id));
  const { plan } = usePlan();
  const [tab, setTab] = useState<'about' | 'analyze'>('about');

  if (!pro.data) {
    return (
      <View style={[s.root, s.center]}>
        {pro.error ? <Text style={s.sub}>{pro.error}</Text> : <ActivityIndicator color={C.t2} />}
      </View>
    );
  }
  const p = pro.data;
  const following = plan?.pro_id === p.id;

  return (
    <ScrollView style={s.root} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
      <ProPhoto pro={p} height={260} />
      <Pressable onPress={() => router.back()} style={s.close} accessibilityRole="button" accessibilityLabel="Close">
        <Text style={{ color: C.text, fontSize: 15, ...font('600') }}>✕</Text>
      </Pressable>

      <View style={s.body}>
        <View style={{ gap: 4 }}>
          <Text style={s.name} accessibilityRole="header">
            {p.name}
          </Text>
          <Text style={s.mono}>
            {[p.channel_title, p.subscribers ? `${compact.format(p.subscribers)} subscribers` : null, p.total_views ? `${compact.format(p.total_views)} views` : null]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          <Text style={s.sub}>{p.tagline}</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button title={following ? 'Your plan is on' : 'Copy their style'} size="md" onPress={() => copyPro(p.id)} style={{ flex: 1 }} />
          <Button title="YouTube ↗" variant="secondary" size="md" onPress={() => openWebLink(p.channel_url)} />
        </View>

        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'about', label: 'About' },
            { value: 'analyze', label: 'Analyze' },
          ]}
        />

        {tab === 'about' ? (
          <>
            {p.why ? (
              <View style={s.why}>
                <Text style={s.moveNum}>WHY THEY BLEW UP</Text>
                <Text style={s.whyText}>{p.why}</Text>
              </View>
            ) : null}

            <View style={{ gap: 8 }}>
              <Text style={ui.sectionLabel}>About</Text>
              {p.story.map((line) => (
                <Text key={line} style={s.para}>
                  {line}
                </Text>
              ))}
            </View>

            <View>
              <Text style={[ui.sectionLabel, { paddingBottom: 8 }]}>Notable</Text>
              {p.notable.map((n, i) => (
                <View key={n.text} style={[s.row, i === p.notable.length - 1 && s.rowLast]}>
                  <Text style={s.year}>{n.year || '–'}</Text>
                  <Text style={s.rowText}>{n.text}</Text>
                </View>
              ))}
            </View>

            <View style={{ gap: 8 }}>
              <Text style={ui.sectionLabel}>How they did it</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
                {p.moves.map((m, i) => (
                  <View key={m.id} style={s.move}>
                    <Text style={s.moveNum}>{String(i + 1).padStart(2, '0')}</Text>
                    <Text style={s.moveTitle}>{m.title}</Text>
                    <Text style={s.moveBody}>{m.body}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            {p.latest_uploads.length ? (
              <View>
                <Text style={[ui.sectionLabel, { paddingBottom: 8 }]}>Latest uploads</Text>
                {p.latest_uploads.slice(0, 5).map((u, i) => (
                  <Pressable
                    key={u.video_id}
                    onPress={() => openWebLink(`https://www.youtube.com/watch?v=${u.video_id}`)}
                    style={[s.upload, i === 4 && s.rowLast]}
                    accessibilityRole="link">
                    {u.thumbnail ? <Image source={{ uri: u.thumbnail }} style={s.thumb} contentFit="cover" /> : <View style={s.thumb} />}
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={s.rowText} numberOfLines={2}>
                        {u.title}
                      </Text>
                      <Text style={s.mono}>{u.views != null ? `${compact.format(u.views)} views` : ''}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <View style={{ gap: 6 }}>
              <Text style={ui.sectionLabel}>Sources</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
                {p.sources.map((src) => (
                  <Pressable key={src.url} onPress={() => openWebLink(src.url)} accessibilityRole="link" hitSlop={6}>
                    <Text style={s.link}>{src.label} ↗</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={s.fine}>Photo and stats from {p.name}’s YouTube channel.</Text>
            </View>
          </>
        ) : (
          <Analyze id={p.id} name={p.name} />
        )}
      </View>
    </ScrollView>
  );
}

const pct = (v: number | null) => (v == null ? '–' : `${v}%`);

// Their last 50 uploads beside yours (your SendMyBeat uploads).
function Analyze({ id, name }: { id: string; name: string }) {
  const s = useStyles();
  const C = useColors();
  const ui = useUiStyles();
  const res = useRequest(() => api.analyzePro(id));
  if (!res.data) return res.error ? <Text style={s.sub}>{res.error}</Text> : <ActivityIndicator color={C.t2} style={{ alignSelf: 'flex-start' }} />;
  const { them, you } = res.data;
  const rows: [string, (p: TitlePatterns) => string][] = [
    ['Uploads a week', (p) => (p.per_week == null ? '–' : String(p.per_week))],
    ['Lead with the artist', (p) => pct(p.lead_artist_pct)],
    ['Beat name in quotes', (p) => pct(p.quotes_pct)],
    ['Year in the title', (p) => pct(p.year_pct)],
    ['Two artists ("A x B")', (p) => pct(p.pair_pct)],
  ];
  const most = Math.max(1, ...them.weekdays);

  return (
    <>
      <View>
        <View style={[s.compare, { paddingBottom: 8 }]}>
          <Text style={[ui.sectionLabel, { flex: 1.4 }]}>You vs {name}</Text>
          <Text style={s.compareHead}>You</Text>
          <Text style={s.compareHead}>Them</Text>
        </View>
        {rows.map(([label, read], i) => (
          <View key={label} style={[s.compare, s.row, i === rows.length - 1 && s.rowLast]}>
            <Text style={[s.rowText, { flex: 1.4 }]}>{label}</Text>
            <Text style={s.compareVal}>{read(you)}</Text>
            <Text style={s.compareVal}>{read(them)}</Text>
          </View>
        ))}
        <Text style={[s.fine, { paddingTop: 8 }]}>
          Them: their last {them.uploads} uploads. You: your {you.uploads} uploads through SendMyBeat.
        </Text>
      </View>

      {them.uploads ? (
        <View style={{ gap: 8 }}>
          <Text style={ui.sectionLabel}>When they upload</Text>
          <View style={s.week}>
            {them.weekdays.map((n, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                <View style={{ height: 56, width: '100%', justifyContent: 'flex-end' }}>
                  <View style={{ height: `${Math.max(6, (n / most) * 100)}%`, backgroundColor: n === most ? C.text : C.wave, borderRadius: 3 }} />
                </View>
                <Text style={s.mono}>{'MTWTFSS'.charAt(i)}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </>
  );
}

const useStyles = makeStyles((C) => ({
  root: { flex: 1, backgroundColor: C.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  close: {
    position: 'absolute',
    right: 16,
    top: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.card2,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { paddingHorizontal: 20, paddingTop: 16, gap: 20 },
  name: { color: C.text, fontSize: 32, lineHeight: 36, letterSpacing: -0.6, ...display },
  sub: { color: C.t2, fontSize: 14.5, lineHeight: 21, ...font() },
  para: { color: C.text, fontSize: 14.5, lineHeight: 21, ...font() },
  mono: { color: C.t3, fontSize: 12, fontFamily: F.mono },
  fine: { color: C.t3, fontSize: 12, ...font() },
  link: { color: C.text, fontSize: 13.5, ...font('500') },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 46, borderTopWidth: 1, borderTopColor: C.lineSoft },
  rowLast: { borderBottomWidth: 1, borderBottomColor: C.lineSoft },
  rowText: { flex: 1, color: C.text, fontSize: 14, lineHeight: 19, ...font() },
  year: { width: 40, color: C.t3, fontSize: 12, fontFamily: F.monoMedium },
  move: { width: 168, padding: 12, gap: 6, borderRadius: R.card, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  why: { padding: 14, gap: 6, borderRadius: R.card, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  whyText: { color: C.text, fontSize: 18, lineHeight: 24, letterSpacing: -0.2, ...display },
  moveNum: { color: C.acc, fontSize: 11, fontFamily: F.monoMedium },
  moveTitle: { color: C.text, fontSize: 14, ...font('600') },
  moveBody: { color: C.t2, fontSize: 12.5, lineHeight: 17, ...font() },
  upload: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.lineSoft },
  thumb: { width: 96, height: 54, borderRadius: 6, backgroundColor: C.card2 },
  compare: { flexDirection: 'row', alignItems: 'center' },
  compareHead: { flex: 1, textAlign: 'right', color: C.t2, fontSize: 12, ...font() },
  compareVal: { flex: 1, textAlign: 'right', color: C.text, fontSize: 14, fontFamily: F.mono },
  week: { flexDirection: 'row', gap: 6 },
}));
