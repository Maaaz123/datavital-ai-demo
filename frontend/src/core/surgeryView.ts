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
const ROOM_WEIGHTS_BASE = [1.05, 1.0, 0.98, 0.95, 0.92, 0.9, 0.88, 0.85, 0.82, 0.8];

const WAIT_BANDS = [
  { name: '0–14 days', share: 0.22 },
  { name: '15–30 days', share: 0.28 },
  { name: '31–60 days', share: 0.26 },
  { name: '61–90 days', share: 0.14 },
  { name: '>90 days', share: 0.1 },
];

const DELAY_DRIVERS = [
  { name: 'Late first-case starts', share: 0.28 },
  { name: 'Extended turnover', share: 0.24 },
  { name: 'Same-day cancellation gaps', share: 0.22 },
  { name: 'Bed-related holds', share: 0.16 },
  { name: 'Equipment / setup', share: 0.1 },
];

const CANCEL_REASONS = [
  { name: 'Patient / clinical', share: 0.32 },
  { name: 'No postoperative bed', share: 0.22 },
  { name: 'OR overrun earlier', share: 0.18 },
  { name: 'Staffing / anaesthesia', share: 0.16 },
  { name: 'Equipment / other', share: 0.12 },
];

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
  return 91;
}

function tilt(hospital: string, year: number): number {
  const fact = scenarioFor(hospital, year).focus;
  const occ = fact.staffedBeds ? fact.occupiedBeds / fact.staffedBeds : 0.8;
  return Math.min(0.14, Math.max(0, occ - 0.76));
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
  const theatres = SITE_SPECS[hospital as SiteCode]?.theatres ?? 6;
  const fact = scenarioFor(hospital, year).focus;

  const scheduled = sumKey(rows, 'surgRequests');
  const completed = sumKey(rows, 'surgCompleted');
  const cancelled = sumKey(rows, 'surgCancelled');
  // Identity from scenario: completed + cancelled = scheduled (requests).
  const electiveShare = 0.78;
  const electiveScheduled = Math.round(scheduled * electiveShare);
  const emergencyScheduled = Math.max(0, scheduled - electiveScheduled);
  const emergencyShare = scheduled ? emergencyScheduled / scheduled : 0;
  const electiveCompleted = Math.round(completed * 0.8);
  const emergencyCompleted = Math.max(0, completed - electiveCompleted);

  const sameDayCancelShareOfCancels = 0.45;
  const sameDayCancels = Math.round(cancelled * sameDayCancelShareOfCancels);
  const sameDayCancelRate = scheduled ? sameDayCancels / scheduled : 0;
  const cancellationRate = scheduled ? cancelled / scheduled : 0;
  const completionRate = scheduled ? completed / scheduled : 0;

  const staffedTheatreDays = theatres * periodDays;
  const throughput = staffedTheatreDays ? completed / staffedTheatreDays : 0;
  const priorYearCompleted = period === 'year'
    ? scenarioFor(hospital, Math.max(2024, year - 1)).focus.surgCompleted
    : Math.round(completed / 1.045);
  const volumeVariance = priorYearCompleted
    ? (completed - priorYearCompleted) / Math.abs(priorYearCompleted)
    : 0;

  // --- OR time accounting ---
  // Allocated = planned block hours. Staffed = weekday sessions with teams present. Used = procedure + turnover.
  const hoursPerTheatreDay = 8;
  const workingDays = Math.max(1, Math.round(periodDays * 5 / 7));
  const allocatedHours = Math.round(theatres * hoursPerTheatreDay * workingDays * 0.95);
  const staffedHours = Math.round(theatres * hoursPerTheatreDay * workingDays * (0.9 - pressure * 0.04));
  const medianProcedureMin = Math.round(78 + pressure * 12);
  const medianTurnoverMin = Math.round(28 + pressure * 14);
  const procedureHours = Math.round((completed * medianProcedureMin) / 60);
  const turnoverEvents = Math.max(0, completed - theatres); // approx between-case turnovers
  const turnoverHours = Math.round((turnoverEvents * medianTurnoverMin) / 60);
  const usedHours = procedureHours + turnoverHours;
  /** Qualifying used time includes turnover. Denominator = eligible staffed hours. */
  const orUtilization = staffedHours ? Math.min(0.995, usedHours / staffedHours) : 0;
  const unusedHours = Math.max(0, staffedHours - usedHours);
  const overtimeHours = Math.max(0, usedHours - staffedHours);
  const firstCaseOnTimeRate = Math.round((0.71 - pressure * 0.35) * 1000) / 1000;
  const lateStartHours = Math.round(theatres * periodDays * (1 - firstCaseOnTimeRate) * 0.55);

  // Rooms
  const roomCount = theatres;
  const roomWeights = ROOM_WEIGHTS_BASE.slice(0, roomCount);
  const roomUsed = splitExact(usedHours, roomWeights);
  const roomStaffed = splitExact(staffedHours, roomWeights);
  const rooms = Array.from({ length: roomCount }, (_, index) => {
    const staffed = roomStaffed[index] || 1;
    const used = roomUsed[index];
    return {
      id: `OR-${index + 1}`,
      staffedHours: staffed,
      usedHours: used,
      utilization: staffed ? Math.min(0.995, used / staffed) : 0,
      lateStartHours: Math.round((lateStartHours * roomWeights[index]) / roomWeights.reduce((a, b) => a + b, 0)),
      firstCaseOnTime: Math.round((firstCaseOnTimeRate + ((index % 3) - 1) * 0.03) * 1000) / 1000,
    };
  });

  // Specialties
  const specialtyScheduled = splitExact(scheduled, SPECIALTY_WEIGHTS);
  const specialtyCompleted = splitExact(completed, SPECIALTY_WEIGHTS);
  const specialtyCancelled = specialtyScheduled.map((req, index) => Math.max(0, req - specialtyCompleted[index]));
  // Fix cancel drift to match total cancelled
  let cancelDrift = cancelled - specialtyCancelled.reduce((s, v) => s + v, 0);
  if (cancelDrift !== 0) {
    const pivot = specialtyCancelled.indexOf(Math.max(...specialtyCancelled));
    specialtyCancelled[pivot] = Math.max(0, specialtyCancelled[pivot] + cancelDrift);
  }

  // --- Elective waitlist (emergency does not enter elective backlog) ---
  const waitTargetDays = 42;
  const openingBacklog = Math.round(electiveScheduled * (0.18 + pressure * 0.25));
  const addedToWaitlist = Math.round(electiveScheduled * (0.92 + pressure * 0.04));
  const completedFromWaitlist = Math.min(addedToWaitlist + openingBacklog, electiveCompleted);
  const otherExits = Math.round(cancelled * 0.35); // elective removals / deferred exits
  const closingBacklog = Math.max(0, openingBacklog + addedToWaitlist - completedFromWaitlist - otherExits);
  const waitlistGrowth = closingBacklog - openingBacklog;
  const medianWaitDays = Math.round((12 + pressure * 22) * 10) / 10;
  const p90WaitDays = Math.round((medianWaitDays * 2.35 + pressure * 10) * 10) / 10;
  const overdueCases = Math.round(closingBacklog * (0.12 + pressure * 0.35));
  const withinTargetCases = Math.max(0, closingBacklog - overdueCases);
  const withinTargetShare = closingBacklog ? withinTargetCases / closingBacklog : 1;

  const waitBandCounts = splitExact(closingBacklog, WAIT_BANDS.map((b) => b.share))
    .map((count, index) => ({ name: WAIT_BANDS[index].name, count }));

  const specialtyBacklog = splitExact(closingBacklog, SPECIALTY_WEIGHTS.map((w, i) => w * (1 + (i % 3) * 0.08)));
  const specialtyWait = SURGICAL_SPECIALTIES.map((id, index) => {
    const bump = ((index % 4) - 1.5) * (1.8 + pressure * 4);
    return {
      id,
      scheduled: specialtyScheduled[index],
      completed: specialtyCompleted[index],
      cancelled: specialtyCancelled[index],
      backlog: specialtyBacklog[index],
      medianWait: Math.max(5, Math.round((medianWaitDays + bump) * 10) / 10),
      overdue: Math.round(specialtyBacklog[index] * (overdueCases / Math.max(closingBacklog, 1))),
      turnoverMin: Math.max(18, Math.round(medianTurnoverMin + ((index % 3) - 1) * 4)),
    };
  });
  // Fix overdue specialty drift
  let overdueDrift = overdueCases - specialtyWait.reduce((s, item) => s + item.overdue, 0);
  if (overdueDrift !== 0 && specialtyWait.length) {
    specialtyWait[0].overdue = Math.max(0, specialtyWait[0].overdue + overdueDrift);
  }

  // --- Quality (illustrative, completed-case denominators; events may overlap) ---
  const unplannedReturnRate = Math.round((0.011 + pressure * 0.008) * 1000) / 1000;
  const unplannedReturns = Math.round(completed * unplannedReturnRate);
  const complicationRate = Math.round((0.028 + pressure * 0.012) * 1000) / 1000;
  const complications = Math.round(completed * complicationRate);
  const checklistRate = Math.round((0.97 - pressure * 0.04) * 1000) / 1000;
  const checklistComplete = Math.round(completed * checklistRate);
  const infectionRate = Math.round((0.009 + pressure * 0.006) * 1000) / 1000;
  const infections = Math.round(completed * infectionRate);
  const docCompletionRate = Math.round((0.94 - pressure * 0.05) * 1000) / 1000;
  const docsComplete = Math.round(completed * docCompletionRate);
  const escalationRate = Math.round((0.015 + pressure * 0.01) * 1000) / 1000;
  const escalations = Math.round(completed * escalationRate);

  // --- Capacity optimization (no double-count of recoverable hours) ---
  const delayDriverHours = splitExact(lateStartHours + Math.round(turnoverHours * 0.35) + Math.round(sameDayCancels * medianProcedureMin / 60), DELAY_DRIVERS.map((d) => d.share))
    .map((hours, index) => ({ name: DELAY_DRIVERS[index].name, hours }));
  const recoverableOrHours = delayDriverHours.reduce((sum, item) => sum + item.hours, 0);
  const avoidableDelayHours = delayDriverHours.slice(0, 3).reduce((sum, item) => sum + item.hours, 0);
  const avgCaseHours = medianProcedureMin / 60 + medianTurnoverMin / 60;
  const bedConstrainedShare = 0.35; // portion of recovered hours still blocked by beds
  const potentialAdditionalCases = Math.max(
    0,
    Math.floor((recoverableOrHours * (1 - bedConstrainedShare)) / Math.max(avgCaseHours, 0.5)),
  );
  const eligibleBacklogCases = Math.min(closingBacklog, Math.round(closingBacklog * 0.55 + overdueCases * 0.4));
  const additionalCases = Math.min(potentialAdditionalCases, eligibleBacklogCases);
  const capacityGainHours = Math.round(additionalCases * avgCaseHours * 10) / 10;
  const scenarioImprovementPct = staffedHours
    ? Math.round((capacityGainHours / staffedHours) * 1000) / 10
    : 0;

  const cancelReasonCounts = splitExact(cancelled, CANCEL_REASONS.map((r) => r.share))
    .map((count, index) => ({ name: CANCEL_REASONS[index].name, count }));
  const bedRelatedCancels = cancelReasonCounts.find((item) => item.name === 'No postoperative bed')?.count ?? 0;

  const monthlyScheduled = rows.map((row) => row.month.surgRequests);
  const monthlyCompleted = rows.map((row) => row.month.surgCompleted);
  const monthlyCancelled = rows.map((row) => row.month.surgCancelled);
  const monthlySameDayRate = rows.map((row) => {
    const req = row.month.surgRequests || 1;
    return Math.round(((row.month.surgCancelled * sameDayCancelShareOfCancels) / req) * 1000) / 10;
  });
  const monthlyFirstCase = rows.map((_, index) => Math.round((firstCaseOnTimeRate + ((index % 5) - 2) * 0.012) * 1000) / 10);
  const monthlyUtil = rows.map((_, index) => Math.round((orUtilization + ((index % 4) - 1.5) * 0.015) * 1000) / 10);
  const monthlyBacklog = rows.map((_, index) => {
    const base = openingBacklog;
    const step = waitlistGrowth / Math.max(rows.length, 1);
    return Math.max(0, Math.round(base + step * (index + 1)));
  });
  const monthlyReturns = rows.map((row) => Math.round(row.month.surgCompleted * unplannedReturnRate));
  const monthlyChecklist = rows.map(() => Math.round(checklistRate * 1000) / 10);

  const safetyEventTypes = [
    { name: 'Unplanned OR return', count: unplannedReturns },
    { name: 'Complication flag', count: complications },
    { name: 'Infection flag', count: infections },
    { name: 'Escalation', count: escalations },
  ];

  const bedOcc = fact.staffedBeds ? fact.occupiedBeds / fact.staffedBeds : 0.8;

  return {
    hospital,
    year,
    period,
    periodLabel,
    observationDate,
    theatres,
    labels: rows.map((row) => row.label),

    scheduled,
    completed,
    cancelled,
    electiveScheduled,
    emergencyScheduled,
    electiveCompleted,
    emergencyCompleted,
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
    turnoverHours,
    usedHours,
    unusedHours,
    overtimeHours,
    orUtilization: Math.round(orUtilization * 1000) / 1000,
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

    unplannedReturnRate,
    unplannedReturns,
    complicationRate,
    complications,
    checklistRate,
    checklistComplete,
    infectionRate,
    infections,
    docCompletionRate,
    docsComplete,
    escalationRate,
    escalations,
    safetyEventTypes,
    qualityOverlapNote: 'Quality flags may overlap on the same case and must not be summed as a unique patient count.',

    recoverableOrHours,
    avoidableDelayHours,
    potentialAdditionalCases,
    additionalCases,
    eligibleBacklogCases,
    capacityGainHours,
    scenarioImprovementPct,
    delayDriverHours,
    cancelReasonCounts,
    bedRelatedCancels,
    bedOccupancyContext: Math.round(bedOcc * 1000) / 1000,
    avgCaseHours: Math.round(avgCaseHours * 100) / 100,

    specialties: specialtyWait,
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
      waitClock: 'Decision-to-treat / waitlist entry → procedure date for elective cases. Emergency cases bypass the elective waitlist.',
      orUtilization: 'OR Utilization = (procedure hours + turnover hours) ÷ staffed OR hours. Allocated hours are planned blocks; overtime is used beyond staffed.',
      quality: 'Illustrative safety process and outcome flags ÷ completed cases. Not validated clinical evidence.',
    },
  };
}

export type SurgeryView = ReturnType<typeof buildSurgeryView>;
