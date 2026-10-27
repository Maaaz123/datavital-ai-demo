import catalogKpis from './data/kpis.json';
import useCases from './data/useCases.json';

export type Origin = 'catalog' | 'registry' | 'demo_assumption';

export type KpiDef = {
  key: string;
  name: string;
  domain: string;
  unit: string;
  formula: string;
  numerator: string;
  denominator: string;
  source: string;
  columns: string;
  origin: Origin;
  note: string;
};

export type UseCaseDef = {
  key: string;
  name: string;
  objective: string;
  target: string;
  grain: string;
  horizon: string;
  review: string;
  status: 'SIMULATED';
};

export const DISCLAIMER = 'Interactive demo — synthetic data and simulated AI.';

export const HOSPITALS = [
  { code: 'ALL', name: 'All five hospitals', nameAr: 'المستشفيات الخمسة' },
  { code: 'H1', name: 'Demo General North', nameAr: 'المستشفى التجريبي الشمالي' },
  { code: 'H2', name: 'Demo General South', nameAr: 'المستشفى التجريبي الجنوبي' },
  { code: 'H3', name: 'Demo General East', nameAr: 'المستشفى التجريبي الشرقي' },
  { code: 'H4', name: 'Demo General West', nameAr: 'المستشفى التجريبي الغربي' },
  { code: 'H5', name: 'Demo General Central', nameAr: 'المستشفى التجريبي المركزي' },
] as const;

export const YEARS = [2024, 2025, 2026] as const;
export const DEPARTMENTS = [
  'All',
  'Emergency',
  'Inpatient',
  'Laboratory',
  'Surgery',
  'Pharmacy',
  'Revenue',
  'Experience',
] as const;

const ASSUMPTIONS: KpiDef[] = [
  assumption('demo_dialysis_session_volume', 'Dialysis session volume', 'Dialysis', 'count', 'NMR section 16 names dialysis. Column text is not in this demo, so this series is a labelled assumption.'),
  assumption('demo_satisfaction_index', 'Satisfaction index', 'Patient experience', 'ratio', 'No official survey field list was in the source pack. This index is a labelled demo assumption.'),
  assumption('demo_complaint_open_count', 'Open complaints', 'Patient experience', 'count', 'Complaint workflow counts are a labelled demo assumption, not an NMR extract.'),
  assumption('demo_survey_response_rate', 'Survey response rate', 'Patient experience', 'ratio', 'Survey response rate is a labelled demo assumption.'),
  assumption('demo_discharge_experience_index', 'Discharge experience index', 'Patient experience', 'ratio', 'Discharge-experience score is a labelled demo assumption.'),
  assumption('demo_followup_completion_rate', 'Follow-up completion rate', 'Patient experience', 'ratio', 'Follow-up completion is a labelled demo assumption.'),
  assumption('demo_service_recovery_closure_rate', 'Service recovery closure rate', 'Patient experience', 'ratio', 'Service-recovery closure is a labelled demo assumption.'),
  assumption('demo_hai_surveillance_rate', 'Infection surveillance signal', 'Infection prevention', 'ratio', 'IPC columns are not in NMR V1.5. This signal is a labelled demo assumption.'),
  assumption('demo_equipment_uptime', 'Equipment uptime', 'Biomedical equipment', 'ratio', 'No equipment dataset is in NMR V1.5. Uptime is a labelled demo assumption.'),
  assumption('demo_morgue_release_hours', 'Morgue release hours', 'Morgue', 'hours', 'NMR section 15 names morgue. Columns are absent, so hours are a labelled demo assumption.'),
  assumption('demo_birth_encounter_volume', 'Birth encounter volume', 'Maternal and neonatal', 'count', 'NMR section 6 names childbirth. Columns are absent, so volume is a labelled demo assumption.'),
  assumption('demo_eligibility_check_volume', 'Eligibility check volume', 'Eligibility', 'count', 'NMR section 17 names eligibility. Columns are absent, so volume is a labelled demo assumption.'),
];

function assumption(key: string, name: string, domain: string, unit: string, note: string): KpiDef {
  return {
    key,
    name,
    domain,
    unit,
    formula: note,
    numerator: 'demo assumption',
    denominator: unit === 'ratio' ? 'demo assumption denominator' : '1',
    source: 'demo assumption — not an official NMR field',
    columns: '',
    origin: 'demo_assumption',
    note,
  };
}

export const KPIS: KpiDef[] = [...(catalogKpis as KpiDef[]), ...ASSUMPTIONS];
export const USE_CASES: UseCaseDef[] = useCases as UseCaseDef[];

export function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function demoValue(kpi: KpiDef, hospital: string, year: number, department = 'All'): number {
  const codes = hospital === 'ALL' ? ['H1', 'H2', 'H3', 'H4', 'H5'] : [hospital];
  const values = codes.map((code) => oneValue(kpi, code, year, department));
  if (kpi.unit === 'ratio' || kpi.unit.includes('rate')) {
    return Math.round((values.reduce((s, n) => s + n, 0) / values.length) * 1000) / 1000;
  }
  return Math.round(values.reduce((s, n) => s + n, 0) * 10) / 10;
}

function oneValue(kpi: KpiDef, hospital: string, year: number, department: string): number {
  const h = hash(`${kpi.key}|${hospital}|${year}|${department}`);
  if (kpi.unit === 'ratio' || kpi.unit.includes('rate')) {
    return Math.round((0.18 + (h % 6400) / 10000) * 1000) / 1000;
  }
  if (kpi.unit === 'hours' || kpi.unit === 'days' || kpi.unit.includes('minute')) {
    return Math.round((6 + (h % 540) / 10) * 10) / 10;
  }
  return 40 + (h % 3600);
}

export function series(kpi: KpiDef, hospital: string, year: number, department = 'All'): number[] {
  return Array.from({ length: 12 }, (_, month) => {
    const h = hash(`${kpi.key}|${hospital}|${year}|${department}|${month}`);
    const base = demoValue(kpi, hospital, year, department);
    const swing = kpi.unit === 'ratio' || kpi.unit.includes('rate') ? ((h % 80) - 40) / 1000 : ((h % 20) - 10) / 100;
    const value = base * (1 + swing);
    return kpi.unit === 'ratio' || kpi.unit.includes('rate')
      ? Math.round(Math.min(0.98, Math.max(0.02, value)) * 1000) / 1000
      : Math.round(value * 10) / 10;
  });
}

export function formatValue(kpi: KpiDef, value: number): string {
  if (kpi.unit === 'ratio' || kpi.unit.includes('rate')) return `${(value * 100).toFixed(1)}%`;
  if (Number.isInteger(value)) return `${value.toLocaleString('en-US')} ${kpi.unit}`;
  return `${value.toLocaleString('en-US')} ${kpi.unit}`;
}

export function trend(kpi: KpiDef, hospital: string, year: number, department = 'All') {
  const current = demoValue(kpi, hospital, year, department);
  const prior = demoValue(kpi, hospital, Math.max(2024, year - 1), department);
  const delta = Math.round((current - prior) * 1000) / 1000;
  return { current, prior, delta, direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat' };
}

export function needsCohortReview(kpi: KpiDef): boolean {
  return /mortality|sepsis|deteriorat|diagnosis|icu_transfer|readmission|vital|birth|morgue/i.test(
    `${kpi.key} ${kpi.domain}`,
  );
}

export function kpisForDomains(domains: string[]): KpiDef[] {
  const wanted = new Set(domains);
  return KPIS.filter((kpi) => wanted.has(kpi.domain)).sort((a, b) => a.name.localeCompare(b.name));
}

export function findKpi(key: string): KpiDef | undefined {
  return KPIS.find((kpi) => kpi.key === key);
}
