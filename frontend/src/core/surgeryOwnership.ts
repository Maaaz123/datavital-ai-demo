/** Stable Surgery KPI ownership — each primary ID has exactly one owning screen. */

export type SurgeryScreenId =
  | 'command'
  | 'or'
  | 'access'
  | 'quality'
  | 'optimization';

export type SurgeryKpiOwner = {
  id: string;
  fullName: string;
  display: string;
  screen: SurgeryScreenId;
  route: string;
  decision: string;
};

export const SURGERY_KPI_OWNERS: SurgeryKpiOwner[] = [
  // Command
  { id: 'kpi_surg_completed_cases', fullName: 'Completed Surgeries', display: 'Completed Cases', screen: 'command', route: '/surgery', decision: 'Surgical output delivered' },
  { id: 'kpi_surg_scheduled_cases', fullName: 'Scheduled Surgical Procedures', display: 'Scheduled Cases', screen: 'command', route: '/surgery', decision: 'Scheduled workload volume' },
  { id: 'kpi_surg_same_day_cancel_rate', fullName: 'Same-Day Surgery Cancellation Rate', display: 'Same-Day Cancel Rate', screen: 'command', route: '/surgery', decision: 'Day-of schedule reliability' },
  { id: 'kpi_surg_emergency_share', fullName: 'Emergency Surgery Share', display: 'Emergency Share', screen: 'command', route: '/surgery', decision: 'Elective vs emergency mix' },
  { id: 'kpi_surg_throughput', fullName: 'Surgical Throughput', display: 'Throughput', screen: 'command', route: '/surgery', decision: 'Cases per staffed theatre-day' },

  // OR
  { id: 'kpi_surg_or_utilization', fullName: 'Operating Room Utilization', display: 'OR Utilization', screen: 'or', route: '/surgery/or', decision: 'Staffed OR hour use' },
  { id: 'kpi_surg_first_case_ontime', fullName: 'First-Case On-Time Start Rate', display: 'First-Case On-Time', screen: 'or', route: '/surgery/or', decision: 'Schedule start reliability' },
  { id: 'kpi_surg_median_turnover_minutes', fullName: 'Median Operating Room Turnover Time', display: 'Median Turnover', screen: 'or', route: '/surgery/or', decision: 'Between-case efficiency' },
  { id: 'kpi_surg_or_overtime_hours', fullName: 'Operating Room Overtime Hours', display: 'OR Overtime', screen: 'or', route: '/surgery/or', decision: 'Overrun beyond staffed day' },
  { id: 'kpi_surg_unused_or_hours', fullName: 'Unused Allocated Operating Room Hours', display: 'Unused OR Hours', screen: 'or', route: '/surgery/or', decision: 'Unused staffed capacity' },
  { id: 'kpi_surg_late_start_hours', fullName: 'Late Start Hours', display: 'Late Start Hours', screen: 'or', route: '/surgery/or', decision: 'Hours lost to late starts' },

  // Access
  { id: 'kpi_surg_backlog', fullName: 'Surgical Waiting List Backlog', display: 'Surgical Backlog', screen: 'access', route: '/surgery/access', decision: 'Active elective waitlist size' },
  { id: 'kpi_surg_median_wait_days', fullName: 'Median Surgical Waiting Time', display: 'Median Wait', screen: 'access', route: '/surgery/access', decision: 'Typical elective wait' },
  { id: 'kpi_surg_p90_wait_days', fullName: 'P90 Surgical Waiting Time', display: 'P90 Wait', screen: 'access', route: '/surgery/access', decision: 'Long-tail elective wait' },
  { id: 'kpi_surg_overdue_cases', fullName: 'Surgical Cases Beyond Wait Target', display: 'Overdue Cases', screen: 'access', route: '/surgery/access', decision: 'Cases past illustrative target' },
  { id: 'kpi_surg_waitlist_growth', fullName: 'Waitlist Growth', display: 'Waitlist Growth', screen: 'access', route: '/surgery/access', decision: 'Net backlog change in period' },
  { id: 'kpi_surg_within_target', fullName: 'Cases Within Wait Target', display: 'Within Target', screen: 'access', route: '/surgery/access', decision: 'Share of backlog inside target' },

  // Quality
  { id: 'kpi_surg_unplanned_return_or_rate', fullName: 'Unplanned Return to Operating Room Rate', display: 'Unplanned OR Returns', screen: 'quality', route: '/surgery/quality', decision: 'Unplanned return signal' },
  { id: 'kpi_surg_postop_complication_rate', fullName: 'Surgical Complication Rate', display: 'Complication Rate', screen: 'quality', route: '/surgery/quality', decision: 'Illustrative complication flag rate' },
  { id: 'kpi_surg_checklist_compliance', fullName: 'Surgical Safety Checklist Completion Rate', display: 'Checklist Completion', screen: 'quality', route: '/surgery/quality', decision: 'Process compliance' },
  { id: 'kpi_surg_infection_rate', fullName: 'Postoperative Infection Rate', display: 'Infection Rate', screen: 'quality', route: '/surgery/quality', decision: 'Illustrative infection flag rate' },
  { id: 'kpi_surg_doc_completion', fullName: 'Surgical Documentation Completion', display: 'Doc Completion', screen: 'quality', route: '/surgery/quality', decision: 'Operative documentation completeness' },
  { id: 'kpi_surg_escalation_rate', fullName: 'Postoperative Escalation Rate', display: 'Escalation Rate', screen: 'quality', route: '/surgery/quality', decision: 'Illustrative escalation signal' },

  // Optimization
  { id: 'kpi_surg_recoverable_or_hours', fullName: 'Recoverable Operating Room Hours', display: 'Recoverable OR Hours', screen: 'optimization', route: '/surgery/optimization', decision: 'Hours recoverable from known drivers' },
  { id: 'kpi_surg_additional_cases', fullName: 'Potential Additional Surgical Cases', display: 'Additional Cases', screen: 'optimization', route: '/surgery/optimization', decision: 'Feasible extra cases under constraints' },
  { id: 'kpi_surg_capacity_gain', fullName: 'Estimated Surgical Capacity Improvement', display: 'Capacity Gain', screen: 'optimization', route: '/surgery/optimization', decision: 'Illustrative capacity uplift' },
  { id: 'kpi_surg_avoidable_delay_hours', fullName: 'Avoidable Delay Hours', display: 'Avoidable Delay Hours', screen: 'optimization', route: '/surgery/optimization', decision: 'Delay hours targeted for reduction' },
  { id: 'kpi_surg_eligible_backlog', fullName: 'Eligible Backlog Cases', display: 'Eligible Backlog', screen: 'optimization', route: '/surgery/optimization', decision: 'Backlog cases that could use recovered capacity' },
  { id: 'kpi_surg_scenario_improvement', fullName: 'Scenario Capacity Improvement', display: 'Scenario Improvement', screen: 'optimization', route: '/surgery/optimization', decision: 'Combined illustrative scenario uplift' },
];

export const SURGERY_SCREEN_TITLES: Record<SurgeryScreenId, string> = {
  command: 'Surgical Command Center',
  or: 'OR Utilization & Scheduling',
  access: 'Surgical Access & Backlog',
  quality: 'Surgical Quality & Safety',
  optimization: 'Surgical Capacity Optimization',
};

export function ownersForScreen(screen: SurgeryScreenId): SurgeryKpiOwner[] {
  return SURGERY_KPI_OWNERS.filter((item) => item.screen === screen);
}

export function assertUniqueSurgeryOwnership(owners = SURGERY_KPI_OWNERS): string[] {
  const seen = new Map<string, string>();
  const issues: string[] = [];
  for (const owner of owners) {
    const prior = seen.get(owner.id);
    if (prior) issues.push(`${owner.id} owned by both ${prior} and ${owner.screen}`);
    else seen.set(owner.id, owner.screen);
  }
  return issues;
}

/** Headline KPIs that must not appear as primary Surgery cards (owned by other domains). */
export const CROSS_DOMAIN_FORBIDDEN_DISPLAY = [
  'Bed Occupancy',
  'Available Beds',
  'No-show Rate',
  'Slot Fill Rate',
  '3rd Next Available',
  'Median Lead Time',
  'Length of Stay',
  'Door-to-provider',
];
