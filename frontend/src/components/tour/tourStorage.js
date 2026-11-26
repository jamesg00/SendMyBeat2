// Remembers, per account and per browser, that the tour was seen (finished or skipped).
// Saving is best effort: private windows or blocked storage just mean it may show again.

const KEY = (userId) => `smb.tour.v1.seen.${userId || "anon"}`;

// Accounts this new see the tour on their own; everyone else can start it from Settings.
export const NEW_ACCOUNT_DAYS = 14;

export const hasSeenTour = (userId) => {
  try {
    return Boolean(window.localStorage.getItem(KEY(userId)));
  } catch {
    return false;
  }
};

export const markTourSeen = (userId) => {
  try {
    window.localStorage.setItem(KEY(userId), new Date().toISOString());
  } catch {
    // storage blocked
  }
};

export const isNewAccount = (createdAt, now = Date.now()) => {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return now - created < NEW_ACCOUNT_DAYS * 24 * 60 * 60 * 1000;
};

/** Whether to open the tour by itself for this account. */
export const shouldAutoStartTour = (user, now = Date.now()) =>
  Boolean(user?.id) && isNewAccount(user.created_at, now) && !hasSeenTour(user.id);
