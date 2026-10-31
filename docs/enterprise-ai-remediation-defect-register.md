# Domain 16 — Enterprise AI Executive UX Remediation Defect Register

**Branch:** `domain-16-executive-remediation`  
**Baseline main HEAD:** `b4db7a3` (Merge PR #3 — Domain 16 Enterprise AI)  
**Baseline BUILD_ID (repo + origin/main refresh.html):** `v81-enterprise-ai-domain`  
**Production refresh (demo.datavital.io / GitHub raw main):** `v81-enterprise-ai-domain`  
**Date:** 2026-10-30  
**Method:** Code inspection of `frontend/src/core/enterpriseAi/*` against executive UX remediation findings A–I.  
**Legend:** CONFIRMED DEFECT · DESIGN ISSUE · NEEDS INVESTIGATION · NOT TESTED

---

## Finding A — Engineer-facing primary UX / missing executive response contract

| Field | Value |
|---|---|
| Classification | **CONFIRMED DEFECT** |
| Evidence | `enterpriseAi.tsx` primary labels: “Query composer”, “Investigation workspace”, “Evidence citations (tool result IDs)”, “Drivers” with raw statuses `partially_supported` / `insufficient_evidence`. `orchestrator.ts` summary joins engineer jargon (`Deterministic answer for intent…`, metric IDs, tool result IDs) into the main answer. No structured A–G executive sections on `GroundedAnswer`. |
| Impact | Hospital executives see developer workflow language instead of a management brief. |
| Remediation | Executive response contract (sections A–G); technical IDs only in expandable Technical audit. |

---

## Finding B — Hardcoded ED focus metric

| Field | Value |
|---|---|
| Classification | **CONFIRMED DEFECT** |
| Evidence | `enterpriseAi.tsx` L117: `focusMetricId: 'ed.wait.median_min'` for workspace drivers regardless of question. `orchestrator.ts` L114–130, L256: plan steps and `runInvestigation({ focusMetricId: 'ed.wait.median_min' })` hardcode ED wait for non-flagship and flagship paths. `investigation.ts` L49: default `focusMetricId ?? 'ed.wait.median_min'`. Finance / supply questions still investigate ED wait. |
| Impact | Silent ED default misleads managers asking about denials, stockouts, contribution, etc. |
| Remediation | Derive focus from intent + entity/topic → metric ID mapping; ambiguous → clarification or labeled hospital-wide risk overview — never silent ED. |

---

## Finding C — Scenario reuse (`ent-ed-congestion`)

| Field | Value |
|---|---|
| Classification | **CONFIRMED DEFECT** |
| Evidence | `orchestrator.ts` L76 and L156 always call `run_what_if` with `kind: 'ent-ed-congestion'`. `simulation.ts` L87/L109 defaults `kind ?? 'ent-ed-congestion'`. Distinct intervention questions (supply efficiency, overtime, denials) still simulate ED congestion. |
| Impact | Different management interventions produce identical scenario model IDs/outputs. |
| Remediation | Map intervention intents to distinct existing what-if scenario IDs; unsupported → explicit unavailability message; tests for 3 distinct scenario IDs. |

---

## Finding D — Executive language table not applied

| Field | Value |
|---|---|
| Classification | **CONFIRMED DEFECT** |
| Evidence | UI uses “Query composer”, “Investigate”, “Drivers”, “Evidence explorer”, “Human decision panel”, raw metric IDs as focus titles. Missing labels: Ask DataVital AI, Analysis Mode, Supporting Evidence, Emergency Waiting Time, Possible Contributing Factor, More Evidence Needed, Other Factors to Consider, Compare Improvement Options, Recommended Management Action. |
| Impact | Primary surface fails executive readability. |
| Remediation | Replace primary labels per executive table; keep technical IDs in Technical audit / evidence details. Soften AI mode disclosure on the main answer. |

---

## Finding E — Role-aware presentation absent

| Field | Value |
|---|---|
| Classification | **CONFIRMED DEFECT** |
| Evidence | No CEO/Board · COO · CFO · CMO/CNO selector in `enterpriseAi.tsx`. Same layout/emphasis for all audiences. |
| Impact | CFO-relevant revenue/denial sections are not emphasized for finance audiences (presentation only — no fake auth). |
| Remediation | Add presentation-only role selector; emphasize role-relevant sections without inventing data. |

---

## Finding F — Hospital-wide risk intelligence missing / not wired

| Field | Value |
|---|---|
| Classification | **CONFIRMED DEFECT** |
| Evidence | No `riskIntelligence.ts`. Risk intent in orchestrator only calls `find_related_alerts` (L134–136). “How is hospital performing?” / “top risks” do not rank period-scoped risks across 15 domains from registry metrics + documented thresholds. |
| Impact | Ambiguous performance / risk questions cannot produce an auditable hospital-wide risk overview. |
| Remediation | Implement period-scoped risk ranking with documented rules; wire to performance/risk intents and ambiguous clarification path. |

---

## Finding G — Multi-turn investigation state incomplete

| Field | Value |
|---|---|
| Classification | **CONFIRMED DEFECT** |
| Evidence | Composer history stores question strings only (`HISTORY_KEY`). Workspace investigation `useMemo` ignores answer focus. Follow-ups (“what about last quarter”, “show evidence”, “approve”) re-run or act without shared subject/focusMetric/constraints/candidates state. Approve buttons call `approveDecision` without confirmation step for “approve” phrasing. |
| Impact | Follow-ups drift or silently approve; drivers/evidence disagree with the answered focus. |
| Remediation | Maintain investigation state; follow-ups update period / expand evidence / open confirmation — no silent approval. |

---

## Finding H — Forecast formatting · Decisions empty state · Optimization static ranking UX

| Field | Value |
|---|---|
| Classification | **CONFIRMED DEFECT** (compound) |
| Evidence | Forecasting page: `toFixed?.(3)` raw decimals, no `80.2%` / `63.3 min` / SAR formatting (`enterpriseAi.tsx` L355). Decisions empty: plain “No decisions yet — create via Investigate” without “Start an Investigation” link. Optimization page: fixed `useMemo` variables/objective — no UI to change objective/constraints/parameters and re-rank. |
| Impact | Forecasts look unpolished; decision funnel broken for empty state; optimization appears static best-option. |
| Remediation | Format forecast values; Decisions empty → Start an Investigation → `/enterprise-ai`; Optimization controls re-run `runOptimization` from real calculations. |

---

## Finding I — Eval / acceptance docs lag executive remediation

| Field | Value |
|---|---|
| Classification | **NEEDS INVESTIGATION** → remediate with docs pack |
| Evidence | Existing `docs/enterprise-ai-final-acceptance.md`, `enterprise-ai-model-evaluation.md`, `enterprise-ai-tool-contracts.md`, `enterprise-ai-governance.md` describe v81 engineer-facing Domain 16. No executive UX acceptance, 80+ management question pack, scenario test matrix, or six-page browser QA for remediation. Browser QA of live v82 pages: **NOT TESTED** at register time. |
| Impact | Acceptance trail incomplete for executive remediation. |
| Remediation | Create executive acceptance, management question evaluation (≥80), scenario matrix CSV, six-page browser QA (honest PASS/FAIL/NOT TESTED); update tool contracts / model-eval / governance as needed. |

---

## Summary table

| ID | Title | Classification | P0? |
|---|---|---|---|
| A | Engineer-facing UX / missing executive response contract | CONFIRMED DEFECT | Yes (contract) |
| B | Hardcoded ED focus | CONFIRMED DEFECT | **Mandatory P0** |
| C | Scenario reuse `ent-ed-congestion` | CONFIRMED DEFECT | **Mandatory P0** |
| D | Executive language table | CONFIRMED DEFECT | **Mandatory P0** |
| E | Role-aware presentation absent | CONFIRMED DEFECT | Yes |
| F | Risk intelligence missing | CONFIRMED DEFECT | Yes |
| G | Multi-turn investigation state | CONFIRMED DEFECT | Yes |
| H | Forecast / Decisions empty / Optimization UX | CONFIRMED DEFECT | Yes |
| I | Docs / browser QA lag | NEEDS INVESTIGATION → docs + QA | Docs |

**Browser visual QA at register creation:** NOT TESTED (to be recorded in `docs/enterprise-ai-six-page-browser-qa.md` after deploy).
