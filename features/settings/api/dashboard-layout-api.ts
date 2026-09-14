import type { AuthorizedRequest } from '@/types/api';
import type { DashboardCode, DashboardLayout, DashboardWidgetLayout } from '../types/dashboard-layout';

export const listDashboardLayouts = (request: AuthorizedRequest) => request<DashboardLayout[]>('/api/dashboard-layouts');
export const getDashboardLayout = (request: AuthorizedRequest, code: DashboardCode) => request<DashboardLayout>(`/api/dashboard-layouts/${code}`);
export const updateDashboardLayout = (request: AuthorizedRequest, code: DashboardCode, widgets: DashboardWidgetLayout[]) => request<DashboardLayout>(`/api/dashboard-layouts/${code}`, { method: 'PUT', body: { widgets } });
