/** Stable Radiology KPI ownership — each primary ID has exactly one owning screen. */

export type RadiologyScreenId =
  | 'command'
  | 'access'
  | 'utilization'
  | 'quality'
  | 'optimization';

export type RadiologyKpiOwner = {
  id: string;
  fullName: string;
  display: string;
  screen: RadiologyScreenId;
  route: string;
  decision: string;
};

export const RADIOLOGY_KPI_OWNERS: RadiologyKpiOwner[] = [
  // Command — demand & outcome summary
  { id: 'kpi_rad_imaging_requests', fullName: 'Diagnostic Imaging Requests', display: 'Imaging Requests', screen: 'command', route: '/radiology', decision: 'Overall imaging demand' },
  { id: 'kpi_rad_completed_exams', fullName: 'Completed Diagnostic Exams', display: 'Completed Exams', screen: 'command', route: '/radiology', decision: 'Imaging output delivered' },
  { id: 'kpi_rad_completion_rate', fullName: 'Imaging Exam Completion Rate', display: 'Completion Rate', screen: 'command', route: '/radiology', decision: 'Share of requests completed' },
  { id: 'kpi_rad_urgent_share', fullName: 'Urgent Imaging Exam Share', display: 'Urgent Exam Share', screen: 'command', route: '/radiology', decision: 'Urgent vs routine mix' },
  { id: 'kpi_rad_pending_exams', fullName: 'Pending Imaging Examinations', display: 'Pending Exams', screen: 'command', route: '/radiology', decision: 'Open unfinished request cohort' },

  // Access
  { id: 'kpi_rad_imaging_backlog', fullName: 'Active Diagnostic Imaging Backlog', display: 'Imaging Backlog', screen: 'access', route: '/radiology/access', decision: 'Active waitlist size' },
  { id: 'kpi_rad_median_access_wait', fullName: 'Median Request-to-Exam Wait Time', display: 'Median Access Wait', screen: 'access', route: '/radiology/access', decision: 'Typical imaging access wait' },
  { id: 'kpi_rad_p90_access_wait', fullName: 'P90 Request-to-Exam Wait Time', display: 'P90 Access Wait', screen: 'access', route: '/radiology/access', decision: 'Long-tail access wait' },
  { id: 'kpi_rad_overdue_imaging', fullName: 'Imaging Cases Beyond Access Target', display: 'Overdue Imaging', screen: 'access', route: '/radiology/access', decision: 'Cases past illustrative access target' },
  { id: 'kpi_rad_waitlist_growth', fullName: 'Imaging Waitlist Growth', display: 'Waitlist Growth', screen: 'access', route: '/radiology/access', decision: 'Net backlog change' },
  { id: 'kpi_rad_within_access_target', fullName: 'Imaging Cases Within Access Target', display: 'Within Access Target', screen: 'access', route: '/radiology/access', decision: 'Share of backlog inside target' },

  // Utilization
  { id: 'kpi_rad_scanner_utilization', fullName: 'Diagnostic Scanner Utilization', display: 'Scanner Utilization', screen: 'utilization', route: '/radiology/utilization', decision: 'Staffed scanner hour use' },
  { id: 'kpi_rad_unused_scanner_hours', fullName: 'Unused Staffed Scanner Hours', display: 'Unused Hours', screen: 'utilization', route: '/radiology/utilization', decision: 'Unused staffed capacity' },
  { id: 'kpi_rad_median_exam_duration', fullName: 'Median Examination Duration', display: 'Median Exam Time', screen: 'utilization', route: '/radiology/utilization', decision: 'Typical exam duration' },
  { id: 'kpi_rad_scanner_downtime', fullName: 'Diagnostic Scanner Downtime', display: 'Scanner Downtime', screen: 'utilization', route: '/radiology/utilization', decision: 'Hours lost to downtime' },
  { id: 'kpi_rad_schedule_adherence', fullName: 'Imaging Schedule Adherence Rate', display: 'Schedule Adherence', screen: 'utilization', route: '/radiology/utilization', decision: 'On-schedule exam starts' },

  // Quality / reporting
  { id: 'kpi_rad_median_report_tat', fullName: 'Median Final Report Turnaround Time', display: 'Median Report TAT', screen: 'quality', route: '/radiology/quality', decision: 'Typical final report turnaround' },
  { id: 'kpi_rad_p90_report_tat', fullName: 'P90 Final Report Turnaround Time', display: 'P90 Report TAT', screen: 'quality', route: '/radiology/quality', decision: 'Long-tail report turnaround' },
  { id: 'kpi_rad_reports_over_target', fullName: 'Final Reports Over TAT Target', display: 'Reports Over Target', screen: 'quality', route: '/radiology/quality', decision: 'Reports past illustrative TAT target' },
  { id: 'kpi_rad_unsigned_reports', fullName: 'Unsigned Diagnostic Reports', display: 'Unsigned Reports', screen: 'quality', route: '/radiology/quality', decision: 'Open unsigned report backlog' },
  { id: 'kpi_rad_repeat_exam_rate', fullName: 'Diagnostic Exam Repeat Rate', display: 'Repeat Exam Rate', screen: 'quality', route: '/radiology/quality', decision: 'Repeat exam process signal' },
  { id: 'kpi_rad_critical_ack_rate', fullName: 'Critical Result Acknowledgement Rate', display: 'Critical Ack. Rate', screen: 'quality', route: '/radiology/quality', decision: 'Critical result acknowledgement' },

  // Optimization — three headlines; gain % lives in Details
  { id: 'kpi_rad_recoverable_hours', fullName: 'Potentially Recoverable Scanner Hours', display: 'Recoverable Hours', screen: 'optimization', route: '/radiology/optimization', decision: 'Hours recoverable from exclusive drivers' },
  { id: 'kpi_rad_additional_exams', fullName: 'Feasible Additional Imaging Exams', display: 'Additional Exams', screen: 'optimization', route: '/radiology/optimization', decision: 'Feasible extra exams under constraints' },
  { id: 'kpi_rad_eligible_waitlist', fullName: 'Eligible Imaging Waitlist Cases', display: 'Eligible Waitlist', screen: 'optimization', route: '/radiology/optimization', decision: 'Waitlist cases that could use recovered capacity' },
];

export const RADIOLOGY_SCREEN_TITLES: Record<RadiologyScreenId, string> = {
  command: 'Imaging Command Center',
  access: 'Imaging Access & Waitlist',
  utilization: 'Modality Utilization & Scheduling',
  quality: 'Reporting & Imaging Quality',
  optimization: 'Imaging Capacity Optimization',
};

export function ownersForScreen(screen: RadiologyScreenId): RadiologyKpiOwner[] {
  return RADIOLOGY_KPI_OWNERS.filter((item) => item.screen === screen);
}

export function assertUniqueRadiologyOwnership(owners = RADIOLOGY_KPI_OWNERS): string[] {
  const seen = new Map<string, string>();
  const issues: string[] = [];
  for (const owner of owners) {
    const prior = seen.get(owner.id);
    if (prior) issues.push(`${owner.id} owned by both ${prior} and ${owner.screen}`);
    else seen.set(owner.id, owner.screen);
  }
  return issues;
}

/** Headline KPIs that must not appear as primary Radiology cards. */
export const RADIOLOGY_CROSS_DOMAIN_FORBIDDEN = [
  'Bed Occupancy',
  'Available Beds',
  'No-show Rate',
  'Slot Fill Rate',
  '3rd Next Available',
  'Median Lead Time',
  'OR Utilization',
  'Completed Cases',
  'Surgical Backlog',
  'Door-to-provider',
  'Length of Stay',
];
