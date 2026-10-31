import { describe, expect, it } from 'vitest';
import { resolveFocusFromQuestion } from './focus';
import { selectScenarioFromQuestion } from './scenarioSelect';
import { orchestrate } from './orchestrator';

describe('routing probe (post-fix)', () => {
  it('CEO three biggest risks', () => {
    const q = 'What are the three biggest risks for this hospital and what should management do?';
    const f = resolveFocusFromQuestion(q);
    const a = orchestrate({ question: q, hospital: 'H1', year: 2026, period: 'year' });
    expect(f.mode).toBe('hospital_wide_risk');
    expect((a.risks?.length ?? 0) >= 3).toBe(true);
    expect(a.executive?.E_recommendedActions.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  it('CFO claims denials', () => {
    const q = 'Why are claims being denied and what should our CFO prioritize?';
    const f = resolveFocusFromQuestion(q);
    const s = selectScenarioFromQuestion(q);
    const a = orchestrate({ question: q, hospital: 'H1', year: 2026, period: 'year' });
    expect(f.focusMetricId).toBe('rcm.gross_denial_rate');
    expect(s.scenarioId).toBe('rcm-denials-down');
    expect(a.executive?.F_preferredOption?.id).toBe('rcm-denials-down');
  });

  it('stale ED prior must not pin denials', () => {
    const q = 'Why are claims being denied and what should our CFO prioritize?';
    const a = orchestrate({
      question: q,
      hospital: 'H1',
      year: 2026,
      period: 'year',
      priorState: {
        hospital: 'H1',
        year: 2026,
        period: 'year',
        focusMetricId: 'ed.wait.median_min',
        subject: 'Why is emergency waiting time increasing?',
      },
    });
    expect(a.focusMetricId).not.toBe('ed.wait.median_min');
    expect(a.focusMetricId).toBe('rcm.gross_denial_rate');
  });
});
