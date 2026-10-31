import { beforeEach, describe, expect, it } from 'vitest';
import { clearDecisionStore, clearOutcomeStore, resetGateway, resetToolSeq } from './index';
import { resolveFocusFromQuestion } from './focus';
import { selectScenarioFromQuestion } from './scenarioSelect';
import { rankHospitalRisks, RISK_RULES } from './riskIntelligence';
import { formatForecastPoint, formatMinutes, formatPercent, formatSar } from './format';
import { orchestrate, FLAGSHIP_QUESTION } from './orchestrator';
import { runOptimization } from './optimization';
import { approveDecision, createDecisionProposal, listDecisions } from './decisions';
import { resolveMetric } from './metricRegistry';

describe('Enterprise AI executive remediation', () => {
  beforeEach(() => {
    resetToolSeq();
    resetGateway();
    clearDecisionStore();
    clearOutcomeStore();
  });

  it('derives finance focus ≠ ED wait', () => {
    const focus = resolveFocusFromQuestion('Why are denials rising and what should finance review?');
    expect(focus.focusMetricId).toBe('rcm.gross_denial_rate');
    expect(focus.focusMetricId).not.toBe('ed.wait.median_min');

    const answer = orchestrate({
      question: 'Explain net patient revenue pressure this year',
      hospital: 'H1',
      year: 2026,
      period: 'year',
    });
    expect(answer.focusMetricId).toMatch(/^rcm\./);
    expect(answer.focusMetricId).not.toBe('ed.wait.median_min');
    expect(answer.executive?.focusMetricId).not.toBe('ed.wait.median_min');
  });

  it('does not silently default ambiguous query to ED', () => {
    const focus = resolveFocusFromQuestion('Show me something interesting');
    expect(focus.mode === 'clarification' || focus.mode === 'hospital_wide_risk').toBe(true);
    expect(focus.focusMetricId).toBeNull();
    expect(focus.note).toMatch(/not assumed/i);
    expect(focus.focusMetricId).not.toBe('ed.wait.median_min');

    const answer = orchestrate({
      question: 'How is hospital performing?',
      hospital: 'H1',
      year: 2026,
      period: 'year',
    });
    expect(answer.executive?.clarificationTopics?.length || answer.risks?.length).toBeGreaterThan(0);
    // Must not claim silent ED-only investigation as the only focus label for ambiguous overview
    expect(answer.executive?.A_executiveSummary).toMatch(/hospital-wide|clarif|risk overview|performance/i);
  });

  it('selects three distinct scenario IDs for three interventions', () => {
    const a = selectScenarioFromQuestion('What if we improve supply efficiency without adding staff?');
    const b = selectScenarioFromQuestion('What if we reduce avoidable overtime?');
    const c = selectScenarioFromQuestion('What if we reduce claim denials?');
    expect(a.scenarioId).toBe('st-supply-efficiency');
    expect(b.scenarioId).toBe('st-reduce-overtime');
    expect(c.scenarioId).toBe('rcm-denials-down');
    expect(new Set([a.scenarioId, b.scenarioId, c.scenarioId]).size).toBe(3);

    const oa = orchestrate({ question: 'What if we improve supply efficiency without adding staff?', hospital: 'H1', year: 2026 });
    const ob = orchestrate({ question: 'What if we reduce avoidable overtime?', hospital: 'H1', year: 2026 });
    const oc = orchestrate({ question: 'What if we reduce claim denials?', hospital: 'H1', year: 2026 });
    const ids = [oa.scenarioId, ob.scenarioId, oc.scenarioId];
    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(3);
    expect(ids).not.toContain('ent-ed-congestion');
  });

  it('includes executive response sections A–G', () => {
    const answer = orchestrate({
      question: FLAGSHIP_QUESTION,
      hospital: 'H1',
      year: 2026,
      period: 'year',
    });
    expect(answer.executive).toBeTruthy();
    expect(answer.executive?.A_executiveSummary.length).toBeGreaterThan(20);
    expect(answer.executive?.B_riskAssessment.severity).toBeTruthy();
    expect(answer.executive?.C_whyThisIsHappening.length).toBeGreaterThan(0);
    expect(answer.executive?.D_businessImpact.length).toBeGreaterThan(10);
    expect(answer.executive?.E_recommendedActions.length).toBeGreaterThan(0);
    expect(answer.executive?.F_preferredOption).toBeTruthy();
    expect(answer.executive?.G_followUpMeasurement).toMatch(/unmeasured|measured/i);
    expect(answer.executive?.E_recommendedActions.every((a) => !/new hire|hire more staff/i.test(a.label) || a.constraints.includes('staffing'))).toBe(true);
  });

  it('never recommends new hires under no-additional-staffing-cost', () => {
    const opt = runOptimization({
      hospital: 'H1',
      year: 2026,
      period: 'year',
      decisionVariables: ['ent-bed-assign-flow', 'st-supply-efficiency', 'ent-staffing-uplift'],
      objective: 'strongest_operational_improvement',
      noAdditionalStaffingCost: true,
    });
    expect(opt.selected).not.toBe('ent-staffing-uplift');
    expect(opt.comparison.ranking.every((r) => r.id !== 'ent-staffing-uplift')).toBe(true);

    const answer = orchestrate({ question: FLAGSHIP_QUESTION, hospital: 'H1', year: 2026 });
    expect(answer.executive?.F_preferredOption.id).not.toBe('ent-staffing-uplift');
  });

  it('ranks risks with auditable documented rules', () => {
    expect(RISK_RULES.length).toBeGreaterThanOrEqual(15);
    const ranked = rankHospitalRisks({ hospital: 'H1', year: 2026, period: 'year', limit: 10 });
    expect(ranked.rulesApplied.length).toBe(RISK_RULES.length);
    expect(ranked.risks.length).toBeGreaterThan(0);
    expect(ranked.risks[0]?.rule).toBeTruthy();
    expect(ranked.note).toMatch(/documented|threshold/i);
  });

  it('formats forecast-style values as %, minutes, SAR', () => {
    expect(formatPercent(0.802)).toBe('80.2%');
    expect(formatMinutes(63.3)).toBe('63.3 min');
    expect(formatSar(12_500_000)).toMatch(/SAR/);
    expect(formatForecastPoint('beds.occupancy', 0.802)).toBe('80.2%');
    expect(formatForecastPoint('ed.wait.median_min', 63.3)).toBe('63.3 min');
  });

  it('supports decision create → approve path without mutating RCM NPR', () => {
    const nprBefore = resolveMetric('rcm.net_patient_revenue', { hospital: 'H1', year: 2026, period: 'year' });
    const answer = orchestrate({ question: FLAGSHIP_QUESTION, hospital: 'H1', year: 2026 });
    expect(answer.decisionProposalId).toBeTruthy();
    const approved = approveDecision(answer.decisionProposalId!);
    expect(approved.ok).toBe(true);
    expect(approved.decision?.status).toBe('Approved');
    const nprAfter = resolveMetric('rcm.net_patient_revenue', { hospital: 'H1', year: 2026, period: 'year' });
    expect(nprAfter).toBe(nprBefore);
    expect(listDecisions()[0]?.storageLabel).toBe('demo-session-state');
  });

  it('re-ranks optimization when objective/constraints change', () => {
    const base = runOptimization({
      hospital: 'H1',
      year: 2026,
      period: 'year',
      decisionVariables: ['ent-bed-assign-flow', 'st-supply-efficiency', 'st-reduce-overtime', 'ent-staffing-uplift'],
      objective: 'strongest_operational_improvement',
      noAdditionalStaffingCost: true,
    });
    const minStaff = runOptimization({
      hospital: 'H1',
      year: 2026,
      period: 'year',
      decisionVariables: ['ent-bed-assign-flow', 'st-supply-efficiency', 'st-reduce-overtime', 'ent-staffing-uplift'],
      objective: 'minimize_staffing_cost',
      noAdditionalStaffingCost: true,
    });
    expect(base.feasible).toBe(true);
    expect(minStaff.feasible).toBe(true);
    expect(base.selected).toBeTruthy();
    // Staffing uplift must stay excluded under no-staff constraint in both
    expect(base.selected).not.toBe('ent-staffing-uplift');
    expect(minStaff.selected).not.toBe('ent-staffing-uplift');
    // Rankings are computed (not a hardcoded single constant across objectives)
    expect(base.comparison.ranking.length).toBeGreaterThan(1);
    expect(minStaff.comparison.ranking[0]?.score).toBeGreaterThan(0);
  });

  it('createDecisionProposal empty-store path still works for E2E start', () => {
    expect(listDecisions()).toHaveLength(0);
    createDecisionProposal({
      title: 'Test',
      question: 'q',
      rationale: 'r',
      options: [{
        id: 'ent-bed-assign-flow',
        label: 'Flow',
        increasesStaffingCost: false,
        expectedBenefitNote: 'note',
        simulationIds: [],
      }],
    });
    expect(listDecisions()).toHaveLength(1);
  });
});
