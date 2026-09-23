'use client';

import { BarChart3, Boxes, CalendarDays, CalendarRange, ChevronLeft, ChevronRight, FileSpreadsheet, RefreshCw, Search, TableProperties, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '@/features/auth/context/auth-context';
import { useApiResource } from '@/lib/api/use-api-resource';
import { getLeaderKpiResults } from '../api/performance-api';
import type { LeaderKpiDashboard, LeaderKpiIndicator } from '../types/performance';

function currentMonth() { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; }
function number(value: number | null, digits = 2) { return value == null ? '—' : new Intl.NumberFormat('vi-VN', { maximumFractionDigits: digits }).format(value); }
function dateTime(value: string | null) { return value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : 'Chưa có dữ liệu'; }
function monthLabel(value: string) { const [year, month] = value.split('-'); return `Tháng ${Number(month)}/${year}`; }
function compactNumber(value: number | null) { if (value == null) return '—'; if (Math.abs(value) < 10_000) return number(value); return new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 2 }).format(value); }
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
  const { data, error, loading, refresh } = useApiResource<LeaderKpiDashboard>({ key: `leader-kpi-results:${month}`, load: () => getLeaderKpiResults(request, month) });
  const canEnter = user?.permissions.includes('PERFORMANCE.DATA.ENTER') ?? false;
  const days = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
  const sectionRows = useMemo(() => (data?.sections ?? []).filter(item => section === 'ALL' || item.code === section).flatMap(item => item.indicators.map(metric => ({ sectionCode: item.code, sectionName: item.name, metric }))), [data, section]);
  const rows = useMemo(() => { const query = search.trim().toLocaleLowerCase('vi'); return sectionRows.filter(item => !query || `${item.metric.name} ${item.sectionName}`.toLocaleLowerCase('vi').includes(query)); }, [search, sectionRows]);
  const chartMetric = sectionRows.find(item => item.metric.code === chartMetricCode)?.metric ?? rows[0]?.metric ?? sectionRows[0]?.metric ?? null;
  const chartData = useMemo(() => Array.from({ length: days }, (_, index) => ({ day: index + 1, label: `${index + 1}/${Number(month.slice(5, 7))}`, value: chartMetric ? valueOn(chartMetric, index + 1) : null })), [chartMetric, days, month]);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const populatedDays = (data?.sections ?? []).flatMap(item => item.indicators).reduce((sum, metric) => sum + Object.keys(metric.dailyValues).length, 0);
  const selectedDayCells = sectionRows.reduce((sum, item) => sum + (valueOn(item.metric, selectedDay) == null ? 0 : 1), 0);
  const selectedValue = chartMetric ? valueOn(chartMetric, selectedDay) : null;
  const selectedDelta = chartMetric ? dayDelta(chartMetric, selectedDay) : null;
  return <div className="nova-account-page leader-kpi-page">
    <header className="leader-kpi-hero"><div><p>DASHBOARD KẾT QUẢ KPI</p><h1>Kết quả vận hành theo ngày</h1><span>Tổng hợp trực tiếp từ “Nhập số liệu theo ngày”. Biểu đồ và bảng được tối ưu để số lớn không tràn giao diện.</span></div><div><label><span>Kỳ báo cáo</span><input type="month" value={month} onChange={(event) => { const next = event.target.value; setMonth(next); setSection('ALL'); setSelectedDay(initialDay(next)); setChartMetricCode(''); setPage(1); }}/></label><button onClick={refresh} disabled={loading}><RefreshCw/>{loading ? 'Đang tải' : 'Làm mới'}</button>{canEnter && <Link className="primary" href="/performance/data-entry"><TableProperties/>Nhập số liệu</Link>}</div></header>
    {error && <div className="performance-error"><TriangleAlert/>{error}<button onClick={refresh}>Thử lại</button></div>}
    {loading && <div className="performance-state"><span className="nova-session-spinner"/>Đang tổng hợp kết quả…</div>}
    {!loading && !error && <>
      <section className="leader-kpi-summary"><article><i><BarChart3/></i><div><span>Chỉ số kết quả</span><b>{data?.totalIndicators ?? 0}</b><small>{monthLabel(month)}</small></div></article><article><i><Boxes/></i><div><span>Nhóm theo dõi</span><b>{data?.sections.length ?? 0}</b><small>Phòng ban, khu vực, xe và CHXD</small></div></article><article><i><CalendarRange/></i><div><span>Ô ngày đã có số liệu</span><b>{populatedDays}</b><small>Dữ liệu đã nhập trong kỳ</small></div></article><article><i><CalendarDays/></i><div><span>Dữ liệu ngày {selectedDay}</span><b>{selectedDayCells}</b><small>Chỉ số có số liệu trong phạm vi lọc</small></div></article></section>
      <section className="leader-kpi-meta"><div><b>Nguồn: {data?.sourceFileName ?? 'Nhập số liệu theo ngày'}</b><span>Cập nhật gần nhất: {dateTime(data?.importedAt ?? null)}</span></div><label><Search/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên chỉ số…"/></label></section>
      {!data?.sections.length && <section className="leader-kpi-empty"><FileSpreadsheet/><h2>Chưa có danh mục chỉ số</h2><p>Hãy cấu hình chỉ số và nhập số liệu hằng ngày để dashboard tự tổng hợp.</p>{canEnter && <Link className="nova-button primary" href="/performance/data-entry"><TableProperties/>Đi đến nhập số liệu</Link>}</section>}
      {!!data?.sections.length && <main className="leader-kpi-workspace">
        <section className="leader-kpi-toolbar" aria-label="Bộ lọc dashboard kết quả">
          <label><span>Nhóm dữ liệu</span><select value={section} onChange={(event) => { setSection(event.target.value); setChartMetricCode(''); setPage(1); }}><option value="ALL">Tất cả nhóm</option>{data.sections.map(item => <option key={item.code} value={item.code}>{item.name} ({item.indicators.length})</option>)}</select></label>
          <label><span>Chỉ số trên biểu đồ</span><select value={chartMetric?.code ?? ''} onChange={(event) => setChartMetricCode(event.target.value)}>{sectionRows.map(item => <option key={`${item.sectionCode}-${item.metric.code}`} value={item.metric.code}>{item.sectionName} · {item.metric.name}</option>)}</select></label>
          <label><span>Ngày cần xem</span><select value={selectedDay} onChange={(event) => setSelectedDay(Number(event.target.value))}>{Array.from({ length: days }, (_, index) => <option key={index + 1} value={index + 1}>Ngày {index + 1}</option>)}</select></label>
        </section>
        <section className="leader-kpi-chart-panel">
          <header><div><p>XU HƯỚNG THEO NGÀY</p><h2>{chartMetric?.name ?? 'Chưa có chỉ số'}</h2><span>{chartMetric?.unit ?? 'Chưa khai báo đơn vị'} · bấm một dòng trong bảng để đổi biểu đồ</span></div><div className="leader-kpi-day-snapshot"><span>Ngày {selectedDay}</span><b title={number(selectedValue)}>{compactNumber(selectedValue)}</b><small className={selectedDelta == null ? '' : selectedDelta < 0 ? 'negative' : 'positive'}>{selectedDelta == null ? 'Chưa đủ dữ liệu so sánh' : `${selectedDelta > 0 ? '+' : ''}${compactNumber(selectedDelta)} so ngày trước`}</small></div></header>
          {chartMetric ? <div className="leader-kpi-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 10, right: 14, left: 4, bottom: 0 }}><defs><linearGradient id="leaderKpiArea" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#168478" stopOpacity={.34}/><stop offset="95%" stopColor="#168478" stopOpacity={.02}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="day" tickLine={false} axisLine={false} minTickGap={16}/><YAxis tickFormatter={(value: number) => compactNumber(value)} tickLine={false} axisLine={false} width={72}/><Tooltip labelFormatter={(value) => `Ngày ${value}`} formatter={(value) => [number(Number(value)), chartMetric.unit ?? 'Giá trị']}/><ReferenceLine x={selectedDay} stroke="#f59e0b" strokeDasharray="4 4"/><Area type="monotone" dataKey="value" stroke="#168478" strokeWidth={2.5} fill="url(#leaderKpiArea)" connectNulls activeDot={{ r: 5 }}/></AreaChart></ResponsiveContainer></div> : <div className="leader-kpi-chart-empty">Chưa có chỉ số để vẽ biểu đồ.</div>}
        </section>
        <section className="leader-kpi-table-panel">
          <header><div><p>CHI TIẾT KẾT QUẢ</p><h2>Dữ liệu ngày {selectedDay}/{Number(month.slice(5, 7))}</h2></div><span>{rows.length} chỉ số</span></header>
          <div className="leader-kpi-table-wrap"><table><thead><tr><th>Nhóm / chỉ số</th><th className="numeric">Ngày {selectedDay}</th><th className="numeric">So ngày trước</th><th className="numeric">MTD</th><th className="numeric">Cả tháng</th><th className="numeric">Tỷ lệ</th><th className="numeric">Ti</th><th className="numeric">Thành tiền</th></tr></thead><tbody>{visibleRows.map(item => { const daily = valueOn(item.metric, selectedDay); const delta = dayDelta(item.metric, selectedDay); return <tr key={`${item.sectionCode}-${item.metric.code}`} className={chartMetric?.code === item.metric.code ? 'active' : ''} onClick={() => setChartMetricCode(item.metric.code)}><td><span className="leader-kpi-section-tag">{item.sectionName}</span><b>{item.metric.name}</b><small>{item.metric.unit || 'Chưa có đơn vị'}</small></td><td className="numeric"><strong title={number(daily)}>{compactNumber(daily)}</strong></td><td className={`numeric ${delta == null ? '' : delta < 0 ? 'negative' : 'positive'}`} title={number(delta)}>{delta == null ? '—' : `${delta > 0 ? '+' : ''}${compactNumber(delta)}`}</td><td className="numeric" title={number(item.metric.actualToDate)}>{compactNumber(item.metric.actualToDate)}</td><td className="numeric" title={number(item.metric.monthResult)}>{compactNumber(item.metric.monthResult)}</td><td className="numeric">{item.metric.completionRate == null ? '—' : `${number(item.metric.completionRate * 100, 1)}%`}</td><td className="numeric" title={number(item.metric.conversionValue)}>{compactNumber(item.metric.conversionValue)}</td><td className="numeric" title={number(item.metric.convertedAmount)}>{compactNumber(item.metric.convertedAmount)}</td></tr>; })}{!visibleRows.length && <tr><td colSpan={8} className="leader-kpi-no-row">Không có chỉ số phù hợp bộ lọc.</td></tr>}</tbody></table></div>
          {pageCount > 1 && <footer><span>Trang {currentPage}/{pageCount}</span><div><button disabled={currentPage === 1} onClick={() => setPage(Math.max(1, currentPage - 1))} aria-label="Trang trước"><ChevronLeft/></button><button disabled={currentPage === pageCount} onClick={() => setPage(Math.min(pageCount, currentPage + 1))} aria-label="Trang sau"><ChevronRight/></button></div></footer>}
        </section>
      </main>}
    </>}
    </div>;
}
