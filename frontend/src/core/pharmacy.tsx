import { useMemo, useState, type ReactNode } from 'react';
import { useShowcase } from '@/showcase/state';
import { alertsFor } from './alerts';
import { PHARMACY_AI_CASES, pharmacyIndicatorsFor, type Indicator } from './pharmacyScope';
import { buildPharmacyView, type PharmacyView } from './pharmacyView';
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
type View = PharmacyView;

function useView(): View {
  const store = useShowcase();
  const { period } = usePeriod();
  return useMemo(() => buildPharmacyView(store.hospital, store.year, period), [store.hospital, store.year, period]);
}

function usePrior(): View {
  const store = useShowcase();
  const { period } = usePeriod();
  const year = store.year <= 2024 ? 2024 : store.year - 1;
  return useMemo(() => buildPharmacyView(store.hospital, year, period), [store.hospital, year, period]);
}

function num(value: number, digits = 0): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

/** Compact fictional SAR amount for ribbons and notes. */
function sar(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `SAR ${num(value / 1_000_000, 2)}M`;
  if (abs >= 10_000) return `SAR ${num(value / 1_000, 0)}K`;
  return `SAR ${num(value)}`;
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
          <p className="gc-kicker">Pharmacy & Medication Operations</p>
          <h1>{title}</h1>
        </div>
      </header>
      <div className="gc-ribbon" data-testid="rx-ribbon">
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
  return { type, title, categories, series, unit, digits, note, domain: 'pharmacy', subjects: [title], ...extra };
}

function Alerts({ packed = false }: { packed?: boolean } = {}) {
  const store = useShowcase();
  const copilot = useCopilot();
  const view = useView();
  const { period } = usePeriod();
  const alerts = alertsFor(store.hospital, store.year).filter((alert) => alert.department === 'Pharmacy' && alert.severity !== 'info');
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
              Pharmacy within management thresholds · open Vital Assist
            </button>
          </li>
        )}
      </ul>
      {period === 'year' ? null : <p>These alerts use the full reporting year. The scores above use the selected period.</p>}
      <div className="gc-next">
        <h2>Management action</h2>
        <p>Review dispensing TAT ({num(view.medianTatMin)} min median), stockout SKUs ({num(view.stockoutSkus)}), and barcode scan rate ({pct(view.barcodeRate)}) for {view.periodLabel}.</p>
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
    <section className="gc-panel span-12 gc-scope gc-scope-tight" data-testid="rx-indicator-catalog">
      <div className="gc-scope-head">
        <div>
          <h2>Performance indicators</h2>
          <p>
            Definition catalog for this screen — full names, formulas, units, and ownership. Headline numbers stay in the KPI ribbon above. Bed occupancy stays in Beds; analyzer utilization stays in Laboratory; OR utilization stays in Surgery.
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
          <p>Illustrative pharmacy operations intelligence · not a validated pharmacy information system or clinical decision engine</p>
        </div>
      </div>
      <div className="gc-scope-grid gc-scope-grid-dense">
        {PHARMACY_AI_CASES.map((item) => (
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

export function PharmCommandPage() {
  const view = useView();
  const prior = usePrior();
  return (
    <Page title="Pharmacy Command Center" kpis={[
      score('Medication Orders', num(view.orders), compare(view, prior, (item) => item.orders), 'Medication Orders',
        'Unique medication orders in the selected hospital and period. Not order lines, dispenses, or administrations.',
        `${num(view.orders)} orders · ${num(view.orderLines)} order lines · ${view.periodLabel}.`,
        { formula: 'Unique medication orders (distinct from lines and dispense transactions)', testId: 'value-kpi_rx_med_orders', tone: 'neutral' }),
      score('Verified Orders', num(view.verifiedOrders), compare(view, prior, (item) => item.verifiedOrders), 'Pharmacist-Verified Orders',
        'Orders that cleared pharmacist verification.',
        `${num(view.verifiedOrders)} verified · ${num(view.verificationBacklog)} awaiting verification · ${num(view.cancelledBeforeVerification)} cancelled before verification.`,
        { formula: 'Orders − cancelled before verification − verification backlog', testId: 'value-kpi_rx_verified_orders', tone: 'good', limitations: 'Verification is an order-level step, not a line count.' }),
      score('Dispensed Lines', num(view.dispensedLines), compare(view, prior, (item) => item.dispensedLines), 'Dispensed Medication Lines',
        'Order lines dispensed in the period. Lines are not orders and not dispense transactions.',
        `${num(view.dispensedLines)} lines · ${num(view.dispenseTransactions)} dispense transactions · ${num(view.dispensedOrders)} orders with a dispense.`,
        { formula: 'Σ monthly dispensed order lines', testId: 'value-kpi_rx_dispensed_lines', tone: 'neutral', limitations: 'Lines ≠ orders ≠ dispenses ≠ administrations.' }),
      score('Dispensing Completion', pct(view.dispensingCompletion), compare(view, prior, (item) => item.dispensingCompletion, true), 'Dispensing Completion Rate',
        'Dispensed lines as a share of lines handled (opening open lines plus new lines).',
        `${num(view.dispensedLines)} of ${num(view.lineLedger.opening + view.orderLines)} handled lines.`,
        { formula: 'Dispensed Lines ÷ (opening open lines + new lines)', testId: 'value-kpi_rx_dispensing_completion', tone: rateTone(view.dispensingCompletion, 0.97, 0.95, false) }),
      score('Pending Orders', num(view.pendingOrders), compare(view, prior, (item) => item.pendingOrders), 'Pending Medication Orders',
        'Open orders not yet dispensed or cancelled at observation.',
        `${num(view.pendingOrders)} pending orders · ${num(view.pendingLines)} pending lines at ${view.observationDate}.`,
        { formula: 'Orders − dispensed − cancelled at observation', testId: 'value-kpi_rx_pending_orders', tone: view.pendingOrders > 0 ? 'watch' : 'good', limitations: 'Pending orders are not pending lines.' }),
      score('Urgent Share', pct(view.urgentShare), 'Illustrative', 'Urgent Medication Order Share',
        'Illustrative share of medication orders flagged urgent.',
        `${num(view.urgentOrders)} urgent · ${num(view.routineOrders)} routine.`,
        { formula: 'Urgent orders ÷ Orders', testId: 'value-kpi_rx_urgent_share', limitations: 'Illustrative priority mix — not a clinical triage system.' }),
    ]}>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('area', 'Order Line Flow Trend', view.labels, [
            { name: 'New lines', values: view.monthlyNewLines },
            { name: 'Dispensed lines', values: view.monthlyDispensedLines },
          ], 'lines', 'Monthly new and dispensed order lines. Pending lines roll forward via the line ledger.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Alerts packed />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Order Outcomes', ['Dispensed', 'Cancelled', 'Pending'], [{ name: 'Orders', values: [view.dispensedOrders, view.cancelledOrders, view.pendingOrders] }], 'orders', `Dispensed + cancelled + pending = ${num(view.orders)} orders.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Medication Demand by Care Setting', view.careSettings.map((item) => item.name), [{ name: 'Orders', values: view.careSettings.map((item) => item.orders) }], 'orders', 'ED / inpatient / outpatient order mix. ED arrival KPIs stay in Emergency.')} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Urgent vs Routine Orders', ['Urgent', 'Routine'], [{ name: 'Orders', values: [view.urgentOrders, view.routineOrders] }], 'orders', 'Illustrative priority mix. Urgency is an operational flag, not clinical guidance.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Medication Grain Comparison', ['Orders', 'Order lines', 'Dispense transactions', 'Administration events'], [{ name: 'Count', values: [view.orders, view.orderLines, view.dispenseTransactions, view.administrationEvents] }], 'count', 'Four distinct grains. Orders ≠ lines ≠ dispenses ≠ administrations — never compare them as one population.')} />
        </div>
      </div>
      <IndicatorIndex indicators={pharmacyIndicatorsFor(view)} domains={['Medication Activity']} />
    </Page>
  );
}

export function PharmDispensingPage() {
  const view = useView();
  const prior = usePrior();
  return (
    <Page title="Verification & Dispensing Flow" kpis={[
      score('Median TAT', `${num(view.medianTatMin)} min`, compare(view, prior, (item) => item.medianTatMin), 'Median Dispensing Turnaround',
        'Median minutes from pharmacist verification to dispense for dispensed orders.',
        `Median ${num(view.medianTatMin)} min · P90 ${num(view.p90TatMin)} · target ${view.tatTargetMin} min.`,
        { formula: 'Median(dispense − verification)', testId: 'value-kpi_rx_median_tat', tone: view.medianTatMin >= view.tatTargetMin ? 'alert' : view.medianTatMin >= 32 ? 'watch' : 'good', limitations: 'Dispensed orders only; pending orders are aged separately.' }),
      score('P90 TAT', `${num(view.p90TatMin)} min`, compare(view, prior, (item) => item.p90TatMin), 'P90 Dispensing Turnaround',
        '90th-percentile verification-to-dispense turnaround.',
        `P90 ${num(view.p90TatMin)} min against a ${view.tatTargetMin}-minute target.`,
        { formula: 'P90(dispense − verification)', testId: 'value-kpi_rx_p90_tat', tone: view.p90TatMin > view.tatTargetMin ? 'watch' : 'good' }),
      score('Over-Target', num(view.dispensesOverTarget), compare(view, prior, (item) => item.dispensesOverTarget), 'Dispenses Exceeding TAT Target',
        `Dispensed orders with turnaround above the illustrative ${view.tatTargetMin}-minute target.`,
        `${num(view.dispensesOverTarget)} of ${num(view.dispensedOrders)} dispensed orders.`,
        { formula: `Dispensed orders with TAT > ${view.tatTargetMin} min`, testId: 'value-kpi_rx_over_target', tone: view.dispensedOrders && view.dispensesOverTarget / view.dispensedOrders > 0.25 ? 'alert' : 'watch' }),
      score('Verification Backlog', num(view.verificationBacklog), compare(view, prior, (item) => item.verificationBacklog), 'Orders Awaiting Pharmacist Verification',
        'Open orders waiting for pharmacist verification at observation.',
        `${num(view.verificationBacklog)} of ${num(view.pendingOrders)} pending orders at ${view.observationDate}.`,
        { formula: 'Open orders not yet verified', testId: 'value-kpi_rx_verification_backlog', tone: view.verificationBacklog > 200 ? 'alert' : view.verificationBacklog > 100 ? 'watch' : 'neutral', limitations: 'A subset of Pending Orders — not the dispensing queue.' }),
      score('First-Pass Rate', pct(view.firstPass), compare(view, prior, (item) => item.firstPass, true), 'First-Pass Dispensing Rate',
        'Dispensed lines needing neither rework nor prescriber clarification.',
        `${num(view.firstPassLines)} first-pass of ${num(view.dispensedLines)} dispensed lines.`,
        { formula: 'First-pass lines ÷ Dispensed Lines', testId: 'value-kpi_rx_first_pass', tone: rateTone(view.firstPass, 0.93, 0.9, false), limitations: 'Not 1 − Rework Rate: clarification lines are counted separately.' }),
      score('Rework Rate', pct(view.reworkRate), compare(view, prior, (item) => item.reworkRate, true), 'Dispensing Rework Rate',
        'Dispensed lines re-picked, relabelled, or re-made after dispensing began.',
        `${num(view.reworkLines)} rework · ${num(view.clarifiedLines)} clarified (${pct(view.clarifiedRate)}) of ${num(view.dispensedLines)}.`,
        { formula: 'Rework lines ÷ Dispensed Lines', testId: 'value-kpi_rx_rework', tone: rateTone(view.reworkRate, 0.03, 0.04) }),
    ]}>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Dispensing TAT Trend', view.labels, [{ name: 'Median minutes', values: view.monthlyTat }], 'min', `Monthly median verification-to-dispense TAT. Period median ${num(view.medianTatMin)} min · P90 ${num(view.p90TatMin)}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'TAT by Dispensing Pathway', view.workflows.map((item) => item.name), [{ name: 'Median minutes', values: view.workflowTat }], 'min', `Pathway medians around the hospital median ${num(view.medianTatMin)} min. IV compounding runs longest by design.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Verification Queue Aging', view.verificationAging.map((item) => item.name), [{ name: 'Orders', values: view.verificationAging.map((item) => item.count) }], 'orders', `Aging bands sum to ${num(view.verificationBacklog)} orders awaiting verification.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Urgent vs Routine TAT', view.tatByPriority.map((item) => item.name), [
            { name: 'Median', values: view.tatByPriority.map((item) => item.median) },
            { name: 'P90', values: view.tatByPriority.map((item) => item.p90) },
          ], 'min', 'Urgent and routine orders are sampled separately. Urgency is an operational priority, not a clinical judgement.')} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Dispensed Line Quality Mix', ['First pass', 'Clarified', 'Rework'], [{ name: 'Lines', values: [view.firstPassLines, view.clarifiedLines, view.reworkLines] }], 'lines', `Partition of ${num(view.dispensedLines)} dispensed lines — the three groups are mutually exclusive.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Rework Reasons', view.reworkReasons.map((item) => item.name), [{ name: 'Lines', values: view.reworkReasons.map((item) => item.count) }], 'lines', `Rework reasons sum to ${num(view.reworkLines)} lines.`)} />
        </div>
      </div>
      <IndicatorIndex indicators={pharmacyIndicatorsFor(view)} domains={['Dispensing Flow']} />
    </Page>
  );
}

export function PharmInventoryPage() {
  const view = useView();
  const prior = usePrior();
  const hotCover = [...view.classRows].sort((a, b) => a.daysOfSupply - b.daysOfSupply)[0];
  return (
    <Page title="Inventory & Stock Position" kpis={[
      score('Inventory Value', sar(view.inventoryValue), compare(view, prior, (item) => item.inventoryValue), 'Closing Medication Inventory Value',
        'Value of closing medication stock at observation. Fictional SAR.',
        `${sar(view.inventoryValue)} across ${num(view.totalSkus)} active SKUs at ${view.observationDate}.`,
        { formula: 'Σ closing units × unit cost', testId: 'value-kpi_rx_inventory_value', tone: 'neutral', limitations: 'Point-in-time balance, not a flow measure.' }),
      score('Stockout SKUs', num(view.stockoutSkus), compare(view, prior, (item) => item.stockoutSkus), 'Stocked-Out SKUs',
        'Active SKUs with zero available stock at observation.',
        `${num(view.stockoutSkus)} stocked out of ${num(view.totalSkus)} SKUs.`,
        { formula: 'Active SKUs with zero available stock', testId: 'value-kpi_rx_stockout_skus', tone: view.stockoutSkus >= 8 ? 'alert' : view.stockoutSkus >= 5 ? 'watch' : 'good', limitations: 'Mutually exclusive with Low-Stock SKUs.' }),
      score('Low-Stock SKUs', num(view.lowStockSkus), compare(view, prior, (item) => item.lowStockSkus), 'Low-Stock SKUs',
        'SKUs below reorder cover but still in stock.',
        `${num(view.lowStockSkus)} low-stock · ${num(view.adequateSkus)} adequate · ${num(view.stockoutSkus)} stocked out.`,
        { formula: 'SKUs below reorder cover, stock > 0', testId: 'value-kpi_rx_low_stock_skus', tone: 'watch', limitations: 'Does not include stocked-out SKUs.' }),
      score('Days of Supply', `${num(view.daysOfSupply, 1)} d`, compare(view, prior, (item) => item.daysOfSupply), 'Medication Days of Supply',
        'Closing stock value divided by average daily issue value.',
        `${num(view.daysOfSupply, 1)} days · lowest cover ${hotCover?.name ?? 'n/a'} (${num(hotCover?.daysOfSupply ?? 0, 1)} d).`,
        { formula: 'Closing value ÷ (Spend ÷ days in period)', testId: 'value-kpi_rx_days_of_supply', tone: view.daysOfSupply < 10 ? 'alert' : view.daysOfSupply < 12 ? 'watch' : 'good', limitations: 'Value-weighted across therapeutic groups.' }),
      score('Near-Expiry Value', sar(view.nearExpiryValue), compare(view, prior, (item) => item.nearExpiryValue), 'Near-Expiry Stock Value',
        'Closing stock value in batches expiring within 90 days.',
        `${sar(view.nearExpiryValue)} · ${num(view.nearExpiryUnits)} units in ≤90-day batches.`,
        { formula: 'Σ units in ≤90-day batches × unit cost', testId: 'value-kpi_rx_near_expiry_value', tone: view.inventoryValue && view.nearExpiryValue / view.inventoryValue > 0.05 ? 'watch' : 'neutral', limitations: 'Exposure, not a write-off.' }),
    ]}>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Inventory Value Trend', view.labels, [{ name: 'Closing value (SAR)', values: view.monthlyClosingValue }], 'SAR', `Month-end closing value. Each month opens at the prior month close; period close ${sar(view.inventoryValue)}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Days of Supply by Group', view.classRows.map((item) => item.name), [{ name: 'Days', values: view.classRows.map((item) => item.daysOfSupply) }], 'days', `Hospital cover ${num(view.daysOfSupply, 1)} days. Cover is computed per group — not interchangeable.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'SKU Stock Position', view.classSku.map((item) => item.name), [
            { name: 'Stockout', values: view.classSku.map((item) => item.stockout) },
            { name: 'Low stock', values: view.classSku.map((item) => item.low) },
          ], 'SKUs', `Stockout and low-stock are mutually exclusive; ${num(view.adequateSkus)} SKUs remain adequate.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Stock Ledger Bridge', ['Opening', 'Receipts', 'Issues', 'Expired', 'Discards', 'Closing'], [{ name: 'Units', values: [
            view.quantityLedger.opening,
            view.quantityLedger.receipts,
            view.quantityLedger.issued,
            view.quantityLedger.expired,
            view.quantityLedger.discarded,
            view.quantityLedger.closing,
          ] }], 'units', 'Opening + receipts − issues − expired − discards = closing. No balance goes negative.')} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Batch Expiry Profile', view.batchBuckets, [{ name: 'Units', values: view.batchTotals }], 'units', `Expiry buckets sum to ${num(view.quantityLedger.closing)} closing units.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Near-Expiry Value by Group', view.classRows.map((item) => item.name), [{ name: 'SAR', values: view.classRows.map((item) => item.nearExpiryValue) }], 'SAR', `Group exposure sums to ${sar(view.nearExpiryValue)}.`)} />
        </div>
      </div>
      <IndicatorIndex indicators={pharmacyIndicatorsFor(view)} domains={['Inventory Position']} />
    </Page>
  );
}

export function PharmSafetyPage() {
  const view = useView();
  const prior = usePrior();
  const lowScan = [...view.barcodeSettings].sort((a, b) => a.rate - b.rate)[0];
  return (
    <Page title="Medication Safety Process" kpis={[
      score('Exception Rate', pct(view.verificationExceptionRate), compare(view, prior, (item) => item.verificationExceptionRate, true), 'Verification Exception Rate',
        'Verified orders that needed prescriber contact before dispensing.',
        `${num(view.exceptionOrders)} exception orders of ${num(view.verifiedOrders)} verified.`,
        { formula: 'Exception orders ÷ Verified Orders', testId: 'value-kpi_rx_verification_exception_rate', tone: rateTone(view.verificationExceptionRate, 0.055, 0.07), limitations: 'Process signal for workload; not a clinical finding.' }),
      score('High-Alert Compliance', pct(view.highAlertCompliance), compare(view, prior, (item) => item.highAlertCompliance, true), 'High-Alert Medication Check Compliance',
        'High-alert lines with an independent check recorded.',
        `${num(view.highAlertCompliant)} checked of ${num(view.highAlertLines)} high-alert lines · ${num(view.highAlertGap)} without a recorded check.`,
        { formula: 'Lines with independent check ÷ High-alert lines', testId: 'value-kpi_rx_high_alert_compliance', tone: rateTone(view.highAlertCompliance, 0.94, 0.9, false), limitations: 'Process compliance only; denominators are high-alert lines, not all lines.' }),
      score('Barcode Scan Rate', pct(view.barcodeRate), compare(view, prior, (item) => item.barcodeRate, true), 'Barcode Administration Scan Rate',
        'Administration events scanned at the bedside.',
        `${num(view.scannedAdministrations)} scanned of ${num(view.administrationEvents)} administration events · lowest ${lowScan?.name ?? 'n/a'} ${pct(lowScan?.rate ?? 0)}.`,
        { formula: 'Scanned ÷ Administration events', testId: 'value-kpi_rx_barcode_rate', tone: rateTone(view.barcodeRate, 0.92, 0.88, false), limitations: 'Administration events ≠ orders ≠ dispenses.' }),
      score('Incident Reports', num(view.incidentReports), compare(view, prior, (item) => item.incidentReports), 'Medication Incident Reports',
        'Reported medication process incidents in the period.',
        `${num(view.incidentReports)} reports · ${num(view.incidentsPer1000, 2)} per 1,000 administration events.`,
        { formula: 'Reported medication process incidents', testId: 'value-kpi_rx_incident_reports', tone: 'neutral', limitations: 'Reports reflect reporting culture; not an incidence of harm.' }),
      score('Unresolved Reviews', num(view.unresolvedReviews), compare(view, prior, (item) => item.unresolvedReviews), 'Unresolved Incident Reviews',
        'Incident reviews still open at observation.',
        `${num(view.unresolvedReviews)} open of ${num(view.incidentReports)} reports · ${num(view.reviewsClosed)} closed.`,
        { formula: 'Reports − closed reviews at observation', testId: 'value-kpi_rx_unresolved_reviews', tone: view.incidentReports && view.unresolvedReviews / view.incidentReports > 0.2 ? 'alert' : 'watch' }),
    ]}>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Incident Reports Trend', view.labels, [{ name: 'Reports', values: view.monthlyIncidents }], 'reports', `Monthly reports sum to ${num(view.incidentReports)}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Incident Type Mix', view.incidentTypes.map((item) => item.name), [{ name: 'Reports', values: view.incidentTypes.map((item) => item.count) }], 'reports', `Types sum to ${num(view.incidentReports)} reports. Reach and type are separate partitions.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Barcode Scan Rate by Setting', view.barcodeSettings.map((item) => item.name), [{ name: 'Scan rate %', values: view.barcodeSettings.map((item) => Math.round(item.rate * 1000) / 10) }], '%', `Scanned ÷ administration events per setting. Hospital rate ${pct(view.barcodeRate)}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'High-Alert Check Gap by Group', view.highAlertByClass.map((item) => item.name), [{ name: 'Lines without check', values: view.highAlertByClass.map((item) => item.lines - item.compliant) }], 'lines', `Gaps sum to ${num(view.highAlertGap)} of ${num(view.highAlertLines)} high-alert lines.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Verification Exceptions by Reason', view.exceptionReasons.map((item) => item.name), [{ name: 'Orders', values: view.exceptionReasons.map((item) => item.count) }], 'orders', `Reasons sum to ${num(view.exceptionOrders)} exception orders.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Incident Review Aging', view.reviewAging.map((item) => item.name), [{ name: 'Open reviews', values: view.reviewAging.map((item) => item.count) }], 'reviews', `Aging bands sum to ${num(view.unresolvedReviews)} unresolved reviews.`)} />
        </div>
      </div>
      <IndicatorIndex indicators={pharmacyIndicatorsFor(view)} domains={['Safety Process']} />
    </Page>
  );
}

export function PharmCostPage() {
  const view = useView();
  const prior = usePrior();
  const topClass = [...view.classRows].sort((a, b) => b.spend - a.spend)[0];
  return (
    <Page title="Medication Cost & Waste" kpis={[
      score('Medication Spend', sar(view.medicationSpend), compare(view, prior, (item) => item.medicationSpend), 'Medication Dispensing Spend',
        'Cost of units issued for dispensing. Fictional SAR. Excludes write-offs.',
        `${sar(view.medicationSpend)} · top group ${topClass?.name ?? 'n/a'} (${sar(topClass?.spend ?? 0)}).`,
        { formula: 'Σ issued units × unit cost', testId: 'value-kpi_rx_medication_spend', tone: 'neutral', limitations: 'Expired and discarded value are separate write-offs.' }),
      score('Cost per Line', sar(view.costPerLine), compare(view, prior, (item) => item.costPerLine), 'Medication Cost per Dispensed Line',
        'Medication spend divided by dispensed lines.',
        `${sar(view.medicationSpend)} ÷ ${num(view.dispensedLines)} dispensed lines.`,
        { formula: 'Spend ÷ Dispensed Lines', testId: 'value-kpi_rx_cost_per_line', tone: 'neutral', limitations: 'Therapeutic mix drives the average.' }),
      score('Expired Value', sar(view.expiredValue), compare(view, prior, (item) => item.expiredValue), 'Expired Stock Write-off Value',
        'Value of units that expired and were written off.',
        `${sar(view.expiredValue)} expired · ${sar(view.discardValue)} discards & returns · total write-offs ${sar(view.totalWaste)}.`,
        { formula: 'Σ expired units × unit cost', testId: 'value-kpi_rx_expired_value', tone: view.medicationSpend && view.expiredValue / view.medicationSpend > 0.008 ? 'watch' : 'neutral', limitations: 'Not part of Spend; not added again in Avoidable Waste.' }),
      score('Avoidable Waste', sar(view.avoidableWaste), compare(view, prior, (item) => item.avoidableWaste), 'Potentially Avoidable Medication Waste',
        'The avoidable share of expired and discarded value — a subset of write-offs.',
        `${sar(view.avoidableWaste)} of ${sar(view.totalWaste)} write-offs (${sar(view.avoidableExpired)} expiry · ${sar(view.avoidableDiscard)} discards).`,
        { formula: 'Avoidable share of expired + discarded value', testId: 'value-kpi_rx_avoidable_waste', tone: 'watch', limitations: 'Never added on top of write-offs. Not all waste is avoidable.' }),
      score('Potential Savings', sar(view.potentialSavings), 'Illustrative', 'Potential Medication Savings',
        'Sum of exclusive savings drivers; each SAR is counted once.',
        `${sar(view.potentialSavings)} across ${view.savingsDrivers.length} exclusive drivers.`,
        { formula: 'Σ exclusive savings drivers', testId: 'value-kpi_rx_potential_savings', tone: 'watch', limitations: 'Illustrative — not achieved savings.' }),
    ]}>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Monthly Medication Spend', view.labels, [{ name: 'Spend (SAR)', values: view.monthlySpend }], 'SAR', `Monthly spend sums to ${sar(view.medicationSpend)}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Spend by Therapeutic Group', view.classRows.map((item) => item.name), [{ name: 'SAR', values: view.classRows.map((item) => item.spend) }], 'SAR', `Group spend sums to ${sar(view.medicationSpend)}. Oncology & specialty is high cost per unit.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Cost Bridge', ['Spend', 'Expired', 'Discards', 'Total outflow'], [{ name: 'SAR', values: [view.medicationSpend, view.expiredValue, view.discardValue, view.totalOutflowCost] }], 'SAR', 'Total outflow = spend + expired + discards. Each SAR appears in exactly one component.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Avoidable vs Total Write-offs', view.wasteComponents.map((item) => item.name), [
            { name: 'Total', values: view.wasteComponents.map((item) => item.value) },
            { name: 'Avoidable', values: [view.avoidableExpired, view.avoidableDiscard] },
          ], 'SAR', `Avoidable ${sar(view.avoidableWaste)} is a subset of ${sar(view.totalWaste)} write-offs.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Savings by Driver', view.savingsDrivers.map((item) => item.name), [{ name: 'SAR', values: view.savingsDrivers.map((item) => item.value) }], 'SAR', `Exclusive drivers sum to ${sar(view.potentialSavings)}. Illustrative — not achieved.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Expired Value by Group', view.classRows.map((item) => item.name), [{ name: 'SAR', values: view.classRows.map((item) => item.expiredValue) }], 'SAR', `Group expiry write-offs sum to ${sar(view.expiredValue)}.`)} />
        </div>
      </div>
      <IndicatorIndex indicators={pharmacyIndicatorsFor(view)} domains={['Cost & Waste']} />
    </Page>
  );
}

export function PharmOptimizationPage() {
  const view = useView();
  const prior = usePrior();
  const reworkRecoverable = view.delayDriverHours[0]?.hours ?? 0;
  const usableRecovered = Math.max(0, view.recoverableHours - Math.round(reworkRecoverable * 0.35));
  const hotWorkflow = [...view.workflows].sort((a, b) => b.recoverableHours - a.recoverableHours)[0];
  return (
    <Page title="Pharmacy Capacity Optimization" kpis={[
      score('Recoverable Hours', `${num(view.recoverableHours)} h`, compare(view, prior, (item) => item.recoverableHours), 'Potentially Recoverable Pharmacy Hours',
        'Sum of exclusive workflow drivers: rework, clarification waits, queue handoff gaps, and unused staffed time.',
        `${num(view.recoverableHours)} h of ${num(view.staffedHours)} staffed hours across ${view.workflows.length} dispensing pathways.`,
        { formula: 'Σ exclusive workflow drivers', testId: 'value-kpi_rx_recoverable_hours', tone: 'watch', limitations: 'Modeled opportunity — not achieved capacity. Pathways are not interchangeable.' }),
      score('Additional Lines', num(view.additionalLines), compare(view, prior, (item) => item.additionalLines), 'Feasible Additional Dispensing Capacity',
        'Sum of pathway-feasible extra lines (pathway minutes × recovered hours, capped by eligible pending lines).',
        `${num(view.additionalLines)} of ${num(view.potentialAdditionalLines)} hour-feasible · capped by eligible pending lines.`,
        { formula: 'Σ_w min(potential_w, eligible_w)', testId: 'value-kpi_rx_additional_lines', tone: 'watch', limitations: 'Illustrative — not an achieved result. IV compounding hours do not become oral dispensing lines.' }),
      score('Eligible Pending', num(view.eligiblePending), compare(view, prior, (item) => item.eligiblePending), 'Eligible Pending Lines',
        'Pending lines that could use recovered capacity.',
        `${num(view.eligiblePending)} of ${num(view.pendingLines)} pending lines.`,
        { formula: 'Σ pathway eligible pending lines', testId: 'value-kpi_rx_eligible_pending', tone: 'neutral' }),
      score('Feasible TAT Cut', `${num(view.feasibleTatCutMin, 1)} min`, 'Illustrative', 'Feasible Dispensing TAT Reduction',
        'Median TAT minutes recoverable if queue handoff and clarification gaps are closed.',
        `${num(view.feasibleTatCutMin, 1)} of ${num(view.medianTatMin)} median minutes (capped at 30%).`,
        { formula: 'Median TAT × queue and clarification recoverable share', testId: 'value-kpi_rx_feasible_tat_cut', tone: 'watch', limitations: 'Illustrative upper bound — not a measured improvement.' }),
    ]}>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Recoverable Hours by Driver', view.delayDriverHours.map((item) => item.name), [{ name: 'Hours', values: view.delayDriverHours.map((item) => item.hours) }], 'hours', 'Exclusive drivers rolled up from pathway calculations — sum equals Recoverable Hours.')} />
        </div>
        <div className="gc-ed-pack-col">
          <section className="gc-panel gc-insight">
            <h2>Management decisions</h2>
            <div className="gc-exception-list">
              <div className="gc-exception gc-tone-watch"><strong>Cut dispensing rework</strong><span>{pct(view.reworkRate)} rework</span></div>
              <div className="gc-exception gc-tone-alert"><strong>Clear verification backlog</strong><span>{num(view.verificationBacklog)} awaiting</span></div>
              <div className="gc-exception gc-tone-neutral"><strong>Extend staffed pharmacy hours</strong><span>{num(view.staffedHours)} staffed h</span></div>
              <div className="gc-exception gc-tone-watch"><strong>Reduce dispensing TAT</strong><span>Median {num(view.medianTatMin)} min</span></div>
              <div className="gc-exception gc-tone-neutral"><strong>Reduce stockout SKUs</strong><span>{num(view.stockoutSkus)} stocked out</span></div>
              <div className="gc-exception gc-tone-watch"><strong>Prioritize eligible pending lines</strong><span>+{num(view.additionalLines)} feasible · {hotWorkflow?.name ?? 'n/a'}</span></div>
            </div>
            <p className="gc-next">Estimates are illustrative. AI does not change pharmacy schedules alone.</p>
          </section>
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Staffed Hours Accounting', ['Staffed', 'Productive', 'Rework', 'Clarification', 'Handoff', 'Unused'], [{ name: 'Hours', values: [
            view.staffedHours,
            view.productiveHours,
            view.reworkHours,
            view.clarificationHours,
            view.handoffHours,
            view.unusedHours,
          ] }], 'hours', 'Staffed = productive + rework + clarification + handoff + unused. Pathway hours are not interchangeable.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Additional Lines by Pathway', view.workflows.map((item) => item.name), [{ name: 'Feasible extras', values: view.workflows.map((item) => item.additionalLines) }], 'lines', `Pathway extras sum to ${num(view.additionalLines)}. Computed per pathway — not a shared hour pool.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Recoverable Hours by Pathway', view.workflows.map((item) => item.name), [{ name: 'Hours', values: view.workflows.map((item) => item.recoverableHours) }], 'hours', `Pathway recoverable hours sum to ${num(view.recoverableHours)} h.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Capacity Constraints', ['Recoverable hours', 'Rework recoverable hours', 'Usable recovered hours'], [{ name: 'Hours', values: [view.recoverableHours, reworkRecoverable, usableRecovered] }], 'hours', 'Rework is an exclusive driver haircut on usable recovery. Bed occupancy and analyzer utilization stay in Beds and Laboratory.')} />
        </div>
      </div>
      <IndicatorIndex indicators={pharmacyIndicatorsFor(view)} domains={['Capacity Optimization', 'Cross-domain context']} />
      <AiIndex />
    </Page>
  );
}
