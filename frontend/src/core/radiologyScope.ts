import type { RadiologyView } from './radiologyView';

export type Indicator = {
  domain: string;
  name: string;
  value: string;
  status: 'scenario' | 'constructed' | 'unavailable';
  method: string;
};

function num(value: number, digits = 0): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function row(domain: string, name: string, value: string, status: Indicator['status'], method: string): Indicator {
  return { domain, name, value, status, method };
}

function blank(domain: string, name: string, method: string): Indicator {
  return { domain, name, value: 'Not available', status: 'unavailable', method };
}

export function radiologyIndicatorsFor(view: RadiologyView): Indicator[] {
  return [
    row('Imaging Activity', 'Diagnostic Imaging Requests', num(view.requests), 'scenario', 'Orders in period. Completed + Cancelled + No-show (+ Pending) = Requests.'),
    row('Imaging Activity', 'Completed Diagnostic Exams', num(view.completed), 'scenario', 'Reported/completed exams in the period.'),
    row('Imaging Activity', 'Imaging Exam Completion Rate', pct(view.completionRate), 'constructed', 'Completed ÷ Requests.'),
    row('Imaging Activity', 'Urgent Imaging Exam Share', pct(view.urgentShare), 'constructed', 'Illustrative urgent share of requests (18%).'),
    row('Imaging Activity', 'Pending Imaging Examinations', num(view.pending), 'constructed', 'Requests not yet completed, cancelled, or no-show at observation.'),

    row('Imaging Access', 'Active Diagnostic Imaging Backlog', num(view.closingBacklog), 'constructed', 'Month-end waitlist from monthly ledger. Urgent may bypass.'),
    row('Imaging Access', 'Median Request-to-Exam Wait', `${num(view.medianAccessWaitDays, 1)} days`, 'constructed', view.methodology.accessClock),
    row('Imaging Access', 'P90 Request-to-Exam Wait', `${num(view.p90AccessWaitDays, 1)} days`, 'constructed', 'Illustrative P90 access wait.'),
    row('Imaging Access', 'Imaging Cases Beyond Access Target', num(view.overdueImaging), 'constructed', `Beyond illustrative ${view.waitTargetDays}-day access target.`),

    row('Scanner Efficiency', 'Diagnostic Scanner Utilization', pct(view.scannerUtilization), 'constructed', view.methodology.utilization),
    row('Scanner Efficiency', 'Unused Staffed Scanner Hours', num(view.unusedHours), 'constructed', 'Staffed − in-session used − downtime.'),
    row('Scanner Efficiency', 'Median Examination Duration', `${num(view.medianExamMin)} min`, 'constructed', 'Volume-weighted median across modalities.'),
    row('Scanner Efficiency', 'Diagnostic Scanner Downtime', num(view.downtimeHours), 'constructed', 'Inside staffed denominator; not double-subtracted from unused.'),

    row('Reporting Quality', 'Median Final Report TAT', `${num(view.medianReportTatHours, 1)} h`, 'constructed', view.methodology.reportTat),
    row('Reporting Quality', 'P90 Final Report TAT', `${num(view.p90ReportTatHours, 1)} h`, 'constructed', 'Illustrative P90 final report turnaround.'),
    row('Reporting Quality', 'Unsigned Diagnostic Reports', num(view.unsignedReports), 'constructed', 'Open unsigned at observation — aging bands, not completed TAT.'),
    row('Reporting Quality', 'Diagnostic Exam Repeat Rate', pct(view.repeatExamRate), 'constructed', 'Repeat exams ÷ completed. Not every repeat is a quality failure.'),

    row('Capacity Optimization', 'Recoverable Scanner Hours', num(view.recoverableHours), 'constructed', view.methodology.capacity),
    row('Capacity Optimization', 'Feasible Additional Imaging Exams', num(view.additionalExams), 'constructed', 'min(hour-feasible, eligible waitlist). Modeled — not achieved.'),

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
