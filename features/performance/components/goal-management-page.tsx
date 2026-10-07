'use client';

import { BookOpen, Check, CircleAlert, Database, Pencil, Plus, Save, Settings2, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import DashboardPeriodPicker from '@/components/ui/dashboard-period-picker';
import ErpSelect from '@/components/ui/erp-select';
import { useAuth } from '@/features/auth/context/auth-context';
import { appDialog } from '@/lib/ui/app-dialog';
import {
  createKpiMeasurementUnit, createKpiRewardRate, deleteKpiMeasurementUnit,
  deleteKpiRewardRate, getKpiCatalog, getKpiPeriod, getKpiTargets,
  listKpiAdminUnits, saveKpiPeriod, updateKpiMeasurementUnit, updateKpiRewardRate,
} from '../api/performance-api';
import type {
  KpiAdminUnit, KpiCatalog, KpiDashboard, KpiMeasurementUnit,
  KpiMetricResult, KpiRewardRate,
} from '../types/performance';

type MetricDraft = {
  code: string;
  name: string;
  monthlyTarget: string;
  measurementUnitId: string;
  rewardRateId: string;
  orderInUnit: number;
  active: boolean;
};

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function number(value: number, digits = 2) {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: digits }).format(value);
}

function emptyMetrics(catalog: KpiCatalog | null): MetricDraft[] {
  return [1, 2, 3].map((order) => ({
    code: '', name: '', monthlyTarget: '', orderInUnit: order, active: true,
    measurementUnitId: catalog?.measurementUnits[0]?.id ?? '',
    rewardRateId: catalog?.rewardRates[0]?.id ?? '',
  }));
}

function toDrafts(metrics: KpiMetricResult[], catalog: KpiCatalog): MetricDraft[] {
  return metrics.map((metric) => ({
    code: metric.code,
    name: metric.name,
    monthlyTarget: String(metric.monthlyTarget),
    orderInUnit: metric.orderInUnit,
    active: true,
    measurementUnitId: catalog.measurementUnits.find((item) =>
      item.name === metric.unitOfMeasure && Number(item.conversionFactor) === Number(metric.conversionFactor))?.id
      ?? catalog.measurementUnits[0]?.id ?? '',
    rewardRateId: catalog.rewardRates.find((item) => Number(item.ratePerUnit) === Number(metric.ratePerUnit))?.id
      ?? catalog.rewardRates[0]?.id ?? '',
  }));
}

export default function GoalManagementPage() {
  const { request, user } = useAuth();
  const canManage = Boolean(user?.permissions.includes('PERFORMANCE.KPI.CONFIG.MANAGE'));
  const [month, setMonth] = useState(currentMonth);
  const [dashboard, setDashboard] = useState<KpiDashboard | null>(null);
  const [adminUnits, setAdminUnits] = useState<KpiAdminUnit[]>([]);
  const [catalog, setCatalog] = useState<KpiCatalog | null>(null);
  const [unitId, setUnitId] = useState('');
  const [allocatedFund, setAllocatedFund] = useState('0');
  const [drafts, setDrafts] = useState<MetricDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [catalogOpen, setCatalogOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const tasks: Promise<unknown>[] = [getKpiTargets(request, month)];
    if (canManage) tasks.push(listKpiAdminUnits(request), getKpiCatalog(request));
    Promise.all(tasks).then((values) => {
      if (!active) return;
      const nextDashboard = values[0] as KpiDashboard;
      const nextUnits = canManage ? values[1] as KpiAdminUnit[] : [];
      const nextCatalog = canManage ? values[2] as KpiCatalog : null;
      setDashboard(nextDashboard); setAdminUnits(nextUnits); setCatalog(nextCatalog);
      const available = canManage ? nextUnits.filter((item) => item.active) : nextDashboard.units;
      setUnitId((current) => available.some((item) => item.id === current) ? current : available[0]?.id ?? '');
      if (canManage && !available.length) setLoading(false);
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Không tải được mục tiêu KPI'); })
      .finally(() => { if (active && !canManage) setLoading(false); });
    return () => { active = false; };
  }, [canManage, month, request]);

  useEffect(() => {
    if (!canManage || !unitId || !catalog) return;
    let active = true;
    getKpiPeriod(request, unitId, month).then((period) => {
      if (!active) return;
      setAllocatedFund(String(period.allocatedFund));
      setDrafts(toDrafts(period.metrics, catalog));
    }).catch(() => {
      if (!active) return;
      setAllocatedFund('0'); setDrafts(emptyMetrics(catalog));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [canManage, catalog, month, request, unitId]);

  const availableUnits = useMemo(() => canManage
    ? adminUnits.filter((item) => item.active)
    : dashboard?.units ?? [], [adminUnits, canManage, dashboard]);
  const selectedResult = dashboard?.units.find((item) => item.id === unitId);
  const viewMetrics = canManage ? drafts : selectedResult?.metrics ?? [];

  function patchMetric(order: number, patch: Partial<MetricDraft>) {
    setDrafts((current) => current.map((item) => item.orderInUnit === order ? { ...item, ...patch } : item));
    setMessage('');
  }

  async function save() {
    if (!catalog || !unitId || drafts.length !== 3) return;
    const metrics = drafts.map((draft) => {
      const measurement = catalog.measurementUnits.find((item) => item.id === draft.measurementUnitId);
      const reward = catalog.rewardRates.find((item) => item.id === draft.rewardRateId);
      const target = Number(draft.monthlyTarget);
      if (!draft.name.trim() || !measurement || !reward || !Number.isFinite(target) || target <= 0) {
        throw new Error(`Chỉ tiêu ${draft.orderInUnit}: cần tên, MP lớn hơn 0, ĐVT và Ti hợp lệ.`);
      }
      return {
        code: draft.code, name: draft.name.trim(), unitOfMeasure: measurement.name,
        conversionFactor: measurement.conversionFactor, ratePerUnit: reward.ratePerUnit,
        monthlyTarget: target, orderInUnit: draft.orderInUnit, active: draft.active,
      };
    });
    const fund = Number(allocatedFund);
    if (!Number.isFinite(fund) || fund < 0) throw new Error('Quỹ phân bổ phải là số không âm.');
    setSaving(true); setError(''); setMessage('');
    try {
      const saved = await saveKpiPeriod(request, unitId, month, { allocatedFund: fund, metrics });
      setDrafts(toDrafts(saved.metrics, catalog));
      setMessage(`Đã lưu MP, ĐVT và Ti của ${saved.unit.name} cho tháng ${Number(month.slice(5))}/${month.slice(0, 4)}.`);
      setDashboard(await getKpiTargets(request, month));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không lưu được cấu hình KPI');
    } finally { setSaving(false); }
  }

  return <div className="nova-account-page performance-page kpi-goal-page">
    <header className="nova-page-header performance-header">
      <div><p className="nova-eyebrow">MỤC TIÊU KPI THEO THÁNG</p><h1>Mục tiêu và cấu hình tính thưởng</h1><span>MP, ĐVT và Ti lấy từ cấu hình theo tháng. MTD, TL%, MTG và Thành tiền được tính realtime từ số liệu ngày.</span></div>
      <div className="kpi-goal-header-actions"><DashboardPeriodPicker type="MONTH" value={month} allowedTypes={['MONTH']} onChange={(_, value) => { setLoading(true); setError(''); setMessage(''); setMonth(value); }}/>{canManage && <button className="nova-button secondary" onClick={() => setCatalogOpen(true)}><Settings2/>Danh mục ĐVT & Ti</button>}</div>
    </header>

    <section className="performance-toolbar kpi-goal-toolbar">
      <label><span>Đơn vị / phòng ban</span><ErpSelect value={unitId} options={availableUnits.map((item) => ({ value: item.id, label: item.name }))} onChange={(value) => { setLoading(true); setError(''); setUnitId(value); }}/></label>
      {canManage && <label><span>Quỹ phân bổ</span><input inputMode="decimal" value={allocatedFund} onChange={(event) => setAllocatedFund(event.target.value)} /></label>}
      <div className="performance-legend"><span><i className="dot green"/>Nguồn dữ liệu: KPI theo ngày</span><span><i className="dot gray"/>{dashboard?.dataThrough ? `Đến ${dashboard.dataThrough}` : 'Chưa có dữ liệu'}</span></div>
    </section>

    {message && <div className="performance-success"><Check/>{message}</div>}
    {error && <div className="performance-error"><CircleAlert/>{error}</div>}
    {loading && <div className="performance-state"><span className="nova-session-spinner"/>Đang tải cấu hình KPI…</div>}

    {!loading && <div className="performance-goal-list">
      {viewMetrics.map((item) => {
        if (!canManage) {
          const metric = item as KpiMetricResult;
          return <article key={metric.definitionId} className="performance-goal-row kpi-goal-row readonly">
            <div className="performance-goal-identity"><span>{selectedResult?.name} · Chỉ tiêu {metric.orderInUnit}/3</span><h3>{metric.name}</h3><small>{metric.unitOfMeasure} · Ti {number(metric.ratePerUnit, 6)}</small></div>
            <div className="kpi-goal-stat"><span>MTD</span><b>{number(metric.mtd, 6)}</b></div><div className="kpi-goal-stat"><span>MP</span><b>{number(metric.monthlyTarget, 6)}</b></div><div className="kpi-goal-stat"><span>TL%</span><b>{number(metric.completionPercent)}%</b></div><div className="kpi-goal-stat"><span>MTG</span><b>{number(metric.targetGap, 6)}</b></div><div className="kpi-goal-stat reward"><span>Thành tiền</span><b>{number(metric.rewardAmount, 0)} đ</b></div>
          </article>;
        }
        const draft = item as MetricDraft;
        const measurement = catalog?.measurementUnits.find((option) => option.id === draft.measurementUnitId);
        const reward = catalog?.rewardRates.find((option) => option.id === draft.rewardRateId);
        const actual = selectedResult?.metrics.find((metric) => metric.orderInUnit === draft.orderInUnit);
        return <article key={draft.orderInUnit} className="performance-goal-row kpi-goal-row">
          <div className="performance-goal-identity"><span>Chỉ tiêu {draft.orderInUnit}/3</span><h3>{draft.name || 'Chưa đặt tên chỉ tiêu'}</h3><small>{actual ? `MTD ${number(actual.mtd, 6)} · ${number(actual.completionPercent)}% MP` : 'Chưa có số liệu thực tế'}</small></div>
          <label className="goal-title"><span>Tên chỉ tiêu</span><input value={draft.name} disabled={saving} onChange={(event) => patchMetric(draft.orderInUnit, { name: event.target.value })}/></label>
          <label className="goal-target"><span>MP</span><input inputMode="decimal" value={draft.monthlyTarget} disabled={saving} onChange={(event) => patchMetric(draft.orderInUnit, { monthlyTarget: event.target.value })}/></label>
          <label className="goal-unit"><span>ĐVT</span><ErpSelect value={draft.measurementUnitId} disabled={saving} options={(catalog?.measurementUnits ?? []).filter((option) => option.active).map((option) => ({ value: option.id, label: `${option.name} · hệ số ${number(option.conversionFactor, 6)}` }))} onChange={(value) => patchMetric(draft.orderInUnit, { measurementUnitId: value })}/></label>
          <label className="goal-rate"><span>Ti</span><ErpSelect value={draft.rewardRateId} disabled={saving} options={(catalog?.rewardRates ?? []).filter((option) => option.active).map((option) => ({ value: option.id, label: `${option.name} · ${number(option.ratePerUnit, 6)}` }))} onChange={(value) => patchMetric(draft.orderInUnit, { rewardRateId: value })}/></label>
          <div className="kpi-goal-preview"><span>Công thức</span><b>{reward && measurement ? `${number(reward.ratePerUnit, 6)} × MTD ÷ ${number(measurement.conversionFactor, 6)}` : 'Chọn ĐVT và Ti'}</b></div>
        </article>;
      })}
      {!viewMetrics.length && <div className="performance-empty"><BookOpen/><h2>Chưa có cấu hình KPI tháng này</h2><p>{canManage ? 'Chọn đơn vị và khai báo ba chỉ tiêu để bắt đầu.' : 'Quản trị viên chưa thiết lập mục tiêu cho kỳ được chọn.'}</p></div>}
    </div>}

    {canManage && !loading && <footer className="kpi-goal-actions"><span><Database/>Mỗi tháng lưu riêng MP, ĐVT, Ti và quỹ; sửa danh mục không làm thay đổi lịch sử.</span><button className="nova-button primary" disabled={saving || !unitId} onClick={() => void save().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Dữ liệu không hợp lệ'))}><Save/>{saving ? 'Đang lưu…' : 'Lưu cấu hình tháng'}</button></footer>}
    {catalogOpen && catalog && <KpiCatalogDialog request={request} catalog={catalog} onChange={setCatalog} onClose={() => setCatalogOpen(false)}/>} 
  </div>;
}

function KpiCatalogDialog({ request, catalog, onChange, onClose }: {
  request: ReturnType<typeof useAuth>['request'];
  catalog: KpiCatalog;
  onChange: (catalog: KpiCatalog) => void;
  onClose: () => void;
}) {
  const [units, setUnits] = useState(catalog.measurementUnits);
  const [rates, setRates] = useState(catalog.rewardRates);
  const [newUnit, setNewUnit] = useState({ name: '', symbol: '', conversionFactor: '1' });
  const [newRate, setNewRate] = useState({ name: '', ratePerUnit: '' });
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  function finish(nextUnits = units, nextRates = rates) {
    setUnits(nextUnits); setRates(nextRates); onChange({ measurementUnits: nextUnits, rewardRates: nextRates });
  }

  async function addUnit() {
    const factor = Number(newUnit.conversionFactor);
    if (!newUnit.name.trim() || !newUnit.symbol.trim() || !Number.isFinite(factor) || factor <= 0) throw new Error('Tên, ký hiệu và hệ số quy đổi lớn hơn 0 là bắt buộc.');
    setBusy('unit-new'); setError('');
    try { const saved = await createKpiMeasurementUnit(request, { code: '', name: newUnit.name.trim(), symbol: newUnit.symbol.trim(), conversionFactor: factor, sortOrder: units.length * 10 + 10, active: true }); finish([...units, saved], rates); setNewUnit({ name: '', symbol: '', conversionFactor: '1' }); }
    finally { setBusy(''); }
  }

  async function addRate() {
    const value = Number(newRate.ratePerUnit);
    if (!newRate.name.trim() || !Number.isFinite(value) || value <= 0) throw new Error('Tên Ti và đơn giá lớn hơn 0 là bắt buộc.');
    setBusy('rate-new'); setError('');
    try { const saved = await createKpiRewardRate(request, { code: '', name: newRate.name.trim(), ratePerUnit: value, sortOrder: rates.length * 10 + 10, active: true }); finish(units, [...rates, saved]); setNewRate({ name: '', ratePerUnit: '' }); }
    finally { setBusy(''); }
  }

  async function saveUnit(item: KpiMeasurementUnit) {
    setBusy(item.id); setError('');
    try { const saved = await updateKpiMeasurementUnit(request, item.id, { code: item.code, name: item.name, symbol: item.symbol, conversionFactor: Number(item.conversionFactor), sortOrder: item.sortOrder, active: item.active }); finish(units.map((current) => current.id === item.id ? saved : current), rates); }
    finally { setBusy(''); }
  }

  async function saveRate(item: KpiRewardRate) {
    setBusy(item.id); setError('');
    try { const saved = await updateKpiRewardRate(request, item.id, { code: item.code, name: item.name, ratePerUnit: Number(item.ratePerUnit), sortOrder: item.sortOrder, active: item.active }); finish(units, rates.map((current) => current.id === item.id ? saved : current)); }
    finally { setBusy(''); }
  }

  return <div className="nova-overlay"><section className="nova-dialog kpi-catalog-dialog" role="dialog" aria-modal="true" aria-labelledby="kpi-catalog-title">
    <header><div><p>DANH MỤC TÍNH KPI</p><h2 id="kpi-catalog-title">Đơn vị tính và Ti</h2><span>Cấu hình lựa chọn dùng khi giao mục tiêu; dữ liệu lịch sử không bị thay đổi.</span></div><button onClick={onClose} aria-label="Đóng"><X/></button></header>
    <div className="nova-dialog-body kpi-catalog-body">
      {error && <div className="performance-error"><CircleAlert/>{error}</div>}
      <section><header><div><h3>Đơn vị tính</h3><span>ĐVT và hệ số quy đổi dùng trong công thức Thành tiền.</span></div></header><div className="kpi-catalog-create"><input placeholder="Tên, ví dụ Triệu" value={newUnit.name} onChange={(event) => setNewUnit((current) => ({ ...current, name: event.target.value }))}/><input placeholder="Ký hiệu" value={newUnit.symbol} onChange={(event) => setNewUnit((current) => ({ ...current, symbol: event.target.value }))}/><input inputMode="decimal" placeholder="Hệ số" value={newUnit.conversionFactor} onChange={(event) => setNewUnit((current) => ({ ...current, conversionFactor: event.target.value }))}/><button className="nova-button primary" disabled={Boolean(busy)} onClick={() => void addUnit().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Không thêm được ĐVT'))}><Plus/>Thêm</button></div><div className="kpi-catalog-list">{units.filter((item) => item.active).map((item) => <article key={item.id}><input value={item.name} onChange={(event) => setUnits((current) => current.map((value) => value.id === item.id ? { ...value, name: event.target.value } : value))}/><input value={item.symbol} onChange={(event) => setUnits((current) => current.map((value) => value.id === item.id ? { ...value, symbol: event.target.value } : value))}/><input inputMode="decimal" value={item.conversionFactor} onChange={(event) => setUnits((current) => current.map((value) => value.id === item.id ? { ...value, conversionFactor: Number(event.target.value) } : value))}/><button aria-label={`Lưu ${item.name}`} disabled={Boolean(busy)} onClick={() => void saveUnit(item).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Không lưu được ĐVT'))}><Pencil/></button><button className="danger" aria-label={`Xóa ${item.name}`} disabled={Boolean(busy)} onClick={() => void (async () => { if (!await appDialog.confirm(`Ngừng sử dụng ĐVT “${item.name}”?`)) return; await deleteKpiMeasurementUnit(request, item.id); finish(units.filter((value) => value.id !== item.id), rates); })().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Không xóa được ĐVT'))}><Trash2/></button></article>)}</div></section>
      <section><header><div><h3>Ti / đơn giá thưởng</h3><span>Không gắn cứng trong code; chọn từ danh mục khi cấu hình tháng.</span></div></header><div className="kpi-catalog-create rate"><input placeholder="Tên, ví dụ Ti doanh thu" value={newRate.name} onChange={(event) => setNewRate((current) => ({ ...current, name: event.target.value }))}/><input inputMode="decimal" placeholder="Đơn giá" value={newRate.ratePerUnit} onChange={(event) => setNewRate((current) => ({ ...current, ratePerUnit: event.target.value }))}/><button className="nova-button primary" disabled={Boolean(busy)} onClick={() => void addRate().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Không thêm được Ti'))}><Plus/>Thêm</button></div><div className="kpi-catalog-list rate">{rates.filter((item) => item.active).map((item) => <article key={item.id}><input value={item.name} onChange={(event) => setRates((current) => current.map((value) => value.id === item.id ? { ...value, name: event.target.value } : value))}/><input inputMode="decimal" value={item.ratePerUnit} onChange={(event) => setRates((current) => current.map((value) => value.id === item.id ? { ...value, ratePerUnit: Number(event.target.value) } : value))}/><button aria-label={`Lưu ${item.name}`} disabled={Boolean(busy)} onClick={() => void saveRate(item).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Không lưu được Ti'))}><Pencil/></button><button className="danger" aria-label={`Xóa ${item.name}`} disabled={Boolean(busy)} onClick={() => void (async () => { if (!await appDialog.confirm(`Ngừng sử dụng Ti “${item.name}”?`)) return; await deleteKpiRewardRate(request, item.id); finish(units, rates.filter((value) => value.id !== item.id)); })().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Không xóa được Ti'))}><Trash2/></button></article>)}</div></section>
    </div>
    <footer><button className="nova-button primary" onClick={onClose}><Check/>Hoàn tất</button></footer>
  </section></div>;
}
