import { describe, expect, it } from 'vitest';
import {
  buildScView,
  clearScViewCache,
  daysOfSupplyFrom,
  scIdentityIssues,
} from './supplyChainView';
import type { ReportPeriod } from './period';

const HOSPITALS = ['H1', 'H2', 'H3', 'H4', 'H5', 'ALL'] as const;
const YEARS = [2024, 2025, 2026] as const;
const PERIODS = ['year', 'Q1', 'Q2', 'Q3', 'Q4'] as const satisfies ReportPeriod[];

describe('P1-001 / P1-002 Supply Chain rate bounds and Days of Supply', () => {
  it('keeps availability and OTD in [0,1] and monthly percent series in [0,100]', () => {
    clearScViewCache();
    for (const hospital of HOSPITALS) {
      for (const year of YEARS) {
        for (const period of PERIODS) {
          const view = buildScView(hospital, year, period);
          const label = `${hospital} ${year} ${period}`;
          expect(scIdentityIssues(view), label).toEqual([]);
          expect(view.supplyAvailability, label).toBeGreaterThanOrEqual(0);
          expect(view.supplyAvailability, label).toBeLessThanOrEqual(1);
          expect(view.supplierOtd, label).toBeGreaterThanOrEqual(0);
          expect(view.supplierOtd, label).toBeLessThanOrEqual(1);
          expect(view.identities.receivedGteOnTime, label).toBe(true);
          expect(view.receiptsReceived, label).toBeGreaterThanOrEqual(0);
          for (const value of view.monthlyAvailability) {
            expect(value, `${label} monthlyAvailability`).toBeGreaterThanOrEqual(0);
            expect(value, `${label} monthlyAvailability`).toBeLessThanOrEqual(100);
          }
          for (const value of view.monthlyOtd) {
            expect(value, `${label} monthlyOtd`).toBeGreaterThanOrEqual(0);
            expect(value, `${label} monthlyOtd`).toBeLessThanOrEqual(100);
          }
        }
      }
    }
  });

  it('computes Days of Supply in units and returns null for zero demand', () => {
    expect(daysOfSupplyFrom(1_000, 0)).toBeNull();
    expect(daysOfSupplyFrom(1_000, 10)).toBe(100);
    expect(daysOfSupplyFrom(5650, 10)).toBe(565);

    const view = buildScView('H1', 2026, 'year');
    expect(view.daysOfSupplyUnit).toBe('units');
    expect(view.daysOfSupply).not.toBeNull();
    expect(view.daysOfSupply).toBe(daysOfSupplyFrom(view.availableUnits, view.dailyForecastDemand));
    expect(view.methodology.dos).toMatch(/units/i);
    expect(view.methodology.dos).toMatch(/No demand|undefined|Zero demand/i);
    // Elevated year-grain DOS is intentional excess inventory vs average daily forecast — not SAR/value cover.
    expect(view.daysOfSupply!).toBeGreaterThan(0);
  });

  it('excludes quarantine from usable available and keeps roll-forward exact', () => {
    const view = buildScView('H1', 2026, 'year');
    expect(view.quarantineOutflowUnits).toBeGreaterThanOrEqual(0);
    expect(view.rollForwardDelta).toBe(0);
    expect(
      view.openingAvailable + view.receiptsReceived + view.returnedUnits
      - view.clinicalConsumption - view.expiredUnits - view.damagedUnits
      - view.obsoleteUnits - view.recalledUnits - view.quarantineOutflowUnits,
    ).toBe(view.availableUnits);
    expect(view.transferUnits).toBe(0);
    expect(view.identities.noInternalTransferInflation).toBe(true);
  });
});
