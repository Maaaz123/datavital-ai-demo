# Patient Experience KPI Lineage

Each primary KPI has exactly one owning screen (`patientExperienceOwnership.ts`). Transformations run inside `buildPxView` and bind via `pxMapped` in `bind.ts`.

| KPI ID | Display | Owner screen | Route | Required fields | Transformation | Denominator / grain | Readiness |
|---|---|---|---|---|---|---|---|
| kpi_px_overall_satisfaction | Overall Satisfaction | command | /patient-experience | response_value on Q_OVERALL, survey_instrument_*, survey_response_id | Σ overall ratings ÷ eligible overall answers (0–10) | Eligible overall answers | Demo Available |
| kpi_px_response_rate | Response Rate | command | /patient-experience | survey_invitation_id, eligible survey_response_id | eligibleCompleted ÷ eligibleInvitations | Invitations | Demo Available |
| kpi_px_positive_share | Positive Share | command | /patient-experience | response_value (overall) | Top-box (9–10) ÷ eligible overall | Eligible overall | Demo Available |
| kpi_px_negative_share | Negative Share | command | /patient-experience | response_value (overall) | Bottom-box (0–6) ÷ eligible overall | Eligible overall | Demo Available |
| kpi_px_recommendation | Recommendation | command | /patient-experience | Q_RECOMMEND response_value | (% promoters 9–10 − % detractors 0–6) × 100 | Recommendation answers | Demo Available |
| kpi_px_unresolved_issues | Unresolved Issues | command | /patient-experience | complaint_status open, classification_review_status / safety_flag | Open complaints + high-priority unreviewed comments | Issues at observation | Demo Available |
| kpi_px_journey_satisfaction | Journey Satisfaction | journey | /patient-experience/journey | linked touchpoint / dimension scores | Mean of linked journey dimension scores | Linked responses | Demo Available |
| kpi_px_waiting_score | Waiting Score | journey | /patient-experience/journey | Q_WAITING response_value | Mean waiting-dimension score (0–10) | Eligible waiting answers | Demo Available |
| kpi_px_communication_score | Communication | journey | /patient-experience/journey | Q_COMMUNICATION | Mean communication score | Eligible answers | Demo Available |
| kpi_px_coordination_score | Coordination | journey | /patient-experience/journey | Q_COORDINATION | Mean coordination score | Eligible answers | Demo Available |
| kpi_px_discharge_score | Discharge Exp. | journey | /patient-experience/journey | Q_DISCHARGE | Mean discharge score for eligible discharge answers | Eligible discharge answers | Demo Available |
| kpi_px_negative_touchpoint_share | Neg. Touchpoints | journey | /patient-experience/journey | touchpoint_id, response_value ≤6 | Negative linked ratings ÷ linked touchpoint ratings | Linked touchpoint ratings | Demo Available |
| kpi_px_complaints_total | Total Complaints | complaints | /patient-experience/complaints | complaint_id, complaint_received_at | Count new complaints in period | Complaints | Demo Available |
| kpi_px_complaints_open | Open Complaints | complaints | /patient-experience/complaints | complaint_status ledger | Closing open stock from ledger identity | Open cases | Demo Available |
| kpi_px_median_resolution | Median Resolution | complaints | /patient-experience/complaints | complaint_received_at, complaint_resolved_at | Median days received→resolved | Closed resolutions | Demo Available |
| kpi_px_overdue_complaints | Overdue | complaints | /patient-experience/complaints | open stock, resolution target | Open cases past illustrative target | Open complaints | Demo Available |
| kpi_px_first_contact_resolution | First-Contact Res. | complaints | /patient-experience/complaints | closed without reopen | Closed without reopen ÷ closed | Closed complaints | Demo Available |
| kpi_px_reopen_rate | Reopen Rate | complaints | /patient-experience/complaints | complaint_reopened_at, closed stock | Reopened ÷ previously closed basis | Rate | Demo Available |
| kpi_px_comments_analyzed | Comments Analyzed | voice | /patient-experience/voice | comment_id | Count classified free-text comments | Comments | Demo Available |
| kpi_px_negative_feedback_share | Negative Feedback | voice | /patient-experience/voice | sentiment_label | Negative ÷ analyzed comments | Comments | Demo Available |
| kpi_px_emerging_themes | Emerging Themes | voice | /patient-experience/voice | theme_*, sentiment_label | Rising negative themes vs baseline | Themes | Demo Available |
| kpi_px_high_priority_feedback | High-Priority | voice | /patient-experience/voice | safety_flag, classification_review_status | Safety / pending human review count | Comments | Demo Available / Scenario Only (safety_flag) |
| kpi_px_theme_review_coverage | Theme Review | voice | /patient-experience/voice | classification_review_status | Human-reviewed ÷ analyzed | Comments | Demo Available |
| kpi_px_depts_meeting_target | Meeting Target | departments | /patient-experience/departments | department_id, scores, min sample | Count depts with score ≥ target and adequate sample | Departments | Demo Available |
| kpi_px_lowest_dimension | Lowest Dimension | departments | /patient-experience/departments | dimension means | Lowest scored dimension mean | Dimensions | Demo Available |
| kpi_px_coverage_gap | Coverage Gap | departments | /patient-experience/departments | department responses vs PX_MIN_DEPT_SAMPLE | Count below minimum sample | Departments | Demo Available |
| kpi_px_material_variance | Material Variance | departments | /patient-experience/departments | adequate-sample department scores | Max − min overall among adequate samples | Points | Demo Available |
| kpi_px_depts_requiring_review | Need Review | departments | /patient-experience/departments | score/target, negative share, sample | Below target or rising negative with adequate sample | Departments | Demo Available |
| kpi_px_addressable_gap | Addressable Gap | optimization | /patient-experience/optimization | overall vs PX_OVERALL_TARGET | max(0, target − overall) | Points | Scenario Only (illustrative target) |
| kpi_px_improvement_opportunities | Opportunities | optimization | /patient-experience/optimization | action_id catalog | Count eligible opportunity themes | Actions | Scenario Only |
| kpi_px_modeled_uplift | Modeled Uplift | optimization | /patient-experience/optimization | action assumptions | Constrained illustrative overall points | Points | Scenario Only |
| kpi_px_complaint_reduction | Complaint Potential | optimization | /patient-experience/optimization | eligible preventable share | Σ opportunity complaint reductions | Complaints | Scenario Only |
| kpi_px_priority_coverage | Action Coverage | optimization | /patient-experience/optimization | action_owner_id on priority actions | Priority with owner ÷ priority opportunities | Rate | Scenario Only |

## Chart ownership registry

| Screen | Charts (unique titles) |
|---|---|
| Command `/patient-experience` | Patient Experience Trend; Satisfaction by Care Setting; Experience Dimension Performance; Survey Responses Trend; Patient Experience Distribution; Priority Experience Signals |
| Journey `/patient-experience/journey` | Patient Journey Experience Map; Satisfaction by Touchpoint; Experience by Service Setting; Waiting vs Reported Experience; Communication Experience; Discharge Journey Feedback |
| Complaints `/patient-experience/complaints` | Complaints Trend; Complaints by Category; Complaint Aging; Resolution Time Distribution; Complaint Status Breakdown; Escalation and Reopening Patterns |
| Voice `/patient-experience/voice` | Sentiment Trend; Feedback Themes; Top Positive Topics; Top Negative Topics; Theme Frequency by Department; Emerging Experience Issues |
| Departments `/patient-experience/departments` | Experience by Department; Experience by Service Line; Satisfaction Distribution; Response Coverage by Department; Experience Trends by Care Setting; Opportunity Matrix |
| Optimization `/patient-experience/optimization` | Improvement Opportunities; Current vs Scenario Experience; Complaint Reduction Potential; Experience Improvement by Touchpoint; Implementation Constraints |

## Cross-domain non-ownership

Patient Experience does **not** own ED Visit Volume, Bed Occupancy, Median Length of Stay, OR Utilization, Slot Fill Rate, Scanner Utilization, Imaging Backlog, Analyzer Utilization, Testing Backlog, Median Lab TAT, Medication Orders, Stockout SKUs, Median Access Wait, Appointment No-Show Rate, ICU Admissions, Staffed ICU Beds, or Median ICU Admission Wait. Those may appear only as Assist/alert **supporting context**, never as PX ribbon KPIs.

## What-if lineage (six intents)

| Intent | Prompt theme | Follow-up measures |
|---|---|---|
| px-wait-down | Waiting-time dissatisfaction ↓ | kpi_px_waiting_score, waiting complaints, overall |
| px-communication-up | Staff communication ↑ | kpi_px_communication_score |
| px-resolution-down | Complaint resolution time ↓ | kpi_px_median_resolution, overdue |
| px-discharge-up | Discharge communication ↑ | kpi_px_discharge_score |
| px-repeated-down | Repeated complaint categories ↓ | kpi_px_reopen_rate |
| px-touchpoint-up | Low-scoring touchpoints ↑ | kpi_px_negative_touchpoint_share |
