'use client';

import {
  Activity, AlertTriangle, Ban, BookOpen, CheckCircle2, ClipboardCopy,
  Cpu, Download, FileDown, FileUp, HardDrive, KeyRound, Laptop, MemoryStick, MonitorDown, Network,
  PackageOpen, Pencil, Plus, RefreshCw, Search, Send, ShieldCheck, ShieldOff, Siren, Usb, UserRound,
  Wifi, WifiOff, X,
  type LucideIcon,
} from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ErpSelect from '@/components/ui/erp-select';
import { useAuth } from '@/features/auth/context/auth-context';
import { env } from '@/lib/config/env';
import {
  createEnrollmentToken, createItPolicy, getItDashboard, listEnrollmentTokens,
  listDeviceCommands, listDeviceEmployees, listItDevices, listItEvents, listItPolicies,
  queueAgentUpdate, revokeEnrollmentToken, sendFileToDevice,
  updateItAlertStatus, updateItDevice, updateItPolicy,
} from '../api/it-control-api';
import type { AgentCommand, DeviceEmployeeOption, EnrollmentToken, ItAlert, ItDashboard, ItDevice, ItEvent, ItPolicy, PolicyInput } from '../types/it-control';

type Tab = 'overview' | 'devices' | 'events' | 'policies' | 'enrollment' | 'guide';
const surface = 'rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm';
const input = 'h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)] focus:ring-4 focus:ring-blue-500/10';
const eventLabels: Record<string, string> = {
  FILE_DOWNLOAD: 'Tải file', FILE_UPLOAD: 'Upload file', SHARE_READ: 'Đọc file share',
  SHARE_COPY: 'Sao chép file share', USB_CONNECTED: 'Cắm USB', USB_COPY: 'Chép ra USB',
  FILE_SEND: 'Gửi file', LARGE_UPLOAD: 'Upload dung lượng lớn', POLICY_BLOCK: 'Đã chặn',
  AGENT_STATUS: 'Trạng thái agent',
};

function formatDate(value?: string) {
  if (!value) return 'Chưa ghi nhận';
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function formatBytes(value?: number) {
  if (value === undefined || value === null) return '—';
  if (value < 1024) return `${value} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let size = value / 1024; let unit = 0;
  while (size >= 1024 && unit < units.length - 1) { size /= 1024; unit++; }
  return `${size.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} ${units[unit]}`;
}

function metadataString(device: ItDevice, key: string) {
  const value = device.metadata?.[key];
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function metadataNumber(device: ItDevice, key: string) {
  const value = device.metadata?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function licenseLabel(device: ItDevice) {
  const status = metadataString(device, 'licenseStatus') ?? 'UNKNOWN';
  if (status === 'LICENSED') return { value: 'ONLINE', label: 'Đã kích hoạt' };
  if (status === 'UNLICENSED' || status === 'NOTIFICATION' || status === 'NON_GENUINE_GRACE')
    return { value: 'CRITICAL', label: 'Chưa kích hoạt' };
  return { value: 'OFFLINE', label: 'Chưa xác định' };
}

function tone(value: string) {
  if (['CRITICAL', 'BLOCK', 'DISABLED'].includes(value)) return 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/50 dark:text-red-200';
  if (['HIGH', 'WARN', 'OFFLINE'].includes(value)) return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200';
  if (['ONLINE', 'LOW', 'AUDIT', 'RESOLVED'].includes(value)) return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-200';
  return 'border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-ink-soft)]';
}

function Badge({ value, label }: { value: string; label?: string }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${tone(value)}`}>{label ?? value}</span>;
}

function Empty({ title, detail }: { title: string; detail: string }) {
  return <div className="grid min-h-56 place-items-center p-8 text-center"><div><ShieldCheck className="mx-auto mb-3 h-9 w-9 text-[var(--color-ink-faint)]"/><b className="block text-sm">{title}</b><p className="mt-1 text-sm text-[var(--color-ink-soft)]">{detail}</p></div></div>;
}

function DeviceDialog({ device, employees, canManage, onClose, onSaved }: {
  device: ItDevice;
  employees: DeviceEmployeeOption[];
  canManage: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { request } = useAuth();
  const [displayName, setDisplayName] = useState(device.displayName ?? '');
  const [employeeId, setEmployeeId] = useState(device.assignedEmployeeId ?? '');
  const [active, setActive] = useState(device.active);
  const [busy, setBusy] = useState(false);
  const license = licenseLabel(device);
  const disks = Array.isArray(device.metadata?.disks) ? device.metadata.disks as Array<Record<string, unknown>> : [];

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await updateItDevice(request, device.id, {
        displayName: displayName.trim() || null,
        assignedEmployeeId: employeeId || null,
        businessUnitId: employeeId ? null : device.businessUnitId ?? null,
        active,
      });
      await onSaved();
      onClose();
    } finally { setBusy(false); }
  }

  const inventory = [
    ['Hãng / model', [metadataString(device, 'manufacturer'), metadataString(device, 'model')].filter(Boolean).join(' ') || 'Chưa nhận'],
    ['Serial thiết bị', metadataString(device, 'serialNumber') ?? 'Chưa nhận'],
    ['CPU', metadataString(device, 'cpuName') ?? 'Chưa nhận'],
    ['RAM', formatBytes(metadataNumber(device, 'ramTotalBytes'))],
    ['Ổ đĩa còn trống', `${formatBytes(metadataNumber(device, 'storageFreeBytes'))} / ${formatBytes(metadataNumber(device, 'storageTotalBytes'))}`],
    ['IP nội bộ', device.ipAddress ?? 'Chưa nhận'],
    ['MAC', device.macAddress ?? 'Chưa nhận'],
    ['Người đăng nhập Windows', metadataString(device, 'loggedOnUser') ?? 'Chưa nhận'],
  ];

  return <div className="nova-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <form onSubmit={save} className="max-h-[92vh] w-[min(860px,96vw)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl" role="dialog" aria-modal="true">
      <header className="flex items-start justify-between border-b border-[var(--color-border)] p-5"><div><p className="nova-eyebrow">THÔNG TIN THIẾT BỊ</p><h2 className="mt-1 text-xl font-semibold">{device.displayName || device.hostname}</h2><span className="text-sm text-[var(--color-ink-soft)]">{device.hostname} · Agent {device.agentVersion || '—'}</span></div><button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-[var(--color-surface-muted)]" aria-label="Đóng"><X className="h-5 w-5"/></button></header>
      <div className="max-h-[68vh] space-y-5 overflow-y-auto p-5">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{inventory.map(([label, value]) => <article key={label} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3"><small className="block font-semibold text-[var(--color-ink-soft)]">{label}</small><b className="mt-1 block break-words text-sm">{value}</b></article>)}</section>
        <section className="rounded-xl border border-[var(--color-border)] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Windows và bản quyền</h3><p className="mt-1 text-sm text-[var(--color-ink-soft)]">{device.osEdition || 'Windows'} {device.osVersion} · build {device.osBuild || '—'}</p></div><Badge value={license.value} label={license.label}/></div><dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><div><dt className="text-[var(--color-ink-soft)]">Tên license</dt><dd className="font-medium">{metadataString(device, 'licenseName') ?? 'Chưa nhận'}</dd></div><div><dt className="text-[var(--color-ink-soft)]">Product key</dt><dd className="font-medium">{metadataString(device, 'partialProductKey') ? `•••••-${metadataString(device, 'partialProductKey')}` : 'Không lưu khóa đầy đủ'}</dd></div></dl></section>
        {disks.length > 0 && <section><h3 className="mb-2 font-semibold">Chi tiết ổ đĩa</h3><div className="grid gap-2 sm:grid-cols-2">{disks.map((disk, index) => <article key={`${String(disk.name)}-${index}`} className="rounded-xl border border-[var(--color-border)] p-3"><div className="flex items-center gap-2"><HardDrive className="h-4 w-4 text-emerald-600"/><b>{String(disk.name ?? `Ổ ${index + 1}`)}</b></div><p className="mt-2 text-sm text-[var(--color-ink-soft)]">Trống {formatBytes(typeof disk.freeBytes === 'number' ? disk.freeBytes : undefined)} / {formatBytes(typeof disk.totalBytes === 'number' ? disk.totalBytes : undefined)}</p></article>)}</div></section>}
        {canManage && <section className="rounded-xl border border-[var(--color-border)] p-4"><h3 className="font-semibold">Quản lý thiết bị</h3><div className="mt-3 grid gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-sm font-semibold">Tên hiển thị</span><input className={input} value={displayName} onChange={event => setDisplayName(event.target.value)} placeholder={device.hostname}/></label><label><span className="mb-1.5 block text-sm font-semibold">Nhân viên đang sử dụng</span><ErpSelect value={employeeId} onChange={setEmployeeId} options={[{ value: '', label: 'Chưa gán nhân viên' }, ...employees.map(employee => ({ value: employee.id, label: `${employee.employeeCode} · ${employee.fullName}`, description: employee.businessUnitName }))]}/></label></div><label className="mt-4 flex min-h-11 items-center gap-3 rounded-xl border border-[var(--color-border)] px-3"><input type="checkbox" checked={active} onChange={event => setActive(event.target.checked)}/><span className="text-sm font-semibold">Cho phép agent tiếp tục hoạt động</span></label><p className="mt-2 text-xs text-[var(--color-ink-soft)]">Khi gán nhân viên, phòng ban của thiết bị được cập nhật tự động theo hồ sơ nhân sự.</p></section>}
      </div>
      <footer className="flex justify-end gap-2 border-t border-[var(--color-border)] p-4"><button type="button" onClick={onClose} className="nova-button secondary">Đóng</button>{canManage && <button disabled={busy} className="nova-button primary"><UserRound className="h-4 w-4"/>{busy ? 'Đang lưu…' : 'Lưu người sử dụng'}</button>}</footer>
    </form>
  </div>;
}

const commandStatusLabels: Record<string, string> = {
  PENDING: 'Đang chờ agent', DOWNLOADING: 'Agent đang nhận', COMPLETED: 'Hoàn thành',
  FAILED: 'Thất bại', EXPIRED: 'Hết hạn',
};

function RemoteCommandDialog({ device, canSendFile, canUpdate, onClose }: {
  device: ItDevice; canSendFile: boolean; canUpdate: boolean; onClose: () => void;
}) {
  const { request } = useAuth();
  const [commands, setCommands] = useState<AgentCommand[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try { setCommands(await listDeviceCommands(request, device.id)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không tải được tác vụ từ xa'); }
    finally { if (!silent) setLoading(false); }
  }, [device.id, request]);

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => void refresh(true), 10_000);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, [refresh]);

  async function sendFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const value = data.get('file');
    if (!(value instanceof File) || !value.size) { setError('Vui lòng chọn file cần gửi'); return; }
    if (value.size >= 200 * 1024 * 1024) { setError('File phải nhỏ hơn 200 MB'); return; }
    setBusy('file'); setError('');
    try {
      await sendFileToDevice(request, device.id, value, String(data.get('note') ?? ''));
      form.reset(); await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không gửi được file'); }
    finally { setBusy(''); }
  }

  async function updateAgent() {
    setBusy('update'); setError('');
    try { await queueAgentUpdate(request, device.id); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không tạo được lệnh cập nhật agent'); }
    finally { setBusy(''); }
  }

  return <div className="nova-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="max-h-[92vh] w-[min(920px,96vw)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl" role="dialog" aria-modal="true">
      <header className="flex items-start justify-between border-b border-[var(--color-border)] p-5"><div><p className="nova-eyebrow">TÁC VỤ AGENT TỪ XA</p><h2 className="mt-1 text-xl font-semibold">{device.displayName || device.hostname}</h2><p className="mt-1 text-sm text-[var(--color-ink-soft)]">Agent {device.agentVersion || 'chưa rõ'} · <span className={device.status === 'ONLINE' ? 'text-emerald-600' : 'text-amber-600'}>{device.status}</span></p></div><button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-[var(--color-surface-muted)]" aria-label="Đóng"><X className="h-5 w-5"/></button></header>
      <div className="grid max-h-[72vh] gap-5 overflow-y-auto p-5 lg:grid-cols-[.9fr_1.1fr]">
        <div className="space-y-4">
          {canSendFile && <form onSubmit={sendFile} className="rounded-xl border border-[var(--color-border)] p-4"><div className="flex items-center gap-2"><FileDown className="h-5 w-5 text-blue-600"/><h3 className="font-semibold">Gửi file xuống máy</h3></div><p className="mt-1 text-sm text-[var(--color-ink-soft)]">File được kiểm tra SHA-256 và lưu vào Public Documents\CTV-Inbox. Agent không tự chạy file.</p><label className="mt-4 block"><span className="mb-1.5 block text-sm font-semibold">Chọn file dưới 200 MB</span><input name="file" type="file" required className="block w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-sm"/></label><label className="mt-3 block"><span className="mb-1.5 block text-sm font-semibold">Ghi chú cho người nhận</span><textarea name="note" maxLength={1000} className={`${input} min-h-20 py-3`} placeholder="Nội dung hoặc hướng dẫn sử dụng file"/></label><button disabled={Boolean(busy)} className="nova-button primary mt-4 w-full"><Send className="h-4 w-4"/>{busy === 'file' ? 'Đang đưa vào hàng đợi…' : 'Gửi tới thiết bị'}</button></form>}
          {canUpdate && <section className="rounded-xl border border-[var(--color-border)] p-4"><div className="flex items-center gap-2"><PackageOpen className="h-5 w-5 text-emerald-600"/><h3 className="font-semibold">Cập nhật agent</h3></div><p className="mt-2 text-sm leading-6 text-[var(--color-ink-soft)]">Gửi bản agent đã publish trên backend. Agent tự xác minh hash, sao lưu bản cũ, thay thế và khởi động lại Windows Service.</p><button type="button" disabled={Boolean(busy)} onClick={() => void updateAgent()} className="nova-button primary mt-4 w-full"><RefreshCw className={`h-4 w-4 ${busy === 'update' ? 'animate-spin' : ''}`}/>{busy === 'update' ? 'Đang tạo lệnh…' : 'Cập nhật lên bản mới nhất'}</button></section>}
          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{error}</div>}
        </div>
        <section className="overflow-hidden rounded-xl border border-[var(--color-border)]"><div className="flex items-center justify-between border-b border-[var(--color-border)] p-4"><div><h3 className="font-semibold">Lịch sử tác vụ</h3><p className="text-sm text-[var(--color-ink-soft)]">Tự cập nhật mỗi 10 giây</p></div><button type="button" onClick={() => void refresh()} className="rounded-lg p-2 hover:bg-[var(--color-surface-muted)]" aria-label="Làm mới"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}/></button></div><div className="max-h-[520px] divide-y divide-[var(--color-border-soft)] overflow-y-auto">{commands.map(command => <article key={command.id} className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><b className="block truncate text-sm">{command.commandType === 'UPDATE_AGENT' ? `Cập nhật agent ${command.targetVersion ?? ''}` : command.fileName}</b><small className="mt-1 block text-[var(--color-ink-soft)]">{command.commandType === 'UPDATE_AGENT' ? 'Bản cập nhật hệ thống' : formatBytes(command.fileSizeBytes)} · {formatDate(command.createdAt)}</small></div><Badge value={command.status} label={commandStatusLabels[command.status] ?? command.status}/></div>{command.note && <p className="mt-2 text-sm text-[var(--color-ink-soft)]">{command.note}</p>}{command.resultMessage && <p className={`mt-2 rounded-lg p-2 text-xs ${command.status === 'FAILED' ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200' : 'bg-[var(--color-surface-muted)] text-[var(--color-ink-soft)]'}`}>{command.resultMessage}</p>}</article>)}{!loading && !commands.length && <Empty title="Chưa có tác vụ" detail="File gửi và lệnh cập nhật sẽ xuất hiện tại đây."/>}</div></section>
      </div>
      <footer className="flex justify-end border-t border-[var(--color-border)] p-4"><button type="button" onClick={onClose} className="nova-button secondary">Đóng</button></footer>
    </section>
  </div>;
}

function PolicyDialog({ initial, devices, onClose, onSave }: { initial?: ItPolicy; devices: ItDevice[]; onClose: () => void; onSave: (value: PolicyInput) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<PolicyInput>({
    code: initial?.code ?? '', name: initial?.name ?? '', description: initial?.description ?? '',
    eventType: initial?.eventType ?? 'FILE_UPLOAD', action: initial?.action ?? 'AUDIT',
    severity: initial?.severity ?? 'MEDIUM', scopeType: initial?.scopeType ?? 'ALL',
    businessUnitId: initial?.businessUnitId, deviceId: initial?.deviceId,
    conditions: initial?.conditions ?? {}, priority: initial?.priority ?? 100, active: initial?.active ?? true,
  });

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true);
    try { await onSave(form); onClose(); } finally { setBusy(false); }
  }

  return <div className="nova-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <form onSubmit={submit} className="max-h-[92vh] w-[min(720px,96vw)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl" role="dialog" aria-modal="true">
      <header className="flex items-start justify-between border-b border-[var(--color-border)] p-5"><div><p className="text-xs font-bold tracking-[.16em] text-emerald-700">CHÍNH SÁCH KIỂM SOÁT</p><h2 className="mt-1 text-xl font-semibold">{initial ? 'Chỉnh sửa chính sách' : 'Tạo chính sách mới'}</h2><span className="text-sm text-[var(--color-ink-soft)]">Chọn ghi vết, cảnh báo hoặc chặn theo từng kênh dữ liệu.</span></div><button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-[var(--color-surface-muted)]" aria-label="Đóng"><X className="h-5 w-5"/></button></header>
      <div className="grid max-h-[65vh] gap-4 overflow-y-auto p-5 sm:grid-cols-2">
        <label><span className="mb-1.5 block text-sm font-semibold">Mã chính sách</span><input required className={input} value={form.code} onChange={e => setForm(v => ({ ...v, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') }))} placeholder="BLOCK_USB_COPY" /></label>
        <label><span className="mb-1.5 block text-sm font-semibold">Tên chính sách</span><input required className={input} value={form.name} onChange={e => setForm(v => ({ ...v, name: e.target.value }))} /></label>
        <label><span className="mb-1.5 block text-sm font-semibold">Loại sự kiện</span><ErpSelect value={form.eventType ?? ''} onChange={value => setForm(v => ({ ...v, eventType: value }))} options={Object.entries(eventLabels).map(([value, label]) => ({ value, label }))}/></label>
        <label><span className="mb-1.5 block text-sm font-semibold">Hành động</span><ErpSelect value={form.action} onChange={value => setForm(v => ({ ...v, action: value as PolicyInput['action'] }))} options={[{ value: 'AUDIT', label: 'Chỉ ghi vết' }, { value: 'WARN', label: 'Cảnh báo' }, { value: 'BLOCK', label: 'Chặn thao tác' }]}/></label>
        <label><span className="mb-1.5 block text-sm font-semibold">Mức độ</span><ErpSelect value={form.severity} onChange={value => setForm(v => ({ ...v, severity: value as PolicyInput['severity'] }))} options={['LOW','MEDIUM','HIGH','CRITICAL'].map(value => ({ value, label: value }))}/></label>
        <label><span className="mb-1.5 block text-sm font-semibold">Phạm vi</span><ErpSelect value={form.scopeType} onChange={value => setForm(v => ({ ...v, scopeType: value as PolicyInput['scopeType'], deviceId: value === 'DEVICE' ? v.deviceId : undefined, businessUnitId: undefined }))} options={[{ value: 'ALL', label: 'Toàn công ty' }, { value: 'DEVICE', label: 'Một thiết bị' }]}/></label>
        {form.scopeType === 'DEVICE' && <label className="sm:col-span-2"><span className="mb-1.5 block text-sm font-semibold">Thiết bị áp dụng</span><ErpSelect value={form.deviceId ?? ''} onChange={value => setForm(v => ({ ...v, deviceId: value }))} options={devices.map(device => ({ value: device.id, label: device.displayName || device.hostname, description: device.ipAddress }))}/></label>}
        <label><span className="mb-1.5 block text-sm font-semibold">Ưu tiên</span><input type="number" min={0} max={10000} className={input} value={form.priority} onChange={e => setForm(v => ({ ...v, priority: Number(e.target.value) }))}/></label>
        <label className="flex items-end"><span className="flex h-11 w-full items-center gap-3 rounded-xl border border-[var(--color-border)] px-3"><input type="checkbox" checked={form.active} onChange={e => setForm(v => ({ ...v, active: e.target.checked }))}/><b className="text-sm">Cho phép áp dụng</b></span></label>
        <label className="sm:col-span-2"><span className="mb-1.5 block text-sm font-semibold">Mô tả</span><textarea className={`${input} min-h-24 py-3`} value={form.description} onChange={e => setForm(v => ({ ...v, description: e.target.value }))}/></label>
      </div>
      <footer className="flex justify-end gap-2 border-t border-[var(--color-border)] p-4"><button type="button" onClick={onClose} className="nova-button secondary">Hủy</button><button disabled={busy} className="nova-button primary">{busy ? 'Đang lưu…' : 'Lưu chính sách'}</button></footer>
    </form>
  </div>;
}

export default function ItControlPage() {
  const { user, request, download } = useAuth();
  const canView = user?.permissions.includes('IT.CONTROL.VIEW') ?? false;
  const canManage = user?.permissions.includes('IT.CONTROL.MANAGE') ?? false;
  const canPolicy = user?.permissions.includes('IT.POLICY.MANAGE') ?? false;
  const canEnroll = user?.permissions.includes('IT.AGENT.ENROLL') ?? false;
  const canAlert = user?.permissions.includes('IT.ALERT.MANAGE') ?? false;
  const [tab, setTab] = useState<Tab>('overview');
  const [dashboard, setDashboard] = useState<ItDashboard | null>(null);
  const [devices, setDevices] = useState<ItDevice[]>([]);
  const [deviceEmployees, setDeviceEmployees] = useState<DeviceEmployeeOption[]>([]);
  const [events, setEvents] = useState<ItEvent[]>([]);
  const [policies, setPolicies] = useState<ItPolicy[]>([]);
  const [tokens, setTokens] = useState<EnrollmentToken[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [eventType, setEventType] = useState('');
  const [selectedAuditDeviceId, setSelectedAuditDeviceId] = useState('');
  const [auditLoading, setAuditLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingPolicy, setEditingPolicy] = useState<ItPolicy | null | undefined>(undefined);
  const [selectedDevice, setSelectedDevice] = useState<ItDevice | null>(null);
  const [remoteDevice, setRemoteDevice] = useState<ItDevice | null>(null);
  const [issuedToken, setIssuedToken] = useState('');
  const [issuedTokenId, setIssuedTokenId] = useState('');
  const [installerBusyId, setInstallerBusyId] = useState('');
  const [selectedTokenIds, setSelectedTokenIds] = useState<string[]>([]);
  const [tokenBusy, setTokenBusy] = useState(false);
  const notifiedOfflineAlertIds = useRef(new Set<string>());

  const load = useCallback(async (silent = false) => {
    if (!canView) return;
    if (!silent) setLoading(true);
    setError('');
    try {
      const [summary, deviceRows, policyRows, employeeRows] = await Promise.all([
        getItDashboard(request), listItDevices(request, query, status),
        listItPolicies(request), canManage ? listDeviceEmployees(request) : Promise.resolve([]),
      ]);
      setDashboard(summary); setDevices(deviceRows); setPolicies(policyRows); setDeviceEmployees(employeeRows);
      if (canEnroll) setTokens(await listEnrollmentTokens(request));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không tải được dữ liệu kiểm soát IT'); }
    finally { if (!silent) setLoading(false); }
  }, [canEnroll, canManage, canView, query, request, status]);

  const loadDeviceAudit = useCallback(async (deviceId: string, silent = false) => {
    if (!deviceId) { setEvents([]); return; }
    if (!silent) setAuditLoading(true);
    try { setEvents(await listItEvents(request, deviceId, eventType)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không tải được nhật ký thiết bị'); }
    finally { if (!silent) setAuditLoading(false); }
  }, [eventType, request]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => {
    const timer = window.setInterval(() => void load(true), 30_000);
    return () => window.clearInterval(timer);
  }, [load]);
  useEffect(() => {
    const initial = window.setTimeout(() => void loadDeviceAudit(selectedAuditDeviceId), 0);
    if (!selectedAuditDeviceId) return () => window.clearTimeout(initial);
    const timer = window.setInterval(() => void loadDeviceAudit(selectedAuditDeviceId, true), 30_000);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, [loadDeviceAudit, selectedAuditDeviceId]);
  useEffect(() => {
    if (!dashboard || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    for (const alert of dashboard.recentAlerts.filter(item => item.title === 'Agent mất kết nối')) {
      if (notifiedOfflineAlertIds.current.has(alert.id)) continue;
      notifiedOfflineAlertIds.current.add(alert.id);
      new Notification(alert.title, { body: `${alert.deviceName}: ${alert.message}`, tag: `it-offline-${alert.deviceId}` });
    }
  }, [dashboard]);

  const selectedAuditDevice = devices.find(device => device.id === selectedAuditDeviceId);

  const tabs = useMemo(() => [
    { id: 'overview' as const, label: 'Tổng quan', icon: Activity, count: dashboard?.openAlerts || undefined },
    { id: 'devices' as const, label: 'Thiết bị', icon: Laptop, count: devices.length },
    { id: 'events' as const, label: 'Nhật ký thiết bị', icon: Network, count: dashboard?.eventsToday ?? 0 },
    { id: 'policies' as const, label: 'Chính sách', icon: ShieldCheck, count: policies.filter(item => item.active).length },
    ...(canEnroll ? [{ id: 'enrollment' as const, label: 'Cài agent', icon: KeyRound, count: tokens.filter(item => !item.revoked).length }] : []),
    { id: 'guide' as const, label: 'Hướng dẫn', icon: BookOpen },
  ], [canEnroll, dashboard?.eventsToday, dashboard?.openAlerts, devices.length, policies, tokens]);

  if (!canView) return <section className="nova-access-denied"><span><ShieldOff /></span><p>KHÔNG ĐỦ QUYỀN</p><h1>Bạn không thể xem kiểm soát máy tính.</h1><div>Cần permission <code>IT.CONTROL.VIEW</code>.</div></section>;

  async function savePolicy(value: PolicyInput) {
    if (editingPolicy) await updateItPolicy(request, editingPolicy.id, value); else await createItPolicy(request, value);
    await load();
  }

  async function togglePolicy(policy: ItPolicy) {
    await updateItPolicy(request, policy.id, { ...policy, active: !policy.active }); await load();
  }

  async function issueToken(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setTokenBusy(true); setError('');
    try {
      const expires = new Date(); expires.setDate(expires.getDate() + Number(data.get('days') || 7));
      const created = await createEnrollmentToken(request, { label: String(data.get('label')), expiresAt: expires.toISOString(), maxUses: Number(data.get('maxUses')) });
      setIssuedToken(created.token ?? '');
      setIssuedTokenId(created.id);
      form.reset();
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không tạo được mã đăng ký agent');
    } finally {
      setTokenBusy(false);
    }
  }

  async function downloadInstaller(tokenId: string, enrollmentToken?: string) {
    if (!tokenId) return;
    setInstallerBusyId(tokenId); setError('');
    try {
      const serverBaseUrl = new URL(env.apiBaseUrl || window.location.origin, window.location.origin)
        .toString().replace(/\/+$/, '');
      const blob = await download(`/api/it/control/enrollment-tokens/${tokenId}/installer`, {
        method: 'POST',
        body: { serverBaseUrl, enrollmentToken: enrollmentToken || undefined },
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      const label = tokens.find(item => item.id === tokenId)?.label ?? 'windows';
      anchor.download = `ctv-endpoint-agent-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'windows'}.zip`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      if (tokenId === issuedTokenId) {
        setIssuedToken('');
        setIssuedTokenId('');
      }
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không tải được bộ cài agent');
    } finally {
      setInstallerBusyId('');
    }
  }

  async function revokeSelectedTokens() {
    if (!selectedTokenIds.length) return;
    setError('');
    try {
      for (const id of selectedTokenIds) await revokeEnrollmentToken(request, id);
      setSelectedTokenIds([]);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thu hồi được các mã đã chọn');
    }
  }

  function openDeviceAudit(device: ItDevice) {
    setSelectedAuditDeviceId(device.id);
    setTab('events');
  }

  return <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
    <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div><p className="nova-eyebrow">IT · ENDPOINT CONTROL</p><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Kiểm soát máy tính nội bộ</h1></div>
      <button className="nova-button secondary self-start lg:self-auto" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? 'animate-spin' : ''}/>Làm mới</button>
    </header>

    {error && <div className="mb-4 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"><span>{error}</span><button onClick={() => void load()} className="font-bold">Thử lại</button></div>}

    <nav className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1" aria-label="Chức năng kiểm soát IT">
      {tabs.map(item => { const Icon = item.icon; return <button key={item.id} onClick={() => setTab(item.id)} className={`flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${tab === item.id ? 'bg-emerald-700 text-white shadow-sm' : 'text-[var(--color-ink-soft)] hover:bg-[var(--color-surface-muted)]'}`}><Icon className="h-4 w-4"/>{item.label}{item.count !== undefined && <span className={`rounded-full px-1.5 py-0.5 text-[11px] ${tab === item.id ? 'bg-white/20' : 'bg-[var(--color-surface-muted)]'}`}>{item.count}</span>}</button>; })}
    </nav>

    {tab === 'overview' && <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {([
          ['Thiết bị quản lý', dashboard?.totalDevices ?? 0, Laptop, 'text-blue-600 bg-blue-50 dark:bg-blue-950/50'],
          ['Đang trực tuyến', dashboard?.onlineDevices ?? 0, Wifi, 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50'],
          ['Mất kết nối', dashboard?.offlineDevices ?? 0, WifiOff, 'text-slate-600 bg-slate-100 dark:bg-slate-800'],
          ['Sự kiện hôm nay', dashboard?.eventsToday ?? 0, Activity, 'text-violet-600 bg-violet-50 dark:bg-violet-950/50'],
          ['Đã chặn hôm nay', dashboard?.blockedToday ?? 0, Ban, 'text-red-600 bg-red-50 dark:bg-red-950/50'],
          ['Cảnh báo mở', dashboard?.openAlerts ?? 0, Siren, 'text-amber-600 bg-amber-50 dark:bg-amber-950/50'],
        ] satisfies Array<[string, number, LucideIcon, string]>).map(([label, value, Icon, styles]) => <article className={`${surface} flex items-center gap-3 p-4`} key={label}><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${styles}`}><Icon className="h-5 w-5"/></span><div><small className="text-xs font-semibold text-[var(--color-ink-soft)]">{label}</small><strong className="mt-1 block text-2xl font-semibold">{value}</strong></div></article>)}
      </section>
      <section className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <div className={surface}><div className="flex items-center justify-between border-b border-[var(--color-border)] p-4"><div><h2 className="font-semibold">Sự kiện mới nhất</h2><p className="text-sm text-[var(--color-ink-soft)]">Hoạt động file từ các máy đã đăng ký</p></div><button onClick={() => setTab('events')} className="text-sm font-semibold text-emerald-700">Xem tất cả</button></div><EventList events={dashboard?.recentEvents ?? []}/></div>
        <div className={surface}><div className="border-b border-[var(--color-border)] p-4"><h2 className="font-semibold">Cảnh báo cần xử lý</h2><p className="text-sm text-[var(--color-ink-soft)]">Ưu tiên theo mức độ rủi ro</p></div><AlertList alerts={dashboard?.recentAlerts ?? []} canManage={canAlert} onUpdate={async (id, next) => { await updateItAlertStatus(request, id, next); await load(); }}/></div>
      </section>
    </div>}

    {tab === 'devices' && <section className={surface}>
      <div className="grid gap-3 border-b border-[var(--color-border)] p-4 md:grid-cols-[1fr_220px_auto]"><label className="flex h-11 items-center gap-2 rounded-xl border border-[var(--color-border)] px-3"><Search className="h-4 w-4 text-[var(--color-ink-faint)]"/><input className="min-w-0 flex-1 bg-transparent text-sm outline-none" value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm hostname, tên máy hoặc nhân viên"/></label><ErpSelect value={status} onChange={setStatus} options={[{ value: '', label: 'Tất cả trạng thái' }, ...['ONLINE','OFFLINE','ENROLLED','DISABLED'].map(value => ({ value, label: value }))]}/><button className="nova-button primary" onClick={() => void load()}>Áp dụng</button></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1320px] text-left text-sm"><thead className="bg-[var(--color-surface-muted)] text-xs text-[var(--color-ink-soft)]"><tr><th className="p-3">THIẾT BỊ</th><th>CẤU HÌNH</th><th>WINDOWS</th><th>NGƯỜI / ĐƠN VỊ</th><th>TRẠNG THÁI</th><th>RỦI RO</th><th>LẦN CUỐI</th><th>THAO TÁC</th></tr></thead><tbody>{devices.map(device => { const license = licenseLabel(device); return <tr key={device.id} className="border-t border-[var(--color-border-soft)] align-top"><td className="p-3"><button type="button" onClick={() => openDeviceAudit(device)} className="block text-left font-bold text-emerald-700 hover:underline">{device.displayName || device.hostname}</button><small className="text-[var(--color-ink-soft)]">{device.hostname} · {device.ipAddress || 'Chưa có IP'}</small><small className="block text-[var(--color-ink-soft)]">{[metadataString(device, 'manufacturer'), metadataString(device, 'model')].filter(Boolean).join(' ') || 'Chưa nhận model'}</small></td><td className="py-3"><span className="flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5"/>{metadataString(device, 'cpuName') || 'Chưa nhận CPU'}</span><small className="mt-1 flex items-center gap-1.5 text-[var(--color-ink-soft)]"><MemoryStick className="h-3.5 w-3.5"/>RAM {formatBytes(metadataNumber(device, 'ramTotalBytes'))}</small><small className="mt-1 flex items-center gap-1.5 text-[var(--color-ink-soft)]"><HardDrive className="h-3.5 w-3.5"/>Trống {formatBytes(metadataNumber(device, 'storageFreeBytes'))}</small></td><td className="py-3">{device.osEdition || 'Windows'} {device.osVersion}<small className="block text-[var(--color-ink-soft)]">Build {device.osBuild || '—'} · Agent {device.agentVersion || '—'}</small><span className="mt-1 inline-flex"><Badge value={license.value} label={license.label}/></span></td><td className="py-3">{device.assignedEmployeeName || 'Chưa gán'}<small className="block text-[var(--color-ink-soft)]">{device.businessUnitName || 'Chưa có phòng ban'}</small></td><td className="py-3"><Badge value={device.status}/></td><td className="py-3"><Badge value={device.riskLevel}/></td><td className="py-3">{formatDate(device.lastSeenAt)}</td><td className="py-3 pr-3"><div className="flex flex-wrap gap-2"><button type="button" className="nova-button primary min-h-9 px-3 text-xs" onClick={() => setRemoteDevice(device)}><Send className="h-4 w-4"/>Gửi / cập nhật</button><button type="button" className="nova-button secondary min-h-9 px-3 text-xs" onClick={() => openDeviceAudit(device)}><Activity className="h-4 w-4"/>Nhật ký</button><button type="button" className="nova-button secondary min-h-9 px-3 text-xs" onClick={() => setSelectedDevice(device)}>{canManage ? <><Pencil className="h-4 w-4"/>Gán nhân viên</> : 'Chi tiết'}</button></div></td></tr>; })}</tbody></table>{!loading && !devices.length && <Empty title="Chưa có thiết bị" detail="Tạo mã đăng ký và cài agent trên máy Windows để bắt đầu."/>}</div>
    </section>}

    {tab === 'events' && <section className={`${surface} overflow-hidden`}>
      <div className="grid min-h-[580px] lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="border-b border-[var(--color-border)] lg:border-b-0 lg:border-r">
          <div className="border-b border-[var(--color-border)] p-4"><h2 className="font-semibold">Máy tính</h2><p className="text-sm text-[var(--color-ink-soft)]">Chọn một máy để xem audit riêng.</p></div>
          <div className="max-h-[640px] overflow-y-auto p-2">{devices.map(device => <button type="button" key={device.id} onClick={() => setSelectedAuditDeviceId(device.id)} className={`mb-1 flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${selectedAuditDeviceId === device.id ? 'bg-emerald-50 ring-1 ring-emerald-300 dark:bg-emerald-950/40 dark:ring-emerald-800' : 'hover:bg-[var(--color-surface-muted)]'}`}><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${device.status === 'ONLINE' ? 'bg-emerald-500' : device.status === 'OFFLINE' ? 'bg-red-500' : 'bg-slate-400'}`}/><span className="min-w-0 flex-1"><b className="block truncate text-sm">{device.displayName || device.hostname}</b><small className="block truncate text-[var(--color-ink-soft)]">{device.assignedEmployeeName || device.hostname}</small></span><Badge value={device.status}/></button>)}{!devices.length && <Empty title="Chưa có thiết bị" detail="Cài agent để bắt đầu ghi nhận."/>}</div>
        </aside>
        <div className="min-w-0">
          <div className="flex flex-col gap-3 border-b border-[var(--color-border)] p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">{selectedAuditDevice ? `Nhật ký · ${selectedAuditDevice.displayName || selectedAuditDevice.hostname}` : 'Nhật ký thiết bị'}</h2><p className="text-sm text-[var(--color-ink-soft)]">Sự kiện file, upload, USB và trạng thái kết nối; không lưu nội dung file.</p></div><div className="w-full sm:w-64"><ErpSelect value={eventType} onChange={setEventType} options={[{ value: '', label: 'Tất cả sự kiện' }, ...Object.entries(eventLabels).map(([value,label]) => ({ value, label }))]}/></div></div>
          {!selectedAuditDeviceId ? <Empty title="Hãy chọn một máy tính" detail="Audit chỉ được tải sau khi bạn bấm vào thiết bị cần kiểm tra."/> : auditLoading ? <div className="grid min-h-56 place-items-center text-sm text-[var(--color-ink-soft)]"><RefreshCw className="mb-2 h-6 w-6 animate-spin"/>Đang tải nhật ký…</div> : <EventList events={events}/>} 
        </div>
      </div>
    </section>}

    {tab === 'policies' && <section className={surface}>
      <div className="flex flex-col gap-3 border-b border-[var(--color-border)] p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">Chính sách thực thi</h2><p className="text-sm text-[var(--color-ink-soft)]">Agent nhận chính sách theo ưu tiên thấp đến cao.</p></div>{canPolicy && <button className="nova-button primary" onClick={() => setEditingPolicy(null)}><Plus/>Thêm chính sách</button>}</div>
      <div className="grid gap-3 p-4 lg:grid-cols-2">{policies.map(policy => <article key={policy.id} className="rounded-xl border border-[var(--color-border)] p-4"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><b>{policy.name}</b><Badge value={policy.action}/><Badge value={policy.severity}/></div><code className="mt-1 block text-xs text-[var(--color-ink-soft)]">{policy.code}</code></div><span className={`h-2.5 w-2.5 rounded-full ${policy.active ? 'bg-emerald-500' : 'bg-slate-400'}`}/></div><p className="my-3 text-sm text-[var(--color-ink-soft)]">{policy.description || 'Không có mô tả'}</p><div className="flex items-center justify-between text-xs text-[var(--color-ink-soft)]"><span>{eventLabels[policy.eventType ?? ''] || 'Mọi sự kiện'} · {policy.scopeType === 'ALL' ? 'Toàn công ty' : policy.deviceName || policy.businessUnitName}</span>{canPolicy && <div className="flex gap-2"><button className="font-semibold text-emerald-700" onClick={() => setEditingPolicy(policy)}>Sửa</button><button className="font-semibold text-[var(--color-ink-soft)]" onClick={() => void togglePolicy(policy)}>{policy.active ? 'Tạm dừng' : 'Bật'}</button></div>}</div></article>)}{!policies.length && <Empty title="Chưa có chính sách" detail="Mặc định agent chỉ ghi vết ở mức AUDIT."/>}</div>
    </section>}

    {tab === 'enrollment' && canEnroll && <div className="grid gap-5 xl:grid-cols-[.75fr_1.25fr]">
      <section className={`${surface} h-fit`}><div className="border-b border-[var(--color-border)] p-4"><h2 className="font-semibold">Tạo mã cài agent</h2><p className="text-sm text-[var(--color-ink-soft)]">Mã chỉ hiện một lần sau khi tạo.</p></div><form className="space-y-4 p-4" onSubmit={issueToken}><label><span className="mb-1.5 block text-sm font-semibold">Tên đợt cài đặt</span><input name="label" required className={input} placeholder="Máy phòng Kế toán"/></label><div className="grid grid-cols-2 gap-3"><label><span className="mb-1.5 block text-sm font-semibold">Hiệu lực (ngày)</span><input name="days" type="number" min={1} max={90} defaultValue={7} className={input}/></label><label><span className="mb-1.5 block text-sm font-semibold">Số máy tối đa</span><input name="maxUses" type="number" min={1} max={10000} defaultValue={1} className={input}/></label></div><button disabled={tokenBusy} className="nova-button primary w-full"><KeyRound/>{tokenBusy ? 'Đang tạo…' : 'Tạo mã đăng ký'}</button></form>{issuedToken && <div className="m-4 mt-0 rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"><b className="text-sm">Mã đăng ký vừa tạo</b><code className="my-2 block break-all rounded-lg bg-white/70 p-2 text-xs dark:bg-black/30">{issuedToken}</code><div className="flex flex-col gap-2 sm:flex-row"><button type="button" className="nova-button primary flex-1" disabled={installerBusyId === issuedTokenId} onClick={() => void downloadInstaller(issuedTokenId, issuedToken)}><MonitorDown className="h-4 w-4"/>{installerBusyId === issuedTokenId ? 'Đang đóng gói…' : 'Tải bộ cài Windows'}</button><button type="button" className="nova-button secondary" onClick={() => void navigator.clipboard.writeText(issuedToken)}><ClipboardCopy className="h-4 w-4"/>Sao chép mã</button></div><p className="mt-2 text-xs">Bộ cài chứa script PowerShell và mã tạm thời. Xóa file ZIP sau khi cài xong.</p></div>}</section>
      <section className={surface}>
        <div className="flex flex-col gap-3 border-b border-[var(--color-border)] p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">Các mã đã cấp</h2><p className="text-sm text-[var(--color-ink-soft)]">Tick nhiều mã để thu hồi cùng lúc, hoặc tải nhanh ở từng dòng.</p></div>{selectedTokenIds.length > 0 && <button type="button" className="nova-button secondary text-red-600" onClick={() => void revokeSelectedTokens()}>Thu hồi đã chọn ({selectedTokenIds.length})</button>}</div>
        <div className="divide-y divide-[var(--color-border-soft)]">{tokens.map(token => { const downloadable = !token.revoked && token.usedCount === 0; return <article className="grid gap-3 p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center" key={token.id}><input type="checkbox" aria-label={`Chọn ${token.label}`} disabled={token.revoked} checked={selectedTokenIds.includes(token.id)} onChange={event => setSelectedTokenIds(current => event.target.checked ? [...current, token.id] : current.filter(id => id !== token.id))}/><div><b className="text-sm">{token.label}</b><p className="mt-1 text-xs text-[var(--color-ink-soft)]"><code>{token.tokenPrefix}…</code> · {token.usedCount}/{token.maxUses} lượt · hết hạn {formatDate(token.expiresAt)}</p></div><div className="flex flex-wrap items-center gap-2"><Badge value={token.revoked ? 'DISABLED' : downloadable ? 'ONLINE' : 'OFFLINE'} label={token.revoked ? 'Đã thu hồi' : downloadable ? 'Chưa sử dụng' : 'Đã dùng'}/>{downloadable && <button type="button" disabled={Boolean(installerBusyId)} onClick={() => void downloadInstaller(token.id, token.id === issuedTokenId ? issuedToken : undefined)} className="nova-button secondary min-h-9 px-3 text-xs"><Download className="h-4 w-4"/>{installerBusyId === token.id ? 'Đang tải…' : 'Tải'}</button>}{!token.revoked && <button type="button" onClick={async () => { await revokeEnrollmentToken(request, token.id); setSelectedTokenIds(current => current.filter(id => id !== token.id)); await load(); }} className="text-xs font-bold text-red-600">Thu hồi</button>}</div></article>; })}{!tokens.length && <Empty title="Chưa cấp mã" detail="Tạo một mã cho từng đợt cài đặt agent."/>}</div>
      </section>
    </div>}

    {tab === 'guide' && <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <section className={surface}>
        <div className="border-b border-[var(--color-border)] p-5"><p className="nova-eyebrow">HƯỚNG DẪN TRIỂN KHAI</p><h2 className="mt-1 text-xl font-semibold">Kết nối máy Windows với ERP</h2><p className="mt-2 text-sm text-[var(--color-ink-soft)]">Áp dụng cho Windows 11 Home/Pro. Người cài cần có quyền Administrator trên máy đích.</p></div>
        <ol className="divide-y divide-[var(--color-border-soft)]">
          {[
            ['Tạo mã đăng ký', 'Mở tab Cài agent, đặt tên theo máy hoặc nhân viên, nên để một lượt dùng cho mỗi máy.'],
            ['Tải bộ cài', 'Sau khi tạo mã, bấm Tải bộ cài Windows. File ZIP đã có agent và script cấu hình đúng backend hiện tại.'],
            ['Giải nén và chạy', 'Giải nén toàn bộ ZIP, nhấn chuột phải install-ctv-agent.ps1 và chọn Run with PowerShell; chấp nhận quyền Administrator.'],
            ['Kiểm tra kết nối', 'Chờ thông báo thành công, quay lại tab Thiết bị và bấm Làm mới. Máy mới phải có trạng thái ONLINE.'],
            ['Hoàn tất an toàn', 'Xóa ZIP và thư mục giải nén vì script có mã đăng ký tạm thời. Thu hồi mã chưa dùng khi kết thúc đợt cài.'],
          ].map(([title, detail], index) => <li key={title} className="flex gap-4 p-5"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-700 text-sm font-bold text-white">{index + 1}</span><div><b className="text-sm">{title}</b><p className="mt-1 text-sm leading-6 text-[var(--color-ink-soft)]">{detail}</p></div></li>)}
        </ol>
      </section>
      <div className="space-y-5">
        <section className={`${surface} p-5`}><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-6 w-6 text-emerald-600"/><div><h3 className="font-semibold">Dữ liệu được ghi nhận</h3><p className="mt-2 text-sm leading-6 text-[var(--color-ink-soft)]">Agent gửi inventory máy (IP, CPU, RAM, ổ đĩa, model, serial, trạng thái kích hoạt Windows) và siêu dữ liệu thao tác file, USB, thư mục chia sẻ. Agent 1.2 còn tương quan tiến trình đọc tài liệu để cảnh báo dấu hiệu upload qua Zalo, Google Drive, Outlook, Teams, Slack và trình duyệt. HTTPS che giấu URL nên sự kiện từ trình duyệt hiển thị nhóm Web cùng mức tin cậy, không khẳng định riêng Gmail hay Drive. Không ghi bàn phím, không chụp màn hình và không đọc nội dung tài liệu.</p></div></div></section>
        <section className={`${surface} p-5`}><h3 className="font-semibold">Nếu máy không xuất hiện</h3><ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--color-ink-soft)]"><li>Kiểm tra máy mở được <code>{env.apiBaseUrl}</code> qua HTTPS.</li><li>Kiểm tra Windows Service <code>CtvEndpointAgent</code> đang chạy.</li><li>Mã đăng ký phải còn hạn và còn lượt sử dụng.</li><li>Nếu đổi backend, tạo bộ cài mới thay vì sửa script bằng tay.</li></ul></section>
        {canEnroll ? <button className="nova-button primary w-full" onClick={() => setTab('enrollment')}><KeyRound/>Tạo mã và tải bộ cài</button> : <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">Bạn có thể đọc hướng dẫn nhưng cần quyền <code>IT.AGENT.ENROLL</code> để tạo và tải bộ cài.</div>}
      </div>
    </div>}

    {editingPolicy !== undefined && <PolicyDialog initial={editingPolicy ?? undefined} devices={devices} onClose={() => setEditingPolicy(undefined)} onSave={savePolicy}/>} 
    {selectedDevice && <DeviceDialog device={selectedDevice} employees={deviceEmployees} canManage={canManage} onClose={() => setSelectedDevice(null)} onSaved={load}/>} 
    {remoteDevice && <RemoteCommandDialog device={remoteDevice} canSendFile={canManage} canUpdate={canEnroll} onClose={() => setRemoteDevice(null)}/>} 
  </div>;
}

function EventList({ events }: { events: ItEvent[] }) {
  if (!events.length) return <Empty title="Chưa có sự kiện" detail="Các sự kiện mới từ agent sẽ hiển thị tại đây."/>;
  return <div className="divide-y divide-[var(--color-border-soft)]">{events.map(event => <article key={`${event.id}-${event.occurredAt}`} className="grid gap-3 p-4 hover:bg-[var(--color-surface-muted)] sm:grid-cols-[40px_1fr_auto] sm:items-center"><span className={`grid h-10 w-10 place-items-center rounded-xl ${event.blocked ? 'bg-red-50 text-red-600 dark:bg-red-950/50' : event.eventType.includes('USB') ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/50' : 'bg-blue-50 text-blue-600 dark:bg-blue-950/50'}`}>{event.eventType.includes('USB') ? <Usb className="h-5 w-5"/> : event.eventType.includes('UPLOAD') ? <FileUp className="h-5 w-5"/> : <Download className="h-5 w-5"/>}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><b className="truncate text-sm">{event.fileName || eventLabels[event.eventType] || event.eventType}</b><Badge value={event.policyAction}/></div><p className="mt-1 truncate text-xs text-[var(--color-ink-soft)]">{event.deviceName} · {event.username || 'Không rõ user'} · {event.processName || 'Không rõ tiến trình'}{event.destination ? ` → ${event.destination}` : ''}</p></div><div className="text-left sm:text-right"><b className="block text-xs">{formatBytes(event.fileSizeBytes)}</b><small className="text-xs text-[var(--color-ink-soft)]">{formatDate(event.occurredAt)}</small></div></article>)}</div>;
}

function AlertList({ alerts, canManage, onUpdate }: { alerts: ItAlert[]; canManage: boolean; onUpdate: (id: string, status: 'ACKNOWLEDGED' | 'RESOLVED') => Promise<void> }) {
  if (!alerts.length) return <Empty title="Không có cảnh báo mở" detail="Hệ thống đang hoạt động bình thường."/>;
  return <div className="divide-y divide-[var(--color-border-soft)]">{alerts.map(alert => <article className="p-4" key={alert.id}><div className="flex items-start gap-3"><AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${alert.severity === 'CRITICAL' ? 'text-red-600' : 'text-amber-600'}`}/><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><b className="text-sm">{alert.title}</b><Badge value={alert.severity}/></div><p className="mt-1 text-sm text-[var(--color-ink-soft)]">{alert.message}</p><small className="mt-2 block text-xs text-[var(--color-ink-faint)]">{alert.deviceName} · {formatDate(alert.createdAt)}</small>{canManage && alert.status === 'OPEN' && <button onClick={() => void onUpdate(alert.id, 'ACKNOWLEDGED')} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-700"><CheckCircle2 className="h-4 w-4"/>Đã kiểm tra</button>}</div></div></article>)}</div>;
}
