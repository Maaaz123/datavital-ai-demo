/**
 * Domain 16 — Enterprise AI foundation types.
 * Semantic registry + knowledge graph + reconciliation gate.
 * All numeric values must come from existing domain builders — never a second ledger.
 */
import type { ReportPeriod } from '../period';

export type DataReadiness = 'Demo Available' | 'Scenario Only';

export type OwningDomain =
  | 'Emergency'
  | 'Beds'
  | 'ICU'
  | 'Inpatient'
  | 'OPD'
  | 'Appointments'
  | 'Surgery'
  | 'Laboratory'
  | 'Radiology'
  | 'Pharmacy'
  | 'Revenue Cycle'
  | 'Strategy'
  | 'Supply Chain'
  | 'Quality & Safety'
  | 'Patient Experience'
  | 'Enterprise';

export type MetricAggregation = 'sum' | 'ratio' | 'weighted-mean' | 'snapshot' | 'quantile' | 'derived';

export type PeriodSemantics =
  | 'period-flow'
  | 'period-end-stock'
  | 'period-average-stock'
  | 'period-rate'
  | 'period-density';

export type MetricSourceContext = {
  hospital: string;
  year: number;
  period: ReportPeriod;
};

export type MetricDefinition = {
  id: string;
  name: string;
  owningDomain: OwningDomain;
  description: string;
  grain: string;
  numerator: string;
  denominator: string;
  aggregation: MetricAggregation;
  unit: string;
  periodSemantics: PeriodSemantics;
  /** Resolves the metric from an existing build*View / enterprise reader — no independent ledger. */
  sourceFn: (ctx: MetricSourceContext) => number | null;
  dataReadiness: DataReadiness;
  qualityNotes: string;
  permittedComparisons: string[];
};

export type CausalClaim = 'associative' | 'operational-link';

export type KnowledgeEdge = {
  id: string;
  from: string;
  to: string;
  direction: '→' | '↔';
  scope: string;
  evidence: string;
  join: string;
  interpretation: string;
  confounders: string[];
  /** Never claim patient-level clinical causality. */
  causalClaim: CausalClaim;
};

export type ReconciliationResult = {
  ok: boolean;
  left: { id: string; value: number | null; label: string };
  right: { id: string; value: number | null; label: string };
  note: string;
  delta?: number | null;
};
