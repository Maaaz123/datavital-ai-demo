/** Stable Patient Experience KPI ownership — each primary ID has exactly one owning screen. */

export type PxScreenId =
  | 'command'
  | 'journey'
  | 'complaints'
  | 'voice'
  | 'departments'
  | 'optimization';

export type PxKpiOwner = {
  id: string;
  fullName: string;
  display: string;
  screen: PxScreenId;
  route: string;
  decision: string;
};

export const PX_KPI_OWNERS: PxKpiOwner[] = [
  // Command — overall experience position
  { id: 'kpi_px_overall_satisfaction', fullName: 'Overall Patient Satisfaction', display: 'Overall Satisfaction', screen: 'command', route: '/patient-experience', decision: 'Weighted mean of eligible overall-rating answers (0–10 instrument scale)' },
  { id: 'kpi_px_response_rate', fullName: 'Survey Response Rate', display: 'Response Rate', screen: 'command', route: '/patient-experience', decision: 'Eligible completed responses ÷ eligible invitations' },
  { id: 'kpi_px_positive_share', fullName: 'Positive Experience Share', display: 'Positive Share', screen: 'command', route: '/patient-experience', decision: 'Top-box (9–10) overall ratings ÷ eligible overall ratings' },
  { id: 'kpi_px_negative_share', fullName: 'Negative Experience Share', display: 'Negative Share', screen: 'command', route: '/patient-experience', decision: 'Bottom-box (0–6) overall ratings ÷ eligible overall ratings' },
  { id: 'kpi_px_recommendation', fullName: 'Patient Recommendation Score', display: 'Recommendation', screen: 'command', route: '/patient-experience', decision: '% promoters (9–10) − % detractors (0–6) on the recommendation question (0–10)' },
  { id: 'kpi_px_unresolved_issues', fullName: 'Unresolved Experience Issues', display: 'Unresolved Issues', screen: 'command', route: '/patient-experience', decision: 'Open complaints + high-priority unreviewed comments at observation' },

  // Journey — touchpoint experience
  { id: 'kpi_px_journey_satisfaction', fullName: 'Journey Satisfaction', display: 'Journey Satisfaction', screen: 'journey', route: '/patient-experience/journey', decision: 'Weighted mean of touchpoint dimension scores for linked journey responses' },
  { id: 'kpi_px_waiting_score', fullName: 'Waiting Experience Score', display: 'Waiting Score', screen: 'journey', route: '/patient-experience/journey', decision: 'Mean waiting-dimension score (0–10) for eligible responses' },
  { id: 'kpi_px_communication_score', fullName: 'Communication Experience', display: 'Communication', screen: 'journey', route: '/patient-experience/journey', decision: 'Mean staff-communication dimension score (0–10)' },
  { id: 'kpi_px_coordination_score', fullName: 'Care Coordination Experience', display: 'Coordination', screen: 'journey', route: '/patient-experience/journey', decision: 'Mean care-coordination dimension score (0–10)' },
  { id: 'kpi_px_discharge_score', fullName: 'Discharge Experience', display: 'Discharge Exp.', screen: 'journey', route: '/patient-experience/journey', decision: 'Mean discharge-dimension score for eligible discharges surveyed' },
  { id: 'kpi_px_negative_touchpoint_share', fullName: 'Negative Touchpoint Share', display: 'Neg. Touchpoints', screen: 'journey', route: '/patient-experience/journey', decision: 'Touchpoint ratings ≤6 ÷ linked touchpoint ratings' },

  // Complaints — service recovery ledger
  { id: 'kpi_px_complaints_total', fullName: 'Total Complaints', display: 'Total Complaints', screen: 'complaints', route: '/patient-experience/complaints', decision: 'Complaints received in the reporting period' },
  { id: 'kpi_px_complaints_open', fullName: 'Open Complaints', display: 'Open Complaints', screen: 'complaints', route: '/patient-experience/complaints', decision: 'Open complaints at observation (received − closed − withdrawn + reopen net)' },
  { id: 'kpi_px_median_resolution', fullName: 'Median Resolution Time', display: 'Median Resolution', screen: 'complaints', route: '/patient-experience/complaints', decision: 'Median days from received to resolved for closed resolutions in period' },
  { id: 'kpi_px_overdue_complaints', fullName: 'Overdue Complaints', display: 'Overdue', screen: 'complaints', route: '/patient-experience/complaints', decision: 'Open complaints past the illustrative acknowledgment/resolution target' },
  { id: 'kpi_px_first_contact_resolution', fullName: 'First-Contact Resolution', display: 'First-Contact Res.', screen: 'complaints', route: '/patient-experience/complaints', decision: 'Closed without reopen ÷ closed complaints' },
  { id: 'kpi_px_reopen_rate', fullName: 'Reopened Complaint Rate', display: 'Reopen Rate', screen: 'complaints', route: '/patient-experience/complaints', decision: 'Reopened cases ÷ previously closed cases in period' },

  // Voice — sentiment / themes (synthetic, auditable)
  { id: 'kpi_px_comments_analyzed', fullName: 'Comments Analyzed', display: 'Comments Analyzed', screen: 'voice', route: '/patient-experience/voice', decision: 'Free-text comments with deterministic theme/sentiment labels' },
  { id: 'kpi_px_negative_feedback_share', fullName: 'Negative Feedback Share', display: 'Negative Feedback', screen: 'voice', route: '/patient-experience/voice', decision: 'Negative-sentiment comments ÷ analyzed comments' },
  { id: 'kpi_px_emerging_themes', fullName: 'Emerging Issue Themes', display: 'Emerging Themes', screen: 'voice', route: '/patient-experience/voice', decision: 'Themes with rising frequency vs prior period and negative polarity' },
  { id: 'kpi_px_high_priority_feedback', fullName: 'High-Priority Feedback', display: 'High-Priority', screen: 'voice', route: '/patient-experience/voice', decision: 'Comments flagged for human review (severity or safety cue)' },
  { id: 'kpi_px_theme_review_coverage', fullName: 'Theme Review Coverage', display: 'Theme Review', screen: 'voice', route: '/patient-experience/voice', decision: 'Human-reviewed classifications ÷ analyzed comments' },

  // Departments — comparable service experience
  { id: 'kpi_px_depts_meeting_target', fullName: 'Departments Meeting Experience Target', display: 'Meeting Target', screen: 'departments', route: '/patient-experience/departments', decision: 'Departments with overall score ≥ target and sufficient sample' },
  { id: 'kpi_px_lowest_dimension', fullName: 'Lowest Experience Dimension', display: 'Lowest Dimension', screen: 'departments', route: '/patient-experience/departments', decision: 'Hospital-wide lowest dimension mean among scored dimensions' },
  { id: 'kpi_px_coverage_gap', fullName: 'Survey Coverage Gap', display: 'Coverage Gap', screen: 'departments', route: '/patient-experience/departments', decision: 'Departments below minimum eligible response coverage' },
  { id: 'kpi_px_material_variance', fullName: 'Material Experience Variance', display: 'Material Variance', screen: 'departments', route: '/patient-experience/departments', decision: 'Max−min overall score among departments with adequate sample' },
  { id: 'kpi_px_depts_requiring_review', fullName: 'Departments Requiring Review', display: 'Need Review', screen: 'departments', route: '/patient-experience/departments', decision: 'Departments below target or with rising negative share and adequate sample' },

  // Optimization — illustrative improvement potential
  { id: 'kpi_px_addressable_gap', fullName: 'Addressable Experience Gap', display: 'Addressable Gap', screen: 'optimization', route: '/patient-experience/optimization', decision: 'Points between current overall score and illustrative target for eligible cohorts' },
  { id: 'kpi_px_improvement_opportunities', fullName: 'Eligible Improvement Opportunities', display: 'Opportunities', screen: 'optimization', route: '/patient-experience/optimization', decision: 'Prioritized actions with evidence, owner, and follow-up measure' },
  { id: 'kpi_px_modeled_uplift', fullName: 'Modeled Satisfaction Uplift', display: 'Modeled Uplift', screen: 'optimization', route: '/patient-experience/optimization', decision: 'Illustrative overall-score points under documented assumptions' },
  { id: 'kpi_px_complaint_reduction', fullName: 'Potential Complaint Reduction', display: 'Complaint Potential', screen: 'optimization', route: '/patient-experience/optimization', decision: 'Eligible complaints that could be prevented under assumptions' },
  { id: 'kpi_px_priority_coverage', fullName: 'Priority Action Coverage', display: 'Action Coverage', screen: 'optimization', route: '/patient-experience/optimization', decision: 'Priority actions with assigned owner ÷ priority opportunities' },
];

export const PX_SCREEN_TITLES: Record<PxScreenId, string> = {
  command: 'Patient Experience Command Center',
  journey: 'Patient Journey & Touchpoints',
  complaints: 'Complaints & Service Recovery',
  voice: 'Voice of Patient & Sentiment AI',
  departments: 'Department & Service Experience',
  optimization: 'Experience Improvement & What-If',
};

export const PX_CHART_OWNERS: Array<{ id: string; title: string; screen: PxScreenId; question: string }> = [
  { id: 'px_trend', title: 'Patient Experience Trend', screen: 'command', question: 'How is overall satisfaction moving over the year?' },
  { id: 'px_setting', title: 'Satisfaction by Care Setting', screen: 'command', question: 'Which care settings report stronger or weaker experience?' },
  { id: 'px_dimension', title: 'Experience Dimension Performance', screen: 'command', question: 'Which experience dimensions need attention?' },
  { id: 'px_survey_trend', title: 'Survey Responses Trend', screen: 'command', question: 'Are eligible survey completions keeping pace with invitations?' },
  { id: 'px_distribution', title: 'Patient Experience Distribution', screen: 'command', question: 'How are overall ratings distributed on the 0–10 scale?' },
  { id: 'px_priority_signals', title: 'Priority Experience Signals', screen: 'command', question: 'Which experience alerts require leadership focus?' },
  { id: 'px_journey_map', title: 'Patient Journey Experience Map', screen: 'journey', question: 'At which journey stages is experience weaker?' },
  { id: 'px_touchpoint', title: 'Satisfaction by Touchpoint', screen: 'journey', question: 'Which touchpoints have the lowest scores?' },
  { id: 'px_service_setting', title: 'Experience by Service Setting', screen: 'journey', question: 'How does journey experience differ by setting?' },
  { id: 'px_wait_vs_exp', title: 'Waiting vs Reported Experience', screen: 'journey', question: 'How do waiting scores relate to overall ratings (correlation, not causation)?' },
  { id: 'px_comm_chart', title: 'Communication Experience', screen: 'journey', question: 'Where is communication experience weakest?' },
  { id: 'px_discharge_fb', title: 'Discharge Journey Feedback', screen: 'journey', question: 'How is discharge experience performing?' },
  { id: 'px_complaint_trend', title: 'Complaints Trend', screen: 'complaints', question: 'Are complaint volumes rising or falling?' },
  { id: 'px_complaint_cat', title: 'Complaints by Category', screen: 'complaints', question: 'Which categories dominate the complaint ledger?' },
  { id: 'px_complaint_aging', title: 'Complaint Aging', screen: 'complaints', question: 'How old is the open complaint backlog?' },
  { id: 'px_resolution_dist', title: 'Resolution Time Distribution', screen: 'complaints', question: 'How long do resolutions take?' },
  { id: 'px_status_break', title: 'Complaint Status Breakdown', screen: 'complaints', question: 'What is the current status mix?' },
  { id: 'px_escalation', title: 'Escalation and Reopening Patterns', screen: 'complaints', question: 'Are cases escalating or reopening?' },
  { id: 'px_sentiment_trend', title: 'Sentiment Trend', screen: 'voice', question: 'How is comment sentiment changing?' },
  { id: 'px_themes', title: 'Feedback Themes', screen: 'voice', question: 'Which themes appear most often?' },
  { id: 'px_positive_topics', title: 'Top Positive Topics', screen: 'voice', question: 'What do patients praise?' },
  { id: 'px_negative_topics', title: 'Top Negative Topics', screen: 'voice', question: 'What recurring problems appear in comments?' },
  { id: 'px_theme_dept', title: 'Theme Frequency by Department', screen: 'voice', question: 'Where do negative themes concentrate?' },
  { id: 'px_emerging', title: 'Emerging Experience Issues', screen: 'voice', question: 'Which themes are rising vs prior period?' },
  { id: 'px_dept_exp', title: 'Experience by Department', screen: 'departments', question: 'Which departments report better or worse experience (with sample size)?' },
  { id: 'px_service_line', title: 'Experience by Service Line', screen: 'departments', question: 'How do service lines compare under the same instrument?' },
  { id: 'px_sat_dist', title: 'Satisfaction Distribution', screen: 'departments', question: 'How are department scores distributed?' },
  { id: 'px_resp_coverage', title: 'Response Coverage by Department', screen: 'departments', question: 'Where is survey coverage thin?' },
  { id: 'px_setting_trend', title: 'Experience Trends by Care Setting', screen: 'departments', question: 'How are setting scores trending?' },
  { id: 'px_opportunity', title: 'Opportunity Matrix', screen: 'departments', question: 'Where do low scores and adequate samples coincide?' },
  { id: 'px_improve_ops', title: 'Improvement Opportunities', screen: 'optimization', question: 'Which actions are eligible and prioritized?' },
  { id: 'px_scenario_exp', title: 'Current vs Scenario Experience', screen: 'optimization', question: 'What illustrative uplift do scenarios show?' },
  { id: 'px_complaint_pot', title: 'Complaint Reduction Potential', screen: 'optimization', question: 'Which complaint categories are addressable?' },
  { id: 'px_touch_improve', title: 'Experience Improvement by Touchpoint', screen: 'optimization', question: 'Which touchpoints offer the largest modeled gain?' },
  { id: 'px_constraints', title: 'Implementation Constraints', screen: 'optimization', question: 'What limits feasible improvement?' },
];

export function ownersForPxScreen(screen: PxScreenId): PxKpiOwner[] {
  return PX_KPI_OWNERS.filter((item) => item.screen === screen);
}

export function assertUniquePxOwnership(owners = PX_KPI_OWNERS): string[] {
  const seen = new Map<string, string>();
  const issues: string[] = [];
  for (const owner of owners) {
    const prior = seen.get(owner.id);
    if (prior) issues.push(`${owner.id} owned by both ${prior} and ${owner.screen}`);
    else seen.set(owner.id, owner.screen);
  }
  return issues;
}

export function assertUniquePxCharts(charts = PX_CHART_OWNERS): string[] {
  const seen = new Map<string, string>();
  const issues: string[] = [];
  for (const chart of charts) {
    const prior = seen.get(chart.title);
    if (prior) issues.push(`chart "${chart.title}" owned by both ${prior} and ${chart.screen}`);
    else seen.set(chart.title, chart.screen);
  }
  return issues;
}

/** Headline KPIs owned by Domains 1–10 that must not appear as PX primary ribbons. */
export const PX_CROSS_DOMAIN_FORBIDDEN = [
  'ED Visit Volume',
  'Bed Occupancy',
  'Median Length of Stay',
  'OR Utilization',
  'Slot Fill Rate',
  'Scanner Utilization',
  'Imaging Backlog',
  'Analyzer Utilization',
  'Testing Backlog',
  'Median Lab TAT',
  'Medication Orders',
  'Stockout SKUs',
  'Median Access Wait',
  'Appointment No-Show Rate',
  'ICU Admissions',
  'Staffed ICU Beds',
  'Median ICU Admission Wait',
];
