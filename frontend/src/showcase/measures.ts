import { hash, type KpiDef } from './engine';
import { CURRENCY, scenarioFor, WORKFORCE_SHARES, type AnnualFact } from './facts';

export type MeasureKind = 'count' | 'rate' | 'duration' | 'currency' | 'index' | 'multiplier' | 'fte';

export type Measure = {
  value: number;
  prior: number;
  kind: MeasureKind;
  unit: string;
  numerator: number;
  denominator: number;
  grain: string;
  better: 'up' | 'down' | 'neutral';
  assumption: boolean;
  note: string;
};

const MULTIPLIERS = new Set([
  'kpi_patient_encounters_per_patient',
  'kpi_exec_care_intensity_lab_per_admission',
  'kpi_lab_orders_per_encounter',
  'kpi_dx_avg_diagnoses_per_encounter',
]);

type Raw = {
  value: number;
  kind: MeasureKind;
  unit: string;
  numerator: number;
  denominator: number;
  grain: string;
  better: 'up' | 'down' | 'neutral';
  note: string;
};

function rate(value: number, numerator: number, denominator: number, better: Raw['better'], note: string, grain = 'Summed events, then numerator ÷ denominator'): Raw {
  return { value, kind: 'rate', unit: 'percent', numerator, denominator, grain, better, note };
}

function count(value: number, better: Raw['better'], note: string, grain = 'Summed events over the selected year'): Raw {
  return { value: Math.round(value), kind: 'count', unit: 'events', numerator: Math.round(value), denominator: 1, grain, better, note };
}

function money(value: number, note: string): Raw {
  return {
    value: Math.round(value),
    kind: 'currency',
    unit: CURRENCY,
    numerator: Math.round(value),
    denominator: 1,
    grain: 'Summed fictional SAR amounts for the year',
    better: 'down',
    note,
  };
}

function duration(value: number, unit: 'minutes' | 'hours' | 'days', better: Raw['better'], note: string): Raw {
  const rounded = Math.round(value * 10) / 10;
  return { value: rounded, kind: 'duration', unit, numerator: rounded, denominator: 1, grain: 'Volume-weighted across months. Snapshots are not summed.', better, note };
}

function parentOf(fact: AnnualFact, domain: string): number {
  switch (domain) {
    case 'Emergency': return fact.edArrivals;
    case 'Beds': return fact.staffedBeds;
    case 'Inpatient': return fact.admissions;
    case 'Outpatient': return fact.apptAttended;
    case 'Appointments': return fact.apptBooked;
    case 'Laboratory': return fact.labOrders;
    case 'Radiology': return fact.radOrders;
    case 'Pharmacy': return fact.pharmOrders;
    case 'Surgery': return fact.surgRequests;
    case 'Patients': return fact.activePatients;
    case 'Workforce': return Math.max(1, Math.round(fact.requiredFte));
    case 'Dialysis': return fact.dialysisSessions;
    case 'Patient experience': return Math.max(1, fact.surveysSent);
    case 'Infection prevention': return fact.admissions;
    case 'Morgue': return Math.max(1, fact.deaths);
    case 'Maternal and neonatal': return fact.births;
    case 'Eligibility': return fact.eligibilityChecks;
    case 'Biomedical equipment': return fact.staffedBeds;
    default: return Math.max(1, fact.encounters);
  }
}

function explicit(kpi: KpiDef, fact: AnnualFact): Raw | null {
  const deaths = fact.deaths;
  const encounters = Math.max(1, fact.encounters);
  const admissions = Math.max(1, fact.admissions);
  const staffed = Math.max(1, fact.staffedBeds);
  switch (kpi.key) {
    case 'kpi_department_count':
      return { ...count(fact.wardCount, 'neutral', 'Ward lines in the fictional hospital. Not a volume of events.', 'Organization snapshot'), unit: 'departments' };
    case 'kpi_patient_active_count':
      return count(fact.activePatients, 'neutral', 'Distinct fictional people with activity in the year. Months are not added together.', 'Annual distinct snapshot');
    case 'kpi_patient_encounters_per_patient':
      return { value: encounters / fact.activePatients, kind: 'multiplier', unit: 'encounters per patient', numerator: encounters, denominator: fact.activePatients, grain: 'Annual encounters ÷ annual distinct patients', better: 'neutral', note: 'A multiplier, not a percentage.' };
    case 'kpi_admission_per_encounter_rate':
      return rate(admissions / encounters, admissions, encounters, 'neutral', 'Admissions divided by encounters in the same year.');
    case 'kpi_discharge_per_admission_rate':
      return rate(fact.discharges / admissions, fact.discharges, admissions, 'neutral', 'Discharges divided by admissions. Can exceed 100% when transfers in are included in the census identity.');
    case 'kpi_exec_care_intensity_lab_per_admission':
      return { value: fact.labOrders / admissions, kind: 'multiplier', unit: 'orders per admission', numerator: fact.labOrders, denominator: admissions, grain: 'Annual lab orders ÷ admissions', better: 'neutral', note: 'Intensity multiplier, not a percentage.' };
    case 'kpi_lab_orders_per_encounter':
      return { value: fact.labOrders / encounters, kind: 'multiplier', unit: 'orders per encounter', numerator: fact.labOrders, denominator: encounters, grain: 'Annual lab orders ÷ encounters', better: 'neutral', note: 'Intensity multiplier, not a percentage.' };
    case 'kpi_dx_avg_diagnoses_per_encounter':
      return { value: 2.35, kind: 'multiplier', unit: 'diagnoses per encounter', numerator: Math.round(encounters * 2.35), denominator: encounters, grain: 'Fixed fictional intensity for this scenario', better: 'neutral', note: 'Demo assumption for diagnosis intensity. The catalog name is kept.' };
    case 'kpi_bed_occupancy_rate':
    case 'kpi_bed_occupied_rate_status':
      return rate(fact.occupiedBeds / staffed, fact.occupiedBeds, staffed, 'neutral', 'Average occupied beds ÷ staffed beds. A month-end snapshot average, not a sum of occupancy.', 'Average month-end snapshot');
    case 'kpi_bed_available_rate_status':
      return rate(fact.availableBeds / staffed, fact.availableBeds, staffed, 'up', 'Available beds ÷ staffed beds.', 'Average month-end snapshot');
    case 'kpi_bed_icu_occupancy_rate':
      return rate(fact.icuOccupied / Math.max(1, fact.icuStaffed), fact.icuOccupied, fact.icuStaffed, 'neutral', 'ICU occupied ÷ ICU staffed.', 'Average month-end snapshot');
    case 'kpi_inpatient_avg_los_days':
    case 'kpi_inpatient_median_los_days':
      return duration(Math.round(fact.ipLosDays * 10) / 10, 'days', 'down', 'Inpatient length of stay in days.');
    case 'kpi_inpatient_p90_los_days':
      return duration(Math.round(fact.ipLosP90Days * 10) / 10, 'days', 'down', 'P90 stay is modeled above the median.');
    case 'kpi_inpatient_avg_los_hours':
      return duration((Math.round(fact.ipLosDays * 10) / 10) * 24, 'hours', 'down', 'The same stay as the day measure, converted by ×24.');
    case 'kpi_ed_avg_los_hours':
      return duration(fact.edLosMedianMin / 60, 'hours', 'down', 'Median ED length of stay converted from minutes by ÷60.');
    case 'kpi_ed_los_median_minutes':
      return duration(fact.edLosMedianMin, 'minutes', 'down', 'Median ED length of stay in minutes.');
    case 'kpi_ed_los_p90_minutes':
      return duration(fact.edLosP90Min, 'minutes', 'down', 'P90 ED stay, above the median by construction.');
    case 'kpi_ed_avg_waitlist_hours':
      return duration(fact.edWaitMedianMin / 60, 'hours', 'down', 'Median door-to-provider wait converted from minutes.');
    case 'kpi_lab_tat_avg_minutes':
    case 'kpi_lab_tat_median_minutes':
      return duration(fact.labTatMedianMin, 'minutes', 'down', 'Median laboratory turnaround.');
    case 'kpi_lab_tat_p90_minutes':
      return duration(fact.labTatP90Min, 'minutes', 'down', 'P90 laboratory turnaround, above the median.');
    case 'kpi_lab_e2e_tat_minutes':
      return duration(fact.labTatMedianMin * 1.35, 'minutes', 'down', 'End-to-end time is the median plus a fixed collection and receipt allowance in this scenario.');
    case 'kpi_radiology_avg_tat_hours':
      return duration(fact.radTatMedianMin / 60, 'hours', 'down', 'Median report turnaround converted from minutes.');
    case 'kpi_rad_median_report_tat_minutes':
      return duration(fact.radTatMedianMin, 'minutes', 'down', 'Median radiology report time.');
    case 'kpi_rad_p90_report_tat_minutes':
      return duration(fact.radTatP90Min, 'minutes', 'down', 'P90 radiology report time.');
    case 'kpi_outpatient_avg_wait_minutes':
    case 'kpi_outpatient_median_wait_minutes':
      return duration(fact.opWaitMedianMin, 'minutes', 'down', 'Median clinic wait.');
    case 'kpi_outpatient_p90_wait_minutes':
      return duration(fact.opWaitP90Min, 'minutes', 'down', 'P90 clinic wait, above the median.');
    case 'kpi_bed_turnaround_median_minutes':
      return duration(42 + (fact.occupiedBeds / staffed) * 18, 'minutes', 'down', 'Turnaround rises with occupancy in this scenario.');
    case 'kpi_bed_turnaround_hours':
      return duration((42 + (fact.occupiedBeds / staffed) * 18) / 60, 'hours', 'down', 'The same turnaround expressed in hours.');
    case 'kpi_appointment_no_show_rate':
    case 'kpi_rad_no_show_rate':
      return rate(fact.apptNoShow / Math.max(1, fact.apptBooked), fact.apptNoShow, fact.apptBooked, 'down', 'No-shows ÷ booked appointments.');
    case 'kpi_appointment_cancellation_rate':
      return rate(fact.apptCancelled / Math.max(1, fact.apptBooked), fact.apptCancelled, fact.apptBooked, 'down', 'Cancellations ÷ booked appointments.');
    case 'kpi_surgery_cancellation_rate':
    case 'kpi_surg_cancellation_rate':
      return rate(fact.surgCancelled / Math.max(1, fact.surgRequests), fact.surgCancelled, fact.surgRequests, 'down', 'Cancelled cases ÷ requested cases.');
    case 'kpi_surgery_cancellation_volume':
      return count(fact.surgCancelled, 'down', 'Cancelled theatre cases. Completed + cancelled = requested.');
    case 'kpi_lab_cancellation_rate':
      return rate(fact.labCancelled / Math.max(1, fact.labOrders), fact.labCancelled, fact.labOrders, 'down', 'Cancelled tests ÷ lab orders.');
    case 'kpi_lab_cancelled_tests':
      return count(fact.labCancelled, 'down', 'Cancelled tests. Resulted + cancelled + delayed = orders.');
    case 'kpi_claim_denied_rate':
    case 'kpi_rcm_denial_rate':
      return rate(fact.claimsDenied / Math.max(1, fact.claimsSubmitted), fact.claimsDenied, fact.claimsSubmitted, 'down', 'Denied claims ÷ submitted claims.');
    case 'kpi_revenue_collection_rate':
      return rate((fact.payerPaid + fact.patientPaid) / Math.max(1, fact.allowed), fact.payerPaid + fact.patientPaid, fact.allowed, 'up', 'Collected SAR ÷ allowed SAR.');
    case 'kpi_authorization_denied_rate':
      return rate(fact.preauthDenied / Math.max(1, fact.preauthRequested), fact.preauthDenied, fact.preauthRequested, 'down', 'Denied pre-authorizations ÷ requested.');
    case 'kpi_ed_to_admission_rate':
      return rate(fact.edAdmitted / Math.max(1, fact.edArrivals), fact.edAdmitted, fact.edArrivals, 'neutral', 'ED visits admitted ÷ ED arrivals. Admitted visits are included in inpatient admissions.');
    case 'kpi_ed_mortality_rate':
    case 'kpi_surg_30d_mortality_rate':
    case 'kpi_dx_30d_mortality_rate':
    case 'kpi_dx_in_hospital_mortality_rate':
      return rate(deaths / admissions, deaths, admissions, 'down', 'Inpatient deaths ÷ admissions. Cohort figure only.');
    case 'kpi_mortality_event_volume':
      return count(deaths, 'down', 'Inpatient deaths in the fictional census. Not a patient list.');
    case 'kpi_surg_30d_readmission_rate':
    case 'kpi_dx_30d_readmission_rate':
      return rate(0.086 + (fact.occupiedBeds / staffed) * 0.02, Math.round(admissions * (0.086 + (fact.occupiedBeds / staffed) * 0.02)), admissions, 'down', 'Illustrative readmission share of admissions. Cohort review, not an individual prediction.');
    case 'kpi_claim_billed_amount':
    case 'kpi_rcm_gross_charge_amount':
      return { ...money(fact.billed, 'Gross fictional charges.'), better: 'neutral' };
    case 'kpi_rcm_allowed_amount':
      return { ...money(fact.allowed, 'Gross charges minus contractual adjustment.'), better: 'neutral' };
    case 'kpi_claim_paid_amount':
    case 'kpi_rcm_net_revenue':
      return { ...money(fact.payerPaid + fact.patientPaid, 'Payer payments plus patient payments.'), better: 'up' };
    case 'kpi_rcm_payer_payment_amount':
      return { ...money(fact.payerPaid, 'Payer portion of collections.'), better: 'up' };
    case 'kpi_rcm_patient_payment_amount':
      return { ...money(fact.patientPaid, 'Patient portion of collections.'), better: 'neutral' };
    case 'kpi_rcm_patient_responsibility_amount':
      return money(fact.patientPaid + Math.round(fact.outstanding * 0.2), 'Patient payments plus a labelled share of outstanding. It stays inside the allowed amount.');
    case 'kpi_claim_denial_amount':
    case 'kpi_rcm_denied_amount':
    case 'kpi_claim_writeoff_amount':
      return money(fact.writeoff, 'Write-off in the allowed-amount identity.');
    case 'kpi_rcm_unresolved_denial_amount':
      return money(Math.round(fact.writeoff * 0.35), 'A subset of the write-off, not a second write-off.');
    case 'kpi_claim_recovery_amount':
      return { ...money(Math.round(fact.writeoff * 0.22), 'A subset of write-off marked recovered in the story.'), better: 'up' };
    case 'kpi_rcm_ar_over_90_amount':
      return money(Math.round(fact.outstanding * 0.28), 'A subset of outstanding SAR.');
    case 'kpi_rcm_dnfb_amount':
      return money(Math.round(fact.outstanding * 0.16), 'A subset of outstanding SAR sitting unbilled in the story.');
    case 'kpi_rcm_refund_amount':
      return money(Math.round(fact.payerPaid * 0.012), 'A small subset of payer payments.');
    case 'demo_satisfaction_index':
      return { value: fact.satisfaction, kind: 'index', unit: 'index', numerator: fact.satisfaction, denominator: 100, grain: 'Response-weighted average of monthly indexes', better: 'up', note: 'Labelled demo assumption. Shown on a 0–100 index, not as a ratio of events.' };
    case 'demo_discharge_experience_index':
      return { value: Math.round((fact.satisfaction - 2.6) * 10) / 10, kind: 'index', unit: 'index', numerator: fact.satisfaction - 2.6, denominator: 100, grain: 'Satisfaction index minus a fixed discharge gap in this story', better: 'up', note: 'Labelled demo assumption.' };
    case 'demo_complaint_open_count':
      return count(fact.complaintsOpened, 'down', 'Opened complaints. Labelled demo assumption.');
    case 'demo_survey_response_rate':
      return rate(fact.surveysReturned / Math.max(1, fact.surveysSent), fact.surveysReturned, fact.surveysSent, 'up', 'Responses ÷ surveys sent. Labelled demo assumption.');
    case 'demo_followup_completion_rate':
      return rate(Math.min(0.96, fact.complaintsClosed / Math.max(1, fact.complaintsOpened) + 0.12), fact.complaintsClosed, fact.complaintsOpened, 'up', 'Labelled demo assumption tied to the closure cohort.');
    case 'demo_service_recovery_closure_rate':
      return rate(fact.complaintsClosed / Math.max(1, fact.complaintsOpened), fact.complaintsClosed, fact.complaintsOpened, 'up', 'Closed complaints ÷ opened complaints. Labelled demo assumption.');
    case 'demo_dialysis_session_volume':
      return count(fact.dialysisSessions, 'neutral', 'Labelled demo assumption. NMR names dialysis but does not list these columns.');
    case 'demo_hai_surveillance_rate':
      return rate(fact.haiEvents / admissions, fact.haiEvents, admissions, 'down', 'Surveillance events ÷ admissions. Labelled demo assumption, not an NMR field.');
    case 'demo_equipment_uptime':
      return rate(fact.equipmentUptime, Math.round(fact.equipmentUptime * 1000), 1000, 'up', 'Labelled demo assumption. No equipment table is in the source pack.');
    case 'demo_morgue_release_hours':
      return duration(fact.morgueReleaseHours, 'hours', 'down', 'Labelled demo assumption. NMR names morgue without these columns.');
    case 'demo_birth_encounter_volume':
      return count(fact.births, 'neutral', 'Labelled demo assumption. NMR names childbirth without these columns.');
    case 'demo_eligibility_check_volume':
      return count(fact.eligibilityChecks, 'neutral', 'Labelled demo assumption. NMR names eligibility without these columns.');
    default:
      return null;
  }
}

function fallback(kpi: KpiDef, fact: AnnualFact): Raw {
  const parent = Math.max(1, parentOf(fact, kpi.domain));
  const share = (3 + (hash(kpi.key) % 17)) / 40;
  const subset = Math.min(parent, Math.round(parent * share));
  const text = `${kpi.key} ${kpi.name}`.toLowerCase();
  if (MULTIPLIERS.has(kpi.key) || (/per (patient|encounter|admission)/.test(text) && !text.includes('rate') && !text.includes('ratio'))) {
    return { value: Math.round(Math.max(0.2, share * 4) * 100) / 100, kind: 'multiplier', unit: 'per unit', numerator: subset, denominator: parent, grain: 'Derived from the domain cohort', better: 'neutral', note: 'Shown as a multiplier, not a percentage.' };
  }
  if (kpi.unit === 'currency') {
    const slice = Math.min(fact.allowed, Math.round(fact.allowed * share));
    return money(slice, 'Illustrative slice of allowed SAR in the same financial cohort. It is not added on top of the reconciliation.');
  }
  if (kpi.unit === 'ratio' || kpi.unit.includes('rate')) {
    let numerator = subset;
    let denominator = parent;
    let value = numerator / denominator;
    if (/mortality|death/.test(text)) {
      numerator = fact.deaths;
      denominator = Math.max(1, fact.admissions);
      value = numerator / denominator;
    } else if (/occupan/.test(text)) {
      numerator = fact.occupiedBeds;
      denominator = Math.max(1, fact.staffedBeds);
      value = numerator / denominator;
    } else if (/readmission/.test(text)) {
      value = 0.07 + share * 0.08;
      numerator = Math.round(fact.admissions * value);
      denominator = fact.admissions;
    } else if (value > 0.85) {
      value = 0.15 + share * 0.4;
      numerator = Math.round(parent * value);
    }
    const better = /collection|compliance|documentation|response|uptime|utilization/.test(text) ? 'up' : /mortality|denial|cancel|no.show|breach|delay|complaint|vacancy/.test(text) ? 'down' : 'neutral';
    return rate(value, numerator, denominator, better, 'Rate is the subset divided by the domain cohort. The catalog formula is the provenance, not a second number.');
  }
  if (kpi.unit === 'minutes') return duration(12 + share * 140, 'minutes', 'down', 'Duration drawn from the domain timing band.');
  if (kpi.unit === 'hours') return duration((12 + share * 140) / 60, 'hours', 'down', 'The minute band converted by ÷60.');
  if (kpi.unit === 'days' || kpi.unit === 'bed_days') return duration(kpi.unit === 'bed_days' ? fact.occupiedBeds * (fact.ipLosDays / 30) : 0.8 + share * 6, kpi.unit === 'bed_days' ? 'days' : 'days', 'down', 'Day measure kept in the same family as the inpatient stay.');
  if (kpi.domain === 'Workforce' && /fte|staff|vacan/i.test(text)) {
    return { value: Math.round(fact.requiredFte * share * 10) / 10, kind: 'fte', unit: 'FTE', numerator: fact.requiredFte, denominator: 1, grain: 'Staffing snapshot, not a sum of daily roster rows', better: 'neutral', note: 'FTE can be fractional.' };
  }
  if (/count|volume|census/.test(text) && /department|ward/.test(text)) {
    return count(fact.wardCount, 'neutral', 'Organization snapshot.', 'Organization snapshot');
  }
  return count(subset, 'neutral', 'Integer subset of the domain cohort. It does not exceed that cohort.');
}

function applyDepartment(raw: Raw, kpi: KpiDef, department: string): Raw {
  const share = WORKFORCE_SHARES[department];
  if (!share || kpi.domain !== 'Workforce') return raw;
  if (raw.kind === 'rate' || raw.kind === 'index' || raw.kind === 'multiplier') {
    return { ...raw, note: `${raw.note} Department ${department} uses the same rate; staffing counts are scaled by ${(share * 100).toFixed(0)}% of the hospital.` };
  }
  const value = raw.kind === 'fte' ? Math.round(raw.value * share * 10) / 10 : Math.round(raw.value * share);
  return { ...raw, value, numerator: value, note: `${raw.note} Scaled to the ${department} staffing share (${(share * 100).toFixed(0)}%).` };
}

export function measure(kpi: KpiDef, hospital: string, year: number, department = 'All'): Measure {
  const currentFact = scenarioFor(hospital, year).focus;
  const priorYear = year <= 2024 ? 2024 : year - 1;
  const priorFact = scenarioFor(hospital, priorYear).focus;
  const current = applyDepartment(explicit(kpi, currentFact) ?? fallback(kpi, currentFact), kpi, department);
  const prior = applyDepartment(explicit(kpi, priorFact) ?? fallback(kpi, priorFact), kpi, department);
  return {
    ...current,
    prior: prior.value,
    assumption: kpi.origin === 'demo_assumption',
    note: kpi.origin === 'demo_assumption' ? `Demo assumption, not an official NMR field. ${current.note}` : current.note,
  };
}

export function formatMeasure(item: Measure, lang: 'en' | 'ar' = 'en'): string {
  const locale = lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US';
  const digits = new Intl.NumberFormat(locale, { maximumFractionDigits: item.kind === 'count' ? 0 : 1 });
  if (item.kind === 'rate') return `${digits.format(item.value * 100)}%`;
  if (item.kind === 'index') return `${digits.format(item.value)} / 100`;
  if (item.kind === 'multiplier') return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(item.value)}×`;
  if (item.kind === 'currency') return `${CURRENCY} ${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(item.value)}`;
  if (item.kind === 'fte') return `${new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(item.value)} FTE`;
  if (item.kind === 'duration') return `${digits.format(item.value)} ${unitLabel(item.unit, lang)}`;
  return digits.format(item.value);
}

export function formatDelta(item: Measure, lang: 'en' | 'ar' = 'en'): string {
  if (item.prior === item.value || item.prior === 0 && item.kind !== 'rate') {
    return lang === 'ar' ? 'لا تغيير مقابل خط الأساس' : 'No change vs baseline';
  }
  if (item.kind === 'rate') {
    const pp = (item.value - item.prior) * 100;
    if (Math.abs(pp) < 0.05) return lang === 'ar' ? 'لا تغيير مقابل خط الأساس' : 'No change vs baseline';
    const sign = pp > 0 ? '+' : '';
    return lang === 'ar' ? `${sign}${pp.toFixed(1)} نقطة مئوية` : `${sign}${pp.toFixed(1)} pp`;
  }
  if (item.prior === 0) return lang === 'ar' ? 'لا أساس للمقارنة' : 'No baseline';
  const rel = ((item.value - item.prior) / Math.abs(item.prior)) * 100;
  const sign = rel > 0 ? '+' : '';
  return `${sign}${rel.toFixed(1)}%`;
}

export function movedFavorably(item: Measure): boolean | null {
  if (item.better === 'neutral' || item.value === item.prior) return null;
  const up = item.value > item.prior;
  return item.better === 'up' ? up : !up;
}

function unitLabel(unit: string, lang: 'en' | 'ar'): string {
  if (lang === 'en') return unit;
  if (unit === 'minutes') return 'دقيقة';
  if (unit === 'hours') return 'ساعة';
  if (unit === 'days') return 'يوم';
  return unit;
}

export function inspectSeries(points: { label: string; value: number }[]): 'ok' | 'empty' | 'invalid' | 'zero' {
  if (!points.length) return 'empty';
  if (points.some((point) => !Number.isFinite(point.value))) return 'invalid';
  if (points.every((point) => point.value === 0)) return 'zero';
  return 'ok';
}
