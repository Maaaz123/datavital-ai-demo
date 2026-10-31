/** Stable Quality & Safety KPI ownership — each primary ID has exactly one owning screen. */

export type QsScreenId =
  | 'command'
  | 'incidents'
  | 'infections'
  | 'prevention'
  | 'outcomes'
  | 'actions'
  | 'optimization';

export type QsKpiOwner = {
  id: string;
  fullName: string;
  display: string;
  screen: QsScreenId;
  route: string;
  decision: string;
};

export const QS_KPI_OWNERS: QsKpiOwner[] = [
  // Command — executive quality & safety health
  { id: 'kpi_qs_validated_event_rate', fullName: 'Validated Safety Event Rate', display: 'Validated Event Rate', screen: 'command', route: '/quality', decision: 'Validated safety events ÷ eligible inpatient discharges × 1,000 (descriptive; not risk-adjusted)' },
  { id: 'kpi_qs_severe_harm_events', fullName: 'Severe Harm Events', display: 'Severe Harm', screen: 'command', route: '/quality', decision: 'Validated events with severe harm classification in the period (human-reviewed labels in the demo ledger)' },
  { id: 'kpi_qs_hai_burden_rate', fullName: 'Hospital-Onset Infection Event Rate', display: 'HO Infection Rate', screen: 'command', route: '/quality', decision: 'Validated hospital-onset infection events ÷ patient-days × 1,000 — descriptive burden, not an official NHSN SIR' },
  { id: 'kpi_qs_quality_measure_compliance', fullName: 'Quality Measure Compliance', display: 'Quality Compliance', screen: 'command', route: '/quality', decision: 'Eligible quality measure numerators met ÷ eligible measure opportunities' },
  { id: 'kpi_qs_overdue_high_risk_actions', fullName: 'Overdue High-Risk Actions', display: 'Overdue Actions', screen: 'command', route: '/quality', decision: 'Open high-risk CAPA / safety actions past their due date at observation' },
  { id: 'kpi_qs_priority_safety_signals', fullName: 'Priority Safety Signals', display: 'Priority Signals', screen: 'command', route: '/quality', decision: 'Count of non-info Quality & Safety alerts for the selected hospital and period' },

  // Incidents
  { id: 'kpi_qs_reported_incidents', fullName: 'Reported Incidents', display: 'Reported Incidents', screen: 'incidents', route: '/quality/incidents', decision: 'Safety reports received in the period (reporting volume ≠ underlying harm)' },
  { id: 'kpi_qs_validated_incidents', fullName: 'Validated Incidents', display: 'Validated Incidents', screen: 'incidents', route: '/quality/incidents', decision: 'Reports classified as validated events after review (excludes withdrawn / duplicate)' },
  { id: 'kpi_qs_near_miss_events', fullName: 'Near-Miss Events', display: 'Near Misses', screen: 'incidents', route: '/quality/incidents', decision: 'Validated near-miss / good-catch events (no patient harm occurred)' },
  { id: 'kpi_qs_events_with_harm', fullName: 'Events With Harm', display: 'Events With Harm', screen: 'incidents', route: '/quality/incidents', decision: 'Validated events with any harm severity above near-miss' },
  { id: 'kpi_qs_investigation_timeliness', fullName: 'Investigation Timeliness', display: 'Investigation Timeliness', screen: 'incidents', route: '/quality/incidents', decision: 'Investigations closed within the illustrative target ÷ investigations decided in period' },
  { id: 'kpi_qs_classification_completeness', fullName: 'Event Classification Completeness', display: 'Classification Complete', screen: 'incidents', route: '/quality/incidents', decision: 'Reports with complete category + severity labels ÷ reported incidents' },

  // Infections — denominator discipline
  { id: 'kpi_qs_clabsi_rate', fullName: 'CLABSI Incidence Density', display: 'CLABSI Rate', screen: 'infections', route: '/quality/infections', decision: 'Eligible CLABSI events ÷ central-line days × 1,000 (demo surveillance definition — not certified NHSN)' },
  { id: 'kpi_qs_cauti_rate', fullName: 'CAUTI Incidence Density', display: 'CAUTI Rate', screen: 'infections', route: '/quality/infections', decision: 'Eligible CAUTI events ÷ urinary-catheter days × 1,000 (demo surveillance definition — not certified NHSN)' },
  { id: 'kpi_qs_ssi_rate', fullName: 'SSI Incidence', display: 'SSI Rate', screen: 'infections', route: '/quality/infections', decision: 'Eligible SSI events ÷ eligible surveillance procedures (procedure-based denominator)' },
  { id: 'kpi_qs_validated_hai_cases', fullName: 'Validated HAI Cases', display: 'Validated HAI', screen: 'infections', route: '/quality/infections', decision: 'Sum of validated CLABSI + CAUTI + SSI + hospital-onset CDI events in the period' },
  { id: 'kpi_qs_cdi_events', fullName: 'Hospital-Onset C. difficile Events', display: 'HO CDI Events', screen: 'infections', route: '/quality/infections', decision: 'Hospital-onset CDI LabID events under the demo case definition' },
  { id: 'kpi_qs_surveillance_coverage', fullName: 'Surveillance Coverage', display: 'Surveillance Coverage', screen: 'infections', route: '/quality/infections', decision: 'Units with complete device-day / procedure surveillance ÷ units in the surveillance plan' },

  // Prevention
  { id: 'kpi_qs_hand_hygiene_compliance', fullName: 'Hand Hygiene Observed Compliance', display: 'Hand Hygiene', screen: 'prevention', route: '/quality/prevention', decision: 'Compliant observed opportunities ÷ eligible observed opportunities (audited sample, not all care interactions)' },
  { id: 'kpi_qs_isolation_compliance', fullName: 'Isolation Precaution Compliance', display: 'Isolation Compliance', screen: 'prevention', route: '/quality/prevention', decision: 'Compliant isolation audits ÷ eligible isolation observations' },
  { id: 'kpi_qs_ip_audit_completion', fullName: 'Infection Prevention Audit Completion', display: 'IP Audit Complete', screen: 'prevention', route: '/quality/prevention', decision: 'Completed IP audits ÷ scheduled audits in the period' },
  { id: 'kpi_qs_cl_bundle_compliance', fullName: 'Central Line Bundle Compliance', display: 'CL Bundle', screen: 'prevention', route: '/quality/prevention', decision: 'Fully compliant central-line insertion/maintenance observations ÷ eligible observations' },
  { id: 'kpi_qs_catheter_bundle_compliance', fullName: 'Catheter Maintenance Bundle Compliance', display: 'UC Bundle', screen: 'prevention', route: '/quality/prevention', decision: 'Fully compliant urinary-catheter maintenance observations ÷ eligible observations' },
  { id: 'kpi_qs_prevention_gaps', fullName: 'High-Risk Prevention Gaps', display: 'Prevention Gaps', screen: 'prevention', route: '/quality/prevention', decision: 'Open high-risk prevention audit findings at observation' },

  // Outcomes — descriptive, not risk-adjusted rankings
  { id: 'kpi_qs_readmission_rate', fullName: 'Eligible 30-Day Unplanned Readmission Rate', display: '30-Day Readmission', screen: 'outcomes', route: '/quality/outcomes', decision: 'Unplanned same-facility readmissions within 30 days ÷ eligible index discharges (cross-facility linkage unavailable)' },
  { id: 'kpi_qs_pressure_injury_rate', fullName: 'Hospital-Acquired Pressure Injury Rate', display: 'HAPI Rate', screen: 'outcomes', route: '/quality/outcomes', decision: 'Hospital-acquired pressure injuries ÷ patient-days × 1,000' },
  { id: 'kpi_qs_falls_with_injury_rate', fullName: 'Falls With Injury Rate', display: 'Falls With Injury', screen: 'outcomes', route: '/quality/outcomes', decision: 'In-hospital falls with injury ÷ patient-days × 1,000' },
  { id: 'kpi_qs_postop_complication_rate', fullName: 'Postoperative Complication Rate', display: 'Postop Complications', screen: 'outcomes', route: '/quality/outcomes', decision: 'Documented postoperative complications ÷ eligible surgical discharges (descriptive — not risk-adjusted)' },
  { id: 'kpi_qs_outcome_measure_coverage', fullName: 'Clinical Quality Measure Coverage', display: 'Outcome Coverage', screen: 'outcomes', route: '/quality/outcomes', decision: 'Outcome cohorts with complete eligibility flags ÷ planned outcome measures' },
  { id: 'kpi_qs_outcome_review_backlog', fullName: 'Outcome Review Backlog', display: 'Review Backlog', screen: 'outcomes', route: '/quality/outcomes', decision: 'Open mortality / complication / readmission reviews past the illustrative target' },

  // Investigations & Corrective Actions (RCA / CAPA)
  { id: 'kpi_qs_open_rca', fullName: 'Open Safety Investigations', display: 'Open Investigations', screen: 'actions', route: '/quality/actions', decision: 'Root cause analyses / safety investigations still open at observation' },
  { id: 'kpi_qs_overdue_rca', fullName: 'Overdue Corrective Actions', display: 'Overdue CAPA', screen: 'actions', route: '/quality/actions', decision: 'Open high-risk corrective actions past the illustrative completion target' },
  { id: 'kpi_qs_capa_ontime', fullName: 'RCA Completion Rate', display: 'RCA Completion', screen: 'actions', route: '/quality/actions', decision: 'RCA / investigations closed on or before due date ÷ investigations decided in period' },
  { id: 'kpi_qs_open_capa', fullName: 'Open CAPA Actions', display: 'Open CAPA', screen: 'actions', route: '/quality/actions', decision: 'Corrective and preventive actions still open at observation' },
  { id: 'kpi_qs_recurring_themes', fullName: 'Repeat Findings', display: 'Repeat Findings', screen: 'actions', route: '/quality/actions', decision: 'Themes with ≥2 related validated events in the period requiring RCA attention' },
  { id: 'kpi_qs_effectiveness_review_rate', fullName: 'CAPA Verification Rate', display: 'CAPA Verification', screen: 'actions', route: '/quality/actions', decision: 'Closed CAPA with documented effectiveness review ÷ closed CAPA' },

  // Optimization / what-if
  { id: 'kpi_qs_addressable_gap', fullName: 'Addressable Safety Gap', display: 'Addressable Gap', screen: 'optimization', route: '/quality/optimization', decision: 'Illustrative gap between current validated event rate and operating target for eligible cohorts' },
  { id: 'kpi_qs_modeled_incident_reduction', fullName: 'Modeled Incident Reduction', display: 'Incident Potential', screen: 'optimization', route: '/quality/optimization', decision: 'Illustrative preventable validated events under documented assumptions — not measured improvement' },
  { id: 'kpi_qs_modeled_hai_prevention', fullName: 'Modeled HAI Prevention', display: 'HAI Potential', screen: 'optimization', route: '/quality/optimization', decision: 'Illustrative preventable HAI events under prevention assumptions — not measured infection reduction' },
  { id: 'kpi_qs_modeled_compliance_uplift', fullName: 'Modeled Prevention Compliance Uplift', display: 'Compliance Uplift', screen: 'optimization', route: '/quality/optimization', decision: 'Illustrative points of hand-hygiene / bundle compliance uplift under assumptions' },
  { id: 'kpi_qs_priority_action_coverage', fullName: 'Priority Action Coverage', display: 'Action Coverage', screen: 'optimization', route: '/quality/optimization', decision: 'Priority safety actions with assigned owner ÷ priority opportunities' },
];

export const QS_SCREEN_TITLES: Record<QsScreenId, string> = {
  command: 'Quality & Safety Command Center',
  incidents: 'Patient Safety Incident Intelligence',
  infections: 'Healthcare-Associated Infections',
  prevention: 'Infection Prevention & Compliance',
  outcomes: 'Clinical Quality & Outcomes',
  actions: 'Investigations & Corrective Actions',
  optimization: 'Quality & Safety Optimization & What-If',
};

export const QS_CHART_OWNERS: Array<{ id: string; title: string; screen: QsScreenId; question: string }> = [
  { id: 'qs_perf_trend', title: 'Quality & Safety Performance Trend', screen: 'command', question: 'How are validated events and HAI burden moving?' },
  { id: 'qs_severity', title: 'Safety Severity Distribution', screen: 'command', question: 'How are validated events distributed by severity?' },
  { id: 'qs_infection_overview', title: 'Infection Surveillance Overview', screen: 'command', question: 'Where is infection surveillance burden concentrated?' },
  { id: 'qs_quality_measures', title: 'Quality Measure Performance', screen: 'command', question: 'Which quality measures are below target?' },
  { id: 'qs_actions_trend', title: 'High-Risk Actions Trend', screen: 'command', question: 'Are overdue high-risk actions rising?' },
  { id: 'qs_priority_signals', title: 'Executive Priority Signals', screen: 'command', question: 'Which quality and safety alerts need leadership focus?' },
  { id: 'qs_incident_trend', title: 'Incident Reporting Trend', screen: 'incidents', question: 'Is reporting volume changing over time?' },
  { id: 'qs_incident_categories', title: 'Incident Categories', screen: 'incidents', question: 'Which event categories dominate reports?' },
  { id: 'qs_harm_distribution', title: 'Severity and Harm Distribution', screen: 'incidents', question: 'How do near-miss and harm events compare?' },
  { id: 'qs_incidents_dept', title: 'Incidents by Department', screen: 'incidents', question: 'Where are validated incidents concentrated?' },
  { id: 'qs_investigation_status', title: 'Investigation Status', screen: 'incidents', question: 'What is the investigation backlog?' },
  { id: 'qs_recurring_patterns', title: 'Recurring Event Patterns', screen: 'incidents', question: 'Which categories recur most often?' },
  { id: 'qs_infection_trend', title: 'Infection Incidence Trend', screen: 'infections', question: 'How are device-associated rates moving?' },
  { id: 'qs_device_rates', title: 'Device-Associated Infection Rates', screen: 'infections', question: 'How do CLABSI and CAUTI compare?' },
  { id: 'qs_infection_units', title: 'Infection Events by Unit', screen: 'infections', question: 'Which units contribute most HAI events?' },
  { id: 'qs_ssi_procedures', title: 'SSI by Eligible Procedure Category', screen: 'infections', question: 'Which procedure categories drive SSI?' },
  { id: 'qs_device_days', title: 'Device Days vs Events', screen: 'infections', question: 'How do device-days relate to events?' },
  { id: 'qs_surv_complete', title: 'Surveillance Completeness', screen: 'infections', question: 'Is surveillance coverage complete?' },
  { id: 'qs_hh_trend', title: 'Hand Hygiene Compliance Trend', screen: 'prevention', question: 'Is observed hand-hygiene compliance improving?' },
  { id: 'qs_audit_perf', title: 'Prevention Audit Performance', screen: 'prevention', question: 'Are scheduled IP audits being completed?' },
  { id: 'qs_bundle_units', title: 'Bundle Compliance by Unit', screen: 'prevention', question: 'Which units lag on bundle compliance?' },
  { id: 'qs_isolation', title: 'Isolation Process Compliance', screen: 'prevention', question: 'How reliable are isolation precautions?' },
  { id: 'qs_missed_audits', title: 'Missed Audit Opportunities', screen: 'prevention', question: 'Where are audit opportunities missed?' },
  { id: 'qs_prevention_priorities', title: 'Prevention Gap Priorities', screen: 'prevention', question: 'Which prevention gaps are highest risk?' },
  { id: 'qs_readmit_trend', title: 'Readmission Trend', screen: 'outcomes', question: 'How is the eligible 30-day readmission rate moving?' },
  { id: 'qs_hapi_falls', title: 'HAPI and Falls With Injury', screen: 'outcomes', question: 'How do pressure-injury and fall-with-injury rates compare?' },
  { id: 'qs_postop', title: 'Postoperative Complications', screen: 'outcomes', question: 'Are postoperative complications rising?' },
  { id: 'qs_outcome_coverage', title: 'Outcome Measure Coverage', screen: 'outcomes', question: 'Which outcome cohorts lack complete eligibility flags?' },
  { id: 'qs_review_backlog', title: 'Outcome Review Backlog', screen: 'outcomes', question: 'How large is the review backlog?' },
  { id: 'qs_outcome_dept', title: 'Outcome Signals by Department', screen: 'outcomes', question: 'Where do outcome signals concentrate?' },
  { id: 'qs_rca_status', title: 'Investigation Lifecycle', screen: 'actions', question: 'How many investigations are open or overdue?' },
  { id: 'qs_capa_trend', title: 'Corrective Action Aging', screen: 'actions', question: 'Is CAPA on-time completion improving?' },
  { id: 'qs_capa_owners', title: 'Owner Workload', screen: 'actions', question: 'Where is CAPA backlog concentrated?' },
  { id: 'qs_theme_map', title: 'Root-Cause Category Distribution', screen: 'actions', question: 'Which themes drive RCA work?' },
  { id: 'qs_effectiveness', title: 'Verification Outcomes', screen: 'actions', question: 'Are closed CAPA reviewed for effectiveness?' },
  { id: 'qs_learning_loop', title: 'Repeat Finding Trend', screen: 'actions', question: 'How do RCA openings convert to closed CAPA?' },
  { id: 'qs_recovery_drivers', title: 'Safety Improvement by Driver', screen: 'optimization', question: 'Which illustrative scenarios show the largest opportunity?' },
  { id: 'qs_scenario_events', title: 'Current vs Scenario Validated Events', screen: 'optimization', question: 'What illustrative event reduction do scenarios show?' },
  { id: 'qs_hai_opportunity', title: 'HAI Prevention Opportunity', screen: 'optimization', question: 'What illustrative HAI prevention do scenarios show?' },
  { id: 'qs_compliance_uplift', title: 'Prevention Compliance Uplift', screen: 'optimization', question: 'What compliance uplift do scenarios model?' },
  { id: 'qs_constraints', title: 'Feasibility Constraints by Intervention', screen: 'optimization', question: 'Where do eligibility caps constrain modeled benefit?' },
  { id: 'qs_action_priorities', title: 'Management Action Priorities', screen: 'optimization', question: 'Which actions should leadership sequence first?' },
];

export function ownersForQsScreen(screen: QsScreenId): QsKpiOwner[] {
  return QS_KPI_OWNERS.filter((item) => item.screen === screen);
}

export function assertUniqueQsOwnership(): string[] {
  const seen = new Map<string, string>();
  const issues: string[] = [];
  for (const item of QS_KPI_OWNERS) {
    const prior = seen.get(item.id);
    if (prior) issues.push(`${item.id} owned by both ${prior} and ${item.screen}`);
    else seen.set(item.id, item.screen);
  }
  return issues;
}

export function assertUniqueQsCharts(): string[] {
  const seen = new Map<string, string>();
  const issues: string[] = [];
  for (const item of QS_CHART_OWNERS) {
    const prior = seen.get(item.id);
    if (prior) issues.push(`${item.id} chart owned by both ${prior} and ${item.screen}`);
    else seen.set(item.id, item.screen);
  }
  const titles = new Map<string, string>();
  for (const item of QS_CHART_OWNERS) {
    const key = `${item.screen}|${item.title}`;
    const prior = titles.get(key);
    if (prior) issues.push(`duplicate title ${item.title} on ${item.screen}`);
    else titles.set(key, item.id);
  }
  return issues;
}

/** Domains that must not appear as primary QS ownership. */
export const QS_CROSS_DOMAIN_FORBIDDEN = [
  'kpi_rcm_', 'kpi_px_', 'kpi_ed_', 'kpi_bed_', 'kpi_ipd_', 'kpi_opd_', 'kpi_appt_',
  'kpi_surg_', 'kpi_rad_', 'kpi_lab_', 'kpi_rx_', 'kpi_icu_',
] as const;
