'use client';

import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/icon';
import { useAuth } from '@/features/auth/context/auth-context';
import { linkEmployeeAccount, listEmployeeAccountOptions, unlinkEmployeeAccount } from '../api/hr-api';
import type { Employee, EmployeeAccountOption } from '../types/hr';

export default function EmployeeAccountDialog({ employee, employees, onClose, onChanged }: {
  employee: Employee;
  employees: Employee[];
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const { request } = useAuth();
  const [accounts, setAccounts] = useState<EmployeeAccountOption[]>([]);
  const [accountId, setAccountId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    listEmployeeAccountOptions(request)
      .then((items) => { if (active) setAccounts(items); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Không tải được danh sách tài khoản'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [request]);

  const currentAccount = accounts.find((item) => item.id === employee.authUserId);
  const linkedAccountIds = useMemo(() => new Set(employees.map((item) => item.authUserId)
    .filter((id): id is string => Boolean(id))), [employees]);
  const availableAccounts = accounts.filter((item) =>
    item.status === 'ACTIVE' && item.employeeId === null && !linkedAccountIds.has(item.id));

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

  return <div className="nova-overlay"><section className="nova-dialog hr-dialog compact employee-account-dialog">
    <header><div><p>TÀI KHOẢN NHÂN VIÊN</p><h2>Liên kết tài khoản đăng nhập</h2><span>{employee.fullName} · {employee.employeeCode}</span></div><button onClick={onClose}><Icon name="x" /></button></header>
    <div className="nova-dialog-body">
      <div className="employee-link-summary"><span><Icon name="user" /></span><div><small>HỒ SƠ NHÂN VIÊN</small><b>{employee.fullName}</b><p>{employee.departmentName}{employee.jobTitleName ? ` · ${employee.jobTitleName}` : ''}</p></div></div>
      {employee.authUserId ? <div className="employee-linked-account"><div><small>TÀI KHOẢN ĐANG LIÊN KẾT</small><b>{employee.authUsername || currentAccount?.username || employee.authUserId}</b><span>{currentAccount?.email || 'Tài khoản có thể đăng nhập để xem hồ sơ này'}</span></div><button className="nova-button danger" disabled={busy} onClick={() => void unlink()}><Icon name="x" />Gỡ liên kết</button></div>
        : <label><span>Chọn tài khoản được cấp cho nhân viên</span><select value={accountId} disabled={loading || busy} onChange={(event) => setAccountId(event.target.value)}><option value="">{loading ? 'Đang tải tài khoản…' : 'Chọn tài khoản chưa liên kết'}</option>{availableAccounts.map((item) => <option key={item.id} value={item.id}>{item.username} · {item.email}</option>)}</select><small>Chỉ hiển thị tài khoản đang hoạt động và chưa gắn với nhân viên khác.</small></label>}
      {error && <div className="nova-form-error">{error}</div>}
    </div>
    <footer><button className="nova-button secondary" onClick={onClose}>Đóng</button>{!employee.authUserId && <button className="nova-button primary" disabled={!accountId || busy} onClick={() => void link()}><Icon name="key" />{busy ? 'Đang liên kết…' : 'Liên kết tài khoản'}</button>}</footer>
  </section></div>;
}
