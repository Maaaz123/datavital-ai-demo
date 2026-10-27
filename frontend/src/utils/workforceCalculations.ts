import type {
  EmployeeTarget,
  LicenseExpiryBand,
  LicenseStatus,
  MeasurementDirection,
  PerformanceStatus,
  ProfessionalLicense,
} from '@/types/workforce';

const MS_PER_DAY = 86_400_000;

/** Achievement % for a single target. Returns null when actual is unavailable. */
export function calculateTargetAchievement(
  targetValue: number,
  actualValue: number | null | undefined,
  direction: MeasurementDirection,
): number | null {
  if (actualValue == null || !Number.isFinite(actualValue) || !Number.isFinite(targetValue)) {
    return null;
  }
  if (targetValue === 0) {
    if (direction === 'higher_is_better') return actualValue >= 0 ? 100 : 0;
    return actualValue === 0 ? 100 : 0;
  }
  if (direction === 'higher_is_better') {
    return (actualValue / targetValue) * 100;
  }
  // lower-is-better: meeting or beating (lower) the target yields ≥100%
  if (actualValue === 0) return targetValue === 0 ? 100 : null;
  return (targetValue / actualValue) * 100;
}

/** Weighted overall achievement across targets with non-null achievement. */
export function calculateWeightedAchievement(
  targets: Array<Pick<EmployeeTarget, 'achievement_pct' | 'weight' | 'actual_value' | 'target_value' | 'direction'>>,
): number | null {
  let weightSum = 0;
  let weighted = 0;
  for (const t of targets) {
    const pct =
      t.achievement_pct ??
      calculateTargetAchievement(t.target_value, t.actual_value, t.direction);
    if (pct == null || !Number.isFinite(t.weight) || t.weight <= 0) continue;
    weighted += pct * t.weight;
    weightSum += t.weight;
  }
  if (weightSum <= 0) return null;
  return weighted / weightSum;
}

export function performanceStatusFromAchievement(pct: number | null): PerformanceStatus {
  if (pct == null || !Number.isFinite(pct)) return 'unavailable';
  if (pct >= 110) return 'exceeds_target';
  if (pct >= 100) return 'on_target';
  if (pct >= 85) return 'at_risk';
  return 'below_target';
}

export function daysUntilExpiry(expiryDate: string | null | undefined, asOf: Date = new Date()): number | null {
  if (!expiryDate) return null;
  const expiry = new Date(`${expiryDate.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(expiry.getTime())) return null;
  const start = new Date(asOf);
  start.setHours(0, 0, 0, 0);
  return Math.floor((expiry.getTime() - start.getTime()) / MS_PER_DAY);
}

/**
 * Derive expiry band from dates / verification — do not trust a hardcoded band on the record.
 */
export function deriveLicenseExpiryBand(
  license: Pick<ProfessionalLicense, 'license_number' | 'expiry_date' | 'verification_status' | 'renewal_status'> | null | undefined,
  asOf: Date = new Date(),
): LicenseExpiryBand {
  if (!license || !license.license_number) return 'missing';
  if (license.verification_status === 'unverified' || license.verification_status === 'pending') {
    return 'unverified';
  }
  const days = daysUntilExpiry(license.expiry_date, asOf);
  if (days == null) return 'missing';
  if (days < 0) return 'expired';
  if (days <= 7) return 'expiring_7';
  if (days <= 30) return 'expiring_30';
  if (days <= 60) return 'expiring_60';
  if (days <= 90) return 'expiring_90';
  return 'active';
}

export function deriveLicenseStatus(
  license: Pick<
    ProfessionalLicense,
    'license_number' | 'expiry_date' | 'verification_status' | 'renewal_status' | 'notes'
  > | null | undefined,
  asOf: Date = new Date(),
): LicenseStatus {
  if (!license || !license.license_number) return 'missing';
  if (license.notes?.toLowerCase().includes('suspended')) return 'suspended';
  if (license.renewal_status === 'in_progress') return 'renewal_in_progress';
  if (license.verification_status === 'unverified' || license.verification_status === 'pending') {
    return 'unverified';
  }
  const days = daysUntilExpiry(license.expiry_date, asOf);
  if (days == null) return 'missing';
  if (days < 0) return 'expired';
  if (days <= 90) return 'expiring_soon';
  return 'active';
}

export function enrichLicense(
  license: ProfessionalLicense,
  asOf: Date = new Date(),
): ProfessionalLicense {
  return {
    ...license,
    days_until_expiry: daysUntilExpiry(license.expiry_date, asOf),
    derived_expiry_band: deriveLicenseExpiryBand(license, asOf),
    derived_status: deriveLicenseStatus(license, asOf),
  };
}

export const LICENSE_EXPIRY_NOTIFICATION_RULES = [
  { band: 'expiring_90' as const, days_before: 90, recipients: ['employee', 'credentialing'] as const, escalate_if_no_action_days: 14 },
  { band: 'expiring_60' as const, days_before: 60, recipients: ['employee', 'direct_manager', 'credentialing'] as const, escalate_if_no_action_days: 10 },
  { band: 'expiring_30' as const, days_before: 30, recipients: ['employee', 'direct_manager', 'hr', 'credentialing'] as const, escalate_if_no_action_days: 7 },
  { band: 'expiring_7' as const, days_before: 7, recipients: ['employee', 'direct_manager', 'hr', 'credentialing'] as const, escalate_if_no_action_days: 2 },
  { band: 'on_expiry' as const, days_before: 0, recipients: ['employee', 'direct_manager', 'hr', 'credentialing'] as const, escalate_if_no_action_days: 1 },
];
