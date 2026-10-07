'use client';

import { appDialog } from '@/lib/ui/app-dialog';
import { Download, FileText, Trash2, Upload, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/context/auth-context';
import { deleteDocumentFile, listDocumentFiles, uploadDocumentFile } from '../api/administration-api';
import type { ComplianceDocument, DocumentFile } from '../types/administration';

const size = (value: number) => value < 1_048_576
  ? `${Math.ceil(value / 1024)} KB`
  : `${(value / 1_048_576).toFixed(1)} MB`;
const previewable = (contentType: string) => contentType === 'application/pdf' || contentType.startsWith('image/');

export default function DocumentFilesDialog({ document, canManage, close, changed }: {
  document: ComplianceDocument;
  canManage: boolean;
  close: () => void;
  changed: () => Promise<void>;
}) {
  const { request, download } = useAuth();
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [selected, setSelected] = useState<DocumentFile>();
  const [previewUrl, setPreviewUrl] = useState('');
  const [busy, setBusy] = useState('load');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setBusy('load'); setError('');
    try { setFiles(await listDocumentFiles(request, document.id)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không tải được file giấy tờ'); }
    finally { setBusy(''); }
  }, [document.id, request]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  async function open(file: DocumentFile) {
    setBusy(file.id); setError('');
    try {
      const blob = await download(`/api/admin/documents/${document.id}/files/${file.id}/content`);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(blob));
      setSelected(file);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không mở được file giấy tờ');
    } finally { setBusy(''); }
  }

  async function upload(file?: File) {
    if (!file) return;
    setBusy('upload'); setError('');
    try { await uploadDocumentFile(request, document.id, file); await load(); await changed(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không tải được file lên Google Drive'); }
    finally { setBusy(''); }
  }

  async function remove(file: DocumentFile) {
    if (!await appDialog.confirm(`Xóa file “${file.fileName}” khỏi Google Drive?`)) return;
    setBusy(file.id); setError('');
    try {
      await deleteDocumentFile(request, document.id, file.id);
      if (selected?.id === file.id) {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(''); setSelected(undefined);
      }
      await load(); await changed();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không xóa được file giấy tờ'); }
    finally { setBusy(''); }
  }

  return <div className="nova-overlay"><section className="nova-dialog admin-dialog invoice-dialog"><header><div><p>FILE GIẤY TỜ TRÊN GOOGLE DRIVE</p><h2>{document.documentName}</h2><span>{document.documentNo} · {document.businessUnitName}</span></div><button onClick={close} aria-label="Đóng"><X /></button></header><div className="nova-dialog-body"><div className="invoice-toolbar"><span>{files.length} file đã lưu trên Google Drive</span>{canManage && <label className="nova-button primary"><Upload />{busy === 'upload' ? 'Đang tải…' : 'Tải file từ máy'}<input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,application/pdf,image/jpeg,image/png,image/webp,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" disabled={busy === 'upload'} onChange={(event) => { void upload(event.target.files?.[0]); event.currentTarget.value = ''; }} /></label>}</div>{error && <div className="nova-form-error">{error}</div>}<div className="invoice-layout"><div className="invoice-list">{busy === 'load' && <div className="admin-loading">Đang tải…</div>}{files.map((file) => <article key={file.id} className={selected?.id === file.id ? 'active' : ''}><button className="invoice-open" disabled={busy === file.id} onClick={() => void open(file)}><FileText /><span><b>{file.fileName}</b><small>{size(file.fileSize)} · {new Date(file.createdAt).toLocaleString('vi-VN')}</small></span></button>{canManage && <button className="invoice-delete" onClick={() => void remove(file)} aria-label="Xóa file"><Trash2 /></button>}</article>)}{!busy && !files.length && <div className="admin-empty">Chưa có file giấy tờ trên Google Drive.</div>}</div><div className="invoice-preview">{previewUrl && selected ? previewable(selected.contentType) ? <object data={previewUrl} type={selected.contentType} aria-label={selected.fileName} /> : <div><FileText /><p>Trình duyệt không xem trực tiếp định dạng này.</p><a className="nova-button primary" href={previewUrl} download={selected.fileName}><Download />Tải file về máy</a></div> : <div><FileText /><p>Chọn một file để xem hoặc tải xuống</p></div>}</div></div></div><footer><button className="nova-button secondary" onClick={close}>Đóng</button></footer></section></div>;
}
