import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/api/auth';
import { AppIcon, Button } from '@/components/ui';
import { UltraFill } from '@/components/ultra';
import { autoStartTour, closeTour, useTourOpen, wantsAutoTour } from '@/state/tour';
import { F, R, display, font, makeStyles, useColors } from '@/theme';

// The first-run tour: swipeable cards that show what each part of the app is for, each with a
// small drawing of it and the tab it lives on. New accounts see it once after the launch intro;
// anyone can replay it from Profile.

type TabName = 'Workflow' | 'Spotlight' | 'Analytics' | 'Profile';

type Slide = {
  id: string;
  kicker: string;
  title: string;
  body: string;
  tab?: TabName;
  art: () => ReactNode;
};

const SLIDES: Slide[] = [
  {
    id: 'welcome',
    kicker: 'Welcome',
    title: 'Your beat, from folder to YouTube',
    body: 'SendMyBeat writes your tags and description, makes the video and uploads it for you. Here’s a quick look around.',
    art: () => <WelcomeArt />,
  },
  {
    id: 'build',
    kicker: 'Step 1 · Build',
    title: 'Start with tags',
    body: 'Type what your beat sounds like or who it’s for and tap Generate. Save a description once and reuse it on every upload.',
    tab: 'Workflow',
    art: () => <BuildArt />,
  },
  {
    id: 'review',
    kicker: 'Step 2 · Review',
    title: 'Check it before it goes out',
    body: 'Drop any tag you don’t like, then copy your tags and description in one tap.',
    tab: 'Workflow',
    art: () => <ReviewArt />,
  },
  {
    id: 'upload',
    kicker: 'Step 3 · Upload',
    title: 'Make the video and publish',
    body: 'Open Upload Studio, add your beat and cover art, pick a visualizer and publish straight to your channel.',
    tab: 'Workflow',
    art: () => <UploadArt />,
  },
  {
    id: 'spotlight',
    kicker: 'Spotlight',
    title: 'Get seen by other producers',
    body: 'Get verified, show your best beats and see who’s trending this week.',
    tab: 'Spotlight',
    art: () => <SpotlightArt />,
  },
  {
    id: 'analytics',
    kicker: 'Analytics',
    title: 'See what’s working',
    body: 'A Pro look at your channel: which uploads land and what to fix next.',
    tab: 'Analytics',
    art: () => <AnalyticsArt />,
  },
  {
    id: 'profile',
    kicker: 'You’re set',
    title: 'Credits, plan and more',
    body: 'Your credits, plan, theme and app icon live in Profile. You can watch this tour again there any time.',
    tab: 'Profile',
    art: () => <ProfileArt />,
  },
];

/** Mounted once while signed in: opens the tour for new accounts and draws it when it's open. */
export function AppTour() {
  const { user } = useAuth();
  const open = useTourOpen();

  // Wait for the launch intro to finish before opening.
  useEffect(() => {
    if (!wantsAutoTour(user)) return;
    const t = setTimeout(() => autoStartTour(user), 1700);
    return () => clearTimeout(t);
  }, [user]);

  return <TourModal visible={open} onClose={() => closeTour(user?.id)} />;
}

export function TourModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const s = useStyles();
  const C = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const scroller = useRef<ScrollView>(null);
  const last = index === SLIDES.length - 1;

  useEffect(() => {
    if (!visible) return;
    setIndex(0);
    scroller.current?.scrollTo({ x: 0, animated: false });
  }, [visible]);

  const goTo = (i: number) => {
    const next = Math.max(0, Math.min(SLIDES.length - 1, i));
    setIndex(next);
    scroller.current?.scrollTo({ x: next * width, animated: true });
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / Math.max(width, 1));
    if (i !== index) setIndex(i);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={false} statusBarTranslucent onRequestClose={onClose}>
      <View style={[s.fill, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
        <View style={s.top}>
          <Text style={s.count}>
            {String(index + 1).padStart(2, '0')}
            <Text style={{ color: C.t3 }}>/{String(SLIDES.length).padStart(2, '0')}</Text>
          </Text>
          {!last ? (
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Skip the tour">
              <Text style={s.skip}>Skip</Text>
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
          style={{ flex: 1 }}>
          {SLIDES.map((slide) => (
            <View key={slide.id} style={[s.slide, { width }]} accessible accessibilityLabel={`${slide.title}. ${slide.body}`}>
              <View style={s.artCard}>
                <View style={s.artBody}>{slide.art()}</View>
                {slide.tab ? <TabStrip active={slide.tab} /> : null}
              </View>
              <View style={s.copy}>
                <Text style={s.kicker}>{slide.kicker.toUpperCase()}</Text>
                <Text style={s.title}>{slide.title}</Text>
                <Text style={s.body}>{slide.body}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={s.foot}>
          <View style={s.dots}>
            {SLIDES.map((slide, i) => (
              <Pressable key={slide.id} onPress={() => goTo(i)} hitSlop={6} accessibilityLabel={`Go to ${slide.title}`}>
                <View style={[s.dot, i < index && { backgroundColor: C.t3 }, i === index && s.dotOn]} />
              </Pressable>
            ))}
          </View>
          <View style={s.actions}>
            {index > 0 ? <Button title="Back" variant="secondary" size="md" onPress={() => goTo(index - 1)} style={{ flex: 1 }} /> : null}
            <Button
              title={index === 0 ? 'Show me around' : last ? 'Start creating' : 'Next'}
              size="md"
              onPress={() => (last ? onClose() : goTo(index + 1))}
              style={{ flex: index > 0 ? 1.4 : 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ---- the tab each part lives on ----

const TABS: TabName[] = ['Workflow', 'Spotlight', 'Analytics', 'Profile'];

function TabStrip({ active }: { active: TabName }) {
  const s = useStyles();
  return (
    <View style={s.tabs} accessibilityLabel={`On the ${active} tab`}>
      {TABS.map((t) => {
        const on = t === active;
        return (
          <View key={t} style={[s.tab, on && s.tabOn]}>
            <View style={[s.tabDot, on && s.tabDotOn]} />
            <Text style={[s.tabText, on && s.tabTextOn]} numberOfLines={1}>
              {t}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ---- drawings ----

function WelcomeArt() {
  const s = useStyles();
  return (
    <View style={{ alignItems: 'center', gap: 16 }}>
      <AppIcon size={76} />
      <Text style={s.brand}>SENDMYBEAT</Text>
      <View style={s.flow}>
        {['Tags', 'Description', 'Upload'].map((label, i) => (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {i > 0 ? <Text style={s.arrow}>→</Text> : null}
            <View style={s.chip}>
              <Text style={s.chipText}>{label}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function BuildArt() {
  const s = useStyles();
  const tags: [string, number][] = [
    ['dark trap beat', 92],
    ['type beat 2026', 88],
    ['hard 808s', 81],
    ['free for profit', 74],
  ];
  return (
    <View style={{ gap: 12, alignSelf: 'stretch' }}>
      <View style={s.field}>
        <Text style={s.fieldText} numberOfLines={1}>
          dark trap type beat
        </Text>
        <View style={s.fieldBtn}>
          <UltraFill radius={8} sheen={false} />
          <Text style={s.fieldBtnText}>Generate</Text>
        </View>
      </View>
      <View style={s.wrap}>
        {tags.map(([t, score]) => (
          <View key={t} style={s.chip}>
            <Text style={s.chipText}>{t}</Text>
            <Text style={s.chipScore}>{score}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ReviewArt() {
  const s = useStyles();
  const C = useColors();
  return (
    <View style={{ gap: 12, alignSelf: 'stretch' }}>
      <View style={s.wrap}>
        {['dark trap beat', 'hard 808s', 'free for profit', 'sad piano'].map((t) => {
          const dropped = t === 'sad piano';
          return (
            <View key={t} style={[s.chip, dropped && { opacity: 0.45 }]}>
              <Text style={[s.chipText, dropped && { textDecorationLine: 'line-through' }]}>{t}</Text>
              <Text style={[s.chipScore, dropped && { color: C.danger }]}>{dropped ? '×' : '✓'}</Text>
            </View>
          );
        })}
      </View>
      <View style={{ gap: 6 }}>
        <View style={[s.line, { width: '92%' }]} />
        <View style={[s.line, { width: '78%' }]} />
        <View style={[s.line, { width: '54%' }]} />
      </View>
      <View style={[s.fieldBtn, { alignSelf: 'flex-start', paddingHorizontal: 14 }]}>
        <UltraFill radius={8} sheen={false} />
        <Text style={s.fieldBtnText}>Copy all</Text>
      </View>
    </View>
  );
}

const WAVE = [0.35, 0.6, 0.9, 0.5, 0.75, 1, 0.65, 0.4, 0.8, 0.95, 0.55, 0.3, 0.7, 0.85, 0.45, 0.6, 0.9, 0.5, 0.35, 0.65];

function UploadArt() {
  const s = useStyles();
  const C = useColors();
  return (
    <View style={{ gap: 14, alignSelf: 'stretch' }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <View style={s.cover}>
          <Text style={{ color: C.t2, fontSize: 22 }}>♪</Text>
        </View>
        <View style={s.wave}>
          {WAVE.map((h, i) => (
            <View key={i} style={[s.bar, { height: `${h * 100}%` as const, backgroundColor: i < 12 ? C.text : C.wave }]} />
          ))}
        </View>
      </View>
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={s.mono}>Publishing to YouTube</Text>
          <Text style={[s.mono, { color: C.acc }]}>64%</Text>
        </View>
        <View style={s.track}>
          <View style={[s.trackFill, { width: '64%' }]} />
        </View>
      </View>
    </View>
  );
}

function SpotlightArt() {
  const s = useStyles();
  const C = useColors();
  return (
    <View style={{ gap: 8, alignSelf: 'stretch' }}>
      {[0.82, 0.64, 0.5].map((w, i) => (
        <View key={i} style={s.rankRow}>
          <Text style={s.rank}>#{i + 1}</Text>
          <View style={[s.avatar, i === 0 && { borderColor: C.accLine }]} />
          <View style={{ flex: 1, gap: 5 }}>
            <View style={[s.line, { width: `${w * 100}%` as const, backgroundColor: i === 0 ? C.t2 : C.line }]} />
            <View style={[s.line, { width: `${w * 60}%` as const }]} />
          </View>
          {i === 0 ? (
            <View style={s.verified}>
              <Text style={s.verifiedText}>Verified ✓</Text>
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const CHART = [0.35, 0.5, 0.42, 0.7, 0.55, 0.92, 0.62];

function AnalyticsArt() {
  const s = useStyles();
  const C = useColors();
  return (
    <View style={{ gap: 12, alignSelf: 'stretch' }}>
      <View style={s.chart}>
        {CHART.map((h, i) => (
          <View key={i} style={[s.col, { height: `${h * 100}%` as const, backgroundColor: i === 5 ? C.text : C.card2, borderColor: i === 5 ? C.text : C.line }]} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={[s.note, { borderColor: C.dangerLine, backgroundColor: C.dangerSoft }]}>
          <Text style={[s.noteText, { color: C.danger }]}>Fix next</Text>
        </View>
        <View style={[s.note, { borderColor: C.accLine, backgroundColor: C.accSoft }]}>
          <Text style={[s.noteText, { color: C.acc }]}>Working well</Text>
        </View>
      </View>
    </View>
  );
}

function ProfileArt() {
  const s = useStyles();
  return (
    <View style={{ gap: 14, alignSelf: 'stretch' }}>
      {(
        [
          ['AI credits', 0.7],
          ['Uploads', 0.45],
        ] as [string, number][]
      ).map(([label, v]) => (
        <View key={label} style={{ gap: 6 }}>
          <Text style={s.mono}>{label}</Text>
          <View style={s.track}>
            <View style={[s.trackFill, s.trackFillText, { width: `${v * 100}%` as const }]} />
          </View>
        </View>
      ))}
      <View style={s.wrap}>
        {['Plan', 'Appearance', 'App icon'].map((t) => (
          <View key={t} style={s.chip}>
            <Text style={s.chipText}>{t}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const useStyles = makeStyles((C) => ({
  fill: { flex: 1, backgroundColor: C.bg },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, height: 40 },
  count: { color: C.text, fontSize: 13, fontFamily: F.mono },
  skip: { color: C.t2, fontSize: 15, ...font('500') },
  slide: { paddingHorizontal: 22, paddingTop: 8, gap: 26, justifyContent: 'center' },
  artCard: {
    borderRadius: R.card + 6,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.card,
    overflow: 'hidden',
  },
  artBody: { minHeight: 230, padding: 20, alignItems: 'center', justifyContent: 'center' },
  copy: { gap: 8, paddingHorizontal: 2 },
  kicker: { color: C.t3, fontSize: 11.5, letterSpacing: 0.8, fontFamily: F.monoMedium },
  title: { color: C.text, fontSize: 28, lineHeight: 33, letterSpacing: -0.3, ...display },
  body: { color: C.t2, fontSize: 16, lineHeight: 23, ...font() },
  foot: { paddingHorizontal: 22, gap: 18 },
  dots: { flexDirection: 'row', gap: 6, alignSelf: 'center', alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.line },
  dotOn: { width: 20, backgroundColor: C.text },
  actions: { flexDirection: 'row', gap: 10 },

  tabs: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.lineSoft, padding: 6, gap: 4 },
  tab: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 7, borderRadius: R.ctl },
  tabOn: { backgroundColor: C.card2 },
  tabDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'transparent' },
  tabDotOn: { backgroundColor: C.acc },
  tabText: { color: C.t3, fontSize: 11, ...font('500') },
  tabTextOn: { color: C.text, ...font('600') },

  brand: { color: C.text, fontFamily: F.brand, fontSize: 15, letterSpacing: 4 },
  flow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'center' },
  arrow: { color: C.t3, fontSize: 13, ...font() },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: R.chip + 2,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.card2,
  },
  chipText: { color: C.text, fontSize: 12.5, ...font('500') },
  chipScore: { color: C.acc, fontSize: 11.5, fontFamily: F.monoMedium },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    paddingLeft: 12,
    paddingRight: 5,
    borderRadius: R.ctl,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.bg,
  },
  fieldText: { flex: 1, color: C.text, fontSize: 14, ...font() },
  fieldBtn: { height: 32, paddingHorizontal: 12, borderRadius: 8, backgroundColor: C.gradB, alignItems: 'center', justifyContent: 'center' },
  fieldBtnText: { color: C.onGrad, fontSize: 13, ...font('600') },
  line: { height: 7, borderRadius: 4, backgroundColor: C.line },
  cover: { width: 64, height: 64, borderRadius: 10, backgroundColor: C.card2, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  wave: { flex: 1, height: 52, flexDirection: 'row', alignItems: 'center', gap: 3 },
  bar: { flex: 1, borderRadius: 2 },
  mono: { color: C.t2, fontSize: 12, fontFamily: F.mono },
  track: { height: 4, borderRadius: 2, backgroundColor: C.lineSoft, overflow: 'hidden' },
  trackFill: { height: 4, borderRadius: 2, backgroundColor: C.acc },
  trackFillText: { backgroundColor: C.text },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  rank: { width: 24, color: C.t3, fontSize: 12, fontFamily: F.monoMedium },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.card2, borderWidth: 1.5, borderColor: C.line },
  verified: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: R.chip, borderWidth: 1, borderColor: C.accLine, backgroundColor: C.accSoft },
  verifiedText: { color: C.acc, fontSize: 11, ...font('600') },
  chart: { height: 120, flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  col: { flex: 1, borderRadius: 6, borderWidth: 1 },
  note: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: R.chip + 2, borderWidth: 1 },
  noteText: { fontSize: 12, ...font('600') },
}));
