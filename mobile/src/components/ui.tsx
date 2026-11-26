import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Alert,
  Animated as RNAnimated,
  PanResponder,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import Svg, { Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { Wallpaper } from '@/components/wallpaper';
import { useKnownSubscription } from '@/state/billing';
import { useWallpaperId, wallpaperColors } from '@/state/wallpaper';
import { F, R, display, font, makeStyles, useColors } from '@/theme';

export function Screen({
  title,
  icon,
  accessory,
  header,
  refreshing,
  onRefresh,
  children,
}: {
  title: string;
  /** Shown before the title (the app icon on Profile). */
  icon?: ReactNode;
  accessory?: ReactNode;
  header?: ReactNode;
  /** Pass both to enable pull to refresh. */
  refreshing?: boolean;
  onRefresh?: () => void;
  children: ReactNode;
}) {
  const C = useColors();
  const styles = useUiStyles();
  const insets = useSafeAreaInsets();
  // The picked wallpaper sits behind the content (paying accounts only; light themes get its light
  // version), and only animates while this tab is the one on screen. It waits for the plan to
  // load, so a free account never sees it flash in.
  const paying = !!useKnownSubscription()?.is_subscribed;
  const wallpaperId = useWallpaperId();
  const wallColors = wallpaperColors(C);
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  const wall = paying && wallpaperId ? <Wallpaper id={wallpaperId} colors={wallColors} active={focused} /> : null;
  // The scroll view starts below the status bar so the pull-to-refresh spinner shows under it,
  // not hidden behind the clock.
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      {wall}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.screen, { paddingTop: 12 }, wall ? { backgroundColor: 'transparent' } : null]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={C.text} colors={[C.acc]} progressBackgroundColor={C.card2} />
          ) : undefined
        }>
        {header}
        <View style={styles.titleRow}>
          {wall ? null : <Aurora />}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 }}>
            {icon}
            <Text style={styles.largeTitle} accessibilityRole="header">
              {title}
            </Text>
          </View>
          {accessory}
        </View>
        {children}
      </ScrollView>
    </View>
  );
}

// ---- the landing page look (Console Ultra): gradient pieces shared by every screen

let gradSeq = 0;
/** A unique id for an SVG gradient, stable for the component's life. */
function useGradId(prefix: string) {
  const [id] = useState(() => `${prefix}${++gradSeq}`);
  return id;
}

/** Fills its parent with the theme's gradient (mint to blue in Console). */
export function GradientFill({ radius = 0, angle = 'diagonal' }: { radius?: number; angle?: 'diagonal' | 'horizontal' }) {
  const C = useColors();
  const id = useGradId('gf');
  return (
    <Svg style={StyleSheetAbsolute} width="100%" height="100%" pointerEvents="none">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2={angle === 'diagonal' ? '1' : '0'}>
          <Stop offset="0" stopColor={C.gradA} />
          <Stop offset="1" stopColor={C.gradB} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" rx={radius} ry={radius} fill={`url(#${id})`} />
    </Svg>
  );
}

const StyleSheetAbsolute = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

/** The thin mint-to-blue light along the top of a card. */
export function TopLight() {
  const C = useColors();
  const id = useGradId('tl');
  return (
    <Svg style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1 }} width="100%" height={1} pointerEvents="none">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={C.gradA} stopOpacity={0} />
          <Stop offset="0.35" stopColor={C.gradA} stopOpacity={0.7} />
          <Stop offset="0.65" stopColor={C.gradB} stopOpacity={0.6} />
          <Stop offset="1" stopColor={C.gradB} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height={1} fill={`url(#${id})`} />
    </Svg>
  );
}

/** A slow mint and blue glow behind a title, like the landing page hero. */
export function Aurora({ style }: { style?: StyleProp<ViewStyle> }) {
  const C = useColors();
  const id = useGradId('au');
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    t.value = withRepeat(withTiming(1, { duration: 16000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduce, t]);
  const drift = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(t.value, [0, 1], [0, -24]) }, { translateY: interpolate(t.value, [0, 1], [0, 14]) }, { scale: interpolate(t.value, [0, 1], [1, 1.1]) }],
  }));
  const a = C.dark ? 0.24 : 0.14;
  const b = C.dark ? 0.3 : 0.14;
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: -90, right: -60, width: 380, height: 240 }, drift, style]}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id={`${id}a`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={C.gradA} stopOpacity={a} />
            <Stop offset="1" stopColor={C.gradA} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`${id}b`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={C.gradB} stopOpacity={b} />
            <Stop offset="1" stopColor={C.gradB} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx="45%" cy="40%" rx="38%" ry="42%" fill={`url(#${id}a)`} />
        <Ellipse cx="72%" cy="62%" rx="40%" ry="45%" fill={`url(#${id}b)`} />
      </Svg>
    </Animated.View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const styles = useUiStyles();
  return (
    <View style={[styles.card, style]}>
      <TopLight />
      {children}
    </View>
  );
}

/** A card with a gradient edge that travels around it, for the one thing on a screen that
 *  matters most (the plan that fits, the main tool). Still when Reduce Motion is on. */
export function EdgeCard({ children, style, glow }: { children: ReactNode; style?: StyleProp<ViewStyle>; glow?: boolean }) {
  const C = useColors();
  const styles = useUiStyles();
  const id = useGradId('ec');
  const reduce = useReducedMotion();
  const [box, setBox] = useState({ w: 0, h: 0 });
  const spin = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    spin.value = withRepeat(withTiming(360, { duration: 7000, easing: Easing.linear }), -1);
  }, [reduce, spin]);
  const rotate = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));
  const d = Math.ceil(Math.hypot(box.w, box.h));
  const faint = C.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  return (
    <View
      style={[styles.edgeWrap, glow && { backgroundColor: C.card, shadowColor: C.gradB, shadowOpacity: 0.45, shadowRadius: 24, shadowOffset: { width: 0, height: 14 }, elevation: 8 }]}
      onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <View style={[StyleSheetAbsolute, { borderRadius: R.card, overflow: 'hidden' }]} pointerEvents="none">
        {d > 0 ? (
          <Animated.View style={[{ position: 'absolute', width: d, height: d, left: (box.w - d) / 2, top: (box.h - d) / 2 }, rotate]}>
            <Svg width={d} height={d}>
              <Defs>
                <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor={C.gradA} />
                  <Stop offset="0.3" stopColor={C.gradB} />
                  <Stop offset="0.5" stopColor={faint} />
                  <Stop offset="1" stopColor={faint} />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width={d} height={d} fill={`url(#${id})`} />
            </Svg>
          </Animated.View>
        ) : null}
      </View>
      <View style={[styles.edgeInner, style]}>{children}</View>
    </View>
  );
}

/** Section labels read like code comments, as on the landing page: "// Pricing". */
export function SectionLabel({ children, right }: { children: string; right?: ReactNode }) {
  const styles = useUiStyles();
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionLabel} accessibilityLabel={children}>
        <Text style={styles.sectionSlash}>{'// '}</Text>
        {children}
      </Text>
      {right}
    </View>
  );
}

export function T({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const styles = useUiStyles();
  return <Text style={[styles.body, style]}>{children}</Text>;
}

type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'plain';
  size?: 'lg' | 'md' | 'sm';
  style?: StyleProp<ViewStyle>;
};

/** The light that passes across a main button every few seconds. */
function Sheen({ width }: { width: number }) {
  const id = useGradId('sh');
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    t.value = withRepeat(withTiming(1, { duration: 4500, easing: Easing.linear }), -1);
  }, [reduce, t]);
  const band = width * 0.4;
  const move = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(t.value, [0, 0.6, 1], [-band * 1.6, -band * 1.6, width + band]) }, { skewX: '-20deg' }],
  }));
  if (reduce || width <= 0) return null;
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, bottom: 0, left: 0, width: band }, move]}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#ffffff" stopOpacity={0} />
            <Stop offset="0.5" stopColor="#ffffff" stopOpacity={0.45} />
            <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

// Primary is the landing page's mint-to-blue button (the theme's own gradient in other themes),
// with a sheen that passes every few seconds and a soft blue glow under it.
export function Button({ title, onPress, variant = 'primary', size = 'lg', style }: ButtonProps) {
  const C = useColors();
  const styles = useUiStyles();
  const [width, setWidth] = useState(0);
  const height = size === 'lg' ? 50 : size === 'md' ? 40 : 32;
  const radius = size === 'lg' ? 12 : size === 'md' ? 10 : 8;
  const primary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      onLayout={primary ? (e) => setWidth(e.nativeEvent.layout.width) : undefined}
      style={({ pressed }) => [
        styles.button,
        { height, borderRadius: radius, paddingHorizontal: size === 'sm' ? 12 : 16 },
        primary && { backgroundColor: C.gradB, shadowColor: C.gradB, shadowOpacity: C.dark ? 0.55 : 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
        variant === 'secondary' && { backgroundColor: C.card2, borderWidth: 1, borderColor: C.line },
        variant === 'plain' && { backgroundColor: 'transparent', paddingHorizontal: 0 },
        pressed && { transform: [{ scale: 0.97 }], opacity: 0.85 },
        style,
      ]}>
      {primary ? (
        <View style={[StyleSheetAbsolute, { borderRadius: radius, overflow: 'hidden' }]} pointerEvents="none">
          <GradientFill radius={radius} />
          <Sheen width={width} />
        </View>
      ) : null}
      <Text
        style={[
          styles.buttonText,
          { fontSize: size === 'lg' ? 16 : size === 'md' ? 15 : 13 },
          { color: primary ? C.onGrad : variant === 'plain' ? C.t2 : C.text },
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
  const styles = useUiStyles();
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
  const styles = useUiStyles();
  return (
    <View style={styles.listGroup}>
      <TopLight />
      {children}
    </View>
  );
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
  const C = useColors();
  const styles = useUiStyles();
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
  const C = useColors();
  const styles = useUiStyles();
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

/** `gradient` fills it mint to blue (the theme's gradient) instead of one color. */
export function Meter({ value, color, height = 2, gradient }: { value: number; color?: string; height?: number; gradient?: boolean }) {
  const C = useColors();
  const styles = useUiStyles();
  const w = useSharedValue(Math.max(0, Math.min(1, value)));
  useEffect(() => {
    w.value = withTiming(Math.max(0, Math.min(1, value)), { duration: 450, easing: Easing.out(Easing.cubic) });
  }, [value, w]);
  const fill = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View style={[styles.meterTrack, { height, borderRadius: height / 2 }]}>
      <Animated.View
        style={[styles.meterFill, { height, borderRadius: height / 2, backgroundColor: gradient ? undefined : (color ?? C.text), overflow: 'hidden' }, fill]}>
        {gradient ? <GradientFill angle="horizontal" /> : null}
      </Animated.View>
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
  const C = useColors();
  const styles = useUiStyles();
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
      <TopLight />
      <View style={styles.jobHead}>
        <Text style={styles.jobTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.jobPct}>{Math.round(pct)}%</Text>
      </View>
      <Meter value={pct / 100} gradient />
      <View style={{ gap: 8 }}>
        {lines.slice(0, current + 2).map((l) => (
          <View key={l.label} style={styles.logLine}>
            <Text style={styles.logTime}>{l.state === 'next' ? '--:--' : clock(l.at)}</Text>
            {l.state === 'now' ? (
              <BlinkDot style={styles.logMark} />
            ) : (
              <Text style={[styles.logMark, l.state === 'done' && { color: C.acc }, l.state === 'next' && { color: C.t3 }]}>
                {l.state === 'done' ? '✓' : '○'}
              </Text>
            )}
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

/** The step that's running: a dot that blinks, like a terminal working away. */
function BlinkDot({ style }: { style: TextStyle }) {
  const opacity = useSharedValue(1);
  useEffect(() => {
    const ease = { duration: 520, easing: Easing.inOut(Easing.quad) };
    opacity.value = withRepeat(withSequence(withTiming(0.15, ease), withTiming(1, ease)), -1);
  }, [opacity]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.Text style={[style, animated]}>●</Animated.Text>;
}

const SWIPE_ACTION_W = 96;

/** Swipe left to show a Delete button (tap it), or swipe all the way to delete straight away.
 *  onDelete should confirm. Swipe back or tap the card to close it. */
// Alert.alert does nothing on web, so the web preview uses the browser's confirm.
export function confirmAction(title: string, message: string, action: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onYes();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Keep', style: 'cancel' },
    { text: action, style: 'destructive', onPress: onYes },
  ]);
}

/** The SendMyBeat app icon, with the same rounded corners as on the home screen. */
export function AppIcon({ size = 32 }: { size?: number }) {
  return (
    <Image
      source={require('@/assets/images/icon.png')}
      style={{ width: size, height: size, borderRadius: size * 0.225 }}
      accessibilityLabel="SendMyBeat"
      accessibilityRole="image"
    />
  );
}

/** Swipe left to reveal a red delete action; swipe far to delete outright. `radius` matches the
 * row's corners (cards are rounded, list rows are square). */
export function SwipeToDelete({ children, onDelete, label, radius = R.card }: { children: ReactNode; onDelete: () => void; label: string; radius?: number }) {
  const styles = useUiStyles();
  const [x] = useState(() => new RNAnimated.Value(0));
  const [open, setOpen] = useState(false);

  const snap = useCallback(
    (to: 'open' | 'closed') => {
      setOpen(to === 'open');
      RNAnimated.spring(x, { toValue: to === 'open' ? -SWIPE_ACTION_W : 0, useNativeDriver: true, bounciness: 4, speed: 18 }).start();
    },
    [x],
  );
  const remove = useCallback(() => {
    snap('closed');
    onDelete();
  }, [onDelete, snap]);

  const pan = useMemo(() => {
    const base = open ? -SWIPE_ACTION_W : 0;
    // Any mostly-sideways drag counts; it doesn't have to be a straight line.
    const sideways = (g: { dx: number; dy: number }) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy);
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => sideways(g),
      onMoveShouldSetPanResponderCapture: (_, g) => sideways(g),
      // Once swiping, the page doesn't take the gesture back.
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => {
        const next = base + g.dx;
        // Past the button it keeps following, with some resistance; it never moves right of closed.
        x.setValue(next < -SWIPE_ACTION_W ? -SWIPE_ACTION_W + (next + SWIPE_ACTION_W) * 0.6 : Math.min(0, next));
      },
      onPanResponderRelease: (_, g) => {
        const end = base + g.dx;
        if (end < -SWIPE_ACTION_W * 2.2) remove();
        else if (end < -SWIPE_ACTION_W / 2 || g.vx < -0.4) snap('open');
        else snap('closed');
      },
      onPanResponderTerminate: () => snap(open ? 'open' : 'closed'),
    });
  }, [open, remove, snap, x]);
  const reveal = x.interpolate({ inputRange: [-SWIPE_ACTION_W, -8, 0], outputRange: [1, 0.2, 0], extrapolate: 'clamp' });
  // The button grows in as the row slides, then holds; the row dims a little while it's open.
  const grow = x.interpolate({ inputRange: [-SWIPE_ACTION_W, -24, 0], outputRange: [1, 0.7, 0.7], extrapolate: 'clamp' });
  const dim = x.interpolate({ inputRange: [-SWIPE_ACTION_W, 0], outputRange: [0.55, 1], extrapolate: 'clamp' });

  return (
    <View
      style={{ borderRadius: radius, overflow: 'hidden' }}
      accessibilityActions={[{ name: 'delete', label }]}
      onAccessibilityAction={(e) => e.nativeEvent.actionName === 'delete' && onDelete()}>
      <RNAnimated.View style={[styles.swipeBehind, { opacity: reveal }]}>
        <RNAnimated.View style={[styles.swipeAction, { transform: [{ scale: grow }] }]}>
          <Pressable
            onPress={remove}
            style={({ pressed }) => [styles.swipeButton, pressed && { opacity: 0.8 }]}
            accessibilityRole="button"
            accessibilityLabel={label}>
            <TrashIcon />
            <Text style={styles.swipeLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {label}
            </Text>
          </Pressable>
        </RNAnimated.View>
      </RNAnimated.View>
      <RNAnimated.View style={{ transform: [{ translateX: x }], opacity: dim }} {...pan.panHandlers}>
        {children}
        {open ? (
          <Pressable
            onPress={() => snap('closed')}
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
        ) : null}
      </RNAnimated.View>
    </View>
  );
}

function TrashIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
    </Svg>
  );
}

/** Drawn play / pause glyph. Text characters like "▶" turn into emoji on iOS. */
export function PlayPauseIcon({ playing, size = 12, color }: { playing: boolean; size?: number; color?: string }) {
  const C = useColors();
  const fill = color ?? C.onPrimary;
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12" accessibilityElementsHidden importantForAccessibility="no">
      {playing ? (
        <>
          <Rect x={2} y={1} width={3} height={10} rx={0.8} fill={fill} />
          <Rect x={7} y={1} width={3} height={10} rx={0.8} fill={fill} />
        </>
      ) : (
        // Nudged right so the triangle looks centred in a round button.
        <Path d="M3.2 1.4 L10.6 6 L3.2 10.6 Z" fill={fill} strokeLinejoin="round" />
      )}
    </Svg>
  );
}

export function IconTile({ children, tint }: { children: ReactNode; tint?: string }) {
  const C = useColors();
  const styles = useUiStyles();
  return <View style={[styles.iconTile, { backgroundColor: tint ?? C.card2 }]}>{children}</View>;
}

export const useUiStyles = makeStyles((C) => ({
  swipeBehind: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  // A rounded button inside the row, clear of its dividers, rather than a flat red block.
  swipeAction: { width: SWIPE_ACTION_W, paddingVertical: 8, paddingLeft: 10, paddingRight: 2 },
  swipeButton: { flex: 1, borderRadius: 12, backgroundColor: C.danger, alignItems: 'center', justifyContent: 'center', gap: 3 },
  swipeLabel: { color: '#FFFFFF', fontSize: 12.5, ...font('600') },
  screen: { paddingHorizontal: 20, paddingBottom: 140, gap: 20, backgroundColor: C.bg },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  largeTitle: { color: C.text, fontSize: 30, lineHeight: 36, letterSpacing: -0.3, ...display },
  card: { backgroundColor: C.card, borderRadius: R.card, borderWidth: 1, borderColor: C.line, padding: 16, gap: 12 },
  edgeWrap: { borderRadius: R.card, padding: 1 },
  edgeInner: { backgroundColor: C.card, borderRadius: R.card - 1, padding: 15, gap: 12 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 2 },
  sectionLabel: { color: C.t2, fontSize: 12.5, fontFamily: F.mono, letterSpacing: 0.2 },
  sectionSlash: { color: C.t3 },
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
  segTextOn: { color: C.text, ...font('600') },
  listGroup: { backgroundColor: C.card, borderRadius: R.card, borderWidth: 1, borderColor: C.line, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 8 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: C.lineSoft },
  rowTitle: { color: C.text, fontSize: 15, ...font() },
  rowSub: { color: C.t2, fontSize: 13, ...font() },
  rowValue: { color: C.t2, fontSize: 14, ...font() },
  chevron: { color: C.t3, fontSize: 20, marginTop: -2 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5, alignSelf: 'flex-start', borderWidth: 1 },
  pillText: { fontSize: 12, ...font('500') },
  meterTrack: { backgroundColor: C.lineSoft, overflow: 'hidden' },
  meterFill: {},
  job: { gap: 12, padding: 16, borderRadius: R.card, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  jobHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  jobTitle: { color: C.text, fontSize: 15, flexShrink: 1, ...font('600') },
  jobPct: { color: C.text, fontSize: 15, fontFamily: F.monoMedium },
  logLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logTime: { color: C.t3, fontSize: 12, fontFamily: F.mono, width: 42, flexShrink: 0 },
  logMark: { color: C.text, fontSize: 12, fontFamily: F.mono, width: 12, flexShrink: 0, textAlign: 'center' },
  logText: { color: C.t2, fontSize: 12.5, fontFamily: F.mono, flexShrink: 1 },
  jobTime: { color: C.t3, fontSize: 12, fontFamily: F.mono },
  iconTile: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
}));
