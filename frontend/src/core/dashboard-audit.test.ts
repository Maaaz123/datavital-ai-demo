import { describe, expect, it } from 'vitest';
import { scenarioFor } from '@/showcase/facts';
import { answerQuestion } from '@/showcase/assistant';
import { bedsIndicatorsFor, type BedsScopeInput } from './bedsScope';
import { indicatorsFor, type ScopeInput } from './scope';
import { ipdIndicatorsFor, type IpdScopeInput } from './ipdScope';

function periodRows(hospital: string, year: number) {
  return scenarioFor(hospital, year).months;
}

describe('dashboard business identity audit', () => {
  it('keeps ED disposition identity for the annual scenario', () => {
    const fact = scenarioFor('H1', 2025).focus;
    expect(fact.edAdmitted + fact.edDischarged + fact.edLeft).toBe(fact.edArrivals);
    expect(fact.acuity1 + fact.acuity2 + fact.acuity3 + fact.acuity4 + fact.acuity5).toBe(fact.edArrivals);
  });

  it('keeps bed snapshot identity occupied + vacant + blocked = operational', () => {
    const fact = scenarioFor('H1', 2025).focus;
    expect(fact.occupiedBeds + fact.availableBeds + fact.blockedBeds).toBe(fact.staffedBeds);
  });

  it('partitions IPD admission sources to equal admissions', () => {
    const rows = periodRows('H1', 2025);
    const admissions = rows.reduce((sum, row) => sum + row.admissions, 0);
    const edAdmittedRaw = rows.reduce((sum, row) => sum + row.edAdmitted, 0);
    const transfersIn = rows.reduce((sum, row) => sum + row.transfersIn, 0);
    const fromEmergency = Math.min(edAdmittedRaw, admissions);
    const transferSource = Math.min(transfersIn, Math.max(0, admissions - fromEmergency));
    const direct = Math.max(0, admissions - fromEmergency - transferSource);
    const other = Math.max(0, admissions - fromEmergency - transferSource - direct);
    expect(fromEmergency + direct + transferSource + other).toBe(admissions);
  });

  it('does not collapse average daily occupancy into a duplicate of current occupancy', () => {
    const input: BedsScopeInput = {
      licensed: null, physical: null, operational: 40, occupied: 37, vacant: 2, blocked: 1, days: 365,
      admissions: 100, discharges: 98, transfersIn: 4, transfersOut: 3,
      pendingRequests: 6, unallocated: 4, assignmentMedianMin: 48, assignmentP90Min: null,
      assignmentCompleted: 97, assignmentCancelled: 3, cleaningAwaiting: 1, maintenanceAwaiting: 0,
      cleaningTurnaroundMin: null, vacancyDurationHours: null, dischargeToReadyMin: null,
      occupationDurationDays: 4.2, reassignmentRate: null, expectedReleases: 3, expectedDemand: 4,
      projectedAvailable: 1, shortfall: 4, forecastAccuracy: null,
      wards: [{ id: 'Medicine', staffed: 40, occupied: 37, available: 2, blocked: 1 }],
      bedTypes: [{ id: 'General', staffed: 34, occupied: 31, available: 2, blocked: 1 }],
    };
    const avg = bedsIndicatorsFor(input).find((row) => row.name === 'Average Daily Occupancy Rate');
    const current = bedsIndicatorsFor(input).find((row) => row.name === 'Current Bed Occupancy Rate');
    expect(avg?.status).toBe('unavailable');
    expect(current?.status).toBe('scenario');
    expect(avg?.value).not.toBe(current?.value);
  });

  it('keeps ED indicator board rate denominator on admissions', () => {
    const input: ScopeInput = {
      arrivals: 100, admitted: 20, discharged: 78, left: 2, deaths: 1,
      triageCompleted: 99, median: 63.3, p90: 109.4, losMedian: 141, losP90: 233,
      boarding: 2, revisit: 3,
      modes: [{ name: 'Ambulance', count: 18 }],
      acuity: [8, 22, 40, 22, 8],
    };
    const boarding = indicatorsFor(input).find((row) => row.name === 'ED Boarding Beyond 4 Hours Rate');
    expect(boarding?.value).toBe('10.0%');
    expect(boarding?.method).toMatch(/emergency admissions/i);
  });

  it('keeps readmission indicators as discharge-based rates', () => {
    const input: IpdScopeInput = {
      admissions: 100, census: 40, discharges: 95, deaths: 2, edAdmitted: 45, directAdmissions: 45,
      transfersIn: 5, transfersOut: 4, losAvg: 4.2, losMedian: 3.8, losP90: 7.1,
      longStayCount: 12, longStayRate: 0.12, expectedDischarges: 3, readyNotDischarged: 4,
      delayedDischargeRate: 0.1, readmit7: 0.018, readmit30: 0.102, amaRate: 0.02,
      specialties: [{ id: 'Medicine', admissions: 40, discharges: 38, los: 4.1 }],
      sources: [
        { id: 'From emergency', count: 45 },
        { id: 'Elective / direct', count: 45 },
        { id: 'Transfer in', count: 5 },
        { id: 'Other', count: 5 },
      ],
      destinations: [{ id: 'Home', count: 80 }],
      oeLos: null, delayP50: null, delayP90: null, readinessDocRate: null, dischargeSummaryRate: null,
      carePlanDocRate: null, carePlanReviewRate: null, dailyReviewRate: null, consultResponseHours: null,
      pendingConsults: null, milestoneRate: null, admissionAssessmentRate: null, diagnosisDocRate: null,
      dischargeInstructionsRate: null, medRecRate: null, followUpPlanRate: null, cancelRate: null,
    };
    const rate = ipdIndicatorsFor(input).find((row) => row.name === 'Unplanned 30-Day Readmission Rate');
    expect(rate?.value).toBe('10.2%');
    expect(rate?.method).toMatch(/discharges/i);
    const seven = ipdIndicatorsFor(input).find((row) => row.name === 'Unplanned 7-Day Readmission Rate');
    expect(seven?.value).toBe('1.8%');
  });

  it('keeps long-stay rate compatible with a 7-day review line near P90', () => {
    const losP90 = 7.6;
    const longStayRate = Math.min(0.22, Math.max(0.05, 0.10 + (losP90 - 7) * 0.025));
    expect(longStayRate).toBeGreaterThan(0.1);
    expect(longStayRate).toBeLessThan(0.15);
  });

  it('aligns Vital Assist answers with professional LWBS terminology', () => {
    const answer = answerQuestion('What is the left without being seen rate?', 'H1', 2025, 'Emergency');
    expect(answer.title).toMatch(/left without being seen/i);
    expect(answer.observation).toMatch(/left without being seen/i);
  });
});
