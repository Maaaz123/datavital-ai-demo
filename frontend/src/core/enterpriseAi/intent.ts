/**
 * Structured intent classifier for Domain 16 Enterprise AI.
 * Prefer pattern + scores; disclose deterministic fallback. Do not claim unrestricted LLM reasoning.
 */
import { z } from 'zod';
import type { EnterpriseAiIntent, IntentClassification } from './types';
import { REFUSAL_CAPEX_AUTO, REFUSAL_CLINICAL } from './types';

export const INTENT_IDS: EnterpriseAiIntent[] = [
  'kpi_explanation',
  'comparison',
  'trend',
  'root_cause',
  'cross_domain',
  'risk',
  'resource_allocation',
  'financial',
  'what_if',
  'decision_prep',
  'follow_up_status',
  'data_quality',
];

export const IntentIdSchema = z.enum([
  'kpi_explanation',
  'comparison',
  'trend',
  'root_cause',
  'cross_domain',
  'risk',
  'resource_allocation',
  'financial',
  'what_if',
  'decision_prep',
  'follow_up_status',
  'data_quality',
]);

const PATTERNS: { intent: EnterpriseAiIntent; weight: number; re: RegExp }[] = [
  { intent: 'root_cause', weight: 3, re: /\b(why|root\s*cause|deteriorat|driving|driver|investigat|rca)\b/i },
  { intent: 'what_if', weight: 3, re: /\b(what[- ]?if|scenario|simulat|intervention|would\s+deliver|strongest)\b/i },
  { intent: 'comparison', weight: 2.5, re: /\b(compar(e|ison)|versus|vs\.?|against|better\s+than)\b/i },
  { intent: 'trend', weight: 2.5, re: /\b(trend|over\s+time|month(ly)?|forecast|trajectory|worsen|improv)/i },
  { intent: 'cross_domain', weight: 2.5, re: /\b(cross[- ]?domain|across\s+domains|enterprise|hospital\s+performance|multi[- ]?domain)\b/i },
  { intent: 'resource_allocation', weight: 2.5, re: /\b(allocat|staffing\s+cost|no[- ]?additional[- ]?staff|redeploy|resource|capacity\s+relief)\b/i },
  { intent: 'financial', weight: 2, re: /\b(revenue|npr|contribution|margin|denial|financial|cost|opex|capex)\b/i },
  { intent: 'risk', weight: 2, re: /\b(risk|alert|exception|pressure|critical|safety|stockout)\b/i },
  { intent: 'decision_prep', weight: 2.5, re: /\b(propos(e|al)?|recommend|approve|which\s+intervention|prepare\s+a\s+decision)\b/i },
  { intent: 'follow_up_status', weight: 3, re: /\b(follow[- ]?up|status\s+of|decision\s+status|outcome|effectiveness|progress\s+of\s+decision)\b/i },
  { intent: 'data_quality', weight: 2.5, re: /\b(data\s+quality|reconcile|reconciliation|lineage|missing\s+data|dq)\b/i },
  { intent: 'kpi_explanation', weight: 1.5, re: /\b(what\s+is|explain|define|definition|kpi|metric|mean)\b/i },
];

const DISCLOSURE =
  'Intent classified by deterministic pattern scoring (not unrestricted LLM reasoning). Fallback primary is kpi_explanation when scores are weak.';

function emptyScores(): Record<EnterpriseAiIntent, number> {
  return Object.fromEntries(INTENT_IDS.map((id) => [id, 0])) as Record<EnterpriseAiIntent, number>;
}

export function classifyIntent(question: string): IntentClassification {
  const q = question.trim();
  const scores = emptyScores();

  if (!q) {
    return {
      primary: 'kpi_explanation',
      secondary: [],
      scores,
      method: 'deterministic-pattern',
      disclosure: DISCLOSURE,
    };
  }

  // Hard refusals — surface as refused intents before planning tools.
  if (/\b(diagnos(e|is)|patient[- ]level|this\s+patient|prescribe|clinical\s+decision\s+support)\b/i.test(q)) {
    return {
      primary: 'kpi_explanation',
      secondary: [],
      scores,
      method: 'deterministic-pattern',
      disclosure: DISCLOSURE,
      refused: true,
      refuseReason: REFUSAL_CLINICAL,
    };
  }
  if (/\b(auto[- ]?approv(e|al).*capex|approve\s+capex\s+automatic|autonomous\s+capex)\b/i.test(q)) {
    return {
      primary: 'decision_prep',
      secondary: [],
      scores,
      method: 'deterministic-pattern',
      disclosure: DISCLOSURE,
      refused: true,
      refuseReason: REFUSAL_CAPEX_AUTO,
    };
  }

  for (const pattern of PATTERNS) {
    if (pattern.re.test(q)) scores[pattern.intent] += pattern.weight;
  }

  // Flagship / multi-intent boost: deteriorating + intervention + staffing constraint.
  if (/deteriorat/i.test(q) && /intervention/i.test(q)) {
    scores.root_cause += 2;
    scores.what_if += 2;
    scores.decision_prep += 1.5;
    scores.cross_domain += 1.5;
    scores.resource_allocation += 1;
  }
  if (/without\s+(increasing\s+)?staffing\s+costs?/i.test(q) || /no[- ]additional[- ]staff/i.test(q)) {
    scores.resource_allocation += 2;
    scores.what_if += 1;
  }

  const ranked = [...INTENT_IDS].sort((a, b) => scores[b] - scores[a] || a.localeCompare(b));
  const top = ranked[0];
  const primary = scores[top] > 0 ? top : 'kpi_explanation';
  const secondary = ranked.filter((id) => id !== primary && scores[id] > 0).slice(0, 3);

  return {
    primary,
    secondary,
    scores,
    method: 'deterministic-pattern',
    disclosure: DISCLOSURE,
  };
}

export function isFlagshipQuestion(question: string): boolean {
  const q = question.toLowerCase();
  return (
    q.includes('hospital performance deteriorating')
    || (q.includes('deteriorat') && q.includes('intervention') && q.includes('staffing'))
  );
}
