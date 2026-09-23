'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Banknote, CalendarClock, ClipboardCheck, FileWarning, Gauge, ReceiptText, RefreshCw, TrendingUp, TriangleAlert, Truck, UsersRound, WalletCards } from 'lucide-react';
import { useAuth } from '@/features/auth/context/auth-context';
import { useApiResource } from '@/lib/api/use-api-resource';
import { getDepartmentDashboard } from '../api/performance-api';
import type { DashboardData, DashboardMetric, MeasurementUnit } from '../types/performance';
import { ComparisonBars, ComparisonTable, MetricCard, ProgressDonut, TrendChart, type TableColumn } from './dashboard-widgets';
import { DashboardCanvas, useDashboardLayout } from './dashboard-layout-runtime';
import type { DashboardCode, DashboardWidgetLayout } from '@/features/settings/types/dashboard-layout';

type DepartmentDashboardKind = 'sales' | 'accounting' | 'hr-admin';
type Row = { id: string; name: string; primary: number; secondary: number; progress: number | null };
const unitLabels: Record<MeasurementUnit, string> = { MILLION_VND: 'triệu đồng', COUNT: 'SL', CUBIC_METER: 'm³', KM: 'km' };
const definitions: Record<DepartmentDashboardKind, { code: DashboardCode; title: string; eyebrow: string; description: string; defaults: DashboardWidgetLayout[] }> = {
  sales: { code: 'SALES', title: 'Điều hành Kinh doanh', eyebrow: 'PHÒNG KINH DOANH TỔNG HỢP', description: 'Sản lượng, lãi gộp và hiệu suất khu vực, cửa hàng, đội xe.', defaults: ['sales-kpis', 'sales-regions', 'sales-region-chart', 'sales-stores', 'sales-fleet'].map((widgetKey, index) => ({ widgetKey, visible: true, width: index === 0 ? 'FULL' : 'HALF' })) },
  accounting: { code: 'ACCOUNTING', title: 'Tài chính - Kế toán', eyebrow: 'PHÒNG TÀI CHÍNH KẾ TOÁN', description: 'Doanh thu, lợi nhuận, công nợ và tiến độ mục tiêu tài chính.', defaults: [{ widgetKey: 'finance-kpis', visible: true, width: 'FULL' }, { widgetKey: 'finance-trend', visible: true, width: 'TWO_THIRDS' }, { widgetKey: 'finance-goals', visible: true, width: 'THIRD' }] },
  'hr-admin': { code: 'HR_ADMIN', title: 'Hành chính Nhân sự', eyebrow: 'PHÒNG HÀNH CHÍNH NHÂN SỰ', description: 'Năng suất nhân sự và lối tắt tới các nghiệp vụ cần xử lý.', defaults: [{ widgetKey: 'hr-kpis', visible: true, width: 'FULL' }, { widgetKey: 'hr-progress', visible: true, width: 'HALF' }, { widgetKey: 'hr-actions', visible: true, width: 'HALF' }] },
};
function currentMonth() { const value = new Date(); return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`; }
function number(value: number, digits = 1) { return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: digits }).format(value); }
function shown(metric?: DashboardMetric) { if (!metric) return { value: '0', unit: '' }; if (metric.measurementUnit === 'MILLION_VND' && Math.abs(metric.actualValue) >= 1000) return { value: number(metric.actualValue / 1000), unit: 'VND' }; return { value: number(metric.actualValue), unit: unitLabels[metric.measurementUnit] }; }
function Panel({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) { return <section className="department-dashboard-panel"><header><span>{eyebrow}</span><h2>{title}</h2></header>{children}</section>; }
function Progress({ value }: { value: number | null }) { return <div className="department-progress"><span><i style={{ width: `${Math.min(100, Math.max(0, value ?? 0))}%` }}/></span><b>{value == null ? '—' : `${Math.round(value)}%`}</b></div>; }

export default function DepartmentDashboard({ kind }: { kind: DepartmentDashboardKind }) {
  const definition = definitions[kind]; const { request } = useAuth();
  const [month, setMonth] = useState(currentMonth);
  const layout = useDashboardLayout(request, definition.code, definition.defaults);
  const { data, error, loading, refresh } = useApiResource<DashboardData>({ key: `department-dashboard:${kind}:${month}`, load: () => getDepartmentDashboard(request, kind, month) });
  const metrics = useMemo(() => data?.metrics ?? [], [data]);
  const cards = (items: DashboardMetric[]) => <div className="department-kpi-grid">{items.map((metric, index) => { const value = shown(metric); const icons = [WalletCards, TrendingUp, ReceiptText, Gauge]; return <MetricCard key={metric.metricId} label={metric.metricName} value={value.value} unit={value.unit} caption={metric.subjectName} progress={metric.progressPercent} icon={icons[index % icons.length]} tone="department"/>; })}</div>;
  const results = data?.businessResults ?? []; const trend = results.map(item => ({ label: `T${Number(item.month.slice(5))}`, revenue: item.totalRevenue, grossProfit: item.grossProfit, netProfit: item.netProfitAfterTax, target: item.targetCompletionPercent }));
  const average = metrics.filter(item => item.progressPercent != null).reduce((sum, item, _, values) => sum + (item.progressPercent ?? 0) / values.length, 0);
  const blocks = kind === 'sales' ? salesBlocks(metrics, cards) : kind === 'accounting' ? accountingBlocks(metrics, cards, trend) : hrBlocks(metrics, cards, average);
  return <div className={`nova-account-page department-dashboard department-dashboard--${kind} grid gap-4`}><header className="department-dashboard-hero"><div><p>{definition.eyebrow}</p><h1>{definition.title}</h1><span>{definition.description}</span></div><div><label><span>Kỳ báo cáo</span><input type="month" value={month} onChange={event => setMonth(event.target.value)}/></label><button onClick={refresh} disabled={loading}><RefreshCw size={17}/>{loading ? 'Đang tải' : 'Làm mới'}</button></div></header>
    {loading && <div className="performance-state"><span className="nova-session-spinner"/>Đang tải dashboard phòng ban…</div>}{error && <div className="performance-error"><TriangleAlert/>{error}<button onClick={refresh}>Thử lại</button></div>}{!loading && !error && <DashboardCanvas layout={layout} blocks={blocks}/>}</div>;
}

function salesBlocks(metrics: DashboardMetric[], cards: (items: DashboardMetric[]) => React.ReactNode) {
  const subjects = (scope: string) => Array.from(new Map(metrics.filter(item => item.scopeLevel === scope).map(item => [item.subjectCode, item.subjectName])).entries());
  const value = (subject: string, unit: MeasurementUnit) => metrics.find(item => item.subjectCode === subject && item.measurementUnit === unit);
  const regions: Row[] = subjects('REGION').map(([id, name]) => ({ id, name, primary: value(id, 'CUBIC_METER')?.actualValue ?? 0, secondary: value(id, 'MILLION_VND')?.actualValue ?? 0, progress: value(id, 'CUBIC_METER')?.progressPercent ?? null }));
  const stores: Row[] = subjects('STORE').map(([id, name]) => ({ id, name, primary: value(id, 'CUBIC_METER')?.actualValue ?? 0, secondary: value(id, 'MILLION_VND')?.actualValue ?? 0, progress: value(id, 'CUBIC_METER')?.progressPercent ?? null }));
  const columns: TableColumn<Row>[] = [{ key: 'name', label: 'Đơn vị', render: row => <b>{row.name}</b> }, { key: 'primary', label: 'Sản lượng (m³)', align: 'right', render: row => number(row.primary) }, { key: 'secondary', label: 'Lãi gộp (triệu)', align: 'right', render: row => number(row.secondary) }, { key: 'progress', label: 'Kế hoạch', align: 'right', render: row => <Progress value={row.progress}/> }];
  const vehicles = subjects('VEHICLE');
  return {
    'sales-kpis': <Panel eyebrow="CHỈ SỐ TRỌNG YẾU" title="Kết quả kinh doanh trong kỳ">{cards(metrics.filter(item => item.scopeLevel === 'COMPANY').slice(0, 4))}</Panel>,
    'sales-regions': <Panel eyebrow="3 MIỀN" title="Kết quả theo khu vực"><ComparisonTable rows={regions} columns={columns}/></Panel>,
    'sales-region-chart': <Panel eyebrow="SO SÁNH" title="Sản lượng từng khu vực"><ComparisonBars data={regions.map(item => ({ name: item.name.replace('Tây Nguyên & Nam Bộ', 'TN-NB'), value: item.primary }))} unit="m³"/></Panel>,
    'sales-stores': <Panel eyebrow="CỬA HÀNG BÁN LẺ" title="Hiệu suất CHXD"><ComparisonTable rows={stores} columns={columns}/></Panel>,
    'sales-fleet': <Panel eyebrow="ĐỘI XE BỒN" title="Hiệu suất vận tải"><div className="department-fleet">{vehicles.map(([id, name]) => <article key={id}><Truck size={18}/><b>{name}</b><span>{number(value(id, 'COUNT')?.actualValue ?? 0, 0)} chuyến</span><span>{number(value(id, 'KM')?.actualValue ?? 0)} km</span><strong>{number(value(id, 'MILLION_VND')?.actualValue ?? 0)} triệu</strong></article>)}</div></Panel>,
  };
}
function accountingBlocks(metrics: DashboardMetric[], cards: (items: DashboardMetric[]) => React.ReactNode, trend: { label: string; revenue: number; grossProfit: number; netProfit: number; target: number | null }[]) {
  return {
    'finance-kpis': <Panel eyebrow="TỔNG HỢP TÀI CHÍNH" title="Các chỉ số cần theo dõi">{cards(metrics)}</Panel>,
    'finance-trend': <Panel eyebrow="XU HƯỚNG" title="Doanh thu và lợi nhuận"><TrendChart data={trend}/></Panel>,
    'finance-goals': <Panel eyebrow="MỤC TIÊU" title="Tiến độ tài chính"><div className="department-goal-list">{metrics.map(item => <article key={item.metricId}><div><b>{item.metricName}</b><span>{item.objectiveTitle ?? 'Chưa gắn mục tiêu'}</span></div><Progress value={item.progressPercent}/></article>)}</div></Panel>,
  };
}
function hrBlocks(metrics: DashboardMetric[], cards: (items: DashboardMetric[]) => React.ReactNode, average: number) {
  const actions = [{ href: '/hr/employees', label: 'Nhân viên & phòng ban', icon: UsersRound }, { href: '/hr/attendance', label: 'Chấm công', icon: CalendarClock }, { href: '/admin/work-items', label: 'Quản lý công việc', icon: ClipboardCheck }, { href: '/admin/expenses', label: 'Chi phí hành chính', icon: Banknote }, { href: '/admin/documents', label: 'Giấy tờ & thời hạn', icon: FileWarning }];
  return {
    'hr-kpis': <Panel eyebrow="TỔNG QUAN HCNS" title="Năng suất và kết quả trong kỳ">{cards(metrics)}</Panel>,
    'hr-progress': <Panel eyebrow="TIẾN ĐỘ" title="Mức hoàn thành công việc"><div className="department-progress-summary"><ProgressDonut value={Number.isFinite(average) ? average : null} label="Tiến độ bình quân" tone="department"/><div><Gauge/><b>{metrics.length} chỉ số đang theo dõi</b><span>Dữ liệu lấy từ bảng cập nhật công việc hằng ngày.</span></div></div></Panel>,
    'hr-actions': <Panel eyebrow="NGHIỆP VỤ" title="Truy cập nhanh"><div className="department-action-grid">{actions.map(item => <Link key={item.href} href={item.href}><i><item.icon size={18}/></i><span>{item.label}</span></Link>)}</div></Panel>,
  };
}
