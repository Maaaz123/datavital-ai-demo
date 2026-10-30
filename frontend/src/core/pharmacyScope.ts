import type { Indicator } from './laboratoryScope';
import type { PharmacyView } from './pharmacyView';

export type { Indicator };

function row(
  domain: string,
  name: string,
  fields: {
    unit: string;
    formula: string;
    cohort: string;
    aggregation: string;
    scope: string;
    classification: 'scenario' | 'constructed';
    limitations: string;
    method: string;
  },
): Indicator {
  return {
    domain,
    name,
    summary: `${fields.unit} · ${fields.classification} · ${fields.formula}`,
    status: fields.classification,
    method: fields.method,
    unit: fields.unit,
    formula: fields.formula,
    cohort: fields.cohort,
    aggregation: fields.aggregation,
    scope: fields.scope,
    limitations: fields.limitations,
  };
}

function blank(domain: string, name: string, method: string): Indicator {
  return {
    domain,
    name,
    summary: 'Owned elsewhere — not a Pharmacy headline',
    status: 'unavailable',
    method,
    unit: 'n/a',
    formula: 'n/a',
    cohort: 'n/a',
    aggregation: 'n/a',
    scope: 'Other domain',
    limitations: method,
  };
}

export function pharmacyIndicatorsFor(view: PharmacyView): Indicator[] {
  const m = view.methodology;
  return [
    row('Medication Activity', 'Medication Orders', {
      unit: 'orders', formula: 'Unique medication orders in period', cohort: 'Orders',
      aggregation: 'Count', scope: view.periodLabel, classification: 'scenario',
      limitations: m.grains, method: m.grains,
    }),
    row('Medication Activity', 'Pharmacist-Verified Orders', {
      unit: 'orders', formula: 'Orders − cancelled before verification − verification backlog', cohort: 'Orders',
      aggregation: 'Count', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Verification is an order-level step; it is not a line count.', method: 'Orders that cleared pharmacist verification.',
    }),
    row('Medication Activity', 'Dispensed Medication Lines', {
      unit: 'lines', formula: 'Σ monthly dispensed order lines', cohort: 'Order lines',
      aggregation: 'Count', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Lines ≠ orders ≠ dispense transactions.', method: m.ledger,
    }),
    row('Medication Activity', 'Dispensing Completion Rate', {
      unit: 'rate', formula: 'Dispensed Lines ÷ (opening open lines + new lines)', cohort: 'Handled order lines',
      aggregation: 'Ratio', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Cancelled and still-pending lines reduce completion.', method: m.ledger,
    }),
    row('Medication Activity', 'Pending Medication Orders', {
      unit: 'orders', formula: 'Orders − dispensed − cancelled at observation', cohort: 'Open orders',
      aggregation: 'Point-in-time', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Pending orders are not pending lines and not the verification backlog alone.', method: 'Open orders not yet dispensed.',
    }),
    row('Medication Activity', 'Urgent Medication Order Share', {
      unit: 'share', formula: 'Urgent orders ÷ Orders', cohort: 'Orders',
      aggregation: 'Share', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Illustrative priority mix; not a clinical triage score.', method: 'Urgent ÷ orders.',
    }),

    row('Dispensing Flow', 'Median Dispensing Turnaround', {
      unit: 'minutes', formula: 'Median(dispense − verification)', cohort: 'Dispensed orders',
      aggregation: 'Median', scope: view.periodLabel, classification: 'constructed',
      limitations: m.tat, method: m.tat,
    }),
    row('Dispensing Flow', 'P90 Dispensing Turnaround', {
      unit: 'minutes', formula: 'P90(dispense − verification)', cohort: 'Dispensed orders',
      aggregation: 'P90', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Not an average of monthly P90 values.', method: 'P90 of dispensing turnaround.',
    }),
    row('Dispensing Flow', 'Dispenses Exceeding TAT Target', {
      unit: 'orders', formula: 'Dispensed orders with TAT > target', cohort: 'Dispensed orders',
      aggregation: 'Count', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Illustrative management target.', method: 'Over-target dispensed orders.',
    }),
    row('Dispensing Flow', 'Orders Awaiting Pharmacist Verification', {
      unit: 'orders', formula: 'Open orders not yet verified at observation', cohort: 'Open orders',
      aggregation: 'Point-in-time', scope: view.periodLabel, classification: 'constructed',
      limitations: 'A subset of Pending Orders; distinct from dispensing queue.', method: 'Verification queue at observation.',
    }),
    row('Dispensing Flow', 'First-Pass Dispensing Rate', {
      unit: 'rate', formula: 'First-pass lines ÷ Dispensed Lines', cohort: 'Dispensed lines',
      aggregation: 'Ratio', scope: view.periodLabel, classification: 'constructed',
      limitations: 'First pass excludes both rework and clarification lines; it is not 1 − Rework Rate.', method: 'First-pass ÷ dispensed lines.',
    }),
    row('Dispensing Flow', 'Dispensing Rework Rate', {
      unit: 'rate', formula: 'Rework lines ÷ Dispensed Lines', cohort: 'Dispensed lines',
      aggregation: 'Ratio', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Clarification lines are counted separately.', method: 'Rework ÷ dispensed lines.',
    }),

    row('Inventory Position', 'Closing Medication Inventory Value', {
      unit: 'SAR', formula: 'Σ closing units × unit cost', cohort: 'Closing stock',
      aggregation: 'Point-in-time', scope: view.periodLabel, classification: 'constructed',
      limitations: m.inventory, method: m.inventory,
    }),
    row('Inventory Position', 'Stocked-Out SKUs', {
      unit: 'SKUs', formula: 'Active SKUs with zero available stock', cohort: 'Active SKUs',
      aggregation: 'Point-in-time', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Mutually exclusive with Low-Stock SKUs.', method: 'Zero-stock SKU count.',
    }),
    row('Inventory Position', 'Low-Stock SKUs', {
      unit: 'SKUs', formula: 'Active SKUs below reorder cover, stock > 0', cohort: 'Active SKUs',
      aggregation: 'Point-in-time', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Does not include stocked-out SKUs.', method: 'Below-reorder SKUs with stock on hand.',
    }),
    row('Inventory Position', 'Medication Days of Supply', {
      unit: 'days', formula: 'Closing value ÷ (Spend ÷ days in period)', cohort: 'Closing stock',
      aggregation: 'Ratio', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Value-weighted; class-level cover differs.', method: 'Closing stock value ÷ average daily issue value.',
    }),
    row('Inventory Position', 'Near-Expiry Stock Value', {
      unit: 'SAR', formula: 'Σ units in ≤90-day batches × unit cost', cohort: 'Closing batches',
      aggregation: 'Point-in-time', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Exposure, not a write-off; expired value is a separate cost KPI.', method: 'Closing batches expiring within 90 days.',
    }),

    row('Safety Process', 'Verification Exception Rate', {
      unit: 'rate', formula: 'Exception orders ÷ Verified Orders', cohort: 'Verified orders',
      aggregation: 'Ratio', scope: view.periodLabel, classification: 'constructed',
      limitations: m.safety, method: m.safety,
    }),
    row('Safety Process', 'High-Alert Medication Check Compliance', {
      unit: 'rate', formula: 'Lines with independent check ÷ High-alert lines', cohort: 'High-alert lines',
      aggregation: 'Ratio', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Process compliance only; not a clinical outcome.', method: 'Checked ÷ high-alert lines.',
    }),
    row('Safety Process', 'Barcode Administration Scan Rate', {
      unit: 'rate', formula: 'Scanned ÷ Administration events', cohort: 'Administration events',
      aggregation: 'Ratio', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Administration events ≠ orders ≠ dispenses.', method: 'Scanned administrations ÷ administration events.',
    }),
    row('Safety Process', 'Medication Incident Reports', {
      unit: 'reports', formula: 'Reported medication process incidents', cohort: 'Incident reports',
      aggregation: 'Count', scope: view.periodLabel, classification: 'scenario',
      limitations: 'Reports reflect reporting culture; not an incidence of harm.', method: 'Illustrative incident reports.',
    }),
    row('Safety Process', 'Unresolved Incident Reviews', {
      unit: 'reviews', formula: 'Reports − closed reviews at observation', cohort: 'Incident reports',
      aggregation: 'Point-in-time', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Aged separately from reports in period.', method: 'Open reviews at observation.',
    }),

    row('Cost & Waste', 'Medication Dispensing Spend', {
      unit: 'SAR', formula: 'Σ issued units × unit cost', cohort: 'Issued units',
      aggregation: 'Sum', scope: view.periodLabel, classification: 'scenario',
      limitations: m.cost, method: m.cost,
    }),
    row('Cost & Waste', 'Medication Cost per Dispensed Line', {
      unit: 'SAR', formula: 'Spend ÷ Dispensed Lines', cohort: 'Dispensed lines',
      aggregation: 'Ratio', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Excludes write-offs; class mix drives the average.', method: 'Spend ÷ dispensed lines.',
    }),
    row('Cost & Waste', 'Expired Stock Write-off Value', {
      unit: 'SAR', formula: 'Σ expired units × unit cost', cohort: 'Expired units',
      aggregation: 'Sum', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Not included in Spend; not double-counted in Avoidable Waste.', method: 'Expired write-offs.',
    }),
    row('Cost & Waste', 'Potentially Avoidable Medication Waste', {
      unit: 'SAR', formula: 'Avoidable share of expired + discarded value', cohort: 'Write-offs',
      aggregation: 'Sum', scope: view.periodLabel, classification: 'constructed',
      limitations: 'A subset of write-offs, never added on top of them.', method: 'Avoidable share of write-offs.',
    }),
    row('Cost & Waste', 'Potential Medication Savings', {
      unit: 'SAR', formula: 'Σ exclusive savings drivers', cohort: 'Spend and write-offs',
      aggregation: 'Sum', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Illustrative — not achieved savings; each SAR counted once.', method: 'Exclusive driver sum.',
    }),

    row('Capacity Optimization', 'Potentially Recoverable Pharmacy Hours', {
      unit: 'hours', formula: 'Σ exclusive workflow drivers', cohort: 'Workflow staffed hours',
      aggregation: 'Sum', scope: view.periodLabel, classification: 'constructed',
      limitations: m.capacity, method: m.capacity,
    }),
    row('Capacity Optimization', 'Feasible Additional Dispensing Capacity', {
      unit: 'lines', formula: 'Σ min(potential, eligible) by workflow', cohort: 'Workflow pending lines',
      aggregation: 'Sum', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Illustrative — not achieved; workflows are not interchangeable.', method: 'Workflow-feasible additional lines.',
    }),
    row('Capacity Optimization', 'Eligible Pending Lines', {
      unit: 'lines', formula: 'Σ workflow eligible pending lines', cohort: 'Pending lines',
      aggregation: 'Sum', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Demand cap for additional lines.', method: 'Pending lines eligible for recovered hours.',
    }),
    row('Capacity Optimization', 'Feasible Dispensing TAT Reduction', {
      unit: 'minutes', formula: 'Median TAT × queue and clarification recoverable share (capped at 30%)', cohort: 'Dispensed orders',
      aggregation: 'Modeled', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Illustrative upper bound — not a measured improvement.', method: 'Recoverable queue and clarification hours scaled to median TAT.',
    }),

    blank('Cross-domain context', 'Bed Occupancy', 'Owned by Beds. Pharmacy uses inpatient order volume as context only.'),
    blank('Cross-domain context', 'Analyzer Utilization', 'Owned by Laboratory. Pharmacy workflow hours are distinct from analyzer hours.'),
    blank('Cross-domain context', 'OR Utilization', 'Owned by Surgery. Perioperative medication demand is context only.'),
  ];
}

export const PHARMACY_AI_CASES = [
  { id: 'rx-tat', name: 'Reduce dispensing turnaround', level: 'Illustrative', limit: 'Queue and clarification gaps only' },
  { id: 'rx-stockout', name: 'Reduce stockout SKUs', level: 'Illustrative', limit: 'Supply and lead-time constraints remain' },
  { id: 'rx-expiry', name: 'Reduce near-expiry exposure', level: 'Illustrative', limit: 'Not every batch can be redistributed' },
  { id: 'rx-barcode', name: 'Raise barcode scan coverage', level: 'Illustrative', limit: 'Process signal, not an outcome claim' },
  { id: 'rx-staffed', name: 'Extend staffed pharmacy hours', level: 'Illustrative', limit: 'Requires staffing and workflow fit' },
  { id: 'rx-waste', name: 'Reduce avoidable waste', level: 'Illustrative', limit: 'Not all waste is avoidable' },
];
