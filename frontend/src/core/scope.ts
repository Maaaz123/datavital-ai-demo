export type IndicatorStatus = 'scenario' | 'constructed' | 'unavailable';

export type Indicator = {
  domain: string;
  name: string;
  value: string;
  status: IndicatorStatus;
  method: string;
};

export type ScopeInput = {
  arrivals: number;
  admitted: number;
  discharged: number;
  left: number;
  before: number;
  deaths: number;
  triageCompleted: number;
  median: number;
  p90: number;
  losMedian: number;
  losP90: number;
  boarding: number;
  revisit: number;
  required: number;
  filled: number;
  shifts: { name: string; required: number; filled: number }[];
  bedsAvailable: number;
  bays: number;
  modes: { name: string; count: number }[];
  peaks: { name: string; count: number }[];
  priorArrivals: number;
  acuity: number[];
};

export type AiCase = {
  id: string;
  group: string;
  name: string;
  level: 'Descriptive' | 'Predictive' | 'Prescriptive';
  inputs: string;
  analysis: string;
  limit: string;
};

const blank = (domain: string, name: string, method: string): Indicator => ({
  domain, name, value: 'Not in scenario', status: 'unavailable', method,
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

export function indicatorsFor(input: ScopeInput): Indicator[] {
  const arrivals = input.arrivals || 1;
  const ambulance = input.modes.find((item) => item.name === 'Ambulance')?.count ?? 0;
  const peak = input.peaks[0];
  const esi45 = (input.acuity[3] ?? 0) + (input.acuity[4] ?? 0);
  const growth = input.priorArrivals ? (input.arrivals - input.priorArrivals) / input.priorArrivals : 0;
  const shift = (name: string) => input.shifts.find((item) => item.name === name);
  const coverage = (item?: { required: number; filled: number }) => (
    item && item.required ? `${pct(item.filled / item.required)} (${num(item.filled)} / ${num(item.required)} FTE)` : 'Not in scenario'
  );
  return [
    row('Patient Demand & Arrivals', 'Total ED Visits', num(input.arrivals), 'scenario', 'Emergency arrivals in the selected hospital and period.'),
    blank('Patient Demand & Arrivals', 'Unique ED Patients', 'Visits are not linked to a patient identifier, so unique patients are not counted.'),
    blank('Patient Demand & Arrivals', 'New vs Returning Patients', 'The scenario does not flag a first visit versus a return.'),
    row('Patient Demand & Arrivals', 'Arrivals by Hour', 'Charted', 'constructed', 'Hourly counts are a fixed split of the period total. They are not a visit clock.'),
    row('Patient Demand & Arrivals', 'Arrivals by Day of Week', 'Charted', 'constructed', 'Weekday counts are a fixed split of the period total.'),
    row('Patient Demand & Arrivals', 'Peak Arrival Volume', peak ? `${peak.name} · ${num(peak.count)}` : 'Not in scenario', 'constructed', 'The busiest constructed hour inside the period total.'),
    row('Patient Demand & Arrivals', 'Arrival Mode Mix', input.modes.map((item) => `${item.name} ${num(item.count)}`).join(' · '), 'constructed', 'Walk-in, ambulance, transfer, and other are fixed shares of arrivals.'),
    row('Patient Demand & Arrivals', 'Ambulance Arrival Rate', pct(ambulance / arrivals), 'constructed', 'Ambulance count divided by arrivals. The share is constructed, not a mode extract.'),
    row('Patient Demand & Arrivals', 'ED Visit Growth Rate', input.priorArrivals ? pct(growth) : 'Not in scenario', 'scenario', 'Current arrivals minus the comparison period, divided by that comparison period.'),
    blank('Patient Demand & Arrivals', 'Unscheduled Arrival Rate', 'The scenario does not separate scheduled and unscheduled emergency visits.'),

    row('Triage & Acuity', 'Triage Completion Rate', pct(input.triageCompleted / arrivals), 'scenario', 'Arrivals minus patients who left before triage, divided by arrivals. Patients who left after triage remain in the triaged count.'),
    blank('Triage & Acuity', 'Arrival-to-Triage Time (P50/P90)', 'No triage timestamp exists. Door-to-provider is not used as a substitute.'),
    row('Triage & Acuity', 'ESI-1 Volume & Share', `${num(input.acuity[0] ?? 0)} · ${pct((input.acuity[0] ?? 0) / arrivals)}`, 'scenario', 'ESI-1 arrivals divided by all arrivals. ESI is assigned to every arrival.'),
    row('Triage & Acuity', 'ESI-2 Volume & Share', `${num(input.acuity[1] ?? 0)} · ${pct((input.acuity[1] ?? 0) / arrivals)}`, 'scenario', 'ESI-2 arrivals divided by all arrivals.'),
    row('Triage & Acuity', 'ESI-3 Volume & Share', `${num(input.acuity[2] ?? 0)} · ${pct((input.acuity[2] ?? 0) / arrivals)}`, 'scenario', 'ESI-3 arrivals divided by all arrivals.'),
    row('Triage & Acuity', 'ESI-4/5 Volume & Share', `${num(esi45)} · ${pct(esi45 / arrivals)}`, 'scenario', 'ESI-4 plus ESI-5, divided by all arrivals.'),
    blank('Triage & Acuity', 'Triage Reassessment Rate', 'No reassessment event is recorded.'),
    blank('Triage & Acuity', 'High-Acuity Waiting Volume', 'There is no point-in-time census of who is waiting.'),

    row('Waiting Times & Access', 'Door-to-Provider Median', `${num(input.median, 1)} minutes`, 'scenario', 'Period door-to-provider figure. It is not length of stay, not time to a disposition decision, and not the wait for an inpatient bed. It is not a percentile calculated from individual visit records.'),
    row('Waiting Times & Access', 'Door-to-Provider P90', `${num(input.p90, 1)} minutes`, 'scenario', 'Period 90th-percentile door-to-provider figure for the same arrivals. It is stored separately from the median and is not an average of monthly rates.'),
    blank('Waiting Times & Access', 'Door-to-Provider Target Compliance', 'A pass rate needs one time per visit. A median cannot say what share met a review line.'),
    blank('Waiting Times & Access', 'Waiting Patients Count', 'There is no census of patients waiting now.'),
    blank('Waiting Times & Access', 'Waiting Patients by Acuity', 'Waiting patients are not recorded by ESI.'),
    row('Waiting Times & Access', 'Waiting Time by Hour', 'Charted', 'constructed', 'The hourly pattern is drawn around the period median. It is not measured hour by hour.'),
    blank('Waiting Times & Access', 'Waiting Time by Shift', 'Shift waits are not measured. Staffing shifts are a separate FTE split.'),
    blank('Waiting Times & Access', 'Waiting Time by Provider Group', 'Visits are not attributed to a provider group.'),
    blank('Waiting Times & Access', 'Door-to-Treatment-Space Time', 'Time to a treatment space is not recorded. Door-to-provider is not reused.'),
    blank('Waiting Times & Access', 'Prolonged Waiting Rate', 'A prolonged-wait rate needs the visit distribution. The median and P90 do not provide it.'),

    row('Patient Flow & Throughput', 'ED Length of Stay P50', `${num(input.losMedian, 0)} minutes`, 'scenario', 'Period length-of-stay figure from arrival to leaving the department. Admitted and discharged stays are not separated. This is not a percentile of visit records.'),
    row('Patient Flow & Throughput', 'ED Length of Stay P90', `${num(input.losP90, 0)} minutes`, 'scenario', 'Period length-of-stay P90, stored separately from the P50 and from door-to-provider.'),
    blank('Patient Flow & Throughput', 'Time to Disposition Decision', 'No disposition-decision timestamp exists. It is not derived from length of stay or door-to-provider.'),
    row('Patient Flow & Throughput', 'ED Admission Rate', pct(input.admitted / arrivals), 'scenario', 'Emergency admissions divided by emergency arrivals.'),
    row('Patient Flow & Throughput', 'ED Discharge Rate', pct(input.discharged / arrivals), 'scenario', 'Emergency discharges divided by arrivals. Transfer and left-against-advice are not inside this count.'),
    blank('Patient Flow & Throughput', 'Transfer-Out Rate', 'Transfers out are not separated from discharge.'),
    row('Patient Flow & Throughput', 'Left Without Being Seen Rate', pct(input.left / arrivals), 'scenario', 'Left before triage plus left after triage, divided by arrivals.'),
    blank('Patient Flow & Throughput', 'Left Against Medical Advice Rate', 'Left against medical advice is not separated from other exits.'),
    row('Patient Flow & Throughput', 'ED Throughput per Treatment Space', input.bays ? num(input.arrivals / input.bays, 1) : 'Not in scenario', 'scenario', 'Arrivals divided by the scenario treatment-space count. That count is a capacity input, not observed occupancy.'),
    blank('Patient Flow & Throughput', 'Disposition-to-Departure Time', 'Departure after the disposition decision is not timed.'),
    blank('Patient Flow & Throughput', 'ED Census / Active Patients', 'There is no point-in-time emergency census.'),

    row('Boarding & Capacity', 'Boarded Patients Count', num(input.boarding), 'constructed', 'Implied by the boarding-beyond-4-hours rate applied to admissions. It is not a separate boarding census.'),
    row('Boarding & Capacity', 'Boarding Beyond 4 Hours Rate', pct(input.admitted ? input.boarding / input.admitted : 0), 'constructed', 'Admissions still in the department more than 4 hours after the admit decision, divided by emergency admissions.'),
    blank('Boarding & Capacity', 'Boarding Duration P50/P90', 'Boarding duration is not a distribution. The 4-hour rate is not a median or a P90.'),
    blank('Boarding & Capacity', 'Admit Decision-to-Bed Time', 'Time from the admit decision to bed assignment is not recorded. Length of stay is not reused.'),
    blank('Boarding & Capacity', 'ED Treatment Space Occupancy', 'Treatment-space occupancy is not observed.'),
    row('Boarding & Capacity', 'ED Treatment Space Availability', input.bays ? `${num(input.bays)} spaces listed` : 'Not in scenario', 'scenario', 'Scenario treatment-space count. How many are free now is not known.'),
    row('Boarding & Capacity', 'Inpatient Bed Availability', num(input.bedsAvailable), 'scenario', 'Hospital beds that are staffed, not occupied, and not blocked. These are not emergency bays.'),
    blank('Boarding & Capacity', 'Boarding Hours per Day', 'Boarding hours are not recorded.'),
    blank('Boarding & Capacity', 'Capacity Pressure Index (derived)', 'No index is calculated. Occupancy and boarding stay as separate figures.'),

    row('Workforce & Productivity', 'Required Emergency FTE', num(input.required), 'scenario', 'The requirements named this domain without item names. This row uses the annual required emergency FTE. A quarter does not create another staffing census.'),
    row('Workforce & Productivity', 'Filled Emergency FTE', num(input.filled), 'scenario', 'Annual filled emergency FTE.'),
    row('Workforce & Productivity', 'Staffing Coverage', input.required ? pct(input.filled / input.required) : 'Not in scenario', 'scenario', 'Filled FTE divided by required FTE. This is headcount coverage, not worked hours.'),
    row('Workforce & Productivity', 'FTE Vacancy Rate', input.required ? pct((input.required - input.filled) / input.required) : 'Not in scenario', 'scenario', 'Unfilled FTE divided by required FTE.'),
    row('Workforce & Productivity', 'Night Coverage', coverage(shift('Night')), 'constructed', 'Night FTE is a fixed share of the annual emergency total, not a roster.'),
    row('Workforce & Productivity', 'Day Coverage', coverage(shift('Day')), 'constructed', 'Day FTE is a fixed share of the annual emergency total.'),
    row('Workforce & Productivity', 'Evening Coverage', coverage(shift('Evening')), 'constructed', 'Evening FTE is a fixed share of the annual emergency total.'),
    row('Workforce & Productivity', 'Arrivals per Filled FTE', input.filled ? num(input.arrivals / input.filled, 1) : 'Not in scenario', 'scenario', 'Arrivals divided by filled emergency FTE. This is not a timed productivity study.'),

    row('Clinical Quality & Safety', 'Unplanned ED Return Within 72 Hours', pct(input.revisit / arrivals), 'constructed', 'A fixed 3.4% share of arrivals. The denominator is arrivals, not eligible discharges, and visits are not linked.'),
    blank('Clinical Quality & Safety', 'Return Visits Resulting in Admission', 'Return visits are not linked to a later admission.'),
    row('Clinical Quality & Safety', 'ED Mortality Count', num(input.deaths), 'scenario', 'Deaths in the emergency visit cohort. Deaths are not a fourth disposition.'),
    row('Clinical Quality & Safety', 'ED Mortality Rate', pct(input.deaths / arrivals), 'scenario', 'Deaths divided by the same emergency arrivals. The rate stays visible below 0.1%.'),
    blank('Clinical Quality & Safety', 'Time-to-ECG for Eligible Cases', 'No ECG timestamp or eligible cohort is recorded.'),
    blank('Clinical Quality & Safety', 'Time-to-Antibiotics for Eligible Sepsis Cases', 'No sepsis cohort or antibiotic timestamp is recorded.'),
    blank('Clinical Quality & Safety', 'Time-to-Treatment for Selected Time-Critical Pathways', 'No pathway clock is recorded.'),
    blank('Clinical Quality & Safety', 'Critical Result Acknowledgment Time', 'No critical-result event is recorded.'),
    blank('Clinical Quality & Safety', 'Adverse Event Rate', 'No adverse-event file is recorded.'),
    blank('Clinical Quality & Safety', 'Clinical Escalation Delay Rate', 'No escalation event is recorded. This page does not retriage patients.'),

    ...[1, 2, 3, 4, 5, 6].map((index) => blank(
      'Patient Experience',
      `Patient experience indicator ${index}`,
      'This domain was requested with six indicators. Item names were not provided, so no name is treated as specified and no value is shown.',
    )),
    ...[1, 2, 3, 4, 5, 6].map((index) => blank(
      'Operational Efficiency & Resources',
      `Operational efficiency indicator ${index}`,
      'This domain was requested with six indicators. Item names were not provided, so no name is treated as specified and no value is shown.',
    )),
  ];
}

export const AI_CASES: AiCase[] = [
  { id: 'AI-01', group: 'Demand', name: 'ED Arrival Forecasting', level: 'Predictive', inputs: 'Prior arrivals, hour, weekday, and season would be required.', analysis: 'The page can show the period arrival total and a constructed hourly shape.', limit: 'The next 4, 8, and 24 hours are not forecast. There is no visit-level clock to train or test a model.' },
  { id: 'AI-02', group: 'Demand', name: 'Crowding Early Warning', level: 'Predictive', inputs: 'Current census, waiting patients, beds, admissions, and arrivals would be required.', analysis: 'Open alerts compare door-to-provider and boarding with a hospital review line.', limit: 'A review-line alert is detection. It is not an early warning that crowding will occur.' },
  { id: 'AI-03', group: 'Demand', name: 'Capacity Demand Forecasting', level: 'Predictive', inputs: 'Arrival flow, service time, current patients, and expected exits would be required.', analysis: 'Filled FTE, required FTE, and available hospital beds are shown as the current position.', limit: 'The next shift’s capacity gap is not forecast.' },
  { id: 'AI-04', group: 'Demand', name: 'Boarding Risk Prediction', level: 'Predictive', inputs: 'Admit decisions, bed availability, expected discharges, and current waits would be required.', analysis: 'The current boarding-beyond-4-hours rate is an observed scenario figure.', limit: 'Future boarding is not predicted, and no escalation time is calculated.' },
  { id: 'AI-05', group: 'Flow', name: 'Waiting Time Prediction', level: 'Predictive', inputs: 'Acuity, queue position, and current pressure would be required for each waiting group.', analysis: 'Door-to-provider P50 and P90 describe the period, not the remaining wait of a current patient.', limit: 'Remaining wait is not predicted.' },
  { id: 'AI-06', group: 'Flow', name: 'Patient Flow Bottleneck Detection', level: 'Descriptive', inputs: 'Timestamps for triage, assessment, diagnostics, disposition, and bed assignment.', analysis: 'Door-to-provider and length of stay are the only timed stages. Triage, diagnostics, disposition, and bed wait are blank.', limit: 'The delayed stage is not identified. Missing clocks are not filled from the two timed stages.' },
  { id: 'AI-07', group: 'Flow', name: 'Staffing Optimization', level: 'Prescriptive', inputs: 'A roster, service times, and peak arrivals.', analysis: 'Required, filled, and shift FTE show the annual coverage gap.', limit: 'No shift simulation is run, and no staffing plan is optimized.' },
  { id: 'AI-08', group: 'Flow', name: 'Diagnostic Delay Intelligence', level: 'Descriptive', inputs: 'Laboratory and imaging order, completion, and result times linked to the visit.', analysis: 'Length of stay is visible, but it is not attributed to diagnostics.', limit: 'A diagnostic delay is not detected.' },
  { id: 'AI-09', group: 'Flow', name: 'Discharge & Admission Flow Optimization', level: 'Prescriptive', inputs: 'Disposition time, departure time, and bed-assignment time.', analysis: 'Admission, discharge, and left counts describe exits. Their clocks are separate and mostly absent.', limit: 'No discharge or admission step is selected for acceleration.' },
  { id: 'AI-10', group: 'Safety', name: 'High-Acuity Delay Detection', level: 'Descriptive', inputs: 'Arrival time, acuity, and first-provider time for ESI-1 and ESI-2.', analysis: 'ESI volumes are known. Their waits are not.', limit: 'No high-acuity delay is escalated from this scenario. Patients are not retriaged.' },
  { id: 'AI-11', group: 'Safety', name: 'Unplanned Return Visit Risk', level: 'Predictive', inputs: 'A linked discharge and an unplanned return within 72 hours.', analysis: 'The 72-hour figure is a fixed share of arrivals.', limit: 'It is not a patient-level risk and not a rate per eligible discharge. Clinical use would need an independent review.' },
  { id: 'AI-12', group: 'Safety', name: 'Safety & Quality Anomaly Detection', level: 'Descriptive', inputs: 'A stable history for mortality, returns, and critical-process times.', analysis: 'Door-to-provider and boarding alerts use fixed review lines.', limit: 'A rule alert is not an anomaly model. ECG, sepsis, and adverse-event series are absent.' },
  { id: 'AI-13', group: 'Safety', name: 'Patient Experience Risk Intelligence', level: 'Descriptive', inputs: 'Surveys, complaints, and communication times.', analysis: 'Experience indicators are named and left blank.', limit: 'No complaint or delay pattern is analyzed.' },
  { id: 'AI-14', group: 'Decisions', name: 'Root Cause Investigation Assistant', level: 'Descriptive', inputs: 'The related indicators for the open emergency signal.', analysis: 'Arrivals, boarding beyond 4 hours, and staffing coverage are associated signals.', limit: 'No calibrated forecast is produced. Continued demand is not converted into a predicted wait, and disposition time is not inferred from the wait.' },
  { id: 'AI-15', group: 'Decisions', name: 'What-if Scenario Simulator', level: 'Prescriptive', inputs: 'A service-time model and the change being tested, such as one more physician at peak.', analysis: 'The gap to the 60-minute review line can be stated as arithmetic.', limit: 'Adding staff is not converted into a predicted minute change. No scenario is simulated.' },
  { id: 'AI-16', group: 'Decisions', name: 'Management Recommendation Engine', level: 'Prescriptive', inputs: 'The open signal, its evidence, and a person who can accept the action.', analysis: 'The review action is to check provider coverage during the constructed peak hours.', limit: 'The action has an owner only after a person approves it. Expected impact is not calculated.' },
  { id: 'AI-17', group: 'Decisions', name: 'Decision Outcome Monitoring', level: 'Prescriptive', inputs: 'The same indicator before and after the approved action, with volume, acuity, and resources.', analysis: 'Approval state is stored for this hospital, year, and emergency signal.', limit: 'No post-implementation period exists. An approved decision does not create a measured result.' },
  { id: 'AI-18', group: 'Decisions', name: 'Emergency AI Copilot', level: 'Descriptive', inputs: 'The emergency indicators, evidence, and scenarios already on these pages.', analysis: 'Prepared questions return the observation, evidence, and review action in English.', limit: 'This is not a live language model. Questions outside the scenario stay unanswered.' },
];
