'use client';

import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import GoogleSheetSourcePicker, { resolvedSheetFile } from '@/features/import-sources/components/google-sheet-source-picker';
import { useAuth } from '@/features/auth/context/auth-context';
import { appDialog } from '@/lib/ui/app-dialog';
import { importKpiWorkbook, previewKpiWorkbook } from '../api/performance-api';
import type { KpiWorkbookImportPreview } from '../types/performance';

function format(value: number) {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 6 }).format(value);
}

export default function KpiWorkbookImportDialog({ month, onClose, onImported }: {
  month: string;
  onClose: () => void;
  onImported: (result: KpiWorkbookImportPreview) => void;
}) {
  const { request } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [sheetName, setSheetName] = useState('');
  const [mode, setMode] = useState<'SKIP_EXISTING' | 'OVERWRITE'>('SKIP_EXISTING');
  const [preview, setPreview] = useState<KpiWorkbookImportPreview | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const sequence = useRef(0);
  const eligible = preview ? preview.readyDailyCells + (mode === 'OVERWRITE' ? preview.existingDailyCells : 0) : 0;
  const canCommit = Boolean(file && preview && preview.invalidItems === 0 && preview.totalMetrics > 0 && !busy);
  const blockedReason = !file ? 'Chưa chọn file'
    : !preview ? 'Chưa kiểm tra dữ liệu'
      : preview.invalidItems > 0 ? `Còn ${preview.invalidItems} lỗi cần sửa`
        : preview.totalMetrics === 0 ? 'Không tìm thấy chỉ tiêu để nạp'
          : '';

  async function inspect(nextFile: File, nextSheet = '') {
    const current = ++sequence.current;
    setFile(nextFile); setSheetName(nextSheet); setPreview(null); setError(''); setBusy('preview');
    try {
      const result = await previewKpiWorkbook(request, nextFile, month, nextSheet);
      if (current === sequence.current) setPreview(result);
    } catch (cause) {
      if (current === sequence.current) setError(cause instanceof Error ? cause.message : 'Không xem trước được file KPI');
    } finally {
      if (current === sequence.current) setBusy('');
    }
  }

  function choose(next: File | null) {
    sequence.current += 1; setFile(null); setPreview(null); setSheetName(''); setError('');
    if (!next) return;
    if (!/\.(xlsx|xls)$/i.test(next.name) || next.size > 199 * 1024 * 1024) {
      setError('Chọn file .xlsx hoặc .xls dưới 200 MB.'); return;
    }
    void inspect(next);
  }

  async function commit() {
    if (!file || !preview || preview.invalidItems) return;
    if (mode === 'OVERWRITE' && preview.existingDailyCells
      && !await appDialog.confirm(`Ghi đè ${preview.existingDailyCells} ô số liệu ngày đã có? MP, ĐVT, Ti và quỹ luôn được cập nhật theo file.`)) return;
    setBusy('import'); setError('');
    try { onImported(await importKpiWorkbook(request, file, month, mode, sheetName)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không import được file KPI'); }
    finally { setBusy(''); }
  }

  return <div className="nova-overlay" role="presentation"><section className="nova-dialog performance-import-dialog kpi-import-dialog" role="dialog" aria-modal="true" aria-labelledby="kpi-import-title">
    <header><div><p>IMPORT KPI VÀ MỤC TIÊU</p><h2 id="kpi-import-title">Nạp toàn bộ bảng KPI</h2><span>Đọc đồng thời số liệu ngày, MP, ĐVT, Ti, hệ số quy đổi và quỹ thưởng từ file.</span></div><button disabled={Boolean(busy)} onClick={onClose} aria-label="Đóng"><X/></button></header>
    <div className="nova-dialog-body daily-import-layout">
      <section className="daily-import-pane daily-import-controls">
        <div className="daily-import-pane-title"><span>1</span><div><h3>Chọn nguồn dữ liệu</h3><p>Dùng đúng bố cục Workbook KPI đã thống nhất.</p></div></div>
        <div className="nova-info-note"><FileSpreadsheet/><span>ĐVT và Ti không bị gắn cứng. Hệ số quy đổi được đọc từ công thức Thành tiền trong từng dòng.</span></div>
        <GoogleSheetSourcePicker request={request} feature="PERFORMANCE_DAILY" disabled={Boolean(busy)} onResolved={async (workbook) => {
          const nextFile = resolvedSheetFile(workbook); await inspect(nextFile, workbook.sheetName ?? '');
        }}/>
        <label><span>File Excel</span><input type="file" accept=".xlsx,.xls" disabled={Boolean(busy)} onChange={(event) => choose(event.target.files?.[0] ?? null)}/></label>
        <label><span>Khi số liệu ngày đã tồn tại</span><select value={mode} disabled={Boolean(busy)} onChange={(event) => setMode(event.target.value as 'SKIP_EXISTING' | 'OVERWRITE')}><option value="SKIP_EXISTING">Bỏ qua ô đã có (an toàn)</option><option value="OVERWRITE">Ghi đè ô đã có</option></select><small>MP, ĐVT, Ti và quỹ vẫn cập nhật theo file ở cả hai chế độ.</small></label>
        {file && <div className="daily-import-file"><FileSpreadsheet/><span>{file.name}{sheetName ? ` · ${sheetName}` : ''}</span></div>}
        <button className="nova-button secondary daily-import-inspect" disabled={Boolean(busy) || !file} onClick={() => file && void inspect(file, sheetName)}>{busy === 'preview' ? 'Đang đọc và kiểm tra…' : 'Kiểm tra lại dữ liệu'}</button>
      </section>
      <section className="daily-import-pane daily-import-review">
        <div className="daily-import-pane-title"><span>2</span><div><h3>Kiểm tra cấu hình và dữ liệu</h3><p>Chỉ import khi toàn bộ đơn vị và ba chỉ tiêu được nhận diện.</p></div></div>
        {error && <div className="nova-form-error daily-import-request-error"><AlertTriangle/><span>{error}</span></div>}
        {!preview && !error && <div className="daily-import-empty"><FileSpreadsheet/><strong>Chưa có dữ liệu xem trước</strong><span>Chọn Excel hoặc Google Sheet để bắt đầu.</span></div>}
        {preview && <>
          <div className="daily-import-summary"><span><b>{preview.totalUnits}</b> đơn vị</span><span><b>{preview.totalMetrics}</b> chỉ tiêu</span><span><b>{preview.readyDailyCells}</b> ô mới</span><span><b>{preview.existingDailyCells}</b> đã có</span><span><b>{preview.unchangedDailyCells}</b> không đổi</span><span className={preview.invalidItems ? 'invalid' : ''}><b>{preview.invalidItems}</b> lỗi</span></div>
          <div className={'daily-import-error-panel ' + (preview.invalidItems ? 'has-errors' : 'is-valid')}><header>{preview.invalidItems ? <><AlertTriangle/><div><strong>File còn {preview.invalidItems} lỗi</strong><span>Sửa đúng ô được báo rồi kiểm tra lại.</span></div></> : <><CheckCircle2/><div><strong>File hợp lệ</strong><span>Sẵn sàng đồng bộ KPI thưởng, mục tiêu và toàn bộ ô nhập liệu từng ngày.</span></div></>}</header>{preview.issues.length > 0 && <div className="daily-import-error-list">{preview.issues.map((issue, index) => <article key={`${issue.sheet}-${issue.cellAddress}-${index}`}><code>{issue.sheet}!{issue.cellAddress}</code><div><strong>{issue.message}</strong><span>Dòng {issue.row}</span></div></article>)}</div>}</div>
          <div className="daily-import-preview kpi-import-preview"><table><thead><tr><th>Đơn vị / chỉ tiêu</th><th>MP</th><th>ĐVT</th><th>Ti</th><th>Hệ số</th><th>Ngày có số</th><th>Kết quả</th></tr></thead><tbody>{preview.rows.map((row) => <tr key={`${row.unitCode}-${row.orderInUnit}`} className={row.status.toLowerCase()}><td><b>{row.unitName}</b><small>{row.orderInUnit}/3 · {row.metricName}</small></td><td>{format(row.monthlyTarget)}</td><td>{row.unitOfMeasure}</td><td>{format(row.ratePerUnit)}</td><td>{format(row.conversionFactor)}</td><td>{row.populatedDays}</td><td><span className={`daily-import-status ${row.status.toLowerCase()}`}>{row.status === 'READY' ? 'Sẵn sàng' : row.status === 'EXISTING' ? 'Có dữ liệu cũ' : 'Không đổi'}</span><small>{row.message}</small></td></tr>)}</tbody></table></div>
        </>}
      </section>
    </div>
    <footer className="kpi-import-footer"><div className={blockedReason ? 'blocked' : 'ready'}>{blockedReason ? <AlertTriangle/> : <CheckCircle2/>}<span>{busy === 'preview' ? 'Đang kiểm tra file…' : blockedReason || `Đã kiểm tra: ${preview?.totalUnits ?? 0} đơn vị, ${preview?.totalMetrics ?? 0} chỉ tiêu sẵn sàng nạp.`}</span></div><button className="nova-button secondary" disabled={Boolean(busy)} onClick={onClose}>Đóng</button><button className="nova-button primary" disabled={!canCommit} onClick={() => void commit()}><Upload/>{busy === 'import' ? 'Đang nạp dữ liệu…' : `Nạp dữ liệu · ${preview?.totalMetrics ?? 0} chỉ tiêu · ${eligible} ô ngày`}</button></footer>
  </section></div>;
}
