import type { RadiologyView } from './radiologyView';

export type Indicator = {
  domain: string;
  name: string;
  /** Catalog line — definition/formula/unit metadata, not a second headline numeric. */
  summary: string;
  status: 'scenario' | 'constructed' | 'unavailable';
  method: string;
  unit: string;
  formula: string;
  cohort: string;
  aggregation: string;
  scope: string;
  classification: string;
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
  const summary = `${fields.unit} · ${fields.classification} · ${fields.formula}`;
  return {
    domain,
    name,
    summary,
    status: fields.classification,
    method: fields.method,
    unit: fields.unit,
    formula: fields.formula,
    cohort: fields.cohort,
    aggregation: fields.aggregation,
    scope: fields.scope,
    classification: fields.classification === 'scenario' ? 'Scenario fact' : 'Constructed Radiology overlay',
    limitations: fields.limitations,
  };
}

function blank(domain: string, name: string, method: string): Indicator {
  return {
    domain,
    name,
    summary: 'Owned elsewhere — not a Radiology headline',
    status: 'unavailable',
    method,
    unit: 'n/a',
    formula: 'n/a',
    cohort: 'n/a',
    aggregation: 'n/a',
    scope: 'Other domain',
    classification: 'Cross-domain ownership',
    limitations: method,
  };
}

/** Metadata catalog for the selected Radiology view — numbers live only in the KPI ribbon. */
export function radiologyIndicatorsFor(view: RadiologyView): Indicator[] {
  return [
    row('Imaging Activity', 'Diagnostic Imaging Requests', {
      unit: 'requests',
      formula: 'Completed + Cancelled + No-show + Pending = Requests',
      cohort: 'Imaging requests created in the selected hospital and period',
      aggregation: 'Sum of period request events',
      scope: view.periodLabel,
      classification: 'scenario',
      limitations: 'Shared scenario order volume with Radiology pending overlay.',
      method: 'Orders in period. Completed + Cancelled + No-show (+ Pending) = Requests.',
    }),
    row('Imaging Activity', 'Completed Diagnostic Exams', {
      unit: 'exams',
      formula: 'Examination Completed (lifecycle) — distinct from Final Report Signed',
      cohort: 'Exams completed in period',
      aggregation: 'Count of exam-completion events',
      scope: view.periodLabel,
      classification: 'constructed',
      limitations: 'Completed Exams ≠ Signed Reports. Unsigned reports age separately.',
      method: view.methodology.examLifecycle,
    }),
    row('Imaging Activity', 'Imaging Exam Completion Rate', {
      unit: 'rate',
      formula: 'Completed ÷ Requests',
      cohort: 'Same request and completion cohorts',
      aggregation: 'Ratio',
      scope: view.periodLabel,
      classification: 'constructed',
      limitations: 'Pending and cancelled reduce completion rate.',
      method: 'Completed ÷ Requests.',
    }),
    row('Imaging Activity', 'Urgent Imaging Exam Share', {
      unit: 'share',
      formula: 'Urgent requests ÷ Requests',
      cohort: 'Requests with illustrative urgent flag',
      aggregation: 'Share',
      scope: view.periodLabel,
      classification: 'constructed',
      limitations: 'Illustrative urgent share (18%) — not a national triage standard.',
      method: 'Illustrative urgent share of requests (18%).',
    }),
    row('Imaging Activity', 'Pending Imaging Examinations', {
      unit: 'exams',
      formula: 'Open examination-lifecycle requests at observation',
      cohort: 'Requests not yet examined',
      aggregation: 'Point-in-time count',
      scope: view.periodLabel,
      classification: 'constructed',
      limitations: 'Not unsigned reports.',
      method: 'Examination-lifecycle pending at observation — not unsigned reports.',
    }),

    row('Imaging Access', 'Active Diagnostic Imaging Backlog', {
      unit: 'cases',
      formula: 'Closing balance from monthly waitlist ledger',
      cohort: 'Active waitlist at period end',
      aggregation: 'Snapshot (not summed across months)',
      scope: view.periodLabel,
      classification: 'constructed',
      limitations: 'Urgent/emergency may bypass routine waitlist.',
      method: 'Month-end waitlist from monthly ledger. Urgent may bypass.',
    }),
    row('Imaging Access', 'Median Request-to-Exam Wait', {
      unit: 'days',
      formula: 'Median active waitlist age at observation',
      cohort: 'Active backlog (same as bands / overdue)',
      aggregation: 'Median of ages',
      scope: view.periodLabel,
      classification: 'constructed',
      limitations: view.methodology.accessClock,
      method: view.methodology.accessClock,
    }),
    row('Imaging Access', 'P90 Request-to-Exam Wait', {
      unit: 'days',
      formula: 'P90 of active backlog wait ages',
      cohort: 'Active backlog',
      aggregation: '90th percentile',
      scope: view.periodLabel,
      classification: 'constructed',
      limitations: 'Same population as median and wait bands.',
      method: 'P90 of active backlog wait ages (same population as median/bands).',
    }),
    row('Imaging Access', 'Imaging Cases Beyond Access Target', {
      unit: 'cases',
      formula: `Active wait age > ${view.waitTargetDays} days`,
      cohort: 'Active backlog',
      aggregation: 'Count from wait distribution',
      scope: view.periodLabel,
      classification: 'constructed',
      limitations: 'Illustrative 14-day management target — not a national standard.',
      method: `Active wait age > ${view.waitTargetDays} days from the same distribution.`,
    }),
    row('Imaging Access', 'Imaging Waitlist Growth', {
      unit: 'cases',
      formula: 'Closing backlog − Opening backlog',
      cohort: 'Waitlist ledger for the selected period',
      aggregation: 'Net change (not a stock)',
      scope: view.periodLabel,
      classification: 'constructed',
      limitations: 'Growth can be negative while closing backlog remains positive. Distinct from Imaging Backlog stock.',
      method: 'Closing − Opening from the monthly waitlist ledger.',
    }),
    row('Imaging Access', 'Imaging Cases Within Access Target', {
      unit: 'rate',
      formula: 'Within-target backlog ÷ Closing backlog',
      cohort: 'Active backlog',
      aggregation: 'Share',
      scope: view.periodLabel,
      classification: 'constructed',
      limitations: 'Complement of overdue share for the same illustrative target.',
      method: 'Within-target cases ÷ closing backlog from the same wait distribution.',
    }),

    row('Scanner Efficiency', 'Diagnostic Scanner Utilization', {
      unit: 'rate',
      formula: 'In-session used hours ÷ Staffed hours',
      cohort: 'Staffed scanner sessions',
      aggregation: 'Ratio',
      scope: view.periodLabel,
      classification: 'constructed',
      limitations: view.methodology.utilization,
      method: view.methodology.utilization,
    }),
    row('Scanner Efficiency', 'Unused Staffed Scanner Hours', {
      unit: 'hours',
      formula: 'Staffed − in-session used − downtime',
      cohort: 'Staffed sessions',
      aggregation: 'Sum of hours',
      scope: view.periodLabel,
      classification: 'constructed',
      limitations: 'Overtime is separate and not unused staffed time.',
      method: 'Staffed − in-session used − downtime.',
    }),
    row('Scanner Efficiency', 'Median Examination Duration', {
      unit: 'minutes',
      formula: 'Volume-weighted median across modalities',
      cohort: 'Completed exams',
      aggregation: 'Median',
      scope: view.periodLabel,
      classification: 'constructed',
      limitations: 'Modalities have distinct durations — do not use one mean for capacity conversion.',
      method: 'Volume-weighted median across modalities.',
    }),
    row('Scanner Efficiency', 'Diagnostic Scanner Downtime', {
      unit: 'hours',
      formula: 'Downtime inside staffed denominator',
      cohort: 'Staffed scanner hours',
      aggregation: 'Sum of hours',
      scope: view.periodLabel,
      classification: 'constructed',
      limitations: 'Hospital-wide downtime ≠ CT-specific downtime alert.',
      method: 'Inside staffed denominator; CT-specific downtime is separate.',
    }),
    row('Scanner Efficiency', 'Imaging Schedule Adherence Rate', {
      unit: 'rate',
      formula: 'On-schedule exam starts ÷ eligible scheduled starts',
      cohort: 'Staffed imaging sessions',
      aggregation: 'Share',
      scope: view.periodLabel,
      classification: 'constructed',
      limitations: 'Illustrative schedule adherence — feeds late-start recoverable hours.',
      method: 'Share of eligible starts within the on-schedule window.',
    }),

    row('Reporting Quality', 'Median Final Report TAT', {
      unit: 'hours',
      formula: 'Final signed at − exam completed at (signed cohort)',
      cohort: 'Final signed reports',
      aggregation: 'Median',
      scope: view.periodLabel,
      classification: 'constructed',
      limitations: view.methodology.reportTat,
      method: view.methodology.reportTat,
    }),
    row('Reporting Quality', 'P90 Final Report TAT', {
      unit: 'hours',
      formula: 'P90 of signed-report TAT hours',
      cohort: 'Final signed reports',
      aggregation: '90th percentile',
      scope: view.periodLabel,
      classification: 'constructed',
      limitations: 'Unsigned reports excluded from completed TAT.',
      method: 'P90 of signed-report TAT hours.',
    }),
    row('Reporting Quality', 'Final Reports Over TAT Target', {
      unit: 'reports',
      formula: 'Signed reports with TAT > target hours',
      cohort: 'Final signed reports',
      aggregation: 'Count',
      scope: view.periodLabel,
      classification: 'constructed',
      limitations: 'Unsigned reports are excluded from completed TAT over-target counts.',
      method: `Signed reports exceeding the illustrative ${view.reportTatTargetHours}h TAT target.`,
    }),
    row('Reporting Quality', 'Unsigned Diagnostic Reports', {
      unit: 'reports',
      formula: 'Completed exams − signed reports at observation',
      cohort: 'Open reports',
      aggregation: 'Point-in-time count',
      scope: view.periodLabel,
      classification: 'constructed',
      limitations: 'Age separately — no completed TAT until signed.',
      method: 'Completed exams − signed reports at observation.',
    }),
    row('Reporting Quality', 'Diagnostic Exam Repeat Rate', {
      unit: 'rate',
      formula: 'Repeat exams ÷ completed exams',
      cohort: 'Completed exams',
      aggregation: 'Ratio',
      scope: view.periodLabel,
      classification: 'constructed',
      limitations: 'Not every repeat is a quality failure.',
      method: 'Repeat exams ÷ completed. Not every repeat is a quality failure.',
    }),
    row('Reporting Quality', 'Critical Result Acknowledgement Rate', {
      unit: 'rate',
      formula: 'Acknowledged critical results ÷ Critical results',
      cohort: 'Critical imaging findings',
      aggregation: 'Share',
      scope: view.periodLabel,
      classification: 'constructed',
      limitations: 'Distinct from Critical Delay Rate (pending ÷ critical). Not a delay percentage.',
      method: 'Acknowledged ÷ critical results. Delay rate is the pending share.',
    }),

    row('Capacity Optimization', 'Recoverable Scanner Hours', {
      unit: 'hours',
      formula: 'Σ exclusive modality drivers (late start, extended duration, cancel gaps, recoverable downtime)',
      cohort: 'Modality-local staffed sessions',
      aggregation: 'Sum of mutually exclusive hours',
      scope: view.periodLabel,
      classification: 'constructed',
      limitations: view.methodology.capacity,
      method: view.methodology.capacity,
    }),
    row('Capacity Optimization', 'Feasible Additional Imaging Exams', {
      unit: 'exams',
      formula: 'Σ min(modality potential extras, modality eligible demand)',
      cohort: 'Modality-compatible waitlist demand',
      aggregation: 'Sum of modality-feasible counts',
      scope: view.periodLabel,
      classification: 'constructed',
      limitations: 'Modeled opportunity — not achieved productivity. Modalities are not interchangeable.',
      method: 'Σ modality-feasible extras. Modeled — not achieved.',
    }),
    row('Capacity Optimization', 'Eligible Imaging Waitlist Cases', {
      unit: 'cases',
      formula: 'Σ modality eligible demand',
      cohort: 'Overdue-weighted routine waitlist share by modality',
      aggregation: 'Sum',
      scope: view.periodLabel,
      classification: 'constructed',
      limitations: 'Demand cap for additional exams — not the full closing backlog.',
      method: 'Sum of modality-eligible waitlist cases that could use recovered capacity.',
    }),

    blank('Cross-domain context', 'Bed Occupancy', 'Owned by Beds & Capacity. Radiology references occupancy only as a capacity constraint.'),
    blank('Cross-domain context', 'OR Utilization', 'Owned by Surgery. Preoperative imaging demand is contextual only.'),
    blank('Cross-domain context', 'Appointment Slot Fill Rate', 'Owned by Appointments. Imaging slots are not clinic appointment slots.'),
  ];
}

export const RADIOLOGY_AI_CASES = [
  { id: 'rad-mri-duration', name: 'MRI duration reduction sketch', level: 'Illustrative', limit: 'Prep and safety time remain' },
  { id: 'rad-ct-downtime', name: 'CT downtime reduction', level: 'Illustrative', limit: 'Not all downtime is recoverable' },
  { id: 'rad-staffed-hours', name: 'Extend staffed imaging hours', level: 'Illustrative', limit: 'Requires staffing — not free capacity' },
  { id: 'rad-report-tat', name: 'Report TAT improvement', level: 'Illustrative', limit: 'Separate from scanner capacity' },
  { id: 'rad-reallocate', name: 'Routine slot reallocation', level: 'Illustrative', limit: 'Does not convert MRI into CT without shared resources' },
  { id: 'rad-backlog', name: 'Eligible backlog prioritization', level: 'Illustrative', limit: 'Operational rules only — not clinical triage' },
];
