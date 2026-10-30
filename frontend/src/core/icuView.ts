import { SITE_SPECS, scenarioFor, type SiteCode } from '@/showcase/facts';
import { splitExact } from './ipdView';
import { type ReportPeriod } from './period';

/** ICU units. Every stay maps to exactly one unit. */
export const ICU_UNITS = ['Medical ICU', 'Surgical ICU', 'Cardiac ICU', 'Neuro ICU'] as const;
export type IcuUnit = (typeof ICU_UNITS)[number];

const UNIT_BED_SHARES = [0.34, 0.28, 0.22, 0.16];
const UNIT_ADMIT_SHARES = [0.36, 0.3, 0.2, 0.14];
const UNIT_LOS_FACTOR = [1.05, 0.92, 1.18, 1.25];
const UNIT_VENT_SHARE = [0.42, 0.28, 0.35, 0.3];

const ADMISSION_SOURCES = ['Emergency', 'Operating theatre', 'Ward escalation', 'External transfer'] as const;
const SOURCE_SHARES = [0.42, 0.28, 0.22, 0.08];

const DISCHARGE_DEST = ['Step-down / HDU', 'General ward', 'Death departing ICU', 'External transfer'] as const;
const DEST_SHARES = [0.48, 0.38, 0.08, 0.06];

const DELAY_REASONS = ['No staffed bed', 'Downstream bed wait', 'Equipment prep', 'Coordination handoff', 'Transport lag'] as const;
const DELAY_SHARES = [0.32, 0.28, 0.14, 0.16, 0.1];

const DOWNTIME_CAUSES = ['Scheduled PM', 'Unplanned repair', 'Cleaning / prep', 'Parts wait'] as const;
const DOWNTIME_SHARES = [0.35, 0.25, 0.28, 0.12];

const SAFETY_CATEGORIES = ['Device documentation gap', 'Handoff incomplete', 'Review overdue', 'Surveillance form missing', 'Other process'] as const;
const SAFETY_SHARES = [0.28, 0.22, 0.2, 0.18, 0.12];

const SHIFTS = ['Day', 'Evening', 'Night'] as const;
const SHIFT_SHARES = [0.4, 0.32, 0.28];

const ADMISSION_WAIT_TARGET_MIN = 90;
const REVIEW_TARGET_HOURS = 72;

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

function tilt(hospital: string, year: number): number {
  const fact = scenarioFor(hospital, year).focus;
  const occ = fact.staffedBeds ? fact.occupiedBeds / fact.staffedBeds : 0.8;
  return Math.min(0.16, Math.max(0, occ - 0.74));
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

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function r1(value: number): number {
  return Math.round(value * 10) / 10;
}

function r3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

const CACHE = new Map<string, IcuView>();

/** Shared ICU scenario for screens, Assist, alerts, and what-if. Physical beds ≠ staffed beds ≠ available staffed beds. */
export function buildIcuView(hospital: string, year: number, period: ReportPeriod = 'year'): IcuView {
  const cacheKey = `${hospital}|${year}|${period}`;
  const cached = CACHE.get(cacheKey);
  if (cached) return cached;
  const view = compute(hospital, year, period);
  CACHE.set(cacheKey, view);
  return view;
}

function compute(hospital: string, year: number, period: ReportPeriod) {
  const rows = period === 'year'
    ? scenarioFor(hospital, year).months.map((month, index) => ({
      label: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index],
      month,
    }))
    : periodRows(hospital, year, period);
  const monthCount = rows.length;
  const pressure = tilt(hospital, year);
  const days = daysInPeriod(period, year);
  const daysPerMonth = days / monthCount;
  const periodLabel = period === 'year' ? `Full year ${year}` : `${period} ${year}`;
  const observationDate = period === 'year'
    ? `31 Dec ${year}`
    : ({ Q1: `31 Mar ${year}`, Q2: `30 Jun ${year}`, Q3: `30 Sep ${year}`, Q4: `31 Dec ${year}` } as const)[period];
  const site = SITE_SPECS[hospital as SiteCode];
  const physicalBeds = hospital === 'ALL'
    ? (['H1', 'H2', 'H3', 'H4', 'H5'] as SiteCode[]).reduce((total, code) => total + SITE_SPECS[code].icu, 0)
    : (site?.icu ?? 24);
  const siteSeed = physicalBeds + year * 19;
  const focus = scenarioFor(hospital, year).focus;

  // Staffed beds ≤ physical beds. Unstaffed + blocked physical are explicit.
  const staffedBeds = Math.max(1, Math.round(physicalBeds * (0.88 - pressure * 0.08)));
  const blockedStaffed = Math.max(0, Math.round(staffedBeds * (0.03 + pressure * 0.04)));
  const avgOccupied = Math.min(
    staffedBeds - blockedStaffed,
    Math.round((focus.icuOccupied / Math.max(1, focus.icuStaffed)) * staffedBeds * (0.96 + pressure * 0.04)),
  );
  const availableStaffed = Math.max(0, staffedBeds - avgOccupied - blockedStaffed);
  const unstaffedPhysical = Math.max(0, physicalBeds - staffedBeds);

  // --- Census ledger: opening + admits + transfers-in − discharges − transfers-out − deaths = closing ---
  const admissionsByMonth = rows.map((row, index) => {
    const base = Math.round(row.month.admissions * (0.085 + pressure * 0.04));
    const seasonal = 1 + 0.06 * Math.sin(index * 1.4 + siteSeed * 0.01);
    return Math.max(1, Math.round(base * seasonal));
  });
  const admissions = sum(admissionsByMonth);
  const transfersInByMonth = admissionsByMonth.map((value) => Math.round(value * (0.08 + pressure * 0.03)));
  const transfersIn = sum(transfersInByMonth);

  const unitBeds = splitExact(physicalBeds, UNIT_BED_SHARES);
  const unitStaffed = splitExact(staffedBeds, UNIT_BED_SHARES);
  const unitAdmissions = splitExact(admissions, UNIT_ADMIT_SHARES);
  const unitTransfersIn = splitExact(transfersIn, UNIT_ADMIT_SHARES);

  // Monthly census roll-forward with mutually exclusive exit categories
  const censusOpening: number[] = [];
  const censusClosing: number[] = [];
  const dischargesByMonth: number[] = [];
  const transfersOutByMonth: number[] = [];
  const deathsByMonth: number[] = [];
  const patientDaysByMonth: number[] = [];
  let cursor = Math.round(avgOccupied * (0.94 + unit(siteSeed) * 0.08));
  for (let index = 0; index < monthCount; index += 1) {
    const opening = cursor;
    const admitted = admissionsByMonth[index] + transfersInByMonth[index];
    const targetClose = Math.round(avgOccupied * (0.95 + 0.06 * Math.sin(index * 1.1 + 0.3)));
    const available = opening + admitted;
    const exitsNeeded = Math.max(0, available - Math.min(staffedBeds - blockedStaffed, targetClose));
    const deathShare = 0.055 + pressure * 0.02;
    const transferOutShare = 0.12 + pressure * 0.04;
    const deaths = Math.min(exitsNeeded, Math.round(exitsNeeded * deathShare));
    const transfersOut = Math.min(exitsNeeded - deaths, Math.round(exitsNeeded * transferOutShare));
    const discharges = Math.max(0, exitsNeeded - deaths - transfersOut);
    const closing = opening + admitted - discharges - transfersOut - deaths;
    // Midnight census convention: patient-days ≈ average of opening and closing × days in month
    const patientDays = Math.round(((opening + closing) / 2) * daysPerMonth);
    censusOpening.push(opening);
    censusClosing.push(closing);
    dischargesByMonth.push(discharges);
    transfersOutByMonth.push(transfersOut);
    deathsByMonth.push(deaths);
    patientDaysByMonth.push(patientDays);
    cursor = closing;
  }
  const discharges = sum(dischargesByMonth);
  const transfersOut = sum(transfersOutByMonth);
  const deaths = sum(deathsByMonth);
  const patientDays = sum(patientDaysByMonth);
  const avgCensus = days > 0 ? r1(patientDays / days) : 0;
  const openingCensus = censusOpening[0] ?? 0;
  const closingCensus = censusClosing[censusClosing.length - 1] ?? 0;
  // Identity: opening + admits + tin − disc − tout − deaths = closing
  const censusIdentity = openingCensus + admissions + transfersIn - discharges - transfersOut - deaths;

  const pendingTransfers = Math.max(
    1,
    Math.round(admissions * (0.012 + pressure * 0.04) / Math.max(1, monthCount) * 3),
  );
  const demandPressure = availableStaffed > 0
    ? r1(pendingTransfers / availableStaffed)
    : pendingTransfers > 0 ? 9.9 : 0;

  // --- Admission wait sample (request → physical arrival) ---
  const waitSampleSize = Math.min(admissions, 360);
  const waitAll: number[] = [];
  for (let i = 0; i < waitSampleSize; i += 1) {
    const u = unit(siteSeed + i * 3.7);
    const base = 35 + pressure * 90;
    waitAll.push(Math.max(8, Math.round(base * (0.4 + u * 1.9))));
  }
  waitAll.sort((a, b) => a - b);
  const medianAdmissionWaitMin = quantile(waitAll, 0.5);
  const p90AdmissionWaitMin = quantile(waitAll, 0.9);
  const delayedShare = waitAll.length ? waitAll.filter((value) => value > ADMISSION_WAIT_TARGET_MIN).length / waitAll.length : 0;
  const delayedAdmissions = Math.round(admissions * delayedShare);
  const boardingHours = Math.round(sum(waitAll) / 60 * (admissions / Math.max(1, waitSampleSize)));

  // --- Completed-stay LOS (departure − arrival); open stays excluded ---
  const completedStays = discharges + transfersOut + deaths;
  const losSampleSize = Math.min(completedStays, 400);
  const losHours: number[] = [];
  for (let i = 0; i < losSampleSize; i += 1) {
    const u = unit(siteSeed + i * 5.1);
    const unitFactor = UNIT_LOS_FACTOR[i % UNIT_LOS_FACTOR.length];
    const base = (48 + pressure * 36) * unitFactor;
    losHours.push(Math.max(6, Math.round(base * (0.35 + u * 2.2))));
  }
  losHours.sort((a, b) => a - b);
  const medianLosHours = quantile(losHours, 0.5);
  const meanLosHours = losHours.length ? r1(sum(losHours) / losHours.length) : 0;
  const p90LosHours = quantile(losHours, 0.9);

  // Transfer delay (transfer-ready → actual exit) and discharge-ready delay
  const transferDelaySample: number[] = [];
  for (let i = 0; i < Math.min(transfersOut + Math.round(discharges * 0.4), 200); i += 1) {
    const u = unit(siteSeed + i * 7.2);
    transferDelaySample.push(Math.max(0.5, r1((4 + pressure * 10) * (0.4 + u * 1.8))));
  }
  transferDelaySample.sort((a, b) => a - b);
  const medianTransferDelayHours = quantile(transferDelaySample, 0.5);
  const dischargeReadySample: number[] = [];
  for (let i = 0; i < Math.min(discharges, 220); i += 1) {
    const u = unit(siteSeed + i * 6.4);
    dischargeReadySample.push(Math.max(0.4, r1((3 + pressure * 8) * (0.45 + u * 1.7))));
  }
  dischargeReadySample.sort((a, b) => a - b);
  const medianDischargeReadyDelayHours = quantile(dischargeReadySample, 0.5);
  const avoidableTransferDelayHours = Math.round(medianTransferDelayHours * transfersOut * 0.55);

  // --- Staffing by shift ---
  const nursesPerShiftTarget = Math.max(1, Math.round(staffedBeds / 2.2));
  const requiredNurseHours = nursesPerShiftTarget * 8 * 3 * days;
  const coverageRate = r3(Math.min(0.99, 0.9 - pressure * 0.12 + unit(siteSeed + 2) * 0.04));
  const staffedNurseHours = Math.round(requiredNurseHours * coverageRate);
  const staffingGapHours = Math.max(0, requiredNurseHours - staffedNurseHours);
  const nursesOnDuty = Math.max(1, Math.round(nursesPerShiftTarget * coverageRate));
  const patientNurseRatio = r1(avgOccupied / nursesOnDuty);
  const nurseCoverage = coverageRate;

  const shiftRows = SHIFTS.map((name, index) => {
    const required = Math.round(requiredNurseHours * SHIFT_SHARES[index]);
    const staffed = Math.round(staffedNurseHours * SHIFT_SHARES[index]);
    return {
      name,
      requiredHours: required,
      staffedHours: staffed,
      gapHours: Math.max(0, required - staffed),
      coverage: required > 0 ? r3(staffed / required) : 0,
    };
  });

  // --- Ventilator / equipment ledger ---
  const ventInventory = Math.max(4, Math.round(physicalBeds * 0.75));
  const ventInUse = Math.min(ventInventory, Math.round(avgOccupied * (0.38 + pressure * 0.12)));
  const ventMaintenance = Math.max(0, Math.round(ventInventory * (0.06 + pressure * 0.04)));
  const ventPrep = Math.max(0, Math.round(ventInventory * 0.05));
  const ventAvailable = Math.max(0, ventInventory - ventInUse - ventMaintenance - ventPrep);
  // Snapshot identity
  const ventSnapshotSum = ventInUse + ventAvailable + ventMaintenance + ventPrep;
  const ventPatientDays = Math.round(patientDays * (0.34 + pressure * 0.08));
  const eligibleVentHours = ventInventory * 24 * days;
  const assignedVentHours = Math.round(ventPatientDays * 24 * 0.92);
  const downtimeHours = Math.round((ventMaintenance + ventPrep) * 24 * days / Math.max(1, ventInventory) * (ventMaintenance + ventPrep));
  const maintenanceHours = Math.round(downtimeHours * DOWNTIME_SHARES[0]);
  const repairHours = Math.round(downtimeHours * DOWNTIME_SHARES[1]);
  const prepHours = Math.round(downtimeHours * DOWNTIME_SHARES[2]);
  const partsHours = Math.max(0, downtimeHours - maintenanceHours - repairHours - prepHours);
  const ventUtilization = eligibleVentHours > 0 ? r3(Math.min(0.99, assignedVentHours / eligibleVentHours)) : 0;
  const equipmentReadiness = ventInventory > 0 ? r3((ventInUse + ventAvailable) / ventInventory) : 0;

  // --- Quality / safety process (illustrative; not validated infection rates) ---
  const readmissions48h = Math.round(discharges * (0.028 + pressure * 0.02));
  const readmissionRate = discharges > 0 ? r3(readmissions48h / discharges) : 0;
  const stepDownExits = Math.round((discharges + transfersOut) * DEST_SHARES[0]);
  const unplannedReturns = Math.round(stepDownExits * (0.035 + pressure * 0.025));
  const unplannedTransferRate = stepDownExits > 0 ? r3(unplannedReturns / stepDownExits) : 0;
  const safetyEvents = Math.round(admissions * (0.04 + pressure * 0.03));
  const unresolvedReviews = Math.max(1, Math.round(safetyEvents * (0.22 + pressure * 0.15)));
  const closedReviews = Math.max(0, safetyEvents - unresolvedReviews);
  const timelyClosed = Math.round(closedReviews * (0.72 - pressure * 0.1));
  const reviewTimeliness = closedReviews > 0 ? r3(timelyClosed / closedReviews) : 0;
  const deviceDays = Math.round(ventPatientDays + patientDays * 0.55);
  const documentedDeviceDays = Math.round(deviceDays * (0.86 - pressure * 0.08));
  const surveillanceCompleteness = deviceDays > 0 ? r3(documentedDeviceDays / deviceDays) : 0;
  // CLABSI/CAUTI/VAE rates intentionally NOT computed as validated rates — surveillance classification is illustrative completeness only.

  // --- Unit rows ---
  const unitOccupied = splitExact(avgOccupied, UNIT_BED_SHARES);
  const unitPatientDays = splitExact(patientDays, UNIT_ADMIT_SHARES);
  const unitPending = splitExact(pendingTransfers, UNIT_ADMIT_SHARES);
  const unitRows = ICU_UNITS.map((name, index) => {
    const occupied = unitOccupied[index];
    const staffed = unitStaffed[index];
    const available = Math.max(0, staffed - occupied - Math.round(blockedStaffed * UNIT_BED_SHARES[index]));
    return {
      name,
      physicalBeds: unitBeds[index],
      staffedBeds: staffed,
      occupied,
      available,
      admissions: unitAdmissions[index],
      transfersIn: unitTransfersIn[index],
      patientDays: unitPatientDays[index],
      pendingTransfers: unitPending[index],
      medianLosHours: Math.round(medianLosHours * UNIT_LOS_FACTOR[index]),
      ventInUse: 0,
      readiness: r3(0.82 + unit(siteSeed + index) * 0.12 - pressure * 0.05),
    };
  });
  const unitVentInUse = splitExact(ventInUse, UNIT_VENT_SHARE);
  unitRows.forEach((row, index) => { row.ventInUse = unitVentInUse[index]; });

  // --- Optimization: exclusive recoverable drivers ---
  const transferRecoverable = Math.round(avoidableTransferDelayHours * 0.7);
  const dischargeRecoverable = Math.round(medianDischargeReadyDelayHours * discharges * 0.35);
  const prepRecoverable = Math.round(boardingHours * 0.12);
  const staffConstrainedHours = Math.round(unstaffedPhysical * 24 * days * 0.65);
  const delayDriverHours = [
    { name: 'Transfer coordination', hours: transferRecoverable },
    { name: 'Discharge handoff', hours: dischargeRecoverable },
    { name: 'Bed preparation', hours: prepRecoverable },
    { name: 'Staffing gap', hours: Math.round(staffingGapHours * 0.25) },
  ];
  const recoverableBedHours = sum(delayDriverHours.map((item) => item.hours));
  const avgStayDays = Math.max(0.5, medianLosHours / 24);
  const feasibleFromHours = Math.floor(recoverableBedHours / (avgStayDays * 24));
  const eligibleDemand = pendingTransfers + Math.round(delayedAdmissions * 0.15);
  const ventCap = ventAvailable + Math.max(0, Math.round(ventMaintenance * 0.3));
  const feasibleAdditionalCapacity = Math.min(feasibleFromHours, eligibleDemand, Math.max(0, availableStaffed + feasibleFromHours), ventCap + feasibleFromHours);

  const sourceMix = splitExact(admissions, SOURCE_SHARES).map((count, index) => ({
    name: ADMISSION_SOURCES[index],
    count,
  }));
  const destMix = (() => {
    const parts = splitExact(discharges + transfersOut + deaths, DEST_SHARES);
    // Map: step-down, ward, death, external — death should match deaths closely
    const adjusted = [...parts];
    const deathDrift = deaths - adjusted[2];
    adjusted[2] = deaths;
    adjusted[0] = Math.max(0, adjusted[0] - deathDrift);
    return DISCHARGE_DEST.map((name, index) => ({ name, count: adjusted[index] }));
  })();
  const delayReasons = splitExact(delayedAdmissions, DELAY_SHARES).map((count, index) => ({
    name: DELAY_REASONS[index],
    count,
  }));
  const downtimeByCause = [
    { name: DOWNTIME_CAUSES[0], hours: maintenanceHours },
    { name: DOWNTIME_CAUSES[1], hours: repairHours },
    { name: DOWNTIME_CAUSES[2], hours: prepHours },
    { name: DOWNTIME_CAUSES[3], hours: partsHours },
  ];
  const safetyByCategory = splitExact(safetyEvents, SAFETY_SHARES).map((count, index) => ({
    name: SAFETY_CATEGORIES[index],
    count,
  }));
  const reviewAging = (() => {
    const bands = splitExact(unresolvedReviews, [0.35, 0.3, 0.2, 0.15]);
    return [
      { name: '≤24 h', count: bands[0] },
      { name: '1–3 days', count: bands[1] },
      { name: '4–7 days', count: bands[2] },
      { name: '>7 days', count: bands[3] },
    ];
  })();
  const losBands = (() => {
    const under24 = losHours.filter((h) => h < 24).length;
    const d1to3 = losHours.filter((h) => h >= 24 && h < 72).length;
    const d3to7 = losHours.filter((h) => h >= 72 && h < 168).length;
    const over7 = losHours.filter((h) => h >= 168).length;
    const total = Math.max(1, under24 + d1to3 + d3to7 + over7);
    const scale = completedStays / total;
    return [
      { name: '<24 h', count: Math.round(under24 * scale) },
      { name: '1–3 days', count: Math.round(d1to3 * scale) },
      { name: '3–7 days', count: Math.round(d3to7 * scale) },
      { name: '>7 days', count: Math.max(0, completedStays - Math.round(under24 * scale) - Math.round(d1to3 * scale) - Math.round(d3to7 * scale)) },
    ];
  })();

  const monthlyAdmissions = admissionsByMonth;
  const monthlyCensus = censusClosing;
  const monthlyWait = rows.map((_, index) => Math.max(10, Math.round(medianAdmissionWaitMin * (0.9 + 0.12 * Math.sin(index * 1.3)))));
  const monthlyVentDemand = rows.map((_, index) => Math.round(ventPatientDays / monthCount * (0.92 + 0.1 * Math.sin(index))));

  const capacityLoss = [
    { name: 'Unstaffed physical', hours: Math.round(unstaffedPhysical * 24 * days) },
    { name: 'Blocked staffed', hours: Math.round(blockedStaffed * 24 * days) },
    { name: 'Staffing gap', hours: staffingGapHours },
    { name: 'Equipment downtime', hours: downtimeHours },
  ];

  return {
    hospital,
    year,
    period,
    periodLabel,
    observationDate,
    days,
    labels: rows.map((row) => row.label),

    physicalBeds,
    staffedBeds,
    unstaffedPhysical,
    blockedStaffed,
    avgOccupied,
    availableStaffed,

    admissions,
    transfersIn,
    discharges,
    transfersOut,
    deaths,
    completedStays,
    patientDays,
    avgCensus,
    openingCensus,
    closingCensus,
    censusIdentity,
    pendingTransfers,
    demandPressure,

    censusLedger: {
      opening: openingCensus,
      admissions,
      transfersIn,
      discharges,
      transfersOut,
      deaths,
      closing: closingCensus,
    },
    monthlyOpening: censusOpening,
    monthlyClosing: censusClosing,
    monthlyAdmissions,
    monthlyTransfersIn: transfersInByMonth,
    monthlyDischarges: dischargesByMonth,
    monthlyTransfersOut: transfersOutByMonth,
    monthlyDeaths: deathsByMonth,
    monthlyPatientDays: patientDaysByMonth,
    monthlyCensus,
    monthlyWait,
    monthlyVentDemand,

    medianAdmissionWaitMin,
    p90AdmissionWaitMin,
    admissionWaitTargetMin: ADMISSION_WAIT_TARGET_MIN,
    delayedAdmissions,
    boardingHours,
    medianLosHours,
    meanLosHours,
    p90LosHours,
    medianTransferDelayHours,
    medianDischargeReadyDelayHours,
    avoidableTransferDelayHours,

    nurseCoverage,
    staffingGapHours,
    requiredNurseHours,
    staffedNurseHours,
    patientNurseRatio,
    nursesOnDuty,
    shiftRows,

    ventInventory,
    ventInUse,
    ventAvailable,
    ventMaintenance,
    ventPrep,
    ventSnapshotSum,
    ventPatientDays,
    ventUtilization,
    assignedVentHours,
    eligibleVentHours,
    downtimeHours,
    equipmentReadiness,
    downtimeByCause,

    readmissions48h,
    readmissionRate,
    unplannedReturns,
    unplannedTransferRate,
    safetyEvents,
    unresolvedReviews,
    reviewTimeliness,
    reviewTargetHours: REVIEW_TARGET_HOURS,
    deviceDays,
    documentedDeviceDays,
    surveillanceCompleteness,
    safetyByCategory,
    reviewAging,

    recoverableBedHours,
    feasibleAdditionalCapacity,
    eligibleDemand,
    staffConstrainedHours,
    delayDriverHours,
    capacityLoss,

    unitRows,
    sourceMix,
    destMix,
    delayReasons,
    losBands,

    methodology: {
      grains: 'ICU Admissions ≠ Patient Days ≠ Completed Stays. Admissions and transfers-in are inflow events; patient-days use midnight census ((opening+closing)/2 × days). Deaths are a distinct exit category and are not double-counted inside discharges.',
      census: 'Per unit/period: Opening + Admissions + Transfers In − Discharges − Transfers Out − Deaths = Closing. Month-end closing rolls to next opening. Annual average census = patient-days ÷ days (not an average of monthly averages of averages).',
      los: 'Completed-stay LOS = ICU Departed At − ICU Arrived At. Open stays contribute to census only. Headline Median LOS is the quantile of completed stays — not an average of monthly medians. Shorter LOS is not assumed to be clinically better.',
      capacity: 'Physical Beds = Staffed + Unstaffed. Staffed Bed Hours ≈ Occupied + Available + Blocked. A physical bed is not automatically a safely staffed ICU bed. Patient-to-nurse ratio is descriptive — not a clinical safety verdict.',
      equipment: 'Active ventilator inventory = In Use + Available + Maintenance + Preparation. One ventilator is never assigned to two patients at once. Utilization = assigned hours ÷ eligible serviceable hours. No ventilator-setting advice.',
      quality: 'Readmission and unplanned-transfer rates use operational cohorts. Infection surveillance completeness is illustrative documentation coverage — not a validated CLABSI/CAUTI/VAE rate. Safety events are process signals, not certified harm incidence.',
      optimization: 'Recoverable bed hours are exclusive drivers (coordination, handoff, prep, staffing). Feasible additional capacity is capped by recoverable hours, eligible demand, staffed capacity, and ventilator availability. Never pressures clinical readiness decisions. Illustrative — not achieved.',
    },
  };
}

export type IcuView = ReturnType<typeof compute>;
