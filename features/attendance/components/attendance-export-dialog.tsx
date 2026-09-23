'use client';

import { appDialog } from '@/lib/ui/app-dialog';

import { Download, Save, Trash2, TriangleAlert, Upload, X } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ApiClientError, type ApiRequestOptions } from '@/lib/api/client';
import { createExportTemplate, deleteExportTemplate, getExportTemplatePreview, listExportTemplates, updateExportTemplate } from '../api/attendance-api';
import type { EmployeeOption, ExportTemplate, WorkbookMapping, WorkbookPreview } from '../types/attendance';

type Request = <T>(path: string, options?: ApiRequestOptions) => Promise<T>;
const defaultMapping: WorkbookMapping = {
  sheetName: 'PHCNS', companyNameCell: 'A1', taxCodeCell: 'A2', departmentNameCell: '', monthCell: 'C6', yearCell: 'C7',
  employeeNumberCell: 'A11', employeeCodeCell: 'B11', employeeNameCell: 'C11', jobTitleCell: 'D11', dayOneCell: 'E11',
  actualWorkDaysCell: 'AJ11', paidLeaveDaysCell: 'AK11', holidayDaysCell: 'AL11', holidayWorkDaysCell: 'AM11',
  unpaidLeaveDaysCell: 'AN11', maternityDaysCell: 'AO11', weeklyOffWorkDaysCell: 'AP11', payrollDaysCell: 'AQ11',
};
const fields: Array<[keyof WorkbookMapping, string]> = [
  ['companyNameCell', 'Tên công ty'], ['taxCodeCell', 'Mã số thuế'], ['departmentNameCell', 'Tên phòng ban'], ['monthCell', 'Tháng'], ['yearCell', 'Năm'],
  ['employeeNumberCell', 'Dòng nhân viên / STT'], ['employeeCodeCell', 'Mã nhân viên'], ['employeeNameCell', 'Họ và tên'],
  ['jobTitleCell', 'Chức vụ'], ['dayOneCell', 'Ngày 1 (31 ngày chạy ngang)'], ['actualWorkDaysCell', 'Công thực tế'],
  ['paidLeaveDaysCell', 'Phép'], ['holidayDaysCell', 'Lễ'], ['holidayWorkDaysCell', 'Làm lễ'], ['unpaidLeaveDaysCell', 'Không lương'],
  ['maternityDaysCell', 'Thai sản'], ['weeklyOffWorkDaysCell', 'Làm ngày nghỉ'], ['payrollDaysCell', 'Tổng công tính lương'],
];
function columnName(index: number) { let value = index + 1; let text = ''; while (value > 0) { value--; text = String.fromCharCode(65 + value % 26) + text; value = Math.floor(value / 26); } return text; }
function fileBase64(file: File) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1] ?? ''); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); }); }

export default function AttendanceExportDialog({ open, month, request, employees, busy, close, execute, onExport }: { open: boolean; month: string; request: Request; employees: EmployeeOption[]; busy: string; close: () => void; execute: (label: string, action: () => Promise<unknown>) => Promise<void>; onExport: (businessUnitId: string, templateId: string) => Promise<void> }) {
  const [mode, setMode] = useState<'STANDARD' | 'PERSONAL'>('STANDARD');
  const [businessUnitId, setBusinessUnitId] = useState('');
  const [templates, setTemplates] = useState<ExportTemplate[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [preview, setPreview] = useState<WorkbookPreview | null>(null);
  const [mapping, setMapping] = useState<WorkbookMapping>(defaultMapping);
  const [activeField, setActiveField] = useState<keyof WorkbookMapping>('employeeNumberCell');
  const [loadError, setLoadError] = useState('');
  const departments = useMemo(() => Array.from(new Map(employees.map((item) => [item.businessUnitId, item.businessUnitName])).entries()), [employees]);
  const selectedTemplate = templates.find((item) => item.id === templateId);

  async function refresh() {
    try {
      const result = await listExportTemplates(request);
      setTemplates(result); setLoadError('');
      if (!templateId && result[0]) setTemplateId(result[0].id);
    } catch (cause) {
      setTemplates([]); setTemplateId('');
      setLoadError(cause instanceof ApiClientError && cause.status === 404
        ? 'Backend đang chạy phiên bản cũ, chưa có API mẫu Excel. Hãy khởi động lại Spring Boot.'
        : cause instanceof Error ? cause.message : 'Không tải được danh sách mẫu Excel.');
    }
  }
  useEffect(() => { const timer = window.setTimeout(() => { if (open && mode === 'PERSONAL') void refresh(); }, 0); return () => window.clearTimeout(timer); }, [open, mode]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const timer = window.setTimeout(() => { if (!templateId) { setPreview(null); return; } const selected = templates.find((item) => item.id === templateId); if (selected) setMapping(selected.mapping); void getExportTemplatePreview(request, templateId).then((value) => { setPreview(value); setLoadError(''); }).catch((cause) => { setPreview(null); setLoadError(cause instanceof Error ? cause.message : 'Không đọc được mẫu Excel.'); }); }, 0); return () => window.clearTimeout(timer); }, [request, templateId, templates]);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); const file = data.get('file');
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith('.xlsx')) throw new Error('Chọn file .xlsx hợp lệ.');
    const sheetName = String(data.get('sheetName') || '').trim(); const nextMapping = { ...defaultMapping, sheetName };
    let created: ExportTemplate | null = null;
    await execute('template-upload', async () => { created = await createExportTemplate(request, { name: String(data.get('name')), filename: file.name, workbookBase64: await fileBase64(file), mapping: nextMapping }); });
    await refresh(); if (created) setTemplateId((created as ExportTemplate).id);
  }

  async function saveMapping() {
    if (!selectedTemplate) return;
    await execute('template-map', () => updateExportTemplate(request, selectedTemplate.id, { name: selectedTemplate.name, mapping }));
    await refresh(); setPreview(await getExportTemplatePreview(request, selectedTemplate.id));
  }

  if (!open) return null;
  return <div className="nova-overlay"><section className="nova-dialog attendance-export-dialog">
    <header><div><p>XUẤT BẢNG CÔNG</p><h2>Tháng {month.slice(5)}/{month.slice(0, 4)}</h2><span>Chọn phòng ban và biểu mẫu Excel cần sử dụng.</span></div><button onClick={close}><X /></button></header>
    <div className="nova-dialog-body">
      {loadError && <div className="performance-error"><TriangleAlert />{loadError}</div>}
      <div className="attendance-export-options"><label><span>Phòng ban</span><select value={businessUnitId} onChange={(event) => setBusinessUnitId(event.target.value)}><option value="">Tất cả phòng ban</option>{departments.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label><label><span>Loại biểu mẫu</span><select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}><option value="STANDARD">Mẫu chuẩn của hệ thống</option><option value="PERSONAL">Mẫu Excel cá nhân</option></select></label></div>
      {mode === 'PERSONAL' && <>
        <div className="attendance-template-toolbar"><label><span>Mẫu đã lưu</span><select value={templateId} onChange={(event) => setTemplateId(event.target.value)}><option value="">Chọn mẫu</option>{templates.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{selectedTemplate && <button type="button" className="nova-button danger" onClick={async () => { if (await appDialog.confirm('Xóa mẫu Excel cá nhân này?')) void execute('template-delete', () => deleteExportTemplate(request, selectedTemplate.id)).then(async () => { setTemplateId(''); await refresh(); }); }}><Trash2 />Xóa mẫu</button>}</div>
        <details className="attendance-template-upload"><summary>Tải mẫu .xlsx mới</summary><form onSubmit={(event) => { void upload(event).catch((cause) => void appDialog.alert(cause instanceof Error ? cause.message : 'Không tải được mẫu')); }}><div className="nova-form-grid three"><label><span>Tên mẫu</span><input name="name" required /></label><label><span>Tên sheet cần điền</span><input name="sheetName" defaultValue="PHCNS" required /></label><label><span>File .xlsx (tối đa 10 MB)</span><input name="file" type="file" accept=".xlsx" required /></label></div><button className="nova-button secondary" disabled={busy === 'template-upload'}><Upload />Tải và lưu mẫu</button></form></details>
        {preview && <section className="attendance-template-editor"><header><div><h3>Ánh xạ dữ liệu trên sheet {preview.sheetName}</h3><p>Chọn một trường rồi bấm vào ô tương ứng. Với trường nhân viên, chọn ô ở dòng nhân viên đầu tiên.</p></div><button type="button" className="nova-button primary" onClick={() => void saveMapping()} disabled={busy === 'template-map'}><Save />Lưu ánh xạ</button></header><div className="attendance-mapping-fields"><label><span>Trường đang gắn</span><select value={activeField} onChange={(event) => setActiveField(event.target.value as keyof WorkbookMapping)}>{fields.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>{fields.map(([key, label]) => <button type="button" key={key} className={activeField === key ? 'active' : ''} onClick={() => setActiveField(key)}><span>{label}</span><b>{mapping[key]}</b></button>)}</div><div className="attendance-workbook-grid"><table><thead><tr><th></th>{Array.from({ length: preview.columnCount }, (_, index) => <th key={index}>{columnName(index)}</th>)}</tr></thead><tbody>{preview.cells.map((row, rowIndex) => <tr key={rowIndex}><th>{rowIndex + 1}</th>{row.map((value, columnIndex) => { const address = `${columnName(columnIndex)}${rowIndex + 1}`; const mapped = Object.entries(mapping).some(([key, cell]) => key !== 'sheetName' && cell === address); return <td key={columnIndex}><button type="button" className={mapped ? 'mapped' : ''} title={value || address} onClick={() => setMapping((current) => ({ ...current, [activeField]: address }))}>{value || ' '}</button></td>; })}</tr>)}</tbody></table></div></section>}
      </>}
    </div>
    <footer><button className="nova-button secondary" onClick={close}>Hủy</button><button className="nova-button primary" disabled={busy === 'export' || (mode === 'PERSONAL' && !templateId)} onClick={() => void onExport(businessUnitId, mode === 'PERSONAL' ? templateId : '')}><Download />Xuất file Excel</button></footer>
  </section></div>;
}
