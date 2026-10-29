import { EXTENSIONS, SCREENS, type ScreenDef } from '@/showcase/catalog';

export type ChartKind = 'wait' | 'census' | 'beds' | 'claims' | 'hospitals' | 'journey' | 'ledger' | 'workforce' | 'acuity' | 'trust';

export type AreaId = 'executive' | 'clinical' | 'financial' | 'experience' | 'quality' | 'workforce' | 'ai' | 'governance' | 'admin';

const FEATURED: Record<string, string[]> = {
  hub: ['kpi_bed_occupancy_rate', 'kpi_ed_door_to_provider_median_minutes', 'kpi_claim_denied_rate', 'demo_satisfaction_index'],
  command: ['kpi_bed_occupancy_rate', 'kpi_ed_door_to_provider_median_minutes', 'kpi_claim_denied_rate', 'kpi_rcm_outstanding_ar'],
  stability: ['kpi_ed_door_to_provider_median_minutes', 'kpi_ed_door_to_provider_p90_minutes', 'kpi_bed_occupancy_rate', 'kpi_ed_to_admission_rate'],
  journey: ['kpi_ed_door_to_provider_median_minutes', 'kpi_ed_los_median_minutes', 'kpi_inpatient_median_los_days', 'kpi_outpatient_median_wait_minutes'],
  revenue: ['kpi_rcm_gross_charge_amount', 'kpi_rcm_allowed_amount', 'kpi_revenue_collection_rate', 'kpi_rcm_outstanding_ar'],
  risk: ['kpi_ed_boarding_gt_4h_rate', 'kpi_bed_occupancy_rate', 'kpi_readmission_30d_rate', 'kpi_claim_denied_rate'],
  actions: ['kpi_bed_occupancy_rate', 'kpi_claim_denied_rate', 'demo_complaint_open_count', 'kpi_wf_vacancy_rate'],
  comparison: ['kpi_bed_occupancy_rate', 'kpi_ed_door_to_provider_median_minutes', 'kpi_claim_denied_rate', 'demo_satisfaction_index'],
  emergency: ['kpi_ed_door_to_provider_median_minutes', 'kpi_ed_door_to_provider_p90_minutes', 'kpi_ed_avg_los_hours', 'kpi_ed_to_admission_rate'],
  beds: ['kpi_bed_occupancy_rate', 'kpi_bed_available_rate_status', 'kpi_bed_icu_occupancy_rate', 'kpi_bed_staffed_count'],
  inpatient: ['kpi_inpatient_avg_los_days', 'kpi_inpatient_avg_los_hours', 'kpi_inpatient_median_los_days', 'kpi_inpatient_p90_los_days'],
  outpatient: ['kpi_outpatient_avg_wait_minutes', 'kpi_outpatient_median_wait_minutes', 'kpi_outpatient_p90_wait_minutes', 'kpi_appointment_volume'],
  appointments: ['kpi_appointment_no_show_rate', 'kpi_appointment_cancellation_rate', 'kpi_appointment_slot_fill_rate', 'kpi_appointment_volume'],
  dialysis: ['demo_dialysis_session_volume'],
  mortality: ['kpi_mortality_event_volume', 'kpi_ed_mortality_rate', 'kpi_dx_in_hospital_mortality_rate', 'kpi_surg_30d_mortality_rate'],
  surgery: ['kpi_surg_case_request_volume', 'kpi_surg_completed_cases', 'kpi_surg_cancellation_rate', 'kpi_surg_median_turnover_minutes'],
  laboratory: ['kpi_lab_order_volume', 'kpi_lab_tat_avg_minutes', 'kpi_lab_tat_median_minutes', 'kpi_lab_order_completed_rate'],
  radiology: ['kpi_radiology_order_volume', 'kpi_rad_median_report_tat_minutes', 'kpi_rad_no_show_rate', 'kpi_rad_exam_completion_rate'],
  pharmacy: ['kpi_med_order_volume', 'kpi_med_dispense_volume', 'kpi_med_admin_volume', 'kpi_med_order_cancelled_rate'],
  experience: ['demo_satisfaction_index', 'demo_survey_response_rate', 'demo_complaint_open_count', 'demo_service_recovery_closure_rate'],
  registry: ['kpi_patient_active_count', 'kpi_patient_new_count', 'kpi_patient_encounters_per_patient', 'kpi_encounter_volume'],
  diagnoses: ['kpi_dx_documentation_rate', 'kpi_dx_avg_diagnoses_per_encounter', 'kpi_dx_in_hospital_mortality_rate', 'kpi_dx_30d_readmission_rate'],
  rcm: ['kpi_rcm_gross_charge_amount', 'kpi_rcm_allowed_amount', 'kpi_revenue_collection_rate', 'kpi_rcm_outstanding_ar'],
  claims: ['kpi_claim_volume', 'kpi_denial_volume', 'kpi_claim_denied_rate', 'kpi_claim_paid_rate'],
  workforce: ['kpi_wf_active_fte', 'kpi_wf_vacancy_rate', 'kpi_wf_staffing_coverage', 'kpi_wf_overtime_rate'],
  access: ['kpi_wf_active_headcount', 'kpi_provider_count', 'kpi_department_count', 'kpi_hospital_facility_count'],
  audit: ['kpi_pipeline_landing_stream_count', 'kpi_dq_admission_future_row_count', 'kpi_pipeline_max_freshness_lag_hours', 'kpi_encounter_volume'],
  quality: ['kpi_dq_admission_null_pk_rate', 'kpi_dq_admission_future_row_count', 'kpi_pipeline_max_freshness_lag_hours', 'kpi_admission_volume'],
  'quality-detail': ['kpi_dq_lab_result_missing_encounter_count', 'kpi_dq_orphan_discharge_count', 'kpi_pipeline_max_freshness_lag_hours', 'kpi_lab_order_volume'],
  metadata: ['kpi_ai_support_encounter_patient_coverage', 'kpi_forecast_support_admission_series_completeness', 'kpi_department_count', 'kpi_hospital_facility_count'],
  'kpi-catalog': ['kpi_admission_volume', 'kpi_bed_staffed_count', 'kpi_lab_order_volume', 'kpi_claim_volume'],
  'semantic-views': ['kpi_pipeline_landing_stream_count', 'kpi_encounter_volume', 'kpi_admission_volume', 'kpi_department_count'],
  'verified-queries': ['kpi_pipeline_landing_rowcount_total', 'kpi_pipeline_run_volume', 'kpi_pipeline_run_failure_rate', 'kpi_pipeline_max_freshness_lag_hours'],
  'ai-overview': ['kpi_ed_door_to_provider_median_minutes', 'kpi_bed_occupancy_rate', 'kpi_claim_denied_rate', 'demo_satisfaction_index'],
  'ai-cases': ['kpi_readmission_30d_rate', 'kpi_ed_72h_revisit_rate', 'kpi_lab_tat_avg_minutes', 'kpi_claim_denied_rate'],
  'ai-case': ['kpi_ed_door_to_provider_median_minutes', 'kpi_ed_avg_los_hours', 'kpi_ed_to_admission_rate', 'kpi_bed_occupancy_rate'],
  predictions: ['kpi_bed_occupancy_rate', 'kpi_ed_door_to_provider_median_minutes', 'kpi_admission_volume', 'kpi_forecast_support_admission_series_completeness'],
  insights: ['kpi_ed_door_to_provider_median_minutes', 'kpi_claim_denied_rate', 'kpi_bed_occupancy_rate', 'demo_satisfaction_index'],
  assistant: ['kpi_ed_door_to_provider_median_minutes', 'kpi_claim_denied_rate', 'kpi_bed_occupancy_rate', 'demo_satisfaction_index'],
  'clinical-quality': ['kpi_surg_postop_complication_rate', 'kpi_readmission_30d_rate', 'kpi_med_safety_event_volume', 'kpi_dx_in_hospital_mortality_rate'],
  'infection-prevention': ['demo_hai_surveillance_rate'],
  'supply-chain': ['kpi_pharmacy_demand_units', 'kpi_med_order_volume', 'kpi_med_dispense_volume'],
  'biomedical-equipment': ['demo_equipment_uptime'],
  'ai-governance': ['kpi_ai_support_los_label_coverage', 'kpi_financial_ai_support_claim_feature_readiness', 'kpi_forecast_support_encounter_series_completeness', 'kpi_pipeline_max_freshness_lag_hours'],
  'patient-experience': ['demo_satisfaction_index', 'demo_discharge_experience_index', 'demo_followup_completion_rate', 'demo_survey_response_rate'],
  'ward-transfer': ['kpi_transfer_volume', 'kpi_ed_to_admission_rate', 'kpi_bed_occupancy_rate', 'kpi_net_census_change'],
  morgue: ['demo_morgue_release_hours', 'kpi_mortality_event_volume'],
  'maternal-neonatal': ['demo_birth_encounter_volume'],
  'assessments-vitals': ['kpi_vital_sign_volume', 'kpi_inpatient_avg_los_hours', 'kpi_inpatient_median_los_days'],
  eligibility: ['demo_eligibility_check_volume', 'kpi_claim_volume', 'kpi_authorization_volume', 'kpi_claim_denied_rate'],
  'pre-authorization': ['kpi_authorization_volume', 'kpi_authorization_denied_rate', 'kpi_surg_case_request_volume', 'kpi_claim_denied_rate'],
  'claims-processing': ['kpi_claim_volume', 'kpi_claim_paid_rate', 'kpi_claim_denied_rate', 'kpi_rcm_clean_claim_rate'],
  'billing-collections': ['kpi_rcm_payments_collected', 'kpi_rcm_outstanding_ar', 'kpi_revenue_collection_rate', 'kpi_rcm_net_days_in_ar'],
};

const KIND: Record<string, ChartKind> = {
  hub: 'hospitals',
  command: 'hospitals',
  stability: 'wait',
  journey: 'journey',
  revenue: 'ledger',
  risk: 'wait',
  actions: 'journey',
  comparison: 'hospitals',
  emergency: 'wait',
  beds: 'beds',
  inpatient: 'census',
  outpatient: 'census',
  appointments: 'census',
  dialysis: 'census',
  mortality: 'census',
  surgery: 'census',
  laboratory: 'census',
  radiology: 'wait',
  pharmacy: 'claims',
  experience: 'journey',
  registry: 'hospitals',
  diagnoses: 'acuity',
  rcm: 'ledger',
  claims: 'claims',
  workforce: 'workforce',
  access: 'trust',
  audit: 'trust',
  quality: 'trust',
  'quality-detail': 'trust',
  metadata: 'trust',
  'kpi-catalog': 'trust',
  'semantic-views': 'trust',
  'verified-queries': 'trust',
  'ai-overview': 'hospitals',
  'ai-cases': 'wait',
  'ai-case': 'wait',
  predictions: 'census',
  insights: 'hospitals',
  assistant: 'wait',
  'clinical-quality': 'census',
  'infection-prevention': 'census',
  'supply-chain': 'claims',
  'biomedical-equipment': 'beds',
  'ai-governance': 'trust',
  'patient-experience': 'journey',
  'ward-transfer': 'census',
  morgue: 'journey',
  'maternal-neonatal': 'census',
  'assessments-vitals': 'census',
  eligibility: 'ledger',
  'pre-authorization': 'claims',
  'claims-processing': 'claims',
  'billing-collections': 'ledger',
};

export const AREAS: { id: AreaId; title: string; titleAr: string; lede: string; screens: string[] }[] = [
  {
    id: 'executive',
    title: 'Executive Intelligence',
    titleAr: 'الذكاء التنفيذي',
    lede: 'One picture of pressure, flow, and money before anyone opens a department.',
    screens: ['hub', 'command', 'stability', 'journey', 'revenue', 'risk', 'actions', 'comparison'],
  },
  {
    id: 'clinical',
    title: 'Clinical Operations',
    titleAr: 'العمليات السريرية',
    lede: 'Emergency, beds, stays, theatres, laboratory, imaging, and pharmacy each keep their own picture.',
    screens: ['emergency', 'beds', 'inpatient', 'outpatient', 'appointments', 'dialysis', 'mortality', 'surgery', 'laboratory', 'radiology', 'pharmacy', 'diagnoses', 'ward-transfer', 'assessments-vitals', 'maternal-neonatal', 'morgue'],
  },
  {
    id: 'financial',
    title: 'Financial Performance',
    titleAr: 'الذكاء المالي',
    lede: 'Claims, denials, authorizations, and collections stay inside one reconciled ledger.',
    screens: ['rcm', 'claims', 'eligibility', 'pre-authorization', 'claims-processing', 'billing-collections'],
  },
  {
    id: 'experience',
    title: 'Patient Experience',
    titleAr: 'تجربة المريض',
    lede: 'Satisfaction, complaints, discharge, follow-up, and recovery as one human journey.',
    screens: ['experience', 'patient-experience', 'registry'],
  },
  {
    id: 'quality',
    title: 'Quality & Patient Safety',
    titleAr: 'الجودة والسلامة',
    lede: 'Safety signals and infection surveillance, each on its own cohort.',
    screens: ['clinical-quality', 'infection-prevention'],
  },
  {
    id: 'ai',
    title: 'AI & Decision Intelligence',
    titleAr: 'الذكاء والقرارات',
    lede: 'Decision patterns stay estimates until a named person reviews them.',
    screens: ['ai-governance', 'ai-overview', 'ai-cases', 'ai-case', 'predictions', 'insights', 'assistant'],
  },
  {
    id: 'governance',
    title: 'Performance & Data Governance',
    titleAr: 'حوكمة البيانات',
    lede: 'Measure coverage, evidence, and reporting quality for administrators.',
    screens: ['audit', 'quality', 'quality-detail', 'metadata', 'kpi-catalog', 'semantic-views', 'verified-queries'],
  },
  {
    id: 'admin',
    title: 'Administration & Settings',
    titleAr: 'الإدارة',
    lede: 'Who may review a management action.',
    screens: ['access'],
  },
  {
    id: 'workforce',
    title: 'Workforce & Resources',
    titleAr: 'القوى العاملة والموارد',
    lede: 'Staffing, supply pressure, and equipment uptime, each labelled for what the source actually contains.',
    screens: ['workforce', 'supply-chain', 'biomedical-equipment'],
  },
];

export function allScreens(): ScreenDef[] {
  return [...SCREENS, ...EXTENSIONS];
}

export function findScreen(id: string): ScreenDef | undefined {
  return allScreens().find((item) => item.id === id);
}

export function featuredKpis(id: string): string[] {
  const keys = FEATURED[id];
  if (!keys) throw new Error(`Missing KPI selection for ${id}`);
  return keys;
}

export function chartKind(id: string): ChartKind {
  const kind = KIND[id];
  if (!kind) throw new Error(`Missing chart kind for ${id}`);
  return kind;
}

export function areaFor(id: string): AreaId {
  return AREAS.find((area) => area.screens.includes(id))?.id ?? 'executive';
}

export const CHALLENGES = [
  { problem: 'Fragmented systems', intelligence: 'One semantic core for the same encounter, bed, and claim.', decision: 'Review a shared definition before comparing hospitals.', outcome: 'Leaders see one occupancy figure, not three extracts.' },
  { problem: 'Inconsistent KPI definitions', intelligence: 'Every catalog key maps to a named numerator and denominator.', decision: 'Open the KPI before acting on a percentage.', outcome: 'The catalog and the workspace show the same integer.' },
  { problem: 'Delayed decisions', intelligence: 'Detection shows what moved against the prior year.', decision: 'A named lead reviews the hypothesis list.', outcome: 'The outcome stage stays blank until that review is recorded.' },
  { problem: 'Emergency congestion', intelligence: 'Door-to-provider wait is separate from total ED stay.', decision: 'Review midday coverage against the wait, not the length of stay.', outcome: 'The story can illustrate a shorter tail. It is not a forecast.' },
  { problem: 'Bed pressure', intelligence: 'Occupied, available, and blocked beds sum to staffed beds.', decision: 'Look at discharge-ready patients before opening beds.', outcome: 'The snapshot identity is the check, not a second chart.' },
  { problem: 'Revenue leakage', intelligence: 'Billed, adjustment, allowed, collections, write-off, and outstanding reconcile.', decision: 'Review denials as a share of submitted claims.', outcome: 'Write-off stays inside the allowed amount.' },
  { problem: 'Quality and safety', intelligence: 'Mortality and readmission stay on their own cohorts.', decision: 'Keep the review at cohort level.', outcome: 'No individual patient prediction is offered.' },
  { problem: 'Staff constraints', intelligence: 'Vacancy is required FTE minus filled FTE.', decision: 'Scale a department only with its staffing share.', outcome: 'Rates stay hospital-level. Counts can narrow.' },
  { problem: 'Patient experience', intelligence: 'Satisfaction, response rate, and open complaints move together.', decision: 'Start with discharge instructions and the day-7 call.', outcome: 'Closing a case is a demo step, not a measured hospital result.' },
  { problem: 'Actions that are not followed', intelligence: 'Approval is stored for this KPI, hospital, year, and department.', decision: 'Changing hospital does not carry the decision across.', outcome: 'Impact is labelled hypothetical.' },
];

export const LAYERS = [
  { id: 'sources', name: 'Hospital data sources', body: 'HIS, EHR, laboratory, radiology, pharmacy, ERP, HR, and patient feedback are named as sources. None of them is connected in this demo.' },
  { id: 'core', name: 'Global data and semantic core', body: 'Entities, KPI definitions, data-quality checks, and provenance live here. Catalog, registry, and demo assumptions stay distinct.' },
  { id: 'intelligence', name: 'Healthcare intelligence', body: 'Analytics, detection, and investigation use the curated scenario. Predictions are illustrations, not implemented models.' },
  { id: 'action', name: 'Decision and action', body: 'A recommendation waits for a person. Approval and outcome are hypothetical and stored only in this browser.' },
  { id: 'settings', name: 'Configuration', body: 'Country, hospital, language, currency, and targets change the preview. They do not claim regulatory alignment.' },
];

export const PRESENTATION = [
  { id: 'challenge', title: 'The hospital challenge', href: '/challenge', body: 'Information is split across systems, so leaders argue about the number before they can act.' },
  { id: 'why', title: 'Why DataVital', href: '/solution', body: 'One platform connects clinical, operational, financial, and experience signals, then asks a person to decide.' },
  { id: 'architecture', title: 'Global Core', href: '/architecture', body: 'Sources, definitions, intelligence, action, and local settings are separate layers. Integrations are not live.' },
  { id: 'command', title: 'Executive command', href: '/story/command', body: 'Occupancy, door-to-provider wait, denials, and outstanding are the same measures as the KPI pages.' },
  { id: 'emergency', title: 'Emergency pressure', href: '/story/emergency', body: 'Waiting to see a provider is not the same measure as total time in the department.' },
  { id: 'detect', title: 'Detection', href: '/kpis/kpi_ed_door_to_provider_median_minutes', body: 'Open the wait indicator and see what changed against the prior year.' },
  { id: 'recommend', title: 'A simulated recommendation', href: '/kpis/kpi_ed_door_to_provider_median_minutes', body: 'The action is a review for a named lead. It is not an order to a hospital.' },
  { id: 'approve', title: 'Human approval', href: '/kpis/kpi_ed_door_to_provider_median_minutes', body: 'Approval is demo-only and scoped to this hospital, year, and department.' },
  { id: 'outcome', title: 'Illustrative outcome', href: '/kpis/kpi_ed_door_to_provider_median_minutes', body: 'Nothing is shown as a measured result until that scoped approval exists.' },
  { id: 'experience', title: 'Patient experience', href: '/experience', body: 'Satisfaction, complaints, discharge, and recovery sit beside the operational numbers.' },
  { id: 'settings', title: 'Global settings', href: '/settings', body: 'Preview Canada, Saudi Arabia, the United Kingdom, or the United States without claiming a certified configuration.' },
  { id: 'close', title: 'From data to a decision', href: '/', body: 'DataVital Global Core is a conceptual product. The figures are synthetic. The AI is simulated.' },
];
