import type { AuthorizedRequest } from '@/types/api';
import type { CreateRoleInput, Permission, Role, UpdateRoleInput } from '../types/role';

export function listRoles(request: AuthorizedRequest) {
  return request<Role[]>('/api/security/roles');
}

export function listPermissions(request: AuthorizedRequest) {
  return request<Permission[]>('/api/security/permissions');
}

export function getRolePermissions(request: AuthorizedRequest, roleId: string) {
  return request<Permission[]>('/api/security/roles/' + roleId + '/permissions');
}

export function createRole(request: AuthorizedRequest, input: CreateRoleInput) {
  return request<Role>('/api/security/roles', { method: 'POST', body: input });
}

export function updateRole(request: AuthorizedRequest, roleId: string, input: UpdateRoleInput) {
  return request<Role>('/api/security/roles/' + roleId, { method: 'PUT', body: input });
}

export function deleteRole(request: AuthorizedRequest, roleId: string) {
  return request<void>('/api/security/roles/' + roleId, { method: 'DELETE' });
}

export function replaceRolePermissions(request: AuthorizedRequest, roleId: string, permissionIds: string[]) {
  return request<void>('/api/security/roles/' + roleId + '/permissions', {
    method: 'PUT',
    body: { permissionIds },
  });
}
