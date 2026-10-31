/**
 * Stage 5 — Forecasting on available monthly series.
 * Seasonal naive / moving average with time-ordered backtest (MAE/WAPE).
 * Sparse data → label illustrative. No patient-specific prediction. No clinical accuracy claim.
 */
import { scenarioFor } from '@/showcase/facts';
import { buildEnterpriseView } from '../enterpriseView';

export const FORECAST_MODEL_VERSION = 'enterprise-ai-forecast-v1-seasonal-naive-ma';

export type ForecastSeriesId = 'beds.occupancy' | 'ed.wait.median_min' | 'ed.arrivals';

export type ForecastRequest = {
  hospital: string;
  year: number;
  seriesId: ForecastSeriesId;
  horizon?: number;
};

export type ForecastPoint = { label: string; actual?: number; forecast: number };

export type ForecastResult = {
  seriesId: ForecastSeriesId;
  modelVersion: string;
  method: 'seasonal_naive' | 'moving_average' | 'hybrid';
  readiness: 'Demo Available' | 'illustrative';
  points: ForecastPoint[];
  backtest: {
    mae: number | null;
    wape: number | null;
    n: number;
  };
  disclaimer: string;
};

function seriesFor(hospital: string, year: number, seriesId: ForecastSeriesId): { labels: string[]; values: number[] } {
  const scenario = scenarioFor(hospital, year);
  const labels = scenario.months.map((_, i) => `M${i + 1}`);
  if (seriesId === 'ed.arrivals') {
    return { labels, values: scenario.months.map((m) => m.edArrivals) };
  }
  if (seriesId === 'ed.wait.median_min') {
    return { labels, values: scenario.months.map((m) => m.edWaitMedianMin) };
  }
  // beds.occupancy — prefer enterprise monthly occupancy (same Beds stocks).
  const ent = buildEnterpriseView(hospital, year, 'year');
  if (ent.facts.monthlyOccupancy.length >= 6) {
    return {
      labels: ent.facts.labels.length ? ent.facts.labels : labels,
      values: ent.facts.monthlyOccupancy,
    };
  }
  return {
    labels,
    values: scenario.months.map((m) => (m.staffedBeds ? m.occupiedBeds / m.staffedBeds : 0)),
  };
}

function movingAverage(values: number[], window: number, index: number): number {
  const start = Math.max(0, index - window);
  const slice = values.slice(start, index);
  if (!slice.length) return values[0] ?? 0;
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function seasonalNaive(values: number[], index: number, season = 12): number {
  const prior = index - season;
  if (prior >= 0) return values[prior]!;
  return movingAverage(values, 3, index);
}

export function runForecast(req: ForecastRequest): ForecastResult {
  const horizon = req.horizon ?? 3;
  const { labels, values } = seriesFor(req.hospital, req.year, req.seriesId);
  const n = values.length;
  const sparse = n < 6 || values.every((v) => v === 0);
  const readiness = sparse ? 'illustrative' : 'Demo Available';

  // Time-ordered backtest on last min(4, n-3) points.
  const holdout = Math.min(4, Math.max(0, n - 3));
  const trainEnd = n - holdout;
  let absErr = 0;
  let absActual = 0;
  let count = 0;
  for (let i = trainEnd; i < n; i += 1) {
    const pred = 0.5 * seasonalNaive(values, i) + 0.5 * movingAverage(values, 3, i);
    const actual = values[i]!;
    absErr += Math.abs(pred - actual);
    absActual += Math.abs(actual);
    count += 1;
  }
  const mae = count ? absErr / count : null;
  const wape = count && absActual > 0 ? absErr / absActual : null;

  const points: ForecastPoint[] = values.map((actual, i) => ({
    label: labels[i] ?? `M${i + 1}`,
    actual,
    forecast: 0.5 * seasonalNaive(values, i) + 0.5 * movingAverage(values, 3, i),
  }));

  const last = values[n - 1] ?? 0;
  for (let h = 1; h <= horizon; h += 1) {
    const idx = n + h - 1;
    const forecast = 0.5 * seasonalNaive([...values, ...points.slice(n).map((p) => p.forecast), last], Math.min(idx, n))
      + 0.5 * movingAverage(values, 3, n);
    points.push({
      label: `F+${h}`,
      forecast: Number.isFinite(forecast) ? forecast : last,
    });
  }

  return {
    seriesId: req.seriesId,
    modelVersion: FORECAST_MODEL_VERSION,
    method: 'hybrid',
    readiness,
    points,
    backtest: { mae, wape, n: count },
    disclaimer:
      sparse
        ? 'Illustrative forecast — monthly series too sparse for operational reliance. Not patient-specific. No clinical accuracy claim.'
        : `Model ${FORECAST_MODEL_VERSION}: seasonal naive + moving average hybrid with time-ordered backtest. Aggregate operational series only — not patient-specific; not a clinical prediction.`,
  };
}
