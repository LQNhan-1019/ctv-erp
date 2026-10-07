'use client';

import { BadgeDollarSign, BarChart3, ChevronLeft, ChevronRight, FileSpreadsheet, Gauge, RefreshCw, Search, TableProperties, TriangleAlert, WalletCards } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '@/features/auth/context/auth-context';
import { useApiResource } from '@/lib/api/use-api-resource';
import { getLeaderKpiResults } from '../api/performance-api';
import type { LeaderKpiDashboard, LeaderKpiIndicator } from '../types/performance';
import DashboardPeriodPicker from '@/components/ui/dashboard-period-picker';
import ErpSelect from '@/components/ui/erp-select';

function currentMonth() { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; }
function number(value: number | null, digits = 2) { return value == null ? '—' : new Intl.NumberFormat('vi-VN', { maximumFractionDigits: digits }).format(value); }
function dateTime(value: string | null) { return value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : 'Chưa có dữ liệu'; }
function monthLabel(value: string) { const [year, month] = value.split('-'); return `Tháng ${Number(month)}/${year}`; }
function compactNumber(value: number | null) { if (value == null) return '—'; if (Math.abs(value) < 10_000) return number(value); return new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 2 }).format(value); }
function compactVietnameseAmount(value: number | null) {
  if (value == null) return '—';
  const sign = value < 0 ? '-' : '';
  const absolute = Math.abs(value);
  if (absolute < 1_000_000) return `${sign}${number(absolute, 0)} đ`;
  const billions = Math.floor(absolute / 1_000_000_000);
  const millions = Math.round((absolute - billions * 1_000_000_000) / 1_000_000);
  if (billions && millions) return `${sign}${billions} tỷ ${millions} triệu`;
  if (billions) return `${sign}${billions} tỷ`;
  return `${sign}${millions} triệu`;
}
function initialDay(month: string) { const now = new Date(); return month === currentMonth() ? now.getDate() : 1; }

function valueOn(metric: LeaderKpiIndicator, day: number) { return metric.dailyValues[String(day)] ?? null; }
function dayDelta(metric: LeaderKpiIndicator, day: number) { const current = valueOn(metric, day); const previous = day > 1 ? valueOn(metric, day - 1) : null; return current == null || previous == null ? null : current - previous; }
const PAGE_SIZE = 10;

export default function LeaderKpiResultsDashboard() {
  const { request, user } = useAuth();
  const [month, setMonth] = useState(currentMonth);
  const [section, setSection] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedDay, setSelectedDay] = useState(initialDay(currentMonth()));
  const [chartMetricCode, setChartMetricCode] = useState('');
  const [page, setPage] = useState(1);
  const [view, setView] = useState<'SHEET' | 'CHART'>('SHEET');
  const { data, error, loading, refresh } = useApiResource<LeaderKpiDashboard>({ key: `leader-kpi-results:${month}`, load: () => getLeaderKpiResults(request, month) });
  const canEnter = user?.permissions.includes('PERFORMANCE.DATA.ENTER') ?? false;
  const days = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
  const sectionRows = useMemo(() => (data?.sections ?? []).filter(item => section === 'ALL' || item.code === section).flatMap(item => item.indicators.map(metric => ({ sectionCode: item.code, sectionName: item.name, metric }))), [data, section]);
  const rows = useMemo(() => { const query = search.trim().toLocaleLowerCase('vi'); return sectionRows.filter(item => !query || `${item.metric.name} ${item.sectionName}`.toLocaleLowerCase('vi').includes(query)); }, [search, sectionRows]);
  const filteredSections = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi');
    return (data?.sections ?? []).filter(item => section === 'ALL' || item.code === section).map(item => ({
      ...item,
      indicators: item.indicators.filter(metric => !query || `${metric.name} ${item.name}`.toLocaleLowerCase('vi').includes(query)),
    })).filter(item => item.indicators.length > 0);
  }, [data, search, section]);
  const chartMetric = sectionRows.find(item => item.metric.code === chartMetricCode)?.metric ?? rows[0]?.metric ?? sectionRows[0]?.metric ?? null;
  const chartData = useMemo(() => Array.from({ length: days }, (_, index) => ({ day: index + 1, label: `${index + 1}/${Number(month.slice(5, 7))}`, value: chartMetric ? valueOn(chartMetric, index + 1) : null })), [chartMetric, days, month]);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const populatedDays = (data?.sections ?? []).flatMap(item => item.indicators).reduce((sum, metric) => sum + Object.keys(metric.dailyValues).length, 0);
  const selectedDayCells = sectionRows.reduce((sum, item) => sum + (valueOn(item.metric, selectedDay) == null ? 0 : 1), 0);
  const selectedValue = chartMetric ? valueOn(chartMetric, selectedDay) : null;
  const selectedDelta = chartMetric ? dayDelta(chartMetric, selectedDay) : null;
  const selectedSection = section === 'ALL' ? null : data?.sections.find((item) => item.code === section) ?? null;
  const allocatedFund = selectedSection?.allocatedFund ?? data?.totalAllocatedFund ?? null;
  const actualFund = selectedSection?.actualFund ?? data?.totalActualFund ?? null;
  const fundCompletion = selectedSection?.fundCompletionRate ?? data?.totalFundCompletionRate ?? null;
  return <div className="nova-account-page leader-kpi-page">
    <header className="leader-kpi-hero"><div><p>DASHBOARD KẾT QUẢ KPI</p><h1>Kết quả và quỹ thưởng theo ngày</h1><span>Số thực tế tự cộng dồn MTD; tỷ lệ hoàn thành, chênh lệch và tiền thưởng luôn được tính lại từ công thức hệ thống.</span></div><div><DashboardPeriodPicker type="MONTH" value={month} allowedTypes={['MONTH']} onChange={(_, next) => { setMonth(next); setSection('ALL'); setSelectedDay(initialDay(next)); setChartMetricCode(''); setPage(1); }}/><button onClick={refresh} disabled={loading}><RefreshCw/>{loading ? 'Đang tải' : 'Làm mới'}</button>{canEnter && <Link className="primary" href="/performance/kpi-entry"><TableProperties/>Nhập KPI</Link>}</div></header>
    {error && <div className="performance-error"><TriangleAlert/>{error}<button onClick={refresh}>Thử lại</button></div>}
    {loading && <div className="performance-state"><span className="nova-session-spinner"/>Đang tổng hợp kết quả…</div>}
    {!loading && !error && <>
      <section className="leader-kpi-summary"><article><i><WalletCards/></i><div><span>Tổng quỹ phân bổ</span><b title={number(data?.totalAllocatedFund ?? null)}>{compactVietnameseAmount(data?.totalAllocatedFund ?? null)}</b><small>{monthLabel(month)}</small></div></article><article><i><BadgeDollarSign/></i><div><span>Quỹ thực tế tạm tính</span><b title={number(data?.totalActualFund ?? null)}>{compactVietnameseAmount(data?.totalActualFund ?? null)}</b><small>Tự tính từ số liệu hằng ngày</small></div></article><article><i><Gauge/></i><div><span>Hoàn thành quỹ</span><b>{data?.totalFundCompletionRate == null ? '—' : `${number(data.totalFundCompletionRate * 100, 1)}%`}</b><small>Quỹ thực tế / quỹ phân bổ</small></div></article><article><i><BarChart3/></i><div><span>Chỉ số kết quả</span><b>{data?.totalIndicators ?? 0}</b><small>{data?.sections.length ?? 0} đơn vị theo dõi</small></div></article></section>
      <section className="leader-kpi-meta"><div><b>Nguồn: {data?.sourceFileName ?? 'KPI thực tế theo ngày'}</b><span>Cập nhật gần nhất: {dateTime(data?.importedAt ?? null)} · {populatedDays} ô đã nhập · {selectedDayCells} ô trong ngày đang xem</span></div><label><Search/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên chỉ số…"/></label></section>
      {!data?.sections.length && <section className="leader-kpi-empty"><FileSpreadsheet/><h2>Chưa có cấu hình KPI cho tháng này</h2><p>Quản trị viên cần sao chép hoặc tạo cấu hình ba chỉ tiêu và quỹ thưởng cho kỳ được chọn.</p>{canEnter && <Link className="nova-button primary" href="/performance/kpi-entry"><TableProperties/>Đi đến nhập KPI</Link>}</section>}
      {!!data?.sections.length && <section className="leader-kpi-viewbar"><div role="tablist" aria-label="Kiểu hiển thị Dashboard KPI"><button type="button" role="tab" aria-selected={view === 'SHEET'} className={view === 'SHEET' ? 'active' : ''} onClick={() => setView('SHEET')}><FileSpreadsheet/>Bảng Excel</button><button type="button" role="tab" aria-selected={view === 'CHART'} className={view === 'CHART' ? 'active' : ''} onClick={() => setView('CHART')}><BarChart3/>Biểu đồ đơn vị</button></div><label><span>Đơn vị</span><ErpSelect value={section} options={[{ value: 'ALL', label: 'Tất cả đơn vị' }, ...data.sections.map(item => ({ value: item.code, label: `${item.name} (${item.indicators.length})` }))]} onChange={next => { setSection(next); setChartMetricCode(''); setPage(1); }}/></label></section>}
      {!!data?.sections.length && view === 'SHEET' && <section className="leader-kpi-sheet-view" aria-label="Bảng KPI dạng Excel">
        <header><div><p>BẢNG KPI TÍNH THƯỞNG</p><h2>{section === 'ALL' ? 'Toàn công ty' : selectedSection?.name} · {monthLabel(month)}</h2><span>MTD cộng dồn từ dữ liệu ngày; MP lấy từ mục tiêu đã import. TL%, MTG và Thành tiền được tính khi truy vấn.</span></div><strong>{filteredSections.length} đơn vị</strong></header>
        <div className="leader-kpi-sheet-stack">{filteredSections.map((item) => <article key={item.code} className="leader-kpi-sheet-block"><header><div><span>{item.type}</span><h3>{item.name}</h3></div><dl><div><dt>Quỹ phân bổ</dt><dd>{compactVietnameseAmount(item.allocatedFund)}</dd></div><div><dt>Quỹ thực tế</dt><dd className={(item.actualFund ?? 0) < 0 ? 'negative' : ''}>{compactVietnameseAmount(item.actualFund)}</dd></div><div><dt>Hoàn thành</dt><dd>{item.fundCompletionRate == null ? '—' : `${number(item.fundCompletionRate * 100, 1)}%`}</dd></div></dl></header><div className="leader-kpi-sheet-scroll"><table><caption className="sr-only">KPI của {item.name}</caption><thead><tr><th className="metric">Tên chỉ tiêu</th>{Array.from({ length: days }, (_, index) => <th key={index + 1}>{index + 1}</th>)}<th>MTD</th><th>MP</th><th>TL%</th><th>MTG</th><th>ĐVT</th><th>Ti</th><th className="reward">Thành tiền</th></tr></thead><tbody>{item.indicators.map(metric => <tr key={metric.code}><th scope="row" className="metric"><b>{metric.name}</b><small>{metric.code}</small></th>{Array.from({ length: days }, (_, index) => <td key={index + 1} className={(valueOn(metric, index + 1) ?? 0) < 0 ? 'negative' : ''}>{compactNumber(valueOn(metric, index + 1))}</td>)}<td className="summary">{compactNumber(metric.actualToDate)}</td><td className="summary">{compactNumber(metric.monthResult)}</td><td className="summary">{metric.completionRate == null ? '—' : `${number(metric.completionRate * 100, 1)}%`}</td><td className="summary">{compactNumber(metric.remainingValue)}</td><td className="summary text">{metric.unit || '—'}</td><td className="summary">{compactNumber(metric.conversionValue)}</td><td className={`summary reward ${(metric.convertedAmount ?? 0) < 0 ? 'negative' : ''}`} title={number(metric.convertedAmount)}>{compactVietnameseAmount(metric.convertedAmount)}</td></tr>)}</tbody></table></div></article>)}</div>
        {!filteredSections.length && <div className="leader-kpi-no-row">Không có chỉ số phù hợp bộ lọc.</div>}
      </section>}
      {!!data?.sections.length && view === 'CHART' && <section className="leader-kpi-workspace" aria-label="Kết quả KPI theo ngày">
        <section className="leader-kpi-toolbar" aria-label="Bộ lọc dashboard kết quả">
          <label><span>Chỉ số trên biểu đồ</span><ErpSelect value={chartMetric?.code ?? ''} options={sectionRows.map(item => ({ value: item.metric.code, label: `${item.sectionName} · ${item.metric.name}` }))} onChange={setChartMetricCode}/></label>
          <label><span>Ngày cần xem</span><ErpSelect value={String(selectedDay)} options={Array.from({ length: days }, (_, index) => ({ value: String(index + 1), label: `Ngày ${index + 1}` }))} onChange={next => setSelectedDay(Number(next))}/></label>
        </section>
        <section className="leader-kpi-fund-strip" aria-label="Quỹ thưởng trong phạm vi đang xem"><div><span>Phạm vi</span><b>{selectedSection?.name ?? 'Toàn công ty'}</b></div><div><span>Quỹ phân bổ</span><b>{compactVietnameseAmount(allocatedFund)}</b></div><div><span>Quỹ thực tế</span><b className={(actualFund ?? 0) < 0 ? 'negative' : ''}>{compactVietnameseAmount(actualFund)}</b></div><div><span>Hoàn thành quỹ</span><b>{fundCompletion == null ? '—' : `${number(fundCompletion * 100, 1)}%`}</b></div></section>
        <section className="leader-kpi-chart-panel">
          <header><div><p>XU HƯỚNG THEO NGÀY</p><h2>{chartMetric?.name ?? 'Chưa có chỉ số'}</h2><span>{chartMetric?.unit ?? 'Chưa khai báo đơn vị'} · chọn tên chỉ số trong bảng để đổi biểu đồ</span></div><div className="leader-kpi-day-snapshot"><span>Ngày {selectedDay}</span><b title={number(selectedValue)}>{compactNumber(selectedValue)}</b><small className={selectedDelta == null ? '' : selectedDelta < 0 ? 'negative' : 'positive'}>{selectedDelta == null ? 'Chưa đủ dữ liệu so sánh' : `${selectedDelta > 0 ? '+' : ''}${compactNumber(selectedDelta)} so ngày trước`}</small></div></header>
          {chartMetric ? <div className="leader-kpi-chart" role="img" tabIndex={0} aria-label={`Biểu đồ ${chartMetric.name} theo ${days} ngày trong ${monthLabel(month)}. Giá trị ngày ${selectedDay}: ${number(selectedValue)} ${chartMetric.unit ?? ''}.`}><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 10, right: 14, left: 4, bottom: 0 }}><defs><linearGradient id="leaderKpiArea" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--dashboard-chart-net)" stopOpacity={.34}/><stop offset="95%" stopColor="var(--dashboard-chart-net)" stopOpacity={.02}/></linearGradient></defs><CartesianGrid stroke="var(--dashboard-chart-grid)" strokeDasharray="3 3" vertical={false}/><XAxis dataKey="day" tickLine={false} axisLine={false} minTickGap={16}/><YAxis tickFormatter={(value: number) => compactNumber(value)} tickLine={false} axisLine={false} width={72}/><Tooltip labelFormatter={(value) => `Ngày ${value}`} formatter={(value) => [number(Number(value)), chartMetric.unit ?? 'Giá trị']}/><ReferenceLine x={selectedDay} stroke="var(--dashboard-chart-target)" strokeDasharray="4 4"/><Area type="monotone" dataKey="value" stroke="var(--dashboard-chart-net)" strokeWidth={2.5} fill="url(#leaderKpiArea)" connectNulls activeDot={{ r: 5 }}/></AreaChart></ResponsiveContainer></div> : <div className="leader-kpi-chart-empty">Chưa có chỉ số để vẽ biểu đồ.</div>}
        </section>
        <section className="leader-kpi-table-panel">
          <header><div><p>CHI TIẾT KẾT QUẢ</p><h2>Dữ liệu ngày {selectedDay}/{Number(month.slice(5, 7))}</h2></div><span>{rows.length} chỉ số</span></header>
          <div className="leader-kpi-table-wrap"><table><caption className="sr-only">Chi tiết kết quả KPI ngày {selectedDay}, chọn tên chỉ số để cập nhật biểu đồ.</caption><thead><tr><th scope="col">Nhóm / chỉ số</th><th scope="col" className="numeric">Ngày {selectedDay}</th><th scope="col" className="numeric">So ngày trước</th><th scope="col" className="numeric">MTD</th><th scope="col" className="numeric">MP</th><th scope="col" className="numeric">TL%</th><th scope="col" className="numeric">MTG</th><th scope="col" className="numeric">ĐVT</th><th scope="col" className="numeric">Ti</th><th scope="col" className="numeric">Thành tiền</th></tr></thead><tbody>{visibleRows.map(item => { const daily = valueOn(item.metric, selectedDay); const delta = dayDelta(item.metric, selectedDay); return <tr key={`${item.sectionCode}-${item.metric.code}`} className={chartMetric?.code === item.metric.code ? 'active' : ''}><td><button type="button" className="leader-kpi-row-select" aria-pressed={chartMetric?.code === item.metric.code} onClick={() => setChartMetricCode(item.metric.code)}><span className="leader-kpi-section-tag">{item.sectionName}</span><b>{item.metric.name}</b><small>{item.metric.unit || 'Chưa có đơn vị'}</small></button></td><td className="numeric"><strong title={number(daily)}>{compactNumber(daily)}</strong></td><td className={`numeric ${delta == null ? '' : delta < 0 ? 'negative' : 'positive'}`} title={number(delta)}>{delta == null ? '—' : `${delta > 0 ? '+' : ''}${compactNumber(delta)}`}</td><td className="numeric" title={number(item.metric.actualToDate)}>{compactNumber(item.metric.actualToDate)}</td><td className="numeric" title={number(item.metric.monthResult)}>{compactNumber(item.metric.monthResult)}</td><td className="numeric">{item.metric.completionRate == null ? '—' : `${number(item.metric.completionRate * 100, 1)}%`}</td><td className="numeric" title={number(item.metric.remainingValue)}>{compactNumber(item.metric.remainingValue)}</td><td className="numeric">{item.metric.unit || '—'}</td><td className="numeric" title={number(item.metric.conversionValue)}>{compactNumber(item.metric.conversionValue)}</td><td className="numeric" title={number(item.metric.convertedAmount)}>{compactVietnameseAmount(item.metric.convertedAmount)}</td></tr>; })}{!visibleRows.length && <tr><td colSpan={10} className="leader-kpi-no-row">Không có chỉ số phù hợp bộ lọc.</td></tr>}</tbody></table></div>
          {pageCount > 1 && <footer><span>Trang {currentPage}/{pageCount}</span><div><button disabled={currentPage === 1} onClick={() => setPage(Math.max(1, currentPage - 1))} aria-label="Trang trước"><ChevronLeft/></button><button disabled={currentPage === pageCount} onClick={() => setPage(Math.min(pageCount, currentPage + 1))} aria-label="Trang sau"><ChevronRight/></button></div></footer>}
        </section>
      </section>}
    </>}
    </div>;
}
