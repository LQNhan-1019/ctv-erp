'use client';

import type { ComponentType, CSSProperties } from 'react';
import Link from 'next/link';
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { ArrowDownRight, ArrowUpRight, CheckCircle2, CircleAlert, TriangleAlert } from 'lucide-react';

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
    {progress != null && <div className="executive-metric-progress"><span><i style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}/></span><b>{Math.round(progress)}%</b></div>}
  </article>;
}

export function ProgressDonut({ value, label, detail, tone = 'amber' }: { value: number | null; label: string; detail?: string; tone?: DashboardTone }) {
  const safe = Math.min(100, Math.max(0, value ?? 0));
  return <article className={`executive-donut-card tone-${tone}`}><span>{label}</span><div className="executive-donut" style={{ '--donut-value': `${safe * 3.6}deg` } as React.CSSProperties}><strong>{value == null ? '—' : `${Math.round(value)}%`}</strong></div>{detail && <small>{detail}</small>}</article>;
}

export type TrendPoint = { label: string; revenue: number; grossProfit: number; netProfit: number; target: number | null };
const trendLabels: Record<string, string> = { revenue: 'Doanh thu', grossProfit: 'Lãi gộp', netProfit: 'LN sau thuế', target: '% hoàn thành' };
export function TrendChart({ data }: { data: TrendPoint[] }) {
  return <div className="executive-chart"><ResponsiveContainer width="100%" height={310}><ComposedChart data={data} margin={{ top: 18, right: 8, bottom: 2, left: 0 }}>
    <CartesianGrid stroke="var(--dashboard-chart-grid)" strokeDasharray="4 5" vertical={false}/><XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--dashboard-chart-label)', fontSize: 12 }}/>
    <YAxis yAxisId="money" tickLine={false} axisLine={false} width={54} tick={{ fill: 'var(--dashboard-chart-label)', fontSize: 12 }} tickFormatter={compactNumber}/><YAxis yAxisId="percent" orientation="right" domain={[0, 120]} tickLine={false} axisLine={false} width={42} tick={{ fill: 'var(--dashboard-chart-muted)', fontSize: 12 }} tickFormatter={(value) => `${value}%`}/>
    <Tooltip cursor={{ fill: 'var(--dashboard-chart-hover)' }} formatter={(value, name) => [new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(Number(value)), trendLabels[String(name)] ?? String(name)]}/>
    <Legend formatter={(value) => trendLabels[value] ?? value}/><Bar yAxisId="money" dataKey="revenue" fill="var(--dashboard-chart-revenue)" radius={[5, 5, 0, 0]} maxBarSize={38}/>
    <Line yAxisId="money" type="monotone" dataKey="grossProfit" stroke="var(--dashboard-chart-gross)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--dashboard-chart-gross)', strokeWidth: 2, stroke: 'var(--dashboard-surface)' }}/>
    <Line yAxisId="money" type="monotone" dataKey="netProfit" stroke="var(--dashboard-chart-net)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--dashboard-chart-net)', strokeWidth: 2, stroke: 'var(--dashboard-surface)' }}/>
    <Line yAxisId="percent" type="monotone" dataKey="target" stroke="var(--dashboard-chart-target)" strokeWidth={2} strokeDasharray="6 5" dot={{ r: 3, fill: 'var(--dashboard-chart-target)' }}/>
  </ComposedChart></ResponsiveContainer></div>;
}

export type TableColumn<T> = { key: string; label: string; align?: 'left' | 'right' | 'center'; render: (row: T) => React.ReactNode };
export function ComparisonTable<T extends { id: string }>({ columns, rows, empty = 'Chưa có dữ liệu trong kỳ này.' }: { columns: TableColumn<T>[]; rows: T[]; empty?: string }) {
  return <div className="executive-table-wrap"><table className="executive-table"><thead><tr>{columns.map(column => <th key={column.key} className={column.align ?? 'left'}>{column.label}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.id}>{columns.map(column => <td key={column.key} className={column.align ?? 'left'}>{column.render(row)}</td>)}</tr>)}</tbody></table>{!rows.length && <div className="executive-table-empty">{empty}</div>}</div>;
}

const barColors = ['var(--dashboard-chart-revenue)', 'var(--dashboard-chart-net)', 'var(--dashboard-chart-target)', 'var(--dashboard-chart-gross)', 'var(--dashboard-chart-cyan)', 'var(--dashboard-chart-rose)'];
export function ComparisonBars({ data, unit }: { data: { name: string; value: number }[]; unit: string }) {
  return <div className="executive-chart compact"><ResponsiveContainer width="100%" height={260}><BarChart data={data} margin={{ top: 16, right: 4, left: -16, bottom: 4 }}>
    <CartesianGrid stroke="var(--dashboard-chart-grid)" strokeDasharray="3 5" vertical={false}/><XAxis dataKey="name" axisLine={false} tickLine={false} interval={0} tick={{ fill: 'var(--dashboard-chart-label)', fontSize: 12 }}/><YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--dashboard-chart-muted)', fontSize: 12 }} tickFormatter={compactNumber}/>
    <Tooltip formatter={(value) => [`${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(Number(value))} ${unit}`, 'Thực hiện']}/><Bar dataKey="value" radius={[6, 6, 1, 1]} maxBarSize={48}>{data.map((item, index) => <Cell key={item.name} fill={barColors[index % barColors.length]}/>)}</Bar>
  </BarChart></ResponsiveContainer></div>;
}

export type DashboardAlert = { id: string; severity: 'danger' | 'warning' | 'info' | 'success'; title: string; detail: string; meta?: string };
export function AlertList({ items }: { items: DashboardAlert[] }) {
  const IconFor = ({ severity }: { severity: DashboardAlert['severity'] }) => severity === 'success' ? <CheckCircle2/> : severity === 'info' ? <CircleAlert/> : <TriangleAlert/>;
  return <div className="executive-alerts">{items.map(item => <article key={item.id} className={item.severity}><i><IconFor severity={item.severity}/></i><div><b>{item.title}</b><span>{item.detail}</span>{item.meta && <small>{item.meta}</small>}</div></article>)}</div>;
}

function compactNumber(value: number) { const absolute = Math.abs(value); if (absolute >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}tr`; if (absolute >= 1_000) return `${(value / 1_000).toFixed(0)}k`; return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value); }
