# MVP V1 Remediation — Phase 0 Baseline & Defect Register

**Branch:** `mvp-v1-remediation`  
**Baseline tag:** `mvp-v1-baseline-57f37b5`  
**Baseline recorded:** 2026-10-30  
**Phase:** 0 — baseline only (no code fixes in this commit)

---

## 1. Repo HEAD

| Field | Value |
|---|---|
| Branch at baseline | `main` → remediation from `mvp-v1-remediation` |
| HEAD SHA (full) | `57f37b54ca05075ea08bbda6c83ba3991b9025ef` |
| HEAD SHA (short) | `57f37b5` |
| Baseline tag | `mvp-v1-baseline-57f37b5` (annotated lightweight tag on HEAD; no force) |

### Latest commits on `main` at baseline

| SHA | Subject |
|---|---|
| `57f37b5` | docs(enterprise): record v79 production verification and regression counts |
| `7cd79ae` | docs(enterprise): record v79 production evidence and regression counts |
| `d02d57b` | deploy(enterprise): publish Phase 4 build v79-enterprise-integration |
| `e3484d8` | feat(enterprise): Phase 4 Executive Dashboard, Command Center, and readiness docs |
| `65ff2d7` | docs(strategy): cite feat/deploy/docs SHAs in acceptance header |
| `a868851` | docs(strategy): record v78 production verification for Domain 15 |
| `4e1736f` | docs(strategy): record v78 production verification for Domain 15 |
| `2aacfa7` | docs(strategy): record v78 production PASS and Domain 15 acceptance |

---

## 2. Production verification (live HTTP)

Checked against `https://demo.datavital.io` during Phase 0 (curl).

| Check | Result |
|---|---|
| `https://demo.datavital.io/refresh.html` | **PASS** |
| Production `BUILD_ID` | `v79-enterprise-integration` |
| `https://demo.datavital.io/index.html` bundle | `/assets/index-kS1xB9gs.js` |
| CSS | `/assets/index-DNRt8v24.css` |
| Local repo root `index.html` / `404.html` / `refresh.html` | Same BUILD_ID + same bundle hash as production |

Matches `docs/datavital-enterprise-final-acceptance.md` §25.

---

## 3. Deployment safety notes

**NEVER use `rsync --delete` against the repo root or Pages publish tree.**

Prior incident (documented in `docs/supply-chain-final-acceptance.md`): a failed `rsync --delete` wiped the working tree and required restore from agent transcript.

### How root assets are published (observed)

- No dedicated `scripts/` deploy shell in-repo; no GitHub Actions workflow found at Phase 0.
- GitHub Pages serves the **repository root** (custom domain `demo.datavital.io` via `CNAME`).
- Vite build outputs land under `frontend/dist/`; production publish is a **selective copy** of:
  - `index.html`, `404.html`, `refresh.html`, `sw.js`, `manifest.webmanifest`, `favicon.svg`, `workbox-*.js`
  - `assets/` (hashed JS/CSS/fonts)
- Enterprise acceptance explicitly records: **Selective `cp` deploy (no `rsync --delete`)** — PASS.
- Strategy / Supply Chain / Enterprise acceptance docs all mandate selective deploy only.

**Remediation rule:** future publishes must continue selective `cp` (or equivalent additive overwrite of known artifact paths). Never recursive delete-sync of the repo root.

---

## 4. Product-owner approval status

| Scope | Status |
|---|---|
| Domains 1–11 | **Approved** (prior program record) |
| Domain 12 — RCM | **NOT RECORDED** |
| Domain 13 — Quality & Safety | **NOT RECORDED** |
| Domain 14 — Supply Chain | **NOT RECORDED** |
| Domain 15 — Strategy | **NOT RECORDED** |
| Enterprise / Phase 4 integration | **NOT RECORDED** |

Source: enterprise / domain acceptance docs (`Domains 12–15 PO approval NOT RECORDED`).

---

## 5. Defect register

Status values: `OPEN` · `VERIFYING` · `FIXED` · `WONTFIX` · `DEFERRED`  
Severity: `P0` · `P1` · `P2` · `P3`

All seeded defects below are **OPEN** with **evidence to verify** during inspection / remediation phases. No fixes in Phase 0.

### Seeded known issues

| ID | Sev | Title | Area | Status | Evidence (Phase 0 code pointers — verify in UI / tests next) |
|---|---|---|---|---|---|
| P0-001 | P0 | Independent Strategy revenue vs RCM | Strategy / RCM | OPEN | Strategy synthesizes `netRevenueSar` independently in `strategyView.ts` (`encounters * (420 + …)`); RCM computes `netPatientRevenue = grossCharges − contractualAllowances` in `rcmView.ts`. No shared revenue ledger identity between Strategy CM and RCM net patient revenue. Enterprise surfaces both (`st` + `rcm.netPatientRevenue`) without cross-reconcile. |
| P1-001 | P1 | Supply Chain percentages >100% | Supply Chain | OPEN | KPI rates stored as 0–1 ratios; Command charts pre-scale `monthlyAvailability` / `monthlyOtd` as `ratio * 100` while Supplier Fill chart uses `fillRate * 1000 / 10`. Mixed 0–1 vs 0–100 series + `%` unit — verify any chart/path that double-scales or clamps incorrectly. |
| P1-002 | P1 | Days of Supply ~565 days scrutiny | Supply Chain | OPEN | `daysOfSupply = closingAvailable / (forecastUnits / periodDays)` uses **period-end stock** over **average daily forecast for the whole period**. Year grain + large closing stock can yield hundreds of days. Category DOS floors demand at `0.1`, which can inflate per-category DOS further (`supplyChainView.ts`). |
| P1-003 | P1 | Zero-value category investigation | Supply Chain | OPEN | Categories from `splitExact` on closing available / issued; disposition and chart series may show zero or near-zero slices. Verify which category/disposition renders as zero value and whether it is a data bug vs legitimate empty bucket. |
| P1-004 | P1 | Inventory reconciliation | Supply Chain | OPEN | Month roll-forward identity exists; period assemble allows residual (`rollForwardDelta`) for “quarantine timing / multi-site averaging”. Confirm residual gates and whether UI claims full reconcile while delta ≠ 0. |
| P1-005 | P1 | ICU staffing gap vs Strategy gap=0 | Enterprise / ICU / Strategy | OPEN | ICU: `staffingGapHours = max(0, requiredNurseHours − staffedNurseHours)` with coverage &lt; 1 → typically &gt; 0 (`icuView.ts`). Strategy: `staffingCapacityGap = max(0, demandHours − staffedAvailableHours)` where `demandHours` is derived from `availableHours` and often ≤ staffed available → **gap can be 0** while ICU shows a gap (`strategyView.ts`). Enterprise ops exception compares both (`enterpriseView.ts` ~509–518) and can show ICU gap with Strategy gap 0. |
| P1-006 | P1 | Operating Contribution duplicate as Contribution Margin | Strategy | OPEN | `operatingContribution` and `serviceLineCm` assigned the **same value**; `contributionMargin` alias equals `operatingContribution` (`strategyView.ts` assemble). Ownership lists distinct KPI IDs: `kpi_st_operating_contribution` vs `kpi_st_service_line_cm` (`strategyOwnership.ts`). |
| P1-007 | P1 | Financial terminology audit | Strategy / Enterprise | OPEN | Labels mix “Operating Contribution”, “Contribution Margin”, “Incremental Contribution”, “Recognized net revenue” — audit copy vs formula vs RCM “Net Patient Revenue” for executive clarity (seeded; expand during inspection). |

### Room for additional defects

| ID | Sev | Title | Area | Status | Evidence |
|---|---|---|---|---|---|
| _(add)_ |  |  |  | OPEN |  |
| _(add)_ |  |  |  | OPEN |  |
| _(add)_ |  |  |  | OPEN |  |
| _(add)_ |  |  |  | OPEN |  |
| _(add)_ |  |  |  | OPEN |  |

---

## 6. Phase 0 code inspection notes (read-only)

### P0-001 — Independent Strategy `netRevenueSar`

`frontend/src/core/strategyView.ts` (~398):

```ts
const netRevenueSar = Math.round(encounters * (420 + unit(mix(seed, 18)) * 180) * (0.95 + pressure * 0.08));
```

RCM (`rcmView.ts`): `netPatientRevenue = grossCharges - contractualAllowances` — separate synthetic ledger.

### P1-001 / P1-002 — Supply Chain rates & DOS

`frontend/src/core/supplyChainView.ts` assemble (~497–510, ~581–583):

```ts
const supplyAvailability = ratio(flows.availableSkuDays, flows.skuDays);
const supplierOtd = ratio(flows.receiptsOnTime, flows.receiptsReceived);
const daysOfSupply = r1(snap.closingAvailable / dailyForecastDemand);
const monthlyAvailability = raw.months.map((month) => r2(ratio(month.availableSkuDays, month.skuDays) * 100));
const monthlyOtd = raw.months.map((month) => r2(ratio(month.receiptsOnTime, month.receiptsReceived) * 100));
```

### P1-005 — ICU gap vs Strategy gap

- `icuView.ts`: `staffingGapHours = max(0, requiredNurseHours - staffedNurseHours)`
- `strategyView.ts`: `staffingCapacityGap = max(0, flows.demandHours - flows.staffedAvailableHours)`
- `enterpriseView.ts`: exception when `icu.staffingGapHours > 40 || st.staffingCapacityGap > 0`

### P1-006 — Duplicate CM KPIs

`strategyView.ts`:

```ts
const operatingContribution = netRevenue > 0 ? netRevenue - eligibleDirectCost : 0;
const serviceLineCm = operatingContribution;
// ...
contributionMargin: operatingContribution,
```

`strategyOwnership.ts`:

- `kpi_st_operating_contribution` — Operating Contribution  
- `kpi_st_service_line_cm` — Service-Line Contribution Margin  

---

## 7. Phase 0 exit criteria

- [x] `main` fetched / pulled; HEAD recorded  
- [x] Production BUILD_ID + bundle recorded  
- [x] Deploy safety documented (no `rsync --delete`)  
- [x] Branch `mvp-v1-remediation` created from latest `main`  
- [x] Baseline tag `mvp-v1-baseline-57f37b5`  
- [x] This defect register committed (docs only)  
- [ ] Defects verified / fixed in later phases  

---

*End of Phase 0 baseline document.*
