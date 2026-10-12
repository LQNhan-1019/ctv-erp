export const exactNumber = (value: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 20 }).format(value);

export function isMoneyUnit(unit: string) {
  const normalized = unit.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
  return /(?:trieu|ty|ti\b|vnd|vnđ|dong|đong|đồng)/u.test(normalized) || normalized === 'đ';
}

export function compactMoney(value: number) {
  const scale = Math.abs(value) >= 1e9 ? 1e9 : Math.abs(value) >= 1e6 ? 1e6 : 1;
  const label = scale === 1e9 ? 'tỷ' : scale === 1e6 ? 'triệu' : 'đ';
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value / scale)} ${label}`;
}

// API MTD/MP/MTG are already base values. conversionFactor is a reward divisor,
// not a multiplier to apply a second time to stored monetary amounts.
export function metricValue(value: number, unit: string, factor = 1) {
  if (isMoneyUnit(unit)) return { compact: compactMoney(value), exact: `${exactNumber(value)} đồng` };
  const converted = value / (factor || 1);
  return { compact: `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(converted)} ${unit}`, exact: `${exactNumber(converted)} ${unit}` };
}
