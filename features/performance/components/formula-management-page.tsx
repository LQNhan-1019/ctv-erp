'use client';

import { Calculator, Check, CircleHelp, FlaskConical, RefreshCw, RotateCcw, Save, Search, TriangleAlert } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/features/auth/context/auth-context';
import { appDialog } from '@/lib/ui/app-dialog';
import { listDashboardFormulas, listKpiFormulaRules, previewDashboardFormula, resetDashboardFormula, resetKpiFormulaRule, saveDashboardFormula, saveKpiFormulaRule } from '../api/performance-api';
import type { DashboardFormula, DashboardFormulaInput, KpiFormulaRule } from '../types/performance';

type Draft = DashboardFormulaInput;
type KpiRuleDraft = Pick<KpiFormulaRule, 'name' | 'description' | 'mode' | 'customExpression' | 'roundingScale' | 'enabled'>;

const unitLabel: Record<string, string> = {
  MILLION_VND: 'triệu đồng', COUNT: 'số lượng', CUBIC_METER: 'm³', KM: 'km',
};

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function toDraft(item: DashboardFormula): Draft {
  return {
    name: item.name,
    description: item.description,
    mode: item.mode,
    customExpression: item.customExpression,
    roundingScale: item.roundingScale,
    enabled: item.enabled,
  };
}

function formatValue(value: number, scale: number) {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: scale }).format(value ?? 0);
}

function toKpiRuleDraft(item: KpiFormulaRule): KpiRuleDraft {
  return { name: item.name, description: item.description, mode: item.mode, customExpression: item.customExpression, roundingScale: item.roundingScale, enabled: item.enabled };
}

export default function FormulaManagementPage() {
  const { request, user } = useAuth();
  const [month, setMonth] = useState(currentMonth);
  const [items, setItems] = useState<DashboardFormula[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [kpiRules, setKpiRules] = useState<KpiFormulaRule[]>([]);
  const [kpiRuleDrafts, setKpiRuleDrafts] = useState<Record<string, KpiRuleDraft>>({});
  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState('ALL');
  const [status, setStatus] = useState<'ALL' | 'ENABLED' | 'DISABLED'>('ALL');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const canManage = user?.permissions.includes('PERFORMANCE.FORMULA.MANAGE') ?? false;

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [next, nextKpiRules] = await Promise.all([listDashboardFormulas(request, month), listKpiFormulaRules(request)]);
      setItems(next);
      setDrafts(Object.fromEntries(next.map(item => [item.metricId, toDraft(item)])));
      setKpiRules(nextKpiRules);
      setKpiRuleDrafts(Object.fromEntries(nextKpiRules.map(item => [item.key, toKpiRuleDraft(item)])));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể tải công thức dashboard');
    } finally { setLoading(false); }
  }, [month, request]);

  useEffect(() => {
    let active = true;
    Promise.all([listDashboardFormulas(request, month), listKpiFormulaRules(request)])
      .then(([next, nextKpiRules]) => {
        if (!active) return;
        setItems(next);
        setDrafts(Object.fromEntries(next.map(item => [item.metricId, toDraft(item)])));
        setKpiRules(nextKpiRules);
        setKpiRuleDrafts(Object.fromEntries(nextKpiRules.map(item => [item.key, toKpiRuleDraft(item)])));
      })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Không thể tải công thức dashboard'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [month, request]);

  const departments = useMemo(() => Array.from(new Map(items.map(item => [item.departmentCode, item.departmentName])).entries()), [items]);
  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('vi');
    return items.filter(item => {
      if (department !== 'ALL' && item.departmentCode !== department) return false;
      if (status === 'ENABLED' && !item.enabled) return false;
      if (status === 'DISABLED' && item.enabled) return false;
      return !normalized || `${item.metricCode} ${item.metricName} ${item.name} ${item.departmentName}`.toLocaleLowerCase('vi').includes(normalized);
    });
  }, [department, items, query, status]);

  function patch(metricId: string, value: Partial<Draft>) {
    setDrafts(current => ({ ...current, [metricId]: { ...current[metricId], ...value } }));
  }

  function patchKpiRule(key: string, value: Partial<KpiRuleDraft>) {
    setKpiRuleDrafts(current => ({ ...current, [key]: { ...current[key], ...value } }));
  }

  async function saveKpiRule(item: KpiFormulaRule) {
    const draft = kpiRuleDrafts[item.key];
    if (!draft.name.trim()) { setError('Tên công thức KPI không được để trống.'); return; }
    if (draft.mode === 'CUSTOM' && !draft.customExpression?.trim()) { setError('Hãy nhập công thức tùy chỉnh cho KPI.'); return; }
    setWorking(`kpi-save:${item.key}`); setError(''); setMessage('');
    try {
      const saved = await saveKpiFormulaRule(request, item.key, { ...draft, name: draft.name.trim(), description: draft.description?.trim() || null, customExpression: draft.customExpression?.trim() || null });
      setKpiRules(current => current.map(rule => rule.key === saved.key ? saved : rule));
      setKpiRuleDrafts(current => ({ ...current, [saved.key]: toKpiRuleDraft(saved) }));
      setMessage(`Đã lưu “${saved.name}”. MTD, tỷ lệ và quỹ thưởng sẽ dùng công thức mới ngay.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể lưu công thức KPI'); }
    finally { setWorking(''); }
  }

  async function resetKpiRule(item: KpiFormulaRule) {
    if (!await appDialog.confirm(`Khôi phục công thức chuẩn cho “${item.name}”?`)) return;
    setWorking(`kpi-reset:${item.key}`); setError(''); setMessage('');
    try {
      const saved = await resetKpiFormulaRule(request, item.key);
      setKpiRules(current => current.map(rule => rule.key === saved.key ? saved : rule));
      setKpiRuleDrafts(current => ({ ...current, [saved.key]: toKpiRuleDraft(saved) }));
      setMessage(`Đã khôi phục công thức chuẩn cho “${saved.name}”.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể khôi phục công thức KPI'); }
    finally { setWorking(''); }
  }

  async function preview(item: DashboardFormula) {
    const draft = drafts[item.metricId];
    const expression = draft.mode === 'STANDARD' ? item.standardExpression : draft.customExpression?.trim();
    if (!expression) { setError('Hãy nhập công thức tùy chỉnh trước khi xem thử.'); return; }
    setWorking(`preview:${item.metricId}`); setError(''); setMessage('');
    try {
      const result = await previewDashboardFormula(request, { metricId: item.metricId, expression, month, roundingScale: draft.roundingScale });
      setMessage(`${item.metricName}: kết quả thử ${formatValue(result.value, draft.roundingScale)} ${unitLabel[item.measurementUnit] ?? item.measurementUnit}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Công thức không hợp lệ'); }
    finally { setWorking(''); }
  }

  async function save(item: DashboardFormula) {
    const draft = drafts[item.metricId];
    if (!draft.name.trim()) { setError('Tên công thức không được để trống.'); return; }
    if (draft.mode === 'CUSTOM' && !draft.customExpression?.trim()) { setError('Công thức tùy chỉnh không được để trống.'); return; }
    setWorking(`save:${item.metricId}`); setError(''); setMessage('');
    try {
      await saveDashboardFormula(request, item.metricId, { ...draft, name: draft.name.trim(), description: draft.description?.trim() || null, customExpression: draft.customExpression?.trim() || null });
      setMessage(`Đã lưu công thức cho “${item.metricName}”. Dashboard sẽ dùng cấu hình mới ngay.`);
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể lưu công thức'); }
    finally { setWorking(''); }
  }

  async function reset(item: DashboardFormula) {
    if (!await appDialog.confirm(`Khôi phục công thức chuẩn cho “${item.metricName}”? Công thức tùy chỉnh hiện tại sẽ bị xóa.`)) return;
    setWorking(`reset:${item.metricId}`); setError(''); setMessage('');
    try {
      await resetDashboardFormula(request, item.metricId);
      setMessage(`Đã khôi phục công thức chuẩn cho “${item.metricName}”.`);
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể khôi phục công thức chuẩn'); }
    finally { setWorking(''); }
  }

  return <div className="nova-account-page performance-page formula-page">
    <header className="nova-page-header performance-header">
      <div><p className="nova-eyebrow">CALCULATION RULES · AUDITED</p><h1>Quản lý công thức dashboard</h1><span>Chuẩn hóa cách tính sản lượng, doanh thu, lợi nhuận và các chỉ số dẫn xuất mà không sửa code dashboard.</span></div>
      <label className="performance-month"><span>Tháng xem thử</span><input type="month" value={month} onChange={event => { setLoading(true); setError(''); setMonth(event.target.value); }}/></label>
    </header>

    <section className="formula-guide">
      <div><Calculator/><span><b>Biến dữ liệu</b><code>INPUT</code> là số liệu gốc; <code>TARGET</code> là mục tiêu tháng.</span></div>
      <div><CircleHelp/><span><b>Tham chiếu chỉ số</b>Dùng dạng <code>[SALES_COMPANY_VOLUME]</code>.</span></div>
      <div><FlaskConical/><span><b>Hàm hỗ trợ</b><code>SUM</code>, <code>AVG</code>, <code>MIN</code>, <code>MAX</code>, <code>ROUND</code>, <code>DIV</code>, <code>PERCENT</code>, <code>CLAMP</code>.</span></div>
    </section>

    <div className="performance-toolbar formula-toolbar">
      <label className="formula-search"><span>Tìm công thức</span><div><Search/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Mã chỉ số, tên, phòng ban…"/></div></label>
      <label><span>Phòng ban</span><select value={department} onChange={event => setDepartment(event.target.value)}><option value="ALL">Tất cả phòng ban</option>{departments.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label>
      <label><span>Trạng thái</span><select value={status} onChange={event => setStatus(event.target.value as typeof status)}><option value="ALL">Tất cả</option><option value="ENABLED">Đang áp dụng</option><option value="DISABLED">Chưa áp dụng</option></select></label>
      <button className="nova-button secondary" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? 'spinning' : ''}/>Tải lại</button>
    </div>

    {message && <div className="performance-success"><Check/>{message}</div>}
    {error && <div className="performance-error"><TriangleAlert/>{error}</div>}
    {loading && <div className="performance-state"><span className="nova-session-spinner"/>Đang tải danh sách công thức…</div>}

    {!loading && <section className="kpi-formula-rules" aria-labelledby="kpi-formula-title">
      <header><div><p>CÔNG THỨC KPI TÍNH THƯỞNG</p><h2 id="kpi-formula-title">Kết quả dẫn xuất — không lưu cứng</h2><span>Sáu quy tắc dưới đây được đọc từ cơ sở dữ liệu mỗi khi tính MTD, tỷ lệ hoàn thành và quỹ thưởng.</span></div><b>{kpiRules.length} quy tắc</b></header>
      <div>{kpiRules.map(item => {
        const draft = kpiRuleDrafts[item.key];
        if (!draft) return null;
        const busy = working.endsWith(item.key);
        const expression = draft.mode === 'STANDARD' ? item.standardExpression : draft.customExpression ?? '';
        return <article className={draft.enabled ? 'enabled' : ''} key={item.key}>
          <header><div><span>{item.key}</span><h3>{draft.name}</h3></div><div className="formula-switch"><button type="button" role="switch" aria-checked={draft.enabled} disabled={!canManage || busy} className={draft.enabled ? 'on' : ''} onClick={() => patchKpiRule(item.key, { enabled: !draft.enabled })}><i/><b>{draft.enabled ? 'Đang áp dụng' : 'Tạm tắt'}</b></button></div></header>
          <div className="kpi-formula-fields">
            <label><span>Chế độ</span><select disabled={!canManage || busy} value={draft.mode} onChange={event => patchKpiRule(item.key, { mode: event.target.value as KpiRuleDraft['mode'] })}><option value="STANDARD">Công thức chuẩn</option><option value="CUSTOM">Tùy chỉnh</option></select></label>
            <label><span>Làm tròn</span><select disabled={!canManage || busy} value={draft.roundingScale} onChange={event => patchKpiRule(item.key, { roundingScale: Number(event.target.value) })}>{[0,1,2,3,4,5,6].map(value => <option key={value} value={value}>{value} chữ số</option>)}</select></label>
            <label className="wide"><span>Biểu thức</span><textarea spellCheck={false} disabled={!canManage || busy || draft.mode === 'STANDARD'} value={expression} onChange={event => patchKpiRule(item.key, { customExpression: event.target.value })}/><small>Biến cho phép: {item.availableVariables.join(', ')}</small></label>
            <label className="wide"><span>Mô tả nghiệp vụ</span><input disabled={!canManage || busy} value={draft.description ?? ''} onChange={event => patchKpiRule(item.key, { description: event.target.value })}/></label>
          </div>
          {canManage && <footer><button className="nova-button secondary" disabled={busy} onClick={() => void resetKpiRule(item)}><RotateCcw/>Dùng chuẩn</button><button className="nova-button primary" disabled={busy} onClick={() => void saveKpiRule(item)}><Save/>{working === `kpi-save:${item.key}` ? 'Đang lưu…' : 'Lưu quy tắc'}</button></footer>}
        </article>;
      })}</div>
    </section>}

    {!loading && <div className="formula-list">
      {visible.map(item => {
        const draft = drafts[item.metricId];
        if (!draft) return null;
        const expression = draft.mode === 'STANDARD' ? item.standardExpression : draft.customExpression ?? '';
        const busy = working.endsWith(item.metricId);
        return <article className={`formula-card ${draft.enabled ? 'enabled' : ''}`} key={item.metricId}>
          <header><div><span>{item.departmentName} · {item.metricCode}</span><h2>{item.metricName}</h2><small>{unitLabel[item.measurementUnit] ?? item.measurementUnit}</small></div><div className="formula-result"><span>Kết quả tháng</span><b>{formatValue(item.previewValue, item.roundingScale)}</b><small>{item.validationMessage ?? (item.enabled ? 'Đang dùng trên dashboard' : 'Chưa áp dụng')}</small></div></header>
          <div className="formula-fields">
            <label><span>Tên công thức</span><input disabled={!canManage || busy} value={draft.name} onChange={event => patch(item.metricId, { name: event.target.value })}/></label>
            <label><span>Chế độ</span><select disabled={!canManage || busy} value={draft.mode} onChange={event => patch(item.metricId, { mode: event.target.value as Draft['mode'] })}><option value="STANDARD">Công thức chuẩn</option><option value="CUSTOM">Tùy chỉnh</option></select></label>
            <label><span>Làm tròn</span><select disabled={!canManage || busy} value={draft.roundingScale} onChange={event => patch(item.metricId, { roundingScale: Number(event.target.value) })}>{[0,1,2,3,4,5,6].map(value => <option key={value} value={value}>{value} chữ số</option>)}</select></label>
            <label className="formula-switch"><span>Áp dụng</span><button type="button" role="switch" aria-checked={draft.enabled} disabled={!canManage || busy} className={draft.enabled ? 'on' : ''} onClick={() => patch(item.metricId, { enabled: !draft.enabled })}><i/><b>{draft.enabled ? 'Đang bật' : 'Đang tắt'}</b></button></label>
            <label className="wide"><span>Mô tả nghiệp vụ</span><input disabled={!canManage || busy} value={draft.description ?? ''} onChange={event => patch(item.metricId, { description: event.target.value })} placeholder="Giải thích nguồn số liệu và ý nghĩa công thức"/></label>
            <label className="wide"><span>{draft.mode === 'STANDARD' ? 'Công thức chuẩn' : 'Công thức tùy chỉnh'}</span><textarea spellCheck={false} disabled={!canManage || busy || draft.mode === 'STANDARD'} value={expression} onChange={event => patch(item.metricId, { customExpression: event.target.value })}/><small>Tham chiếu: {item.references.length ? item.references.join(', ') : 'Không có · dùng INPUT'}</small></label>
          </div>
          <footer><span>{item.enabled ? `Dashboard đang tính theo ${draft.mode === 'STANDARD' ? 'công thức chuẩn' : 'công thức tùy chỉnh'}.` : 'Dashboard đang giữ cách tổng hợp số liệu gốc.'}</span>{canManage && <div><button className="nova-button secondary" disabled={busy} onClick={() => void preview(item)}><FlaskConical/>Xem thử</button><button className="nova-button secondary" disabled={busy} onClick={() => void reset(item)}><RotateCcw/>Dùng chuẩn</button><button className="nova-button primary" disabled={busy} onClick={() => void save(item)}><Save/>{working === `save:${item.metricId}` ? 'Đang lưu…' : 'Lưu công thức'}</button></div>}</footer>
        </article>;
      })}
      {!visible.length && <div className="performance-state"><Calculator/>Không có công thức phù hợp bộ lọc.</div>}
    </div>}
  </div>;
}
