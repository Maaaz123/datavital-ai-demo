/**
 * Derive investigation focusMetricId from question topic/entity extraction.
 * Never silently default to ED wait for unrelated or ambiguous questions.
 */
import { getMetric } from './metricRegistry';

export type FocusResolutionMode =
  | 'topic'
  | 'flagship_multi'
  | 'hospital_wide_risk'
  | 'clarification';

export type FocusResolution = {
  focusMetricId: string | null;
  mode: FocusResolutionMode;
  topic: string;
  label: string;
  clarificationTopics?: string[];
  additionalMetricIds?: string[];
  note: string;
};

type TopicRule = {
  topic: string;
  metricId: string;
  label: string;
  weight: number;
  re: RegExp;
};

const TOPIC_RULES: TopicRule[] = [
  { topic: 'ed_wait', metricId: 'ed.wait.median_min', label: 'Emergency Waiting Time', weight: 4, re: /\b(ed\b|emergency|door[- ]to[- ]provider|triage|boarding|ed\s+wait)/i },
  { topic: 'denials_rcm', metricId: 'rcm.gross_denial_rate', label: 'Gross Denial Rate', weight: 5, re: /denials?|denied|revenue\s+cycle|\brcm\b|net\s+patient\s+revenue|\bnpr\b|accounts?\s+receivable|days?\s+in\s+ar|\bclaims?\b|finance/i },
  { topic: 'supply', metricId: 'sc.critical_stockouts', label: 'Critical Supply Stockouts', weight: 5, re: /supply|stockouts?|stock[- ]?outs?|expiry|near[- ]?expir|procurement|\bsku\b|inventory|fill\s+rate|days?\s+of\s+supply/i },
  { topic: 'contribution', metricId: 'st.operating_contribution', label: 'Operating Contribution', weight: 4, re: /contribution|margin|operating\s+contribution|cost\s+center|profitabilit|opex(?!\s*constraint)|financial\s+performance/i },
  { topic: 'satisfaction', metricId: 'px.overall_satisfaction', label: 'Overall Patient Satisfaction', weight: 3.5, re: /satisfaction|patient\s+experience|\bpx\b|complaint|\bnps\b|touchpoint/i },
  { topic: 'icu', metricId: 'icu.staffing_gap_hours', label: 'ICU Staffing Gap Hours', weight: 3.5, re: /\bicu\b|critical\s+care|ventilat|icu\s+board|icu\s+occup/i },
  { topic: 'quality', metricId: 'qs.overdue_high_risk_actions', label: 'Overdue High-Risk Safety Actions', weight: 3.5, re: /\bquality\b|\bsafety\b|\bcapa\b|clabsi|\bhai\b|infection\s+prevention|patient\s+safety|hand\s+hygiene/i },
  { topic: 'beds', metricId: 'beds.occupancy', label: 'Bed Occupancy', weight: 3.5, re: /\bbeds?\b|occupancy|capacity|\bward\b|assignment\s+delay|blocked\s+bed/i },
  { topic: 'surgery', metricId: 'surg.or_utilization', label: 'OR Utilization', weight: 3, re: /surgery|operating\s+room|\bor\b|theatre|first[- ]case|turnover|elective/i },
  { topic: 'lab', metricId: 'lab.median_tat_hours', label: 'Laboratory Median TAT', weight: 3, re: /\blab\b|laborator|specimen|patholog|stat\s+tat/i },
  { topic: 'radiology', metricId: 'rad.median_report_tat_hours', label: 'Radiology Report TAT', weight: 3, re: /radiolog|imaging|\bmri\b|ct\s+scan|scanner|report\s+tat/i },
  { topic: 'pharmacy', metricId: 'rx.stockout_skus', label: 'Pharmacy Stockout SKUs', weight: 5.5, re: /pharmac|medication|dispens|drug\s+stock/i },
  { topic: 'opd', metricId: 'opd.wait.median_min', label: 'Outpatient Waiting Time', weight: 2.5, re: /\bopd\b|outpatient|clinic\s+wait/i },
  { topic: 'appointments', metricId: 'appt.no_show_rate', label: 'Appointment No-Show Rate', weight: 2.5, re: /appointment|no[- ]?show|slot\s+fill|schedul/i },
  { topic: 'inpatient', metricId: 'ipd.los_median_days', label: 'Inpatient Length of Stay', weight: 2.5, re: /inpatient|length\s+of\s+stay|\blos\b|discharge\s+delay|long[- ]stay/i },
];
const FLAGSHIP_METRICS = [
  'ed.wait.median_min',
  'beds.occupancy',
  'icu.staffing_gap_hours',
  'rcm.net_patient_revenue',
  'sc.critical_stockouts',
  'surg.or_utilization',
  'px.overall_satisfaction',
] as const;

const AMBIGUOUS_RE =
  /\b(something\s+interesting|how\s+is\s+(the\s+)?hospital\s+performing|top\s+risks?|what\s+should\s+i\s+(look\s+at|focus\s+on)|give\s+me\s+an\s+overview|hospital[- ]wide|overall\s+performance)\b/i;

const CLARIFICATION_TOPICS = [
  'Emergency waiting time and boarding',
  'Revenue denials and net patient revenue',
  'Critical supply stockouts',
  'Operating contribution and margin',
  'ICU staffing gap',
  'Quality & safety overdue CAPA actions',
  'Bed occupancy and capacity',
  'Patient satisfaction',
];

function scoreTopics(question: string): { topic: string; metricId: string; label: string; score: number }[] {
  const scored = TOPIC_RULES.map((rule) => ({
    topic: rule.topic,
    metricId: rule.metricId,
    label: rule.label,
    score: rule.re.test(question) ? rule.weight : 0,
  })).filter((r) => r.score > 0);
  scored.sort((a, b) => b.score - a.score || a.topic.localeCompare(b.topic));
  return scored;
}

/** Prefer NPR when the question is revenue-framed without denial language. */
function refineFinancialMetric(question: string, metricId: string): string {
  if (metricId === 'rcm.gross_denial_rate' && /\b(npr|net\s+patient\s+revenue)\b/i.test(question) && !/\bdenial/i.test(question)) {
    return 'rcm.net_patient_revenue';
  }
  if (metricId === 'st.operating_contribution' && /\bcontribution\s+margin\b/i.test(question)) {
    return 'st.contribution_margin_rate';
  }
  if (metricId === 'sc.critical_stockouts' && /\bdays?\s+of\s+supply\b/i.test(question)) {
    return 'sc.days_of_supply';
  }
  return metricId;
}

export function isAmbiguousHospitalQuestion(question: string): boolean {
  return AMBIGUOUS_RE.test(question);
}

export function isFlagshipMultiDomain(question: string): boolean {
  const q = question.toLowerCase();
  return (
    q.includes('hospital performance deteriorating')
    || (q.includes('deteriorat') && q.includes('intervention') && q.includes('staffing'))
  );
}

/**
 * Resolve focus metric for investigation / orchestrator / UI workspace.
 */
export function resolveFocusFromQuestion(question: string): FocusResolution {
  const q = question.trim();
  if (!q) {
    return {
      focusMetricId: null,
      mode: 'clarification',
      topic: 'none',
      label: 'Clarification needed',
      clarificationTopics: CLARIFICATION_TOPICS,
      note: 'Empty question — ask which management topic to investigate.',
    };
  }

  if (isFlagshipMultiDomain(q)) {
    return {
      focusMetricId: 'ed.wait.median_min',
      mode: 'flagship_multi',
      topic: 'hospital_performance',
      label: 'Hospital-wide performance pressure (multi-domain)',
      additionalMetricIds: [...FLAGSHIP_METRICS],
      note: 'Flagship multi-domain investigation — ED wait is one observed pressure among several domains, not a silent default for unrelated questions.',
    };
  }

  // Prefer explicit topic hits over ambiguous overview phrasing.
  const scored = scoreTopics(q);
  if (scored.length > 0) {
    const top = scored[0]!;
    const second = scored[1];
    // Only clarify when two different topics truly tie at the top score.
    if (second && top.score === second.score && top.topic !== second.topic) {
      return {
        focusMetricId: null,
        mode: 'clarification',
        topic: 'multi_topic',
        label: 'Clarification needed',
        clarificationTopics: [top.label, second.label, ...CLARIFICATION_TOPICS.filter((t) => t !== top.label && t !== second.label)].slice(0, 6),
        note: `Multiple topics scored equally (${top.topic} vs ${second.topic}) — clarify which to investigate. Emergency Waiting Time is not assumed.`,
      };
    }
    const metricId = refineFinancialMetric(q, top.metricId);
    const def = getMetric(metricId);
    return {
      focusMetricId: metricId,
      mode: 'topic',
      topic: top.topic,
      label: def?.name ?? top.label,
      additionalMetricIds: scored.slice(1, 4).map((s) => refineFinancialMetric(q, s.metricId)),
      note: `Focus derived from topic "${top.topic}" → ${metricId}.`,
    };
  }

  if (isAmbiguousHospitalQuestion(q)) {
    return {
      focusMetricId: null,
      mode: 'hospital_wide_risk',
      topic: 'hospital_wide',
      label: 'Hospital-wide risk overview',
      clarificationTopics: CLARIFICATION_TOPICS,
      additionalMetricIds: [...FLAGSHIP_METRICS],
      note: 'Ambiguous performance/risk question — presenting labeled hospital-wide risk overview. Emergency Waiting Time is not assumed by default.',
    };
  }

  return {
    focusMetricId: null,
    mode: 'clarification',
    topic: 'none',
    label: 'Clarification needed',
    clarificationTopics: CLARIFICATION_TOPICS,
    note: 'Topic unclear — choose a clarification topic or review the labeled hospital-wide risk overview. Emergency Waiting Time is not assumed.',
  };
}

export function executiveMetricLabel(metricId: string | null | undefined): string {
  if (!metricId) return 'Hospital-wide overview';
  const known: Record<string, string> = {
    'ed.wait.median_min': 'Emergency Waiting Time',
    'ed.arrivals': 'Emergency Arrivals',
    'ed.boarding.gt4h_rate': 'ED Boarding Rate (>4h)',
    'beds.occupancy': 'Bed Occupancy',
    'beds.available': 'Available Beds',
    'icu.staffing_gap_hours': 'ICU Staffing Gap Hours',
    'rcm.gross_denial_rate': 'Gross Denial Rate',
    'rcm.net_patient_revenue': 'Net Patient Revenue',
    'rcm.days_in_ar': 'Days in Accounts Receivable',
    'sc.critical_stockouts': 'Critical Supply Stockouts',
    'sc.days_of_supply': 'Days of Supply',
    'st.operating_contribution': 'Operating Contribution',
    'st.contribution_margin_rate': 'Contribution Margin Rate',
    'px.overall_satisfaction': 'Overall Patient Satisfaction',
    'qs.overdue_high_risk_actions': 'Overdue High-Risk Safety Actions',
    'qs.clabsi_rate': 'CLABSI Rate',
    'surg.or_utilization': 'OR Utilization',
    'lab.median_tat_hours': 'Laboratory Median TAT',
    'rad.median_report_tat_hours': 'Radiology Report TAT',
    'rx.stockout_skus': 'Pharmacy Stockout SKUs',
    'opd.wait.median_min': 'Outpatient Waiting Time',
    'appt.no_show_rate': 'Appointment No-Show Rate',
    'ipd.los_median_days': 'Inpatient Length of Stay',
  };
  if (known[metricId]) return known[metricId];
  return getMetric(metricId)?.name ?? metricId;
}

export function driverStatusLabel(status: string): string {
  switch (status) {
    case 'supported':
      return 'Supported';
    case 'partially_supported':
      return 'Partially Supported';
    case 'contradicted':
      return 'Contradicted';
    case 'insufficient_evidence':
      return 'More Evidence Needed';
    default:
      return status;
  }
}
