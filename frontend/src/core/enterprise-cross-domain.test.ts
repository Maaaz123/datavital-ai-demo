/**
 * Phase 7 — Enterprise cross-domain reconciliation (15 mandatory pairs).
 * Same metric, same grain, same scope → same number. Different scopes explained.
 */
import { describe, expect, it } from 'vitest';
import { buildEnterpriseView } from './enterpriseView';
import { buildRcmView } from './rcmView';
import { buildStView, clearStViewCache } from './strategyView';
import { buildScView, clearScViewCache } from './supplyChainView';
import { buildQsView, clearQsViewCache } from './qualitySafetyView';
import { buildIcuView } from './icuView';
import { buildSurgeryView } from './surgeryView';
import { buildRadiologyView } from './radiologyView';
import { buildLaboratoryView } from './laboratoryView';
import { buildPxView } from './patientExperienceView';
import type { ReportPeriod } from './period';

const SITES = ['H1', 'H2', 'H3', 'H4', 'H5', 'ALL'] as const;
const YEARS = [2024, 2025, 2026] as const;
const FULL_YEAR = 'year' as const;
const SAMPLE_QUARTERS: ReportPeriod[] = ['Q1', 'Q2'];

function clearCaches() {
  clearStViewCache();
  clearScViewCache();
  clearQsViewCache();
}

describe('Enterprise cross-domain reconciliation (15 mandatory pairs)', () => {
  it('H1–H5+ALL × 2024–2026 × full year: pairs 1–15 parity / documented scope', () => {
    clearCaches();
    for (const hospital of SITES) {
      for (const year of YEARS) {
        const period = FULL_YEAR;
        const tag = `${hospital}|${year}|${period}`;
        const ent = buildEnterpriseView(hospital, year, period);
        const rcm = buildRcmView(hospital, year, period);
        const st = buildStView(hospital, year, period);
        const sc = buildScView(hospital, year, period);
        const qs = buildQsView(hospital, year, period);
        const icu = buildIcuView(hospital, year, period);
        const surg = buildSurgeryView(hospital, year, period);
        const rad = buildRadiologyView(hospital, year, period);
        const lab = buildLaboratoryView(hospital, year, period);
        const px = buildPxView(hospital, year, period);

        // 1. RCM revenue ↔ Strategy revenue
        expect(st.recognizedNetRevenue, `1 ${tag}`).toBe(rcm.netPatientRevenue);
        expect(ent.facts.netPatientRevenue, `1e ${tag}`).toBe(rcm.netPatientRevenue);
        expect(ent.facts.recognizedNetRevenue, `1e2 ${tag}`).toBe(st.recognizedNetRevenue);

        // 2. Strategy direct costs ↔ Supply Chain eligible consumption (linked, not double-counted)
        // SC clinicalConsumption is units; ST consumables are synthetic SAR — different units/scopes.
        expect(st.crossDomain.scClinicalConsumption, `2 ${tag}`).toBe(sc.clinicalConsumption);
        expect(st.methodology.cost, `2doc ${tag}`).toMatch(/not a second sum|synthetic cost/i);

        // 3. ICU staffing ↔ Enterprise staffing (scopes differ; both exposed)
        expect(st.icuStaffingGapHours, `3a ${tag}`).toBe(icu.staffingGapHours);
        expect(ent.facts.icuStaffingGapHours, `3b ${tag}`).toBe(icu.staffingGapHours);
        expect(ent.facts.enterpriseStaffingGapHours, `3c ${tag}`).toBe(st.enterpriseStaffingGapHours);
        // Different scopes may diverge — never force equality
        if (st.enterpriseStaffingGapHours !== icu.staffingGapHours) {
          expect(st.methodology.workforce, `3doc ${tag}`).toMatch(/≠ ICU|distinct from ICU|enterprise/i);
        }

        // 4. Beds occupancy ↔ Command / Enterprise
        expect(ent.facts.occupancy, `4 ${tag}`).toBeGreaterThan(0);
        expect(ent.facts.occupancy, `4b ${tag}`).toBeLessThanOrEqual(1);

        // 5. ED flow ↔ Command / Enterprise
        expect(Number.isFinite(ent.facts.edWaitMedianMin), `5 ${tag}`).toBe(true);
        expect(ent.facts.edArrivals, `5b ${tag}`).toBeGreaterThanOrEqual(0);

        // 6. Theatre utilization ↔ Strategy capacity input
        expect(st.crossDomain.orUtilization, `6 ${tag}`).toBe(surg.orUtilization);
        expect(ent.facts.orUtilization, `6e ${tag}`).toBe(surg.orUtilization);

        // 7. Radiology demand ↔ Diagnostic equipment (enterprise reads rad backlog/TAT)
        expect(ent.facts.radBacklog, `7 ${tag}`).toBe(rad.closingBacklog);
        expect(ent.facts.radTat, `7b ${tag}`).toBe(rad.medianReportTatHours);

        // 8. Laboratory demand ↔ Diagnostic capacity
        expect(ent.facts.labPending, `8 ${tag}`).toBe(lab.pendingValidation);
        expect(ent.facts.labTat, `8b ${tag}`).toBe(lab.medianLabTatHours);

        // 9. Patient Experience ↔ eligible service activity (satisfaction is PX-owned)
        expect(ent.facts.overallSatisfaction, `9 ${tag}`).toBe(px.overallSatisfaction);

        // 10. Quality infection exposure ↔ eligible clinical activity (device-day rates)
        expect(qs.clabsiRate, `10 ${tag}`).toBeCloseTo((qs.clabsi / qs.centralLineDays) * 1000, 2);
        expect(ent.facts.validatedEventRate, `10e ${tag}`).toBe(qs.validatedEventRate);

        // 11. Supply availability ↔ Command / Enterprise
        expect(ent.facts.supplyAvailability, `11 ${tag}`).toBe(sc.supplyAvailability);

        // 12. RCM denial rate ↔ Executive Dashboard
        expect(ent.facts.grossDenialRate, `12 ${tag}`).toBe(rcm.grossDenialRate);
        const denialSignal = ent.signals.find((s) => s.id === 'ent_financial_denial');
        expect(denialSignal?.value, `12s ${tag}`).toBe(rcm.grossDenialRate);

        // 13. Strategy contribution ↔ Executive Dashboard
        expect(ent.facts.operatingContribution, `13 ${tag}`).toBe(st.operatingContribution);
        const cmSignal = ent.signals.find((s) => s.id === 'ent_strategy_contribution');
        expect(cmSignal?.value, `13s ${tag}`).toBe(st.operatingContribution);

        // 14. Supply critical stockouts ↔ Command / Enterprise
        expect(ent.facts.criticalStockouts, `14 ${tag}`).toBe(sc.criticalStockouts);

        // 15. Quality overdue CAPA ↔ Executive Dashboard
        expect(ent.facts.overdueHighRiskActions, `15 ${tag}`).toBe(qs.overdueHighRiskActions);
      }
    }
  }, 120_000);

  it('samples at least one quarter per year for H1–H5+ALL (pairs 1,3,11–15)', () => {
    clearCaches();
    for (const year of YEARS) {
      const period = SAMPLE_QUARTERS[year % 2]; // Q1 or Q2 sample
      for (const hospital of SITES) {
        const tag = `${hospital}|${year}|${period}`;
        const ent = buildEnterpriseView(hospital, year, period);
        const rcm = buildRcmView(hospital, year, period);
        const st = buildStView(hospital, year, period);
        const sc = buildScView(hospital, year, period);
        const qs = buildQsView(hospital, year, period);
        const icu = buildIcuView(hospital, year, period);

        expect(st.recognizedNetRevenue, `q1 ${tag}`).toBe(rcm.netPatientRevenue);
        expect(ent.facts.icuStaffingGapHours, `q3 ${tag}`).toBe(icu.staffingGapHours);
        expect(ent.facts.supplyAvailability, `q11 ${tag}`).toBe(sc.supplyAvailability);
        expect(ent.facts.grossDenialRate, `q12 ${tag}`).toBe(rcm.grossDenialRate);
        expect(ent.facts.operatingContribution, `q13 ${tag}`).toBe(st.operatingContribution);
        expect(ent.facts.criticalStockouts, `q14 ${tag}`).toBe(sc.criticalStockouts);
        expect(ent.facts.overdueHighRiskActions, `q15 ${tag}`).toBe(qs.overdueHighRiskActions);
      }
    }
  }, 60_000);
});
