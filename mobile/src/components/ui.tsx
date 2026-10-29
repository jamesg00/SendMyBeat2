import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Pressable,
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

import { C, F, R } from '@/theme';

export function Screen({
  title,
  accessory,
  header,
  children,
}: {
  title: string;
  accessory?: ReactNode;
  header?: ReactNode;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={[styles.screen, { paddingTop: insets.top + 12 }]}
      showsVerticalScrollIndicator={false}>
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
      <Text style={styles.sectionLabel}>{children.toUpperCase()}</Text>
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

// Flat solid buttons with a small press-scale, matching Clippr's Btn.qml.
export function Button({ title, onPress, variant = 'primary', size = 'lg', style }: ButtonProps) {
  const height = size === 'lg' ? 50 : size === 'md' ? 40 : 30;
  const radius = size === 'lg' ? 14 : size === 'md' ? 12 : 9;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        { height, borderRadius: radius, paddingHorizontal: size === 'sm' ? 12 : 16 },
        variant === 'primary' && { backgroundColor: C.acc },
        variant === 'secondary' && { backgroundColor: C.card2, borderWidth: 1, borderColor: C.line },
        variant === 'plain' && { backgroundColor: 'transparent', paddingHorizontal: 0 },
        pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
        style,
      ]}>
      <Text
        style={[
          styles.buttonText,
          { fontSize: size === 'lg' ? 15 : size === 'md' ? 14 : 12 },
          { color: variant === 'primary' ? C.onAcc : variant === 'plain' ? C.acc : C.text },
        ]}>
        {title}
      </Text>
    </Pressable>
  );
}

export type SegOption<V extends string> = { value: V; label: string };

// iOS-style segmented control: the solid accent thumb springs between options.
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
  const cell = width > 0 ? (width - 6) / options.length : 0;
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
            <Text style={[styles.segText, { color: active ? C.onAcc : C.t2, fontSize: compact ? 12 : 13 }]}>
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
    <View style={[styles.pill, { backgroundColor: tone === 'accent' ? C.accSoft : C.card2 }]}>
      <Text style={[styles.pillText, { color: tone === 'accent' ? C.acc : C.t2 }]}>{label}</Text>
    </View>
  );
}

export function Meter({ value, color = C.acc, height = 4 }: { value: number; color?: string; height?: number }) {
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

// Live progress for a background job. Servers report progress in big jumps (20% → 100%), so the bar
// also creeps forward on an eased estimate from elapsed time and never sits still.
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
  /** Stage labels shown in order as time passes; the server's message wins when there are none. */
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
  const step = steps?.length ? steps[Math.min(steps.length - 1, Math.floor((elapsed / expectedSec) * steps.length))] : message;
  const left = Math.max(0, expectedSec - elapsed);

  return (
    <View style={styles.job} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}>
      <View style={styles.jobHead}>
        <Text style={styles.jobTitle}>{title}</Text>
        <Text style={styles.jobPct}>{Math.round(pct)}%</Text>
      </View>
      <Meter value={pct / 100} height={6} />
      <View style={styles.jobHead}>
        <Text style={styles.jobStep} numberOfLines={1}>
          {step ?? 'Working…'}
        </Text>
        <Text style={styles.jobTime}>{left > 1 ? `~${clock(left)} left` : clock(elapsed)}</Text>
      </View>
    </View>
  );
}

export function IconTile({ children, tint = C.accSoft }: { children: ReactNode; tint?: string }) {
  return <View style={[styles.iconTile, { backgroundColor: tint }]}>{children}</View>;
}

export const styles = StyleSheet.create({
  screen: { paddingHorizontal: 16, paddingBottom: 140, gap: 16, backgroundColor: C.bg },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  largeTitle: { color: C.text, fontSize: 34, fontWeight: '700', letterSpacing: -0.6 },
  card: { backgroundColor: C.card, borderRadius: R.card, borderWidth: 1, borderColor: C.line, padding: 16, gap: 12 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 },
  sectionLabel: { color: C.t3, fontSize: 11, fontWeight: '600', letterSpacing: 0.6 },
  body: { color: C.text, fontSize: 15 },
  button: { alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontWeight: '600' },
  seg: { flexDirection: 'row', padding: 3, borderRadius: R.ctl, backgroundColor: C.card2 },
  segThumb: { position: 'absolute', top: 3, left: 3, borderRadius: R.thumb, backgroundColor: C.acc },
  segItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  segText: { fontWeight: '600' },
  listGroup: { backgroundColor: C.card, borderRadius: R.card, borderWidth: 1, borderColor: C.line, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 8 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  rowTitle: { color: C.text, fontSize: 15 },
  rowSub: { color: C.t3, fontSize: 12, fontFamily: F.mono },
  rowValue: { color: C.t3, fontSize: 15 },
  chevron: { color: C.t3, fontSize: 20, marginTop: -2 },
  pill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' },
  pillText: { fontSize: 12, fontWeight: '600' },
  meterTrack: { height: 4, borderRadius: 2, backgroundColor: C.card2, overflow: 'hidden' },
  meterFill: { height: 4, borderRadius: 2 },
  job: { gap: 8, padding: 14, borderRadius: R.card, backgroundColor: C.card2 },
  jobHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  jobTitle: { color: C.text, fontSize: 15, fontWeight: '600', flexShrink: 1 },
  jobPct: { color: C.acc, fontSize: 15, fontWeight: '700', fontFamily: F.mono },
  jobStep: { color: C.t2, fontSize: 12, flexShrink: 1 },
  jobTime: { color: C.t3, fontSize: 11, fontFamily: F.mono },
  iconTile: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
});
