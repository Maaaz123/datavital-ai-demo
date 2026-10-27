import type { KPICardData } from '@/types/api';

/** Primary executive KPI keys — commercial demo hierarchy (≤5). */
export const EXECUTIVE_PRIMARY_KPI_ORDER = [
  'operational_health',
  'patient_volume',
  'ed_wait_minutes',
  'net_revenue',
  'claim_denial_rate',
] as const;

function byKey(kpis: KPICardData[], key: string): KPICardData | undefined {
  return kpis.find((k) => k.key === key);
}

/**
 * Build ≤5 executive KPIs: one dominant Operational Health + four supporting.
 * Composes patient volume from existing volume metrics — no hardcoded values.
 */
export function selectExecutivePrimaryKpis(
  kpis: KPICardData[],
  options?: { edWaitMinutes?: number | null },
): KPICardData[] {
  const explicitHealth = byKey(kpis, 'operational_health');
  const explicitVolume = byKey(kpis, 'patient_volume');
  const emergency = byKey(kpis, 'emergency_visits');
  const inpatient = byKey(kpis, 'inpatient_admissions');
  const outpatient = byKey(kpis, 'outpatient_visits');
  const occupancy = byKey(kpis, 'bed_occupancy_rate');
  const volumeParts = [emergency, inpatient, outpatient]
    .filter(Boolean)
    .map((k) => Number(k!.value) || 0);
  const composedVolume = volumeParts.reduce((a, b) => a + b, 0);
  const patientVolume: KPICardData = explicitVolume ?? {
    key: 'patient_volume',
    label: 'Patient Volume',
    value: composedVolume,
    severity: emergency?.severity ?? inpatient?.severity ?? null,
    trend: emergency?.trend ?? null,
    trend_direction: emergency?.trend_direction ?? null,
    is_improvement: emergency?.is_improvement ?? null,
    previous_value: emergency?.previous_value ?? null,
    tooltip: 'Sum of emergency visits, inpatient admissions, and outpatient visits in the selected period.',
    formula: 'emergency_visits + inpatient_admissions + outpatient_visits',
  };

  const operationalHealth: KPICardData = explicitHealth
    ? {
        ...explicitHealth,
        key: 'operational_health',
        label: explicitHealth.label || 'Operational Health',
      }
    : occupancy
      ? {
          ...occupancy,
          key: 'operational_health',
          label: 'Operational Health',
          tooltip:
            occupancy.tooltip ??
            'Bed occupancy rate for the selected period — primary capacity health signal for leadership.',
          formula: occupancy.formula ?? 'occupied_beds / available_beds',
        }
      : {
          key: 'operational_health',
          label: 'Operational Health',
          value: patientVolume.value,
          severity: patientVolume.severity,
          trend: patientVolume.trend,
          trend_direction: patientVolume.trend_direction,
          is_improvement: patientVolume.is_improvement,
          tooltip: 'Proxy operational volume when occupancy is unavailable for the selected filters.',
          formula: patientVolume.formula,
        };

  const edSummary = byKey(kpis, 'ed_avg_wait_minutes');
  const edWaitValue =
    options?.edWaitMinutes != null && Number.isFinite(options.edWaitMinutes)
      ? Math.round(options.edWaitMinutes * 10) / 10
      : edSummary && typeof edSummary.value === 'number'
        ? edSummary.value
        : null;
  const edWait: KPICardData = {
    key: 'ed_wait_minutes',
    label: 'Emergency Waiting Time',
    value: edWaitValue,
    unit: 'min',
    severity: null,
    data_status: edWaitValue == null ? 'unavailable' : 'available',
    unavailable_reason:
      edWaitValue == null
        ? 'ED wait is not present in executive trends or summary for the current filters'
        : undefined,
    tooltip: 'Latest ED wait from the executive trend series (or summary fallback). Higher is worse.',
  };

  const picked: KPICardData[] = [
    operationalHealth,
    patientVolume,
    edWait,
    byKey(kpis, 'net_revenue'),
    byKey(kpis, 'claim_denial_rate'),
  ].filter((k): k is KPICardData => Boolean(k));

  if (picked.length < 5) {
    const used = new Set(picked.map((k) => k.key));
    for (const k of kpis) {
      if (picked.length >= 5) break;
      if (!used.has(k.key) && k.key !== 'bed_occupancy_rate') {
        picked.push(k);
        used.add(k.key);
      }
    }
  }

  return picked.slice(0, 5);
}

/** Normalize a quality score for display (0–100%). */
export function formatQualityPercent(value: unknown, unit?: string | null): string | null {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  let pct = n;
  if (pct >= 0 && pct <= 1 && unit !== '%') pct = pct * 100;
  if (pct > 100) {
    return null;
  }
  return `${pct.toFixed(1)}%`;
}
