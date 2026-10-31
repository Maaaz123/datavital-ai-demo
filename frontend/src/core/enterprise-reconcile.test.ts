import { describe, expect, it } from 'vitest';
import {
  buildEnterpriseView,
  enterprisePrioritiesAreEvidenceLinked,
  enterpriseSignalsAreDomainDerived,
} from './enterpriseView';
import { buildRcmView } from './rcmView';
import { buildQsView } from './qualitySafetyView';
import { buildScView } from './supplyChainView';
import { buildStView } from './strategyView';
import { buildPxView } from './patientExperienceView';

describe('Enterprise cross-domain view', () => {
  it('derives every executive signal from a domain route and formula', () => {
    const view = buildEnterpriseView('H1', 2026, 'year');
    expect(view.signals.length).toBeGreaterThanOrEqual(8);
    expect(enterpriseSignalsAreDomainDerived(view)).toBe(true);
    for (const signal of view.signals) {
      expect(signal.sourceRoute.startsWith('/')).toBe(true);
      expect(Number.isFinite(signal.value)).toBe(true);
      expect(signal.display).not.toMatch(/NaN|undefined/);
    }
  });

  it('keeps 3–5 evidence-linked priorities with source domains', () => {
    const view = buildEnterpriseView('H2', 2026, 'Q1');
    expect(enterprisePrioritiesAreEvidenceLinked(view)).toBe(true);
  });

  it('matches RCM / QS / SC / ST / PX canonical values (no independent totals)', () => {
    const hospital = 'H1';
    const year = 2026;
    const period = 'year' as const;
    const view = buildEnterpriseView(hospital, year, period);
    const rcm = buildRcmView(hospital, year, period);
    const qs = buildQsView(hospital, year, period);
    const sc = buildScView(hospital, year, period);
    const st = buildStView(hospital, year, period);
    const px = buildPxView(hospital, year, period);

    expect(view.facts.netPatientRevenue).toBe(rcm.netPatientRevenue);
    expect(view.facts.grossDenialRate).toBe(rcm.grossDenialRate);
    expect(view.facts.netCollectionRate).toBe(rcm.netCollectionRate);
    expect(view.facts.validatedEventRate).toBe(qs.validatedEventRate);
    expect(view.facts.overdueHighRiskActions).toBe(qs.overdueHighRiskActions);
    expect(view.facts.qualityCompliance).toBe(qs.qualityCompliance);
    expect(view.facts.supplyAvailability).toBe(sc.supplyAvailability);
    expect(view.facts.criticalStockouts).toBe(sc.criticalStockouts);
    expect(view.facts.operatingContribution).toBe(st.operatingContribution);
    expect(view.facts.resourceUtilizationIndex).toBe(st.resourceUtilizationIndex);
    expect(view.facts.capacityConstrainedSl).toBe(st.capacityConstrainedSl);
    expect(view.facts.overallSatisfaction).toBe(px.overallSatisfaction);
  });

  it('documents bed identity without inventing cross-grain equality', () => {
    const view = buildEnterpriseView('H1', 2026, 'year');
    const occupiedShare = view.facts.occupancy;
    expect(occupiedShare).toBeGreaterThan(0);
    expect(occupiedShare).toBeLessThanOrEqual(1);
    expect(view.disclaimer).toMatch(/not Production Source Verified|not a live real-time/i);
  });

  it('exposes COO exception areas when pressure exists', () => {
    const view = buildEnterpriseView('H2', 2026, 'year');
    expect(Array.isArray(view.opsExceptions)).toBe(true);
    for (const item of view.opsExceptions) {
      expect(item.href.startsWith('/')).toBe(true);
      expect(item.evidence.length).toBeGreaterThan(5);
    }
  });
});
