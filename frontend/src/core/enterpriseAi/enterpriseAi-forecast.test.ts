import { describe, expect, it } from 'vitest';
import { FORECAST_MODEL_VERSION, runForecast } from './index';

describe('Enterprise AI forecast', () => {
  it('runs backtest with MAE/WAPE and tracks model version', () => {
    const result = runForecast({ hospital: 'H1', year: 2026, seriesId: 'beds.occupancy' });
    expect(result.modelVersion).toBe(FORECAST_MODEL_VERSION);
    expect(result.points.length).toBeGreaterThan(3);
    expect(result.backtest.n).toBeGreaterThan(0);
    expect(result.backtest.mae == null || Number.isFinite(result.backtest.mae)).toBe(true);
    expect(result.backtest.wape == null || Number.isFinite(result.backtest.wape)).toBe(true);
    expect(result.disclaimer).toMatch(/not patient-specific|clinical/i);
  });

  it('labels sparse series as illustrative when appropriate', () => {
    // Occupancy series for a normal hospital should be Demo Available; method still hybrid.
    const dense = runForecast({ hospital: 'H1', year: 2026, seriesId: 'ed.arrivals' });
    expect(['Demo Available', 'illustrative']).toContain(dense.readiness);
    expect(dense.method).toBe('hybrid');
  });

  it('does not claim clinical accuracy', () => {
    const result = runForecast({ hospital: 'H2', year: 2025, seriesId: 'ed.wait.median_min' });
    expect(result.disclaimer.toLowerCase()).not.toMatch(/clinically accurate|patient-level prediction/);
    expect(result.disclaimer).toMatch(/not.*clinical|aggregate/i);
  });
});
