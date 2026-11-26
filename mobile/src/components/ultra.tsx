import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { GradientFill } from '@/components/ui';
import { F, font, makeStyles, useColors, type Palette } from '@/theme';

// More of the landing page look (Console Ultra) for screens that draw their own pieces: gradient
// headline words, gradient fills with the sheen for hand-made buttons, the staggered rise-in, the
// glowing call-to-action card and the accent bar on an active step. Everything here is looks only
// and keeps still when Reduce Motion is on.

const ABS = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

let seq = 0;
function useId(prefix: string) {
  const [id] = useState(() => `${prefix}${++seq}`);
  return id;
}

/** `a` blended toward `b` by `t` (0..1). Palette gradient stops are always #rrggbb. */
function mixHex(a: string, b: string, t: number) {
  const x = parseInt(a.slice(1, 7), 16);
  const y = parseInt(b.slice(1, 7), 16);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return a;
  const ch = (s: number) => Math.round(((x >> s) & 255) * (1 - t) + ((y >> s) & 255) * t);
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}

/** The theme's gradient color at `t` (0 is the mint end, 1 the blue end in Console). */
export function gradAt(C: Palette, t: number) {
  return mixHex(C.gradA, C.gradB, Math.max(0, Math.min(1, t)));
}

/** `hex` at `alpha`, as rgba. */
export function alpha(hex: string, a: number) {
  const n = parseInt(hex.slice(1, 7), 16);
  if (!Number.isFinite(n)) return hex;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/**
 * Words in the theme's gradient (mint to blue in Console), for the accent in a headline. Use it
 * inside a <Text>: each letter takes its step of the gradient, so the words still wrap with the
 * rest of the line and read as one piece of text.
 */
export function GradientSpan({ children }: { children: string }) {
  const C = useColors();
  const chars = Array.from(children);
  const n = Math.max(1, chars.length - 1);
  return (
    <>
      {chars.map((ch, i) => (
        <Text key={i} style={{ color: mixHex(C.gradA, C.gradB, i / n) }}>
          {ch}
        </Text>
      ))}
    </>
  );
}

/** The soft blue glow under a gradient button. */
export function gradGlow(C: Palette, strength = 1): ViewStyle {
  return {
    shadowColor: C.gradB,
    shadowOpacity: (C.dark ? 0.55 : 0.3) * strength,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  };
}

/** The light that passes across a gradient button every few seconds. */
function Sheen({ width }: { width: number }) {
  const id = useId('ush');
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    t.value = withRepeat(withTiming(1, { duration: 4500, easing: Easing.linear }), -1);
  }, [reduce, t]);
  const band = Math.max(24, width * 0.4);
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

/**
 * The main button's gradient, for a hand-made button: put it first inside the Pressable and use
 * C.onGrad for its text and icons. `sheen` adds the passing light (leave it off on small round
 * buttons).
 */
export function UltraFill({ radius = 0, sheen = true, angle }: { radius?: number; sheen?: boolean; angle?: 'diagonal' | 'horizontal' }) {
  const [w, setW] = useState(0);
  return (
    <View
      pointerEvents="none"
      style={[ABS, { borderRadius: radius, overflow: 'hidden' }]}
      onLayout={sheen ? (e) => setW(e.nativeEvent.layout.width) : undefined}>
      <GradientFill radius={radius} angle={angle} />
      {sheen ? <Sheen width={w} /> : null}
    </View>
  );
}

/** Rises in from a little below, `index` steps after the first, like the landing page hero. */
export function Rise({ index = 0, children, style }: { index?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduce = useReducedMotion();
  const t = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) {
      t.value = 1;
      return;
    }
    t.value = withDelay(index * 80, withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) }));
  }, [index, reduce, t]);
  const rise = useAnimatedStyle(() => ({ opacity: t.value, transform: [{ translateY: (1 - t.value) * 18 }] }));
  return <Animated.View style={[style, rise]}>{children}</Animated.View>;
}

/**
 * The last call to action: a glowing card in the theme's gradient. Text on it uses C.onGrad
 * (onGradSoft for the smaller lines), and its button is an InkButton.
 */
export function CtaCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const C = useColors();
  const s = useStyles();
  return (
    <View style={[s.cta, { backgroundColor: C.gradB, shadowColor: C.gradB }]}>
      <View pointerEvents="none" style={[ABS, { borderRadius: 24, overflow: 'hidden' }]}>
        <GradientFill radius={24} />
      </View>
      <View style={[s.ctaInner, style]}>{children}</View>
    </View>
  );
}

/** Smaller text on the gradient. */
export const onGradSoft = (C: Palette) => alpha(C.onGrad, 0.75);

/** The dark button that sits on the gradient card. */
export function InkButton({ title, onPress, style }: { title: string; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  const C = useColors();
  const s = useStyles();
  // On light themes onGrad is white, so the words take the gradient's deep end instead.
  const text = C.dark ? '#FFFFFF' : C.gradB;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [s.ink, { backgroundColor: C.onGrad }, pressed && { transform: [{ scale: 0.97 }], opacity: 0.85 }, style]}>
      <Text style={[s.inkText, { color: text }]}>{title}</Text>
    </Pressable>
  );
}

/** The bar that marks the active step or row, along its left edge. */
export function AccentBar({ color, inset = 8, left = 0 }: { color?: string; inset?: number; left?: number }) {
  const C = useColors();
  return <View pointerEvents="none" style={{ position: 'absolute', left, top: inset, bottom: inset, width: 3, borderRadius: 2, backgroundColor: color ?? C.acc }} />;
}

/** A small badge filled with the gradient ("MOST POPULAR"). */
export function GradPill({ label, style, textStyle }: { label: string; style?: StyleProp<ViewStyle>; textStyle?: StyleProp<TextStyle> }) {
  const C = useColors();
  const s = useStyles();
  return (
    <View style={[s.gradPill, style]}>
      <GradientFill radius={5} angle="horizontal" />
      <Text style={[s.gradPillText, { color: C.onGrad }, textStyle]}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  cta: {
    borderRadius: 24,
    shadowOpacity: 0.5,
    shadowRadius: 36,
    shadowOffset: { width: 0, height: 18 },
    elevation: 10,
  },
  ctaInner: { padding: 22, gap: 14 },
  ink: { height: 50, borderRadius: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  inkText: { fontSize: 16, ...font('600') },
  gradPill: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, overflow: 'hidden' },
  gradPillText: { fontSize: 10, letterSpacing: 0.4, fontFamily: F.monoMedium },
}));
