'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/icon';
import { useAuth } from '@/features/auth/context/auth-context';
import {
  createRole,
  getRolePermissions,
  listPermissions,
  listRoles,
  replaceRolePermissions,
  updateRole,
} from '../api/roles-api';
import type { CreateRoleInput, Permission, Role } from '../types/role';

function CreateRoleDialog({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (input: CreateRoleInput) => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSubmitting(true);
    setError('');
    try {
      await onCreate({
        code: String(data.get('code')).trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_'),
        name: String(data.get('name')).trim(),
        description: String(data.get('description')).trim(),
      });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể tạo vai trò');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="nova-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="nova-dialog" role="dialog" aria-modal="true" aria-labelledby="create-role-title">
        <header><div><p>VAI TRÒ MỚI</p><h2 id="create-role-title">Tạo nhóm quyền</h2><span>Nhóm các chức năng phù hợp với một vị trí hoặc phòng ban.</span></div><button onClick={onClose} aria-label="Đóng"><Icon name="x" /></button></header>
        <form onSubmit={submit}>
          <div className="nova-dialog-body">
            <div className="nova-form-grid">
              <label><span>Mã vai trò</span><div className="nova-field"><Icon name="key" /><input name="code" minLength={3} maxLength={64} placeholder="VD. KE_TOAN_TRUONG" required /></div></label>
              <label><span>Tên hiển thị</span><div className="nova-field"><Icon name="shield" /><input name="name" maxLength={128} placeholder="Kế toán trưởng" required /></div></label>
            </div>
            <label><span>Mô tả phạm vi</span><textarea className="nova-textarea" name="description" maxLength={1000} rows={4} placeholder="Nêu rõ nhóm nhân viên và phạm vi sử dụng…" /></label>
            <div className="nova-info-note"><Icon name="shield" /><span>Sau khi tạo, chọn vai trò ở danh sách để cấp từng permission cụ thể.</span></div>
            {error && <div className="nova-form-error" role="alert">{error}</div>}
          </div>
          <footer><button type="button" className="nova-button secondary" onClick={onClose}>Hủy</button><button type="submit" className="nova-button primary" disabled={submitting}><Icon name="plus" />{submitting ? 'Đang tạo…' : 'Tạo vai trò'}</button></footer>
        </form>
      </section>
    </div>
  );
}

export default function RoleManagement() {
  const { user, request } = useAuth();
  const canManage = user?.permissions.includes('SECURITY.MANAGE') ?? false;
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<string>>(new Set());
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [permissionLoading, setPermissionLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [roleList, permissionList] = await Promise.all([listRoles(request), listPermissions(request)]);
      setRoles(roleList);
      setPermissions(permissionList.filter((permission) => permission.active));
      setSelectedRoleId((current) => current || roleList[0]?.id || '');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không tải được dữ liệu phân quyền');
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    if (!canManage) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [canManage, load]);

  useEffect(() => {
    if (!selectedRole) return;
    let mounted = true;
    const timer = window.setTimeout(() => {
      setName(selectedRole.name);
      setDescription(selectedRole.description ?? '');
      setActive(selectedRole.active);
      setPermissionLoading(true);
      getRolePermissions(request, selectedRole.id)
        .then((items) => {
          if (mounted) setSelectedPermissionIds(new Set(items.map((item) => item.id)));
        })
        .catch((cause: unknown) => {
          if (mounted) setError(cause instanceof Error ? cause.message : 'Không tải được quyền của vai trò');
        })
        .finally(() => {
          if (mounted) setPermissionLoading(false);
        });
    }, 0);
    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [request, selectedRole]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const groupedPermissions = useMemo(() => {
    return permissions.reduce<Record<string, Permission[]>>((groups, permission) => {
      (groups[permission.module] ??= []).push(permission);
      return groups;
    }, {});
  }, [permissions]);

  const visibleRoles = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return roles.filter((role) => !normalized || (role.code + ' ' + role.name).toLowerCase().includes(normalized));
  }, [query, roles]);

  function togglePermission(permissionId: string) {
    setSelectedPermissionIds((current) => {
      const next = new Set(current);
      if (next.has(permissionId)) next.delete(permissionId);
      else next.add(permissionId);
      return next;
    });
  }

  async function save() {
    if (!selectedRole || selectedRole.systemRole) return;
    setSaving(true);
    setError('');
    try {
      const updated = await updateRole(request, selectedRole.id, { name: name.trim(), description: description.trim(), active });
      await replaceRolePermissions(request, selectedRole.id, Array.from(selectedPermissionIds));
      const finalRole = { ...updated, permissionCount: selectedPermissionIds.size };
      setRoles((current) => current.map((role) => role.id === finalRole.id ? finalRole : role));
      setToast('Đã lưu vai trò ' + updated.name);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể lưu vai trò');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate(input: CreateRoleInput) {
    const created = await createRole(request, input);
    setRoles((current) => [...current, created]);
    setSelectedRoleId(created.id);
    setToast('Đã tạo vai trò ' + created.name);
  }

  if (!canManage) {
    return <section className="nova-access-denied"><span><Icon name="shield" /></span><p>KHÔNG ĐỦ QUYỀN</p><h1>Bạn không thể quản lý vai trò.</h1><div>Cần permission <code>SECURITY.MANAGE</code> để truy cập chức năng này.</div></section>;
  }

  return (
    <div className="nova-account-page nova-role-page">
      <header className="nova-page-header">
        <div><p className="nova-eyebrow">BẢO MẬT & PHÂN QUYỀN</p><h1>Vai trò và quyền</h1><span>Xếp chức năng cho nhân viên theo vai trò; backend vẫn là lớp kiểm soát cuối cùng.</span></div>
        <button className="nova-button primary" onClick={() => setCreateOpen(true)}><Icon name="plus" />Tạo vai trò</button>
      </header>

      {error && <div className="nova-panel-error"><span>{error}</span><button onClick={() => void load()}>Tải lại</button></div>}
      <section className="nova-role-layout">
        <aside className="nova-role-directory">
          <header><div><p>NHÓM TRUY CẬP</p><b>{roles.length} vai trò</b></div><button onClick={() => void load()} aria-label="Làm mới"><Icon name="refresh" /></button></header>
          <div className="nova-role-search"><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm vai trò…" /></div>
          <div className="nova-role-scroll">
            {loading && Array.from({ length: 5 }).map((_, index) => <span className="nova-role-skeleton" key={index} />)}
            {!loading && visibleRoles.map((role) => (
              <button key={role.id} className={role.id === selectedRoleId ? 'active' : ''} onClick={() => setSelectedRoleId(role.id)}>
                <span><Icon name={role.systemRole ? 'shield' : 'key'} /></span>
                <div><b>{role.name}</b><small>{role.code}</small></div>
                <em>{role.permissionCount}</em>
              </button>
            ))}
          </div>
        </aside>

        <section className="nova-role-editor">
          {!selectedRole && !loading && <div className="nova-account-empty"><span><Icon name="key" /></span><b>Chưa có vai trò</b><p>Tạo vai trò đầu tiên để bắt đầu phân quyền.</p></div>}
          {selectedRole && (
            <>
              <header>
                <div><p>CHI TIẾT VAI TRÒ</p><h2>{selectedRole.name}</h2><span>{selectedRole.code}</span></div>
                <button className="nova-button primary" onClick={() => void save()} disabled={saving || selectedRole.systemRole}><Icon name="save" />{saving ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
              </header>
              {selectedRole.systemRole && <div className="nova-info-note"><Icon name="shield" /><span>Đây là vai trò hệ thống. Thông tin và tập quyền được khóa để bảo vệ quyền quản trị nền tảng.</span></div>}
              <div className="nova-role-fields">
                <label><span>Tên hiển thị</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={128} disabled={selectedRole.systemRole} /></label>
                <label><span>Trạng thái</span><select value={active ? 'ACTIVE' : 'INACTIVE'} onChange={(event) => setActive(event.target.value === 'ACTIVE')} disabled={selectedRole.systemRole}><option value="ACTIVE">Đang hoạt động</option><option value="INACTIVE">Tạm dừng</option></select></label>
                <label className="wide"><span>Mô tả</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} maxLength={1000} disabled={selectedRole.systemRole} /></label>
              </div>
              <div className="nova-permission-heading"><div><p>PERMISSIONS</p><h3>Chức năng được sử dụng</h3></div><span>{selectedPermissionIds.size}/{permissions.length} quyền</span></div>
              <div className="nova-permission-groups">
                {permissionLoading && <div className="nova-inline-loading"><span className="nova-session-spinner" />Đang tải quyền…</div>}
                {!permissionLoading && Object.entries(groupedPermissions).map(([module, items]) => (
                  <section key={module}>
                    <header><div><span><Icon name="shield" /></span><div><b>{module}</b><small>{items.filter((item) => selectedPermissionIds.has(item.id)).length}/{items.length} quyền đã chọn</small></div></div></header>
                    <div>
                      {items.map((permission) => (
                        <label key={permission.id} className={selectedPermissionIds.has(permission.id) ? 'selected' : ''}>
                          <input type="checkbox" checked={selectedPermissionIds.has(permission.id)} onChange={() => togglePermission(permission.id)} disabled={selectedRole.systemRole} />
                          <span><b>{permission.name}</b><code>{permission.code}</code><small>{permission.description || 'Quyền thao tác trong module ' + module}</small></span>
                        </label>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </>
          )}
        </section>
      </section>
      {createOpen && <CreateRoleDialog onClose={() => setCreateOpen(false)} onCreate={handleCreate} />}
      {toast && <div className="nova-admin-toast"><span><Icon name="check" /></span>{toast}</div>}
    </div>
  );
}
