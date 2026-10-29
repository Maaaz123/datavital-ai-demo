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
    row('Booking Demand', 'Scheduled Appointments', num(view.booked), 'scenario', 'Booked appointments in the selected hospital and period. Attended + cancelled + no-show = booked.'),
    row('Booking Demand', 'Appointment Demand', num(view.demand), 'scenario', 'Requested appointment demand. Unbooked demand = demand − booked.'),
    row('Booking Demand', 'New Appointment Share', pct(view.newShare), 'constructed', 'New appointments as a share of booked. New + follow-up = booked.'),
    row('Booking Demand', 'Follow-up Appointment Share', pct(view.followUpShare), 'constructed', 'Follow-up appointments as the remainder of booked after new appointments.'),
    row('Booking Demand', 'Rescheduled Appointments', num(view.rescheduled), 'constructed', 'Reschedule events in the period. Not an outcome partition of attended/cancelled/no-show.'),

    row('Appointment Outcomes', 'Attended Appointments', num(view.attended), 'scenario', 'Attended scheduled appointments. Equals OPD attended visits for the same hospital and period.'),
    row('Appointment Outcomes', 'Attendance Rate', pct(view.attendanceRate), 'scenario', 'Attended ÷ booked.'),
    row('Appointment Outcomes', 'No-show Appointments', num(view.noShow), 'scenario', 'No-shows in the booked cohort.'),
    row('Appointment Outcomes', 'No-show Rate', pct(view.noShowRate), 'scenario', 'No-shows ÷ booked.'),
    row('Appointment Outcomes', 'Cancelled Appointments', num(view.cancelled), 'scenario', 'Cancellations in the booked cohort.'),
    row('Appointment Outcomes', 'Cancellation Rate', pct(view.cancellationRate), 'scenario', 'Cancellations ÷ booked.'),

    row('Access & Availability', 'Median Booking Lead Time', `${num(view.leadMedian, 1)} days`, 'constructed', 'Median days from booking/request to scheduled visit. Not OPD clinic waiting after arrival.'),
    row('Access & Availability', 'P90 Booking Lead Time', `${num(view.leadP90, 1)} days`, 'constructed', '90th-percentile booking lead time.'),
    row('Access & Availability', 'Third Next Available Appointment', `${num(view.thirdNextAvailable)} days`, 'constructed', `Third eligible routine opening from ordered future slots. Observation date ${view.observationDate}.`),
    row('Access & Availability', 'First Next Available Appointment', `${num(view.firstNextAvailable)} days`, 'constructed', `First eligible opening from the same ordered list. Observation date ${view.observationDate}.`),
    row('Access & Availability', 'Waitlist Demand', num(view.waitlistDemand), 'scenario', 'Unbooked demand = demand − booked.'),

    row('Scheduling Capacity', 'Total Eligible Appointment Slots', num(view.slots), 'scenario', 'Offered bookable slots in the period.'),
    row('Scheduling Capacity', 'Booked Slots', num(view.booked), 'scenario', 'Booked slots (same count as scheduled appointments in this scenario).'),
    row('Scheduling Capacity', 'Available Slots', num(view.availableSlots), 'scenario', 'Slots − booked. Non-negative; booked does not exceed slots.'),
    row('Scheduling Capacity', 'Slot Fill Rate', pct(view.slotFillRate), 'scenario', 'Booked ÷ eligible slots.'),
    row('Scheduling Capacity', 'Capacity Gap', num(view.capacityGap), 'constructed', 'Demand above offered slots when demand exceeds slots.'),
    row('Scheduling Capacity', 'Sessions With Scheduling Pressure', num(view.sessionsWithPressure), 'constructed', 'Illustrative sessions under scheduling pressure.'),
    row('Scheduling Capacity', 'Next 7-Day Available Capacity', num(view.next7DayAvailable), 'constructed', `Illustrative open capacity sketch after ${view.observationDate}.`),

    row('Cancellation & No-show', 'Late Cancellation Rate', pct(view.lateCancelRate), 'constructed', 'Late cancellations ÷ booked (late = 25% of cancellations in this scenario).'),
    row('Cancellation & No-show', 'Lost Booked Slots', num(view.lostBookedSlots), 'constructed', 'No-shows + late cancellations.'),
    row('Cancellation & No-show', 'Reminder Coverage', pct(view.reminderCoverage), 'constructed', 'Illustrative reminder coverage share of booked appointments.'),
    blank('Cancellation & No-show', 'Repeat No-show Share', 'Patient-linked repeat no-show cohorts are not stored. Visits are not linked patient-by-patient.'),

    row('Recovery & Optimization', 'Released Appointment Slots', num(view.releasedSlots), 'constructed', 'Slots released from cancellations and a share of no-shows.'),
    row('Recovery & Optimization', 'Recovered Slots', num(view.recoveredSlots), 'constructed', 'Released slots successfully rebooked. Recovered ≤ released.'),
    row('Recovery & Optimization', 'Slot Recovery Rate', pct(view.recoveryRate), 'constructed', 'Recovered ÷ released.'),
    row('Recovery & Optimization', 'Eligible Waitlist Candidates', num(view.eligibleWaitlist), 'constructed', 'Waitlist demand capped by available and recoverable openings.'),
    row('Recovery & Optimization', 'Rebooking Opportunities', num(view.rebookingOpportunities), 'constructed', 'Eligible waitlist candidates that can fill recoverable or open slots.'),
    row('Recovery & Optimization', 'Unfilled Recoverable Slots', num(view.unfilledRecoverable), 'constructed', 'Released − recovered.'),
    row('Recovery & Optimization', 'Estimated Recoverable Capacity', num(view.estimatedRecoverable), 'constructed', 'Same as unfilled recoverable in this scenario — capacity not yet rebooked.'),

    blank('Clinical Flow Context', 'Clinic Arrival-to-Provider Time', 'Owned by Outpatient. Appointments covers booking access, not post-arrival clinic waiting.'),
  ];
}

export const APPOINTMENT_AI_CASES: AiCase[] = [
  {
    id: 'APT-AI-01',
    name: 'High No-show Detection',
    level: 'Rule alert',
    inputs: 'No-show rate, specialty no-show bars, lead-time bands.',
    analysis: 'Flags specialties where no-show share exceeds the review line.',
    limit: 'Does not infer demographic or clinical causes.',
  },
  {
    id: 'APT-AI-02',
    name: 'Access Lead-Time Watch',
    level: 'Pattern review',
    inputs: 'Median/P90 lead time, third-next-available openings.',
    analysis: 'Highlights prolonged booking access pressure.',
    limit: 'Lead time is not OPD clinic waiting after arrival.',
  },
  {
    id: 'APT-AI-03',
    name: 'Slot Fill Optimization',
    level: 'Optimization',
    inputs: 'Slot fill rate, available slots, waitlist demand.',
    analysis: 'Sketches fill improvement subject to capacity.',
    limit: 'Illustrative only — not a validated scheduler.',
  },
  {
    id: 'APT-AI-04',
    name: 'Late-Cancel Recovery',
    level: 'Rule alert',
    inputs: 'Released slots, recovered slots, unfilled recoverable.',
    analysis: 'Surfaces recoverable capacity from cancellations.',
    limit: 'A released slot is not recovered until rebooked.',
  },
  {
    id: 'APT-AI-05',
    name: 'Specialty Template Review',
    level: 'Pattern review',
    inputs: 'Specialty fill, third-next-available, demand gap.',
    analysis: 'Points to specialties needing template or outreach review.',
    limit: 'Does not auto-change clinic templates.',
  },
  {
    id: 'APT-AI-06',
    name: 'Demand Surge What-if',
    level: 'Predictive',
    inputs: 'Demand, slots, lead time, no-show.',
    analysis: 'Illustrates outcomes when demand or no-show rates change.',
    limit: 'Not a calibrated forecast.',
  },
];
