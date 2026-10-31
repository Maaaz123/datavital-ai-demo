# MVP V1 — Vital Assist AI Capability Evidence

**Branch:** `mvp-v1-remediation`  
**Classification date:** 2026-10-30  
**Rule:** Do not describe deterministic What-if math as validated predictive AI.

---

## Maturity classification

| Capability | Present? | Classification | Evidence |
|---|---|---|---|
| Rule-based alerts | Yes | Rule-based alerts | `alerts.ts` threshold rules by domain; severity bands |
| Deterministic KPI calculation | Yes | Deterministic calculation | Domain `*View.ts` ledgers; bind → measure |
| What-if simulation | Yes | What-if simulation (**NOT** validated predictive AI) | `showcase/whatIf.ts` — illustrative arithmetic under assumptions |
| Statistical forecasting | No | Not implemented | No ARIMA/Prophet/ML forecast models in MVP |
| Optimization algorithms | Partial (illustrative) | Scenario framing only | Strategy CapEx vs reallocation comparison — not a solver |
| LLM explanation | Optional / not required | Rule-templated Assist answers | `assistant.ts` grounded packs; no paid external LLM required for MVP |
| Human-approved actions | Yes | Human-approved actions | Assist `approval` strings; what-if “approval does not mutate history” |

---

## Investigate grounding

Investigate answers receive **hospital / year / period / KPI-or-alert** context from the showcase filters and screen department (`screenDepartment` → domain).

| Surface | Department key | Grounding |
|---|---|---|
| Domain screens | Domain name | Domain view facts + methodology |
| `/executive`, `/command` | `Enterprise` | `buildEnterpriseView` facts (RCM NPR, ST contribution, ICU + enterprise staffing scopes, SC, QS) |
| What-if | Domain / Enterprise | `runWhatIf` with selected hospital/year/period |

---

## Spot-tests (automated)

| Question theme | Department | Expectation | Status |
|---|---|---|---|
| Net revenue / contribution | Enterprise | RCM NPR + Strategy contribution numbers | PASS (`whatIf.test.ts`) |
| ICU / staffing pressure | Enterprise | Dual ICU vs enterprise gap scopes | PASS (`whatIf.test.ts`) |
| CLABSI / device-days | Quality & Safety | Device-day denominator language | PASS (`qs-reconcile.test.ts`) |
| ED congestion cross-domain | Enterprise | ≥2 interventions; non-additive | PASS (`whatIf.test.ts`) |

---

## Explicit non-claims

- Not validated clinical prediction.
- Not patient-level diagnostic conclusions.
- Not autonomous CapEx / roster / PO / CAPA closure.
- Not Production Source Verified AI.
