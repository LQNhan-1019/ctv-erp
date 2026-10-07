'use client';

import { CalendarRange } from 'lucide-react';
import ErpSelect, { type ErpSelectOption } from './erp-select';

export type DashboardPeriodType = 'WEEK' | 'MONTH' | 'QUARTER';

const typeOptions: ErpSelectOption[] = [
  { value: 'WEEK', label: 'Theo tuần', description: 'Thứ Hai đến Chủ nhật' },
  { value: 'MONTH', label: 'Theo tháng', description: 'Tổng hợp từng tháng' },
  { value: 'QUARTER', label: 'Theo quý', description: '3 tháng liên tiếp' },
];

function pad(value: number) { return String(value).padStart(2, '0'); }
function isoWeek(date: Date) {
  const current = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  current.setUTCDate(current.getUTCDate() + 4 - (current.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(current.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((current.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${current.getUTCFullYear()}-W${pad(week)}`;
}
function currentValue(type: DashboardPeriodType) {
  const now = new Date();
  if (type === 'WEEK') return isoWeek(now);
  if (type === 'QUARTER') return `${now.getFullYear()}-Q${Math.floor(now.getMonth() / 3) + 1}`;
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}
function periodOptions(type: DashboardPeriodType): ErpSelectOption[] {
  const now = new Date();
  if (type === 'MONTH') return Array.from({ length: 48 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    return { value: `${date.getFullYear()}-${pad(date.getMonth() + 1)}`, label: `Tháng ${date.getMonth() + 1}/${date.getFullYear()}` };
  });
  if (type === 'QUARTER') return Array.from({ length: 16 }, (_, index) => {
    const absolute = now.getFullYear() * 4 + Math.floor(now.getMonth() / 3) - index;
    const year = Math.floor(absolute / 4); const quarter = absolute % 4 + 1;
    return { value: `${year}-Q${quarter}`, label: `Quý ${quarter}/${year}`, description: `Tháng ${(quarter - 1) * 3 + 1}–${quarter * 3}` };
  });
  return Array.from({ length: 32 }, (_, index) => {
    const date = new Date(now); date.setDate(now.getDate() - index * 7);
    const value = isoWeek(date); const week = Number(value.slice(6)); const year = value.slice(0, 4);
    return { value, label: `Tuần ${week}/${year}` };
  });
}

export function dashboardPeriodLabel(type: DashboardPeriodType, value: string) {
  if (type === 'MONTH') { const [year, month] = value.split('-'); return `Tháng ${Number(month)}/${year}`; }
  if (type === 'QUARTER') return `Quý ${value.slice(-1)}/${value.slice(0, 4)}`;
  return `Tuần ${Number(value.slice(6))}/${value.slice(0, 4)}`;
}

export default function DashboardPeriodPicker({ type, value, onChange, allowedTypes = ['WEEK', 'MONTH', 'QUARTER'] }: {
  type: DashboardPeriodType;
  value: string;
  onChange: (type: DashboardPeriodType, value: string) => void;
  allowedTypes?: DashboardPeriodType[];
}) {
  return <div className="dashboard-period-picker"><i><CalendarRange /></i><div className="dashboard-period-fields"><span>Kỳ báo cáo</span><div><ErpSelect ariaLabel="Kiểu kỳ báo cáo" value={type} options={typeOptions.filter(option => allowedTypes.includes(option.value as DashboardPeriodType))} onChange={next => { const nextType = next as DashboardPeriodType; onChange(nextType, currentValue(nextType)); }} /><ErpSelect ariaLabel="Chọn kỳ báo cáo" value={value} options={periodOptions(type)} onChange={next => onChange(type, next)} /></div></div></div>;
}
