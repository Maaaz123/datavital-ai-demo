import { describe, expect, it } from 'vitest';
import { problems, scenarioFor, wardRows } from './facts';
import { HOSPITALS, KPIS, YEARS, findKpi } from './engine';
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

  it('maps every catalog KPI onto the scenario without a hash fallback', () => {
    const missing = KPIS.filter((kpi) => {
      const item = measure(kpi, 'H1', 2026, 'All');
      return !Number.isFinite(item.value) || item.note.includes('UNMAPPED');
    }).map((kpi) => kpi.key);
    expect(missing).toEqual([]);
    expect(KPIS).toHaveLength(534);
  });

  it('matches catalog volumes to the workspace facts for every hospital and year', () => {
    const pairs: [string, (fact: ReturnType<typeof scenarioFor>['focus']) => number][] = [
      ['kpi_admission_volume', (fact) => fact.admissions],
      ['kpi_discharge_volume', (fact) => fact.discharges],
      ['kpi_encounter_volume', (fact) => fact.encounters],
      ['kpi_bed_staffed_count', (fact) => fact.staffedBeds],
      ['kpi_lab_order_volume', (fact) => fact.labOrders],
      ['kpi_claim_volume', (fact) => fact.claimsSubmitted],
      ['kpi_ed_esi1_share', (fact) => fact.acuity1 / fact.edArrivals],
    ];
    for (const hospital of HOSPITALS.map((item) => item.code)) {
      for (const year of YEARS) {
        const fact = scenarioFor(hospital, year).focus;
        for (const [key, expected] of pairs) {
          const item = measure(findKpi(key)!, hospital, year, 'All');
          expect(item.value).toBe(expected(fact));
        }
      }
    }
  });

  it('does not present a median as an average or reuse the wrong cohort', () => {
    const fact = scenarioFor('H1', 2026).focus;
    const avgDays = measure(findKpi('kpi_inpatient_avg_los_days')!, 'H1', 2026, 'All');
    const medianDays = measure(findKpi('kpi_inpatient_median_los_days')!, 'H1', 2026, 'All');
    const avgHours = measure(findKpi('kpi_inpatient_avg_los_hours')!, 'H1', 2026, 'All');
    const edAvg = measure(findKpi('kpi_ed_avg_los_hours')!, 'H1', 2026, 'All');
    const edMedian = measure(findKpi('kpi_ed_los_median_minutes')!, 'H1', 2026, 'All');
    const labAvg = measure(findKpi('kpi_lab_tat_avg_minutes')!, 'H1', 2026, 'All');
    const labMedian = measure(findKpi('kpi_lab_tat_median_minutes')!, 'H1', 2026, 'All');
    expect(avgDays.value).toBeGreaterThan(medianDays.value);
    expect(avgHours.value).toBeCloseTo(avgDays.value * 24, 8);
    expect(edAvg.value).not.toBeCloseTo(edMedian.value / 60, 2);
    expect(labAvg.value).toBeGreaterThan(labMedian.value);
    expect(measure(findKpi('kpi_ed_mortality_rate')!, 'H1', 2026, 'All').denominator).toBe(fact.edArrivals);
    expect(measure(findKpi('kpi_surg_30d_mortality_rate')!, 'H1', 2026, 'All').denominator).toBe(fact.surgCompleted);
    expect(measure(findKpi('kpi_dx_in_hospital_mortality_rate')!, 'H1', 2026, 'All').denominator).toBe(fact.discharges);
    expect(measure(findKpi('kpi_rad_no_show_rate')!, 'H1', 2026, 'All').denominator).toBe(fact.radOrders);
    expect(measure(findKpi('kpi_ed_door_to_provider_median_minutes')!, 'H1', 2026, 'All').value).toBe(fact.edWaitMedianMin);
  });

  it('keeps rates equal to their integer facts and distinguishes a zero baseline', () => {
    for (const hospital of ['H1', 'H2', 'H3', 'H4', 'H5', 'ALL']) {
      for (const year of [2024, 2025, 2026]) {
        for (const kpi of KPIS) {
          const item = measure(kpi, hospital, year, 'All');
          expect(Number.isFinite(item.value)).toBe(true);
          if (item.kind === 'count') expect(Number.isInteger(item.value)).toBe(true);
          if (item.kind === 'rate' && item.denominator > 0) {
            expect(Math.abs(item.value - item.numerator / item.denominator)).toBeLessThan(1e-9);
          }
        }
      }
    }
    const sample = measure(findKpi('kpi_admission_volume')!, 'H1', 2026, 'All');
    expect(formatDelta({ ...sample, prior: 0, value: 5 })).toBe('New versus a zero baseline');
    expect(formatDelta({ ...sample, prior: 0, value: 0 })).toBe('No change vs baseline');
    expect(formatDelta({ ...sample, prior: 10, value: 12 })).toBe('+20.0%');
  });

  it('is deterministic for the same filters', () => {
    const first = scenarioFor('H1', 2026).focus.edArrivals;
    const second = scenarioFor('H1', 2026).focus.edArrivals;
    expect(first).toBe(second);
    expect(scenarioFor('H3', 2026).focus.edArrivals).not.toBe(first);
  });
});
