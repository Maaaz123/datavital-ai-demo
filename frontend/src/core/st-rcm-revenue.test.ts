import { describe, expect, it } from 'vitest';
import { buildRcmView } from './rcmView';
import {
  buildStView,
  clearStViewCache,
  stIdentityIssues,
  ST_SERVICE_LINES,
} from './strategyView';
import type { ReportPeriod } from './period';

const HOSPITALS = ['H1', 'H2', 'H3', 'H4', 'H5', 'ALL'] as const;
const YEARS = [2024, 2025, 2026] as const;
const PERIODS = ['year', 'Q1', 'Q2', 'Q3', 'Q4'] as const satisfies ReportPeriod[];

describe('P0-001 Strategy revenue lineage from RCM', () => {
  it('matches RCM NPR, preserves allocation identity, and computes contribution for H1–H5 + ALL', () => {
    clearStViewCache();
    for (const hospital of HOSPITALS) {
      for (const year of YEARS) {
        for (const period of PERIODS) {
          const st = buildStView(hospital, year, period);
          const rcm = buildRcmView(hospital, year, period);
          const label = `${hospital} ${year} ${period}`;

          expect(stIdentityIssues(st), label).toEqual([]);
          expect(st.recognizedNetRevenue, label).toBe(rcm.netPatientRevenue);
          expect(st.netRevenue, label).toBe(rcm.netPatientRevenue);
          expect(st.crossDomain.rcmNetPatientRevenue, label).toBe(rcm.netPatientRevenue);
          expect(st.allocatedServiceLineRevenue + st.unallocatedRevenue, label).toBe(st.recognizedNetRevenue);
          expect(st.allocatedServiceLineRevenue, label).toBe(
            st.serviceLineRows.reduce((total, row) => total + row.revenue, 0),
          );
          expect(st.serviceLineRows).toHaveLength(ST_SERVICE_LINES.length);

          if (st.recognizedNetRevenue > 0) {
            expect(st.operatingContribution, label).toBe(st.recognizedNetRevenue - st.eligibleDirectCost);
            expect(st.contributionMarginRate, label).toBeCloseTo(
              st.operatingContribution / st.recognizedNetRevenue,
              10,
            );
          } else {
            expect(st.operatingContribution, label).toBe(0);
            expect(st.contributionMarginRate, label).toBe(0);
          }

          expect(st.monthlyRevenue.reduce((total, value) => total + value, 0), label).toBe(st.recognizedNetRevenue);
          expect(st.methodology.contribution, label).toMatch(/RCM/i);
        }
      }
    }
  });

  it('does not invent contribution when recognized revenue is zero', () => {
    clearStViewCache();
    const st = buildStView('H1', 2026, 'year');
    // Structural guarantee: CM formula treats zero revenue as zero contribution (never invents profit).
    expect(st.identities.cmFormula).toBe(true);
    expect(st.identities.zeroRevenueSafe).toBe(true);
    expect(st.identities.revenueMatchesRcm).toBe(true);
    if (st.recognizedNetRevenue === 0) {
      expect(st.operatingContribution).toBe(0);
    }
  });

  it('keeps Command CM Rate distinct from Operating Contribution SAR', () => {
    const st = buildStView('H1', 2026, 'year');
    expect(st.kpiValues.kpi_st_operating_contribution).toBe(st.operatingContribution);
    expect(st.kpiValues.kpi_st_service_line_cm).toBe(st.contributionMarginRate);
    expect(st.kpiValues.kpi_st_service_line_cm).not.toBe(st.operatingContribution);
  });
});
