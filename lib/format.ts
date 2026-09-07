export const money = (value: number) =>
  new Intl.NumberFormat('vi-VN').format(value) + ' ₫';

export const compactMoney = (value: number) =>
  `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value / 1_000_000)} triệu`;