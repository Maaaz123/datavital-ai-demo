# Supply Chain — KPI Lineage

**BUILD_ID:** `v77-supply-chain-domain` · 41 owned KPIs · unique screen ownership enforced in `supplyChainOwnership.ts`.

| KPI ID | Full name | Owning screen | Numerator / input | Denominator / basis | Aggregation |
|---|---|---|---|---|---|
| kpi_sc_supply_availability_rate | Supply Availability Rate | Command | Available SKU-days | Plan SKU-days | Ratio |
| kpi_sc_critical_stockout_exposure | Critical Stockout Exposure | Command | Critical SKUs at zero usable | — | Period-end count |
| kpi_sc_inventory_value | Inventory Value | Command | On-hand × unit cost | — | Snapshot SAR |
| kpi_sc_supplier_otd | Supplier On-Time Delivery | Command | On-time receipts | Receipts | Ratio |
| kpi_sc_expiry_risk_value | Expiry Risk Value | Command | Near-expiry usable × cost | — | Snapshot SAR |
| kpi_sc_po_backlog | Purchase Order Backlog | Command | Open incomplete POs | — | Period-end count |
| kpi_sc_available_units | Available Inventory Units | Inventory | Usable available qty | — | Snapshot |
| kpi_sc_critical_below_safety | Critical SKUs Below Safety Stock | Inventory | Critical below safety | — | Snapshot |
| kpi_sc_inventory_turnover | Inventory Turnover | Inventory | Issued units | Avg usable on-hand | Ratio |
| kpi_sc_days_of_supply | Days of Supply | Inventory | Available usable | Forecast avg daily unit demand | Cover |
| kpi_sc_inventory_accuracy | Inventory Accuracy | Inventory | Within-tolerance counts | Cycle-count lines | Ratio |
| kpi_sc_replenishment_exceptions | Replenishment Exceptions | Inventory | Open exceptions | — | Snapshot |
| kpi_sc_open_pos | Open Purchase Orders | Procurement | Open POs | — | Snapshot |
| kpi_sc_po_approval_tat | PO Approval Turnaround | Procurement | Approval hours | Approved POs | Median hours |
| kpi_sc_po_cycle_time | Purchase Order Cycle Time | Procurement | Approval-to-receipt days | Received POs | Median days |
| kpi_sc_purchase_price_variance | Purchase Price Variance | Procurement | (Actual − standard) × qty | — | Sum SAR |
| kpi_sc_procurement_exceptions | Procurement Exceptions | Procurement | Open exceptions | — | Snapshot |
| kpi_sc_ontime_po_fulfillment | On-Time PO Fulfillment | Procurement | Lines on need-by | Lines due | Ratio |
| kpi_sc_supplier_fill_rate | Supplier Fill Rate | Suppliers | Qty received | Qty ordered | Ratio |
| kpi_sc_contract_compliance | Contract Compliance | Suppliers | Contracted spend | Eligible spend | Ratio |
| kpi_sc_defective_delivery_rate | Defective Delivery Rate | Suppliers | Defective qty | Received qty | Ratio |
| kpi_sc_supplier_concentration | Supplier Concentration Exposure | Suppliers | Top supplier critical spend | Critical spend | Share |
| kpi_sc_contract_renewal_risk | Contract Renewal Risk | Suppliers | Contracts ≤90d without action | — | Snapshot |
| kpi_sc_dual_source_coverage | Dual-Source Coverage | Suppliers | Dual-sourced critical SKUs | Critical SKUs | Ratio |
| kpi_sc_clinical_consumption | Clinical Consumption Volume | Consumption | Issued units | — | Flow sum |
| kpi_sc_consumption_per_encounter | Consumption per Eligible Encounter | Consumption | Issued units | Eligible encounters | Ratio |
| kpi_sc_high_variation_categories | High-Variation Supply Categories | Consumption | Categories above CV threshold | — | Count |
| kpi_sc_forecast_deviation | Consumption Forecast Deviation | Consumption | \|Actual − forecast\| | Forecast | Ratio |
| kpi_sc_replenishment_lead_time | Replenishment Lead Time | Consumption | Reorder-to-available days | Events | Median |
| kpi_sc_unusual_consumption | Unusual Consumption Signals | Consumption | Open signals | — | Snapshot |
| kpi_sc_expired_value | Expired Inventory Value | Waste | Expired units × cost | — | Flow SAR |
| kpi_sc_near_expiry_exposure | Near-Expiry Exposure | Waste | Near-expiry usable × cost | — | Snapshot SAR |
| kpi_sc_inventory_waste_rate | Inventory Waste Rate | Waste | Expired+damaged+obsolete | Issued | Ratio |
| kpi_sc_damaged_stock_value | Damaged Stock Value | Waste | Damaged units × cost | — | Flow SAR |
| kpi_sc_stock_adjustment_exceptions | Stock Adjustment Exceptions | Waste | Open exceptions | — | Snapshot |
| kpi_sc_avoidable_procurement_exposure | Avoidable Procurement Exposure | Waste | Scenario-linked exposure | — | Modeled SAR |
| kpi_sc_addressable_stockout_risk | Addressable Stockout Risk | Optimization | Modeled addressable stockouts | — | Scenario |
| kpi_sc_inventory_opt_opportunity | Inventory Optimization Opportunity | Optimization | Modeled opportunity | — | Scenario SAR |
| kpi_sc_expiry_avoidance_opportunity | Expiry Avoidance Opportunity | Optimization | Modeled avoidance | — | Scenario SAR |
| kpi_sc_replenishment_improvement | Replenishment Improvement Potential | Optimization | Modeled exception reduction | — | Scenario |
| kpi_sc_supplier_diversification_ops | Supplier Diversification Opportunities | Optimization | Eligible dual-source SKUs | — | Scenario |

Ownership rule: Supplier OTD is Command-only; Suppliers owns Fill Rate (not a second OTD primary).
