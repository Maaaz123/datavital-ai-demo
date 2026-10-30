import { describe, expect, it } from 'vitest';
import { alertsFor } from './alerts';
import { assertUniqueIcuOwnership, ICU_CROSS_DOMAIN_FORBIDDEN, ICU_KPI_OWNERS, ownersForIcuScreen } from './icuOwnership';
import { buildIcuView } from './icuView';
import { answerQuestion } from '@/showcase/assistant';
import { bindKpi } from '@/showcase/bind';
import { findKpi } from '@/showcase/engine';
import { parseWhatIfIntent, runWhatIf, WHAT_IF_PROMPTS } from '@/showcase/whatIf';
import type { ReportPeriod } from './period';

describe('ICU KPI ownership', () => {
  it('registers each primary KPI ID on exactly one screen (31 KPIs, six screens)', () => {
    expect(assertUniqueIcuOwnership()).toEqual([]);
    expect(ICU_KPI_OWNERS).toHaveLength(31);
    expect(ownersForIcuScreen('command')).toHaveLength(6);
    expect(ownersForIcuScreen('flow')).toHaveLength(6);
    expect(ownersForIcuScreen('capacity')).toHaveLength(5);
    expect(ownersForIcuScreen('equipment')).toHaveLength(5);
    expect(ownersForIcuScreen('quality')).toHaveLength(5);
    expect(ownersForIcuScreen('optimization')).toHaveLength(4);
  });

  it('does not claim cross-domain headline KPIs', () => {
    const names = ICU_KPI_OWNERS.map((item) => item.fullName);
    for (const forbidden of ICU_CROSS_DOMAIN_FORBIDDEN) {
      expect(names).not.toContain(forbidden);
    }
  });
});

describe('ICU census and flow identity', () => {
  it('reconciles opening + admits + transfers-in − discharges − transfers-out − deaths = closing', () => {
    for (const hospital of ['H1', 'H2', 'H3'] as const) {
      const view = buildIcuView(hospital, 2026, 'year');
      expect(view.censusIdentity).toBe(view.closingCensus);
      expect(view.openingCensus + view.admissions + view.transfersIn - view.discharges - view.transfersOut - view.deaths).toBe(view.closingCensus);
      for (let i = 0; i < view.monthlyOpening.length; i += 1) {
        expect(
          view.monthlyOpening[i]
          + view.monthlyAdmissions[i]
          + view.monthlyTransfersIn[i]
          - view.monthlyDischarges[i]
          - view.monthlyTransfersOut[i]
          - view.monthlyDeaths[i],
        ).toBe(view.monthlyClosing[i]);
        if (i > 0) expect(view.monthlyOpening[i]).toBe(view.monthlyClosing[i - 1]);
      }
      expect(view.avgCensus).toBeCloseTo(view.patientDays / view.days, 1);
    }
  });

  it('keeps admissions, patient-days, and completed stays as distinct grains', () => {
    const view = buildIcuView('H1', 2026, 'year');
    expect(view.admissions).not.toBe(view.patientDays);
    expect(view.completedStays).toBe(view.discharges + view.transfersOut + view.deaths);
    expect(view.patientDays).toBeGreaterThan(view.admissions);
  });
});

describe('ICU LOS and capacity', () => {
  it('uses completed-stay LOS with median ≤ P90 and excludes inventing negative waits', () => {
    const view = buildIcuView('H1', 2026, 'year');
    expect(view.medianLosHours).toBeLessThanOrEqual(view.p90LosHours);
    expect(view.medianAdmissionWaitMin).toBeGreaterThan(0);
    expect(view.p90AdmissionWaitMin).toBeGreaterThanOrEqual(view.medianAdmissionWaitMin);
    expect(view.delayedAdmissions).toBeLessThanOrEqual(view.admissions);
  });

  it('keeps physical ≥ staffed and staffed = occupied + available + blocked', () => {
    const view = buildIcuView('H1', 2026, 'year');
    expect(view.physicalBeds).toBeGreaterThanOrEqual(view.staffedBeds);
    expect(view.staffedBeds).toBe(view.avgOccupied + view.availableStaffed + view.blockedStaffed);
    expect(view.unstaffedPhysical).toBe(view.physicalBeds - view.staffedBeds);
  });

  it('reconciles ventilator snapshot inventory', () => {
    const view = buildIcuView('H1', 2026, 'year');
    expect(view.ventSnapshotSum).toBe(view.ventInventory);
    expect(view.ventInUse + view.ventAvailable + view.ventMaintenance + view.ventPrep).toBe(view.ventInventory);
    expect(view.ventUtilization).toBeGreaterThanOrEqual(0);
    expect(view.ventUtilization).toBeLessThanOrEqual(1);
  });
});

describe('ICU quality and optimization', () => {
  it('keeps surveillance completeness illustrative and recoverable drivers exclusive', () => {
    const view = buildIcuView('H1', 2026, 'year');
    expect(view.surveillanceCompleteness).toBeLessThanOrEqual(1);
    expect(view.methodology.quality).toMatch(/not a validated/i);
    const driverSum = view.delayDriverHours.reduce((total, item) => total + item.hours, 0);
    expect(driverSum).toBe(view.recoverableBedHours);
    expect(view.feasibleAdditionalCapacity).toBeLessThanOrEqual(view.eligibleDemand);
  });
});

describe('ICU alerts and binding', () => {
  it('builds ICU alerts aligned with the shared view', () => {
    const view = buildIcuView('H1', 2026, 'year');
    const alerts = alertsFor('H1', 2026).filter((alert) => alert.department === 'ICU');
    expect(alerts.length).toBeGreaterThanOrEqual(4);
    expect(alerts.every((alert) => alert.kpi.startsWith('kpi_icu_') && alert.screen === 'icu')).toBe(true);
    const wait = bindKpi(findKpi('kpi_icu_admission_wait') as never, { admissions: 0 } as never, 'H1', 2026);
    expect(wait.value).toBe(view.medianAdmissionWaitMin);
  });

  it('binds every kpi_icu_* owner to a finite view value', () => {
    for (const owner of ICU_KPI_OWNERS) {
      const kpi = findKpi(owner.id);
      expect(kpi, owner.id).toBeTruthy();
      const raw = bindKpi(kpi as never, { admissions: 0 } as never, 'H1', 2026);
      expect(Number.isFinite(raw.value), owner.id).toBe(true);
    }
  });
});

describe('ICU Assist and what-if', () => {
  it('answers ICU management questions from the shared view', () => {
    const answer = answerQuestion('Where are ICU admissions delayed?', 'H1', 2026, 'ICU', 'en', 'year');
    expect(answer.observation).toMatch(/wait|delay|pending|admission/i);
    expect(answer.outcome).toMatch(/Illustrative|illustrative|synthetic|Approval|approval/i);
  });

  it('refuses clinical treatment advice and other-domain headlines', () => {
    const clinical = answerQuestion('What ventilator settings should we use?', 'H1', 2026, 'ICU', 'en', 'year');
    expect(clinical.title).toMatch(/Outside operational/i);
    const beds = answerQuestion('What is hospital bed occupancy?', 'H1', 2026, 'ICU', 'en', 'year');
    expect(beds.title).toMatch(/Outside ICU/i);
  });

  it('runs all six ICU what-if scenarios with constraint language', () => {
    const kinds = [
      'icu-transfer-down',
      'icu-discharge-coord',
      'icu-staffed-up',
      'icu-equip-down',
      'icu-reallocate',
      'icu-flow-up',
    ] as const;
    const results = kinds.map((kind) => runWhatIf('ICU', 'H1', 2026, { kind, amount: 0.2 }, 'year'));
    for (const result of results) {
      expect(result.assumptions).toMatch(/Illustrative|illustrative|not achieved/i);
      expect(result.estimated).not.toMatch(/NaN|undefined/);
      expect(`${result.estimated} ${result.implications}`).not.toMatch(/ventilator setting|prognosis|prescribe/i);
    }
    expect(new Set(results.map((item) => item.title)).size).toBe(6);
  });

  it('parses all six ICU What-if prompts to distinct icu intents', () => {
    const kinds = WHAT_IF_PROMPTS.ICU.map((prompt) => parseWhatIfIntent(prompt)?.kind);
    expect(kinds.every((kind) => kind?.startsWith('icu-'))).toBe(true);
    expect(new Set(kinds).size).toBe(6);
    for (const prompt of WHAT_IF_PROMPTS.ICU) {
      const answer = answerQuestion(prompt, 'H1', 2026, 'ICU', 'en', 'year');
      expect(answer.outcome).toMatch(/Illustrative scenario only|Approval|approval/i);
    }
  });
});

describe('ICU filter matrix', () => {
  it('builds finite reconciled views for every hospital × year × period', () => {
    const hospitals = ['H1', 'H2', 'H3', 'H4', 'H5'] as const;
    const years = [2024, 2025, 2026] as const;
    const periods: ReportPeriod[] = ['year', 'Q1', 'Q2', 'Q3', 'Q4'];
    for (const hospital of hospitals) {
      for (const year of years) {
        for (const period of periods) {
          const view = buildIcuView(hospital, year, period);
          expect(Number.isFinite(view.admissions)).toBe(true);
          expect(view.censusIdentity).toBe(view.closingCensus);
          expect(view.ventSnapshotSum).toBe(view.ventInventory);
          expect(view.staffedBeds).toBe(view.avgOccupied + view.availableStaffed + view.blockedStaffed);
        }
      }
    }
  });
});
