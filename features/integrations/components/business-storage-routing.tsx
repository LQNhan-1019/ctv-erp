'use client';

import { Check, Database, Folder, Pencil, Plus, RefreshCw, Save, Search, ShieldCheck, X } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/features/auth/context/auth-context';
import {
  listBusinessStorageBindings,
  listBusinessStorageFunctions,
  saveBusinessStorageBinding,
} from '../api/business-storage-api';
import type {
  BusinessFunction,
  BusinessStorageBinding,
  BusinessStorageBindingInput,
} from '../types/business-storage';
import type { IntegrationConnection } from '../types/integration';

const moduleLabels: Record<string, string> = {
  SALES: 'Kinh doanh',
  PURCHASE: 'Mua hàng',
  INVENTORY: 'Kho & tồn',
  RETAIL: 'Cửa hàng bán lẻ',
  FLEET: 'Xe bồn',
  ACCOUNTING: 'Kế toán',
  HR_ADMIN: 'Hành chính nhân sự',
};

const folderSuggestions: Record<string, { code: string; name: string }> = {
  SALES: { code: 'PKD', name: 'Phòng Kinh doanh' },
  PURCHASE: { code: 'PMH', name: 'Phòng Mua hàng' },
  INVENTORY: { code: 'PKHO', name: 'Kho và Tồn trữ' },
  RETAIL: { code: 'PBL', name: 'Khối Bán lẻ' },
  FLEET: { code: 'PXEBON', name: 'Đội Xe bồn' },
  ACCOUNTING: { code: 'PKT', name: 'Phòng Kế toán' },
  HR_ADMIN: { code: 'PHCNS', name: 'Phòng HCNS' },
};

function StorageBindingDialog({
  businessFunction,
  binding,
  drives,
  onClose,
  onSave,
}: {
  businessFunction: BusinessFunction;
  binding: BusinessStorageBinding | null;
  drives: IntegrationConnection[];
  onClose: () => void;
  onSave: (input: BusinessStorageBindingInput) => Promise<void>;
}) {
  const suggestion = folderSuggestions[businessFunction.module] ?? {
    code: businessFunction.module,
    name: moduleLabels[businessFunction.module] ?? businessFunction.module,
  };
  const activeDrives = drives.filter((drive) => drive.active);
  const initialConnectionId = binding?.connectionId && drives.some((drive) => drive.id === binding.connectionId)
    ? binding.connectionId
    : activeDrives[0]?.id ?? '';
  const [connectionId, setConnectionId] = useState(initialConnectionId);
  const [folderCode, setFolderCode] = useState(binding?.folderCode ?? suggestion.code);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const connectionId = String(data.get('connectionId') ?? '');
    if (!connectionId) {
      setError('Hãy chọn một kết nối Google Drive đang hoạt động');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onSave({
        connectionId,
        folderCode: String(data.get('folderCode') ?? '').trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_'),
        folderName: String(data.get('folderName') ?? '').trim(),
        active: data.get('active') === 'on',
      });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể lưu định tuyến Google Drive');
    } finally {
      setSubmitting(false);
    }
  }

  const selectedDrive = drives.find((drive) => drive.id === connectionId);
  const previewFolderCode = folderCode.trim().toUpperCase() || suggestion.code;

  return (
    <div className="nova-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="nova-dialog nova-storage-dialog" role="dialog" aria-modal="true" aria-labelledby="storage-dialog-title">
        <header>
          <div><p>ĐỊNH TUYẾN GOOGLE DRIVE</p><h2 id="storage-dialog-title">{businessFunction.label}</h2><span>{moduleLabels[businessFunction.module] ?? businessFunction.module} · {businessFunction.code}</span></div>
          <button onClick={onClose} aria-label="Đóng"><X /></button>
        </header>
        <form onSubmit={submit}>
          <div className="nova-dialog-body">
            <label>
              <span>Kết nối Google Drive</span>
              <select name="connectionId" value={connectionId} onChange={(event) => setConnectionId(event.target.value)} required>
                <option value="" disabled>Chọn kết nối…</option>
                {drives.map((drive) => <option value={drive.id} key={drive.id} disabled={!drive.active && drive.id !== binding?.connectionId}>{drive.name} ({drive.code}){drive.active ? '' : ' — đã tạm dừng'}</option>)}
              </select>
              {drives.length === 0 && <small className="nova-field-hint">Chưa có kết nối Google Drive. Hãy tạo kết nối ở phần phía trên trước.</small>}
            </label>
            <div className="nova-form-grid">
              <label><span>Mã thư mục</span><div className="nova-field"><Folder /><input name="folderCode" value={folderCode} onChange={(event) => setFolderCode(event.target.value)} minLength={2} maxLength={64} pattern="[A-Za-z][A-Za-z0-9_]{1,63}" placeholder="VD. PHCNS" required /></div></label>
              <label><span>Tên thư mục</span><div className="nova-field"><Folder /><input name="folderName" defaultValue={binding?.folderName ?? suggestion.name} maxLength={128} placeholder="Phòng HCNS" required /></div></label>
            </div>
            <label className="nova-switch-label"><span>Trạng thái định tuyến</span><div><input type="checkbox" name="active" defaultChecked={binding?.active ?? true} /><b>Cho phép chức năng sử dụng cấu hình này</b></div></label>
            <div className="nova-storage-path-preview">
              <span><Database /></span>
              <div><small>ĐƯỜNG DẪN CẤU HÌNH</small><b>{selectedDrive?.name ?? 'Google Drive'} / {previewFolderCode}</b><p>Chỉ tạo mã định tuyến; chưa tạo thư mục hay ghi file lên Google Drive.</p></div>
            </div>
            <div className="nova-info-note"><ShieldCheck /><span>Khi chức năng nghiệp vụ lưu tài liệu ở giai đoạn sau, backend sẽ dùng mapping này để chọn đúng kết nối và thư mục. Credential vẫn chỉ nằm trong biến môi trường.</span></div>
            {error && <div className="nova-form-error" role="alert">{error}</div>}
          </div>
          <footer><button type="button" className="nova-button secondary" onClick={onClose}>Hủy</button><button type="submit" className="nova-button primary" disabled={submitting || !connectionId}><Save />{submitting ? 'Đang lưu…' : 'Lưu định tuyến'}</button></footer>
        </form>
      </section>
    </div>
  );
}

export default function BusinessStorageRouting({ connections, canManage }: {
  connections: IntegrationConnection[];
  canManage: boolean;
}) {
  const { request } = useAuth();
  const [functions, setFunctions] = useState<BusinessFunction[]>([]);
  const [bindings, setBindings] = useState<BusinessStorageBinding[]>([]);
  const [selectedFunction, setSelectedFunction] = useState<BusinessFunction | null>(null);
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [functionList, bindingList] = await Promise.all([
        listBusinessStorageFunctions(request),
        listBusinessStorageBindings(request),
      ]);
      setFunctions(functionList);
      setBindings(bindingList);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không tải được định tuyến lưu trữ nghiệp vụ');
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const bindingByFunction = useMemo(
    () => new Map(bindings.map((binding) => [binding.navigationItemId, binding])),
    [bindings],
  );
  const modules = useMemo(() => Array.from(new Set(functions.map((item) => item.module))), [functions]);
  const visibleFunctions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return functions.filter((item) => {
      const inModule = moduleFilter === 'ALL' || item.module === moduleFilter;
      const matches = !normalized || (item.label + ' ' + item.code + ' ' + item.module).toLowerCase().includes(normalized);
      return inModule && matches;
    });
  }, [functions, moduleFilter, query]);
  const drives = connections.filter((connection) => connection.connectionType === 'GOOGLE_DRIVE');
  const selectedBinding = selectedFunction ? bindingByFunction.get(selectedFunction.navigationItemId) ?? null : null;

  async function save(input: BusinessStorageBindingInput) {
    if (!selectedFunction) return;
    const saved = await saveBusinessStorageBinding(request, selectedFunction.navigationItemId, input);
    setBindings((current) => {
      const exists = current.some((item) => item.id === saved.id);
      return exists ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved];
    });
    setToast('Đã định tuyến ' + saved.functionLabel + ' tới thư mục ' + saved.folderCode);
  }

  return (
    <section className="nova-storage-routing">
      <header>
        <div><p>LƯU TRỮ THEO CHỨC NĂNG</p><h2>Định tuyến dữ liệu nghiệp vụ</h2><span>Chọn kết nối Google Drive và mã thư mục riêng cho từng chức năng.</span></div>
        <div><span><b>{bindings.filter((item) => item.active).length}</b><small>đã cấu hình</small></span><span><b>{drives.filter((item) => item.active).length}</b><small>Drive khả dụng</small></span></div>
      </header>
      <div className="nova-storage-note"><Folder /><span><b>Ví dụ:</b> các chức năng Hành chính nhân sự có thể cùng định tuyến vào thư mục <code>PHCNS</code>. Phần này chỉ lưu cấu hình, chưa ghi file.</span></div>
      <div className="nova-storage-toolbar">
        <div className="nova-account-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm chức năng nghiệp vụ…" /></div>
        <select value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)}><option value="ALL">Tất cả phòng ban</option>{modules.map((module) => <option value={module} key={module}>{moduleLabels[module] ?? module}</option>)}</select>
        <button onClick={() => void load()} aria-label="Làm mới định tuyến" disabled={loading}><RefreshCw className={loading ? 'spin' : ''} /></button>
      </div>
      {error && <div className="nova-panel-error"><span>{error}</span><button onClick={() => void load()}>Thử lại</button></div>}
      <div className="nova-storage-table" role="table" aria-label="Định tuyến lưu trữ theo chức năng">
        <div className="nova-storage-row head" role="row"><span>CHỨC NĂNG</span><span>PHÒNG BAN</span><span>KẾT NỐI DRIVE</span><span>THƯ MỤC</span><span>TRẠNG THÁI</span><span /></div>
        {loading && Array.from({ length: 6 }).map((_, index) => <div className="nova-storage-row skeleton" key={index}><span /><span /><span /><span /><span /><span /></div>)}
        {!loading && visibleFunctions.map((businessFunction) => {
          const binding = bindingByFunction.get(businessFunction.navigationItemId);
          const ready = binding?.active && binding.connectionActive;
          return (
            <div className="nova-storage-row" role="row" key={businessFunction.navigationItemId}>
              <span className="nova-storage-function"><i><Folder /></i><div><b>{businessFunction.label}</b><small>{businessFunction.code}</small></div></span>
              <span><b>{moduleLabels[businessFunction.module] ?? businessFunction.module}</b><small>{businessFunction.module}</small></span>
              <span>{binding ? <><b>{binding.connectionName}</b><small>{binding.connectionCode}</small></> : <em>Chưa chọn</em>}</span>
              <span>{binding ? <><code>{binding.folderCode}</code><small>{binding.folderName}</small></> : <em>Chưa có thư mục</em>}</span>
              <span><em className={'nova-routing-status ' + (ready ? 'ready' : binding ? 'paused' : 'empty')}><i />{ready ? 'Sẵn sàng' : binding ? 'Tạm dừng' : 'Chưa cấu hình'}</em></span>
              <span>{canManage && <button className="nova-button secondary compact" onClick={() => setSelectedFunction(businessFunction)}>{binding ? <Pencil /> : <Plus />}{binding ? 'Sửa' : 'Cấu hình'}</button>}</span>
            </div>
          );
        })}
        {!loading && visibleFunctions.length === 0 && <div className="nova-account-empty"><span><Folder /></span><b>Không có chức năng phù hợp</b><p>Thử thay đổi phòng ban hoặc từ khóa tìm kiếm.</p></div>}
      </div>
      {selectedFunction && <StorageBindingDialog businessFunction={selectedFunction} binding={selectedBinding} drives={drives} onClose={() => setSelectedFunction(null)} onSave={save} />}
      {toast && <div className="nova-admin-toast"><span><Check /></span>{toast}</div>}
    </section>
  );
}
