'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { apiDownload, apiRequest, ApiClientError, type ApiRequestOptions } from '@/lib/api/client';
import { getCurrentUser, login as loginRequest, logout as logoutRequest, refreshAccessToken } from '../api/auth-api';
import type { AuthUser, LoginInput } from '../types/auth';

type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated';
type AuthContextValue = {
  user: AuthUser | null;
  status: AuthStatus;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  request: <T>(path: string, options?: ApiRequestOptions) => Promise<T>;
  download: (path: string) => Promise<Blob>;
};
type RestoredSession = { accessToken: string; user: AuthUser };

const AuthContext = createContext<AuthContextValue | null>(null);
let restorePromise: Promise<RestoredSession | null> | null = null;

async function restoreSession(): Promise<RestoredSession | null> {
  try {
    const tokens = await refreshAccessToken();
    const user = await getCurrentUser(tokens.accessToken);
    return { accessToken: tokens.accessToken, user };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('checking');
  const accessTokenRef = useRef<string | null>(null);
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

  const applySession = useCallback((session: RestoredSession | null) => {
    accessTokenRef.current = session?.accessToken ?? null;
    setUser(session?.user ?? null);
    setStatus(session ? 'authenticated' : 'unauthenticated');
  }, []);

  useEffect(() => {
    let active = true;
    restorePromise ??= restoreSession();
    restorePromise.then((session) => {
      if (active) applySession(session);
    });
    return () => { active = false; };
  }, [applySession]);

  const refresh = useCallback(async () => {
    if (!refreshPromiseRef.current) {
      refreshPromiseRef.current = restoreSession()
        .then((session) => {
          applySession(session);
          return session?.accessToken ?? null;
        })
        .finally(() => { refreshPromiseRef.current = null; });
    }
    return refreshPromiseRef.current;
  }, [applySession]);

  const login = useCallback(async (input: LoginInput) => {
    const tokens = await loginRequest(input);
    const nextUser = await getCurrentUser(tokens.accessToken);
    restorePromise = null;
    applySession({ accessToken: tokens.accessToken, user: nextUser });
  }, [applySession]);

  const logout = useCallback(async () => {
    try {
      await logoutRequest(accessTokenRef.current);
    } finally {
      restorePromise = null;
      applySession(null);
    }
  }, [applySession]);

  const request = useCallback(async <T,>(path: string, options: ApiRequestOptions = {}): Promise<T> => {
    let accessToken = accessTokenRef.current;
    if (!accessToken) {
      throw new ApiClientError({
        status: 401,
        error: 'Unauthorized',
        code: 'AUTH_REQUIRED',
        message: 'Phiên đăng nhập không còn hiệu lực',
      });
    }
    try {
      return await apiRequest<T>(path, { ...options, accessToken });
    } catch (error) {
      if (!(error instanceof ApiClientError) || error.status !== 401) throw error;
      accessToken = await refresh();
      if (!accessToken) throw error;
      return apiRequest<T>(path, { ...options, accessToken });
    }
  }, [refresh]);

  const download = useCallback(async (path: string): Promise<Blob> => {
    let accessToken = accessTokenRef.current;
    if (!accessToken) {
      throw new ApiClientError({
        status: 401,
        error: 'Unauthorized',
        code: 'AUTH_REQUIRED',
        message: 'Phiên đăng nhập không còn hiệu lực',
      });
    }
    try {
      return await apiDownload(path, accessToken);
    } catch (error) {
      if (!(error instanceof ApiClientError) || error.status !== 401) throw error;
      accessToken = await refresh();
      if (!accessToken) throw error;
      return apiDownload(path, accessToken);
    }
  }, [refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, logout, request, download }),
    [user, status, login, logout, request, download],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth phải được dùng bên trong AuthProvider');
  return context;
}
