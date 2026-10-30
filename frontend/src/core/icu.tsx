import { useMemo, useState, type ReactNode } from 'react';
import { useShowcase } from '@/showcase/state';
import { alertsFor } from './alerts';
import { ICU_AI_CASES, icuIndicatorsFor, type Indicator } from './icuScope';
import { buildIcuView, type IcuView } from './icuView';
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
type View = IcuView;

function useView(): View {
  const store = useShowcase();
  const { period } = usePeriod();
  return useMemo(() => buildIcuView(store.hospital, store.year, period), [store.hospital, store.year, period]);
}

function usePrior(): View {
  const store = useShowcase();
  const { period } = usePeriod();
  const year = store.year <= 2024 ? 2024 : store.year - 1;
  return useMemo(() => buildIcuView(store.hospital, year, period), [store.hospital, year, period]);
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
          <p className="gc-kicker">ICU & Critical Care</p>
          <h1>{title}</h1>
        </div>
      </header>
      <div className="gc-ribbon" data-testid="icu-ribbon">
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

/** Axis-safe short labels so charts do not ellipsize ICU categories. */
const ICU_AXIS: Record<string, string> = {
  'Medical ICU': 'MICU',
  'Surgical ICU': 'SICU',
  'Cardiac ICU': 'CICU',
  'Neuro ICU': 'NICU',
  Emergency: 'Emergency',
  'Operating theatre': 'Theatre',
  'Ward escalation': 'Ward esc.',
  'External transfer': 'External',
  'Step-down / HDU': 'Step-down',
  'General ward': 'Ward',
  'Death departing ICU': 'Death',
  'No staffed bed': 'No staffed',
  'Downstream bed wait': 'Downstream',
  'Equipment prep': 'Equip prep',
  'Coordination handoff': 'Handoff',
  'Transport lag': 'Transport',
  'Scheduled PM': 'Sched. PM',
  'Unplanned repair': 'Unplanned',
  'Cleaning / prep': 'Cleaning',
  'Parts wait': 'Parts',
  'Device documentation gap': 'Doc gap',
  'Handoff incomplete': 'Handoff gap',
  'Review overdue': 'Review late',
  'Surveillance form missing': 'Form miss',
  'Other process': 'Other',
  'Transfer coordination': 'Transfer',
  'Discharge handoff': 'Discharge',
  'Bed preparation': 'Bed prep',
  'Staffing gap': 'Staff gap',
  'Unstaffed physical': 'Unstaffed',
  'Blocked staffed': 'Blocked',
  'Equipment downtime': 'Equip down',
  'Downtime hrs÷10': 'Down÷10',
  'Transfer delay hrs': 'Xfer delay',
  'Avoidable hrs': 'Avoidable',
  'Recoverable transfer': 'Recover xfer',
  'Available staffed': 'Avail staffed',
  'Feasible extra': 'Feasible',
  'Pending demand': 'Pending',
  'Gap hrs÷10': 'Gap÷10',
  'Staffed beds': 'Staffed',
  Inventory: 'Inventory',
  'In use': 'In use',
  Available: 'Available',
  Unstaffed: 'Unstaffed',
  Day: 'Day',
  Evening: 'Evening',
  Night: 'Night',
  '<24 h': '<24 h',
  '1–3 days': '1–3 d',
  '3–7 days': '3–7 d',
  '>7 days': '>7 d',
  '≤24 h': '≤24 h',
  '4–7 days': '4–7 d',
};

function axis(labels: string[]): string[] {
  return labels.map((label) => {
    if (ICU_AXIS[label]) return ICU_AXIS[label];
    // Prefer whole-word aliases over mechanical character slices that produce "Downtime hrs/" / "Transfer dela".
    if (label.length <= 12) return label;
    const words = label.split(/\s+/);
    if (words.length >= 2) return words.map((word) => word.slice(0, 6)).join(' ').slice(0, 14);
    return label.slice(0, 12);
  });
}

function fig(type: Figure['type'], title: string, categories: string[], series: Figure['series'], unit: string, note: string, extra?: Partial<Figure>): Figure {
  const digits = unit === '%' || unit === 'days' || unit === 'hours' || unit === 'min' || unit === 'rate' || unit === 'index' ? 1 : 0;
  return { type, title, categories: axis(categories), series, unit, digits, note, domain: 'icu', subjects: [title], ...extra };
}

function Alerts({ packed = false }: { packed?: boolean } = {}) {
  const store = useShowcase();
  const copilot = useCopilot();
  const view = useView();
  const { period } = usePeriod();
  const alerts = alertsFor(store.hospital, store.year).filter((alert) => alert.department === 'ICU' && alert.severity !== 'info');
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
              ICU within management thresholds · open Vital Assist
            </button>
          </li>
        )}
      </ul>
      {period === 'year' ? null : <p>These alerts use the full reporting year. The scores above use the selected period.</p>}
      <div className="gc-next">
        <h2>Management action</h2>
        <p>Review admission wait ({num(view.medianAdmissionWaitMin)} min), pending transfers ({num(view.pendingTransfers)}), and available staffed beds ({num(view.availableStaffed)}) for {view.periodLabel}.</p>
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
    <section className="gc-panel span-12 gc-scope gc-scope-tight" data-testid="icu-indicator-catalog">
      <div className="gc-scope-head">
        <div>
          <h2>Performance indicators</h2>
          <p>
            Definition catalog for this screen — full names, formulas, units, and ownership. Headline numbers stay in the KPI ribbon above. Hospital bed occupancy stays in Beds; ED boarding stays in Emergency; inpatient LOS stays in Inpatient.
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
          <p>Illustrative ICU operations intelligence · not a clinical treatment engine or accreditation system</p>
        </div>
      </div>
      <div className="gc-scope-grid gc-scope-grid-dense">
        {ICU_AI_CASES.map((item) => (
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

export function IcuCommandPage() {
  const view = useView();
  const prior = usePrior();
  return (
    <Page
      title="ICU Command Center"
      kpis={[
        score('ICU Admissions', num(view.admissions), compare(view, prior, (item) => item.admissions), 'ICU Admissions',
          'Arrivals into ICU from outside the ICU (excludes internal unit moves counted as transfers-in).',
          `${num(view.admissions)} admissions · ${num(view.transfersIn)} transfers-in · ${view.periodLabel}.`,
          { formula: 'Count of external ICU admissions', testId: 'value-kpi_icu_admissions' }),
        score('ICU Discharges', num(view.discharges), compare(view, prior, (item) => item.discharges), 'ICU Discharges',
          'Completed discharges to ward/step-down/external. Deaths are a separate exit category.',
          `${num(view.discharges)} discharges · ${num(view.deaths)} deaths · ${num(view.transfersOut)} transfers-out.`,
          { formula: 'Non-death discharges from ICU', testId: 'value-kpi_icu_discharges' }),
        score('Patient Days', num(view.patientDays), compare(view, prior, (item) => item.patientDays), 'ICU Patient Days',
          'Midnight census patient-days. Distinct from admissions.',
          `${num(view.patientDays)} patient-days · avg census ${num(view.avgCensus, 1)}.`,
          { formula: 'Σ daily midnight occupancy', testId: 'value-kpi_icu_patient_days' }),
        score('Avg Census', num(view.avgCensus, 1), compare(view, prior, (item) => item.avgCensus), 'ICU Average Census',
          'Patient-days ÷ days in period — not an average of monthly averages.',
          `Closing census ${num(view.closingCensus)} · opening ${num(view.openingCensus)}.`,
          { formula: 'Patient days ÷ days', testId: 'value-kpi_icu_avg_census' }),
        score('Demand Pressure', num(view.demandPressure, 1), compare(view, prior, (item) => item.demandPressure), 'ICU Demand Pressure',
          'Pending transfer requests ÷ available staffed beds. Not hospital-wide bed occupancy.',
          `${num(view.pendingTransfers)} pending ÷ ${num(view.availableStaffed)} available staffed.`,
          { formula: 'Pending ÷ available staffed', testId: 'value-kpi_icu_demand_pressure', tone: view.demandPressure >= 2 ? 'alert' : view.demandPressure >= 1 ? 'watch' : 'good' }),
        score('Pending Transfers', num(view.pendingTransfers), compare(view, prior, (item) => item.pendingTransfers), 'Pending ICU Transfers',
          'Open ICU transfer requests at observation.',
          `${num(view.pendingTransfers)} open requests · ${view.observationDate}.`,
          { formula: 'Open transfer queue', testId: 'value-kpi_icu_pending_transfers', tone: view.pendingTransfers >= 12 ? 'alert' : view.pendingTransfers >= 6 ? 'watch' : 'good' }),
      ]}
    >
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('area', 'ICU Admissions & Discharges Trend', view.labels, [
            { name: 'Admissions', values: view.monthlyAdmissions },
            { name: 'Exits', values: view.monthlyDischarges.map((d, i) => d + view.monthlyTransfersOut[i] + view.monthlyDeaths[i]) },
          ], 'stays', `Monthly admissions and exits. Census identity: opening + admits + transfers-in − discharges − transfers-out − deaths = closing (${num(view.closingCensus)}).`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Alerts packed />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'ICU Patient Census Trend', view.labels, [{ name: 'Closing census', values: view.monthlyCensus }], 'patients', `Month-end closing census rolls forward. Period average census ${num(view.avgCensus, 1)}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'ICU Activity by Unit', view.unitRows.map((item) => item.name), [{ name: 'Admissions', values: view.unitRows.map((item) => item.admissions) }], 'admissions', 'Unit admissions sum to hospital admissions. Bed occupancy headlines stay in Beds.')} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Admission Sources', view.sourceMix.map((item) => item.name), [{ name: 'Admissions', values: view.sourceMix.map((item) => item.count) }], 'admissions', `Sources sum to ${num(view.admissions)} admissions.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Discharge Destinations', view.destMix.map((item) => item.name), [{ name: 'Exits', values: view.destMix.map((item) => item.count) }], 'exits', `Destinations partition completed exits including ${num(view.deaths)} deaths.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'ICU Demand Pattern', view.unitRows.map((item) => item.name), [
            { name: 'Pending', values: view.unitRows.map((item) => item.pendingTransfers) },
            { name: 'Available staffed', values: view.unitRows.map((item) => item.available) },
          ], 'count', `Demand pressure ${num(view.demandPressure, 1)}. Pending transfers versus available staffed beds by unit.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <section className="gc-panel gc-insight">
            <h2>Unit demand focus</h2>
            <div className="gc-exception-list">
              {[...view.unitRows].sort((a, b) => b.pendingTransfers - a.pendingTransfers).slice(0, 3).map((item) => (
                <div key={item.name} className={`gc-exception ${item.available <= 1 ? 'gc-tone-alert' : item.pendingTransfers >= 3 ? 'gc-tone-watch' : 'gc-tone-neutral'}`}>
                  <strong>{item.name}</strong>
                  <span>{num(item.pendingTransfers)} pending · {num(item.available)} available staffed</span>
                </div>
              ))}
            </div>
            <p className="gc-next">Demand pressure {num(view.demandPressure, 1)} · pending ÷ available staffed. Not hospital-wide bed occupancy.</p>
          </section>
        </div>
      </div>
      <IndicatorIndex indicators={icuIndicatorsFor(view)} domains={['ICU Activity']} />
    </Page>
  );
}

export function IcuFlowPage() {
  const view = useView();
  const prior = usePrior();
  return (
    <Page
      title="ICU Patient Flow & Throughput"
      kpis={[
        score('Admission Wait', `${num(view.medianAdmissionWaitMin)} min`, compare(view, prior, (item) => item.medianAdmissionWaitMin), 'Median ICU Admission Wait',
          'Median minutes from ICU request to physical arrival for admitted stays.',
          `Median ${num(view.medianAdmissionWaitMin)} · P90 ${num(view.p90AdmissionWaitMin)} · target ${num(view.admissionWaitTargetMin)} min.`,
          { formula: 'Median(arrived − requested)', testId: 'value-kpi_icu_admission_wait', tone: view.medianAdmissionWaitMin > 120 ? 'alert' : view.medianAdmissionWaitMin > 90 ? 'watch' : 'good' }),
        score('Delayed Admissions', num(view.delayedAdmissions), compare(view, prior, (item) => item.delayedAdmissions), 'Delayed ICU Admissions',
          'Admissions with wait above the illustrative 90-minute target.',
          `${num(view.delayedAdmissions)} of ${num(view.admissions)} admissions.`,
          { formula: 'Wait > 90 min', testId: 'value-kpi_icu_delayed_admissions', tone: view.delayedAdmissions >= 80 ? 'alert' : 'watch' }),
        score('Transfer Delay', `${num(view.medianTransferDelayHours, 1)} h`, compare(view, prior, (item) => item.medianTransferDelayHours), 'Median ICU Transfer Delay',
          'Median hours from transfer-ready to actual exit.',
          `Median ${num(view.medianTransferDelayHours, 1)} h · ${num(view.transfersOut)} transfers-out.`,
          { formula: 'Median(exit − transfer-ready)', testId: 'value-kpi_icu_transfer_delay' }),
        score('Median LOS', `${num(view.medianLosHours, 1)} h`, compare(view, prior, (item) => item.medianLosHours), 'Median ICU Length of Stay',
          'Median completed-stay hours (departed − arrived). Open stays excluded. Not inpatient ward LOS.',
          `Median ${num(view.medianLosHours, 1)} · mean ${num(view.meanLosHours, 1)} · P90 ${num(view.p90LosHours, 1)} h.`,
          { formula: 'Median(departed − arrived)', testId: 'value-kpi_icu_median_los', limitations: view.methodology.los }),
        score('Ready Delay', `${num(view.medianDischargeReadyDelayHours, 1)} h`, compare(view, prior, (item) => item.medianDischargeReadyDelayHours), 'Discharge Readiness Delay',
          'Median hours from discharge-ready to actual departure. Does not change clinical readiness.',
          `Median ${num(view.medianDischargeReadyDelayHours, 1)} h after ready flag.`,
          { formula: 'Median(departed − discharge-ready)', testId: 'value-kpi_icu_discharge_ready_delay' }),
        score('Boarding Hours', num(view.boardingHours), compare(view, prior, (item) => item.boardingHours), 'ICU Boarding Hours',
          'Aggregate request-to-arrival hours. Distinct from ED boarding in Emergency.',
          `${num(view.boardingHours)} h boarding for ${view.periodLabel}.`,
          { formula: 'Σ wait minutes ÷ 60', testId: 'value-kpi_icu_boarding_hours' }),
      ]}
    >
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Admission Wait Trend', view.labels, [{ name: 'Median minutes', values: view.monthlyWait }], 'min', `Monthly median request-to-arrival. Period median ${num(view.medianAdmissionWaitMin)} min.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Admission Delays by Source', view.sourceMix.map((item) => item.name), [{ name: 'Delayed', values: view.sourceMix.map((item) => Math.round(item.count * (view.delayedAdmissions / Math.max(1, view.admissions)))) }], 'admissions', `Delayed admissions scaled by source mix · total ${num(view.delayedAdmissions)}.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'ICU LOS Distribution', view.losBands.map((item) => item.name), [{ name: 'Completed stays', values: view.losBands.map((item) => item.count) }], 'stays', `Bands sum to ${num(view.completedStays)} completed stays. Open stays excluded from LOS.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Transfer Delay Reasons', view.delayReasons.map((item) => item.name), [{ name: 'Delayed admissions', values: view.delayReasons.map((item) => item.count) }], 'admissions', `Reason partition of ${num(view.delayedAdmissions)} delayed admissions.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Discharge Readiness vs Actual Exit', ['Ready delay', 'Transfer delay'], [{ name: 'Median hours', values: [view.medianDischargeReadyDelayHours, view.medianTransferDelayHours] }], 'hours', 'Operational clocks after clinical readiness flags. AI does not discharge patients.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'ICU Flow Bottlenecks', view.unitRows.map((item) => item.name), [{ name: 'Pending transfers', values: view.unitRows.map((item) => item.pendingTransfers) }], 'requests', `Unit pending transfers sum to ${num(view.pendingTransfers)}.`)} />
        </div>
      </div>
      <IndicatorIndex indicators={icuIndicatorsFor(view)} domains={['ICU Flow']} />
    </Page>
  );
}

export function IcuCapacityPage() {
  const view = useView();
  const prior = usePrior();
  return (
    <Page
      title="Critical Care Capacity & Staffing"
      kpis={[
        score('Staffed Beds', num(view.staffedBeds), compare(view, prior, (item) => item.staffedBeds), 'Staffed ICU Beds',
          'Beds staffed for ICU care. Physical beds may exceed staffed beds.',
          `${num(view.staffedBeds)} staffed of ${num(view.physicalBeds)} physical · ${num(view.unstaffedPhysical)} unstaffed.`,
          { formula: 'Staffed ≤ physical', testId: 'value-kpi_icu_staffed_beds', limitations: view.methodology.capacity }),
        score('Available Staffed', num(view.availableStaffed), compare(view, prior, (item) => item.availableStaffed), 'Available Staffed ICU Capacity',
          'Staffed − occupied − blocked. Empty unstaffed beds are excluded.',
          `${num(view.availableStaffed)} available · occupied ${num(view.avgOccupied)} · blocked ${num(view.blockedStaffed)}.`,
          { formula: 'Staffed − occupied − blocked', testId: 'value-kpi_icu_available_staffed', tone: view.availableStaffed <= 1 ? 'alert' : view.availableStaffed <= 3 ? 'watch' : 'good' }),
        score('Nurse Coverage', pct(view.nurseCoverage), compare(view, prior, (item) => item.nurseCoverage, true), 'ICU Nurse Coverage Rate',
          'Staffed nursing hours ÷ required coverage hours. Descriptive — not a safety certification.',
          `${pct(view.nurseCoverage)} coverage · gap ${num(view.staffingGapHours)} h.`,
          { formula: 'Staffed ÷ required hours', testId: 'value-kpi_icu_nurse_coverage', tone: view.nurseCoverage < 0.85 ? 'alert' : view.nurseCoverage < 0.9 ? 'watch' : 'good' }),
        score('Staffing Gap', `${num(view.staffingGapHours)} h`, compare(view, prior, (item) => item.staffingGapHours), 'ICU Staffing Gap Hours',
          'Required coverage hours not filled.',
          `${num(view.staffingGapHours)} of ${num(view.requiredNurseHours)} required hours.`,
          { formula: 'Required − staffed', testId: 'value-kpi_icu_staffing_gap_hours' }),
        score('Pt:Nurse Ratio', num(view.patientNurseRatio, 1), compare(view, prior, (item) => item.patientNurseRatio), 'ICU Patient-to-Nurse Ratio',
          'Occupied staffed beds ÷ nurses on duty. Matching a generic target does not prove clinical safety.',
          `${num(view.avgOccupied)} occupied ÷ ${num(view.nursesOnDuty)} nurses.`,
          { formula: 'Occupied ÷ nurses on duty', testId: 'value-kpi_icu_pt_nurse_ratio', limitations: 'Descriptive ratio only.' }),
      ]}
    >
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Staffed vs Physical Beds', view.unitRows.map((item) => item.name), [
            { name: 'Physical', values: view.unitRows.map((item) => item.physicalBeds) },
            { name: 'Staffed', values: view.unitRows.map((item) => item.staffedBeds) },
          ], 'beds', `Hospital physical ${num(view.physicalBeds)} · staffed ${num(view.staffedBeds)}. Hospital-wide occupancy stays in Beds.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Coverage by Shift', view.shiftRows.map((item) => item.name), [{ name: 'Coverage %', values: view.shiftRows.map((item) => Math.round(item.coverage * 1000) / 10) }], '%', `Shift coverage hours reconcile to ${pct(view.nurseCoverage)} overall.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Nursing Workload Trend', view.shiftRows.map((item) => item.name), [
            { name: 'Required', values: view.shiftRows.map((item) => item.requiredHours) },
            { name: 'Staffed', values: view.shiftRows.map((item) => item.staffedHours) },
          ], 'hours', `Required ${num(view.requiredNurseHours)} · staffed ${num(view.staffedNurseHours)} · gap ${num(view.staffingGapHours)}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Capacity Loss by Driver', view.capacityLoss.map((item) => item.name), [{ name: 'Hours', values: view.capacityLoss.map((item) => item.hours) }], 'hours', 'Mutually exclusive operational loss drivers — not clinical acuity scores.')} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Bed Availability by ICU Unit', view.unitRows.map((item) => item.name), [{ name: 'Available staffed', values: view.unitRows.map((item) => item.available) }], 'beds', `Unit available staffed beds sum toward hospital available ${num(view.availableStaffed)}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Staffing Gaps by Shift', view.shiftRows.map((item) => item.name), [{ name: 'Gap hours', values: view.shiftRows.map((item) => item.gapHours) }], 'hours', `Shift gaps sum to ${num(view.staffingGapHours)} h.`)} />
        </div>
      </div>
      <IndicatorIndex indicators={icuIndicatorsFor(view)} domains={['ICU Capacity']} />
    </Page>
  );
}

export function IcuEquipmentPage() {
  const view = useView();
  const prior = usePrior();
  return (
    <Page
      title="Ventilation & Equipment Intelligence"
      kpis={[
        score('Vent Patient Days', num(view.ventPatientDays), compare(view, prior, (item) => item.ventPatientDays), 'Ventilated Patient Days',
          'Patient-days with an assigned serviceable ventilator. Not a treatment recommendation.',
          `${num(view.ventPatientDays)} of ${num(view.patientDays)} patient-days.`,
          { formula: 'Assigned ventilator patient-days', testId: 'value-kpi_icu_vent_patient_days', limitations: view.methodology.equipment }),
        score('Vent Utilization', pct(view.ventUtilization), compare(view, prior, (item) => item.ventUtilization, true), 'Ventilator Utilization',
          'Assigned ventilator-hours ÷ eligible serviceable hours.',
          `${pct(view.ventUtilization)} · inventory ${num(view.ventInventory)}.`,
          { formula: 'Assigned ÷ eligible hours', testId: 'value-kpi_icu_vent_utilization', tone: view.ventUtilization >= 0.9 ? 'alert' : view.ventUtilization >= 0.8 ? 'watch' : 'good' }),
        score('Available Vents', num(view.ventAvailable), compare(view, prior, (item) => item.ventAvailable), 'Available Ventilators',
          'Serviceable ventilators not currently assigned.',
          `${num(view.ventAvailable)} available · ${num(view.ventInUse)} in use · ${num(view.ventMaintenance)} maintenance · ${num(view.ventPrep)} prep.`,
          { formula: 'Inventory − in use − maintenance − prep', testId: 'value-kpi_icu_available_vents', tone: view.ventAvailable <= 1 ? 'alert' : view.ventAvailable <= 3 ? 'watch' : 'good' }),
        score('Equip Downtime', `${num(view.downtimeHours)} h`, compare(view, prior, (item) => item.downtimeHours), 'Critical Equipment Downtime',
          'Hours in maintenance or preparation from the asset ledger.',
          `${num(view.downtimeHours)} downtime hours · readiness ${pct(view.equipmentReadiness)}.`,
          { formula: 'Maintenance + preparation hours', testId: 'value-kpi_icu_equipment_downtime' }),
        score('Equip Readiness', pct(view.equipmentReadiness), compare(view, prior, (item) => item.equipmentReadiness, true), 'Equipment Readiness Rate',
          '(In use + Available) ÷ active inventory.',
          `${pct(view.equipmentReadiness)} · snapshot sums to ${num(view.ventSnapshotSum)} of ${num(view.ventInventory)}.`,
          { formula: '(In use + Available) ÷ inventory', testId: 'value-kpi_icu_equipment_readiness' }),
      ]}
    >
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Ventilator Demand Trend', view.labels, [{ name: 'Vent patient-days', values: view.monthlyVentDemand }], 'days', `Monthly ventilated demand. Period total ${num(view.ventPatientDays)} patient-days.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Ventilator Availability', ['In use', 'Available', 'Maintenance', 'Prep'], [{ name: 'Devices', values: [view.ventInUse, view.ventAvailable, view.ventMaintenance, view.ventPrep] }], 'devices', `States sum to ${num(view.ventSnapshotSum)} = inventory ${num(view.ventInventory)}. One vent → one patient.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Equipment Downtime by Cause', view.downtimeByCause.map((item) => item.name), [{ name: 'Hours', values: view.downtimeByCause.map((item) => item.hours) }], 'hours', `Causes sum to ${num(view.downtimeHours)} downtime hours.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Device Utilization by ICU Unit', view.unitRows.map((item) => item.name), [{ name: 'Vents in use', values: view.unitRows.map((item) => item.ventInUse) }], 'devices', `Unit assignments sum to ${num(view.ventInUse)} in-use ventilators.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Equipment Readiness by Category', view.unitRows.map((item) => item.name), [{ name: 'Readiness %', values: view.unitRows.map((item) => Math.round(item.readiness * 1000) / 10) }], '%', `Hospital readiness ${pct(view.equipmentReadiness)}. No ventilator-setting advice.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Equipment Capacity Constraints', ['Inventory', 'In use', 'Available', 'Downtime hrs÷10'], [{ name: 'Value', values: [view.ventInventory, view.ventInUse, view.ventAvailable, Math.round(view.downtimeHours / 10)] }], 'index', 'Full labels: Inventory, In use, Available, Downtime hours ÷ 10. Snapshot versus scaled downtime — illustrative constraint view.')} />
        </div>
      </div>
      <IndicatorIndex indicators={icuIndicatorsFor(view)} domains={['ICU Equipment']} />
    </Page>
  );
}

export function IcuQualityPage() {
  const view = useView();
  const prior = usePrior();
  return (
    <Page
      title="ICU Quality & Safety Intelligence"
      kpis={[
        score('Readmission Rate', pct(view.readmissionRate), compare(view, prior, (item) => item.readmissionRate, true), 'ICU Readmission Rate',
          'ICU readmissions within 48 hours ÷ ICU discharges. Operational cohort.',
          `${num(view.readmissions48h)} readmits ÷ ${num(view.discharges)} discharges.`,
          { formula: '48h readmits ÷ discharges', testId: 'value-kpi_icu_readmission_rate', limitations: view.methodology.quality }),
        score('Unplanned Transfer', pct(view.unplannedTransferRate), compare(view, prior, (item) => item.unplannedTransferRate, true), 'Unplanned Step-down Transfer Rate',
          'Unplanned returns to ICU ÷ step-down exits.',
          `${num(view.unplannedReturns)} unplanned returns.`,
          { formula: 'Unplanned returns ÷ step-downs', testId: 'value-kpi_icu_unplanned_transfer_rate' }),
        score('Review Backlog', num(view.unresolvedReviews), compare(view, prior, (item) => item.unresolvedReviews), 'Safety Review Backlog',
          'Open safety-event reviews at observation. Process signal — not harm incidence.',
          `${num(view.unresolvedReviews)} of ${num(view.safetyEvents)} events still open.`,
          { formula: 'Open reviews', testId: 'value-kpi_icu_safety_review_backlog', tone: view.unresolvedReviews >= 20 ? 'alert' : view.unresolvedReviews >= 10 ? 'watch' : 'good' }),
        score('Surveillance Complete', pct(view.surveillanceCompleteness), compare(view, prior, (item) => item.surveillanceCompleteness, true), 'Infection Surveillance Completeness',
          'Documented device-days ÷ eligible device-days. Illustrative — NOT a validated CLABSI/CAUTI/VAE rate.',
          `${num(view.documentedDeviceDays)} of ${num(view.deviceDays)} device-days documented.`,
          { formula: 'Documented ÷ eligible device-days', testId: 'value-kpi_icu_surveillance_completeness', limitations: 'Scenario / illustrative documentation completeness only.' }),
        score('Review Timeliness', pct(view.reviewTimeliness), compare(view, prior, (item) => item.reviewTimeliness, true), 'Critical Event Review Timeliness',
          `Share of closed reviews within the illustrative ${num(view.reviewTargetHours)}-hour target.`,
          `${pct(view.reviewTimeliness)} timely among closed reviews.`,
          { formula: 'Timely closed ÷ closed', testId: 'value-kpi_icu_review_timeliness' }),
      ]}
    >
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'ICU Readmission Trend', view.labels, [{ name: 'Readmits (scaled)', values: view.labels.map((_, i) => Math.max(0, Math.round(view.readmissions48h / view.labels.length * (0.85 + 0.2 * Math.sin(i))))) }], 'events', `Monthly shape of ${num(view.readmissions48h)} 48-hour ICU readmissions. Not mortality risk.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Safety Event Categories', view.safetyByCategory.map((item) => item.name), [{ name: 'Events', values: view.safetyByCategory.map((item) => item.count) }], 'events', `Categories sum to ${num(view.safetyEvents)} process events — not certified harm.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Review Backlog Aging', view.reviewAging.map((item) => item.name), [{ name: 'Open reviews', values: view.reviewAging.map((item) => item.count) }], 'reviews', `Aging bands sum to ${num(view.unresolvedReviews)} unresolved reviews.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Device-Day Documentation Coverage', view.unitRows.map((item) => item.name), [{ name: 'Completeness %', values: view.unitRows.map((item) => Math.round((view.surveillanceCompleteness + (item.readiness - 0.85) * 0.2) * 1000) / 10) }], '%', `Hospital completeness ${pct(view.surveillanceCompleteness)}. Not a validated infection rate.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'ICU Infection Surveillance Trend', view.labels, [{ name: 'Documented device-days', values: view.labels.map((_, i) => Math.round(view.documentedDeviceDays / view.labels.length * (0.9 + 0.1 * Math.sin(i)))) }], 'days', 'Illustrative documentation volume — not CLABSI/CAUTI/VAE incidence.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Quality Indicators by ICU Unit', view.unitRows.map((item) => item.name), [{ name: 'Pending reviews (share)', values: view.unitRows.map((item) => item.pendingTransfers) }], 'count', 'Unit operational quality attention proxy using pending transfer pressure. Validated infection rates are unavailable without surveillance classification.')} />
        </div>
      </div>
      <IndicatorIndex indicators={icuIndicatorsFor(view)} domains={['ICU Quality']} />
    </Page>
  );
}

export function IcuOptimizationPage() {
  const view = useView();
  const prior = usePrior();
  return (
    <Page
      title="ICU Capacity Optimization"
      kpis={[
        score('Recoverable Hours', `${num(view.recoverableBedHours)} h`, compare(view, prior, (item) => item.recoverableBedHours), 'Recoverable ICU Bed Hours',
          'Exclusive recoverable bed hours from flow and staffing drivers.',
          `${num(view.recoverableBedHours)} h · illustrative — not achieved.`,
          { formula: 'Σ exclusive drivers', testId: 'value-kpi_icu_recoverable_bed_hours', limitations: view.methodology.optimization }),
        score('Feasible Capacity', num(view.feasibleAdditionalCapacity), compare(view, prior, (item) => item.feasibleAdditionalCapacity), 'Feasible Additional ICU Capacity',
          'Additional admissions feasible under hours, demand, staffing, and ventilator caps.',
          `${num(view.feasibleAdditionalCapacity)} capped by demand ${num(view.eligibleDemand)}.`,
          { formula: 'min(hours÷LOS, demand, staffed, vents)', testId: 'value-kpi_icu_feasible_capacity' }),
        score('Avoidable Delay', `${num(view.avoidableTransferDelayHours)} h`, compare(view, prior, (item) => item.avoidableTransferDelayHours), 'Avoidable Transfer Delay Hours',
          'Coordination-related transfer delay hours that are potentially avoidable.',
          `${num(view.avoidableTransferDelayHours)} h · does not change clinical readiness.`,
          { formula: 'Coordination share of transfer delay', testId: 'value-kpi_icu_avoidable_transfer_delay' }),
        score('Staff Constrained', `${num(view.staffConstrainedHours)} h`, compare(view, prior, (item) => item.staffConstrainedHours), 'Staff-Constrained Capacity Hours',
          'Physical bed hours unavailable solely due to staffing gaps.',
          `${num(view.staffConstrainedHours)} h · ${num(view.unstaffedPhysical)} unstaffed physical beds.`,
          { formula: 'Unstaffed physical × hours', testId: 'value-kpi_icu_staff_constrained' }),
      ]}
    >
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Recoverable Capacity by Driver', view.delayDriverHours.map((item) => item.name), [{ name: 'Hours', values: view.delayDriverHours.map((item) => item.hours) }], 'hours', `Exclusive drivers sum to ${num(view.recoverableBedHours)} recoverable bed hours.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <section className="gc-panel gc-insight">
            <h2>Management decisions</h2>
            <div className="gc-exception-list">
              <div className="gc-exception gc-tone-neutral"><strong>Reduce transfer delays</strong><span>{num(view.avoidableTransferDelayHours)} h avoidable</span></div>
              <div className="gc-exception gc-tone-neutral"><strong>Improve discharge coordination</strong><span>{num(view.medianDischargeReadyDelayHours, 1)} h ready delay</span></div>
              <div className="gc-exception gc-tone-neutral"><strong>Extend staffed coverage</strong><span>{num(view.staffConstrainedHours)} h constrained</span></div>
            </div>
            <p className="gc-next">Estimates are illustrative. AI does not discharge or transfer patients and does not change clinical readiness decisions.</p>
          </section>
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Current vs Scenario Capacity', ['Available staffed', 'Feasible extra', 'Pending demand'], [{ name: 'Admissions / beds', values: [view.availableStaffed, view.feasibleAdditionalCapacity, view.eligibleDemand] }], 'count', 'Full labels: Available staffed, Feasible extra, Pending demand. Unit-capped scenario extras — illustrative only.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Flow Improvement Opportunities', view.unitOpportunityHours.map((item) => item.name), [{ name: 'Hours', values: view.unitOpportunityHours.map((item) => item.hours) }], 'hours', `Unit-level recoverable hours (non-interchangeable). Sum ${num(view.recoverableBedHours)} h — distinct from driver mix.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Staffed Capacity Constraints', ['Staffed beds', 'Available', 'Gap hrs÷10', 'Unstaffed'], [{ name: 'Value', values: [view.staffedBeds, view.availableStaffed, Math.round(view.staffingGapHours / 10), view.unstaffedPhysical] }], 'index', 'Full labels: Staffed beds, Available, Gap hours ÷ 10, Unstaffed. Caps feasible extras. Bed occupancy stays in Beds.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Transfer Delay Reduction', ['Transfer delay hrs', 'Avoidable hrs', 'Recoverable transfer'], [{ name: 'Hours', values: [Math.round(view.medianTransferDelayHours * view.transfersOut), view.avoidableTransferDelayHours, view.delayDriverHours[0]?.hours ?? 0] }], 'hours', 'Full labels preserved in tooltips. Avoidable delay is a subset — not double-counted on recoverable transfer hours.')} />
        </div>
      </div>
      <IndicatorIndex indicators={icuIndicatorsFor(view)} domains={['ICU Optimization', 'Cross-domain context']} />
      <AiIndex />
    </Page>
  );
}
