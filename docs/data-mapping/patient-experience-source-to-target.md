# Patient Experience Source-to-Target Mapping

**Target:** DataVital AI Patient Experience canonical model (`buildPxView`) — `v1-px`  
**Note:** Source table/column names are **expected patterns**, not verified customer schemas.  
**Model change:** Full-year invitation, complaint, and comment ledgers are simulated once; quarters slice the same day facts. Survey Response Rate = eligibleCompleted ÷ eligibleInvitations. Duplicate completions are discarded. Official HCAHPS benchmarking is **unavailable**.

| Source system | Expected object | Expected column (illustrative) | Target canonical | Transform | Load rule |
|---|---|---|---|---|---|
| HIS / EHR | encounter | encounter_id | encounter_id | Direct | Required for eligibility join when present |
| HIS / EHR | patient | hashed_id | patient_pseudonym_id | Hash / tokenize | Reject identifiable MRN in demo |
| HIS / Org Master | department | department_code | department_id | Normalize PX taxonomy | Required for department KPIs |
| Ops / Finance | service_line | service_line_code | service_line_id | Department → line map | Optional rollup |
| Survey Management | instrument | instrument_code / version | survey_instrument_id, survey_instrument_version | Map to DV-PX-Internal-v1 | Declare officialBenchmarking=unavailable |
| Survey Management | question | question_code / scale | survey_question_id, response_scale | Dimension taxonomy | Reject silent mixed-scale averages |
| Survey Management | invitation | invitation_id / sent_at / channel | survey_invitation_id, survey_sent_at, survey_mode | UTC; eligible population only | Denominator for response rate |
| Survey Management / Portal | response | response_id / submitted_at / language | survey_response_id, response_at, survey_language | First eligible completion per invitation | Discard duplicates from eligibleCompleted |
| Survey Management / Portal | answer | value | response_value | Clamp to 0–10 | Exclude out-of-range |
| Survey / Journey | touchpoint_rating | touchpoint_id / type | touchpoint_id, touchpoint_type | Only when join succeeds | Retain unlinked responses without fabricated joins |
| HIS / Survey meta | encounter / response | care_setting | care_setting | Exclusive setting buckets | Unknown → separate |
| Complaint / CRM / Patient Relations | complaint | case_id / received_at / status / category | complaint_id, complaint_received_at, complaint_status, complaint_category | Ledger identity | opening+new+reopened−closed−withdrawn=closing |
| Complaint Management | complaint | acknowledged_at / resolved_at / closed_at | complaint_acknowledged_at, complaint_resolved_at, complaint_closed_at | UTC clocks | Closed ≠ satisfied |
| Complaint Management | complaint_event | reopened_at | complaint_reopened_at | Count reopen events | Reopen rate basis |
| Complaint / HR | assignment | team_id / priority | assigned_team_id, complaint_priority | Optional | Unassigned backlog |
| Survey / Portal / Contact Center | comment | comment_id / text / language | comment_id, comment_text, comment_language | Demo: [SYNTHETIC] EN/AR only | No real patient quotes |
| NLP / Human review | comment_classification | sentiment / confidence / review_status / safety_flag | sentiment_label, sentiment_confidence, classification_review_status, safety_flag | Distinct fields; route safety to human | Never auto-dismiss complaints |
| NLP taxonomy | theme | theme_id / label | theme_id, theme_label | Canonical themes | Emerging = rising + negative |
| Experience Improvement Office | improvement_action | action_id / owner / status | action_id, action_owner_id, action_status | Scenario catalog | Impacts assumed — not guaranteed |
| Finance (future) | resource / cost_center | resource_id, cost_center_id | resource_id, cost_center_id | Pass-through | **Not used in PX KPIs**; future profitability domain only |

## Target views powered by the same facts

| Consumer | Source of truth |
|---|---|
| Six Patient Experience screens | `buildPxView(hospital, year, period)` |
| Alerts | Shared view values + thresholds (`kpi_px_*`) |
| Vital Assist | Shared view + alert context |
| What-if | Shared view baselines (`px-*` intents) |
| Management Decide | Assist / what-if payloads |
| Catalog bind (`kpi_px_*`) | Shared year view |

## Readiness summary

| State | Meaning | PX handling |
|---|---|---|
| Demo Available | Mandatory fields present in demo model | Production-honest demo KPIs — **not** Production Source Verified |
| Partially Mapped | Optional clocks / assignment / mode | Stage omitted without inventing facts |
| Missing | Future finance joins | Do not mark profitability KPIs; ignore in PX UI |
| Scenario Only | Safety flags, illustrative actions / what-ifs | Labeled illustrative; no HCAHPS claims |
| Production Source Verified | Real hospital feed confirmed | **None** for Domain 11 in this release |
