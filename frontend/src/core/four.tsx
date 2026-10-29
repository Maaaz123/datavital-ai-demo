import { useMemo, useState, type ReactNode } from 'react';
import { scenarioFor } from '@/showcase/facts';
import { useShowcase } from '@/showcase/state';
import { alertsFor } from './alerts';
import { useCopilot } from './Copilot';
import {
  HEATMAP_BLOCKS,
  HEATMAP_DAYS,
  binsFor,
  daysFor,
  heatmapFor,
  hoursFor,
  leaveSplit,
  modesFor,
  waitHeatFor,
} from './derived';
import { sumKey, usePeriod, weighted } from './period';
import { indicatorsFor, type Indicator, type ScopeInput } from './scope';
import { Chart, ChartStage, type Figure } from './viz';

const PALETTE = ['#0f6e6a', '#1e3a5f', '#8c6a3d', '#4d6b8a', '#6e8b74'];

type Detail = { name: string; value: string; definition: string; scope: string };
type Tone = 'good' | 'watch' | 'alert' | 'neutral';

type View = ReturnType<typeof buildView>;

function buildView(hospital: string, year: number, period: ReturnType<typeof usePeriod>['period']) {
  const rows = period === 'year'
    ? scenarioFor(hospital, year).months.map((month, index) => ({ label: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index], month }))
    : (awaitRows(hospital, year, period));
  const fact = scenarioFor(hospital, year).focus;
  const arrivals = sumKey(rows, 'edArrivals');
  const admitted = sumKey(rows, 'edAdmitted');
  const discharged = sumKey(rows, 'edDischarged');
  const left = sumKey(rows, 'edLeft');
  const deaths = sumKey(rows, 'edDeaths');
  const { before, after } = leaveSplit(left);
  const median = period === 'year' ? fact.edWaitMedianMin : weighted(rows, 'edWaitMedianMin');
  const p90 = period === 'year' ? fact.edWaitP90Min : weighted(rows, 'edWaitP90Min');
  const losMedian = period === 'year' ? fact.edLosMedianMin : weighted(rows, 'edLosMedianMin');
  const losP90 = period === 'year' ? fact.edLosP90Min : weighted(rows, 'edLosP90Min');
  const losHours = (period === 'year' ? fact.edLosAvgMin : weighted(rows, 'edLosAvgMin')) / 60;
  const beds = period === 'year'
    ? { staffed: fact.staffedBeds, occupied: fact.occupiedBeds, available: fact.availableBeds, blocked: fact.blockedBeds }
    : bedSnapshot(rows);
  const occupancy = beds.staffed ? beds.occupied / beds.staffed : 0;
  const boarding = Math.round(admitted * (0.05 + occupancy * 0.06));
  const revisit = Math.round(arrivals * 0.034);
  const hours = hoursFor(arrivals);
  const heat = heatmapFor(arrivals);
  return {
    arrivals, admitted, discharged, left, deaths, before, after,
    triageCompleted: arrivals - before,
    median, p90, losMedian, losP90, losHours,
    boarding, revisit,
    labels: rows.map((row) => row.label),
    monthlyArrivals: rows.map((row) => row.month.edArrivals),
    monthlyMedian: rows.map((row) => row.month.edWaitMedianMin),
    monthlyP90: rows.map((row) => row.month.edWaitP90Min),
    monthlyLeft: rows.map((row) => row.month.edLeft),
    monthlyAdmitted: rows.map((row) => row.month.edAdmitted),
    monthlyDeaths: rows.map((row) => row.month.edDeaths),
    monthlyBoard: splitSafe(boarding, rows.map((row) => row.month.edAdmitted)),
    monthlyRevisit: splitSafe(revisit, rows.map((row) => row.month.edArrivals)),
    acuity: [0, 1, 2, 3, 4].map((level) => sumKey(rows, (['acuity1', 'acuity2', 'acuity3', 'acuity4', 'acuity5'] as const)[level])),
    hours, days: daysFor(arrivals), modes: modesFor(arrivals), heat,
    bins: binsFor(arrivals, median),
    waitHeat: waitHeatFor(heat, median),
    peaks: hours.map((count, hour) => ({ name: `${hour}:00`, count })).sort((a, b) => b.count - a.count).slice(0, 3),
  };
}

function awaitRows(hospital: string, year: number, period: 'Q1' | 'Q2' | 'Q3' | 'Q4') {
  const start = { Q1: 0, Q2: 3, Q3: 6, Q4: 9 }[period];
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return scenarioFor(hospital, year).months.slice(start, start + 3).map((month, index) => ({ label: names[start + index], month }));
}

function bedSnapshot(rows: { month: { staffedBeds: number; occupiedBeds: number; blockedBeds: number; availableBeds: number } }[]) {
  const staffed = rows[0]?.month.staffedBeds ?? 0;
  const blocked = rows[0]?.month.blockedBeds ?? 0;
  const occupied = Math.min(staffed - blocked, Math.round(rows.reduce((sum, row) => sum + row.month.occupiedBeds, 0) / Math.max(rows.length, 1)));
  return { staffed, occupied, blocked, available: staffed - occupied - blocked };
}

function splitSafe(total: number, weights: number[]): number[] {
  const safe = weights.map((value) => Math.max(value, 0));
  const sum = safe.reduce((item, value) => item + value, 0);
  if (!sum) return safe.map(() => 0);
  const raw = safe.map((value) => (value / sum) * total);
  const base = raw.map((value) => Math.floor(value));
  let left = Math.round(total) - base.reduce((item, value) => item + value, 0);
  const order = raw.map((value, index) => ({ index, frac: value - Math.floor(value) })).sort((a, b) => b.frac - a.frac);
  for (let step = 0; left > 0 && step < order.length; step += 1) {
    base[order[step].index] += 1;
    left -= 1;
  }
  return base;
}

function useView(): View {
  const store = useShowcase();
  const { period } = usePeriod();
  return useMemo(() => buildView(store.hospital, store.year, period), [store.hospital, store.year, period]);
}

function num(value: number, digits = 0): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function pct(value: number): string {
  const shown = value * 100;
  if (shown !== 0 && Math.abs(shown) < 0.1) return `${shown.toFixed(3)}%`;
  return `${shown.toFixed(1)}%`;
}

function Page({ title, kpis, children }: { title: string; kpis: { name: string; value: string; delta: string; tone?: Tone; testId?: string; detail: Detail }[]; children: ReactNode }) {
  const [open, setOpen] = useState<Detail | null>(null);
  return (
    <article className="gc-command gc-ed">
      <header className="gc-command-head">
        <div>
          <p className="gc-kicker">Emergency</p>
          <h1>{title}</h1>
        </div>
      </header>
      <div className="gc-ribbon" data-testid="ed-ribbon">
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

function Slot({ figure, span = 'span-6' }: { figure: Figure; span?: string }) {
  const copilot = useCopilot();
  return (
    <section className={`gc-panel gc-slot ${span}`}>
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
  return { type, title, categories, series, unit, digits: 0, note, domain: 'emergency', subjects: [title], ...extra };
}

function Alerts() {
  const store = useShowcase();
  const copilot = useCopilot();
  const view = useView();
  const { period } = usePeriod();
  const alerts = alertsFor(store.hospital, store.year).filter((alert) => alert.department === 'Emergency' && alert.severity !== 'info');
  return (
    <section className="gc-panel gc-insight span-4">
      <h2>Priority alerts</h2>
      <ul className="gc-alert-list">
        {alerts.map((alert) => (
          <li key={alert.id}>
            <button type="button" onClick={() => copilot.openAlert(alert, { stay: true })}>
              <span className={`gc-sev gc-sev-${alert.severity}`}>{alert.severity}</span>
              {alert.title} · {alert.observed}
            </button>
          </li>
        ))}
      </ul>
      {period === 'year'
        ? null
        : <p>These alerts use the full reporting year. The scores above use the selected period.</p>}
      <div className="gc-next">
        <h2>Management action</h2>
        <p>Review peak arrival hours on Waiting & Patient Flow while door-to-provider (median) is {num(view.median, 1)} minutes and boarding beyond 4 hours is {pct(view.admitted ? view.boarding / view.admitted : 0)}.</p>
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
        {alerts[0] ? (
          <button type="button" className="gc-text-btn" onClick={() => { copilot.openAlert(alerts[0], { stay: true }); copilot.setTab('approvals'); }}>
            Open the decision review
          </button>
        ) : <p>No open emergency alert for this hospital and year.</p>}
      </div>
    </section>
  );
}

function deltaText(current: number, prior: number, rate = false): string {
  if (current === prior) return 'No change vs baseline';
  if (rate) {
    const pp = (current - prior) * 100;
    if (Math.abs(pp) < 0.05) return 'No change vs baseline';
    return `${pp > 0 ? '+' : ''}${pp.toFixed(1)} pp`;
  }
  if (!prior) return 'New versus a zero baseline';
  const rel = ((current - prior) / Math.abs(prior)) * 100;
  return `${rel > 0 ? '+' : ''}${rel.toFixed(1)}%`;
}

function compare(view: View, prior: View, pick: (item: View) => number, rate = false): string {
  return deltaText(pick(view), pick(prior), rate);
}

function scopeInput(view: View): ScopeInput {
  return {
    arrivals: view.arrivals,
    admitted: view.admitted,
    discharged: view.discharged,
    left: view.left,
    deaths: view.deaths,
    triageCompleted: view.triageCompleted,
    median: view.median,
    p90: view.p90,
    losMedian: view.losMedian,
    losP90: view.losP90,
    boarding: view.boarding,
    revisit: view.revisit,
    modes: view.modes,
    acuity: view.acuity,
  };
}

function IndicatorIndex({ indicators, domains }: { indicators: Indicator[]; domains: string[] }) {
  const [domain, setDomain] = useState(domains[0]);
  const [showBlank, setShowBlank] = useState(false);
  const scoped = indicators.filter((item) => domains.includes(item.domain));
  const rows = scoped.filter((item) => item.domain === domain && (showBlank || item.status !== 'unavailable'));
  const blank = scoped.filter((item) => item.status === 'unavailable').length;
  return (
    <section className="gc-panel span-12 gc-scope">
      <div className="gc-scope-head">
        <div>
          <h2>Performance indicators</h2>
          <p>Figures for this view. Hover a card for the measurement note.</p>
        </div>
      </div>
      {domains.length > 1 ? (
        <div className="gc-chips">
          {domains.map((item) => (
            <button key={item} type="button" aria-pressed={domain === item} onClick={() => setDomain(item)}>{item}</button>
          ))}
        </div>
      ) : null}
      <div className="gc-scope-grid">
        {rows.map((item, index) => (
          <article
            key={item.name}
            className={`gc-scope-card is-${item.status === 'unavailable' ? 'blank' : item.status}`}
            style={{ animationDelay: `${index * 35}ms` }}
            title={item.method}
          >
            <span className="gc-scope-status">{item.status === 'unavailable' ? 'Not available' : item.status === 'constructed' ? 'Estimated' : 'Available'}</span>
            <strong>{item.name}</strong>
            <em>{item.value}</em>
          </article>
        ))}
      </div>
      {blank > 0 ? (
        <button type="button" className="gc-text-btn" aria-pressed={showBlank} onClick={() => setShowBlank((value) => !value)}>
          {showBlank ? 'Hide indicators not available here' : 'Show indicators not available in this view'}
        </button>
      ) : null}
    </section>
  );
}

export function OverviewPage() {
  const view = useView();
  const prior = usePrior();
  const leftRate = view.arrivals ? view.left / view.arrivals : 0;
  const boardRate = view.admitted ? view.boarding / view.admitted : 0;
  return (
    <Page title="Emergency Snapshot" kpis={[
      score('ED visits', num(view.arrivals), compare(view, prior, (item) => item.arrivals), 'Emergency department visits in the selected hospital and reporting period.', `${num(view.arrivals)} visits in the selected period.`, undefined, 'neutral'),
      score('High-acuity arrivals (ESI-1–2)', num(view.acuity[0] + view.acuity[1]), compare(view, prior, (item) => item.acuity[0] + item.acuity[1]), 'ESI-1 plus ESI-2 arrival volume. This is period arrivals, not a live waiting census.', `${num(view.acuity[0])} ESI-1 and ${num(view.acuity[1])} ESI-2.`, undefined, 'watch'),
      score('Door-to-provider (median)', `${num(view.median, 1)} minutes`, compare(view, prior, (item) => item.median), 'Median minutes from arrival to first provider. Not ED length of stay and not boarding after admit.', `Median ${num(view.median, 1)} minutes for the selected period.`, undefined, waitTone(view.median)),
      score('ED length of stay (median)', `${num(view.losMedian, 0)} minutes`, compare(view, prior, (item) => item.losMedian), 'Median minutes from arrival until the visit leaves the department. Admitted and discharged stays are not separated. Not inpatient length of stay.', `Median ${num(view.losMedian, 0)} minutes for the selected period.`, 'value-kpi_ed_los_median_minutes', view.losMedian >= 180 ? 'alert' : view.losMedian >= 140 ? 'watch' : 'good'),
      score('Left without being seen', pct(leftRate), compare(view, prior, (item) => item.arrivals ? item.left / item.arrivals : 0, true), 'Left before triage plus left after triage, divided by ED visits.', `${num(view.left)} of ${num(view.arrivals)} visits.`, undefined, rateTone(leftRate, 0.015, 0.025)),
      score('Boarding beyond 4 hours', pct(boardRate), compare(view, prior, (item) => item.admitted ? item.boarding / item.admitted : 0, true), 'Admitted visits still in the ED more than 4 hours after the admit decision, divided by emergency admissions. Not hospital bed occupancy.', `${num(view.boarding)} of ${num(view.admitted)} emergency admissions.`, undefined, rateTone(boardRate, 0.04, 0.08)),
    ]}>
      <Slot span="span-8" figure={fig('area', 'ED visits over time', view.labels, [{ name: 'Visits', values: view.monthlyArrivals }], 'visits', 'Monthly ED visits sum to the selected period total.')} />
      <Alerts />
      <Slot figure={heatFig(view)} />
      <Slot figure={fig('bars', 'Acuity mix on arrival (ESI)', ['ESI-1', 'ESI-2', 'ESI-3', 'ESI-4', 'ESI-5'], [{ name: 'Visits', values: view.acuity }], 'visits', 'The five ESI counts sum to ED visits in the selected period.')} />
      <Slot figure={fig('flow', 'ED disposition outcomes', ['Arrivals', 'Admitted', 'Discharged', 'Left without being seen'], [{ name: 'Visits', values: [view.arrivals, view.admitted, view.discharged, view.left] }], 'visits', 'Admitted + discharged + left without being seen = arrivals for the selected period.')} />
      <Slot figure={fig('bars', 'Boarding beyond 4 hours', view.labels, [{ name: 'Boarded visits', values: view.monthlyBoard }], 'patients', 'Admitted visits still in the ED more than 4 hours after the admit decision. Monthly counts sum to the period boarding total.')} />
      <IndicatorIndex indicators={indicatorsFor(scopeInput(view))} domains={['ED Demand & Arrivals']} />
    </Page>
  );
}

export function FlowPage() {
  const view = useView();
  const prior = usePrior();
  const triageRate = view.arrivals ? view.triageCompleted / view.arrivals : 0;
  const leftRate = view.arrivals ? view.left / view.arrivals : 0;
  const arrivalTotal = view.arrivals || 1;
  return (
    <Page title="Waiting & Patient Flow" kpis={[
      score('Triage completion rate', pct(triageRate), compare(view, prior, (item) => item.arrivals ? item.triageCompleted / item.arrivals : 0, true), 'Arrivals minus patients who left before triage, divided by arrivals.', `${num(view.triageCompleted)} triaged · ${num(view.before)} left before triage.`, undefined, rateTone(triageRate, 0.97, 0.95, false)),
      score('Door-to-provider (median)', `${num(view.median, 1)} minutes`, compare(view, prior, (item) => item.median), 'Median minutes from arrival to first provider. Not ED length of stay, disposition decision time, or boarding.', `Median ${num(view.median, 1)} minutes for the selected period.`, undefined, waitTone(view.median)),
      score('Door-to-provider (P90)', `${num(view.p90, 1)} minutes`, compare(view, prior, (item) => item.p90), '90th-percentile door-to-provider for the same visits. Stored separately from the median.', `P90 ${num(view.p90, 1)} minutes for the selected period.`, undefined, view.p90 >= 100 ? 'alert' : view.p90 >= 80 ? 'watch' : 'good'),
      score('ED length of stay (median)', `${num(view.losMedian, 0)} minutes`, compare(view, prior, (item) => item.losMedian), 'Median minutes from arrival until the visit leaves the department. Admitted and discharged stays are not separated.', `Median ${num(view.losMedian, 0)} minutes for the selected period.`, undefined, view.losMedian >= 180 ? 'alert' : view.losMedian >= 140 ? 'watch' : 'good'),
      score('ED length of stay (P90)', `${num(view.losP90, 0)} minutes`, compare(view, prior, (item) => item.losP90), '90th-percentile ED length of stay for the same visits. Stored separately from the median.', `P90 ${num(view.losP90, 0)} minutes for the selected period.`, undefined, view.losP90 >= 280 ? 'alert' : view.losP90 >= 220 ? 'watch' : 'good'),
      score('ED admission rate', pct(view.arrivals ? view.admitted / view.arrivals : 0), compare(view, prior, (item) => item.arrivals ? item.admitted / item.arrivals : 0, true), 'ED visits with an admit decision divided by ED visits. Not inpatient bed occupancy.', `${num(view.admitted)} admitted of ${num(view.arrivals)} visits.`, undefined, 'neutral'),
      score('ED discharge rate', pct(view.arrivals ? view.discharged / view.arrivals : 0), compare(view, prior, (item) => item.arrivals ? item.discharged / item.arrivals : 0, true), 'ED visits discharged from the department divided by ED visits.', `${num(view.discharged)} discharged of ${num(view.arrivals)} visits.`, undefined, 'good'),
      score('Left without being seen', pct(leftRate), compare(view, prior, (item) => item.arrivals ? item.left / item.arrivals : 0, true), 'Left before triage plus left after triage, divided by arrivals. Deaths remain inside the visit cohort and are not a fourth exit.', `${num(view.before)} before triage · ${num(view.after)} after triage.`, undefined, rateTone(leftRate, 0.015, 0.025)),
    ]}>
      <Slot span="span-8" figure={fig('area', 'Arrivals by hour of day', view.hours.map((_, index) => `${index}`), [{ name: 'Visits', values: view.hours }], 'visits', 'Constructed hourly shape of period arrivals. The 24 hours sum to the selected period total.')} />
      <section className="gc-panel gc-insight span-4">
        <h2>Peak arrival hours</h2>
        <div className="gc-peak-list">
          {view.peaks.map((item, index) => (
            <div key={item.name} className={`gc-peak ${index === 0 ? 'gc-peak-hot' : index === 1 ? 'gc-peak-warm' : 'gc-peak-cool'}`} style={{ animationDelay: `${index * 70}ms` }}>
              <span className="gc-peak-rank">{index + 1}</span>
              <div>
                <strong>{item.name}</strong>
                <em>{num(item.count)} arrivals · {pct(item.count / arrivalTotal)} of period arrivals</em>
              </div>
            </div>
          ))}
        </div>
        <p className="gc-next">These hours are inside the 24-hour arrival total, not an extra population.</p>
      </section>
      <Slot figure={fig('bars', 'Arrivals by weekday', view.days.map((item) => item.name), [{ name: 'Visits', values: view.days.map((item) => item.count) }], 'visits', 'Constructed weekday mix. The seven days sum to period arrivals.')} />
      <Slot figure={fig('bars', 'Door-to-provider time distribution', view.bins.map((item) => item.name), [{ name: 'Visits', values: view.bins.map((item) => item.count) }], 'visits', 'Visit bins shaped around the period median. Bins sum to arrivals.')} />
      <Slot figure={waitHeatFig(view)} />
      <Slot figure={fig('bars', 'Triage and disposition volumes', ['Arrivals', 'Triaged', 'Admitted', 'Discharged', 'Left before triage', 'Left after triage'], [{ name: 'Visits', values: [view.arrivals, view.triageCompleted, view.admitted, view.discharged, view.before, view.after] }], 'visits', 'Stage volumes for the same period. Admitted + discharged + left before + left after = arrivals. Triaged excludes left-before-triage.')} />
      <Slot figure={fig('stacked', 'Acuity mix by time of day', ['Night', 'Day', 'Evening'], view.acuity.map((value, index) => ({ name: `ESI-${index + 1}`, values: splitSafe(value, [0.22, 0.46, 0.32]) })), 'visits', 'Constructed time-of-day split of ESI counts. Stacks still sum to arrivals. Not a staffing roster.')} />
      <Slot figure={fig('bars', 'Boarding beyond 4 hours', view.labels, [{ name: 'Boarded visits', values: view.monthlyBoard }], 'patients', 'Still in the ED after the admit decision for more than 4 hours. Rate denominator is emergency admissions.')} />
      <section className="gc-panel gc-slot span-12">
        <Donut title="Arrival mode mix" note="Walk-in, ambulance, transfer, and other sum to ED visits in the selected period." parts={view.modes.map((item) => ({ name: item.name, value: item.count }))} wide />
      </section>
      <IndicatorIndex indicators={indicatorsFor(scopeInput(view))} domains={['ED Triage', 'ED Waiting Times', 'ED Flow & Disposition']} />
    </Page>
  );
}

export function QualityPage() {
  const view = useView();
  const prior = usePrior();
  const mortality = view.arrivals ? view.deaths / view.arrivals : 0;
  const priorRate = prior.arrivals ? prior.deaths / prior.arrivals : 0;
  const high = view.acuity[0] + view.acuity[1];
  const leftRate = view.arrivals ? view.left / view.arrivals : 0;
  const revisitRate = view.arrivals ? view.revisit / view.arrivals : 0;
  return (
    <Page title="Safety & Return Visits" kpis={[
      score('Unplanned 72-hour return rate', pct(revisitRate), 'Scenario share', 'Fixed 3.4% of ED visits in this scenario. Visits are not linked, and the denominator is arrivals rather than eligible discharges.', `${num(view.revisit)} return visits of ${num(view.arrivals)} arrivals.`, undefined, rateTone(revisitRate, 0.03, 0.05)),
      score('ED mortality count', num(view.deaths), compare(view, prior, (item) => item.deaths), 'Deaths in the emergency visit cohort for the selected period. Not inpatient deaths.', `${num(view.deaths)} deaths in the ED cohort.`, undefined, view.deaths > 0 ? 'alert' : 'good'),
      score('ED mortality rate', pct(mortality), deltaText(mortality, priorRate, true), 'ED cohort deaths divided by the same ED visits.', `${num(view.deaths)} / ${num(view.arrivals)} visits.`, undefined, mortality > 0.001 ? 'alert' : mortality > 0 ? 'watch' : 'good'),
      score('Left without being seen', pct(leftRate), compare(view, prior, (item) => item.arrivals ? item.left / item.arrivals : 0, true), 'Left before triage plus left after triage, divided by ED visits.', `${num(view.left)} of ${num(view.arrivals)} visits.`, undefined, rateTone(leftRate, 0.015, 0.025)),
      score('High-acuity arrivals (ESI-1–2)', num(high), compare(view, prior, (item) => item.acuity[0] + item.acuity[1]), 'ESI-1 plus ESI-2 volume. Door-to-provider is not split by acuity in this scenario.', `${num(view.acuity[0])} ESI-1 and ${num(view.acuity[1])} ESI-2.`, undefined, 'watch'),
    ]}>
      <Slot span="span-8" figure={fig('line', 'Left without being seen and 72-hour returns', view.labels, [{ name: 'Left without being seen', values: view.monthlyLeft }, { name: 'Unplanned 72-hour returns', values: view.monthlyRevisit }], 'visits', 'LWBS visits sum to the period total. Returns are a 3.4% scenario share of arrivals, not of eligible discharges.')} />
      <section className="gc-panel gc-insight span-4">
        <h2>Safety watch list</h2>
        <div className="gc-exception-list">
          <div className={`gc-exception gc-tone-${rateTone(leftRate, 0.015, 0.025)}`}>
            <strong>Left without being seen</strong>
            <span>{pct(leftRate)} · {num(view.left)} visits</span>
          </div>
          <div className={`gc-exception gc-tone-${rateTone(revisitRate, 0.03, 0.05)}`}>
            <strong>Unplanned 72-hour returns</strong>
            <span>{pct(revisitRate)} of arrivals, not of eligible discharges</span>
          </div>
          <div className={`gc-exception gc-tone-${mortality > 0 ? 'alert' : 'good'}`}>
            <strong>ED mortality</strong>
            <span>{pct(mortality)} · {num(view.deaths)} / {num(view.arrivals)}</span>
          </div>
        </div>
        <p className="gc-next">High-acuity waiting time, returns resulting in admission, and left against medical advice are not available in this scenario.</p>
      </section>
      <Slot figure={fig('bars', 'ED mortality by month', view.labels, [{ name: 'Deaths', values: view.monthlyDeaths }], 'deaths', `${num(view.deaths)} ED cohort deaths among ${num(view.arrivals)} visits (${pct(mortality)}). Not inpatient mortality.`)} />
      <Slot figure={fig('bars', 'High-acuity arrivals (ESI-1–2)', ['ESI-1', 'ESI-2'], [{ name: 'Visits', values: [view.acuity[0], view.acuity[1]] }], 'visits', 'ESI-1 and ESI-2 are part of the five-level acuity mix. Their door-to-provider times are not separated.')} />
      <IndicatorIndex indicators={indicatorsFor(scopeInput(view))} domains={['ED Quality & Outcomes']} />
    </Page>
  );
}

function usePrior(): View {
  const store = useShowcase();
  const { period } = usePeriod();
  const year = store.year <= 2024 ? 2024 : store.year - 1;
  return useMemo(() => buildView(store.hospital, year, period), [store.hospital, year, period]);
}

function score(name: string, value: string, delta: string, definition: string, scope: string, testId?: string, tone: Tone = 'neutral') {
  return { name, value, delta, tone, testId, detail: { name, value, definition, scope } };
}

function waitTone(minutes: number): Tone {
  if (minutes >= 60) return 'alert';
  if (minutes >= 45) return 'watch';
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

function heatFig(view: View): Figure {
  return fig('heatmap', 'Arrival demand by day and hour', HEATMAP_BLOCKS, [{ name: 'Visits', values: view.heat.flat() }], 'visits', 'Each cell is a constructed share of the selected period arrival total.', { rows: HEATMAP_DAYS, matrix: view.heat });
}

function waitHeatFig(view: View): Figure {
  return fig('heatmap', 'Door-to-provider pressure by hour', HEATMAP_BLOCKS, [{ name: 'Minutes', values: view.waitHeat.flat() }], 'minutes', 'Busy hours are shaped longer around the period door-to-provider median. Not a live queue clock.', { rows: HEATMAP_DAYS, matrix: view.waitHeat });
}

function Donut({ title, note, parts, wide = false }: { title: string; note: string; parts: { name: string; value: number }[]; wide?: boolean }) {
  const copilot = useCopilot();
  const total = parts.reduce((sum, part) => sum + part.value, 0) || 1;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <figure className={`gc-chart ${wide ? 'gc-donut-wide' : ''}`} data-chart-state="ok">
      <figcaption className="gc-chart-head">
        <div className="gc-chart-copy">
          <strong>{title}</strong>
          <span>{note}</span>
        </div>
        <button type="button" className="gc-investigate" aria-label={`Investigate ${title}`} onClick={() => copilot.focusChart(title)}>Investigate</button>
      </figcaption>
      <ChartStage>
        <div className="gc-donut-body">
          <svg viewBox="0 0 140 120" role="img" aria-label={`${title}. ${note}`}>
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
                  style={{ animationDelay: `${index * 80}ms` }}
                  data-tip-title={part.name}
                  data-tip-value={`${num(part.value)} · ${pct(part.value / total)}`}
                />
              );
              offset += length;
              return node;
            })}
            <text x="60" y="64" textAnchor="middle">{num(total)}</text>
          </svg>
          <ul className="gc-donut-legend">
            {parts.map((part, index) => (
              <li key={part.name} style={{ animationDelay: `${120 + index * 60}ms` }} data-tip-title={part.name} data-tip-value={`${num(part.value)} · ${pct(part.value / total)}`}>
                <i style={{ background: PALETTE[index % PALETTE.length] }} />
                <strong>{part.name}</strong>
                <span>{num(part.value)}</span>
                <em>{pct(part.value / total)}</em>
              </li>
            ))}
          </ul>
        </div>
      </ChartStage>
    </figure>
  );
}
