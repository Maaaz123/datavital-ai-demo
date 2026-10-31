# Enterprise AI — Model Evaluation

**Status:** Stage 5 partial acceptance  
**Code:** `frontend/src/core/enterpriseAi/forecast.ts`  
**Model version:** `enterprise-ai-forecast-v1-seasonal-naive-ma`

## Scope

Aggregate operational monthly series only:

| Series ID | Source |
|---|---|
| `beds.occupancy` | Enterprise / Beds monthly occupancy stocks |
| `ed.wait.median_min` | Scenario monthly ED wait |
| `ed.arrivals` | Scenario monthly ED arrivals |

## Methods

- **Seasonal naive** (period 12 when history allows)
- **Moving average** (window 3)
- **Hybrid** = 0.5 seasonal + 0.5 MA

## Backtest protocol

1. Time-ordered holdout on the last `min(4, n−3)` points.
2. Report **MAE** and **WAPE**.
3. If series length &lt; 6 or all zeros → readiness label **`illustrative`**.

## Explicit non-claims

- Not patient-specific prediction
- Not clinical accuracy
- Not a production forecasting service
- Sparse-data forecasts are labeled illustrative

## Decision / what-if evaluation notes

What-if and optimization paths reuse Domain 1–15 engines. Overlapping benefits are rejected (not summed). Staffing-cost constraint is enforceable. Human approval is required; KPI ledgers are unchanged by decision state.
