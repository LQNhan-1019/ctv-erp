'use client';

import { KeyRound, Plus, ShieldCheck, X } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { assignGlobalRole, listAccountRoles, removeAccountRole, resetAccountPassword, type AuthorizedRequest } from '../api/accounts-api';
import type { Role, UserAccount, UserRoleAssignment } from '../types/account';

export default function AccountAccessDrawer({ account, roles, request, onClose }: {
  account: UserAccount;
  roles: Role[];
  request: AuthorizedRequest;
  onClose: () => void;
}) {
  const [assignments, setAssignments] = useState<UserRoleAssignment[]>([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setAssignments(await listAccountRoles(request, account.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không tải được quyền của tài khoản');
    } finally {
      setLoading(false);
    }
  }, [account.id, request]);

  useEffect(() => {
    let active = true;
    listAccountRoles(request, account.id)
      .then((items) => {
        if (active) setAssignments(items);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Không tải được quyền của tài khoản');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [account.id, request]);

  const availableRoles = useMemo(() => {
    const assigned = new Set(assignments.filter((item) => item.active).map((item) => item.roleId));
    return roles.filter((role) => role.active && !assigned.has(role.id));
  }, [assignments, roles]);

  async function assignRole() {
    if (!selectedRole) return;
    setWorking(true);
    setError('');
    try {
      await assignGlobalRole(request, account.id, selectedRole);
      setSelectedRole('');
      setMessage('Đã gán vai trò. Phiên đăng nhập cũ của người dùng sẽ được làm mới.');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể gán vai trò');
    } finally {
      setWorking(false);
    }
  }

  async function removeRole(assignment: UserRoleAssignment) {
    if (!window.confirm(`Gỡ vai trò “${assignment.roleName}” khỏi ${account.username}?`)) return;
    setWorking(true);
    setError('');
    try {
      await removeAccountRole(request, account.id, assignment.assignmentId);
      setMessage('Đã gỡ vai trò khỏi tài khoản.');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể gỡ vai trò');
    } finally {
      setWorking(false);
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const password = String(data.get('newPassword'));
    setWorking(true);
    setError('');
    try {
      await resetAccountPassword(request, account.id, password);
      form.reset();
      setMessage('Đã đặt lại mật khẩu và thu hồi toàn bộ phiên đăng nhập của người dùng.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể đặt lại mật khẩu');
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="nova-overlay drawer-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="nova-access-drawer" role="dialog" aria-modal="true" aria-labelledby="access-title">
        <header><div><p>QUYỀN TRUY CẬP</p><h2 id="access-title">{account.username}</h2><span>{account.email}</span></div><button onClick={onClose} aria-label="Đóng"><X /></button></header>
        <div className="nova-drawer-identity"><span>{account.username.slice(0, 2).toUpperCase()}</span><div><b>{account.username}</b><small>ID · {account.id.slice(0, 8)}…</small></div><em className={`nova-status ${account.status.toLowerCase()}`}>{account.status === 'ACTIVE' ? 'Hoạt động' : account.status === 'LOCKED' ? 'Đã khóa' : 'Tạm dừng'}</em></div>

        <section><div className="nova-drawer-title"><div><h3>Vai trò được cấp</h3><p>Phạm vi GLOBAL áp dụng trên toàn hệ thống.</p></div><span>{assignments.filter((item) => item.active).length}</span></div>
          {loading ? <div className="nova-inline-loading"><span />Đang tải vai trò…</div> : (
            <div className="nova-role-list">
              {assignments.filter((item) => item.active).map((assignment) => <article key={assignment.assignmentId}><span><ShieldCheck /></span><div><b>{assignment.roleName}</b><small>{assignment.roleCode} · {assignment.scopeType}</small></div><button onClick={() => removeRole(assignment)} disabled={working}>Gỡ</button></article>)}
              {!assignments.some((item) => item.active) && <div className="nova-empty-compact">Chưa được gán vai trò nào.</div>}
            </div>
          )}
          <div className="nova-role-assign"><select value={selectedRole} onChange={(event) => setSelectedRole(event.target.value)}><option value="">Chọn vai trò cần gán</option>{availableRoles.map((role) => <option key={role.id} value={role.id}>{role.name} ({role.permissionCount} quyền)</option>)}</select><button onClick={assignRole} disabled={!selectedRole || working}><Plus />Gán role</button></div>
        </section>

        <section><div className="nova-drawer-title"><div><h3>Đặt lại mật khẩu</h3><p>Thao tác này sẽ vô hiệu hóa mọi access/refresh token cũ.</p></div><KeyRound /></div>
          <form className="nova-reset-form" onSubmit={resetPassword}><input name="newPassword" type="password" minLength={12} maxLength={128} placeholder="Mật khẩu mới, tối thiểu 12 ký tự" required /><button disabled={working}>Cập nhật</button></form>
        </section>
        {(message || error) && <div className={`nova-drawer-message ${error ? 'error' : ''}`}>{error || message}</div>}
        <footer><ShieldCheck /><span>Mọi thay đổi quyền và mật khẩu đều được ghi vào nhật ký kiểm toán.</span></footer>
      </aside>
    </div>
  );
}
