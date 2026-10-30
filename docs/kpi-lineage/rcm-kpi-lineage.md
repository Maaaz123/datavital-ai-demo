# RCM KPI Lineage

Each primary KPI has exactly one owning screen (`rcmOwnership.ts`, **41 KPIs**, **7 screens**). Transformations run inside `buildRcmView` (`rcmView.ts`) and bind through `rcmMapped` in `bind.ts`. Field names are **proposed canonical columns** (see the data dictionary); the demo reproduces them as aggregate ledger values.

**Rule:** Demo Available ≠ Production Source Verified. No KPI is Production Source Verified.  
**Currency:** `SAR` demo label; configurable; no FX conversion.



## RCM Command Center — `/rcm` (6 KPIs)

| KPI ID | Display | Required canonical fields | Transformation (as implemented) | Denominator / grain | Ledger source (`buildRcmView`) | Readiness | Notes |
|---|---|---|---|---|---|---|---|
| kpi_rcm_net_patient_revenue | Net Patient Revenue | `charge_amount`, `adjustment_amount`, `adjustment_type`, `revenue_recognition_date`, `calendar_period_id`, `hospital_id`, `currency_code` | Σ gross charges − Σ contractual allowances for the period (grossCharges − contractualAllowances); recognized net revenue, not cash | Period flow (SAR) | `netPatientRevenue` | Demo Available |  |
| kpi_rcm_net_collection_rate | Net Collection Rate | `paid_amount`, `payment_applied_at`, `payer_id`, `charge_amount`, `adjustment_amount`, `adjustment_type`, `revenue_recognition_date`, `calendar_period_id`, `hospital_id`, `currency_code` | Cash applied ÷ net patient revenue for the same period (ratio of period sums) | Net patient revenue (period) | `cashApplied ÷ netPatientRevenue` | Demo Available | Uses applied cash, not received_amount. |
| kpi_rcm_gross_denial_rate | Gross Denial Rate | `claim_id`, `claim_status`, `adjudicated_at`, `denied_amount`, `hospital_id`, `calendar_period_id`, `claim_line_id`, `payer_id` | Unique adjudicated claims with ≥1 denied line ÷ unique adjudicated claims (claim-count grain) | Adjudicated unique claims | `deniedClaims ÷ adjudicatedClaims` | Demo Available | Denominator is adjudicated unique claims, not submissions or submitted claims. |
| kpi_rcm_days_in_ar | Days in AR | `accounts_receivable_balance`, `calendar_period_id`, `hospital_id`, `charge_amount`, `adjustment_amount`, `adjustment_type` | Closing AR ÷ (net patient revenue ÷ days in period); r1 rounding | Net revenue per day | `closingAR ÷ (netPatientRevenue ÷ daysInPeriod)` | Demo Available | Snapshot ÷ daily revenue; quarters use quarter days. |
| kpi_rcm_outstanding_ar | Outstanding AR | `accounts_receivable_balance`, `ar_opening_balance`, `ar_new_receivables`, `paid_amount`, `adjustment_amount`, `adjustment_type`, `adjustment_approved_flag`, `writeoff_amount`, `calendar_period_id`, `hospital_id`, `claim_submitted_at` | Period-end AR snapshot = opening + new receivables − cash applied − approved adjustments − write-offs ± corrections (never Σ of monthly ending balances) | Snapshot at observation date | `closingAR` | Demo Available | Legacy catalog key kpi_rcm_outstanding_ar keeps a fact-ledger binding in bind.ts; the screen uses buildRcmView. |
| kpi_rcm_revenue_at_risk | Revenue at Risk | `denied_amount`, `recoverability_assessment`, `expected_net_value`, `invoice_id`, `accounts_receivable_balance`, `ar_aging_bucket`, `claim_submitted_at` | Recoverable denial value + unbilled service value + AR over 90 days (exposure components) | Sum of exposure components (SAR) | `recoverableDenialValue + unbilledValue + arOver90` | Scenario Only | Recoverable denial value uses an illustrative 40-50% assessment; exposure is not collected cash. |

## Eligibility & Pre-Authorization — `/rcm/eligibility` (6 KPIs)

| KPI ID | Display | Required canonical fields | Transformation (as implemented) | Denominator / grain | Ledger source (`buildRcmView`) | Readiness | Notes |
|---|---|---|---|---|---|---|---|
| kpi_rcm_eligibility_verification_rate | Eligibility Verified | `eligibility_request_id`, `eligibility_status`, `eligibility_verified_at`, `encounter_id`, `hospital_id`, `calendar_period_id` | Encounters with completed eligibility response ÷ encounters requiring verification | Encounters requiring verification | `eligibilityVerified ÷ eligibilityRequired` | Demo Available |  |
| kpi_rcm_coverage_exception_rate | Coverage Exceptions | `eligibility_request_id`, `eligibility_status`, `eligibility_verified_at`, `encounter_id`, `hospital_id`, `calendar_period_id`, `coverage_effective_at`, `policy_id` | Coverage exceptions / inactive policies ÷ verified eligibility responses | Verified responses | `coverageExceptions ÷ eligibilityVerified` | Demo Available | Administrative flags; not clinical eligibility decisions. |
| kpi_rcm_preauth_approval_rate | Auth Approval Rate | `authorization_id`, `authorization_status`, `authorization_requested_at`, `authorization_approved_at`, `hospital_id`, `calendar_period_id` | Approved authorizations ÷ decided (approved + rejected) requests; pending excluded | Decided requests | `authApproved ÷ authDecided` | Demo Available |  |
| kpi_rcm_pending_authorizations | Pending Auths | `authorization_id`, `authorization_status`, `authorization_requested_at`, `authorization_approved_at`, `hospital_id`, `calendar_period_id` | Opening pending + requested − decided = closing pending (period-end stock) | Open requests snapshot | `authPending` | Demo Available | Identity: authRequested + authOpeningPending = authDecided + authPending. |
| kpi_rcm_auth_turnaround_days | Auth Turnaround | `authorization_id`, `authorization_status`, `authorization_requested_at`, `authorization_approved_at`, `hospital_id`, `calendar_period_id` | Volume-weighted mean days from request to decision for decided requests (Σ tenths × decided ÷ decided ÷ 10) | Decided requests | `authTurnaroundTenthsSum ÷ authDecided ÷ 10` | Demo Available | Implemented as a volume-weighted mean; the ownership text says median. See limitations. |
| kpi_rcm_auth_denial_exposure | Auth Denial Exposure | `denied_amount`, `denial_reason_code`, `authorization_status`, `claim_line_id` | Denied value in the missing-authorization reason category | Denied amount (SAR) | `reasonAmount[Missing authorization]` | Demo Available | Overlaps denial totals on Claims; not additive. |

## Charge Capture & Billing — `/rcm/billing` (6 KPIs)

| KPI ID | Display | Required canonical fields | Transformation (as implemented) | Denominator / grain | Ledger source (`buildRcmView`) | Readiness | Notes |
|---|---|---|---|---|---|---|---|
| kpi_rcm_charge_capture_rate | Charge Capture | `charge_id`, `charge_status`, `service_id`, `service_billable_flag`, `service_performed_at`, `department_id`, `hospital_id`, `calendar_period_id` | Captured billable charges ÷ eligible chargeable services (excludes nonbillable, bundled, cancelled) | Eligible chargeable services | `capturedCharges ÷ chargeableServices` | Demo Available |  |
| kpi_rcm_unbilled_encounters | Unbilled Encounters | `encounter_id`, `invoice_id`, `coding_status`, `service_billable_flag`, `hospital_id`, `calendar_period_id` | Eligible completed encounters without an invoice (period-end WIP stock) | Snapshot count | `unbilledEncounters (closing WIP ÷ encounter value)` | Demo Available | Work-in-progress stock, not lost revenue. |
| kpi_rcm_unbilled_service_value | Unbilled Value | `encounter_id`, `invoice_id`, `expected_net_value`, `service_billable_flag`, `hospital_id`, `calendar_period_id` | Expected net value of eligible unbilled services at period end | Snapshot (SAR) | `unbilledValue (closing WIP)` | Demo Available | Expected net, not gross charges as cash; valuation uses a demo allowance assumption. |
| kpi_rcm_charge_to_bill_lag | Charge-to-Bill Lag | `charge_created_at`, `invoice_date`, `invoice_id`, `hospital_id`, `calendar_period_id` | Volume-weighted mean days from final charge post to invoice date for billed encounters | Invoices created | `chargeLagTenthsSum ÷ invoicesCreated ÷ 10` | Demo Available | Implemented as a volume-weighted mean; the ownership text says median. |
| kpi_rcm_coding_completion_rate | Coding Complete | `coding_status`, `coding_completed_at`, `encounter_id`, `hospital_id`, `calendar_period_id` | Encounters with completed coding ÷ encounters ready for coding | Ready for coding | `codingComplete ÷ codingReady` | Demo Available | Operational completion, not coding accuracy. |
| kpi_rcm_billing_exception_rate | Billing Exceptions | `billing_exception_id`, `billing_exception_reason`, `invoice_id`, `hospital_id`, `calendar_period_id` | Open billing exceptions ÷ invoices created in the period | Invoices created | `billingExceptions ÷ invoicesCreated` | Demo Available | Reason split on the screen is illustrative. |

## Claims & Denial Intelligence — `/rcm/claims` (6 KPIs)

| KPI ID | Display | Required canonical fields | Transformation (as implemented) | Denominator / grain | Ledger source (`buildRcmView`) | Readiness | Notes |
|---|---|---|---|---|---|---|---|
| kpi_rcm_claims_submitted | Claims Submitted | `claim_id`, `claim_submission_id`, `claim_submitted_at`, `hospital_id`, `calendar_period_id` | Count distinct claim_id with ≥1 submission in the period (resubmissions are not new unique claims) | Unique claims | `uniqueClaims` | Demo Available | submissionAttempts ≥ uniqueClaims; resubmissions = difference. |
| kpi_rcm_first_pass_acceptance | First-Pass Accept | `claim_id`, `claim_submission_id`, `claim_submission_attempt_no`, `clearinghouse_reject_flag`, `hospital_id`, `calendar_period_id` | Claims accepted on first submission ÷ unique claims with a first submission | Unique claims (first submission) | `firstPassAccepted ÷ uniqueClaims` | Demo Available | Clearinghouse reject ≠ payer denial; firstPassAccepted + rejects = uniqueClaims. |
| kpi_rcm_denied_claims | Denied Claims | `claim_id`, `claim_status`, `adjudicated_at`, `denied_amount`, `hospital_id`, `calendar_period_id`, `claim_line_id` | Count of unique adjudicated claims with ≥1 denied line | Unique adjudicated claims | `deniedClaims` | Demo Available | Counts unique claims, not denial lines or resubmissions. |
| kpi_rcm_denial_rate_by_value | Denied Value Rate | `denied_amount`, `billed_amount`, `claim_line_id`, `adjudicated_at`, `hospital_id`, `calendar_period_id` | Denied amount ÷ adjudicated claim amount (claim-line grain) | Adjudicated amount (SAR) | `deniedAmount ÷ adjudicatedAmount` | Demo Available | Value grain; may differ from count-based denial rate. |
| kpi_rcm_appeal_success_rate | Appeal Success | `appeal_id`, `appeal_status`, `appeal_decided_at`, `claim_id`, `hospital_id`, `calendar_period_id` | Successful appeals ÷ decided appeals (pending excluded) | Decided appeals | `appealWon ÷ appealDecided` | Demo Available |  |
| kpi_rcm_recoverable_denial_value | Recoverable Denials | `denied_amount`, `recoverability_assessment`, `denial_reason_code`, `appeal_status`, `claim_line_id` | Denied amount × assessed recoverability under appeal/resubmission rules | Denied amount (SAR) | `recoverableDenialValue` | Scenario Only | Demo assessment is 40-50% of denied value; illustrative, not collected. |

## Accounts Receivable & Collections — `/rcm/collections` (6 KPIs)

| KPI ID | Display | Required canonical fields | Transformation (as implemented) | Denominator / grain | Ledger source (`buildRcmView`) | Readiness | Notes |
|---|---|---|---|---|---|---|---|
| kpi_rcm_cash_applied | Cash Applied | `paid_amount`, `payment_applied_at`, `payment_id`, `payer_id`, `calendar_period_id`, `hospital_id` | Σ cash applied to encounter AR in the period (flow) | Period flow (SAR) | `cashApplied` | Demo Available | Distinct from received cash and from the AR snapshot. |
| kpi_rcm_ar_over_90 | AR > 90 Days | `accounts_receivable_balance`, `ar_aging_bucket`, `claim_submitted_at`, `claim_id`, `hospital_id`, `calendar_period_id` | AR in 91-120 and >120 day buckets, aged from claim submission date | Closing AR snapshot (SAR) | `arAging[3] + arAging[4]` | Demo Available | Aging clock = claim submission date (AGING_CLOCK). |
| kpi_rcm_collection_effectiveness | Collection Effectiveness | `accounts_receivable_balance`, `ar_opening_balance`, `ar_new_receivables`, `paid_amount`, `adjustment_amount`, `adjustment_type`, `adjustment_approved_flag`, `writeoff_amount`, `calendar_period_id`, `hospital_id` | Cash applied ÷ (opening AR + new receivables − approved adjustments) | Collectible receivables (SAR) | `cashApplied ÷ (openingAR + newReceivables − approvedAdjustments)` | Demo Available | Ownership text mentions 'ending contractual adjustments'; the implemented denominator uses approved adjustments. |
| kpi_rcm_unapplied_cash | Unapplied Cash | `received_amount`, `paid_amount`, `unapplied_amount`, `remittance_id`, `payment_received_at`, `payment_applied_at`, `cash_application_exception_reason` | Cash received − cash applied for the period (never negative) | Period difference (SAR) | `cashReceived − cashApplied` | Demo Available | Cash received ≠ cash applied; YTD stock reported separately (unappliedStockYtd). |
| kpi_rcm_payer_payment_delay | Payer Pay Delay | `payer_payment_delay_days`, `claim_submitted_at`, `payment_applied_at`, `claim_id`, `payer_id`, `hospital_id`, `calendar_period_id` | Volume-weighted mean days from claim submission to first payment application for paid claims | Paid claims | `payerDelayDaysSum ÷ paidClaims` | Demo Available | Implemented as a volume-weighted mean; the ownership text says median. |
| kpi_rcm_patient_ar | Patient AR | `accounts_receivable_balance`, `responsible_party_type`, `payer_id`, `calendar_period_id`, `hospital_id` | Ending patient-responsibility AR (closing AR × demo patient share) | Closing AR snapshot (SAR) | `patientAR` | Partially Mapped | Patient/insurer split is a demo share of closing AR; production needs responsible-party balance lines. |

## Revenue Leakage & Financial Integrity — `/rcm/leakage` (6 KPIs)

| KPI ID | Display | Required canonical fields | Transformation (as implemented) | Denominator / grain | Ledger source (`buildRcmView`) | Readiness | Notes |
|---|---|---|---|---|---|---|---|
| kpi_rcm_confirmed_leakage | Confirmed Leakage | `missed_charge_flag`, `expected_net_value`, `writeoff_reason`, `writeoff_amount`, `allowed_amount`, `paid_amount`, `leakage_driver_id`, `leakage_status`, `adjustment_type` | Missed charges + avoidable write-offs + underpayments with exclusive attribution; contractual allowances excluded | Sum of exclusive drivers (SAR) | `missedChargeExposure + avoidableWriteoffs + underpaymentValue` | Demo Available | Drivers sum exactly to the total; contractual allowances are never leakage. |
| kpi_rcm_potential_leakage | Potential Leakage | `leakage_status`, `leakage_driver_id`, `missed_charge_flag`, `allowed_amount`, `paid_amount` | Suspected / under-review exposure not yet confirmed | Sum (SAR) | `potentialLeakage` | Scenario Only | Demo value is a fraction of confirmed drivers; not additive to confirmed leakage. |
| kpi_rcm_underpayment_value | Underpayments | `allowed_amount`, `paid_amount`, `contract_id`, `claim_line_id`, `payer_id` | Allowed − paid on underpaid adjudicated lines (contract variance) | Adjudicated lines (SAR) | `underpayments` | Partially Mapped | Demo value is a share of cash applied; production needs contract-rate allowed amounts. |
| kpi_rcm_missed_charge_exposure | Missed Charges | `missed_charge_flag`, `service_id`, `service_billable_flag`, `expected_net_value`, `department_id`, `service_line_id` | Expected net value of eligible chargeable services not captured | Chargeable services (SAR) | `missedCharges` | Demo Available | Not every unmatched clinical event is a missed charge. |
| kpi_rcm_avoidable_writeoffs | Avoidable Write-offs | `writeoff_id`, `writeoff_reason`, `writeoff_amount`, `claim_id` | Write-offs classified preventable (excludes contractual and bad debt) | Write-offs (SAR) | `avoidableWriteoffs` | Scenario Only | Demo classifies 38-48% of write-offs as avoidable (assumption). |
| kpi_rcm_recovery_opportunities | Recovery Opps | `recovery_work_item_id`, `leakage_driver_id`, `claim_id`, `action_owner_id` | Open recovery work items with exclusive attribution | Work items | `recoveryOpportunities` | Scenario Only | Demo count is derived from driver values; work items are not recovered amounts. |

## RCM Optimization & What-If — `/rcm/optimization` (5 KPIs)

| KPI ID | Display | Required canonical fields | Transformation (as implemented) | Denominator / grain | Ledger source (`buildRcmView`) | Readiness | Notes |
|---|---|---|---|---|---|---|---|
| kpi_rcm_recoverable_opportunity | Recoverable Opportunity | `opportunity_id`, `opportunity_eligible_value`, `recoverability_assessment` | Eligible denial recovery + preventable leakage under documented assumptions | Modeled sum (SAR) | `eligibleDenialRecovery + preventableLeakage` | Scenario Only | Illustrative; scenarios overlap. |
| kpi_rcm_eligible_denial_recovery | Denial Recovery | `opportunity_id`, `opportunity_eligible_value`, `denied_amount`, `recoverability_assessment` | Recoverable denial value × 62% appeal/resubmission assumption | Modeled (SAR) | `opp[rcm-denials-down]` | Scenario Only | Simulated recovery ≠ collected cash. |
| kpi_rcm_collection_improvement | Collection Potential | `opportunity_id`, `opportunity_eligible_value`, `claim_submission_attempt_no`, `invoice_id` | First-pass uplift value + unbilled release value (timing scenarios) | Modeled (SAR) | `opp[first-pass] + opp[workflow]` | Scenario Only | Timing acceleration, not new revenue. |
| kpi_rcm_preventable_leakage | Preventable Leakage | `opportunity_id`, `opportunity_eligible_value`, `leakage_driver_id` | Capturable missed charges + recoverable underpayments + avoidable write-offs | Modeled (SAR) | `opp[capture] + opp[underpay] + opp[writeoff]` | Scenario Only | Illustrative; contractual adjustments never leakage. |
| kpi_rcm_cash_acceleration | Cash Acceleration | `opportunity_id`, `opportunity_eligible_value`, `ar_aging_bucket`, `claim_submitted_at` | 30% of AR over 90 days + 8% of 61-90 day AR collected earlier | Modeled (SAR) | `opp[rcm-ar-accelerate]` | Scenario Only | Timing shift only. |

## Full KPI inventory — decision question owned

| KPI ID | Full name | Owner screen | Route | Ownership definition (`rcmOwnership.ts`) |
|---|---|---|---|---|
| kpi_rcm_net_patient_revenue | Net Patient Revenue | command | /rcm | Gross charges − contractual allowances for eligible billed encounters (recognized net revenue, not cash) |
| kpi_rcm_net_collection_rate | Net Collection Rate | command | /rcm | Cash applied ÷ net patient revenue for the same eligible period (applied cash, not remittance receipts alone) |
| kpi_rcm_gross_denial_rate | Gross Denial Rate (Claim Count) | command | /rcm | Unique eligible claims with an adjudicated denial ÷ unique eligible adjudicated claims |
| kpi_rcm_days_in_ar | Days in Accounts Receivable | command | /rcm | Ending AR ÷ (period net patient revenue ÷ days in period) — snapshot conversion speed |
| kpi_rcm_outstanding_ar | Outstanding Accounts Receivable | command | /rcm | Year-end / period-end AR snapshot (not the sum of monthly ending balances) |
| kpi_rcm_revenue_at_risk | Revenue at Risk | command | /rcm | Eligible denied + unbilled + aged>90 AR exposure under recoverability caps (illustrative, not collected cash) |
| kpi_rcm_eligibility_verification_rate | Eligibility Verification Rate | eligibility | /rcm/eligibility | Encounters with completed eligibility response ÷ encounters requiring verification |
| kpi_rcm_coverage_exception_rate | Coverage Exception Rate | eligibility | /rcm/eligibility | Coverage exceptions / inactive policies ÷ verified eligibility responses |
| kpi_rcm_preauth_approval_rate | Pre-Authorization Approval Rate | eligibility | /rcm/eligibility | Approved authorizations ÷ decided authorization requests (excludes still-pending) |
| kpi_rcm_pending_authorizations | Pending Authorizations | eligibility | /rcm/eligibility | Open authorization requests at observation (not auto-approved care) |
| kpi_rcm_auth_turnaround_days | Authorization Turnaround Time | eligibility | /rcm/eligibility | Median days from authorization request to decision for decided requests |
| kpi_rcm_auth_denial_exposure | Authorization-Related Denial Exposure | eligibility | /rcm/eligibility | Denied claim value attributable to missing/expired/rejected authorization on adjudicated lines |
| kpi_rcm_charge_capture_rate | Charge Capture Rate | billing | /rcm/billing | Billable captured charges ÷ eligible delivered chargeable services (excludes nonbillable / bundled / cancelled) |
| kpi_rcm_unbilled_encounters | Unbilled Encounters | billing | /rcm/billing | Eligible completed encounters without an invoice past the billing lag target |
| kpi_rcm_unbilled_service_value | Unbilled Service Value | billing | /rcm/billing | Expected net value of eligible unbilled chargeable services (not gross charges as cash) |
| kpi_rcm_charge_to_bill_lag | Charge-to-Bill Lag | billing | /rcm/billing | Median days from final charge post to invoice date for billed encounters |
| kpi_rcm_coding_completion_rate | Coding Completion Rate | billing | /rcm/billing | Encounters with completed coding ÷ encounters ready for coding |
| kpi_rcm_billing_exception_rate | Billing Exception Rate | billing | /rcm/billing | Open billing exceptions ÷ invoices created in period |
| kpi_rcm_claims_submitted | Unique Claims Submitted | claims | /rcm/claims | Unique claim IDs with ≥1 submission in period (resubmissions are not new unique claims) |
| kpi_rcm_first_pass_acceptance | First-Pass Acceptance Rate | claims | /rcm/claims | Claims accepted on first submission ÷ unique claims with a first submission (clearinghouse reject ≠ payer denial) |
| kpi_rcm_denied_claims | Denied Claims (Unique) | claims | /rcm/claims | Unique adjudicated claims with ≥1 denied line |
| kpi_rcm_denial_rate_by_value | Denied Value Rate | claims | /rcm/claims | Denied amount ÷ eligible adjudicated claim amount (claim-line grain) |
| kpi_rcm_appeal_success_rate | Appeal Success Rate | claims | /rcm/claims | Successful appeals ÷ decided appeals (pending excluded) |
| kpi_rcm_recoverable_denial_value | Recoverable Denial Value | claims | /rcm/claims | Eligible denied amount assessed recoverable under appeal/resubmission rules (illustrative — not collected) |
| kpi_rcm_cash_applied | Cash Applied | collections | /rcm/collections | Period cash applied to encounter AR (flow — distinct from remittance receipts and from ending AR snapshot) |
| kpi_rcm_ar_over_90 | AR Over 90 Days | collections | /rcm/collections | AR aged >90 days from claim submission date (documented aging clock) |
| kpi_rcm_collection_effectiveness | Collection Effectiveness Index | collections | /rcm/collections | Cash applied ÷ (opening AR + new receivables − ending contractual adjustments) for eligible cohorts |
| kpi_rcm_unapplied_cash | Unapplied Cash | collections | /rcm/collections | Remittances received not yet applied to encounter AR (cash received ≠ cash applied) |
| kpi_rcm_payer_payment_delay | Payer Payment Delay | collections | /rcm/collections | Median days from claim submission to first payment application for paid claims |
| kpi_rcm_patient_ar | Patient Responsibility AR | collections | /rcm/collections | Ending patient-responsibility AR (distinct from insurer AR; not equal to total Outstanding AR) |
| kpi_rcm_confirmed_leakage | Confirmed Revenue Leakage | leakage | /rcm/leakage | Exclusive attributed lost recoverable value (missed charges + avoidable write-offs + confirmed underpayments) — contractual allowances excluded |
| kpi_rcm_potential_leakage | Potential Leakage Exposure | leakage | /rcm/leakage | Suspected / under-review exposure not yet confirmed (not additive to confirmed leakage) |
| kpi_rcm_underpayment_value | Underpayment Value | leakage | /rcm/leakage | Allowed − paid on underpaid adjudicated lines (contract variance), exclusive attribution |
| kpi_rcm_missed_charge_exposure | Missed Charge Exposure | leakage | /rcm/leakage | Expected net of eligible chargeable services not captured (not every unmatched clinical event) |
| kpi_rcm_avoidable_writeoffs | Avoidable Write-offs | leakage | /rcm/leakage | Write-offs classified preventable (excludes legitimate contractual adjustments and nonrecoverable bad debt) |
| kpi_rcm_recovery_opportunities | Recovery Opportunity Count | leakage | /rcm/leakage | Open recovery work items with exclusive financial attribution |
| kpi_rcm_recoverable_opportunity | Recoverable Revenue Opportunity | optimization | /rcm/optimization | Illustrative feasible recovery under documented assumptions (not realized cash) |
| kpi_rcm_eligible_denial_recovery | Eligible Denial Recovery | optimization | /rcm/optimization | Modeled recoverable denial share under appeal/eligibility constraints |
| kpi_rcm_collection_improvement | Collection Improvement Potential | optimization | /rcm/optimization | Illustrative cash acceleration / effectiveness uplift — not new recognized revenue |
| kpi_rcm_preventable_leakage | Preventable Leakage | optimization | /rcm/optimization | Eligible confirmed leakage addressable by process interventions |
| kpi_rcm_cash_acceleration | Cash Acceleration Opportunity | optimization | /rcm/optimization | Illustrative earlier application of eligible collections (timing shift, not new revenue) |

## Chart ownership registry (42 unique charts)

Every chart answers a distinct management question; chart titles and IDs are unique across screens (`RCM_CHART_OWNERS`).


### RCM Command Center — `/rcm` (6 charts)

| Chart ID | Title | Management question | Required canonical fields | Measure |
|---|---|---|---|---|
| rcm_rev_trend | Revenue and Collections Trend | How are net revenue and applied collections moving? | `charge_amount`, `adjustment_amount`, `paid_amount`, `revenue_recognition_date`, `payment_applied_at`, `calendar_period_id` | Monthly net revenue vs applied cash (SAR M) |
| rcm_claims_lifecycle | Claims Lifecycle Overview | Where do claims sit in the lifecycle? | `claim_id`, `claim_submission_id`, `claim_status`, `clearinghouse_reject_flag`, `adjudicated_at` | Unique claims → first-pass → adjudicated → paid → denied (counts) |
| rcm_payer_health | Revenue Cycle Health by Payer | Which payers show weaker collection or higher denial pressure? | `payer_id`, `payer_name`, `paid_amount`, `adjustment_amount`, `claim_id`, `denied_amount` | Collection rate and denial rate by payer (%) |
| rcm_denial_pressure | Denial Pressure Trend | Is denial pressure rising? | `claim_id`, `claim_status`, `adjudicated_at`, `calendar_period_id` | Monthly denied unique claims |
| rcm_ar_aging_overview | AR Aging Overview | How is AR distributed across aging bands? | `accounts_receivable_balance`, `ar_aging_bucket`, `claim_submitted_at` | AR by aging bucket (SAR M) |
| rcm_priority_signals | Executive Financial Priority Signals | Which RCM alerts need leadership focus? | `accounts_receivable_balance`, `paid_amount`, `claim_id`, `charge_id`, `claim_submission_attempt_no` | Severity index vs RCM_TARGETS |

### Eligibility & Pre-Authorization — `/rcm/eligibility` (6 charts)

| Chart ID | Title | Management question | Required canonical fields | Measure |
|---|---|---|---|---|
| rcm_elig_trend | Eligibility Verification Trend | Are eligibility checks keeping pace with encounters? | `eligibility_request_id`, `eligibility_status`, `eligibility_verified_at`, `encounter_id`, `calendar_period_id` | Eligibility verification trend |
| rcm_auth_funnel | Authorization Funnel | How do authorization requests convert to approvals? | `authorization_id`, `authorization_status`, `authorization_requested_at`, `authorization_approved_at` | Requested → decided → approved |
| rcm_pending_auth_age | Pending Authorizations by Age | How old is the pending authorization backlog? | `authorization_id`, `authorization_status`, `authorization_requested_at` | Pending authorizations by age |
| rcm_auth_by_payer | Approval Rate by Payer | Which payers approve authorizations faster or slower? | `authorization_id`, `authorization_status`, `payer_id`, `payer_name` | Approval rate by payer |
| rcm_auth_delay_reasons | Authorization Delay Reasons | What delays authorization decisions? | `authorization_delay_reason`, `authorization_id` | Illustrative delay reasons |
| rcm_auth_exposure | Financial Exposure by Authorization Status | Where does authorization status create financial exposure? | `authorization_status`, `denial_reason_code`, `denied_amount`, `authorization_id` | Exposure by authorization status |

### Charge Capture & Billing — `/rcm/billing` (6 charts)

| Chart ID | Title | Management question | Required canonical fields | Measure |
|---|---|---|---|---|
| rcm_delivered_vs_charges | Delivered Services vs Captured Charges | Are chargeable delivered services being captured? | `service_id`, `service_performed_at`, `service_billable_flag`, `charge_id`, `charge_status`, `calendar_period_id` | Delivered billable services vs captured charges |
| rcm_capture_by_dept | Charge Capture by Department | Which departments under-capture charges? | `department_id`, `charge_id`, `service_id`, `service_billable_flag` | Charge capture rate by department |
| rcm_unbilled_aging | Unbilled Encounters Aging | How old is the unbilled encounter backlog? | `encounter_id`, `invoice_id`, `service_performed_at`, `expected_net_value` | Unbilled encounters by age |
| rcm_coding_backlog | Coding Backlog | Where is coding incomplete? | `coding_status`, `coding_completed_at`, `encounter_id`, `department_id` | Coding backlog |
| rcm_billing_lag | Billing Lag Trend | Is charge-to-bill lag improving? | `charge_created_at`, `invoice_date`, `invoice_id`, `calendar_period_id` | Charge-to-bill lag trend (days) |
| rcm_billing_exceptions | Billing Exceptions by Reason | What drives billing exceptions? | `billing_exception_id`, `billing_exception_reason`, `invoice_id` | Exceptions by reason (illustrative split) |

### Claims & Denial Intelligence — `/rcm/claims` (6 charts)

| Chart ID | Title | Management question | Required canonical fields | Measure |
|---|---|---|---|---|
| rcm_submission_trend | Claims Submission Trend | Are unique claim submissions keeping pace? | `claim_id`, `claim_submission_id`, `claim_submitted_at`, `calendar_period_id` | Unique claim submissions per month |
| rcm_claims_funnel | Claims Lifecycle Funnel | How do claims move from draft to paid/denied? | `claim_id`, `claim_status`, `adjudicated_at`, `claim_submission_attempt_no` | Draft/submitted → paid/denied funnel (counts) |
| rcm_denials_reason | Denials by Reason | Which denial reasons dominate by value? | `denial_reason_code`, `denied_amount`, `claim_line_id` | Denied value by internal reason category |
| rcm_denials_payer | Denials by Payer | Which payers concentrate denials? | `payer_id`, `payer_name`, `denied_amount`, `claim_id`, `adjudicated_at` | Denial rate by payer |
| rcm_appeal_trend | Appeal Outcome Trend | Are appeals succeeding? | `appeal_id`, `appeal_status`, `appeal_decided_at`, `calendar_period_id` | Appeal outcomes |
| rcm_denial_recovery | Denial Recovery Opportunities | Which denied amounts are assessed recoverable? | `denied_amount`, `recoverability_assessment`, `denial_reason_code` | Assessed recoverable denied amounts (illustrative) |

### Accounts Receivable & Collections — `/rcm/collections` (6 charts)

| Chart ID | Title | Management question | Required canonical fields | Measure |
|---|---|---|---|---|
| rcm_ar_buckets | AR Aging Buckets | Where is ending AR concentrated by age? | `accounts_receivable_balance`, `ar_aging_bucket`, `claim_submitted_at` | Ending AR by aging bucket |
| rcm_collections_trend | Collections Trend | How is applied cash trending vs receipts? | `received_amount`, `paid_amount`, `payment_received_at`, `payment_applied_at`, `calendar_period_id` | Applied cash vs received cash |
| rcm_ar_by_payer | AR by Payer | Which payers hold the largest AR? | `accounts_receivable_balance`, `payer_id`, `payer_name`, `responsible_party_type` | Closing AR by payer |
| rcm_payment_delay | Payment Delay Distribution | How long do payers take to pay? | `payer_payment_delay_days`, `claim_submitted_at`, `payment_applied_at`, `payer_id` | Payment delay distribution |
| rcm_cash_exceptions | Cash Application Exceptions | What blocks remittance application? | `cash_application_exception_reason`, `remittance_id`, `unapplied_amount` | Cash application exceptions |
| rcm_collection_worklist | Priority Collection Worklist | Which balances should collectors prioritize? | `accounts_receivable_balance`, `ar_aging_bucket`, `payer_id`, `claim_id`, `action_owner_id` | Priority collection worklist |

### Revenue Leakage & Financial Integrity — `/rcm/leakage` (6 charts)

| Chart ID | Title | Management question | Required canonical fields | Measure |
|---|---|---|---|---|
| rcm_leakage_drivers | Revenue Leakage by Driver | Which exclusive drivers create confirmed leakage? | `leakage_driver_id`, `leakage_status`, `missed_charge_flag`, `writeoff_reason`, `allowed_amount`, `paid_amount` | Exclusive leakage by driver |
| rcm_underpay_payer | Underpayments by Payer | Where do contract underpayments concentrate? | `allowed_amount`, `paid_amount`, `payer_id`, `payer_name`, `contract_id` | Underpayments by payer |
| rcm_contract_variance | Contract Variance Trend | Is allowed-vs-paid variance widening? | `allowed_amount`, `paid_amount`, `contract_id`, `calendar_period_id` | Allowed vs paid variance trend |
| rcm_missed_charges | Missed Charges by Service Line | Which service lines miss eligible charges? | `missed_charge_flag`, `service_line_id`, `expected_net_value` | Missed charges by service line |
| rcm_writeoff_drivers | Write-off Drivers | Which write-offs are avoidable vs contractual? | `writeoff_reason`, `writeoff_amount`, `adjustment_type` | Write-offs: avoidable vs contractual |
| rcm_recovery_matrix | Recovery Opportunity Matrix | Where do recovery effort and value coincide? | `recovery_work_item_id`, `leakage_driver_id`, `expected_net_value`, `action_owner_id` | Recovery effort vs value |

### RCM Optimization & What-If — `/rcm/optimization` (6 charts)

| Chart ID | Title | Management question | Required canonical fields | Measure |
|---|---|---|---|---|
| rcm_recovery_by_driver | Revenue Recovery by Driver | Which interventions unlock the most illustrative recovery? | `opportunity_id`, `opportunity_eligible_value` | Illustrative recovery by intervention |
| rcm_scenario_collections | Current vs Scenario Net Collections | What illustrative collection uplift do scenarios show? | `opportunity_id`, `opportunity_eligible_value`, `paid_amount` | Current vs scenario net collections (illustrative) |
| rcm_denial_reduction | Denial Reduction Opportunity | How much preventable denial value is addressable? | `opportunity_id`, `denied_amount`, `denial_reason_code` | Preventable denial value addressable |
| rcm_cash_accel_chart | Cash Collection Acceleration | What timing shift does acceleration create? | `opportunity_id`, `accounts_receivable_balance`, `ar_aging_bucket` | Cash timing shift (illustrative) |
| rcm_constraints | Financial Constraints by Intervention | What limits feasible recovery? | `opportunity_id`, `opportunity_eligible_value`, `action_owner_id` | Feasibility constraints by intervention |
| rcm_action_priorities | Management Action Priorities | Which actions should leadership prioritize? | `opportunity_id`, `action_owner_id`, `opportunity_eligible_value` | Management action priorities |

## Eight what-if intents → follow-up measures

All eight are **illustrative**: capped at eligible value, never collected cash, overlapping and **not additive**. Eligible values live in `view.opportunities` (`opp[]`).

| # | Intent | Assist prompt | Responsible team | Follow-up KPI | Default size | Documented assumption |
|---|---|---|---|---|---|---|
| 1 | `rcm-denials-down` | What if preventable denials decrease by 20%? | Denials Management | kpi_rcm_gross_denial_rate | 20% | 62% of recoverable denial value is realistically recoverable under appeal and resubmission rules. |
| 2 | `rcm-first-pass-up` | What if first-pass claim acceptance improves by 5%? | Claims Operations | kpi_rcm_first_pass_acceptance | 5% | Rejected claims lose about 40% of claim value in timing; value is timing acceleration, not new revenue. |
| 3 | `rcm-ar-accelerate` | What if aged AR over 90 days is collected 30% faster? | Collections & Patient Financial Services | kpi_rcm_days_in_ar | 30% | 30% of AR over 90 days and 8% of 61–90 day AR is collected earlier; this is a timing shift. |
| 4 | `rcm-auth-up` | What if pre-authorization approval and turnaround improve by 15%? | Pre-Authorization Desk | kpi_rcm_preauth_approval_rate | 15% | 45% of authorization-related denial exposure is preventable; overlaps with the denials scenario. |
| 5 | `rcm-capture-up` | What if charge capture gaps close by 50%? | Charge Capture & Health Information | kpi_rcm_charge_capture_rate | 50% | 55% of missed charge exposure is capturable through documentation and charge-router fixes. |
| 6 | `rcm-underpay-recover` | What if contract underpayments are recovered by 40%? | Payer Contracting | kpi_rcm_underpayment_value | 40% | 50% of contract variance is recoverable after payer dispute cycles. |
| 7 | `rcm-writeoff-down` | What if avoidable write-offs decrease by 30%? | Revenue Integrity | kpi_rcm_avoidable_writeoffs | 30% | 50% of preventable write-offs are avoidable with earlier escalation; bad debt is excluded. |
| 8 | `rcm-workflow-up` | What if coding and billing workflow delays decrease by 20%? | Billing & Coding Operations | kpi_rcm_coding_completion_rate | 20% | 20% of unbilled service value is released earlier through coding and billing exception clearance. |

## Executive alerts → KPIs (eight)

Alerts bind to owned KPIs and share thresholds with `RCM_TARGETS` / alert rules; alert values must not be computed independently.

| KPI ID | Alert title | Owner | Rule (critical / high / medium) |
|---|---|---|---|
| kpi_rcm_gross_denial_rate | High claim denial rate | Denials Management lead | Target 8% · high 10% · critical 12% |
| kpi_rcm_net_collection_rate | Weak net collection rate | Revenue Cycle Director | Target 95% · high 93% · critical 90% |
| kpi_rcm_ar_over_90 | Aged AR over 90 days | Collections & Patient Financial Services lead | SAR 750K · high SAR 1.5M · critical SAR 2.5M |
| kpi_rcm_unbilled_encounters | Unbilled encounter backlog | Billing & Coding Operations lead | 250 · high 450 · critical 700 encounters |
| kpi_rcm_auth_denial_exposure | Authorization-related denial exposure | Pre-Authorization Desk lead | SAR 500K · high SAR 900K · critical SAR 1.5M |
| kpi_rcm_underpayment_value | Contract underpayment variance | Payer Contracting lead | SAR 250K · high SAR 450K · critical SAR 700K |
| kpi_rcm_unapplied_cash | Unapplied cash balance | Cash Posting & Reconciliation lead | SAR 800K · high SAR 1.2M · critical SAR 1.8M |
| kpi_rcm_confirmed_leakage | Confirmed revenue leakage | Revenue Integrity lead | SAR 1.5M · high SAR 2.5M · critical SAR 4.0M |

## Priority signals vs illustrative operating targets (`RCM_TARGETS`)

| Target | Value | Used for |
|---|---|---|
| `netCollectionRate` | 95% | Command priority signal, alert |
| `grossDenialRate` | 8% | Command priority signal, alert |
| `daysInAr` | 45 days | Command priority signal |
| `chargeCaptureRate` | 97% | Command priority signal |
| `firstPassAcceptance` | 94% | Command priority signal |
| `eligibilityVerificationRate` | 96% | Reserved review line |
| `codingCompletionRate` | 95% | What-if baseline context |
| `billingLagDays` | 4 days | Reserved review line |

Targets are demo operating assumptions, not market or regulatory benchmarks.

## Cross-domain non-ownership

Domains 1–11 headline KPIs are not restated as RCM primary KPIs (`RCM_CROSS_DOMAIN_FORBIDDEN`):

ED Visit Volume; Bed Occupancy; Median Length of Stay; OR Utilization; Overall Patient Satisfaction; Survey Response Rate; ICU Admissions; Staffed ICU Beds; Scanner Utilization; Analyzer Utilization; Medication Orders; Appointment No-Show Rate.

These appear in the indicator catalog (`rcmScope.ts`) only as *unavailable / owned elsewhere* context rows. Clinical departments appear in RCM solely as charge-capture / missed-charge attribution labels.

## Known lineage caveats (documented, not hidden)

1. **Mean vs median.** `rcmOwnership.ts` describes authorization turnaround, charge-to-bill lag and payer delay as *median* days. `rcmView.ts` implements **volume-weighted means** and states this in `methodology.daysMeasures`. Lineage above documents the implemented behavior; the ownership text should be aligned before any production claim.
2. **Collection Effectiveness Index.** The ownership text says “− ending contractual adjustments”; the implemented denominator is `openingAR + newReceivables − approvedAdjustments`.
3. **Legacy catalog key.** `kpi_rcm_outstanding_ar` pre-exists in the catalog and keeps a fact-ledger binding in `bind.ts` (`fact.outstanding`); the RCM Command screen displays `buildRcmView().closingAR`. A parity check between the two is not asserted by an automated test. Other legacy `kpi_rcm_*` catalog entries (for example `kpi_rcm_ar_over_90_rate`) are outside the 41-KPI registry.
4. **Aggregate demo ledger.** Claim-line and record-level identities are expected source structures; the demo expresses them as aggregate counts and sums.
5. **Assumption-based values.** Recoverability (40–50% of denied value), avoidable write-off share (38–48%), patient AR share, potential leakage, recovery work-item counts and what-if values are illustrative assumptions (Scenario Only / Partially Mapped).
6. **Presentation currency.** `SAR` is a presentation label; several formatters still prefix `SAR` rather than reading a runtime configuration.
