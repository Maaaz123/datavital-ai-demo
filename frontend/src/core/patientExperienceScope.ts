import type { PxView } from './patientExperienceView';
import { PX_CROSS_DOMAIN_FORBIDDEN } from './patientExperienceOwnership';

export type Indicator = {
  domain: string;
  name: string;
  summary: string;
  status: 'constructed' | 'scenario' | 'unavailable';
  unit?: string;
  formula?: string;
  cohort?: string;
  aggregation?: string;
  scope?: string;
  classification?: string;
  limitations?: string;
  method?: string;
};

function row(
  domain: string,
  name: string,
  detail: Omit<Indicator, 'domain' | 'name' | 'summary' | 'status'> & { summary?: string },
): Indicator {
  return {
    domain,
    name,
    summary: detail.summary ?? detail.method ?? detail.formula ?? '',
    status: detail.classification === 'scenario' ? 'scenario' : 'constructed',
    ...detail,
  };
}

function blank(domain: string, name: string, summary: string): Indicator {
  return { domain, name, summary, status: 'unavailable' };
}

export function pxIndicatorsFor(view: PxView): Indicator[] {
  const m = view.methodology;
  return [
    row('Survey', 'Overall Patient Satisfaction', {
      unit: 'score', formula: 'Σ overall ratings ÷ eligible overall answers', cohort: 'Eligible overall ratings',
      aggregation: 'Weighted mean (numerator/denominator)', scope: view.periodLabel, classification: 'constructed',
      limitations: m.instrument, method: m.scoring,
    }),
    row('Survey', 'Survey Response Rate', {
      unit: 'rate', formula: 'eligibleCompleted ÷ eligibleInvitations', cohort: 'Invited encounters',
      aggregation: 'Ratio', scope: view.periodLabel, classification: 'constructed',
      limitations: m.grains, method: m.responseRate,
    }),
    row('Survey', 'Positive Experience Share', {
      unit: 'rate', formula: 'Top-box (9–10) ÷ eligible overall ratings', cohort: 'Eligible overall ratings',
      aggregation: 'Ratio', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Internal instrument scale — not official HCAHPS top-box reporting.', method: 'Top-box share.',
    }),
    row('Survey', 'Negative Survey Rating Share', {
      unit: 'rate', formula: 'Bottom-box (0–6) ÷ eligible overall survey ratings', cohort: 'Eligible overall survey ratings',
      aggregation: 'Ratio', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Survey rating distribution — distinct from Negative Comment Sentiment Share on Voice.', method: 'Negative Survey Rating Share (bottom-box).',
    }),
    row('Survey', 'Patient Recommendation Score', {
      unit: 'points', formula: '(% promoters 9–10 − % detractors 0–6) × 100 on Q_RECOMMEND', cohort: 'Recommendation answers',
      aggregation: 'Promoter−detractor points index', scope: view.periodLabel, classification: 'constructed',
      limitations: m.recommendation, method: m.recommendation,
    }),
    row('Survey', 'Survey Response Denominators', {
      unit: 'count', formula: 'Invitations / raw completions / duplicates / eligible completed', cohort: 'Invitation-based survey protocol',
      aggregation: 'Count by grain', scope: view.periodLabel, classification: 'constructed',
      limitations: m.grains,
      method: `Invitations ${view.eligibleInvitations} · raw ${view.completionsRaw} · duplicates ${view.duplicateCompletions} · eligible ${view.eligibleCompleted} · instrument ${view.instrument.id} v${view.instrument.version}.`,
    }),
    row('Survey', 'Unresolved Experience Issues', {
      unit: 'issues', formula: 'Open complaints + high-priority unreviewed comments', cohort: 'Complaints + voice flags',
      aggregation: 'Sum at observation', scope: view.observationDate, classification: 'constructed',
      limitations: 'Process backlog — not incidence of harm.', method: 'Open recovery + pending review flags.',
    }),

    row('Journey', 'Journey Satisfaction', {
      unit: 'score', formula: 'Mean of linked touchpoint dimension scores', cohort: 'Linked journey responses',
      aggregation: 'Mean of eligible dimensions', scope: view.periodLabel, classification: 'constructed',
      limitations: m.journey, method: m.journey,
    }),
    row('Journey', 'Waiting Experience Score', {
      unit: 'score', formula: 'Mean waiting-dimension score (0–10)', cohort: 'Eligible waiting answers',
      aggregation: 'Mean', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Correlation with operational wait is supporting context only — not causation.', method: 'Waiting dimension mean.',
    }),
    row('Journey', 'Communication Experience', {
      unit: 'score', formula: 'Mean staff-communication dimension score (0–10)', cohort: 'Eligible communication answers',
      aggregation: 'Mean', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Not a clinician performance ranking.', method: 'Communication dimension mean.',
    }),
    row('Journey', 'Care Coordination Experience', {
      unit: 'score', formula: 'Mean care-coordination dimension score (0–10)', cohort: 'Eligible coordination answers',
      aggregation: 'Mean', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Survey dimension — not a claim about clinical pathway adherence.', method: 'Coordination dimension mean.',
    }),
    row('Journey', 'Discharge Experience', {
      unit: 'score', formula: 'Mean discharge-dimension score', cohort: 'Eligible discharge answers',
      aggregation: 'Mean', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Only respondents with a discharge item answered.', method: 'Discharge dimension mean.',
    }),
    row('Journey', 'Negative Touchpoint Share', {
      unit: 'rate', formula: 'Touchpoint ratings ≤6 ÷ linked touchpoint ratings', cohort: 'Linked touchpoint ratings',
      aggregation: 'Ratio', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Unlinked responses stay in aggregates without fabricated joins.', method: 'Negative linked touchpoint share.',
    }),

    row('Complaints', 'Total Complaints', {
      unit: 'complaints', formula: 'Complaints received in the reporting period', cohort: 'Complaint ledger',
      aggregation: 'Count', scope: view.periodLabel, classification: 'constructed',
      limitations: m.complaints, method: m.complaints,
    }),
    row('Complaints', 'Open Complaints', {
      unit: 'complaints', formula: 'Closing open stock at observation', cohort: 'Complaint ledger',
      aggregation: 'Point-in-time', scope: view.observationDate, classification: 'constructed',
      limitations: 'opening + new + reopened − closed − withdrawn = closing open.', method: 'Closing open stock.',
    }),
    row('Complaints', 'Median Resolution Time', {
      unit: 'days', formula: 'Median days from received to resolved', cohort: 'Closed resolutions in period',
      aggregation: 'Median', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Closed status is not proof of patient satisfaction.', method: 'Median resolution days.',
    }),
    row('Complaints', 'Overdue Complaints', {
      unit: 'complaints', formula: 'Open complaints past illustrative acknowledgment/resolution target', cohort: 'Open complaints',
      aggregation: 'Count', scope: view.periodLabel, classification: 'constructed',
      limitations: `Illustrative target ${view.resolutionTargetDays} days / ${view.ackTargetHours}h ack.`, method: 'Overdue open stock.',
    }),
    row('Complaints', 'First-Contact Resolution', {
      unit: 'rate', formula: 'Closed without reopen ÷ closed complaints', cohort: 'Closed complaints',
      aggregation: 'Ratio', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Operational recovery clock — not a satisfaction outcome.', method: 'First-contact closed share.',
    }),
    row('Complaints', 'Reopened Complaint Rate', {
      unit: 'rate', formula: 'Reopened cases ÷ previously closed cases', cohort: 'Complaint ledger',
      aggregation: 'Ratio', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Reopen events can exceed unique cases when counted as ledger events.', method: 'Reopen rate.',
    }),

    row('Voice', 'Comments Analyzed', {
      unit: 'comments', formula: 'Free-text comments with deterministic theme/sentiment labels', cohort: 'Survey comments',
      aggregation: 'Count', scope: view.periodLabel, classification: 'constructed',
      limitations: m.voice, method: m.voice,
    }),
    row('Voice', 'Negative Comment Sentiment Share', {
      unit: 'rate', formula: 'Negative-sentiment comments ÷ analyzed comments', cohort: 'Analyzed free-text comments',
      aggregation: 'Ratio', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Comment cohort — distinct from Negative Survey Rating Share. Synthetic EN/AR [SYNTHETIC] templates.', method: 'Negative Comment Sentiment Share.',
    }),
    row('Voice', 'Emerging Issue Themes', {
      unit: 'themes', formula: 'Themes with rising frequency vs baseline and negative polarity', cohort: 'Theme ledger',
      aggregation: 'Count', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Illustrative emergence vs equal baseline — not a validated early-warning model.', method: 'Emerging negative themes.',
    }),
    row('Voice', 'High-Priority Feedback', {
      unit: 'comments', formula: 'Comments flagged for human review (severity or safety cue)', cohort: 'Analyzed comments',
      aggregation: 'Count', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Safety-flagged items require human review — not automated clinical triage.', method: 'Priority / pending review flags.',
    }),
    row('Voice', 'Theme Review Coverage', {
      unit: 'rate', formula: 'Human-reviewed classifications ÷ analyzed comments', cohort: 'Analyzed comments',
      aggregation: 'Ratio', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Auto labels remain provisional until human review.', method: 'Human review coverage.',
    }),

    row('Departments', 'Departments Meeting Experience Target', {
      unit: 'departments', formula: 'Departments with overall score ≥ target and sufficient sample', cohort: 'Comparable departments',
      aggregation: 'Count', scope: view.periodLabel, classification: 'constructed',
      limitations: `Minimum sample ${view.minDeptSample}; target ${view.overallTarget}/10.`, method: 'Departments meeting target.',
    }),
    row('Departments', 'Lowest Experience Dimension', {
      unit: 'label', formula: 'Hospital-wide lowest dimension mean among scored dimensions', cohort: 'Scored dimensions',
      aggregation: 'Argmin of means', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Dimension means use numerator/denominator — not unweighted averages of department %.', method: 'Lowest dimension label.',
    }),
    row('Departments', 'Survey Coverage Gap', {
      unit: 'departments', formula: 'Departments below minimum eligible response coverage', cohort: 'Comparable departments',
      aggregation: 'Count', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Low sample departments are retained but flagged — scores are not suppressed from aggregates.', method: 'Below-minimum sample count.',
    }),
    row('Departments', 'Material Experience Variance', {
      unit: 'points', formula: 'Max−min overall score among departments with adequate sample', cohort: 'Adequate-sample departments',
      aggregation: 'Range', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Inadequate samples excluded from the range.', method: 'Adequate-sample score range.',
    }),
    row('Departments', 'Departments Requiring Review', {
      unit: 'departments', formula: 'Below target or rising negative share with adequate sample', cohort: 'Adequate-sample departments',
      aggregation: 'Count', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Review flag is operational attention — not a regulatory finding.', method: 'Departments needing review.',
    }),

    row('Optimization', 'Addressable Experience Gap', {
      unit: 'points', formula: 'Points between current overall score and illustrative target', cohort: 'Eligible cohorts',
      aggregation: 'Difference', scope: view.periodLabel, classification: 'scenario',
      limitations: m.optimization, method: m.optimization,
    }),
    row('Optimization', 'Eligible Improvement Opportunities', {
      unit: 'actions', formula: 'Prioritized actions with evidence, owner, and follow-up measure', cohort: 'Scenario opportunities',
      aggregation: 'Count', scope: view.periodLabel, classification: 'scenario',
      limitations: 'Illustrative — impacts are assumed and not guaranteed.', method: 'Six opportunity themes.',
    }),
    row('Optimization', 'Modeled Satisfaction Uplift', {
      unit: 'points', formula: 'Illustrative overall-score points under documented assumptions', cohort: 'Eligible opportunities',
      aggregation: 'Modeled', scope: view.periodLabel, classification: 'scenario',
      limitations: 'Not achieved; does not invent survey responses.', method: 'Constrained modeled uplift.',
    }),
    row('Optimization', 'Potential Complaint Reduction', {
      unit: 'complaints', formula: 'Eligible complaints that could be prevented under assumptions', cohort: 'Addressable categories',
      aggregation: 'Modeled', scope: view.periodLabel, classification: 'scenario',
      limitations: 'Not every complaint is preventable.', method: 'Eligible preventable share.',
    }),
    row('Optimization', 'Priority Action Coverage', {
      unit: 'rate', formula: 'Priority actions with assigned owner ÷ priority opportunities', cohort: 'Priority opportunities',
      aggregation: 'Ratio', scope: view.periodLabel, classification: 'scenario',
      limitations: 'Ownership assignment ≠ completed improvement.', method: 'Priority owner coverage.',
    }),

    ...PX_CROSS_DOMAIN_FORBIDDEN.map((name) => blank(
      'Cross-domain context',
      name,
      'Owned by Domains 1–10 — not restated as a Patient Experience headline.',
    )),
  ];
}

export const PX_AI_CASES = [
  { id: 'px-wait-down', name: 'Reduce waiting-time dissatisfaction', level: 'Scenario', limit: 'Correlation ≠ causation vs operational waits' },
  { id: 'px-comm-up', name: 'Improve staff communication consistency', level: 'Scenario', limit: 'Not a clinician ranking engine' },
  { id: 'px-resolution-down', name: 'Reduce complaint resolution time', level: 'Scenario', limit: 'Closed ≠ patient satisfied' },
  { id: 'px-discharge-up', name: 'Improve discharge communication', level: 'Scenario', limit: 'Process only — not clinical outcomes' },
  { id: 'px-repeat-down', name: 'Reduce repeated complaint categories', level: 'Scenario', limit: 'Eligible preventable share only' },
  { id: 'px-touch-up', name: 'Lift lowest-scoring journey touchpoints', level: 'Scenario', limit: 'Constrained by linkage coverage' },
];
