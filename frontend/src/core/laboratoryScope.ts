import type { LaboratoryView } from './laboratoryView';

export type Indicator = {
  domain: string;
  name: string;
  summary: string;
  status: 'scenario' | 'constructed' | 'unavailable';
  method: string;
  unit: string;
  formula: string;
  cohort: string;
  aggregation: string;
  scope: string;
  limitations: string;
};

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
    summary: 'Owned elsewhere — not a Laboratory headline',
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

export function laboratoryIndicatorsFor(view: LaboratoryView): Indicator[] {
  return [
    row('Lab Activity', 'Laboratory Test Orders', {
      unit: 'orders', formula: 'Unique eligible laboratory orders', cohort: 'Orders in period',
      aggregation: 'Count', scope: view.periodLabel, classification: 'scenario',
      limitations: view.methodology.grains, method: view.methodology.grains,
    }),
    row('Lab Activity', 'Completed Laboratory Tests', {
      unit: 'tests', formula: 'Released test results (analysis + validation)', cohort: 'Test items',
      aggregation: 'Count', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Distinct from orders and specimens.', method: 'Released results in period.',
    }),
    row('Lab Activity', 'Laboratory Test Completion Rate', {
      unit: 'rate', formula: 'Completed Tests ÷ Test Items', cohort: 'Test items',
      aggregation: 'Ratio', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Pending and cancelled reduce completion.', method: 'Completed ÷ test items.',
    }),
    row('Lab Activity', 'Pending Laboratory Tests', {
      unit: 'tests', formula: 'Open test-lifecycle items at observation', cohort: 'Test items',
      aggregation: 'Point-in-time', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Not pending validation alone.', method: 'Open unfinished tests at observation.',
    }),
    row('Lab Activity', 'Stat Priority Test Share', {
      unit: 'share', formula: 'STAT tests ÷ Test items', cohort: 'Test items',
      aggregation: 'Share', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Illustrative STAT share.', method: 'STAT ÷ test items.',
    }),

    row('Pre-Analytics', 'Samples Received by Laboratory', {
      unit: 'specimens', formula: 'Distinct received specimens', cohort: 'Specimens',
      aggregation: 'Count', scope: view.periodLabel, classification: 'constructed',
      limitations: view.methodology.specimenLifecycle, method: view.methodology.specimenLifecycle,
    }),
    row('Pre-Analytics', 'Specimen Rejection Rate', {
      unit: 'rate', formula: 'Rejected ÷ Assessed specimens', cohort: 'Assessed specimens',
      aggregation: 'Ratio', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Not equal to hemolysis rate.', method: 'Rejected ÷ assessed.',
    }),
    row('Pre-Analytics', 'Median Specimen Transport Time', {
      unit: 'minutes', formula: 'Median(receipt − collection)', cohort: 'Received specimens',
      aggregation: 'Median', scope: view.periodLabel, classification: 'constructed',
      limitations: view.methodology.accessClock, method: view.methodology.accessClock,
    }),
    row('Pre-Analytics', 'Hemolyzed Specimen Rate', {
      unit: 'rate', formula: 'Hemolyzed ÷ Assessed', cohort: 'Assessed specimens',
      aggregation: 'Ratio', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Overlaps rejection; not all hemolyzed are rejected.', method: 'Hemolyzed ÷ assessed.',
    }),
    row('Pre-Analytics', 'Specimen Recollection Rate', {
      unit: 'rate', formula: 'Recollections ÷ Assessed', cohort: 'Assessed specimens',
      aggregation: 'Ratio', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Does not duplicate original orders.', method: 'Recollections ÷ assessed.',
    }),

    row('Analyzer Efficiency', 'Analyzer Utilization', {
      unit: 'rate', formula: 'In-session ÷ Staffed', cohort: 'Staffed analyzer sessions',
      aggregation: 'Ratio', scope: view.periodLabel, classification: 'constructed',
      limitations: view.methodology.utilization, method: view.methodology.utilization,
    }),
    row('Analyzer Efficiency', 'Analyzer Equipment Downtime', {
      unit: 'hours', formula: 'Downtime inside staffed denominator', cohort: 'Staffed hours',
      aggregation: 'Sum', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Section downtime is not interchangeable.', method: 'Equipment downtime hours.',
    }),
    row('Analyzer Efficiency', 'Unused Staffed Analyzer Hours', {
      unit: 'hours', formula: 'Staffed − in-session − QC − downtime', cohort: 'Staffed hours',
      aggregation: 'Sum', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Overtime is separate.', method: 'Unused staffed analyzer hours.',
    }),
    row('Analyzer Efficiency', 'Laboratory Testing Backlog', {
      unit: 'tests', formula: 'Tests awaiting analysis at observation', cohort: 'Pending tests',
      aggregation: 'Point-in-time', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Distinct from pending validation.', method: 'Pending analysis cohort.',
    }),
    row('Analyzer Efficiency', 'Tests per Analyzer Hour', {
      unit: 'tests/h', formula: 'Completed Tests ÷ In-session hours', cohort: 'Completed tests',
      aggregation: 'Ratio', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Section throughputs differ.', method: 'Completed ÷ in-session hours.',
    }),

    row('Result Quality', 'Median Laboratory Result TAT', {
      unit: 'hours', formula: 'Median(release − receipt)', cohort: 'Released results',
      aggregation: 'Median', scope: view.periodLabel, classification: 'constructed',
      limitations: view.methodology.reportTat, method: view.methodology.reportTat,
    }),
    row('Result Quality', 'P90 Laboratory Result TAT', {
      unit: 'hours', formula: 'P90(release − receipt)', cohort: 'Released results',
      aggregation: 'P90', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Unsigned/pending validation excluded.', method: 'P90 of released TAT.',
    }),
    row('Result Quality', 'Results Exceeding TAT Target', {
      unit: 'results', formula: 'Released with TAT > target', cohort: 'Released results',
      aggregation: 'Count', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Illustrative target.', method: 'Over-target released results.',
    }),
    row('Result Quality', 'Results Awaiting Validation', {
      unit: 'results', formula: 'Open validation queue', cohort: 'Analyzed awaiting release',
      aggregation: 'Point-in-time', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Not completed TAT.', method: 'Pending validation aging.',
    }),
    row('Result Quality', 'Critical Result Notification Rate', {
      unit: 'rate', formula: 'Notified ÷ Critical results', cohort: 'Critical results',
      aggregation: 'Ratio', scope: view.periodLabel, classification: 'constructed',
      limitations: view.methodology.critical, method: view.methodology.critical,
    }),
    row('Result Quality', 'Corrected Laboratory Report Rate', {
      unit: 'rate', formula: 'Corrected ÷ Released', cohort: 'Released results',
      aggregation: 'Ratio', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Post-release corrections only.', method: 'Corrected ÷ released.',
    }),

    row('Capacity Optimization', 'Potentially Recoverable Lab Hours', {
      unit: 'hours', formula: 'Σ exclusive section drivers', cohort: 'Section staffed sessions',
      aggregation: 'Sum', scope: view.periodLabel, classification: 'constructed',
      limitations: view.methodology.capacity, method: view.methodology.capacity,
    }),
    row('Capacity Optimization', 'Feasible Additional Testing Capacity', {
      unit: 'tests', formula: 'Σ min(potential, eligible) by section', cohort: 'Section backlog',
      aggregation: 'Sum', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Illustrative — not achieved.', method: 'Section-feasible additional tests.',
    }),
    row('Capacity Optimization', 'Eligible Testing Backlog', {
      unit: 'tests', formula: 'Σ section eligible backlog', cohort: 'Pending tests',
      aggregation: 'Sum', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Demand cap for additional tests.', method: 'Eligible backlog for recovered hours.',
    }),

    blank('Cross-domain context', 'ED Visit Volume', 'Owned by Emergency. Laboratory uses ED-origin STAT demand as context only.'),
    blank('Cross-domain context', 'Scanner Utilization', 'Owned by Radiology. Laboratory analyzers are distinct from imaging scanners.'),
    blank('Cross-domain context', 'OR Utilization', 'Owned by Surgery. Preoperative labs are contextual only.'),
  ];
}

export const LABORATORY_AI_CASES = [
  { id: 'lab-reject', name: 'Reduce preventable rejections', level: 'Illustrative', limit: 'Not all rejections are avoidable' },
  { id: 'lab-transport', name: 'Improve specimen transport', level: 'Illustrative', limit: 'Care-setting constraints remain' },
  { id: 'lab-downtime', name: 'Reduce analyzer downtime', level: 'Illustrative', limit: 'Section-compatible only' },
  { id: 'lab-stat-tat', name: 'Improve STAT result TAT', level: 'Illustrative', limit: 'Not a clinical outcome claim' },
  { id: 'lab-staffed', name: 'Extend staffed lab sessions', level: 'Illustrative', limit: 'Requires staffing and reagents' },
  { id: 'lab-validation', name: 'Clear validation backlog', level: 'Illustrative', limit: 'Separate from analyzer capacity' },
];
