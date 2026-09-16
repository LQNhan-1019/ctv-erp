'use client';

import { Check, ShieldCheck, TriangleAlert, Upload } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ApiRequestOptions } from '@/lib/api/client';
import { listAttendanceIdentifiers, pushEmployeesToDevice } from '../api/attendance-api';
import type { AttendanceIdentifier, AttendanceSource, DeviceEmployeePushResult, EmployeeOption } from '../types/attendance';

type Request = <T>(path: string, options?: ApiRequestOptions) => Promise<T>;

export default function AttendanceDeviceManagementPanel({ request, sources, employees }: {
  request: Request; sources: AttendanceSource[]; employees: EmployeeOption[];
}) {
  const devices = useMemo(() => sources.filter((source) => source.type === 'ATTENDANCE_DEVICE'), [sources]);
  const [connectionId, setConnectionId] = useState('');
  const selectedConnectionId = connectionId || devices[0]?.id || '';
  const [identifiers, setIdentifiers] = useState<AttendanceIdentifier[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [department, setDepartment] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<DeviceEmployeePushResult | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSelected(new Set()); setResult(null); setError('');
      if (!selectedConnectionId) { setIdentifiers([]); return; }
      void listAttendanceIdentifiers(request, selectedConnectionId).then(setIdentifiers).catch((cause) => {
        setIdentifiers([]); setError(cause instanceof Error ? cause.message : 'Không tải được ánh xạ ID chấm công');
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [request, selectedConnectionId]);

  const byEmployee = useMemo(() => new Map(identifiers.map((item) => [item.employeeId, item])), [identifiers]);
  const departments = useMemo(() => Array.from(new Set(employees.map((employee) => employee.businessUnitName))).sort(), [employees]);
  const visible = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi');
    return employees.filter((employee) => (!department || employee.businessUnitName === department)
      && (!keyword || `${employee.employeeCode} ${employee.fullName} ${employee.businessUnitName}`.toLocaleLowerCase('vi').includes(keyword)));
  }, [department, employees, search]);
  const selectable = visible.filter((employee) => byEmployee.has(employee.id));
  const allSelected = selectable.length > 0 && selectable.every((employee) => selected.has(employee.id));

  function toggleAll() {
    setSelected((current) => {
      const next = new Set(current);
      if (allSelected) selectable.forEach((employee) => next.delete(employee.id));
      else selectable.forEach((employee) => next.add(employee.id));
      return next;
    });
  }

  async function push() {
    if (!selectedConnectionId || !selected.size) return;
    if (!window.confirm(`Nạp ${selected.size} nhân viên đã chọn vào máy chấm công? Dữ liệu cùng ID trên máy có thể được cập nhật.`)) return;
    setBusy(true); setError(''); setResult(null);
    try { setResult(await pushEmployeesToDevice(request, selectedConnectionId, Array.from(selected))); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể nạp dữ liệu vào máy'); }
    finally { setBusy(false); }
  }

  return <section className="attendance-panel attendance-device-manager">
    <header><div><h2>Quản lý máy chấm công từ xa</h2><p>Chọn nhân viên đã ánh xạ ID chấm công để tạo hoặc cập nhật hồ sơ trên máy.</p></div>
      <button className="nova-button primary" disabled={busy || !selectedConnectionId || !selected.size} onClick={() => void push()}><Upload />{busy ? 'Đang nạp…' : `Nạp vào máy (${selected.size})`}</button>
    </header>
    <div className="attendance-device-toolbar">
      <label><span>Máy chấm công</span><select value={selectedConnectionId} onChange={(event) => setConnectionId(event.target.value)}><option value="">Chọn máy</option>{devices.map((source) => <option key={source.id} value={source.id}>{source.name} · {source.code}</option>)}</select></label>
      <label><span>Phòng ban</span><select value={department} onChange={(event) => setDepartment(event.target.value)}><option value="">Tất cả phòng ban</option>{departments.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label className="search"><span>Tìm nhân viên</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Mã, họ tên hoặc phòng ban" /></label>
    </div>
    {!devices.length && <div className="nova-info-note"><TriangleAlert /><span>Chưa có kết nối máy chấm công đang hoạt động. Hãy tạo kết nối trong Cấu hình hệ thống.</span></div>}
    <div className="nova-info-note"><ShieldCheck /><span>ERP chỉ gửi mã chấm công, mã nhân viên và họ tên. Mật khẩu thiết bị được đọc từ biến môi trường ở backend và không xuất hiện trên trình duyệt.</span></div>
    {error && <div className="performance-error"><TriangleAlert />{error}</div>}
    {result && <div className={result.failed ? 'performance-error' : 'performance-success'}>{result.failed ? <TriangleAlert /> : <Check />}{result.message}</div>}
    {result?.failures.map((failure, index) => <div className="attendance-device-failure" key={`${failure.attendanceId}-${index}`}><code>{failure.attendanceId ?? '—'}</code><span>{failure.employeeCode ?? 'Không xác định'} · {failure.message}</span></div>)}
    <div className="attendance-device-table-wrap"><table className="attendance-device-table"><thead><tr><th><input type="checkbox" aria-label="Chọn tất cả nhân viên đã ánh xạ" checked={allSelected} onChange={toggleAll} /></th><th>Nhân viên</th><th>Phòng ban</th><th>ID chấm công</th><th>Trạng thái</th></tr></thead><tbody>{visible.map((employee) => { const mapping = byEmployee.get(employee.id); return <tr key={employee.id} className={!mapping ? 'unmapped' : ''}><td><input type="checkbox" disabled={!mapping} checked={selected.has(employee.id)} onChange={() => setSelected((current) => { const next = new Set(current); if (next.has(employee.id)) next.delete(employee.id); else next.add(employee.id); return next; })} /></td><td><b>{employee.fullName}</b><small>{employee.employeeCode} · {employee.jobTitle || 'Chưa có chức danh'}</small></td><td>{employee.businessUnitName}</td><td><code>{mapping?.externalAttendanceId ?? 'Chưa ánh xạ'}</code></td><td><span className={mapping ? 'mapped' : 'unmapped'}>{mapping ? 'Sẵn sàng nạp' : 'Cần ánh xạ ID'}</span></td></tr>; })}</tbody></table></div>
  </section>;
}
