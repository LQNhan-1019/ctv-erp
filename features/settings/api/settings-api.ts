import type { AuthorizedRequest } from '@/types/api';
import type { SystemSetting } from '../types/setting';

export function listSystemSettings(request: AuthorizedRequest) {
  return request<SystemSetting[]>('/api/system/settings');
}

export function updateSystemSetting(request: AuthorizedRequest, key: string, value: string) {
  return request<SystemSetting>('/api/system/settings/' + encodeURIComponent(key), {
    method: 'PUT',
    body: { value },
  });
}
