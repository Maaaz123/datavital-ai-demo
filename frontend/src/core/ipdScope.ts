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
      : row('Discharge Management', 'Discharge Readiness Documentation Rate', pct(input.readinessDocRate), 'scenario', 'Episodes with a documented ready date ÷ eligible episodes.'),
    row('Discharge Management', 'Medically Ready, Not Discharged Count', num(input.readyNotDischarged), 'constructed', 'Census share marked clinically ready for discharge but still admitted. Medical readiness stays a human decision.'),
    row('Discharge Management', 'Delayed Discharge Rate', pct(input.delayedDischargeRate), 'constructed', 'Ready-but-not-discharged ÷ census. The ready definition is a scenario review line.'),
    input.delayP50 == null
      ? blank('Discharge Management', 'Discharge Delay Duration P50/P90', 'No ready-to-actual discharge clock exists. Ready count is not a delay duration.')
      : row('Discharge Management', 'Discharge Delay Duration P50/P90', `P50 ${num(input.delayP50, 1)}h · P90 ${num(input.delayP90 ?? 0, 1)}h`, 'scenario', 'Hours from clinically ready to actual discharge.'),
    input.dischargeSummaryRate == null
      ? blank('Discharge Management', 'Discharge Summary Completion Rate', 'Discharge summary documents are not stored in this scenario.')
      : row('Discharge Management', 'Discharge Summary Completion Rate', pct(input.dischargeSummaryRate), 'scenario', 'Completed summaries ÷ discharges.'),

    input.carePlanDocRate == null
      ? blank('Inpatient Care Coordination', 'Care Plan Documentation Rate', 'Care-plan records are not stored. Length of stay is not used as a substitute.')
      : row('Inpatient Care Coordination', 'Care Plan Documentation Rate', pct(input.carePlanDocRate), 'scenario', 'Documented care plans ÷ required plans.'),
    input.carePlanReviewRate == null
      ? blank('Inpatient Care Coordination', 'Care Plan Review Compliance', 'Care-plan review timestamps are not stored.')
      : row('Inpatient Care Coordination', 'Care Plan Review Compliance', pct(input.carePlanReviewRate), 'scenario', 'On-time reviews ÷ required reviews.'),
    input.dailyReviewRate == null
      ? blank('Inpatient Care Coordination', 'Daily Clinical Review Completion Rate', 'Daily ward-round completion is not stored.')
      : row('Inpatient Care Coordination', 'Daily Clinical Review Completion Rate', pct(input.dailyReviewRate), 'scenario', 'Completed daily reviews ÷ expected reviews.'),
    input.consultResponseHours == null
      ? blank('Inpatient Care Coordination', 'Consultation Response Time', 'Consultation request and response times are not stored.')
      : row('Inpatient Care Coordination', 'Consultation Response Time', `${num(input.consultResponseHours, 1)} hours`, 'scenario', 'Median hours from consult request to response.'),
    input.pendingConsults == null
      ? blank('Inpatient Care Coordination', 'Pending Clinical Consultations', 'Open consultation queues are not stored.')
      : row('Inpatient Care Coordination', 'Pending Clinical Consultations', num(input.pendingConsults), 'scenario', 'Open consult requests at the snapshot.'),
    input.milestoneRate == null
      ? blank('Inpatient Care Coordination', 'Care Plan Milestone Completion Rate', 'Care-plan milestones are not stored.')
      : row('Inpatient Care Coordination', 'Care Plan Milestone Completion Rate', pct(input.milestoneRate), 'scenario', 'Completed milestones ÷ planned milestones.'),

    row('Inpatient Outcomes', 'Unplanned 7-Day Readmission Rate', pct(input.readmit7), 'constructed', 'Fixed share of discharges. Visits are not linked patient-by-patient.'),
    row('Inpatient Outcomes', 'Unplanned 30-Day Readmission Rate', pct(input.readmit30), 'constructed', 'Fixed share of discharges. Planned returns are not separated.'),
    row('Inpatient Outcomes', 'Readmissions by Clinical Specialty', specialtyReadmit || 'No specialties', 'constructed', 'Specialty shares around the hospital 30-day rate. Severity is not adjusted.'),
    row('Inpatient Outcomes', 'Inpatient Mortality Count', num(input.deaths), 'scenario', 'Deaths during the inpatient episode. Emergency deaths stay in Emergency.'),
    row('Inpatient Outcomes', 'Inpatient Mortality Rate', pct(input.deaths / Math.max(admissions, 1)), 'scenario', 'Inpatient deaths ÷ inpatient admissions.'),
    row('Inpatient Outcomes', 'Discharge Against Medical Advice Rate', pct(input.amaRate), 'constructed', 'Fixed share of discharges labelled left against medical advice.'),
    row('Inpatient Outcomes', 'Discharge-to-Admission Flow Ratio', pct(episodeComplete), 'constructed', 'Discharges ÷ admissions plus transfers in. A flow identity check only — not completed clinical episodes or a quality score.'),

    input.admissionAssessmentRate == null
      ? blank('Inpatient Documentation & Continuity', 'Admission Assessment Completion Rate', 'Admission assessment documents are not stored.')
      : row('Inpatient Documentation & Continuity', 'Admission Assessment Completion Rate', pct(input.admissionAssessmentRate), 'scenario', 'Completed admission assessments ÷ admissions.'),
    input.diagnosisDocRate == null
      ? blank('Inpatient Documentation & Continuity', 'Diagnosis Documentation Completion Rate', 'Coded diagnosis completeness is not stored.')
      : row('Inpatient Documentation & Continuity', 'Diagnosis Documentation Completion Rate', pct(input.diagnosisDocRate), 'scenario', 'Episodes with complete diagnosis coding ÷ episodes.'),
    input.dischargeInstructionsRate == null
      ? blank('Inpatient Documentation & Continuity', 'Discharge Instructions Completion Rate', 'Discharge instruction documents are not stored.')
      : row('Inpatient Documentation & Continuity', 'Discharge Instructions Completion Rate', pct(input.dischargeInstructionsRate), 'scenario', 'Completed instruction sets ÷ discharges.'),
    input.medRecRate == null
      ? blank('Inpatient Documentation & Continuity', 'Discharge Medication Reconciliation Documentation Rate', 'Medication reconciliation documents are not stored. Pharmacy run rates stay in Pharmacy.')
      : row('Inpatient Documentation & Continuity', 'Discharge Medication Reconciliation Documentation Rate', pct(input.medRecRate), 'scenario', 'Documented med-rec ÷ discharges.'),
    input.followUpPlanRate == null
      ? blank('Inpatient Documentation & Continuity', 'Follow-up Plan Documentation Rate', 'Follow-up plan documents are not stored.')
      : row('Inpatient Documentation & Continuity', 'Follow-up Plan Documentation Rate', pct(input.followUpPlanRate), 'scenario', 'Documented follow-up plans ÷ discharges.'),
  ];
}

export const IPD_AI_CASES: AiCase[] = [
  { id: 'IPD-AI-01', name: 'Length of Stay Prediction', level: 'Predictive', inputs: 'Completed stay days, specialty, and severity.', analysis: 'The page shows average, median, and P90 length of stay.', limit: 'Remaining stay is not predicted for a patient who is here now.' },
  { id: 'IPD-AI-02', name: 'Prolonged Stay Risk Detection', level: 'Rule alert', inputs: 'Current stay days versus an expected specialty line.', analysis: 'Long-stay count and rate use a 7-day review line.', limit: 'Risk is detection on completed stays, not a live patient score.' },
  { id: 'IPD-AI-03', name: 'Discharge Readiness Forecasting', level: 'Predictive', inputs: 'Clinical reviews, consults, and ready dates.', analysis: 'Ready-but-not-discharged is a constructed census share.', limit: 'AI does not declare a patient medically ready. That stays a clinician decision.' },
  { id: 'IPD-AI-04', name: 'Delayed Discharge Intelligence', level: 'Pattern review', inputs: 'Ready date, actual discharge, and delay reason.', analysis: 'Delayed discharge rate pairs ready-not-discharged with census.', limit: 'Delay reasons and duration clocks are blank.' },
  { id: 'IPD-AI-05', name: 'Discharge Volume Forecasting', level: 'Predictive', inputs: 'Historical discharges and ready pipeline.', analysis: 'Expected discharges are a next-day sketch from the period rate.', limit: '24–72 hour volume is not a validated forecast.' },
  { id: 'IPD-AI-06', name: 'Readmission Risk Prediction', level: 'Predictive', inputs: 'Linked discharge and unplanned return within 7 or 30 days.', analysis: '7-day and 30-day rates are fixed shares of discharges.', limit: 'Patient-level risk is not scored. Visits are not linked.' },
  { id: 'IPD-AI-07', name: 'Care Plan Compliance Intelligence', level: 'Rule alert', inputs: 'Care-plan create and review timestamps.', analysis: 'Care-plan indicators are blank in this scenario.', limit: 'Missing documentation is not inferred from length of stay.' },
  { id: 'IPD-AI-08', name: 'Clinical Consultation Delay Detection', level: 'Rule alert', inputs: 'Consult request and response times.', analysis: 'Consultation clocks are blank.', limit: 'A consult delay is not detected from discharge delay alone.' },
  { id: 'IPD-AI-09', name: 'Inpatient Outcome Variation Analysis', level: 'Pattern review', inputs: 'Outcomes by specialty with severity adjustment.', analysis: 'Specialty LOS and readmission shares are constructed without severity adjustment.', limit: 'Raw specialty differences are not proof of better or worse care.' },
  { id: 'IPD-AI-10', name: 'Discharge Documentation Intelligence', level: 'Rule alert', inputs: 'Summary, instructions, med-rec, and follow-up documents.', analysis: 'Documentation completion rates are blank.', limit: 'Missing paperwork is not inferred from mortality or readmission.' },
  { id: 'IPD-AI-11', name: 'Inpatient What-if Simulator', level: 'Optimization', inputs: 'Long-stay rate, delayed discharge, and review compliance.', analysis: 'The outlook sketch reacts when discharge assumptions change in the story.', limit: 'Policy simulation is illustrative only.' },
  { id: 'IPD-AI-12', name: 'Inpatient Decision Copilot', level: 'Pattern review', inputs: 'The inpatient indicators, alerts, and scenarios on these three screens.', analysis: 'Admissions, LOS, ready-not-discharged, and readmissions are the associated signals.', limit: 'No calibrated forecast is produced. An approval is not a measured hospital result.' },
];
