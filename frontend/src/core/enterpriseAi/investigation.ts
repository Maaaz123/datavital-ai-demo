/**
 * Stage 3 — Structured RCA workflow.
 * observe → baseline → related metrics via knowledgeGraph → DQ check → candidate drivers.
 * Never assert definitive root cause from correlation alone.
 */
import type { ReportPeriod } from '../period';
import { edgesFrom, getKnowledgeEdge } from './knowledgeGraph';
import { getMetric, resolveMetric } from './metricRegistry';
import { runStage1ReconciliationGate } from './reconciliation';
import type {
  DriverStatus,
  InvestigationDriver,
  InvestigationReport,
  MetricSourceContext,
  OwningDomain,
} from './types';

export type InvestigationRequest = {
  hospital: string;
  year: number;
  period?: ReportPeriod;
  focusMetricId?: string;
  /** Prefer observing multiple domains for flagship investigations. */
  additionalMetricIds?: string[];
};

function statusForDriver(
  focusValue: number | null,
  relatedValue: number | null,
  causalClaim: 'associative' | 'operational-link',
): DriverStatus {
  if (focusValue == null || relatedValue == null) return 'insufficient_evidence';
  // Directional co-movement is weak evidence only.
  if (causalClaim === 'operational-link' && Number.isFinite(focusValue) && Number.isFinite(relatedValue)) {
    return 'partially_supported';
  }
  if (causalClaim === 'associative') {
    return 'partially_supported';
  }
  return 'insufficient_evidence';
}

/**
 * Run structured investigation. Statuses never claim definitive root cause from correlation alone.
 */
export function runInvestigation(req: InvestigationRequest): InvestigationReport {
  const period = req.period ?? 'year';
  const ctx: MetricSourceContext = { hospital: req.hospital, year: req.year, period };
  // Callers must pass an explicit focus. Fallback is labeled capacity occupancy — never a silent ED default for unrelated topics.
  const focusMetricId = req.focusMetricId ?? 'beds.occupancy';
  const focus = getMetric(focusMetricId);
  const observedValue = resolveMetric(focusMetricId, ctx);
  const baselineValue = resolveMetric(focusMetricId, {
    ...ctx,
    year: Math.max(2024, req.year - 1),
  });

  const relatedEdges = edgesFrom(focusMetricId);
  const extraIds = req.additionalMetricIds ?? [
    'beds.occupancy',
    'icu.staffing_gap_hours',
    'rcm.net_patient_revenue',
    'sc.critical_stockouts',
    'px.overall_satisfaction',
    'qs.overdue_high_risk_actions',
  ];

  const drivers: InvestigationDriver[] = relatedEdges.map((edge) => {
    const relatedMetricId = edge.from === focusMetricId ? edge.to : edge.from;
    const relatedValue = resolveMetric(relatedMetricId, ctx);
    const status = statusForDriver(observedValue, relatedValue, edge.causalClaim);
    return {
      metricId: focusMetricId,
      relatedMetricId,
      edgeId: edge.id,
      status,
      evidence: edge.evidence,
      causalClaim: edge.causalClaim,
      confounders: edge.confounders,
    };
  });

  // Add cross-domain observations that may lack a direct edge — mark insufficient if no edge.
  for (const metricId of extraIds) {
    if (metricId === focusMetricId) continue;
    if (drivers.some((d) => d.relatedMetricId === metricId)) continue;
    const edge = relatedEdges.find((e) => e.from === metricId || e.to === metricId)
      ?? getKnowledgeEdge(`${focusMetricId}->${metricId}`);
    const relatedValue = resolveMetric(metricId, ctx);
    if (relatedValue == null && !getMetric(metricId)) continue;
    drivers.push({
      metricId: focusMetricId,
      relatedMetricId: metricId,
      edgeId: edge?.id ?? 'no-edge',
      status: edge ? statusForDriver(observedValue, relatedValue, edge.causalClaim) : 'insufficient_evidence',
      evidence: edge?.evidence ?? 'No knowledge-graph edge — co-observation only; not a causal claim.',
      causalClaim: edge?.causalClaim ?? 'associative',
      confounders: edge?.confounders ?? ['missing join', 'selection bias'],
    });
  }

  // Explicit non-causality: never emit a "supported" definitive root cause from correlation alone.
  for (const driver of drivers) {
    if (driver.status === 'supported') {
      driver.status = 'partially_supported';
      driver.evidence = `${driver.evidence} (downgraded: correlation/operational link ≠ definitive root cause)`;
    }
  }

  const gate = runStage1ReconciliationGate({ hospital: req.hospital, year: req.year, period });
  const dataQualityNotes = [
    ...gate.checks.map((c) => `${c.ok ? 'OK' : 'FAIL'}: ${c.note}`),
    focus?.qualityNotes ?? 'Focus metric quality notes unavailable.',
    'Investigation never asserts a single definitive root cause from associative links alone.',
  ];

  const domains = new Set<OwningDomain>();
  if (focus) domains.add(focus.owningDomain);
  for (const driver of drivers) {
    const m = getMetric(driver.relatedMetricId);
    if (m) domains.add(m.owningDomain);
  }

  return {
    id: `inv:${focusMetricId}:${req.hospital}:${req.year}:${period}`,
    focusMetricId,
    observedValue,
    baselineValue,
    relatedMetrics: drivers.map((d) => d.relatedMetricId),
    dataQualityNotes,
    drivers,
    domainsTouched: [...domains],
    reconciliationOk: gate.ok,
    disclaimer:
      'Driver statuses are supported | partially_supported | contradicted | insufficient_evidence. Operational links and associations are not definitive root causes. No patient-level clinical causality.',
  };
}

/** Helper for tests: force a contradicted example when related metric moves opposite to an expected operational story. */
export function evaluateContradiction(
  expectedDirection: 'co-move' | 'inverse',
  focusDelta: number,
  relatedDelta: number,
): DriverStatus {
  if (!Number.isFinite(focusDelta) || !Number.isFinite(relatedDelta)) return 'insufficient_evidence';
  const sameSign = focusDelta * relatedDelta > 0;
  if (expectedDirection === 'co-move') return sameSign ? 'partially_supported' : 'contradicted';
  return sameSign ? 'contradicted' : 'partially_supported';
}
