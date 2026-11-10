import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import * as api from "@/app/api";

// Small shared stores (your plan, the plans sheet, likes and follows, the theme) and the
// useRequest loader, like the mobile app's src/state and src/api/use-request.

function createStore(initial) {
  let state = initial;
  const listeners = new Set();
  return {
    get: () => state,
    set: (next) => {
      state = typeof next === "function" ? next(state) : next;
      listeners.forEach((l) => l());
    },
    subscribe: (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}
const useStore = (store) => useSyncExternalStore(store.subscribe, store.get);

/** Loads screen data on mount; reload() shows the spinner again, refresh() keeps what's on screen. */
export function useRequest(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [run, setRun] = useState({ n: 0, quiet: false });
  useEffect(() => {
    let alive = true;
    fn().then(
      (data) => alive && setState({ data, error: null, loading: false }),
      (e) => {
        if (!alive) return;
        const error = e instanceof Error ? e.message : "Something went wrong";
        setState((s) => (run.quiet && s.data ? { ...s, loading: false } : { ...s, error, loading: false }));
      },
    );
    return () => {
      alive = false;
    };
    // fn is an endpoint function; reruns are driven by reload(), refresh() and deps
  }, [run, ...deps]);
  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    setRun((r) => ({ n: r.n + 1, quiet: false }));
  }, []);
  const refresh = useCallback(() => setRun((r) => ({ n: r.n + 1, quiet: true })), []);
  const setData = useCallback((update) => setState((s) => ({ ...s, data: update(s.data) })), []);
  return { ...state, setData, reload, refresh };
}

// ---- who is signed in
const userStore = createStore(null);
export const setUser = userStore.set;
export const useUser = () => useStore(userStore);

// ---- your plan
const subStore = createStore(null);
let subLoading = null;
/** Reload your plan. `sync` asks the server to check Stripe first (after a checkout). */
export function refreshSubscription(sync = false) {
  subLoading = (sync ? api.syncSubscription() : api.subscriptionStatus())
    .then(subStore.set, () => {})
    .finally(() => {
      subLoading = null;
    });
  return subLoading;
}
export function useSubscription(enabled = true) {
  const s = useStore(subStore);
  useEffect(() => {
    if (enabled && !subStore.get() && !subLoading) void refreshSubscription();
  }, [enabled]);
  return s;
}
export const planName = (s) => {
  if (!s) return "…";
  if (s.trial) return "Free trial";
  if (s.plan === "max" || s.plan === "pro") return s.founding_member ? "Pro · Founding" : "Pro";
  if (s.plan === "plus") return "Plus";
  return "Free";
};
export const dollars = (cents) => `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;

// ---- the plans sheet
const paywallStore = createStore(null);
export const usePaywall = () => useStore(paywallStore);
export const closePaywall = () => paywallStore.set(null);
/** Show the plans. `reason` picks the headline; `message` is what the server said. */
export function openPaywall(reason = "needs_plan", message) {
  paywallStore.set({ reason, message });
}
api.setPaywallHandler((code, message) => openPaywall(code, message));
/** For Pro features: true if you have Pro, else opens the plans. (Unknown yet: let the server decide.) */
export function requirePro() {
  const s = subStore.get();
  if (!s || s.pro_access) return true;
  openPaywall("needs_pro");
  return false;
}
/** Before spending a credit: true if you have one, else opens the plans. */
export function requireCredit(kind) {
  const s = subStore.get();
  if (!s || s.plan === "pro") return true;
  const left = kind === "ai" ? s.daily_credits_remaining : s.upload_credits_remaining;
  if (left > 0) return true;
  openPaywall(!s.is_subscribed ? "needs_plan" : s.trial ? "trial_limit" : "out_of_credits");
  return false;
}
/** Start a plan (or switch the one you have). Leaves for Stripe unless the switch happened in place. */
export async function startPlan(plan, trial) {
  const res = await api.createCheckout(plan, trial);
  if (res?.switched) {
    await refreshSubscription(true);
    return true;
  }
  window.location.href = res.checkout_url;
  return false;
}
export async function manageBilling() {
  const { url } = await api.billingPortal();
  window.location.href = url;
}

// ---- likes and follows, shared by Spotlight and profiles. Taps update at once and roll back if refused.
const socialStore = createStore({ loaded: false, liked: new Set(), following: new Set(), likes: {}, followers: {}, error: null });
const setSocial = (patch) => socialStore.set((s) => ({ ...s, ...patch }));
let socialLoading = null;
export function loadSocial(force = false) {
  if (force) socialLoading = null;
  socialLoading ??= api.mySpotlightSocial().then(
    (r) => setSocial({ loaded: true, liked: new Set(r.liked), following: new Set(r.following) }),
    () => {
      socialLoading = null;
    },
  );
  return socialLoading;
}
export const useSocial = () => useStore(socialStore);
export const likesOf = (s, p) => s.likes[p.user_id] ?? p.app_likes ?? 0;
export const followersOf = (s, p) => s.followers[p.user_id] ?? p.followers ?? 0;
export async function toggleLike(p) {
  const s = socialStore.get();
  const id = p.user_id;
  const on = !s.liked.has(id);
  const liked = new Set(s.liked);
  if (on) liked.add(id);
  else liked.delete(id);
  setSocial({ liked, likes: { ...s.likes, [id]: Math.max(0, likesOf(s, p) + (on ? 1 : -1)) }, error: null });
  try {
    const r = await api.setLike(id, on);
    setSocial({ likes: { ...socialStore.get().likes, [id]: r.app_likes } });
  } catch (e) {
    setSocial({ liked: s.liked, likes: s.likes, error: e.message || "Could not update your like." });
  }
}
export async function toggleFollow(p) {
  const s = socialStore.get();
  const id = p.user_id;
  const on = !s.following.has(id);
  const following = new Set(s.following);
  if (on) following.add(id);
  else following.delete(id);
  setSocial({ following, followers: { ...s.followers, [id]: Math.max(0, followersOf(s, p) + (on ? 1 : -1)) }, error: null });
  try {
    const r = await api.setFollow(id, on);
    setSocial({ followers: { ...socialStore.get().followers, [id]: r.followers } });
  } catch (e) {
    setSocial({ following: s.following, followers: s.followers, error: e.message || "Could not update your follow." });
  }
}

/** Forget everything about the signed-in user (on sign-out). */
export function resetStores() {
  userStore.set(null);
  subStore.set(null);
  paywallStore.set(null);
  socialLoading = null;
  socialStore.set({ loaded: false, liked: new Set(), following: new Set(), likes: {}, followers: {}, error: null });
}

// ---- theme: the same gallery as the app. "auto" follows the computer's light / dark setting.
export const THEMES = [
  { id: "console", label: "Console" },
  { id: "auto", label: "Match system" },
  { id: "light", label: "Light" },
  { id: "graphite", label: "Dark" },
  { id: "noir", label: "Noir" },
  { id: "paper", label: "Paper" },
  { id: "mint", label: "Mint" },
  { id: "midnight", label: "Midnight" },
  { id: "ocean", label: "Ocean" },
  { id: "sunset", label: "Sunset" },
  { id: "rose", label: "Rose" },
];
const THEME_KEY = "smb_theme";
const readTheme = () => {
  try {
    const id = JSON.parse(localStorage.getItem(THEME_KEY) || "{}").id;
    return THEMES.some((t) => t.id === id) ? id : "console";
  } catch {
    return "console";
  }
};
const themeStore = createStore(readTheme());
const systemLight = () => window.matchMedia?.("(prefers-color-scheme: light)").matches;
export function paintTheme() {
  const id = themeStore.get();
  const resolved = id === "auto" ? (systemLight() ? "light" : "graphite") : id;
  const root = document.documentElement;
  root.dataset.theme = resolved;
  // shadcn's dark: variants follow the theme too
  root.classList.toggle("dark", resolved !== "light" && resolved !== "paper");
}
export function setTheme(id) {
  themeStore.set(id);
  try {
    localStorage.setItem(THEME_KEY, JSON.stringify({ id }));
  } catch {
    // keeping the choice is best effort
  }
  // Cross-fade to the new colors where the browser can.
  if (document.startViewTransition && !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) document.startViewTransition(paintTheme);
  else paintTheme();
}
export const useThemeId = () => useStore(themeStore);
paintTheme();
window.matchMedia?.("(prefers-color-scheme: light)").addEventListener?.("change", paintTheme);

/** True for ~1.5 s after flash() is called: "Copied ✓" buttons. */
export function useFlash(ms = 1500) {
  const [on, setOn] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const flash = useCallback(() => {
    setOn(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOn(false), ms);
  }, [ms]);
  return [on, flash];
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard API blocked (insecure origin or permissions): fall back to a hidden field.
    const area = document.createElement("textarea");
    area.value = text;
    area.style.cssText = "position:fixed;left:-9999px";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  }
}
