import { useMemo, useState, type ReactNode } from 'react';
import { useShowcase } from '@/showcase/state';
import { alertsFor } from './alerts';
import { useCopilot } from './Copilot';
import { IPD_AI_CASES, ipdIndicatorsFor, type Indicator, type IpdScopeInput } from './ipdScope';
import { specialtyReadmitShare } from './ipdScope';
import { buildIpdView, splitExact, type IpdView } from './ipdView';
import { usePeriod } from './period';
import { Chart, ChartStage, type Figure } from './viz';

const PALETTE = ['#0f6e6a', '#1e3a5f', '#8c6a3d', '#4d6b8a', '#6e8b74', '#7c5c7a'];

type Detail = { name: string; value: string; definition: string; scope: string };
type Tone = 'good' | 'watch' | 'alert' | 'neutral';
type View = IpdView;

function useView(): View {
  const store = useShowcase();
  const { period } = usePeriod();
  return useMemo(() => buildIpdView(store.hospital, store.year, period), [store.hospital, store.year, period]);
}

function usePrior(): View {
  const store = useShowcase();
  const { period } = usePeriod();
  const year = store.year <= 2024 ? 2024 : store.year - 1;
  return useMemo(() => buildIpdView(store.hospital, year, period), [store.hospital, year, period]);
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
  return { type, title, categories, series, unit, digits: type === 'bullet' || unit === 'days' ? 1 : 0, note, domain: 'inpatient', subjects: [title], ...extra };
}

function Alerts({ packed = false }: { packed?: boolean } = {}) {
  const store = useShowcase();
  const copilot = useCopilot();
  const view = useView();
  const { period } = usePeriod();
  const alerts = alertsFor(store.hospital, store.year).filter((alert) => alert.department === 'Inpatient' && alert.severity !== 'info');
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
      score('Inpatient census', num(view.census), compare(view, prior, (item) => item.census), `Inpatient census as a patient count (${view.censusBasis}). Not a period total and not a bed occupancy rate — occupancy stays in Beds & Capacity.`, `${num(view.census)} patients · ${view.censusBasis}.`, undefined, 'watch'),
      score('Inpatient discharges', num(view.discharges), compare(view, prior, (item) => item.discharges), 'Completed inpatient discharges in the selected period. Bed turnaround stays in Beds & Capacity.', `${num(view.discharges)} discharges.`, undefined, 'good'),
      score('Median length of stay', `${num(view.losMedian, 1)} days`, compare(view, prior, (item) => item.losMedian), 'Median inpatient length of stay for completed stays. Not ED length of stay.', `Median ${num(view.losMedian, 1)} days.`, undefined, losTone(view.losMedian)),
      score('Admissions from ED', num(view.edAdmitted), compare(view, prior, (item) => item.edAdmitted), 'Admissions that began in the emergency department. ED waiting time stays in Emergency.', `${num(view.edAdmitted)} of ${num(view.admissions)} admissions.`, undefined, 'watch'),
      score('Elective / direct admissions', num(view.directAdmissions), compare(view, prior, (item) => item.directAdmissions), 'Elective and direct admissions that did not start in emergency and are not counted in the transfer-in source share.', `${num(view.directAdmissions)} of ${num(view.admissions)} admissions.`, undefined, 'neutral'),
    ]}>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('area', 'Inpatient admissions over time', view.labels, [{ name: 'Admissions', values: view.monthlyAdmissions }], 'patients', 'Monthly admissions sum to the selected period total.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Alerts packed />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Inpatient volume context', ['Transfers in', 'Transfers out'], [{ name: 'Patients', values: [view.transfersIn, view.transfersOut] }], 'patients', 'Inbound vs outbound transfer volume on one shared scale. Answers whether transfer activity is balanced. Period admissions and discharges stay on the ribbon KPIs and the admissions-over-time chart.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Donut packed title="Admission source mix" note="From emergency, elective/direct, transfer in, and other partition admissions and sum to the period admission total." parts={view.sources.map((item) => ({ name: item.id, value: item.count }))} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('stacked', 'Admissions by specialty', view.labels, view.specialties.map((specialty) => ({ name: specialty.id, values: splitExact(specialty.admissions, view.monthlyAdmissions.map((value) => value || 0.0001)) })), 'patients', 'Specialty stacks still sum to monthly admissions.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Non-home episode exits', ['Transfer out', 'Rehab / step-down', 'Left against medical advice', 'Inpatient deaths'], [{ name: 'Patients', values: [
            view.destinations.find((item) => item.id === 'Transfer out')?.count ?? 0,
            view.destinations.find((item) => item.id === 'Rehab / step-down')?.count ?? 0,
            view.destinations.find((item) => item.id === 'Left against medical advice')?.count ?? 0,
            view.deaths,
          ] }], 'patients', 'How inpatient episodes end when the destination is not Home. Answers transfer, rehab, AMA, and mortality exits without repeating the admissions/discharges totals already on the ribbon.')} />
        </div>
      </div>
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
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Median length of stay over time', view.labels, [{ name: 'Median days', values: view.monthlyLos }], 'days', 'Monthly median inpatient length of stay. Not a bed occupancy series.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Length of stay vs review lines', ['Median', 'Average', 'P90'], [{ name: 'Days', values: [view.losMedian, view.losAvg, view.losP90] }], 'days', 'Scenario review lines: watch near 4.5 days, alert near 6 days for the median. Long-stay review line is 7 days.')} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('pareto', 'Long-stay contribution by specialty', view.specialties.map((item) => item.id), [{ name: 'Long-stay patients', values: view.longStayBySpecialty }], 'patients', `Bars = patient counts (left). Brown line = cumulative % of ${num(view.longStayCount)} (right, to 100%). Ranked high→low.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Length of stay by specialty', view.specialties.map((item) => item.id), [{ name: 'Median days', values: view.specialties.map((item) => item.los) }], 'days', 'Specialty medians around the hospital median. Raw gaps are not proof of better or worse care.')} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Discharge destinations', view.destinations.filter((item) => item.id !== 'Home').map((item) => item.id), [{ name: 'Share of discharges', values: view.destinations.filter((item) => item.id !== 'Home').map((item) => (view.discharges ? Math.round((item.count / view.discharges) * 1000) / 10 : 0)) }], '%', (() => {
            const homeShare = view.discharges ? Math.round(((view.destinations.find((item) => item.id === 'Home')?.count ?? 0) / view.discharges) * 1000) / 10 : 0;
            return `Non-home shares of ${num(view.discharges)} discharges (%). Home is ${homeShare}% in this note. Deaths are not a discharge destination.`;
          })())} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('area', 'Expected discharge outlook', horizons, [{ name: 'Expected discharges', values: dischargeOutlook }], 'patients', 'Illustrative cumulative sketch from the period daily discharge rate (24–96h). Not a validated forecast.')} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <section className="gc-panel gc-insight">
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
        </div>
        <div className="gc-ed-pack-col">
          <section className="gc-panel gc-insight">
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
        </div>
      </div>
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
      score('Unplanned 7-day readmission rate', pct(view.readmit7), compare(view, prior, (item) => item.readmit7, true), `Unplanned 7-day readmission share of discharges in ${view.periodLabel}. Visits are not linked patient-by-patient.`, `${pct(view.readmit7)} of ${num(view.discharges)} discharges (${view.periodLabel}).`, undefined, rateTone(view.readmit7, 0.03, 0.05)),
      score('Unplanned 30-day readmission rate', pct(view.readmit30), compare(view, prior, (item) => item.readmit30, true), `Unplanned 30-day readmission share of discharges in ${view.periodLabel}. Rate tilt uses the period census ÷ staffed beds. Planned returns are not separated.`, `${pct(view.readmit30)} of ${num(view.discharges)} discharges (${view.periodLabel}).`, 'value-kpi_ipd_readmit_30', rateTone(view.readmit30, 0.08, 0.11)),
      score('Inpatient mortality count', num(view.deaths), compare(view, prior, (item) => item.deaths), 'Deaths during the inpatient episode. Emergency deaths stay in Emergency.', `${num(view.deaths)} deaths.`, undefined, view.deaths > 0 ? 'alert' : 'good'),
      score('Inpatient mortality rate', pct(mortality), compare(view, prior, (item) => item.admissions ? item.deaths / item.admissions : 0, true), 'Inpatient deaths ÷ inpatient admissions.', `${num(view.deaths)} / ${num(view.admissions)}.`, undefined, mortality > 0.01 ? 'alert' : mortality > 0.005 ? 'watch' : 'good'),
      score('Discharge against medical advice', pct(view.amaRate), 'Scenario share', 'Fixed scenario share of discharges labelled left against medical advice. Not a linked chart-review cohort.', `${pct(view.amaRate)} of discharges.`, undefined, rateTone(view.amaRate, 0.02, 0.03)),
      score('Discharge-to-admission flow ratio', pct(completion), compare(view, prior, (item) => item.discharges / Math.max(item.admissions + item.transfersIn, 1), true), 'Discharges ÷ (admissions + transfers in). A period flow-identity check only — not a measure of completed clinical episodes or care quality.', `${num(view.discharges)} discharges / ${num(view.admissions + view.transfersIn)} admissions and transfers in.`, undefined, 'neutral'),
    ]}>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Est. 30-day readmissions over time', view.labels, [
            { name: 'Est. 30-day readmissions', values: view.monthlyDischarges.map((value) => Math.round(value * view.readmit30)) },
          ], 'patients', `Scenario share of monthly discharges at the ${view.periodLabel} 30-day rate. Kept on its own scale — not mixed with mortality counts.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Inpatient deaths over time', view.labels, [
            { name: 'Inpatient deaths', values: view.monthlyDeaths },
          ], 'patients', 'Monthly inpatient deaths sum to the period total. Kept on its own scale — not drawn against readmission volume.')} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', '30-day readmissions by specialty', view.specialties.map((item) => item.id), [{ name: 'Readmissions', values: view.specialties.map((item) => Math.round(item.discharges * specialtyReadmitShare(view.readmit30, item.los, view.losMedian))) }], 'patients', `Specialty shares around the ${view.periodLabel} hospital 30-day rate (same constructed tilt as the indicator catalog). Severity is not adjusted.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Discharges over time', view.labels, [
            { name: 'Discharges', values: view.monthlyDischarges },
          ], 'patients', 'Monthly completed discharges. Period totals — not a census series. Bed occupancy stays in Beds & Capacity.')} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Inpatient census over time', view.labels, [
            { name: 'Inpatient census', values: view.monthlyCensus },
          ], 'patients', 'Month-end inpatient census (patient count). Kept on its own scale — not drawn against period discharge totals.')} />
        </div>
        <div className="gc-ed-pack-col">
          <section className="gc-panel gc-insight gc-insight-compact">
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
                <span>{num(view.consultResponseHours, 1)} hours · {num(view.pendingConsults)} pending</span>
              </div>
            </div>
            <p className="gc-next">Documentation below is illustrative · AI does not decide readiness.</p>
          </section>
        </div>
      </div>
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
