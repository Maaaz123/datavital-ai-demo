# Final chart and badge QA

**Verification timestamp (UTC):** 2026-10-29T16:41:00Z  
**Build ID:** `v52-chart-badge-qa`  
**Deployed commit:** `f56f044` (content: `ebe2557`)  
**Live URL:** https://maaaz123.github.io/datavital-ai-demo/  
**Refresh:** https://maaaz123.github.io/datavital-ai-demo/refresh.html  

---

## Chart audit

### Root causes identified

1. **Dual-magnitude series on one Y-axis** previously flattened small series (deaths vs readmissions; census vs discharges). Corrected earlier by splitting Outcomes charts onto independent scales.
2. **Forced / loose axis ceilings** made LOS and specialty day charts look empty; `axisMax` / `lineDomain` now nice-scale to data with controlled zoom for flat lines.
3. **Inconsistent plot padding** across `LineChart` / `BarChart` / `StackedChart` (52 vs mixed right pads). Unified to `CHART_VIEW` (`width: 720`, `padL: 56`, `padR: 14`, compact height `148`).
4. **Chart notes** used single-line `nowrap` + ellipsis, so long descriptions clipped unevenly under titles. Notes now clamp to two lines without shifting Investigate controls.
5. **Snapshot volume bars** mixed census snapshots with period totals, collapsing small flow bars. Census remains on ribbon KPIs; volume charts use period flows only.

### All 16 Inpatient charts — verified

| # | Screen | Chart | Result |
|---|---|---|---|
| 1 | Snapshot | Inpatient admissions over time | Pass — viewBox `0 0 720 148`, ticks inside pad |
| 2 | Snapshot | Inpatient volume context | Pass — period flows only; zero baseline preserved |
| 3 | Snapshot | Admission source mix | Pass — donut layout unchanged |
| 4 | Snapshot | Admissions by specialty | Pass — stacked viewBox contract |
| 5 | Snapshot | Episode volume summary | Pass — admissions/discharges/deaths, no census mix |
| 6 | Stay | Median length of stay over time | Pass — day-scale domain |
| 7 | Stay | Length of stay vs review lines | Pass — zero baseline bars |
| 8 | Stay | Long-stay contribution by specialty | Pass — pareto + bars |
| 9 | Stay | Length of stay by specialty | Pass — day-scale bars |
| 10 | Stay | Discharge destinations | Pass — data intact; Home dominates by design |
| 11 | Stay | Expected discharge outlook | Pass — horizon line |
| 12 | Outcomes | Est. 30-day readmissions over time | Pass — own scale |
| 13 | Outcomes | Inpatient deaths over time | Pass — own scale (not mixed with readmits) |
| 14 | Outcomes | 30-day readmissions by specialty | Pass — zero baseline |
| 15 | Outcomes | Discharges over time | Pass — own scale |
| 16 | Outcomes | Inpatient census over time | Pass — own scale / flat-line zoom |

### Defects corrected (this pass)

- Shared chart padding contract exported as `CHART_VIEW`
- Two-line chart note clamp; compact legend spacing under ED chart CSS
- `lineDomain` keeps ≥ ~20% of peak span when zooming flat lines (avoids over-amplification)
- Regression tests for viewBox, Y-tick placement, split Outcomes magnitudes

### Screenshots

- `docs/visual-after/chart-badge-qa/qa-ipd-snapshot.png`
- `docs/visual-after/chart-badge-qa/qa-ipd-stay.png`
- `docs/visual-after/chart-badge-qa/qa-ipd-outcomes.png`

### Data integrity

Synthetic scenario values were **not** modified. Chart titles, KPI definitions, Assist copy, and filters remain intact. Presentation-only changes: scale domains, padding, note wrapping, volume-chart category membership (census removed from mixed bars).

---

## Badge audit

### Root cause

`.gc-scope-card` used CSS Grid with default `align-content: stretch` and `min-height: 92px`. Free vertical space was distributed into auto rows, so `.gc-scope-status` pills **stretched** to different heights (measured ~22–46px for the same label).

### Shared style changes

- `.gc-scope-card { align-content: start; }`
- `.gc-scope-status`: fixed `height/min/max: 22px`, `inline-flex`, centered text, `padding: 0 8px`, `line-height: 1`, `white-space: nowrap`
- `.gc-scope-card.is-blank .gc-scope-status`: explicit neutral pill colors
- `.gc-sev` (severity family): same **22px** height/padding rhythm (semantic colors unchanged)

### Variants reviewed

| Family | Labels | Height after fix | Colors |
|---|---|---|---|
| Availability | Available / Estimated / Not available | 22px | Preserved (green / amber / slate) |
| Severity | high / medium / critical / info | 22px | Preserved |
| AI level | Predictive / Pattern review / etc. (constructed cards) | 22px | Preserved constructed style |

### Domain verification (measured in preview)

| Domain | Badge height set | Left inset in card |
|---|---|---|
| Emergency Snapshot | `{22}` | `{13}` |
| Inpatient Snapshot | `{22}` | `{13}` |
| Severity marks | `{22}` | n/a |

Beds uses the same `.gc-scope-status` component family as Emergency/Inpatient IndicatorIndex.

### Responsive

Existing responsive pack/grid rules preserved. Badge height is fixed in `px` so it does not vary by viewport; verified logic via shared CSS (no per-screen overrides). Breakpoint smoke covered by existing `responsive-breakpoints` / `viewport-matrix` tests (passed).

---

## Regression results

### Tests executed

```text
npm test -- --run
```

- **Test files:** 26 passed  
- **Tests:** 132 passed (including new `src/core/chart-badge-qa.test.tsx` — 11 cases)  
- **Failed:** 0  

### New regression coverage

- `axisMax` / `lineDomain` behavior (LOS, flat census/deaths, varying series)
- `CHART_VIEW` contract
- Outcomes independent magnitudes
- Snapshot volume bars exclude census mix
- Availability badge class family on Emergency + Beds + Inpatient
- Not available reveal path
- All three IPD screens: chart title → SVG viewBox `720×≥100`, Y-ticks with `x ≤ padL`

### Screenshots compared

Compared live preview renders of Snapshot / Stay / Outcomes after `v52-chart-badge-qa` against prior empty-axis / stretched-badge defects. Card grid, brand colors, and Investigate controls unchanged.

### Remaining known limitations

1. **Bar charts with large magnitude gaps** (e.g. Admissions ~31k beside Deaths; Discharge destinations Home vs other destinations) still show short bars under a shared **zero baseline**. This is intentional per acceptance rules (do not alter synthetic figures; preserve zero baselines for bars).
2. **Donut SVG** uses a different viewBox (`140×120`) by design; not forced onto the 720 cartesian contract.
3. **Line charts with zoomed domains** intentionally omit a zero baseline so flat series remain readable; axis labels show the true domain.

---

## Deployment

| Field | Value |
|---|---|
| Build identifier | `v52-chart-badge-qa` |
| Bundle (this build) | `assets/index-CcKVEIYN.js`, `assets/index-BOB8cFtJ.css` |
| Deployment URL | https://maaaz123.github.io/datavital-ai-demo/ |
| Cache wipe | https://maaaz123.github.io/datavital-ai-demo/refresh.html |
| Local preview verification | `http://127.0.0.1:4173/datavital-ai-demo/` with `?fresh=v52-chart-badge-qa` |
| Commit | `f56f044` (QA content in `ebe2557`) |

### Live verification checklist

1. Production build completed (`tsc -b && vite build`)
2. Full test suite 132/132
3. Dist published to GitHub Pages root (`index.html`, `404.html`, `refresh.html`, `sw.js`, `assets/`)
4. Preview measured: badge heights `{22}`, chart viewBoxes `0 0 720 148` for cartesian IPD charts
5. Direct navigation Snapshot / Stay / Outcomes OK
6. Refresh HTML BUILD_ID matches `v52-chart-badge-qa`
