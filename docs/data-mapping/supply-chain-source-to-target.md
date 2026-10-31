# Supply Chain — Source to Target Mapping

**Target:** DataVital AI Supply Chain canonical model (`buildScView`) — `v1-supply-chain`, BUILD_ID `v77-supply-chain-domain`  
**Status:** Demo Available / Scenario Only — **not** Production Source Verified

| Expected source system | Expected source object | Target entity / field | Mapping status | Notes |
|---|---|---|---|---|
| Materials / ERP | Inventory on-hand balance | `availableUnits`, `inventoryValue` | Demo Available | Period-end snapshot only |
| Materials / ERP | Stock transaction | receipts, issues, returns, adjustments | Demo Available | Event flows |
| Purchasing | Purchase order header/line | `openPos`, ordered qty | Demo Available | PO ≠ receipt |
| Receiving | Goods receipt | `receiptsReceived`, on-time flag | Demo Available | Fill and OTD numerators |
| AP | Supplier invoice | `receiptInvoices` | Demo Available | Distinct from receipt |
| Treasury / AP payments | Payment posting | `paymentsPosted` | Demo Available | Distinct from invoice |
| Contract repository | Supplier contract | compliance, renewal risk | Demo Available | Aggregate demo |
| Supplier master | Approved suppliers | dual-source coverage, concentration | Demo Available | Cheapest ≠ safest |
| Clinical materials | Issue to location | `clinicalConsumption` | Demo Available | Flow |
| Demand planning | Category forecast | `forecastUnits`, deviation | Demo Available | Published forecasts |
| Quality / quarantine | Quarantine & recall holds | disposition rows | Demo Available | Separate from available |
| What-if engine | Scenario parameters | eight `sc-*` opportunities | Scenario Only | Non-additive |

No production hospital feed is claimed as verified for this domain.
