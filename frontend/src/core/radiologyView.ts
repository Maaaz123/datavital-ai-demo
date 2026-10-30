import { SITE_SPECS, scenarioFor, type SiteCode } from '@/showcase/facts';
import { splitExact } from './ipdView';
import { sumKey, type ReportPeriod } from './period';

export const IMAGING_MODALITIES = ['X-ray', 'CT', 'Ultrasound', 'MRI'] as const;
export type ImagingModality = (typeof IMAGING_MODALITIES)[number];

const MODALITY_KEYS = ['radXr', 'radCt', 'radUs', 'radMr'] as const;

/** Prep + acquisition + room turnover minutes — distinct by modality. */
const EXAM_MIN_BY_MODALITY: Record<ImagingModality, number> = {
  'X-ray': 12,
  CT: 28,
  Ultrasound: 22,
  MRI: 48,
};

/** Share of downtime recoverable into productive sessions (not all downtime). */
const RECOVERABLE_DOWNTIME_SHARE: Record<ImagingModality, number> = {
  'X-ray': 0.45,
  CT: 0.6,
  Ultrasound: 0.4,
  MRI: 0.55,
};

const ACCESS_TARGET_DAYS = 14;
const REPORT_TAT_TARGET_HOURS = 24;
const MEAN_LATE_START_MIN = 18;
const URGENT_SHARE = 0.18;
/** Exam-lifecycle pending share at observation (orders not yet examined). Overlay on shared scenario. */
const PENDING_SHARE_BASE = 0.025;
/** Of exam-completed cases, share still unsigned at observation. */
const UNSIGNED_SHARE_BASE = 0.045;
const CRITICAL_SHARE = 0.045;
const REPEAT_SHARE_BASE = 0.028;

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

/** Deterministic hash → [0,1) for synthetic distributions. */
function unit(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[Math.min(sorted.length - 1, base + 1)];
  return sorted[base] * (1 - rest) + next * rest;
}

/**
 * Partition hospital outcome totals across modalities so each modality's
 * Completed + Cancelled + No-show + Pending = modality requests (exact, non-negative).
 */
function partitionOutcomes(
  modalityRequests: number[],
  completed: number,
  cancelled: number,
  noShows: number,
  pending: number,
): { completed: number[]; cancelled: number[]; noShows: number[]; pending: number[] } {
  const n = modalityRequests.length;
  const totalReq = modalityRequests.reduce((sum, value) => sum + value, 0) || 1;
  const cancelledParts = new Array(n).fill(0);
  const noShowParts = new Array(n).fill(0);
  const pendingParts = new Array(n).fill(0);
  const completedParts = new Array(n).fill(0);

  // Floor-proportional allocation with remainder distribution that never exceeds modality requests.
  const allocate = (target: number, sink: number[]) => {
    if (target <= 0) return;
    const raw = modalityRequests.map((req) => (req / totalReq) * target);
    const base = raw.map((value) => Math.floor(value));
    let left = target - base.reduce((sum, value) => sum + value, 0);
    const order = raw
      .map((value, index) => ({ index, frac: value - Math.floor(value), room: modalityRequests[index] - sink[index] - base[index] }))
      .sort((a, b) => b.frac - a.frac);
    for (let step = 0; left > 0 && step < order.length * 3; step += 1) {
      const item = order[step % order.length];
      const used = sink[item.index] + base[item.index];
      if (used < modalityRequests[item.index]) {
        base[item.index] += 1;
        left -= 1;
      }
    }
    for (let index = 0; index < n; index += 1) sink[index] += base[index];
  };

  allocate(cancelled, cancelledParts);
  allocate(noShows, noShowParts);
  allocate(pending, pendingParts);
  // Completed takes the exact residual per modality — guarantees identity and non-negative residual.
  for (let index = 0; index < n; index += 1) {
    completedParts[index] = modalityRequests[index] - cancelledParts[index] - noShowParts[index] - pendingParts[index];
  }
  // Align completed hospital total by swapping with pending where room exists (same modality).
  let completedDrift = completed - completedParts.reduce((sum, value) => sum + value, 0);
  if (completedDrift !== 0) {
    const order = modalityRequests
      .map((_, index) => ({ index, pending: pendingParts[index], completed: completedParts[index] }))
      .sort((a, b) => (completedDrift > 0 ? b.pending - a.pending : b.completed - a.completed));
    for (const item of order) {
      if (completedDrift === 0) break;
      if (completedDrift > 0 && pendingParts[item.index] > 0) {
        const move = Math.min(completedDrift, pendingParts[item.index]);
        pendingParts[item.index] -= move;
        completedParts[item.index] += move;
        completedDrift -= move;
      } else if (completedDrift < 0 && completedParts[item.index] > 0) {
        const move = Math.min(-completedDrift, completedParts[item.index]);
        completedParts[item.index] -= move;
        pendingParts[item.index] += move;
        completedDrift += move;
      }
    }
  }
  // Targets for cancelled/no-show/pending are already allocated; completed residual preserves hospital identity:
  // sum(completedParts)+sum(cancelled)+sum(noshow)+sum(pending) = sum(requests).
  void cancelled;
  void noShows;
  void pending;
  return { completed: completedParts, cancelled: cancelledParts, noShows: noShowParts, pending: pendingParts };
}

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
  const siteSeed = (SITE_SPECS[hospital as SiteCode]?.beds ?? 300) + year * 17;

  // --- Examination request lifecycle (Radiology overlay on shared order totals) ---
  // Shared facts close all orders in-month (reported+cancelled+no-show = orders).
  // Radiology exam lifecycle introduces an observation pending cohort and treats
  // shared radReported as the closed-exam basis before pending carve-out.
  const requests = sumKey(rows, 'radOrders');
  const cancelled = sumKey(rows, 'radCancelled');
  const noShows = sumKey(rows, 'radNoShow');
  const pendingShare = PENDING_SHARE_BASE + pressure * 0.02;
  const pending = Math.min(
    Math.max(0, requests - cancelled - noShows),
    Math.round(requests * pendingShare),
  );
  const completed = requests - cancelled - noShows - pending; // exam completed (not report signed)
  const completionRate = requests ? completed / requests : 0;
  const urgentRequests = Math.round(requests * URGENT_SHARE);
  const routineRequests = Math.max(0, requests - urgentRequests);
  const urgentShare = requests ? urgentRequests / requests : 0;

  let modalityRequests = IMAGING_MODALITIES.map((_, index) => sumKey(rows, MODALITY_KEYS[index]));
  const modalityReqDrift = requests - modalityRequests.reduce((sum, value) => sum + value, 0);
  if (modalityReqDrift !== 0 && modalityRequests.length) {
    const pivot = modalityRequests.indexOf(Math.max(...modalityRequests));
    modalityRequests = modalityRequests.map((value, index) => (index === pivot ? value + modalityReqDrift : value));
  }

  const partitioned = partitionOutcomes(modalityRequests, completed, cancelled, noShows, pending);
  const modalityCompleted = partitioned.completed;
  const modalityCancelled = partitioned.cancelled;
  const modalityNoShows = partitioned.noShows;
  const modalityPending = partitioned.pending;

  // Care setting split of requests (mutually exclusive)
  const careSettingShares = [0.22, 0.28, 0.5]; // ED, Inpatient, Outpatient
  const careSettingRequests = splitExact(requests, careSettingShares);
  const careSettingCompleted = splitExact(completed, careSettingShares);
  const careSettings = [
    { name: 'Emergency', requests: careSettingRequests[0], completed: careSettingCompleted[0] },
    { name: 'Inpatient', requests: careSettingRequests[1], completed: careSettingCompleted[1] },
    { name: 'Outpatient', requests: careSettingRequests[2], completed: careSettingCompleted[2] },
  ];

  // --- Scanner time accounting ---
  // Staffed = in-session used + downtime + unused.
  // Total used = in-session used + overtime.
  // Utilization = in-session used ÷ staffed (overtime reported separately; uncapped if >1 impossible by construction).
  const hoursPerScannerDay = 10;
  const staffedHours = Math.round(totalScanners * hoursPerScannerDay * workingDays * (0.88 - pressure * 0.05));
  const allocatedHours = Math.round(totalScanners * hoursPerScannerDay * workingDays * 0.95);

  const modalityExamMin = IMAGING_MODALITIES.map((modality) => Math.round(EXAM_MIN_BY_MODALITY[modality] * (1 + pressure * 0.12)));
  const modalityExamHours = modalityCompleted.map((count, index) => Math.round((count * modalityExamMin[index]) / 60));
  const totalExamHours = modalityExamHours.reduce((sum, value) => sum + value, 0);

  // Downtime first (inside staffed), then in-session used capped by remaining staffed capacity.
  const downtimeHours = Math.round(staffedHours * (0.06 + pressure * 0.08));
  const staffedCapacityForExams = Math.max(0, staffedHours - downtimeHours);
  const inSessionUsed = Math.min(totalExamHours, staffedCapacityForExams);
  const unusedHours = Math.max(0, staffedHours - inSessionUsed - downtimeHours);
  const overtimeHours = Math.max(0, totalExamHours - inSessionUsed);
  const usedHours = inSessionUsed + overtimeHours; // total actual used
  const scannerUtilization = staffedHours ? inSessionUsed / staffedHours : 0;
  const medianExamMin = completed
    ? Math.round(IMAGING_MODALITIES.reduce((sum, _, index) => sum + modalityCompleted[index] * modalityExamMin[index], 0) / completed)
    : 0;
  const scheduleAdherence = Math.round((0.82 - pressure * 0.25) * 1000) / 1000;

  // Scale modality used hours so in-session + OT proportions preserve modality exam hours.
  const modalityUsedHours = modalityExamHours.slice();
  const modalityInSession = splitExact(inSessionUsed, modalityExamHours.map((value) => Math.max(value, 1)));
  const modalityOvertime = modalityExamHours.map((value, index) => Math.max(0, value - modalityInSession[index]));
  const modalityDowntime = splitExact(downtimeHours, IMAGING_MODALITIES.map((modality) => inventory[modality]));
  const modalityStaffed = splitExact(staffedHours, IMAGING_MODALITIES.map((modality) => inventory[modality]));
  const modalityUnused = modalityStaffed.map((staffed, index) => Math.max(0, staffed - modalityInSession[index] - modalityDowntime[index]));

  const scanners: {
    id: string;
    modality: ImagingModality;
    staffedHours: number;
    inSessionUsed: number;
    usedHours: number;
    downtimeHours: number;
    unusedHours: number;
    overtimeHours: number;
    utilization: number;
  }[] = [];
  for (const modality of IMAGING_MODALITIES) {
    const count = inventory[modality];
    const modalityIndex = IMAGING_MODALITIES.indexOf(modality);
    const staffedWeights = Array.from({ length: count }, (_, index) => 1 + ((index % 3) - 1) * 0.08);
    const usedWeights = Array.from({ length: count }, (_, index) => 1 + ((index % 3) - 1) * -0.1);
    const roomStaffed = splitExact(modalityStaffed[modalityIndex], staffedWeights);
    const roomInSession = splitExact(modalityInSession[modalityIndex], usedWeights);
    const roomDown = splitExact(modalityDowntime[modalityIndex], staffedWeights);
    const roomOvertime = splitExact(modalityOvertime[modalityIndex], usedWeights);
    for (let index = 0; index < count; index += 1) {
      const staffed = roomStaffed[index] || 1;
      const inSession = roomInSession[index];
      const down = roomDown[index];
      const overtime = roomOvertime[index];
      const unused = Math.max(0, staffed - inSession - down);
      scanners.push({
        id: `${modality.replace('Ultrasound', 'US').replace('X-ray', 'XR')}-${index + 1}`,
        modality,
        staffedHours: staffed,
        inSessionUsed: inSession,
        usedHours: inSession + overtime,
        downtimeHours: down,
        unusedHours: unused,
        overtimeHours: overtime,
        utilization: staffed ? inSession / staffed : 0,
      });
    }
  }
  // Reconcile scanner rows to hospital staffed / in-session / downtime / overtime.
  const fixScannerField = (
    field: 'staffedHours' | 'inSessionUsed' | 'downtimeHours' | 'overtimeHours',
    target: number,
  ) => {
    const sum = scanners.reduce((total, item) => total + item[field], 0);
    if (sum !== target && scanners.length) {
      scanners[0][field] += target - sum;
      if (scanners[0][field] < 0) scanners[0][field] = 0;
    }
  };
  fixScannerField('staffedHours', staffedHours);
  fixScannerField('inSessionUsed', inSessionUsed);
  fixScannerField('downtimeHours', downtimeHours);
  fixScannerField('overtimeHours', overtimeHours);
  for (const scanner of scanners) {
    scanner.unusedHours = Math.max(0, scanner.staffedHours - scanner.inSessionUsed - scanner.downtimeHours);
    scanner.usedHours = scanner.inSessionUsed + scanner.overtimeHours;
    scanner.utilization = scanner.staffedHours ? scanner.inSessionUsed / scanner.staffedHours : 0;
  }

  const downtimeReasons = splitExact(downtimeHours, [0.34, 0.28, 0.22, 0.16]).map((hours, index) => ({
    name: ['Equipment fault', 'Maintenance', 'Staffing gap', 'IT / PACS'][index],
    hours,
  }));
  const ctDowntimeHours = modalityDowntime[IMAGING_MODALITIES.indexOf('CT')];

  // --- Imaging waitlist ledger (routine / elective-style; urgent may bypass) ---
  // Eligible waitlist cohort ≈ routine outpatient-leaning demand.
  const waitTargetDays = ACCESS_TARGET_DAYS;
  const openingBacklog = Math.round(routineRequests * (0.14 + pressure * 0.22));
  const monthlyRoutine = splitExact(routineRequests, rows.map((row) => Math.max(row.month.radOrders, 1)));
  const monthlyAdded = monthlyRoutine.map((value) => Math.round(value * (0.88 + pressure * 0.04)));
  // Desired completions/exits constrained by available cases — never clamp negative closing.
  const desiredCompletedFromWait = splitExact(
    Math.round(completed * (0.55 + (1 - URGENT_SHARE) * 0.2)),
    rows.map((row) => Math.max(row.month.radReported, 1)),
  );
  const desiredOtherExits = splitExact(
    Math.round(cancelled * 0.35),
    rows.map((row) => Math.max(row.month.radCancelled, 1)),
  );

  const monthlyBacklog: number[] = [];
  const monthlyOpening: number[] = [];
  const monthlyCompletedFromWait: number[] = [];
  const monthlyOtherExits: number[] = [];
  let cursor = openingBacklog;
  for (let index = 0; index < rows.length; index += 1) {
    monthlyOpening.push(cursor);
    const available = cursor + monthlyAdded[index];
    const completedFromWait = Math.min(desiredCompletedFromWait[index], available);
    const remaining = available - completedFromWait;
    const otherExit = Math.min(desiredOtherExits[index], remaining);
    const close = cursor + monthlyAdded[index] - completedFromWait - otherExit;
    monthlyCompletedFromWait.push(completedFromWait);
    monthlyOtherExits.push(otherExit);
    monthlyBacklog.push(close);
    cursor = close;
  }
  const closingBacklog = monthlyBacklog[monthlyBacklog.length - 1] ?? openingBacklog;
  const addedToWaitlist = monthlyAdded.reduce((sum, value) => sum + value, 0);
  const completedFromWaitlist = monthlyCompletedFromWait.reduce((sum, value) => sum + value, 0);
  const otherExits = monthlyOtherExits.reduce((sum, value) => sum + value, 0);
  const waitlistGrowth = closingBacklog - openingBacklog;

  // Active backlog wait distribution — one coherent population for median, P90, bands, overdue.
  // Build a capped deterministic sample, then scale band counts to the full closing backlog.
  const waitSampleSize = Math.min(closingBacklog, 400);
  const waitSample: number[] = [];
  for (let index = 0; index < waitSampleSize; index += 1) {
    const u = unit(siteSeed + index * 97 + closingBacklog);
    waitSample.push(Math.max(0.5, Math.round((-Math.log(1 - u * 0.92) * (7 + pressure * 16)) * 10) / 10));
  }
  waitSample.sort((a, b) => a - b);
  const medianAccessWaitDays = waitSample.length ? Math.round(quantile(waitSample, 0.5) * 10) / 10 : 0;
  const p90AccessWaitDays = waitSample.length ? Math.round(quantile(waitSample, 0.9) * 10) / 10 : 0;

  const bandDefs: { name: string; min: number; max: number }[] = [
    { name: '0–7 days', min: 0, max: 7 },
    { name: '8–14 days', min: 7, max: 14 },
    { name: '15–30 days', min: 14, max: 30 },
    { name: '31–60 days', min: 30, max: 60 },
    { name: '>60 days', min: 60, max: Infinity },
  ];
  const sampleBandCounts = bandDefs.map((band) => waitSample.filter((age) => age > band.min && age <= band.max).length);
  const waitBands = closingBacklog && waitSampleSize
    ? splitExact(closingBacklog, sampleBandCounts.map((value) => Math.max(value, 0.0001))).map((count, index) => ({
      name: bandDefs[index].name,
      count,
    }))
    : bandDefs.map((band) => ({ name: band.name, count: 0 }));
  const overdueImaging = waitBands
    .filter((band) => band.name === '15–30 days' || band.name === '31–60 days' || band.name === '>60 days')
    .reduce((sum, item) => sum + item.count, 0);
  const withinTargetCases = closingBacklog - overdueImaging;
  const withinAccessTarget = closingBacklog ? withinTargetCases / closingBacklog : 1;

  const backlogByPriority = splitExact(closingBacklog, [0.12, 0.88]).map((count, index) => ({
    name: ['Urgent waitlist', 'Routine waitlist'][index],
    count,
  }));
  const modalityBacklog = splitExact(closingBacklog, modalityRequests.map((value) => Math.max(value, 1)));
  const modalityOverdue = splitExact(overdueImaging, modalityBacklog.map((value) => Math.max(value, 1)));
  const modalityMedianWait = IMAGING_MODALITIES.map((_, index) => {
    const bump = (index - 1.5) * (1.2 + pressure * 2.5);
    return Math.max(1, Math.round((medianAccessWaitDays + bump) * 10) / 10);
  });

  // --- Reporting lifecycle (distinct from exam completion) ---
  // Exam completed → awaiting interpretation → final signed (or still unsigned at observation).
  const unsignedShare = UNSIGNED_SHARE_BASE + pressure * 0.03;
  const unsignedReports = Math.min(completed, Math.round(completed * unsignedShare));
  const signedReports = completed - unsignedReports;
  // Signed TAT from a capped deterministic sample of the signed cohort (not averaging monthly medians).
  const tatSampleSize = Math.min(signedReports, 400);
  const signedTatHours: number[] = [];
  const tatBase = (fact.radTatMedianMin / 60) * (1 + pressure * 0.12);
  for (let index = 0; index < tatSampleSize; index += 1) {
    const u = unit(siteSeed + 5000 + index * 41);
    signedTatHours.push(Math.max(0.5, Math.round(tatBase * (0.45 + u * 1.8) * 10) / 10));
  }
  signedTatHours.sort((a, b) => a - b);
  const medianReportTatHours = signedTatHours.length ? Math.round(quantile(signedTatHours, 0.5) * 10) / 10 : 0;
  const p90ReportTatHours = signedTatHours.length ? Math.round(quantile(signedTatHours, 0.9) * 10) / 10 : 0;
  const sampleOverTarget = signedTatHours.filter((hours) => hours > REPORT_TAT_TARGET_HOURS).length;
  const reportsOverTarget = signedReports && tatSampleSize
    ? Math.round((sampleOverTarget / tatSampleSize) * signedReports)
    : 0;

  // Unsigned aging at observation (not completed TAT).
  const unsignedSampleSize = Math.min(unsignedReports, 200);
  const unsignedAgesHours: number[] = [];
  for (let index = 0; index < unsignedSampleSize; index += 1) {
    const u = unit(siteSeed + 9000 + index * 53);
    unsignedAgesHours.push(Math.round((4 + u * 160) * 10) / 10);
  }
  const unsignedAgingDefs = [
    { name: '0–24 h', min: 0, max: 24 },
    { name: '1–3 days', min: 24, max: 72 },
    { name: '4–7 days', min: 72, max: 168 },
    { name: '>7 days', min: 168, max: Infinity },
  ];
  const unsignedSampleBands = unsignedAgingDefs.map((band) => unsignedAgesHours.filter((age) => age > band.min && age <= band.max).length);
  const unsignedAging = unsignedReports && unsignedSampleSize
    ? splitExact(unsignedReports, unsignedSampleBands.map((value) => Math.max(value, 0.0001))).map((count, index) => ({
      name: unsignedAgingDefs[index].name,
      count,
    }))
    : unsignedAgingDefs.map((band) => ({ name: band.name, count: 0 }));

  const repeatExams = Math.round(completed * (REPEAT_SHARE_BASE + pressure * 0.01));
  const technicalRepeats = Math.round(repeatExams * 0.55);
  const clinicalRepeats = repeatExams - technicalRepeats;
  const repeatExamRate = completed ? repeatExams / completed : 0;

  const criticalResults = Math.round(completed * CRITICAL_SHARE);
  const criticalAcked = Math.round(criticalResults * (0.94 - pressure * 0.08));
  const criticalPendingAck = Math.max(0, criticalResults - criticalAcked);
  const criticalAckRate = criticalResults ? criticalAcked / criticalResults : 1;
  const criticalDelayRate = criticalResults ? criticalPendingAck / criticalResults : 0;

  const modalityReportTat = IMAGING_MODALITIES.map((_, index) => {
    const bump = (index - 1.5) * 1.8;
    return Math.max(0.5, Math.round((medianReportTatHours + bump) * 10) / 10);
  });
  const modalityRepeats = splitExact(repeatExams, modalityCompleted.map((value) => Math.max(value, 1)));
  const monthlyReportTat = rows.map((row, index) => {
    // Illustrative monthly signed-cohort median — not averaged into annual KPI.
    const base = row.month.radTatMedianMin / 60;
    return Math.round((base * (1 + pressure * 0.1) + ((index % 4) - 1.5) * 0.35) * 10) / 10;
  });

  // --- Capacity optimization: modality-specific, mutually exclusive drivers ---
  // Pools: (A) in-session inefficiency, (B) cancel/no-show share of unused, (C) recoverable downtime.
  // B and "generic unused" are not both counted — cancel gaps are a fraction of unused only.
  const delayDriverHours = IMAGING_MODALITIES.map((modality, index) => {
    const scannersCount = inventory[modality];
    const lateStart = Math.round(scannersCount * workingDays * (1 - scheduleAdherence) * (MEAN_LATE_START_MIN / 60) * 0.55);
    const excessDuration = Math.round(modalityInSession[index] * (0.035 + pressure * 0.03));
    const sessionInefficiency = Math.min(lateStart + excessDuration, Math.round(modalityInSession[index] * 0.12));
    const lateAllocated = Math.min(lateStart, sessionInefficiency);
    const excessAllocated = Math.max(0, sessionInefficiency - lateAllocated);
    // Cancellation/no-show gaps: exclusive slice of unused — not the full unused pool.
    const cancelGap = Math.round(Math.min(
      modalityUnused[index] * 0.18,
      (modalityCancelled[index] + modalityNoShows[index]) * (modalityExamMin[index] / 60) * 0.22,
    ));
    const recoverableDown = Math.round(modalityDowntime[index] * RECOVERABLE_DOWNTIME_SHARE[modality] * 0.75);
    const drivers = [
      { name: 'Late schedule starts', hours: lateAllocated },
      { name: 'Extended exam duration', hours: excessAllocated },
      { name: 'Cancellation / no-show gaps', hours: cancelGap },
      { name: 'Recoverable downtime', hours: recoverableDown },
    ];
    const recoverable = drivers.reduce((sum, item) => sum + item.hours, 0);
    // Bed constraint only on inpatient-origin share of this modality's opportunity.
    const inpatientShare = careSettingRequests[1] / Math.max(requests, 1);
    const bedShare = Math.round(clamp((bedOcc - 0.78) / 0.2, 0.04, 0.22) * inpatientShare * 1000) / 1000;
    const bedConstrained = Math.round(recoverable * bedShare);
    const feasibleHours = Math.max(0, recoverable - bedConstrained);
    const examHours = modalityExamMin[index] / 60 || 0.5;
    const potentialExtras = Math.floor(feasibleHours / Math.max(examHours, 0.2));
    // Eligible demand: overdue-weighted routine waitlist share — not the full modality backlog.
    // MRI/CT keep a larger eligible share so long exams are often capacity-bound, not demand-capped.
    const demandShare = modality === 'MRI' || modality === 'CT' ? 0.52 : 0.34;
    const overdueShare = modality === 'MRI' || modality === 'CT' ? 0.55 : 0.4;
    const eligibleDemand = Math.min(
      modalityBacklog[index],
      Math.round(modalityBacklog[index] * demandShare + modalityOverdue[index] * overdueShare),
    );
    const additional = Math.min(potentialExtras, eligibleDemand);
    return {
      modality,
      drivers,
      recoverableHours: recoverable,
      bedConstrainedHours: bedConstrained,
      feasibleRecoverableHours: feasibleHours,
      potentialAdditionalExams: potentialExtras,
      eligibleWaitlist: eligibleDemand,
      additionalExams: additional,
      examHours: Math.round(examHours * 100) / 100,
    };
  });

  const recoverableHours = delayDriverHours.reduce((sum, item) => sum + item.recoverableHours, 0);
  const bedConstrainedHours = delayDriverHours.reduce((sum, item) => sum + item.bedConstrainedHours, 0);
  const feasibleRecoverableHours = delayDriverHours.reduce((sum, item) => sum + item.feasibleRecoverableHours, 0);
  const potentialAdditionalExams = delayDriverHours.reduce((sum, item) => sum + item.potentialAdditionalExams, 0);
  const eligibleWaitlist = delayDriverHours.reduce((sum, item) => sum + item.eligibleWaitlist, 0);
  const additionalExams = delayDriverHours.reduce((sum, item) => sum + item.additionalExams, 0);
  const capacityGainHours = Math.round(
    delayDriverHours.reduce((sum, item) => sum + item.additionalExams * item.examHours, 0) * 10,
  ) / 10;
  const accessGainPct = staffedHours ? Math.round((capacityGainHours / staffedHours) * 1000) / 10 : 0;

  // Hospital-level driver rollup for charts (sum of exclusive modality drivers).
  const hospitalDelayDrivers = [
    { name: 'Late schedule starts', hours: delayDriverHours.reduce((sum, item) => sum + item.drivers[0].hours, 0) },
    { name: 'Extended exam duration', hours: delayDriverHours.reduce((sum, item) => sum + item.drivers[1].hours, 0) },
    { name: 'Cancellation / no-show gaps', hours: delayDriverHours.reduce((sum, item) => sum + item.drivers[2].hours, 0) },
    { name: 'Recoverable downtime', hours: delayDriverHours.reduce((sum, item) => sum + item.drivers[3].hours, 0) },
  ];

  const modalities = IMAGING_MODALITIES.map((id, index) => ({
    id,
    requests: modalityRequests[index],
    completed: modalityCompleted[index],
    cancelled: modalityCancelled[index],
    noShows: modalityNoShows[index],
    pending: modalityPending[index],
    scanners: inventory[id],
    examMin: modalityExamMin[index],
    usedHours: modalityUsedHours[index],
    inSessionUsed: modalityInSession[index],
    staffedHours: modalityStaffed[index],
    downtimeHours: modalityDowntime[index],
    unusedHours: modalityUnused[index],
    overtimeHours: modalityOvertime[index],
    utilization: modalityStaffed[index] ? modalityInSession[index] / modalityStaffed[index] : 0,
    backlog: modalityBacklog[index],
    overdue: modalityOverdue[index],
    medianWait: modalityMedianWait[index],
    reportTatHours: modalityReportTat[index],
    repeats: modalityRepeats[index],
    recoverableHours: delayDriverHours[index].recoverableHours,
    additionalExams: delayDriverHours[index].additionalExams,
    eligibleWaitlist: delayDriverHours[index].eligibleWaitlist,
  }));

  const monthlyRequests = rows.map((row) => row.month.radOrders);
  const monthlyCompleted = rows.map((_, index) => {
    // Period completed scaled across months by reported weights, then pending carve preserved at period grain.
    return splitExact(completed, rows.map((row) => Math.max(row.month.radReported, 1)))[index];
  });
  const monthlyCancelled = rows.map((row) => row.month.radCancelled);
  const monthlyUtil = rows.map((_, index) => {
    const w = Math.max(1, Math.round(staffedHours / rows.length));
    const u = Math.max(0, Math.round(inSessionUsed / rows.length));
    const wobble = ((index % 4) - 1.5) * 0.012;
    return Math.round(((u / w) + wobble) * 1000) / 10;
  });

  const avgExamHours = medianExamMin / 60 || 0.5;

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

    // Reporting lifecycle (distinct from exam completion)
    signedReports,
    unsignedReports,
    awaitingInterpretation: unsignedReports,

    allocatedHours,
    staffedHours,
    usedHours,
    inSessionUsed,
    unusedHours,
    downtimeHours,
    overtimeHours,
    ctDowntimeHours,
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
    monthlyCompletedFromWait,
    monthlyOtherExits,
    monthlyAdded,
    waitlistLedger: monthlyOpening.map((opening, index) => ({
      label: rows[index].label,
      opening,
      added: monthlyAdded[index],
      completedFromWaitlist: monthlyCompletedFromWait[index],
      otherExits: monthlyOtherExits[index],
      closing: monthlyBacklog[index],
    })),

    medianReportTatHours,
    p90ReportTatHours,
    reportTatTargetHours: REPORT_TAT_TARGET_HOURS,
    reportsOverTarget,
    repeatExams,
    technicalRepeats,
    clinicalRepeats,
    repeatExamRate: Math.round(repeatExamRate * 1000) / 1000,
    criticalResults,
    criticalAcked,
    criticalPendingAck,
    criticalAckRate: Math.round(criticalAckRate * 1000) / 1000,
    criticalDelayRate: Math.round(criticalDelayRate * 1000) / 1000,
    unsignedAging,
    monthlyReportTat,

    delayDriverHours: hospitalDelayDrivers,
    modalityCapacity: delayDriverHours,
    recoverableHours,
    bedConstrainedShare: recoverableHours ? Math.round((bedConstrainedHours / recoverableHours) * 1000) / 1000 : 0,
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
      examLifecycle: 'Exam Completed is distinct from Final Report Signed. Pending Exams are open examination-lifecycle requests at observation. Shared scenario orders are overlaid with a Radiology pending carve-out.',
      accessClock: 'Active waitlist age at observation (request still waiting). Not report TAT. Illustrative access target — not a national standard.',
      utilization: 'Scanner Utilization = in-session used hours ÷ staffed scanner hours. Staffed = in-session used + downtime + unused. Overtime = exam hours beyond staffed capacity after downtime; reported separately.',
      reportTat: 'Final Report TAT = final signature − exam completion for signed reports only. Unsigned reports use aging at observation — they do not have a completed TAT.',
      capacity: 'Recoverable hours and additional exams are computed per modality (distinct durations and demand). Bed haircut applies only to inpatient-eligible share. Modeled opportunity — not achieved capacity.',
      critical: 'Critical Ack. Rate = acknowledged ÷ critical results. Critical Delay Rate = pending acknowledgement ÷ critical results. These are distinct measures.',
    },
  };
}

export type RadiologyView = ReturnType<typeof buildRadiologyView>;
