import { env } from '@/lib/config/env';
import type { ApiErrorPayload } from '@/types/api';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  accessToken?: string | null;
  body?: unknown;
  skipCsrf?: boolean;
};

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;

  constructor(payload: ApiErrorPayload) {
    super(payload.message || 'Không thể xử lý yêu cầu');
    this.name = 'ApiClientError';
    this.status = payload.status;
    this.code = payload.code || 'API_ERROR';
    this.requestId = payload.requestId;
  }
}

function readCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const prefix = `${encodeURIComponent(name)}=`;
  const cookie = document.cookie.split('; ').find((item) => item.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}

export async function initializeCsrf() {
  await fetch(`${env.apiBaseUrl}/api/auth/csrf`, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
}

async function requireCsrfToken() {
  let token = readCookie('XSRF-TOKEN');
  if (!token) {
    await initializeCsrf();
    token = readCookie('XSRF-TOKEN');
  }
  if (!token) {
    throw new ApiClientError({
      status: 403,
      error: 'Forbidden',
      code: 'CSRF_TOKEN_MISSING',
      message: 'Không lấy được CSRF token từ máy chủ',
    });
  }
  return token;
}

async function parseResponse(response: Response) {
  if (response.status === 204) return undefined;
  const contentType = response.headers.get('content-type') ?? '';
  return contentType.includes('application/json') ? response.json() : undefined;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');
  if (options.accessToken) headers.set('Authorization', `Bearer ${options.accessToken}`);
  if (MUTATING_METHODS.has(method) && !options.skipCsrf) {
    headers.set('X-XSRF-TOKEN', await requireCsrfToken());
  }

  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...options,
    method,
    headers,
    credentials: 'include',
    cache: 'no-store',
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const payload = await parseResponse(response);

  if (!response.ok) {
    const error = (payload ?? {}) as Partial<ApiErrorPayload>;
    throw new ApiClientError({
      status: response.status,
      error: error.error ?? response.statusText,
      code: error.code ?? `HTTP_${response.status}`,
      message: error.message ?? 'Máy chủ không thể xử lý yêu cầu',
      path: error.path,
      requestId: error.requestId ?? response.headers.get('X-Request-Id') ?? undefined,
    });
  }
  return payload as T;
}

export async function apiDownload(path: string, accessToken: string): Promise<Blob> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
    headers: {
      Accept: 'application/octet-stream',
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) {
    const contentType = response.headers.get('content-type') ?? '';
    const payload = contentType.includes('application/json')
      ? await response.json() as Partial<ApiErrorPayload>
      : {};
    throw new ApiClientError({
      status: response.status,
      error: payload.error ?? response.statusText,
      code: payload.code ?? `HTTP_${response.status}`,
      message: payload.message ?? 'Không thể tải file từ máy chủ',
      path: payload.path,
      requestId: payload.requestId ?? response.headers.get('X-Request-Id') ?? undefined,
    });
  }
  return response.blob();
}
