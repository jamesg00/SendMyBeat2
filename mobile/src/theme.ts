import type { TextStyle } from 'react-native';

// v3 "Console" look: true black, hairline borders, Geist type, white primary actions.
// Mint (acc) is reserved for status: done, uploaded, progress, positive change.
// See the "SendMyBeat App Redesign Plan" doc, section "Second pass: v3 Console".
export const C = {
  bg: '#000000',
  card: '#0A0A0A',
  card2: '#111111',
  line: '#262626',
  lineSoft: '#1F1F1F',
  text: '#EDEDED',
  t2: '#A1A1A1',
  t3: '#8F8F8F',
  primary: '#EDEDED',
  onPrimary: '#0A0A0A',
  segTrack: '#1C1C1E',
  segThumb: '#636366',
  acc: '#2EE59D',
  onAcc: '#03140C',
  accSoft: 'rgba(46,229,157,0.12)',
  accLine: '#1E5A42',
  danger: '#FF6B6B',
  warn: '#F5A524',
  youtube: '#FF3B30',
} as const;

export const R = { card: 12, ctl: 10, thumb: 7, chip: 6 } as const;

// Each Geist weight is its own font family, so pick the family instead of fontWeight
// (Android ignores fontWeight on custom fonts).
export const F = {
  regular: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semibold: 'Geist_600SemiBold',
  bold: 'Geist_700Bold',
  mono: 'GeistMono_400Regular',
  monoMedium: 'GeistMono_500Medium',
  brand: 'KarmaticArcade',
} as const;

const WEIGHTS: Record<string, string> = {
  '400': F.regular,
  normal: F.regular,
  '500': F.medium,
  '600': F.semibold,
  '700': F.bold,
  '800': F.bold,
  bold: F.bold,
};

/** Geist at a given weight, e.g. `...font('600')`. */
export const font = (weight: TextStyle['fontWeight'] = '400'): TextStyle => ({
  fontFamily: WEIGHTS[String(weight)] ?? F.regular,
});
