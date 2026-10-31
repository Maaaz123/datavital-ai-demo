# Enterprise AI — Data Dictionary (skeleton)

**Status:** Stage 1 stub  
**Authority:** Metric definitions live in `frontend/src/core/enterpriseAi/metricRegistry.ts`  
**Rule:** Every metric `sourceFn` calls an existing `build*View` / enterprise reader — no second ledger.

## Columns (to expand)

| id | name | owningDomain | grain | numerator | denominator | unit | periodSemantics | dataReadiness | qualityNotes |
|---|---|---|---|---|---|---|---|---|---|
| _(see registry)_ | | | | | | | | | |

## Domains in scope (15 + Enterprise)

Emergency · Beds · ICU · Inpatient · OPD · Appointments · Surgery · Laboratory · Radiology · Pharmacy · Revenue Cycle · Strategy · Supply Chain · Quality & Safety · Patient Experience · (+ Enterprise mirrors)

## Lineage notes

- **Revenue:** `rcm.net_patient_revenue` → `st.recognized_net_revenue` → `ent.net_patient_revenue` (identity).
- **ICU gap:** `icu.staffing_gap_hours` === `st.icu_staffing_gap_hours`; enterprise gap is a distinct scope.
- **Supply rates:** `sc.supply_availability` and `sc.supplier_otd` ∈ [0, 1].

## Next

- Export CSV/JSON companions matching other domain dictionaries.
- Cross-link KPI lineage docs under `docs/kpi-lineage/`.
