import { scenarioFor } from '@/showcase/facts';
import { buildOpdView } from './opdView';
import { splitExact } from './ipdView';
import { sumKey, type ReportPeriod } from './period';

const SPECIALTIES = ['Medicine', 'Surgery', 'Cardiology', 'Orthopedics', 'Women', 'Children', 'Dermatology', 'Ophthalmology'];
/** Booking mix — demand concentrates slightly differently from offered templates. */
const SPECIALTY_BOOK_WEIGHTS = [0.22, 0.14, 0.12, 0.1, 0.12, 0.08, 0.12, 0.1];
/** Bookable capacity mix — deliberately not identical to booking mix so fill rates vary. */
const SPECIALTY_SLOT_WEIGHTS = [0.2, 0.15, 0.13, 0.11, 0.12, 0.09, 0.11, 0.09];
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

function daysInPeriod(period: ReportPeriod, year: number): number {
  if (period === 'year') return year % 4 === 0 ? 366 : 365;
  return 91;
}

/** Enforce booked[i] ≤ slots[i] while preserving totals. */
function clampBookedToSlots(bookedParts: number[], slotParts: number[]): number[] {
  const next = bookedParts.map((booked, index) => Math.min(booked, slotParts[index]));
  let deficit = bookedParts.reduce((sum, value) => sum + value, 0) - next.reduce((sum, value) => sum + value, 0);
  let guard = 0;
  while (deficit > 0 && guard < 40) {
    const room = next.map((booked, index) => Math.max(0, slotParts[index] - booked));
    const roomTotal = room.reduce((sum, value) => sum + value, 0);
    if (roomTotal <= 0) break;
    for (let index = 0; index < next.length && deficit > 0; index += 1) {
      if (room[index] <= 0) continue;
      const add = Math.min(room[index], Math.max(1, Math.round((room[index] / roomTotal) * deficit)));
      next[index] += add;
      deficit -= add;
    }
    guard += 1;
  }
  return next;
}

/**
 * Third-next-available from an ordered illustrative list of future eligible openings.
 * Observation date = last day of the selected reporting period (illustrative schedule, not a live extract).
 */
export function thirdNextAvailableDays(
  observationLabel: string,
  specialtyPressure: number,
  hospitalTilt: number,
): { days: number; openings: number[]; observationDate: string } {
  const base = 7 + specialtyPressure * 8 + hospitalTilt * 40;
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

/**
 * Allocate mutually exclusive outcomes across a partition of booked so
 * attended + cancelled + no-show = booked in every bin and globals match.
 */
export function allocateOutcomePartition(
  bookedParts: number[],
  attendedTotal: number,
  cancelledTotal: number,
  noShowTotal: number,
  noShowTilt: number[] = bookedParts.map((_, index) => 1 + index * 0.12),
): { booked: number; attended: number; cancelled: number; noShow: number }[] {
  const bookedTotal = bookedParts.reduce((sum, value) => sum + value, 0);
  if (bookedTotal <= 0) {
    return bookedParts.map(() => ({ booked: 0, attended: 0, cancelled: 0, noShow: 0 }));
  }
  const noShowWeights = bookedParts.map((booked, index) => Math.max(0.01, booked * noShowTilt[index]));
  const noShowParts = splitExact(noShowTotal, noShowWeights).map((value, index) => Math.min(value, bookedParts[index]));
  const remainAfterNoShow = bookedParts.map((booked, index) => Math.max(0, booked - noShowParts[index]));
  const cancelWeights = remainAfterNoShow.map((remain) => Math.max(0.01, remain));
  const cancelParts = splitExact(cancelledTotal, cancelWeights).map((value, index) => Math.min(value, remainAfterNoShow[index]));
  const attendedParts = bookedParts.map((booked, index) => Math.max(0, booked - noShowParts[index] - cancelParts[index]));

  // Absorb tiny rounding drift into the largest attended bin.
  const attendedDrift = attendedTotal - attendedParts.reduce((sum, value) => sum + value, 0);
  if (attendedDrift !== 0) {
    const pivot = attendedParts.indexOf(Math.max(...attendedParts));
    attendedParts[pivot] = Math.max(0, attendedParts[pivot] + attendedDrift);
  }

  return bookedParts.map((booked, index) => ({
    booked,
    attended: attendedParts[index],
    cancelled: cancelParts[index],
    noShow: noShowParts[index],
  }));
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
  const periodDays = daysInPeriod(period, year);

  const slots = sumKey(rows, 'apptSlots');
  const demand = sumKey(rows, 'apptDemand');
  const booked = sumKey(rows, 'apptBooked');
  const cancelled = sumKey(rows, 'apptCancelled');
  const noShow = sumKey(rows, 'apptNoShow');
  const attended = sumKey(rows, 'apptAttended');
  // Identity from scenario facts: attended + cancelled + no-show = booked; booked ≤ slots.
  const unbookedSlots = Math.max(0, slots - booked);
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

  // Booking lead time: request/booking timestamp → scheduled visit date (not OPD clinic wait).
  const leadMedian = Math.round((9.5 + pressure * 18) * 10) / 10;
  const leadP90 = Math.round((leadMedian * 2.15 + pressure * 8) * 10) / 10;
  const leadAvg = Math.round((leadMedian * 1.2) * 10) / 10;
  const reminderCoverage = Math.round((0.68 + pressure * 0.05) * 1000) / 1000;

  const cancelTiming = [
    { name: '>7 days before', share: 0.35 },
    { name: '2–7 days before', share: 0.28 },
    { name: 'Same day / <48h', share: 0.25 },
    { name: 'After start window', share: 0.12 },
  ];
  const cancelTimingCounts = splitExact(cancelled, cancelTiming.map((item) => item.share))
    .map((count, index) => ({ name: cancelTiming[index].name, count }));
  const lateCancellations = cancelTimingCounts[2].count; // Same day / <48h
  const afterStartCancellations = cancelTimingCounts[3].count;
  const lateCancelRate = booked ? lateCancellations / booked : 0;
  const lateCancelShare = cancelled ? lateCancellations / cancelled : 0;

  /**
   * Recovery lifecycle:
   * Cancelled → slot released before start → eligible for rebooking → waitlist match → confirmed rebook → recovered.
   * No-shows do not release early enough to rebook. After-start cancellations never released beforehand.
   */
  const releasedSlots = Math.max(0, cancelled - afterStartCancellations);
  const eligibleReleasedSlots = cancelTimingCounts[0].count + cancelTimingCounts[1].count
    + Math.round(lateCancellations * 0.2); // a minority of late cancels still rebookable
  const recoveredSlots = Math.min(
    eligibleReleasedSlots,
    Math.round(eligibleReleasedSlots * (0.48 + pressure * 0.12)),
  );
  const unfilledReleasedSlots = Math.max(0, releasedSlots - recoveredSlots);
  const recoveryRate = eligibleReleasedSlots ? recoveredSlots / eligibleReleasedSlots : 0;
  /** Illustrative additional confirmed bookings under improved outreach — not equal to unfilled. */
  const estimatedAdditionalRecoveries = Math.min(
    unfilledReleasedSlots,
    Math.round(unfilledReleasedSlots * (0.32 + pressure * 0.08)),
  );

  const slotsUnusedAtAppointment = noShow;
  const residualCapacityLoss = slotsUnusedAtAppointment + unfilledReleasedSlots;
  const lostBookedSlots = noShow + lateCancellations; // unused at/near appointment time without successful early recovery

  const eligibleWaitlist = Math.min(waitlistDemand, Math.round(waitlistDemand * (0.42 + pressure * 0.2)));
  const potentialRebookingOpportunities = Math.min(
    eligibleWaitlist,
    unfilledReleasedSlots + Math.round(unbookedSlots * 0.3),
  );

  const capacityShortfall = Math.max(0, demand - slots);
  const clinicSessions = Math.max(1, Math.round(attended / Math.max(11.2 + pressure * 1.6, 1)));
  const sessionsWithPressure = Math.max(1, Math.round(clinicSessions * (0.18 + pressure)));

  // Deterministic illustrative 7-day open-slot snapshot after observation — not annual vacancies ÷ 365.
  const baseDailyOpen = Math.max(2, Math.round(clinicSessions / Math.max(periodDays / 7, 1) * (0.35 + (1 - slotFillRate) * 2)));
  const dayMultipliers = [0.45, 1.2, 1.25, 1.2, 1.25, 1.05, 0.5];
  const futureOpenSlots = dayMultipliers.map((multiplier, index) => ({
    name: WEEKDAYS[(index + 1) % 7],
    count: Math.max(0, Math.round(baseDailyOpen * multiplier * (1 + pressure * 0.4))),
  }));
  const next7DayOpenSlots = futureOpenSlots.reduce((sum, item) => sum + item.count, 0);

  let specialtySlots = splitExact(slots, SPECIALTY_SLOT_WEIGHTS);
  let specialtyBooked = clampBookedToSlots(splitExact(booked, SPECIALTY_BOOK_WEIGHTS), specialtySlots);
  // If clamping reduced booked total, nudge the largest roomy specialty back up without exceeding slots.
  const bookedDrift = booked - specialtyBooked.reduce((sum, value) => sum + value, 0);
  if (bookedDrift !== 0) {
    specialtyBooked = clampBookedToSlots(
      specialtyBooked.map((value, index) => (index === specialtyBooked.indexOf(Math.min(...specialtyBooked)) ? value + bookedDrift : value)),
      specialtySlots,
    );
  }
  const specialtyOutcome = allocateOutcomePartition(
    specialtyBooked,
    attended,
    cancelled,
    noShow,
    specialtyBooked.map((_, index) => 1 + index * 0.1),
  );
  const specialtyReleased = splitExact(releasedSlots, specialtyOutcome.map((item) => Math.max(0.01, item.cancelled)));
  const specialtyRecovered = splitExact(recoveredSlots, specialtyReleased.map((value) => Math.max(0.01, value)))
    .map((value, index) => Math.min(value, specialtyReleased[index]));

  const specialties = SPECIALTIES.map((id, index) => {
    const tna = thirdNextAvailableDays(observationDate, 0.4 + index * 0.08, pressure);
    const lead = Math.round((leadMedian * (0.85 + index * 0.05)) * 10) / 10;
    const specialtySlotCount = specialtySlots[index];
    const specialtyBookedCount = specialtyOutcome[index].booked;
    const fill = specialtySlotCount ? specialtyBookedCount / specialtySlotCount : 0;
    const lateShare = Math.round(specialtyOutcome[index].cancelled * lateCancelShare);
    return {
      id,
      booked: specialtyBookedCount,
      attended: specialtyOutcome[index].attended,
      noShow: specialtyOutcome[index].noShow,
      cancelled: specialtyOutcome[index].cancelled,
      slots: specialtySlotCount,
      unbooked: Math.max(0, specialtySlotCount - specialtyBookedCount),
      noShowRate: specialtyBookedCount ? specialtyOutcome[index].noShow / specialtyBookedCount : 0,
      leadMedian: lead,
      thirdNextDays: tna.days,
      thirdNextOpenings: tna.openings,
      slotFillRate: fill,
      released: specialtyReleased[index],
      recovered: specialtyRecovered[index],
      unfilledReleased: Math.max(0, specialtyReleased[index] - specialtyRecovered[index]),
      lostSlots: specialtyOutcome[index].noShow + lateShare,
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
  const monthlyDemand = rows.map((row) => row.month.apptDemand);
  const monthlyAttended = rows.map((row) => row.month.apptAttended);
  const monthlyNoShow = rows.map((row) => row.month.apptNoShow);
  const monthlyCancelled = rows.map((row) => row.month.apptCancelled);
  const monthlySlots = rows.map((row) => row.month.apptSlots);
  const monthlyLead = monthlyBooked.map((_, index) => Math.round((leadMedian + ((index % 4) - 1.5) * 0.4) * 10) / 10);
  const monthlyReleased = monthlyCancelled.map((value) => Math.round(value * (1 - 0.12))); // exclude after-start share
  const monthlyEligibleReleased = monthlyCancelled.map((value) => Math.round(value * (0.35 + 0.28 + 0.25 * 0.2)));
  const monthlyRecovered = monthlyEligibleReleased.map((eligible, index) => Math.min(
    monthlyReleased[index],
    Math.round(eligible * (0.48 + pressure * 0.12)),
  ));
  const monthlyRecovery = monthlyEligibleReleased.map((eligible, index) => (
    eligible ? Math.round((monthlyRecovered[index] / eligible) * 1000) / 1000 : 0
  ));

  const dayWeights = [0.06, 0.17, 0.18, 0.17, 0.18, 0.16, 0.08];
  const dayBooked = splitExact(booked, dayWeights);
  const dayOutcomes = allocateOutcomePartition(dayBooked, attended, cancelled, noShow);
  const outcomesByDay = WEEKDAYS.map((name, index) => ({
    name,
    booked: dayOutcomes[index].booked,
    attended: dayOutcomes[index].attended,
    noShow: dayOutcomes[index].noShow,
    cancelled: dayOutcomes[index].cancelled,
  }));

  const leadBands = [
    { name: '0–7 days', share: 0.28 },
    { name: '8–14 days', share: 0.34 },
    { name: '15–28 days', share: 0.24 },
    { name: '>28 days', share: 0.14 },
  ];
  const leadBandBooked = splitExact(booked, leadBands.map((item) => item.share));
  const leadOutcomes = allocateOutcomePartition(
    leadBandBooked,
    attended,
    cancelled,
    noShow,
    leadBandBooked.map((_, index) => 1 + index * 0.18),
  );
  const outcomeByLead = leadBands.map((band, index) => ({
    name: band.name,
    booked: leadOutcomes[index].booked,
    attended: leadOutcomes[index].attended,
    noShow: leadOutcomes[index].noShow,
    cancelled: leadOutcomes[index].cancelled,
  }));

  const opd = buildOpdView(hospital, year, period);
  const scenarioFillCap = Math.min(0.995, slotFillRate + 0.1);

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
    /** Period unbooked capacity (slots − booked). Not “available now”. */
    unbookedSlots,
    /** @deprecated alias kept for gradual call-site updates */
    availableSlots: unbookedSlots,
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
    afterStartCancellations,
    lostBookedSlots,
    slotsUnusedAtAppointment,
    residualCapacityLoss,
    reminderCoverage,
    releasedSlots,
    eligibleReleasedSlots,
    recoveredSlots,
    recoveryRate,
    unfilledReleasedSlots,
    /** @deprecated alias */
    unfilledRecoverable: unfilledReleasedSlots,
    estimatedAdditionalRecoveries,
    /** @deprecated alias */
    estimatedRecoverable: estimatedAdditionalRecoveries,
    eligibleWaitlist,
    potentialRebookingOpportunities,
    /** @deprecated alias */
    rebookingOpportunities: potentialRebookingOpportunities,
    next7DayOpenSlots,
    /** @deprecated alias */
    next7DayAvailable: next7DayOpenSlots,
    capacityShortfall,
    /** @deprecated alias */
    capacityGap: capacityShortfall,
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
    monthlyDemand,
    monthlyAttended,
    monthlyNoShow,
    monthlyCancelled,
    monthlySlots,
    monthlyLead,
    monthlyRecovery,
    monthlyReleased,
    monthlyRecovered,
    scenarioFillRate: scenarioFillCap,
    opdAttended: opd.visits,
    opdWalkInShare: opd.walkInShare,
    integrationNote: 'Appointment attended equals OPD attended visits for the same hospital and period. OPD walk-in share describes booking pathway inside that attended cohort, not unscheduled arrivals outside appointments.',
  };
}

export type AppointmentView = ReturnType<typeof buildAppointmentView>;
