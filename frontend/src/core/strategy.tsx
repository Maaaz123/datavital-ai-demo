import { useMemo, useState, type ReactNode } from 'react';
import { useShowcase } from '@/showcase/state';
import { alertsFor } from './alerts';
import { stIndicatorsFor, ST_AI_CASES } from './strategyScope';
import {
  ownersForStScreen,
  ST_SCREEN_TITLES,
  type StScreenId,
} from './strategyOwnership';
import { buildStView, stIdentityIssues, ST_TARGETS, type StView } from './strategyView';
import { useCopilot } from './Copilot';
import { usePeriod } from './period';
import { Chart, type Figure } from './viz';

type Detail = { name: string; value: string; definition: string; scope: string; formula?: string; limitations?: string };
type Tone = 'good' | 'watch' | 'alert' | 'neutral';
type View = StView;

function useView(): View {
  const store = useShowcase();
  const { period } = usePeriod();
  return useMemo(() => buildStView(store.hospital, store.year, period), [store.hospital, store.year, period]);
}

function usePrior(): View {
  const store = useShowcase();
  const { period } = usePeriod();
  const year = store.year <= 2024 ? 2024 : store.year - 1;
  return useMemo(() => buildStView(store.hospital, year, period), [store.hospital, year, period]);
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

function ribbon(screen: StScreenId, values: Record<string, RibbonRow>) {
  return ownersForStScreen(screen).map((owner) => {
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
    <section className="gc-panel gc-insight span-12" data-testid="st-disclosure">
      <h2>Data scope</h2>
      <p>
        Synthetic healthcare resource, profitability, and expansion demo data — not live ERP, payroll, or capital ledgers.
        Revenue ≠ profit. Contribution Margin = Recognized Net Revenue − Eligible Direct Costs (CM ≠ net profit; zero revenue → zero contribution).
        Installed ≠ staffed ≠ operational ≠ available ≠ used capacity. Prior-domain operational facts are inputs — Strategy does not recreate bed/OR/appointment primary ownership.
        Cost categories document direct/indirect and fixed/variable; synthetic cost assumptions are not from a real ERP.
        Ten what-if scenarios overlap and must not be summed. Investment outcomes are not claimed as achieved. AI does not approve CapEx, change rosters, or reallocate staff alone.
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
          <p className="gc-kicker">Healthcare Resource, Profitability & Expansion Intelligence</p>
          <h1>{title}</h1>
        </div>
      </header>
      <div className="gc-ribbon" data-testid="st-ribbon">
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
  const digits = unit === '%' || unit === 'days' || unit === 'rate' || unit === 'index' || unit === 'hours' ? 1 : 0;
  return { type, title, categories: axis(categories), series, unit, digits, note, domain: 'strategy', subjects: [title], ...extra };
}

function Alerts({ packed = false }: { packed?: boolean } = {}) {
  const store = useShowcase();
  const copilot = useCopilot();
  const view = useView();
  const { period } = usePeriod();
  const alerts = alertsFor(store.hospital, store.year, period).filter((alert) => alert.department === 'Strategy' && alert.severity !== 'info');
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
              Strategy within management thresholds · open Vital Assist
            </button>
          </li>
        )}
      </ul>
      <p>Alert scope matches the selected reporting period ({view.periodLabel}). Contribution is not net profit.</p>
      <div className="gc-next">
        <button type="button" onClick={() => copilot.setOpen(true)}>Open Vital Assist</button>
      </div>
    </section>
  );
}

function IndicatorIndex({ indicators }: { indicators: ReturnType<typeof stIndicatorsFor> }) {
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
      <p>Illustrative strategy decision support · not CapEx approval and not autonomous rostering</p>
      <div className="gc-exception-list">
        {ST_AI_CASES.map((item) => (
          <div key={item.title} className="gc-exception gc-tone-neutral">
            <strong>{item.title}</strong>
            <span>{item.owner} · follow-up {item.followUp}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function StCommandPage() {
  const view = useView();
  const prior = usePrior();
  const issues = stIdentityIssues(view);
  return (
    <Page
      title={ST_SCREEN_TITLES.command}
      kpis={ribbon('command', {
        kpi_st_operating_contribution: {
          value: sar(view.operatingContribution),
          delta: compare(view, prior, (item) => item.operatingContribution),
          tone: view.operatingContribution > 0 ? 'good' : 'alert',
          scope: `CM = net revenue − eligible direct costs · ${view.periodLabel}.`,
          formula: 'Recognized net revenue − eligible direct costs',
          limitations: view.methodology.contribution,
        },
        kpi_st_resource_utilization_index: {
          value: pct(view.resourceUtilizationIndex),
          delta: compare(view, prior, (item) => item.resourceUtilizationIndex, true),
          tone: high(view.resourceUtilizationIndex, ST_TARGETS.resourceUtilization, 0.05),
          scope: `Composite of staffing, equipment, capacity util · target ≥ ${pct(ST_TARGETS.resourceUtilization)}.`,
          formula: 'Mean of staffing / equipment / capacity utilization',
        },
        kpi_st_capacity_constrained_sl: {
          value: num(view.capacityConstrainedSl),
          delta: compare(view, prior, (item) => item.capacityConstrainedSl),
          tone: view.capacityConstrainedSl > 3 ? 'alert' : view.capacityConstrainedSl > 1 ? 'watch' : 'good',
          scope: `Executive count at ${view.observationDate}.`,
          formula: 'Service lines with demand > available capacity',
        },
        kpi_st_service_line_cm: {
          value: sar(view.serviceLineCm),
          delta: compare(view, prior, (item) => item.serviceLineCm),
          scope: `Aggregate CM · fictional SAR · ${view.periodLabel}. CM ≠ net profit.`,
          formula: 'Aggregate contribution margin',
          limitations: 'Not fully allocated margin.',
        },
        kpi_st_avoidable_resource_cost: {
          value: sar(view.avoidableResourceCost),
          delta: compare(view, prior, (item) => item.avoidableResourceCost),
          tone: 'watch',
          scope: `Illustrative · ${view.periodLabel}.`,
          formula: 'Avoidable overtime + idle equipment + agency',
          limitations: view.methodology.optimization,
        },
        kpi_st_investment_opportunity_coverage: {
          value: pct(view.investmentOpportunityCoverage),
          delta: compare(view, prior, (item) => item.investmentOpportunityCoverage, true),
          scope: `${num(view.candidateExpansionOps)} candidates · ${view.observationDate}.`,
          formula: 'Documented candidates ÷ candidates',
          limitations: view.methodology.expansion,
        },
      })}
    >
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Operating Contribution Trend', view.labels, [
            { name: 'Contribution SAR', values: view.monthlyContribution },
          ], 'SAR', `Monthly contribution. Ledger identities ${issues.length ? `need review (${issues.join(', ')})` : 'reconcile'}. Revenue ≠ profit.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Alerts packed />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Resource Utilization Index', view.labels, [
            { name: 'Capacity util %', values: view.monthlyUtil },
            { name: 'Staffing util %', values: view.monthlyStaffUtil },
          ], '%', `Composite index ${pct(view.resourceUtilizationIndex)}. Installed ≠ staffed ≠ available ≠ used.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Capacity-Constrained Service Lines', (view.capacityConstrainedSl
            ? view.serviceLineRows.filter((row) => row.constrained).map((row) => row.name)
            : ['None']), [
            { name: 'Gap hours', values: view.capacityConstrainedSl ? view.serviceLineRows.filter((row) => row.constrained).map((row) => row.gap) : [0] },
          ], 'hours', `Executive constrained lines ${num(view.capacityConstrainedSl)}.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Contribution Margin Overview', ['Net revenue', 'Direct cost', 'Contribution'], [
            { name: 'SAR', values: [view.netRevenue, view.eligibleDirectCost, view.serviceLineCm] },
          ], 'SAR', `CM rate ${pct(view.slCmRate)}. CM ≠ net profit.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Avoidable Resource Cost Opportunity', ['Avoidable resource', 'Avoidable cost', 'Efficiency opp'], [
            { name: 'SAR', values: [view.avoidableResourceCost, view.avoidableCostOpportunity, view.resourceEfficiencyOpp] },
          ], 'SAR', 'Illustrative overlapping opportunities — do not sum.')} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Investment Opportunity Coverage', ['Candidates', 'Coverage %'], [
            { name: 'Value', values: [view.candidateExpansionOps, Math.round(view.investmentOpportunityCoverage * 100)] },
          ], 'index', `Feasibility ${pct(view.investmentFeasibility)}. Outcomes not claimed as achieved.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <section className="gc-panel gc-insight">
            <h2>Leadership note</h2>
            <p>
              Use specialist pages for workforce economics, equipment productivity, capacity allocation, service-line CM detail, cost drivers, and expansion candidates.
              Priority signals: {num(view.prioritySignals)}. Contribution is not net profit.
            </p>
          </section>
        </div>
      </div>
      <IndicatorIndex indicators={stIndicatorsFor(view).filter((item) => item.screen === 'Command')} />
      <AiIndex />
    </Page>
  );
}

export function StWorkforcePage() {
  const view = useView();
  const prior = usePrior();
  return (
    <Page
      title={ST_SCREEN_TITLES.workforce}
      kpis={ribbon('workforce', {
        kpi_st_productive_clinical_hours: {
          value: num(view.productiveHours),
          delta: compare(view, prior, (item) => item.productiveHours),
          scope: `${view.periodLabel}.`,
          formula: 'Paid clinical hours excluding non-productive paid time',
          limitations: view.methodology.workforce,
        },
        kpi_st_staffing_utilization: {
          value: pct(view.staffingUtilization),
          delta: compare(view, prior, (item) => item.staffingUtilization, true),
          tone: high(view.staffingUtilization, ST_TARGETS.staffingUtilization, 0.05),
          scope: `${num(view.productiveHours)} productive ÷ ${num(view.staffedAvailableHours)} staffed available.`,
          formula: 'Productive ÷ staffed available hours',
        },
        kpi_st_overtime_exposure: {
          value: sar(view.overtimeExposure),
          delta: compare(view, prior, (item) => item.overtimeExposure),
          tone: view.overtimeExposure > view.productiveHours * 10 ? 'watch' : 'neutral',
          scope: `${num(view.overtimeHours)} OT hours · ${view.periodLabel}.`,
          formula: 'Overtime hours × premium',
        },
        kpi_st_agency_staffing_cost: {
          value: sar(view.agencyStaffingCost),
          delta: compare(view, prior, (item) => item.agencyStaffingCost),
          scope: `${num(view.agencyHours)} agency hours.`,
          formula: 'Agency / locum spend',
        },
        kpi_st_staffing_capacity_gap: {
          value: num(view.staffingCapacityGap),
          delta: compare(view, prior, (item) => item.staffingCapacityGap),
          tone: view.staffingCapacityGap > 500 ? 'alert' : view.staffingCapacityGap > 200 ? 'watch' : 'good',
          scope: `Demand − staffed available · ${view.periodLabel}.`,
          formula: 'Demand hours − staffed available hours',
        },
        kpi_st_workforce_allocation_opp: {
          value: num(view.workforceAllocationOpp),
          delta: compare(view, prior, (item) => item.workforceAllocationOpp),
          scope: `Illustrative reallocable hours · ${view.periodLabel}.`,
          formula: 'Redeployable productive hours under credentialing',
          limitations: view.methodology.optimization,
        },
      })}
    >
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Productive Clinical Hours', view.labels, [
            { name: 'Staff util %', values: view.monthlyStaffUtil },
          ], '%', `Period productive hours ${num(view.productiveHours)}. Staffed ≠ installed roster.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Staffing Utilization', ['Productive', 'Staffed available', 'Gap'], [
            { name: 'Hours', values: [view.productiveHours, view.staffedAvailableHours, view.staffingCapacityGap] },
          ], 'hours', `Utilization ${pct(view.staffingUtilization)}.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Overtime Exposure', view.labels, [
            { name: 'Overtime SAR', values: view.monthlyOvertime },
          ], 'SAR', `Period overtime ${sar(view.overtimeExposure)}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Agency Staffing Cost', ['Agency SAR', 'Overtime SAR'], [
            { name: 'SAR', values: [view.agencyStaffingCost, view.overtimeExposure] },
          ], 'SAR', 'Distinct direct workforce cost ledgers.')} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Staffing Capacity Gap', view.serviceLineRows.slice(0, 6).map((row) => row.name), [
            { name: 'Demand hours', values: view.serviceLineRows.slice(0, 6).map((row) => row.demand) },
            { name: 'Capacity hours', values: view.serviceLineRows.slice(0, 6).map((row) => row.capacity) },
          ], 'hours', `Staffing gap ${num(view.staffingCapacityGap)} hours.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Workforce Allocation Opportunity', ['Allocation opp', 'Redeployable capacity'], [
            { name: 'Hours', values: [view.workforceAllocationOpp, view.redeployableCapacity] },
          ], 'hours', 'Illustrative — credentialing constraints remain binding.')} />
        </div>
      </div>
      <IndicatorIndex indicators={stIndicatorsFor(view).filter((item) => item.screen === 'Workforce')} />
    </Page>
  );
}

export function StEquipmentPage() {
  const view = useView();
  const prior = usePrior();
  return (
    <Page
      title={ST_SCREEN_TITLES.equipment}
      kpis={ribbon('equipment', {
        kpi_st_equipment_utilization: {
          value: pct(view.equipmentUtilization),
          delta: compare(view, prior, (item) => item.equipmentUtilization, true),
          tone: high(view.equipmentUtilization, ST_TARGETS.equipmentUtilization, 0.05),
          scope: `Used ${num(view.equipUsedHours)} ÷ available ${num(view.availableOperatingHours)}.`,
          formula: 'Used ÷ available operating hours',
          limitations: view.methodology.equipment,
        },
        kpi_st_available_operating_hours: {
          value: num(view.availableOperatingHours),
          delta: compare(view, prior, (item) => item.availableOperatingHours),
          scope: `Excludes downtime ${num(view.downtimeHours)} h · ${view.periodLabel}.`,
          formula: 'Staffed + maintained available hours',
        },
        kpi_st_asset_downtime_exposure: {
          value: sar(view.assetDowntimeExposure),
          delta: compare(view, prior, (item) => item.assetDowntimeExposure),
          tone: view.assetDowntimeExposure > 200_000 ? 'watch' : 'neutral',
          scope: `${num(view.downtimeHours)} downtime hours.`,
          formula: 'Downtime hours × opportunity cost',
        },
        kpi_st_equipment_cost_per_proc: {
          value: sar(view.equipmentCostPerProc),
          delta: compare(view, prior, (item) => item.equipmentCostPerProc),
          scope: `${num(view.eligibleProcedures)} eligible procedures.`,
          formula: '(Maintenance + depreciation) ÷ procedures',
        },
        kpi_st_maintenance_cost_exposure: {
          value: sar(view.maintenanceCostExposure),
          delta: compare(view, prior, (item) => item.maintenanceCostExposure),
          scope: view.periodLabel,
          formula: 'Planned + unplanned maintenance',
        },
        kpi_st_equipment_capacity_gap: {
          value: num(view.equipmentCapacityGap),
          delta: compare(view, prior, (item) => item.equipmentCapacityGap),
          tone: view.equipmentCapacityGap > 400 ? 'watch' : 'neutral',
          scope: view.periodLabel,
          formula: 'Demand equipment hours − available hours',
        },
      })}
    >
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Equipment Utilization', view.labels, [
            { name: 'Equip util %', values: view.monthlyEquipUtil },
          ], '%', `Period utilization ${pct(view.equipmentUtilization)}. Available ≠ installed calendar hours.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Available Operating Hours', ['Available', 'Used', 'Downtime'], [
            { name: 'Hours', values: [view.availableOperatingHours, view.equipUsedHours, view.downtimeHours] },
          ], 'hours', 'Available excludes downtime and unstaffed slots.')} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Asset Downtime Exposure', ['Downtime exposure', 'Maintenance'], [
            { name: 'SAR', values: [view.assetDowntimeExposure, view.maintenanceCostExposure] },
          ], 'SAR', 'Downtime exposure uses opportunity cost — illustrative.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Equipment Cost per Eligible Procedure', ['Cost / procedure', 'Procedures / 100'], [
            { name: 'Value', values: [view.equipmentCostPerProc, Math.round(view.eligibleProcedures / 100)] },
          ], 'index', `Cost per procedure ${sar(view.equipmentCostPerProc)}.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Maintenance Cost Exposure', view.costRows.filter((row) => row.name === 'Maintenance' || row.name === 'Depreciation').map((row) => row.name), [
            { name: 'SAR', values: view.costRows.filter((row) => row.name === 'Maintenance' || row.name === 'Depreciation').map((row) => row.amount) },
          ], 'SAR', 'Maintenance and depreciation are direct attributable equipment costs.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Equipment Capacity Gap', ['Equip gap', 'Demand-capacity gap'], [
            { name: 'Hours', values: [view.equipmentCapacityGap, view.demandCapacityGap] },
          ], 'hours', 'Equipment gap is a subset pressure within overall demand-capacity.')} />
        </div>
      </div>
      <IndicatorIndex indicators={stIndicatorsFor(view).filter((item) => item.screen === 'Equipment')} />
    </Page>
  );
}

export function StCapacityPage() {
  const view = useView();
  const prior = usePrior();
  return (
    <Page
      title={ST_SCREEN_TITLES.capacity}
      kpis={ribbon('capacity', {
        kpi_st_effective_capacity: {
          value: num(view.effectiveCapacity),
          delta: compare(view, prior, (item) => item.effectiveCapacity),
          scope: `Available after staffing/readiness · ${view.periodLabel}. Installed ${num(view.installedHours)}.`,
          formula: 'Operational available capacity',
          limitations: view.methodology.capacity,
        },
        kpi_st_capacity_utilization: {
          value: pct(view.capacityUtilization),
          delta: compare(view, prior, (item) => item.capacityUtilization, true),
          tone: high(view.capacityUtilization, ST_TARGETS.capacityUtilization, 0.05),
          scope: `Used ${num(view.usedHours)} ÷ available ${num(view.effectiveCapacity)}.`,
          formula: 'Used ÷ effective available',
        },
        kpi_st_demand_capacity_gap: {
          value: num(view.demandCapacityGap),
          delta: compare(view, prior, (item) => item.demandCapacityGap),
          tone: view.demandCapacityGap > 800 ? 'alert' : view.demandCapacityGap > 300 ? 'watch' : 'good',
          scope: `Demand ${num(view.demandHours)} · ${view.periodLabel}.`,
          formula: 'Demand − effective capacity',
        },
        kpi_st_redeployable_capacity: {
          value: num(view.redeployableCapacity),
          delta: compare(view, prior, (item) => item.redeployableCapacity),
          scope: `Unused available · ${view.observationDate}.`,
          formula: 'Unused available capacity eligible for reallocation',
        },
        kpi_st_constrained_service_lines: {
          value: num(view.constrainedServiceLines),
          delta: compare(view, prior, (item) => item.constrainedServiceLines),
          tone: view.constrainedServiceLines > 3 ? 'watch' : 'neutral',
          scope: `Operational count · complements Command executive view.`,
          formula: 'Hard-constrained service lines',
        },
        kpi_st_allocation_opportunity: {
          value: num(view.allocationOpportunity),
          delta: compare(view, prior, (item) => item.allocationOpportunity),
          scope: `Illustrative · ${view.periodLabel}.`,
          formula: 'Reallocable capacity units',
          limitations: view.methodology.optimization,
        },
      })}
    >
      <section className="gc-panel span-12">
        <h2>Capacity layers</h2>
        <p>
          Installed {num(view.installedHours)} → staffed {num(view.staffedHours)} → operational {num(view.operationalHours)} → available {num(view.effectiveCapacity)} → used {num(view.usedHours)}.
          Strategy reads prior-domain operational pressure as input and does not recreate bed/OR/appointment primary ownership totals.
        </p>
      </section>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Effective Capacity', ['Installed', 'Staffed', 'Operational', 'Available', 'Used'], [
            { name: 'Hours', values: [view.installedHours, view.staffedHours, view.operationalHours, view.effectiveCapacity, view.usedHours] },
          ], 'hours', 'Capacity layers are nested — never treat installed as available.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Capacity Utilization', view.labels, [
            { name: 'Util %', values: view.monthlyUtil },
          ], '%', `Period utilization ${pct(view.capacityUtilization)}.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Demand-Capacity Gap', view.serviceLineRows.map((row) => row.name), [
            { name: 'Gap', values: view.serviceLineRows.map((row) => row.gap) },
          ], 'hours', `Total demand-capacity gap ${num(view.demandCapacityGap)}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Redeployable Resource Capacity', ['Redeployable', 'Allocation opp'], [
            { name: 'Hours', values: [view.redeployableCapacity, view.allocationOpportunity] },
          ], 'hours', 'Credentialing and asset constraints remain binding.')} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Constrained Service Lines (Operational)', (view.constrainedServiceLines
            ? view.serviceLineRows.filter((row) => row.constrained).map((row) => row.name)
            : ['None']), [
            { name: 'Demand', values: view.constrainedServiceLines ? view.serviceLineRows.filter((row) => row.constrained).map((row) => row.demand) : [0] },
            { name: 'Capacity', values: view.constrainedServiceLines ? view.serviceLineRows.filter((row) => row.constrained).map((row) => row.capacity) : [0] },
          ], 'hours', `Operational constrained lines ${num(view.constrainedServiceLines)}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Allocation Opportunity', ['Allocation', 'Workforce alloc', 'Reallocation potential'], [
            { name: 'Hours', values: [view.allocationOpportunity, view.workforceAllocationOpp, view.reallocationPotential] },
          ], 'hours', 'Overlapping modeled opportunities — do not sum.')} />
        </div>
      </div>
      <IndicatorIndex indicators={stIndicatorsFor(view).filter((item) => item.screen === 'Capacity')} />
    </Page>
  );
}

export function StServiceLinesPage() {
  const view = useView();
  const prior = usePrior();
  return (
    <Page
      title={ST_SCREEN_TITLES['service-lines']}
      kpis={ribbon('service-lines', {
        kpi_st_net_revenue_by_sl: {
          value: sar(view.netRevenue),
          delta: compare(view, prior, (item) => item.netRevenue),
          scope: `Recognized net revenue · ${view.periodLabel}. Revenue ≠ profit.`,
          formula: 'Sum of service-line recognized net revenue',
          limitations: view.methodology.contribution,
        },
        kpi_st_direct_cost_by_sl: {
          value: sar(view.eligibleDirectCost),
          delta: compare(view, prior, (item) => item.eligibleDirectCost),
          scope: `Eligible direct costs · ${view.periodLabel}.`,
          formula: 'Sum of eligible direct costs',
          limitations: view.methodology.cost,
        },
        kpi_st_sl_cm_rate: {
          value: pct(view.slCmRate),
          delta: compare(view, prior, (item) => item.slCmRate, true),
          tone: high(view.slCmRate, ST_TARGETS.contributionMarginRate, 0.05),
          scope: `Rate view · Command owns SAR CM ${sar(view.serviceLineCm)}.`,
          formula: 'Aggregate CM ÷ recognized net revenue',
          limitations: 'Zero revenue → rate 0. Not fully allocated margin.',
        },
        kpi_st_cost_per_eligible_encounter: {
          value: sar(view.costPerEligibleEncounter),
          delta: compare(view, prior, (item) => item.costPerEligibleEncounter),
          scope: `${num(view.encounters)} eligible encounters.`,
          formula: 'Eligible direct cost ÷ encounters',
        },
        kpi_st_resource_cost_intensity: {
          value: num(view.resourceCostIntensity, 1),
          delta: compare(view, prior, (item) => item.resourceCostIntensity),
          scope: `Direct cost ÷ productive hours.`,
          formula: 'Direct resource cost ÷ productive clinical hours',
        },
        kpi_st_sl_margin_variance: {
          value: sar(view.slMarginVariance),
          delta: compare(view, prior, (item) => item.slMarginVariance),
          tone: view.slMarginVariance < 0 ? 'watch' : 'good',
          scope: `Actual CM − expected at ${pct(ST_TARGETS.contributionMarginRate)} rate.`,
          formula: 'Actual CM − expected CM',
        },
      })}
    >
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Net Revenue by Service Line', view.serviceLineRows.map((row) => row.name), [
            { name: 'Revenue', values: view.serviceLineRows.map((row) => row.revenue) },
          ], 'SAR', `Sum ${sar(view.netRevenue)}. Revenue ≠ profit.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Direct Cost by Service Line', view.serviceLineRows.map((row) => row.name), [
            { name: 'Direct cost', values: view.serviceLineRows.map((row) => row.directCost) },
          ], 'SAR', `Sum ${sar(view.eligibleDirectCost)}. Eligible direct only.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Service-Line Contribution Margin Rate', view.serviceLineRows.map((row) => row.name), [
            { name: 'CM rate %', values: view.serviceLineRows.map((row) => Math.round(row.cmRate * 1000) / 10) },
          ], '%', `Weighted CM rate ${pct(view.slCmRate)}. Command owns aggregate SAR CM.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Cost per Eligible Encounter', ['Cost / encounter', 'Intensity'], [
            { name: 'Value', values: [view.costPerEligibleEncounter, view.resourceCostIntensity] },
          ], 'index', `Cost per encounter ${sar(view.costPerEligibleEncounter)}.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Resource Cost Intensity', view.serviceLineRows.map((row) => row.name), [
            { name: 'Direct / demand', values: view.serviceLineRows.map((row) => Math.round(row.directCost / Math.max(1, row.demand))) },
          ], 'SAR', `Period intensity index ${num(view.resourceCostIntensity, 1)}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Service-Line Margin Variance', ['Actual CM', 'Expected CM', 'Variance'], [
            { name: 'SAR', values: [view.serviceLineCm, Math.round(view.netRevenue * ST_TARGETS.contributionMarginRate), view.slMarginVariance] },
          ], 'SAR', 'Variance is illustrative under published intensity assumptions.')} />
        </div>
      </div>
      <IndicatorIndex indicators={stIndicatorsFor(view).filter((item) => item.screen === 'Service-lines')} />
    </Page>
  );
}

export function StCostEfficiencyPage() {
  const view = useView();
  const prior = usePrior();
  return (
    <Page
      title={ST_SCREEN_TITLES['cost-efficiency']}
      kpis={ribbon('cost-efficiency', {
        kpi_st_total_eligible_op_cost: {
          value: sar(view.totalEligibleOpCost),
          delta: compare(view, prior, (item) => item.totalEligibleOpCost),
          scope: `Eligible OpEx · ${view.periodLabel}. Not fully allocated P&L.`,
          formula: 'Sum of eligible operating cost categories',
          limitations: view.methodology.cost,
        },
        kpi_st_variable_cost_per_activity: {
          value: sar(view.variableCostPerActivity),
          delta: compare(view, prior, (item) => item.variableCostPerActivity),
          scope: `Variable ${sar(view.variableCost)} ÷ encounters.`,
          formula: 'Variable eligible costs ÷ activity',
        },
        kpi_st_fixed_cost_exposure: {
          value: sar(view.fixedCostExposure),
          delta: compare(view, prior, (item) => item.fixedCostExposure),
          scope: view.periodLabel,
          formula: 'Fixed / semi-fixed eligible costs',
        },
        kpi_st_cost_variance: {
          value: sar(view.costVariance),
          delta: compare(view, prior, (item) => item.costVariance),
          tone: view.costVariance > 0 ? 'watch' : 'good',
          scope: `Actual − plan ${sar(view.planCostSar)}.`,
          formula: 'Actual eligible − plan / standard',
        },
        kpi_st_avoidable_cost_opportunity: {
          value: sar(view.avoidableCostOpportunity),
          delta: compare(view, prior, (item) => item.avoidableCostOpportunity),
          scope: `Illustrative · ${view.periodLabel}.`,
          formula: 'Avoidable OT + agency + consumables',
          limitations: view.methodology.optimization,
        },
        kpi_st_resource_efficiency_opp: {
          value: sar(view.resourceEfficiencyOpp),
          delta: compare(view, prior, (item) => item.resourceEfficiencyOpp),
          scope: `Illustrative efficiency · ${view.periodLabel}.`,
          formula: 'Utilization uplift efficiency opportunity',
          limitations: view.methodology.optimization,
        },
      })}
    >
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Total Eligible Operating Cost', view.labels, [
            { name: 'OpEx SAR', values: view.monthlyOpCost },
          ], 'SAR', `Period eligible OpEx ${sar(view.totalEligibleOpCost)}. Synthetic — not real ERP.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Variable Cost per Activity', view.costRows.filter((row) => row.variable).map((row) => row.name), [
            { name: 'SAR', values: view.costRows.filter((row) => row.variable).map((row) => row.amount) },
          ], 'SAR', `Variable cost / activity ${sar(view.variableCostPerActivity)}.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Fixed Cost Exposure', view.costRows.filter((row) => !row.variable).map((row) => row.name), [
            { name: 'SAR', values: view.costRows.filter((row) => !row.variable).map((row) => row.amount) },
          ], 'SAR', `Fixed exposure ${sar(view.fixedCostExposure)}. Direct vs indirect documented.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Cost Variance', ['Actual', 'Plan', 'Variance'], [
            { name: 'SAR', values: [view.totalEligibleOpCost, view.planCostSar, view.costVariance] },
          ], 'SAR', 'Plan variance is illustrative under synthetic standards.')} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Avoidable Cost Opportunity', ['Avoidable cost', 'Avoidable resource', 'Efficiency'], [
            { name: 'SAR', values: [view.avoidableCostOpportunity, view.avoidableResourceCost, view.resourceEfficiencyOpp] },
          ], 'SAR', 'Overlapping — do not sum across screens.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Resource Efficiency Opportunity', view.costRows.map((row) => row.name), [
            { name: 'SAR', values: view.costRows.map((row) => row.amount) },
          ], 'SAR', 'Full cost category mix. Not production ERP extract.')} />
        </div>
      </div>
      <IndicatorIndex indicators={stIndicatorsFor(view).filter((item) => item.screen === 'Cost-efficiency')} />
    </Page>
  );
}

export function StExpansionPage() {
  const view = useView();
  const prior = usePrior();
  return (
    <Page
      title={ST_SCREEN_TITLES.expansion}
      kpis={ribbon('expansion', {
        kpi_st_candidate_expansion_ops: {
          value: num(view.candidateExpansionOps),
          delta: compare(view, prior, (item) => item.candidateExpansionOps),
          scope: `At ${view.observationDate}.`,
          formula: 'Documented expansion / CapEx candidates',
          limitations: view.methodology.expansion,
        },
        kpi_st_estimated_capital_req: {
          value: sar(view.estimatedCapitalReq),
          delta: compare(view, prior, (item) => item.estimatedCapitalReq),
          scope: `Illustrative CapEx · not approved.`,
          formula: 'Sum of candidate CapEx assumptions',
        },
        kpi_st_incremental_opex: {
          value: sar(view.incrementalOpex),
          delta: compare(view, prior, (item) => item.incrementalOpex),
          scope: view.periodLabel,
          formula: 'Illustrative incremental OpEx',
        },
        kpi_st_incremental_contribution: {
          value: sar(view.incrementalContribution),
          delta: compare(view, prior, (item) => item.incrementalContribution),
          scope: `Illustrative CM — not net profit · not achieved.`,
          formula: 'Incremental contribution potential',
          limitations: view.methodology.contribution,
        },
        kpi_st_capacity_benefit: {
          value: num(view.capacityBenefit),
          delta: compare(view, prior, (item) => item.capacityBenefit),
          scope: 'Illustrative incremental effective capacity hours',
          formula: 'Incremental effective capacity',
        },
        kpi_st_investment_feasibility: {
          value: pct(view.investmentFeasibility),
          delta: compare(view, prior, (item) => item.investmentFeasibility, true),
          tone: high(view.investmentFeasibility, ST_TARGETS.investmentFeasibility, 0.1),
          scope: `Share clearing CapEx/OpEx/ramp/CM gates.`,
          formula: 'Candidates clearing feasibility gates',
        },
      })}
    >
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Candidate Expansion Opportunities', ['Candidates', 'Constrained lines'], [
            { name: 'Count', values: [view.candidateExpansionOps, view.capacityConstrainedSl] },
          ], 'count', 'Candidates are illustrative pipeline items — not approved projects.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Estimated Capital Requirement', ['CapEx', 'Incremental OpEx', 'Incremental CM'], [
            { name: 'SAR', values: [view.estimatedCapitalReq, view.incrementalOpex, view.incrementalContribution] },
          ], 'SAR', 'Outcomes not claimed as achieved.')} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Incremental Operating Cost', ['Inc OpEx', 'Avoidable cost'], [
            { name: 'SAR', values: [view.incrementalOpex, view.avoidableCostOpportunity] },
          ], 'SAR', 'Expansion OpEx is distinct from avoidable cost opportunity.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Incremental Contribution Potential', ['Inc contribution', 'Addressable contribution'], [
            { name: 'SAR', values: [view.incrementalContribution, view.addressableContribution] },
          ], 'SAR', 'Do not sum CapEx path with reallocation path for the same bottleneck.')} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Capacity Benefit', ['Capacity benefit', 'Allocation opp', 'Effective capacity / 10'], [
            { name: 'Hours', values: [view.capacityBenefit, view.allocationOpportunity, Math.round(view.effectiveCapacity / 10)] },
          ], 'hours', 'Capacity benefit is modeled incremental available hours.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Investment Feasibility', ['Feasibility %', 'Coverage %', 'Decision readiness %'], [
            { name: 'Rate', values: [Math.round(view.investmentFeasibility * 100), Math.round(view.investmentOpportunityCoverage * 100), Math.round(view.decisionReadiness * 100)] },
          ], '%', 'Investment Feasibility owned here; Optimization uses Scenario Capital Readiness.')} />
        </div>
      </div>
      <IndicatorIndex indicators={stIndicatorsFor(view).filter((item) => item.screen === 'Expansion')} />
    </Page>
  );
}

export function StOptimizationPage() {
  const view = useView();
  const prior = usePrior();
  const copilot = useCopilot();
  return (
    <Page
      title={ST_SCREEN_TITLES.optimization}
      kpis={ribbon('optimization', {
        kpi_st_addressable_contribution: {
          value: sar(view.addressableContribution),
          delta: compare(view, prior, (item) => item.addressableContribution),
          scope: `Illustrative · non-additive · ${view.periodLabel}.`,
          formula: 'Addressable contribution under what-if assumptions',
          limitations: view.methodology.optimization,
        },
        kpi_st_reallocation_potential: {
          value: num(view.reallocationPotential),
          delta: compare(view, prior, (item) => item.reallocationPotential),
          scope: 'Workforce + capacity reallocable hours',
          formula: 'Illustrative reallocable hours without new CapEx',
        },
        kpi_st_scenario_capital_readiness: {
          value: pct(view.scenarioCapitalReadiness),
          delta: compare(view, prior, (item) => item.scenarioCapitalReadiness, true),
          scope: 'Distinct from Expansion Investment Feasibility',
          formula: 'Investment scenarios with complete CapEx/OpEx/ramp docs',
        },
        kpi_st_modeled_operating_impact: {
          value: sar(view.modeledOperatingImpact),
          delta: compare(view, prior, (item) => item.modeledOperatingImpact),
          scope: `Illustrative · ${view.periodLabel}.`,
          formula: 'Modeled operating impact under assumptions',
        },
        kpi_st_decision_readiness: {
          value: pct(view.decisionReadiness),
          delta: compare(view, prior, (item) => item.decisionReadiness, true),
          tone: high(view.decisionReadiness, ST_TARGETS.decisionReadiness, 0.1),
          scope: 'Owner / constraints / sensitivity / opportunity cost documented',
          formula: 'Priority scenarios with decision package complete',
        },
        kpi_st_priority_scenario_coverage: {
          value: pct(view.priorityScenarioCoverage),
          delta: compare(view, prior, (item) => item.priorityScenarioCoverage, true),
          scope: `${view.opportunities.length} documented scenarios.`,
          formula: 'Documented scenarios ÷ required set',
        },
      })}
    >
      <section className="gc-panel span-12">
        <h2>What-if discipline</h2>
        <p>
          Ten scenarios are mutually coherent alternatives for overlapping bottlenecks — do not sum benefits.
          Each documents baseline capacity/demand, constraints, CapEx/OpEx, workforce, ramp-up, revenue assumptions, direct cost, contribution impact, sensitivity, opportunity cost, and decision owner.
          Investment outcomes are not claimed as achieved. Open Vital Assist to explore a scenario.
        </p>
        <div className="gc-next">
          <button type="button" onClick={() => copilot.setOpen(true)}>Open Vital Assist</button>
        </div>
      </section>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Addressable Contribution Opportunity', view.opportunities.slice(0, 6).map((item) => item.title.split(' ').slice(0, 3).join(' ')), [
            { name: 'Eligible', values: view.opportunities.slice(0, 6).map((item) => Math.round(item.eligibleValue)) },
          ], 'index', 'Illustrative eligible values — overlapping; do not sum.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Reallocation Potential', ['Reallocation', 'Workforce alloc', 'Capacity alloc'], [
            { name: 'Hours', values: [view.reallocationPotential, view.workforceAllocationOpp, view.allocationOpportunity] },
          ], 'hours', 'Reallocation vs CapEx for the same bottleneck are alternatives.')} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Scenario Capital Readiness', ['Capital readiness %', 'Investment feasibility %', 'Decision readiness %'], [
            { name: 'Rate', values: [Math.round(view.scenarioCapitalReadiness * 100), Math.round(view.investmentFeasibility * 100), Math.round(view.decisionReadiness * 100)] },
          ], '%', 'Scenario Capital Readiness ≠ Expansion Investment Feasibility.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Modeled Operating Impact', ['Modeled impact', 'Addressable CM', 'Avoidable cost'], [
            { name: 'SAR', values: [view.modeledOperatingImpact, view.addressableContribution, view.avoidableCostOpportunity] },
          ], 'SAR', 'Modeled figures are illustrative under documented assumptions.')} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Decision Readiness', view.opportunities.map((item) => item.id.replace('st-', '')), [
            { name: 'Documented', values: view.opportunities.map(() => 1) },
          ], 'count', `Decision readiness ${pct(view.decisionReadiness)}. Each scenario has a named owner.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Priority Scenario Coverage', ['Coverage %', 'Scenarios'], [
            { name: 'Value', values: [Math.round(view.priorityScenarioCoverage * 100), view.opportunities.length] },
          ], 'index', 'Required set = 10 documented what-if scenarios.')} />
        </div>
      </div>
      <section className="gc-panel span-12">
        <h2>Scenario catalog</h2>
        <div className="gc-exception-list">
          {view.opportunities.map((item) => (
            <article key={item.id} className="gc-exception gc-tone-neutral">
              <strong>{item.title}</strong>
              <span>
                Owner {item.owner} · baseline {item.baselineLabel}: {num(item.baseline, item.baselineUnit === 'rate' ? 2 : 0)}
                · CapEx {item.capex} · OpEx {item.opex} · ramp {item.ramp}
                · {item.assumption}
              </span>
            </article>
          ))}
        </div>
      </section>
      <IndicatorIndex indicators={stIndicatorsFor(view).filter((item) => item.screen === 'Optimization')} />
      <AiIndex />
    </Page>
  );
}
