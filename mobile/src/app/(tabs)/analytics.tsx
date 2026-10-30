import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polygon, Polyline } from 'react-native-svg';

import * as api from '@/api/endpoints';
import type { ChannelAnalytics } from '@/api/endpoints';
import { Button, Card, JobProgress, Screen, styles as ui } from '@/components/ui';
import { C, F, font } from '@/theme';

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

export default function AnalyticsScreen() {
  const [data, setData] = useState<ChannelAnalytics | null>(null);
  const [job, setJob] = useState<{ startedAt: number; progress: number; message?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = async () => {
    setJob({ startedAt: Date.now(), progress: 0 });
    setError(null);
    try {
      setData(await api.analyzeChannel((progress, message) => setJob((j) => j && { ...j, progress, message })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Channel analysis failed.');
    } finally {
      setJob(null);
    }
  };

  // Oldest to newest, so the line reads left to right.
  const views = (data?.recent_videos ?? []).slice(0, 8).map((v) => v.views ?? 0).reverse();
  const total = views.reduce((a, b) => a + b, 0);

  return (
    <Screen
      title="Analytics"
      accessory={data && !job ? <Button title="Refresh" variant="secondary" size="sm" onPress={analyze} /> : null}>
      {data ? (
        <>
          <Text style={s.channel}>{data.channel_name}</Text>

          {views.length > 1 ? (
            <View style={{ gap: 14 }}>
              <View style={{ gap: 4 }}>
                <Text style={ui.sectionLabel}>Views, last {views.length} uploads</Text>
                <Text style={s.hero}>{compact.format(total)}</Text>
              </View>
              <ViewsChart views={views} />
            </View>
          ) : null}

          <View style={s.stats}>
            <Stat label="Subscribers" value={compact.format(data.subscriber_count)} />
            <Stat label="Total views" value={compact.format(data.total_views)} divider />
            <Stat label="Videos" value={compact.format(data.total_videos)} divider />
          </View>

          <Insights title="Working well" color={C.acc} items={data.insights?.what_works} />
          <Insights title="Needs work" color={C.danger} items={data.insights?.needs_improvement} />
          <Insights title="Next steps" color={C.warn} items={data.insights?.recommendations} />
        </>
      ) : job ? null : (
        <Card>
          <Text style={s.cardTitle}>Channel analytics</Text>
          <Text style={s.body}>
            AI insights on what is working on your channel and what to post next. Uses 1 AI credit and needs YouTube
            connected.
          </Text>
          <Button title="Analyze my channel" onPress={analyze} />
        </Card>
      )}

      {job ? (
        <JobProgress
          title="Analyzing your channel"
          startedAt={job.startedAt}
          expectedSec={50}
          progress={job.progress}
          steps={['Loading channel data', 'Reading recent uploads', 'Generating AI insights', 'Writing recommendations']}
        />
      ) : null}
      {error ? <Text style={s.error}>{error}</Text> : null}
    </Screen>
  );
}

// A thin line with a faint fill; the newest upload is marked in mint.
function ViewsChart({ views }: { views: number[] }) {
  const [w, setW] = useState(0);
  const h = 140;
  const top = 12;
  const bottom = h - 18;
  const pad = 5;
  const max = Math.max(1, ...views);
  const pts = views.map((v, i) => [pad + (i / (views.length - 1)) * (w - pad * 2), bottom - (v / max) * (bottom - top)] as const);
  const line = pts.map(([x, y]) => `${x},${y}`).join(' ');
  const last = pts[pts.length - 1];

  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={{ gap: 6 }}
      accessibilityRole="image"
      accessibilityLabel={`Views per upload for your last ${views.length} uploads, oldest to newest. Newest: ${compact.format(views[views.length - 1])}.`}>
      {w > 0 ? (
        <Svg width={w} height={h}>
          <Line x1={0} y1={top} x2={w} y2={top} stroke={C.card2} strokeWidth={1} />
          <Line x1={0} y1={(top + bottom) / 2} x2={w} y2={(top + bottom) / 2} stroke={C.card2} strokeWidth={1} />
          <Line x1={0} y1={bottom} x2={w} y2={bottom} stroke={C.line} strokeWidth={1} />
          <Polygon points={`${pad},${bottom} ${line} ${w - pad},${bottom}`} fill="rgba(237,237,237,0.05)" />
          <Polyline points={line} fill="none" stroke={C.text} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
          <Circle cx={last[0]} cy={last[1]} r={4} fill={C.bg} stroke={C.acc} strokeWidth={2} />
        </Svg>
      ) : (
        <View style={{ height: h }} />
      )}
      <View style={s.axis}>
        <Text style={s.mono}>Oldest</Text>
        <Text style={s.mono}>Newest · {compact.format(views[views.length - 1])}</Text>
      </View>
    </View>
  );
}

function Stat({ label, value, divider }: { label: string; value: string; divider?: boolean }) {
  return (
    <View style={[s.stat, divider && s.statDivider]}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
    </View>
  );
}

function Insights({ title, color, items }: { title: string; color: string; items?: unknown }) {
  const list = Array.isArray(items) ? items.filter((x): x is string => typeof x === 'string') : [];
  if (list.length === 0) return null;
  return (
    <View style={{ gap: 12 }}>
      <Text style={ui.sectionLabel}>{title}</Text>
      {list.slice(0, 5).map((item, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
          <View style={[s.bar, { backgroundColor: color }]} />
          <Text style={s.item}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  channel: { color: C.t2, fontSize: 13, marginTop: -14, ...font() },
  hero: { color: C.text, fontSize: 40, lineHeight: 44, letterSpacing: -1.4, ...font('600') },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
  mono: { color: C.t3, fontSize: 11, fontFamily: F.mono },
  stats: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.lineSoft },
  stat: { flex: 1, paddingVertical: 14, gap: 4 },
  statDivider: { borderLeftWidth: 1, borderLeftColor: C.lineSoft, paddingLeft: 14 },
  statLabel: { color: C.t2, fontSize: 12, ...font() },
  statValue: { color: C.text, fontSize: 20, letterSpacing: -0.4, ...font('600') },
  cardTitle: { color: C.text, fontSize: 17, ...font('600') },
  body: { color: C.t2, fontSize: 14, lineHeight: 20, ...font() },
  error: { color: C.danger, fontSize: 13, ...font() },
  bar: { width: 3, borderRadius: 2 },
  item: { flex: 1, color: C.text, fontSize: 15, lineHeight: 21, ...font() },
});
