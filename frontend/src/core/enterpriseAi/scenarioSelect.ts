/**
 * Map intervention / what-if intents to distinct existing what-if scenario IDs.
 * Do NOT reuse ent-ed-congestion for unrelated interventions.
 */
import type { DomainName } from '@/showcase/whatIf';

export type ScenarioSelection = {
  available: boolean;
  scenarioId: string | null;
  domain: DomainName | 'Enterprise' | string;
  amount: number;
  label: string;
  reason: string;
};

type ScenarioRule = {
  id: string;
  domain: DomainName | 'Enterprise';
  label: string;
  weight: number;
  amount: number;
  re: RegExp;
};

const SCENARIO_RULES: ScenarioRule[] = [
  {
    id: 'ent-bed-assign-flow',
    domain: 'Enterprise',
    label: 'Faster bed assignment / discharge pull',
    weight: 5,
    amount: 0.2,
    re: /bed\s+assign|discharge\s+pull|flow\s+relief|capacity\s+flow|faster\s+discharge/i,
  },
  {
    id: 'ed-boarding-down',
    domain: 'Emergency',
    label: 'Reduce ED boarding',
    weight: 4.5,
    amount: 0.2,
    re: /\b(boarding|ed\s+congestion|emergency\s+congestion|door[- ]to[- ]provider|ed\s+wait)\b/i,
  },
  {
    id: 'st-supply-efficiency',
    domain: 'Strategy',
    label: 'Supply consumption efficiency',
    weight: 5,
    amount: 0.2,
    re: /supply\s+efficien|stockouts?|procurement\s+efficien|consumables|inventory\s+efficien|reduce\s+critical\s+stock/i,
  },
  {
    id: 'sc-fill-rate-up',
    domain: 'Supply Chain',
    label: 'Improve supplier fill rate',
    weight: 4,
    amount: 0.05,
    re: /fill\s+rate|supplier\s+fill|replenish/i,
  },
  {
    id: 'sc-near-expiry-down',
    domain: 'Supply Chain',
    label: 'Reduce near-expiry inventory',
    weight: 4,
    amount: 0.35,
    re: /near[- ]?expir|expir(?:y|ation)\s+waste/i,
  },
  {
    id: 'st-reduce-overtime',
    domain: 'Strategy',
    label: 'Reduce avoidable overtime',
    weight: 5,
    amount: 0.25,
    re: /overtime|ot\s+cost|avoidable\s+overtime/i,
  },
  {
    id: 'rcm-denials-down',
    domain: 'Revenue Cycle',
    label: 'Reduce claim denials',
    weight: 5,
    amount: 0.2,
    re: /denials?|\bdenied\b|claims?\s+(being\s+)?denied|denied\s+claims?|first[- ]pass|clean\s+claim|revenue\s+leak/i,
  },
  {
    id: 'rcm-ar-accelerate',
    domain: 'Revenue Cycle',
    label: 'Accelerate AR collections',
    weight: 4,
    amount: 0.3,
    re: /accounts?\s+receivable|days?\s+in\s+ar|\bar\b\s+collect|accelerat(?:e|ion)\s+ar/i,
  },
  {
    id: 'st-reallocate-nurses',
    domain: 'Strategy',
    label: 'Reallocate nurses (staffing cost)',
    weight: 4,
    amount: 0.2,
    re: /\b(reallocat(e|ion)\s+nurses|nurse\s+reallocat|redeploy\s+nurs)\b/i,
  },
  {
    id: 'ent-staffing-uplift',
    domain: 'Enterprise',
    label: 'Staffing uplift (increases cost)',
    weight: 3.5,
    amount: 0.15,
    re: /\b(add(itional)?\s+staff|hire|new\s+hires?|staffing\s+uplift|increase\s+staffing)\b/i,
  },
  {
    id: 'icu-flow-up',
    domain: 'ICU',
    label: 'Improve ICU flow coordination',
    weight: 4,
    amount: 0.15,
    re: /\b(icu\s+flow|critical\s+care\s+flow|icu\s+discharge\s+coord)\b/i,
  },
  {
    id: 'icu-staffed-up',
    domain: 'ICU',
    label: 'Increase ICU staffed hours',
    weight: 3.5,
    amount: 0.1,
    re: /\b(icu\s+staff|critical\s+care\s+staff)\b/i,
  },
  {
    id: 'px-communication-up',
    domain: 'Patient Experience',
    label: 'Improve communication satisfaction',
    weight: 4,
    amount: 0.15,
    re: /patient\s+communicat|satisfaction\s+intervention|px\s+communicat|communication\s+satisfaction/i,
  },
  {
    id: 'qs-capa-overdue-down',
    domain: 'Quality & Safety',
    label: 'Reduce overdue CAPA actions',
    weight: 4,
    amount: 0.4,
    re: /\b(capa|overdue\s+(corrective|action)|safety\s+action|patient\s+safety|high[- ]risk\s+safety)\b/i,
  },
  {
    id: 'qs-hh-up',
    domain: 'Quality & Safety',
    label: 'Improve hand hygiene compliance',
    weight: 3.5,
    amount: 0.08,
    re: /\b(hand\s+hygiene|hh\s+compliance)\b/i,
  },
  {
    id: 'surg-turnover-down',
    domain: 'Surgery',
    label: 'Reduce OR turnover time',
    weight: 4,
    amount: 0.15,
    re: /\b(or\s+turnover|theatre\s+turnover|surgical\s+turnover)\b/i,
  },
  {
    id: 'beds-unblock-5',
    domain: 'Beds',
    label: 'Unblock beds',
    weight: 4,
    amount: 0.2,
    re: /unblock\s+beds?|blocked\s+beds?|bed\s+readiness/i,
  },
  {
    id: 'ipd-longstay-down',
    domain: 'Inpatient',
    label: 'Reduce long-stay pressure',
    weight: 4,
    amount: 0.2,
    re: /\b(long[- ]stay|length\s+of\s+stay|los\s+reduc)\b/i,
  },
  {
    id: 'ent-ed-congestion',
    domain: 'Enterprise',
    label: 'Enterprise ED congestion path',
    weight: 2,
    amount: 0.2,
    re: /\b(ent[- ]?ed[- ]?congestion|enterprise\s+ed\s+congestion)\b/i,
  },
];

const INTERVENTION_CUE =
  /\b(what[- ]?if|scenario|simulat|intervention|improv(e|ement)|reduc(e|tion)|compare\s+options?|strongest|would\s+deliver|recommend(ed)?\s+action)\b/i;

export function selectScenarioFromQuestion(question: string): ScenarioSelection {
  const q = question.trim();
  if (!q) {
    return {
      available: false,
      scenarioId: null,
      domain: 'Enterprise',
      amount: 0,
      label: 'Scenario unavailable',
      reason: 'Scenario unavailable with the current evidence and model.',
    };
  }

  const scored = SCENARIO_RULES
    .map((rule) => ({ rule, score: rule.re.test(q) ? rule.weight : 0 }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.rule.id.localeCompare(b.rule.id));

  if (scored.length === 0) {
    if (INTERVENTION_CUE.test(q)) {
      return {
        available: false,
        scenarioId: null,
        domain: 'Enterprise',
        amount: 0,
        label: 'Scenario unavailable',
        reason: 'Scenario unavailable with the current evidence and model.',
      };
    }
    return {
      available: false,
      scenarioId: null,
      domain: 'Enterprise',
      amount: 0,
      label: 'No scenario requested',
      reason: 'No intervention scenario selected for this question.',
    };
  }

  const best = scored[0]!.rule;
  return {
    available: true,
    scenarioId: best.id,
    domain: best.domain,
    amount: best.amount,
    label: best.label,
    reason: `Selected scenario ${best.id} from intervention language.`,
  };
}

/** Candidate option IDs for constrained comparison given question + staffing constraint. */
export function scenarioLabelForId(id: string | null | undefined): string {
  if (!id) return 'None';
  return SCENARIO_RULES.find((rule) => rule.id === id)?.label ?? id;
}

/** Topic → preferred intervention when the question names a domain but not an explicit what-if. */
const TOPIC_PRIMARY: Record<string, string> = {
  denials_rcm: 'rcm-denials-down',
  supply: 'st-supply-efficiency',
  overtime_workforce: 'st-reduce-overtime',
  quality: 'qs-capa-overdue-down',
  icu: 'icu-flow-up',
  ed_wait: 'ed-boarding-down',
  beds: 'ent-bed-assign-flow',
  contribution: 'st-supply-efficiency',
  pharmacy: 'st-supply-efficiency',
  surgery: 'surg-turnover-down',
  inpatient: 'ipd-longstay-down',
};

export function primaryScenarioForTopic(topic: string | null | undefined): string | null {
  if (!topic) return null;
  return TOPIC_PRIMARY[topic] ?? null;
}

export function interventionCandidatesForQuestion(
  question: string,
  noAdditionalStaffingCost: boolean,
  topicHint?: string | null,
): string[] {
  const selected = selectScenarioFromQuestion(question);
  const pool = [
    'ent-bed-assign-flow',
    'st-supply-efficiency',
    'st-reduce-overtime',
    'ed-boarding-down',
    'rcm-denials-down',
    'icu-flow-up',
    'qs-capa-overdue-down',
  ];
  if (!noAdditionalStaffingCost) {
    pool.push('ent-staffing-uplift', 'st-reallocate-nurses');
  }
  const topicPrimary = primaryScenarioForTopic(topicHint);
  // Never silently prefer bed-flow for finance/quality/supply questions.
  const primary = selected.scenarioId && selected.available
    ? selected.scenarioId
    : topicPrimary;
  const ordered = primary
    ? [primary, ...pool.filter((id) => id !== primary)]
    : pool.filter((id) => id !== 'ent-bed-assign-flow').concat(['ent-bed-assign-flow']);
  const options = ordered.filter((id) => {
    if (noAdditionalStaffingCost && (id === 'ent-staffing-uplift' || id === 'st-reallocate-nurses' || id === 'st-staff-constrained-sl')) {
      return false;
    }
    return true;
  });
  return options.slice(0, 4);
}
