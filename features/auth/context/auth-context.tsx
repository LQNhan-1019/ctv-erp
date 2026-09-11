'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { apiDownload, apiRequest, ApiClientError, type ApiRequestOptions } from '@/lib/api/client';
import { getCurrentUser, login as loginRequest, logout as logoutRequest, refreshAccessToken } from '../api/auth-api';
import type { AuthUser, LoginInput } from '../types/auth';

type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated' | 'unavailable';
type AuthContextValue = {
  user: AuthUser | null;
  status: AuthStatus;
  sessionError: string;
  retrySession: () => Promise<void>;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  request: <T>(path: string, options?: ApiRequestOptions) => Promise<T>;
  download: (path: string) => Promise<Blob>;
};
type RestoredSession = { accessToken: string; expiresAt: string; user: AuthUser };

const AuthContext = createContext<AuthContextValue | null>(null);
let restorePromise: Promise<RestoredSession> | null = null;

async function restoreSession(): Promise<RestoredSession> {
  const tokens = await refreshAccessToken();
  const user = await getCurrentUser(tokens.accessToken);
  return { accessToken: tokens.accessToken, expiresAt: tokens.expiresAt, user };
}

function isInvalidSession(error: unknown) {
  if (!(error instanceof ApiClientError)) return false;

  // /api/auth/refresh không kiểm tra quyền nghiệp vụ. Vì vậy 403 ở đây là lỗi
  // CSRF/cookie của phiên, còn 401 là refresh/access token không còn hợp lệ.
  // Cả hai trường hợp đều phải kết thúc phiên thay vì hiển thị sai là backend mất kết nối.
  return error.status === 401 || error.status === 403;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [sessionError, setSessionError] = useState('');
  const accessTokenRef = useRef<string | null>(null);
  const expiresAtRef = useRef<number>(0);
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

  const applySession = useCallback((session: RestoredSession | null) => {
    accessTokenRef.current = session?.accessToken ?? null;
    expiresAtRef.current = session ? new Date(session.expiresAt).getTime() : 0;
    setUser(session?.user ?? null);
    setStatus(session ? 'authenticated' : 'unauthenticated');
    setSessionError('');
  }, []);

  const markBackendUnavailable = useCallback(() => {
    setStatus('unavailable');
    setSessionError('Không kết nối được backend. Hãy kiểm tra dịch vụ cổng 8080 rồi thử lại.');
  }, []);

  const retrySession = useCallback(async () => {
    setStatus('checking');
    setSessionError('');
    const pending = restoreSession();
    restorePromise = pending;
    try {
      applySession(await pending);
    } catch (error) {
      if (isInvalidSession(error)) applySession(null);
      else markBackendUnavailable();
    } finally {
      if (restorePromise === pending) restorePromise = null;
    }
  }, [applySession, markBackendUnavailable]);

  useEffect(() => {
    let active = true;
    restorePromise ??= restoreSession();
    const pending = restorePromise;
    pending
      .then((session) => { if (active) applySession(session); })
      .catch((error: unknown) => {
        if (!active) return;
        if (isInvalidSession(error)) applySession(null);
        else markBackendUnavailable();
      })
      .finally(() => { if (restorePromise === pending) restorePromise = null; });
    return () => { active = false; };
  }, [applySession, markBackendUnavailable]);

  const refresh = useCallback(async () => {
    if (!refreshPromiseRef.current) {
      refreshPromiseRef.current = restoreSession()
        .then((session) => {
          applySession(session);
          return session.accessToken;
        })
        .catch((error: unknown) => {
          if (isInvalidSession(error)) {
            applySession(null);
            return null;
          }
          markBackendUnavailable();
          throw error;
        })
        .finally(() => { refreshPromiseRef.current = null; });
    }
    return refreshPromiseRef.current;
  }, [applySession, markBackendUnavailable]);

  const login = useCallback(async (input: LoginInput) => {
    const tokens = await loginRequest(input);
    const nextUser = await getCurrentUser(tokens.accessToken);
    restorePromise = null;
    applySession({ accessToken: tokens.accessToken, expiresAt: tokens.expiresAt, user: nextUser });
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

  useEffect(() => {
    if (status !== 'authenticated') return;
    const timer = window.setInterval(() => {
      if (expiresAtRef.current && expiresAtRef.current - Date.now() < 120_000) {
        void refresh().catch(() => undefined);
      }
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [refresh, status]);

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
    () => ({ user, status, sessionError, retrySession, login, logout, request, download }),
    [user, status, sessionError, retrySession, login, logout, request, download],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth phải được dùng bên trong AuthProvider');
  return context;
}
