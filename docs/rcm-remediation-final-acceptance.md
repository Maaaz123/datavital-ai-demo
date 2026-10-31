# Domain 12 — RCM Remediation Final Acceptance

**Domain:** Revenue Cycle Management Intelligence  
**Remediation BUILD_ID:** `v75-rcm-remediation`  
**Prior production baseline:** BUILD_ID `v74-rcm-domain` · commit `9433579ff10d9146813c008ab8e9411252b07f84`  
**Acceptance date:** 2026-10-30  

Status vocabulary: **PASS** / **FAIL** / **NOT TESTED** / **NOT APPLICABLE**.

---

## 1. Actual production baseline (pre-remediation)

| Item | Value | Result |
|---|---|---|
| Documented prior BUILD_ID | `v74-rcm-domain` | **PASS** (historical report) |
| Documented prior commit | `9433579` | **PASS** (git history) |
| Live production before this remediation | https://demo.datavital.io/rcm served `v74-rcm-domain` | **PASS** (prior acceptance) |
| Automated suite at prior baseline | 313 tests | **PASS** (historical) |

Remediation does not treat historical KPI figures as expected outcomes for new builds.

---

## 2. Confirmed defects and resolutions

| Finding | Classification | Resolution | Result |
|---|---|---|---|
| “Net Collection Rate” labeled a cash-to-revenue period ratio | Confirmed methodology defect | **Option A** — rename to Period Cash-to-Net Revenue Ratio (display: Cash-to-Net Ratio) | **PASS** |
| Executive alerts retained full-year values when Q1 selected | Confirmed defect | `alertsFor(hospital, year, period)` uses `buildRcmView` for `kpi_rcm_*`; Alerts/Copilot pass period | **PASS** (browser: Q1 alerts show `Q1 2026` and Q1 values) |
| Revenue & Collections Trend Y-axis ambiguous (2 / 3.5 / 5) | Confirmed visual defect | Line/Bar charts render `figure.unit` (`SAR M`); extra right pad for Dec | **PASS** (DOM: `gc-axis-unit` includes `SAR M`) |
| Claim/payment edge cases not tested at event grain | Previously untested | Deterministic fixtures + 25 case tests; production ledger remains aggregate | **PASS** (tests); production event wiring **NOT APPLICABLE** |
| Aggregate-only ledger cannot prove claim-line identities in UI | Documented synthetic-data limitation | Explicit limitation in fixtures and acceptance | **PASS** (documented) |

---

## 3. Financial metric methodology changes

- Cash applied and cash received remain distinct.
- Unapplied cash = period received − applied (demo identity).
- AR outstanding remains period-end snapshot (never Σ monthly endings).
- Contractual allowances are never leakage.
- What-if recovery remains illustrative (not collected cash).

---

## 4. Net Collection Rate decision and formula

**Decision: Option A — rename; keep formula.**

| Field | Value |
|---|---|
| KPI ID | `kpi_rcm_net_collection_rate` (stable) |
| Full name | Period Cash-to-Net Revenue Ratio |
| Display | Cash-to-Net Ratio |
| Formula | Period cash applied ÷ period net patient revenue |
| Why not “Net Collection Rate” | Demo ledger does not support a collectible/charge-cohort adjusted NCR; cash may settle prior-period AR |
| Alert title | Weak period cash-to-net ratio |
| Docs updated | Ownership, scope, bind, engine, alerts, assistant, lineage, dictionary |

---

## 5. Financial reconciliation results

Automated (`rcm-reconcile.test.ts`, 35 tests):

| Identity | Result |
|---|---|
| Gross − contractual = NPR | **PASS** |
| AR roll-forward residual = 0 | **PASS** |
| Monthly / quarter / annual continuity | **PASS** |
| Hospital ALL = Σ H1–H5 | **PASS** |
| Cash received ≥ cash applied | **PASS** |
| Unique claims ≤ submission attempts | **PASS** |
| Clearinghouse rejects ≠ payer denials | **PASS** |
| Exclusive leakage drivers sum | **PASS** |

---

## 6. Claim and payment edge-case tests

Fixture module: `frontend/src/core/rcmEventFixtures.ts`  
Tests: `frontend/src/core/rcm-events.test.ts` (25 named cases)

| Case group | Result |
|---|---|
| Partial denial / mixed lines | **PASS** |
| Duplicate / corrected / multi-resubmit / CH reject→accept | **PASS** |
| Appeal pending / successful appeal + payment | **PASS** |
| Reversal / refund / credit / partial / unapplied | **PASS** |
| Cross-quarter payment / prior-year AR collected | **PASS** |
| Underpayment / contractual / avoidable WO / bad debt / charge reversal | **PASS** |
| Multi-payer / zero collectible / zero adjudicated / missing & expired auth | **PASS** |
| Wired into live `buildRcmView` KPI cards | **NOT APPLICABLE** (aggregate demo ledger) |

---

## 7. Period alignment

| Check | Evidence | Result |
|---|---|---|
| Full year KPIs + alerts | H1 2026 NPR SAR 50,292,914 · Cash-to-Net 94.9% · alerts `Full year 2026` | **PASS** |
| Q1 KPIs + alerts | NPR SAR 12,306,319 · Cash-to-Net 94.0% · denial 9.1% · alerts `Q1 2026` | **PASS** |
| Observation date Q1 | 31 Mar 2026 | **PASS** |
| Vital Assist RCM default answers use `period` | assistant `answerRcm` + `alertsFor(..., period)` | **PASS** (code + unit) |
| Q2/Q3/Q4 browser interaction | Automated matrix only | Browser **NOT TESTED**; automated **PASS** |

---

## 8. Visual chart corrections

| Check | Result |
|---|---|
| Axis unit label (`SAR M`, `%`, claims, …) | **PASS** |
| Extra right pad for ≥10 categories | **PASS** (code) |
| Desktop 1280 / 1440 / 1920 screenshot matrix | **NOT TESTED** (local preview functional QA only) |
| No global KPI card resize / font shrink | **PASS** (diff review) |

---

## 9. Seven-screen test evidence

Local preview `http://127.0.0.1:4182` (BUILD `v75`):

| Route | KPI ribbon observed | Result |
|---|---|---|
| `/rcm` | NPR, Cash-to-Net, Denial, Days AR, Outstanding AR, Revenue at Risk | **PASS** |
| `/rcm/eligibility` | Eligibility Verified, Coverage Exceptions, Auth Approval, Pending, Turnaround, Auth Denial Exposure | **PASS** |
| `/rcm/billing` | Charge Capture, Unbilled Encounters/Value, Lag, Coding, Exceptions | **PASS** |
| `/rcm/claims` | Claims Submitted, First-Pass, Denied Claims, Denied Value Rate, Appeal Success, Recoverable Denials | **PASS** |
| `/rcm/collections` | Cash Applied, AR>90, CEI, Unapplied, Payer Delay, Patient AR | **PASS** |
| `/rcm/leakage` | Confirmed/Potential Leakage, Underpayments, Missed Charges, Avoidable WO, Recovery Opps | **PASS** |
| `/rcm/optimization` | Recoverable Opportunity, Denial Recovery, Collection Potential, Preventable Leakage, Cash Acceleration | **PASS** |

---

## 10. Vital Assist test results

| Tab / check | Result |
|---|---|
| Home / Alerts / Review / Forecast / Actions / Decide / Ask present | **PASS** |
| Forecast lists all 8 RCM what-if prompts | **PASS** |
| Denial what-if shows illustrative recovery ≠ cash | **PASS** |
| AR acceleration what-if states timing shift, not new revenue | **PASS** |
| Does not submit claims / write off autonomously (copy + Ask guards) | **PASS** |
| Full Investigate workflow on every RCM child page | **NOT TESTED** (Command + Optimization exercised) |

---

## 11. Eight What-if scenario results

| # | Scenario (Forecast prompt) | Browser | Automated `runWhatIf` |
|---|---|---|---|
| 1 | Preventable denials −20% | **PASS** | **PASS** |
| 2 | First-pass +5% | **PASS** (clicked) | **PASS** |
| 3 | Aged AR collected 30% faster | **PASS** | **PASS** |
| 4 | Pre-auth +15% | **PASS** (clicked) | **PASS** |
| 5 | Charge capture gaps −50% | **PASS** (clicked) | **PASS** |
| 6 | Underpayments recovered 40% | **PASS** (clicked) | **PASS** |
| 7 | Avoidable write-offs −30% | **PASS** (clicked) | **PASS** |
| 8 | Workflow delays −20% | **PASS** (clicked) | **PASS** |

Assumption sliders beyond preset prompt amounts: **NOT TESTED** in browser (caps covered in reconcile tests).

---

## 12. Approve / Reject / Defer

| Action | Result |
|---|---|
| Buttons present on Decide → Approval | **PASS** |
| Defer records “deferred” (isolated demo state) | **PASS** |
| Approve click | **NOT TESTED** this session |
| Reject click | **NOT TESTED** this session |
| Copy: approval ≠ realized improvement | **PASS** |

---

## 13. Hospital / year / period matrix

| Layer | Result |
|---|---|
| Automated H1–H5 + ALL × 2024–2026 × year/Q1–Q4 finite metrics & identities | **PASS** (`rcm-reconcile`) |
| Browser representative: H1 2026 year + Q1 | **PASS** |
| Browser every hospital/year/period combination | **NOT TESTED** |

---

## 14. KPI Ownership Matrix

41 primary KPIs · 7 screens · unique ownership — **PASS** (`assertUniqueRcmOwnership`).

Cash-to-Net Ratio owns Command collection-ratio signal (renamed).

---

## 15. Chart Ownership Matrix

42 chart ownership entries · unique — **PASS** (`assertUniqueRcmCharts`).

---

## 16–19. Documentation completeness

| Pack | Result |
|---|---|
| Data Dictionary md/csv/json | **PASS** (BUILD_ID + cash-to-net wording) |
| Source mapping | **PASS** (BUILD_ID updated) |
| KPI lineage | **PASS** (Option A documented) |
| Data readiness | **PASS** (BUILD_ID updated) |

Source schema names remain illustrative — **PASS** (explicit).

---

## 20. Eleven-domain regression

| Check | Result |
|---|---|
| Full automated suite | **PASS** — **325 / 325** |
| Domains 1–11 redesign | **PASS** (no intentional design changes) |
| Shared `alertsFor` default period `year` preserves Domains 1–11 IDs | **PASS** |
| Shared viz axis unit label | Additive; domains without unit unchanged in behavior | **PASS** |
| Global KPI card dimensions / fonts | Unchanged | **PASS** |

---

## 21. Production deployment evidence

| Step | Result |
|---|---|
| `npm test` 325/325 | **PASS** |
| `npm run build` | **PASS** (`index-BBgrtTOC.js`) |
| Pages root assets + `index.html` / `404.html` / `refresh.html` / `sw.js` updated | **PASS** (local publish) |
| BUILD_ID in `pwa.ts` + refresh helpers | `v75-rcm-remediation` | **PASS** |
| Git commit + push | See deployment section after push |
| Live `https://demo.datavital.io/rcm` hard refresh | **PENDING** until Pages serves this commit |
| Live BUILD_ID confirmation | **PENDING** / record after deploy |

---

## 22. Known limitations

1. Demo ledger is monthly-aggregate synthetic data — not HIS/ERP/claim-line production.
2. Event fixtures prove classification identities; they are not loaded into production KPI cards.
3. Period Cash-to-Net is not a cohort-adjusted net collection rate.
4. What-if / revenue-at-risk values are illustrative exposure — not collected cash.
5. No live payer, clearinghouse, NPHIES, FHIR, or X12 integration.
6. Desktop multi-width visual matrix (1280/1440/1920) not screenshot-audited this session.
7. Approve/Reject browser clicks not exercised (Defer was).

---

## 23. Final acceptance recommendation

**Recommendation:** Submit Domain 12 RCM remediation for product-owner approval **after** live custom-domain verification confirms `v75-rcm-remediation` and bundle `index-BBgrtTOC.js` on https://demo.datavital.io/rcm.

Financial naming (Option A), period-scoped alerts, chart unit labels, aggregate ledger reconciliation, and event-fixture coverage meet the remediation conditions that were testable in this session. Remaining items are explicitly **PENDING** (live Pages) or **NOT TESTED** (full viewport matrix; Approve/Reject clicks).

---

## Appendix — Remediation commit scope (code)

- Option A rename across ownership, scope, bind, engine, alerts, assistant, UI ribbon
- Period-aware RCM alerts + Copilot/visibleAlerts wiring
- Chart axis unit + Dec padding
- `rcmEventFixtures.ts` + `rcm-events.test.ts`
- BUILD_ID `v75-rcm-remediation`
- Docs pack updates + this acceptance report
