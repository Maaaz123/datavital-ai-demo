import { describe, expect, it } from 'vitest';
import { HOSPITALS, YEARS } from '@/showcase/engine';
import { answerQuestion } from '@/showcase/assistant';
import { runWhatIf } from '@/showcase/whatIf';
import { alertsFor } from './alerts';
import { allocateOutcomePartition, buildAppointmentView, thirdNextAvailableDays } from './appointmentView';
import { buildOpdView } from './opdView';

const PERIODS = ['year', 'Q1', 'Q2', 'Q3', 'Q4'] as const;

describe('Appointment scenario reconciles', () => {
  it('keeps outcome identity and OPD attended match for all hospitals and years', () => {
    for (const hospital of HOSPITALS) {
      for (const year of YEARS) {
        for (const period of PERIODS) {
          const view = buildAppointmentView(hospital.code, year, period);
          const opd = buildOpdView(hospital.code, year, period);
          expect(view.attended + view.cancelled + view.noShow).toBe(view.booked);
          expect(view.attended).toBe(opd.visits);
          expect(view.opdAttended).toBe(opd.visits);
          expect(view.booked).toBeLessThanOrEqual(view.slots);
          expect(view.unbookedSlots).toBe(view.slots - view.booked);
          expect(view.recoveredSlots).toBeLessThanOrEqual(view.eligibleReleasedSlots);
          expect(view.recoveredSlots).toBeLessThanOrEqual(view.releasedSlots);
          expect(view.unfilledReleasedSlots).toBe(view.releasedSlots - view.recoveredSlots);
          expect(view.newAppointments + view.followUpAppointments).toBe(view.booked);
          expect(view.specialties.reduce((sum, item) => sum + item.booked, 0)).toBe(view.booked);
          expect(view.specialties.reduce((sum, item) => sum + item.attended, 0)).toBe(view.attended);
          expect(view.specialties.reduce((sum, item) => sum + item.noShow, 0)).toBe(view.noShow);
          expect(view.specialties.reduce((sum, item) => sum + item.cancelled, 0)).toBe(view.cancelled);
          expect(view.specialties.reduce((sum, item) => sum + item.slots, 0)).toBe(view.slots);
          expect(view.specialties.every((item) => item.booked <= item.slots)).toBe(true);
          expect(view.specialties.every((item) => item.unbooked >= 0)).toBe(true);
          expect(view.channels.reduce((sum, item) => sum + item.count, 0)).toBe(view.booked);
          expect(view.cancelTimingCounts.reduce((sum, item) => sum + item.count, 0)).toBe(view.cancelled);
          expect(view.outcomeByLead.reduce((sum, item) => sum + item.booked, 0)).toBe(view.booked);
          expect(view.outcomeByLead.reduce((sum, item) => sum + item.attended, 0)).toBe(view.attended);
          expect(view.outcomeByLead.reduce((sum, item) => sum + item.noShow, 0)).toBe(view.noShow);
          expect(view.outcomeByLead.reduce((sum, item) => sum + item.cancelled, 0)).toBe(view.cancelled);
          expect(view.outcomesByDay.reduce((sum, item) => sum + item.booked, 0)).toBe(view.booked);
          expect(view.outcomesByDay.reduce((sum, item) => sum + item.attended + item.cancelled + item.noShow, 0)).toBe(view.booked);
          expect(view.monthlyBooked.reduce((sum, value) => sum + value, 0)).toBe(view.booked);
          expect(view.monthlyDemand.reduce((sum, value) => sum + value, 0)).toBe(view.demand);
          expect(view.futureOpenSlots.reduce((sum, item) => sum + item.count, 0)).toBe(view.next7DayOpenSlots);
          expect(view.releasedSlots + view.afterStartCancellations).toBe(view.cancelled);
          expect(view.estimatedAdditionalRecoveries).toBeLessThanOrEqual(view.unfilledReleasedSlots);
          expect(view.attended).toBeGreaterThanOrEqual(0);
          expect(view.noShow).toBeGreaterThanOrEqual(0);
          expect(view.cancelled).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('sums quarterly booking flows to the full year', () => {
    for (const hospital of HOSPITALS.slice(0, 3)) {
      for (const year of YEARS) {
        const annual = buildAppointmentView(hospital.code, year, 'year');
        const quarters = (['Q1', 'Q2', 'Q3', 'Q4'] as const).map((period) => buildAppointmentView(hospital.code, year, period));
        expect(quarters.reduce((sum, item) => sum + item.booked, 0)).toBe(annual.booked);
        expect(quarters.reduce((sum, item) => sum + item.attended, 0)).toBe(annual.attended);
        expect(quarters.reduce((sum, item) => sum + item.noShow, 0)).toBe(annual.noShow);
        expect(quarters.reduce((sum, item) => sum + item.cancelled, 0)).toBe(annual.cancelled);
        expect(quarters.reduce((sum, item) => sum + item.slots, 0)).toBe(annual.slots);
        expect(annual.noShowRate).toBeCloseTo(annual.booked ? annual.noShow / annual.booked : 0, 10);
        expect(annual.slotFillRate).toBeCloseTo(annual.slots ? annual.booked / annual.slots : 0, 10);
      }
    }
  });

  it('builds third next available from ordered openings', () => {
    const result = thirdNextAvailableDays('31 Dec 2026', 0.7, 0.08);
    expect(result.observationDate).toBe('31 Dec 2026');
    expect(result.openings).toHaveLength(5);
    expect([...result.openings].sort((a, b) => a - b)).toEqual(result.openings);
    expect(result.days).toBe(result.openings[2]);
    expect(result.days).not.toBe(result.openings[0] * 3);
    expect(result.days).toBeGreaterThan(result.openings[0]);
    expect(result.days).toBeLessThan(result.openings[4]);
  });

  it('allocates outcome partitions that reconcile to globals', () => {
    const parts = allocateOutcomePartition([100, 80, 60, 40], 224, 36, 20, [1, 1.1, 1.2, 1.3]);
    expect(parts.reduce((sum, item) => sum + item.booked, 0)).toBe(280);
    expect(parts.reduce((sum, item) => sum + item.attended, 0)).toBe(224);
    expect(parts.reduce((sum, item) => sum + item.cancelled, 0)).toBe(36);
    expect(parts.reduce((sum, item) => sum + item.noShow, 0)).toBe(20);
    expect(parts.every((item) => item.attended + item.cancelled + item.noShow === item.booked)).toBe(true);
  });

  it('varies specialty fill rates instead of cloning one utilization', () => {
    const view = buildAppointmentView('H1', 2026, 'year');
    const fills = view.specialties.map((item) => Math.round(item.slotFillRate * 1000) / 1000);
    expect(new Set(fills).size).toBeGreaterThan(1);
    expect(view.next7DayOpenSlots).toBeGreaterThan(10);
    expect(view.next7DayOpenSlots).not.toBe(Math.round(view.unbookedSlots * (7 / 365)));
  });

  it('supports six appointment what-if sketches with conserved constraints', () => {
    const noshow = runWhatIf('Appointments', 'H1', 2026, { kind: 'appt-noshow-down', amount: 0.2 }, 'year');
    expect(noshow.estimated).toMatch(/No-show Rate near|additional attended/i);
    expect(noshow.assumptions).toMatch(/not automatic|Assumes|Illustrative|baseline/i);

    const fill = runWhatIf('Appointments', 'H1', 2026, { kind: 'appt-fill-up', amount: 0.1 }, 'year');
    expect(fill.estimated).toMatch(/Fill near|additional bookings/i);

    const lead = runWhatIf('Appointments', 'H1', 2026, { kind: 'appt-lead-down', amount: 0.2 }, 'year');
    expect(lead.estimated).toMatch(/Median lead near/i);

    const recover = runWhatIf('Appointments', 'H1', 2026, { kind: 'appt-recover-half', amount: 0.5 }, 'year');
    expect(recover.estimated).toMatch(/rebooked near|additional recoveries/i);
    expect(recover.estimated).toMatch(/≤ eligible released|still ≤ eligible released/i);

    const demand = runWhatIf('Appointments', 'H1', 2026, { kind: 'appt-demand-up', amount: 0.15 }, 'year');
    expect(demand.estimated).toMatch(/additional requests|unscheduled demand/i);

    const redistribute = runWhatIf('Appointments', 'H1', 2026, { kind: 'appt-redistribute', amount: 0.1 }, 'year');
    expect(redistribute.estimated).toMatch(/remains|conserved|slot total/i);
    expect(redistribute.change).toMatch(/conserved/i);
  });

  it('raises appointment alerts without calling healthy fill a low-fill crisis', () => {
    const alerts = alertsFor('H1', 2026).filter((alert) => alert.department === 'Appointments');
    expect(alerts.length).toBeGreaterThanOrEqual(4);
    expect(alerts.some((alert) => /no-show/i.test(alert.title))).toBe(true);
    const fill = alerts.find((alert) => alert.kpi === 'kpi_appointment_slot_fill_rate');
    expect(fill).toBeTruthy();
    if (fill && fill.severity !== 'info') {
      expect(fill.title).toMatch(/Low slot fill/i);
    }
    // 98% fill must not appear as an active low-fill priority signal.
    const active = alerts.filter((alert) => alert.severity !== 'info');
    expect(active.every((alert) => !(alert.kpi === 'kpi_appointment_slot_fill_rate' && /98|0\.98/.test(alert.observed)))).toBe(true);
    expect(alerts.every((alert) => /Management threshold|management threshold|Critical at/i.test(alert.threshold) || alert.threshold.length > 0)).toBe(true);

    const noshow = answerQuestion('Which specialties have the highest no-show rates?', 'H1', 2026, 'Appointments', 'en', 'Q2');
    expect(noshow.title).toMatch(/No-show|Q2|2026/i);
    const access = answerQuestion('What is causing appointment access pressure?', 'H1', 2026, 'Appointments', 'en', 'year');
    expect(access.observation + access.evidence).toMatch(/lead|Third Next|not OPD/i);
    const recovery = answerQuestion('How many slots were released and recovered?', 'H1', 2026, 'Appointments', 'en', 'year');
    expect(recovery.observation).toMatch(/Released|Rebooked|Unfilled Released/i);
  });
});
