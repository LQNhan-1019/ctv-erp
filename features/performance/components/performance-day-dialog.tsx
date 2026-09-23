'use client';

import { appDialog } from '@/lib/ui/app-dialog';

import { CalendarDays, LockKeyhole, Save, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { DayChange } from '../hooks/use-performance-data-entry';
import type { DataSheet, DataSheetRow } from '../types/performance';
import { dailyNumber } from '../lib/performance-weeks';

type Props = {
  sheet: DataSheet;
  day: number;
  rows: DataSheetRow[];
  focusMetricId?: string;
  saving: boolean;
  onSave: (changes: DayChange[]) => Promise<void>;
  onClose: () => void;
};

function initialValues(rows: DataSheetRow[], day: number) {
  return Object.fromEntries(rows.map((row) => [row.metricId,
    row.dailyValues[String(day)] === undefined ? '' : String(row.dailyValues[String(day)])]));
}

export default function PerformanceDayDialog({ sheet, day, rows, focusMetricId, saving, onSave, onClose }: Props) {
  const [values, setValues] = useState<Record<string, string>>(() => initialValues(rows, day));
  const [error, setError] = useState('');
  const orderedRows = useMemo(() => focusMetricId
    ? [...rows].sort((left, right) => Number(right.metricId === focusMetricId) - Number(left.metricId === focusMetricId))
    : rows, [focusMetricId, rows]);
  const date = `${sheet.month}-${String(day).padStart(2, '0')}`;
  const [year, monthNumber] = sheet.month.split('-').map(Number);
  const dateLabel = new Date(year, monthNumber - 1, day).toLocaleDateString('vi-VN',
    { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  const expired = sheet.entryPolicy.enabled && date < sheet.entryPolicy.editableFrom;
  const dirty = rows.some((row) => (values[row.metricId] ?? '').trim() !==
    (row.dailyValues[String(day)] === undefined ? '' : String(row.dailyValues[String(day)])));
  const filled = rows.filter((row) => row.dailyValues[String(day)] !== undefined).length;

  async function close() {
    if (dirty && !await appDialog.confirm('Bạn có số liệu chưa lưu. Đóng cửa sổ nhập ngày này?')) return;
    onClose();
  }

  async function save() {
    setError('');
    const changes: DayChange[] = [];
    for (const row of rows) {
      const raw = (values[row.metricId] ?? '').trim();
      const previous = row.dailyValues[String(day)];
      if (!raw && previous === undefined) continue;
      let value: number | null = null;
      if (raw) {
        const normalized = raw.replace(',', '.');
        if (!/^-?\d+(?:\.\d{1,3})?$/.test(normalized) || !Number.isFinite(Number(normalized)) || normalized.replace(/^-/, '').split('.')[0].length > 21) {
          setError(`“${row.metricName}”: nhập số hợp lệ, tối đa 3 chữ số thập phân.`); return;
        }
        value = Number(normalized);
      }
      if (previous !== undefined && value === previous) continue;
      if (expired && ((previous === undefined && sheet.entryPolicy.lockCreate) ||
        (previous !== undefined && value === null && sheet.entryPolicy.lockDelete) ||
        (previous !== undefined && value !== null && sheet.entryPolicy.lockUpdate))) {
        setError(`“${row.metricName}”: thao tác này đã bị khóa theo hạn nhập liệu.`); return;
      }
      changes.push({ metricId: row.metricId, value });
    }
    if (!changes.length) { onClose(); return; }
    try { await onSave(changes); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không lưu được dữ liệu'); }
  }

  return <div className="nova-overlay" role="presentation"><section className="nova-dialog performance-day-dialog" role="dialog" aria-modal="true" aria-labelledby="performance-day-title">
    <header><div><p>CHI TIẾT NGÀY</p><h2 id="performance-day-title">{dateLabel}</h2><span>{sheet.department.name} · {filled}/{rows.length} chỉ số đã có dữ liệu</span></div><button type="button" disabled={saving} onClick={close} aria-label="Đóng"><X /></button></header>
    <div className="performance-day-intro"><CalendarDays /><span>Chỉ số trong sheet tháng chỉ để xem. Nhập hoặc điều chỉnh số liệu của ngày này ở đây; hệ thống chỉ gửi những ô thay đổi.</span></div>
    {error && <p className="performance-day-error" role="alert">{error}</p>}
    <div className="performance-day-list">{orderedRows.map((row) => {
      const previous = row.dailyValues[String(day)];
      const lockedNumber = expired && (previous === undefined ? sheet.entryPolicy.lockCreate : sheet.entryPolicy.lockUpdate);
      const canDelete = previous !== undefined && (!expired || !sheet.entryPolicy.lockDelete);
      return <article key={row.metricId} className={row.metricId === focusMetricId ? 'focused' : ''}>
        <div className="performance-day-identity"><strong>{row.metricName}</strong><small>{row.subjectName} · {row.metricCode}</small><span>Đang lưu: {dailyNumber(previous)} · {row.measurementUnit}</span></div>
        <div className="performance-day-edit"><label><span>Giá trị ngày {day}</span><input type="text" inputMode="decimal" disabled={saving || lockedNumber} value={values[row.metricId] ?? ''} onChange={(event) => { setValues((current) => ({ ...current, [row.metricId]: event.target.value })); setError(''); }} aria-label={`${row.metricName}, ${row.subjectName}, ngày ${day}`} placeholder="Chưa có số liệu" /></label>{canDelete && <button type="button" className="performance-day-clear" disabled={saving} onClick={() => setValues((current) => ({ ...current, [row.metricId]: '' }))} title="Xóa số liệu ngày này"><Trash2 /></button>}{lockedNumber && <LockKeyhole className="performance-day-lock" aria-label="Đã khóa nhập hoặc sửa" />}</div>
      </article>;
    })}{!rows.length && <p className="performance-day-no-rows">Không có chỉ số phù hợp với bộ lọc hiện tại.</p>}</div>
    <footer><span>{dirty ? 'Có thay đổi chưa lưu' : 'Chưa có thay đổi'}</span><button type="button" className="nova-button secondary" disabled={saving} onClick={close}>Đóng</button><button type="button" className="nova-button primary" disabled={saving || !dirty} onClick={() => void save()}><Save />{saving ? 'Đang lưu…' : 'Lưu ngày này'}</button></footer>
  </section></div>;
}
