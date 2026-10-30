# ICU KPI Lineage

Each primary KPI has exactly one owning screen (`icuOwnership.ts`). Transformations run inside `buildIcuView` and bind via `icuMapped` in `bind.ts`.

| KPI ID | Display | Owner screen | Route | Required fields | Transformation | Denominator / grain | Readiness |
|---|---|---|---|---|---|---|---|
| kpi_icu_admissions | ICU Admissions | command | /icu | icu_arrived_at, hospital_id, icu_unit_id, departure exclusion of internal transfers | Count arrivals from outside ICU in period | Admissions | Available |
| kpi_icu_discharges | ICU Discharges | command | /icu | icu_departed_at, departure_disposition≠death | Count non-death ICU exits | Discharges | Available |
| kpi_icu_patient_days | Patient Days | command | /icu | opening/closing census by day | Midnight census Σ patient-days | Patient-days | Available |
| kpi_icu_avg_census | Avg Census | command | /icu | patient_days, calendar_period_id | patient_days ÷ days in period | Patients | Available |
| kpi_icu_demand_pressure | Demand Pressure | command | /icu | pending transfers, available staffed | pending ÷ max(1, available staffed) | Index | Available |
| kpi_icu_pending_transfers | Pending Transfers | command | /icu | open transfer_request | Count open requests at observation | Requests | Available |
| kpi_icu_admission_wait | Admission Wait | flow | /icu/flow | admission_requested_at, icu_arrived_at | Median minutes (arrived − requested) | Minutes | Available |
| kpi_icu_delayed_admissions | Delayed Admissions | flow | /icu/flow | admission wait, target 90 min | Count waits > target | Admissions | Available |
| kpi_icu_transfer_delay | Transfer Delay | flow | /icu/flow | transfer_ready_at, icu_departed_at | Median hours (departed − transfer_ready) | Hours | Scenario Only (ready flag synthetic) |
| kpi_icu_median_los | Median LOS | flow | /icu/flow | icu_arrived_at, icu_departed_at | Median hours completed stays | Hours | Available |
| kpi_icu_discharge_ready_delay | Ready Delay | flow | /icu/flow | discharge_ready_at, icu_departed_at | Median hours (departed − ready) | Hours | Scenario Only (ready flag synthetic) |
| kpi_icu_boarding_hours | Boarding Hours | flow | /icu/flow | admission_requested_at, icu_arrived_at | Σ wait minutes ÷ 60 | Hours | Available |
| kpi_icu_staffed_beds | Staffed Beds | capacity | /icu/capacity | bed_id, staffed_bed_flag | Count staffed beds | Beds | Available |
| kpi_icu_available_staffed | Available Staffed | capacity | /icu/capacity | bed_status, staffed_bed_flag | staffed − occupied − blocked | Beds | Available |
| kpi_icu_nurse_coverage | Nurse Coverage | capacity | /icu/capacity | shift_*, staff_assignment | staffed nurse hours ÷ required | Rate | Available |
| kpi_icu_staffing_gap_hours | Staffing Gap | capacity | /icu/capacity | shift coverage ledger | required − staffed hours | Hours | Available |
| kpi_icu_pt_nurse_ratio | Pt:Nurse Ratio | capacity | /icu/capacity | occupied, nurses on duty | occupied ÷ nurses (descriptive) | Ratio | Available |
| kpi_icu_vent_patient_days | Vent Patient Days | equipment | /icu/equipment | device_assignment_*, equipment_type | Patient-days with assigned vent | Patient-days | Available |
| kpi_icu_vent_utilization | Vent Utilization | equipment | /icu/equipment | assignment hours, eligible serviceable hours | assigned ÷ eligible | Rate | Available |
| kpi_icu_available_vents | Available Vents | equipment | /icu/equipment | equipment_state=available | Count unassigned serviceable | Devices | Available |
| kpi_icu_equipment_downtime | Equip Downtime | equipment | /icu/equipment | maintenance_* | Maintenance + prep hours | Hours | Available |
| kpi_icu_equipment_readiness | Equip Readiness | equipment | /icu/equipment | equipment_state snapshot | (in_use + available) ÷ inventory | Rate | Available |
| kpi_icu_readmission_rate | Readmission Rate | quality | /icu/quality | icu_stay pairs within 48h, discharges | readmits ÷ discharges | Rate | Available |
| kpi_icu_unplanned_transfer_rate | Unplanned Transfer | quality | /icu/quality | unplanned returns, step-down exits | returns ÷ step-downs | Rate | Available |
| kpi_icu_safety_review_backlog | Review Backlog | quality | /icu/quality | safety_event open reviews | Count open reviews | Reviews | Partially Available |
| kpi_icu_surveillance_completeness | Surveillance Complete | quality | /icu/quality | device_days, documented device-days | documented ÷ eligible | Rate | Scenario Only — not validated infection rate |
| kpi_icu_review_timeliness | Review Timeliness | quality | /icu/quality | closed reviews, target window | timely closed ÷ closed | Rate | Partially Available |
| kpi_icu_recoverable_bed_hours | Recoverable Hours | optimization | /icu/optimization | exclusive delay drivers | Σ exclusive recoverable hours | Hours | Available (illustrative) |
| kpi_icu_feasible_capacity | Feasible Capacity | optimization | /icu/optimization | recoverable hours, demand, staffed, vents | min(hours÷LOS, demand, staffed/vent caps) | Admissions | Available (illustrative) |
| kpi_icu_avoidable_transfer_delay | Avoidable Delay | optimization | /icu/optimization | transfer delay coordination share | Coordination-related hours | Hours | Scenario Only |
| kpi_icu_staff_constrained | Staff Constrained | optimization | /icu/optimization | unstaffed physical × hours | Physical hours unavailable due to staffing | Hours | Available |

## Chart ownership registry

| Screen | Charts (unique titles) |
|---|---|
| Command `/icu` | ICU Admissions & Discharges Trend; ICU Patient Census Trend; ICU Activity by Unit; Admission Sources; Discharge Destinations; ICU Demand Pattern |
| Flow `/icu/flow` | Admission Wait Trend; Admission Delays by Source; ICU LOS Distribution; Transfer Delay Reasons; Discharge Readiness vs Actual Exit; ICU Flow Bottlenecks |
| Capacity `/icu/capacity` | Staffed vs Physical Beds; Coverage by Shift; Nursing Workload Trend; Capacity Loss by Driver; Bed Availability by ICU Unit; Staffing Gaps by Shift |
| Equipment `/icu/equipment` | Ventilator Demand Trend; Ventilator Availability; Equipment Downtime by Cause; Device Utilization by ICU Unit; Equipment Readiness by Category; Equipment Capacity Constraints |
| Quality `/icu/quality` | ICU Readmission Trend; Safety Event Categories; Review Backlog Aging; Device-Day Documentation Coverage; ICU Infection Surveillance Trend; Quality Indicators by ICU Unit |
| Optimization `/icu/optimization` | Recoverable Capacity by Driver; Current vs Scenario Capacity; Flow Improvement Opportunities; Staffed Capacity Constraints; Transfer Delay Reduction |

## Cross-domain non-ownership

ICU does **not** own Bed Occupancy, ED Visit Volume, OR Utilization, Lab TAT, Medication Orders, or other Domains 1–9 headlines. Those may appear only as Assist/alert context, never as ICU ribbon KPIs.
