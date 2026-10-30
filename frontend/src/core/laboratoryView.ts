import { SITE_SPECS, scenarioFor, type SiteCode } from '@/showcase/facts';
import { splitExact } from './ipdView';
import { sumKey, type ReportPeriod } from './period';

export const LAB_SECTIONS = [
  'Chemistry',
  'Hematology',
  'Microbiology',
  'Immunology',
  'Coagulation',
  'Histopathology',
] as const;
export type LabSection = (typeof LAB_SECTIONS)[number];

/** Distinct average minutes per completed test by section (not interchangeable). */
const TEST_MIN_BY_SECTION: Record<LabSection, number> = {
  Chemistry: 8,
  Hematology: 6,
  Microbiology: 42,
  Immunology: 18,
  Coagulation: 10,
  Histopathology: 95,
};

const SECTION_ORDER_SHARES = [0.34, 0.22, 0.14, 0.1, 0.08, 0.12];
const ANALYZERS_PER_SECTION: Record<LabSection, number> = {
  Chemistry: 3,
  Hematology: 2,
  Microbiology: 2,
  Immunology: 1,
  Coagulation: 1,
  Histopathology: 2,
};

const STAT_SHARE = 0.16;
const ITEMS_PER_ORDER = 2.35;
const SPECIMENS_PER_ORDER = 1.18;
const PENDING_SHARE_BASE = 0.04;
const UNSIGNED_SHARE = 0.035; // awaiting validation after analysis
const REJECTION_SHARE_BASE = 0.028;
const HEMOLYSIS_SHARE = 0.035;
const RECOLLECTION_SHARE = 0.022;
const CRITICAL_SHARE = 0.04;
const CORRECTED_SHARE = 0.012;
const RECEIPT_TAT_TARGET_MIN = 90;
const REPORT_TAT_TARGET_HOURS = 4;

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

function unit(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
  return sorted[index];
}

export function analyzerInventory(hospital: string): Record<LabSection, number> {
  const beds = SITE_SPECS[hospital as SiteCode]?.beds ?? 300;
  const scale = beds >= 450 ? 1.35 : beds >= 320 ? 1.1 : 1;
  return Object.fromEntries(
    LAB_SECTIONS.map((section) => [section, Math.max(1, Math.round(ANALYZERS_PER_SECTION[section] * scale))]),
  ) as Record<LabSection, number>;
}

/** Shared Laboratory scenario for screens, Assist, alerts, and what-if. */
export function buildLaboratoryView(hospital: string, year: number, period: ReportPeriod = 'year') {
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
  const inventory = analyzerInventory(hospital);
  const totalAnalyzers = LAB_SECTIONS.reduce((sum, section) => sum + inventory[section], 0);
  const siteSeed = (SITE_SPECS[hospital as SiteCode]?.beds ?? 300) + year * 19;

  // --- Order / test / specimen grains (distinct) ---
  // Shared labOrders = unique test orders. Each order carries multiple assay items.
  const orders = sumKey(rows, 'labOrders');
  const cancelledOrders = sumKey(rows, 'labCancelled');
  const sharedDelayed = sumKey(rows, 'labDelayed');
  const sharedResulted = sumKey(rows, 'labResulted');

  const testItems = Math.round(orders * ITEMS_PER_ORDER);
  const cancelledTests = Math.round(cancelledOrders * ITEMS_PER_ORDER);
  // Pending tests are observation-open items — overlay on shared delayed + residual.
  const pendingShare = PENDING_SHARE_BASE + pressure * 0.025;
  const pendingTests = Math.min(
    Math.max(0, testItems - cancelledTests),
    Math.max(Math.round(sharedDelayed * ITEMS_PER_ORDER * 0.85), Math.round(testItems * pendingShare)),
  );
  // Completed tests = released results (analytical + validation done). Distinct from orders.
  const completedBase = Math.round(sharedResulted * ITEMS_PER_ORDER);
  const completedTests = Math.min(testItems - cancelledTests - pendingTests, completedBase);
  const completionRate = testItems ? completedTests / testItems : 0;

  const statTests = Math.round(testItems * STAT_SHARE);
  const routineTests = Math.max(0, testItems - statTests);
  const statShare = testItems ? statTests / testItems : 0;

  // Specimens: distinct from orders and tests.
  const specimensCollected = Math.round(orders * SPECIMENS_PER_ORDER);
  const samplesReceived = Math.round(specimensCollected * (0.97 - pressure * 0.02));
  const assessed = samplesReceived;
  const rejected = Math.round(assessed * (REJECTION_SHARE_BASE + pressure * 0.015));
  const accepted = assessed - rejected;
  const rejectionRate = assessed ? rejected / assessed : 0;
  const hemolyzed = Math.round(assessed * (HEMOLYSIS_SHARE + pressure * 0.01));
  // Hemolysis overlaps rejection — not all hemolyzed are rejected.
  const hemolysisRate = assessed ? hemolyzed / assessed : 0;
  const recollections = Math.round(rejected * 0.72 + assessed * RECOLLECTION_SHARE * 0.35);
  const recollectionRate = assessed ? recollections / assessed : 0;

  const sectionOrders = splitExact(orders, SECTION_ORDER_SHARES);
  const sectionTests = splitExact(testItems, SECTION_ORDER_SHARES);
  const sectionCompleted = splitExact(completedTests, SECTION_ORDER_SHARES);
  const sectionPending = splitExact(pendingTests, SECTION_ORDER_SHARES);
  const sectionRejected = splitExact(rejected, SECTION_ORDER_SHARES);

  const careShares = [0.2, 0.36, 0.44]; // ED, Inpatient, Outpatient
  const careOrders = splitExact(orders, careShares);
  const careCompleted = splitExact(completedTests, careShares);
  const careSettings = [
    { name: 'Emergency', orders: careOrders[0], completedTests: careCompleted[0] },
    { name: 'Inpatient', orders: careOrders[1], completedTests: careCompleted[1] },
    { name: 'Outpatient', orders: careOrders[2], completedTests: careCompleted[2] },
  ];

  // Rejection reasons (partition of rejected specimens)
  const rejectionReasons = splitExact(rejected, [0.32, 0.18, 0.16, 0.14, 0.12, 0.08]).map((count, index) => ({
    name: ['Hemolysis', 'Clotted sample', 'Incorrect container', 'Insufficient volume', 'Labeling discrepancy', 'Transport condition'][index],
    count,
  }));
  const recollectionCauses = splitExact(recollections, [0.4, 0.22, 0.2, 0.18]).map((count, index) => ({
    name: ['Rejected specimen', 'Lost/damaged in transit', 'Insufficient for add-on', 'Clinician request'][index],
    count,
  }));

  // --- Transport / pre-analytical clock (collection → receipt) ---
  const transportSampleSize = Math.min(samplesReceived, 350);
  const transportMinutes: number[] = [];
  for (let i = 0; i < transportSampleSize; i += 1) {
    const u = unit(siteSeed + i * 3.1);
    transportMinutes.push(Math.max(8, Math.round((18 + pressure * 22) * (0.45 + u * 1.7))));
  }
  transportMinutes.sort((a, b) => a - b);
  const medianTransportMin = quantile(transportMinutes, 0.5);
  const p90TransportMin = quantile(transportMinutes, 0.9);

  // --- Analyzer time accounting ---
  // Staffed = in-session processing + QC/setup + downtime + unused
  // Processing used = in-session + overtime
  // Utilization = in-session ÷ staffed
  const hoursPerAnalyzerDay = 10;
  const staffedHours = Math.round(totalAnalyzers * hoursPerAnalyzerDay * workingDays * (0.9 - pressure * 0.04));
  const allocatedHours = Math.round(totalAnalyzers * hoursPerAnalyzerDay * workingDays * 0.96);

  const sectionExamMin = LAB_SECTIONS.map((section) => Math.round(TEST_MIN_BY_SECTION[section] * (1 + pressure * 0.1)));
  const sectionProcessHours = sectionCompleted.map((count, index) => Math.round((count * sectionExamMin[index]) / 60));
  const totalProcessHours = sectionProcessHours.reduce((sum, value) => sum + value, 0);

  const downtimeHours = Math.round(staffedHours * (0.05 + pressure * 0.07));
  const qcHoldHours = Math.round(staffedHours * (0.04 + pressure * 0.03));
  const staffedCapacity = Math.max(0, staffedHours - downtimeHours - qcHoldHours);
  const inSessionUsed = Math.min(totalProcessHours, staffedCapacity);
  const unusedHours = Math.max(0, staffedHours - inSessionUsed - downtimeHours - qcHoldHours);
  const overtimeHours = Math.max(0, totalProcessHours - inSessionUsed);
  const usedHours = inSessionUsed + overtimeHours;
  const analyzerUtilization = staffedHours ? inSessionUsed / staffedHours : 0;
  const testsPerAnalyzerHour = inSessionUsed ? completedTests / inSessionUsed : 0;

  const sectionStaffed = splitExact(staffedHours, LAB_SECTIONS.map((section) => inventory[section]));
  const sectionInSession = splitExact(inSessionUsed, sectionProcessHours.map((value) => Math.max(value, 1)));
  const sectionDowntime = splitExact(downtimeHours, LAB_SECTIONS.map((section) => inventory[section]));
  const sectionQc = splitExact(qcHoldHours, LAB_SECTIONS.map((section) => inventory[section]));
  const sectionUnused = sectionStaffed.map((staffed, index) => Math.max(0, staffed - sectionInSession[index] - sectionDowntime[index] - sectionQc[index]));
  const sectionOvertime = sectionProcessHours.map((value, index) => Math.max(0, value - sectionInSession[index]));

  const downtimeReasons = splitExact(downtimeHours, [0.36, 0.26, 0.22, 0.16]).map((hours, index) => ({
    name: ['Equipment fault', 'Maintenance', 'Reagent / consumable', 'Staffing gap'][index],
    hours,
  }));

  // Analyzer rows (one illustrative row per instrument slot).
  // Split staffed/downtime/QC first, then allocate in-session into residual capacity so
  // staffed = in-session + QC + downtime + unused holds on every analyzer.
  const analyzers: {
    id: string;
    section: LabSection;
    staffedHours: number;
    inSessionUsed: number;
    downtimeHours: number;
    qcHoldHours: number;
    unusedHours: number;
    overtimeHours: number;
    utilization: number;
    completed: number;
  }[] = [];
  for (const section of LAB_SECTIONS) {
    const count = inventory[section];
    const sIndex = LAB_SECTIONS.indexOf(section);
    const staffParts = splitExact(sectionStaffed[sIndex], Array(count).fill(1));
    const downParts = splitExact(sectionDowntime[sIndex], Array(count).fill(1));
    const qcParts = splitExact(sectionQc[sIndex], Array(count).fill(1));
    const doneParts = splitExact(sectionCompleted[sIndex], Array(count).fill(1));
    const capacityParts = staffParts.map((staffed, index) => Math.max(0, staffed - downParts[index] - qcParts[index]));
    const sectionInTarget = Math.min(sectionInSession[sIndex], capacityParts.reduce((sum, value) => sum + value, 0));
    const inParts = capacityParts.every((value) => value === 0)
      ? Array(count).fill(0)
      : splitExact(sectionInTarget, capacityParts.map((value) => Math.max(value, 1)));
    for (let i = 0; i < count; i += 1) {
      const inSession = Math.min(inParts[i], capacityParts[i]);
      const unused = staffParts[i] - inSession - downParts[i] - qcParts[i];
      const ot = Math.max(0, Math.round((sectionOvertime[sIndex] / count)));
      analyzers.push({
        id: `${section.slice(0, 3).toUpperCase()}-${i + 1}`,
        section,
        staffedHours: staffParts[i],
        inSessionUsed: inSession,
        downtimeHours: downParts[i],
        qcHoldHours: qcParts[i],
        unusedHours: unused,
        overtimeHours: ot,
        utilization: staffParts[i] ? inSession / staffParts[i] : 0,
        completed: doneParts[i],
      });
    }
  }
  // Reconcile analyzer OT / in-session sums to hospital totals after per-row rounding
  const otDrift = overtimeHours - analyzers.reduce((sum, item) => sum + item.overtimeHours, 0);
  if (otDrift !== 0 && analyzers.length) {
    analyzers[0].overtimeHours = Math.max(0, analyzers[0].overtimeHours + otDrift);
  }
  let inDrift = inSessionUsed - analyzers.reduce((sum, item) => sum + item.inSessionUsed, 0);
  while (inDrift !== 0 && analyzers.length) {
    const target = inDrift > 0
      ? analyzers.find((item) => item.unusedHours > 0)
      : analyzers.find((item) => item.inSessionUsed > 0);
    if (!target) break;
    const step = inDrift > 0 ? Math.min(inDrift, target.unusedHours) : -Math.min(-inDrift, target.inSessionUsed);
    target.inSessionUsed += step;
    target.unusedHours = target.staffedHours - target.inSessionUsed - target.downtimeHours - target.qcHoldHours;
    target.utilization = target.staffedHours ? target.inSessionUsed / target.staffedHours : 0;
    inDrift -= step;
  }

  // Testing backlog = pending analysis + pending validation proxy at observation
  const testingBacklog = pendingTests;
  const sectionBacklog = sectionPending.slice();

  // --- Result lifecycle ---
  // Completed tests already released. Pending validation is open after analysis.
  const pendingValidation = Math.round(completedTests * UNSIGNED_SHARE + pendingTests * 0.15);
  const releasedResults = completedTests;
  const criticalResults = Math.round(releasedResults * CRITICAL_SHARE);
  const criticalNotified = Math.round(criticalResults * (0.91 - pressure * 0.08));
  const criticalPendingComm = Math.max(0, criticalResults - criticalNotified);
  const criticalNotifyRate = criticalResults ? criticalNotified / criticalResults : 0;
  const criticalDelayRate = criticalResults ? criticalPendingComm / criticalResults : 0;
  // Acknowledgement is a subset of notified — distinct from notify rate.
  const criticalAcked = Math.round(criticalNotified * (0.88 - pressure * 0.05));
  const criticalAckRate = criticalResults ? criticalAcked / criticalResults : 0;
  const correctedReports = Math.round(releasedResults * CORRECTED_SHARE);
  const correctedReportRate = releasedResults ? correctedReports / releasedResults : 0;

  // Receipt-to-release TAT (Laboratory reporting TAT) — signed/released cohort only
  const tatSampleSize = Math.min(releasedResults, 400);
  const tatHours: number[] = [];
  for (let i = 0; i < tatSampleSize; i += 1) {
    const u = unit(siteSeed + i * 5.7);
    const isStat = i % Math.max(2, Math.round(1 / STAT_SHARE)) === 0;
    const base = isStat ? 1.2 + pressure * 0.8 : 2.4 + pressure * 2.2;
    tatHours.push(Math.max(0.4, Math.round(base * (0.5 + u * 1.6) * 10) / 10));
  }
  tatHours.sort((a, b) => a - b);
  const medianLabTatHours = quantile(tatHours, 0.5);
  const p90LabTatHours = quantile(tatHours, 0.9);
  const overTargetShare = tatHours.length
    ? tatHours.filter((value) => value > REPORT_TAT_TARGET_HOURS).length / tatHours.length
    : 0;
  const resultsOverTarget = Math.round(releasedResults * overTargetShare);

  const sectionTat = LAB_SECTIONS.map((section, index) => {
    const bump = section === 'Histopathology' ? 18 : section === 'Microbiology' ? 6 : index * 0.15;
    return Math.max(0.5, Math.round((medianLabTatHours + bump) * 10) / 10);
  });

  const unsignedAging = splitExact(pendingValidation, [0.42, 0.28, 0.18, 0.12]).map((count, index) => ({
    name: ['0–4 h', '4–12 h', '12–24 h', '>24 h'][index],
    count,
  }));

  // Monthly series
  const monthlyOrders = rows.map((row) => row.month.labOrders);
  const monthlyCompleted = splitExact(completedTests, rows.map((row) => Math.max(row.month.labResulted, 1)));
  const monthlyReceived = splitExact(samplesReceived, rows.map((row) => Math.max(row.month.labOrders, 1)));
  const monthlyRejected = splitExact(rejected, rows.map((row) => Math.max(row.month.labOrders, 1)));
  const monthlyTat = rows.map((_, index) => Math.round((medianLabTatHours + ((index % 4) - 1.5) * 0.2) * 10) / 10);
  const monthlyUtil = rows.map((_, index) => {
    const wobble = ((index % 4) - 1.5) * 0.012;
    return Math.round((analyzerUtilization + wobble) * 1000) / 10;
  });

  // Pending work roll-forward (test items) — opening + new − completed − cancelled = closing
  const openingPending = Math.round(testItems * (0.05 + pressure * 0.04));
  const monthlyNew = splitExact(testItems, rows.map((row) => Math.max(row.month.labOrders, 1)));
  const monthlyDone = monthlyCompleted.slice();
  const monthlyCancel = splitExact(cancelledTests, rows.map((row) => Math.max(row.month.labCancelled, 1)));
  const monthlyOpening: number[] = [];
  const monthlyClosing: number[] = [];
  let cursor = openingPending;
  for (let index = 0; index < rows.length; index += 1) {
    monthlyOpening.push(cursor);
    const available = cursor + monthlyNew[index];
    const done = Math.min(monthlyDone[index], available);
    const cancel = Math.min(monthlyCancel[index], available - done);
    const close = cursor + monthlyNew[index] - done - cancel;
    monthlyClosing.push(close);
    cursor = close;
  }
  const closingPending = monthlyClosing[monthlyClosing.length - 1] ?? pendingTests;
  // Align headline pending to ledger closing when period is year/quarter end observation
  const pendingLedger = {
    opening: monthlyOpening[0],
    added: monthlyNew.reduce((sum, value) => sum + value, 0),
    completed: monthlyDone.reduce((sum, value) => sum + value, 0),
    cancelled: monthlyCancel.reduce((sum, value) => sum + value, 0),
    closing: closingPending,
    rows: monthlyOpening.map((opening, index) => ({
      label: rows[index].label,
      opening,
      added: monthlyNew[index],
      completed: monthlyDone[index],
      cancelled: monthlyCancel[index],
      closing: monthlyClosing[index],
    })),
  };

  // --- Capacity optimization (section-local, exclusive drivers) ---
  const sectionCapacity = LAB_SECTIONS.map((section, index) => {
    const lateStart = Math.round(inventory[section] * workingDays * 0.08 * 0.4);
    const excessDuration = Math.round(sectionInSession[index] * (0.04 + pressure * 0.03));
    const rejectRework = Math.round(Math.min(sectionUnused[index] * 0.2, sectionRejected[index] * (sectionExamMin[index] / 60) * 0.25));
    const recoverableDown = Math.round(sectionDowntime[index] * 0.55);
    const drivers = [
      { name: 'Late batch starts', hours: lateStart },
      { name: 'Extended analytical time', hours: excessDuration },
      { name: 'Rejection / rework gaps', hours: rejectRework },
      { name: 'Recoverable downtime', hours: recoverableDown },
    ];
    const recoverable = drivers.reduce((sum, item) => sum + item.hours, 0);
    const examHours = sectionExamMin[index] / 60 || 0.2;
    const potential = Math.floor(recoverable / Math.max(examHours, 0.15));
    const eligible = Math.min(sectionBacklog[index], Math.round(sectionBacklog[index] * 0.7 + sectionPending[index] * 0.2));
    const additional = Math.min(potential, eligible);
    return {
      section,
      drivers,
      recoverableHours: recoverable,
      potentialAdditionalTests: potential,
      eligibleBacklog: eligible,
      additionalTests: additional,
      examHours: Math.round(examHours * 100) / 100,
      avoidableRework: Math.round(sectionRejected[index] * 0.55),
    };
  });

  const recoverableHours = sectionCapacity.reduce((sum, item) => sum + item.recoverableHours, 0);
  const additionalTests = sectionCapacity.reduce((sum, item) => sum + item.additionalTests, 0);
  const eligibleBacklog = sectionCapacity.reduce((sum, item) => sum + item.eligibleBacklog, 0);
  const avoidableRework = sectionCapacity.reduce((sum, item) => sum + item.avoidableRework, 0);
  const potentialAdditionalTests = sectionCapacity.reduce((sum, item) => sum + item.potentialAdditionalTests, 0);
  const hospitalDrivers = [
    { name: 'Late batch starts', hours: sectionCapacity.reduce((sum, item) => sum + item.drivers[0].hours, 0) },
    { name: 'Extended analytical time', hours: sectionCapacity.reduce((sum, item) => sum + item.drivers[1].hours, 0) },
    { name: 'Rejection / rework gaps', hours: sectionCapacity.reduce((sum, item) => sum + item.drivers[2].hours, 0) },
    { name: 'Recoverable downtime', hours: sectionCapacity.reduce((sum, item) => sum + item.drivers[3].hours, 0) },
  ];

  const sections = LAB_SECTIONS.map((id, index) => ({
    id,
    orders: sectionOrders[index],
    tests: sectionTests[index],
    completed: sectionCompleted[index],
    pending: sectionPending[index],
    rejected: sectionRejected[index],
    analyzers: inventory[id],
    examMin: sectionExamMin[index],
    staffedHours: sectionStaffed[index],
    inSessionUsed: sectionInSession[index],
    downtimeHours: sectionDowntime[index],
    qcHoldHours: sectionQc[index],
    unusedHours: sectionUnused[index],
    overtimeHours: sectionOvertime[index],
    utilization: sectionStaffed[index] ? sectionInSession[index] / sectionStaffed[index] : 0,
    backlog: sectionBacklog[index],
    reportTatHours: sectionTat[index],
    recoverableHours: sectionCapacity[index].recoverableHours,
    additionalTests: sectionCapacity[index].additionalTests,
    eligibleBacklog: sectionCapacity[index].eligibleBacklog,
  }));

  const chemistryDowntimeHours = sections.find((item) => item.id === 'Chemistry')?.downtimeHours ?? 0;

  return {
    hospital,
    year,
    period,
    periodLabel,
    observationDate,
    workingDays,
    totalAnalyzers,
    labels: rows.map((row) => row.label),

    // Order grain
    orders,
    cancelledOrders,
    // Test grain
    testItems,
    cancelledTests,
    completedTests,
    pendingTests,
    completionRate: Math.round(completionRate * 1000) / 1000,
    statTests,
    routineTests,
    statShare: Math.round(statShare * 1000) / 1000,
    // Specimen grain
    specimensCollected,
    samplesReceived,
    assessed,
    accepted,
    rejected,
    rejectionRate: Math.round(rejectionRate * 1000) / 1000,
    hemolyzed,
    hemolysisRate: Math.round(hemolysisRate * 1000) / 1000,
    recollections,
    recollectionRate: Math.round(recollectionRate * 1000) / 1000,
    rejectionReasons,
    recollectionCauses,
    careSettings,

    medianTransportMin,
    p90TransportMin,
    collectionToReceiptTargetMin: RECEIPT_TAT_TARGET_MIN,

    allocatedHours,
    staffedHours,
    usedHours,
    inSessionUsed,
    unusedHours,
    downtimeHours,
    qcHoldHours,
    overtimeHours,
    chemistryDowntimeHours,
    analyzerUtilization: Math.round(analyzerUtilization * 1000) / 1000,
    testsPerAnalyzerHour: Math.round(testsPerAnalyzerHour * 10) / 10,
    testingBacklog,
    analyzers,
    downtimeReasons,

    pendingValidation,
    releasedResults,
    medianLabTatHours,
    p90LabTatHours,
    reportTatTargetHours: REPORT_TAT_TARGET_HOURS,
    resultsOverTarget,
    criticalResults,
    criticalNotified,
    criticalPendingComm,
    criticalNotifyRate: Math.round(criticalNotifyRate * 1000) / 1000,
    criticalDelayRate: Math.round(criticalDelayRate * 1000) / 1000,
    criticalAcked,
    criticalAckRate: Math.round(criticalAckRate * 1000) / 1000,
    correctedReports,
    correctedReportRate: Math.round(correctedReportRate * 1000) / 1000,
    unsignedAging,

    pendingLedger,
    sections,
    sectionCapacity,
    delayDriverHours: hospitalDrivers,
    recoverableHours,
    additionalTests,
    eligibleBacklog,
    avoidableRework,
    potentialAdditionalTests,
    capacityGainHours: Math.round(additionalTests * (medianLabTatHours > 0 ? Math.min(0.5, TEST_MIN_BY_SECTION.Chemistry / 60) : 0.2) * 10) / 10,

    monthlyOrders,
    monthlyCompleted,
    monthlyReceived,
    monthlyRejected,
    monthlyTat,
    monthlyUtil,

    methodology: {
      grains: 'Orders ≠ Specimens ≠ Tests ≠ Results. One order averages ~2.35 assays and ~1.18 specimens. Completed Tests are released results; Pending Tests are open test-lifecycle items.',
      specimenLifecycle: 'Collected → Transported → Received → Assessed → Accepted | Rejected. Recollections create replacement specimens without duplicating the original order.',
      reportTat: 'Laboratory reporting TAT = Final release − Specimen receipt for released results only. Pending validation is aged separately.',
      utilization: 'Analyzer Utilization = In-session processing ÷ Staffed hours. Staffed = in-session + QC/setup + downtime + unused. Overtime reported separately.',
      critical: 'Critical Notify Rate = successfully communicated ÷ critical results. Distinct from acknowledgement rate and from delay/pending share.',
      capacity: 'Recoverable hours are exclusive section drivers. Additional tests respect section-compatible analyzers and eligible backlog. Illustrative — not achieved.',
      accessClock: 'Transport Time = collection-to-receipt (pre-analytical). Not receipt-to-release Lab TAT.',
    },
  };
}

export type LaboratoryView = ReturnType<typeof buildLaboratoryView>;
