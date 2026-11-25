import { Directory, File, Paths } from 'expo-file-system';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

// The first-run tour: whether it's open, and which accounts on this device have seen it.
// "Seen" lives outside the per-account work folder, so signing out doesn't bring the tour back.

/** Accounts this new see the tour on their own; everyone can start it from Profile. */
export const NEW_ACCOUNT_DAYS = 14;

const dir = Platform.OS !== 'web' ? new Directory(Paths.document, 'prefs') : null;
const WEB_KEY = 'smb.tour.v1.seen';

let seen: string[] | null = null;

function loadSeen(): string[] {
  if (seen) return seen;
  try {
    if (dir) {
      const f = new File(dir, 'tour-seen.json');
      seen = f.exists ? ((JSON.parse(f.textSync()) as { ids?: string[] }).ids ?? []) : [];
    } else {
      seen = JSON.parse(globalThis.localStorage?.getItem(WEB_KEY) ?? '[]') as string[];
    }
  } catch {
    seen = [];
  }
  return seen;
}

function saveSeen(ids: string[]) {
  seen = ids;
  try {
    if (dir) {
      if (!dir.exists) dir.create({ intermediates: true });
      new File(dir, 'tour-seen.json').write(JSON.stringify({ ids }));
    } else {
      globalThis.localStorage?.setItem(WEB_KEY, JSON.stringify(ids));
    }
  } catch {
    // saving is best effort
  }
}

export const hasSeenTour = (userId: string) => loadSeen().includes(userId);

export function markTourSeen(userId: string) {
  if (hasSeenTour(userId)) return;
  saveSeen([...loadSeen(), userId].slice(-20));
}

export function isNewAccount(createdAt: string | null | undefined, now = Date.now()) {
  if (!createdAt) return false;
  const t = new Date(createdAt).getTime();
  return !Number.isNaN(t) && now - t < NEW_ACCOUNT_DAYS * 24 * 60 * 60 * 1000;
}

// ---- open / closed ----

let open = false;
// Accounts the tour already opened for by itself in this session.
const autoStarted = new Set<string>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useTourOpen = () => useSyncExternalStore(subscribe, () => open, () => open);

export function openTour() {
  open = true;
  emit();
}

export function closeTour(userId?: string) {
  if (userId) markTourSeen(userId);
  open = false;
  emit();
}

type TourUser = { id: string; created_at?: string | null } | null | undefined;

/** True while this account is due its first tour (new, not seen, not shown yet this session). */
export const wantsAutoTour = (user: TourUser) =>
  !!user && !autoStarted.has(user.id) && isNewAccount(user.created_at) && !hasSeenTour(user.id);

/** Open the tour for a new account, once. */
export function autoStartTour(user: TourUser) {
  if (!user || !wantsAutoTour(user)) return;
  autoStarted.add(user.id);
  openTour();
}
