export type MeasurementUnit = 'MILLION_VND' | 'COUNT' | 'CUBIC_METER' | 'KM';
export type GoalFramework = 'KPI' | 'OKR' | 'BSC' | 'MBO';
export type GoalStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED';

export type PerformanceMetric = {
  id: string;
  code: string;
  name: string;
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  scopeLevel: 'COMPANY' | 'REGION' | 'VEHICLE' | 'STORE';
  subjectCode: string;
  subjectName: string;
  measurementUnit: MeasurementUnit;
  aggregationMethod: 'SUM' | 'LAST';
  targetDirection: 'AT_LEAST' | 'AT_MOST';
  sortOrder: number;
};

export type Goal = {
  id: string;
  metricId: string;
  metricCode: string;
  metricName: string;
  departmentCode: string;
  departmentName: string;
  subjectCode: string;
  subjectName: string;
  measurementUnit: MeasurementUnit;
  targetDirection: 'AT_LEAST' | 'AT_MOST';
  framework: GoalFramework;
  objectiveTitle: string;
  periodStart: string;
  periodEnd: string;
  targetValue: number;
  actualValue: number;
  progressPercent: number;
  weightPercent: number;
  status: GoalStatus;
};

export type GoalInput = {
  metricId: string;
  framework: GoalFramework;
  objectiveTitle: string;
  month: string;
  targetValue: number;
  weightPercent: number;
  status: GoalStatus;
};

export type DashboardMetric = {
  metricId: string;
  metricCode: string;
  metricName: string;
  departmentCode: string;
  departmentName: string;
  scopeLevel: 'COMPANY' | 'REGION' | 'VEHICLE' | 'STORE';
  subjectCode: string;
  subjectName: string;
  measurementUnit: MeasurementUnit;
  aggregationMethod: 'SUM' | 'LAST';
  targetDirection: 'AT_LEAST' | 'AT_MOST';
  framework: GoalFramework | null;
  objectiveTitle: string | null;
  targetValue: number | null;
  actualValue: number;
  progressPercent: number | null;
};

export type BusinessResult = {
  month: string;
  totalRevenue: number;
  netProfitAfterTax: number;
  grossProfit: number;
  targetCompletionPercent: number | null;
};
export type DashboardData = {
  month: string;
  generatedAt: string;
  metrics: DashboardMetric[];
  businessResults: BusinessResult[];
};
export type PerformanceDepartment = { id: string; code: string; name: string };
export type DataSheetRow = {
  metricId: string;
  metricCode: string;
  metricName: string;
  scopeLevel: string;
  subjectCode: string;
  subjectName: string;
  measurementUnit: MeasurementUnit;
  aggregationMethod: 'SUM' | 'LAST';
  dailyValues: Record<string, number>;
};
export type DataSheet = {
  month: string;
  daysInMonth: number;
  department: PerformanceDepartment;
  rows: DataSheetRow[];
};
