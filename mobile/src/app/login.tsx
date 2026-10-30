import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

import { Button, JobProgress, Meter, styles as ui } from '@/components/ui';
import { C, F, R, font } from '@/theme';

// The first screen before signing in: what SendMyBeat does, previews of each part of the app
// built from its own pieces, and the plans. Log in and sign up open the auth sheet.

const openAuth = (mode: 'login' | 'register') => router.push({ pathname: '/auth', params: { mode } });

// Same stages the Workflow tab shows while tags generate.
const TAG_STEPS = [
  'Reading your search…',
  'Searching YouTube for top type beats…',
  'Pulling tags from similar videos…',
  'Asking AI for type beat variations…',
  'Scoring and ranking tags…',
];

// Free limits are FREE_DAILY_* and paid limits PLUS_/MAX_MONTHLY_* in backend/server.py;
// prices match the website's plans (frontend/src/pages/LandingPage.js). Billing happens on the site.
const PLANS = [
  { name: 'Free', price: '$0', per: '', lines: ['2 AI generations a day', '1 YouTube upload a day', 'Uploads carry a small watermark'] },
  { name: 'Plus', price: '$5', per: '/mo', lines: ['150 AI generations a month', '60 YouTube uploads a month', 'Channel analytics', 'No watermark'] },
  { name: 'Max', price: '$12', per: '/mo', lines: ['500 AI generations a month', '150 YouTube uploads a month', 'Channel analytics', 'No watermark'] },
];

export default function LandingScreen() {
  const insets = useSafeAreaInsets();
  const narrow = useWindowDimensions().width < 360; // iPhone SE (1st gen) and small Androids
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={[s.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}>
      <View style={s.topBar}>
        <Text style={s.logo} accessibilityRole="header">
          SendMyBeat
        </Text>
        <Pressable onPress={() => openAuth('login')} hitSlop={8} style={s.topLink} accessibilityRole="button">
          <Text style={s.topLinkText}>Log in</Text>
        </Pressable>
      </View>

      <View style={{ gap: 14 }}>
        <Text style={s.eyebrow}>For beat producers on YouTube</Text>
        <Text style={[s.hero, narrow && { fontSize: 30, lineHeight: 36 }]}>Tags, descriptions and uploads for every beat.</Text>
        <Text style={s.lede}>
          SendMyBeat finds the tags that rank, writes the description, renders the video and uploads it to your channel.
        </Text>
      </View>

      <View style={{ gap: 10 }}>
        <Button title="Get started" onPress={() => openAuth('register')} />
        <Button title="Log in" variant="secondary" onPress={() => openAuth('login')} />
        <Text style={s.fine}>Free plan · no card needed</Text>
      </View>

      <TagRunDemo />

      <Feature
        n="01"
        title="Tags that fit YouTube's limit"
        body="Edit the generated tags as chips. The line fills toward YouTube's 500-character limit as you go.">
        <TagEditorPreview />
      </Feature>

      <Feature n="02" title="Upload Studio" body="Pick your beat and cover art, hear it under the preview, and send it to YouTube as a video.">
        <StudioPreview />
      </Feature>

      <Feature n="03" title="Analytics" body="Views per upload, plus which titles are working. Included with Plus and Max.">
        <ChartPreview />
      </Feature>

      <Feature n="04" title="Spotlight" body="A community of producers. Climb the leaderboard, share your top beat and follow others.">
        <LeaderboardPreview />
      </Feature>

      <View style={{ gap: 12 }}>
        <View style={{ gap: 6 }}>
          <Text style={ui.sectionLabel}>Pricing</Text>
          <Text style={s.h2}>Start free. Upgrade when you post more.</Text>
        </View>
        {PLANS.map((p) => (
          <View key={p.name} style={s.plan} accessible accessibilityLabel={`${p.name} plan, ${p.price}${p.per ? ' a month' : ''}. ${p.lines.join('. ')}.`}>
            <View style={s.planHead}>
              <Text style={s.planName}>{p.name}</Text>
              <Text style={s.planPrice}>
                {p.price}
                <Text style={s.planPer}>{p.per}</Text>
              </Text>
            </View>
            {p.lines.map((line) => (
              <View key={line} style={s.planLine}>
                <Text style={s.planDash}>–</Text>
                <Text style={s.planText}>{line}</Text>
              </View>
            ))}
          </View>
        ))}
        <Text style={s.note}>Everyone starts on Free. Upgrade any time from Plan and billing in your profile.</Text>
      </View>

      <View style={s.closing}>
        <Text style={s.h2}>Your next upload, done in minutes.</Text>
        <Button title="Get started" onPress={() => openAuth('register')} />
        <Pressable onPress={() => openAuth('login')} style={s.switchBtn} accessibilityRole="button">
          <Text style={s.switch}>
            Have an account? <Text style={{ color: C.text, ...font('600') }}>Log in</Text>
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Feature({ n, title, body, children }: { n: string; title: string; body: string; children: ReactNode }) {
  return (
    <View style={{ gap: 12 }}>
      <View style={{ gap: 6 }}>
        <Text style={s.featNum}>{n}</Text>
        <Text style={s.h2} accessibilityRole="header">
          {title}
        </Text>
        <Text style={s.body}>{body}</Text>
      </View>
      {children}
    </View>
  );
}

// A tag run playing on a loop, using the same log the Workflow tab shows.
function TagRunDemo() {
  const [startedAt, setStartedAt] = useState(() => Date.now() - 7000);
  useEffect(() => {
    const t = setInterval(() => setStartedAt(Date.now()), 26000);
    return () => clearInterval(t);
  }, []);
  return (
    <View accessible accessibilityLabel="Example: tags being generated for dark trap type beat">
      <JobProgress title="dark trap type beat" startedAt={startedAt} expectedSec={25} steps={TAG_STEPS} />
    </View>
  );
}

const SAMPLE_TAGS = ['dark trap type beat', 'trap beat 2026', 'hard trap instrumental', 'free type beat', 'dark piano trap', '808 beat'];

function TagEditorPreview() {
  const chars = 438;
  return (
    <View style={s.panel} accessible accessibilityLabel={`Example tag editor, ${chars} of 500 characters used`}>
      <View style={s.chips}>
        {SAMPLE_TAGS.map((t, i) => (
          <View key={t} style={[s.chip, i === 1 && s.chipNew]}>
            <Text style={[s.chipText, i === 1 && { color: C.acc }]}>{i === 1 ? `+ ${t}` : t}</Text>
            <Text style={[s.chipX, i === 1 && { color: C.acc }]}>×</Text>
          </View>
        ))}
        <View style={s.chipMore}>
          <Text style={s.chipText}>+64 more</Text>
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <Meter value={chars / 500} />
        <View style={s.rowBetween}>
          <Text style={s.muted}>YouTube tag limit</Text>
          <Text style={s.mono}>{chars} / 500</Text>
        </View>
      </View>
    </View>
  );
}

function StudioPreview() {
  const bars = Array.from({ length: 40 }, (_, i) => 0.35 + 0.3 * Math.abs(Math.sin(i * 0.9)) + 0.3 * Math.abs(Math.sin(i * 0.37)));
  return (
    <View style={s.panel} accessible accessibilityLabel="Example Upload Studio: video preview, waveform player and the render settings">
      <View style={s.video}>
        <View style={s.cover}>
          <Text style={s.mono}>cover.jpg</Text>
        </View>
        <Text style={s.videoBadge}>16:9 · 2 fps</Text>
      </View>
      <View style={s.player}>
        <View style={s.playBtn}>
          <Text style={{ color: C.onPrimary, fontSize: 11, ...font('700') }}>❚❚</Text>
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <View style={s.wave}>
            {bars.map((h, i) => (
              <View key={i} style={[s.waveBar, { height: `${Math.min(1, h) * 100}%`, backgroundColor: i < 11 ? C.text : '#3A3A3A' }]} />
            ))}
          </View>
          <View style={s.rowBetween}>
            <Text style={[s.time, { color: C.text }]}>0:42</Text>
            <Text style={s.time}>2:58</Text>
          </View>
        </View>
      </View>
      <View style={s.uploadBtn}>
        <Text style={s.uploadText}>Upload to YouTube</Text>
      </View>
      <Text style={[s.time, { textAlign: 'center' }]}>mp4 · 1920×1080 · 2 fps · public</Text>
    </View>
  );
}

const VIEWS = [8.2, 10.6, 7.4, 12.9, 10.1, 11.8, 15.9, 21.0];

function ChartPreview() {
  const [w, setW] = useState(0);
  const h = 120;
  const top = 14;
  const bottom = h - 18;
  const y = (v: number) => bottom - (v / 24) * (bottom - top);
  const x = (i: number) => (i / (VIEWS.length - 1)) * (w - 8) + 4;
  const pts = VIEWS.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  return (
    <View style={s.panel} accessible accessibilityLabel="Example analytics chart: views per upload rising over the last 8 uploads">
      <View style={{ gap: 2 }}>
        <Text style={s.muted}>Views, last 8 uploads · sample channel</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
          <Text style={s.bigNum}>97.9K</Text>
          <Text style={[s.mono, { color: C.acc }]}>+18%</Text>
        </View>
      </View>
      <View style={{ height: h }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {w > 0 ? (
          <Svg width={w} height={h}>
            {[10, 20].map((t) => (
              <Line key={t} x1={0} x2={w} y1={y(t)} y2={y(t)} stroke="#1A1A1A" strokeWidth={1} />
            ))}
            <Line x1={0} x2={w} y1={bottom} y2={bottom} stroke={C.line} strokeWidth={1} />
            <SvgText x={0} y={y(20) - 4} fill={C.t3} fontSize={10} fontFamily={F.mono}>
              20K
            </SvgText>
            <SvgText x={0} y={y(10) - 4} fill={C.t3} fontSize={10} fontFamily={F.mono}>
              10K
            </SvgText>
            <Polyline points={pts} fill="none" stroke={C.text} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
            <Circle cx={x(VIEWS.length - 1)} cy={y(VIEWS[VIEWS.length - 1])} r={4} fill={C.bg} stroke={C.acc} strokeWidth={2} />
            <SvgText x={0} y={h - 2} fill={C.t3} fontSize={10} fontFamily={F.mono}>
              8 uploads ago
            </SvgText>
            <SvgText x={w} y={h - 2} fill={C.t3} fontSize={10} fontFamily={F.mono} textAnchor="end">
              Latest · 21.0K
            </SvgText>
          </Svg>
        ) : null}
      </View>
    </View>
  );
}

const LEADERS = [
  { name: 'nightshift', pts: 412 },
  { name: 'lowend.audio', pts: 386 },
  { name: 'kairo beats', pts: 351 },
];

function LeaderboardPreview() {
  return (
    <View style={s.panel} accessible accessibilityLabel="Example Spotlight leaderboard with you ranked 14th">
      <View style={s.rowBetween}>
        <Text style={ui.sectionLabel}>Leaderboard</Text>
        <Text style={s.muted}>Trending</Text>
      </View>
      <View>
        {LEADERS.map((p, i) => (
          <LeaderRow key={p.name} rank={String(i + 1)} name={p.name} pts={p.pts} />
        ))}
        <LeaderRow rank="14" name="You" pts={188} you />
      </View>
    </View>
  );
}

function LeaderRow({ rank, name, pts, you }: { rank: string; name: string; pts: number; you?: boolean }) {
  return (
    <View style={[s.leader, you && s.you]}>
      <Text style={[s.rank, (you || Number(rank) <= 3) && { color: C.text }]}>{rank}</Text>
      <View style={s.avatar}>
        <Text style={s.avatarText}>{name[0].toUpperCase()}</Text>
      </View>
      <Text style={[s.leaderName, you && font('600')]} numberOfLines={1}>
        {name}
      </Text>
      <Text style={[s.mono, you && { color: C.text }]}>{pts}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { paddingHorizontal: 20, gap: 40 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44, marginBottom: -12 },
  logo: { color: C.text, fontSize: 16, fontFamily: F.brand },
  topLink: { minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' },
  topLinkText: { color: C.t2, fontSize: 15, ...font('500') },
  eyebrow: { color: C.t2, fontSize: 12, fontFamily: F.mono },
  hero: { ...ui.largeTitle, fontSize: 36, lineHeight: 42 },
  lede: { color: C.t2, fontSize: 16, lineHeight: 23, ...font() },
  fine: { color: C.t3, fontSize: 12.5, textAlign: 'center', fontFamily: F.mono },
  note: { color: C.t3, fontSize: 13, lineHeight: 18, textAlign: 'center', ...font() },
  featNum: { color: C.t3, fontSize: 12, fontFamily: F.mono },
  h2: { color: C.text, fontSize: 21, lineHeight: 27, letterSpacing: -0.3, ...font('600') },
  body: { color: C.t2, fontSize: 15, lineHeight: 21, ...font() },
  muted: { color: C.t3, fontSize: 13, ...font() },
  mono: { color: C.t2, fontSize: 12.5, fontFamily: F.mono },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  panel: { borderRadius: R.card, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, padding: 14, gap: 14, overflow: 'hidden' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: R.chip,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.bg,
  },
  chipNew: { borderColor: C.accLine, backgroundColor: '#06140E' },
  chipText: { color: C.text, fontFamily: F.mono, fontSize: 12 },
  chipX: { color: C.t3, fontSize: 13, ...font() },
  chipMore: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: R.chip, borderWidth: 1, borderColor: C.lineSoft },

  video: {
    aspectRatio: 16 / 9,
    borderRadius: R.ctl,
    borderWidth: 1,
    borderColor: C.lineSoft,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cover: {
    height: '74%',
    aspectRatio: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoBadge: {
    position: 'absolute',
    left: 8,
    top: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: C.t2,
    fontSize: 10.5,
    fontFamily: F.mono,
    overflow: 'hidden',
  },
  player: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  playBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  wave: { height: 26, flexDirection: 'row', alignItems: 'center', gap: 2 },
  waveBar: { flex: 1, borderRadius: 1 },
  time: { color: C.t3, fontSize: 11, fontFamily: F.mono },
  uploadBtn: { height: 44, borderRadius: R.card, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  uploadText: { color: C.onPrimary, fontSize: 15, ...font('600') },

  bigNum: { color: C.text, fontSize: 30, letterSpacing: -1, ...font('600') },

  leader: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 46, borderTopWidth: 1, borderTopColor: C.lineSoft },
  you: { backgroundColor: C.card2, marginHorizontal: -14, marginBottom: -14, paddingHorizontal: 14, height: 46 + 14, paddingBottom: 14 },
  rank: { width: 22, color: C.t2, fontSize: 13, fontFamily: F.monoMedium },
  avatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: C.t2, fontSize: 11, ...font('600') },
  leaderName: { flex: 1, color: C.text, fontSize: 15, ...font() },

  plan: { borderRadius: R.card, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, padding: 16, gap: 8 },
  planHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 4 },
  planName: { color: C.text, fontSize: 17, ...font('600') },
  planPrice: { color: C.text, fontSize: 24, letterSpacing: -0.6, ...font('600') },
  planPer: { color: C.t3, fontSize: 13, fontFamily: F.mono, letterSpacing: 0 },
  planLine: { flexDirection: 'row', gap: 10 },
  planDash: { color: C.t3, fontSize: 14, ...font() },
  planText: { flex: 1, color: C.t2, fontSize: 14, lineHeight: 20, ...font() },

  closing: { gap: 14, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.lineSoft },
  switchBtn: { minHeight: 44, justifyContent: 'center' },
  switch: { color: C.t2, fontSize: 14, textAlign: 'center', ...font() },
});
