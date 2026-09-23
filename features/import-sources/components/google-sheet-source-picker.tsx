'use client';

import { ExternalLink, FileSpreadsheet, RefreshCw, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { AuthorizedRequest } from '@/types/api';
import { listAvailableGoogleSheets, resolveGoogleSheet } from '../api/google-sheet-sources-api';
import type { GoogleSheetFeature, GoogleSheetSource, ResolvedGoogleSheet } from '../types/google-sheet-source';

export const resolvedSheetFile = (workbook: ResolvedGoogleSheet) => {
  const binary = window.atob(workbook.workbookBase64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new File([bytes], workbook.filename, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

export default function GoogleSheetSourcePicker({ request, feature, disabled, onResolved }: {
  request: AuthorizedRequest;
  feature: GoogleSheetFeature;
  disabled?: boolean;
  onResolved: (workbook: ResolvedGoogleSheet) => void | Promise<void>;
}) {
  const [sources, setSources] = useState<GoogleSheetSource[]>([]);
  const [sourceId, setSourceId] = useState('');
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState('');
  const [workbook, setWorkbook] = useState<ResolvedGoogleSheet | null>(null);
  const [activeSheet, setActiveSheet] = useState('');
  const [showGrid, setShowGrid] = useState(false);
  const selectedSource = sources.find((source) => source.id === sourceId);
  const sheet = workbook?.sheets.find((item) => item.name === activeSheet);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const rows = await listAvailableGoogleSheets(request, feature);
      setSources(rows);
      setSourceId((current) => rows.some((row) => row.id === current) ? current : (rows[0]?.id ?? ''));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không tải được nguồn Google Sheet'); }
    finally { setLoading(false); }
  }, [feature, request]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function resolve() {
    if (!sourceId) return;
    setResolving(true); setError('');
    try {
      const result = await resolveGoogleSheet(request, sourceId, feature);
      const name = result.sheets.some((item) => item.name === result.sheetName) ? result.sheetName! : (result.sheets[0]?.name ?? '');
      setWorkbook(result);
      setActiveSheet(name);
      setShowGrid(true);
      await onResolved(feature === 'PERFORMANCE_DAILY' ? { ...result, sheetName: name || null } : result);
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không đọc được Google Sheet'); }
    finally { setResolving(false); }
  }

  async function selectSheet(name: string) {
    if (!workbook) return;
    setActiveSheet(name); setError('');
    try { if (feature === 'PERFORMANCE_DAILY') await onResolved({ ...workbook, sheetName: name }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không kiểm tra được sheet'); }
  }

  return <section className="google-sheet-picker">
    <header><FileSpreadsheet /><div><b>Lấy từ Google Sheets</b><small>Nguồn đã được admin duyệt; dữ liệu vẫn qua cùng bước xem trước như Excel.</small></div></header>
    <div><select value={sourceId} disabled={disabled || loading || resolving} onChange={(event) => { setSourceId(event.target.value); setWorkbook(null); setShowGrid(false); }}><option value="">{loading ? 'Đang tải nguồn…' : 'Chọn Google Sheet'}</option>{sources.map((source) => <option key={source.id} value={source.id}>{source.name}{source.sheetName ? ` · ${source.sheetName}` : ''}</option>)}</select><button type="button" className="nova-button secondary" disabled={disabled || resolving || !sourceId} onClick={() => void resolve()}><RefreshCw className={resolving ? 'spin' : ''} />{resolving ? 'Đang lấy…' : 'Đọc file'}</button></div>
    {workbook && <button type="button" className="google-sheet-preview-link" onClick={() => setShowGrid(true)}>Xem file: {workbook.sheets.length} sheet · đang chọn {activeSheet}</button>}
    {!loading && !sources.length && <small>Chưa có nguồn cho chức năng này. Admin cấu hình tại Kết nối hệ thống → Nguồn Google Sheets.</small>}
    {error && <p>{error}</p>}
    {showGrid && workbook && <div className="nova-overlay google-sheet-grid-overlay" role="presentation"><section className="nova-dialog google-sheet-grid-dialog" role="dialog" aria-modal="true" aria-label="Xem Google Sheet">
      <header><div><p>GOOGLE SHEETS</p><h2>{selectedSource?.name ?? workbook.filename}</h2><span>Xem trực tiếp dữ liệu đã đọc{feature === 'PERFORMANCE_DAILY' ? ' và chọn sheet để nhập số liệu.' : '.'}</span></div><button type="button" onClick={() => setShowGrid(false)} aria-label="Đóng xem file"><X /></button></header>
      <div className="google-sheet-grid-toolbar"><span>{sheet ? `${sheet.rowCount} dòng · ${sheet.columnCount} cột` : 'Không có sheet'}</span>{selectedSource && <a href={selectedSource.spreadsheetUrl} target="_blank" rel="noopener noreferrer"><ExternalLink /> Mở trên Google Sheets</a>}</div>
      <div className="google-sheet-grid-scroll"><table><thead><tr><th aria-label="Số dòng" />{Array.from({ length: Math.max(sheet?.columnCount ?? 0, 1) }, (_, index) => <th key={index}>{index < 26 ? String.fromCharCode(65 + index) : 'A' + String.fromCharCode(65 + index - 26)}</th>)}</tr></thead><tbody>{sheet?.rows.map((row) => <tr key={row.number}><th>{row.number}</th>{Array.from({ length: Math.max(sheet.columnCount, 1) }, (_, index) => <td key={index} title={row.cells[index] ?? ''}>{row.cells[index] ?? ''}</td>)}</tr>)}</tbody></table>{!sheet?.rows.length && <p>Sheet này chưa có dòng dữ liệu.</p>}</div>
      <footer><div className="google-sheet-grid-tabs" role="tablist" aria-label="Các sheet">{workbook.sheets.map((item) => <button key={item.name} type="button" className={item.name === activeSheet ? 'active' : ''} onClick={() => void selectSheet(item.name)}>{item.name}</button>)}</div><button type="button" className="nova-button primary" onClick={() => setShowGrid(false)}>{feature === 'PERFORMANCE_DAILY' ? 'Dùng sheet này' : 'Đóng xem trước'}</button></footer>
      <small className="google-sheet-grid-note">Hiển thị tối đa 40 dòng × 40 cột mỗi sheet. Bản xem này chưa ghi dữ liệu vào hệ thống.</small>
    </section></div>}
  </section>;
}
