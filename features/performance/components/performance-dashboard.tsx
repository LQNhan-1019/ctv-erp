'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BadgeDollarSign, BriefcaseBusiness, CircleDollarSign, ClipboardCheck,
  Droplets, Gauge, Landmark, RefreshCw, ShoppingCart, Store, TrendingUp, Truck,
  UsersRound, WalletCards,
} from 'lucide-react';
import Icon from '@/components/ui/icon';
import { useAuth } from '@/features/auth/context/auth-context';
import { getPerformanceDashboard } from '../api/performance-api';
import type { DashboardData, DashboardMetric, MeasurementUnit } from '../types/performance';
import {
  AlertList, ComparisonBars, ComparisonTable, DashboardSection, MetricCard,
  ProgressDonut, TrendChart, type DashboardAlert, type DashboardTone, type TableColumn,
} from './dashboard-widgets';
import { layoutStyle, useDashboardLayout } from './dashboard-layout-runtime';
import type { DashboardWidgetLayout } from '@/features/settings/types/dashboard-layout';

type RegionRow = { id: string; name: string; volume: number; profit: number; transactions: number; progress: number | null };
type StoreRow = { id: string; name: string; volume: number; profit: number; progress: number | null };
type FleetRow = { id: string; name: string; trips: number; km: number; revenue: number; progress: number | null };

const unitLabels: Record<MeasurementUnit, string> = { MILLION_VND: 'triệu đồng', COUNT: 'SL', CUBIC_METER: 'm³', KM: 'km' };
const departmentInfo: Record<string, { eyebrow: string; title: string; tone: DashboardTone }> = {
  'CTV-TCKT': { eyebrow: 'P. TÀI CHÍNH KẾ TOÁN', title: 'Dòng tiền, lợi nhuận và công nợ', tone: 'blue' },
  'CTV-HCNS': { eyebrow: 'P. HÀNH CHÍNH NHÂN SỰ', title: 'Năng suất và kết quả công việc', tone: 'green' },
  'CTV-TLTK': { eyebrow: 'TỔ TRỢ LÝ / THƯ KÝ', title: 'Hoạt động giao dịch cửa hàng', tone: 'violet' },
};
const executiveLayoutDefaults: DashboardWidgetLayout[] = ['company-overview', 'finance-summary', 'sales-summary', 'people-summary'].map(widgetKey => ({ widgetKey, visible: true, width: 'FULL' }));

function currentMonth() { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; }
function monthLabel(value: string) { const [year, month] = value.split('-'); return `T${Number(month)}/${year.slice(-2)}`; }
function number(value: number, digits = 1) { return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: digits }).format(value); }
function displayValue(value: number, unit: MeasurementUnit) {
  if (unit === 'MILLION_VND' && Math.abs(value) >= 1_000) return { value: number(value / 1_000), unit: 'tỷ VND' };
  return { value: number(value), unit: unitLabels[unit] };
}
function change(current: number, previous?: number) { return previous ? (current - previous) / Math.abs(previous) * 100 : null; }
function formatDateTime(value?: string) { if (!value) return 'Chưa xác định'; return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)); }

function ProgressCell({ value }: { value: number | null }) {
  return value == null ? <span className="executive-no-target">Chưa giao</span> : <div className="executive-progress-cell"><b>{Math.round(value)}%</b><span><i style={{ width: `${Math.min(100, Math.max(0, value))}%` }}/></span></div>;
}

export default function PerformanceDashboard() {
  const { request } = useAuth();
  const dashboardLayout = useDashboardLayout(request, 'EXECUTIVE', executiveLayoutDefaults);
  const [month, setMonth] = useState(currentMonth);
  const [compareMonth, setCompareMonth] = useState('');
  const [region, setRegion] = useState('');
  const [reload, setReload] = useState(0);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getPerformanceDashboard(request, month).then(value => {
      if (!active) return;
      setData(value);
      setCompareMonth(current => value.businessResults.some(item => item.month === current) ? current : value.businessResults.filter(item => item.month !== month).at(-1)?.month ?? '');
    }).catch((reason: Error) => { if (active) setError(reason.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [month, reload, request]);
  function refreshDashboard() { setLoading(true); setError(''); setReload(value => value + 1); }

  const metrics = useMemo(() => data?.metrics ?? [], [data]);
  const results = data?.businessResults ?? [];
  const selectedResult = results.find(item => item.month === month) ?? results.at(-1);
  const comparisonResult = results.find(item => item.month === compareMonth);
  const find = (code: string) => metrics.find(item => item.metricCode === code);
  const subjects = (scope: DashboardMetric['scopeLevel']) => Array.from(new Map(metrics.filter(item => item.scopeLevel === scope).map(item => [item.subjectCode, item.subjectName])).entries());
  const bySubject = (subjectCode: string, unit: MeasurementUnit) => metrics.find(item => item.subjectCode === subjectCode && item.measurementUnit === unit);
  const regions = subjects('REGION');
  const selectedRegions = region ? regions.filter(([code]) => code === region) : regions;
  const regionRows: RegionRow[] = selectedRegions.map(([id, name]) => ({ id, name, volume: bySubject(id, 'CUBIC_METER')?.actualValue ?? 0, profit: bySubject(id, 'MILLION_VND')?.actualValue ?? 0, transactions: bySubject(id, 'COUNT')?.actualValue ?? 0, progress: bySubject(id, 'CUBIC_METER')?.progressPercent ?? null }));
  const storeRows: StoreRow[] = subjects('STORE').map(([id, name]) => ({ id, name, volume: bySubject(id, 'CUBIC_METER')?.actualValue ?? 0, profit: bySubject(id, 'MILLION_VND')?.actualValue ?? 0, progress: bySubject(id, 'CUBIC_METER')?.progressPercent ?? null }));
  const fleetRows: FleetRow[] = subjects('VEHICLE').map(([id, name]) => ({ id, name, trips: bySubject(id, 'COUNT')?.actualValue ?? 0, km: bySubject(id, 'KM')?.actualValue ?? 0, revenue: bySubject(id, 'MILLION_VND')?.actualValue ?? 0, progress: bySubject(id, 'COUNT')?.progressPercent ?? null }));
  const targetMetrics = metrics.filter(item => item.targetValue != null && item.progressPercent != null);
  const averageProgress = targetMetrics.length ? targetMetrics.reduce((sum, item) => sum + (item.progressPercent ?? 0), 0) / targetMetrics.length : null;
  const activeStores = storeRows.filter(item => item.volume > 0).length;
  const volumeMetric = find('SALES_COMPANY_VOLUME');
  const revenueMetric = find('FIN_COMPANY_REVENUE');
  const grossMetric = find('FIN_COMPANY_GROSS_PROFIT');
  const overdueMetric = find('FIN_OVERDUE_CUSTOMERS');

  const alerts: DashboardAlert[] = metrics.filter(item => item.targetValue != null && (item.progressPercent ?? 100) < 85).sort((a, b) => (a.progressPercent ?? 0) - (b.progressPercent ?? 0)).slice(0, 5).map(item => ({
    id: item.metricId, severity: (item.progressPercent ?? 0) < 60 ? 'danger' : 'warning', title: `${item.subjectName} · ${item.metricName}`, detail: `Mới đạt ${Math.round(item.progressPercent ?? 0)}% mục tiêu kỳ báo cáo`, meta: item.departmentName,
  }));
  if (!alerts.length) alerts.push({ id: 'healthy', severity: 'success', title: 'Không có chỉ số cảnh báo', detail: 'Các mục tiêu có dữ liệu đều đang đạt từ 85% trở lên.' });

  const regionColumns: TableColumn<RegionRow>[] = [
    { key: 'name', label: 'Khu vực', render: row => <b className="executive-row-name"><i/>{row.name}</b> },
    { key: 'volume', label: 'Sản lượng (m³)', align: 'right', render: row => number(row.volume) },
    { key: 'profit', label: 'Lãi gộp (triệu)', align: 'right', render: row => number(row.profit) },
    { key: 'transactions', label: 'Giao dịch', align: 'right', render: row => number(row.transactions, 0) },
    { key: 'progress', label: '% kế hoạch', align: 'right', render: row => <ProgressCell value={row.progress}/> },
  ];
  const storeColumns: TableColumn<StoreRow>[] = [
    { key: 'name', label: 'Cửa hàng', render: row => <b>{row.name}</b> },
    { key: 'volume', label: 'Sản lượng (m³)', align: 'right', render: row => number(row.volume) },
    { key: 'profit', label: 'Lãi gộp (triệu)', align: 'right', render: row => number(row.profit) },
    { key: 'progress', label: '% kế hoạch', align: 'right', render: row => <ProgressCell value={row.progress}/> },
  ];
  const trend = results.map(item => ({ label: monthLabel(item.month), revenue: item.totalRevenue, grossProfit: item.grossProfit, netProfit: item.netProfitAfterTax, target: item.targetCompletionPercent }));

  const metricCard = (metric: DashboardMetric, icon: typeof WalletCards, tone: DashboardTone) => { const shown = displayValue(metric.actualValue, metric.measurementUnit); return <MetricCard key={metric.metricId} label={metric.metricName} value={shown.value} unit={shown.unit} caption={`${metric.subjectName}${metric.targetValue == null ? ' · chưa giao mục tiêu' : ` · mục tiêu ${number(metric.targetValue)}`}`} progress={metric.progressPercent} icon={icon} tone={tone}/>; };

  return <div className="nova-account-page executive-page">
    <header className="executive-header"><div><p className="nova-eyebrow">CTV · EXECUTIVE DASHBOARD</p><h1>Tổng quan công ty</h1><span>Tổng hợp kết quả điều hành theo từng phòng ban, mục tiêu và đơn vị vận hành.</span></div><div className="executive-controls">
      <label><span>Kỳ báo cáo</span><input type="month" value={month} onChange={event => { setLoading(true); setError(''); setMonth(event.target.value); }}/></label>
      <label><span>So sánh</span><select value={compareMonth} onChange={event => setCompareMonth(event.target.value)}><option value="">Không so sánh</option>{results.filter(item => item.month !== month).map(item => <option key={item.month} value={item.month}>Tháng {Number(item.month.slice(5))}/{item.month.slice(0, 4)}</option>)}</select></label>
      <label><span>Khu vực</span><select value={region} onChange={event => setRegion(event.target.value)}><option value="">Tất cả khu vực</option>{regions.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label>
      <button type="button" onClick={refreshDashboard} disabled={loading}><RefreshCw size={17} className={loading ? 'spinning' : ''}/><span>Cập nhật lần cuối<small>{formatDateTime(data?.generatedAt)}</small></span></button>
    </div></header>

    <nav className="executive-jump"><span>Xem nhanh</span><a href="#company">Toàn công ty</a><a href="#finance">Tài chính</a><a href="#sales">Kinh doanh</a><a href="#hr">HCNS</a><a href="#assistant">Trợ lý / Thư ký</a></nav>
    {loading && <div className="performance-state"><span className="nova-session-spinner"/>Đang tổng hợp dữ liệu điều hành…</div>}
    {error && <div className="performance-error"><Icon name="alert"/>{error}<button className="nova-button secondary" onClick={refreshDashboard}>Thử lại</button></div>}

    {!loading && !error && <>
      <DashboardSection id="company" eyebrow="KẾT QUẢ KINH DOANH TỔNG HỢP" title="Các chỉ số cần xem ngay" description={`Kỳ ${monthLabel(month)} · ${metrics.length} chỉ số · ${new Set(metrics.filter(item => item.actualValue !== 0).map(item => item.departmentCode)).size} phòng ban đã cập nhật`} tone="blue" style={layoutStyle(dashboardLayout, 'company-overview')}>
        <div className="executive-kpi-grid">
          <MetricCard label="Doanh thu" value={displayValue(selectedResult?.totalRevenue ?? revenueMetric?.actualValue ?? 0, 'MILLION_VND').value} unit={displayValue(selectedResult?.totalRevenue ?? revenueMetric?.actualValue ?? 0, 'MILLION_VND').unit} change={comparisonResult ? { value: change(selectedResult?.totalRevenue ?? 0, comparisonResult.totalRevenue) ?? 0, label: `so với ${monthLabel(comparisonResult.month)}` } : null} icon={WalletCards} tone="blue"/>
          <MetricCard label="Sản lượng" value={number(volumeMetric?.actualValue ?? 0)} unit="m³" caption="Sản lượng bán hàng toàn công ty" progress={volumeMetric?.progressPercent} icon={Droplets} tone="green"/>
          <MetricCard label="Lợi nhuận gộp" value={displayValue(selectedResult?.grossProfit ?? grossMetric?.actualValue ?? 0, 'MILLION_VND').value} unit={displayValue(selectedResult?.grossProfit ?? grossMetric?.actualValue ?? 0, 'MILLION_VND').unit} change={comparisonResult ? { value: change(selectedResult?.grossProfit ?? 0, comparisonResult.grossProfit) ?? 0, label: `so với ${monthLabel(comparisonResult.month)}` } : null} icon={TrendingUp} tone="violet"/>
          <MetricCard label="Lợi nhuận sau thuế" value={displayValue(selectedResult?.netProfitAfterTax ?? find('FIN_COMPANY_NET_PROFIT')?.actualValue ?? 0, 'MILLION_VND').value} unit={displayValue(selectedResult?.netProfitAfterTax ?? find('FIN_COMPANY_NET_PROFIT')?.actualValue ?? 0, 'MILLION_VND').unit} change={comparisonResult ? { value: change(selectedResult?.netProfitAfterTax ?? 0, comparisonResult.netProfitAfterTax) ?? 0, label: `so với ${monthLabel(comparisonResult.month)}` } : null} icon={CircleDollarSign} tone="amber"/>
          <ProgressDonut value={selectedResult?.targetCompletionPercent ?? averageProgress} label="Hoàn thành kế hoạch" detail={revenueMetric?.targetValue ? `Mục tiêu doanh thu ${number(revenueMetric.targetValue)} triệu` : 'Bình quân các mục tiêu đã giao'} tone="amber"/>
          <MetricCard label="CHXD hoạt động" value={`${activeStores}/${storeRows.length}`} caption={activeStores === storeRows.length && storeRows.length ? 'Tất cả cửa hàng có phát sinh sản lượng' : `${storeRows.length - activeStores} cửa hàng chưa có số liệu`} icon={Store} tone="cyan"/>
        </div>
        <div className="executive-overview-row"><article className="executive-widget wide"><header><div><span>XU HƯỚNG TOÀN CÔNG TY</span><h3>Doanh thu và lợi nhuận</h3></div><b>{results.length} tháng gần nhất</b></header><TrendChart data={trend}/></article><article className="executive-widget alerts"><header><div><span>CẢNH BÁO MỤC TIÊU</span><h3>Ưu tiên cần xử lý</h3></div><b>{alerts.filter(item => item.severity !== 'success').length}</b></header><AlertList items={alerts}/></article></div>
      </DashboardSection>

      <DashboardSection id="finance" eyebrow={departmentInfo['CTV-TCKT'].eyebrow} title={departmentInfo['CTV-TCKT'].title} description="Các số liệu tài chính tổng hợp phục vụ Ban điều hành." action={{ label: 'Xem mục tiêu', href: '/performance/goals' }} tone={departmentInfo['CTV-TCKT'].tone} style={layoutStyle(dashboardLayout, 'finance-summary')}>
        <div className="executive-department-metrics">{[revenueMetric, grossMetric, find('FIN_COMPANY_NET_PROFIT'), overdueMetric].filter((item): item is DashboardMetric => Boolean(item)).map((item, index) => metricCard(item, [Landmark, BadgeDollarSign, CircleDollarSign, WalletCards][index] ?? Landmark, (['blue', 'violet', 'green', 'rose'] as DashboardTone[])[index] ?? 'blue'))}</div>
      </DashboardSection>

      <DashboardSection id="sales" eyebrow="P. KINH DOANH TỔNG HỢP" title="Kết quả theo khu vực, CHXD và đội xe" description="Tách riêng ba cấp vận hành để so sánh chéo mà không trộn dữ liệu." action={{ label: 'Nhập dữ liệu', href: '/performance/data-entry' }} tone="green" style={layoutStyle(dashboardLayout, 'sales-summary')}>
        <div className="executive-sales-grid"><article className="executive-widget region-table"><header><div><span>THEO KHU VỰC</span><h3>Sản lượng, lãi gộp và giao dịch</h3></div><b>{regionRows.length} khu vực</b></header><ComparisonTable columns={regionColumns} rows={regionRows}/></article><article className="executive-widget"><header><div><span>SO SÁNH KHU VỰC</span><h3>Sản lượng bán hàng</h3></div><b>m³</b></header><ComparisonBars data={regionRows.map(item => ({ name: item.name.replace('Tây Nguyên & Nam Bộ', 'TN-NB'), value: item.volume }))} unit="m³"/></article></div>
        <div className="executive-sales-grid lower"><article className="executive-widget"><header><div><span>KẾT QUẢ CHXD</span><h3>Cửa hàng bán lẻ</h3></div><b>{storeRows.length} cửa hàng</b></header><ComparisonTable columns={storeColumns} rows={storeRows}/></article><article className="executive-widget"><header><div><span>HIỆU SUẤT ĐỘI XE BỒN</span><h3>Vận chuyển theo phương tiện</h3></div><b>{fleetRows.length} xe</b></header><div className="executive-fleet-grid">{fleetRows.map(item => <article key={item.id}><header><i><Truck size={18}/></i><div><b>{item.name}</b><span>{item.progress == null ? 'Chưa giao mục tiêu' : `${Math.round(item.progress)}% kế hoạch chuyến`}</span></div></header><dl><div><dt>Số chuyến</dt><dd>{number(item.trips, 0)}</dd></div><div><dt>Quãng đường</dt><dd>{number(item.km)} km</dd></div><div><dt>Doanh thu</dt><dd>{number(item.revenue)} tr</dd></div></dl></article>)}</div></article></div>
      </DashboardSection>

      <div className="executive-people-grid" style={layoutStyle(dashboardLayout, 'people-summary')}>
        <DashboardSection id="hr" eyebrow={departmentInfo['CTV-HCNS'].eyebrow} title={departmentInfo['CTV-HCNS'].title} action={{ label: 'Quản lý công việc', href: '/admin/work-items' }} tone={departmentInfo['CTV-HCNS'].tone}>{metrics.filter(item => item.departmentCode === 'CTV-HCNS').length ? <div className="executive-department-metrics single">{metrics.filter(item => item.departmentCode === 'CTV-HCNS').map(item => metricCard(item, item.metricCode.includes('WORK') ? ClipboardCheck : UsersRound, 'green'))}</div> : <div className="executive-empty"><UsersRound/><b>Chưa có dữ liệu HCNS</b><span>Nhập dữ liệu kỳ này để hiển thị chỉ số.</span></div>}</DashboardSection>
        <DashboardSection id="assistant" eyebrow={departmentInfo['CTV-TLTK'].eyebrow} title={departmentInfo['CTV-TLTK'].title} action={{ label: 'Nhập dữ liệu', href: '/performance/data-entry' }} tone={departmentInfo['CTV-TLTK'].tone}>{metrics.filter(item => item.departmentCode === 'CTV-TLTK').length ? <div className="executive-department-metrics single">{metrics.filter(item => item.departmentCode === 'CTV-TLTK').map(item => metricCard(item, ShoppingCart, 'violet'))}</div> : <div className="executive-empty"><BriefcaseBusiness/><b>Chưa có dữ liệu giao dịch</b><span>Số liệu sẽ xuất hiện sau khi phòng ban cập nhật.</span></div>}</DashboardSection>
      </div>
      <footer className="executive-footer" style={{ order: 999 }}><Gauge size={17}/><span>Dữ liệu được tổng hợp từ bảng nhập hằng ngày và đối chiếu KPI / OKR / BSC / MBO.</span><b>{formatDateTime(data?.generatedAt)}</b></footer>
    </>}
  </div>;
}
