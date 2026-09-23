export type MonthWeek = { label: string; days: number[] };

export function monthWeeks(month: string, daysInMonth: number): MonthWeek[] {
  const [year, monthNumber] = month.split('-').map(Number);
  const firstWeekday = (new Date(year, monthNumber - 1, 1).getDay() + 6) % 7;
  const weeks: MonthWeek[] = [];
  for (let first = 1 - firstWeekday; first <= daysInMonth; first += 7) {
    const days = Array.from({ length: 7 }, (_, index) => first + index)
      .filter((day) => day >= 1 && day <= daysInMonth);
    if (days.length) weeks.push({ label: `Tuần ${weeks.length + 1} · ${days[0]}–${days[days.length - 1]}/${String(monthNumber).padStart(2, '0')}`, days });
  }
  return weeks;
}

export function dailyNumber(value: number | undefined) {
  return value === undefined ? '—' : value.toLocaleString('vi-VN', { maximumFractionDigits: 3 });
}
