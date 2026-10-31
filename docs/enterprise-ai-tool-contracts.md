# Enterprise AI — Tool Contracts

**Status:** Stages 2–7 + v82 executive remediation  
**BUILD_ID:** `v82-enterprise-ai-executive`  
**Code:** `frontend/src/core/enterpriseAi/tools.ts`, `intent.ts`, `orchestrator.ts`, `focus.ts`, `scenarioSelect.ts`, `riskIntelligence.ts`, `gateway.ts`  
**Depends on:** Stage 1 registry, knowledge graph, reconciliation gate

## Principles

1. Tools read **only** registry / existing `build*View` / what-if values — never invent numbers.
2. Every numeric answer cites a tool result ID (`toolId#n`) plus metric id, hospital, year, period where applicable (Technical audit).
3. Cross-domain answers pass or disclose reconciliation gate results.
4. Causal language limited to graph `causalClaim` (`associative` | `operational-link`).
5. What-if remains illustrative — never mutates historical domain ledgers. `run_what_if` requires an explicit `kind`; missing kind → scenario unavailable.
6. Public demo mode is **deterministic tool orchestration** (explicit Analysis Mode label). LLM mode is stubbed unless a secure backend exists. No API keys in the frontend.
7. Orchestrator derives `focusMetricId` via `resolveFocusFromQuestion` and scenario via `selectScenarioFromQuestion` before planning tools.

## Implemented tools

| Tool | Inputs | Outputs |
|---|---|---|
| `get_metric` | metricId, hospital, year, period | value + definition fields + readiness |
| `get_metric_definition` | metricId | semantic definition |
| `get_metric_trend` | metricId, scope | current vs prior year |
| `compare_periods` | metricId, yearA, yearB | values + delta |
| `compare_hospitals` | metricId, hospitals[] | per-hospital values |
| `retrieve_domain_evidence` | domain, limit | metric values for owning domain |
| `retrieve_cross_domain_evidence` | metricId | knowledge-graph hops |
| `check_reconciliation` | hospital, year, period | Stage 1 gate `{ ok, checks[] }` |
| `find_related_alerts` | optional department | alert catalog slice |
| `inspect_data_quality` | optional metricId | readiness notes + gate |
| `get_scenario_baseline` | optional opportunityId | enterprise/strategy baseline facts |
| `run_what_if` | domain, kind, amount | existing what-if engine result |
| `compare_interventions` | optionIds[], noAdditionalStaffingCost | ranking + overlap rejections |
| `get_forecast` | seriesId | seasonal-naive/MA + backtest |
| `create_decision_proposal` | title, options… | demo decision id (session/local) |
| `get_decision_status` | optional decisionId | lifecycle + outcome |

## Intent classifier (12)

`kpi_explanation` · `comparison` · `trend` · `root_cause` · `cross_domain` · `risk` · `resource_allocation` · `financial` · `what_if` · `decision_prep` · `follow_up_status` · `data_quality`

Method: deterministic pattern scoring. Disclosure always states this is not unrestricted LLM reasoning.

## Refusals

- Clinical diagnosis / patient-level inference
- CapEx auto-approval

## Mode disclosure (public demo)

> Analysis Mode: Deterministic management analytics on illustrative hospital demo data — not an unrestricted live LLM. Numeric claims cite tool results from existing domain views only.

## Executive remediation helpers (not separate tools)

| Helper | Contract |
|---|---|
| `resolveFocusFromQuestion` | Topic → metric; ambiguous → clarification / hospital-wide risk (never silent ED) |
| `selectScenarioFromQuestion` | Intervention → distinct scenario ID or unavailable message |
| `rankHospitalRisks` | Period-scoped risks via documented `RISK_RULES` thresholds |
| `buildExecutiveResponse` | Sections A–G business language; no fabricated losses |
