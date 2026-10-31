/**
 * Cross-domain enterprise snapshot for Executive Dashboard and Hospital Command Center.
 * Every metric is read from a domain's documented canonical view — no independent fabricated totals.
 * Synthetic demonstration only. Not Production Source Verified. Not a live / real-time feed.
 */
import { scenarioFor } from '@/showcase/facts';
import type { ReportPeriod } from './period';
import { periodMonths, sumKey, weighted } from './period';
import { buildIcuView } from './icuView';
import { buildLaboratoryView } from './laboratoryView';
import { buildOpdView } from './opdView';
import { buildPxView } from './patientExperienceView';
import { buildQsView, QS_TARGETS } from './qualitySafetyView';
import { buildRadiologyView } from './radiologyView';
import { buildRcmView, RCM_TARGETS } from './rcmView';
import { buildScView, SC_TARGETS } from './supplyChainView';
import { buildStView, ST_TARGETS } from './strategyView';
import { buildSurgeryView } from './surgeryView';

export const ENTERPRISE_DISCLAIMER =
  'Synthetic demonstration · Demo Available — not Production Source Verified · period-scoped reporting, not a live real-time feed.';

export type EnterpriseSeverity = 'critical' | 'warning' | 'healthy' | 'info';

export type EnterpriseSignal = {
  id: string;
  category:
    | 'operational'
    | 'financial'
    | 'experience'
    | 'quality'
    | 'safety'
    | 'capacity'
    | 'efficiency'
    | 'strategy';
  label: string;
  value: number;
  display: string;
  unit?: string;
  severity: EnterpriseSeverity;
  sourceDomain: string;
  sourceRoute: string;
  formula: string;
  limitation: string;
};

export type EnterprisePriority = {
  id: string;
  severity: 'critical' | 'warning';
  issue: string;
  evidence: string;
  decision: string;
  sourceDomain: string;
  href: string;
  metricLabel: string;
  metricValue: string;
};

export type OpsException = {
  id: string;
  area: string;
  severity: EnterpriseSeverity;
  signal: string;
  evidence: string;
  href: string;
  owner: string;
};

function pct(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

function num(value: number, digits = 0): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function sar(value: number): string {
  return `SAR ${Math.round(value).toLocaleString('en-US')}`;
}

function rateTone(value: number, warn: number, critical: number, higherWorse = true): EnterpriseSeverity {
  if (higherWorse) {
    if (value >= critical) return 'critical';
    if (value >= warn) return 'warning';
    return 'healthy';
  }
  if (value <= critical) return 'critical';
  if (value <= warn) return 'warning';
  return 'healthy';
}

function bedSnapshot(hospital: string, year: number, period: ReportPeriod) {
  const rows = periodMonths(hospital, year, period);
  const fact = scenarioFor(hospital, year).focus;
  if (period === 'year') {
    return {
      staffed: fact.staffedBeds,
      occupied: fact.occupiedBeds,
      available: fact.availableBeds,
      blocked: fact.blockedBeds,
      icuStaffed: fact.icuStaffed,
      icuOccupied: fact.icuOccupied,
      edArrivals: fact.edArrivals,
      edAdmitted: fact.edAdmitted,
      edWaitMedianMin: fact.edWaitMedianMin,
      labels: rows.map((row) => row.label),
      monthlyOccupancy: rows.map((row) => (row.month.staffedBeds ? row.month.occupiedBeds / row.month.staffedBeds : 0)),
    };
  }
  const staffed = rows[0]?.month.staffedBeds ?? fact.staffedBeds;
  const blocked = rows[0]?.month.blockedBeds ?? fact.blockedBeds;
  const occupied = Math.min(
    staffed - blocked,
    Math.round(rows.reduce((sum, row) => sum + row.month.occupiedBeds, 0) / Math.max(rows.length, 1)),
  );
  const icuStaffed = rows[0]?.month.icuStaffed ?? fact.icuStaffed;
  const icuOccupied = Math.min(
    icuStaffed,
    Math.round(rows.reduce((sum, row) => sum + row.month.icuOccupied, 0) / Math.max(rows.length, 1)),
  );
  return {
    staffed,
    occupied,
    available: Math.max(0, staffed - occupied - blocked),
    blocked,
    icuStaffed,
    icuOccupied,
    edArrivals: sumKey(rows, 'edArrivals'),
    edAdmitted: sumKey(rows, 'edAdmitted'),
    edWaitMedianMin: weighted(rows, 'edWaitMedianMin'),
    labels: rows.map((row) => row.label),
    monthlyOccupancy: rows.map((row) => (row.month.staffedBeds ? row.month.occupiedBeds / row.month.staffedBeds : 0)),
  };
}

export function buildEnterpriseView(hospital: string, year: number, period: ReportPeriod = 'year') {
  const beds = bedSnapshot(hospital, year, period);
  const qs = buildQsView(hospital, year, period);
  const sc = buildScView(hospital, year, period);
  const st = buildStView(hospital, year, period);
  const rcm = buildRcmView(hospital, year, period);
  const px = buildPxView(hospital, year, period);
  const opd = buildOpdView(hospital, year, period);
  const surg = buildSurgeryView(hospital, year, period);
  const icu = buildIcuView(hospital, year, period);
  const lab = buildLaboratoryView(hospital, year, period);
  const rad = buildRadiologyView(hospital, year, period);

  const occupancy = beds.staffed > 0 ? beds.occupied / beds.staffed : 0;
  const icuOccupancy = beds.icuStaffed > 0 ? beds.icuOccupied / beds.icuStaffed : 0;
  const icuViewOccupancy = icu.staffedBeds > 0 ? icu.avgOccupied / icu.staffedBeds : 0;

  const signals: EnterpriseSignal[] = [
    {
      id: 'ent_operational_occupancy',
      category: 'operational',
      label: 'Bed occupancy',
      value: occupancy,
      display: pct(occupancy),
      severity: rateTone(occupancy, 0.85, 0.92),
      sourceDomain: 'Beds & Capacity',
      sourceRoute: '/beds',
      formula: 'occupied_beds ÷ staffed_beds (Beds domain census)',
      limitation: 'Period-end / period-average stock from Beds — not a flow total.',
    },
    {
      id: 'ent_financial_npr',
      category: 'financial',
      label: 'Net patient revenue',
      value: rcm.netPatientRevenue,
      display: sar(rcm.netPatientRevenue),
      severity: 'info',
      sourceDomain: 'Revenue Cycle',
      sourceRoute: '/rcm',
      formula: 'gross_charges − contractual_allowances (RCM)',
      limitation: 'Recognized revenue ≠ profit. Fictional SAR.',
    },
    {
      id: 'ent_financial_denial',
      category: 'financial',
      label: 'Gross denial rate',
      value: rcm.grossDenialRate,
      display: pct(rcm.grossDenialRate),
      severity: rateTone(rcm.grossDenialRate, RCM_TARGETS.grossDenialRate, RCM_TARGETS.grossDenialRate + 0.02),
      sourceDomain: 'Revenue Cycle',
      sourceRoute: '/rcm/claims',
      formula: 'denied claims ÷ adjudicated claims (RCM)',
      limitation: 'Claim-count rate — not denial by value.',
    },
    {
      id: 'ent_experience_sat',
      category: 'experience',
      label: 'Overall satisfaction',
      value: px.overallSatisfaction,
      display: `${px.overallSatisfaction.toFixed(1)} / 10`,
      severity: rateTone(px.overallSatisfaction, 7.2, 6.8, false),
      sourceDomain: 'Patient Experience',
      sourceRoute: '/patient-experience',
      formula: 'Weighted survey mean (PX domain)',
      limitation: 'Survey cohort — not clinical outcome.',
    },
    {
      id: 'ent_quality_compliance',
      category: 'quality',
      label: 'Quality measure compliance',
      value: qs.qualityCompliance,
      display: pct(qs.qualityCompliance),
      severity: rateTone(qs.qualityCompliance, QS_TARGETS.qualityCompliance, QS_TARGETS.qualityCompliance - 0.05, false),
      sourceDomain: 'Quality & Safety',
      sourceRoute: '/quality',
      formula: 'eligible compliant measures ÷ eligible measures (QS)',
      limitation: 'Process compliance — not validated harm incidence.',
    },
    {
      id: 'ent_safety_events',
      category: 'safety',
      label: 'Validated event rate',
      value: qs.validatedEventRate,
      display: `${qs.validatedEventRate.toFixed(1)} /1k`,
      severity: rateTone(qs.validatedEventRate, QS_TARGETS.validatedEventRate, QS_TARGETS.validatedEventRate * 1.25),
      sourceDomain: 'Quality & Safety',
      sourceRoute: '/quality/incidents',
      formula: 'validated events ÷ discharges × 1000 (QS)',
      limitation: 'Surveillance denominator ≠ every clinical activity grain.',
    },
    {
      id: 'ent_capacity_ed_wait',
      category: 'capacity',
      label: 'ED door-to-provider (median)',
      value: beds.edWaitMedianMin,
      display: `${num(beds.edWaitMedianMin, 1)} min`,
      unit: 'min',
      severity: rateTone(beds.edWaitMedianMin, 40, 55),
      sourceDomain: 'Emergency',
      sourceRoute: '/emergency/flow',
      formula: 'ED wait median minutes (Emergency focus / period weighted)',
      limitation: 'ED arrivals ≠ inpatient admissions.',
    },
    {
      id: 'ent_efficiency_resource',
      category: 'efficiency',
      label: 'Resource utilization index',
      value: st.resourceUtilizationIndex,
      display: pct(st.resourceUtilizationIndex),
      severity: rateTone(st.resourceUtilizationIndex, ST_TARGETS.resourceUtilization, ST_TARGETS.resourceUtilization - 0.08, false),
      sourceDomain: 'Strategy',
      sourceRoute: '/strategy',
      formula: 'Mean of staffing / equipment / capacity utilization (ST)',
      limitation: 'Installed ≠ staffed ≠ available ≠ used.',
    },
    {
      id: 'ent_strategy_contribution',
      category: 'strategy',
      label: 'Operating contribution',
      value: st.operatingContribution,
      display: sar(st.operatingContribution),
      severity: st.operatingContribution > 0 ? 'healthy' : 'warning',
      sourceDomain: 'Strategy',
      sourceRoute: '/strategy/service-lines',
      formula: 'recognized net revenue − eligible direct costs (ST)',
      limitation: 'Contribution ≠ net profit. Synthetic cost model.',
    },
    {
      id: 'ent_supply_availability',
      category: 'operational',
      label: 'Supply availability',
      value: sc.supplyAvailability,
      display: pct(sc.supplyAvailability),
      severity: rateTone(sc.supplyAvailability, SC_TARGETS.supplyAvailability, SC_TARGETS.supplyAvailability - 0.04, false),
      sourceDomain: 'Supply Chain',
      sourceRoute: '/supply-chain',
      formula: 'available SKU-days ÷ SKU-days (SC)',
      limitation: 'Inventory value ≠ available units.',
    },
  ];

  const priorities: EnterprisePriority[] = [];
  const pushPriority = (item: EnterprisePriority) => {
    if (priorities.length >= 5) return;
    if (priorities.some((p) => p.id === item.id)) return;
    priorities.push(item);
  };

  if (occupancy >= 0.9) {
    pushPriority({
      id: 'pri-bed-pressure',
      severity: occupancy >= 0.94 ? 'critical' : 'warning',
      issue: 'Capacity pressure — bed occupancy above leadership watch band',
      evidence: `Beds census: occupied ${num(beds.occupied)} / staffed ${num(beds.staffed)} = ${pct(occupancy)}.`,
      decision: 'Review bed assignment backlog and expected discharges on Beds & Capacity.',
      sourceDomain: 'Beds & Capacity',
      href: '/beds',
      metricLabel: 'Bed occupancy',
      metricValue: pct(occupancy),
    });
  }
  if (beds.edWaitMedianMin >= 40) {
    pushPriority({
      id: 'pri-ed-wait',
      severity: beds.edWaitMedianMin >= 55 ? 'critical' : 'warning',
      issue: 'Emergency throughput pressure — door-to-provider elevated',
      evidence: `ED median wait ${num(beds.edWaitMedianMin, 1)} min · arrivals ${num(beds.edArrivals)} · admissions ${num(beds.edAdmitted)}.`,
      decision: 'Investigate Waiting & Patient Flow; do not equate ED arrivals with IPD admissions.',
      sourceDomain: 'Emergency',
      href: '/emergency/flow',
      metricLabel: 'ED median wait',
      metricValue: `${num(beds.edWaitMedianMin, 1)} min`,
    });
  }
  if (rcm.grossDenialRate > RCM_TARGETS.grossDenialRate) {
    pushPriority({
      id: 'pri-denials',
      severity: rcm.grossDenialRate > RCM_TARGETS.grossDenialRate + 0.02 ? 'critical' : 'warning',
      issue: 'Financial health — gross denial rate above RCM target',
      evidence: `Gross denial ${pct(rcm.grossDenialRate)} vs target ${pct(RCM_TARGETS.grossDenialRate)} · NPR ${sar(rcm.netPatientRevenue)}.`,
      decision: 'Open Claims / Leakage for denial drivers. Revenue ≠ profit.',
      sourceDomain: 'Revenue Cycle',
      href: '/rcm/claims',
      metricLabel: 'Gross denial rate',
      metricValue: pct(rcm.grossDenialRate),
    });
  }
  if (qs.overdueHighRiskActions > 5 || qs.validatedEventRate > QS_TARGETS.validatedEventRate) {
    pushPriority({
      id: 'pri-quality',
      severity: qs.overdueHighRiskActions > 10 || qs.severeHarm > 0 ? 'critical' : 'warning',
      issue: 'Safety / quality escalation — overdue high-risk actions or elevated validated events',
      evidence: `Validated event rate ${qs.validatedEventRate.toFixed(1)}/1k · overdue high-risk actions ${num(qs.overdueHighRiskActions)} · severe harm reports ${num(qs.severeHarm)}.`,
      decision: 'Open Quality Actions / Incidents. Reports ≠ validated harm until reviewed.',
      sourceDomain: 'Quality & Safety',
      href: '/quality/actions',
      metricLabel: 'Overdue high-risk actions',
      metricValue: num(qs.overdueHighRiskActions),
    });
  }
  if (sc.criticalStockouts > 0 || sc.supplyAvailability < SC_TARGETS.supplyAvailability) {
    pushPriority({
      id: 'pri-supply',
      severity: sc.criticalStockouts >= 3 ? 'critical' : 'warning',
      issue: 'Critical supply interruption risk',
      evidence: `Availability ${pct(sc.supplyAvailability)} · critical stockouts ${num(sc.criticalStockouts)} · days of supply ${sc.daysOfSupply == null ? 'No demand' : num(sc.daysOfSupply, 1)}.`,
      decision: 'Open Supply Chain Command for replenishment exceptions.',
      sourceDomain: 'Supply Chain',
      href: '/supply-chain',
      metricLabel: 'Critical stockouts',
      metricValue: num(sc.criticalStockouts),
    });
  }
  if (st.capacityConstrainedSl > 1 || st.addressableContribution > 0) {
    pushPriority({
      id: 'pri-strategy',
      severity: st.capacityConstrainedSl > 3 ? 'critical' : 'warning',
      issue: 'Strategic opportunity — capacity-constrained service lines / addressable contribution',
      evidence: `Constrained lines ${num(st.capacityConstrainedSl)} · operating contribution ${sar(st.operatingContribution)} · addressable ${sar(st.addressableContribution)}.`,
      decision: 'Review Strategy Command / Optimization. Do not treat modeled benefit as achieved ROI.',
      sourceDomain: 'Strategy',
      href: '/strategy',
      metricLabel: 'Constrained service lines',
      metricValue: num(st.capacityConstrainedSl),
    });
  }
  if (px.overallSatisfaction < 7.2) {
    pushPriority({
      id: 'pri-px',
      severity: px.overallSatisfaction < 6.8 ? 'critical' : 'warning',
      issue: 'Patient experience below leadership watch band',
      evidence: `Overall satisfaction ${px.overallSatisfaction.toFixed(1)} / 10 (PX domain).`,
      decision: 'Open Patient Experience Command for journey and complaint themes.',
      sourceDomain: 'Patient Experience',
      href: '/patient-experience',
      metricLabel: 'Overall satisfaction',
      metricValue: `${px.overallSatisfaction.toFixed(1)} / 10`,
    });
  }

  // Ensure 3–5 priorities even on calm periods — still evidence-linked
  if (priorities.length < 3) {
    pushPriority({
      id: 'pri-collection',
      severity: 'warning',
      issue: 'Monitor net collection and A/R aging',
      evidence: `Net collection ${pct(rcm.netCollectionRate)} · days in A/R ${num(rcm.daysInAr, 1)} · closing A/R ${sar(rcm.closingAR)}.`,
      decision: 'Review RCM Collections without inventing cash forecasts.',
      sourceDomain: 'Revenue Cycle',
      href: '/rcm/collections',
      metricLabel: 'Net collection rate',
      metricValue: pct(rcm.netCollectionRate),
    });
  }
  if (priorities.length < 3) {
    pushPriority({
      id: 'pri-or',
      severity: surg.cancellationRate > 0.05 ? 'warning' : 'warning',
      issue: 'Theatre utilization and cancellation watch',
      evidence: `OR utilization ${pct(surg.orUtilization)} · cancellation ${pct(surg.cancellationRate)} · completed ${num(surg.completed)}.`,
      decision: 'Open Surgery Command for theatre demand exceptions.',
      sourceDomain: 'Surgery',
      href: '/surgery',
      metricLabel: 'OR utilization',
      metricValue: pct(surg.orUtilization),
    });
  }

  const opsExceptions: OpsException[] = [];
  const addEx = (item: OpsException) => {
    if (opsExceptions.length >= 12) return;
    opsExceptions.push(item);
  };

  if (occupancy >= 0.88) {
    addEx({
      id: 'ops-beds',
      area: 'Bed pressure',
      severity: rateTone(occupancy, 0.88, 0.94),
      signal: pct(occupancy),
      evidence: `${num(beds.available)} available · ${num(beds.blocked)} blocked`,
      href: '/beds',
      owner: 'Bed management',
    });
  }
  if (beds.edWaitMedianMin >= 35) {
    addEx({
      id: 'ops-ed',
      area: 'ED throughput',
      severity: rateTone(beds.edWaitMedianMin, 40, 55),
      signal: `${num(beds.edWaitMedianMin, 1)} min`,
      evidence: `${num(beds.edArrivals)} arrivals · ${num(beds.edAdmitted)} admissions`,
      href: '/emergency/flow',
      owner: 'ED operations',
    });
  }
  if (surg.cancellationRate >= 0.04 || surg.orUtilization < 0.75 || surg.closingBacklog > 0) {
    addEx({
      id: 'ops-theatre',
      area: 'Theatre demand',
      severity: surg.cancellationRate >= 0.06 ? 'critical' : 'warning',
      signal: `Cancel ${pct(surg.cancellationRate)}`,
      evidence: `Util ${pct(surg.orUtilization)} · backlog ${num(surg.closingBacklog)}`,
      href: '/surgery',
      owner: 'Perioperative',
    });
  }
  if (opd.waitMedian >= 20 || opd.withinTargetRate < 0.85) {
    addEx({
      id: 'ops-opd',
      area: 'OPD flow',
      severity: opd.waitMedian >= 30 ? 'critical' : 'warning',
      signal: `${num(opd.waitMedian, 1)} min wait`,
      evidence: `Visits ${num(opd.visits)} · within target ${pct(opd.withinTargetRate)}`,
      href: '/outpatient/flow',
      owner: 'Outpatient director',
    });
  }
  if (lab.pendingValidation > 0 || lab.criticalPendingComm > 0 || lab.medianLabTatHours > lab.reportTatTargetHours) {
    addEx({
      id: 'ops-lab',
      area: 'Diagnostic bottleneck (Lab)',
      severity: lab.criticalPendingComm > 0 ? 'critical' : 'warning',
      signal: `TAT ${num(lab.medianLabTatHours, 1)} h`,
      evidence: `Pending validation ${num(lab.pendingValidation)} · critical pending ${num(lab.criticalPendingComm)}`,
      href: '/laboratory',
      owner: 'Laboratory',
    });
  }
  if (rad.closingBacklog > 0 || rad.unsignedReports > 0 || rad.medianReportTatHours > rad.reportTatTargetHours) {
    addEx({
      id: 'ops-rad',
      area: 'Diagnostic bottleneck (Imaging)',
      severity: rad.unsignedReports > 50 ? 'critical' : 'warning',
      signal: `Report TAT ${num(rad.medianReportTatHours, 1)} h`,
      evidence: `Backlog ${num(rad.closingBacklog)} · unsigned ${num(rad.unsignedReports)}`,
      href: '/radiology',
      owner: 'Radiology',
    });
  }
  if (icuOccupancy >= 0.85 || icu.staffingGapHours > 0 || icuViewOccupancy >= 0.85) {
    addEx({
      id: 'ops-icu',
      area: 'ICU capacity',
      severity: rateTone(Math.max(icuOccupancy, icuViewOccupancy), 0.85, 0.95),
      signal: pct(Math.max(icuOccupancy, icuViewOccupancy)),
      evidence: `Staffing gap hours ${num(icu.staffingGapHours, 0)} · boarding ${num(icu.boardingHours, 0)} h`,
      href: '/icu',
      owner: 'ICU lead',
    });
  }
  if (sc.criticalStockouts > 0 || sc.supplyAvailability < SC_TARGETS.supplyAvailability) {
    addEx({
      id: 'ops-supply',
      area: 'Critical supply interruption',
      severity: sc.criticalStockouts >= 3 ? 'critical' : 'warning',
      signal: `${num(sc.criticalStockouts)} critical stockouts`,
      evidence: `Availability ${pct(sc.supplyAvailability)} · DOS ${sc.daysOfSupply == null ? 'No demand' : num(sc.daysOfSupply, 1)}`,
      href: '/supply-chain',
      owner: 'Supply chain',
    });
  }
  if (qs.overdueHighRiskActions > 0 || qs.validatedEventRate > QS_TARGETS.validatedEventRate) {
    addEx({
      id: 'ops-qs',
      area: 'Safety / quality escalation',
      severity: qs.overdueHighRiskActions > 5 ? 'critical' : 'warning',
      signal: `${num(qs.overdueHighRiskActions)} overdue high-risk`,
      evidence: `Validated events ${qs.validatedEventRate.toFixed(1)}/1k · compliance ${pct(qs.qualityCompliance)}`,
      href: '/quality',
      owner: 'Quality office',
    });
  }
  if (icu.staffingGapHours > 40 || st.enterpriseStaffingGapHours > 0) {
    addEx({
      id: 'ops-staff',
      area: 'Staffing constraint',
      severity: icu.staffingGapHours > 120 ? 'critical' : 'warning',
      signal: `ICU gap ${num(icu.staffingGapHours)} h`,
      evidence: `ICU credentialed nurse gap ${num(st.icuStaffingGapHours, 0)} h (required ${num(st.icuRequiredHours, 0)} − available ${num(st.icuAvailableHours, 0)}) · enterprise-wide Strategy gap ${num(st.enterpriseStaffingGapHours, 0)} h (demand ${num(st.enterpriseRequiredHours, 0)} − staffed ${num(st.enterpriseAvailableHours, 0)}) · redeployable surplus ${num(st.redeployableHours, 0)} h is not automatic ICU fill · overtime ${sar(st.overtimeExposure)}`,
      href: '/strategy/workforce',
      owner: 'Workforce / ICU',
    });
  }

  return {
    hospital,
    year,
    period,
    periodLabel: period === 'year' ? `Full year ${year}` : `${period} ${year}`,
    disclaimer: ENTERPRISE_DISCLAIMER,
    signals,
    priorities: priorities.slice(0, 5),
    opsExceptions,
    facts: {
      occupancy,
      icuOccupancy: Math.max(icuOccupancy, icuViewOccupancy),
      availableBeds: beds.available,
      blockedBeds: beds.blocked,
      edWaitMedianMin: beds.edWaitMedianMin,
      edArrivals: beds.edArrivals,
      edAdmitted: beds.edAdmitted,
      orUtilization: surg.orUtilization,
      cancellationRate: surg.cancellationRate,
      surgCompleted: surg.completed,
      surgBacklog: surg.closingBacklog,
      opdVisits: opd.visits,
      opdWaitMedian: opd.waitMedian,
      labPending: lab.pendingValidation,
      labCriticalPending: lab.criticalPendingComm,
      labTat: lab.medianLabTatHours,
      radBacklog: rad.closingBacklog,
      radUnsigned: rad.unsignedReports,
      radTat: rad.medianReportTatHours,
      icuStaffingGapHours: icu.staffingGapHours,
      icuRequiredHours: st.icuRequiredHours,
      icuAvailableHours: st.icuAvailableHours,
      icuBoardingHours: icu.boardingHours,
      supplyAvailability: sc.supplyAvailability,
      criticalStockouts: sc.criticalStockouts,
      daysOfSupply: sc.daysOfSupply,
      validatedEventRate: qs.validatedEventRate,
      overdueHighRiskActions: qs.overdueHighRiskActions,
      qualityCompliance: qs.qualityCompliance,
      overallSatisfaction: px.overallSatisfaction,
      netPatientRevenue: rcm.netPatientRevenue,
      grossDenialRate: rcm.grossDenialRate,
      netCollectionRate: rcm.netCollectionRate,
      operatingContribution: st.operatingContribution,
      recognizedNetRevenue: st.recognizedNetRevenue,
      contributionMarginRate: st.contributionMarginRate,
      resourceUtilizationIndex: st.resourceUtilizationIndex,
      capacityConstrainedSl: st.capacityConstrainedSl,
      addressableContribution: st.addressableContribution,
      staffingCapacityGap: st.enterpriseStaffingGapHours,
      enterpriseRequiredHours: st.enterpriseRequiredHours,
      enterpriseAvailableHours: st.enterpriseAvailableHours,
      enterpriseStaffingGapHours: st.enterpriseStaffingGapHours,
      redeployableHours: st.redeployableHours,
      labels: beds.labels,
      monthlyOccupancy: beds.monthlyOccupancy,
    },
    lineage: {
      beds: 'Beds & Capacity census stocks',
      emergency: 'Emergency arrivals / wait / admissions',
      rcm: 'RCM net patient revenue & denial rates',
      px: 'Patient Experience overall satisfaction',
      qs: 'Quality & Safety validated events / compliance / CAPA',
      sc: 'Supply Chain availability / stockouts',
      st: 'Strategy contribution / utilization / constraints',
      surgery: 'Surgery OR utilization / cancellations / backlog',
      opd: 'OPD visits / wait',
      lab: 'Laboratory TAT / pending / critical',
      rad: 'Radiology backlog / unsigned / TAT',
      icu: 'ICU occupancy / staffing gap / boarding',
    },
  };
}

export type EnterpriseView = ReturnType<typeof buildEnterpriseView>;

/** Pure check: every signal cites a source domain route. */
export function enterpriseSignalsAreDomainDerived(view: EnterpriseView): boolean {
  return view.signals.every((signal) => Boolean(signal.sourceDomain && signal.sourceRoute && signal.formula));
}

/** Pure check: priorities link to domain routes and include evidence. */
export function enterprisePrioritiesAreEvidenceLinked(view: EnterpriseView): boolean {
  return (
    view.priorities.length >= 3 &&
    view.priorities.length <= 5 &&
    view.priorities.every((p) => p.evidence.length > 10 && p.href.startsWith('/') && p.sourceDomain.length > 0)
  );
}
