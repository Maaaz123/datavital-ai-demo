/**
 * Shared Enterprise question context contract for Enterprise AI + Vital Assist.
 * Explicit question topic wins over prior conversation focus.
 */
import type { ReportPeriod } from '../period';
import type { ExecutiveRole } from './executiveResponse';
import { resolveFocusFromQuestion, type FocusResolution } from './focus';
import { classifyIntent } from './intent';
import type { InvestigationState } from './types';

export type EnterpriseQuestionContext = {
  question: string;
  activeRoute: string;
  hospital: string;
  year: number;
  period: ReportPeriod;
  executiveRole?: ExecutiveRole;
  intent?: string;
  primaryDomain?: string;
  primaryMetricId?: string | null;
  investigationId?: string;
  selectedScenarioId?: string | null;
  constraints?: Record<string, unknown>;
  priorQuestionContext?: {
    primaryDomain?: string;
    primaryMetricId?: string | null;
    investigationId?: string;
  };
  focus: FocusResolution;
  isFollowUp: boolean;
};

/** Domain label from focus topic / metric — for assist headers, not tool IDs. */
export function domainLabelFromFocus(focus: FocusResolution): string {
  if (focus.mode === 'hospital_wide_risk' || focus.mode === 'flagship_multi') return 'Enterprise';
  const topic = focus.topic;
  const map: Record<string, string> = {
    ed_wait: 'Emergency',
    denials_rcm: 'Revenue Cycle',
    supply: 'Supply Chain',
    contribution: 'Strategy',
    satisfaction: 'Patient Experience',
    icu: 'ICU',
    overtime_workforce: 'Strategy',
    quality: 'Quality & Safety',
    beds: 'Beds',
    surgery: 'Surgery',
    lab: 'Laboratory',
    radiology: 'Radiology',
    pharmacy: 'Pharmacy',
    opd: 'Outpatient',
    appointments: 'Appointments',
    inpatient: 'Inpatient',
  };
  return map[topic] ?? 'Enterprise';
}

/**
 * Build context for a new Enterprise / Vital Assist question.
 * Prior focus is attached only when `isFollowUp` is true.
 */
export function buildEnterpriseQuestionContext(args: {
  question: string;
  activeRoute: string;
  hospital: string;
  year: number;
  period: ReportPeriod;
  executiveRole?: ExecutiveRole;
  priorState?: Partial<InvestigationState> | null;
  isFollowUp?: boolean;
}): EnterpriseQuestionContext {
  const focus = resolveFocusFromQuestion(args.question);
  const intent = classifyIntent(args.question);
  const isFollowUp = args.isFollowUp === true;
  return {
    question: args.question.trim(),
    activeRoute: args.activeRoute,
    hospital: args.hospital,
    year: args.year,
    period: args.period,
    executiveRole: args.executiveRole,
    intent: intent.primary,
    primaryDomain: domainLabelFromFocus(focus),
    primaryMetricId: focus.focusMetricId,
    investigationId: isFollowUp ? args.priorState?.subject : undefined,
    selectedScenarioId: isFollowUp ? args.priorState?.scenarioId : null,
    constraints: args.priorState?.constraints,
    priorQuestionContext: isFollowUp && args.priorState
      ? {
          primaryDomain: args.priorState.focusLabel,
          primaryMetricId: args.priorState.focusMetricId,
          investigationId: args.priorState.subject,
        }
      : undefined,
    focus,
    isFollowUp,
  };
}

/** Format orchestrate executive answer into Vital Assist chat lines (existing bubble layout). */
export function formatEnterpriseAssistBody(args: {
  summary: string;
  executive: {
    A_executiveSummary: string;
    B_riskAssessment: { severity: string; rationale: string };
    C_whyThisIsHappening: { title: string; evidence: string }[];
    D_businessImpact: string;
    E_recommendedActions: { label: string; owner: string }[];
    F_preferredOption: { label: string; rationale: string };
    G_followUpMeasurement: string;
    modeDisclosure: string;
  };
  periodLabel: string;
}): { title: string; body: string[] } {
  const ex = args.executive;
  const actions = ex.E_recommendedActions.length
    ? ex.E_recommendedActions.map((a) => `${a.label} (Owner: ${a.owner})`).join('; ')
    : 'No actions ready — clarify focus if needed.';
  const causes = ex.C_whyThisIsHappening.slice(0, 3)
    .map((d) => `${d.title}: ${d.evidence}`)
    .join(' | ') || 'More evidence needed.';
  return {
    title: `Hospital Performance · ${args.periodLabel}`,
    body: [
      `Summary: ${ex.A_executiveSummary}`,
      `Main Risks: ${ex.B_riskAssessment.severity} — ${ex.B_riskAssessment.rationale}`,
      `Possible Causes: ${causes}`,
      `Business Impact: ${ex.D_businessImpact}`,
      `Recommended Actions: ${actions}`,
      `Preferred Option: ${ex.F_preferredOption.label}. ${ex.F_preferredOption.rationale}`,
      `Follow-up Measurement: ${ex.G_followUpMeasurement}`,
      ex.modeDisclosure,
    ],
  };
}
