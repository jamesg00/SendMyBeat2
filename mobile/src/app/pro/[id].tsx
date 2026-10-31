import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line, Rect } from 'react-native-svg';

import * as api from '@/api/endpoints';
import type { ProBreakdown, ProDetail, StyleMatch, TitlePatterns } from '@/api/endpoints';
import { useRequest } from '@/api/use-request';
import { openWebLink } from '@/components/producer';
import { copyPro, ProHero, Ring, usePlan } from '@/components/pros';
import { Button, Segmented, useUiStyles } from '@/components/ui';
import { F, R, display, font, makeStyles, useColors } from '@/theme';

// A pro producer's page: why they blew up, how their channel works, and how close you are to their style.
const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
type Tab = 'story' | 'breakdown' | 'you';

export default function ProScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useStyles();
  const C = useColors();
  const insets = useSafeAreaInsets();
  const pro = useRequest(() => api.pro(id));
  const { plan } = usePlan();
  const [tab, setTab] = useState<Tab>('story');

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
    <View style={s.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 110 }} showsVerticalScrollIndicator={false}>
        <ProHero pro={p} height={380}>
          <Text style={s.name} accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit>
            {p.name}
          </Text>
          <Text style={s.mono}>
            {[p.channel_title, p.subscribers ? `${compact.format(p.subscribers)} subscribers` : null, p.total_views ? `${compact.format(p.total_views)} views` : null]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </ProHero>

        <View style={s.body}>
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'story', label: 'Story' },
              { value: 'breakdown', label: 'Breakdown' },
              { value: 'you', label: 'You vs them' },
            ]}
          />
          {tab === 'story' ? <Story p={p} /> : tab === 'breakdown' ? <Breakdown p={p} /> : <YouVsThem p={p} />}
        </View>
      </ScrollView>

      <Pressable onPress={() => router.back()} style={[s.close, { top: 14 }]} accessibilityRole="button" accessibilityLabel="Close">
        <Text style={{ color: C.text, fontSize: 15, ...font('600') }}>✕</Text>
      </Pressable>
      <View style={[s.dock, { paddingBottom: insets.bottom + 12 }]}>
        <Button title={following ? 'Your plan is on' : `Copy ${p.name}’s style`} onPress={() => copyPro(p.id)} style={{ flex: 1 }} />
        <Button title="YouTube ↗" variant="secondary" onPress={() => openWebLink(p.channel_url)} />
      </View>
    </View>
  );
}

// ---- Story: why they blew up, then how it happened.

function Story({ p }: { p: ProDetail }) {
  const s = useStyles();
  const C = useColors();
  const ui = useUiStyles();
  return (
    <>
      {p.why ? (
        <View style={s.quote}>
          <Text style={s.kicker}>WHY THEY BLEW UP</Text>
          <Text style={s.quoteText}>{p.why}</Text>
        </View>
      ) : null}

      <View>
        <Text style={[ui.sectionLabel, { paddingBottom: 10 }]}>How it happened</Text>
        {p.story.map((line, i) => {
          const last = i === p.story.length - 1;
          return (
            <View key={line} style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ alignItems: 'center', width: 14 }}>
                <View style={[s.node, last && { backgroundColor: C.acc, borderColor: C.acc }]} />
                {!last ? <View style={s.spine} /> : null}
              </View>
              <Text style={[s.para, { flex: 1, paddingBottom: last ? 0 : 16 }]}>{line}</Text>
            </View>
          );
        })}
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
        <Text style={ui.sectionLabel}>Their moves</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
          {p.moves.map((m, i) => (
            <Pressable key={m.id} onPress={() => copyPro(p.id, [m.id])} style={s.move} accessibilityRole="button" accessibilityHint="Starts a plan with this move">
              <Text style={s.kicker}>{String(i + 1).padStart(2, '0')}</Text>
              <Text style={s.moveTitle}>{m.title}</Text>
              <Text style={s.moveBody}>{m.body}</Text>
              <Text style={[s.kicker, { marginTop: 'auto' }]}>COPY →</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {p.latest_uploads.length ? (
        <View>
          <Text style={[ui.sectionLabel, { paddingBottom: 8 }]}>Latest uploads</Text>
          {p.latest_uploads.slice(0, 5).map((u, i, all) => (
            <Pressable
              key={u.video_id}
              onPress={() => openWebLink(`https://www.youtube.com/watch?v=${u.video_id}`)}
              style={[s.upload, i === all.length - 1 && s.rowLast]}
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
        <Text style={s.fine}>
          {p.photo_source === 'press' ? `Photo: ${p.photo_credit ?? 'press photo, used with permission'}. ` : ''}
          Stats and uploads from {p.name}’s YouTube channel.
        </Text>
      </View>
    </>
  );
}

// ---- Breakdown: how their channel works, from their last 50 uploads.

// Split a type-beat title into the parts the formula is made of.
function anatomy(title: string): { text: string; kind: 'artist' | 'formula' | 'name' | 'rest' }[] {
  const m = title.match(/^(.*?)\s+(type\s+beat)\b(.*)$/i);
  if (!m) return [{ text: title, kind: 'rest' }];
  const parts: { text: string; kind: 'artist' | 'formula' | 'name' | 'rest' }[] = [];
  m[1].split(/\s+(x|X|×|&)\s+/).forEach((chunk) => {
    if (!chunk.trim()) return;
    parts.push({ text: chunk.trim(), kind: /^(x|×|&)$/i.test(chunk.trim()) ? 'rest' : 'artist' });
  });
  parts.push({ text: m[2], kind: 'formula' });
  const tail = m[3].trim();
  const quoted = tail.match(/["“](.+?)["”]/);
  if (quoted) parts.push({ text: `"${quoted[1]}"`, kind: 'name' });
  else if (tail) parts.push({ text: tail.replace(/^[-–|]\s*/, ''), kind: 'rest' });
  return parts;
}

function Breakdown({ p }: { p: ProDetail }) {
  const s = useStyles();
  const C = useColors();
  const ui = useUiStyles();
  const b = p.breakdown;
  const t = p.patterns;
  if (!t.uploads) return <Text style={s.sub}>Their uploads haven’t loaded from YouTube yet. Check back soon.</Text>;
  const example = b.breakouts[0]?.title ?? p.latest_uploads[0]?.title ?? '';
  const chip = { artist: [C.accSoft, C.acc], formula: [C.card2, C.text], name: [C.card2, C.t2], rest: ['transparent', C.t3] } as const;
  const bars: [string, number | null][] = [
    ['Artist named first', t.lead_artist_pct],
    ['Two artists paired', t.pair_pct],
    ['Beat name in quotes', t.quotes_pct],
    ['Year in the title', t.year_pct],
  ];

  return (
    <>
      <View style={s.panel}>
        <Text style={s.panelLabel}>Title anatomy</Text>
        {example ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
            {anatomy(example).map((part, i) => (
              <Text key={i} style={[s.part, { backgroundColor: chip[part.kind][0], color: chip[part.kind][1] }]}>
                {part.text}
              </Text>
            ))}
          </View>
        ) : null}
        <View style={{ gap: 10 }}>
          {bars.map(([label, value]) => (
            <View key={label} style={{ gap: 4 }}>
              <View style={s.rowBetween}>
                <Text style={s.barLabel}>{label}</Text>
                <Text style={s.barValue}>{value == null ? '–' : `${value}%`}</Text>
              </View>
              <View style={s.track}>
                <View style={{ width: `${value ?? 0}%`, height: 4, borderRadius: 2, backgroundColor: C.acc }} />
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={s.panel}>
        <View style={s.rowBetween}>
          <Text style={s.panelLabel}>Views per upload</Text>
          {b.top_share_pct != null ? (
            <Text style={s.callout}>
              {b.breakouts.length} uploads = {b.top_share_pct}% of views
            </Text>
          ) : null}
        </View>
        <ViewsChart b={b} />
        {b.breakouts.map((u) => (
          <Pressable
            key={u.video_id}
            onPress={() => openWebLink(`https://www.youtube.com/watch?v=${u.video_id}`)}
            style={s.breakout}
            accessibilityRole="link">
            <Text style={[s.rowText, { fontSize: 13 }]} numberOfLines={1}>
              {u.title}
            </Text>
            <Text style={s.barValue}>
              {compact.format(u.views)}
              {u.times_median ? ` · ${u.times_median}×` : ''}
            </Text>
          </Pressable>
        ))}
        <Text style={s.fine}>
          × = times their typical upload ({compact.format(b.median_views)} views). Their hits are what to study.
        </Text>
      </View>

      <View style={{ gap: 8 }}>
        <View style={s.rowBetween}>
          <Text style={ui.sectionLabel}>When they upload</Text>
          <Text style={s.mono}>{t.per_week != null ? `${t.per_week} a week` : ''}</Text>
        </View>
        <Heatmap t={t} />
        <Text style={s.fine}>Night · morning · afternoon · evening, UTC.</Text>
      </View>
    </>
  );
}

function ViewsChart({ b }: { b: ProBreakdown }) {
  const C = useColors();
  const { width } = useWindowDimensions();
  const w = width - 40 - 32;
  const h = 110;
  const n = Math.max(1, b.views.length);
  const top = Math.max(1, ...b.views);
  const slot = w / n;
  const breakouts = new Set(b.breakout_index);
  return (
    <Svg width={w} height={h} accessibilityLabel="Views per upload; the brightest bars are their breakout uploads">
      <Line x1={0} y1={h - 1} x2={w} y2={h - 1} stroke={C.lineSoft} />
      {b.views.map((v, i) => {
        const bh = Math.max(3, (v / top) * (h - 6));
        return (
          <Rect
            key={i}
            x={i * slot + slot * 0.15}
            y={h - 1 - bh}
            width={Math.max(2, slot * 0.7)}
            height={bh}
            rx={Math.min(2, slot * 0.3)}
            fill={breakouts.has(i) ? C.acc : C.wave}
          />
        );
      })}
    </Svg>
  );
}

function Heatmap({ t }: { t: TitlePatterns }) {
  const s = useStyles();
  const C = useColors();
  const grid = t.heatmap ?? [];
  const most = Math.max(1, ...grid.flat());
  return (
    <View style={{ gap: 4 }}>
      {grid.map((row, d) => (
        <View key={d} style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
          <Text style={[s.mono, { width: 16 }]}>{'MTWTFSS'.charAt(d)}</Text>
          {row.map((n, i) => (
            <View key={i} style={{ flex: 1, height: 16, borderRadius: 4, backgroundColor: n ? C.acc : C.card2, opacity: n ? 0.25 + 0.75 * (n / most) : 1 }} />
          ))}
        </View>
      ))}
    </View>
  );
}

// ---- You vs them: your style match and the gaps worth closing.

function YouVsThem({ p }: { p: ProDetail }) {
  const s = useStyles();
  const C = useColors();
  const ui = useUiStyles();
  const res = useRequest(() => api.analyzePro(p.id));
  if (!res.data) return res.error ? <Text style={s.sub}>{res.error}</Text> : <ActivityIndicator color={C.t2} style={{ alignSelf: 'flex-start' }} />;
  const r: StyleMatch = res.data;

  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
        <Ring value={(r.match ?? 0) / 100} size={112} stroke={10} label={r.match != null ? `${r.match}%` : '–'} sub="match" />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={s.verdict}>
            {r.match == null
              ? 'Upload through SendMyBeat to see your match'
              : r.match >= 85
                ? `You already upload like ${p.name}`
                : r.match >= 60
                  ? `You’re close to ${p.name}’s style`
                  : r.match >= 35
                    ? `You’re halfway to ${p.name}’s style`
                    : `${p.name} works very differently`}
          </Text>
          <Text style={s.fine}>
            Your {r.you.uploads} SendMyBeat uploads vs their last {r.them.uploads}.
          </Text>
        </View>
      </View>

      <View style={{ gap: 16 }}>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <Legend color={C.text} label="You" />
          <Legend color={C.acc} label={p.name} />
        </View>
        {r.traits.map((t) => (
          <View key={t.id} style={{ gap: 8 }}>
            <View style={s.rowBetween}>
              <Text style={s.barLabel}>{t.label}</Text>
              <Text style={s.barValue}>
                {fmt(t.id, t.you)} vs {fmt(t.id, t.them)}
              </Text>
            </View>
            <View style={[s.track, { height: 6 }]}>
              <View style={[s.dotMark, { left: `${t.them_pos * 100}%`, backgroundColor: C.acc }]} />
              <View style={[s.dotMark, { left: `${t.you_pos * 100}%`, backgroundColor: C.text, borderColor: C.bg, borderWidth: 2 }]} />
            </View>
          </View>
        ))}
      </View>

      {r.gaps.length ? (
        <View style={s.panel}>
          <Text style={s.kicker}>BIGGEST GAPS</Text>
          {r.gaps.map((g) => (
            <View key={g.trait} style={[s.rowBetween, { minHeight: 44 }]}>
              <Text style={[s.rowText, { flex: 1 }]}>{gapText(g.trait, p.name)}</Text>
              {g.move_id ? (
                <Pressable onPress={() => copyPro(p.id, [g.move_id as string])} style={s.copyPill} accessibilityRole="button" accessibilityLabel={`Copy: ${g.move}`}>
                  <Text style={s.copyPillText}>Copy</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      ) : r.match != null ? (
        <Text style={ui.sectionLabel}>No big gaps. Keep going.</Text>
      ) : null}
    </>
  );
}

const fmt = (id: string, v: number | null) => (v == null ? '–' : id === 'per_week' ? `${v}/wk` : `${v}%`);
const gapText = (trait: string, name: string) =>
  ({
    per_week: `Upload as often as ${name}`,
    lead_artist: 'Put the artist’s name first',
    pair: 'Pair two artists in the title',
    quotes: 'Put the beat name in quotes',
  })[trait] ?? trait;

function Legend({ color, label }: { color: string; label: string }) {
  const s = useStyles();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text style={s.fine}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles((C) => ({
  root: { flex: 1, backgroundColor: C.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  close: {
    position: 'absolute',
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.bg,
    opacity: 0.9,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: C.bg,
    borderTopWidth: 1,
    borderTopColor: C.lineSoft,
  },
  body: { paddingHorizontal: 20, paddingTop: 8, gap: 22 },
  name: { color: C.text, fontSize: 46, lineHeight: 50, letterSpacing: -1.5, ...display },
  sub: { color: C.t2, fontSize: 14.5, lineHeight: 21, ...font() },
  para: { color: C.text, fontSize: 14.5, lineHeight: 21, ...font() },
  mono: { color: C.t2, fontSize: 12, fontFamily: F.mono },
  fine: { color: C.t3, fontSize: 12, lineHeight: 17, ...font() },
  link: { color: C.text, fontSize: 13.5, ...font('500') },
  kicker: { color: C.acc, fontSize: 11, letterSpacing: 0.4, fontFamily: F.monoMedium },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  quote: { padding: 16, gap: 8, borderRadius: 16, borderWidth: 1, borderColor: C.accLine, backgroundColor: C.accSoft },
  quoteText: { color: C.text, fontSize: 21, lineHeight: 27, letterSpacing: -0.3, ...display },
  node: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: C.line, backgroundColor: C.bg, marginTop: 4 },
  spine: { flex: 1, width: 2, backgroundColor: C.lineSoft, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 46, borderTopWidth: 1, borderTopColor: C.lineSoft },
  rowLast: { borderBottomWidth: 1, borderBottomColor: C.lineSoft },
  rowText: { flex: 1, color: C.text, fontSize: 14, lineHeight: 19, ...font() },
  year: { width: 40, color: C.t3, fontSize: 12, fontFamily: F.monoMedium },
  move: { width: 176, minHeight: 150, padding: 14, gap: 6, borderRadius: 16, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  moveTitle: { color: C.text, fontSize: 15, ...display },
  moveBody: { color: C.t2, fontSize: 12.5, lineHeight: 17, ...font() },
  upload: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.lineSoft },
  thumb: { width: 96, height: 54, borderRadius: 6, backgroundColor: C.card2 },
  panel: { padding: 16, gap: 12, borderRadius: 16, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  panelLabel: { color: C.t2, fontSize: 13, ...font('500') },
  part: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6, fontSize: 13, fontFamily: F.monoMedium, overflow: 'hidden' },
  barLabel: { color: C.t2, fontSize: 13, ...font() },
  barValue: { color: C.text, fontSize: 12.5, fontFamily: F.monoMedium },
  track: { height: 4, borderRadius: 3, backgroundColor: C.lineSoft, justifyContent: 'center' },
  callout: { color: C.acc, fontSize: 14, ...display },
  breakout: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 32 },
  verdict: { color: C.text, fontSize: 20, lineHeight: 25, letterSpacing: -0.3, ...display },
  dotMark: { position: 'absolute', width: 16, height: 16, marginLeft: -8, borderRadius: 8 },
  copyPill: { minHeight: 34, paddingHorizontal: 14, borderRadius: 17, justifyContent: 'center', borderWidth: 1, borderColor: C.accLine, backgroundColor: C.accSoft },
  copyPillText: { color: C.acc, fontSize: 13, ...font('600') },
  input: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: R.ctl,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.bg,
    color: C.text,
    fontSize: 14,
    ...font(),
  },
}));
