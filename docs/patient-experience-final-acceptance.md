# Patient Experience & Satisfaction Intelligence — Final Acceptance

**Domain:** Domain 11 — Patient Experience & Satisfaction Intelligence  
**BUILD_ID:** `v72b-px-pages-base`  
**Production commit:** `16720825c4f9818fda179eb8f1a015d70858dae1` — fill after commit; **pending push**  
**JS bundle:** `assets/index-CQ4cZtdj.js`  
**PWA helper:** `assets/pwa-CTHl9rWL.js`  
**Instrument:** `DV-PX-Internal-v1` (official HCAHPS / CAHPS benchmarking **unavailable**)  
**Automated suite:** **271 passed** / 271 (`vitest run`, 40 files)  
**PX reconcile:** **20 passed** (`patient-experience-reconcile.test.ts`)  
**PX pages:** **2 passed** (`patient-experience-pages.test.tsx`)

**Status:** Domains 1–10 remain frozen (layout/styling/ownership). Patient Experience is additive only. Future Healthcare Resource / Profitability domain is **not** built.

**Production URL verification:** **NOT TESTED** — pending push to GitHub Pages.

---

## 1. Executive summary

| Item | Result |
|---|---|
| Six Patient Experience routes operational | **PASS** (page render + nav) |
| Unique KPI ownership (`PX_KPI_OWNERS`, 33) | **PASS** |
| Chart ownership registry (`PX_CHART_OWNERS`, 35 unique titles) | **PASS** |
| Survey invitation / scoring / recommendation methodology | **PASS** |
| Complaint ledger identity | **PASS** |
| Sentiment / theme / journey linkage | **PASS** |
| Cross-domain forbidden headlines not claimed | **PASS** |
| Vital Assist (PX scope + clinical refusal) | **PASS** |
| Six What-if scenarios (`px-*`) | **PASS** |
| Filter matrix (H1/ALL × year/Q1–Q4) | **PASS** |
| Desktop automated page render | **PASS** |
| Browser visual QA on production (1280/1440/1920) | **NOT TESTED** (after deploy) |
| Data dictionary / mapping / lineage / readiness | **PASS** |
| Ten prior domains regression (ICU/surgery/recovery included) | **PASS** (271/271) |
| Production GitHub Pages verification | **NOT TESTED** (pending push) |

Domain 11 delivers internal survey, journey, complaint, voice, department, and illustrative improvement intelligence without claiming official HCAHPS, without clinical treatment advice, without owning Domains 1–10 headline KPIs, and without building profitability.

---

## 2. Six-screen architecture

| # | Title | Route | Management question |
|---|---|---|---|
| 1 | Patient Experience Command Center | `/patient-experience` | What is the current overall patient experience position (satisfaction, response, polarity, unresolved issues)? |
| 2 | Patient Journey & Touchpoints | `/patient-experience/journey` | Where along the journey and which touchpoints weaken reported experience? |
| 3 | Complaints & Service Recovery | `/patient-experience/complaints` | How is the complaint ledger performing (volume, open stock, aging, resolution, reopen)? |
| 4 | Voice of Patient & Sentiment AI | `/patient-experience/voice` | What themes and sentiment patterns appear in free-text feedback, and what still needs human review? |
| 5 | Department & Service Experience | `/patient-experience/departments` | Which departments meet experience targets with adequate sample, and where is coverage thin? |
| 6 | Experience Improvement & What-If | `/patient-experience/optimization` | Which eligible improvement actions and illustrative what-if uplifts are available under documented assumptions? |

`NAV_DOMAINS` length **11** (prior 10 + Patient Experience); screen count **49** (prior 43 + 6). — **PASS**

---

## 3. KPI Ownership Matrix

Primary registry: `frontend/src/core/patientExperienceOwnership.ts` → `PX_KPI_OWNERS` (**33** unique IDs; exactly one owning screen each).

| Screen | Count | Display titles |
|---|---:|---|
| Command | 6 | Overall Satisfaction, Response Rate, Positive Share, Negative Share, Recommendation, Unresolved Issues |
| Journey | 6 | Journey Satisfaction, Waiting Score, Communication, Coordination, Discharge Exp., Neg. Touchpoints |
| Complaints | 6 | Total Complaints, Open Complaints, Median Resolution, Overdue, First-Contact Res., Reopen Rate |
| Voice | 5 | Comments Analyzed, Negative Feedback, Emerging Themes, High-Priority, Theme Review |
| Departments | 5 | Meeting Target, Lowest Dimension, Coverage Gap, Material Variance, Need Review |
| Optimization | 5 | Addressable Gap, Opportunities, Modeled Uplift, Complaint Potential, Action Coverage |
| **Total** | **33** | Zero cross-screen headline ID duplicates |

| Check | Result |
|---|---|
| `assertUniquePxOwnership()` | **PASS** |
| `PX_KPI_OWNERS.length === 33` | **PASS** |
| Cross-domain forbidden headlines (`PX_CROSS_DOMAIN_FORBIDDEN`) absent from owners | **PASS** |
| Every `kpi_px_*` binds to a finite shared-view value | **PASS** |

---

## 4. Chart Ownership Registry

Registry: `PX_CHART_OWNERS` in `patientExperienceOwnership.ts` (**35** unique chart IDs / titles). Documented also in `docs/kpi-lineage/patient-experience-kpi-lineage.md`.

| Screen | Charts (unique titles) |
|---|---|
| Command | Patient Experience Trend; Satisfaction by Care Setting; Experience Dimension Performance; Survey Responses Trend; Patient Experience Distribution; Priority Experience Signals |
| Journey | Patient Journey Experience Map; Satisfaction by Touchpoint; Experience by Service Setting; Waiting vs Reported Experience; Communication Experience; Discharge Journey Feedback |
| Complaints | Complaints Trend; Complaints by Category; Complaint Aging; Resolution Time Distribution; Complaint Status Breakdown; Escalation and Reopening Patterns |
| Voice | Sentiment Trend; Feedback Themes; Top Positive Topics; Top Negative Topics; Theme Frequency by Department; Emerging Experience Issues |
| Departments | Experience by Department; Experience by Service Line; Satisfaction Distribution; Response Coverage by Department; Experience Trends by Care Setting; Opportunity Matrix |
| Optimization | Improvement Opportunities; Current vs Scenario Experience; Complaint Reduction Potential; Experience Improvement by Touchpoint; Implementation Constraints |

| Check | Result |
|---|---|
| `assertUniquePxCharts()` | **PASS** |
| Unique chart IDs | **PASS** |
| No redundant same-metric charts with only title changes as ownership rule | **PASS** (registry uniqueness) |

---

## 5. Survey scoring methodology

| Rule | Definition | Result |
|---|---|---|
| Instrument | `DV-PX-Internal-v1` v1.0 — internal DataVital demo instrument | **PASS** |
| Official benchmarking | `officialBenchmarking = unavailable` — **not** official HCAHPS / CAHPS / CMS-star | **PASS** |
| Scale | 0–10 for scored items | **PASS** |
| Eligible population | Discharged / completed encounters invited under the internal protocol | **PASS** |
| Grains | Invitations ≠ raw completions ≠ eligible completed ≠ answers ≠ complaints ≠ comments | **PASS** |
| Duplicates | `eligibleCompleted = completionsRaw − duplicateCompletions` | **PASS** |
| Response rate | **Invitation-based:** `eligibleCompleted ÷ eligibleInvitations` | **PASS** |
| Aggregation | Weighted numerator/denominator (`Σ scores ÷ count`); do not average department % without weighting | **PASS** |
| Top / bottom box | Positive = 9–10; Negative = 0–6 on overall | **PASS** |
| Recommendation | Patient Recommendation Score = (% promoters 9–10 − % detractors 0–6) × 100 on `Q_RECOMMEND` | **PASS** |
| Recommendation label | Explicitly **not** an official NPS product | **PASS** |

Evidence: `patient-experience-reconcile.test.ts` survey invitation ledger suite.

---

## 6. Survey coverage and sample-bias limitations

| Check | Result |
|---|---|
| Every PX department appears in department rows | **PASS** |
| Department invitations / responses sum to hospital invitations / eligible completed | **PASS** |
| Adequate sample vs `PX_MIN_DEPT_SAMPLE` (40) | **PASS** |
| Meeting-target requires adequate sample | **PASS** |
| Coverage gap = departments below minimum sample | **PASS** |

**Limitations (documented, not failures):**

- Respondents who complete surveys may differ systematically from non-respondents (self-selection / channel bias).
- Low-sample departments must not be ranked as if they had adequate precision.
- Internal instrument scores are **not** case-mix-adjusted public HCAHPS reporting.
- Demo uses synthetic invitations and responses — production coverage will differ.

Classification for production survey-vendor verification: **NOT APPLICABLE** to this synthetic demo (no Production Source Verified feed).

---

## 7. Complaint lifecycle reconciliation

Identity for every period slice:

`openingOpen + new + reopened − closed − withdrawn = closingOpen`

| Check | Result |
|---|---|
| Ledger identity balances (`complaintLedgerBalanced`) | **PASS** |
| Open KPI = closing open stock | **PASS** |
| Total complaints = new in period | **PASS** |
| Finite median / P90 resolution from received→resolved timestamps | **PASS** |
| Aging bands sum to open stock | **PASS** |
| Reopen rate and first-contact resolution in [0, 1] | **PASS** |

**Business rule:** Closed ≠ satisfied — administrative close is not proof of patient satisfaction. — **PASS** (methodology copy + Assist constraints)

---

## 8. Sentiment and theme methodology

| Check | Result |
|---|---|
| Comments analyzed > 0 with EN + AR mix | **PASS** |
| Language / theme counts partition analyzed comments | **PASS** |
| Sentiment ∈ {positive, neutral, negative}; confidence ∈ [0.5, 1] | **PASS** |
| Review status ∈ {auto, human_reviewed, pending_review} | **PASS** |
| Demo comments marked `[SYNTHETIC]` from EN/AR templates | **PASS** |
| Negative feedback share and theme review coverage in [0, 1] | **PASS** |
| Safety / high-priority flags route to human review language | **PASS** |

**Limitation:** Sentiment and theme labels are auditable synthetic classifications — **not** clinical harm determination and **not** a substitute for authorized safety review. — **PASS** (documented)

---

## 9. Patient journey linkage coverage

| Check | Result |
|---|---|
| `journeyLinkageCoverage ∈ [0, 1]` | **PASS** |
| `linked + unlinked = eligibleCompleted` | **PASS** |
| Unlinked responses retained (coverage < 1 in demo year view) | **PASS** |
| Coverage = linked ÷ (linked + unlinked) | **PASS** |
| No fabricated operational joins for unlinked responses | **PASS** (methodology) |
| Negative touchpoint share in [0, 1] | **PASS** |

Operational wait minutes / LOS from Domains 1–10 are **supporting context only** (correlation ≠ causation).

---

## 10. Cross-domain dependency matrix

Domains 1–10 are **frozen**. Patient Experience may reference operational context in Assist/alerts/what-if copy only; it must not claim those headlines as PX ribbon KPIs.

| Dependency (supporting context only) | Owning domain | PX use | Result |
|---|---|---|---|
| ED waits / boarding narrative | Emergency | Context for waiting experience | **PASS** (forbidden as PX KPI) |
| Bed occupancy / blocked beds | Beds | Context only | **PASS** |
| LOS / delayed discharge | Inpatient | Discharge experience context | **PASS** |
| Clinic wait / throughput | Outpatient | Waiting / touchpoint context | **PASS** |
| Access wait / no-show | Appointments | Access experience context | **PASS** |
| OR utilization | Surgery | Not PX-owned | **PASS** |
| Scanner / imaging backlog | Radiology | Not PX-owned | **PASS** |
| Analyzer / lab TAT / backlog | Laboratory | Not PX-owned | **PASS** |
| Medication orders / stockouts | Pharmacy | Not PX-owned | **PASS** |
| ICU admissions / staffed beds / ICU wait | ICU | Not PX-owned | **PASS** |

`PX_CROSS_DOMAIN_FORBIDDEN` coverage — **PASS**. Domains 1–10 layout/styling redesign — **NOT APPLICABLE** (freeze; not attempted).

---

## 11. Vital Assist testing

| Check | Result |
|---|---|
| PX context available on six screens (Assist open from Optimization) | **PASS** (`patient-experience-pages.test.tsx`) |
| Management statement: AI does not close complaints alone | **PASS** |
| Answers PX management questions from shared `buildPxView` | **PASS** |
| Documents HCAHPS unavailability / internal instrument | **PASS** |
| Refuses clinical treatment advice | **PASS** |
| Six What-if prompts answerable via Assist with illustrative/approval language | **PASS** |
| Live click-path on production URL | **NOT TESTED** (pending push) |

---

## 12. Six What-if results

All six scenarios exercised end-to-end in automated tests (`runWhatIf` + `parseWhatIfIntent` + Assist prompts). Baseline hospital/period in tests: **H1 · Full year 2026**. Outputs are **illustrative**, not achieved improvement.

| # | Prompt | Intent | Automated result |
|---|---|---|---|
| 1 | What if waiting-time dissatisfaction decreases by 20%? | `px-wait-down` | **PASS** |
| 2 | What if staff communication scores improve by 15%? | `px-communication-up` | **PASS** |
| 3 | What if complaint resolution time decreases by 25%? | `px-resolution-down` | **PASS** |
| 4 | What if discharge communication improves by 20%? | `px-discharge-up` | **PASS** |
| 5 | What if repeated complaint categories decrease by 30%? | `px-repeated-down` | **PASS** |
| 6 | What if low-scoring touchpoints improve by 15%? | `px-touchpoint-up` | **PASS** |

| Contract check | Result |
|---|---|
| Six distinct `px-*` intents / titles / ids | **PASS** |
| Assumptions include illustrative / not guaranteed language | **PASS** |
| No clinical prescribe / prognosis language in estimates | **PASS** |
| Production Forecast-tab visual verification | **NOT TESTED** (pending push) |

---

## 13. Management decision workflow

| Step | Result |
|---|---|
| KPI → Investigate → Vital Assist → Review → Forecast/What-if → Actions → Decide → Follow-up | **PASS** (existing platform workflow + PX decision signal) |
| Decide records intent / approval only | **PASS** |
| AI does not close complaints or change clinical care alone | **PASS** |
| Approval ≠ achieved satisfaction / complaint reduction | **PASS** (illustrative copy) |
| Full production click-path | **NOT TESTED** (pending push) |

---

## 14. Filter testing

| Matrix | Result |
|---|---|
| Hospitals `{H1, ALL}` × periods `{year, Q1, Q2, Q3, Q4}` finite reconciled views | **PASS** |
| Complaint ledger balanced under each filter | **PASS** |
| Quarter invitation / completion / complaint / comment / day sums = year | **PASS** |
| Journey linkage coverage in [0, 1] under each filter | **PASS** |

---

## 15. Desktop visual QA

| Viewport | Automated | Browser on production |
|---|---|---|
| 1280 / 1440 / 1920 | Page render **PASS** — six screens show owned KPI values (`data-testid=value-kpi_px_*`), charts with `data-chart-state="ok"`, PX ribbon | **NOT TESTED** — browser visual after deploy |
| KPI title / chart presence | **PASS** (pages test) | **NOT TESTED** after deploy |
| Blank / NaN charts | Shared view finite binds — **PASS** | **NOT TESTED** after deploy |

Mobile / Arabic UI redesign — **NOT APPLICABLE** (frozen English desktop scope for this release). Multilingual **synthetic comment** EN/AR classification is covered in reconcile tests — **PASS**.

---

## 16. Data Dictionary coverage

| Deliverable | Result |
|---|---|
| `docs/data-dictionary/patient-experience-data-dictionary.md` | **PASS** |
| `docs/data-dictionary/patient-experience-data-dictionary.csv` | **PASS** (45 canonical fields) |
| `docs/data-dictionary/patient-experience-data-dictionary.json` | **PASS** |
| Readiness states: Demo Available / Partially Mapped / Missing / Scenario Only / Production Source Verified | **PASS** |
| Production Source Verified claimed for any Domain 11 field | **NOT APPLICABLE** (none — correctly unused) |

---

## 17. Source-to-Target Mapping

| Deliverable | Result |
|---|---|
| `docs/data-mapping/patient-experience-source-to-target.md` | **PASS** |
| Expected HIS/survey/complaint/NLP patterns → canonical columns | **PASS** |
| Shared `buildPxView` as single source for screens / alerts / Assist / what-if | **PASS** |
| Customer schema verification | **NOT APPLICABLE** (expected patterns only; not Production Source Verified) |

---

## 18. KPI Lineage

| Deliverable | Result |
|---|---|
| `docs/kpi-lineage/patient-experience-kpi-lineage.md` | **PASS** |
| 33 KPIs with one owner screen, required fields, transform, grain, readiness | **PASS** |
| Chart ownership registry mirrored | **PASS** |
| Six what-if intents → follow-up measures | **PASS** |
| Cross-domain non-ownership listed | **PASS** |

---

## 19. Data Readiness Matrix

| Deliverable | Result |
|---|---|
| `docs/data-readiness/patient-experience-data-readiness.md` | **PASS** |
| All 33 headline KPIs Demo Available in synthetic scenario | **PASS** |
| None Production Source Verified | **PASS** |
| Scenario Only: optimization targets / opportunities / modeled uplift / what-ifs | **PASS** |
| HCAHPS / CAHPS feed | **Missing** (declared unavailable — correct fail-closed) |
| Future finance joins (`resource_id`, `cost_center_id`) | **Missing** / hooks only — **PASS** (not built into PX UI) |

---

## 20. Ten-domain regression results

Domains 1–10 must remain operational without redesign.

| Suite evidence | Result |
|---|---|
| Full frontend vitest | **PASS — 271 / 271** (40 files) |
| Includes ICU reconcile / Surgery / Recovery page suites | **PASS** (e.g. `recovery.test.tsx` 10 tests green in same run) |
| PX additive tests | **PASS** — reconcile 20 + pages 2 |
| Domains 1–10 frozen (no ownership/layout redesign claimed) | **PASS** (scope) |
| Live production deep-link regression for Domains 1–10 after PX publish | **NOT TESTED** (pending push) |

---

## 21. Actual production build identifier

| Item | Value | Result |
|---|---|---|
| BUILD_ID | `v72b-px-pages-base` | **PASS** (local `frontend/src/pwa.ts`, `frontend/public/refresh.html`, root `refresh.html`) |
| Bundle | `assets/index-CQ4cZtdj.js` | **PASS** (local `frontend/dist` production build) |
| PWA helper | `assets/pwa-CTHl9rWL.js` | **PASS** (local dist) |
| GitHub Pages serves BUILD_ID / bundles | **NOT TESTED** | pending push |
| `localStorage` BUILD_ID after `/refresh.html` on production | **NOT TESTED** | pending push |

Public URL (after push): https://maaaz123.github.io/datavital-ai-demo/  
PX Command (after push): https://maaaz123.github.io/datavital-ai-demo/patient-experience

---

## 22. Actual commit hash

| Item | Value | Result |
|---|---|---|
| Production commit | `16720825c4f9818fda179eb8f1a015d70858dae1` | **NOT TESTED** — fill after commit |
| Push to remote / GitHub Pages deploy | pending push | **NOT TESTED** |

Do not invent a commit hash. Replace `16720825c4f9818fda179eb8f1a015d70858dae1` once the Domain 11 commit exists and record Pages build status after push.

---

## 23. Known limitations

1. **Synthetic data** — deterministic demo ledger; not a live survey vendor, CRM, or HIS feed.
2. **Not HCAHPS** — `DV-PX-Internal-v1` scores must not be labeled or benchmarked as official HCAHPS / CAHPS / CMS-star ratings.
3. **Sentiment ≠ clinical harm** — theme/sentiment/safety flags are process signals requiring human review.
4. **Closed ≠ satisfied** — complaint administrative close is not proof of recovery quality.
5. **Correlation ≠ causation** — waiting vs experience charts and cross-domain operational context are associative only.
6. **What-if / modeled uplift are illustrative** — approval does not equal achieved satisfaction or complaint reduction.
7. **Sample bias** — invitation-based response rates still leave non-response bias; thin samples must not drive ranking.
8. **Profitability domain not built** — no revenue/cost dashboards inside Patient Experience; do not fabricate financial benefit from satisfaction changes.
9. **Production URL / viewport browser QA pending** until push.
10. Desktop English primary UI scope for acceptance; Arabic appears in synthetic comment templates only.

---

## 24. Future strategic domain readiness (links only — do not build)

Future **Healthcare Resource, Profitability & Expansion Intelligence** remains out of scope. Retain canonical join hooks for later association work only:

- `hospital_id`
- `department_id`
- `service_line_id`
- `encounter_id`
- `calendar_period_id`
- `resource_id`
- `cost_center_id`

Documentable future associations (satisfaction ↔ service quality ↔ capacity ↔ utilization ↔ complaint-handling effort ↔ cost of service recovery ↔ revenue retention) must **not** invent financial benefits from patient satisfaction changes and must **not** appear as profitability screens inside Domain 11. — **PASS** (hooks documented; domain not built)

---

## 25. Final acceptance recommendation

**CONDITIONAL READY FOR APPROVAL** — automated Domain 11 gate is green; production publish evidence is still open.

| Gate | Verdict |
|---|---|
| Local automated acceptance (ownership, survey, complaints, voice, journey, Assist, six What-ifs, filters, pages) | **PASS** |
| Artifact pack (dictionary / mapping / lineage / readiness) | **PASS** |
| Ten-domain regression suite | **PASS** (271/271) |
| Local production build identity `v72b-px-pages-base` / `index-CQ4cZtdj.js` / `pwa-CTHl9rWL.js` | **PASS** |
| Commit hash recorded | **NOT TESTED** (`16720825c4f9818fda179eb8f1a015d70858dae1`) |
| GitHub Pages live verification + desktop browser visual QA | **NOT TESTED** (pending push) |

**Recommendation:** Approve the Domain 11 *code and documentation* acceptance on automated evidence. Hold final *production* acceptance until push completes, `16720825c4f9818fda179eb8f1a015d70858dae1` is replaced with the real hash, and live Pages checks confirm `v72b-px-pages-base` with bundles `index-CQ4cZtdj.js` / `pwa-CTHl9rWL.js` on the six `/patient-experience*` routes.
