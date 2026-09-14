import type { AuthorizedRequest } from '@/types/api';
import type {
  DashboardData,
  DataSheet,
  Goal,
  GoalInput,
  PerformanceDepartment,
  PerformanceMetric,
} from '../types/performance';

export const getPerformanceDashboard = (request: AuthorizedRequest, month: string) =>
  request<DashboardData>(`/api/performance/dashboard?month=${encodeURIComponent(month)}`);

export const getDepartmentDashboard = (request: AuthorizedRequest, scope: 'sales' | 'accounting' | 'hr-admin', month: string) =>
  request<DashboardData>(`/api/performance/dashboard/${scope}?month=${encodeURIComponent(month)}`);

export const listPerformanceMetrics = (request: AuthorizedRequest) =>
  request<PerformanceMetric[]>('/api/performance/metrics');

export const listGoals = (request: AuthorizedRequest, month: string) =>
  request<Goal[]>(`/api/performance/goals?month=${encodeURIComponent(month)}`);

export const createGoal = (request: AuthorizedRequest, body: GoalInput) =>
  request<Goal>('/api/performance/goals', { method: 'POST', body });

export const updateGoal = (request: AuthorizedRequest, id: string, body: GoalInput) =>
  request<Goal>(`/api/performance/goals/${id}`, { method: 'PUT', body });

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
