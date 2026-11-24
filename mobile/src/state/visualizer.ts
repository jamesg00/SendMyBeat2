// The visualizer in the app: the same styles as the website, drawn by the website's own code in a
// WebView (components/visualizer-preview.tsx), so a video made on the phone matches the site.

export const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL || 'https://www.sendmybeat.com').replace(/\/$/, '');

export type VizSettings = {
  enabled: boolean;
  mode: string;
  /** Main colour, #rrggbb. */
  color: string;
  /** Second colour (Pro styles), #rrggbb. */
  color2: string;
  /** Reactivity, 0.5 to 2. */
  intensity: number;
};

export const VIZ_DEFAULTS: VizSettings = { enabled: false, mode: 'circle', color: '#ffffff', color2: '#4c8dff', intensity: 1 };

export type VizStyle = { mode: string; name: string; pro: boolean; icon: boolean };

// Same ids and order as VISUALIZER_STYLES in frontend/src/lib/constants.js.
export const VIZ_STYLES: VizStyle[] = [
  { mode: 'circle', name: 'NCS', pro: false, icon: true },
  { mode: 'monstercat', name: 'Monstercat', pro: false, icon: true },
  { mode: 'spectrum', name: 'Spectrum', pro: false, icon: true },
  { mode: 'proximity', name: 'Proximity', pro: false, icon: true },
  { mode: 'blob', name: 'Trap', pro: false, icon: false },
  { mode: 'wave', name: 'Wave', pro: false, icon: false },
  { mode: 'mirror', name: 'Mirror', pro: false, icon: false },
  { mode: 'dots', name: 'Dots', pro: false, icon: false },
  { mode: 'ridgeline', name: 'Ridgeline', pro: true, icon: true },
  { mode: 'ring-ridges', name: 'Ring Ridges', pro: true, icon: true },
  { mode: 'analyzer-dots', name: 'Analyzer Dots', pro: true, icon: true },
  { mode: 'dot-record', name: 'Dot Record', pro: true, icon: true },
  { mode: 'dot-rings', name: 'Dot Rings', pro: true, icon: true },
  { mode: 'jelly-dots', name: 'Jelly Dots', pro: true, icon: true },
  { mode: 'jelly', name: 'Jelly', pro: true, icon: true },
  { mode: 'waterfall', name: 'Waterfall', pro: true, icon: true },
  { mode: 'dot-terrain', name: 'Dot Terrain', pro: true, icon: true },
  { mode: 'terrain', name: 'Terrain', pro: true, icon: true },
  { mode: 'groove', name: 'Groove', pro: true, icon: true },
  { mode: 'turntable', name: 'Turntable', pro: true, icon: true },
  { mode: 'terrain-sun', name: 'Terrain Sun', pro: true, icon: true },
];

export const isProStyle = (mode: string) => VIZ_STYLES.some((st) => st.mode === mode && st.pro);
export const iconUrl = (mode: string) => `${SITE_URL}/visualizer-icons/${mode}.png`;

/** Colours a tap away (the phone has no colour picker). The first is each style's default. */
export const COLOURS = ['#ffffff', '#8bffd0', '#4c8dff', '#ff5c8a', '#ffb547', '#b48cff'];
export const COLOURS_2 = ['#4c8dff', '#8bffd0', '#ffffff', '#ff5c8a', '#ffb547', '#b48cff'];

// ---- The preview renders the video; publish() asks it to through this hook.
export type BakeProgress = { stage: 'rendering' | 'uploading'; value: number };
export type Baker = (fps: '30' | '60', onProgress: (p: BakeProgress) => void) => Promise<{ fileId: string; fps: number }>;
let baker: Baker | null = null;
export const setBaker = (next: Baker | null) => {
  baker = next;
};
export const getBaker = () => baker;

// ---- Where the beat player is, so the preview moves with it.
type Clock = { t: number; playing: boolean };
const clockListeners = new Set<(c: Clock) => void>();
let clock: Clock = { t: 0, playing: false };
export function reportPlayer(t: number, playing: boolean) {
  clock = { t, playing };
  clockListeners.forEach((l) => l(clock));
}
export function onPlayer(listener: (c: Clock) => void) {
  clockListeners.add(listener);
  listener(clock);
  return () => {
    clockListeners.delete(listener);
  };
}
