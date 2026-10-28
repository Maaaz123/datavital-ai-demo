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
