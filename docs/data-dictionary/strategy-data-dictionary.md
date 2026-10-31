# Healthcare Resource, Profitability & Expansion — Data Dictionary

**Domain:** Domain 15 — Healthcare Resource, Profitability & Expansion Intelligence  
**Release:** `v1-strategy` · **BUILD_ID:** `v78-strategy-domain`  
**Status:** Demo Available / Scenario Only — not Production Source Verified  
**Scope:** Expected source-system fields → DataVital Strategy canonical columns  
**Privacy:** Synthetic, deterministic, non-identifiable demonstration data only. No real payroll, CapEx ledgers, or patient identifiers.

Authoritative code: `frontend/src/core/strategyOwnership.ts` (48 KPIs, 48 charts, 8 screens), `strategyView.ts`, `strategy.tsx`, `strategyScope.ts`.

Primary routes: `/strategy`, `/strategy/workforce`, `/strategy/equipment`, `/strategy/capacity`, `/strategy/service-lines`, `/strategy/cost-efficiency`, `/strategy/expansion`, `/strategy/optimization`.

## Data readiness legend

| State | Meaning |
|---|---|
| Demo Available | Represented in `buildStView` synthetic ledger |
| Production Source Verified | Mapped to a real hospital feed (**none claimed**) |
| Partially Mapped | Expected pattern known; aggregate/assumption only |
| Missing | Required for production; not available |
| Scenario Only | Explicit what-if / modeled assumption |

## Entities (canonical)

| Entity | Grain | Key concepts |
|---|---|---|
| Operating Contribution | Site × period | CM = recognized net revenue − eligible direct costs (≠ net profit) |
| Capacity Ladder | Site × period | Installed ≠ staffed ≠ operational ≠ available ≠ used ≠ unavailable |
| Workforce Economics | Site × period | Productive hours, overtime, agency (distinct ledgers) |
| Equipment Productivity | Asset class × period | Available operating hours exclude downtime / unstaffed slots |
| Service-Line P&L Slice | Service line × period | Revenue ≠ profit; CM rate; direct cost intensity |
| Cost Category Ledger | Category × period | Salaries, OT, agency, consumables, drugs, maintenance, depreciation, facility, utilities, shared services |
| Expansion Candidate | Candidate × period | CapEx / OpEx / ramp / incremental contribution — illustrative |
| Strategy Opportunity | Scenario | Ten non-additive what-ifs |

## Ledger conventions

1. Contribution Margin = Recognized Net Revenue − Eligible Direct Costs.  
2. Contribution ≠ net profit. Revenue ≠ profit.  
3. Zero revenue → zero contribution — never invent profit.  
4. Do not invent precise fully allocated margin without overhead support.  
5. Installed ≠ staffed ≠ operational ≠ available ≠ used capacity.  
6. Beds / OR / appointments are read from prior-domain facts as inputs — Strategy does not recreate primary ownership totals.  
7. Cost model categories are synthetic — Demo Available / Scenario Only, never Production Source Verified.  
8. Ten what-if scenarios overlap and must not be summed.  
9. Investment outcomes are not claimed as achieved.  
10. AI does not approve CapEx, change rosters, or reallocate staff alone.  
11. Hospital ALL = sum of H1–H5 flows; rates and CM recomputed from summed numerators/denominators.  
12. Synthetic demo data — not live ERP, payroll, or capital ledgers.
