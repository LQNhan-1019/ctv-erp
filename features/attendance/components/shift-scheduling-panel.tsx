'use client';

import { appDialog } from '@/lib/ui/app-dialog';

import { CalendarDays, Clock3, Pencil, Save, Trash2 } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { ApiRequestOptions } from '@/lib/api/client';
import { createSchedule, createShift, deleteSchedule, deleteShift, listSchedules, updateShift } from '../api/attendance-api';
import type { AttendanceShift, EmployeeOption, ScheduleRule } from '../types/attendance';

type Request = <T>(path: string, options?: ApiRequestOptions) => Promise<T>;
type ShiftDraft = { code: string; name: string; startTime: string; endTime: string; breakStartTime: string; breakEndTime: string; lateGraceMinutes: number; earlyLeaveGraceMinutes: number; active: boolean };
const emptyShift: ShiftDraft = { code: '', name: '', startTime: '08:00', endTime: '17:00', breakStartTime: '12:00', breakEndTime: '13:00', lateGraceMinutes: 5, earlyLeaveGraceMinutes: 5, active: true };
const weekDays = [[1, 'T2'], [2, 'T3'], [3, 'T4'], [4, 'T5'], [5, 'T6'], [6, 'T7'], [7, 'CN']] as const;

function clockMinutes(value: string) { const [hour, minute] = value.split(':').map(Number); return hour * 60 + minute; }
function workMinutes(shift: ShiftDraft) {
  if (!shift.startTime || !shift.endTime) return 0;
  let duration = clockMinutes(shift.endTime) - clockMinutes(shift.startTime);
  if (duration <= 0) duration += 1440;
  if (shift.breakStartTime && shift.breakEndTime) {
    let rest = clockMinutes(shift.breakEndTime) - clockMinutes(shift.breakStartTime);
    if (rest <= 0) rest += 1440;
    duration -= rest;
  }
  return Math.max(0, duration);
}

export default function ShiftSchedulingPanel({ request, shifts, employees, busy, execute }: { request: Request; shifts: AttendanceShift[]; employees: EmployeeOption[]; busy: string; execute: (label: string, action: () => Promise<unknown>) => Promise<void> }) {
  const [draft, setDraft] = useState<ShiftDraft>(emptyShift);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [rules, setRules] = useState<ScheduleRule[]>([]);
  const [recurrence, setRecurrence] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'>('WEEKLY');
  const [selectedWeekDays, setSelectedWeekDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [monthPattern, setMonthPattern] = useState<'DAY' | 'POSITION'>('POSITION');
  const minutes = useMemo(() => workMinutes(draft), [draft]);
  const allSelected = employees.length > 0 && selectedEmployees.length === employees.length;

  async function refreshRules() { try { setRules(await listSchedules(request)); } catch { setRules([]); } }
  useEffect(() => { const timer = window.setTimeout(() => void refreshRules(), 0); return () => window.clearTimeout(timer); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function change<K extends keyof ShiftDraft>(key: K, value: ShiftDraft[K]) { setDraft((current) => ({ ...current, [key]: value })); }
  function edit(shift: AttendanceShift) {
    setEditingId(shift.id);
    setDraft({ code: shift.code, name: shift.name, startTime: shift.startTime.slice(0, 5), endTime: shift.endTime.slice(0, 5), breakStartTime: shift.breakStartTime?.slice(0, 5) ?? '', breakEndTime: shift.breakEndTime?.slice(0, 5) ?? '', lateGraceMinutes: shift.lateGraceMinutes, earlyLeaveGraceMinutes: shift.earlyLeaveGraceMinutes, active: shift.active });
  }
  function reset() { setEditingId(null); setDraft(emptyShift); }

  async function submitShift(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = { ...draft, businessUnitId: null, breakStartTime: draft.breakStartTime || null, breakEndTime: draft.breakEndTime || null, crossesMidnight: clockMinutes(draft.endTime) <= clockMinutes(draft.startTime), fullDayMinutes: minutes, halfDayMinutes: Math.max(1, Math.floor(minutes / 2)) };
    await execute('shift', () => editingId ? updateShift(request, editingId, body) : createShift(request, body));
    reset();
  }

  async function submitSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedEmployees.length) throw new Error('Chọn ít nhất một nhân viên.');
    const data = new FormData(event.currentTarget);
    const positioned = (recurrence === 'MONTHLY' || recurrence === 'YEARLY') && monthPattern === 'POSITION';
    const fixedDay = (recurrence === 'MONTHLY' || recurrence === 'YEARLY') && monthPattern === 'DAY';
    await execute('schedule', () => createSchedule(request, {
      name: data.get('name'), shiftId: data.get('shiftId'), employeeIds: selectedEmployees,
      recurrenceType: recurrence, fromDate: data.get('fromDate'), toDate: data.get('toDate'),
      weekDays: recurrence === 'WEEKLY' ? selectedWeekDays : positioned ? [Number(data.get('positionWeekDay'))] : [],
      dayOfMonth: fixedDay ? Number(data.get('dayOfMonth')) : null,
      weekPosition: positioned ? data.get('weekPosition') : null,
      monthOfYear: recurrence === 'YEARLY' ? Number(data.get('monthOfYear')) : null,
      overwriteExisting: data.get('overwriteExisting') === 'on',
    }));
    await refreshRules();
  }

  return <div className="attendance-scheduling-layout">
    <section className="attendance-panel">
      <header><div><h2>Danh sách ca</h2><p>Thời gian đủ công được tính tự động từ giờ vào, giờ ra và giờ nghỉ.</p></div></header>
      <div className="shift-list">{shifts.map((shift) => <article key={shift.id} className={!shift.active ? 'inactive' : ''}><span><Clock3 /></span><div><b>{shift.name}</b><small>{shift.code} · {shift.startTime.slice(0, 5)}–{shift.endTime.slice(0, 5)} · {shift.fullDayMinutes} phút</small></div><div className="shift-row-actions"><button type="button" onClick={() => edit(shift)} aria-label="Sửa ca"><Pencil /></button><button type="button" className="danger" onClick={async () => { if (await appDialog.confirm(`Xóa ca ${shift.name}? Ca đã phát sinh bảng công sẽ được ngừng sử dụng để giữ lịch sử.`)) void execute('delete-shift', () => deleteShift(request, shift.id)); }} aria-label="Xóa ca"><Trash2 /></button></div></article>)}</div>
    </section>
    <section className="attendance-panel attendance-form">
      <h2>{editingId ? 'Sửa ca làm việc' : 'Tạo ca làm việc'}</h2>
      <form onSubmit={submitShift}>
        <div className="nova-form-grid"><label><span>Mã ca</span><input value={draft.code} onChange={(event) => change('code', event.target.value)} required /></label><label><span>Tên ca</span><input value={draft.name} onChange={(event) => change('name', event.target.value)} required /></label></div>
        <div className="nova-form-grid"><label><span>Giờ vào</span><input type="time" value={draft.startTime} onChange={(event) => change('startTime', event.target.value)} required /></label><label><span>Giờ ra</span><input type="time" value={draft.endTime} onChange={(event) => change('endTime', event.target.value)} required /></label></div>
        <div className="nova-form-grid"><label><span>Bắt đầu nghỉ</span><input type="time" value={draft.breakStartTime} onChange={(event) => change('breakStartTime', event.target.value)} /></label><label><span>Kết thúc nghỉ</span><input type="time" value={draft.breakEndTime} onChange={(event) => change('breakEndTime', event.target.value)} /></label></div>
        <div className="nova-form-grid three"><label><span>Trễ cho phép</span><input type="number" min="0" value={draft.lateGraceMinutes} onChange={(event) => change('lateGraceMinutes', Number(event.target.value))} /></label><label><span>Về sớm cho phép</span><input type="number" min="0" value={draft.earlyLeaveGraceMinutes} onChange={(event) => change('earlyLeaveGraceMinutes', Number(event.target.value))} /></label><label><span>Đủ công tự tính</span><output>{minutes} phút ({(minutes / 60).toFixed(1)} giờ)</output></label></div>
        <label className="attendance-inline-check"><input type="checkbox" checked={draft.active} onChange={(event) => change('active', event.target.checked)} />Đang sử dụng</label>
        <div className="attendance-form-actions">{editingId && <button type="button" className="nova-button secondary" onClick={reset}>Hủy sửa</button>}<button className="nova-button primary" disabled={busy === 'shift' || minutes <= 0}><Save />{editingId ? 'Lưu ca' : 'Tạo ca'}</button></div>
      </form>
      <hr />
      <h2>Phân ca hàng loạt & lịch lặp</h2>
      <form onSubmit={(event) => { void submitSchedule(event).catch((cause) => void appDialog.alert(cause instanceof Error ? cause.message : 'Không thể phân ca')); }}>
        <div className="nova-form-grid"><label><span>Tên lịch</span><input name="name" placeholder="Ca hành chính T2–T7" required /></label><label><span>Ca áp dụng</span><select name="shiftId" required>{shifts.filter((item) => item.active).map((shift) => <option key={shift.id} value={shift.id}>{shift.name}</option>)}</select></label></div>
        <div className="nova-form-grid"><label><span>Từ ngày</span><input name="fromDate" type="date" required /></label><label><span>Đến ngày</span><input name="toDate" type="date" required /></label></div>
        <label><span>Chu kỳ</span><select value={recurrence} onChange={(event) => setRecurrence(event.target.value as typeof recurrence)}><option value="DAILY">Theo ngày</option><option value="WEEKLY">Theo tuần</option><option value="MONTHLY">Theo tháng</option><option value="YEARLY">Theo năm</option></select></label>
        {recurrence === 'WEEKLY' && <div className="attendance-weekdays">{weekDays.map(([value, label]) => <label key={value}><input type="checkbox" checked={selectedWeekDays.includes(value)} onChange={(event) => setSelectedWeekDays((current) => event.target.checked ? [...current, value] : current.filter((item) => item !== value))} />{label}</label>)}</div>}
        {(recurrence === 'MONTHLY' || recurrence === 'YEARLY') && <div className="attendance-pattern"><label><span>Cách chọn ngày</span><select value={monthPattern} onChange={(event) => setMonthPattern(event.target.value as typeof monthPattern)}><option value="POSITION">Một thứ đầu/cuối tháng</option><option value="DAY">Ngày cố định trong tháng</option></select></label>{monthPattern === 'POSITION' ? <><label><span>Vị trí</span><select name="weekPosition"><option value="FIRST">Đầu tháng</option><option value="LAST">Cuối tháng</option></select></label><label><span>Thứ</span><select name="positionWeekDay">{weekDays.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></> : <label><span>Ngày trong tháng</span><input name="dayOfMonth" type="number" min="1" max="31" defaultValue="1" /></label>}{recurrence === 'YEARLY' && <label><span>Tháng</span><input name="monthOfYear" type="number" min="1" max="12" defaultValue="1" /></label>}</div>}
        <div className="employee-picker-toolbar"><label><input type="checkbox" checked={allSelected} onChange={(event) => setSelectedEmployees(event.target.checked ? employees.map((item) => item.id) : [])} />Chọn tất cả ({employees.length})</label><span>Đã chọn {selectedEmployees.length}</span></div>
        <div className="employee-picker">{employees.map((employee) => <label key={employee.id}><input type="checkbox" checked={selectedEmployees.includes(employee.id)} onChange={(event) => setSelectedEmployees((current) => event.target.checked ? [...current, employee.id] : current.filter((id) => id !== employee.id))} /><span><b>{employee.fullName}</b><small>{employee.employeeCode} · {employee.businessUnitName}</small></span></label>)}</div>
        <label className="attendance-inline-check"><input name="overwriteExisting" type="checkbox" />Ghi đè ca đã phân trong cùng ngày</label>
        <button className="nova-button primary" disabled={busy === 'schedule' || !selectedEmployees.length}><CalendarDays />Tạo lịch phân ca</button>
      </form>
      {rules.length > 0 && <div className="schedule-rule-list"><h3>Lịch đã tạo</h3>{rules.map((rule) => <article key={rule.id}><div><b>{rule.name}</b><small>{rule.shiftName} · {rule.recurrenceType} · {rule.fromDate} → {rule.toDate}</small></div><span>{rule.employeeCount} NV · {rule.assignedDays} lượt</span><button type="button" onClick={async () => { if (await appDialog.confirm('Xóa lịch và các phân ca từ hôm nay trở đi?')) void execute('delete-schedule', () => deleteSchedule(request, rule.id)).then(refreshRules); }}><Trash2 /></button></article>)}</div>}
    </section>
  </div>;
}
