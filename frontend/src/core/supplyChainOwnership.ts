/** Stable Supply Chain & Procurement KPI ownership — each primary ID has exactly one owning screen. */

export type ScScreenId =
  | 'command'
  | 'inventory'
  | 'procurement'
  | 'suppliers'
  | 'consumption'
  | 'waste'
  | 'optimization';

export type ScKpiOwner = {
  id: string;
  fullName: string;
  display: string;
  screen: ScScreenId;
  route: string;
  decision: string;
};

export const SC_KPI_OWNERS: ScKpiOwner[] = [
  // Command — executive supply & procurement health
  { id: 'kpi_sc_supply_availability_rate', fullName: 'Supply Availability Rate', display: 'Supply Availability', screen: 'command', route: '/supply-chain', decision: 'SKU-days with usable available stock ÷ SKU-days in the formulary plan (period)' },
  { id: 'kpi_sc_critical_stockout_exposure', fullName: 'Critical Stockout Exposure', display: 'Critical Stockouts', screen: 'command', route: '/supply-chain', decision: 'Critical / clinically essential SKUs with zero available usable stock at period-end observation' },
  { id: 'kpi_sc_inventory_value', fullName: 'Inventory Value', display: 'Inventory Value', screen: 'command', route: '/supply-chain', decision: 'Period-end on-hand inventory value in fictional SAR (snapshot — not a sum of monthly snapshots)' },
  { id: 'kpi_sc_supplier_otd', fullName: 'Supplier On-Time Delivery', display: 'Supplier OTD', screen: 'command', route: '/supply-chain', decision: 'Receipts delivered on or before promised date ÷ receipts decided in the period' },
  { id: 'kpi_sc_expiry_risk_value', fullName: 'Expiry Risk Value', display: 'Expiry Risk', screen: 'command', route: '/supply-chain', decision: 'Period-end near-expiry usable stock value (within illustrative 90-day window) in fictional SAR' },
  { id: 'kpi_sc_po_backlog', fullName: 'Purchase Order Backlog', display: 'PO Backlog', screen: 'command', route: '/supply-chain', decision: 'Open purchase orders still incomplete at period-end observation (PO ≠ receipt)' },

  // Inventory
  { id: 'kpi_sc_available_units', fullName: 'Available Inventory Units', display: 'Available Units', screen: 'inventory', route: '/supply-chain/inventory', decision: 'Period-end usable available quantity (excludes quarantined, recalled, expired, damaged)' },
  { id: 'kpi_sc_critical_below_safety', fullName: 'Critical SKUs Below Safety Stock', display: 'Below Safety Stock', screen: 'inventory', route: '/supply-chain/inventory', decision: 'Critical SKUs with available usable quantity below documented safety stock at observation' },
  { id: 'kpi_sc_inventory_turnover', fullName: 'Inventory Turnover', display: 'Inventory Turnover', screen: 'inventory', route: '/supply-chain/inventory', decision: 'Period issued units ÷ average on-hand usable units (unit turnover — not value/usage)' },
  { id: 'kpi_sc_days_of_supply', fullName: 'Days of Supply', display: 'Days of Supply', screen: 'inventory', route: '/supply-chain/inventory', decision: 'Available usable quantity ÷ forecast average daily unit demand (NOT value ÷ usage)' },
  { id: 'kpi_sc_inventory_accuracy', fullName: 'Inventory Accuracy', display: 'Inventory Accuracy', screen: 'inventory', route: '/supply-chain/inventory', decision: 'Cycle-count lines within tolerance ÷ cycle-count lines performed' },
  { id: 'kpi_sc_replenishment_exceptions', fullName: 'Replenishment Exceptions', display: 'Replenish Exceptions', screen: 'inventory', route: '/supply-chain/inventory', decision: 'Open replenishment exceptions (stockout risk, late receipt, below safety) at observation' },

  // Procurement
  { id: 'kpi_sc_open_pos', fullName: 'Open Purchase Orders', display: 'Open POs', screen: 'procurement', route: '/supply-chain/procurement', decision: 'Purchase orders with remaining unordered-to-receipt quantity at observation (PO ≠ receipt ≠ invoice)' },
  { id: 'kpi_sc_po_approval_tat', fullName: 'PO Approval Turnaround', display: 'PO Approval TAT', screen: 'procurement', route: '/supply-chain/procurement', decision: 'Median hours from requisition submit to PO approval for POs decided in the period' },
  { id: 'kpi_sc_po_cycle_time', fullName: 'Purchase Order Cycle Time', display: 'PO Cycle Time', screen: 'procurement', route: '/supply-chain/procurement', decision: 'Median days from PO approval to first receipt for receipts completed in the period' },
  { id: 'kpi_sc_purchase_price_variance', fullName: 'Purchase Price Variance', display: 'Price Variance', screen: 'procurement', route: '/supply-chain/procurement', decision: '(Actual unit price − contract / standard price) × received quantity, fictional SAR' },
  { id: 'kpi_sc_procurement_exceptions', fullName: 'Procurement Exceptions', display: 'Procurement Exceptions', screen: 'procurement', route: '/supply-chain/procurement', decision: 'Open procurement exceptions (price, quantity, matching) at observation' },
  { id: 'kpi_sc_ontime_po_fulfillment', fullName: 'On-Time PO Fulfillment', display: 'On-Time PO Fulfillment', screen: 'procurement', route: '/supply-chain/procurement', decision: 'PO lines fully received by need-by date ÷ PO lines due in the period' },

  // Suppliers — OTD is owned on Command; this screen uses fill rate and contract metrics
  { id: 'kpi_sc_supplier_fill_rate', fullName: 'Supplier Fill Rate', display: 'Supplier Fill Rate', screen: 'suppliers', route: '/supply-chain/suppliers', decision: 'Quantity received ÷ quantity ordered on closed PO lines (fill ≠ on-time)' },
  { id: 'kpi_sc_contract_compliance', fullName: 'Contract Compliance', display: 'Contract Compliance', screen: 'suppliers', route: '/supply-chain/suppliers', decision: 'Spend on contracted suppliers ÷ eligible contracted-category spend' },
  { id: 'kpi_sc_defective_delivery_rate', fullName: 'Defective Delivery Rate', display: 'Defective Delivery', screen: 'suppliers', route: '/supply-chain/suppliers', decision: 'Defective / rejected receipt quantity ÷ received quantity' },
  { id: 'kpi_sc_supplier_concentration', fullName: 'Supplier Concentration Exposure', display: 'Supplier Concentration', screen: 'suppliers', route: '/supply-chain/suppliers', decision: 'Share of critical SKU spend concentrated in the single largest supplier (high concentration ≠ cheapest-is-safest)' },
  { id: 'kpi_sc_contract_renewal_risk', fullName: 'Contract Renewal Risk', display: 'Renewal Risk', screen: 'suppliers', route: '/supply-chain/suppliers', decision: 'Active contracts expiring within 90 days without renewal action at observation' },
  { id: 'kpi_sc_dual_source_coverage', fullName: 'Dual-Source Coverage for Critical SKUs', display: 'Dual-Source Coverage', screen: 'suppliers', route: '/supply-chain/suppliers', decision: 'Critical SKUs with ≥2 approved active suppliers ÷ critical SKUs' },

  // Consumption
  { id: 'kpi_sc_clinical_consumption', fullName: 'Clinical Consumption Volume', display: 'Clinical Consumption', screen: 'consumption', route: '/supply-chain/consumption', decision: 'Units issued to clinical points of use in the period (event flow — not a stock)' },
  { id: 'kpi_sc_consumption_per_encounter', fullName: 'Consumption per Eligible Encounter', display: 'Per Encounter', screen: 'consumption', route: '/supply-chain/consumption', decision: 'Clinical consumption units ÷ eligible clinical encounters in the period' },
  { id: 'kpi_sc_high_variation_categories', fullName: 'High-Variation Supply Categories', display: 'High-Variation Categories', screen: 'consumption', route: '/supply-chain/consumption', decision: 'Supply categories with coefficient of variation above the illustrative management threshold' },
  { id: 'kpi_sc_forecast_deviation', fullName: 'Consumption Forecast Deviation', display: 'Forecast Deviation', screen: 'consumption', route: '/supply-chain/consumption', decision: '|Actual issued − forecast| ÷ forecast for categories with a published forecast' },
  { id: 'kpi_sc_replenishment_lead_time', fullName: 'Replenishment Lead Time', display: 'Replenish Lead Time', screen: 'consumption', route: '/supply-chain/consumption', decision: 'Median days from clinical reorder signal to available stock at the requesting location' },
  { id: 'kpi_sc_unusual_consumption', fullName: 'Unusual Consumption Signals', display: 'Unusual Signals', screen: 'consumption', route: '/supply-chain/consumption', decision: 'Open unusual consumption signals (spike / unexplained variance) requiring review at observation' },

  // Waste / expiry / financial exposure
  { id: 'kpi_sc_expired_value', fullName: 'Expired Inventory Value', display: 'Expired Value', screen: 'waste', route: '/supply-chain/waste', decision: 'Units expired in period × unit cost (distinct from near-expiry, damaged, recalled, quarantined)' },
  { id: 'kpi_sc_near_expiry_exposure', fullName: 'Near-Expiry Exposure', display: 'Near-Expiry Exposure', screen: 'waste', route: '/supply-chain/waste', decision: 'Period-end usable stock value within the near-expiry window (snapshot)' },
  { id: 'kpi_sc_inventory_waste_rate', fullName: 'Inventory Waste Rate', display: 'Waste Rate', screen: 'waste', route: '/supply-chain/waste', decision: '(Expired + damaged + obsolete write-off units) ÷ issued units' },
  { id: 'kpi_sc_damaged_stock_value', fullName: 'Damaged Stock Value', display: 'Damaged Stock', screen: 'waste', route: '/supply-chain/waste', decision: 'Damaged write-off units × unit cost in the period (distinct from expired)' },
  { id: 'kpi_sc_stock_adjustment_exceptions', fullName: 'Stock Adjustment Exceptions', display: 'Adjustment Exceptions', screen: 'waste', route: '/supply-chain/waste', decision: 'Open inventory adjustment exceptions requiring finance / materials review at observation' },
  { id: 'kpi_sc_avoidable_procurement_exposure', fullName: 'Avoidable Procurement Exposure', display: 'Avoidable Procurement', screen: 'waste', route: '/supply-chain/waste', decision: 'Illustrative avoidable over-buy / duplicate-order exposure in fictional SAR (scenario-linked)' },

  // Optimization / what-if
  { id: 'kpi_sc_addressable_stockout_risk', fullName: 'Addressable Stockout Risk', display: 'Addressable Stockouts', screen: 'optimization', route: '/supply-chain/optimization', decision: 'Illustrative critical stockout exposure addressable under documented assumptions — not measured improvement' },
  { id: 'kpi_sc_inventory_opt_opportunity', fullName: 'Inventory Optimization Opportunity', display: 'Inventory Opportunity', screen: 'optimization', route: '/supply-chain/optimization', decision: 'Illustrative carrying-cost / excess-stock opportunity under assumptions — never recommends cutting clinically critical safety stock solely for cost' },
  { id: 'kpi_sc_expiry_avoidance_opportunity', fullName: 'Expiry Avoidance Opportunity', display: 'Expiry Avoidance', screen: 'optimization', route: '/supply-chain/optimization', decision: 'Illustrative near-expiry / expiry value avoidable under documented interventions' },
  { id: 'kpi_sc_replenishment_improvement', fullName: 'Replenishment Improvement Potential', display: 'Replenish Potential', screen: 'optimization', route: '/supply-chain/optimization', decision: 'Illustrative replenishment-exception reduction under lead-time and fill-rate assumptions' },
  { id: 'kpi_sc_supplier_diversification_ops', fullName: 'Supplier Diversification Opportunities', display: 'Diversification Ops', screen: 'optimization', route: '/supply-chain/optimization', decision: 'Critical SKUs eligible for dual-source diversification under constraints — cheapest supplier ≠ safest' },
];

export const SC_SCREEN_TITLES: Record<ScScreenId, string> = {
  command: 'Supply Chain Command Center',
  inventory: 'Inventory & Stock Availability',
  procurement: 'Procurement & Purchase Orders',
  suppliers: 'Supplier Performance & Contracts',
  consumption: 'Clinical Supply Consumption',
  waste: 'Waste, Expiry & Financial Exposure',
  optimization: 'Supply Optimization & What-If',
};

export const SC_CHART_OWNERS: Array<{ id: string; title: string; screen: ScScreenId; question: string }> = [
  { id: 'sc_avail_trend', title: 'Supply Availability Trend', screen: 'command', question: 'How is supply availability moving?' },
  { id: 'sc_stockout_overview', title: 'Critical Stockout Overview', screen: 'command', question: 'Where is critical stockout exposure?' },
  { id: 'sc_inventory_value_mix', title: 'Inventory Value by Category', screen: 'command', question: 'Where is inventory value concentrated?' },
  { id: 'sc_otd_trend', title: 'Supplier On-Time Delivery Trend', screen: 'command', question: 'Is supplier OTD improving?' },
  { id: 'sc_expiry_risk', title: 'Expiry Risk Exposure', screen: 'command', question: 'How large is near-expiry risk?' },
  { id: 'sc_po_backlog_chart', title: 'Purchase Order Backlog', screen: 'command', question: 'Is the open PO backlog rising?' },
  { id: 'sc_available_by_category', title: 'Available Units by Category', screen: 'inventory', question: 'Where is available stock concentrated?' },
  { id: 'sc_below_safety', title: 'Critical SKUs Below Safety Stock', screen: 'inventory', question: 'Which categories are below safety stock?' },
  { id: 'sc_turnover_trend', title: 'Inventory Turnover Trend', screen: 'inventory', question: 'Is unit turnover changing?' },
  { id: 'sc_days_of_supply', title: 'Days of Supply by Category', screen: 'inventory', question: 'Where is cover thin?' },
  { id: 'sc_accuracy', title: 'Inventory Accuracy', screen: 'inventory', question: 'Are cycle counts within tolerance?' },
  { id: 'sc_replenish_exceptions', title: 'Replenishment Exceptions', screen: 'inventory', question: 'What drives replenishment exceptions?' },
  { id: 'sc_open_po_trend', title: 'Open Purchase Orders Trend', screen: 'procurement', question: 'Are open POs rising?' },
  { id: 'sc_approval_tat', title: 'PO Approval Turnaround', screen: 'procurement', question: 'How long does PO approval take?' },
  { id: 'sc_cycle_time', title: 'PO Cycle Time Distribution', screen: 'procurement', question: 'How long from approval to receipt?' },
  { id: 'sc_price_variance', title: 'Purchase Price Variance', screen: 'procurement', question: 'Where is price variance concentrated?' },
  { id: 'sc_proc_exceptions', title: 'Procurement Exceptions', screen: 'procurement', question: 'Which exception types dominate?' },
  { id: 'sc_ontime_fulfillment', title: 'On-Time PO Fulfillment', screen: 'procurement', question: 'Are need-by dates being met?' },
  { id: 'sc_fill_rate', title: 'Supplier Fill Rate', screen: 'suppliers', question: 'How complete are supplier deliveries?' },
  { id: 'sc_contract_compliance', title: 'Contract Compliance', screen: 'suppliers', question: 'Is spend on contracted suppliers?' },
  { id: 'sc_defective', title: 'Defective Delivery Rate', screen: 'suppliers', question: 'Where are defective receipts rising?' },
  { id: 'sc_concentration', title: 'Supplier Concentration Exposure', screen: 'suppliers', question: 'How concentrated is critical spend?' },
  { id: 'sc_renewal_risk', title: 'Contract Renewal Risk', screen: 'suppliers', question: 'Which contracts need renewal action?' },
  { id: 'sc_dual_source', title: 'Dual-Source Coverage', screen: 'suppliers', question: 'Are critical SKUs dual-sourced?' },
  { id: 'sc_consumption_trend', title: 'Clinical Consumption Trend', screen: 'consumption', question: 'How is clinical consumption moving?' },
  { id: 'sc_per_encounter', title: 'Consumption per Eligible Encounter', screen: 'consumption', question: 'Is per-encounter intensity changing?' },
  { id: 'sc_high_variation', title: 'High-Variation Categories', screen: 'consumption', question: 'Which categories show high variation?' },
  { id: 'sc_forecast_dev', title: 'Forecast Deviation by Category', screen: 'consumption', question: 'Where does forecast miss actuals?' },
  { id: 'sc_lead_time', title: 'Replenishment Lead Time', screen: 'consumption', question: 'How long does clinical replenishment take?' },
  { id: 'sc_unusual_signals', title: 'Unusual Consumption Signals', screen: 'consumption', question: 'Which unusual signals need review?' },
  { id: 'sc_expired_value', title: 'Expired Inventory Value', screen: 'waste', question: 'How much expired value accrued?' },
  { id: 'sc_near_expiry', title: 'Near-Expiry vs Expired', screen: 'waste', question: 'How do near-expiry and expired compare?' },
  { id: 'sc_waste_rate', title: 'Inventory Waste Rate', screen: 'waste', question: 'Is waste rising vs issues?' },
  { id: 'sc_damaged', title: 'Damaged Stock Value', screen: 'waste', question: 'Where is damaged write-off concentrated?' },
  { id: 'sc_adjustments', title: 'Stock Adjustment Exceptions', screen: 'waste', question: 'What drives adjustment exceptions?' },
  { id: 'sc_avoidable', title: 'Avoidable Procurement Exposure', screen: 'waste', question: 'How large is avoidable over-buy exposure?' },
  { id: 'sc_recovery_drivers', title: 'Supply Improvement by Driver', screen: 'optimization', question: 'Which illustrative scenarios show the largest opportunity?' },
  { id: 'sc_stockout_scenario', title: 'Current vs Scenario Stockout Exposure', screen: 'optimization', question: 'What illustrative stockout reduction do scenarios show?' },
  { id: 'sc_expiry_opportunity', title: 'Expiry Avoidance Opportunity', screen: 'optimization', question: 'What illustrative expiry avoidance do scenarios show?' },
  { id: 'sc_inventory_opportunity', title: 'Inventory Optimization Opportunity', screen: 'optimization', question: 'What illustrative inventory opportunity do scenarios show?' },
  { id: 'sc_constraints', title: 'Feasibility Constraints by Intervention', screen: 'optimization', question: 'Where do eligibility caps constrain modeled benefit?' },
  { id: 'sc_action_priorities', title: 'Management Action Priorities', screen: 'optimization', question: 'Which actions should leadership sequence first?' },
];

export function ownersForScScreen(screen: ScScreenId): ScKpiOwner[] {
  return SC_KPI_OWNERS.filter((item) => item.screen === screen);
}

export function assertUniqueScOwnership(): string[] {
  const seen = new Map<string, string>();
  const issues: string[] = [];
  for (const item of SC_KPI_OWNERS) {
    const prior = seen.get(item.id);
    if (prior) issues.push(`${item.id} owned by both ${prior} and ${item.screen}`);
    else seen.set(item.id, item.screen);
  }
  return issues;
}

export function assertUniqueScCharts(): string[] {
  const seen = new Map<string, string>();
  const issues: string[] = [];
  for (const item of SC_CHART_OWNERS) {
    const prior = seen.get(item.id);
    if (prior) issues.push(`${item.id} chart owned by both ${prior} and ${item.screen}`);
    else seen.set(item.id, item.screen);
  }
  const titles = new Map<string, string>();
  for (const item of SC_CHART_OWNERS) {
    const key = `${item.screen}|${item.title}`;
    const prior = titles.get(key);
    if (prior) issues.push(`duplicate title ${item.title} on ${item.screen}`);
    else titles.set(key, item.id);
  }
  return issues;
}

/** Domains that must not appear as primary SC ownership. */
export const SC_CROSS_DOMAIN_FORBIDDEN = [
  'kpi_rcm_', 'kpi_px_', 'kpi_ed_', 'kpi_bed_', 'kpi_ipd_', 'kpi_opd_', 'kpi_appt_',
  'kpi_surg_', 'kpi_rad_', 'kpi_lab_', 'kpi_rx_', 'kpi_icu_', 'kpi_qs_',
] as const;
