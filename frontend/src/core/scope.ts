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
  deaths: number;
  triageCompleted: number;
  median: number;
  p90: number;
  losMedian: number;
  losP90: number;
  boarding: number;
  revisit: number;
  modes: { name: string; count: number }[];
  acuity: number[];
};

export type AiCase = {
  id: string;
  name: string;
  level: 'Rule alert' | 'Pattern review' | 'Predictive';
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

export function indicatorsFor(input: ScopeInput): Indicator[] {
  const arrivals = input.arrivals || 1;
  const high = (input.acuity[0] ?? 0) + (input.acuity[1] ?? 0);
  const esi = [0, 1, 2, 3, 4].map((level) => `ESI-${level + 1} ${num(input.acuity[level] ?? 0)}`).join(' · ');
  return [
    row('ED Demand & Arrivals', 'Total ED Visits', num(input.arrivals), 'scenario', 'Emergency visits in the selected hospital and period.'),
    blank('ED Demand & Arrivals', 'Unique ED Patients', 'Visits are not linked to a patient identifier, so unique patients are not counted.'),
    row('ED Demand & Arrivals', 'Arrivals by Hour', 'Peak afternoon hours · see demand chart', 'constructed', 'Hourly counts are a fixed split of the period total. They are not a visit clock.'),
    row('ED Demand & Arrivals', 'Arrivals by Day', 'Weekday mix · see demand chart', 'constructed', 'Weekday counts are a fixed split of the period total.'),
    row('ED Demand & Arrivals', 'Arrival Mode (Walk-in / Ambulance / Transfer)', input.modes.map((item) => `${item.name} ${num(item.count)}`).join(' · '), 'constructed', 'Walk-in, ambulance, and transfer are fixed shares. Other is the remainder, so the counts still equal arrivals.'),
    row('ED Demand & Arrivals', 'High-Acuity Arrival Volume', `${num(high)} · ${pct(high / arrivals)}`, 'scenario', 'ESI-1 plus ESI-2. ESI is assigned to every arrival. This is not a count of patients waiting now.'),

    blank('ED Triage', 'Arrival-to-Triage Time — Median', 'No triage timestamp exists. Door-to-provider is not used as a substitute.'),
    blank('ED Triage', 'Arrival-to-Triage Time — P90', 'No triage timestamp exists. Door-to-provider P90 is not used as a substitute.'),
    row('ED Triage', 'Triage Acuity Distribution (ESI 1–5)', esi, 'scenario', 'The five ESI counts sum to arrivals.'),
    row('ED Triage', 'Triage Completion Rate', pct(input.triageCompleted / arrivals), 'scenario', 'Arrivals minus patients who left before triage, divided by arrivals. Patients who left after triage remain in the triaged count.'),
    blank('ED Triage', 'Triage Reassessment Rate', 'No reassessment event is recorded. Patients are not retriaged here.'),

    row('ED Waiting Times', 'Door-to-Provider Time — Median', `${num(input.median, 1)} minutes`, 'scenario', 'Period door-to-provider figure. It is not length of stay, not time to a disposition decision, and not boarding. It is not a percentile calculated from individual visit records.'),
    row('ED Waiting Times', 'Door-to-Provider Time — P90', `${num(input.p90, 1)} minutes`, 'scenario', 'Period 90th-percentile door-to-provider figure. It is stored separately from the median.'),
    blank('ED Waiting Times', 'Patients Waiting for Initial Assessment', 'There is no census of patients waiting now.'),
    blank('ED Waiting Times', 'Waiting Time by Acuity Level', 'Door-to-provider is not split by ESI.'),
    blank('ED Waiting Times', 'Prolonged Waiting Rate', 'A prolonged-wait rate needs one time per visit. The median and P90 do not provide it.'),
    blank('ED Waiting Times', 'Waiting-Time Target Compliance', 'A pass rate needs one time per visit. A median cannot say what share met the review line.'),

    row('ED Flow & Disposition', 'ED Length of Stay — Median', `${num(input.losMedian, 0)} minutes`, 'scenario', 'Period length of stay from arrival until the patient leaves the department. Admitted and discharged stays are not separated. This is not inpatient length of stay and not a percentile of visit records.'),
    row('ED Flow & Disposition', 'ED Length of Stay — P90', `${num(input.losP90, 0)} minutes`, 'scenario', 'Period length-of-stay P90, stored separately from the median and from door-to-provider.'),
    blank('ED Flow & Disposition', 'Arrival-to-Disposition Decision Time', 'No disposition-decision timestamp exists. It is not derived from length of stay or door-to-provider.'),
    row('ED Flow & Disposition', 'ED Admission Rate', pct(input.admitted / arrivals), 'scenario', 'Emergency visits with an admit decision divided by emergency visits. This is not inpatient bed occupancy.'),
    row('ED Flow & Disposition', 'ED Discharge Rate', pct(input.discharged / arrivals), 'scenario', 'Emergency visits discharged from the department divided by emergency visits.'),
    row('ED Flow & Disposition', 'Left Without Being Seen Rate', pct(input.left / arrivals), 'scenario', 'Left before triage plus left after triage, divided by arrivals.'),
    blank('ED Flow & Disposition', 'ED Boarding Duration — Median', 'Time still in the department after the admit decision is not a distribution. The share beyond 4 hours is not a median.'),
    row('ED Flow & Disposition', 'Boarding Beyond 4 Hours Rate', pct(input.admitted ? input.boarding / input.admitted : 0), 'constructed', 'Admitted visits still in the department more than 4 hours after the admit decision, divided by emergency admissions. The scenario rate moves with hospital occupancy, and occupancy itself is not shown.'),

    row('ED Quality & Outcomes', 'Unplanned 72-Hour ED Return Rate', pct(input.revisit / arrivals), 'constructed', 'A fixed 3.4% share of arrivals. The denominator is arrivals, not eligible discharges, and visits are not linked.'),
    blank('ED Quality & Outcomes', 'Return Visits Resulting in Admission', 'Return visits are not linked to a later admission.'),
    row('ED Quality & Outcomes', 'ED Mortality Count', num(input.deaths), 'scenario', 'Deaths in the emergency visit cohort. Deaths are not a fourth way of leaving, and they are not inpatient deaths.'),
    row('ED Quality & Outcomes', 'ED Mortality Rate', pct(input.deaths / arrivals), 'scenario', 'Deaths divided by the same emergency visits. The rate stays visible below 0.1%.'),
    blank('ED Quality & Outcomes', 'Left Against Medical Advice Rate', 'Left against medical advice is not separated from other exits.'),
  ];
}

export const AI_CASES: AiCase[] = [
  { id: 'AI-01', name: 'ED Arrival Forecasting', level: 'Predictive', inputs: 'A visit clock with hour, weekday, and season.', analysis: 'The page shows the period arrival total and a constructed hourly shape.', limit: 'The next hours are not forecast. There is no visit-level clock to train or test a model.' },
  { id: 'AI-02', name: 'ED Crowding Prediction', level: 'Predictive', inputs: 'A census of patients in the department, their stage, and expected exits.', analysis: 'Door-to-provider and boarding beyond 4 hours are observed period figures.', limit: 'Crowding is not predicted. A review-line alert is detection, not a forecast.' },
  { id: 'AI-03', name: 'Waiting Time Prediction', level: 'Predictive', inputs: 'One door-to-provider time per visit, plus the current queue.', analysis: 'The median and P90 describe the period, not the remaining wait of a patient who is here now.', limit: 'Remaining wait is not predicted.' },
  { id: 'AI-04', name: 'Triage Delay Detection', level: 'Rule alert', inputs: 'Arrival time and triage time, especially for ESI-1 and ESI-2.', analysis: 'Triage completion is known. Arrival-to-triage time is not.', limit: 'A triage delay is not detected, and patients are not retriaged.' },
  { id: 'AI-05', name: 'High-Acuity Waiting Alerts', level: 'Rule alert', inputs: 'Acuity and first-provider time for each high-acuity visit.', analysis: 'ESI-1 and ESI-2 volumes are known. Their waits are not. The open alert uses the all-visit door-to-provider median.', limit: 'The alert is not limited to high-acuity visits, and it does not reclassify patients.' },
  { id: 'AI-06', name: 'Patient Flow Bottleneck Detection', level: 'Pattern review', inputs: 'Timestamps for triage, first provider, disposition, and departure from the department.', analysis: 'Door-to-provider and length of stay are the only timed stages. Triage, disposition, and boarding duration are blank.', limit: 'The delayed stage is not identified. Missing clocks are not filled from the two timed stages.' },
  { id: 'AI-07', name: 'ED Length of Stay Prediction', level: 'Predictive', inputs: 'A length-of-stay time per visit, separated for admitted and discharged visits.', analysis: 'One period median and one P90 cover every visit.', limit: 'Length of stay is not predicted, and admitted stays are not separated from discharged stays.' },
  { id: 'AI-08', name: 'Boarding Delay Prediction', level: 'Predictive', inputs: 'The admit decision time and the time the visit leaves the department.', analysis: 'The share beyond 4 hours is an observed scenario figure.', limit: 'Future boarding is not predicted. Hospital bed occupancy is not an emergency indicator.' },
  { id: 'AI-09', name: 'ED Return Visit Risk Analysis', level: 'Pattern review', inputs: 'A linked discharge and an unplanned return within 72 hours.', analysis: 'The 72-hour figure is a fixed share of arrivals.', limit: 'It is not a patient-level risk and not a rate per eligible discharge. Clinical use would need an independent review.' },
  { id: 'AI-10', name: 'Vital Assist for Emergency Decisions', level: 'Pattern review', inputs: 'The emergency-visit indicators, alerts, and scenarios on these three screens.', analysis: 'Arrivals, door-to-provider, boarding beyond 4 hours, and left without being seen are the associated signals.', limit: 'No calibrated forecast is produced. A prepared answer is not a live model, and an approval is not a measured result.' },
];
