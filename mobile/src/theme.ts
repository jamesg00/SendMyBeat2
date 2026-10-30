import { Directory, File, Paths } from 'expo-file-system';
import { useSyncExternalStore } from 'react';
import { Platform, StyleSheet, useColorScheme, type TextStyle } from 'react-native';

// Colors come from the chosen theme. "Console" (true black, hairline borders, white primary
// actions, mint reserved for status) is the default; the rest follow the Clippr desktop app's
// palettes. Components read colors with useColors() / makeStyles() so a theme change re-renders
// them; see ThemeTransition for the cross-fade.
export type Palette = {
  id: ThemeId;
  dark: boolean;
  bg: string;
  card: string;
  card2: string;
  line: string;
  lineSoft: string;
  text: string;
  t2: string;
  t3: string;
  /** Primary buttons: white in Console, the theme's color elsewhere. */
  primary: string;
  onPrimary: string;
  segTrack: string;
  segThumb: string;
  /** Status color: done, uploaded, progress, positive change. */
  acc: string;
  onAcc: string;
  accSoft: string;
  accLine: string;
  danger: string;
  dangerSoft: string;
  dangerLine: string;
  warn: string;
  youtube: string;
  /** Unplayed waveform bars. */
  wave: string;
};

export type ThemeId = 'console' | 'auto' | 'light' | 'graphite' | 'noir' | 'paper' | 'mint' | 'midnight' | 'ocean' | 'sunset' | 'rose';
type Resolved = Exclude<ThemeId, 'auto'>;

const rgba = (hex: string, alpha: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
};

type Base = Pick<Palette, 'bg' | 'card' | 'card2' | 'text' | 't2' | 't3' | 'acc' | 'onAcc'> & {
  dark: boolean;
  /** Hairline strength, as white (dark) or black (light) alpha. */
  line: number;
  primary?: string;
  onPrimary?: string;
};

function palette(id: Resolved, b: Base): Palette {
  const ink = b.dark ? '#ffffff' : '#000000';
  return {
    id,
    dark: b.dark,
    bg: b.bg,
    card: b.card,
    card2: b.card2,
    line: rgba(ink, b.line),
    lineSoft: rgba(ink, b.line * 0.7),
    text: b.text,
    t2: b.t2,
    t3: b.t3,
    primary: b.primary ?? b.acc,
    onPrimary: b.onPrimary ?? b.onAcc,
    segTrack: b.dark ? rgba('#ffffff', 0.08) : rgba('#000000', 0.06),
    segThumb: b.dark ? rgba('#ffffff', 0.28) : '#ffffff',
    acc: b.acc,
    onAcc: b.onAcc,
    accSoft: rgba(b.acc, 0.14),
    accLine: rgba(b.acc, 0.4),
    danger: b.dark ? '#FF6B6B' : '#C9302C',
    dangerSoft: b.dark ? 'rgba(255,107,107,0.12)' : 'rgba(201,48,44,0.08)',
    dangerLine: b.dark ? 'rgba(255,107,107,0.38)' : 'rgba(201,48,44,0.32)',
    warn: b.dark ? '#F5A524' : '#B26B00',
    youtube: '#FF3B30',
    wave: rgba(ink, b.dark ? 0.22 : 0.16),
  };
}

const CONSOLE: Palette = {
  id: 'console',
  dark: true,
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
  dangerSoft: 'rgba(255,107,107,0.12)',
  dangerLine: 'rgba(255,107,107,0.38)',
  warn: '#F5A524',
  youtube: '#FF3B30',
  wave: '#3A3A3A',
};

export const PALETTES: Record<Resolved, Palette> = {
  console: CONSOLE,
  light: palette('light', { dark: false, bg: '#F5F5F7', card: '#FFFFFF', card2: '#E9E9EE', line: 0.09, text: '#1D1D1F', t2: '#55555B', t3: '#6A6A70', acc: '#0066D6', onAcc: '#FFFFFF' }),
  graphite: palette('graphite', { dark: true, bg: '#1C1C1E', card: '#2A2A2D', card2: '#38383C', line: 0.1, text: '#F5F5F7', t2: '#B4B4BA', t3: '#9A9AA1', acc: '#0A84FF', onAcc: '#001224' }),
  noir: palette('noir', { dark: true, bg: '#000000', card: '#0D0D0D', card2: '#1C1C1C', line: 0.16, text: '#FFFFFF', t2: '#C2C2C2', t3: '#A0A0A0', acc: '#FFFFFF', onAcc: '#000000' }),
  paper: palette('paper', { dark: false, bg: '#FFFFFF', card: '#F3F3F3', card2: '#E2E2E2', line: 0.16, text: '#000000', t2: '#3C3C3C', t3: '#5C5C5C', acc: '#000000', onAcc: '#FFFFFF' }),
  mint: palette('mint', { dark: true, bg: '#060D09', card: '#0B1510', card2: '#14231B', line: 0.08, text: '#ECF2EE', t2: '#A3B8AC', t3: '#86998D', acc: '#2EE59D', onAcc: '#04140C' }),
  midnight: palette('midnight', { dark: true, bg: '#12102A', card: '#1B1838', card2: '#292552', line: 0.1, text: '#F1EEFF', t2: '#B9B2DC', t3: '#A29BC9', acc: '#B794FF', onAcc: '#170A33' }),
  ocean: palette('ocean', { dark: true, bg: '#08141F', card: '#0E2233', card2: '#17344D', line: 0.1, text: '#E8F6FF', t2: '#9DB9CC', t3: '#86A3B7', acc: '#4FD1FF', onAcc: '#021824' }),
  sunset: palette('sunset', { dark: true, bg: '#1F1311', card: '#2B1B17', card2: '#3C2620', line: 0.1, text: '#FBEFE9', t2: '#D0B3A8', t3: '#B99B90', acc: '#FF9F6B', onAcc: '#2A0F05' }),
  rose: palette('rose', { dark: true, bg: '#1F1218', card: '#2B1822', card2: '#3D2231', line: 0.1, text: '#FDEEF5', t2: '#D3AEBF', t3: '#BB95A8', acc: '#FF7EB6', onAcc: '#2B0716' }),
};

/** The theme gallery, in order. "auto" follows the phone's light / dark setting. */
export const THEMES: { id: ThemeId; label: string }[] = [
  { id: 'console', label: 'Console' },
  { id: 'auto', label: 'Match system' },
  { id: 'light', label: 'Light' },
  { id: 'graphite', label: 'Dark' },
  { id: 'noir', label: 'Noir' },
  { id: 'paper', label: 'Paper' },
  { id: 'mint', label: 'Mint' },
  { id: 'midnight', label: 'Midnight' },
  { id: 'ocean', label: 'Ocean' },
  { id: 'sunset', label: 'Sunset' },
  { id: 'rose', label: 'Rose' },
];

// ---- chosen theme (saved on the device, kept across sign-outs)

const prefsDir = Platform.OS !== 'web' ? new Directory(Paths.document, 'prefs') : null;
const themeFile = prefsDir ? new File(prefsDir, 'theme.json') : null;

function loadThemeId(): ThemeId {
  try {
    const raw = themeFile ? (themeFile.exists ? themeFile.textSync() : null) : globalThis.localStorage?.getItem('smb_theme');
    const id = raw ? (JSON.parse(raw) as { id?: ThemeId }).id : undefined;
    return id && THEMES.some((t) => t.id === id) ? id : 'console';
  } catch {
    return 'console';
  }
}

function saveThemeId(id: ThemeId) {
  const raw = JSON.stringify({ id });
  try {
    if (themeFile && prefsDir) {
      if (!prefsDir.exists) prefsDir.create({ intermediates: true });
      themeFile.write(raw);
    } else {
      globalThis.localStorage?.setItem('smb_theme', raw);
    }
  } catch {
    // keeping the choice is best effort
  }
}

let themeId: ThemeId = loadThemeId();
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Switches instantly; ThemeTransition wraps this in the cross-fade. */
export function applyTheme(id: ThemeId) {
  if (id === themeId) return;
  themeId = id;
  saveThemeId(id);
  listeners.forEach((l) => l());
}

let transition: ((apply: () => void) => Promise<void>) | null = null;
/** ThemeTransition registers the cross-fade here. */
export function setThemeTransition(run: typeof transition) {
  transition = run;
}

/** Change theme with the cross-fade (or instantly where it can't run). */
export async function setTheme(id: ThemeId) {
  if (id === themeId) return;
  if (transition) await transition(() => applyTheme(id));
  else applyTheme(id);
}

export function useThemeId(): ThemeId {
  return useSyncExternalStore(subscribe, () => themeId);
}

/** The active palette. */
export function useColors(): Palette {
  const id = useThemeId();
  const scheme = useColorScheme();
  if (id === 'auto') return scheme === 'light' ? PALETTES.light : PALETTES.graphite;
  return PALETTES[id];
}

/** A per-file style sheet built from the active palette, e.g.
 *  `const useStyles = makeStyles((C) => ({ title: { color: C.text } }))`, then `const s = useStyles()`. */
type StyleInput = Parameters<typeof StyleSheet.create>[0];
export function makeStyles<T extends StyleInput>(build: (C: Palette) => T) {
  const cache = new Map<Palette, Readonly<T>>();
  return function useStyles(): Readonly<T> {
    const C = useColors();
    let sheet = cache.get(C);
    if (!sheet) {
      sheet = StyleSheet.create(build(C));
      cache.set(C, sheet);
    }
    return sheet;
  };
}

export const R = { card: 12, ctl: 10, thumb: 7, chip: 6 } as const;

// Each weight is its own font family, so pick the family instead of fontWeight
// (Android ignores fontWeight on custom fonts). Satoshi has no semibold, so 600 uses bold.
// The Fontshare files are fetched on npm install (scripts/fetch-fonts.mjs).
export const F = {
  regular: 'Satoshi-Regular',
  medium: 'Satoshi-Medium',
  bold: 'Satoshi-Bold',
  display: 'ClashGrotesk-Semibold',
  mono: 'GeistMono_400Regular',
  monoMedium: 'GeistMono_500Medium',
  brand: 'KarmaticArcade',
} as const;

const WEIGHTS: Record<string, string> = {
  '400': F.regular,
  normal: F.regular,
  '500': F.medium,
  '600': F.bold,
  '700': F.bold,
  '800': F.bold,
  bold: F.bold,
};

/** Satoshi at a given weight, e.g. `...font('600')`. */
export const font = (weight: TextStyle['fontWeight'] = '400'): TextStyle => ({
  fontFamily: WEIGHTS[String(weight)] ?? F.regular,
});

/** Clash Grotesk, for large titles and producer names. */
export const display: TextStyle = { fontFamily: F.display };
