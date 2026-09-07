'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/icon';
import { useAuth } from '@/features/auth/context/auth-context';
import { createAccount, listAccounts, listRoles, updateAccountStatus } from '../api/accounts-api';
import type { CreateAccountInput, Role, UserAccount, UserStatus } from '../types/account';
import CreateAccountDialog from './create-account-dialog';
import AccountAccessDrawer from './account-access-drawer';

const statusLabel: Record<UserStatus, string> = {
  ACTIVE: 'Hoạt động',
  INACTIVE: 'Tạm dừng',
  LOCKED: 'Đã khóa',
};

function formatDate(value: string | null) {
  if (!value) return 'Chưa đăng nhập';
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
}

export default function AccountManagement() {
  const { user, request } = useAuth();
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | UserStatus>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<UserAccount | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const canManage = user?.permissions.includes('SECURITY.MANAGE') ?? false;

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [accountPage, roleList] = await Promise.all([listAccounts(request), listRoles(request)]);
      setAccounts(accountPage.items);
      setRoles(roleList);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không tải được danh sách tài khoản');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [request]);

  useEffect(() => {
    if (!canManage) return;
    let active = true;
    Promise.all([listAccounts(request), listRoles(request)])
      .then(([accountPage, roleList]) => {
        if (!active) return;
        setAccounts(accountPage.items);
        setRoles(roleList);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Không tải được danh sách tài khoản');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [canManage, request]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filteredAccounts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return accounts.filter((account) => {
      const matchesStatus = statusFilter === 'ALL' || account.status === statusFilter;
      const matchesQuery = !normalized || `${account.username} ${account.email}`.toLowerCase().includes(normalized);
      return matchesStatus && matchesQuery;
    });
  }, [accounts, query, statusFilter]);

  const metrics = useMemo(() => ({
    total: accounts.length,
    active: accounts.filter((account) => account.status === 'ACTIVE').length,
    locked: accounts.filter((account) => account.status === 'LOCKED').length,
    inactive: accounts.filter((account) => account.status === 'INACTIVE').length,
  }), [accounts]);

  async function handleCreate(input: CreateAccountInput) {
    const created = await createAccount(request, input);
    setAccounts((current) => [created, ...current]);
    setSelectedAccount(created);
    setToast(`Đã tạo tài khoản ${created.username}`);
  }

  async function changeStatus(account: UserAccount) {
    const nextStatus: UserStatus = account.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const action = nextStatus === 'ACTIVE' ? 'kích hoạt' : 'tạm dừng';
    if (!window.confirm(`Xác nhận ${action} tài khoản “${account.username}”?`)) return;
    setError('');
    try {
      const updated = await updateAccountStatus(request, account.id, nextStatus);
      setAccounts((current) => current.map((item) => item.id === updated.id ? updated : item));
      setToast(`Đã ${action} ${account.username}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Không thể ${action} tài khoản`);
    }
  }

  if (!canManage) {
    return (
      <section className="nova-access-denied">
        <span><Icon name="shield" /></span><p>KHÔNG ĐỦ QUYỀN</p><h1>Bạn không thể quản lý tài khoản.</h1><div>Tài khoản hiện tại chưa được cấp permission <code>SECURITY.MANAGE</code>.</div>
      </section>
    );
  }

  return (
    <div className="nova-account-page">
      <header className="nova-page-header">
        <div><p className="nova-eyebrow">BẢO MẬT & PHÂN QUYỀN</p><h1>Quản lý tài khoản</h1><span>Kiểm soát danh tính, trạng thái truy cập và vai trò trên toàn hệ thống.</span></div>
        <button className="nova-button primary" onClick={() => setCreateOpen(true)}><Icon name="plus" />Thêm tài khoản</button>
      </header>

      <section className="nova-account-metrics" aria-label="Tổng quan tài khoản">
        <article><span>TỔNG TÀI KHOẢN</span><strong>{metrics.total.toString().padStart(2, '0')}</strong><small>Danh tính đã đăng ký</small></article>
        <article><span>ĐANG HOẠT ĐỘNG</span><strong>{metrics.active.toString().padStart(2, '0')}</strong><small><i className="green" />Có thể đăng nhập</small></article>
        <article><span>ĐÃ KHÓA</span><strong>{metrics.locked.toString().padStart(2, '0')}</strong><small><i className="red" />Cần kiểm tra</small></article>
        <article><span>TẠM DỪNG</span><strong>{metrics.inactive.toString().padStart(2, '0')}</strong><small><i className="amber" />Không có quyền truy cập</small></article>
      </section>

      <section className="nova-account-panel">
        <div className="nova-account-toolbar">
          <div className="nova-account-search"><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tên đăng nhập hoặc email…" /></div>
          <div className="nova-status-tabs">
            {([['ALL', 'Tất cả'], ['ACTIVE', 'Hoạt động'], ['LOCKED', 'Đã khóa'], ['INACTIVE', 'Tạm dừng']] as const).map(([value, label]) => <button key={value} onClick={() => setStatusFilter(value)} className={statusFilter === value ? 'active' : ''}>{label}</button>)}
          </div>
          <button className="nova-refresh-button" onClick={() => void load(true)} disabled={refreshing} title="Làm mới"><Icon name="refresh" className={refreshing ? 'spin' : ''} /></button>
        </div>

        {error && <div className="nova-panel-error"><span>{error}</span><button onClick={() => void load()}>Thử lại</button></div>}
        <div className="nova-account-table" role="table" aria-label="Danh sách tài khoản">
          <div className="nova-account-row head" role="row"><span>NGƯỜI DÙNG</span><span>TRẠNG THÁI</span><span>LẦN ĐĂNG NHẬP CUỐI</span><span>NGÀY TẠO</span><span>THAO TÁC</span></div>
          {loading && Array.from({ length: 5 }).map((_, index) => <div className="nova-account-row skeleton" key={index}><span /><span /><span /><span /><span /></div>)}
          {!loading && filteredAccounts.map((account) => (
            <div className="nova-account-row" role="row" key={account.id}>
              <div className="nova-account-user"><span>{account.username.slice(0, 2).toUpperCase()}</span><div><b>{account.username}</b><small>{account.email}</small></div></div>
              <span><em className={`nova-status ${account.status.toLowerCase()}`}><i />{statusLabel[account.status]}</em></span>
              <span className="nova-cell-date">{formatDate(account.lastLoginAt)}<small>{account.failedLoginAttempts > 0 ? `${account.failedLoginAttempts} lần sai` : 'Đăng nhập bình thường'}</small></span>
              <span className="nova-cell-date">{formatDate(account.createdAt)}<small>v{account.securityVersion} bảo mật</small></span>
              <div className="nova-row-actions"><button onClick={() => setSelectedAccount(account)}><Icon name="shield" />Phân quyền</button><button className={account.status === 'ACTIVE' ? 'danger' : ''} onClick={() => void changeStatus(account)}>{account.status === 'ACTIVE' ? 'Tạm dừng' : 'Kích hoạt'}</button></div>
            </div>
          ))}
          {!loading && filteredAccounts.length === 0 && <div className="nova-account-empty"><span><Icon name="users" /></span><b>Không tìm thấy tài khoản</b><p>Thử thay đổi từ khóa hoặc bộ lọc trạng thái.</p></div>}
        </div>
        <footer className="nova-table-footer"><span>Hiển thị <b>{filteredAccounts.length}</b> trên {accounts.length} tài khoản</span><span>Dữ liệu bảo mật được cập nhật trực tiếp từ backend</span></footer>
      </section>

      {createOpen && <CreateAccountDialog onClose={() => setCreateOpen(false)} onCreate={handleCreate} />}
      {selectedAccount && <AccountAccessDrawer key={selectedAccount.id} account={selectedAccount} roles={roles} request={request} onClose={() => setSelectedAccount(null)} />}
      {toast && <div className="nova-admin-toast"><span><Icon name="check" /></span>{toast}</div>}
    </div>
  );
}
