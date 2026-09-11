'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Icon, { type IconName } from '@/components/ui/icon';
import { useAuth } from '@/features/auth/context/auth-context';
import { createIntegrationConnection, listIntegrationConnections, testIntegrationConnection, updateIntegrationConnection } from '../api/integrations-api';
import type { ConnectionType, IntegrationConnection, IntegrationConnectionInput } from '../types/integration';
import IntegrationDialog from './integration-dialog';
import BusinessStorageRouting from './business-storage-routing';

const typeMeta: Record<ConnectionType, { label: string; icon: IconName; description: string }> = {
  SMTP: { label: 'Email SMTP', icon: 'mail', description: 'Gửi email thông báo và cảnh báo thời hạn.' },
  FILE_SERVER: { label: 'Máy chủ tệp', icon: 'server', description: 'Lưu bản sao dữ liệu vào hạ tầng nội bộ.' },
  GOOGLE_DRIVE: { label: 'Google Drive', icon: 'database', description: 'Đưa bản sao mã hóa lên thư mục Drive.' },
  AMIS_HR: { label: 'AMIS Nhân sự', icon: 'users', description: 'Đồng bộ phòng ban, vị trí công việc và hồ sơ nhân viên.' },
  AMIS_TIMESHEET: { label: 'AMIS Chấm công', icon: 'clock', description: 'Đọc dữ liệu chấm công thô bằng HMAC-SHA256.' },
  AMIS_ACCOUNTING: { label: 'AMIS Kế toán', icon: 'plug', description: 'Kết nối dữ liệu kế toán bằng access token riêng của MISA.' },
  ATTENDANCE_DEVICE: { label: 'Máy chấm công', icon: 'clock', description: 'Kết nối TCP/IP hoặc DDNS tới thiết bị chấm công.' },
};

function formatDate(value: string | null) {
  if (!value) return 'Chưa kiểm tra';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

export default function IntegrationsPage() {
  const { user, request } = useAuth();
  const canView = user?.permissions.includes('SYSTEM.INTEGRATION.VIEW') ?? false;
  const canManage = user?.permissions.includes('SYSTEM.INTEGRATION.MANAGE') ?? false;
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [typeFilter, setTypeFilter] = useState<'ALL' | ConnectionType>('ALL');
  const [editing, setEditing] = useState<IntegrationConnection | null | undefined>(undefined);
  const [testingId, setTestingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setConnections(await listIntegrationConnections(request));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không tải được danh sách kết nối');
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    if (!canView) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [canView, load]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const visible = useMemo(() => connections.filter((item) => typeFilter === 'ALL' || item.connectionType === typeFilter), [connections, typeFilter]);
  const healthy = connections.filter((item) => item.active && item.lastTestStatus === 'SUCCESS').length;

  async function save(input: IntegrationConnectionInput) {
    if (editing) {
      const updated = await updateIntegrationConnection(request, editing.id, input);
      setConnections((current) => current.map((item) => item.id === updated.id ? updated : item));
      setToast('Đã cập nhật ' + updated.name);
    } else {
      const created = await createIntegrationConnection(request, input);
      setConnections((current) => [created, ...current]);
      setToast('Đã thêm ' + created.name);
    }
  }

  async function test(connection: IntegrationConnection) {
    setTestingId(connection.id);
    setError('');
    try {
      const result = await testIntegrationConnection(request, connection.id);
      setConnections((current) => current.map((item) => item.id === connection.id ? { ...item, lastTestStatus: result.status, lastTestMessage: result.message, lastTestedAt: result.testedAt } : item));
      setToast(result.message || (result.status === 'SUCCESS' ? 'Kết nối hoạt động bình thường' : 'Kiểm tra kết nối thất bại'));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể kiểm tra kết nối');
      void load();
    } finally {
      setTestingId('');
    }
  }

  if (!canView) {
    return <section className="nova-access-denied"><span><Icon name="shield" /></span><p>KHÔNG ĐỦ QUYỀN</p><h1>Bạn không thể xem kết nối hệ thống.</h1><div>Cần permission <code>SYSTEM.INTEGRATION.VIEW</code> để truy cập chức năng này.</div></section>;
  }

  return (
    <div className="nova-account-page nova-integrations-page">
      <header className="nova-page-header">
        <div><p className="nova-eyebrow">DỊCH VỤ & HẠ TẦNG</p><h1>Kết nối hệ thống</h1><span>Khai báo email, lưu trữ và MISA AMIS mà không lưu secret trong database.</span></div>
        {canManage && <button className="nova-button primary" onClick={() => setEditing(null)}><Icon name="plus" />Thêm kết nối</button>}
      </header>

      <section className="nova-integration-overview">
        <article><span><Icon name="plug" /></span><div><small>TỔNG KẾT NỐI</small><b>{connections.length}</b></div></article>
        <article><span className="green"><Icon name="check" /></span><div><small>ĐÃ KIỂM TRA TỐT</small><b>{healthy}</b></div></article>
        <article><span className="amber"><Icon name="clock" /></span><div><small>CHƯA KIỂM TRA / LỖI</small><b>{connections.length - healthy}</b></div></article>
        <div><Icon name="shield" /><span><b>Secret-safe</b><small>Chỉ lưu tên biến môi trường</small></span></div>
      </section>

      <div className="nova-integration-toolbar">
        <div>
          {(['ALL', 'SMTP', 'FILE_SERVER', 'GOOGLE_DRIVE', 'AMIS_HR', 'AMIS_TIMESHEET', 'AMIS_ACCOUNTING', 'ATTENDANCE_DEVICE'] as const).map((type) => <button key={type} className={typeFilter === type ? 'active' : ''} onClick={() => setTypeFilter(type)}>{type === 'ALL' ? 'Tất cả' : typeMeta[type].label}</button>)}
        </div>
        <button onClick={() => void load()} aria-label="Làm mới" disabled={loading}><Icon name="refresh" className={loading ? 'spin' : ''} /></button>
      </div>
      {error && <div className="nova-panel-error"><span>{error}</span><button onClick={() => void load()}>Thử lại</button></div>}

      <section className="nova-integration-grid">
        {loading && Array.from({ length: 3 }).map((_, index) => <article className="nova-integration-card skeleton" key={index}><span /><span /><span /></article>)}
        {!loading && visible.map((connection) => {
          const meta = typeMeta[connection.connectionType];
          return (
            <article className={'nova-integration-card ' + (!connection.active ? 'inactive' : '')} key={connection.id}>
              <header>
                <span className={'type ' + connection.connectionType.toLowerCase()}><Icon name={meta.icon} /></span>
                <div><small>{meta.label.toUpperCase()}</small><h2>{connection.name}</h2><code>{connection.code}</code></div>
                <em className={connection.active ? 'active' : ''}>{connection.active ? 'Đang dùng' : 'Tạm dừng'}</em>
              </header>
              <p>{connection.description || meta.description}</p>
              <dl>
                {Object.entries(connection.configuration).slice(0, 4).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value || '—'}</dd></div>)}
                {Object.entries(connection.secretRefs).map(([key, value]) => <div key={key}><dt>{key}</dt><dd><Icon name="lock" />{value}</dd></div>)}
              </dl>
              <div className={'nova-test-result ' + connection.lastTestStatus.toLowerCase()}>
                <span><Icon name={connection.lastTestStatus === 'SUCCESS' ? 'check' : connection.lastTestStatus === 'FAILED' ? 'alert' : 'clock'} /></span>
                <div><b>{connection.lastTestStatus === 'SUCCESS' ? 'Kết nối tốt' : connection.lastTestStatus === 'FAILED' ? 'Kết nối lỗi' : 'Chưa kiểm tra'}</b><small>{connection.lastTestMessage || formatDate(connection.lastTestedAt)}</small></div>
                {connection.lastTestedAt && <time>{formatDate(connection.lastTestedAt)}</time>}
              </div>
              {canManage && <footer><button className="nova-button secondary" onClick={() => setEditing(connection)}><Icon name="edit" />Chỉnh sửa</button><button className="nova-button primary" onClick={() => void test(connection)} disabled={testingId === connection.id || !connection.active}><Icon name="refresh" className={testingId === connection.id ? 'spin' : ''} />{testingId === connection.id ? 'Đang kiểm tra…' : 'Kiểm tra'}</button></footer>}
            </article>
          );
        })}
        {!loading && visible.length === 0 && <div className="nova-account-empty nova-grid-empty"><span><Icon name="plug" /></span><b>Chưa có kết nối</b><p>Thêm dịch vụ email, lưu trữ hoặc MISA AMIS để sử dụng các tính năng nền tảng.</p></div>}
      </section>
      <BusinessStorageRouting connections={connections} canManage={canManage} />
      {editing !== undefined && <IntegrationDialog connection={editing} onClose={() => setEditing(undefined)} onSave={save} />}
      {toast && <div className="nova-admin-toast"><span><Icon name="check" /></span>{toast}</div>}
    </div>
  );
}
