# Supply Chain & Procurement — Data Dictionary

**Domain:** Domain 14 — Supply Chain & Procurement Intelligence  
**Release:** `v1-supply-chain` · **BUILD_ID:** `v77-supply-chain-domain`  
**Status:** Demo Available — not Production Source Verified  
**Scope:** Expected source-system fields → DataVital canonical columns  
**Privacy:** Synthetic, deterministic, non-identifiable demonstration data only. No real SKUs, PO numbers, invoices, or supplier tax IDs.

Authoritative code: `frontend/src/core/supplyChainOwnership.ts` (41 KPIs, 42 charts, 7 screens), `supplyChainView.ts`, `supplyChain.tsx`, `supplyChainScope.ts`.

Primary routes: `/supply-chain`, `/supply-chain/inventory`, `/supply-chain/procurement`, `/supply-chain/suppliers`, `/supply-chain/consumption`, `/supply-chain/waste`, `/supply-chain/optimization`.

## Data readiness legend

| State | Meaning |
|---|---|
| Demo Available | Represented in `buildScView` synthetic ledger |
| Production Source Verified | Mapped to a real hospital feed (**none claimed**) |
| Partially Mapped | Expected pattern known; aggregate/assumption only |
| Missing | Required for production; not available |
| Scenario Only | Explicit what-if / modeled assumption |

## Entities (canonical)

| Entity | Grain | Key concepts |
|---|---|---|
| Inventory Snapshot | Period-end SKU location | On-hand is a snapshot — never sum monthly snapshots |
| Stock Movement | Event | Receipt, issue, return, adjustment, recall, quarantine |
| Purchase Order | Document | Open / closed; PO ≠ receipt |
| Goods Receipt | Event | Ordered qty vs received qty; on-time flag |
| Supplier Invoice | Document | Distinct from receipt and payment |
| Payment | Event | Posted payments — not interchangeable with invoices |
| Supplier Contract | Contract | Compliance, renewal risk, dual-source eligibility |
| Clinical Issue | Event | Units issued to point of use (flow) |
| Consumption Forecast | Category-period | Forecast vs actual deviation |
| Waste Disposition | Event / snapshot | Expired, near-expiry, damaged, recalled, quarantined, obsolete, returned |

## Ledger conventions

1. Inventory on-hand = period-end snapshot (not a sum of snapshots).  
2. Stock movement = event flow.  
3. Purchase order ≠ goods receipt ≠ invoice ≠ payment.  
4. Days of Supply = available usable quantity ÷ forecast average daily unit demand (NOT value ÷ usage).  
5. Expired / near-expiry / damaged / recalled / quarantined / obsolete / returned stay distinct.  
6. Cheapest supplier is not assumed safest.  
7. Units of measure are distinguishable by category.  
8. Supplier OTD is owned on Command; Fill Rate is owned on Suppliers.  
9. Eight what-if scenarios overlap and must not be summed.  
10. Never cut clinically critical safety stock solely for carrying cost.  
11. Hospital ALL = sum of H1–H5 snapshots and flows; rates recomputed from summed numerators/denominators.  
12. Synthetic demo data — not live hospital inventory or purchasing records.
