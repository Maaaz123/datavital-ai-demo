# Enterprise AI — KPI Lineage

**Status:** Stages 1–7  
**Code:** `metricRegistry.ts`, `knowledgeGraph.ts`, `reconciliation.ts`

## Revenue lineage (identity)

```
rcm.net_patient_revenue
  → st.recognized_net_revenue   (P0-001 equality)
  → ent.net_patient_revenue     (executive mirror)
  → st.operating_contribution   (NPR − synthetic eligible direct costs)
  → st.contribution_margin_rate (contribution / NPR)
```

Approval of an Enterprise AI decision **does not** rewrite any node in this lineage.

## Capacity / flow lineage (operational links)

```
ed.arrivals / ed.admissions
  ↔ ed.wait.median_min
  ↔ ed.boarding.gt4h_rate
  ↔ beds.occupancy / beds.blocked
  → surg.or_utilization (postop demand)
  ↔ icu.staffing_gap_hours
  ↔ st.enterprise_staffing_gap_hours   (different scope — never force equality)
```

## Supply / quality / experience (associative)

```
sc.supply_availability ↔ sc.critical_stockouts
qs.validated_event_rate → qs.overdue_high_risk_actions
ed.wait.median_min ↔ px.overall_satisfaction   (correlation ≠ causation)
rcm.gross_denial_rate ↔ rcm.net_patient_revenue
```

## Investigation citation path

Observe registry value → prior-year baseline → knowledge-graph related metrics → reconciliation gate → driver status (`partially_supported` | `contradicted` | `insufficient_evidence`). Never escalate correlation alone to definitive root cause.
