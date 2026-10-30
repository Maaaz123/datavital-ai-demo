import { describe, expect, it } from 'vitest';
import { HOSPITALS } from '@/showcase/engine';
import { answerQuestion } from '@/showcase/assistant';
import { bindKpi } from '@/showcase/bind';
import { scenarioFor } from '@/showcase/facts';
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
    expect(SURGERY_KPI_OWNERS.length).toBe(27);
    expect(ownersForScreen('command').length).toBe(5);
    expect(ownersForScreen('or').length).toBe(6);
    expect(ownersForScreen('access').length).toBe(6);
    expect(ownersForScreen('quality').length).toBe(6);
    expect(ownersForScreen('optimization').length).toBe(4);
    expect(SURGERY_KPI_OWNERS.some((item) => item.id === 'kpi_surg_scenario_improvement')).toBe(false);
    expect(SURGERY_KPI_OWNERS.some((item) => item.id === 'kpi_surg_avoidable_delay_hours')).toBe(false);
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
    for (const hospital of HOSPITALS) {
      for (const year of [2025, 2026] as const) {
        for (const period of ['year', 'Q1', 'Q2', 'Q3', 'Q4'] as const) {
          const view = buildSurgeryView(hospital.code, year, period);
          expect(view.completed + view.cancelled).toBe(view.scheduled);
          expect(view.electiveScheduled + view.emergencyScheduled).toBe(view.scheduled);
          expect(view.electiveCompleted + view.emergencyCompleted).toBe(view.completed);
          expect(view.electiveCancelled + view.emergencyCancelled).toBe(view.cancelled);
          expect(view.sameDayCancels).toBeLessThanOrEqual(view.cancelled);

          // OR accounting
          expect(view.usedHours).toBe(view.procedureHours + view.turnoverHours);
          expect(view.inSessionUsedHours + view.unusedHours).toBe(view.staffedHours);
          expect(view.usedHours).toBe(view.inSessionUsedHours + view.overtimeHours);
          expect(view.unusedHours).toBeGreaterThanOrEqual(0);
          expect(view.overtimeHours).toBeGreaterThanOrEqual(0);
          expect(view.orUtilization).toBeCloseTo(view.staffedHours ? view.usedHours / view.staffedHours : 0, 3);
          if (view.usedHours > view.staffedHours) expect(view.orUtilization).toBeGreaterThan(1);
          expect(view.turnoverEvents).toBe(Math.max(0, view.completed - view.theatreDays));
          expect(view.eligibleFirstCases).toBe(view.theatreDays);
          expect(view.onTimeFirstCases + view.lateFirstCases).toBe(view.eligibleFirstCases);
          expect(view.rooms.reduce((sum, item) => sum + item.staffedHours, 0)).toBe(view.staffedHours);
          expect(view.rooms.reduce((sum, item) => sum + item.usedHours, 0)).toBe(view.usedHours);
          expect(view.rooms.reduce((sum, item) => sum + item.lateStartHours, 0)).toBe(view.lateStartHours);

          // Specialty identity
          for (const specialty of view.specialties) {
            expect(specialty.completed + specialty.cancelled).toBe(specialty.scheduled);
          }
          expect(view.specialties.reduce((sum, item) => sum + item.scheduled, 0)).toBe(view.scheduled);
          expect(view.specialties.reduce((sum, item) => sum + item.completed, 0)).toBe(view.completed);
          expect(view.specialties.reduce((sum, item) => sum + item.cancelled, 0)).toBe(view.cancelled);
          expect(view.specialties.reduce((sum, item) => sum + item.backlog, 0)).toBe(view.closingBacklog);
          expect(view.specialties.reduce((sum, item) => sum + item.overdue, 0)).toBe(view.overdueCases);

          // Waitlist ledger
          expect(view.closingBacklog).toBe(
            Math.max(0, view.openingBacklog + view.addedToWaitlist - view.completedFromWaitlist - view.otherExits),
          );
          expect(view.waitlistGrowth).toBe(view.closingBacklog - view.openingBacklog);
          expect(view.overdueCases + view.withinTargetCases).toBe(view.closingBacklog);
          expect(view.waitBandCounts.reduce((sum, item) => sum + item.count, 0)).toBe(view.closingBacklog);
          expect(view.monthlyBacklog[view.monthlyBacklog.length - 1]).toBe(view.closingBacklog);
          // Monthly roll-forward coherence
          let open = view.openingBacklog;
          for (let index = 0; index < view.monthlyBacklog.length; index += 1) {
            expect(view.monthlyOpening[index]).toBe(open);
            open = view.monthlyBacklog[index];
          }

          // Quality
          expect(view.monthlyReturns.reduce((sum, value) => sum + value, 0)).toBe(view.unplannedReturns);
          expect(view.specialtyComplications.reduce((sum, value) => sum + value, 0)).toBe(view.complications);
          expect(view.complicationRate).toBeCloseTo(view.completed ? view.complications / view.completed : 0, 3);

          // Capacity exclusivity
          expect(view.delayDriverHours.reduce((sum, item) => sum + item.hours, 0)).toBe(view.recoverableOrHours);
          expect(view.delayDriverHours.find((item) => item.name === 'Late first-case starts')?.hours).toBe(view.lateStartHours);
          expect(view.bedConstrainedHours + view.feasibleRecoverableHours).toBe(view.recoverableOrHours);
          expect(view.additionalCases).toBeLessThanOrEqual(view.eligibleBacklogCases);
          expect(view.additionalCases).toBeLessThanOrEqual(view.potentialAdditionalCases);
          expect(view.monthlyCompleted.reduce((sum, value) => sum + value, 0)).toBe(view.completed);
          expect(view.monthlyScheduled.reduce((sum, value) => sum + value, 0)).toBe(view.scheduled);
          expect(view.monthlyCancelled.reduce((sum, value) => sum + value, 0)).toBe(view.cancelled);

          // Room utilization should vary (not identical bars)
          if (view.rooms.length >= 2) {
            const utils = view.rooms.map((item) => Math.round(item.utilization * 1000));
            expect(new Set(utils).size).toBeGreaterThan(1);
          }
        }
      }
    }
  });

  it('sums quarterly flow counts to the annual totals and keeps backlog as snapshots', () => {
    for (const hospital of HOSPITALS.slice(0, 3)) {
      for (const year of [2026] as const) {
        const annual = buildSurgeryView(hospital.code, year, 'year');
        const quarters = (['Q1', 'Q2', 'Q3', 'Q4'] as const).map((period) => buildSurgeryView(hospital.code, year, period));
        expect(quarters.reduce((sum, view) => sum + view.completed, 0)).toBe(annual.completed);
        expect(quarters.reduce((sum, view) => sum + view.scheduled, 0)).toBe(annual.scheduled);
        expect(quarters.reduce((sum, view) => sum + view.cancelled, 0)).toBe(annual.cancelled);
        // Year closing backlog equals December month-end
        expect(annual.monthlyBacklog[11]).toBe(annual.closingBacklog);
        // Quarter closing equals last month of that quarter
        expect(quarters[0].monthlyBacklog[2]).toBe(quarters[0].closingBacklog);
        expect(quarters[3].monthlyBacklog[2]).toBe(quarters[3].closingBacklog);
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
    const hours = answerQuestion('Why is OR utilization low?', 'H1', 2026, 'Surgery', 'en', 'year');
    expect(hours.observation).toMatch(/Utilization|unused|late/i);
    const rooms = answerQuestion('Which operating rooms have the highest unused capacity?', 'H1', 2026, 'Surgery', 'en', 'year');
    expect(rooms.observation).toMatch(/OR-|util/i);
    const late = answerQuestion('How much time is lost through late first-case starts?', 'H1', 2026, 'Surgery', 'en', 'year');
    expect(late.observation).toMatch(/late|first-case|on-time/i);
    const capacity = answerQuestion('How many additional cases are operationally feasible?', 'H1', 2026, 'Surgery', 'en', 'year');
    expect(capacity.observation).toMatch(/Additional|Recoverable|capacity/i);
    const quality = answerQuestion('Which quality measures require management review?', 'H1', 2026, 'Surgery', 'en', 'year');
    expect(quality.observation).toMatch(/checklist|return|complication|infection/i);
  });

  it('aligns Surgery alert values with buildSurgeryView', () => {
    const view = buildSurgeryView('H1', 2026, 'year');
    const fact = scenarioFor('H1', 2026).focus;
    const alerts = alertsFor('H1', 2026).filter((alert) => alert.department === 'Surgery');
    expect(alerts.length).toBeGreaterThanOrEqual(6);

    const util = alerts.find((alert) => alert.kpi === 'kpi_surg_or_utilization');
    expect(util?.investigation).toMatch(/staffed/i);
    const utilBind = bindKpi({ key: 'kpi_surg_or_utilization' } as never, fact, 'H1', 2026);
    expect(utilBind.value).toBeCloseTo(view.orUtilization, 3);

    const first = alerts.find((alert) => alert.kpi === 'kpi_surg_first_case_ontime');
    expect(first?.title).toMatch(/on-time/i);
    expect(first?.title).not.toMatch(/^First-case start delays$/i);
    const firstBind = bindKpi({ key: 'kpi_surg_first_case_ontime' } as never, fact, 'H1', 2026);
    expect(firstBind.value).toBeCloseTo(view.firstCaseOnTimeRate, 3);

    const waitBind = bindKpi({ key: 'kpi_surg_median_wait_days' } as never, fact, 'H1', 2026);
    expect(waitBind.value).toBeCloseTo(view.medianWaitDays, 3);

    const checklistBind = bindKpi({ key: 'kpi_surg_checklist_compliance' } as never, fact, 'H1', 2026);
    expect(checklistBind.value).toBeCloseTo(view.checklistRate, 3);

    const overdueBind = bindKpi({ key: 'kpi_surg_overdue_cases' } as never, fact, 'H1', 2026);
    expect(overdueBind.value).toBe(view.overdueCases);

    const sameDay = alerts.find((alert) => alert.kpi === 'kpi_surg_same_day_cancel_rate');
    expect(sameDay?.title).toMatch(/same-day/i);
  });
});
