# Outpatient Department (OPD) — Final Acceptance

**Build:** `v57-opd-domain`  
**Public URL:** https://maaaz123.github.io/datavital-ai-demo/  
**Routes:** `/outpatient`, `/outpatient/flow`, `/outpatient/quality`

Emergency, Beds & Capacity, and Inpatient Care were not redesigned in this release.

## Dashboards completed

| Screen | Route | Purpose |
| --- | --- | --- |
| Outpatient Performance Overview | `/outpatient` | Demand, specialty mix, completion, session utilization |
| Clinic Waiting & Patient Flow | `/outpatient/flow` | Arrival-to-provider, cycle time, delay contribution |
| Outpatient Quality & Follow-up | `/outpatient/quality` | Documentation, referrals, follow-up coordination |

UI/UX reuses the approved CoreApp patterns (`gc-command`, `gc-ed`, `gc-ribbon`, `gc-ed-pack`, Investigate, Vital Assist).

## KPI inventory and definitions

### Overview

| KPI | Definition |
| --- | --- |
| Total Outpatient Visits | Attended clinic visits from the scenario appointment-attended cohort |
| Completed Consultations | Visits with a completed consultation |
| Unique Outpatients | Illustrative unique-patient count ≈ 62% of visits |
| New Patient Visits | Fixed new-visit share; New + Follow-up = Visits |
| Follow-up Visits | Remainder after new visits |
| Visit Completion Rate | Completed ÷ Visits |
| Walk-in Visit Share | Walk-in share of attended visits |
| Same-Day Visit Volume | Same-day visits inside the attended cohort |
| Clinic Session Utilization | Illustrative filled session capacity share |
| Visits per Clinic Session | Visits ÷ clinic sessions |

### Waiting & flow

| KPI | Definition |
| --- | --- |
| Median / P90 Arrival-to-Provider | Clinic arrival → first provider start (not ED wait, not consult duration) |
| Median / P90 Clinic Cycle Time | Waiting + consultation duration |
| Registration-to-Consultation | Post-registration share of arrival-to-provider |
| Consultation Duration | Illustrative consult length |
| Visits Exceeding Waiting Threshold | Visits above the 30-minute review line |
| On-Time Consultation Start Rate | Aligned with `kpi_clinic_on_time_start_rate` |
| Delayed Clinic Sessions | Sessions with delayed first-provider starts |
| Visits Completed Within Target Time | Visits finishing inside the cycle-time target |

### Quality & follow-up

| KPI | Definition |
| --- | --- |
| Consultation Completion Rate | Same as visit completion |
| Clinical Documentation / Note / Follow-up Plan rates | Illustrative documentation shares |
| Follow-up Recommendation Rate | Share of completed consultations with a recommendation |
| Referral Completion Rate | Completed ÷ recommended referrals |
| Pending Clinical Referrals | Open clinical referrals |
| Unplanned Outpatient Return Rate | Illustrative 2.8% scenario share (not patient-linked) |
| Outstanding Clinical Actions | Open post-visit actions |
| Follow-up Coordination Completion Rate | Illustrative coordination share |

Honest blanks: Appointment No-Show Rate and Slot Fill Rate remain outside OPD ownership.

## Chart inventory

**Overview:** Outpatient visits over time · Visits by specialty · New vs follow-up · Clinic activity by day · Completed vs incomplete (shares %) · Session utilization by specialty  

**Waiting:** Waiting time trend · Waiting by specialty · Arrival demand by hour · Consultation starts by hour · Waiting distribution · Cycle time by specialty · Patient flow stage volumes · Delay contribution by clinic  

**Quality:** Documentation trend · Follow-up recommendations by specialty · Referral status · Pending actions by specialty · Consultation outcomes (shares %) · Follow-up coordination trend  

## Synthetic scenario reconciliation (H1 · Full year 2026)

Verified by `frontend/src/core/opd-final.test.tsx`:

- New + Follow-up = Visits
- Completed + Incomplete = Visits
- Specialty visit shares sum to Visits
- Specialty pending actions sum to Outstanding Clinical Actions
- Specialty delay contributions sum to Visits Exceeding Waiting Threshold
- Monthly visits sum to period Visits
- Weekday visits sum to period Visits
- Q1–Q4 visits sum to Full year Visits

On-time start rate is aligned with the showcase binder so cards, alerts, and Vital Assist use the same construction for that signal. Median/P90 waiting use scenario `opWait*` facts.

## Vital Assist examples

| Question | Evidence used |
| --- | --- |
| Which clinics have the longest waiting times? | Specialty wait bars, median/P90, threshold breaches |
| Why are consultations starting late? | On-time start rate, delayed sessions, starts-by-hour |
| Which specialties have the highest outpatient demand? | Visits by specialty, utilization |
| What is reducing visit completion? | Completion rate, incomplete share, documentation |
| Where are follow-up actions accumulating? | Outstanding actions by specialty, pending referrals |
| What should the OPD Director prioritize? | Open OPD alerts + follow-up backlog |
| What-if demand / wait / docs / referrals | Six illustrative sketches below |

Each answer includes issue, evidence, possible drivers (hypotheses), action, illustrative impact, owner, and follow-up KPI.

## Six what-if test results

| Scenario | Sketch outcome (illustrative) |
| --- | --- |
| Demand +15% | Extra attended visits; median wait rises if capacity unchanged |
| Median wait −20% | Lower arrival-to-provider; fewer threshold breaches |
| Consult duration −10% | Shorter consult; shorter cycle time (quality held constant by assumption) |
| Utilization +10 pts | Higher session fill; more visits subject to capacity |
| Incomplete documentation −25% | Higher documentation completion |
| Pending referrals −20% | Fewer open clinical referrals |

Assumptions are shown in Vital Assist. Not validated forecasts.

## Alert and decision tests

OPD alerts (hospital + year scoped):

- Prolonged clinic waiting time (`kpi_outpatient_median_wait_minutes`)
- High P90 clinic waiting (`kpi_outpatient_p90_wait_minutes`)
- Clinic session delay (`kpi_clinic_on_time_start_rate`)

Vital Assist supports Investigate → Forecast → Actions → Decide (approve / reject / defer) without changing the AI interface chrome.

## Screenshots

| Screen | File |
| --- | --- |
| Overview | `docs/visual-after/opd/01-overview.png` |
| Waiting & flow | `docs/visual-after/opd/02-waiting-flow.png` |
| Quality & follow-up | `docs/visual-after/opd/03-quality-followup.png` |

Captured from local production build preview at desktop width.

## Visual regression results

- KPI ribbon, pack rows, Investigate buttons, and alerts match approved ED/Beds/IPD composition
- Completed vs incomplete and consultation outcomes use **percentage shares** so smaller categories stay readable
- Patient flow stages are labeled as pathway subsets, not additive populations
- Waiting, consultation duration, and cycle time remain separate measures
- Rail navigation adds **OPD** domain without changing ED / Bed / IPD screens

## Unresolved limitations

- Visits are not linked patient-by-patient; unique patients and unplanned returns are illustrative
- Documentation and referral pathways are constructed scenario shares, not EMR extracts
- Appointment booking / no-show / slot-fill remain intentionally outside OPD
- What-if sketches are illustrative only

## Commit hash

*(filled after commit)*

## Public deployment URL

https://maaaz123.github.io/datavital-ai-demo/outpatient  

Use `/refresh.html` once after deploy if a prior service worker still serves a cached shell (`BUILD_ID = v57-opd-domain`).
