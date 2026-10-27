/**
 * Workforce API facade.
 * Currently backed by deterministic demo adapters — NOT live HIS/analytics data.
 * Swap implementations here when `/workforce/*` backend endpoints exist.
 */
import type { ApiResponse, ChartPayload, KPICardData } from '@/types/api';
import type {
  Credential,
  DepartmentAchievementRow,
  Employee,
  EmployeePerformanceSummary,
  EmployeeTarget,
  LicenseBandCount,
  LicenseExpiryBand,
  PerformanceDistributionBucket,
  ProfessionalLicense,
  SpecialtyAchievementRow,
  WorkforceAuditEvent,
  WorkforceDashboardSummary,
  WorkforceEmployeeListItem,
  WorkforceFilters,
  WorkforcePriority,
  WorkforceTrendPoint,
} from '@/types/workforce';
import {
  DEMO_AS_OF,
  DEMO_AUDIT,
  DEMO_CREDENTIALS,
  DEMO_EMPLOYEES,
  DEMO_LICENSES,
  DEMO_TARGETS,
  DEMO_TRENDS,
  SPECIALTY_LABELS,
} from '@/data/workforceDemoData';
import {
  deriveLicenseExpiryBand,
  deriveLicenseStatus,
  enrichLicense,
  performanceStatusFromAchievement,
} from '@/utils/workforceCalculations';
import { brand } from '@/design-system/colors';

/** Live workforce gold mart is not deployed; demo fixtures are disabled for KPI integrity. */
const DEMO_MODE = false;

function asOfDate(): Date {
  return new Date(`${DEMO_AS_OF}T00:00:00`);
}

function matchesFilters(emp: Employee, filters: WorkforceFilters): boolean {
  if (filters.region && emp.region !== filters.region) return false;
  if (filters.facility_key != null && emp.facility_key !== filters.facility_key) return false;
  if (filters.department_key != null && emp.department_key !== filters.department_key) return false;
  if (filters.specialty && emp.specialty !== filters.specialty) return false;
  if (filters.job_title && emp.job_title !== filters.job_title) return false;
  if (filters.manager_id && emp.manager_id !== filters.manager_id) return false;
  if (filters.employment_status && emp.employment_status !== filters.employment_status) return false;
  if (filters.performance_status && emp.performance_status !== filters.performance_status) return false;
  if (filters.search) {
    const q = filters.search.trim().toLowerCase();
    if (
      !emp.full_name.toLowerCase().includes(q) &&
      !emp.employee_code.toLowerCase().includes(q) &&
      !emp.id.toLowerCase().includes(q)
    ) {
      return false;
    }
  }
  if (filters.license_status) {
    const lic = primaryLicense(emp.id);
    const status = deriveLicenseStatus(lic, asOfDate());
    if (status !== filters.license_status) return false;
  }
  return true;
}

/** Public demo route uses /workforce/employees/demo for the first synthetic profile. */
function canonicalEmployeeId(id: string): string {
  if (id === 'demo') return DEMO_EMPLOYEES[0]?.id ?? id;
  return id;
}

function primaryLicense(employeeId: string): ProfessionalLicense | undefined {
  return DEMO_LICENSES.find((l) => l.employee_id === employeeId);
}

function toListItem(emp: Employee): WorkforceEmployeeListItem {
  const targets = DEMO_TARGETS.filter((t) => t.employee_id === emp.id);
  const lic = primaryLicense(emp.id);
  const enriched = lic ? enrichLicense(lic, asOfDate()) : undefined;
  const primaryTarget = targets[0];
  return {
    ...emp,
    target_value: primaryTarget?.target_value ?? null,
    actual_value: primaryTarget?.actual_value ?? null,
    achievement_pct: emp.overall_achievement_pct,
    license_number: enriched?.license_number ?? null,
    licensing_authority: enriched?.issuing_authority ?? null,
    license_expiry_date: enriched?.expiry_date ?? null,
    license_status: enriched?.derived_status ?? 'missing',
    primary_license_type: enriched?.license_type ?? null,
  };
}

function filteredEmployees(filters: WorkforceFilters): Employee[] {
  return DEMO_EMPLOYEES.filter((e) => matchesFilters(e, filters));
}

export async function fetchWorkforceSummary(filters: WorkforceFilters = {}): Promise<ApiResponse<WorkforceDashboardSummary>> {
  if (!DEMO_MODE) {
    const generated_at = new Date().toISOString();
    return {
      success: true,
      data: {
        overall_target_achievement: null,
        total_employees: 0,
        employees_below_target: 0,
        licenses_expiring_soon: 0,
        expired_licenses: 0,
        missing_licenses: 0,
        unverified_credentials: 0,
        stale_performance_records: 0,
        missing_employee_identifiers: 0,
        data_health_pct: null,
        generated_at,
        source_availability: 'unavailable',
      },
      generated_at,
    };
  }
  const employees = filteredEmployees(filters);
  const licenses = DEMO_LICENSES.filter((l) => employees.some((e) => e.id === l.employee_id)).map((l) =>
    enrichLicense(l, asOfDate()),
  );
  const achievements = employees
    .map((e) => e.overall_achievement_pct)
    .filter((v): v is number => v != null && Number.isFinite(v));
  const overall =
    achievements.length > 0 ? achievements.reduce((a, b) => a + b, 0) / achievements.length : null;

  const licensesExpiringSoon = licenses.filter((l) => {
    const band = l.derived_expiry_band;
    return band === 'expiring_90' || band === 'expiring_60' || band === 'expiring_30' || band === 'expiring_7';
  }).length;
  const expired = licenses.filter((l) => l.derived_expiry_band === 'expired').length;
  const missing = licenses.filter((l) => l.derived_expiry_band === 'missing').length +
    employees.filter((e) => !primaryLicense(e.id)).length;
  // Count explicitly unverified credentials (not pending/in-progress).
  const unverifiedCreds = DEMO_CREDENTIALS.filter(
    (c) =>
      employees.some((e) => e.id === c.employee_id) &&
      (c.verification_status === 'unverified' || c.status === 'unverified'),
  ).length;
  const stale = employees.filter((e) => !e.last_performance_review || e.last_performance_review < '2026-05-01').length;
  const missingIds = employees.filter((e) => !e.employee_code).length;

  const summary: WorkforceDashboardSummary = {
    overall_target_achievement: overall == null ? null : Math.round(overall * 10) / 10,
    total_employees: employees.length,
    employees_below_target: employees.filter((e) => e.performance_status === 'below_target').length,
    licenses_expiring_soon: licensesExpiringSoon,
    expired_licenses: expired,
    missing_licenses: missing,
    unverified_credentials: unverifiedCreds,
    stale_performance_records: stale,
    missing_employee_identifiers: missingIds,
    data_health_pct: 92,
    generated_at: new Date().toISOString(),
    source_availability: DEMO_MODE ? 'demo' : 'live',
  };

  return { success: true, data: summary, generated_at: summary.generated_at };
}

export async function fetchWorkforceKpis(filters: WorkforceFilters = {}): Promise<ApiResponse<KPICardData[]>> {
  if (!DEMO_MODE) {
    const reason = 'Workforce gold mart is not deployed; demo fixtures are disabled';
    return {
      success: true,
      data: [
        {
          key: 'overall_target_achievement',
          label: 'Overall Target Achievement',
          value: null,
          unit: '%',
          format: 'percent',
          data_status: 'unavailable',
          unavailable_reason: reason,
          severity: 'inactive',
        },
        {
          key: 'total_employees',
          label: 'Total Employees',
          value: null,
          format: 'number',
          data_status: 'unavailable',
          unavailable_reason: reason,
          severity: 'inactive',
        },
        {
          key: 'employees_below_target',
          label: 'Employees Below Target',
          value: null,
          format: 'number',
          data_status: 'unavailable',
          unavailable_reason: reason,
          severity: 'inactive',
        },
        {
          key: 'licenses_expiring_soon',
          label: 'Licenses Expiring Soon',
          value: null,
          format: 'number',
          data_status: 'unavailable',
          unavailable_reason: reason,
          severity: 'inactive',
        },
        {
          key: 'expired_licenses',
          label: 'Expired Licenses',
          value: null,
          format: 'number',
          data_status: 'unavailable',
          unavailable_reason: reason,
          severity: 'inactive',
        },
      ],
      generated_at: new Date().toISOString(),
    };
  }
  const { data: s } = await fetchWorkforceSummary(filters);
  const overall = s.overall_target_achievement;
  const kpis: KPICardData[] = [
    {
      key: 'overall_target_achievement',
      label: 'Overall Target Achievement',
      value: overall ?? null,
      unit: '%',
      format: 'percent',
      severity: performanceStatusFromAchievement(overall) === 'below_target' ? 'critical' : performanceStatusFromAchievement(overall) === 'at_risk' ? 'warning' : 'healthy',
      trend: 1.2,
      trend_direction: 'up',
      is_improvement: true,
      data_status: overall == null ? 'unavailable' : 'available',
      unavailable_reason: overall == null ? 'No employee achievement rows for the current filters' : undefined,
      tooltip: 'Weighted average of employee target achievement for the selected filters (demo).',
      formula: 'Σ(achievement × weight) / Σ(weight), then averaged across employees',
    },
    {
      key: 'total_employees',
      label: 'Total Employees',
      value: s.total_employees,
      format: 'number',
      severity: 'info',
      data_status: 'available',
    },
    {
      key: 'employees_below_target',
      label: 'Employees Below Target',
      value: s.employees_below_target,
      format: 'number',
      severity: s.employees_below_target > 0 ? 'warning' : 'healthy',
      data_status: 'available',
    },
    {
      key: 'licenses_expiring_soon',
      label: 'Licenses Expiring Soon',
      value: s.licenses_expiring_soon,
      format: 'number',
      severity: s.licenses_expiring_soon > 0 ? 'warning' : 'healthy',
      data_status: 'available',
      tooltip: 'Licenses within 90 days of expiry (derived from dates).',
    },
    {
      key: 'expired_licenses',
      label: 'Expired Licenses',
      value: s.expired_licenses,
      format: 'number',
      severity: s.expired_licenses > 0 ? 'critical' : 'healthy',
      data_status: 'available',
    },
  ];
  return { success: true, data: kpis, generated_at: s.generated_at };
}

export async function fetchDepartmentAchievement(filters: WorkforceFilters = {}): Promise<ApiResponse<DepartmentAchievementRow[]>> {
  const employees = filteredEmployees(filters);
  const byDept = new Map<number, Employee[]>();
  for (const e of employees) {
    const list = byDept.get(e.department_key) ?? [];
    list.push(e);
    byDept.set(e.department_key, list);
  }
  const rows: DepartmentAchievementRow[] = [...byDept.entries()].map(([department_key, list]) => {
    const vals = list.map((e) => e.overall_achievement_pct).filter((v): v is number => v != null);
    const achievement_pct = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    const target_pct = 100;
    return {
      department_key,
      department_name: list[0].department_name,
      achievement_pct: Math.round(achievement_pct * 10) / 10,
      target_pct,
      below_target: achievement_pct < target_pct,
      employee_count: list.length,
    };
  });
  rows.sort((a, b) => a.achievement_pct - b.achievement_pct);
  return { success: true, data: rows };
}

export async function fetchSpecialtyAchievement(filters: WorkforceFilters = {}): Promise<ApiResponse<SpecialtyAchievementRow[]>> {
  const employees = filteredEmployees(filters);
  const bySpec = new Map<string, Employee[]>();
  for (const e of employees) {
    const list = bySpec.get(e.specialty) ?? [];
    list.push(e);
    bySpec.set(e.specialty, list);
  }
  const rows: SpecialtyAchievementRow[] = [...bySpec.entries()].map(([specialty, list]) => {
    const vals = list.map((e) => e.overall_achievement_pct).filter((v): v is number => v != null);
    const achievement_pct = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    return {
      specialty: specialty as SpecialtyAchievementRow['specialty'],
      specialty_label: SPECIALTY_LABELS[specialty as keyof typeof SPECIALTY_LABELS] ?? list[0].specialty_label,
      achievement_pct: Math.round(achievement_pct * 10) / 10,
      target_pct: 100,
      employee_count: list.length,
    };
  });
  rows.sort((a, b) => a.specialty_label.localeCompare(b.specialty_label));
  return { success: true, data: rows };
}

export async function fetchPerformanceDistribution(filters: WorkforceFilters = {}): Promise<ApiResponse<PerformanceDistributionBucket[]>> {
  const employees = filteredEmployees(filters);
  const labels: Record<string, string> = {
    exceeds_target: 'Exceeds Target',
    on_target: 'On Target',
    at_risk: 'At Risk',
    below_target: 'Below Target',
    unavailable: 'Unavailable',
  };
  const order = ['exceeds_target', 'on_target', 'at_risk', 'below_target'] as const;
  const buckets = order.map((status) => ({
    status,
    label: labels[status],
    count: employees.filter((e) => e.performance_status === status).length,
  }));
  return { success: true, data: buckets };
}

export async function fetchLicenseBandCounts(filters: WorkforceFilters = {}): Promise<ApiResponse<LicenseBandCount[]>> {
  const employees = filteredEmployees(filters);
  const labels: Record<LicenseExpiryBand, string> = {
    active: 'Active',
    expiring_90: 'Expiring in 90 days',
    expiring_60: 'Expiring in 60 days',
    expiring_30: 'Expiring in 30 days',
    expiring_7: 'Expiring in 7 days',
    expired: 'Expired',
    missing: 'Missing',
    unverified: 'Unverified',
  };
  const counts: Record<LicenseExpiryBand, number> = {
    active: 0,
    expiring_90: 0,
    expiring_60: 0,
    expiring_30: 0,
    expiring_7: 0,
    expired: 0,
    missing: 0,
    unverified: 0,
  };
  for (const e of employees) {
    const lic = primaryLicense(e.id);
    const band = deriveLicenseExpiryBand(lic, asOfDate());
    counts[band] += 1;
  }
  const data = (Object.keys(labels) as LicenseExpiryBand[]).map((band) => ({
    band,
    label: labels[band],
    count: counts[band],
  }));
  return { success: true, data };
}

export async function fetchWorkforceTrend(filters: WorkforceFilters = {}): Promise<ApiResponse<ChartPayload>> {
  void filters;
  const payload: ChartPayload = {
    chart_type: 'line',
    categories: DEMO_TRENDS.map((t) => t.period),
    series: [
      { name: 'Current period', data: DEMO_TRENDS.map((t) => t.achievement_pct) },
      { name: 'Previous period', data: DEMO_TRENDS.map((t) => t.previous_period_pct) },
    ],
  };
  return { success: true, data: payload };
}

export function departmentAchievementChart(rows: DepartmentAchievementRow[]): ChartPayload {
  return {
    chart_type: 'horizontal_bar',
    categories: rows.map((r) => r.department_name),
    series: [
      { name: 'Actual achievement', data: rows.map((r) => r.achievement_pct) },
      { name: 'Target', data: rows.map((r) => r.target_pct) },
    ],
    meta: {
      below_target_flags: rows.map((r) => r.below_target),
      target_line: 100,
      orientation: 'horizontal',
    },
  };
}

export function specialtyAchievementChart(rows: SpecialtyAchievementRow[]): ChartPayload {
  return {
    chart_type: 'bar',
    categories: rows.map((r) => r.specialty_label),
    series: [
      { name: 'Actual', data: rows.map((r) => r.achievement_pct) },
      { name: 'Target', data: rows.map((r) => r.target_pct) },
    ],
  };
}

export function performanceDistributionChart(buckets: PerformanceDistributionBucket[]): ChartPayload {
  return {
    chart_type: 'pie',
    categories: buckets.map((b) => b.label),
    series: [{ name: 'Employees', data: buckets.map((b) => b.count) }],
    meta: {
      colors: [brand.positive, brand.primaryBlue, brand.warning, brand.critical],
    },
  };
}

export function licenseBandChart(bands: LicenseBandCount[]): ChartPayload {
  return {
    chart_type: 'bar',
    categories: bands.map((b) => b.label),
    series: [{ name: 'Licenses', data: bands.map((b) => b.count) }],
  };
}

export async function fetchWorkforcePriorities(filters: WorkforceFilters = {}): Promise<ApiResponse<WorkforcePriority[]>> {
  const employees = filteredEmployees(filters);
  const priorities: WorkforcePriority[] = [];

  for (const e of employees) {
    const lic = enrichLicense(primaryLicense(e.id) ?? ({
      license_id: `missing-${e.id}`,
      employee_id: e.id,
      license_type: 'Required license',
      license_number: null,
      issuing_authority: null,
      issue_date: null,
      expiry_date: null,
      verification_status: 'unverified',
      verification_date: null,
      verified_by: null,
      document_reference: null,
      renewal_status: 'overdue',
      renewal_owner: null,
      notes: null,
      last_updated: DEMO_AS_OF,
    } as ProfessionalLicense), asOfDate());

    if (lic.derived_status === 'expired') {
      priorities.push({
        id: `expired-${e.id}`,
        severity: 'critical',
        issue: `Expired professional license for ${e.full_name}`,
        area: e.department_name,
        metricLabel: 'License status',
        metricValue: 'Expired',
        investigation: 'Confirm practice restrictions and start emergency renewal.',
        owner: lic.renewal_owner ?? e.manager_name ?? 'Credentialing',
        href: `/workforce/employees/${e.id}`,
      });
    } else if (lic.derived_expiry_band === 'expiring_7' || lic.derived_expiry_band === 'expiring_30') {
      priorities.push({
        id: `expiring-${e.id}`,
        severity: lic.derived_expiry_band === 'expiring_7' ? 'critical' : 'warning',
        issue: `License expiring within ${lic.derived_expiry_band === 'expiring_7' ? '7' : '30'} days — ${e.full_name}`,
        area: e.department_name,
        metricLabel: 'Days until expiry',
        metricValue: String(lic.days_until_expiry ?? '—'),
        investigation: 'Open renewal workflow and notify manager and credentialing.',
        owner: lic.renewal_owner ?? e.manager_name ?? 'Credentialing',
        href: `/workforce/employees/${e.id}`,
      });
    }

    if (lic.derived_status === 'missing') {
      priorities.push({
        id: `missing-lic-${e.id}`,
        severity: 'critical',
        issue: `Missing mandatory credential/license — ${e.full_name}`,
        area: e.department_name,
        metricLabel: 'License status',
        metricValue: 'Missing',
        investigation: 'Collect documentation and assign credentialing owner.',
        owner: e.manager_name ?? 'HR',
        href: `/workforce/employees/${e.id}`,
      });
    }

    if (e.performance_status === 'below_target') {
      priorities.push({
        id: `below-${e.id}`,
        severity: 'warning',
        issue: `Employee below minimum target — ${e.full_name}`,
        area: e.department_name,
        metricLabel: 'Achievement',
        metricValue: e.overall_achievement_pct != null ? `${e.overall_achievement_pct.toFixed(1)}%` : '—',
        investigation: 'Review target mix with manager and open coaching plan.',
        owner: e.manager_name ?? 'Department manager',
        href: `/workforce/employees/${e.id}`,
      });
    }

    if (lic.renewal_owner == null && (lic.renewal_status === 'due' || lic.renewal_status === 'overdue' || lic.notes?.includes('unassigned'))) {
      priorities.push({
        id: `owner-${e.id}`,
        severity: 'warning',
        issue: `Compliance exception without assigned owner — ${e.full_name}`,
        area: e.department_name,
        metricLabel: 'Renewal owner',
        metricValue: 'Unassigned',
        investigation: 'Assign HR/credentialing owner and escalate if idle.',
        owner: 'Credentialing',
        href: `/workforce/employees/${e.id}`,
      });
    }
  }

  const deptRows = (await fetchDepartmentAchievement(filters)).data.filter((d) => d.below_target);
  for (const d of deptRows.slice(0, 2)) {
    priorities.push({
      id: `dept-${d.department_key}`,
      severity: d.achievement_pct < 85 ? 'critical' : 'warning',
      issue: `Department below target — ${d.department_name}`,
      area: d.department_name,
      metricLabel: 'Department achievement',
      metricValue: `${d.achievement_pct}%`,
      investigation: 'Compare specialty mix and staffing against targets.',
      owner: 'Department manager',
      href: `/workforce?department_key=${d.department_key}`,
    });
  }

  const unverified = DEMO_CREDENTIALS.filter(
    (c) => employees.some((e) => e.id === c.employee_id) && c.verification_status !== 'verified',
  );
  for (const c of unverified.slice(0, 2)) {
    const emp = employees.find((e) => e.id === c.employee_id);
    if (!emp) continue;
    priorities.push({
      id: `cred-${c.credential_id}`,
      severity: 'info',
      issue: `Credential awaiting verification — ${c.credential_name}`,
      area: emp.full_name,
      metricLabel: 'Verification',
      metricValue: c.verification_status,
      investigation: 'Complete verification checklist; do not expose document contents.',
      owner: c.owner ?? 'Credentialing',
      href: `/workforce/employees/${emp.id}`,
    });
  }

  const severityRank = { critical: 0, warning: 1, info: 2 } as const;
  priorities.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
  return { success: true, data: priorities };
}

export async function fetchWorkforceEmployees(filters: WorkforceFilters = {}): Promise<ApiResponse<WorkforceEmployeeListItem[]>> {
  let rows = filteredEmployees(filters).map(toListItem);
  const sortBy = filters.sort_by ?? 'full_name';
  const order = filters.sort_order === 'desc' ? -1 : 1;
  rows = [...rows].sort((a, b) => {
    const av = (a as unknown as Record<string, unknown>)[sortBy];
    const bv = (b as unknown as Record<string, unknown>)[sortBy];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * order;
    return String(av).localeCompare(String(bv)) * order;
  });
  const page = filters.page ?? 1;
  const pageSize = filters.page_size ?? 10;
  const start = (page - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);
  return {
    success: true,
    data: pageRows,
    meta: {
      page,
      page_size: pageSize,
      total_records: rows.length,
      total_pages: Math.max(1, Math.ceil(rows.length / pageSize)),
    },
  };
}

export async function fetchWorkforceEmployee(id: string): Promise<ApiResponse<Employee | null>> {
  id = canonicalEmployeeId(id);
  const emp = DEMO_EMPLOYEES.find((e) => e.id === id) ?? null;
  return { success: true, data: emp };
}

export async function fetchEmployeeTargets(id: string): Promise<ApiResponse<EmployeeTarget[]>> {
  id = canonicalEmployeeId(id);
  return { success: true, data: DEMO_TARGETS.filter((t) => t.employee_id === id) };
}

export async function fetchEmployeeLicenses(id: string): Promise<ApiResponse<ProfessionalLicense[]>> {
  id = canonicalEmployeeId(id);
  return {
    success: true,
    data: DEMO_LICENSES.filter((l) => l.employee_id === id).map((l) => enrichLicense(l, asOfDate())),
  };
}

export async function fetchEmployeeCredentials(id: string): Promise<ApiResponse<Credential[]>> {
  id = canonicalEmployeeId(id);
  return { success: true, data: DEMO_CREDENTIALS.filter((c) => c.employee_id === id) };
}

export async function fetchEmployeePerformanceSummary(id: string): Promise<ApiResponse<EmployeePerformanceSummary | null>> {
  id = canonicalEmployeeId(id);
  const emp = DEMO_EMPLOYEES.find((e) => e.id === id);
  if (!emp) return { success: true, data: null };
  const targets = DEMO_TARGETS.filter((t) => t.employee_id === id);
  const summary: EmployeePerformanceSummary = {
    employee_id: id,
    reporting_period: '2026-Q2',
    overall_achievement_pct: emp.overall_achievement_pct,
    weighted_achievement_pct: emp.overall_achievement_pct,
    previous_period_achievement_pct:
      emp.overall_achievement_pct != null ? Math.round((emp.overall_achievement_pct - 2.4) * 10) / 10 : null,
    targets_achieved: targets.filter((t) => t.status === 'on_target' || t.status === 'exceeds_target').length,
    targets_at_risk: targets.filter((t) => t.status === 'at_risk').length,
    targets_below: targets.filter((t) => t.status === 'below_target').length,
    targets_total: targets.length,
    performance_status: emp.performance_status,
    attendance_rate: emp.attendance_rate,
    last_updated: emp.last_performance_review,
    data_status: emp.data_status,
  };
  return { success: true, data: summary };
}

export async function fetchEmployeeAudit(id: string): Promise<ApiResponse<WorkforceAuditEvent[]>> {
  id = canonicalEmployeeId(id);
  return { success: true, data: DEMO_AUDIT.filter((a) => a.employee_id === id) };
}

export async function fetchEmployeeTrend(id: string): Promise<ApiResponse<ChartPayload>> {
  id = canonicalEmployeeId(id);
  const emp = DEMO_EMPLOYEES.find((e) => e.id === id);
  const base = emp?.overall_achievement_pct ?? 90;
  const series = DEMO_TRENDS.map((_, i) => Math.round((base - 4 + i * 0.7) * 10) / 10);
  return {
    success: true,
    data: {
      chart_type: 'line',
      categories: DEMO_TRENDS.map((point) => point.period),
      series: [{ name: 'Weighted achievement', data: series }],
    },
  };
}

export async function fetchWorkforceFilterOptions(): Promise<
  ApiResponse<{
    regions: string[];
    facilities: Array<{ facility_key: number; facility_name: string }>;
    departments: Array<{ department_key: number; department_name: string }>;
    specialties: Array<{ value: string; label: string }>;
    job_titles: string[];
    managers: Array<{ id: string; name: string }>;
    employment_statuses: string[];
    performance_statuses: string[];
    license_statuses: string[];
  }>
> {
  const managers = new Map<string, string>();
  for (const e of DEMO_EMPLOYEES) {
    if (e.manager_id && e.manager_name) managers.set(e.manager_id, e.manager_name);
  }
  return {
    success: true,
    data: {
      regions: [...new Set(DEMO_EMPLOYEES.map((e) => e.region))],
      facilities: [...new Map(DEMO_EMPLOYEES.map((e) => [e.facility_key, { facility_key: e.facility_key, facility_name: e.facility_name }])).values()],
      departments: [...new Map(DEMO_EMPLOYEES.map((e) => [e.department_key, { department_key: e.department_key, department_name: e.department_name }])).values()],
      specialties: Object.entries(SPECIALTY_LABELS).map(([value, label]) => ({ value, label })),
      job_titles: [...new Set(DEMO_EMPLOYEES.map((e) => e.job_title))],
      managers: [...managers.entries()].map(([id, name]) => ({ id, name })),
      employment_statuses: ['active', 'on_leave', 'terminated', 'contractor'],
      performance_statuses: ['exceeds_target', 'on_target', 'at_risk', 'below_target'],
      license_statuses: ['active', 'expiring_soon', 'expired', 'missing', 'unverified', 'suspended', 'renewal_in_progress'],
    },
  };
}

export function buildDeterministicWorkforceBrief(summary: WorkforceDashboardSummary, priorities: WorkforcePriority[]) {
  const top = priorities[0];
  return {
    whatChanged:
      summary.employees_below_target > 0 || summary.expired_licenses > 0
        ? `Workforce achievement is ${summary.overall_target_achievement ?? '—'}% with ${summary.employees_below_target} employees below target and ${summary.expired_licenses} expired licenses.`
        : `Workforce achievement is stable at ${summary.overall_target_achievement ?? '—'}% for the selected scope.`,
    whyItMatters:
      'Target shortfalls and credential gaps increase operational and compliance risk across clinical and support services.',
    evidence: [
      `Overall target achievement: ${summary.overall_target_achievement ?? '—'}%`,
      `Licenses expiring soon: ${summary.licenses_expiring_soon}`,
      `Expired licenses: ${summary.expired_licenses}`,
      ...(top ? [`Priority: ${top.issue}`] : []),
    ],
    limitation:
      'Demo adapter only — figures are deterministic sample data, not live HIS/HR extracts.',
    followUp: top
      ? `Investigate ${top.area} and assign owner ${top.owner}.`
      : 'Maintain credentialing cadence and review next-period targets with managers.',
    relatedHref: top?.href ?? '/workforce',
  };
}

export type { WorkforceTrendPoint };
