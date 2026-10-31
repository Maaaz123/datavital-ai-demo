/**
 * Executive response contract (sections A–G).
 * Business language only in primary sections; never fabricate financial losses or clinical causality.
 */
import type { ReportPeriod } from '../period';
import { driverStatusLabel, executiveMetricLabel, type FocusResolution } from './focus';
import { formatMetricValue } from './format';
import type { RankedRisk } from './riskIntelligence';
import { scenarioLabelForId, type ScenarioSelection } from './scenarioSelect';
import type {
  DriverStatus,
  InvestigationReport,
  OptimizationResultLike,
  ToolResultCitation,
} from './types';

export type ExecutiveRole = 'CEO/Board' | 'COO' | 'CFO' | 'CMO/CNO';

export type EvidenceStatusLabel = 'Supported' | 'Partially Supported' | 'Contradicted' | 'More Evidence Needed';

export type ExecutiveDriver = {
  title: string;
  status: EvidenceStatusLabel;
  technicalStatus: DriverStatus;
  evidence: string;
  metricId: string;
};

export type ExecutiveAction = {
  id: string;
  label: string;
  owner: string;
  feasibility: string;
  constraints: string;
};

export type ExecutiveResponse = {
  A_executiveSummary: string;
  B_riskAssessment: { severity: string; rationale: string; rules: string[] };
  C_whyThisIsHappening: ExecutiveDriver[];
  D_businessImpact: string;
  E_recommendedActions: ExecutiveAction[];
  F_preferredOption: { id: string | null; label: string; rationale: string };
  G_followUpMeasurement: string;
  clarificationTopics?: string[];
  focusLabel: string;
  focusMetricId: string | null;
  scenarioId: string | null;
  modeDisclosure: string;
};

export type BuildExecutiveArgs = {
  question: string;
  hospital: string;
  year: number;
  period: ReportPeriod;
  focus: FocusResolution;
  investigation: InvestigationReport | null;
  risks: RankedRisk[];
  scenario: ScenarioSelection;
  optimization: OptimizationResultLike | null;
  citations: ToolResultCitation[];
  flagship: boolean;
  refused?: boolean;
  refuseReason?: string;
  noAdditionalStaffingCost?: boolean;
};

const MODE_SOFT =
  'Analysis Mode: Deterministic management analytics on illustrative hospital demo data — not an unrestricted live LLM.';

function mapStatus(status: DriverStatus): EvidenceStatusLabel {
  return driverStatusLabel(status) as EvidenceStatusLabel;
}

function ownerFor(optionId: string): string {
  if (optionId.startsWith('rcm-')) return 'Revenue Cycle / CFO office';
  if (optionId.startsWith('sc-') || optionId === 'st-supply-efficiency') return 'Supply Chain / COO';
  if (optionId.startsWith('qs-')) return 'Quality & Safety / CMO';
  if (optionId.startsWith('px-')) return 'Patient Experience / CNO';
  if (optionId.startsWith('icu-')) return 'Critical Care / CNO';
  if (optionId.startsWith('st-reduce-overtime') || optionId.includes('staff')) return 'Workforce / COO';
  return 'Hospital Operations / COO';
}

function severityFromRisks(risks: RankedRisk[], focusMetricId: string | null): { severity: string; rationale: string; rules: string[] } {
  const relevant = focusMetricId
    ? risks.filter((r) => r.metricId === focusMetricId).concat(risks.slice(0, 3))
    : risks.slice(0, 5);
  const top = relevant[0] ?? risks[0];
  if (!top) {
    return {
      severity: 'Watch',
      rationale: 'Insufficient period evidence to score severity — more evidence needed.',
      rules: [],
    };
  }
  const label = top.severity === 'critical' ? 'Critical' : top.severity === 'high' ? 'High' : top.severity === 'watch' ? 'Watch' : 'Healthy';
  return {
    severity: label,
    rationale: `${top.title} ranks ${label} under auditable threshold rules for the selected hospital and period.`,
    rules: relevant.slice(0, 4).map((r) => r.rule),
  };
}

function businessImpact(
  focus: FocusResolution,
  investigation: InvestigationReport | null,
  risks: RankedRisk[],
): string {
  if (!focus.focusMetricId && focus.mode !== 'hospital_wide_risk' && focus.mode !== 'flagship_multi') {
    return 'Business impact not assessed until a focus topic is clarified. No fabricated financial loss is reported.';
  }
  const bits: string[] = [];
  if (investigation?.observedValue != null && focus.focusMetricId) {
    bits.push(
      `${executiveMetricLabel(focus.focusMetricId)} is ${formatMetricValue(focus.focusMetricId, investigation.observedValue)} in the selected period`
      + (investigation.baselineValue != null
        ? ` (prior-year baseline ${formatMetricValue(focus.focusMetricId, investigation.baselineValue)})`
        : ''),
    );
  }
  const pressure = risks.filter((r) => r.severity === 'critical' || r.severity === 'high').slice(0, 3);
  if (pressure.length) {
    bits.push(
      `Period risk pressure includes: ${pressure.map((r) => r.title).join('; ')}.`,
    );
  }
  bits.push('Impact statements stay qualitative/quantitative only where registry evidence supports them — no invented cash losses or clinical causality.');
  return bits.join(' ');
}

export function buildExecutiveResponse(args: BuildExecutiveArgs): ExecutiveResponse {
  if (args.refused) {
    return {
      A_executiveSummary: args.refuseReason ?? 'Request refused under governance guardrails.',
      B_riskAssessment: { severity: 'Not assessed', rationale: 'Refused before investigation.', rules: [] },
      C_whyThisIsHappening: [],
      D_businessImpact: 'Not assessed.',
      E_recommendedActions: [],
      F_preferredOption: { id: null, label: 'None', rationale: 'Refused.' },
      G_followUpMeasurement: 'No follow-up measurement — request refused.',
      focusLabel: 'Refused',
      focusMetricId: null,
      scenarioId: null,
      modeDisclosure: MODE_SOFT,
    };
  }

  const focusLabel = args.focus.label;
  const drivers: ExecutiveDriver[] = (args.investigation?.drivers ?? []).slice(0, 6).map((d) => ({
    title: `Possible Contributing Factor: ${executiveMetricLabel(d.relatedMetricId)}`,
    status: mapStatus(d.status),
    technicalStatus: d.status,
    evidence: d.evidence,
    metricId: d.relatedMetricId,
  }));

  // Ambiguous focus — but a concrete what-if / optimization selection still surfaces as preferred.
  const clarificationWithoutIntervention =
    args.focus.mode === 'clarification'
    && !(args.scenario.available && args.scenario.scenarioId)
    && !args.optimization?.selected;

  if (clarificationWithoutIntervention) {
    return {
      A_executiveSummary:
        'The question is ambiguous for a single management focus. Choose a clarification topic below, or review the labeled hospital-wide risk overview — Emergency Waiting Time is not assumed by default.',
      B_riskAssessment: severityFromRisks(args.risks, null),
      C_whyThisIsHappening: drivers,
      D_businessImpact: 'Business impact deferred until a focus topic is selected. No fabricated financial losses.',
      E_recommendedActions: [],
      F_preferredOption: {
        id: null,
        label: 'Clarification required',
        rationale: 'Preferred option awaits a defined investigation focus.',
      },
      G_followUpMeasurement: 'Outcome remains unmeasured until an investigation focus and decision are recorded.',
      clarificationTopics: args.focus.clarificationTopics,
      focusLabel,
      focusMetricId: null,
      scenarioId: args.scenario.scenarioId,
      modeDisclosure: MODE_SOFT,
    };
  }

  // Question-aligned scenario wins when feasible under constraints (optimization preferredScenarioId).
  const scenarioId = args.scenario.available ? args.scenario.scenarioId : null;
  const preferredId = args.optimization?.selected
    ?? scenarioId
    ?? null;

  const actions: ExecutiveAction[] = [];
  const pushAction = (id: string, kind: 'primary' | 'alt') => {
    if (!id || actions.some((a) => a.id === id) || actions.length >= 3) return;
    const human = id === scenarioId
      ? (args.scenario.label || scenarioLabelForId(id))
      : scenarioLabelForId(id);
    actions.push({
      id,
      label: kind === 'primary' ? human : `Alternative: ${human}`,
      owner: ownerFor(id),
      feasibility: args.optimization?.feasible === false && id === args.optimization.selected
        ? 'Currently infeasible'
        : 'Feasible under stated constraints',
      constraints: (args.optimization?.constraintsApplied ?? []).join('; ')
        || (args.noAdditionalStaffingCost ? 'No additional staffing cost preferred' : 'None listed'),
    });
  };
  if (preferredId) pushAction(preferredId, 'primary');
  for (const alt of [scenarioId, ...(args.optimization?.alternatives ?? [])]) {
    if (alt) pushAction(alt, preferredId === alt ? 'primary' : 'alt');
  }

  const preferredHuman = preferredId
    ? (preferredId === scenarioId ? (args.scenario.label || scenarioLabelForId(preferredId)) : scenarioLabelForId(preferredId))
    : null;

  const preferredLabel = preferredHuman
    ?? (args.scenario.available === false && /intervention|what[- ]?if|scenario/i.test(args.question)
      ? 'Scenario unavailable with the current evidence.'
      : 'No preferred option selected');

  const summaryParts = [
    args.flagship
      ? 'Hospital performance pressure spans multiple domains. Leadership should review the preferred option with domain owners before acting.'
      : `Investigation focus: ${focusLabel}.`,
    args.investigation?.observedValue != null && args.focus.focusMetricId
      ? `Observed ${executiveMetricLabel(args.focus.focusMetricId)} is ${formatMetricValue(args.focus.focusMetricId, args.investigation.observedValue)} for ${args.hospital} · ${args.period} ${args.year}.`
      : args.focus.mode === 'hospital_wide_risk'
        ? `Hospital-wide risk overview for ${args.hospital} · ${args.period} ${args.year}.`
        : null,
    preferredHuman
      ? `Under current constraints${args.noAdditionalStaffingCost ? ' (without adding staff cost)' : ''}, the preferred management option is ${preferredHuman}.`
      : null,
    'Outcome remains unmeasured until follow-up evidence is recorded after a human decision.',
  ].filter(Boolean);

  return {
    A_executiveSummary: summaryParts.join(' '),
    B_riskAssessment: severityFromRisks(args.risks, args.focus.focusMetricId),
    C_whyThisIsHappening: drivers.length
      ? drivers
      : [{
          title: 'Other Factors to Consider',
          status: 'More Evidence Needed',
          technicalStatus: 'insufficient_evidence',
          evidence: 'No linked knowledge-graph drivers for the current focus — more evidence needed.',
          metricId: args.focus.focusMetricId ?? 'none',
        }],
    D_businessImpact: businessImpact(args.focus, args.investigation, args.risks),
    E_recommendedActions: actions.slice(0, 3),
    F_preferredOption: {
      id: preferredId,
      label: preferredLabel,
      rationale: args.optimization?.feasible
        ? 'Selected by comparing improvement options under the stated leadership constraints.'
        : args.scenario.reason,
    },
    G_followUpMeasurement:
      'Follow-up remains unmeasured until evidence is recorded after a human decision. Approval does not change published hospital figures.',
    clarificationTopics: args.focus.clarificationTopics,
    focusLabel,
    focusMetricId: args.focus.focusMetricId,
    scenarioId: args.scenario.scenarioId,
    modeDisclosure: MODE_SOFT,
  };
}

/** Role presentation emphasis — presentation only; does not invent data. */
export function roleEmphasis(role: ExecutiveRole): {
  emphasize: Array<keyof ExecutiveResponse>;
  note: string;
} {
  switch (role) {
    case 'CEO/Board':
      return {
        emphasize: ['A_executiveSummary', 'B_riskAssessment', 'F_preferredOption', 'G_followUpMeasurement'],
        note: 'CEO/Board view emphasizes summary, risk, preferred option, and follow-up.',
      };
    case 'COO':
      return {
        emphasize: ['C_whyThisIsHappening', 'E_recommendedActions', 'F_preferredOption', 'B_riskAssessment'],
        note: 'COO view emphasizes drivers, actions, preferred option, and operational risk.',
      };
    case 'CFO':
      return {
        emphasize: ['D_businessImpact', 'B_riskAssessment', 'E_recommendedActions', 'F_preferredOption'],
        note: 'CFO view emphasizes business impact, financial risk signals, and constrained options — no invented losses.',
      };
    case 'CMO/CNO':
      return {
        emphasize: ['C_whyThisIsHappening', 'B_riskAssessment', 'E_recommendedActions', 'G_followUpMeasurement'],
        note: 'CMO/CNO view emphasizes clinical-ops drivers, safety/quality risk, actions, and measurement — no patient-level diagnosis.',
      };
    default:
      return {
        emphasize: ['A_executiveSummary', 'B_riskAssessment', 'E_recommendedActions'],
        note: 'Default executive emphasis.',
      };
  }
}
