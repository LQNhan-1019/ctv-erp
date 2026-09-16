'use client';

import { Building2, Check, Folder, KeyRound, Pencil, Plug, Plus, RefreshCw, Save, Search, ShieldCheck, Trash2, Users, X } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/features/auth/context/auth-context';
import { useBulkSelection } from '@/features/administration/hooks/use-bulk-selection';
import EmployeeAccountDialog from './employee-account-dialog';
import {
  createDepartment, createEmployee, listAmisHrSources, listDepartments,
  listHrEmployees, listJobTitles, syncAmisHr, updateDepartment, updateEmployee,
  deleteAmisHrStructure, deleteEmployee, deleteEmployees, refreshAmisHr,
} from '../api/hr-api';
import type {
  AmisHrSource, Department, DepartmentInput, Employee, EmployeeInput, JobTitle,
} from '../types/hr';

const statusLabels: Record<Employee['employmentStatus'], string> = {
  PROBATION: 'Thử việc', ACTIVE: 'Đang làm việc', ON_LEAVE: 'Tạm nghỉ',
  SUSPENDED: 'Tạm đình chỉ', TERMINATED: 'Đã nghỉ việc',
};
const today = new Date().toISOString().slice(0, 10);
const value = (data: FormData, key: string) => String(data.get(key) ?? '').trim();
const nullable = (data: FormData, key: string) => value(data, key) || null;

export default function HrManagementPage() {
  const { user, request } = useAuth();
  const canView = user?.permissions.includes('HR.VIEW') ?? false;
  const canManage = user?.permissions.includes('HR.MANAGE') ?? false;
  const [tab, setTab] = useState<'employees' | 'departments'>('employees');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [jobs, setJobs] = useState<JobTitle[]>([]);
  const [sources, setSources] = useState<AmisHrSource[]>([]);
  const [sourceId, setSourceId] = useState('');
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [employeeDialog, setEmployeeDialog] = useState<Employee | null | undefined>();
  const [departmentDialog, setDepartmentDialog] = useState<Department | null | undefined>();
  const [accountDialog, setAccountDialog] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [employeeRows, departmentRows, jobRows, sourceRows] = await Promise.all([
        listHrEmployees(request), listDepartments(request), listJobTitles(request),
        canManage ? listAmisHrSources(request) : Promise.resolve([]),
      ]);
      setEmployees(employeeRows);
      setDepartments(departmentRows);
      setJobs(jobRows);
      setSources(sourceRows);
      setSourceId((current) => current || sourceRows[0]?.id || '');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không tải được dữ liệu nhân sự');
    } finally {
      setLoading(false);
    }
  }, [canManage, request]);

  useEffect(() => {
    if (!canView) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [canView, load]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const visibleEmployees = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('vi');
    return employees.filter((item) =>
      (!departmentFilter || item.businessUnitId === departmentFilter) &&
      (!statusFilter || item.employmentStatus === statusFilter) &&
      (!term || [item.employeeCode, item.fullName, item.workEmail ?? '', item.phone ?? '']
        .some((entry) => entry.toLocaleLowerCase('vi').includes(term))));
  }, [departmentFilter, employees, search, statusFilter]);
  const active = employees.filter((item) => item.employmentStatus === 'ACTIVE').length;
  const linked = employees.filter((item) => item.amisLinked).length;
  const linkedAccounts = employees.filter((item) => item.authUserId).length;
  const directReportCounts = useMemo(() => employees.reduce<Map<string, number>>((counts, item) => {
    if (item.managerId && item.employmentStatus !== 'TERMINATED') {
      counts.set(item.managerId, (counts.get(item.managerId) ?? 0) + 1);
    }
    return counts;
  }, new Map()), [employees]);
  const departmentOptions = departments.filter((item) => item.active);
  const selection = useBulkSelection(visibleEmployees);

  async function runSync() {
    if (!sourceId) return;
    setBusy('sync');
    setError('');
    try {
      const result = await syncAmisHr(request, sourceId);
      setToast(`${result.message}: ${result.createdEmployees} mới, ${result.updatedEmployees} cập nhật, ${result.relinkedAttendanceEvents} log chấm công được ghép.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể đồng bộ AMIS Nhân sự');
    } finally {
      setBusy('');
    }
  }

  async function runRefresh() {
    if (!sourceId || !window.confirm('Xóa toàn bộ liên kết cơ cấu AMIS HR cũ và nạp lại từ đầu? Dữ liệu nghiệp vụ nội bộ vẫn được giữ nguyên.')) return;
    setBusy('refresh-amis');
    setError('');
    try {
      const result = await refreshAmisHr(request, sourceId);
      setToast(`${result.message}: ${result.createdEmployees} mới, ${result.updatedEmployees} cập nhật.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể làm mới cơ cấu AMIS HR');
    } finally {
      setBusy('');
    }
  }

  async function runDeleteStructure() {
    if (!sourceId || !window.confirm('Xóa cơ cấu phòng ban đã đồng bộ từ AMIS HR? Các phòng ban và chức danh AMIS sẽ bị ẩn; hồ sơ nhân viên, chấm công và dữ liệu nghiệp vụ vẫn được giữ nguyên.')) return;
    setBusy('delete-amis-structure');
    setError('');
    try {
      const result = await deleteAmisHrStructure(request, sourceId);
      setToast(`${result.message}. Đã ẩn ${result.deactivatedDepartments} phòng ban và ${result.deactivatedJobTitles} chức danh.`);
      setDepartmentFilter('');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể xóa cơ cấu phòng ban AMIS HR');
    } finally {
      setBusy('');
    }
  }

  async function saveEmployee(input: EmployeeInput) {
    setBusy('employee');
    try {
      if (employeeDialog) await updateEmployee(request, employeeDialog.id, input);
      else await createEmployee(request, input);
      setEmployeeDialog(undefined);
      setToast(employeeDialog ? 'Đã cập nhật hồ sơ nhân viên' : 'Đã thêm nhân viên');
      await load();
    } finally { setBusy(''); }
  }

  async function saveDepartment(input: DepartmentInput) {
    setBusy('department');
    try {
      if (departmentDialog) await updateDepartment(request, departmentDialog.id, input);
      else await createDepartment(request, input);
      setDepartmentDialog(undefined);
      setToast(departmentDialog ? 'Đã cập nhật phòng ban' : 'Đã thêm phòng ban');
      await load();
    } finally { setBusy(''); }
  }

  async function removeEmployee(item: Employee) {
    if (!window.confirm(`Xóa hồ sơ nhân viên “${item.fullName}” và toàn bộ dữ liệu chấm công liên quan? Tài khoản đăng nhập (nếu có) vẫn được giữ lại nhưng sẽ tự gỡ khỏi hồ sơ.`)) return;
    setBusy(item.id); setError('');
    try {
      await deleteEmployee(request, item.id);
      setToast('Đã xóa hồ sơ nhân viên');
      selection.clear();
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể xóa nhân viên'); }
    finally { setBusy(''); }
  }

  async function removeSelectedEmployees() {
    if (!selection.selectedIds.length || !window.confirm(`Xóa ${selection.selectedIds.length} hồ sơ nhân viên đã chọn cùng toàn bộ dữ liệu chấm công liên quan? Các tài khoản đăng nhập vẫn được giữ lại.`)) return;
    setBusy('bulk-employees'); setError('');
    try {
      const result = await deleteEmployees(request, selection.selectedIds);
      setToast(`Đã xóa ${result.deleted} hồ sơ nhân viên`);
      selection.clear();
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể xóa các nhân viên đã chọn'); }
    finally { setBusy(''); }
  }

  if (!canView) return <section className="nova-access-denied"><span><ShieldCheck /></span><p>KHÔNG ĐỦ QUYỀN</p><h1>Bạn không thể xem hồ sơ nhân sự.</h1><div>Cần quyền <code>HR.VIEW</code>.</div></section>;

  return <div className="nova-account-page hr-page">
    <header className="nova-page-header hr-header">
      <div><p className="nova-eyebrow">HỒ SƠ & CƠ CẤU</p><h1>Nhân viên và phòng ban</h1><span>Quản lý dữ liệu nội bộ, đồng bộ một chiều từ MISA AMIS Nhân sự và ghép mã chấm công.</span></div>
      {canManage && <div className="hr-header-actions"><button className="nova-button secondary" onClick={() => setDepartmentDialog(null)}><Folder />Thêm phòng ban</button><button className="nova-button primary" onClick={() => setEmployeeDialog(null)}><Plus />Thêm nhân viên</button></div>}
    </header>

    <section className="hr-summary">
      <article><span><Users /></span><div><small>TỔNG HỒ SƠ</small><b>{employees.length}</b></div></article>
      <article><span><Check /></span><div><small>ĐANG LÀM VIỆC</small><b>{active}</b></div></article>
      <article><span><Folder /></span><div><small>PHÒNG BAN</small><b>{departments.filter((item) => item.unitType === 'DEPARTMENT').length}</b></div></article>
      <article><span><Plug /></span><div><small>ĐÃ GHÉP AMIS HR</small><b>{linked}</b></div></article>
      <article><span><KeyRound /></span><div><small>TÀI KHOẢN ĐÃ GẮN</small><b>{linkedAccounts}</b></div></article>
    </section>

    {canManage && <section className="hr-sync-panel">
      <div><span><RefreshCw /></span><div><b>Đồng bộ AMIS Nhân sự</b><small>Cơ cấu tổ chức → vị trí công việc → nhân viên → ghép log chấm công</small></div></div>
      <select value={sourceId} onChange={(event) => setSourceId(event.target.value)}><option value="">Chọn kết nối AMIS HR</option>{sources.map((source) => <option key={source.id} value={source.id}>{source.name} · {source.code}</option>)}</select>
      <div className="hr-sync-actions"><button className="nova-button danger" disabled={!sourceId || Boolean(busy)} onClick={() => void runDeleteStructure()}><Trash2 />{busy === 'delete-amis-structure' ? 'Đang xóa…' : 'Xóa cơ cấu phòng ban'}</button><button className="nova-button secondary" disabled={!sourceId || Boolean(busy)} onClick={() => void runRefresh()}><RefreshCw className={busy === 'refresh-amis' ? 'spin' : ''} />{busy === 'refresh-amis' ? 'Đang làm mới…' : 'Làm mới toàn bộ'}</button><button className="nova-button primary" disabled={!sourceId || Boolean(busy)} onClick={() => void runSync()}><RefreshCw className={busy === 'sync' ? 'spin' : ''} />{busy === 'sync' ? 'Đang đồng bộ…' : 'Đồng bộ ngay'}</button></div>
      {!sources.length && <p>Chưa có nguồn AMIS HR. Tạo loại “MISA AMIS Nhân sự” tại Kết nối hệ thống trước.</p>}
    </section>}

    <nav className="hr-tabs"><button className={tab === 'employees' ? 'active' : ''} onClick={() => setTab('employees')}>Danh sách nhân viên</button><button className={tab === 'departments' ? 'active' : ''} onClick={() => setTab('departments')}>Cơ cấu phòng ban</button></nav>
    {error && <div className="nova-panel-error"><span>{error}</span><button onClick={() => void load()}>Thử lại</button></div>}

    {tab === 'employees' && <section className="hr-content-card">
      <div className="hr-toolbar"><label><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm mã, tên, email, số điện thoại…" /></label><select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}><option value="">Tất cả phòng ban</option>{departmentOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">Tất cả trạng thái</option>{Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><output>{visibleEmployees.length} hồ sơ</output></div>
      {canManage && selection.selectedCount > 0 && <div className="hr-bulk-toolbar bulk-delete-toolbar"><span>Đã chọn <b>{selection.selectedCount}</b> nhân viên</span><button className="nova-button danger" disabled={busy === 'bulk-employees'} onClick={() => void removeSelectedEmployees()}><Trash2 />{busy === 'bulk-employees' ? 'Đang xóa…' : 'Xóa đã chọn'}</button></div>}
      <div className="hr-table-wrap"><table className="hr-table"><thead><tr><th className="selection-column">{canManage && <input type="checkbox" aria-label="Chọn tất cả nhân viên đang hiển thị" checked={selection.allSelected} onChange={selection.toggleAll} />}</th><th>Nhân viên</th><th>Phòng ban</th><th>Chức danh</th><th>Cấp / quản lý trực tiếp</th><th>Liên hệ</th><th>Ngày vào làm</th><th>Trạng thái</th><th>Nguồn</th><th>Tài khoản</th><th /></tr></thead><tbody>
        {!loading && visibleEmployees.map((item) => { const reportCount = directReportCounts.get(item.id) ?? 0; return <tr key={item.id} className={selection.selected.has(item.id) ? 'selected-row' : ''}><td className="selection-column">{canManage && <input type="checkbox" aria-label={`Chọn ${item.fullName}`} checked={selection.selected.has(item.id)} onChange={() => selection.toggle(item.id)} />}</td><td><b>{item.fullName}</b><small>{item.employeeCode}</small></td><td>{item.departmentName}<small>{item.departmentCode}</small></td><td>{item.jobTitleName || '—'}</td><td><span className={reportCount ? 'hr-hierarchy-badge manager' : 'hr-hierarchy-badge'}>{reportCount ? `Quản lý · ${reportCount} người` : 'Nhân viên'}</span><small>{item.managerName ? `Báo cáo cho ${item.managerName}` : 'Không có quản lý trực tiếp'}</small></td><td>{item.workEmail || item.phone || '—'}{item.workEmail && item.phone && <small>{item.phone}</small>}</td><td>{formatDate(item.hiredOn)}</td><td><em className={item.employmentStatus.toLowerCase()}>{statusLabels[item.employmentStatus]}</em></td><td><span className={item.amisLinked ? 'hr-source amis' : 'hr-source'}>{item.amisLinked ? 'AMIS HR' : 'Nội bộ'}</span></td><td><span className={item.authUserId ? 'hr-account linked' : 'hr-account'}>{item.authUsername || 'Chưa gắn'}</span></td><td><div className="hr-row-actions">{canManage && <><button onClick={() => setAccountDialog(item)} aria-label={'Phân quyền tài khoản ' + item.fullName}><KeyRound /></button><button onClick={() => setEmployeeDialog(item)} aria-label={'Sửa ' + item.fullName}><Pencil /></button><button className="danger" disabled={busy === item.id} onClick={() => void removeEmployee(item)} aria-label={'Xóa ' + item.fullName}><Trash2 /></button></>}</div></td></tr>; })}
      </tbody></table>{!loading && !visibleEmployees.length && <div className="hr-empty">Chưa có nhân viên phù hợp bộ lọc.</div>}{loading && <div className="hr-empty">Đang tải dữ liệu…</div>}</div>
    </section>}

    {tab === 'departments' && <section className="hr-department-grid">{departments.map((item) => <article key={item.id} className={!item.active ? 'inactive' : ''}><header><span>{item.unitType === 'COMPANY' ? <Building2 /> : <Folder />}</span><div><small>{item.code}</small><h2>{item.name}</h2></div>{canManage && item.unitType === 'DEPARTMENT' && <button onClick={() => setDepartmentDialog(item)}><Pencil /></button>}</header><dl><div><dt>Đơn vị cha</dt><dd>{item.parentName || 'Đơn vị gốc'}</dd></div><div><dt>Nhân sự hoạt động</dt><dd>{item.employeeCount}</dd></div><div><dt>Nguồn dữ liệu</dt><dd>{item.amisLinked ? 'AMIS HR' : 'Nội bộ'}</dd></div></dl><footer>{item.active ? 'Đang sử dụng' : 'Tạm dừng'}</footer></article>)}</section>}

    {employeeDialog !== undefined && <EmployeeDialog employee={employeeDialog} employees={employees} departments={departmentOptions} jobs={jobs} busy={busy === 'employee'} onClose={() => setEmployeeDialog(undefined)} onSave={saveEmployee} />}
    {departmentDialog !== undefined && <DepartmentDialog department={departmentDialog} departments={departmentOptions} busy={busy === 'department'} onClose={() => setDepartmentDialog(undefined)} onSave={saveDepartment} />}
    {accountDialog && <EmployeeAccountDialog employee={accountDialog} employees={employees} onClose={() => setAccountDialog(null)} onChanged={load} />}
    {toast && <div className="nova-admin-toast"><span><Check /></span>{toast}</div>}
  </div>;
}

function EmployeeDialog({ employee, employees, departments, jobs, busy, onClose, onSave }: { employee: Employee | null; employees: Employee[]; departments: Department[]; jobs: JobTitle[]; busy: boolean; onClose: () => void; onSave: (input: EmployeeInput) => Promise<void> }) {
  const [error, setError] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState(employee?.businessUnitId ?? departments[0]?.id ?? '');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const status = value(data, 'employmentStatus') as Employee['employmentStatus'];
    try {
      setError('');
      await onSave({ employeeCode: value(data, 'employeeCode'), fullName: value(data, 'fullName'), businessUnitId: value(data, 'businessUnitId'), jobTitleId: nullable(data, 'jobTitleId'), managerId: nullable(data, 'managerId'), gender: nullable(data, 'gender') as Employee['gender'], dateOfBirth: nullable(data, 'dateOfBirth'), workEmail: nullable(data, 'workEmail'), personalEmail: null, phone: nullable(data, 'phone'), hiredOn: value(data, 'hiredOn'), terminatedOn: status === 'TERMINATED' ? nullable(data, 'terminatedOn') : null, employmentStatus: status });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể lưu nhân viên'); }
  }
  return <div className="nova-overlay"><section className="nova-dialog hr-dialog"><header><div><p>HỒ SƠ NHÂN SỰ</p><h2>{employee ? 'Chỉnh sửa nhân viên' : 'Thêm nhân viên'}</h2><span>Mã nhân viên phải trùng mã dùng cho chấm công.</span></div><button onClick={onClose}><X /></button></header><form onSubmit={submit}><div className="nova-dialog-body">
    <div className="nova-form-grid"><label><span>Mã nhân viên</span><input name="employeeCode" defaultValue={employee?.employeeCode} required maxLength={255} /></label><label><span>Họ và tên</span><input name="fullName" defaultValue={employee?.fullName} required maxLength={255} /></label></div>
    <div className="nova-form-grid"><label><span>Phòng ban</span><select name="businessUnitId" value={selectedDepartment} onChange={(event) => setSelectedDepartment(event.target.value)} required><option value="">Chọn phòng ban</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label><span>Chức danh</span><select name="jobTitleId" defaultValue={employee?.jobTitleId ?? ''}><option value="">Chưa xác định</option>{jobs.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
    <label><span>Trưởng phòng phê duyệt công việc</span><select name="managerId" defaultValue={employee?.managerId ?? ''}><option value="">Tự nhận diện từ role trưởng phòng</option>{employees.filter((item) => item.id !== employee?.id && item.businessUnitId === selectedDepartment && item.employmentStatus !== 'TERMINATED').map((item) => <option key={item.id} value={item.id}>{item.employeeCode} · {item.fullName}</option>)}</select><small>Ưu tiên người được chọn; nếu để trống hệ thống chỉ tự chọn khi phòng ban có đúng một người có quyền duyệt.</small></label>
    <div className="nova-form-grid three"><label><span>Giới tính</span><select name="gender" defaultValue={employee?.gender ?? ''}><option value="">Chưa xác định</option><option value="MALE">Nam</option><option value="FEMALE">Nữ</option><option value="OTHER">Khác</option></select></label><label><span>Ngày sinh</span><input type="date" name="dateOfBirth" defaultValue={employee?.dateOfBirth ?? ''} /></label><label><span>Ngày vào làm</span><input type="date" name="hiredOn" defaultValue={employee?.hiredOn ?? today} required /></label></div>
    <div className="nova-form-grid"><label><span>Email công việc</span><input type="email" name="workEmail" defaultValue={employee?.workEmail ?? ''} /></label><label><span>Số điện thoại</span><input name="phone" defaultValue={employee?.phone ?? ''} /></label></div>
    <div className="nova-form-grid"><label><span>Trạng thái</span><select name="employmentStatus" defaultValue={employee?.employmentStatus ?? 'ACTIVE'}>{Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label><span>Ngày nghỉ việc (nếu có)</span><input type="date" name="terminatedOn" defaultValue={employee?.terminatedOn ?? ''} /></label></div>
    {error && <div className="nova-form-error">{error}</div>}
  </div><footer><button type="button" className="nova-button secondary" onClick={onClose}>Hủy</button><button className="nova-button primary" disabled={busy}><Save />{busy ? 'Đang lưu…' : 'Lưu nhân viên'}</button></footer></form></section></div>;
}

function DepartmentDialog({ department, departments, busy, onClose, onSave }: { department: Department | null; departments: Department[]; busy: boolean; onClose: () => void; onSave: (input: DepartmentInput) => Promise<void> }) {
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    try { setError(''); await onSave({ parentId: nullable(data, 'parentId'), code: value(data, 'code').toUpperCase(), name: value(data, 'name'), active: data.get('active') === 'on' }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể lưu phòng ban'); }
  }
  return <div className="nova-overlay"><section className="nova-dialog hr-dialog compact"><header><div><p>CƠ CẤU TỔ CHỨC</p><h2>{department ? 'Chỉnh sửa phòng ban' : 'Thêm phòng ban'}</h2></div><button onClick={onClose}><X /></button></header><form onSubmit={submit}><div className="nova-dialog-body"><label><span>Đơn vị cha</span><select name="parentId" defaultValue={department?.parentId ?? ''}><option value="">Công ty gốc</option>{departments.filter((item) => item.id !== department?.id).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><div className="nova-form-grid"><label><span>Mã phòng ban</span><input name="code" defaultValue={department?.code} pattern="[A-Za-z0-9._-]+" required maxLength={32} /></label><label><span>Tên phòng ban</span><input name="name" defaultValue={department?.name} required maxLength={255} /></label></div><label className="nova-switch-label"><span>Trạng thái</span><div><input type="checkbox" name="active" defaultChecked={department?.active ?? true} /><b>Cho phép sử dụng</b></div></label>{error && <div className="nova-form-error">{error}</div>}</div><footer><button type="button" className="nova-button secondary" onClick={onClose}>Hủy</button><button className="nova-button primary" disabled={busy}><Save />{busy ? 'Đang lưu…' : 'Lưu phòng ban'}</button></footer></form></section></div>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN').format(new Date(value + 'T00:00:00'));
}
