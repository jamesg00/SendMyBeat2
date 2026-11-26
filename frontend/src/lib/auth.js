const AUTH_TOKEN_KEY = "token";

export const getAuthToken = () => {
  const sessionToken = sessionStorage.getItem(AUTH_TOKEN_KEY);
  if (sessionToken) {
    return sessionToken;
  }

  const legacyToken = localStorage.getItem(AUTH_TOKEN_KEY);
  if (legacyToken) {
    sessionStorage.setItem(AUTH_TOKEN_KEY, legacyToken);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    return legacyToken;
  }

  return "";
};

export const setAuthToken = (token) => {
  if (!token) {
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    return;
  }
  sessionStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.removeItem(AUTH_TOKEN_KEY);
};

export const clearAuthToken = () => {
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
};

// Where to send someone after they sign in or connect YouTube, when they started from a page
// other than the dashboard (like the free MP3 to YouTube uploader). Only same-site paths are
// kept ("/x", never "//host" or "https://..."), and only for half an hour, so an abandoned
// sign-in doesn't send a later one somewhere unexpected.
const RETURN_TO_KEY = "smb_return_to";
const RETURN_TO_MAX_AGE_MS = 30 * 60 * 1000;

export const isSafeReturnPath = (path) =>
  typeof path === "string" && path.startsWith("/") && !path.startsWith("//") && !path.includes("\\") && path.length <= 512;

export const setReturnTo = (path) => {
  try {
    if (isSafeReturnPath(path)) {
      sessionStorage.setItem(RETURN_TO_KEY, JSON.stringify({ path, at: Date.now() }));
    }
  } catch {
    // Storage blocked (private mode): fall back to the dashboard.
  }
};

// Returns the stored path once, then forgets it. Null when there's none (or it's stale).
export const takeReturnTo = () => {
  try {
    const raw = sessionStorage.getItem(RETURN_TO_KEY);
    sessionStorage.removeItem(RETURN_TO_KEY);
    if (!raw) return null;
    const { path, at } = JSON.parse(raw);
    if (!isSafeReturnPath(path) || !(Date.now() - Number(at) < RETURN_TO_MAX_AGE_MS)) return null;
    return path;
  } catch {
    return null;
  }
};
