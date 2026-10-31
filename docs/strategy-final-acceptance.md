# Domain 15 — Healthcare Resource, Profitability & Expansion Final Acceptance (Technical)

**Domain:** Healthcare Resource, Profitability & Expansion Intelligence  
**BUILD_ID:** `v78-strategy-domain`  
**Routes:** `/strategy` (+ workforce, equipment, capacity, service-lines, cost-efficiency, expansion, optimization)  
**Date:** 2026-10-30  
**Commits:** `f008982` (feat) · `fdcf274` (deploy)  
**Production:** https://demo.datavital.io/strategy  
**Production deploy:** PASS — `refresh.html` BUILD_ID `v78-strategy-domain`; SPA 404 shell serves `index-WbcHhHYx.js` HTTP 200; all 10 ST what-if kinds present in live JS  
**Product-owner approval:** **NOT RECORDED**

## Status summary

| Gate | Result |
|---|---|
| Eight screens implemented | PASS |
| 48 unique KPI ownership | PASS |
| 48 unique chart ownership | PASS |
| Contribution = Net Revenue − Eligible Direct Costs | PASS |
| CM ≠ net profit; revenue ≠ profit | PASS |
| Capacity ladder (installed/staffed/operational/available/used) | PASS |
| Cross-domain inputs without ownership reassignment | PASS |
| Synthetic cost model never Production Source Verified | PASS |
| Ten What-if scenarios (non-additive) | PASS |
| Vital Assist wiring | PASS |
| Alerts (period-scoped) | PASS |
| Automated reconcile + page tests | PASS (20/20 ST · 22/22 SC · 19/19 QS · 39/39 RCM = 100/100) |
| Domain 14 Supply Chain preserved | PASS (additive only) |
| Domain 13 Quality preserved | PASS (additive only) |
| Domain 12 RCM preserved | PASS (additive only) |
| Domains 1–11 layout ownership untouched | PASS (additive only) |
| Live production `/strategy` | PASS — SPA 404 shell serves `index-WbcHhHYx.js`; BUILD_ID `v78-strategy-domain` |
| Product-owner approval | NOT RECORDED |

## Safeguards verified

- Contribution Margin = Recognized Net Revenue − Eligible Direct Costs  
- Contribution ≠ net profit; revenue ≠ profit  
- Zero revenue → zero contribution  
- Fully allocated margin not invented without overhead support  
- Installed ≠ staffed ≠ operational ≠ available ≠ used capacity  
- Beds / OR / appointments read from prior domains as inputs only  
- Cost categories synthetic — Demo Available / Scenario Only  
- Ten what-if scenarios overlap and must not be summed  
- Investment outcomes are not claimed as achieved  
- AI does not approve CapEx, change rosters, or reallocate staff alone  
- Selective deploy only — never `rsync --delete` against repo root  
- Synthetic data are not real hospital records  

## Known limitations

- Synthetic aggregate ledger (not record-level ERP / payroll / CapEx)  
- No production source verification  
- Fictional SAR  
- Modeled opportunities are illustrative  

## Product-owner approval

**NOT RECORDED.** Technical acceptance ≠ product-owner approval. Domains 13–14 likewise have product-owner approval **NOT RECORDED**.
