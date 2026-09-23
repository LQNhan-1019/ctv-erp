'use client';

import { appDialog } from '@/lib/ui/app-dialog';

import { Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useAuth } from '@/features/auth/context/auth-context';
import { createExpenseBranch, createExpenseDepartment, createExpenseItem, deleteExpenseBranch, deleteExpenseDepartment, deleteExpenseItem, updateExpenseBranch, updateExpenseDepartment, updateExpenseItem } from '../api/administration-api';
import type { BusinessUnit, ExpenseBranch, ExpenseDepartment, ExpenseItem } from '../types/administration';

type Kind = 'branch' | 'department' | 'item';
type Dimension = ExpenseBranch | ExpenseDepartment | ExpenseItem;
const text = (data: FormData, key: string) => String(data.get(key) ?? '').trim();

export default function ExpenseDimensionManagement({ units, branches, departments, items, canManage, reload, notify }: { units: BusinessUnit[]; branches: ExpenseBranch[]; departments: ExpenseDepartment[]; items: ExpenseItem[]; canManage: boolean; reload: () => Promise<void>; notify: (message: string) => void }) {
  const { request } = useAuth();
  const [branchId, setBranchId] = useState(branches[0]?.id || '');
  const [departmentId, setDepartmentId] = useState('');
  const [editing, setEditing] = useState<{ kind: Kind; value: Dimension | null }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const selectedBranchId = branches.some((item) => item.id === branchId) ? branchId : branches[0]?.id || '';
  const visibleDepartments = departments.filter((item) => item.branchId === selectedBranchId);
  const selectedDepartmentId = visibleDepartments.some((item) => item.id === departmentId) ? departmentId : visibleDepartments[0]?.id || '';
  const visibleItems = items.filter((item) => item.departmentId === selectedDepartmentId);

  async function save(data: FormData) {
    setBusy(true); setError('');
    try {
      const common = { code: text(data, 'code').toUpperCase(), name: text(data, 'name'), active: data.get('active') === 'on', sortOrder: Number(text(data, 'sortOrder') || 0) };
      if (editing?.kind === 'branch') {
        const body = { ...common, businessUnitId: text(data, 'parentId') };
        if (editing.value) await updateExpenseBranch(request, editing.value.id, body); else await createExpenseBranch(request, body);
      } else if (editing?.kind === 'department') {
        const body = { ...common, branchId: text(data, 'parentId') };
        if (editing.value) await updateExpenseDepartment(request, editing.value.id, body); else await createExpenseDepartment(request, body);
      } else {
        const body = { ...common, departmentId: text(data, 'parentId') };
        if (editing?.value) await updateExpenseItem(request, editing.value.id, body); else await createExpenseItem(request, body);
      }
      setEditing(undefined); notify('Đã lưu danh mục đơn vị và đối tượng'); await reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể lưu danh mục'); }
    finally { setBusy(false); }
  }

  async function remove(kind: Kind, item: Dimension) {
    if (!await appDialog.confirm(`Xóa “${item.name}”? Dữ liệu đang được sử dụng sẽ không thể xóa.`)) return;
    setBusy(true); setError('');
    try {
      if (kind === 'branch') await deleteExpenseBranch(request, item.id);
      else if (kind === 'department') await deleteExpenseDepartment(request, item.id);
      else await deleteExpenseItem(request, item.id);
      notify('Đã xóa danh mục'); await reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể xóa danh mục'); }
    finally { setBusy(false); }
  }

  const actions = (kind: Kind, item: Dimension) => canManage && <div className="admin-row-actions"><button onClick={() => setEditing({ kind, value: item })} aria-label="Sửa"><Pencil /></button><button className="danger" onClick={() => void remove(kind, item)} aria-label="Xóa"><Trash2 /></button></div>;
  return <section className="admin-data-card expense-dimensions"><header><div><h2>Chi nhánh, bộ phận và hạng mục</h2><p>Quản trị cây dữ liệu dùng trong combobox nhập chi phí.</p></div></header>{error && <div className="nova-panel-error"><span>{error}</span></div>}<div className="expense-dimension-grid">
    <article><header><div><b>Chi nhánh</b><small>{branches.length} mục</small></div>{canManage && <button onClick={() => setEditing({ kind: 'branch', value: null })}><Plus />Thêm</button>}</header>{branches.map((item) => <div key={item.id} className={`expense-dimension-row ${item.id === selectedBranchId ? 'selected' : ''} ${!item.active ? 'inactive' : ''}`} onClick={() => setBranchId(item.id)}><span><b>{item.name}</b><small>{item.code}</small></span>{actions('branch', item)}</div>)}</article>
    <article><header><div><b>Bộ phận</b><small>{visibleDepartments.length} mục</small></div>{canManage && selectedBranchId && <button onClick={() => setEditing({ kind: 'department', value: null })}><Plus />Thêm</button>}</header>{visibleDepartments.map((item) => <div key={item.id} className={`expense-dimension-row ${item.id === selectedDepartmentId ? 'selected' : ''} ${!item.active ? 'inactive' : ''}`} onClick={() => setDepartmentId(item.id)}><span><b>{item.name}</b><small>{item.code}</small></span>{actions('department', item)}</div>)}</article>
    <article><header><div><b>Hạng mục / Đối tượng</b><small>{visibleItems.length} mục</small></div>{canManage && selectedDepartmentId && <button onClick={() => setEditing({ kind: 'item', value: null })}><Plus />Thêm</button>}</header>{visibleItems.map((item) => <div key={item.id} className={`expense-dimension-row ${!item.active ? 'inactive' : ''}`}><span><b>{item.name}</b><small>{item.code}</small></span>{actions('item', item)}</div>)}</article>
  </div>{editing && <DimensionDialog editing={editing} units={units} branches={branches} departments={departments} defaultBranchId={selectedBranchId} defaultDepartmentId={selectedDepartmentId} busy={busy} error={error} close={() => setEditing(undefined)} save={save} />}</section>;
}

function DimensionDialog({ editing, units, branches, departments, defaultBranchId, defaultDepartmentId, busy, error, close, save }: { editing: { kind: Kind; value: Dimension | null }; units: BusinessUnit[]; branches: ExpenseBranch[]; departments: ExpenseDepartment[]; defaultBranchId: string; defaultDepartmentId: string; busy: boolean; error: string; close: () => void; save: (data: FormData) => Promise<void> }) {
  const value = editing.value;
  const parentId = editing.kind === 'branch' ? (value as ExpenseBranch | null)?.businessUnitId || units[0]?.id : editing.kind === 'department' ? (value as ExpenseDepartment | null)?.branchId || defaultBranchId : (value as ExpenseItem | null)?.departmentId || defaultDepartmentId;
  const labels = { branch: ['CHI NHÁNH', 'chi nhánh'], department: ['BỘ PHẬN', 'bộ phận'], item: ['HẠNG MỤC', 'hạng mục'] } as const;
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); await save(new FormData(event.currentTarget)); }
  return <div className="nova-overlay"><section className="nova-dialog admin-dialog compact"><header><div><p>{labels[editing.kind][0]}</p><h2>{value ? 'Chỉnh sửa' : 'Thêm'} {labels[editing.kind][1]}</h2></div><button onClick={close}><X /></button></header><form onSubmit={submit}><div className="nova-dialog-body"><label><span>{editing.kind === 'branch' ? 'Đơn vị pháp lý' : editing.kind === 'department' ? 'Chi nhánh' : 'Bộ phận'}</span><select name="parentId" defaultValue={parentId} required>{editing.kind === 'branch' ? units.map((item) => <option key={item.id} value={item.id}>{item.name}</option>) : editing.kind === 'department' ? branches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>) : departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div className="nova-form-grid"><label><span>Mã</span><input name="code" defaultValue={value?.code} pattern="[A-Za-z0-9._-]+" required /></label><label><span>Tên</span><input name="name" defaultValue={value?.name} required /></label></div><div className="nova-form-grid"><label><span>Thứ tự</span><input name="sortOrder" type="number" min="0" defaultValue={value?.sortOrder ?? 0} /></label><label className="admin-check"><input type="checkbox" name="active" defaultChecked={value?.active ?? true} />Đang sử dụng</label></div>{error && <div className="nova-form-error">{error}</div>}</div><footer><button type="button" className="nova-button secondary" onClick={close}>Hủy</button><button className="nova-button primary" disabled={busy}><Save />{busy ? 'Đang lưu…' : 'Lưu'}</button></footer></form></section></div>;
}
