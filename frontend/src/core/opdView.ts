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
  const uniqueOutpatients = Math.max(1, Math.round(visits * 0.62));
  const newVisits = Math.round(visits * 0.38);
  const followUpVisits = Math.max(0, visits - newVisits);
  const walkInShare = Math.round((0.16 + pressure * 0.25) * 1000) / 1000;
  const walkInVisits = Math.round(visits * walkInShare);
  const sameDayVisits = Math.round(visits * (0.1 + pressure * 0.08));
  const visitsPerSession = Math.round((11.2 + pressure * 1.6) * 10) / 10;
  const clinicSessions = Math.max(1, Math.round(visits / Math.max(visitsPerSession, 1)));
  const sessionUtilization = Math.round((0.76 + pressure * 0.18) * 1000) / 1000;

  const waitMedian = period === 'year' ? fact.opWaitMedianMin : weighted(rows, 'opWaitMedianMin', 'apptAttended');
  const waitP90 = period === 'year' ? fact.opWaitP90Min : weighted(rows, 'opWaitP90Min', 'apptAttended');
  const waitAvg = period === 'year' ? fact.opWaitAvgMin : weighted(rows, 'opWaitAvgMin', 'apptAttended');
  const consultDuration = Math.round((18 + pressure * 6) * 10) / 10;
  const registrationToConsult = Math.round(waitMedian * 0.72 * 10) / 10;
  const cycleMedian = Math.round((waitMedian + consultDuration) * 10) / 10;
  const cycleP90 = Math.round((waitP90 + consultDuration * 1.15) * 10) / 10;
  const bedOcc = fact.staffedBeds ? fact.occupiedBeds / fact.staffedBeds : 0.8;
  // Align with showcase bind for kpi_clinic_on_time_start_rate so cards, alerts, and Assist match.
  const onTimeStartRate = Math.round((0.74 - bedOcc * 0.05) * 1000) / 1000;
  const delayedSessions = Math.max(0, Math.round(clinicSessions * (1 - onTimeStartRate) * 0.55));
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
  const pendingReferrals = Math.max(8, Math.round(completed * 0.035 * (1 + pressure)));
  const outstandingActions = Math.max(12, Math.round(completed * 0.028 * (1 + pressure * 1.2)));
  const unplannedReturnRate = 0.028;
  const unplannedReturns = Math.round(completed * unplannedReturnRate);

  const specialtyVisits = splitExact(visits, SPECIALTY_WEIGHTS);
  const specialtyCompleted = splitExact(completed, SPECIALTY_WEIGHTS);
  const specialties = SPECIALTIES.map((id, index) => {
    const specialtyVisitsCount = specialtyVisits[index];
    const wait = Math.round((waitMedian * (0.82 + index * 0.045)) * 10) / 10;
    const cycle = Math.round((wait + consultDuration * (0.9 + (index % 3) * 0.05)) * 10) / 10;
    const util = Math.round((sessionUtilization * (0.88 + (index % 4) * 0.04)) * 1000) / 1000;
    const followRecs = Math.round(specialtyCompleted[index] * followUpRecommendRate * (0.85 + (index % 5) * 0.04));
    const pendingActions = splitExact(outstandingActions, SPECIALTY_WEIGHTS)[index];
    const delayShare = Math.max(0.04, (wait - waitMedian * 0.75) / Math.max(waitMedian, 1));
    return {
      id,
      visits: specialtyVisitsCount,
      completed: specialtyCompleted[index],
      waitMedian: wait,
      cycleMedian: cycle,
      sessionUtilization: Math.min(0.98, util),
      followRecommendations: followRecs,
      pendingActions,
      delayContribution: Math.round(exceedingWait * delayShare),
    };
  });
  const delayFix = specialties.reduce((sum, item) => sum + item.delayContribution, 0);
  if (delayFix !== exceedingWait && specialties.length) {
    specialties[0].delayContribution += exceedingWait - delayFix;
  }

  const monthlyVisits = rows.map((row) => row.month.apptAttended);
  const monthlyCompleted = monthlyVisits.map((value) => Math.round(value * completionRate));
  const monthlyDoc = monthlyVisits.map((_, index) => Math.round((docCompletionRate - (index % 3) * 0.01) * 1000) / 1000);
  const monthlyFollowCoord = monthlyVisits.map((_, index) => Math.round((followUpCoordRate - (index % 4) * 0.008) * 1000) / 1000);
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

  const waitBins = [
    { name: '0–15 min', share: 0.28 },
    { name: '15–30 min', share: 0.34 },
    { name: '30–45 min', share: 0.22 },
    { name: '45–60 min', share: 0.1 },
    { name: '>60 min', share: 0.06 },
  ];
  const waitDistribution = waitBins.map((bin, index) => ({
    name: bin.name,
    count: splitExact(visits, waitBins.map((item) => item.share))[index],
  }));

  const referralOpen = pendingReferrals;
  const referralInProgress = Math.round(pendingReferrals * 0.55);
  const referralCompleted = Math.round(completed * followUpRecommendRate * referralCompletionRate * 0.35);
  const referralTotal = referralOpen + referralInProgress + referralCompleted;

  const outcomes = [
    { id: 'Completed consultation', count: completed },
    { id: 'Incomplete / left early', count: incomplete },
    { id: 'Referred onward', count: Math.round(completed * 0.12) },
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
    onTimeStartRate,
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
    referralOpen,
    referralInProgress,
    referralCompleted,
    referralTotal,
    outcomes,
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
