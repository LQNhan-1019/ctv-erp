'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import Icon from '@/components/ui/icon';
import { useAuth } from '@/features/auth/context/auth-context';
import { getPerformanceDashboard } from '../api/performance-api';
import type { BusinessResult, DashboardData, DashboardMetric, MeasurementUnit } from '../types/performance';

const unitLabels: Record<MeasurementUnit, string> = {
  MILLION_VND: 'triệu đồng',
  COUNT: 'SL',
  CUBIC_METER: 'm³',
  KM: 'km',
};

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatValue(value: number, unit: MeasurementUnit) {
  const formatted = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(value);
  return `${formatted} ${unitLabels[unit]}`;
}

function ProgressRing({ value }: { value: number | null }) {
  const progress = Math.max(0, Math.min(value ?? 0, 100));
  return (
    <div className="performance-ring" style={{ '--progress': `${progress * 3.6}deg` } as CSSProperties}>
      <span>{value === null ? '—' : `${Math.round(value)}%`}</span>
    </div>
  );
}

function KpiCard({ metric }: { metric?: DashboardMetric }) {
  if (!metric) return null;
  return (
    <article className="performance-kpi-card">
      <div><span>{metric.departmentName} · {metric.subjectName}</span><h3>{metric.metricName}</h3></div>
      <div className="performance-kpi-main">
        <div>
          <strong>{formatValue(metric.actualValue, metric.measurementUnit)}</strong>
          <small>{metric.targetValue === null ? 'Chưa giao mục tiêu' : `Mục tiêu ${formatValue(metric.targetValue, metric.measurementUnit)}`}</small>
        </div>
        <ProgressRing value={metric.progressPercent} />
      </div>
      {metric.framework && <footer><b>{metric.framework}</b><span>{metric.objectiveTitle}</span></footer>}
    </article>
  );
}

function BarChart({ items }: { items: DashboardMetric[] }) {
  const maximum = Math.max(1, ...items.map((item) => item.actualValue));
  return (
    <div className="performance-bars">
      {items.map((item) => (
        <div key={item.metricCode} className="performance-bar-item">
          <div className="performance-bar-value">{new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(item.actualValue)}</div>
          <div className="performance-bar-track"><i style={{ height: `${Math.max(4, item.actualValue / maximum * 100)}%` }} /></div>
          <b>{item.subjectName}</b>
          <small>{item.progressPercent === null ? 'Chưa có mục tiêu' : `${Math.round(item.progressPercent)}% KPI`}</small>
        </div>
      ))}
    </div>
  );
}

function BusinessTrendChart({ items }: { items: BusinessResult[] }) {
  const width = 920;
  const left = 54;
  const right = 884;
  const top = 26;
  const bottom = 220;
  const maximumMoney = Math.max(1, ...items.flatMap((item) => [item.totalRevenue, item.grossProfit, item.netProfitAfterTax]));
  const x = (index: number) => items.length <= 1 ? (left + right) / 2 : left + index * (right - left) / (items.length - 1);
  const moneyY = (value: number) => bottom - value / maximumMoney * (bottom - top);
  const percentY = (value: number | null) => bottom - Math.min(Math.max(value ?? 0, 0), 120) / 120 * (bottom - top);
  const path = (values: (number | null)[], scale: (value: number | null) => number) => {
    const points = values.map((value, index) => ({ x: x(index), y: scale(value) }));
    if (!points.length) return '';
    return points.slice(1).reduce((result, point, index) => {
      const previous = points[index];
      const middle = (previous.x + point.x) / 2;
      return `${result} C ${middle} ${previous.y}, ${middle} ${point.y}, ${point.x} ${point.y}`;
    }, `M ${points[0].x} ${points[0].y}`);
  };
  const money = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

  return (
    <div className="business-trend-chart">
      <div className="business-trend-legend">
        <span className="revenue">Doanh thu</span><span className="gross">Lãi gộp</span><span className="net">LN sau thuế</span><span className="target">Hoàn thành mục tiêu</span>
      </div>
      <svg viewBox={`0 0 ${width} 270`} role="img" aria-label="Biểu đồ biến động kết quả kinh doanh theo tháng">
        {[0, 1, 2, 3, 4].map((line) => {
          const y = top + line * (bottom - top) / 4;
          return <g key={line}><line className="business-grid-line" x1={left} x2={right} y1={y} y2={y} /><text className="business-axis-label" x={left - 8} y={y + 3}>{money.format(maximumMoney * (4 - line) / 4)}</text></g>;
        })}
        <path className="business-wave revenue" d={path(items.map((item) => item.totalRevenue), (value) => moneyY(value ?? 0))} />
        <path className="business-wave gross" d={path(items.map((item) => item.grossProfit), (value) => moneyY(value ?? 0))} />
        <path className="business-wave net" d={path(items.map((item) => item.netProfitAfterTax), (value) => moneyY(value ?? 0))} />
        <path className="business-wave target" d={path(items.map((item) => item.targetCompletionPercent), percentY)} />
        {items.map((item, index) => <g key={item.month}>
          <circle className="business-point revenue" cx={x(index)} cy={moneyY(item.totalRevenue)} r="3.5"><title>{`Doanh thu ${item.month}: ${money.format(item.totalRevenue)} triệu đồng`}</title></circle>
          <circle className="business-point gross" cx={x(index)} cy={moneyY(item.grossProfit)} r="3"><title>{`Lãi gộp ${item.month}: ${money.format(item.grossProfit)} triệu đồng`}</title></circle>
          <circle className="business-point net" cx={x(index)} cy={moneyY(item.netProfitAfterTax)} r="3"><title>{`Lợi nhuận sau thuế ${item.month}: ${money.format(item.netProfitAfterTax)} triệu đồng`}</title></circle>
          <circle className="business-point target" cx={x(index)} cy={percentY(item.targetCompletionPercent)} r="3"><title>{`Hoàn thành mục tiêu ${item.month}: ${item.targetCompletionPercent === null ? 'Chưa giao' : `${item.targetCompletionPercent}%`}`}</title></circle>
          <text className="business-month-label" x={x(index)} y="248">T{Number(item.month.slice(5))}</text>
        </g>)}
        <text className="business-unit-label" x={left} y="13">Triệu đồng</text>
        <text className="business-target-axis" x={right} y="13">% mục tiêu · đường nét đứt</text>
      </svg>
    </div>
  );
}

export default function PerformanceDashboard() {
  const { request } = useAuth();
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getPerformanceDashboard(request, month)
      .then((value) => { if (active) setData(value); })
      .catch((reason: Error) => { if (active) setError(reason.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [month, request]);

  const metrics = useMemo(() => data?.metrics ?? [], [data]);
  const summary = useMemo(() => {
    const withGoals = metrics.filter((item) => item.targetValue !== null);
    const progress = withGoals.filter((item) => item.progressPercent !== null);
    return {
      total: metrics.length,
      withGoals: withGoals.length,
      departments: new Set(metrics.filter((item) => item.actualValue !== 0).map((item) => item.departmentCode)).size,
      average: progress.length ? progress.reduce((sum, item) => sum + (item.progressPercent ?? 0), 0) / progress.length : 0,
    };
  }, [metrics]);
  const find = (code: string) => metrics.find((item) => item.metricCode === code);
  const regionVolumes = metrics.filter((item) => item.scopeLevel === 'REGION' && item.measurementUnit === 'CUBIC_METER');
  const storeVolumes = metrics.filter((item) => item.scopeLevel === 'STORE' && item.measurementUnit === 'CUBIC_METER');
  const vehicles = Array.from(new Set(metrics.filter((item) => item.scopeLevel === 'VEHICLE').map((item) => item.subjectCode)));
  const businessResults = data?.businessResults ?? [];
  const selectedBusinessResult = businessResults.at(-1);

  return (
    <div className="nova-account-page performance-page">
      <header className="nova-page-header performance-header">
        <div>
          <p className="nova-eyebrow">MỤC TIÊU & THỰC HIỆN</p>
          <h1>Dashboard điều hành</h1>
          <span>Số liệu thực tế được tổng hợp từ bảng nhập hằng ngày và đối chiếu KPI / OKR / BSC / MBO.</span>
        </div>
        <label className="performance-month"><span>Kỳ báo cáo</span><input type="month" value={month} onChange={(event) => { setLoading(true); setError(''); setMonth(event.target.value); }} /></label>
      </header>

      {loading && <div className="performance-state"><span className="nova-session-spinner" />Đang tổng hợp số liệu…</div>}
      {error && <div className="performance-error"><Icon name="alert" />{error}</div>}

      {!loading && !error && <>
        <section className="performance-summary">
          <div><span>Chỉ số theo dõi</span><strong>{summary.total}</strong></div>
          <div><span>Đã giao mục tiêu</span><strong>{summary.withGoals}</strong></div>
          <div><span>Phòng ban đã nhập</span><strong>{summary.departments}/4</strong></div>
          <div><span>Tiến độ bình quân</span><strong>{Math.round(summary.average)}%</strong></div>
        </section>

        <section className="performance-panel business-result-panel">
          <header><div><span>KẾT QUẢ KINH DOANH</span><h2>Biến động theo tháng</h2></div><b>{businessResults.length} tháng</b></header>
          <div className="business-current-summary">
            <div><span>Tổng doanh thu</span><strong>{formatValue(selectedBusinessResult?.totalRevenue ?? 0, 'MILLION_VND')}</strong></div>
            <div><span>Lợi nhuận sau thuế</span><strong>{formatValue(selectedBusinessResult?.netProfitAfterTax ?? 0, 'MILLION_VND')}</strong></div>
            <div><span>Lãi gộp</span><strong>{formatValue(selectedBusinessResult?.grossProfit ?? 0, 'MILLION_VND')}</strong></div>
            <div><span>Hoàn thành mục tiêu</span><strong>{selectedBusinessResult?.targetCompletionPercent == null ? '—' : `${Math.round(selectedBusinessResult.targetCompletionPercent)}%`}</strong></div>
          </div>
          <BusinessTrendChart items={businessResults} />
          <div className="business-month-strip">
            {businessResults.map((item) => <article key={item.month}>
              <h3>Tháng {Number(item.month.slice(5))}</h3>
              <dl>
                <div><dt>Doanh thu</dt><dd>{new Intl.NumberFormat('vi-VN').format(item.totalRevenue)}</dd></div>
                <div><dt>LN sau thuế</dt><dd>{new Intl.NumberFormat('vi-VN').format(item.netProfitAfterTax)}</dd></div>
                <div><dt>Lãi gộp</dt><dd>{new Intl.NumberFormat('vi-VN').format(item.grossProfit)}</dd></div>
                <div><dt>Hoàn thành</dt><dd>{item.targetCompletionPercent === null ? '—' : `${Math.round(item.targetCompletionPercent)}%`}</dd></div>
              </dl>
            </article>)}
          </div>
        </section>

        <section className="performance-card-grid">
          <KpiCard metric={find('FIN_COMPANY_REVENUE')} />
          <KpiCard metric={find('FIN_COMPANY_GROSS_PROFIT')} />
          <KpiCard metric={find('FIN_OVERDUE_CUSTOMERS')} />
          <KpiCard metric={find('HR_COMPLETED_WORK_ITEMS')} />
          <KpiCard metric={find('ASSIST_RETAIL_TRANSACTIONS')} />
          <KpiCard metric={find('SALES_COMPANY_VOLUME')} />
        </section>

        <section className="performance-visual-grid">
          <article className="performance-panel">
            <header><div><span>SO SÁNH KHU VỰC</span><h2>Sản lượng bán hàng</h2></div><b>m³</b></header>
            <BarChart items={regionVolumes} />
          </article>
          <article className="performance-panel">
            <header><div><span>HIỆU SUẤT CỬA HÀNG</span><h2>Sản lượng các CHXD</h2></div><b>m³</b></header>
            <BarChart items={storeVolumes} />
          </article>
        </section>

        <section className="performance-panel performance-fleet">
          <header><div><span>ĐỘI XE BỒN</span><h2>Hiệu suất vận chuyển theo phương tiện</h2></div><b>{vehicles.length} phương tiện</b></header>
          <div className="performance-fleet-grid">
            {vehicles.map((vehicle) => {
              const rows = metrics.filter((item) => item.subjectCode === vehicle);
              const byUnit = (unit: MeasurementUnit) => rows.find((item) => item.measurementUnit === unit);
              return (
                <article key={vehicle}>
                  <div><span className="performance-truck"><Icon name="server" /></span><h3>{rows[0]?.subjectName}</h3></div>
                  <dl>
                    <div><dt>Số chuyến</dt><dd>{formatValue(byUnit('COUNT')?.actualValue ?? 0, 'COUNT')}</dd></div>
                    <div><dt>Quãng đường</dt><dd>{formatValue(byUnit('KM')?.actualValue ?? 0, 'KM')}</dd></div>
                    <div><dt>Doanh thu</dt><dd>{formatValue(byUnit('MILLION_VND')?.actualValue ?? 0, 'MILLION_VND')}</dd></div>
                  </dl>
                </article>
              );
            })}
          </div>
        </section>
      </>}
    </div>
  );
}
