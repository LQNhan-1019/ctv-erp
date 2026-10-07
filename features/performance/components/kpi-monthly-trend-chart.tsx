'use client';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { MonthlyKpiPoint } from './kpi-monthly-trend';

export default function KpiMonthlyTrendChart({ points, unit }: { points: MonthlyKpiPoint[]; unit: string }) {
  return <div className="kpi-monthly-chart" role="img" aria-label={`Biểu đồ cột thực tế và đường mục tiêu của ${points.length} tháng có dữ liệu, đơn vị ${unit}. Số liệu chi tiết nằm dưới biểu đồ.`}>
    <div style={{ minWidth: Math.max(320, points.length * 85) }}>
    <ResponsiveContainer width="100%" height={340}><ComposedChart data={points} margin={{ top: 20, right: 16, bottom: 8, left: 12 }}>
      <CartesianGrid stroke="var(--dashboard-chart-grid)" strokeDasharray="4 5" vertical={false}/>
      <XAxis dataKey="month" tick={{ fill: 'var(--color-ink)', fontSize: 13 }} tickFormatter={value => `${value.slice(5)}/${value.slice(0, 4)}`}/>
      <YAxis width={65} tick={{ fill: 'var(--color-ink)', fontSize: 13 }} tickFormatter={value => new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(value)}/>
      <Tooltip contentStyle={{ background: 'var(--color-surface)', color: 'var(--color-ink)', borderColor: 'var(--color-border)' }} formatter={value => `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(Number(value))} ${unit}`}/>
      <Legend/>
      <Bar name="Thực tế (MTD)" dataKey="actual" fill="var(--dashboard-chart-revenue)" maxBarSize={56} radius={[6, 6, 0, 0]} isAnimationActive={false}/>
      <Line name="Mục tiêu (MP)" dataKey="target" stroke="var(--dashboard-chart-target)" strokeWidth={3} strokeDasharray="6 4" connectNulls={false} isAnimationActive={false}/>
    </ComposedChart></ResponsiveContainer>
    </div>
  </div>;
}
