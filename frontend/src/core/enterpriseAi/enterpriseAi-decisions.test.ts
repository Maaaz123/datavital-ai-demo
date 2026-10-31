import { beforeEach, describe, expect, it } from 'vitest';
import { clearStViewCache } from '../strategyView';
import {
  approveDecision,
  clearDecisionStore,
  clearOutcomeStore,
  createDecisionProposal,
  getOutcome,
  listDecisions,
  resolveMetric,
  transitionDecision,
} from './index';

describe('Enterprise AI decisions', () => {
  beforeEach(() => {
    clearDecisionStore();
    clearOutcomeStore();
    clearStViewCache();
  });

  it('walks lifecycle Draft → Under Review → Approved without mutating RCM NPR', () => {
    const nprBefore = resolveMetric('rcm.net_patient_revenue', { hospital: 'H1', year: 2026, period: 'year' });
    const proposal = createDecisionProposal({
      title: 'No-staffing-cost flow intervention',
      question: 'Approve bed assignment path?',
      rationale: 'Illustrative operational relief',
      options: [
        {
          id: 'ent-bed-assign-flow',
          label: 'Bed assignment',
          increasesStaffingCost: false,
          expectedBenefitNote: 'Lower ED wait (illustrative)',
          simulationIds: [],
        },
      ],
      recommendedOptionId: 'ent-bed-assign-flow',
    });
    expect(proposal.status).toBe('Draft');
    expect(proposal.storageLabel).toBe('demo-session-state');

    const approved = approveDecision(proposal.id);
    expect(approved.ok).toBe(true);
    expect(approved.decision?.status).toBe('Approved');
    expect(approved.nprBefore).toBe(nprBefore);
    expect(approved.nprAfter).toBe(nprBefore);

    const nprAfter = resolveMetric('rcm.net_patient_revenue', { hospital: 'H1', year: 2026, period: 'year' });
    expect(nprAfter).toBe(nprBefore);

    const outcome = proposal.outcomeId ? getOutcome(proposal.outcomeId) : null;
    expect(outcome?.observed).toBe('Outcome not yet measured');
    expect(outcome?.observedStatus).toBe('not_yet_measured');
  });

  it('supports reject and defer paths', () => {
    const proposal = createDecisionProposal({
      title: 'Defer test',
      question: 'q',
      rationale: 'r',
      options: [
        {
          id: 'st-supply-efficiency',
          label: 'Supply',
          increasesStaffingCost: false,
          expectedBenefitNote: 'stockouts',
          simulationIds: [],
        },
      ],
    });
    expect(transitionDecision(proposal.id, 'Deferred').ok).toBe(true);
    expect(listDecisions()[0]?.status).toBe('Deferred');
  });
});
