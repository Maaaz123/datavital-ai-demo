import { scenarioFor } from '@/showcase/facts';
import { buildOpdView } from './opdView';
import { splitExact } from './ipdView';
import { sumKey, type ReportPeriod } from './period';

const SPECIALTIES = ['Medicine', 'Surgery', 'Cardiology', 'Orthopedics', 'Women', 'Children', 'Dermatology', 'Ophthalmology'];
const SPECIALTY_WEIGHTS = [0.22, 0.14, 0.12, 0.1, 0.12, 0.08, 0.12, 0.1];
const CHANNELS = ['Phone', 'Portal', 'Walk-in desk', 'Referral office'];
const CHANNEL_WEIGHTS = [0.38, 0.32, 0.12, 0.18];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function periodRows(hospital: string, year: number, period: 'Q1' | 'Q2' | 'Q3' | 'Q4') {
  const start = { Q1: 0, Q2: 3, Q3: 6, Q4: 9 }[period];
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return scenarioFor(hospital, year).months.slice(start, start + 3).map((month, index) => ({ label: names[start + index], month }));
}

function tilt(hospital: string, year: number): number {
  const fact = scenarioFor(hospital, year).focus;
  const occ = fact.staffedBeds ? fact.occupiedBeds / fact.staffedBeds : 0.8;
  return Math.min(0.12, Math.max(0, occ - 0.78));
}

/**
 * Third-next-available from an ordered illustrative list of future eligible openings.
 * Observation date = last day of the selected reporting period.
 */
export function thirdNextAvailableDays(
  observationLabel: string,
  specialtyPressure: number,
  hospitalTilt: number,
): { days: number; openings: number[]; observationDate: string } {
  const base = 7 + specialtyPressure * 8 + hospitalTilt * 40;
  // Ordered future openings in calendar days from observation (routine eligible slots only).
  const openings = [
    Math.round(base * 0.55),
    Math.round(base * 0.78),
    Math.round(base * 1.05),
    Math.round(base * 1.35),
    Math.round(base * 1.7),
  ].map((value, index) => Math.max(1, value + index));
  const sorted = [...openings].sort((a, b) => a - b);
  return {
    days: sorted[2],
    openings: sorted,
    observationDate: observationLabel,
  };
}

/** Shared Appointment scenario for screens, Vital Assist, alerts, and what-if. */
export function buildAppointmentView(hospital: string, year: number, period: ReportPeriod = 'year') {
  const rows = period === 'year'
    ? scenarioFor(hospital, year).months.map((month, index) => ({
      label: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index],
      month,
    }))
    : periodRows(hospital, year, period);
  const pressure = tilt(hospital, year);
  const periodLabel = period === 'year' ? `Full year ${year}` : `${period} ${year}`;
  const observationDate = period === 'year'
    ? `31 Dec ${year}`
    : ({ Q1: `31 Mar ${year}`, Q2: `30 Jun ${year}`, Q3: `30 Sep ${year}`, Q4: `31 Dec ${year}` } as const)[period];

  const slots = sumKey(rows, 'apptSlots');
  const demand = sumKey(rows, 'apptDemand');
  const booked = sumKey(rows, 'apptBooked');
  const cancelled = sumKey(rows, 'apptCancelled');
  const noShow = sumKey(rows, 'apptNoShow');
  const attended = sumKey(rows, 'apptAttended');
  // Identity from scenario facts: attended + cancelled + no-show = booked; booked ≤ slots.
  const availableSlots = Math.max(0, slots - booked);
  const slotFillRate = slots ? booked / slots : 0;
  const attendanceRate = booked ? attended / booked : 0;
  const noShowRate = booked ? noShow / booked : 0;
  const cancellationRate = booked ? cancelled / booked : 0;
  const waitlistDemand = Math.max(0, demand - booked);
  const rescheduled = Math.round(booked * (0.07 + pressure * 0.04));
  const newShare = 0.38;
  const followUpShare = 1 - newShare;
  const newAppointments = Math.round(booked * newShare);
  const followUpAppointments = Math.max(0, booked - newAppointments);

  const leadMedian = Math.round((9.5 + pressure * 18) * 10) / 10;
  const leadP90 = Math.round((leadMedian * 2.15 + pressure * 8) * 10) / 10;
  const leadAvg = Math.round((leadMedian * 1.2) * 10) / 10;
  const lateCancelShare = 0.25;
  const lateCancellations = Math.round(cancelled * lateCancelShare);
  const lateCancelRate = booked ? lateCancellations / booked : 0;
  const lostBookedSlots = noShow + lateCancellations;
  const reminderCoverage = Math.round((0.68 + pressure * 0.05) * 1000) / 1000;

  const releasedSlots = Math.round(cancelled * 0.85 + noShow * 0.15);
  const recoveredSlots = Math.min(releasedSlots, Math.round(releasedSlots * (0.42 + pressure * 0.15)));
  const recoveryRate = releasedSlots ? recoveredSlots / releasedSlots : 0;
  const unfilledRecoverable = Math.max(0, releasedSlots - recoveredSlots);
  const eligibleWaitlist = Math.min(waitlistDemand, Math.round(availableSlots + unfilledRecoverable * 0.6));
  const rebookingOpportunities = Math.min(eligibleWaitlist, unfilledRecoverable + Math.round(availableSlots * 0.35));
  const estimatedRecoverable = unfilledRecoverable;

  // Next-7-day capacity sketch from remaining unbooked share of period slots (illustrative snapshot).
  const next7DayAvailable = Math.max(0, Math.round(availableSlots * (period === 'year' ? 7 / 365 : 7 / 91)));
  const capacityGap = Math.max(0, demand - slots);
  const clinicSessions = Math.max(1, Math.round(attended / Math.max(11.2 + pressure * 1.6, 1)));
  const sessionsWithPressure = Math.max(1, Math.round(clinicSessions * (0.18 + pressure)));

  const specialtyBooked = splitExact(booked, SPECIALTY_WEIGHTS);
  const specialtyAttended = splitExact(attended, SPECIALTY_WEIGHTS);
  const specialtyNoShow = splitExact(noShow, SPECIALTY_WEIGHTS);
  const specialtyCancelled = splitExact(cancelled, SPECIALTY_WEIGHTS);
  const specialtySlots = splitExact(slots, SPECIALTY_WEIGHTS);
  const specialtyReleased = splitExact(releasedSlots, SPECIALTY_WEIGHTS);
  const specialtyRecovered = splitExact(recoveredSlots, SPECIALTY_WEIGHTS);

  const specialties = SPECIALTIES.map((id, index) => {
    const tna = thirdNextAvailableDays(observationDate, 0.4 + index * 0.08, pressure);
    const lead = Math.round((leadMedian * (0.85 + index * 0.05)) * 10) / 10;
    const fill = specialtySlots[index] ? specialtyBooked[index] / specialtySlots[index] : 0;
    return {
      id,
      booked: specialtyBooked[index],
      attended: specialtyAttended[index],
      noShow: specialtyNoShow[index],
      cancelled: specialtyCancelled[index],
      slots: specialtySlots[index],
      available: Math.max(0, specialtySlots[index] - specialtyBooked[index]),
      noShowRate: specialtyBooked[index] ? specialtyNoShow[index] / specialtyBooked[index] : 0,
      leadMedian: lead,
      thirdNextDays: tna.days,
      thirdNextOpenings: tna.openings,
      slotFillRate: fill,
      released: specialtyReleased[index],
      recovered: specialtyRecovered[index],
      lostSlots: specialtyNoShow[index] + Math.round(specialtyCancelled[index] * lateCancelShare),
      accessPressure: lead / Math.max(leadMedian, 1) + (1 - fill),
    };
  });

  const hospitalTna = thirdNextAvailableDays(observationDate, 0.7, pressure);
  const thirdNextAvailable = hospitalTna.days;
  const firstNextAvailable = hospitalTna.openings[0];

  const channels = splitExact(booked, CHANNEL_WEIGHTS).map((count, index) => ({
    id: CHANNELS[index],
    count,
  }));

  const monthlyBooked = rows.map((row) => row.month.apptBooked);
  const monthlyAttended = rows.map((row) => row.month.apptAttended);
  const monthlyNoShow = rows.map((row) => row.month.apptNoShow);
  const monthlyCancelled = rows.map((row) => row.month.apptCancelled);
  const monthlySlots = rows.map((row) => row.month.apptSlots);
  const monthlyLead = monthlyBooked.map((_, index) => Math.round((leadMedian + ((index % 4) - 1.5) * 0.4) * 10) / 10);
  const monthlyRecovery = monthlyCancelled.map((value, index) => {
    const released = Math.round(value * 0.85 + monthlyNoShow[index] * 0.15);
    return released ? Math.round((Math.min(released, Math.round(released * (0.42 + pressure * 0.15))) / released) * 1000) / 1000 : 0;
  });

  const dayWeights = [0.06, 0.17, 0.18, 0.17, 0.18, 0.16, 0.08];
  const outcomesByDay = WEEKDAYS.map((name, index) => {
    const dayBooked = splitExact(booked, dayWeights)[index];
    const dayAttended = splitExact(attended, dayWeights)[index];
    const dayNoShow = splitExact(noShow, dayWeights)[index];
    const dayCancelled = Math.max(0, dayBooked - dayAttended - dayNoShow);
    return { name, booked: dayBooked, attended: dayAttended, noShow: dayNoShow, cancelled: dayCancelled };
  });

  const cancelTiming = [
    { name: '>7 days before', share: 0.35 },
    { name: '2–7 days before', share: 0.28 },
    { name: 'Same day / <48h', share: 0.25 },
    { name: 'After start window', share: 0.12 },
  ];
  const cancelTimingCounts = splitExact(cancelled, cancelTiming.map((item) => item.share))
    .map((count, index) => ({ name: cancelTiming[index].name, count }));

  // Outcome by lead-time band — mutually exclusive partition of booked.
  const leadBands = [
    { name: '0–7 days', share: 0.28 },
    { name: '8–14 days', share: 0.34 },
    { name: '15–28 days', share: 0.24 },
    { name: '>28 days', share: 0.14 },
  ];
  const leadBandBooked = splitExact(booked, leadBands.map((item) => item.share));
  const outcomeByLead = leadBands.map((band, index) => {
    const bandBooked = leadBandBooked[index];
    // Longer lead → slightly higher no-show in the scenario.
    const noShowTilt = 0.04 + index * 0.02;
    const bandNoShow = Math.min(bandBooked, Math.round(bandBooked * noShowTilt));
    const bandCancel = Math.min(bandBooked - bandNoShow, Math.round(bandBooked * cancellationRate));
    const bandAttended = Math.max(0, bandBooked - bandNoShow - bandCancel);
    return { name: band.name, booked: bandBooked, attended: bandAttended, noShow: bandNoShow, cancelled: bandCancel };
  });

  const futureOpenByDay = Array.from({ length: 7 }, (_, index) => ({
    name: WEEKDAYS[(index + 1) % 7],
    count: splitExact(next7DayAvailable * 4, [0.12, 0.16, 0.16, 0.16, 0.16, 0.14, 0.1])[index],
  }));
  // Scale future open sketch so week sum ≈ next7DayAvailable * illustrative multi-slot days.
  const futureSum = futureOpenByDay.reduce((sum, item) => sum + item.count, 0) || 1;
  const futureOpenSlots = futureOpenByDay.map((item) => ({
    name: item.name,
    count: Math.round(item.count * (next7DayAvailable / futureSum)),
  }));

  const opd = buildOpdView(hospital, year, period);

  return {
    hospital,
    year,
    period,
    periodLabel,
    observationDate,
    slots,
    demand,
    booked,
    cancelled,
    noShow,
    attended,
    availableSlots,
    slotFillRate,
    attendanceRate,
    noShowRate,
    cancellationRate,
    waitlistDemand,
    rescheduled,
    newAppointments,
    followUpAppointments,
    newShare,
    followUpShare,
    leadMedian,
    leadP90,
    leadAvg,
    lateCancellations,
    lateCancelRate,
    lateCancelShare,
    lostBookedSlots,
    reminderCoverage,
    releasedSlots,
    recoveredSlots,
    recoveryRate,
    unfilledRecoverable,
    eligibleWaitlist,
    rebookingOpportunities,
    estimatedRecoverable,
    next7DayAvailable,
    capacityGap,
    sessionsWithPressure,
    thirdNextAvailable,
    firstNextAvailable,
    thirdNextOpenings: hospitalTna.openings,
    specialties,
    channels,
    outcomesByDay,
    cancelTimingCounts,
    outcomeByLead,
    futureOpenSlots,
    labels: rows.map((row) => row.label),
    monthlyBooked,
    monthlyAttended,
    monthlyNoShow,
    monthlyCancelled,
    monthlySlots,
    monthlyLead,
    monthlyRecovery,
    monthlyReleased: monthlyCancelled.map((value, index) => Math.round(value * 0.85 + monthlyNoShow[index] * 0.15)),
    monthlyRecovered: monthlyCancelled.map((value, index) => {
      const released = Math.round(value * 0.85 + monthlyNoShow[index] * 0.15);
      return Math.min(released, Math.round(released * (0.42 + pressure * 0.15)));
    }),
    /** OPD attended visits for the same hospital/period — must equal Appointment attended. */
    opdAttended: opd.visits,
    opdWalkInShare: opd.walkInShare,
    integrationNote: 'Appointment attended equals OPD attended visits for the same hospital and period. OPD walk-in share describes booking pathway inside that attended cohort, not unscheduled arrivals outside appointments.',
  };
}

export type AppointmentView = ReturnType<typeof buildAppointmentView>;
