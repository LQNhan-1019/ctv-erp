import type { KpiDashboard, KpiMetricResult, KpiUnitResult } from '../types/performance';

type HistoryOption = { value: string; label: string; unit: KpiUnitResult; metric: KpiMetricResult };
const normalize = (value: string) => value.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi-VN');

function metricKey(unit: KpiUnitResult, metric: KpiMetricResult) {
  const name = normalize(metric.name);
  // Workbook imports regenerate codes and may reorder rows (notably vehicle km/revenue).
  // Match unique names inside the same unit; do not conflate ambiguous duplicate names.
  const duplicate = unit.metrics.filter(item => normalize(item.name) === name).length > 1;
  return JSON.stringify([unit.id, name, duplicate ? metric.code : '']);
}

export function historyOptions(snapshots: KpiDashboard[]): HistoryOption[] {
  const result = new Map<string, HistoryOption>();
  for (const snapshot of [...snapshots].sort((a, b) => a.month.localeCompare(b.month))) {
    for (const unit of snapshot.units) for (const metric of unit.metrics) {
      if (!Object.keys(metric.dailyValues).length) continue;
      const value = metricKey(unit, metric);
      result.set(value, { value, label: `${unit.name} · ${metric.name}`, unit, metric });
    }
  }
  return [...result.values()];
}

export function historyPoints(snapshots: KpiDashboard[], selected?: HistoryOption) {
  return [...snapshots].sort((a, b) => a.month.localeCompare(b.month)).map(snapshot => {
    const unit = snapshot.units.find(item => item.id === selected?.unit.id);
    const metric = unit?.metrics.find(item => metricKey(unit, item) === selected?.value);
    const divisor = selected?.metric.conversionFactor || 1;
    return {
      month: snapshot.month,
      actual: metric && Object.keys(metric.dailyValues).length ? metric.mtd / divisor : null,
      target: metric ? metric.monthlyTarget / divisor : null,
    };
  });
}
