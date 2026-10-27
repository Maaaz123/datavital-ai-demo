import { describe, expect, it } from 'vitest';
import { problems, scenarioFor, wardRows } from './facts';
import { findKpi } from './engine';
import { formatDelta, formatMeasure, inspectSeries, measure } from './measures';

describe('synthetic scenario', () => {
  it('reconciles every hospital and year', () => {
    for (const year of [2024, 2025, 2026]) {
      for (const hospital of ['H1', 'H2', 'H3', 'H4', 'H5', 'ALL']) {
        const packet = scenarioFor(hospital, year);
        expect(problems(packet.focus)).toEqual([]);
        for (const month of packet.months) expect(problems(month)).toEqual([]);
      }
    }
  });

  it('keeps ward rows inside capacity and sums them', () => {
    const fact = scenarioFor('H1', 2026).focus;
    const wards = wardRows(fact);
    expect(wards.reduce((sum, ward) => sum + ward.staffed, 0)).toBe(fact.staffedBeds);
    expect(wards.reduce((sum, ward) => sum + ward.occupied, 0)).toBe(fact.occupiedBeds);
    for (const ward of wards) {
      expect(ward.occupied + ward.available + ward.blocked).toBe(ward.staffed);
      expect(ward.available).toBeGreaterThanOrEqual(0);
    }
  });

  it('does not sum distinct patients across months', () => {
    const packet = scenarioFor('H1', 2026);
    const summed = packet.months.reduce((sum, month) => sum + month.activePatients, 0);
    expect(packet.focus.activePatients).toBe(packet.months[0].activePatients);
    expect(packet.focus.activePatients).toBeLessThan(summed);
  });

  it('converts the same stay between days and hours', () => {
    const days = measure(findKpi('kpi_inpatient_avg_los_days')!, 'H1', 2026, 'All');
    const hours = measure(findKpi('kpi_inpatient_avg_los_hours')!, 'H1', 2026, 'All');
    expect(hours.value).toBeCloseTo(days.value * 24, 5);
  });

  it('keeps P90 at or above the matching median', () => {
    const fact = scenarioFor('H3', 2026).focus;
    expect(fact.edWaitP90Min).toBeGreaterThanOrEqual(fact.edWaitMedianMin);
    expect(fact.edLosP90Min).toBeGreaterThanOrEqual(fact.edLosMedianMin);
    expect(fact.ipLosP90Days).toBeGreaterThanOrEqual(fact.ipLosDays);
    expect(fact.labTatP90Min).toBeGreaterThanOrEqual(fact.labTatMedianMin);
  });

  it('formats rates as percentage points and multipliers as multipliers', () => {
    const denial = measure(findKpi('kpi_claim_denied_rate')!, 'H2', 2026, 'All');
    const perPatient = measure(findKpi('kpi_patient_encounters_per_patient')!, 'H1', 2026, 'All');
    expect(formatMeasure(denial)).toMatch(/%$/);
    expect(formatDelta(denial)).toMatch(/pp$/);
    expect(formatMeasure(perPatient)).toMatch(/×$/);
    expect(formatMeasure(perPatient)).not.toMatch(/%/);
    expect(measure(findKpi('kpi_department_count')!, 'ALL', 2026, 'All').value).toBeLessThan(100);
    expect(measure(findKpi('kpi_department_count')!, 'H1', 2026, 'All').value).toBe(16);
  });

  it('rejects non-finite chart data instead of coercing it to zero', () => {
    expect(inspectSeries([])).toBe('empty');
    expect(inspectSeries([{ label: 'Jan', value: Number.NaN }])).toBe('invalid');
    expect(inspectSeries([{ label: 'Jan', value: 0 }])).toBe('zero');
    expect(inspectSeries([{ label: 'Jan', value: 3 }])).toBe('ok');
  });

  it('is deterministic for the same filters', () => {
    const first = scenarioFor('H1', 2026).focus.edArrivals;
    const second = scenarioFor('H1', 2026).focus.edArrivals;
    expect(first).toBe(second);
    expect(scenarioFor('H3', 2026).focus.edArrivals).not.toBe(first);
  });
});
