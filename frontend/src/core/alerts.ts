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
  threshold: string;
  evidence: string;
  investigation: string;
  drivers: string;
  consequence: string;
  action: string;
  owner: string;
  whyMatters: string;
  followUp: string;
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
  threshold?: string;
  consequence?: string;
  whyMatters?: string;
  followUp?: string;
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
    title: 'Door-to-provider time',
    owner: 'Emergency operations lead',
    investigation: 'Compare Door-to-provider time (median) with Door-to-provider time (P90) and Arrivals by hour of day on Waiting & Patient Flow. These clocks are not ED length of stay or boarding.',
    action: 'Align first-provider coverage to the peak arrival hours on Waiting & Patient Flow while door-to-provider time (median) remains above the review line.',
    rule: 'Critical at 90 minutes or more, high at 60, medium at 45. The line is a scenario review line, not a clinical standard.',
    threshold: 'Review line 60 minutes · high at 60 · critical at 90',
    consequence: 'Longer door-to-provider waits can raise left-without-being-seen risk and slow disposition.',
    whyMatters: 'Door-to-provider time is the primary waiting signal for ED operations.',
    followUp: 'Door-to-provider time (median) and (P90) after the next peak period',
    worse: true,
    critical: 90,
    high: 60,
    medium: 45,
  },
  {
    kpi: 'kpi_ed_boarding_gt_4h_rate',
    department: 'Emergency',
    screen: 'emergency',
    title: 'ED boarding beyond 4 hours',
    owner: 'Emergency operations lead',
    investigation: 'Pair ED boarding beyond 4 hours with ED disposition outcomes on Emergency Snapshot. The rate uses emergency admissions as the denominator. Hospital bed occupancy is not an ED indicator.',
    action: 'Clear boarded admissions still in the ED more than 4 hours after the admit decision, starting with the highest boarding months on Emergency Snapshot.',
    rule: 'Critical at 12% or more, high at 8%, medium at 4% of emergency admissions.',
    threshold: 'Review line 8% of emergency admissions · critical at 12%',
    consequence: 'Boarding occupies ED capacity and delays new arrivals.',
    whyMatters: 'Admitted patients still in the ED after the admit decision block flow.',
    followUp: 'ED boarding beyond 4 hours rate for the same hospital and period',
    worse: true,
    critical: 0.12,
    high: 0.08,
    medium: 0.04,
  },
  {
    kpi: 'kpi_bed_occupancy_rate',
    department: 'Beds',
    screen: 'beds',
    title: 'Operational bed occupancy',
    owner: 'Bed management lead',
    investigation: 'Check Operational bed composition on Bed Status: occupied + vacant + blocked must equal operational bed capacity. This is not an emergency wait signal.',
    action: 'Review Ward occupancy rate and blocked beds on Bed Status before opening extra operational bed capacity.',
    rule: 'Critical at 90% or more, high at 85%, medium at 80% of operational bed capacity.',
    threshold: 'Review line 85% of operational bed capacity · critical at 90%',
    consequence: 'High occupancy reduces placement options and slows allocation.',
    whyMatters: 'Bed occupancy rate is the primary bed-capacity pressure signal.',
    followUp: 'Bed occupancy rate, vacant beds, and blocked beds at the next snapshot',
    worse: true,
    critical: 0.9,
    high: 0.85,
    medium: 0.8,
  },
  {
    kpi: 'kpi_bed_blocked_rate',
    department: 'Beds',
    screen: 'beds',
    title: 'Blocked bed share',
    owner: 'Bed management lead',
    investigation: 'Separate cleaning from maintenance on Blocked bed readiness reasons (Bed Assignment). Blocked beds are not vacant.',
    action: 'Accelerate cleaning turnaround on beds awaiting cleaning before expanding operational bed capacity.',
    rule: 'Critical at 5% or more, high at 3.5%, medium at 2.5% of operational bed capacity.',
    threshold: 'Review line 3.5% of operational bed capacity · critical at 5%',
    consequence: 'Blocked beds reduce usable capacity even when occupancy looks manageable.',
    whyMatters: 'Beds unavailable for allocation shrink the vacant ready pool.',
    followUp: 'Blocked / closed beds and vacant beds at the next snapshot',
    worse: true,
    critical: 0.05,
    high: 0.035,
    medium: 0.025,
  },
  {
    kpi: 'kpi_bed_request_to_assignment_median_minutes',
    department: 'Beds',
    screen: 'beds',
    title: 'Bed allocation time',
    owner: 'Bed management lead',
    investigation: 'Pair Pending bed requests with Vacant beds by ward and Beds awaiting cleaning on Bed Assignment. Allocation time is not ED door-to-provider wait.',
    action: 'Prioritize unallocated bed requests against expected bed releases on Bed Capacity Outlook, and accelerate cleaning on blocked beds first.',
    rule: 'Critical at 75 minutes or more, high at 55, medium at 45.',
    threshold: 'Review line 55 minutes · critical at 75',
    consequence: 'Slow allocation extends ED boarding and ward waiting.',
    whyMatters: 'Bed allocation time is the operational clock for placement.',
    followUp: 'Bed allocation time (median) and pending bed requests',
    worse: true,
    critical: 75,
    high: 55,
    medium: 45,
  },
  {
    kpi: 'kpi_inpatient_median_los_days',
    department: 'Inpatient',
    screen: 'inpatient',
    title: 'Median inpatient stay',
    owner: 'Inpatient operations lead',
    investigation: 'Compare Median length of stay, Average length of stay, and Length of stay (P90) on Stay & Discharge. Pair with Medically ready, not discharged. This is not bed occupancy.',
    action: 'Review Long-stay contribution by specialty and delayed discharge barriers with the care team.',
    rule: 'Critical at 6 days or more, high at 4.8, medium at 4.2.',
    threshold: 'Review line 4.8 days · critical at 6 days',
    consequence: 'Longer stays raise census pressure and delay planned admissions.',
    whyMatters: 'Length of stay is the core inpatient flow signal.',
    followUp: 'Median length of stay, long-stay patient count, and medically ready, not discharged',
    worse: true,
    critical: 6,
    high: 4.8,
    medium: 4.2,
  },
  {
    kpi: 'kpi_readmission_30d_rate',
    department: 'Inpatient',
    screen: 'inpatient',
    title: '30-day unplanned return',
    owner: 'Inpatient operations lead',
    investigation: 'Unplanned 30-day readmission rate is a share of discharges on Care Progress & Outcomes. Visits are not linked patient-by-patient in this demo.',
    action: 'Review 30-day readmissions by specialty and discharge documentation gaps for the highest-share specialties.',
    rule: 'Critical at 12% or more, high at 10%, medium at 8% of discharges.',
    threshold: 'Review line 10% of discharges · critical at 12%',
    consequence: 'Higher unplanned readmissions add workload and may signal discharge planning gaps.',
    whyMatters: '30-day readmission rate is the primary inpatient outcome watch signal in this view.',
    followUp: 'Unplanned 30-day and 7-day readmission rates after the next discharge cohort',
    worse: true,
    critical: 0.12,
    high: 0.1,
    medium: 0.08,
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
  beds: 'Beds',
  inpatient: 'Inpatient',
  'ward-transfer': 'Inpatient',
  'inpatient-stay': 'Inpatient',
  'inpatient-outcomes': 'Inpatient',
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
      period: `Full year ${year}`,
      severity,
      title: rule.title,
      observed: formatMeasure(item, 'en'),
      comparison: `${formatDelta(item, 'en')}. ${rule.rule}`,
      rule: rule.rule,
      threshold: rule.threshold ?? rule.rule,
      evidence: `${kpi.name}: ${formatMeasure(item, 'en')} for ${hospital}, full year ${year}. ${item.note}`,
      investigation: rule.investigation,
      drivers: rule.investigation,
      consequence: rule.consequence ?? 'Operational consequence depends on how long the signal stays above the review line.',
      action: rule.action,
      owner: rule.owner,
      whyMatters: rule.whyMatters ?? `${rule.title} crossed a documented review line for this hospital and year.`,
      followUp: rule.followUp ?? `${rule.title} for the same hospital after the next review period`,
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
  if (path.startsWith('/beds')) return 'beds';
  if (path.startsWith('/inpatient')) return 'inpatient';
  if (path === '/' || path === '' || path.startsWith('/emergency')) return 'emergency';
  const story = path.match(/\/story\/([^/]+)/);
  if (story) return story[1];
  const board = path.match(/\/board\/([^/]+)/);
  if (board && SCREEN_DEPARTMENT[board[1]]) return board[1];
  if (path.startsWith('/experience')) return 'experience';
  return null;
}
