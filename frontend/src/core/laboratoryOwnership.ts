/** Stable Laboratory KPI ownership — each primary ID has exactly one owning screen. */

export type LaboratoryScreenId =
  | 'command'
  | 'samples'
  | 'analyzers'
  | 'quality'
  | 'optimization';

export type LaboratoryKpiOwner = {
  id: string;
  fullName: string;
  display: string;
  screen: LaboratoryScreenId;
  route: string;
  decision: string;
};

export const LABORATORY_KPI_OWNERS: LaboratoryKpiOwner[] = [
  // Command — demand & throughput
  { id: 'kpi_lab_test_orders', fullName: 'Laboratory Test Orders', display: 'Test Orders', screen: 'command', route: '/laboratory', decision: 'Overall laboratory order demand' },
  { id: 'kpi_lab_completed_tests', fullName: 'Completed Laboratory Tests', display: 'Completed Tests', screen: 'command', route: '/laboratory', decision: 'Released test throughput' },
  { id: 'kpi_lab_completion_rate', fullName: 'Laboratory Test Completion Rate', display: 'Completion Rate', screen: 'command', route: '/laboratory', decision: 'Share of ordered tests completed' },
  { id: 'kpi_lab_pending_tests', fullName: 'Pending Laboratory Tests', display: 'Pending Tests', screen: 'command', route: '/laboratory', decision: 'Open unfinished test cohort' },
  { id: 'kpi_lab_stat_share', fullName: 'Stat Priority Test Share', display: 'STAT Share', screen: 'command', route: '/laboratory', decision: 'STAT vs routine mix' },

  // Samples — pre-analytics
  { id: 'kpi_lab_samples_received', fullName: 'Samples Received by Laboratory', display: 'Samples Received', screen: 'samples', route: '/laboratory/samples', decision: 'Specimen receipt volume' },
  { id: 'kpi_lab_rejection_rate', fullName: 'Specimen Rejection Rate', display: 'Rejection Rate', screen: 'samples', route: '/laboratory/samples', decision: 'Rejected share of assessed specimens' },
  { id: 'kpi_lab_transport_time', fullName: 'Median Specimen Transport Time', display: 'Transport Time', screen: 'samples', route: '/laboratory/samples', decision: 'Collection-to-receipt delay' },
  { id: 'kpi_lab_hemolysis_rate', fullName: 'Hemolyzed Specimen Rate', display: 'Hemolysis Rate', screen: 'samples', route: '/laboratory/samples', decision: 'Hemolysis quality pressure' },
  { id: 'kpi_lab_recollection_rate', fullName: 'Specimen Recollection Rate', display: 'Recollection Rate', screen: 'samples', route: '/laboratory/samples', decision: 'Replacement specimen workload' },

  // Analyzers
  { id: 'kpi_lab_analyzer_utilization', fullName: 'Analyzer Utilization', display: 'Analyzer Utilization', screen: 'analyzers', route: '/laboratory/analyzers', decision: 'Staffed analyzer hour use' },
  { id: 'kpi_lab_analyzer_downtime', fullName: 'Analyzer Equipment Downtime', display: 'Analyzer Downtime', screen: 'analyzers', route: '/laboratory/analyzers', decision: 'Hours lost to equipment downtime' },
  { id: 'kpi_lab_unused_analyzer_hours', fullName: 'Unused Staffed Analyzer Hours', display: 'Unused Hours', screen: 'analyzers', route: '/laboratory/analyzers', decision: 'Unused staffed capacity' },
  { id: 'kpi_lab_testing_backlog', fullName: 'Laboratory Testing Backlog', display: 'Testing Backlog', screen: 'analyzers', route: '/laboratory/analyzers', decision: 'Tests awaiting analysis' },
  { id: 'kpi_lab_tests_per_hour', fullName: 'Tests per Analyzer Hour', display: 'Tests / Analyzer Hour', screen: 'analyzers', route: '/laboratory/analyzers', decision: 'Analytical throughput density' },

  // Quality / results
  { id: 'kpi_lab_median_tat', fullName: 'Median Laboratory Result TAT', display: 'Median Lab TAT', screen: 'quality', route: '/laboratory/quality', decision: 'Typical receipt-to-release turnaround' },
  { id: 'kpi_lab_p90_tat', fullName: 'P90 Laboratory Result TAT', display: 'P90 Lab TAT', screen: 'quality', route: '/laboratory/quality', decision: 'Long-tail result turnaround' },
  { id: 'kpi_lab_over_target', fullName: 'Results Exceeding TAT Target', display: 'Over-Target Results', screen: 'quality', route: '/laboratory/quality', decision: 'Released results past TAT target' },
  { id: 'kpi_lab_pending_validation', fullName: 'Results Awaiting Validation', display: 'Pending Validation', screen: 'quality', route: '/laboratory/quality', decision: 'Validation backlog' },
  { id: 'kpi_lab_critical_notify_rate', fullName: 'Critical Result Notification Rate', display: 'Critical Notify Rate', screen: 'quality', route: '/laboratory/quality', decision: 'Critical communication completion' },
  { id: 'kpi_lab_corrected_report_rate', fullName: 'Corrected Laboratory Report Rate', display: 'Corrected Report Rate', screen: 'quality', route: '/laboratory/quality', decision: 'Post-release corrections' },

  // Optimization
  { id: 'kpi_lab_recoverable_hours', fullName: 'Potentially Recoverable Lab Hours', display: 'Recoverable Hours', screen: 'optimization', route: '/laboratory/optimization', decision: 'Hours recoverable from exclusive drivers' },
  { id: 'kpi_lab_additional_tests', fullName: 'Feasible Additional Testing Capacity', display: 'Additional Tests', screen: 'optimization', route: '/laboratory/optimization', decision: 'Feasible extra tests under constraints' },
  { id: 'kpi_lab_eligible_backlog', fullName: 'Eligible Testing Backlog', display: 'Eligible Backlog', screen: 'optimization', route: '/laboratory/optimization', decision: 'Backlog that could use recovered capacity' },
];

export const LABORATORY_SCREEN_TITLES: Record<LaboratoryScreenId, string> = {
  command: 'Laboratory Command Center',
  samples: 'Sample Flow & Pre-Analytics',
  analyzers: 'Testing & Analyzer Performance',
  quality: 'Results, TAT & Quality',
  optimization: 'Laboratory Capacity Optimization',
};

export function ownersForLabScreen(screen: LaboratoryScreenId): LaboratoryKpiOwner[] {
  return LABORATORY_KPI_OWNERS.filter((item) => item.screen === screen);
}

export function assertUniqueLaboratoryOwnership(owners = LABORATORY_KPI_OWNERS): string[] {
  const seen = new Map<string, string>();
  const issues: string[] = [];
  for (const owner of owners) {
    const prior = seen.get(owner.id);
    if (prior) issues.push(`${owner.id} owned by both ${prior} and ${owner.screen}`);
    else seen.set(owner.id, owner.screen);
  }
  return issues;
}

export const LABORATORY_CROSS_DOMAIN_FORBIDDEN = [
  'ED Visit Volume',
  'Bed Occupancy',
  'Median Length of Stay',
  'OR Utilization',
  'Slot Fill Rate',
  'Scanner Utilization',
  'Imaging Backlog',
  'Median Access Wait',
  'Appointment No-Show Rate',
];
