# ICU & Critical Care — Data Dictionary

**Domain:** Domain 10 — ICU & Critical Care Intelligence  
**Status:** Implementation-ready canonical model for the synthetic demo  
**Scope:** Expected source-system fields → DataVital canonical columns  
**Privacy:** Demo uses synthetic, deterministic, non-identifiable records only  

Canonical names below are **proposed DataVital columns**, not verified customer HIS/EHR schema names.

---

## 1. Entities

| Entity | Grain | Primary key | Parent / FKs |
|---|---|---|---|
| Hospital | Facility | `hospital_id` | — |
| ICU Unit | Unit within hospital | `icu_unit_id` | `hospital_id` |
| Bed | Physical ICU bed | `bed_id` | `icu_unit_id`, `hospital_id` |
| ICU Stay | One continuous ICU episode | `icu_stay_id` | `encounter_id`, `patient_pseudonym_id`, `icu_unit_id`, `bed_id` |
| Admission Request | Request for ICU bed | `admission_request_id` | `encounter_id`, `icu_unit_id` |
| Transfer Request | Pending/completed ICU transfer | `transfer_request_id` | `icu_stay_id` / `encounter_id` |
| Physical Transfer Event | Actual move timestamp | `physical_transfer_event_id` | `transfer_request_id` |
| Discharge Readiness Event | Synthetic clinical-ready flag | `discharge_readiness_event_id` | `icu_stay_id` |
| ICU Discharge Event | Actual ICU departure | `icu_discharge_event_id` | `icu_stay_id` |
| Shift | Named coverage window | `shift_id` | `hospital_id`, `icu_unit_id` |
| Staff Assignment | Person × shift × role | `staff_assignment_id` | `shift_id`, `staff_role_id` |
| Clinical Staff Role | Role / competency class | `staff_role_id` | — |
| Equipment | Device inventory item | `equipment_id` | `hospital_id`, `resource_id` |
| Device Assignment | Equipment × stay interval | `device_assignment_id` | `equipment_id`, `icu_stay_id` |
| Maintenance Event | Downtime interval | `maintenance_event_id` | `equipment_id` |
| Quality Review Event | Safety / process review | `safety_event_id` | `hospital_id`, `icu_unit_id` |
| Infection Surveillance Event | Illustrative documentation row | `surveillance_event_id` | `icu_stay_id` (optional) |
| Calendar Period | Reporting bucket | `calendar_period_id` | — |

Future strategic hooks (optional, unused in ICU screens): `service_line_id`, `cost_center_id`, `resource_id`, `staffing_cost`, `bed_day_cost`, `equipment_maintenance_cost`, `resource_hour_cost`, `service_revenue_event_id`.

---

## 2. Canonical field catalog

| Canonical column | Type | Source system (expected) | Expected table / API | Expected source column (illustrative) | Event grain | Required | Business definition | Example | Transformation | DQ rule | Related KPIs | Related charts | History | Refresh | Privacy | Missing-data behavior | Readiness |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| hospital_id | string | HIS / ADT | facility / org API | facility_code | facility | Required | Stable hospital key | H1 | Map site code → hospital_id | Must be in {H1…H5} for demo | all | all | ≥3 years | Daily | Internal | Block hospital filter | Available |
| icu_unit_id | string | ICU CIS / Bed Mgmt | unit master | unit_code | unit | Required | ICU unit identity | MICU | Normalize unit codes | One unit per stay | unit KPIs | Activity by Unit | ≥3 years | Daily | Internal | Aggregate hospital-only | Available |
| icu_stay_id | string | ADT / ICU CIS | icu_stay / encounter_loc | stay_id | stay | Required | One ICU episode | ICU-H1-2026-00412 | Generate from location history | Unique; closed or open | LOS, census | LOS Distribution | ≥3 years | Near-real-time | Pseudonym | Exclude incomplete clocks | Available |
| encounter_id | string | HIS / EHR | encounter | encounter_id | encounter | Required | Parent encounter | ENC-99821 | Join stay→encounter | Must resolve | cross-domain | — | ≥3 years | Near-real-time | Pseudonym | Drop orphan stays | Available |
| patient_pseudonym_id | string | HIS | patient | hashed_id | patient | Required | Non-identifying patient key | P-7f3a… | Hash; never store MRN in demo | No real PHI | readmit | — | ≥3 years | Daily | Pseudonym | Block if identifiable | Available |
| admission_requested_at | timestamp | Bed Mgmt / ADT | bed_request | requested_at | request | Required | ICU bed requested | 2026-03-12T08:14:00Z | UTC normalize | ≤ approved_at ≤ arrived_at | Admission Wait, Boarding | Wait Trend | ≥2 years | Near-real-time | Operational | Mark wait unavailable | Available |
| admission_approved_at | timestamp | Bed Mgmt | bed_request | approved_at | request | Conditional | Clinical/ops approval | 2026-03-12T08:40:00Z | UTC | ≥ requested | Delayed Admissions | Delays by Source | ≥2 years | Near-real-time | Operational | Skip approval stage | Partially Available |
| icu_arrived_at | timestamp | ADT | location_event | arrived_at | stay start | Required | Physical ICU arrival | 2026-03-12T09:05:00Z | UTC | Starts LOS clock | LOS, census | Admissions Trend | ≥3 years | Near-real-time | Operational | Exclude from completed LOS | Available |
| bed_assigned_at | timestamp | Bed Mgmt | bed_assignment | assigned_at | assignment | Optional | Bed assigned (may precede arrival) | 2026-03-12T08:55:00Z | UTC | Between approve and arrive | Flow Assist | Flow Bottlenecks | ≥2 years | Near-real-time | Operational | Stage omitted | Partially Available |
| transfer_ready_at | timestamp | ICU CIS | readiness | transfer_ready_at | readiness | Conditional | Synthetic transfer-ready flag | 2026-03-15T11:00:00Z | Explicit synthetic basis only | ≤ departed | Transfer Delay | Transfer Delay Reasons | ≥2 years | Daily | Operational | Label delay unavailable | Scenario Only |
| discharge_ready_at | timestamp | ICU CIS | readiness | discharge_ready_at | readiness | Conditional | Synthetic discharge-ready flag | 2026-03-16T09:00:00Z | Explicit synthetic basis only | ≤ departed | Ready Delay | Ready vs Exit | ≥2 years | Daily | Operational | Label delay unavailable | Scenario Only |
| icu_departed_at | timestamp | ADT | location_event | departed_at | stay end | Required for closed | Physical ICU departure | 2026-03-16T14:20:00Z | UTC; ends LOS | ≥ arrived | Discharges, LOS | Destinations | ≥3 years | Near-real-time | Operational | Open stay → census only | Available |
| departure_disposition | enum | ADT | discharge / transfer | disposition | exit | Required for closed | Mutually exclusive exit class | step_down \| ward \| death \| external | Map to exclusive buckets | Deaths not double-counted as discharges | Discharges, Deaths | Destinations | ≥3 years | Daily | Operational | Quarantine ambiguous | Available |
| bed_id | string | Bed Mgmt | bed | bed_id | bed | Required | Physical bed identity | ICU-12 | Join assignments | Unique per hospital | Capacity | Staffed vs Physical | ≥3 years | Daily | Internal | Aggregate unit | Available |
| bed_status | enum | Bed Mgmt | bed_status | status | snapshot | Required | occupied / available / blocked / unstaffed / other | occupied | Snapshot at observation | Exclusive states | Available Staffed | Capacity Loss | 1 year snapshots | Hourly | Internal | Unknown → other | Available |
| staffed_bed_flag | boolean | Nurse Roster / Bed Mgmt | bed_capacity | is_staffed | snapshot | Required | Safely staffed for ICU care | true | Physical ≠ staffed | Staffed ≤ physical | Staffed Beds | Staffed vs Physical | ≥1 year | Shift | Internal | Assume unstaffed if missing | Available |
| physical_bed_flag | boolean | Bed Mgmt | bed | is_physical | bed | Required | Licensed/physical presence | true | Master data | ≥ staffed | Capacity method | — | Master | Daily | Internal | Fail readiness | Available |
| shift_id | string | Roster | shift | shift_id | shift | Required | Day / Evening / Night (or local) | night-2026-03-12 | Calendar join | Non-overlap per unit | Coverage, Gap | Coverage by Shift | ≥1 year | Shift | Internal | Aggregate day | Available |
| staff_role_id | string | HR / Roster | role | role_code | role | Required | Clinical staff role / competency | ICU_RN | Role taxonomy | Competency constraints | Pt:Nurse, Coverage | Staffing Gaps | ≥1 year | Shift | Internal | Role unknown → exclude reallocation | Available |
| shift_start_at / shift_end_at | timestamp | Roster | shift | start/end | shift | Required | Shift window | 19:00–07:00 | Duration hours | End > start | Staffing Gap Hours | Coverage by Shift | ≥1 year | Shift | Internal | Drop invalid | Available |
| equipment_id | string | CMMS | asset | asset_id | device | Required | Ventilator / critical device | VENT-014 | Asset master | Active inventory | Vent KPIs | Vent Availability | ≥2 years | Daily | Internal | Exclude retired | Available |
| equipment_type | enum | CMMS | asset | type | device | Required | Device class (not interchangeable) | adult_vent | Taxonomy | Type-specific util | Vent Utilization | Device by Unit | Master | Daily | Internal | Unknown type → separate | Available |
| device_assignment_start_at / end_at | timestamp | ICU CIS / CMMS | assignment | start/end | assignment | Required when assigned | Non-overlapping assignment | 2026-03-12T10:00Z | One vent → one patient | No overlap | Vent Patient Days | Demand Trend | ≥2 years | Near-real-time | Operational | Incomplete → exclude hours | Available |
| maintenance_start_at / end_at | timestamp | CMMS | work_order | start/end | downtime | Required for downtime | Maintenance / prep / parts wait | 2026-03-01T00:00Z | Mutually exclusive vs assigned | No overlap with assigned | Equip Downtime | Downtime by Cause | ≥2 years | Daily | Internal | Orphan WO → DQ fail | Available |
| equipment_state | enum | CMMS | asset_status | state | snapshot | Required | available / in_use / maintenance / prep / unavailable / retired | available | Snapshot identity | Sum = active inventory | Available Vents, Readiness | Vent Availability | 1 year | Hourly | Internal | Unknown → unavailable | Available |
| safety_event_id | string | QIMS | incident | event_id | event | Required for quality | Process / review event | SE-4412 | Incident master | Not = validated harm | Review Backlog | Safety Categories | ≥2 years | Daily | Sensitive ops | Incomplete → backlog only | Partially Available |
| surveillance_event_classification | enum | Infection Prevention | surveillance | class | event | Conditional | Recorded / suspected / validated / unavailable | recorded_process | Do not invent validated rates | Validated requires device-days | Surveillance Completeness | Infection Surveillance Trend | ≥2 years | Daily | Sensitive | Label KPI illustrative | Scenario Only |
| surveillance_event_date | date | Infection Prevention | surveillance | event_date | event | Conditional | Surveillance documentation date | 2026-03-10 | Period filter | Within stay/device window | Completeness | Surveillance Trend | ≥2 years | Daily | Sensitive | Exclude undated | Scenario Only |
| device_days | number | ICU CIS / IP | device_day_ledger | device_days | stay-day | Conditional | Eligible device-days denominator | 12 | Document counting convention | ≥ documented days | Completeness | Device-Day Coverage | ≥2 years | Daily | Operational | Completeness unavailable | Scenario Only |
| calendar_period_id | string | — | calendar | period_id | period | Required | year / Qn | 2026-Q1 | Filter join | Consistent rollups | all period KPIs | Trends | Master | Static | Internal | Default year | Available |
| service_line_id | string | Finance / Ops | service_line | id | optional | Optional | Future resource domain | SL-CRITICAL | Pass-through | — | future | — | Master | Daily | Internal | Ignore in ICU UI | Scenario Only |
| cost_center_id | string | Finance | cost_center | id | optional | Optional | Future cost join | CC-ICU-01 | Pass-through | — | future | — | Master | Daily | Internal | Ignore | Scenario Only |

---

## 3. Census movement ledger fields

| Field | Definition |
|---|---|
| opening_census | ICU patients present at period start |
| admissions_from_outside | Arrivals from outside ICU (not internal ICU transfers) |
| transfers_in | Transfers into this ICU unit from another ICU/context counted distinctly |
| discharges | Non-death departures from ICU |
| transfers_out | Transfers leaving ICU to another unit/facility (non-death) |
| deaths_departing_icu | Deaths departing ICU — exclusive of discharges |
| closing_census | opening + admissions + transfers_in − discharges − transfers_out − deaths |

Patient-days use midnight census convention: Σ ((opening + closing) ÷ 2 × days in month), rolled forward so month-end closing = next opening. Annual average census = patient-days ÷ days — **not** the average of monthly averages.

---

## 4. LOS clock

`icu_departed_at − icu_arrived_at` for **completed** stays only. Open stays contribute to census and occupied bed time, not completed LOS. Headline uses median; distribution and P90 are supporting.

---

## 5. Capacity & equipment identities

Physical beds = staffed + unstaffed + other unavailable physical.  
Staffed bed hours = occupied + available + blocked (exclusive).  
Ventilator active inventory = in_use + available + maintenance + prep (+ explicit unavailable).  
One ventilator may not be assigned to multiple concurrent patients.

---

## 6. Quality / safety

Infection surveillance completeness is **illustrative documentation coverage**. CLABSI / CAUTI / VAE validated rates are **not** produced without surveillance classification and device-day denominators. Safety-event counts are process events, not certified harm incidence.

---

## 7. Machine-readable companions

- `docs/data-dictionary/icu-data-dictionary.csv`
- `docs/data-dictionary/icu-data-dictionary.json`
- `docs/data-mapping/icu-source-to-target.md`
- `docs/kpi-lineage/icu-kpi-lineage.md`
