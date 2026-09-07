import type { AuthorizedRequest } from '@/types/api';
import type { NavigationItem } from '../types/navigation';

export function listMyNavigation(request: AuthorizedRequest) {
  return request<NavigationItem[]>('/api/navigation/me');
}
