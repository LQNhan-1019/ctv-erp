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

type CsrfResponse = {
  token?: unknown;
  headerName?: unknown;
};

let csrfToken: string | null = null;
let csrfHeaderName = 'X-XSRF-TOKEN';
let csrfPromise: Promise<string> | null = null;

export async function initializeCsrf() {
  const response = await fetch(`${env.apiBaseUrl}/api/auth/csrf`, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Không khởi tạo được CSRF token');
  const payload = await response.json() as CsrfResponse;
  if (typeof payload.token !== 'string' || !payload.token) {
    throw new Error('Backend không trả về CSRF token hợp lệ');
  }
  csrfToken = payload.token;
  if (typeof payload.headerName === 'string' && payload.headerName) {
    csrfHeaderName = payload.headerName;
  }
  return csrfToken;
}

async function requireCsrfToken() {
  if (!csrfToken) {
    csrfPromise ??= initializeCsrf().finally(() => { csrfPromise = null; });
    await csrfPromise;
  }
  return csrfToken!;
}

async function parseResponse(response: Response) {
  if (response.status === 204) return undefined;
  const contentType = response.headers.get('content-type') ?? '';
  return contentType.includes('application/json') ? response.json() : undefined;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}, csrfRetry = true): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const headers = new Headers(options.headers);
  const isFormData = options.body instanceof FormData;
  const requestBody: BodyInit | undefined = options.body === undefined
    ? undefined
    : isFormData ? options.body as FormData : JSON.stringify(options.body);
  headers.set('Accept', 'application/json');
  if (options.body !== undefined && !isFormData) headers.set('Content-Type', 'application/json');
  if (options.accessToken) headers.set('Authorization', `Bearer ${options.accessToken}`);
  if (MUTATING_METHODS.has(method) && !options.skipCsrf) {
    const token = await requireCsrfToken();
    headers.set(csrfHeaderName, token);
  }

  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...options,
    method,
    headers,
    credentials: 'include',
    cache: 'no-store',
    body: requestBody,
  });
  const payload = await parseResponse(response);
  const errorPayload = (payload ?? {}) as Partial<ApiErrorPayload>;
  if (response.status === 403 && errorPayload.code === 'CSRF_VALIDATION_FAILED'
      && csrfRetry && MUTATING_METHODS.has(method) && !options.skipCsrf) {
    csrfToken = null;
    await initializeCsrf();
    return apiRequest<T>(path, options, false);
  }

  if (!response.ok) {
    throw new ApiClientError({
      status: response.status,
      error: errorPayload.error ?? response.statusText,
      code: errorPayload.code ?? `HTTP_${response.status}`,
      message: errorPayload.message ?? 'Máy chủ không thể xử lý yêu cầu',
      path: errorPayload.path,
      requestId: errorPayload.requestId ?? response.headers.get('X-Request-Id') ?? undefined,
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
