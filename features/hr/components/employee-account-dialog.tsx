'use client';

import { KeyRound, Plus, ShieldCheck, Trash2, UserRound, UsersRound, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/features/auth/context/auth-context';
import { assignAccountRole, listAccountRoles, listRoles, removeAccountRole } from '@/features/accounts/api/accounts-api';
import type { Role, UserRoleAssignment } from '@/features/accounts/types/account';
import { linkEmployeeAccount, listEmployeeAccountOptions, unlinkEmployeeAccount } from '../api/hr-api';
import type { Employee, EmployeeAccountOption } from '../types/hr';

export default function EmployeeAccountDialog({ employee, employees, onClose, onChanged }: {
  employee: Employee;
  employees: Employee[];
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const { user, request } = useAuth();
  const [accounts, setAccounts] = useState<EmployeeAccountOption[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [assignments, setAssignments] = useState<UserRoleAssignment[]>([]);
  const [accountId, setAccountId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [scopeType, setScopeType] = useState<'DEPARTMENT' | 'GLOBAL'>('DEPARTMENT');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const canManageSecurity = user?.permissions.includes('SECURITY.MANAGE') ?? false;

  useEffect(() => {
    let active = true;
    const requests: Promise<unknown>[] = [
      listEmployeeAccountOptions(request).then((items) => { if (active) setAccounts(items); }),
    ];
    if (canManageSecurity && employee.authUserId) {
      requests.push(
        listRoles(request).then((items) => { if (active) setRoles(items); }),
        listAccountRoles(request, employee.authUserId).then((items) => { if (active) setAssignments(items); }),
      );
    }
    Promise.all(requests)
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Không tải được danh sách tài khoản'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [canManageSecurity, employee.authUserId, request]);

  const currentAccount = accounts.find((item) => item.id === employee.authUserId);
  const linkedAccountIds = useMemo(() => new Set(employees.map((item) => item.authUserId)
    .filter((id): id is string => Boolean(id))), [employees]);
  const availableAccounts = accounts.filter((item) =>
    item.status === 'ACTIVE' && item.employeeId === null && !linkedAccountIds.has(item.id));
  const activeAssignments = assignments.filter((item) => item.active);
  const assignedRoleIds = new Set(activeAssignments.map((item) => item.roleId));
  const availableRoles = roles.filter((role) => role.active && !assignedRoleIds.has(role.id));
  const directReports = employees.filter((item) => item.managerId === employee.id && item.employmentStatus !== 'TERMINATED');
  const hierarchyLabel = directReports.length ? 'Trưởng nhóm / trưởng phòng' : 'Nhân viên';

  async function link() {
    if (!accountId) return;
    setBusy(true); setError('');
    try {
      await linkEmployeeAccount(request, employee.id, accountId);
      await onChanged();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể liên kết tài khoản');
    } finally { setBusy(false); }
  }

  async function unlink() {
    if (!employee.authUserId || !window.confirm(`Gỡ tài khoản “${employee.authUsername}” khỏi hồ sơ ${employee.fullName}?`)) return;
    setBusy(true); setError('');
    try {
      await unlinkEmployeeAccount(request, employee.id);
      await onChanged();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể gỡ liên kết tài khoản');
    } finally { setBusy(false); }
  }

  async function assignRole() {
    if (!employee.authUserId || !roleId) return;
    setBusy(true); setError('');
    try {
      await assignAccountRole(
        request,
        employee.authUserId,
        roleId,
        scopeType,
        scopeType === 'DEPARTMENT' ? employee.businessUnitId : null,
      );
      setAssignments(await listAccountRoles(request, employee.authUserId));
      setRoleId('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể gán vai trò');
    } finally { setBusy(false); }
  }

  async function removeRole(assignment: UserRoleAssignment) {
    if (!employee.authUserId || !window.confirm(`Gỡ vai trò “${assignment.roleName}” khỏi ${employee.fullName}?`)) return;
    setBusy(true); setError('');
    try {
      await removeAccountRole(request, employee.authUserId, assignment.assignmentId);
      setAssignments(await listAccountRoles(request, employee.authUserId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể gỡ vai trò');
    } finally { setBusy(false); }
  }

  return <div className="nova-overlay"><section className="nova-dialog hr-dialog compact employee-account-dialog">
    <header><div><p>TÀI KHOẢN NHÂN VIÊN</p><h2>Liên kết tài khoản đăng nhập</h2><span>{employee.fullName} · {employee.employeeCode}</span></div><button onClick={onClose}><X /></button></header>
    <div className="nova-dialog-body">
      <div className="employee-link-summary"><span><UserRound /></span><div><small>HỒ SƠ NHÂN VIÊN</small><b>{employee.fullName}</b><p>{employee.departmentName}{employee.jobTitleName ? ` · ${employee.jobTitleName}` : ''}</p></div></div>
      <div className="employee-hierarchy-card">
        <div><span><UsersRound /></span><div><small>CẤP BẬC TRONG PHÒNG BAN</small><b>{hierarchyLabel}</b><p>{employee.managerName ? `Quản lý trực tiếp: ${employee.managerName}` : 'Chưa chỉ định người quản lý trực tiếp'}</p></div></div>
        <dl><div><dt>Phòng ban</dt><dd>{employee.departmentName}</dd></div><div><dt>Nhân sự trực thuộc</dt><dd>{directReports.length} người</dd></div></dl>
        <small className="employee-hierarchy-help">Cấp quản lý lấy theo cơ cấu nhân sự, độc lập với role chức năng. Dùng nút sửa hồ sơ để đổi người quản lý trực tiếp.</small>
      </div>
      {employee.authUserId ? <div className="employee-linked-account"><div><small>TÀI KHOẢN ĐANG LIÊN KẾT</small><b>{employee.authUsername || currentAccount?.username || employee.authUserId}</b><span>{currentAccount?.email || 'Tài khoản có thể đăng nhập để xem hồ sơ này'}</span></div><button className="nova-button danger" disabled={busy} onClick={() => void unlink()}><X />Gỡ liên kết</button></div>
        : <label><span>Chọn tài khoản được cấp cho nhân viên</span><select value={accountId} disabled={loading || busy} onChange={(event) => setAccountId(event.target.value)}><option value="">{loading ? 'Đang tải tài khoản…' : 'Chọn tài khoản chưa liên kết'}</option>{availableAccounts.map((item) => <option key={item.id} value={item.id}>{item.username} · {item.email}</option>)}</select><small>Chỉ hiển thị tài khoản đang hoạt động và chưa gắn với nhân viên khác.</small></label>}
      {employee.authUserId && canManageSecurity && <section className="employee-functional-roles">
        <header><div><small>ROLE CHỨC NĂNG</small><h3>Chức năng được phép sử dụng</h3><p>Role không quyết định cấp bậc; role chỉ cấp quyền dùng màn hình và nghiệp vụ.</p></div><span>{activeAssignments.length}</span></header>
        <div className="employee-role-list">
          {activeAssignments.map((assignment) => <article key={assignment.assignmentId}><span><ShieldCheck /></span><div><b>{assignment.roleName}</b><small>{assignment.roleCode} · {assignment.scopeType === 'GLOBAL' ? 'Toàn hệ thống' : assignment.scopeType === 'DEPARTMENT' ? employee.departmentName : assignment.scopeType}</small></div><button disabled={busy} onClick={() => void removeRole(assignment)} aria-label={`Gỡ ${assignment.roleName}`}><Trash2 /></button></article>)}
          {!loading && !activeAssignments.length && <p className="employee-role-empty">Tài khoản chưa có role chức năng.</p>}
        </div>
        <div className="employee-role-assign"><select value={roleId} onChange={(event) => setRoleId(event.target.value)}><option value="">Chọn role cần thêm</option>{availableRoles.map((role) => <option key={role.id} value={role.id}>{role.name} · {role.permissionCount} quyền</option>)}</select><select value={scopeType} onChange={(event) => setScopeType(event.target.value as 'DEPARTMENT' | 'GLOBAL')}><option value="DEPARTMENT">Trong {employee.departmentName}</option><option value="GLOBAL">Toàn hệ thống</option></select><button className="nova-button primary" disabled={!roleId || busy} onClick={() => void assignRole()}><Plus />Thêm role</button></div>
      </section>}
      {employee.authUserId && !canManageSecurity && <div className="nova-info-note"><ShieldCheck /><span>Bạn có thể liên kết tài khoản nhưng cần quyền <code>SECURITY.MANAGE</code> để thêm hoặc gỡ role chức năng.</span></div>}
      {error && <div className="nova-form-error">{error}</div>}
    </div>
    <footer><button className="nova-button secondary" onClick={onClose}>Đóng</button>{!employee.authUserId && <button className="nova-button primary" disabled={!accountId || busy} onClick={() => void link()}><KeyRound />{busy ? 'Đang liên kết…' : 'Liên kết tài khoản'}</button>}</footer>
  </section></div>;
}
