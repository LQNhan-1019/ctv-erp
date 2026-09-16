'use client';

import { Download, Table2, Upload, X } from 'lucide-react';
import { useState } from 'react';
import type { ApiRequestOptions } from '@/lib/api/client';
import { importAdministrativeWorkbook, previewAdministrativeImport } from '../api/administration-api';
import type { AdministrativeImportPreview } from '../types/administration';

type Request = <T>(path: string, options?: ApiRequestOptions) => Promise<T>;
type Download = (path: string) => Promise<Blob>;
const encode = (file: File) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1] ?? ''); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); });

export default function AdministrativeImportDialog({ open, type, request, download, close, imported }: { open: boolean; type: 'EXPENSE' | 'DOCUMENT'; request: Request; download: Download; close: () => void; imported: (message: string) => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null); const [encoded, setEncoded] = useState('');
  const [sheetName, setSheetName] = useState(''); const [preview, setPreview] = useState<AdministrativeImportPreview | null>(null);
  const [busy, setBusy] = useState(''); const [error, setError] = useState('');
  const label = type === 'EXPENSE' ? 'chi phí hành chính' : 'giấy tờ';
  const path = type === 'EXPENSE' ? 'expenses' : 'documents';
  const payload = () => ({ filename: file?.name, workbookBase64: encoded, sheetName: sheetName || null });
  async function choose(next: File | null) { setFile(next); setPreview(null); setError(''); if (!next) return setEncoded(''); if (!next.name.toLowerCase().endsWith('.xlsx')) return setError('Chỉ chấp nhận file .xlsx.'); if (next.size > 10 * 1024 * 1024) return setError('File tối đa 10 MB.'); try { setEncoded(await encode(next)); } catch { setError('Không đọc được file.'); } }
  async function template() { setBusy('template'); setError(''); try { const blob = await download(`/api/admin/${path}/import/template`); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = type === 'EXPENSE' ? 'mau-import-chi-phi-hanh-chinh.xlsx' : 'mau-import-giay-to.xlsx'; link.click(); URL.revokeObjectURL(url); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không tải được file mẫu'); } finally { setBusy(''); } }
  async function inspect() { if (!encoded) return; setBusy('preview'); setError(''); try { setPreview(await previewAdministrativeImport(request, type, payload())); } catch (cause) { setPreview(null); setError(cause instanceof Error ? cause.message : 'Không xem trước được file'); } finally { setBusy(''); } }
  async function commit() { if (!preview || preview.invalidRows) return; setBusy('import'); setError(''); try { const result = await importAdministrativeWorkbook(request, type, payload()); await imported(result.message); close(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không import được file'); } finally { setBusy(''); } }
  if (!open) return null;
  return <div className="nova-overlay"><section className="nova-dialog administrative-import-dialog"><header><div><p>NHẬP DỮ LIỆU EXCEL</p><h2>Import {label}</h2><span>Không cần cột ID: hệ thống tự sinh ID cho từng bản ghi khi import thành công.</span></div><button onClick={close}><X /></button></header><div className="nova-dialog-body">
    <div className="admin-import-guide"><div><Download /><span><b>Chưa có mẫu?</b><small>Tải file mẫu; chỉ điền dữ liệu và mã danh mục, không nhập ID.</small></span><button className="nova-button secondary" disabled={busy === 'template'} onClick={() => void template()}>Tải mẫu</button></div><div><Upload /><span><b>Đã có file?</b><small>Hệ thống nhận cột tiếng Việt, ngày dạng dd/MM/yyyy và tự sinh ID bản ghi.</small></span></div></div>
    <div className="nova-form-grid"><label><span>File Excel .xlsx</span><input type="file" accept=".xlsx" onChange={(event) => void choose(event.target.files?.[0] ?? null)} /></label><label><span>Tên sheet (không bắt buộc)</span><input value={sheetName} onChange={(event) => setSheetName(event.target.value)} placeholder="Mặc định sheet đầu tiên" /></label></div>
    {error && <div className="nova-form-error">{error}</div>}{file && <div className="admin-import-file"><span><Table2 /></span><div><b>{file.name}</b><small>{(file.size / 1024).toFixed(1)} KB</small></div><button className="nova-button primary" disabled={!encoded || busy === 'preview'} onClick={() => void inspect()}>Xem trước</button></div>}
    {preview && <div className="admin-import-preview"><header><b>Sheet “{preview.sheetName}”</b><span>{preview.validRows} hợp lệ · <em>{preview.invalidRows} lỗi</em></span></header><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Dòng</th><th>Mã</th><th>Nội dung</th><th>Kiểm tra</th></tr></thead><tbody>{preview.rows.map((row) => <tr key={row.rowNumber} className={row.valid ? '' : 'invalid'}><td>{row.rowNumber}</td><td><b>{row.key || '—'}</b></td><td>{row.summary || '—'}</td><td>{row.valid ? <em className="good">Hợp lệ</em> : <em className="danger">{row.errors.join('; ')}</em>}</td></tr>)}</tbody></table></div></div>}
  </div><footer><button className="nova-button secondary" onClick={close}>Hủy</button><button className="nova-button primary" disabled={!preview || preview.invalidRows > 0 || busy === 'import'} onClick={() => void commit()}><Upload />{busy === 'import' ? 'Đang import…' : `Import ${preview?.validRows ?? 0} dòng`}</button></footer></section></div>;
}
