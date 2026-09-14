'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/icon';
import type { ApiRequestOptions } from '@/lib/api/client';
import { useAuth } from '@/features/auth/context/auth-context';
import ShiftDefinitionPanel from './shift-definition-panel';
import ShiftAssignmentPanel from './shift-assignment-panel';
import AttendanceExportDialog from './attendance-export-dialog';
import AttendanceImportDialog from './attendance-import-dialog';
import {
  adjustAttendance, getAttendanceDashboard,
  deleteAttendanceData, deleteAttendanceIdentifier, getTimesheet, listAttendanceIdentifiers, listEmployees, listShifts, listSources, saveAttendanceIdentifier, syncAmis,
} from '../api/attendance-api';
import type { AttendanceDashboard, AttendanceIdentifier, AttendanceImportResult, AttendanceShift, AttendanceSource, DailyAttendance, EmployeeOption, Timesheet } from '../types/attendance';
type Request = <T>(path: string, options?: ApiRequestOptions) => Promise<T>;

type Tab = 'overview' | 'timesheet' | 'shiftDefinitions' | 'scheduling' | 'sync';
const statusLabels: Record<string, string> = {
  PRESENT: 'Đủ công', LATE: 'Đi trễ', ABSENT: 'Vắng', MISSING_CHECK_IN: 'Quên check-in',
  MISSING_CHECK_OUT: 'Quên check-out', SCHEDULED: 'Đã xếp ca', OFF_DAY: 'Nghỉ tuần',
  HOLIDAY: 'Ngày lễ', UNASSIGNED: 'Chưa xếp ca',
};
const currentMonth = () => new Date().toISOString().slice(0, 7);
const time = (value: string | null) => value ? new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '—';
const localInput = (value: string | null) => value ? new Date(new Date(value).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';

export default function AttendanceManagementPage() {
  const { user, request, download } = useAuth();
  const canView = user?.permissions.includes('HR.ATTENDANCE.VIEW') ?? false;
  const canManage = user?.permissions.includes('HR.ATTENDANCE.MANAGE') ?? false;
  const canAdjust = user?.permissions.includes('HR.ATTENDANCE.ADJUST') ?? false;
  const canSync = user?.permissions.includes('HR.ATTENDANCE.SYNC') ?? false;
  const canExport = user?.permissions.includes('HR.ATTENDANCE.EXPORT') ?? false;
  const canImport = user?.permissions.includes('HR.ATTENDANCE.IMPORT') ?? false;
  const [tab, setTab] = useState<Tab>('overview');
  const [month, setMonth] = useState(currentMonth);
  const [businessUnitId, setBusinessUnitId] = useState('');
  const [dashboard, setDashboard] = useState<AttendanceDashboard | null>(null);
  const [timesheet, setTimesheet] = useState<Timesheet | null>(null);
  const [shifts, setShifts] = useState<AttendanceShift[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [sources, setSources] = useState<AttendanceSource[]>([]);
  const [editingDay, setEditingDay] = useState<DailyAttendance | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true); setError('');
    try {
      const [overview, sheet, shiftItems, employeeItems, sourceItems] = await Promise.allSettled([
        getAttendanceDashboard(request, month), getTimesheet(request, month, businessUnitId), listShifts(request),
        (canManage || canExport || canImport || canSync) ? listEmployees(request) : Promise.resolve([]),
        canSync ? listSources(request) : Promise.resolve([]),
      ]);
      if (overview.status === 'fulfilled') setDashboard(overview.value);
      if (sheet.status === 'fulfilled') setTimesheet(sheet.value);
      if (shiftItems.status === 'fulfilled') setShifts(shiftItems.value);
      if (employeeItems.status === 'fulfilled') setEmployees(employeeItems.value);
      if (sourceItems.status === 'fulfilled') setSources(sourceItems.value);
      const failed = [overview, sheet, shiftItems, employeeItems, sourceItems]
        .find((result): result is PromiseRejectedResult => result.status === 'rejected');
      if (failed) throw failed.reason;
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không tải được dữ liệu chấm công'); }
    finally { setLoading(false); }
  }, [businessUnitId, canExport, canImport, canManage, canSync, canView, month, request]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  const dayNumbers = useMemo(() => Array.from({ length: timesheet?.daysInMonth ?? 0 }, (_, index) => index + 1), [timesheet]);
  const departments=useMemo(()=>Array.from(new Map(employees.map(item=>[item.businessUnitId,item.businessUnitName])).entries()),[employees]);

  async function execute(label: string, action: () => Promise<unknown>) {
    setBusy(label); setError(''); setMessage('');
    try { await action(); setMessage('Đã cập nhật dữ liệu chấm công.'); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể xử lý yêu cầu'); }
    finally { setBusy(''); }
  }

  async function submitAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editingDay) return; const data = new FormData(event.currentTarget);
    await execute('adjust', () => adjustAttendance(request, editingDay.recordId, {
      checkIn: data.get('checkIn') || null, checkOut: data.get('checkOut') || null, reason: data.get('reason'),
    })); setEditingDay(null);
  }

  async function exportWorkbook(businessUnitId = '', templateId = '') {
    setBusy('export');
    try {
      const params = new URLSearchParams({ month });
      if (businessUnitId) params.set('businessUnitId', businessUnitId);
      if (templateId) params.set('templateId', templateId);
      const blob = await download(`/api/hr/attendance/export?${params.toString()}`);
      const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
      anchor.href = url; anchor.download = `Bang-cham-cong-${month}.xlsx`; anchor.click(); URL.revokeObjectURL(url);
      setExportOpen(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể xuất bảng công'); }
    finally { setBusy(''); }
  }

  async function imported(result: AttendanceImportResult) {
    setMessage(result.message);
    await load();
  }

  if (!canView) return <section className="nova-access-denied"><span><Icon name="shield" /></span><p>KHÔNG ĐỦ QUYỀN</p><h1>Bạn không thể xem chấm công.</h1><div>Cần permission <code>HR.ATTENDANCE.VIEW</code>.</div></section>;
  return <div className="nova-account-page attendance-page">
    <header className="nova-page-header attendance-header">
      <div><p className="nova-eyebrow">CHẤM CÔNG & PHÂN CA</p><h1>Trung tâm chấm công</h1><span>Dữ liệu AMIS và file Excel được chuẩn hóa trước khi tự động tính công.</span></div>
      <div className="attendance-actions"><input aria-label="Tháng" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />{canImport && <button className="nova-button secondary" onClick={() => setImportOpen(true)}><Icon name="upload" />Import Excel</button>}{canExport && <button className="nova-button primary" disabled={busy === 'export'} onClick={() => setExportOpen(true)}><Icon name="download" />Xuất Excel</button>}</div>
    </header>
    <nav className="attendance-tabs">{([['overview', 'Tổng quan'], ['timesheet', 'Bảng công'], ['shiftDefinitions', 'Tạo ca'], ['scheduling', 'Phân ca'], ['sync', 'Nguồn dữ liệu']] as const).map(([value, label]) => <button key={value} className={tab === value ? 'active' : ''} onClick={() => setTab(value)}>{label}</button>)}</nav>
    {error && <div className="performance-error"><Icon name="alert" />{error}</div>}
    {message && <div className="performance-success"><Icon name="check" />{message}</div>}
    {loading && <div className="performance-state"><span className="nova-session-spinner" />Đang tổng hợp dữ liệu…</div>}

    {!loading && tab === 'overview' && dashboard && <Overview data={dashboard} />}
    {!loading && tab === 'timesheet' && timesheet && <section className="attendance-panel">
      <header><div><h2>Bảng công tháng {Number(month.slice(5))}</h2><p>Nhấn vào ô có dữ liệu để xem giờ vào/ra và hiệu chỉnh.</p></div><label className="attendance-department-filter"><span>Phòng ban</span><select value={businessUnitId} onChange={event=>setBusinessUnitId(event.target.value)}><option value="">Tất cả phòng ban</option>{departments.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label></header>
      <div className="attendance-grid-wrap"><table className="attendance-grid"><thead><tr><th className="sticky employee">Nhân viên</th>{dayNumbers.map((day) => <th key={day}>{day}</th>)}<th>Tổng công</th></tr></thead><tbody>
        {timesheet.employees.map((employee) => { const byDay = new Map(employee.days.map((day) => [Number(day.workDate.slice(-2)), day])); return <tr key={employee.employeeId}><th className="sticky employee"><b>{employee.fullName}</b><small>{employee.employeeCode} · {employee.departmentName}</small></th>{dayNumbers.map((number) => { const day = byDay.get(number); return <td key={number}>{day ? <button title={`${statusLabels[day.status] ?? day.status} · ${time(day.checkIn)}–${time(day.checkOut)}`} className={`attendance-code ${day.status.toLowerCase()}`} onClick={() => canAdjust && setEditingDay(day)}>{day.workCode ?? (day.status === 'ABSENT' ? 'V' : '!')}</button> : '—'}</td>; })}<td className="attendance-total">{employee.payrollDays}</td></tr>; })}
      </tbody></table></div>
    </section>}

    {!loading && tab === 'shiftDefinitions' && (canManage ? <ShiftDefinitionPanel request={request} shifts={shifts} busy={busy} execute={execute} /> : <section className="attendance-panel"><p>Bạn chỉ có quyền xem ca làm việc.</p></section>)}
    {!loading && tab === 'scheduling' && (canManage ? <ShiftAssignmentPanel request={request} shifts={shifts} employees={employees} busy={busy} execute={execute} /> : <section className="attendance-panel"><p>Bạn không có quyền phân ca.</p></section>)}

    {!loading && tab === 'sync' && <SyncPanel request={request} sources={sources} employees={employees} canSync={canSync} busy={busy} execute={execute} />}
    {editingDay && <div className="nova-overlay"><section className="nova-dialog attendance-adjust"><header><div><p>HIỆU CHỈNH CHẤM CÔNG</p><h2>{editingDay.workDate}</h2><span>Mọi thay đổi đều được lưu lịch sử và nhật ký hoạt động.</span></div><button onClick={() => setEditingDay(null)}><Icon name="x" /></button></header><form onSubmit={submitAdjustment}><div className="nova-dialog-body"><label><span>Giờ vào</span><input name="checkIn" type="datetime-local" defaultValue={localInput(editingDay.checkIn)} /></label><label><span>Giờ ra</span><input name="checkOut" type="datetime-local" defaultValue={localInput(editingDay.checkOut)} /></label><label><span>Lý do</span><textarea className="nova-textarea" name="reason" required maxLength={500} /></label></div><footer><button type="button" className="nova-button secondary" onClick={() => setEditingDay(null)}>Hủy</button><button className="nova-button primary"><Icon name="save" />Lưu hiệu chỉnh</button></footer></form></section></div>}
    <AttendanceExportDialog open={exportOpen} month={month} request={request} employees={employees} busy={busy} close={() => setExportOpen(false)} execute={execute} onExport={exportWorkbook} />
    <AttendanceImportDialog open={importOpen} request={request} download={download} sources={sources} close={() => setImportOpen(false)} onImported={imported} />
  </div>;
}

function Overview({ data }: { data: AttendanceDashboard }) {
  const cards = [['Nhân sự trong kỳ', data.totalEmployees, 'users'], ['Nhân sự đi trễ', data.lateEmployees, 'clock'], ['Lượt đi trễ', data.lateOccurrences, 'alert'], ['Quên check-in/out', data.missingCheckIns + data.missingCheckOuts, 'alert'], ['Lượt vắng', data.absences, 'user']] as const;
  return <><section className="attendance-kpis">{cards.map(([label, value, icon]) => <article key={label}><span><Icon name={icon} /></span><div><small>{label}</small><b>{value}</b></div></article>)}</section><section className="attendance-two-columns"><div className="attendance-panel"><header><div><h2>Cảnh báo cần xử lý</h2><p>Ai đi trễ, quên check-in/check-out hoặc vắng.</p></div></header><div className="attendance-issues">{data.issues.length ? data.issues.slice(0, 20).map((issue) => <article key={issue.recordId}><time>{new Intl.DateTimeFormat('vi-VN').format(new Date(issue.workDate))}</time><div><b>{issue.employeeName}</b><small>{issue.employeeCode} · {issue.departmentName}</small></div><em className={issue.status.toLowerCase()}>{issue.description}</em></article>) : <p>Không có cảnh báo trong tháng.</p>}</div></div><div className="attendance-panel"><header><div><h2>Theo phòng ban</h2><p>So sánh ngoại lệ chấm công giữa các đơn vị.</p></div></header><div className="attendance-departments">{data.departments.map((department) => <article key={department.departmentCode}><div><b>{department.departmentName}</b><small>{department.employees} nhân sự</small></div><span>Trễ <b>{department.lateOccurrences}</b></span><span>Thiếu log <b>{department.missingPunches}</b></span><span>Vắng <b>{department.absences}</b></span></article>)}</div></div></section></>;
}

function SyncPanel({ request, sources, employees, canSync, busy, execute }: { request: Request; sources: AttendanceSource[]; employees: EmployeeOption[]; canSync: boolean; busy: string; execute: (label: string, action: () => Promise<unknown>) => Promise<void> }) {
  const filteredSources = sources.filter((item) => item.type === 'AMIS_TIMESHEET');
  const [sourceId, setSourceId] = useState('');
  const selected = filteredSources.find((item) => item.id === sourceId) ?? filteredSources[0];
  const selectedId = selected?.id ?? '';
  const [from, setFrom] = useState(currentMonth() + '-01'); const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [identifiers, setIdentifiers] = useState<AttendanceIdentifier[]>([]); const [externalId, setExternalId] = useState(''); const [employeeId, setEmployeeId] = useState('');
  async function refreshIdentifiers() { if (!selectedId) return setIdentifiers([]); try { setIdentifiers(await listAttendanceIdentifiers(request, selectedId)); } catch { setIdentifiers([]); } }
  useEffect(() => { const timer = window.setTimeout(() => { if (!selectedId) setIdentifiers([]); else void listAttendanceIdentifiers(request, selectedId).then(setIdentifiers).catch(() => setIdentifiers([])); }, 0); return () => window.clearTimeout(timer); }, [request, selectedId]);
  async function run(replaceExisting: boolean) { if (!selectedId) return; await execute('sync', () => syncAmis(request, selectedId, from, to, replaceExisting)); await refreshIdentifiers(); }
  async function clear() { if (!selectedId || !window.confirm(`Xóa toàn bộ log AMIS từ ${from} đến ${to}?`)) return; await execute('delete-data', () => deleteAttendanceData(request, 'AMIS', selectedId, from, to)); }
  async function saveMapping(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!selectedId || !externalId || !employeeId) return; await execute('mapping', () => saveAttendanceIdentifier(request, { connectionId: selectedId, externalAttendanceId: externalId, employeeId, sourceEmployeeCode: null, sourceEmployeeName: null })); setExternalId(''); await refreshIdentifiers(); }
  return <section className="attendance-panel attendance-sync"><header><div><h2>Nguồn dữ liệu AMIS</h2><p>Đồng bộ theo ID chấm công đã ánh xạ; giờ vào/ra là lượt đầu tiên và cuối cùng trong ngày. Import Excel vẫn nằm ở nút phía trên.</p></div></header>{!canSync ? <p>Bạn chỉ có quyền xem, không có quyền đồng bộ.</p> : <><div className="attendance-sync-grid"><label><span>Kết nối AMIS</span><select value={selectedId} onChange={(event) => setSourceId(event.target.value)} required><option value="">Chọn kết nối AMIS</option>{filteredSources.map((source) => <option key={source.id} value={source.id}>{source.name} · {source.code}</option>)}</select></label><label><span>Từ ngày</span><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} required /></label><label><span>Đến ngày</span><input type="date" value={to} onChange={(event) => setTo(event.target.value)} required /></label></div>{!filteredSources.length && <div className="nova-info-note"><Icon name="alert" /><span>Chưa có kết nối AMIS chấm công đang hoạt động.</span></div>}<div className="attendance-sync-actions"><button className="nova-button primary" disabled={!selectedId || busy === 'sync'} onClick={() => void run(false)}><Icon name="refresh" />Đồng bộ AMIS</button><button className="nova-button secondary" disabled={!selectedId || busy === 'sync'} onClick={() => { if (window.confirm('Dữ liệu trong khoảng chọn sẽ được xóa và lấy lại. Tiếp tục?')) void run(true); }}><Icon name="refresh" />Xóa & đồng bộ lại</button><button className="nova-button danger" disabled={!selectedId || busy === 'delete-data'} onClick={() => void clear()}><Icon name="trash" />Xóa dữ liệu đã nạp</button></div><section className="attendance-identifier-panel"><header><div><h3>Ánh xạ ID chấm công → nhân viên ERP</h3><p>ID AMIS là mã nguồn riêng, không thay thế mã nhân viên.</p></div></header><form onSubmit={saveMapping}><input value={externalId} onChange={(event) => setExternalId(event.target.value)} placeholder="ID chấm công" required /><select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} required><option value="">Chọn nhân viên ERP</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.employeeCode} · {employee.fullName}</option>)}</select><button className="nova-button secondary" disabled={!selectedId || busy === 'mapping'}><Icon name="save" />Lưu ánh xạ</button></form><div className="attendance-identifier-list">{identifiers.map((item) => <article key={item.id}><code>{item.externalAttendanceId}</code><span>→</span><div><b>{item.employeeName}</b><small>{item.employeeCode}</small></div><button className="danger" aria-label="Xóa ánh xạ" onClick={() => { if (window.confirm('Xóa ánh xạ này?')) void execute('mapping-delete', () => deleteAttendanceIdentifier(request, item.id)).then(refreshIdentifiers); }}><Icon name="trash" /></button></article>)}{selectedId && !identifiers.length && <p>Chưa có ánh xạ cho nguồn này.</p>}</div></section></>}</section>;
}
