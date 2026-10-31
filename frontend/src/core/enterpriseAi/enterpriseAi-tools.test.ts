/**
 * Stage 2 — tool schemas + numeric grounding.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { clearStViewCache } from '../strategyView';
import { executeTool, listTools, resetToolSeq, resolveMetric, getMetric } from './index';

const CTX = { hospital: 'H1', year: 2026, period: 'year' as const };

describe('Enterprise AI tools', () => {
  beforeEach(() => {
    resetToolSeq();
    clearStViewCache();
  });

  it('registers all contracted tool ids', () => {
    const ids = listTools().map((t) => t.id);
    for (const id of [
      'get_metric',
      'get_metric_definition',
      'get_metric_trend',
      'compare_periods',
      'compare_hospitals',
      'retrieve_domain_evidence',
      'retrieve_cross_domain_evidence',
      'check_reconciliation',
      'find_related_alerts',
      'inspect_data_quality',
      'get_scenario_baseline',
      'run_what_if',
      'compare_interventions',
      'get_forecast',
      'create_decision_proposal',
      'get_decision_status',
    ]) {
      expect(ids).toContain(id);
    }
    expect(ids.length).toBe(16);
  });

  it('get_metric returns registry values only (no invented NPR)', () => {
    const result = executeTool('get_metric', { ...CTX, metricId: 'rcm.net_patient_revenue' });
    expect(result.ok).toBe(true);
    const expected = resolveMetric('rcm.net_patient_revenue', CTX);
    expect(result.output.value).toBe(expected);
    expect(getMetric('rcm.net_patient_revenue')!.unit).toBe('SAR');
  });

  it('rejects unknown metric ids', () => {
    const result = executeTool('get_metric', { ...CTX, metricId: 'not.real' });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Unknown metric/i);
  });

  it('check_reconciliation grounds revenue lineage', () => {
    const result = executeTool('check_reconciliation', { ...CTX });
    expect(result.ok).toBe(true);
    expect(result.output.ok).toBe(true);
  });

  it('compare_interventions rejects staffing-cost option under constraint', () => {
    const result = executeTool('compare_interventions', {
      ...CTX,
      optionIds: ['ent-bed-assign-flow', 'ent-staffing-uplift'],
      noAdditionalStaffingCost: true,
    });
    expect(result.ok).toBe(true);
    const rejected = result.output.rejected as { optionIds: string[]; reason: string }[];
    expect(rejected.some((r) => r.optionIds.includes('ent-staffing-uplift'))).toBe(true);
  });

  it('get_metric_definition exposes schema fields', () => {
    const result = executeTool('get_metric_definition', { metricId: 'beds.occupancy' });
    expect(result.ok).toBe(true);
    expect(result.output.periodSemantics).toBeTruthy();
    expect(result.output.dataReadiness).toBe('Demo Available');
  });
});
