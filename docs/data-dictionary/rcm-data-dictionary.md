# Revenue Cycle Management — Data Dictionary

**Domain:** Domain 12 — Revenue Cycle Management Intelligence  
**Release:** `v1-rcm` · **BUILD_ID:** `v75-rcm-remediation`  
**Status:** Demo Available — not Production Source Verified  
**Scope:** Expected source-system fields → DataVital canonical columns  
**Privacy:** Demo uses synthetic, deterministic, non-identifiable patient, payer, encounter and financial records only. No real policy numbers, claim data, MRNs or account identifiers.  
**Currency:** Demo label `SAR` (`RCM_CURRENCY`); configurable per market; no FX conversion is performed or invented.

Canonical names below are **proposed DataVital columns**, not verified customer HIS / ERP / billing / claims-management / clearinghouse schema names. Source table and column names are **illustrative expected patterns**.

Authoritative code: `frontend/src/core/rcmOwnership.ts` (41 KPIs, 42 charts, 7 screens), `rcmView.ts` (deterministic ledger and conventions), `rcm.tsx` (7 screens), `rcmScope.ts` (indicator catalog and AI cases).

## Data readiness legend

| State | Meaning |
|---|---|
| Demo Available | Represented in the `buildRcmView` synthetic ledger (aggregate by hospital × month with payer, reason, department, service-line and aging splits). Record-level identifiers are not materialized — see *Demo representation* |
| Production Source Verified | Confirmed mapped to a real hospital feed (**none — never claimed for this demo**) |
| Partially Mapped | Expected pattern known; present only as an aggregate count/sum or assumption-based share; integration incomplete |
| Missing | Required for production, market configuration or the future profitability domain; not available |
| Scenario Only | Explicitly synthetic assumption (recoverability, preventable classification, delay / exception reasons, what-if values) |

**Demo representation** values: `Aggregate ledger measure` · `Aggregate dimension` · `Identifier - counted, record not materialized` · `Scenario assumption` · `Reference / configuration` · `Not modeled`.

---

## 1. Entities

| Entity | Grain | Primary key | Parent / FKs |
|---|---|---|---|
| Hospital | Facility | `hospital_id` | — |
| Department | Service unit | `department_id` | `hospital_id` |
| Service Line | Finance rollup | `service_line_id` | `hospital_id` |
| Patient Encounter | Care episode | `encounter_id` | `hospital_id`, `patient_pseudonym_id` |
| Payer | Payer / responsible party | `payer_id` | — |
| Insurance Plan | Benefit plan | `insurance_plan_id` | `payer_id` |
| Contract | Effective-dated contract | `contract_id` | `payer_id` |
| Coverage | Policy period | `policy_id` + `coverage_effective_at` | `payer_id`, `insurance_plan_id`, `patient_pseudonym_id` |
| Eligibility Request | Verification check | `eligibility_request_id` | `encounter_id`, `policy_id` |
| Pre-Authorization | Authorization request | `authorization_id` | `encounter_id`, `payer_id` |
| Delivered Service | Service event | `service_id` + `service_performed_at` | `department_id`, `encounter_id` |
| Charge | Charge line | `charge_id` | `encounter_id`, `service_id` |
| Invoice | Invoice | `invoice_id` | `encounter_id` |
| Claim | Claim | `claim_id` | `invoice_id`, `payer_id`, `encounter_id` |
| Claim Line | Line within claim | `claim_line_id` | `claim_id`, `charge_id`, `procedure_id` |
| Claim Submission | Transmission attempt | `claim_submission_id` | `claim_id` |
| Adjudication / Denial | Line outcome | `claim_line_id` + `adjudicated_at` | `claim_line_id` |
| Appeal | Appeal case | `appeal_id` | `claim_id` |
| Payment | Cash receipt | `payment_id` | `payer_id` |
| Remittance | Remittance advice | `remittance_id` | `payment_id`, `payer_id` |
| Adjustment | AR adjustment | `adjustment_id` | `claim_id`, `invoice_id` |
| Write-off | Approved write-off | `writeoff_id` | `claim_id`, `invoice_id` |
| AR Balance | AR snapshot | `accounts_receivable_balance` snapshot (`hospital_id` + `calendar_period_id`) | `payer_id` |
| Revenue Recognition Event | Revenue event | `revenue_event_id` | `invoice_id`, `claim_id` |
| Calendar Period | Reporting bucket | `calendar_period_id` | — |

Future strategic join hooks (**unused by Domain 12 screens**): `cost_center_id`, `resource_id`, `procedure_id`, `revenue_event_id`, plus `hospital_id`, `department_id`, `service_line_id`, `encounter_id`, `payer_id`, `calendar_period_id`, `claim_id`. Domain 12 owns revenue-cycle performance only; enterprise-wide clinical service profitability belongs to the future *Healthcare Resource, Profitability & Expansion Intelligence* domain, which is **not built**.

---

## 2. Financial ledger conventions

| # | Convention | Rule (as implemented in `rcmView.ts`) |
|---|---|---|
| 1 | Gross ≠ net ≠ cash | Gross charges − contractual allowances = net patient revenue (recognized revenue). Cash applied is a separate flow. Gross charges are never revenue; collected cash is never recognized revenue |
| 2 | Unique claims ≠ submissions | `uniqueClaims` counts distinct `claim_id`; `submissionAttempts ≥ uniqueClaims`; `resubmissions = submissionAttempts − uniqueClaims`. Resubmissions are never new unique claims |
| 3 | Clearinghouse reject ≠ payer denial | Rejects are technical and tracked separately (`clearinghouseRejects`); `firstPassAccepted + clearinghouseRejects = uniqueClaims`. Denials are payer adjudication outcomes |
| 4 | Denial denominators | Gross denial rate = denied unique claims ÷ adjudicated unique claims (count grain). Denied value rate = denied amount ÷ adjudicated amount (claim-line grain) |
| 5 | AR snapshot ≠ sum of monthly endings | Opening AR + new receivables − cash applied − approved adjustments − write-offs ± corrections = closing AR. Outstanding AR is the period-end snapshot; year = December balance; Qn+1 opening = Qn closing |
| 6 | Cash received ≠ cash applied | `cashReceived ≥ cashApplied`; unapplied cash = received − applied (never negative); YTD unapplied stock reported separately. Unapplied receipts never reduce encounter AR |
| 7 | Contractual allowance ≠ leakage | Contractual allowances reduce gross to net and are never leakage. Write-off classes: avoidable vs contractual vs bad debt; only avoidable counts toward leakage |
| 8 | Exclusive leakage attribution | Confirmed leakage = missed charges + avoidable write-offs + underpayments; each item belongs to exactly one driver; drivers sum to the total. Potential leakage is not additive to confirmed leakage |
| 9 | Aging clock | AR aging uses **claim submission date** (`AGING_CLOCK`); buckets `0–30, 31–60, 61–90, 91–120, >120` sum to closing AR |
| 10 | Currency | Amounts are plain numbers in `currency_code` (demo label `SAR`, `RCM_CURRENCY`). KPI arithmetic is currency-agnostic; no FX conversion; payer rules are market configuration, not KPI logic |
| 11 | Unbilled WIP | Net revenue = new receivables + change in unbilled work-in-progress; receivables enter AR only when billed |
| 12 | Hospital ALL | Exact sum of H1–H5 ledgers; rates and day measures recomputed from summed numerators and denominators (never averages of site rates) |
| 13 | Scenarios | The eight what-if values are illustrative, capped at eligible value, overlap, and are **not additive** or realized cash |
| 14 | Day measures | Authorization turnaround, charge-to-bill lag and payer delay are volume-weighted means of site-month values (not medians) in the demo |
| 15 | Standards | NPHIES / FHIR / X12 are potential future integration references only — not certified, not implemented |

### Ledger identities (`view.identities`)

| Identity | Rule |
|---|---|
| `netRevenueBalanced` | gross − allowances = net patient revenue |
| `arRollForwardBalanced` | opening + new − cash applied − adjustments − write-offs ± corrections = closing AR (residual 0) |
| `cashApplicationBalanced` | received ≥ applied; unapplied = received − applied |
| `arSplitBalanced` | insurer AR + patient AR = closing AR |
| `agingBalanced` | Σ aging buckets = closing AR |
| `claimsBalanced` | submissions ≥ unique claims; first-pass accepted + clearinghouse rejects = unique claims |
| `adjudicationBalanced` | denied ≤ adjudicated ≤ unique claims; denied amount ≤ adjudicated amount |
| `leakageBalanced` | Σ leakage drivers = confirmed leakage |
| `authBalanced` | requested + opening pending = decided + closing pending |
| `unbilledBalanced` | net revenue = new receivables + Δ unbilled WIP |
| `payerBalanced` | Σ payer net revenue / cash applied / AR = ledger totals |

---

## 3. Claims lifecycle & denial taxonomy

**Claim states (event-sourced, timestamped):** Draft → Validated → Submitted → Acknowledged → Adjudicated → Paid / Partially Paid / Denied. Additional workflows: Corrected claim, Rejected submission, Resubmission, Appeal, Reversal, Adjustment, Write-off. One claim has many claim lines and many submission attempts; line outcomes can be mixed.

> Demo note: the synthetic ledger aggregates claim and claim-line effects at hospital × month grain. Claim-line state histories, mixed-outcome lines and per-claim timestamps are **expected source structures** and are not materialized as records in the demo.

**Denial categories (internal, fictional — no payer-specific codes invented):** Eligibility issues · Missing authorization · Coding/documentation · Duplicate claim · Filing deadline · Contractual dispute · Medical necessity · Coverage exclusion · Incorrect patient/payer info. Preventable subset for the denials-down scenario: Eligibility issues, Missing authorization, Coding/documentation, Duplicate claim, Filing deadline, Incorrect patient/payer info. If standards-based codes are used in production, `denial_code_set` must record the source and version.

**Denial root-cause fields are distinct:** observed denial reason (`denial_reason_code`) · possible contributing factor (`denial_contributing_factor`) · missing evidence (`denial_missing_evidence`) · recoverability assessment (`recoverability_assessment`) · recommended operational action (Vital Assist; human approval). The system does not alter submitted claims.

**Demo dimensions:** 5 fictional payers (one patient self-pay) · 8 departments (Emergency, Outpatient clinics, Inpatient wards, Surgery & theatres, Radiology, Laboratory, Pharmacy, Intensive care) · 7 service lines (Emergency care, Ambulatory care, Medical inpatient, Surgical inpatient, Maternity & pediatrics, Critical care, Diagnostics & pharmacy).

---

## 4. Multi-market readiness & standards positioning

Market-specific behavior must be configuration (`market_code`, `currency_code`, `claim_exchange_format_code`, `coding_standard_code`, `tax_treatment_code`, `payment_model_code`, `denial_code_set`), not hardcoded in general KPI logic.

| Standard / platform | Positioning |
|---|---|
| HL7 FHIR financial resources (e.g. Coverage, CoverageEligibilityRequest/Response, Claim, ClaimResponse, ChargeItem, Invoice, PaymentReconciliation) | Potential future integration reference. Not implemented, not certified |
| X12 270/271, 278, 837, 835, 277CA (applicable US workflows) | Potential future integration reference. Not implemented, not certified |
| NPHIES (Saudi Arabia) | Potential future integration to assess where applicable. **No certified integration, no regulatory-compliance claim** |
| Local claim exchange formats / APIs | Configurable per market; none implemented |

No external claims submission, payer communication or payment initiation occurs in the synthetic demo.

---

## 5. Privacy & role-based access expectations

| Class | Examples | Expectation |
|---|---|---|
| Internal | hospital, department, taxonomy, configuration | Authenticated staff |
| Financial - Confidential | charge, invoice, claim, payment, AR, write-off amounts | Revenue cycle, finance, claims and executive roles; least-privilege; audit trail |
| Pseudonym / PHI-linked | `encounter_id`, `patient_pseudonym_id` | Hash/tokenize at boundary; no MRN, national ID or contact data |
| Sensitive - tokenized policy identifier | `policy_id`, `coverage_effective_at` | Tokenized only; real policy numbers never exposed; restricted to eligibility/billing roles |

Role expectations (documentation only; not enforced in the demo): **Executives/CFO** — aggregate KPIs and scenarios; **Revenue Cycle Director / Denials / Collections leads** — drill to payer and claim cohort; **Billing & Coding, Cash Posting, Pre-Authorization teams** — operational queues for their cohorts; **Clinical staff** — no access to claim financial detail. Human approval is required for operational and financial decisions; the AI does not submit claims, communicate with payers, initiate payments or write off balances.

---

## 6. Canonical field catalog (complete)

**96 proposed canonical fields.** Readiness: Demo Available 50, Partially Mapped 19, Missing 14, Scenario Only 13. Required status: Required 55, Conditional 24, Optional 17. Full per-field detail (grain, transformation, DQ rule, KPI/chart links, refresh, history, privacy, missing-data handling, keys, example) is in the CSV and JSON companions.


### Reference & scope

| Canonical column | Type | Required | Readiness | Expected source (system → object.column) | Description |
|---|---|---|---|---|---|
| `hospital_id` | string | Required | Demo Available | DataVital reference / configuration → facility master / org API.`facility_code` | Stable hospital key for RCM filters (H1-H5, ALL) and future profitability joins |
| `department_id` | string | Required | Demo Available | HIS / EHR → department master.`department_code` | Clinical/supporting department for charge capture and missed-charge attribution (supporting finance view only) |
| `service_line_id` | string | Required | Demo Available | ERP / Finance → service line / cost center map.`service_line_code` | Finance service-line rollup used for missed-charge attribution (7 service lines) |
| `encounter_id` | string | Required | Partially Mapped | HIS / EHR → encounter.`encounter_id` | Parent care episode for eligibility, authorization, charge, invoice and claim joins |
| `patient_pseudonym_id` | string | Required | Partially Mapped | Patient Registration → patient registry.`hashed_patient_id` | Non-identifying patient key; MRN, national ID and contact data are never stored in the demo |
| `calendar_period_id` | string | Required | Demo Available | DataVital reference / configuration → calendar.`period_id` | Reporting bucket (year / Qn) used for flows; stocks use period-end observation date |
| `currency_code` | string | Required | Partially Mapped | DataVital reference / configuration → market configuration.`currency_code` | Currency of all monetary fields; demo label SAR (RCM_CURRENCY). Configurable per market; no FX conversion is invented |

### Payer, plan & coverage

| Canonical column | Type | Required | Readiness | Expected source (system → object.column) | Description |
|---|---|---|---|---|---|
| `payer_id` | string | Required | Demo Available | Contract Management → payer master.`payer_code` | Payer / responsible-party key. Demo payers are fictional (5); one is patient self-pay |
| `payer_name` | string | Optional | Demo Available | Contract Management → payer master.`payer_name` | Display name for payer charts (fictional demo names, never real payers) |
| `insurance_plan_id` | string | Conditional | Missing | Contract Management → plan master.`plan_code` | Benefit plan under a payer; needed for plan-level contract rates and exclusions |
| `policy_id` | string | Conditional | Missing | Insurance Eligibility Platform → coverage / policy.`policy_token` | Tokenized policy / member reference. Real policy numbers are never exposed |
| `coverage_effective_at` | timestamp | Conditional | Partially Mapped | Insurance Eligibility Platform → coverage / policy.`effective_from` | Start of coverage validity used to judge inactive-policy exceptions on the service date |
| `contract_id` | string | Conditional | Missing | Contract Management → payer contract.`contract_id` | Payer contract governing allowed amounts (contract structure is market-specific and configurable) |

### Eligibility verification

| Canonical column | Type | Required | Readiness | Expected source (system → object.column) | Description |
|---|---|---|---|---|---|
| `eligibility_request_id` | string | Required | Partially Mapped | Insurance Eligibility Platform → eligibility_request.`request_id` | Identifier of an eligibility verification request tied to an encounter |
| `eligibility_requested_at` | timestamp | Conditional | Partially Mapped | Insurance Eligibility Platform → eligibility_request.`requested_at` | Time the check was requested (cohort entry) |
| `eligibility_status` | enum | Required | Demo Available | Insurance Eligibility Platform → eligibility_response.`response_status` | Outcome: verified / exception (inactive, not covered) / not completed |
| `eligibility_verified_at` | timestamp | Required | Demo Available | Insurance Eligibility Platform → eligibility_response.`responded_at` | Time a completed eligibility response was received |

### Pre-authorization

| Canonical column | Type | Required | Readiness | Expected source (system → object.column) | Description |
|---|---|---|---|---|---|
| `authorization_id` | string | Required | Demo Available | Authorization Management → authorization_request.`auth_request_id` | Identifier of an authorization request for planned/ordered services |
| `authorization_requested_at` | timestamp | Required | Demo Available | Authorization Management → authorization_request.`requested_at` | Request time; starts turnaround clock |
| `authorization_status` | enum | Required | Demo Available | Authorization Management → authorization_request.`decision_status` | PENDING / APPROVED / REJECTED (requests that expired or were not requested are handled as exceptions, not approvals) |
| `authorization_approved_at` | timestamp | Conditional | Demo Available | Authorization Management → authorization_decision.`decided_at` | Decision time for approved/rejected requests; null while pending |
| `authorization_delay_reason` | enum | Optional | Scenario Only | Authorization Management → authorization_request.`delay_reason_code` | Why a request was slow (documentation, payer response, clinical review queue); administrative only |

### Service delivery & charge capture

| Canonical column | Type | Required | Readiness | Expected source (system → object.column) | Description |
|---|---|---|---|---|---|
| `service_id` | string | Required | Partially Mapped | HIS / EHR → service_order / catalog.`service_code` | Delivered chargeable service identifier (catalog item) |
| `procedure_id` | string | Conditional | Missing | Medical Coding / CDI → coded_procedure.`procedure_code` | Procedure/service code from the market's coding standard (standard and version recorded separately) |
| `service_performed_at` | timestamp | Required | Demo Available | HIS / EHR → service_event.`performed_at` | Time the service was delivered; anchors charge-capture eligibility and revenue recognition |
| `service_billable_flag` | boolean | Required | Demo Available | Billing System → charge_master / service_event.`is_billable` | True when the service is eligible to be charged (excludes nonbillable, bundled, cancelled) |
| `charge_id` | string | Required | Demo Available | Billing System → charge.`charge_id` | Stable identifier of a captured charge (charges are not revenue and not cash) |
| `charge_amount` | decimal | Required | Demo Available | Billing System → charge.`gross_amount` | Gross charge in currency_code before contractual allowance (gross != net != cash) |
| `charge_status` | enum | Required | Demo Available | Billing System → charge.`status` | POSTED / HELD / REVERSED / CANCELLED; only posted billable charges count as captured |
| `charge_created_at` | timestamp | Required | Demo Available | Billing System → charge.`created_at` | Time the charge was posted; starts charge-to-bill lag |
| `missed_charge_flag` | boolean | Conditional | Partially Mapped | Billing System → charge reconciliation.`is_missed_charge` | Eligible billable service without a captured charge; not every unmatched clinical event is missed |
| `expected_net_value` | decimal | Conditional | Scenario Only | Contract Management → charge master x contract.`expected_net_amount` | Expected net (post-allowance) value used to value unbilled and missed services; not gross charges as cash |

### Coding, invoice & billing

| Canonical column | Type | Required | Readiness | Expected source (system → object.column) | Description |
|---|---|---|---|---|---|
| `coding_status` | enum | Required | Demo Available | Medical Coding / CDI → coding_work_item.`status` | READY / COMPLETE / HELD; coding completion = complete / ready |
| `coding_completed_at` | timestamp | Conditional | Partially Mapped | Medical Coding / CDI → coding_work_item.`completed_at` | Coding completion time (operational completion, not an accuracy audit) |
| `invoice_id` | string | Required | Demo Available | Billing System → invoice.`invoice_id` | Invoice created for an encounter; claims relate to invoices (one invoice -> one or more claims) |
| `invoice_date` | date | Required | Demo Available | Billing System → invoice.`invoice_date` | Invoice creation date; ends charge-to-bill lag and starts aging of unbilled WIP |
| `invoice_amount` | decimal | Required | Demo Available | Billing System → invoice.`invoice_total` | Invoice total (gross billed); not revenue until net of contractual allowance |
| `billing_exception_id` | string | Conditional | Demo Available | Billing System → billing_exception.`exception_id` | Open billing exception (missing data, code edit, hold) on an invoice |
| `billing_exception_reason` | enum | Optional | Scenario Only | Billing System → billing_exception.`reason_code` | Illustrative exception reason split on the Billing screen (not a verified payer edit list) |

### Claims & submissions

| Canonical column | Type | Required | Readiness | Expected source (system → object.column) | Description |
|---|---|---|---|---|---|
| `claim_id` | string | Required | Demo Available | Claims Management → claim.`claim_id` | Unique claim identity. Unique claims != submission attempts; resubmissions reuse claim_id |
| `claim_line_id` | string | Required | Partially Mapped | Claims Management → claim_line.`line_id` | Line within a claim; outcomes may be mixed (paid + denied) and amounts roll up to claim |
| `claim_submission_id` | string | Required | Demo Available | Clearinghouse → submission.`submission_id` | One transmission attempt of a claim (initial, corrected, resubmission); count != unique claims |
| `claim_submission_attempt_no` | integer | Required | Demo Available | Clearinghouse → submission.`attempt_no` | 1 = first submission (first-pass cohort); >1 = resubmission |
| `claim_submitted_at` | timestamp | Required | Demo Available | Clearinghouse → submission.`submitted_at` | Submission timestamp; also the aging clock for AR (aging clock = claim submission date) |
| `claim_status` | enum | Required | Demo Available | Claims Management → claim_status_history.`status` | Draft -> Validated -> Submitted -> Acknowledged -> Adjudicated -> Paid / Partially Paid / Denied; plus Corrected, Resubmitted, Reversed |
| `clearinghouse_reject_flag` | boolean | Required | Demo Available | Clearinghouse → acknowledgement.`is_rejected` | Technical rejection at clearinghouse/scrubber before payer adjudication (clearinghouse reject != payer denial) |
| `clearinghouse_reject_reason` | string | Optional | Missing | Clearinghouse → acknowledgement.`reject_reason` | Technical reject reason (format / scrubber edit); not a payer denial code |
| `billed_amount` | decimal | Required | Demo Available | Claims Management → claim_line.`billed_amount` | Amount billed to the payer on the line (gross) |

### Adjudication & denial

| Canonical column | Type | Required | Readiness | Expected source (system → object.column) | Description |
|---|---|---|---|---|---|
| `adjudicated_at` | timestamp | Required | Demo Available | Payer Portals / APIs → adjudication_response.`adjudicated_at` | Payer adjudication time; adjudicated cohort = denominator for denial rates |
| `allowed_amount` | decimal | Required | Partially Mapped | Payer Portals / APIs → adjudication_line.`allowed_amount` | Payer-allowed amount on the line; allowed - paid on underpaid lines = underpayment |
| `denied_amount` | decimal | Required | Demo Available | Payer Portals / APIs → adjudication_line.`denied_amount` | Amount denied on a claim line (claim may have mixed outcomes) |
| `denial_reason_code` | string | Required | Demo Available | Payer Portals / APIs → adjudication_line / remark.`denial_code` | DataVital internal denial category code (9 categories, e.g. DENY_AUTH_MISSING). Raw payer/standard codes are kept separately; no payer-specific code set is invented |
| `denial_source_code` | string | Optional | Missing | Payer Portals / APIs → adjudication_line / remark.`raw_denial_code` | Raw payer or standards-based denial code exactly as received (source and version recorded) |
| `denial_code_set` | string | Conditional | Missing | DataVital reference / configuration → market configuration.`denial_code_set` | Code set and version for denial_source_code (e.g. payer-published list, X12 code list); never assumed globally |
| `denial_contributing_factor` | string | Optional | Scenario Only | Claims Management → denial_review.`contributing_factor` | Possible contributing factor (distinct from observed reason). Human-assessed; AI does not alter submitted claims |
| `denial_missing_evidence` | string | Optional | Scenario Only | Claims Management → denial_review.`missing_evidence` | Evidence missing for appeal (documents, authorization proof) |
| `recoverability_assessment` | enum | Conditional | Scenario Only | Claims Management → denial_review.`recoverability` | Assessed recoverability (RECOVERABLE / PARTIAL / NOT_RECOVERABLE). Demo uses 40-50% of denied value as an illustrative assessment; not collected cash |

### Appeals

| Canonical column | Type | Required | Readiness | Expected source (system → object.column) | Description |
|---|---|---|---|---|---|
| `appeal_id` | string | Conditional | Partially Mapped | Claims Management → appeal.`appeal_id` | Appeal against a denied claim line/claim |
| `appeal_status` | enum | Conditional | Demo Available | Claims Management → appeal.`status` | PENDING / WON / PARTIAL / LOST; success rate counts decided appeals only |
| `appeal_decided_at` | timestamp | Conditional | Partially Mapped | Payer Portals / APIs → appeal_response.`decided_at` | Appeal decision time |

### Payments, remittance & cash application

| Canonical column | Type | Required | Readiness | Expected source (system → object.column) | Description |
|---|---|---|---|---|---|
| `payment_id` | string | Required | Demo Available | Payment Gateway → payment.`payment_id` | Cash receipt event (payer or patient). Reversals and credits tracked as separate events |
| `remittance_id` | string | Required | Partially Mapped | Cash Application → remittance_advice.`remittance_id` | Remittance advice grouping payments and claim-level adjustments from a payer |
| `payment_received_at` | timestamp | Required | Demo Available | Payment Gateway → payment.`received_at` | Cash/remittance receipt time (cash received != cash applied) |
| `payment_applied_at` | timestamp | Conditional | Demo Available | Cash Application → cash_application.`applied_at` | Time cash was applied to encounter/claim AR. Null = unapplied; unmatched receipts must not reduce encounter AR |
| `paid_amount` | decimal | Required | Demo Available | Cash Application → cash_application.`applied_amount` | Cash applied to AR for a line/claim (flow, summed across months). Period Cash-to-Net Revenue Ratio uses applied cash (not a cohort-adjusted net collection rate) |
| `received_amount` | decimal | Required | Demo Available | Payment Gateway → payment / remittance.`received_amount` | Cash received on the remittance (>= applied; difference = unapplied cash) |
| `unapplied_amount` | decimal | Conditional | Demo Available | Cash Application → unapplied_cash_ledger.`unapplied_amount` | Cash received - cash applied for the period; YTD stock reported separately; never negative |
| `cash_application_exception_reason` | enum | Optional | Scenario Only | Cash Application → cash_application_exception.`reason_code` | Why a remittance is not applied (no match, duplicate, short-pay, missing remit) |
| `payer_payment_delay_days` | decimal | Conditional | Demo Available | Cash Application → derived.`days_to_first_payment` | Days from claim submission to first payment application for paid claims |

### Adjustments & write-offs

| Canonical column | Type | Required | Readiness | Expected source (system → object.column) | Description |
|---|---|---|---|---|---|
| `adjustment_id` | string | Required | Partially Mapped | ERP / Finance → ar_adjustment.`adjustment_id` | Stable identifier for an AR adjustment (contractual, administrative, correction, transfer) |
| `adjustment_type` | enum | Required | Demo Available | ERP / Finance → ar_adjustment.`type_code` | CONTRACTUAL_ALLOWANCE / APPROVED_ADJUSTMENT / CORRECTION / TRANSFER. Contractual allowances are never leakage |
| `adjustment_amount` | decimal | Required | Demo Available | ERP / Finance → ar_adjustment.`amount` | Signed adjustment amount (consistent sign convention: reductions to AR positive in ledger flow) |
| `adjustment_approved_flag` | boolean | Required | Partially Mapped | ERP / Finance → ar_adjustment.`is_approved` | Only approved adjustments enter the AR roll-forward; human approval required |
| `writeoff_id` | string | Conditional | Partially Mapped | ERP / Finance → writeoff.`writeoff_id` | Approved write-off record (no automatic write-offs; AI cannot write off balances) |
| `writeoff_reason` | enum | Required | Scenario Only | ERP / Finance → writeoff.`reason_code` | Classification: AVOIDABLE (preventable) vs CONTRACTUAL vs BAD_DEBT (nonrecoverable). Only avoidable counts toward leakage |
| `writeoff_amount` | decimal | Required | Demo Available | ERP / Finance → writeoff.`amount` | Approved write-off amount |

### AR, aging & revenue recognition

| Canonical column | Type | Required | Readiness | Expected source (system → object.column) | Description |
|---|---|---|---|---|---|
| `accounts_receivable_balance` | decimal | Required | Demo Available | ERP / Finance → ar_subledger_snapshot.`ending_balance` | Period-end AR snapshot (opening + new - cash applied - approved adjustments - write-offs +/- corrections = closing). Never summed across months |
| `ar_opening_balance` | decimal | Required | Demo Available | ERP / Finance → ar_subledger_snapshot.`opening_balance` | Opening AR of the period = prior period closing AR |
| `ar_new_receivables` | decimal | Required | Demo Available | Billing System → invoice / revenue event.`new_receivable_amount` | New receivables added when billed (net of contractual allowance); unbilled WIP is excluded |
| `ar_aging_bucket` | enum | Required | Demo Available | ERP / Finance → ar_aging.`bucket_code` | Aging bucket on claim submission date: 0-30, 31-60, 61-90, 91-120, >120 |
| `responsible_party_type` | enum | Required | Partially Mapped | ERP / Finance → ar_subledger.`responsible_party` | INSURER vs PATIENT responsibility; insurer AR + patient AR = closing AR |
| `revenue_event_id` | string | Required | Partially Mapped | ERP / Finance → revenue_recognition_event.`event_id` | Revenue recognition event (prevents double counting when recoveries are later paid) |
| `revenue_recognition_date` | date | Required | Demo Available | ERP / Finance → revenue_recognition_event.`recognized_on` | Date net revenue is recognized (demo convention: net of contractual allowance in the billing month; recognition != cash) |
| `cost_center_id` | string | Optional | Missing | ERP / Finance → gl_cost_center.`cost_center_code` | Hook for future Healthcare Resource, Profitability & Expansion domain. Not used by Domain 12 screens |

### Leakage, recovery & scenarios

| Canonical column | Type | Required | Readiness | Expected source (system → object.column) | Description |
|---|---|---|---|---|---|
| `leakage_driver_id` | enum | Conditional | Demo Available | DataVital reference / configuration → leakage taxonomy.`driver_code` | Exclusive driver: MISSED_CHARGE / AVOIDABLE_WRITEOFF / UNDERPAYMENT. Exactly one per item (no double counting) |
| `leakage_status` | enum | Conditional | Scenario Only | DataVital reference / configuration → leakage review.`status` | CONFIRMED vs POTENTIAL; potential exposure is not additive to confirmed leakage |
| `recovery_work_item_id` | string | Optional | Scenario Only | DataVital reference / configuration → recovery worklist.`work_item_id` | Open recovery work item with exclusive financial attribution (work items are not recovered amounts) |
| `opportunity_id` | enum | Conditional | Scenario Only | DataVital reference / configuration → what-if catalog.`opportunity_code` | One of eight what-if opportunity IDs (rcm-denials-down ... rcm-workflow-up). Scenarios overlap and are not additive |
| `opportunity_eligible_value` | decimal | Conditional | Scenario Only | DataVital reference / configuration → what-if model.`eligible_value` | Illustrative eligible value under documented assumption (not realized cash) |
| `action_owner_id` | string | Optional | Scenario Only | DataVital reference / configuration → management action.`owner_team_id` | Responsible team for a recommended action (human approval required) |

### Market configuration & future hooks

| Canonical column | Type | Required | Readiness | Expected source (system → object.column) | Description |
|---|---|---|---|---|---|
| `market_code` | string | Optional | Missing | DataVital reference / configuration → market configuration.`market_code` | Market profile controlling currency, payer rules, claim formats, coding standards and workflows (no country rule hardcoded in KPI logic) |
| `claim_exchange_format_code` | string | Optional | Missing | DataVital reference / configuration → market configuration.`claim_format_code` | Potential claim exchange format: NPHIES / HL7 FHIR financial resources (Saudi, potential), X12 837/835 (US), local formats. Not certified and not implemented |
| `coding_standard_code` | string | Optional | Missing | DataVital reference / configuration → market configuration.`coding_standard` | Coding standard and version in effect (not assumed globally) |
| `tax_treatment_code` | string | Optional | Missing | DataVital reference / configuration → market configuration.`tax_treatment` | Tax treatment profile (market-specific; none applied in demo) |
| `payment_model_code` | string | Optional | Missing | DataVital reference / configuration → market configuration.`payment_model` | Payment model (fee-for-service, bundled, capitation) - affects allowed amount logic; demo is fee-for-service style |
| `resource_id` | string | Optional | Missing | ERP / Finance → resource master.`resource_code` | Hook for future profitability domain only; unused in Domain 12 |

---

## 7. Machine-readable companions

- `docs/data-dictionary/rcm-data-dictionary.csv`
- `docs/data-dictionary/rcm-data-dictionary.json`
- `docs/data-mapping/rcm-source-to-target.md`
- `docs/kpi-lineage/rcm-kpi-lineage.md`
- `docs/data-readiness/rcm-data-readiness.md`
- `docs/rcm-final-acceptance.md`
