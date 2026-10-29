import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { answerQuestion } from '@/showcase/assistant';
import { scenarioFor } from '@/showcase/facts';
import { decisionKey, useShowcase } from '@/showcase/state';
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
  staffingByService,
  waitHeatFor,
} from './derived';
import { sumKey, usePeriod, weighted } from './period';
import { Chart, type Figure } from './viz';

const PALETTE = ['#0f6e6a', '#1e3a5f', '#8c6a3d', '#4d6b8a', '#6e8b74'];

type Detail = { name: string; value: string; definition: string; scope: string };

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
  const losHours = (period === 'year' ? fact.edLosAvgMin : weighted(rows, 'edLosAvgMin')) / 60;
  const beds = period === 'year'
    ? { staffed: fact.staffedBeds, occupied: fact.occupiedBeds, available: fact.availableBeds, blocked: fact.blockedBeds }
    : bedSnapshot(rows);
  const occupancy = beds.staffed ? beds.occupied / beds.staffed : 0;
  const boarding = Math.round(admitted * (0.05 + occupancy * 0.06));
  const revisit = Math.round(arrivals * 0.034);
  const staff = staffingByService(hospital, year).find((item) => item.name === 'Emergency');
  const required = staff?.required ?? 0;
  const filled = staff?.filled ?? 0;
  const shiftWeights = [0.22, 0.46, 0.32];
  const shiftNames = ['Night', 'Day', 'Evening'];
  const reqSplit = splitSafe(required, shiftWeights);
  const fillSplit = splitSafe(filled, shiftWeights);
  const hours = hoursFor(arrivals);
  const heat = heatmapFor(arrivals);
  return {
    arrivals, admitted, discharged, left, deaths, before, after,
    triageCompleted: arrivals - before,
    median, p90, losMedian, losHours,
    beds, occupancy, boarding, revisit,
    required, filled,
    shifts: shiftNames.map((name, index) => ({ name, required: reqSplit[index], filled: fillSplit[index] })),
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

function Page({ title, kpis, children }: { title: string; kpis: { name: string; value: string; delta: string; testId?: string; detail: Detail }[]; children: ReactNode }) {
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
        {kpis.map((item) => (
          <button type="button" className="gc-score" key={item.name} data-testid={item.testId} onClick={() => setOpen(item.detail)}>
            <span>{item.name}</span>
            <strong className="gc-ltr">{item.value}</strong>
            <em>{item.delta}</em>
          </button>
        ))}
      </div>
      {open ? (
        <section className="gc-panel" data-testid="kpi-detail">
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
    <div className={span}>
      <Chart figure={figure} compact />
      <button type="button" className="gc-text-btn" onClick={() => copilot.focusChart(figure.title)}>Investigate {figure.title}</button>
    </div>
  );
}

function fig(type: Figure['type'], title: string, categories: string[], series: Figure['series'], unit: string, note: string, extra?: Partial<Figure>): Figure {
  return { type, title, categories, series, unit, digits: 0, note, domain: 'emergency', subjects: [title], ...extra };
}

function Alerts() {
  const store = useShowcase();
  const copilot = useCopilot();
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
      {alerts[0] ? <Link to="/emergency/ai-decisions">Open the decision review</Link> : <p>No open emergency alert for this hospital and year.</p>}
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

export function OverviewPage() {
  const view = useView();
  const prior = usePrior();
  const copilot = useCopilot();
  return (
    <Page title="Emergency Overview" kpis={[
      score('ED Visits', num(view.arrivals), compare(view, prior, (item) => item.arrivals), 'ED arrivals in the selected period.', `${num(view.arrivals)} arrivals.`),
      score('Door-to-Provider Median', `${num(view.median, 1)} minutes`, compare(view, prior, (item) => item.median), 'Visit-weighted median door-to-provider time. This is not length of stay.', `Median ${num(view.median, 1)} minutes.`),
      score('Door-to-Provider P90', `${num(view.p90, 1)} minutes`, compare(view, prior, (item) => item.p90), 'Visit-weighted 90th percentile door-to-provider time.', `P90 ${num(view.p90, 1)} minutes.`),
      score('ED Length of Stay', `${num(view.losHours, 1)} hours`, compare(view, prior, (item) => item.losHours), 'Average length of stay in hours. It is not the median divided by 60.', `Average ${num(view.losHours, 1)} hours.`, 'value-kpi_ed_avg_los_hours'),
      score('Boarding Beyond 4 Hours', pct(view.admitted ? view.boarding / view.admitted : 0), compare(view, prior, (item) => item.admitted ? item.boarding / item.admitted : 0, true), 'Patients boarding longer than 4 hours divided by emergency admissions in this period.', `${num(view.boarding)} of ${num(view.admitted)} admissions.`),
      score('Left Without Being Seen', pct(view.arrivals ? view.left / view.arrivals : 0), compare(view, prior, (item) => item.arrivals ? item.left / item.arrivals : 0, true), 'Patients who left divided by emergency arrivals. Some left before triage and some after.', `${num(view.left)} of ${num(view.arrivals)} arrivals.`),
      score('Admission Rate', pct(view.arrivals ? view.admitted / view.arrivals : 0), compare(view, prior, (item) => item.arrivals ? item.admitted / item.arrivals : 0, true), 'Emergency visits admitted divided by emergency arrivals. Admitted visits are included in inpatient admissions.', `${num(view.admitted)} admitted.`),
    ]}>
      <Slot span="span-8" figure={fig('area', 'ED visits trend', view.labels, [{ name: 'Arrivals', values: view.monthlyArrivals }], 'visits', 'Monthly visits sum to the period total.')} />
      <Alerts />
      <Slot figure={heatFig(view)} />
      <Slot figure={fig('bars', 'Triage distribution', ['ESI-1', 'ESI-2', 'ESI-3', 'ESI-4', 'ESI-5'], [{ name: 'Arrivals', values: view.acuity }], 'visits', 'The five ESI counts sum to arrivals.')} />
      <Slot figure={fig('flow', 'Patient disposition', ['Arrivals', 'Admitted', 'Discharged', 'Left'], [{ name: 'Visits', values: [view.arrivals, view.admitted, view.discharged, view.left] }], 'visits', 'Admitted, discharged, and left sum to arrivals.')} />
      <Slot figure={fig('bars', 'Boarding trend', view.labels, [{ name: 'Boarded', values: view.monthlyBoard }], 'patients', 'Monthly counts sum to period boarding.')} />
      <section className="gc-panel span-12">
        <h2>Management action</h2>
        <p>Review midday physician and bed-desk coverage while the door-to-provider median is {num(view.median, 1)} minutes.</p>
        <button type="button" className="gc-btn primary" onClick={() => copilot.setOpen(true)}>Review in the copilot</button>
        <Link to="/emergency/ai-decisions">Open AI Decisions</Link>
      </section>
    </Page>
  );
}

export function FlowPage() {
  const view = useView();
  const prior = usePrior();
  return (
    <Page title="Patient Flow & Waiting" kpis={[
      score('Total ED Visits', num(view.arrivals), compare(view, prior, (item) => item.arrivals), 'An ED arrival is a patient who presents and is counted. A registered visit is that same arrival in this period.', `${num(view.arrivals)} arrivals.`),
      score('Median Waiting Time', `${num(view.median, 1)} minutes`, compare(view, prior, (item) => item.median), 'Door-to-provider is minutes from arrival to the first provider. This score is the median.', `Median ${num(view.median, 1)} minutes.`),
      score('P90 Waiting Time', `${num(view.p90, 1)} minutes`, compare(view, prior, (item) => item.p90), 'Door-to-provider 90th percentile for the same arrivals.', `P90 ${num(view.p90, 1)} minutes.`),
      score('ED Length of Stay', `${num(view.losMedian, 0)} minutes`, compare(view, prior, (item) => item.losMedian), 'ED length of stay is minutes from arrival until the patient leaves the department.', `Median stay ${num(view.losMedian, 0)} minutes.`),
      score('Admitted', num(view.admitted), compare(view, prior, (item) => item.admitted), 'Admission is a visit accepted to an inpatient bed. Boarding is an admitted patient still in the department waiting for that bed, counted within admissions.', `${num(view.admitted)} admitted.`),
      score('Discharged', num(view.discharged), compare(view, prior, (item) => item.discharged), 'Discharge is a visit that leaves after care and is not admitted.', `${num(view.discharged)} discharged.`),
      score('Left Without Being Seen', num(view.left), compare(view, prior, (item) => item.left), 'Left without being seen is left before triage plus left after triage. Triage completed is arrivals minus those who left before triage. Deaths stay inside the visit cohort and are not another exit.', `${num(view.before)} before triage and ${num(view.after)} after triage.`),
    ]}>
      <Slot span="span-8" figure={fig('area', 'Hourly arrivals', view.hours.map((_, index) => `${index}`), [{ name: 'Arrivals', values: view.hours }], 'visits', 'The 24 hours sum to period arrivals.')} />
      <section className="gc-panel span-4">
        <h2>Peak demand</h2>
        <ol>
          {view.peaks.map((item) => <li key={item.name}>{item.name} · {num(item.count)} arrivals</li>)}
        </ol>
        <p>These hours are inside the 24-hour total.</p>
      </section>
      <Slot figure={fig('bars', 'Arrivals by day of week', view.days.map((item) => item.name), [{ name: 'Arrivals', values: view.days.map((item) => item.count) }], 'visits', 'The seven days sum to period arrivals.')} />
      <Slot figure={fig('bars', 'Waiting time distribution', view.bins.map((item) => item.name), [{ name: 'Arrivals', values: view.bins.map((item) => item.count) }], 'visits', 'Bins sum to arrivals around the period median.')} />
      <Slot figure={waitHeatFig(view)} />
      <Slot figure={fig('flow', 'Patient journey', ['Arrivals', 'Triaged', 'Admitted', 'Discharged', 'Left before triage', 'Left after triage'], [{ name: 'Visits', values: [view.arrivals, view.triageCompleted, view.admitted, view.discharged, view.before, view.after] }], 'visits', 'Triaged visits exclude patients who left before triage.')} />
      <Slot figure={fig('stacked', 'Triage by acuity and time', ['Night', 'Day', 'Evening'], view.acuity.map((value, index) => ({ name: `ESI-${index + 1}`, values: splitSafe(value, [0.22, 0.46, 0.32]) })), 'visits', 'Shift splits still sum to arrivals.')} />
      <div className="span-6"><Donut title="Arrival mode" note="Walk-in, ambulance, transfer, and other sum to arrivals." parts={view.modes.map((item) => ({ name: item.name, value: item.count }))} /></div>
    </Page>
  );
}

export function CapacityQualityPage() {
  const view = useView();
  const prior = usePrior();
  const mortality = view.arrivals ? view.deaths / view.arrivals : 0;
  const priorRate = prior.arrivals ? prior.deaths / prior.arrivals : 0;
  return (
    <Page title="Capacity & Quality" kpis={[
      score('Staffed Hospital Beds', num(view.beds.staffed), 'Snapshot', 'Hospital staffed beds. These are not dedicated emergency treatment bays.', `${num(view.beds.staffed)} staffed beds.`),
      score('Occupied Hospital Beds', num(view.beds.occupied), compare(view, prior, (item) => item.beds.occupied), 'Occupied beds in the hospital snapshot for this period.', `${num(view.beds.occupied)} occupied.`),
      score('Available Hospital Beds', num(view.beds.available), compare(view, prior, (item) => item.beds.available), 'Staffed minus occupied minus blocked.', `${num(view.beds.available)} available.`),
      score('Blocked Hospital Beds', num(view.beds.blocked), compare(view, prior, (item) => item.beds.blocked), 'Beds that cannot be used in the snapshot.', `${num(view.beds.blocked)} blocked.`),
      score('Boarding Rate', pct(view.admitted ? view.boarding / view.admitted : 0), compare(view, prior, (item) => item.admitted ? item.boarding / item.admitted : 0, true), 'Boarding longer than 4 hours divided by emergency admissions.', `${num(view.boarding)} boarded admissions.`),
      score('Left Without Being Seen Rate', pct(view.arrivals ? view.left / view.arrivals : 0), compare(view, prior, (item) => item.arrivals ? item.left / item.arrivals : 0, true), 'Left visits divided by emergency arrivals.', `${num(view.left)} left.`),
      score('Return Visit Rate', pct(view.arrivals ? view.revisit / view.arrivals : 0), 'Scenario figure', 'Returns within 72 hours divided by arrivals. This is a scenario share of 3.4%, not a tracked cohort.', `${num(view.revisit)} return visits.`),
    ]}>
      <Slot span="span-8" figure={fig('bullet', 'ED staffing coverage', ['Emergency'], [{ name: 'Required', values: [view.required] }, { name: 'Filled', values: [view.filled] }], 'FTE', 'Annual emergency staffing. A quarter does not create a second census.')} />
      <section className="gc-panel span-4">
        <h2>Staffing gap</h2>
        <p>Required {num(view.required)} FTE. Filled {num(view.filled)} FTE. Gap {num(view.required - view.filled)} FTE.</p>
        <p>The three shifts below sum to those totals.</p>
      </section>
      <Slot figure={fig('bars', 'Staffing by shift', view.shifts.map((item) => item.name), [{ name: 'Required', values: view.shifts.map((item) => item.required) }, { name: 'Filled', values: view.shifts.map((item) => item.filled) }], 'FTE', 'Shifts sum to the emergency staffing totals.')} />
      <Slot figure={fig('bars', 'Hospital bed status', ['Occupied', 'Available', 'Blocked'], [{ name: 'Beds', values: [view.beds.occupied, view.beds.available, view.beds.blocked] }], 'beds', 'Occupied, available, and blocked sum to staffed beds.')} />
      <Slot figure={fig('bars', 'Boarding trend', view.labels, [{ name: 'Boarded', values: view.monthlyBoard }], 'patients', 'Counts sum to period boarding. Denominator is admissions.')} />
      <Slot figure={fig('line', 'Left and return visits', view.labels, [{ name: 'Left', values: view.monthlyLeft }, { name: 'Return visits', values: view.monthlyRevisit }], 'visits', 'Left visits sum to the period total. Returns are a 3.4% scenario share.')} />
      <Slot figure={fig('bars', 'Emergency mortality', ['Deaths'], [{ name: 'Deaths', values: [view.deaths] }], 'deaths', `${num(view.deaths)} deaths among ${num(view.arrivals)} arrivals (${pct(mortality)}).`)} />
      <section className="gc-panel span-6">
        <h2>Priority quality exceptions</h2>
        <ul>
          <li>Left without being seen: {pct(view.arrivals ? view.left / view.arrivals : 0)} ({num(view.left)} visits).</li>
          <li>Boarding beyond 4 hours: {pct(view.admitted ? view.boarding / view.admitted : 0)} of admissions.</li>
          <li>Emergency mortality: {pct(mortality)} ({num(view.deaths)} / {num(view.arrivals)}), {deltaText(mortality, priorRate, true)} versus the comparison period.</li>
        </ul>
        <p>No validated clinical benchmark is applied. Open a score for the count, denominator, and period.</p>
      </section>
    </Page>
  );
}

const STEPS = ['Observation', 'Detection', 'Investigation', 'Drivers', 'Forecast', 'Action', 'Approval', 'Outcome'] as const;

export function DecisionsPage() {
  const store = useShowcase();
  const view = useView();
  const { period } = usePeriod();
  const copilot = useCopilot();
  const [step, setStep] = useState(0);
  const [question, setQuestion] = useState('Why is emergency waiting time increasing?');
  const alerts = alertsFor(store.hospital, store.year).filter((alert) => alert.department === 'Emergency' && alert.severity !== 'info');
  const lead = alerts[0];
  const key = decisionKey(lead?.kpi ?? 'kpi_ed_door_to_provider_median_minutes', store.hospital, store.year, 'Emergency');
  const decision = store.approvals[key];
  const answer = answerQuestion(question, store.hospital, store.year, 'Emergency', 'en');
  return (
    <Page title="AI Decisions" kpis={[
      score('Door-to-Provider Median', `${num(view.median, 1)} minutes`, 'Selected signal', 'The decision uses the door-to-provider median unless another emergency alert is chosen.', `${num(view.median, 1)} minutes.`),
      score('Boarding Beyond 4 Hours', pct(view.admitted ? view.boarding / view.admitted : 0), 'Selected signal', 'Boarding longer than 4 hours divided by emergency admissions.', `${num(view.boarding)} admissions.`),
      score('ED Visits', num(view.arrivals), 'Context', 'Arrivals in the selected period.', `${num(view.arrivals)} arrivals.`),
      score('Left Without Being Seen', pct(view.arrivals ? view.left / view.arrivals : 0), 'Context', 'Left visits divided by arrivals.', `${num(view.left)} left.`),
    ]}>
      <section className="gc-panel span-4">
        <h2>Active emergency alerts</h2>
        <ul className="gc-alert-list">
          {alerts.map((alert) => (
            <li key={alert.id}>
              <button type="button" onClick={() => { copilot.openAlert(alert, { stay: true }); setStep(2); }}>
                <span className={`gc-sev gc-sev-${alert.severity}`}>{alert.severity}</span>
                {alert.title} · {alert.observed}
              </button>
            </li>
          ))}
        </ul>
        {period === 'year' ? null : <p>These alerts use the full reporting year. The scores above use the selected period.</p>}
      </section>
      <section className="gc-panel span-8">
        <div className="gc-progress-steps" role="tablist" aria-label="Decision stages">
          {STEPS.map((label, index) => (
            <button key={label} type="button" role="tab" aria-selected={step === index} aria-label={`${index + 1}. ${label}`} data-done={index < step ? 'true' : undefined} onClick={() => setStep(index)}>
              <i />
              <span>{index === step ? label : index + 1}</span>
            </button>
          ))}
        </div>
        {step === 0 ? <p>Observation: median door-to-provider is {num(view.median, 1)} minutes and P90 is {num(view.p90, 1)} minutes for {num(view.arrivals)} arrivals.</p> : null}
        {step === 1 ? <p>Detection: {lead ? `${lead.title} is ${lead.severity}. ${lead.rule}` : 'No open emergency alert.'}</p> : null}
        {step === 2 ? <p>Investigation: {lead?.investigation ?? answer.explanation} Evidence: {lead?.evidence ?? answer.evidence}</p> : null}
        {step === 3 ? <p>Potential drivers: {answer.explanation} These are not proven causes.</p> : null}
        {step === 4 ? <p>Illustrative forecast: {answer.benefit} Not a validated model. This is not a forecast of a measured result.</p> : null}
        {step === 5 ? <p>Recommended action: {lead?.action ?? answer.action} Expected impact is an estimate.</p> : null}
        {step === 6 ? (
          <div>
            <p>Decision for this hospital, year, and emergency signal: {decision ?? 'waiting for a person'}.</p>
            <div className="gc-inline">
              <button type="button" className="gc-btn primary" onClick={() => store.decide(key, 'approved')}>Approve</button>
              <button type="button" className="gc-btn quiet" onClick={() => store.decide(key, 'rejected')}>Reject</button>
            </div>
          </div>
        ) : null}
        {step === 7 ? (
          <div>
            {decision === 'approved' ? <p>Illustrative outcome. This is not a measured hospital result. Decision: approved.</p> : null}
            {decision === 'rejected' ? <p>No illustrative outcome is shown after a rejection.</p> : null}
            {!decision ? <p>Record an approval or rejection before an outcome is shown.</p> : null}
          </div>
        ) : null}
      </section>
      <Slot span="span-6" figure={fig('line', 'Door-to-provider evidence', view.labels, [
        { name: 'Median', values: view.monthlyMedian },
        { name: 'P90', values: view.monthlyP90 },
      ], 'minutes', 'Monthly median and P90. The score above is visit-weighted.')} />
      <Slot span="span-6" figure={fig('bars', 'Boarding evidence', view.labels, [{ name: 'Boarded', values: view.monthlyBoard }], 'patients', 'Counts sum to the period boarding total.')} />
      <section className="gc-panel span-12">
        <h2>Ask DataVital AI</h2>
        <div className="gc-inline">
          {['Why is emergency waiting time increasing?', 'How many emergency arrivals are there this year?', 'Which operational interventions should be reviewed?'].map((item) => (
            <button type="button" className="gc-btn quiet" key={item} onClick={() => setQuestion(item)}>{item}</button>
          ))}
        </div>
        <h3>{answer.title}</h3>
        <p>{answer.observation}</p>
        <p>{answer.evidence}</p>
        <p>{answer.action}</p>
      </section>
    </Page>
  );
}

function usePrior(): View {
  const store = useShowcase();
  const { period } = usePeriod();
  const year = store.year <= 2024 ? 2024 : store.year - 1;
  return useMemo(() => buildView(store.hospital, year, period), [store.hospital, year, period]);
}

function score(name: string, value: string, delta: string, definition: string, scope: string, testId?: string) {
  return { name, value, delta, testId, detail: { name, value, definition, scope } };
}

function heatFig(view: View): Figure {
  return fig('heatmap', 'Arrivals heatmap', HEATMAP_BLOCKS, [{ name: 'Arrivals', values: view.heat.flat() }], 'visits', 'Each cell is part of the period arrival total.', { rows: HEATMAP_DAYS, matrix: view.heat });
}

function waitHeatFig(view: View): Figure {
  return fig('heatmap', 'Waiting time by hour', HEATMAP_BLOCKS, [{ name: 'Minutes', values: view.waitHeat.flat() }], 'minutes', 'Busy hours run longer around the period median.', { rows: HEATMAP_DAYS, matrix: view.waitHeat });
}

function Donut({ title, note, parts }: { title: string; note: string; parts: { name: string; value: number }[] }) {
  const copilot = useCopilot();
  const total = parts.reduce((sum, part) => sum + part.value, 0) || 1;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <figure className="gc-chart" data-chart-state="ok">
      <figcaption><strong>{title}</strong><span>{note}</span></figcaption>
      <svg viewBox="0 0 280 120" role="img" aria-label={`${title}. ${note}`}>
        {parts.map((part, index) => {
          const length = (part.value / total) * circumference;
          const node = (
            <circle key={part.name} cx="60" cy="60" r={radius} fill="none" stroke={PALETTE[index % PALETTE.length]} strokeWidth="14" strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-offset} transform="rotate(-90 60 60)" />
          );
          offset += length;
          return node;
        })}
        <text x="60" y="64" textAnchor="middle">{num(total)}</text>
        {parts.map((part, index) => (
          <text key={part.name} x="128" y={28 + index * 18} fontSize="12">{part.name} {num(part.value)}</text>
        ))}
      </svg>
      <button type="button" className="gc-text-btn" onClick={() => copilot.focusChart(title)}>Investigate {title}</button>
    </figure>
  );
}
