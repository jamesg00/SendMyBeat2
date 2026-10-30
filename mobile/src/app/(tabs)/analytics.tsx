import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

import * as api from '@/api/endpoints';
import type { ChannelAnalytics, ChannelVideo, VideoReview } from '@/api/endpoints';
import { Button, Card, JobProgress, Screen, useUiStyles } from '@/components/ui';
import { F, R, font, makeStyles, useColors } from '@/theme';

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const list = (x: unknown) => (Array.isArray(x) ? x.filter((s): s is string => typeof s === 'string' && s.trim() !== '') : []);
const pct = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(Math.round(v))}%`;
const day = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : '');

type Upload = ChannelVideo & { views: number; review?: VideoReview; n: number };

export default function AnalyticsScreen() {
  const C = useColors();
  const s = useStyles();
  const ui = useUiStyles();
  const [data, setData] = useState<ChannelAnalytics | null>(null);
  const [job, setJob] = useState<{ startedAt: number; progress: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  const analyze = async () => {
    setJob({ startedAt: Date.now(), progress: 0 });
    setError(null);
    try {
      setData(await api.analyzeChannel((progress) => setJob((j) => j && { ...j, progress })));
      setSelected(null);
      setOpen(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Channel analysis failed.');
    } finally {
      setJob(null);
    }
  };

  // The server lists uploads newest first and numbers its reviews the same way (1 = newest).
  const reviews = data?.insights?.video_reviews ?? [];
  const newestFirst: Upload[] = (data?.recent_videos ?? []).map((v, i) => ({
    ...v,
    views: v.views ?? 0,
    n: i + 1,
    review: reviews.find((r) => r.index === i + 1),
  }));
  const uploads = [...newestFirst].reverse(); // oldest → newest for the chart
  const avg = uploads.length ? uploads.reduce((a, v) => a + v.views, 0) / uploads.length : 0;
  const half = Math.floor(uploads.length / 2);
  const older = uploads.slice(0, half);
  const newer = uploads.slice(uploads.length - half);
  const mean = (xs: Upload[]) => (xs.length ? xs.reduce((a, v) => a + v.views, 0) / xs.length : 0);
  const trend = half > 0 && mean(older) > 0 ? ((mean(newer) - mean(older)) / mean(older)) * 100 : null;

  const sel = selected ?? uploads.length - 1;
  const current = uploads[sel];
  const health = typeof data?.insights?.channel_health_score === 'string' ? data.insights.channel_health_score : '';
  const patterns = data?.insights?.title_patterns;
  const fixes = [...list(data?.insights?.critical_issues), ...list(data?.insights?.immediate_actions)];

  return (
    <Screen
      title="Analytics"
      accessory={data && !job ? <Button title="Refresh" variant="secondary" size="sm" onPress={analyze} /> : null}>
      {data ? (
        <>
          <Text style={s.channel}>
            {data.channel_name} · {compact.format(data.subscriber_count)} subscribers
          </Text>

          {current ? (
            <View style={{ gap: 14 }}>
              <View style={{ gap: 6 }}>
                <View style={s.rowBetween}>
                  <Text style={ui.sectionLabel}>
                    {sel === uploads.length - 1 ? 'Latest upload' : `Upload ${uploads.length - sel} of ${uploads.length}`} · {day(current.published_at)}
                  </Text>
                  {trend !== null ? (
                    <Text style={[s.trend, { color: trend >= 0 ? C.acc : C.danger }]}>
                      {trend >= 0 ? '↗' : '↘'} {pct(trend)} recent
                    </Text>
                  ) : null}
                </View>
                <View style={s.heroRow}>
                  <Text style={s.hero}>{compact.format(current.views)}</Text>
                  <Text style={s.heroUnit}>views</Text>
                  {avg > 0 ? (
                    <Text style={[s.delta, { color: current.views >= avg ? C.acc : C.danger }]}>
                      {pct(((current.views - avg) / avg) * 100)} vs avg
                    </Text>
                  ) : null}
                </View>
                <Text style={s.heroTitle} numberOfLines={2}>
                  {current.title}
                </Text>
              </View>
              <ViewsChart uploads={uploads} avg={avg} selected={sel} onSelect={setSelected} />
              <Text style={s.hint}>Drag across the chart to see each upload.</Text>
            </View>
          ) : null}

          {health ? (
            <View style={s.healthRow}>
              <Text style={s.healthScore}>{health.split(/\s[-–]\s/)[0]}</Text>
              <Text style={s.healthText}>{health.split(/\s[-–]\s/).slice(1).join(' – ') || 'Channel health'}</Text>
            </View>
          ) : null}

          {patterns?.winning || patterns?.losing ? (
            <View style={s.panel}>
              {patterns.winning ? <Pattern color={C.acc} label="Titles that win" text={patterns.winning} /> : null}
              {patterns.losing ? <Pattern color={C.danger} label="Titles that lose" text={patterns.losing} last /> : null}
            </View>
          ) : null}

          {newestFirst.length > 0 ? (
            <View>
              <Text style={[ui.sectionLabel, { paddingBottom: 8 }]}>Latest {newestFirst.length} uploads</Text>
              {newestFirst.map((v, i) => (
                <UploadRow
                  key={v.id ?? v.n}
                  upload={v}
                  avg={avg}
                  last={i === newestFirst.length - 1}
                  open={open === v.n}
                  onPress={() => {
                    setOpen(open === v.n ? null : v.n);
                    setSelected(uploads.length - v.n);
                  }}
                />
              ))}
            </View>
          ) : null}

          <Bullets title="Fix next" color={C.danger} items={fixes} numbered />
          <Bullets title="Working well" color={C.acc} items={list(data.insights?.what_works)} />
        </>
      ) : job ? null : (
        <Card>
          <Text style={s.cardTitle}>Channel analytics</Text>
          <Text style={s.body}>
            Looks at your latest 10 uploads and their titles, shows which ones win attention, and gives a fix and a better
            title for the ones that don&apos;t. Uses 1 AI credit and needs YouTube connected.
          </Text>
          <Button title="Analyze my channel" onPress={analyze} />
        </Card>
      )}

      {job ? (
        <JobProgress
          title="Analyzing your latest uploads"
          startedAt={job.startedAt}
          expectedSec={30}
          progress={job.progress}
          steps={['Loading your latest 10 uploads', 'Comparing titles with views', 'Writing fixes for weak titles']}
        />
      ) : null}
      {error ? <Text style={s.error}>{error}</Text> : null}
    </Screen>
  );
}

// 0, half and a rounded-up top value for the y axis.
function niceMax(v: number) {
  if (v <= 0) return 10;
  const mag = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * mag >= v) ?? 10;
  return step * mag;
}

// Views per upload with a y axis, the average as a dashed line, and below-average uploads in red.
// Dragging across it picks the nearest upload.
function ViewsChart({
  uploads,
  avg,
  selected,
  onSelect,
}: {
  uploads: Upload[];
  avg: number;
  selected: number;
  onSelect: (i: number) => void;
}) {
  const C = useColors();
  const [w, setW] = useState(0);
  const h = 170;
  const gutter = 40;
  const top = 10;
  const bottom = h - 22;
  const left = gutter + 6;
  const right = w - 10;
  const max = niceMax(Math.max(avg, ...uploads.map((u) => u.views)));
  const x = (i: number) => (uploads.length === 1 ? (left + right) / 2 : left + (i / (uploads.length - 1)) * (right - left));
  const y = (v: number) => bottom - (v / max) * (bottom - top);
  const pts = uploads.map((u, i) => `${x(i)},${y(u.views)}`).join(' ');

  const pick = (px: number) => {
    if (uploads.length < 2 || right <= left) return;
    const i = Math.round(((px - left) / (right - left)) * (uploads.length - 1));
    onSelect(Math.max(0, Math.min(uploads.length - 1, i)));
  };

  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(e) => pick(e.nativeEvent.locationX)}
      onResponderMove={(e) => pick(e.nativeEvent.locationX)}
      accessibilityRole="adjustable"
      accessibilityLabel="Views per upload"
      accessibilityValue={{ text: `${compact.format(uploads[selected]?.views ?? 0)} views` }}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment') onSelect(Math.min(uploads.length - 1, selected + 1));
        if (e.nativeEvent.actionName === 'decrement') onSelect(Math.max(0, selected - 1));
      }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      style={{ height: h }}>
      {w > 0 ? (
        <Svg width={w} height={h} pointerEvents="none">
          {[max, max / 2, 0].map((t) => (
            <Line key={t} x1={left} y1={y(t)} x2={w} y2={y(t)} stroke={t === 0 ? C.line : C.card2} strokeWidth={1} />
          ))}
          {[max, max / 2, 0].map((t) => (
            <SvgText key={`l${t}`} x={gutter - 2} y={y(t) + 4} fill={C.t3} fontSize={10} fontFamily={F.mono} textAnchor="end">
              {compact.format(t)}
            </SvgText>
          ))}
          {avg > 0 ? (
            <>
              <Line x1={left} y1={y(avg)} x2={right} y2={y(avg)} stroke={C.t3} strokeWidth={1} strokeDasharray="4 4" />
              <SvgText x={right} y={y(avg) - 5} fill={C.t2} fontSize={10} fontFamily={F.mono} textAnchor="end">
                avg {compact.format(avg)}
              </SvgText>
            </>
          ) : null}
          <Line x1={x(selected)} y1={top} x2={x(selected)} y2={bottom} stroke={C.line} strokeWidth={1} />
          <Polyline points={pts} fill="none" stroke={C.text} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
          {uploads.map((u, i) => (
            <Circle
              key={u.id ?? i}
              cx={x(i)}
              cy={y(u.views)}
              r={i === selected ? 5.5 : 3.5}
              fill={i === selected ? C.bg : u.views >= avg ? C.text : C.danger}
              stroke={u.views >= avg ? C.text : C.danger}
              strokeWidth={i === selected ? 2.5 : 0}
            />
          ))}
          <SvgText x={left} y={h - 4} fill={C.t3} fontSize={10} fontFamily={F.mono}>
            {day(uploads[0]?.published_at)}
          </SvgText>
          <SvgText x={right} y={h - 4} fill={C.t3} fontSize={10} fontFamily={F.mono} textAnchor="end">
            {day(uploads[uploads.length - 1]?.published_at)}
          </SvgText>
        </Svg>
      ) : null}
    </View>
  );
}

function Pattern({ color, label, text, last }: { color: string; label: string; text: string; last?: boolean }) {
  const C = useColors();
  const s = useStyles();
  return (
    <View style={[s.pattern, !last && { borderBottomWidth: 1, borderBottomColor: C.lineSoft }]}>
      <View style={[s.bar, { backgroundColor: color }]} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={s.patternLabel}>{label}</Text>
        <Text style={s.item}>{text}</Text>
      </View>
    </View>
  );
}

function UploadRow({ upload, avg, open, last, onPress }: { upload: Upload; avg: number; open: boolean; last: boolean; onPress: () => void }) {
  const C = useColors();
  const s = useStyles();
  const [copied, setCopied] = useState(false);
  const weak = upload.review?.verdict ? /weak/i.test(upload.review.verdict) : upload.views < avg;
  const diff = avg > 0 ? ((upload.views - avg) / avg) * 100 : 0;
  const r = upload.review;

  const copy = async () => {
    if (!r?.better_title) return;
    await Clipboard.setStringAsync(r.better_title);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <View style={[s.upload, last && { borderBottomWidth: 1, borderBottomColor: C.lineSoft }]}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ expanded: open }} style={s.uploadHead}>
        <View style={[s.dot, { backgroundColor: weak ? C.danger : C.acc }]} />
        <Text style={s.uploadTitle} numberOfLines={open ? 3 : 1}>
          {upload.title}
        </Text>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={s.mono}>{compact.format(upload.views)}</Text>
          <Text style={[s.monoSmall, { color: diff >= 0 ? C.acc : C.danger }]}>{pct(diff)}</Text>
        </View>
      </Pressable>
      {open ? (
        <View style={s.review}>
          {r?.reason ? <Text style={s.item}>{r.reason}</Text> : <Text style={s.muted}>No review for this upload.</Text>}
          {r?.fix ? (
            <Text style={s.item}>
              <Text style={{ color: C.text, ...font('600') }}>Fix: </Text>
              {r.fix}
            </Text>
          ) : null}
          {r?.better_title ? (
            <View style={s.better}>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={s.patternLabel}>Better title</Text>
                <Text style={[s.item, { fontFamily: F.mono, fontSize: 13 }]}>{r.better_title}</Text>
              </View>
              <Button title={copied ? 'Copied' : 'Copy'} variant="secondary" size="sm" onPress={copy} />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function Bullets({ title, color, items, numbered }: { title: string; color: string; items: string[]; numbered?: boolean }) {
  const s = useStyles();
  const ui = useUiStyles();
  if (items.length === 0) return null;
  return (
    <View style={{ gap: 12 }}>
      <Text style={ui.sectionLabel}>{title}</Text>
      {items.slice(0, 6).map((item, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
          {numbered ? <Text style={[s.mono, { color, width: 16 }]}>{i + 1}</Text> : <View style={[s.bar, { backgroundColor: color }]} />}
          <Text style={s.item}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((C) => ({
  channel: { color: C.t2, fontSize: 13, marginTop: -14, ...font() },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  trend: { fontSize: 12, fontFamily: F.monoMedium },
  heroRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  hero: { color: C.text, fontSize: 40, lineHeight: 44, letterSpacing: -1.4, ...font('600') },
  heroUnit: { color: C.t2, fontSize: 15, ...font() },
  delta: { marginLeft: 'auto', fontSize: 13, fontFamily: F.monoMedium },
  heroTitle: { color: C.t2, fontSize: 14, lineHeight: 20, ...font() },
  hint: { color: C.t3, fontSize: 12, marginTop: -6, ...font() },
  healthRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.lineSoft },
  healthScore: { color: C.text, fontSize: 20, fontFamily: F.monoMedium },
  healthText: { flex: 1, color: C.t2, fontSize: 13, lineHeight: 18, ...font() },
  panel: { borderRadius: R.card, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, overflow: 'hidden' },
  pattern: { flexDirection: 'row', gap: 12, padding: 14 },
  patternLabel: { color: C.t2, fontSize: 12, ...font('500') },
  upload: { borderTopWidth: 1, borderTopColor: C.lineSoft },
  uploadHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  uploadTitle: { flex: 1, color: C.text, fontSize: 14, lineHeight: 19, ...font() },
  dot: { width: 7, height: 7, borderRadius: 4 },
  review: { gap: 10, paddingLeft: 17, paddingBottom: 14 },
  better: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: R.ctl,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.card,
  },
  mono: { color: C.text, fontSize: 13, fontFamily: F.mono },
  monoSmall: { fontSize: 11, fontFamily: F.mono },
  cardTitle: { color: C.text, fontSize: 17, ...font('600') },
  body: { color: C.t2, fontSize: 14, lineHeight: 20, ...font() },
  muted: { color: C.t3, fontSize: 13, ...font() },
  error: { color: C.danger, fontSize: 13, ...font() },
  bar: { width: 3, borderRadius: 2 },
  item: { flex: 1, color: C.t2, fontSize: 14, lineHeight: 20, ...font() },
}));
