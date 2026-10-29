import { useMemo, useState, type ReactNode } from 'react';
import { useShowcase } from '@/showcase/state';
import { alertsFor } from './alerts';
import { useCopilot } from './Copilot';
import { OPD_AI_CASES, opdIndicatorsFor, type Indicator } from './opdScope';
import { buildOpdView, type OpdView } from './opdView';
import { usePeriod } from './period';
import { Chart, ChartStage, type Figure } from './viz';

const PALETTE = ['#0f6e6a', '#1e3a5f', '#8c6a3d', '#4d6b8a', '#6e8b74', '#7c5c7a'];

type Detail = { name: string; value: string; definition: string; scope: string };
type Tone = 'good' | 'watch' | 'alert' | 'neutral';
type View = OpdView;

function useView(): View {
  const store = useShowcase();
  const { period } = usePeriod();
  return useMemo(() => buildOpdView(store.hospital, store.year, period), [store.hospital, store.year, period]);
}

function usePrior(): View {
  const store = useShowcase();
  const { period } = usePeriod();
  const year = store.year <= 2024 ? 2024 : store.year - 1;
  return useMemo(() => buildOpdView(store.hospital, year, period), [store.hospital, year, period]);
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
          <p className="gc-kicker">Outpatient Department</p>
          <h1>{title}</h1>
        </div>
      </header>
      <div className="gc-ribbon" data-testid="opd-ribbon">
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
  const digits = unit === '%' || unit === 'min' || unit === 'visits/session' ? 1 : 0;
  return { type, title, categories, series, unit, digits, note, domain: 'outpatient', subjects: [title], ...extra };
}

function score(name: string, value: string, delta: string, definition: string, scope: string, testId?: string, tone: Tone = 'neutral') {
  return { name, value, delta, tone, testId, detail: { name, value, definition, scope } };
}

function waitTone(minutes: number): Tone {
  if (minutes >= 40) return 'alert';
  if (minutes >= 28) return 'watch';
  return 'good';
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
  const alerts = alertsFor(store.hospital, store.year).filter((alert) => alert.department === 'Outpatient' && alert.severity !== 'info');
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
              Clinic flow within review lines · open Vital Assist
            </button>
          </li>
        )}
      </ul>
      {period === 'year' ? null : <p>These alerts use the full reporting year. The scores above use the selected period.</p>}
      <div className="gc-next">
        <h2>Management action</h2>
        <p>Review waiting and session utilization on Clinic Waiting & Patient Flow while median arrival-to-provider is {num(view.waitMedian, 1)} minutes and visit completion is {pct(view.completionRate)}.</p>
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
          <p>Figures for this view. Appointment booking KPIs stay outside Outpatient ownership.</p>
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
          <p>Illustrative outpatient intelligence · not a validated clinic optimizer</p>
        </div>
      </div>
      <div className="gc-scope-grid">
        {OPD_AI_CASES.map((item) => (
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
              <text x="60" y="74" textAnchor="middle" className="gc-donut-label">visits</text>
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

export function OpdOverviewPage() {
  const view = useView();
  const prior = usePrior();
  return (
    <Page title="Outpatient Performance Overview" kpis={[
      score('Total outpatient visits', num(view.visits), compare(view, prior, (item) => item.visits), 'Attended clinic visits in the selected hospital and reporting period. Derived from the scenario appointment-attended cohort — not ED visits and not inpatient admissions.', `${num(view.visits)} visits · ${view.periodLabel}.`, 'value-kpi_opd_visits', 'neutral'),
      score('Completed consultations', num(view.completed), compare(view, prior, (item) => item.completed), 'Visits with a completed consultation. Incomplete visits remain in the attended cohort.', `${num(view.completed)} of ${num(view.visits)}.`, undefined, 'good'),
      score('Unique outpatients', num(view.uniqueOutpatients), compare(view, prior, (item) => item.uniqueOutpatients), 'Illustrative unique-patient count. Visits are not linked patient-by-patient.', `${num(view.uniqueOutpatients)} patients.`, undefined, 'neutral'),
      score('New patient visits', num(view.newVisits), compare(view, prior, (item) => item.newVisits), 'New visits share of attended visits. New + follow-up = total visits.', `${num(view.newVisits)} new visits.`, undefined, 'watch'),
      score('Follow-up visits', num(view.followUpVisits), compare(view, prior, (item) => item.followUpVisits), 'Follow-up visits are the remainder after new visits.', `${num(view.followUpVisits)} follow-up visits.`, undefined, 'neutral'),
      score('Visit completion rate', pct(view.completionRate), compare(view, prior, (item) => item.completionRate, true), 'Completed consultations ÷ attended visits.', `${num(view.completed)} / ${num(view.visits)}.`, undefined, rateTone(view.completionRate, 0.93, 0.9, false)),
      score('Walk-in visit share', pct(view.walkInShare), compare(view, prior, (item) => item.walkInShare, true), 'Walk-in share of attended visits. Appointment booking performance stays outside OPD.', `${num(view.walkInVisits)} walk-ins.`, undefined, 'watch'),
      score('Same-day visit volume', num(view.sameDayVisits), compare(view, prior, (item) => item.sameDayVisits), 'Same-day clinic visits inside the attended cohort.', `${num(view.sameDayVisits)} same-day visits.`, undefined, 'neutral'),
      score('Clinic session utilization', pct(view.sessionUtilization), compare(view, prior, (item) => item.sessionUtilization, true), 'Illustrative filled clinic capacity share for sessions in the period.', `${pct(view.sessionUtilization)} of session capacity.`, undefined, rateTone(view.sessionUtilization, 0.82, 0.7, false)),
      score('Visits per clinic session', num(view.visitsPerSession, 1), compare(view, prior, (item) => item.visitsPerSession), 'Attended visits ÷ clinic sessions.', `${num(view.visits)} visits / ${num(view.clinicSessions)} sessions.`, undefined, 'neutral'),
    ]}>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('area', 'Outpatient visits over time', view.labels, [{ name: 'Visits', values: view.monthlyVisits }], 'visits', 'Monthly attended clinic visits sum to the selected period total.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Alerts packed />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Visits by clinical specialty', view.specialties.map((item) => item.id), [{ name: 'Visits', values: view.specialties.map((item) => item.visits) }], 'visits', 'Specialty shares sum to period attended visits.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Donut packed title="New vs follow-up visits" note="New + follow-up = attended visits. Booking no-shows stay outside OPD." parts={[
            { name: 'New', value: view.newVisits },
            { name: 'Follow-up', value: view.followUpVisits },
          ]} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Clinic activity by day', view.visitsByDay.map((item) => item.name), [{ name: 'Visits', values: view.visitsByDay.map((item) => item.count) }], 'visits', 'Constructed weekday mix. The seven days sum to period visits.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Completed vs incomplete visits', ['Completed', 'Incomplete'], [{ name: 'Share of visits', values: [
            Math.round(view.completionRate * 1000) / 10,
            Math.round((1 - view.completionRate) * 1000) / 10,
          ] }], '%', `Shares of ${num(view.visits)} attended visits (sum to 100%). Shown as percentages so the incomplete share stays readable beside completed volume.`)} />
        </div>
      </div>
      <Slot span="span-12" figure={fig('bars', 'Clinic session utilization by specialty', view.specialties.map((item) => item.id), [{ name: 'Utilization', values: view.specialties.map((item) => Math.round(item.sessionUtilization * 1000) / 10) }], '%', 'Illustrative session utilization by specialty. Not an appointment slot-fill KPI.')} />
      <IndicatorIndex indicators={opdIndicatorsFor(view)} domains={['Outpatient Demand & Activity']} />
    </Page>
  );
}

export function OpdFlowPage() {
  const view = useView();
  const prior = usePrior();
  const topDelay = [...view.specialties].sort((a, b) => b.delayContribution - a.delayContribution)[0];
  return (
    <Page title="Clinic Waiting & Patient Flow" kpis={[
      score('Median arrival-to-provider time', `${num(view.waitMedian, 1)} min`, compare(view, prior, (item) => item.waitMedian), 'Median minutes from clinic arrival to first provider start. Not ED door-to-provider and not consultation duration.', `Median ${num(view.waitMedian, 1)} minutes · ${view.periodLabel}.`, 'value-kpi_opd_wait_median', waitTone(view.waitMedian)),
      score('P90 arrival-to-provider time', `${num(view.waitP90, 1)} min`, compare(view, prior, (item) => item.waitP90), '90th-percentile arrival-to-provider for the same visits.', `P90 ${num(view.waitP90, 1)} minutes.`, undefined, view.waitP90 >= 55 ? 'alert' : view.waitP90 >= 40 ? 'watch' : 'good'),
      score('Median clinic cycle time', `${num(view.cycleMedian, 1)} min`, compare(view, prior, (item) => item.cycleMedian), 'Arrival-to-provider median + consultation duration.', `Median cycle ${num(view.cycleMedian, 1)} minutes.`, undefined, view.cycleMedian >= 55 ? 'alert' : view.cycleMedian >= 42 ? 'watch' : 'good'),
      score('P90 clinic cycle time', `${num(view.cycleP90, 1)} min`, compare(view, prior, (item) => item.cycleP90), 'Arrival-to-provider P90 + stretched consultation duration.', `P90 cycle ${num(view.cycleP90, 1)} minutes.`, undefined, view.cycleP90 >= 75 ? 'alert' : 'watch'),
      score('Registration-to-consultation time', `${num(view.registrationToConsult, 1)} min`, compare(view, prior, (item) => item.registrationToConsult), 'Illustrative post-registration share of arrival-to-provider.', `${num(view.registrationToConsult, 1)} minutes.`, undefined, 'watch'),
      score('Consultation duration', `${num(view.consultDuration, 1)} min`, compare(view, prior, (item) => item.consultDuration), 'Illustrative consult length. Distinct from waiting and from total cycle time.', `${num(view.consultDuration, 1)} minutes.`, undefined, 'neutral'),
      score('Visits exceeding waiting threshold', num(view.exceedingWait), compare(view, prior, (item) => item.exceedingWait), `Visits with arrival-to-provider above the ${view.waitThresholdMin}-minute scenario review line.`, `${num(view.exceedingWait)} of ${num(view.visits)}.`, undefined, view.exceedingWait > view.visits * 0.15 ? 'alert' : 'watch'),
      score('On-time consultation start rate', pct(view.onTimeStartRate), compare(view, prior, (item) => item.onTimeStartRate, true), 'Share of consultations starting within the scenario on-time window.', `${pct(view.onTimeStartRate)} on time.`, undefined, rateTone(view.onTimeStartRate, 0.75, 0.65, false)),
      score('Delayed clinic sessions', num(view.delayedSessions), compare(view, prior, (item) => item.delayedSessions), 'Sessions with delayed first-provider starts.', `${num(view.delayedSessions)} of ${num(view.clinicSessions)} sessions.`, undefined, view.delayedSessions > 20 ? 'alert' : 'watch'),
      score('Visits completed within target time', num(view.withinTarget), compare(view, prior, (item) => item.withinTarget), 'Visits finishing inside the scenario cycle-time target.', `${num(view.withinTarget)} · ${pct(view.withinTargetRate)}.`, undefined, 'good'),
    ]}>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Waiting time trend', view.labels, [{ name: 'Median arrival-to-provider', values: view.monthlyWait }], 'min', 'Monthly median arrival-to-provider. Not consultation duration and not ED waiting.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Waiting time by specialty', view.specialties.map((item) => item.id), [{ name: 'Median minutes', values: view.specialties.map((item) => item.waitMedian) }], 'min', 'Specialty medians around the hospital arrival-to-provider median. Raw gaps are not proof of care quality.')} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('area', 'Arrival demand by hour', view.hourLabels, [{ name: 'Arrivals', values: view.arrivalsByHour }], 'visits', 'Constructed clinic-hour shape of period arrivals (07:00–18:00). Hours sum to period visits.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('area', 'Consultation starts by hour', view.hourLabels, [{ name: 'Starts', values: view.startsByHour }], 'visits', 'Constructed first-provider starts by clinic hour. Kept separate from arrival demand so start delays stay visible.')} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Waiting time distribution', view.waitDistribution.map((item) => item.name), [{ name: 'Visits', values: view.waitDistribution.map((item) => item.count) }], 'visits', `Visit bins shaped around the ${num(view.waitMedian, 1)}-minute median. Bins sum to period visits.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Clinic cycle time by specialty', view.specialties.map((item) => item.id), [{ name: 'Median minutes', values: view.specialties.map((item) => item.cycleMedian) }], 'min', 'Cycle time = waiting + consultation duration by specialty.')} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Patient flow stage volumes', ['Arrived', 'Registered', 'In consultation', 'Completed'], [{ name: 'Visits', values: [
            view.visits,
            Math.round(view.visits * 0.97),
            view.completed,
            view.completed,
          ] }], 'visits', 'Pathway volumes for the same period. Registered and completed are subsets of arrived — not four additive populations. Top delay specialty: ' + (topDelay?.id ?? 'n/a') + '.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Delay contribution by clinic', view.specialties.map((item) => item.id), [{ name: 'Visits over threshold', values: view.specialties.map((item) => item.delayContribution) }], 'visits', `Specialty contributions sum to ${num(view.exceedingWait)} visits above the ${view.waitThresholdMin}-minute waiting review line.`)} />
        </div>
      </div>
      <IndicatorIndex indicators={opdIndicatorsFor(view)} domains={['Clinic Waiting & Flow']} />
    </Page>
  );
}

export function OpdQualityPage() {
  const view = useView();
  const prior = usePrior();
  return (
    <Page title="Outpatient Quality & Follow-up" kpis={[
      score('Consultation completion rate', pct(view.completionRate), compare(view, prior, (item) => item.completionRate, true), 'Completed consultations ÷ attended visits.', `${num(view.completed)} / ${num(view.visits)}.`, undefined, rateTone(view.completionRate, 0.93, 0.9, false)),
      score('Clinical documentation completion', pct(view.docCompletionRate), compare(view, prior, (item) => item.docCompletionRate, true), 'Illustrative documentation completion share. Not extracted chart notes.', `${pct(view.docCompletionRate)} documented.`, undefined, rateTone(view.docCompletionRate, 0.85, 0.78, false)),
      score('Consultation note completion', pct(view.noteCompletionRate), compare(view, prior, (item) => item.noteCompletionRate, true), 'Illustrative note completion share.', `${pct(view.noteCompletionRate)} notes complete.`, undefined, rateTone(view.noteCompletionRate, 0.86, 0.8, false)),
      score('Follow-up plan documentation', pct(view.followUpPlanRate), compare(view, prior, (item) => item.followUpPlanRate, true), 'Illustrative follow-up plan documentation share.', `${pct(view.followUpPlanRate)} with a plan.`, undefined, rateTone(view.followUpPlanRate, 0.8, 0.72, false)),
      score('Follow-up recommendation rate', pct(view.followUpRecommendRate), compare(view, prior, (item) => item.followUpRecommendRate, true), 'Share of completed consultations with a follow-up recommendation.', `${pct(view.followUpRecommendRate)} of completed.`, undefined, 'neutral'),
      score('Referral completion rate', pct(view.referralCompletionRate), compare(view, prior, (item) => item.referralCompletionRate, true), 'Completed clinical referrals ÷ recommended referrals in the scenario.', `${pct(view.referralCompletionRate)} completed.`, undefined, rateTone(view.referralCompletionRate, 0.8, 0.7, false)),
      score('Pending clinical referrals', num(view.pendingReferrals), compare(view, prior, (item) => item.pendingReferrals), 'Open clinical referrals awaiting completion.', `${num(view.pendingReferrals)} open.`, undefined, view.pendingReferrals > 40 ? 'alert' : 'watch'),
      score('Unplanned outpatient return rate', pct(view.unplannedReturnRate), 'Scenario share', 'Illustrative unplanned return share of completed consultations. Visits are not linked patient-by-patient.', `${num(view.unplannedReturns)} of ${num(view.completed)}.`, undefined, rateTone(view.unplannedReturnRate, 0.03, 0.045)),
      score('Outstanding clinical actions', num(view.outstandingActions), compare(view, prior, (item) => item.outstandingActions), 'Open clinical actions after the visit.', `${num(view.outstandingActions)} open actions.`, undefined, view.outstandingActions > 35 ? 'alert' : 'watch'),
      score('Follow-up coordination completion', pct(view.followUpCoordRate), compare(view, prior, (item) => item.followUpCoordRate, true), 'Illustrative coordination completion share.', `${pct(view.followUpCoordRate)} coordinated.`, undefined, rateTone(view.followUpCoordRate, 0.78, 0.7, false)),
    ]}>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Documentation completion trend', view.labels, [{ name: 'Documentation completion %', values: view.monthlyDoc.map((value) => Math.round(value * 1000) / 10) }], '%', 'Illustrative monthly documentation completion. Not extracted EMR documents.')} />
        </div>
        <div className="gc-ed-pack-col">
          <section className="gc-panel gc-insight">
            <h2>Quality watch list</h2>
            <div className="gc-exception-list">
              <div className={`gc-exception gc-tone-${rateTone(view.docCompletionRate, 0.85, 0.78, false)}`}>
                <strong>Documentation completion</strong>
                <span>{pct(view.docCompletionRate)} illustrative</span>
              </div>
              <div className={`gc-exception gc-tone-${view.pendingReferrals > 40 ? 'alert' : 'watch'}`}>
                <strong>Pending clinical referrals</strong>
                <span>{num(view.pendingReferrals)} open</span>
              </div>
              <div className={`gc-exception gc-tone-${view.outstandingActions > 35 ? 'alert' : 'watch'}`}>
                <strong>Outstanding clinical actions</strong>
                <span>{num(view.outstandingActions)} open</span>
              </div>
            </div>
            <p className="gc-next">Appointment no-show and slot-fill KPIs stay outside Outpatient ownership.</p>
          </section>
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Follow-up recommendations by specialty', view.specialties.map((item) => item.id), [{ name: 'Recommendations', values: view.specialties.map((item) => item.followRecommendations) }], 'visits', 'Follow-up recommendations constructed around completed consultations by specialty.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Referral status breakdown', ['Open', 'In progress', 'Completed'], [{ name: 'Referrals', values: [view.referralOpen, view.referralInProgress, view.referralCompleted] }], 'referrals', `Open, in-progress, and completed clinical referrals in the scenario (${num(view.referralTotal)} shown).`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Pending clinical actions by specialty', view.specialties.map((item) => item.id), [{ name: 'Open actions', values: view.specialties.map((item) => item.pendingActions) }], 'actions', `Specialty shares sum to ${num(view.outstandingActions)} outstanding clinical actions.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Consultation outcomes', view.outcomes.map((item) => item.id), [{ name: 'Share of visits', values: view.outcomes.map((item) => (view.visits ? Math.round((item.count / view.visits) * 1000) / 10 : 0)) }], '%', `Outcome shares of ${num(view.visits)} attended visits. Referred-onward is also counted inside completed consultations.`)} />
        </div>
      </div>
      <Slot span="span-12" figure={fig('line', 'Follow-up coordination trend', view.labels, [{ name: 'Coordination completion %', values: view.monthlyFollowCoord.map((value) => Math.round(value * 1000) / 10) }], '%', 'Illustrative monthly follow-up coordination completion. Not a patient-linked care-plan extract.')} />
      <IndicatorIndex indicators={opdIndicatorsFor(view)} domains={['Outpatient Quality & Follow-up', 'Outpatient Access Context']} />
      <AiIndex />
    </Page>
  );
}
