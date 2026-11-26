import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Platform, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Aurora, EdgeCard, useUiStyles } from '@/components/ui';
import { APP_ICONS, DEFAULT_ICON_PREVIEW, iconInfo, type AppIconId } from '@/data/app-icons';
import { eventIconFor, upcomingEvents } from '@/data/icon-calendar';
import { canChangeIcon, iconFor, setHolidayIcons, setIconChoice, useIconPrefs } from '@/state/app-icon';
import { openPaywall, useSubscription } from '@/state/billing';
import { F, font, makeStyles, R, useColors } from '@/theme';

// Pick the home screen icon. Holiday and event icons switch on their own for everyone; paying
// accounts can also pick any icon as their everyday one. Free accounts see the gallery and the
// plans when they tap one.
export default function AppIconScreen() {
  const s = useStyles();
  const ui = useUiStyles();
  const C = useColors();
  const insets = useSafeAreaInsets();
  const sub = useSubscription();
  const prefs = useIconPrefs();
  const paying = !!sub?.is_subscribed;

  const today = eventIconFor();
  const showing = iconFor(paying, prefs);
  const next = upcomingEvents(new Date(), 2);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  const pick = (id: AppIconId | null) => {
    if (!paying) {
      if (id) openPaywall('needs_plan');
      return;
    }
    setIconChoice(id);
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}>
      <Aurora style={{ top: 10, right: -90 }} />
      <View style={s.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.done} accessibilityRole="button">
          <Text style={s.doneText}>Done</Text>
        </Pressable>
      </View>

      <View style={{ gap: 6 }}>
        <Text style={ui.largeTitle} accessibilityRole="header">
          App icon
        </Text>
        <Text style={s.sub}>
          {paying
            ? 'Pick the icon on your home screen. Holiday icons switch on their own when it’s time.'
            : 'Holiday icons switch on their own when it’s time. With a plan, you can pick any of these whenever you like.'}
        </Text>
      </View>

      <EdgeCard glow style={s.card}>
        <View style={s.nowRow}>
          <Image source={iconInfo(showing)?.preview ?? DEFAULT_ICON_PREVIEW} style={s.nowIcon} accessibilityIgnoresInvertColors />
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={s.nowTitle}>{today && showing === today ? `${iconInfo(today)?.name} icon today` : `${iconInfo(showing)?.name ?? 'SendMyBeat'} icon`}</Text>
            <Text style={s.hint} numberOfLines={2}>
              {next.length ? `Coming up: ${next.map((e) => `${iconInfo(e.icon)?.name} ${fmt(e.start)}`).join(', ')}` : 'No holiday icons coming up.'}
            </Text>
          </View>
        </View>
        {paying ? (
          <View style={[s.nowRow, s.divider]}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.optTitle}>Holiday icons</Text>
              <Text style={s.hint}>Switch to the holiday icon on its days, then back to yours.</Text>
            </View>
            <Switch value={prefs.holidays} onValueChange={setHolidayIcons} accessibilityLabel="Holiday icons" />
          </View>
        ) : null}
        {!canChangeIcon ? (
          <Text style={[s.hint, s.divider, { paddingTop: 12 }]}>This version of the app can’t change its icon yet. Update the app to use these.</Text>
        ) : Platform.OS === 'android' ? (
          <Text style={[s.hint, s.divider, { paddingTop: 12 }]}>A new icon shows on your home screen after you leave the app.</Text>
        ) : null}
      </EdgeCard>

      <View style={s.grid} accessibilityRole="radiogroup">
        <IconCell name="SendMyBeat" preview={DEFAULT_ICON_PREVIEW} selected={!paying || prefs.choice === null} locked={false} onPress={() => pick(null)} />
        {APP_ICONS.map((icon) => (
          <IconCell
            key={icon.id}
            name={icon.name}
            preview={icon.preview}
            selected={paying && prefs.choice === icon.id}
            locked={!paying}
            onPress={() => pick(icon.id)}
          />
        ))}
      </View>
      {!paying ? (
        <Pressable onPress={() => openPaywall('needs_plan')} style={({ pressed }) => [s.upgrade, pressed && { opacity: 0.8 }]} accessibilityRole="button">
          <Text style={[s.upgradeText, { color: C.acc }]}>Choose a plan to pick your icon</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

function IconCell({ name, preview, selected, locked, onPress }: { name: string; preview: number; selected: boolean; locked: boolean; onPress: () => void }) {
  const s = useStyles();
  const C = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.cell, pressed && { transform: [{ scale: 0.95 }] }]}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${name} icon${locked ? ', needs a plan' : ''}`}>
      <View style={[s.iconWrap, selected && { borderColor: C.acc }]}>
        <Image source={preview} style={[s.icon, locked && { opacity: 0.55 }]} accessibilityIgnoresInvertColors />
        {locked ? (
          <View style={s.lock}>
            <Svg width={11} height={11} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
              <Path d="M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z" stroke="#FFFFFF" strokeWidth={2.4} fill="none" strokeLinejoin="round" />
            </Svg>
          </View>
        ) : null}
      </View>
      <Text style={[s.cellName, selected && { color: C.text }]} numberOfLines={1}>
        {name}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles((C) => ({
  root: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 20, gap: 20 },
  topBar: { height: 52, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  done: { minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' },
  doneText: { color: C.text, fontSize: 16, ...font('600') },
  sub: { color: C.t2, fontSize: 15, lineHeight: 21, ...font() },
  // Inside the edge card: its 1px edge plus 13 keeps the old 14 padding.
  card: { padding: 13, gap: 12 },
  nowRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nowIcon: { width: 48, height: 48, borderRadius: 11 },
  nowTitle: { color: C.text, fontSize: 15, ...font('600') },
  divider: { borderTopWidth: 1, borderTopColor: C.line, paddingTop: 12 },
  optTitle: { color: C.text, fontSize: 14.5, ...font('600') },
  hint: { color: C.t2, fontSize: 12.5, lineHeight: 17, ...font() },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 },
  cell: { width: '25%', alignItems: 'center', gap: 6 },
  iconWrap: { padding: 3, borderRadius: 18, borderWidth: 2, borderColor: 'transparent' },
  icon: { width: 60, height: 60, borderRadius: 14 },
  lock: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellName: { color: C.t2, fontSize: 11, fontFamily: F.mono, maxWidth: 76, textAlign: 'center' },
  upgrade: { height: 44, borderRadius: R.ctl, borderWidth: 1, borderColor: C.accLine, backgroundColor: C.accSoft, alignItems: 'center', justifyContent: 'center' },
  upgradeText: { fontSize: 14.5, ...font('600') },
}));
