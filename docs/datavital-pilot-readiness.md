# DataVital AI — Pilot Readiness

**BUILD_ID:** `v79-enterprise-integration`  
**Date:** 2026-10-30  
**Scope:** Synthetic enterprise demonstration readiness for a controlled hospital pilot conversation  
**Honesty rule:** Do **not** claim existing paid hospital pilots, Production Source Verified integrations, or measured ROI without evidence.

---

## 1. Current demo capabilities

| Capability | Status |
|---|---|
| Fifteen operational / clinical / financial / experience / quality / supply / strategy domains | Demo Available |
| Executive Dashboard (`/executive`) — cross-domain priorities from canonical facts | Demo Available |
| Hospital Command Center (`/command`) — COO exceptions wall | Demo Available |
| Vital Assist (observe → investigate → what-if → human decide) | Demo Available |
| Shared hospital / year / period filters (H1–H5, ALL, 2024–2026, year/Q1–Q4) | Demo Available |
| Domain what-if libraries (incl. 26 scenarios across Domains 13–15) | Scenario Only |
| Data dictionaries / KPI lineage / source mapping packs (strongest for Domains 12–15) | Demo / Partially Mapped |

---

## 2. Synthetic-data limitations

1. All figures are scenario-generated — **not** real hospital records.  
2. No live / streaming operational feed; period-scoped reporting only.  
3. Fictional SAR on financial screens; contribution ≠ net profit; recoveries ≠ cash.  
4. Quality surveillance is illustrative — official SIR / NHSN certification unavailable.  
5. No certified payer clearinghouse, FHIR, or NPHIES production integration.  
6. Domains 12–15 technical PASS with product-owner approval **NOT RECORDED**.  
7. Enterprise screens do not invent independent totals; they still inherit synthetic grain limits.

---

## 3. Priority pilot use cases

| Use case | Primary domains | Pilot question |
|---|---|---|
| Capacity & flow | Emergency, Beds, IPD, ICU, Surgery | Where is bed / ED / ICU pressure and what is actionable this week? |
| Access & diagnostics | OPD, Appointments, Radiology, Laboratory | Where are access waits and diagnostic bottlenecks? |
| Revenue integrity | RCM (+ Strategy context) | Where are denial / AR / unbilled exposures (illustrative → real claims later)? |
| Safety & quality | Quality & Safety (+ PX) | Where are overdue high-risk actions and surveillance signals? |
| Supply resilience | Supply Chain (+ Pharmacy context) | Where are critical stockouts and near-expiry exposures? |
| Resource / contribution | Strategy | Where is capacity constrained and what reallocation options exist before CapEx? |

---

## 4. Minimum required hospital source systems

| Source system | Minimum objects | Enterprise need |
|---|---|---|
| HIS / EHR | Encounter, admission, discharge, location, acuity | ED / IPD / Beds / ICU |
| ADT / bed management | Bed inventory, occupancy, blocked, transfers | Beds / Command |
| OR / theatre system | Case schedule, start/stop, cancellation | Surgery |
| RIS / PACS | Orders, exams, report TAT | Radiology |
| LIS | Orders, specimens, results, critical notify | Laboratory |
| Pharmacy | Orders, dispense, inventory | Pharmacy |
| Scheduling | Appointments, attendance, no-shows | Appointments / OPD |
| Experience / CRM | Surveys, complaints | Patient Experience |
| Billing / claims / payer | Charges, claims, remittances, AR | RCM |
| Incident / IPC | Safety reports, HAI surveillance, CAPA | Quality |
| ERP / materials | SKU, PO, receipt, invoice, issue | Supply Chain |
| HR / payroll / cost | Staffed hours, overtime, cost centers | Strategy |

Without mapped sources, readiness remains **Demo Available / Partially Mapped** — never **Production Source Verified**.

---

## 5. Data Dictionary dependency map

| Pilot theme | Dictionary / lineage packs |
|---|---|
| Enterprise reconciliation | `docs/enterprise-cross-domain-reconciliation.md` |
| Domains 12–15 | `docs/data-dictionary/*`, `docs/data-mapping/*`, `docs/kpi-lineage/*`, `docs/data-readiness/*` |
| Domains 1–11 | Prior domain acceptance + ownership modules in `frontend/src/core/*Ownership*` / view builders |

Pilot kickoff should freeze canonical keys (`hospital_id`, `encounter_id`, `calendar_period_id`, `claim_id`, `item_id`, etc.) before KPI promotion.

---

## 6. Security and privacy requirements (pilot)

| Requirement | Pilot expectation |
|---|---|
| PHI minimization | Prefer aggregate / de-identified feeds for Phase-1 pilot |
| Access control | Role-based access for executive / ops / finance / quality personas |
| Audit | Log Assist decisions as human-governed intent only |
| Data residency | Agree customer region before any production connect |
| Secrets | No credentials in demo repo; separate secure vault for pilot |
| Clinical safety | Platform is decision support — not autonomous diagnosis / ordering |

---

## 7. Integration assumptions

- Batch or near-batch extracts acceptable for first pilot (not claimed real-time).  
- Grain differences (stocks vs flows vs rates) must be preserved — do not force equality.  
- What-if outputs remain illustrative until linked to measured post-intervention KPIs.  
- AI recommendations require human approval; nothing writes back to HIS/ERP by default.

---

## 8. Acceptance criteria (pilot gate)

| Criterion | Pass condition |
|---|---|
| Source coverage | Agreed minimum systems mapped for selected use cases |
| Identity | Join coverage and missing-join behavior documented |
| KPI parity | Pilot KPIs match DataVital ownership / formulas (or deltas documented) |
| Disclosure | Synthetic vs production figures clearly separated in UI |
| Decision workflow | Human approve / defer / reject recorded without claiming measured outcome |
| Security | Access model + PHI handling signed off |
| Product-owner | Explicit approval for domains in scope (12–15 currently **NOT RECORDED**) |

---

## 9. KPI measurement plan (illustrative)

1. Baseline window (e.g. 4–8 weeks) on agreed KPIs.  
2. Intervention decision recorded in Assist / governance log.  
3. Follow-up KPI named at decision time (domain-owned).  
4. Compare post window with same grain / denominator.  
5. Report measured delta separately from modeled what-if benefit.

---

## 10. Responsible roles

| Role | Responsibility |
|---|---|
| Hospital executive sponsor | Scope, success criteria |
| COO / ops lead | Command Center exceptions |
| CFO / RCM lead | Financial KPI acceptance |
| CMO / CNO / Quality | Safety / quality definitions |
| CIO / data owner | Source mapping & privacy |
| DataVital product owner | Domain approval status |
| Implementation lead | Integration & UAT |

---

## 11. Open product gaps

- Domains 12–15 product-owner approval **NOT RECORDED**.  
- No Production Source Verified fields.  
- No paid pilot evidence in this repository.  
- Full desktop visual regression for enterprise screens still open.  
- Write-back / closed-loop actions not in scope for first pilot.

---

## Recommendation

The platform is **ready for a structured pilot conversation and synthetic demonstration** under BUILD_ID `v79-enterprise-integration`. It is **not** ready to be described as a live, Production Source Verified, paid-pilot-proven enterprise deployment.
