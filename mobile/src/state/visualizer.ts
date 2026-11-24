// The visualizer in the app: the same styles as the website, drawn by the website's own code in a
// WebView (components/visualizer-preview.tsx), so a video made on the phone matches the site.

export const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL || 'https://www.sendmybeat.com').replace(/\/$/, '');

export type CenterFill = 'image' | 'color' | 'transparent';

/** The look and effect controls. Unset means the style's own preset value (see presetLook). */
export type VizLook = {
  /** What's in the middle of styles with a centre. */
  center: CenterFill;
  centerColor: string;
  /** Outline around the logo. */
  outline: boolean;
  /** Artwork zoom on the kick, 0 to 1. */
  zoom: number;
  /** Dark corners. */
  vignette: boolean;
  /** Artwork brightness, 0.2 to 1. */
  brightness: number;
  /** Older styles only: stars, shake, flash on hard hits, rainbow colours. */
  stars: boolean;
  shake: number;
  flash: boolean;
  rainbow: boolean;
};

export type VizSettings = Partial<VizLook> & {
  enabled: boolean;
  mode: string;
  /** Main colour, #rrggbb. */
  color: string;
  /** Second colour (Pro styles), or glow colour (older styles), #rrggbb. */
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

// What each style can change, the same split the website's Visualizer section makes
// (frontend/src/components/upload-studio/VisualizerSettings.js).
const LEGACY = new Set(['blob', 'wave', 'mirror', 'dots']);
const COVER = new Set(['ring-ridges', 'dot-record', 'dot-rings', 'jelly-dots', 'jelly', 'groove', 'turntable', 'terrain-sun', 'circle', 'blob', 'dots']);
/** The older styles, with stars, shake, flash and rainbow colours. */
export const isLegacyStyle = (mode: string) => LEGACY.has(mode);
/** Styles with your logo or artwork in the middle. */
export const hasCenter = (mode: string) => COVER.has(mode);

// Each style's starting look, copied from VISUALIZER_PRESETS and DEFAULT_VISUALIZER_SETTINGS in
// frontend/src/lib/constants.js, so the controls show what the style really does before you touch them.
const BASE_LOOK: VizLook = {
  center: 'color',
  centerColor: '#ffffff',
  outline: true,
  zoom: 0,
  vignette: false,
  brightness: 1,
  stars: true,
  shake: 1,
  flash: false,
  rainbow: false,
};
const PRO_LOOK: Partial<VizLook> = { center: 'image', outline: true, stars: false, shake: 0, flash: false, rainbow: false };
const STYLE_LOOK: Record<string, Partial<VizLook>> = {
  circle: { stars: true, shake: 0.1, center: 'image', outline: true, zoom: 0.5 },
  spectrum: { stars: true },
  proximity: { stars: true, shake: 0, zoom: 0.4, vignette: true },
  blob: { stars: true, shake: 0.2, rainbow: true, center: 'image', outline: true, zoom: 0.7, flash: true },
  wave: { stars: true, shake: 0, vignette: true },
  mirror: { stars: false, shake: 0, zoom: 0.5 },
  dots: { stars: true, shake: 0.05, center: 'image', outline: true },
};
export function presetLook(mode: string): VizLook {
  return { ...BASE_LOOK, ...(isProStyle(mode) ? PRO_LOOK : STYLE_LOOK[mode]) };
}
/** The look as it will render: your changes over the style's preset. */
export function lookOf(viz: VizSettings): VizLook {
  const base = presetLook(viz.mode);
  const out = { ...base };
  for (const key of Object.keys(base) as (keyof VizLook)[]) {
    if (viz[key] !== undefined) (out as Record<string, unknown>)[key] = viz[key];
  }
  return out;
}
/** Colours a style starts with when you pick it. */
export function presetColours(mode: string) {
  if (isProStyle(mode)) return { color: '#8bffd0', color2: '#4c8dff' };
  return { color: '#ffffff', color2: LEGACY.has(mode) ? '#8cc8ff' : '#4c8dff' };
}
/** Picking a style resets it to its recommended look, like the website. */
export function pickStyle(viz: VizSettings, mode: string): VizSettings {
  return { enabled: viz.enabled, mode, intensity: 1, ...presetColours(mode) };
}
export const iconUrl = (mode: string) => `${SITE_URL}/visualizer-icons/${mode}.png`;

/** Colours a tap away (the phone has no colour picker). The first is each style's default. */
export const COLOURS = ['#ffffff', '#8bffd0', '#4c8dff', '#ff5c8a', '#ffb547', '#b48cff', '#000000'];
export const COLOURS_2 = ['#4c8dff', '#8bffd0', '#8cc8ff', '#ffffff', '#ff5c8a', '#ffb547', '#b48cff'];

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
