'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Eye, EyeOff, GripVertical, LayoutDashboard, RotateCcw, Save } from 'lucide-react';
import type { AuthorizedRequest } from '@/types/api';
import { listDashboardLayouts, updateDashboardLayout } from '../api/dashboard-layout-api';
import type { DashboardCode, DashboardLayout, DashboardWidgetLayout, DashboardWidgetWidth } from '../types/dashboard-layout';

const dashboardNames: Record<DashboardCode, string> = { EXECUTIVE: 'Tổng quan công ty', SALES: 'Kinh doanh', ACCOUNTING: 'Tài chính - Kế toán', HR_ADMIN: 'Hành chính Nhân sự' };
const widgetNames: Record<string, string> = {
  'company-overview': 'Kết quả toàn công ty', 'finance-summary': 'Tóm tắt Tài chính', 'sales-summary': 'Tóm tắt Kinh doanh', 'people-summary': 'HCNS & Trợ lý',
  'sales-kpis': 'KPI kinh doanh', 'sales-regions': 'Bảng theo khu vực', 'sales-region-chart': 'Biểu đồ khu vực', 'sales-stores': 'Kết quả cửa hàng', 'sales-fleet': 'Hiệu suất đội xe',
  'finance-kpis': 'KPI tài chính', 'finance-trend': 'Xu hướng doanh thu & lợi nhuận', 'finance-goals': 'Tiến độ mục tiêu tài chính',
  'hr-kpis': 'KPI nhân sự', 'hr-progress': 'Tiến độ công việc', 'hr-actions': 'Truy cập nghiệp vụ HCNS',
};
const widthNames: Record<DashboardWidgetWidth, string> = { FULL: 'Toàn chiều rộng', TWO_THIRDS: '2/3 chiều rộng', HALF: '1/2 chiều rộng', THIRD: '1/3 chiều rộng' };
const defaults: Record<DashboardCode, DashboardWidgetLayout[]> = {
  EXECUTIVE: ['company-overview', 'finance-summary', 'sales-summary', 'people-summary'].map(widgetKey => ({ widgetKey, visible: true, width: 'FULL' })),
  SALES: [{ widgetKey: 'sales-kpis', visible: true, width: 'FULL' }, { widgetKey: 'sales-regions', visible: true, width: 'TWO_THIRDS' }, { widgetKey: 'sales-region-chart', visible: true, width: 'THIRD' }, { widgetKey: 'sales-stores', visible: true, width: 'HALF' }, { widgetKey: 'sales-fleet', visible: true, width: 'HALF' }],
  ACCOUNTING: [{ widgetKey: 'finance-kpis', visible: true, width: 'FULL' }, { widgetKey: 'finance-trend', visible: true, width: 'TWO_THIRDS' }, { widgetKey: 'finance-goals', visible: true, width: 'THIRD' }],
  HR_ADMIN: [{ widgetKey: 'hr-kpis', visible: true, width: 'FULL' }, { widgetKey: 'hr-progress', visible: true, width: 'HALF' }, { widgetKey: 'hr-actions', visible: true, width: 'HALF' }],
};

function SortableWidget({ widget, disabled, change }: { widget: DashboardWidgetLayout; disabled: boolean; change: (value: DashboardWidgetLayout) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widget.widgetKey, disabled });
  return <article ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`dashboard-layout-row ${isDragging ? 'dragging' : ''} ${widget.visible ? '' : 'hidden-widget'}`}>
    <button type="button" className="dashboard-drag-handle" disabled={disabled} aria-label={`Kéo ${widgetNames[widget.widgetKey]}`} {...attributes} {...listeners}><GripVertical size={18}/></button>
    <span className="dashboard-widget-icon"><LayoutDashboard size={17}/></span><div><b>{widgetNames[widget.widgetKey] ?? widget.widgetKey}</b><small>{widget.widgetKey}</small></div>
    <select value={widget.width} disabled={disabled || !widget.visible} onChange={event => change({ ...widget, width: event.target.value as DashboardWidgetWidth })}>{Object.entries(widthNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
    <button type="button" className="dashboard-visibility" disabled={disabled} onClick={() => change({ ...widget, visible: !widget.visible })}>{widget.visible ? <Eye size={17}/> : <EyeOff size={17}/>}<span>{widget.visible ? 'Đang hiện' : 'Đang ẩn'}</span></button>
  </article>;
}

export default function DashboardLayoutEditor({ request, canManage }: { request: AuthorizedRequest; canManage: boolean }) {
  const [layouts, setLayouts] = useState<DashboardLayout[]>([]);
  const [active, setActive] = useState<DashboardCode>('EXECUTIVE');
  const [widgets, setWidgets] = useState<DashboardWidgetLayout[]>(defaults.EXECUTIVE);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [message, setMessage] = useState('');
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const load = useCallback(async () => { setLoading(true); try { const values = await listDashboardLayouts(request); setLayouts(values); const selected = values.find(item => item.dashboardCode === active); if (selected) setWidgets(selected.widgets); } finally { setLoading(false); } }, [active, request]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  const selected = useMemo(() => layouts.find(item => item.dashboardCode === active), [active, layouts]);
  function choose(code: DashboardCode) { setActive(code); const value = layouts.find(item => item.dashboardCode === code); setWidgets(value?.widgets ?? defaults[code]); setMessage(''); }
  function change(value: DashboardWidgetLayout) { setWidgets(current => current.map(item => item.widgetKey === value.widgetKey ? value : item)); }
  function drag(event: DragEndEvent) { if (!event.over || event.active.id === event.over.id) return; setWidgets(current => arrayMove(current, current.findIndex(item => item.widgetKey === event.active.id), current.findIndex(item => item.widgetKey === event.over?.id))); }
  async function save() { setSaving(true); setMessage(''); try { const value = await updateDashboardLayout(request, active, widgets); setLayouts(current => current.map(item => item.dashboardCode === active ? value : item)); setWidgets(value.widgets); setMessage('Đã lưu bố cục. Dashboard sẽ áp dụng ở lần tải tiếp theo.'); } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Không lưu được bố cục'); } finally { setSaving(false); } }
  return <div className="dashboard-layout-editor"><aside>{(Object.keys(dashboardNames) as DashboardCode[]).map(code => <button key={code} className={active === code ? 'active' : ''} onClick={() => choose(code)}><LayoutDashboard size={18}/><span><b>{dashboardNames[code]}</b><small>{layouts.find(item => item.dashboardCode === code)?.widgets.filter(item => item.visible).length ?? defaults[code].length} khối hiển thị</small></span></button>)}</aside>
    <section><header><div><p>TRÌNH THIẾT KẾ DASHBOARD</p><h3>{selected?.displayName ?? dashboardNames[active]}</h3><span>Kéo tay nắm để đổi thứ tự, chọn độ rộng hoặc ẩn những khối không cần thiết.</span></div><div><button className="nova-button secondary" disabled={!canManage || saving} onClick={() => setWidgets(defaults[active].map(item => ({ ...item })))}><RotateCcw size={15}/>Mặc định</button><button className="nova-button primary" disabled={!canManage || saving || !widgets.some(item => item.visible)} onClick={() => void save()}><Save size={15}/>{saving ? 'Đang lưu…' : 'Lưu bố cục'}</button></div></header>
      {loading ? <div className="nova-inline-loading"><span className="nova-session-spinner"/>Đang tải bố cục…</div> : <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={drag}><SortableContext items={widgets.map(item => item.widgetKey)} strategy={verticalListSortingStrategy}><div className="dashboard-layout-list">{widgets.map(widget => <SortableWidget key={widget.widgetKey} widget={widget} disabled={!canManage} change={change}/>)}</div></SortableContext></DndContext>}
      {message && <div className="dashboard-layout-message">{message}</div>}
    </section>
  </div>;
}
