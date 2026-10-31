/**
 * Stage 2 — Orchestrator: plan tools from intent → execute bounded calls → GroundedAnswer.
 * Focus and scenario IDs are derived from the question — never silent ED / ent-ed-congestion defaults.
 */
import type { ReportPeriod } from '../period';
import { buildExecutiveResponse } from './executiveResponse';
import { resolveFocusFromQuestion } from './focus';
import { resolveActiveMode } from './gateway';
import { classifyIntent, isFlagshipQuestion } from './intent';
import { runInvestigation } from './investigation';
import { runOptimization } from './optimization';
import { rankHospitalRisks } from './riskIntelligence';
import {
  interventionCandidatesForQuestion,
  selectScenarioFromQuestion,
} from './scenarioSelect';
import { executeTool, type EnterpriseAiToolId } from './tools';
import type { GroundedAnswer, InvestigationState, ToolExecutionRecord, ToolResultCitation } from './types';

export type OrchestrateRequest = {
  question: string;
  hospital: string;
  year: number;
  period?: ReportPeriod;
  maxTools?: number;
  /** Prior multi-turn state (optional). */
  priorState?: Partial<InvestigationState>;
  noAdditionalStaffingCost?: boolean;
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

function planForIntent(args: {
  intentPrimary: string;
  secondary: string[];
  hospital: string;
  year: number;
  period: ReportPeriod;
  flagship: boolean;
  focusMetricId: string | null;
  scenarioId: string | null;
  scenarioDomain: string;
  scenarioAmount: number;
  optionIds: string[];
  noStaff: boolean;
  question: string;
}): PlanStep[] {
  const base = { hospital: args.hospital, year: args.year, period: args.period };
  const focus = args.focusMetricId;

  if (args.flagship) {
    return [
      { toolId: 'check_reconciliation', input: { ...base }, label: 'Validate cross-domain reconciliation' },
      { toolId: 'get_metric', input: { ...base, metricId: 'ed.wait.median_min' }, label: 'Observe Emergency Waiting Time' },
      { toolId: 'get_metric', input: { ...base, metricId: 'beds.occupancy' }, label: 'Observe bed occupancy' },
      { toolId: 'get_metric', input: { ...base, metricId: 'icu.staffing_gap_hours' }, label: 'Observe ICU gap' },
      { toolId: 'get_metric', input: { ...base, metricId: 'rcm.net_patient_revenue' }, label: 'Observe net patient revenue' },
      { toolId: 'get_metric', input: { ...base, metricId: 'sc.critical_stockouts' }, label: 'Observe supply stockouts' },
      { toolId: 'get_metric_trend', input: { ...base, metricId: 'ed.wait.median_min' }, label: 'Trend Emergency Waiting Time' },
      {
        toolId: 'retrieve_cross_domain_evidence',
        input: { ...base, metricId: 'ed.wait.median_min' },
        label: 'Cross-domain evidence hops',
      },
      { toolId: 'inspect_data_quality', input: { ...base, metricId: 'ed.wait.median_min' }, label: 'Data quality gate' },
      { toolId: 'retrieve_domain_evidence', input: { ...base, domain: 'Emergency', limit: 4 }, label: 'Emergency evidence' },
      { toolId: 'retrieve_domain_evidence', input: { ...base, domain: 'Beds', limit: 4 }, label: 'Beds evidence' },
      { toolId: 'retrieve_domain_evidence', input: { ...base, domain: 'ICU', limit: 4 }, label: 'ICU evidence' },
      { toolId: 'retrieve_domain_evidence', input: { ...base, domain: 'Revenue Cycle', limit: 4 }, label: 'Revenue evidence' },
      {
        toolId: 'compare_interventions',
        input: {
          ...base,
          optionIds: ['ent-bed-assign-flow', 'st-supply-efficiency', 'ent-staffing-uplift'],
          noAdditionalStaffingCost: true,
        },
        label: 'Compare Improvement Options',
      },
      {
        toolId: 'run_what_if',
        input: {
          ...base,
          domain: 'Enterprise',
          kind: 'ent-bed-assign-flow',
          amount: 0.2,
        },
        label: 'Simulate preferred flow intervention',
      },
      {
        toolId: 'create_decision_proposal',
        input: {
          title: 'Operational improvement without additional staffing cost',
          question: args.question,
          rationale:
            'Prefer flow-side bed assignment / discharge pull over staffing uplift under OpEx constraint. Overlapping benefits not summed.',
          recommendedOptionId: 'ent-bed-assign-flow',
          options: [
            {
              id: 'ent-bed-assign-flow',
              label: 'Faster bed assignment / discharge pull',
              increasesStaffingCost: false,
              expectedBenefitNote: 'Illustrative operational relief without added FTEs',
              simulationIds: [],
            },
            {
              id: 'st-supply-efficiency',
              label: 'Supply efficiency / stockout reduction',
              increasesStaffingCost: false,
              expectedBenefitNote: 'Illustrative reduction in critical stockouts',
              simulationIds: [],
            },
          ],
        },
        label: 'Create decision proposal',
      },
      { toolId: 'get_decision_status', input: {}, label: 'Track decision / unmeasured outcome' },
    ];
  }

  const intents = new Set([args.intentPrimary, ...args.secondary]);
  const steps: PlanStep[] = [
    { toolId: 'check_reconciliation', input: { ...base }, label: 'Reconciliation gate' },
  ];

  if (focus && (intents.has('kpi_explanation') || intents.has('trend') || intents.has('root_cause') || intents.has('cross_domain') || intents.has('financial') || intents.has('risk'))) {
    steps.push({ toolId: 'get_metric', input: { ...base, metricId: focus }, label: 'Focus metric' });
    steps.push({ toolId: 'get_metric_definition', input: { metricId: focus }, label: 'Definition' });
  }
  if (focus && intents.has('trend')) {
    steps.push({ toolId: 'get_metric_trend', input: { ...base, metricId: focus }, label: 'Trend' });
  }
  if (intents.has('comparison')) {
    steps.push({
      toolId: 'compare_hospitals',
      input: { metricId: focus ?? 'beds.occupancy', year: args.year, period: args.period, hospitals: ['H1', 'H2'] },
      label: 'Hospital compare',
    });
  }
  if (focus && (intents.has('cross_domain') || intents.has('root_cause'))) {
    steps.push({
      toolId: 'retrieve_cross_domain_evidence',
      input: { ...base, metricId: focus },
      label: 'Cross-domain evidence',
    });
  }
  if (intents.has('risk') || !focus) {
    steps.push({ toolId: 'find_related_alerts', input: { ...base, department: 'Enterprise' }, label: 'Alerts' });
  }
  if (intents.has('financial')) {
    steps.push({ toolId: 'get_metric', input: { ...base, metricId: 'rcm.net_patient_revenue' }, label: 'Net patient revenue' });
    steps.push({ toolId: 'get_metric', input: { ...base, metricId: 'st.operating_contribution' }, label: 'Operating contribution' });
  }
  if (intents.has('data_quality')) {
    steps.push({ toolId: 'inspect_data_quality', input: { ...base, metricId: focus ?? undefined }, label: 'Data quality' });
  }
  if (intents.has('what_if') || intents.has('resource_allocation') || intents.has('decision_prep')) {
    steps.push({
      toolId: 'compare_interventions',
      input: {
        ...base,
        optionIds: args.optionIds.slice(0, 4),
        noAdditionalStaffingCost: args.noStaff,
      },
      label: 'Compare Improvement Options',
    });
    if (args.scenarioId) {
      steps.push({
        toolId: 'run_what_if',
        input: {
          ...base,
          domain: args.scenarioDomain,
          kind: args.scenarioId,
          amount: args.scenarioAmount,
        },
        label: `What-if: ${args.scenarioId}`,
      });
    }
  }
  if (intents.has('decision_prep')) {
    const optionId = args.scenarioId ?? args.optionIds[0] ?? 'ent-bed-assign-flow';
    steps.push({
      toolId: 'create_decision_proposal',
      input: {
        title: 'Enterprise AI decision draft',
        question: args.question,
        rationale: 'Human approval required; KPI ledgers unchanged. Outcome not yet measured.',
        recommendedOptionId: optionId,
        options: [
          {
            id: optionId,
            label: optionId,
            increasesStaffingCost: /staff|hire|uplift|reallocate-nurses/i.test(optionId),
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

/** Detect multi-turn follow-ups that adjust period / evidence / approval without re-deriving topic. */
export function applyFollowUp(
  question: string,
  prior?: Partial<InvestigationState>,
): { question: string; period?: ReportPeriod; expandEvidence?: boolean; pendingApprovalConfirm?: boolean; inheritFocus?: boolean } {
  const q = question.trim();
  if (/what about last quarter|previous quarter|prior quarter/i.test(q) && prior) {
    return { question: prior.subject ?? q, period: 'Q4', inheritFocus: true };
  }
  if (/show evidence|expand evidence|supporting evidence/i.test(q)) {
    return { question: prior?.subject ?? q, expandEvidence: true, inheritFocus: true };
  }
  if (/^(approve|please approve|approve this)$/i.test(q)) {
    return { question: prior?.subject ?? q, pendingApprovalConfirm: true, inheritFocus: true };
  }
  return { question: q };
}

export function orchestrate(req: OrchestrateRequest): GroundedAnswer {
  const follow = applyFollowUp(req.question, req.priorState);
  const period = follow.period ?? req.period ?? req.priorState?.period ?? 'year';
  const mode = resolveActiveMode();
  const intent = classifyIntent(follow.question);
  const noStaff = req.noAdditionalStaffingCost ?? req.priorState?.constraints?.noAdditionalStaffingCost ?? true;

  if (intent.refused) {
    const executive = buildExecutiveResponse({
      question: req.question,
      hospital: req.hospital,
      year: req.year,
      period,
      focus: resolveFocusFromQuestion(req.question),
      investigation: null,
      risks: [],
      scenario: selectScenarioFromQuestion(req.question),
      optimization: null,
      citations: [],
      flagship: false,
      refused: true,
      refuseReason: intent.refuseReason,
    });
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
      executive,
      focusMetricId: null,
      focusLabel: 'Refused',
      scenarioId: null,
    };
  }

  const flagship = isFlagshipQuestion(follow.question);
  let focus = resolveFocusFromQuestion(follow.question);
  if (follow.inheritFocus && req.priorState?.focusMetricId) {
    focus = {
      ...focus,
      focusMetricId: req.priorState.focusMetricId,
      label: req.priorState.focusLabel ?? focus.label,
      mode: 'topic',
      note: 'Focus inherited from prior investigation turn.',
    };
  }

  const risks = rankHospitalRisks({ hospital: req.hospital, year: req.year, period, limit: 10 });
  // Hospital-wide / ambiguous: use top risk metric as investigation anchor (labeled), never silent ED.
  let focusMetricId = focus.focusMetricId;
  if (!focusMetricId && (focus.mode === 'hospital_wide_risk' || focus.mode === 'flagship_multi')) {
    focusMetricId = risks.risks[0]?.metricId ?? 'beds.occupancy';
  }

  const scenario = selectScenarioFromQuestion(follow.question);
  const optionIds = interventionCandidatesForQuestion(follow.question, noStaff);
  const maxTools = req.maxTools ?? (flagship ? 24 : 12);
  const plan = planForIntent({
    intentPrimary: intent.primary,
    secondary: intent.secondary,
    hospital: req.hospital,
    year: req.year,
    period,
    flagship,
    focusMetricId,
    scenarioId: scenario.available ? scenario.scenarioId : null,
    scenarioDomain: scenario.domain,
    scenarioAmount: scenario.amount,
    optionIds,
    noStaff,
    question: follow.question,
  }).slice(0, maxTools);

  const toolResults: ToolExecutionRecord[] = [];
  const citations: ToolResultCitation[] = [];
  const steps: string[] = [
    `Analysis Mode: ${mode.label}`,
    `Intent: ${intent.primary}`,
    `Focus: ${focus.label}${focusMetricId ? ` (${focusMetricId})` : ''}`,
  ];
  if (scenario.available && scenario.scenarioId) {
    steps.push(`Scenario: ${scenario.scenarioId}`);
  } else if (/what[- ]?if|intervention|scenario|simulat/i.test(follow.question) && !scenario.available) {
    steps.push('Scenario unavailable with the current evidence and model.');
  }

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
        citations.push(cite(result, `What-if ${String(result.output.id ?? result.output.kind ?? scenario.scenarioId)} (illustrative)`));
      } else {
        citations.push(cite(result, step.label));
      }
    }
  }

  const investigation = focus.mode === 'clarification' && !focusMetricId
    ? null
    : runInvestigation({
      hospital: req.hospital,
      year: req.year,
      period,
      focusMetricId: focusMetricId ?? 'beds.occupancy',
      additionalMetricIds: focus.additionalMetricIds
        ?? (flagship
          ? ['beds.occupancy', 'icu.staffing_gap_hours', 'rcm.net_patient_revenue', 'sc.critical_stockouts', 'surg.or_utilization', 'px.overall_satisfaction']
          : undefined),
    });
  if (investigation) {
    steps.push(`Investigation domains: ${investigation.domainsTouched.join(', ')}`);
  }

  const shouldOptimize = flagship
    || intent.primary === 'what_if'
    || intent.primary === 'resource_allocation'
    || intent.primary === 'decision_prep'
    || intent.secondary.includes('what_if');

  const optimization = shouldOptimize
    ? runOptimization({
      hospital: req.hospital,
      year: req.year,
      period,
      decisionVariables: optionIds.length
        ? optionIds
        : ['ent-bed-assign-flow', 'st-supply-efficiency', 'st-reduce-overtime', 'ent-staffing-uplift'],
      objective: 'strongest_operational_improvement',
      noAdditionalStaffingCost: noStaff,
    })
    : null;

  if (optimization) {
    steps.push(
      optimization.feasible
        ? `Preferred option: ${optimization.selected} (feasible under constraints)`
        : `Optimization infeasible: ${optimization.infeasibleReason}`,
    );
  }

  const decisionResult = toolResults.find((r) => r.toolId === 'create_decision_proposal' && r.ok);
  const decisionProposalId = decisionResult && typeof decisionResult.output.decisionId === 'string'
    ? decisionResult.output.decisionId
    : req.priorState?.decisionProposalId;

  const executive = buildExecutiveResponse({
    question: follow.question,
    hospital: req.hospital,
    year: req.year,
    period,
    focus,
    investigation,
    risks: risks.risks,
    scenario,
    optimization,
    citations,
    flagship,
    noAdditionalStaffingCost: noStaff,
  });

  if (follow.pendingApprovalConfirm) {
    executive.G_followUpMeasurement =
      'Approval requested — open the human confirmation panel to Approve, Reject, or Defer. No silent approval.';
  }

  const investigationState: InvestigationState = {
    subject: follow.question,
    focusMetricId: focusMetricId,
    focusLabel: focus.label,
    hospital: req.hospital,
    year: req.year,
    period,
    constraints: { noAdditionalStaffingCost: noStaff },
    candidates: optionIds,
    selectedOptionId: optimization?.selected ?? scenario.scenarioId,
    evidenceRefs: citations.map((c) => c.toolResultId),
    scenarioId: scenario.scenarioId,
    decisionProposalId,
    pendingApprovalConfirm: follow.pendingApprovalConfirm === true,
  };

  const summary = [
    executive.A_executiveSummary,
    executive.modeDisclosure,
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
    investigationId: investigation?.id,
    decisionProposalId,
    flagship,
    focusMetricId,
    focusLabel: focus.label,
    scenarioId: scenario.scenarioId,
    executive,
    investigationState,
    risks: risks.risks.map((r) => ({
      id: r.id,
      title: r.title,
      severity: r.severity,
      metricId: r.metricId,
      evidence: r.evidence,
    })),
  };
}

export const FLAGSHIP_QUESTION =
  'Why is hospital performance deteriorating, and which intervention would deliver the strongest operational improvement without increasing staffing costs?';
