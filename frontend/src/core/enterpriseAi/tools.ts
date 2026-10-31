/**
 * Typed tool registry for Domain 16 Enterprise AI.
 * Every execute() calls existing views / registry / what-if — NEVER invents numbers.
 */
import { z } from 'zod';
import type { ReportPeriod } from '../period';
import { alertsFor } from '../alerts';
import { buildEnterpriseView } from '../enterpriseView';
import { buildStView, ST_OPPORTUNITY_IDS, type StOpportunityId } from '../strategyView';
import { enterpriseWhatIf, runWhatIf, type DomainName } from '@/showcase/whatIf';
import { edgesFrom, listKnowledgeEdges } from './knowledgeGraph';
import {
  getMetric,
  listMetrics,
  metricsByDomain,
  requireMetric,
  resolveMetric,
} from './metricRegistry';
import { runStage1ReconciliationGate } from './reconciliation';
import type { MetricSourceContext, ToolExecutionRecord } from './types';
import { createDecisionProposal, getDecision, listDecisions } from './decisions';
import { getOutcome } from './outcomes';
import { compareInterventions, getScenarioBaseline, runSimulation } from './simulation';
import { runForecast } from './forecast';
import { NO_STAFFING_COST_OPTIONS, STAFFING_COST_OPTIONS } from './toolsMeta';

export { NO_STAFFING_COST_OPTIONS, STAFFING_COST_OPTIONS };

const CtxSchema = z.object({
  hospital: z.string().min(1),
  year: z.number().int(),
  period: z.enum(['year', 'Q1', 'Q2', 'Q3', 'Q4']).default('year'),
});

function ctxFrom(input: { hospital: string; year: number; period?: ReportPeriod | 'year' | 'Q1' | 'Q2' | 'Q3' | 'Q4' }): MetricSourceContext {
  return { hospital: input.hospital, year: input.year, period: (input.period ?? 'year') as ReportPeriod };
}

function periodLabel(period: ReportPeriod): string {
  return period === 'year' ? 'Full year' : period;
}

let toolSeq = 0;
function nextResultId(toolId: string): string {
  toolSeq += 1;
  return `${toolId}#${toolSeq}`;
}

/** Reset tool result id sequence (tests). */
export function resetToolSeq(): void {
  toolSeq = 0;
}

export type EnterpriseAiToolId =
  | 'get_metric'
  | 'get_metric_definition'
  | 'get_metric_trend'
  | 'compare_periods'
  | 'compare_hospitals'
  | 'retrieve_domain_evidence'
  | 'retrieve_cross_domain_evidence'
  | 'check_reconciliation'
  | 'find_related_alerts'
  | 'inspect_data_quality'
  | 'get_scenario_baseline'
  | 'run_what_if'
  | 'compare_interventions'
  | 'get_forecast'
  | 'create_decision_proposal'
  | 'get_decision_status';

export type ToolDef = {
  id: EnterpriseAiToolId;
  description: string;
  inputSchema: z.ZodTypeAny;
  execute: (input: Record<string, unknown>) => ToolExecutionRecord;
};

function ok(toolId: EnterpriseAiToolId, input: Record<string, unknown>, output: Record<string, unknown>): ToolExecutionRecord {
  return { id: nextResultId(toolId), toolId, ok: true, input, output };
}

function fail(toolId: EnterpriseAiToolId, input: Record<string, unknown>, error: string): ToolExecutionRecord {
  return { id: nextResultId(toolId), toolId, ok: false, input, output: {}, error };
}

function parse<T>(schema: z.ZodType<T>, input: Record<string, unknown>): { data?: T; error?: string } {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join('; ') };
  return { data: parsed.data };
}

const GetMetricInput = CtxSchema.extend({ metricId: z.string().min(1) });
const GetDefInput = z.object({ metricId: z.string().min(1) });
const TrendInput = CtxSchema.extend({ metricId: z.string().min(1) });
const ComparePeriodsInput = z.object({
  hospital: z.string().min(1),
  metricId: z.string().min(1),
  yearA: z.number().int(),
  yearB: z.number().int(),
  period: z.enum(['year', 'Q1', 'Q2', 'Q3', 'Q4']).default('year'),
});
const CompareHospitalsInput = z.object({
  metricId: z.string().min(1),
  year: z.number().int(),
  period: z.enum(['year', 'Q1', 'Q2', 'Q3', 'Q4']).default('year'),
  hospitals: z.array(z.string()).min(2),
});
const DomainEvidenceInput = CtxSchema.extend({
  domain: z.string().min(1),
  limit: z.number().int().min(1).max(20).default(8),
});
const CrossDomainInput = CtxSchema.extend({
  metricId: z.string().min(1),
});
const ReconcileInput = CtxSchema;
const AlertsInput = CtxSchema.extend({
  department: z.string().optional(),
});
const DqInput = CtxSchema.extend({ metricId: z.string().optional() });
const BaselineInput = CtxSchema.extend({ opportunityId: z.string().optional() });
const WhatIfInput = CtxSchema.extend({
  domain: z.string().min(1),
  kind: z.string().optional(),
  amount: z.number().optional(),
});
const CompareIntInput = CtxSchema.extend({
  optionIds: z.array(z.string()).min(2),
  noAdditionalStaffingCost: z.boolean().default(true),
});
const ForecastInput = CtxSchema.extend({
  seriesId: z.enum(['beds.occupancy', 'ed.wait.median_min', 'ed.arrivals']).default('beds.occupancy'),
});
const CreateDecisionInput = z.object({
  title: z.string().min(1),
  question: z.string().min(1),
  rationale: z.string().min(1),
  options: z.array(z.object({
    id: z.string(),
    label: z.string(),
    increasesStaffingCost: z.boolean(),
    expectedBenefitNote: z.string(),
    simulationIds: z.array(z.string()).default([]),
  })).min(1),
  recommendedOptionId: z.string().nullable().optional(),
});
const DecisionStatusInput = z.object({
  decisionId: z.string().optional(),
});

export const TOOLS: ToolDef[] = [
  {
    id: 'get_metric',
    description: 'Resolve one registry metric value from existing domain builders.',
    inputSchema: GetMetricInput,
    execute(input) {
      const parsed = parse(GetMetricInput, input);
      if (parsed.error || !parsed.data) return fail('get_metric', input, parsed.error ?? 'invalid');
      const def = getMetric(parsed.data.metricId);
      if (!def) return fail('get_metric', input, `Unknown metric: ${parsed.data.metricId}`);
      const ctx = ctxFrom(parsed.data);
      const value = resolveMetric(parsed.data.metricId, ctx);
      return ok('get_metric', input, {
        metricId: def.id,
        name: def.name,
        value,
        unit: def.unit,
        owningDomain: def.owningDomain,
        hospital: ctx.hospital,
        year: ctx.year,
        period: ctx.period,
        periodLabel: periodLabel(ctx.period),
        dataReadiness: def.dataReadiness,
      });
    },
  },
  {
    id: 'get_metric_definition',
    description: 'Return semantic definition for a registry metric.',
    inputSchema: GetDefInput,
    execute(input) {
      const parsed = parse(GetDefInput, input);
      if (parsed.error || !parsed.data) return fail('get_metric_definition', input, parsed.error ?? 'invalid');
      try {
        const def = requireMetric(parsed.data.metricId);
        return ok('get_metric_definition', input, {
          id: def.id,
          name: def.name,
          owningDomain: def.owningDomain,
          description: def.description,
          grain: def.grain,
          numerator: def.numerator,
          denominator: def.denominator,
          unit: def.unit,
          periodSemantics: def.periodSemantics,
          dataReadiness: def.dataReadiness,
          qualityNotes: def.qualityNotes,
          permittedComparisons: def.permittedComparisons,
        });
      } catch (err) {
        return fail('get_metric_definition', input, err instanceof Error ? err.message : String(err));
      }
    },
  },
  {
    id: 'get_metric_trend',
    description: 'Compare metric for current year vs prior year (same hospital/period).',
    inputSchema: TrendInput,
    execute(input) {
      const parsed = parse(TrendInput, input);
      if (parsed.error || !parsed.data) return fail('get_metric_trend', input, parsed.error ?? 'invalid');
      if (!getMetric(parsed.data.metricId)) return fail('get_metric_trend', input, `Unknown metric: ${parsed.data.metricId}`);
      const current = resolveMetric(parsed.data.metricId, ctxFrom(parsed.data));
      const priorYear = Math.max(2024, parsed.data.year - 1);
      const prior = resolveMetric(parsed.data.metricId, {
        hospital: parsed.data.hospital,
        year: priorYear,
        period: parsed.data.period as ReportPeriod,
      });
      const delta =
        current == null || prior == null || prior === 0
          ? null
          : (current - prior) / Math.abs(prior);
      return ok('get_metric_trend', input, {
        metricId: parsed.data.metricId,
        currentYear: parsed.data.year,
        priorYear,
        current,
        prior,
        relativeDelta: delta,
        note: 'Trend uses the same registry sourceFn for both years — no invented series.',
      });
    },
  },
  {
    id: 'compare_periods',
    description: 'Compare a metric across two years.',
    inputSchema: ComparePeriodsInput,
    execute(input) {
      const parsed = parse(ComparePeriodsInput, input);
      if (parsed.error || !parsed.data) return fail('compare_periods', input, parsed.error ?? 'invalid');
      if (!getMetric(parsed.data.metricId)) return fail('compare_periods', input, `Unknown metric: ${parsed.data.metricId}`);
      const period = parsed.data.period as ReportPeriod;
      const a = resolveMetric(parsed.data.metricId, { hospital: parsed.data.hospital, year: parsed.data.yearA, period });
      const b = resolveMetric(parsed.data.metricId, { hospital: parsed.data.hospital, year: parsed.data.yearB, period });
      return ok('compare_periods', input, {
        metricId: parsed.data.metricId,
        yearA: parsed.data.yearA,
        yearB: parsed.data.yearB,
        valueA: a,
        valueB: b,
        delta: a == null || b == null ? null : b - a,
      });
    },
  },
  {
    id: 'compare_hospitals',
    description: 'Compare a metric across hospitals for the same year/period.',
    inputSchema: CompareHospitalsInput,
    execute(input) {
      const parsed = parse(CompareHospitalsInput, input);
      if (parsed.error || !parsed.data) return fail('compare_hospitals', input, parsed.error ?? 'invalid');
      if (!getMetric(parsed.data.metricId)) return fail('compare_hospitals', input, `Unknown metric: ${parsed.data.metricId}`);
      const period = parsed.data.period as ReportPeriod;
      const rows = parsed.data.hospitals.map((hospital) => ({
        hospital,
        value: resolveMetric(parsed.data!.metricId, { hospital, year: parsed.data!.year, period }),
      }));
      return ok('compare_hospitals', input, { metricId: parsed.data.metricId, year: parsed.data.year, period, rows });
    },
  },
  {
    id: 'retrieve_domain_evidence',
    description: 'List metrics and values for one owning domain.',
    inputSchema: DomainEvidenceInput,
    execute(input) {
      const parsed = parse(DomainEvidenceInput, input);
      if (parsed.error || !parsed.data) return fail('retrieve_domain_evidence', input, parsed.error ?? 'invalid');
      const ctx = ctxFrom(parsed.data);
      const domainMetrics = metricsByDomain(parsed.data.domain as never);
      const fallback = listMetrics().filter((m) => m.owningDomain.toLowerCase().includes(parsed.data!.domain.toLowerCase()));
      const list = (domainMetrics.length ? domainMetrics : fallback).slice(0, parsed.data.limit);
      const items = list.map((m) => ({
        metricId: m.id,
        name: m.name,
        value: resolveMetric(m.id, ctx),
        unit: m.unit,
        owningDomain: m.owningDomain,
      }));
      return ok('retrieve_domain_evidence', input, {
        domain: parsed.data.domain,
        count: items.length,
        items,
        hospital: ctx.hospital,
        year: ctx.year,
        period: ctx.period,
      });
    },
  },
  {
    id: 'retrieve_cross_domain_evidence',
    description: 'Follow knowledge-graph edges from a focus metric.',
    inputSchema: CrossDomainInput,
    execute(input) {
      const parsed = parse(CrossDomainInput, input);
      if (parsed.error || !parsed.data) return fail('retrieve_cross_domain_evidence', input, parsed.error ?? 'invalid');
      const ctx = ctxFrom(parsed.data);
      const edges = edgesFrom(parsed.data.metricId);
      const hops = edges.map((edge) => {
        const other = edge.from === parsed.data!.metricId ? edge.to : edge.from;
        return {
          edgeId: edge.id,
          relatedMetricId: other,
          relatedValue: resolveMetric(other, ctx),
          focusValue: resolveMetric(parsed.data!.metricId, ctx),
          causalClaim: edge.causalClaim,
          interpretation: edge.interpretation,
          confounders: edge.confounders,
          evidence: edge.evidence,
        };
      });
      return ok('retrieve_cross_domain_evidence', input, {
        metricId: parsed.data.metricId,
        edgeCount: hops.length,
        hops,
        graphSize: listKnowledgeEdges().length,
      });
    },
  },
  {
    id: 'check_reconciliation',
    description: 'Run Stage 1 reconciliation gate against existing domain views.',
    inputSchema: ReconcileInput,
    execute(input) {
      const parsed = parse(ReconcileInput, input);
      if (parsed.error || !parsed.data) return fail('check_reconciliation', input, parsed.error ?? 'invalid');
      const gate = runStage1ReconciliationGate({
        hospital: parsed.data.hospital,
        year: parsed.data.year,
        period: parsed.data.period as ReportPeriod,
      });
      return ok('check_reconciliation', input, {
        ok: gate.ok,
        checks: gate.checks,
      });
    },
  },
  {
    id: 'find_related_alerts',
    description: 'List open-ish alerts from the existing alert catalog for the scope.',
    inputSchema: AlertsInput,
    execute(input) {
      const parsed = parse(AlertsInput, input);
      if (parsed.error || !parsed.data) return fail('find_related_alerts', input, parsed.error ?? 'invalid');
      const all = alertsFor(parsed.data.hospital, parsed.data.year, parsed.data.period as ReportPeriod);
      const dept = parsed.data.department;
      const filtered = dept
        ? all.filter((a) => a.department.toLowerCase().includes(dept.toLowerCase()) || dept === 'Enterprise')
        : all;
      const top = filtered.slice(0, 12).map((a) => ({
        id: a.id,
        title: a.title,
        severity: a.severity,
        department: a.department,
        kpi: a.kpi,
      }));
      return ok('find_related_alerts', input, { count: top.length, alerts: top });
    },
  },
  {
    id: 'inspect_data_quality',
    description: 'Inspect readiness notes and reconciliation for metrics.',
    inputSchema: DqInput,
    execute(input) {
      const parsed = parse(DqInput, input);
      if (parsed.error || !parsed.data) return fail('inspect_data_quality', input, parsed.error ?? 'invalid');
      const ctx = ctxFrom(parsed.data);
      const gate = runStage1ReconciliationGate({
        hospital: ctx.hospital,
        year: ctx.year,
        period: ctx.period,
      });
      const metrics = parsed.data.metricId
        ? [requireMetric(parsed.data.metricId)]
        : listMetrics().filter((m) => m.dataReadiness === 'Scenario Only' || m.qualityNotes.length > 0).slice(0, 10);
      return ok('inspect_data_quality', input, {
        reconciliationOk: gate.ok,
        checks: gate.checks.map((c) => ({ ok: c.ok, note: c.note, left: c.left.id, right: c.right.id })),
        notes: metrics.map((m) => ({
          metricId: m.id,
          dataReadiness: m.dataReadiness,
          qualityNotes: m.qualityNotes,
        })),
        disclaimer: 'DQ inspection cites registry notes and gate results — does not invent missing source systems.',
      });
    },
  },
  {
    id: 'get_scenario_baseline',
    description: 'Return strategy opportunity baseline or enterprise what-if baseline facts.',
    inputSchema: BaselineInput,
    execute(input) {
      const parsed = parse(BaselineInput, input);
      if (parsed.error || !parsed.data) return fail('get_scenario_baseline', input, parsed.error ?? 'invalid');
      const baseline = getScenarioBaseline({
        hospital: parsed.data.hospital,
        year: parsed.data.year,
        period: parsed.data.period as ReportPeriod,
        opportunityId: parsed.data.opportunityId,
      });
      return ok('get_scenario_baseline', input, baseline);
    },
  },
  {
    id: 'run_what_if',
    description: 'Run an existing domain what-if engine (illustrative).',
    inputSchema: WhatIfInput,
    execute(input) {
      const parsed = parse(WhatIfInput, input);
      if (parsed.error || !parsed.data) return fail('run_what_if', input, parsed.error ?? 'invalid');
      const period = parsed.data.period as ReportPeriod;
      const amount = parsed.data.amount ?? 0.2;
      const domain = parsed.data.domain as DomainName;
      const kind = parsed.data.kind;
      const result = domain === 'Enterprise'
        ? enterpriseWhatIf(parsed.data.hospital, parsed.data.year, period, { kind: kind ?? 'ent-ed-congestion', amount })
        : runWhatIf(domain, parsed.data.hospital, parsed.data.year, kind ? { kind, amount } : null, period);
      const sim = runSimulation({
        hospital: parsed.data.hospital,
        year: parsed.data.year,
        period,
        domain,
        kind: result.id,
        amount,
      });
      return ok('run_what_if', input, {
        ...result,
        simulationId: sim.id,
        illustrative: true,
        note: result.assumptions,
      });
    },
  },
  {
    id: 'compare_interventions',
    description: 'Compare ≥2 interventions with overlap rejection and staffing-cost constraint.',
    inputSchema: CompareIntInput,
    execute(input) {
      const parsed = parse(CompareIntInput, input);
      if (parsed.error || !parsed.data) return fail('compare_interventions', input, parsed.error ?? 'invalid');
      const comparison = compareInterventions({
        hospital: parsed.data.hospital,
        year: parsed.data.year,
        period: parsed.data.period as ReportPeriod,
        optionIds: parsed.data.optionIds,
        noAdditionalStaffingCost: parsed.data.noAdditionalStaffingCost,
      });
      return ok('compare_interventions', input, comparison as unknown as Record<string, unknown>);
    },
  },
  {
    id: 'get_forecast',
    description: 'Seasonal naive / moving-average forecast on available monthly series.',
    inputSchema: ForecastInput,
    execute(input) {
      const parsed = parse(ForecastInput, input);
      if (parsed.error || !parsed.data) return fail('get_forecast', input, parsed.error ?? 'invalid');
      const forecast = runForecast({
        hospital: parsed.data.hospital,
        year: parsed.data.year,
        seriesId: parsed.data.seriesId ?? 'beds.occupancy',
      });
      return ok('get_forecast', input, forecast as unknown as Record<string, unknown>);
    },
  },
  {
    id: 'create_decision_proposal',
    description: 'Create a demo decision proposal (session/local storage — does not mutate KPIs).',
    inputSchema: CreateDecisionInput,
    execute(input) {
      const parsed = parse(CreateDecisionInput, input);
      if (parsed.error || !parsed.data) return fail('create_decision_proposal', input, parsed.error ?? 'invalid');
      const proposal = createDecisionProposal({
        title: parsed.data.title,
        question: parsed.data.question,
        rationale: parsed.data.rationale,
        options: parsed.data.options.map((option) => ({
          ...option,
          simulationIds: option.simulationIds ?? [],
        })),
        recommendedOptionId: parsed.data.recommendedOptionId ?? parsed.data.options[0]?.id ?? null,
      });
      return ok('create_decision_proposal', input, {
        decisionId: proposal.id,
        status: proposal.status,
        storageLabel: proposal.storageLabel,
        recommendedOptionId: proposal.recommendedOptionId,
        note: 'Approval MUST NOT mutate historical KPI facts (e.g. RCM NPR).',
      });
    },
  },
  {
    id: 'get_decision_status',
    description: 'Read decision lifecycle status and outcome tracking.',
    inputSchema: DecisionStatusInput,
    execute(input) {
      const parsed = parse(DecisionStatusInput, input);
      if (parsed.error || !parsed.data) return fail('get_decision_status', input, parsed.error ?? 'invalid');
      if (parsed.data.decisionId) {
        const decision = getDecision(parsed.data.decisionId);
        if (!decision) return fail('get_decision_status', input, `Unknown decision: ${parsed.data.decisionId}`);
        const outcome = decision.outcomeId ? getOutcome(decision.outcomeId) : null;
        return ok('get_decision_status', input, { decision, outcome });
      }
      return ok('get_decision_status', input, { decisions: listDecisions() });
    },
  },
];

const BY_ID = new Map(TOOLS.map((t) => [t.id, t]));

export function getTool(id: EnterpriseAiToolId): ToolDef | undefined {
  return BY_ID.get(id);
}

export function listTools(): readonly ToolDef[] {
  return TOOLS;
}

export function executeTool(id: EnterpriseAiToolId, input: Record<string, unknown>): ToolExecutionRecord {
  const tool = BY_ID.get(id);
  if (!tool) {
    return fail(id, input, `Unknown tool: ${id}`);
  }
  return tool.execute(input);
}

export function listStrategyOpportunityIds(): readonly StOpportunityId[] {
  return ST_OPPORTUNITY_IDS;
}

export function enterpriseBaselineFacts(hospital: string, year: number, period: ReportPeriod) {
  const ent = buildEnterpriseView(hospital, year, period);
  const st = buildStView(hospital, year, period);
  return {
    edWaitMedianMin: ent.facts.edWaitMedianMin,
    occupancy: ent.facts.occupancy,
    icuStaffingGapHours: ent.facts.icuStaffingGapHours,
    enterpriseStaffingGapHours: ent.facts.enterpriseStaffingGapHours,
    netPatientRevenue: ent.facts.netPatientRevenue,
    operatingContribution: ent.facts.operatingContribution,
    criticalStockouts: ent.facts.criticalStockouts,
    opportunities: st.opportunities.map((o) => ({
      id: o.id,
      title: o.title,
      baseline: o.baseline,
      eligibleValue: o.eligibleValue,
      additive: o.additive,
      assumption: o.assumption,
    })),
  };
}
