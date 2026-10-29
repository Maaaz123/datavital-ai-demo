# DataVital AI — Business Dashboard & KPI/Chart Audit

**Scope:** All nine approved dashboards (Emergency ×3, Beds & Capacity ×3, Inpatient Care ×3)  
**Constraint:** UI/UX, colors, typography, layout, and spacing frozen  
**Build:** `v34-kpi-chart-audit`  
**Live:** https://maaaz123.github.io/datavital-ai-demo/ (hard refresh via `/refresh.html`)

## Summary

Corrected hospital-management terminology, fixed misleading chart encodings (snapshot vs period mixing, identity-breaking bars), partitioned IPD admission sources so they sum to admissions, blanked a false “average daily occupancy” that collapsed to the snapshot rate, and aligned Vital Assist recommendations with on-screen KPI/chart names.

## Before → after terminology (ribbon KPIs)

| Domain | Before | After |
|---|---|---|
| ED | Time to first doctor | Door-to-provider (median) |
| ED | Left without care | Left without being seen |
| ED | Admitted still waiting >4h | Boarding beyond 4 hours |
| ED | Back within 72 hours | Unplanned 72-hour return rate |
| Beds | Beds ready to use / free now | Operational beds / Vacant beds |
| Beds | Share of beds in use | Bed occupancy rate |
| Beds | Times each bed turns | Bed turnover rate |
| IPD | Patients in hospital now | Inpatient census |
| IPD | Ready but still here | Medically ready, not discharged |
| IPD | Back within 7/30 days | Unplanned 7/30-day readmission rate |

## Corrected chart mappings

| Page | Before | After | Reason |
|---|---|---|---|
| Emergency Snapshot | How visits ended (flow) | ED disposition outcomes | Executive disposition language; identity note |
| Waiting & Patient Flow | Patient path through ED (flow) | Triage and disposition volumes (bars) | Stages are not one additive path |
| Safety & Return Visits | Walkaways and return visits | Left without being seen and 72-hour returns | Professional LWBS / return language |
| Bed Status | Ready/In use/Free/Blocked bars | Occupied/Vacant/Blocked composition | Ready was the total of the other three |
| Bed Assignment | How beds move (flow) | Bed movement volumes (bars) | Clearer period volume comparison |
| Bed Capacity Outlook | Likely free / Expected frees | Projected available / Expected releases | Planning terminology |
| Inpatient Snapshot | Flow mixing census + period | Bars: inpatient volume context | Snapshot vs period not mixed as flow |
| Stay & Discharge | Destination funnel | Discharge destinations (bars) | Partition of discharges, not funnel drop-off |
| Care Progress & Outcomes | Stacked census + discharges | Line: census vs discharges | Avoid stacking incompatible measures |

## Audit table (implemented)

| Current page | Current KPI/chart | Identified business issue | Proposed correction | Reason | Status | Verification |
|---|---|---|---|---|---|---|
| Emergency Snapshot | Emergency visits / Time to first doctor / Left without care | Casual labels | Professional ED KPI names | Director-ready English | Done | recovery + audit tests |
| Emergency Snapshot | Bed-style “Ready” not used; boarding chart “Waiting” | Ambiguous series name | Boarding beyond 4 hours / Boarded visits | Boarding ≠ wait to provider | Done | chart title assert |
| Waiting & Patient Flow | Patient path flow chart | Mixed non-identity stages | Bars with explicit identity note | Avoid false funnel/flow | Done | build |
| Safety & Return Visits | Walkaways / Back within 72h | Informal outcome language | LWBS + unplanned 72-hour return | Standard ED quality terms | Done | Assist answer test |
| Bed Status | Ready + components as peers | Double-counts operational total | Composition of occupied/vacant/blocked | Identity honesty | Done | visual + tests |
| Bed Occupancy indicators | Average Daily Occupancy Rate | Equalled current occupancy | Marked Not available | Nightly census absent | Done | dashboard-audit.test |
| Bed Assignment / Outlook | Free / Likely free wording | Informal | Vacant / Projected available | Capacity planning language | Done | recovery test |
| Inpatient Snapshot | Admission sources | Sum exceeded admissions | Partition ED / elective / transfer / other | Source identity | Done | dashboard-audit.test |
| Inpatient Snapshot | Flow census + period totals | Mixed clock types | Context bars + note | Snapshot ≠ period | Done | build |
| Stay & Discharge | Ready but still here | Informal | Medically ready, not discharged | Clinical ownership clarity | Done | whatIf copy |
| Care Progress & Outcomes | Stacked census/discharges | Misleading stack | Dual line series | Different measure types | Done | build |
| Vital Assist (all) | Generic prompts/actions | Weak screen linkage | Page-specific prompts + alert actions naming on-screen charts | Screen-aware BI | Done | Copilot Ask + alerts |

## Tests

- `frontend/src/core/recovery.test.tsx` — 10/10
- `frontend/src/core/dashboard-audit.test.ts` — identities, occupancy blank, LWBS Assist
- `frontend/src/showcase/whatIf.test.ts`
- `frontend/src/core/alerts.test.ts`
- `npm run build` — pass

## Deployment

**Commit:** `686b00d` (`686b00d9a8f1612862da9d4398e2fdc85a743564`)

**URL:** https://maaaz123.github.io/datavital-ai-demo/
