import { describe, expect, it } from 'vitest';
import { buildIcuView } from './icuView';
import { buildEnterpriseView } from './enterpriseView';
import { buildStView, clearStViewCache, stIdentityIssues } from './strategyView';
import type { ReportPeriod } from './period';

describe('P1-005 ICU vs Strategy staffing scopes', () => {
  it('exposes ICU gap matching ICU view and a distinct enterprise gap', () => {
    clearStViewCache();
    for (const hospital of ['H1', 'H3', 'ALL'] as const) {
      for (const period of ['year', 'Q1'] as ReportPeriod[]) {
        const st = buildStView(hospital, 2026, period);
        const icu = buildIcuView(hospital, 2026, period);
        const label = `${hospital} ${period}`;

        expect(stIdentityIssues(st), label).toEqual([]);
        expect(st.icuStaffingGapHours, label).toBe(icu.staffingGapHours);
        expect(st.icuRequiredHours, label).toBe(icu.requiredNurseHours);
        expect(st.icuAvailableHours, label).toBe(icu.staffedNurseHours);
        expect(st.crossDomain.icuStaffingGapHours, label).toBe(icu.staffingGapHours);

        expect(st.enterpriseStaffingGapHours, label).toBe(
          Math.max(0, st.enterpriseRequiredHours - st.enterpriseAvailableHours),
        );
        expect(st.staffingCapacityGap, label).toBe(st.enterpriseStaffingGapHours);
        expect(st.redeployableHours, label).toBe(
          Math.max(0, st.enterpriseAvailableHours - st.enterpriseRequiredHours),
        );

        // Scopes differ: ICU credentialed nurse hours ≠ enterprise-wide demand vs staffed available.
        expect(st.methodology.workforce, label).toMatch(/enterprise/i);
        expect(st.methodology.workforce, label).toMatch(/ICU/i);
        expect(st.methodology.workforce, label).toMatch(/not automatically ICU|≠ automatic ICU|not automatic ICU/i);
        expect(st.identities.enterpriseSurplusNotAutoIcuFill).toBe(true);
      }
    }
  });

  it('can show a non-zero enterprise gap under pressure while ICU gap remains ICU-owned', () => {
    clearStViewCache();
    const st = buildStView('H3', 2026, 'year');
    const icu = buildIcuView('H3', 2026, 'year');
    expect(icu.staffingGapHours).toBeGreaterThan(0);
    expect(st.icuStaffingGapHours).toBe(icu.staffingGapHours);
    // High-pressure H3 should allow enterprise demand to exceed staffed available.
    expect(st.enterpriseStaffingGapHours).toBeGreaterThan(0);
    expect(st.enterpriseStaffingGapHours).not.toBe(st.icuStaffingGapHours);
  });

  it('documents both scopes on the enterprise staffing exception', () => {
    const enterprise = buildEnterpriseView('H3', 2026, 'year');
    const staffEx = enterprise.opsExceptions.find((item) => item.id === 'ops-staff');
    expect(staffEx).toBeTruthy();
    expect(staffEx!.evidence).toMatch(/ICU credentialed nurse gap/i);
    expect(staffEx!.evidence).toMatch(/enterprise-wide Strategy gap/i);
    expect(staffEx!.evidence).toMatch(/not automatic ICU fill/i);
    expect(enterprise.facts.enterpriseStaffingGapHours).toBe(
      enterprise.facts.staffingCapacityGap,
    );
    expect(enterprise.facts.icuStaffingGapHours).toBeGreaterThan(0);
  });
});
