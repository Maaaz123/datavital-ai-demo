/**
 * Domain 16 — Enterprise AI foundation types.
 * Semantic registry + knowledge graph + reconciliation gate + Stages 2–6 contracts.
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

/** Stage 2 — structured intents (deterministic classifier). */
export type EnterpriseAiIntent =
  | 'kpi_explanation'
  | 'comparison'
  | 'trend'
  | 'root_cause'
  | 'cross_domain'
  | 'risk'
  | 'resource_allocation'
  | 'financial'
  | 'what_if'
  | 'decision_prep'
  | 'follow_up_status'
  | 'data_quality';

export type IntentClassification = {
  primary: EnterpriseAiIntent;
  secondary: EnterpriseAiIntent[];
  scores: Record<EnterpriseAiIntent, number>;
  method: 'deterministic-pattern';
  disclosure: string;
  refused?: boolean;
  refuseReason?: string;
};

export type AiMode = 'deterministic' | 'llm';

export type ToolResultCitation = {
  toolResultId: string;
  toolId: string;
  claim: string;
  numericValue?: number | null;
  metricId?: string;
};

export type GroundedAnswer = {
  question: string;
  intent: IntentClassification;
  mode: AiMode;
  modeLabel: string;
  summary: string;
  steps: string[];
  citations: ToolResultCitation[];
  toolResults: ToolExecutionRecord[];
  refused: boolean;
  refuseReason?: string;
  investigationId?: string;
  decisionProposalId?: string;
  flagship?: boolean;
};

export type ToolExecutionRecord = {
  id: string;
  toolId: string;
  ok: boolean;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  error?: string;
};

export type DriverStatus =
  | 'supported'
  | 'partially_supported'
  | 'contradicted'
  | 'insufficient_evidence';

export type InvestigationDriver = {
  metricId: string;
  relatedMetricId: string;
  edgeId: string;
  status: DriverStatus;
  evidence: string;
  causalClaim: CausalClaim;
  confounders: string[];
};

export type InvestigationReport = {
  id: string;
  focusMetricId: string;
  observedValue: number | null;
  baselineValue: number | null;
  relatedMetrics: string[];
  dataQualityNotes: string[];
  drivers: InvestigationDriver[];
  domainsTouched: OwningDomain[];
  reconciliationOk: boolean;
  disclaimer: string;
};

export type DecisionStatus =
  | 'Draft'
  | 'Under Review'
  | 'Approved'
  | 'Rejected'
  | 'Deferred'
  | 'In Progress'
  | 'Completed'
  | 'Effectiveness Review';

export type DecisionProposal = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  status: DecisionStatus;
  question: string;
  recommendedOptionId: string | null;
  options: DecisionOptionSummary[];
  rationale: string;
  /** Demo-only session/local storage — never mutates KPI ledgers. */
  storageLabel: 'demo-session-state';
  outcomeId?: string;
};

export type DecisionOptionSummary = {
  id: string;
  label: string;
  increasesStaffingCost: boolean;
  expectedBenefitNote: string;
  simulationIds: string[];
};

export type OutcomeRecord = {
  id: string;
  decisionId: string;
  expected: string;
  simulated: string;
  observed: string;
  observedStatus: 'not_yet_measured' | 'measured';
};

export const AI_MODE_DISCLOSURE =
  'AI mode: Deterministic tool orchestration (labeled). No unrestricted LLM reasoning in the public demo. Numeric claims cite tool results from existing domain views only.';

export const REFUSAL_CLINICAL =
  'Refused: unsupported clinical diagnosis or patient-level inference. Enterprise AI stays at operational/aggregate scope.';

export const REFUSAL_CAPEX_AUTO =
  'Refused: CapEx auto-approval is not permitted. Human decision required; historical KPI facts are never mutated by approval.';

export const REFUSAL_PROMPT_INJECTION =
  'Refused: prompt-injection / instruction-override attempts are ignored. Enterprise AI only answers operational analytics questions via tools.';

export const REFUSAL_UNSUPPORTED_ROI =
  'Refused: unsupported ROI / guaranteed financial return claims. Synthetic demo cannot invent validated investment ROI.';
