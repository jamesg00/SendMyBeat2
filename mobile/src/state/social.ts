import { useSyncExternalStore } from 'react';

import * as api from '@/api/endpoints';
import type { Producer } from '@/api/endpoints';

// Which producers you've liked and follow, plus the latest counts, shared by Spotlight and the
// profile sheet. Taps update instantly and roll back if the server refuses.

type State = {
  loaded: boolean;
  liked: Set<string>;
  following: Set<string>;
  likes: Record<string, number>;
  followers: Record<string, number>;
  error: string | null;
};

let state: State = { loaded: false, liked: new Set(), following: new Set(), likes: {}, followers: {}, error: null };
const listeners = new Set<() => void>();
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

let loading: Promise<void> | null = null;

/** Forget the signed-in user's likes and follows (on sign-out). */
export function resetSocial() {
  loading = null;
  set({ loaded: false, liked: new Set(), following: new Set(), likes: {}, followers: {}, error: null });
}

/** Fetch your likes and follows once per session; `force` fetches again (pull to refresh). */
export function loadSocial(force = false) {
  if (force) loading = null;
  loading ??= api.mySpotlightSocial().then(
    (r) => set({ loaded: true, liked: new Set(r.liked), following: new Set(r.following) }),
    () => {
      loading = null; // try again next time Spotlight opens
    },
  );
  return loading;
}

export function useSocial() {
  return useSyncExternalStore(subscribe, () => state);
}

export const likesOf = (s: State, p: Producer) => s.likes[p.user_id] ?? p.app_likes ?? 0;
export const followersOf = (s: State, p: Producer) => s.followers[p.user_id] ?? p.followers ?? 0;

export async function toggleLike(p: Producer) {
  const id = p.user_id;
  const on = !state.liked.has(id);
  const before = { liked: state.liked, likes: state.likes };
  const liked = new Set(state.liked);
  if (on) liked.add(id);
  else liked.delete(id);
  set({ liked, likes: { ...state.likes, [id]: Math.max(0, likesOf(state, p) + (on ? 1 : -1)) }, error: null });
  try {
    const r = await api.setLike(id, on);
    set({ likes: { ...state.likes, [id]: r.app_likes } });
  } catch (e) {
    set({ ...before, error: e instanceof Error ? e.message : 'Could not update your like.' });
  }
}

export async function toggleFollow(p: Producer) {
  const id = p.user_id;
  const on = !state.following.has(id);
  const before = { following: state.following, followers: state.followers };
  const following = new Set(state.following);
  if (on) following.add(id);
  else following.delete(id);
  set({ following, followers: { ...state.followers, [id]: Math.max(0, followersOf(state, p) + (on ? 1 : -1)) }, error: null });
  try {
    const r = await api.setFollow(id, on);
    set({ followers: { ...state.followers, [id]: r.followers } });
  } catch (e) {
    set({ ...before, error: e instanceof Error ? e.message : 'Could not update your follow.' });
  }
}
