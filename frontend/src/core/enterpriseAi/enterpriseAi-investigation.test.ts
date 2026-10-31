import { describe, expect, it } from 'vitest';
import { evaluateContradiction, runInvestigation } from './index';

describe('Enterprise AI investigation', () => {
  it('returns driver statuses without definitive false causality', () => {
    const report = runInvestigation({
      hospital: 'H1',
      year: 2026,
      period: 'year',
      focusMetricId: 'ed.wait.median_min',
    });
    expect(report.drivers.length).toBeGreaterThan(0);
    expect(report.domainsTouched.length).toBeGreaterThanOrEqual(2);
    for (const driver of report.drivers) {
      expect(['supported', 'partially_supported', 'contradicted', 'insufficient_evidence']).toContain(driver.status);
      // Never leave a raw "supported" definitive root cause from correlation alone.
      expect(driver.status).not.toBe('supported');
      expect(driver.causalClaim === 'associative' || driver.causalClaim === 'operational-link').toBe(true);
    }
    expect(report.disclaimer).toMatch(/not definitive root cause|correlation/i);
  });

  it('marks contradiction when related metric moves opposite expected co-movement', () => {
    expect(evaluateContradiction('co-move', 0.2, -0.1)).toBe('contradicted');
    expect(evaluateContradiction('co-move', 0.2, 0.1)).toBe('partially_supported');
    expect(evaluateContradiction('inverse', 0.2, 0.1)).toBe('contradicted');
  });

  it('touches multiple domains on expanded investigation', () => {
    const report = runInvestigation({
      hospital: 'H1',
      year: 2026,
      additionalMetricIds: [
        'beds.occupancy',
        'icu.staffing_gap_hours',
        'rcm.net_patient_revenue',
        'sc.critical_stockouts',
      ],
    });
    expect(report.domainsTouched.length).toBeGreaterThanOrEqual(4);
    expect(report.reconciliationOk).toBe(true);
  });
});
