import { findKpi } from '@/showcase/engine';
import { formatDelta, formatMeasure, measure } from '@/showcase/measures';

export type Severity = 'critical' | 'high' | 'medium' | 'info';
export type AlertStatus = 'new' | 'acknowledged' | 'investigating' | 'resolved' | 'dismissed';

export type DemoAlert = {
  id: string;
  hospital: string;
  department: string;
  kpi: string;
  screen: string;
  period: string;
  severity: Severity;
  title: string;
  observed: string;
  comparison: string;
  rule: string;
  evidence: string;
  investigation: string;
  action: string;
  owner: string;
};

type Rule = {
  kpi: string;
  department: string;
  screen: string;
  title: string;
  owner: string;
  investigation: string;
  action: string;
  rule: string;
  worse: boolean;
  critical: number;
  high: number;
  medium: number;
};

const RULES: Rule[] = [
  {
    kpi: 'kpi_ed_door_to_provider_median_minutes',
    department: 'Emergency',
    screen: 'emergency',
    title: 'Door-to-provider wait',
    owner: 'Emergency operations lead',
    investigation: 'Compare the median with the P90 and the arrival mix before treating the wait as a staffing gap.',
    action: 'Review a midday physician and bed-desk overlap for the emergency queue.',
    rule: 'Critical at 90 minutes or more, high at 60, medium at 45. The line is a scenario review line, not a clinical standard.',
    worse: true,
    critical: 90,
    high: 60,
    medium: 45,
  },
  {
    kpi: 'kpi_ed_boarding_gt_4h_rate',
    department: 'Emergency',
    screen: 'emergency',
    title: 'Boarding beyond 4 hours',
    owner: 'Emergency operations lead',
    investigation: 'Read the boarding share against occupancy. They can move together without one proving the other.',
    action: 'Review discharge-ready patients before adding emergency holding space.',
    rule: 'Critical at 12% or more, high at 8%, medium at 4% of emergency arrivals.',
    worse: true,
    critical: 0.12,
    high: 0.08,
    medium: 0.04,
  },
  {
    kpi: 'kpi_bed_occupancy_rate',
    department: 'Inpatient',
    screen: 'beds',
    title: 'Staffed bed occupancy',
    owner: 'Bed management lead',
    investigation: 'Check occupied, available, and blocked beds. They must sum to staffed beds.',
    action: 'Review the two fullest wards before opening extra staffed beds.',
    rule: 'Critical at 90% or more, high at 85%, medium at 80% of staffed beds.',
    worse: true,
    critical: 0.9,
    high: 0.85,
    medium: 0.8,
  },
  {
    kpi: 'kpi_med_order_cancelled_rate',
    department: 'Pharmacy',
    screen: 'pharmacy',
    title: 'Medication orders not dispensed',
    owner: 'Pharmacy lead',
    investigation: 'Use ordered, dispensed, and administered counts. Do not substitute an admission series.',
    action: 'Review the gap between ordered and dispensed before changing stock assumptions.',
    rule: 'Critical at 8% or more, high at 5%, medium at 3% of medication orders. This is not a stock balance.',
    worse: true,
    critical: 0.08,
    high: 0.05,
    medium: 0.03,
  },
  {
    kpi: 'kpi_lab_tat_median_minutes',
    department: 'Laboratory',
    screen: 'laboratory',
    title: 'Laboratory median turnaround',
    owner: 'Laboratory lead',
    investigation: 'Keep the median separate from the average. Orders and resulted tests are the workload pair.',
    action: 'Review delayed orders against completed tests for this hospital and year.',
    rule: 'Critical at 180 minutes or more, high at 90, medium at 45.',
    worse: true,
    critical: 180,
    high: 90,
    medium: 45,
  },
  {
    kpi: 'kpi_surg_cancellation_rate',
    department: 'Surgery',
    screen: 'surgery',
    title: 'Surgical cancellation rate',
    owner: 'Theatre lead',
    investigation: 'Cancellation is cancelled cases divided by requested cases, not an admission trend.',
    action: 'Review cancellation reasons on the theatre flow before changing the schedule.',
    rule: 'Critical at 12% or more, high at 8%, medium at 5% of requested cases.',
    worse: true,
    critical: 0.12,
    high: 0.08,
    medium: 0.05,
  },
  {
    kpi: 'kpi_claim_denied_rate',
    department: 'Revenue',
    screen: 'claims',
    title: 'Claim denial rate',
    owner: 'Revenue cycle lead',
    investigation: 'Paid, denied, and pending must sum to submitted before the rate is discussed.',
    action: 'Review a pre-submission check on the denial share.',
    rule: 'Critical at 8% or more, high at 5%, medium at 4% of submitted claims.',
    worse: true,
    critical: 0.08,
    high: 0.05,
    medium: 0.04,
  },
  {
    kpi: 'demo_satisfaction_index',
    department: 'Experience',
    screen: 'experience',
    title: 'Satisfaction index',
    owner: 'Patient experience lead',
    investigation: 'The index is a working experience figure. Pair it with survey response and open complaints.',
    action: 'Start with discharge instructions and the day-7 call.',
    rule: 'Critical at 70 or below, high at 75 or below, medium at 80 or below, on a 0–100 index.',
    worse: false,
    critical: 70,
    high: 75,
    medium: 80,
  },
  {
    kpi: 'kpi_wf_vacancy_rate',
    department: 'Workforce',
    screen: 'workforce',
    title: 'Staffing vacancy',
    owner: 'Workforce lead',
    investigation: 'Vacancy is required FTE minus filled FTE. It is not a bed chart.',
    action: 'Review required versus filled FTE before adding overtime.',
    rule: 'Critical at 15% or more, high at 10%, medium at 5% of required FTE.',
    worse: true,
    critical: 0.15,
    high: 0.1,
    medium: 0.05,
  },
  {
    kpi: 'kpi_rad_median_report_tat_minutes',
    department: 'Radiology',
    screen: 'radiology',
    title: 'Imaging report turnaround',
    owner: 'Imaging lead',
    investigation: 'Report time is not clinic wait. Modality counts are a separate chart.',
    action: 'Review report turnaround against completed examinations.',
    rule: 'Critical at 240 minutes or more, high at 120, medium at 60.',
    worse: true,
    critical: 240,
    high: 120,
    medium: 60,
  },
];

const SCREEN_DEPARTMENT: Record<string, string> = {
  emergency: 'Emergency',
  stability: 'Emergency',
  beds: 'Inpatient',
  inpatient: 'Inpatient',
  'ward-transfer': 'Inpatient',
  'assessments-vitals': 'Inpatient',
  morgue: 'Inpatient',
  'maternal-neonatal': 'Inpatient',
  pharmacy: 'Pharmacy',
  'supply-chain': 'Pharmacy',
  laboratory: 'Laboratory',
  surgery: 'Surgery',
  radiology: 'Radiology',
  claims: 'Revenue',
  'claims-processing': 'Revenue',
  rcm: 'Revenue',
  revenue: 'Revenue',
  'billing-collections': 'Revenue',
  eligibility: 'Revenue',
  'pre-authorization': 'Revenue',
  experience: 'Experience',
  'patient-experience': 'Experience',
  workforce: 'Workforce',
  'biomedical-equipment': 'Workforce',
};

function severityFor(value: number, rule: Rule): Severity {
  if (rule.worse) {
    if (value >= rule.critical) return 'critical';
    if (value >= rule.high) return 'high';
    if (value >= rule.medium) return 'medium';
    return 'info';
  }
  if (value <= rule.critical) return 'critical';
  if (value <= rule.high) return 'high';
  if (value <= rule.medium) return 'medium';
  return 'info';
}

export function alertsFor(hospital: string, year: number): DemoAlert[] {
  return RULES.map((rule) => {
    const kpi = findKpi(rule.kpi);
    if (!kpi) throw new Error(`Alert rule missing KPI ${rule.kpi}`);
    const item = measure(kpi, hospital, year, 'All');
    const severity = severityFor(item.value, rule);
    return {
      id: `${hospital}|${year}|${rule.kpi}`,
      hospital,
      department: rule.department,
      kpi: rule.kpi,
      screen: rule.screen,
      period: String(year),
      severity,
      title: rule.title,
      observed: formatMeasure(item, 'en'),
      comparison: `${formatDelta(item, 'en')}. ${rule.rule}`,
      rule: rule.rule,
      evidence: `${kpi.name}: ${formatMeasure(item, 'en')} for ${hospital} in ${year}. ${item.note}`,
      investigation: rule.investigation,
      action: rule.action,
      owner: rule.owner,
    };
  });
}

export function screenDepartment(screenId: string | null): string | 'all' {
  if (!screenId) return 'all';
  return SCREEN_DEPARTMENT[screenId] ?? 'all';
}

export function visibleAlerts(hospital: string, year: number, department: string, screenId: string | null): { alerts: DemoAlert[]; note: string } {
  const all = alertsFor(hospital, year);
  const scoped = screenDepartment(screenId);
  if (scoped === 'all') {
    const alerts = department === 'All' ? all : all.filter((alert) => alert.department === department);
    const note = department === 'All' ? '' : `Service scope is ${department}. Alerts are limited to that service for this hospital and year.`;
    return { alerts, note };
  }
    const note = department !== 'All' && department !== scoped
      ? `Service scope is ${department}. This workspace stays on ${scoped}. The alerts below are the ${scoped} view for this hospital and year.`
      : '';
  return { alerts: all.filter((alert) => alert.department === scoped), note };
}

export function badgeCount(hospital: string, year: number, department: string, statuses: Record<string, AlertStatus>): number {
  return alertsFor(hospital, year).filter((alert) => {
    if (department !== 'All' && alert.department !== department) return false;
    if (alert.severity === 'info') return false;
    const status = statuses[alert.id] ?? 'new';
    return status !== 'resolved' && status !== 'dismissed';
  }).length;
}

export function screenFromPath(path: string): string | null {
  const story = path.match(/\/story\/([^/]+)/);
  if (story) return story[1];
  if (path === '/' || path === '') return 'command';
  if (path.startsWith('/experience')) return 'experience';
  return null;
}
