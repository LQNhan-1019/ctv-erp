'use client';

import { CalendarDays, Check, ChevronLeft, ChevronRight, ListFilter, LockKeyhole, Settings, SlidersHorizontal, TriangleAlert, Upload } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useAuth } from '@/features/auth/context/auth-context';
import { usePerformanceDataEntry } from '../hooks/use-performance-data-entry';
import { dailyNumber, monthWeeks } from '../lib/performance-weeks';
import PerformanceImportDialog from './performance-import-dialog';
import MetricManagementDialog from './metric-management-dialog';
import PerformanceDayDialog from './performance-day-dialog';

function scopeLabel(scope: string) {
  return ({ COMPANY: 'Toàn công ty', REGION: 'Khu vực', VEHICLE: 'Xe bồn', STORE: 'Cửa hàng' } as Record<string, string>)[scope] ?? scope;
}

export default function PerformanceDataEntryContent() {
  const { user, request } = useAuth();
  const entry = usePerformanceDataEntry(request);
  const { departments, departmentId, setDepartmentId, month, setMonth, sheet, loading, error, clearSaveError, saving, saveDay, refresh } = entry;
  const [importOpen, setImportOpen] = useState(false);
  const [metricManagerOpen, setMetricManagerOpen] = useState(false);
  const [openDay, setOpenDay] = useState<{ day: number; metricId?: string } | null>(null);
  const [weekIndex, setWeekIndex] = useState<number | null>(null);
  const [scopeFilter, setScopeFilter] = useState('ALL');
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [metricQuery, setMetricQuery] = useState('');
  const [message, setMessage] = useState('');
  const canManageMetrics = user?.permissions.includes('PERFORMANCE.METRIC.MANAGE') ?? false;
  const isSalesDepartment = sheet?.department.code === 'CTV-KDTH';
  const weeks = useMemo(() => sheet ? monthWeeks(sheet.month, sheet.daysInMonth) : [], [sheet]);
  const today = new Date();
  const defaultWeekIndex = month === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    ? weeks.findIndex((item) => item.days.includes(today.getDate())) : 0;
  const selectedWeekIndex = Math.min(weekIndex ?? Math.max(defaultWeekIndex, 0), Math.max(weeks.length - 1, 0));
  const week = weeks[selectedWeekIndex];
  const rowsByScope = useMemo(() => !sheet ? [] : scopeFilter === 'ALL'
    ? sheet.rows : sheet.rows.filter((row) => row.scopeLevel === scopeFilter), [scopeFilter, sheet]);
  const subjects = useMemo(() => Array.from(new Map(rowsByScope.map((row) =>
    [row.subjectCode, row.subjectName])).entries()).sort((left, right) => left[1].localeCompare(right[1], 'vi')), [rowsByScope]);
  const visibleRows = useMemo(() => {
    const query = metricQuery.trim().toLocaleLowerCase('vi');
    return rowsByScope.filter((row) => (subjectFilter === 'ALL' || row.subjectCode === subjectFilter)
      && (!query || `${row.metricCode} ${row.metricName} ${row.subjectCode} ${row.subjectName}`
        .toLocaleLowerCase('vi').includes(query)));
  }, [metricQuery, rowsByScope, subjectFilter]);
  const filledWeek = useMemo(() => !week ? 0 : visibleRows.reduce((count, row) =>
    count + week.days.filter((day) => row.dailyValues[String(day)] !== undefined).length, 0), [visibleRows, week]);
  const [year, monthNumber] = month.split('-').map(Number);

  function weekResult(values: Record<string, number>, days: number[], method: string) {
    const present = days.map((day) => values[String(day)]).filter((value) => value !== undefined);
    if (!present.length) return undefined;
    return method === 'LAST' ? present[present.length - 1] : present.reduce((sum, value) => sum + value, 0);
  }

  return <div className="nova-account-page performance-page performance-week-page">
    <header className="nova-page-header performance-header">
      <div><p className="nova-eyebrow">SHEET SỐ LIỆU THEO TUẦN</p><h1>Nhập dữ liệu dashboard</h1><span>Xem số liệu trong bảng; chọn ngày hoặc một ô để mở chi tiết và nhập dữ liệu.</span></div>
      <div className="daily-entry-actions">
        {user?.permissions.includes('SYSTEM.SETTINGS.VIEW') && <Link className="nova-button secondary" href="/system/settings"><Settings />Cài đặt khóa nhập</Link>}
        {canManageMetrics && <button className="nova-button secondary" disabled={saving} onClick={() => setMetricManagerOpen(true)}><SlidersHorizontal />Quản lý chỉ số</button>}
        <button className="nova-button secondary" disabled={saving || !departments.length} onClick={() => setImportOpen(true)}><Upload />Import Excel / Sheet</button>
      </div>
    </header>
    <div className="performance-toolbar">
      <label><span>Bộ phận nhập</span><select disabled={departments.length <= 1 || saving} value={departmentId} onChange={(event) => { clearSaveError(); setDepartmentId(event.target.value); setScopeFilter('ALL'); setSubjectFilter('ALL'); setMetricQuery(''); setWeekIndex(null); setMessage(''); }}><option value="" disabled>Chọn bộ phận</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><small>Chỉ hiển thị phòng ban đã được cấp quyền.</small></label>
      <label><span>Sheet tháng</span><input type="month" value={month} disabled={saving} onChange={(event) => { if (!event.target.value) return; clearSaveError(); setMonth(event.target.value); setWeekIndex(null); setMessage(''); }} /></label>
    </div>
    {!loading && isSalesDepartment && <div className="performance-business-filters">
      <div className="performance-filter-heading"><ListFilter /><div><b>Bộ lọc Phòng Kinh doanh Tổng hợp</b><span>Lọc theo cấp vận hành, đối tượng hoặc tên chỉ số.</span></div></div>
      <label><span>Cấp dữ liệu</span><select value={scopeFilter} onChange={(event) => { setScopeFilter(event.target.value); setSubjectFilter('ALL'); }}><option value="ALL">Tất cả cấp</option><option value="COMPANY">Toàn công ty</option><option value="REGION">Khu vực</option><option value="VEHICLE">Đội xe bồn</option><option value="STORE">Cửa hàng bán lẻ</option></select></label>
      <label><span>Đối tượng</span><select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)}><option value="ALL">Tất cả đối tượng</option>{subjects.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label>
      <label className="performance-query"><span>Tìm chỉ số</span><input type="search" placeholder="Sản lượng, lãi gộp…" value={metricQuery} onChange={(event) => setMetricQuery(event.target.value)} /></label>
      <output>{visibleRows.length}/{sheet?.rows.length ?? 0} chỉ số</output>
    </div>}
    {message && <div className="performance-success"><Check />{message}</div>}
    {sheet?.entryPolicy.enabled && <div className="nova-info-note"><LockKeyhole /><span>Ngày trước {sheet.entryPolicy.editableFrom} bị khóa theo cấu hình. Nhập mới: {sheet.entryPolicy.lockCreate ? 'khóa' : 'cho phép'} · Sửa: {sheet.entryPolicy.lockUpdate ? 'khóa' : 'cho phép'} · Xóa: {sheet.entryPolicy.lockDelete ? 'khóa' : 'cho phép'}.</span></div>}
    {error && <div className="performance-error"><TriangleAlert />{error}</div>}
    {!loading && departments.length === 0 && <div className="performance-empty"><LockKeyhole /><h2>Chưa được cấp phạm vi nhập liệu</h2><p>Quản trị viên cần liên kết tài khoản với hồ sơ nhân viên đúng phòng ban và cấp quyền PERFORMANCE.DATA.ENTER tại phòng đó.</p></div>}
    {loading && <div className="performance-state"><span className="nova-session-spinner" />Đang mở sheet dữ liệu…</div>}
    {!loading && sheet && week && <section className="performance-week-panel" aria-label="Sheet số liệu theo tuần">
      <div className="performance-week-toolbar"><div><p><CalendarDays /> {sheet.department.name}</p><h2>{week.label}</h2><span>{filledWeek}/{visibleRows.length * week.days.length} ô đã có số liệu · Bấm vào ngày để xem và nhập</span></div><div className="performance-week-navigation"><button type="button" aria-label="Tuần trước" disabled={selectedWeekIndex === 0} onClick={() => setWeekIndex(selectedWeekIndex - 1)}><ChevronLeft /></button><div role="tablist" aria-label="Chọn tuần">{weeks.map((item, index) => <button key={item.label} type="button" role="tab" aria-selected={index === selectedWeekIndex} className={index === selectedWeekIndex ? 'active' : ''} onClick={() => setWeekIndex(index)}>Tuần {index + 1}</button>)}</div><button type="button" aria-label="Tuần sau" disabled={selectedWeekIndex === weeks.length - 1} onClick={() => setWeekIndex(selectedWeekIndex + 1)}><ChevronRight /></button></div></div>
      <div className="performance-week-sheet-wrap"><table className="performance-week-sheet"><thead><tr><th className="performance-week-metric">Chỉ số / đối tượng</th>{week.days.map((day) => { const weekday = new Date(year, monthNumber - 1, day).toLocaleDateString('vi-VN', { weekday: 'short' }); const today = new Date().toDateString() === new Date(year, monthNumber - 1, day).toDateString(); return <th key={day}><button type="button" className={today ? 'today' : ''} onClick={() => setOpenDay({ day })}><small>{weekday}</small><strong>{String(day).padStart(2, '0')}</strong></button></th>; })}<th className="performance-week-total">Kết quả tuần</th></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.metricId}><td className="performance-week-metric"><strong>{row.metricName}</strong><span>{row.subjectName} · {scopeLabel(row.scopeLevel)}</span><small>{row.measurementUnit} · {row.aggregationMethod === 'SUM' ? 'Cộng kỳ' : 'Cuối kỳ'}</small></td>{week.days.map((day) => { const value = row.dailyValues[String(day)]; const isEmpty = value === undefined; return <td key={day}><button type="button" className={`performance-week-cell ${isEmpty ? 'empty' : 'filled'}`} onClick={() => setOpenDay({ day, metricId: row.metricId })} aria-label={`${row.metricName}, ${row.subjectName}, ngày ${day}: ${isEmpty ? 'chưa có dữ liệu' : dailyNumber(value)}. Xem chi tiết`}><span>{dailyNumber(value)}</span>{isEmpty && <small>Nhập</small>}</button></td>; })}<td className="performance-week-total">{dailyNumber(weekResult(row.dailyValues, week.days, row.aggregationMethod))}</td></tr>)}{!visibleRows.length && <tr><td className="performance-week-empty" colSpan={week.days.length + 2}>Không có chỉ số phù hợp với bộ lọc.</td></tr>}</tbody></table></div>
    </section>}
    {openDay && sheet && <PerformanceDayDialog key={`${sheet.department.id}:${sheet.month}:${openDay.day}`} sheet={sheet} day={openDay.day} rows={visibleRows} focusMetricId={openDay.metricId} saving={saving} onClose={() => setOpenDay(null)} onSave={async (changes) => { await saveDay(openDay.day, changes); setOpenDay(null); setMessage(`Đã lưu ${changes.length} chỉ số ngày ${openDay.day}/${monthNumber}.`); }} />}
    {importOpen && <PerformanceImportDialog month={month} onClose={() => setImportOpen(false)} onImported={(result) => { setImportOpen(false); refresh(); setMessage(`Đã import ${result.importedCells} ô; bỏ qua ${result.skippedDepartmentCells} ô khác phòng ban và ${result.lockedCells} ô bị khóa.`); }} />}
    {metricManagerOpen && <MetricManagementDialog onClose={() => setMetricManagerOpen(false)} onChanged={() => { refresh(); setMessage('Danh mục chỉ số đã thay đổi; bảng nhập và dashboard đã được cập nhật.'); }} />}
  </div>;
}
