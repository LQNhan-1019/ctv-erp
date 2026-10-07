'use client';

import {
  BadgeDollarSign,
  Building2,
  CalendarDays,
  CircleAlert,
  CircleCheck,
  Filter,
  RefreshCw,
  Save,
  Search,
  Target,
  TrendingUp,
  Upload,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import DashboardPeriodPicker from '@/components/ui/dashboard-period-picker';
import ErpSelect from '@/components/ui/erp-select';
import { useAuth } from '@/features/auth/context/auth-context';
import { useApiResource } from '@/lib/api/use-api-resource';
import { getKpiEntrySheet, listKpiEntryUnits, updateKpiEntrySheet } from '../api/performance-api';
import type { KpiEntrySheet, KpiMetricResult, KpiUnitOption } from '../types/performance';
import KpiWorkbookImportDialog from './kpi-workbook-import-dialog';

type ViewKey = 'MONTH' | `WEEK_${number}`;
type UnitTypeFilter = 'ALL' | KpiUnitOption['type'];

const unitTypeLabels: Record<KpiUnitOption['type'], string> = {
  DEPARTMENT: 'Phòng / ban',
  REGION: 'Khu vực',
  VEHICLE: 'Xe bồn',
  STATION: 'Cửa hàng',
};

function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLocaleLowerCase('vi');
}

function currentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function initialDay(month: string) {
  const now = new Date();
  const days = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
  return month === currentMonth() ? Math.min(now.getDate(), days) : 1;
}

function initialView(month: string): ViewKey {
  return `WEEK_${Math.floor((initialDay(month) - 1) / 7) + 1}`;
}

function format(value: number | null | undefined, digits = 2) {
  if (value == null) return '—';
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: digits }).format(value);
}

function money(value: number | null | undefined) {
  if (value == null) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
}

function rawDay(metric: KpiMetricResult, day: number) {
  const value = metric.dailyValues[String(day)];
  return value == null ? '' : String(value);
}

function cellKey(definitionId: string, day: number) {
  return `${definitionId}|${day}`;
}

function weekday(month: string, day: number) {
  const date = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, day);
  return ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()];
}

function isWeekend(month: string, day: number) {
  const value = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, day).getDay();
  return value === 0 || value === 6;
}

export default function KpiBonusEntryPage() {
  const { request, user } = useAuth();
  const [month, setMonth] = useState(currentMonth);
  const [unitId, setUnitId] = useState('');
  const [unitType, setUnitType] = useState<UnitTypeFilter>('ALL');
  const [query, setQuery] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [importRevision, setImportRevision] = useState(0);
  const [importNotice, setImportNotice] = useState('');
  const canImport = Boolean(user?.permissions.includes('PERFORMANCE.KPI.CONFIG.MANAGE')
    && user?.permissions.includes('PERFORMANCE.DATA.ENTER'));
  const unitsResource = useApiResource<KpiUnitOption[]>({
    key: `kpi-entry-units:${month}`,
    load: () => listKpiEntryUnits(request, month),
    onSuccess: (units) => setUnitId((current) => units.some((unit) => unit.id === current) ? current : units[0]?.id ?? ''),
  });
  const filteredUnits = useMemo(() => {
    const keyword = normalizeSearch(query.trim());
    return (unitsResource.data ?? []).filter((unit) => {
      const matchesType = unitType === 'ALL' || unit.type === unitType;
      const haystack = normalizeSearch(`${unit.name} ${unit.code} ${unit.ownerDepartmentName ?? ''}`);
      return matchesType && (!keyword || haystack.includes(keyword));
    });
  }, [query, unitType, unitsResource.data]);
  const selectedUnitId = filteredUnits.some((unit) => unit.id === unitId) ? unitId : filteredUnits[0]?.id ?? '';
  const selectedUnit = filteredUnits.find((unit) => unit.id === selectedUnitId);

  return <div className="nova-account-page kpi-entry-page">
    <header className="kpi-entry-hero">
      <div>
        <p>KPI TÍNH THƯỞNG THEO NGÀY</p>
        <h1>Bảng nhập kết quả thực tế</h1>
        <span>Bố cục theo bảng Excel: ba dòng chỉ tiêu, các cột ngày và nhóm kết quả MTD, mục tiêu, tỷ lệ, đơn giá, thành tiền.</span>
      </div>
      <div className="kpi-entry-hero-actions"><DashboardPeriodPicker type="MONTH" value={month} allowedTypes={['MONTH']} onChange={(_, next) => {
        setMonth(next); setUnitId(''); setImportNotice('');
      }}/>{canImport && <button type="button" className="nova-button primary" onClick={() => setImportOpen(true)}><Upload/>Import Excel KPI + MP</button>}</div>
    </header>

    {importNotice && <div className="kpi-entry-notice success"><CircleCheck/><span>{importNotice}</span></div>}

    {unitsResource.error && <div className="performance-error"><CircleAlert/>{unitsResource.error}<button onClick={unitsResource.refresh}>Thử lại</button></div>}
    {unitsResource.loading && <div className="performance-state"><span className="nova-session-spinner"/>Đang tải phạm vi nhập liệu…</div>}
    {!unitsResource.loading && !unitsResource.error && !unitsResource.data?.length && <section className="kpi-entry-empty">
      <Building2/><h2>Không có đơn vị được phép xem</h2>
      <p>Hãy liên kết tài khoản với hồ sơ nhân viên, gắn đúng phòng ban và cấp quyền PERFORMANCE.DATA.VIEW hoặc PERFORMANCE.DATA.ENTER.</p>
    </section>}
    {!!unitsResource.data?.length && <>
      <section className="kpi-entry-unit-filter">
        <label className="kpi-entry-search"><span>Tìm đơn vị</span><div><Search/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ban Giám đốc, khu vực, xe, CHXD…"/></div></label>
        <label><span>Loại đơn vị</span><ErpSelect value={unitType} options={[{ value: 'ALL', label: 'Tất cả đơn vị' }, ...Object.entries(unitTypeLabels).map(([value, label]) => ({ value, label }))]} onChange={(value) => setUnitType(value as UnitTypeFilter)}/></label>
        <label><span>Đơn vị được phân quyền</span><ErpSelect value={selectedUnitId} options={filteredUnits.map((unit) => ({ value: unit.id, label: unit.name }))} onChange={setUnitId}/></label>
        {selectedUnit && <div><Building2/><span><b>{selectedUnit.ownerDepartmentName ?? 'Toàn công ty'}</b><small>{unitTypeLabels[selectedUnit.type]} · Phạm vi hồ sơ nhân viên</small></span></div>}
      </section>
      {!filteredUnits.length && <section className="kpi-entry-filter-empty"><Filter/><div><h2>Không tìm thấy đơn vị phù hợp</h2><p>Hãy đổi loại đơn vị hoặc xóa từ khóa tìm kiếm.</p></div></section>}
      {selectedUnitId && <KpiUnitEditor key={`${month}:${selectedUnitId}:${importRevision}`} month={month} unitId={selectedUnitId} showWholeMonth={importRevision > 0}/>} 
    </>}
    {importOpen && <KpiWorkbookImportDialog month={month} onClose={() => setImportOpen(false)} onImported={(result) => {
      setImportOpen(false);
      setImportRevision((current) => current + 1);
      setImportNotice(`Đã cập nhật ${result.updatedDefinitions} cấu hình, ${result.importedDailyCells} ô KPI; đồng bộ ${result.synchronizedGoals} mục tiêu và ${result.synchronizedDailyCells} ô nhập liệu ngày từ ${result.sheet}.`);
      void unitsResource.refresh();
    }}/>} 
  </div>;
}

function KpiUnitEditor({ month, unitId, showWholeMonth = false }: { month: string; unitId: string; showWholeMonth?: boolean }) {
  const { request, user } = useAuth();
  const [view, setView] = useState<ViewKey>(showWholeMonth ? 'MONTH' : initialView(month));
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Set<string>>(() => new Set());
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const resource = useApiResource<KpiEntrySheet>({
    key: `kpi-entry-sheet:${month}:${unitId}`,
    load: () => getKpiEntrySheet(request, unitId, month),
  });
  const sheet = resource.data;
  const canEnter = Boolean(user?.permissions.includes('PERFORMANCE.DATA.ENTER') && sheet?.entryPolicy.enabled);
  const allDays = useMemo(() => Array.from(
    { length: sheet?.daysInMonth ?? new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate() },
    (_, index) => index + 1,
  ), [month, sheet?.daysInMonth]);
  const weeks = useMemo(() => Array.from({ length: Math.ceil(allDays.length / 7) }, (_, index) => allDays.slice(index * 7, index * 7 + 7)), [allDays]);
  const visibleDays = view === 'MONTH' ? allDays : weeks[Number(view.slice(5)) - 1] ?? weeks[0] ?? [];

  function updateCell(metric: KpiMetricResult, day: number, value: string) {
    const key = cellKey(metric.definitionId, day);
    setEdits((current) => ({ ...current, [key]: value }));
    setDirty((current) => new Set(current).add(key));
    setNotice(null);
  }

  async function save() {
    if (!sheet || !dirty.size) {
      setNotice({ kind: 'success', text: 'Không có ô nào thay đổi.' });
      return;
    }
    const values = [...dirty].map((key) => {
      const [definitionId, dayText] = key.split('|');
      const raw = edits[key]?.trim() ?? '';
      const normalized = raw.replace(/\s/g, '').replace(',', '.');
      const value = normalized === '' ? null : Number(normalized);
      const metric = sheet.result.metrics.find((item) => item.definitionId === definitionId);
      if (value != null && !Number.isFinite(value)) throw new Error(`Giá trị “${metric?.name ?? 'KPI'}” ngày ${dayText} không hợp lệ`);
      return { definitionId, day: Number(dayText), value };
    });
    setSaving(true);
    setNotice(null);
    try {
      const updated = await updateKpiEntrySheet(request, unitId, month, values);
      resource.replace(updated);
      setEdits({});
      setDirty(new Set());
      setNotice({ kind: 'success', text: `Đã lưu ${values.length} ô. MTD, tỷ lệ hoàn thành và thưởng tạm tính đã được tính lại.` });
    } catch (cause) {
      setNotice({ kind: 'error', text: cause instanceof Error ? cause.message : 'Không lưu được số liệu KPI' });
    } finally {
      setSaving(false);
    }
  }

  if (resource.loading) return <div className="performance-state"><span className="nova-session-spinner"/>Đang tải ba chỉ tiêu của đơn vị…</div>;
  if (resource.error) return <div className="performance-error"><CircleAlert/>{resource.error}<button onClick={resource.refresh}>Thử lại</button></div>;
  if (!sheet) return null;

  return <>
    <section className="kpi-entry-summary">
      <article><i><BadgeDollarSign/></i><span><small>Quỹ được phân bổ</small><b>{money(sheet.result.allocatedFund)}</b></span></article>
      <article><i><TrendingUp/></i><span><small>Quỹ thực tế tạm tính</small><b className={sheet.result.actualFund < 0 ? 'negative' : ''}>{money(sheet.result.actualFund)}</b></span></article>
      <article><i><Target/></i><span><small>Hoàn thành quỹ</small><b>{format(sheet.result.fundCompletionPercent)}%</b></span></article>
    </section>

    {notice && <div className={`kpi-entry-notice ${notice.kind}`}>{notice.kind === 'success' ? <CircleCheck/> : <CircleAlert/>}<span>{notice.text}</span></div>}

    <section className="kpi-excel-panel">
      <header>
        <div><p>BẢNG NHẬP LIỆU NGÀY</p><h2>{sheet.unit.name} · Tháng {Number(month.slice(5, 7))}/{month.slice(0, 4)}</h2><span>Ô có viền màu là dữ liệu chưa lưu. Để trống rồi lưu để xóa số liệu của ô.</span></div>
        <div className="kpi-excel-view-tabs" aria-label="Chọn phạm vi ngày">
          {weeks.map((days, index) => <button type="button" className={view === `WEEK_${index + 1}` ? 'active' : ''} key={index} onClick={() => setView(`WEEK_${index + 1}`)}>Tuần {index + 1}<small>{days[0]}–{days.at(-1)}</small></button>)}
          <button type="button" className={view === 'MONTH' ? 'active' : ''} onClick={() => setView('MONTH')}>Cả tháng<small>1–{sheet.daysInMonth}</small></button>
        </div>
      </header>

      <div className="kpi-excel-scroll">
        <table>
          <caption className="sr-only">Bảng nhập ba KPI theo ngày của {sheet.unit.name}</caption>
          <thead><tr>
            <th rowSpan={2} className="kpi-excel-metric-head">Tên chỉ tiêu</th>
            {visibleDays.map((day) => <th key={`weekday-${day}`} className={isWeekend(month, day) ? 'weekend' : ''}>{weekday(month, day)}</th>)}
            <th rowSpan={2} className="summary">MTD</th><th rowSpan={2} className="summary">MP</th><th rowSpan={2} className="summary">TL %</th><th rowSpan={2} className="summary">MTG</th><th rowSpan={2} className="summary">ĐVT</th><th rowSpan={2} className="summary">Ti</th><th rowSpan={2} className="summary reward">Thành tiền</th>
          </tr><tr>{visibleDays.map((day) => <th key={`day-${day}`} className={isWeekend(month, day) ? 'weekend' : ''}>{day}</th>)}</tr></thead>
          <tbody>{sheet.result.metrics.map((metric, metricIndex) => <tr key={metric.definitionId}>
            <th scope="row" className="kpi-excel-metric"><span>Chỉ tiêu {metric.orderInUnit}/3</span><b>{metric.name}</b><small>{metric.unitOfMeasure}</small></th>
            {visibleDays.map((day, dayIndex) => {
              const key = cellKey(metric.definitionId, day);
              const raw = edits[key] ?? rawDay(metric, day);
              const negative = raw.trim().startsWith('-');
              const flatIndex = metricIndex * visibleDays.length + dayIndex;
              return <td key={key} className={`${isWeekend(month, day) ? 'weekend' : ''} ${dirty.has(key) ? 'dirty' : ''} ${negative ? 'negative' : ''}`}><input data-kpi-cell={flatIndex} aria-label={`${metric.name}, ngày ${day}`} inputMode="decimal" value={raw} onChange={(event) => updateCell(metric, day, event.target.value)} onKeyDown={(event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                document.querySelector<HTMLInputElement>(`[data-kpi-cell="${flatIndex + 1}"]`)?.focus();
              }} placeholder="—" disabled={!canEnter || saving}/></td>;
            })}
            <td className={`calculated ${metric.mtd < 0 ? 'negative' : ''}`} title={format(metric.mtd)}>{format(metric.mtd)}</td>
            <td className="calculated" title={format(metric.monthlyTarget)}>{format(metric.monthlyTarget)}</td>
            <td className="calculated percent">{format(metric.completionPercent)}%</td>
            <td className="calculated" title={format(metric.targetGap)}>{format(metric.targetGap)}</td>
            <td className="calculated unit">{metric.unitOfMeasure}</td>
            <td className="calculated" title={money(metric.ratePerUnit)}>{format(metric.ratePerUnit)}</td>
            <td className={`calculated reward ${metric.rewardAmount < 0 ? 'negative' : ''}`} title={money(metric.rewardAmount)}>{money(metric.rewardAmount)}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <footer><span>MTD và các cột kết quả chỉ đọc, luôn được tính từ dữ liệu ngày và công thức trong hệ thống.</span><b>{visibleDays.length} ngày đang hiển thị</b></footer>
    </section>

    <footer className="kpi-entry-actions">
      <div><CalendarDays/><span>Dữ liệu duy nhất được lưu là các ô thực tế từng ngày. Có thể nhập số âm và dùng phím Enter để di chuyển nhanh.</span></div>
      <button type="button" className="nova-button secondary" onClick={() => { setEdits({}); setDirty(new Set()); setNotice(null); resource.refresh(); }} disabled={saving}><RefreshCw/>Tải lại</button>
      <button type="button" className="nova-button primary" onClick={() => void save().catch((cause: unknown) => setNotice({ kind: 'error', text: cause instanceof Error ? cause.message : 'Số liệu không hợp lệ' }))} disabled={!canEnter || saving || !dirty.size}><Save/>{saving ? 'Đang lưu…' : `Lưu ${dirty.size} ô`}</button>
    </footer>
  </>;
}
