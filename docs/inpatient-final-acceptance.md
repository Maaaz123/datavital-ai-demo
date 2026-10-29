# Inpatient Care — Final Acceptance

**Domain:** Inpatient Care (Snapshot · Stay & Discharge · Care Progress & Outcomes)  
**Design status:** Frozen (content / BI / functional completion only)  
**Deployment URL:** https://maaaz123.github.io/datavital-ai-demo/  
**Refresh (cache wipe):** https://maaaz123.github.io/datavital-ai-demo/refresh.html  
**BUILD_ID:** `v45-ipd-final`  
**Commit:** *(filled at publish)*  

---

## 1. KPI & chart inventory

### Inpatient Snapshot (`/inpatient`)

| Type | Title |
|------|--------|
| KPI | Inpatient admissions |
| KPI | Inpatient census |
| KPI | Inpatient discharges |
| KPI | Median length of stay |
| KPI | Admissions from ED |
| KPI | Elective / direct admissions |
| Chart | Inpatient admissions over time |
| Insight | Priority signals + Management action |
| Chart | Inpatient volume context |
| Chart | Admission source mix (donut) |
| Chart | Admissions by specialty (stacked) |
| Chart | Episode volume summary |
| Catalog | Admissions & Inpatient Activity |

### Stay & Discharge (`/inpatient/stay`)

| Type | Title |
|------|--------|
| KPI | Average / Median / P90 length of stay |
| KPI | Long-stay patient count |
| KPI | Medically ready, not discharged |
| KPI | Delayed discharge rate |
| KPI | Expected discharges (next day) |
| KPI | Inpatient discharges |
| Chart | Median length of stay over time |
| Insight | Stay watch list |
| Chart | Long-stay contribution by specialty |
| Chart | Length of stay vs review lines |
| Chart | Length of stay by specialty |
| Chart | Discharge destinations |
| Chart | Expected discharge outlook |
| Insight | Discharge pipeline |
| Catalog | Inpatient Length of Stay · Discharge Management |

### Care Progress & Outcomes (`/inpatient/outcomes`)

| Type | Title |
|------|--------|
| KPI | Unplanned 7-day / 30-day readmission rate |
| KPI | Inpatient mortality count / rate |
| KPI | Discharge against medical advice |
| KPI | Discharge-to-admission flow ratio |
| Chart | Readmissions and mortality over time |
| Insight | Outcome watch list |
| Chart | 30-day readmissions by specialty |
| Chart | Census vs discharges over time |
| Journey | Inpatient journey strip |
| Cards | Care documentation & continuity (6 estimated cards) |
| Catalog | Care Coordination · Outcomes · Documentation & Continuity |
| AI | AI decision support (12 cases) |

---

## 2. Previously identified issues and resolutions

| Issue | Severity | Resolution |
|-------|----------|------------|
| Six documentation cards showed permanent **Not available** | Critical | Replaced `BlankDocStrip` with `DocProgressStrip` using illustrative constructed rates from `ipdDocScenario()` |
| Indicator catalog left care-plan / consult / discharge-doc rates blank | Critical | Wired rates through `buildView` → `scopeInput` → `ipdIndicatorsFor` as `constructed` |
| Vital Assist said documentation clocks were unavailable | High | `answerInpatient` now returns the same illustrative rates with management framing |
| AI decision-support copy claimed documentation was blank | Medium | Updated IPD-AI-07 / 08 / 10 / 12 analysis strings |
| Stay pipeline showed “Summary / delay clocks Not available” | Medium | Shows discharge summary completion; delay duration clocks remain honestly unavailable |
| Outcomes watch list said care-plan & consult clocks N/A | Medium | Shows median consult response + pending consults (illustrative) |
| SPA deep-link `404.html` could serve stale hashed shell | High (ops) | Publish always copies `index.html` → `404.html` |

---

## 3. Screen results

### Snapshot — **PASS**
- Admission sources partition admissions (`From emergency` + `Elective/direct` + `Transfer in` + `Other`).
- Specialty stacks sum to monthly admissions.
- Census labelled as snapshot / period-average; charts warn not to add census to period flows.
- Admission cancellation remains unavailable in catalog (hidden by default) — no empty executive strip.

### Stay & Discharge — **PASS**
- Average, median, and P90 stay use separate stored fields.
- Long-stay count/rate use the 7-day review line; specialty Pareto sums to long-stay count.
- Destinations partition discharges; deaths stay separate.
- Expected discharges labelled illustrative.

### Care Progress & Outcomes — **PASS**
- Six documentation cards show **Estimated** values (not Not available).
- Related coordination / continuity indicators populated in catalog.
- Readmission and mortality series keep scenario disclosures (no patient-level linkage claim).

---

## 4. Documentation indicators

| Indicator | Status | Basis |
|-----------|--------|--------|
| Care Plan Documentation Rate | Estimated / constructed | Illustrative share · hospital + occupancy sensitive |
| Daily Clinical Review Completion Rate | Estimated / constructed | Same |
| Median Consultation Response Time | Estimated / constructed | Hours · hospital sensitive |
| Discharge Summary Completion Rate | Estimated / constructed | Same |
| Discharge Medication Reconciliation Completion Rate | Estimated / constructed | Same |
| Follow-up Plan Documentation Rate | Estimated / constructed | Same |
| Care Plan Review Compliance | Estimated / constructed | Catalog |
| Pending Clinical Consultations | Estimated / constructed | Catalog |
| Care Plan Milestone Completion Rate | Estimated / constructed | Catalog |
| Admission Assessment Completion Rate | Estimated / constructed | Catalog |
| Diagnosis Documentation Completion Rate | Estimated / constructed | Catalog |
| Discharge Instructions Completion Rate | Estimated / constructed | Catalog |
| Discharge Readiness Documentation Rate | Estimated / constructed | Catalog |
| Observed-to-Expected LOS Ratio | Not available | No expected-LOS model |
| Discharge Delay Duration P50/P90 | Not available | No ready-to-actual clock |
| Admission Cancellation Rate | Not available | Cancelled planned admissions not recorded |

---

## 5. Vital Assist & What-if

| Check | Result |
|-------|--------|
| Documentation / care-plan / consult questions return scenario rates | PASS (`ipd-final` test) |
| Delay answers cite readiness documentation rate; duration clocks still unavailable | PASS |
| Readmission / LOS / management attention answers use dashboard-aligned formula | PASS (existing assistant paths) |
| What-if long-stay / delayed discharge / LOS prompts | PASS (`whatIf.test.ts`) |
| Answers claim measured post-approval outcomes | FAIL intentionally avoided — approval language remains illustrative |

---

## 6. Cross-screen reconciliation

| Check | Result |
|-------|--------|
| Sources sum to admissions | PASS |
| Destinations sum to discharges | PASS |
| Snapshot / Stay discharge totals share `buildView` | PASS |
| 7-day / 30-day readmit rates shared across Outcomes KPI, catalog, Assist | PASS |
| Docs rates shared across Outcomes strip, catalog, Assist via `ipdDocScenario` | PASS |

---

## 7. Hospital & period coverage

| Matrix | Coverage |
|--------|----------|
| Hospitals H1–H5 (+ ALL identity salt) | `ipdDocScenario` band test across `HOSPITALS` |
| Years 2024–2026 | Filter interaction test |
| Period year / Q1 (proxy for quarter switching) | Filter interaction test on `/inpatient/outcomes` |
| Annual alerts vs period scores | Snapshot already labels: alerts use full year when period ≠ year |

---

## 8. Visual regression (design freeze)

| Check | Result |
|-------|--------|
| No layout / color / typography / chart-type redesign | PASS — card classes and grid unchanged |
| Documentation strip keeps existing `gc-scope-card` dense pattern | PASS |
| Blank “Not available” executive strip removed | PASS |

---

## 9. Remaining limitations (accepted)

1. Documentation rates are **illustrative constructed shares**, not EMR extracts.  
2. No observed-to-expected LOS model.  
3. No ready-to-actual discharge duration clock.  
4. No admission cancellation events.  
5. Readmissions are scenario shares — visits are not linked patient-by-patient.  
6. Specialty outcome gaps are not severity-adjusted.  
7. AI does not decide medical readiness or auto-discharge.

---

## 10. Test commands and results

```bash
cd frontend
npx vitest run src/core/ipd-final.test.tsx src/core/recovery.test.tsx src/core/dashboard-audit.test.ts src/showcase/whatIf.test.ts
npx tsc -b
```

**Actual results (local):**
- `ipd-final.test.tsx` — 7 passed  
- `recovery.test.tsx` — 10 passed  
- `dashboard-audit.test.ts` — 8 passed  
- `whatIf.test.ts` — 4 passed  
- `tsc -b` — clean  

---

## 11. Acceptance verdict

**Inpatient Care domain: ACCEPTED for executive demonstration** with the limitations listed in §9 explicitly disclosed in UI copy and Vital Assist.

Critical empty documentation strip: **resolved**.  
Design freeze: **honored**.  
Live verification: use refresh URL after publish so service-worker cache picks up `v45-ipd-final`.
