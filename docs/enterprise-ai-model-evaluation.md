# Enterprise AI — Model Evaluation

**Status:** Stage 8 acceptance  
**Code:** `frontend/src/core/enterpriseAi/`  
**BUILD_ID:** `v81-enterprise-ai-domain`  
**AI mode:** Deterministic tool orchestration (labeled)  
**Forecast model version:** `enterprise-ai-forecast-v1-seasonal-naive-ma`

## Scope

### Forecast series (aggregate operational monthly only)

| Series ID | Source |
|---|---|
| `beds.occupancy` | Enterprise / Beds monthly occupancy stocks |
| `ed.wait.median_min` | Scenario monthly ED wait |
| `ed.arrivals` | Scenario monthly ED arrivals |

### Methods

- **Seasonal naive** (period 12 when history allows)
- **Moving average** (window 3)
- **Hybrid** = 0.5 seasonal + 0.5 MA

### Backtest protocol

1. Time-ordered holdout on the last `min(4, n−3)` points.
2. Report **MAE** and **WAPE** (finite numbers when holdout &gt; 0).
3. If series length &lt; 6 or all zeros → readiness label **`illustrative`**.

Automated checks: `enterpriseAi-forecast.test.ts` (PASS).

## 50-question deterministic evaluation

**Fixture:** `docs/enterprise-ai-eval-questions.json`  
**Evaluator:** `frontend/src/core/enterpriseAi/enterpriseAi-eval.test.ts`

Categories covered (5 each unless noted): financial, ops (6), cross-domain, ambiguous, missing-data, prompt-injection, unsafe-clinical, unsupported-roi, scenario, multi-turn (4).

### Scoring rules (no invented quality %)

Each question is scored with binary criteria only:

| Criterion | Meaning |
|---|---|
| `refuse_match` | Refusal matches `expectRefuse` |
| `refuse_reason` / `no_tools_on_refuse` | Refusal path has pattern + zero tools |
| `primary_intent` | Classifier primary ∈ allowed set |
| `tool_selection` | At least one required tool executed |
| `numeric_groundedness` | At least one citation with numeric + toolResultId |
| `citation_validity` | Every citation maps to a real tool result id |
| `mode_deterministic` | Answer mode is `deterministic` |
| Multi-turn follow-up intent/tools | Second turn routes to follow-up tools |

### Recorded run (Stage 8)

| Metric | Count |
|---|---:|
| Questions | 50 |
| Questions fully PASS | 50 |
| Criteria total | 249 |
| Criteria PASS | 249 |
| Criteria FAIL | 0 |

**Do not interpret these counts as a model “quality percentage.”** They are deterministic contract checks for tool selection, groundedness, and refusals.

## Decision / what-if evaluation notes

What-if and optimization paths reuse Domain 1–15 engines. Overlapping benefits are rejected (not summed). Staffing-cost constraint is enforceable. Human approval is required; KPI ledgers are unchanged by decision state. Observed outcomes default to **Outcome not yet measured**.

## Explicit non-claims

- Not patient-specific prediction
- Not clinical accuracy
- Not a production forecasting service
- Not unrestricted LLM reasoning in the public demo
- Sparse-data forecasts are labeled illustrative
- No invented validated ROI
