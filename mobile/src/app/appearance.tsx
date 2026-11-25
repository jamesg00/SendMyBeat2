import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { useUiStyles } from '@/components/ui';
import { Wallpaper } from '@/components/wallpaper';
import { openPaywall, useSubscription } from '@/state/billing';
import { setWallpaper, useWallpaperId, wallpaperColors, WALLPAPERS, type WallpaperId } from '@/state/wallpaper';
import { F, R, font, makeStyles, PALETTES, setTheme, THEMES, useColors, useThemeId, type Palette, type ThemeId } from '@/theme';

// The theme gallery, like the Clippr desktop app's Appearance page. Picking one cross-fades the
// whole app to it; the choice is kept on this device. Below it, the animated wallpapers for the
// main tabs, for paying accounts; the picked one also plays behind this screen. Free accounts see
// them locked, and a tap opens the plans.
export default function AppearanceScreen() {
  const s = useStyles();
  const ui = useUiStyles();
  const C = useColors();
  const insets = useSafeAreaInsets();
  const current = useThemeId();
  const wallpaper = useWallpaperId();
  const wallColors = wallpaperColors(C);
  const sub = useSubscription();
  const paying = !!sub?.is_subscribed;

  return (
    <View style={s.root}>
      {paying && wallpaper && wallColors ? <Wallpaper id={wallpaper} colors={wallColors} active /> : null}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}>
        <View style={s.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={s.done} accessibilityRole="button">
            <Text style={s.doneText}>Done</Text>
          </Pressable>
        </View>
        <View style={{ gap: 6 }}>
          <Text style={ui.largeTitle} accessibilityRole="header">
            Appearance
          </Text>
          <Text style={s.sub}>Eleven looks. The whole app changes as you pick one.</Text>
        </View>
        <View style={s.grid} accessibilityRole="radiogroup">
          {THEMES.map((theme) => (
            <ThemeCard key={theme.id} id={theme.id} label={theme.label} selected={theme.id === current} />
          ))}
        </View>

        <View style={{ gap: 6, marginTop: 8 }}>
          <Text style={s.sectionTitle} accessibilityRole="header">
            Wallpaper
          </Text>
          <Text style={s.sub}>
            {wallColors
              ? 'Animated, behind your main tabs, in your theme’s colors.'
              : 'Wallpapers show with the dark themes. Pick one now and it appears when you switch.'}
          </Text>
        </View>
        <View style={s.wallGrid} accessibilityRole="radiogroup">
          <WallpaperCard id={null} label="None" selected={!paying || wallpaper === null} locked={false} />
          {WALLPAPERS.map((w) => (
            <WallpaperCard key={w.id} id={w.id} label={w.label} preview={w.preview} selected={paying && w.id === wallpaper} locked={!paying} />
          ))}
        </View>
        {!paying ? (
          <Pressable onPress={() => openPaywall('needs_plan')} style={s.upgrade} accessibilityRole="button">
            <Text style={[s.upgradeText, { color: C.acc }]}>Choose a plan to pick a wallpaper</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

function WallpaperCard({
  id,
  label,
  preview,
  selected,
  locked,
}: {
  id: WallpaperId | null;
  label: string;
  preview?: number;
  selected: boolean;
  locked: boolean;
}) {
  const s = useStyles();
  const C = useColors();
  return (
    <Pressable
      onPress={() => (locked ? openPaywall('needs_plan') : setWallpaper(id))}
      style={({ pressed }) => [s.wallCard, selected && { borderColor: C.acc, borderWidth: 2, padding: 5 }, pressed && { transform: [{ scale: 0.97 }] }]}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={id ? `${label} wallpaper${locked ? ', needs a plan' : ''}` : 'No wallpaper'}>
      <View style={s.wallPreview}>
        {preview ? (
          <Image source={preview} style={[{ flex: 1 }, locked && { opacity: 0.55 }]} contentFit="cover" accessibilityIgnoresInvertColors />
        ) : (
          <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={22} height={22} viewBox="0 0 22 22" accessibilityElementsHidden importantForAccessibility="no">
              <Path d="M4 4 L18 18 M18 4 L4 18" stroke={C.t3} strokeWidth={1.6} strokeLinecap="round" />
            </Svg>
          </View>
        )}
        {locked ? (
          <View style={s.lock}>
            <Svg width={11} height={11} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
              <Path d="M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z" stroke="#FFFFFF" strokeWidth={2.4} fill="none" strokeLinejoin="round" />
            </Svg>
          </View>
        ) : null}
      </View>
      <Text style={s.wallLabel} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function ThemeCard({ id, label, selected }: { id: ThemeId; label: string; selected: boolean }) {
  const s = useStyles();
  const C = useColors();
  return (
    <Pressable
      onPress={() => void setTheme(id)}
      style={({ pressed }) => [s.card, selected && { borderColor: C.acc, borderWidth: 2, padding: 7 }, pressed && { transform: [{ scale: 0.97 }] }]}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${label} theme`}>
      {id === 'auto' ? (
        <View style={[s.preview, { flexDirection: 'row' }]}>
          <Preview p={PALETTES.light} half />
          <Preview p={PALETTES.graphite} half />
        </View>
      ) : (
        <View style={s.preview}>
          <Preview p={PALETTES[id]} />
        </View>
      )}
      <View style={s.labelRow}>
        <Text style={s.label}>{label}</Text>
        {selected ? (
          <Svg width={14} height={14} viewBox="0 0 14 14" accessibilityElementsHidden importantForAccessibility="no">
            <Path d="M2.5 7.5 L5.8 10.5 L11.5 3.5" stroke={C.acc} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        ) : null}
      </View>
    </Pressable>
  );
}

// A tiny screen in the theme's own colors: background, a card with a line of text, the status
// color and a primary button.
function Preview({ p, half }: { p: Palette; half?: boolean }) {
  return (
    <View style={{ flex: 1, backgroundColor: p.bg, padding: 8, gap: 6, justifyContent: 'flex-end' }}>
      <View style={{ backgroundColor: p.card, borderColor: p.line, borderWidth: 1, borderRadius: 6, padding: 6, gap: 5 }}>
        <View style={{ height: 4, width: half ? '80%' : '60%', borderRadius: 2, backgroundColor: p.text }} />
        <View style={{ height: 3, width: '40%', borderRadius: 2, backgroundColor: p.acc }} />
      </View>
      <View style={{ height: 10, borderRadius: 5, backgroundColor: p.primary }} />
    </View>
  );
}

const useStyles = makeStyles((C) => ({
  root: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 20, gap: 20 },
  topBar: { height: 52, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  done: { minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' },
  doneText: { color: C.text, fontSize: 16, ...font('600') },
  sub: { color: C.t2, fontSize: 15, lineHeight: 21, ...font() },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    flexBasis: '47%',
    flexGrow: 1,
    padding: 8,
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.card,
  },
  preview: { height: 92, borderRadius: 9, overflow: 'hidden' },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2, minHeight: 20 },
  label: { color: C.text, fontSize: 13.5, ...font('600') },
  mono: { color: C.t3, fontSize: 11, fontFamily: F.mono },
  sectionTitle: { color: C.text, fontSize: 20, ...font('600') },
  wallGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  wallCard: {
    flexBasis: '30%',
    flexGrow: 1,
    maxWidth: '32%',
    padding: 6,
    gap: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.card,
  },
  wallPreview: { aspectRatio: 0.58, borderRadius: 9, overflow: 'hidden' },
  wallLabel: { color: C.text, fontSize: 12.5, textAlign: 'center', ...font('600') },
  lock: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgrade: {
    height: 44,
    borderRadius: R.ctl,
    borderWidth: 1,
    borderColor: C.accLine,
    backgroundColor: C.accSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeText: { fontSize: 14.5, ...font('600') },
}));
