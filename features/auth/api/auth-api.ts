import { apiRequest } from '@/lib/api/client';
import type { AccessTokenResponse, AuthUser, LoginInput } from '../types/auth';

export function login(input: LoginInput) {
  return apiRequest<AccessTokenResponse>('/api/auth/login', {
    method: 'POST',
    body: input,
    skipCsrf: true,
  });
}

export function refreshAccessToken() {
  return apiRequest<AccessTokenResponse>('/api/auth/refresh', { method: 'POST' });
}

export function getCurrentUser(accessToken: string) {
  return apiRequest<AuthUser>('/api/auth/me', { accessToken });
}

export function logout(accessToken?: string | null) {
  return apiRequest<void>('/api/auth/logout', { method: 'POST', accessToken });
}
