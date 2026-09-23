import type { AuthorizedRequest } from '@/types/api';
import type {
  DashboardData,
  DataSheet,
  DailyImportPreview,
  Goal,
  GoalInput,
  PerformanceDepartment,
  PerformanceMetric,
  PerformanceMetricInput,
  LeaderKpiDashboard,
} from '../types/performance';

export const getPerformanceDashboard = (request: AuthorizedRequest, month: string) =>
  request<DashboardData>(`/api/performance/dashboard?month=${encodeURIComponent(month)}`);

export const getDepartmentDashboard = (request: AuthorizedRequest, scope: 'sales' | 'accounting' | 'hr-admin', month: string) =>
  request<DashboardData>(`/api/performance/dashboard/${scope}?month=${encodeURIComponent(month)}`);

export const listPerformanceMetrics = (request: AuthorizedRequest) =>
  request<PerformanceMetric[]>('/api/performance/metrics');

export const createPerformanceMetric = (request: AuthorizedRequest, body: PerformanceMetricInput) =>
  request<PerformanceMetric>('/api/performance/metrics', { method: 'POST', body });

export const updatePerformanceMetric = (request: AuthorizedRequest, id: string, body: PerformanceMetricInput) =>
  request<PerformanceMetric>(`/api/performance/metrics/${id}`, { method: 'PUT', body });

export const deletePerformanceMetric = (request: AuthorizedRequest, id: string) =>
  request<void>(`/api/performance/metrics/${id}`, { method: 'DELETE' });

export const listGoals = (request: AuthorizedRequest, month: string) =>
  request<Goal[]>(`/api/performance/goals?month=${encodeURIComponent(month)}`);

export const createGoal = (request: AuthorizedRequest, body: GoalInput) =>
  request<Goal>('/api/performance/goals', { method: 'POST', body });

export const updateGoal = (request: AuthorizedRequest, id: string, body: GoalInput) =>
  request<Goal>(`/api/performance/goals/${id}`, { method: 'PUT', body });

export const deleteGoal = (request: AuthorizedRequest, id: string) =>
  request<void>(`/api/performance/goals/${id}`, { method: 'DELETE' });

export const listInputDepartments = (request: AuthorizedRequest) =>
  request<PerformanceDepartment[]>('/api/performance/input-departments');

export const getDataSheet = (request: AuthorizedRequest, departmentId: string, month: string) =>
  request<DataSheet>(`/api/performance/data-entry/${departmentId}?month=${encodeURIComponent(month)}`);

export const updateDataSheet = (
  request: AuthorizedRequest,
  departmentId: string,
  month: string,
  values: { metricId: string; day: number; value: number | null }[],
) => request<DataSheet>(`/api/performance/data-entry/${departmentId}?month=${encodeURIComponent(month)}`, {
  method: 'PUT', body: { values },
});

export function previewDailyImport(request: AuthorizedRequest, file: File, year: number, month?: string, sheetName?: string) {
  const body = new FormData(); body.append('file', file);
  const params = new URLSearchParams({ year: String(year) });
  if (month) params.set('month', month);
  if (sheetName) params.set('sheetName', sheetName);
  return request<DailyImportPreview>('/api/performance/data-entry/import/preview?' + params, { method: 'POST', body });
}

export function importDailyWorkbook(request: AuthorizedRequest, file: File, year: number, mode: 'SKIP_EXISTING' | 'OVERWRITE', month?: string, sheetName?: string) {
  const body = new FormData(); body.append('file', file);
  const params = new URLSearchParams({ year: String(year), mode });
  if (month) params.set('month', month);
  if (sheetName) params.set('sheetName', sheetName);
  return request<DailyImportPreview>('/api/performance/data-entry/import?' + params, { method: 'POST', body });
}

export const getLeaderKpiResults = (request: AuthorizedRequest, month: string) =>
  request<LeaderKpiDashboard>(`/api/performance/results?month=${encodeURIComponent(month)}`);
