# MVP V1 Remediation — Phases 1–4 Data Integrity Fixes

**Branch:** `mvp-v1-remediation`  
**Baseline:** `57f37b5` / `mvp-v1-baseline-57f37b5`  
**Scope:** P0-001, P1-001…P1-007 (data integrity). No production deploy in this commit.

---

## Summary of changes

### P0-001 — Strategy revenue from RCM (CRITICAL)

- Removed independent Strategy `netRevenueSar` generator from the authoritative reporting path.
- `assemble()` sets `recognizedNetRevenue = buildRcmView(...).netPatientRevenue`.
- Allocates RCM NPR across `ST_SERVICE_LINES` with deterministic `splitExact` weights.
- Exposes `recognizedNetRevenue`, `allocatedServiceLineRevenue`, `unallocatedRevenue` (0 when fully allocated).
- `operatingContribution = recognizedNetRevenue > 0 ? recognizedNetRevenue − eligibleDirectCost : 0`.
- Monthly contribution allocates period NPR by encounter weights (no independent monthly revenue).
- Methodology documents lineage: **RCM NPR → SL allocation → CM**. Costs remain synthetic (not ERP).
- Identity: `allocated + unallocated === recognized === rcm.netPatientRevenue`.

### P1-006 — Duplicate CM KPI

- Command no longer shows the same SAR twice.
- `kpi_st_service_line_cm` on Command is now **Contribution Margin Rate** (`operatingContribution / recognizedNetRevenue`).
- Command ribbon: Operating Contribution (SAR) + CM Rate (%).
- Service-lines keeps by-line CM rate / variance (`kpi_st_sl_cm_rate`).
- Ownership registry, ribbon, bind, and engine assumptions updated.

### P1-005 — ICU vs Strategy staffing gap

- Strategy imports ICU view; exposes `icuRequiredHours`, `icuAvailableHours`, `icuStaffingGapHours`.
- Enterprise scope: `enterpriseRequiredHours`, `enterpriseAvailableHours`, `enterpriseStaffingGapHours`, `redeployableHours`.
- Demand generation can exceed staffed available under pressure (clinically plausible).
- Documented: enterprise surplus ≠ automatic ICU fill without credentials.
- Enterprise Command Center staffing exception evidence text covers both scopes.

### P1-001 — Supply rates > 100%

- Hardened generation: `availableSkuDays = min(plan, …)` with factor ≤ 0.98; `receiptsOnTime ⊆ receiptsReceived`.
- KPI rates remain 0–1; monthly chart series remain 0–100 (no double-scale).
- Tests assert bounds across H1–H5 × years × periods.

### P1-002 — Days of Supply

- Numerator is usable closing (quarantine outflow excluded).
- Zero demand → `null` / UI **No demand** (never invent huge finite DOS).
- Units of measure documented; elevated year-grain DOS noted as intentional excess inventory vs average daily forecast.

### P1-003 / P1-004 — Empty buckets & inventory reconcile

- Empty category/disposition buckets stay empty (filtered empty-state in inventory charts).
- Roll-forward identity: `opening + receipts + returns − consumption − neg adj − expired − quarantine (± transfers=0) = closing`.
- Exact identity asserted; hospital ALL has no synthetic inter-site transfer inflation.

### P1-007 — Financial terminology

- Labels/methodology distinguish Operating Contribution (SAR), CM Rate (%), RCM Net Patient Revenue, and **illustrative** modeled opportunities.

---

## Tests added

| File | Coverage |
|---|---|
| `st-rcm-revenue.test.ts` | RCM = Strategy revenue; allocation identity; contribution math; CM Rate ≠ SAR |
| `sc-rate-bounds.test.ts` | Rate bounds; DOS units; zero demand; quarantine roll-forward |
| `st-icu-staffing.test.ts` | ICU gap match; enterprise gap scope; surplus ≠ ICU fill |

Existing `st-reconcile` / `sc-reconcile` updated (not weakened).

---

## Sample before / after (H1 FY2026 year)

| Metric | Before (baseline) | After |
|---|---|---|
| Strategy recognized net revenue | 36,578,007 (independent synthetic) | **50,292,914** (= RCM NPR) |
| RCM net patient revenue | 50,292,914 | 50,292,914 (unchanged) |
| Operating contribution | 18,033,152 | 16,570,525 (from RCM NPR − synthetic direct cost) |
| Command 2nd KPI | duplicate SAR CM | CM Rate **32.9%** (distinct from SAR) |
| Strategy staffing gap | **0** | enterprise gap **10,127** h |
| ICU staffing gap | 11,154 | **11,154** (matches ICU view; scopes differ) |

---

*Deploy to production deferred — parent continues remaining remediation phases.*
