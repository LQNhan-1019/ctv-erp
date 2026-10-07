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
  DashboardFormula,
  DashboardFormulaInput,
  DashboardFormulaPreview,
  KpiDashboard,
  KpiEntrySheet,
  KpiFormulaRule,
  KpiUnitOption,
  KpiWorkbookImportPreview,
  KpiAdminUnit,
  KpiCatalog,
  KpiMeasurementUnit,
  KpiPeriodConfiguration,
  KpiRewardRate,
} from '../types/performance';
import type { DashboardPeriodType } from '@/components/ui/dashboard-period-picker';

export function getPerformanceDashboard(request: AuthorizedRequest, month: string): Promise<DashboardData>;
export function getPerformanceDashboard(request: AuthorizedRequest, periodType: DashboardPeriodType, period: string): Promise<DashboardData>;
export function getPerformanceDashboard(request: AuthorizedRequest, periodTypeOrMonth: DashboardPeriodType | string, period?: string) {
  const periodType: DashboardPeriodType = period ? periodTypeOrMonth as DashboardPeriodType : 'MONTH';
  const periodValue = period ?? periodTypeOrMonth;
  return request<DashboardData>(`/api/performance/dashboard?periodType=${periodType}&period=${encodeURIComponent(periodValue)}`);
}

export const getDepartmentDashboard = (request: AuthorizedRequest, scope: 'sales' | 'accounting' | 'hr-admin', periodType: DashboardPeriodType, period: string) =>
  request<DashboardData>(`/api/performance/dashboard/${scope}?periodType=${periodType}&period=${encodeURIComponent(period)}`);

export const listPerformanceMetrics = (request: AuthorizedRequest) =>
  request<PerformanceMetric[]>('/api/performance/indicators');

export const createPerformanceMetric = (request: AuthorizedRequest, body: PerformanceMetricInput) =>
  request<PerformanceMetric>('/api/performance/indicators', { method: 'POST', body });

export const updatePerformanceMetric = (request: AuthorizedRequest, id: string, body: PerformanceMetricInput) =>
  request<PerformanceMetric>(`/api/performance/indicators/${id}`, { method: 'PUT', body });

export const deletePerformanceMetric = (request: AuthorizedRequest, id: string) =>
  request<void>(`/api/performance/indicators/${id}`, { method: 'DELETE' });

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

export const getKpiBonusDashboard = (request: AuthorizedRequest, month: string) =>
  request<KpiDashboard>(`/api/performance/kpi/dashboard?month=${encodeURIComponent(month)}`);

export const getKpiTargets = (request: AuthorizedRequest, month: string) =>
  request<KpiDashboard>(`/api/performance/kpi/targets?month=${encodeURIComponent(month)}`);

export const listKpiAdminUnits = (request: AuthorizedRequest) =>
  request<KpiAdminUnit[]>('/api/performance/kpi/admin/units');

export const getKpiPeriod = (request: AuthorizedRequest, unitId: string, month: string) =>
  request<KpiPeriodConfiguration>(`/api/performance/kpi/admin/units/${unitId}/period?month=${encodeURIComponent(month)}`);

export const saveKpiPeriod = (
  request: AuthorizedRequest,
  unitId: string,
  month: string,
  body: { allocatedFund: number; metrics: { code: string; name: string; unitOfMeasure: string; conversionFactor: number; ratePerUnit: number; monthlyTarget: number; orderInUnit: number; active: boolean }[] },
) => request<KpiPeriodConfiguration>(`/api/performance/kpi/admin/units/${unitId}/period?month=${encodeURIComponent(month)}`, { method: 'PUT', body });

export const getKpiCatalog = (request: AuthorizedRequest, includeInactive = false) =>
  request<KpiCatalog>(`/api/performance/kpi/admin/catalog?includeInactive=${includeInactive}`);

export const createKpiMeasurementUnit = (request: AuthorizedRequest, body: Omit<KpiMeasurementUnit, 'id'>) =>
  request<KpiMeasurementUnit>('/api/performance/kpi/admin/catalog/measurement-units', { method: 'POST', body });
export const updateKpiMeasurementUnit = (request: AuthorizedRequest, id: string, body: Omit<KpiMeasurementUnit, 'id'>) =>
  request<KpiMeasurementUnit>(`/api/performance/kpi/admin/catalog/measurement-units/${id}`, { method: 'PUT', body });
export const deleteKpiMeasurementUnit = (request: AuthorizedRequest, id: string) =>
  request<void>(`/api/performance/kpi/admin/catalog/measurement-units/${id}`, { method: 'DELETE' });

export const createKpiRewardRate = (request: AuthorizedRequest, body: Omit<KpiRewardRate, 'id'>) =>
  request<KpiRewardRate>('/api/performance/kpi/admin/catalog/reward-rates', { method: 'POST', body });
export const updateKpiRewardRate = (request: AuthorizedRequest, id: string, body: Omit<KpiRewardRate, 'id'>) =>
  request<KpiRewardRate>(`/api/performance/kpi/admin/catalog/reward-rates/${id}`, { method: 'PUT', body });
export const deleteKpiRewardRate = (request: AuthorizedRequest, id: string) =>
  request<void>(`/api/performance/kpi/admin/catalog/reward-rates/${id}`, { method: 'DELETE' });

export const listKpiEntryUnits = (request: AuthorizedRequest, month: string) =>
  request<KpiUnitOption[]>(`/api/performance/kpi/entry/units?month=${encodeURIComponent(month)}`);

export const getKpiEntrySheet = (request: AuthorizedRequest, unitId: string, month: string) =>
  request<KpiEntrySheet>(`/api/performance/kpi/entry/${unitId}?month=${encodeURIComponent(month)}`);

export const updateKpiEntrySheet = (
  request: AuthorizedRequest,
  unitId: string,
  month: string,
  values: { definitionId: string; day: number; value: number | null }[],
) => request<KpiEntrySheet>(`/api/performance/kpi/entry/${unitId}?month=${encodeURIComponent(month)}`, {
  method: 'PUT', body: { values },
});

export function previewKpiWorkbook(
  request: AuthorizedRequest,
  file: File,
  month: string,
  sheetName?: string,
) {
  const body = new FormData();
  body.append('file', file);
  const params = new URLSearchParams({ month });
  if (sheetName) params.set('sheetName', sheetName);
  return request<KpiWorkbookImportPreview>(`/api/performance/kpi/import/preview?${params}`, { method: 'POST', body });
}

export function importKpiWorkbook(
  request: AuthorizedRequest,
  file: File,
  month: string,
  mode: 'SKIP_EXISTING' | 'OVERWRITE',
  sheetName?: string,
) {
  const body = new FormData();
  body.append('file', file);
  const params = new URLSearchParams({ month, mode });
  if (sheetName) params.set('sheetName', sheetName);
  return request<KpiWorkbookImportPreview>(`/api/performance/kpi/import?${params}`, { method: 'POST', body });
}

export const listKpiFormulaRules = (request: AuthorizedRequest) =>
  request<KpiFormulaRule[]>('/api/performance/formulas/kpi-rules');

export const saveKpiFormulaRule = (
  request: AuthorizedRequest,
  key: string,
  body: Pick<KpiFormulaRule, 'name' | 'description' | 'mode' | 'customExpression' | 'roundingScale' | 'enabled'>,
) => request<KpiFormulaRule>(`/api/performance/formulas/kpi-rules/${encodeURIComponent(key)}`, { method: 'PUT', body });

export const resetKpiFormulaRule = (request: AuthorizedRequest, key: string) =>
  request<KpiFormulaRule>(`/api/performance/formulas/kpi-rules/${encodeURIComponent(key)}/custom`, { method: 'DELETE' });

export const listDashboardFormulas = (request: AuthorizedRequest, month: string) =>
  request<DashboardFormula[]>(`/api/performance/formulas?month=${encodeURIComponent(month)}`);

export const saveDashboardFormula = (
  request: AuthorizedRequest,
  metricId: string,
  body: DashboardFormulaInput,
) => request<DashboardFormula>(`/api/performance/formulas/${metricId}`, { method: 'PUT', body });

export const resetDashboardFormula = (request: AuthorizedRequest, metricId: string) =>
  request<DashboardFormula>(`/api/performance/formulas/${metricId}/custom`, { method: 'DELETE' });

export const previewDashboardFormula = (
  request: AuthorizedRequest,
  body: { metricId: string; expression: string; month: string; roundingScale: number },
) => request<DashboardFormulaPreview>('/api/performance/formulas/preview', { method: 'POST', body });
