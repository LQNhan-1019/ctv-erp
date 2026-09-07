import type { AuthorizedRequest, PageResponse } from '@/types/api';
import type { AuditFilters, AuditLog } from '../types/audit';

export function listAuditLogs(request: AuthorizedRequest, filters: AuditFilters) {
  const params = new URLSearchParams({
    page: String(filters.page),
    size: String(filters.size),
  });
  if (filters.action) params.set('action', filters.action);
  if (filters.entityType) params.set('entityType', filters.entityType);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  return request<PageResponse<AuditLog>>('/api/security/audit-logs?' + params.toString());
}

export function getAuditLog(request: AuthorizedRequest, id: number) {
  return request<AuditLog>('/api/security/audit-logs/' + id);
}
