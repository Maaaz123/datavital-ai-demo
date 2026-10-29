import { useMemo, useState, type ReactNode } from 'react';
import { useShowcase } from '@/showcase/state';
import { alertsFor } from './alerts';
import { APPOINTMENT_AI_CASES, appointmentIndicatorsFor, type Indicator } from './appointmentScope';
import { buildAppointmentView, type AppointmentView } from './appointmentView';
import { useCopilot } from './Copilot';
import { usePeriod } from './period';
import { Chart, ChartStage, type Figure } from './viz';

const PALETTE = ['#0f6e6a', '#1e3a5f', '#8c6a3d', '#4d6b8a', '#6e8b74', '#7c5c7a'];

type Detail = {
  name: string;
  value: string;
  definition: string;
  scope: string;
  formula?: string;
  limitations?: string;
};
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

/** Prior-year comparison labels kept short so ribbon cards never clip. */
function compare(view: View, prior: View, pick: (item: View) => number, asRate = false): string {
  const now = pick(view);
  const then = pick(prior);
  if (!Number.isFinite(now) || !Number.isFinite(then) || then === 0) return 'Illustrative';
  const delta = asRate ? now - then : (now - then) / Math.abs(then);
  if (Math.abs(delta) < 0.005) return 'No change';
  if (asRate) {
    const points = delta * 100;
    return `${points > 0 ? '+' : '−'}${Math.abs(points).toFixed(1)} pts`;
  }
  const change = delta * 100;
  return `${change > 0 ? '+' : '−'}${Math.abs(change).toFixed(1)}% YoY`;
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
            key={`${item.name}-${item.detail.name}`}
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
          <p><strong>{open.value}</strong></p>
          <p>{open.definition}</p>
          {open.formula ? <p>Formula: {open.formula}</p> : null}
          <p>{open.scope}</p>
          {open.limitations ? <p>{open.limitations}</p> : null}
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

function score(
  display: string,
  value: string,
  delta: string,
  fullName: string,
  definition: string,
  scope: string,
  extras?: { formula?: string; limitations?: string; testId?: string; tone?: Tone },
) {
  return {
    name: display,
    value,
    delta,
    tone: extras?.tone ?? 'neutral',
    testId: extras?.testId,
    detail: {
      name: fullName,
      value,
      definition,
      scope,
      formula: extras?.formula,
      limitations: extras?.limitations,
    },
  };
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
        <p>Review no-show and fill rates while attendance is {pct(view.attendanceRate)}, slot fill is {pct(view.slotFillRate)}, and 3rd next available is {num(view.thirdNextAvailable)} days (observation {view.observationDate}).</p>
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
      score('Scheduled', num(view.booked), compare(view, prior, (item) => item.booked), 'Scheduled Appointments',
        'Booked appointments in the selected hospital and period.',
        `${num(view.booked)} booked · ${view.periodLabel}.`,
        { formula: 'Attended + Cancelled + No-show = Scheduled', testId: 'value-kpi_appt_scheduled', tone: 'neutral' }),
      score('Attended', num(view.attended), compare(view, prior, (item) => item.attended), 'Attended Appointments',
        'Attended scheduled appointments. Equals OPD attended visits for the same hospital and period.',
        `${num(view.attended)} attended · OPD match ${num(view.opdAttended)}.`,
        { formula: 'Attended appointments in the booked cohort', tone: 'good' }),
      score('Attendance Rate', pct(view.attendanceRate), compare(view, prior, (item) => item.attendanceRate, true), 'Attendance Rate',
        'Share of scheduled appointments that were attended.',
        `${num(view.attended)} / ${num(view.booked)}.`,
        { formula: 'Attended ÷ Scheduled', tone: rateTone(view.attendanceRate, 0.88, 0.82, false) }),
      score('No-show Rate', pct(view.noShowRate), compare(view, prior, (item) => item.noShowRate, true), 'No-show Rate',
        'Share of scheduled appointments that were no-shows. Count detail is on Attendance & No-show Intelligence.',
        `${num(view.noShow)} no-shows of ${num(view.booked)} scheduled.`,
        { formula: 'No-show Appointments ÷ Scheduled', tone: rateTone(view.noShowRate, 0.05, 0.08) }),
      score('Cancellation Rate', pct(view.cancellationRate), compare(view, prior, (item) => item.cancellationRate, true), 'Cancellation Rate',
        'Share of scheduled appointments that were cancelled. Late-cancel detail is on Attendance & No-show Intelligence.',
        `${num(view.cancelled)} cancelled of ${num(view.booked)} scheduled.`,
        { formula: 'Cancelled Appointments ÷ Scheduled', tone: rateTone(view.cancellationRate, 0.06, 0.1) }),
      score('Rescheduled', num(view.rescheduled), compare(view, prior, (item) => item.rescheduled), 'Rescheduled Appointments',
        'Reschedule events in the period — not a mutually exclusive attendance outcome.',
        `${num(view.rescheduled)} reschedule events.`,
        { formula: 'Count of reschedule events', tone: 'neutral', limitations: 'Rescheduling can overlap the attended/cancelled/no-show partition.' }),
      score('New Appt. Share', pct(view.newShare), 'Illustrative', 'New Appointment Share',
        'New appointments as a share of booked. New + Follow-up = Scheduled.',
        `${num(view.newAppointments)} new.`,
        { formula: 'New Appointments ÷ Scheduled', limitations: 'Illustrative scenario share — not a measured YoY trend.' }),
      score('Follow-up Share', pct(view.followUpShare), 'Illustrative', 'Follow-up Appointment Share',
        'Follow-up appointments as the remainder of booked.',
        `${num(view.followUpAppointments)} follow-up.`,
        { formula: 'Follow-up Appointments ÷ Scheduled', limitations: 'Illustrative scenario share — not a measured YoY trend.' }),
    ]}>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('area', 'Demand vs Bookings', view.labels, [
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
          <Donut packed title="Appointment Outcomes" note="Mutually exclusive partition of scheduled appointments: Attended + Cancelled + No-show." parts={[
            { name: 'Attended', value: view.attended },
            { name: 'Cancelled', value: view.cancelled },
            { name: 'No-show', value: view.noShow },
          ]} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Bookings by Specialty', view.specialties.map((item) => item.id), [{ name: 'Booked', values: view.specialties.map((item) => item.booked) }], 'appointments', 'Specialty booked shares sum to period scheduled appointments.')} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Attendance & No-show Trend', view.labels, [
            { name: 'Attendance Rate %', values: view.monthlyBooked.map((booked, index) => (booked ? Math.round((view.monthlyAttended[index] / booked) * 1000) / 10 : 0)) },
            { name: 'No-show Rate %', values: view.monthlyBooked.map((booked, index) => (booked ? Math.round((view.monthlyNoShow[index] / booked) * 1000) / 10 : 0)) },
          ], '%', 'Monthly attendance and no-show rates from monthly counts on a common percent axis.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Bookings by Channel', view.channels.map((item) => item.id), [{ name: 'Booked', values: view.channels.map((item) => item.count) }], 'appointments', 'Constructed scenario channel mix. Channels sum to period scheduled appointments — not a live booking-system extract.')} />
        </div>
      </div>
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
      score('Median Lead Time', `${num(view.leadMedian, 1)} days`, compare(view, prior, (item) => item.leadMedian), 'Median Booking Lead Time',
        'Median days from booking/request to scheduled visit. Not clinic waiting after arrival.',
        `${num(view.leadMedian, 1)} days · ${view.periodLabel}.`,
        { formula: 'Median(scheduled visit date − booking/request date)', testId: 'value-kpi_appt_lead', tone: view.leadMedian >= 14 ? 'alert' : view.leadMedian >= 10 ? 'watch' : 'good' }),
      score('P90 Lead Time', `${num(view.leadP90, 1)} days`, compare(view, prior, (item) => item.leadP90), 'P90 Booking Lead Time',
        '90th-percentile booking lead time for the same measurement window.',
        `P90 ${num(view.leadP90, 1)} days.`,
        { formula: '90th percentile of booking lead time', tone: view.leadP90 >= 28 ? 'alert' : 'watch' }),
      score('3rd Next Available', `${num(view.thirdNextAvailable)} days`, compare(view, prior, (item) => item.thirdNextAvailable), 'Third Next Available Appointment',
        `Calendar days until the third eligible routine appointment opening in the illustrative scheduling scenario. Observation date ${view.observationDate}.`,
        `Openings: ${view.thirdNextOpenings.join(', ')} days.`,
        { formula: '3rd ordered eligible routine opening from observation date', tone: view.thirdNextAvailable >= 18 ? 'alert' : 'watch', limitations: 'Illustrative schedule, not real-time hospital availability.' }),
      score('Bookable Slots', num(view.slots), compare(view, prior, (item) => item.slots), 'Bookable Slots',
        'Eligible bookable slots in the selected period.',
        `${num(view.slots)} slots.`,
        { formula: 'Sum of specialty eligible bookable slots' }),
      score('Unbooked Slots', num(view.unbookedSlots), compare(view, prior, (item) => item.unbookedSlots), 'Unbooked Slots',
        'Period unbooked capacity. Distinct from 7-Day Open Slots (future openings sketch).',
        `${num(view.unbookedSlots)} unbooked in period.`,
        { formula: 'Bookable Slots − Booked Slots', tone: view.unbookedSlots < view.slots * 0.05 ? 'alert' : 'good', limitations: 'Historical period unused capacity — not a live “available now” queue.' }),
      score('Slot Fill Rate', pct(view.slotFillRate), compare(view, prior, (item) => item.slotFillRate, true), 'Slot Fill Rate',
        'Share of eligible bookable slots that were booked.',
        `${num(view.booked)} booked / ${num(view.slots)} bookable.`,
        { formula: 'Booked Slots ÷ Bookable Slots', tone: rateTone(view.slotFillRate, 0.9, 0.82, false) }),
      score('Capacity Shortfall', num(view.capacityShortfall), compare(view, prior, (item) => item.capacityShortfall), 'Capacity Shortfall',
        'Unmet demand versus eligible bookable slots — not unbooked capacity.',
        `${num(view.demand)} demand vs ${num(view.slots)} slots.`,
        { formula: 'max(0, Appointment Demand − Bookable Slots)', tone: view.capacityShortfall > 0 ? 'watch' : 'good' }),
      score('Pressure Sessions', num(view.sessionsWithPressure), compare(view, prior, (item) => item.sessionsWithPressure), 'High-Pressure Clinic Sessions',
        'Illustrative sessions under scheduling pressure from relative lead time and unfilled share.',
        `${num(view.sessionsWithPressure)} sessions · hottest specialty ${hottest?.id ?? 'n/a'}.`,
        { formula: 'Count of sessions above illustrative pressure threshold', tone: 'watch', limitations: 'Illustrative index — not a validated scheduling-risk score.' }),
      score('7-Day Open Slots', num(view.next7DayOpenSlots), compare(view, prior, (item) => item.next7DayOpenSlots), 'Next 7-Day Open Slots',
        `Deterministic illustrative openings for the 7 days after ${view.observationDate}.`,
        `${num(view.next7DayOpenSlots)} openings in the week sketch.`,
        { formula: 'Sum of daily openings in the 7-day sketch', limitations: 'Not historical vacancies ÷ 365 and not a live inventory.' }),
    ]}>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Lead Time Trend', view.labels, [{ name: 'Median days', values: view.monthlyLead }], 'days', 'Illustrative monthly median lead time. Distinct from OPD arrival-to-provider. Owned here — not duplicated on Command Center.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Lead Time by Specialty', view.specialties.map((item) => item.id), [{ name: 'Median lead days', values: view.specialties.map((item) => item.leadMedian) }], 'days', `Specialty lead times around hospital median ${num(view.leadMedian, 1)}. Highest pressure: ${hottest?.id ?? 'n/a'}.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', '3rd Available by Specialty', view.specialties.map((item) => item.id), [{ name: 'Days', values: view.specialties.map((item) => item.thirdNextDays) }], 'days', `Third eligible opening per specialty from ordered illustrative openings. Observation ${view.observationDate}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Booked vs Unbooked', ['Booked', 'Unbooked'], [{ name: 'Share of bookable %', values: [
            Math.round(view.slotFillRate * 1000) / 10,
            Math.round((1 - view.slotFillRate) * 1000) / 10,
          ] }], '%', `Shares of ${num(view.slots)} bookable slots. Booked ${num(view.booked)} · Unbooked ${num(view.unbookedSlots)}.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Demand vs Capacity', ['Demand', 'Bookable', 'Booked'], [{ name: 'Appointments', values: [view.demand, view.slots, view.booked] }], 'appointments', 'Demand may exceed bookable slots. Booked never exceeds bookable slots in this scenario.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', '7-Day Open Slots', view.futureOpenSlots.map((item) => item.name), [{ name: 'Openings', values: view.futureOpenSlots.map((item) => item.count) }], 'slots', `Illustrative openings after ${view.observationDate}. Daily counts sum to ${num(view.next7DayOpenSlots)}.`)} />
        </div>
      </div>
      <Slot span="span-12" figure={fig('bars', 'Scheduling Pressure', view.specialties.map((item) => item.id), [{ name: 'Pressure index', values: view.specialties.map((item) => Math.round(item.accessPressure * 100) / 100) }], 'index', 'Illustrative index from relative lead time and unfilled share. Not a validated scheduling-risk or clinical-priority score.')} />
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
      score('No-show Rate', pct(view.noShowRate), compare(view, prior, (item) => item.noShowRate, true), 'No-show Rate',
        'Share of scheduled appointments that were no-shows.',
        `${num(view.noShow)} / ${num(view.booked)}.`,
        { formula: 'No-show Appointments ÷ Scheduled', testId: 'value-kpi_appt_noshow', tone: rateTone(view.noShowRate, 0.05, 0.08) }),
      score('No-show Count', num(view.noShow), compare(view, prior, (item) => item.noShow), 'No-show Appointments',
        'No-show appointments in the booked cohort — volume companion to No-show Rate for specialty drill-down.',
        `${num(view.noShow)} no-shows.`,
        { formula: 'Count of no-show appointments', tone: 'watch' }),
      score('Late Cancel Rate', pct(view.lateCancelRate), compare(view, prior, (item) => item.lateCancelRate, true), 'Late Cancellation Rate',
        'Same-day / <48h cancellations as a share of scheduled appointments.',
        `${num(view.lateCancellations)} late cancels.`,
        { formula: 'Late Cancellations ÷ Scheduled', tone: 'watch', limitations: 'Late = Same day / <48h notice. Mutually exclusive with earlier notice bins.' }),
      score('Lost Slots', num(view.lostBookedSlots), compare(view, prior, (item) => item.lostBookedSlots), 'Slots Lost to No-shows & Late Cancellations',
        'Slots unused at appointment time from no-shows plus late cancellations. Not permanent loss if early release + rebooking recovers capacity.',
        `${num(view.noShow)} no-shows + ${num(view.lateCancellations)} late cancels.`,
        { formula: 'No-show Appointments + Late Cancellations', tone: 'alert', limitations: 'Does not equal residual capacity loss after recovery.' }),
      score('Highest No-show Rate', pct(hottestNoShow?.noShowRate ?? 0), hottestNoShow?.id ?? 'Specialty', 'Highest Specialty No-show Rate',
        `Highest specialty no-show rate in the period: ${hottestNoShow?.id ?? 'n/a'}.`,
        `${hottestNoShow?.id ?? 'n/a'} · ${num(hottestNoShow?.noShow ?? 0)} no-shows.`,
        { formula: 'max(specialty No-show Rate)', tone: 'watch' }),
      score('Reminder Coverage', pct(view.reminderCoverage), compare(view, prior, (item) => item.reminderCoverage, true), 'Appointment Reminder Coverage',
        'Illustrative reminder coverage of booked appointments.',
        `${pct(view.reminderCoverage)} covered.`,
        { formula: 'Reminded appointments ÷ Scheduled', tone: 'neutral', limitations: 'Not evidence of causal attendance lift.' }),
    ]}>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'No-show Trend', view.labels, [{ name: 'No-show Rate %', values: view.monthlyBooked.map((booked, index) => (booked ? Math.round((view.monthlyNoShow[index] / booked) * 1000) / 10 : 0)) }], '%', 'Monthly no-show rate from monthly counts.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'No-shows by Specialty', view.specialties.map((item) => item.id), [{ name: 'No-shows', values: view.specialties.map((item) => item.noShow) }], 'appointments', `Specialty no-shows sum to ${num(view.noShow)}.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Attendance & No-shows by Day', view.outcomesByDay.map((item) => item.name), [
            { name: 'Attended', values: view.outcomesByDay.map((item) => item.attended) },
            { name: 'No-show', values: view.outcomesByDay.map((item) => item.noShow) },
          ], 'appointments', 'Weekday attended and no-show counts. Each weekday still reconciles Attended + Cancelled + No-show = Booked.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Cancellations by Notice', view.cancelTimingCounts.map((item) => item.name), [{ name: 'Cancellations', values: view.cancelTimingCounts.map((item) => item.count) }], 'appointments', `Mutually exclusive notice bins sum to ${num(view.cancelled)} cancellations. Late = Same day / <48h.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Outcomes by Lead Time', view.outcomeByLead.map((item) => item.name), [
            { name: 'Attended', values: view.outcomeByLead.map((item) => item.attended) },
            { name: 'No-show', values: view.outcomeByLead.map((item) => item.noShow) },
          ], 'appointments', 'Lead-time bands partition booked appointments and reconcile to period totals.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Lost Slots by Specialty', view.specialties.map((item) => item.id), [{ name: 'Lost slots', values: view.specialties.map((item) => item.lostSlots) }], 'slots', 'No-shows + late cancellations by specialty. Not permanent loss if early release + rebooking recovers the slot.')} />
        </div>
      </div>
      <Slot span="span-12" figure={fig('line', 'Reminders vs Attendance', view.labels, [
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
      score('Released Slots', num(view.releasedSlots), compare(view, prior, (item) => item.releasedSlots), 'Released Appointment Slots',
        'Slots released before appointment start from cancellations with advance notice. No-shows do not release early enough to rebook.',
        `${num(view.releasedSlots)} released · eligible ${num(view.eligibleReleasedSlots)}.`,
        { formula: 'Cancellations with advance notice that free the slot before start' }),
      score('Rebooked Slots', num(view.recoveredSlots), compare(view, prior, (item) => item.recoveredSlots), 'Rebooked Released Slots',
        'Released slots with a confirmed replacement booking. Recovered ≤ eligible released.',
        `${num(view.recoveredSlots)} rebooked.`,
        { formula: 'Confirmed replacement bookings into released slots', tone: 'good' }),
      score('Recovery Rate', pct(view.recoveryRate), compare(view, prior, (item) => item.recoveryRate, true), 'Slot Recovery Rate',
        'Share of eligible released slots that were rebooked.',
        `${num(view.recoveredSlots)} / ${num(view.eligibleReleasedSlots)}.`,
        { formula: 'Rebooked Slots ÷ Eligible Released Slots', tone: rateTone(view.recoveryRate, 0.45, 0.3, false) }),
      score('Unscheduled Demand', num(view.waitlistDemand), compare(view, prior, (item) => item.waitlistDemand), 'Unscheduled Appointment Demand',
        'Unbooked demand waiting for a slot — recovery demand signal.',
        `${num(view.waitlistDemand)} waiting.`,
        { formula: 'Appointment Demand − Booked', tone: 'watch' }),
      score('Eligible Waitlist', num(view.eligibleWaitlist), compare(view, prior, (item) => item.eligibleWaitlist), 'Eligible Waitlist Candidates',
        'Waitlist patients matching appointment availability (contactable/eligible share of demand).',
        `${num(view.eligibleWaitlist)} eligible.`,
        { formula: 'Contactable eligible share of Unscheduled Demand' }),
      score('Rebooking Potential', num(view.potentialRebookingOpportunities), compare(view, prior, (item) => item.potentialRebookingOpportunities), 'Potential Rebooking Opportunities',
        'Feasible candidate–slot matches before openings expire. Capped by eligible candidates and openings.',
        `${num(view.potentialRebookingOpportunities)} opportunities.`,
        { formula: 'min(Eligible Waitlist, Eligible openings before expiry)', tone: 'watch' }),
      score('Unfilled Releases', num(view.unfilledReleasedSlots), compare(view, prior, (item) => item.unfilledReleasedSlots), 'Unfilled Released Slots',
        'Released capacity without a confirmed replacement booking.',
        `${num(view.unfilledReleasedSlots)} still open.`,
        { formula: 'Released Slots − Rebooked Slots', tone: view.unfilledReleasedSlots > 20 ? 'alert' : 'watch' }),
      score('Potential Recoveries', num(view.estimatedAdditionalRecoveries), compare(view, prior, (item) => item.estimatedAdditionalRecoveries), 'Estimated Additional Recoveries',
        'Illustrative additional confirmed bookings under improved outreach. Distinct from Unfilled Releases.',
        `${num(view.estimatedAdditionalRecoveries)} feasible extras.`,
        { formula: 'Illustrative feasible extras under outreach scenario', tone: 'watch', limitations: 'Not equal to unfilled released unless the scenario says so. Not an implemented operational gain.' }),
    ]}>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Released vs Rebooked', view.labels, [
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
            <p className="gc-next">A released slot is recovered only when rebooked. No-shows do not release early. AI does not change schedules alone. Slot fill and period unbooked capacity remain in Access charts and what-if baselines.</p>
          </section>
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Recovery Rate Trend', view.labels, [{ name: 'Recovery Rate %', values: view.monthlyRecovery.map((value) => Math.round(value * 1000) / 10) }], '%', 'Monthly rebooked ÷ eligible released.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Unfilled Releases by Specialty', view.specialties.map((item) => item.id), [{ name: 'Unfilled released', values: view.specialties.map((item) => item.unfilledReleased) }], 'slots', `Specialty unfilled released sums to ${num(view.unfilledReleasedSlots)}.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Waitlist vs Openings', ['Unscheduled demand', 'Eligible candidates', 'Unfilled released', 'Unbooked slots'], [{ name: 'Count', values: [view.waitlistDemand, view.eligibleWaitlist, view.unfilledReleasedSlots, view.unbookedSlots] }], 'appointments', 'Eligible candidates are a contactable share of demand. Period unbooked slots shown for context — not released lifecycle.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Cancellations by Lead Time', view.outcomeByLead.map((item) => item.name), [{ name: 'Cancelled (release pool)', values: view.outcomeByLead.map((item) => item.cancelled) }], 'appointments', 'Cancellation volume by lead-time band — early notice feeds the release/rebooking pool. No-shows are excluded from early release.')} />
        </div>
      </div>
      <Slot span="span-12" figure={fig('bars', 'Current vs Scenario Fill', ['Current fill', 'Scenario +10 pts'], [{ name: 'Fill %', values: [
        Math.round(view.slotFillRate * 1000) / 10,
        Math.round(view.scenarioFillRate * 1000) / 10,
      ] }], '%', `Illustrative fill improvement capped near 99.5%. Current ${pct(view.slotFillRate)} · scenario ${pct(view.scenarioFillRate)}. Not a validated forecast.`)} />
      <IndicatorIndex indicators={appointmentIndicatorsFor(view)} domains={['Recovery & Optimization']} />
      <AiIndex />
    </Page>
  );
}
