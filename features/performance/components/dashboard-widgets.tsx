'use client';

import type { ComponentType, CSSProperties } from 'react';
import { useId, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowDownRight, ArrowUpRight, CheckCircle2, CircleAlert, TriangleAlert } from 'lucide-react';

export type { TrendPoint } from './dashboard-charts';

function ChartSkeleton() {
  return <div className="executive-chart-skeleton" aria-live="polite" aria-busy="true"><span className="sr-only">Đang tải biểu đồ…</span></div>;
}

export const TrendChart = dynamic(() => import('./dashboard-charts').then(module => module.TrendChartView), {
  ssr: false,
  loading: ChartSkeleton,
});

export const ComparisonBars = dynamic(() => import('./dashboard-charts').then(module => module.ComparisonBarsView), {
  ssr: false,
  loading: ChartSkeleton,
});

export type DashboardTone = 'blue' | 'green' | 'violet' | 'amber' | 'rose' | 'cyan' | 'department';

export function DashboardSection({ id, eyebrow, title, description, action, tone = 'blue', className = '', style, children }: {
  id?: string; eyebrow: string; title: string; description?: string; action?: { label: string; href: string };
  tone?: DashboardTone; className?: string; style?: CSSProperties; children: React.ReactNode;
}) {
  return <section id={id} className={`executive-section tone-${tone} ${className}`} style={style}>
    <header className="executive-section-header"><div><span>{eyebrow}</span><h2>{title}</h2>{description && <p>{description}</p>}</div>{action && <Link href={action.href}>{action.label}<ArrowUpRight size={15}/></Link>}</header>
    <div className="executive-section-body">{children}</div>
  </section>;
}

export function MetricCard({ label, value, unit, caption, progress, change, icon: Glyph, tone = 'blue' }: {
  label: string; value: string; unit?: string; caption?: string; progress?: number | null;
  change?: { value: number; label: string } | null; icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  tone?: DashboardTone;
}) {
  return <article className={`executive-metric tone-${tone}`}>
    <div className="executive-metric-heading"><span>{label}</span><i><Glyph size={19} strokeWidth={1.9}/></i></div>
    <div className="executive-metric-value"><strong>{value}</strong>{unit && <small>{unit}</small>}</div>
    {change ? <div className={`executive-change ${change.value >= 0 ? 'positive' : 'negative'}`}>{change.value >= 0 ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}<b>{Math.abs(change.value).toFixed(1)}%</b><span>{change.label}</span></div> : <p>{caption ?? 'Đang tổng hợp trong kỳ báo cáo'}</p>}
    {progress != null && <div className="kpi-card-completion">
      <div className="kpi-card-ring" role="img" aria-label={`Hoàn thành ${Math.round(progress)}% mục tiêu`}
        style={{ '--ring-angle': `${Math.min(100, Math.max(0, progress)) * 3.6}deg` } as CSSProperties}>
        <strong>{new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(progress)}%</strong>
      </div>
      <span>Hoàn thành mục tiêu{progress > 100 && <b>Vượt {new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(progress - 100)}%</b>}{progress < 0 && <b>Giá trị thực tế âm</b>}</span>
    </div>}
  </article>;
}

export function ProgressDonut({ value, label, detail, tone = 'amber' }: { value: number | null; label: string; detail?: string; tone?: DashboardTone }) {
  const safe = Math.min(100, Math.max(0, value ?? 0));
  return <article className={`executive-donut-card tone-${tone}`}><span>{label}</span><div className="executive-donut" style={{ '--donut-value': `${safe * 3.6}deg` } as React.CSSProperties}><strong>{value == null ? '—' : `${Math.round(value)}%`}</strong></div>{detail && <small>{detail}</small>}</article>;
}

export type TableColumn<T> = { key: string; label: string; align?: 'left' | 'right' | 'center'; render: (row: T) => React.ReactNode };
export function ComparisonTable<T extends { id: string }>({ columns, rows, empty = 'Chưa có dữ liệu trong kỳ này.' }: { columns: TableColumn<T>[]; rows: T[]; empty?: string }) {
  return <div className="executive-table-wrap"><table className="executive-table"><caption className="sr-only">Bảng dữ liệu so sánh chi tiết</caption><thead><tr>{columns.map(column => <th scope="col" key={column.key} className={column.align ?? 'left'}>{column.label}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.id}>{columns.map(column => <td key={column.key} className={column.align ?? 'left'}>{column.render(row)}</td>)}</tr>)}</tbody></table>{!rows.length && <div className="executive-table-empty">{empty}</div>}</div>;
}

export type DashboardAlert = { id: string; severity: 'danger' | 'warning' | 'info' | 'success'; title: string; detail: string; meta?: string };
export function AlertList({ items }: { items: DashboardAlert[] }) {
  return <div className="executive-alerts">{items.map(item => <AlertItem key={item.id} item={item}/>)}</div>;
}

function AlertItem({ item }: { item: DashboardAlert }) {
  const id = useId();
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const expanded = pinned || hovered;
  const Glyph = item.severity === 'success' ? CheckCircle2 : item.severity === 'info' ? CircleAlert : TriangleAlert;
  return <article className={`${item.severity} kpi-alert-item`}
    onPointerEnter={(event) => { if (event.pointerType === 'mouse') setHovered(true); }}
    onPointerLeave={() => setHovered(false)}
    onKeyDown={(event) => { if (event.key === 'Escape') { setPinned(false); setHovered(false); } }}>
    <button type="button" aria-expanded={expanded} aria-controls={id} onClick={() => { setHovered(false); setPinned(!pinned); }}>
      <Glyph aria-hidden="true"/><span><b>{item.title}</b><small>{item.meta ?? 'Xem thông tin cảnh báo'}</small></span><span aria-hidden="true">{expanded ? '−' : '+'}</span>
    </button>
    <div id={id} className="kpi-alert-detail" hidden={!expanded}>{item.detail}</div>
  </article>;
}
