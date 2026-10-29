export type IndicatorStatus = 'scenario' | 'constructed' | 'unavailable';

export type Indicator = {
  domain: string;
  name: string;
  value: string;
  status: IndicatorStatus;
  method: string;
};

export type IpdScopeInput = {
  admissions: number;
  census: number;
  discharges: number;
  deaths: number;
  edAdmitted: number;
  directAdmissions: number;
  transfersIn: number;
  transfersOut: number;
  losAvg: number;
  losMedian: number;
  losP90: number;
  longStayCount: number;
  longStayRate: number;
  expectedDischarges: number;
  readyNotDischarged: number;
  delayedDischargeRate: number;
  readmit7: number;
  readmit30: number;
  amaRate: number;
  specialties: { id: string; admissions: number; discharges: number; los: number }[];
  sources: { id: string; count: number }[];
  destinations: { id: string; count: number }[];
  oeLos: number | null;
  delayP50: number | null;
  delayP90: number | null;
  readinessDocRate: number | null;
  dischargeSummaryRate: number | null;
  carePlanDocRate: number | null;
  carePlanReviewRate: number | null;
  dailyReviewRate: number | null;
  consultResponseHours: number | null;
  pendingConsults: number | null;
  milestoneRate: number | null;
  admissionAssessmentRate: number | null;
  diagnosisDocRate: number | null;
  dischargeInstructionsRate: number | null;
  medRecRate: number | null;
  followUpPlanRate: number | null;
  cancelRate: number | null;
};

export type AiCase = {
  id: string;
  name: string;
  level: 'Rule alert' | 'Pattern review' | 'Predictive' | 'Optimization';
  inputs: string;
  analysis: string;
  limit: string;
};

const blank = (domain: string, name: string, method: string): Indicator => ({
  domain, name, value: 'Not available', status: 'unavailable', method,
});

const row = (domain: string, name: string, value: string, status: IndicatorStatus, method: string): Indicator => ({
  domain, name, value, status, method,
});

function pct(value: number): string {
  const percent = value * 100;
  const digits = percent !== 0 && Math.abs(percent) < 0.1 ? 3 : 1;
  return `${percent.toFixed(digits)}%`;
}

function num(value: number, digits = 0): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

/**
 * Illustrative documentation / care-progress shares for the executive demo.
 * Values move slightly with occupancy and hospital identity so filters stay coherent.
 * Not extracted chart documents and not a validated clinical model.
 */
export function ipdDocScenario(input: {
  hospital: string;
  occupiedBeds: number;
  staffedBeds: number;
}): {
  readinessDocRate: number;
  dischargeSummaryRate: number;
  carePlanDocRate: number;
  carePlanReviewRate: number;
  dailyReviewRate: number;
  consultResponseHours: number;
  pendingConsults: number;
  milestoneRate: number;
  admissionAssessmentRate: number;
  diagnosisDocRate: number;
  dischargeInstructionsRate: number;
  medRecRate: number;
  followUpPlanRate: number;
} {
  const occ = input.staffedBeds ? input.occupiedBeds / input.staffedBeds : 0.8;
  const salt = (input.hospital.length % 7) * 0.004;
  const squeeze = Math.min(0.08, Math.max(0, (occ - 0.85) * 0.4));
  return {
    carePlanDocRate: clamp(0.91 - squeeze + salt, 0.82, 0.96),
    carePlanReviewRate: clamp(0.86 - squeeze + salt, 0.78, 0.93),
    dailyReviewRate: clamp(0.93 - squeeze * 0.5 + salt, 0.86, 0.97),
    consultResponseHours: Math.round((10 + squeeze * 40 + (input.hospital.length % 5)) * 10) / 10,
    pendingConsults: Math.max(2, Math.round(input.occupiedBeds * (0.04 + squeeze * 0.1))),
    milestoneRate: clamp(0.81 - squeeze + salt, 0.72, 0.9),
    admissionAssessmentRate: clamp(0.96 - squeeze * 0.3, 0.9, 0.98),
    diagnosisDocRate: clamp(0.92 - squeeze * 0.4 + salt, 0.85, 0.97),
    dischargeInstructionsRate: clamp(0.88 - squeeze + salt, 0.8, 0.94),
    medRecRate: clamp(0.84 - squeeze + salt, 0.76, 0.92),
    followUpPlanRate: clamp(0.8 - squeeze + salt, 0.72, 0.9),
    dischargeSummaryRate: clamp(0.87 - squeeze + salt, 0.78, 0.94),
    readinessDocRate: clamp(0.74 - squeeze * 1.2 + salt, 0.62, 0.85),
  };
}

export function ipdIndicatorsFor(input: IpdScopeInput): Indicator[] {
  const admissions = input.admissions || 1;
  const discharges = input.discharges || 1;
  const specialtyLine = input.specialties.map((item) => `${item.id} ${num(item.admissions)}`).join(' · ');
  const sourceLine = input.sources.map((item) => `${item.id} ${num(item.count)}`).join(' · ');
  const destLine = input.destinations.map((item) => `${item.id} ${num(item.count)}`).join(' · ');
  const specialtyLos = input.specialties.map((item) => `${item.id} ${num(item.los, 1)}d`).join(' · ');
  const specialtyReadmit = input.specialties.map((item) => `${item.id} ${pct(input.readmit30 * (0.7 + (item.admissions / admissions) * 0.6))}`).join(' · ');
  const elective = Math.max(0, input.directAdmissions);
  const emergency = input.edAdmitted;
  const episodeComplete = discharges / Math.max(admissions + input.transfersIn, 1);

  return [
    row('Admissions & Inpatient Activity', 'New Inpatient Admissions', num(input.admissions), 'scenario', 'Inpatient admissions in the selected period. This is not emergency visit volume and not bed occupancy.'),
    row('Admissions & Inpatient Activity', 'Current Inpatient Census (Patients)', num(input.census), 'scenario', 'Patients currently in an inpatient bed at the snapshot. Shown as a patient count, not a bed occupancy rate.'),
    row('Admissions & Inpatient Activity', 'Admissions by Clinical Specialty', specialtyLine || 'No specialties', 'constructed', 'Specialty split of admissions. Fixed shares that still sum to admissions.'),
    row('Admissions & Inpatient Activity', 'Admissions by Source', sourceLine || 'No sources', 'constructed', 'ED, elective, transfer, and other sources that sum to admissions.'),
    row('Admissions & Inpatient Activity', 'Elective vs Emergency Admissions', `Elective ${num(elective)} · From ED ${num(emergency)}`, 'scenario', 'Direct/elective admissions versus admissions that began in emergency. Emergency wait times stay in Emergency.'),
    row('Admissions & Inpatient Activity', 'Inpatient Admission Trend', `${num(input.admissions)} admissions · see trend chart`, 'scenario', 'Monthly admissions that sum to the period total.'),
    input.cancelRate == null
      ? blank('Admissions & Inpatient Activity', 'Admission Cancellation Rate', 'Cancelled planned admissions are not recorded. Elective volume is not used as a cancellation rate.')
      : row('Admissions & Inpatient Activity', 'Admission Cancellation Rate', pct(input.cancelRate), 'scenario', 'Cancelled planned admissions ÷ planned admissions.'),

    row('Inpatient Length of Stay', 'Average Inpatient Length of Stay', `${num(input.losAvg, 1)} days`, 'scenario', 'Average days for completed inpatient stays. Not emergency length of stay.'),
    row('Inpatient Length of Stay', 'Median Inpatient Length of Stay', `${num(input.losMedian, 1)} days`, 'scenario', 'Median days for completed inpatient stays. Stored separately from the average and P90.'),
    row('Inpatient Length of Stay', 'Inpatient LOS P90', `${num(input.losP90, 1)} days`, 'scenario', '90th-percentile inpatient length of stay for completed stays.'),
    row('Inpatient Length of Stay', 'Long-Stay Patient Count', num(input.longStayCount), 'constructed', 'Completed stays beyond the 7-day review line in this story.'),
    row('Inpatient Length of Stay', 'Long-Stay Patient Rate', pct(input.longStayRate), 'constructed', 'Long-stay stays ÷ completed discharges. The 7-day line is a scenario review line aligned with catalog long-stay >7 days.'),
    row('Inpatient Length of Stay', 'LOS by Clinical Specialty', specialtyLos || 'No specialties', 'constructed', 'Specialty medians built around the hospital median. Severity mix is not adjusted.'),
    input.oeLos == null
      ? blank('Inpatient Length of Stay', 'Observed-to-Expected LOS Ratio', 'No expected-LOS model exists. Specialty medians are not used as an O/E ratio.')
      : row('Inpatient Length of Stay', 'Observed-to-Expected LOS Ratio', num(input.oeLos, 2), 'scenario', 'Observed LOS ÷ expected LOS for the case mix.'),

    row('Discharge Management', 'Total Inpatient Discharges', num(input.discharges), 'scenario', 'Inpatient discharges in the period. Bed releases are owned by Beds; this count is the patient episode.'),
    row('Discharge Management', 'Discharges by Destination', destLine || 'No destinations', 'constructed', 'Home, transfer, rehab, and left against medical advice partition completed discharges. Inpatient deaths are counted separately.'),
    row('Discharge Management', 'Expected Discharges', num(input.expectedDischarges), 'constructed', 'Illustrative next-day discharges from the period discharge rate. Not a validated forecast.'),
    input.readinessDocRate == null
      ? blank('Discharge Management', 'Discharge Readiness Documentation Rate', 'Clinically-ready documentation events are not stored. Ready-but-not-discharged is not used as a documentation rate.')
      : row('Discharge Management', 'Discharge Readiness Documentation Rate', pct(input.readinessDocRate), 'constructed', 'Illustrative share of eligible episodes with a documented ready date. Not an extracted chart clock.'),
    row('Discharge Management', 'Medically Ready, Not Discharged Count', num(input.readyNotDischarged), 'constructed', 'Census share marked clinically ready for discharge but still admitted. Medical readiness stays a human decision.'),
    row('Discharge Management', 'Delayed Discharge Rate', pct(input.delayedDischargeRate), 'constructed', 'Ready-but-not-discharged ÷ census. The ready definition is a scenario review line.'),
    input.delayP50 == null
      ? blank('Discharge Management', 'Discharge Delay Duration P50/P90', 'No ready-to-actual discharge clock exists. Ready count is not a delay duration.')
      : row('Discharge Management', 'Discharge Delay Duration P50/P90', `P50 ${num(input.delayP50, 1)}h · P90 ${num(input.delayP90 ?? 0, 1)}h`, 'scenario', 'Hours from clinically ready to actual discharge.'),
    input.dischargeSummaryRate == null
      ? blank('Discharge Management', 'Discharge Summary Completion Rate', 'Discharge summary documents are not stored in this scenario.')
      : row('Discharge Management', 'Discharge Summary Completion Rate', pct(input.dischargeSummaryRate), 'constructed', 'Illustrative completed summaries ÷ discharges. Not validated chart extraction.'),

    input.carePlanDocRate == null
      ? blank('Inpatient Care Coordination', 'Care Plan Documentation Rate', 'Care-plan records are not stored. Length of stay is not used as a substitute.')
      : row('Inpatient Care Coordination', 'Care Plan Documentation Rate', pct(input.carePlanDocRate), 'constructed', 'Illustrative documented care plans ÷ required plans. Not inferred from length of stay.'),
    input.carePlanReviewRate == null
      ? blank('Inpatient Care Coordination', 'Care Plan Review Compliance', 'Care-plan review timestamps are not stored.')
      : row('Inpatient Care Coordination', 'Care Plan Review Compliance', pct(input.carePlanReviewRate), 'constructed', 'Illustrative on-time reviews ÷ required reviews.'),
    input.dailyReviewRate == null
      ? blank('Inpatient Care Coordination', 'Daily Clinical Review Completion Rate', 'Daily ward-round completion is not stored.')
      : row('Inpatient Care Coordination', 'Daily Clinical Review Completion Rate', pct(input.dailyReviewRate), 'constructed', 'Illustrative completed daily reviews ÷ expected reviews.'),
    input.consultResponseHours == null
      ? blank('Inpatient Care Coordination', 'Median Consultation Response Time', 'Consultation request and response times are not stored.')
      : row('Inpatient Care Coordination', 'Median Consultation Response Time', `${num(input.consultResponseHours, 1)} hours`, 'constructed', 'Illustrative median hours from consult request to response.'),
    input.pendingConsults == null
      ? blank('Inpatient Care Coordination', 'Pending Clinical Consultations', 'Open consultation queues are not stored.')
      : row('Inpatient Care Coordination', 'Pending Clinical Consultations', num(input.pendingConsults), 'constructed', 'Illustrative open consult requests at the census snapshot.'),
    input.milestoneRate == null
      ? blank('Inpatient Care Coordination', 'Care Plan Milestone Completion Rate', 'Care-plan milestones are not stored.')
      : row('Inpatient Care Coordination', 'Care Plan Milestone Completion Rate', pct(input.milestoneRate), 'constructed', 'Illustrative completed milestones ÷ planned milestones.'),

    row('Inpatient Outcomes', 'Unplanned 7-Day Readmission Rate', pct(input.readmit7), 'constructed', 'Fixed share of discharges. Visits are not linked patient-by-patient.'),
    row('Inpatient Outcomes', 'Unplanned 30-Day Readmission Rate', pct(input.readmit30), 'constructed', 'Fixed share of discharges. Planned returns are not separated.'),
    row('Inpatient Outcomes', 'Readmissions by Clinical Specialty', specialtyReadmit || 'No specialties', 'constructed', 'Specialty shares around the hospital 30-day rate. Severity is not adjusted.'),
    row('Inpatient Outcomes', 'Inpatient Mortality Count', num(input.deaths), 'scenario', 'Deaths during the inpatient episode. Emergency deaths stay in Emergency.'),
    row('Inpatient Outcomes', 'Inpatient Mortality Rate', pct(input.deaths / Math.max(admissions, 1)), 'scenario', 'Inpatient deaths ÷ inpatient admissions.'),
    row('Inpatient Outcomes', 'Discharge Against Medical Advice Rate', pct(input.amaRate), 'constructed', 'Fixed share of discharges labelled left against medical advice.'),
    row('Inpatient Outcomes', 'Discharge-to-Admission Flow Ratio', pct(episodeComplete), 'constructed', 'Discharges ÷ admissions plus transfers in. A flow identity check only — not completed clinical episodes or a quality score.'),

    input.admissionAssessmentRate == null
      ? blank('Inpatient Documentation & Continuity', 'Admission Assessment Completion Rate', 'Admission assessment documents are not stored.')
      : row('Inpatient Documentation & Continuity', 'Admission Assessment Completion Rate', pct(input.admissionAssessmentRate), 'constructed', 'Illustrative completed admission assessments ÷ admissions.'),
    input.diagnosisDocRate == null
      ? blank('Inpatient Documentation & Continuity', 'Diagnosis Documentation Completion Rate', 'Coded diagnosis completeness is not stored.')
      : row('Inpatient Documentation & Continuity', 'Diagnosis Documentation Completion Rate', pct(input.diagnosisDocRate), 'constructed', 'Illustrative episodes with complete diagnosis coding ÷ episodes.'),
    input.dischargeInstructionsRate == null
      ? blank('Inpatient Documentation & Continuity', 'Discharge Instructions Completion Rate', 'Discharge instruction documents are not stored.')
      : row('Inpatient Documentation & Continuity', 'Discharge Instructions Completion Rate', pct(input.dischargeInstructionsRate), 'constructed', 'Illustrative completed instruction sets ÷ discharges.'),
    input.medRecRate == null
      ? blank('Inpatient Documentation & Continuity', 'Discharge Medication Reconciliation Completion Rate', 'Medication reconciliation documents are not stored. Pharmacy run rates stay in Pharmacy.')
      : row('Inpatient Documentation & Continuity', 'Discharge Medication Reconciliation Completion Rate', pct(input.medRecRate), 'constructed', 'Illustrative documented med-rec ÷ discharges. Pharmacy run rates stay in Pharmacy.'),
    input.followUpPlanRate == null
      ? blank('Inpatient Documentation & Continuity', 'Follow-up Plan Documentation Rate', 'Follow-up plan documents are not stored.')
      : row('Inpatient Documentation & Continuity', 'Follow-up Plan Documentation Rate', pct(input.followUpPlanRate), 'constructed', 'Illustrative documented follow-up plans ÷ discharges.'),
  ];
}

export const IPD_AI_CASES: AiCase[] = [
  { id: 'IPD-AI-01', name: 'Length of Stay Prediction', level: 'Predictive', inputs: 'Completed stay days, specialty, and severity.', analysis: 'The page shows average, median, and P90 length of stay.', limit: 'Remaining stay is not predicted for a patient who is here now.' },
  { id: 'IPD-AI-02', name: 'Prolonged Stay Risk Detection', level: 'Rule alert', inputs: 'Current stay days versus an expected specialty line.', analysis: 'Long-stay count and rate use a 7-day review line.', limit: 'Risk is detection on completed stays, not a live patient score.' },
  { id: 'IPD-AI-03', name: 'Discharge Readiness Forecasting', level: 'Predictive', inputs: 'Clinical reviews, consults, and ready dates.', analysis: 'Ready-but-not-discharged is a constructed census share.', limit: 'AI does not declare a patient medically ready. That stays a clinician decision.' },
  { id: 'IPD-AI-04', name: 'Delayed Discharge Intelligence', level: 'Pattern review', inputs: 'Ready date, actual discharge, and delay reason.', analysis: 'Delayed discharge rate pairs ready-not-discharged with census.', limit: 'Ready-to-actual delay duration clocks stay unavailable.' },
  { id: 'IPD-AI-05', name: 'Discharge Volume Forecasting', level: 'Predictive', inputs: 'Historical discharges and ready pipeline.', analysis: 'Expected discharges are a next-day sketch from the period rate.', limit: '24–72 hour volume is not a validated forecast.' },
  { id: 'IPD-AI-06', name: 'Readmission Risk Prediction', level: 'Predictive', inputs: 'Linked discharge and unplanned return within 7 or 30 days.', analysis: '7-day and 30-day rates are fixed shares of discharges.', limit: 'Patient-level risk is not scored. Visits are not linked.' },
  { id: 'IPD-AI-07', name: 'Care Plan Compliance Intelligence', level: 'Rule alert', inputs: 'Care-plan create and review timestamps.', analysis: 'Care-plan documentation and review compliance are illustrative scenario shares.', limit: 'Missing documentation is not inferred from length of stay. Not a validated chart extract.' },
  { id: 'IPD-AI-08', name: 'Clinical Consultation Delay Detection', level: 'Rule alert', inputs: 'Consult request and response times.', analysis: 'Median consultation response and pending consults are illustrative scenario figures.', limit: 'A consult delay is not detected from discharge delay alone.' },
  { id: 'IPD-AI-09', name: 'Inpatient Outcome Variation Analysis', level: 'Pattern review', inputs: 'Outcomes by specialty with severity adjustment.', analysis: 'Specialty LOS and readmission shares are constructed without severity adjustment.', limit: 'Raw specialty differences are not proof of better or worse care.' },
  { id: 'IPD-AI-10', name: 'Discharge Documentation Intelligence', level: 'Rule alert', inputs: 'Summary, instructions, med-rec, and follow-up documents.', analysis: 'Summary, med-rec, instructions, and follow-up completion rates are illustrative scenario shares.', limit: 'Missing paperwork is not inferred from mortality or readmission. Not a validated EMR extract.' },
  { id: 'IPD-AI-11', name: 'Inpatient What-if Simulator', level: 'Optimization', inputs: 'Long-stay rate, delayed discharge, and review compliance.', analysis: 'The outlook sketch reacts when discharge assumptions change in the story.', limit: 'Policy simulation is illustrative only.' },
  { id: 'IPD-AI-12', name: 'Inpatient Decision Copilot', level: 'Pattern review', inputs: 'The inpatient indicators, alerts, and scenarios on these three screens.', analysis: 'Admissions, LOS, documentation completion, ready-not-discharged, and readmissions are the associated signals.', limit: 'No calibrated forecast is produced. An approval is not a measured hospital result.' },
];
