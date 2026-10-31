/** Executive-facing number formatting for Domain 16. */

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const pct = Math.abs(value) <= 1.5 ? value * 100 : value;
  return `${pct.toFixed(digits)}%`;
}

export function formatMinutes(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value.toFixed(digits)} min`;
}

export function formatSar(value: number | null | undefined, digits = 0): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `${value < 0 ? '-' : ''}SAR ${(abs / 1_000_000).toFixed(1)} M`;
  }
  if (abs >= 1_000) {
    return `${value < 0 ? '-' : ''}SAR ${(abs / 1_000).toFixed(1)} K`;
  }
  return `SAR ${value.toFixed(digits)}`;
}

export function formatMetricValue(metricId: string, value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  if (
    metricId.includes('occupancy')
    || metricId.includes('rate')
    || metricId.includes('utilization')
    || metricId.includes('satisfaction')
    || metricId.includes('availability')
    || metricId.includes('margin_rate')
  ) {
    if (metricId.includes('satisfaction') && value > 1.5) return value.toFixed(1);
    return formatPercent(value);
  }
  if (metricId.includes('wait') || metricId.endsWith('_min') || metricId.includes('median_min')) {
    return formatMinutes(value);
  }
  if (
    metricId.includes('revenue')
    || metricId.includes('contribution')
    || metricId.includes('npr')
  ) {
    return formatSar(value);
  }
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}

export function formatForecastPoint(seriesId: string, value: number): string {
  if (seriesId === 'beds.occupancy') return formatPercent(value);
  if (seriesId === 'ed.wait.median_min') return formatMinutes(value);
  if (seriesId === 'ed.arrivals') return Math.round(value).toLocaleString('en-US');
  return value.toFixed(1);
}
