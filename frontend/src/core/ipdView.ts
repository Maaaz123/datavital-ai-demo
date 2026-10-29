import { scenarioFor } from '@/showcase/facts';
import { ipdDocScenario, longStayRateFromP90 } from './ipdScope';
import { sumKey, weighted, type ReportPeriod } from './period';

const SPECIALTIES = ['Medicine', 'Surgery', 'Cardiology', 'Orthopedics', 'Women', 'Children'];
const SOURCES = ['From emergency', 'Elective / direct', 'Transfer in', 'Other'];
const DESTINATIONS = ['Home', 'Transfer out', 'Rehab / step-down', 'Left against medical advice'];

export { longStayRateFromP90, specialtyReadmitShare } from './ipdScope';

function periodRows(hospital: string, year: number, period: 'Q1' | 'Q2' | 'Q3' | 'Q4') {
  const start = { Q1: 0, Q2: 3, Q3: 6, Q4: 9 }[period];
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return scenarioFor(hospital, year).months.slice(start, start + 3).map((month, index) => ({ label: names[start + index], month }));
}

export function splitExact(total: number, weights: number[]): number[] {
  const sum = weights.reduce((item, value) => item + value, 0) || 1;
  const raw = weights.map((weight) => (weight / sum) * total);
  const base = raw.map((value) => Math.floor(value));
  let left = Math.round(total) - base.reduce((item, value) => item + value, 0);
  const order = raw.map((value, index) => ({ index, frac: value - Math.floor(value) })).sort((a, b) => b.frac - a.frac);
  for (let step = 0; left > 0 && step < order.length; step += 1) {
    base[order[step].index] += 1;
    left -= 1;
  }
  return base;
}

/** Shared inpatient view for CoreApp screens, Vital Assist, and what-if. Respects hospital, year, and period. */
export function buildIpdView(hospital: string, year: number, period: ReportPeriod = 'year') {
  const rows = period === 'year'
    ? scenarioFor(hospital, year).months.map((month, index) => ({ label: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index], month }))
    : periodRows(hospital, year, period);
  const fact = scenarioFor(hospital, year).focus;
  const admissions = sumKey(rows, 'admissions');
  const discharges = sumKey(rows, 'discharges');
  const deaths = sumKey(rows, 'deaths');
  const transfersIn = sumKey(rows, 'transfersIn');
  const transfersOut = sumKey(rows, 'transfersOut');
  const edAdmittedRaw = sumKey(rows, 'edAdmitted');
  const fromEmergency = Math.min(edAdmittedRaw, admissions);
  const transferSource = Math.min(transfersIn, Math.max(0, admissions - fromEmergency));
  const remainder = Math.max(0, admissions - fromEmergency - transferSource);
  const otherSource = Math.min(remainder, Math.round(admissions * 0.02));
  const directAdmissions = Math.max(0, remainder - otherSource);
  const edAdmitted = fromEmergency;
  const census = period === 'year'
    ? fact.occupiedBeds
    : Math.round(rows.reduce((sum, row) => sum + row.month.occupiedBeds, 0) / Math.max(rows.length, 1));
  const losMedian = period === 'year' ? fact.ipLosDays : weighted(rows, 'ipLosDays', 'admissions');
  const losP90 = period === 'year' ? fact.ipLosP90Days : weighted(rows, 'ipLosP90Days', 'admissions');
  const losAvg = period === 'year' ? fact.ipLosAvgDays : weighted(rows, 'ipLosAvgDays', 'admissions');
  const longStayRate = longStayRateFromP90(losP90);
  const longStayCount = Math.round(discharges * longStayRate);
  const readyNotDischarged = Math.max(1, Math.round(census * 0.08));
  const delayedDischargeRate = census ? readyNotDischarged / census : 0;
  const expectedDischarges = Math.max(1, Math.round(discharges / (period === 'year' ? 365 : 91)));
  // Occupancy for readmit tilt uses the same census basis as the selected period.
  const bedOcc = fact.staffedBeds ? census / fact.staffedBeds : 0;
  const readmit30 = 0.086 + bedOcc * 0.02;
  const readmit7 = 0.018;
  const amaRate = 0.018;
  const specialtyWeights = [0.28, 0.22, 0.14, 0.12, 0.14, 0.1];
  const specialtyAdmissions = splitExact(admissions, specialtyWeights);
  const specialtyDischarges = splitExact(discharges, specialtyWeights);
  const specialties = SPECIALTIES.map((id, index) => ({
    id,
    admissions: specialtyAdmissions[index],
    discharges: specialtyDischarges[index],
    los: Math.round((losMedian * (0.85 + index * 0.06)) * 10) / 10,
  }));
  const sources = [
    { id: SOURCES[0], count: fromEmergency },
    { id: SOURCES[1], count: directAdmissions },
    { id: SOURCES[2], count: transferSource },
    { id: SOURCES[3], count: otherSource },
  ];
  const amaCount = Math.round(discharges * amaRate);
  const rehab = Math.round(discharges * 0.07);
  const destTransfer = Math.min(transfersOut, Math.max(0, discharges - amaCount - rehab));
  const home = Math.max(0, discharges - amaCount - rehab - destTransfer);
  const destinations = [
    { id: DESTINATIONS[0], count: home },
    { id: DESTINATIONS[1], count: destTransfer },
    { id: DESTINATIONS[2], count: rehab },
    { id: DESTINATIONS[3], count: amaCount },
  ];
  const longStayWeights = specialties.map((item) => Math.max(0.01, item.discharges * (0.8 + item.los / Math.max(losMedian, 1))));
  const longStayBySpecialty = splitExact(longStayCount, longStayWeights);
  const docs = ipdDocScenario({ hospital, occupiedBeds: census, staffedBeds: fact.staffedBeds });
  return {
    hospital,
    year,
    period,
    periodLabel: period === 'year' ? `Full year ${year}` : `${period} ${year}`,
    admissions,
    discharges,
    deaths,
    transfersIn,
    transfersOut,
    edAdmitted,
    directAdmissions,
    census,
    censusBasis: period === 'year'
      ? 'year-end focus census snapshot'
      : 'average of month-end census points in the selected quarter',
    losMedian,
    losP90,
    losAvg,
    longStayRate,
    longStayCount,
    longStayBySpecialty,
    readyNotDischarged,
    delayedDischargeRate,
    expectedDischarges,
    readmit7,
    readmit30,
    amaRate,
    specialties,
    sources,
    destinations,
    staffedBeds: fact.staffedBeds,
    ...docs,
    labels: rows.map((row) => row.label),
    monthlyAdmissions: rows.map((row) => row.month.admissions),
    monthlyDischarges: rows.map((row) => row.month.discharges),
    monthlyDeaths: rows.map((row) => row.month.deaths),
    monthlyLos: rows.map((row) => row.month.ipLosDays),
    monthlyCensus: rows.map((row) => row.month.occupiedBeds),
  };
}

export type IpdView = ReturnType<typeof buildIpdView>;
