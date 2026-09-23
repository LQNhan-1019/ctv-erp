'use client';

import { appDialog } from '@/lib/ui/app-dialog';

import { Check, Pencil, Plus, RefreshCw, Save, Search, Trash2, TriangleAlert, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/features/auth/context/auth-context';
import { createPerformanceMetric, deletePerformanceMetric, listPerformanceMetrics, updatePerformanceMetric } from '../api/performance-api';
import type { MeasurementUnit, PerformanceMetric, PerformanceMetricInput } from '../types/performance';

const emptyMetric = (departmentId = ''): PerformanceMetricInput => ({ code: '', name: '', departmentId, scopeLevel: 'COMPANY', subjectCode: 'CTV', subjectName: 'Toàn công ty', measurementUnit: 'COUNT', aggregationMethod: 'SUM', targetDirection: 'AT_LEAST', sortOrder: 100 });
const unitLabels: Record<MeasurementUnit, string> = { MILLION_VND: 'Triệu đồng', COUNT: 'Số lượng', CUBIC_METER: 'm³', KM: 'km' };

export default function MetricManagementDialog({ onClose, onChanged }: { onClose: () => void; onChanged: () => void }) {
  const { request } = useAuth();
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [draft, setDraft] = useState<PerformanceMetricInput>(emptyMetric());
  const [editingId, setEditingId] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changed, setChanged] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const items = await listPerformanceMetrics(request);
      setMetrics(items);
      setDraft(current => current.departmentId ? current : emptyMetric(items[0]?.departmentId ?? ''));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không tải được danh mục chỉ số'); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    let active = true;
    listPerformanceMetrics(request)
      .then(items => {
        if (!active) return;
        setMetrics(items);
        setDraft(current => current.departmentId ? current : emptyMetric(items[0]?.departmentId ?? ''));
      })
      .catch((reason: Error) => { if (active) setError(reason.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [request]);

  const departments = useMemo(() => Array.from(new Map(metrics.map(item => [item.departmentId, item.departmentName])).entries()), [metrics]);
  const visible = useMemo(() => { const keyword = query.trim().toLocaleLowerCase('vi'); return metrics.filter(item => !keyword || `${item.code} ${item.name} ${item.departmentName} ${item.subjectName}`.toLocaleLowerCase('vi').includes(keyword)); }, [metrics, query]);

  function edit(metric: PerformanceMetric) {
    setEditingId(metric.id); setError(''); setMessage('');
    setDraft({ code: metric.code, name: metric.name, departmentId: metric.departmentId, scopeLevel: metric.scopeLevel, subjectCode: metric.subjectCode, subjectName: metric.subjectName, measurementUnit: metric.measurementUnit, aggregationMethod: metric.aggregationMethod, targetDirection: metric.targetDirection, sortOrder: metric.sortOrder });
  }
  function reset() { setEditingId(''); setDraft(emptyMetric(departments[0]?.[0] ?? '')); }
  async function save() {
    if (!draft.code.trim() || !draft.name.trim() || !draft.departmentId || !draft.subjectCode.trim() || !draft.subjectName.trim()) { setError('Mã, tên chỉ số, phòng ban và đối tượng là bắt buộc.'); return; }
    const body = { ...draft, code: draft.code.trim().toUpperCase(), name: draft.name.trim(), subjectCode: draft.subjectCode.trim().toUpperCase(), subjectName: draft.subjectName.trim() };
    setSaving(true); setError(''); setMessage('');
    try {
      const saved = editingId ? await updatePerformanceMetric(request, editingId, body) : await createPerformanceMetric(request, body);
      setMetrics(current => [...current.filter(item => item.id !== saved.id), saved].sort((a, b) => a.departmentName.localeCompare(b.departmentName, 'vi') || a.sortOrder - b.sortOrder));
      setChanged(true); setMessage(editingId ? 'Đã cập nhật chỉ số.' : 'Đã thêm chỉ số mới.'); reset();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không lưu được chỉ số'); }
    finally { setSaving(false); }
  }
  async function remove(metric: PerformanceMetric) {
    if (!await appDialog.confirm(`Ngừng sử dụng chỉ số “${metric.name}”? Số liệu lịch sử được giữ lại nhưng chỉ số sẽ biến mất khỏi bảng nhập và dashboard.`)) return;
    setSaving(true); setError(''); setMessage('');
    try { await deletePerformanceMetric(request, metric.id); setMetrics(current => current.filter(item => item.id !== metric.id)); if (editingId === metric.id) reset(); setChanged(true); setMessage('Đã ngừng sử dụng chỉ số; dữ liệu lịch sử vẫn được bảo toàn.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không xóa được chỉ số'); }
    finally { setSaving(false); }
  }
  function close() { if (changed) onChanged(); onClose(); }

  return <div className="nova-overlay"><section className="nova-dialog performance-metric-dialog" role="dialog" aria-modal="true" aria-labelledby="metric-dialog-title"><header><div><p>DANH MỤC NHẬP LIỆU</p><h2 id="metric-dialog-title">Quản lý chỉ số dashboard</h2><span>Thêm, sửa hoặc ngừng sử dụng chỉ số. Dashboard tự đọc danh mục đang hoạt động.</span></div><button onClick={close} disabled={saving} aria-label="Đóng"><X/></button></header><div className="nova-dialog-body performance-metric-body">
    {message && <div className="performance-success"><Check/>{message}</div>}{error && <div className="performance-error"><TriangleAlert/>{error}</div>}
    <section className="performance-metric-form"><div className="performance-metric-form-title"><div><b>{editingId ? 'Sửa chỉ số' : 'Thêm chỉ số'}</b><span>Mã chỉ số viết hoa, không dấu và dùng dấu gạch dưới.</span></div>{editingId && <button className="nova-button secondary" onClick={reset}>Tạo mới</button>}</div>
      <div className="performance-metric-fields"><label><span>Mã chỉ số</span><input value={draft.code} disabled={saving} placeholder="VD: HR_ADMIN_COST" onChange={event => setDraft(current => ({ ...current, code: event.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') }))}/></label><label className="wide"><span>Tên chỉ số</span><input value={draft.name} disabled={saving} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))}/></label><label><span>Phòng ban</span><select value={draft.departmentId} disabled={saving} onChange={event => setDraft(current => ({ ...current, departmentId: event.target.value }))}>{departments.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label><label><span>Cấp dữ liệu</span><select value={draft.scopeLevel} disabled={saving} onChange={event => setDraft(current => ({ ...current, scopeLevel: event.target.value as PerformanceMetricInput['scopeLevel'] }))}><option value="COMPANY">Toàn công ty</option><option value="REGION">Khu vực</option><option value="VEHICLE">Xe bồn</option><option value="STORE">Cửa hàng</option></select></label><label><span>Mã đối tượng</span><input value={draft.subjectCode} disabled={saving} onChange={event => setDraft(current => ({ ...current, subjectCode: event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') }))}/></label><label className="wide"><span>Tên đối tượng</span><input value={draft.subjectName} disabled={saving} onChange={event => setDraft(current => ({ ...current, subjectName: event.target.value }))}/></label><label><span>Đơn vị</span><select value={draft.measurementUnit} disabled={saving} onChange={event => setDraft(current => ({ ...current, measurementUnit: event.target.value as MeasurementUnit }))}>{Object.entries(unitLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span>Cách tổng hợp</span><select value={draft.aggregationMethod} disabled={saving} onChange={event => setDraft(current => ({ ...current, aggregationMethod: event.target.value as PerformanceMetricInput['aggregationMethod'] }))}><option value="SUM">Cộng các ngày</option><option value="LAST">Giá trị gần nhất</option></select></label><label><span>Chiều mục tiêu</span><select value={draft.targetDirection} disabled={saving} onChange={event => setDraft(current => ({ ...current, targetDirection: event.target.value as PerformanceMetricInput['targetDirection'] }))}><option value="AT_LEAST">Càng cao càng tốt</option><option value="AT_MOST">Càng thấp càng tốt</option></select></label><label><span>Thứ tự</span><input type="number" min="0" max="100000" value={draft.sortOrder} disabled={saving} onChange={event => setDraft(current => ({ ...current, sortOrder: Number(event.target.value) }))}/></label></div>
      <button className="nova-button primary" disabled={saving || !departments.length} onClick={() => void save()}><Save/>{saving ? 'Đang lưu…' : editingId ? 'Lưu thay đổi' : 'Thêm chỉ số'}</button>
    </section>
    <section className="performance-metric-list"><header><label><Search/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm mã, tên, phòng ban…"/></label><button onClick={() => void load()} disabled={loading || saving} aria-label="Tải lại"><RefreshCw/></button></header>{loading ? <div className="performance-state"><span className="nova-session-spinner"/>Đang tải danh mục…</div> : <div>{visible.map(metric => <article key={metric.id}><div><span>{metric.departmentName} · {metric.subjectName}</span><b>{metric.name}</b><small>{metric.code} · {unitLabels[metric.measurementUnit]} · {metric.aggregationMethod}</small></div><button onClick={() => edit(metric)} disabled={saving} aria-label={`Sửa ${metric.name}`}><Pencil/></button><button className="danger" onClick={() => void remove(metric)} disabled={saving} aria-label={`Xóa ${metric.name}`}><Trash2/></button></article>)}{!visible.length && <div className="performance-state"><Plus/>Chưa có chỉ số phù hợp.</div>}</div>}</section>
  </div><footer><button className="nova-button secondary" onClick={close} disabled={saving}>Đóng</button></footer></section></div>;
}
