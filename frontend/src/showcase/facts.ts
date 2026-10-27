/** Deterministic fictional scenario. Amounts are Saudi riyals (SAR) inside the story, not a hospital extract. */

export const CURRENCY = 'SAR';
export const CURRENCY_NOTE = 'SAR (Saudi riyal) — fictional scenario currency';

export const SITE_SPECS = {
  H1: { beds: 420, icu: 36, theatres: 8, edBays: 28, wards: 16, pressure: 0.46 },
  H2: { beds: 280, icu: 22, theatres: 5, edBays: 18, wards: 12, pressure: 0.28 },
  H3: { beds: 510, icu: 48, theatres: 10, edBays: 36, wards: 18, pressure: 0.7 },
  H4: { beds: 240, icu: 16, theatres: 4, edBays: 14, wards: 11, pressure: 0.2 },
  H5: { beds: 360, icu: 30, theatres: 7, edBays: 24, wards: 14, pressure: 0.52 },
} as const;

export type SiteCode = keyof typeof SITE_SPECS;

const WEIGHTS = [0.97, 0.94, 1.01, 1, 1.04, 0.99, 0.93, 0.96, 1.05, 1.07, 1.03, 1.01];
const WEIGHT_SUM = WEIGHTS.reduce((sum, value) => sum + value, 0);
const SEASON = WEIGHTS.map((value) => (value / WEIGHT_SUM) * 12);

const ADDITIVE = [
  'admissions', 'discharges', 'transfersIn', 'transfersOut', 'deaths',
  'edArrivals', 'edAdmitted', 'edDischarged', 'edLeft',
  'acuity1', 'acuity2', 'acuity3', 'acuity4', 'acuity5',
  'apptSlots', 'apptDemand', 'apptBooked', 'apptAttended', 'apptCancelled', 'apptNoShow',
  'surgRequests', 'surgCompleted', 'surgCancelled',
  'labOrders', 'labResulted', 'labCancelled', 'labDelayed',
  'radOrders', 'radReported', 'radCancelled', 'radXr', 'radCt', 'radUs', 'radMr',
  'pharmOrders', 'pharmDispensed', 'pharmAdmin',
  'claimsSubmitted', 'claimsDenied', 'claimsPaid', 'claimsPending',
  'billed', 'adjustment', 'allowed', 'payerPaid', 'patientPaid', 'writeoff', 'outstanding',
  'surveysSent', 'surveysReturned', 'complaintsOpened', 'complaintsClosed',
  'dialysisSessions', 'haiEvents', 'births', 'eligibilityChecks', 'preauthRequested', 'preauthDenied',
  'overtimeHours', 'downtimeEvents', 'outbreakDeclarations', 'encounters', 'directAdmissions',
  'edDeaths', 'surgDeaths', 'radNoShow', 'dxDeaths30',
] as const;

export type AdditiveKey = (typeof ADDITIVE)[number];

export type MonthFact = Record<AdditiveKey, number> & {
  staffedBeds: number;
  occupiedBeds: number;
  blockedBeds: number;
  availableBeds: number;
  icuStaffed: number;
  icuOccupied: number;
  icuBlocked: number;
  icuAvailable: number;
  wardCount: number;
  edWaitMedianMin: number;
  edWaitP90Min: number;
  edLosMedianMin: number;
  edLosP90Min: number;
  ipLosDays: number;
  ipLosP90Days: number;
  labTatMedianMin: number;
  labTatP90Min: number;
  radTatMedianMin: number;
  radTatP90Min: number;
  opWaitMedianMin: number;
  opWaitP90Min: number;
  edWaitAvgMin: number;
  edLosAvgMin: number;
  ipLosAvgDays: number;
  labTatAvgMin: number;
  radTatAvgMin: number;
  opWaitAvgMin: number;
  freshnessHours: number;
  requiredFte: number;
  filledFte: number;
  satisfaction: number;
  equipmentUptime: number;
  morgueReleaseHours: number;
  activePatients: number;
};

export type AnnualFact = MonthFact;

export type Scenario = {
  hospital: string;
  year: number;
  focus: AnnualFact;
  months: MonthFact[];
  sites: { code: SiteCode; annual: AnnualFact; months: MonthFact[] }[];
};

function daysInMonth(year: number, month: number): number {
  if (month === 1) return year % 4 === 0 ? 29 : 28;
  return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
}

function yearFactor(year: number): number {
  if (year <= 2024) return 0.96;
  if (year === 2025) return 1;
  return 1.045;
}

export function splitExact(total: number, weights: number[]): number[] {
  const safe = Math.max(0, Math.round(total));
  const sum = weights.reduce((acc, value) => acc + value, 0) || 1;
  const raw = weights.map((weight) => Math.floor((safe * weight) / sum));
  let used = raw.reduce((acc, value) => acc + value, 0);
  let index = 0;
  while (used < safe) {
    raw[index % raw.length] += 1;
    used += 1;
    index += 1;
  }
  return raw;
}

const Z90 = 1.2815515655446004;

export function skewedMean(median: number, p90: number): number {
  const med = Math.max(median, 0.01);
  const hi = Math.max(p90, med * 1.001);
  const sigma = Math.log(hi / med) / Z90;
  return med * Math.exp((sigma * sigma) / 2);
}

function erf(x: number): number {
  const sign = Math.sign(x) || 1;
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t) * Math.exp(-a * a);
  return sign * y;
}

function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

function mixtureQuantile(parts: { median: number; p90: number; weight: number }[], q: number): number {
  const rows = parts.filter((part) => part.weight > 0 && part.median > 0);
  if (!rows.length) return 0;
  const total = rows.reduce((sum, part) => sum + part.weight, 0);
  const specs = rows.map((part) => {
    const hi = Math.max(part.p90, part.median * 1.001);
    const sigma = Math.log(hi / part.median) / Z90;
    return { mu: Math.log(part.median), sigma: Math.max(sigma, 1e-6), weight: part.weight / total };
  });
  const cdf = (x: number) => specs.reduce((sum, spec) => sum + spec.weight * normalCdf((Math.log(Math.max(x, 1e-9)) - spec.mu) / spec.sigma), 0);
  let lo = Math.min(...rows.map((part) => part.median)) * 0.25;
  let hi = Math.max(...rows.map((part) => part.p90)) * 2.5;
  for (let step = 0; step < 48; step += 1) {
    const mid = (lo + hi) / 2;
    if (cdf(mid) < q) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function rollDuration(
  parts: MonthFact[],
  medianKey: keyof MonthFact,
  p90Key: keyof MonthFact,
  avgKey: keyof MonthFact,
  weight: AdditiveKey,
) {
  const rows = parts.map((part) => ({
    median: Number(part[medianKey]),
    p90: Number(part[p90Key]),
    avg: Number(part[avgKey]),
    weight: part[weight],
  }));
  return {
    median: mixtureQuantile(rows, 0.5),
    p90: mixtureQuantile(rows, 0.9),
    avg: weighted(rows.map((row) => ({ value: row.avg, weight: row.weight }))),
  };
}

function weighted(items: { value: number; weight: number }[]): number {
  const weight = items.reduce((sum, item) => sum + item.weight, 0);
  if (weight <= 0) return items[0]?.value ?? 0;
  return items.reduce((sum, item) => sum + item.value * item.weight, 0) / weight;
}

export function buildMonth(code: SiteCode, year: number, month: number): MonthFact {
  const site = SITE_SPECS[code];
  const yf = yearFactor(year);
  const season = SEASON[month];
  const days = daysInMonth(year, month);
  const occ = Math.min(0.94, Math.max(0.7, 0.74 + site.pressure * 0.18 + (code === 'H3' ? 0.035 : 0) + (month === 9 ? 0.015 : 0)));
  const staffedBeds = site.beds;
  const blockedBeds = Math.round(staffedBeds * 0.028);
  const occupiedBeds = Math.round((staffedBeds - blockedBeds) * occ);
  const availableBeds = staffedBeds - occupiedBeds - blockedBeds;
  const icuStaffed = site.icu;
  const icuBlocked = Math.max(1, Math.round(icuStaffed * 0.04));
  const icuOccupied = Math.min(icuStaffed - icuBlocked, Math.round((icuStaffed - icuBlocked) * Math.min(0.96, occ + 0.05)));
  const icuAvailable = icuStaffed - icuOccupied - icuBlocked;

  const ipLosDays = Math.round((3.55 + site.pressure * 1.15) * 100) / 100;
  const ipLosP90Days = Math.round(ipLosDays * 1.85 * 100) / 100;
  const admissions = Math.max(1, Math.round(occupiedBeds * (days / ipLosDays) * season * yf));
  const deaths = Math.round(admissions * (0.006 + site.pressure * 0.003));
  const transfersIn = Math.round(admissions * 0.045);
  const transfersOut = Math.round(admissions * 0.04);
  const discharges = admissions + transfersIn - transfersOut - deaths;

  const edArrivals = Math.round(site.edBays * 6.4 * days * season * yf);
  const admitRate = 0.155 + site.pressure * 0.04;
  const [acuity1, acuity2, acuity3, acuity4, acuity5] = splitExact(edArrivals, [0.08, 0.22, 0.4, 0.22, 0.08]);
  const edLeft = Math.round(edArrivals * 0.018);
  const edAdmitted = Math.min(
    Math.round(edArrivals * admitRate),
    Math.max(0, edArrivals - edLeft),
    Math.round(admissions * 0.45),
  );
  const edDischarged = edArrivals - edAdmitted - edLeft;
  const waitBump = code === 'H1' && year === 2026 ? 16 : code === 'H1' && year === 2025 ? 6 : 0;
  const edWaitMedianMin = Math.round(34 + site.pressure * 26 + waitBump + (month >= 5 && month <= 8 ? 4 : 0));
  const edWaitP90Min = Math.round(edWaitMedianMin * 1.72);
  const edLosMedianMin = edWaitMedianMin + 78;
  const edLosP90Min = Math.round(edLosMedianMin * 1.65);

  const apptSlots = Math.round(site.beds * 2.35 * (days / 30) * season * yf);
  const apptDemand = Math.round(apptSlots * (1.05 + site.pressure * 0.07));
  const apptBooked = Math.min(apptDemand, Math.round(apptSlots * 0.98));
  const apptCancelled = Math.round(apptBooked * 0.07);
  const apptNoShow = Math.round(apptBooked * 0.055);
  const apptAttended = apptBooked - apptCancelled - apptNoShow;
  const opWaitMedianMin = Math.round(18 + site.pressure * 14);
  const opWaitP90Min = Math.round(opWaitMedianMin * 1.8);

  const surgRequests = Math.round(site.theatres * 2.35 * days * 0.72 * season * yf);
  const surgCancelled = Math.round(surgRequests * (0.068 + (code === 'H2' ? 0.018 : 0)));
  const surgCompleted = surgRequests - surgCancelled;
  const edDeaths = Math.round(edArrivals * 0.00035);
  const surgDeaths = Math.min(deaths, Math.round(surgCompleted * 0.004));
  const dxDeaths30 = Math.round(discharges * 0.008);

  const labOrders = Math.round(site.beds * 13.5 * (days / 30) * season * yf);
  const labCancelled = Math.round(labOrders * 0.025);
  const labDelayed = Math.round(labOrders * 0.06);
  const labResulted = labOrders - labCancelled - labDelayed;
  const labTatMedianMin = Math.round(44 + site.pressure * 16);
  const labTatP90Min = Math.round(labTatMedianMin * 2.05);

  const radOrders = Math.round(site.beds * 6.2 * (days / 30) * season * yf);
  const radCancelled = Math.round(radOrders * 0.03);
  const radNoShow = Math.round(radOrders * 0.028);
  const radReported = radOrders - radCancelled - radNoShow;
  const [radXr, radCt, radUs, radMr] = splitExact(radOrders, [0.46, 0.22, 0.2, 0.12]);
  const radTatMedianMin = Math.round(180 + site.pressure * 70);
  const radTatP90Min = Math.round(radTatMedianMin * 1.9);

  const directAdmissions = admissions - edAdmitted;
  const pharmOrders = admissions * 8 + Math.round(apptAttended * 0.35);
  const pharmDispensed = Math.round(pharmOrders * 0.96);
  const pharmAdmin = Math.round(pharmDispensed * 0.91);

  const encounters = edArrivals + apptAttended + directAdmissions;
  const claimsSubmitted = Math.round(encounters * 0.92);
  const denialRate = 0.046 + (code === 'H2' ? 0.027 : 0) + (code === 'H2' && year === 2026 ? 0.011 : 0);
  const claimsDenied = Math.round(claimsSubmitted * denialRate);
  let claimsPending = Math.round(claimsSubmitted * 0.05);
  let claimsPaid = claimsSubmitted - claimsDenied - claimsPending;
  if (claimsPaid < 0) {
    claimsPending = Math.max(0, claimsPending + claimsPaid);
    claimsPaid = claimsSubmitted - claimsDenied - claimsPending;
  }

  const edBilled = edArrivals * 1450 + edAdmitted * 4200;
  const ipBilled = directAdmissions * 18600;
  const opBilled = apptAttended * 680;
  const surgBilled = surgCompleted * 2400;
  const billed = edBilled + ipBilled + opBilled + surgBilled;
  const adjustment = Math.round(billed * 0.19);
  const allowed = billed - adjustment;
  const writeoff = Math.round(allowed * denialRate);
  const distributable = allowed - writeoff;
  let payerPaid = Math.round(distributable * 0.8);
  let patientPaid = Math.round(distributable * 0.12);
  if (payerPaid + patientPaid > distributable) patientPaid = Math.max(0, distributable - payerPaid);
  const outstanding = distributable - payerPaid - patientPaid;

  const requiredFte = Math.round(site.beds * 4.15 * 10) / 10;
  const filledFte = Math.round(requiredFte * (0.92 - site.pressure * 0.05) * 10) / 10;
  const overtimeHours = Math.round(Math.max(0, requiredFte - filledFte) * 16 * season + site.beds * 0.8 * season);

  const surveysSent = Math.round(encounters * 0.34);
  const surveysReturned = Math.round(surveysSent * (0.44 - (code === 'H4' ? 0.09 : 0)));
  const complaintsOpened = Math.max(1, Math.round(encounters * (0.0036 + (code === 'H4' ? 0.0016 : 0))));
  const complaintsClosed = Math.min(complaintsOpened, Math.round(complaintsOpened * 0.74));
  const satisfaction = Math.round((79.5 - site.pressure * 7.5 + (code === 'H4' ? -5.5 : 0) + (year - 2025) * 0.3) * 10) / 10;

  const dialysisSessions = Math.round(site.beds * 0.042 * days * season);
  const haiEvents = Math.round(admissions * (0.011 + site.pressure * 0.005));
  const births = Math.round(site.beds * 0.034 * (days / 30) * season * yf);
  const eligibilityChecks = Math.round(claimsSubmitted * 0.86);
  const preauthRequested = Math.round(surgRequests * 0.64 + radCt * 0.28);
  const preauthDenied = Math.round(preauthRequested * (0.075 + (code === 'H2' ? 0.028 : 0)));
  const equipmentUptime = Math.round((0.972 - site.pressure * 0.018) * 1000) / 1000;
  const downtimeEvents = code === 'H4' && month === 1 ? 0 : Math.max(1, Math.round(site.wards * 0.18 * season));
  const outbreakDeclarations = 0;
  const morgueReleaseHours = Math.round((26 + site.pressure * 12) * 10) / 10;
  const activePatients = Math.round(site.beds * 36 * yf);

  return {
    admissions, discharges, transfersIn, transfersOut, deaths,
    edArrivals, edAdmitted, edDischarged, edLeft,
    acuity1, acuity2, acuity3, acuity4, acuity5,
    apptSlots, apptDemand, apptBooked, apptAttended, apptCancelled, apptNoShow,
    surgRequests, surgCompleted, surgCancelled,
    labOrders, labResulted, labCancelled, labDelayed,
    radOrders, radReported, radCancelled, radXr, radCt, radUs, radMr,
    pharmOrders, pharmDispensed, pharmAdmin,
    claimsSubmitted, claimsDenied, claimsPaid, claimsPending,
    billed, adjustment, allowed, payerPaid, patientPaid, writeoff, outstanding,
    surveysSent, surveysReturned, complaintsOpened, complaintsClosed,
    dialysisSessions, haiEvents, births, eligibilityChecks, preauthRequested, preauthDenied,
    overtimeHours, downtimeEvents, outbreakDeclarations, encounters, directAdmissions,
    edDeaths, surgDeaths, radNoShow, dxDeaths30,
    staffedBeds, occupiedBeds, blockedBeds, availableBeds,
    icuStaffed, icuOccupied, icuBlocked, icuAvailable, wardCount: site.wards,
    edWaitMedianMin, edWaitP90Min, edLosMedianMin, edLosP90Min,
    ipLosDays, ipLosP90Days, labTatMedianMin, labTatP90Min, radTatMedianMin, radTatP90Min,
    opWaitMedianMin, opWaitP90Min,
    edWaitAvgMin: skewedMean(edWaitMedianMin, edWaitP90Min),
    edLosAvgMin: skewedMean(edLosMedianMin, edLosP90Min),
    ipLosAvgDays: skewedMean(ipLosDays, ipLosP90Days),
    labTatAvgMin: skewedMean(labTatMedianMin, labTatP90Min),
    radTatAvgMin: skewedMean(radTatMedianMin, radTatP90Min),
    opWaitAvgMin: skewedMean(opWaitMedianMin, opWaitP90Min),
    freshnessHours: 6.5,
    requiredFte, filledFte, satisfaction, equipmentUptime,
    morgueReleaseHours, activePatients,
  };
}

function assignTiming(totals: AnnualFact, parts: MonthFact[]) {
  const edWait = rollDuration(parts, 'edWaitMedianMin', 'edWaitP90Min', 'edWaitAvgMin', 'edArrivals');
  const edLos = rollDuration(parts, 'edLosMedianMin', 'edLosP90Min', 'edLosAvgMin', 'edArrivals');
  const ipLos = rollDuration(parts, 'ipLosDays', 'ipLosP90Days', 'ipLosAvgDays', 'admissions');
  const labTat = rollDuration(parts, 'labTatMedianMin', 'labTatP90Min', 'labTatAvgMin', 'labOrders');
  const radTat = rollDuration(parts, 'radTatMedianMin', 'radTatP90Min', 'radTatAvgMin', 'radOrders');
  const opWait = rollDuration(parts, 'opWaitMedianMin', 'opWaitP90Min', 'opWaitAvgMin', 'apptAttended');
  totals.edWaitMedianMin = edWait.median;
  totals.edWaitP90Min = edWait.p90;
  totals.edWaitAvgMin = edWait.avg;
  totals.edLosMedianMin = edLos.median;
  totals.edLosP90Min = edLos.p90;
  totals.edLosAvgMin = edLos.avg;
  totals.ipLosDays = ipLos.median;
  totals.ipLosP90Days = ipLos.p90;
  totals.ipLosAvgDays = ipLos.avg;
  totals.labTatMedianMin = labTat.median;
  totals.labTatP90Min = labTat.p90;
  totals.labTatAvgMin = labTat.avg;
  totals.radTatMedianMin = radTat.median;
  totals.radTatP90Min = radTat.p90;
  totals.radTatAvgMin = radTat.avg;
  totals.opWaitMedianMin = opWait.median;
  totals.opWaitP90Min = opWait.p90;
  totals.opWaitAvgMin = opWait.avg;
  totals.freshnessHours = parts[0].freshnessHours;
}

function rollupMonths(months: MonthFact[]): AnnualFact {
  const totals = { ...months[0] };
  for (const key of ADDITIVE) totals[key] = months.reduce((sum, month) => sum + month[key], 0);
  const avg = (key: keyof MonthFact, weight: AdditiveKey) =>
    weighted(months.map((month) => ({ value: Number(month[key]), weight: month[weight] })));
  assignTiming(totals, months);
  totals.satisfaction = avg('satisfaction', 'surveysReturned');
  totals.equipmentUptime = avg('equipmentUptime', 'encounters');
  totals.morgueReleaseHours = avg('morgueReleaseHours', 'deaths');
  totals.requiredFte = months[0].requiredFte;
  totals.filledFte = months[0].filledFte;
  totals.staffedBeds = months[0].staffedBeds;
  totals.blockedBeds = months[0].blockedBeds;
  totals.occupiedBeds = Math.min(totals.staffedBeds - totals.blockedBeds, Math.round(months.reduce((sum, month) => sum + month.occupiedBeds, 0) / months.length));
  totals.availableBeds = totals.staffedBeds - totals.occupiedBeds - totals.blockedBeds;
  totals.icuStaffed = months[0].icuStaffed;
  totals.icuBlocked = months[0].icuBlocked;
  totals.icuOccupied = Math.min(totals.icuStaffed - totals.icuBlocked, Math.round(months.reduce((sum, month) => sum + month.icuOccupied, 0) / months.length));
  totals.icuAvailable = totals.icuStaffed - totals.icuOccupied - totals.icuBlocked;
  totals.wardCount = months[0].wardCount;
  totals.activePatients = months[0].activePatients;
  return totals;
}

function rollupSites(annuals: AnnualFact[]): AnnualFact {
  const totals = { ...annuals[0] };
  for (const key of ADDITIVE) totals[key] = annuals.reduce((sum, site) => sum + site[key], 0);
  const avg = (key: keyof MonthFact, weight: AdditiveKey) =>
    weighted(annuals.map((site) => ({ value: Number(site[key]), weight: site[weight] })));
  assignTiming(totals, annuals);
  totals.satisfaction = avg('satisfaction', 'surveysReturned');
  totals.equipmentUptime = weighted(annuals.map((site) => ({ value: site.equipmentUptime, weight: site.staffedBeds })));
  totals.morgueReleaseHours = avg('morgueReleaseHours', 'deaths');
  totals.requiredFte = Math.round(annuals.reduce((sum, site) => sum + site.requiredFte, 0) * 10) / 10;
  totals.filledFte = Math.round(annuals.reduce((sum, site) => sum + site.filledFte, 0) * 10) / 10;
  totals.staffedBeds = annuals.reduce((sum, site) => sum + site.staffedBeds, 0);
  totals.blockedBeds = annuals.reduce((sum, site) => sum + site.blockedBeds, 0);
  totals.occupiedBeds = Math.min(totals.staffedBeds - totals.blockedBeds, annuals.reduce((sum, site) => sum + site.occupiedBeds, 0));
  totals.availableBeds = totals.staffedBeds - totals.occupiedBeds - totals.blockedBeds;
  totals.icuStaffed = annuals.reduce((sum, site) => sum + site.icuStaffed, 0);
  totals.icuBlocked = annuals.reduce((sum, site) => sum + site.icuBlocked, 0);
  totals.icuOccupied = Math.min(totals.icuStaffed - totals.icuBlocked, annuals.reduce((sum, site) => sum + site.icuOccupied, 0));
  totals.icuAvailable = totals.icuStaffed - totals.icuOccupied - totals.icuBlocked;
  totals.wardCount = annuals.reduce((sum, site) => sum + site.wardCount, 0);
  totals.activePatients = annuals.reduce((sum, site) => sum + site.activePatients, 0);
  return totals;
}

const CODES = Object.keys(SITE_SPECS) as SiteCode[];

const SCENARIO_CACHE = new Map<string, Scenario>();

export function scenarioFor(hospital: string, year: number): Scenario {
  const id = `${hospital}|${year}`;
  const cached = SCENARIO_CACHE.get(id);
  if (cached) return cached;
  const sites = CODES.map((code) => {
    const months = Array.from({ length: 12 }, (_, month) => buildMonth(code, year, month));
    return { code, months, annual: rollupMonths(months) };
  });
  const networkMonths = Array.from({ length: 12 }, (_, month) => rollupSites(sites.map((site) => site.months[month])));
  const focusCode = hospital === 'ALL' ? null : (hospital as SiteCode);
  const focusSite = sites.find((site) => site.code === focusCode);
  const packet = {
    hospital,
    year,
    sites,
    months: focusSite ? focusSite.months : networkMonths,
    focus: focusSite ? focusSite.annual : rollupSites(sites.map((site) => site.annual)),
  };
  SCENARIO_CACHE.set(id, packet);
  return packet;
}

export type WardRow = { id: string; staffed: number; occupied: number; available: number; blocked: number };

const WARD_NAMES = ['Medicine', 'Surgery', 'Women', 'Children', 'Cardiology', 'Oncology', 'ICU step-down', 'Orthopedics'];

function allocateWithin(total: number, caps: number[]): number[] {
  const safeCaps = caps.map((cap) => Math.max(0, cap));
  const capSum = safeCaps.reduce((sum, cap) => sum + cap, 0);
  const target = Math.min(total, capSum);
  const raw = splitExact(target, safeCaps.map((cap) => cap || 0.0001));
  const out = raw.map((value, index) => Math.min(safeCaps[index], value));
  let used = out.reduce((sum, value) => sum + value, 0);
  let guard = 0;
  while (used < target && guard < target + 5) {
    const index = guard % out.length;
    if (out[index] < safeCaps[index]) {
      out[index] += 1;
      used += 1;
    }
    guard += 1;
  }
  return out;
}

export function wardRows(fact: AnnualFact): WardRow[] {
  const count = Math.min(WARD_NAMES.length, Math.max(4, Math.round(fact.wardCount / 2)));
  const staffed = splitExact(fact.staffedBeds, Array.from({ length: count }, () => 1));
  const blocked = allocateWithin(fact.blockedBeds, staffed);
  const occupied = allocateWithin(fact.occupiedBeds, staffed.map((beds, index) => beds - blocked[index]));
  return WARD_NAMES.slice(0, count).map((id, index) => ({
    id,
    staffed: staffed[index],
    occupied: occupied[index],
    blocked: blocked[index],
    available: staffed[index] - occupied[index] - blocked[index],
  }));
}

export const WORKFORCE_SHARES: Record<string, number> = {
  Emergency: 0.22,
  Inpatient: 0.38,
  Laboratory: 0.09,
  Surgery: 0.14,
  Pharmacy: 0.07,
  Revenue: 0.05,
  Experience: 0.05,
};

export function skillMix(filledFte: number): { id: string; fte: number }[] {
  const heads = splitExact(Math.round(filledFte), [0.62, 0.14, 0.16, 0.08]);
  return ['Nursing', 'Physicians', 'Allied health', 'Operational support'].map((id, index) => ({ id, fte: heads[index] }));
}

export function problems(fact: AnnualFact): string[] {
  const issues: string[] = [];
  const census = fact.admissions + fact.transfersIn - fact.discharges - fact.transfersOut - fact.deaths;
  if (census !== 0) issues.push(`census residual ${census}`);
  if (fact.occupiedBeds + fact.availableBeds + fact.blockedBeds !== fact.staffedBeds) issues.push('beds do not reconcile');
  if (fact.icuOccupied + fact.icuAvailable + fact.icuBlocked !== fact.icuStaffed) issues.push('icu beds do not reconcile');
  if (fact.apptAttended + fact.apptCancelled + fact.apptNoShow !== fact.apptBooked) issues.push('appointments do not reconcile');
  if (fact.surgCompleted + fact.surgCancelled !== fact.surgRequests) issues.push('surgery does not reconcile');
  if (fact.labResulted + fact.labCancelled + fact.labDelayed !== fact.labOrders) issues.push('lab does not reconcile');
  if (fact.radXr + fact.radCt + fact.radUs + fact.radMr !== fact.radOrders) issues.push('modalities do not reconcile');
  if (fact.radReported + fact.radCancelled + fact.radNoShow !== fact.radOrders) issues.push('radiology disposition does not reconcile');
  if (fact.surgDeaths > fact.deaths) issues.push('surgical deaths exceed inpatient deaths');
  if (fact.ipLosAvgDays + 1e-6 < fact.ipLosDays) issues.push('inpatient average below median');
  if (fact.acuity1 + fact.acuity2 + fact.acuity3 + fact.acuity4 + fact.acuity5 !== fact.edArrivals) issues.push('acuity does not reconcile');
  if (fact.adjustment + fact.allowed !== fact.billed) issues.push('billed does not reconcile');
  if (fact.payerPaid + fact.patientPaid + fact.writeoff + fact.outstanding !== fact.allowed) issues.push('allowed does not reconcile');
  if (fact.claimsDenied + fact.claimsPaid + fact.claimsPending !== fact.claimsSubmitted) issues.push('claims do not reconcile');
  if (fact.edDischarged + fact.edAdmitted + fact.edLeft !== fact.edArrivals) issues.push('ed disposition does not reconcile');
  if (fact.surgCompleted > fact.surgRequests || fact.surgCancelled > fact.surgRequests) issues.push('surgery subset exceeds requests');
  if (fact.pharmAdmin > fact.pharmDispensed || fact.pharmDispensed > fact.pharmOrders) issues.push('pharmacy subset exceeds orders');
  if (fact.edWaitP90Min < fact.edWaitMedianMin) issues.push('ed wait p90 below median');
  if (fact.edLosP90Min < fact.edLosMedianMin) issues.push('ed los p90 below median');
  if (fact.ipLosP90Days < fact.ipLosDays) issues.push('los p90 below median');
  if (fact.labTatP90Min < fact.labTatMedianMin) issues.push('lab p90 below median');
  if (fact.filledFte > fact.requiredFte + 0.05) issues.push('filled fte above required');
  if (fact.complaintsClosed > fact.complaintsOpened) issues.push('closed complaints exceed opened');
  if (fact.activePatients < fact.staffedBeds) issues.push('active patients below beds');
  if (fact.wardCount > 120) issues.push('ward count implausible');
  return issues;
}
