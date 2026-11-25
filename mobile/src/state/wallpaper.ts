import { Directory, File, Paths } from 'expo-file-system';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import { WALLPAPER_DRAW_JS } from '@/wallpapers/engine';
import type { Palette, ThemeId } from '@/theme';

// Animated wallpapers behind the main tabs, picked on the Appearance screen. They were chosen
// from 100 concepts (the round 10 finals, 91 to 100) and drawn on a canvas in a WebView, in the
// active theme's colors. Light themes keep a plain background, since the wallpapers are dark.

export type WallpaperId =
  | 'crossing'
  | 'valley-stars'
  | 'dot-hills'
  | 'firefly-send'
  | 'firefly-hills'
  | 'hills-under-stars'
  | 'valley-crossing'
  | 'firefly-rising'
  | 'starlit-crossing'
  | 'valley-fireflies';

/** The gallery, in order. `n` is the concept's number on the wallpaper page. */
export const WALLPAPERS: { id: WallpaperId; label: string; n: number; preview: number }[] = [
  { id: 'crossing', label: 'Crossing', n: 91, preview: require('@/assets/wallpapers/crossing.jpg') },
  { id: 'valley-stars', label: 'Valley Stars', n: 92, preview: require('@/assets/wallpapers/valley-stars.jpg') },
  { id: 'dot-hills', label: 'Dot Hills', n: 93, preview: require('@/assets/wallpapers/dot-hills.jpg') },
  { id: 'firefly-send', label: 'Firefly Send', n: 94, preview: require('@/assets/wallpapers/firefly-send.jpg') },
  { id: 'firefly-hills', label: 'Firefly Hills', n: 95, preview: require('@/assets/wallpapers/firefly-hills.jpg') },
  { id: 'hills-under-stars', label: 'Under the Stars', n: 96, preview: require('@/assets/wallpapers/hills-under-stars.jpg') },
  { id: 'valley-crossing', label: 'Valley Crossing', n: 97, preview: require('@/assets/wallpapers/valley-crossing.jpg') },
  { id: 'firefly-rising', label: 'Rising', n: 98, preview: require('@/assets/wallpapers/firefly-rising.jpg') },
  { id: 'starlit-crossing', label: 'Starlit Crossing', n: 99, preview: require('@/assets/wallpapers/starlit-crossing.jpg') },
  { id: 'valley-fireflies', label: 'Valley Fireflies', n: 100, preview: require('@/assets/wallpapers/valley-fireflies.jpg') },
];

/** The two colors each theme's wallpaper glows in, like the concept page's palette chips. The
 *  dark neutral themes use the app icon's mint-to-blue. */
const GLOW: Partial<Record<ThemeId, [string, string]>> = {
  mint: ['#2EE59D', '#8BFFD0'],
  midnight: ['#B794FF', '#4C8DFF'],
  ocean: ['#4FD1FF', '#2EE59D'],
  sunset: ['#FF9F6B', '#FF7EB6'],
  rose: ['#FF7EB6', '#B794FF'],
};
const ICON_GLOW: [string, string] = ['#8BFFD0', '#4C8DFF'];

export type WallpaperColors = { bg: string; a: string; b: string };

/** The wallpaper's colors for a palette, or null where wallpapers are off (light themes). */
export function wallpaperColors(C: Palette): WallpaperColors | null {
  if (!C.dark) return null;
  const [a, b] = GLOW[C.id] ?? ICON_GLOW;
  return { bg: C.bg, a, b };
}

// ---- chosen wallpaper (saved on the device, like the theme)

const prefsDir = Platform.OS !== 'web' ? new Directory(Paths.document, 'prefs') : null;
const wallpaperFile = prefsDir ? new File(prefsDir, 'wallpaper.json') : null;

function load(): WallpaperId | null {
  try {
    const raw = wallpaperFile ? (wallpaperFile.exists ? wallpaperFile.textSync() : null) : globalThis.localStorage?.getItem('smb_wallpaper');
    const id = raw ? (JSON.parse(raw) as { id?: WallpaperId | null }).id : null;
    return id && WALLPAPERS.some((w) => w.id === id) ? id : null;
  } catch {
    return null;
  }
}

function save(id: WallpaperId | null) {
  const raw = JSON.stringify({ id });
  try {
    if (wallpaperFile && prefsDir) {
      if (!prefsDir.exists) prefsDir.create({ intermediates: true });
      wallpaperFile.write(raw);
    } else {
      globalThis.localStorage?.setItem('smb_wallpaper', raw);
    }
  } catch {
    // keeping the choice is best effort
  }
}

let wallpaperId: WallpaperId | null = load();
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** null turns the wallpaper off. */
export function setWallpaper(id: WallpaperId | null) {
  if (id === wallpaperId) return;
  wallpaperId = id;
  save(id);
  listeners.forEach((l) => l());
}

export function useWallpaperId(): WallpaperId | null {
  return useSyncExternalStore(subscribe, () => wallpaperId);
}

// ---- the page the wallpaper runs in

/** What the page draws. `paused` stops the clock (off screen, app in the background); `still`
 *  draws one frame and stops (Reduce Motion). */
export type WallpaperConfig = { n: number; colors: WallpaperColors; paused: boolean; still: boolean };

/** The page: a full-size canvas at up to 1.5x pixels and 30 frames a second. Later changes come
 *  in through window.__smbWall.set(config). */
export function wallpaperHtml(initial: WallpaperConfig): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>html,body{margin:0;height:100%;overflow:hidden;background:${initial.colors.bg}}canvas{display:block;width:100%;height:100%}</style></head>
<body><canvas id="c"></canvas><script>
${WALLPAPER_DRAW_JS}
(function(){
  var cfg = ${JSON.stringify(initial)};
  var c = document.getElementById('c'), g = c.getContext('2d');
  var w = 0, h = 0, dpr = 1, t = 6, last = 0, drawn = false, raf = 0;
  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = window.innerWidth; h = window.innerHeight;
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    drawn = false;
  }
  function paint() {
    var fn = DRAW[cfg.n]; if (!fn || !w || !h) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = cfg.colors.bg; g.fillRect(0, 0, w, h);
    fn(g, w, h, t, cfg.colors, {});
    drawn = true;
  }
  function frame(now) {
    raf = 0;
    var moving = !cfg.paused && !cfg.still;
    if (moving) {
      if (last && now - last < 31) { raf = requestAnimationFrame(frame); return; }
      if (last) t += Math.min(now - last, 100) / 1000;
      last = now;
      paint();
      raf = requestAnimationFrame(frame);
    } else {
      last = 0;
      if (!drawn) paint();
    }
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  window.addEventListener('resize', function () { size(); kick(); });
  window.__smbWall = { set: function (next) { var redraw = next.n !== cfg.n || JSON.stringify(next.colors) !== JSON.stringify(cfg.colors); cfg = next; if (redraw) drawn = false; kick(); } };
  size(); kick();
})();
</script></body></html>`;
}
