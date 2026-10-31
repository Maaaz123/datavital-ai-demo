# RCM Source-to-Target Mapping

**Target:** DataVital AI Revenue Cycle canonical model (`buildRcmView`) — `v1-rcm`, BUILD_ID `v75-rcm-remediation`  
**Note:** Source table/column names are **expected patterns**, not verified customer schemas. No field is Production Source Verified.  
**Demo model:** One deterministic full-year monthly ledger per hospital (H1–H5) is simulated once; quarters slice the same ledger and **Hospital ALL is the exact sum of H1–H5**. Flows (revenue, cash, claims, leakage) are summed; stocks (AR, unbilled WIP, pending authorizations) are period-end snapshots. Screens, charts, alerts, Vital Assist and what-if all read the same `buildRcmView` result.  
**Currency:** `SAR` demo label (`RCM_CURRENCY`); configurable; no FX conversion.

## 1. Field mapping by expected source system

Load rule = required status + data-quality rule. “Transform” is the proposed canonical transformation; in the demo the same transformation is expressed as ledger arithmetic.


### HIS / EHR

| Source system | Expected object | Expected column (illustrative) | Target canonical | Transform | Load rule |
|---|---|---|---|---|---|
| HIS / EHR | department master | `department_code` | `department_id` | Normalize to RCM department list (8 departments) | Required; Known department or mapped; clinical KPI ownership stays in Domains 1-10 |
| HIS / EHR | encounter | `encounter_id` | `encounter_id` | Direct; one encounter may have multiple payers (multi-payer encounters) | Required; Unique; no real identifiers in demo |
| HIS / EHR | service_order / catalog | `service_code` | `service_id` | Direct | Required; Exists in charge master |
| HIS / EHR | service_event | `performed_at` | `service_performed_at` | UTC | Required; <= charge_created_at expected |

### Patient Registration

| Source system | Expected object | Expected column (illustrative) | Target canonical | Transform | Load rule |
|---|---|---|---|---|---|
| Patient Registration | patient registry | `hashed_patient_id` | `patient_pseudonym_id` | Hash / tokenize at source boundary | Required; Reject identifiable values; no real PHI |

### Insurance Eligibility Platform

| Source system | Expected object | Expected column (illustrative) | Target canonical | Transform | Load rule |
|---|---|---|---|---|---|
| Insurance Eligibility Platform | coverage / policy | `policy_token` | `policy_id` | Tokenize at source boundary | Conditional; Never store raw policy number; token only |
| Insurance Eligibility Platform | coverage / policy | `effective_from` | `coverage_effective_at` | UTC; compare to service_performed_at | Conditional; effective_from <= effective_to; service within window or flagged as exception |
| Insurance Eligibility Platform | eligibility_request | `request_id` | `eligibility_request_id` | Direct; one request per check | Required; Unique; one required check per eligible encounter |
| Insurance Eligibility Platform | eligibility_request | `requested_at` | `eligibility_requested_at` | UTC | Conditional; <= eligibility_verified_at when present |
| Insurance Eligibility Platform | eligibility_response | `response_status` | `eligibility_status` | Map payer-specific statuses to {VERIFIED, EXCEPTION, NOT_COMPLETED} | Required; Exceptions only among verified responses |
| Insurance Eligibility Platform | eligibility_response | `responded_at` | `eligibility_verified_at` | UTC | Required; >= eligibility_requested_at |

### Authorization Management

| Source system | Expected object | Expected column (illustrative) | Target canonical | Transform | Load rule |
|---|---|---|---|---|---|
| Authorization Management | authorization_request | `auth_request_id` | `authorization_id` | Direct | Required; Unique; opening pending + requested = decided + closing pending |
| Authorization Management | authorization_request | `requested_at` | `authorization_requested_at` | UTC | Required; <= decision time when decided |
| Authorization Management | authorization_request | `decision_status` | `authorization_status` | Map payer statuses to {PENDING, APPROVED, REJECTED} | Required; Pending excluded from approval-rate denominator |
| Authorization Management | authorization_decision | `decided_at` | `authorization_approved_at` | UTC | Conditional; >= authorization_requested_at |
| Authorization Management | authorization_request | `delay_reason_code` | `authorization_delay_reason` | Map to internal delay taxonomy | Optional; Optional; unknown allowed |

### Medical Coding / CDI

| Source system | Expected object | Expected column (illustrative) | Target canonical | Transform | Load rule |
|---|---|---|---|---|---|
| Medical Coding / CDI | coded_procedure | `procedure_code` | `procedure_id` | Map to canonical procedure_id; keep source code set and version | Conditional; Code belongs to declared code set + version |
| Medical Coding / CDI | coding_work_item | `status` | `coding_status` | Map to enum | Required; Complete requires coder sign-off timestamp |
| Medical Coding / CDI | coding_work_item | `completed_at` | `coding_completed_at` | UTC | Conditional; >= encounter discharge/service time |

### Billing System

| Source system | Expected object | Expected column (illustrative) | Target canonical | Transform | Load rule |
|---|---|---|---|---|---|
| Billing System | charge_master / service_event | `is_billable` | `service_billable_flag` | Derive from charge master + bundling + cancellation status | Required; Only billable services enter the charge-capture denominator |
| Billing System | charge | `charge_id` | `charge_id` | Direct | Required; Unique; links to service_id |
| Billing System | charge | `gross_amount` | `charge_amount` | Direct; gross charges - contractual allowances = net patient revenue | Required; Non-negative; credits reverse via adjustments |
| Billing System | charge | `status` | `charge_status` | Map to enum | Required; Reversed/cancelled excluded from captured |
| Billing System | charge | `created_at` | `charge_created_at` | UTC | Required; >= service_performed_at |
| Billing System | charge reconciliation | `is_missed_charge` | `missed_charge_flag` | Derived: service_billable_flag = true AND no posted charge by lag target | Conditional; Must meet billable eligibility; human review before posting |
| Billing System | invoice | `invoice_id` | `invoice_id` | Direct | Required; Unique; unbilled = completed eligible encounter without invoice |
| Billing System | invoice | `invoice_date` | `invoice_date` | Date in hospital timezone | Required; >= charge_created_at date |
| Billing System | invoice | `invoice_total` | `invoice_amount` | Direct | Required; Equals sum of invoice charge lines |
| Billing System | billing_exception | `exception_id` | `billing_exception_id` | Direct | Conditional; Open until cleared |
| Billing System | billing_exception | `reason_code` | `billing_exception_reason` | Map to internal taxonomy | Optional; Optional |
| Billing System | invoice / revenue event | `new_receivable_amount` | `ar_new_receivables` | Net revenue - change in unbilled WIP | Required; net revenue = new receivables + change in WIP |

### Claims Management

| Source system | Expected object | Expected column (illustrative) | Target canonical | Transform | Load rule |
|---|---|---|---|---|---|
| Claims Management | claim | `claim_id` | `claim_id` | Direct | Required; Unique per claim; count distinct for unique-claim KPIs |
| Claims Management | claim_line | `line_id` | `claim_line_id` | Direct | Required; Sum of line billed/allowed/denied/paid = claim totals |
| Claims Management | claim_status_history | `status` | `claim_status` | Event-sourced; keep full state history with timestamps | Required; Valid transitions only; terminal states explicit |
| Claims Management | claim_line | `billed_amount` | `billed_amount` | Direct | Required; Sum lines = claim billed; <= invoice_amount |
| Claims Management | denial_review | `contributing_factor` | `denial_contributing_factor` | Review note | Optional; Optional |
| Claims Management | denial_review | `missing_evidence` | `denial_missing_evidence` | Review note | Optional; Optional |
| Claims Management | denial_review | `recoverability` | `recoverability_assessment` | Reviewer assessment under appeal/resubmission rules | Conditional; Not every denial is recoverable |
| Claims Management | appeal | `appeal_id` | `appeal_id` | Direct | Conditional; Unique; linked to a denied claim |
| Claims Management | appeal | `status` | `appeal_status` | Map to enum | Conditional; Pending excluded from denominator |

### Clearinghouse

| Source system | Expected object | Expected column (illustrative) | Target canonical | Transform | Load rule |
|---|---|---|---|---|---|
| Clearinghouse | submission | `submission_id` | `claim_submission_id` | Direct | Required; submission_attempts >= unique_claims |
| Clearinghouse | submission | `attempt_no` | `claim_submission_attempt_no` | Window count per claim_id by submitted_at | Required; >= 1; first pass uses attempt 1 only |
| Clearinghouse | submission | `submitted_at` | `claim_submitted_at` | UTC | Required; >= invoice_date |
| Clearinghouse | acknowledgement | `is_rejected` | `clearinghouse_reject_flag` | From acknowledgement/rejection response | Required; Rejects never counted as denials; first-pass accepted + rejects = unique claims |
| Clearinghouse | acknowledgement | `reject_reason` | `clearinghouse_reject_reason` | Map to internal taxonomy; keep raw value | Optional; Optional |

### Payer Portals / APIs

| Source system | Expected object | Expected column (illustrative) | Target canonical | Transform | Load rule |
|---|---|---|---|---|---|
| Payer Portals / APIs | adjudication_response | `adjudicated_at` | `adjudicated_at` | UTC | Required; >= claim_submitted_at |
| Payer Portals / APIs | adjudication_line | `allowed_amount` | `allowed_amount` | Direct | Required; <= billed_amount |
| Payer Portals / APIs | adjudication_line | `denied_amount` | `denied_amount` | Sum at claim-line grain | Required; <= billed/adjudicated amount; denied claim count uses unique claims |
| Payer Portals / APIs | adjudication_line / remark | `denial_code` | `denial_reason_code` | Crosswalk raw denial_source_code -> internal category via configurable market table | Required; Every denied line maps to exactly one category |
| Payer Portals / APIs | adjudication_line / remark | `raw_denial_code` | `denial_source_code` | Retain verbatim | Optional; Must declare denial_code_set + version |
| Payer Portals / APIs | appeal_response | `decided_at` | `appeal_decided_at` | UTC | Conditional; >= appeal submission |

### Cash Application

| Source system | Expected object | Expected column (illustrative) | Target canonical | Transform | Load rule |
|---|---|---|---|---|---|
| Cash Application | remittance_advice | `remittance_id` | `remittance_id` | Direct | Required; Unique; received before application |
| Cash Application | cash_application | `applied_at` | `payment_applied_at` | UTC | Conditional; >= payment_received_at |
| Cash Application | cash_application | `applied_amount` | `paid_amount` | Direct | Required; Applied <= received; applied + unapplied = received |
| Cash Application | unapplied_cash_ledger | `unapplied_amount` | `unapplied_amount` | received_amount - paid_amount | Conditional; >= 0 |
| Cash Application | cash_application_exception | `reason_code` | `cash_application_exception_reason` | Map to internal taxonomy | Optional; Optional |
| Cash Application | derived | `days_to_first_payment` | `payer_payment_delay_days` | payment_applied_at(first) - claim_submitted_at | Conditional; Non-negative; paid claims only |

### Payment Gateway

| Source system | Expected object | Expected column (illustrative) | Target canonical | Transform | Load rule |
|---|---|---|---|---|---|
| Payment Gateway | payment | `payment_id` | `payment_id` | Direct | Required; Unique; reversed payments reference original |
| Payment Gateway | payment | `received_at` | `payment_received_at` | UTC | Required; <= payment_applied_at when applied |
| Payment Gateway | payment / remittance | `received_amount` | `received_amount` | Direct | Required; received >= applied for each period |

### ERP / Finance

| Source system | Expected object | Expected column (illustrative) | Target canonical | Transform | Load rule |
|---|---|---|---|---|---|
| ERP / Finance | service line / cost center map | `service_line_code` | `service_line_id` | Map department -> service line | Required; Exactly one service line per department per period; split values sum to total |
| ERP / Finance | ar_adjustment | `adjustment_id` | `adjustment_id` | Direct | Required; Unique; approved adjustments only reduce AR |
| ERP / Finance | ar_adjustment | `type_code` | `adjustment_type` | Map to enum; separate from write-offs | Required; Contractual allowance != write-off != bad debt |
| ERP / Finance | ar_adjustment | `amount` | `adjustment_amount` | Apply sign convention once at load | Required; Sign explicit; corrections may be +/- |
| ERP / Finance | ar_adjustment | `is_approved` | `adjustment_approved_flag` | Direct | Required; Approval timestamp and approver pseudonym required |
| ERP / Finance | writeoff | `writeoff_id` | `writeoff_id` | Direct | Conditional; Unique; approval required |
| ERP / Finance | writeoff | `reason_code` | `writeoff_reason` | Map to internal classes | Required; Contractual and bad debt excluded from avoidable write-offs |
| ERP / Finance | writeoff | `amount` | `writeoff_amount` | Direct | Required; <= AR balance at write-off date |
| ERP / Finance | ar_subledger_snapshot | `ending_balance` | `accounts_receivable_balance` | Snapshot as of period end; year = Dec balance | Required; Roll-forward residual = 0; split by payer/aging sums to closing AR |
| ERP / Finance | ar_subledger_snapshot | `opening_balance` | `ar_opening_balance` | Prior closing | Required; Opening(Qn+1) = Closing(Qn) |
| ERP / Finance | ar_aging | `bucket_code` | `ar_aging_bucket` | Age = observation date - claim_submitted_at | Required; Buckets sum to closing AR |
| ERP / Finance | ar_subledger | `responsible_party` | `responsible_party_type` | Map to enum | Required; Exactly one type per balance line |
| ERP / Finance | revenue_recognition_event | `event_id` | `revenue_event_id` | Direct | Required; Unique |
| ERP / Finance | revenue_recognition_event | `recognized_on` | `revenue_recognition_date` | Per documented convention | Required; Recognized once; denial recovery not double-counted |
| ERP / Finance | gl_cost_center | `cost_center_code` | `cost_center_id` | Direct | Optional; Optional |
| ERP / Finance | resource master | `resource_code` | `resource_id` | Direct | Optional; Optional |

### Contract Management

| Source system | Expected object | Expected column (illustrative) | Target canonical | Transform | Load rule |
|---|---|---|---|---|---|
| Contract Management | payer master | `payer_code` | `payer_id` | Normalize payer master; patient responsibility modeled as a distinct payer | Required; Known payer; AR by payer sums to closing AR |
| Contract Management | payer master | `payer_name` | `payer_name` | Direct | Optional; Max display length fits chart axis |
| Contract Management | plan master | `plan_code` | `insurance_plan_id` | Direct | Conditional; Plan belongs to exactly one payer |
| Contract Management | payer contract | `contract_id` | `contract_id` | Effective-dated join to claim_line by payer, plan, service, date | Conditional; Exactly one effective contract per claim line |
| Contract Management | charge master x contract | `expected_net_amount` | `expected_net_value` | Gross x (1 - expected allowance rate by payer/contract) | Conditional; <= gross charge; uses contract when available |

### DataVital reference / configuration

| Source system | Expected object | Expected column (illustrative) | Target canonical | Transform | Load rule |
|---|---|---|---|---|---|
| DataVital reference / configuration | facility master / org API | `facility_code` | `hospital_id` | Map site code to hospital_id; ALL = exact sum of H1-H5 ledgers | Required; Must be in demo site set {H1..H5, ALL}; ALL recomputes rates from summed numerators/denominators |
| DataVital reference / configuration | calendar | `period_id` | `calendar_period_id` | Derive from event timestamps; quarters slice the same monthly ledger as the year | Required; Quarter flows sum to year; opening AR of Qn+1 = closing AR of Qn |
| DataVital reference / configuration | market configuration | `currency_code` | `currency_code` | Direct from configuration; amounts stored in minor-unit-free numeric | Required; Single currency per hospital-period; mixed currency blocks aggregation |
| DataVital reference / configuration | market configuration | `denial_code_set` | `denial_code_set` | Configuration | Conditional; Required whenever denial_source_code is stored |
| DataVital reference / configuration | leakage taxonomy | `driver_code` | `leakage_driver_id` | Assign by priority rule; contractual allowances never assigned | Conditional; Exclusive; sums to confirmed leakage |
| DataVital reference / configuration | leakage review | `status` | `leakage_status` | Review workflow state | Conditional; Potential never added to confirmed |
| DataVital reference / configuration | recovery worklist | `work_item_id` | `recovery_work_item_id` | Direct | Optional; Unique |
| DataVital reference / configuration | what-if catalog | `opportunity_code` | `opportunity_id` | Static catalog | Conditional; Eight unique IDs |
| DataVital reference / configuration | what-if model | `eligible_value` | `opportunity_eligible_value` | Eligible cohort x documented assumption | Conditional; Capped at eligible value |
| DataVital reference / configuration | management action | `owner_team_id` | `action_owner_id` | Directory lookup | Optional; Required before approval |
| DataVital reference / configuration | market configuration | `market_code` | `market_code` | Configuration | Optional; Valid profile |
| DataVital reference / configuration | market configuration | `claim_format_code` | `claim_exchange_format_code` | Configuration | Optional; Informational |
| DataVital reference / configuration | market configuration | `coding_standard` | `coding_standard_code` | Configuration | Optional; Version required if set |
| DataVital reference / configuration | market configuration | `tax_treatment` | `tax_treatment_code` | Configuration | Optional; Informational |
| DataVital reference / configuration | market configuration | `payment_model` | `payment_model_code` | Configuration | Optional; Informational |

## 2. Demo ledger → canonical aggregate map

How the aggregate ledger in `rcmView.ts` stands in for the record-level canonical fields above.

| Ledger variable(s) | Represents | Canonical source fields | Grain |
|---|---|---|---|
| `grossCharges`, `contractualAllowances`, `netPatientRevenue` | Gross → net revenue | `charge_amount`, `adjustment_amount` (`adjustment_type`=CONTRACTUAL_ALLOWANCE), `revenue_recognition_date` | hospital × month |
| `openingAR`, `newReceivables`, `cashApplied`, `approvedAdjustments`, `writeOffs`, `corrections`, `closingAR` | AR roll-forward | `ar_opening_balance`, `ar_new_receivables`, `paid_amount`, `adjustment_amount`, `writeoff_amount`, `accounts_receivable_balance` | hospital × month; closing = snapshot |
| `cashReceived`, `unappliedCash`, `unappliedStockYtd` | Receipts vs application | `received_amount`, `paid_amount`, `unapplied_amount` | hospital × month; YTD stock |
| `arAging[5]` | Aging buckets on claim submission date | `ar_aging_bucket`, `claim_submitted_at` | snapshot |
| `patientAR`, `insurerAR` | Responsible-party split | `responsible_party_type` | snapshot (demo share) |
| `uniqueClaims`, `submissionAttempts`, `firstPassAccepted`, `clearinghouseRejects` | Claim lifecycle | `claim_id`, `claim_submission_id`, `claim_submission_attempt_no`, `clearinghouse_reject_flag` | hospital × month |
| `adjudicatedClaims`, `deniedClaims`, `adjudicatedAmount`, `deniedAmount` | Adjudication / denial | `adjudicated_at`, `denied_amount`, `billed_amount`, `claim_status` | hospital × month |
| `appealDecided`, `appealWon`, `recoverableDenialValue` | Appeals / recoverability | `appeal_status`, `recoverability_assessment` | hospital × month |
| `payerDelayDaysSum` | Payment delay | `payer_payment_delay_days` | paid claims |
| `eligibilityRequired`, `eligibilityVerified`, `coverageExceptions` | Eligibility cohort | `eligibility_request_id`, `eligibility_status`, `eligibility_verified_at` | encounters |
| `authRequested`, `authOpeningPending`, `authApproved`, `authRejected`, `authPending`, `authTurnaroundTenthsSum` | Authorization lifecycle | `authorization_id`, `authorization_status`, `authorization_requested_at`, `authorization_approved_at` | requests |
| `chargeableServices`, `capturedCharges`, `missedCharges` | Charge capture | `service_billable_flag`, `charge_id`, `charge_status`, `missed_charge_flag`, `expected_net_value` | services |
| `unbilledEncounters`, `unbilledValue`, `openingUnbilledValue` | Unbilled WIP stock | `invoice_id` (absence), `expected_net_value` | snapshot |
| `codingReady`, `codingComplete`, `invoicesCreated`, `billingExceptions`, `chargeLagTenthsSum` | Coding / billing | `coding_status`, `invoice_id`, `billing_exception_id`, `charge_created_at`, `invoice_date` | encounters / invoices |
| `avoidableWriteoffs`, `underpayments`, `potentialLeakage`, `recoveryOpportunities` | Leakage | `writeoff_reason`, `allowed_amount`, `paid_amount`, `leakage_driver_id`, `leakage_status`, `recovery_work_item_id` | hospital × month |
| `payerNet`, `payerCash`, `payerAR`, `payerAdjudicated`, `payerDenied`, `payerAuthDecided`, `payerAuthApproved` | Payer splits | `payer_id` | period |
| `reasonCount`, `reasonAmount` | Denial reason split | `denial_reason_code` | period |
| `deptChargeable`, `deptMissedServices`, `deptMissedValue`, `slMissedServices`, `slMissedValue` | Department / service-line splits | `department_id`, `service_line_id` | period |
| `opp[8]` | What-if eligible values | `opportunity_id`, `opportunity_eligible_value` | period (scenario) |

## 3. Market configuration mapping

| Concern | Target canonical | Demo behavior | Production approach |
|---|---|---|---|
| Currency | `currency_code` | `SAR` label via `RCM_CURRENCY`; arithmetic currency-agnostic; display formatters still prefix `SAR` | Drive display and aggregation guard from configuration; block mixed-currency aggregation |
| Payer rules | `payer_id`, `contract_id`, `insurance_plan_id` | 5 fictional payers; no real payer rules | Contract and plan reference data; no country rule in KPI logic |
| Claim file format | `claim_exchange_format_code` | None — no external submission | Adapter per market (NPHIES / FHIR, X12 837/835, local) — not certified |
| Coding standard | `coding_standard_code`, `procedure_id` | Not modeled | Declare standard + version |
| Denial codes | `denial_reason_code`, `denial_source_code`, `denial_code_set` | 9 internal categories; no payer codes invented | Crosswalk raw → internal category with source and version |
| Tax / payment model | `tax_treatment_code`, `payment_model_code` | None applied | Market profile |

## 4. Potential standards crosswalk (illustrative, not implemented or certified)

| Canonical concept | HL7 FHIR financial resource (potential) | X12 (potential, US) | NPHIES (Saudi, where applicable) |
|---|---|---|---|
| Coverage / policy | Coverage | 271 (response) | To be assessed |
| Eligibility check | CoverageEligibilityRequest / Response | 270 / 271 | To be assessed |
| Authorization | Claim (use = preauthorization) / ClaimResponse | 278 | To be assessed |
| Charge | ChargeItem | — | — |
| Invoice | Invoice | — | — |
| Claim / claim line / submission | Claim | 837 | To be assessed |
| Adjudication / denial | ClaimResponse / ExplanationOfBenefit | 277CA / 835 | To be assessed |
| Payment / remittance | PaymentNotice / PaymentReconciliation | 835 | To be assessed |
| AR / account | Account | — | — |

This table is a planning aid. No integration, schema validation, conformance testing, certification or regulatory-compliance claim is made.

## 5. Load order and quality gates

1. Reference & scope (`hospital_id`, `department_id`, `service_line_id`, `payer_id`, `calendar_period_id`, `currency_code`).
2. Encounter / coverage / eligibility / authorization cohorts.
3. Service delivery → charges → coding → invoice (unbilled WIP = billable completed encounters without invoice).
4. Claims, submissions (unique claim vs attempt), acknowledgements (rejects), adjudication lines (denials), appeals.
5. Payments, remittances, cash application (received vs applied).
6. Adjustments, write-offs, AR snapshots, aging (claim submission date), revenue events.
7. Leakage classification and recovery work items; scenario assumptions last.

Gates before KPIs publish: net revenue identity; AR roll-forward residual = 0; applied ≤ received; unique ≤ submissions; denied ≤ adjudicated ≤ unique; aging = closing AR; payer splits = totals; leakage drivers = total; authorization stock identity.

## 6. Single-source rule

Screens (`rcm.tsx`), KPI binds (`bind.ts` → `rcmMapped`), alerts (`alerts.ts`), Vital Assist (`assistant.ts`), what-if (`whatIf.ts`) and the indicator catalog (`rcmScope.ts`) must derive from `buildRcmView`. No page may compute independent totals.
