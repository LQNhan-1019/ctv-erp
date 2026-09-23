'use client';

import { appDialog } from '@/lib/ui/app-dialog';

import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useAuth } from '@/features/auth/context/auth-context';
import { importDailyWorkbook, previewDailyImport } from '../api/performance-api';
import type { DailyImportPreview } from '../types/performance';
import GoogleSheetSourcePicker, { resolvedSheetFile } from '@/features/import-sources/components/google-sheet-source-picker';

const statusText: Record<DailyImportPreview['cells'][number]['status'], string> = {
  READY: 'Sẵn sàng', EXISTING: 'Đã có dữ liệu', LOCKED: 'Đã khóa', INVALID: 'Ô lỗi', UNCHANGED: 'Không đổi',
};

export default function PerformanceImportDialog({ month, onClose, onImported }: {
  month: string;
  onClose: () => void;
  onImported: (result: DailyImportPreview) => void;
}) {
  const { request, download } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [year, setYear] = useState(Number(month.slice(0, 4)));
  const [mode, setMode] = useState<'SKIP_EXISTING' | 'OVERWRITE'>('SKIP_EXISTING');
  const [preview, setPreview] = useState<DailyImportPreview | null>(null);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [sourceSheet, setSourceSheet] = useState('');
  const sequence = useRef(0);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const sheets = preview ? Array.from(new Set(preview.cells.map((cell) => cell.sheet))) : [];
  const activeSheet = sheets.includes(selectedSheet) ? selectedSheet : (sheets[0] ?? '');
  const sheetCells = preview?.cells.filter((cell) => cell.sheet === activeSheet) ?? [];
  const sheetErrors = sheetCells.filter((cell) => cell.status === 'INVALID');
  const visibleErrors = preview?.cells.filter((cell) => cell.status === 'INVALID') ?? [];
  const eligible = preview ? preview.readyCells + (mode === 'OVERWRITE' ? preview.existingCells : 0) : 0;

  function choose(next: File | null) {
    sequence.current += 1;
    setPreview(null); setSelectedSheet(''); setSourceSheet(''); setError(''); setFile(null);
    if (!next) return;
    if (!/\.(xlsx|xls)$/i.test(next.name) || next.size > 10 * 1024 * 1024) {
      setError('Chọn file .xlsx hoặc .xls, tối đa 10 MB.'); return;
    }
    setFile(next);
    void inspect(next, '', year);
  }

  async function template() {
    setBusy('template'); setError('');
    try {
      const blob = await download('/api/performance/data-entry/import/template?month=' + encodeURIComponent(month));
      const url = URL.createObjectURL(blob); const link = document.createElement('a');
      link.href = url; link.download = 'Mau-nhap-dashboard-' + month + '.xlsx'; link.click(); URL.revokeObjectURL(url);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không tải được mẫu'); }
    finally { setBusy(''); }
  }

  async function inspect(nextFile: File | null = file, nextSheet = sourceSheet, nextYear = year) {
    if (!nextFile) return;
    const current = ++sequence.current;
    setBusy('preview'); setError(''); setPreview(null); setSelectedSheet('');
    try {
      const result = await previewDailyImport(request, nextFile, nextYear, `${nextYear}-${month.slice(5, 7)}`, nextSheet);
      if (current !== sequence.current) return;
      setPreview(result);
      setSelectedSheet(result.cells.find((cell) => cell.status === 'INVALID')?.sheet ?? result.cells[0]?.sheet ?? '');
    } catch (cause) { if (current === sequence.current) setError(cause instanceof Error ? cause.message : 'Không xem trước được file'); }
    finally { if (current === sequence.current) setBusy(''); }
  }

  async function commit() {
    if (!file || !preview || preview.invalidCells || !eligible) return;
    if (mode === 'OVERWRITE' && preview.existingCells && !await appDialog.confirm('Ghi đè ' + preview.existingCells + ' ô số liệu đã có?')) return;
    setBusy('import'); setError('');
    try { onImported(await importDailyWorkbook(request, file, year, mode, `${year}-${month.slice(5, 7)}`, sourceSheet)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không import được file'); }
    finally { setBusy(''); }
  }

  return <div className="nova-overlay" role="presentation"><section className="nova-dialog performance-import-dialog" role="dialog" aria-modal="true" aria-labelledby="daily-import-title">
    <header><div><p>NHẬP DỮ LIỆU DASHBOARD</p><h2 id="daily-import-title">Import số liệu hằng ngày</h2><span>Tải file ở bên trái, kiểm tra sheet và lỗi chi tiết ở bên phải.</span></div><button disabled={Boolean(busy)} onClick={onClose} aria-label="Đóng"><X /></button></header>
    <div className="nova-dialog-body daily-import-layout">
      <section className="daily-import-pane daily-import-controls" aria-label="Tải file và import">
        <div className="daily-import-pane-title"><span>1</span><div><h3>Chọn dữ liệu</h3><p>File mẫu chuẩn hoặc bảng nhập liệu theo tháng.</p></div></div>
        <div className="nova-info-note"><FileSpreadsheet /><span>Chọn file hoặc Google Sheet, hệ thống tự đọc và kiểm tra. Sheet khác mẫu cũng dùng được khi chọn đúng sheet và tháng.</span></div>
        <button className="nova-button secondary" disabled={Boolean(busy)} onClick={() => void template()}><Download />Tải mẫu tháng {month}</button>
        <GoogleSheetSourcePicker request={request} feature="PERFORMANCE_DAILY" onResolved={async (workbook) => { const nextFile = resolvedSheetFile(workbook); const nextSheet = workbook.sheetName ?? ''; setFile(nextFile); setSourceSheet(nextSheet); await inspect(nextFile, nextSheet, year); }} />
        <label><span>File Excel</span><input type="file" accept=".xlsx,.xls" disabled={Boolean(busy)} onChange={(event) => choose(event.target.files?.[0] ?? null)} /></label>
        <label><span>Năm dữ liệu</span><input type="number" min={2000} max={2100} value={year} disabled={Boolean(busy)} onChange={(event) => { setYear(Number(event.target.value)); setPreview(null); setSelectedSheet(''); }} /><small>Bắt buộc khi tên sheet không chứa năm.</small></label>
        <label><span>Khi ô đã tồn tại</span><select value={mode} disabled={Boolean(busy)} onChange={(event) => setMode(event.target.value as 'SKIP_EXISTING' | 'OVERWRITE')}><option value="SKIP_EXISTING">Bỏ qua dữ liệu đã có (an toàn)</option><option value="OVERWRITE">Ghi đè, trừ ngày bị khóa</option></select></label>
        {file && <div className="daily-import-file"><FileSpreadsheet /><span>{file.name}</span></div>}
        <button className="nova-button secondary daily-import-inspect" disabled={Boolean(busy) || !file || !Number.isInteger(year) || year < 2000 || year > 2100} onClick={() => void inspect()}>{busy === 'preview' ? 'Đang đọc và kiểm tra…' : 'Kiểm tra lại dữ liệu'}</button>
        <footer><button className="nova-button secondary" disabled={Boolean(busy)} onClick={onClose}>Đóng</button><button className="nova-button primary" disabled={Boolean(busy) || !preview || preview.invalidCells > 0 || !eligible} onClick={() => void commit()}><Upload />{busy === 'import' ? 'Đang import…' : 'Import ' + eligible + ' ô'}</button></footer>
      </section>

      <section className="daily-import-pane daily-import-review" aria-label="Xem sheet và lỗi chi tiết">
        <div className="daily-import-pane-title"><span>2</span><div><h3>Kiểm tra sheet và lỗi</h3><p>Mỗi lỗi có địa chỉ ô để sửa trực tiếp trong Excel.</p></div></div>
        {error && <div className="nova-form-error daily-import-request-error" role="alert"><AlertTriangle /><span>{error}</span></div>}
        {!preview && !error && <div className="daily-import-empty"><FileSpreadsheet /><strong>Chưa có dữ liệu xem trước</strong><span>Chọn file hoặc Google Sheet để hệ thống tự đọc.</span></div>}
        {preview && <>
          <div className="daily-import-summary"><span><b>{preview.readyCells}</b> ô mới</span><span><b>{preview.existingCells}</b> đã có</span><span><b>{preview.lockedCells}</b> bị khóa</span><span><b>{preview.skippedDepartmentCells}</b> khác phòng</span><span><b>{preview.unchangedCells}</b> không đổi</span><span className={preview.invalidCells ? 'invalid' : ''}><b>{preview.invalidCells}</b> ô lỗi</span></div>
          <div className="daily-import-sheet-tabs" role="tablist" aria-label="Danh sách sheet">{sheets.map((sheet) => {
            const count = preview.cells.filter((cell) => cell.sheet === sheet && cell.status === 'INVALID').length;
            return <button key={sheet} type="button" className={sheet === activeSheet ? 'active' : ''} aria-pressed={sheet === activeSheet} onClick={() => setSelectedSheet(sheet)}>{sheet}{count > 0 && <b>{count}</b>}</button>;
          })}</div>
          <div className={'daily-import-error-panel ' + (sheetErrors.length ? 'has-errors' : 'is-valid')}>
            <header>{sheetErrors.length ? <><AlertTriangle /><div><strong>{sheetErrors.length} lỗi trong {activeSheet}</strong><span>Sửa đúng địa chỉ ô dưới đây rồi xem trước lại.</span></div></> : <><CheckCircle2 /><div><strong>Không có lỗi trong {activeSheet}</strong><span>Các ô hiển thị bên dưới đã được phân loại.</span></div></>}</header>
            {sheetErrors.length > 0 && <div className="daily-import-error-list">{sheetErrors.map((cell, index) => <article key={cell.sheet + cell.cellAddress + index}><code>{cell.sheet}!{cell.cellAddress}</code><div><strong>{cell.message}</strong><span>{cell.departmentName || 'Chưa nhận diện phòng ban'} · {cell.metricName || 'Chưa nhận diện chỉ số'} · Ngày {cell.date}</span></div></article>)}</div>}
            {preview.invalidCells > visibleErrors.length && <p>Còn {preview.invalidCells - visibleErrors.length} lỗi khác chưa hiển thị do giới hạn 300 ô xem trước.</p>}
          </div>
          <p className="daily-import-help">Có ô lỗi thì toàn bộ file chưa được nhập. Ô khóa, ô khác phòng và ô không đổi không phải lỗi.</p>
          <div className="daily-import-preview"><table><thead><tr><th>Ô Excel</th><th>Phòng ban</th><th>Chỉ số / đối tượng</th><th>Ngày</th><th>Số liệu</th><th>Kết quả</th></tr></thead><tbody>{sheetCells.map((cell, index) => <tr key={cell.sheet + cell.cellAddress + index} className={cell.status.toLowerCase()}><td><code>{cell.cellAddress}</code><small>Dòng {cell.row}</small></td><td>{cell.departmentName || '—'}</td><td><b>{cell.metricName || '—'}</b><small>{cell.subjectName}</small></td><td>{cell.date}</td><td>{cell.value === null ? '—' : cell.value.toLocaleString('vi-VN', { maximumFractionDigits: 3 })}</td><td><span className={'daily-import-status ' + cell.status.toLowerCase()}>{statusText[cell.status]}</span><small>{cell.message}</small></td></tr>)}</tbody></table></div>
        </>}
      </section>
    </div>
  </section></div>;
}
