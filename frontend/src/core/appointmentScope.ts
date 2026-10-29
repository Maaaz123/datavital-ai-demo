import type { AppointmentView } from './appointmentView';

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

export function appointmentIndicatorsFor(view: AppointmentView): Indicator[] {
  return [
    row('Booking Demand', 'Scheduled Appointments', num(view.booked), 'scenario', 'Booked appointments in the selected hospital and period. Attended + Cancelled + No-show = Scheduled.'),
    row('Booking Demand', 'Appointment Demand', num(view.demand), 'scenario', 'Requested appointment demand. Unscheduled demand = Demand − Booked.'),
    row('Booking Demand', 'New Appointment Share', pct(view.newShare), 'constructed', 'New appointments as a share of booked. New + Follow-up = Scheduled.'),
    row('Booking Demand', 'Follow-up Appointment Share', pct(view.followUpShare), 'constructed', 'Follow-up appointments as the remainder of booked after new appointments.'),
    row('Booking Demand', 'Rescheduled Appointments', num(view.rescheduled), 'constructed', 'Reschedule events in the period. Not an outcome partition of attended/cancelled/no-show.'),

    row('Appointment Outcomes', 'Attended Appointments', num(view.attended), 'scenario', 'Attended scheduled appointments. Equals OPD attended visits for the same hospital and period.'),
    row('Appointment Outcomes', 'Attendance Rate', pct(view.attendanceRate), 'scenario', 'Attended ÷ Scheduled.'),
    row('Appointment Outcomes', 'No-show Appointments', num(view.noShow), 'scenario', 'No-shows in the booked cohort.'),
    row('Appointment Outcomes', 'No-show Rate', pct(view.noShowRate), 'scenario', 'No-shows ÷ Scheduled.'),
    row('Appointment Outcomes', 'Cancelled Appointments', num(view.cancelled), 'scenario', 'Cancellations in the booked cohort.'),
    row('Appointment Outcomes', 'Cancellation Rate', pct(view.cancellationRate), 'scenario', 'Cancellations ÷ Scheduled.'),

    row('Access & Availability', 'Median Booking Lead Time', `${num(view.leadMedian, 1)} days`, 'constructed', 'Median days from booking/request to scheduled visit. Not OPD clinic waiting after arrival.'),
    row('Access & Availability', 'P90 Booking Lead Time', `${num(view.leadP90, 1)} days`, 'constructed', '90th-percentile booking lead time.'),
    row('Access & Availability', 'Third Next Available Appointment', `${num(view.thirdNextAvailable)} days`, 'constructed', `Third eligible routine opening from ordered illustrative openings. Observation date ${view.observationDate}.`),
    row('Access & Availability', 'First Next Available Appointment', `${num(view.firstNextAvailable)} days`, 'constructed', `First eligible opening from the same ordered list. Observation date ${view.observationDate}.`),
    row('Access & Availability', 'Unscheduled Appointment Demand', num(view.waitlistDemand), 'scenario', 'Unbooked demand = Demand − Booked.'),

    row('Scheduling Capacity', 'Bookable Slots', num(view.slots), 'scenario', 'Eligible bookable slots in the period.'),
    row('Scheduling Capacity', 'Booked Slots', num(view.booked), 'scenario', 'Booked slots (same count as scheduled appointments in this scenario).'),
    row('Scheduling Capacity', 'Unbooked Slots', num(view.unbookedSlots), 'scenario', 'Bookable − Booked. Period unbooked capacity — not a live “available now” queue.'),
    row('Scheduling Capacity', 'Slot Fill Rate', pct(view.slotFillRate), 'scenario', 'Booked Slots ÷ Bookable Slots.'),
    row('Scheduling Capacity', 'Capacity Shortfall', num(view.capacityShortfall), 'constructed', 'max(0, Demand − Bookable Slots). Unmet demand, not unbooked capacity.'),
    row('Scheduling Capacity', 'High-Pressure Clinic Sessions', num(view.sessionsWithPressure), 'constructed', 'Illustrative sessions under scheduling pressure.'),
    row('Scheduling Capacity', 'Next 7-Day Open Slots', num(view.next7DayOpenSlots), 'constructed', `Deterministic illustrative openings after ${view.observationDate}. Not historical vacancies ÷ 365.`),

    row('Cancellation & No-show', 'Late Cancellation Rate', pct(view.lateCancelRate), 'constructed', 'Same-day / <48h cancellations ÷ Scheduled.'),
    row('Cancellation & No-show', 'Slots Lost to No-shows & Late Cancellations', num(view.lostBookedSlots), 'constructed', 'No-shows + late cancellations. Distinct from early-released slots that may still be recovered.'),
    row('Cancellation & No-show', 'Appointment Reminder Coverage', pct(view.reminderCoverage), 'constructed', 'Illustrative reminder coverage share of booked appointments. Not causal evidence.'),
    blank('Cancellation & No-show', 'Repeat No-show Share', 'Patient-linked repeat no-show cohorts are not stored. Visits are not linked patient-by-patient.'),

    row('Recovery & Optimization', 'Released Appointment Slots', num(view.releasedSlots), 'constructed', 'Slots released before start from cancellations with advance notice. No-shows do not release early.'),
    row('Recovery & Optimization', 'Eligible Released Slots', num(view.eligibleReleasedSlots), 'constructed', 'Released slots with enough notice to attempt rebooking.'),
    row('Recovery & Optimization', 'Rebooked Released Slots', num(view.recoveredSlots), 'constructed', 'Released slots with a confirmed replacement booking. Recovered ≤ eligible released.'),
    row('Recovery & Optimization', 'Slot Recovery Rate', pct(view.recoveryRate), 'constructed', 'Rebooked ÷ Eligible Released Slots.'),
    row('Recovery & Optimization', 'Eligible Waitlist Candidates', num(view.eligibleWaitlist), 'constructed', 'Waitlist patients matching appointment availability.'),
    row('Recovery & Optimization', 'Potential Rebooking Opportunities', num(view.potentialRebookingOpportunities), 'constructed', 'Feasible candidate–slot matches before openings expire.'),
    row('Recovery & Optimization', 'Unfilled Released Slots', num(view.unfilledReleasedSlots), 'constructed', 'Released − Rebooked.'),
    row('Recovery & Optimization', 'Estimated Additional Recoveries', num(view.estimatedAdditionalRecoveries), 'constructed', 'Illustrative additional confirmed bookings under improved outreach — not identical to unfilled released.'),

    blank('Clinical Flow Context', 'Clinic Arrival-to-Provider Time', 'Owned by Outpatient. Appointments covers booking access, not post-arrival clinic waiting.'),
  ];
}

export const APPOINTMENT_AI_CASES: AiCase[] = [
  {
    id: 'APT-AI-01',
    name: 'High No-show Detection',
    level: 'Rule alert',
    inputs: 'No-show Rate, specialty no-show bars, lead-time bands.',
    analysis: 'Flags specialties where No-show Rate exceeds the management threshold.',
    limit: 'Does not infer demographic or clinical causes.',
  },
  {
    id: 'APT-AI-02',
    name: 'Access Lead-Time Watch',
    level: 'Pattern review',
    inputs: 'Median/P90 Booking Lead Time, Third Next Available Appointment.',
    analysis: 'Highlights prolonged booking access pressure.',
    limit: 'Lead time is not OPD clinic waiting after arrival.',
  },
  {
    id: 'APT-AI-03',
    name: 'Slot Fill Optimization',
    level: 'Optimization',
    inputs: 'Slot Fill Rate, Unbooked Slots, Unscheduled Appointment Demand.',
    analysis: 'Sketches fill improvement subject to capacity.',
    limit: 'Illustrative only — not a validated scheduler.',
  },
  {
    id: 'APT-AI-04',
    name: 'Late-Cancel Recovery',
    level: 'Rule alert',
    inputs: 'Released Appointment Slots, Rebooked Released Slots, Unfilled Released Slots.',
    analysis: 'Surfaces recoverable capacity from early-notice cancellations.',
    limit: 'A released slot is not recovered until rebooked. No-shows do not release early.',
  },
  {
    id: 'APT-AI-05',
    name: 'Specialty Template Review',
    level: 'Pattern review',
    inputs: 'Specialty fill, Third Next Available, Capacity Shortfall.',
    analysis: 'Points to specialties needing template or outreach review.',
    limit: 'Does not auto-change clinic templates.',
  },
  {
    id: 'APT-AI-06',
    name: 'Demand Surge What-if',
    level: 'Predictive',
    inputs: 'Demand, Bookable Slots, Booking Lead Time, No-show Rate.',
    analysis: 'Illustrates outcomes when demand or no-show rates change.',
    limit: 'Not a calibrated forecast.',
  },
];
