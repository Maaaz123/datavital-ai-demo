/**
 * P0 management-intent regression — groups A–H.
 * Behavioral routing only; does not assert UI chrome.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  approveDecision,
  clearDecisionStore,
  clearOutcomeStore,
  createDecisionProposal,
  orchestrate,
  resetGateway,
  resetToolSeq,
  resolveFocusFromQuestion,
  selectScenarioFromQuestion,
  transitionDecision,
} from './index';
import { formatEnterpriseAssistBody } from './enterpriseQuestionContext';

const CTX = { hospital: 'H1', year: 2026, period: 'year' as const };

beforeEach(() => {
  resetToolSeq();
  resetGateway();
  clearDecisionStore();
  clearOutcomeStore();
});

describe('Group A — CEO hospital-wide risks', () => {
  const q = 'What are the three biggest risks for this hospital and what should management do?';

  it('selects enterprise-wide scope with three distinct supported risks', () => {
    const focus = resolveFocusFromQuestion(q);
    expect(focus.mode).toBe('hospital_wide_risk');
    expect(focus.focusMetricId).toBeNull();

    const answer = orchestrate({ question: q, ...CTX });
    expect(answer.focusMetricId).toBeNull();
    expect(answer.risks?.length ?? 0).toBeGreaterThanOrEqual(3);

    const titles = (answer.risks ?? []).slice(0, 3).map((r) => r.title);
    expect(new Set(titles).size).toBe(3);

    const domains = new Set((answer.risks ?? []).slice(0, 3).map((r) => r.metricId.split('.')[0]));
    // Must not be ED-only default for the top three.
    expect(domains.size).toBeGreaterThanOrEqual(2);

    const actions = answer.executive?.E_recommendedActions ?? [];
    expect(actions.length).toBeGreaterThanOrEqual(3);
    expect(actions.every((a) => a.owner && a.label)).toBe(true);

    const blob = JSON.stringify(answer.executive).toLowerCase();
    expect(blob).not.toMatch(/emergency director priorities/);
    expect(answer.executive?.A_executiveSummary).toMatch(/hospital-wide|top management risks/i);
  });
});

describe('Group B — CFO claims denials', () => {
  const q = 'Why are claims being denied and what should our CFO prioritize?';

  it('routes to RCM denials — not ED', () => {
    const focus = resolveFocusFromQuestion(q);
    expect(focus.focusMetricId).toBe('rcm.gross_denial_rate');
    expect(focus.mode).toBe('topic');

    const scenario = selectScenarioFromQuestion(q);
    expect(scenario.scenarioId).toBe('rcm-denials-down');
    expect(scenario.available).toBe(true);

    const answer = orchestrate({ question: q, ...CTX });
    expect(answer.focusMetricId).toBe('rcm.gross_denial_rate');
    expect(answer.scenarioId).toBe('rcm-denials-down');
    expect(answer.executive?.F_preferredOption.id).toBe('rcm-denials-down');

    const actions = answer.executive?.E_recommendedActions ?? [];
    expect(actions.some((a) => /cfo|revenue cycle/i.test(a.owner))).toBe(true);

    const blob = `${answer.summary} ${answer.executive?.A_executiveSummary}`.toLowerCase();
    expect(blob).not.toMatch(/door-to-provider|emergency director|ed boarding/);
    expect(blob).toMatch(/denial|revenue/);
  });
});

describe('Group C — COO overtime without staffing cost', () => {
  const q = 'What can we do to reduce overtime without additional staffing cost?';

  it('respects staffing cost constraint and avoids hiring', () => {
    const focus = resolveFocusFromQuestion(q);
    expect(focus.focusMetricId).toBe('st.enterprise_staffing_gap_hours');

    const answer = orchestrate({
      question: q,
      ...CTX,
      noAdditionalStaffingCost: true,
    });
    expect(answer.scenarioId).toBe('st-reduce-overtime');
    expect(answer.executive?.F_preferredOption.id).not.toBe('ent-staffing-uplift');
    expect(answer.executive?.F_preferredOption.id).not.toBe('st-reallocate-nurses');

    const ids = (answer.executive?.E_recommendedActions ?? []).map((a) => a.id);
    expect(ids).not.toContain('ent-staffing-uplift');
    expect(answer.summary.toLowerCase()).toMatch(/overtime|staffing|workforce/);
  });
});

describe('Group D — CMO patient safety', () => {
  const q = 'What are the most serious patient safety risks and what should clinical leadership review?';

  it('selects quality/safety context without unsupported clinical causality', () => {
    const focus = resolveFocusFromQuestion(q);
    expect(focus.focusMetricId).toBe('qs.overdue_high_risk_actions');

    const answer = orchestrate({ question: q, ...CTX });
    expect(answer.focusMetricId).toBe('qs.overdue_high_risk_actions');
    expect(answer.scenarioId).toBe('qs-capa-overdue-down');

    const blob = JSON.stringify(answer.executive).toLowerCase();
    expect(blob).toMatch(/safety|capa|quality|overdue/);
    expect(blob).not.toMatch(/diagnos(e|is)|prescribe|patient-level causal/);
    expect(blob).not.toMatch(/door-to-provider|emergency director/);
  });
});

describe('Group E — same-conversation topic switching', () => {
  it('ED → RCM → Quality → Supply → Enterprise Risk without stale ED', () => {
    const ed = orchestrate({
      question: 'Why is emergency waiting time elevated?',
      ...CTX,
    });
    expect(ed.focusMetricId).toBe('ed.wait.median_min');

    const rcm = orchestrate({
      question: 'Why are claims being denied and what should our CFO prioritize?',
      ...CTX,
      priorState: ed.investigationState,
    });
    expect(rcm.focusMetricId).toBe('rcm.gross_denial_rate');
    expect(rcm.scenarioId).toBe('rcm-denials-down');

    const qs = orchestrate({
      question: 'What are the most serious patient safety risks and what should clinical leadership review?',
      ...CTX,
      priorState: rcm.investigationState,
    });
    expect(qs.focusMetricId).toBe('qs.overdue_high_risk_actions');

    const supply = orchestrate({
      question: 'How do we reduce critical supply stockouts?',
      ...CTX,
      priorState: qs.investigationState,
    });
    expect(supply.focusMetricId).toBe('sc.critical_stockouts');

    const ceo = orchestrate({
      question: 'What are the three biggest risks for this hospital and what should management do?',
      ...CTX,
      priorState: supply.investigationState,
    });
    expect(ceo.focusMetricId).toBeNull();
    expect(ceo.executive?.A_executiveSummary).toMatch(/hospital-wide|top management risks/i);
    expect((ceo.risks ?? []).length).toBeGreaterThanOrEqual(3);
  });
});

describe('Group F — scope switching hospitals and periods', () => {
  it('returns distinct evidence across hospitals and periods', () => {
    const q = 'Why are claims being denied and what should our CFO prioritize?';
    const h1 = orchestrate({ question: q, hospital: 'H1', year: 2026, period: 'year' });
    const h2 = orchestrate({ question: q, hospital: 'H2', year: 2026, period: 'year' });
    const q1 = orchestrate({ question: q, hospital: 'H1', year: 2026, period: 'Q1' });
    const y25 = orchestrate({ question: q, hospital: 'H1', year: 2025, period: 'year' });

    for (const a of [h1, h2, q1, y25]) {
      expect(a.focusMetricId).toBe('rcm.gross_denial_rate');
      expect(a.scenarioId).toBe('rcm-denials-down');
    }
    // Period/hospital change must not keep a prior decision proposal.
    const follow = orchestrate({
      question: q,
      hospital: 'H3',
      year: 2024,
      period: 'Q3',
      priorState: { ...h1.investigationState, hospital: 'H1', year: 2026, period: 'year' },
    });
    expect(follow.investigationState?.hospital).toBe('H3');
    expect(follow.investigationState?.year).toBe(2024);
  });
});

describe('Group G — scenario comparison', () => {
  it('selects distinct scenarios for denials, supply, overtime, ED', () => {
    const denials = selectScenarioFromQuestion('What if we reduce claim denials?');
    const supply = selectScenarioFromQuestion('What if we improve supply efficiency?');
    const overtime = selectScenarioFromQuestion('What if we reduce avoidable overtime?');
    const ed = selectScenarioFromQuestion('What if we reduce ED boarding?');

    expect(denials.scenarioId).toBe('rcm-denials-down');
    expect(supply.scenarioId).toBe('st-supply-efficiency');
    expect(overtime.scenarioId).toBe('st-reduce-overtime');
    expect(ed.scenarioId).toBe('ed-boarding-down');

    const ids = [denials, supply, overtime, ed].map((s) => s.scenarioId);
    expect(new Set(ids).size).toBe(4);
  });
});

describe('Group H — decision workflow', () => {
  it('draft → approve/reject/defer without mutating KPI focus', () => {
    const answer = orchestrate({
      question: 'Why are claims being denied and what should our CFO prioritize?',
      ...CTX,
    });
    expect(answer.focusMetricId).toBe('rcm.gross_denial_rate');

    const draft = createDecisionProposal({
      title: 'RCM denial review',
      question: answer.question,
      rationale: 'Human approval required',
      recommendedOptionId: 'rcm-denials-down',
      options: [{
        id: 'rcm-denials-down',
        label: 'Reduce claim denials',
        increasesStaffingCost: false,
        expectedBenefitNote: 'Illustrative denial reduction',
        simulationIds: [],
      }],
    });
    expect(draft.status).toBe('Draft');

    const approved = approveDecision(draft.id);
    expect(approved.ok).toBe(true);
    expect(approved.decision?.status).toBe('Approved');

    const rejected = createDecisionProposal({
      title: 'Reject path',
      question: answer.question,
      rationale: 'test',
      recommendedOptionId: 'rcm-denials-down',
      options: draft.options,
    });
    expect(transitionDecision(rejected.id, 'Rejected').decision?.status).toBe('Rejected');

    const deferred = createDecisionProposal({
      title: 'Defer path',
      question: answer.question,
      rationale: 'test',
      recommendedOptionId: 'rcm-denials-down',
      options: draft.options,
    });
    expect(transitionDecision(deferred.id, 'Deferred').decision?.status).toBe('Deferred');

    // Topic change clears prior decision linkage.
    const switched = orchestrate({
      question: 'What are the most serious patient safety risks and what should clinical leadership review?',
      ...CTX,
      priorState: {
        ...answer.investigationState!,
        decisionProposalId: draft.id,
      },
    });
    expect(switched.focusMetricId).toBe('qs.overdue_high_risk_actions');
    expect(switched.decisionProposalId).not.toBe(draft.id);
  });
});

describe('Vital Assist enterprise formatting', () => {
  it('formats executive brief without Emergency Director title', () => {
    const answer = orchestrate({
      question: 'What are the three biggest risks for this hospital and what should management do?',
      ...CTX,
    });
    const packed = formatEnterpriseAssistBody({
      summary: answer.summary,
      executive: answer.executive!,
      periodLabel: 'H1 · Full year 2026',
    });
    expect(packed.title).toMatch(/Hospital Performance/);
    expect(packed.title).not.toMatch(/Emergency Director/);
    expect(packed.body.some((l) => /Main Risks/i.test(l))).toBe(true);
    expect(packed.body.some((l) => /Recommended Actions/i.test(l))).toBe(true);
  });
});
