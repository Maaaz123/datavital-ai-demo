/**
 * Enterprise Executive Dashboard + Hospital Command Center.
 * Same Page / ribbon / pack pattern as Quality & RCM — lean leadership view only.
 * Additive cross-domain integration — reads canonical domain facts only.
 */
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useShowcase } from '@/showcase/state';
import { useCopilot } from './Copilot';
import { usePeriod } from './period';
import { Chart, type Figure } from './viz';
import {
  buildEnterpriseView,
  ENTERPRISE_DISCLAIMER,
  type EnterprisePriority,
  type EnterpriseSeverity,
  type EnterpriseView,
  type OpsException,
} from './enterpriseView';

type Detail = { name: string; value: string; definition: string; scope: string; formula?: string; limitations?: string };
type Tone = 'good' | 'watch' | 'alert' | 'neutral';
type View = EnterpriseView;

function useView(): View {
  const store = useShowcase();
  const { period } = usePeriod();
  return useMemo(
    () => buildEnterpriseView(store.hospital, store.year, period),
    [store.hospital, store.year, period],
  );
}

function usePrior(): View {
  const store = useShowcase();
  const { period } = usePeriod();
  const year = store.year <= 2024 ? 2024 : store.year - 1;
  return useMemo(
    () => buildEnterpriseView(store.hospital, year, period),
    [store.hospital, year, period],
  );
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function num(value: number, digits = 0): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function sar(value: number): string {
  return `SAR ${Math.round(value).toLocaleString('en-US')}`;
}

function rate1k(value: number): string {
  return `${num(value, 1)} /1k`;
}

function toneFrom(severity: EnterpriseSeverity): Tone {
  if (severity === 'critical') return 'alert';
  if (severity === 'warning') return 'watch';
  if (severity === 'healthy') return 'good';
  return 'neutral';
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

function Disclosure() {
  return (
    <section className="gc-panel gc-insight span-12" data-testid="enterprise-disclosure">
      <h2>Data scope</h2>
      <p>
        {ENTERPRISE_DISCLAIMER} Every figure is read from a domain canonical view — no independent fabricated totals.
        Contribution ≠ net profit. AI does not approve clinical or financial actions.
      </p>
    </section>
  );
}

function Page({
  title,
  kicker,
  testId,
  ribbonTestId,
  kpis,
  children,
}: {
  title: string;
  kicker: string;
  testId: string;
  ribbonTestId: string;
  kpis: { name: string; value: string; delta: string; tone?: Tone; testId?: string; detail: Detail }[];
  children: ReactNode;
}) {
  const [open, setOpen] = useState<Detail | null>(null);
  return (
    <article className="gc-command gc-ed" data-testid={testId}>
      <header className="gc-command-head">
        <div>
          <p className="gc-kicker">{kicker}</p>
          <h1>{title}</h1>
        </div>
      </header>
      <div className="gc-ribbon" data-testid={ribbonTestId}>
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

function Slot({ figure }: { figure: Figure }) {
  const copilot = useCopilot();
  return (
    <section className="gc-panel gc-slot">
      <Chart
        figure={figure}
        compact
        action={(
          <button
            type="button"
            className="gc-investigate"
            aria-label={`Investigate ${figure.title}`}
            onClick={() => copilot.focusChart(figure.title)}
          >
            Investigate
          </button>
        )}
      />
    </section>
  );
}

function fig(
  type: Figure['type'],
  title: string,
  categories: string[],
  series: Figure['series'],
  unit: string,
  note: string,
): Figure {
  const digits = unit === '%' || unit === 'rate' || unit === 'index' || unit === '/1k' || unit === 'min' ? 1 : 0;
  return {
    type,
    title,
    categories,
    series,
    unit,
    digits,
    note,
    domain: 'enterprise',
    subjects: [title],
  };
}

function shortIssue(issue: string): string {
  const cut = issue.split(/[—–-]/)[0]?.trim() ?? issue;
  return cut.length > 64 ? `${cut.slice(0, 61)}…` : cut;
}

function shortDomain(domain: string): string {
  const map: Record<string, string> = {
    'Beds & Capacity': 'Beds',
    'Revenue Cycle': 'RCM',
    'Quality & Safety': 'Quality',
    'Supply Chain': 'Supply',
    'Patient Experience': 'PX',
  };
  return map[domain] ?? domain.split(/\s+/)[0] ?? domain;
}

function alertSeverity(severity: EnterprisePriority['severity'] | EnterpriseSeverity): 'critical' | 'high' | 'medium' {
  if (severity === 'critical') return 'critical';
  if (severity === 'warning') return 'high';
  return 'medium';
}

function AiCta({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="gc-ai-cta" onClick={onClick}>
      <span className="gc-ai-orb" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M4 20l7.2-7.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M12.8 5.2l1.4 3.4 3.4 1.4-3.4 1.4-1.4 3.4-1.4-3.4-3.4-1.4 3.4-1.4z" fill="currentColor" />
          <path d="M19 4l.7 1.7L21.4 6.4 19.7 7.1 19 8.8l-.7-1.7L16.6 6.4l1.7-.7z" fill="currentColor" />
        </svg>
      </span>
      Open Vital Assist
    </button>
  );
}

function Alerts({ items }: { items: EnterprisePriority[] }) {
  const copilot = useCopilot();
  const view = useView();
  const top = items.slice(0, 5);
  const lead = top[0];
  return (
    <section className="gc-panel gc-insight" data-testid="enterprise-priorities">
      <h2>Priority signals</h2>
      <ul className="gc-alert-list">
        {top.length ? top.map((item) => (
          <li key={item.id}>
            <button type="button" data-testid={`priority-${item.id}`} onClick={() => copilot.setOpen(true)}>
              <span className={`gc-sev gc-sev-${alertSeverity(item.severity)}`}>{item.severity}</span>
              {shortIssue(item.issue)} · {item.metricValue}
              <em className="gc-alert-scope"> · {item.sourceDomain}</em>
            </button>
          </li>
        )) : (
          <li>
            <button type="button" onClick={() => copilot.setOpen(true)}>
              <span className="gc-sev gc-sev-medium">review</span>
              Hospital within management thresholds · open Vital Assist
            </button>
          </li>
        )}
      </ul>
      <p>Alert scope matches the selected reporting period ({view.periodLabel}).</p>
      <div className="gc-next">
        <h2>Management action</h2>
        <p>
          {lead
            ? `Review ${shortIssue(lead.issue).toLowerCase()} (${lead.metricValue}) with ${shortDomain(lead.sourceDomain)} for ${view.periodLabel}.`
            : `Review hospital priorities for ${view.hospital} · ${view.periodLabel}.`}
        </p>
        <AiCta onClick={() => copilot.setOpen(true)} />
        {lead ? (
          <Link to={lead.href} className="gc-text-btn">Open the decision review</Link>
        ) : (
          <p>No open enterprise priority for this hospital and period.</p>
        )}
      </div>
    </section>
  );
}

function IndicatorIndex({ view }: { view: View }) {
  const picks = [
    view.signals.find((s) => s.id === 'ent_operational_occupancy'),
    view.signals.find((s) => s.id === 'ent_financial_npr'),
    view.signals.find((s) => s.id === 'ent_experience_sat'),
    view.signals.find((s) => s.id === 'ent_quality_compliance'),
    view.signals.find((s) => s.id === 'ent_safety_events'),
    view.signals.find((s) => s.id === 'ent_capacity_ed_wait'),
  ].filter(Boolean);
  return (
    <section className="gc-panel span-12">
      <h2>Performance indicators</h2>
      <p>Headline numbers stay in the KPI ribbon above. Open the owning domain for detail.</p>
      <div className="gc-exception-list">
        {picks.map((item) => item && (
          <article key={item.id} className="gc-exception gc-tone-neutral">
            <strong>{item.label}</strong>
            <span>{item.display} · {item.sourceDomain}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function executiveRibbon(view: View, prior: View) {
  const f = view.facts;
  const signal = (id: string) => view.signals.find((s) => s.id === id);
  const occ = signal('ent_operational_occupancy');
  const npr = signal('ent_financial_npr');
  const sat = signal('ent_experience_sat');
  const qc = signal('ent_quality_compliance');
  const safety = signal('ent_safety_events');
  const ed = signal('ent_capacity_ed_wait');
  return [
    score('Occupancy', pct(f.occupancy), compare(view, prior, (v) => v.facts.occupancy, true), 'Bed occupancy', 'Beds census occupied ÷ staffed', `${view.hospital} · ${view.periodLabel}`, {
      formula: occ?.formula,
      limitations: occ?.limitation,
      testId: 'value-ent_operational_occupancy',
      tone: toneFrom(occ?.severity ?? 'info'),
    }),
    score('Net revenue', sar(f.netPatientRevenue), compare(view, prior, (v) => v.facts.netPatientRevenue), 'Net patient revenue', 'RCM recognized net patient revenue', `${view.hospital} · ${view.periodLabel}`, {
      formula: npr?.formula,
      limitations: npr?.limitation,
      testId: 'value-ent_financial_npr',
      tone: toneFrom(npr?.severity ?? 'info'),
    }),
    score('Satisfaction', `${f.overallSatisfaction.toFixed(1)} / 10`, compare(view, prior, (v) => v.facts.overallSatisfaction), 'Overall satisfaction', 'Patient Experience survey mean', `${view.hospital} · ${view.periodLabel}`, {
      formula: sat?.formula,
      limitations: sat?.limitation,
      testId: 'value-ent_experience_sat',
      tone: toneFrom(sat?.severity ?? 'info'),
    }),
    score('Quality', pct(f.qualityCompliance), compare(view, prior, (v) => v.facts.qualityCompliance, true), 'Quality measure compliance', 'QS process compliance rate', `${view.hospital} · ${view.periodLabel}`, {
      formula: qc?.formula,
      limitations: qc?.limitation,
      testId: 'value-ent_quality_compliance',
      tone: toneFrom(qc?.severity ?? 'info'),
    }),
    score('Safety', rate1k(f.validatedEventRate), compare(view, prior, (v) => v.facts.validatedEventRate), 'Validated event rate', 'QS validated events per 1,000 discharges', `${view.hospital} · ${view.periodLabel}`, {
      formula: safety?.formula,
      limitations: safety?.limitation,
      testId: 'value-ent_safety_events',
      tone: toneFrom(safety?.severity ?? 'info'),
    }),
    score('ED wait', `${num(f.edWaitMedianMin, 1)} min`, compare(view, prior, (v) => v.facts.edWaitMedianMin), 'ED door-to-provider (median)', 'Emergency median wait minutes', `${view.hospital} · ${view.periodLabel}`, {
      formula: ed?.formula,
      limitations: ed?.limitation,
      testId: 'value-ent_capacity_ed_wait',
      tone: toneFrom(ed?.severity ?? 'info'),
    }),
  ];
}

export function ExecutiveDashboardPage() {
  const view = useView();
  const prior = usePrior();
  const f = view.facts;

  const systemPulse = fig(
    'bars',
    'Hospital system pulse',
    ['Occupancy', 'Denial', 'Quality', 'Satisfaction'],
    [{
      name: 'Index',
      values: [
        Math.round(f.occupancy * 1000) / 10,
        Math.round(f.grossDenialRate * 1000) / 10,
        Math.round(f.qualityCompliance * 1000) / 10,
        Math.round(f.overallSatisfaction * 10),
      ],
    }],
    '%',
    'Leadership snapshot across capacity, revenue integrity, quality, and experience — not a composite score. Satisfaction shown ×10 for scale.',
  );

  const occupancyTrend = fig(
    'line',
    'Bed occupancy trend',
    f.labels,
    [{ name: 'Occupancy %', values: f.monthlyOccupancy.map((v) => Math.round(v * 1000) / 10) }],
    '%',
    'Beds domain census stocks — period-scoped reporting, not live telemetry.',
  );

  const contributionTrend = f.monthlyContribution.length > 0
    ? fig(
      'line',
      'Operating contribution',
      f.contributionLabels.length ? f.contributionLabels : f.labels,
      [{ name: 'Contribution SAR', values: f.monthlyContribution }],
      'SAR',
      'Strategy operating contribution — contribution ≠ net profit.',
    )
    : fig(
      'bars',
      'Revenue context',
      ['Net revenue', 'Contribution'],
      [{ name: 'SAR', values: [f.netPatientRevenue, f.operatingContribution] }],
      'SAR',
      'RCM NPR and Strategy contribution from domain views.',
    );

  return (
    <Page
      kicker="Enterprise · CEO / CFO / Board"
      title="Executive Dashboard"
      testId="executive-dashboard"
      ribbonTestId="enterprise-ribbon"
      kpis={executiveRibbon(view, prior)}
    >
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot figure={systemPulse} />
        </div>
        <div className="gc-ed-pack-col">
          <Alerts items={view.priorities} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot figure={occupancyTrend} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot figure={contributionTrend} />
        </div>
      </div>
      <section className="gc-panel span-12">
        <h2>Leadership note</h2>
        <p>
          Hospital-as-a-system view for {view.hospital} · {view.periodLabel}. Escalate only the priority signals above;
          operational detail and deep analysis live on the owning domain screens.
        </p>
      </section>
      <IndicatorIndex view={view} />
    </Page>
  );
}

function ExceptionAlerts({ items }: { items: OpsException[] }) {
  const copilot = useCopilot();
  const view = useView();
  const top = items.slice(0, 8);
  const lead = top[0];
  return (
    <section className="gc-panel gc-insight" data-testid="ops-exceptions">
      <h2>Priority signals</h2>
      <ul className="gc-alert-list">
        {top.length ? top.map((item) => (
          <li key={item.id}>
            <Link to={item.href} data-testid={`ops-${item.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
              <span className={`gc-sev gc-sev-${alertSeverity(item.severity)}`}>{item.severity}</span>
              {item.area} · {item.signal}
              <em className="gc-alert-scope"> · {item.owner}</em>
            </Link>
          </li>
        )) : (
          <li>
            <button type="button" onClick={() => copilot.setOpen(true)}>
              <span className="gc-sev gc-sev-medium">review</span>
              Operations within management thresholds · open Vital Assist
            </button>
          </li>
        )}
      </ul>
      <p>Alert scope matches the selected reporting period ({view.periodLabel}).</p>
      <div className="gc-next">
        <h2>Management action</h2>
        <p>
          {lead
            ? `Review ${lead.area.toLowerCase()} (${lead.signal}) with ${lead.owner} for ${view.periodLabel}.`
            : `Review operations exceptions for ${view.hospital} · ${view.periodLabel}.`}
        </p>
        <AiCta onClick={() => copilot.setOpen(true)} />
        {lead ? (
          <Link to={lead.href} className="gc-text-btn">Open the decision review</Link>
        ) : (
          <p>No open operations exception for this hospital and period.</p>
        )}
      </div>
    </section>
  );
}

function commandRibbon(view: View) {
  const f = view.facts;
  const tone = (id: string): Tone => {
    const ex = view.opsExceptions.find((item) => item.id === id);
    return ex ? toneFrom(ex.severity) : 'neutral';
  };
  return [
    score('Bed pressure', pct(f.occupancy), `${num(f.availableBeds)} available`, 'Bed pressure', 'Beds occupancy', view.periodLabel, {
      testId: 'value-cmd-beds',
      tone: tone('ops-beds'),
    }),
    score('ED wait', `${num(f.edWaitMedianMin, 1)} min`, `${num(f.edArrivals)} arrivals`, 'ED wait', 'Emergency median wait', view.periodLabel, {
      testId: 'value-cmd-ed',
      tone: tone('ops-ed'),
    }),
    score('Theatre', pct(f.orUtilization), `Cancel ${pct(f.cancellationRate)}`, 'Theatre utilization', 'Surgery OR utilization', view.periodLabel, {
      testId: 'value-cmd-or',
      tone: tone('ops-theatre'),
    }),
    score('ICU', pct(f.icuOccupancy), `Gap ${num(f.icuStaffingGapHours)} h`, 'ICU occupancy', 'ICU capacity / staffing', view.periodLabel, {
      testId: 'value-cmd-icu',
      tone: tone('ops-icu'),
    }),
    score('Supply', String(f.criticalStockouts), `Avail ${pct(f.supplyAvailability)}`, 'Critical stockouts', 'Supply Chain critical stockouts', view.periodLabel, {
      testId: 'value-cmd-supply',
      tone: tone('ops-supply'),
    }),
    score('QS overdue', String(f.overdueHighRiskActions), `${rate1k(f.validatedEventRate)} events`, 'Overdue high-risk actions', 'Quality & Safety CAPA stock', view.periodLabel, {
      testId: 'value-cmd-qs',
      tone: tone('ops-qs'),
    }),
  ];
}

export function HospitalCommandPage() {
  const view = useView();
  const f = view.facts;

  const opsChart = fig(
    'line',
    'Bed occupancy (ops)',
    f.labels,
    [{ name: 'Occupancy %', values: f.monthlyOccupancy.map((v) => Math.round(v * 1000) / 10) }],
    '%',
    'Beds domain occupancy — period-scoped synthetic reporting, not live telemetry.',
  );

  const flowPressure = fig(
    'bars',
    'Flow & capacity pressure',
    ['ED wait', 'OPD wait', 'ICU occ.', 'OR util'],
    [{
      name: 'Value',
      values: [
        Math.round(f.edWaitMedianMin * 10) / 10,
        Math.round(f.opdWaitMedian * 10) / 10,
        Math.round(f.icuOccupancy * 1000) / 10,
        Math.round(f.orUtilization * 1000) / 10,
      ],
    }],
    'mixed',
    'ED/OPD in minutes; ICU/OR as %. Cross-domain ops snapshot — open owning screens for detail.',
  );

  return (
    <Page
      kicker="Enterprise · COO / Operations"
      title="Hospital Command Center"
      testId="command-center"
      ribbonTestId="command-center-ribbon"
      kpis={commandRibbon(view)}
    >
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot figure={opsChart} />
        </div>
        <div className="gc-ed-pack-col">
          <ExceptionAlerts items={view.opsExceptions} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot figure={flowPressure} />
        </div>
        <div className="gc-ed-pack-col">
          <section className="gc-panel">
            <h2>Leadership note</h2>
            <p>
              Use specialist domain screens for theatre, ICU, lab, imaging, and supply detail.
              This command view surfaces operations attention only for {view.hospital} · {view.periodLabel}.
            </p>
          </section>
        </div>
      </div>
    </Page>
  );
}
