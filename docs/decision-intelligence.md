# DataVital AI — Decision Intelligence Enhancement

## Delivery

| Item | Value |
|---|---|
| Commit | 6319205cfc9d72762f4578dfaa9402e99894d6cf |
| Live URL | https://maaaz123.github.io/datavital-ai-demo/ |
| Hard refresh | https://maaaz123.github.io/datavital-ai-demo/refresh.html |
| Build ID | `v32-decision-intelligence` |
| Tests | 102/102 passed |
| Design freeze | CSS asset hash unchanged (`index-BwUO8Xov.css`) · 9 screens unchanged |

## 1. AI improvements

- Domain **what-if engine** (`whatIf.ts`) for Emergency, Beds, and Inpatient.
- Vital Assist **Forecast** tab: selectable what-if chips with current → change → estimated outcome → assumptions → follow-up.
- **Ask** answers use an 8-part management structure (What happened → Follow-up) and include what-if prompts.
- **Actions** recommendations now include problem, evidence, contributing factors, action, expected benefit, illustrative scenario, owner, priority, approval status, follow-up KPI.
- Stronger director/manager priority answers with hospital-specific figures.
- Domain refusal when questions cross ownership (no silent KPI substitution).

## 2. Example Vital Assist answers

**Emergency** — “What could happen if patient arrivals increase by 15%?”
- Current visits and door-to-provider median from the selected hospital.
- Estimated higher wait and left-without-care share (labeled elasticities).
- Action: cover peak first-provider hours; follow door-to-provider and walkaways.

**Beds** — “What happens if five blocked beds become available?”
- Moves blocked → vacant inside the staffed identity.
- Occupied unchanged; vacant rises; assignment options improve on the tightest ward.

**Inpatient** — “What would happen if prolonged stays decreased by 10%?”
- Long-stay share and count from the scenario.
- Illustrative fewer long-stay discharges; focus specialty named; AI does not decide readiness.

## 3. Actionable recommendations

Example (ED door-to-provider alert):
- Problem: median above review line for hospital/year.
- Action: align first-provider coverage to peak hours.
- Owner: Emergency operations lead.
- Follow-up: door-to-provider median and P90 after next peak.
- Decision: Approve / Reject / Defer (intent only, not measured improvement).

## 4. What-if scenarios

| Domain | Scenarios |
|---|---|
| Emergency | Arrivals +10/15/20%, boarding −20%, greatest-impact ranking |
| Beds | Unblock 5 beds, demand +10%, assignment −15 minutes |
| Inpatient | Prolonged stays −10%, delayed discharges −25%, LOS −0.5 day |

All labeled illustrative — not validated forecasts.

## 5. Design & screens

- No redesign; no new screens; nav/KPI cards/charts preserved.
- All nine public screens remain: Emergency ×3, Beds ×3, Inpatient ×3.

## 6. Remaining limitations

- Prepared scenario logic, not a live LLM or trained ML model.
- What-if elasticities are demonstration assumptions.
- Alert thresholds remain full-year labeled clocks.
- Care-plan / consult documentation clocks stay unavailable in IPD.
