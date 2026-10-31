/** Stable RCM KPI ownership — each primary ID has exactly one owning screen. */

export type RcmScreenId =
  | 'command'
  | 'eligibility'
  | 'billing'
  | 'claims'
  | 'collections'
  | 'leakage'
  | 'optimization';

export type RcmKpiOwner = {
  id: string;
  fullName: string;
  display: string;
  screen: RcmScreenId;
  route: string;
  decision: string;
};

export const RCM_KPI_OWNERS: RcmKpiOwner[] = [
  // Command — executive revenue-cycle health
  { id: 'kpi_rcm_net_patient_revenue', fullName: 'Net Patient Revenue', display: 'Net Patient Revenue', screen: 'command', route: '/rcm', decision: 'Gross charges − contractual allowances for eligible billed encounters (recognized net revenue, not cash)' },
  { id: 'kpi_rcm_net_collection_rate', fullName: 'Period Cash-to-Net Revenue Ratio', display: 'Cash-to-Net Ratio', screen: 'command', route: '/rcm', decision: 'Period cash applied ÷ period net patient revenue. Cash may settle prior-period AR — not a cohort-adjusted / A/R collectible net collection rate' },
  { id: 'kpi_rcm_gross_denial_rate', fullName: 'Gross Denial Rate (Claim Count)', display: 'Gross Denial Rate', screen: 'command', route: '/rcm', decision: 'Unique eligible claims with an adjudicated denial ÷ unique eligible adjudicated claims' },
  { id: 'kpi_rcm_days_in_ar', fullName: 'Days in Accounts Receivable', display: 'Days in AR', screen: 'command', route: '/rcm', decision: 'Ending AR ÷ (period net patient revenue ÷ days in period) — snapshot conversion speed' },
  { id: 'kpi_rcm_outstanding_ar', fullName: 'Outstanding Accounts Receivable', display: 'Outstanding AR', screen: 'command', route: '/rcm', decision: 'Year-end / period-end AR snapshot (not the sum of monthly ending balances)' },
  { id: 'kpi_rcm_revenue_at_risk', fullName: 'Revenue at Risk', display: 'Revenue at Risk', screen: 'command', route: '/rcm', decision: 'Eligible denied + unbilled + aged>90 AR exposure under recoverability caps (illustrative, not collected cash)' },

  // Eligibility & pre-authorization
  { id: 'kpi_rcm_eligibility_verification_rate', fullName: 'Eligibility Verification Rate', display: 'Eligibility Verified', screen: 'eligibility', route: '/rcm/eligibility', decision: 'Encounters with completed eligibility response ÷ encounters requiring verification' },
  { id: 'kpi_rcm_coverage_exception_rate', fullName: 'Coverage Exception Rate', display: 'Coverage Exceptions', screen: 'eligibility', route: '/rcm/eligibility', decision: 'Coverage exceptions / inactive policies ÷ verified eligibility responses' },
  { id: 'kpi_rcm_preauth_approval_rate', fullName: 'Pre-Authorization Approval Rate', display: 'Auth Approval Rate', screen: 'eligibility', route: '/rcm/eligibility', decision: 'Approved authorizations ÷ decided authorization requests (excludes still-pending)' },
  { id: 'kpi_rcm_pending_authorizations', fullName: 'Pending Authorizations', display: 'Pending Auths', screen: 'eligibility', route: '/rcm/eligibility', decision: 'Open authorization requests at observation (not auto-approved care)' },
  { id: 'kpi_rcm_auth_turnaround_days', fullName: 'Authorization Turnaround Time', display: 'Auth Turnaround', screen: 'eligibility', route: '/rcm/eligibility', decision: 'Volume-weighted mean days from authorization request to decision for decided requests' },
  { id: 'kpi_rcm_auth_denial_exposure', fullName: 'Authorization-Related Denial Exposure', display: 'Auth Denial Exposure', screen: 'eligibility', route: '/rcm/eligibility', decision: 'Denied claim value attributable to missing/expired/rejected authorization on adjudicated lines' },

  // Charge capture & billing
  { id: 'kpi_rcm_charge_capture_rate', fullName: 'Charge Capture Rate', display: 'Charge Capture', screen: 'billing', route: '/rcm/billing', decision: 'Billable captured charges ÷ eligible delivered chargeable services (excludes nonbillable / bundled / cancelled)' },
  { id: 'kpi_rcm_unbilled_encounters', fullName: 'Unbilled Encounters', display: 'Unbilled Encounters', screen: 'billing', route: '/rcm/billing', decision: 'Eligible completed encounters without an invoice past the billing lag target' },
  { id: 'kpi_rcm_unbilled_service_value', fullName: 'Unbilled Service Value', display: 'Unbilled Value', screen: 'billing', route: '/rcm/billing', decision: 'Expected net value of eligible unbilled chargeable services (not gross charges as cash)' },
  { id: 'kpi_rcm_charge_to_bill_lag', fullName: 'Charge-to-Bill Lag', display: 'Charge-to-Bill Lag', screen: 'billing', route: '/rcm/billing', decision: 'Volume-weighted mean days from final charge post to invoice date for billed encounters' },
  { id: 'kpi_rcm_coding_completion_rate', fullName: 'Coding Completion Rate', display: 'Coding Complete', screen: 'billing', route: '/rcm/billing', decision: 'Encounters with completed coding ÷ encounters ready for coding' },
  { id: 'kpi_rcm_billing_exception_rate', fullName: 'Billing Exception Rate', display: 'Billing Exceptions', screen: 'billing', route: '/rcm/billing', decision: 'Open billing exceptions ÷ invoices created in period' },

  // Claims & denials
  { id: 'kpi_rcm_claims_submitted', fullName: 'Unique Claims Submitted', display: 'Claims Submitted', screen: 'claims', route: '/rcm/claims', decision: 'Unique claim IDs with ≥1 submission in period (resubmissions are not new unique claims)' },
  { id: 'kpi_rcm_first_pass_acceptance', fullName: 'First-Pass Acceptance Rate', display: 'First-Pass Accept', screen: 'claims', route: '/rcm/claims', decision: 'Claims accepted on first submission ÷ unique claims with a first submission (clearinghouse reject ≠ payer denial)' },
  { id: 'kpi_rcm_denied_claims', fullName: 'Denied Claims (Unique)', display: 'Denied Claims', screen: 'claims', route: '/rcm/claims', decision: 'Unique adjudicated claims with ≥1 denied line' },
  { id: 'kpi_rcm_denial_rate_by_value', fullName: 'Denied Value Rate', display: 'Denied Value Rate', screen: 'claims', route: '/rcm/claims', decision: 'Denied amount ÷ eligible adjudicated claim amount (claim-line grain)' },
  { id: 'kpi_rcm_appeal_success_rate', fullName: 'Appeal Success Rate', display: 'Appeal Success', screen: 'claims', route: '/rcm/claims', decision: 'Successful appeals ÷ decided appeals (pending excluded)' },
  { id: 'kpi_rcm_recoverable_denial_value', fullName: 'Recoverable Denial Value', display: 'Recoverable Denials', screen: 'claims', route: '/rcm/claims', decision: 'Eligible denied amount assessed recoverable under appeal/resubmission rules (illustrative — not collected)' },

  // AR & collections — Outstanding AR / Days in AR remain Command-owned; collections owns flows and concentration
  { id: 'kpi_rcm_cash_applied', fullName: 'Cash Applied', display: 'Cash Applied', screen: 'collections', route: '/rcm/collections', decision: 'Period cash applied to encounter AR (flow — distinct from remittance receipts and from ending AR snapshot)' },
  { id: 'kpi_rcm_ar_over_90', fullName: 'AR Over 90 Days', display: 'AR > 90 Days', screen: 'collections', route: '/rcm/collections', decision: 'AR aged >90 days from claim submission date (documented aging clock)' },
  { id: 'kpi_rcm_collection_effectiveness', fullName: 'Collection Effectiveness Index', display: 'Collection Effectiveness', screen: 'collections', route: '/rcm/collections', decision: 'Cash applied ÷ (opening AR + new receivables − approved adjustments) for eligible cohorts' },
  { id: 'kpi_rcm_unapplied_cash', fullName: 'Unapplied Cash', display: 'Unapplied Cash', screen: 'collections', route: '/rcm/collections', decision: 'Remittances received not yet applied to encounter AR (cash received ≠ cash applied)' },
  { id: 'kpi_rcm_payer_payment_delay', fullName: 'Payer Payment Delay', display: 'Payer Pay Delay', screen: 'collections', route: '/rcm/collections', decision: 'Volume-weighted mean days from claim submission to first payment application for paid claims' },
  { id: 'kpi_rcm_patient_ar', fullName: 'Patient Responsibility AR', display: 'Patient AR', screen: 'collections', route: '/rcm/collections', decision: 'Ending patient-responsibility AR (distinct from insurer AR; not equal to total Outstanding AR)' },

  // Leakage & integrity
  { id: 'kpi_rcm_confirmed_leakage', fullName: 'Confirmed Revenue Leakage', display: 'Confirmed Leakage', screen: 'leakage', route: '/rcm/leakage', decision: 'Exclusive attributed lost recoverable value (missed charges + avoidable write-offs + confirmed underpayments) — contractual allowances excluded' },
  { id: 'kpi_rcm_potential_leakage', fullName: 'Potential Leakage Exposure', display: 'Potential Leakage', screen: 'leakage', route: '/rcm/leakage', decision: 'Suspected / under-review exposure not yet confirmed (not additive to confirmed leakage)' },
  { id: 'kpi_rcm_underpayment_value', fullName: 'Underpayment Value', display: 'Underpayments', screen: 'leakage', route: '/rcm/leakage', decision: 'Allowed − paid on underpaid adjudicated lines (contract variance), exclusive attribution' },
  { id: 'kpi_rcm_missed_charge_exposure', fullName: 'Missed Charge Exposure', display: 'Missed Charges', screen: 'leakage', route: '/rcm/leakage', decision: 'Expected net of eligible chargeable services not captured (not every unmatched clinical event)' },
  { id: 'kpi_rcm_avoidable_writeoffs', fullName: 'Avoidable Write-offs', display: 'Avoidable Write-offs', screen: 'leakage', route: '/rcm/leakage', decision: 'Write-offs classified preventable (excludes legitimate contractual adjustments and nonrecoverable bad debt)' },
  { id: 'kpi_rcm_recovery_opportunities', fullName: 'Recovery Opportunity Count', display: 'Recovery Opps', screen: 'leakage', route: '/rcm/leakage', decision: 'Open recovery work items with exclusive financial attribution' },

  // Optimization / what-if
  { id: 'kpi_rcm_recoverable_opportunity', fullName: 'Recoverable Revenue Opportunity', display: 'Recoverable Opportunity', screen: 'optimization', route: '/rcm/optimization', decision: 'Illustrative feasible recovery under documented assumptions (not realized cash)' },
  { id: 'kpi_rcm_eligible_denial_recovery', fullName: 'Eligible Denial Recovery', display: 'Denial Recovery', screen: 'optimization', route: '/rcm/optimization', decision: 'Modeled recoverable denial share under appeal/eligibility constraints' },
  { id: 'kpi_rcm_collection_improvement', fullName: 'Collection Improvement Potential', display: 'Collection Potential', screen: 'optimization', route: '/rcm/optimization', decision: 'Illustrative cash acceleration / effectiveness uplift — not new recognized revenue' },
  { id: 'kpi_rcm_preventable_leakage', fullName: 'Preventable Leakage', display: 'Preventable Leakage', screen: 'optimization', route: '/rcm/optimization', decision: 'Eligible confirmed leakage addressable by process interventions' },
  { id: 'kpi_rcm_cash_acceleration', fullName: 'Cash Acceleration Opportunity', display: 'Cash Acceleration', screen: 'optimization', route: '/rcm/optimization', decision: 'Illustrative earlier application of eligible collections (timing shift, not new revenue)' },
];

export const RCM_SCREEN_TITLES: Record<RcmScreenId, string> = {
  command: 'RCM Command Center',
  eligibility: 'Eligibility & Pre-Authorization',
  billing: 'Charge Capture & Billing',
  claims: 'Claims & Denial Intelligence',
  collections: 'Accounts Receivable & Collections',
  leakage: 'Revenue Leakage & Financial Integrity',
  optimization: 'RCM Optimization & What-If',
};

export const RCM_CHART_OWNERS: Array<{ id: string; title: string; screen: RcmScreenId; question: string }> = [
  { id: 'rcm_rev_trend', title: 'Revenue and Collections Trend', screen: 'command', question: 'How are net revenue and applied collections moving?' },
  { id: 'rcm_claims_lifecycle', title: 'Claims Lifecycle Overview', screen: 'command', question: 'Where do claims sit in the lifecycle?' },
  { id: 'rcm_payer_health', title: 'Revenue Cycle Health by Payer', screen: 'command', question: 'Which payers show weaker collection or higher denial pressure?' },
  { id: 'rcm_denial_pressure', title: 'Denial Pressure Trend', screen: 'command', question: 'Is denial pressure rising?' },
  { id: 'rcm_ar_aging_overview', title: 'AR Aging Overview', screen: 'command', question: 'How is AR distributed across aging bands?' },
  { id: 'rcm_priority_signals', title: 'Executive Financial Priority Signals', screen: 'command', question: 'Which RCM alerts need leadership focus?' },
  { id: 'rcm_elig_trend', title: 'Eligibility Verification Trend', screen: 'eligibility', question: 'Are eligibility checks keeping pace with encounters?' },
  { id: 'rcm_auth_funnel', title: 'Authorization Funnel', screen: 'eligibility', question: 'How do authorization requests convert to approvals?' },
  { id: 'rcm_pending_auth_age', title: 'Pending Authorizations by Age', screen: 'eligibility', question: 'How old is the pending authorization backlog?' },
  { id: 'rcm_auth_by_payer', title: 'Approval Rate by Payer', screen: 'eligibility', question: 'Which payers approve authorizations faster or slower?' },
  { id: 'rcm_auth_delay_reasons', title: 'Authorization Delay Reasons', screen: 'eligibility', question: 'What delays authorization decisions?' },
  { id: 'rcm_auth_exposure', title: 'Financial Exposure by Authorization Status', screen: 'eligibility', question: 'Where does authorization status create financial exposure?' },
  { id: 'rcm_delivered_vs_charges', title: 'Delivered Services vs Captured Charges', screen: 'billing', question: 'Are chargeable delivered services being captured?' },
  { id: 'rcm_capture_by_dept', title: 'Charge Capture by Department', screen: 'billing', question: 'Which departments under-capture charges?' },
  { id: 'rcm_unbilled_aging', title: 'Unbilled Encounters Aging', screen: 'billing', question: 'How old is the unbilled encounter backlog?' },
  { id: 'rcm_coding_backlog', title: 'Coding Backlog', screen: 'billing', question: 'Where is coding incomplete?' },
  { id: 'rcm_billing_lag', title: 'Billing Lag Trend', screen: 'billing', question: 'Is charge-to-bill lag improving?' },
  { id: 'rcm_billing_exceptions', title: 'Billing Exceptions by Reason', screen: 'billing', question: 'What drives billing exceptions?' },
  { id: 'rcm_submission_trend', title: 'Claims Submission Trend', screen: 'claims', question: 'Are unique claim submissions keeping pace?' },
  { id: 'rcm_claims_funnel', title: 'Claims Lifecycle Funnel', screen: 'claims', question: 'How do claims move from draft to paid/denied?' },
  { id: 'rcm_denials_reason', title: 'Denials by Reason', screen: 'claims', question: 'Which denial reasons dominate by value?' },
  { id: 'rcm_denials_payer', title: 'Denials by Payer', screen: 'claims', question: 'Which payers concentrate denials?' },
  { id: 'rcm_appeal_trend', title: 'Appeal Outcome Trend', screen: 'claims', question: 'Are appeals succeeding?' },
  { id: 'rcm_denial_recovery', title: 'Denial Recovery Opportunities', screen: 'claims', question: 'Which denied amounts are assessed recoverable?' },
  { id: 'rcm_ar_buckets', title: 'AR Aging Buckets', screen: 'collections', question: 'Where is ending AR concentrated by age?' },
  { id: 'rcm_collections_trend', title: 'Collections Trend', screen: 'collections', question: 'How is applied cash trending vs receipts?' },
  { id: 'rcm_ar_by_payer', title: 'AR by Payer', screen: 'collections', question: 'Which payers hold the largest AR?' },
  { id: 'rcm_payment_delay', title: 'Payment Delay Distribution', screen: 'collections', question: 'How long do payers take to pay?' },
  { id: 'rcm_cash_exceptions', title: 'Cash Application Exceptions', screen: 'collections', question: 'What blocks remittance application?' },
  { id: 'rcm_collection_worklist', title: 'Priority Collection Worklist', screen: 'collections', question: 'Which balances should collectors prioritize?' },
  { id: 'rcm_leakage_drivers', title: 'Revenue Leakage by Driver', screen: 'leakage', question: 'Which exclusive drivers create confirmed leakage?' },
  { id: 'rcm_underpay_payer', title: 'Underpayments by Payer', screen: 'leakage', question: 'Where do contract underpayments concentrate?' },
  { id: 'rcm_contract_variance', title: 'Contract Variance Trend', screen: 'leakage', question: 'Is allowed-vs-paid variance widening?' },
  { id: 'rcm_missed_charges', title: 'Missed Charges by Service Line', screen: 'leakage', question: 'Which service lines miss eligible charges?' },
  { id: 'rcm_writeoff_drivers', title: 'Write-off Drivers', screen: 'leakage', question: 'Which write-offs are avoidable vs contractual?' },
  { id: 'rcm_recovery_matrix', title: 'Recovery Opportunity Matrix', screen: 'leakage', question: 'Where do recovery effort and value coincide?' },
  { id: 'rcm_recovery_by_driver', title: 'Revenue Recovery by Driver', screen: 'optimization', question: 'Which interventions unlock the most illustrative recovery?' },
  { id: 'rcm_scenario_collections', title: 'Current vs Scenario Net Collections', screen: 'optimization', question: 'What illustrative collection uplift do scenarios show?' },
  { id: 'rcm_denial_reduction', title: 'Denial Reduction Opportunity', screen: 'optimization', question: 'How much preventable denial value is addressable?' },
  { id: 'rcm_cash_accel_chart', title: 'Cash Collection Acceleration', screen: 'optimization', question: 'What timing shift does acceleration create?' },
  { id: 'rcm_constraints', title: 'Financial Constraints by Intervention', screen: 'optimization', question: 'What limits feasible recovery?' },
  { id: 'rcm_action_priorities', title: 'Management Action Priorities', screen: 'optimization', question: 'Which actions should leadership prioritize?' },
];

export function ownersForRcmScreen(screen: RcmScreenId): RcmKpiOwner[] {
  return RCM_KPI_OWNERS.filter((item) => item.screen === screen);
}

export function assertUniqueRcmOwnership(owners = RCM_KPI_OWNERS): string[] {
  const seen = new Map<string, string>();
  const issues: string[] = [];
  for (const owner of owners) {
    const prior = seen.get(owner.id);
    if (prior) issues.push(`${owner.id} owned by both ${prior} and ${owner.screen}`);
    else seen.set(owner.id, owner.screen);
  }
  return issues;
}

export function assertUniqueRcmCharts(charts = RCM_CHART_OWNERS): string[] {
  const seen = new Map<string, string>();
  const issues: string[] = [];
  for (const chart of charts) {
    const prior = seen.get(chart.title);
    if (prior) issues.push(`chart "${chart.title}" owned by both ${prior} and ${chart.screen}`);
    else seen.set(chart.title, chart.screen);
  }
  return issues;
}

/** Headline KPIs owned by Domains 1–11 that must not appear as RCM primary ribbons. */
export const RCM_CROSS_DOMAIN_FORBIDDEN = [
  'ED Visit Volume',
  'Bed Occupancy',
  'Median Length of Stay',
  'OR Utilization',
  'Overall Patient Satisfaction',
  'Survey Response Rate',
  'ICU Admissions',
  'Staffed ICU Beds',
  'Scanner Utilization',
  'Analyzer Utilization',
  'Medication Orders',
  'Appointment No-Show Rate',
];
