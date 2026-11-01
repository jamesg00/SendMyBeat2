import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useSyncExternalStore } from 'react';

import { API_BASE } from '@/api/client';
import * as api from '@/api/endpoints';
import type { CheckoutPlan, SubscriptionStatus } from '@/api/endpoints';

// Your plan, shared by every screen, and paying for it in the app: Stripe Checkout opens in an
// in-app browser and comes back here through /billing/return, which redirects into the app.

let status: SubscriptionStatus | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
const set = (next: SubscriptionStatus | null) => {
  status = next;
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Reload your plan. `sync` asks the server to check Stripe first (after a checkout). */
export function refreshSubscription(sync = false) {
  loading = (sync ? api.syncSubscription() : api.subscriptionStatus()).then(set, () => {}).finally(() => {
    loading = null;
  });
  return loading;
}

export function useSubscription() {
  const s = useSyncExternalStore(subscribe, () => status);
  useEffect(() => {
    if (!status && !loading) void refreshSubscription();
  }, []);
  return s;
}

export function resetSubscription() {
  set(null);
}

export const planName = (s: SubscriptionStatus | null) => {
  if (!s) return '…';
  if (s.trial) return 'Free trial';
  if (s.plan === 'max' || s.plan === 'pro') return s.founding_member ? 'Pro · Founding' : 'Pro';
  if (s.plan === 'plus') return 'Plus';
  return 'Free';
};

export type PaywallReason = 'needs_plan' | 'needs_pro' | 'trial_limit';

let paywallOpen = false;
export const markPaywallOpen = (open: boolean) => {
  paywallOpen = open;
};

/** Show the plans. `reason` picks the headline; `message` is what the server said. */
export function openPaywall(reason: PaywallReason = 'needs_plan', message?: string) {
  if (paywallOpen) return;
  router.push({ pathname: '/paywall', params: message ? { reason, message } : { reason } });
}

/** For Pro features: true if you have Pro, else opens the paywall. (Unknown yet: let the server decide.) */
export function requirePro() {
  if (!status || status.pro_access) return true;
  openPaywall('needs_pro');
  return false;
}

const appLink = () => Linking.createURL('billing');
const returnUrl = (result: string) => `${API_BASE}/billing/return?${new URLSearchParams({ to: appLink(), status: result }).toString()}`;

/** Open a Stripe page in the in-app browser; true if it came back saying it went through. */
async function openStripe(url: string) {
  const res = await WebBrowser.openAuthSessionAsync(url, appLink());
  await refreshSubscription(true);
  return res.type === 'success' && /[?&]status=success\b/.test(res.url);
}

/** Start a plan (or switch the one you have). Resolves true once it's yours. */
export async function startPlan(plan: CheckoutPlan, opts: { trial?: boolean } = {}) {
  const res = await api.createCheckout({ plan, trial: !!opts.trial, success_url: returnUrl('success'), cancel_url: returnUrl('cancel') });
  if ('switched' in res) {
    await refreshSubscription(true);
    return true;
  }
  return openStripe(res.checkout_url);
}

export async function sendTip(amountCents: number) {
  const res = await api.createTip({ amount_cents: amountCents, success_url: returnUrl('success'), cancel_url: returnUrl('cancel') });
  return openStripe(res.checkout_url);
}

/** Stripe's billing page: change plan, update the card, cancel. */
export async function manageBilling() {
  const { url } = await api.billingPortal(returnUrl('done'));
  await openStripe(url);
}

export const dollars = (cents: number) => `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;
