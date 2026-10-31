# Quality & Safety — KPI Lineage

**BUILD_ID:** `v76-quality-domain` · 41 owned KPIs · unique screen ownership enforced in `qualitySafetyOwnership.ts`.

| KPI ID | Screen | Formula / lineage | Limitations |
|---|---|---|---|
| kpi_qs_validated_event_rate | Command | validated ÷ discharges × 1,000 | Descriptive; reporting culture affects volume |
| kpi_qs_severe_harm_events | Command | count severe harm | Not auto-sentinel |
| kpi_qs_hai_burden_rate | Command | HO infection events ÷ patient-days × 1,000 | Not official SIR |
| kpi_qs_quality_measure_compliance | Command | numerators ÷ opportunities | Demo measure set |
| kpi_qs_overdue_high_risk_actions | Command | period-end overdue CAPA stock | Approval ≠ effectiveness |
| kpi_qs_priority_safety_signals | Command | non-info alert count | Threshold-based |
| kpi_qs_reported_incidents | Incidents | report count | ≠ harm |
| kpi_qs_validated_incidents | Incidents | validated count | Reviewed subset |
| kpi_qs_near_miss_events | Incidents | near-miss count | No harm occurred |
| kpi_qs_events_with_harm | Incidents | harm count | Human labels |
| kpi_qs_investigation_timeliness | Incidents | on-time ÷ decided | Illustrative target |
| kpi_qs_classification_completeness | Incidents | labeled ÷ reported | Incomplete labels limit patterns |
| kpi_qs_clabsi_rate | Infections | CLABSI ÷ CL-days × 1,000 | Not certified NHSN |
| kpi_qs_cauti_rate | Infections | CAUTI ÷ UC-days × 1,000 | Not certified NHSN |
| kpi_qs_ssi_rate | Infections | SSI ÷ eligible procedures | Procedure denominator |
| kpi_qs_validated_hai_cases | Infections | CLABSI+CAUTI+SSI+CDI | Sum of validated |
| kpi_qs_cdi_events | Infections | HO CDI count | Demo LabID definition |
| kpi_qs_surveillance_coverage | Infections | covered ÷ plan units | Completeness signal |
| kpi_qs_hand_hygiene_compliance | Prevention | compliant ÷ eligible observed | Audited sample |
| kpi_qs_isolation_compliance | Prevention | compliant ÷ eligible | Audit sample |
| kpi_qs_ip_audit_completion | Prevention | complete ÷ scheduled | Process coverage |
| kpi_qs_cl_bundle_compliance | Prevention | fully compliant ÷ eligible | Not infection proof |
| kpi_qs_catheter_bundle_compliance | Prevention | fully compliant ÷ eligible | Not infection proof |
| kpi_qs_prevention_gaps | Prevention | open high-risk findings | Stock |
| kpi_qs_readmission_rate | Outcomes | unplanned same-facility ÷ eligible | No cross-facility |
| kpi_qs_pressure_injury_rate | Outcomes | HAPI ÷ patient-days × 1,000 | Descriptive |
| kpi_qs_falls_with_injury_rate | Outcomes | falls with injury ÷ patient-days × 1,000 | Descriptive |
| kpi_qs_postop_complication_rate | Outcomes | complications ÷ surgical discharges | Not risk-adjusted |
| kpi_qs_outcome_measure_coverage | Outcomes | complete cohorts ÷ planned | Eligibility flags |
| kpi_qs_outcome_review_backlog | Outcomes | open reviews past target | Stock |
| kpi_qs_open_rca | Actions | open investigations | Stock |
| kpi_qs_overdue_rca | Actions | overdue investigations/CAPA | Stock |
| kpi_qs_capa_ontime | Actions | on-time ÷ decided | Process |
| kpi_qs_open_capa | Actions | open CAPA | Stock |
| kpi_qs_recurring_themes | Actions | themes ≥2 events | Repeat findings |
| kpi_qs_effectiveness_review_rate | Actions | verified ÷ closed CAPA | ≠ clinical proof |
| kpi_qs_addressable_gap | Optimization | rate − target | Illustrative |
| kpi_qs_modeled_incident_reduction | Optimization | scenario | Not measured |
| kpi_qs_modeled_hai_prevention | Optimization | scenario | Not measured |
| kpi_qs_modeled_compliance_uplift | Optimization | scenario | Audited only |
| kpi_qs_priority_action_coverage | Optimization | owned ÷ priority | Process |

Official SIR: **unavailable** (Missing / not fabricated).
