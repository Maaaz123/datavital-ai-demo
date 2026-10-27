/** Workforce Performance & Credentialing — typed domain model (demo-ready for future API). */

import type { DecisionPriority } from '@/types/product';

export type MeasurementDirection = 'higher_is_better' | 'lower_is_better';

export type EmploymentStatus = 'active' | 'on_leave' | 'terminated' | 'contractor';

export type PerformanceStatus = 'exceeds_target' | 'on_target' | 'at_risk' | 'below_target' | 'unavailable';

export type LicenseStatus =
  | 'active'
  | 'expiring_soon'
  | 'expired'
  | 'missing'
  | 'unverified'
  | 'suspended'
  | 'renewal_in_progress';

export type CredentialStatus = 'complete' | 'incomplete' | 'unverified' | 'expired' | 'action_required';

export type LicenseExpiryBand =
  | 'active'
  | 'expiring_90'
  | 'expiring_60'
  | 'expiring_30'
  | 'expiring_7'
  | 'expired'
  | 'missing'
  | 'unverified';

export type SpecialtyGroup =
  | 'doctors'
  | 'nursing'
  | 'pharmacy'
  | 'laboratory'
  | 'radiology'
  | 'surgery'
  | 'administration'
  | 'revenue_cycle'
  | 'support_services';

export interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  region: string;
  facility_key: number;
  facility_name: string;
  department_key: number;
  department_name: string;
  specialty: SpecialtyGroup;
  specialty_label: string;
  job_title: string;
  manager_id: string | null;
  manager_name: string | null;
  employment_status: EmploymentStatus;
  hire_date: string;
  attendance_rate: number | null;
  last_performance_review: string | null;
  overall_achievement_pct: number | null;
  performance_status: PerformanceStatus;
  credential_status: CredentialStatus;
  data_status: 'available' | 'partial' | 'unavailable';
}

export interface EmployeeTarget {
  target_id: string;
  target_name: string;
  description: string;
  employee_id: string;
  role_or_specialty: SpecialtyGroup | string;
  measurement_unit: string;
  target_value: number;
  actual_value: number | null;
  weight: number;
  direction: MeasurementDirection;
  reporting_period: string;
  data_source: string;
  status: PerformanceStatus;
  achievement_pct: number | null;
  last_updated: string;
  category: string;
}

export interface EmployeePerformanceSummary {
  employee_id: string;
  reporting_period: string;
  overall_achievement_pct: number | null;
  weighted_achievement_pct: number | null;
  previous_period_achievement_pct: number | null;
  targets_achieved: number;
  targets_at_risk: number;
  targets_below: number;
  targets_total: number;
  performance_status: PerformanceStatus;
  attendance_rate: number | null;
  last_updated: string | null;
  data_status: 'available' | 'partial' | 'unavailable';
}

export interface ProfessionalLicense {
  license_id: string;
  employee_id: string;
  license_type: string;
  license_number: string | null;
  issuing_authority: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  verification_status: 'verified' | 'unverified' | 'pending' | 'rejected';
  verification_date: string | null;
  verified_by: string | null;
  document_reference: string | null;
  renewal_status: 'not_required' | 'due' | 'in_progress' | 'completed' | 'overdue';
  renewal_owner: string | null;
  notes: string | null;
  last_updated: string;
  /** Derived — never persisted as source of truth when dates exist */
  derived_status?: LicenseStatus;
  derived_expiry_band?: LicenseExpiryBand;
  days_until_expiry?: number | null;
}

export interface Credential {
  credential_id: string;
  employee_id: string;
  credential_name: string;
  credential_type: string;
  mandatory: boolean;
  status: CredentialStatus;
  issued_date: string | null;
  expiry_date: string | null;
  verification_status: 'verified' | 'unverified' | 'pending';
  owner: string | null;
  document_reference: string | null;
  last_updated: string;
}

export interface WorkforceFilters {
  region?: string | null;
  facility_key?: number | null;
  department_key?: number | null;
  specialty?: SpecialtyGroup | string | null;
  job_title?: string | null;
  manager_id?: string | null;
  employment_status?: EmploymentStatus | string | null;
  performance_status?: PerformanceStatus | string | null;
  license_status?: LicenseStatus | string | null;
  date_from?: string | null;
  date_to?: string | null;
  search?: string | null;
  page?: number;
  page_size?: number;
  sort_by?: string | null;
  sort_order?: 'asc' | 'desc' | null;
}

export interface WorkforceDashboardSummary {
  overall_target_achievement: number | null;
  total_employees: number;
  employees_below_target: number;
  licenses_expiring_soon: number;
  expired_licenses: number;
  missing_licenses: number;
  unverified_credentials: number;
  stale_performance_records: number;
  missing_employee_identifiers: number;
  data_health_pct: number | null;
  generated_at: string;
  source_availability: 'demo' | 'partial' | 'live' | 'unavailable';
}

export interface WorkforcePriority extends DecisionPriority {
  owner: string;
}

export interface WorkforceTrendPoint {
  period: string;
  achievement_pct: number | null;
  previous_period_pct: number | null;
  facility_key?: number | null;
  department_key?: number | null;
}

export interface WorkforceAuditEvent {
  event_id: string;
  employee_id: string;
  event_type: string;
  summary: string;
  actor: string | null;
  occurred_at: string;
}

export interface WorkforceNotificationRule {
  band: LicenseExpiryBand | 'on_expiry';
  days_before: number | null;
  recipients: Array<'employee' | 'direct_manager' | 'hr' | 'credentialing'>;
  escalate_if_no_action_days: number;
}

export interface WorkforceEmployeeListItem extends Employee {
  target_value: number | null;
  actual_value: number | null;
  achievement_pct: number | null;
  license_number: string | null;
  licensing_authority: string | null;
  license_expiry_date: string | null;
  license_status: LicenseStatus;
  primary_license_type: string | null;
}

export interface DepartmentAchievementRow {
  department_key: number;
  department_name: string;
  achievement_pct: number;
  target_pct: number;
  below_target: boolean;
  employee_count: number;
}

export interface SpecialtyAchievementRow {
  specialty: SpecialtyGroup;
  specialty_label: string;
  achievement_pct: number;
  target_pct: number;
  employee_count: number;
}

export interface LicenseBandCount {
  band: LicenseExpiryBand;
  label: string;
  count: number;
}

export interface PerformanceDistributionBucket {
  status: PerformanceStatus;
  label: string;
  count: number;
}
