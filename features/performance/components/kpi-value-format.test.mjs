import assert from 'node:assert/strict';
import test from 'node:test';
import { metricValue, compactMoney, exactNumber } from './kpi-value-format.ts';

test('10 triệu displays base money without multiplying twice', () => {
  assert.deepEqual(metricValue(673000000, '10 triệu', 10000000), { compact: '673 triệu', exact: '673.000.000 đồng' });
});
test('negative, zero and fractional exact values are preserved', () => {
  assert.equal(metricValue(-673123456.25, '10 Triệu', 10000000).exact, '-673.123.456,25 đồng');
  assert.equal(compactMoney(0), '0 đ');
  assert.equal(compactMoney(2200000000), '2,2 tỷ');
  assert.equal(exactNumber(12.345678), '12,345678');
});
test('non-money measurement remains unchanged', () => {
  assert.deepEqual(metricValue(1250.125, 'm³'), { compact: '1.250,13 m³', exact: '1.250,125 m³' });
});
