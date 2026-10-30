import { SITE_SPECS, scenarioFor, type SiteCode } from '@/showcase/facts';
import { splitExact } from './ipdView';
import { sumKey, type ReportPeriod } from './period';

/** Surgical service specialties — distinct from clinic/OPD specialty mix. */
export const SURGICAL_SPECIALTIES = [
  'General Surgery',
  'Orthopedics',
  'Cardiac',
  'Neurosurgery',
  'Women',
  'ENT',
  'Ophthalmology',
  'Urology',
] as const;

const SPECIALTY_WEIGHTS = [0.22, 0.18, 0.1, 0.08, 0.14, 0.1, 0.08, 0.1];
/** Staffed-hour room weights (availability / session length). */
const ROOM_STAFFED_WEIGHTS = [1.08, 1.04, 1.0, 0.98, 0.95, 0.92, 0.88, 0.85, 0.82, 0.78];
/** Used-hour room weights — distinct efficiency mix so utilization varies by room. */
const ROOM_USED_WEIGHTS = [1.12, 0.96, 1.05, 0.9, 1.0, 0.88, 0.94, 0.86, 0.8, 0.84];

const WAIT_BANDS = [
  { name: '0–14 days', share: 0.22 },
  { name: '15–30 days', share: 0.28 },
  { name: '31–60 days', share: 0.26 },
  { name: '61–90 days', share: 0.14 },
  { name: '>90 days', share: 0.1 },
];

const CANCEL_REASONS = [
  { name: 'Patient / clinical', share: 0.32 },
  { name: 'No postoperative bed', share: 0.22 },
  { name: 'OR overrun earlier', share: 0.18 },
  { name: 'Staffing / anaesthesia', share: 0.16 },
  { name: 'Equipment / other', share: 0.12 },
];

/** Single elective share for scheduled, completed, and cancelled partitions. */
export const ELECTIVE_SHARE = 0.78;
const SAME_DAY_CANCEL_SHARE = 0.45;
const WAIT_TARGET_DAYS = 42;
/** Mean minutes late when a first case starts after the scheduled window. */
const MEAN_LATE_START_MIN = 33;
/** Normative turnover minutes used to compute excess (recoverable) turnover. */
const NORMATIVE_TURNOVER_MIN = 24;
const HOURS_PER_THEATRE_DAY = 8;

function periodRows(hospital: string, year: number, period: 'Q1' | 'Q2' | 'Q3' | 'Q4') {
  const start = { Q1: 0, Q2: 3, Q3: 6, Q4: 9 }[period];
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return scenarioFor(hospital, year).months.slice(start, start + 3).map((month, index) => ({
    label: names[start + index],
    month,
  }));
}

function daysInPeriod(period: ReportPeriod, year: number): number {
  if (period === 'year') return year % 4 === 0 ? 366 : 365;
  if (period === 'Q1') return year % 4 === 0 ? 91 : 90;
  if (period === 'Q2') return 91;
  if (period === 'Q3') return 92;
  return year % 4 === 0 ? 92 : 91;
}

function workingDaysInPeriod(period: ReportPeriod, year: number): number {
  return Math.max(1, Math.round(daysInPeriod(period, year) * 5 / 7));
}

function tilt(hospital: string, year: number): number {
  const fact = scenarioFor(hospital, year).focus;
  const occ = fact.staffedBeds ? fact.occupiedBeds / fact.staffedBeds : 0.8;
  return Math.min(0.14, Math.max(0, occ - 0.76));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Illustrative bed-constraint share tied to occupancy context.
 * Applied once as a haircut on recoverable hours — bed is NOT also a delay driver.
 */
export function bedConstrainedShareFromOcc(occ: number): number {
  return Math.round(clamp((occ - 0.78) / 0.2, 0.12, 0.42) * 1000) / 1000;
}

/** Shared Surgery scenario for screens, Assist, alerts, and what-if. */
export function buildSurgeryView(hospital: string, year: number, period: ReportPeriod = 'year') {
  const rows = period === 'year'
    ? scenarioFor(hospital, year).months.map((month, index) => ({
      label: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index],
      month,
    }))
    : periodRows(hospital, year, period);
  const pressure = tilt(hospital, year);
  const periodLabel = period === 'year' ? `Full year ${year}` : `${period} ${year}`;
  const observationDate = period === 'year'
    ? `31 Dec ${year}`
    : ({ Q1: `31 Mar ${year}`, Q2: `30 Jun ${year}`, Q3: `30 Sep ${year}`, Q4: `31 Dec ${year}` } as const)[period];
  const periodDays = daysInPeriod(period, year);
  const workingDays = workingDaysInPeriod(period, year);
  const theatres = SITE_SPECS[hospital as SiteCode]?.theatres ?? 6;
  const fact = scenarioFor(hospital, year).focus;
  const bedOcc = fact.staffedBeds ? fact.occupiedBeds / fact.staffedBeds : 0.8;

  const scheduled = sumKey(rows, 'surgRequests');
  const completed = sumKey(rows, 'surgCompleted');
  const cancelled = sumKey(rows, 'surgCancelled');

  // --- Elective / emergency (one share for all outcome partitions) ---
  const electiveScheduled = Math.round(scheduled * ELECTIVE_SHARE);
  const emergencyScheduled = Math.max(0, scheduled - electiveScheduled);
  const emergencyShare = scheduled ? emergencyScheduled / scheduled : 0;
  const electiveCompleted = Math.round(completed * ELECTIVE_SHARE);
  const emergencyCompleted = Math.max(0, completed - electiveCompleted);
  const electiveCancelled = Math.round(cancelled * ELECTIVE_SHARE);
  const emergencyCancelled = Math.max(0, cancelled - electiveCancelled);

  const sameDayCancels = Math.round(cancelled * SAME_DAY_CANCEL_SHARE);
  const sameDayCancelRate = scheduled ? sameDayCancels / scheduled : 0;
  const cancellationRate = scheduled ? cancelled / scheduled : 0;
  const completionRate = scheduled ? completed / scheduled : 0;

  // --- OR session / theatre-day accounting ---
  const theatreDays = theatres * workingDays;
  const throughput = theatreDays ? completed / theatreDays : 0;
  const priorYearCompleted = period === 'year'
    ? scenarioFor(hospital, Math.max(2024, year - 1)).focus.surgCompleted
    : Math.round(completed / 1.045);
  const volumeVariance = priorYearCompleted
    ? (completed - priorYearCompleted) / Math.abs(priorYearCompleted)
    : 0;

  const allocatedHours = Math.round(theatreDays * HOURS_PER_THEATRE_DAY * 0.95);
  const staffedHours = Math.round(theatreDays * HOURS_PER_THEATRE_DAY * (0.9 - pressure * 0.04));
  const medianProcedureMin = Math.round(78 + pressure * 12);
  const medianTurnoverMin = Math.round(28 + pressure * 14);
  const procedureHours = Math.round((completed * medianProcedureMin) / 60);
  /** Between-case turnovers ≈ completed cases minus one first case per staffed theatre-day. */
  const turnoverEvents = Math.max(0, completed - theatreDays);
  const turnoverHours = Math.round((turnoverEvents * medianTurnoverMin) / 60);
  const usedHours = procedureHours + turnoverHours;
  const inSessionUsedHours = Math.min(usedHours, staffedHours);
  const unusedHours = Math.max(0, staffedHours - inSessionUsedHours);
  const overtimeHours = Math.max(0, usedHours - staffedHours);
  /** Uncapped: overruns appear as overtime, not a silent 99.5% ceiling. */
  const orUtilization = staffedHours ? usedHours / staffedHours : 0;

  // --- First-case cohort (eligible = staffed theatre-days) ---
  const eligibleFirstCases = theatreDays;
  const targetOnTimeRate = Math.round((0.71 - pressure * 0.35) * 1000) / 1000;
  const onTimeFirstCases = Math.round(eligibleFirstCases * targetOnTimeRate);
  const lateFirstCases = Math.max(0, eligibleFirstCases - onTimeFirstCases);
  const firstCaseOnTimeRate = eligibleFirstCases
    ? Math.round((onTimeFirstCases / eligibleFirstCases) * 1000) / 1000
    : 0;
  const lateStartHours = Math.round((lateFirstCases * MEAN_LATE_START_MIN) / 60);

  // Rooms — distinct staffed vs used weights so utilization varies
  const roomCount = theatres;
  const staffedWeights = ROOM_STAFFED_WEIGHTS.slice(0, roomCount);
  const usedWeights = ROOM_USED_WEIGHTS.slice(0, roomCount);
  const roomStaffed = splitExact(staffedHours, staffedWeights);
  const roomUsed = splitExact(usedHours, usedWeights);
  const roomLate = splitExact(lateStartHours, usedWeights);
  const roomOnTimeCounts = splitExact(onTimeFirstCases, staffedWeights);
  const roomEligible = splitExact(eligibleFirstCases, staffedWeights);
  const rooms = Array.from({ length: roomCount }, (_, index) => {
    const staffed = roomStaffed[index] || 1;
    const used = roomUsed[index];
    const eligible = Math.max(1, roomEligible[index]);
    return {
      id: `OR-${index + 1}`,
      staffedHours: staffed,
      usedHours: used,
      utilization: staffed ? used / staffed : 0,
      lateStartHours: roomLate[index],
      firstCaseOnTime: Math.round((roomOnTimeCounts[index] / eligible) * 1000) / 1000,
    };
  });

  // Specialties — scheduled = completed + cancelled per specialty
  const specialtyScheduled = splitExact(scheduled, SPECIALTY_WEIGHTS);
  const specialtyCancelled = splitExact(cancelled, SPECIALTY_WEIGHTS);
  // Identity: scheduled_i = completed_i + cancelled_i; sums telescope to hospital totals.
  const specialtyCompleted = specialtyScheduled.map((req, index) => Math.max(0, req - specialtyCancelled[index]));

  // --- Elective waitlist monthly ledger (emergency bypasses) ---
  const waitTargetDays = WAIT_TARGET_DAYS;
  const openingBacklog = Math.round(electiveScheduled * (0.18 + pressure * 0.25));
  const monthlyElectiveScheduled = rows.map((row) => Math.round(row.month.surgRequests * ELECTIVE_SHARE));
  // Keep monthly elective scheduled summing to period elective scheduled
  const electiveSchedAdj = splitExact(electiveScheduled, monthlyElectiveScheduled.map((value) => Math.max(value, 1)));
  const monthlyElectiveCompleted = splitExact(electiveCompleted, rows.map((row) => Math.max(row.month.surgCompleted, 1)));
  const monthlyElectiveCancelled = splitExact(electiveCancelled, rows.map((row) => Math.max(row.month.surgCancelled, 1)));

  const monthlyAdded = electiveSchedAdj.map((value) => Math.round(value * (0.92 + pressure * 0.04)));
  const monthlyCompletedFromWait = monthlyElectiveCompleted.map((value) => value); // elective completions leave waitlist
  const monthlyExits = monthlyElectiveCancelled.map((value) => Math.round(value * 0.55)); // cancel may remain waiting; only 55% exit

  const monthlyBacklog: number[] = [];
  const monthlyOpening: number[] = [];
  let cursor = openingBacklog;
  for (let index = 0; index < rows.length; index += 1) {
    monthlyOpening.push(cursor);
    const close = Math.max(0, cursor + monthlyAdded[index] - monthlyCompletedFromWait[index] - monthlyExits[index]);
    monthlyBacklog.push(close);
    cursor = close;
  }
  const closingBacklog = monthlyBacklog[monthlyBacklog.length - 1] ?? openingBacklog;
  const addedToWaitlist = monthlyAdded.reduce((sum, value) => sum + value, 0);
  const completedFromWaitlist = monthlyCompletedFromWait.reduce((sum, value) => sum + value, 0);
  const otherExits = monthlyExits.reduce((sum, value) => sum + value, 0);
  // Reconcile identity to closing (ledger may drift from period-level formula due to monthly caps)
  const waitlistGrowth = closingBacklog - openingBacklog;
  const medianWaitDays = Math.round((12 + pressure * 22) * 10) / 10;
  const p90WaitDays = Math.round((medianWaitDays * 2.35 + pressure * 10) * 10) / 10;
  const overdueCases = Math.min(closingBacklog, Math.round(closingBacklog * (0.12 + pressure * 0.35)));
  const withinTargetCases = Math.max(0, closingBacklog - overdueCases);
  const withinTargetShare = closingBacklog ? withinTargetCases / closingBacklog : 1;

  const waitBandCounts = splitExact(closingBacklog, WAIT_BANDS.map((band) => band.share))
    .map((count, index) => ({ name: WAIT_BANDS[index].name, count }));

  const specialtyBacklog = splitExact(closingBacklog, SPECIALTY_WEIGHTS);
  const specialtyOverdue = splitExact(overdueCases, SPECIALTY_WEIGHTS);
  const specialties = SURGICAL_SPECIALTIES.map((id, index) => {
    const bump = ((index % 4) - 1.5) * (1.8 + pressure * 4);
    return {
      id,
      scheduled: specialtyScheduled[index],
      completed: specialtyCompleted[index],
      cancelled: specialtyCancelled[index],
      backlog: specialtyBacklog[index],
      medianWait: Math.max(5, Math.round((medianWaitDays + bump) * 10) / 10),
      overdue: specialtyOverdue[index],
      turnoverMin: Math.max(18, Math.round(medianTurnoverMin + ((index % 3) - 1) * 4)),
    };
  });

  // --- Quality: counts first, then rates; monthly via splitExact ---
  const unplannedReturns = Math.round(completed * (0.011 + pressure * 0.008));
  const complications = Math.round(completed * (0.028 + pressure * 0.012));
  const checklistComplete = Math.round(completed * (0.97 - pressure * 0.04));
  const infections = Math.round(completed * (0.009 + pressure * 0.006));
  const docsComplete = Math.round(completed * (0.94 - pressure * 0.05));
  const escalations = Math.round(completed * (0.015 + pressure * 0.01));
  const unplannedReturnRate = completed ? unplannedReturns / completed : 0;
  const complicationRate = completed ? complications / completed : 0;
  const checklistRate = completed ? checklistComplete / completed : 0;
  const infectionRate = completed ? infections / completed : 0;
  const docCompletionRate = completed ? docsComplete / completed : 0;
  const escalationRate = completed ? escalations / completed : 0;

  const monthlyCompleted = rows.map((row) => row.month.surgCompleted);
  const monthlyCompletedWeights = monthlyCompleted.map((value) => Math.max(value, 1));
  const monthlyReturns = splitExact(unplannedReturns, monthlyCompletedWeights);
  const monthlyChecklistComplete = splitExact(checklistComplete, monthlyCompletedWeights);
  const monthlyChecklist = monthlyChecklistComplete.map((count, index) => {
    const den = monthlyCompleted[index] || 1;
    return Math.round((count / den) * 1000) / 10;
  });
  const specialtyComplications = splitExact(complications, specialtyCompleted.map((value) => Math.max(value, 1)));
  const specialtyDocsComplete = splitExact(docsComplete, specialtyCompleted.map((value) => Math.max(value, 1)));
  const specialtyDocRates = specialtyDocsComplete.map((count, index) => {
    const den = specialtyCompleted[index] || 1;
    return Math.round((count / den) * 1000) / 10;
  });

  // --- Capacity: exclusive delay drivers (no redistributed blend; bed is a haircut only) ---
  const normativeTurnoverHours = Math.round((turnoverEvents * NORMATIVE_TURNOVER_MIN) / 60);
  const excessTurnoverHours = Math.max(0, turnoverHours - normativeTurnoverHours);
  const sameDayCancelBlockHours = Math.round((sameDayCancels * medianProcedureMin) / 60);
  // Equipment/setup: small exclusive residual from unused staffed time (not overlapping late/turnover/cancel)
  const equipmentSetupHours = Math.min(
    Math.round(unusedHours * 0.08),
    Math.max(0, Math.round(staffedHours * 0.01)),
  );

  const delayDriverHours = [
    { name: 'Late first-case starts', hours: lateStartHours },
    { name: 'Extended turnover', hours: excessTurnoverHours },
    { name: 'Same-day cancellation gaps', hours: sameDayCancelBlockHours },
    { name: 'Equipment / setup', hours: equipmentSetupHours },
  ];
  const recoverableOrHours = delayDriverHours.reduce((sum, item) => sum + item.hours, 0);
  /** Top operational drivers (subset annotation — not a second headline KPI). */
  const avoidableDelayHours = delayDriverHours.slice(0, 3).reduce((sum, item) => sum + item.hours, 0);

  const avgCaseHours = medianProcedureMin / 60 + medianTurnoverMin / 60;
  const bedConstrainedShare = bedConstrainedShareFromOcc(bedOcc);
  const bedConstrainedHours = Math.round(recoverableOrHours * bedConstrainedShare);
  const feasibleRecoverableHours = Math.max(0, recoverableOrHours - bedConstrainedHours);
  const potentialAdditionalCases = Math.max(
    0,
    Math.floor(feasibleRecoverableHours / Math.max(avgCaseHours, 0.5)),
  );
  const eligibleBacklogCases = Math.min(
    closingBacklog,
    Math.round(closingBacklog * 0.55 + overdueCases * 0.4),
  );
  const additionalCases = Math.min(potentialAdditionalCases, eligibleBacklogCases);
  const capacityGainHours = Math.round(additionalCases * avgCaseHours * 10) / 10;
  const scenarioImprovementPct = staffedHours
    ? Math.round((capacityGainHours / staffedHours) * 1000) / 10
    : 0;

  const cancelReasonCounts = splitExact(cancelled, CANCEL_REASONS.map((reason) => reason.share))
    .map((count, index) => ({ name: CANCEL_REASONS[index].name, count }));
  const bedRelatedCancels = cancelReasonCounts.find((item) => item.name === 'No postoperative bed')?.count ?? 0;

  const monthlyScheduled = rows.map((row) => row.month.surgRequests);
  const monthlyCancelled = rows.map((row) => row.month.surgCancelled);
  const monthlySameDayRate = rows.map((row) => {
    const req = row.month.surgRequests || 1;
    return Math.round(((row.month.surgCancelled * SAME_DAY_CANCEL_SHARE) / req) * 1000) / 10;
  });
  // Monthly first-case / util: weighted so period rate is reconstructible from counts, not noise
  const monthlyEligibleFirst = splitExact(eligibleFirstCases, monthlyCompletedWeights);
  const monthlyOnTimeFirst = splitExact(onTimeFirstCases, monthlyCompletedWeights);
  const monthlyFirstCase = monthlyOnTimeFirst.map((count, index) => {
    const den = monthlyEligibleFirst[index] || 1;
    return Math.round((count / den) * 1000) / 10;
  });
  const monthlyStaffed = splitExact(staffedHours, monthlyCompletedWeights);
  const monthlyUsed = splitExact(usedHours, monthlyCompletedWeights);
  const monthlyUtil = monthlyUsed.map((used, index) => {
    const staffed = monthlyStaffed[index] || 1;
    return Math.round((used / staffed) * 1000) / 10;
  });

  const safetyEventTypes = [
    { name: 'Unplanned OR return', count: unplannedReturns },
    { name: 'Complication flag', count: complications },
    { name: 'Infection flag', count: infections },
    { name: 'Escalation', count: escalations },
  ];

  return {
    hospital,
    year,
    period,
    periodLabel,
    observationDate,
    theatres,
    theatreDays,
    workingDays,
    periodDays,
    labels: rows.map((row) => row.label),

    scheduled,
    completed,
    cancelled,
    electiveScheduled,
    emergencyScheduled,
    electiveCompleted,
    emergencyCompleted,
    electiveCancelled,
    emergencyCancelled,
    emergencyShare,
    sameDayCancels,
    sameDayCancelRate,
    cancellationRate,
    completionRate,
    throughput: Math.round(throughput * 100) / 100,
    volumeVariance: Math.round(volumeVariance * 1000) / 1000,

    allocatedHours,
    staffedHours,
    procedureHours,
    turnoverEvents,
    turnoverHours,
    usedHours,
    inSessionUsedHours,
    unusedHours,
    overtimeHours,
    orUtilization: Math.round(orUtilization * 1000) / 1000,
    eligibleFirstCases,
    onTimeFirstCases,
    lateFirstCases,
    firstCaseOnTimeRate,
    medianTurnoverMin,
    medianProcedureMin,
    lateStartHours,
    rooms,

    openingBacklog,
    addedToWaitlist,
    completedFromWaitlist,
    otherExits,
    closingBacklog,
    waitlistGrowth,
    medianWaitDays,
    p90WaitDays,
    waitTargetDays,
    overdueCases,
    withinTargetCases,
    withinTargetShare: Math.round(withinTargetShare * 1000) / 1000,
    waitBandCounts,
    monthlyOpening,

    unplannedReturnRate: Math.round(unplannedReturnRate * 1000) / 1000,
    unplannedReturns,
    complicationRate: Math.round(complicationRate * 1000) / 1000,
    complications,
    checklistRate: Math.round(checklistRate * 1000) / 1000,
    checklistComplete,
    infectionRate: Math.round(infectionRate * 1000) / 1000,
    infections,
    docCompletionRate: Math.round(docCompletionRate * 1000) / 1000,
    docsComplete,
    escalationRate: Math.round(escalationRate * 1000) / 1000,
    escalations,
    safetyEventTypes,
    specialtyComplications,
    specialtyDocRates,
    qualityOverlapNote: 'Quality flags may overlap on the same case and must not be summed as a unique patient count.',

    recoverableOrHours,
    avoidableDelayHours,
    potentialAdditionalCases,
    additionalCases,
    eligibleBacklogCases,
    capacityGainHours,
    scenarioImprovementPct,
    delayDriverHours,
    bedConstrainedShare,
    bedConstrainedHours,
    feasibleRecoverableHours,
    cancelReasonCounts,
    bedRelatedCancels,
    bedOccupancyContext: Math.round(bedOcc * 1000) / 1000,
    avgCaseHours: Math.round(avgCaseHours * 100) / 100,

    specialties,
    monthlyScheduled,
    monthlyCompleted,
    monthlyCancelled,
    monthlySameDayRate,
    monthlyFirstCase,
    monthlyUtil,
    monthlyBacklog,
    monthlyReturns,
    monthlyChecklist,

    methodology: {
      waitClock: 'Decision-to-treat / waitlist entry → procedure date for elective cases. Emergency cases bypass the elective waitlist. Monthly ledger: open + added − completed − exits = close.',
      orUtilization: 'OR Utilization = (procedure hours + turnover hours) ÷ staffed OR hours (uncapped). In-session used + unused = staffed. Overtime = max(0, used − staffed). Turnover events = completed − theatre-days.',
      firstCase: `Eligible first cases = staffed theatre-days. Late-start hours = late first cases × ${MEAN_LATE_START_MIN} min. Illustrative punctuality window — not an external standard.`,
      quality: 'Illustrative safety process and outcome flags ÷ completed cases. Not validated clinical evidence.',
      capacity: 'Recoverable hours = exclusive drivers (late starts + excess turnover + same-day cancel blocks + equipment). Bed constraint is a single occupancy-tied haircut — not a second delay driver.',
    },
  };
}

export type SurgeryView = ReturnType<typeof buildSurgeryView>;
