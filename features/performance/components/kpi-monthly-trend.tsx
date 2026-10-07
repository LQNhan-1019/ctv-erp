'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import ErpSelect from '@/components/ui/erp-select';
import { useAuth } from '@/features/auth/context/auth-context';
import { useApiResource } from '@/lib/api/use-api-resource';
import { getKpiDataMonths, getScopedKpiDashboard, type KpiDepartment } from '../api/performance-api';
import type { KpiDashboard } from '../types/performance';
import { historyOptions, historyPoints } from './kpi-history';

const Chart = dynamic(() => import('./kpi-monthly-trend-chart'), { ssr: false, loading: () => <div className="executive-chart-skeleton"/> });
export type MonthlyKpiPoint = { month: string; actual: number | null; target: number | null };
const number = (value: number | null) => value == null ? 'Chưa có dữ liệu' : new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value);

export default function KpiMonthlyTrend({ department, revision = 0 }: { department?: KpiDepartment; revision?: number }) {
  const { request } = useAuth();
  const [selection, setSelection] = useState('');
  const { data, error, loading, refresh } = useApiResource({
    key: `kpi-months:all:${department ?? 'executive'}:${revision}`,
    load: async () => {
      const months = await getKpiDataMonths(request, department);
      const snapshots: KpiDashboard[] = [];
      // Bound concurrency when several years of history are available.
      for (let index = 0; index < months.length; index += 4) {
        snapshots.push(...await Promise.all(months.slice(index, index + 4).map(value => getScopedKpiDashboard(request, value, department))));
      }
      return snapshots.sort((a, b) => a.month.localeCompare(b.month));
    },
  });
  // Use the latest definition for presentation, while retaining historical-only indicators.
  const options = historyOptions(data ?? []);
  const selected = options.find(option => option.value === selection) ?? options[0];
  const points: MonthlyKpiPoint[] = historyPoints(data ?? [], selected);
  return <article className="executive-widget kpi-monthly-widget">
    <header><div><span>TOÀN BỘ THÁNG CÓ DỮ LIỆU</span><h3>Kết quả thực tế và mục tiêu tháng</h3></div>
      <label><span>Chỉ tiêu theo dõi</span><ErpSelect value={selected?.value ?? ''} options={options} onChange={setSelection}/></label>
    </header>
    {loading ? <p role="status">Đang tổng hợp số liệu các tháng…</p> : error ? <p role="alert">{error} <button type="button" onClick={refresh}>Thử lại</button></p> : !options.length ? <p>Chưa có số liệu KPI theo ngày trong các tháng.</p> : <>
      <p>{points.length} tháng có dữ liệu · Đơn vị: {selected?.metric.unitOfMeasure}. Biểu đồ độc lập với bộ lọc tháng phía trên. Chỉ tiêu chưa nhập trong một tháng hiển thị “Chưa có dữ liệu”.</p>
      <Chart points={points} unit={selected?.metric.unitOfMeasure ?? ''}/>
      <details className="kpi-chart-table"><summary>Xem số liệu chi tiết từng tháng</summary><div className="executive-table-wrap"><table className="executive-table"><thead><tr><th>Tháng</th><th>Thực tế (MTD)</th><th>Mục tiêu (MP)</th></tr></thead><tbody>{points.map(point => <tr key={point.month}><td>{point.month}</td><td>{number(point.actual)}</td><td>{number(point.target)}</td></tr>)}</tbody></table></div></details>
    </>}
  </article>;
}
