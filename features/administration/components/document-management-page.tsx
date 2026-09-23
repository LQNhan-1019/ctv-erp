'use client';

import { appDialog } from '@/lib/ui/app-dialog';

import { Check, Pencil, Plus, Save, ShieldCheck, Trash2, TriangleAlert, Upload, X } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/features/auth/context/auth-context';
import AdministrativeImportDialog from './administrative-import-dialog';
import DocumentDataTable from './document-data-table';
import { createDocument, createDocumentType, deleteDocument, deleteDocumentType, deleteDocuments, getDocumentDashboard, listBusinessUnits, listDocuments, listDocumentTypes, updateDocument, updateDocumentType } from '../api/administration-api';
import type { BusinessUnit, ComplianceDocument, DocumentCategory, DocumentDashboard, DocumentInput, DocumentStatus, DocumentType } from '../types/administration';

const value = (data: FormData, key: string) => String(data.get(key) ?? '').trim();
const formatDate = (date: string | null) => date ? new Intl.DateTimeFormat('vi-VN').format(new Date(date + 'T00:00:00')) : 'Không thời hạn';
const statusLabels: Record<DocumentStatus, string> = { DRAFT: 'Nháp', ACTIVE: 'Hiệu lực', EXPIRED: 'Hết hạn', RENEWING: 'Đang gia hạn', REVOKED: 'Thu hồi' };
const categoryLabels: Record<DocumentCategory, string> = { INSURANCE: 'Bảo hiểm', FIRE_SAFETY: 'PCCC & an toàn', LICENSE: 'Giấy phép', INSPECTION: 'Kiểm định', CONTRACT: 'Hợp đồng', CERTIFICATE: 'Chứng chỉ', OTHER: 'Khác' };

export default function DocumentManagementPage() {
  const { user, request, download } = useAuth();
  const canView = user?.permissions.includes('ADMIN.DOCUMENT.VIEW') ?? false;
  const canManage = user?.permissions.includes('ADMIN.DOCUMENT.MANAGE') ?? false;
  const canImport = user?.permissions.includes('ADMIN.DOCUMENT.IMPORT') ?? false;
  const [importOpen, setImportOpen] = useState(false);
  const [tab, setTab] = useState<'overview' | 'documents' | 'types'>('overview');
  const [unitId, setUnitId] = useState('');
  const [typeId, setTypeId] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));
  const [dashboard, setDashboard] = useState<DocumentDashboard | null>(null);
  const [documents, setDocuments] = useState<ComplianceDocument[]>([]);
  const [types, setTypes] = useState<DocumentType[]>([]);
  const [units, setUnits] = useState<BusinessUnit[]>([]);
  const [editing, setEditing] = useState<ComplianceDocument | null | undefined>();
  const [typeEditing, setTypeEditing] = useState<DocumentType | null | undefined>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true); setError('');
    try {
      const [summary, rows, typeRows, unitRows] = await Promise.all([
        getDocumentDashboard(request, { asOf, businessUnitId: unitId }),
        listDocuments(request, { asOf, businessUnitId: unitId, documentTypeId: typeId, status, search }),
        listDocumentTypes(request), listBusinessUnits(request),
      ]);
      setDashboard(summary); setDocuments(rows); setTypes(typeRows); setUnits(unitRows);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không tải được dữ liệu giấy tờ'); }
    finally { setLoading(false); }
  }, [asOf, canView, request, search, status, typeId, unitId]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 3500); return () => window.clearTimeout(timer); }, [toast]);
  const activeTypes = useMemo(() => types.filter((item) => item.active), [types]);

  async function saveDocument(input: DocumentInput) {
    setBusy('document'); setError('');
    try { if (editing) await updateDocument(request, editing.id, input); else await createDocument(request, input); setEditing(undefined); setToast(editing ? 'Đã cập nhật giấy tờ' : 'Đã thêm giấy tờ'); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể lưu giấy tờ'); }
    finally { setBusy(''); }
  }
  async function removeDocument(item: ComplianceDocument) {
    if (!await appDialog.confirm(`Xóa giấy tờ “${item.documentName}”?`)) return;
    setBusy(item.id); try { await deleteDocument(request, item.id); setToast('Đã xóa giấy tờ'); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể xóa'); } finally { setBusy(''); }
  }
  async function removeSelectedDocuments(ids: string[]) {
    if (!ids.length || !await appDialog.confirm(`Xóa ${ids.length} giấy tờ đã chọn? Thao tác này không thể hoàn tác.`)) return false;
    setBusy('bulk-documents'); setError('');
    try { const result = await deleteDocuments(request, ids); setToast(`Đã xóa ${result.deleted} giấy tờ`); await load(); return true; }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể xóa các giấy tờ đã chọn'); return false; }
    finally { setBusy(''); }
  }
  async function saveType(input: Omit<DocumentType, 'id'>) {
    setBusy('type'); try { if (typeEditing) await updateDocumentType(request, typeEditing.id, input); else await createDocumentType(request, input); setTypeEditing(undefined); setToast('Đã lưu loại giấy tờ'); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể lưu loại giấy tờ'); } finally { setBusy(''); }
  }
  async function removeType(item: DocumentType) {
    if (!await appDialog.confirm(`Xóa loại “${item.name}”?`)) return;
    setBusy(item.id); try { await deleteDocumentType(request, item.id); setToast('Đã xóa loại giấy tờ'); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể xóa loại'); } finally { setBusy(''); }
  }

  if (!canView) return <section className="nova-access-denied"><span><ShieldCheck /></span><p>KHÔNG ĐỦ QUYỀN</p><h1>Bạn không thể xem hồ sơ và thời hạn.</h1><div>Cần quyền <code>ADMIN.DOCUMENT.VIEW</code>.</div></section>;
  return <div className="nova-account-page admin-module-page">
    <header className="nova-page-header admin-module-header"><div><p className="nova-eyebrow">TUÂN THỦ & PHÁP LÝ</p><h1>Quản lý thời hạn giấy tờ</h1><span>Theo dõi bảo hiểm, PCCC, giấy phép, kiểm định và hợp đồng theo từng phòng ban/đơn vị.</span></div><div className="admin-header-actions">{canImport && <button className="nova-button secondary" onClick={() => setImportOpen(true)}><Upload />Import Excel</button>}{canManage && <button className="nova-button primary" onClick={() => setEditing(null)}><Plus />Thêm giấy tờ</button>}</div></header>
    <nav className="admin-module-tabs"><button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>Dashboard</button><button className={tab === 'documents' ? 'active' : ''} onClick={() => setTab('documents')}>Danh sách giấy tờ</button><button className={tab === 'types' ? 'active' : ''} onClick={() => setTab('types')}>Loại giấy tờ</button></nav>
    <div className="admin-filter-bar"><label><span>Tính đến ngày</span><input type="date" value={asOf} onChange={(event) => setAsOf(event.target.value)} /></label><label><span>Phòng ban / đơn vị</span><select value={unitId} onChange={(event) => setUnitId(event.target.value)}><option value="">Tất cả đơn vị</option>{units.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{tab === 'documents' && <><label><span>Loại giấy tờ</span><select value={typeId} onChange={(event) => setTypeId(event.target.value)}><option value="">Tất cả loại</option>{activeTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label><span>Trạng thái hồ sơ</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Tất cả</option>{Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="search"><span>Tìm kiếm</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Số, tên, nơi cấp…" /></label></>}</div>
    {error && <div className="nova-panel-error"><span>{error}</span><button onClick={() => void load()}>Thử lại</button></div>}
    {loading && <div className="admin-loading">Đang kiểm tra thời hạn…</div>}
    {!loading && tab === 'overview' && dashboard && <DocumentOverview data={dashboard} />}
    {!loading && tab === 'documents' && <DocumentDataTable rows={documents} canManage={canManage} busy={busy} edit={setEditing} remove={removeDocument} removeSelected={removeSelectedDocuments} />}
    {!loading && tab === 'types' && <section className="admin-data-card"><header><div><h2>Danh mục loại giấy tờ</h2><p>Quy định nhóm và số ngày cảnh báo mặc định.</p></div>{canManage && <button className="nova-button primary" onClick={() => setTypeEditing(null)}><Plus />Thêm loại</button>}</header><div className="admin-category-grid">{types.map((item) => <article key={item.id} className={!item.active ? 'inactive' : ''}><div><small>{item.code}</small><b>{item.name}</b><span>{categoryLabels[item.category]} · nhắc trước {item.defaultReminderDays} ngày</span></div>{canManage && <div className="admin-row-actions"><button onClick={() => setTypeEditing(item)}><Pencil /></button><button className="danger" onClick={() => void removeType(item)}><Trash2 /></button></div>}</article>)}</div></section>}
    {editing !== undefined && <DocumentDialog document={editing} units={units} types={activeTypes} busy={busy === 'document'} onClose={() => setEditing(undefined)} onSave={saveDocument} />}
    {typeEditing !== undefined && <DocumentTypeDialog type={typeEditing} busy={busy === 'type'} onClose={() => setTypeEditing(undefined)} onSave={saveType} />}
    <AdministrativeImportDialog open={importOpen} type="DOCUMENT" request={request} download={download} close={() => setImportOpen(false)} imported={async (text) => { setToast(text); await load(); }} />
    {toast && <div className="nova-admin-toast"><span><Check /></span>{toast}</div>}
  </div>;
}

function DocumentOverview({ data }: { data: DocumentDashboard }) {
  return <><section className="admin-kpis documents"><article><small>TỔNG HỒ SƠ</small><b>{data.total}</b><span>Đang được theo dõi</span></article><article><small>CÒN HIỆU LỰC</small><b>{data.active}</b><span>Chưa đến ngưỡng cảnh báo</span></article><article className="warning"><small>SẮP HẾT HẠN</small><b>{data.expiring}</b><span>Cần chuẩn bị gia hạn</span></article><article className="danger"><small>ĐÃ HẾT HẠN</small><b>{data.expired}</b><span>Cần xử lý ngay</span></article><article><small>KHÔNG THỜI HẠN</small><b>{data.withoutExpiry}</b><span>Hồ sơ lưu trữ dài hạn</span></article></section><section className="admin-dashboard-grid"><article className="admin-chart-card wide"><header><div><h2>Cảnh báo thời hạn giấy tờ</h2><p>Sắp xếp ưu tiên theo ngày hết hạn gần nhất.</p></div></header><div className="document-alert-list">{data.alerts.map((item) => <article key={item.id} className={item.expiryState.toLowerCase()}><span><TriangleAlert /></span><div><b>{item.documentName}</b><small>{item.businessUnitName} · {item.documentTypeName} · {item.documentNo}</small></div><time>{formatDate(item.expiresOn)}<small>{item.daysRemaining !== null && (item.daysRemaining < 0 ? `Quá ${Math.abs(item.daysRemaining)} ngày` : `Còn ${item.daysRemaining} ngày`)}</small></time></article>)}{!data.alerts.length && <div className="admin-empty">Không có giấy tờ cần cảnh báo trong 90 ngày tới.</div>}</div></article><article className="admin-chart-card"><header><div><h2>Theo loại giấy tờ</h2><p>Tổng hồ sơ và mức độ cần xử lý.</p></div></header><div className="document-type-summary">{data.byType.map((item) => <div key={item.typeId}><b>{item.typeName}</b><span>Tổng <strong>{item.total}</strong></span><span className="warning">Sắp hạn <strong>{item.expiring}</strong></span><span className="danger">Hết hạn <strong>{item.expired}</strong></span></div>)}</div></article></section></>;
}

function DocumentDialog({ document, units, types, busy, onClose, onSave }: { document: ComplianceDocument | null; units: BusinessUnit[]; types: DocumentType[]; busy: boolean; onClose: () => void; onSave: (input: DocumentInput) => Promise<void> }) {
  const [selectedType, setSelectedType] = useState(document?.documentTypeId || types[0]?.id || '');
  const defaultReminder = types.find((item) => item.id === selectedType)?.defaultReminderDays ?? 30;
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); try { setError(''); await onSave({ businessUnitId: value(data, 'businessUnitId'), documentTypeId: value(data, 'documentTypeId'), documentNo: value(data, 'documentNo'), documentName: value(data, 'documentName'), issuedBy: value(data, 'issuedBy') || null, issuedOn: value(data, 'issuedOn') || null, effectiveOn: value(data, 'effectiveOn') || null, expiresOn: value(data, 'expiresOn') || null, reminderDaysBefore: Number(value(data, 'reminderDaysBefore')), responsibleEmployeeId: null, status: value(data, 'status') as DocumentStatus, fileUri: value(data, 'fileUri') || null, notes: value(data, 'notes') || null }); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể lưu giấy tờ'); } }
  return <div className="nova-overlay"><section className="nova-dialog admin-dialog"><header><div><p>HỒ SƠ & THỜI HẠN</p><h2>{document ? 'Chỉnh sửa giấy tờ' : 'Thêm giấy tờ'}</h2><span>Hệ thống tự tính còn hạn, sắp hết hạn hoặc đã hết hạn.</span></div><button onClick={onClose}><X /></button></header><form onSubmit={submit}><div className="nova-dialog-body"><div className="nova-form-grid"><label><span>Phòng ban / Đơn vị sở hữu</span><select name="businessUnitId" defaultValue={document?.businessUnitId} required><option value="">Chọn đơn vị</option>{units.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label><span>Loại giấy tờ</span><select name="documentTypeId" value={selectedType} onChange={(event) => setSelectedType(event.target.value)} required><option value="">Chọn loại</option>{types.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div><div className="nova-form-grid"><label><span>Số giấy tờ</span><input name="documentNo" defaultValue={document?.documentNo} required maxLength={96} /></label><label><span>Tên giấy tờ</span><input name="documentName" defaultValue={document?.documentName} required maxLength={255} /></label></div><div className="nova-form-grid"><label><span>Nơi cấp / Đơn vị phát hành</span><input name="issuedBy" defaultValue={document?.issuedBy || ''} /></label><label><span>Trạng thái hồ sơ</span><select name="status" defaultValue={document?.status || 'ACTIVE'}>{Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div><div className="nova-form-grid three"><label><span>Ngày cấp</span><input name="issuedOn" type="date" defaultValue={document?.issuedOn || ''} /></label><label><span>Ngày hiệu lực</span><input name="effectiveOn" type="date" defaultValue={document?.effectiveOn || ''} /></label><label><span>Ngày hết hạn</span><input name="expiresOn" type="date" defaultValue={document?.expiresOn || ''} /></label></div><div className="nova-form-grid"><label><span>Nhắc trước (ngày)</span><input name="reminderDaysBefore" type="number" min="0" max="3650" key={`${selectedType}-${document?.id || 'new'}`} defaultValue={document?.reminderDaysBefore ?? defaultReminder} required /></label><label><span>Link file lưu trữ</span><input name="fileUri" type="url" defaultValue={document?.fileUri || ''} placeholder="Google Drive hoặc file server" /></label></div><label><span>Ghi chú</span><textarea name="notes" defaultValue={document?.notes || ''} maxLength={4000} /></label>{error && <div className="nova-form-error">{error}</div>}</div><footer><button type="button" className="nova-button secondary" onClick={onClose}>Hủy</button><button className="nova-button primary" disabled={busy}><Save />{busy ? 'Đang lưu…' : 'Lưu giấy tờ'}</button></footer></form></section></div>;
}

function DocumentTypeDialog({ type, busy, onClose, onSave }: { type: DocumentType | null; busy: boolean; onClose: () => void; onSave: (input: Omit<DocumentType, 'id'>) => Promise<void> }) {
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); try { setError(''); await onSave({ code: value(data, 'code').toUpperCase(), name: value(data, 'name'), category: value(data, 'category') as DocumentCategory, defaultReminderDays: Number(value(data, 'defaultReminderDays')), active: data.get('active') === 'on', sortOrder: Number(value(data, 'sortOrder')) }); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể lưu'); } }
  return <div className="nova-overlay"><section className="nova-dialog admin-dialog compact"><header><div><p>LOẠI GIẤY TỜ</p><h2>{type ? 'Sửa loại giấy tờ' : 'Thêm loại giấy tờ'}</h2></div><button onClick={onClose}><X /></button></header><form onSubmit={submit}><div className="nova-dialog-body"><div className="nova-form-grid"><label><span>Mã</span><input name="code" defaultValue={type?.code} pattern="[A-Za-z0-9._-]+" required /></label><label><span>Tên loại</span><input name="name" defaultValue={type?.name} required /></label></div><div className="nova-form-grid"><label><span>Nhóm giấy tờ</span><select name="category" defaultValue={type?.category || 'OTHER'}>{Object.entries(categoryLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label><span>Nhắc trước (ngày)</span><input name="defaultReminderDays" type="number" min="0" max="3650" defaultValue={type?.defaultReminderDays ?? 30} /></label></div><div className="nova-form-grid"><label><span>Thứ tự</span><input name="sortOrder" type="number" min="0" defaultValue={type?.sortOrder || 0} /></label><label className="admin-check"><input type="checkbox" name="active" defaultChecked={type?.active ?? true} />Đang sử dụng</label></div>{error && <div className="nova-form-error">{error}</div>}</div><footer><button type="button" className="nova-button secondary" onClick={onClose}>Hủy</button><button className="nova-button primary" disabled={busy}>Lưu loại giấy tờ</button></footer></form></section></div>;
}
