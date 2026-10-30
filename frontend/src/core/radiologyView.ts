import { SITE_SPECS, scenarioFor, type SiteCode } from '@/showcase/facts';
import { splitExact } from './ipdView';
import { sumKey, type ReportPeriod } from './period';

export const IMAGING_MODALITIES = ['X-ray', 'CT', 'Ultrasound', 'MRI'] as const;
export type ImagingModality = (typeof IMAGING_MODALITIES)[number];

/** Modalities map to scenario additive keys. */
const MODALITY_KEYS = ['radXr', 'radCt', 'radUs', 'radMr'] as const;

/** Illustrative median exam minutes by modality (prep + acquisition + room turnover). */
const EXAM_MIN_BY_MODALITY: Record<ImagingModality, number> = {
  'X-ray': 12,
  CT: 28,
  Ultrasound: 22,
  MRI: 48,
};

const ACCESS_TARGET_DAYS = 14;
const REPORT_TAT_TARGET_HOURS = 24;
const MEAN_LATE_START_MIN = 18;
const URGENT_SHARE = 0.18;

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

/** Deterministic scanner inventory from site beds — not shared with Surgery theatres. */
export function scannerInventory(hospital: string): Record<ImagingModality, number> {
  const beds = SITE_SPECS[hospital as SiteCode]?.beds ?? 300;
  return {
    'X-ray': Math.max(2, Math.round(beds / 105)),
    CT: Math.max(1, Math.round(beds / 210)),
    Ultrasound: Math.max(2, Math.round(beds / 140)),
    MRI: Math.max(1, Math.round(beds / 280)),
  };
}

/** Shared Radiology scenario for screens, Assist, alerts, and what-if. */
export function buildRadiologyView(hospital: string, year: number, period: ReportPeriod = 'year') {
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
  const workingDays = workingDaysInPeriod(period, year);
  const fact = scenarioFor(hospital, year).focus;
  const bedOcc = fact.staffedBeds ? fact.occupiedBeds / fact.staffedBeds : 0.8;
  const inventory = scannerInventory(hospital);
  const totalScanners = IMAGING_MODALITIES.reduce((sum, modality) => sum + inventory[modality], 0);

  // --- Request lifecycle (facts already reconcile: reported + cancelled + no-show = orders) ---
  const requests = sumKey(rows, 'radOrders');
  const completed = sumKey(rows, 'radReported');
  const cancelled = sumKey(rows, 'radCancelled');
  const noShows = sumKey(rows, 'radNoShow');
  const pending = Math.max(0, requests - completed - cancelled - noShows);
  const completionRate = requests ? completed / requests : 0;
  const urgentRequests = Math.round(requests * URGENT_SHARE);
  const routineRequests = Math.max(0, requests - urgentRequests);
  const urgentShare = requests ? urgentRequests / requests : 0;

  const modalityRequests = IMAGING_MODALITIES.map((_, index) => sumKey(rows, MODALITY_KEYS[index]));
  // Align modality sum to requests if rounding drifts
  let modalityDrift = requests - modalityRequests.reduce((sum, value) => sum + value, 0);
  if (modalityDrift !== 0 && modalityRequests.length) {
    const pivot = modalityRequests.indexOf(Math.max(...modalityRequests));
    modalityRequests[pivot] = Math.max(0, modalityRequests[pivot] + modalityDrift);
  }
  const modalityCompleted = splitExact(completed, modalityRequests.map((value) => Math.max(value, 1)));
  const modalityCancelled = splitExact(cancelled, modalityRequests.map((value) => Math.max(value, 1)));
  const modalityNoShows = modalityRequests.map((req, index) => Math.max(0, req - modalityCompleted[index] - modalityCancelled[index]));
  // Fix no-show drift to hospital total
  let noShowDrift = noShows - modalityNoShows.reduce((sum, value) => sum + value, 0);
  if (noShowDrift !== 0) {
    const pivot = modalityNoShows.indexOf(Math.max(...modalityNoShows));
    modalityNoShows[pivot] = Math.max(0, modalityNoShows[pivot] + noShowDrift);
  }

  // Care setting split of requests (mutually exclusive)
  const careSettingShares = [0.22, 0.28, 0.5]; // ED, Inpatient, Outpatient
  const careSettingRequests = splitExact(requests, careSettingShares);
  const careSettings = [
    { name: 'Emergency', requests: careSettingRequests[0] },
    { name: 'Inpatient', requests: careSettingRequests[1] },
    { name: 'Outpatient', requests: careSettingRequests[2] },
  ];

  // --- Scanner time accounting ---
  const hoursPerScannerDay = 10;
  const staffedHours = Math.round(totalScanners * hoursPerScannerDay * workingDays * (0.88 - pressure * 0.05));
  const allocatedHours = Math.round(totalScanners * hoursPerScannerDay * workingDays * 0.95);

  const modalityExamMin = IMAGING_MODALITIES.map((modality) => Math.round(EXAM_MIN_BY_MODALITY[modality] * (1 + pressure * 0.12)));
  const modalityUsedHours = modalityCompleted.map((count, index) => Math.round((count * modalityExamMin[index]) / 60));
  const usedHours = modalityUsedHours.reduce((sum, value) => sum + value, 0);
  const downtimeHours = Math.round(staffedHours * (0.06 + pressure * 0.08));
  const inSessionUsed = Math.min(usedHours, Math.max(0, staffedHours - downtimeHours));
  const unusedHours = Math.max(0, staffedHours - inSessionUsed - downtimeHours);
  const overtimeHours = Math.max(0, usedHours - (staffedHours - downtimeHours));
  const scannerUtilization = staffedHours ? usedHours / staffedHours : 0; // uncapped
  const medianExamMin = completed
    ? Math.round(IMAGING_MODALITIES.reduce((sum, _, index) => sum + modalityCompleted[index] * modalityExamMin[index], 0) / completed)
    : 0;
  const scheduleAdherence = Math.round((0.82 - pressure * 0.25) * 1000) / 1000;

  // Scanner-level rows with distinct staffed vs used weights
  const scanners: {
    id: string;
    modality: ImagingModality;
    staffedHours: number;
    usedHours: number;
    downtimeHours: number;
    utilization: number;
  }[] = [];
  for (const modality of IMAGING_MODALITIES) {
    const count = inventory[modality];
    const modalityIndex = IMAGING_MODALITIES.indexOf(modality);
    const modalityStaffed = Math.round(staffedHours * (count / totalScanners));
    const modalityUsed = modalityUsedHours[modalityIndex];
    const modalityDown = Math.round(downtimeHours * (count / totalScanners));
    const staffedWeights = Array.from({ length: count }, (_, index) => 1 + ((index % 3) - 1) * 0.06);
    const usedWeights = Array.from({ length: count }, (_, index) => 1 + ((index % 3) - 1) * -0.08);
    const roomStaffed = splitExact(modalityStaffed, staffedWeights);
    const roomUsed = splitExact(modalityUsed, usedWeights);
    const roomDown = splitExact(modalityDown, staffedWeights);
    for (let index = 0; index < count; index += 1) {
      const staffed = roomStaffed[index] || 1;
      const used = roomUsed[index];
      scanners.push({
        id: `${modality.replace('Ultrasound', 'US').replace('X-ray', 'XR')}-${index + 1}`,
        modality,
        staffedHours: staffed,
        usedHours: used,
        downtimeHours: roomDown[index],
        utilization: staffed ? used / staffed : 0,
      });
    }
  }
  // Reconcile scanner staffed/used to hospital (fixExact per modality already; fix residual)
  const scannerStaffedSum = scanners.reduce((sum, item) => sum + item.staffedHours, 0);
  const scannerUsedSum = scanners.reduce((sum, item) => sum + item.usedHours, 0);
  if (scannerStaffedSum !== staffedHours && scanners.length) {
    scanners[0].staffedHours += staffedHours - scannerStaffedSum;
  }
  if (scannerUsedSum !== usedHours && scanners.length) {
    scanners[0].usedHours += usedHours - scannerUsedSum;
    scanners[0].utilization = scanners[0].staffedHours ? scanners[0].usedHours / scanners[0].staffedHours : 0;
  }

  const downtimeReasons = splitExact(downtimeHours, [0.34, 0.28, 0.22, 0.16]).map((hours, index) => ({
    name: ['Equipment fault', 'Maintenance', 'Staffing gap', 'IT / PACS'][index],
    hours,
  }));

  // --- Imaging waitlist ledger (routine outpatient-leaning; urgent often bypasses) ---
  const waitTargetDays = ACCESS_TARGET_DAYS;
  const openingBacklog = Math.round(routineRequests * (0.14 + pressure * 0.22));
  const monthlyRoutine = splitExact(routineRequests, rows.map((row) => Math.max(row.month.radOrders, 1)));
  const monthlyCompletedFromWait = splitExact(
    Math.round(completed * (1 - URGENT_SHARE * 0.7)),
    rows.map((row) => Math.max(row.month.radReported, 1)),
  );
  const monthlyAdded = monthlyRoutine.map((value) => Math.round(value * (0.9 + pressure * 0.05)));
  const monthlyExits = splitExact(Math.round(cancelled * 0.4), rows.map((row) => Math.max(row.month.radCancelled, 1)));

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
  const waitlistGrowth = closingBacklog - openingBacklog;
  const medianAccessWaitDays = Math.round((6 + pressure * 18) * 10) / 10;
  const p90AccessWaitDays = Math.round((medianAccessWaitDays * 2.2 + pressure * 8) * 10) / 10;
  const overdueImaging = Math.min(closingBacklog, Math.round(closingBacklog * (0.1 + pressure * 0.32)));
  const withinTargetCases = Math.max(0, closingBacklog - overdueImaging);
  const withinAccessTarget = closingBacklog ? withinTargetCases / closingBacklog : 1;

  const waitBands = splitExact(closingBacklog, [0.28, 0.3, 0.22, 0.12, 0.08]).map((count, index) => ({
    name: ['0–7 days', '8–14 days', '15–30 days', '31–60 days', '>60 days'][index],
    count,
  }));
  const backlogByPriority = splitExact(closingBacklog, [0.12, 0.88]).map((count, index) => ({
    name: ['Urgent waitlist', 'Routine waitlist'][index],
    count,
  }));
  const modalityBacklog = splitExact(closingBacklog, modalityRequests.map((value) => Math.max(value, 1)));
  const modalityOverdue = splitExact(overdueImaging, modalityRequests.map((value) => Math.max(value, 1)));
  const modalityMedianWait = IMAGING_MODALITIES.map((_, index) => {
    const bump = (index - 1.5) * (1.5 + pressure * 3);
    return Math.max(2, Math.round((medianAccessWaitDays + bump) * 10) / 10);
  });

  // --- Reporting / quality ---
  const medianReportTatHours = Math.round((fact.radTatMedianMin / 60) * (1 + pressure * 0.15) * 10) / 10;
  const p90ReportTatHours = Math.round((fact.radTatP90Min / 60) * (1 + pressure * 0.18) * 10) / 10;
  const reportsOverTarget = Math.round(completed * (0.12 + pressure * 0.28));
  const unsignedReports = Math.round(completed * (0.04 + pressure * 0.06));
  const repeatExams = Math.round(completed * (0.028 + pressure * 0.012));
  const repeatExamRate = completed ? repeatExams / completed : 0;
  const criticalResults = Math.round(completed * 0.045);
  const criticalAcked = Math.round(criticalResults * (0.94 - pressure * 0.08));
  const criticalAckRate = criticalResults ? criticalAcked / criticalResults : 1;
  const modalityReportTat = IMAGING_MODALITIES.map((_, index) => Math.round((medianReportTatHours + (index - 1.5) * 2.2) * 10) / 10);
  const modalityRepeats = splitExact(repeatExams, modalityCompleted.map((value) => Math.max(value, 1)));
  const unsignedAging = splitExact(unsignedReports, [0.4, 0.28, 0.2, 0.12]).map((count, index) => ({
    name: ['0–24 h', '1–3 days', '4–7 days', '>7 days'][index],
    count,
  }));
  const monthlyReportTat = rows.map((row, index) => Math.round((row.month.radTatMedianMin / 60 + ((index % 4) - 1.5) * 0.4) * 10) / 10);

  // --- Capacity optimization (exclusive drivers; bed haircut once) ---
  const lateStartHours = Math.round(totalScanners * workingDays * (1 - scheduleAdherence) * (MEAN_LATE_START_MIN / 60));
  const excessDurationHours = Math.round(usedHours * (0.08 + pressure * 0.06));
  const cancelBlockHours = Math.round((cancelled * medianExamMin) / 60);
  const equipmentRecoverable = Math.round(downtimeHours * 0.55);
  const delayDriverHours = [
    { name: 'Late schedule starts', hours: lateStartHours },
    { name: 'Extended exam duration', hours: excessDurationHours },
    { name: 'Cancellation / no-show gaps', hours: cancelBlockHours },
    { name: 'Recoverable downtime', hours: equipmentRecoverable },
  ];
  const recoverableHours = delayDriverHours.reduce((sum, item) => sum + item.hours, 0);
  const bedConstrainedShare = Math.round(clamp((bedOcc - 0.78) / 0.2, 0.08, 0.3) * 1000) / 1000;
  const bedConstrainedHours = Math.round(recoverableHours * bedConstrainedShare);
  const feasibleRecoverableHours = Math.max(0, recoverableHours - bedConstrainedHours);
  const avgExamHours = medianExamMin / 60 || 0.5;
  const potentialAdditionalExams = Math.max(0, Math.floor(feasibleRecoverableHours / Math.max(avgExamHours, 0.2)));
  const eligibleWaitlist = Math.min(closingBacklog, Math.round(closingBacklog * 0.6 + overdueImaging * 0.35));
  const additionalExams = Math.min(potentialAdditionalExams, eligibleWaitlist);
  const capacityGainHours = Math.round(additionalExams * avgExamHours * 10) / 10;
  const accessGainPct = staffedHours ? Math.round((capacityGainHours / staffedHours) * 1000) / 10 : 0;

  const modalities = IMAGING_MODALITIES.map((id, index) => ({
    id,
    requests: modalityRequests[index],
    completed: modalityCompleted[index],
    cancelled: modalityCancelled[index],
    noShows: modalityNoShows[index],
    scanners: inventory[id],
    examMin: modalityExamMin[index],
    usedHours: modalityUsedHours[index],
    backlog: modalityBacklog[index],
    overdue: modalityOverdue[index],
    medianWait: modalityMedianWait[index],
    reportTatHours: modalityReportTat[index],
    repeats: modalityRepeats[index],
  }));

  const monthlyRequests = rows.map((row) => row.month.radOrders);
  const monthlyCompleted = rows.map((row) => row.month.radReported);
  const monthlyCancelled = rows.map((row) => row.month.radCancelled);
  const monthlyUtil = rows.map((_, index) => {
    const w = Math.max(1, Math.round(staffedHours / rows.length));
    const u = Math.max(1, Math.round(usedHours / rows.length));
    const wobble = ((index % 4) - 1.5) * 0.012;
    return Math.round(((u / w) + wobble) * 1000) / 10;
  });

  return {
    hospital,
    year,
    period,
    periodLabel,
    observationDate,
    workingDays,
    totalScanners,
    labels: rows.map((row) => row.label),

    requests,
    completed,
    cancelled,
    noShows,
    pending,
    completionRate: Math.round(completionRate * 1000) / 1000,
    urgentRequests,
    routineRequests,
    urgentShare: Math.round(urgentShare * 1000) / 1000,
    careSettings,

    allocatedHours,
    staffedHours,
    usedHours,
    inSessionUsed,
    unusedHours,
    downtimeHours,
    overtimeHours,
    scannerUtilization: Math.round(scannerUtilization * 1000) / 1000,
    medianExamMin,
    scheduleAdherence,
    scanners,
    downtimeReasons,

    openingBacklog,
    addedToWaitlist,
    completedFromWaitlist,
    otherExits,
    closingBacklog,
    waitlistGrowth,
    medianAccessWaitDays,
    p90AccessWaitDays,
    waitTargetDays,
    overdueImaging,
    withinTargetCases,
    withinAccessTarget: Math.round(withinAccessTarget * 1000) / 1000,
    waitBands,
    backlogByPriority,
    monthlyOpening,
    monthlyBacklog,

    medianReportTatHours,
    p90ReportTatHours,
    reportTatTargetHours: REPORT_TAT_TARGET_HOURS,
    reportsOverTarget,
    unsignedReports,
    repeatExams,
    repeatExamRate: Math.round(repeatExamRate * 1000) / 1000,
    criticalResults,
    criticalAcked,
    criticalAckRate: Math.round(criticalAckRate * 1000) / 1000,
    unsignedAging,
    monthlyReportTat,

    delayDriverHours,
    recoverableHours,
    bedConstrainedShare,
    bedConstrainedHours,
    feasibleRecoverableHours,
    potentialAdditionalExams,
    additionalExams,
    eligibleWaitlist,
    capacityGainHours,
    accessGainPct,
    avgExamHours: Math.round(avgExamHours * 100) / 100,
    bedOccupancyContext: Math.round(bedOcc * 1000) / 1000,

    modalities,
    monthlyRequests,
    monthlyCompleted,
    monthlyCancelled,
    monthlyUtil,

    methodology: {
      accessClock: 'Request-to-exam wait for eligible waitlist cases. Urgent add-ons may bypass the elective-style waitlist. Illustrative access target — not a national standard.',
      utilization: 'Scanner Utilization = used exam hours ÷ staffed scanner hours (uncapped). Staffed = in-session used + downtime + unused. Overtime reported separately.',
      reportTat: 'Final Report TAT = final signature − exam completion. Unsigned reports use aging bands at observation — they do not have a completed TAT.',
      capacity: 'Recoverable hours = exclusive drivers (late starts + excess duration + cancel/no-show gaps + recoverable downtime). Bed haircut applied once afterward.',
    },
  };
}

export type RadiologyView = ReturnType<typeof buildRadiologyView>;
