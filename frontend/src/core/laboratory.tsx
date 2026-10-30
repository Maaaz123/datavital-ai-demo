import { useMemo, useState, type ReactNode } from 'react';
import { useShowcase } from '@/showcase/state';
import { alertsFor } from './alerts';
import { LABORATORY_AI_CASES, laboratoryIndicatorsFor, type Indicator } from './laboratoryScope';
import { buildLaboratoryView, type LaboratoryView } from './laboratoryView';
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
type View = LaboratoryView;

function useView(): View {
  const store = useShowcase();
  const { period } = usePeriod();
  return useMemo(() => buildLaboratoryView(store.hospital, store.year, period), [store.hospital, store.year, period]);
}

function usePrior(): View {
  const store = useShowcase();
  const { period } = usePeriod();
  const year = store.year <= 2024 ? 2024 : store.year - 1;
  return useMemo(() => buildLaboratoryView(store.hospital, year, period), [store.hospital, year, period]);
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
          <p className="gc-kicker">Laboratory & Pathology</p>
          <h1>{title}</h1>
        </div>
      </header>
      <div className="gc-ribbon" data-testid="lab-ribbon">
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
  return { type, title, categories, series, unit, digits, note, domain: 'laboratory', subjects: [title], ...extra };
}

function Alerts({ packed = false }: { packed?: boolean } = {}) {
  const store = useShowcase();
  const copilot = useCopilot();
  const view = useView();
  const { period } = usePeriod();
  const alerts = alertsFor(store.hospital, store.year).filter((alert) => alert.department === 'Laboratory' && alert.severity !== 'info');
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
              Laboratory within management thresholds · open Vital Assist
            </button>
          </li>
        )}
      </ul>
      {period === 'year' ? null : <p>These alerts use the full reporting year. The scores above use the selected period.</p>}
      <div className="gc-next">
        <h2>Management action</h2>
        <p>Review analyzer utilization ({pct(view.analyzerUtilization)}), testing backlog ({num(view.testingBacklog)}), and median Lab TAT ({num(view.medianLabTatHours, 1)} h) for {view.periodLabel}.</p>
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
  const blankCount = indicators.filter((item) => domains.includes(item.domain) && item.status === 'unavailable').length;
  return (
    <section className="gc-panel span-12 gc-scope gc-scope-tight" data-testid="lab-indicator-catalog">
      <div className="gc-scope-head">
        <div>
          <h2>Performance indicators</h2>
          <p>
            Definition catalog for this screen — full names, formulas, units, and ownership. Headline numbers stay in the KPI ribbon above. Bed occupancy stays in Beds; OR utilization stays in Surgery; scanner utilization stays in Radiology.
          </p>
        </div>
        {blankCount ? (
          <button type="button" className="gc-text-btn" aria-pressed={reveal} onClick={() => setReveal((value) => !value)}>
            {reveal ? 'Hide indicators not available in this view' : 'Show indicators not available in this view'}
          </button>
        ) : null}
      </div>
      <div className="gc-scope-grid gc-scope-grid-dense">
        {rows.map((item) => (
          <article
            key={`${item.domain}-${item.name}`}
            className={`gc-scope-card${item.status === 'unavailable' ? ' is-blank' : ''}`}
            title={[item.method, item.cohort, item.aggregation, item.scope, item.limitations].filter(Boolean).join(' · ')}
            data-catalog="definition"
          >
            <strong>{item.name}</strong>
            <em>{item.summary}</em>
            <span className={`gc-scope-status is-${item.status === 'unavailable' ? 'blank' : item.status === 'scenario' ? 'available' : 'estimated'}`}>
              {item.status === 'unavailable' ? 'Owned elsewhere' : item.status === 'scenario' ? 'Scenario' : 'Constructed'}
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
          <p>Illustrative laboratory capacity intelligence · not a validated LIS/middleware engine</p>
        </div>
      </div>
      <div className="gc-scope-grid gc-scope-grid-dense">
        {LABORATORY_AI_CASES.map((item) => (
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

export function LabCommandPage() {
  const view = useView();
  const prior = usePrior();
  return (
    <Page title="Laboratory Command Center" kpis={[
      score('Test Orders', num(view.orders), compare(view, prior, (item) => item.orders), 'Laboratory Test Orders',
        'Unique eligible laboratory orders in the selected hospital and period.',
        `${num(view.orders)} orders · ${num(view.testItems)} test items · ${view.periodLabel}.`,
        { formula: 'Unique laboratory orders (distinct from specimens and test items)', testId: 'value-kpi_lab_test_orders', tone: 'neutral' }),
      score('Completed Tests', num(view.completedTests), compare(view, prior, (item) => item.completedTests), 'Completed Laboratory Tests',
        'Released test results (analysis + validation). Distinct from orders and specimens.',
        `${num(view.completedTests)} completed · ${num(view.pendingTests)} pending · ${num(view.cancelledTests)} cancelled.`,
        { formula: 'Released results in period', tone: 'good', limitations: 'Completed Tests ≠ Orders. Specimens are a separate grain.' }),
      score('Completion Rate', pct(view.completionRate), compare(view, prior, (item) => item.completionRate, true), 'Laboratory Test Completion Rate',
        'Completed tests as a share of test items.',
        `${num(view.completedTests)} of ${num(view.testItems)}.`,
        { formula: 'Completed Tests ÷ Test Items', tone: rateTone(view.completionRate, 0.9, 0.85, false) }),
      score('Pending Tests', num(view.pendingTests), compare(view, prior, (item) => item.pendingTests), 'Pending Laboratory Tests',
        'Open unfinished test-lifecycle items at observation.',
        `${num(view.pendingTests)} pending at ${view.observationDate}.`,
        { formula: 'Open unfinished tests at observation', tone: view.pendingTests > 0 ? 'watch' : 'good', limitations: 'Pending tests are not pending validation alone.' }),
      score('STAT Share', pct(view.statShare), 'Illustrative', 'Stat Priority Test Share',
        'Illustrative STAT share of laboratory test items.',
        `${num(view.statTests)} STAT · ${num(view.routineTests)} routine.`,
        { formula: 'STAT tests ÷ Test items', limitations: 'Illustrative STAT share — not a clinical triage system.' }),
    ]}>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('area', 'Test Demand Trend', view.labels, [
            { name: 'Orders', values: view.monthlyOrders },
            { name: 'Completed', values: view.monthlyCompleted },
          ], 'tests', 'Monthly orders and completed tests. Months sum to period totals for flow measures.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Alerts packed />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Order Outcomes', ['Completed', 'Cancelled', 'Pending'], [{ name: 'Tests', values: [view.completedTests, view.cancelledTests, view.pendingTests] }], 'tests', 'Completed / Cancelled / Pending test outcomes for the period.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Completed Tests by Section', view.sections.map((item) => item.id), [{ name: 'Completed', values: view.sections.map((item) => item.completed) }], 'tests', `Section completed sum to ${num(view.completedTests)}.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Test Demand by Care Setting', view.careSettings.map((item) => item.name), [{ name: 'Orders', values: view.careSettings.map((item) => item.orders) }], 'orders', 'ED / inpatient / outpatient order mix. ED arrival KPIs stay in Emergency.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'STAT vs Routine Mix', ['STAT', 'Routine'], [{ name: 'Tests', values: [view.statTests, view.routineTests] }], 'tests', 'Illustrative priority mix. Waiting time alone is not clinical urgency.')} />
        </div>
      </div>
      <IndicatorIndex indicators={laboratoryIndicatorsFor(view)} domains={['Lab Activity']} />
    </Page>
  );
}

export function LabSamplesPage() {
  const view = useView();
  const prior = usePrior();
  const transportMonthly = view.labels.map((_, index) => Math.round((view.medianTransportMin + ((index % 4) - 1.5) * 1.4) * 10) / 10);
  const careDelays = [
    { name: 'Emergency', minutes: Math.round(view.medianTransportMin * 1.28) },
    { name: 'Inpatient', minutes: Math.round(view.medianTransportMin * 1.06) },
    { name: 'Outpatient', minutes: Math.round(view.medianTransportMin * 0.82) },
  ];
  return (
    <Page title="Sample Flow & Pre-Analytics" kpis={[
      score('Samples Received', num(view.samplesReceived), compare(view, prior, (item) => item.samplesReceived), 'Samples Received by Laboratory',
        'Distinct specimens received by the laboratory in the period.',
        `${num(view.samplesReceived)} received · ${num(view.specimensCollected)} collected · ${view.periodLabel}.`,
        { formula: 'Distinct received specimens', testId: 'value-kpi_lab_samples_received', tone: 'neutral' }),
      score('Rejection Rate', pct(view.rejectionRate), compare(view, prior, (item) => item.rejectionRate, true), 'Specimen Rejection Rate',
        'Rejected specimens ÷ assessed specimens.',
        `${num(view.rejected)} rejected of ${num(view.assessed)} assessed.`,
        { formula: 'Rejected ÷ Assessed', tone: rateTone(view.rejectionRate, 0.03, 0.045), limitations: 'Not equal to hemolysis rate.' }),
      score('Transport Time', `${num(view.medianTransportMin)} min`, compare(view, prior, (item) => item.medianTransportMin), 'Median Specimen Transport Time',
        'Median collection-to-receipt delay for received specimens.',
        `Median ${num(view.medianTransportMin)} min · P90 ${num(view.p90TransportMin)} · target ${view.collectionToReceiptTargetMin} min.`,
        { formula: 'Median(receipt − collection)', tone: view.medianTransportMin >= view.collectionToReceiptTargetMin ? 'alert' : view.medianTransportMin >= 45 ? 'watch' : 'good', limitations: 'Transport Time is pre-analytical — not Lab TAT.' }),
      score('Hemolysis Rate', pct(view.hemolysisRate), compare(view, prior, (item) => item.hemolysisRate, true), 'Hemolyzed Specimen Rate',
        'Hemolyzed specimens ÷ assessed. Overlaps rejection; not all hemolyzed are rejected.',
        `${num(view.hemolyzed)} hemolyzed of ${num(view.assessed)}.`,
        { formula: 'Hemolyzed ÷ Assessed', tone: rateTone(view.hemolysisRate, 0.04, 0.055) }),
      score('Recollection Rate', pct(view.recollectionRate), compare(view, prior, (item) => item.recollectionRate, true), 'Specimen Recollection Rate',
        'Recollections ÷ assessed specimens.',
        `${num(view.recollections)} recollections.`,
        { formula: 'Recollections ÷ Assessed', tone: rateTone(view.recollectionRate, 0.025, 0.04), limitations: 'Does not duplicate original orders.' }),
    ]}>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('area', 'Specimen Flow Trend', view.labels, [
            { name: 'Received', values: view.monthlyReceived },
            { name: 'Rejected', values: view.monthlyRejected },
          ], 'specimens', 'Monthly received and rejected specimens. Rejection is a share of assessed.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Rejection Reasons', view.rejectionReasons.map((item) => item.name), [{ name: 'Specimens', values: view.rejectionReasons.map((item) => item.count) }], 'specimens', `Rejection reasons sum to ${num(view.rejected)}.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Rejection by Lab Section', view.sections.map((item) => item.id), [{ name: 'Rejected', values: view.sections.map((item) => item.rejected) }], 'specimens', `Section rejections sum to ${num(view.rejected)}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Collection-to-Receipt', view.labels, [{ name: 'Median minutes', values: transportMonthly }], 'min', `Period median ${num(view.medianTransportMin)} min · P90 ${num(view.p90TransportMin)} · target ${view.collectionToReceiptTargetMin} min.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Sample Delays by Care Setting', careDelays.map((item) => item.name), [{ name: 'Median minutes', values: careDelays.map((item) => item.minutes) }], 'min', 'Illustrative care-setting transport tilt around the hospital median. ED arrival KPIs stay in Emergency.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Recollection Causes', view.recollectionCauses.map((item) => item.name), [{ name: 'Recollections', values: view.recollectionCauses.map((item) => item.count) }], 'specimens', `Recollection causes sum to ${num(view.recollections)}.`)} />
        </div>
      </div>
      <IndicatorIndex indicators={laboratoryIndicatorsFor(view)} domains={['Pre-Analytics']} />
    </Page>
  );
}

export function LabAnalyzersPage() {
  const view = useView();
  const prior = usePrior();
  return (
    <Page title="Testing & Analyzer Performance" kpis={[
      score('Analyzer Utilization', pct(view.analyzerUtilization), compare(view, prior, (item) => item.analyzerUtilization, true), 'Analyzer Utilization',
        'In-session processing ÷ staffed analyzer hours. Overtime reported separately.',
        `${num(view.inSessionUsed)} in-session / ${num(view.staffedHours)} staffed · OT ${num(view.overtimeHours)} h · downtime ${num(view.downtimeHours)} h.`,
        { formula: 'In-session ÷ Staffed (overtime separate)', testId: 'value-kpi_lab_analyzer_utilization', tone: rateTone(view.analyzerUtilization, 0.75, 0.65, false) }),
      score('Analyzer Downtime', `${num(view.chemistryDowntimeHours)} h`, compare(view, prior, (item) => item.chemistryDowntimeHours), 'Analyzer Equipment Downtime',
        'Chemistry analyzer downtime inside staffed Chemistry sessions — not hospital-wide downtime.',
        `Chemistry ${num(view.chemistryDowntimeHours)} h · hospital-wide downtime ${num(view.downtimeHours)} h (context only).`,
        { formula: 'Chemistry downtime within staffed sessions', testId: 'value-kpi_lab_analyzer_downtime', tone: view.chemistryDowntimeHours > 200 ? 'alert' : 'watch', limitations: 'Not interchangeable with Microbiology or Histopathology downtime.' }),
      score('Unused Hours', `${num(view.unusedHours)} h`, compare(view, prior, (item) => item.unusedHours), 'Unused Staffed Analyzer Hours',
        'Staffed hours neither used for testing nor counted as QC or downtime.',
        `${num(view.unusedHours)} unused of ${num(view.staffedHours)} staffed.`,
        { formula: 'Staffed − in-session − QC − downtime', tone: view.unusedHours > view.staffedHours * 0.2 ? 'watch' : 'good' }),
      score('Testing Backlog', num(view.testingBacklog), compare(view, prior, (item) => item.testingBacklog), 'Laboratory Testing Backlog',
        'Tests awaiting analysis at observation. Distinct from pending validation.',
        `${num(view.testingBacklog)} pending analysis at ${view.observationDate}.`,
        { formula: 'Pending analysis cohort', tone: view.testingBacklog > 80 ? 'alert' : view.testingBacklog > 40 ? 'watch' : 'neutral' }),
      score('Tests / Analyzer Hour', num(view.testsPerAnalyzerHour, 1), compare(view, prior, (item) => item.testsPerAnalyzerHour), 'Tests per Analyzer Hour',
        'Completed tests ÷ in-session analyzer hours.',
        `${num(view.testsPerAnalyzerHour, 1)} tests/h · section throughputs differ.`,
        { formula: 'Completed Tests ÷ In-session hours', tone: 'neutral' }),
    ]}>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Utilization by Analyzer', view.analyzers.map((item) => item.id), [{ name: 'Utilization %', values: view.analyzers.map((item) => Math.round(item.utilization * 1000) / 10) }], '%', `In-session ÷ staffed per analyzer. Hospital util ${pct(view.analyzerUtilization)}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Staffed vs Used Hours', ['Allocated', 'Staffed', 'In-session', 'QC', 'Downtime', 'Unused', 'Overtime'], [{ name: 'Hours', values: [view.allocatedHours, view.staffedHours, view.inSessionUsed, view.qcHoldHours, view.downtimeHours, view.unusedHours, view.overtimeHours] }], 'hours', 'Staffed = in-session + QC + downtime + unused. Total used = in-session + overtime.')} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Testing Volume by Analyzer', view.analyzers.map((item) => item.id), [{ name: 'Completed', values: view.analyzers.map((item) => item.completed) }], 'tests', `Analyzer completed sum to ${num(view.completedTests)}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Downtime Reasons', view.downtimeReasons.map((item) => item.name), [{ name: 'Hours', values: view.downtimeReasons.map((item) => item.hours) }], 'hours', `Downtime reasons sum to ${num(view.downtimeHours)} h.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Testing Backlog by Section', view.sections.map((item) => item.id), [{ name: 'Backlog', values: view.sections.map((item) => item.backlog) }], 'tests', `Section backlog sums to ${num(view.testingBacklog)}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'QC Holds by Analyzer', view.analyzers.map((item) => item.id), [{ name: 'QC hours', values: view.analyzers.map((item) => item.qcHoldHours) }], 'hours', `QC hold hours sum to ${num(view.qcHoldHours)} h.`)} />
        </div>
      </div>
      <IndicatorIndex indicators={laboratoryIndicatorsFor(view)} domains={['Analyzer Efficiency']} />
    </Page>
  );
}

export function LabQualityPage() {
  const view = useView();
  const prior = usePrior();
  const correctedBySection = view.sections.map((item) => Math.round(view.correctedReports * (item.completed / Math.max(view.completedTests, 1))));
  const correctedDrift = view.correctedReports - correctedBySection.reduce((sum, value) => sum + value, 0);
  if (correctedBySection.length) correctedBySection[0] = Math.max(0, correctedBySection[0] + correctedDrift);
  const hottestTat = [...view.sections].sort((a, b) => b.reportTatHours - a.reportTatHours)[0];
  return (
    <Page title="Results, TAT & Quality" kpis={[
      score('Median Lab TAT', `${num(view.medianLabTatHours, 1)} h`, compare(view, prior, (item) => item.medianLabTatHours), 'Median Laboratory Result TAT',
        'Median final release minus specimen receipt for released results only.',
        `${num(view.medianLabTatHours, 1)} h · ${num(view.releasedResults)} released · target ${view.reportTatTargetHours} h.`,
        { formula: 'Final release − Specimen receipt (released cohort)', testId: 'value-kpi_lab_median_tat', tone: view.medianLabTatHours > view.reportTatTargetHours ? 'alert' : view.medianLabTatHours > 3 ? 'watch' : 'good', limitations: 'Pending validation is aged separately — not completed TAT.' }),
      score('P90 Lab TAT', `${num(view.p90LabTatHours, 1)} h`, compare(view, prior, (item) => item.p90LabTatHours), 'P90 Laboratory Result TAT',
        '90th-percentile receipt-to-release turnaround for released results.',
        `P90 ${num(view.p90LabTatHours, 1)} h.`,
        { formula: 'P90 of released TAT hours', tone: 'watch' }),
      score('Over-Target Results', num(view.resultsOverTarget), compare(view, prior, (item) => item.resultsOverTarget), 'Results Exceeding TAT Target',
        `Released results with TAT above the illustrative ${view.reportTatTargetHours}-hour target.`,
        `${num(view.resultsOverTarget)} of ${num(view.releasedResults)} released.`,
        { formula: `Released with TAT > ${view.reportTatTargetHours} h`, tone: view.resultsOverTarget > Math.max(30, Math.round(view.releasedResults * 0.18)) ? 'alert' : 'watch' }),
      score('Pending Validation', num(view.pendingValidation), compare(view, prior, (item) => item.pendingValidation), 'Results Awaiting Validation',
        'Open validation queue at observation (analyzed, awaiting release).',
        `${num(view.pendingValidation)} awaiting validation.`,
        { formula: 'Open validation queue', tone: view.pendingValidation > 60 ? 'alert' : 'watch', limitations: 'Not completed TAT and not testing backlog.' }),
      score('Critical Notify Rate', pct(view.criticalNotifyRate), compare(view, prior, (item) => item.criticalNotifyRate, true), 'Critical Result Notification Rate',
        'Successfully communicated ÷ critical results. Distinct from delay rate.',
        `${num(view.criticalNotified)} notified · ${num(view.criticalPendingComm)} pending (${pct(view.criticalDelayRate)} delay rate).`,
        { formula: 'Notified ÷ Critical results', tone: rateTone(view.criticalNotifyRate, 0.92, 0.88, false), limitations: 'Notify rate is not a delay rate. Delay rate = pending communication ÷ critical results.' }),
      score('Corrected Report Rate', pct(view.correctedReportRate), compare(view, prior, (item) => item.correctedReportRate, true), 'Corrected Laboratory Report Rate',
        'Post-release corrected reports ÷ released results.',
        `${num(view.correctedReports)} corrected of ${num(view.releasedResults)}.`,
        { formula: 'Corrected ÷ Released', tone: rateTone(view.correctedReportRate, 0.015, 0.025) }),
    ]}>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Result TAT Trend', view.labels, [{ name: 'Median hours', values: view.monthlyTat }], 'hours', 'Monthly median receipt-to-release TAT. Pending validation is excluded from completed TAT.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'TAT by Laboratory Section', view.sections.map((item) => item.id), [{ name: 'Median hours', values: view.sections.map((item) => item.reportTatHours) }], 'hours', `Hospital median ${num(view.medianLabTatHours, 1)} h · longest ${hottestTat?.id ?? 'n/a'}. STAT TAT pressure concentrates in Chemistry/Hematology sections.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Unvalidated Result Aging', view.unsignedAging.map((item) => item.name), [{ name: 'Results', values: view.unsignedAging.map((item) => item.count) }], 'results', `Aging bands sum to ${num(view.pendingValidation)}. Not completed TAT.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Critical Result Communication', ['Critical', 'Notified', 'Pending'], [{ name: 'Events', values: [view.criticalResults, view.criticalNotified, view.criticalPendingComm] }], 'events', `Notify rate ${pct(view.criticalNotifyRate)} · delay rate ${pct(view.criticalDelayRate)}. Distinct from final release signature.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Corrected Results by Section', view.sections.map((item) => item.id), [{ name: 'Corrected', values: correctedBySection }], 'results', `Section corrected distribute ${num(view.correctedReports)} post-release corrections.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'STAT vs Routine TAT Context', view.sections.slice(0, 4).map((item) => item.id), [{ name: 'Section median h', values: view.sections.slice(0, 4).map((item) => item.reportTatHours) }], 'hours', `STAT share ${pct(view.statShare)}. Section TAT distribution highlights STAT-sensitive Chemistry/Hematology pressure.`)} />
        </div>
      </div>
      <IndicatorIndex indicators={laboratoryIndicatorsFor(view)} domains={['Result Quality', 'Cross-domain context']} />
    </Page>
  );
}

export function LabOptimizationPage() {
  const view = useView();
  const prior = usePrior();
  const reworkHours = view.delayDriverHours.find((item) => /rejection/i.test(item.name))?.hours ?? 0;
  const usableRecovered = Math.max(0, view.recoverableHours - Math.round(reworkHours * 0.35));
  const hotBacklog = [...view.sections].sort((a, b) => b.backlog - a.backlog)[0];
  const chemistry = view.sections.find((item) => item.id === 'Chemistry');
  return (
    <Page title="Laboratory Capacity Optimization" kpis={[
      score('Recoverable Hours', `${num(view.recoverableHours)} h`, compare(view, prior, (item) => item.recoverableHours), 'Potentially Recoverable Lab Hours',
        'Sum of section-specific exclusive delay drivers.',
        `${num(view.recoverableHours)} h across ${view.sections.length} sections.`,
        { formula: 'Σ exclusive section drivers', testId: 'value-kpi_lab_recoverable_hours', tone: view.recoverableHours > 80 ? 'watch' : 'neutral', limitations: 'Modeled opportunity — not achieved capacity. Sections are not interchangeable.' }),
      score('Additional Tests', num(view.additionalTests), compare(view, prior, (item) => item.additionalTests), 'Feasible Additional Testing Capacity',
        'Sum of section-feasible extras (section duration × recovered hours × eligible backlog).',
        `${num(view.additionalTests)} of ${num(view.potentialAdditionalTests)} hour-feasible · capped by section-eligible backlog.`,
        { formula: 'Σ_s min(potential_s, eligible_s)', tone: 'watch', limitations: 'Illustrative — not an achieved result. Chemistry hours do not become Microbiology tests.' }),
      score('Eligible Backlog', num(view.eligibleBacklog), compare(view, prior, (item) => item.eligibleBacklog), 'Eligible Testing Backlog',
        'Sum of section-eligible backlog that could use recovered capacity.',
        `${num(view.eligibleBacklog)} of ${num(view.testingBacklog)} testing backlog.`,
        { formula: 'Σ section eligible demand' }),
    ]}>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Recoverable Hours by Driver', view.delayDriverHours.map((item) => item.name), [{ name: 'Hours', values: view.delayDriverHours.map((item) => item.hours) }], 'hours', 'Exclusive drivers rolled up from section calculations — sum equals Recoverable Hours.')} />
        </div>
        <div className="gc-ed-pack-col">
          <section className="gc-panel gc-insight">
            <h2>Management decisions</h2>
            <div className="gc-exception-list">
              <div className="gc-exception gc-tone-watch"><strong>Reduce preventable rejections</strong><span>{pct(view.rejectionRate)} rejection</span></div>
              <div className="gc-exception gc-tone-alert"><strong>Cut Chemistry downtime</strong><span>{num(view.chemistryDowntimeHours)} h Chemistry</span></div>
              <div className="gc-exception gc-tone-neutral"><strong>Extend staffed lab sessions</strong><span>{num(view.staffedHours)} staffed h</span></div>
              <div className="gc-exception gc-tone-watch"><strong>Improve STAT Lab TAT</strong><span>Median {num(view.medianLabTatHours, 1)} h</span></div>
              <div className="gc-exception gc-tone-neutral"><strong>Clear validation backlog</strong><span>{num(view.pendingValidation)} pending</span></div>
              <div className="gc-exception gc-tone-watch"><strong>Prioritize eligible backlog</strong><span>+{num(view.additionalTests)} feasible · {hotBacklog?.id ?? 'n/a'}</span></div>
            </div>
            <p className="gc-next">Estimates are illustrative. AI does not change laboratory schedules alone.{chemistry ? ` Chemistry analyzers: ${chemistry.analyzers}.` : ''}</p>
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
          <Slot span={false} figure={fig('bars', 'Additional Tests by Section', view.sections.map((item) => item.id), [{ name: 'Feasible extras', values: view.sections.map((item) => item.additionalTests) }], 'tests', `Section extras sum to ${num(view.additionalTests)}. Computed per section — not a shared hour pool.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Backlog Reduction Scenario', ['Testing backlog', 'Eligible backlog', 'Additional tests', 'Residual backlog'], [{ name: 'Tests', values: [
            view.testingBacklog,
            view.eligibleBacklog,
            view.additionalTests,
            Math.max(0, view.testingBacklog - view.additionalTests),
          ] }], 'tests', 'Illustrative backlog draw-down if feasible section-compatible tests are scheduled.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Capacity Constraints', ['Recoverable hours', 'Rejection rework hours', 'Usable recovered hours'], [{ name: 'Hours', values: [
            view.recoverableHours,
            reworkHours,
            usableRecovered,
          ] }], 'hours', 'Rejection rework is an exclusive driver haircut on usable recovery. Bed Occupancy stays in Beds; OR/Scanner utilization stay in Surgery/Radiology.')} />
        </div>
      </div>
      <IndicatorIndex indicators={laboratoryIndicatorsFor(view)} domains={['Capacity Optimization', 'Cross-domain context']} />
      <AiIndex />
    </Page>
  );
}
