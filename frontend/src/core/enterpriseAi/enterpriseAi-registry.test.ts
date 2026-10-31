/**
 * Domain 16 Stage 1 — metric registry + reconciliation gate.
 */
import { describe, expect, it } from 'vitest';
import { clearScViewCache } from '../supplyChainView';
import { clearStViewCache } from '../strategyView';
import {
  assertNoPatientCausality,
  getMetric,
  listKnowledgeEdges,
  listMetrics,
  listOwningDomains,
  reconcileIcuStrategyGap,
  reconcileRcmStrategyRevenue,
  reconcileScAvailabilityBounds,
  requireMetric,
  resolveMetric,
  runStage1ReconciliationGate,
} from './index';

const CTX = { hospital: 'H1', year: 2026, period: 'year' as const };

describe('Enterprise AI metric registry', () => {
  it('looks up registered metrics by id', () => {
    const npr = getMetric('rcm.net_patient_revenue');
    expect(npr).toBeTruthy();
    expect(npr!.owningDomain).toBe('Revenue Cycle');
    expect(npr!.dataReadiness).toBe('Demo Available');
    expect(requireMetric('st.recognized_net_revenue').name).toMatch(/recognized/i);
    expect(() => requireMetric('not.a.metric')).toThrow(/Unknown enterprise AI metric/);
  });

  it('covers essential metrics across 15 domains', () => {
    const domains = listOwningDomains().filter((d) => d !== 'Enterprise');
    expect(domains.length).toBeGreaterThanOrEqual(15);
    expect(listMetrics().length).toBeGreaterThanOrEqual(30);
    for (const id of [
      'ed.wait.median_min',
      'beds.occupancy',
      'icu.staffing_gap_hours',
      'ipd.admissions',
      'opd.visits',
      'appt.no_show_rate',
      'surg.or_utilization',
      'lab.pending_validation',
      'rad.closing_backlog',
      'rx.dispense_rate',
      'rcm.net_patient_revenue',
      'st.recognized_net_revenue',
      'sc.supply_availability',
      'qs.clabsi_rate',
      'px.overall_satisfaction',
    ]) {
      expect(getMetric(id), id).toBeTruthy();
      const value = resolveMetric(id, CTX);
      expect(value === null || Number.isFinite(value), id).toBe(true);
    }
  });

  it('resolves RCM NPR === Strategy recognized revenue via registry sourceFns', () => {
    clearStViewCache();
    const rcm = resolveMetric('rcm.net_patient_revenue', CTX);
    const st = resolveMetric('st.recognized_net_revenue', CTX);
    const ent = resolveMetric('ent.net_patient_revenue', CTX);
    expect(rcm).toBeTruthy();
    expect(st).toBe(rcm);
    expect(ent).toBe(rcm);
  });

  it('keeps ICU gap parity between ICU and Strategy mirror metrics', () => {
    clearStViewCache();
    const icu = resolveMetric('icu.staffing_gap_hours', CTX);
    const stMirror = resolveMetric('st.icu_staffing_gap_hours', CTX);
    const enterprise = resolveMetric('st.enterprise_staffing_gap_hours', CTX);
    expect(icu).toBe(stMirror);
    expect(Number.isFinite(enterprise!)).toBe(true);
    // Scopes may differ — registry exposes both.
    expect(getMetric('st.enterprise_staffing_gap_hours')!.qualityNotes).toMatch(/Distinct from ICU|≠ automatic ICU/i);
  });

  it('keeps SC availability and OTD in [0, 1]', () => {
    clearScViewCache();
    const availability = resolveMetric('sc.supply_availability', CTX)!;
    const otd = resolveMetric('sc.supplier_otd', CTX)!;
    expect(availability).toBeGreaterThanOrEqual(0);
    expect(availability).toBeLessThanOrEqual(1);
    expect(otd).toBeGreaterThanOrEqual(0);
    expect(otd).toBeLessThanOrEqual(1);
  });
});

describe('Enterprise AI reconciliation gate', () => {
  it('passes RCM↔ST revenue, ICU↔ST ICU gap, and SC bounds for H1 FY2026', () => {
    clearStViewCache();
    clearScViewCache();
    expect(reconcileRcmStrategyRevenue(CTX).ok).toBe(true);
    expect(reconcileIcuStrategyGap(CTX).ok).toBe(true);
    expect(reconcileScAvailabilityBounds(CTX).ok).toBe(true);
    const gate = runStage1ReconciliationGate(CTX);
    expect(gate.ok).toBe(true);
    expect(gate.checks).toHaveLength(3);
  });

  it('samples H3 (pressure site) for dual staffing scopes', () => {
    clearStViewCache();
    const gap = reconcileIcuStrategyGap({ hospital: 'H3', year: 2026, period: 'year' });
    expect(gap.ok).toBe(true);
    expect(gap.note).toMatch(/Enterprise gap|distinct scope/i);
  });
});

describe('Enterprise AI knowledge graph', () => {
  it('declares operational/associative edges only (no patient causality)', () => {
    const edges = listKnowledgeEdges();
    expect(edges.length).toBeGreaterThanOrEqual(8);
    expect(assertNoPatientCausality(edges)).toBe(true);
    expect(edges.some((e) => e.id === 'ed-boarding-beds')).toBe(true);
    expect(edges.some((e) => e.id === 'revenue-sl-contribution')).toBe(true);
    expect(edges.some((e) => e.id === 'quality-investigation-capa')).toBe(true);
    for (const edge of edges) {
      expect(['associative', 'operational-link']).toContain(edge.causalClaim);
    }
  });
});
