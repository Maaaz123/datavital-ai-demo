export type IndicatorStatus = 'scenario' | 'constructed' | 'unavailable';

export type Indicator = {
  domain: string;
  name: string;
  value: string;
  status: IndicatorStatus;
  method: string;
};

export type BedsScopeInput = {
  licensed: number | null;
  physical: number | null;
  operational: number;
  occupied: number;
  vacant: number;
  blocked: number;
  days: number;
  admissions: number;
  discharges: number;
  transfersIn: number;
  transfersOut: number;
  pendingRequests: number;
  unallocated: number;
  assignmentMedianMin: number;
  assignmentP90Min: number | null;
  assignmentCompleted: number;
  assignmentCancelled: number;
  cleaningAwaiting: number;
  maintenanceAwaiting: number;
  cleaningTurnaroundMin: number | null;
  vacancyDurationHours: number | null;
  dischargeToReadyMin: number | null;
  occupationDurationDays: number;
  reassignmentRate: number | null;
  expectedReleases: number;
  expectedDemand: number;
  projectedAvailable: number;
  shortfall: number;
  forecastAccuracy: number | null;
  wards: { id: string; staffed: number; occupied: number; available: number; blocked: number }[];
  bedTypes: { id: string; staffed: number; occupied: number; available: number; blocked: number }[];
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

export function bedsIndicatorsFor(input: BedsScopeInput): Indicator[] {
  const operational = input.operational || 1;
  const occRate = input.occupied / operational;
  const occupiedBedDays = input.occupied * input.days;
  const availableBedDays = input.operational * input.days;
  const averageDailyOcc = availableBedDays ? occupiedBedDays / availableBedDays : 0;
  const turnover = input.operational ? input.discharges / input.operational : 0;
  const completionDen = input.assignmentCompleted + input.assignmentCancelled || 1;
  const wardLine = input.wards.map((ward) => `${ward.id} ${pct(ward.staffed ? ward.occupied / ward.staffed : 0)}`).join(' · ');
  const typeLine = input.bedTypes.map((item) => `${item.id} ${pct(item.staffed ? item.occupied / item.staffed : 0)}`).join(' · ');

  return [
    input.licensed == null
      ? blank('Bed Inventory & Availability', 'Licensed Beds', 'Licensed capacity is not stored separately from operational beds. Staffed beds are not used as a licence count.')
      : row('Bed Inventory & Availability', 'Licensed Beds', num(input.licensed), 'scenario', 'Licensed bed count from the hospital register.'),
    input.physical == null
      ? blank('Bed Inventory & Availability', 'Physical Beds', 'Physical beds on the floor are not stored separately. A physical bed is not assumed to be operational.')
      : row('Bed Inventory & Availability', 'Physical Beds', num(input.physical), 'scenario', 'Physical beds present on the ward floor.'),
    row('Bed Inventory & Availability', 'Operational Beds', num(input.operational), 'scenario', 'Staffed beds available for allocation in the month-end snapshot. Physical presence alone does not make a bed operational.'),
    row('Bed Inventory & Availability', 'Occupied Beds', num(input.occupied), 'scenario', 'Occupied staffed beds in the same snapshot. Occupied + vacant + blocked = operational.'),
    row('Bed Inventory & Availability', 'Vacant Beds', num(input.vacant), 'scenario', 'Vacant staffed beds ready for allocation in the snapshot.'),
    row('Bed Inventory & Availability', 'Blocked / Closed Beds', num(input.blocked), 'scenario', 'Blocked or closed staffed beds in the same snapshot. They are not vacant and not occupied.'),

    row('Bed Occupancy', 'Current Bed Occupancy Rate', pct(occRate), 'scenario', 'Occupied ÷ operational beds at the snapshot. This is a point-in-time rate, not a sum of monthly averages.'),
    row('Bed Occupancy', 'Average Daily Occupancy Rate', pct(averageDailyOcc), 'constructed', 'Occupied bed-days ÷ available bed-days, using the snapshot census × period days. Monthly occupancy averages are not summed.'),
    row('Bed Occupancy', 'Occupied Bed-Days', num(occupiedBedDays), 'constructed', 'Snapshot occupied beds × days in the selected period. Not a sum of nightly census events.'),
    row('Bed Occupancy', 'Available Bed-Days', num(availableBedDays), 'constructed', 'Operational beds × days in the selected period.'),
    row('Bed Occupancy', 'Occupancy by Ward', wardLine || 'No wards', 'constructed', 'Ward staffed, occupied, vacant, and blocked split from the hospital snapshot.'),
    row('Bed Occupancy', 'Occupancy by Bed Type', typeLine || 'No bed types', 'constructed', 'General and ICU occupancy from the same snapshot. Emergency bays are not inpatient beds.'),

    row('Bed Allocation & Placement', 'Pending Bed Requests', num(input.pendingRequests), 'constructed', 'Open bed requests waiting for assignment. Built as a share of admissions, not an ED waitlist.'),
    row('Bed Allocation & Placement', 'Bed Assignment Time — Median', `${num(input.assignmentMedianMin, 0)} minutes`, 'constructed', 'Median request-to-assignment minutes. The figure rises with occupancy. It is not door-to-provider wait.'),
    input.assignmentP90Min == null
      ? blank('Bed Allocation & Placement', 'Bed Assignment Time — P90', 'No assignment-time distribution exists. The median is not used as a P90.')
      : row('Bed Allocation & Placement', 'Bed Assignment Time — P90', `${num(input.assignmentP90Min, 0)} minutes`, 'scenario', '90th-percentile request-to-assignment time.'),
    row('Bed Allocation & Placement', 'Unallocated Bed Requests', num(input.unallocated), 'constructed', 'Pending requests still without a bed after the review window.'),
    row('Bed Allocation & Placement', 'Bed Assignment Completion Rate', pct(input.assignmentCompleted / completionDen), 'constructed', 'Completed assignments ÷ completed plus cancelled assignments in the period.'),
    row('Bed Allocation & Placement', 'Bed Assignment Cancellation Rate', pct(input.assignmentCancelled / completionDen), 'constructed', 'Cancelled assignments ÷ completed plus cancelled assignments.'),

    row('Bed Turnover & Readiness', 'Bed Turnover Rate', num(turnover, 2), 'constructed', 'Discharges ÷ operational beds in the period. This is bed turnover, not staff turnover.'),
    input.vacancyDurationHours == null
      ? blank('Bed Turnover & Readiness', 'Bed Vacancy Duration', 'No vacant-bed clock exists. Vacant bed count is not a duration.')
      : row('Bed Turnover & Readiness', 'Bed Vacancy Duration', `${num(input.vacancyDurationHours, 1)} hours`, 'scenario', 'Median hours a vacant bed stays empty.'),
    input.cleaningTurnaroundMin == null
      ? blank('Bed Turnover & Readiness', 'Bed Cleaning Turnaround Time', 'Cleaning start and end times are not recorded. A cleaning count is not a turnaround clock.')
      : row('Bed Turnover & Readiness', 'Bed Cleaning Turnaround Time', `${num(input.cleaningTurnaroundMin, 0)} minutes`, 'scenario', 'Median minutes from cleaning start to ready.'),
    input.dischargeToReadyMin == null
      ? blank('Bed Turnover & Readiness', 'Discharge-to-Bed-Ready Time', 'Release time and ready time are not paired. Assignment median is not used as a substitute.')
      : row('Bed Turnover & Readiness', 'Discharge-to-Bed-Ready Time', `${num(input.dischargeToReadyMin, 0)} minutes`, 'scenario', 'Minutes from patient release to bed ready for the next assignment.'),
    row('Bed Turnover & Readiness', 'Beds Awaiting Cleaning', num(input.cleaningAwaiting), 'constructed', '60% of blocked beds in this story. The count stays inside the blocked total.'),
    row('Bed Turnover & Readiness', 'Beds Awaiting Maintenance', num(input.maintenanceAwaiting), 'constructed', 'Remaining blocked beds after the cleaning share. Not a work-order system extract.'),

    row('Bed Movement & Utilization', 'Bed Admissions', num(input.admissions), 'scenario', 'Inpatient admissions that occupy a bed. Emergency visits are not counted here.'),
    row('Bed Movement & Utilization', 'Bed Releases', num(input.discharges), 'scenario', 'Discharges that free a bed in the period.'),
    row('Bed Movement & Utilization', 'Internal Bed Transfers', num(input.transfersIn + input.transfersOut), 'scenario', 'Transfers in plus transfers out. Each move changes bed occupancy without a new admission.'),
    row('Bed Movement & Utilization', 'Bed Transfers by Ward', 'Charted', 'constructed', 'Ward-level transfer shares are a fixed split of internal transfers.'),
    row('Bed Movement & Utilization', 'Average Bed Occupation Duration', `${num(input.occupationDurationDays, 1)} days`, 'scenario', 'Inpatient length of stay median. This is bed occupation duration, not emergency length of stay.'),
    input.reassignmentRate == null
      ? blank('Bed Movement & Utilization', 'Bed Reassignment Rate', 'Bed-to-bed reassignment events are not recorded separately from ward transfers.')
      : row('Bed Movement & Utilization', 'Bed Reassignment Rate', pct(input.reassignmentRate), 'scenario', 'Reassignments ÷ bed admissions.'),

    row('Capacity Planning', 'Expected Bed Releases', num(input.expectedReleases), 'constructed', 'Illustrative next-day releases from the period discharge rate. Not a validated discharge model.'),
    row('Capacity Planning', 'Expected Bed Demand', num(input.expectedDemand), 'constructed', 'Illustrative next-day demand from the period admission rate. Not a demand forecast.'),
    row('Capacity Planning', 'Projected Available Beds', num(input.projectedAvailable), 'constructed', 'Vacant beds plus expected releases minus expected demand. A planning sketch, not a prediction.'),
    row('Capacity Planning', 'Capacity Shortfall', num(input.shortfall), 'constructed', 'Pending requests minus vacant beds when demand exceeds vacant capacity.'),
    input.forecastAccuracy == null
      ? blank('Capacity Planning', 'Bed Availability Forecast Accuracy', 'No prior forecast exists to score. A constructed projection is not an accuracy metric.')
      : row('Capacity Planning', 'Bed Availability Forecast Accuracy', pct(input.forecastAccuracy), 'scenario', 'Share of forecast hours within tolerance.'),
    row('Capacity Planning', 'Capacity Utilization by Bed Type', typeLine || 'No bed types', 'constructed', 'Occupied ÷ operational beds by General and ICU. Emergency bays stay outside this domain.'),
  ];
}

export const BEDS_AI_CASES: AiCase[] = [
  { id: 'AI-01', name: 'Bed Availability Forecasting', level: 'Predictive', inputs: 'Bed status history and expected releases over 4, 12, 24, and 48 hours.', analysis: 'The page shows a snapshot of vacant beds and a constructed next-day projection.', limit: 'Hourly availability is not forecast. A planning sketch is not a validated model.' },
  { id: 'AI-02', name: 'Bed Demand Forecasting', level: 'Predictive', inputs: 'Bed requests by type and ward with request timestamps.', analysis: 'Pending requests are a constructed share of admissions.', limit: 'Demand by ward and bed type is not forecast from a request clock.' },
  { id: 'AI-03', name: 'Capacity Shortage Early Warning', level: 'Rule alert', inputs: 'Vacant beds, blocked beds, and pending requests in one snapshot.', analysis: 'Shortfall is vacant beds versus pending requests when requests exceed vacant capacity.', limit: 'The warning is detection on the snapshot. It is not a lead-time forecast.' },
  { id: 'AI-04', name: 'Bed Allocation Optimization', level: 'Optimization', inputs: 'Open requests, vacant beds, isolation rules, and bed-type constraints.', analysis: 'Assignment completion and cancellation shares are constructed.', limit: 'No optimizer places a patient. Medical suitability stays under human review.' },
  { id: 'AI-05', name: 'Expected Bed Release Prediction', level: 'Predictive', inputs: 'Approved discharge plans and occupation duration.', analysis: 'Expected releases follow the period discharge rate.', limit: 'Individual discharge times are not predicted.' },
  { id: 'AI-06', name: 'Bed Turnover Optimization', level: 'Pattern review', inputs: 'Release time, cleaning start/end, and ready time per bed.', analysis: 'Cleaning and maintenance shares split the blocked count.', limit: 'Turnaround delay is not timed. Counts are not clocks.' },
  { id: 'AI-07', name: 'Ward Capacity Imbalance Detection', level: 'Pattern review', inputs: 'Occupancy by ward and bed type in one snapshot.', analysis: 'Ward and type occupancy are constructed splits of the hospital snapshot.', limit: 'Imbalance is visible as a chart, not scored as a model output.' },
  { id: 'AI-08', name: 'Blocked Bed Intelligence', level: 'Pattern review', inputs: 'Closure reason, start, and end for each blocked bed.', analysis: 'Blocked beds are known. Cleaning versus maintenance is a fixed split.', limit: 'Closure reasons are not classified beyond the constructed split.' },
  { id: 'AI-09', name: 'What-if Capacity Simulation', level: 'Optimization', inputs: 'Operational beds, blocked beds, and turnaround assumptions.', analysis: 'Projected available beds react when vacant, blocked, or release assumptions change in the story.', limit: 'Opening or closing beds is not simulated as a live policy engine.' },
  { id: 'AI-10', name: 'Bed Management Copilot', level: 'Pattern review', inputs: 'The bed indicators, alerts, and scenarios on these three screens.', analysis: 'Occupancy, blocked beds, pending requests, and shortfall are the associated signals.', limit: 'No calibrated forecast is produced. A prepared answer is not a live model, and an approval is not a measured result.' },
];
