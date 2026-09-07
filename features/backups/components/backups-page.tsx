'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Icon, { type IconName } from '@/components/ui/icon';
import { useAuth } from '@/features/auth/context/auth-context';
import { listIntegrationConnections } from '@/features/integrations/api/integrations-api';
import type { IntegrationConnection } from '@/features/integrations/types/integration';
import { createBackup, listBackups } from '../api/backups-api';
import type { BackupDestination, BackupJob } from '../types/backup';

const destinationMeta: Record<BackupDestination, { label: string; description: string; icon: IconName }> = {
  DOWNLOAD: { label: 'Tải về máy cá nhân', description: 'Tạo file mã hóa để tải trực tiếp bằng trình duyệt.', icon: 'download' },
  FILE_SERVER: { label: 'Máy chủ lưu trữ', description: 'Chép file mã hóa vào thư mục server đã cấu hình.', icon: 'server' },
  GOOGLE_DRIVE: { label: 'Google Drive', description: 'Tải file mã hóa lên thư mục Drive của doanh nghiệp.', icon: 'database' },
};

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value));
}

function formatBytes(value: number | null) {
  if (value === null) return '—';
  if (value < 1024) return value + ' B';
  if (value < 1024 * 1024) return (value / 1024).toFixed(1) + ' KB';
  return (value / 1024 / 1024).toFixed(1) + ' MB';
}

function RunBackupDialog({ connections, onClose, onRun }: {
  connections: IntegrationConnection[];
  onClose: () => void;
  onRun: (destination: BackupDestination, connectionId: string | null) => Promise<void>;
}) {
  const [destination, setDestination] = useState<BackupDestination>('DOWNLOAD');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const compatible = connections.filter((item) => item.active && item.connectionType === destination);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const connectionId = destination === 'DOWNLOAD' ? null : String(data.get('connectionId') ?? '');
    if (destination !== 'DOWNLOAD' && !connectionId) {
      setError('Hãy chọn một kết nối lưu trữ đang hoạt động');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onRun(destination, connectionId);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể tạo bản sao lưu');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="nova-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="nova-dialog nova-backup-dialog" role="dialog" aria-modal="true" aria-labelledby="run-backup-title">
        <header><div><p>SAO LƯU THỦ CÔNG</p><h2 id="run-backup-title">Tạo bản sao dữ liệu</h2><span>Backend xuất SQL và mã hóa trước khi chuyển file tới đích đã chọn.</span></div><button onClick={onClose} aria-label="Đóng"><Icon name="x" /></button></header>
        <form onSubmit={submit}>
          <div className="nova-dialog-body">
            <fieldset className="nova-destination-options">
              <legend>Nơi nhận bản sao</legend>
              {(Object.keys(destinationMeta) as BackupDestination[]).map((value) => {
                const meta = destinationMeta[value];
                return <label key={value} className={destination === value ? 'selected' : ''}><input type="radio" name="destination" value={value} checked={destination === value} onChange={() => setDestination(value)} /><span><Icon name={meta.icon} /></span><div><b>{meta.label}</b><small>{meta.description}</small></div><em><Icon name="check" /></em></label>;
              })}
            </fieldset>
            {destination !== 'DOWNLOAD' && (
              <label><span>Kết nối lưu trữ</span><select name="connectionId" defaultValue="" required><option value="" disabled>Chọn kết nối…</option>{compatible.map((item) => <option value={item.id} key={item.id}>{item.name} ({item.code})</option>)}</select>{compatible.length === 0 && <small className="nova-field-hint">Chưa có kết nối {destinationMeta[destination].label} đang hoạt động. Hãy cấu hình ở mục Kết nối hệ thống.</small>}</label>
            )}
            <div className="nova-backup-security-note"><span><Icon name="shield" /></span><div><b>Mã hóa đầu cuối ở backend</b><p>File SQL được mã hóa AES-256-GCM. Khóa mã hóa chỉ đọc từ biến môi trường và không được lưu trong database hay trình duyệt.</p></div></div>
            {error && <div className="nova-form-error" role="alert">{error}</div>}
          </div>
          <footer><button type="button" className="nova-button secondary" onClick={onClose}>Hủy</button><button type="submit" className="nova-button primary" disabled={submitting || (destination !== 'DOWNLOAD' && compatible.length === 0)}><Icon name="database" />{submitting ? 'Đang sao lưu…' : 'Bắt đầu sao lưu'}</button></footer>
        </form>
      </section>
    </div>
  );
}

export default function BackupsPage() {
  const { user, request, download } = useAuth();
  const canView = user?.permissions.includes('SYSTEM.BACKUP.VIEW') ?? false;
  const canRun = user?.permissions.includes('SYSTEM.BACKUP.RUN') ?? false;
  const canDownload = user?.permissions.includes('SYSTEM.BACKUP.DOWNLOAD') ?? false;
  const [jobs, setJobs] = useState<BackupJob[]>([]);
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [page, setPage] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [runOpen, setRunOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [backupPage, integrationList] = await Promise.all([
        listBackups(request, page),
        listIntegrationConnections(request),
      ]);
      setJobs(backupPage.items);
      setTotalItems(backupPage.totalItems);
      setTotalPages(backupPage.totalPages);
      setConnections(integrationList);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không tải được lịch sử sao lưu');
    } finally {
      setLoading(false);
    }
  }, [page, request]);

  useEffect(() => {
    if (!canView) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [canView, load]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const metrics = useMemo(() => ({
    success: jobs.filter((job) => job.status === 'SUCCEEDED').length,
    failed: jobs.filter((job) => job.status === 'FAILED').length,
    bytes: jobs.reduce((sum, job) => sum + (job.sizeBytes ?? 0), 0),
  }), [jobs]);

  async function run(destination: BackupDestination, connectionId: string | null) {
    const created = await createBackup(request, destination, connectionId);
    setJobs((current) => [created, ...current].slice(0, 20));
    setTotalItems((current) => current + 1);
    setToast(created.status === 'SUCCEEDED' ? 'Đã tạo bản sao lưu mã hóa' : 'Tác vụ sao lưu đã kết thúc với trạng thái ' + created.status);
  }

  async function downloadFile(job: BackupJob) {
    setDownloadingId(job.id);
    setError('');
    try {
      const blob = await download('/api/system/backups/' + job.id + '/download');
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = job.encryptedFileName || 'ctv-erp-backup.sql.enc';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setToast('Đã tải ' + (job.encryptedFileName || 'bản sao lưu'));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể tải file sao lưu');
    } finally {
      setDownloadingId('');
    }
  }

  if (!canView) {
    return <section className="nova-access-denied"><span><Icon name="shield" /></span><p>KHÔNG ĐỦ QUYỀN</p><h1>Bạn không thể xem lịch sử sao lưu.</h1><div>Cần permission <code>SYSTEM.BACKUP.VIEW</code> để truy cập chức năng này.</div></section>;
  }

  return (
    <div className="nova-account-page nova-backups-page">
      <header className="nova-page-header">
        <div><p className="nova-eyebrow">AN TOÀN & KHÔI PHỤC</p><h1>Sao lưu dữ liệu</h1><span>Xuất database thành file SQL mã hóa để tải về máy, lưu server hoặc Google Drive.</span></div>
        {canRun && <button className="nova-button primary" onClick={() => setRunOpen(true)}><Icon name="database" />Tạo bản sao lưu</button>}
      </header>

      <section className="nova-backup-hero">
        <div><span><Icon name="shield" /></span><div><p>BẢO VỆ DỮ LIỆU</p><h2>SQL được mã hóa trước khi rời backend</h2><small>AES-256-GCM · kiểm tra toàn vẹn SHA-256 · không lưu khóa trong database</small></div></div>
        <dl>
          <div><dt>THÀNH CÔNG TRANG NÀY</dt><dd>{metrics.success}</dd></div>
          <div><dt>THẤT BẠI</dt><dd>{metrics.failed}</dd></div>
          <div><dt>DUNG LƯỢNG</dt><dd>{formatBytes(metrics.bytes)}</dd></div>
        </dl>
      </section>

      {error && <div className="nova-panel-error"><span>{error}</span><button onClick={() => void load()}>Thử lại</button></div>}
      <section className="nova-account-panel">
        <header className="nova-backup-table-heading"><div><p>LỊCH SỬ SAO LƯU</p><h2>{totalItems} tác vụ</h2></div><button onClick={() => void load()} aria-label="Làm mới" disabled={loading}><Icon name="refresh" className={loading ? 'spin' : ''} /></button></header>
        <div className="nova-backup-table" role="table" aria-label="Lịch sử sao lưu">
          <div className="nova-backup-row head" role="row"><span>FILE / THỜI GIAN</span><span>ĐÍCH LƯU</span><span>TRẠNG THÁI</span><span>DUNG LƯỢNG</span><span>KIỂM TRA TOÀN VẸN</span><span>THAO TÁC</span></div>
          {loading && Array.from({ length: 6 }).map((_, index) => <div className="nova-backup-row skeleton" key={index}><span /><span /><span /><span /><span /><span /></div>)}
          {!loading && jobs.map((job) => {
            const meta = destinationMeta[job.destination];
            return (
              <div className="nova-backup-row" role="row" key={job.id}>
                <span className="nova-backup-file"><i><Icon name="database" /></i><div><b>{job.encryptedFileName || 'Đang tạo file…'}</b><small>{formatDate(job.startedAt)}</small></div></span>
                <span className="nova-backup-destination"><Icon name={meta.icon} /><div><b>{meta.label}</b><small>{job.connectionId ? job.connectionId.slice(0, 8) : 'Trình duyệt'}</small></div></span>
                <span><em className={'nova-backup-status ' + job.status.toLowerCase()}><i />{job.status === 'SUCCEEDED' ? 'Thành công' : job.status === 'FAILED' ? 'Thất bại' : 'Đang chạy'}</em>{job.errorMessage && <small className="nova-backup-error">{job.errorMessage}</small>}</span>
                <span><b>{formatBytes(job.sizeBytes)}</b><small>{job.encryptionAlgorithm || '—'}</small></span>
                <span className="nova-checksum"><code title={job.sha256 ?? ''}>{job.sha256 ? job.sha256.slice(0, 16) + '…' : '—'}</code><small>SHA-256</small></span>
                <span>
                  {job.remoteWebUrl && <a className="nova-button secondary compact" href={job.remoteWebUrl} target="_blank" rel="noreferrer">Mở file</a>}
                  {job.downloadAvailable && canDownload && <button className="nova-button secondary compact" onClick={() => void downloadFile(job)} disabled={downloadingId === job.id}><Icon name="download" />{downloadingId === job.id ? 'Đang tải…' : 'Tải về'}</button>}
                  {!job.remoteWebUrl && !job.downloadAvailable && <small>Không có thao tác</small>}
                </span>
              </div>
            );
          })}
          {!loading && jobs.length === 0 && <div className="nova-account-empty"><span><Icon name="database" /></span><b>Chưa có bản sao lưu</b><p>Tạo bản sao đầu tiên để thiết lập điểm khôi phục dữ liệu.</p></div>}
        </div>
        <footer className="nova-table-footer nova-pagination"><span>Trang {page + 1}/{Math.max(totalPages, 1)}</span><div><button disabled={page <= 0 || loading} onClick={() => setPage((current) => current - 1)}>Trang trước</button><button disabled={page + 1 >= totalPages || loading} onClick={() => setPage((current) => current + 1)}>Trang sau</button></div></footer>
      </section>
      {runOpen && <RunBackupDialog connections={connections} onClose={() => setRunOpen(false)} onRun={run} />}
      {toast && <div className="nova-admin-toast"><span><Icon name="check" /></span>{toast}</div>}
    </div>
  );
}
