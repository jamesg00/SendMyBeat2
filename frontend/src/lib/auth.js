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
