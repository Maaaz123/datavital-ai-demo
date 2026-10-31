import { SITE_SPECS, scenarioFor, type SiteCode } from '@/showcase/facts';
import { splitExact } from './ipdView';
import { type ReportPeriod } from './period';

export const QS_DEPARTMENTS = [
  'Emergency',
  'Medical wards',
  'Surgical wards',
  'ICU',
  'Maternity',
  'Operating theatres',
  'Outpatient clinics',
  'Diagnostics',
] as const;

export const QS_INCIDENT_CATEGORIES = [
  'Patient falls',
  'Medication-related',
  'Pressure injuries',
  'Procedure-related',
  'Identification errors',
  'Communication failures',
  'Equipment-related',
  'Deterioration recognition',
  'Other reportable',
] as const;

export const QS_SEVERITY = ['Near miss', 'No harm', 'Mild harm', 'Moderate harm', 'Severe harm'] as const;

export const QS_PROCEDURE_CATEGORIES = [
  'Orthopaedic',
  'General surgery',
  'Obstetric',
  'Cardiac',
  'Neurosurgery',
  'Other eligible',
] as const;

export const QS_TARGETS = {
  validatedEventRate: 12, // per 1000 discharges
  haiBurdenRate: 1.8, // per 1000 patient-days
  qualityCompliance: 0.92,
  clabsiRate: 1.2, // per 1000 CL days
  cautiRate: 1.5,
  ssiRate: 0.018,
  handHygiene: 0.85,
  investigationTimeliness: 0.8,
  capaOntime: 0.85,
  readmissionRate: 0.09,
} as const;

export const QS_OPPORTUNITY_IDS = [
  'qs-hh-up',
  'qs-bundle-up',
  'qs-infection-review-down',
  'qs-investigation-up',
  'qs-capa-overdue-down',
  'qs-observation-up',
  'qs-ssi-prevention-up',
  'qs-effectiveness-up',
] as const;
export type QsOpportunityId = (typeof QS_OPPORTUNITY_IDS)[number];

const OPPORTUNITY_META: Record<QsOpportunityId, {
  title: string;
  owner: string;
  followUp: string;
  baselineUnit: 'rate' | 'count' | 'index';
  baselineLabel: string;
  assumption: string;
}> = {
  'qs-hh-up': {
    title: 'Improve hand hygiene compliance',
    owner: 'Infection Prevention',
    followUp: 'kpi_qs_hand_hygiene_compliance',
    baselineUnit: 'rate',
    baselineLabel: 'Hand hygiene observed compliance',
    assumption: 'Audited opportunities only; modeled uplift does not prove infection reduction or mortality change.',
  },
  'qs-bundle-up': {
    title: 'Improve device bundle compliance',
    owner: 'Infection Prevention',
    followUp: 'kpi_qs_cl_bundle_compliance',
    baselineUnit: 'rate',
    baselineLabel: 'Central-line / catheter bundle compliance',
    assumption: 'Eligible observed bundles only. Process compliance uplift is not a guaranteed CLABSI/CAUTI reduction.',
  },
  'qs-infection-review-down': {
    title: 'Reduce delays in infection case review',
    owner: 'Infection Prevention Director',
    followUp: 'kpi_qs_surveillance_coverage',
    baselineUnit: 'rate',
    baselineLabel: 'Surveillance / infection review coverage',
    assumption: 'Faster review improves signal timeliness; it does not create new confirmed diagnoses.',
  },
  'qs-investigation-up': {
    title: 'Accelerate incident investigations',
    owner: 'Patient Safety Director',
    followUp: 'kpi_qs_investigation_timeliness',
    baselineUnit: 'rate',
    baselineLabel: 'Investigation timeliness',
    assumption: 'On-time closure improves learning throughput; administrative closure ≠ proven harm reduction.',
  },
  'qs-capa-overdue-down': {
    title: 'Reduce overdue corrective actions',
    owner: 'Quality Governance',
    followUp: 'kpi_qs_overdue_high_risk_actions',
    baselineUnit: 'count',
    baselineLabel: 'Overdue high-risk actions',
    assumption: 'Clearing overdue CAPA improves governance throughput; approval ≠ measured effectiveness.',
  },
  'qs-observation-up': {
    title: 'Improve high-risk unit observation coverage',
    owner: 'Infection Prevention',
    followUp: 'kpi_qs_hand_hygiene_compliance',
    baselineUnit: 'rate',
    baselineLabel: 'Audited observation coverage on high-risk units',
    assumption: 'More eligible observations reduce sampling bias; coverage uplift is not universal compliance.',
  },
  'qs-ssi-prevention-up': {
    title: 'Improve surgical infection prevention process compliance',
    owner: 'Surgical Quality / Infection Prevention',
    followUp: 'kpi_qs_ssi_rate',
    baselineUnit: 'rate',
    baselineLabel: 'SSI prevention process compliance (eligible procedures)',
    assumption: 'Procedure-based eligibility and surveillance windows apply. Compliance uplift does not guarantee SSI reduction.',
  },
  'qs-effectiveness-up': {
    title: 'Increase corrective action effectiveness verification',
    owner: 'Quality Governance',
    followUp: 'kpi_qs_effectiveness_review_rate',
    baselineUnit: 'rate',
    baselineLabel: 'CAPA effectiveness verification rate',
    assumption: 'Verification coverage is process evidence only — not proof that clinical risk was reduced.',
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
const SEASON = [0.97, 0.95, 1.02, 1, 1.03, 0.98, 0.94, 0.96, 1.04, 1.06, 1.02, 1.0];

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

function density(events: number, days: number): number {
  return days > 0 ? (events / days) * 1000 : 0;
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
  admissions: number;
  discharges: number;
  patientDays: number;
  reported: number;
  validated: number;
  nearMiss: number;
  withHarm: number;
  severeHarm: number;
  centralLineDays: number;
  catheterDays: number;
  clabsi: number;
  cauti: number;
  procedures: number;
  ssi: number;
  cdi: number;
  hhEligible: number;
  hhCompliant: number;
  isolationEligible: number;
  isolationCompliant: number;
  clBundleEligible: number;
  clBundleCompliant: number;
  ucBundleEligible: number;
  ucBundleCompliant: number;
  auditsScheduled: number;
  auditsComplete: number;
  qualityNumerator: number;
  qualityDenominator: number;
  readmissions: number;
  eligibleDischarges: number;
  hapi: number;
  fallsInjury: number;
  postopComplications: number;
  surgicalDischarges: number;
  investigationsDecided: number;
  investigationsOnTime: number;
  classified: number;
  capaDecided: number;
  capaOnTime: number;
  capaClosed: number;
  capaEffectiveness: number;
  rcaOpened: number;
  rcaClosed: number;
};

function siteMonth(code: SiteCode, year: number, monthIndex: number): SiteMonth {
  const scenario = scenarioFor(code, year);
  const month = scenario.months[monthIndex];
  const admissions = Math.max(1, Math.round(Number(month.admissions) || 0));
  const discharges = Math.max(1, Math.round(Number(month.discharges) || admissions));
  const seed = hash(`${code}|${year}|${monthIndex}|qs`);
  const pressure = SITE_SPECS[code].pressure;
  const season = SEASON[monthIndex];
  const los = 4.2 + pressure * 0.8;
  const patientDays = Math.max(admissions, Math.round(admissions * los * (0.95 + unit(mix(seed, 1)) * 0.1)));

  const reportRate = 0.018 + pressure * 0.008 + unit(mix(seed, 2)) * 0.004;
  const reported = Math.max(1, Math.round(admissions * reportRate * season));
  const validatedShare = 0.62 + unit(mix(seed, 3)) * 0.12;
  const validated = Math.max(1, Math.round(reported * validatedShare));
  const nearMiss = Math.round(validated * (0.38 + unit(mix(seed, 4)) * 0.1));
  const withHarm = Math.max(0, validated - nearMiss - Math.round(validated * 0.12));
  const severeHarm = Math.min(withHarm, Math.max(0, Math.round(withHarm * (0.08 + pressure * 0.04 + unit(mix(seed, 5)) * 0.03))));

  const centralLineDays = Math.max(10, Math.round(patientDays * (0.12 + pressure * 0.04)));
  const catheterDays = Math.max(10, Math.round(patientDays * (0.18 + pressure * 0.05)));
  const clabsiEvents = Math.max(0, Math.round((centralLineDays / 1000) * (0.8 + pressure * 0.7 + unit(mix(seed, 8)))));
  const cautiEvents = Math.max(0, Math.round((catheterDays / 1000) * (1.0 + pressure * 0.8 + unit(mix(seed, 9)))));
  const procedures = Math.max(5, Math.round(admissions * (0.22 + unit(mix(seed, 10)) * 0.05)));
  const ssi = Math.max(0, Math.round(procedures * (0.012 + pressure * 0.01 + unit(mix(seed, 11)) * 0.008)));
  const cdi = Math.max(0, Math.round(patientDays / 1000 * (0.4 + pressure * 0.3 + unit(mix(seed, 12)))));

  const hhEligible = Math.max(20, Math.round(80 + unit(mix(seed, 13)) * 40 + admissions * 0.15));
  const hhCompliant = Math.round(hhEligible * (0.78 + unit(mix(seed, 14)) * 0.12 - pressure * 0.03));
  const isolationEligible = Math.max(5, Math.round(12 + unit(mix(seed, 15)) * 10));
  const isolationCompliant = Math.round(isolationEligible * (0.8 + unit(mix(seed, 16)) * 0.12));
  const clBundleEligible = Math.max(5, Math.round(centralLineDays * 0.08));
  const clBundleCompliant = Math.round(clBundleEligible * (0.75 + unit(mix(seed, 17)) * 0.15));
  const ucBundleEligible = Math.max(5, Math.round(catheterDays * 0.06));
  const ucBundleCompliant = Math.round(ucBundleEligible * (0.72 + unit(mix(seed, 18)) * 0.15));
  const auditsScheduled = Math.max(2, Math.round(6 + unit(mix(seed, 19)) * 4));
  const auditsComplete = Math.min(auditsScheduled, Math.round(auditsScheduled * (0.82 + unit(mix(seed, 20)) * 0.12)));

  const qualityDenominator = Math.max(10, Math.round(discharges * 0.35));
  const qualityNumerator = Math.round(qualityDenominator * (0.88 + unit(mix(seed, 21)) * 0.08 - pressure * 0.02));

  const eligibleDischarges = Math.max(1, Math.round(discharges * 0.92));
  const readmissions = Math.round(eligibleDischarges * (0.07 + pressure * 0.03 + unit(mix(seed, 22)) * 0.02));
  const hapi = Math.max(0, Math.round((patientDays / 1000) * (0.5 + pressure * 0.4 + unit(mix(seed, 23)))));
  const fallsInjury = Math.max(0, Math.round((patientDays / 1000) * (0.6 + pressure * 0.35 + unit(mix(seed, 24)))));
  const surgicalDischarges = Math.max(1, Math.round(discharges * 0.28));
  const postopComplications = Math.round(surgicalDischarges * (0.04 + pressure * 0.025 + unit(mix(seed, 25)) * 0.02));

  const investigationsDecided = Math.max(1, Math.round(validated * (0.7 + unit(mix(seed, 26)) * 0.2)));
  const investigationsOnTime = Math.round(investigationsDecided * (0.72 + unit(mix(seed, 27)) * 0.15));
  const classified = Math.min(reported, Math.round(reported * (0.88 + unit(mix(seed, 28)) * 0.08)));

  const capaDecided = Math.max(1, Math.round(withHarm * 0.9 + severeHarm * 1.2));
  const capaOnTime = Math.round(capaDecided * (0.78 + unit(mix(seed, 29)) * 0.12));
  const capaClosed = Math.round(capaDecided * (0.7 + unit(mix(seed, 30)) * 0.15));
  const capaEffectiveness = Math.round(capaClosed * (0.55 + unit(mix(seed, 31)) * 0.2));
  const rcaOpened = Math.max(0, severeHarm + Math.round(withHarm * 0.15));
  const rcaClosed = Math.round(rcaOpened * (0.55 + unit(mix(seed, 32)) * 0.2));

  return {
    admissions, discharges, patientDays, reported, validated, nearMiss, withHarm, severeHarm,
    centralLineDays, catheterDays,
    clabsi: clabsiEvents, cauti: cautiEvents, procedures, ssi, cdi,
    hhEligible, hhCompliant, isolationEligible, isolationCompliant,
    clBundleEligible, clBundleCompliant, ucBundleEligible, ucBundleCompliant,
    auditsScheduled, auditsComplete, qualityNumerator, qualityDenominator,
    readmissions, eligibleDischarges, hapi, fallsInjury, postopComplications, surgicalDischarges,
    investigationsDecided, investigationsOnTime, classified,
    capaDecided, capaOnTime, capaClosed, capaEffectiveness, rcaOpened, rcaClosed,
  };
}

type Raw = {
  months: SiteMonth[];
  categoryValidated: number[];
  severityCounts: number[];
  deptValidated: number[];
  deptHai: number[];
  procedureSsi: number[];
  procedureVolume: number[];
  unitSurveillance: number[];
  unitCovered: number[];
};

function emptyMonth(): SiteMonth {
  return {
    admissions: 0, discharges: 0, patientDays: 0, reported: 0, validated: 0, nearMiss: 0, withHarm: 0, severeHarm: 0,
    centralLineDays: 0, catheterDays: 0, clabsi: 0, cauti: 0, procedures: 0, ssi: 0, cdi: 0,
    hhEligible: 0, hhCompliant: 0, isolationEligible: 0, isolationCompliant: 0,
    clBundleEligible: 0, clBundleCompliant: 0, ucBundleEligible: 0, ucBundleCompliant: 0,
    auditsScheduled: 0, auditsComplete: 0, qualityNumerator: 0, qualityDenominator: 0,
    readmissions: 0, eligibleDischarges: 0, hapi: 0, fallsInjury: 0, postopComplications: 0, surgicalDischarges: 0,
    investigationsDecided: 0, investigationsOnTime: 0, classified: 0,
    capaDecided: 0, capaOnTime: 0, capaClosed: 0, capaEffectiveness: 0, rcaOpened: 0, rcaClosed: 0,
  };
}

function addMonth(target: SiteMonth, source: SiteMonth): void {
  (Object.keys(target) as (keyof SiteMonth)[]).forEach((key) => {
    target[key] += source[key];
  });
}

function siteRaw(code: SiteCode, year: number, period: ReportPeriod): Raw {
  const meta = periodMeta(year, period);
  const months = meta.months.map((item) => siteMonth(code, year, item.monthIndex));
  const totals = emptyMonth();
  months.forEach((month) => addMonth(totals, month));
  const seed = hash(`${code}|${year}|${period}|qs-split`);
  const categoryValidated = splitExact(totals.validated, QS_INCIDENT_CATEGORIES.map((_, index) => 0.9 + unit(mix(seed, 40 + index))));
  const severityBase = [
    totals.nearMiss,
    Math.max(0, totals.validated - totals.nearMiss - totals.withHarm),
    Math.round(totals.withHarm * 0.45),
    Math.max(0, totals.withHarm - Math.round(totals.withHarm * 0.45) - totals.severeHarm),
    totals.severeHarm,
  ];
  // Normalize severity to validated
  const severitySum = sum(severityBase) || 1;
  const severityCounts = splitExact(totals.validated, severityBase.map((value) => Math.max(0.01, value / severitySum)));
  const deptValidated = splitExact(totals.validated, QS_DEPARTMENTS.map((_, index) => 0.85 + unit(mix(seed, 60 + index))));
  const haiTotal = totals.clabsi + totals.cauti + totals.ssi + totals.cdi;
  const deptHai = splitExact(haiTotal, QS_DEPARTMENTS.map((_, index) => 0.8 + unit(mix(seed, 80 + index))));
  const procedureSsi = splitExact(totals.ssi, QS_PROCEDURE_CATEGORIES.map((_, index) => 0.85 + unit(mix(seed, 100 + index))));
  const procedureVolume = splitExact(totals.procedures, QS_PROCEDURE_CATEGORIES.map((_, index) => 0.9 + unit(mix(seed, 120 + index))));
  const unitSurveillance = QS_DEPARTMENTS.map(() => 1);
  const coveredCount = Math.max(1, Math.round(QS_DEPARTMENTS.length * (0.82 + unit(mix(seed, 140)) * 0.12)));
  const unitCovered = QS_DEPARTMENTS.map((_, index) => (index < coveredCount ? 1 : 0));
  return { months, categoryValidated, severityCounts, deptValidated, deptHai, procedureSsi, procedureVolume, unitSurveillance, unitCovered };
}

function sumRaw(parts: Raw[]): Raw {
  const months = parts[0].months.map((_, index) => {
    const total = emptyMonth();
    parts.forEach((part) => addMonth(total, part.months[index]));
    return total;
  });
  const sumArr = (pick: (raw: Raw) => number[]) => {
    const length = pick(parts[0]).length;
    return Array.from({ length }, (_, index) => sum(parts.map((part) => pick(part)[index] ?? 0)));
  };
  return {
    months,
    categoryValidated: sumArr((raw) => raw.categoryValidated),
    severityCounts: sumArr((raw) => raw.severityCounts),
    deptValidated: sumArr((raw) => raw.deptValidated),
    deptHai: sumArr((raw) => raw.deptHai),
    procedureSsi: sumArr((raw) => raw.procedureSsi),
    procedureVolume: sumArr((raw) => raw.procedureVolume),
    unitSurveillance: sumArr((raw) => raw.unitSurveillance),
    unitCovered: sumArr((raw) => raw.unitCovered),
  };
}

const CACHE = new Map<string, ReturnType<typeof compute>>();

export function buildQsView(hospital: string, year: number, period: ReportPeriod = 'year') {
  const key = `${hospital}|${year}|${period}`;
  const cached = CACHE.get(key);
  if (cached) return cached;
  const view = compute(hospital, year, period);
  CACHE.set(key, view);
  return view;
}

export function clearQsViewCache(): void {
  CACHE.clear();
}

function compute(hospital: string, year: number, period: ReportPeriod) {
  const codes = SITE_CODES.includes(hospital as SiteCode) ? [hospital as SiteCode] : SITE_CODES;
  const raw = sumRaw(codes.map((code) => siteRaw(code, year, period)));
  return assemble(hospital, year, period, raw);
}

function assemble(hospital: string, year: number, period: ReportPeriod, raw: Raw) {
  const meta = periodMeta(year, period);
  const totals = emptyMonth();
  raw.months.forEach((month) => addMonth(totals, month));

  const validatedEventRate = totals.discharges > 0 ? (totals.validated / totals.discharges) * 1000 : 0;
  const haiCases = totals.clabsi + totals.cauti + totals.ssi + totals.cdi;
  const haiBurdenRate = density(haiCases, totals.patientDays);
  const qualityCompliance = ratio(totals.qualityNumerator, totals.qualityDenominator);
  const clabsiRate = density(totals.clabsi, totals.centralLineDays);
  const cautiRate = density(totals.cauti, totals.catheterDays);
  const ssiRate = ratio(totals.ssi, totals.procedures);
  const surveillanceCoverage = ratio(sum(raw.unitCovered), sum(raw.unitSurveillance));
  const handHygiene = ratio(totals.hhCompliant, totals.hhEligible);
  const isolationCompliance = ratio(totals.isolationCompliant, totals.isolationEligible);
  const ipAuditCompletion = ratio(totals.auditsComplete, totals.auditsScheduled);
  const clBundle = ratio(totals.clBundleCompliant, totals.clBundleEligible);
  const ucBundle = ratio(totals.ucBundleCompliant, totals.ucBundleEligible);
  const investigationTimeliness = ratio(totals.investigationsOnTime, totals.investigationsDecided);
  const classificationCompleteness = ratio(totals.classified, totals.reported);
  const readmissionRate = ratio(totals.readmissions, totals.eligibleDischarges);
  const pressureInjuryRate = density(totals.hapi, totals.patientDays);
  const fallsWithInjuryRate = density(totals.fallsInjury, totals.patientDays);
  const postopComplicationRate = ratio(totals.postopComplications, totals.surgicalDischarges);
  const capaOntime = ratio(totals.capaOnTime, totals.capaDecided);
  const effectivenessReviewRate = ratio(totals.capaEffectiveness, totals.capaClosed);

  // Stocks at observation — derived from period flows with deterministic residual open stock
  const seed = hash(`${hospital}|${year}|${period}|stocks`);
  const openRca = Math.max(0, totals.rcaOpened - totals.rcaClosed + Math.round(2 + unit(mix(seed, 1)) * 4));
  const overdueRca = Math.min(openRca, Math.round(openRca * (0.25 + unit(mix(seed, 2)) * 0.2)));
  const openCapa = Math.max(0, totals.capaDecided - totals.capaClosed + Math.round(3 + unit(mix(seed, 3)) * 6));
  const overdueHighRiskActions = Math.min(openCapa, Math.round(openCapa * (0.22 + unit(mix(seed, 4)) * 0.2) + overdueRca * 0.5));
  const preventionGaps = Math.max(0, Math.round((1 - Math.min(handHygiene, clBundle, ucBundle)) * 40 + unit(mix(seed, 5)) * 8));
  const outcomeReviewBacklog = Math.max(0, Math.round(totals.severeHarm * 1.2 + totals.readmissions * 0.08 + unit(mix(seed, 6)) * 5));
  const outcomeMeasureCoverage = 0.86 + unit(mix(seed, 7)) * 0.1;
  const recurringThemes = Math.max(1, Math.round(3 + unit(mix(seed, 8)) * 4));

  // Official SIR unavailable — demo exposes modeled index separately if needed
  const sirAvailable = false;
  const sirNote = 'Standardized Infection Ratio requires model-based predicted infections under versioned surveillance specs. Official SIR is unavailable in this demo.';

  const prioritySignals = [
    validatedEventRate > QS_TARGETS.validatedEventRate ? 1 : 0,
    totals.severeHarm > 0 ? 1 : 0,
    haiBurdenRate > QS_TARGETS.haiBurdenRate ? 1 : 0,
    qualityCompliance < QS_TARGETS.qualityCompliance ? 1 : 0,
    overdueHighRiskActions > 5 ? 1 : 0,
    clabsiRate > QS_TARGETS.clabsiRate ? 1 : 0,
    cautiRate > QS_TARGETS.cautiRate ? 1 : 0,
    handHygiene < QS_TARGETS.handHygiene ? 1 : 0,
  ].reduce((total, value) => total + value, 0);

  const modeledIncidentReduction = Math.round(totals.withHarm * 0.35);
  const modeledHaiPrevention = Math.round(haiCases * 0.3);
  const modeledComplianceUplift = r2(Math.min(0.12, Math.max(0, QS_TARGETS.handHygiene - handHygiene) + 0.04));
  const addressableGap = r1(Math.max(0, validatedEventRate - QS_TARGETS.validatedEventRate));
  const priorityActionCoverage = 0.7 + unit(mix(seed, 9)) * 0.2;

  const opportunities = QS_OPPORTUNITY_IDS.map((id) => {
    const metaOpp = OPPORTUNITY_META[id];
    const baselines: Record<QsOpportunityId, number> = {
      'qs-hh-up': handHygiene,
      'qs-bundle-up': Math.min(clBundle, ucBundle),
      'qs-infection-review-down': surveillanceCoverage,
      'qs-investigation-up': investigationTimeliness,
      'qs-capa-overdue-down': overdueHighRiskActions,
      'qs-observation-up': ratio(totals.hhEligible, Math.max(1, totals.hhEligible + preventionGaps * 4)),
      'qs-ssi-prevention-up': 1 - ssiRate,
      'qs-effectiveness-up': effectivenessReviewRate,
    };
    const eligible: Record<QsOpportunityId, number> = {
      'qs-hh-up': Math.round(totals.hhEligible * modeledComplianceUplift),
      'qs-bundle-up': Math.round((totals.clBundleEligible + totals.ucBundleEligible) * 0.12),
      'qs-infection-review-down': Math.round(outcomeReviewBacklog * 0.25 + haiCases * 0.15),
      'qs-investigation-up': Math.round(totals.investigationsDecided * 0.2),
      'qs-capa-overdue-down': Math.round(overdueHighRiskActions * 0.5),
      'qs-observation-up': Math.round(preventionGaps * 2 + totals.hhEligible * 0.08),
      'qs-ssi-prevention-up': Math.round(totals.procedures * 0.05),
      'qs-effectiveness-up': Math.round(totals.capaClosed * 0.25),
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
      additive: false,
    };
  });

  const labels = raw.months.map((_, index) => meta.months[index].label);
  const monthlyValidated = raw.months.map((month) => month.validated);
  const monthlyReported = raw.months.map((month) => month.reported);
  const monthlyHai = raw.months.map((month) => month.clabsi + month.cauti + month.ssi + month.cdi);
  const monthlyClabsiRate = raw.months.map((month) => r2(density(month.clabsi, month.centralLineDays)));
  const monthlyCautiRate = raw.months.map((month) => r2(density(month.cauti, month.catheterDays)));
  const monthlyHh = raw.months.map((month) => r2(ratio(month.hhCompliant, month.hhEligible) * 100));
  const monthlyOverdueProxy = raw.months.map((month, index) => Math.round(overdueHighRiskActions * (month.capaDecided / Math.max(1, totals.capaDecided)) * (0.8 + unit(mix(seed, 200 + index)) * 0.4)));
  const monthlyReadmit = raw.months.map((month) => r2(ratio(month.readmissions, month.eligibleDischarges) * 100));
  const monthlyCapaOntime = raw.months.map((month) => r2(ratio(month.capaOnTime, month.capaDecided) * 100));

  const kpiValues: Record<string, number> = {
    kpi_qs_validated_event_rate: validatedEventRate,
    kpi_qs_severe_harm_events: totals.severeHarm,
    kpi_qs_hai_burden_rate: haiBurdenRate,
    kpi_qs_quality_measure_compliance: qualityCompliance,
    kpi_qs_overdue_high_risk_actions: overdueHighRiskActions,
    kpi_qs_priority_safety_signals: prioritySignals,
    kpi_qs_reported_incidents: totals.reported,
    kpi_qs_validated_incidents: totals.validated,
    kpi_qs_near_miss_events: totals.nearMiss,
    kpi_qs_events_with_harm: totals.withHarm,
    kpi_qs_investigation_timeliness: investigationTimeliness,
    kpi_qs_classification_completeness: classificationCompleteness,
    kpi_qs_clabsi_rate: clabsiRate,
    kpi_qs_cauti_rate: cautiRate,
    kpi_qs_ssi_rate: ssiRate,
    kpi_qs_validated_hai_cases: haiCases,
    kpi_qs_cdi_events: totals.cdi,
    kpi_qs_surveillance_coverage: surveillanceCoverage,
    kpi_qs_hand_hygiene_compliance: handHygiene,
    kpi_qs_isolation_compliance: isolationCompliance,
    kpi_qs_ip_audit_completion: ipAuditCompletion,
    kpi_qs_cl_bundle_compliance: clBundle,
    kpi_qs_catheter_bundle_compliance: ucBundle,
    kpi_qs_prevention_gaps: preventionGaps,
    kpi_qs_readmission_rate: readmissionRate,
    kpi_qs_pressure_injury_rate: pressureInjuryRate,
    kpi_qs_falls_with_injury_rate: fallsWithInjuryRate,
    kpi_qs_postop_complication_rate: postopComplicationRate,
    kpi_qs_outcome_measure_coverage: outcomeMeasureCoverage,
    kpi_qs_outcome_review_backlog: outcomeReviewBacklog,
    kpi_qs_open_rca: openRca,
    kpi_qs_overdue_rca: overdueRca,
    kpi_qs_capa_ontime: capaOntime,
    kpi_qs_open_capa: openCapa,
    kpi_qs_recurring_themes: recurringThemes,
    kpi_qs_effectiveness_review_rate: effectivenessReviewRate,
    kpi_qs_addressable_gap: addressableGap,
    kpi_qs_modeled_incident_reduction: modeledIncidentReduction,
    kpi_qs_modeled_hai_prevention: modeledHaiPrevention,
    kpi_qs_modeled_compliance_uplift: modeledComplianceUplift,
    kpi_qs_priority_action_coverage: priorityActionCoverage,
  };

  const identities = {
    severitySumsToValidated: sum(raw.severityCounts) === totals.validated,
    categoriesSumToValidated: sum(raw.categoryValidated) === totals.validated,
    departmentsSumToValidated: sum(raw.deptValidated) === totals.validated,
    haiDepartmentsSum: sum(raw.deptHai) === haiCases,
    ssiProceduresSum: sum(raw.procedureSsi) === totals.ssi,
    procedureVolumeSum: sum(raw.procedureVolume) === totals.procedures,
    nearMissPlusRest: totals.nearMiss + Math.max(0, totals.validated - totals.nearMiss) === totals.validated,
    harmNotExceedValidated: totals.withHarm <= totals.validated,
    severeWithinHarm: totals.severeHarm <= totals.withHarm,
    hhCompliantWithinEligible: totals.hhCompliant <= totals.hhEligible,
    clabsiUsesDeviceDays: totals.centralLineDays > 0,
    cautiUsesDeviceDays: totals.catheterDays > 0,
    ssiUsesProcedures: totals.procedures > 0,
    sirNotFabricated: sirAvailable === false,
  };

  return {
    hospital,
    year,
    period,
    periodLabel: meta.periodLabel,
    observationDate: meta.observationDate,
    daysInPeriod: meta.days,
    labels,

    admissions: totals.admissions,
    discharges: totals.discharges,
    patientDays: totals.patientDays,
    reported: totals.reported,
    validated: totals.validated,
    nearMiss: totals.nearMiss,
    withHarm: totals.withHarm,
    severeHarm: totals.severeHarm,
    validatedEventRate: r1(validatedEventRate),
    haiBurdenRate: r2(haiBurdenRate),
    qualityCompliance,
    overdueHighRiskActions,
    prioritySignals,

    investigationTimeliness,
    classificationCompleteness,

    centralLineDays: totals.centralLineDays,
    catheterDays: totals.catheterDays,
    clabsi: totals.clabsi,
    cauti: totals.cauti,
    procedures: totals.procedures,
    ssi: totals.ssi,
    cdi: totals.cdi,
    haiCases,
    clabsiRate: r2(clabsiRate),
    cautiRate: r2(cautiRate),
    ssiRate,
    surveillanceCoverage,
    sirAvailable,
    sirNote,

    handHygiene,
    isolationCompliance,
    ipAuditCompletion,
    clBundle,
    ucBundle,
    preventionGaps,
    hhEligible: totals.hhEligible,
    hhCompliant: totals.hhCompliant,

    readmissionRate,
    pressureInjuryRate: r2(pressureInjuryRate),
    fallsWithInjuryRate: r2(fallsWithInjuryRate),
    postopComplicationRate,
    outcomeMeasureCoverage,
    outcomeReviewBacklog,
    eligibleDischarges: totals.eligibleDischarges,
    readmissions: totals.readmissions,
    hapi: totals.hapi,
    fallsInjury: totals.fallsInjury,
    surgicalDischarges: totals.surgicalDischarges,
    postopComplications: totals.postopComplications,

    openRca,
    overdueRca,
    openCapa,
    capaOntime,
    recurringThemes,
    effectivenessReviewRate,
    rcaOpened: totals.rcaOpened,
    rcaClosed: totals.rcaClosed,
    capaDecided: totals.capaDecided,
    capaClosed: totals.capaClosed,

    addressableGap,
    modeledIncidentReduction,
    modeledHaiPrevention,
    modeledComplianceUplift,
    priorityActionCoverage,
    opportunities,

    monthlyValidated,
    monthlyReported,
    monthlyHai,
    monthlyClabsiRate,
    monthlyCautiRate,
    monthlyHh,
    monthlyOverdueProxy,
    monthlyReadmit,
    monthlyCapaOntime,

    categoryRows: QS_INCIDENT_CATEGORIES.map((name, index) => ({ name, count: raw.categoryValidated[index] })),
    severityRows: QS_SEVERITY.map((name, index) => ({ name, count: raw.severityCounts[index] })),
    deptIncidentRows: QS_DEPARTMENTS.map((name, index) => ({ name, count: raw.deptValidated[index] })),
    deptHaiRows: QS_DEPARTMENTS.map((name, index) => ({ name, count: raw.deptHai[index] })),
    procedureRows: QS_PROCEDURE_CATEGORIES.map((name, index) => ({
      name,
      ssi: raw.procedureSsi[index],
      procedures: raw.procedureVolume[index],
    })),
    surveillanceRows: QS_DEPARTMENTS.map((name, index) => ({
      name,
      covered: raw.unitCovered[index] === 1,
    })),

    kpiValues,
    identities,
    methodology: {
      clinical: 'Clinical governance and operational intelligence only — not a diagnostic system, medical device, or autonomous infection-control engine. Authorized human review remains required.',
      incidents: 'Reporting volume ≠ underlying harm. Validated events are a reviewed subset of reports. Near miss ≠ harm event. The demo does not auto-classify sentinel events for regulation.',
      infections: 'CLABSI and CAUTI use device-day denominators; SSI uses eligible procedure counts. Rates are descriptive demo surveillance — not certified NHSN rates. Official SIR is unavailable without model-based predicted infections.',
      prevention: 'Hand-hygiene and bundle compliance use audited eligible opportunities only — not the universe of all care interactions. Process compliance does not prove infection reduction.',
      outcomes: 'Outcome rates are descriptive and not risk-adjusted quality rankings. Readmissions are same-facility only; cross-facility linkage is unavailable. Death counts do not imply avoidability.',
      rca: 'RCA and CAPA are learning-system workflows. Approval of an action is not evidence of measured improvement or effectiveness.',
      optimization: 'Eight what-if scenarios overlap and must not be summed. Modeled reductions are illustrative under assumptions — not measured results.',
      allMode: 'Hospital ALL is the exact sum of H1–H5 ledgers; rates are recomputed from summed numerators and denominators.',
    },
  };
}

export type QsView = ReturnType<typeof compute>;

export function qsIdentityIssues(view: QsView): string[] {
  return (Object.entries(view.identities) as [string, boolean][])
    .filter(([, ok]) => !ok)
    .map(([name]) => name);
}
