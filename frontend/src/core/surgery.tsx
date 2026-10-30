import { useMemo, useState, type ReactNode } from 'react';
import { useShowcase } from '@/showcase/state';
import { alertsFor } from './alerts';
import { SURGERY_AI_CASES, surgeryIndicatorsFor, type Indicator } from './surgeryScope';
import { buildSurgeryView, type SurgeryView } from './surgeryView';
import { useCopilot } from './Copilot';
import { usePeriod } from './period';
import { Chart, type Figure } from './viz';

type Detail = {
  name: string;
  value: string;
  definition: string;
  scope: string;
  formula?: string;
  limitations?: string;
};
type Tone = 'good' | 'watch' | 'alert' | 'neutral';
type View = SurgeryView;

function useView(): View {
  const store = useShowcase();
  const { period } = usePeriod();
  return useMemo(() => buildSurgeryView(store.hospital, store.year, period), [store.hospital, store.year, period]);
}

function usePrior(): View {
  const store = useShowcase();
  const { period } = usePeriod();
  const year = store.year <= 2024 ? 2024 : store.year - 1;
  return useMemo(() => buildSurgeryView(store.hospital, year, period), [store.hospital, year, period]);
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
          <p className="gc-kicker">Operating Room & Surgery</p>
          <h1>{title}</h1>
        </div>
      </header>
      <div className="gc-ribbon" data-testid="surg-ribbon">
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
  const digits = unit === '%' || unit === 'days' || unit === 'hours' || unit === 'min' || unit === 'rate' || unit === 'index' ? 1 : 0;
  return { type, title, categories, series, unit, digits, note, domain: 'surgery', subjects: [title], ...extra };
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
  const alerts = alertsFor(store.hospital, store.year).filter((alert) => alert.department === 'Surgery' && alert.severity !== 'info');
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
              Surgery within management thresholds · open Vital Assist
            </button>
          </li>
        )}
      </ul>
      {period === 'year' ? null : <p>These alerts use the full reporting year. The scores above use the selected period.</p>}
      <div className="gc-next">
        <h2>Management action</h2>
        <p>Review OR utilization ({pct(view.orUtilization)}), same-day cancel rate ({pct(view.sameDayCancelRate)}), and elective backlog ({num(view.closingBacklog)}) for {view.periodLabel}.</p>
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
          <p>Surgical activity and OR operations. Bed occupancy stays in Beds & Capacity; clinic waiting stays in Outpatient.</p>
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
          <p>Illustrative surgical capacity intelligence · not a validated theatre engine</p>
        </div>
      </div>
      <div className="gc-scope-grid">
        {SURGERY_AI_CASES.map((item) => (
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

export function SurgCommandPage() {
  const view = useView();
  const prior = usePrior();
  return (
    <Page title="Surgical Command Center" kpis={[
      score('Completed Cases', num(view.completed), compare(view, prior, (item) => item.completed), 'Completed Surgeries',
        'Completed surgical cases in the selected hospital and period.',
        `${num(view.completed)} completed · ${view.periodLabel}.`,
        { formula: 'Completed cases (scenario). Completed + Cancelled = Scheduled', testId: 'value-kpi_surg_completed', tone: 'good' }),
      score('Scheduled Cases', num(view.scheduled), compare(view, prior, (item) => item.scheduled), 'Scheduled Surgical Procedures',
        'Requested/scheduled surgical cases for the period.',
        `${num(view.scheduled)} scheduled.`,
        { formula: 'Completed + Cancelled = Scheduled', testId: 'value-kpi_surg_scheduled' }),
      score('Same-Day Cancel Rate', pct(view.sameDayCancelRate), compare(view, prior, (item) => item.sameDayCancelRate, true), 'Same-Day Surgery Cancellation Rate',
        'Same-day cancellations as a share of scheduled cases.',
        `${num(view.sameDayCancels)} same-day of ${num(view.scheduled)} scheduled.`,
        { formula: 'Same-day cancellations ÷ Scheduled', tone: rateTone(view.sameDayCancelRate, 0.03, 0.05), limitations: 'Same-day share of all cancellations is illustrative (45%).' }),
      score('Emergency Share', pct(view.emergencyShare), 'Illustrative', 'Emergency Surgery Share',
        'Emergency scheduled share of scheduled cases. Elective + Emergency = Scheduled.',
        `${num(view.emergencyScheduled)} emergency · ${num(view.electiveScheduled)} elective.`,
        { formula: 'Emergency scheduled ÷ Scheduled', limitations: 'Single elective share (78%) for scheduled, completed, and cancelled partitions.' }),
      score('Cases / OR Day', num(view.throughput, 2), compare(view, prior, (item) => item.throughput), 'Surgical Throughput',
        'Completed cases per staffed theatre-day (weekday sessions).',
        `${num(view.completed)} cases / ${num(view.theatreDays)} theatre-days.`,
        { formula: 'Completed ÷ (theatres × staffed weekdays)', tone: 'neutral' }),
    ]}>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('area', 'Surgical Volume Trend', view.labels, [
            { name: 'Completed', values: view.monthlyCompleted },
            { name: 'Scheduled', values: view.monthlyScheduled },
          ], 'cases', 'Monthly scheduled and completed cases. Months sum to period totals.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Alerts packed />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Scheduled vs Completed', ['Scheduled', 'Completed', 'Cancelled'], [{ name: 'Cases', values: [view.scheduled, view.completed, view.cancelled] }], 'cases', 'Completed + Cancelled = Scheduled.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Volume by Specialty', view.specialties.map((item) => item.id), [{ name: 'Completed', values: view.specialties.map((item) => item.completed) }], 'cases', 'Specialty completed cases sum to period completed.')} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Elective vs Emergency Mix', ['Elective completed', 'Emergency completed'], [{ name: 'Cases', values: [view.electiveCompleted, view.emergencyCompleted] }], 'cases', 'Elective + Emergency completed = Completed. Emergency cases do not reduce elective backlog.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Cancellation Trend', view.labels, [
            { name: 'Cancelled', values: view.monthlyCancelled },
          ], 'cases', 'Monthly cancelled cases. Same-day cancel rate is the Command KPI (same-day ÷ scheduled).')} />
        </div>
      </div>
      <IndicatorIndex indicators={surgeryIndicatorsFor(view)} domains={['Surgical Activity']} />
    </Page>
  );
}

export function SurgOrPage() {
  const view = useView();
  const prior = usePrior();
  return (
    <Page title="OR Utilization & Scheduling" kpis={[
      score('OR Utilization', pct(view.orUtilization), compare(view, prior, (item) => item.orUtilization, true), 'Operating Room Utilization',
        'Used OR time (procedure + turnover) ÷ staffed OR hours. Uncapped — overruns appear as overtime.',
        `${num(view.usedHours)} used / ${num(view.staffedHours)} staffed · ${num(view.overtimeHours)} overtime.`,
        { formula: '(Procedure hours + Turnover hours) ÷ Staffed OR hours', testId: 'value-kpi_surg_util', tone: rateTone(view.orUtilization, 0.78, 0.7, false) }),
      score('First-Case On-Time', pct(view.firstCaseOnTimeRate), compare(view, prior, (item) => item.firstCaseOnTimeRate, true), 'First-Case On-Time Start Rate',
        'Share of eligible first cases starting on time. Eligible = staffed theatre-days.',
        `${num(view.onTimeFirstCases)} on time of ${num(view.eligibleFirstCases)} eligible.`,
        { formula: 'On-time first cases ÷ eligible first cases (theatre-days)', tone: rateTone(view.firstCaseOnTimeRate, 0.75, 0.65, false) }),
      score('Median Turnover', `${num(view.medianTurnoverMin)} min`, compare(view, prior, (item) => item.medianTurnoverMin), 'Median Operating Room Turnover Time',
        'Illustrative median minutes between cases. Turnover events = completed − theatre-days.',
        `${num(view.turnoverEvents)} turnover events · ${num(view.turnoverHours)} h.`,
        { formula: 'Median between-case turnover', tone: view.medianTurnoverMin >= 40 ? 'alert' : view.medianTurnoverMin >= 32 ? 'watch' : 'good' }),
      score('OR Overtime', `${num(view.overtimeHours)} h`, compare(view, prior, (item) => item.overtimeHours), 'Operating Room Overtime Hours',
        'Hours used beyond staffed OR hours.',
        `${num(view.overtimeHours)} overtime hours.`,
        { formula: 'max(0, Used hours − Staffed hours)', tone: view.overtimeHours > 40 ? 'watch' : 'neutral' }),
      score('Unused OR Hours', `${num(view.unusedHours)} h`, compare(view, prior, (item) => item.unusedHours), 'Unused Staffed Operating Room Hours',
        'Staffed hours not occupied by in-session procedure or turnover.',
        `${num(view.unusedHours)} unused of ${num(view.staffedHours)} staffed.`,
        { formula: 'Staffed − in-session used', tone: view.unusedHours > view.staffedHours * 0.2 ? 'watch' : 'good' }),
      score('Late Start Hours', `${num(view.lateStartHours)} h`, compare(view, prior, (item) => item.lateStartHours), 'Late Start Hours',
        'Hours lost to late first-case starts (late first cases × mean delay minutes).',
        `${num(view.lateFirstCases)} late of ${num(view.eligibleFirstCases)} eligible · ${num(view.lateStartHours)} h.`,
        { formula: 'Late first cases × mean late-start minutes ÷ 60', tone: 'watch' }),
    ]}>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'OR Utilization by Room', view.rooms.map((item) => item.id), [{ name: 'Utilization %', values: view.rooms.map((item) => Math.round(item.utilization * 1000) / 10) }], '%', `Room used ÷ staffed (distinct weights). Hospital util ${pct(view.orUtilization)}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'First-Case On-Time Trend', view.labels, [{ name: 'On-time %', values: view.monthlyFirstCase }], '%', 'Monthly on-time rate from eligible first-case counts. Period rate uses theatre-day denominator.')} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Turnover by Specialty', view.specialties.map((item) => item.id), [{ name: 'Median min', values: view.specialties.map((item) => item.turnoverMin) }], 'min', `Specialty turnover around hospital median ${num(view.medianTurnoverMin)} min.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Scheduled vs Used Hours', ['Allocated', 'Staffed', 'Used', 'Unused', 'Overtime'], [{ name: 'Hours', values: [view.allocatedHours, view.staffedHours, view.usedHours, view.unusedHours, view.overtimeHours] }], 'hours', 'OR time accounting. Used = procedure + turnover. In-session used + unused = staffed. Overtime = used beyond staffed.')} />
        </div>
      </div>
      <Slot span="span-12" figure={fig('bars', 'Late Starts by Room', view.rooms.map((item) => item.id), [{ name: 'Late start hours', values: view.rooms.map((item) => item.lateStartHours) }], 'hours', `Room late-start hours sum to ${num(view.lateStartHours)}. Recoverable delay drivers live on Capacity Optimization.`)} />
      <IndicatorIndex indicators={surgeryIndicatorsFor(view)} domains={['OR Efficiency']} />
    </Page>
  );
}

export function SurgAccessPage() {
  const view = useView();
  const prior = usePrior();
  const hottest = [...view.specialties].sort((a, b) => b.backlog - a.backlog)[0];
  return (
    <Page title="Surgical Access & Backlog" kpis={[
      score('Surgical Backlog', num(view.closingBacklog), compare(view, prior, (item) => item.closingBacklog), 'Surgical Waiting List Backlog',
        'Active elective waiting-list backlog at period end. Emergency cases do not enter this list.',
        `Closing ${num(view.closingBacklog)} · observation ${view.observationDate}.`,
        { formula: 'Opening + Added − Completed from waitlist − Other exits', testId: 'value-kpi_surg_backlog', tone: view.closingBacklog > 200 ? 'watch' : 'neutral' }),
      score('Median Wait', `${num(view.medianWaitDays, 1)} days`, compare(view, prior, (item) => item.medianWaitDays), 'Median Surgical Waiting Time',
        'Median days from decision-to-treat / waitlist entry to procedure for elective cases.',
        `${num(view.medianWaitDays, 1)} days · target ${view.waitTargetDays} days.`,
        { formula: 'Median elective wait (decision-to-treat → procedure)', tone: view.medianWaitDays >= view.waitTargetDays ? 'alert' : view.medianWaitDays >= 28 ? 'watch' : 'good', limitations: 'Not appointment booking lead time.' }),
      score('P90 Wait', `${num(view.p90WaitDays, 1)} days`, compare(view, prior, (item) => item.p90WaitDays), 'P90 Surgical Waiting Time',
        '90th-percentile elective surgical wait.',
        `P90 ${num(view.p90WaitDays, 1)} days.`,
        { formula: 'Illustrative P90 elective wait', tone: 'watch' }),
      score('Overdue Cases', num(view.overdueCases), compare(view, prior, (item) => item.overdueCases), 'Surgical Cases Beyond Wait Target',
        `Elective backlog cases beyond the illustrative ${view.waitTargetDays}-day target.`,
        `${num(view.overdueCases)} of ${num(view.closingBacklog)} backlog.`,
        { formula: `Backlog cases with wait > ${view.waitTargetDays} days`, tone: view.overdueCases > 40 ? 'alert' : 'watch', limitations: 'Illustrative target — not an official clinical benchmark.' }),
      score('Waitlist Growth', num(view.waitlistGrowth), compare(view, prior, (item) => item.waitlistGrowth), 'Waitlist Growth',
        'Net change in elective backlog during the period.',
        `Opening ${num(view.openingBacklog)} → closing ${num(view.closingBacklog)}.`,
        { formula: 'Closing backlog − Opening backlog', tone: view.waitlistGrowth > 0 ? 'watch' : 'good' }),
      score('Within Wait Target', pct(view.withinTargetShare), compare(view, prior, (item) => item.withinTargetShare, true), 'Cases Within Wait Target',
        'Share of elective backlog inside the illustrative wait target.',
        `${num(view.withinTargetCases)} within target.`,
        { formula: 'Within-target backlog ÷ Closing backlog', tone: rateTone(view.withinTargetShare, 0.75, 0.6, false) }),
    ]}>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Waiting List Trend', view.labels, [{ name: 'Active backlog', values: view.monthlyBacklog }], 'cases', 'Month-end elective backlog from monthly ledger (open + added − completed − exits = close). Snapshot — do not sum months.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Wait by Specialty', view.specialties.map((item) => item.id), [{ name: 'Median days', values: view.specialties.map((item) => item.medianWait) }], 'days', `Specialty median waits. Highest backlog: ${hottest?.id ?? 'n/a'} (${num(hottest?.backlog ?? 0)}).`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Backlog by Specialty', view.specialties.map((item) => item.id), [{ name: 'Backlog', values: view.specialties.map((item) => item.backlog) }], 'cases', `Specialty backlog sums to ${num(view.closingBacklog)}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Wait-Time Bands', view.waitBandCounts.map((item) => item.name), [{ name: 'Cases', values: view.waitBandCounts.map((item) => item.count) }], 'cases', `Wait bands partition closing backlog (${num(view.closingBacklog)}).`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Demand vs Capacity', ['Elective scheduled', 'Elective completed', 'Closing backlog'], [{ name: 'Cases', values: [view.electiveScheduled, view.electiveCompleted, view.closingBacklog] }], 'cases', 'Elective demand, completed elective throughput, and remaining backlog. Not OR hour utilization.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Overdue by Specialty', view.specialties.map((item) => item.id), [{ name: 'Overdue', values: view.specialties.map((item) => item.overdue) }], 'cases', `Specialty overdue sums to ${num(view.overdueCases)}. Waiting time alone is not clinical urgency.`)} />
        </div>
      </div>
      <IndicatorIndex indicators={surgeryIndicatorsFor(view)} domains={['Surgical Access']} />
    </Page>
  );
}

export function SurgQualityPage() {
  const view = useView();
  const prior = usePrior();
  return (
    <Page title="Surgical Quality & Safety" kpis={[
      score('Unplanned OR Returns', pct(view.unplannedReturnRate), compare(view, prior, (item) => item.unplannedReturnRate, true), 'Unplanned Return to Operating Room Rate',
        'Illustrative unplanned returns ÷ completed cases.',
        `${num(view.unplannedReturns)} of ${num(view.completed)}.`,
        { formula: 'Unplanned returns ÷ Completed', testId: 'value-kpi_surg_returns', tone: rateTone(view.unplannedReturnRate, 0.015, 0.025), limitations: 'Illustrative — not validated clinical evidence.' }),
      score('Complication Rate', pct(view.complicationRate), compare(view, prior, (item) => item.complicationRate, true), 'Surgical Complication Rate',
        'Illustrative complication flags ÷ completed cases.',
        `${num(view.complications)} flags.`,
        { formula: 'Complication flags ÷ Completed', tone: rateTone(view.complicationRate, 0.035, 0.05), limitations: view.qualityOverlapNote }),
      score('Checklist Completion', pct(view.checklistRate), compare(view, prior, (item) => item.checklistRate, true), 'Surgical Safety Checklist Completion Rate',
        'Safety checklist completed ÷ completed cases.',
        `${num(view.checklistComplete)} / ${num(view.completed)}.`,
        { formula: 'Checklists complete ÷ Completed', tone: rateTone(view.checklistRate, 0.95, 0.9, false) }),
      score('Infection Rate', pct(view.infectionRate), compare(view, prior, (item) => item.infectionRate, true), 'Postoperative Infection Rate',
        'Illustrative postoperative infection flags ÷ completed cases.',
        `${num(view.infections)} flags.`,
        { formula: 'Infection flags ÷ Completed', tone: rateTone(view.infectionRate, 0.012, 0.02), limitations: 'Illustrative synthetic flag — not surveillance-validated SSI.' }),
      score('Documentation Rate', pct(view.docCompletionRate), compare(view, prior, (item) => item.docCompletionRate, true), 'Surgical Documentation Completion',
        'Operative documentation complete ÷ completed cases.',
        `${num(view.docsComplete)} documented.`,
        { formula: 'Docs complete ÷ Completed', tone: rateTone(view.docCompletionRate, 0.9, 0.85, false) }),
      score('Escalation Rate', pct(view.escalationRate), compare(view, prior, (item) => item.escalationRate, true), 'Postoperative Escalation Rate',
        'Illustrative postoperative escalations ÷ completed cases.',
        `${num(view.escalations)} escalations.`,
        { formula: 'Escalations ÷ Completed', tone: rateTone(view.escalationRate, 0.02, 0.03), limitations: view.qualityOverlapNote }),
    ]}>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Unplanned Returns Trend', view.labels, [{ name: 'Returns', values: view.monthlyReturns }], 'cases', 'Monthly unplanned return counts sum to period total. Rate KPI uses period completed denominator.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Complications by Specialty', view.specialties.map((item) => item.id), [{ name: 'Flags', values: view.specialtyComplications }], 'flags', `Specialty complication flags sum to ${num(view.complications)}. Illustrative — not clinical risk adjustment.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Checklist Compliance Trend', view.labels, [{ name: 'Completion %', values: view.monthlyChecklist }], '%', 'Monthly checklist completion from monthly complete counts ÷ monthly completed. Process measure — distinct from outcome flags.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Safety Events by Type', view.safetyEventTypes.map((item) => item.name), [{ name: 'Events', values: view.safetyEventTypes.map((item) => item.count) }], 'events', `${view.qualityOverlapNote} Do not sum as unique patients.`)} />
        </div>
      </div>
      <Slot span="span-12" figure={fig('bars', 'Documentation by Specialty', view.specialties.map((item) => item.id), [{ name: 'Completion %', values: view.specialtyDocRates }], '%', `Specialty documentation rates from docs complete ÷ specialty completed. Completes sum to ${num(view.docsComplete)}.`)} />
      <IndicatorIndex indicators={surgeryIndicatorsFor(view)} domains={['Surgical Quality', 'Cross-domain context']} />
    </Page>
  );
}

export function SurgOptimizationPage() {
  const view = useView();
  const prior = usePrior();
  return (
    <Page title="Surgical Capacity Optimization" kpis={[
      score('Recoverable Hours', `${num(view.recoverableOrHours)} h`, compare(view, prior, (item) => item.recoverableOrHours), 'Recoverable Operating Room Hours',
        'Hours from exclusive delay drivers (late starts, excess turnover, same-day cancel blocks, equipment). Top-3 operational subset is annotated in Details — not a second headline KPI.',
        `${num(view.recoverableOrHours)} h total · top-3 operational ${num(view.avoidableDelayHours)} h.`,
        { formula: 'Sum of exclusive delay-driver hours', testId: 'value-kpi_surg_recoverable', tone: view.recoverableOrHours > 80 ? 'watch' : 'neutral' }),
      score('Additional Cases', num(view.additionalCases), compare(view, prior, (item) => item.additionalCases), 'Potential Additional Surgical Cases',
        'Feasible extra completed cases under room, staffing, bed, and backlog constraints.',
        `${num(view.additionalCases)} of ${num(view.potentialAdditionalCases)} hour-feasible · capped by eligible backlog.`,
        { formula: 'min(floor(feasible recovered hours ÷ avg case hours), eligible backlog)', tone: 'watch', limitations: 'Illustrative estimate — not an achieved result. Bed constraint is a single occupancy-tied haircut.' }),
      score('Capacity Gain', `${num(view.capacityGainHours, 1)} h`, compare(view, prior, (item) => item.capacityGainHours), 'Estimated Surgical Capacity Improvement',
        'Illustrative hours corresponding to feasible additional cases. Uplift % of staffed is derived (not a separate headline KPI).',
        `${num(view.capacityGainHours, 1)} hours · ${num(view.scenarioImprovementPct, 1)}% of staffed.`,
        { formula: 'Additional cases × average case hours', limitations: 'Modeled scenario — not implemented capacity.' }),
      score('Eligible Backlog', num(view.eligibleBacklogCases), compare(view, prior, (item) => item.eligibleBacklogCases), 'Eligible Backlog Cases',
        'Elective backlog cases that could use recovered capacity under policy.',
        `${num(view.eligibleBacklogCases)} eligible of ${num(view.closingBacklog)} backlog.`,
        { formula: 'Contactable / schedulable share of backlog + overdue priority' }),
    ]}>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Recoverable Hours by Driver', view.delayDriverHours.map((item) => item.name), [{ name: 'Hours', values: view.delayDriverHours.map((item) => item.hours) }], 'hours', 'Exclusive drivers — sum equals Recoverable Hours. Late-start driver equals Late Start Hours KPI. Bed is a haircut, not a driver.')} />
        </div>
        <div className="gc-ed-pack-col">
          <section className="gc-panel gc-insight">
            <h2>Management decisions</h2>
            <div className="gc-exception-list">
              <div className="gc-exception gc-tone-watch"><strong>Improve first-case starts</strong><span>Now {pct(view.firstCaseOnTimeRate)}</span></div>
              <div className="gc-exception gc-tone-alert"><strong>Reduce turnover time</strong><span>Median {num(view.medianTurnoverMin)} min</span></div>
              <div className="gc-exception gc-tone-watch"><strong>Cut same-day cancellations</strong><span>{pct(view.sameDayCancelRate)}</span></div>
              <div className="gc-exception gc-tone-neutral"><strong>Redistribute OR blocks</strong><span>{view.theatres} theatres</span></div>
              <div className="gc-exception gc-tone-watch"><strong>Add elective slots carefully</strong><span>+{num(view.additionalCases)} feasible</span></div>
              <div className="gc-exception gc-tone-neutral"><strong>Ease bed-related holds</strong><span>{num(view.bedRelatedCancels)} bed cancels · bed occ {pct(view.bedOccupancyContext)}</span></div>
            </div>
            <p className="gc-next">Estimates are illustrative. Bed occupancy remains owned by Beds & Capacity. AI does not change theatre schedules alone.</p>
          </section>
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Current vs Scenario Capacity', ['Staffed hours', 'Used hours', 'Recoverable', 'Scenario used'], [{ name: 'Hours', values: [
            view.staffedHours,
            view.usedHours,
            view.recoverableOrHours,
            Math.min(view.staffedHours, view.usedHours + view.capacityGainHours),
          ] }], 'hours', 'Baseline staffed/used vs recoverable and illustrative scenario used hours. Scenario is not achieved capacity.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Additional Cases by Specialty', view.specialties.map((item) => item.id), [{ name: 'Feasible extras', values: splitSpecialtyExtras(view.additionalCases, view.specialties.map((item) => item.backlog)) }], 'cases', `Specialty extras sum to ${num(view.additionalCases)}. Weighted by backlog.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Backlog Reduction Scenario', ['Closing backlog', 'Eligible backlog', 'Additional cases', 'Residual backlog'], [{ name: 'Cases', values: [
            view.closingBacklog,
            view.eligibleBacklogCases,
            view.additionalCases,
            Math.max(0, view.closingBacklog - view.additionalCases),
          ] }], 'cases', 'Illustrative backlog draw-down if feasible additional cases are scheduled. Not an operational commitment.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Capacity Constraints', ['Recoverable hours', 'Bed-constrained hours', 'Usable recovered hours'], [{ name: 'Hours', values: [
            view.recoverableOrHours,
            view.bedConstrainedHours,
            view.feasibleRecoverableHours,
          ] }], 'hours', `Bed haircut ${(view.bedConstrainedShare * 100).toFixed(0)}% from occupancy context ${pct(view.bedOccupancyContext)} (illustrative assumption — not observed bed fact). Eligible backlog cap ${num(view.eligibleBacklogCases)}. Bed Occupancy stays in Beds & Capacity.`)} />
        </div>
      </div>
      <IndicatorIndex indicators={surgeryIndicatorsFor(view)} domains={['Capacity Optimization', 'Cross-domain context']} />
      <AiIndex />
    </Page>
  );
}

function splitSpecialtyExtras(total: number, backlog: number[]): number[] {
  const sum = backlog.reduce((a, b) => a + b, 0) || 1;
  const weights = backlog.map((value) => value / sum);
  const raw = weights.map((weight) => weight * total);
  const base = raw.map((value) => Math.floor(value));
  let left = Math.round(total) - base.reduce((a, b) => a + b, 0);
  const order = raw.map((value, index) => ({ index, frac: value - Math.floor(value) })).sort((a, b) => b.frac - a.frac);
  for (let step = 0; left > 0 && step < order.length; step += 1) {
    base[order[step].index] += 1;
    left -= 1;
  }
  return base;
}
