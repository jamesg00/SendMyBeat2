import { Platform } from 'react-native';

// Clippr "mint" palette (see YouTube Clip Downloader/clipdl/qml_ui/qml/Theme.qml) so both apps feel like one family.
export const C = {
  bg: '#060D09',
  card: '#0B1510',
  card2: '#14231B',
  line: 'rgba(255,255,255,0.08)',
  lineSoft: 'rgba(255,255,255,0.06)',
  text: '#ECF2EE',
  t2: '#A3B8AC',
  t3: '#86998D',
  acc: '#2EE59D',
  onAcc: '#04140C',
  accSoft: 'rgba(46,229,157,0.18)',
  danger: '#FF6B6B',
  warn: '#FFD25A',
  youtube: '#FF3B30',
} as const;

export const R = { card: 16, ctl: 11, thumb: 8 } as const;

export const F = {
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace, Consolas, monospace' }),
  brand: 'KarmaticArcade',
} as const;
