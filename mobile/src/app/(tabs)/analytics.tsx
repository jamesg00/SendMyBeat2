import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import * as api from '@/api/endpoints';
import type { ChannelAnalytics } from '@/api/endpoints';
import { Button, Card, JobProgress, Screen, SectionLabel, styles as ui } from '@/components/ui';
import { C } from '@/theme';

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

  const views = (data?.recent_videos ?? []).slice(0, 8).map((v) => v.views ?? 0).reverse();
  const max = Math.max(1, ...views);

  return (
    <Screen title="Analytics">
      {data ? (
        <>
          <Text style={s.channel}>{data.channel_name}</Text>
          <Card style={s.stats}>
            <Stat label="Subs" value={compact.format(data.subscriber_count)} />
            <Stat label="Views" value={compact.format(data.total_views)} divider />
            <Stat label="Videos" value={compact.format(data.total_videos)} divider />
          </Card>

          {views.length > 0 && (
            <Card style={{ gap: 14 }}>
              <Text style={s.cardTitle}>Recent video views</Text>
              <View style={s.chart} accessibilityLabel={`Views for your last ${views.length} videos, oldest to newest`}>
                {views.map((v, i) => (
                  <View
                    key={i}
                    style={[s.bar, { height: Math.max(4, (v / max) * 60), backgroundColor: i === views.length - 1 ? C.acc : C.card2 }]}
                  />
                ))}
              </View>
            </Card>
          )}

          <Insights title="Working well" color={C.acc} items={data.insights?.what_works} />
          <Insights title="Needs improvement" color={C.danger} items={data.insights?.needs_improvement} />
          <Insights title="Next steps" color={C.warn} items={data.insights?.recommendations} />
        </>
      ) : (
        <Card>
          <Text style={s.cardTitle}>YouTube channel analytics</Text>
          <Text style={s.muted}>
            Get AI insights on what is working on your channel and what to post next. Uses 1 AI credit and needs YouTube
            connected.
          </Text>
        </Card>
      )}

      {error ? <Text style={s.error}>{error}</Text> : null}
      {job ? (
        <JobProgress
          title="Analyzing your channel"
          startedAt={job.startedAt}
          expectedSec={50}
          progress={job.progress}
          message={job.message}
        />
      ) : (
        <Button title={data ? 'Re-analyze · 1 credit' : 'Analyze my channel · 1 credit'} onPress={analyze} />
      )}
    </Screen>
  );
}

function Stat({ label, value, divider }: { label: string; value: string; divider?: boolean }) {
  return (
    <View style={[s.stat, divider && s.statDivider]}>
      <Text style={ui.sectionLabel}>{label.toUpperCase()}</Text>
      <Text style={s.statValue}>{value}</Text>
    </View>
  );
}

function Insights({ title, color, items }: { title: string; color: string; items?: unknown }) {
  const list = Array.isArray(items) ? items.filter((x): x is string => typeof x === 'string') : [];
  if (list.length === 0) return null;
  return (
    <>
      <SectionLabel>{title}</SectionLabel>
      <Card style={{ gap: 10 }}>
        {list.slice(0, 5).map((item, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
            <View style={[s.dot, { backgroundColor: color }]} />
            <Text style={s.item}>{item}</Text>
          </View>
        ))}
      </Card>
    </>
  );
}

const s = StyleSheet.create({
  channel: { color: C.t2, fontSize: 15, marginTop: -8 },
  stats: { flexDirection: 'row', padding: 0, gap: 0 },
  stat: { flex: 1, padding: 14, gap: 4 },
  statDivider: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: C.line },
  statValue: { color: C.text, fontSize: 22, fontWeight: '700' },
  cardTitle: { color: C.text, fontSize: 17, fontWeight: '600' },
  muted: { color: C.t3, fontSize: 13, lineHeight: 18, flexShrink: 1 },
  error: { color: C.danger, fontSize: 13 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 60 },
  bar: { flex: 1, borderRadius: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  item: { flex: 1, color: C.text, fontSize: 14, lineHeight: 20 },
});
