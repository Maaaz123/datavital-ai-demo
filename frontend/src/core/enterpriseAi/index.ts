/** Domain 16 — Enterprise AI foundation (Stage 1). */
export type {
  CausalClaim,
  DataReadiness,
  KnowledgeEdge,
  MetricAggregation,
  MetricDefinition,
  MetricSourceContext,
  OwningDomain,
  PeriodSemantics,
  ReconciliationResult,
} from './types';

export {
  getMetric,
  listMetrics,
  listOwningDomains,
  metricsByDomain,
  requireMetric,
  resolveMetric,
} from './metricRegistry';

export {
  assertNoPatientCausality,
  edgesFrom,
  edgesTo,
  getKnowledgeEdge,
  listKnowledgeEdges,
} from './knowledgeGraph';

export {
  reconcileIcuStrategyGap,
  reconcileRcmStrategyRevenue,
  reconcileScAvailabilityBounds,
  runStage1ReconciliationGate,
  type ReconcileContext,
} from './reconciliation';
