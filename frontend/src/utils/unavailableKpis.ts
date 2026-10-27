import type { KPICardData } from '@/types/api';

function unavailable(key: string, label: string, reason: string): KPICardData {
  return {
    key,
    label,
    value: null,
    data_status: 'unavailable',
    unavailable_reason: reason,
    severity: 'inactive',
  };
}

/** Error-state placeholders — never invent numeric KPI values. */
export const DEFAULT_UNAVAILABLE_KPIS: KPICardData[] = [
  unavailable(
    'metric_unavailable',
    'Metric unavailable',
    'Summary API failed or returned no governed KPI cards for the current filters',
  ),
];

export const EXECUTIVE_UNAVAILABLE_KPIS: KPICardData[] = [
  unavailable(
    'operational_health',
    'Operational Health',
    'Executive summary API failed or returned no occupancy/volume metrics for the current filters',
  ),
];

export const EMERGENCY_UNAVAILABLE_KPIS: KPICardData[] = [
  unavailable(
    'ed_visits',
    'ED visits',
    'Emergency summary API failed or returned no ED volume for the current filters',
  ),
];
