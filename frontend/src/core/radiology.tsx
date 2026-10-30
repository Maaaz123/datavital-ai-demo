import { useMemo, useState, type ReactNode } from 'react';
import { useShowcase } from '@/showcase/state';
import { alertsFor } from './alerts';
import { RADIOLOGY_AI_CASES, radiologyIndicatorsFor, type Indicator } from './radiologyScope';
import { buildRadiologyView, type RadiologyView } from './radiologyView';
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
type View = RadiologyView;

function useView(): View {
  const store = useShowcase();
  const { period } = usePeriod();
  return useMemo(() => buildRadiologyView(store.hospital, store.year, period), [store.hospital, store.year, period]);
}

function usePrior(): View {
  const store = useShowcase();
  const { period } = usePeriod();
  const year = store.year <= 2024 ? 2024 : store.year - 1;
  return useMemo(() => buildRadiologyView(store.hospital, year, period), [store.hospital, year, period]);
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

function rateTone(value: number, watch: number, alert: number, higherWorse = true): Tone {
  if (higherWorse) {
    if (value >= alert) return 'alert';
    if (value >= watch) return 'watch';
    return 'good';
  }
  if (value <= alert) return 'alert';
  if (value <= watch) return 'watch';
  return 'good';
}

function score(
  name: string,
  value: string,
  delta: string,
  fullName: string,
  definition: string,
  scope: string,
  extra?: { formula?: string; limitations?: string; testId?: string; tone?: Tone },
) {
  return {
    name,
    value,
    delta,
    tone: extra?.tone,
    testId: extra?.testId,
    detail: {
      name: fullName,
      value,
      definition,
      scope,
      formula: extra?.formula,
      limitations: extra?.limitations,
    } satisfies Detail,
  };
}

function Page({ title, kpis, children }: { title: string; kpis: { name: string; value: string; delta: string; tone?: Tone; testId?: string; detail: Detail }[]; children: ReactNode }) {
  const [open, setOpen] = useState<Detail | null>(null);
  return (
    <article className="gc-command gc-ed">
      <header className="gc-command-head">
        <div>
          <p className="gc-kicker">Radiology & Diagnostic Imaging</p>
          <h1>{title}</h1>
        </div>
      </header>
      <div className="gc-ribbon" data-testid="rad-ribbon">
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
  return { type, title, categories, series, unit, digits, note, domain: 'radiology', subjects: [title], ...extra };
}

function Alerts({ packed = false }: { packed?: boolean } = {}) {
  const store = useShowcase();
  const copilot = useCopilot();
  const view = useView();
  const { period } = usePeriod();
  const alerts = alertsFor(store.hospital, store.year).filter((alert) => alert.department === 'Radiology' && alert.severity !== 'info');
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
              Radiology within management thresholds · open Vital Assist
            </button>
          </li>
        )}
      </ul>
      {period === 'year' ? null : <p>These alerts use the full reporting year. The scores above use the selected period.</p>}
      <div className="gc-next">
        <h2>Management action</h2>
        <p>Review scanner utilization ({pct(view.scannerUtilization)}), imaging backlog ({num(view.closingBacklog)}), and median report TAT ({num(view.medianReportTatHours, 1)} h) for {view.periodLabel}.</p>
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
  const rows = indicators.filter((item) => domains.includes(item.domain) && (reveal || item.status !== 'unavailable'));
  return (
    <section className="gc-panel" data-testid="rad-indicator-catalog">
      <h2>Performance indicators</h2>
      <p className="gc-next">
        Definition catalog for this screen — full names, formulas, units, and ownership. Headline numbers stay in the KPI ribbon above. Bed occupancy stays in Beds; OR utilization stays in Surgery; clinic slots stay in Appointments.
      </p>
      <div className="gc-scope-grid">
        {rows.map((item) => (
          <article
            key={`${item.domain}-${item.name}`}
            className="gc-scope-card"
            title={[item.method, item.cohort, item.aggregation, item.scope, item.limitations].filter(Boolean).join(' · ')}
            data-catalog="definition"
          >
            <strong>{item.name}</strong>
            <em>{item.summary}</em>
            <span className={`gc-scope-status is-${item.status === 'unavailable' ? 'missing' : item.status === 'scenario' ? 'live' : 'estimated'}`}>
              {item.status === 'unavailable' ? 'Owned elsewhere' : item.status === 'scenario' ? 'Scenario' : 'Constructed'}
            </span>
          </article>
        ))}
      </div>
      <button type="button" className="gc-text-btn" aria-pressed={reveal} onClick={() => setReveal((value) => !value)}>
        {reveal ? 'Hide indicators not available in this view' : 'Show indicators not available in this view'}
      </button>
    </section>
  );
}

function AiIndex() {
  return (
    <section className="gc-panel">
      <h2>AI decision support</h2>
      <p className="gc-next">Illustrative imaging capacity intelligence · not a validated RIS/PACS engine</p>
      <div className="gc-scope-grid">
        {RADIOLOGY_AI_CASES.map((item) => (
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

export function RadCommandPage() {
  const view = useView();
  const prior = usePrior();
  return (
    <Page title="Imaging Command Center" kpis={[
      score('Imaging Requests', num(view.requests), compare(view, prior, (item) => item.requests), 'Diagnostic Imaging Requests',
        'Imaging orders/requests in the selected hospital and period.',
        `${num(view.requests)} requests · ${view.periodLabel}.`,
        { formula: 'Completed + Cancelled + No-show + Pending = Requests', testId: 'value-kpi_rad_requests', tone: 'neutral' }),
      score('Completed Exams', num(view.completed), compare(view, prior, (item) => item.completed), 'Completed Diagnostic Exams',
        'Examinations completed in the period. Distinct from final report signature.',
        `${num(view.completed)} exams completed · ${num(view.signedReports)} final reports signed.`,
        { formula: 'Exam completed (lifecycle). Signed reports are a separate reporting KPI.', tone: 'good', limitations: 'Completed Exams ≠ Signed Reports. Unsigned reports age separately.' }),
      score('Completion Rate', pct(view.completionRate), compare(view, prior, (item) => item.completionRate, true), 'Imaging Exam Completion Rate',
        'Completed exams as a share of requests.',
        `${num(view.completed)} of ${num(view.requests)}.`,
        { formula: 'Completed ÷ Requests', tone: rateTone(view.completionRate, 0.9, 0.85, false) }),
      score('Urgent Exam Share', pct(view.urgentShare), 'Illustrative', 'Urgent Imaging Exam Share',
        'Illustrative urgent share of imaging requests.',
        `${num(view.urgentRequests)} urgent · ${num(view.routineRequests)} routine.`,
        { formula: 'Urgent requests ÷ Requests', limitations: 'Illustrative 18% urgent share — not a clinical triage system.' }),
      score('Pending Exams', num(view.pending), compare(view, prior, (item) => item.pending), 'Pending Imaging Examinations',
        'Examination-lifecycle requests not yet completed, cancelled, or no-show at observation.',
        `${num(view.pending)} pending exams at ${view.observationDate}.`,
        { formula: 'Requests − Completed − Cancelled − No-show', tone: view.pending > 0 ? 'watch' : 'good', limitations: 'Pending exams are not unsigned reports.' }),
    ]}>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('area', 'Imaging Demand Trend', view.labels, [
            { name: 'Requests', values: view.monthlyRequests },
            { name: 'Completed', values: view.monthlyCompleted },
          ], 'exams', 'Monthly requests and completed exams. Months sum to period totals.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Alerts packed />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Exam Outcomes', ['Completed', 'Cancelled', 'No-show', 'Pending'], [{ name: 'Exams', values: [view.completed, view.cancelled, view.noShows, view.pending] }], 'exams', 'Mutually exclusive outcomes. Sum equals Imaging Requests.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Completed Exams by Modality', view.modalities.map((item) => item.id), [{ name: 'Completed', values: view.modalities.map((item) => item.completed) }], 'exams', `Modality completed sum to ${num(view.completed)}.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Imaging Demand by Care Setting', view.careSettings.map((item) => item.name), [{ name: 'Requests', values: view.careSettings.map((item) => item.requests) }], 'requests', 'ED / inpatient / outpatient request mix. ED arrival KPIs stay in Emergency.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Urgent vs Routine Mix', ['Urgent', 'Routine'], [{ name: 'Requests', values: [view.urgentRequests, view.routineRequests] }], 'requests', 'Illustrative priority mix. Waiting time alone is not clinical urgency.')} />
        </div>
      </div>
      <IndicatorIndex indicators={radiologyIndicatorsFor(view)} domains={['Imaging Activity']} />
    </Page>
  );
}

export function RadAccessPage() {
  const view = useView();
  const prior = usePrior();
  const hottest = [...view.modalities].sort((a, b) => b.backlog - a.backlog)[0];
  return (
    <Page title="Imaging Access & Waitlist" kpis={[
      score('Imaging Backlog', num(view.closingBacklog), compare(view, prior, (item) => item.closingBacklog), 'Active Diagnostic Imaging Backlog',
        'Active imaging waitlist at period end from the monthly ledger.',
        `Closing ${num(view.closingBacklog)} · ${view.observationDate}.`,
        { formula: 'Opening + Added − Completed from waitlist − Other exits', testId: 'value-kpi_rad_backlog', tone: view.closingBacklog > 200 ? 'watch' : 'neutral' }),
      score('Median Access Wait', `${num(view.medianAccessWaitDays, 1)} days`, compare(view, prior, (item) => item.medianAccessWaitDays), 'Median Request-to-Exam Wait Time',
        'Median active waitlist age at observation — same population as wait bands and overdue.',
        `${num(view.medianAccessWaitDays, 1)} days · target ${view.waitTargetDays} days.`,
        { formula: 'Median of active backlog wait ages', tone: view.medianAccessWaitDays >= view.waitTargetDays ? 'alert' : view.medianAccessWaitDays >= 10 ? 'watch' : 'good', limitations: 'Active backlog age — not historical completed-exam wait and not report TAT.' }),
      score('P90 Access Wait', `${num(view.p90AccessWaitDays, 1)} days`, compare(view, prior, (item) => item.p90AccessWaitDays), 'P90 Request-to-Exam Wait Time',
        '90th-percentile active waitlist age at observation.',
        `P90 ${num(view.p90AccessWaitDays, 1)} days.`,
        { formula: 'P90 of active backlog wait ages', tone: 'watch' }),
      score('Overdue Imaging', num(view.overdueImaging), compare(view, prior, (item) => item.overdueImaging), 'Imaging Cases Beyond Access Target',
        `Active backlog cases with wait age > ${view.waitTargetDays} days (same distribution as median/P90/bands).`,
        `${num(view.overdueImaging)} of ${num(view.closingBacklog)} backlog.`,
        { formula: `Count(active wait age > ${view.waitTargetDays})`, tone: view.overdueImaging > 40 ? 'alert' : 'watch', limitations: 'Illustrative management target — not a verified national standard.' }),
      score('Waitlist Growth', num(view.waitlistGrowth), compare(view, prior, (item) => item.waitlistGrowth), 'Imaging Waitlist Growth',
        'Net change in imaging backlog during the period (closing − opening).',
        `Opening ${num(view.openingBacklog)} → closing ${num(view.closingBacklog)}.`,
        { formula: 'Closing − Opening', tone: view.waitlistGrowth > 0 ? 'watch' : 'good', limitations: 'Growth can be negative while closing backlog remains positive.' }),
      score('Within Access Target', pct(view.withinAccessTarget), compare(view, prior, (item) => item.withinAccessTarget, true), 'Imaging Cases Within Access Target',
        'Share of backlog inside the illustrative access target.',
        `${num(view.withinTargetCases)} within target.`,
        { formula: 'Within-target backlog ÷ Closing backlog', tone: rateTone(view.withinAccessTarget, 0.75, 0.6, false) }),
    ]}>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Imaging Backlog Trend', view.labels, [{ name: 'Active backlog', values: view.monthlyBacklog }], 'cases', 'Month-end waitlist from monthly ledger. Snapshot inventory — do not sum months.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Wait Time by Modality', view.modalities.map((item) => item.id), [{ name: 'Median days', values: view.modalities.map((item) => item.medianWait) }], 'days', `Largest backlog modality: ${hottest?.id ?? 'n/a'} (${num(hottest?.backlog ?? 0)}).`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Backlog by Priority', view.backlogByPriority.map((item) => item.name), [{ name: 'Cases', values: view.backlogByPriority.map((item) => item.count) }], 'cases', 'Priority partition of closing backlog. Waiting time alone is not clinical urgency.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Access Wait Bands', view.waitBands.map((item) => item.name), [{ name: 'Cases', values: view.waitBands.map((item) => item.count) }], 'cases', `Wait bands partition closing backlog (${num(view.closingBacklog)}).`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'New Demand vs Completed Waitlist', ['Added to waitlist', 'Completed from waitlist', 'Other exits', 'Closing backlog'], [{ name: 'Cases', values: [view.addedToWaitlist, view.completedFromWaitlist, view.otherExits, view.closingBacklog] }], 'cases', 'Waitlist flow components for the period. Cancelled exams do not automatically exit the waitlist.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Overdue Exams by Modality', view.modalities.map((item) => item.id), [{ name: 'Overdue', values: view.modalities.map((item) => item.overdue) }], 'cases', `Modality overdue sums to ${num(view.overdueImaging)}.`)} />
        </div>
      </div>
      <IndicatorIndex indicators={radiologyIndicatorsFor(view)} domains={['Imaging Access']} />
    </Page>
  );
}

export function RadUtilizationPage() {
  const view = useView();
  const prior = usePrior();
  return (
    <Page title="Modality Utilization & Scheduling" kpis={[
      score('Scanner Utilization', pct(view.scannerUtilization), compare(view, prior, (item) => item.scannerUtilization, true), 'Diagnostic Scanner Utilization',
        'In-session used hours ÷ staffed scanner hours. Overtime reported separately.',
        `${num(view.inSessionUsed)} in-session / ${num(view.staffedHours)} staffed · OT ${num(view.overtimeHours)} h · downtime ${num(view.downtimeHours)} h.`,
        { formula: 'In-session used hours ÷ Staffed scanner hours (overtime separate)', testId: 'value-kpi_rad_util', tone: rateTone(view.scannerUtilization, 0.75, 0.65, false) }),
      score('Unused Hours', `${num(view.unusedHours)} h`, compare(view, prior, (item) => item.unusedHours), 'Unused Staffed Scanner Hours',
        'Staffed hours neither used for exams nor counted as downtime.',
        `${num(view.unusedHours)} unused of ${num(view.staffedHours)} staffed.`,
        { formula: 'Staffed − in-session used − downtime', tone: view.unusedHours > view.staffedHours * 0.2 ? 'watch' : 'good' }),
      score('Median Exam Time', `${num(view.medianExamMin)} min`, compare(view, prior, (item) => item.medianExamMin), 'Median Examination Duration',
        'Volume-weighted median exam duration across modalities.',
        `${num(view.medianExamMin)} min · modality-specific durations.`,
        { formula: 'Weighted median of modality exam minutes', tone: 'neutral' }),
      score('Scanner Downtime', `${num(view.downtimeHours)} h`, compare(view, prior, (item) => item.downtimeHours), 'Diagnostic Scanner Downtime',
        'Downtime inside the staffed denominator.',
        `${num(view.downtimeHours)} downtime hours.`,
        { formula: 'Documented downtime within staffed sessions', tone: view.downtimeHours > view.staffedHours * 0.1 ? 'alert' : 'watch' }),
      score('Schedule Adherence', pct(view.scheduleAdherence), compare(view, prior, (item) => item.scheduleAdherence, true), 'Imaging Schedule Adherence Rate',
        'Share of exams starting within the illustrative on-schedule window.',
        `${pct(view.scheduleAdherence)} on schedule.`,
        { formula: 'On-schedule starts ÷ eligible scheduled starts', tone: rateTone(view.scheduleAdherence, 0.78, 0.7, false) }),
    ]}>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Utilization by Scanner', view.scanners.map((item) => item.id), [{ name: 'Utilization %', values: view.scanners.map((item) => Math.round(item.utilization * 1000) / 10) }], '%', `In-session ÷ staffed per scanner. Hospital util ${pct(view.scannerUtilization)}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Staffed vs Used Hours', ['Allocated', 'Staffed', 'In-session', 'Downtime', 'Unused', 'Overtime'], [{ name: 'Hours', values: [view.allocatedHours, view.staffedHours, view.inSessionUsed, view.downtimeHours, view.unusedHours, view.overtimeHours] }], 'hours', 'Staffed = in-session + downtime + unused. Total used = in-session + overtime.')} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Utilization by Modality', view.modalities.map((item) => item.id), [{ name: 'In-session hours', values: view.modalities.map((item) => item.inSessionUsed) }], 'hours', 'Modality in-session hours sum to hospital in-session used. Durations differ by modality.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Downtime Reasons', view.downtimeReasons.map((item) => item.name), [{ name: 'Hours', values: view.downtimeReasons.map((item) => item.hours) }], 'hours', `Downtime reasons sum to ${num(view.downtimeHours)} h.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Exam Duration by Modality', view.modalities.map((item) => item.id), [{ name: 'Median min', values: view.modalities.map((item) => item.examMin) }], 'min', `Hospital volume-weighted median ${num(view.medianExamMin)} min.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Monthly Scanner Utilization', view.labels, [{ name: 'Utilization %', values: view.monthlyUtil }], '%', 'Month-level used ÷ staffed approximation. Schedule Adherence remains the period headline KPI.')} />
        </div>
      </div>
      <IndicatorIndex indicators={radiologyIndicatorsFor(view)} domains={['Scanner Efficiency']} />
    </Page>
  );
}

export function RadQualityPage() {
  const view = useView();
  const prior = usePrior();
  return (
    <Page title="Reporting & Imaging Quality" kpis={[
      score('Median Report TAT', `${num(view.medianReportTatHours, 1)} h`, compare(view, prior, (item) => item.medianReportTatHours), 'Median Final Report Turnaround Time',
        'Median final signature minus exam completion for signed reports only.',
        `${num(view.medianReportTatHours, 1)} h · ${num(view.signedReports)} signed · target ${view.reportTatTargetHours} h.`,
        { formula: 'Final signature − Exam completion (signed cohort)', testId: 'value-kpi_rad_tat', tone: view.medianReportTatHours > view.reportTatTargetHours ? 'alert' : view.medianReportTatHours > 18 ? 'watch' : 'good', limitations: 'Unsigned reports are aged separately — they do not have a completed TAT.' }),
      score('P90 Report TAT', `${num(view.p90ReportTatHours, 1)} h`, compare(view, prior, (item) => item.p90ReportTatHours), 'P90 Final Report Turnaround Time',
        '90th-percentile final report turnaround for signed reports.',
        `P90 ${num(view.p90ReportTatHours, 1)} h.`,
        { formula: 'P90 of signed-report TAT hours', tone: 'watch' }),
      score('Reports Over Target', num(view.reportsOverTarget), compare(view, prior, (item) => item.reportsOverTarget), 'Final Reports Over TAT Target',
        `Signed reports with TAT above the illustrative ${view.reportTatTargetHours}-hour target.`,
        `${num(view.reportsOverTarget)} of ${num(view.signedReports)} signed.`,
        { formula: `Signed reports with TAT > ${view.reportTatTargetHours} h`, tone: view.reportsOverTarget > completedWatch(view.signedReports) ? 'alert' : 'watch' }),
      score('Unsigned Reports', num(view.unsignedReports), compare(view, prior, (item) => item.unsignedReports), 'Unsigned Diagnostic Reports',
        'Open unsigned reports at observation (exam completed, signature pending).',
        `${num(view.unsignedReports)} unsigned of ${num(view.completed)} completed exams.`,
        { formula: 'Completed exams − Signed reports at observation', tone: view.unsignedReports > 40 ? 'alert' : 'watch' }),
      score('Repeat Exam Rate', pct(view.repeatExamRate), compare(view, prior, (item) => item.repeatExamRate, true), 'Diagnostic Exam Repeat Rate',
        'Repeat exams ÷ completed. Technical and clinically justified repeats are both counted.',
        `${num(view.repeatExams)} repeats (${num(view.technicalRepeats)} technical · ${num(view.clinicalRepeats)} clinical/protocol).`,
        { formula: 'Repeat exams ÷ Completed', tone: rateTone(view.repeatExamRate, 0.035, 0.05), limitations: 'Not every repeat is an avoidable quality failure.' }),
      score('Critical Ack. Rate', pct(view.criticalAckRate), compare(view, prior, (item) => item.criticalAckRate, true), 'Critical Result Acknowledgement Rate',
        'Acknowledged critical results ÷ critical results. Distinct from delay rate.',
        `${num(view.criticalAcked)} ack · ${num(view.criticalPendingAck)} pending (${pct(view.criticalDelayRate)} delay rate).`,
        { formula: 'Acknowledged ÷ Critical results', tone: rateTone(view.criticalAckRate, 0.92, 0.88, false), limitations: 'Ack. rate is not a delay rate. Delay rate = pending ack ÷ critical results.' }),
    ]}>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Report TAT Trend', view.labels, [{ name: 'Median hours', values: view.monthlyReportTat }], 'hours', 'Monthly median final report TAT. Unsigned reports are excluded from completed TAT.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Report TAT by Modality', view.modalities.map((item) => item.id), [{ name: 'Median hours', values: view.modalities.map((item) => item.reportTatHours) }], 'hours', `Hospital median ${num(view.medianReportTatHours, 1)} h.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Unsigned Report Aging', view.unsignedAging.map((item) => item.name), [{ name: 'Reports', values: view.unsignedAging.map((item) => item.count) }], 'reports', `Aging bands sum to ${num(view.unsignedReports)}. Not completed TAT.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Repeat Exams by Modality', view.modalities.map((item) => item.id), [{ name: 'Repeats', values: view.modalities.map((item) => item.repeats) }], 'exams', `Modality repeats sum to ${num(view.repeatExams)}.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Completed Exams by Care Setting', view.careSettings.map((item) => item.name), [{ name: 'Completed exams', values: view.careSettings.map((item) => item.completed) }], 'exams', 'Report-eligible completed exams by originating care setting. Not request volume. Inpatient LOS stays in Inpatient.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Critical Result Communication', ['Critical results', 'Acknowledged', 'Pending ack'], [{ name: 'Events', values: [view.criticalResults, view.criticalAcked, view.criticalPendingAck] }], 'events', `Ack rate ${pct(view.criticalAckRate)} · delay rate ${pct(view.criticalDelayRate)}. Distinct from final report signature.`)} />
        </div>
      </div>
      <IndicatorIndex indicators={radiologyIndicatorsFor(view)} domains={['Reporting Quality', 'Cross-domain context']} />
    </Page>
  );
}

function completedWatch(completed: number): number {
  return Math.max(30, Math.round(completed * 0.18));
}

export function RadOptimizationPage() {
  const view = useView();
  const prior = usePrior();
  return (
    <Page title="Imaging Capacity Optimization" kpis={[
      score('Recoverable Hours', `${num(view.recoverableHours)} h`, compare(view, prior, (item) => item.recoverableHours), 'Potentially Recoverable Scanner Hours',
        'Sum of modality-specific exclusive delay drivers. Access-gain % of staffed lives in Details.',
        `${num(view.recoverableHours)} h · modeled uplift ${num(view.accessGainPct, 1)}% of staffed.`,
        { formula: 'Σ modality exclusive drivers', testId: 'value-kpi_rad_recoverable', tone: view.recoverableHours > 80 ? 'watch' : 'neutral', limitations: 'Modeled opportunity — not achieved capacity. Modalities are not interchangeable.' }),
      score('Additional Exams', num(view.additionalExams), compare(view, prior, (item) => item.additionalExams), 'Feasible Additional Imaging Exams',
        'Sum of modality-feasible extras (modality duration × modality recovered hours × modality demand).',
        `${num(view.additionalExams)} of ${num(view.potentialAdditionalExams)} hour-feasible · capped by modality-eligible waitlist.`,
        { formula: 'Σ_m min(floor(feasible_m ÷ examHours_m), eligible_m)', tone: 'watch', limitations: 'Illustrative — not an achieved result. MRI hours do not become CT exams.' }),
      score('Eligible Waitlist', num(view.eligibleWaitlist), compare(view, prior, (item) => item.eligibleWaitlist), 'Eligible Imaging Waitlist Cases',
        'Sum of modality-eligible waitlist cases that could use recovered capacity.',
        `${num(view.eligibleWaitlist)} of ${num(view.closingBacklog)} backlog.`,
        { formula: 'Σ modality eligible demand' }),
    ]}>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Recoverable Hours by Driver', view.delayDriverHours.map((item) => item.name), [{ name: 'Hours', values: view.delayDriverHours.map((item) => item.hours) }], 'hours', 'Exclusive drivers rolled up from modality calculations — sum equals Recoverable Hours. Bed is a haircut on inpatient-eligible share only.')} />
        </div>
        <div className="gc-ed-pack-col">
          <section className="gc-panel gc-insight">
            <h2>Management decisions</h2>
            <div className="gc-exception-list">
              <div className="gc-exception gc-tone-watch"><strong>Reduce MRI exam duration</strong><span>Median {num(view.modalities.find((item) => item.id === 'MRI')?.examMin ?? 0)} min</span></div>
              <div className="gc-exception gc-tone-alert"><strong>Cut CT downtime</strong><span>{num(view.ctDowntimeHours)} h CT downtime</span></div>
              <div className="gc-exception gc-tone-neutral"><strong>Extend staffed hours</strong><span>{num(view.staffedHours)} staffed h</span></div>
              <div className="gc-exception gc-tone-watch"><strong>Improve report TAT</strong><span>Median {num(view.medianReportTatHours, 1)} h</span></div>
              <div className="gc-exception gc-tone-neutral"><strong>Reallocate routine slots</strong><span>{view.totalScanners} scanners</span></div>
              <div className="gc-exception gc-tone-watch"><strong>Prioritize eligible backlog</strong><span>+{num(view.additionalExams)} feasible</span></div>
            </div>
            <p className="gc-next">Estimates are illustrative. AI does not change clinical imaging priority or RIS schedules alone.</p>
          </section>
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Current vs Scenario Capacity', ['Staffed hours', 'In-session', 'Recoverable', 'Scenario in-session'], [{ name: 'Hours', values: [
            view.staffedHours,
            view.inSessionUsed,
            view.recoverableHours,
            Math.min(view.staffedHours, view.inSessionUsed + view.capacityGainHours),
          ] }], 'hours', 'Baseline vs illustrative scenario in-session hours. Scenario is not achieved capacity.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Additional Exams by Modality', view.modalities.map((item) => item.id), [{ name: 'Feasible extras', values: view.modalities.map((item) => item.additionalExams) }], 'exams', `Modality extras sum to ${num(view.additionalExams)}. Computed per modality — not a shared hour pool.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Access Backlog Reduction', ['Closing backlog', 'Eligible waitlist', 'Additional exams', 'Residual backlog'], [{ name: 'Cases', values: [
            view.closingBacklog,
            view.eligibleWaitlist,
            view.additionalExams,
            Math.max(0, view.closingBacklog - view.additionalExams),
          ] }], 'cases', 'Illustrative backlog draw-down if feasible modality-compatible exams are scheduled.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Capacity Constraints', ['Recoverable hours', 'Bed-constrained hours', 'Usable recovered hours'], [{ name: 'Hours', values: [
            view.recoverableHours,
            view.bedConstrainedHours,
            view.feasibleRecoverableHours,
          ] }], 'hours', `Inpatient-eligible bed haircut ${(view.bedConstrainedShare * 100).toFixed(0)}% · occ context ${pct(view.bedOccupancyContext)}. Does not constrain all outpatient imaging. Bed Occupancy stays in Beds.`)} />
        </div>
      </div>
      <IndicatorIndex indicators={radiologyIndicatorsFor(view)} domains={['Capacity Optimization', 'Cross-domain context']} />
      <AiIndex />
    </Page>
  );
}
