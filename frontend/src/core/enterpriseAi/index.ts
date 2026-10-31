/** Domain 16 — Enterprise AI (Stages 1–7). */
export type {
  AiMode,
  CausalClaim,
  DataReadiness,
  DecisionOptionSummary,
  DecisionProposal,
  DecisionStatus,
  DriverStatus,
  EnterpriseAiIntent,
  GroundedAnswer,
  IntentClassification,
  InvestigationDriver,
  InvestigationReport,
  KnowledgeEdge,
  MetricAggregation,
  MetricDefinition,
  MetricSourceContext,
  OutcomeRecord,
  OwningDomain,
  PeriodSemantics,
  ReconciliationResult,
  ToolExecutionRecord,
  ToolResultCitation,
} from './types';

export {
  AI_MODE_DISCLOSURE,
  REFUSAL_CAPEX_AUTO,
  REFUSAL_CLINICAL,
  REFUSAL_PROMPT_INJECTION,
  REFUSAL_UNSUPPORTED_ROI,
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

export {
  classifyIntent,
  INTENT_IDS,
  isFlagshipQuestion,
  IntentIdSchema,
} from './intent';

export {
  driverStatusLabel,
  executiveMetricLabel,
  isAmbiguousHospitalQuestion,
  resolveFocusFromQuestion,
  type FocusResolution,
} from './focus';

export {
  interventionCandidatesForQuestion,
  selectScenarioFromQuestion,
  type ScenarioSelection,
} from './scenarioSelect';

export {
  RISK_RULES,
  rankHospitalRisks,
  type RankedRisk,
  type RiskIntelligenceResult,
} from './riskIntelligence';

export {
  buildExecutiveResponse,
  roleEmphasis,
  type ExecutiveRole,
  type ExecutiveResponse,
} from './executiveResponse';

export {
  formatForecastPoint,
  formatMetricValue,
  formatMinutes,
  formatPercent,
  formatSar,
} from './format';

export {
  executeTool,
  getTool,
  listTools,
  resetToolSeq,
  NO_STAFFING_COST_OPTIONS,
  STAFFING_COST_OPTIONS,
  type EnterpriseAiToolId,
} from './tools';

export {
  getGatewayConfig,
  llmComplete,
  resetGateway,
  resolveActiveMode,
  setGatewayMode,
} from './gateway';

export {
  FLAGSHIP_QUESTION,
  orchestrate,
  type OrchestrateRequest,
} from './orchestrator';

export {
  evaluateContradiction,
  runInvestigation,
  type InvestigationRequest,
} from './investigation';

export {
  compareInterventions,
  getScenarioBaseline,
  OVERLAP_GROUPS,
  runSimulation,
} from './simulation';

export {
  runOptimization,
  type OptimizationRequest,
  type OptimizationResult,
} from './optimization';

export {
  FORECAST_MODEL_VERSION,
  runForecast,
  type ForecastResult,
  type ForecastSeriesId,
} from './forecast';

export {
  approveDecision,
  clearDecisionStore,
  createDecisionProposal,
  decisionStorageMeta,
  getDecision,
  getDecisionOutcome,
  listDecisions,
  transitionDecision,
} from './decisions';

export {
  clearOutcomeStore,
  createOutcome,
  getOutcome,
  listOutcomes,
  recordObservedOutcome,
} from './outcomes';

export {
  EnterpriseAiDecisionsPage,
  EnterpriseAiForecastingPage,
  EnterpriseAiGovernancePage,
  EnterpriseAiInvestigationsPage,
  EnterpriseAiOptimizationPage,
  EnterpriseAiPage,
} from './enterpriseAi';
