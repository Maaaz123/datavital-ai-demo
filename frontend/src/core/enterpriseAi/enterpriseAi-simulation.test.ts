import { describe, expect, it } from 'vitest';
import { compareInterventions, OVERLAP_GROUPS, runOptimization, runSimulation } from './index';

const CTX = { hospital: 'H1', year: 2026, period: 'year' as const };

describe('Enterprise AI simulation & optimization', () => {
  it('runs what-if based simulation without inventing a second ledger', () => {
    const sim = runSimulation({ ...CTX, kind: 'ent-bed-assign-flow', amount: 0.2 });
    expect(sim.illustrative).toBe(true);
    expect(sim.whatIf.current).toMatch(/ED|occupancy|wait/i);
    expect(sim.increasesStaffingCost).toBe(false);
  });

  it('rejects overlapping benefit summing within a group', () => {
    const comparison = compareInterventions({
      ...CTX,
      optionIds: ['st-reallocate-nurses', 'st-reduce-overtime'],
      noAdditionalStaffingCost: false,
    });
    expect(OVERLAP_GROUPS['workforce-hours']).toContain('st-reallocate-nurses');
    expect(comparison.rejected.some((r) => /Overlapping|do not sum/i.test(r.reason))).toBe(true);
  });

  it('enforces no-additional-staffing-cost constraint', () => {
    const comparison = compareInterventions({
      ...CTX,
      optionIds: ['ent-bed-assign-flow', 'st-supply-efficiency', 'ent-staffing-uplift'],
      noAdditionalStaffingCost: true,
    });
    expect(comparison.options.every((o) => !o.increasesStaffingCost)).toBe(true);
    expect(comparison.rejected.some((r) => r.optionIds.includes('ent-staffing-uplift'))).toBe(true);
    expect(comparison.ranking.length).toBeGreaterThanOrEqual(2);
  });

  it('explains infeasibility when all options violate constraints', () => {
    const result = runOptimization({
      ...CTX,
      decisionVariables: ['ent-staffing-uplift', 'st-staff-constrained-sl'],
      objective: 'strongest_operational_improvement',
      noAdditionalStaffingCost: true,
    });
    expect(result.feasible).toBe(false);
    expect(result.infeasibleReason).toMatch(/no-additional-staffing-cost|constraint/i);
  });
});
