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
  const digits = unit === '%' || unit === 'days' || unit === 'rate' || unit === 'index' ? 1 : 0;
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
              Scheduling within management thresholds · open Vital Assist
            </button>
          </li>
        )}
      </ul>
      {period === 'year' ? null : <p>These alerts use the full reporting year. The scores above use the selected period.</p>}
      <div className="gc-next">
        <h2>Management action</h2>
        <p>Review no-show and fill rates while attendance is {pct(view.attendanceRate)}, slot fill is {pct(view.slotFillRate)}, and third next available is {num(view.thirdNextAvailable)} days (observation {view.observationDate}).</p>
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
      score('Scheduled Appointments', num(view.booked), compare(view, prior, (item) => item.booked), 'Booked appointments. Attended + Cancelled + No-show = Scheduled.', `${num(view.booked)} booked · ${view.periodLabel}.`, 'value-kpi_appt_scheduled', 'neutral'),
      score('Attended Appointments', num(view.attended), compare(view, prior, (item) => item.attended), 'Attended scheduled appointments. Equals OPD attended visits for the same hospital and period.', `${num(view.attended)} attended · OPD match ${num(view.opdAttended)}.`, undefined, 'good'),
      score('Attendance Rate', pct(view.attendanceRate), compare(view, prior, (item) => item.attendanceRate, true), 'Attended ÷ Scheduled.', `${num(view.attended)} / ${num(view.booked)}.`, undefined, rateTone(view.attendanceRate, 0.88, 0.82, false)),
      score('No-show Appointments', num(view.noShow), compare(view, prior, (item) => item.noShow), 'No-shows inside the booked cohort.', `${num(view.noShow)} no-shows.`, undefined, 'watch'),
      score('No-show Rate', pct(view.noShowRate), compare(view, prior, (item) => item.noShowRate, true), 'No-shows ÷ Scheduled.', `${pct(view.noShowRate)} of booked.`, undefined, rateTone(view.noShowRate, 0.05, 0.08)),
      score('Cancelled Appointments', num(view.cancelled), compare(view, prior, (item) => item.cancelled), 'Cancellations inside the booked cohort.', `${num(view.cancelled)} cancelled.`, undefined, 'watch'),
      score('Cancellation Rate', pct(view.cancellationRate), compare(view, prior, (item) => item.cancellationRate, true), 'Cancellations ÷ Scheduled.', `${pct(view.cancellationRate)} of booked.`, undefined, rateTone(view.cancellationRate, 0.06, 0.1)),
      score('Rescheduled Appointments', num(view.rescheduled), compare(view, prior, (item) => item.rescheduled), 'Reschedule events — not a mutually exclusive attendance outcome.', `${num(view.rescheduled)} reschedule events.`, undefined, 'neutral'),
      score('New Appointment Share', pct(view.newShare), 'Scenario share', 'New appointments as a share of booked. New + Follow-up = Scheduled.', `${num(view.newAppointments)} new.`, undefined, 'neutral'),
      score('Follow-up Appointment Share', pct(view.followUpShare), 'Scenario share', 'Follow-up appointments as the remainder of booked.', `${num(view.followUpAppointments)} follow-up.`, undefined, 'neutral'),
    ]}>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('area', 'Appointment Demand vs Bookings', view.labels, [
            { name: 'Demand', values: view.monthlyDemand },
            { name: 'Booked', values: view.monthlyBooked },
          ], 'appointments', 'Monthly scenario demand and booked series for the same reporting period. Booked months sum to period scheduled.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Alerts packed />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Donut packed title="Appointment Outcomes Breakdown" note="Mutually exclusive partition of scheduled appointments: Attended + Cancelled + No-show." parts={[
            { name: 'Attended', value: view.attended },
            { name: 'Cancelled', value: view.cancelled },
            { name: 'No-show', value: view.noShow },
          ]} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Scheduled Appointments by Specialty', view.specialties.map((item) => item.id), [{ name: 'Booked', values: view.specialties.map((item) => item.booked) }], 'appointments', 'Specialty booked shares sum to period scheduled appointments.')} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Attendance & No-show Trends', view.labels, [
            { name: 'Attendance Rate %', values: view.monthlyBooked.map((booked, index) => (booked ? Math.round((view.monthlyAttended[index] / booked) * 1000) / 10 : 0)) },
            { name: 'No-show Rate %', values: view.monthlyBooked.map((booked, index) => (booked ? Math.round((view.monthlyNoShow[index] / booked) * 1000) / 10 : 0)) },
          ], '%', 'Monthly attendance and no-show rates from monthly counts on a common percent axis.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Booking Lead Time Trend', view.labels, [{ name: 'Median days', values: view.monthlyLead }], 'days', 'Illustrative median booking lead time (request/booking → scheduled visit). Not OPD clinic waiting after arrival.')} />
        </div>
      </div>
      <Slot span="span-12" figure={fig('bars', 'Bookings by Channel', view.channels.map((item) => item.id), [{ name: 'Booked', values: view.channels.map((item) => item.count) }], 'appointments', 'Constructed scenario channel mix. Channels sum to period scheduled appointments — not a live booking-system extract.')} />
      <IndicatorIndex indicators={appointmentIndicatorsFor(view)} domains={['Booking Demand', 'Appointment Outcomes']} />
    </Page>
  );
}

export function ApptAccessPage() {
  const view = useView();
  const prior = usePrior();
  const hottest = [...view.specialties].sort((a, b) => b.accessPressure - a.accessPressure)[0];
  return (
    <Page title="Appointment Access & Capacity" kpis={[
      score('Median Booking Lead Time', `${num(view.leadMedian, 1)} days`, compare(view, prior, (item) => item.leadMedian), 'Median days from booking/request to scheduled visit. Not clinic waiting after arrival.', `${num(view.leadMedian, 1)} days · ${view.periodLabel}.`, 'value-kpi_appt_lead', view.leadMedian >= 14 ? 'alert' : view.leadMedian >= 10 ? 'watch' : 'good'),
      score('P90 Booking Lead Time', `${num(view.leadP90, 1)} days`, compare(view, prior, (item) => item.leadP90), '90th-percentile booking lead time for the same measurement window.', `P90 ${num(view.leadP90, 1)} days.`, undefined, view.leadP90 >= 28 ? 'alert' : 'watch'),
      score('Third Next Available Appointment', `${num(view.thirdNextAvailable)} days`, compare(view, prior, (item) => item.thirdNextAvailable), `Third eligible routine opening from an ordered illustrative opening list. Observation date ${view.observationDate}.`, `Openings: ${view.thirdNextOpenings.join(', ')} days · illustrative schedule.`, undefined, view.thirdNextAvailable >= 18 ? 'alert' : 'watch'),
      score('Bookable Slots', num(view.slots), compare(view, prior, (item) => item.slots), 'Eligible bookable slots in the selected period.', `${num(view.slots)} slots.`, undefined, 'neutral'),
      score('Booked Slots', num(view.booked), compare(view, prior, (item) => item.booked), 'Booked slots (equals scheduled appointments).', `${num(view.booked)} booked.`, undefined, 'neutral'),
      score('Unbooked Slots', num(view.unbookedSlots), compare(view, prior, (item) => item.unbookedSlots), 'Period unbooked capacity = Bookable − Booked. Not a live “available now” queue.', `${num(view.unbookedSlots)} unbooked in period.`, undefined, view.unbookedSlots < view.slots * 0.05 ? 'alert' : 'good'),
      score('Slot Fill Rate', pct(view.slotFillRate), compare(view, prior, (item) => item.slotFillRate, true), 'Booked Slots ÷ Bookable Slots.', `${num(view.booked)} / ${num(view.slots)}.`, undefined, rateTone(view.slotFillRate, 0.9, 0.82, false)),
      score('Capacity Shortfall', num(view.capacityShortfall), compare(view, prior, (item) => item.capacityShortfall), 'max(0, Appointment Demand − Bookable Slots). Unmet demand, not unbooked capacity.', `${num(view.demand)} demand vs ${num(view.slots)} slots.`, undefined, view.capacityShortfall > 0 ? 'watch' : 'good'),
      score('High-Pressure Clinic Sessions', num(view.sessionsWithPressure), compare(view, prior, (item) => item.sessionsWithPressure), 'Illustrative sessions under scheduling pressure.', `${num(view.sessionsWithPressure)} sessions.`, undefined, 'watch'),
      score('Next 7-Day Open Slots', num(view.next7DayOpenSlots), compare(view, prior, (item) => item.next7DayOpenSlots), `Deterministic illustrative openings for the 7 days after ${view.observationDate}. Not historical vacancies ÷ 365.`, `${num(view.next7DayOpenSlots)} openings in the week sketch.`, undefined, 'neutral'),
    ]}>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Booking Lead Time Over Time', view.labels, [{ name: 'Median days', values: view.monthlyLead }], 'days', 'Illustrative monthly median lead time. Distinct from OPD arrival-to-provider.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Booking Lead Time by Specialty', view.specialties.map((item) => item.id), [{ name: 'Median lead days', values: view.specialties.map((item) => item.leadMedian) }], 'days', `Specialty lead times around hospital median ${num(view.leadMedian, 1)}. Highest pressure: ${hottest?.id ?? 'n/a'}.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Third Next Available by Specialty', view.specialties.map((item) => item.id), [{ name: 'Days', values: view.specialties.map((item) => item.thirdNextDays) }], 'days', `Third eligible opening per specialty from ordered illustrative openings. Observation ${view.observationDate}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Booked vs Unbooked Slots', ['Booked', 'Unbooked'], [{ name: 'Share of bookable %', values: [
            Math.round(view.slotFillRate * 1000) / 10,
            Math.round((1 - view.slotFillRate) * 1000) / 10,
          ] }], '%', `Shares of ${num(view.slots)} bookable slots. Booked ${num(view.booked)} · Unbooked ${num(view.unbookedSlots)}.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Appointment Demand vs Capacity', ['Demand', 'Bookable', 'Booked'], [{ name: 'Appointments', values: [view.demand, view.slots, view.booked] }], 'appointments', 'Demand may exceed bookable slots. Booked never exceeds bookable slots in this scenario.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Next 7-Day Open Slots', view.futureOpenSlots.map((item) => item.name), [{ name: 'Openings', values: view.futureOpenSlots.map((item) => item.count) }], 'slots', `Illustrative openings after ${view.observationDate}. Daily counts sum to ${num(view.next7DayOpenSlots)}.`)} />
        </div>
      </div>
      <Slot span="span-12" figure={fig('bars', 'Scheduling Pressure by Specialty', view.specialties.map((item) => item.id), [{ name: 'Pressure index', values: view.specialties.map((item) => Math.round(item.accessPressure * 100) / 100) }], 'index', 'Illustrative index from relative lead time and unfilled share. Not a validated scheduling-risk or clinical-priority score.')} />
      <IndicatorIndex indicators={appointmentIndicatorsFor(view)} domains={['Access & Availability', 'Scheduling Capacity']} />
    </Page>
  );
}

export function ApptAttendancePage() {
  const view = useView();
  const prior = usePrior();
  const hottestNoShow = [...view.specialties].sort((a, b) => b.noShowRate - a.noShowRate)[0];
  return (
    <Page title="Attendance & No-show Intelligence" kpis={[
      score('No-show Rate', pct(view.noShowRate), compare(view, prior, (item) => item.noShowRate, true), 'No-shows ÷ Scheduled.', `${num(view.noShow)} / ${num(view.booked)}.`, 'value-kpi_appt_noshow', rateTone(view.noShowRate, 0.05, 0.08)),
      score('No-show Appointments', num(view.noShow), compare(view, prior, (item) => item.noShow), 'No-show appointments in the booked cohort.', `${num(view.noShow)} no-shows.`, undefined, 'watch'),
      score('Cancellation Rate', pct(view.cancellationRate), compare(view, prior, (item) => item.cancellationRate, true), 'Cancellations ÷ Scheduled.', `${num(view.cancelled)} / ${num(view.booked)}.`, undefined, rateTone(view.cancellationRate, 0.06, 0.1)),
      score('Late Cancellation Rate', pct(view.lateCancelRate), compare(view, prior, (item) => item.lateCancelRate, true), 'Same-day / <48h cancellations ÷ Scheduled.', `${num(view.lateCancellations)} late cancels.`, undefined, 'watch'),
      score('Attendance Rate', pct(view.attendanceRate), compare(view, prior, (item) => item.attendanceRate, true), 'Attended ÷ Scheduled.', `${pct(view.attendanceRate)}.`, undefined, rateTone(view.attendanceRate, 0.88, 0.82, false)),
      score('Slots Lost to No-shows & Late Cancellations', num(view.lostBookedSlots), compare(view, prior, (item) => item.lostBookedSlots), 'No-shows + late cancellations. Distinguishes unused-at-time capacity from slots released early enough to recover.', `${num(view.noShow)} no-shows + ${num(view.lateCancellations)} late cancels.`, undefined, 'alert'),
      score('Highest Specialty No-show Rate', pct(hottestNoShow?.noShowRate ?? 0), 'Specialty max', 'Highest specialty no-show rate in the period.', `${hottestNoShow?.id ?? 'n/a'}.`, undefined, 'watch'),
      score('Appointment Reminder Coverage', pct(view.reminderCoverage), compare(view, prior, (item) => item.reminderCoverage, true), 'Illustrative reminder coverage of booked appointments. Not evidence of causal attendance lift.', `${pct(view.reminderCoverage)} covered.`, undefined, 'neutral'),
      score('Rescheduling Events', num(view.rescheduled), compare(view, prior, (item) => item.rescheduled), 'Reschedule events — separate from the attended/cancelled/no-show partition.', `${num(view.rescheduled)} events.`, undefined, 'neutral'),
      score('Unscheduled Appointment Demand', num(view.waitlistDemand), compare(view, prior, (item) => item.waitlistDemand), 'Unbooked demand = Demand − Booked.', `${num(view.waitlistDemand)} waiting for a slot.`, undefined, view.waitlistDemand > 0 ? 'watch' : 'good'),
    ]}>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'No-show Rate Trend', view.labels, [{ name: 'No-show Rate %', values: view.monthlyBooked.map((booked, index) => (booked ? Math.round((view.monthlyNoShow[index] / booked) * 1000) / 10 : 0)) }], '%', 'Monthly no-show rate from monthly counts.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'No-show Appointments by Specialty', view.specialties.map((item) => item.id), [{ name: 'No-shows', values: view.specialties.map((item) => item.noShow) }], 'appointments', `Specialty no-shows sum to ${num(view.noShow)}.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Attendance & No-shows by Weekday', view.outcomesByDay.map((item) => item.name), [
            { name: 'Attended', values: view.outcomesByDay.map((item) => item.attended) },
            { name: 'No-show', values: view.outcomesByDay.map((item) => item.noShow) },
          ], 'appointments', 'Weekday attended and no-show counts. Each weekday still reconciles Attended + Cancelled + No-show = Booked.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Cancellations by Notice Period', view.cancelTimingCounts.map((item) => item.name), [{ name: 'Cancellations', values: view.cancelTimingCounts.map((item) => item.count) }], 'appointments', `Mutually exclusive notice bins sum to ${num(view.cancelled)} cancellations. Late = Same day / <48h.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Attendance & No-shows by Booking Lead Time', view.outcomeByLead.map((item) => item.name), [
            { name: 'Attended', values: view.outcomeByLead.map((item) => item.attended) },
            { name: 'No-show', values: view.outcomeByLead.map((item) => item.noShow) },
          ], 'appointments', 'Lead-time bands partition booked appointments and reconcile to period totals.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Lost Appointment Slots by Specialty', view.specialties.map((item) => item.id), [{ name: 'Lost slots', values: view.specialties.map((item) => item.lostSlots) }], 'slots', 'No-shows + late cancellations by specialty. Not permanent loss if early release + rebooking recovers the slot. Not a demographic risk score.')} />
        </div>
      </div>
      <Slot span="span-12" figure={fig('line', 'Reminder Coverage vs Attendance Rate', view.labels, [
        { name: 'Reminder Coverage %', values: view.labels.map((_, index) => Math.round((view.reminderCoverage + ((index % 5) - 2) * 0.004) * 1000) / 10) },
        { name: 'Attendance Rate %', values: view.monthlyBooked.map((booked, index) => (booked ? Math.round((view.monthlyAttended[index] / booked) * 1000) / 10 : 0)) },
      ], '%', 'Illustrative reminder coverage beside monthly attendance rate. Any relationship is illustrative — not causal evidence.')} />
      <IndicatorIndex indicators={appointmentIndicatorsFor(view)} domains={['Cancellation & No-show', 'Clinical Flow Context']} />
    </Page>
  );
}

export function ApptRecoveryPage() {
  const view = useView();
  const prior = usePrior();
  return (
    <Page title="Slot Recovery & Optimization" kpis={[
      score('Released Appointment Slots', num(view.releasedSlots), compare(view, prior, (item) => item.releasedSlots), 'Slots released before appointment start from cancellations with advance notice. No-shows do not release early enough to rebook.', `${num(view.releasedSlots)} released · eligible ${num(view.eligibleReleasedSlots)}.`, undefined, 'neutral'),
      score('Rebooked Released Slots', num(view.recoveredSlots), compare(view, prior, (item) => item.recoveredSlots), 'Released slots with a confirmed replacement booking. Recovered ≤ eligible released.', `${num(view.recoveredSlots)} rebooked.`, undefined, 'good'),
      score('Slot Recovery Rate', pct(view.recoveryRate), compare(view, prior, (item) => item.recoveryRate, true), 'Rebooked ÷ Eligible Released Slots.', `${num(view.recoveredSlots)} / ${num(view.eligibleReleasedSlots)}.`, undefined, rateTone(view.recoveryRate, 0.45, 0.3, false)),
      score('Unscheduled Appointment Demand', num(view.waitlistDemand), compare(view, prior, (item) => item.waitlistDemand), 'Unbooked demand = Demand − Booked.', `${num(view.waitlistDemand)} waiting.`, undefined, 'watch'),
      score('Eligible Waitlist Candidates', num(view.eligibleWaitlist), compare(view, prior, (item) => item.eligibleWaitlist), 'Waitlist patients matching appointment availability (contactable/eligible share of demand).', `${num(view.eligibleWaitlist)} eligible.`, undefined, 'neutral'),
      score('Potential Rebooking Opportunities', num(view.potentialRebookingOpportunities), compare(view, prior, (item) => item.potentialRebookingOpportunities), 'Feasible candidate–slot matches before openings expire. Capped by eligible candidates and openings.', `${num(view.potentialRebookingOpportunities)} opportunities.`, undefined, 'watch'),
      score('Unfilled Released Slots', num(view.unfilledReleasedSlots), compare(view, prior, (item) => item.unfilledReleasedSlots), 'Released − Rebooked. Remaining released capacity without a confirmed replacement.', `${num(view.unfilledReleasedSlots)} still open.`, undefined, view.unfilledReleasedSlots > 20 ? 'alert' : 'watch'),
      score('Estimated Additional Recoveries', num(view.estimatedAdditionalRecoveries), compare(view, prior, (item) => item.estimatedAdditionalRecoveries), 'Illustrative additional confirmed bookings under improved outreach. Not equal to unfilled released unless the scenario says so.', `${num(view.estimatedAdditionalRecoveries)} feasible extras.`, undefined, 'watch'),
      score('Unbooked Slots', num(view.unbookedSlots), compare(view, prior, (item) => item.unbookedSlots), 'Period unbooked capacity (Bookable − Booked). Distinct from released/recovery lifecycle.', `${num(view.unbookedSlots)} unbooked.`, undefined, 'neutral'),
      score('Slot Fill Rate', pct(view.slotFillRate), compare(view, prior, (item) => item.slotFillRate, true), 'Booked ÷ Bookable.', `${pct(view.slotFillRate)}.`, undefined, rateTone(view.slotFillRate, 0.9, 0.82, false)),
    ]}>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Released vs Rebooked Slots', view.labels, [
            { name: 'Released', values: view.monthlyReleased },
            { name: 'Rebooked', values: view.monthlyRecovered },
          ], 'slots', 'Monthly released and confirmed rebooked slots. Rebooked never exceeds released in a month.')} />
        </div>
        <div className="gc-ed-pack-col">
          <section className="gc-panel gc-insight">
            <h2>Management decisions</h2>
            <div className="gc-exception-list">
              <div className="gc-exception gc-tone-watch"><strong>Increase reminder coverage</strong><span>Now {pct(view.reminderCoverage)}</span></div>
              <div className="gc-exception gc-tone-alert"><strong>Activate eligible waitlist outreach</strong><span>{num(view.eligibleWaitlist)} candidates</span></div>
              <div className="gc-exception gc-tone-watch"><strong>Release unused reserved slots</strong><span>{num(view.unfilledReleasedSlots)} unfilled released</span></div>
              <div className="gc-exception gc-tone-neutral"><strong>Review specialty scheduling templates</strong><span>Fill {pct(view.slotFillRate)}</span></div>
              <div className="gc-exception gc-tone-watch"><strong>Offer eligible earlier appointments</strong><span>TNA {num(view.thirdNextAvailable)}d</span></div>
              <div className="gc-exception gc-tone-neutral"><strong>Review cancellation cutoffs</strong><span>Late cancel {pct(view.lateCancelRate)}</span></div>
            </div>
            <p className="gc-next">A released slot is recovered only when rebooked. No-shows do not release early. AI does not change schedules alone.</p>
          </section>
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Slot Recovery Rate Trend', view.labels, [{ name: 'Recovery Rate %', values: view.monthlyRecovery.map((value) => Math.round(value * 1000) / 10) }], '%', 'Monthly rebooked ÷ eligible released.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Unfilled Released Slots by Specialty', view.specialties.map((item) => item.id), [{ name: 'Unfilled released', values: view.specialties.map((item) => item.unfilledReleased) }], 'slots', `Specialty unfilled released sums to ${num(view.unfilledReleasedSlots)}.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Waitlist Demand vs Eligible Openings', ['Unscheduled demand', 'Eligible candidates', 'Unfilled released', 'Unbooked slots'], [{ name: 'Count', values: [view.waitlistDemand, view.eligibleWaitlist, view.unfilledReleasedSlots, view.unbookedSlots] }], 'appointments', 'Eligible candidates are a contactable share of demand. Openings are not automatically booked.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Recovery Opportunities by Lead Time', view.outcomeByLead.map((item) => item.name), [{ name: 'Cancelled (release pool)', values: view.outcomeByLead.map((item) => item.cancelled) }], 'appointments', 'Cancellation volume by lead-time band — early notice feeds the release/rebooking pool. No-shows are excluded from early release.')} />
        </div>
      </div>
      <Slot span="span-12" figure={fig('bars', 'Current vs Scenario Slot Fill Rate', ['Current fill', 'Scenario +10 pts'], [{ name: 'Fill %', values: [
        Math.round(view.slotFillRate * 1000) / 10,
        Math.round(view.scenarioFillRate * 1000) / 10,
      ] }], '%', `Illustrative fill improvement capped near 99.5%. Current ${pct(view.slotFillRate)} · scenario ${pct(view.scenarioFillRate)}. Not a validated forecast.`)} />
      <IndicatorIndex indicators={appointmentIndicatorsFor(view)} domains={['Recovery & Optimization']} />
      <AiIndex />
    </Page>
  );
}
