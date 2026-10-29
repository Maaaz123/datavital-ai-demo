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
          <p className="gc-kicker">Emergency Department</p>
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
        <p>Review the peak arrival hours while door-to-provider median is {num(view.median, 1)} minutes.</p>
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
  const valued = scoped.filter((item) => item.status !== 'unavailable').length;
  const blank = scoped.length - valued;
  return (
    <section className="gc-panel span-12 gc-scope">
      <div className="gc-scope-head">
        <div>
          <h2>Indicator scope</h2>
          <p>{valued} live · {blank} blank · values stay honest to the scenario</p>
        </div>
        <div className="gc-scope-meter" aria-label={`${valued} of ${scoped.length} indicators`}>
          <i style={{ width: `${scoped.length ? (valued / scoped.length) * 100 : 0}%` }} />
          <span>{valued}/{scoped.length}</span>
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
            <span className="gc-scope-status">{item.status === 'unavailable' ? 'Blank' : item.status === 'constructed' ? 'Built' : 'Live'}</span>
            <strong>{item.name}</strong>
            <em>{item.value}</em>
          </article>
        ))}
      </div>
      {blank > 0 ? (
        <button type="button" className="gc-text-btn" aria-pressed={showBlank} onClick={() => setShowBlank((value) => !value)}>
          {showBlank ? 'Hide blank indicators' : `Show ${blank} blank indicators`}
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
    <Page title="Emergency Overview" kpis={[
      score('Total ED Visits', num(view.arrivals), compare(view, prior, (item) => item.arrivals), 'ED arrivals in the selected period.', `${num(view.arrivals)} visits.`, undefined, 'neutral'),
      score('High-Acuity Arrivals', num(view.acuity[0] + view.acuity[1]), compare(view, prior, (item) => item.acuity[0] + item.acuity[1]), 'ESI-1 plus ESI-2 arrivals. This is arrival volume, not a count of patients waiting.', `${num(view.acuity[0])} ESI-1 and ${num(view.acuity[1])} ESI-2.`, undefined, 'watch'),
      score('Door-to-Provider Median', `${num(view.median, 1)} minutes`, compare(view, prior, (item) => item.median), 'Time from arrival to the first provider. This is not length of stay and not boarding.', `Median ${num(view.median, 1)} minutes.`, undefined, waitTone(view.median)),
      score('ED Length of Stay', `${num(view.losMedian, 0)} minutes`, compare(view, prior, (item) => item.losMedian), 'Median time from arrival until the visit leaves the department. Admitted and discharged stays are not separated. This is not inpatient length of stay.', `Median ${num(view.losMedian, 0)} minutes.`, 'value-kpi_ed_avg_los_hours', view.losMedian >= 180 ? 'alert' : view.losMedian >= 140 ? 'watch' : 'good'),
      score('Left Without Being Seen', pct(leftRate), compare(view, prior, (item) => item.arrivals ? item.left / item.arrivals : 0, true), 'Left before triage plus left after triage, divided by emergency visits.', `${num(view.left)} of ${num(view.arrivals)} visits.`, undefined, rateTone(leftRate, 0.015, 0.025)),
      score('Boarding Beyond 4 Hours', pct(boardRate), compare(view, prior, (item) => item.admitted ? item.boarding / item.admitted : 0, true), 'Admitted visits still in the department more than 4 hours after the admit decision, divided by emergency admissions. This is not hospital bed occupancy.', `${num(view.boarding)} of ${num(view.admitted)} admissions.`, undefined, rateTone(boardRate, 0.04, 0.08)),
    ]}>
      <Slot span="span-8" figure={fig('area', 'ED visits trend', view.labels, [{ name: 'Arrivals', values: view.monthlyArrivals }], 'visits', 'Monthly visits sum to the period total.')} />
      <Alerts />
      <Slot figure={heatFig(view)} />
      <Slot figure={fig('bars', 'Triage distribution', ['ESI-1', 'ESI-2', 'ESI-3', 'ESI-4', 'ESI-5'], [{ name: 'Arrivals', values: view.acuity }], 'visits', 'The five ESI counts sum to arrivals.')} />
      <Slot figure={fig('flow', 'Patient disposition', ['Arrivals', 'Admitted', 'Discharged', 'Left'], [{ name: 'Visits', values: [view.arrivals, view.admitted, view.discharged, view.left] }], 'visits', 'Admitted, discharged, and left sum to arrivals.')} />
      <Slot figure={fig('bars', 'Boarding beyond 4 hours', view.labels, [{ name: 'Boarded', values: view.monthlyBoard }], 'patients', 'Visits still in the department after the admit decision. Counts sum to the period total.')} />
      <IndicatorIndex indicators={indicatorsFor(scopeInput(view))} domains={['ED Demand & Arrivals']} />
    </Page>
  );
}

export function FlowPage() {
  const view = useView();
  const prior = usePrior();
  const triageRate = view.arrivals ? view.triageCompleted / view.arrivals : 0;
  const leftRate = view.arrivals ? view.left / view.arrivals : 0;
  const peakTotal = view.peaks.reduce((sum, item) => sum + item.count, 0) || 1;
  return (
    <Page title="Patient Flow & Waiting" kpis={[
      score('Triage Completion', pct(triageRate), compare(view, prior, (item) => item.arrivals ? item.triageCompleted / item.arrivals : 0, true), 'Arrivals minus patients who left before triage, divided by arrivals.', `${num(view.triageCompleted)} triaged. ${num(view.before)} left before triage.`, undefined, rateTone(triageRate, 0.97, 0.95, false)),
      score('Door-to-Provider Median', `${num(view.median, 1)} minutes`, compare(view, prior, (item) => item.median), 'Minutes from arrival to the first provider. This is not length of stay, disposition time, or boarding.', `Median ${num(view.median, 1)} minutes.`, undefined, waitTone(view.median)),
      score('Door-to-Provider P90', `${num(view.p90, 1)} minutes`, compare(view, prior, (item) => item.p90), 'Door-to-provider 90th percentile for the same visits.', `P90 ${num(view.p90, 1)} minutes.`, undefined, view.p90 >= 100 ? 'alert' : view.p90 >= 80 ? 'watch' : 'good'),
      score('ED Length of Stay Median', `${num(view.losMedian, 0)} minutes`, compare(view, prior, (item) => item.losMedian), 'Minutes from arrival until the visit leaves the department. Admitted and discharged stays are not separated.', `Median ${num(view.losMedian, 0)} minutes.`, undefined, view.losMedian >= 180 ? 'alert' : view.losMedian >= 140 ? 'watch' : 'good'),
      score('ED Length of Stay P90', `${num(view.losP90, 0)} minutes`, compare(view, prior, (item) => item.losP90), 'Length-of-stay P90 for the same visits. It is stored separately from the median.', `P90 ${num(view.losP90, 0)} minutes.`, undefined, view.losP90 >= 280 ? 'alert' : view.losP90 >= 220 ? 'watch' : 'good'),
      score('ED Admission Rate', pct(view.arrivals ? view.admitted / view.arrivals : 0), compare(view, prior, (item) => item.arrivals ? item.admitted / item.arrivals : 0, true), 'Emergency visits with an admit decision divided by emergency visits. This is not inpatient bed occupancy.', `${num(view.admitted)} admitted.`, undefined, 'neutral'),
      score('ED Discharge Rate', pct(view.arrivals ? view.discharged / view.arrivals : 0), compare(view, prior, (item) => item.arrivals ? item.discharged / item.arrivals : 0, true), 'Emergency visits discharged from the department divided by emergency visits.', `${num(view.discharged)} discharged.`, undefined, 'good'),
      score('Left Without Being Seen', pct(leftRate), compare(view, prior, (item) => item.arrivals ? item.left / item.arrivals : 0, true), 'Left before triage plus left after triage, divided by arrivals. Deaths stay inside the visit and are not another exit.', `${num(view.before)} before triage and ${num(view.after)} after triage.`, undefined, rateTone(leftRate, 0.015, 0.025)),
    ]}>
      <Slot span="span-8" figure={fig('area', 'Hourly arrivals', view.hours.map((_, index) => `${index}`), [{ name: 'Arrivals', values: view.hours }], 'visits', 'The 24 hours sum to period arrivals.')} />
      <section className="gc-panel gc-insight span-4">
        <h2>Peak demand</h2>
        <div className="gc-peak-list">
          {view.peaks.map((item, index) => (
            <div key={item.name} className={`gc-peak ${index === 0 ? 'gc-peak-hot' : index === 1 ? 'gc-peak-warm' : 'gc-peak-cool'}`} style={{ animationDelay: `${index * 70}ms` }}>
              <span className="gc-peak-rank">{index + 1}</span>
              <div>
                <strong>{item.name}</strong>
                <em>{num(item.count)} arrivals · {pct(item.count / peakTotal)} of the top three</em>
              </div>
            </div>
          ))}
        </div>
        <p className="gc-next">These hours stay inside the 24-hour arrival total.</p>
      </section>
      <Slot figure={fig('bars', 'Arrivals by day of week', view.days.map((item) => item.name), [{ name: 'Arrivals', values: view.days.map((item) => item.count) }], 'visits', 'The seven days sum to period arrivals.')} />
      <Slot figure={fig('bars', 'Waiting time distribution', view.bins.map((item) => item.name), [{ name: 'Arrivals', values: view.bins.map((item) => item.count) }], 'visits', 'Bins sum to arrivals around the period median.')} />
      <Slot figure={waitHeatFig(view)} />
      <Slot figure={fig('flow', 'Patient journey', ['Arrivals', 'Triaged', 'Admitted', 'Discharged', 'Left before triage', 'Left after triage'], [{ name: 'Visits', values: [view.arrivals, view.triageCompleted, view.admitted, view.discharged, view.before, view.after] }], 'visits', 'Triaged visits exclude patients who left before triage.')} />
      <Slot figure={fig('stacked', 'Triage by acuity and time', ['Night', 'Day', 'Evening'], view.acuity.map((value, index) => ({ name: `ESI-${index + 1}`, values: splitSafe(value, [0.22, 0.46, 0.32]) })), 'visits', 'ESI counts follow a fixed time pattern and still sum to arrivals. This is not a staffing roster.')} />
      <Slot figure={fig('bars', 'Boarding beyond 4 hours', view.labels, [{ name: 'Boarded', values: view.monthlyBoard }], 'patients', 'Still in the department after the admit decision. The denominator is emergency admissions.')} />
      <section className="gc-panel gc-slot span-12">
        <Donut title="Arrival mode" note="Walk-in, ambulance, transfer, and other sum to arrivals." parts={view.modes.map((item) => ({ name: item.name, value: item.count }))} wide />
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
    <Page title="ED Quality & Outcomes" kpis={[
      score('Unplanned 72-Hour Return', pct(revisitRate), 'Scenario share', 'A fixed 3.4% of emergency visits. Visits are not linked, and the denominator is arrivals rather than eligible discharges.', `${num(view.revisit)} return visits.`, undefined, rateTone(revisitRate, 0.03, 0.05)),
      score('ED Mortality Count', num(view.deaths), compare(view, prior, (item) => item.deaths), 'Deaths in the emergency visit cohort. These are not inpatient deaths.', `${num(view.deaths)} deaths.`, undefined, view.deaths > 0 ? 'alert' : 'good'),
      score('ED Mortality Rate', pct(mortality), deltaText(mortality, priorRate, true), 'Deaths divided by the same emergency visits.', `${num(view.deaths)} / ${num(view.arrivals)}.`, undefined, mortality > 0.001 ? 'alert' : mortality > 0 ? 'watch' : 'good'),
      score('Left Without Being Seen', pct(leftRate), compare(view, prior, (item) => item.arrivals ? item.left / item.arrivals : 0, true), 'Left before triage plus left after triage, divided by emergency visits.', `${num(view.left)} left.`, undefined, rateTone(leftRate, 0.015, 0.025)),
      score('High-Acuity Arrivals', num(high), compare(view, prior, (item) => item.acuity[0] + item.acuity[1]), 'ESI-1 plus ESI-2 volume. Their time to first provider is not recorded separately.', `${num(view.acuity[0])} ESI-1 and ${num(view.acuity[1])} ESI-2.`, undefined, 'watch'),
    ]}>
      <Slot span="span-8" figure={fig('line', 'Left and return visits', view.labels, [{ name: 'Left', values: view.monthlyLeft }, { name: 'Return visits', values: view.monthlyRevisit }], 'visits', 'Left visits sum to the period total. Returns are a 3.4% scenario share of arrivals.')} />
      <section className="gc-panel gc-insight span-4">
        <h2>Quality exceptions</h2>
        <div className="gc-exception-list">
          <div className={`gc-exception gc-tone-${rateTone(leftRate, 0.015, 0.025)}`}>
            <strong>Left without being seen</strong>
            <span>{pct(leftRate)} · {num(view.left)} visits</span>
          </div>
          <div className={`gc-exception gc-tone-${rateTone(revisitRate, 0.03, 0.05)}`}>
            <strong>Unplanned 72-hour return</strong>
            <span>{pct(revisitRate)} of arrivals, not of eligible discharges</span>
          </div>
          <div className={`gc-exception gc-tone-${mortality > 0 ? 'alert' : 'good'}`}>
            <strong>Emergency mortality</strong>
            <span>{pct(mortality)} · {num(view.deaths)} / {num(view.arrivals)}</span>
          </div>
        </div>
        <p className="gc-next">High-acuity waiting time, return visits that were admitted, and left against medical advice are not in this scenario.</p>
      </section>
      <Slot figure={fig('bars', 'Emergency mortality', view.labels, [{ name: 'Deaths', values: view.monthlyDeaths }], 'deaths', `${num(view.deaths)} deaths among ${num(view.arrivals)} visits (${pct(mortality)}).`)} />
      <Slot figure={fig('bars', 'High-acuity arrivals', ['ESI-1', 'ESI-2'], [{ name: 'Arrivals', values: [view.acuity[0], view.acuity[1]] }], 'visits', 'ESI-1 and ESI-2 are part of the five-level distribution. Their waits are not separate.')} />
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
  return fig('heatmap', 'Arrivals heatmap', HEATMAP_BLOCKS, [{ name: 'Arrivals', values: view.heat.flat() }], 'visits', 'Each cell is part of the period arrival total.', { rows: HEATMAP_DAYS, matrix: view.heat });
}

function waitHeatFig(view: View): Figure {
  return fig('heatmap', 'Waiting time by hour', HEATMAP_BLOCKS, [{ name: 'Minutes', values: view.waitHeat.flat() }], 'minutes', 'Busy hours run longer around the period median.', { rows: HEATMAP_DAYS, matrix: view.waitHeat });
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
