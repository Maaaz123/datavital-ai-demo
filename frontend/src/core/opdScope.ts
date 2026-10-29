import type { OpdView } from './opdView';

export type IndicatorStatus = 'scenario' | 'constructed' | 'unavailable';

export type Indicator = {
  domain: string;
  name: string;
  value: string;
  status: IndicatorStatus;
  method: string;
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

export function opdIndicatorsFor(view: OpdView): Indicator[] {
  return [
    row('Outpatient Demand & Activity', 'Total Outpatient Visits', num(view.visits), 'scenario', 'Attended clinic visits in the selected hospital and period. Derived from the scenario appointment-attended cohort; cancellations and no-shows are excluded.'),
    row('Outpatient Demand & Activity', 'Completed Consultations', num(view.completed), 'constructed', 'Visits with a completed consultation in the period. Completion rate is a constructed scenario share of attended visits.'),
    row('Outpatient Demand & Activity', 'Unique Outpatients', num(view.uniqueOutpatients), 'constructed', 'Illustrative unique-patient estimate ≈ 61% of visits. Not patient-level deduplication. Distinct from follow-up visit volume.'),
    row('Outpatient Demand & Activity', 'New Patient Visits', num(view.newVisits), 'constructed', 'New visits are a fixed scenario share of attended visits. New + follow-up = total visits.'),
    row('Outpatient Demand & Activity', 'Follow-up Visits', num(view.followUpVisits), 'constructed', 'Follow-up visits are the remainder after new visits. Not an appointments waitlist measure.'),
    row('Outpatient Demand & Activity', 'Visit Completion Rate', pct(view.completionRate), 'constructed', 'Completed consultations ÷ attended visits.'),
    row('Outpatient Demand & Activity', 'Walk-in Visit Share', pct(view.walkInShare), 'constructed', 'Walk-in share of attended visits. Appointment booking KPIs stay outside OPD ownership.'),
    row('Outpatient Demand & Activity', 'Same-Day Visit Volume', num(view.sameDayVisits), 'constructed', 'Same-day clinic visits inside the attended cohort.'),
    row('Outpatient Demand & Activity', 'Clinic Session Utilization', pct(view.sessionUtilization), 'constructed', 'Illustrative clinic capacity utilization — not appointment slot-fill from real schedules.'),
    row('Outpatient Demand & Activity', 'Visits per Clinic Session', num(view.visitsPerSession, 1), 'constructed', `Attended visits ÷ clinic sessions (${num(view.visits)} / ${num(view.clinicSessions)}).`),

    row('Clinic Waiting & Flow', 'Median Arrival-to-Provider Time', `${num(view.waitMedian, 1)} min`, 'scenario', 'Median minutes from clinic arrival to first provider start. Not ED door-to-provider and not consultation duration.'),
    row('Clinic Waiting & Flow', 'P90 Arrival-to-Provider Time', `${num(view.waitP90, 1)} min`, 'scenario', '90th-percentile arrival-to-provider for the same visits.'),
    row('Clinic Waiting & Flow', 'Median Clinic Cycle Time', `${num(view.cycleMedian, 1)} min`, 'constructed', 'Constructed wait median + illustrative consult duration — not a measured patient-level cycle median.'),
    row('Clinic Waiting & Flow', 'P90 Clinic Cycle Time', `${num(view.cycleP90, 1)} min`, 'constructed', 'Constructed wait P90 + stretched consult duration — not a measured patient-level P90 cycle.'),
    row('Clinic Waiting & Flow', 'Registration-to-Consultation Time', `${num(view.registrationToConsult, 1)} min`, 'constructed', 'Illustrative share of arrival-to-provider after registration.'),
    row('Clinic Waiting & Flow', 'Consultation Duration', `${num(view.consultDuration, 1)} min`, 'constructed', 'Illustrative consult length. Not waiting time and not cycle time.'),
    row('Clinic Waiting & Flow', 'Visits Exceeding Waiting Threshold', num(view.exceedingWait), 'constructed', `Visits with arrival-to-provider above the ${view.waitThresholdMin}-minute scenario review line.`),
    row('Clinic Waiting & Flow', 'On-Time Consultation Start Rate', pct(view.onTimeStartRate), 'constructed', 'Share of consultations starting within the scenario on-time window.'),
    row('Clinic Waiting & Flow', 'Delayed Clinic Sessions', num(view.delayedSessions), 'constructed', 'Sessions whose first-provider start was late ≈ sessions × late-start share. Distinct from the on-time rate card.'),
    row('Clinic Waiting & Flow', 'Visits Completed Within Target Time', num(view.withinTarget), 'constructed', 'Visits finishing inside the scenario cycle-time target.'),

    row('Outpatient Quality & Follow-up', 'Consultation Completion Rate', pct(view.completionRate), 'constructed', 'Same construction as visit completion rate for the period.'),
    row('Outpatient Quality & Follow-up', 'Clinical Documentation Completion Rate', pct(view.docCompletionRate), 'constructed', 'Illustrative documentation completion share. Not extracted chart notes.'),
    row('Outpatient Quality & Follow-up', 'Consultation Note Completion Rate', pct(view.noteCompletionRate), 'constructed', 'Illustrative note completion share.'),
    row('Outpatient Quality & Follow-up', 'Follow-up Plan Documentation Rate', pct(view.followUpPlanRate), 'constructed', 'Illustrative follow-up plan documentation share.'),
    row('Outpatient Quality & Follow-up', 'Follow-up Recommendation Rate', pct(view.followUpRecommendRate), 'constructed', 'Share of completed consultations with a follow-up recommendation.'),
    row('Outpatient Quality & Follow-up', 'Referral Completion Rate', pct(view.referralCompletionRate), 'constructed', 'Completed clinical referrals ÷ recommended referrals in the scenario.'),
    row('Outpatient Quality & Follow-up', 'Pending Clinical Referrals', num(view.pendingReferrals), 'constructed', 'Open + in-progress referrals from the recommended-referral cohort (mutually exclusive of completed).'),
    row('Outpatient Quality & Follow-up', 'Unplanned Outpatient Return Rate', pct(view.unplannedReturnRate), 'constructed', 'Illustrative 2.8% scenario share. Not a patient-linked return calculation.'),
    row('Outpatient Quality & Follow-up', 'Outstanding Clinical Actions', num(view.outstandingActions), 'constructed', 'Open clinical actions after the visit.'),
    row('Outpatient Quality & Follow-up', 'Follow-up Coordination Completion Rate', pct(view.followUpCoordRate), 'constructed', 'Illustrative coordination completion share.'),

    blank('Outpatient Access Context', 'Appointment No-Show Rate', 'Owned by Appointments. OPD uses attended visits only and does not duplicate booking performance.'),
    blank('Outpatient Access Context', 'Slot Fill Rate', 'Owned by Appointments. Clinic session utilization above is an OPD capacity sketch, not a booking fill metric.'),
  ];
}

export const OPD_AI_CASES: AiCase[] = [
  {
    id: 'OPD-AI-01',
    name: 'Prolonged Clinic Waiting Detection',
    level: 'Rule alert',
    inputs: 'Arrival-to-provider median and P90, specialty wait bars.',
    analysis: 'Flags clinics where waiting exceeds the scenario review line.',
    limit: 'Does not diagnose clinical urgency. Waiting is not consultation duration.',
  },
  {
    id: 'OPD-AI-02',
    name: 'Late Consultation Start Pattern',
    level: 'Pattern review',
    inputs: 'On-time start rate, delayed sessions, starts-by-hour.',
    analysis: 'Highlights morning and afternoon delay concentration.',
    limit: 'Illustrative pattern only — not a validated schedule optimizer.',
  },
  {
    id: 'OPD-AI-03',
    name: 'Visit Completion Watch',
    level: 'Rule alert',
    inputs: 'Completion rate and incomplete visit share.',
    analysis: 'Surfaces specialties with higher incomplete share.',
    limit: 'Incomplete visits are constructed; reasons are not chart-reviewed.',
  },
  {
    id: 'OPD-AI-04',
    name: 'Documentation Backlog Signal',
    level: 'Pattern review',
    inputs: 'Documentation and note completion rates.',
    analysis: 'Tracks illustrative documentation completion trends.',
    limit: 'Not extracted EMR documents.',
  },
  {
    id: 'OPD-AI-05',
    name: 'Pending Referral Pressure',
    level: 'Rule alert',
    inputs: 'Pending referrals and referral completion rate.',
    analysis: 'Flags accumulating open clinical referrals.',
    limit: 'Referral pathways are illustrative; specialty systems are not linked.',
  },
  {
    id: 'OPD-AI-06',
    name: 'Clinic Throughput What-if',
    level: 'Optimization',
    inputs: 'Demand, waiting, utilization, and consultation duration.',
    analysis: 'Sketches illustrative outcomes when demand or waiting changes.',
    limit: 'Not a calibrated forecast. Assumptions stay visible in Vital Assist.',
  },
];
