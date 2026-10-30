# ICU Data Readiness Matrix

**Release:** `v71-icu`  
**Rule:** Demo Available ≠ Production Source Verified.

| Canonical field / capability | Demo | Production | Impact if missing in real integration |
|---|---|---|---|
| hospital_id, icu_unit_id, calendar_period_id | Demo Available | Missing | All ICU KPIs blocked |
| Daily ADT location events (arrived/departed) | Demo Available | Missing | Census, patient-days, LOS, admissions |
| Internal ICU↔ICU transfer flags | Demo Available | Missing | Unit census identity; hospital neutrality |
| bed_id + staffed_bed_flag + bed_status ledger | Demo Available | Partially Mapped | Staffed vs physical capacity |
| shift roster + staff_role_id competency | Demo Available | Missing | Coverage, gap, reallocation what-if |
| transfer_ready_at / discharge_ready_at | Scenario Only | Scenario Only | Transfer/ready delay KPIs remain illustrative |
| Device-state intervals (vent lifecycle) | Demo Available | Missing | Utilization, downtime, readiness |
| device_days + surveillance classification | Scenario Only | Missing | Completeness only; no validated infection rates |
| Downstream ward capacity feed | Demo Available (proxy) | Missing | Feasible capacity overstated without constraint |
| Future cost/revenue fields | Scenario Only hooks | Missing | Strategic domain only — not ICU KPIs |

## KPI production-readiness (illustrative demo vs verified source)

All 31 ICU headline KPIs are **Demo Available**. None are **Production Source Verified**.  
Scenario Only dependencies: Transfer Delay, Ready Delay, Surveillance Completeness, readiness-based what-ifs.
