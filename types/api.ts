export type ApiErrorPayload = {
  timestamp?: string;
  status: number;
  error: string;
  code: string;
  message: string;
  path?: string;
  requestId?: string;
};

export type PageResponse<T> = {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
};

export type AuthorizedRequest = <T>(
  path: string,
  options?: import('@/lib/api/client').ApiRequestOptions,
) => Promise<T>;
