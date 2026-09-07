'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Icon, { type IconName } from '@/components/ui/icon';
import { useAuth } from '@/features/auth/context/auth-context';
import { getAuditLog, listAuditLogs } from '../api/audit-api';
import type { AuditFilters, AuditLog, JsonValue } from '../types/audit';

const actionLabels: Record<string, string> = {
  LOGIN_SUCCESS: 'Đăng nhập thành công',
  LOGIN_FAILED: 'Đăng nhập thất bại',
  LOGOUT: 'Đăng xuất',
  PASSWORD_CHANGED: 'Đổi mật khẩu',
  PASSWORD_RESET: 'Đặt lại mật khẩu',
  CREATE: 'Tạo dữ liệu',
  UPDATE: 'Cập nhật dữ liệu',
  DELETE: 'Xóa dữ liệu',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}

function actionTone(action: string) {
  if (action.includes('FAILED') || action.includes('DELETE')) return 'danger';
  if (action.includes('CREATE') || action.includes('SUCCESS')) return 'success';
  if (action.includes('UPDATE') || action.includes('PASSWORD')) return 'warning';
  return 'neutral';
}

function actionIcon(action: string): IconName {
  if (action.includes('LOGIN') || action.includes('LOGOUT')) return 'user';
  if (action.includes('PASSWORD')) return 'key';
  if (action.includes('DELETE') || action.includes('FAILED')) return 'alert';
  return 'edit';
}

function jsonText(value: JsonValue) {
  if (value === null || value === undefined) return 'Không có dữ liệu';
  return JSON.stringify(value, null, 2);
}

function AuditDetail({ log, loading, onClose }: { log: AuditLog | null; loading: boolean; onClose: () => void }) {
  return (
    <div className="nova-overlay nova-drawer-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="nova-audit-drawer" role="dialog" aria-modal="true" aria-labelledby="audit-detail-title">
        <header>
          <div><p>NHẬT KÝ #{log?.id ?? '…'}</p><h2 id="audit-detail-title">Chi tiết thao tác</h2><span>Dữ liệu chỉ đọc, được ghi nhận tự động bởi backend.</span></div>
          <button onClick={onClose} aria-label="Đóng"><Icon name="x" /></button>
        </header>
        {loading || !log ? <div className="nova-inline-loading"><span className="nova-session-spinner" />Đang tải chi tiết…</div> : (
          <div className="nova-audit-detail">
            <section className="nova-audit-facts">
              <div><span>Thời gian</span><b>{formatDate(log.occurredAt)}</b></div>
              <div><span>Người thực hiện</span><b>{log.username || 'Hệ thống'}</b><small>{log.userId || 'Không có user ID'}</small></div>
              <div><span>Hành động</span><b>{actionLabels[log.action] || log.action}</b><small>{log.action}</small></div>
              <div><span>Đối tượng</span><b>{log.entityType || 'Không xác định'}</b><small>{log.entityId || 'Không có entity ID'}</small></div>
              <div><span>IP / Request</span><b>{log.ipAddress || 'Không ghi nhận'}</b><small>{log.requestId || 'Không có request ID'}</small></div>
            </section>
            <section className="nova-json-section"><h3>Dữ liệu trước thay đổi</h3><pre>{jsonText(log.oldData)}</pre></section>
            <section className="nova-json-section"><h3>Dữ liệu sau thay đổi</h3><pre>{jsonText(log.newData)}</pre></section>
            <section className="nova-json-section"><h3>Thông tin bổ sung</h3><pre>{jsonText(log.metadata)}</pre></section>
          </div>
        )}
      </aside>
    </div>
  );
}

export default function AuditLogPage() {
  const { user, request } = useAuth();
  const canView = user?.permissions.includes('AUDIT.VIEW') ?? false;
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filters, setFilters] = useState<AuditFilters>({ page: 0, size: 20 });
  const [draftAction, setDraftAction] = useState('');
  const [draftEntity, setDraftEntity] = useState('');
  const [draftFrom, setDraftFrom] = useState('');
  const [draftTo, setDraftTo] = useState('');
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<AuditLog | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async (nextFilters = filters) => {
    setLoading(true);
    setError('');
    try {
      const page = await listAuditLogs(request, nextFilters);
      setLogs(page.items);
      setTotalItems(page.totalItems);
      setTotalPages(page.totalPages);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không tải được nhật ký hoạt động');
    } finally {
      setLoading(false);
    }
  }, [filters, request]);

  useEffect(() => {
    if (!canView) return;
    const timer = window.setTimeout(() => void load(filters), 0);
    return () => window.clearTimeout(timer);
  }, [canView, filters, load]);

  const metrics = useMemo(() => ({
    login: logs.filter((log) => log.action.includes('LOGIN')).length,
    changed: logs.filter((log) => ['CREATE', 'UPDATE', 'DELETE'].some((value) => log.action.includes(value))).length,
    risk: logs.filter((log) => log.action.includes('FAILED') || log.action.includes('DELETE')).length,
  }), [logs]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters({
      page: 0,
      size: 20,
      action: draftAction.trim() || undefined,
      entityType: draftEntity.trim() || undefined,
      from: draftFrom ? new Date(draftFrom).toISOString() : undefined,
      to: draftTo ? new Date(draftTo).toISOString() : undefined,
    });
  }

  function clearFilters() {
    setDraftAction('');
    setDraftEntity('');
    setDraftFrom('');
    setDraftTo('');
    setFilters({ page: 0, size: 20 });
  }

  async function openDetail(log: AuditLog) {
    setDetailOpen(true);
    setSelected(log);
    setDetailLoading(true);
    try {
      setSelected(await getAuditLog(request, log.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không tải được chi tiết nhật ký');
    } finally {
      setDetailLoading(false);
    }
  }

  if (!canView) {
    return <section className="nova-access-denied"><span><Icon name="shield" /></span><p>KHÔNG ĐỦ QUYỀN</p><h1>Bạn không thể xem nhật ký hoạt động.</h1><div>Cần permission <code>AUDIT.VIEW</code> để truy cập chức năng này.</div></section>;
  }

  return (
    <div className="nova-account-page nova-audit-page">
      <header className="nova-page-header">
        <div><p className="nova-eyebrow">GIÁM SÁT & TUÂN THỦ</p><h1>Nhật ký hoạt động</h1><span>Theo dõi đăng nhập, đổi mật khẩu và mọi thao tác chỉnh sửa dữ liệu quan trọng.</span></div>
        <button className="nova-button secondary" onClick={() => void load()} disabled={loading}><Icon name="refresh" className={loading ? 'spin' : ''} />Làm mới</button>
      </header>

      <section className="nova-audit-metrics">
        <article><span><Icon name="scroll" /></span><div><small>BẢN GHI TRANG NÀY</small><b>{logs.length}</b></div></article>
        <article><span className="green"><Icon name="user" /></span><div><small>HOẠT ĐỘNG ĐĂNG NHẬP</small><b>{metrics.login}</b></div></article>
        <article><span className="amber"><Icon name="edit" /></span><div><small>THAY ĐỔI DỮ LIỆU</small><b>{metrics.changed}</b></div></article>
        <article><span className="red"><Icon name="alert" /></span><div><small>CẦN CHÚ Ý</small><b>{metrics.risk}</b></div></article>
      </section>

      <section className="nova-account-panel">
        <form className="nova-audit-filters" onSubmit={applyFilters}>
          <label><span>Hành động</span><input value={draftAction} onChange={(event) => setDraftAction(event.target.value)} placeholder="VD. LOGIN_SUCCESS" /></label>
          <label><span>Loại dữ liệu</span><input value={draftEntity} onChange={(event) => setDraftEntity(event.target.value)} placeholder="VD. USER_ACCOUNT" /></label>
          <label><span>Từ thời điểm</span><input type="datetime-local" value={draftFrom} onChange={(event) => setDraftFrom(event.target.value)} /></label>
          <label><span>Đến thời điểm</span><input type="datetime-local" value={draftTo} onChange={(event) => setDraftTo(event.target.value)} /></label>
          <button className="nova-button primary" type="submit"><Icon name="filter" />Lọc</button>
          <button className="nova-button secondary" type="button" onClick={clearFilters}>Xóa lọc</button>
        </form>
        {error && <div className="nova-panel-error"><span>{error}</span><button onClick={() => void load()}>Thử lại</button></div>}
        <div className="nova-audit-table" role="table" aria-label="Nhật ký hoạt động">
          <div className="nova-audit-row head" role="row"><span>THỜI GIAN</span><span>NGƯỜI THỰC HIỆN</span><span>HÀNH ĐỘNG</span><span>ĐỐI TƯỢNG</span><span>ĐỊA CHỈ IP</span><span /></div>
          {loading && Array.from({ length: 7 }).map((_, index) => <div className="nova-audit-row skeleton" key={index}><span /><span /><span /><span /><span /><span /></div>)}
          {!loading && logs.map((log) => (
            <button className="nova-audit-row data" role="row" key={log.id} onClick={() => void openDetail(log)}>
              <span><b>{formatDate(log.occurredAt)}</b><small>#{log.id}</small></span>
              <span><b>{log.username || 'Hệ thống'}</b><small>{log.userId ? log.userId.slice(0, 8) : 'Tác vụ nền'}</small></span>
              <span><em className={'nova-audit-action ' + actionTone(log.action)}><Icon name={actionIcon(log.action)} />{actionLabels[log.action] || log.action}</em></span>
              <span><b>{log.entityType || '—'}</b><small>{log.entityId ? log.entityId.slice(0, 13) + '…' : 'Không có ID'}</small></span>
              <span><code>{log.ipAddress || '—'}</code></span>
              <span><Icon name="chevronRight" /></span>
            </button>
          ))}
          {!loading && logs.length === 0 && <div className="nova-account-empty"><span><Icon name="scroll" /></span><b>Không có bản ghi phù hợp</b><p>Thử mở rộng khoảng thời gian hoặc xóa bộ lọc.</p></div>}
        </div>
        <footer className="nova-table-footer nova-pagination">
          <span>Tổng <b>{totalItems}</b> bản ghi · Trang {filters.page + 1}/{Math.max(totalPages, 1)}</span>
          <div><button disabled={filters.page <= 0 || loading} onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}>Trang trước</button><button disabled={filters.page + 1 >= totalPages || loading} onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}>Trang sau</button></div>
        </footer>
      </section>
      {detailOpen && <AuditDetail log={selected} loading={detailLoading} onClose={() => setDetailOpen(false)} />}
    </div>
  );
}
