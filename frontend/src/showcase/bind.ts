import { leaveSplit } from '@/core/derived';
import { longStayRateFromP90 } from '@/core/ipdScope';
import { buildLaboratoryView } from '@/core/laboratoryView';
import { buildIcuView } from '@/core/icuView';
import { buildPharmacyView } from '@/core/pharmacyView';
import { buildPxView } from '@/core/patientExperienceView';
import { buildRadiologyView } from '@/core/radiologyView';
import { buildRcmView } from '@/core/rcmView';
import { buildSurgeryView } from '@/core/surgeryView';
import type { KpiDef } from './engine';
import { CURRENCY, type AnnualFact } from './facts';

export type MeasureKind = 'count' | 'rate' | 'duration' | 'currency' | 'index' | 'multiplier' | 'fte';

export type Raw = {
  value: number;
  kind: MeasureKind;
  unit: string;
  numerator: number;
  denominator: number;
  grain: string;
  better: 'up' | 'down' | 'neutral';
  note: string;
};

const GRAIN = 'Summed events over the selected year';
const RATE_GRAIN = 'Integer numerator ÷ integer denominator for the same cohort';
const TIME_GRAIN = 'Average is the volume-weighted mean. Median and P90 are quantiles of the monthly mixture, not an average of monthly medians.';

function count(value: number, better: Raw['better'], note: string, grain = GRAIN, unit = 'events'): Raw {
  const rounded = Math.round(value);
  return { value: rounded, kind: 'count', unit, numerator: rounded, denominator: 1, grain, better, note };
}

function ratio(numerator: number, denominator: number, better: Raw['better'], note: string, grain = RATE_GRAIN): Raw {
  const num = Math.round(numerator);
  const den = Math.round(denominator);
  if (den <= 0) return { value: 0, kind: 'rate', unit: 'percent', numerator: 0, denominator: 0, grain, better, note };
  return { value: num / den, kind: 'rate', unit: 'percent', numerator: num, denominator: den, grain, better, note };
}

function exactRate(numerator: number, denominator: number, better: Raw['better'], note: string): Raw {
  if (denominator <= 0) return { value: 0, kind: 'rate', unit: 'percent', numerator: 0, denominator: 0, grain: RATE_GRAIN, better, note };
  return { value: numerator / denominator, kind: 'rate', unit: 'percent', numerator, denominator, grain: RATE_GRAIN, better, note };
}

function share(fraction: number, denominator: number, better: Raw['better'], note: string): Raw {
  const den = Math.max(0, Math.round(denominator));
  const num = den === 0 ? 0 : Math.min(den, Math.max(0, Math.round(fraction * den)));
  return ratio(num, den, better, note);
}

function money(value: number, note: string, better: Raw['better'] = 'neutral'): Raw {
  const rounded = Math.round(value);
  return { value: rounded, kind: 'currency', unit: CURRENCY, numerator: rounded, denominator: 1, grain: 'Summed fictional SAR amounts for the year', better, note };
}

function duration(value: number, unit: 'minutes' | 'hours' | 'days', better: Raw['better'], note: string): Raw {
  return { value, kind: 'duration', unit, numerator: value, denominator: 1, grain: TIME_GRAIN, better, note };
}

function multiplier(numerator: number, denominator: number, unit: string, note: string): Raw {
  const den = Math.max(1, Math.round(denominator));
  const num = Math.round(numerator);
  return { value: num / den, kind: 'multiplier', unit, numerator: num, denominator: den, grain: 'Integer numerator ÷ integer denominator. A multiplier, not a percentage.', better: 'neutral', note };
}

function index(value: number, note: string): Raw {
  return { value, kind: 'index', unit: 'index', numerator: value, denominator: 100, grain: 'Response-weighted index on a 0–100 scale', better: 'up', note };
}

function fte(value: number, note: string, better: Raw['better'] = 'neutral'): Raw {
  const rounded = Math.round(value * 10) / 10;
  return { value: rounded, kind: 'fte', unit: 'FTE', numerator: rounded, denominator: 1, grain: 'Staffing snapshot, not a sum of daily roster rows', better, note };
}

function zeroDefect(note: string): Raw {
  return count(0, 'down', note, 'Valid zero: the fictional extract has no rows of this defect');
}

export function bindKpi(kpi: KpiDef, fact: AnnualFact, hospital: string, year: number): Raw {
  const key = kpi.key;
  const hit = mapped(kpi, fact, hospital, year);
  if (!hit) {
    return { ...count(0, 'neutral', `UNMAPPED ${key}`), value: Number.NaN, numerator: Number.NaN };
  }
  if (hit.kind === 'rate' && hit.denominator > 0) {
    return { ...hit, value: hit.numerator / hit.denominator };
  }
  return hit;
}

/** Pharmacy & Medication Operations KPIs bound to the shared Pharmacy view. */
function pharmacyMapped(key: string, hospital: string, year: number): Raw | null {
  const v = buildPharmacyView(hospital, year, 'year');
  switch (key) {
    case 'kpi_rx_med_orders': return count(v.orders, 'neutral', 'Unique medication orders from the Pharmacy Command view. Distinct from order lines, dispenses, and administrations.', GRAIN, 'orders');
    case 'kpi_rx_verified_orders': return count(v.verifiedOrders, 'up', 'Pharmacist-verified orders from the Pharmacy Command view.', GRAIN, 'orders');
    case 'kpi_rx_dispensed_lines': return count(v.dispensedLines, 'neutral', 'Dispensed order lines from the Pharmacy Command view. Lines are not orders.', GRAIN, 'lines');
    case 'kpi_rx_dispensing_completion': return exactRate(v.dispensedLines, v.lineLedger.opening + v.orderLines, 'up', 'Dispensed lines ÷ (opening open lines + new lines) from the Pharmacy Command view.');
    case 'kpi_rx_pending_orders': return count(v.pendingOrders, 'down', 'Open undispensed orders at observation from the Pharmacy Command view.', GRAIN, 'orders');
    case 'kpi_rx_urgent_share': return exactRate(v.urgentOrders, v.orders, 'neutral', 'Urgent orders ÷ medication orders from the Pharmacy Command view.');
    case 'kpi_rx_median_tat': return duration(v.medianTatMin, 'minutes', 'down', 'Median verification-to-dispense turnaround from the Pharmacy Dispensing view.');
    case 'kpi_rx_p90_tat': return duration(v.p90TatMin, 'minutes', 'down', 'P90 verification-to-dispense turnaround from the Pharmacy Dispensing view.');
    case 'kpi_rx_over_target': return count(v.dispensesOverTarget, 'down', 'Dispensed orders over the TAT target from the Pharmacy Dispensing view.', GRAIN, 'orders');
    case 'kpi_rx_verification_backlog': return count(v.verificationBacklog, 'down', 'Orders awaiting pharmacist verification from the Pharmacy Dispensing view.', GRAIN, 'orders');
    case 'kpi_rx_first_pass': return exactRate(v.firstPassLines, v.dispensedLines, 'up', 'First-pass lines ÷ dispensed lines from the Pharmacy Dispensing view.');
    case 'kpi_rx_rework': return exactRate(v.reworkLines, v.dispensedLines, 'down', 'Rework lines ÷ dispensed lines from the Pharmacy Dispensing view.');
    case 'kpi_rx_inventory_value': return money(v.inventoryValue, 'Closing medication stock value from the Pharmacy Inventory view. Fictional SAR.');
    case 'kpi_rx_stockout_skus': return count(v.stockoutSkus, 'down', 'SKUs with zero available stock from the Pharmacy Inventory view.', GRAIN, 'SKUs');
    case 'kpi_rx_low_stock_skus': return count(v.lowStockSkus, 'down', 'Low-stock SKUs (stocked-out SKUs excluded) from the Pharmacy Inventory view.', GRAIN, 'SKUs');
    case 'kpi_rx_days_of_supply': return duration(v.daysOfSupply, 'days', 'neutral', 'Closing stock value ÷ average daily issue value from the Pharmacy Inventory view.');
    case 'kpi_rx_near_expiry_value': return money(v.nearExpiryValue, 'Closing stock value in batches expiring within 90 days from the Pharmacy Inventory view. Fictional SAR.', 'down');
    case 'kpi_rx_verification_exception_rate': return exactRate(v.exceptionOrders, v.verifiedOrders, 'down', 'Exception orders ÷ verified orders from the Pharmacy Safety view.');
    case 'kpi_rx_high_alert_compliance': return exactRate(v.highAlertCompliant, v.highAlertLines, 'up', 'High-alert lines with independent check ÷ high-alert lines from the Pharmacy Safety view.');
    case 'kpi_rx_barcode_rate': return exactRate(v.scannedAdministrations, v.administrationEvents, 'up', 'Scanned administrations ÷ administration events from the Pharmacy Safety view.');
    case 'kpi_rx_incident_reports': return count(v.incidentReports, 'neutral', 'Reported medication process incidents from the Pharmacy Safety view.', GRAIN, 'reports');
    case 'kpi_rx_unresolved_reviews': return count(v.unresolvedReviews, 'down', 'Open incident reviews at observation from the Pharmacy Safety view.', GRAIN, 'reviews');
    case 'kpi_rx_medication_spend': return money(v.medicationSpend, 'Issued units × unit cost from the Pharmacy Cost view. Excludes write-offs. Fictional SAR.');
    case 'kpi_rx_cost_per_line': return money(v.costPerLine, 'Medication spend ÷ dispensed lines from the Pharmacy Cost view. Fictional SAR.');
    case 'kpi_rx_expired_value': return money(v.expiredValue, 'Expired stock write-off value from the Pharmacy Cost view. Fictional SAR.', 'down');
    case 'kpi_rx_avoidable_waste': return money(v.avoidableWaste, 'Avoidable share of expired and discarded value (a subset of write-offs) from the Pharmacy Cost view. Fictional SAR.', 'down');
    case 'kpi_rx_potential_savings': return money(v.potentialSavings, 'Exclusive savings drivers, each SAR counted once, from the Pharmacy Cost view. Illustrative. Fictional SAR.', 'up');
    case 'kpi_rx_recoverable_hours': return count(v.recoverableHours, 'up', 'Potentially recoverable pharmacy hours from Pharmacy Optimization.', GRAIN, 'hours');
    case 'kpi_rx_additional_lines': return count(v.additionalLines, 'up', 'Feasible additional dispensing lines from Pharmacy Optimization.', GRAIN, 'lines');
    case 'kpi_rx_eligible_pending': return count(v.eligiblePending, 'neutral', 'Eligible pending lines from Pharmacy Optimization.', GRAIN, 'lines');
    case 'kpi_rx_feasible_tat_cut': return duration(v.feasibleTatCutMin, 'minutes', 'up', 'Feasible median TAT reduction from queue and clarification gaps. Illustrative upper bound.');
    default: return null;
  }
}

/** ICU & Critical Care KPIs bound to the shared ICU view. */
function icuMapped(key: string, hospital: string, year: number): Raw | null {
  const v = buildIcuView(hospital, year, 'year');
  switch (key) {
    case 'kpi_icu_admissions': return count(v.admissions, 'neutral', 'ICU admissions from outside the ICU from the ICU Command view.', GRAIN, 'admissions');
    case 'kpi_icu_discharges': return count(v.discharges, 'neutral', 'ICU discharges (deaths counted separately) from the ICU Command view.', GRAIN, 'discharges');
    case 'kpi_icu_patient_days': return count(v.patientDays, 'neutral', 'Sum of daily midnight occupancy counts from the ICU Command view.', GRAIN, 'patient-days');
    case 'kpi_icu_avg_census': return count(v.avgCensus, 'neutral', 'Patient-days ÷ days from the ICU Command view.', GRAIN, 'patients');
    case 'kpi_icu_demand_pressure': return { value: v.demandPressure, kind: 'index', unit: 'index', numerator: v.pendingTransfers, denominator: Math.max(1, v.availableStaffed), grain: RATE_GRAIN, better: 'down', note: 'Pending transfers ÷ available staffed beds from the ICU Command view.' };
    case 'kpi_icu_pending_transfers': return count(v.pendingTransfers, 'down', 'Open ICU transfer requests from the ICU Command view.', GRAIN, 'requests');
    case 'kpi_icu_admission_wait': return duration(v.medianAdmissionWaitMin, 'minutes', 'down', 'Median request-to-arrival wait from the ICU Flow view.');
    case 'kpi_icu_delayed_admissions': return count(v.delayedAdmissions, 'down', 'Admissions over the wait target from the ICU Flow view.', GRAIN, 'admissions');
    case 'kpi_icu_transfer_delay': return duration(v.medianTransferDelayHours, 'hours', 'down', 'Median transfer-ready to exit delay from the ICU Flow view.');
    case 'kpi_icu_median_los': return duration(v.medianLosHours, 'hours', 'neutral', 'Median completed-stay LOS from the ICU Flow view.');
    case 'kpi_icu_discharge_ready_delay': return duration(v.medianDischargeReadyDelayHours, 'hours', 'down', 'Median discharge-ready to departure delay from the ICU Flow view.');
    case 'kpi_icu_boarding_hours': return count(v.boardingHours, 'down', 'Aggregate ICU boarding hours from the ICU Flow view.', GRAIN, 'hours');
    case 'kpi_icu_staffed_beds': return count(v.staffedBeds, 'neutral', 'Staffed ICU beds from the ICU Capacity view.', GRAIN, 'beds');
    case 'kpi_icu_available_staffed': return count(v.availableStaffed, 'up', 'Available staffed ICU beds from the ICU Capacity view.', GRAIN, 'beds');
    case 'kpi_icu_nurse_coverage': return exactRate(v.staffedNurseHours, v.requiredNurseHours, 'up', 'Staffed ÷ required nursing hours from the ICU Capacity view.');
    case 'kpi_icu_staffing_gap_hours': return count(v.staffingGapHours, 'down', 'Unfilled nursing coverage hours from the ICU Capacity view.', GRAIN, 'hours');
    case 'kpi_icu_pt_nurse_ratio': return { value: v.patientNurseRatio, kind: 'index', unit: 'ratio', numerator: v.avgOccupied, denominator: v.nursesOnDuty, grain: RATE_GRAIN, better: 'neutral', note: 'Occupied ÷ nurses on duty (descriptive) from the ICU Capacity view.' };
    case 'kpi_icu_vent_patient_days': return count(v.ventPatientDays, 'neutral', 'Ventilated patient-days from the ICU Equipment view.', GRAIN, 'patient-days');
    case 'kpi_icu_vent_utilization': return exactRate(v.assignedVentHours, v.eligibleVentHours, 'neutral', 'Assigned ÷ serviceable ventilator hours (In Use + Available; maintenance/prep excluded) from the ICU Equipment view.');
    case 'kpi_icu_available_vents': return count(v.ventAvailable, 'up', 'Unassigned serviceable ventilators from the ICU Equipment view.', GRAIN, 'devices');
    case 'kpi_icu_equipment_downtime': return count(v.downtimeHours, 'down', 'Non-overlapping maintenance and preparation interval hours from the ICU Equipment view.', GRAIN, 'hours');
    case 'kpi_icu_equipment_readiness': return exactRate(v.ventInUse + v.ventAvailable, v.ventInventory, 'up', '(In use + Available) ÷ inventory from the ICU Equipment view.');
    case 'kpi_icu_readmission_rate': return exactRate(v.readmissions48h, v.discharges, 'down', '48h ICU readmissions ÷ discharges from the ICU Quality view.');
    case 'kpi_icu_unplanned_transfer_rate': {
      const stepDown = v.unplannedTransferRate > 0 ? Math.max(1, Math.round(v.unplannedReturns / v.unplannedTransferRate)) : 1;
      return exactRate(v.unplannedReturns, stepDown, 'down', 'Unplanned returns ÷ step-down exits from the ICU Quality view.');
    }
    case 'kpi_icu_safety_review_backlog': return count(v.unresolvedReviews, 'down', 'Open safety reviews from the ICU Quality view.', GRAIN, 'reviews');
    case 'kpi_icu_surveillance_completeness': return exactRate(v.documentedDeviceDays, v.deviceDays, 'up', 'Illustrative surveillance documentation completeness from the ICU Quality view.');
    case 'kpi_icu_review_timeliness': return { value: v.reviewTimeliness, kind: 'rate', unit: '%', numerator: Math.round(v.reviewTimeliness * 1000), denominator: 1000, grain: RATE_GRAIN, better: 'up', note: 'Timely closed reviews ÷ closed reviews from the ICU Quality view.' };
    case 'kpi_icu_recoverable_bed_hours': return count(v.recoverableBedHours, 'up', 'Exclusive recoverable bed hours from ICU Optimization.', GRAIN, 'hours');
    case 'kpi_icu_feasible_capacity': return count(v.feasibleAdditionalCapacity, 'up', 'Feasible additional admissions from ICU Optimization.', GRAIN, 'admissions');
    case 'kpi_icu_avoidable_transfer_delay': return count(v.avoidableTransferDelayHours, 'down', 'Avoidable transfer delay hours from ICU Optimization.', GRAIN, 'hours');
    case 'kpi_icu_staff_constrained': return count(v.staffConstrainedHours, 'down', 'Staff-constrained physical bed hours from ICU Optimization.', GRAIN, 'hours');
    case 'kpi_icu_transfer_rate': return exactRate(v.transfersIn, Math.max(1, v.admissions), 'neutral', 'ICU transfers-in ÷ external admissions. Aggregate operational share — not an individual deterioration prediction.');
    default: return null;
  }
}

function pxMapped(key: string, hospital: string, year: number): Raw | null {
  const v = buildPxView(hospital, year, 'year');
  switch (key) {
    case 'kpi_px_overall_satisfaction': return { value: v.overallSatisfaction, kind: 'index', unit: 'score', numerator: Math.round(v.overallSatisfaction * v.overallCount), denominator: Math.max(1, v.overallCount), grain: RATE_GRAIN, better: 'up', note: 'Weighted mean of eligible Q_OVERALL answers on the internal 0–10 scale (DV-PX-Internal-v1). Display as /10 — not /100 and not official HCAHPS.' };
    case 'kpi_px_response_rate': return exactRate(v.eligibleCompleted, v.eligibleInvitations, 'up', `Eligible completed ${v.eligibleCompleted} ÷ eligible invitations ${v.eligibleInvitations} (duplicates discarded: ${v.duplicateCompletions}; raw completions ${v.completionsRaw}).`);
    case 'kpi_px_positive_share': return exactRate(v.topBox, v.overallCount, 'up', 'Top-box (9–10) ÷ eligible overall survey ratings — survey cohort, not free-text sentiment.');
    case 'kpi_px_negative_share': return exactRate(v.bottomBox, v.overallCount, 'down', 'Negative Survey Rating Share: bottom-box (0–6) ÷ eligible overall survey ratings. Distinct from Negative Comment Sentiment Share on Voice.');
    case 'kpi_px_recommendation': return { value: v.recommendationScore, kind: 'index', unit: 'points', numerator: Math.round(v.recommendationScore * 10), denominator: 1000, grain: RATE_GRAIN, better: 'up', note: 'Patient Recommendation Score = (%promoters 9–10 − %detractors 0–6) × 100 on Q_RECOMMEND. Points index — not an official NPS product and not a 0–10 mean.' };
    case 'kpi_px_unresolved_issues': return count(v.unresolvedIssues, 'down', 'Open complaints + high-priority unreviewed comments from the Patient Experience Command view.', GRAIN, 'issues');
    case 'kpi_px_journey_satisfaction': return { value: v.journeySatisfaction, kind: 'index', unit: 'score', numerator: Math.round(v.journeySatisfaction * 100), denominator: 100, grain: RATE_GRAIN, better: 'up', note: 'Weighted mean of linked journey touchpoint scores from the Journey view.' };
    case 'kpi_px_waiting_score': return { value: v.waitingScore, kind: 'index', unit: 'score', numerator: Math.round(v.waitingScore * 100), denominator: 100, grain: RATE_GRAIN, better: 'up', note: 'Mean waiting-dimension score on the internal 0–10 scale from the Journey view. Display as /10.' };
    case 'kpi_px_communication_score': return { value: v.communicationScore, kind: 'index', unit: 'score', numerator: Math.round(v.communicationScore * 100), denominator: 100, grain: RATE_GRAIN, better: 'up', note: 'Mean communication-dimension score on the internal 0–10 scale from the Journey view. Display as /10.' };
    case 'kpi_px_coordination_score': return { value: v.coordinationScore, kind: 'index', unit: 'score', numerator: Math.round(v.coordinationScore * 100), denominator: 100, grain: RATE_GRAIN, better: 'up', note: 'Mean coordination-dimension score on the internal 0–10 scale from the Journey view. Display as /10.' };
    case 'kpi_px_discharge_score': return { value: v.dischargeScore, kind: 'index', unit: 'score', numerator: Math.round(v.dischargeScore * 100), denominator: 100, grain: RATE_GRAIN, better: 'up', note: 'Mean discharge-dimension score on the internal 0–10 scale from the Journey view. Display as /10.' };
    case 'kpi_px_negative_touchpoint_share': return exactRate(v.touchpointNegative, Math.max(1, v.touchpointRatings), 'down', 'Touchpoint ratings ≤6 ÷ linked touchpoint ratings from the Journey view.');
    case 'kpi_px_complaints_total': return count(v.complaintsTotal, 'down', 'Complaints received in period from the Complaints view.', GRAIN, 'complaints');
    case 'kpi_px_complaints_open': return count(v.complaintsOpen, 'down', 'Open complaints at observation from the Complaints view.', GRAIN, 'complaints');
    case 'kpi_px_median_resolution': return duration(v.medianResolutionDays, 'days', 'down', 'Median days received→resolved for closed resolutions from the Complaints view.');
    case 'kpi_px_overdue_complaints': return count(v.overdueComplaints, 'down', 'Open complaints past the illustrative target from the Complaints view.', GRAIN, 'complaints');
    case 'kpi_px_first_contact_resolution': return { value: v.firstContactResolution, kind: 'rate', unit: '%', numerator: Math.round(v.firstContactResolution * 1000), denominator: 1000, grain: RATE_GRAIN, better: 'up', note: 'Closed without reopen ÷ closed complaints from the Complaints view.' };
    case 'kpi_px_reopen_rate': return { value: v.reopenRate, kind: 'rate', unit: '%', numerator: Math.round(v.reopenRate * 1000), denominator: 1000, grain: RATE_GRAIN, better: 'down', note: 'Reopened ÷ previously closed cases from the Complaints view.' };
    case 'kpi_px_comments_analyzed': return count(v.commentsAnalyzed, 'neutral', 'Analyzed free-text comments from the Voice view.', GRAIN, 'comments');
    case 'kpi_px_negative_feedback_share': return exactRate(v.negativeComments, Math.max(1, v.commentsAnalyzed), 'down', 'Negative Comment Sentiment Share: negative-sentiment comments ÷ analyzed free-text comments. Distinct from Negative Survey Rating Share (Command).');
    case 'kpi_px_emerging_themes': return count(v.emergingThemes, 'down', 'Rising negative themes vs prior period from the Voice view.', GRAIN, 'themes');
    case 'kpi_px_high_priority_feedback': return count(v.highPriorityFeedback, 'down', 'High-priority / safety-flagged comments from the Voice view.', GRAIN, 'comments');
    case 'kpi_px_theme_review_coverage': return { value: v.themeReviewCoverage, kind: 'rate', unit: '%', numerator: Math.round(v.themeReviewCoverage * 1000), denominator: 1000, grain: RATE_GRAIN, better: 'up', note: 'Human-reviewed classifications ÷ analyzed comments from the Voice view.' };
    case 'kpi_px_depts_meeting_target': return count(v.deptsMeetingTarget, 'up', 'Departments meeting experience target with adequate sample from the Departments view.', GRAIN, 'departments');
    case 'kpi_px_lowest_dimension': return { value: v.lowestDimensionScore, kind: 'index', unit: 'score', numerator: Math.round(v.lowestDimensionScore * 100), denominator: 100, grain: RATE_GRAIN, better: 'up', note: `Lowest dimension (${v.lowestDimension}) mean on the internal 0–10 scale from the Departments view. Display as /10.` };
    case 'kpi_px_coverage_gap': return count(v.coverageGap, 'down', 'Departments below minimum eligible response coverage from the Departments view.', GRAIN, 'departments');
    case 'kpi_px_material_variance': return { value: v.materialVariance, kind: 'index', unit: 'points', numerator: Math.round(v.materialVariance * 100), denominator: 100, grain: RATE_GRAIN, better: 'down', note: 'Max−min overall score among adequately sampled departments from the Departments view.' };
    case 'kpi_px_depts_requiring_review': return count(v.deptsRequiringReview, 'down', 'Departments requiring experience review from the Departments view.', GRAIN, 'departments');
    case 'kpi_px_addressable_gap': return { value: v.addressableGap, kind: 'index', unit: 'points', numerator: Math.round(v.addressableGap * 100), denominator: 100, grain: RATE_GRAIN, better: 'down', note: 'Points between current overall and illustrative target from Optimization.' };
    case 'kpi_px_improvement_opportunities': return count(v.improvementOpportunities, 'neutral', 'Eligible improvement opportunities from Optimization.', GRAIN, 'actions');
    case 'kpi_px_modeled_uplift': return { value: v.modeledUplift, kind: 'index', unit: 'points', numerator: Math.round(v.modeledUplift * 100), denominator: 100, grain: RATE_GRAIN, better: 'up', note: 'Illustrative overall-score uplift under documented assumptions from Optimization.' };
    case 'kpi_px_complaint_reduction': return count(v.complaintReduction, 'up', 'Potential preventable complaints under assumptions from Optimization.', GRAIN, 'complaints');
    case 'kpi_px_priority_coverage': return { value: v.priorityCoverage, kind: 'rate', unit: '%', numerator: Math.round(v.priorityCoverage * 1000), denominator: 1000, grain: RATE_GRAIN, better: 'up', note: 'Priority actions with owner ÷ priority opportunities from Optimization.' };
    default: return null;
  }
}

/** Revenue Cycle KPIs bound to the shared RCM view. Amounts are fictional SAR; modeled values are illustrative, not collected cash. */
function rcmMapped(key: string, hospital: string, year: number): Raw | null {
  const v = buildRcmView(hospital, year, 'year');
  const days = (value: number, better: Raw['better'], note: string) => duration(value, 'days', better, note);
  switch (key) {
    case 'kpi_rcm_net_patient_revenue': return money(v.netPatientRevenue, 'Gross charges − contractual allowances from the RCM Command view. Recognized net revenue, not cash.', 'up');
    case 'kpi_rcm_net_collection_rate': return exactRate(v.cashApplied, v.netPatientRevenue, 'up', 'Period Cash-to-Net Revenue Ratio = period cash applied ÷ period net patient revenue. Cash may settle prior-period AR — not a cohort-adjusted / collectible net collection rate.');
    case 'kpi_rcm_gross_denial_rate': return exactRate(v.deniedClaims, v.adjudicatedClaims, 'down', 'Unique denied claims ÷ unique adjudicated claims (claim count) from the RCM Command view.');
    case 'kpi_rcm_days_in_ar': return days(v.daysInAr, 'down', 'Ending AR ÷ (net patient revenue ÷ days in period) from the RCM Command view.');
    case 'kpi_rcm_outstanding_ar': return money(v.closingAR, 'Period-end AR snapshot from the RCM Command view — not the sum of monthly balances.', 'down');
    case 'kpi_rcm_revenue_at_risk': return money(v.revenueAtRisk, 'Recoverable denials + unbilled value + AR over 90 days from the RCM Command view. Illustrative exposure, not collected cash.', 'down');
    case 'kpi_rcm_eligibility_verification_rate': return exactRate(v.eligibilityVerified, v.eligibilityRequired, 'up', 'Verified ÷ required eligibility checks from the RCM Eligibility view.');
    case 'kpi_rcm_coverage_exception_rate': return exactRate(v.coverageExceptions, v.eligibilityVerified, 'down', 'Coverage exceptions ÷ verified eligibility responses from the RCM Eligibility view.');
    case 'kpi_rcm_preauth_approval_rate': return exactRate(v.authApproved, v.authDecided, 'up', 'Approved ÷ decided authorization requests (pending excluded) from the RCM Eligibility view.');
    case 'kpi_rcm_pending_authorizations': return count(v.authPending, 'down', 'Open authorization requests at observation from the RCM Eligibility view.', GRAIN, 'requests');
    case 'kpi_rcm_auth_turnaround_days': return days(v.authTurnaroundDays, 'down', 'Volume-weighted days from authorization request to decision from the RCM Eligibility view.');
    case 'kpi_rcm_auth_denial_exposure': return money(v.authDenialExposure, 'Denied claim value attributable to authorization reasons from the RCM Eligibility view. Exposure, not collected cash.', 'down');
    case 'kpi_rcm_charge_capture_rate': return exactRate(v.capturedCharges, v.chargeableServices, 'up', 'Captured ÷ eligible chargeable services from the RCM Billing view.');
    case 'kpi_rcm_unbilled_encounters': return count(v.unbilledEncounters, 'down', 'Eligible completed encounters without an invoice at observation from the RCM Billing view.', GRAIN, 'encounters');
    case 'kpi_rcm_unbilled_service_value': return money(v.unbilledValue, 'Expected net value of eligible unbilled services from the RCM Billing view. Not gross charges as cash.', 'down');
    case 'kpi_rcm_charge_to_bill_lag': return days(v.chargeToBillLag, 'down', 'Volume-weighted days from charge post to invoice from the RCM Billing view.');
    case 'kpi_rcm_coding_completion_rate': return exactRate(v.codingComplete, v.codingReady, 'up', 'Coding complete ÷ encounters ready for coding from the RCM Billing view.');
    case 'kpi_rcm_billing_exception_rate': return exactRate(v.billingExceptions, v.invoicesCreated, 'down', 'Billing exceptions ÷ invoices created from the RCM Billing view.');
    case 'kpi_rcm_claims_submitted': return count(v.uniqueClaims, 'neutral', 'Unique claim IDs submitted from the RCM Claims view. Resubmissions are not new unique claims.', GRAIN, 'claims');
    case 'kpi_rcm_first_pass_acceptance': return exactRate(v.firstPassAccepted, v.uniqueClaims, 'up', 'Claims accepted on first submission ÷ unique claims from the RCM Claims view. Clearinghouse reject ≠ payer denial.');
    case 'kpi_rcm_denied_claims': return count(v.deniedClaims, 'down', 'Unique adjudicated claims with a denied line from the RCM Claims view.', GRAIN, 'claims');
    case 'kpi_rcm_denial_rate_by_value': return exactRate(v.deniedAmount, v.adjudicatedAmount, 'down', 'Denied amount ÷ adjudicated claim amount from the RCM Claims view.');
    case 'kpi_rcm_appeal_success_rate': return exactRate(v.appealWon, v.appealDecided, 'up', 'Successful ÷ decided appeals (pending excluded) from the RCM Claims view.');
    case 'kpi_rcm_recoverable_denial_value': return money(v.recoverableDenialValue, 'Denied amount assessed recoverable from the RCM Claims view. Illustrative — not collected.', 'up');
    case 'kpi_rcm_cash_applied': return money(v.cashApplied, 'Period cash applied to encounter AR from the RCM Collections view. A flow, distinct from receipts and ending AR.', 'up');
    case 'kpi_rcm_ar_over_90': return money(v.arOver90, `AR aged over 90 days (${v.agingClock}) from the RCM Collections view.`, 'down');
    case 'kpi_rcm_collection_effectiveness': return exactRate(v.cashApplied, v.openingAR + v.newReceivables - v.approvedAdjustments, 'up', 'Cash applied ÷ (opening AR + new receivables − approved adjustments) from the RCM Collections view.');
    case 'kpi_rcm_unapplied_cash': return money(v.unappliedCash, 'Remittances received but not yet applied from the RCM Collections view. Cash received ≠ cash applied.', 'down');
    case 'kpi_rcm_payer_payment_delay': return days(v.payerPaymentDelay, 'down', 'Volume-weighted days from submission to first payment for paid claims from the RCM Collections view.');
    case 'kpi_rcm_patient_ar': return money(v.patientAR, 'Ending patient-responsibility AR from the RCM Collections view. Distinct from insurer AR.', 'down');
    case 'kpi_rcm_confirmed_leakage': return money(v.confirmedLeakage, 'Missed charges + avoidable write-offs + underpayments with exclusive attribution from the RCM Leakage view. Contractual allowances excluded.', 'down');
    case 'kpi_rcm_potential_leakage': return money(v.potentialLeakage, 'Suspected exposure under review from the RCM Leakage view. Not additive to confirmed leakage.', 'down');
    case 'kpi_rcm_underpayment_value': return money(v.underpaymentValue, 'Allowed − paid on underpaid adjudicated lines from the RCM Leakage view.', 'down');
    case 'kpi_rcm_missed_charge_exposure': return money(v.missedChargeExposure, 'Expected net of eligible chargeable services not captured from the RCM Leakage view.', 'down');
    case 'kpi_rcm_avoidable_writeoffs': return money(v.avoidableWriteoffs, 'Preventable write-offs from the RCM Leakage view. Contractual adjustments and bad debt excluded.', 'down');
    case 'kpi_rcm_recovery_opportunities': return count(v.recoveryOpportunities, 'neutral', 'Open recovery work items from the RCM Leakage view.', GRAIN, 'work items');
    case 'kpi_rcm_recoverable_opportunity': return money(v.recoverableOpportunity, 'Illustrative feasible recovery from RCM Optimization. Not realized cash.', 'up');
    case 'kpi_rcm_eligible_denial_recovery': return money(v.eligibleDenialRecovery, 'Modeled recoverable denial share from RCM Optimization. Illustrative — not collected.', 'up');
    case 'kpi_rcm_collection_improvement': return money(v.collectionImprovement, 'Illustrative cash timing uplift from RCM Optimization. Not new recognized revenue.', 'up');
    case 'kpi_rcm_preventable_leakage': return money(v.preventableLeakage, 'Confirmed leakage addressable by process interventions from RCM Optimization. Illustrative.', 'up');
    case 'kpi_rcm_cash_acceleration': return money(v.cashAcceleration, 'Illustrative earlier application of eligible collections from RCM Optimization. A timing shift, not new revenue.', 'up');
    default: return null;
  }
}

function mapped(kpi: KpiDef, fact: AnnualFact, hospital: string, year: number): Raw | null {
  const key = kpi.key;
  // Registry-origin kpi_rcm_* (legacy Revenue story, e.g. outstanding AR) keep their fact-ledger binding below.
  if (key.startsWith('kpi_rcm_') && kpi.origin === 'demo_assumption') return rcmMapped(key, hospital, year);
  if (key.startsWith('kpi_px_')) return pxMapped(key, hospital, year);
  if (key.startsWith('kpi_icu_')) return icuMapped(key, hospital, year);
  if (key.startsWith('kpi_rx_')) return pharmacyMapped(key, hospital, year);
  const admissions = fact.admissions;
  const discharges = fact.discharges;
  const encounters = fact.encounters;
  const arrivals = fact.edArrivals;
  const staffed = fact.staffedBeds;
  const orders = fact.labOrders;
  const claims = fact.claimsSubmitted;
  const days = year % 4 === 0 ? 366 : 365;
  const occ = staffed ? fact.occupiedBeds / staffed : 0;

  if (key === 'kpi_department_count') return count(fact.wardCount, 'neutral', 'Ward lines in the fictional hospital.', 'Organization snapshot', 'departments');
  if (key === 'kpi_hospital_facility_count') return count(hospital === 'ALL' ? 5 : 1, 'neutral', 'Hospitals in the selected scope.', 'Organization snapshot', 'facilities');
  if (key === 'kpi_patient_active_count') return count(fact.activePatients, 'neutral', 'Distinct fictional people with activity in the year. Months are not added together.', 'Annual distinct snapshot');
  if (key === 'kpi_patient_new_count') return count(Math.round(fact.activePatients * 0.18), 'neutral', 'New patients are 18% of the annual distinct snapshot in this story.');
  if (key === 'kpi_patient_with_encounter_count') return count(fact.activePatients, 'neutral', 'Every distinct patient in the snapshot has at least one encounter in this story.');
  if (key === 'kpi_patient_encounters_per_patient') return multiplier(encounters, fact.activePatients, 'encounters per patient', 'Annual encounters ÷ annual distinct patients.');
  if (key === 'kpi_encounter_volume' || key === 'kpi_encounter_by_status_count') return count(encounters, 'neutral', 'All encounters in the year. Status is a label on this total, not a second population.');
  if (key === 'kpi_outpatient_encounter_volume') return count(fact.apptAttended, 'neutral', 'Attended appointments. This is the outpatient encounter cohort.');
  if (key === 'kpi_inpatient_encounter_volume') return count(admissions, 'neutral', 'Inpatient encounters are the admission cohort.');
  if (key === 'kpi_emergency_encounter_volume_proxy' || key === 'kpi_ed_visit_volume') return count(arrivals, 'neutral', 'ED arrivals. The same cohort as the emergency workspace.');
  if (key === 'kpi_ed_triage_volume') {
    const beforeTriage = leaveSplit(fact.edLeft).before;
    return count(arrivals - beforeTriage, 'neutral', 'Arrivals minus patients who left before triage (62/38 leave split). Patients who left after triage remain in the triaged count.');
  }
  if (key === 'kpi_admission_volume') return count(admissions, 'neutral', 'Inpatient admissions. The same integer as the inpatient census ledger.');
  if (key === 'kpi_discharge_volume' || key === 'kpi_expected_discharge_volume') return count(discharges, 'neutral', 'Discharges in the census identity.');
  if (key === 'kpi_transfer_volume') return count(fact.transfersIn + fact.transfersOut, 'neutral', 'Transfers in plus transfers out. These are events, not the net census.');
  if (key === 'kpi_net_census_change') return count(0, 'neutral', 'Admissions + transfers in − discharges − transfers out − deaths = 0 by the census identity.');
  if (key === 'kpi_inpatient_census_count' || key === 'kpi_inpatient_bedded_count') return count(fact.occupiedBeds, 'neutral', 'Average month-end occupied beds. A snapshot, not a sum of monthly census.', 'Average month-end snapshot');
  if (key === 'kpi_mortality_event_volume') return count(fact.deaths, 'down', 'Inpatient deaths in the census identity. Not an ED or post-discharge count.');

  if (key === 'kpi_bed_total_count' || key === 'kpi_bed_staffed_count') return count(staffed, 'neutral', 'Staffed beds in the month-end snapshot.', 'Average month-end snapshot', 'beds');
  if (key === 'kpi_bed_occupied_staffed_count') return count(fact.occupiedBeds, 'neutral', 'Occupied staffed beds.', 'Average month-end snapshot', 'beds');
  if (key === 'kpi_bed_available_now_count') return count(fact.availableBeds, 'up', 'Available beds. Occupied + available + blocked = staffed.', 'Average month-end snapshot', 'beds');
  if (key === 'kpi_bed_blocked_count') return count(fact.blockedBeds, 'down', 'Blocked beds in the same snapshot.', 'Average month-end snapshot', 'beds');
  if (key === 'kpi_bed_cleaning_count') return count(Math.round(fact.blockedBeds * 0.6), 'down', 'Cleaning is 60% of blocked beds in this story, and stays inside the blocked count.');
  if (key === 'kpi_bed_assignment_volume') return count(admissions, 'neutral', 'One assignment per admission.');
  if (key === 'kpi_bed_awaiting_count' || key === 'kpi_inpatient_awaiting_placement_count') return count(Math.round(arrivals * 0.04), 'down', 'Patients waiting for a bed are 4% of ED arrivals, not a share of staffed beds.');
  if (key === 'kpi_bed_waitlist_volume' || key === 'kpi_ed_bed_waitlist_volume') return count(Math.round(arrivals * 0.08), 'down', 'Bed-request events are 8% of ED arrivals.');

  if (key === 'kpi_lab_order_volume' || key === 'kpi_lab_test_orders' || key === 'kpi_lab_tests_ordered') {
    if (key === 'kpi_lab_test_orders') {
      const view = buildLaboratoryView(hospital, year, 'year');
      return count(view.orders, 'neutral', 'Laboratory test orders from Laboratory Command view. Distinct from specimens and test items.');
    }
    return count(orders, 'neutral', 'Laboratory orders. The same integer as the laboratory workspace.');
  }
  if (key === 'kpi_lab_completed_tests' || key === 'kpi_lab_tests_completed') {
    const view = buildLaboratoryView(hospital, year, 'year');
    return count(view.completedTests, 'neutral', 'Completed (released) laboratory tests from Laboratory Command view.');
  }
  if (key === 'kpi_lab_result_volume') return count(fact.labResulted, 'neutral', 'Resulted tests. Resulted + cancelled + delayed = orders.');
  if (key === 'kpi_lab_cancelled_tests') return count(fact.labCancelled, 'down', 'Cancelled tests inside the order identity.');
  if (key === 'kpi_lab_samples_received') {
    const view = buildLaboratoryView(hospital, year, 'year');
    return count(view.samplesReceived, 'neutral', 'Samples received from Laboratory Samples view.');
  }
  if (key === 'kpi_lab_testing_backlog') {
    const view = buildLaboratoryView(hospital, year, 'year');
    return count(view.testingBacklog, 'down', 'Laboratory testing backlog (pending analysis) from Laboratory Analyzers view.');
  }
  if (key === 'kpi_lab_pending_validation') {
    const view = buildLaboratoryView(hospital, year, 'year');
    return count(view.pendingValidation, 'down', 'Results awaiting validation from Laboratory Quality view.');
  }
  if (key === 'kpi_lab_over_target') {
    const view = buildLaboratoryView(hospital, year, 'year');
    return count(view.resultsOverTarget, 'down', 'Released results over TAT target from Laboratory Quality view.');
  }
  if (key === 'kpi_lab_analyzer_downtime') {
    const view = buildLaboratoryView(hospital, year, 'year');
    return count(view.chemistryDowntimeHours, 'down', 'Chemistry analyzer downtime hours from Laboratory Analyzers view — not hospital-wide downtime.', GRAIN, 'hours');
  }
  if (key === 'kpi_lab_unused_analyzer_hours') {
    const view = buildLaboratoryView(hospital, year, 'year');
    return count(view.unusedHours, 'down', 'Unused staffed analyzer hours from Laboratory Analyzers view.', GRAIN, 'hours');
  }
  if (key === 'kpi_lab_recoverable_hours') {
    const view = buildLaboratoryView(hospital, year, 'year');
    return count(view.recoverableHours, 'up', 'Potentially recoverable lab hours from Laboratory Optimization.', GRAIN, 'hours');
  }
  if (key === 'kpi_lab_additional_tests') {
    const view = buildLaboratoryView(hospital, year, 'year');
    return count(view.additionalTests, 'up', 'Feasible additional tests from Laboratory Optimization.');
  }
  if (key === 'kpi_lab_eligible_backlog') {
    const view = buildLaboratoryView(hospital, year, 'year');
    return count(view.eligibleBacklog, 'neutral', 'Eligible testing backlog from Laboratory Optimization.');
  }
  if (key === 'kpi_radiology_order_volume' || key === 'kpi_rad_imaging_order_volume' || key === 'kpi_rad_imaging_requests') {
    if (key === 'kpi_rad_imaging_requests') {
      const view = buildRadiologyView(hospital, year, 'year');
      return count(view.requests, 'neutral', 'Imaging requests from Radiology Command view. Completed + Cancelled + No-show + Pending = Requests.');
    }
    return count(fact.radOrders, 'neutral', 'Radiology orders.');
  }
  if (key === 'kpi_radiology_result_volume' || key === 'kpi_rad_final_report_count') {
    const view = buildRadiologyView(hospital, year, 'year');
    return count(view.signedReports, 'neutral', 'Final signed reports from Radiology Quality lifecycle. Distinct from completed exams.');
  }
  if (key === 'kpi_rad_completed_exams') {
    const view = buildRadiologyView(hospital, year, 'year');
    return count(view.completed, 'neutral', 'Completed exams (examination lifecycle) from Radiology Command view. Distinct from signed reports.');
  }
  if (key === 'kpi_rad_preliminary_report_count') return count(Math.round(fact.radReported * 0.22), 'neutral', 'Preliminary reports are 22% of final reports, not an extra order.');
  if (key === 'kpi_rad_pending_exams') {
    const view = buildRadiologyView(hospital, year, 'year');
    return count(view.pending, 'down', 'Pending unfinished imaging requests from Radiology Command view.');
  }
  if (key === 'kpi_rad_imaging_backlog') {
    const view = buildRadiologyView(hospital, year, 'year');
    return count(view.closingBacklog, 'down', 'Closing imaging waitlist from Radiology Access view.');
  }
  if (key === 'kpi_rad_overdue_imaging' || key === 'kpi_rad_overdue_exams') {
    if (key === 'kpi_rad_overdue_imaging') {
      const view = buildRadiologyView(hospital, year, 'year');
      return count(view.overdueImaging, 'down', 'Imaging cases beyond illustrative access target. Bound to Radiology Access view.');
    }
    return count(Math.round(fact.radOrders * 0.04), 'down', 'Overdue exams are 4% of radiology orders.');
  }
  if (key === 'kpi_rad_waitlist_growth') {
    const view = buildRadiologyView(hospital, year, 'year');
    return count(view.waitlistGrowth, 'down', 'Closing minus opening imaging backlog for the reporting year.');
  }
  if (key === 'kpi_rad_unsigned_reports') {
    const view = buildRadiologyView(hospital, year, 'year');
    return count(view.unsignedReports, 'down', 'Unsigned report backlog at year-end observation. Bound to Radiology Quality view.');
  }
  if (key === 'kpi_rad_reports_over_target') {
    const view = buildRadiologyView(hospital, year, 'year');
    return count(view.reportsOverTarget, 'down', 'Final reports beyond illustrative TAT target. Bound to Radiology Quality view.');
  }
  if (key === 'kpi_rad_unused_scanner_hours') {
    const view = buildRadiologyView(hospital, year, 'year');
    return count(view.unusedHours, 'down', 'Unused staffed scanner hours from Radiology Utilization view.', GRAIN, 'hours');
  }
  if (key === 'kpi_rad_scanner_downtime') {
    const view = buildRadiologyView(hospital, year, 'year');
    return count(view.downtimeHours, 'down', 'Scanner downtime hours inside staffed sessions. Bound to Radiology Utilization view.', GRAIN, 'hours');
  }
  if (key === 'kpi_rad_recoverable_hours') {
    const view = buildRadiologyView(hospital, year, 'year');
    return count(view.recoverableHours, 'up', 'Exclusive recoverable scanner hours from Radiology Optimization.', GRAIN, 'hours');
  }
  if (key === 'kpi_rad_additional_exams') {
    const view = buildRadiologyView(hospital, year, 'year');
    return count(view.additionalExams, 'up', 'Feasible additional exams under capacity constraints. Bound to Radiology Optimization.');
  }
  if (key === 'kpi_rad_eligible_waitlist') {
    const view = buildRadiologyView(hospital, year, 'year');
    return count(view.eligibleWaitlist, 'up', 'Eligible waitlist cases that could use recovered capacity.');
  }
  if (key === 'kpi_rad_stat_exam_volume') return count(Math.round(fact.radOrders * 0.12), 'neutral', 'STAT exams are 12% of radiology orders.');
  if (key === 'kpi_rad_unack_critical_count') {
    const view = buildRadiologyView(hospital, year, 'year');
    return count(Math.max(0, view.criticalResults - view.criticalAcked), 'down', 'Unacknowledged critical findings from Radiology Quality view.');
  }

  if (key === 'kpi_med_order_volume') return count(fact.pharmOrders, 'neutral', 'Medication orders.');
  if (key === 'kpi_med_dispense_volume') return count(fact.pharmDispensed, 'neutral', 'Dispensed orders. Dispensed does not exceed ordered.');
  if (key === 'kpi_med_admin_volume') return count(fact.pharmAdmin, 'neutral', 'Administrations. Administrations do not exceed dispensed.');
  if (key === 'kpi_med_safety_event_volume') return count(Math.round(fact.pharmAdmin * 0.004), 'down', 'Safety events are 0.4% of administrations.');

  if (key === 'kpi_surgery_case_volume' || key === 'kpi_surg_case_request_volume') return count(fact.surgRequests, 'neutral', 'Requested surgical cases. Completed + cancelled = requested.');
  if (key === 'kpi_surg_completed_cases') return count(fact.surgCompleted, 'up', 'Completed cases.');
  if (key === 'kpi_surgery_cancellation_volume') return count(fact.surgCancelled, 'down', 'Cancelled cases.');
  if (key === 'kpi_surg_elective_volume') return count(Math.round(fact.surgRequests * 0.78), 'neutral', 'Elective cases are 78% of requests.');
  if (key === 'kpi_surg_emergency_volume') return count(fact.surgRequests - Math.round(fact.surgRequests * 0.78), 'neutral', 'The remainder of requests after the elective share.');
  if (key === 'kpi_or_session_volume') return count(Math.round(fact.surgCompleted / 2), 'neutral', 'Sessions are completed cases ÷ 2 in this story.');
  if (key === 'kpi_surg_pending_cases') return count(fact.surgCancelled, 'down', 'Pending work in this story is the cancelled-request cohort, not a third population.');
  if (key === 'kpi_surg_overdue_cases') {
    const view = buildSurgeryView(hospital, year, 'year');
    return count(view.overdueCases, 'down', 'Overdue elective backlog beyond illustrative wait target. Bound to Surgery Access view.');
  }

  if (key === 'kpi_claim_volume') return count(claims, 'neutral', 'Submitted claims. The same integer as the revenue workspace.');
  if (key === 'kpi_claim_line_volume') return count(Math.round(claims * 2.4), 'neutral', 'Claim lines are 2.4 per submitted claim in this story. A multiplier of the claim cohort, not a second claim total.');
  if (key === 'kpi_denial_volume') return count(fact.claimsDenied, 'down', 'Denied claims. Paid + denied + pending = submitted.');
  if (key === 'kpi_payment_volume') return count(fact.claimsPaid, 'up', 'Paid claims.');
  if (key === 'kpi_authorization_volume') return count(fact.preauthRequested, 'neutral', 'Pre-authorization requests.');
  if (key === 'kpi_rcm_rejected_claim_count') return count(Math.round(claims * 0.012), 'down', 'Technical rejections are 1.2% of submitted claims and are not the clinical denial count.');
  if (key === 'kpi_rcm_unresolved_denial_count') return count(Math.round(fact.claimsDenied * 0.35), 'down', 'Unresolved denials are 35% of denied claims.');
  if (key === 'kpi_rcm_dnfb_claim_count') return count(Math.round(claims * 0.03), 'down', 'Discharged-not-final-billed claims are 3% of submitted claims.');

  if (key === 'kpi_appointment_volume') return count(fact.apptBooked, 'neutral', 'Booked appointments. Attended + cancelled + no-show = booked.');
  if (key === 'kpi_appointment_slot_volume') return count(fact.apptSlots, 'neutral', 'Offered slots. Booked does not exceed slots.');
  if (key === 'kpi_appointment_waitlist_size' || key === 'kpi_outpatient_waiting_count') return count(Math.max(0, fact.apptDemand - fact.apptBooked), 'down', 'Unbooked demand. It is not added to attended visits.');
  if (key === 'kpi_outpatient_in_consultation_count') return count(Math.round(fact.apptAttended / days), 'neutral', 'A daily snapshot: attended visits ÷ days in the year.');

  if (key === 'kpi_diagnosis_volume' || key === 'kpi_dx_newly_recorded_volume') return count(Math.round(encounters * 2.35), 'neutral', 'Diagnosis records use the fixed 2.35 diagnoses-per-encounter assumption.');
  if (key === 'kpi_dx_diagnosis_record_count') return count(Math.round(encounters * 2.35), 'neutral', 'The same diagnosis-record assumption as diagnosis volume.');
  if (key === 'kpi_procedure_volume') return count(fact.surgCompleted + Math.round(fact.apptAttended * 0.15), 'neutral', 'Completed operations plus 15% of attended visits with a procedure.');
  if (key === 'kpi_comorbidity_volume') return count(Math.round(fact.activePatients * 0.41), 'neutral', 'Comorbidity records are 41% of distinct patients.');
  if (key === 'kpi_dx_diagnosed_patients') return count(Math.round(fact.activePatients * 0.92), 'neutral', 'Diagnosed patients are 92% of the distinct-patient snapshot.');
  if (key === 'kpi_dx_diagnosed_encounters' || key === 'kpi_dx_principal_encounter_volume') return count(Math.round(encounters * 0.96), 'neutral', 'Encounters with a principal diagnosis are 96% of encounters.');
  if (key === 'kpi_dx_chronic_patients') return count(Math.round(fact.activePatients * 0.37), 'neutral', 'Chronic-disease patients are 37% of distinct patients.');
  if (key === 'kpi_dx_pending_coding') return count(Math.round(discharges * 0.06), 'down', 'Pending coding is 6% of discharges.');

  if (key === 'kpi_vital_sign_volume') return count(admissions * 12, 'neutral', 'Twelve vital-sign sets per admission in this story. Individual vital values are not modeled.');
  if (key === 'kpi_allergy_volume') return count(Math.round(fact.activePatients * 0.22), 'neutral', 'Allergy records are 22% of distinct patients.');
  if (key === 'kpi_alert_event_volume') return count(Math.round(admissions * 0.08 + orders * 0.01), 'down', 'Operational alerts combine an admission share and a laboratory share.');
  if (key === 'kpi_alerts_high_los_discharge_count') {
    const longStayRate = longStayRateFromP90(fact.ipLosP90Days);
    return count(Math.round(discharges * longStayRate), 'down', `High-LOS discharges use the same 7-day review line as long-stay rate (${(longStayRate * 100).toFixed(1)}% of discharges).`);
  }
  if (key === 'kpi_alerts_lab_abnormal_burst_count') return count(Math.round(fact.labResulted * 0.02), 'down', 'Abnormal bursts are 2% of resulted tests.');
  if (key === 'kpi_alerts_readmission_7d_event_count') return count(Math.round(discharges * 0.018), 'down', 'Seven-day readmissions are 1.8% of discharges.');

  if (key === 'kpi_staff_headcount' || key === 'kpi_wf_active_headcount') return count(Math.round(fact.filledFte), 'neutral', 'Headcount is the filled FTE rounded to people.', 'Staffing snapshot');
  if (key === 'kpi_provider_count') return count(Math.round(fact.filledFte * 0.14), 'neutral', 'Physicians are 14% of filled FTE, the same share as the skill mix.', 'Staffing snapshot');
  if (key === 'kpi_wf_active_fte') return fte(fact.filledFte, 'Filled FTE snapshot.');
  if (key === 'kpi_wf_open_vacant_fte') return fte(Math.max(0, fact.requiredFte - fact.filledFte), 'Required FTE minus filled FTE.', 'down');
  if (key === 'kpi_wf_separations') return count(Math.round(fact.filledFte * 0.09), 'down', 'Separations are 9% of filled FTE over the year.');
  if (key === 'kpi_shift_volume') return count(Math.round(fact.filledFte * days / 3), 'neutral', 'Shifts are filled FTE × days ÷ 3.');
  if (key === 'kpi_attendance_volume') return count(Math.round(fact.filledFte * days * 0.93), 'neutral', 'Attendance events are filled FTE × days × 93%.');
  if (key === 'kpi_leave_volume') return count(Math.round(fact.filledFte * 14), 'neutral', 'Leave events are 14 per filled FTE.');
  if (key === 'kpi_wf_scheduled_hours') return duration(fact.requiredFte * days * 8, 'hours', 'neutral', 'Required FTE × days × 8 hours.');
  if (key === 'kpi_wf_required_hours') return duration(fact.requiredFte * days * 8, 'hours', 'neutral', 'The same required-hour identity as scheduled hours.');
  if (key === 'kpi_wf_worked_hours') return duration(fact.filledFte * days * 8 * 0.93 + fact.overtimeHours, 'hours', 'neutral', 'Worked hours are attended hours plus overtime.');
  if (key === 'kpi_wf_productive_hours') return duration(fact.filledFte * days * 8 * 0.85, 'hours', 'up', 'Productive hours are 85% of attended base hours, before overtime.');

  if (key === 'kpi_pipeline_landing_stream_count') return count(12, 'neutral', 'Twelve landed streams are modeled: admissions, discharges, encounters, laboratory, radiology, pharmacy, surgery, claims, appointments, workforce, beds, and experience.', 'Organization snapshot', 'streams');
  if (key === 'kpi_pipeline_landing_rowcount_total' || key === 'kpi_pipeline_min_stream_rowcount') {
    const rows = admissions + discharges + encounters + orders + fact.radOrders + fact.pharmOrders + fact.surgRequests + claims + fact.apptBooked;
    return count(key.endsWith('min_stream_rowcount') ? Math.min(admissions, discharges, orders) : rows, 'neutral', 'Row counts are the scenario event totals for the selected hospital, not an independent warehouse extract.');
  }
  if (key === 'kpi_pipeline_max_freshness_lag_hours' || key.includes('freshness')) return duration(fact.freshnessHours, 'hours', 'down', 'One modeled landing lag, 6.5 hours, for every stream. It is not a measured per-table lag.');

  if (key.startsWith('kpi_dq_') && key.includes('rate')) return ratio(0, Math.max(1, admissions), 'down', 'The fictional extract has no null, duplicate, or invalid keys for this check. The rate is 0 ÷ the admission cohort.');
  if (key.startsWith('kpi_dq_')) return zeroDefect('The fictional extract has no rows with this defect.');

  if (/coverage|completeness|readiness/.test(key)) return share(0.99, encounters, 'up', 'Modelled key coverage is 99% of encounters. The displayed rate is the rounded numerator ÷ that denominator.');

  if (key === 'kpi_admission_per_encounter_rate') return ratio(admissions, encounters, 'neutral', 'Admissions ÷ encounters.');
  if (key === 'kpi_discharge_per_admission_rate' || key === 'kpi_discharge_to_admission_ratio') return ratio(discharges, admissions, 'neutral', 'Discharges ÷ admissions. Can exceed 100% because transfers in are part of the census identity.');
  if (key === 'kpi_exec_care_intensity_lab_per_admission') return multiplier(orders, admissions, 'orders per admission', 'Laboratory orders ÷ admissions.');
  if (key === 'kpi_lab_orders_per_encounter') return multiplier(orders, encounters, 'orders per encounter', 'Laboratory orders ÷ encounters.');
  if (key === 'kpi_dx_avg_diagnoses_per_encounter') return multiplier(Math.round(encounters * 2.35), encounters, 'diagnoses per encounter', 'Fixed fictional intensity of 2.35. The numerator is the rounded diagnosis-record count.');
  if (key === 'kpi_exec_throughput_index') return count(discharges, 'up', 'Throughput in this story is the discharge count, not a unitless score.');

  if (key === 'kpi_bed_occupancy_rate' || key === 'kpi_bed_occupied_rate_status') return ratio(fact.occupiedBeds, staffed, 'neutral', 'Occupied beds ÷ staffed beds. A month-end snapshot, not a sum of occupancy.');
  if (key === 'kpi_bed_available_rate_status') return ratio(fact.availableBeds, staffed, 'up', 'Available beds ÷ staffed beds.');
  if (key === 'kpi_bed_icu_occupancy_rate') return ratio(fact.icuOccupied, fact.icuStaffed, 'neutral', 'ICU occupied ÷ ICU staffed.');
  if (key === 'kpi_bed_wait_gt_4h_rate') return share(0.06 + occ * 0.08, arrivals, 'down', 'Arrivals waiting more than 4 hours for a bed. The denominator is ED arrivals.');
  if (key === 'kpi_rad_modality_utilization' || key === 'kpi_rad_scanner_utilization') {
    if (key === 'kpi_rad_scanner_utilization') {
      const view = buildRadiologyView(hospital, year, 'year');
      return exactRate(view.inSessionUsed, view.staffedHours, 'up', 'Scanner Utilization = in-session used ÷ staffed hours from Radiology Utilization view. Overtime is separate.');
    }
    return ratio(fact.occupiedBeds, staffed, 'neutral', 'Utilization uses the same occupied ÷ staffed snapshot as bed occupancy. It is labelled as that capacity ratio.');
  }
  if (key === 'kpi_rad_ct_downtime') {
    const view = buildRadiologyView(hospital, year, 'year');
    return count(view.ctDowntimeHours, 'down', 'CT-specific downtime hours inside staffed CT sessions. Bound to Radiology Utilization view.', GRAIN, 'hours');
  }
  if (key === 'kpi_lab_analyzer_utilization') {
    const view = buildLaboratoryView(hospital, year, 'year');
    return exactRate(view.inSessionUsed, view.staffedHours, 'up', 'Analyzer Utilization = in-session ÷ staffed hours from Laboratory Analyzers view. Overtime is separate.');
  }
  if (key === 'kpi_lab_tests_per_hour') {
    const view = buildLaboratoryView(hospital, year, 'year');
    return multiplier(view.completedTests, Math.max(view.inSessionUsed, 1), 'tests per hour', 'Completed tests ÷ in-session analyzer hours from Laboratory Analyzers view.');
  }
  if (key === 'kpi_surg_or_utilization') {
    const view = buildSurgeryView(hospital, year, 'year');
    return exactRate(view.usedHours, view.staffedHours, 'up', 'OR Utilization = (procedure + turnover) ÷ staffed hours from Surgery OR view. Uncapped; overtime is separate.');
  }

  if (key === 'kpi_ed_esi1_share') return ratio(fact.acuity1, arrivals, 'neutral', 'ESI 1 ÷ ED arrivals. The shares sum to arrivals.');
  if (key === 'kpi_ed_esi2_share') return ratio(fact.acuity2, arrivals, 'neutral', 'ESI 2 ÷ ED arrivals.');
  if (key === 'kpi_ed_esi3_share') return ratio(fact.acuity3, arrivals, 'neutral', 'ESI 3 ÷ ED arrivals.');
  if (key === 'kpi_ed_esi4_share') return ratio(fact.acuity4, arrivals, 'neutral', 'ESI 4 ÷ ED arrivals.');
  if (key === 'kpi_ed_esi5_share') return ratio(fact.acuity5, arrivals, 'neutral', 'ESI 5 ÷ ED arrivals.');
  if (key === 'kpi_ed_arrival_ambulance_share') return share(0.18, arrivals, 'neutral', 'Ambulance arrivals are 18% of ED arrivals.');
  if (key === 'kpi_ed_arrival_walk_in_share') return share(0.62, arrivals, 'neutral', 'Walk-in arrivals are 62% of ED arrivals.');
  if (key === 'kpi_ed_arrival_transfer_share') return share(0.12, arrivals, 'neutral', 'Transfer arrivals are 12% of ED arrivals.');
  if (key === 'kpi_ed_arrival_other_share') return share(0.08, arrivals, 'neutral', 'Other arrivals are 8% of ED arrivals. These four arrival shares are constructed to sum to 100%.');
  if (key === 'kpi_ed_to_admission_rate') return ratio(fact.edAdmitted, arrivals, 'neutral', 'ED visits admitted ÷ ED arrivals. Admitted visits are included in inpatient admissions.');
  if (key === 'kpi_ed_4h_completion_rate') return share(0.82 - occ * 0.08, arrivals, 'up', 'Arrivals leaving or admitted within 4 hours. The denominator is ED arrivals.');
  if (key === 'kpi_ed_boarding_gt_4h_rate') return share(0.05 + occ * 0.06, fact.edAdmitted, 'down', 'Boarded longer than 4 hours ÷ ED admissions. Not the door-to-provider wait.');
  if (key === 'kpi_ed_72h_revisit_rate') return share(0.034, arrivals, 'down', 'Returns within 72 hours ÷ ED arrivals.');
  if (key === 'kpi_ed_mortality_rate') return ratio(fact.edDeaths, arrivals, 'down', 'Deaths in the emergency cohort before inpatient admission ÷ ED arrivals. This is not inpatient deaths relabelled.');
  if (key === 'kpi_surg_30d_mortality_rate') return ratio(fact.surgDeaths, fact.surgCompleted, 'down', 'Deaths within 30 days of a completed operation ÷ completed cases. The denominator is not all admissions.');
  if (key === 'kpi_dx_in_hospital_mortality_rate') return ratio(fact.deaths, discharges, 'down', 'Inpatient deaths ÷ discharges. This is the discharge cohort, not a diagnosis-code case fatality.');
  if (key === 'kpi_dx_30d_mortality_rate') return ratio(fact.dxDeaths30, discharges, 'down', 'Deaths in the 30 days after discharge ÷ discharges. This count is separate from in-hospital deaths.');

  if (key === 'kpi_appointment_no_show_rate') return ratio(fact.apptNoShow, fact.apptBooked, 'down', 'Appointment no-shows ÷ booked appointments.');
  if (key === 'kpi_rad_no_show_rate') return ratio(fact.radNoShow, fact.radOrders, 'down', 'Radiology no-shows ÷ radiology orders. This is not the appointment no-show cohort.');
  if (key === 'kpi_appointment_cancellation_rate') return ratio(fact.apptCancelled, fact.apptBooked, 'down', 'Cancellations ÷ booked appointments.');
  if (key === 'kpi_appointment_provider_cancel_rate') return share(0.02, fact.apptBooked, 'down', 'Provider cancellations are 2% of booked appointments, inside the cancellation story.');
  if (key === 'kpi_surgery_cancellation_rate' || key === 'kpi_surg_cancellation_rate') return ratio(fact.surgCancelled, fact.surgRequests, 'down', 'Cancelled cases ÷ requested cases.');
  if (key === 'kpi_surg_same_day_cancel_rate') {
    const view = buildSurgeryView(hospital, year, 'year');
    return exactRate(view.sameDayCancels, view.scheduled, 'down', 'Same-day cancellations ÷ scheduled. Bound to Surgery Command view.');
  }
  if (key === 'kpi_lab_cancellation_rate') return ratio(fact.labCancelled, orders, 'down', 'Cancelled tests ÷ laboratory orders.');
  if (key === 'kpi_rad_cancelled_exam_rate') return ratio(fact.radCancelled, fact.radOrders, 'down', 'Cancelled exams ÷ radiology orders.');
  if (key === 'kpi_lab_order_completed_rate' || key === 'kpi_lab_result_to_order_ratio') return ratio(fact.labResulted, orders, 'up', 'Resulted tests ÷ laboratory orders.');
  if (key === 'kpi_lab_stat_share') {
    const view = buildLaboratoryView(hospital, year, 'year');
    return exactRate(view.statTests, view.testItems, 'neutral', 'STAT tests ÷ test items from Laboratory Command view.');
  }
  if (key === 'kpi_rad_exam_completion_rate' || key === 'kpi_rad_completion_rate') {
    const view = buildRadiologyView(hospital, year, 'year');
    return exactRate(view.completed, view.requests, 'up', 'Completed exams ÷ imaging requests. Bound to Radiology Command view.');
  }
  if (key === 'kpi_rad_urgent_share') {
    const view = buildRadiologyView(hospital, year, 'year');
    return exactRate(view.urgentRequests, view.requests, 'neutral', 'Urgent imaging requests ÷ requests. Bound to Radiology Command view.');
  }
  if (key === 'kpi_rad_within_access_target') {
    const view = buildRadiologyView(hospital, year, 'year');
    return exactRate(view.withinTargetCases, view.closingBacklog || 1, 'up', 'Within-target backlog share from Radiology Access view.');
  }
  if (key === 'kpi_rad_schedule_adherence') {
    const view = buildRadiologyView(hospital, year, 'year');
    return share(view.scheduleAdherence, view.completed, 'up', 'On-schedule exam starts from Radiology Utilization view.');
  }
  if (key === 'kpi_surg_completion_rate') return ratio(fact.surgCompleted, fact.surgRequests, 'up', 'Completed cases ÷ requested cases.');
  if (key === 'kpi_lab_result_abnormal_rate') return share(0.14, fact.labResulted, 'neutral', 'Abnormal results are 14% of resulted tests.');
  if (key === 'kpi_lab_result_patient_key_coverage') return share(0.99, fact.labResulted, 'up', 'Result rows carrying a patient key are 99% of resulted tests.');
  if (key === 'kpi_claim_denied_rate' || key === 'kpi_rcm_denial_rate') return ratio(fact.claimsDenied, claims, 'down', 'Denied claims ÷ submitted claims.');
  if (key === 'kpi_revenue_collection_rate') return ratio(fact.payerPaid + fact.patientPaid, fact.allowed, 'up', 'Collected SAR ÷ allowed SAR.');
  if (key === 'kpi_authorization_denied_rate') return ratio(fact.preauthDenied, fact.preauthRequested, 'down', 'Denied pre-authorizations ÷ requested.');
  if (key === 'kpi_rcm_clean_claim_rate') return ratio(claims - fact.claimsDenied - Math.round(claims * 0.012), claims, 'up', 'Submitted claims minus denials minus technical rejections, ÷ submitted claims.');
  if (key === 'kpi_rcm_ar_over_90_rate') return share(0.28, fact.outstanding, 'down', 'The over-90 share of outstanding SAR. The numerator is rounded SAR, and the rate is that integer ÷ outstanding.');
  if (key === 'kpi_rad_stat_exam_rate') return share(0.12, fact.radOrders, 'neutral', 'STAT exams ÷ radiology orders.');
  if (key === 'kpi_rad_repeat_exam_rate') {
    const view = buildRadiologyView(hospital, year, 'year');
    return exactRate(view.repeatExams, view.completed, 'down', 'Repeat exams ÷ completed exams. Bound to Radiology Quality view. Not every repeat is a quality failure.');
  }
  if (key === 'kpi_rad_report_tat_compliance' || key === 'kpi_radiology_tat_breach_rate') {
    const within = key.includes('breach') ? 0.08 + occ * 0.04 : 0.92 - occ * 0.04;
    return share(within, fact.radReported, key.includes('breach') ? 'down' : 'up', 'Report timing compliance uses reported exams as the denominator.');
  }
  if (key === 'kpi_rad_critical_comm_compliance' || key === 'kpi_rad_critical_ack_rate' || key === 'kpi_rad_critical_delay_rate') {
    if (key === 'kpi_rad_critical_ack_rate') {
      const view = buildRadiologyView(hospital, year, 'year');
      return exactRate(view.criticalAcked, view.criticalResults || 1, 'up', 'Acknowledged critical results ÷ critical results. Bound to Radiology Quality view.');
    }
    if (key === 'kpi_rad_critical_delay_rate') {
      const view = buildRadiologyView(hospital, year, 'year');
      return exactRate(view.criticalPendingAck, view.criticalResults || 1, 'down', 'Pending critical acknowledgements ÷ critical results. Distinct from acknowledgement rate.');
    }
    return share(0.94, fact.radReported, 'up', 'Critical results communicated ÷ reported exams.');
  }
  if (key === 'kpi_lab_tat_compliance_rate') return share(0.9 - occ * 0.05, fact.labResulted, 'up', 'Results inside the TAT window ÷ resulted tests.');
  if (key === 'kpi_lab_stat_tat_compliance_rate') return share(0.86 - occ * 0.04, Math.round(orders * 0.15), 'up', 'STAT compliance uses the STAT order cohort, 15% of orders, as the denominator.');
  if (key === 'kpi_lab_lost_specimen_rate') return share(0.004, orders, 'down', 'Lost specimens are 0.4% of laboratory orders.');

  if (key === 'kpi_inpatient_same_day_discharge_rate') return share(0.07, discharges, 'neutral', 'Same-day discharges are 7% of discharges.');
  if (key === 'kpi_inpatient_admission_discharge_link_rate') return share(0.995, admissions, 'up', 'Admissions linked to a discharge record are 99.5% of admissions.');
  if (key === 'kpi_readmission_7d_rate') return share(0.018, discharges, 'down', 'Seven-day readmissions ÷ discharges.');
  if (key === 'kpi_readmission_30d_rate' || key === 'kpi_dx_30d_readmission_rate') return share(0.086 + occ * 0.02, discharges, 'down', 'Thirty-day readmissions ÷ discharges. The numerator is the rounded count.');
  if (key === 'kpi_surg_30d_readmission_rate') return share(0.041, fact.surgCompleted, 'down', 'Surgical readmissions ÷ completed cases, not all discharges.');
  if (key === 'kpi_discharge_before_noon_rate') return share(0.31, discharges, 'up', 'Discharges before noon ÷ discharges.');
  if (key === 'kpi_long_stay_gt_7d_rate') {
    const longStayRate = longStayRateFromP90(fact.ipLosP90Days);
    return share(longStayRate, discharges, 'down', 'Stays longer than 7 days ÷ discharges. Same P90-derived review-line rate as Inpatient screens and Vital Assist.');
  }
  if (key === 'kpi_outpatient_seen_within_30_rate' || key === 'kpi_clinic_on_time_start_rate') return share(0.74 - occ * 0.05, fact.apptAttended, 'up', 'On-time visits ÷ attended appointments.');
  if (key === 'kpi_surg_first_case_ontime' || key === 'kpi_surg_ontime_start_rate') {
    const view = buildSurgeryView(hospital, year, 'year');
    if (key.includes('first')) {
      return exactRate(view.onTimeFirstCases, view.eligibleFirstCases, 'up', 'On-time first cases ÷ eligible first cases (staffed theatre-days). Bound to Surgery OR view.');
    }
    return share(0.64, fact.surgCompleted, 'up', 'Generic on-time starts ÷ completed cases (non first-case key).');
  }
  if (key === 'kpi_surg_checklist_compliance') {
    const view = buildSurgeryView(hospital, year, 'year');
    return exactRate(view.checklistComplete, view.completed, 'up', 'Checklist completion ÷ completed cases. Bound to Surgery Quality view.');
  }
  if (key === 'kpi_surg_postop_complication_rate') {
    const view = buildSurgeryView(hospital, year, 'year');
    return exactRate(view.complications, view.completed, 'down', 'Complications ÷ completed cases. Bound to Surgery Quality view.');
  }
  if (key === 'kpi_surg_unplanned_return_or_rate') {
    const view = buildSurgeryView(hospital, year, 'year');
    return exactRate(view.unplannedReturns, view.completed, 'down', 'Unplanned returns ÷ completed cases. Bound to Surgery Quality view.');
  }
  if (key === 'kpi_surg_day_surgery_rate') return share(0.36, fact.surgCompleted, 'neutral', 'Day-surgery cases ÷ completed cases.');
  if (key === 'kpi_dx_documentation_rate' || key === 'kpi_dx_principal_completeness' || key === 'kpi_dx_coding_quality' || key === 'kpi_dx_admit_final_match_rate') return share(0.96, encounters, 'up', 'Documentation completeness ÷ encounters.');
  if (key === 'kpi_dx_multiple_chronic_rate') return share(0.44, Math.round(fact.activePatients * 0.37), 'neutral', 'Multiple chronic conditions ÷ chronic-disease patients.');
  if (key === 'kpi_dx_unspecified_rate') return share(0.07, encounters, 'down', 'Unspecified codes ÷ encounters.');
  if (key === 'kpi_dx_invalid_rate') return share(0.008, encounters, 'down', 'Invalid codes ÷ encounters.');

  if (key === 'kpi_wf_vacancy_rate') return exactRate(Math.round((fact.requiredFte - fact.filledFte) * 10) / 10, fact.requiredFte, 'down', 'Vacant FTE ÷ required FTE.');
  if (key === 'kpi_wf_staffing_coverage') return exactRate(fact.filledFte, fact.requiredFte, 'up', 'Filled FTE ÷ required FTE.');
  if (key === 'kpi_wf_attendance_rate') return share(0.93, Math.round(fact.filledFte * days), 'up', 'Attended person-days ÷ filled FTE × days.');
  if (key === 'kpi_wf_unplanned_absence_rate') return share(0.04, Math.round(fact.filledFte * days), 'down', 'Unplanned absence days ÷ filled FTE × days.');
  if (key === 'kpi_wf_overtime_rate') return ratio(fact.overtimeHours, Math.round(fact.filledFte * days * 8), 'down', 'Overtime hours ÷ base attended hours.');
  if (key === 'kpi_wf_turnover_rate') return share(0.09, fact.filledFte, 'down', 'Separations ÷ filled FTE.');
  if (key === 'kpi_wf_agency_rate') return share(0.06, fact.filledFte, 'down', 'Agency FTE is 6% of filled FTE.');
  if (key === 'kpi_wf_part_time_rate') return share(0.11, fact.filledFte, 'neutral', 'Part-time FTE is 11% of filled FTE.');
  if (key === 'kpi_wf_permanent_fte_rate') return share(0.83, fact.filledFte, 'up', 'Permanent FTE is 83% of filled FTE.');
  if (key === 'kpi_wf_understaffed_shift_rate') return share(0.07 + occ * 0.04, Math.round(fact.filledFte * days / 3), 'down', 'Understaffed shifts ÷ scheduled shifts.');

  if (key === 'kpi_claim_billed_amount' || key === 'kpi_rcm_gross_charge_amount') return money(fact.billed, 'Gross fictional charges.');
  if (key === 'kpi_rcm_allowed_amount') return money(fact.allowed, 'Gross charges minus contractual adjustment.');
  if (key === 'kpi_claim_paid_amount' || key === 'kpi_rcm_net_revenue' || key === 'kpi_rcm_payments_collected') return money(fact.payerPaid + fact.patientPaid, 'Payer payments plus patient payments.', 'up');
  if (key === 'kpi_rcm_payer_payment_amount') return money(fact.payerPaid, 'Payer portion of collections.', 'up');
  if (key === 'kpi_rcm_patient_payment_amount') return money(fact.patientPaid, 'Patient portion of collections.');
  if (key === 'kpi_rcm_patient_responsibility_amount') return money(fact.patientPaid, 'Patient payments. Outstanding is shown separately and is not added again.');
  if (key === 'kpi_claim_denial_amount' || key === 'kpi_rcm_denied_amount' || key === 'kpi_claim_writeoff_amount') return money(fact.writeoff, 'Write-off in the allowed-amount identity.', 'down');
  if (key === 'kpi_rcm_unresolved_denial_amount') return money(Math.round(fact.writeoff * 0.35), 'Unresolved denials are 35% of the write-off, not a second write-off.', 'down');
  if (key === 'kpi_claim_recovery_amount') return money(Math.round(fact.writeoff * 0.22), 'Recovered write-off is 22% of the write-off.', 'up');
  if (key === 'kpi_rcm_ar_over_90_amount') return money(Math.round(fact.outstanding * 0.28), 'Over-90 balance is 28% of outstanding.', 'down');
  if (key === 'kpi_rcm_outstanding_ar') return money(fact.outstanding, 'Outstanding in the allowed-amount identity.', 'down');
  if (key === 'kpi_rcm_dnfb_amount') return money(Math.round(fact.outstanding * 0.16), 'Unbilled balance is 16% of outstanding.', 'down');
  if (key === 'kpi_rcm_refund_amount') return money(Math.round(fact.payerPaid * 0.012), 'Refunds are 1.2% of payer payments.', 'down');
  if (key === 'kpi_rcm_net_days_in_ar') return duration(fact.allowed ? (fact.outstanding / fact.allowed) * days : 0, 'days', 'down', 'Outstanding ÷ allowed × days in the year.');
  if (key === 'kpi_rcm_dnfb_days') return duration(4.5, 'days', 'down', 'A fixed 4.5-day unbilled lag in this story.');
  if (key === 'kpi_payment_avg_delay_days') return duration(18 + occ * 10, 'days', 'down', 'Average payment delay lengthens with occupancy in this story.');

  if (key === 'kpi_inpatient_avg_los_days') return duration(fact.ipLosAvgDays, 'days', 'down', 'Average inpatient stay from the right-skewed distribution anchored on the median and P90. It is not the median.');
  if (key === 'kpi_inpatient_avg_los_hours') return duration(fact.ipLosAvgDays * 24, 'hours', 'down', 'The average stay in hours, converted from the unrounded average in days before display rounding.');
  if (key === 'kpi_inpatient_median_los_days') return duration(fact.ipLosDays, 'days', 'down', 'Median inpatient stay. The annual figure is the mixture quantile, not a weighted average of monthly medians.');
  if (key === 'kpi_inpatient_p90_los_days') return duration(fact.ipLosP90Days, 'days', 'down', 'P90 inpatient stay from the same mixture.');
  if (key === 'kpi_ed_avg_los_hours') return duration(fact.edLosAvgMin / 60, 'hours', 'down', 'Average ED length of stay in hours. It is not the median divided by 60.');
  if (key === 'kpi_ed_los_median_minutes') return duration(fact.edLosMedianMin, 'minutes', 'down', 'Median ED length of stay.');
  if (key === 'kpi_ed_los_p90_minutes') return duration(fact.edLosP90Min, 'minutes', 'down', 'P90 ED length of stay.');
  if (key === 'kpi_ed_door_to_provider_median_minutes') return duration(fact.edWaitMedianMin, 'minutes', 'down', 'Median door-to-provider wait. This is not ED length of stay.');
  if (key === 'kpi_ed_door_to_provider_p90_minutes') return duration(fact.edWaitP90Min, 'minutes', 'down', 'P90 door-to-provider wait.');
  if (key === 'kpi_ed_arrival_to_triage_median_minutes' || key === 'kpi_ed_arrival_to_triage_p90_minutes') {
    const med = fact.edWaitMedianMin * 0.22;
    return duration(key.includes('p90') ? med * 1.6 : med, 'minutes', 'down', 'Arrival-to-triage is 22% of the door-to-provider median. It is a shorter interval.');
  }
  if (key === 'kpi_ed_decision_to_departure_median_minutes') return duration(Math.max(8, fact.edLosMedianMin - fact.edWaitMedianMin) * 0.45, 'minutes', 'down', 'Decision-to-departure is 45% of the stay after the provider is seen.');
  if (key === 'kpi_ed_avg_boarding_hours') return duration(Math.max(10, fact.edLosAvgMin - fact.edWaitAvgMin) * 0.35 / 60, 'hours', 'down', 'Average boarding is 35% of the average stay after door-to-provider, in hours.');
  if (key === 'kpi_ed_avg_waitlist_hours') return duration((42 + occ * 18) / 60, 'hours', 'down', 'Average bed-waitlist time in hours. It is not the door-to-provider wait.');
  if (key === 'kpi_bed_request_to_assignment_median_minutes' || key === 'kpi_bed_turnaround_median_minutes') return duration(42 + occ * 18, 'minutes', 'down', 'Median bed turnaround rises with occupancy.');
  if (key === 'kpi_bed_turnaround_hours') return duration((42 + occ * 18) / 60, 'hours', 'down', 'The same turnaround converted from minutes before display rounding.');
  if (key === 'kpi_lab_tat_avg_minutes') return duration(fact.labTatAvgMin, 'minutes', 'down', 'Average laboratory turnaround. It is not the median.');
  if (key === 'kpi_lab_median_tat') {
    const view = buildLaboratoryView(hospital, year, 'year');
    return duration(view.medianLabTatHours, 'hours', 'down', 'Median Lab TAT (receipt→release) from Laboratory Quality view. Distinct from catalog kpi_lab_tat_median_minutes.');
  }
  if (key === 'kpi_lab_tat_median_minutes') return duration(fact.labTatMedianMin, 'minutes', 'down', 'Median laboratory turnaround from the shared scenario facts. It is not the average.');
  if (key === 'kpi_lab_p90_tat') {
    const view = buildLaboratoryView(hospital, year, 'year');
    return duration(view.p90LabTatHours, 'hours', 'down', 'P90 Lab TAT from Laboratory Quality view.');
  }
  if (key === 'kpi_lab_tat_p90_minutes') return duration(fact.labTatP90Min, 'minutes', 'down', 'P90 laboratory turnaround from the shared scenario facts.');
  if (key === 'kpi_lab_e2e_tat_minutes') return duration(fact.labTatAvgMin + 18, 'minutes', 'down', 'End-to-end time is the average turnaround plus an 18-minute collection allowance.');
  if (key === 'kpi_lab_transport_time') {
    const view = buildLaboratoryView(hospital, year, 'year');
    return duration(view.medianTransportMin, 'minutes', 'down', 'Median specimen transport time from Laboratory Samples view.');
  }
  if (key === 'kpi_radiology_avg_tat_hours') return duration(fact.radTatAvgMin / 60, 'hours', 'down', 'Average report turnaround in hours, from the unrounded average in minutes.');
  if (key === 'kpi_rad_median_report_tat_minutes' || key === 'kpi_rad_median_report_tat') {
    const view = buildRadiologyView(hospital, year, 'year');
    return key === 'kpi_rad_median_report_tat'
      ? duration(view.medianReportTatHours, 'hours', 'down', 'Median final report TAT (signature − exam completion). Bound to Radiology Quality view.')
      : duration(Math.round(view.medianReportTatHours * 60), 'minutes', 'down', 'Median final report TAT in minutes. Bound to Radiology Quality view.');
  }
  if (key === 'kpi_rad_p90_report_tat_minutes' || key === 'kpi_rad_p90_report_tat') {
    const view = buildRadiologyView(hospital, year, 'year');
    return key === 'kpi_rad_p90_report_tat'
      ? duration(view.p90ReportTatHours, 'hours', 'down', 'P90 final report TAT. Bound to Radiology Quality view.')
      : duration(Math.round(view.p90ReportTatHours * 60), 'minutes', 'down', 'P90 final report TAT in minutes. Bound to Radiology Quality view.');
  }
  if (key === 'kpi_rad_median_access_wait' || key === 'kpi_rad_p90_access_wait') {
    const view = buildRadiologyView(hospital, year, 'year');
    return duration(
      key === 'kpi_rad_median_access_wait' ? view.medianAccessWaitDays : view.p90AccessWaitDays,
      'days',
      'down',
      key === 'kpi_rad_median_access_wait'
        ? 'Median request-to-exam wait from Radiology Access view. Not report TAT.'
        : 'P90 request-to-exam wait from Radiology Access view. Not report TAT.',
    );
  }
  if (key === 'kpi_rad_median_exam_duration') {
    const view = buildRadiologyView(hospital, year, 'year');
    return duration(view.medianExamMin, 'minutes', 'down', 'Volume-weighted median exam duration from Radiology Utilization view.');
  }
  if (key === 'kpi_rad_median_patient_wait_minutes') return duration(fact.opWaitMedianMin * 1.15, 'minutes', 'down', 'Radiology patient wait is 15% longer than the clinic median wait. It is not the appointment no-show rate.');
  if (key === 'kpi_outpatient_avg_wait_minutes') return duration(fact.opWaitAvgMin, 'minutes', 'down', 'Average clinic wait. It is not the median.');
  if (key === 'kpi_outpatient_median_wait_minutes') return duration(fact.opWaitMedianMin, 'minutes', 'down', 'Median clinic wait.');
  if (key === 'kpi_outpatient_p90_wait_minutes') return duration(fact.opWaitP90Min, 'minutes', 'down', 'P90 clinic wait.');
  if (key === 'kpi_outpatient_cycle_time_minutes') return duration(fact.opWaitAvgMin + 22, 'minutes', 'down', 'Cycle time is the average wait plus 22 minutes of consultation.');
  if (key === 'kpi_appointment_avg_lead_time_days' || key === 'kpi_appointment_median_lead_time_days' || key === 'kpi_appointment_p90_lead_time_days' || key === 'kpi_appointment_third_next_available_days') {
    const pressure = Math.min(0.12, Math.max(0, occ - 0.78));
    const leadMedian = Math.round((9.5 + pressure * 18) * 10) / 10;
    const leadP90 = Math.round((leadMedian * 2.15 + pressure * 8) * 10) / 10;
    const leadAvg = Math.round((leadMedian * 1.2) * 10) / 10;
    const thirdBase = 7 + 0.7 * 8 + pressure * 40;
    const thirdNext = Math.max(1, Math.round(thirdBase * 1.05) + 2);
    if (key === 'kpi_appointment_median_lead_time_days') return duration(leadMedian, 'days', 'down', 'Median booking lead time from the appointment scenario (pressure-adjusted).');
    if (key === 'kpi_appointment_avg_lead_time_days') return duration(leadAvg, 'days', 'down', 'Average lead time. It is longer than the median because the tail is right-skewed.');
    if (key === 'kpi_appointment_p90_lead_time_days') return duration(leadP90, 'days', 'down', 'P90 booking lead time from the appointment scenario.');
    return duration(thirdNext, 'days', 'down', 'Third-next-available from ordered future eligible openings (observation at year-end).');
  }
  if (key === 'kpi_appointment_referral_to_first_days') return duration(16.5, 'days', 'down', 'Referral to first visit is 16.5 days in this story.');
  if (key === 'kpi_surg_median_turnover_minutes') {
    const view = buildSurgeryView(hospital, year, 'year');
    return duration(view.medianTurnoverMin, 'minutes', 'down', 'Median theatre turnover bound to Surgery OR view.');
  }
  if (key === 'kpi_surg_median_procedure_minutes' || key === 'kpi_surgery_avg_case_hours') {
    const view = buildSurgeryView(hospital, year, 'year');
    return key.includes('hours')
      ? duration(view.avgCaseHours, 'hours', 'down', 'Average case hours (procedure + turnover) from Surgery capacity model.')
      : duration(view.medianProcedureMin, 'minutes', 'down', 'Median procedure duration from Surgery OR view.');
  }
  if (key === 'kpi_surg_median_wait_days') {
    const view = buildSurgeryView(hospital, year, 'year');
    return duration(view.medianWaitDays, 'days', 'down', 'Median elective surgical wait bound to Surgery Access view.');
  }

  if (key === 'demo_satisfaction_index') return index(fact.satisfaction, 'Labelled demo assumption on a 0–100 index.');
  if (key === 'demo_discharge_experience_index') return index(fact.satisfaction - 2.6, 'Satisfaction minus a fixed 2.6-point discharge gap. Labelled demo assumption.');
  if (key === 'demo_complaint_open_count') return count(fact.complaintsOpened, 'down', 'Opened complaints. Labelled demo assumption.');
  if (key === 'demo_survey_response_rate') return ratio(fact.surveysReturned, fact.surveysSent, 'up', 'Responses ÷ surveys sent. Labelled demo assumption.');
  if (key === 'demo_followup_completion_rate' || key === 'demo_service_recovery_closure_rate') return ratio(fact.complaintsClosed, fact.complaintsOpened, 'up', 'Closed complaints ÷ opened complaints. Labelled demo assumption.');
  if (key === 'demo_dialysis_session_volume') return count(fact.dialysisSessions, 'neutral', 'Labelled demo assumption. NMR names dialysis but does not list these columns.');
  if (key === 'demo_hai_surveillance_rate') return ratio(fact.haiEvents, admissions, 'down', 'Surveillance events ÷ admissions. Labelled demo assumption.');
  if (key === 'demo_equipment_uptime') {
    const num = Math.round(fact.equipmentUptime * 1000);
    return ratio(num, 1000, 'up', 'Labelled demo assumption. Uptime is stored as a per-mille so the rate equals the integer numerator ÷ 1000.');
  }
  if (key === 'demo_morgue_release_hours') return duration(fact.morgueReleaseHours, 'hours', 'down', 'Labelled demo assumption.');
  if (key === 'demo_birth_encounter_volume') return count(fact.births, 'neutral', 'Labelled demo assumption.');
  if (key === 'demo_eligibility_check_volume') return count(fact.eligibilityChecks, 'neutral', 'Labelled demo assumption.');

  if (key === 'kpi_ed_boarding_event_volume') return count(Math.round(fact.edAdmitted * 0.22), 'down', 'Boarding events are 22% of ED admissions.');
  if (key === 'kpi_ed_triage_event_volume') return count(arrivals - fact.edLeft, 'neutral', 'Triage events are arrivals minus patients who left before triage.');
  if (key === 'kpi_ward_count' || key === 'kpi_room_count') return count(fact.wardCount, 'neutral', 'Service lines in the hospital snapshot.', 'Organization snapshot', 'departments');
  if (key === 'kpi_facility_count') return count(hospital === 'ALL' ? 5 : 1, 'neutral', 'Facilities in the selected scope.', 'Organization snapshot', 'facilities');
  if (key === 'kpi_licensed_bed_count') return count(staffed, 'neutral', 'In this story licensed beds equal staffed beds.', 'Average month-end snapshot', 'beds');
  if (key === 'kpi_payer_count') return count(hospital === 'ALL' ? 12 : 8, 'neutral', 'Payer contracts in the story: 8 at one hospital, 12 across the network.', 'Organization snapshot', 'payers');
  if (key === 'kpi_supply_utilization_event_volume') return count(orders, 'neutral', 'Supply events follow laboratory order volume in this story.');
  if (key === 'kpi_pipeline_run_volume') return count(12 * days, 'neutral', 'Twelve streams run once per day.');
  if (key === 'kpi_staffing_requirement_volume') return count(Math.round(fact.requiredFte), 'neutral', 'Required staffing rounded from the FTE snapshot.', 'Staffing snapshot');
  if (key === 'kpi_drug_interaction_event_volume') return count(Math.round(fact.pharmOrders * 0.01), 'down', 'Interaction alerts are 1% of medication orders.');
  if (key === 'kpi_sepsis_alert_volume') return count(Math.round(admissions * 0.03), 'down', 'Sepsis alerts are 3% of admissions. Not an individual prediction.');
  if (key === 'kpi_pharmacy_demand_units') return count(fact.pharmOrders, 'neutral', 'Pharmacy demand is the medication-order count.');
  if (key === 'kpi_lab_tests_ordered') return count(orders, 'neutral', 'The same laboratory order total.');
  if (key === 'kpi_lab_tests_completed') return count(fact.labResulted, 'neutral', 'The same resulted-test total.');
  if (key === 'kpi_lab_pending_tests') {
    const view = buildLaboratoryView(hospital, year, 'year');
    return count(view.pendingTests, 'down', 'Pending laboratory tests from Laboratory Command view.');
  }
  if (key === 'kpi_lab_overdue_tests') return count(Math.round(orders * 0.02), 'down', 'Overdue tests are 2% of laboratory orders.');
  if (key === 'kpi_lab_critical_result_count') return count(Math.round(fact.labResulted * 0.01), 'down', 'Critical results are 1% of resulted tests.');
  if (key === 'kpi_lab_unacknowledged_critical_count') return count(Math.round(fact.labResulted * 0.01 * 0.07), 'down', 'Unacknowledged critical results are 7% of the critical-result count.');
  if (key === 'kpi_avoidable_days') return count(Math.round(discharges * 0.4), 'down', 'Avoidable days are 0.4 per discharge in this story.');
  if (key === 'kpi_discharge_ready_still_admitted') return count(Math.round(fact.occupiedBeds * 0.08), 'down', 'Discharge-ready patients still in a bed are 8% of the occupied snapshot.');
  if (key === 'kpi_discharge_barrier_active_count') return count(Math.round(fact.occupiedBeds * 0.05), 'down', 'Active discharge barriers are 5% of the occupied snapshot.');
  if (key === 'kpi_appointment_open_future_slot_count') return count(Math.max(0, fact.apptSlots - fact.apptBooked), 'up', 'Unbooked slots. Booked does not exceed slots.');
  if (key === 'kpi_appointment_unfilled_released_slots') {
    const afterStart = Math.round(fact.apptCancelled * 0.12);
    const released = Math.max(0, fact.apptCancelled - afterStart);
    const eligible = Math.round(fact.apptCancelled * (0.35 + 0.28 + 0.25 * 0.2));
    const recovered = Math.min(eligible, Math.round(eligible * (0.48 + Math.min(0.12, Math.max(0, occ - 0.78)) * 0.12)));
    return count(Math.max(0, released - recovered), 'down', 'Released slots without a confirmed replacement booking (appointment recovery lifecycle).');
  }
  if (key === 'kpi_outpatient_checked_in_count') return count(Math.round(fact.apptAttended / days), 'neutral', 'A one-day snapshot of attended visits.');
  if (key === 'kpi_outpatient_follow_up_count') return count(Math.round(fact.apptAttended * 0.62), 'neutral', 'Follow-up visits are 62% of attended appointments.');
  if (key === 'kpi_staff_expired_license_count') return count(Math.round(fact.filledFte * 0.01), 'down', 'Expired licenses are 1% of filled FTE.');
  if (key === 'kpi_staff_license_expiring_soon_count') return count(Math.round(fact.filledFte * 0.04), 'down', 'Licenses expiring soon are 4% of filled FTE.');
  if (key === 'kpi_capacity_forecast_support_bed_days') return count(fact.occupiedBeds * days, 'neutral', 'Occupied snapshot × days in the year. A bed-day total, not a second census.', GRAIN, 'bed_days');
  if (key === 'kpi_claim_contractual_adjustment') return money(fact.adjustment, 'Contractual adjustment in the billed-to-allowed identity.', 'down');

  if (key === 'kpi_ed_lwbs_rate') return ratio(fact.edLeft, arrivals, 'down', 'Patients who left ÷ ED arrivals.');
  if (key === 'kpi_ed_boarding_rate') return share(0.12, fact.edAdmitted, 'down', 'Boarded visits ÷ ED admissions.');
  if (key === 'kpi_appointment_completed_rate') return ratio(fact.apptAttended, fact.apptBooked, 'up', 'Attended ÷ booked appointments.');
  if (key === 'kpi_appointment_slot_utilization_rate' || key === 'kpi_appointment_slot_fill_rate') return ratio(fact.apptBooked, fact.apptSlots, 'up', 'Booked slots ÷ offered slots.');
  if (key === 'kpi_appointment_patient_cancel_rate') return share(0.7, fact.apptCancelled, 'down', 'Patient cancellations are 70% of cancellations. The denominator is cancelled appointments.');
  if (key === 'kpi_appointment_late_cancel_rate') return share(0.25, fact.apptCancelled, 'down', 'Late cancellations are 25% of cancellations.');
  if (key === 'kpi_appointment_virtual_rate') return share(0.11, fact.apptBooked, 'neutral', 'Virtual visits are 11% of booked appointments.');
  if (key === 'kpi_appointment_confirmed_rate') return share(0.81, fact.apptBooked, 'up', 'Confirmed appointments are 81% of booked appointments.');
  if (key === 'kpi_appointment_new_followup_ratio') return multiplier(Math.round(fact.apptAttended * 0.38), Math.round(fact.apptAttended * 0.62), 'new visits per follow-up', 'New visits are 38% of attended visits and follow-ups are 62%. This is a multiplier.');
  if (key === 'kpi_claim_paid_rate') return ratio(fact.claimsPaid, claims, 'up', 'Paid claims ÷ submitted claims.');
  if (key === 'kpi_bed_blocked_rate') return ratio(fact.blockedBeds, staffed, 'down', 'Blocked beds ÷ staffed beds.');
  if (key === 'kpi_attendance_absent_rate') return share(0.07, Math.round(fact.filledFte * days), 'down', 'Absent person-days ÷ filled FTE × days.');
  if (key === 'kpi_med_order_cancelled_rate') return ratio(fact.pharmOrders - fact.pharmDispensed, fact.pharmOrders, 'down', 'Orders not dispensed ÷ medication orders.');
  if (key === 'kpi_radiology_order_cancelled_rate') return ratio(fact.radCancelled, fact.radOrders, 'down', 'Cancelled exams ÷ radiology orders.');
  if (key === 'kpi_pipeline_run_failure_rate') return share(0.01, 12 * days, 'down', 'Failed runs are 1% of daily stream runs.');
  if (key === 'kpi_diagnosis_primary_share') return share(0.96, encounters, 'neutral', 'Encounters with a principal diagnosis ÷ encounters.');
  if (key === 'kpi_radiology_ct_share') return ratio(fact.radCt, fact.radOrders, 'neutral', 'CT exams ÷ radiology orders. Modality counts sum to orders.');
  if (key === 'kpi_radiology_mri_share') return ratio(fact.radMr, fact.radOrders, 'neutral', 'MRI exams ÷ radiology orders.');
  if (key === 'kpi_med_safety_event_rate') return share(0.004, fact.pharmAdmin, 'down', 'Safety events ÷ administrations.');
  if (key === 'kpi_or_utilization_rate') return ratio(fact.surgCompleted, fact.surgRequests, 'neutral', 'Completed cases ÷ requested cases. This is the theatre completion ratio, not bed occupancy.');
  if (key === 'kpi_workforce_staffing_fill_rate') return exactRate(fact.filledFte, fact.requiredFte, 'up', 'Filled FTE ÷ required FTE.');
  if (key === 'kpi_icu_transfer_rate') return share(0.04, admissions, 'neutral', 'ICU transfers ÷ admissions. Not an individual deterioration prediction.');
  if (key === 'kpi_expected_discharge_accuracy_rate') return share(0.88, discharges, 'up', 'Discharges that matched the expected date ÷ discharges.');
  if (key === 'kpi_metric_anomaly_alert_rate') return share(0.02, encounters, 'down', 'Anomaly alerts ÷ encounters.');
  if (key === 'kpi_lab_completion_rate') {
    const view = buildLaboratoryView(hospital, year, 'year');
    return exactRate(view.completedTests, view.testItems, 'up', 'Completed tests ÷ test items from Laboratory Command view.');
  }
  if (key === 'kpi_lab_rejection_rate' || key === 'kpi_lab_specimen_rejection_rate') {
    if (key === 'kpi_lab_rejection_rate') {
      const view = buildLaboratoryView(hospital, year, 'year');
      return exactRate(view.rejected, view.assessed, 'down', 'Rejected ÷ assessed specimens from Laboratory Samples view.');
    }
    return share(0.018, orders, 'down', 'Rejected specimens are 1.8% of laboratory orders.');
  }
  if (key === 'kpi_lab_hemolysis_rate' || key === 'kpi_lab_hemolyzed_rate') {
    if (key === 'kpi_lab_hemolysis_rate') {
      const view = buildLaboratoryView(hospital, year, 'year');
      return exactRate(view.hemolyzed, view.assessed, 'down', 'Hemolyzed ÷ assessed specimens from Laboratory Samples view.');
    }
    return share(0.008, orders, 'down', 'Hemolyzed specimens are 0.8% of laboratory orders.');
  }
  if (key === 'kpi_lab_clotted_rate') return share(0.004, orders, 'down', 'Clotted specimens are 0.4% of laboratory orders.');
  if (key === 'kpi_lab_qns_rate') return share(0.003, orders, 'down', 'Quantity-not-sufficient specimens are 0.3% of laboratory orders.');
  if (key === 'kpi_lab_mislabeled_rate') return share(0.002, orders, 'down', 'Mislabeled specimens are 0.2% of laboratory orders.');
  if (key === 'kpi_lab_recollection_rate') {
    const view = buildLaboratoryView(hospital, year, 'year');
    return exactRate(view.recollections, view.assessed, 'down', 'Recollections ÷ assessed specimens from Laboratory Samples view.');
  }
  if (key === 'kpi_lab_blood_culture_contamination_rate') return share(0.012, Math.round(orders * 0.08), 'down', 'Contaminated cultures ÷ blood-culture orders, which are 8% of laboratory orders.');
  if (key === 'kpi_lab_critical_notify_rate' || key === 'kpi_lab_critical_notification_rate' || key === 'kpi_lab_critical_notification_sla_rate' || key === 'kpi_lab_critical_delay_rate') {
    if (key === 'kpi_lab_critical_notify_rate') {
      const view = buildLaboratoryView(hospital, year, 'year');
      return exactRate(view.criticalNotified, view.criticalResults, 'up', 'Critical Notify Rate = notified ÷ critical results from Laboratory Quality view.');
    }
    if (key === 'kpi_lab_critical_delay_rate') {
      const view = buildLaboratoryView(hospital, year, 'year');
      return exactRate(view.criticalPendingComm, view.criticalResults, 'down', 'Critical Delay Rate = pending communication ÷ critical results. Distinct from notify rate.');
    }
    return share(key.includes('sla') ? 0.9 : 0.93, Math.round(fact.labResulted * 0.01), 'up', 'Notifications ÷ critical results.');
  }
  if (key === 'kpi_lab_corrected_report_rate' || key === 'kpi_lab_corrected_result_rate') {
    if (key === 'kpi_lab_corrected_report_rate') {
      const view = buildLaboratoryView(hospital, year, 'year');
      return exactRate(view.correctedReports, view.releasedResults, 'down', 'Corrected ÷ released results from Laboratory Quality view.');
    }
    return share(0.006, fact.labResulted, 'down', 'Corrected results ÷ resulted tests.');
  }
  if (key === 'kpi_lab_amended_result_rate') return share(0.004, fact.labResulted, 'down', 'Amended results ÷ resulted tests.');

  if (key === 'kpi_med_order_to_admin_hours') return duration(2.4, 'hours', 'down', 'A fixed 2.4-hour order-to-administration interval in this story.');
  if (key === 'kpi_workforce_hours_worked') return duration(fact.filledFte * days * 8 * 0.93 + fact.overtimeHours, 'hours', 'neutral', 'Attended hours plus overtime.');
  if (key === 'kpi_workforce_overtime_hours') return duration(fact.overtimeHours, 'hours', 'down', 'Overtime hours from the staffing scenario.');
  if (key === 'kpi_lab_collection_delay_minutes') return duration(fact.labTatMedianMin * 0.15, 'minutes', 'down', 'Collection is 15% of the median laboratory turnaround.');
  if (key === 'kpi_lab_transport_minutes') return duration(fact.labTatMedianMin * 0.1, 'minutes', 'down', 'Transport is 10% of the median laboratory turnaround.');
  if (key === 'kpi_lab_processing_minutes') return duration(fact.labTatMedianMin * 0.55, 'minutes', 'down', 'Processing is 55% of the median laboratory turnaround.');
  if (key === 'kpi_lab_verification_delay_minutes') return duration(fact.labTatMedianMin * 0.2, 'minutes', 'down', 'Verification is 20% of the median laboratory turnaround. These four parts sum to the median.');
  if (key === 'kpi_lab_critical_notification_minutes') return duration(11, 'minutes', 'down', 'A fixed 11-minute critical-notification interval in this story.');

  return null;
}
