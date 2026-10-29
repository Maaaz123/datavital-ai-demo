import { leaveSplit } from '@/core/derived';
import { longStayRateFromP90 } from '@/core/ipdScope';
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

function mapped(kpi: KpiDef, fact: AnnualFact, hospital: string, year: number): Raw | null {
  const key = kpi.key;
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

  if (key === 'kpi_lab_order_volume') return count(orders, 'neutral', 'Laboratory orders. The same integer as the laboratory workspace.');
  if (key === 'kpi_lab_result_volume') return count(fact.labResulted, 'neutral', 'Resulted tests. Resulted + cancelled + delayed = orders.');
  if (key === 'kpi_lab_cancelled_tests') return count(fact.labCancelled, 'down', 'Cancelled tests inside the order identity.');
  if (key === 'kpi_radiology_order_volume' || key === 'kpi_rad_imaging_order_volume') return count(fact.radOrders, 'neutral', 'Radiology orders.');
  if (key === 'kpi_radiology_result_volume' || key === 'kpi_rad_final_report_count' || key === 'kpi_rad_completed_exams') return count(fact.radReported, 'neutral', 'Reported exams. Reported + cancelled + no-show = orders.');
  if (key === 'kpi_rad_preliminary_report_count') return count(Math.round(fact.radReported * 0.22), 'neutral', 'Preliminary reports are 22% of final reports, not an extra order.');
  if (key === 'kpi_rad_pending_exams') return count(fact.radNoShow + fact.radCancelled, 'down', 'Orders that did not receive a report: no-shows plus cancellations.');
  if (key === 'kpi_rad_overdue_exams') return count(Math.round(fact.radOrders * 0.04), 'down', 'Overdue exams are 4% of radiology orders.');
  if (key === 'kpi_rad_stat_exam_volume') return count(Math.round(fact.radOrders * 0.12), 'neutral', 'STAT exams are 12% of radiology orders.');
  if (key === 'kpi_rad_unack_critical_count') return count(Math.round(fact.radReported * 0.004), 'down', 'Unacknowledged critical findings are 0.4% of reported exams.');

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
  if (key === 'kpi_surg_overdue_cases') return count(Math.round(fact.surgRequests * 0.03), 'down', 'Overdue requests are 3% of surgical requests.');

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
  if (key === 'kpi_surg_or_utilization' || key === 'kpi_rad_modality_utilization') return ratio(fact.occupiedBeds, staffed, 'neutral', 'Utilization uses the same occupied ÷ staffed snapshot as bed occupancy. It is labelled as that capacity ratio.');

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
  if (key === 'kpi_surg_same_day_cancel_rate') return share(0.45, fact.surgCancelled, 'down', 'Same-day cancellations are 45% of cancelled cases. The denominator is cancellations, not all requests.');
  if (key === 'kpi_lab_cancellation_rate') return ratio(fact.labCancelled, orders, 'down', 'Cancelled tests ÷ laboratory orders.');
  if (key === 'kpi_rad_cancelled_exam_rate') return ratio(fact.radCancelled, fact.radOrders, 'down', 'Cancelled exams ÷ radiology orders.');
  if (key === 'kpi_lab_order_completed_rate' || key === 'kpi_lab_result_to_order_ratio') return ratio(fact.labResulted, orders, 'up', 'Resulted tests ÷ laboratory orders.');
  if (key === 'kpi_rad_exam_completion_rate') return ratio(fact.radReported, fact.radOrders, 'up', 'Reported exams ÷ radiology orders.');
  if (key === 'kpi_surg_completion_rate') return ratio(fact.surgCompleted, fact.surgRequests, 'up', 'Completed cases ÷ requested cases.');
  if (key === 'kpi_lab_result_abnormal_rate') return share(0.14, fact.labResulted, 'neutral', 'Abnormal results are 14% of resulted tests.');
  if (key === 'kpi_lab_result_patient_key_coverage') return share(0.99, fact.labResulted, 'up', 'Result rows carrying a patient key are 99% of resulted tests.');
  if (key === 'kpi_claim_denied_rate' || key === 'kpi_rcm_denial_rate') return ratio(fact.claimsDenied, claims, 'down', 'Denied claims ÷ submitted claims.');
  if (key === 'kpi_revenue_collection_rate') return ratio(fact.payerPaid + fact.patientPaid, fact.allowed, 'up', 'Collected SAR ÷ allowed SAR.');
  if (key === 'kpi_authorization_denied_rate') return ratio(fact.preauthDenied, fact.preauthRequested, 'down', 'Denied pre-authorizations ÷ requested.');
  if (key === 'kpi_rcm_clean_claim_rate') return ratio(claims - fact.claimsDenied - Math.round(claims * 0.012), claims, 'up', 'Submitted claims minus denials minus technical rejections, ÷ submitted claims.');
  if (key === 'kpi_rcm_ar_over_90_rate') return share(0.28, fact.outstanding, 'down', 'The over-90 share of outstanding SAR. The numerator is rounded SAR, and the rate is that integer ÷ outstanding.');
  if (key === 'kpi_rad_stat_exam_rate') return share(0.12, fact.radOrders, 'neutral', 'STAT exams ÷ radiology orders.');
  if (key === 'kpi_rad_repeat_exam_rate') return share(0.035, fact.radOrders, 'down', 'Repeat exams are 3.5% of radiology orders.');
  if (key === 'kpi_rad_report_tat_compliance' || key === 'kpi_radiology_tat_breach_rate') {
    const within = key.includes('breach') ? 0.08 + occ * 0.04 : 0.92 - occ * 0.04;
    return share(within, fact.radReported, key.includes('breach') ? 'down' : 'up', 'Report timing compliance uses reported exams as the denominator.');
  }
  if (key === 'kpi_rad_critical_comm_compliance') return share(0.94, fact.radReported, 'up', 'Critical results communicated ÷ reported exams.');
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
  if (key === 'kpi_surg_first_case_ontime' || key === 'kpi_surg_ontime_start_rate') return share(key.includes('first') ? 0.71 : 0.64, fact.surgCompleted, 'up', 'On-time starts ÷ completed cases.');
  if (key === 'kpi_surg_checklist_compliance') return share(0.97, fact.surgCompleted, 'up', 'Checklist completion ÷ completed cases.');
  if (key === 'kpi_surg_postop_complication_rate') return share(0.028, fact.surgCompleted, 'down', 'Complications ÷ completed cases.');
  if (key === 'kpi_surg_unplanned_return_or_rate') return share(0.011, fact.surgCompleted, 'down', 'Unplanned returns ÷ completed cases.');
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
  if (key === 'kpi_lab_tat_median_minutes') return duration(fact.labTatMedianMin, 'minutes', 'down', 'Median laboratory turnaround.');
  if (key === 'kpi_lab_tat_p90_minutes') return duration(fact.labTatP90Min, 'minutes', 'down', 'P90 laboratory turnaround.');
  if (key === 'kpi_lab_e2e_tat_minutes') return duration(fact.labTatAvgMin + 18, 'minutes', 'down', 'End-to-end time is the average turnaround plus an 18-minute collection allowance.');
  if (key === 'kpi_radiology_avg_tat_hours') return duration(fact.radTatAvgMin / 60, 'hours', 'down', 'Average report turnaround in hours, from the unrounded average in minutes.');
  if (key === 'kpi_rad_median_report_tat_minutes') return duration(fact.radTatMedianMin, 'minutes', 'down', 'Median radiology report time.');
  if (key === 'kpi_rad_p90_report_tat_minutes') return duration(fact.radTatP90Min, 'minutes', 'down', 'P90 radiology report time.');
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
  if (key === 'kpi_surg_median_turnover_minutes') return duration(28 + occ * 12, 'minutes', 'down', 'Median theatre turnover rises with occupancy.');
  if (key === 'kpi_surg_median_procedure_minutes' || key === 'kpi_surgery_avg_case_hours') {
    const minutes = 74 + occ * 20;
    return key.includes('hours')
      ? duration((minutes * 1.12) / 60, 'hours', 'down', 'Average case duration is 12% above the median, converted to hours from the unrounded minutes.')
      : duration(minutes, 'minutes', 'down', 'Median procedure duration.');
  }
  if (key === 'kpi_surg_median_wait_days') return duration(12 + occ * 8, 'days', 'down', 'Median wait for surgery lengthens with occupancy.');

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
  if (key === 'kpi_lab_pending_tests') return count(fact.labDelayed, 'down', 'Delayed orders are the pending cohort inside the order identity.');
  if (key === 'kpi_lab_overdue_tests') return count(Math.round(orders * 0.02), 'down', 'Overdue tests are 2% of laboratory orders.');
  if (key === 'kpi_lab_critical_result_count') return count(Math.round(fact.labResulted * 0.01), 'down', 'Critical results are 1% of resulted tests.');
  if (key === 'kpi_lab_unacknowledged_critical_count') return count(Math.round(fact.labResulted * 0.01 * 0.07), 'down', 'Unacknowledged critical results are 7% of the critical-result count.');
  if (key === 'kpi_avoidable_days') return count(Math.round(discharges * 0.4), 'down', 'Avoidable days are 0.4 per discharge in this story.');
  if (key === 'kpi_discharge_ready_still_admitted') return count(Math.round(fact.occupiedBeds * 0.08), 'down', 'Discharge-ready patients still in a bed are 8% of the occupied snapshot.');
  if (key === 'kpi_discharge_barrier_active_count') return count(Math.round(fact.occupiedBeds * 0.05), 'down', 'Active discharge barriers are 5% of the occupied snapshot.');
  if (key === 'kpi_appointment_open_future_slot_count') return count(Math.max(0, fact.apptSlots - fact.apptBooked), 'up', 'Unbooked slots. Booked does not exceed slots.');
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
  if (key === 'kpi_lab_completion_rate') return ratio(fact.labResulted, orders, 'up', 'Resulted tests ÷ laboratory orders.');
  if (key === 'kpi_lab_specimen_rejection_rate') return share(0.018, orders, 'down', 'Rejected specimens are 1.8% of laboratory orders.');
  if (key === 'kpi_lab_hemolyzed_rate') return share(0.008, orders, 'down', 'Hemolyzed specimens are 0.8% of laboratory orders.');
  if (key === 'kpi_lab_clotted_rate') return share(0.004, orders, 'down', 'Clotted specimens are 0.4% of laboratory orders.');
  if (key === 'kpi_lab_qns_rate') return share(0.003, orders, 'down', 'Quantity-not-sufficient specimens are 0.3% of laboratory orders.');
  if (key === 'kpi_lab_mislabeled_rate') return share(0.002, orders, 'down', 'Mislabeled specimens are 0.2% of laboratory orders.');
  if (key === 'kpi_lab_recollection_rate') return share(0.015, orders, 'down', 'Recollections are 1.5% of laboratory orders.');
  if (key === 'kpi_lab_blood_culture_contamination_rate') return share(0.012, Math.round(orders * 0.08), 'down', 'Contaminated cultures ÷ blood-culture orders, which are 8% of laboratory orders.');
  if (key === 'kpi_lab_critical_notification_rate' || key === 'kpi_lab_critical_notification_sla_rate') return share(key.includes('sla') ? 0.9 : 0.93, Math.round(fact.labResulted * 0.01), 'up', 'Notifications ÷ critical results.');
  if (key === 'kpi_lab_corrected_result_rate') return share(0.006, fact.labResulted, 'down', 'Corrected results ÷ resulted tests.');
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
