'use client';

import { Check, ListFilter, LockKeyhole, Save, TriangleAlert } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/features/auth/context/auth-context';
import { getDataSheet, listInputDepartments, updateDataSheet } from '../api/performance-api';
import type { DataSheet, PerformanceDepartment } from '../types/performance';

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function scopeLabel(scope: string) {
  return ({ COMPANY: 'Toàn công ty', REGION: 'Khu vực', VEHICLE: 'Xe bồn', STORE: 'Cửa hàng' } as Record<string, string>)[scope] ?? scope;
}

export default function PerformanceDataEntryPage() {
  const { request } = useAuth();
  const [month, setMonth] = useState(currentMonth);
  const [departments, setDepartments] = useState<PerformanceDepartment[]>([]);
  const [departmentId, setDepartmentId] = useState('');
  const [sheet, setSheet] = useState<DataSheet | null>(null);
  const [cells, setCells] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [scopeFilter, setScopeFilter] = useState('ALL');
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [metricQuery, setMetricQuery] = useState('');

  useEffect(() => {
    let active = true;
    listInputDepartments(request)
      .then((items) => {
        if (!active) return;
        setDepartments(items);
        setDepartmentId((current) => current || items[0]?.id || '');
        if (!items.length) setLoading(false);
      })
      .catch((reason: Error) => { if (active) { setError(reason.message); setLoading(false); } });
    return () => { active = false; };
  }, [request]);

  useEffect(() => {
    if (!departmentId) return;
    let active = true;
    getDataSheet(request, departmentId, month)
      .then((value) => {
        if (!active) return;
        setSheet(value);
        const next: Record<string, string> = {};
        value.rows.forEach((row) => {
          for (let day = 1; day <= value.daysInMonth; day += 1) {
            const stored = row.dailyValues[String(day)];
            next[`${row.metricId}:${day}`] = stored === undefined ? '' : String(stored);
          }
        });
        setCells(next); setDirty(false);
      })
      .catch((reason: Error) => { if (active) setError(reason.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [departmentId, month, request]);

  const days = useMemo(() => Array.from({ length: 31 }, (_, index) => index + 1), []);
  const isSalesDepartment = sheet?.department.code === 'CTV-KDTH';
  const rowsByScope = useMemo(() => {
    if (!sheet) return [];
    return scopeFilter === 'ALL'
      ? sheet.rows
      : sheet.rows.filter((row) => row.scopeLevel === scopeFilter);
  }, [scopeFilter, sheet]);
  const subjects = useMemo(() => Array.from(
    new Map(rowsByScope.map((row) => [row.subjectCode, row.subjectName])).entries(),
  ).sort((left, right) => left[1].localeCompare(right[1], 'vi')), [rowsByScope]);
  const visibleRows = useMemo(() => {
    const query = metricQuery.trim().toLocaleLowerCase('vi');
    return rowsByScope.filter((row) => {
      if (subjectFilter !== 'ALL' && row.subjectCode !== subjectFilter) return false;
      if (!query) return true;
      return `${row.metricCode} ${row.metricName} ${row.subjectCode} ${row.subjectName}`
        .toLocaleLowerCase('vi')
        .includes(query);
    });
  }, [metricQuery, rowsByScope, subjectFilter]);

  function setCell(key: string, value: string) {
    setCells((current) => ({ ...current, [key]: value }));
    setDirty(true); setMessage('');
  }

  async function save() {
    if (!sheet) return;
    const values = sheet.rows.flatMap((row) => days.filter((day) => day <= sheet.daysInMonth).map((day) => {
      const raw = cells[`${row.metricId}:${day}`]?.trim() ?? '';
      return { metricId: row.metricId, day, value: raw === '' ? null : Number(raw) };
    }));
    if (values.some((item) => item.value !== null && !Number.isFinite(item.value))) {
      setError('Có ô chứa giá trị không hợp lệ.'); return;
    }
    setSaving(true); setError(''); setMessage('');
    try {
      const updated = await updateDataSheet(request, departmentId, month, values);
      setSheet(updated); setDirty(false); setMessage('Đã lưu toàn bộ số liệu trong sheet tháng.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể lưu số liệu');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="nova-account-page performance-page">
      <header className="nova-page-header performance-header">
        <div><p className="nova-eyebrow">SHEET SỐ LIỆU TẠM THỜI</p><h1>Nhập dữ liệu theo ngày</h1><span>Mỗi phòng ban chỉ nhìn và nhập được sheet thuộc phạm vi đã được cấp quyền.</span></div>
        <button className="nova-button primary" disabled={!dirty || saving || !sheet} onClick={() => void save()}><Save />{saving ? 'Đang lưu…' : 'Lưu số liệu'}</button>
      </header>
      <div className="performance-toolbar">
        <label><span>Bộ phận nhập</span><select disabled={departments.length <= 1} value={departmentId} onChange={(event) => { setLoading(true); setError(''); setMessage(''); setScopeFilter('ALL'); setSubjectFilter('ALL'); setMetricQuery(''); setDepartmentId(event.target.value); }}>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><small>Được xác định từ hồ sơ nhân viên và phạm vi quyền.</small></label>
        <label><span>Sheet tháng</span><input type="month" value={month} onChange={(event) => { setLoading(true); setError(''); setMessage(''); setMonth(event.target.value); }} /></label>
        {dirty && <span className="performance-unsaved">Có thay đổi chưa lưu</span>}
      </div>
      {!loading && isSalesDepartment && <div className="performance-business-filters">
        <div className="performance-filter-heading"><ListFilter /><div><b>Bộ lọc Phòng Kinh doanh Tổng hợp</b><span>Lọc nhanh theo cấp vận hành, đối tượng hoặc tên chỉ số.</span></div></div>
        <label><span>Cấp dữ liệu</span><select value={scopeFilter} onChange={(event) => { setScopeFilter(event.target.value); setSubjectFilter('ALL'); }}><option value="ALL">Tất cả cấp</option><option value="COMPANY">Toàn công ty</option><option value="REGION">Khu vực</option><option value="VEHICLE">Đội xe bồn</option><option value="STORE">Cửa hàng bán lẻ</option></select></label>
        <label><span>Đối tượng</span><select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)}><option value="ALL">Tất cả đối tượng</option>{subjects.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label>
        <label className="performance-query"><span>Tìm chỉ số</span><input type="search" placeholder="Sản lượng, lãi gộp…" value={metricQuery} onChange={(event) => setMetricQuery(event.target.value)} /></label>
        <output>{visibleRows.length}/{sheet?.rows.length ?? 0} chỉ số</output>
      </div>}
      {message && <div className="performance-success"><Check />{message}</div>}
      {error && <div className="performance-error"><TriangleAlert />{error}</div>}
      {!loading && departments.length === 0 && <div className="performance-empty"><LockKeyhole /><h2>Chưa được cấp phạm vi nhập liệu</h2><p>Quản trị viên cần liên kết tài khoản với hồ sơ nhân viên đúng phòng ban và cấp quyền PERFORMANCE.DATA.ENTER tại phòng đó.</p></div>}
      {loading && <div className="performance-state"><span className="nova-session-spinner" />Đang mở sheet dữ liệu…</div>}
      {!loading && sheet && <div className="performance-sheet-wrap">
        <table className="performance-sheet">
          <thead><tr><th className="sheet-department">Bộ phận nhập</th><th className="sheet-metric">Tên chỉ số (ĐVT / Ngày)</th>{days.map((day) => <th key={day}>{day}</th>)}</tr></thead>
          <tbody>{visibleRows.map((row) => <tr key={row.metricId}>
            <td className="sheet-department"><b>{sheet.department.code.replace('CTV-', 'P. ')}</b><small>{row.subjectName}</small><em>{scopeLabel(row.scopeLevel)}</em></td>
            <td className="sheet-metric"><b>{row.metricName}</b><small>{row.measurementUnit} · {row.aggregationMethod === 'SUM' ? 'Cộng tháng' : 'Cuối kỳ'}</small></td>
            {days.map((day) => <td key={day} className={day > sheet.daysInMonth ? 'sheet-day-disabled' : undefined}><input disabled={day > sheet.daysInMonth} aria-label={`${row.metricName}, ngày ${day}`} type="number" step="0.001" value={cells[`${row.metricId}:${day}`] ?? ''} onChange={(event) => setCell(`${row.metricId}:${day}`, event.target.value)} /></td>)}
          </tr>)}{visibleRows.length === 0 && <tr className="performance-filter-empty"><td colSpan={33}>Không có chỉ số phù hợp với bộ lọc.</td></tr>}</tbody>
        </table>
      </div>}
    </div>
  );
}
