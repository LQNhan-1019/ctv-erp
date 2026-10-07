'use client';

import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

export type TrendPoint = { label: string; revenue: number; grossProfit: number; netProfit: number; target: number | null };

const trendLabels: Record<string, string> = {
  revenue: 'Doanh thu',
  grossProfit: 'Lãi gộp',
  netProfit: 'LN sau thuế',
  target: '% hoàn thành',
};

const barColors = [
  'var(--dashboard-chart-revenue)',
  'var(--dashboard-chart-net)',
  'var(--dashboard-chart-target)',
  'var(--dashboard-chart-gross)',
  'var(--dashboard-chart-cyan)',
  'var(--dashboard-chart-rose)',
];

export function TrendChartView({ data }: { data: TrendPoint[] }) {
  const first = data[0];
  const last = data.at(-1);
  const summary = first && last
    ? `Xu hướng từ ${first.label} đến ${last.label}. Doanh thu kỳ gần nhất ${compactNumber(last.revenue)}, lãi gộp ${compactNumber(last.grossProfit)}, lợi nhuận sau thuế ${compactNumber(last.netProfit)}${last.target == null ? '' : `, hoàn thành ${last.target}% mục tiêu`}.`
    : 'Chưa có dữ liệu xu hướng.';

  return <figure className="executive-chart" tabIndex={0} aria-label={summary}>
    <figcaption className="sr-only">{summary}</figcaption>
    <ResponsiveContainer width="100%" height={310}><ComposedChart data={data} margin={{ top: 18, right: 8, bottom: 2, left: 0 }}>
      <CartesianGrid stroke="var(--dashboard-chart-grid)" strokeDasharray="4 5" vertical={false}/>
      <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--dashboard-chart-label)', fontSize: 12 }}/>
      <YAxis yAxisId="money" tickLine={false} axisLine={false} width={54} tick={{ fill: 'var(--dashboard-chart-label)', fontSize: 12 }} tickFormatter={compactNumber}/>
      <YAxis yAxisId="percent" orientation="right" domain={[0, 120]} tickLine={false} axisLine={false} width={42} tick={{ fill: 'var(--dashboard-chart-muted)', fontSize: 12 }} tickFormatter={(value) => `${value}%`}/>
      <Tooltip cursor={{ fill: 'var(--dashboard-chart-hover)' }} formatter={(value, name) => [new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(Number(value)), trendLabels[String(name)] ?? String(name)]}/>
      <Legend formatter={(value) => trendLabels[value] ?? value}/>
      <Bar yAxisId="money" dataKey="revenue" fill="var(--dashboard-chart-revenue)" radius={[5, 5, 0, 0]} maxBarSize={38}/>
      <Line yAxisId="money" type="monotone" dataKey="grossProfit" stroke="var(--dashboard-chart-gross)" strokeWidth={2.5} strokeDasharray="2 3" dot={{ r: 3, fill: 'var(--dashboard-chart-gross)', strokeWidth: 2, stroke: 'var(--dashboard-surface)' }}/>
      <Line yAxisId="money" type="monotone" dataKey="netProfit" stroke="var(--dashboard-chart-net)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--dashboard-chart-net)', strokeWidth: 2, stroke: 'var(--dashboard-surface)' }}/>
      <Line yAxisId="percent" type="monotone" dataKey="target" stroke="var(--dashboard-chart-target)" strokeWidth={2} strokeDasharray="6 5" dot={{ r: 3, fill: 'var(--dashboard-chart-target)' }}/>
    </ComposedChart></ResponsiveContainer>
  </figure>;
}

export function ComparisonBarsView({ data, unit }: { data: { name: string; value: number }[]; unit: string }) {
  const summary = data.length ? `So sánh ${data.map(item => `${item.name}: ${compactNumber(item.value)} ${unit}`).join('; ')}.` : 'Chưa có dữ liệu so sánh.';
  return <figure className="executive-chart compact" tabIndex={0} aria-label={summary}>
    <figcaption className="sr-only">{summary}</figcaption>
    <ResponsiveContainer width="100%" height={260}><BarChart data={data} margin={{ top: 16, right: 4, left: -16, bottom: 4 }}>
      <CartesianGrid stroke="var(--dashboard-chart-grid)" strokeDasharray="3 5" vertical={false}/>
      <XAxis dataKey="name" axisLine={false} tickLine={false} interval={0} tick={{ fill: 'var(--dashboard-chart-label)', fontSize: 12 }}/>
      <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--dashboard-chart-muted)', fontSize: 12 }} tickFormatter={compactNumber}/>
      <Tooltip formatter={(value) => [`${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(Number(value))} ${unit}`, 'Thực hiện']}/>
      <Bar dataKey="value" radius={[6, 6, 1, 1]} maxBarSize={48}>{data.map((item, index) => <Cell key={item.name} fill={barColors[index % barColors.length]}/>)}</Bar>
    </BarChart></ResponsiveContainer>
  </figure>;
}

function compactNumber(value: number) {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}tr`;
  if (absolute >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value);
}
