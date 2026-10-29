import { useMemo, useState, type ReactNode } from 'react';
import { useShowcase } from '@/showcase/state';
import { alertsFor } from './alerts';
import { APPOINTMENT_AI_CASES, appointmentIndicatorsFor, type Indicator } from './appointmentScope';
import { buildAppointmentView, type AppointmentView } from './appointmentView';
import { useCopilot } from './Copilot';
import { usePeriod } from './period';
import { Chart, ChartStage, type Figure } from './viz';

const PALETTE = ['#0f6e6a', '#1e3a5f', '#8c6a3d', '#4d6b8a', '#6e8b74', '#7c5c7a'];

type Detail = { name: string; value: string; definition: string; scope: string };
type Tone = 'good' | 'watch' | 'alert' | 'neutral';
type View = AppointmentView;

function useView(): View {
  const store = useShowcase();
  const { period } = usePeriod();
  return useMemo(() => buildAppointmentView(store.hospital, store.year, period), [store.hospital, store.year, period]);
}

function usePrior(): View {
  const store = useShowcase();
  const { period } = usePeriod();
  const year = store.year <= 2024 ? 2024 : store.year - 1;
  return useMemo(() => buildAppointmentView(store.hospital, year, period), [store.hospital, year, period]);
}

function num(value: number, digits = 0): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function pct(value: number): string {
  const shown = value * 100;
  if (shown !== 0 && Math.abs(shown) < 0.1) return `${shown.toFixed(3)}%`;
  return `${shown.toFixed(1)}%`;
}

function compare(view: View, prior: View, pick: (item: View) => number, asRate = false): string {
  const now = pick(view);
  const then = pick(prior);
  if (!Number.isFinite(now) || !Number.isFinite(then) || then === 0) return 'Scenario share';
  const delta = asRate ? now - then : (now - then) / Math.abs(then);
  if (Math.abs(delta) < 0.005) return 'No change vs baseline';
  const label = asRate ? `${(delta * 100).toFixed(1)} pts` : `${(delta * 100).toFixed(1)}%`;
  return `${delta > 0 ? '+' : ''}${label}`;
}

function Page({ title, kpis, children }: { title: string; kpis: { name: string; value: string; delta: string; tone?: Tone; testId?: string; detail: Detail }[]; children: ReactNode }) {
  const [open, setOpen] = useState<Detail | null>(null);
  return (
    <article className="gc-command gc-ed">
      <header className="gc-command-head">
        <div>
          <p className="gc-kicker">Appointments & Scheduling</p>
          <h1>{title}</h1>
        </div>
      </header>
      <div className="gc-ribbon" data-testid="appt-ribbon">
        {kpis.map((item, index) => (
          <button
            type="button"
            className={`gc-score gc-tone-${item.tone ?? 'neutral'}`}
            key={item.name}
            data-testid={item.testId}
            style={{ animationDelay: `${index * 45}ms` }}
            onClick={() => setOpen(item.detail)}
          >
            <span>{item.name}</span>
            <strong className="gc-ltr">{item.value}</strong>
            <em>{item.delta}</em>
          </button>
        ))}
      </div>
      {open ? (
        <section className="gc-panel gc-fit" data-testid="kpi-detail">
          <h2>{open.name}</h2>
          <p>{open.value}. {open.definition}</p>
          <p>{open.scope}</p>
          <button type="button" className="gc-text-btn" onClick={() => setOpen(null)}>Close detail</button>
        </section>
      ) : null}
      <div className="gc-dense gc-ed-body">{children}</div>
    </article>
  );
}

function Slot({ figure, span = 'span-6' }: { figure: Figure; span?: string | false }) {
  const copilot = useCopilot();
  return (
    <section className={`gc-panel gc-slot${span ? ` ${span}` : ''}`}>
      <Chart
        figure={figure}
        compact
        action={(
          <button type="button" className="gc-investigate" aria-label={`Investigate ${figure.title}`} onClick={() => copilot.focusChart(figure.title)}>
            Investigate
          </button>
        )}
      />
    </section>
  );
}

function fig(type: Figure['type'], title: string, categories: string[], series: Figure['series'], unit: string, note: string, extra?: Partial<Figure>): Figure {
  const digits = unit === '%' || unit === 'days' || unit === 'rate' ? 1 : 0;
  return { type, title, categories, series, unit, digits, note, domain: 'appointments', subjects: [title], ...extra };
}

function score(name: string, value: string, delta: string, definition: string, scope: string, testId?: string, tone: Tone = 'neutral') {
  return { name, value, delta, tone, testId, detail: { name, value, definition, scope } };
}

function rateTone(rate: number, watch: number, alert: number, higherWorse = true): Tone {
  if (higherWorse) {
    if (rate >= alert) return 'alert';
    if (rate >= watch) return 'watch';
    return 'good';
  }
  if (rate < alert) return 'alert';
  if (rate < watch) return 'watch';
  return 'good';
}

function Alerts({ packed = false }: { packed?: boolean } = {}) {
  const store = useShowcase();
  const copilot = useCopilot();
  const view = useView();
  const { period } = usePeriod();
  const alerts = alertsFor(store.hospital, store.year).filter((alert) => alert.department === 'Appointments' && alert.severity !== 'info');
  return (
    <section className={`gc-panel gc-insight${packed ? '' : ' span-4'}`}>
      <h2>Priority signals</h2>
      <ul className="gc-alert-list">
        {alerts.length ? alerts.map((alert) => (
          <li key={alert.id}>
            <button type="button" onClick={() => copilot.openAlert(alert, { stay: true })}>
              <span className={`gc-sev gc-sev-${alert.severity}`}>{alert.severity}</span>
              {alert.title} · {alert.observed}
            </button>
          </li>
        )) : (
          <li>
            <button type="button" onClick={() => copilot.setOpen(true)}>
              <span className="gc-sev gc-sev-medium">review</span>
              Scheduling within review lines · open Vital Assist
            </button>
          </li>
        )}
      </ul>
      {period === 'year' ? null : <p>These alerts use the full reporting year. The scores above use the selected period.</p>}
      <div className="gc-next">
        <h2>Management action</h2>
        <p>Review no-show and fill rates while attendance is {pct(view.attendanceRate)}, slot fill is {pct(view.slotFillRate)}, and third-next-available is {num(view.thirdNextAvailable)} days (observation {view.observationDate}).</p>
        <button
          type="button"
          className="gc-ai-cta"
          onClick={() => { if (alerts[0]) copilot.openAlert(alerts[0], { stay: true }); else copilot.setOpen(true); }}
        >
          <span className="gc-ai-orb" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M4 20l7.2-7.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M12.8 5.2l1.4 3.4 3.4 1.4-3.4 1.4-1.4 3.4-1.4-3.4-3.4-1.4 3.4-1.4z" fill="currentColor" />
              <path d="M19 4l.7 1.7L21.4 6.4 19.7 7.1 19 8.8l-.7-1.7L16.6 6.4l1.7-.7z" fill="currentColor" />
            </svg>
          </span>
          Open Vital Assist
        </button>
      </div>
    </section>
  );
}

function IndicatorIndex({ indicators, domains }: { indicators: Indicator[]; domains: string[] }) {
  const [reveal, setReveal] = useState(false);
  const visible = indicators.filter((item) => domains.includes(item.domain) && (reveal || item.status !== 'unavailable'));
  const blankCount = indicators.filter((item) => domains.includes(item.domain) && item.status === 'unavailable').length;
  return (
    <section className="gc-panel span-12 gc-scope gc-scope-tight">
      <div className="gc-scope-head">
        <div>
          <h2>Performance indicators</h2>
          <p>Appointment booking and attendance. Clinic waiting after arrival stays in Outpatient.</p>
        </div>
        {blankCount ? (
          <button type="button" className="gc-text-btn" aria-pressed={reveal} onClick={() => setReveal((value) => !value)}>
            {reveal ? 'Hide indicators not available in this view' : 'Show indicators not available in this view'}
          </button>
        ) : null}
      </div>
      <div className="gc-scope-grid gc-scope-grid-dense">
        {visible.map((item) => (
          <article key={`${item.domain}-${item.name}`} className={`gc-scope-card${item.status === 'unavailable' ? ' is-blank' : ''}`} title={item.method}>
            <strong>{item.name}</strong>
            <em>{item.value}</em>
            <span className={`gc-scope-status is-${item.status === 'unavailable' ? 'blank' : item.status === 'constructed' ? 'estimated' : 'available'}`}>
              {item.status === 'unavailable' ? 'Not available' : item.status === 'constructed' ? 'Estimated' : 'Available'}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}

function AiIndex() {
  return (
    <section className="gc-panel span-12 gc-scope">
      <div className="gc-scope-head">
        <div>
          <h2>AI decision support</h2>
          <p>Illustrative scheduling intelligence · not a validated booking engine</p>
        </div>
      </div>
      <div className="gc-scope-grid">
        {APPOINTMENT_AI_CASES.map((item) => (
          <article key={item.id} className="gc-scope-card">
            <strong>{item.name}</strong>
            <em>{item.level}</em>
            <span className="gc-scope-status is-estimated">{item.limit}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function Donut({ title, note, parts, packed = false }: { title: string; note: string; parts: { name: string; value: number }[]; packed?: boolean }) {
  const copilot = useCopilot();
  const total = parts.reduce((sum, part) => sum + part.value, 0) || 1;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <section className={`gc-panel gc-slot${packed ? '' : ' span-6'}`}>
      <figure className="gc-chart" data-chart-state="ok">
        <figcaption className="gc-chart-head">
          <div className="gc-chart-copy">
            <strong>{title}</strong>
            <span>{note}</span>
          </div>
          <button type="button" className="gc-investigate" aria-label={`Investigate ${title}`} onClick={() => copilot.focusChart(title)}>Investigate</button>
        </figcaption>
        <ChartStage>
          <div className="gc-donut-body">
            <svg viewBox="0 0 120 120" role="img" aria-label={title}>
              {parts.map((part, index) => {
                const length = (part.value / total) * circumference;
                const node = (
                  <circle
                    key={part.name}
                    className="gc-donut-seg"
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="none"
                    stroke={PALETTE[index % PALETTE.length]}
                    strokeWidth="14"
                    strokeDasharray={`${length} ${circumference - length}`}
                    strokeDashoffset={-offset}
                    transform="rotate(-90 60 60)"
                  />
                );
                offset += length;
                return node;
              })}
              <text x="60" y="58" textAnchor="middle" className="gc-donut-total">{num(total)}</text>
              <text x="60" y="74" textAnchor="middle" className="gc-donut-label">booked</text>
            </svg>
            <ul className="gc-donut-legend">
              {parts.map((part, index) => (
                <li key={part.name}>
                  <i style={{ background: PALETTE[index % PALETTE.length] }} />
                  <span>{part.name}</span>
                  <strong>{num(part.value)} · {pct(part.value / total)}</strong>
                </li>
              ))}
            </ul>
          </div>
        </ChartStage>
      </figure>
    </section>
  );
}

export function ApptCommandPage() {
  const view = useView();
  const prior = usePrior();
  return (
    <Page title="Appointment Command Center" kpis={[
      score('Scheduled appointments', num(view.booked), compare(view, prior, (item) => item.booked), 'Booked appointments. Attended + cancelled + no-show = booked.', `${num(view.booked)} booked · ${view.periodLabel}.`, 'value-kpi_appt_scheduled', 'neutral'),
      score('Attended appointments', num(view.attended), compare(view, prior, (item) => item.attended), 'Attended scheduled appointments. Equals OPD attended visits for the same hospital and period.', `${num(view.attended)} attended · OPD match ${num(view.opdAttended)}.`, undefined, 'good'),
      score('Attendance rate', pct(view.attendanceRate), compare(view, prior, (item) => item.attendanceRate, true), 'Attended ÷ booked.', `${num(view.attended)} / ${num(view.booked)}.`, undefined, rateTone(view.attendanceRate, 0.88, 0.82, false)),
      score('No-show appointments', num(view.noShow), compare(view, prior, (item) => item.noShow), 'No-shows inside the booked cohort.', `${num(view.noShow)} no-shows.`, undefined, 'watch'),
      score('No-show rate', pct(view.noShowRate), compare(view, prior, (item) => item.noShowRate, true), 'No-shows ÷ booked.', `${pct(view.noShowRate)} of booked.`, undefined, rateTone(view.noShowRate, 0.05, 0.08)),
      score('Cancelled appointments', num(view.cancelled), compare(view, prior, (item) => item.cancelled), 'Cancellations inside the booked cohort.', `${num(view.cancelled)} cancelled.`, undefined, 'watch'),
      score('Cancellation rate', pct(view.cancellationRate), compare(view, prior, (item) => item.cancellationRate, true), 'Cancellations ÷ booked.', `${pct(view.cancellationRate)} of booked.`, undefined, rateTone(view.cancellationRate, 0.06, 0.1)),
      score('Rescheduled appointments', num(view.rescheduled), compare(view, prior, (item) => item.rescheduled), 'Reschedule events — not an outcome partition of attended/cancelled/no-show.', `${num(view.rescheduled)} reschedule events.`, undefined, 'neutral'),
      score('New appointment share', pct(view.newShare), 'Scenario share', 'New appointments as a share of booked. New + follow-up = booked.', `${num(view.newAppointments)} new.`, undefined, 'neutral'),
      score('Follow-up appointment share', pct(view.followUpShare), 'Scenario share', 'Follow-up appointments as the remainder of booked.', `${num(view.followUpAppointments)} follow-up.`, undefined, 'neutral'),
    ]}>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('area', 'Appointment demand over time', view.labels, [
            { name: 'Demand', values: view.monthlyBooked.map((booked) => Math.round(booked * (view.demand / Math.max(view.booked, 1)))) },
            { name: 'Booked', values: view.monthlyBooked },
          ], 'appointments', 'Monthly demand sketch vs booked. Booked months sum to period booked.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Alerts packed />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Donut packed title="Appointment outcomes" note="Mutually exclusive partition of booked: attended + cancelled + no-show." parts={[
            { name: 'Attended', value: view.attended },
            { name: 'Cancelled', value: view.cancelled },
            { name: 'No-show', value: view.noShow },
          ]} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Appointments by specialty', view.specialties.map((item) => item.id), [{ name: 'Booked', values: view.specialties.map((item) => item.booked) }], 'appointments', 'Specialty booked shares sum to period booked.')} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Attendance and no-show trends', view.labels, [
            { name: 'Attendance %', values: view.monthlyBooked.map((booked, index) => (booked ? Math.round((view.monthlyAttended[index] / booked) * 1000) / 10 : 0)) },
            { name: 'No-show %', values: view.monthlyBooked.map((booked, index) => (booked ? Math.round((view.monthlyNoShow[index] / booked) * 1000) / 10 : 0)) },
          ], '%', 'Monthly rates from monthly counts. Not naive averages of annual rates.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Booking lead time trend', view.labels, [{ name: 'Median days', values: view.monthlyLead }], 'days', 'Illustrative median booking lead time. Not OPD clinic waiting after arrival.')} />
        </div>
      </div>
      <Slot span="span-12" figure={fig('bars', 'Appointment channel mix', view.channels.map((item) => item.id), [{ name: 'Booked', values: view.channels.map((item) => item.count) }], 'appointments', 'Constructed booking channel mix. Channels sum to period booked.')} />
      <IndicatorIndex indicators={appointmentIndicatorsFor(view)} domains={['Booking Demand', 'Appointment Outcomes']} />
    </Page>
  );
}

export function ApptAccessPage() {
  const view = useView();
  const prior = usePrior();
  const hottest = [...view.specialties].sort((a, b) => b.accessPressure - a.accessPressure)[0];
  return (
    <Page title="Access & Scheduling Capacity" kpis={[
      score('Median booking lead time', `${num(view.leadMedian, 1)} days`, compare(view, prior, (item) => item.leadMedian), 'Median days from booking/request to scheduled visit. Not clinic waiting after arrival.', `${num(view.leadMedian, 1)} days · ${view.periodLabel}.`, 'value-kpi_appt_lead', view.leadMedian >= 14 ? 'alert' : view.leadMedian >= 10 ? 'watch' : 'good'),
      score('P90 booking lead time', `${num(view.leadP90, 1)} days`, compare(view, prior, (item) => item.leadP90), '90th-percentile booking lead time.', `P90 ${num(view.leadP90, 1)} days.`, undefined, view.leadP90 >= 28 ? 'alert' : 'watch'),
      score('Third next available', `${num(view.thirdNextAvailable)} days`, compare(view, prior, (item) => item.thirdNextAvailable), `Third eligible routine opening from ordered future slots. Observation date ${view.observationDate}.`, `Openings: ${view.thirdNextOpenings.join(', ')} days.`, undefined, view.thirdNextAvailable >= 18 ? 'alert' : 'watch'),
      score('Eligible appointment slots', num(view.slots), compare(view, prior, (item) => item.slots), 'Offered bookable slots in the period.', `${num(view.slots)} slots.`, undefined, 'neutral'),
      score('Booked slots', num(view.booked), compare(view, prior, (item) => item.booked), 'Booked slots (equals scheduled appointments).', `${num(view.booked)} booked.`, undefined, 'neutral'),
      score('Available slots', num(view.availableSlots), compare(view, prior, (item) => item.availableSlots), 'Slots − booked.', `${num(view.availableSlots)} open.`, undefined, view.availableSlots < view.slots * 0.05 ? 'alert' : 'good'),
      score('Slot fill rate', pct(view.slotFillRate), compare(view, prior, (item) => item.slotFillRate, true), 'Booked ÷ eligible slots.', `${num(view.booked)} / ${num(view.slots)}.`, undefined, rateTone(view.slotFillRate, 0.9, 0.82, false)),
      score('Capacity gap', num(view.capacityGap), compare(view, prior, (item) => item.capacityGap), 'Demand above offered slots when demand exceeds slots.', `${num(view.demand)} demand vs ${num(view.slots)} slots.`, undefined, view.capacityGap > 0 ? 'watch' : 'good'),
      score('Sessions with scheduling pressure', num(view.sessionsWithPressure), compare(view, prior, (item) => item.sessionsWithPressure), 'Illustrative sessions under scheduling pressure.', `${num(view.sessionsWithPressure)} sessions.`, undefined, 'watch'),
      score('Next 7-day available capacity', num(view.next7DayAvailable), compare(view, prior, (item) => item.next7DayAvailable), `Illustrative open capacity after ${view.observationDate}.`, `${num(view.next7DayAvailable)} openings sketch.`, undefined, 'neutral'),
    ]}>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Booking lead time trend', view.labels, [{ name: 'Median days', values: view.monthlyLead }], 'days', 'Illustrative monthly median lead time. Distinct from OPD arrival-to-provider.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Access days by specialty', view.specialties.map((item) => item.id), [{ name: 'Median lead days', values: view.specialties.map((item) => item.leadMedian) }], 'days', `Specialty lead times around hospital median ${num(view.leadMedian, 1)}. Highest pressure: ${hottest?.id ?? 'n/a'}.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Third next available by specialty', view.specialties.map((item) => item.id), [{ name: 'Days', values: view.specialties.map((item) => item.thirdNextDays) }], 'days', `Third eligible opening per specialty from ordered future slots. Observation ${view.observationDate}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Available vs booked capacity', ['Booked', 'Available'], [{ name: 'Slots', values: [view.booked, view.availableSlots] }], 'slots', `Booked + available = ${num(view.slots)} eligible slots.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Demand vs scheduling capacity', ['Demand', 'Slots', 'Booked'], [{ name: 'Appointments', values: [view.demand, view.slots, view.booked] }], 'appointments', 'Demand may exceed slots. Booked never exceeds slots in this scenario.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Future open slots by day', view.futureOpenSlots.map((item) => item.name), [{ name: 'Openings', values: view.futureOpenSlots.map((item) => item.count) }], 'slots', `Illustrative next-week openings after ${view.observationDate}. Week sketch totals near ${num(view.next7DayAvailable)}.`)} />
        </div>
      </div>
      <Slot span="span-12" figure={fig('bars', 'Specialty access pressure', view.specialties.map((item) => item.id), [{ name: 'Pressure index', values: view.specialties.map((item) => Math.round(item.accessPressure * 100) / 100) }], 'index', 'Constructed index from relative lead time and unfilled share. Not a clinical urgency score.')} />
      <IndicatorIndex indicators={appointmentIndicatorsFor(view)} domains={['Access & Availability', 'Scheduling Capacity']} />
    </Page>
  );
}

export function ApptAttendancePage() {
  const view = useView();
  const prior = usePrior();
  return (
    <Page title="Attendance & No-show Intelligence" kpis={[
      score('No-show rate', pct(view.noShowRate), compare(view, prior, (item) => item.noShowRate, true), 'No-shows ÷ booked.', `${num(view.noShow)} / ${num(view.booked)}.`, 'value-kpi_appt_noshow', rateTone(view.noShowRate, 0.05, 0.08)),
      score('No-show count', num(view.noShow), compare(view, prior, (item) => item.noShow), 'No-show appointments in the booked cohort.', `${num(view.noShow)} no-shows.`, undefined, 'watch'),
      score('Cancellation rate', pct(view.cancellationRate), compare(view, prior, (item) => item.cancellationRate, true), 'Cancellations ÷ booked.', `${num(view.cancelled)} / ${num(view.booked)}.`, undefined, rateTone(view.cancellationRate, 0.06, 0.1)),
      score('Late cancellation rate', pct(view.lateCancelRate), compare(view, prior, (item) => item.lateCancelRate, true), 'Late cancellations ÷ booked (late = 25% of cancellations).', `${num(view.lateCancellations)} late cancels.`, undefined, 'watch'),
      score('Attendance rate', pct(view.attendanceRate), compare(view, prior, (item) => item.attendanceRate, true), 'Attended ÷ booked.', `${pct(view.attendanceRate)}.`, undefined, rateTone(view.attendanceRate, 0.88, 0.82, false)),
      score('Lost booked slots', num(view.lostBookedSlots), compare(view, prior, (item) => item.lostBookedSlots), 'No-shows + late cancellations.', `${num(view.noShow)} no-shows + ${num(view.lateCancellations)} late cancels.`, undefined, 'alert'),
      score('Highest specialty no-show share', pct(Math.max(...view.specialties.map((item) => item.noShowRate))), 'Specialty max', 'Highest specialty no-show rate in the period.', `${[...view.specialties].sort((a, b) => b.noShowRate - a.noShowRate)[0]?.id ?? 'n/a'}.`, undefined, 'watch'),
      score('Reminder coverage', pct(view.reminderCoverage), compare(view, prior, (item) => item.reminderCoverage, true), 'Illustrative reminder coverage of booked appointments.', `${pct(view.reminderCoverage)} covered.`, undefined, 'neutral'),
      score('Reschedule events', num(view.rescheduled), compare(view, prior, (item) => item.rescheduled), 'Reschedule events — separate from outcome partition.', `${num(view.rescheduled)} events.`, undefined, 'neutral'),
      score('Waitlist demand', num(view.waitlistDemand), compare(view, prior, (item) => item.waitlistDemand), 'Unbooked demand = demand − booked.', `${num(view.waitlistDemand)} waiting for a slot.`, undefined, view.waitlistDemand > 0 ? 'watch' : 'good'),
    ]}>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'No-show trend', view.labels, [{ name: 'No-show %', values: view.monthlyBooked.map((booked, index) => (booked ? Math.round((view.monthlyNoShow[index] / booked) * 1000) / 10 : 0)) }], '%', 'Monthly no-show rate from monthly counts.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'No-show by specialty', view.specialties.map((item) => item.id), [{ name: 'No-shows', values: view.specialties.map((item) => item.noShow) }], 'appointments', `Specialty no-shows sum to ${num(view.noShow)}.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Attendance outcomes by day', view.outcomesByDay.map((item) => item.name), [
            { name: 'Attended', values: view.outcomesByDay.map((item) => item.attended) },
            { name: 'No-show', values: view.outcomesByDay.map((item) => item.noShow) },
          ], 'appointments', 'Weekday attended and no-show counts. Day booked still reconciles to attended + cancelled + no-show.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Cancellation timing distribution', view.cancelTimingCounts.map((item) => item.name), [{ name: 'Cancellations', values: view.cancelTimingCounts.map((item) => item.count) }], 'appointments', `Timing bins sum to ${num(view.cancelled)} cancellations.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Appointment outcome by booking lead time', view.outcomeByLead.map((item) => item.name), [
            { name: 'Attended', values: view.outcomeByLead.map((item) => item.attended) },
            { name: 'No-show', values: view.outcomeByLead.map((item) => item.noShow) },
          ], 'appointments', 'Lead-time bands partition booked appointments. Longer lead shows a higher constructed no-show tilt.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Lost capacity by specialty', view.specialties.map((item) => item.id), [{ name: 'Lost slots', values: view.specialties.map((item) => item.lostSlots) }], 'slots', 'No-shows + late cancellations by specialty. Not a demographic risk score.')} />
        </div>
      </div>
      <Slot span="span-12" figure={fig('line', 'Reminder coverage vs attendance', view.labels, [
        { name: 'Reminder coverage %', values: view.labels.map(() => Math.round(view.reminderCoverage * 1000) / 10) },
        { name: 'Attendance %', values: view.monthlyBooked.map((booked, index) => (booked ? Math.round((view.monthlyAttended[index] / booked) * 1000) / 10 : 0)) },
      ], '%', 'Illustrative reminder coverage held near the period rate beside monthly attendance. Correlation is not causation.')} />
      <IndicatorIndex indicators={appointmentIndicatorsFor(view)} domains={['Cancellation & No-show', 'Clinical Flow Context']} />
    </Page>
  );
}

export function ApptRecoveryPage() {
  const view = useView();
  const prior = usePrior();
  return (
    <Page title="Slot Recovery & Optimization" kpis={[
      score('Released appointment slots', num(view.releasedSlots), compare(view, prior, (item) => item.releasedSlots), 'Slots released from cancellations and a share of no-shows.', `${num(view.releasedSlots)} released.`, undefined, 'neutral'),
      score('Recovered slots', num(view.recoveredSlots), compare(view, prior, (item) => item.recoveredSlots), 'Released slots successfully rebooked. Recovered ≤ released.', `${num(view.recoveredSlots)} recovered.`, undefined, 'good'),
      score('Slot recovery rate', pct(view.recoveryRate), compare(view, prior, (item) => item.recoveryRate, true), 'Recovered ÷ released.', `${num(view.recoveredSlots)} / ${num(view.releasedSlots)}.`, undefined, rateTone(view.recoveryRate, 0.45, 0.3, false)),
      score('Waitlist demand', num(view.waitlistDemand), compare(view, prior, (item) => item.waitlistDemand), 'Unbooked demand.', `${num(view.waitlistDemand)} waiting.`, undefined, 'watch'),
      score('Eligible waitlist candidates', num(view.eligibleWaitlist), compare(view, prior, (item) => item.eligibleWaitlist), 'Waitlist demand capped by available and recoverable openings.', `${num(view.eligibleWaitlist)} eligible.`, undefined, 'neutral'),
      score('Rebooking opportunities', num(view.rebookingOpportunities), compare(view, prior, (item) => item.rebookingOpportunities), 'Eligible candidates that can fill recoverable or open slots.', `${num(view.rebookingOpportunities)} opportunities.`, undefined, 'watch'),
      score('Unfilled recoverable slots', num(view.unfilledRecoverable), compare(view, prior, (item) => item.unfilledRecoverable), 'Released − recovered. Not yet recovered.', `${num(view.unfilledRecoverable)} still open.`, undefined, view.unfilledRecoverable > 20 ? 'alert' : 'watch'),
      score('Estimated recoverable capacity', num(view.estimatedRecoverable), compare(view, prior, (item) => item.estimatedRecoverable), 'Unfilled recoverable capacity still available for outreach.', `${num(view.estimatedRecoverable)} slots.`, undefined, 'watch'),
      score('Available slots now', num(view.availableSlots), compare(view, prior, (item) => item.availableSlots), 'Unbooked eligible slots (slots − booked).', `${num(view.availableSlots)} available.`, undefined, 'neutral'),
      score('Slot fill rate', pct(view.slotFillRate), compare(view, prior, (item) => item.slotFillRate, true), 'Booked ÷ eligible slots.', `${pct(view.slotFillRate)}.`, undefined, rateTone(view.slotFillRate, 0.9, 0.82, false)),
    ]}>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Released vs recovered slots', view.labels, [
            { name: 'Released', values: view.monthlyReleased },
            { name: 'Recovered', values: view.monthlyRecovered },
          ], 'slots', 'Monthly released and recovered. Recovered never exceeds released in a month.')} />
        </div>
        <div className="gc-ed-pack-col">
          <section className="gc-panel gc-insight">
            <h2>Management decisions</h2>
            <div className="gc-exception-list">
              <div className="gc-exception gc-tone-watch"><strong>Increase reminder coverage</strong><span>Now {pct(view.reminderCoverage)}</span></div>
              <div className="gc-exception gc-tone-alert"><strong>Activate eligible waitlist outreach</strong><span>{num(view.eligibleWaitlist)} candidates</span></div>
              <div className="gc-exception gc-tone-watch"><strong>Release unused reserved slots</strong><span>{num(view.unfilledRecoverable)} recoverable</span></div>
              <div className="gc-exception gc-tone-neutral"><strong>Review specialty scheduling templates</strong><span>Fill {pct(view.slotFillRate)}</span></div>
              <div className="gc-exception gc-tone-watch"><strong>Offer eligible earlier appointments</strong><span>TNA {num(view.thirdNextAvailable)}d</span></div>
              <div className="gc-exception gc-tone-neutral"><strong>Review cancellation cutoffs</strong><span>Late cancel {pct(view.lateCancelRate)}</span></div>
            </div>
            <p className="gc-next">A released slot is not recovered until rebooked. AI does not change schedules alone.</p>
          </section>
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Recovery rate over time', view.labels, [{ name: 'Recovery %', values: view.monthlyRecovery.map((value) => Math.round(value * 1000) / 10) }], '%', 'Monthly recovered ÷ released.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Recoverable capacity by specialty', view.specialties.map((item) => item.id), [{ name: 'Unfilled recoverable', values: view.specialties.map((item) => Math.max(0, item.released - item.recovered)) }], 'slots', `Specialty unfilled recoverable sums to ${num(view.unfilledRecoverable)}.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Waitlist demand vs eligible openings', ['Waitlist demand', 'Eligible candidates', 'Available slots'], [{ name: 'Count', values: [view.waitlistDemand, view.eligibleWaitlist, view.availableSlots] }], 'appointments', 'Eligible candidates are capped by openings. Demand is not automatically booked.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Recovery opportunity by lead time', view.outcomeByLead.map((item) => item.name), [{ name: 'No-show + cancel', values: view.outcomeByLead.map((item) => item.noShow + item.cancelled) }], 'appointments', 'Lost booked volume by lead-time band — outreach opportunity sketch.')} />
        </div>
      </div>
      <Slot span="span-12" figure={fig('bars', 'Current vs illustrative improved utilization', ['Current fill', 'Illustrative +10 pts'], [{ name: 'Fill %', values: [
        Math.round(view.slotFillRate * 1000) / 10,
        Math.round(Math.min(0.98, view.slotFillRate + 0.1) * 1000) / 10,
      ] }], '%', 'Illustrative fill improvement capped at 98%. Not a validated forecast.')} />
      <IndicatorIndex indicators={appointmentIndicatorsFor(view)} domains={['Recovery & Optimization']} />
      <AiIndex />
    </Page>
  );
}
