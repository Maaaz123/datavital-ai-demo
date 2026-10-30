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

describe('Radiology scenario reconciles', () => {
  it('keeps request outcome and waitlist identities for hospitals and periods', () => {
    for (const hospital of HOSPITALS) {
      for (const year of [2025, 2026] as const) {
        for (const period of ['year', 'Q1', 'Q2', 'Q3', 'Q4'] as const) {
          const view = buildRadiologyView(hospital.code, year, period);
          expect(view.completed + view.cancelled + view.noShows + view.pending).toBe(view.requests);
          expect(view.urgentRequests + view.routineRequests).toBe(view.requests);
          expect(view.careSettings.reduce((sum, item) => sum + item.requests, 0)).toBe(view.requests);
          expect(view.modalities.reduce((sum, item) => sum + item.requests, 0)).toBe(view.requests);
          expect(view.modalities.reduce((sum, item) => sum + item.completed, 0)).toBe(view.completed);

          expect(view.openingBacklog + view.addedToWaitlist - view.completedFromWaitlist - view.otherExits).toBe(view.closingBacklog);
          for (let index = 0; index < view.monthlyOpening.length; index += 1) {
            const nextOpen = view.monthlyOpening[index];
            const close = view.monthlyBacklog[index];
            if (index === 0) expect(nextOpen).toBe(view.openingBacklog);
            if (index > 0) expect(nextOpen).toBe(view.monthlyBacklog[index - 1]);
            expect(close).toBeGreaterThanOrEqual(0);
          }
          expect(view.monthlyBacklog[view.monthlyBacklog.length - 1]).toBe(view.closingBacklog);

          // Scanner time accounting
          expect(view.inSessionUsed + view.downtimeHours + view.unusedHours).toBe(view.staffedHours);
          expect(view.overtimeHours).toBe(Math.max(0, view.usedHours - (view.staffedHours - view.downtimeHours)));
          expect(view.scanners.reduce((sum, item) => sum + item.staffedHours, 0)).toBe(view.staffedHours);
          expect(view.scanners.reduce((sum, item) => sum + item.usedHours, 0)).toBe(view.usedHours);
          expect(view.downtimeReasons.reduce((sum, item) => sum + item.hours, 0)).toBe(view.downtimeHours);
          expect(view.scannerUtilization).toBeCloseTo(view.staffedHours ? view.usedHours / view.staffedHours : 0, 3);
          expect(view.scannerUtilization).not.toBeLessThan(0);

          // Report / quality denominators
          expect(view.unsignedAging.reduce((sum, item) => sum + item.count, 0)).toBe(view.unsignedReports);
          expect(view.repeatExams).toBeLessThanOrEqual(view.completed);
          expect(view.criticalAcked).toBeLessThanOrEqual(view.criticalResults);
          expect(view.additionalExams).toBeLessThanOrEqual(view.eligibleWaitlist);
          expect(view.additionalExams).toBeLessThanOrEqual(view.potentialAdditionalExams);
          expect(view.delayDriverHours.reduce((sum, item) => sum + item.hours, 0)).toBe(view.recoverableHours);
          expect(view.bedConstrainedHours + view.feasibleRecoverableHours).toBe(view.recoverableHours);

          // Distinct clocks
          expect(view.methodology.accessClock).toMatch(/Request-to-exam/i);
          expect(view.methodology.reportTat).toMatch(/signature/i);
        }
      }
    }
  });

  it('sums quarterly flows to annual request totals', () => {
    for (const hospital of HOSPITALS.filter((item) => item.code !== 'ALL').slice(0, 2)) {
      for (const year of [2026] as const) {
        const annual = buildRadiologyView(hospital.code, year, 'year');
        const quarters = (['Q1', 'Q2', 'Q3', 'Q4'] as const).map((period) => buildRadiologyView(hospital.code, year, period));
        expect(quarters.reduce((sum, item) => sum + item.requests, 0)).toBe(annual.requests);
        expect(quarters.reduce((sum, item) => sum + item.completed, 0)).toBe(annual.completed);
        expect(quarters.reduce((sum, item) => sum + item.cancelled, 0)).toBe(annual.cancelled);
        expect(quarters.reduce((sum, item) => sum + item.noShows, 0)).toBe(annual.noShows);
        // Backlog is a snapshot — must not equal the sum of quarter closings
        expect(quarters.reduce((sum, item) => sum + item.closingBacklog, 0)).not.toBe(annual.closingBacklog);
      }
    }
  });

  it('keeps modality exam durations distinct', () => {
    const view = buildRadiologyView('H1', 2026, 'year');
    const mins = view.modalities.map((item) => item.examMin);
    expect(new Set(mins).size).toBeGreaterThan(1);
    expect(view.modalities.find((item) => item.id === 'MRI')!.examMin).toBeGreaterThan(view.modalities.find((item) => item.id === 'X-ray')!.examMin);
  });
});

describe('Radiology Assist, alerts, and what-if', () => {
  it('answers Radiology management questions from the shared view', () => {
    const wait = answerQuestion('Which modalities have the longest access waits?', 'H1', 2026, 'Radiology', 'en', 'year');
    expect(wait.observation).toMatch(/wait|backlog|MRI|CT|Ultrasound|X-ray/i);
    const util = answerQuestion('Which scanners have low utilization?', 'H1', 2026, 'Radiology', 'en', 'year');
    expect(util.observation).toMatch(/Utilization|unused|downtime|scanner/i);
    const tat = answerQuestion('Which modality has the longest report turnaround time?', 'H1', 2026, 'Radiology', 'en', 'year');
    expect(tat.observation).toMatch(/TAT|unsigned|report/i);
    const capacity = answerQuestion('How many additional exams are operationally feasible?', 'H1', 2026, 'Radiology', 'en', 'year');
    expect(capacity.observation).toMatch(/Additional|Recoverable|feasible|waitlist/i);
    const priority = answerQuestion('Which operational actions should radiology management prioritize?', 'H1', 2026, 'Radiology', 'en', 'year');
    expect(priority.observation.length).toBeGreaterThan(10);
  });

  it('aligns Radiology alert values with buildRadiologyView', () => {
    const view = buildRadiologyView('H1', 2026, 'year');
    const fact = scenarioFor('H1', 2026).focus;
    const alerts = alertsFor('H1', 2026).filter((alert) => alert.department === 'Radiology');
    expect(alerts.length).toBeGreaterThanOrEqual(6);

    const utilBind = bindKpi({ key: 'kpi_rad_scanner_utilization' } as never, fact, 'H1', 2026);
    expect(utilBind.value).toBeCloseTo(view.scannerUtilization, 3);

    const backlogBind = bindKpi({ key: 'kpi_rad_imaging_backlog' } as never, fact, 'H1', 2026);
    expect(backlogBind.value).toBe(view.closingBacklog);

    const waitBind = bindKpi({ key: 'kpi_rad_median_access_wait' } as never, fact, 'H1', 2026);
    expect(waitBind.value).toBeCloseTo(view.medianAccessWaitDays, 3);

    const tatBind = bindKpi({ key: 'kpi_rad_median_report_tat_minutes' } as never, fact, 'H1', 2026);
    expect(tatBind.value).toBe(Math.round(view.medianReportTatHours * 60));

    const unsignedBind = bindKpi({ key: 'kpi_rad_unsigned_reports' } as never, fact, 'H1', 2026);
    expect(unsignedBind.value).toBe(view.unsignedReports);

    const repeatBind = bindKpi({ key: 'kpi_rad_repeat_exam_rate' } as never, fact, 'H1', 2026);
    expect(repeatBind.value).toBeCloseTo(view.repeatExamRate, 3);

    const ackBind = bindKpi({ key: 'kpi_rad_critical_ack_rate' } as never, fact, 'H1', 2026);
    expect(ackBind.value).toBeCloseTo(view.criticalAckRate, 3);

    expect(alerts.some((alert) => alert.kpi === 'kpi_rad_scanner_utilization')).toBe(true);
    expect(alerts.some((alert) => alert.kpi === 'kpi_rad_imaging_backlog')).toBe(true);
  });

  it('runs all six Radiology what-if scenarios with illustrative labels', () => {
    const kinds = [
      'rad-mri-duration-down',
      'rad-ct-downtime-down',
      'rad-staffed-up',
      'rad-report-tat-down',
      'rad-reallocate-slots',
      'rad-prioritize-backlog',
    ] as const;
    for (const kind of kinds) {
      const result = runWhatIf('Radiology', 'H1', 2026, { kind, amount: 0.1 }, 'year');
      expect(result.assumptions).toMatch(/Illustrative|illustrative|not achieved|Not a validated/i);
      expect(result.estimated.length).toBeGreaterThan(10);
      expect(result.followUp.length).toBeGreaterThan(5);
      expect(result.owner.length).toBeGreaterThan(3);
    }
  });
});
