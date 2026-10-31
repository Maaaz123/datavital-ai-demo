# Quality, Patient Safety & Infection Prevention — Data Dictionary

**Domain:** Domain 13 — Quality, Patient Safety & Infection Prevention Intelligence  
**Release:** `v1-quality` · **BUILD_ID:** `v76-quality-domain`  
**Status:** Demo Available — not Production Source Verified  
**Scope:** Expected source-system fields → DataVital canonical columns  
**Privacy:** Synthetic, deterministic, non-identifiable demonstration data only. No real MRNs, incident IDs, or clinical notes.

Authoritative code: `frontend/src/core/qualitySafetyOwnership.ts` (41 KPIs, 42 charts, 7 screens), `qualitySafetyView.ts`, `qualitySafety.tsx`, `qualitySafetyScope.ts`.

Primary routes: `/quality`, `/quality/incidents`, `/quality/infections`, `/quality/prevention`, `/quality/outcomes`, `/quality/actions`, `/quality/optimization`.

## Data readiness legend

| State | Meaning |
|---|---|
| Demo Available | Represented in `buildQsView` synthetic ledger |
| Production Source Verified | Mapped to a real hospital feed (**none claimed**) |
| Partially Mapped | Expected pattern known; aggregate/assumption only |
| Missing | Required for production; not available |
| Scenario Only | Explicit what-if / modeled assumption |

## Entities (canonical)

| Entity | Grain | Key concepts |
|---|---|---|
| Safety Incident Report | Report event | reported ≠ validated; near miss ≠ harm |
| Validated Safety Event | Reviewed event | category, severity, department |
| Harm Classification | Label on validated event | Near miss → Severe harm (versioned demo taxonomy) |
| Safety Investigation | Case | open / overdue / closed; timeliness |
| Root Cause / Theme | Theme | recurring findings |
| Corrective Action (CAPA) | Action | open, overdue, on-time, effectiveness verification |
| Infection Surveillance Case | Event | CLABSI, CAUTI, SSI, HO CDI — validated status |
| Device Exposure Day | Day | central-line days, urinary-catheter days |
| Eligible Surgical Procedure | Procedure | SSI denominator + surveillance window |
| Hand Hygiene Observation | Audited opportunity | eligible vs compliant; sampling limits |
| Prevention Bundle Observation | Audited opportunity | CL / UC bundles |
| Isolation / Environmental Audit | Audit | scheduled vs complete |
| Quality Measure Opportunity | Measure row | numerator met ÷ eligible |
| Outcome Review | Review case | readmission / complication / mortality review backlog |

## Ledger conventions

1. Reported incidents ≠ validated events ≠ harm events ≠ severe harm.  
2. CLABSI / CAUTI use device-day denominators × 1,000 — not admissions.  
3. SSI uses eligible procedure denominators — not hospital admissions.  
4. Official SIR is unavailable without model-based predicted infections (`sirAvailable = false`).  
5. Hand hygiene / bundles use audited eligible opportunities only.  
6. Outcome rates are descriptive — not risk-adjusted rankings; readmissions are same-facility only.  
7. CAPA approval ≠ measured effectiveness.  
8. Eight what-if scenarios overlap and must not be summed.  
9. Hospital ALL = exact sum of H1–H5; rates recomputed from summed numerators/denominators.  
10. Clinical governance only — not a diagnostic system, medical device, or autonomous IPC engine.
