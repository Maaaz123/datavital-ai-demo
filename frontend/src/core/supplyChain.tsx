import { useMemo, useState, type ReactNode } from 'react';
import { useShowcase } from '@/showcase/state';
import { alertsFor } from './alerts';
import { scIndicatorsFor, SC_AI_CASES } from './supplyChainScope';
import {
  ownersForScScreen,
  SC_SCREEN_TITLES,
  type ScScreenId,
} from './supplyChainOwnership';
import { buildScView, scIdentityIssues, SC_TARGETS, type ScView } from './supplyChainView';
import { useCopilot } from './Copilot';
import { usePeriod } from './period';
import { Chart, type Figure } from './viz';

type Detail = { name: string; value: string; definition: string; scope: string; formula?: string; limitations?: string };
type Tone = 'good' | 'watch' | 'alert' | 'neutral';
type View = ScView;

function useView(): View {
  const store = useShowcase();
  const { period } = usePeriod();
  return useMemo(() => buildScView(store.hospital, store.year, period), [store.hospital, store.year, period]);
}

function usePrior(): View {
  const store = useShowcase();
  const { period } = usePeriod();
  const year = store.year <= 2024 ? 2024 : store.year - 1;
  return useMemo(() => buildScView(store.hospital, year, period), [store.hospital, year, period]);
}

function num(value: number, digits = 0): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function sar(value: number): string {
  return `SAR ${num(Math.round(value))}`;
}

function high(value: number, target: number, band = 0.03): Tone {
  if (value >= target) return 'good';
  return value >= target - band ? 'watch' : 'alert';
}

function low(value: number, target: number, band: number): Tone {
  if (value <= target) return 'good';
  return value <= target + band ? 'watch' : 'alert';
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

type RibbonRow = {
  value: string;
  delta: string;
  tone?: Tone;
  scope: string;
  formula?: string;
  limitations?: string;
};

function ribbon(screen: ScScreenId, values: Record<string, RibbonRow>) {
  return ownersForScScreen(screen).map((owner) => {
    const row = values[owner.id];
    return score(owner.display, row.value, row.delta, owner.fullName, owner.decision, row.scope, {
      formula: row.formula,
      limitations: row.limitations,
      testId: `value-${owner.id}`,
      tone: row.tone,
    });
  });
}

function Disclosure() {
  return (
    <section className="gc-panel gc-insight span-12" data-testid="sc-disclosure">
      <h2>Data scope</h2>
      <p>
        Synthetic supply-chain and procurement demo data — not live hospital inventory, purchasing, or payment records.
        On-hand inventory is a period-end snapshot (not a sum of monthly snapshots). Purchase order ≠ receipt ≠ invoice ≠ payment.
        Days of Supply uses usable units ÷ forecast daily unit demand. Cheapest supplier is not assumed safest.
        Modeled improvements are illustrative and require authorized human review. Never cut clinically critical safety stock solely for carrying cost.
      </p>
    </section>
  );
}

function Page({ title, kpis, children }: { title: string; kpis: { name: string; value: string; delta: string; tone?: Tone; testId?: string; detail: Detail }[]; children: ReactNode }) {
  const [open, setOpen] = useState<Detail | null>(null);
  return (
    <article className="gc-command gc-ed">
      <header className="gc-command-head">
        <div>
          <p className="gc-kicker">Supply Chain & Procurement Intelligence</p>
          <h1>{title}</h1>
        </div>
      </header>
      <div className="gc-ribbon" data-testid="sc-ribbon">
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
      <div className="gc-dense gc-ed-body">
        {children}
        <Disclosure />
      </div>
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

function axis(labels: string[]): string[] {
  return labels.map((label) => {
    if (label.length <= 12) return label;
    const words = label.split(/\s+/);
    if (words.length >= 2) return words.map((word) => word.slice(0, 6)).join(' ').slice(0, 14);
    return label.slice(0, 12);
  });
}

function fig(type: Figure['type'], title: string, categories: string[], series: Figure['series'], unit: string, note: string, extra?: Partial<Figure>): Figure {
  const digits = unit === '%' || unit === 'days' || unit === 'rate' || unit === 'turns' || unit === 'hours' ? 1 : 0;
  return { type, title, categories: axis(categories), series, unit, digits, note, domain: 'supply-chain', subjects: [title], ...extra };
}

function rate(values: number[]): number[] {
  return values.map((value) => Math.round(value * 1000) / 10);
}

function Alerts({ packed = false }: { packed?: boolean } = {}) {
  const store = useShowcase();
  const copilot = useCopilot();
  const view = useView();
  const { period } = usePeriod();
  const alerts = alertsFor(store.hospital, store.year, period).filter((alert) => alert.department === 'Supply Chain' && alert.severity !== 'info');
  return (
    <section className={`gc-panel gc-insight${packed ? '' : ' span-4'}`}>
      <h2>Priority signals</h2>
      <ul className="gc-alert-list">
        {alerts.length ? alerts.map((alert) => (
          <li key={alert.id}>
            <button type="button" onClick={() => copilot.openAlert(alert, { stay: true })}>
              <span className={`gc-sev gc-sev-${alert.severity}`}>{alert.severity}</span>
              {alert.title} · {alert.observed}
              <em className="gc-alert-scope"> · {alert.period}</em>
            </button>
          </li>
        )) : (
          <li>
            <button type="button" onClick={() => copilot.setOpen(true)}>
              <span className="gc-sev gc-sev-medium">review</span>
              Supply Chain within management thresholds · open Vital Assist
            </button>
          </li>
        )}
      </ul>
      <p>Alert scope matches the selected reporting period ({view.periodLabel}). Stocks use the period-end snapshot.</p>
      <div className="gc-next">
        <button type="button" onClick={() => copilot.setOpen(true)}>Open Vital Assist</button>
      </div>
    </section>
  );
}

function IndicatorIndex({ indicators }: { indicators: ReturnType<typeof scIndicatorsFor> }) {
  return (
    <section className="gc-panel span-12">
      <h2>Performance indicators</h2>
      <p>Definition catalog for this screen — full names, formulas, units, and ownership. Headline numbers stay in the KPI ribbon above.</p>
      <div className="gc-exception-list">
        {indicators.map((item) => (
          <article key={`${item.screen}-${item.name}`} className="gc-exception gc-tone-neutral">
            <strong>{item.name}</strong>
            <span>{item.method} · {item.cohort} · {item.aggregation} · {item.scope} · {item.limitations}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function AiIndex() {
  return (
    <section className="gc-panel span-12">
      <h2>AI decision support</h2>
      <p>Illustrative supply-chain decision support · not autonomous purchasing and not formulary authority</p>
      <div className="gc-exception-list">
        {SC_AI_CASES.map((item) => (
          <div key={item.title} className="gc-exception gc-tone-neutral">
            <strong>{item.title}</strong>
            <span>{item.owner} · follow-up {item.followUp}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ScCommandPage() {
  const view = useView();
  const prior = usePrior();
  const issues = scIdentityIssues(view);
  return (
    <Page
      title={SC_SCREEN_TITLES.command}
      kpis={ribbon('command', {
        kpi_sc_supply_availability_rate: {
          value: pct(view.supplyAvailability),
          delta: compare(view, prior, (item) => item.supplyAvailability, true),
          tone: high(view.supplyAvailability, SC_TARGETS.supplyAvailability, 0.03),
          scope: `Target ≥ ${pct(SC_TARGETS.supplyAvailability)} · ${view.periodLabel}.`,
          formula: 'Available SKU-days ÷ plan SKU-days',
          limitations: view.methodology.inventory,
        },
        kpi_sc_critical_stockout_exposure: {
          value: num(view.criticalStockouts),
          delta: compare(view, prior, (item) => item.criticalStockouts),
          tone: view.criticalStockouts > 5 ? 'alert' : view.criticalStockouts > 2 ? 'watch' : 'good',
          scope: `Period-end stock at ${view.observationDate}.`,
          formula: 'Critical SKUs with zero available usable stock',
        },
        kpi_sc_inventory_value: {
          value: sar(view.inventoryValue),
          delta: compare(view, prior, (item) => item.inventoryValue),
          scope: `Period-end snapshot · fictional SAR · ${view.observationDate}.`,
          formula: 'On-hand × unit cost (snapshot)',
          limitations: 'Not a sum of monthly snapshots.',
        },
        kpi_sc_supplier_otd: {
          value: pct(view.supplierOtd),
          delta: compare(view, prior, (item) => item.supplierOtd, true),
          tone: high(view.supplierOtd, SC_TARGETS.supplierOtd, 0.04),
          scope: `On-time receipts of ${num(view.receiptsReceived)} receipts · ${view.periodLabel}.`,
          formula: 'On-time receipts ÷ receipts',
          limitations: view.methodology.suppliers,
        },
        kpi_sc_expiry_risk_value: {
          value: sar(view.expiryRiskValue),
          delta: compare(view, prior, (item) => item.expiryRiskValue),
          tone: view.expiryRiskValue > 400_000 ? 'watch' : 'neutral',
          scope: `Near-expiry usable stock at ${view.observationDate}.`,
          formula: 'Near-expiry usable × unit cost',
          limitations: view.methodology.waste,
        },
        kpi_sc_po_backlog: {
          value: num(view.poBacklog),
          delta: compare(view, prior, (item) => item.poBacklog),
          tone: view.poBacklog > 45 ? 'watch' : 'neutral',
          scope: `Open POs at ${view.observationDate}. PO ≠ receipt.`,
          formula: 'Open incomplete purchase orders',
          limitations: view.methodology.procurement,
        },
      })}
    >
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Supply Availability Trend', view.labels, [
            { name: 'Availability %', values: view.monthlyAvailability },
          ], '%', `Monthly availability. Ledger identities ${issues.length ? `need review (${issues.join(', ')})` : 'reconcile'}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Alerts packed />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Critical Stockout Overview', ['Critical stockouts', 'Below safety'], [
            { name: 'SKUs', values: [view.criticalStockouts, view.belowSafety] },
          ], 'SKUs', 'Period-end stocks. Stockouts are a subset pressure signal within below-safety exposure.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Inventory Value by Category', view.categoryRows.map((item) => item.name), [
            { name: 'Units', values: view.categoryRows.map((item) => item.available) },
          ], 'units', `Category available units sum to period-end available ${num(view.availableUnits)}. Value uses unit cost ${num(view.unitCostSar)} SAR.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Supplier On-Time Delivery Trend', view.labels, [
            { name: 'OTD %', values: view.monthlyOtd },
          ], '%', `Period OTD ${pct(view.supplierOtd)}. OTD ≠ fill rate.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Expiry Risk Exposure', ['Near-expiry value', 'Expired value'], [
            { name: 'SAR', values: [view.expiryRiskValue, view.expiredValue] },
          ], 'SAR', 'Near-expiry is a snapshot; expired is a period write-off flow.')} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Purchase Order Backlog', view.labels, [
            { name: 'Open PO proxy', values: view.monthlyOpenPoProxy },
          ], 'POs', `Illustrative monthly allocation of open PO pressure. Period stock ${num(view.poBacklog)}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <section className="gc-panel gc-insight">
            <h2>Leadership note</h2>
            <p>
              Use specialist pages for inventory cover, procurement cycle discipline, supplier fill/contract metrics, clinical consumption, and waste dispositions.
              This command view surfaces leadership attention only. Priority signals: {num(view.prioritySignals)}.
            </p>
          </section>
        </div>
      </div>
      <IndicatorIndex indicators={scIndicatorsFor(view).filter((item) => item.screen === 'Command')} />
      <AiIndex />
    </Page>
  );
}

export function ScInventoryPage() {
  const view = useView();
  const prior = usePrior();
  return (
    <Page
      title={SC_SCREEN_TITLES.inventory}
      kpis={ribbon('inventory', {
        kpi_sc_available_units: {
          value: num(view.availableUnits),
          delta: compare(view, prior, (item) => item.availableUnits),
          scope: `Usable available at ${view.observationDate}. Excludes quarantined / recalled / expired / damaged.`,
          formula: 'Period-end usable available quantity',
          limitations: view.methodology.inventory,
        },
        kpi_sc_critical_below_safety: {
          value: num(view.belowSafety),
          delta: compare(view, prior, (item) => item.belowSafety),
          tone: view.belowSafety > 12 ? 'watch' : 'neutral',
          scope: `Of ${num(view.criticalSkus)} critical SKUs.`,
          formula: 'Critical SKUs below safety stock',
        },
        kpi_sc_inventory_turnover: {
          value: num(view.inventoryTurnover, 1),
          delta: compare(view, prior, (item) => item.inventoryTurnover),
          scope: `${num(view.clinicalConsumption)} issued ÷ avg usable ${num(Math.round(view.avgUsable))}.`,
          formula: 'Issued ÷ average on-hand usable',
          limitations: 'Unit turnover — not value/usage.',
        },
        kpi_sc_days_of_supply: {
          value: view.daysOfSupply == null ? 'No demand' : num(view.daysOfSupply, 1),
          delta: view.daysOfSupply == null || prior.daysOfSupply == null
            ? 'No demand'
            : compare(view, prior, (item) => item.daysOfSupply as number),
          tone: view.daysOfSupply == null
            ? 'neutral'
            : view.daysOfSupply < 18 ? 'alert' : view.daysOfSupply < SC_TARGETS.daysOfSupply ? 'watch' : 'good',
          scope: view.daysOfSupply == null
            ? `No forecast demand in ${view.periodLabel} — DOS undefined (units, not SAR).`
            : `${num(view.availableUnits)} usable units ÷ ${num(view.dailyForecastDemand, 1)} forecast daily demand.`,
          formula: 'Available usable units ÷ forecast avg daily unit demand',
          limitations: view.methodology.dos,
        },
        kpi_sc_inventory_accuracy: {
          value: pct(view.inventoryAccuracy),
          delta: compare(view, prior, (item) => item.inventoryAccuracy, true),
          tone: high(view.inventoryAccuracy, SC_TARGETS.inventoryAccuracy, 0.03),
          scope: `Cycle counts · ${view.periodLabel}.`,
          formula: 'Within-tolerance ÷ counted lines',
        },
        kpi_sc_replenishment_exceptions: {
          value: num(view.replenishmentExceptions),
          delta: compare(view, prior, (item) => item.replenishmentExceptions),
          tone: view.replenishmentExceptions > 20 ? 'watch' : 'neutral',
          scope: `Open exceptions at ${view.observationDate}.`,
          formula: 'Open replenishment exceptions',
        },
      })}
    >
      <section className="gc-panel span-12">
        <h2>Snapshot vs flow discipline</h2>
        <p>
          Available units and days of supply are period-end stocks. Issued units are event flows.
          Opening {num(view.openingAvailable)} → closing {num(view.availableUnits)} after receipts, returns, issues, quarantine, and write-offs
          (roll-forward delta {num(view.rollForwardDelta)}). Days of Supply uses units ÷ forecast daily demand — never inventory value ÷ usage value.
          {view.daysOfSupply == null ? ' No forecast demand — DOS shows as No demand.' : ` Period DOS ${num(view.daysOfSupply, 1)} days (elevated year-grain cover can reflect excess inventory).`}
        </p>
      </section>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          {view.categoryRows.every((item) => item.empty) ? (
            <section className="gc-panel"><h2>Available Units by Category</h2><p>No category inventory in this period.</p></section>
          ) : (
            <Slot span={false} figure={fig('bars', 'Available Units by Category', view.categoryRows.filter((item) => !item.empty).map((item) => item.name), [
              { name: 'Available', values: view.categoryRows.filter((item) => !item.empty).map((item) => item.available) },
            ], 'units', `Categories sum to available ${num(view.availableUnits)}.`)} />
          )}
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Critical SKUs Below Safety Stock', view.categoryRows.map((item) => item.name), [
            { name: 'Below safety', values: view.categoryRows.map((item) => item.belowSafety) },
          ], 'SKUs', `Below-safety total ${num(view.belowSafety)}. Never cut clinically critical safety stock solely for cost.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Inventory Turnover Trend', view.labels, [
            { name: 'Turns proxy', values: view.monthlyTurnover },
          ], 'turns', `Period unit turnover ${num(view.inventoryTurnover, 1)}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          {view.daysOfSupply == null || view.categoryRows.every((item) => item.daysOfSupply == null) ? (
            <section className="gc-panel"><h2>Days of Supply by Category</h2><p>No demand — days of supply undefined (not invented).</p></section>
          ) : (
            <Slot span={false} figure={fig('bars', 'Days of Supply by Category', view.categoryRows.filter((item) => item.daysOfSupply != null).map((item) => item.name), [
              { name: 'Days', values: view.categoryRows.filter((item) => item.daysOfSupply != null).map((item) => item.daysOfSupply as number) },
            ], 'days', `Overall days of supply ${num(view.daysOfSupply, 1)} (usable units ÷ forecast daily demand).`)} />
          )}
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Inventory Accuracy', ['Accurate', 'Out of tolerance'], [
            { name: 'Share', values: rate([view.inventoryAccuracy, 1 - view.inventoryAccuracy]) },
          ], '%', `Cycle-count accuracy ${pct(view.inventoryAccuracy)}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Replenishment Exceptions', view.exceptionRows.slice(0, 3).map((item) => item.name), [
            { name: 'Exceptions', values: view.exceptionRows.slice(0, 3).map((item) => item.count) },
          ], 'count', `Open replenishment exceptions ${num(view.replenishmentExceptions)}.`)} />
        </div>
      </div>
      <IndicatorIndex indicators={scIndicatorsFor(view).filter((item) => item.screen === 'Inventory')} />
    </Page>
  );
}

export function ScProcurementPage() {
  const view = useView();
  const prior = usePrior();
  return (
    <Page
      title={SC_SCREEN_TITLES.procurement}
      kpis={ribbon('procurement', {
        kpi_sc_open_pos: {
          value: num(view.openPos),
          delta: compare(view, prior, (item) => item.openPos),
          scope: `Opened ${num(view.poOpened)} · closed ${num(view.poClosed)} · ${view.periodLabel}.`,
          formula: 'Open POs with remaining quantity',
          limitations: view.methodology.procurement,
        },
        kpi_sc_po_approval_tat: {
          value: `${num(view.poApprovalTat, 1)} h`,
          delta: compare(view, prior, (item) => item.poApprovalTat),
          tone: view.poApprovalTat > 36 ? 'watch' : 'neutral',
          scope: 'Median requisition → approval.',
          formula: 'Median approval hours',
        },
        kpi_sc_po_cycle_time: {
          value: `${num(view.poCycleTime, 1)} d`,
          delta: compare(view, prior, (item) => item.poCycleTime),
          scope: 'Median approval → first receipt.',
          formula: 'Median PO cycle days',
        },
        kpi_sc_purchase_price_variance: {
          value: sar(view.purchasePriceVariance),
          delta: compare(view, prior, (item) => item.purchasePriceVariance),
          scope: `Against contract / standard price · ${view.periodLabel}.`,
          formula: '(Actual − standard) × received qty',
        },
        kpi_sc_procurement_exceptions: {
          value: num(view.procurementExceptions),
          delta: compare(view, prior, (item) => item.procurementExceptions),
          tone: view.procurementExceptions > 15 ? 'watch' : 'neutral',
          scope: `Open exceptions at ${view.observationDate}.`,
          formula: 'Open procurement exceptions',
        },
        kpi_sc_ontime_po_fulfillment: {
          value: pct(view.ontimePoFulfillment),
          delta: compare(view, prior, (item) => item.ontimePoFulfillment, true),
          tone: high(view.ontimePoFulfillment, SC_TARGETS.ontimePoFulfillment, 0.05),
          scope: `PO lines received by need-by date · ${view.periodLabel}.`,
          formula: 'On-time lines ÷ lines due',
        },
      })}
    >
      <section className="gc-panel span-12">
        <h2>Document lifecycle</h2>
        <p>
          Ordered {num(view.receiptsOrdered)} · received {num(view.receiptsReceived)} · invoiced {num(view.receiptInvoices)} · paid {num(view.paymentsPosted)}.
          These are four distinct ledgers — do not treat them as interchangeable.
        </p>
      </section>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Open Purchase Orders Trend', view.labels, [
            { name: 'Open proxy', values: view.monthlyOpenPoProxy },
          ], 'POs', `Period-end open POs ${num(view.openPos)}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'PO Approval Turnaround', ['Median hours', '36h guide'], [
            { name: 'Hours', values: [view.poApprovalTat, 36] },
          ], 'hours', `Median approval TAT ${num(view.poApprovalTat, 1)} hours.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'PO Cycle Time Distribution', ['Cycle days', '10d guide'], [
            { name: 'Days', values: [view.poCycleTime, 10] },
          ], 'days', `Median approval-to-receipt ${num(view.poCycleTime, 1)} days.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Purchase Price Variance', ['Price variance'], [
            { name: 'SAR', values: [Math.abs(view.purchasePriceVariance)] },
          ], 'SAR', `Signed variance ${sar(view.purchasePriceVariance)} (fictional).`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Procurement Exceptions', view.exceptionRows.slice(3).map((item) => item.name), [
            { name: 'Exceptions', values: view.exceptionRows.slice(3).map((item) => item.count) },
          ], 'count', `Open procurement exceptions ${num(view.procurementExceptions)}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'On-Time PO Fulfillment', ['On-time', 'Late'], [
            { name: 'Share', values: rate([view.ontimePoFulfillment, 1 - view.ontimePoFulfillment]) },
          ], '%', `On-time PO fulfillment ${pct(view.ontimePoFulfillment)}.`)} />
        </div>
      </div>
      <IndicatorIndex indicators={scIndicatorsFor(view).filter((item) => item.screen === 'Procurement')} />
    </Page>
  );
}

export function ScSuppliersPage() {
  const view = useView();
  const prior = usePrior();
  return (
    <Page
      title={SC_SCREEN_TITLES.suppliers}
      kpis={ribbon('suppliers', {
        kpi_sc_supplier_fill_rate: {
          value: pct(view.supplierFillRate),
          delta: compare(view, prior, (item) => item.supplierFillRate, true),
          tone: high(view.supplierFillRate, SC_TARGETS.supplierFillRate, 0.04),
          scope: `${num(view.receiptsReceived)} received of ${num(view.receiptsOrdered)} ordered. Fill ≠ OTD (OTD owned on Command).`,
          formula: 'Quantity received ÷ quantity ordered',
          limitations: view.methodology.suppliers,
        },
        kpi_sc_contract_compliance: {
          value: pct(view.contractCompliance),
          delta: compare(view, prior, (item) => item.contractCompliance, true),
          tone: high(view.contractCompliance, SC_TARGETS.contractCompliance, 0.05),
          scope: `Contracted spend share · ${view.periodLabel}.`,
          formula: 'Contracted spend ÷ eligible spend',
        },
        kpi_sc_defective_delivery_rate: {
          value: pct(view.defectiveDeliveryRate),
          delta: compare(view, prior, (item) => item.defectiveDeliveryRate, true),
          tone: low(view.defectiveDeliveryRate, 0.02, 0.015),
          scope: 'Rejected / defective receipt quantity.',
          formula: 'Defective qty ÷ received qty',
        },
        kpi_sc_supplier_concentration: {
          value: pct(view.supplierConcentration),
          delta: compare(view, prior, (item) => item.supplierConcentration, true),
          tone: view.supplierConcentration > 0.45 ? 'watch' : 'neutral',
          scope: 'Largest supplier share of critical SKU spend.',
          formula: 'Top supplier ÷ critical spend',
          limitations: 'High concentration ≠ cheapest-is-safest.',
        },
        kpi_sc_contract_renewal_risk: {
          value: num(view.contractRenewalRisk),
          delta: compare(view, prior, (item) => item.contractRenewalRisk),
          tone: view.contractRenewalRisk > 4 ? 'watch' : 'neutral',
          scope: `Expiring ≤90 days without renewal action · ${view.observationDate}.`,
          formula: 'Contracts at renewal risk',
        },
        kpi_sc_dual_source_coverage: {
          value: pct(view.dualSourceCoverage),
          delta: compare(view, prior, (item) => item.dualSourceCoverage, true),
          tone: high(view.dualSourceCoverage, SC_TARGETS.dualSourceCoverage, 0.08),
          scope: `Critical SKUs with ≥2 approved suppliers of ${num(view.criticalSkus)}.`,
          formula: 'Dual-sourced critical ÷ critical SKUs',
        },
      })}
    >
      <section className="gc-panel span-12">
        <h2>Supplier interpretation limits</h2>
        <p>
          Supplier On-Time Delivery is owned on the Command Center. This screen focuses on fill rate, contract compliance, quality, concentration, and dual-source coverage.
          Do not treat the cheapest supplier as the safest option for clinically critical SKUs.
        </p>
      </section>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Supplier Fill Rate', view.supplierTierRows.map((item) => item.name), [
            { name: 'Fill %', values: view.supplierTierRows.map((item) => Math.round(item.fillRate * 1000) / 10) },
          ], '%', `Overall fill rate ${pct(view.supplierFillRate)}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Contract Compliance', ['Compliant', 'Off-contract'], [
            { name: 'Share', values: rate([view.contractCompliance, 1 - view.contractCompliance]) },
          ], '%', `Contract compliance ${pct(view.contractCompliance)}.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Defective Delivery Rate', ['Defective', 'Accepted'], [
            { name: 'Share', values: rate([view.defectiveDeliveryRate, 1 - view.defectiveDeliveryRate]) },
          ], '%', `Defective delivery ${pct(view.defectiveDeliveryRate)}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Supplier Concentration Exposure', ['Top supplier', 'All others'], [
            { name: 'Share', values: rate([view.supplierConcentration, 1 - view.supplierConcentration]) },
          ], '%', `Concentration ${pct(view.supplierConcentration)} of critical spend.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Contract Renewal Risk', ['At risk', 'Stable proxy'], [
            { name: 'Contracts', values: [view.contractRenewalRisk, Math.max(1, 12 - view.contractRenewalRisk)] },
          ], 'contracts', `Renewal risk count ${num(view.contractRenewalRisk)}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Dual-Source Coverage', ['Dual-sourced', 'Single-source'], [
            { name: 'Share', values: rate([view.dualSourceCoverage, 1 - view.dualSourceCoverage]) },
          ], '%', `Dual-source coverage ${pct(view.dualSourceCoverage)}.`)} />
        </div>
      </div>
      <IndicatorIndex indicators={scIndicatorsFor(view).filter((item) => item.screen === 'Suppliers')} />
    </Page>
  );
}

export function ScConsumptionPage() {
  const view = useView();
  const prior = usePrior();
  return (
    <Page
      title={SC_SCREEN_TITLES.consumption}
      kpis={ribbon('consumption', {
        kpi_sc_clinical_consumption: {
          value: num(view.clinicalConsumption),
          delta: compare(view, prior, (item) => item.clinicalConsumption),
          scope: `Units issued to clinical points of use · ${view.periodLabel}.`,
          formula: 'Clinical issue events (flow)',
          limitations: 'Event flow — not a stock.',
        },
        kpi_sc_consumption_per_encounter: {
          value: num(view.consumptionPerEncounter, 2),
          delta: compare(view, prior, (item) => item.consumptionPerEncounter),
          scope: `${num(view.clinicalConsumption)} units / ${num(view.encounters)} eligible encounters.`,
          formula: 'Issued ÷ eligible encounters',
        },
        kpi_sc_high_variation_categories: {
          value: num(view.highVariationCategories),
          delta: compare(view, prior, (item) => item.highVariationCategories),
          tone: view.highVariationCategories > 4 ? 'watch' : 'neutral',
          scope: 'Categories above illustrative CV threshold.',
          formula: 'High-variation category count',
        },
        kpi_sc_forecast_deviation: {
          value: pct(view.forecastDeviation),
          delta: compare(view, prior, (item) => item.forecastDeviation, true),
          tone: low(view.forecastDeviation, SC_TARGETS.forecastDeviation, 0.05),
          scope: `Actual ${num(view.clinicalConsumption)} vs forecast ${num(view.forecastUnits)}.`,
          formula: '|Actual − forecast| ÷ forecast',
        },
        kpi_sc_replenishment_lead_time: {
          value: `${num(view.replenishmentLeadTime, 1)} d`,
          delta: compare(view, prior, (item) => item.replenishmentLeadTime),
          tone: view.replenishmentLeadTime > 10 ? 'watch' : 'neutral',
          scope: 'Median clinical reorder → available stock.',
          formula: 'Median replenishment lead time',
        },
        kpi_sc_unusual_consumption: {
          value: num(view.unusualConsumption),
          delta: compare(view, prior, (item) => item.unusualConsumption),
          tone: view.unusualConsumption > 8 ? 'watch' : 'neutral',
          scope: `Open signals at ${view.observationDate}.`,
          formula: 'Open unusual consumption signals',
        },
      })}
    >
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Clinical Consumption Trend', view.labels, [
            { name: 'Issued', values: view.monthlyIssued },
          ], 'units', 'Monthly clinical issue flows.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Consumption per Eligible Encounter', ['Units / encounter'], [
            { name: 'Intensity', values: [view.consumptionPerEncounter] },
          ], 'rate', `Per-encounter intensity ${num(view.consumptionPerEncounter, 2)}.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'High-Variation Categories', view.categoryRows.slice(0, view.highVariationCategories + 1).map((item) => item.name), [
            { name: 'Issued', values: view.categoryRows.slice(0, view.highVariationCategories + 1).map((item) => item.issued) },
          ], 'units', `${num(view.highVariationCategories)} categories above the variation threshold.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Forecast Deviation by Category', view.categoryRows.map((item) => item.name), [
            { name: 'Deviation %', values: view.categoryRows.map((item) => Math.round(item.forecastDev * 1000) / 10) },
          ], '%', `Overall forecast deviation ${pct(view.forecastDeviation)}.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Replenishment Lead Time', ['Lead time', '7d guide'], [
            { name: 'Days', values: [view.replenishmentLeadTime, 7] },
          ], 'days', `Median replenishment lead time ${num(view.replenishmentLeadTime, 1)} days.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Unusual Consumption Signals', ['Open signals'], [
            { name: 'Signals', values: [view.unusualConsumption] },
          ], 'signals', `Unusual consumption signals ${num(view.unusualConsumption)}.`)} />
        </div>
      </div>
      <IndicatorIndex indicators={scIndicatorsFor(view).filter((item) => item.screen === 'Consumption')} />
    </Page>
  );
}

export function ScWastePage() {
  const view = useView();
  const prior = usePrior();
  return (
    <Page
      title={SC_SCREEN_TITLES.waste}
      kpis={ribbon('waste', {
        kpi_sc_expired_value: {
          value: sar(view.expiredValue),
          delta: compare(view, prior, (item) => item.expiredValue),
          scope: `${num(view.expiredUnits)} expired units · ${view.periodLabel}.`,
          formula: 'Expired units × unit cost',
          limitations: view.methodology.waste,
        },
        kpi_sc_near_expiry_exposure: {
          value: sar(view.nearExpiryExposure),
          delta: compare(view, prior, (item) => item.nearExpiryExposure),
          tone: view.nearExpiryExposure > 350_000 ? 'watch' : 'neutral',
          scope: `${num(view.nearExpiryUnits)} near-expiry usable units at ${view.observationDate}.`,
          formula: 'Near-expiry usable × unit cost (snapshot)',
        },
        kpi_sc_inventory_waste_rate: {
          value: pct(view.inventoryWasteRate),
          delta: compare(view, prior, (item) => item.inventoryWasteRate, true),
          tone: low(view.inventoryWasteRate, SC_TARGETS.inventoryWasteRate, 0.015),
          scope: `(Expired ${num(view.expiredUnits)} + damaged ${num(view.damagedUnits)} + obsolete ${num(view.obsoleteUnits)}) ÷ issued.`,
          formula: 'Write-off units ÷ issued units',
        },
        kpi_sc_damaged_stock_value: {
          value: sar(view.damagedStockValue),
          delta: compare(view, prior, (item) => item.damagedStockValue),
          scope: `${num(view.damagedUnits)} damaged units — distinct from expired.`,
          formula: 'Damaged units × unit cost',
        },
        kpi_sc_stock_adjustment_exceptions: {
          value: num(view.stockAdjustmentExceptions),
          delta: compare(view, prior, (item) => item.stockAdjustmentExceptions),
          tone: view.stockAdjustmentExceptions > 8 ? 'watch' : 'neutral',
          scope: `Open exceptions at ${view.observationDate}.`,
          formula: 'Open stock adjustment exceptions',
        },
        kpi_sc_avoidable_procurement_exposure: {
          value: sar(view.avoidableProcurementExposure),
          delta: compare(view, prior, (item) => item.avoidableProcurementExposure),
          scope: 'Illustrative avoidable over-buy / duplicate-order exposure.',
          formula: 'Scenario-linked avoidable exposure',
          limitations: view.methodology.optimization,
        },
      })}
    >
      <section className="gc-panel span-12">
        <h2>Disposition discipline</h2>
        <p>
          Expired, near-expiry, damaged, recalled ({num(view.recalledUnits)}), quarantined ({num(view.quarantinedUnits)}),
          obsolete ({num(view.obsoleteUnits)}), and returned ({num(view.returnedUnits)}) are separate. Do not conflate near-expiry exposure with expired write-offs.
        </p>
      </section>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Expired Inventory Value', view.labels, [
            { name: 'Expired units', values: view.monthlyExpired },
          ], 'units', `Period expired value ${sar(view.expiredValue)}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Near-Expiry vs Expired', ['Near-expiry SAR', 'Expired SAR'], [
            { name: 'Value', values: [view.nearExpiryExposure, view.expiredValue] },
          ], 'SAR', 'Near-expiry is a snapshot; expired is a period flow.')} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Inventory Waste Rate', ['Waste rate', 'Target'], [
            { name: 'Rate', values: rate([view.inventoryWasteRate, SC_TARGETS.inventoryWasteRate]) },
          ], '%', `Waste rate ${pct(view.inventoryWasteRate)} vs target ${pct(SC_TARGETS.inventoryWasteRate)}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Damaged Stock Value', ['Damaged SAR'], [
            { name: 'Value', values: [view.damagedStockValue] },
          ], 'SAR', `Damaged stock value ${sar(view.damagedStockValue)}.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Stock Adjustment Exceptions', ['Open exceptions'], [
            { name: 'Exceptions', values: [view.stockAdjustmentExceptions] },
          ], 'count', `Adjustment exceptions ${num(view.stockAdjustmentExceptions)}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Avoidable Procurement Exposure', view.dispositionRows.slice(0, 6).map((item) => item.name), [
            { name: 'Units', values: view.dispositionRows.slice(0, 6).map((item) => item.units) },
          ], 'units', `Avoidable procurement exposure ${sar(view.avoidableProcurementExposure)} (illustrative).`)} />
        </div>
      </div>
      <IndicatorIndex indicators={scIndicatorsFor(view).filter((item) => item.screen === 'Waste')} />
    </Page>
  );
}

const OPP_AXIS: Record<string, string> = {
  'sc-safety-stock': 'Safety stock',
  'sc-lead-time-down': 'Lead time',
  'sc-fill-rate-up': 'Fill rate',
  'sc-consolidate-po': 'PO consolidate',
  'sc-near-expiry-down': 'Near-expiry',
  'sc-critical-replenish': 'Critical replenish',
  'sc-diversify-suppliers': 'Diversify',
  'sc-forecast-error-down': 'Forecast error',
};

export function ScOptimizationPage() {
  const view = useView();
  const prior = usePrior();
  const ranked = [...view.opportunities].sort((a, b) => b.eligibleValue - a.eligibleValue);
  const driverNames = view.opportunities.map((item) => OPP_AXIS[item.id] ?? item.id);
  return (
    <Page
      title={SC_SCREEN_TITLES.optimization}
      kpis={ribbon('optimization', {
        kpi_sc_addressable_stockout_risk: {
          value: num(view.addressableStockoutRisk),
          delta: compare(view, prior, (item) => item.addressableStockoutRisk),
          scope: `Of ${num(view.criticalStockouts)} critical stockouts at observation.`,
          formula: 'Illustrative addressable stockouts',
          limitations: view.methodology.optimization,
        },
        kpi_sc_inventory_opt_opportunity: {
          value: sar(view.inventoryOptOpportunity),
          delta: compare(view, prior, (item) => item.inventoryOptOpportunity),
          scope: 'Illustrative opportunity — never cut clinically critical safety stock solely for cost.',
          formula: 'Modeled inventory opportunity',
          limitations: view.methodology.optimization,
        },
        kpi_sc_expiry_avoidance_opportunity: {
          value: sar(view.expiryAvoidanceOpportunity),
          delta: compare(view, prior, (item) => item.expiryAvoidanceOpportunity),
          scope: 'Illustrative near-expiry / expiry avoidance.',
          formula: 'Modeled expiry avoidance',
        },
        kpi_sc_replenishment_improvement: {
          value: num(view.replenishmentImprovement),
          delta: compare(view, prior, (item) => item.replenishmentImprovement),
          scope: `Of ${num(view.replenishmentExceptions)} replenishment exceptions.`,
          formula: 'Modeled exception reduction',
        },
        kpi_sc_supplier_diversification_ops: {
          value: num(view.supplierDiversificationOps),
          delta: compare(view, prior, (item) => item.supplierDiversificationOps),
          scope: 'Critical SKUs eligible for dual-source diversification. Cheapest ≠ safest.',
          formula: 'Eligible diversification SKUs',
        },
      })}
    >
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Supply Improvement by Driver', driverNames, [
            { name: 'Eligible', values: view.opportunities.map((item) => item.eligibleValue) },
          ], 'units', 'Eight illustrative scenarios. They overlap and must not be summed.')} />
        </div>
        <div className="gc-ed-pack-col">
          <section className="gc-panel gc-insight">
            <h2>Management decisions</h2>
            <div className="gc-exception-list">
              {ranked.slice(0, 3).map((item) => (
                <div key={item.id} className="gc-exception gc-tone-neutral">
                  <strong>{item.title}</strong>
                  <span>{num(item.eligibleValue)} · {item.owner}</span>
                </div>
              ))}
            </div>
            <p className="gc-next">Estimates are illustrative. AI does not place purchase orders, change safety stock, or approve suppliers alone.</p>
          </section>
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Current vs Scenario Stockout Exposure', ['Current stockouts', 'Scenario residual'], [
            { name: 'SKUs', values: [view.criticalStockouts, Math.max(0, view.criticalStockouts - view.addressableStockoutRisk)] },
          ], 'SKUs', 'Scenario residual after illustrative stockout reduction — not measured results.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Expiry Avoidance Opportunity', ['Near-expiry', 'Avoidable (modeled)'], [
            { name: 'SAR', values: [view.nearExpiryExposure, view.expiryAvoidanceOpportunity] },
          ], 'SAR', 'Modeled avoidance is not collected write-off reduction.')} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Inventory Optimization Opportunity', ['Inventory value', 'Opportunity'], [
            { name: 'SAR', values: [view.inventoryValue, view.inventoryOptOpportunity] },
          ], 'SAR', 'Never cut clinically critical safety stock solely for carrying cost.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Feasibility Constraints by Intervention', ranked.slice(0, 5).map((item) => OPP_AXIS[item.id] ?? item.id), [
            { name: 'Eligible', values: ranked.slice(0, 5).map((item) => item.eligibleValue) },
          ], 'units', 'Eligible value is capped by documented assumptions.')} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Management Action Priorities', ranked.map((item) => OPP_AXIS[item.id] ?? item.id), [
            { name: 'Eligible', values: ranked.map((item) => item.eligibleValue) },
          ], 'units', view.methodology.optimization)} />
        </div>
        <div className="gc-ed-pack-col">
          <section className="gc-panel gc-insight">
            <h2>Scenario assumptions</h2>
            <div className="gc-exception-list">
              {ranked.slice(0, 3).map((item) => (
                <div key={item.id} className="gc-exception gc-tone-neutral">
                  <strong>{item.baselineLabel}</strong>
                  <span>{item.assumption}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
      <IndicatorIndex indicators={scIndicatorsFor(view).filter((item) => item.screen === 'Optimization')} />
      <AiIndex />
    </Page>
  );
}
