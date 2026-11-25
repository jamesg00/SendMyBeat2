import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { useWallpaperConfig } from '@/components/wallpaper-config';
import { wallpaperHtml, type WallpaperColors, type WallpaperId } from '@/state/wallpaper';

// The animated wallpaper, drawn on a canvas in a WebView that fills its parent and never takes a
// touch. The page is loaded once; the wallpaper, colors and pausing go to it as messages, so a
// change doesn't reload it. It stops drawing while `active` is false or the app is in the
// background, and draws one still frame with Reduce Motion. (Web uses an iframe; see wallpaper.web.tsx.)

type Props = { id: WallpaperId; colors: WallpaperColors; active: boolean };

// The package types WebView as a plain function component, so its ref (a forwardRef) is typed here.
type WebViewHandle = { injectJavaScript: (script: string) => void };

export function Wallpaper(props: Props) {
  const config = useWallpaperConfig(props);
  const web = useRef<WebViewHandle>(null);
  // The first config is baked into the page; later ones are sent to it.
  const [html] = useState(() => wallpaperHtml(config));
  const loaded = useRef(false);
  const key = JSON.stringify(config);

  useEffect(() => {
    if (!loaded.current) return;
    web.current?.injectJavaScript(`window.__smbWall && window.__smbWall.set(${key}); true;`);
  }, [key]);

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: props.colors.screen }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <WebView
        {...({ ref: web } as object)}
        source={{ html }}
        // '*' so the WebView never hands a URL to the phone to open; the page itself is the only load allowed.
        originWhitelist={['*']}
        onShouldStartLoadWithRequest={(req) => /^(about:blank|about:srcdoc|data:)/.test(req.url || '')}
        javaScriptEnabled
        setSupportMultipleWindows={false}
        onLoadEnd={() => {
          loaded.current = true;
          web.current?.injectJavaScript(`window.__smbWall && window.__smbWall.set(${key}); true;`);
        }}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        androidLayerType="hardware"
        style={{ flex: 1, backgroundColor: props.colors.screen }}
      />
    </View>
  );
}
