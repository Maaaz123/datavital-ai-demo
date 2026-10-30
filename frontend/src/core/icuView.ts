import { SITE_SPECS, scenarioFor, type SiteCode } from '@/showcase/facts';
import { splitExact } from './ipdView';
import { type ReportPeriod } from './period';

/** ICU units. Every stay maps to exactly one unit. */
export const ICU_UNITS = ['Medical ICU', 'Surgical ICU', 'Cardiac ICU', 'Neuro ICU'] as const;
export type IcuUnit = (typeof ICU_UNITS)[number];

const UNIT_BED_SHARES = [0.34, 0.28, 0.22, 0.16];
const UNIT_ADMIT_SHARES = [0.36, 0.3, 0.2, 0.14];
const UNIT_LOS_FACTOR = [1.05, 0.92, 1.18, 1.25];
const UNIT_VENT_SHARE = [0.42, 0.28, 0.2, 0.1];

const ADMISSION_SOURCES = ['Emergency', 'Operating theatre', 'Ward escalation', 'External transfer'] as const;
const SOURCE_SHARES = [0.42, 0.28, 0.22, 0.08];

const DISCHARGE_DEST = ['Step-down / HDU', 'General ward', 'Death departing ICU', 'External transfer'] as const;
const DEST_SHARES = [0.48, 0.38, 0.08, 0.06];

const DELAY_REASONS = ['No staffed bed', 'Downstream bed wait', 'Equipment prep', 'Coordination handoff', 'Transport lag'] as const;
const DELAY_SHARES = [0.32, 0.28, 0.14, 0.16, 0.1];

const DOWNTIME_CAUSES = ['Scheduled PM', 'Unplanned repair', 'Cleaning / prep', 'Parts wait'] as const;

const SAFETY_CATEGORIES = ['Device documentation gap', 'Handoff incomplete', 'Review overdue', 'Surveillance form missing', 'Other process'] as const;
const SAFETY_SHARES = [0.28, 0.22, 0.2, 0.18, 0.12];

const SHIFTS = ['Day', 'Evening', 'Night'] as const;
const SHIFT_SHARES = [0.4, 0.32, 0.28];
const SHIFT_HOURS = 8;

const ADMISSION_WAIT_TARGET_MIN = 90;
const REVIEW_TARGET_HOURS = 72;

type VentState = 'in_use' | 'available' | 'maintenance' | 'prep';

function monthMeta(year: number, period: ReportPeriod) {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const start = period === 'year' ? 0 : { Q1: 0, Q2: 3, Q3: 6, Q4: 9 }[period];
  const count = period === 'year' ? 12 : 3;
  return Array.from({ length: count }, (_, index) => {
    const monthIndex = start + index;
    const days = new Date(year, monthIndex + 1, 0).getDate();
    return { label: names[monthIndex], monthIndex, days };
  });
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

/** Test helper — clears memoized views after model changes in the same process. */
export function clearIcuViewCache(): void {
  CACHE.clear();
}

function periodDayBounds(year: number, period: ReportPeriod): { start: number; end: number } {
  const yearMonths = monthMeta(year, 'year');
  if (period === 'year') return { start: 0, end: sum(yearMonths.map((item) => item.days)) };
  const startMonth = { Q1: 0, Q2: 3, Q3: 6, Q4: 9 }[period];
  let start = 0;
  for (let i = 0; i < startMonth; i += 1) start += yearMonths[i].days;
  let end = start;
  for (let i = startMonth; i < startMonth + 3; i += 1) end += yearMonths[i].days;
  return { start, end };
}

function compute(hospital: string, year: number, period: ReportPeriod) {
  // Always simulate the full calendar year, then slice the selected period so
  // Q1–Q4 + year share one daily census / device ledger.
  const yearMonths = monthMeta(year, 'year');
  const months = period === 'year' ? yearMonths : monthMeta(year, period);
  const monthCount = yearMonths.length;
  const yearDays = sum(yearMonths.map((item) => item.days));
  const bounds = periodDayBounds(year, period);
  const days = bounds.end - bounds.start;
  const pressure = tilt(hospital, year);
  const periodLabel = period === 'year' ? `Full year ${year}` : `${period} ${year}`;
  const observationDate = period === 'year'
    ? `31 Dec ${year}`
    : ({ Q1: `31 Mar ${year}`, Q2: `30 Jun ${year}`, Q3: `30 Sep ${year}`, Q4: `31 Dec ${year}` } as const)[period];
  const site = SITE_SPECS[hospital as SiteCode];
  const physicalBeds = hospital === 'ALL'
    ? (['H1', 'H2', 'H3', 'H4', 'H5'] as SiteCode[]).reduce((total, code) => total + SITE_SPECS[code].icu, 0)
    : (site?.icu ?? 24);
  const siteSeed = physicalBeds * 17 + year * 19;
  const focus = scenarioFor(hospital, year).focus;
  const scenarioMonths = scenarioFor(hospital, year).months;

  // --- Unit bed inventory (mutually exclusive states; hospital = Σ units) ---
  const unitPhysical = splitExact(physicalBeds, UNIT_BED_SHARES);
  const staffedRate = Math.min(0.96, Math.max(0.78, 0.9 - pressure * 0.1));
  const staffedBeds = Math.max(ICU_UNITS.length, Math.round(physicalBeds * staffedRate));
  const unitStaffed = splitExact(staffedBeds, UNIT_BED_SHARES);
  const blockedStaffed = Math.max(0, Math.round(staffedBeds * (0.03 + pressure * 0.04)));
  const unitBlocked = splitExact(blockedStaffed, UNIT_BED_SHARES);
  const targetOccRate = Math.min(
    0.97,
    Math.max(0.7, (focus.icuOccupied / Math.max(1, focus.icuStaffed)) * (0.96 + pressure * 0.04)),
  );

  // Monthly external admission targets from hospital admissions share (full year)
  const monthlyExternalTarget = yearMonths.map((_, index) => {
    const base = Math.round((scenarioMonths[index]?.admissions ?? focus.admissions / 12) * (0.085 + pressure * 0.04));
    const seasonal = 1 + 0.06 * Math.sin(index * 1.4 + siteSeed * 0.01);
    return Math.max(1, Math.round(base * seasonal));
  });
  const externalAdmitTarget = sum(monthlyExternalTarget);
  const externalTransferInTarget = Math.round(externalAdmitTarget * (0.08 + pressure * 0.03));

  // Opening census per unit (sum ≤ staffed − blocked)
  const openingCap = Math.max(1, staffedBeds - blockedStaffed);
  const openingHospital = Math.min(
    openingCap,
    Math.max(1, Math.round(openingCap * targetOccRate * (0.94 + unit(siteSeed) * 0.08))),
  );
  const unitOpening = splitExact(openingHospital, UNIT_BED_SHARES).map((value, index) => (
    Math.min(value, Math.max(0, unitStaffed[index] - unitBlocked[index]))
  ));

  type UnitDay = {
    opening: number;
    externalAdmissions: number;
    externalTransfersIn: number;
    internalIn: number;
    internalOut: number;
    discharges: number;
    deaths: number;
    closing: number;
  };

  const unitDays: UnitDay[][] = ICU_UNITS.map(() => []);
  const hospitalDayPatientDays: number[] = [];
  const monthlyOpening: number[] = [];
  const monthlyClosing: number[] = [];
  const monthlyAdmissions: number[] = [];
  const monthlyTransfersIn: number[] = [];
  const monthlyDischarges: number[] = [];
  const monthlyTransfersOut: number[] = [];
  const monthlyDeaths: number[] = [];
  const monthlyPatientDays: number[] = [];
  const monthlyCensus: number[] = [];

  let dayCursor = 0;
  const unitCensus = [...unitOpening];
  let externalAdmitLeft = externalAdmitTarget;
  let externalTinLeft = externalTransferInTarget;
  const deathAcc = ICU_UNITS.map(() => 0);
  const toutAcc = ICU_UNITS.map(() => 0);

  for (let m = 0; m < monthCount; m += 1) {
    const monthDays = yearMonths[m].days;
    const monthAdmitPlan = monthlyExternalTarget[m];
    const monthTinPlan = Math.round(externalTransferInTarget * (monthAdmitPlan / Math.max(1, externalAdmitTarget)));
    let monthAdmitDone = 0;
    let monthTinDone = 0;
    let monthDisc = 0;
    let monthDeath = 0;
    let monthTout = 0; // external facility transfers out (subset of non-death exits tracked separately for KPI)
    let monthPatientDays = 0;
    const monthOpen = sum(unitCensus);
    monthlyOpening.push(monthOpen);

    for (let d = 0; d < monthDays; d += 1) {
      const daysLeftInMonth = monthDays - d;
      const admitToday = Math.min(
        externalAdmitLeft,
        Math.max(0, Math.round((monthAdmitPlan - monthAdmitDone) / daysLeftInMonth)),
      );
      const tinToday = Math.min(
        externalTinLeft,
        Math.max(0, Math.round((monthTinPlan - monthTinDone) / daysLeftInMonth)),
      );
      const unitAdmitPlan = splitExact(admitToday, UNIT_ADMIT_SHARES);
      const unitTinPlan = splitExact(tinToday, UNIT_ADMIT_SHARES);
      const openingToday = [...unitCensus];

      // Internal ICU↔ICU transfers (hospital-neutral)
      const internalMoves = Math.min(
        2,
        Math.max(0, Math.round(pressure * 2 + unit(siteSeed + dayCursor * 3.1) * 1.5)),
      );
      const internalOut = ICU_UNITS.map(() => 0);
      const internalIn = ICU_UNITS.map(() => 0);
      for (let move = 0; move < internalMoves; move += 1) {
        const from = Math.floor(unit(siteSeed + dayCursor * 5.7 + move) * ICU_UNITS.length) % ICU_UNITS.length;
        let to = (from + 1 + Math.floor(unit(siteSeed + dayCursor * 8.3 + move) * (ICU_UNITS.length - 1))) % ICU_UNITS.length;
        if (to === from) to = (from + 1) % ICU_UNITS.length;
        if (unitCensus[from] <= 0) continue;
        const toCap = unitStaffed[to] - unitBlocked[to];
        if (unitCensus[to] >= toCap) continue;
        internalOut[from] += 1;
        internalIn[to] += 1;
        unitCensus[from] -= 1;
        unitCensus[to] += 1;
      }

      const unitAdmit = ICU_UNITS.map(() => 0);
      const unitTin = ICU_UNITS.map(() => 0);
      for (let u = 0; u < ICU_UNITS.length; u += 1) {
        const cap = unitStaffed[u] - unitBlocked[u];
        const room = Math.max(0, cap - unitCensus[u]);
        const takeAdmit = Math.min(unitAdmitPlan[u], room);
        const takeTin = Math.min(unitTinPlan[u], Math.max(0, room - takeAdmit));
        unitAdmit[u] = takeAdmit;
        unitTin[u] = takeTin;
        unitCensus[u] += takeAdmit + takeTin;
      }

      const dayAdmit = sum(unitAdmit);
      const dayTin = sum(unitTin);
      externalAdmitLeft -= dayAdmit;
      externalTinLeft -= dayTin;
      monthAdmitDone += dayAdmit;
      monthTinDone += dayTin;

      let dayDisc = 0;
      let dayDeath = 0;
      let dayTout = 0;
      for (let u = 0; u < ICU_UNITS.length; u += 1) {
        const afterIn = unitCensus[u];
        const cap = unitStaffed[u] - unitBlocked[u];
        const targetClose = Math.min(cap, Math.max(0, Math.round(cap * targetOccRate * (0.92 + 0.08 * Math.sin(dayCursor * 0.17 + u)))));
        const exitsNeeded = Math.max(0, afterIn - targetClose);
        const deathShare = 0.055 + pressure * 0.02;
        const toutShare = 0.06 + pressure * 0.02;
        deathAcc[u] += exitsNeeded * deathShare;
        toutAcc[u] += exitsNeeded * toutShare;
        const deathsU = Math.min(exitsNeeded, Math.floor(deathAcc[u]));
        deathAcc[u] -= deathsU;
        const toutU = Math.min(exitsNeeded - deathsU, Math.floor(toutAcc[u]));
        toutAcc[u] -= toutU;
        const discU = Math.max(0, exitsNeeded - deathsU - toutU);
        const closing = afterIn - discU - toutU - deathsU;
        unitCensus[u] = Math.max(0, Math.min(cap, closing));
        unitDays[u].push({
          opening: openingToday[u],
          externalAdmissions: unitAdmit[u],
          externalTransfersIn: unitTin[u],
          internalIn: internalIn[u],
          internalOut: internalOut[u],
          discharges: discU + toutU,
          deaths: deathsU,
          closing: unitCensus[u],
        });
        dayDisc += discU;
        dayTout += toutU;
        dayDeath += deathsU;
      }

      const midnight = sum(unitCensus);
      hospitalDayPatientDays.push(midnight);
      monthPatientDays += midnight;
      monthDisc += dayDisc + dayTout;
      monthDeath += dayDeath;
      monthTout += dayTout;
      dayCursor += 1;
    }

    monthlyClosing.push(sum(unitCensus));
    monthlyAdmissions.push(monthAdmitDone);
    monthlyTransfersIn.push(monthTinDone);
    monthlyDischarges.push(monthDisc - monthTout); // ward/step-down only for monthly discharge series
    monthlyTransfersOut.push(monthTout);
    monthlyDeaths.push(monthDeath);
    monthlyPatientDays.push(monthPatientDays);
    monthlyCensus.push(sum(unitCensus));
  }

  // Slice daily ledgers to the selected period
  const periodUnitDays = unitDays.map((daysForUnit) => daysForUnit.slice(bounds.start, bounds.end));
  const periodPatientDaysSeries = hospitalDayPatientDays.slice(bounds.start, bounds.end);
  const periodMonthStart = period === 'year' ? 0 : { Q1: 0, Q2: 3, Q3: 6, Q4: 9 }[period];
  const periodMonthCount = period === 'year' ? 12 : 3;
  const sliceMonthly = <T,>(values: T[]) => values.slice(periodMonthStart, periodMonthStart + periodMonthCount);

  // Rebuild hospital totals from unit daily ledgers (source of truth for selected period)
  let admissions = 0;
  let transfersIn = 0;
  let discharges = 0;
  let transfersOut = 0;
  let deaths = 0;
  let internalInTotal = 0;
  let internalOutTotal = 0;
  const unitAdmissions = ICU_UNITS.map(() => 0);
  const unitTransfersIn = ICU_UNITS.map(() => 0);
  const unitDischarges = ICU_UNITS.map(() => 0);
  const unitDeaths = ICU_UNITS.map(() => 0);
  const unitPatientDays = ICU_UNITS.map(() => 0);
  const unitInternalIn = ICU_UNITS.map(() => 0);
  const unitInternalOut = ICU_UNITS.map(() => 0);

  for (let u = 0; u < ICU_UNITS.length; u += 1) {
    for (const day of periodUnitDays[u]) {
      unitAdmissions[u] += day.externalAdmissions;
      unitTransfersIn[u] += day.externalTransfersIn;
      unitDischarges[u] += day.discharges;
      unitDeaths[u] += day.deaths;
      unitPatientDays[u] += day.closing;
      unitInternalIn[u] += day.internalIn;
      unitInternalOut[u] += day.internalOut;
    }
    admissions += unitAdmissions[u];
    transfersIn += unitTransfersIn[u];
    discharges += unitDischarges[u];
    deaths += unitDeaths[u];
    internalInTotal += unitInternalIn[u];
    internalOutTotal += unitInternalOut[u];
  }
  const periodMonthlyTransfersOut = sliceMonthly(monthlyTransfersOut);
  transfersOut = sum(periodMonthlyTransfersOut);
  const wardDischarges = Math.max(0, discharges - transfersOut);
  discharges = wardDischarges;
  const completedStays = discharges + transfersOut + deaths;

  const patientDays = sum(periodPatientDaysSeries);
  const avgCensus = days > 0 ? r1(patientDays / days) : 0;
  const periodMonthlyOpening = sliceMonthly(monthlyOpening);
  const periodMonthlyClosing = sliceMonthly(monthlyClosing);
  const openingCensus = periodUnitDays[0]?.[0]
    ? sum(periodUnitDays.map((rows) => rows[0]?.opening ?? 0))
    : (periodMonthlyOpening[0] ?? 0);
  const closingCensus = periodUnitDays[0]?.length
    ? sum(periodUnitDays.map((rows) => rows[rows.length - 1]?.closing ?? 0))
    : (periodMonthlyClosing[periodMonthlyClosing.length - 1] ?? 0);
  const censusIdentity = openingCensus + admissions + transfersIn - discharges - transfersOut - deaths;

  // Observation snapshot occupancy from period closing census
  const avgOccupied = Math.min(staffedBeds - blockedStaffed, Math.max(0, closingCensus));
  const unitOccupied = splitExact(avgOccupied, UNIT_BED_SHARES).map((value, index) => (
    Math.min(value, Math.max(0, unitStaffed[index] - unitBlocked[index]))
  ));
  const unitAvailable = unitStaffed.map((staffed, index) => Math.max(0, staffed - unitOccupied[index] - unitBlocked[index]));
  const availableStaffed = sum(unitAvailable);
  const unstaffedPhysical = physicalBeds - staffedBeds;

  const pendingTransfers = Math.max(1, Math.round(admissions * (0.012 + pressure * 0.04) / Math.max(1, periodMonthCount) * 3));
  const unitPending = splitExact(pendingTransfers, UNIT_ADMIT_SHARES);
  const demandPressure = availableStaffed > 0
    ? r1(pendingTransfers / availableStaffed)
    : pendingTransfers > 0 ? 9.9 : 0;

  // --- Admission wait (request → physical arrival) over synthetic complete event population ---
  const waitAll: number[] = [];
  for (let i = 0; i < admissions; i += 1) {
    const u = unit(siteSeed + i * 3.7);
    const base = 35 + pressure * 90;
    waitAll.push(Math.max(8, Math.round(base * (0.4 + u * 1.9))));
  }
  waitAll.sort((a, b) => a - b);
  const medianAdmissionWaitMin = quantile(waitAll, 0.5);
  const p90AdmissionWaitMin = quantile(waitAll, 0.9);
  const delayedAdmissions = waitAll.filter((value) => value > ADMISSION_WAIT_TARGET_MIN).length;
  const boardingHours = Math.round(sum(waitAll) / 60);

  // --- Completed-stay LOS ---
  const losHours: number[] = [];
  for (let i = 0; i < completedStays; i += 1) {
    const u = unit(siteSeed + i * 5.1);
    const unitFactor = UNIT_LOS_FACTOR[i % UNIT_LOS_FACTOR.length];
    const base = (48 + pressure * 36) * unitFactor;
    losHours.push(Math.max(6, Math.round(base * (0.35 + u * 2.2))));
  }
  losHours.sort((a, b) => a - b);
  const medianLosHours = quantile(losHours, 0.5);
  const meanLosHours = losHours.length ? r1(sum(losHours) / losHours.length) : 0;
  const p90LosHours = quantile(losHours, 0.9);

  // Scenario-only readiness clocks
  const transferDelaySample: number[] = [];
  for (let i = 0; i < transfersOut + Math.round(discharges * 0.4); i += 1) {
    const u = unit(siteSeed + i * 7.2);
    transferDelaySample.push(Math.max(0.5, r1((4 + pressure * 10) * (0.4 + u * 1.8))));
  }
  transferDelaySample.sort((a, b) => a - b);
  const medianTransferDelayHours = quantile(transferDelaySample, 0.5);
  const dischargeReadySample: number[] = [];
  for (let i = 0; i < discharges; i += 1) {
    const u = unit(siteSeed + i * 6.4);
    dischargeReadySample.push(Math.max(0.4, r1((3 + pressure * 8) * (0.45 + u * 1.7))));
  }
  dischargeReadySample.sort((a, b) => a - b);
  const medianDischargeReadyDelayHours = quantile(dischargeReadySample, 0.5);
  const avoidableTransferDelayHours = Math.round(medianTransferDelayHours * transfersOut * 0.55);

  // --- Staffing by unit × shift (same assumptions for KPIs and charts) ---
  const nursesPerStaffedBed = 1 / 2.2;
  const unitRequiredNurseHours = unitStaffed.map((staffed) => Math.round(staffed * nursesPerStaffedBed * SHIFT_HOURS * 3 * days));
  const requiredNurseHours = sum(unitRequiredNurseHours);
  const coverageRate = r3(Math.min(0.99, 0.9 - pressure * 0.12 + unit(siteSeed + 2) * 0.04));
  const unitStaffedNurseHours = unitRequiredNurseHours.map((required, index) => (
    Math.round(required * Math.min(0.99, coverageRate + (unit(siteSeed + 9 + index) - 0.5) * 0.04))
  ));
  const staffedNurseHours = sum(unitStaffedNurseHours);
  const staffingGapHours = Math.max(0, requiredNurseHours - staffedNurseHours);
  const nursesOnDuty = Math.max(1, Math.round(staffedBeds * nursesPerStaffedBed * coverageRate));
  const patientNurseRatio = r1(avgOccupied / nursesOnDuty);
  const nurseCoverage = requiredNurseHours > 0 ? r3(staffedNurseHours / requiredNurseHours) : 0;

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

  // --- Ventilator device-state ledger (non-overlapping states; serviceable ≠ installed) ---
  const ventInventory = Math.max(4, Math.round(physicalBeds * 0.75));
  const unitVentInventory = splitExact(ventInventory, UNIT_VENT_SHARE);
  type DeviceInterval = { state: VentState; startHour: number; endHour: number; unitIndex: number };
  const deviceIntervals: DeviceInterval[][] = Array.from({ length: ventInventory }, () => []);
  const yearHours = yearDays * 24;
  const hourStart = bounds.start * 24;
  const hourEnd = bounds.end * 24;
  let deviceOffset = 0;
  for (let u = 0; u < ICU_UNITS.length; u += 1) {
    for (let d = 0; d < unitVentInventory[u]; d += 1) {
      const deviceIndex = deviceOffset + d;
      const seed = siteSeed + deviceIndex * 11.3 + u * 3.7;
      let hour = 0;
      while (hour < yearHours) {
        const roll = unit(seed + hour * 0.017);
        let state: VentState;
        let length: number;
        if (roll < 0.08 + pressure * 0.04) {
          state = 'maintenance';
          length = Math.max(8, Math.round(24 + unit(seed + hour + 1) * 72));
        } else if (roll < 0.14 + pressure * 0.05) {
          state = 'prep';
          length = Math.max(2, Math.round(4 + unit(seed + hour + 2) * 20));
        } else if (roll < 0.14 + pressure * 0.05 + (0.34 + pressure * 0.1)) {
          state = 'in_use';
          length = Math.max(12, Math.round(36 + unit(seed + hour + 3) * 120));
        } else {
          state = 'available';
          length = Math.max(6, Math.round(18 + unit(seed + hour + 4) * 72));
        }
        const endHour = Math.min(yearHours, hour + length);
        deviceIntervals[deviceIndex].push({ state, startHour: hour, endHour, unitIndex: u });
        hour = endHour;
      }
    }
    deviceOffset += unitVentInventory[u];
  }

  let assignedVentHours = 0;
  let serviceableVentHours = 0;
  let installedVentHours = 0;
  let downtimeHours = 0;
  let maintenanceHours = 0;
  let repairHours = 0;
  let prepHours = 0;
  let partsHours = 0;
  const unitAssignedHours = ICU_UNITS.map(() => 0);
  const unitDowntimeHours = ICU_UNITS.map(() => 0);

  function overlap(start: number, end: number): number {
    return Math.max(0, Math.min(end, hourEnd) - Math.max(start, hourStart));
  }

  for (let deviceIndex = 0; deviceIndex < ventInventory; deviceIndex += 1) {
    const intervals = deviceIntervals[deviceIndex];
    for (const item of intervals) {
      const dur = overlap(item.startHour, item.endHour);
      if (dur <= 0) continue;
      installedVentHours += dur;
      if (item.state === 'in_use' || item.state === 'available') serviceableVentHours += dur;
      if (item.state === 'in_use') {
        assignedVentHours += dur;
        unitAssignedHours[item.unitIndex] += dur;
      }
      if (item.state === 'maintenance' || item.state === 'prep') {
        downtimeHours += dur;
        unitDowntimeHours[item.unitIndex] += dur;
        if (item.state === 'prep') prepHours += dur;
        else if (unit(siteSeed + deviceIndex + item.startHour) < 0.45) maintenanceHours += dur;
        else if (unit(siteSeed + deviceIndex + item.startHour + 1) < 0.7) repairHours += dur;
        else partsHours += dur;
      }
    }
  }
  // Normalize downtime cause partition to exact downtimeHours
  const causeRaw = [maintenanceHours, repairHours, prepHours, partsHours];
  const causeSum = sum(causeRaw) || 1;
  const downtimeByCause = DOWNTIME_CAUSES.map((name, index) => ({
    name,
    hours: index < 3
      ? Math.round(downtimeHours * (causeRaw[index] / causeSum))
      : Math.max(0, downtimeHours - Math.round(downtimeHours * (causeRaw[0] / causeSum)) - Math.round(downtimeHours * (causeRaw[1] / causeSum)) - Math.round(downtimeHours * (causeRaw[2] / causeSum))),
  }));
  maintenanceHours = downtimeByCause[0].hours;
  repairHours = downtimeByCause[1].hours;
  prepHours = downtimeByCause[2].hours;
  partsHours = downtimeByCause[3].hours;

  // Snapshot at period end (state covering hourEnd - 1)
  let ventInUse = 0;
  let ventAvailable = 0;
  let ventMaintenance = 0;
  let ventPrep = 0;
  const unitVentInUse = ICU_UNITS.map(() => 0);
  const snapshotHour = Math.max(hourStart, hourEnd - 1);
  for (let deviceIndex = 0; deviceIndex < ventInventory; deviceIndex += 1) {
    const snap = deviceIntervals[deviceIndex].find((item) => item.startHour <= snapshotHour && item.endHour > snapshotHour)
      ?? deviceIntervals[deviceIndex][deviceIntervals[deviceIndex].length - 1];
    if (!snap) continue;
    if (snap.state === 'in_use') {
      ventInUse += 1;
      unitVentInUse[snap.unitIndex] += 1;
    } else if (snap.state === 'available') ventAvailable += 1;
    else if (snap.state === 'maintenance') ventMaintenance += 1;
    else ventPrep += 1;
  }
  const ventSnapshotSum = ventInUse + ventAvailable + ventMaintenance + ventPrep;
  // Ventilator patient-days = midnight counts of in-use devices (from assignment hours / 24, integer)
  const ventPatientDays = Math.min(patientDays, Math.round(assignedVentHours / 24));
  const eligibleVentHours = serviceableVentHours; // serviceable denominator (in_use + available)
  const ventUtilization = eligibleVentHours > 0 ? r3(Math.min(0.99, assignedVentHours / eligibleVentHours)) : 0;
  const equipmentReadiness = ventInventory > 0 ? r3((ventInUse + ventAvailable) / ventInventory) : 0;

  const periodMonthlyPatientDays = sliceMonthly(monthlyPatientDays);
  const monthlyVentDemand = periodMonthlyPatientDays.map((monthDaysValue) => {
    const share = monthDaysValue / Math.max(1, patientDays);
    return Math.round(ventPatientDays * share);
  });
  const monthlyWait = months.map((_, index) => Math.max(10, Math.round(medianAdmissionWaitMin * (0.9 + 0.12 * Math.sin((periodMonthStart + index) * 1.3)))));

  // --- Quality ---
  const readmissions48h = Math.round(discharges * (0.028 + pressure * 0.02));
  const readmissionRate = discharges > 0 ? r3(readmissions48h / discharges) : 0;
  const stepDownExits = Math.round((discharges + transfersOut) * DEST_SHARES[0] / (DEST_SHARES[0] + DEST_SHARES[1] + DEST_SHARES[3]));
  const unplannedReturns = Math.round(stepDownExits * (0.035 + pressure * 0.025));
  const unplannedTransferRate = stepDownExits > 0 ? r3(unplannedReturns / stepDownExits) : 0;
  const safetyEvents = Math.round(admissions * (0.04 + pressure * 0.03));
  const unresolvedReviews = Math.max(0, Math.round(safetyEvents * (0.22 + pressure * 0.15)));
  const closedReviews = Math.max(0, safetyEvents - unresolvedReviews);
  const timelyClosed = Math.round(closedReviews * (0.72 - pressure * 0.1));
  const reviewTimeliness = closedReviews > 0 ? r3(timelyClosed / closedReviews) : 0;
  const deviceDays = Math.round(ventPatientDays + patientDays * 0.55);
  const documentedDeviceDays = Math.round(deviceDays * (0.86 - pressure * 0.08));
  const surveillanceCompleteness = deviceDays > 0 ? r3(documentedDeviceDays / deviceDays) : 0;

  // --- Unit optimization (non-interchangeable beds) ---
  const unitRows = ICU_UNITS.map((name, index) => {
    const occupied = unitOccupied[index];
    const staffed = unitStaffed[index];
    const available = unitAvailable[index];
    const physical = unitPhysical[index];
    const blocked = unitBlocked[index];
    const unstaffed = physical - staffed;
    const unitLosHours = Math.round(medianLosHours * UNIT_LOS_FACTOR[index]);
    const unitPendingDemand = unitPending[index] + Math.round(delayedAdmissions * UNIT_ADMIT_SHARES[index] * 0.15);
    const transferRec = Math.round(avoidableTransferDelayHours * UNIT_ADMIT_SHARES[index] * 0.7);
    const dischargeRec = Math.round(medianDischargeReadyDelayHours * unitDischarges[index] * 0.35);
    const prepRec = Math.round(boardingHours * UNIT_ADMIT_SHARES[index] * 0.12);
    const staffRec = Math.round(Math.max(0, unitRequiredNurseHours[index] - unitStaffedNurseHours[index]) * 0.25);
    const recoverable = transferRec + dischargeRec + prepRec + staffRec;
    const stayHours = Math.max(8, unitLosHours);
    const fromHours = Math.floor(recoverable / stayHours);
    const bedHeadroom = available + Math.floor(unstaffed * 0.15);
    const ventHeadroom = unitVentInUse[index] >= 0
      ? Math.max(0, Math.round((unitVentInventory[index] - unitVentInUse[index]) * 0.5) + Math.floor(fromHours * 0.2))
      : 0;
    const staffHeadroom = Math.max(0, Math.floor((unitStaffedNurseHours[index] / Math.max(1, unitRequiredNurseHours[index])) * bedHeadroom));
    const downstreamCap = Math.max(0, Math.round(unitPendingDemand * 0.85));
    const feasible = Math.max(0, Math.min(fromHours, unitPendingDemand, bedHeadroom, ventHeadroom + fromHours, staffHeadroom + fromHours, downstreamCap));
    return {
      name,
      physicalBeds: physical,
      staffedBeds: staffed,
      occupied,
      available,
      blocked,
      unstaffed,
      admissions: unitAdmissions[index],
      transfersIn: unitTransfersIn[index],
      discharges: unitDischarges[index],
      deaths: unitDeaths[index],
      patientDays: unitPatientDays[index],
      pendingTransfers: unitPending[index],
      medianLosHours: unitLosHours,
      ventInUse: unitVentInUse[index],
      ventInventory: unitVentInventory[index],
      recoverableHours: recoverable,
      feasibleAdditional: feasible,
      eligibleDemand: unitPendingDemand,
      readiness: r3(0.82 + unit(siteSeed + index) * 0.12 - pressure * 0.05),
      internalIn: unitInternalIn[index],
      internalOut: unitInternalOut[index],
      requiredNurseHours: unitRequiredNurseHours[index],
      staffedNurseHours: unitStaffedNurseHours[index],
      downtimeHours: unitDowntimeHours[index],
    };
  });

  const recoverableBedHours = sum(unitRows.map((item) => item.recoverableHours));
  const feasibleAdditionalCapacity = sum(unitRows.map((item) => item.feasibleAdditional));
  const eligibleDemand = sum(unitRows.map((item) => item.eligibleDemand));
  const staffConstrainedHours = Math.round(unstaffedPhysical * 24 * days * 0.65);

  const delayDriverHours = [
    { name: 'Transfer coordination', hours: sum(unitRows.map((_, index) => Math.round(avoidableTransferDelayHours * UNIT_ADMIT_SHARES[index] * 0.7))) },
    { name: 'Discharge handoff', hours: sum(unitRows.map((item) => Math.round(medianDischargeReadyDelayHours * item.discharges * 0.35))) },
    { name: 'Bed preparation', hours: sum(unitRows.map((_, index) => Math.round(boardingHours * UNIT_ADMIT_SHARES[index] * 0.12))) },
    { name: 'Staffing gap', hours: sum(unitRows.map((item) => Math.round(Math.max(0, item.requiredNurseHours - item.staffedNurseHours) * 0.25))) },
  ];
  // Align exclusive driver sum to recoverableBedHours
  const driverRawSum = sum(delayDriverHours.map((item) => item.hours)) || 1;
  delayDriverHours.forEach((item) => {
    item.hours = Math.round(recoverableBedHours * (item.hours / driverRawSum));
  });
  const drift = recoverableBedHours - sum(delayDriverHours.map((item) => item.hours));
  delayDriverHours[0].hours += drift;

  const unitOpportunityHours = unitRows.map((item) => ({ name: item.name, hours: item.recoverableHours }));

  const sourceMix = splitExact(admissions, SOURCE_SHARES).map((count, index) => ({
    name: ADMISSION_SOURCES[index],
    count,
  }));
  const destMix = (() => {
    const parts = splitExact(discharges + transfersOut + deaths, DEST_SHARES);
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
  const safetyByCategory = splitExact(safetyEvents, SAFETY_SHARES).map((count, index) => ({
    name: SAFETY_CATEGORIES[index],
    count,
  }));
  const reviewAging = (() => {
    const bands = splitExact(Math.max(1, unresolvedReviews), [0.35, 0.3, 0.2, 0.15]);
    if (unresolvedReviews === 0) return [
      { name: '≤24 h', count: 0 },
      { name: '1–3 days', count: 0 },
      { name: '4–7 days', count: 0 },
      { name: '>7 days', count: 0 },
    ];
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
    return [
      { name: '<24 h', count: under24 },
      { name: '1–3 days', count: d1to3 },
      { name: '3–7 days', count: d3to7 },
      { name: '>7 days', count: over7 },
    ];
  })();

  const capacityLoss = [
    { name: 'Unstaffed physical', hours: Math.round(unstaffedPhysical * 24 * days) },
    { name: 'Blocked staffed', hours: Math.round(blockedStaffed * 24 * days) },
    { name: 'Staffing gap', hours: staffingGapHours },
    { name: 'Equipment downtime', hours: downtimeHours },
  ];

  // Daily reconciliation evidence for tests
  const dailyInternalBalanced = internalInTotal === internalOutTotal;
  const yearPatientDaysFromMonths = sum(periodMonthlyPatientDays);

  return {
    hospital,
    year,
    period,
    periodLabel,
    observationDate,
    days,
    labels: months.map((row) => row.label),

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
    internalTransfers: internalInTotal,
    dailyInternalBalanced,
    yearPatientDaysFromMonths,

    censusLedger: {
      opening: openingCensus,
      admissions,
      transfersIn,
      discharges,
      transfersOut,
      deaths,
      closing: closingCensus,
    },
    monthlyOpening: periodMonthlyOpening,
    monthlyClosing: periodMonthlyClosing,
    monthlyAdmissions: sliceMonthly(monthlyAdmissions),
    monthlyTransfersIn: sliceMonthly(monthlyTransfersIn),
    monthlyDischarges: sliceMonthly(monthlyDischarges),
    monthlyTransfersOut: periodMonthlyTransfersOut,
    monthlyDeaths: sliceMonthly(monthlyDeaths),
    monthlyPatientDays: periodMonthlyPatientDays,
    monthlyCensus: sliceMonthly(monthlyCensus),
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
    installedVentHours,
    serviceableVentHours,
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
    unitOpportunityHours,
    capacityLoss,

    unitRows,
    sourceMix,
    destMix,
    delayReasons,
    losBands,
    unitDays: periodUnitDays,

    methodology: {
      grains: 'ICU Admissions ≠ Patient Days ≠ Completed Stays. Admissions and external transfers-in are inflow events. Patient-days are the sum of daily midnight occupancy counts. Deaths are a distinct exit category and are not double-counted inside discharges. Internal ICU↔ICU transfers cancel at hospital level.',
      census: 'Daily per unit: Opening + External Admissions + External Transfers In + Internal In − Internal Out − Non-death Discharges − Deaths = Closing. Next-day opening equals prior closing. Midnight patient-day = closing occupancy that day. Annual average census = patient-days ÷ calendar days (leap-year aware). Full-year patient-days equal the sum of monthly patient-days.',
      los: 'Completed-stay LOS = ICU Departed At − ICU Arrived At. Open stays contribute to census only. Headline Median LOS is the quantile of completed stays — not an average of monthly medians. Shorter LOS is not assumed clinically better.',
      capacity: 'Physical Beds = Staffed + Unstaffed. Staffed = Occupied + Available + Blocked (exclusive). Hospital totals equal the sum of unit inventories. A physical bed is not automatically a safely staffed ICU bed. Patient-to-nurse ratio uses concurrent occupied beds and nurses on duty — descriptive only.',
      equipment: 'Each ventilator occupies exactly one non-overlapping state interval (In Use, Available, Maintenance, Prep). Active inventory = In Use + Available + Maintenance + Prep. Assigned hours come from In Use intervals. Serviceable hours = In Use + Available (maintenance/prep excluded). Utilization = Assigned ÷ Serviceable. Downtime = Maintenance + Prep interval hours. Ventilator patient-days derive from assigned hours. One ventilator is never assigned to two patients. No ventilator-setting advice.',
      quality: 'Readmission and unplanned-transfer rates use operational cohorts. Infection surveillance completeness is illustrative documentation coverage — not a validated CLABSI/CAUTI/VAE rate. Safety events are process signals, not certified harm incidence. Transfer-ready and discharge-ready clocks are Scenario Only synthetic flags.',
      optimization: 'Recoverable bed hours are exclusive drivers calculated per ICU unit, then aggregated. Feasible additional admissions are the sum of unit-level minima of demand, bed headroom, staffing, equipment, and downstream caps. Units are not interchangeable. Never pressures clinical readiness. Illustrative — not achieved.',
    },
  };
}

export type IcuView = ReturnType<typeof compute>;
