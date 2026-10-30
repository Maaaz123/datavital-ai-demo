import { describe, expect, it } from 'vitest';
import { HOSPITALS } from '@/showcase/engine';
import { answerQuestion } from '@/showcase/assistant';
import { bindKpi } from '@/showcase/bind';
import { scenarioFor } from '@/showcase/facts';
import { runWhatIf } from '@/showcase/whatIf';
import { alertsFor } from './alerts';
import {
  RADIOLOGY_CROSS_DOMAIN_FORBIDDEN,
  RADIOLOGY_KPI_OWNERS,
  assertUniqueRadiologyOwnership,
  ownersForScreen,
} from './radiologyOwnership';
import { buildRadiologyView } from './radiologyView';

const PERIODS = ['year', 'Q1', 'Q2', 'Q3', 'Q4'] as const;
const YEARS = [2024, 2025, 2026] as const;
const SITES = HOSPITALS.filter((item) => item.code !== 'ALL');

describe('Radiology KPI ownership', () => {
  it('registers each primary KPI ID on exactly one screen', () => {
    expect(assertUniqueRadiologyOwnership()).toEqual([]);
    expect(RADIOLOGY_KPI_OWNERS.length).toBe(25);
    expect(ownersForScreen('command').length).toBe(5);
    expect(ownersForScreen('access').length).toBe(6);
    expect(ownersForScreen('utilization').length).toBe(5);
    expect(ownersForScreen('quality').length).toBe(6);
    expect(ownersForScreen('optimization').length).toBe(3);
  });

  it('does not claim cross-domain headline KPIs', () => {
    const displays = RADIOLOGY_KPI_OWNERS.map((item) => item.display);
    for (const forbidden of RADIOLOGY_CROSS_DOMAIN_FORBIDDEN) {
      expect(displays.some((name) => name.toLowerCase() === forbidden.toLowerCase())).toBe(false);
    }
  });
});

describe('Radiology examination and reporting lifecycles', () => {
  it('keeps exam completion distinct from report signature', () => {
    for (const hospital of SITES.slice(0, 3)) {
      for (const year of YEARS) {
        const view = buildRadiologyView(hospital.code, year, 'year');
        expect(view.completed + view.cancelled + view.noShows + view.pending).toBe(view.requests);
        expect(view.signedReports + view.unsignedReports).toBe(view.completed);
        expect(view.completed).toBeGreaterThanOrEqual(view.signedReports);
        expect(view.pending).toBeGreaterThanOrEqual(0);
        expect(view.unsignedReports).toBeGreaterThanOrEqual(0);
        expect(view.methodology.examLifecycle).toMatch(/distinct/i);
      }
    }
  });

  it('partitions modality outcomes without negative residuals', () => {
    for (const hospital of SITES) {
      for (const year of [2025, 2026] as const) {
        for (const period of PERIODS) {
          const view = buildRadiologyView(hospital.code, year, period);
          expect(view.modalities.reduce((sum, item) => sum + item.requests, 0)).toBe(view.requests);
          expect(view.modalities.reduce((sum, item) => sum + item.completed, 0)).toBe(view.completed);
          expect(view.modalities.reduce((sum, item) => sum + item.cancelled, 0)).toBe(view.cancelled);
          expect(view.modalities.reduce((sum, item) => sum + item.noShows, 0)).toBe(view.noShows);
          expect(view.modalities.reduce((sum, item) => sum + item.pending, 0)).toBe(view.pending);
          for (const modality of view.modalities) {
            expect(modality.completed + modality.cancelled + modality.noShows + modality.pending).toBe(modality.requests);
            expect(modality.completed).toBeGreaterThanOrEqual(0);
            expect(modality.cancelled).toBeGreaterThanOrEqual(0);
            expect(modality.noShows).toBeGreaterThanOrEqual(0);
            expect(modality.pending).toBeGreaterThanOrEqual(0);
            expect(modality.completed).toBeLessThanOrEqual(modality.requests);
          }
          expect(view.careSettings.reduce((sum, item) => sum + item.requests, 0)).toBe(view.requests);
          expect(view.careSettings.reduce((sum, item) => sum + item.completed, 0)).toBe(view.completed);
        }
      }
    }
  });
});

describe('Radiology waitlist ledger', () => {
  it('rolls monthly opening/closing without clamping substitutes', () => {
    for (const hospital of SITES.slice(0, 3)) {
      for (const year of [2025, 2026] as const) {
        for (const period of PERIODS) {
          const view = buildRadiologyView(hospital.code, year, period);
          expect(view.openingBacklog + view.addedToWaitlist - view.completedFromWaitlist - view.otherExits).toBe(view.closingBacklog);
          expect(view.waitlistGrowth).toBe(view.closingBacklog - view.openingBacklog);
          expect(view.monthlyOpening[0]).toBe(view.openingBacklog);
          expect(view.monthlyBacklog[view.monthlyBacklog.length - 1]).toBe(view.closingBacklog);
          for (let index = 0; index < view.waitlistLedger.length; index += 1) {
            const row = view.waitlistLedger[index];
            expect(row.opening + row.added - row.completedFromWaitlist - row.otherExits).toBe(row.closing);
            expect(row.closing).toBeGreaterThanOrEqual(0);
            expect(row.completedFromWaitlist).toBeLessThanOrEqual(row.opening + row.added);
            expect(row.otherExits).toBeLessThanOrEqual(row.opening + row.added - row.completedFromWaitlist);
            if (index > 0) expect(row.opening).toBe(view.waitlistLedger[index - 1].closing);
          }
        }
      }
    }
  });

  it('derives wait median, P90, overdue, and bands from one active backlog distribution', () => {
    const view = buildRadiologyView('H1', 2026, 'year');
    expect(view.waitBands.reduce((sum, item) => sum + item.count, 0)).toBe(view.closingBacklog);
    expect(view.overdueImaging + view.withinTargetCases).toBe(view.closingBacklog);
    expect(view.overdueImaging).toBeLessThanOrEqual(view.closingBacklog);
    if (view.closingBacklog > 0) {
      expect(view.medianAccessWaitDays).toBeGreaterThan(0);
      expect(view.p90AccessWaitDays).toBeGreaterThanOrEqual(view.medianAccessWaitDays);
    }
    // Overdue band share for >14 days should match overdue count for 14-day target.
    const overdueFromBands = view.waitBands
      .filter((band) => band.name === '15–30 days' || band.name === '31–60 days' || band.name === '>60 days')
      .reduce((sum, item) => sum + item.count, 0);
    expect(overdueFromBands).toBe(view.overdueImaging);
  });
});

describe('Radiology scanner accounting', () => {
  it('reconciles staffed, downtime, unused, overtime, and utilization', () => {
    for (const hospital of SITES.slice(0, 3)) {
      const view = buildRadiologyView(hospital.code, 2026, 'year');
      expect(view.inSessionUsed + view.downtimeHours + view.unusedHours).toBe(view.staffedHours);
      expect(view.usedHours).toBe(view.inSessionUsed + view.overtimeHours);
      expect(view.scannerUtilization).toBeCloseTo(view.staffedHours ? view.inSessionUsed / view.staffedHours : 0, 3);
      expect(view.scanners.reduce((sum, item) => sum + item.staffedHours, 0)).toBe(view.staffedHours);
      expect(view.scanners.reduce((sum, item) => sum + item.inSessionUsed, 0)).toBe(view.inSessionUsed);
      expect(view.scanners.reduce((sum, item) => sum + item.downtimeHours, 0)).toBe(view.downtimeHours);
      expect(view.scanners.reduce((sum, item) => sum + item.overtimeHours, 0)).toBe(view.overtimeHours);
      expect(view.modalities.reduce((sum, item) => sum + item.staffedHours, 0)).toBe(view.staffedHours);
      expect(view.modalities.reduce((sum, item) => sum + item.inSessionUsed, 0)).toBe(view.inSessionUsed);
      expect(view.modalities.reduce((sum, item) => sum + item.downtimeHours, 0)).toBe(view.downtimeHours);
      expect(view.ctDowntimeHours).toBe(view.modalities.find((item) => item.id === 'CT')!.downtimeHours);
      expect(view.downtimeReasons.reduce((sum, item) => sum + item.hours, 0)).toBe(view.downtimeHours);
      for (const scanner of view.scanners) {
        expect(scanner.inSessionUsed + scanner.downtimeHours + scanner.unusedHours).toBe(scanner.staffedHours);
        expect(scanner.utilization).toBeCloseTo(scanner.staffedHours ? scanner.inSessionUsed / scanner.staffedHours : 0, 5);
        expect(scanner.unusedHours).toBeGreaterThanOrEqual(0);
        expect(scanner.overtimeHours).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('keeps modality exam durations distinct', () => {
    const view = buildRadiologyView('H1', 2026, 'year');
    expect(new Set(view.modalities.map((item) => item.examMin)).size).toBeGreaterThan(1);
    expect(view.modalities.find((item) => item.id === 'MRI')!.examMin)
      .toBeGreaterThan(view.modalities.find((item) => item.id === 'X-ray')!.examMin);
  });
});

describe('Radiology reporting and critical communication', () => {
  it('calculates TAT from signed cohort and ages unsigned separately', () => {
    const view = buildRadiologyView('H1', 2026, 'year');
    expect(view.reportsOverTarget).toBeLessThanOrEqual(view.signedReports);
    expect(view.unsignedAging.reduce((sum, item) => sum + item.count, 0)).toBe(view.unsignedReports);
    expect(view.technicalRepeats + view.clinicalRepeats).toBe(view.repeatExams);
    expect(view.criticalAcked + view.criticalPendingAck).toBe(view.criticalResults);
    expect(view.criticalAckRate + view.criticalDelayRate).toBeCloseTo(1, 3);
    expect(view.methodology.critical).toMatch(/Distinct/i);
  });
});

describe('Radiology modality-specific capacity', () => {
  it('computes additional exams per modality without a shared hour pool', () => {
    const view = buildRadiologyView('H1', 2026, 'year');
    expect(view.modalityCapacity.reduce((sum, item) => sum + item.additionalExams, 0)).toBe(view.additionalExams);
    expect(view.modalityCapacity.reduce((sum, item) => sum + item.recoverableHours, 0)).toBe(view.recoverableHours);
    expect(view.modalityCapacity.reduce((sum, item) => sum + item.eligibleWaitlist, 0)).toBe(view.eligibleWaitlist);
    expect(view.delayDriverHours.reduce((sum, item) => sum + item.hours, 0)).toBe(view.recoverableHours);
    expect(view.bedConstrainedHours + view.feasibleRecoverableHours).toBe(view.recoverableHours);
    for (const modality of view.modalityCapacity) {
      expect(modality.additionalExams).toBeLessThanOrEqual(modality.eligibleWaitlist);
      expect(modality.additionalExams).toBeLessThanOrEqual(modality.potentialAdditionalExams);
      expect(modality.feasibleRecoverableHours + modality.bedConstrainedHours).toBe(modality.recoverableHours);
    }
    expect(view.modalities.map((item) => item.additionalExams).reduce((a, b) => a + b, 0)).toBe(view.additionalExams);
    // Long-exam modalities should often be capacity-bound (potential < eligible).
    const longExam = view.modalityCapacity.filter((item) => item.modality === 'MRI' || item.modality === 'CT');
    expect(longExam.some((item) => item.potentialAdditionalExams <= item.eligibleWaitlist)).toBe(true);
    expect(view.additionalExams).toBeLessThanOrEqual(view.potentialAdditionalExams);
  });
});

describe('Radiology quarter and annual aggregation', () => {
  it('sums quarterly shared-fact flows to annual and keeps backlog as a snapshot', () => {
    for (const hospital of SITES.slice(0, 2)) {
      const annual = buildRadiologyView(hospital.code, 2026, 'year');
      const quarters = PERIODS.filter((period) => period !== 'year').map((period) => buildRadiologyView(hospital.code, 2026, period));
      expect(quarters.reduce((sum, item) => sum + item.requests, 0)).toBe(annual.requests);
      expect(quarters.reduce((sum, item) => sum + item.cancelled, 0)).toBe(annual.cancelled);
      expect(quarters.reduce((sum, item) => sum + item.noShows, 0)).toBe(annual.noShows);
      // Pending (and therefore completed) is a period observation carve-out — each period reconciles locally.
      for (const quarter of quarters) {
        expect(quarter.completed + quarter.cancelled + quarter.noShows + quarter.pending).toBe(quarter.requests);
      }
      expect(annual.completed + annual.cancelled + annual.noShows + annual.pending).toBe(annual.requests);
      expect(quarters.reduce((sum, item) => sum + item.closingBacklog, 0)).not.toBe(annual.closingBacklog);
    }
  });
});

describe('Radiology alerts, Assist, and what-if', () => {
  it('aligns alert values with view and uses CT-specific downtime / critical delay', () => {
    const view = buildRadiologyView('H1', 2026, 'year');
    const fact = scenarioFor('H1', 2026).focus;
    const alerts = alertsFor('H1', 2026).filter((alert) => alert.department === 'Radiology');
    expect(alerts.length).toBeGreaterThanOrEqual(6);

    expect(alerts.some((alert) => alert.title === 'Growing imaging backlog')).toBe(false);
    expect(alerts.some((alert) => alert.title === 'High imaging backlog')).toBe(true);

    const utilBind = bindKpi({ key: 'kpi_rad_scanner_utilization' } as never, fact, 'H1', 2026);
    expect(utilBind.value).toBeCloseTo(view.scannerUtilization, 3);

    const backlogBind = bindKpi({ key: 'kpi_rad_imaging_backlog' } as never, fact, 'H1', 2026);
    expect(backlogBind.value).toBe(view.closingBacklog);

    const ctBind = bindKpi({ key: 'kpi_rad_ct_downtime' } as never, fact, 'H1', 2026);
    expect(ctBind.value).toBe(view.ctDowntimeHours);
    expect(ctBind.value).not.toBe(view.downtimeHours);

    const delayBind = bindKpi({ key: 'kpi_rad_critical_delay_rate' } as never, fact, 'H1', 2026);
    expect(delayBind.value).toBeCloseTo(view.criticalDelayRate, 3);
    expect(delayBind.value).not.toBeCloseTo(view.criticalAckRate, 2);

    const tatBind = bindKpi({ key: 'kpi_rad_median_report_tat_minutes' } as never, fact, 'H1', 2026);
    expect(tatBind.value).toBe(Math.round(view.medianReportTatHours * 60));
  });

  it('answers Radiology management questions from the shared view', () => {
    const wait = answerQuestion('Which modalities have the longest access waits?', 'H1', 2026, 'Radiology', 'en', 'year');
    expect(wait.observation).toMatch(/wait|backlog|MRI|CT|Ultrasound|X-ray/i);
    const util = answerQuestion('Which scanners have low utilization?', 'H1', 2026, 'Radiology', 'en', 'year');
    expect(util.observation).toMatch(/Utilization|unused|downtime|scanner/i);
    const tat = answerQuestion('Which modality has the longest report turnaround time?', 'H1', 2026, 'Radiology', 'en', 'year');
    expect(tat.observation).toMatch(/signed|TAT|unsigned|critical delay|ack/i);
    const capacity = answerQuestion('How many additional exams are operationally feasible?', 'H1', 2026, 'Radiology', 'en', 'year');
    expect(capacity.observation).toMatch(/Additional|Recoverable|feasible|waitlist/i);
  });

  it('runs all six Radiology what-if scenarios with modality constraints', () => {
    const kinds = [
      'rad-mri-duration-down',
      'rad-ct-downtime-down',
      'rad-staffed-up',
      'rad-report-tat-down',
      'rad-reallocate-slots',
      'rad-prioritize-backlog',
    ] as const;
    const results = kinds.map((kind) => runWhatIf('Radiology', 'H1', 2026, { kind, amount: 0.1 }, 'year'));
    for (const result of results) {
      expect(result.assumptions).toMatch(/Illustrative|illustrative|not achieved|Not a validated/i);
      expect(result.estimated.length).toBeGreaterThan(10);
      expect(result.estimated).not.toMatch(/NaN/);
      expect(result.followUp.length).toBeGreaterThan(5);
    }
    expect(results[1].current).toMatch(/CT downtime/i);
    expect(results[1].current).not.toMatch(/^Scanner Downtime \d/);
    expect(results[0].estimated).toMatch(/MRI/i);
    expect(new Set(results.map((item) => item.title)).size).toBe(6);
  });

  it('parses all six Radiology What-if prompts to distinct intents', async () => {
    const { parseWhatIfIntent, WHAT_IF_PROMPTS } = await import('@/showcase/whatIf');
    const kinds = WHAT_IF_PROMPTS.Radiology.map((prompt) => parseWhatIfIntent(prompt)?.kind);
    expect(kinds.every(Boolean)).toBe(true);
    expect(new Set(kinds).size).toBe(6);
  });
});
