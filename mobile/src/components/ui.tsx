import { useEffect, useState, type ReactNode } from 'react';
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
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
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

  useEffect(() => {
    x.value = withSpring(index * cell, { damping: 18, stiffness: 220 });
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

export function Meter({ value, color = C.acc }: { value: number; color?: string }) {
  return (
    <View style={styles.meterTrack}>
      <View style={[styles.meterFill, { width: `${Math.round(value * 100)}%`, backgroundColor: color }]} />
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
  iconTile: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
});
