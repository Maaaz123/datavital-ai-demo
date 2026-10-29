import type { SurgeryView } from './surgeryView';

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

export function surgeryIndicatorsFor(view: SurgeryView): Indicator[] {
  return [
    row('Surgical Activity', 'Completed Surgeries', num(view.completed), 'scenario', 'Completed cases in the period. Completed + Cancelled = Scheduled.'),
    row('Surgical Activity', 'Scheduled Surgical Procedures', num(view.scheduled), 'scenario', 'Requested/scheduled cases. Scenario identity: Completed + Cancelled = Scheduled.'),
    row('Surgical Activity', 'Same-Day Surgery Cancellation Rate', pct(view.sameDayCancelRate), 'constructed', 'Same-day cancellations ÷ Scheduled. Same-day share of all cancellations is illustrative.'),
    row('Surgical Activity', 'Emergency Surgery Share', pct(view.emergencyShare), 'constructed', 'Emergency scheduled share of Scheduled. Elective + Emergency = Scheduled.'),
    row('Surgical Activity', 'Surgical Throughput', num(view.throughput, 2), 'constructed', 'Completed ÷ (theatres × period days).'),

    row('OR Efficiency', 'Operating Room Utilization', pct(view.orUtilization), 'constructed', ' (Procedure + Turnover hours) ÷ Staffed OR hours.'),
    row('OR Efficiency', 'First-Case On-Time Start Rate', pct(view.firstCaseOnTimeRate), 'constructed', 'Illustrative first-case punctuality.'),
    row('OR Efficiency', 'Median Operating Room Turnover Time', `${num(view.medianTurnoverMin)} min`, 'constructed', 'Illustrative median between-case turnover.'),
    row('OR Efficiency', 'Operating Room Overtime Hours', num(view.overtimeHours), 'constructed', 'max(0, Used − Staffed).'),
    row('OR Efficiency', 'Unused Allocated Operating Room Hours', num(view.unusedHours), 'constructed', 'max(0, Staffed − Used).'),

    row('Surgical Access', 'Surgical Waiting List Backlog', num(view.closingBacklog), 'constructed', 'Closing elective backlog. Emergency cases do not enter this list.'),
    row('Surgical Access', 'Median Surgical Waiting Time', `${num(view.medianWaitDays, 1)} days`, 'constructed', 'Decision-to-treat → procedure for elective cases.'),
    row('Surgical Access', 'P90 Surgical Waiting Time', `${num(view.p90WaitDays, 1)} days`, 'constructed', 'Illustrative P90 of elective wait.'),
    row('Surgical Access', 'Surgical Cases Beyond Wait Target', num(view.overdueCases), 'constructed', `Cases beyond the illustrative ${view.waitTargetDays}-day target.`),

    row('Surgical Quality', 'Unplanned Return to OR Rate', pct(view.unplannedReturnRate), 'constructed', 'Illustrative unplanned returns ÷ completed. Not validated clinical evidence.'),
    row('Surgical Quality', 'Surgical Complication Rate', pct(view.complicationRate), 'constructed', 'Illustrative complication flags ÷ completed.'),
    row('Surgical Quality', 'Safety Checklist Completion', pct(view.checklistRate), 'constructed', 'Checklist complete ÷ completed.'),
    row('Surgical Quality', 'Postoperative Infection Rate', pct(view.infectionRate), 'constructed', 'Illustrative infection flags ÷ completed.'),

    row('Capacity Optimization', 'Recoverable Operating Room Hours', num(view.recoverableOrHours), 'constructed', 'Sum of mutually exclusive delay-driver hours — no double count.'),
    row('Capacity Optimization', 'Potential Additional Surgical Cases', num(view.additionalCases), 'constructed', 'Feasible extras capped by recoverable hours, bed constraint, and eligible backlog.'),

    blank('Cross-domain context', 'Bed Occupancy', 'Owned by Beds & Capacity. Surgery references bed holds as a constraint only.'),
    blank('Cross-domain context', 'Appointment Slot Fill Rate', 'Owned by Appointments. Surgery owns OR scheduling, not clinic appointment slots.'),
    blank('Cross-domain context', 'Clinic Arrival-to-Provider Time', 'Owned by Outpatient. Not surgical wait.'),
  ];
}

export const SURGERY_AI_CASES = [
  { id: 'surg-first-case', name: 'First-case start coaching', level: 'Illustrative', limit: 'Does not reschedule theatres alone' },
  { id: 'surg-turnover', name: 'Turnover reduction sketch', level: 'Illustrative', limit: 'Not all minutes become new cases' },
  { id: 'surg-cancel', name: 'Same-day cancel prevention', level: 'Illustrative', limit: 'Clinical cancellations stay clinical' },
  { id: 'surg-redistribute', name: 'OR block redistribution', level: 'Illustrative', limit: 'Conserves total staffed hours' },
  { id: 'surg-elective', name: 'Elective capacity add', level: 'Illustrative', limit: 'Room, staffing, and bed constrained' },
  { id: 'surg-bed-hold', name: 'Bed-related delay reduction', level: 'Illustrative', limit: 'References Beds context; does not move beds' },
];
