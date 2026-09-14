'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import type { AuthorizedRequest } from '@/types/api';
import { getDashboardLayout } from '@/features/settings/api/dashboard-layout-api';
import type { DashboardCode, DashboardLayout, DashboardWidgetLayout } from '@/features/settings/types/dashboard-layout';

export function useDashboardLayout(request: AuthorizedRequest, code: DashboardCode, defaults: DashboardWidgetLayout[]) {
  const [layout, setLayout] = useState<DashboardLayout>({ dashboardCode: code, displayName: code, widgets: defaults, updatedAt: '' });
  useEffect(() => { let active = true; getDashboardLayout(request, code).then(value => { if (active) setLayout(value); }).catch(() => undefined); return () => { active = false; }; }, [code, request]);
  return layout;
}

export function layoutStyle(layout: DashboardLayout, widgetKey: string): CSSProperties {
  const index = layout.widgets.findIndex(item => item.widgetKey === widgetKey);
  const widget = layout.widgets[index];
  return { order: index < 0 ? 900 : index + 10, display: widget && !widget.visible ? 'none' : undefined };
}

const widthClass: Record<DashboardWidgetLayout['width'], string> = { FULL: 'full', TWO_THIRDS: 'two-thirds', HALF: 'half', THIRD: 'third' };
export function DashboardCanvas({ layout, blocks }: { layout: DashboardLayout; blocks: Record<string, ReactNode> }) {
  const configured = layout.widgets.filter(item => blocks[item.widgetKey]).map((item, index) => ({ ...item, index }));
  const missing = Object.keys(blocks).filter(key => !layout.widgets.some(item => item.widgetKey === key)).map((widgetKey, index) => ({ widgetKey, visible: true, width: 'FULL' as const, index: configured.length + index }));
  return <div className="dashboard-runtime-grid">{[...configured, ...missing].filter(item => item.visible).map(item => <div key={item.widgetKey} className={`dashboard-runtime-widget ${widthClass[item.width]}`} style={{ order: item.index }}>{blocks[item.widgetKey]}</div>)}</div>;
}
