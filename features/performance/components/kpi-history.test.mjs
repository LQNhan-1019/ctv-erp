import assert from 'node:assert/strict';
import test from 'node:test';
import { historyOptions, historyPoints } from './kpi-history.ts';

const metric = (code, name, mtd, orderInUnit = 1) => ({ code, name, mtd, orderInUnit, conversionFactor: 1, monthlyTarget: 1000, dailyValues: { 1: mtd } });
const snapshot = (month, metrics, id = 'board') => ({ month, units: [{ id, code: id, name: id, metrics }] });

test('August legacy codes and September generated codes appear in one series', () => {
  const data = [snapshot('2026-08', [metric('BOARD_REVENUE', 'Doanh thu', 302)]), snapshot('2026-09', [metric('BOARD_KPI_1', 'Doanh thu', 359)])];
  const options = historyOptions(data);
  assert.equal(options.length, 1);
  assert.deepEqual(historyPoints(data, options[0]).map(point => point.actual), [302, 359]);
});

test('Reordered vehicle rows match names rather than order or generated code', () => {
  const data = [snapshot('2026-08', [metric('KM', 'Km', 200, 2), metric('REVENUE', 'Doanh thu', 50, 3)]), snapshot('2026-09', [metric('KPI_2', 'Doanh thu', 60, 2), metric('KPI_3', 'Km', 300, 3)])];
  const options = historyOptions(data);
  assert.deepEqual(historyPoints(data, options.find(item => item.metric.name === 'Km')).map(point => point.actual), [200, 300]);
  assert.deepEqual(historyPoints(data, options.find(item => item.metric.name === 'Doanh thu')).map(point => point.actual), [50, 60]);
});

test('Retains zero and negative entries and isolates units with identical names', () => {
  const data = [snapshot('2026-08', [metric('OLD', 'Doanh thu', 0)]), snapshot('2026-09', [metric('NEW', 'Doanh thu', -10)]), snapshot('2026-10', [metric('OTHER', 'Doanh thu', 900)], 'other')];
  const options = historyOptions(data);
  assert.equal(options.length, 2);
  assert.deepEqual(historyPoints(data, options[0]).map(point => point.actual), [0, -10, null]);
});
