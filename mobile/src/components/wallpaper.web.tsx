import { createElement, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useWallpaperConfig } from '@/components/wallpaper-config';
import { wallpaperHtml, type WallpaperColors, type WallpaperId } from '@/state/wallpaper';

// On web the wallpaper's page runs in an iframe (same page as the WebView on phones), which
// takes no clicks; changes are passed to it directly.

type Props = { id: WallpaperId; colors: WallpaperColors; active: boolean };
type WallFrame = HTMLIFrameElement & { contentWindow: (Window & { __smbWall?: { set: (c: unknown) => void } }) | null };

export function Wallpaper(props: Props) {
  const config = useWallpaperConfig(props);
  const frame = useRef<WallFrame | null>(null);
  const [html] = useState(() => wallpaperHtml(config));
  const key = JSON.stringify(config);

  useEffect(() => {
    frame.current?.contentWindow?.__smbWall?.set(JSON.parse(key));
  }, [key]);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: props.colors.bg }]} aria-hidden>
      {createElement('iframe', {
        ref: frame,
        srcDoc: html,
        title: 'Wallpaper',
        tabIndex: -1,
        onLoad: () => frame.current?.contentWindow?.__smbWall?.set(JSON.parse(key)),
        style: { border: 0, width: '100%', height: '100%', pointerEvents: 'none', display: 'block' },
      })}
    </View>
  );
}
