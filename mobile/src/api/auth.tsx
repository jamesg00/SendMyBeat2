import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { loadToken, saveToken, setUnauthorizedHandler } from './client';
import * as endpoints from './endpoints';
import type { User } from './endpoints';
import { claimSavedWork, clearSavedWork } from '@/state/persist';
import { resetAgent } from '@/state/plan-agent';
import { resetSocial } from '@/state/social';

type AuthState = {
  ready: boolean;
  user: User | null;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const signOut = useCallback(async () => {
    await saveToken(null);
    clearSavedWork();
    setUser(null);
    resetSocial();
    resetAgent();
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => void signOut());
    (async () => {
      try {
        if (await loadToken()) {
          const me = await endpoints.me();
          claimSavedWork(me.id);
          setUser(me);
        }
      } catch {
        await saveToken(null);
      } finally {
        setReady(true);
      }
    })();
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  const finish = async (res: endpoints.TokenResponse) => {
    await saveToken(res.access_token);
    claimSavedWork(res.user.id);
    setUser(res.user);
  };

  const value: AuthState = {
    ready,
    user,
    signIn: async (u, p) => finish(await endpoints.login(u, p)),
    signUp: async (u, p) => finish(await endpoints.register(u, p)),
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
