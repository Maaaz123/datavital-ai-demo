import { scenarioFor } from '@/showcase/facts';
import { splitExact } from './ipdView';
import { sumKey, weighted, type ReportPeriod } from './period';

const SPECIALTIES = ['Medicine', 'Surgery', 'Cardiology', 'Orthopedics', 'Women', 'Children', 'Dermatology', 'Ophthalmology'];
const SPECIALTY_WEIGHTS = [0.22, 0.14, 0.12, 0.1, 0.12, 0.08, 0.12, 0.1];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function periodRows(hospital: string, year: number, period: 'Q1' | 'Q2' | 'Q3' | 'Q4') {
  const start = { Q1: 0, Q2: 3, Q3: 6, Q4: 9 }[period];
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return scenarioFor(hospital, year).months.slice(start, start + 3).map((month, index) => ({ label: names[start + index], month }));
}

function tilt(hospital: string, year: number): number {
  const pressure = scenarioFor(hospital, year).focus.staffedBeds
    ? scenarioFor(hospital, year).focus.occupiedBeds / scenarioFor(hospital, year).focus.staffedBeds
    : 0.8;
  return Math.min(0.12, Math.max(0, pressure - 0.78));
}

/** Illustrative wait bins coherent with median, P90, and the over-threshold count. */
export function buildWaitDistribution(
  visits: number,
  median: number,
  p90: number,
  exceedingWait: number,
  thresholdMin = 30,
): { name: string; count: number }[] {
  const over = Math.min(visits, Math.max(0, exceedingWait));
  const under = Math.max(0, visits - over);

  let under015: number;
  if (median <= 15) under015 = Math.round(under * 0.7);
  else if (median < thresholdMin) {
    const share015 = Math.max(0.28, Math.min(0.58, (thresholdMin - median) / thresholdMin));
    under015 = Math.round(under * share015);
  } else under015 = Math.round(under * 0.22);
  under015 = Math.min(under, Math.max(0, under015));
  const under1530 = under - under015;

  let over3045: number;
  let over4560: number;
  if (p90 <= 45) {
    over3045 = Math.round(over * 0.72);
    over4560 = Math.round(over * 0.2);
  } else if (p90 <= 60) {
    over3045 = Math.round(over * 0.48);
    over4560 = Math.round(over * 0.38);
  } else {
    over3045 = Math.round(over * 0.32);
    over4560 = Math.round(over * 0.36);
  }
  over3045 = Math.min(over, Math.max(0, over3045));
  over4560 = Math.min(over - over3045, Math.max(0, over4560));
  const over60 = over - over3045 - over4560;

  return [
    { name: '0–15 min', count: under015 },
    { name: '15–30 min', count: under1530 },
    { name: '30–45 min', count: over3045 },
    { name: '45–60 min', count: over4560 },
    { name: '>60 min', count: over60 },
  ];
}

/** Allocate delayed visits across specialties without dumping remainder on the first row. */
export function allocateDelayContribution(
  exceedingWait: number,
  specialtyVisits: number[],
  specialtyWaits: number[],
  waitMedian: number,
): number[] {
  const weights = specialtyVisits.map((visits, index) => {
    const waitTilt = Math.max(0.05, specialtyWaits[index] / Math.max(waitMedian, 1));
    return Math.max(0.01, visits * waitTilt);
  });
  let delays = splitExact(exceedingWait, weights);
  let overflow = 0;
  delays = delays.map((delay, index) => {
    const cap = specialtyVisits[index];
    if (delay > cap) {
      overflow += delay - cap;
      return cap;
    }
    return delay;
  });
  if (overflow > 0) {
    const room = delays.map((delay, index) => Math.max(0, specialtyVisits[index] - delay));
    const roomTotal = room.reduce((sum, value) => sum + value, 0);
    if (roomTotal > 0) {
      const extra = splitExact(Math.min(overflow, roomTotal), room.map((value) => Math.max(value, 0.0001)));
      delays = delays.map((delay, index) => delay + extra[index]);
    }
  }
  const sum = delays.reduce((total, value) => total + value, 0);
  if (sum !== exceedingWait && delays.length) {
    const room = delays.map((delay, index) => specialtyVisits[index] - delay);
    const delta = exceedingWait - sum;
    if (delta > 0) {
      const order = room.map((value, index) => ({ index, value })).filter((item) => item.value > 0).sort((a, b) => b.value - a.value);
      let left = delta;
      for (const item of order) {
        if (left <= 0) break;
        const add = Math.min(left, item.value);
        delays[item.index] += add;
        left -= add;
      }
    } else if (delta < 0) {
      const order = delays.map((value, index) => ({ index, value })).filter((item) => item.value > 0).sort((a, b) => b.value - a.value);
      let left = -delta;
      for (const item of order) {
        if (left <= 0) break;
        const take = Math.min(left, delays[item.index]);
        delays[item.index] -= take;
        left -= take;
      }
    }
  }
  return delays;
}

function weightedRateSeries(target: number, monthlyVisits: number[], wobble: number): number[] {
  const raw = monthlyVisits.map((_, index) => {
    const factor = 1 + ((index % 3) - 1) * wobble;
    return Math.max(0.01, Math.min(0.99, target * factor));
  });
  const weightSum = monthlyVisits.reduce((sum, value) => sum + value, 0) || 1;
  const weighted = raw.reduce((sum, rate, index) => sum + rate * monthlyVisits[index], 0) / weightSum;
  const scale = weighted ? target / weighted : 1;
  return raw.map((rate) => Math.round(Math.max(0.01, Math.min(0.99, rate * scale)) * 1000) / 1000);
}

/** Shared outpatient view for CoreApp screens, Vital Assist, and what-if. */
export function buildOpdView(hospital: string, year: number, period: ReportPeriod = 'year') {
  const rows = period === 'year'
    ? scenarioFor(hospital, year).months.map((month, index) => ({
      label: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index],
      month,
    }))
    : periodRows(hospital, year, period);
  const fact = scenarioFor(hospital, year).focus;
  const pressure = tilt(hospital, year);
  const visits = sumKey(rows, 'apptAttended');
  const completionRate = Math.max(0.88, Math.min(0.97, 0.945 - pressure * 0.2));
  const completed = Math.round(visits * completionRate);
  const incomplete = Math.max(0, visits - completed);
  // Distinct from follow-up share (62%) so the illustrative unique estimate is not mistaken for follow-up volume.
  const uniqueOutpatients = Math.max(1, Math.round(visits * 0.61));
  const newVisits = Math.round(visits * 0.38);
  const followUpVisits = Math.max(0, visits - newVisits);
  const walkInShare = Math.round((0.16 + pressure * 0.25) * 1000) / 1000;
  const walkInVisits = Math.round(visits * walkInShare);
  const sameDayVisits = Math.round(visits * (0.1 + pressure * 0.08));
  // Sessions first, then visits/session so the displayed rate matches visits ÷ sessions after rounding.
  const clinicSessions = Math.max(1, Math.round(visits / Math.max(11.2 + pressure * 1.6, 1)));
  const visitsPerSession = Math.round((visits / clinicSessions) * 10) / 10;
  const sessionUtilization = Math.min(0.98, Math.round((0.76 + pressure * 0.18) * 1000) / 1000);

  const waitMedian = period === 'year' ? fact.opWaitMedianMin : weighted(rows, 'opWaitMedianMin', 'apptAttended');
  const waitP90 = period === 'year' ? fact.opWaitP90Min : weighted(rows, 'opWaitP90Min', 'apptAttended');
  const waitAvg = period === 'year' ? fact.opWaitAvgMin : weighted(rows, 'opWaitAvgMin', 'apptAttended');
  const consultDuration = Math.round((18 + pressure * 6) * 10) / 10;
  const registrationToConsult = Math.round(waitMedian * 0.72 * 10) / 10;
  // Constructed cycle clocks (wait + consult) — not patient-level medians of measured cycle times.
  const cycleMedian = Math.round((waitMedian + consultDuration) * 10) / 10;
  const cycleP90 = Math.round((waitP90 + consultDuration * 1.15) * 10) / 10;
  const bedOcc = fact.staffedBeds ? fact.occupiedBeds / fact.staffedBeds : 0.8;
  const onTimeStartRate = Math.round((0.74 - bedOcc * 0.05) * 1000) / 1000;
  const lateStartShare = Math.round((1 - onTimeStartRate) * 1000) / 1000;
  // Delayed clinic sessions = sessions whose first-provider start was late (session clock, not visit count).
  const delayedSessions = Math.max(0, Math.round(clinicSessions * lateStartShare));
  const waitThresholdMin = 30;
  const exceedingWait = Math.round(visits * Math.min(0.28, 0.08 + (waitMedian - 18) / 120));
  const withinTargetRate = Math.round((0.72 - pressure * 0.25) * 1000) / 1000;
  const withinTarget = Math.round(visits * withinTargetRate);

  const docCompletionRate = Math.round((0.86 - pressure * 0.15) * 1000) / 1000;
  const noteCompletionRate = Math.round((0.88 - pressure * 0.12) * 1000) / 1000;
  const followUpPlanRate = Math.round((0.81 - pressure * 0.18) * 1000) / 1000;
  const followUpRecommendRate = Math.round((0.54 + pressure * 0.1) * 1000) / 1000;
  const referralCompletionRate = Math.round((0.79 - pressure * 0.2) * 1000) / 1000;
  const followUpCoordRate = Math.round((0.77 - pressure * 0.16) * 1000) / 1000;
  const outstandingActions = Math.max(12, Math.round(completed * 0.028 * (1 + pressure * 1.2)));
  const unplannedReturnRate = 0.028;
  const unplannedReturns = Math.round(completed * unplannedReturnRate);

  // Mutually exclusive referral statuses against one recommended-referral cohort.
  const referralsRecommended = Math.max(1, Math.round(completed * followUpRecommendRate * 0.35));
  const referralCompleted = Math.round(referralsRecommended * referralCompletionRate);
  const pendingReferrals = Math.max(0, referralsRecommended - referralCompleted);
  const referralOpen = Math.round(pendingReferrals * 0.45);
  const referralInProgress = Math.max(0, pendingReferrals - referralOpen);
  const referralTotal = referralOpen + referralInProgress + referralCompleted;

  const specialtyVisits = splitExact(visits, SPECIALTY_WEIGHTS);
  const specialtyCompleted = splitExact(completed, SPECIALTY_WEIGHTS);
  const specialtyWaits = SPECIALTIES.map((_, index) => Math.round((waitMedian * (0.82 + index * 0.045)) * 10) / 10);
  const delayParts = allocateDelayContribution(exceedingWait, specialtyVisits, specialtyWaits, waitMedian);
  const pendingActionParts = splitExact(outstandingActions, SPECIALTY_WEIGHTS);

  const specialties = SPECIALTIES.map((id, index) => {
    const wait = specialtyWaits[index];
    const cycle = Math.round((wait + consultDuration * (0.9 + (index % 3) * 0.05)) * 10) / 10;
    const util = Math.min(0.98, Math.round((sessionUtilization * (0.88 + (index % 4) * 0.04)) * 1000) / 1000);
    const followRecs = Math.round(specialtyCompleted[index] * followUpRecommendRate * (0.85 + (index % 5) * 0.04));
    return {
      id,
      visits: specialtyVisits[index],
      completed: specialtyCompleted[index],
      waitMedian: wait,
      cycleMedian: cycle,
      sessionUtilization: util,
      followRecommendations: followRecs,
      pendingActions: pendingActionParts[index],
      delayContribution: delayParts[index],
    };
  });

  const monthlyVisits = rows.map((row) => row.month.apptAttended);
  const monthlyCompleted = monthlyVisits.map((value) => Math.round(value * completionRate));
  const monthlyDoc = weightedRateSeries(docCompletionRate, monthlyVisits, 0.012);
  const monthlyFollowCoord = weightedRateSeries(followUpCoordRate, monthlyVisits, 0.01);
  const monthlyWait = rows.map((row) => row.month.opWaitMedianMin);

  const dayWeights = [0.08, 0.16, 0.17, 0.16, 0.17, 0.15, 0.11];
  const visitsByDay = splitExact(visits, dayWeights).map((count, index) => ({ name: WEEKDAYS[index], count }));

  const hourWeights = Array.from({ length: 12 }, (_, index) => {
    const hour = index + 7;
    if (hour >= 8 && hour <= 11) return 1.35 - (hour - 8) * 0.08;
    if (hour >= 13 && hour <= 16) return 1.15 - (hour - 13) * 0.05;
    return 0.55;
  });
  const arrivalsByHour = splitExact(visits, hourWeights);
  const startsByHour = splitExact(completed, hourWeights.map((weight, index) => weight * (0.92 + (index % 3) * 0.02)));
  const hourLabels = hourWeights.map((_, index) => `${index + 7}:00`);

  const waitDistribution = buildWaitDistribution(visits, waitMedian, waitP90, exceedingWait, waitThresholdMin);

  // Pathway milestones for the same period cohort (not four additive populations).
  const flowArrived = visits;
  const flowRegistered = Math.round(visits * 0.97);
  const flowConsultationStarted = Math.min(flowRegistered, completed + Math.round(incomplete * 0.35));
  const flowCompleted = completed;

  // Mutually exclusive consultation outcomes that partition attended visits.
  const referredOnward = Math.min(completed, Math.round(completed * 0.12));
  const completedNoReferral = Math.max(0, completed - referredOnward);
  const outcomes = [
    { id: 'Completed, no onward referral', count: completedNoReferral },
    { id: 'Completed with onward referral', count: referredOnward },
    { id: 'Incomplete / left early', count: incomplete },
  ];

  return {
    hospital,
    year,
    period,
    periodLabel: period === 'year' ? `Full year ${year}` : `${period} ${year}`,
    visits,
    completed,
    incomplete,
    completionRate,
    uniqueOutpatients,
    newVisits,
    followUpVisits,
    walkInShare,
    walkInVisits,
    sameDayVisits,
    clinicSessions,
    visitsPerSession,
    sessionUtilization,
    waitMedian,
    waitP90,
    waitAvg,
    consultDuration,
    registrationToConsult,
    cycleMedian,
    cycleP90,
    cycleBasis: 'constructed as arrival-to-provider + illustrative consultation duration — not a measured patient-level cycle median',
    onTimeStartRate,
    lateStartShare,
    delayedSessions,
    waitThresholdMin,
    exceedingWait,
    withinTarget,
    withinTargetRate,
    docCompletionRate,
    noteCompletionRate,
    followUpPlanRate,
    followUpRecommendRate,
    referralCompletionRate,
    followUpCoordRate,
    referralsRecommended,
    pendingReferrals,
    outstandingActions,
    unplannedReturnRate,
    unplannedReturns,
    specialties,
    visitsByDay,
    hourLabels,
    arrivalsByHour,
    startsByHour,
    waitDistribution,
    flowArrived,
    flowRegistered,
    flowConsultationStarted,
    flowCompleted,
    referralOpen,
    referralInProgress,
    referralCompleted,
    referralTotal,
    outcomes,
    referredOnward,
    completedNoReferral,
    labels: rows.map((row) => row.label),
    monthlyVisits,
    monthlyCompleted,
    monthlyDoc,
    monthlyFollowCoord,
    monthlyWait,
    monthlyNew: monthlyVisits.map((value) => Math.round(value * (newVisits / Math.max(visits, 1)))),
    monthlyFollowUp: monthlyVisits.map((value) => Math.round(value * (followUpVisits / Math.max(visits, 1)))),
  };
}

export type OpdView = ReturnType<typeof buildOpdView>;
