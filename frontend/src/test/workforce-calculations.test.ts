import { describe, it, expect } from 'vitest';
import {
  calculateTargetAchievement,
  calculateWeightedAchievement,
  daysUntilExpiry,
  deriveLicenseExpiryBand,
  deriveLicenseStatus,
  performanceStatusFromAchievement,
} from '@/utils/workforceCalculations';
import type { ProfessionalLicense } from '@/types/workforce';
import {
  fetchWorkforceKpis,
  fetchWorkforceSummary,
} from '@/api/workforce';

const asOf = new Date('2026-08-04T00:00:00');

function license(partial: Partial<ProfessionalLicense>): ProfessionalLicense {
  return {
    license_id: 'x',
    employee_id: 'e',
    license_type: 'Demo',
    license_number: 'N-1',
    issuing_authority: 'SCFHS',
    issue_date: '2024-01-01',
    expiry_date: '2027-01-01',
    verification_status: 'verified',
    verification_date: '2024-01-02',
    verified_by: 'Office',
    document_reference: 'DOC',
    renewal_status: 'not_required',
    renewal_owner: null,
    notes: null,
    last_updated: '2026-08-04',
    ...partial,
  };
}

describe('workforce calculations', () => {
  it('calculates higher-is-better achievement', () => {
    expect(calculateTargetAchievement(100, 110, 'higher_is_better')).toBeCloseTo(110);
    expect(calculateTargetAchievement(100, 80, 'higher_is_better')).toBeCloseTo(80);
  });

  it('calculates lower-is-better achievement', () => {
    expect(calculateTargetAchievement(10, 8, 'lower_is_better')).toBeCloseTo(125);
    expect(calculateTargetAchievement(10, 12, 'lower_is_better')).toBeCloseTo(83.333, 2);
  });

  it('returns null for missing actual', () => {
    expect(calculateTargetAchievement(10, null, 'higher_is_better')).toBeNull();
  });

  it('calculates weighted achievement', () => {
    const pct = calculateWeightedAchievement([
      { target_value: 100, actual_value: 100, direction: 'higher_is_better', weight: 0.5, achievement_pct: 100 },
      { target_value: 100, actual_value: 80, direction: 'higher_is_better', weight: 0.5, achievement_pct: 80 },
    ]);
    expect(pct).toBeCloseTo(90);
  });

  it('maps performance status bands', () => {
    expect(performanceStatusFromAchievement(115)).toBe('exceeds_target');
    expect(performanceStatusFromAchievement(100)).toBe('on_target');
    expect(performanceStatusFromAchievement(90)).toBe('at_risk');
    expect(performanceStatusFromAchievement(70)).toBe('below_target');
    expect(performanceStatusFromAchievement(null)).toBe('unavailable');
  });

  it('derives expiry bands from dates', () => {
    expect(daysUntilExpiry('2026-08-10', asOf)).toBe(6);
    expect(deriveLicenseExpiryBand(license({ expiry_date: '2026-07-01' }), asOf)).toBe('expired');
    expect(deriveLicenseExpiryBand(license({ expiry_date: '2026-08-08' }), asOf)).toBe('expiring_7');
    expect(deriveLicenseExpiryBand(license({ expiry_date: '2026-08-30' }), asOf)).toBe('expiring_30');
    expect(deriveLicenseExpiryBand(license({ expiry_date: '2026-09-20' }), asOf)).toBe('expiring_60');
    expect(deriveLicenseExpiryBand(license({ expiry_date: '2026-10-20' }), asOf)).toBe('expiring_90');
    expect(deriveLicenseExpiryBand(license({ expiry_date: '2027-08-04' }), asOf)).toBe('active');
  });

  it('derives expiry bands at exact day boundaries', () => {
    // asOf = 2026-08-04
    expect(deriveLicenseExpiryBand(license({ expiry_date: '2026-11-02' }), asOf)).toBe('expiring_90'); // exactly 90
    expect(deriveLicenseExpiryBand(license({ expiry_date: '2026-11-03' }), asOf)).toBe('active'); // 91
    expect(deriveLicenseExpiryBand(license({ expiry_date: '2026-10-03' }), asOf)).toBe('expiring_60'); // exactly 60
    expect(deriveLicenseExpiryBand(license({ expiry_date: '2026-09-03' }), asOf)).toBe('expiring_30'); // exactly 30
    expect(deriveLicenseExpiryBand(license({ expiry_date: '2026-08-11' }), asOf)).toBe('expiring_7'); // exactly 7
    expect(deriveLicenseExpiryBand(license({ expiry_date: '2026-08-04' }), asOf)).toBe('expiring_7'); // exactly 0
    expect(deriveLicenseExpiryBand(license({ expiry_date: '2026-08-03' }), asOf)).toBe('expired'); // 1 day after expiry
  });

  it('derives license status including missing and unverified', () => {
    expect(deriveLicenseStatus(license({ license_number: null }), asOf)).toBe('missing');
    expect(deriveLicenseStatus(license({ verification_status: 'unverified' }), asOf)).toBe('unverified');
    expect(deriveLicenseStatus(license({ renewal_status: 'in_progress' }), asOf)).toBe('renewal_in_progress');
    expect(deriveLicenseStatus(license({ expiry_date: '2026-07-01' }), asOf)).toBe('expired');
    expect(deriveLicenseStatus(license({ expiry_date: '2026-09-01' }), asOf)).toBe('expiring_soon');
  });
});

describe('workforce live adapter (demo disabled)', () => {
  it('returns unavailable KPIs when workforce gold is not deployed', async () => {
    const kpis = await fetchWorkforceKpis({});
    expect(kpis.data[0].key).toBe('overall_target_achievement');
    expect(kpis.data).toHaveLength(5);
    expect(kpis.data.every((k) => k.data_status === 'unavailable')).toBe(true);
    expect(kpis.data[0].value).toBeNull();
    const summary = await fetchWorkforceSummary({});
    expect(summary.data.source_availability).toBe('unavailable');
    expect(summary.data.total_employees).toBe(0);
    expect(summary.data.overall_target_achievement).toBeNull();
  });
});
