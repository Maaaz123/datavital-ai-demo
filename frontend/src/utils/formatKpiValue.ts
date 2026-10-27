import type { KPICardData } from '@/types/api';

const RENDER_LABELS: Record<string, string> = {
  NO_DATA: 'No data',
  RESTRICTED: 'Restricted',
  MODEL_NOT_ENABLED: 'Model not enabled',
  ERROR: 'Error',
  STALE: 'Stale',
  PARTIAL: 'Partial',
  VALID_ZERO: '0',
};

/** Shared KPI display formatting — never invents numeric values; never bare "—". */
export function formatKpiValue(kpi: KPICardData): string {
  const reason = (kpi.unavailable_reason || kpi.tooltip || '').trim();
  const state = (kpi.render_state || '').toUpperCase();

  if (state && state !== 'COMPLETE' && state !== 'VALID_ZERO' && state !== 'PARTIAL') {
    const label = RENDER_LABELS[state] || state.replace(/_/g, ' ');
    return reason ? `${label} — ${reason}` : label;
  }

  const isUnavailable =
    kpi.data_status === 'unavailable' ||
    state === 'NO_DATA' ||
    state === 'RESTRICTED' ||
    state === 'ERROR' ||
    kpi.value === '—' ||
    kpi.value === '' ||
    kpi.value == null;

  if (isUnavailable) {
    return reason ? `No data — ${reason}` : 'No data — source metric unavailable for this filter set';
  }

  if ((kpi.data_status === 'partial' || state === 'PARTIAL') && (kpi.value === '—' || kpi.value == null)) {
    return reason
      ? `Partial — ${reason}`
      : 'Partial — required source values are incomplete for this filter set';
  }

  if (kpi.format === 'percent' && typeof kpi.value === 'number') {
    return `${kpi.value.toFixed(1)}%`;
  }
  if (kpi.format === 'currency' && typeof kpi.value === 'number') {
    if (Math.abs(kpi.value) >= 1_000_000) return `$${(kpi.value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(kpi.value) >= 1_000) return `$${(kpi.value / 1_000).toFixed(1)}K`;
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: kpi.unit === 'SAR' ? 'SAR' : 'USD',
      maximumFractionDigits: 0,
    }).format(kpi.value);
  }
  if (typeof kpi.value === 'number') {
    const unit = kpi.unit ? ` ${kpi.unit}` : '';
    return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(kpi.value)}${unit}`;
  }
  return String(kpi.value);
}
