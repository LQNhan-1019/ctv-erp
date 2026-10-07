'use client';

import { BadgeDollarSign, Building2, CircleAlert, Gauge, RefreshCw, Target, TriangleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import DashboardPeriodPicker from '@/components/ui/dashboard-period-picker';
import { useAuth } from '@/features/auth/context/auth-context';
import { useApiResource } from '@/lib/api/use-api-resource';
import { getKpiBonusDashboard } from '../api/performance-api';
import type { KpiDashboard, KpiMetricResult, KpiUnitResult } from '../types/performance';
import {
  AlertList, ComparisonTable, DashboardSection, MetricCard, ProgressDonut,
  type DashboardAlert, type DashboardTone, type TableColumn,
} from './dashboard-widgets';
import { layoutStyle, useDashboardLayout } from './dashboard-layout-runtime';
import type { DashboardWidgetLayout } from '@/features/settings/types/dashboard-layout';

type UnitRow = { id: string; name: string; metrics: KpiMetricResult[]; progress: number };

const executiveLayoutDefaults: DashboardWidgetLayout[] = [
  'company-overview', 'finance-summary', 'sales-summary', 'people-summary',
].map((widgetKey) => ({ widgetKey, visible: true, width: 'FULL' }));

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function number(value: number, digits = 2) {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: digits }).format(value);
}

function money(value: number) {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000_000) return `${number(value / 1_000_000_000)} tỷ`;
  if (absolute >= 1_000_000) return `${number(value / 1_000_000)} triệu`;
  return `${number(value, 0)} đ`;
}

function averageProgress(unit: KpiUnitResult) {
  return unit.metrics.length
    ? unit.metrics.reduce((sum, metric) => sum + metric.completionPercent, 0) / unit.metrics.length
    : 0;
}

function Metric({ metric, tone = 'blue' }: { metric: KpiMetricResult; tone?: DashboardTone }) {
  return <MetricCard
    label={metric.name}
    value={number(metric.mtd, 6)}
    unit={metric.unitOfMeasure}
    caption={`MP ${number(metric.monthlyTarget, 6)} · MTG ${number(metric.targetGap, 6)}`}
    progress={metric.completionPercent}
    icon={Target}
    tone={tone}
  />;
}

function UnitMetrics({ unit, tone }: { unit: KpiUnitResult; tone: DashboardTone }) {
  return <div className="executive-department-metrics">
    {unit.metrics.map((metric) => <Metric key={metric.definitionId} metric={metric} tone={tone}/>)}
    <MetricCard label="Thành tiền" value={money(unit.actualFund)} caption={`Quỹ phân bổ ${money(unit.allocatedFund)}`} progress={unit.fundCompletionPercent} icon={BadgeDollarSign} tone="amber"/>
  </div>;
}

function OperationsTable({ units, title }: { units: KpiUnitResult[]; title: string }) {
  const rows: UnitRow[] = units.map((unit) => ({ id: unit.id, name: unit.name, metrics: unit.metrics, progress: averageProgress(unit) }));
  const labels = units[0]?.metrics ?? [];
  const columns: TableColumn<UnitRow>[] = [
    { key: 'name', label: title, render: (row) => <b className="executive-row-name"><i/>{row.name}</b> },
    ...[0, 1, 2].map((index): TableColumn<UnitRow> => ({
      key: `metric-${index}`, label: labels[index]?.name ?? `Chỉ tiêu ${index + 1}`, align: 'right',
      render: (row) => row.metrics[index] ? <span title={`MP ${number(row.metrics[index].monthlyTarget, 6)}`}>{number(row.metrics[index].mtd, 6)} <small>{row.metrics[index].unitOfMeasure}</small></span> : '—',
    })),
    { key: 'progress', label: 'TL% bình quân', align: 'right', render: (row) => <b>{number(row.progress)}%</b> },
  ];
  return <ComparisonTable columns={columns} rows={rows}/>;
}

export default function PerformanceDashboard() {
  const { request } = useAuth();
  const dashboardLayout = useDashboardLayout(request, 'EXECUTIVE', executiveLayoutDefaults);
  const [month, setMonth] = useState(currentMonth);
  const { data, error, loading, refresh } = useApiResource<KpiDashboard>({
    key: `executive-kpi-dashboard:${month}`,
    load: () => getKpiBonusDashboard(request, month),
  });

  const units = useMemo(() => data?.units ?? [], [data]);
  const board = units.find((unit) => unit.code === 'BOARD') ?? units.find((unit) => unit.type === 'DEPARTMENT');
  const departments = units.filter((unit) => unit.type === 'DEPARTMENT' && unit.id !== board?.id);
  const regions = units.filter((unit) => unit.type === 'REGION');
  const vehicles = units.filter((unit) => unit.type === 'VEHICLE');
  const stations = units.filter((unit) => unit.type === 'STATION');
  const allMetrics = units.flatMap((unit) => unit.metrics.map((metric) => ({ unit, metric })));
  const alerts: DashboardAlert[] = allMetrics.filter(({ metric }) => metric.completionPercent < 85)
    .sort((a, b) => a.metric.completionPercent - b.metric.completionPercent).slice(0, 6)
    .map(({ unit, metric }) => ({
      id: metric.definitionId,
      severity: metric.completionPercent < 60 ? 'danger' : 'warning',
      title: `${unit.name} · ${metric.name}`,
      detail: `MTD ${number(metric.mtd, 6)} / MP ${number(metric.monthlyTarget, 6)}`,
      meta: `${number(metric.completionPercent)}% · ${metric.unitOfMeasure}`,
    }));
  if (!alerts.length && units.length) alerts.push({ id: 'healthy', severity: 'success', title: 'Các KPI đang đúng tiến độ', detail: 'Không có chỉ tiêu nào dưới 85% MP.' });

  return <div className="nova-account-page executive-page">
    <header className="executive-header"><div><p className="nova-eyebrow">CTV · EXECUTIVE KPI DASHBOARD</p><h1>Tổng quan điều hành</h1><span>MTD của từng phòng ban được đối chiếu MP realtime từ cùng nguồn nhập KPI hằng ngày.</span></div><div className="executive-controls"><DashboardPeriodPicker type="MONTH" value={month} allowedTypes={['MONTH']} onChange={(_, value) => setMonth(value)}/><button className="executive-refresh" type="button" onClick={refresh} disabled={loading}><RefreshCw size={17} className={loading ? 'spinning' : ''}/><span>Làm mới dữ liệu<small>{data?.dataThrough ?? 'Chưa có kỳ dữ liệu'}</small></span></button></div></header>

    <nav className="executive-jump"><span>Xem nhanh</span><a href="#company">Toàn công ty</a><a href="#departments">Phòng ban</a><a href="#regions">Khu vực</a><a href="#vehicles">Xe bồn</a><a href="#stations">CHXD</a></nav>
    {loading && <div className="performance-state"><span className="nova-session-spinner"/>Đang tính MTD, MP và tiền thưởng…</div>}
    {error && <div className="performance-error"><TriangleAlert/>{error}<button className="nova-button secondary" onClick={refresh}>Thử lại</button></div>}

    {!loading && !error && !units.length && <div className="performance-empty"><CircleAlert/><h2>Chưa có cấu hình KPI cho tháng này</h2><p>Hãy sao chép cấu hình tháng hoặc import file KPI chuẩn.</p></div>}
    {!loading && !error && !!units.length && <>
      <DashboardSection id="company" eyebrow="KẾT QUẢ TOÀN CÔNG TY" title="MTD so với MP" description={`${allMetrics.length} chỉ tiêu · dữ liệu đến ${data?.dataThrough ?? '—'} · mọi kết quả được tính khi truy vấn`} tone="blue" style={layoutStyle(dashboardLayout, 'company-overview')}>
        {board && <UnitMetrics unit={board} tone="blue"/>}
        <div className="executive-overview-row"><article className="executive-widget wide"><header><div><span>TIẾN ĐỘ PHÒNG BAN</span><h3>So sánh tỷ lệ hoàn thành KPI</h3></div><b>{departments.length} phòng ban</b></header><div className="kpi-executive-department-list">{departments.map((unit) => <article key={unit.id}><div><Building2/><span><b>{unit.name}</b><small>{unit.metrics.map((metric) => `${number(metric.mtd, 3)}/${number(metric.monthlyTarget, 3)} ${metric.unitOfMeasure}`).join(' · ')}</small></span></div><ProgressDonut value={averageProgress(unit)} label="TL% bình quân" detail={`Thành tiền ${money(unit.actualFund)}`} tone="green"/></article>)}</div></article><article className="executive-widget alerts"><header><div><span>CẢNH BÁO KPI</span><h3>Chỉ tiêu cần theo dõi</h3></div><b>{alerts.filter((item) => item.severity !== 'success').length}</b></header><AlertList items={alerts}/></article></div>
      </DashboardSection>

      <DashboardSection id="departments" eyebrow="PHÒNG BAN" title="Kết quả theo đơn vị phụ trách" description="Mỗi ô hiển thị MTD, MP, MTG và tỷ lệ hoàn thành từ dữ liệu nhập hằng ngày." action={{ label: 'Quản lý mục tiêu', href: '/performance/goals' }} tone="green" style={layoutStyle(dashboardLayout, 'finance-summary')}>
        <div className="kpi-executive-unit-sections">{departments.map((unit, index) => <article key={unit.id}><header><div><span>PHÒNG BAN</span><h3>{unit.name}</h3></div><b>{number(averageProgress(unit))}%</b></header><UnitMetrics unit={unit} tone={(index % 2 ? 'violet' : 'green') as DashboardTone}/></article>)}</div>
      </DashboardSection>

      {!!regions.length && <DashboardSection id="regions" eyebrow="KINH DOANH THEO KHU VỰC" title="MTD của ba miền" tone="violet" style={layoutStyle(dashboardLayout, 'sales-summary')}><article className="executive-widget"><OperationsTable units={regions} title="Khu vực"/></article></DashboardSection>}
      {!!vehicles.length && <DashboardSection id="vehicles" eyebrow="ĐỘI XE BỒN" title="Hiệu suất vận tải" tone="amber"><article className="executive-widget"><OperationsTable units={vehicles} title="Phương tiện"/></article></DashboardSection>}
      {!!stations.length && <DashboardSection id="stations" eyebrow="CỬA HÀNG XĂNG DẦU" title="Kết quả CHXD" tone="cyan" style={layoutStyle(dashboardLayout, 'people-summary')}><article className="executive-widget"><OperationsTable units={stations} title="Cửa hàng"/></article></DashboardSection>}

      <footer className="executive-footer"><Gauge size={17}/><span>Nguồn duy nhất: cấu hình KPI tháng và số liệu thực tế theo ngày.</span><b>Quỹ thực tế {money(data?.totalActualFund ?? 0)} / {money(data?.totalAllocatedFund ?? 0)}</b></footer>
    </>}
  </div>;
}
