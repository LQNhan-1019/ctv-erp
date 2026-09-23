'use client';

import { appDialog } from '@/lib/ui/app-dialog';

import { FileText, Trash2, Upload, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/context/auth-context';
import { deleteExpenseInvoice, listExpenseInvoices, uploadExpenseInvoice } from '../api/administration-api';
import type { Expense, ExpenseInvoice } from '../types/administration';

const size = (value: number) => value < 1_048_576 ? `${Math.ceil(value / 1024)} KB` : `${(value / 1_048_576).toFixed(1)} MB`;

export default function ExpenseInvoicesDialog({ expense, canManage, close, changed }: { expense: Expense; canManage: boolean; close: () => void; changed: () => Promise<void> }) {
  const { request, download } = useAuth();
  const [invoices, setInvoices] = useState<ExpenseInvoice[]>([]);
  const [selected, setSelected] = useState<ExpenseInvoice>();
  const [previewUrl, setPreviewUrl] = useState('');
  const [busy, setBusy] = useState('load');
  const [error, setError] = useState('');
  const load = useCallback(async () => { setBusy('load'); setError(''); try { setInvoices(await listExpenseInvoices(request, expense.id)); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không tải được hóa đơn'); } finally { setBusy(''); } }, [expense.id, request]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  async function preview(invoice: ExpenseInvoice) { setBusy(invoice.id); setError(''); try { const blob = await download(`/api/admin/expenses/${expense.id}/invoices/${invoice.id}/content`); if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(URL.createObjectURL(blob)); setSelected(invoice); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không mở được hóa đơn'); } finally { setBusy(''); } }
  async function upload(file?: File) { if (!file) return; setBusy('upload'); setError(''); try { await uploadExpenseInvoice(request, expense.id, file); await load(); await changed(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không tải được hóa đơn lên'); } finally { setBusy(''); } }
  async function remove(invoice: ExpenseInvoice) { if (!await appDialog.confirm(`Xóa file “${invoice.fileName}”?`)) return; setBusy(invoice.id); try { await deleteExpenseInvoice(request, expense.id, invoice.id); if (selected?.id === invoice.id) { if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(''); setSelected(undefined); } await load(); await changed(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không xóa được hóa đơn'); } finally { setBusy(''); } }
  return <div className="nova-overlay"><section className="nova-dialog admin-dialog invoice-dialog"><header><div><p>HÓA ĐƠN ĐÍNH KÈM</p><h2>{expense.expenseNo}</h2><span>{expense.workContent}</span></div><button onClick={close}><X /></button></header><div className="nova-dialog-body"><div className="invoice-toolbar"><span>{invoices.length} file trên Google Drive</span>{canManage && <label className="nova-button primary"><Upload />{busy === 'upload' ? 'Đang tải…' : 'Thêm hóa đơn'}<input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" disabled={busy === 'upload'} onChange={(event) => void upload(event.target.files?.[0])} /></label>}</div>{error && <div className="nova-form-error">{error}</div>}<div className="invoice-layout"><div className="invoice-list">{busy === 'load' && <div className="admin-loading">Đang tải…</div>}{invoices.map((invoice) => <article key={invoice.id} className={selected?.id === invoice.id ? 'active' : ''}><button className="invoice-open" disabled={busy === invoice.id} onClick={() => void preview(invoice)}><FileText /><span><b>{invoice.fileName}</b><small>{size(invoice.fileSize)} · {new Date(invoice.createdAt).toLocaleString('vi-VN')}</small></span></button>{canManage && <button className="invoice-delete" onClick={() => void remove(invoice)} aria-label="Xóa hóa đơn"><Trash2 /></button>}</article>)}{!busy && !invoices.length && <div className="admin-empty">Chưa có file hóa đơn.</div>}</div><div className="invoice-preview">{previewUrl && selected ? <object data={previewUrl} type={selected.contentType} aria-label={selected.fileName} /> : <div><FileText /><p>Chọn một hóa đơn để xem trực tiếp</p></div>}</div></div></div><footer><button className="nova-button secondary" onClick={close}>Đóng</button></footer></section></div>;
}
