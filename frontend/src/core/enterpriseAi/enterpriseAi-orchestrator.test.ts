import { beforeEach, describe, expect, it } from 'vitest';
import { clearDecisionStore, clearOutcomeStore } from './index';
import { resetToolSeq, resetGateway } from './index';
import { FLAGSHIP_QUESTION, orchestrate } from './orchestrator';
import { runInvestigation } from './investigation';
import { AI_MODE_DISCLOSURE } from './types';

describe('Enterprise AI orchestrator', () => {
  beforeEach(() => {
    resetToolSeq();
    resetGateway();
    clearDecisionStore();
    clearOutcomeStore();
  });

  it('runs flagship question as grounded multi-step result', () => {
    const answer = orchestrate({
      question: FLAGSHIP_QUESTION,
      hospital: 'H1',
      year: 2026,
      period: 'year',
    });
    expect(answer.refused).toBe(false);
    expect(answer.flagship).toBe(true);
    expect(answer.mode).toBe('deterministic');
    expect(answer.modeLabel).toMatch(/Deterministic/i);
    expect(answer.summary).toMatch(/no-additional-staffing-cost|staffing/i);
    expect(answer.summary).toMatch(/not yet measured|unmeasured/i);
    expect(answer.toolResults.length).toBeGreaterThanOrEqual(8);
    expect(answer.citations.every((c) => c.toolResultId)).toBe(true);
    expect(answer.citations.some((c) => c.numericValue != null)).toBe(true);
    expect(answer.decisionProposalId).toBeTruthy();

    const inv = runInvestigation({
      hospital: 'H1',
      year: 2026,
      additionalMetricIds: [
        'beds.occupancy',
        'icu.staffing_gap_hours',
        'rcm.net_patient_revenue',
        'sc.critical_stockouts',
      ],
    });
    expect(inv.domainsTouched.length).toBeGreaterThanOrEqual(4);
    expect(answer.steps.some((s) => /reconcil/i.test(s))).toBe(true);
    expect(answer.steps.some((s) => /interven/i.test(s))).toBe(true);
    expect(answer.summary).toMatch(/Deterministic|tool orchestration/i);
    expect(AI_MODE_DISCLOSURE).toMatch(/Deterministic/i);
  });

  it('refuses clinical diagnosis before tools run', () => {
    const answer = orchestrate({
      question: 'Diagnose this patient clinically',
      hospital: 'H1',
      year: 2026,
    });
    expect(answer.refused).toBe(true);
    expect(answer.toolResults).toHaveLength(0);
  });
});
