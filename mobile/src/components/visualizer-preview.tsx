import { File } from 'expo-file-system';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';

import { currentToken } from '@/api/client';
import type { YouTubeUploadOptions } from '@/api/endpoints';
import type { FileSlot, Transform } from '@/state/studio';
import { SITE_URL, lookOf, onPlayer, setBaker, type BakeProgress, type VizSettings } from '@/state/visualizer';
import { F, makeStyles } from '@/theme';

// The live visualizer over the preview, drawn by the website's /viz-embed page in a WebView. It
// gets the beat and the artwork once, the settings whenever they change, and the player's time
// as it plays. When you upload, the same page renders the video and uploads it (see publish()).

type Props = {
  audio: FileSlot | null;
  image: FileSlot | null;
  format: YouTubeUploadOptions['aspectRatio'];
  bg: YouTubeUploadOptions['background'];
  layout: Transform;
  viz: VizSettings;
  /** A picture for the middle instead of the artwork. */
  logo: { uri: string; name: string } | null;
};

type PageMessage =
  | { type: 'ready'; canExport: boolean }
  | { type: 'analysed'; duration: number }
  | { type: 'progress'; stage: BakeProgress['stage']; value: number }
  | { type: 'baked'; fileId: string; fps: number }
  | { type: 'error'; stage: 'analyse' | 'bake'; message: string };

const CHUNK = 256 * 1024; // base64 characters per message

// The page itself loads; its own frames may use the site or a blank/blob/data address. Everything
// else (links, ad frames from other sites) is refused, and refused loads are never opened elsewhere.
export function allowVizLoad(req: Pick<ShouldStartLoadRequest, 'url'> & { isTopFrame?: boolean }) {
  const url = req.url || '';
  if (req.isTopFrame === false) return url.startsWith(SITE_URL) || /^(about:blank|about:srcdoc|blob:|data:)/.test(url);
  return url.startsWith(`${SITE_URL}/viz-embed`);
}

// The package types WebView as a plain function component, so its ref (a forwardRef) is typed here.
type WebViewHandle = { injectJavaScript: (script: string) => void };

const mimeOf = (name: string) => {
  const ext = name.toLowerCase().split('.').pop();
  return ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
};

export function VisualizerPreview({ audio, image, format, bg, layout, viz, logo }: Props) {
  const s = useStyles();
  const web = useRef<WebViewHandle>(null);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<'loading' | 'analysing' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const bakeRef = useRef<{ resolve: (r: { fileId: string; fps: number }) => void; reject: (e: Error) => void; onProgress: (p: BakeProgress) => void } | null>(null);

  const post = (message: object) => {
    web.current?.injectJavaScript(`window.__smbViz && window.__smbViz.receive(${JSON.stringify(message)}); true;`);
  };

  // Settings and layout, every time they change. The look goes over as resolved values, so the
  // page never has to guess a style's defaults.
  const look = lookOf(viz);
  const settings = { mode: viz.mode, color: viz.color, color2: viz.color2, intensity: viz.intensity, ...look };
  const key = JSON.stringify([settings, format, bg, layout]);
  useEffect(() => {
    if (!ready) return;
    post({ type: 'settings', settings, aspect: format, background: bg, scale: (layout.scaleX + layout.scaleY) / 2, ...layout });
    // key covers everything the message carries
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, key]);

  // A logo for the middle, or back to the artwork.
  useEffect(() => {
    if (!ready) return;
    if (!logo?.uri) {
      post({ type: 'logo', dataUrl: null });
      return;
    }
    let alive = true;
    new File(logo.uri).base64().then(
      (data) => alive && post({ type: 'logo', dataUrl: `data:${mimeOf(logo.name)};base64,${data}` }),
      () => {},
    );
    return () => {
      alive = false;
    };
  }, [ready, logo?.uri, logo?.name]);

  // The artwork.
  useEffect(() => {
    if (!ready || !image?.uri) return;
    let alive = true;
    new File(image.uri).base64().then(
      (data) => alive && post({ type: 'cover', dataUrl: `data:${mimeOf(image.name)};base64,${data}` }),
      () => {},
    );
    return () => {
      alive = false;
    };
  }, [ready, image?.uri, image?.name]);

  // The beat, in chunks.
  useEffect(() => {
    if (!ready || !audio?.uri) return;
    let alive = true;
    new File(audio.uri).base64().then(
      (data) => {
        if (!alive) return;
        setState('analysing');
        const count = Math.max(1, Math.ceil(data.length / CHUNK));
        for (let i = 0; i < count; i += 1) post({ type: 'audio', index: i, count, data: data.slice(i * CHUNK, (i + 1) * CHUNK) });
      },
      () => {
        if (!alive) return;
        setState('error');
        setError("Couldn't read the beat for the visualizer.");
      },
    );
    return () => {
      alive = false;
    };
  }, [ready, audio?.uri]);

  // The player's time.
  useEffect(() => {
    if (!ready) return;
    return onPlayer((c) => post({ type: 'time', t: c.t, playing: c.playing }));
  }, [ready]);

  // Rendering the video, for publish().
  useEffect(() => {
    if (!ready) return;
    setBaker(
      (fps, onProgress) =>
        new Promise((resolve, reject) => {
          const token = currentToken();
          if (!token) {
            reject(new Error('Sign in again to render the visualizer.'));
            return;
          }
          bakeRef.current = { resolve, reject, onProgress };
          post({ type: 'bake', fps, token });
        }),
    );
    return () => {
      setBaker(null);
      if (bakeRef.current) {
        bakeRef.current.reject(new Error('The visualizer preview closed before the video was made.'));
        bakeRef.current = null;
      }
      post({ type: 'cancel' });
    };
  }, [ready]);

  const onMessage = (e: WebViewMessageEvent) => {
    let m: PageMessage;
    try {
      m = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    switch (m.type) {
      case 'ready':
        setReady(true);
        if (!m.canExport) setError("This phone's browser can't render video, so uploads with a visualizer won't work here yet. Update iOS (16.4 or later) or Android System WebView.");
        break;
      case 'analysed':
        setState('ready');
        break;
      case 'progress':
        bakeRef.current?.onProgress({ stage: m.stage, value: m.value });
        break;
      case 'baked':
        bakeRef.current?.resolve({ fileId: m.fileId, fps: m.fps });
        bakeRef.current = null;
        break;
      case 'error':
        if (m.stage === 'bake' && bakeRef.current) {
          bakeRef.current.reject(new Error(m.message));
          bakeRef.current = null;
        } else {
          setState('error');
          setError(m.message);
        }
        break;
    }
  };

  if (Platform.OS === 'web') {
    return (
      <View style={s.fill}>
        <Text style={s.note}>The visualizer preview runs in the iPhone and Android app. On the web, use sendmybeat.com.</Text>
      </View>
    );
  }

  return (
    <View style={s.fill}>
      <WebView
        {...({ ref: web } as object)}
        source={{ uri: `${SITE_URL}/viz-embed` }}
        // '*' so the WebView never hands a URL to the phone to open (an ad frame on the page did
        // that); which loads are allowed is decided below instead.
        originWhitelist={['*']}
        onMessage={onMessage}
        style={s.web}
        containerStyle={s.web}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        javaScriptEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction
        setSupportMultipleWindows={false}
        // Only the visualizer page loads. Links and other sites' frames (ads) are dropped, never opened.
        onShouldStartLoadWithRequest={allowVizLoad}
        onError={() => {
          setState('error');
          setError("Couldn't load the visualizer. Check your connection.");
        }}
        accessibilityLabel="Visualizer preview"
      />
      {state === 'loading' || state === 'analysing' ? (
        <View style={s.overlay} pointerEvents="none">
          <ActivityIndicator color="#ffffff" size="small" />
          <Text style={s.overlayText}>{state === 'loading' ? 'Loading visualizer' : 'Reading the beat'}</Text>
        </View>
      ) : null}
      {error ? (
        <View style={s.errorBar} pointerEvents="none">
          <Text style={s.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((C) => ({
  fill: { ...StyleSheet.absoluteFill, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' },
  web: { flex: 1, alignSelf: 'stretch', backgroundColor: '#000000' },
  note: { color: C.t3, fontSize: 12, textAlign: 'center', paddingHorizontal: 16, fontFamily: F.mono },
  overlay: { position: 'absolute', bottom: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.7)' },
  overlayText: { color: '#ffffff', fontSize: 11, fontFamily: F.mono },
  errorBar: { position: 'absolute', left: 8, right: 8, bottom: 8, padding: 8, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.8)' },
  errorText: { color: C.danger, fontSize: 12, lineHeight: 16 },
}));
