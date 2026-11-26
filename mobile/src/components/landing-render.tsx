import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View, type LayoutChangeEvent } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import Svg, { Defs, G, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { PlayPauseIcon, TopLight } from '@/components/ui';
import { UltraFill, gradAt, gradGlow } from '@/components/ultra';
import { iconUrl } from '@/state/visualizer';
import { F, R, font, makeStyles, useColors } from '@/theme';

// The Upload Studio preview on the landing screen: a 16:9 render with blurred artwork behind the
// cover and a visualizer that moves with a made-up beat. Tap a style to switch. Names match the
// app's visualizer styles; the drawing is a light sketch of each one, not the real renderer.
// The website's landing page has the same preview (frontend/src/pages/landing/RenderPreview.js).

const STYLES = [
  { mode: 'circle', name: 'NCS' },
  { mode: 'monstercat', name: 'Monstercat' },
  { mode: 'spectrum', name: 'Spectrum' },
  { mode: 'proximity', name: 'Proximity' },
  { mode: 'jelly', name: 'Jelly', pro: true },
] as const;
type Mode = (typeof STYLES)[number]['mode'];
const STYLE_COUNT = 21; // 8 free styles plus 13 Pro styles, as on the website

const COVER = require('@/assets/images/landing-cover.jpg');
const MINT = '#8BFFD0';
const BLUE = '#4C8DFF';
const BPM = 140;
const START = 42;
const LENGTH = 178;
const FPS = 24;

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// A pretend spectrum: louder lows, a kick on every beat, some movement up top.
function spectrum(t: number, n: number) {
  const beat = (t * BPM) / 60;
  const kick = Math.exp(-(beat % 1) * 7);
  const snare = Math.floor(beat) % 2 === 1 ? Math.exp(-(beat % 1) * 9) : 0;
  return Array.from({ length: n }, (_, i) => {
    const x = i / (n - 1);
    return clamp(
      0.5 -
        0.32 * x +
        0.16 * Math.sin(t * 3.1 + i * 0.55) +
        0.1 * Math.sin(t * 5.7 + i * 1.9) +
        kick * 0.5 * Math.max(0, 1 - x * 2.4) +
        snare * 0.28 * Math.max(0, 1 - Math.abs(x - 0.45) * 3),
    );
  });
}
// Bass in the middle, highs at both ends.
function mirror(a: number[]) {
  const half = a.slice(0, Math.ceil(a.length / 2));
  return [...half.slice().reverse(), ...half].slice(0, a.length);
}
const kickAt = (t: number) => Math.exp(-(((t * BPM) / 60) % 1) * 7);

type Cover = { cx: number; cy: number; size: number; round: boolean };
function coverFor(mode: Mode, h: number, w: number): Cover {
  if (mode === 'monstercat') return { cx: w / 2, cy: h * 0.38, size: h * 0.46, round: false };
  if (mode === 'spectrum') return { cx: w / 2, cy: h * 0.34, size: h * 0.4, round: false };
  if (mode === 'proximity') return { cx: w / 2, cy: h / 2, size: h * 0.34, round: false };
  return { cx: w / 2, cy: h / 2, size: h * 0.4, round: true };
}

function Visualizer({ mode, t, w, h }: { mode: Mode; t: number; w: number; h: number }) {
  const lv = spectrum(t, 48);
  const kick = kickAt(t);
  if (mode === 'circle') {
    const cx = w / 2;
    const cy = h / 2;
    const r = h * 0.2;
    const n = 84;
    const ring = mirror(spectrum(t, n));
    const sw = Math.max(1.2, (Math.PI * 2 * r) / n - 1.4);
    return (
      <>
        {ring.map((v, i) => {
          const a = (i / n) * Math.PI * 2 - Math.PI / 2;
          const r0 = r + 3;
          const r1 = r0 + 2 + v * h * 0.17;
          return <Line key={i} x1={cx + Math.cos(a) * r0} y1={cy + Math.sin(a) * r0} x2={cx + Math.cos(a) * r1} y2={cy + Math.sin(a) * r1} stroke="#fff" strokeWidth={sw} />;
        })}
      </>
    );
  }
  if (mode === 'monstercat') {
    const n = 40;
    const x0 = w * 0.1;
    const bw = (w * 0.8) / n;
    const base = h * 0.9;
    return (
      <>
        {Array.from({ length: n }, (_, i) => {
          const bh = 2 + lv[Math.floor((i / n) * lv.length)] * h * 0.24;
          return <Rect key={i} x={x0 + i * bw + 0.75} y={base - bh} width={bw - 1.5} height={bh} fill="#fff" />;
        })}
        <Rect x={x0} y={base + 2} width={w * 0.8} height={0.75} fill="rgba(255,255,255,0.35)" />
      </>
    );
  }
  if (mode === 'spectrum') {
    const n = 36;
    const vals = mirror(lv.slice(0, n));
    const x0 = w * 0.18;
    const bw = (w * 0.64) / n;
    const base = h * 0.78;
    return (
      <>
        {vals.map((v, i) => {
          const bh = 2 + v * h * 0.2;
          const x = x0 + i * bw + 0.75;
          return (
            <G key={i}>
              <Rect x={x} y={base - bh} width={bw - 1.5} height={bh} fill="#fff" />
              <Rect x={x} y={base - bh - 4} width={bw - 1.5} height={1.25} fill="#fff" />
              <Rect x={x} y={base + 2} width={bw - 1.5} height={bh * 0.5} fill="rgba(255,255,255,0.16)" />
            </G>
          );
        })}
      </>
    );
  }
  if (mode === 'proximity') {
    const n = 70;
    const vals = mirror(spectrum(t, n));
    const x0 = w * 0.06;
    const span = w * 0.88;
    const cy = h / 2;
    return (
      <>
        {vals.map((v, i) => {
          const x = x0 + (i / (n - 1)) * span;
          const half = 2 + v * h * 0.2;
          return <Line key={i} x1={x} y1={cy - half} x2={x} y2={cy + half} stroke="rgba(255,255,255,0.85)" strokeWidth={1} strokeLinecap="round" />;
        })}
        <Rect x={x0} y={cy - 0.5} width={span} height={1} fill={`rgba(255,255,255,${0.35 + kick * 0.6})`} />
      </>
    );
  }
  // Jelly
  const cx = w / 2;
  const cy = h / 2;
  const r = h * 0.2;
  const lows = lv.slice(0, 12).reduce((a, b) => a + b, 0) / 12;
  const blob = (lag: number, grow: number) => {
    let d = '';
    for (let i = 0; i <= 60; i += 1) {
      const a = (i / 60) * Math.PI * 2;
      const wob = Math.sin(a * 3 + t * 2.2 - lag) * 0.5 + Math.sin(a * 5 - t * 1.7 - lag) * 0.3 + Math.sin(a * 2 + t * 0.9) * 0.2;
      const rr = r + 5 + grow + (lows * 0.7 + kick * 0.3) * h * 0.08 * (1 + wob * 0.6);
      d += `${i === 0 ? 'M' : 'L'}${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`;
    }
    return `${d}Z`;
  };
  return (
    <>
      <Defs>
        <LinearGradient id="jelly" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={MINT} />
          <Stop offset="1" stopColor={BLUE} />
        </LinearGradient>
      </Defs>
      <Path d={blob(0, 0)} fill="url(#jelly)" />
      <Path d={blob(0.5, 6)} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={1} />
    </>
  );
}

export function LandingRender() {
  const C = useColors();
  const s = useStyles();
  const reduceMotion = useReducedMotion();
  const [mode, setMode] = useState<Mode>('circle');
  const [playing, setPlaying] = useState(!reduceMotion);
  const [t, setT] = useState(START);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const tRef = useRef(START);

  useEffect(() => {
    if (!playing) return undefined;
    let raf = 0;
    let last = Date.now();
    let lastDraw = 0;
    const tick = () => {
      const now = Date.now();
      tRef.current = START + ((tRef.current - START + Math.min(0.1, (now - last) / 1000)) % (LENGTH - START));
      last = now;
      if (now - lastDraw >= 1000 / FPS) {
        lastDraw = now;
        setT(tRef.current);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const style = STYLES.find((x) => x.mode === mode)!;
  const cover = size.w ? coverFor(mode, size.h, size.w) : null;
  const bars = Array.from({ length: 40 }, (_, i) => 0.35 + 0.3 * Math.abs(Math.sin(i * 0.9)) + 0.3 * Math.abs(Math.sin(i * 0.37)));
  const played = Math.round((t / LENGTH) * bars.length);

  return (
    <View style={s.panel}>
      <TopLight />
      <View style={s.video} onLayout={onLayout} accessible accessibilityRole="image" accessibilityLabel={`Example render with the ${style.name} visualizer around the cover art`}>
        <Image source={COVER} style={s.videoBg} contentFit="cover" blurRadius={18} />
        <View style={s.videoShade} />
        {size.w ? (
          <Svg width={size.w} height={size.h} style={{ position: 'absolute', left: 0, top: 0 }}>
            <Visualizer mode={mode} t={t + (playing ? 0 : 0.12)} w={size.w} h={size.h} />
          </Svg>
        ) : null}
        {cover ? (
          <Image
            source={COVER}
            contentFit="cover"
            style={{
              position: 'absolute',
              left: cover.cx - cover.size / 2,
              top: cover.cy - cover.size / 2,
              width: cover.size,
              height: cover.size,
              borderRadius: cover.round ? cover.size / 2 : 4,
              borderWidth: cover.round ? 1.5 : 0,
              borderColor: 'rgba(255,255,255,0.9)',
            }}
          />
        ) : null}
        <Text style={s.videoBadge}>16:9 · 1080p · Blurred art</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pick} accessibilityRole="radiogroup">
        {STYLES.map((x) => {
          const on = x.mode === mode;
          return (
            <Pressable
              key={x.mode}
              onPress={() => setMode(x.mode)}
              style={[s.viz, on && s.vizOn]}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${x.name}${'pro' in x ? ', Pro' : ''}`}>
              <Image source={{ uri: iconUrl(x.mode) }} style={[s.vizIcon, { opacity: on ? 1 : 0.6 }]} contentFit="contain" />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={[s.vizName, on && { color: C.text }]}>{x.name}</Text>
                {'pro' in x ? <Text style={s.pro}>Pro</Text> : null}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
      <Text style={s.note}>
        {STYLES.length} of {STYLE_COUNT} visualizer styles. Each one moves with your beat.
      </Text>

      <View style={s.player}>
        <Pressable onPress={() => setPlaying((p) => !p)} style={s.playBtn} hitSlop={4} accessibilityRole="button" accessibilityLabel={playing ? 'Pause the preview' : 'Play the preview'}>
          <UltraFill radius={18} sheen={false} />
          <PlayPauseIcon playing={playing} size={11} color={C.onGrad} />
        </Pressable>
        <View style={{ flex: 1, gap: 6 }}>
          <View style={s.wave}>
            {bars.map((b, i) => (
              <View key={i} style={[s.waveBar, { height: `${Math.min(1, b) * 100}%`, backgroundColor: i < played ? gradAt(C, i / bars.length) : C.wave }]} />
            ))}
          </View>
          <View style={s.rowBetween}>
            <Text style={[s.time, { color: C.text }]}>{fmt(t)}</Text>
            <Text style={s.time}>{fmt(LENGTH)}</Text>
          </View>
        </View>
      </View>
      <View style={[s.uploadBtn, gradGlow(C, 0.8)]}>
        <UltraFill radius={R.card} />
        <Text style={s.uploadText}>Upload to YouTube</Text>
      </View>
      <Text style={[s.time, { textAlign: 'center' }]}>mp4 · 1920×1080 · {style.name} · public</Text>
    </View>
  );
}

const useStyles = makeStyles((C) => ({
  panel: { borderRadius: R.card, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, padding: 14, gap: 12, overflow: 'hidden' },
  video: { aspectRatio: 16 / 9, borderRadius: R.ctl, borderWidth: 1, borderColor: C.lineSoft, backgroundColor: '#05080a', overflow: 'hidden' },
  videoBg: { position: 'absolute', left: '-12%', top: '-12%', width: '124%', height: '124%' },
  videoShade: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  videoBadge: {
    position: 'absolute',
    left: 8,
    top: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.55)',
    color: '#d6d6d6',
    fontSize: 10.5,
    fontFamily: F.mono,
    overflow: 'hidden',
  },
  pick: { gap: 6 },
  viz: {
    width: 86,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: R.ctl,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.card2,
  },
  vizOn: { borderColor: C.accLine, backgroundColor: C.accSoft },
  vizIcon: { width: 52, height: 24 },
  vizName: { color: C.t2, fontSize: 12.5, ...font('500') },
  pro: {
    color: C.acc,
    fontSize: 9.5,
    fontFamily: F.mono,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.accLine,
    overflow: 'hidden',
  },
  note: { color: C.t3, fontSize: 12.5, ...font() },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  player: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  playBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.gradB, alignItems: 'center', justifyContent: 'center' },
  wave: { height: 26, flexDirection: 'row', alignItems: 'center', gap: 2 },
  waveBar: { flex: 1, borderRadius: 1 },
  time: { color: C.t3, fontSize: 11, fontFamily: F.mono },
  uploadBtn: { height: 44, borderRadius: R.card, backgroundColor: C.gradB, alignItems: 'center', justifyContent: 'center' },
  uploadText: { color: C.onGrad, fontSize: 15, ...font('600') },
}));
