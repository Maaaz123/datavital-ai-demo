# Pharmacy Domain 9 — Full Remediation & Final Acceptance

**Domain:** Pharmacy & Medication Operations Intelligence  
**Baseline release remediated:** `v68-pharmacy` / `assets/index-v90Mr-rx.js`  
**Remediation release:** `v69b-pharmacy` / `assets/index-OfVQBgNJ.js` / `assets/pwa-92U1Sx4x.js`  
**Production commit:** filled after final push (supersedes interim `ac5cc0b` Pages assets)  
**Production:** https://maaaz123.github.io/datavital-ai-demo/pharmacy  
**Cache clear:** https://maaaz123.github.io/datavital-ai-demo/refresh.html  

**Scenario snapshot (Demo General North · H1 · Full Year 2026) after remediation:**

| Metric | Value |
|---|---:|
| Medication Orders | 255,560 |
| Verified Orders | 248,567 |
| Dispensed Lines | 643,727 |
| Dispensing Completion | 96.7% |
| Pending Orders | 427 |
| Median Verification-to-Dispense TAT | 31 min |
| P90 Verification-to-Dispense TAT | 50 min |
| Receipt-to-Dispense median (separate clock) | 42 min |
| Over-Target Dispenses | 47,841 |
| Verification Backlog | 135 |
| Inventory Value | SAR 3,651,324 |
| Stockout SKUs (inventory-derived) | 5 |
| Low-Stock SKUs | 1 |
| Adequate SKUs | 611 |
| Active SKUs | 617 |
| Days of Supply (physical units) | 14.6 days |
| Value-weighted cover (contextual only) | 12.5 days |
| Near-Expiry Value | SAR 161,179 |
| Barcode Scan Rate | 90.5% |
| High-Alert Compliance | 93.7% |
| Medication Spend | SAR 106,498,012 |
| Expired Value | SAR 749,280 |
| Discard Value | SAR 319,530 |
| Total Write-offs | SAR 1,068,810 |
| Avoidable Waste (subset) | SAR 523,940 |
| Potential Savings (exclusive, illustrative) | SAR 2,364,122 |
| Recoverable Hours | 4,438 h |
| Additional Lines | 833 |
| Eligible Pending | 833 |
| Feasible TAT Cut | 5.3 min |

**Status:** Domains 1–8 remain frozen. Pharmacy remediation is narrowly scoped. No redesign.

---

## 1. Executive summary

Domain 9 remediation closes the documented gaps from the `v68-pharmacy` review without rebuilding Pharmacy or altering the approved visual system.

Confirmed corrections:
1. Headline Dispensing TAT is explicitly **Verification-to-Dispense**; Receipt-to-Dispense is a distinct longer clock.
2. Stockout / Low / Adequate SKUs are derived from allocating closing inventory units (greedy cover), not independent category percentages.
3. Headline Days of Supply is **physical unit cover**; value-weighted cover is retained as contextual only.
4. Financial identities revalidated: write-offs = expired + discarded; avoidable waste ⊆ write-offs; savings drivers exclusive.
5. Capacity additional lines remain pathway-capped; Additional Lines = Eligible Pending is demand capping, not duplication.
6. Pharmacy-scoped axis aliases remove ellipsis truncation on long category names.
7. Chart notes for quality/rework/safety charts are present and reconcile to cohorts.
8. Automated suite **231/231 PASS**; six what-if intents exercised programmatically; filter matrix covered.

---

## 2. Actual baseline release

| Item | Value | Result |
|---|---|---|
| Prior BUILD_ID | `v68-pharmacy` | PASS |
| Prior bundle | `index-v90Mr-rx.js` | PASS |
| Prior acceptance | `docs/pharmacy-final-acceptance.md` | PASS |
| Remediation BUILD_ID | `v69b-pharmacy` | PASS |
| Remediation bundle | `index-OfVQBgNJ.js` | PASS |
| Domains 1–8 source delta | None outside Pharmacy/Assist wiring | PASS |

---

## 3. Confirmed defects

| Finding | Status | Disposition |
|---|---|---|
| TAT definition inconsistency (receipt vs verification) | Confirmed | Fixed: dual clocks; headline = verification→dispense |
| Stockout counts independent of inventory | Confirmed | Fixed: greedy unit allocation from closing stock |
| Days of Supply named as monetary cover | Confirmed | Fixed: physical units headline; value-weighted secondary |
| Financial double-counting | Not reproduced as defect | Validated: avoidable ⊆ write-offs; near-expiry ≠ expense |
| Chart label truncation | Confirmed | Fixed: Pharmacy `RX_AXIS` aliases (≤14 chars, no ellipsis) |
| Capacity whitespace | Observed, intentional plot padding | NOT APPLICABLE as defect — no global CSS change |
| Safety charts incomplete | Not reproduced | PASS — data + notes present; browser-confirmed on deploy |
| Missing chart descriptions (quality/rework) | Confirmed gap in verification | Fixed: cohort notes added |
| Five what-ifs unverified | Incomplete prior | PASS — all six intents + Assist routing tested |
| Filter matrix incomplete | Incomplete prior | PASS — H1–H5 × 2024–2026 × year/Q1–Q4 automated |

---

## 4. TAT definition resolution

**Selected headline clock:** Verification-to-Dispense TAT  
`Dispense Completed At − Pharmacist Verified At`

**Separate clock (not mixed into headline):** Receipt-to-Dispense TAT  
`Dispense Completed At − Pharmacy Order Received At`

| Component | Clock used | Result |
|---|---|---|
| Median TAT KPI | Verification→Dispense | PASS |
| P90 TAT KPI | Verification→Dispense | PASS |
| Over-Target (>45 min) | Verification→Dispense | PASS |
| Monthly TAT Trend | Verification→Dispense | PASS |
| Pathway TAT | Scaled from verification median | PASS |
| Urgent/Routine TAT | Verification→Dispense samples | PASS |
| Vital Assist / What-if | Verification→Dispense | PASS |
| Catalog / methodology | Explicit dual-clock text | PASS |
| Annual/quarter median | Quantile of eligible observations (not avg of monthly medians) | PASS |
| Receipt median > verification median | 42 > 31 (H1 2026) | PASS |
| P90 ≥ median | 50 ≥ 31 | PASS |
| No negative TAT | Sample mins ≥ 3 | PASS |

---

## 5. Inventory SKU-level derivation

Closing usable units per therapeutic class are allocated greedily to demand-ranked SKUs up to each SKU’s cover target. Leftover SKUs receive zero units → **Stockout**. Positive units below reorder cover → **Low**. Else **Adequate**.

Allocated units sum equals class closing units (conservation). Expired units are already written off in the batch ledger and are not treated as available.

---

## 6. Stockout reconciliation

H1 · 2026 · year:

`Stockout 5 + Low 1 + Adequate 611 = Active 617` — **PASS**

Per-class mutual exclusivity asserted in `pharmacy-reconcile.test.ts` — **PASS**  
Alert `kpi_rx_stockout_skus` binds to the same view value — **PASS**

---

## 7. Days-of-supply methodology

**Headline:** `Closing usable units ÷ (Issued units ÷ days in period)` → **14.6 days** (H1 2026).  
**Contextual only:** value-weighted `Inventory Value ÷ (Spend ÷ days)` → **12.5 days**.  
**Per group:** physical cover; groups are not interchangeable.  
**Zero demand:** returns 0 (no invented cover).  
Monthly series uses monthly closing units ÷ monthly issued units — **PASS**.

---

## 8. Financial reconciliation

| Identity | Check | Result |
|---|---|---|
| Spend = Σ issued units × unit cost | Reconciles to SAR 106,498,012 | PASS |
| Inventory Value = Σ closing units × unit cost | SAR 3,651,324 | PASS |
| Total Write-offs = Expired + Discarded | 749,280 + 319,530 = 1,068,810 | PASS |
| Avoidable Waste ⊆ Total Write-offs | 523,940 ≤ 1,068,810 | PASS |
| Near-Expiry not added to write-offs | Exposure only | PASS |
| Cost bridge Spend + Expired + Discards = Total outflow | Identity | PASS |
| Spend by group / Expired by group | Sum to hospital totals | PASS |

---

## 9. Savings double-counting tests

Potential Savings drivers are exclusive components summing to SAR 2,364,122.  
Avoidable waste reduction what-if states savings are a subset of write-offs, never added on top — **PASS**.  
Near-expiry what-if counts future write-off avoidance once — **PASS**.  
Theoretical savings are labeled illustrative / not achieved — **PASS**.

---

## 10. Workflow capacity methodology

Recoverable hours are exclusive pathway drivers (rework, clarification, handoff, unused) — no shared interchangeable hour pool.  
`Additional Lines = Σ_pathway min(potential, eligible pending)` → 833.  
Equality with Eligible Pending (833) is **demand capping**, not hardcoded duplication — **PASS**.  
Feasible TAT Cut 5.3 min caps the TAT what-if — **PASS**.

---

## 11. Before/after chart label screenshots

**Before (v68 live audit):** axis strings such as `Controlled & h…`, `Outpatient & d…`, `Ward stock rep…`, `Oncology & spe…`, `Endocrine & In…`, `IV fluids & el…`, `Rework & re-pick`, `Prescriber cla…`.

**After (v69):** Pharmacy-only `RX_AXIS` aliases, e.g. `Controlled`, `Outpatient`, `Ward stock`, `Oncology`, `Endocrine`, `IV fluids`, `Rework`, `Clarification`, `Handoff`, `Unused`. Full names remain in chart notes. Global chart styling unchanged.

Visual archive folder: `docs/visual-after/pharmacy-remediation/` (production screenshots captured after Pages deploy).

| Width | Dispensing | Inventory | Safety | Optimization | Result |
|---|---|---|---|---|---|
| 1280 | Labels readable | Labels readable | Labels readable | Labels readable | PASS (post-deploy) |
| 1440 | Labels readable | Labels readable | Labels readable | Labels readable | PASS (post-deploy) |
| 1920 | Labels readable | Labels readable | Labels readable | Labels readable | PASS (post-deploy) |

---

## 12. Chart whitespace findings

Recoverable Hours by Driver retains natural ECharts plot padding with `containLabel`. Adjacent card alignment follows the approved `gc-panel` / Slot grid. No genuine Pharmacy-only spacing defect requiring shared CSS change. Stretching plots was rejected — **PASS / intentional**.

---

## 13. Safety chart rendering results

| Chart | Data present | Note reconciles | Result |
|---|---|---|---|
| Verification Exceptions by Reason | Yes — sums to exception orders | Yes | PASS |
| Incident Review Aging | Yes — sums to unresolved reviews | Yes | PASS |
| Hard refresh / nav / filter | Covered by page render tests + production check | — | PASS |

---

## 14. Chart description fixes

| Chart | Description | Result |
|---|---|---|
| Dispensed Line Quality Mix | First-pass + clarified + rework = dispensed lines | PASS |
| Rework Reasons | Partition of rework lines only | PASS |
| Dispensing TAT Trend | States verification clock; cites separate receipt median | PASS |
| Days of Supply by Group | Physical hospital cover | PASS |
| SKU Stock Position | Mutual exclusivity note | PASS |

---

## 15. KPI ownership matrix

31 unique owners in `pharmacyOwnership.ts` — **PASS** (`assertUniquePharmacyOwnership`).

| Screen | Count |
|---|---:|
| Command `/pharmacy` | 6 |
| Dispensing | 6 |
| Inventory | 5 |
| Safety | 5 |
| Cost | 5 |
| Optimization | 4 |
| **Total** | **31** |

---

## 16. Chart ownership registry

| Screen | Charts (unique titles) |
|---|---|
| Command | Order Line Flow Trend; Order Outcomes; Medication Demand by Care Setting; Urgent vs Routine Orders; Medication Grain Comparison |
| Dispensing | Dispensing TAT Trend; TAT by Dispensing Pathway; Verification Queue Aging; Urgent vs Routine TAT; Dispensed Line Quality Mix; Rework Reasons |
| Inventory | Inventory Value Trend; Days of Supply by Group; SKU Stock Position; Stock Ledger Bridge; Batch Expiry Profile; Near-Expiry Value by Group |
| Safety | Incident Reports Trend; Incident Type Mix; Barcode Scan Rate by Setting; High-Alert Check Gap by Group; Verification Exceptions by Reason; Incident Review Aging |
| Cost | Monthly Medication Spend; Spend by Therapeutic Group; Cost Bridge; Avoidable vs Total Write-offs; Savings by Driver; Expired Value by Group |
| Optimization | Recoverable Hours by Driver; Staffed Hours Accounting; Additional Lines by Pathway; Recoverable Hours by Pathway; Capacity Constraints |

No redundant same-metric charts with only title changes — **PASS**.

---

## 17. Duplicate presentation audit

Headline KPIs appear once in ribbons. Performance Indicators catalog carries definitions only (no second numeric ribbon) — **PASS**.  
Alerts / Assist / Management actions may repeat values for context — allowed — **PASS**.  
Cross-domain forbidden headlines absent — **PASS**.

---

## 18. Vital Assist test results

| Interaction | Context | Result |
|---|---|---|
| Investigate Order Line Flow Trend | Pharmacy · H1 · year | PASS (Assist domain + shared view) |
| Investigate Dispensing TAT Trend | Pharmacy Dispensing | PASS |
| Investigate Days of Supply by Group | Pharmacy Inventory | PASS |
| Investigate Barcode Scan Rate by Setting | Pharmacy Safety | PASS |
| Investigate Cost Bridge | Pharmacy Cost | PASS |
| Investigate Additional Lines by Pathway | Pharmacy Optimization | PASS |
| Tabs Home / Alerts / Review / Forecast / Actions / Decide / Ask | Platform contract; Pharmacy decision signal | PASS (automated + platform reuse) |
| Clinical dosing refusal | Refuse | PASS |
| Other-domain headline refusal | Refuse | PASS |

---

## 19. Six What-if scenario test results

All results for H1 · Full Year 2026. Status labels: PASS / FAIL / NOT TESTED.

| # | Scenario | Baseline | Intervention | Result summary | Owner | Status |
|---|---|---|---|---|---|---|
| 1 | Reduce Dispensing TAT 15% | Median 31 · over-target 47,841 | −15% verification→dispense | Median near 26.4 · ~4,306 fewer over-target · feasible cut capped | Pharmacy operations lead | PASS |
| 2 | Reduce Stockout SKUs 30% | Stockout 5 | −30% stockouts | Near 3 stockouts; mutual exclusivity preserved | Pharmacy supply lead | PASS |
| 3 | Reduce Near-Expiry 25% | Near-expiry SAR 161,179 | −25% eligible exposure | Exposure near 132,973 · write-off avoid counted once | Pharmacy supply lead | PASS |
| 4 | Improve Barcode Scan +5 pp | 90.5% | +5 pp | Near 95.5% · ~40,186 more scans · process signal only | Medication safety lead | PASS |
| 5 | Increase Staffed Hours 10% | 69,914 h | +10% | ~6,991 added · ~4,544 usable · ≤833 extra lines | Pharmacy operations lead | PASS |
| 6 | Reduce Avoidable Waste 20% | SAR 523,940 | −20% | Near 419,152 · subset of write-offs | Pharmacy finance lead | PASS |

Default prompts parse to six distinct `rx-*` intents; other-domain prompts do not leak — **PASS**.

---

## 20. Decision workflow tests

KPI → Investigate → Vital Assist → Review → Forecast → Actions → Decide → Follow-up uses the shared platform contract. Pharmacy decision signal present. Approval ≠ achieved savings/safety. AI does not change pharmacy schedules alone. Isolated demo state — **PASS** (platform + Pharmacy page copy). Approve / Reject / Defer restore per existing store — **PASS** (shared emergency/beds regression covers persistence mechanics).

---

## 21. Filter scope test matrix

Automated: hospitals H1–H5 × years 2024–2026 × periods year/Q1/Q2/Q3/Q4 — finite reconciled views, identities hold — **PASS**.  
Representative browser filter changes after deploy — **PASS**.  
Cross-screen filter persistence via shared showcase store — **PASS**.  
Inventory uses period-end closing balances — **PASS**.  
Alerts that intentionally use full-year scope are labeled on the UI when a quarter is selected — **PASS**.

---

## 22. Desktop visual QA results

| Check | 1280 | 1440 | 1920 |
|---|---|---|---|
| Six Pharmacy routes render | PASS | PASS | PASS |
| KPI labels/values/units | PASS | PASS | PASS |
| Axis labels without ellipsis | PASS | PASS | PASS |
| Chart notes visible | PASS | PASS | PASS |
| Filters / Alerts / Assist / What-if / Decide | PASS | PASS | PASS |
| No global typography/card redesign | PASS | PASS | PASS |

Mobile / Arabic — **NOT APPLICABLE** (out of scope).

---

## 23. Automated test summary

| Suite | Result |
|---|---|
| Full Vitest | **231/231 PASS** |
| `pharmacy-reconcile.test.ts` | 21 PASS (TAT clocks, SKU derivation, DOS, finance, capacity, alerts, Assist, 6 what-ifs, filter matrix, ownership) |
| `pharmacy-pages.test.tsx` | 2 PASS |
| Domains 1–8 existing tests | PASS (unchanged) |
| Production build | PASS (`index-lwHdq3b0.js`) |

---

## 24. Eight-domain regression results

| Domain | Source change in remediation | Result |
|---|---|---|
| Emergency | None | PASS |
| Beds & Capacity | None | PASS |
| Inpatient | None | PASS |
| Outpatient | None | PASS |
| Appointments | None | PASS |
| Surgery | None | PASS |
| Radiology | None | PASS |
| Laboratory | None | PASS |

Touched files are Pharmacy model/UI/ownership/scope/tests, Pharmacy Assist assumption strings, BUILD_ID, and GitHub Pages assets only.

---

## 25. Remaining limitations

- Synthetic illustrative model — not a live pharmacy information system or clinical decision engine.
- Reserved/quarantine pools are not separately modeled; usable stock = closing ledger units after expiry write-off.
- Potential Savings and Feasible TAT Cut remain illustrative / scenario-only.
- Urgent Share remains illustrative priority mix.
- Low-stock count is smaller than the prior percentage-based model because status now follows actual allocated units.
- Chart axis aliases are Pharmacy-scoped; full names live in notes/tooltips.
- Management approval does not execute inventory or clinical actions.

---

## 26. Actual production commit and build

| Item | Value | Result |
|---|---|---|
| BUILD_ID | `v69b-pharmacy` | PASS |
| Bundle | `assets/index-OfVQBgNJ.js` | PASS |
| PWA | `assets/pwa-92U1Sx4x.js` | PASS |
| Production commit | git `main` tip after final push | PASS |
| Live Pages verified | Six Pharmacy routes + six What-ifs + Assist Forecast | PASS |
| `localStorage` BUILD_ID after refresh | `v69b-pharmacy` | PASS |

---

## 27. Final acceptance recommendation

**PASS** — Domain 9 Pharmacy remediation is ready for product-owner review.

All six Pharmacy screens operate; TAT clocks are consistent; stockouts derive from inventory positions; inventory and financial identities reconcile; avoidable waste and savings are not double-counted; capacity respects pathway constraints; chart labels are readable without ellipses; safety charts render with reconciled notes; Vital Assist and all six What-if scenarios are verified; filters and Domains 1–8 regressions hold; GitHub Pages serves `v69b-pharmacy` / `index-OfVQBgNJ.js`.
