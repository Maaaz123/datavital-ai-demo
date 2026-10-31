# RCM Data Readiness

**Domain:** Domain 12 — Revenue Cycle Management Intelligence  
**Release:** `v1-rcm` · **BUILD_ID:** `v75-rcm-remediation`  
**Rule:** Demo Available ≠ Production Source Verified.  
**Currency:** `SAR` demo label; configurable; no FX conversion.

This readiness note is production-honest: all 41 headline KPIs are constructible from the deterministic synthetic ledger (`buildRcmView`), but **no** field or KPI in this release is classified Production Source Verified. No customer HIS, ERP, billing, claims, clearinghouse, payer-portal or cash-application feed has been inspected.

## Readiness legend

| State | Meaning |
|---|---|
| Demo Available | Represented in the synthetic demo ledger and used by screens / Assist / alerts / what-if (aggregate grain) |
| Partially Mapped | Expected source pattern known; represented only as aggregate or assumption-based share; real integration incomplete |
| Missing | Needed for production, market configuration or the future profitability domain; not available |
| Scenario Only | Explicitly illustrative (recoverability, preventable classification, delay / exception reasons, what-if values) |
| Production Source Verified | Real hospital feed confirmed — **not used anywhere in Domain 12** |

## Summary

| Measure | Count |
|---|---|
| Canonical fields | 96 |
| Fields — Demo Available | 50 |
| Fields — Missing | 14 |
| Fields — Partially Mapped | 19 |
| Fields — Scenario Only | 13 |
| Fields — Production Source Verified | 0 |
| Headline KPIs | 41 |
| KPIs — Demo Available | 29 |
| KPIs — Partially Mapped | 2 |
| KPIs — Scenario Only | 10 |
| KPIs — Production Source Verified | 0 |
| Charts | 42 |
| Screens | 7 |

## Field / capability matrix

| Canonical field / capability | Demo | Production | Impact if missing in real integration |
|---|---|---|---|
| hospital_id, calendar_period_id, currency_code | Demo Available / Partially Mapped (currency) | Missing | All RCM filters and monetary KPIs blocked; mixed currency must fail closed |
| department_id, service_line_id | Demo Available | Missing | Charge-capture and missed-charge attribution blocked |
| encounter_id, patient_pseudonym_id | Partially Mapped | Missing | Encounter-level joins and drill-through blocked; privacy-safe pseudonymization required |
| payer_id (+ payer_name) | Demo Available | Missing | Payer health, AR by payer, denials by payer blocked |
| insurance_plan_id, policy_id, contract_id | Missing | Missing | Plan-level rates, coverage-exception drill-through and contract-based underpayment unavailable |
| coverage_effective_at | Partially Mapped | Missing | Coverage exception rate cannot be justified on service date |
| eligibility_request_id / status / verified_at | Partially Mapped / Demo Available | Missing | Eligibility verification rate and trend unavailable |
| authorization_id / status / requested_at / approved_at | Demo Available | Missing | Approval rate, pending backlog, turnaround unavailable |
| authorization_delay_reason | Scenario Only | Missing | Delay-reason chart grain omitted |
| service_id, service_performed_at, service_billable_flag | Partially Mapped / Demo Available | Missing | Charge-capture denominator undefined; risk of false missed charges |
| procedure_id | Missing | Missing | Procedure-level analysis unavailable |
| charge_id / amount / status / created_at | Demo Available | Missing | Gross charges, capture rate, lag unavailable |
| missed_charge_flag, expected_net_value | Partially Mapped / Scenario Only | Missing | Missed charge and unbilled value valuation unavailable |
| coding_status / coding_completed_at | Demo Available / Partially Mapped | Missing | Coding completion unavailable |
| invoice_id / date / amount | Demo Available | Missing | Unbilled backlog, billing lag, invoice-to-claim reconciliation unavailable |
| billing_exception_id / reason | Demo Available / Scenario Only | Missing | Billing exception rate / reason split unavailable |
| claim_id, claim_submission_id, attempt no., claim_submitted_at | Demo Available | Missing | Unique-claim vs submission distinction and first-pass blocked; aging clock lost |
| claim_line_id | Partially Mapped | Missing | Claim-line value grain, mixed outcomes and partial denials unavailable |
| claim_status | Demo Available | Missing | Lifecycle funnel unavailable |
| clearinghouse_reject_flag | Demo Available | Missing | First-pass acceptance unavailable |
| clearinghouse_reject_reason | Missing | Missing | Reject-reason split omitted |
| billed_amount, allowed_amount, denied_amount | Demo Available / Partially Mapped | Missing | Denial value rate and underpayment unavailable |
| denial_reason_code (internal) | Demo Available | Missing | Denials by reason unavailable; unmapped codes grouped Unclassified |
| denial_source_code, denial_code_set | Missing | Missing | Raw payer / standards-based code lineage and versioning unavailable |
| denial_contributing_factor, denial_missing_evidence, recoverability_assessment | Scenario Only | Missing | Root-cause intelligence and recoverable value must not be inferred |
| appeal_id / status / decided_at | Partially Mapped / Demo Available | Missing | Appeal success unavailable |
| payment_id, remittance_id | Demo Available / Partially Mapped | Missing | Cash receipt and unapplied traceability unavailable |
| payment_received_at / payment_applied_at / received_amount / paid_amount / unapplied_amount | Demo Available | Missing | Net collection rate, cash applied, unapplied cash unavailable; receipts must not silently reduce AR |
| cash_application_exception_reason | Scenario Only | Missing | Exception chart grain omitted |
| payer_payment_delay_days | Demo Available | Missing | Payer delay distribution unavailable |
| adjustment_id / type / amount / approved flag | Demo Available / Partially Mapped | Missing | Net revenue and AR roll-forward unprovable |
| writeoff_id / reason / amount | Partially Mapped / Scenario Only / Demo Available | Missing | Avoidable write-offs unavailable; do not infer classification |
| accounts_receivable_balance, ar_opening_balance, ar_new_receivables | Demo Available | Missing | AR, Days in AR, roll-forward unavailable |
| ar_aging_bucket | Demo Available | Missing | Aging charts blocked; aging clock must remain claim submission date |
| responsible_party_type | Partially Mapped | Missing | Patient vs insurer AR split is a demo share only |
| revenue_event_id, revenue_recognition_date | Partially Mapped / Demo Available | Missing | Revenue recognition timing and double-count prevention unavailable |
| leakage_driver_id, leakage_status, recovery_work_item_id | Demo Available / Scenario Only | Missing | Leakage attribution and recovery counts unavailable |
| opportunity_id, opportunity_eligible_value, action_owner_id | Scenario Only | Missing | What-if / action priorities unavailable |
| market_code, claim_exchange_format_code, coding_standard_code, tax_treatment_code, payment_model_code | Missing | Missing | Market-specific behavior not configurable; NPHIES / FHIR / X12 not implemented or certified |
| cost_center_id, resource_id | Missing | Missing | Future profitability domain only; not required for RCM |

## KPI readiness

| KPI ID | Owner screen | Demo | Production | Gap / reason |
|---|---|---|---|---|
| kpi_rcm_net_patient_revenue | command | Demo Available | Missing | Needs production feeds for: `charge_amount`, `adjustment_amount`, `adjustment_type`, … |
| kpi_rcm_net_collection_rate | command | Demo Available | Missing | Needs production feeds for: `paid_amount`, `payment_applied_at`, `payer_id`, … |
| kpi_rcm_gross_denial_rate | command | Demo Available | Missing | Needs production feeds for: `claim_id`, `claim_status`, `adjudicated_at`, … |
| kpi_rcm_days_in_ar | command | Demo Available | Missing | Needs production feeds for: `accounts_receivable_balance`, `calendar_period_id`, `hospital_id`, … |
| kpi_rcm_outstanding_ar | command | Demo Available | Missing | Needs production feeds for: `accounts_receivable_balance`, `ar_opening_balance`, `ar_new_receivables`, … |
| kpi_rcm_revenue_at_risk | command | Scenario Only | Missing | Recoverable denial value uses an illustrative 40-50% assessment; exposure is not collected cash. |
| kpi_rcm_eligibility_verification_rate | eligibility | Demo Available | Missing | Needs production feeds for: `eligibility_request_id`, `eligibility_status`, `eligibility_verified_at`, … |
| kpi_rcm_coverage_exception_rate | eligibility | Demo Available | Missing | Needs production feeds for: `eligibility_request_id`, `eligibility_status`, `eligibility_verified_at`, … |
| kpi_rcm_preauth_approval_rate | eligibility | Demo Available | Missing | Needs production feeds for: `authorization_id`, `authorization_status`, `authorization_requested_at`, … |
| kpi_rcm_pending_authorizations | eligibility | Demo Available | Missing | Needs production feeds for: `authorization_id`, `authorization_status`, `authorization_requested_at`, … |
| kpi_rcm_auth_turnaround_days | eligibility | Demo Available | Missing | Needs production feeds for: `authorization_id`, `authorization_status`, `authorization_requested_at`, … |
| kpi_rcm_auth_denial_exposure | eligibility | Demo Available | Missing | Needs production feeds for: `denied_amount`, `denial_reason_code`, `authorization_status`, … |
| kpi_rcm_charge_capture_rate | billing | Demo Available | Missing | Needs production feeds for: `charge_id`, `charge_status`, `service_id`, … |
| kpi_rcm_unbilled_encounters | billing | Demo Available | Missing | Needs production feeds for: `encounter_id`, `invoice_id`, `coding_status`, … |
| kpi_rcm_unbilled_service_value | billing | Demo Available | Missing | Needs production feeds for: `encounter_id`, `invoice_id`, `expected_net_value`, … |
| kpi_rcm_charge_to_bill_lag | billing | Demo Available | Missing | Needs production feeds for: `charge_created_at`, `invoice_date`, `invoice_id`, … |
| kpi_rcm_coding_completion_rate | billing | Demo Available | Missing | Needs production feeds for: `coding_status`, `coding_completed_at`, `encounter_id`, … |
| kpi_rcm_billing_exception_rate | billing | Demo Available | Missing | Needs production feeds for: `billing_exception_id`, `billing_exception_reason`, `invoice_id`, … |
| kpi_rcm_claims_submitted | claims | Demo Available | Missing | Needs production feeds for: `claim_id`, `claim_submission_id`, `claim_submitted_at`, … |
| kpi_rcm_first_pass_acceptance | claims | Demo Available | Missing | Needs production feeds for: `claim_id`, `claim_submission_id`, `claim_submission_attempt_no`, … |
| kpi_rcm_denied_claims | claims | Demo Available | Missing | Needs production feeds for: `claim_id`, `claim_status`, `adjudicated_at`, … |
| kpi_rcm_denial_rate_by_value | claims | Demo Available | Missing | Needs production feeds for: `denied_amount`, `billed_amount`, `claim_line_id`, … |
| kpi_rcm_appeal_success_rate | claims | Demo Available | Missing | Needs production feeds for: `appeal_id`, `appeal_status`, `appeal_decided_at`, … |
| kpi_rcm_recoverable_denial_value | claims | Scenario Only | Missing | Demo assessment is 40-50% of denied value; illustrative, not collected. |
| kpi_rcm_cash_applied | collections | Demo Available | Missing | Needs production feeds for: `paid_amount`, `payment_applied_at`, `payment_id`, … |
| kpi_rcm_ar_over_90 | collections | Demo Available | Missing | Needs production feeds for: `accounts_receivable_balance`, `ar_aging_bucket`, `claim_submitted_at`, … |
| kpi_rcm_collection_effectiveness | collections | Demo Available | Missing | Needs production feeds for: `accounts_receivable_balance`, `ar_opening_balance`, `ar_new_receivables`, … |
| kpi_rcm_unapplied_cash | collections | Demo Available | Missing | Needs production feeds for: `received_amount`, `paid_amount`, `unapplied_amount`, … |
| kpi_rcm_payer_payment_delay | collections | Demo Available | Missing | Needs production feeds for: `payer_payment_delay_days`, `claim_submitted_at`, `payment_applied_at`, … |
| kpi_rcm_patient_ar | collections | Partially Mapped | Missing | Patient/insurer split is a demo share of closing AR; production needs responsible-party balance lines. |
| kpi_rcm_confirmed_leakage | leakage | Demo Available | Missing | Needs production feeds for: `missed_charge_flag`, `expected_net_value`, `writeoff_reason`, … |
| kpi_rcm_potential_leakage | leakage | Scenario Only | Missing | Demo value is a fraction of confirmed drivers; not additive to confirmed leakage. |
| kpi_rcm_underpayment_value | leakage | Partially Mapped | Missing | Demo value is a share of cash applied; production needs contract-rate allowed amounts. |
| kpi_rcm_missed_charge_exposure | leakage | Demo Available | Missing | Needs production feeds for: `missed_charge_flag`, `service_id`, `service_billable_flag`, … |
| kpi_rcm_avoidable_writeoffs | leakage | Scenario Only | Missing | Demo classifies 38-48% of write-offs as avoidable (assumption). |
| kpi_rcm_recovery_opportunities | leakage | Scenario Only | Missing | Demo count is derived from driver values; work items are not recovered amounts. |
| kpi_rcm_recoverable_opportunity | optimization | Scenario Only | Missing | Illustrative; scenarios overlap. |
| kpi_rcm_eligible_denial_recovery | optimization | Scenario Only | Missing | Simulated recovery ≠ collected cash. |
| kpi_rcm_collection_improvement | optimization | Scenario Only | Missing | Timing acceleration, not new revenue. |
| kpi_rcm_preventable_leakage | optimization | Scenario Only | Missing | Illustrative; contractual adjustments never leakage. |
| kpi_rcm_cash_acceleration | optimization | Scenario Only | Missing | Timing shift only. |

## Chart readiness

All 42 charts are driven from the synthetic ledger (Demo Available). The automated pages test asserts at least two `data-chart-state="ok"` charts and zero `invalid` charts on each of the seven screens; per-chart pixel QA is not part of that test. Charts whose measures rely on assumptions are **Scenario Only** in meaning: `rcm_auth_delay_reasons`, `rcm_billing_exceptions`, `rcm_cash_exceptions`, `rcm_denial_recovery`, `rcm_recovery_matrix`, and all six Optimization charts (`rcm_recovery_by_driver`, `rcm_scenario_collections`, `rcm_denial_reduction`, `rcm_cash_accel_chart`, `rcm_constraints`, `rcm_action_priorities`). Production readiness for every chart is **Missing**.

## Accounting, claims and cash gates

| Gate | Rule | Demo | Production |
|---|---|---|---|
| Gross ≠ net ≠ cash | Net = gross − contractual allowance; cash separate | Demo Available | Missing — requires recognized revenue convention sign-off |
| Unique claims ≠ submissions | Distinct `claim_id` vs attempts | Demo Available | Missing |
| Clearinghouse reject ≠ payer denial | Rejects tracked separately; denials after adjudication only | Demo Available | Missing |
| AR snapshot ≠ Σ monthly endings | Year = December; quarter chain opening = prior closing | Demo Available | Missing — requires month-end AR sub-ledger snapshots |
| Cash received ≠ cash applied | Unapplied tracked; unmatched never reduces AR | Demo Available | Missing — requires cash-application ledger |
| Contractual allowance ≠ leakage | Allowances excluded from leakage | Demo Available | Missing — requires adjustment type classification |
| Exclusive leakage attribution | One driver per item; potential not additive | Demo Available | Missing |
| Aging clock = claim submission date | AGING_CLOCK | Demo Available | Missing |
| Currency configurable | `currency_code`, no FX | Partially Mapped | Missing — runtime configuration and display not yet driven by config |
| NPHIES / FHIR / X12 | Potential future integration | Not implemented | Missing — not certified; no compliance claim |

## Privacy, approvals and safety gates

| Gate | Rule |
|---|---|
| Synthetic data | All patient, encounter, payer, policy and financial records are synthetic; no real policy numbers or claims |
| Pseudonymization | `patient_pseudonym_id` only; block MRN, national ID, contact data |
| Human approval | Operational and financial decisions require human approval; no autonomous payer submissions, payment initiation, or automatic write-offs |
| AI boundaries | Vital Assist refuses live claim submission, write-offs and clinical care advice; approval ≠ realized cash |
| Role-based access | Documented expectations in the data dictionary; not enforced in demo |
| Scenario honesty | What-if and recoverability values are illustrative and non-additive; never presented as realized money |

## Integration backlog before any Production Source Verified claim

1. Inventory real HIS/EHR, registration, eligibility, authorization, coding, billing, claims, clearinghouse, payer portal, ERP, payment gateway, cash application and contract sources.
2. Obtain schema evidence and sample extracts; verify identifiers, timestamps and grain (especially claim-line and cash-application).
3. Establish the recognized-revenue convention and month-end AR snapshot ownership with Finance.
4. Build denial-code crosswalks with declared code set + version; do not invent payer codes.
5. Implement market configuration (currency, payer rules, formats, coding standard, tax, payment model); assess NPHIES / FHIR / X12 requirements — certification is out of scope here.
6. Add record-level reconciliation tests: invoice→claim, claim-line totals, mixed outcomes, reversals, credit balances, multi-payer encounters.
7. Align median-vs-mean wording and verify the legacy `kpi_rcm_outstanding_ar` binding against the ledger.

Until items 1–6 are evidenced per source, every field remains **Demo Available / Partially Mapped / Missing / Scenario Only** — never Production Source Verified.
