import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { WALLPAPERS, type WallpaperColors, type WallpaperConfig, type WallpaperId } from '@/state/wallpaper';

/** What the wallpaper's page should draw now: paused while its screen is hidden (`active`
 *  false) or the app is in the background, and a still frame with Reduce Motion. */
export function useWallpaperConfig({ id, colors, active }: { id: WallpaperId; colors: WallpaperColors; active: boolean }): WallpaperConfig {
  const reduceMotion = useReducedMotion();
  const [foreground, setForeground] = useState(AppState.currentState !== 'background');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setForeground(state === 'active'));
    return () => sub.remove();
  }, []);
  const n = WALLPAPERS.find((w) => w.id === id)?.n ?? WALLPAPERS[0].n;
  return { n, colors, paused: !active || !foreground, still: reduceMotion };
}
