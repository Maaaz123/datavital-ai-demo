import { SITE_SPECS, scenarioFor, type SiteCode } from '@/showcase/facts';
import { splitExact } from './ipdView';
import { type ReportPeriod } from './period';

/** Payers used for revenue-cycle comparison. Index 3 is the patient-responsibility payer. */
export const RCM_PAYERS = [
  'National Health Fund',
  'Cooperative Care',
  'Employer Alliance',
  'Self-Pay / Patient',
  'Regional Mutual',
] as const;
export type RcmPayer = (typeof RCM_PAYERS)[number];
const SELF_PAY_INDEX = 3;

export const RCM_DENIAL_REASONS = [
  'Eligibility issues',
  'Missing authorization',
  'Coding/documentation',
  'Duplicate claim',
  'Filing deadline',
  'Contractual dispute',
  'Medical necessity',
  'Coverage exclusion',
  'Incorrect patient/payer info',
] as const;
export type RcmDenialReason = (typeof RCM_DENIAL_REASONS)[number];
/** Index of the reason whose value defines authorization-related denial exposure. */
const AUTH_REASON_INDEX = 1;

/** Service lines used to attribute missed charges (supporting finance view, not clinical KPI ownership). */
export const RCM_SERVICE_LINES = [
  'Emergency care',
  'Ambulatory care',
  'Medical inpatient',
  'Surgical inpatient',
  'Maternity & pediatrics',
  'Critical care',
  'Diagnostics & pharmacy',
] as const;
export type RcmServiceLine = (typeof RCM_SERVICE_LINES)[number];

/** Charge-capture departments — clinical supporting names only. */
export const RCM_DEPARTMENTS = [
  'Emergency',
  'Outpatient clinics',
  'Inpatient wards',
  'Surgery & theatres',
  'Radiology',
  'Laboratory',
  'Pharmacy',
  'Intensive care',
] as const;
export type RcmDepartment = (typeof RCM_DEPARTMENTS)[number];

export const RCM_AGING_BUCKETS = ['0–30', '31–60', '61–90', '91–120', '>120'] as const;
export const AGING_CLOCK = 'claim submission date';

export const RCM_CURRENCY = 'SAR';

/** Illustrative operating targets used by priority signals only. */
export const RCM_TARGETS = {
  netCollectionRate: 0.95,
  grossDenialRate: 0.08,
  daysInAr: 45,
  chargeCaptureRate: 0.97,
  firstPassAcceptance: 0.94,
  eligibilityVerificationRate: 0.96,
  codingCompletionRate: 0.95,
  billingLagDays: 4,
} as const;

const PAYER_NET_SHARES = [0.38, 0.24, 0.2, 0.07, 0.11];
const PAYER_COLLECT_FACTOR = [1.02, 1, 0.99, 0.78, 0.96];
const PAYER_CLAIM_FACTOR = [1, 1, 1, 0.15, 1];
const PAYER_DENIAL_FACTOR = [0.85, 1.2, 1, 0.35, 1.35];
const PAYER_AUTH_FACTOR = [1.1, 1, 0.9, 0.02, 1];
const PAYER_AUTH_APPROVAL_FACTOR = [1.03, 0.98, 1, 1, 0.94];
const INSURER_AR_FACTOR = [0.9, 1.1, 1, 1.25];

const REASON_COUNT_SHARES = [0.15, 0.14, 0.15, 0.07, 0.08, 0.09, 0.12, 0.06, 0.14];
const REASON_VALUE_FACTOR = [0.85, 1.2, 1, 0.6, 0.7, 1.25, 1.4, 1.1, 0.8];
/** Reasons that process fixes can plausibly prevent (used for denials-down what-if). */
const PREVENTABLE_REASONS = [0, 1, 2, 3, 4, 8];

const DEPT_CHARGE_SHARES = [0.17, 0.22, 0.15, 0.12, 0.1, 0.1, 0.08, 0.06];
const DEPT_LEAK_FACTOR = [1.3, 0.9, 1.1, 0.8, 0.7, 0.6, 1.2, 1.0];
const SERVICE_LINE_SHARES = [0.18, 0.22, 0.16, 0.14, 0.1, 0.08, 0.12];
const SERVICE_LINE_LEAK_FACTOR = [1.25, 0.9, 1, 0.85, 0.8, 1.1, 1.15];

const SEASON_WEIGHTS = [0.97, 0.94, 1.01, 1, 1.04, 0.99, 0.93, 0.96, 1.05, 1.07, 1.03, 1.01];
const SEASON_SUM = SEASON_WEIGHTS.reduce((total, value) => total + value, 0);
const SEASON = SEASON_WEIGHTS.map((value) => (value / SEASON_SUM) * 12);

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PERIOD_RANGE: Record<ReportPeriod, readonly [number, number]> = {
  year: [0, 12],
  Q1: [0, 3],
  Q2: [3, 6],
  Q3: [6, 9],
  Q4: [9, 12],
};

const SITE_CODES = Object.keys(SITE_SPECS) as SiteCode[];

/** What-if baselines — ids match assistant / what-if intents. Scenarios overlap and are not additive. */
export const RCM_OPPORTUNITY_IDS = [
  'rcm-denials-down',
  'rcm-first-pass-up',
  'rcm-ar-accelerate',
  'rcm-auth-up',
  'rcm-capture-up',
  'rcm-underpay-recover',
  'rcm-writeoff-down',
  'rcm-workflow-up',
] as const;
export type RcmOpportunityId = (typeof RCM_OPPORTUNITY_IDS)[number];

const OPPORTUNITY_META: Record<RcmOpportunityId, {
  title: string;
  owner: string;
  followUp: string;
  baselineUnit: 'rate' | 'days' | 'SAR';
  baselineLabel: string;
  assumption: string;
}> = {
  'rcm-denials-down': {
    title: 'Reduce preventable denials and recover appealable value',
    owner: 'Denials Management',
    followUp: 'kpi_rcm_gross_denial_rate',
    baselineUnit: 'rate',
    baselineLabel: 'Gross denial rate (claim count)',
    assumption: '62% of recoverable denial value is realistically recoverable under appeal and resubmission rules.',
  },
  'rcm-first-pass-up': {
    title: 'Lift first-pass claim acceptance',
    owner: 'Claims Operations',
    followUp: 'kpi_rcm_first_pass_acceptance',
    baselineUnit: 'rate',
    baselineLabel: 'First-pass acceptance rate',
    assumption: 'Rejected claims lose about 40% of claim value in timing; value is timing acceleration, not new revenue.',
  },
  'rcm-ar-accelerate': {
    title: 'Accelerate aged AR collection',
    owner: 'Collections & Patient Financial Services',
    followUp: 'kpi_rcm_days_in_ar',
    baselineUnit: 'days',
    baselineLabel: 'Days in AR',
    assumption: '30% of AR over 90 days and 8% of 61–90 day AR is collected earlier; this is a timing shift.',
  },
  'rcm-auth-up': {
    title: 'Improve pre-authorization approval and turnaround',
    owner: 'Pre-Authorization Desk',
    followUp: 'kpi_rcm_preauth_approval_rate',
    baselineUnit: 'rate',
    baselineLabel: 'Pre-authorization approval rate',
    assumption: '45% of authorization-related denial exposure is preventable; overlaps with the denials scenario.',
  },
  'rcm-capture-up': {
    title: 'Close charge-capture gaps',
    owner: 'Charge Capture & Health Information',
    followUp: 'kpi_rcm_charge_capture_rate',
    baselineUnit: 'rate',
    baselineLabel: 'Charge capture rate',
    assumption: '55% of missed charge exposure is capturable through documentation and charge-router fixes.',
  },
  'rcm-underpay-recover': {
    title: 'Recover contract underpayments',
    owner: 'Payer Contracting',
    followUp: 'kpi_rcm_underpayment_value',
    baselineUnit: 'SAR',
    baselineLabel: 'Underpayment value',
    assumption: '50% of contract variance is recoverable after payer dispute cycles.',
  },
  'rcm-writeoff-down': {
    title: 'Prevent avoidable write-offs',
    owner: 'Revenue Integrity',
    followUp: 'kpi_rcm_avoidable_writeoffs',
    baselineUnit: 'SAR',
    baselineLabel: 'Avoidable write-offs',
    assumption: '50% of preventable write-offs are avoidable with earlier escalation; bad debt is excluded.',
  },
  'rcm-workflow-up': {
    title: 'Streamline coding and billing workflow',
    owner: 'Billing & Coding Operations',
    followUp: 'kpi_rcm_coding_completion_rate',
    baselineUnit: 'rate',
    baselineLabel: 'Coding completion rate',
    assumption: '20% of unbilled service value is released earlier through coding and billing exception clearance.',
  },
};

const SCALAR_KEYS = [
  'grossCharges', 'contractualAllowances', 'openingAR', 'newReceivables', 'cashApplied', 'cashReceived',
  'approvedAdjustments', 'writeOffs', 'corrections', 'closingAR', 'patientAR', 'unappliedStockYtd',
  'openingUnbilledValue', 'unbilledValue', 'unbilledEncounters', 'encounters',
  'uniqueClaims', 'submissionAttempts', 'firstPassAccepted', 'clearinghouseRejects', 'adjudicatedClaims',
  'deniedClaims', 'adjudicatedAmount', 'deniedAmount', 'appealDecided', 'appealWon', 'recoverableDenialValue',
  'payerDelayDaysSum',
  'eligibilityRequired', 'eligibilityVerified', 'coverageExceptions',
  'authRequested', 'authOpeningPending', 'authApproved', 'authRejected', 'authPending', 'authTurnaroundTenthsSum',
  'chargeableServices', 'capturedCharges', 'missedCharges', 'codingReady', 'codingComplete',
  'invoicesCreated', 'billingExceptions', 'chargeLagTenthsSum',
  'avoidableWriteoffs', 'underpayments', 'potentialLeakage', 'recoveryOpportunities',
] as const;
type ScalarKey = (typeof SCALAR_KEYS)[number];

const ARRAY_KEYS = [
  'arAging', 'payerNet', 'payerCash', 'payerAR', 'payerAdjudicated', 'payerDenied', 'payerAuthDecided',
  'payerAuthApproved', 'reasonCount', 'reasonAmount', 'deptChargeable', 'deptMissedServices', 'deptMissedValue',
  'slMissedServices', 'slMissedValue', 'opp',
  'mRevenue', 'mCollections', 'mDenials', 'mClaims', 'mCashApplied', 'mCashReceived',
] as const;
type ArrayKey = (typeof ARRAY_KEYS)[number];

type Raw = {
  s: Record<ScalarKey, number>;
  a: Record<ArrayKey, number[]>;
};

type MonthRow = {
  days: number;
  gross: number;
  allowances: number;
  net: number;
  encounters: number;
  openingAR: number;
  newReceivables: number;
  cashApplied: number;
  cashReceived: number;
  approvedAdjustments: number;
  writeOffs: number;
  corrections: number;
  closingAR: number;
  unappliedYtd: number;
  openingWip: number;
  closingWip: number;
  unbilledEncounters: number;
  uniqueClaims: number;
  submissionAttempts: number;
  firstPassAccepted: number;
  clearinghouseRejects: number;
  adjudicatedClaims: number;
  deniedClaims: number;
  adjudicatedAmount: number;
  deniedAmount: number;
  appealDecided: number;
  appealWon: number;
  recoverableDenialValue: number;
  payerDelayDaysSum: number;
  eligibilityRequired: number;
  eligibilityVerified: number;
  coverageExceptions: number;
  authRequested: number;
  openingPending: number;
  closingPending: number;
  authApproved: number;
  authRejected: number;
  authTurnaroundTenthsSum: number;
  chargeableServices: number;
  capturedCharges: number;
  missedCharges: number;
  codingReady: number;
  codingComplete: number;
  invoicesCreated: number;
  billingExceptions: number;
  chargeLagTenthsSum: number;
  avoidableWriteoffs: number;
  underpayments: number;
  potentialLeakage: number;
  recoveryOpportunities: number;
};

function unit(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
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

function ratio(numerator: number, denominator: number): number {
  return denominator > 0 ? r3(numerator / denominator) : 0;
}

function fill<K extends string, V>(keys: readonly K[], make: () => V): Record<K, V> {
  const out = {} as Record<K, V>;
  for (const key of keys) out[key] = make();
  return out;
}

function weighted(shares: number[], factors: number[]): number[] {
  return shares.map((share, index) => share * (factors[index] ?? 1));
}

function tilt(code: SiteCode, year: number): number {
  const fact = scenarioFor(code, year).focus;
  const occ = fact.staffedBeds ? fact.occupiedBeds / fact.staffedBeds : 0.8;
  return Math.min(0.16, Math.max(0, occ - 0.74));
}

function yearFactor(year: number): number {
  return Math.max(0.85, 1 + (year - 2025) * 0.035);
}

/** Annual net patient revenue anchor per site: beds × pressure × year tilt, tens of millions SAR. */
function annualNetAnchor(code: SiteCode, year: number): number {
  const spec = SITE_SPECS[code];
  return spec.beds * 112000 * (0.92 + spec.pressure * 0.18) * yearFactor(year) * (1 + tilt(code, year) * 0.4);
}

/** Full-year monthly ledger for one site. Periods slice this ledger, so quarters tie to the year. */
function siteMonths(code: SiteCode, year: number): MonthRow[] {
  const spec = SITE_SPECS[code];
  const pressure = spec.pressure;
  const seed = spec.beds * 13 + year * 29;
  const annual = annualNetAnchor(code, year);
  const monthlyBase = annual / 12;

  const lagFor = (m: number) => r1(3.4 + pressure * 2.2 + (unit(seed + m * 4.7) - 0.5) * 0.6);
  const wipFor = (net: number, m: number) => Math.round((net * lagFor(m)) / 30 * 0.8);
  const pendRate = (m: number) => 0.09 + pressure * 0.05 + (unit(seed + m * 6.1) - 0.5) * 0.02;
  const encounterValue = 1180 - pressure * 80;

  let openingAR = Math.round(monthlyBase * 1.62);
  let prevWip = wipFor(monthlyBase, -1);
  let prevPending = Math.round(Math.round(monthlyBase / encounterValue * 0.14) * pendRate(-1));
  let unappliedYtd = 0;
  const rows: MonthRow[] = [];

  for (let m = 0; m < 12; m += 1) {
    const days = new Date(year, m + 1, 0).getDate();
    const jitter = 1 + (unit(seed + m * 3.1) - 0.5) * 0.04;
    const net = Math.round(monthlyBase * SEASON[m] * jitter);
    const allowRate = 0.34 + pressure * 0.04 + (unit(seed + m * 5.3) - 0.5) * 0.02;
    const gross = Math.round(net / (1 - allowRate));
    const allowances = gross - net;
    const encounters = Math.round(net / encounterValue);

    // Unbilled work-in-progress stock: receivables only enter AR once billed.
    const closingWip = wipFor(net, m);
    const newReceivables = net - (closingWip - prevWip);
    const unbilledEncounters = Math.round(closingWip / encounterValue);

    // AR roll-forward: opening + new − cash applied − approved adjustments − write-offs ± corrections.
    const cer = 0.372 - pressure * 0.045 + (unit(seed + m * 7.9) - 0.5) * 0.03;
    const cashApplied = Math.round((openingAR + newReceivables) * cer);
    const approvedAdjustments = Math.round(newReceivables * (0.02 + unit(seed + m * 8.3) * 0.006));
    const writeOffs = Math.round(newReceivables * (0.01 + pressure * 0.01 + unit(seed + m * 9.1) * 0.003));
    const corrections = Math.round((unit(seed + m * 10.7) - 0.5) * 0.006 * newReceivables);
    const closingAR = openingAR + newReceivables - cashApplied - approvedAdjustments - writeOffs + corrections;

    // Remittances arrive before application; unapplied cash is never negative.
    const unappliedDelta = Math.round(cashApplied * (0.015 + unit(seed + m * 11.3) * 0.03));
    const cashReceived = cashApplied + unappliedDelta;
    unappliedYtd += unappliedDelta;

    // Billing and coding.
    const invoicesCreated = Math.round(encounters * 0.97);
    const lag = lagFor(m);
    const chargeLagTenthsSum = Math.round(lag * 10) * invoicesCreated;
    const codingReady = encounters;
    const codingComplete = Math.round(codingReady * (0.94 - pressure * 0.04 + (unit(seed + m * 12.1) - 0.5) * 0.01));
    const billingExceptions = Math.round(invoicesCreated * (0.045 + pressure * 0.03 + (unit(seed + m * 13.3) - 0.5) * 0.008));

    // Charge capture and exclusive leakage components.
    const chargeableServices = Math.round(encounters * 3.4);
    const captureRate = 0.968 - pressure * 0.025 + (unit(seed + m * 14.9) - 0.5) * 0.01;
    const capturedCharges = Math.round(chargeableServices * captureRate);
    const avgNetPerCaptured = capturedCharges > 0 ? net / capturedCharges : 0;
    const missedCharges = Math.round((chargeableServices - capturedCharges) * avgNetPerCaptured);
    const avoidableWriteoffs = Math.round(writeOffs * (0.38 + unit(seed + m * 15.7) * 0.1));
    const underpayments = Math.round(cashApplied * (0.006 + pressure * 0.006 + unit(seed + m * 16.1) * 0.003));
    const potentialLeakage = Math.round((missedCharges + avoidableWriteoffs + underpayments) * (0.34 + unit(seed + m * 17.3) * 0.08));
    const recoveryOpportunities = Math.round(missedCharges / 2200) + Math.round(avoidableWriteoffs / 1600) + Math.round(underpayments / 3000);

    // Eligibility.
    const eligibilityRequired = encounters;
    const eligibilityVerified = Math.round(eligibilityRequired * (0.955 - pressure * 0.04 + (unit(seed + m * 18.1) - 0.5) * 0.01));
    const coverageExceptions = Math.round(eligibilityVerified * (0.052 + pressure * 0.03 + (unit(seed + m * 19.3) - 0.5) * 0.006));

    // Authorization: requests + opening pending = decided + closing pending.
    const authRequested = Math.round(encounters * 0.14);
    const closingPending = Math.round(authRequested * pendRate(m));
    const decided = authRequested - (closingPending - prevPending);
    const approvalRate = 0.9 - pressure * 0.05 + (unit(seed + m * 20.9) - 0.5) * 0.02;
    const authApproved = Math.round(decided * approvalRate);
    const authRejected = decided - authApproved;
    const turnaroundTenths = Math.round((2.6 + pressure * 2 + (unit(seed + m * 21.7) - 0.5) * 0.5) * 10);

    // Claims: unique claim IDs ≠ submission attempts; clearinghouse rejects ≠ payer denials.
    const uniqueClaims = Math.round(invoicesCreated * 0.9);
    const rejectRate = 0.052 + pressure * 0.03 + (unit(seed + m * 22.3) - 0.5) * 0.008;
    const clearinghouseRejects = Math.round(uniqueClaims * rejectRate);
    const firstPassAccepted = uniqueClaims - clearinghouseRejects;
    const submissionAttempts = uniqueClaims + clearinghouseRejects + Math.round(uniqueClaims * 0.035);
    const adjudicatedClaims = Math.round(uniqueClaims * 0.9);
    const denialRate = 0.072 + pressure * 0.035 + (code === 'H2' ? 0.02 : 0) + (unit(seed + m * 23.9) - 0.5) * 0.012;
    const deniedClaims = Math.round(adjudicatedClaims * denialRate);
    const adjudicatedAmount = uniqueClaims > 0 ? Math.round(gross * 0.93 * (adjudicatedClaims / uniqueClaims)) : 0;
    const valueRate = denialRate * (0.88 + unit(seed + m * 24.7) * 0.3);
    const deniedAmount = Math.round(adjudicatedAmount * valueRate);
    const appealDecided = Math.round(deniedClaims * 0.5);
    const appealWon = Math.round(appealDecided * (0.6 - pressure * 0.12 + (unit(seed + m * 25.3) - 0.5) * 0.06));
    const recoverableDenialValue = Math.round(deniedAmount * (0.4 + unit(seed + m * 26.9) * 0.1));
    const paidClaims = adjudicatedClaims - deniedClaims;
    const payerDelayDays = Math.round(36 + pressure * 14 + (unit(seed + m * 27.7) - 0.5) * 5);

    rows.push({
      days, gross, allowances, net, encounters,
      openingAR, newReceivables, cashApplied, cashReceived, approvedAdjustments, writeOffs, corrections, closingAR,
      unappliedYtd,
      openingWip: prevWip, closingWip, unbilledEncounters,
      uniqueClaims, submissionAttempts, firstPassAccepted, clearinghouseRejects, adjudicatedClaims, deniedClaims,
      adjudicatedAmount, deniedAmount, appealDecided, appealWon, recoverableDenialValue,
      payerDelayDaysSum: payerDelayDays * paidClaims,
      eligibilityRequired, eligibilityVerified, coverageExceptions,
      authRequested, openingPending: prevPending, closingPending, authApproved, authRejected,
      authTurnaroundTenthsSum: turnaroundTenths * decided,
      chargeableServices, capturedCharges, missedCharges, codingReady, codingComplete,
      invoicesCreated, billingExceptions, chargeLagTenthsSum,
      avoidableWriteoffs, underpayments, potentialLeakage, recoveryOpportunities,
    });

    openingAR = closingAR;
    prevWip = closingWip;
    prevPending = closingPending;
  }
  return rows;
}

/** Aggregates one site's period: flows are summed, stocks come from the period-end month. */
function siteRaw(code: SiteCode, year: number, period: ReportPeriod): Raw {
  const spec = SITE_SPECS[code];
  const pressure = spec.pressure;
  const seed = spec.beds * 13 + year * 29;
  const [start, end] = PERIOD_RANGE[period];
  const all = siteMonths(code, year);
  const rows = all.slice(start, end);
  const first = rows[0];
  const last = rows[rows.length - 1];
  const total = (pick: (row: MonthRow) => number) => sum(rows.map(pick));

  const s = fill(SCALAR_KEYS, () => 0);
  s.grossCharges = total((r) => r.gross);
  s.contractualAllowances = total((r) => r.allowances);
  s.openingAR = first.openingAR;
  s.newReceivables = total((r) => r.newReceivables);
  s.cashApplied = total((r) => r.cashApplied);
  s.cashReceived = total((r) => r.cashReceived);
  s.approvedAdjustments = total((r) => r.approvedAdjustments);
  s.writeOffs = total((r) => r.writeOffs);
  s.corrections = total((r) => r.corrections);
  s.closingAR = last.closingAR;
  s.patientAR = Math.round(last.closingAR * (0.13 + pressure * 0.04));
  s.unappliedStockYtd = last.unappliedYtd;
  s.openingUnbilledValue = first.openingWip;
  s.unbilledValue = last.closingWip;
  s.unbilledEncounters = last.unbilledEncounters;
  s.encounters = total((r) => r.encounters);
  s.uniqueClaims = total((r) => r.uniqueClaims);
  s.submissionAttempts = total((r) => r.submissionAttempts);
  s.firstPassAccepted = total((r) => r.firstPassAccepted);
  s.clearinghouseRejects = total((r) => r.clearinghouseRejects);
  s.adjudicatedClaims = total((r) => r.adjudicatedClaims);
  s.deniedClaims = total((r) => r.deniedClaims);
  s.adjudicatedAmount = total((r) => r.adjudicatedAmount);
  s.deniedAmount = total((r) => r.deniedAmount);
  s.appealDecided = total((r) => r.appealDecided);
  s.appealWon = total((r) => r.appealWon);
  s.recoverableDenialValue = total((r) => r.recoverableDenialValue);
  s.payerDelayDaysSum = total((r) => r.payerDelayDaysSum);
  s.eligibilityRequired = total((r) => r.eligibilityRequired);
  s.eligibilityVerified = total((r) => r.eligibilityVerified);
  s.coverageExceptions = total((r) => r.coverageExceptions);
  s.authRequested = total((r) => r.authRequested);
  s.authOpeningPending = first.openingPending;
  s.authApproved = total((r) => r.authApproved);
  s.authRejected = total((r) => r.authRejected);
  s.authPending = last.closingPending;
  s.authTurnaroundTenthsSum = total((r) => r.authTurnaroundTenthsSum);
  s.chargeableServices = total((r) => r.chargeableServices);
  s.capturedCharges = total((r) => r.capturedCharges);
  s.missedCharges = total((r) => r.missedCharges);
  s.codingReady = total((r) => r.codingReady);
  s.codingComplete = total((r) => r.codingComplete);
  s.invoicesCreated = total((r) => r.invoicesCreated);
  s.billingExceptions = total((r) => r.billingExceptions);
  s.chargeLagTenthsSum = total((r) => r.chargeLagTenthsSum);
  s.avoidableWriteoffs = total((r) => r.avoidableWriteoffs);
  s.underpayments = total((r) => r.underpayments);
  s.potentialLeakage = total((r) => r.potentialLeakage);
  s.recoveryOpportunities = total((r) => r.recoveryOpportunities);

  const net = s.grossCharges - s.contractualAllowances;
  const insurerAR = s.closingAR - s.patientAR;
  const decided = s.authApproved + s.authRejected;
  const missedServices = s.chargeableServices - s.capturedCharges;
  const perturb = (shares: number[], salt: number) => shares.map(
    (share, index) => share * (1 + (unit(seed + salt + index * 7.7) - 0.5) * 0.12),
  );

  const a = fill(ARRAY_KEYS, () => [] as number[]);

  const ageWeights = [
    0.46 - pressure * 0.08,
    0.25,
    0.14 + pressure * 0.02,
    0.08 + pressure * 0.03,
    0.07 + pressure * 0.03,
  ];
  a.arAging = splitExact(s.closingAR, ageWeights);

  const payerShares = perturb(PAYER_NET_SHARES, 100);
  a.payerNet = splitExact(net, payerShares);
  a.payerCash = splitExact(s.cashApplied, weighted(payerShares, PAYER_COLLECT_FACTOR));
  const insurerIndexes = RCM_PAYERS.map((_, index) => index).filter((index) => index !== SELF_PAY_INDEX);
  const insurerParts = splitExact(insurerAR, insurerIndexes.map((index, pos) => payerShares[index] * INSURER_AR_FACTOR[pos]));
  a.payerAR = RCM_PAYERS.map((_, index) => (
    index === SELF_PAY_INDEX ? s.patientAR : insurerParts[insurerIndexes.indexOf(index)]
  ));
  a.payerAdjudicated = splitExact(s.adjudicatedClaims, weighted(payerShares, PAYER_CLAIM_FACTOR));
  a.payerDenied = splitExact(s.deniedClaims, weighted(a.payerAdjudicated, PAYER_DENIAL_FACTOR));
  a.payerAuthDecided = splitExact(decided, weighted(payerShares, PAYER_AUTH_FACTOR));
  a.payerAuthApproved = splitExact(s.authApproved, weighted(a.payerAuthDecided, PAYER_AUTH_APPROVAL_FACTOR));

  a.reasonCount = splitExact(s.deniedClaims, perturb(REASON_COUNT_SHARES, 200));
  a.reasonAmount = splitExact(s.deniedAmount, weighted(a.reasonCount, REASON_VALUE_FACTOR));

  a.deptChargeable = splitExact(s.chargeableServices, DEPT_CHARGE_SHARES);
  const deptLeakWeights = weighted(a.deptChargeable, DEPT_LEAK_FACTOR);
  a.deptMissedServices = splitExact(missedServices, deptLeakWeights);
  a.deptMissedValue = splitExact(s.missedCharges, deptLeakWeights);
  const slWeights = weighted(SERVICE_LINE_SHARES, SERVICE_LINE_LEAK_FACTOR);
  a.slMissedServices = splitExact(missedServices, slWeights);
  a.slMissedValue = splitExact(s.missedCharges, slWeights);

  a.mRevenue = rows.map((r) => r.net);
  a.mCollections = rows.map((r) => r.cashApplied);
  a.mDenials = rows.map((r) => r.deniedClaims);
  a.mClaims = rows.map((r) => r.uniqueClaims);
  a.mCashApplied = rows.map((r) => r.cashApplied);
  a.mCashReceived = rows.map((r) => r.cashReceived);

  // What-if eligible values (illustrative; computed per site so ALL sums exactly).
  const avgClaimNet = s.uniqueClaims > 0 ? net / s.uniqueClaims : 0;
  const authExposure = a.reasonAmount[AUTH_REASON_INDEX];
  const arOver90 = a.arAging[3] + a.arAging[4];
  a.opp = [
    Math.round(s.recoverableDenialValue * 0.62),
    Math.round(s.clearinghouseRejects * avgClaimNet * 0.4),
    Math.round(arOver90 * 0.3 + a.arAging[2] * 0.08),
    Math.round(authExposure * 0.45),
    Math.round(s.missedCharges * 0.55),
    Math.round(s.underpayments * 0.5),
    Math.round(s.avoidableWriteoffs * 0.5),
    Math.round(s.unbilledValue * 0.2),
  ];

  return { s, a };
}

function sumRaw(parts: Raw[]): Raw {
  const s = fill(SCALAR_KEYS, () => 0);
  const a = fill(ARRAY_KEYS, () => [] as number[]);
  for (const key of SCALAR_KEYS) s[key] = sum(parts.map((part) => part.s[key]));
  for (const key of ARRAY_KEYS) {
    const length = Math.max(0, ...parts.map((part) => part.a[key].length));
    a[key] = Array.from({ length }, (_, index) => sum(parts.map((part) => part.a[key][index] ?? 0)));
  }
  return { s, a };
}

function periodMeta(year: number, period: ReportPeriod) {
  const [start, end] = PERIOD_RANGE[period];
  const months = Array.from({ length: end - start }, (_, index) => ({
    label: MONTH_NAMES[start + index],
    days: new Date(year, start + index + 1, 0).getDate(),
  }));
  const observationDate = period === 'year'
    ? `31 Dec ${year}`
    : ({ Q1: `31 Mar ${year}`, Q2: `30 Jun ${year}`, Q3: `30 Sep ${year}`, Q4: `31 Dec ${year}` } as const)[period];
  const periodLabel = period === 'year' ? `Full year ${year}` : `${period} ${year}`;
  return { months, observationDate, periodLabel, days: sum(months.map((item) => item.days)) };
}

const CACHE = new Map<string, RcmView>();

/** Shared RCM scenario for screens, Assist, alerts, and what-if. ALL is the exact sum of H1–H5. */
export function buildRcmView(hospital: string, year: number, period: ReportPeriod = 'year'): RcmView {
  const cacheKey = `${hospital}|${year}|${period}`;
  const cached = CACHE.get(cacheKey);
  if (cached) return cached;
  const view = compute(hospital, year, period);
  CACHE.set(cacheKey, view);
  return view;
}

/** Test helper — clears memoized views after model changes in the same process. */
export function clearRcmViewCache(): void {
  CACHE.clear();
}

function compute(hospital: string, year: number, period: ReportPeriod) {
  const codes = SITE_CODES.includes(hospital as SiteCode) ? [hospital as SiteCode] : SITE_CODES;
  const raw = sumRaw(codes.map((code) => siteRaw(code, year, period)));
  return assemble(hospital, year, period, raw);
}

function assemble(hospital: string, year: number, period: ReportPeriod, raw: Raw) {
  const { s, a } = raw;
  const meta = periodMeta(year, period);

  // 1. Gross charges − contractual allowances = net patient revenue.
  const grossCharges = s.grossCharges;
  const contractualAllowances = s.contractualAllowances;
  const netPatientRevenue = grossCharges - contractualAllowances;

  // 2. AR roll-forward; closing AR is the period-end snapshot.
  const { openingAR, newReceivables, cashApplied, cashReceived, approvedAdjustments, writeOffs, corrections } = s;
  const closingAR = s.closingAR;
  const arExpectedClosing = openingAR + newReceivables - cashApplied - approvedAdjustments - writeOffs + corrections;
  const patientAR = s.patientAR;
  const insurerAR = closingAR - patientAR;
  const arAging = a.arAging;
  const arOver90 = arAging[3] + arAging[4];

  // 3. Cash received ≥ cash applied; unapplied = received − applied.
  const unappliedCash = cashReceived - cashApplied;

  // 4–6. Claims, denials, authorization.
  const { uniqueClaims, submissionAttempts, firstPassAccepted, clearinghouseRejects } = s;
  const { adjudicatedClaims, deniedClaims, deniedAmount, adjudicatedAmount } = s;
  const { appealDecided, appealWon, recoverableDenialValue } = s;
  const paidClaims = adjudicatedClaims - deniedClaims;
  const authDecided = s.authApproved + s.authRejected;
  const authDenialExposure = a.reasonAmount[AUTH_REASON_INDEX];

  const grossDenialRate = ratio(deniedClaims, adjudicatedClaims);
  const denialRateByValue = ratio(deniedAmount, adjudicatedAmount);
  const netCollectionRate = ratio(cashApplied, netPatientRevenue);
  const daysInAr = netPatientRevenue > 0 ? r1(closingAR / (netPatientRevenue / meta.days)) : 0;
  const collectionEffectiveness = ratio(cashApplied, openingAR + newReceivables - approvedAdjustments);

  // 7–8. Exclusive leakage attribution; contractual allowances are never leakage.
  const missedChargeExposure = s.missedCharges;
  const avoidableWriteoffs = s.avoidableWriteoffs;
  const underpaymentValue = s.underpayments;
  const confirmedLeakage = missedChargeExposure + avoidableWriteoffs + underpaymentValue;
  const potentialLeakage = s.potentialLeakage;
  const revenueAtRisk = recoverableDenialValue + s.unbilledValue + arOver90;

  const leakageDrivers = [
    { id: 'missed_charges', name: 'Missed charges', amount: missedChargeExposure },
    { id: 'avoidable_writeoffs', name: 'Avoidable write-offs', amount: avoidableWriteoffs },
    { id: 'underpayments', name: 'Contract underpayments', amount: underpaymentValue },
  ].map((item) => ({ ...item, share: ratio(item.amount, confirmedLeakage) }));

  // What-if baselines.
  const opp = a.opp;
  const eligibleDenialRecovery = opp[0];
  const preventableLeakage = opp[4] + opp[5] + opp[6];
  const collectionImprovement = opp[1] + opp[7];
  const cashAcceleration = opp[2];
  const recoverableOpportunity = eligibleDenialRecovery + preventableLeakage;

  const preventableDeniedAmount = sum(PREVENTABLE_REASONS.map((index) => a.reasonAmount[index]));
  const chargeCaptureRate = ratio(s.capturedCharges, s.chargeableServices);
  const firstPassAcceptance = ratio(firstPassAccepted, uniqueClaims);
  const eligibilityVerificationRate = ratio(s.eligibilityVerified, s.eligibilityRequired);
  const preauthApprovalRate = ratio(s.authApproved, authDecided);
  const codingCompletionRate = ratio(s.codingComplete, s.codingReady);
  const authTurnaroundDays = authDecided > 0 ? r1(s.authTurnaroundTenthsSum / authDecided / 10) : 0;
  const chargeToBillLag = s.invoicesCreated > 0 ? r1(s.chargeLagTenthsSum / s.invoicesCreated / 10) : 0;
  const payerPaymentDelay = paidClaims > 0 ? r1(s.payerDelayDaysSum / paidClaims) : 0;

  const baselines: Record<RcmOpportunityId, number> = {
    'rcm-denials-down': grossDenialRate,
    'rcm-first-pass-up': firstPassAcceptance,
    'rcm-ar-accelerate': daysInAr,
    'rcm-auth-up': preauthApprovalRate,
    'rcm-capture-up': chargeCaptureRate,
    'rcm-underpay-recover': underpaymentValue,
    'rcm-writeoff-down': avoidableWriteoffs,
    'rcm-workflow-up': codingCompletionRate,
  };
  const opportunities = RCM_OPPORTUNITY_IDS.map((id, index) => ({
    id,
    title: OPPORTUNITY_META[id].title,
    baseline: baselines[id],
    baselineUnit: OPPORTUNITY_META[id].baselineUnit,
    baselineLabel: OPPORTUNITY_META[id].baselineLabel,
    eligibleValue: opp[index],
    owner: OPPORTUNITY_META[id].owner,
    followUp: OPPORTUNITY_META[id].followUp,
    assumption: OPPORTUNITY_META[id].assumption,
    // Scenarios share underlying value (for example auth exposure sits inside denials), so they are not additive.
    additive: false,
  }));

  const payerRows = RCM_PAYERS.map((name, index) => ({
    name,
    netRevenue: a.payerNet[index],
    collections: a.payerCash[index],
    denialRate: ratio(a.payerDenied[index], a.payerAdjudicated[index]),
    ar: a.payerAR[index],
    authApproval: Math.min(1, ratio(a.payerAuthApproved[index], a.payerAuthDecided[index])),
  }));

  const denialReasonRows = RCM_DENIAL_REASONS.map((name, index) => ({
    name,
    count: a.reasonCount[index],
    amount: a.reasonAmount[index],
  }));

  const deptCaptureRows = RCM_DEPARTMENTS.map((name, index) => {
    const chargeable = a.deptChargeable[index];
    const missedServices = a.deptMissedServices[index];
    const captured = chargeable - missedServices;
    return {
      name,
      chargeable,
      captured,
      missedServices,
      captureRate: ratio(captured, chargeable),
      missedValue: a.deptMissedValue[index],
    };
  });

  const serviceLineMissedRows = RCM_SERVICE_LINES.map((name, index) => ({
    name,
    missedServices: a.slMissedServices[index],
    missedValue: a.slMissedValue[index],
  }));

  const monthlyCollectionRate = a.mRevenue.map((revenue, index) => ratio(a.mCollections[index], revenue));
  const agingRows = RCM_AGING_BUCKETS.map((name, index) => ({
    name,
    amount: arAging[index],
    share: ratio(arAging[index], closingAR),
  }));

  const kpiValues: Record<string, number> = {
    kpi_rcm_net_patient_revenue: netPatientRevenue,
    kpi_rcm_net_collection_rate: netCollectionRate,
    kpi_rcm_gross_denial_rate: grossDenialRate,
    kpi_rcm_days_in_ar: daysInAr,
    kpi_rcm_outstanding_ar: closingAR,
    kpi_rcm_revenue_at_risk: revenueAtRisk,
    kpi_rcm_eligibility_verification_rate: eligibilityVerificationRate,
    kpi_rcm_coverage_exception_rate: ratio(s.coverageExceptions, s.eligibilityVerified),
    kpi_rcm_preauth_approval_rate: preauthApprovalRate,
    kpi_rcm_pending_authorizations: s.authPending,
    kpi_rcm_auth_turnaround_days: authTurnaroundDays,
    kpi_rcm_auth_denial_exposure: authDenialExposure,
    kpi_rcm_charge_capture_rate: chargeCaptureRate,
    kpi_rcm_unbilled_encounters: s.unbilledEncounters,
    kpi_rcm_unbilled_service_value: s.unbilledValue,
    kpi_rcm_charge_to_bill_lag: chargeToBillLag,
    kpi_rcm_coding_completion_rate: codingCompletionRate,
    kpi_rcm_billing_exception_rate: ratio(s.billingExceptions, s.invoicesCreated),
    kpi_rcm_claims_submitted: uniqueClaims,
    kpi_rcm_first_pass_acceptance: firstPassAcceptance,
    kpi_rcm_denied_claims: deniedClaims,
    kpi_rcm_denial_rate_by_value: denialRateByValue,
    kpi_rcm_appeal_success_rate: ratio(appealWon, appealDecided),
    kpi_rcm_recoverable_denial_value: recoverableDenialValue,
    kpi_rcm_cash_applied: cashApplied,
    kpi_rcm_ar_over_90: arOver90,
    kpi_rcm_collection_effectiveness: collectionEffectiveness,
    kpi_rcm_unapplied_cash: unappliedCash,
    kpi_rcm_payer_payment_delay: payerPaymentDelay,
    kpi_rcm_patient_ar: patientAR,
    kpi_rcm_confirmed_leakage: confirmedLeakage,
    kpi_rcm_potential_leakage: potentialLeakage,
    kpi_rcm_underpayment_value: underpaymentValue,
    kpi_rcm_missed_charge_exposure: missedChargeExposure,
    kpi_rcm_avoidable_writeoffs: avoidableWriteoffs,
    kpi_rcm_recovery_opportunities: s.recoveryOpportunities,
    kpi_rcm_recoverable_opportunity: recoverableOpportunity,
    kpi_rcm_eligible_denial_recovery: eligibleDenialRecovery,
    kpi_rcm_collection_improvement: collectionImprovement,
    kpi_rcm_preventable_leakage: preventableLeakage,
    kpi_rcm_cash_acceleration: cashAcceleration,
  };

  const prioritySignals = [
    {
      name: 'Net collection rate',
      value: netCollectionRate,
      threshold: RCM_TARGETS.netCollectionRate,
      severity: netCollectionRate < RCM_TARGETS.netCollectionRate - 0.04 ? 'high' : netCollectionRate < RCM_TARGETS.netCollectionRate ? 'medium' : 'low',
    },
    {
      name: 'Gross denial rate',
      value: grossDenialRate,
      threshold: RCM_TARGETS.grossDenialRate,
      severity: grossDenialRate > RCM_TARGETS.grossDenialRate + 0.02 ? 'high' : grossDenialRate > RCM_TARGETS.grossDenialRate ? 'medium' : 'low',
    },
    {
      name: 'Days in AR',
      value: daysInAr,
      threshold: RCM_TARGETS.daysInAr,
      severity: daysInAr > RCM_TARGETS.daysInAr + 10 ? 'high' : daysInAr > RCM_TARGETS.daysInAr ? 'medium' : 'low',
    },
    {
      name: 'Charge capture rate',
      value: chargeCaptureRate,
      threshold: RCM_TARGETS.chargeCaptureRate,
      severity: chargeCaptureRate < RCM_TARGETS.chargeCaptureRate - 0.02 ? 'high' : chargeCaptureRate < RCM_TARGETS.chargeCaptureRate ? 'medium' : 'low',
    },
    {
      name: 'First-pass acceptance',
      value: firstPassAcceptance,
      threshold: RCM_TARGETS.firstPassAcceptance,
      severity: firstPassAcceptance < RCM_TARGETS.firstPassAcceptance - 0.03 ? 'high' : firstPassAcceptance < RCM_TARGETS.firstPassAcceptance ? 'medium' : 'low',
    },
  ];

  const identities = {
    netRevenueBalanced: grossCharges - contractualAllowances === netPatientRevenue,
    arRollForwardBalanced: arExpectedClosing === closingAR,
    cashApplicationBalanced: cashReceived >= cashApplied && unappliedCash === cashReceived - cashApplied,
    arSplitBalanced: insurerAR + patientAR === closingAR,
    agingBalanced: sum(arAging) === closingAR,
    claimsBalanced: submissionAttempts >= uniqueClaims && firstPassAccepted + clearinghouseRejects === uniqueClaims,
    adjudicationBalanced: deniedClaims <= adjudicatedClaims && adjudicatedClaims <= uniqueClaims && deniedAmount <= adjudicatedAmount,
    leakageBalanced: sum(leakageDrivers.map((item) => item.amount)) === confirmedLeakage,
    authBalanced: s.authRequested + s.authOpeningPending === authDecided + s.authPending,
    unbilledBalanced: netPatientRevenue === newReceivables + (s.unbilledValue - s.openingUnbilledValue),
    payerBalanced: sum(a.payerNet) === netPatientRevenue && sum(a.payerCash) === cashApplied && sum(a.payerAR) === closingAR,
  };

  const periodRows = a.mRevenue.length;

  return {
    hospital,
    year,
    period,
    periodLabel: meta.periodLabel,
    observationDate: meta.observationDate,
    daysInPeriod: meta.days,
    currency: RCM_CURRENCY,
    labels: meta.months.map((item) => item.label),
    monthCount: periodRows,

    // Revenue
    grossCharges,
    contractualAllowances,
    netPatientRevenue,

    // AR roll-forward ledger
    openingAR,
    newReceivables,
    cashApplied,
    cashReceived,
    approvedAdjustments,
    writeOffs,
    corrections,
    closingAR,
    outstandingAR: closingAR,
    outstandingAr: closingAR,
    insurerAR,
    patientAR,
    arAging,
    agingRows,
    agingClock: AGING_CLOCK,
    unappliedStockYtd: s.unappliedStockYtd,
    arRollForward: {
      openingAR,
      newReceivables,
      cashApplied,
      approvedAdjustments,
      writeOffs,
      corrections,
      expectedClosing: arExpectedClosing,
      closingAR,
      residual: closingAR - arExpectedClosing,
      balanced: arExpectedClosing === closingAR,
    },

    // Claims ledger
    uniqueClaims,
    submissionAttempts,
    resubmissions: submissionAttempts - uniqueClaims,
    firstPassAccepted,
    clearinghouseRejects,
    adjudicatedClaims,
    paidClaims,
    deniedClaims,
    deniedAmount,
    adjudicatedAmount,
    appealDecided,
    appealWon,
    recoverableDenialValue,
    preventableDeniedAmount,

    // Eligibility and authorization ledger
    eligibilityRequired: s.eligibilityRequired,
    eligibilityVerified: s.eligibilityVerified,
    coverageExceptions: s.coverageExceptions,
    authRequested: s.authRequested,
    authOpeningPending: s.authOpeningPending,
    authApproved: s.authApproved,
    authRejected: s.authRejected,
    authDecided,
    authPending: s.authPending,
    authTurnaroundDays,
    authDenialExposure,

    // Billing ledger
    chargeableServices: s.chargeableServices,
    capturedCharges: s.capturedCharges,
    unbilledEncounters: s.unbilledEncounters,
    unbilledValue: s.unbilledValue,
    openingUnbilledValue: s.openingUnbilledValue,
    chargeToBillLagDays: chargeToBillLag,
    codingReady: s.codingReady,
    codingComplete: s.codingComplete,
    billingExceptions: s.billingExceptions,
    invoicesCreated: s.invoicesCreated,
    encounters: s.encounters,

    // Command KPIs (kpi_rcm_*)
    netCollectionRate,
    grossDenialRate,
    daysInAr,
    daysInAR: daysInAr,
    revenueAtRisk,

    // Eligibility KPIs
    eligibilityVerificationRate,
    coverageExceptionRate: ratio(s.coverageExceptions, s.eligibilityVerified),
    preauthApprovalRate,
    pendingAuthorizations: s.authPending,
    // Billing KPIs
    chargeCaptureRate,
    unbilledServiceValue: s.unbilledValue,
    chargeToBillLag,
    codingCompletionRate,
    billingExceptionRate: ratio(s.billingExceptions, s.invoicesCreated),

    // Claims KPIs
    claimsSubmitted: uniqueClaims,
    firstPassAcceptance,
    denialRateByValue,
    appealSuccessRate: ratio(appealWon, appealDecided),

    // Collections KPIs
    arOver90,
    collectionEffectiveness,
    unappliedCash,
    payerPaymentDelay,
    patientAr: patientAR,

    // Leakage KPIs
    confirmedLeakage,
    potentialLeakage,
    underpaymentValue,
    missedChargeExposure,
    avoidableWriteoffs,
    recoveryOpportunities: s.recoveryOpportunities,
    leakageDrivers,

    // Optimization KPIs
    recoverableOpportunity,
    eligibleDenialRecovery,
    collectionImprovement,
    preventableLeakage,
    cashAcceleration,
    opportunities,

    // Series
    monthlyLabels: meta.months.map((item) => item.label),
    monthlyRevenue: a.mRevenue,
    monthlyCollections: a.mCollections,
    monthlyDenials: a.mDenials,
    monthlyClaimsSubmitted: a.mClaims,
    monthlyCashApplied: a.mCashApplied,
    monthlyCashReceived: a.mCashReceived,
    monthlyCollectionRate,

    // Breakdowns
    payerRows,
    denialReasonRows,
    deptCaptureRows,
    serviceLineMissedRows,
    prioritySignals,

    kpiValues,
    identities,

    methodology: {
      currency: 'Amounts are conceptually SAR but stored as plain numbers. All data is deterministic synthetic demo data.',
      netRevenue: 'Net patient revenue = gross charges − contractual allowances. It is recognized revenue, not cash.',
      arRollForward: 'Opening AR + new receivables − cash applied − approved adjustments − write-offs ± corrections = closing AR. Outstanding AR is the period-end snapshot, never a sum of monthly ending balances.',
      cash: 'Cash received ≥ cash applied. Unapplied cash = received − applied for the period. unappliedStockYtd is the cumulative balance since 1 January.',
      claims: 'Unique claims ≠ submission attempts: submissions include resubmissions of rejected or denied claims. Clearinghouse rejects are tracked separately from payer denials.',
      denialRate: 'Gross denial rate = denied unique claims ÷ adjudicated unique claims (claim count). Denial rate by value = denied amount ÷ adjudicated amount.',
      leakage: 'Confirmed leakage = missed charges + avoidable write-offs + underpayments with exclusive attribution. Contractual allowances are never leakage. Potential leakage is not additive to confirmed leakage.',
      aging: `AR aging buckets use the ${AGING_CLOCK} as the clock and sum to closing AR.`,
      allMode: 'Hospital ALL is the exact sum of H1–H5 ledgers; rates and day measures are recomputed from summed numerators and denominators.',
      daysMeasures: 'Authorization turnaround, charge-to-bill lag and payer delay are volume-weighted means of site-month values, not medians.',
      optimization: 'Eight what-if scenarios overlap (for example authorization exposure sits inside denials) and must not be summed. Values are illustrative, not realized cash.',
    },
  };
}

export type RcmView = ReturnType<typeof compute>;

/** Residual of the AR roll-forward; zero means the identity holds. */
export function rcmArRollForwardResidual(view: Pick<RcmView, 'openingAR' | 'newReceivables' | 'cashApplied' | 'approvedAdjustments' | 'writeOffs' | 'corrections' | 'closingAR'>): number {
  return view.openingAR + view.newReceivables - view.cashApplied - view.approvedAdjustments - view.writeOffs + view.corrections - view.closingAR;
}

/** Lists failed ledger identities for a view; an empty array means all conventions reconcile. */
export function rcmIdentityIssues(view: RcmView): string[] {
  return (Object.entries(view.identities) as [string, boolean][])
    .filter(([, ok]) => !ok)
    .map(([name]) => name);
}
