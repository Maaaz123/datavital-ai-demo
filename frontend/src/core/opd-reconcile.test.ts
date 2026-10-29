import { describe, expect, it } from 'vitest';
import { HOSPITALS, YEARS } from '@/showcase/engine';
import { allocateDelayContribution, buildOpdView, buildWaitDistribution } from './opdView';
import { runWhatIf } from '@/showcase/whatIf';
import { alertsFor } from './alerts';
import { answerQuestion } from '@/showcase/assistant';

describe('OPD remediation reconciles', () => {
  it('keeps wait bins coherent with threshold and totals', () => {
    const view = buildOpdView('H1', 2026, 'year');
    const sum = view.waitDistribution.reduce((total, bin) => total + bin.count, 0);
    expect(sum).toBe(view.visits);
    const over = view.waitDistribution.slice(2).reduce((total, bin) => total + bin.count, 0);
    expect(over).toBe(view.exceedingWait);
    expect(view.waitDistribution.every((bin) => bin.count >= 0)).toBe(true);
  });

  it('allocates delay contribution without dumping remainder on the first specialty', () => {
    const visits = [100, 80, 60, 50, 40, 30, 20, 10];
    const waits = [20, 22, 24, 26, 28, 30, 32, 34];
    const delays = allocateDelayContribution(90, visits, waits, 24);
    expect(delays.reduce((sum, value) => sum + value, 0)).toBe(90);
    expect(delays.every((value, index) => value >= 0 && value <= visits[index])).toBe(true);
    expect(delays[0]).toBeLessThan(90);
  });

  it('keeps referrals mutually exclusive and pending = open + in progress', () => {
    for (const hospital of HOSPITALS.slice(0, 3)) {
      for (const year of YEARS) {
        for (const period of ['year', 'Q1', 'Q2', 'Q3', 'Q4'] as const) {
          const view = buildOpdView(hospital.code, year, period);
          expect(view.referralOpen + view.referralInProgress).toBe(view.pendingReferrals);
          expect(view.referralOpen + view.referralInProgress + view.referralCompleted).toBe(view.referralTotal);
          expect(view.referralTotal).toBe(view.referralsRecommended);
          expect(view.outcomes.reduce((sum, item) => sum + item.count, 0)).toBe(view.visits);
          expect(view.completedNoReferral + view.referredOnward).toBe(view.completed);
          expect(view.specialties.reduce((sum, item) => sum + item.delayContribution, 0)).toBe(view.exceedingWait);
          expect(view.specialties.every((item) => item.delayContribution <= item.visits)).toBe(true);
          expect(Math.round((view.visits / view.clinicSessions) * 10) / 10).toBe(view.visitsPerSession);
          expect(view.delayedSessions).toBe(Math.round(view.clinicSessions * view.lateStartShare));
          const waitSum = view.waitDistribution.reduce((sum, bin) => sum + bin.count, 0);
          expect(waitSum).toBe(view.visits);
        }
      }
    }
  });

  it('names the on-time alert correctly and keeps what-if bounded', () => {
    const alert = alertsFor('H1', 2026).find((item) => item.kpi === 'kpi_clinic_on_time_start_rate');
    expect(alert?.title).toMatch(/on-time/i);
    expect(alert?.title).not.toMatch(/^Clinic session delay$/i);
    expect(alert?.period).toMatch(/Full year/);

    const util = runWhatIf('Outpatient', 'H1', 2026, { kind: 'opd-util-up', amount: 0.1 }, 'year');
    expect(util.estimated).toMatch(/Utilization near/);
    expect(util.assumptions).toMatch(/capacity|Illustrative|Assumes/i);

    const waitDist = buildWaitDistribution(1000, 24, 43, 140, 30);
    expect(waitDist.reduce((sum, bin) => sum + bin.count, 0)).toBe(1000);
    expect(waitDist.slice(2).reduce((sum, bin) => sum + bin.count, 0)).toBe(140);
  });

  it('answers OPD questions with outpatient context', () => {
    const answer = answerQuestion('Which clinics have the longest waiting times?', 'H1', 2026, 'Outpatient', 'en', 'Q2');
    expect(answer.title).toMatch(/Clinic waiting|Q2|2026/i);
    expect(answer.observation).toMatch(/arrival-to-provider|Median/i);
    const returns = answerQuestion('What is the unplanned outpatient return rate?', 'H1', 2026, 'Outpatient', 'en', 'year');
    expect(returns.observation + returns.evidence).toMatch(/illustrative|2\.8|return/i);
  });
});
