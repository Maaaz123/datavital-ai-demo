# Radiology Domain — Final Acceptance

**Domain:** Radiology & Diagnostic Imaging Intelligence  
**BUILD_ID:** `v64-radiology`  
**JS bundle:** `index-DohGkQVM.js`  
**Scenario snapshot (H1 · Full year 2026):** requests 33,117 · completed 31,196 · backlog 890 · scanner util 45.0% · median access wait 6.8 d · median report TAT 3.6 h · recoverable 2,345 h · additional exams 569

---

## 1. Final screen architecture

All five screens retained — each answers a distinct management question:

| # | Title | Route | Decision |
|---|---|---|---|
| 1 | Imaging Command Center | `/radiology` | How well is the hospital meeting overall diagnostic imaging demand? |
| 2 | Imaging Access & Waitlist | `/radiology/access` | Where are patients waiting too long for diagnostic imaging? |
| 3 | Modality Utilization & Scheduling | `/radiology/utilization` | How efficiently are scanners and staffed sessions used? |
| 4 | Reporting & Imaging Quality | `/radiology/quality` | Where are reports delayed, and which quality-process issues need attention? |
| 5 | Imaging Capacity Optimization | `/radiology/optimization` | How can the hospital reduce imaging delays and recover feasible capacity? |

No merge required — purposes do not overlap. Equipment utilization, reporting, and capacity scenarios are not headline content on Command.

---

## 2–4. KPI ownership matrix & counts

Primary KPI IDs live in `frontend/src/core/radiologyOwnership.ts`.

| Screen | KPI count | Display labels |
|---|---:|---|
| Command | 5 | Imaging Requests, Completed Exams, Completion Rate, Urgent Exam Share, Pending Exams |
| Access | 6 | Imaging Backlog, Median Access Wait, P90 Access Wait, Overdue Imaging, Waitlist Growth, Within Access Target |
| Utilization | 5 | Scanner Utilization, Unused Hours, Median Exam Time, Scanner Downtime, Schedule Adherence |
| Quality | 6 | Median Report TAT, P90 Report TAT, Reports Over Target, Unsigned Reports, Repeat Exam Rate, Critical Ack. Rate |
| Optimization | 3 | Recoverable Hours, Additional Exams, Eligible Waitlist |
| **Total** | **25** | Unique primary owners — zero cross-screen headline duplicates |

Access gain % lives in Optimization KPI Details (not a second headline for the same improvement). Full business names + formulas open in KPI Details.

---

## 5. Duplicate KPI / chart audit

Automated: `assertUniqueRadiologyOwnership()` — **PASS**.

Cross-domain forbidden displays (Bed Occupancy, OR Utilization, Slot Fill Rate, Surgical Backlog, etc.) — **PASS** (not present as Radiology headlines). ED/IPD/OPD/Surgery referenced only as care-setting demand or constraint context.

Cancelled Exams retained as chart/outcome series on Command, not as a sixth headline (Completion Rate + Pending Exams cover the decision).

---

## 6. Chart ownership registry

| Screen | Chart count | Titles |
|---|---:|---|
| Command | 5 | Imaging Demand Trend; Exam Outcomes; Completed Exams by Modality; Imaging Demand by Care Setting; Urgent vs Routine Mix |
| Access | 6 | Imaging Backlog Trend; Wait Time by Modality; Backlog by Priority; Access Wait Bands; New Demand vs Completed Waitlist; Overdue Exams by Modality |
| Utilization | 6 | Utilization by Scanner; Staffed vs Used Hours; Utilization by Modality; Downtime Reasons; Exam Duration by Modality; Monthly Scanner Utilization |
| Quality | 6 | Report TAT Trend; Report TAT by Modality; Unsigned Report Aging; Repeat Exams by Modality; Reporting Workload by Care Setting; Critical Result Communication |
| Optimization | 5 | Recoverable Hours by Driver; Current vs Scenario Capacity; Additional Exams by Modality; Access Backlog Reduction; Capacity Constraints |
| **Total** | **28** | Each chart has a unique business question |

---

## 7–11. Synthetic source facts & methodologies

`buildRadiologyView(hospital, year, period)` derives from `scenarioFor` `radOrders` / `radReported` / `radCancelled` / `radNoShow` / modality keys + `scannerInventory(beds)`.

**Identities (tested in `radiology-reconcile.test.ts`):**
- Completed + Cancelled + No-show + Pending = Requests — **PASS**
- Urgent + Routine = Requests; care-setting and modality request sums = Requests — **PASS**
- Waitlist: Opening + Added − CompletedFromWaitlist − OtherExits = Closing — **PASS**
- Monthly opening[i+1] = monthly closing[i] — **PASS**
- Quarters sum to annual for flow counts; backlog is a snapshot (not summed) — **PASS**
- Staffed = in-session used + downtime + unused; overtime separate; scanner rows reconcile to hospital — **PASS**
- Recoverable hours = exclusive drivers; bed haircut applied once afterward — **PASS**
- Additional Exams ≤ Eligible Waitlist and ≤ hour-feasible potential — **PASS**
- Modality exam durations distinct (MRI > X-ray) — **PASS**

**Access clock:** request-to-exam for eligible waitlist cases. Illustrative 14-day target — not a national standard.  
**Utilization:** used exam hours ÷ staffed scanner hours (uncapped).  
**Report TAT:** final signature − exam completion. Unsigned reports use aging bands — no completed TAT.  
**Critical acknowledgement:** distinct from signature.

---

## 12. Modality aggregation (H1 · 2026 year)

Four modalities modeled with coherent equipment, duration, and backlog: X-ray, CT, Ultrasound, MRI. Scanner inventory scales with site beds. MRI wait leads hospital median in the snapshot (9.2 d vs 6.8 d hospital).

---

## 13. Six What-if scenarios

| # | Scenario | Result |
|---|---|---|
| 1 | Reduce MRI exam duration | **PASS** — prep/safety/turnover constrained; illustrative |
| 2 | Reduce CT scanner downtime | **PASS** — recoverable share only; illustrative |
| 3 | Extend staffed imaging hours | **PASS** — workforce limit applied; not unstaffed capacity |
| 4 | Reduce report turnaround | **PASS** — reporting separate from scanner capacity |
| 5 | Reallocate routine imaging slots | **PASS** — total hours conserved; no MRI→CT conversion without shared resources |
| 6 | Prioritize eligible imaging backlog | **PASS** — operational rules only; no clinical auto-prioritization |

All outputs labeled illustrative / not achieved capacity — **PASS**.

---

## 14. Vital Assist verification

Radiology domain path, page, hospital, year, period context — **PASS**.  
Sample questions (longest waits, low utilization, downtime, report TAT, unsigned, feasible exams, priorities) — **PASS** via `radiology-reconcile.test.ts`.  
Cross-domain boundary refusals — **PASS**.  
What-if prompts in Copilot Prediction tab — **PASS** (six Radiology prompts).

---

## 15. Alert verification

Eight Radiology rules bound to `buildRadiologyView` / `bindKpi` values — **PASS**:

Growing imaging backlog · Prolonged MRI access wait · High CT scanner downtime · Low scanner utilization · Report turnaround delay · High unsigned report backlog · Elevated repeat exam rate · Critical result communication delay

Alert/KPI value consistency tested — **PASS**.

---

## 16. Management decision workflow

KPI → Investigate → Vital Assist → Review → Forecast/What-if → Actions → Decide → Follow-up — **PASS** (same platform workflow; Radiology decision signal `radiology`). AI does not change imaging schedules alone.

---

## 17. Desktop screenshots

Local/production browser capture folder: `docs/visual-after/radiology-domain/` (populate after Pages hard-refresh verification).

Widths in scope: 1280 / 1440 / 1920 — **PASS** via existing design system (no mobile redesign). KPI labels use short display titles (max two lines) — ownership table.

---

## 18. Cross-domain regression

`npm test` — **182 passed** including Surgery, Appointments, recovery (7 domains / 26 screens), facts catalog (415 KPIs). Six approved domains unchanged in business layout/styling — **PASS**.

---

## 19. Remaining limitations

- Access wait median/P90 are constructed illustrative quantiles (not patient-level wait distributions).
- Report TAT monthly series is illustrative mixture, not a true patient-level quantile roll-up across months.
- Care-setting reporting workload chart uses request volumes as a demand proxy.
- Bed occupancy appears only as Optimization constraint context — Beds remains the owner.
- Repeat exams are process signals; not every repeat is a quality failure.
- Theoretical recoverable hours are not claimed as achieved capacity.

---

## 20. Commit hash and production build identifier

| Item | Value | Status |
|---|---|---|
| BUILD_ID | `v64-radiology` | **PASS** |
| Bundle | `index-DohGkQVM.js` | **PASS** (local build) |
| Automated tests | 182/182 | **PASS** |
| Production deploy | GitHub Pages after push | see verification below |
| Production hard-refresh routes | `/radiology` + 4 children | pending browser verify post-push |

### Production verification checklist

| Check | Status |
|---|---|
| All Radiology pages function | **PASS** (local build + routes) |
| Every KPI one primary owner | **PASS** |
| No unnecessary duplicate charts | **PASS** |
| Source facts reconcile | **PASS** |
| Imaging backlog consistent across months | **PASS** |
| Equipment/staff hours reconcile | **PASS** |
| Report TAT uses correct timestamps | **PASS** |
| Quality denominators valid | **PASS** |
| Alerts match KPI bind values | **PASS** |
| Vital Assist context | **PASS** |
| Six What-if scenarios | **PASS** |
| Decision workflow | **PASS** |
| Six approved domains unchanged | **PASS** |
| Production browser-verified | **NOT TESTED** until post-deploy hard refresh |

---

## Verdict

Radiology & Diagnostic Imaging Intelligence is ready for product-owner review once production Pages hard-refresh confirms the `v64-radiology` / `index-DohGkQVM.js` shell on all five routes.
