/**
 * Period-scoped hospital risk intelligence across domains.
 * Ranking uses documented threshold rules against registry metrics — no invented losses.
 */
import type { ReportPeriod } from '../period';
import { getMetric, resolveMetric } from './metricRegistry';
import type { OwningDomain } from './types';

export type RiskSeverity = 'critical' | 'high' | 'watch' | 'healthy';

export type RiskRule = {
  id: string;
  metricId: string;
  domain: OwningDomain;
  title: string;
  /** Documented comparison rule (auditable). */
  rule: string;
  direction: 'higher_worse' | 'lower_worse';
  watch: number;
  high: number;
  critical: number;
};

export type RankedRisk = {
  id: string;
  metricId: string;
  domain: OwningDomain;
  title: string;
  value: number | null;
  unit: string;
  severity: RiskSeverity;
  score: number;
  rule: string;
  evidence: string;
};

export type RiskIntelligenceResult = {
  hospital: string;
  year: number;
  period: ReportPeriod;
  risks: RankedRisk[];
  rulesApplied: string[];
  note: string;
};

/** Documented threshold rules — keep in sync with tests / acceptance docs. */
export const RISK_RULES: RiskRule[] = [
  {
    id: 'risk-ed-wait',
    metricId: 'ed.wait.median_min',
    domain: 'Emergency',
    title: 'Emergency waiting time pressure',
    rule: 'higher_worse: watch≥40 min, high≥55, critical≥70',
    direction: 'higher_worse',
    watch: 40,
    high: 55,
    critical: 70,
  },
  {
    id: 'risk-beds-occ',
    metricId: 'beds.occupancy',
    domain: 'Beds',
    title: 'Bed occupancy pressure',
    rule: 'higher_worse: watch≥0.85, high≥0.92, critical≥0.96',
    direction: 'higher_worse',
    watch: 0.85,
    high: 0.92,
    critical: 0.96,
  },
  {
    id: 'risk-icu-gap',
    metricId: 'icu.staffing_gap_hours',
    domain: 'ICU',
    title: 'ICU staffing gap',
    rule: 'higher_worse: watch≥60h, high≥120h, critical≥200h',
    direction: 'higher_worse',
    watch: 60,
    high: 120,
    critical: 200,
  },
  {
    id: 'risk-denial',
    metricId: 'rcm.gross_denial_rate',
    domain: 'Revenue Cycle',
    title: 'Gross denial rate',
    rule: 'higher_worse: watch≥0.08, high≥0.12, critical≥0.16',
    direction: 'higher_worse',
    watch: 0.08,
    high: 0.12,
    critical: 0.16,
  },
  {
    id: 'risk-npr',
    metricId: 'rcm.net_patient_revenue',
    domain: 'Revenue Cycle',
    title: 'Net patient revenue pressure',
    rule: 'lower_worse relative to period context: watch below domain median proxy via absolute floor (illustrative demo floors)',
    direction: 'lower_worse',
    watch: 40_000_000,
    high: 25_000_000,
    critical: 10_000_000,
  },
  {
    id: 'risk-stockout',
    metricId: 'sc.critical_stockouts',
    domain: 'Supply Chain',
    title: 'Critical supply stockouts',
    rule: 'higher_worse: watch≥1, high≥3, critical≥6',
    direction: 'higher_worse',
    watch: 1,
    high: 3,
    critical: 6,
  },
  {
    id: 'risk-cm',
    metricId: 'st.operating_contribution',
    domain: 'Strategy',
    title: 'Operating contribution',
    rule: 'lower_worse: watch≤2_000_000, high≤0, critical≤-2_000_000 (SAR)',
    direction: 'lower_worse',
    watch: 2_000_000,
    high: 0,
    critical: -2_000_000,
  },
  {
    id: 'risk-px',
    metricId: 'px.overall_satisfaction',
    domain: 'Patient Experience',
    title: 'Patient satisfaction',
    rule: 'lower_worse: watch≤7.2, high≤6.8, critical≤6.2',
    direction: 'lower_worse',
    watch: 7.2,
    high: 6.8,
    critical: 6.2,
  },
  {
    id: 'risk-capa',
    metricId: 'qs.overdue_high_risk_actions',
    domain: 'Quality & Safety',
    title: 'Overdue high-risk safety actions',
    rule: 'higher_worse: watch≥3, high≥8, critical≥15',
    direction: 'higher_worse',
    watch: 3,
    high: 8,
    critical: 15,
  },
  {
    id: 'risk-or',
    metricId: 'surg.or_utilization',
    domain: 'Surgery',
    title: 'OR utilization imbalance',
    rule: 'higher_worse saturation: watch≥0.85, high≥0.92, critical≥0.97',
    direction: 'higher_worse',
    watch: 0.85,
    high: 0.92,
    critical: 0.97,
  },
  {
    id: 'risk-lab-tat',
    metricId: 'lab.median_tat_hours',
    domain: 'Laboratory',
    title: 'Laboratory turnaround pressure',
    rule: 'higher_worse: watch≥4h, high≥8h, critical≥12h',
    direction: 'higher_worse',
    watch: 4,
    high: 8,
    critical: 12,
  },
  {
    id: 'risk-rad-tat',
    metricId: 'rad.median_report_tat_hours',
    domain: 'Radiology',
    title: 'Radiology report TAT pressure',
    rule: 'higher_worse: watch≥12h, high≥24h, critical≥48h',
    direction: 'higher_worse',
    watch: 12,
    high: 24,
    critical: 48,
  },
  {
    id: 'risk-rx-stock',
    metricId: 'rx.stockout_skus',
    domain: 'Pharmacy',
    title: 'Pharmacy stockout SKUs',
    rule: 'higher_worse: watch≥2, high≥5, critical≥10',
    direction: 'higher_worse',
    watch: 2,
    high: 5,
    critical: 10,
  },
  {
    id: 'risk-opd-wait',
    metricId: 'opd.wait.median_min',
    domain: 'OPD',
    title: 'Outpatient waiting time',
    rule: 'higher_worse: watch≥25 min, high≥35, critical≥50',
    direction: 'higher_worse',
    watch: 25,
    high: 35,
    critical: 50,
  },
  {
    id: 'risk-appt-noshow',
    metricId: 'appt.no_show_rate',
    domain: 'Appointments',
    title: 'Appointment no-show rate',
    rule: 'higher_worse: watch≥0.12, high≥0.18, critical≥0.25',
    direction: 'higher_worse',
    watch: 0.12,
    high: 0.18,
    critical: 0.25,
  },
  {
    id: 'risk-ipd-los',
    metricId: 'ipd.los_median_days',
    domain: 'Inpatient',
    title: 'Inpatient length of stay',
    rule: 'higher_worse: watch≥5.5d, high≥7d, critical≥9d',
    direction: 'higher_worse',
    watch: 5.5,
    high: 7,
    critical: 9,
  },
];

function severityFor(rule: RiskRule, value: number): { severity: RiskSeverity; score: number } {
  if (rule.direction === 'higher_worse') {
    if (value >= rule.critical) return { severity: 'critical', score: 100 + (value - rule.critical) };
    if (value >= rule.high) return { severity: 'high', score: 70 + (value - rule.high) };
    if (value >= rule.watch) return { severity: 'watch', score: 40 + (value - rule.watch) };
    return { severity: 'healthy', score: Math.max(0, 20 - (rule.watch - value)) };
  }
  // lower_worse
  if (value <= rule.critical) return { severity: 'critical', score: 100 + (rule.critical - value) };
  if (value <= rule.high) return { severity: 'high', score: 70 + (rule.high - value) };
  if (value <= rule.watch) return { severity: 'watch', score: 40 + (rule.watch - value) };
  return { severity: 'healthy', score: Math.max(0, 20 - (value - rule.watch)) };
}

export function rankHospitalRisks(args: {
  hospital: string;
  year: number;
  period: ReportPeriod;
  limit?: number;
}): RiskIntelligenceResult {
  const limit = args.limit ?? 10;
  const risks: RankedRisk[] = [];
  const rulesApplied: string[] = [];

  for (const rule of RISK_RULES) {
    const def = getMetric(rule.metricId);
    const value = resolveMetric(rule.metricId, {
      hospital: args.hospital,
      year: args.year,
      period: args.period,
    });
    rulesApplied.push(`${rule.id}: ${rule.rule}`);
    if (value == null || !Number.isFinite(value)) {
      risks.push({
        id: rule.id,
        metricId: rule.metricId,
        domain: rule.domain,
        title: rule.title,
        value: null,
        unit: def?.unit ?? '',
        severity: 'watch',
        score: 15,
        rule: rule.rule,
        evidence: `Metric ${rule.metricId} unavailable for ${args.hospital} ${args.period} ${args.year} — more evidence needed.`,
      });
      continue;
    }
    const { severity, score } = severityFor(rule, value);
    risks.push({
      id: rule.id,
      metricId: rule.metricId,
      domain: rule.domain,
      title: rule.title,
      value,
      unit: def?.unit ?? '',
      severity,
      score,
      rule: rule.rule,
      evidence: `${rule.title}: observed ${value} (${def?.unit ?? ''}) under rule "${rule.rule}" for ${args.hospital} · ${args.period} ${args.year}.`,
    });
  }

  risks.sort((a, b) => {
    const order = { critical: 0, high: 1, watch: 2, healthy: 3 };
    return order[a.severity] - order[b.severity] || b.score - a.score;
  });

  return {
    hospital: args.hospital,
    year: args.year,
    period: args.period,
    risks: risks.filter((r) => r.severity !== 'healthy').slice(0, limit),
    rulesApplied,
    note: 'Risk ranking uses documented registry-metric thresholds only. No fabricated financial losses or clinical causality.',
  };
}
