import { Directory, File, Paths } from 'expo-file-system';
import { useEffect, useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';

import { APP_ICONS, type AppIconId } from '@/data/app-icons';
import { eventIconFor } from '@/data/icon-calendar';

// The home screen icon. Everyone gets the holiday or event icon on its days (see icon-calendar).
// Paying accounts can also pick any icon as their everyday one, and choose whether holidays
// still take over. The choice is kept on this device, across sign-outs.
//
// The system only lets an app change its icon while it runs: iOS while it's open (and it shows
// its own "You have changed the icon" note), Android when it goes to the background (changing it
// while open can close the app on some phones). So a new holiday icon shows up the first time
// the app is opened, or left, on that day.

type Native = typeof import('expo-alternate-app-icons');
let native: Native | null = null;
try {
  // Missing in Expo Go and on web, where icons can't change.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod: Native = require('expo-alternate-app-icons');
  native = mod.supportsAlternateIcons ? mod : null;
} catch {
  native = null;
}

/** False in Expo Go, on web, and on builds made before alternate icons were added. */
export const canChangeIcon = native !== null;

export type IconPrefs = {
  /** Paying accounts' everyday icon; null is the standard SendMyBeat icon. */
  choice: AppIconId | null;
  /** Paying accounts: whether holiday and event icons replace the chosen one on their days. */
  holidays: boolean;
};

const DEFAULT_PREFS: IconPrefs = { choice: null, holidays: true };

const prefsDir = Platform.OS !== 'web' ? new Directory(Paths.document, 'prefs') : null;
const prefsFile = prefsDir ? new File(prefsDir, 'app-icon.json') : null;

function load(): IconPrefs {
  try {
    if (!prefsFile?.exists) return DEFAULT_PREFS;
    const raw = JSON.parse(prefsFile.textSync()) as Partial<IconPrefs>;
    const choice = APP_ICONS.some((i) => i.id === raw.choice) ? (raw.choice as AppIconId) : null;
    return { choice, holidays: raw.holidays !== false };
  } catch {
    return DEFAULT_PREFS;
  }
}

let prefs = load();
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

function save(next: IconPrefs) {
  prefs = next;
  try {
    if (prefsFile && prefsDir) {
      if (!prefsDir.exists) prefsDir.create({ intermediates: true });
      prefsFile.write(JSON.stringify(next));
    }
  } catch {
    // keeping the choice is best effort
  }
  listeners.forEach((l) => l());
}

export const useIconPrefs = () => useSyncExternalStore(subscribe, () => prefs);
export const setIconChoice = (choice: AppIconId | null) => save({ ...prefs, choice });
export const setHolidayIcons = (holidays: boolean) => save({ ...prefs, holidays });

/** The icon this account should have today: null is the standard icon. */
export function iconFor(paying: boolean, p: IconPrefs, date = new Date()): AppIconId | null {
  const event = !paying || p.holidays ? eventIconFor(date) : null;
  return event ?? (paying ? p.choice : null);
}

/** The icon on the home screen right now, as far as the system says. */
export function currentIcon(): AppIconId | null {
  try {
    return (native?.getAppIconName() as AppIconId | null) ?? null;
  } catch {
    return null;
  }
}

async function apply(target: AppIconId | null) {
  if (!native || currentIcon() === target) return;
  try {
    await native.setAlternateAppIcon(target);
  } catch {
    // The system said no (e.g. iOS while the app is in the background); the next try fixes it.
  }
}

/**
 * Keeps the home screen icon in step with the date, the plan and the choice. `paying` is null
 * while a signed-in account's plan is still loading, so a paid icon isn't reset by mistake.
 */
export function useAppIconSync(paying: boolean | null) {
  const p = useIconPrefs();
  useEffect(() => {
    if (!native || paying === null) return;
    const run = () => void apply(iconFor(paying, p));
    if (Platform.OS === 'ios') {
      if (AppState.currentState === 'active') run();
      const sub = AppState.addEventListener('change', (state) => state === 'active' && run());
      return () => sub.remove();
    }
    const sub = AppState.addEventListener('change', (state) => state === 'background' && run());
    return () => sub.remove();
  }, [paying, p]);
}
