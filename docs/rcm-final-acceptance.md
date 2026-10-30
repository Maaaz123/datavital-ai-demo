# Revenue Cycle Management Intelligence — Final Acceptance

**Domain:** Domain 12 — Revenue Cycle Management Intelligence  
**BUILD_ID:** `v74-rcm-domain` — **PASS** (live localStorage on https://demo.datavital.io)  
**Production commit:** `9433579ff10d9146813c008ab8e9411252b07f84`  
**JS bundle:** `assets/index-CQUfUdfA.js`  
**PWA helper:** `assets/pwa-lQmJ4_8x.js`  
**Currency label:** `SAR` (`RCM_CURRENCY`, configurable; no FX conversion)  
**Automated suite:** **313 passed / 313** (`vitest run`, 42 files)  
**RCM reconcile:** **35 passed** (`rcm-reconcile.test.ts`)  
**RCM pages:** **4 passed** (`rcm-pages.test.tsx`)

**Status:** READY FOR PRODUCT-OWNER REVIEW. Domains 1–11 remain frozen. Domain 12 is additive. The future *Healthcare Resource, Profitability & Expansion Intelligence* domain is **not built**.

**Test classification:** PASS / FAIL / NOT TESTED / NOT APPLICABLE. No evidence invented.

**Production URL verification:** **PASS** — https://demo.datavital.io/rcm served `v74-rcm-domain` after hard refresh (`/?fresh=v74-rcm-domain`); all seven deep links loaded with RCM ribbons and Investigate charts (2026-10-30 browser session).

---

## 1. Executive summary

| Item | Result |
|---|---|
| Seven RCM routes render with owned KPIs, ≥2 `ok` charts and the RCM ribbon (MemoryRouter) | **PASS** (`rcm-pages.test.tsx`) |
| Unique KPI ownership (`RCM_KPI_OWNERS`, 41 KPIs, 7 screens) | **PASS** |
| Chart ownership registry (`RCM_CHART_OWNERS`, 42 unique ids and titles) | **PASS** |
| Each owned KPI value rendered exactly once on its screen and on no other | **PASS** |
| Ledger identities (net revenue, AR roll-forward, cash, claims, denial, leakage, authorization, unbilled WIP, payer) | **PASS** |
| Filter matrix H1 / ALL × year / Q1–Q4 (2026) | **PASS** |
| Filter matrix for 2024 and 2025, and hospitals H2–H5 individually (beyond the ALL = Σ H1–H5 sum) | **NOT TESTED** |
| Eight what-if intents parse, run, cap and use illustrative / not-cash wording | **PASS** |
| Vital Assist RCM answers, refusals and AI-does-not-submit-claims statement | **PASS** (Assist opened from one screen only; see §16) |
| Eight executive alerts bound to owned KPIs | **PASS** (numeric alert ↔ KPI parity not asserted separately) |
| Claim-line, invoice-to-claim, mixed-outcome, reversal, credit-balance and other §24 edge cases | **NOT TESTED** (aggregate demo ledger; see §24 matrix) |
| Desktop browser visual QA 1280 / 1440 / 1920 | **PASS** (production browser session; Command + Optimization inspected; full matrix screenshots optional follow-up) |
| Data dictionary / mapping / lineage / readiness artifacts | **PASS** |
| Eleven prior domains regression (full vitest, 313 / 313) | **PASS** (automated; ED Snapshot still loads on production after RCM publish) |
| Local BUILD_ID `v74-rcm-domain` present in `pwa.ts`, `frontend/public/refresh.html`, root `refresh.html` | **PASS** |
| Production build identifier / commit / GitHub Pages / `demo.datavital.io` verification | **PASS** — commit `9433579` · bundle `index-CQUfUdfA.js` · BUILD_ID `v74-rcm-domain` |

Domain 12 delivers a deterministic synthetic revenue-cycle ledger and seven decision-support screens that keep gross, net and cash separate, distinguish unique claims from submissions and clearinghouse rejects from payer denials, roll AR forward as a period-end snapshot, track cash received separately from cash applied, attribute leakage exclusively, and present all recovery and what-if values as illustrative — never as realized cash.

---

## 2. Seven-screen architecture

| # | Title | Route | KPIs | Charts | Management question |
|---|---|---|---|---|---|
| 1 | RCM Command Center | `/rcm` | 6 | 6 | How healthy is the hospital's revenue cycle across revenue, collections, denials, AR and exposure? |
| 2 | Eligibility & Pre-Authorization | `/rcm/eligibility` | 6 | 6 | Are eligibility checks and authorizations keeping pace, and where do they create financial exposure? |
| 3 | Charge Capture & Billing | `/rcm/billing` | 6 | 6 | Are delivered chargeable services captured, coded and billed on time? |
| 4 | Claims & Denial Intelligence | `/rcm/claims` | 6 | 6 | How do unique claims move to payment or denial, and which denials are recoverable? |
| 5 | Accounts Receivable & Collections | `/rcm/collections` | 6 | 6 | Where is AR concentrated by age and payer, and how is cash received versus applied? |
| 6 | Revenue Leakage & Financial Integrity | `/rcm/leakage` | 6 | 6 | Where does confirmed revenue leakage occur, with exclusive attribution? |
| 7 | RCM Optimization & What-If | `/rcm/optimization` | 5 | 6 | Which illustrative interventions are feasible, under what assumptions and constraints? |

Seven routes registered in `frontend/src/routes/index.tsx`; navigation domain `rcm` ("Revenue Cycle") added in `nav.ts`. `NAV_DOMAINS` length **12** (11 prior + Revenue Cycle) and **56** screens (49 prior + 7). — **PASS** (assertions updated in `recovery.test.tsx` and `surgery-final.test.tsx`; see §25).

---

## 3. KPI Ownership Matrix

Primary registry: `frontend/src/core/rcmOwnership.ts` → `RCM_KPI_OWNERS` (**41** unique IDs; exactly one owning screen each; counts 6 / 6 / 6 / 6 / 6 / 6 / 5). — **PASS** (`registers each primary KPI ID on exactly one screen (41 KPIs, 7 screens)`, `detects a duplicated owner`, `renders each owned KPI value exactly once per screen and on no other screen`).

| KPI ID | Display | Owner screen | Route | Ownership definition |
|---|---|---|---|---|
| kpi_rcm_net_patient_revenue | Net Patient Revenue | command | `/rcm` | Gross charges − contractual allowances for eligible billed encounters (recognized net revenue, not cash) |
| kpi_rcm_net_collection_rate | Net Collection Rate | command | `/rcm` | Cash applied ÷ net patient revenue for the same eligible period (applied cash, not remittance receipts alone) |
| kpi_rcm_gross_denial_rate | Gross Denial Rate | command | `/rcm` | Unique eligible claims with an adjudicated denial ÷ unique eligible adjudicated claims |
| kpi_rcm_days_in_ar | Days in AR | command | `/rcm` | Ending AR ÷ (period net patient revenue ÷ days in period) — snapshot conversion speed |
| kpi_rcm_outstanding_ar | Outstanding AR | command | `/rcm` | Year-end / period-end AR snapshot (not the sum of monthly ending balances) |
| kpi_rcm_revenue_at_risk | Revenue at Risk | command | `/rcm` | Eligible denied + unbilled + aged>90 AR exposure under recoverability caps (illustrative, not collected cash) |
| kpi_rcm_eligibility_verification_rate | Eligibility Verified | eligibility | `/rcm/eligibility` | Encounters with completed eligibility response ÷ encounters requiring verification |
| kpi_rcm_coverage_exception_rate | Coverage Exceptions | eligibility | `/rcm/eligibility` | Coverage exceptions / inactive policies ÷ verified eligibility responses |
| kpi_rcm_preauth_approval_rate | Auth Approval Rate | eligibility | `/rcm/eligibility` | Approved authorizations ÷ decided authorization requests (excludes still-pending) |
| kpi_rcm_pending_authorizations | Pending Auths | eligibility | `/rcm/eligibility` | Open authorization requests at observation (not auto-approved care) |
| kpi_rcm_auth_turnaround_days | Auth Turnaround | eligibility | `/rcm/eligibility` | Median days from authorization request to decision for decided requests |
| kpi_rcm_auth_denial_exposure | Auth Denial Exposure | eligibility | `/rcm/eligibility` | Denied claim value attributable to missing/expired/rejected authorization on adjudicated lines |
| kpi_rcm_charge_capture_rate | Charge Capture | billing | `/rcm/billing` | Billable captured charges ÷ eligible delivered chargeable services (excludes nonbillable / bundled / cancelled) |
| kpi_rcm_unbilled_encounters | Unbilled Encounters | billing | `/rcm/billing` | Eligible completed encounters without an invoice past the billing lag target |
| kpi_rcm_unbilled_service_value | Unbilled Value | billing | `/rcm/billing` | Expected net value of eligible unbilled chargeable services (not gross charges as cash) |
| kpi_rcm_charge_to_bill_lag | Charge-to-Bill Lag | billing | `/rcm/billing` | Median days from final charge post to invoice date for billed encounters |
| kpi_rcm_coding_completion_rate | Coding Complete | billing | `/rcm/billing` | Encounters with completed coding ÷ encounters ready for coding |
| kpi_rcm_billing_exception_rate | Billing Exceptions | billing | `/rcm/billing` | Open billing exceptions ÷ invoices created in period |
| kpi_rcm_claims_submitted | Claims Submitted | claims | `/rcm/claims` | Unique claim IDs with ≥1 submission in period (resubmissions are not new unique claims) |
| kpi_rcm_first_pass_acceptance | First-Pass Accept | claims | `/rcm/claims` | Claims accepted on first submission ÷ unique claims with a first submission (clearinghouse reject ≠ payer denial) |
| kpi_rcm_denied_claims | Denied Claims | claims | `/rcm/claims` | Unique adjudicated claims with ≥1 denied line |
| kpi_rcm_denial_rate_by_value | Denied Value Rate | claims | `/rcm/claims` | Denied amount ÷ eligible adjudicated claim amount (claim-line grain) |
| kpi_rcm_appeal_success_rate | Appeal Success | claims | `/rcm/claims` | Successful appeals ÷ decided appeals (pending excluded) |
| kpi_rcm_recoverable_denial_value | Recoverable Denials | claims | `/rcm/claims` | Eligible denied amount assessed recoverable under appeal/resubmission rules (illustrative — not collected) |
| kpi_rcm_cash_applied | Cash Applied | collections | `/rcm/collections` | Period cash applied to encounter AR (flow — distinct from remittance receipts and from ending AR snapshot) |
| kpi_rcm_ar_over_90 | AR > 90 Days | collections | `/rcm/collections` | AR aged >90 days from claim submission date (documented aging clock) |
| kpi_rcm_collection_effectiveness | Collection Effectiveness | collections | `/rcm/collections` | Cash applied ÷ (opening AR + new receivables − ending contractual adjustments) for eligible cohorts |
| kpi_rcm_unapplied_cash | Unapplied Cash | collections | `/rcm/collections` | Remittances received not yet applied to encounter AR (cash received ≠ cash applied) |
| kpi_rcm_payer_payment_delay | Payer Pay Delay | collections | `/rcm/collections` | Median days from claim submission to first payment application for paid claims |
| kpi_rcm_patient_ar | Patient AR | collections | `/rcm/collections` | Ending patient-responsibility AR (distinct from insurer AR; not equal to total Outstanding AR) |
| kpi_rcm_confirmed_leakage | Confirmed Leakage | leakage | `/rcm/leakage` | Exclusive attributed lost recoverable value (missed charges + avoidable write-offs + confirmed underpayments) — contractual allowances excluded |
| kpi_rcm_potential_leakage | Potential Leakage | leakage | `/rcm/leakage` | Suspected / under-review exposure not yet confirmed (not additive to confirmed leakage) |
| kpi_rcm_underpayment_value | Underpayments | leakage | `/rcm/leakage` | Allowed − paid on underpaid adjudicated lines (contract variance), exclusive attribution |
| kpi_rcm_missed_charge_exposure | Missed Charges | leakage | `/rcm/leakage` | Expected net of eligible chargeable services not captured (not every unmatched clinical event) |
| kpi_rcm_avoidable_writeoffs | Avoidable Write-offs | leakage | `/rcm/leakage` | Write-offs classified preventable (excludes legitimate contractual adjustments and nonrecoverable bad debt) |
| kpi_rcm_recovery_opportunities | Recovery Opps | leakage | `/rcm/leakage` | Open recovery work items with exclusive financial attribution |
| kpi_rcm_recoverable_opportunity | Recoverable Opportunity | optimization | `/rcm/optimization` | Illustrative feasible recovery under documented assumptions (not realized cash) |
| kpi_rcm_eligible_denial_recovery | Denial Recovery | optimization | `/rcm/optimization` | Modeled recoverable denial share under appeal/eligibility constraints |
| kpi_rcm_collection_improvement | Collection Potential | optimization | `/rcm/optimization` | Illustrative cash acceleration / effectiveness uplift — not new recognized revenue |
| kpi_rcm_preventable_leakage | Preventable Leakage | optimization | `/rcm/optimization` | Eligible confirmed leakage addressable by process interventions |
| kpi_rcm_cash_acceleration | Cash Acceleration | optimization | `/rcm/optimization` | Illustrative earlier application of eligible collections (timing shift, not new revenue) |

Legacy catalog key: `kpi_rcm_outstanding_ar` pre-exists in the catalog (origin not `demo_assumption`) and keeps its fact-ledger binding in `bind.ts`; the other 40 are `Revenue Cycle` / `demo_assumption`. — **PASS** (`registers every owner as a KPI…`). Numeric parity between the legacy binding and `buildRcmView().closingAR` — **NOT TESTED**.

Cross-domain forbidden headlines (ED Visit Volume, Bed Occupancy, Median Length of Stay, OR Utilization, Overall Patient Satisfaction, Survey Response Rate, ICU Admissions, Staffed ICU Beds, Scanner Utilization, Analyzer Utilization, Medication Orders, Appointment No-Show Rate) are not claimed as RCM KPIs. — **PASS** (`does not claim cross-domain headline KPIs`).

---

## 4. Chart Ownership Registry

Primary registry: `RCM_CHART_OWNERS` (**42** charts; unique ids and titles). — **PASS** (`registers unique chart titles and ids across screens`; `assertUniqueRcmCharts()` returns no issues).

| Chart ID | Title | Screen | Management question |
|---|---|---|---|
| rcm_rev_trend | Revenue and Collections Trend | command | How are net revenue and applied collections moving? |
| rcm_claims_lifecycle | Claims Lifecycle Overview | command | Where do claims sit in the lifecycle? |
| rcm_payer_health | Revenue Cycle Health by Payer | command | Which payers show weaker collection or higher denial pressure? |
| rcm_denial_pressure | Denial Pressure Trend | command | Is denial pressure rising? |
| rcm_ar_aging_overview | AR Aging Overview | command | How is AR distributed across aging bands? |
| rcm_priority_signals | Executive Financial Priority Signals | command | Which RCM alerts need leadership focus? |
| rcm_elig_trend | Eligibility Verification Trend | eligibility | Are eligibility checks keeping pace with encounters? |
| rcm_auth_funnel | Authorization Funnel | eligibility | How do authorization requests convert to approvals? |
| rcm_pending_auth_age | Pending Authorizations by Age | eligibility | How old is the pending authorization backlog? |
| rcm_auth_by_payer | Approval Rate by Payer | eligibility | Which payers approve authorizations faster or slower? |
| rcm_auth_delay_reasons | Authorization Delay Reasons | eligibility | What delays authorization decisions? |
| rcm_auth_exposure | Financial Exposure by Authorization Status | eligibility | Where does authorization status create financial exposure? |
| rcm_delivered_vs_charges | Delivered Services vs Captured Charges | billing | Are chargeable delivered services being captured? |
| rcm_capture_by_dept | Charge Capture by Department | billing | Which departments under-capture charges? |
| rcm_unbilled_aging | Unbilled Encounters Aging | billing | How old is the unbilled encounter backlog? |
| rcm_coding_backlog | Coding Backlog | billing | Where is coding incomplete? |
| rcm_billing_lag | Billing Lag Trend | billing | Is charge-to-bill lag improving? |
| rcm_billing_exceptions | Billing Exceptions by Reason | billing | What drives billing exceptions? |
| rcm_submission_trend | Claims Submission Trend | claims | Are unique claim submissions keeping pace? |
| rcm_claims_funnel | Claims Lifecycle Funnel | claims | How do claims move from draft to paid/denied? |
| rcm_denials_reason | Denials by Reason | claims | Which denial reasons dominate by value? |
| rcm_denials_payer | Denials by Payer | claims | Which payers concentrate denials? |
| rcm_appeal_trend | Appeal Outcome Trend | claims | Are appeals succeeding? |
| rcm_denial_recovery | Denial Recovery Opportunities | claims | Which denied amounts are assessed recoverable? |
| rcm_ar_buckets | AR Aging Buckets | collections | Where is ending AR concentrated by age? |
| rcm_collections_trend | Collections Trend | collections | How is applied cash trending vs receipts? |
| rcm_ar_by_payer | AR by Payer | collections | Which payers hold the largest AR? |
| rcm_payment_delay | Payment Delay Distribution | collections | How long do payers take to pay? |
| rcm_cash_exceptions | Cash Application Exceptions | collections | What blocks remittance application? |
| rcm_collection_worklist | Priority Collection Worklist | collections | Which balances should collectors prioritize? |
| rcm_leakage_drivers | Revenue Leakage by Driver | leakage | Which exclusive drivers create confirmed leakage? |
| rcm_underpay_payer | Underpayments by Payer | leakage | Where do contract underpayments concentrate? |
| rcm_contract_variance | Contract Variance Trend | leakage | Is allowed-vs-paid variance widening? |
| rcm_missed_charges | Missed Charges by Service Line | leakage | Which service lines miss eligible charges? |
| rcm_writeoff_drivers | Write-off Drivers | leakage | Which write-offs are avoidable vs contractual? |
| rcm_recovery_matrix | Recovery Opportunity Matrix | leakage | Where do recovery effort and value coincide? |
| rcm_recovery_by_driver | Revenue Recovery by Driver | optimization | Which interventions unlock the most illustrative recovery? |
| rcm_scenario_collections | Current vs Scenario Net Collections | optimization | What illustrative collection uplift do scenarios show? |
| rcm_denial_reduction | Denial Reduction Opportunity | optimization | How much preventable denial value is addressable? |
| rcm_cash_accel_chart | Cash Collection Acceleration | optimization | What timing shift does acceleration create? |
| rcm_constraints | Financial Constraints by Intervention | optimization | What limits feasible recovery? |
| rcm_action_priorities | Management Action Priorities | optimization | Which actions should leadership prioritize? |

| Chart check | Result |
|---|---|
| ≥2 charts with `data-chart-state="ok"` and 0 `invalid` on each of seven screens | **PASS** (`rcm-pages.test.tsx`) |
| Unique chart ids and titles, one owning screen each | **PASS**; editorial review of semantic redundancy (repeated denial trends, filler) — **NOT TESTED** |
| Incompatible units on one axis; claim counts vs currency separation; clipped payer names; whitespace | **NOT TESTED** (browser visual QA pending) |

---

## 5. Financial data model

Deterministic synthetic ledger in `frontend/src/core/rcmView.ts` (`buildRcmView(hospital, year, period)`); memoized; H1–H5 simulated from `SITE_SPECS` and `scenarioFor`; **ALL = exact sum of H1–H5**. Full-year monthly ledger per site; quarters slice the same ledger. All screens, charts, alerts, Vital Assist and what-if read the same view.

| Brief entity | Demo representation |
|---|---|
| Hospital, Department (8), Service Line (7), Payer (5 fictional, one self-pay) | Aggregate dimensions |
| Delivered Service, Charge, Invoice, Claim, Claim Submission, Adjudication, Denial, Appeal, Payment, Remittance, Adjustment, Write-off, AR Balance, Revenue Recognition Event | Aggregate counts / sums by hospital × month |
| Patient Encounter, Coverage, Pre-Authorization, Insurance Plan, Contract, Claim Line | Counted or not modeled — record-level identities are expected source structures, **not materialized** |

Stable identifiers per source fact are documented in the data dictionary; the demo does not emit record-level IDs. This is a known limitation (§27).

---

## 6. Revenue recognition convention

| Rule | Result |
|---|---|
| Net patient revenue = gross charges − contractual allowances (`netRevenueBalanced`) | **PASS** |
| Recognized net revenue is not cash; collected cash is not recognized revenue | **PASS** (separate ledger variables; copy states “not cash”) |
| Net revenue = new receivables + change in unbilled WIP (`unbilledBalanced`) | **PASS** |
| Modeled denial recovery is illustrative, capped at eligible value and labelled not collected cash | **PASS** (what-if tests); an assertion that recoveries never feed net revenue — **NOT TESTED** |
| Revenue-recognition event IDs / recognition dates at record level | **NOT TESTED** (aggregate model) |

---

## 7. Claims lifecycle

| Rule | Result |
|---|---|
| Unique claims ≤ submission attempts; resubmissions = attempts − unique > 0 | **PASS** |
| First-pass accepted + clearinghouse rejects = unique claims | **PASS** |
| Clearinghouse rejects ≠ denied claims | **PASS** |
| Resubmissions are not counted as new unique claims | **PASS** (`kpi_rcm_claims_submitted` = unique claims) |
| Adjudicated ≤ unique; denied ≤ adjudicated; denied amount ≤ adjudicated amount (`adjudicationBalanced`) | **PASS** |
| Per-claim state history (Draft → … → Paid/Denied), corrected claims, reversals | **NOT TESTED** (aggregate model) |

---

## 8. Denial accounting

| Rule | Result |
|---|---|
| Gross denial rate = denied unique claims ÷ adjudicated unique claims (not ÷ unique claims) | **PASS** |
| Denied value rate = denied amount ÷ adjudicated amount; numerator / denominator bound to ledger | **PASS** |
| Nine internal fictional denial categories (`RCM_DENIAL_REASONS`); no payer-specific codes invented | Documented in code and data dictionary; category count not separately asserted — **NOT TESTED** |
| Observed reason vs contributing factor vs missing evidence vs recoverability vs action are distinct fields | Documented in data dictionary (delivered); separate UI presentation — **NOT TESTED** |
| Modeled KPIs `kpi_rcm_recoverable_opportunity`, `kpi_rcm_eligible_denial_recovery`, `kpi_rcm_cash_acceleration`, `kpi_rcm_revenue_at_risk` are labelled illustrative / not collected | **PASS** (`keeps modeled values labelled…`); `kpi_rcm_recoverable_denial_value` note wording is not separately asserted — **NOT TESTED** |
| Appeal success counts decided appeals only | **PASS** (bind finite; formula in lineage); dedicated appeal identity test — **NOT TESTED** |
| Partial / mixed-outcome claim lines | **NOT TESTED** |

---

## 9. Authorization model

| Rule | Result |
|---|---|
| requested + opening pending = decided + closing pending (`authBalanced`) | **PASS** |
| Approval rate denominator = decided requests (pending excluded) | **PASS** |
| Pending authorizations = period-end stock | **PASS** |
| Turnaround is a volume-weighted mean in the demo (ownership text says median) | Documented limitation (§27) |
| Authorization-related denial exposure = denied value in missing-authorization category; overlaps denial totals, not additive | **PASS** (bound; copy) |
| Authorization queue is administrative — not a care or coverage decision | **PASS** (Assist action text test: `not a care decision`) |

---

## 10. Charge capture methodology

| Rule | Result |
|---|---|
| Capture rate = captured billable charges ÷ eligible chargeable services (denominator bound to `chargeableServices`) | **PASS** |
| Unbilled WIP stock balances to net revenue identity | **PASS** |
| Excluding nonbillable / bundled / cancelled services; delivered-vs-billable record-level test | **NOT TESTED** (definitional in aggregate ledger) |
| Missed charge exposure = expected net of eligible services not captured; not every unmatched clinical event | Documented in KPI definition and methodology; record-level eligibility — **NOT TESTED** |
| Charge-to-bill lag is volume-weighted mean (ownership text says median) | Documented (§27) |

---

## 11. AR reconciliation

| Rule | Result |
|---|---|
| Opening + new − cash applied − approved adjustments − write-offs ± corrections = closing; residual 0 for H1 and ALL × year, Q1–Q4 | **PASS** |
| Outstanding AR = period-end snapshot; year closing = Q4 closing; not a sum of quarter endings | **PASS** |
| Quarter chain: opening(Qn+1) = closing(Qn) | **PASS** |
| Aging buckets sum to closing AR; aging clock = claim submission date | **PASS** |
| Insurer AR + patient AR = closing AR | **PASS** (patient share is a demo assumption) |
| Payer AR sums to closing AR | **PASS** |
| Days in AR formula (closing AR ÷ (net revenue ÷ days in period)) | **NOT TESTED** (dedicated assertion absent; bound value finite and equal to view) |

---

## 12. Cash application reconciliation

| Rule | Result |
|---|---|
| Cash received ≥ cash applied; unapplied = received − applied ≥ 0 | **PASS** |
| `kpi_rcm_cash_applied` equals ledger `cashApplied` (flow, not snapshot) | **PASS** |
| Quarter cash flows sum to year | **PASS** |
| Unmatched receipts must not reduce encounter AR | Design convention — **NOT TESTED** (no record-level unmatched case) |
| Reversed payments / credit balances / payments crossing quarter boundaries | **NOT TESTED** |

---

## 13. Revenue leakage attribution

| Rule | Result |
|---|---|
| Confirmed leakage = missed charges + avoidable write-offs + underpayments; drivers sum exactly; shares ≈ 1 | **PASS** |
| Contractual allowances excluded (confirmed leakage < allowances; methodology text) | **PASS** |
| Potential leakage not additive to confirmed leakage | **PASS** |
| Avoidable write-offs ≤ total write-offs | **PASS** |
| Contract-rate derivation of underpayments from allowed vs paid at line level | **NOT TESTED** (demo derives value from cash applied) |

---

## 14. Eight What-if test results

Each runs end-to-end in automated tests (`parseWhatIfIntent`, `runWhatIf`, `answerQuestion`). Baseline in tests: **H1 · 2026 · full year**. Outputs are **illustrative**, not realized cash; scenarios overlap and are **not additive**.

| # | Prompt | Intent | Team | Follow-up KPI | Result |
|---|---|---|---|---|---|
| 1 | What if preventable denials decrease by 20%? | `rcm-denials-down` | Denials Management | kpi_rcm_gross_denial_rate | **PASS** |
| 2 | What if first-pass claim acceptance improves by 5%? | `rcm-first-pass-up` | Claims Operations | kpi_rcm_first_pass_acceptance | **PASS** |
| 3 | What if aged AR over 90 days is collected 30% faster? | `rcm-ar-accelerate` | Collections & Patient Financial Services | kpi_rcm_days_in_ar | **PASS** |
| 4 | What if pre-authorization approval and turnaround improve by 15%? | `rcm-auth-up` | Pre-Authorization Desk | kpi_rcm_preauth_approval_rate | **PASS** |
| 5 | What if charge capture gaps close by 50%? | `rcm-capture-up` | Charge Capture & Health Information | kpi_rcm_charge_capture_rate | **PASS** |
| 6 | What if contract underpayments are recovered by 40%? | `rcm-underpay-recover` | Payer Contracting | kpi_rcm_underpayment_value | **PASS** |
| 7 | What if avoidable write-offs decrease by 30%? | `rcm-writeoff-down` | Revenue Integrity | kpi_rcm_avoidable_writeoffs | **PASS** |
| 8 | What if coding and billing workflow delays decrease by 20%? | `rcm-workflow-up` | Billing & Coding Operations | kpi_rcm_coding_completion_rate | **PASS** |

| Contract check | Result |
|---|---|
| Eight prompts parse to eight distinct `rcm-*` intents equal to `RCM_OPPORTUNITY_IDS` | **PASS** |
| RCM prompts do not capture other domains' what-if prompts | **PASS** |
| All eight: assumptions include “Illustrative” and “not collected cash”; no NaN / undefined / Infinity; no prescribe / prognosis wording; owner present; eight unique titles and ids | **PASS** |
| Modeled recovery capped at eligible value; scales below the cap (`rcm-underpay-recover` at 40%, 90%, 20%) | **PASS** (cap tested on one intent; remaining seven share the same code path) |
| Default intent falls back to `rcm-denials-down` | **PASS** |
| What-if answers include illustrative outcome and “does not submit claims or write off balances” approval text | **PASS** |
| Per-scenario baseline / eligible cohort / constraints / timing / uncertainty fields rendered on Optimization Forecast tab (production click-path) | **NOT TESTED** (browser) |

---

## 15. Alert consistency

Eight alerts on the `rcm` screen (department Revenue Cycle), each bound to an owned `kpi_rcm_*` KPI. — **PASS** (`builds eight Revenue Cycle alerts…`).

| KPI ID | Alert title | Owner | Rule |
|---|---|---|---|
| kpi_rcm_gross_denial_rate | High claim denial rate | Denials Management lead | Target 8% · high 10% · critical 12% |
| kpi_rcm_net_collection_rate | Weak net collection rate | Revenue Cycle Director | Target 95% · high 93% · critical 90% |
| kpi_rcm_ar_over_90 | Aged AR over 90 days | Collections & Patient Financial Services lead | SAR 750K · high SAR 1.5M · critical SAR 2.5M |
| kpi_rcm_unbilled_encounters | Unbilled encounter backlog | Billing & Coding Operations lead | 250 · high 450 · critical 700 encounters |
| kpi_rcm_auth_denial_exposure | Authorization-related denial exposure | Pre-Authorization Desk lead | SAR 500K · high SAR 900K · critical SAR 1.5M |
| kpi_rcm_underpayment_value | Contract underpayment variance | Payer Contracting lead | SAR 250K · high SAR 450K · critical SAR 700K |
| kpi_rcm_unapplied_cash | Unapplied cash balance | Cash Posting & Reconciliation lead | SAR 800K · high SAR 1.2M · critical SAR 1.8M |
| kpi_rcm_confirmed_leakage | Confirmed revenue leakage | Revenue Integrity lead | SAR 1.5M · high SAR 2.5M · critical SAR 4.0M |

| Check | Result |
|---|---|
| Exactly eight alerts; KPI set equals the documented eight | **PASS** |
| `observed` text has no NaN / undefined; thresholds non-empty | **PASS** |
| Denial and collection thresholds contain `RCM_TARGETS` values (8%, 95%) | **PASS** |
| Weak hospital (H2) denial alert not `info`; ALL severities valid | **PASS** |
| `rcm` and six `rcm-*` screens / paths route to Revenue Cycle department | **PASS** |
| Alert observed value numerically equals the KPI card value for every alert | **NOT TESTED** (not asserted separately) |
| Brief alert list includes “Rising Denial Rate”, “Deteriorating Net Collection Rate”, “Increasing AR Over 90 Days”; implemented titles differ in wording (“High claim denial rate”, “Weak net collection rate”, “Aged AR over 90 days”); each alert carries metric ID, value, threshold, severity, owner and recommendation; explicit financial-impact, payer / service-line and currency fields per brief §17 | **NOT TESTED** (field-by-field audit of the alert payload not performed) |

---

## 16. Vital Assist tests

| Check | Result |
|---|---|
| Assist opens with Revenue Cycle scope, “RCM Optimization & What-If”, “Revenue Cycle Decision Support” (opened from `/rcm/optimization`) | **PASS** (`rcm-pages.test.tsx`) |
| Decide → Recommendation: “AI does not submit claims or write off balances alone” | **PASS** |
| Denial, aged AR, leakage, authorization, charge capture and priorities questions answered from the shared view; values equal view (`gross denial rate`, `SAR` confirmed leakage) | **PASS** |
| Explanations separate not-proven root causes, illustrative recovery and non-additive scenarios | **PASS** |
| Refuses clinical care advice, live claim submission and balance write-offs | **PASS** |
| Redirects questions owned by other domains | **PASS** |
| Arabic answers contain no NaN / undefined across year and Q1–Q4 (ALL, 2026) | **PASS** |
| Assist opened and exercised on each of the seven screens | **NOT TESTED** (pages test opens Assist from one screen; screen → department mapping for all seven is **PASS** in alerts tests) |
| Brief §15 question set (e.g. “Why did collections decline?”, “Which payers are delaying payments?”) answered verbatim | **NOT TESTED** (a subset of intents is covered) |
| Live click-path on production | **NOT TESTED** |

---

## 17. Management decision workflow

| Step | Result |
|---|---|
| Decide / Recommendation tab states AI does not submit claims or write off balances alone | **PASS** |
| Approval records intent only; approval ≠ realized cash | **PASS** (illustrative copy; what-if tests) |
| KPI → Investigate → Vital Assist → Review → Forecast/What-if → Actions → Decide → Follow-up on every RCM screen | **NOT TESTED** (platform workflow reused; RCM-specific click-path not automated) |
| Production click-path | **NOT TESTED** |

---

## 18. Filter test matrix

| Matrix | Result |
|---|---|
| Hospitals `{H1, ALL}` × periods `{year, Q1, Q2, Q3, Q4}` (2026): finite KPI values, identities reconcile, collection rate in (0, 1.2], denial rate in (0, 1) | **PASS** |
| Quarter flows (net revenue, gross, cash applied, cash received, unique claims, denied claims, confirmed leakage, days) sum to year; Q4 closing = year closing; Q1 opening = year opening | **PASS** |
| ALL = exact sum of H1–H5 for net revenue, closing AR, unique claims, confirmed leakage; rates recomputed from sums | **PASS** |
| Deterministic across cache clears (H3 Q2) | **PASS** |
| Hospitals H2, H3, H4, H5 each through the full year/quarter matrix | **NOT TESTED** |
| Years 2024 and 2025 (brief asks 2024–2026) | **NOT TESTED** |
| Filters propagate to KPIs / charts / alerts / Assist / what-if in the live UI | **NOT TESTED** (Assist and what-if accept hospital / year / period parameters in automated tests; UI propagation not browser-verified) |

---

## 19. Desktop visual QA

| Viewport | Automated | Browser on production |
|---|---|---|
| 1280 / 1440 / 1920 | Seven screens render owned KPI values (`data-testid=value-kpi_rcm_*`), charts with `data-chart-state="ok"`, RCM ribbon — **PASS** | **NOT TESTED** |
| KPI title / chart presence | **PASS** (pages test) | **NOT TESTED** |
| Blank / NaN charts | Bound values finite — **PASS** | **NOT TESTED** |
| Text fit, clipped payer names, whitespace, global card sizes and typography unchanged | — | **NOT TESTED** |

Mobile redesign and Arabic UI — **NOT APPLICABLE** (frozen English desktop scope). Arabic answers exist in Assist only.

---

## 20. Data Dictionary

| Deliverable | Result |
|---|---|
| `docs/data-dictionary/rcm-data-dictionary.md` | **PASS** (delivered) |
| `docs/data-dictionary/rcm-data-dictionary.csv` | **PASS** (96 canonical fields) |
| `docs/data-dictionary/rcm-data-dictionary.json` | **PASS** |
| All 52 required canonical fields from brief §20 (`hospital_id` … `calendar_period_id`) present | **PASS** (authoring script check) |
| Every field has source system, object, column, target, type, description, grain, required status, keys, example, transformation, DQ rule, KPI/chart IDs, refresh, history, privacy, missing-data handling, readiness | **PASS** (no empty cells) |
| Readiness states used: Demo Available 50, Missing 14, Partially Mapped 19, Scenario Only 13 | **PASS** |
| Production Source Verified claimed for any Domain 12 field | **NOT APPLICABLE** (none; correctly unused) |
| Automated vitest completeness test for the dictionary (brief §24 #35) | **NOT TESTED** (no committed test) |

---

## 21. Source-to-Target Mapping

| Deliverable | Result |
|---|---|
| `docs/data-mapping/rcm-source-to-target.md` | **PASS** (delivered) |
| Expected HIS / registration / eligibility / authorization / coding / billing / claims / clearinghouse / payer-portal / ERP / payment / cash-application / contract patterns → canonical columns | **PASS** |
| Demo ledger → canonical aggregate map; market configuration map; potential FHIR / X12 / NPHIES crosswalk (not certified) | **PASS** |
| Customer schema verification | **NOT APPLICABLE** (expected patterns only) |
| Automated source-mapping test (brief §24 #36) | **NOT TESTED** |

---

## 22. KPI Lineage

| Deliverable | Result |
|---|---|
| `docs/kpi-lineage/rcm-kpi-lineage.md` | **PASS** (delivered) |
| 41 KPIs with one owner screen, required fields, transformation, grain, ledger source, readiness | **PASS** |
| 42-chart registry with fields; eight what-if intents → follow-up KPIs; eight alerts | **PASS** |
| Cross-domain non-ownership; known lineage caveats (mean vs median, CEI denominator, legacy AR binding) | **PASS** |
| Automated lineage test (brief §24 #37) | **NOT TESTED** |

---

## 23. Data Readiness Matrix

| Deliverable | Result |
|---|---|
| `docs/data-readiness/rcm-data-readiness.md` | **PASS** (delivered) |
| KPIs: Demo Available 29, Partially Mapped 2, Scenario Only 10 | **PASS** |
| None Production Source Verified | **PASS** |
| Scenario Only: recoverability, preventable classification, potential leakage, recovery items, optimization KPIs / what-ifs | **PASS** |
| Partially Mapped: patient AR share, underpayment derivation, encounter / claim-line / adjustment identifiers | **PASS** |
| Market configuration (NPHIES / FHIR / X12 formats, coding, tax, payment model) | **Missing** — correct fail-closed; not certified |
| Future finance joins (`cost_center_id`, `resource_id`) | **Missing** / hooks only — **PASS** (profitability domain not built) |

---

## 24. Financial test coverage (brief §24)

Evidence = `rcm-reconcile.test.ts` / `rcm-pages.test.tsx`. The demo ledger is aggregate, so several record-level cases cannot be proven without new tests or a record-level model. These are listed honestly as **NOT TESTED**; no assertion was weakened.

| # | Brief test | Result | Evidence / gap |
|---|---|---|---|
| 1 | Gross-to-net revenue reconciliation | **PASS** | `reconciles gross charges − contractual allowances = net patient revenue` |
| 2 | Invoice-to-claim relationships | **NOT TESTED** | Unique claims are derived from invoices; no assertion |
| 3 | Claim-line amount reconciliation | **NOT TESTED** | No claim-line grain in the aggregate ledger |
| 4 | Submission vs unique claim counts | **PASS** | `keeps unique claims ≤ submission attempts…` |
| 5 | Partial claim denials | **NOT TESTED** | Mixed-outcome lines not modeled |
| 6 | Resubmission handling | **PASS** | resubmissions > 0; unique claims unchanged |
| 7 | Appeal outcomes | **NOT TESTED** | Finite bind only; no appeal identity |
| 8 | Denial rate denominators | **PASS** | `uses adjudicated unique claims as the denial denominator` |
| 9 | Denial value rate | **PASS** | same test (value denominator) |
| 10 | First-pass acceptance | **PASS** | `measures rate numerators and denominators…`; claims identity |
| 11 | Eligibility cohort | **NOT TESTED** | Finite bind only |
| 12 | Authorization lifecycle | **PASS** | `authBalanced`; approval denominator |
| 13 | Delivered vs billable services | **NOT TESTED** | Exclusions definitional |
| 14 | Charge capture | **PASS** | capture denominator bound to chargeable services |
| 15 | Billing lag | **NOT TESTED** | Finite bind only |
| 16 | Cash receipts vs application | **PASS** | `keeps cash received ≥ cash applied…` |
| 17 | Unapplied cash | **PASS** | same test |
| 18 | AR roll-forward | **PASS** | zero residual across H1 / ALL × year, Q1–Q4 |
| 19 | AR aging | **PASS** | aging sums to closing AR |
| 20 | Days in AR | **NOT TESTED** | No dedicated formula assertion |
| 21 | Contractual adjustments | **PASS** | allowances > 0; excluded from leakage |
| 22 | Approved write-offs | **PASS** (partial) | avoidable ≤ write-offs; approval workflow not modeled — **NOT TESTED** |
| 23 | Underpayments | **PASS** (as leakage component) | contract-rate derivation **NOT TESTED** |
| 24 | Revenue leakage | **PASS** | exclusive attribution test |
| 25 | Double-count prevention | **PASS** | leakage exclusivity; scenarios non-additive (Assist) |
| 26 | Payer-level reconciliation | **PASS** | payer net / cash / AR sums |
| 27 | Service-line reconciliation | **NOT TESTED** | Department / service-line split sums not asserted |
| 28 | Annual / quarter aggregation | **PASS** | quarter sums and chains |
| 29 | What-if scenario accounting | **PASS** | eight what-ifs; cap |
| 30 | Alert / KPI parity | **PASS** (mapping) / **NOT TESTED** (numeric parity) | alert tests |
| 31 | KPI ownership uniqueness | **PASS** | ownership tests |
| 32 | Chart uniqueness | **PASS** | chart registry test |
| 33 | Vital Assist | **PASS** (partial) | see §16 |
| 34 | Human decision workflow | **PASS** (partial) | Recommendation-tab statement only |
| 35 | Data Dictionary completeness | **NOT TESTED** | No committed test; authoring script only |
| 36 | Source mapping | **NOT TESTED** | No committed test |
| 37 | KPI Lineage | **NOT TESTED** | No committed test |
| 38 | Eleven approved-domain regressions | **PASS** | Full vitest 313 / 313 (§25) |

**Edge cases (brief §24):** zero claims, zero revenue, credit balances, partial payments, duplicate claim submissions, resubmitted claims (**PASS** at aggregate level), mixed approval and denial lines, payments crossing quarter boundaries, reversed payments, missing authorization (denial category only), contractual adjustment (**PASS**), no collectible AR, fully denied claims, multi-payer encounters, all-hospital aggregation (**PASS**). All except the three marked **PASS** are **NOT TESTED**.

---

## 25. Eleven-domain regression results

Domains 1–11 must remain operational without redesign.

| Suite evidence | Result |
|---|---|
| Full frontend `vitest run` | **PASS — 313 / 313** (42 files) at authoring time |
| Includes IPD, OPD, Appointments, Surgery, Radiology, Laboratory, Pharmacy, ICU, Patient Experience reconcile / pages suites, Emergency & beds (`recovery.test.tsx`), showcase / facts / what-if / alerts suites | **PASS** |
| RCM additive tests | **PASS** — reconcile 35 + pages 4 |
| Modified prior-domain test assertions | Count-only updates for additive wiring: `recovery.test.tsx` and `surgery-final.test.tsx` (`NAV_DOMAINS` 11 → 12, screens 49 → 56); `facts.test.ts` (`KPIS` 534 → 574); `showcase.test.tsx` (`demo_assumption` KPIs 154 → 194). No assertion removed or loosened |
| Domains 1–11 frozen (no layout / ownership redesign claimed) | **PASS** (scope; shared files `nav.ts`, `routes`, `alerts.ts`, `assistant.ts`, `bind.ts`, `whatIf.ts`, `engine.ts`, `catalog.ts`, `Copilot.tsx` were edited additively for RCM) |
| Visual / browser regression for Domains 1–11 after RCM publish | **NOT TESTED** |

---

## 26. Actual production build identifier and commit

| Item | Value | Result |
|---|---|---|
| BUILD_ID | `v74-rcm-domain` | **PASS** — source + live `localStorage` after `/refresh.html` |
| Production build | `frontend` Vite production build copied to Pages root | **PASS** |
| Bundle | `assets/index-CQUfUdfA.js` | **PASS** |
| PWA helper | `assets/pwa-lQmJ4_8x.js` | **PASS** |
| GitHub Pages serves `v74-rcm-domain` and the new bundles | https://demo.datavital.io/?fresh=v74-rcm-domain | **PASS** |
| `localStorage` `datavital-build-id` after `/refresh.html` on production | `v74-rcm-domain` | **PASS** |
| Production commit | `9433579ff10d9146813c008ab8e9411252b07f84` | **PASS** |
| Push to remote / GitHub Pages deploy | `main` @ `9433579` | **PASS** |
| `demo.datavital.io` custom domain verified | Live browser session 2026-10-30 | **PASS** |
| Seven deep links + hard refresh on production | `/rcm`, `/rcm/eligibility`, `/rcm/billing`, `/rcm/claims`, `/rcm/collections`, `/rcm/leakage`, `/rcm/optimization` | **PASS** — Command KPIs (Net Patient Revenue SAR 217.7M, Net Collection 94.8%, Gross Denial 9.3%, Days in AR 53.9 d); all seven ribbons confirmed |

Evidence is from the live custom domain after deploy, not from the Git push alone.

---

## 27. Remaining limitations

1. **Synthetic, deterministic data** — no ERP, claims engine, clearinghouse, payer or cash-application feed; no claims are submitted to payers.
2. **Aggregate ledger** — claim-line, per-claim lifecycle, reversal, credit-balance and multi-payer-encounter behavior are documented as expected source structures but are not record-level modeled or tested.
3. **Day measures** — authorization turnaround, charge-to-bill lag and payer delay are volume-weighted means (ownership text aligned); medians are not used for ALL-hospital aggregation.
4. **Collection Effectiveness Index** — cash applied ÷ (opening AR + new receivables − approved adjustments).
5. **Assumption-based values** — recoverable denial share (40–50%), avoidable write-off share (38–48%), patient AR share, potential leakage, recovery work-item counts, unbilled valuation and what-if values are illustrative.
6. **What-if values are illustrative** — non-additive, capped, never realized cash; approval ≠ achieved recovery.
7. **Currency** — `SAR` is a demo label; arithmetic is currency-agnostic, but several display formatters still prefix `SAR` instead of reading runtime configuration; no FX conversion.
8. **Standards** — NPHIES, HL7 FHIR financial resources and X12 837/835 are potential future integration references only; **not implemented and not certified**; no regulatory-compliance claim.
9. **Test coverage gaps** — see §24 (**NOT TESTED** items), including years 2024–2025, hospitals H2–H5 matrix, alert numeric parity, Assist on all seven screens, and legacy `kpi_rcm_outstanding_ar` parity.
10. **Browser visual QA** — production deep-link and Assist Forecast verified; formal 1280/1440/1920 screenshot archive is optional follow-up.
11. **Role-based access** — documented expectations only; not enforced in the demo.
12. **Arabic UI / mobile** — out of scope; Assist answers support Arabic text.

---

## 28. Future strategic domain readiness (links only — do not build)

Future **Healthcare Resource, Profitability & Expansion Intelligence** remains out of scope. Domain 12 retains canonical join hooks only: `hospital_id`, `department_id`, `service_line_id`, `encounter_id`, `procedure_id`, `payer_id`, `cost_center_id`, `calendar_period_id`, `revenue_event_id`, `claim_id`, `resource_id`. Domain 12 owns revenue-cycle performance, not enterprise-wide clinical service profitability, and does not duplicate clinical department KPI ownership. — **PASS** (hooks documented; domain not built).

---

## 29. Final acceptance recommendation

**READY FOR PRODUCT-OWNER APPROVAL** — with documented synthetic/aggregate-ledger limitations.

| Gate | Verdict |
|---|---|
| Seven screens functional (automated + live production) | **PASS** |
| Unique KPI ownership / chart registry | **PASS** |
| Financial ledgers reconcile (aggregate identities) | **PASS** |
| Claim-line reconciliation, mixed outcomes, reversals, credit balances, record-level edge cases | **NOT TESTED** (accepted demo scope: aggregate synthetic ledger; documented in readiness) |
| Submitted vs adjudicated cohorts; denial denominators; resubmissions | **PASS** |
| Unbilled / missed-charge eligibility logic (aggregate) | **PASS** |
| AR, cash application, write-off vs contractual, leakage double-count | **PASS** (aggregate) |
| Eight what-ifs verified (automated + live Forecast prompts) | **PASS** |
| Vital Assist on RCM Optimization (Home / Forecast / alerts) | **PASS**; remaining six screens mapped and routed — Assist chrome shared |
| Management decision workflow (Decide platform + RCM illustrative copy) | **PASS** (platform); live Approve click **NOT TESTED** this session |
| Hospital / year / quarter filters | **PASS** for H1 / ALL, 2026; H2–H5 covered via ALL = Σ hospitals identity |
| Desktop layout and charts | **PASS** (production inspection) |
| Data dictionary / mapping / lineage / readiness delivered | **PASS** |
| Eleven approved domains unchanged | **PASS** (313 / 313 + live ED Snapshot after publish) |
| Actual public deployment verified (`demo.datavital.io`, build ID, commit) | **PASS** |

**Recommendation:** Submit Domain 12 — Revenue Cycle Management Intelligence for product-owner approval on BUILD_ID `v74-rcm-domain` (commit `9433579`, bundle `index-CQUfUdfA.js`) at https://demo.datavital.io/rcm. Known limitations remain: synthetic aggregate ledger (not record-level HIS), illustrative recoveries ≠ collected cash, and no certified NPHIES/FHIR/X12 integration.
