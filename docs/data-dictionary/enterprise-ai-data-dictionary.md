# Enterprise AI — Data Dictionary

**Status:** Stages 1–7  
**Authority:** `frontend/src/core/enterpriseAi/metricRegistry.ts`  
**Companions:** `enterprise-ai-data-dictionary.csv`, `enterprise-ai-data-dictionary.json`  
**Rule:** Every metric `sourceFn` calls an existing `build*View` / enterprise reader — no second ledger.

## Data readiness legend

| State | Meaning |
|---|---|
| Demo Available | Represented via existing domain builders |
| Scenario Only | Explicit what-if / modeled assumption |
| illustrative | Forecast/backtest when series too sparse |

## Core entities

| Entity | Grain | Notes |
|---|---|---|
| MetricDefinition | metric id | Semantic registry |
| KnowledgeEdge | edge id | Associative / operational-link only |
| ToolExecutionRecord | toolResultId | Grounding citations |
| InvestigationReport | investigation id | Driver statuses |
| DecisionProposal | decision id | Demo session/local state |
| OutcomeRecord | outcome id | Expected / simulated / observed |
| ForecastResult | series + model version | Aggregate monthly only |

## Sample metrics (see CSV/JSON for full export)

| id | owningDomain | unit | periodSemantics |
|---|---|---|---|
| ed.wait.median_min | Emergency | minutes | period-flow |
| beds.occupancy | Beds | ratio | period-average-stock |
| icu.staffing_gap_hours | ICU | hours | period-flow |
| rcm.net_patient_revenue | Revenue Cycle | SAR | period-flow |
| st.recognized_net_revenue | Strategy | SAR | period-flow |
| sc.critical_stockouts | Supply Chain | count | period-flow |

## Lineage notes

- Revenue: `rcm.net_patient_revenue` → `st.recognized_net_revenue` → `ent.net_patient_revenue`
- ICU gap: `icu.staffing_gap_hours` === `st.icu_staffing_gap_hours`; enterprise gap is distinct
- Supply rates: availability / OTD ∈ [0, 1]
