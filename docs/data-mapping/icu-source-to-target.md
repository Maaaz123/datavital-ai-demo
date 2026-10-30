# ICU Source-to-Target Mapping

**Target:** DataVital AI ICU canonical model (`buildIcuView`) — `v71-icu`  
**Note:** Source table/column names are **expected patterns**, not verified customer schemas.  
**Model change:** Full-year daily census ledger is simulated once; quarters slice the same day and device-hour facts. Patient-days = Σ midnight closing occupancy. Ventilator utilization uses serviceable hours (In Use + Available). Downtime sums non-overlapping maintenance/prep intervals.

| Source system | Expected object | Expected column (illustrative) | Target canonical | Transform | Load rule |
|---|---|---|---|---|---|
| HIS / EHR | encounter | encounter_id | encounter_id | Direct | Required |
| HIS / EHR | patient | hashed_id | patient_pseudonym_id | Hash / tokenize | Reject identifiable MRN in demo |
| ADT / Patient Movement | location_event | arrived_at | icu_arrived_at | Filter location_type=ICU | Start of stay |
| ADT / Patient Movement | location_event | departed_at | icu_departed_at | Filter location_type=ICU | End of stay |
| ADT / Patient Movement | transfer | disposition | departure_disposition | Map exclusive classes | Deaths separate from discharges |
| Bed Management | bed_request | requested_at | admission_requested_at | UTC | Admission wait numerator start |
| Bed Management | bed_request | approved_at | admission_approved_at | UTC | Optional stage |
| Bed Management | bed_assignment | assigned_at | bed_assigned_at | UTC | Optional stage |
| Bed Management | bed | bed_id | bed_id | Direct | PK |
| Bed Management | bed_status | status | bed_status | Enum map | Snapshot exclusive |
| Bed Management | bed_capacity | is_staffed | staffed_bed_flag | Boolean | Staffed ≤ physical |
| ICU CIS | readiness_event | transfer_ready_at | transfer_ready_at | Synthetic flag only | Scenario / conditional |
| ICU CIS | readiness_event | discharge_ready_at | discharge_ready_at | Synthetic flag only | Scenario / conditional |
| ICU CIS | unit_master | unit_code | icu_unit_id | Normalize | Required |
| Nurse Rostering / HR | shift | shift_id / start / end | shift_id, shift_start_at, shift_end_at | Window hours | Reconcile by shift |
| Nurse Rostering / HR | assignment | role_code | staff_role_id | Taxonomy | Competency constraint |
| CMMS / Biomedical | asset | asset_id / type | equipment_id, equipment_type | Active inventory | Exclude retired |
| CMMS / Biomedical | asset_status | state | equipment_state | Snapshot enum | Sum = inventory |
| CMMS / Biomedical | work_order | start/end | maintenance_* | Exclusive vs assignment | Downtime ledger |
| ICU CIS / CMMS | device_assignment | start/end | device_assignment_* | One device → one stay | No overlap |
| Quality / Incident Mgmt | incident | event_id | safety_event_id | Process events | Not certified harm |
| Infection Prevention | surveillance | classification / date / device_days | surveillance_* , device_days | Completeness only | Validated rates unavailable without full definition |
| Finance (future) | cost_ledger | staffing_cost, bed_day_cost, … | optional financial fields | Pass-through | **Not used in ICU KPIs** |

## Target views powered by the same facts

| Consumer | Source of truth |
|---|---|
| Six ICU screens | `buildIcuView(hospital, year, period)` |
| Alerts | Shared view values + thresholds |
| Vital Assist | Shared view + alert context |
| What-if | Shared view baselines |
| Management Decide | Assist / what-if payloads |
| Catalog bind (`kpi_icu_*`) | Shared year view |

## Readiness summary

| State | Meaning | ICU handling |
|---|---|---|
| Available | Mandatory fields present in demo model | Production-ready for demo KPIs |
| Partially Available | Optional stage clocks | Stage omitted without inventing facts |
| Missing | Mandatory absent | Do not mark KPI production-ready |
| Scenario Only | Synthetic readiness / surveillance completeness / future finance | Labeled illustrative; no validated infection rates |
