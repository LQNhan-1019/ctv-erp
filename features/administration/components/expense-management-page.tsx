'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/icon';
import { useAuth } from '@/features/auth/context/auth-context';
import AdministrativeImportDialog from './administrative-import-dialog';
import ExpenseDimensionManagement from './expense-dimension-management';
import ExpenseInvoicesDialog from './expense-invoices-dialog';
import ExpenseDataTable from './expense-data-table';
import { createExpense, createExpenseCategory, deleteExpense, deleteExpenseCategory, deleteExpenses, getExpenseDashboard, listBusinessUnits, listExpenseBranches, listExpenseCategories, listExpenseDepartments, listExpenseItems, listExpenses, setExpenseActualAsPlanned, updateExpense, updateExpenseCategory, uploadExpenseInvoice } from '../api/administration-api';
import type { BusinessUnit, Expense, ExpenseBranch, ExpenseCategory, ExpenseDashboard, ExpenseDepartment, ExpenseInput, ExpenseItem, ExpenseStatus } from '../types/administration';

const currentMonth = () => new Date().toISOString().slice(0, 7);
const monthOffset = (value: string, offset: number) => { const date = new Date(value + '-01T00:00:00'); date.setMonth(date.getMonth() + offset); return date.toISOString().slice(0, 7); };
const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
const shortMoney = (value: number) => value >= 1_000_000_000 ? `${(value / 1_000_000_000).toFixed(1)} tỷ` : `${(value / 1_000_000).toFixed(1)} tr`;
const value = (data: FormData, key: string) => String(data.get(key) ?? '').trim();
const statusLabels: Record<ExpenseStatus, string> = { DRAFT: 'Nháp', SUBMITTED: 'Đã gửi', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối', PAID: 'Đã thanh toán', CANCELLED: 'Đã hủy' };

export default function ExpenseManagementPage() {
  const { user, request, download } = useAuth();
  const canView = user?.permissions.includes('ADMIN.EXPENSE.VIEW') ?? false;
  const canManage = user?.permissions.includes('ADMIN.EXPENSE.MANAGE') ?? false;
  const canImport = user?.permissions.includes('ADMIN.EXPENSE.IMPORT') ?? false;
  const canExport = user?.permissions.includes('ADMIN.EXPENSE.EXPORT') ?? false;
  const [importOpen, setImportOpen] = useState(false);
  const [tab, setTab] = useState<'overview' | 'expenses' | 'categories' | 'dimensions'>('overview');
  const [month, setMonth] = useState(currentMonth);
  const [unitId, setUnitId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [dashboard, setDashboard] = useState<ExpenseDashboard | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [units, setUnits] = useState<BusinessUnit[]>([]);
  const [branches, setBranches] = useState<ExpenseBranch[]>([]);
  const [departments, setDepartments] = useState<ExpenseDepartment[]>([]);
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [editing, setEditing] = useState<Expense | null | undefined>();
  const [invoiceExpense, setInvoiceExpense] = useState<Expense>();
  const [categoryEditing, setCategoryEditing] = useState<ExpenseCategory | null | undefined>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true); setError('');
    try {
      const [summary, rows, categoryRows, unitRows, branchRows, departmentRows, itemRows] = await Promise.all([
        getExpenseDashboard(request, { fromMonth: monthOffset(month, -11), toMonth: month, businessUnitId: unitId }),
        listExpenses(request, { month, businessUnitId: unitId, categoryId, status, search }),
        listExpenseCategories(request), listBusinessUnits(request), listExpenseBranches(request, true), listExpenseDepartments(request, true), listExpenseItems(request, true),
      ]);
      setDashboard(summary); setExpenses(rows); setCategories(categoryRows); setUnits(unitRows);
      setBranches(branchRows); setDepartments(departmentRows); setItems(itemRows);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không tải được dữ liệu chi phí'); }
    finally { setLoading(false); }
  }, [canView, categoryId, month, request, search, status, unitId]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 3500); return () => window.clearTimeout(timer); }, [toast]);
  const activeCategories = useMemo(() => categories.filter((item) => item.active), [categories]);

  async function saveExpense(input: ExpenseInput, invoiceFile?: File) {
    setBusy('expense'); setError('');
    try { const saved = editing ? await updateExpense(request, editing.id, input) : await createExpense(request, input); if (invoiceFile) await uploadExpenseInvoice(request, saved.id, invoiceFile); setEditing(undefined); setToast(editing ? 'Đã cập nhật chi phí' : 'Đã thêm chi phí'); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể lưu chi phí'); }
    finally { setBusy(''); }
  }
  async function removeExpense(item: Expense) {
    if (!window.confirm(`Xóa khoản ${item.expenseNo}?`)) return;
    setBusy(item.id); try { await deleteExpense(request, item.id); setToast('Đã xóa chi phí'); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể xóa'); } finally { setBusy(''); }
  }
  async function applyActualAsPlanned(item: Expense) {
    setBusy(`actual-as-planned:${item.id}`); setError('');
    try { await setExpenseActualAsPlanned(request, item.id); setToast('Đã đặt chi phí thực tế bằng chi phí dự kiến'); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể cập nhật chi phí thực tế'); }
    finally { setBusy(''); }
  }
  async function removeSelectedExpenses(ids: string[]) {
    if (!ids.length || !window.confirm(`Xóa ${ids.length} khoản chi phí đã chọn? Thao tác này không thể hoàn tác.`)) return false;
    setBusy('bulk-expenses'); setError('');
    try { const result = await deleteExpenses(request, ids); setToast(`Đã xóa ${result.deleted} khoản chi phí`); await load(); return true; }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể xóa các khoản đã chọn'); return false; }
    finally { setBusy(''); }
  }
  async function saveCategory(input: Omit<ExpenseCategory, 'id' | 'parentName'>) {
    setBusy('category'); try { if (categoryEditing) await updateExpenseCategory(request, categoryEditing.id, input); else await createExpenseCategory(request, input); setCategoryEditing(undefined); setToast('Đã lưu danh mục chi phí'); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể lưu danh mục'); } finally { setBusy(''); }
  }
  async function removeCategory(item: ExpenseCategory) {
    if (!window.confirm(`Xóa danh mục “${item.name}”?`)) return;
    setBusy(item.id); try { await deleteExpenseCategory(request, item.id); setToast('Đã xóa danh mục'); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể xóa danh mục'); } finally { setBusy(''); }
  }
  async function exportWorkbook() {
    setBusy('export'); setError('');
    try {
      const query = new URLSearchParams();
      Object.entries({ month, businessUnitId: unitId, categoryId, status, search })
        .forEach(([key, item]) => item && query.set(key, item));
      const blob = await download(`/api/admin/expenses/export?${query}`);
      const url = URL.createObjectURL(blob); const link = document.createElement('a');
      link.href = url; link.download = `chi-phi-hanh-chinh-${month}.xlsx`; link.click(); URL.revokeObjectURL(url);
      setToast('Đã xuất file chi phí hành chính');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể xuất file chi phí'); }
    finally { setBusy(''); }
  }

  if (!canView) return <section className="nova-access-denied"><span><Icon name="shield" /></span><p>KHÔNG ĐỦ QUYỀN</p><h1>Bạn không thể xem chi phí hành chính.</h1><div>Cần quyền <code>ADMIN.EXPENSE.VIEW</code>.</div></section>;
  return <div className="nova-account-page admin-module-page">
    <header className="nova-page-header admin-module-header"><div><p className="nova-eyebrow">NGÂN SÁCH HÀNH CHÍNH</p><h1>Tổng hợp chi phí hành chính</h1><span>Quản lý dữ liệu theo mẫu báo cáo: đơn vị, bộ phận, hạng mục, nhóm chi phí, dự kiến, thực tế và hóa đơn.</span></div><div className="admin-header-actions">{canExport && <button className="nova-button secondary" disabled={busy === 'export'} onClick={() => void exportWorkbook()}><Icon name="download" />{busy === 'export' ? 'Đang xuất…' : 'Xuất Excel'}</button>}{canImport && <button className="nova-button secondary" onClick={() => setImportOpen(true)}><Icon name="upload" />Import Excel</button>}{canManage && <button className="nova-button primary" onClick={() => setEditing(null)}><Icon name="plus" />Thêm chi phí</button>}</div></header>
    <nav className="admin-module-tabs"><button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>Dashboard</button><button className={tab === 'expenses' ? 'active' : ''} onClick={() => setTab('expenses')}>Danh sách chi phí</button><button className={tab === 'categories' ? 'active' : ''} onClick={() => setTab('categories')}>Nhóm chi phí</button><button className={tab === 'dimensions' ? 'active' : ''} onClick={() => setTab('dimensions')}>Đơn vị & đối tượng</button></nav>
    <div className="admin-filter-bar"><label><span>Tháng dữ liệu</span><input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label><label><span>Đơn vị / chi nhánh</span><select value={unitId} onChange={(event) => setUnitId(event.target.value)}><option value="">Tất cả đơn vị</option>{units.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{tab === 'expenses' && <><label><span>Nhóm chi phí</span><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">Tất cả nhóm</option>{activeCategories.map((item) => <option key={item.id} value={item.id}>{item.parentName ? `${item.parentName} / ` : ''}{item.name}</option>)}</select></label><label><span>Trạng thái</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Tất cả</option>{Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="search"><span>Tìm kiếm</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Mã, nội dung, NCC…" /></label></>}</div>
    {error && <div className="nova-panel-error"><span>{error}</span><button onClick={() => void load()}>Thử lại</button></div>}
    {loading && <div className="admin-loading">Đang tổng hợp dữ liệu…</div>}
    {!loading && tab === 'overview' && dashboard && <><ExpenseTotalHero data={dashboard} /><ExpenseOverview data={dashboard} /></>}
    {!loading && tab === 'expenses' && <ExpenseDataTable month={month} rows={expenses} canManage={canManage} busy={busy} edit={setEditing} remove={removeExpense} setActualAsPlanned={applyActualAsPlanned} openInvoices={setInvoiceExpense} removeSelected={removeSelectedExpenses} />}
    {!loading && tab === 'categories' && <section className="admin-data-card"><header><div><h2>Nhóm và phân nhóm chi phí</h2><p>Danh mục chuẩn hóa từ file báo cáo tháng 09/2026.</p></div>{canManage && <button className="nova-button primary" onClick={() => setCategoryEditing(null)}><Icon name="plus" />Thêm nhóm</button>}</header><div className="admin-category-grid">{categories.map((item) => <article key={item.id} className={!item.active ? 'inactive' : ''}><div><small>{item.code}</small><b>{item.name}</b><span>{item.parentName || 'Nhóm cấp 1'}</span></div>{canManage && <div className="admin-row-actions"><button onClick={() => setCategoryEditing(item)}><Icon name="edit" /></button><button className="danger" onClick={() => void removeCategory(item)}><Icon name="trash" /></button></div>}</article>)}</div></section>}
    {!loading && tab === 'dimensions' && <ExpenseDimensionManagement units={units} branches={branches} departments={departments} items={items} canManage={canManage} reload={load} notify={setToast} />}
    {editing !== undefined && <ExpenseDialog expense={editing} branches={branches} departments={departments} items={items} categories={activeCategories} busy={busy === 'expense'} onClose={() => setEditing(undefined)} onSave={saveExpense} />}
    {categoryEditing !== undefined && <CategoryDialog category={categoryEditing} categories={categories.filter((item) => !item.parentId && item.id !== categoryEditing?.id)} busy={busy === 'category'} onClose={() => setCategoryEditing(undefined)} onSave={saveCategory} />}
    {invoiceExpense && <ExpenseInvoicesDialog expense={invoiceExpense} canManage={canManage} close={() => setInvoiceExpense(undefined)} changed={load} />}
    <AdministrativeImportDialog open={importOpen} type="EXPENSE" request={request} download={download} close={() => setImportOpen(false)} imported={async (text) => { setToast(text); await load(); }} />
    {toast && <div className="nova-admin-toast"><span><Icon name="check" /></span>{toast}</div>}
  </div>;
}

function ExpenseTotalHero({ data }: { data: ExpenseDashboard }) {
  const usage = data.plannedTotal > 0 ? Math.round(data.actualTotal / data.plannedTotal * 100) : 0;
  const safeProgress = Math.min(100, Math.max(0, usage));
  const period = `${data.fromMonth.slice(5)}/${data.fromMonth.slice(0, 4)} – ${data.toMonth.slice(5)}/${data.toMonth.slice(0, 4)}`;
  return <section className={`expense-total-hero ${data.variance < 0 ? 'over-budget' : ''}`}><div className="expense-total-icon"><Icon name="database" /></div><div className="expense-total-main"><small>TỔNG CHI PHÍ THỰC TẾ · {period}</small><b>{money(data.actualTotal)}</b><span>{data.expenseCount} khoản chi đã được tổng hợp</span></div><div className="expense-total-budget"><div><span>So với ngân sách</span><b>{usage}%</b></div><div className="expense-budget-track"><i style={{ width: `${safeProgress}%` }} /></div><small>{data.variance >= 0 ? `Còn lại ${money(data.variance)}` : `Vượt ${money(Math.abs(data.variance))}`}</small></div></section>;
}

function ExpenseOverview({ data }: { data: ExpenseDashboard }) {
  const max = Math.max(1, ...data.monthly.flatMap((item) => [item.plannedAmount, item.actualAmount]));
  const points = (key: 'plannedAmount' | 'actualAmount') => data.monthly.map((item, index) => `${34 + index * (632 / Math.max(1, data.monthly.length - 1))},${205 - (item[key] / max) * 165}`).join(' ');
  return <><section className="admin-kpis"><article><small>NGÂN SÁCH DỰ KIẾN</small><b>{money(data.plannedTotal)}</b><span>{data.expenseCount} khoản chi</span></article><article><small>CHI PHÍ THỰC TẾ</small><b>{money(data.actualTotal)}</b><span>{data.plannedTotal ? Math.round(data.actualTotal / data.plannedTotal * 100) : 0}% ngân sách</span></article><article><small>CHÊNH LỆCH CÒN LẠI</small><b className={data.variance < 0 ? 'negative' : ''}>{money(data.variance)}</b><span>{data.variance >= 0 ? 'Trong ngân sách' : 'Vượt ngân sách'}</span></article><article><small>KHOẢN CAO NHẤT</small><b>{data.largestExpense ? shortMoney(data.largestExpense.plannedAmount) : '—'}</b><span>{data.largestExpense?.workContent || 'Chưa có dữ liệu'}</span></article></section><section className="admin-dashboard-grid"><article className="admin-chart-card wide"><header><div><h2>Biến động chi phí 12 tháng</h2><p>So sánh dự kiến và thực tế theo từng tháng.</p></div><div className="admin-chart-legend"><span className="planned">Dự kiến</span><span className="actual">Thực tế</span></div></header><div className="admin-line-chart"><svg viewBox="0 0 700 245" role="img" aria-label="Biểu đồ chi phí theo tháng"><line x1="34" y1="205" x2="666" y2="205" /><line x1="34" y1="122" x2="666" y2="122" /><line x1="34" y1="40" x2="666" y2="40" /><polyline className="planned" points={points('plannedAmount')} /><polyline className="actual" points={points('actualAmount')} />{data.monthly.map((item, index) => <g key={item.month}><text x={34 + index * (632 / Math.max(1, data.monthly.length - 1))} y="228">T{Number(item.month.slice(5))}</text></g>)}</svg></div></article><article className="admin-chart-card"><header><div><h2>Nhóm chi phí cao nhất</h2><p>Tỷ trọng theo ngân sách dự kiến.</p></div></header><div className="admin-bars-list">{data.topCategories.map((item) => <div key={item.categoryId || item.categoryName}><span><b>{item.categoryName}</b><small>{money(item.amount)}</small></span><div><i style={{ width: `${Math.min(100, item.percentage)}%` }} /></div><em>{item.percentage}%</em></div>)}</div></article><article className="admin-chart-card"><header><div><h2>Chi phí theo đơn vị</h2><p>Top chi nhánh, công ty và phòng ban.</p></div></header><div className="admin-unit-list">{data.byBusinessUnit.map((item, index) => <div key={item.businessUnitId}><span>{index + 1}</span><b>{item.businessUnitName}</b><em>{money(item.amount)}</em></div>)}</div></article></section></>;
}

function ExpenseDialog({ expense, branches, departments, items, categories, busy, onClose, onSave }: { expense: Expense | null; branches: ExpenseBranch[]; departments: ExpenseDepartment[]; items: ExpenseItem[]; categories: ExpenseCategory[]; busy: boolean; onClose: () => void; onSave: (input: ExpenseInput, invoiceFile?: File) => Promise<void> }) {
  const [error, setError] = useState('');
  const [plannedAmount, setPlannedAmount] = useState(String(expense?.plannedAmount ?? 0));
  const [actualAmount, setActualAmount] = useState(String(expense?.actualAmount ?? 0));
  const [actualAsPlanned, setActualAsPlanned] = useState(Boolean(expense && expense.plannedAmount === expense.actualAmount));
  const availableBranches = branches.filter((item) => item.active || item.id === expense?.expenseBranchId);
  const availableDepartments = departments.filter((item) => item.active || item.id === expense?.expenseDepartmentId);
  const availableItems = items.filter((item) => item.active || item.id === expense?.expenseItemId);
  const [hasInvoice, setHasInvoice] = useState(expense?.hasInvoice ?? false);
  const [invoiceFile, setInvoiceFile] = useState<File>();
  const initialBranch = expense?.expenseBranchId || availableBranches.find((item) => item.businessUnitId === expense?.businessUnitId)?.id || availableBranches[0]?.id || '';
  const [selectedBranch, setSelectedBranch] = useState(initialBranch);
  const branchDepartments = availableDepartments.filter((item) => item.branchId === selectedBranch);
  const initialDepartment = expense?.expenseDepartmentId || branchDepartments[0]?.id || '';
  const [selectedDepartment, setSelectedDepartment] = useState(initialDepartment);
  const departmentItems = availableItems.filter((item) => item.departmentId === selectedDepartment);
  const [selectedItem, setSelectedItem] = useState(expense?.expenseItemId || departmentItems[0]?.id || '');
  function changeBranch(branchId: string) { const department = availableDepartments.find((item) => item.branchId === branchId); const item = availableItems.find((entry) => entry.departmentId === department?.id); setSelectedBranch(branchId); setSelectedDepartment(department?.id || ''); setSelectedItem(item?.id || ''); }
  function changeDepartment(departmentId: string) { const item = availableItems.find((entry) => entry.departmentId === departmentId); setSelectedDepartment(departmentId); setSelectedItem(item?.id || ''); }
  function changePlannedAmount(next: string) { setPlannedAmount(next); if (actualAsPlanned) setActualAmount(next); }
  function toggleActualAsPlanned(checked: boolean) { setActualAsPlanned(checked); if (checked) setActualAmount(plannedAmount); }
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const branch = branches.find((item) => item.id === selectedBranch); const department = departments.find((item) => item.id === selectedDepartment); const item = items.find((entry) => entry.id === selectedItem); try { if (!branch || !department || !item) throw new Error('Vui lòng chọn đủ chi nhánh, bộ phận và hạng mục'); if (hasInvoice && !expense && !invoiceFile) throw new Error('Vui lòng chọn file hóa đơn'); setError(''); await onSave({ businessUnitId: branch.businessUnitId, expenseBranchId: branch.id, expenseDepartmentId: department.id, expenseItemId: item.id, expenseDate: value(data, 'expenseDate'), categoryId: value(data, 'categoryId') || null, expenseType: value(data, 'expenseType') as ExpenseInput['expenseType'], costCenterType: department.name, costObjectName: item.name, workContent: value(data, 'workContent'), quantity: Number(value(data, 'quantity')), unitName: value(data, 'unitName') || null, plannedAmount: Number(plannedAmount), actualAmount: Number(actualAmount), hasInvoice, supplierContactNotes: value(data, 'supplierContactNotes') || null, status: value(data, 'status') as ExpenseStatus }, invoiceFile); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể lưu chi phí'); } }
  return <div className="nova-overlay"><section className="nova-dialog admin-dialog"><header><div><p>CHI PHÍ HÀNH CHÍNH</p><h2>{expense ? 'Chỉnh sửa khoản chi' : 'Thêm khoản chi'}</h2><span>Chọn theo cây Chi nhánh → Bộ phận → Hạng mục giống file báo cáo.</span></div><button onClick={onClose}><Icon name="x" /></button></header><form onSubmit={submit}><div className="nova-dialog-body"><div className="nova-form-grid three"><label><span>Chi nhánh / Công ty</span><select value={selectedBranch} onChange={(event) => changeBranch(event.target.value)} required><option value="">Chọn chi nhánh</option>{availableBranches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label><span>Ngày chi phí</span><input name="expenseDate" type="date" defaultValue={expense?.expenseDate || new Date().toISOString().slice(0, 10)} required /></label><label><span>Loại chi phí</span><select name="expenseType" defaultValue={expense?.expenseType || 'ADMINISTRATIVE'}><option value="ADMINISTRATIVE">Hành chính</option><option value="HUMAN_RESOURCES">Nhân sự</option></select></label></div><div className="nova-form-grid three"><label><span>Thuộc bộ phận</span><select value={selectedDepartment} onChange={(event) => changeDepartment(event.target.value)} required><option value="">Chọn bộ phận</option>{branchDepartments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label><span>Hạng mục / Đối tượng</span><select value={selectedItem} onChange={(event) => setSelectedItem(event.target.value)} required><option value="">Chọn hạng mục</option>{departmentItems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label><span>Nhóm / Phân nhóm</span><select name="categoryId" defaultValue={expense?.categoryId || ''}><option value="">Chưa phân nhóm</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.parentName ? `${item.parentName} / ` : ''}{item.name}</option>)}</select></label></div><label><span>Nội dung công việc</span><textarea name="workContent" defaultValue={expense?.workContent} required maxLength={2000} /></label><div className="nova-form-grid three"><label><span>Số lượng</span><input name="quantity" type="number" min="0.001" step="0.001" defaultValue={expense?.quantity || 1} required /></label><label><span>Đơn vị tính</span><input name="unitName" defaultValue={expense?.unitName || ''} placeholder="Tháng 9, lần, bộ…" /></label><label><span>Trạng thái</span><select name="status" defaultValue={expense?.status || 'DRAFT'}>{Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div><div className="nova-form-grid"><label><span>Tổng chi phí dự kiến</span><input name="plannedAmount" type="number" min="0" step="1000" value={plannedAmount} onChange={(event) => changePlannedAmount(event.target.value)} required /></label><label><span>Chi phí thực tế</span><input name="actualAmount" type="number" min="0" step="1000" value={actualAmount} onChange={(event) => setActualAmount(event.target.value)} readOnly={actualAsPlanned} required /></label></div><label className="expense-amount-match"><input type="checkbox" checked={actualAsPlanned} onChange={(event) => toggleActualAsPlanned(event.target.checked)} /><span>Chi phí thực tế bằng chi phí dự kiến</span></label><label className="admin-check"><input type="checkbox" checked={hasInvoice} onChange={(event) => setHasInvoice(event.target.checked)} />Chi phí có hóa đơn</label>{hasInvoice && <label className="invoice-file-field"><span>File hóa đơn {expense ? '(thêm mới, nếu cần)' : ''}</span><input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setInvoiceFile(event.target.files?.[0])} required={!expense} /><small>PDF hoặc ảnh, tối đa 10 MB. File được lưu vào Google Drive theo cấu hình NAV_ADMIN_EXPENSES.</small></label>}<label><span>NCC / Liên hệ & Ghi chú</span><textarea name="supplierContactNotes" defaultValue={expense?.supplierContactNotes || ''} maxLength={2000} /></label>{error && <div className="nova-form-error">{error}</div>}</div><footer><button type="button" className="nova-button secondary" onClick={onClose}>Hủy</button><button className="nova-button primary" disabled={busy}><Icon name="save" />{busy ? 'Đang lưu…' : 'Lưu chi phí'}</button></footer></form></section></div>;
}

function CategoryDialog({ category, categories, busy, onClose, onSave }: { category: ExpenseCategory | null; categories: ExpenseCategory[]; busy: boolean; onClose: () => void; onSave: (input: Omit<ExpenseCategory, 'id' | 'parentName'>) => Promise<void> }) {
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); try { setError(''); await onSave({ code: value(data, 'code').toUpperCase(), name: value(data, 'name'), parentId: value(data, 'parentId') || null, active: data.get('active') === 'on', sortOrder: Number(value(data, 'sortOrder')) }); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể lưu'); } }
  return <div className="nova-overlay"><section className="nova-dialog admin-dialog compact"><header><div><p>DANH MỤC CHI PHÍ</p><h2>{category ? 'Sửa danh mục' : 'Thêm danh mục'}</h2></div><button onClick={onClose}><Icon name="x" /></button></header><form onSubmit={submit}><div className="nova-dialog-body"><div className="nova-form-grid"><label><span>Mã</span><input name="code" defaultValue={category?.code} pattern="[A-Za-z0-9._-]+" required /></label><label><span>Tên nhóm</span><input name="name" defaultValue={category?.name} required /></label></div><div className="nova-form-grid"><label><span>Nhóm cha</span><select name="parentId" defaultValue={category?.parentId || ''}><option value="">Nhóm cấp 1</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label><span>Thứ tự</span><input name="sortOrder" type="number" min="0" defaultValue={category?.sortOrder || 0} /></label></div><label className="admin-check"><input type="checkbox" name="active" defaultChecked={category?.active ?? true} />Đang sử dụng</label>{error && <div className="nova-form-error">{error}</div>}</div><footer><button type="button" className="nova-button secondary" onClick={onClose}>Hủy</button><button className="nova-button primary" disabled={busy}>Lưu danh mục</button></footer></form></section></div>;
}
