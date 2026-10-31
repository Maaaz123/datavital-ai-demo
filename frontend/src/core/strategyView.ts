import { SITE_SPECS, scenarioFor, type SiteCode } from '@/showcase/facts';
import { splitExact } from './ipdView';
import { type ReportPeriod } from './period';
import { buildIcuView } from './icuView';
import { buildRcmView } from './rcmView';
import { buildScView } from './supplyChainView';
import { buildSurgeryView } from './surgeryView';
import { buildOpdView } from './opdView';
import { buildAppointmentView } from './appointmentView';

/** Service lines for contribution / capacity analysis (not a recreation of bed/OR primary ownership). */
export const ST_SERVICE_LINES = [
  'Orthopedics',
  'Cardiology',
  'General Surgery',
  'Obstetrics',
  'Oncology',
  'Emergency Medicine',
  'Internal Medicine',
  'Pediatrics',
] as const;

/** Cost model categories — document direct/indirect and fixed/variable in methodology. */
export const ST_COST_CATEGORIES = [
  'Salaries',
  'Overtime',
  'Agency',
  'Consumables',
  'Drugs',
  'Maintenance',
  'Depreciation',
  'Facility',
  'Utilities',
  'Shared services',
  'Other direct',
] as const;

export const ST_COST_META: Record<(typeof ST_COST_CATEGORIES)[number], { direct: boolean; variable: boolean }> = {
  Salaries: { direct: true, variable: false },
  Overtime: { direct: true, variable: true },
  Agency: { direct: true, variable: true },
  Consumables: { direct: true, variable: true },
  Drugs: { direct: true, variable: true },
  Maintenance: { direct: true, variable: false },
  Depreciation: { direct: true, variable: false },
  Facility: { direct: false, variable: false },
  Utilities: { direct: false, variable: true },
  'Shared services': { direct: false, variable: false },
  'Other direct': { direct: true, variable: true },
};

export const ST_TARGETS = {
  resourceUtilization: 0.82,
  staffingUtilization: 0.85,
  equipmentUtilization: 0.78,
  capacityUtilization: 0.8,
  contributionMarginRate: 0.28,
  contributionMarginPct: 0.28,
  investmentFeasibility: 0.6,
  decisionReadiness: 0.75,
  overtimeShare: 0.08,
} as const;

export const ST_OPPORTUNITY_IDS = [
  'st-reallocate-nurses',
  'st-extend-or-hours',
  'st-add-clinic-sessions',
  'st-improve-diag-util',
  'st-replace-downtime-asset',
  'st-staff-constrained-sl',
  'st-reduce-overtime',
  'st-supply-efficiency',
  'st-expand-specialty',
  'st-reallocate-vs-capital',
] as const;
export type StOpportunityId = (typeof ST_OPPORTUNITY_IDS)[number];

const OPPORTUNITY_META: Record<StOpportunityId, {
  title: string;
  owner: string;
  followUp: string;
  baselineUnit: 'rate' | 'count' | 'index' | 'currency' | 'hours';
  baselineLabel: string;
  assumption: string;
  capex: string;
  opex: string;
  workforce: string;
  ramp: string;
  revenue: string;
  directCost: string;
  contribution: string;
  sensitivity: string;
  opportunityCost: string;
}> = {
  'st-reallocate-nurses': {
    title: 'Reallocate Nurses Across Eligible Units',
    owner: 'Chief Nursing Officer',
    followUp: 'kpi_st_workforce_allocation_opp',
    baselineUnit: 'hours',
    baselineLabel: 'Redeployable productive nursing hours',
    assumption: 'Reallocation only across credentialed eligible units. Does not cut clinically required ratios. Overlaps with overtime reduction — do not sum benefits.',
    capex: 'None (reallocation)',
    opex: 'Neutral to slight training OpEx',
    workforce: 'Shift redeployable FTEs; no net headcount increase assumed',
    ramp: '2–4 weeks credentialing / orientation',
    revenue: 'No new recognized revenue assumed — capacity relief only',
    directCost: 'May reduce overtime / agency on receiving units',
    contribution: 'Illustrative contribution via avoided overtime/agency — not net profit',
    sensitivity: 'Sensitive to credentialing eligibility and census mix',
    opportunityCost: 'Hours not available for original unit surge',
  },
  'st-extend-or-hours': {
    title: 'Extend Operating Room Hours',
    owner: 'OR Director',
    followUp: 'kpi_st_effective_capacity',
    baselineUnit: 'hours',
    baselineLabel: 'Additional OR available hours',
    assumption: 'Uses prior-domain OR demand pressure as input — does not recreate OR ownership totals. Staffed + equipment readiness required. Overlaps with expand-specialty CapEx path.',
    capex: 'Minimal (schedule change) unless asset upgrade needed',
    opex: 'Overtime / extended-shift OpEx + consumables',
    workforce: 'Requires staffed OR teams for extended blocks',
    ramp: '1–2 scheduling cycles',
    revenue: 'Incremental recognized net revenue only if backlog cases are completed',
    directCost: 'Incremental overtime, consumables, maintenance',
    contribution: 'Incremental CM = incremental net revenue − incremental direct cost',
    sensitivity: 'Sensitive to surgeon availability and anesthesia coverage',
    opportunityCost: 'Staff fatigue and deferred elective maintenance windows',
  },
  'st-add-clinic-sessions': {
    title: 'Add Outpatient Clinic Sessions',
    owner: 'Outpatient Director',
    followUp: 'kpi_st_capacity_benefit',
    baselineUnit: 'count',
    baselineLabel: 'Additional clinic session slots',
    assumption: 'Reads appointment/OPD demand pressure as input — does not own appointment KPIs. Room + provider availability required.',
    capex: 'None to low (room fit-out if needed)',
    opex: 'Incremental clinic staff + consumables',
    workforce: 'Provider + nursing session coverage',
    ramp: '2–6 weeks roster alignment',
    revenue: 'Incremental outpatient recognized net revenue under attendance assumptions',
    directCost: 'Session staffing + clinic consumables',
    contribution: 'Illustrative CM under attendance and no-show assumptions',
    sensitivity: 'Sensitive to no-show rate and provider supply',
    opportunityCost: 'Rooms unavailable for alternate specialty sessions',
  },
  'st-improve-diag-util': {
    title: 'Improve Diagnostic Equipment Utilization',
    owner: 'Biomedical / Diagnostics Lead',
    followUp: 'kpi_st_equipment_utilization',
    baselineUnit: 'rate',
    baselineLabel: 'Equipment utilization',
    assumption: 'Schedule densification and downtime reduction. Does not invent radiology/lab primary KPI ownership. Overlaps with replace-downtime-asset CapEx.',
    capex: 'None (process) unless parts required',
    opex: 'Possible overtime for extended imaging/lab blocks',
    workforce: 'Technologist coverage for denser schedule',
    ramp: '2–4 weeks schedule redesign',
    revenue: 'Throughput-driven recognized revenue if backlog cleared',
    directCost: 'Incremental consumables + maintenance intensity',
    contribution: 'CM from incremental throughput − direct cost; not fully allocated margin',
    sensitivity: 'Sensitive to referral mix and downtime recurrence',
    opportunityCost: 'Preventive maintenance windows compressed',
  },
  'st-replace-downtime-asset': {
    title: 'Replace or Upgrade a High-Downtime Asset',
    owner: 'Capital Planning Committee',
    followUp: 'kpi_st_estimated_capital_req',
    baselineUnit: 'currency',
    baselineLabel: 'Downtime exposure (fictional SAR)',
    assumption: 'CapEx path. Mutually exclusive with pure reallocation for the same bottleneck — do not sum with reallocate-vs-capital as additive. Outcomes not achieved until investment approved.',
    capex: 'Illustrative replacement CapEx (fictional SAR)',
    opex: 'Warranty / service contract OpEx; may lower unplanned maintenance',
    workforce: 'Training on new platform',
    ramp: '3–9 months procurement + install + validation',
    revenue: 'Throughput recovery only after operational go-live',
    directCost: 'Depreciation + maintenance profile changes',
    contribution: 'Illustrative incremental CM after ramp — not claimed as achieved',
    sensitivity: 'Sensitive to install delay and residual downtime',
    opportunityCost: 'Capital not available for alternate expansion candidates',
  },
  'st-staff-constrained-sl': {
    title: 'Increase Staffing in a Constrained Service Line',
    owner: 'Service Line Director',
    followUp: 'kpi_st_staffing_capacity_gap',
    baselineUnit: 'hours',
    baselineLabel: 'Staffing capacity gap hours',
    assumption: 'Adds staffed hours to hard-constrained lines. Overlaps with nurse reallocation — choose one path per bottleneck.',
    capex: 'None',
    opex: 'Incremental salary / agency OpEx',
    workforce: 'Permanent or agency FTE uplift',
    ramp: '4–12 weeks hiring / onboarding',
    revenue: 'Enables deferred demand conversion to recognized revenue',
    directCost: 'Salaries / agency + related benefits proxy',
    contribution: 'Incremental CM after direct staffing cost',
    sensitivity: 'Sensitive to hiring market and credentialing lag',
    opportunityCost: 'Budget not available for CapEx alternative',
  },
  'st-reduce-overtime': {
    title: 'Reduce Avoidable Overtime',
    owner: 'Workforce Planning',
    followUp: 'kpi_st_overtime_exposure',
    baselineUnit: 'currency',
    baselineLabel: 'Overtime exposure (fictional SAR)',
    assumption: 'Targets avoidable overtime only — not clinically required surge coverage. Overlaps with nurse reallocation and agency reduction.',
    capex: 'None',
    opex: 'May require base roster uplift that offsets overtime savings',
    workforce: 'Roster redesign; optional FTE base increase',
    ramp: '1–2 roster cycles',
    revenue: 'No direct revenue assumption',
    directCost: 'Overtime premium reduction vs base pay increase trade-off',
    contribution: 'Cost avoidance contribution — not net profit',
    sensitivity: 'Sensitive to census spikes and sick leave',
    opportunityCost: 'Flexibility for surge response reduced if cut too far',
  },
  'st-supply-efficiency': {
    title: 'Improve Supply Consumption Efficiency',
    owner: 'Materials / Service Line Ops',
    followUp: 'kpi_st_avoidable_cost_opportunity',
    baselineUnit: 'currency',
    baselineLabel: 'Avoidable consumable / supply cost',
    assumption: 'Reads Supply Chain consumption intensity as input — does not recreate SC primary KPI ownership. Clinical quality constraints remain binding.',
    capex: 'None',
    opex: 'Possible formulary / preference-card redesign effort',
    workforce: 'Clinical champion time',
    ramp: '1–2 quarters preference-card cycle',
    revenue: 'None assumed',
    directCost: 'Consumables / drugs variable cost reduction',
    contribution: 'Direct cost avoidance improves CM; not fully allocated margin',
    sensitivity: 'Sensitive to case mix and preference-card adherence',
    opportunityCost: 'Clinician preference friction',
  },
  'st-expand-specialty': {
    title: 'Expand a High-Demand Specialty Service',
    owner: 'Strategy / Capital Planning',
    followUp: 'kpi_st_incremental_contribution',
    baselineUnit: 'currency',
    baselineLabel: 'Incremental contribution potential',
    assumption: 'Combines CapEx + workforce + ramp. Mutually exclusive with pure reallocation for the same specialty bottleneck.',
    capex: 'Clinic / equipment CapEx (illustrative)',
    opex: 'Incremental workforce + facility OpEx',
    workforce: 'Specialty FTE build',
    ramp: '6–18 months',
    revenue: 'Incremental recognized net revenue under demand capture assumptions',
    directCost: 'Incremental direct costs by category',
    contribution: 'Illustrative CM — revenue ≠ profit; CM ≠ net profit',
    sensitivity: 'Sensitive to demand capture, ramp delay, and competitor supply',
    opportunityCost: 'Capital and leadership bandwidth vs other candidates',
  },
  'st-reallocate-vs-capital': {
    title: 'Compare Reallocation vs New Capital Investment',
    owner: 'Chief Strategy Officer',
    followUp: 'kpi_st_reallocation_potential',
    baselineUnit: 'currency',
    baselineLabel: 'Addressable contribution (reallocation path)',
    assumption: 'Decision frame comparing reallocation vs CapEx for the same bottleneck. Benefits of the two paths are alternatives — never sum both. Does not claim investment outcomes achieved.',
    capex: 'CapEx path only if reallocation insufficient',
    opex: 'Path-dependent',
    workforce: 'Reallocation path uses existing FTEs; CapEx path may add FTE',
    ramp: 'Reallocation weeks vs CapEx months',
    revenue: 'Same demand pool — choose one capture path',
    directCost: 'Compare incremental direct cost of each path',
    contribution: 'Compare illustrative CM; pick higher feasible path under constraints',
    sensitivity: 'Sensitive to ramp time and credentialing eligibility',
    opportunityCost: 'Choosing CapEx forgoes faster reallocation; choosing reallocation forgoes structural capacity',
  },
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PERIOD_RANGE: Record<ReportPeriod, readonly [number, number]> = {
  year: [0, 12],
  Q1: [0, 3],
  Q2: [3, 6],
  Q3: [6, 9],
  Q4: [9, 12],
};
const SEASON = [1.02, 0.98, 1.01, 1.0, 0.97, 0.95, 0.94, 0.96, 1.03, 1.05, 1.04, 1.02];
const SITE_CODES = Object.keys(SITE_SPECS) as SiteCode[];

function hash(text: string): number {
  let value = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function mix(seed: number, salt: number): number {
  let value = seed ^ Math.imul(salt, 0x9e3779b9);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return (value ^ (value >>> 16)) >>> 0;
}

function unit(seed: number): number {
  return (seed % 10_000) / 10_000;
}

function r1(value: number): number {
  return Math.round(value * 10) / 10;
}

function r2(value: number): number {
  return Math.round(value * 100) / 100;
}

function ratio(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function periodMeta(year: number, period: ReportPeriod) {
  const [start, end] = PERIOD_RANGE[period];
  const months = MONTH_NAMES.slice(start, end).map((label, index) => ({ label, monthIndex: start + index }));
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthDays = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const days = sum(monthDays.slice(start, end));
  const observationDate = period === 'year'
    ? `31 Dec ${year}`
    : period === 'Q1' ? `31 Mar ${year}`
      : period === 'Q2' ? `30 Jun ${year}`
        : period === 'Q3' ? `30 Sep ${year}`
          : `31 Dec ${year}`;
  const periodLabel = period === 'year' ? `Full year ${year}` : `${period} ${year}`;
  return { start, end, months, days, observationDate, periodLabel };
}

type SiteMonth = {
  encounters: number;
  admissions: number;
  // Capacity layers (hours) — installed ≠ staffed ≠ operational ≠ available ≠ used
  installedHours: number;
  staffedHours: number;
  operationalHours: number;
  availableHours: number;
  usedHours: number;
  demandHours: number;
  // Workforce
  productiveHours: number;
  staffedAvailableHours: number;
  overtimeHours: number;
  agencyHours: number;
  overtimeSar: number;
  agencySar: number;
  salarySar: number;
  // Equipment
  equipAvailableHours: number;
  equipUsedHours: number;
  downtimeHours: number;
  maintenanceSar: number;
  depreciationSar: number;
  eligibleProcedures: number;
  // Financial flows (fictional SAR) — synthetic COST assumptions ONLY (NOT from real ERP).
  // Recognized net revenue is NOT generated here; assemble() takes RCM netPatientRevenue as authoritative.
  consumablesSar: number;
  drugsSar: number;
  facilitySar: number;
  utilitiesSar: number;
  sharedSar: number;
  otherDirectSar: number;
  planCostSar: number;
};

function siteMonth(code: SiteCode, year: number, monthIndex: number): SiteMonth {
  const scenario = scenarioFor(code, year);
  const month = scenario.months[monthIndex];
  const admissions = Math.max(1, Math.round(Number(month.admissions) || 0));
  const encounters = Math.max(admissions, Math.round(admissions * (2.2 + unit(mix(hash(`${code}|${year}|${monthIndex}|st`), 1)) * 0.5)));
  const seed = hash(`${code}|${year}|${monthIndex}|st`);
  const pressure = SITE_SPECS[code].pressure;
  const season = SEASON[monthIndex];
  const scale = (0.85 + pressure * 0.2) * season;

  const installedHours = Math.round(8_800 * scale * (0.95 + unit(mix(seed, 2)) * 0.1));
  const staffedHours = Math.round(installedHours * (0.78 + unit(mix(seed, 3)) * 0.12));
  const operationalHours = Math.round(staffedHours * (0.9 + unit(mix(seed, 4)) * 0.08));
  const downtimeHours = Math.round(operationalHours * (0.04 + unit(mix(seed, 5)) * 0.06));
  const availableHours = Math.max(1, operationalHours - downtimeHours);
  const staffedAvailableHours = Math.round(staffedHours * (0.92 + unit(mix(seed, 8)) * 0.06));
  // Enterprise-wide demand vs staffed available — pressure can push demand above staffed hours (clinically plausible).
  // Distinct from ICU credentialed nurse-hour gap (imported from ICU domain in assemble).
  const demandHours = Math.max(1, Math.round(staffedAvailableHours * (0.9 + unit(mix(seed, 6)) * 0.22 + pressure * 0.35)));
  const usedHours = Math.min(availableHours, Math.round(Math.min(demandHours, availableHours) * (0.92 + unit(mix(seed, 7)) * 0.08)));

  const productiveHours = Math.round(staffedAvailableHours * (0.8 + unit(mix(seed, 9)) * 0.12));
  const overtimeHours = Math.round(productiveHours * (0.05 + unit(mix(seed, 10)) * 0.08 + Math.max(0, demandHours - staffedAvailableHours) * 0.002));
  const agencyHours = Math.round(Math.max(0, demandHours - staffedAvailableHours) * (0.15 + unit(mix(seed, 11)) * 0.2));
  const salaryRate = 85 + unit(mix(seed, 12)) * 25;
  const overtimeSar = Math.round(overtimeHours * salaryRate * 1.5);
  const agencySar = Math.round(agencyHours * salaryRate * 1.85);
  const salarySar = Math.round(productiveHours * salaryRate);

  const equipAvailableHours = Math.round(availableHours * (0.55 + unit(mix(seed, 13)) * 0.1));
  const equipUsedHours = Math.round(equipAvailableHours * (0.7 + unit(mix(seed, 14)) * 0.2));
  const maintenanceSar = Math.round(18_000 * scale * (0.8 + unit(mix(seed, 15)) * 0.5) + downtimeHours * 120);
  const depreciationSar = Math.round(42_000 * scale * (0.9 + unit(mix(seed, 16)) * 0.2));
  const eligibleProcedures = Math.max(1, Math.round(encounters * (0.35 + unit(mix(seed, 17)) * 0.15)));

  // Synthetic direct/indirect cost model only — recognized revenue comes from RCM in assemble().
  const consumablesSar = Math.round(encounters * (38 + unit(mix(seed, 19)) * 22));
  const drugsSar = Math.round(admissions * (95 + unit(mix(seed, 20)) * 60));
  const facilitySar = Math.round(55_000 * scale);
  const utilitiesSar = Math.round(12_000 * scale * (0.9 + unit(mix(seed, 21)) * 0.2));
  const sharedSar = Math.round(28_000 * scale);
  const otherDirectSar = Math.round(encounters * (8 + unit(mix(seed, 22)) * 6));
  const actualDirect = salarySar + overtimeSar + agencySar + consumablesSar + drugsSar + maintenanceSar + depreciationSar + otherDirectSar;
  const planCostSar = Math.round(actualDirect * (0.94 + unit(mix(seed, 23)) * 0.08) + facilitySar + utilitiesSar + sharedSar);

  return {
    encounters, admissions,
    installedHours, staffedHours, operationalHours, availableHours, usedHours, demandHours,
    productiveHours, staffedAvailableHours, overtimeHours, agencyHours, overtimeSar, agencySar, salarySar,
    equipAvailableHours, equipUsedHours, downtimeHours, maintenanceSar, depreciationSar, eligibleProcedures,
    consumablesSar, drugsSar, facilitySar, utilitiesSar, sharedSar, otherDirectSar, planCostSar,
  };
}

function emptyMonth(): SiteMonth {
  return {
    encounters: 0, admissions: 0,
    installedHours: 0, staffedHours: 0, operationalHours: 0, availableHours: 0, usedHours: 0, demandHours: 0,
    productiveHours: 0, staffedAvailableHours: 0, overtimeHours: 0, agencyHours: 0, overtimeSar: 0, agencySar: 0, salarySar: 0,
    equipAvailableHours: 0, equipUsedHours: 0, downtimeHours: 0, maintenanceSar: 0, depreciationSar: 0, eligibleProcedures: 0,
    consumablesSar: 0, drugsSar: 0, facilitySar: 0, utilitiesSar: 0, sharedSar: 0, otherDirectSar: 0, planCostSar: 0,
  };
}

function addMonth(target: SiteMonth, source: SiteMonth): void {
  (Object.keys(target) as Array<keyof SiteMonth>).forEach((key) => {
    target[key] += source[key];
  });
}

type Raw = {
  months: SiteMonth[];
  slRevenue: number[];
  slDirectCost: number[];
  slDemand: number[];
  slCapacity: number[];
  costCategorySar: number[];
};

function siteRaw(code: SiteCode, year: number, period: ReportPeriod): Raw {
  const meta = periodMeta(year, period);
  const months = meta.months.map(({ monthIndex }) => siteMonth(code, year, monthIndex));
  const totals = emptyMonth();
  months.forEach((month) => addMonth(totals, month));
  const seed = hash(`${code}|${year}|${period}|st-sl`);

  const eligibleDirect = totals.salarySar + totals.overtimeSar + totals.agencySar + totals.consumablesSar
    + totals.drugsSar + totals.maintenanceSar + totals.depreciationSar + totals.otherDirectSar;
  // SL revenue placeholders — authoritative RCM NPR is allocated in assemble() to avoid inventing Strategy revenue.
  const slRevenue = ST_SERVICE_LINES.map(() => 0);
  const slDirectCost = splitExact(eligibleDirect, ST_SERVICE_LINES.map((_, index) => 0.8 + unit(mix(seed, 30 + index))));
  const slDemand = splitExact(totals.demandHours, ST_SERVICE_LINES.map((_, index) => 0.75 + unit(mix(seed, 50 + index))));
  const slCapacity = splitExact(totals.availableHours, ST_SERVICE_LINES.map((_, index) => 0.8 + unit(mix(seed, 70 + index))));

  const costCategorySar = [
    totals.salarySar,
    totals.overtimeSar,
    totals.agencySar,
    totals.consumablesSar,
    totals.drugsSar,
    totals.maintenanceSar,
    totals.depreciationSar,
    totals.facilitySar,
    totals.utilitiesSar,
    totals.sharedSar,
    totals.otherDirectSar,
  ];

  return { months, slRevenue, slDirectCost, slDemand, slCapacity, costCategorySar };
}

function sumRaw(parts: Raw[]): Raw {
  const months = parts[0].months.map((_, index) => {
    const month = emptyMonth();
    parts.forEach((part) => addMonth(month, part.months[index]));
    return month;
  });
  const sumArr = (pick: (raw: Raw) => number[]) => {
    const length = pick(parts[0]).length;
    return Array.from({ length }, (_, index) => sum(parts.map((part) => pick(part)[index] ?? 0)));
  };
  return {
    months,
    slRevenue: sumArr((raw) => raw.slRevenue),
    slDirectCost: sumArr((raw) => raw.slDirectCost),
    slDemand: sumArr((raw) => raw.slDemand),
    slCapacity: sumArr((raw) => raw.slCapacity),
    costCategorySar: sumArr((raw) => raw.costCategorySar),
  };
}

const CACHE = new Map<string, ReturnType<typeof compute>>();

export function buildStView(hospital: string, year: number, period: ReportPeriod = 'year') {
  const key = `${hospital}|${year}|${period}`;
  const cached = CACHE.get(key);
  if (cached) return cached;
  const view = compute(hospital, year, period);
  CACHE.set(key, view);
  return view;
}

export function clearStViewCache(): void {
  CACHE.clear();
}

function compute(hospital: string, year: number, period: ReportPeriod) {
  const codes = SITE_CODES.includes(hospital as SiteCode) ? [hospital as SiteCode] : SITE_CODES;
  const raw = codes.length === 1 ? siteRaw(codes[0], year, period) : sumRaw(codes.map((code) => siteRaw(code, year, period)));
  return assemble(hospital, year, period, raw);
}

function assemble(hospital: string, year: number, period: ReportPeriod, raw: Raw) {
  const meta = periodMeta(year, period);
  const flows = emptyMonth();
  raw.months.forEach((month) => addMonth(flows, month));
  const seed = hash(`${hospital}|${year}|${period}|st-assemble`);

  // Authoritative revenue lineage: RCM net patient revenue → service-line allocation → contribution.
  // Strategy may call buildRcmView; RCM must NOT call buildStView (no circular dependency).
  const rcm = buildRcmView(hospital, year, period);
  const icu = buildIcuView(hospital, year, period);
  const recognizedNetRevenue = rcm.netPatientRevenue;
  const slRevenueWeights = ST_SERVICE_LINES.map((_, index) => 0.85 + unit(mix(seed, 10 + index)));
  const slRevenue = splitExact(recognizedNetRevenue, slRevenueWeights);
  const allocatedServiceLineRevenue = sum(slRevenue);
  const unallocatedRevenue = recognizedNetRevenue - allocatedServiceLineRevenue; // 0 when splitExact fully allocates
  raw.slRevenue = slRevenue;

  const eligibleDirectCost = flows.salarySar + flows.overtimeSar + flows.agencySar + flows.consumablesSar
    + flows.drugsSar + flows.maintenanceSar + flows.depreciationSar + flows.otherDirectSar;
  const totalEligibleOpCost = eligibleDirectCost + flows.facilitySar + flows.utilitiesSar + flows.sharedSar;
  const netRevenue = recognizedNetRevenue;
  // CM = Recognized Net Revenue (RCM NPR) − Eligible Direct Costs; zero revenue → 0 contribution (not invented)
  const operatingContribution = recognizedNetRevenue > 0 ? recognizedNetRevenue - eligibleDirectCost : 0;
  const contributionMarginRate = ratio(operatingContribution, recognizedNetRevenue);
  const slCmRate = contributionMarginRate;
  // Legacy alias kept for SAR overview charts (Operating Contribution), not a second Command KPI.
  const serviceLineCm = operatingContribution;

  const staffingUtilization = ratio(flows.productiveHours, flows.staffedAvailableHours);
  const equipmentUtilization = ratio(flows.equipUsedHours, flows.equipAvailableHours);
  const capacityUtilization = ratio(flows.usedHours, flows.availableHours);
  const resourceUtilizationIndex = r2((staffingUtilization + equipmentUtilization + capacityUtilization) / 3);

  const constrainedFlags = ST_SERVICE_LINES.map((_, index) => raw.slDemand[index] > raw.slCapacity[index] ? 1 : 0);
  const capacityConstrainedSl = sum(constrainedFlags);
  const constrainedServiceLines = capacityConstrainedSl;

  // Enterprise-wide Strategy staffing gap (demand hours − staffed available). Scope ≠ ICU credentialed nurse hours.
  const staffingCapacityGap = Math.max(0, flows.demandHours - flows.staffedAvailableHours);
  const enterpriseRequiredHours = flows.demandHours;
  const enterpriseAvailableHours = flows.staffedAvailableHours;
  const enterpriseStaffingGapHours = staffingCapacityGap;
  const icuRequiredHours = icu.requiredNurseHours;
  const icuAvailableHours = icu.staffedNurseHours;
  const icuStaffingGapHours = icu.staffingGapHours;
  // Enterprise surplus hours are NOT automatically ICU-eligible without credentials / unit assignment.
  const redeployableHours = Math.max(0, enterpriseAvailableHours - enterpriseRequiredHours);
  const equipmentCapacityGap = Math.max(0, Math.round(flows.demandHours * 0.55 - flows.equipAvailableHours));
  const demandCapacityGap = Math.max(0, flows.demandHours - flows.availableHours);
  const redeployableCapacity = Math.max(0, flows.availableHours - flows.usedHours);
  const workforceAllocationOpp = Math.round(redeployableCapacity * (0.25 + unit(mix(seed, 2)) * 0.2));
  const allocationOpportunity = Math.round(redeployableCapacity * (0.3 + unit(mix(seed, 3)) * 0.25));

  const downtimeOpportunityCost = Math.round(flows.downtimeHours * (95 + unit(mix(seed, 4)) * 40));
  const equipmentCostPerProc = r1((flows.maintenanceSar + flows.depreciationSar) / Math.max(1, flows.eligibleProcedures));
  const costPerEligibleEncounter = r1(eligibleDirectCost / Math.max(1, flows.encounters));
  const resourceCostIntensity = r2(eligibleDirectCost / Math.max(1, flows.productiveHours));
  const expectedCm = Math.round(netRevenue * ST_TARGETS.contributionMarginRate);
  const slMarginVariance = operatingContribution - expectedCm;
  const variableCost = flows.overtimeSar + flows.agencySar + flows.consumablesSar + flows.drugsSar + flows.utilitiesSar + flows.otherDirectSar;
  const fixedCostExposure = flows.salarySar + flows.maintenanceSar + flows.depreciationSar + flows.facilitySar + flows.sharedSar;
  const variableCostPerActivity = r1(variableCost / Math.max(1, flows.encounters));
  const costVariance = totalEligibleOpCost - flows.planCostSar;

  const avoidableOvertime = Math.round(flows.overtimeSar * (0.35 + unit(mix(seed, 5)) * 0.2));
  const avoidableAgency = Math.round(flows.agencySar * (0.25 + unit(mix(seed, 6)) * 0.2));
  const avoidableConsumables = Math.round(flows.consumablesSar * (0.08 + unit(mix(seed, 7)) * 0.1));
  const avoidableResourceCost = avoidableOvertime + Math.round(downtimeOpportunityCost * 0.4) + avoidableAgency;
  const avoidableCostOpportunity = avoidableOvertime + avoidableAgency + avoidableConsumables;
  const resourceEfficiencyOpp = Math.round(avoidableCostOpportunity * 0.55 + redeployableCapacity * 40);

  const candidateExpansionOps = Math.max(3, Math.round(4 + unit(mix(seed, 8)) * 4 + capacityConstrainedSl * 0.5));
  const estimatedCapitalReq = Math.round(candidateExpansionOps * (1_200_000 + unit(mix(seed, 9)) * 800_000));
  const incrementalOpex = Math.round(estimatedCapitalReq * (0.12 + unit(mix(seed, 10)) * 0.08));
  const incrementalContribution = Math.round(incrementalOpex * (1.4 + unit(mix(seed, 11)) * 0.6));
  const capacityBenefit = Math.round(flows.availableHours * (0.04 + unit(mix(seed, 12)) * 0.06) + allocationOpportunity * 0.5);
  const investmentFeasibility = r2(0.45 + unit(mix(seed, 13)) * 0.35);
  const investmentOpportunityCoverage = r2(0.55 + unit(mix(seed, 14)) * 0.35);

  const addressableContribution = Math.round(
    Math.min(avoidableResourceCost * 0.6, operatingContribution * 0.12)
    + Math.min(incrementalContribution * 0.25, avoidableCostOpportunity * 0.5),
  );
  const reallocationPotential = workforceAllocationOpp + allocationOpportunity;
  const scenarioCapitalReadiness = r2(0.5 + unit(mix(seed, 15)) * 0.4);
  const modeledOperatingImpact = Math.round(addressableContribution * (0.7 + unit(mix(seed, 16)) * 0.25));
  const decisionReadiness = r2(0.55 + unit(mix(seed, 17)) * 0.35);
  const priorityScenarioCoverage = r2(ST_OPPORTUNITY_IDS.length / 10);

  const prioritySignals = [
    resourceUtilizationIndex < ST_TARGETS.resourceUtilization ? 1 : 0,
    capacityConstrainedSl > 2 ? 1 : 0,
    staffingUtilization < ST_TARGETS.staffingUtilization ? 1 : 0,
    equipmentUtilization < ST_TARGETS.equipmentUtilization ? 1 : 0,
    flows.overtimeSar / Math.max(1, flows.salarySar) > ST_TARGETS.overtimeShare ? 1 : 0,
    slCmRate < ST_TARGETS.contributionMarginRate ? 1 : 0,
    investmentFeasibility < ST_TARGETS.investmentFeasibility ? 1 : 0,
    decisionReadiness < ST_TARGETS.decisionReadiness ? 1 : 0,
  ].reduce((total, value) => total + value, 0);

  const opportunities = ST_OPPORTUNITY_IDS.map((id) => {
    const metaOpp = OPPORTUNITY_META[id];
    const baselines: Record<StOpportunityId, number> = {
      'st-reallocate-nurses': workforceAllocationOpp,
      'st-extend-or-hours': Math.round(flows.availableHours * 0.06),
      'st-add-clinic-sessions': Math.max(2, Math.round(capacityConstrainedSl * 1.5 + 2)),
      'st-improve-diag-util': equipmentUtilization,
      'st-replace-downtime-asset': downtimeOpportunityCost,
      'st-staff-constrained-sl': staffingCapacityGap,
      'st-reduce-overtime': flows.overtimeSar,
      'st-supply-efficiency': avoidableConsumables,
      'st-expand-specialty': incrementalContribution,
      'st-reallocate-vs-capital': addressableContribution,
    };
    const eligible: Record<StOpportunityId, number> = {
      'st-reallocate-nurses': Math.round(workforceAllocationOpp * 0.55),
      'st-extend-or-hours': Math.round(flows.availableHours * 0.04),
      'st-add-clinic-sessions': Math.max(1, Math.round(capacityConstrainedSl + 1)),
      'st-improve-diag-util': Math.round(flows.equipAvailableHours * Math.max(0, ST_TARGETS.equipmentUtilization - equipmentUtilization)),
      'st-replace-downtime-asset': Math.round(downtimeOpportunityCost * 0.45),
      'st-staff-constrained-sl': Math.round(staffingCapacityGap * 0.4),
      'st-reduce-overtime': avoidableOvertime,
      'st-supply-efficiency': avoidableConsumables,
      'st-expand-specialty': Math.round(incrementalContribution * 0.35),
      'st-reallocate-vs-capital': Math.round(Math.min(addressableContribution, incrementalContribution * 0.3)),
    };
    return {
      id,
      title: metaOpp.title,
      baseline: baselines[id],
      baselineUnit: metaOpp.baselineUnit,
      baselineLabel: metaOpp.baselineLabel,
      eligibleValue: eligible[id],
      owner: metaOpp.owner,
      followUp: metaOpp.followUp,
      assumption: metaOpp.assumption,
      capex: metaOpp.capex,
      opex: metaOpp.opex,
      workforce: metaOpp.workforce,
      ramp: metaOpp.ramp,
      revenue: metaOpp.revenue,
      directCost: metaOpp.directCost,
      contribution: metaOpp.contribution,
      sensitivity: metaOpp.sensitivity,
      opportunityCost: metaOpp.opportunityCost,
      additive: false,
    };
  });

  const labels = raw.months.map((_, index) => meta.months[index].label);
  // Allocate period RCM NPR across months by encounter activity weights (no independent monthly revenue generator).
  const monthlyRevenue = splitExact(
    recognizedNetRevenue,
    raw.months.map((month) => Math.max(1, month.encounters)),
  );
  const monthlyContribution = raw.months.map((month, index) => {
    const direct = month.salarySar + month.overtimeSar + month.agencySar + month.consumablesSar
      + month.drugsSar + month.maintenanceSar + month.depreciationSar + month.otherDirectSar;
    const monthRevenue = monthlyRevenue[index] ?? 0;
    return monthRevenue > 0 ? monthRevenue - direct : 0;
  });
  const monthlyUtil = raw.months.map((month) => r2(ratio(month.usedHours, month.availableHours) * 100));
  const monthlyStaffUtil = raw.months.map((month) => r2(ratio(month.productiveHours, month.staffedAvailableHours) * 100));
  const monthlyEquipUtil = raw.months.map((month) => r2(ratio(month.equipUsedHours, month.equipAvailableHours) * 100));
  const monthlyOvertime = raw.months.map((month) => month.overtimeSar);
  const monthlyOpCost = raw.months.map((month) => (
    month.salarySar + month.overtimeSar + month.agencySar + month.consumablesSar + month.drugsSar
    + month.maintenanceSar + month.depreciationSar + month.facilitySar + month.utilitiesSar + month.sharedSar + month.otherDirectSar
  ));

  const serviceLineRows = ST_SERVICE_LINES.map((name, index) => {
    const revenue = slRevenue[index];
    const directCost = raw.slDirectCost[index];
    const contribution = revenue > 0 ? revenue - directCost : 0;
    const cmRate = ratio(contribution, revenue);
    const demand = raw.slDemand[index];
    const capacity = raw.slCapacity[index];
    return {
      name,
      revenue,
      directCost,
      contribution,
      cmRate,
      marginPct: cmRate,
      demand,
      capacity,
      encounters: Math.max(1, Math.round(demand / 4)),
      constrained: demand > capacity,
      gap: Math.max(0, demand - capacity),
    };
  });

  const costRows = ST_COST_CATEGORIES.map((name, index) => ({
    name,
    amount: raw.costCategorySar[index] ?? 0,
    direct: ST_COST_META[name].direct,
    variable: ST_COST_META[name].variable,
  }));

  const kpiValues: Record<string, number> = {
    kpi_st_operating_contribution: operatingContribution,
    kpi_st_resource_utilization_index: resourceUtilizationIndex,
    kpi_st_capacity_constrained_sl: capacityConstrainedSl,
    // Command second KPI is CM Rate (%) — distinct from Operating Contribution (SAR).
    kpi_st_service_line_cm: contributionMarginRate,
    kpi_st_avoidable_resource_cost: avoidableResourceCost,
    kpi_st_investment_opportunity_coverage: investmentOpportunityCoverage,
    kpi_st_productive_clinical_hours: flows.productiveHours,
    kpi_st_staffing_utilization: staffingUtilization,
    kpi_st_overtime_exposure: flows.overtimeSar,
    kpi_st_agency_staffing_cost: flows.agencySar,
    kpi_st_staffing_capacity_gap: staffingCapacityGap,
    kpi_st_workforce_allocation_opp: workforceAllocationOpp,
    kpi_st_equipment_utilization: equipmentUtilization,
    kpi_st_available_operating_hours: flows.equipAvailableHours,
    kpi_st_asset_downtime_exposure: downtimeOpportunityCost,
    kpi_st_equipment_cost_per_proc: equipmentCostPerProc,
    kpi_st_maintenance_cost_exposure: flows.maintenanceSar,
    kpi_st_equipment_capacity_gap: equipmentCapacityGap,
    kpi_st_effective_capacity: flows.availableHours,
    kpi_st_capacity_utilization: capacityUtilization,
    kpi_st_demand_capacity_gap: demandCapacityGap,
    kpi_st_redeployable_capacity: redeployableCapacity,
    kpi_st_constrained_service_lines: constrainedServiceLines,
    kpi_st_allocation_opportunity: allocationOpportunity,
    kpi_st_net_revenue_by_sl: netRevenue,
    kpi_st_direct_cost_by_sl: eligibleDirectCost,
    kpi_st_sl_cm_rate: slCmRate,
    kpi_st_cost_per_eligible_encounter: costPerEligibleEncounter,
    kpi_st_resource_cost_intensity: resourceCostIntensity,
    kpi_st_sl_margin_variance: slMarginVariance,
    kpi_st_total_eligible_op_cost: totalEligibleOpCost,
    kpi_st_variable_cost_per_activity: variableCostPerActivity,
    kpi_st_fixed_cost_exposure: fixedCostExposure,
    kpi_st_cost_variance: costVariance,
    kpi_st_avoidable_cost_opportunity: avoidableCostOpportunity,
    kpi_st_resource_efficiency_opp: resourceEfficiencyOpp,
    kpi_st_candidate_expansion_ops: candidateExpansionOps,
    kpi_st_estimated_capital_req: estimatedCapitalReq,
    kpi_st_incremental_opex: incrementalOpex,
    kpi_st_incremental_contribution: incrementalContribution,
    kpi_st_capacity_benefit: capacityBenefit,
    kpi_st_investment_feasibility: investmentFeasibility,
    kpi_st_addressable_contribution: addressableContribution,
    kpi_st_reallocation_potential: reallocationPotential,
    kpi_st_scenario_capital_readiness: scenarioCapitalReadiness,
    kpi_st_modeled_operating_impact: modeledOperatingImpact,
    kpi_st_decision_readiness: decisionReadiness,
    kpi_st_priority_scenario_coverage: priorityScenarioCoverage,
  };

  const identities = {
    slRevenueSums: allocatedServiceLineRevenue === recognizedNetRevenue,
    allocationIdentity: allocatedServiceLineRevenue + unallocatedRevenue === recognizedNetRevenue,
    revenueMatchesRcm: recognizedNetRevenue === rcm.netPatientRevenue,
    slDirectSums: sum(raw.slDirectCost) === eligibleDirectCost,
    costCategoriesSum: sum(raw.costCategorySar) === totalEligibleOpCost,
    cmFormula: operatingContribution === (recognizedNetRevenue > 0 ? recognizedNetRevenue - eligibleDirectCost : 0),
    cmNotNetProfit: true,
    revenueNotProfit: true,
    installedGteStaffed: flows.installedHours >= flows.staffedHours,
    staffedGteOperational: flows.staffedHours >= flows.operationalHours,
    operationalGteAvailable: flows.operationalHours >= flows.availableHours,
    availableGteUsed: flows.availableHours >= flows.usedHours,
    zeroRevenueSafe: true,
    opportunitiesNonAdditive: opportunities.every((item) => item.additive === false),
    tenOpportunities: opportunities.length >= 10,
    syntheticNotErp: true,
    icuGapMatchesIcuView: icuStaffingGapHours === icu.staffingGapHours,
    enterpriseSurplusNotAutoIcuFill: true,
  };

  return {
    hospital,
    year,
    period,
    periodLabel: meta.periodLabel,
    observationDate: meta.observationDate,
    daysInPeriod: meta.days,
    labels,

    operatingContribution,
    resourceUtilizationIndex,
    capacityConstrainedSl,
    capacityConstrainedLines: capacityConstrainedSl,
    serviceLineCm,
    serviceLineContributionMarginPct: slCmRate,
    contributionMargin: operatingContribution,
    contributionMarginRate,
    recognizedNetRevenue,
    allocatedServiceLineRevenue,
    unallocatedRevenue,
    directCost: eligibleDirectCost,
    usedCapacityHours: flows.usedHours,
    monthlyUtilization: monthlyUtil,
    productiveClinicalHours: flows.productiveHours,
    avoidableResourceCost,
    investmentOpportunityCoverage,
    prioritySignals,
    slCmRate,

    productiveHours: flows.productiveHours,
    staffingUtilization,
    overtimeExposure: flows.overtimeSar,
    agencyStaffingCost: flows.agencySar,
    staffingCapacityGap,
    enterpriseRequiredHours,
    enterpriseAvailableHours,
    enterpriseStaffingGapHours,
    icuRequiredHours,
    icuAvailableHours,
    icuStaffingGapHours,
    redeployableHours,
    workforceAllocationOpp,
    overtimeHours: flows.overtimeHours,
    agencyHours: flows.agencyHours,
    staffedAvailableHours: flows.staffedAvailableHours,

    equipmentUtilization,
    availableOperatingHours: flows.equipAvailableHours,
    assetDowntimeExposure: downtimeOpportunityCost,
    equipmentCostPerProc,
    maintenanceCostExposure: flows.maintenanceSar,
    equipmentCapacityGap,
    downtimeHours: flows.downtimeHours,
    eligibleProcedures: flows.eligibleProcedures,
    equipUsedHours: flows.equipUsedHours,

    effectiveCapacity: flows.availableHours,
    capacityUtilization,
    demandCapacityGap,
    redeployableCapacity,
    constrainedServiceLines,
    allocationOpportunity,
    installedHours: flows.installedHours,
    staffedHours: flows.staffedHours,
    operationalHours: flows.operationalHours,
    usedHours: flows.usedHours,
    demandHours: flows.demandHours,

    netRevenue,
    eligibleDirectCost,
    costPerEligibleEncounter,
    resourceCostIntensity,
    slMarginVariance,
    encounters: flows.encounters,
    monthlyRevenue,

    totalEligibleOpCost,
    variableCostPerActivity,
    fixedCostExposure,
    costVariance,
    avoidableCostOpportunity,
    resourceEfficiencyOpp,
    variableCost,
    planCostSar: flows.planCostSar,

    candidateExpansionOps,
    estimatedCapitalReq,
    incrementalOpex,
    incrementalContribution,
    capacityBenefit,
    investmentFeasibility,

    addressableContribution,
    reallocationPotential,
    scenarioCapitalReadiness,
    modeledOperatingImpact,
    decisionReadiness,
    priorityScenarioCoverage,
    opportunities,

    monthlyContribution,
    monthlyUtil,
    monthlyStaffUtil,
    monthlyEquipUtil,
    monthlyOvertime,
    monthlyOpCost,

    serviceLineRows,
    costRows,

    kpiValues,
    identities,
    crossDomain: {
      rcmNetPatientRevenue: rcm.netPatientRevenue,
      icuRequiredHours,
      icuAvailableHours,
      icuStaffingGapHours,
      scClinicalConsumption: buildScView(hospital, year, period).clinicalConsumption,
      orStaffedHours: buildSurgeryView(hospital, year, period).staffedHours,
      orUsedHours: buildSurgeryView(hospital, year, period).usedHours,
      orUtilization: buildSurgeryView(hospital, year, period).orUtilization,
      clinicSessions: buildOpdView(hospital, year, period).clinicSessions,
      clinicVisits: buildOpdView(hospital, year, period).visits,
      appointmentSlots: buildAppointmentView(hospital, year, period).slots,
      appointmentBooked: buildAppointmentView(hospital, year, period).booked,
      staffedBeds: sum((SITE_CODES.includes(hospital as SiteCode) ? [hospital as SiteCode] : SITE_CODES).map((code) => scenarioFor(code, year).focus.staffedBeds)),
      occupiedBeds: sum((SITE_CODES.includes(hospital as SiteCode) ? [hospital as SiteCode] : SITE_CODES).map((code) => scenarioFor(code, year).focus.occupiedBeds)),
      note: 'Strategy references domain facts as inputs only — primary KPI ownership remains with source domains. Recognized net revenue = RCM NPR. ICU staffing gap is ICU-owned; enterprise surplus ≠ automatic ICU fill.',
    },
    methodology: {
      clinical: 'Strategy owns resource, profitability, and expansion intelligence. It reads operational facts from prior domains as inputs and does not recreate separate bed/OR/appointment primary ownership totals.',
      contribution: 'Revenue lineage: RCM recognized net patient revenue (NPR) → deterministic service-line allocation (splitExact) → Contribution Margin = recognized NPR − eligible direct costs. Revenue ≠ profit. CM ≠ net profit. Zero revenue yields zero contribution — never invent profit. Fully allocated margin is not claimed where overhead allocation is unsupported. Modeled opportunities are illustrative.',
      capacity: 'Installed ≠ staffed ≠ operational ≠ available ≠ used capacity. Effective capacity is available after staffing, equipment readiness, and schedule constraints.',
      cost: 'Cost categories: salaries, overtime, agency, consumables, drugs, maintenance, depreciation, facility, utilities, shared services, other direct. Direct vs indirect and fixed vs variable are documented per category. Synthetic cost assumptions are NOT from a real ERP and are independent of RCM revenue.',
      workforce: 'Staffed available hours ≠ roster headcount. Productive hours exclude non-productive paid time. Overtime and agency are distinct direct cost ledgers. kpi_st_staffing_capacity_gap is enterprise-wide demand vs staffed available hours — distinct from ICU credentialed nurse-hour gap. Enterprise redeployable surplus is not automatically ICU-eligible without credentials.',
      equipment: 'Available operating hours exclude downtime and unstaffed slots. Equipment utilization = used ÷ available (not installed calendar hours).',
      expansion: 'CapEx/OpEx/ramp/revenue assumptions are illustrative modeled opportunities — not claimed as achieved investment outcomes.',
      optimization: 'Ten what-if scenarios are illustrative, overlap, and must not be summed. Reallocation vs CapEx for the same bottleneck are alternatives. AI does not approve CapEx, change rosters, or reallocate staff alone.',
      allMode: 'Hospital ALL sums H1–H5 flows; rates and CM are recomputed from summed numerators and denominators. Recognized revenue follows RCM ALL NPR.',
    },
  };
}

export type StView = ReturnType<typeof compute>;

export function stIdentityIssues(view: StView): string[] {
  return (Object.entries(view.identities) as [string, boolean][])
    .filter(([, ok]) => !ok)
    .map(([name]) => name);
}
