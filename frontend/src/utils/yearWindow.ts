import dayjs from 'dayjs';

/** Client-side year window matching Metric Serving Layer rules (Asia/Riyadh default). */
export function resolveClientYearWindow(year: number, today = dayjs()): {
  date_from: string;
  date_to: string;
  label: string;
  is_current_year: boolean;
} {
  const start = dayjs(`${year}-01-01`);
  const isCurrent = year === today.year();
  if (isCurrent) {
    return {
      date_from: start.format('YYYY-MM-DD'),
      date_to: today.format('YYYY-MM-DD'),
      label: `${year} YTD`,
      is_current_year: true,
    };
  }
  return {
    date_from: start.format('YYYY-MM-DD'),
    date_to: dayjs(`${year}-12-31`).format('YYYY-MM-DD'),
    label: String(year),
    is_current_year: false,
  };
}

export function defaultCalendarYear(today = dayjs()): number {
  return today.year();
}
