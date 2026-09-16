import type { ApiRequestOptions } from '@/lib/api/client';
import type { PageResponse } from '@/types/api';
import type { CreateAccountInput, Role, UserAccount, UserRoleAssignment, UserStatus } from '../types/account';

export type AuthorizedRequest = <T>(path: string, options?: ApiRequestOptions) => Promise<T>;

export function listAccounts(request: AuthorizedRequest) {
  return request<PageResponse<UserAccount>>('/api/security/users?page=0&size=100');
}

export function createAccount(request: AuthorizedRequest, input: CreateAccountInput) {
  return request<UserAccount>('/api/security/users', { method: 'POST', body: input });
}

export function updateAccountStatus(request: AuthorizedRequest, userId: string, status: UserStatus) {
  return request<UserAccount>(`/api/security/users/${userId}/status`, { method: 'PATCH', body: { status } });
}

export function resetAccountPassword(request: AuthorizedRequest, userId: string, newPassword: string) {
  return request<void>(`/api/security/users/${userId}/password`, { method: 'PUT', body: { newPassword } });
}

export function listRoles(request: AuthorizedRequest) {
  return request<Role[]>('/api/security/roles');
}

export function listAccountRoles(request: AuthorizedRequest, userId: string) {
  return request<UserRoleAssignment[]>(`/api/security/users/${userId}/roles`);
}

export function assignAccountRole(
  request: AuthorizedRequest,
  userId: string,
  roleId: string,
  scopeType: 'GLOBAL' | 'DEPARTMENT' = 'GLOBAL',
  scopeId: string | null = null,
) {
  return request<UserRoleAssignment>(`/api/security/users/${userId}/roles`, {
    method: 'POST',
    body: { roleId, scopeType, scopeId, startsAt: null, expiresAt: null },
  });
}

export function assignGlobalRole(request: AuthorizedRequest, userId: string, roleId: string) {
  return assignAccountRole(request, userId, roleId);
}

export function removeAccountRole(request: AuthorizedRequest, userId: string, assignmentId: string) {
  return request<void>(`/api/security/users/${userId}/roles/${assignmentId}`, { method: 'DELETE' });
}
