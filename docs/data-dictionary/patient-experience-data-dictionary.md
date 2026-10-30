# Patient Experience & Satisfaction — Data Dictionary

**Domain:** Domain 11 — Patient Experience & Satisfaction Intelligence  
**Release:** `v1-px`  
**Status:** Demo Available — not Production Source Verified  
**Scope:** Expected source-system fields → DataVital canonical columns  
**Privacy:** Demo uses synthetic, deterministic, non-identifiable survey/complaint/comment records only  

Canonical names below are **proposed DataVital columns**, not verified customer HIS/EHR/survey-vendor schema names.

## Data readiness legend

| State | Meaning |
|---|---|
| Demo Available | Present in `buildPxView` synthetic ledger |
| Production Source Verified | Confirmed mapped to a real hospital feed (**none yet — never claimed for this demo**) |
| Partially Mapped | Expected pattern known; integration incomplete |
| Missing | Required for production KPI or future domain; not available |
| Scenario Only | Explicitly synthetic assumption (e.g. safety flags, what-if actions) |

---

## 1. Entities

| Entity | Grain | Primary key | Parent / FKs |
|---|---|---|---|
| Hospital | Facility | `hospital_id` | — |
| Department | Service unit | `department_id` | `hospital_id` |
| Service Line | Rollup | `service_line_id` | `hospital_id` |
| Encounter | Care episode | `encounter_id` | `hospital_id`, `patient_pseudonym_id` |
| Survey Instrument | Instrument + version | `survey_instrument_id` + `survey_instrument_version` | — |
| Survey Question | Item on instrument | `survey_question_id` | `survey_instrument_id` |
| Survey Invitation | Eligible invite | `survey_invitation_id` | `survey_id`, `encounter_id`, `department_id` |
| Survey Response | Completion attempt | `survey_response_id` | `survey_invitation_id` |
| Touchpoint Rating | Linked journey rating | `touchpoint_id` | `survey_response_id`, `encounter_id` |
| Complaint | Service-recovery case | `complaint_id` | `hospital_id`, `department_id`, `encounter_id` |
| Comment | Free-text voice | `comment_id` | `survey_response_id`, `department_id` |
| Theme | Taxonomy | `theme_id` | — |
| Improvement Action | Illustrative opportunity | `action_id` | `hospital_id` |
| Calendar Period | Reporting bucket | `calendar_period_id` | — |

Future strategic hooks (optional, **unused in PX screens**): `resource_id`, `cost_center_id`, and associations among satisfaction ↔ capacity ↔ recovery effort ↔ revenue retention. Do **not** fabricate financial benefits from satisfaction changes. Do **not** build profitability dashboards inside Patient Experience.

---

## 2. Survey methodology (DV-PX-Internal-v1)

| Rule | Definition |
|---|---|
| Instrument | `DV-PX-Internal-v1` v1.0 — **internal** DataVital demo instrument |
| Official benchmarking | **unavailable** — not official HCAHPS / CAHPS; must not be compared as CMS-star or case-mix-adjusted public reporting |
| Scale | 0–10 for scored items |
| Eligible population | Discharged / completed encounters invited under the internal protocol |
| Grains | Invitations ≠ raw completions ≠ eligible completed ≠ question answers ≠ complaints ≠ free-text comments |
| Duplicates | Duplicate completions per invitation are excluded from `eligibleCompleted` (`completionsRaw ≥ eligibleCompleted`) |
| Response rate | `eligibleCompleted ÷ eligibleInvitations` (invitation-based) |
| Aggregation | Numerator/denominator means (`Σ scores ÷ count`). Do not average department or monthly percentages without weighting |
| Recommendation | Patient Recommendation Score = (% promoters 9–10 − % detractors 0–6) × 100 on `Q_RECOMMEND`. **Not** an official NPS product |
| Top / bottom box | Positive share = ratings 9–10; negative share = ratings 0–6 on overall |

Questions: `Q_OVERALL`, `Q_WAITING`, `Q_COMMUNICATION`, `Q_COORDINATION`, `Q_DISCHARGE`, `Q_RECOMMEND`.

---

## 3. Complaint ledger

Identity must hold for every period slice:

`openingOpen + new + reopened − closed − withdrawn = closingOpen`

| Rule | Definition |
|---|---|
| Closed ≠ satisfied | Administrative close is not proof of patient satisfaction |
| Resolution clocks | Median / P90 from `complaint_received_at` → `complaint_resolved_at` for closed resolutions |
| Overdue | Open cases past the illustrative resolution target (demo: 7 days; ack target 48h) |
| Reopen rate | Reopened events relative to previously closed stock |
| Safety | Safety-flagged narratives require authorized human review; AI does not close complaints alone |

---

## 4. Voice / sentiment safeguards

| Rule | Definition |
|---|---|
| Demo comments | Clearly labeled `[SYNTHETIC]` EN/AR templates only — never real patient quotes |
| Distinct fields | `sentiment_label`, `sentiment_confidence`, `theme_*`, `classification_review_status`, `safety_flag` |
| Uncertainty | Low confidence / safety cues route to `pending_review` |
| Misuse ban | Sentiment must not auto-dismiss complaints or punish clinical staff |
| Multilingual | EN/AR supported; product UI remains English |
| Privacy | Pseudonyms only; no MRN, contact info, or identifiable date+detail combinations in the public demo |

---

## 5. Journey linkage

`journeyLinkageCoverage = linkedJourney ÷ (linkedJourney + unlinkedJourney)` ∈ [0, 1].

Unlinked survey responses remain in aggregate survey totals **without fabricated operational joins**. Operational waits / LOS from Domains 1–10 are supporting context only — never PX headline ownership.

---

## 6. Canonical field catalog (summary)

Full machine-readable companions list every proposed field with source pattern, DQ rule, KPI/chart links, privacy, and readiness.

Representative required fields:

| Canonical column | Type | Readiness | Notes |
|---|---|---|---|
| hospital_id | string | Demo Available | Filter + future profitability hook |
| department_id | string | Demo Available | Comparable experience |
| encounter_id | string | Demo Available | Invitation eligibility / journey join |
| patient_pseudonym_id | string | Demo Available | No real PHI |
| survey_instrument_id / version | string | Demo Available | DV-PX-Internal-v1; HCAHPS unavailable |
| survey_invitation_id | string | Demo Available | Response-rate denominator |
| survey_response_id | string | Demo Available | Deduped to eligibleCompleted |
| response_value / response_scale | number / string | Demo Available | 0–10 instrument |
| care_setting / touchpoint_* | enum / string | Demo Available | Journey when linked |
| complaint_id + lifecycle timestamps | string / timestamp | Demo Available | Ledger + resolution |
| comment_* + sentiment_* + theme_* | mixed | Demo Available | Synthetic voice pipeline |
| classification_review_status | enum | Demo Available | Human review coverage |
| safety_flag | boolean | Scenario Only | Human review routing |
| action_* | string / enum | Scenario Only | Illustrative what-if opportunities |
| resource_id / cost_center_id | string | Missing | Future profitability domain only |

---

## 7. Machine-readable companions

- `docs/data-dictionary/patient-experience-data-dictionary.csv`
- `docs/data-dictionary/patient-experience-data-dictionary.json`
- `docs/data-mapping/patient-experience-source-to-target.md`
- `docs/kpi-lineage/patient-experience-kpi-lineage.md`
- `docs/data-readiness/patient-experience-data-readiness.md`
