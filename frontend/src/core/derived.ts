import { SITE_SPECS, WORKFORCE_SHARES, scenarioFor, splitExact, type SiteCode } from '@/showcase/facts';

const HOUR_WEIGHTS = [0.35, 0.28, 0.22, 0.2, 0.24, 0.42, 0.75, 1.15, 1.45, 1.62, 1.5, 1.42, 1.38, 1.36, 1.48, 1.72, 1.86, 1.7, 1.52, 1.28, 1.02, 0.82, 0.62, 0.46];
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const BLOCKS = ['00', '02', '04', '06', '08', '10', '12', '14', '16', '18', '20', '22'];
const WARD_NAMES = ['Medicine', 'Surgery', 'ICU', 'Cardiology', 'Orthopedics', 'Women and children', 'Oncology', 'Observation'];
const WARD_WEIGHTS = [0.22, 0.16, 0.1, 0.12, 0.11, 0.12, 0.09, 0.08];
const DENIAL_REASONS = ['Coding', 'Authorization', 'Eligibility', 'Medical necessity', 'Duplicate', 'Timely filing'];
const DENIAL_WEIGHTS = [0.31, 0.22, 0.16, 0.14, 0.09, 0.08];
const AGING = ['0–30 days', '31–60 days', '61–90 days', '91–120 days', 'Over 120 days'];
const AGING_WEIGHTS = [0.41, 0.24, 0.16, 0.11, 0.08];
const WAIT_BINS = ['0–30 min', '30–60 min', '60–90 min', '90–120 min', '120–180 min', 'Over 180 min'];

function focus(hospital: string, year: number) {
  return scenarioFor(hospital, year).focus;
}

export function arrivalsByHour(hospital: string, year: number): number[] {
  return splitExact(focus(hospital, year).edArrivals, HOUR_WEIGHTS);
}

export function arrivalHeatmap(hospital: string, year: number): number[][] {
  const weights: number[] = [];
  for (let day = 0; day < 7; day += 1) {
    const weekend = day >= 5 ? 1.08 : 1;
    for (let block = 0; block < 12; block += 1) {
      weights.push(HOUR_WEIGHTS[block * 2] * weekend * (day === 0 ? 1.04 : 1));
    }
  }
  const flat = splitExact(focus(hospital, year).edArrivals, weights);
  return DAY_NAMES.map((_, day) => BLOCKS.map((_, block) => flat[day * 12 + block]));
}

export const HEATMAP_DAYS = DAY_NAMES;
export const HEATMAP_BLOCKS = BLOCKS;

export function wards(hospital: string, year: number): { name: string; staffed: number; occupied: number; available: number; blocked: number }[] {
  const fact = focus(hospital, year);
  const staffed = splitExact(fact.staffedBeds, WARD_WEIGHTS);
  const blocked = splitExact(fact.blockedBeds, WARD_WEIGHTS).map((value, index) => Math.min(value, staffed[index]));
  let blockedGap = fact.blockedBeds - blocked.reduce((sum, value) => sum + value, 0);
  for (let index = 0; blockedGap > 0 && index < staffed.length; index += 1) {
    const room = staffed[index] - blocked[index];
    const add = Math.min(room, blockedGap);
    blocked[index] += add;
    blockedGap -= add;
  }
  const room = staffed.map((value, index) => value - blocked[index]);
  const occupied = splitExact(fact.occupiedBeds, room.map((value) => Math.max(value, 0)));
  for (let index = 0; index < occupied.length; index += 1) occupied[index] = Math.min(occupied[index], room[index]);
  let occupiedGap = fact.occupiedBeds - occupied.reduce((sum, value) => sum + value, 0);
  for (let index = 0; occupiedGap > 0 && index < room.length; index += 1) {
    const space = room[index] - occupied[index];
    const add = Math.min(space, occupiedGap);
    occupied[index] += add;
    occupiedGap -= add;
  }
  return WARD_NAMES.map((name, index) => ({
    name,
    staffed: staffed[index],
    occupied: occupied[index],
    blocked: blocked[index],
    available: staffed[index] - occupied[index] - blocked[index],
  }));
}

export function theatres(hospital: string, year: number): { name: string; completed: number }[] {
  const codes: SiteCode[] = hospital === 'ALL' ? ['H1', 'H2', 'H3', 'H4', 'H5'] : [hospital as SiteCode];
  const count = codes.reduce((sum, code) => sum + (SITE_SPECS[code]?.theatres ?? 0), 0) || 1;
  const names = Array.from({ length: Math.min(count, 8) }, (_, index) => `Theatre ${index + 1}`);
  if (count > 8) names[7] = 'Other theatres';
  const weights = names.map((_, index) => (index === names.length - 1 && count > 8 ? count - 7 : 1));
  const completed = splitExact(focus(hospital, year).surgCompleted, weights);
  return names.map((name, index) => ({ name, completed: completed[index] }));
}

export function denialReasons(hospital: string, year: number): { name: string; count: number }[] {
  const counts = splitExact(focus(hospital, year).claimsDenied, DENIAL_WEIGHTS);
  return DENIAL_REASONS.map((name, index) => ({ name, count: counts[index] })).sort((a, b) => b.count - a.count);
}

export function receivableAging(hospital: string, year: number): { name: string; amount: number }[] {
  const amounts = splitExact(focus(hospital, year).outstanding, AGING_WEIGHTS);
  return AGING.map((name, index) => ({ name, amount: amounts[index] }));
}

export function waitBins(hospital: string, year: number): { name: string; count: number }[] {
  const fact = focus(hospital, year);
  const median = fact.edWaitMedianMin;
  const weights = WAIT_BINS.map((_, index) => {
    const center = [15, 45, 75, 105, 150, 210][index];
    const distance = Math.abs(center - median);
    return Math.max(0.15, 2.4 - distance / 40);
  });
  const counts = splitExact(fact.edArrivals, weights);
  return WAIT_BINS.map((name, index) => ({ name, count: counts[index] }));
}

export function staffingByService(hospital: string, year: number): { name: string; required: number; filled: number }[] {
  const fact = focus(hospital, year);
  const names = Object.keys(WORKFORCE_SHARES);
  const weights = names.map((name) => WORKFORCE_SHARES[name]);
  const required = splitExact(Math.round(fact.requiredFte), weights);
  const filled = splitExact(Math.round(fact.filledFte), weights);
  return names.map((name, index) => ({ name, required: required[index], filled: filled[index] }));
}

export function monthlyAcuity(hospital: string, year: number): { month: string; values: number[] }[] {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return scenarioFor(hospital, year).months.map((month, index) => ({
    month: months[index],
    values: [month.acuity1, month.acuity2, month.acuity3, month.acuity4, month.acuity5],
  }));
}
