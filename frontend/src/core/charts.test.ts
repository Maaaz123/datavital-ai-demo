import { describe, expect, it } from 'vitest';
import { HOSPITALS, YEARS } from '@/showcase/engine';
import { configuredScreenIds, requiredScreenIds, screenCharts } from './viz';
import { AREAS } from './stories';

describe('screen chart contracts', () => {
  it('configures a primary and secondary chart for every screen', () => {
    const required = requiredScreenIds();
    expect(required).toHaveLength(53);
    expect(configuredScreenIds().sort()).toEqual([...required].sort());
    const placed = AREAS.flatMap((area) => area.screens);
    expect(placed.sort()).toEqual([...required].sort());
  });

  it('does not put admissions or laboratory stock on the wrong screens', () => {
    const pharmacy = screenCharts('pharmacy', 'H1', 2026, 'en');
    const supply = screenCharts('supply-chain', 'H1', 2026, 'en');
    const workforce = screenCharts('workforce', 'H1', 2026, 'en');
    expect(pharmacy.flatMap((chart) => chart.subjects).join(' ')).not.toMatch(/admission/);
    expect(pharmacy.map((chart) => `${chart.title} ${chart.note}`).join(' ')).not.toMatch(/admission/i);
    expect(supply.flatMap((chart) => chart.subjects).join(' ')).not.toMatch(/laboratory|admission/);
    expect(supply.map((chart) => chart.note).join(' ')).toMatch(/not a stock balance/i);
    expect(workforce.flatMap((chart) => chart.subjects).join(' ')).not.toMatch(/bed|admission/);
  });

  it('keeps every configured chart finite for each hospital and year', () => {
    for (const id of requiredScreenIds()) {
      for (const hospital of HOSPITALS) {
        for (const year of YEARS) {
          const charts = screenCharts(id, hospital.code, year, 'en');
          expect(charts.length).toBeGreaterThanOrEqual(2);
          for (const chart of charts) {
            expect(chart.series.length).toBeGreaterThan(0);
            for (const series of chart.series) {
              expect(series.values.length).toBe(chart.categories.length);
              for (const value of series.values) expect(Number.isFinite(value)).toBe(true);
            }
          }
        }
      }
    }
  });
});
