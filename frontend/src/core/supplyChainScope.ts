import type { ScView } from './supplyChainView';

export type Indicator = {
  screen: string;
  name: string;
  unit: string;
  formula: string;
  cohort: string;
  aggregation: string;
  scope: string;
  classification: 'constructed' | 'scenario' | 'unavailable';
  limitations: string;
  method: string;
};

function row(screen: string, name: string, fields: Omit<Indicator, 'screen' | 'name'>): Indicator {
  return { screen, name, ...fields };
}

export function scIndicatorsFor(view: ScView): Indicator[] {
  const scope = view.periodLabel;
  const at = view.observationDate;
  const m = view.methodology;
  return [
    row('Command', 'Supply Availability Rate', {
      unit: 'rate', formula: 'Available SKU-days ÷ plan SKU-days', cohort: 'Formulary plan',
      aggregation: 'Ratio', scope, classification: 'constructed', limitations: m.inventory, method: m.inventory,
    }),
    row('Command', 'Critical Stockout Exposure', {
      unit: 'SKUs', formula: 'Critical SKUs with zero available usable stock', cohort: 'Critical formulary',
      aggregation: 'Period-end stock', scope: at, classification: 'constructed', limitations: m.inventory, method: m.inventory,
    }),
    row('Command', 'Inventory Value', {
      unit: 'fictional SAR', formula: 'Period-end on-hand × unit cost', cohort: 'On-hand inventory',
      aggregation: 'Snapshot', scope: at, classification: 'constructed', limitations: 'Snapshot — not sum of monthly snapshots.', method: m.inventory,
    }),
    row('Command', 'Supplier On-Time Delivery', {
      unit: 'rate', formula: 'On-time receipts ÷ receipts', cohort: 'Goods receipts',
      aggregation: 'Ratio', scope, classification: 'constructed', limitations: m.suppliers, method: m.suppliers,
    }),
    row('Command', 'Expiry Risk Value', {
      unit: 'fictional SAR', formula: 'Near-expiry usable stock × unit cost', cohort: 'Near-expiry window',
      aggregation: 'Snapshot', scope: at, classification: 'constructed', limitations: m.waste, method: m.waste,
    }),
    row('Command', 'Purchase Order Backlog', {
      unit: 'POs', formula: 'Open incomplete purchase orders', cohort: 'PO ledger',
      aggregation: 'Period-end stock', scope: at, classification: 'constructed', limitations: m.procurement, method: m.procurement,
    }),
    row('Inventory', 'Available Inventory Units', {
      unit: 'units', formula: 'Usable available quantity at observation', cohort: 'On-hand excluding blocked dispositions',
      aggregation: 'Snapshot', scope: at, classification: 'constructed', limitations: m.inventory, method: m.inventory,
    }),
    row('Inventory', 'Critical SKUs Below Safety Stock', {
      unit: 'SKUs', formula: 'Critical SKUs below documented safety stock', cohort: 'Critical formulary',
      aggregation: 'Snapshot', scope: at, classification: 'constructed', limitations: m.inventory, method: m.inventory,
    }),
    row('Inventory', 'Inventory Turnover', {
      unit: 'turns', formula: 'Issued units ÷ average on-hand usable units', cohort: 'Usable inventory',
      aggregation: 'Ratio', scope, classification: 'constructed', limitations: 'Unit turnover — not value/usage.', method: m.inventory,
    }),
    row('Inventory', 'Days of Supply', {
      unit: 'days', formula: 'Available usable ÷ forecast avg daily unit demand', cohort: 'Usable inventory',
      aggregation: 'Cover', scope: at, classification: 'constructed', limitations: m.dos, method: m.dos,
    }),
    row('Inventory', 'Inventory Accuracy', {
      unit: 'rate', formula: 'Cycle-count lines within tolerance ÷ counted lines', cohort: 'Cycle counts',
      aggregation: 'Ratio', scope, classification: 'constructed', limitations: m.inventory, method: m.inventory,
    }),
    row('Inventory', 'Replenishment Exceptions', {
      unit: 'exceptions', formula: 'Open replenishment exceptions at observation', cohort: 'Exception ledger',
      aggregation: 'Stock', scope: at, classification: 'constructed', limitations: m.inventory, method: m.inventory,
    }),
    row('Procurement', 'Open Purchase Orders', {
      unit: 'POs', formula: 'POs with remaining quantity', cohort: 'PO ledger',
      aggregation: 'Stock', scope: at, classification: 'constructed', limitations: m.procurement, method: m.procurement,
    }),
    row('Procurement', 'PO Approval Turnaround', {
      unit: 'hours', formula: 'Median requisition-to-approval hours', cohort: 'Approved POs',
      aggregation: 'Median', scope, classification: 'constructed', limitations: m.procurement, method: m.procurement,
    }),
    row('Procurement', 'Purchase Order Cycle Time', {
      unit: 'days', formula: 'Median approval-to-first-receipt days', cohort: 'Received POs',
      aggregation: 'Median', scope, classification: 'constructed', limitations: m.procurement, method: m.procurement,
    }),
    row('Procurement', 'Purchase Price Variance', {
      unit: 'fictional SAR', formula: '(Actual − standard) × received qty', cohort: 'Receipts',
      aggregation: 'Sum', scope, classification: 'constructed', limitations: m.procurement, method: m.procurement,
    }),
    row('Procurement', 'Procurement Exceptions', {
      unit: 'exceptions', formula: 'Open procurement exceptions', cohort: 'Exception ledger',
      aggregation: 'Stock', scope: at, classification: 'constructed', limitations: m.procurement, method: m.procurement,
    }),
    row('Procurement', 'On-Time PO Fulfillment', {
      unit: 'rate', formula: 'PO lines received by need-by ÷ lines due', cohort: 'PO lines due',
      aggregation: 'Ratio', scope, classification: 'constructed', limitations: m.procurement, method: m.procurement,
    }),
    row('Suppliers', 'Supplier Fill Rate', {
      unit: 'rate', formula: 'Quantity received ÷ quantity ordered', cohort: 'Closed PO lines',
      aggregation: 'Ratio', scope, classification: 'constructed', limitations: 'Fill ≠ OTD. Cheapest ≠ safest.', method: m.suppliers,
    }),
    row('Suppliers', 'Contract Compliance', {
      unit: 'rate', formula: 'Contracted spend ÷ eligible contracted-category spend', cohort: 'Eligible spend',
      aggregation: 'Ratio', scope, classification: 'constructed', limitations: m.suppliers, method: m.suppliers,
    }),
    row('Suppliers', 'Defective Delivery Rate', {
      unit: 'rate', formula: 'Defective qty ÷ received qty', cohort: 'Receipts',
      aggregation: 'Ratio', scope, classification: 'constructed', limitations: m.suppliers, method: m.suppliers,
    }),
    row('Suppliers', 'Supplier Concentration Exposure', {
      unit: 'share', formula: 'Largest supplier share of critical SKU spend', cohort: 'Critical spend',
      aggregation: 'Share', scope, classification: 'constructed', limitations: m.suppliers, method: m.suppliers,
    }),
    row('Suppliers', 'Contract Renewal Risk', {
      unit: 'contracts', formula: 'Contracts expiring ≤90 days without renewal action', cohort: 'Active contracts',
      aggregation: 'Stock', scope: at, classification: 'constructed', limitations: m.suppliers, method: m.suppliers,
    }),
    row('Suppliers', 'Dual-Source Coverage', {
      unit: 'rate', formula: 'Critical SKUs with ≥2 approved suppliers ÷ critical SKUs', cohort: 'Critical formulary',
      aggregation: 'Ratio', scope, classification: 'constructed', limitations: m.suppliers, method: m.suppliers,
    }),
    row('Consumption', 'Clinical Consumption Volume', {
      unit: 'units', formula: 'Units issued to clinical points of use', cohort: 'Issue events',
      aggregation: 'Sum (flow)', scope, classification: 'constructed', limitations: 'Event flow — not a stock.', method: m.inventory,
    }),
    row('Consumption', 'Consumption per Eligible Encounter', {
      unit: 'units / encounter', formula: 'Issued units ÷ eligible encounters', cohort: 'Eligible encounters',
      aggregation: 'Ratio', scope, classification: 'constructed', limitations: m.inventory, method: m.inventory,
    }),
    row('Consumption', 'High-Variation Supply Categories', {
      unit: 'categories', formula: 'Categories above CV management threshold', cohort: 'Supply categories',
      aggregation: 'Count', scope, classification: 'constructed', limitations: m.inventory, method: m.inventory,
    }),
    row('Consumption', 'Consumption Forecast Deviation', {
      unit: 'rate', formula: '|Actual − forecast| ÷ forecast', cohort: 'Forecasted categories',
      aggregation: 'Ratio', scope, classification: 'constructed', limitations: m.inventory, method: m.inventory,
    }),
    row('Consumption', 'Replenishment Lead Time', {
      unit: 'days', formula: 'Median reorder-signal to available stock', cohort: 'Clinical replenishment',
      aggregation: 'Median', scope, classification: 'constructed', limitations: m.inventory, method: m.inventory,
    }),
    row('Consumption', 'Unusual Consumption Signals', {
      unit: 'signals', formula: 'Open unusual consumption signals', cohort: 'Signal ledger',
      aggregation: 'Stock', scope: at, classification: 'constructed', limitations: m.inventory, method: m.inventory,
    }),
    row('Waste', 'Expired Inventory Value', {
      unit: 'fictional SAR', formula: 'Expired units × unit cost', cohort: 'Expired disposition',
      aggregation: 'Sum (flow)', scope, classification: 'constructed', limitations: m.waste, method: m.waste,
    }),
    row('Waste', 'Near-Expiry Exposure', {
      unit: 'fictional SAR', formula: 'Near-expiry usable × unit cost', cohort: 'Near-expiry window',
      aggregation: 'Snapshot', scope: at, classification: 'constructed', limitations: m.waste, method: m.waste,
    }),
    row('Waste', 'Inventory Waste Rate', {
      unit: 'rate', formula: '(Expired + damaged + obsolete) ÷ issued', cohort: 'Issues',
      aggregation: 'Ratio', scope, classification: 'constructed', limitations: m.waste, method: m.waste,
    }),
    row('Waste', 'Damaged Stock Value', {
      unit: 'fictional SAR', formula: 'Damaged units × unit cost', cohort: 'Damaged disposition',
      aggregation: 'Sum (flow)', scope, classification: 'constructed', limitations: m.waste, method: m.waste,
    }),
    row('Waste', 'Stock Adjustment Exceptions', {
      unit: 'exceptions', formula: 'Open adjustment exceptions', cohort: 'Adjustment ledger',
      aggregation: 'Stock', scope: at, classification: 'constructed', limitations: m.waste, method: m.waste,
    }),
    row('Waste', 'Avoidable Procurement Exposure', {
      unit: 'fictional SAR', formula: 'Illustrative avoidable over-buy exposure', cohort: 'Scenario-linked',
      aggregation: 'Modeled', scope, classification: 'scenario', limitations: m.optimization, method: m.optimization,
    }),
    row('Optimization', 'Addressable Stockout Risk', {
      unit: 'SKUs', formula: 'Illustrative addressable critical stockouts', cohort: 'Critical formulary',
      aggregation: 'Modeled', scope, classification: 'scenario', limitations: m.optimization, method: m.optimization,
    }),
    row('Optimization', 'Inventory Optimization Opportunity', {
      unit: 'fictional SAR', formula: 'Illustrative inventory opportunity', cohort: 'Eligible excess / cover',
      aggregation: 'Modeled', scope, classification: 'scenario', limitations: m.optimization, method: m.optimization,
    }),
    row('Optimization', 'Expiry Avoidance Opportunity', {
      unit: 'fictional SAR', formula: 'Illustrative avoidable expiry / near-expiry', cohort: 'Near-expiry + expired',
      aggregation: 'Modeled', scope, classification: 'scenario', limitations: m.optimization, method: m.optimization,
    }),
    row('Optimization', 'Replenishment Improvement Potential', {
      unit: 'exceptions', formula: 'Illustrative replenishment-exception reduction', cohort: 'Replenishment exceptions',
      aggregation: 'Modeled', scope, classification: 'scenario', limitations: m.optimization, method: m.optimization,
    }),
    row('Optimization', 'Supplier Diversification Opportunities', {
      unit: 'SKUs', formula: 'Critical SKUs eligible for dual-source', cohort: 'High-concentration critical SKUs',
      aggregation: 'Modeled', scope, classification: 'scenario', limitations: m.optimization, method: m.optimization,
    }),
  ];
}

export const SC_AI_CASES = [
  { title: 'Investigate critical stockout exposure', owner: 'Materials Management', followUp: 'Critical Stockout Exposure' },
  { title: 'Review supplier fill rate vs on-time delivery', owner: 'Supplier Performance', followUp: 'Supplier Fill Rate / Supplier OTD' },
  { title: 'Reduce near-expiry and expiry write-offs', owner: 'Inventory Control', followUp: 'Near-Expiry Exposure' },
  { title: 'Improve dual-source coverage for critical SKUs', owner: 'Strategic Sourcing', followUp: 'Dual-Source Coverage' },
] as const;
