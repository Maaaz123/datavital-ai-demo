import { describe, expect, it } from 'vitest';
import { HOSPITALS } from '@/showcase/engine';
import { answerQuestion } from '@/showcase/assistant';
import { alertsFor } from './alerts';
import { runWhatIf } from '@/showcase/whatIf';
import {
  CROSS_DOMAIN_FORBIDDEN_DISPLAY,
  SURGERY_KPI_OWNERS,
  assertUniqueSurgeryOwnership,
  ownersForScreen,
} from './surgeryOwnership';
import { buildSurgeryView } from './surgeryView';

describe('Surgery KPI ownership', () => {
  it('registers each primary KPI ID on exactly one screen', () => {
    expect(assertUniqueSurgeryOwnership()).toEqual([]);
    expect(SURGERY_KPI_OWNERS.length).toBeGreaterThanOrEqual(20);
    expect(ownersForScreen('command').length).toBe(5);
    expect(ownersForScreen('or').length).toBe(6);
    expect(ownersForScreen('access').length).toBe(6);
    expect(ownersForScreen('quality').length).toBe(6);
    expect(ownersForScreen('optimization').length).toBe(6);
  });

  it('does not claim cross-domain headline KPIs', () => {
    const displays = SURGERY_KPI_OWNERS.map((item) => item.display);
    for (const forbidden of CROSS_DOMAIN_FORBIDDEN_DISPLAY) {
      expect(displays.some((name) => name.toLowerCase() === forbidden.toLowerCase())).toBe(false);
    }
  });
});

describe('Surgery scenario reconciles', () => {
  it('keeps scheduled/completed/cancel and waitlist identities for hospitals and periods', () => {
    for (const hospital of HOSPITALS.slice(0, 3)) {
      for (const year of [2025, 2026] as const) {
        for (const period of ['year', 'Q1', 'Q2', 'Q3', 'Q4'] as const) {
          const view = buildSurgeryView(hospital.code, year, period);
          expect(view.completed + view.cancelled).toBe(view.scheduled);
          expect(view.electiveScheduled + view.emergencyScheduled).toBe(view.scheduled);
          expect(view.electiveCompleted + view.emergencyCompleted).toBe(view.completed);
          expect(view.sameDayCancels).toBeLessThanOrEqual(view.cancelled);
          expect(view.usedHours).toBe(view.procedureHours + view.turnoverHours);
          expect(view.unusedHours).toBeGreaterThanOrEqual(0);
          expect(view.overtimeHours).toBeGreaterThanOrEqual(0);
          expect(view.closingBacklog).toBe(
            Math.max(0, view.openingBacklog + view.addedToWaitlist - view.completedFromWaitlist - view.otherExits),
          );
          expect(view.overdueCases + view.withinTargetCases).toBe(view.closingBacklog);
          expect(view.specialties.reduce((sum, item) => sum + item.completed, 0)).toBe(view.completed);
          expect(view.specialties.reduce((sum, item) => sum + item.backlog, 0)).toBe(view.closingBacklog);
          expect(view.waitBandCounts.reduce((sum, item) => sum + item.count, 0)).toBe(view.closingBacklog);
          expect(view.delayDriverHours.reduce((sum, item) => sum + item.hours, 0)).toBe(view.recoverableOrHours);
          expect(view.additionalCases).toBeLessThanOrEqual(view.eligibleBacklogCases);
          expect(view.additionalCases).toBeLessThanOrEqual(view.potentialAdditionalCases);
          expect(view.rooms.reduce((sum, item) => sum + item.staffedHours, 0)).toBe(view.staffedHours);
          expect(view.monthlyCompleted.reduce((sum, value) => sum + value, 0)).toBe(view.completed);
          expect(view.monthlyScheduled.reduce((sum, value) => sum + value, 0)).toBe(view.scheduled);
        }
      }
    }
  });

  it('sums quarterly flow counts to the annual totals', () => {
    for (const hospital of HOSPITALS.slice(0, 2)) {
      for (const year of [2026] as const) {
        const annual = buildSurgeryView(hospital.code, year, 'year');
        const quarters = (['Q1', 'Q2', 'Q3', 'Q4'] as const).map((period) => buildSurgeryView(hospital.code, year, period));
        expect(quarters.reduce((sum, view) => sum + view.completed, 0)).toBe(annual.completed);
        expect(quarters.reduce((sum, view) => sum + view.scheduled, 0)).toBe(annual.scheduled);
        expect(quarters.reduce((sum, view) => sum + view.cancelled, 0)).toBe(annual.cancelled);
      }
    }
  });

  it('keeps what-if scenarios within capacity bounds', () => {
    const view = buildSurgeryView('H1', 2026, 'year');
    const first = runWhatIf('Surgery', 'H1', 2026, { kind: 'surg-first-case-up', amount: 0.15 }, 'year');
    expect(first.estimated).toMatch(/on-time|hours|cases/i);
    const turnover = runWhatIf('Surgery', 'H1', 2026, { kind: 'surg-turnover-down', amount: 0.15 }, 'year');
    expect(turnover.assumptions).toMatch(/not all saved minutes/i);
    const cancel = runWhatIf('Surgery', 'H1', 2026, { kind: 'surg-cancel-down', amount: 0.2 }, 'year');
    expect(cancel.estimated).toMatch(/completed/i);
    const redistribute = runWhatIf('Surgery', 'H1', 2026, { kind: 'surg-redistribute', amount: 0.1 }, 'year');
    expect(redistribute.estimated).toMatch(String(view.staffedHours.toLocaleString('en-US')));
    const elective = runWhatIf('Surgery', 'H1', 2026, { kind: 'surg-elective-up', amount: 0.1 }, 'year');
    expect(elective.assumptions).toMatch(/bed/i);
    const bed = runWhatIf('Surgery', 'H1', 2026, { kind: 'surg-bed-delay-down', amount: 0.25 }, 'year');
    expect(bed.followUp).toMatch(/Beds/i);
  });

  it('answers Surgery Assist questions from scenario evidence', () => {
    const backlog = answerQuestion('Which surgical specialties have the largest backlog?', 'H1', 2026, 'Surgery', 'en', 'year');
    expect(backlog.observation).toMatch(/backlog/i);
    const hours = answerQuestion('Where are we losing operating room hours?', 'H1', 2026, 'Surgery', 'en', 'year');
    expect(hours.observation).toMatch(/Utilization|unused|late/i);
    const capacity = answerQuestion('How many additional cases could fit within available capacity?', 'H1', 2026, 'Surgery', 'en', 'year');
    expect(capacity.observation).toMatch(/Additional|Recoverable|capacity/i);
  });

  it('keeps Surgery alerts tied to coherent thresholds', () => {
    const alerts = alertsFor('H1', 2026).filter((alert) => alert.department === 'Surgery');
    expect(alerts.length).toBeGreaterThanOrEqual(6);
    const util = alerts.find((alert) => alert.kpi === 'kpi_surg_or_utilization');
    expect(util?.investigation).toMatch(/staffed/i);
    const sameDay = alerts.find((alert) => alert.kpi === 'kpi_surg_same_day_cancel_rate');
    expect(sameDay?.title).toMatch(/same-day/i);
  });
});
