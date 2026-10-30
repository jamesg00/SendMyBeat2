import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, F, R, font } from '@/theme';

export function Screen({
  title,
  accessory,
  header,
  refreshing,
  onRefresh,
  children,
}: {
  title: string;
  accessory?: ReactNode;
  header?: ReactNode;
  /** Pass both to enable pull to refresh. */
  refreshing?: boolean;
  onRefresh?: () => void;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={[styles.screen, { paddingTop: insets.top + 12 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={C.t2} colors={[C.t2]} /> : undefined}>
      {header}
      <View style={styles.titleRow}>
        <Text style={styles.largeTitle} accessibilityRole="header">
          {title}
        </Text>
        {accessory}
      </View>
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionLabel({ children, right }: { children: string; right?: ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionLabel}>{children}</Text>
      {right}
    </View>
  );
}

export function T({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.body, style]}>{children}</Text>;
}

type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'plain';
  size?: 'lg' | 'md' | 'sm';
  style?: StyleProp<ViewStyle>;
};

// Primary is white-on-black like the system's own prominent buttons; mint stays for status only.
export function Button({ title, onPress, variant = 'primary', size = 'lg', style }: ButtonProps) {
  const height = size === 'lg' ? 50 : size === 'md' ? 40 : 32;
  const radius = size === 'lg' ? 12 : size === 'md' ? 10 : 8;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        { height, borderRadius: radius, paddingHorizontal: size === 'sm' ? 12 : 16 },
        variant === 'primary' && { backgroundColor: C.primary },
        variant === 'secondary' && { backgroundColor: C.card2, borderWidth: 1, borderColor: C.line },
        variant === 'plain' && { backgroundColor: 'transparent', paddingHorizontal: 0 },
        pressed && { transform: [{ scale: 0.97 }], opacity: 0.85 },
        style,
      ]}>
      <Text
        style={[
          styles.buttonText,
          { fontSize: size === 'lg' ? 16 : size === 'md' ? 15 : 13 },
          { color: variant === 'primary' ? C.onPrimary : variant === 'plain' ? C.t2 : C.text },
        ]}>
        {title}
      </Text>
    </Pressable>
  );
}

export type SegOption<V extends string> = { value: V; label: string };

// iOS dark segmented control: a grey thumb springs between options.
export function Segmented<V extends string>({
  options,
  value,
  onChange,
  compact,
}: {
  options: SegOption<V>[];
  value: V;
  onChange: (v: V) => void;
  compact?: boolean;
}) {
  const [width, setWidth] = useState(0);
  const cell = width > 0 ? (width - 4) / options.length : 0;
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const x = useSharedValue(0);
  const placed = useRef(false);

  useEffect(() => {
    if (cell <= 0) return;
    // Snap into place on first layout, then glide like UISegmentedControl: quick, with a barely-there settle.
    if (!placed.current) {
      placed.current = true;
      x.value = index * cell;
      return;
    }
    x.value = withSpring(index * cell, { duration: 280, dampingRatio: 0.82 });
  }, [index, cell, x]);

  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const h = compact ? 28 : 30;

  return (
    <View
      style={styles.seg}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="tablist">
      {cell > 0 && <Animated.View style={[styles.segThumb, { width: cell, height: h }, thumbStyle]} />}
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.segItem, { height: h }]}>
            <Text style={[active ? styles.segTextOn : styles.segText, { fontSize: compact ? 12 : 13 }]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ListGroup({ children }: { children: ReactNode }) {
  return <View style={styles.listGroup}>{children}</View>;
}

export function ListRow({
  title,
  subtitle,
  value,
  left,
  right,
  onPress,
  last,
  height = 50,
}: {
  title: string;
  subtitle?: string;
  value?: string;
  left?: ReactNode;
  right?: ReactNode;
  onPress?: () => void;
  last?: boolean;
  height?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        { minHeight: height },
        !last && styles.rowDivider,
        pressed && { backgroundColor: C.card2 },
      ]}>
      {left}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSub}>{subtitle}</Text> : null}
      </View>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {right}
      {onPress && !right ? <Text style={styles.chevron}>›</Text> : null}
    </Pressable>
  );
}

export function Pill({ label, tone = 'accent' }: { label: string; tone?: 'accent' | 'muted' }) {
  return (
    <View
      style={[
        styles.pill,
        tone === 'accent' ? { backgroundColor: C.accSoft, borderColor: C.accLine } : { backgroundColor: C.card2, borderColor: C.line },
      ]}>
      <Text style={[styles.pillText, { color: tone === 'accent' ? C.acc : C.t2 }]}>{label}</Text>
    </View>
  );
}

export function Meter({ value, color = C.text, height = 2 }: { value: number; color?: string; height?: number }) {
  const w = useSharedValue(Math.max(0, Math.min(1, value)));
  useEffect(() => {
    w.value = withTiming(Math.max(0, Math.min(1, value)), { duration: 450, easing: Easing.out(Easing.cubic) });
  }, [value, w]);
  const fill = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View style={[styles.meterTrack, { height, borderRadius: height / 2 }]}>
      <Animated.View style={[styles.meterFill, { height, borderRadius: height / 2, backgroundColor: color }, fill]} />
    </View>
  );
}

function clock(sec: number) {
  const t = Math.max(0, Math.floor(sec));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

// Live progress for a background job, shown like a deploy log. Servers report progress in big
// jumps (20% → 100%), so the bar also creeps forward on an eased estimate from elapsed time.
export function JobProgress({
  title,
  startedAt,
  expectedSec,
  progress = 0,
  message,
  steps,
}: {
  title: string;
  startedAt: number;
  expectedSec: number;
  progress?: number;
  message?: string;
  /** Stage labels shown in order as time passes; the server's message is used when there are none. */
  steps?: string[];
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 300);
    return () => clearInterval(t);
  }, []);

  const elapsed = (now - startedAt) / 1000;
  const estimate = 95 * (1 - Math.exp(-elapsed / (expectedSec * 0.6)));
  const pct = Math.min(97, Math.max(progress, estimate));
  const left = Math.max(0, expectedSec - elapsed);
  const per = steps?.length ? expectedSec / steps.length : 0;
  const current = steps?.length ? Math.min(steps.length - 1, Math.floor(elapsed / per)) : 0;
  const lines = steps?.length
    ? steps.map((label, i) => ({ label, at: i * per, state: i < current ? 'done' : i === current ? 'now' : 'next' }))
    : [{ label: message ?? 'Working…', at: 0, state: 'now' }];

  return (
    <View style={styles.job} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}>
      <View style={styles.jobHead}>
        <Text style={styles.jobTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.jobPct}>{Math.round(pct)}%</Text>
      </View>
      <Meter value={pct / 100} color={C.acc} />
      <View style={{ gap: 8 }}>
        {lines.slice(0, current + 2).map((l) => (
          <View key={l.label} style={styles.logLine}>
            <Text style={styles.logTime}>{l.state === 'next' ? '--:--' : clock(l.at)}</Text>
            <Text style={[styles.logMark, l.state === 'done' && { color: C.acc }, l.state === 'next' && { color: C.t3 }]}>
              {l.state === 'done' ? '✓' : l.state === 'now' ? '●' : '○'}
            </Text>
            <Text
              style={[styles.logText, l.state === 'now' && { color: C.text }, l.state === 'next' && { color: C.t3 }]}
              numberOfLines={1}>
              {l.label}
            </Text>
          </View>
        ))}
      </View>
      <Text style={styles.jobTime}>{left > 1 ? `~${clock(left)} left` : `${clock(elapsed)} elapsed`}</Text>
    </View>
  );
}

export function IconTile({ children, tint = C.card2 }: { children: ReactNode; tint?: string }) {
  return <View style={[styles.iconTile, { backgroundColor: tint }]}>{children}</View>;
}

export const styles = StyleSheet.create({
  screen: { paddingHorizontal: 20, paddingBottom: 140, gap: 20, backgroundColor: C.bg },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  largeTitle: { color: C.text, fontSize: 30, lineHeight: 36, letterSpacing: -0.9, ...font('600') },
  card: { backgroundColor: C.card, borderRadius: R.card, borderWidth: 1, borderColor: C.line, padding: 16, gap: 12 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 2 },
  sectionLabel: { color: C.t2, fontSize: 13, ...font('500') },
  body: { color: C.text, fontSize: 15, ...font() },
  button: { alignItems: 'center', justifyContent: 'center' },
  buttonText: { ...font('600') },
  seg: { flexDirection: 'row', padding: 2, borderRadius: 9, backgroundColor: C.segTrack },
  segThumb: {
    position: 'absolute',
    top: 2,
    left: 2,
    borderRadius: R.thumb,
    backgroundColor: C.segThumb,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  segItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  segText: { color: C.text, ...font('500') },
  segTextOn: { color: '#FFFFFF', ...font('600') },
  listGroup: { backgroundColor: C.card, borderRadius: R.card, borderWidth: 1, borderColor: C.line, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 8 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: C.lineSoft },
  rowTitle: { color: C.text, fontSize: 15, ...font() },
  rowSub: { color: C.t2, fontSize: 13, ...font() },
  rowValue: { color: C.t2, fontSize: 14, ...font() },
  chevron: { color: C.t3, fontSize: 20, marginTop: -2 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: R.chip, alignSelf: 'flex-start', borderWidth: 1 },
  pillText: { fontSize: 12, ...font('500') },
  meterTrack: { backgroundColor: C.lineSoft, overflow: 'hidden' },
  meterFill: {},
  job: { gap: 12, padding: 16, borderRadius: R.card, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  jobHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  jobTitle: { color: C.text, fontSize: 15, flexShrink: 1, ...font('600') },
  jobPct: { color: C.text, fontSize: 15, fontFamily: F.monoMedium },
  logLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logTime: { color: C.t3, fontSize: 12, fontFamily: F.mono, width: 40 },
  logMark: { color: C.text, fontSize: 12, fontFamily: F.mono, width: 12, textAlign: 'center' },
  logText: { color: C.t2, fontSize: 12.5, fontFamily: F.mono, flexShrink: 1 },
  jobTime: { color: C.t3, fontSize: 12, fontFamily: F.mono },
  iconTile: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
});
