# Patient Experience Data Readiness

**Domain:** Domain 11 — Patient Experience & Satisfaction Intelligence  
**Release:** `v1-px`  
**Rule:** Demo Available ≠ Production Source Verified.  
**Instrument:** `DV-PX-Internal-v1` — official HCAHPS / CAHPS benchmarking is **unavailable**.

This readiness note is production-honest: every Domain 11 headline KPI is constructible in the synthetic demo ledger (`buildPxView`). **No** field or KPI in this release is classified Production Source Verified.

## Readiness legend

| State | Meaning |
|---|---|
| Demo Available | Present in the synthetic demo model and used by screens / Assist / alerts / what-if |
| Partially Mapped | Expected source pattern known; real integration incomplete or optional stage clocks missing |
| Missing | Needed for production or for the future profitability domain; not available |
| Scenario Only | Explicitly illustrative (safety flags, improvement actions, what-if uplifts) |
| Production Source Verified | Real hospital feed confirmed — **not used anywhere in Domain 11 demo** |

---

## Field / capability matrix

| Canonical field / capability | Demo | Production | Impact if missing in real integration |
|---|---|---|---|
| hospital_id, calendar_period_id | Demo Available | Missing | All PX filters / period KPIs blocked |
| department_id, service_line_id | Demo Available | Missing | Department comparison & coverage KPIs blocked |
| encounter_id, patient_pseudonym_id | Demo Available | Missing | Invitation eligibility & privacy-safe joins blocked |
| survey_instrument_id / version + questions | Demo Available | Missing | Scores unlabeled; cannot claim instrument lineage |
| survey_invitation_id + survey_sent_at | Demo Available | Missing | Response rate denominator unavailable |
| survey_response_id + response_at + response_value (0–10) | Demo Available | Missing | Satisfaction / recommendation / dimension KPIs unavailable |
| Duplicate-completion handling | Demo Available | Missing | Inflated response rates if raw completions used |
| survey_mode | Partially Mapped | Missing | Channel mix omitted |
| care_setting | Demo Available | Missing | Setting charts degrade to unknown |
| touchpoint_id / touchpoint_type + journey join | Demo Available | Missing | Touchpoint KPIs unavailable; unlinked responses still retained |
| complaint_id + received/status/category ledger | Demo Available | Missing | Complaint screens / ledger identity fail |
| complaint_resolved_at / closed_at / reopened_at | Demo Available | Missing | Median resolution, reopen, aging incomplete |
| complaint_acknowledged_at, complaint_priority, assigned_team_id | Partially Mapped | Missing | Ack SLA / assignment queues incomplete |
| comment_id / text / language (synthetic EN/AR) | Demo Available | Missing | Voice KPIs unavailable |
| sentiment_label + sentiment_confidence + theme_* + review_status | Demo Available | Missing | Polarity / emerging themes / review coverage unavailable |
| safety_flag | Scenario Only | Missing | High-priority routing remains illustrative |
| action_id / action_owner_id / action_status | Scenario Only | Missing | Optimization & what-if remain illustrative |
| Official HCAHPS / CAHPS / CMS-star feed | Missing | Missing | Keep officialBenchmarking=`unavailable`; do not invent |
| resource_id, cost_center_id (future profitability) | Missing | Missing | Documented hooks only — Domain 11 does not build finance |

---

## KPI production-readiness

All **33** `kpi_px_*` headline KPIs are **Demo Available** in the public scenario.

- **None** are Production Source Verified.
- **Scenario Only dependencies:** Addressable Gap target, improvement opportunities, modeled uplift, complaint-reduction potential, priority action coverage, and all six `px-*` what-if intents.
- **Partially Mapped dependencies:** acknowledgment clocks, assignment team, survey mode, complaint priority — omitted without inventing facts when absent.
- **HCAHPS boundary:** Internal instrument scores must not be labeled or compared as official HCAHPS top-box / star ratings.

---

## Survey, complaint, voice, privacy gates

| Gate | Ready when | Fail-closed behavior |
|---|---|---|
| Response rate | Invitation + eligible completion ledgers reconcile | Do not use raw completion ÷ invitation without dedupe |
| Scoring | Instrument version + scale documented | Quarantine mixed-scale silent averages |
| Complaint ledger | Identity equation balances | Do not publish open stock if unbalanced |
| Resolution | Received→resolved timestamps finite | Exclude undated closes from median |
| Sentiment | Confidence + review status present | Route uncertain / safety-flagged to human review |
| Privacy | Pseudonym only; synthetic comments in demo | Block identifiable MRN / contact / real quotes |
| Cross-domain | Journey join success measured | Retain unlinked responses; no fabricated joins |
| Future finance | resource_id / cost_center_id optional | Never invent revenue from satisfaction |

---

## Future Healthcare Resource, Profitability & Expansion Intelligence

**Do not build that domain now.**

Retain canonical links for later association work:

- `hospital_id`
- `department_id`
- `service_line_id`
- `encounter_id`
- `calendar_period_id`
- `resource_id`
- `cost_center_id`

Documentable future associations (satisfaction ↔ service quality ↔ capacity ↔ utilization ↔ complaint-handling effort ↔ cost of service recovery ↔ revenue retention) must **not** fabricate financial benefits from patient satisfaction changes, and must **not** appear as profitability dashboards inside Patient Experience.

---

## Traceability checklist

| Consumer | Traceable to shared view? |
|---|---|
| Six PX screens | Yes — `buildPxView` |
| Alerts (`kpi_px_*`) | Yes — shared thresholds |
| Vital Assist | Yes — `answerPx` / shared view |
| Six What-if scenarios | Yes — `px-*` intents |
| Data dictionary CSV/JSON | Yes — proposed canonical fields |
| Source-to-target map | Yes — expected patterns only |
| KPI lineage | Yes — one owner screen per KPI ID |
