'use client';

import { Download, Eye, Table2, TriangleAlert, Upload, X } from 'lucide-react';
import { useState } from 'react';
import type { ApiRequestOptions } from '@/lib/api/client';
import GoogleSheetSourcePicker, { resolvedSheetFile } from '@/features/import-sources/components/google-sheet-source-picker';
import { importAttendanceWorkbook, previewAttendanceImport } from '../api/attendance-api';
import type { AttendanceImportPreview, AttendanceImportResult, AttendanceSource } from '../types/attendance';

type Request = <T>(path: string, options?: ApiRequestOptions) => Promise<T>;
type DownloadFile = (path: string) => Promise<Blob>;
const fileBase64 = (file: File) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1] ?? ''); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); });
const time = (value: string | null) => value ? value.slice(0, 5) : '—';

export default function AttendanceImportDialog({ open, request, download, sources, close, onImported }: { open: boolean; request: Request; download: DownloadFile; sources: AttendanceSource[]; close: () => void; onImported: (result: AttendanceImportResult) => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [encoded, setEncoded] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [mode, setMode] = useState<'AUTO' | 'STANDARD'>('AUTO');
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [connectionId, setConnectionId] = useState('');
  const [preview, setPreview] = useState<AttendanceImportPreview | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  async function downloadTemplate() {
    setBusy('template'); setError('');
    try { const blob = await download('/api/hr/attendance/import/template'); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'Mau-import-cham-cong.xlsx'; anchor.click(); URL.revokeObjectURL(url); setMode('STANDARD'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không tải được file mẫu'); }
    finally { setBusy(''); }
  }
  async function chooseFile(next: File | null) {
    setFile(next); setPreview(null); setError(''); setSheetName('');
    if (!next) { setEncoded(''); return; }
    if (!next.name.toLowerCase().endsWith('.xlsx')) { setEncoded(''); setError('Chỉ chấp nhận file .xlsx không chứa macro.'); return; }
    if (next.size > 10 * 1024 * 1024) { setEncoded(''); setError('File Excel tối đa 10 MB.'); return; }
    try { setEncoded(await fileBase64(next)); } catch { setError('Không đọc được file đã chọn.'); }
  }
  function useSheet(workbook: Parameters<typeof resolvedSheetFile>[0]) { setFile(resolvedSheetFile(workbook)); setEncoded(workbook.workbookBase64); if (workbook.sheetName) setSheetName(workbook.sheetName); setPreview(null); setError(''); }
  function payload() { return { filename: file?.name, workbookBase64: encoded, sheetName: sheetName || null, mode, connectionId: connectionId || null, overwriteExisting }; }
  async function inspect() {
    if (!file || !encoded) return;
    setBusy('preview'); setError('');
    try { setPreview(await previewAttendanceImport(request, payload())); }
    catch (cause) { setPreview(null); setError(cause instanceof Error ? cause.message : 'Không xem trước được file Excel'); }
    finally { setBusy(''); }
  }
  async function commit() {
    if (!preview || preview.invalidRows > 0) return;
    setBusy('import'); setError('');
    try { const result = await importAttendanceWorkbook(request, payload()); await onImported(result); close(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không import được dữ liệu'); }
    finally { setBusy(''); }
  }
  if (!open) return null;
  return <div className="nova-overlay"><section className="nova-dialog attendance-import-dialog"><header><div><p>NHẬP DỮ LIỆU EXCEL</p><h2>Import chấm công</h2><span>Xem trước và kiểm tra toàn bộ dữ liệu trước khi ghi vào hệ thống.</span></div><button onClick={close}><X /></button></header><div className="nova-dialog-body">
    <div className="attendance-import-choices"><article><span><Download /></span><div><b>Chưa có file import mẫu?</b><p>Tải mẫu chuẩn, điền mỗi nhân viên–mỗi ngày một dòng rồi tải lại tại bước bên dưới.</p></div><button type="button" className="nova-button secondary" disabled={busy === 'template'} onClick={() => void downloadTemplate()}>Tải file mẫu</button></article><article><span><Upload /></span><div><b>Đã có file dữ liệu?</b><p>Chọn file hiện có; hệ thống tự tìm sheet và nhận diện tên cột Việt/Anh.</p></div></article></div>
    <GoogleSheetSourcePicker request={request} feature="ATTENDANCE" disabled={Boolean(busy)} onResolved={useSheet} />
    <div className="attendance-import-form"><label><span>File Excel .xlsx</span><input type="file" accept=".xlsx" onChange={(event) => void chooseFile(event.target.files?.[0] ?? null)} /></label><label><span>Chế độ nhận diện</span><select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}><option value="AUTO">Tự nhận diện file chuẩn hoặc AMIS</option><option value="STANDARD">File mẫu chuẩn CTV ERP</option></select></label><label><span>Nguồn AMIS (bắt buộc với file log thô)</span><select value={connectionId} onChange={(event) => setConnectionId(event.target.value)}><option value="">Không chọn — file mẫu chuẩn</option>{sources.filter((source) => source.type === 'AMIS_TIMESHEET').map((source) => <option key={source.id} value={source.id}>{source.name} · AMIS</option>)}</select></label><label><span>Tên sheet (không bắt buộc)</span><input value={sheetName} onChange={(event) => setSheetName(event.target.value)} placeholder="Để trống để tự tìm" /></label><label className="attendance-import-overwrite"><input type="checkbox" checked={overwriteExisting} onChange={(event) => setOverwriteExisting(event.target.checked)} /><span>Thay dữ liệu cũ của cùng nguồn/ID chấm công/ngày</span><small>Chỉ dữ liệu thuộc đúng nguồn được chọn mới bị thay thế.</small></label></div>
    {error && <div className="performance-error"><TriangleAlert />{error}</div>}
    {file && <div className="attendance-import-file"><Table2 /><div><b>{file.name}</b><small>{(file.size / 1024).toFixed(1)} KB</small></div><button className="nova-button primary" disabled={!encoded || busy === 'preview'} onClick={() => void inspect()}><Eye />{busy === 'preview' ? 'Đang kiểm tra…' : 'Xem trước dữ liệu'}</button></div>}
    {preview && <section className="attendance-import-preview"><header><div><h3>Sheet “{preview.sheetName}” · {preview.detectedMode === 'AMIS_RAW' ? 'Log thô AMIS' : 'Mẫu chuẩn'}</h3><p>{preview.totalRows} ngày công · <b>{preview.validRows} hợp lệ</b> · <em>{preview.invalidRows} lỗi</em></p></div><span className={preview.invalidRows ? 'invalid' : 'valid'}>{preview.invalidRows ? 'Cần sửa/ánh xạ' : 'Sẵn sàng import'}</span></header>{preview.warnings.map((warning) => <small className="attendance-import-warning" key={warning}>{warning}</small>)}<div className="attendance-import-table-wrap"><table><thead><tr><th>Dòng</th><th>ID chấm công</th><th>Mã NV tham khảo</th><th>Ngày</th><th>Lần đầu</th><th>Lần cuối</th><th>Kết quả kiểm tra</th></tr></thead><tbody>{preview.rows.map((row) => <tr key={`${row.rowNumber}-${row.externalAttendanceId || row.employeeCode}`} className={!row.valid ? 'invalid' : ''}><td>{row.rowNumber}</td><td><b>{row.externalAttendanceId || '—'}</b></td><td>{row.employeeCode || '—'}</td><td>{row.workDate || '—'}</td><td>{time(row.checkIn)}</td><td>{time(row.checkOut)}</td><td>{row.valid ? <em className="ok">Hợp lệ</em> : <em>{row.errors.join('; ')}</em>}</td></tr>)}</tbody></table></div></section>}
  </div><footer><button className="nova-button secondary" onClick={close}>Hủy</button><button className="nova-button primary" disabled={!preview || preview.invalidRows > 0 || busy === 'import'} onClick={() => void commit()}><Upload />{busy === 'import' ? 'Đang import…' : `Import ${preview?.validRows ?? 0} dòng`}</button></footer></section></div>;
}
