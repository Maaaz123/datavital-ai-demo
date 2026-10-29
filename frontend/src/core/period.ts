import { createContext, useContext } from 'react';
import { scenarioFor, type MonthFact } from '@/showcase/facts';

export type ReportPeriod = 'year' | 'Q1' | 'Q2' | 'Q3' | 'Q4';

export const PERIODS: { id: ReportPeriod; label: string }[] = [
  { id: 'year', label: 'Full year' },
  { id: 'Q1', label: 'Q1' },
  { id: 'Q2', label: 'Q2' },
  { id: 'Q3', label: 'Q3' },
  { id: 'Q4', label: 'Q4' },
];

const RANGE: Record<Exclude<ReportPeriod, 'year'>, [number, number]> = {
  Q1: [0, 3],
  Q2: [3, 6],
  Q3: [6, 9],
  Q4: [9, 12],
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function periodMonths(hospital: string, year: number, period: ReportPeriod): { label: string; month: MonthFact }[] {
  const months = scenarioFor(hospital, year).months;
  const span = period === 'year' ? [0, 12] as [number, number] : RANGE[period];
  return months.slice(span[0], span[1]).map((month, index) => ({ label: MONTHS[span[0] + index], month }));
}

export function sumKey(rows: { month: MonthFact }[], key: keyof MonthFact): number {
  return rows.reduce((sum, row) => sum + Number(row.month[key] || 0), 0);
}

export function weighted(rows: { month: MonthFact }[], field: keyof MonthFact, weight: keyof MonthFact = 'edArrivals'): number {
  const den = sumKey(rows, weight);
  if (!den) return 0;
  return rows.reduce((sum, row) => sum + Number(row.month[field]) * Number(row.month[weight]), 0) / den;
}

type PeriodApi = { period: ReportPeriod; setPeriod: (period: ReportPeriod) => void };
export const PeriodContext = createContext<PeriodApi>({ period: 'year', setPeriod: () => undefined });
export function usePeriod(): PeriodApi {
  return useContext(PeriodContext);
}
