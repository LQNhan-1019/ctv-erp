export type DashboardCode = 'EXECUTIVE' | 'SALES' | 'ACCOUNTING' | 'HR_ADMIN';
export type DashboardWidgetWidth = 'FULL' | 'TWO_THIRDS' | 'HALF' | 'THIRD';
export type DashboardWidgetLayout = { widgetKey: string; visible: boolean; width: DashboardWidgetWidth };
export type DashboardLayout = { dashboardCode: DashboardCode; displayName: string; widgets: DashboardWidgetLayout[]; updatedAt: string };
