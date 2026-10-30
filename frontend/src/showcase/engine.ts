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

export const DISCLAIMER = 'Illustrative hospital data and simulated AI insights — not live clinical or financial records.';

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
  assumption('kpi_appointment_unfilled_released_slots', 'Unfilled released appointment slots', 'Appointments', 'count', 'Released slots without a confirmed replacement booking. Derived from the appointment recovery lifecycle.'),
  assumption('kpi_rad_imaging_requests', 'Diagnostic imaging requests', 'Radiology', 'count', 'Imaging request volume from the Radiology Command view.'),
  assumption('kpi_rad_completion_rate', 'Imaging exam completion rate', 'Radiology', 'ratio', 'Completed exams ÷ imaging requests from the Radiology Command view.'),
  assumption('kpi_rad_urgent_share', 'Urgent imaging exam share', 'Radiology', 'ratio', 'Urgent requests ÷ imaging requests from the Radiology Command view.'),
  assumption('kpi_rad_imaging_backlog', 'Active diagnostic imaging backlog', 'Radiology', 'count', 'Closing imaging waitlist from the Radiology Access view.'),
  assumption('kpi_rad_median_access_wait', 'Median request-to-exam wait time', 'Radiology', 'days', 'Median request-to-exam wait from the Radiology Access view.'),
  assumption('kpi_rad_p90_access_wait', 'P90 request-to-exam wait time', 'Radiology', 'days', 'P90 request-to-exam wait from the Radiology Access view.'),
  assumption('kpi_rad_overdue_imaging', 'Imaging cases beyond access target', 'Radiology', 'count', 'Overdue imaging waitlist cases from the Radiology Access view.'),
  assumption('kpi_rad_waitlist_growth', 'Imaging waitlist growth', 'Radiology', 'count', 'Closing minus opening imaging backlog for the selected period.'),
  assumption('kpi_rad_within_access_target', 'Imaging cases within access target', 'Radiology', 'ratio', 'Within-target share of closing imaging backlog.'),
  assumption('kpi_rad_scanner_utilization', 'Diagnostic scanner utilization', 'Radiology', 'ratio', 'Used exam hours ÷ staffed scanner hours from the Radiology Utilization view.'),
  assumption('kpi_rad_unused_scanner_hours', 'Unused staffed scanner hours', 'Radiology', 'hours', 'Unused staffed scanner hours from the Radiology Utilization view.'),
  assumption('kpi_rad_median_exam_duration', 'Median examination duration', 'Radiology', 'minutes', 'Volume-weighted median exam duration from the Radiology Utilization view.'),
  assumption('kpi_rad_scanner_downtime', 'Diagnostic scanner downtime', 'Radiology', 'hours', 'Scanner downtime hours inside staffed sessions.'),
  assumption('kpi_rad_schedule_adherence', 'Imaging schedule adherence rate', 'Radiology', 'ratio', 'On-schedule exam starts from the Radiology Utilization view.'),
  assumption('kpi_rad_median_report_tat', 'Median final report turnaround time', 'Radiology', 'hours', 'Median final report TAT (signature − exam completion) from the Radiology Quality view.'),
  assumption('kpi_rad_p90_report_tat', 'P90 final report turnaround time', 'Radiology', 'hours', 'P90 final report TAT from the Radiology Quality view.'),
  assumption('kpi_rad_reports_over_target', 'Final reports over TAT target', 'Radiology', 'count', 'Completed reports beyond the illustrative TAT target.'),
  assumption('kpi_rad_unsigned_reports', 'Unsigned diagnostic reports', 'Radiology', 'count', 'Open unsigned report backlog at observation.'),
  assumption('kpi_rad_critical_ack_rate', 'Critical result acknowledgement rate', 'Radiology', 'ratio', 'Acknowledged critical results ÷ critical results.'),
  assumption('kpi_rad_recoverable_hours', 'Potentially recoverable scanner hours', 'Radiology', 'hours', 'Exclusive recoverable scanner hours from Radiology Optimization.'),
  assumption('kpi_rad_additional_exams', 'Feasible additional imaging exams', 'Radiology', 'count', 'Feasible extra exams under capacity constraints.'),
  assumption('kpi_rad_eligible_waitlist', 'Eligible imaging waitlist cases', 'Radiology', 'count', 'Waitlist cases that could use recovered capacity.'),
  assumption('kpi_rad_ct_downtime', 'CT scanner downtime hours', 'Radiology', 'hours', 'CT-specific downtime inside staffed CT sessions from Radiology Utilization view.'),
  assumption('kpi_rad_critical_delay_rate', 'Critical result communication delay rate', 'Radiology', 'ratio', 'Pending critical acknowledgements ÷ critical results from Radiology Quality view.'),
  assumption('kpi_lab_test_orders', 'Laboratory test orders', 'Laboratory', 'count', 'Unique laboratory orders from the Laboratory Command view.'),
  assumption('kpi_lab_completed_tests', 'Completed laboratory tests', 'Laboratory', 'count', 'Released test results from the Laboratory Command view.'),
  assumption('kpi_lab_stat_share', 'Stat priority test share', 'Laboratory', 'ratio', 'STAT tests ÷ test items from the Laboratory Command view.'),
  assumption('kpi_lab_samples_received', 'Samples received by laboratory', 'Laboratory', 'count', 'Distinct received specimens from Laboratory Samples view.'),
  assumption('kpi_lab_rejection_rate', 'Specimen rejection rate', 'Laboratory', 'ratio', 'Rejected ÷ assessed specimens from Laboratory Samples view.'),
  assumption('kpi_lab_transport_time', 'Median specimen transport time', 'Laboratory', 'minutes', 'Median collection-to-receipt from Laboratory Samples view.'),
  assumption('kpi_lab_hemolysis_rate', 'Hemolyzed specimen rate', 'Laboratory', 'ratio', 'Hemolyzed ÷ assessed specimens from Laboratory Samples view.'),
  assumption('kpi_lab_analyzer_utilization', 'Analyzer utilization', 'Laboratory', 'ratio', 'In-session ÷ staffed analyzer hours from Laboratory Analyzers view.'),
  assumption('kpi_lab_analyzer_downtime', 'Chemistry analyzer downtime hours', 'Laboratory', 'hours', 'Chemistry-specific downtime from Laboratory Analyzers view.'),
  assumption('kpi_lab_unused_analyzer_hours', 'Unused staffed analyzer hours', 'Laboratory', 'hours', 'Unused staffed analyzer hours from Laboratory Analyzers view.'),
  assumption('kpi_lab_testing_backlog', 'Laboratory testing backlog', 'Laboratory', 'count', 'Pending analysis cohort from Laboratory Analyzers view.'),
  assumption('kpi_lab_tests_per_hour', 'Tests per analyzer hour', 'Laboratory', 'multiplier', 'Completed tests ÷ in-session hours from Laboratory Analyzers view.'),
  assumption('kpi_lab_median_tat', 'Median laboratory result TAT', 'Laboratory', 'hours', 'Median receipt-to-release TAT in hours from Laboratory Quality view.'),
  assumption('kpi_lab_p90_tat', 'P90 laboratory result TAT', 'Laboratory', 'hours', 'P90 receipt-to-release TAT from Laboratory Quality view.'),
  assumption('kpi_lab_over_target', 'Results exceeding TAT target', 'Laboratory', 'count', 'Released results beyond illustrative TAT target.'),
  assumption('kpi_lab_pending_validation', 'Results awaiting validation', 'Laboratory', 'count', 'Open validation queue from Laboratory Quality view.'),
  assumption('kpi_lab_critical_notify_rate', 'Critical result notification rate', 'Laboratory', 'ratio', 'Notified ÷ critical results from Laboratory Quality view.'),
  assumption('kpi_lab_critical_delay_rate', 'Critical result communication delay rate', 'Laboratory', 'ratio', 'Pending critical communication ÷ critical results from Laboratory Quality view.'),
  assumption('kpi_lab_corrected_report_rate', 'Corrected laboratory report rate', 'Laboratory', 'ratio', 'Corrected ÷ released results from Laboratory Quality view.'),
  assumption('kpi_lab_recoverable_hours', 'Potentially recoverable lab hours', 'Laboratory', 'hours', 'Exclusive recoverable lab hours from Laboratory Optimization.'),
  assumption('kpi_lab_additional_tests', 'Feasible additional testing capacity', 'Laboratory', 'count', 'Feasible extra tests under capacity constraints.'),
  assumption('kpi_lab_eligible_backlog', 'Eligible testing backlog', 'Laboratory', 'count', 'Backlog that could use recovered capacity.'),
  assumption('kpi_rx_med_orders', 'Medication orders', 'Pharmacy', 'count', 'Unique medication orders from the Pharmacy Command view.'),
  assumption('kpi_rx_verified_orders', 'Pharmacist-verified orders', 'Pharmacy', 'count', 'Orders that cleared pharmacist verification from the Pharmacy Command view.'),
  assumption('kpi_rx_dispensed_lines', 'Dispensed medication lines', 'Pharmacy', 'count', 'Dispensed order lines from the Pharmacy Command view.'),
  assumption('kpi_rx_dispensing_completion', 'Dispensing completion rate', 'Pharmacy', 'ratio', 'Dispensed lines ÷ handled lines from the Pharmacy Command view.'),
  assumption('kpi_rx_pending_orders', 'Pending medication orders', 'Pharmacy', 'count', 'Open undispensed orders at observation from the Pharmacy Command view.'),
  assumption('kpi_rx_urgent_share', 'Urgent medication order share', 'Pharmacy', 'ratio', 'Urgent orders ÷ medication orders from the Pharmacy Command view.'),
  assumption('kpi_rx_median_tat', 'Median verification-to-dispense TAT', 'Pharmacy', 'minutes', 'Median(dispense − pharmacist verification) from the Pharmacy Dispensing view. Distinct from receipt-to-dispense.'),
  assumption('kpi_rx_p90_tat', 'P90 verification-to-dispense TAT', 'Pharmacy', 'minutes', 'P90(dispense − pharmacist verification) from the Pharmacy Dispensing view.'),
  assumption('kpi_rx_over_target', 'Dispenses exceeding TAT target', 'Pharmacy', 'count', 'Dispensed orders beyond the illustrative TAT target.'),
  assumption('kpi_rx_verification_backlog', 'Orders awaiting pharmacist verification', 'Pharmacy', 'count', 'Verification queue at observation from the Pharmacy Dispensing view.'),
  assumption('kpi_rx_first_pass', 'First-pass dispensing rate', 'Pharmacy', 'ratio', 'First-pass lines ÷ dispensed lines from the Pharmacy Dispensing view.'),
  assumption('kpi_rx_rework', 'Dispensing rework rate', 'Pharmacy', 'ratio', 'Rework lines ÷ dispensed lines from the Pharmacy Dispensing view.'),
  assumption('kpi_rx_inventory_value', 'Closing medication inventory value', 'Pharmacy', 'currency', 'Closing stock value in fictional SAR from the Pharmacy Inventory view.'),
  assumption('kpi_rx_stockout_skus', 'Stocked-out SKUs', 'Pharmacy', 'count', 'Active SKUs with zero available stock from the Pharmacy Inventory view.'),
  assumption('kpi_rx_low_stock_skus', 'Low-stock SKUs', 'Pharmacy', 'count', 'SKUs below reorder cover but not stocked out from the Pharmacy Inventory view.'),
  assumption('kpi_rx_days_of_supply', 'Medication days of supply', 'Pharmacy', 'days', 'Closing usable units ÷ average daily issued units (physical cover) from the Pharmacy Inventory view.'),
  assumption('kpi_rx_near_expiry_value', 'Near-expiry stock value', 'Pharmacy', 'currency', 'Closing stock value expiring within 90 days from the Pharmacy Inventory view.'),
  assumption('kpi_rx_verification_exception_rate', 'Verification exception rate', 'Pharmacy', 'ratio', 'Exception orders ÷ verified orders from the Pharmacy Safety view.'),
  assumption('kpi_rx_high_alert_compliance', 'High-alert medication check compliance', 'Pharmacy', 'ratio', 'Checked high-alert lines ÷ high-alert lines from the Pharmacy Safety view.'),
  assumption('kpi_rx_barcode_rate', 'Barcode administration scan rate', 'Pharmacy', 'ratio', 'Scanned ÷ administration events from the Pharmacy Safety view.'),
  assumption('kpi_rx_incident_reports', 'Medication incident reports', 'Pharmacy', 'count', 'Reported medication process incidents from the Pharmacy Safety view.'),
  assumption('kpi_rx_unresolved_reviews', 'Unresolved incident reviews', 'Pharmacy', 'count', 'Open incident reviews at observation from the Pharmacy Safety view.'),
  assumption('kpi_rx_medication_spend', 'Medication dispensing spend', 'Pharmacy', 'currency', 'Issued units × unit cost in fictional SAR from the Pharmacy Cost view.'),
  assumption('kpi_rx_cost_per_line', 'Medication cost per dispensed line', 'Pharmacy', 'currency', 'Medication spend ÷ dispensed lines from the Pharmacy Cost view.'),
  assumption('kpi_rx_expired_value', 'Expired stock write-off value', 'Pharmacy', 'currency', 'Expired units × unit cost from the Pharmacy Cost view.'),
  assumption('kpi_rx_avoidable_waste', 'Potentially avoidable medication waste', 'Pharmacy', 'currency', 'Avoidable share of write-offs from the Pharmacy Cost view.'),
  assumption('kpi_rx_potential_savings', 'Potential medication savings', 'Pharmacy', 'currency', 'Exclusive savings drivers, each SAR counted once, from the Pharmacy Cost view.'),
  assumption('kpi_rx_recoverable_hours', 'Potentially recoverable pharmacy hours', 'Pharmacy', 'hours', 'Exclusive recoverable workflow hours from Pharmacy Optimization.'),
  assumption('kpi_rx_additional_lines', 'Feasible additional dispensing capacity', 'Pharmacy', 'count', 'Feasible extra lines under workflow constraints.'),
  assumption('kpi_rx_eligible_pending', 'Eligible pending lines', 'Pharmacy', 'count', 'Pending lines that could use recovered capacity.'),
  assumption('kpi_rx_feasible_tat_cut', 'Feasible dispensing TAT reduction', 'Pharmacy', 'minutes', 'Median TAT minutes recoverable from queue and clarification gaps.'),
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
