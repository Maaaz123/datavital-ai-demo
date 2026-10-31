/**
 * Stage 2 — Orchestrator: plan tools from intent → execute bounded calls → GroundedAnswer.
 * Every numeric claim maps to a tool result ID.
 * Refuse unsupported clinical diagnosis / patient-level / CapEx auto-approval.
 */
import type { ReportPeriod } from '../period';
import { resolveActiveMode } from './gateway';
import { classifyIntent, isFlagshipQuestion } from './intent';
import { runInvestigation } from './investigation';
import { runOptimization } from './optimization';
import { executeTool, NO_STAFFING_COST_OPTIONS, type EnterpriseAiToolId } from './tools';
import type { GroundedAnswer, ToolExecutionRecord, ToolResultCitation } from './types';
import { AI_MODE_DISCLOSURE } from './types';

export type OrchestrateRequest = {
  question: string;
  hospital: string;
  year: number;
  period?: ReportPeriod;
  /** Cap tool executions (bounded). */
  maxTools?: number;
};

type PlanStep = { toolId: EnterpriseAiToolId; input: Record<string, unknown>; label: string };

function cite(
  record: ToolExecutionRecord,
  claim: string,
  numericValue?: number | null,
  metricId?: string,
): ToolResultCitation {
  return {
    toolResultId: record.id,
    toolId: record.toolId,
    claim,
    numericValue,
    metricId,
  };
}

function planForIntent(
  intentPrimary: string,
  secondary: string[],
  ctx: { hospital: string; year: number; period: ReportPeriod },
  flagship: boolean,
): PlanStep[] {
  const base = { hospital: ctx.hospital, year: ctx.year, period: ctx.period };
  const steps: PlanStep[] = [];

  if (flagship) {
    return [
      { toolId: 'check_reconciliation', input: { ...base }, label: 'Validate cross-domain reconciliation' },
      { toolId: 'get_metric', input: { ...base, metricId: 'ed.wait.median_min' }, label: 'Observe ED wait' },
      { toolId: 'get_metric', input: { ...base, metricId: 'beds.occupancy' }, label: 'Observe bed occupancy' },
      { toolId: 'get_metric', input: { ...base, metricId: 'icu.staffing_gap_hours' }, label: 'Observe ICU gap' },
      { toolId: 'get_metric', input: { ...base, metricId: 'rcm.net_patient_revenue' }, label: 'Observe RCM NPR' },
      { toolId: 'get_metric', input: { ...base, metricId: 'sc.critical_stockouts' }, label: 'Observe supply stockouts' },
      { toolId: 'get_metric_trend', input: { ...base, metricId: 'ed.wait.median_min' }, label: 'Trend ED wait' },
      { toolId: 'retrieve_cross_domain_evidence', input: { ...base, metricId: 'ed.wait.median_min' }, label: 'Knowledge-graph hops' },
      { toolId: 'inspect_data_quality', input: { ...base, metricId: 'ed.wait.median_min' }, label: 'Data quality / gate' },
      { toolId: 'retrieve_domain_evidence', input: { ...base, domain: 'Emergency', limit: 4 }, label: 'Emergency evidence' },
      { toolId: 'retrieve_domain_evidence', input: { ...base, domain: 'Beds', limit: 4 }, label: 'Beds evidence' },
      { toolId: 'retrieve_domain_evidence', input: { ...base, domain: 'ICU', limit: 4 }, label: 'ICU evidence' },
      { toolId: 'retrieve_domain_evidence', input: { ...base, domain: 'Revenue Cycle', limit: 4 }, label: 'RCM evidence' },
      {
        toolId: 'compare_interventions',
        input: {
          ...base,
          optionIds: ['ent-bed-assign-flow', 'st-supply-efficiency', 'ent-staffing-uplift'],
          noAdditionalStaffingCost: true,
        },
        label: 'Compare interventions under no-staffing-cost',
      },
      {
        toolId: 'run_what_if',
        input: { ...base, domain: 'Enterprise', kind: 'ent-ed-congestion', amount: 0.2 },
        label: 'Simulate enterprise congestion path',
      },
      {
        toolId: 'create_decision_proposal',
        input: {
          title: 'Operational improvement without additional staffing cost',
          question: 'Flagship: deteriorating performance + no-staffing-cost intervention',
          rationale:
            'Prefer flow-side bed assignment / discharge pull over staffing uplift under OpEx constraint. Overlapping benefits not summed.',
          recommendedOptionId: 'ent-bed-assign-flow',
          options: [
            {
              id: 'ent-bed-assign-flow',
              label: 'Faster bed assignment / discharge pull',
              increasesStaffingCost: false,
              expectedBenefitNote: 'Illustrative ED wait reduction without added FTEs',
              simulationIds: [],
            },
            {
              id: 'st-supply-efficiency',
              label: 'Supply efficiency / stockout reduction',
              increasesStaffingCost: false,
              expectedBenefitNote: 'Illustrative reduction in critical stockouts / avoidable consumables',
              simulationIds: [],
            },
          ],
        },
        label: 'Create decision proposal',
      },
      { toolId: 'get_decision_status', input: {}, label: 'Track decision / unmeasured outcome' },
    ];
  }

  const intents = new Set([intentPrimary, ...secondary]);
  steps.push({ toolId: 'check_reconciliation', input: { ...base }, label: 'Reconciliation gate' });

  if (intents.has('kpi_explanation') || intents.has('trend') || intents.has('root_cause') || intents.has('cross_domain')) {
    steps.push({ toolId: 'get_metric', input: { ...base, metricId: 'ed.wait.median_min' }, label: 'Focus metric' });
    steps.push({ toolId: 'get_metric_definition', input: { metricId: 'ed.wait.median_min' }, label: 'Definition' });
  }
  if (intents.has('trend')) {
    steps.push({ toolId: 'get_metric_trend', input: { ...base, metricId: 'ed.wait.median_min' }, label: 'Trend' });
  }
  if (intents.has('comparison')) {
    steps.push({
      toolId: 'compare_hospitals',
      input: { metricId: 'beds.occupancy', year: ctx.year, period: ctx.period, hospitals: ['H1', 'H2'] },
      label: 'Hospital compare',
    });
  }
  if (intents.has('cross_domain') || intents.has('root_cause')) {
    steps.push({
      toolId: 'retrieve_cross_domain_evidence',
      input: { ...base, metricId: 'ed.wait.median_min' },
      label: 'Cross-domain evidence',
    });
  }
  if (intents.has('risk')) {
    steps.push({ toolId: 'find_related_alerts', input: { ...base, department: 'Enterprise' }, label: 'Alerts' });
  }
  if (intents.has('financial')) {
    steps.push({ toolId: 'get_metric', input: { ...base, metricId: 'rcm.net_patient_revenue' }, label: 'NPR' });
    steps.push({ toolId: 'get_metric', input: { ...base, metricId: 'st.operating_contribution' }, label: 'Contribution' });
  }
  if (intents.has('data_quality')) {
    steps.push({ toolId: 'inspect_data_quality', input: { ...base }, label: 'DQ' });
  }
  if (intents.has('what_if') || intents.has('resource_allocation') || intents.has('decision_prep')) {
    steps.push({
      toolId: 'compare_interventions',
      input: {
        ...base,
        optionIds: [...NO_STAFFING_COST_OPTIONS.slice(0, 3)],
        noAdditionalStaffingCost: true,
      },
      label: 'Intervention compare',
    });
    steps.push({
      toolId: 'run_what_if',
      input: { ...base, domain: 'Enterprise', kind: 'ent-ed-congestion', amount: 0.2 },
      label: 'What-if',
    });
  }
  if (intents.has('decision_prep')) {
    steps.push({
      toolId: 'create_decision_proposal',
      input: {
        title: 'Enterprise AI decision draft',
        question: 'Prepared from orchestrated tools',
        rationale: 'Human approval required; KPI ledgers unchanged.',
        options: [
          {
            id: 'ent-bed-assign-flow',
            label: 'Bed assignment / discharge pull',
            increasesStaffingCost: false,
            expectedBenefitNote: 'Illustrative operational relief',
            simulationIds: [],
          },
        ],
      },
      label: 'Decision draft',
    });
  }
  if (intents.has('follow_up_status')) {
    steps.push({ toolId: 'get_decision_status', input: {}, label: 'Decision status' });
  }

  return steps;
}

function numFrom(record: ToolExecutionRecord, key = 'value'): number | null {
  const v = record.output[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/**
 * Orchestrate a grounded answer. Flagship question runs the full multi-step path.
 */
export function orchestrate(req: OrchestrateRequest): GroundedAnswer {
  const period = req.period ?? 'year';
  const mode = resolveActiveMode();
  const intent = classifyIntent(req.question);

  if (intent.refused) {
    return {
      question: req.question,
      intent,
      mode: mode.mode,
      modeLabel: mode.label,
      summary: intent.refuseReason ?? 'Request refused.',
      steps: ['Refuse unsupported request'],
      citations: [],
      toolResults: [],
      refused: true,
      refuseReason: intent.refuseReason,
    };
  }

  const flagship = isFlagshipQuestion(req.question);
  const maxTools = req.maxTools ?? (flagship ? 24 : 12);
  const plan = planForIntent(intent.primary, intent.secondary, {
    hospital: req.hospital,
    year: req.year,
    period,
  }, flagship).slice(0, maxTools);

  const toolResults: ToolExecutionRecord[] = [];
  const citations: ToolResultCitation[] = [];
  const steps: string[] = [`Mode: ${mode.label}`, `Intent: ${intent.primary}`];

  for (const step of plan) {
    const result = executeTool(step.toolId, step.input);
    toolResults.push(result);
    steps.push(step.label);
    if (result.ok) {
      const metricId = typeof result.output.metricId === 'string' ? result.output.metricId : undefined;
      const value = numFrom(result);
      if (value != null) {
        citations.push(cite(result, `${step.label}: ${metricId ?? step.toolId} = ${value}`, value, metricId));
      } else if (step.toolId === 'check_reconciliation') {
        citations.push(cite(result, `Reconciliation gate ok=${String(result.output.ok)}`));
      } else if (step.toolId === 'compare_interventions') {
        const ranking = result.output.ranking as { id: string; score: number }[] | undefined;
        citations.push(cite(result, `Intervention ranking: ${(ranking ?? []).map((r) => r.id).join(', ') || 'none'}`));
      } else if (step.toolId === 'create_decision_proposal') {
        citations.push(cite(result, `Decision ${String(result.output.decisionId)} status=${String(result.output.status)}`));
      } else if (step.toolId === 'run_what_if') {
        citations.push(cite(result, `What-if ${String(result.output.id)} (illustrative)`));
      } else {
        citations.push(cite(result, step.label));
      }
    }
  }

  // Structured investigation (≥4 domains on flagship).
  const investigation = runInvestigation({
    hospital: req.hospital,
    year: req.year,
    period,
    focusMetricId: 'ed.wait.median_min',
    additionalMetricIds: flagship
      ? ['beds.occupancy', 'icu.staffing_gap_hours', 'rcm.net_patient_revenue', 'sc.critical_stockouts', 'surg.or_utilization', 'px.overall_satisfaction']
      : undefined,
  });
  steps.push(`Investigation domains: ${investigation.domainsTouched.join(', ')}`);

  const optimization = flagship
    ? runOptimization({
        hospital: req.hospital,
        year: req.year,
        period,
        decisionVariables: ['ent-bed-assign-flow', 'st-supply-efficiency', 'st-reduce-overtime', 'ent-staffing-uplift'],
        objective: 'strongest_operational_improvement',
        noAdditionalStaffingCost: true,
      })
    : null;

  if (optimization) {
    steps.push(
      optimization.feasible
        ? `Optimization selected: ${optimization.selected} (feasible under constraints)`
        : `Optimization infeasible: ${optimization.infeasibleReason}`,
    );
  }

  const decisionResult = toolResults.find((r) => r.toolId === 'create_decision_proposal' && r.ok);
  const decisionProposalId = decisionResult && typeof decisionResult.output.decisionId === 'string'
    ? decisionResult.output.decisionId
    : undefined;

  const metricBits = citations
    .filter((c) => c.numericValue != null)
    .slice(0, 6)
    .map((c) => `${c.metricId ?? c.toolId}=${c.numericValue} [${c.toolResultId}]`)
    .join('; ');

  const summary = flagship
    ? [
        'Hospital performance pressure is multi-domain (ED wait, beds occupancy, ICU gap, revenue, supply) — not a single definitive root cause.',
        `Investigation touched ${investigation.domainsTouched.length} domains; reconciliation ${investigation.reconciliationOk ? 'passed' : 'reported issues'}.`,
        `Under no-additional-staffing-cost, preferred option is ${optimization?.selected ?? 'ent-bed-assign-flow'} vs supply-efficiency alternative; staffing uplift rejected by constraint.`,
        'Simulation is illustrative; decision recorded as demo state; observed outcome defaults to "Outcome not yet measured".',
        AI_MODE_DISCLOSURE,
        metricBits ? `Grounded figures: ${metricBits}` : '',
      ].filter(Boolean).join(' ')
    : [
        `Deterministic answer for intent ${intent.primary}.`,
        intent.disclosure,
        mode.disclosure,
        metricBits ? `Grounded figures: ${metricBits}` : 'See tool citations for evidence.',
      ].join(' ');

  return {
    question: req.question,
    intent,
    mode: mode.mode,
    modeLabel: mode.label,
    summary,
    steps,
    citations,
    toolResults,
    refused: false,
    investigationId: investigation.id,
    decisionProposalId,
    flagship,
  };
}

export const FLAGSHIP_QUESTION =
  'Why is hospital performance deteriorating, and which intervention would deliver the strongest operational improvement without increasing staffing costs?';
