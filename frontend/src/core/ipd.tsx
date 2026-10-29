import { useMemo, useState, type ReactNode } from 'react';
import { scenarioFor } from '@/showcase/facts';
import { useShowcase } from '@/showcase/state';
import { alertsFor } from './alerts';
import { useCopilot } from './Copilot';
import { IPD_AI_CASES, ipdDocScenario, ipdIndicatorsFor, type Indicator, type IpdScopeInput } from './ipdScope';
import { sumKey, usePeriod, weighted } from './period';
import { Chart, ChartStage, type Figure } from './viz';

const PALETTE = ['#0f6e6a', '#1e3a5f', '#8c6a3d', '#4d6b8a', '#6e8b74', '#7c5c7a'];
const SPECIALTIES = ['Medicine', 'Surgery', 'Cardiology', 'Orthopedics', 'Women', 'Children'];
const SOURCES = ['From emergency', 'Elective / direct', 'Transfer in', 'Other'];
const DESTINATIONS = ['Home', 'Transfer out', 'Rehab / step-down', 'Left against medical advice'];

type Detail = { name: string; value: string; definition: string; scope: string };
type Tone = 'good' | 'watch' | 'alert' | 'neutral';
type View = ReturnType<typeof buildView>;

function buildView(hospital: string, year: number, period: ReturnType<typeof usePeriod>['period']) {
  const rows = period === 'year'
    ? scenarioFor(hospital, year).months.map((month, index) => ({ label: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index], month }))
    : periodRows(hospital, year, period);
  const fact = scenarioFor(hospital, year).focus;
  const admissions = sumKey(rows, 'admissions');
  const discharges = sumKey(rows, 'discharges');
  const deaths = sumKey(rows, 'deaths');
  const transfersIn = sumKey(rows, 'transfersIn');
  const transfersOut = sumKey(rows, 'transfersOut');
  const edAdmittedRaw = sumKey(rows, 'edAdmitted');
  // Admission sources must partition admissions (ED + elective/direct + transfer-in + other = admissions).
  const fromEmergency = Math.min(edAdmittedRaw, admissions);
  const transferSource = Math.min(transfersIn, Math.max(0, admissions - fromEmergency));
  const directAdmissions = Math.max(0, admissions - fromEmergency - transferSource);
  const otherSource = Math.max(0, admissions - fromEmergency - transferSource - directAdmissions);
  const edAdmitted = fromEmergency;
  const census = period === 'year' ? fact.occupiedBeds : Math.round(rows.reduce((sum, row) => sum + row.month.occupiedBeds, 0) / Math.max(rows.length, 1));
  const losMedian = period === 'year' ? fact.ipLosDays : weighted(rows, 'ipLosDays', 'admissions');
  const losP90 = period === 'year' ? fact.ipLosP90Days : weighted(rows, 'ipLosP90Days', 'admissions');
  const losAvg = period === 'year' ? fact.ipLosAvgDays : weighted(rows, 'ipLosAvgDays', 'admissions');
  // 7-day review line (aligned with catalog kpi_long_stay_gt_7d_rate). Rate rises with P90 above 7 days.
  const longStayRate = Math.min(0.22, Math.max(0.05, 0.10 + (losP90 - 7) * 0.025));
  const longStayCount = Math.round(discharges * longStayRate);
  const readyNotDischarged = Math.max(1, Math.round(census * 0.08));
  const delayedDischargeRate = census ? readyNotDischarged / census : 0;
  const expectedDischarges = Math.max(1, Math.round(discharges / (period === 'year' ? 365 : 91)));
  // Match catalog/alert bind: 30-day = 0.086 + occupancy×0.02; 7-day = 1.8% of discharges.
  const bedOcc = fact.staffedBeds ? fact.occupiedBeds / fact.staffedBeds : 0;
  const readmit30 = 0.086 + bedOcc * 0.02;
  const readmit7 = 0.018;
  const amaRate = 0.018;
  const specialtyWeights = [0.28, 0.22, 0.14, 0.12, 0.14, 0.1];
  const specialtyAdmissions = splitExact(admissions, specialtyWeights);
  const specialtyDischarges = splitExact(discharges, specialtyWeights);
  const specialties = SPECIALTIES.map((id, index) => ({
    id,
    admissions: specialtyAdmissions[index],
    discharges: specialtyDischarges[index],
    los: Math.round((losMedian * (0.85 + index * 0.06)) * 10) / 10,
  }));
  const sources = [
    { id: SOURCES[0], count: fromEmergency },
    { id: SOURCES[1], count: directAdmissions },
    { id: SOURCES[2], count: transferSource },
    { id: SOURCES[3], count: otherSource },
  ];
  const amaCount = Math.round(discharges * amaRate);
  const rehab = Math.round(discharges * 0.07);
  // Discharges exclude deaths in the census identity — destinations partition discharges only.
  const destTransfer = Math.min(transfersOut, Math.max(0, discharges - amaCount - rehab));
  const home = Math.max(0, discharges - amaCount - rehab - destTransfer);
  const destinations = [
    { id: DESTINATIONS[0], count: home },
    { id: DESTINATIONS[1], count: destTransfer },
    { id: DESTINATIONS[2], count: rehab },
    { id: DESTINATIONS[3], count: amaCount },
  ];
  const longStayWeights = specialties.map((item) => Math.max(0.01, item.discharges * (0.8 + item.los / Math.max(losMedian, 1))));
  const longStayBySpecialty = splitExact(longStayCount, longStayWeights);
  const docs = ipdDocScenario({ hospital, occupiedBeds: census, staffedBeds: fact.staffedBeds });
  return {
    admissions, discharges, deaths, transfersIn, transfersOut, edAdmitted, directAdmissions, census,
    losMedian, losP90, losAvg, longStayRate, longStayCount, longStayBySpecialty, readyNotDischarged, delayedDischargeRate,
    expectedDischarges, readmit7, readmit30, amaRate, specialties, sources, destinations,
    ...docs,
    labels: rows.map((row) => row.label),
    monthlyAdmissions: rows.map((row) => row.month.admissions),
    monthlyDischarges: rows.map((row) => row.month.discharges),
    monthlyDeaths: rows.map((row) => row.month.deaths),
    monthlyLos: rows.map((row) => row.month.ipLosDays),
    monthlyCensus: rows.map((row) => row.month.occupiedBeds),
  };
}

function periodRows(hospital: string, year: number, period: 'Q1' | 'Q2' | 'Q3' | 'Q4') {
  const start = { Q1: 0, Q2: 3, Q3: 6, Q4: 9 }[period];
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return scenarioFor(hospital, year).months.slice(start, start + 3).map((month, index) => ({ label: names[start + index], month }));
}

function splitExact(total: number, weights: number[]): number[] {
  const sum = weights.reduce((item, value) => item + value, 0) || 1;
  const raw = weights.map((weight) => (weight / sum) * total);
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

function usePrior(): View {
  const store = useShowcase();
  const { period } = usePeriod();
  const year = store.year <= 2024 ? 2024 : store.year - 1;
  return useMemo(() => buildView(store.hospital, year, period), [store.hospital, year, period]);
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
          <p className="gc-kicker">Inpatient Care</p>
          <h1>{title}</h1>
        </div>
      </header>
      <div className="gc-ribbon" data-testid="ipd-ribbon">
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
  return { type, title, categories, series, unit, digits: type === 'bullet' || unit === 'days' ? 1 : 0, note, domain: 'inpatient', subjects: [title], ...extra };
}

function Alerts() {
  const store = useShowcase();
  const copilot = useCopilot();
  const view = useView();
  const { period } = usePeriod();
  const alerts = alertsFor(store.hospital, store.year).filter((alert) => alert.department === 'Inpatient' && alert.severity !== 'info');
  return (
    <section className="gc-panel gc-insight span-4">
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
              Long stays and delayed discharges · {pct(view.longStayRate)} long-stay · {num(view.readyNotDischarged)} ready not discharged
            </button>
          </li>
        )}
      </ul>
      {period === 'year' ? null : <p>These alerts use the full reporting year. The scores above use the selected period.</p>}
      <div className="gc-next">
        <h2>Management action</h2>
        <p>Review long-stay and delayed-discharge indicators on Stay & Discharge while median length of stay is {num(view.losMedian, 1)} days and ready-not-discharged is {num(view.readyNotDischarged)}.</p>
        <button type="button" className="gc-ai-cta" onClick={() => { if (alerts[0]) copilot.openAlert(alerts[0], { stay: true }); else copilot.setOpen(true); }}>
          <span className="gc-ai-orb" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M4 20l7.2-7.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M12.8 5.2l1.4 3.4 3.4 1.4-3.4 1.4-1.4 3.4-1.4-3.4-3.4-1.4 3.4-1.4z" fill="currentColor" />
            </svg>
          </span>
          Open Vital Assist
        </button>
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

function scopeInput(view: View): IpdScopeInput {
  return {
    admissions: view.admissions,
    census: view.census,
    discharges: view.discharges,
    deaths: view.deaths,
    edAdmitted: view.edAdmitted,
    directAdmissions: view.directAdmissions,
    transfersIn: view.transfersIn,
    transfersOut: view.transfersOut,
    losAvg: view.losAvg,
    losMedian: view.losMedian,
    losP90: view.losP90,
    longStayCount: view.longStayCount,
    longStayRate: view.longStayRate,
    expectedDischarges: view.expectedDischarges,
    readyNotDischarged: view.readyNotDischarged,
    delayedDischargeRate: view.delayedDischargeRate,
    readmit7: view.readmit7,
    readmit30: view.readmit30,
    amaRate: view.amaRate,
    specialties: view.specialties,
    sources: view.sources,
    destinations: view.destinations,
    oeLos: null,
    delayP50: null,
    delayP90: null,
    readinessDocRate: view.readinessDocRate,
    dischargeSummaryRate: view.dischargeSummaryRate,
    carePlanDocRate: view.carePlanDocRate,
    carePlanReviewRate: view.carePlanReviewRate,
    dailyReviewRate: view.dailyReviewRate,
    consultResponseHours: view.consultResponseHours,
    pendingConsults: view.pendingConsults,
    milestoneRate: view.milestoneRate,
    admissionAssessmentRate: view.admissionAssessmentRate,
    diagnosisDocRate: view.diagnosisDocRate,
    dischargeInstructionsRate: view.dischargeInstructionsRate,
    medRecRate: view.medRecRate,
    followUpPlanRate: view.followUpPlanRate,
    cancelRate: null,
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
          <p>Figures for this view. Bed occupancy and staffing stay in Beds & Capacity.</p>
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
          <article key={item.name} className={`gc-scope-card is-${item.status === 'unavailable' ? 'blank' : item.status}`} style={{ animationDelay: `${index * 35}ms` }} title={item.method}>
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

function AiIndex() {
  return (
    <section className="gc-panel span-12 gc-scope gc-scope-tight">
      <div className="gc-scope-head">
        <div>
          <h2>AI decision support</h2>
          <p>Illustrative inpatient intelligence · AI never decides discharge readiness alone</p>
        </div>
      </div>
      <div className="gc-scope-grid gc-scope-grid-dense">
        {IPD_AI_CASES.map((item, index) => (
          <article key={item.id} className="gc-scope-card is-constructed gc-scope-card-dense" style={{ animationDelay: `${index * 25}ms` }} title={item.limit}>
            <span className="gc-scope-status">{item.level}</span>
            <strong>{item.name}</strong>
            <em>{item.analysis}</em>
          </article>
        ))}
      </div>
    </section>
  );
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

function losTone(days: number): Tone {
  if (days >= 6) return 'alert';
  if (days >= 4.5) return 'watch';
  return 'good';
}

export function IpdSnapshotPage() {
  const view = useView();
  const prior = usePrior();
  return (
    <Page title="Inpatient Snapshot" kpis={[
      score('Inpatient admissions', num(view.admissions), compare(view, prior, (item) => item.admissions), 'Inpatient admissions in the selected hospital and reporting period. Not ED visits and not bed occupancy.', `${num(view.admissions)} admissions.`, 'value-kpi_ipd_admissions', 'neutral'),
      score('Inpatient census', num(view.census), compare(view, prior, (item) => item.census), 'Point-in-time inpatient census as a patient count (year focus snapshot, or period-average month-end occupied beds for a quarter). Bed occupancy rate stays in Beds & Capacity.', `${num(view.census)} patients.`, undefined, 'watch'),
      score('Inpatient discharges', num(view.discharges), compare(view, prior, (item) => item.discharges), 'Completed inpatient discharges in the selected period. Bed turnaround stays in Beds & Capacity.', `${num(view.discharges)} discharges.`, undefined, 'good'),
      score('Median length of stay', `${num(view.losMedian, 1)} days`, compare(view, prior, (item) => item.losMedian), 'Median inpatient length of stay for completed stays. Not ED length of stay.', `Median ${num(view.losMedian, 1)} days.`, undefined, losTone(view.losMedian)),
      score('Admissions from ED', num(view.edAdmitted), compare(view, prior, (item) => item.edAdmitted), 'Admissions that began in the emergency department. ED waiting time stays in Emergency.', `${num(view.edAdmitted)} of ${num(view.admissions)} admissions.`, undefined, 'watch'),
      score('Elective / direct admissions', num(view.directAdmissions), compare(view, prior, (item) => item.directAdmissions), 'Elective and direct admissions that did not start in emergency and are not counted in the transfer-in source share.', `${num(view.directAdmissions)} of ${num(view.admissions)} admissions.`, undefined, 'neutral'),
    ]}>
      <Slot span="span-8" figure={fig('area', 'Inpatient admissions over time', view.labels, [{ name: 'Admissions', values: view.monthlyAdmissions }], 'patients', 'Monthly admissions sum to the selected period total.')} />
      <Alerts />
      <Slot figure={fig('bars', 'Inpatient volume context', ['Census (snapshot)', 'Admissions (period)', 'Transfers in', 'Discharges', 'Transfers out', 'Deaths'], [{ name: 'Patients', values: [view.census, view.admissions, view.transfersIn, view.discharges, view.transfersOut, view.deaths] }], 'patients', 'Census is a point-in-time patient count. The other series are period totals. Do not add census to period flows. Bed status ownership stays in Beds & Capacity.')} />
      <Donut title="Admission source mix" note="From emergency, elective/direct, transfer in, and other partition admissions and sum to the period admission total." parts={view.sources.map((item) => ({ name: item.id, value: item.count }))} />
      <Slot figure={fig('stacked', 'Admissions by specialty', view.labels, view.specialties.map((specialty) => ({ name: specialty.id, values: splitExact(specialty.admissions, view.monthlyAdmissions.map((value) => value || 0.0001)) })), 'patients', 'Specialty stacks still sum to monthly admissions.')} />
      <Slot figure={fig('bars', 'Episode volume summary', ['Admissions', 'Census snapshot', 'Discharges', 'Deaths'], [{ name: 'Patients', values: [view.admissions, view.census, view.discharges, view.deaths] }], 'patients', 'Period admissions, discharges, and deaths beside the census snapshot. Census is not a period total.')} />
      <IndicatorIndex indicators={ipdIndicatorsFor(scopeInput(view))} domains={['Admissions & Inpatient Activity']} />
    </Page>
  );
}

export function IpdStayPage() {
  const view = useView();
  const prior = usePrior();
  const horizons = ['24h', '48h', '72h', '96h'];
  const dischargeOutlook = [view.expectedDischarges, Math.round(view.expectedDischarges * 2), Math.round(view.expectedDischarges * 3), Math.round(view.expectedDischarges * 4)];
  return (
    <Page title="Stay & Discharge" kpis={[
      score('Average length of stay', `${num(view.losAvg, 1)} days`, compare(view, prior, (item) => item.losAvg), 'Average days for completed inpatient stays in the selected period.', `Average ${num(view.losAvg, 1)} days.`, undefined, losTone(view.losAvg)),
      score('Median length of stay', `${num(view.losMedian, 1)} days`, compare(view, prior, (item) => item.losMedian), 'Median days for completed inpatient stays in the selected period.', `Median ${num(view.losMedian, 1)} days.`, 'value-kpi_ipd_los_median', losTone(view.losMedian)),
      score('Length of stay (P90)', `${num(view.losP90, 1)} days`, compare(view, prior, (item) => item.losP90), '90th-percentile inpatient length of stay for completed stays.', `P90 ${num(view.losP90, 1)} days.`, undefined, view.losP90 >= 9 ? 'alert' : view.losP90 >= 7 ? 'watch' : 'good'),
      score('Long-stay patient count', num(view.longStayCount), compare(view, prior, (item) => item.longStayCount), 'Completed stays beyond the 7-day review line in this scenario.', `${pct(view.longStayRate)} of discharges.`, undefined, rateTone(view.longStayRate, 0.1, 0.15)),
      score('Medically ready, not discharged', num(view.readyNotDischarged), compare(view, prior, (item) => item.readyNotDischarged), 'Census share marked clinically ready for discharge but still admitted (administrative or placement delay). AI does not decide medical readiness.', `${num(view.readyNotDischarged)} patients.`, undefined, view.readyNotDischarged > 5 ? 'alert' : 'watch'),
      score('Delayed discharge rate', pct(view.delayedDischargeRate), compare(view, prior, (item) => item.delayedDischargeRate, true), 'Medically ready, not discharged ÷ census. Distinguishes clinical readiness from completed discharge.', `${num(view.readyNotDischarged)} / ${num(view.census)}.`, undefined, rateTone(view.delayedDischargeRate, 0.06, 0.1)),
      score('Expected discharges (next day)', num(view.expectedDischarges), compare(view, prior, (item) => item.expectedDischarges), 'Illustrative next-day discharges from the period rate. Not a validated forecast.', `${num(view.expectedDischarges)} patients.`, undefined, 'good'),
      score('Inpatient discharges', num(view.discharges), compare(view, prior, (item) => item.discharges), 'Completed inpatient discharges in the selected period.', `${num(view.discharges)} discharges.`, undefined, 'neutral'),
    ]}>
      <Slot span="span-8" figure={fig('line', 'Median length of stay over time', view.labels, [{ name: 'Median days', values: view.monthlyLos }], 'days', 'Monthly median inpatient length of stay. Not a bed occupancy series.')} />
      <section className="gc-panel gc-insight span-4">
        <h2>Stay watch list</h2>
        <div className="gc-exception-list">
          <div className={`gc-exception gc-tone-${losTone(view.losMedian)}`}>
            <strong>Median length of stay</strong>
            <span>{num(view.losMedian, 1)} days · average {num(view.losAvg, 1)}</span>
          </div>
          <div className={`gc-exception gc-tone-${rateTone(view.longStayRate, 0.1, 0.15)}`}>
            <strong>Long-stay rate</strong>
            <span>{pct(view.longStayRate)} · {num(view.longStayCount)} patients</span>
          </div>
          <div className={`gc-exception gc-tone-${view.readyNotDischarged > 5 ? 'alert' : 'watch'}`}>
            <strong>Medically ready, not discharged</strong>
            <span>{num(view.readyNotDischarged)} · clinician decision required</span>
          </div>
        </div>
        <p className="gc-next">Observed-to-expected LOS and delay duration clocks are not available in this scenario.</p>
      </section>
      <Slot figure={fig('pareto', 'Long-stay contribution by specialty', view.specialties.map((item) => item.id), [{ name: 'Long-stay patients', values: view.longStayBySpecialty }], 'patients', `Specialty shares sum to ${num(view.longStayCount)} long-stay discharges (7-day review line). Severity is not adjusted.`)} />
      <Slot figure={fig('bars', 'Length of stay vs review lines', ['Median', 'Average', 'P90'], [{ name: 'Days', values: [view.losMedian, view.losAvg, view.losP90] }], 'days', 'Scenario review lines: watch near 4.5 days, alert near 6 days for the median. Long-stay review line is 7 days.')} />
      <Slot figure={fig('bars', 'Length of stay by specialty', view.specialties.map((item) => item.id), [{ name: 'Median days', values: view.specialties.map((item) => item.los) }], 'days', 'Specialty medians around the hospital median. Raw gaps are not proof of better or worse care.')} />
      <Slot figure={fig('bars', 'Discharge destinations', view.destinations.map((item) => item.id), [{ name: 'Discharges', values: view.destinations.map((item) => item.count) }], 'patients', 'Destinations partition completed discharges and sum to the period discharge total. Inpatient deaths are counted separately (not a discharge destination).')} />
      <Slot span="span-8" figure={fig('area', 'Expected discharge outlook', horizons, [{ name: 'Expected discharges', values: dischargeOutlook }], 'patients', 'Illustrative cumulative sketch from the period daily discharge rate (24–96h). Not a validated forecast.')} />
      <section className="gc-panel gc-insight span-4">
        <h2>Discharge pipeline</h2>
        <div className="gc-exception-list">
          <div className="gc-exception gc-tone-good">
            <strong>Expected next day</strong>
            <span>{num(view.expectedDischarges)} discharges</span>
          </div>
          <div className={`gc-exception gc-tone-${rateTone(view.delayedDischargeRate, 0.06, 0.1)}`}>
            <strong>Delayed discharge rate</strong>
            <span>{pct(view.delayedDischargeRate)} of census</span>
          </div>
          <div className={`gc-exception gc-tone-${rateTone(1 - view.dischargeSummaryRate, 0.12, 0.2)}`}>
            <strong>Discharge summary completion</strong>
            <span>{pct(view.dischargeSummaryRate)} illustrative · delay duration clocks not available</span>
          </div>
        </div>
        <p className="gc-next">Bed cleaning and assignment after discharge stay in Beds & Capacity. Observed-to-expected LOS remains unavailable.</p>
      </section>
      <IndicatorIndex indicators={ipdIndicatorsFor(scopeInput(view))} domains={['Inpatient Length of Stay', 'Discharge Management']} />
    </Page>
  );
}

export function IpdOutcomesPage() {
  const view = useView();
  const prior = usePrior();
  const mortality = view.admissions ? view.deaths / view.admissions : 0;
  const completion = view.discharges / Math.max(view.admissions + view.transfersIn, 1);
  return (
    <Page title="Care Progress & Outcomes" kpis={[
      score('Unplanned 7-day readmission rate', pct(view.readmit7), compare(view, prior, (item) => item.readmit7, true), 'Unplanned 7-day readmission share of discharges. Visits are not linked patient-by-patient.', `${pct(view.readmit7)} of discharges.`, undefined, rateTone(view.readmit7, 0.03, 0.05)),
      score('Unplanned 30-day readmission rate', pct(view.readmit30), compare(view, prior, (item) => item.readmit30, true), 'Unplanned 30-day readmission share of discharges. Planned returns are not separated.', `${pct(view.readmit30)} of discharges.`, 'value-kpi_ipd_readmit_30', rateTone(view.readmit30, 0.08, 0.11)),
      score('Inpatient mortality count', num(view.deaths), compare(view, prior, (item) => item.deaths), 'Deaths during the inpatient episode. Emergency deaths stay in Emergency.', `${num(view.deaths)} deaths.`, undefined, view.deaths > 0 ? 'alert' : 'good'),
      score('Inpatient mortality rate', pct(mortality), compare(view, prior, (item) => item.admissions ? item.deaths / item.admissions : 0, true), 'Inpatient deaths ÷ inpatient admissions.', `${num(view.deaths)} / ${num(view.admissions)}.`, undefined, mortality > 0.01 ? 'alert' : mortality > 0.005 ? 'watch' : 'good'),
      score('Discharge against medical advice', pct(view.amaRate), 'Scenario share', 'Fixed scenario share of discharges labelled left against medical advice. Not a linked chart-review cohort.', `${pct(view.amaRate)} of discharges.`, undefined, rateTone(view.amaRate, 0.02, 0.03)),
      score('Discharge-to-admission flow ratio', pct(completion), compare(view, prior, (item) => item.discharges / Math.max(item.admissions + item.transfersIn, 1), true), 'Discharges ÷ (admissions + transfers in). A period flow-identity check only — not a measure of completed clinical episodes or care quality.', `${num(view.discharges)} discharges / ${num(view.admissions + view.transfersIn)} admissions and transfers in.`, undefined, 'neutral'),
    ]}>
      <Slot span="span-8" figure={fig('line', 'Readmissions and mortality over time', view.labels, [
        { name: 'Est. 30-day readmissions', values: view.monthlyDischarges.map((value) => Math.round(value * view.readmit30)) },
        { name: 'Inpatient deaths', values: view.monthlyDeaths },
      ], 'patients', 'Readmissions are a scenario share of discharges. Deaths sum to the period total. Series are not mixed into one rate.')} />
      <section className="gc-panel gc-insight span-4">
        <h2>Outcome watch list</h2>
        <div className="gc-exception-list">
          <div className={`gc-exception gc-tone-${rateTone(view.readmit30, 0.08, 0.11)}`}>
            <strong>30-day readmission rate</strong>
            <span>{pct(view.readmit30)} of discharges</span>
          </div>
          <div className={`gc-exception gc-tone-${mortality > 0 ? 'alert' : 'good'}`}>
            <strong>Inpatient mortality</strong>
            <span>{pct(mortality)} · {num(view.deaths)} / {num(view.admissions)}</span>
          </div>
          <div className={`gc-exception gc-tone-${view.consultResponseHours >= 12 ? 'watch' : 'good'}`}>
            <strong>Median consultation response</strong>
            <span>{num(view.consultResponseHours, 1)} hours · {num(view.pendingConsults)} pending (illustrative)</span>
          </div>
        </div>
        <p className="gc-next">Documentation rates below are illustrative scenario shares. AI does not decide that a patient is medically ready to leave.</p>
      </section>
      <Slot figure={fig('bars', '30-day readmissions by specialty', view.specialties.map((item) => item.id), [{ name: 'Readmissions', values: view.specialties.map((item) => Math.round(item.discharges * view.readmit30 * (0.75 + item.los / Math.max(view.losMedian, 1) * 0.2))) }], 'patients', 'Specialty shares around the hospital 30-day rate. Severity is not adjusted.')} />
      <Slot figure={fig('line', 'Census vs discharges over time', view.labels, [
        { name: 'Inpatient census', values: view.monthlyCensus },
        { name: 'Discharges', values: view.monthlyDischarges },
      ], 'patients', 'Census is a month-end patient count. Discharges are period totals. They are shown together for context, not stacked as one identity. Bed occupancy rate stays in Beds & Capacity.')} />
      <JourneyStrip view={view} />
      <DocProgressStrip view={view} />
      <IndicatorIndex indicators={ipdIndicatorsFor(scopeInput(view))} domains={['Inpatient Care Coordination', 'Inpatient Outcomes', 'Inpatient Documentation & Continuity']} />
      <AiIndex />
    </Page>
  );
}

function JourneyStrip({ view }: { view: View }) {
  const steps = [
    { label: 'Admissions', value: num(view.admissions) },
    { label: 'Census', value: num(view.census) },
    { label: 'Ready, not discharged', value: num(view.readyNotDischarged) },
    { label: 'Discharges', value: num(view.discharges) },
    { label: '30-day readmit', value: pct(view.readmit30) },
  ];
  return (
    <section className="gc-panel span-12 gc-ipd-journey">
      <div className="gc-scope-head">
        <div>
          <h2>Inpatient journey</h2>
          <p>Period admissions → census snapshot → discharge planning → discharges → outcome rate</p>
        </div>
      </div>
      <ol className="gc-ipd-steps">
        {steps.map((step, index) => (
          <li key={step.label} style={{ animationDelay: `${index * 70}ms` }}>
            <span>{step.label}</span>
            <strong>{step.value}</strong>
          </li>
        ))}
      </ol>
    </section>
  );
}

function DocProgressStrip({ view }: { view: View }) {
  const items = [
    { name: 'Care Plan Documentation Rate', value: pct(view.carePlanDocRate) },
    { name: 'Daily Clinical Review Completion Rate', value: pct(view.dailyReviewRate) },
    { name: 'Median Consultation Response Time', value: `${num(view.consultResponseHours, 1)} hours` },
    { name: 'Discharge Summary Completion Rate', value: pct(view.dischargeSummaryRate) },
    { name: 'Discharge Medication Reconciliation Completion Rate', value: pct(view.medRecRate) },
    { name: 'Follow-up Plan Documentation Rate', value: pct(view.followUpPlanRate) },
  ];
  return (
    <section className="gc-panel span-12 gc-scope gc-scope-tight" data-testid="ipd-doc-progress">
      <div className="gc-scope-head">
        <div>
          <h2>Care documentation & continuity</h2>
          <p>Illustrative completion shares for this hospital and period · not extracted chart documents · not inferred from length of stay</p>
        </div>
      </div>
      <div className="gc-scope-grid gc-scope-grid-dense">
        {items.map((item, index) => (
          <article key={item.name} className="gc-scope-card is-constructed gc-scope-card-dense" style={{ animationDelay: `${index * 25}ms` }} title="Illustrative scenario share for executive demonstration.">
            <span className="gc-scope-status">Estimated</span>
            <strong>{item.name}</strong>
            <em>{item.value}</em>
          </article>
        ))}
      </div>
    </section>
  );
}

function Donut({ title, note, parts }: { title: string; note: string; parts: { name: string; value: number }[] }) {
  const copilot = useCopilot();
  const total = parts.reduce((sum, part) => sum + part.value, 0) || 1;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <section className="gc-panel gc-slot span-6">
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
              <text className="gc-donut-total" x="60" y="64" textAnchor="middle">{num(total)}</text>
            </svg>
            <ul className="gc-donut-legend">
              {parts.map((part, index) => (
                <li key={part.name} style={{ animationDelay: `${120 + index * 60}ms` }}>
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
    </section>
  );
}
