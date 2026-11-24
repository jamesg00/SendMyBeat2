import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, type AudioPlayer, type AudioStatus } from 'expo-audio';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Linking,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
  type NativeTouchEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import * as api from '@/api/endpoints';
import type { YouTubeUploadOptions } from '@/api/endpoints';
import { useRequest } from '@/api/use-request';
import { AiTab, DetailsTab, ImageTab, TABS, TabIcon, VideoTab, VizTab, type AiResults, type Tab } from '@/components/studio-tabs';
import { Button, Meter, PlayPauseIcon } from '@/components/ui';
import { VisualizerPreview } from '@/components/visualizer-preview';
import { openPaywall, useSubscription } from '@/state/billing';
import { useDraft } from '@/state/draft';
import { clampTransform, useStudio, type Phase, type Transform } from '@/state/studio';
import { SITE_URL, isProStyle, reportPlayer } from '@/state/visualizer';
import { F, R, display, font, makeStyles, useColors } from '@/theme';

// Upload Studio: the video preview fills the top of the screen, with the beat player floating
// over it, and a sheet below holds the website's five sections (Details, Image, Video,
// Visualizer, AI checks) and the upload button. Turn the phone sideways and the preview goes
// full screen and plays, like a YouTube video.

type Aspect = YouTubeUploadOptions['aspectRatio'];
const ASPECT: Record<Aspect, number> = { '16:9': 16 / 9, '1:1': 1, '9:16': 9 / 16, '4:5': 4 / 5 };
const SHAPE: Record<Aspect, string> = { '16:9': 'YouTube', '9:16': 'Shorts', '1:1': 'Square', '4:5': 'Portrait' };
// icon 87: mint to blue on black.
const MINT = '#8BFFD0';
const BLUE = '#4C8DFF';
const SHEET_OVERLAP = 20;

function clock(sec: number) {
  const t = Math.max(0, Math.floor(sec));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

function useNow(ms = 500) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export default function StudioScreen() {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const studio = useStudio();
  const { phase } = studio;
  const working = phase.kind === 'sending' || phase.kind === 'job';

  // The rest of the app stays upright; only the studio turns, for the full screen preview.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    void ScreenOrientation.unlockAsync().catch(() => {});
    return () => {
      void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, []);

  if (!working && phase.kind !== 'done') return <Editor />;

  return (
    <View style={[s.root, s.padded, { paddingTop: insets.top + 4, paddingBottom: insets.bottom + 8 }]}>
      <StatusBar style="light" />
      <View style={s.topBar}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close Upload Studio" hitSlop={10}>
          <Text style={s.topAction}>Close</Text>
        </Pressable>
        <Text style={s.topTitle}>Upload Studio</Text>
        <View style={{ width: 90 }} />
      </View>
      {working ? <RenderView phase={phase} title={studio.title} /> : <DoneView phase={phase as Extract<Phase, { kind: 'done' }>} />}
    </View>
  );
}

// ---------------------------------------------------------------- Editor

function Editor() {
  const C = useColors();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const studio = useStudio();
  const [tab, setTab] = useState<Tab>('details');
  const [keyboard, setKeyboard] = useState(false);
  const [art, setArt] = useState(1); // artwork width / height
  const [ai, setAi] = useState<AiResults>({ analysis: null, thumb: null });
  const landscape = width > height && !keyboard;

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboard(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboard(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // One player for the pill and the full screen view, so turning the phone keeps the beat going.
  const player = useAudioPlayer(studio.audio?.uri ?? null, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  useEffect(() => {
    reportPlayer(status.currentTime, status.playing);
  }, [status.currentTime, status.playing]);
  useEffect(() => {
    // Play through the iPhone's silent switch, like a video would.
    void setAudioModeAsync({ playsInSilentMode: true });
    return () => reportPlayer(0, false);
  }, []);
  const play = () => {
    if (status.duration > 0 && status.currentTime >= status.duration - 0.2) void player.seekTo(0);
    player.play();
  };
  const toggle = () => (status.playing ? player.pause() : play());

  // Sideways starts the video, like YouTube.
  const wasLandscape = useRef(landscape);
  useEffect(() => {
    if (landscape && !wasLandscape.current && studio.audio) play();
    wasLandscape.current = landscape;
    // only on turning the phone
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landscape]);

  // Undo and redo for the artwork's layout.
  const layout: Transform = { scaleX: studio.scaleX, scaleY: studio.scaleY, posX: studio.posX, posY: studio.posY, rotation: studio.rotation, flipH: studio.flipH, flipV: studio.flipV };
  const [hist, setHist] = useState<{ past: Transform[]; future: Transform[] }>({ past: [], future: [] });
  const begin = () => setHist((h) => ({ past: [...h.past.slice(-40), layout], future: [] }));
  const undo = {
    canUndo: hist.past.length > 0,
    canRedo: hist.future.length > 0,
    begin,
    undo: () => {
      const prev = hist.past[hist.past.length - 1];
      if (!prev) return;
      setHist({ past: hist.past.slice(0, -1), future: [layout, ...hist.future] });
      studio.set(prev);
    },
    redo: () => {
      const next = hist.future[0];
      if (!next) return;
      setHist({ past: [...hist.past, layout], future: hist.future.slice(1) });
      studio.set(next);
    },
  };

  // Where the video frame sits. The preview is only as tall as the frame needs (at most 56% of
  // the screen), so a wide 16:9 frame doesn't leave a band of black and the sheet gets the room.
  const top = landscape ? insets.top + 8 : insets.top + 52;
  const bottom = landscape ? insets.bottom + 8 : SHEET_OVERLAP + (studio.audio ? 70 : 14);
  const side = landscape ? Math.max(insets.left, insets.right) + 8 : 16;
  const ratio = ASPECT[studio.format];
  const availW = Math.max(1, width - side * 2);
  const previewH = landscape ? height : keyboard ? 0 : Math.min(Math.round(height * 0.56), Math.round(top + availW / ratio + bottom));
  const availH = Math.max(1, previewH - top - bottom);
  const frameW = Math.min(availW, availH * ratio);
  const frameH = frameW / ratio;
  const fill = Math.max(ratio / art, art / ratio);

  return (
    <View style={s.root}>
      <StatusBar style="light" hidden={landscape} />
      <View style={[s.preview, { height: previewH }, landscape && s.previewFull]}>
        <View style={{ position: 'absolute', top, left: 0, right: 0, height: availH, alignItems: 'center', justifyContent: 'center' }}>
          <Stage width={frameW} height={frameH} editing={tab === 'image' && !landscape} onArt={setArt} begin={begin} />
        </View>

        {landscape ? (
          <FullscreenControls player={player} status={status} toggle={toggle} hasAudio={!!studio.audio} />
        ) : (
          <>
            <View style={[s.floatTop, { top: insets.top + 6 }]}>
              <Pressable onPress={() => router.back()} style={s.roundBtn} accessibilityRole="button" accessibilityLabel="Close Upload Studio" hitSlop={8}>
                <Svg width={14} height={14} viewBox="0 0 24 24">
                  <Path d="M6 6l12 12M18 6L6 18" stroke="#EDEDED" strokeWidth={2.2} strokeLinecap="round" />
                </Svg>
              </Pressable>
              <View style={s.formatChip}>
                <Text style={s.formatText}>
                  {studio.format} {SHAPE[studio.format]} · {studio.viz.enabled ? (studio.fps === '60' ? '60' : '30') : studio.fps} fps
                </Text>
              </View>
              <View style={s.savedSlot}>{studio.active ? <Text style={s.savedText}>Saved</Text> : null}</View>
            </View>
            {studio.audio ? (
              <View style={[s.pillWrap, { bottom: SHEET_OVERLAP + 10 }]}>
                <PlayerPill player={player} status={status} toggle={toggle} />
              </View>
            ) : null}
          </>
        )}
      </View>

      {landscape ? null : (
        <View style={[s.sheet, { marginTop: keyboard ? insets.top : -SHEET_OVERLAP }]}>
          {!keyboard ? <View style={s.handle} /> : null}
          <View style={s.tabs} accessibilityRole="tablist">
            {TABS.map((t) => {
              const on = t.id === tab;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => setTab(t.id)}
                  style={({ pressed }) => [s.tab, pressed && { opacity: 0.7 }]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={t.label}>
                  <View style={[s.tabChip, on && s.tabChipOn]}>
                    <TabIcon tab={t.id} color={on ? C.acc : C.t2} />
                  </View>
                  <Text style={[s.tabLabel, on && { color: C.text, ...font('600') }]} numberOfLines={1}>
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={s.sheetBody}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            automaticallyAdjustKeyboardInsets
            showsVerticalScrollIndicator={false}>
            {tab === 'details' && <DetailsTab />}
            {tab === 'image' && <ImageTab undo={undo} fill={fill} />}
            {tab === 'video' && <VideoTab />}
            {tab === 'viz' && <VizTab />}
            {tab === 'ai' && <AiTab results={ai} setResults={setAi} />}
          </ScrollView>
          {keyboard ? null : <UploadBar goTo={setTab} />}
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------- Preview

/**
 * The video frame: the website's visualizer when it's on, otherwise the artwork laid out the way
 * the server renders it (fit to the frame, then scaled, moved in half-frames, rotated, flipped).
 * In the Image section you drag, pinch and twist the artwork here.
 */
function Stage({ width, height, editing, onArt, begin }: { width: number; height: number; editing: boolean; onArt: (aspect: number) => void; begin: () => void }) {
  const s = useStyles();
  const studio = useStudio();
  const sub = useSubscription();
  const [aspect, setAspect] = useState(1);
  const { image, audio, viz, bg } = studio;
  const layout: Transform = { scaleX: studio.scaleX, scaleY: studio.scaleY, posX: studio.posX, posY: studio.posY, rotation: studio.rotation, flipH: studio.flipH, flipV: studio.flipV };
  const paid = !sub || sub.is_subscribed;
  const watermark = !(paid && studio.noWatermark);
  const premiumLocked = viz.enabled && isProStyle(viz.mode) && !paid;
  const withViz = viz.enabled && !!image && !!audio;

  // Gestures read the latest values through refs; the responder is made once.
  const live = useRef({ layout, width, height, begin, set: studio.set });
  useLayoutEffect(() => {
    live.current = { layout, width, height, begin, set: studio.set };
  });
  const gesture = useRef<{ count: number; from: Transform; x: number; y: number; d: number; a: number } | null>(null);
  // The handlers only read the refs during touches, never while rendering.
  // eslint-disable-next-line react-hooks/refs
  const [responder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        live.current.begin();
        gesture.current = startOf(e.nativeEvent.touches, live.current.layout);
      },
      onPanResponderMove: (e: GestureResponderEvent) => {
        const touches = e.nativeEvent.touches;
        const g = gesture.current;
        if (!touches.length) return;
        // A finger added or lifted: carry on from here.
        if (!g || touches.length !== g.count) {
          gesture.current = startOf(touches, live.current.layout);
          return;
        }
        const now = startOf(touches, g.from);
        const { width: w, height: h } = live.current;
        const next: Transform = { ...g.from, posX: g.from.posX + (now.x - g.x) / (w * 0.5), posY: g.from.posY + (now.y - g.y) / (h * 0.5) };
        if (touches.length >= 2 && g.d > 0) {
          const k = now.d / g.d;
          next.scaleX = g.from.scaleX * k;
          next.scaleY = g.from.scaleY * k;
          let rot = g.from.rotation + ((now.a - g.a) * 180) / Math.PI;
          if (rot > 180) rot -= 360;
          if (rot < -180) rot += 360;
          next.rotation = rot;
        }
        live.current.set(clampTransform(next));
      },
      onPanResponderRelease: () => {
        gesture.current = null;
      },
      onPanResponderTerminate: () => {
        gesture.current = null;
      },
    }),
  );

  // The artwork's size when it fits the frame.
  const fitW = aspect > width / height ? width : height * aspect;
  const fitH = fitW / aspect;
  const artW = fitW * studio.scaleX;
  const artH = fitH * studio.scaleY;

  return (
    <View style={[s.frame, { width, height, backgroundColor: bg === 'white' ? '#FFFFFF' : '#000000' }]}>
      {withViz ? (
        <VisualizerPreview audio={audio} image={image} format={studio.format} bg={bg} layout={layout} viz={viz} logo={studio.logo} />
      ) : image ? (
        <>
          {bg === 'blurred' ? (
            <Image
              source={{ uri: image.uri }}
              style={[StyleSheet.absoluteFill, { opacity: 0.72, transform: [{ scale: 1.08 }] }]}
              contentFit="cover"
              blurRadius={Math.max(6, Math.round((18 * Math.min(width, height)) / 1080) * 3)}
            />
          ) : null}
          <Image
            source={{ uri: image.uri }}
            onLoad={(e) => {
              const a = e.source.width / Math.max(1, e.source.height);
              if (Number.isFinite(a) && a > 0) {
                setAspect(a);
                onArt(a);
              }
            }}
            style={{
              position: 'absolute',
              width: artW,
              height: artH,
              left: width / 2 + studio.posX * width * 0.5 - artW / 2,
              top: height / 2 + studio.posY * height * 0.5 - artH / 2,
              transform: [{ rotate: `${studio.rotation}deg` }, { scaleX: studio.flipH ? -1 : 1 }, { scaleY: studio.flipV ? -1 : 1 }],
            }}
            contentFit="fill"
            accessibilityLabel="Artwork preview"
          />
        </>
      ) : (
        <Pressable onPress={studio.pickImage} style={s.emptyArt} accessibilityRole="button" accessibilityLabel="Add artwork">
          <Svg width={26} height={26} viewBox="0 0 24 24">
            <Path d="M12 5v14M5 12h14" stroke="#A1A1A1" strokeWidth={1.8} strokeLinecap="round" />
          </Svg>
          <Text style={s.emptyText}>Add artwork</Text>
        </Pressable>
      )}

      {watermark && image ? (
        <Text style={[s.watermark, { color: bg === 'white' && !withViz ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.55)' }]} numberOfLines={1}>
          Upload your beats online: https://sendmybeat.com
        </Text>
      ) : null}

      {editing && image ? <View style={[StyleSheet.absoluteFill, s.editRing]} {...responder.panHandlers} accessibilityLabel="Drag to move the artwork, pinch to size it" /> : null}

      {premiumLocked ? (
        <Pressable onPress={() => openPaywall('needs_plan', 'Premium visualizers need a Plus or Pro plan.')} style={s.premiumChip} accessibilityRole="button">
          <Text style={s.premiumText}>Premium style · Upgrade to upload</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function startOf(touches: readonly NativeTouchEvent[], from: Transform) {
  if (touches.length >= 2) {
    const [p, q] = touches;
    return {
      count: touches.length,
      from,
      x: (p.pageX + q.pageX) / 2,
      y: (p.pageY + q.pageY) / 2,
      d: Math.hypot(q.pageX - p.pageX, q.pageY - p.pageY),
      a: Math.atan2(q.pageY - p.pageY, q.pageX - p.pageX),
    };
  }
  const t = touches[0];
  return { count: touches.length, from, x: t?.pageX ?? 0, y: t?.pageY ?? 0, d: 0, a: 0 };
}

// ---------------------------------------------------------------- Player

function Scrubber({ player, status, light }: { player: AudioPlayer; status: AudioStatus; light?: boolean }) {
  const s = useStyles();
  const [w, setW] = useState(0);
  const duration = status.duration || 0;
  const played = duration > 0 ? Math.min(1, status.currentTime / duration) : 0;
  const seek = (x: number) => duration > 0 && w > 0 && void player.seekTo(Math.max(0, Math.min(1, x / w)) * duration);
  return (
    <Pressable
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      onPress={(e) => seek(e.nativeEvent.locationX)}
      hitSlop={{ top: 14, bottom: 14 }}
      style={s.scrub}
      accessibilityRole="adjustable"
      accessibilityLabel="Preview position"
      accessibilityValue={{ text: `${clock(status.currentTime)} of ${clock(duration)}` }}>
      <View style={[s.scrubTrack, light && { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
        <View style={[s.scrubFill, { width: `${played * 100}%` }]} />
      </View>
      <View style={[s.scrubKnob, { left: `${played * 100}%` }]} />
    </Pressable>
  );
}

function PlayerPill({ player, status, toggle }: { player: AudioPlayer; status: AudioStatus; toggle: () => void }) {
  const s = useStyles();
  return (
    <View style={s.pill}>
      <Pressable onPress={toggle} style={s.pillPlay} accessibilityRole="button" accessibilityLabel={status.playing ? 'Pause preview' : 'Play preview'}>
        <PlayPauseIcon playing={status.playing} color="#0A0A0A" />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Scrubber player={player} status={status} light />
      </View>
      <Text style={s.pillTime}>
        {clock(status.currentTime)} / {clock(status.duration || 0)}
      </Text>
    </View>
  );
}

// Sideways: only the video, with YouTube-style controls that fade after a few seconds. Tap to bring them back.
function FullscreenControls({ player, status, toggle, hasAudio }: { player: AudioPlayer; status: AudioStatus; toggle: () => void; hasAudio: boolean }) {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const [shown, setShown] = useState(true);
  useEffect(() => {
    if (!shown || !status.playing) return;
    const t = setTimeout(() => setShown(false), 3000);
    return () => clearTimeout(t);
  }, [shown, status.playing]);

  if (!shown) return <Pressable style={StyleSheet.absoluteFill} onPress={() => setShown(true)} accessibilityRole="button" accessibilityLabel="Show controls" />;
  const side = Math.max(insets.left, insets.right) + 20;
  return (
    <Pressable style={[StyleSheet.absoluteFill, s.fsShade]} onPress={() => setShown(false)} accessibilityLabel="Hide controls">
      <View style={[s.fsTop, { paddingTop: insets.top + 12, paddingHorizontal: side }]}>
        <Text style={s.fsHint}>Turn your phone upright to edit</Text>
      </View>
      {hasAudio ? (
        <Pressable onPress={toggle} style={s.fsPlay} accessibilityRole="button" accessibilityLabel={status.playing ? 'Pause' : 'Play'}>
          <PlayPauseIcon playing={status.playing} size={22} color="#FFFFFF" />
        </Pressable>
      ) : (
        <Text style={s.fsHint}>Add your beat to play the preview</Text>
      )}
      {hasAudio ? (
        <View style={[s.fsBottom, { paddingBottom: insets.bottom + 14, paddingHorizontal: side }]}>
          <Text style={s.fsTime}>{clock(status.currentTime)}</Text>
          <View style={{ flex: 1 }}>
            <Scrubber player={player} status={status} light />
          </View>
          <Text style={s.fsTime}>{clock(status.duration || 0)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

// ---------------------------------------------------------------- Upload bar

function UploadBar({ goTo }: { goTo: (t: Tab) => void }) {
  const C = useColors();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const studio = useStudio();
  const { run, description } = useDraft();
  const yt = useRequest(api.youtubeStatus);
  const { phase, bake, missing } = studio;
  const checks = [studio.audio?.status === 'ready', studio.image?.status === 'ready', !!studio.title.trim(), !!description.content.trim()];
  const ready = checks.filter(Boolean).length;
  const notConnected = yt.data ? !yt.data.connected : false;

  const label = bake
    ? `${bake.stage === 'rendering' ? 'Rendering visualizer' : 'Sending video'} ${Math.round(bake.value * 100)}%`
    : missing
      ? missing
      : notConnected
        ? 'Connect YouTube'
        : phase.kind === 'error'
          ? 'Try again'
          : 'Upload to YouTube';
  const enabled = !bake && !missing;
  const onPress = () => {
    if (!enabled) {
      if (missing) goTo('details');
      return;
    }
    if (notConnected) {
      void WebBrowser.openBrowserAsync(`${SITE_URL}/dashboard`).then(() => yt.refresh());
      return;
    }
    void studio.publish();
  };

  return (
    <View style={[s.bar, { paddingBottom: insets.bottom + 10 }]}>
      {bake ? <Meter value={bake.value} height={3} color={MINT} /> : null}
      {phase.kind === 'error' ? <Text style={s.barError}>{phase.message}</Text> : null}
      {notConnected && !missing ? <Text style={s.barNote}>Connect your YouTube channel on sendmybeat.com, then come back to upload.</Text> : null}
      {bake ? <Text style={s.barNote}>Keep the app open while the video renders.</Text> : null}
      <View style={s.barRow}>
        <View style={s.barCount}>
          <Text style={s.barReady}>{ready} of 4 ready</Text>
          <Text style={s.barSub} numberOfLines={1}>
            {run ? `${run.tags.length} tags` : 'Tags optional'}
          </Text>
        </View>
        <Pressable onPress={onPress} style={({ pressed }) => [s.uploadBtn, pressed && enabled && { transform: [{ scale: 0.98 }] }]} accessibilityRole="button" accessibilityState={{ disabled: !enabled }}>
          {enabled ? (
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
              <Defs>
                <LinearGradient id="up" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor={MINT} />
                  <Stop offset="1" stopColor={BLUE} />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#up)" />
            </Svg>
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: C.card2 }]} />
          )}
          {bake ? <ActivityIndicator color={C.t2} size="small" style={{ marginRight: 8 }} /> : null}
          <Text style={[s.uploadText, !enabled && { color: C.t2 }]} numberOfLines={1}>
            {label}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------- After you upload

// The job's stages, the same strip the website shows (Queued > Token refresh > Encode > Upload).
const STAGES = ['Queued', 'Token refresh', 'Encode', 'Upload'] as const;
function stageIndex(job?: api.UploadJob) {
  const st = job?.stage ?? '';
  if (st === 'youtube_upload' || st === 'cleanup') return 3;
  if (st === 'ffmpeg_render' || st === 'gif_transcode' || st === 'encoding') return 2;
  if (st === 'oauth_refresh' || st === 'validate') return 1;
  if (st === 'queued') return 0;
  // Servers without stages: fall back to progress (encoding from 41, YouTube from 65).
  const p = job?.progress ?? 0;
  return p >= 65 ? 3 : p >= 41 ? 2 : p > 0 ? 1 : 0;
}

function RenderView({ phase, title }: { phase: Extract<Phase, { kind: 'sending' } | { kind: 'job' }>; title: string }) {
  const C = useColors();
  const s = useStyles();
  const studio = useStudio();
  const now = useNow();
  const job = phase.kind === 'job' ? phase : null;
  const started = job?.startedAt ?? now;
  const elapsed = (now - started) / 1000;
  const server = job?.job.progress ?? 0;
  // Server progress moves in jumps, so ease forward between reports (capped below done).
  const pct = Math.min(99, Math.max(server, 95 * (1 - Math.exp(-elapsed / 90))));
  const stage = job ? stageIndex(job.job) : 0;
  const encode = job?.job.encode_progress;
  const log = job?.log ?? [];
  const stopping = studio.cancelling || !!job?.job.cancel_requested;

  return (
    <View style={{ flex: 1, gap: 18 }}>
      <View style={{ gap: 6, paddingTop: 8 }}>
        <View style={s.statusRow}>
          <View style={[s.statusDot, { backgroundColor: C.warn }]} />
          <Text style={s.sub}>{stage === 3 ? 'Uploading to YouTube' : stage === 2 ? 'Encoding' : 'Getting ready'}</Text>
          <Text style={s.monoSub}>· {clock(elapsed)}</Text>
        </View>
        <Text style={s.renderTitle} numberOfLines={2}>
          {title || 'Untitled beat'}
        </Text>
      </View>

      <View style={{ gap: 8 }}>
        <View style={s.timeRow}>
          <Text style={s.monoSub}>{Math.round(pct)}%</Text>
          {stage === 2 && typeof encode === 'number' ? <Text style={s.monoSub}>Encode {Math.round(encode)}%</Text> : null}
        </View>
        <Meter value={pct / 100} height={4} />
      </View>

      <View style={s.stages}>
        {STAGES.map((name, i) => (
          <View key={name} style={{ flex: 1, gap: 6 }}>
            <View style={{ height: 2, backgroundColor: i < stage ? C.acc : i === stage ? C.warn : C.line }} />
            <Text style={[s.stageText, i === stage && { color: C.text, ...font('600') }, i > stage && { color: C.t3 }]}>{name}</Text>
          </View>
        ))}
      </View>

      <View style={s.logPanel}>
        <View style={s.logHead}>
          <Text style={[s.sub, { color: C.text, ...font('500') }]}>Log</Text>
          {job ? <Text style={s.monoSub}>job {job.job.id.slice(0, 6)}…</Text> : null}
        </View>
        <ScrollView contentContainerStyle={{ padding: 14, gap: 7 }}>
          {log.length === 0 ? <Text style={s.logText}>Sending files…</Text> : null}
          {log.map((l, i) => (
            <View key={`${l.at}-${i}`} style={{ flexDirection: 'row', gap: 10 }}>
              <Text style={s.logTime}>{new Date(l.at).toLocaleTimeString('en-GB')}</Text>
              <Text style={[s.logText, i === log.length - 1 && { color: C.text }]}>{l.text}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <Text style={s.sub}>Safe to close. The upload keeps running and shows on Workflow.</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {job ? <Button title={stopping ? 'Cancelling…' : 'Cancel upload'} variant="secondary" onPress={stopping ? undefined : studio.cancel} style={{ flex: 1 }} /> : null}
        <Button title="Close" variant="secondary" onPress={() => router.back()} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

function DoneView({ phase }: { phase: Extract<Phase, { kind: 'done' }> }) {
  const C = useColors();
  const s = useStyles();
  const studio = useStudio();
  const finish = () => {
    studio.reset();
    router.back();
  };
  return (
    <View style={{ flex: 1, gap: 18, paddingTop: 8 }}>
      <View style={s.statusRow}>
        <View style={[s.statusDot, { backgroundColor: C.acc }]} />
        <Text style={s.sub}>{studio.publishAt ? 'Scheduled on YouTube' : 'Live on YouTube'}</Text>
      </View>
      <Text style={s.renderTitle}>{studio.title || 'Your beat'}</Text>
      <Text style={s.sub}>{phase.message}</Text>
      {phase.warnings?.map((w) => (
        <Text key={w} style={[s.sub, { color: C.text }]}>
          · {w}
        </Text>
      ))}
      <View style={{ flex: 1 }} />
      {phase.url ? <Button title="Open on YouTube" onPress={() => Linking.openURL(phase.url!)} /> : null}
      <Button title="Done" variant="secondary" onPress={finish} />
    </View>
  );
}

const useStyles = makeStyles((C) => ({
  root: { flex: 1, backgroundColor: '#000000' },
  padded: { backgroundColor: C.bg, paddingHorizontal: 20, gap: 14 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44 },
  topAction: { color: C.t2, fontSize: 16, width: 90, ...font() },
  topTitle: { color: C.text, fontSize: 17, ...display },

  preview: { backgroundColor: '#000000', overflow: 'hidden' },
  previewFull: { ...StyleSheet.absoluteFill, zIndex: 2 },
  frame: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  editRing: { borderWidth: 1, borderColor: 'rgba(139,255,208,0.55)', borderStyle: 'dashed' },
  emptyArt: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#262626', borderStyle: 'dashed' },
  emptyText: { color: '#A1A1A1', fontSize: 13, fontFamily: F.mono },
  watermark: { position: 'absolute', top: 8, left: 8, right: 8, textAlign: 'center', fontSize: 9.5, fontFamily: F.mono },
  premiumChip: { position: 'absolute', left: 8, bottom: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.72)', borderWidth: 1, borderColor: 'rgba(139,255,208,0.5)' },
  premiumText: { color: MINT, fontSize: 11, ...font('500') },

  floatTop: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  roundBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  formatChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  formatText: { color: '#A1A1A1', fontSize: 11, fontFamily: F.mono },
  savedSlot: { width: 36, alignItems: 'flex-end' },
  savedText: { color: '#8F8F8F', fontSize: 11, ...font() },

  pillWrap: { position: 'absolute', left: 16, right: 16 },
  pill: { height: 52, borderRadius: 26, backgroundColor: 'rgba(0,0,0,0.62)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 8, paddingRight: 16 },
  pillPlay: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EDEDED', alignItems: 'center', justifyContent: 'center' },
  pillTime: { color: '#EDEDED', fontSize: 11, fontFamily: F.mono },
  scrub: { height: 22, justifyContent: 'center' },
  scrubTrack: { height: 4, borderRadius: 2, backgroundColor: C.line, overflow: 'hidden' },
  scrubFill: { height: '100%', backgroundColor: '#EDEDED' },
  scrubKnob: { position: 'absolute', width: 12, height: 12, borderRadius: 6, marginLeft: -6, backgroundColor: '#FFFFFF' },

  fsShade: { backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  fsTop: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center' },
  fsHint: { color: 'rgba(255,255,255,0.7)', fontSize: 12, ...font() },
  fsPlay: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  fsBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  fsTime: { color: '#FFFFFF', fontSize: 12, fontFamily: F.mono },

  sheet: { flex: 1, backgroundColor: C.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderTopWidth: 1, borderColor: C.line, overflow: 'hidden' },
  handle: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: C.line, marginTop: 8 },
  // The hairline keeps scrolled content from running up under the tab labels.
  tabs: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: C.lineSoft },
  tab: { width: 64, alignItems: 'center', gap: 6 },
  tabChip: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card2, borderWidth: 1, borderColor: C.line },
  tabChipOn: { backgroundColor: C.accSoft, borderColor: C.accLine },
  tabLabel: { color: C.t3, fontSize: 11, ...font('500') },
  sheetBody: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, gap: 14 },

  bar: { paddingHorizontal: 20, paddingTop: 12, gap: 8, borderTopWidth: 1, borderTopColor: C.lineSoft, backgroundColor: C.card },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  barCount: { flexShrink: 0, maxWidth: 110 },
  barReady: { color: C.text, fontSize: 13, ...font('600') },
  barSub: { color: C.t3, fontSize: 11, ...font() },
  barError: { color: C.danger, fontSize: 12, lineHeight: 16, textAlign: 'center', ...font() },
  barNote: { color: C.t3, fontSize: 12, lineHeight: 16, textAlign: 'center', ...font() },
  uploadBtn: { flex: 1, height: 52, borderRadius: 14, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  uploadText: { color: '#03140C', fontSize: 16, ...font('700') },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  sub: { color: C.t2, fontSize: 13, lineHeight: 19, ...font() },
  monoSub: { color: C.t3, fontSize: 13, fontFamily: F.mono },
  renderTitle: { color: C.text, fontSize: 24, lineHeight: 30, letterSpacing: -0.6, ...font('600') },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stages: { flexDirection: 'row', gap: 4 },
  stageText: { color: C.t2, fontSize: 11, ...font() },
  logPanel: { flex: 1, minHeight: 120, borderRadius: R.card, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, overflow: 'hidden' },
  logHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 40, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: C.lineSoft },
  logTime: { color: C.t3, fontSize: 12, lineHeight: 17, fontFamily: F.mono },
  logText: { flex: 1, color: C.t2, fontSize: 12, lineHeight: 17, fontFamily: F.mono },
}));
