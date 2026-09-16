'use client';

import type { CSSProperties, ReactNode } from 'react';
import type { AuthorizedRequest } from '@/types/api';
import { useApiResource } from '@/lib/api/use-api-resource';
import { getDashboardLayout } from '@/features/settings/api/dashboard-layout-api';
import type { DashboardCode, DashboardLayout, DashboardWidgetLayout } from '@/features/settings/types/dashboard-layout';

export function useDashboardLayout(request: AuthorizedRequest, code: DashboardCode, defaults: DashboardWidgetLayout[]) {
  const fallback: DashboardLayout = { dashboardCode: code, displayName: code, widgets: defaults, updatedAt: '' };
  const resource = useApiResource({ key: `dashboard-layout:${code}`, load: () => getDashboardLayout(request, code) });
  return resource.data ?? fallback;
}

export function layoutStyle(layout: DashboardLayout, widgetKey: string): CSSProperties {
  const index = layout.widgets.findIndex(item => item.widgetKey === widgetKey);
  const widget = layout.widgets[index];
  return { order: index < 0 ? 900 : index + 10, display: widget && !widget.visible ? 'none' : undefined };
}

const widthClass: Record<DashboardWidgetLayout['width'], string> = { FULL: 'col-span-12', TWO_THIRDS: 'col-span-12 xl:col-span-8', HALF: 'col-span-12 xl:col-span-6', THIRD: 'col-span-12 xl:col-span-4' };
export function DashboardCanvas({ layout, blocks }: { layout: DashboardLayout; blocks: Record<string, ReactNode> }) {
  const configured = layout.widgets.filter(item => blocks[item.widgetKey]).map((item, index) => ({ ...item, index }));
  const missing = Object.keys(blocks).filter(key => !layout.widgets.some(item => item.widgetKey === key)).map((widgetKey, index) => ({ widgetKey, visible: true, width: 'FULL' as const, index: configured.length + index }));
  return <div className="dashboard-runtime-grid grid grid-cols-12 gap-4">{[...configured, ...missing].filter(item => item.visible).map(item => <div key={item.widgetKey} className={`dashboard-runtime-widget min-w-0 ${widthClass[item.width]}`} style={{ order: item.index }}>{blocks[item.widgetKey]}</div>)}</div>;
}
