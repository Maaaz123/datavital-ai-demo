# Enterprise AI × Vital Assist — Regression Evidence

**BUILD_ID:** `v91-enterprise-routing`  
**Suite:** `frontend/src/core/enterpriseAi/enterpriseAi-management-intent.test.ts`  
**Date:** 2026-10-31

Legend: PASS / FAIL / NOT TESTED / NOT APPLICABLE

---

## Group results

| Group | Focus | Result | Evidence |
|---|---|---|---|
| A — CEO | Hospital-wide top-3 risks | **PASS** | `hospital_wide_risk`; ≥3 distinct risks; ≥2 domains; ≥3 actions with owners |
| B — CFO | Claims denials → RCM | **PASS** | Focus `rcm.gross_denial_rate`; scenario `rcm-denials-down`; CFO/RCM owner; no ED language |
| C — COO | Overtime, no staffing cost | **PASS** | Focus staffing gap; preferred `st-reduce-overtime`; no hire uplift |
| D — CMO | Patient safety | **PASS** | Focus `qs.overdue_high_risk_actions`; scenario `qs-capa-overdue-down`; no clinical causality |
| E — Topic switch | ED→RCM→QS→Supply→Enterprise | **PASS** | Each turn reflects latest topic; no stale ED pin |
| F — Scope switch | H1/H2, 2024–2026, Q1 | **PASS** | Focus/scenario stable; hospital/year updated on investigation state |
| G — Scenarios | Distinct interventions | **PASS** | Four distinct scenario IDs for denials/supply/overtime/ED |
| H — Decisions | Draft/Approve/Reject/Defer + clear | **PASS** | Lifecycle OK; topic change drops prior decision id |
| Vital Assist format | Enterprise brief lines | **PASS** | Title `Hospital Performance`; Main Risks / Recommended Actions; not Emergency Director |

---

## Critical same-conversation test

1. ED waiting → ED focus **PASS**  
2. Claims denials → RCM **PASS**  
3. Patient safety → Quality **PASS**  
4. Supply stockouts → Supply **PASS**  
5. Hospital-wide CEO risks → enterprise scope **PASS**  

---

## Vital Assist entry alignment

| Surface | Before | After | Result |
|---|---|---|---|
| Ask on `/enterprise-ai*` | `answerQuestion(..., 'Emergency')` | `orchestrate` + `formatEnterpriseAssistBody` | **PASS** |
| Ask on `/executive`, `/command` | Same Emergency remap | Same orchestrate path | **PASS** |
| Ask on Domain 1–15 | Domain assistant | Unchanged | **NOT APPLICABLE** (out of scope) |

---

## Automated totals (management-intent suite)

| Metric | Value |
|---|---|
| Tests in suite | 9 |
| Passed | 9 |
| Failed | 0 |
