'use client';

import { appDialog } from '@/lib/ui/app-dialog';

import { Check, FileSpreadsheet, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import type { AuthorizedRequest } from '@/types/api';
import type { IntegrationConnection } from '@/features/integrations/types/integration';
import { createGoogleSheetSource, deleteGoogleSheetSource, listGoogleSheetSources, testGoogleSheetSource, updateGoogleSheetSource } from '../api/google-sheet-sources-api';
import type { GoogleSheetFeature, GoogleSheetSource, GoogleSheetSourceInput } from '../types/google-sheet-source';

const featureLabels: Record<GoogleSheetFeature, string> = {
  PERFORMANCE_DAILY: 'Nhập số liệu dashboard', ATTENDANCE: 'Chấm công', ADMIN_EXPENSE: 'Chi phí hành chính',
  ADMIN_DOCUMENT: 'Giấy tờ', WORK_PLAN: 'Công việc tháng', WORK_CATALOG: 'Danh mục công việc',
};

export default function GoogleSheetSourcesPanel({ request, connections, canManage }: { request: AuthorizedRequest; connections: IntegrationConnection[]; canManage: boolean }) {
  const drives = connections.filter((item) => item.connectionType === 'GOOGLE_DRIVE');
  const [sources, setSources] = useState<GoogleSheetSource[]>([]);
  const [editing, setEditing] = useState<GoogleSheetSource | null | undefined>(undefined);
  const [busy, setBusy] = useState(''); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const load = useCallback(async () => { setError(''); try { setSources(await listGoogleSheetSources(request)); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không tải được nguồn Google Sheet'); } }, [request]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function remove(source: GoogleSheetSource) { if (!await appDialog.confirm(`Xóa nguồn “${source.name}”?`)) return; setBusy(source.id); try { await deleteGoogleSheetSource(request, source.id); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không xóa được nguồn'); } finally { setBusy(''); } }
  async function test(source: GoogleSheetSource) { setBusy(source.id); setError(''); try { const result = await testGoogleSheetSource(request, source.id); setNotice(`Đã đọc ${result.filename} thành công`); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không đọc được nguồn'); await load(); } finally { setBusy(''); } }

  return <section className="google-sheet-sources-panel">
    <header><div><p className="nova-eyebrow">NGUỒN IMPORT</p><h2>Google Sheets</h2><span>Gắn đúng bảng tính cho từng chức năng. Khi import, hệ thống xuất XLSX và dùng lại toàn bộ quy tắc kiểm tra hiện có.</span></div>{canManage && <button className="nova-button primary" disabled={!drives.length} onClick={() => setEditing(null)}><Plus />Thêm nguồn Sheet</button>}</header>
    {!drives.length && <div className="nova-info-note"><FileSpreadsheet /><span>Hãy tạo ít nhất một kết nối Google Drive và chia sẻ Sheet cho email service account trước.</span></div>}
    {error && <div className="nova-panel-error">{error}</div>}{notice && <div className="nova-info-note"><Check /><span>{notice}</span></div>}
    <div className="google-sheet-source-grid">{sources.map((source) => <article key={source.id} className={!source.active ? 'inactive' : ''}><header><span><FileSpreadsheet /></span><div><small>{featureLabels[source.feature]}</small><h3>{source.name}</h3><em>{source.connectionName}</em></div></header><a href={source.spreadsheetUrl} target="_blank" rel="noreferrer">Mở Google Sheet</a><dl><div><dt>Sheet mặc định</dt><dd>{source.sheetName || 'Tự nhận diện'}</dd></div><div><dt>Lần đọc gần nhất</dt><dd>{source.lastSyncedAt ? new Date(source.lastSyncedAt).toLocaleString('vi-VN') : 'Chưa đọc'}</dd></div></dl><footer>{canManage && <><button className="nova-button secondary" disabled={busy === source.id || !source.active} onClick={() => void test(source)}><RefreshCw className={busy === source.id ? 'spin' : ''} />Kiểm tra</button><button onClick={() => setEditing(source)} aria-label="Sửa"><Pencil /></button><button className="danger" disabled={busy === source.id} onClick={() => void remove(source)} aria-label="Xóa"><Trash2 /></button></>}</footer></article>)}</div>
    {!sources.length && <div className="nova-account-empty"><FileSpreadsheet /><b>Chưa có nguồn Google Sheet</b><p>Mỗi nguồn được giới hạn cho đúng một chức năng import.</p></div>}
    {editing !== undefined && <SourceDialog source={editing} drives={drives} close={() => setEditing(undefined)} save={async (input) => { if (editing) await updateGoogleSheetSource(request, editing.id, input); else await createGoogleSheetSource(request, input); setEditing(undefined); await load(); }} />}
  </section>;
}

function SourceDialog({ source, drives, close, save }: { source: GoogleSheetSource | null; drives: IntegrationConnection[]; close: () => void; save: (input: GoogleSheetSourceInput) => Promise<void> }) {
  const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); setSaving(true); setError(''); try { await save({ connectionId: String(data.get('connectionId')), feature: String(data.get('feature')) as GoogleSheetFeature, name: String(data.get('name')).trim(), spreadsheetUrl: String(data.get('spreadsheetUrl')).trim(), sheetName: String(data.get('sheetName')).trim() || null, active: data.get('active') === 'on' }); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không lưu được nguồn'); } finally { setSaving(false); } }
  return <div className="nova-overlay"><section className="nova-dialog google-sheet-source-dialog"><header><div><p>NGUỒN GOOGLE SHEET</p><h2>{source ? 'Chỉnh sửa nguồn' : 'Thêm nguồn import'}</h2><span>Chỉ chấp nhận link docs.google.com/spreadsheets; không tải URL tùy ý.</span></div><button onClick={close}><X /></button></header><form onSubmit={submit}><div className="nova-dialog-body"><div className="nova-form-grid"><label><span>Chức năng</span><select name="feature" defaultValue={source?.feature ?? 'PERFORMANCE_DAILY'}>{Object.entries(featureLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span>Kết nối Google Drive</span><select name="connectionId" defaultValue={source?.connectionId ?? drives[0]?.id} required>{drives.map((drive) => <option key={drive.id} value={drive.id}>{drive.name}</option>)}</select></label></div><label><span>Tên nguồn</span><input name="name" defaultValue={source?.name} maxLength={128} required placeholder="VD. Bảng nhập KPI 2026" /></label><label><span>Link Google Sheet hoặc Sheet ID</span><input name="spreadsheetUrl" defaultValue={source?.spreadsheetUrl} maxLength={600} required placeholder="https://docs.google.com/spreadsheets/d/.../edit" /></label><label><span>Tên sheet mặc định (không bắt buộc)</span><input name="sheetName" defaultValue={source?.sheetName ?? ''} maxLength={128} placeholder="Để trống để bộ import tự nhận diện" /></label><label className="nova-switch-label"><span>Trạng thái</span><div><input type="checkbox" name="active" defaultChecked={source?.active ?? true} /><b>Cho phép sử dụng</b></div></label>{error && <div className="nova-form-error">{error}</div>}</div><footer><button type="button" className="nova-button secondary" onClick={close}>Hủy</button><button className="nova-button primary" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu nguồn'}</button></footer></form></section></div>;
}
