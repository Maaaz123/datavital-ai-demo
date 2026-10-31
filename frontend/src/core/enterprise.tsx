/**
 * Enterprise Executive Dashboard + Hospital Command Center.
 * Additive cross-domain integration — reads canonical domain facts only.
 * Not a redesign of Domains 1–15 screens.
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
  type EnterpriseSignal,
  type OpsException,
} from './enterpriseView';

type SignalDetail = {
  name: string;
  value: string;
  definition: string;
  scope: string;
  formula?: string;
  limitations?: string;
  href: string;
};

function useView() {
  const store = useShowcase();
  const { period } = usePeriod();
  return useMemo(
    () => buildEnterpriseView(store.hospital, store.year, period),
    [store.hospital, store.year, period],
  );
}

function toneClass(severity: EnterpriseSeverity): string {
  if (severity === 'critical') return 'gc-tone-alert';
  if (severity === 'warning') return 'gc-tone-watch';
  if (severity === 'healthy') return 'gc-tone-good';
  return 'gc-tone-neutral';
}

function fig(
  type: Figure['type'],
  title: string,
  categories: string[],
  series: Figure['series'],
  unit: string,
  note: string,
): Figure {
  const digits = unit === '%' || unit === 'rate' || unit === 'index' ? 1 : 0;
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

function Slot({ figure, span = false }: { figure: Figure; span?: string | false }) {
  const copilot = useCopilot();
  return (
    <section className={`gc-panel gc-slot${span ? ` ${span}` : ''}`}>
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

function PageShell({
  kicker,
  title,
  testId,
  children,
}: {
  kicker: string;
  title: string;
  testId: string;
  children: ReactNode;
}) {
  const view = useView();
  return (
    <article className="gc-command gc-ed" data-testid={testId}>
      <header className="gc-command-head">
        <div>
          <p className="gc-kicker">{kicker}</p>
          <h1>{title}</h1>
        </div>
        <p>{view.hospital} · {view.periodLabel}</p>
      </header>
      <div className="gc-dense gc-ed-body">
        {children}
        <Disclosure />
      </div>
    </article>
  );
}

function SignalRibbon({ signals }: { signals: EnterpriseSignal[] }) {
  const [open, setOpen] = useState<SignalDetail | null>(null);
  const categoryOrder = [
    'operational',
    'financial',
    'experience',
    'quality',
    'safety',
    'capacity',
    'efficiency',
    'strategy',
  ] as const;
  const picked = categoryOrder
    .map((category) => signals.find((signal) => signal.category === category))
    .filter((signal): signal is EnterpriseSignal => Boolean(signal))
    .slice(0, 6);

  return (
    <>
      <div className="gc-ribbon" data-testid="enterprise-ribbon">
        {picked.map((signal, index) => (
          <button
            type="button"
            key={signal.id}
            className={`gc-score ${toneClass(signal.severity)}`}
            data-testid={`value-${signal.id}`}
            style={{ animationDelay: `${index * 40}ms` }}
            title={`${signal.formula} · Source: ${signal.sourceDomain}. ${signal.limitation}`}
            onClick={() => setOpen({
              name: signal.label,
              value: signal.display,
              definition: `${signal.sourceDomain} · ${signal.category}`,
              scope: signal.limitation,
              formula: signal.formula,
              limitations: `Source route: ${signal.sourceRoute}`,
              href: signal.sourceRoute,
            })}
          >
            <span>{signal.label}</span>
            <strong className="gc-ltr">{signal.display}</strong>
            <em>{signal.sourceDomain}</em>
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
          <div className="gc-next" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link to={open.href} className="gc-btn">Open source domain</Link>
            <button type="button" className="gc-text-btn" onClick={() => setOpen(null)}>Close detail</button>
          </div>
        </section>
      ) : null}
    </>
  );
}

function PriorityList({ items }: { items: EnterprisePriority[] }) {
  const copilot = useCopilot();
  const top = items.slice(0, 5);
  return (
    <section className="gc-panel gc-insight" data-testid="enterprise-priorities">
      <h2>Priority signals</h2>
      <ul className="gc-alert-list">
        {top.map((item) => (
          <li key={item.id}>
            <div className="gc-exception" data-testid={`priority-${item.id}`}>
              <span className={`gc-sev gc-sev-${item.severity === 'critical' ? 'critical' : 'medium'}`}>{item.severity}</span>
              <strong>{shortIssue(item.issue)}</strong>
              <span>{item.metricLabel}: {item.metricValue}</span>
              <p>{shortEvidence(item.evidence)}</p>
              <div className="gc-next" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link to={item.href} className="gc-btn">Open {shortDomain(item.sourceDomain)}</Link>
                <button type="button" className="gc-investigate" onClick={() => copilot.setOpen(true)}>
                  Investigate
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function shortIssue(issue: string): string {
  const cut = issue.split(/[—–-]/)[0]?.trim() ?? issue;
  return cut.length > 72 ? `${cut.slice(0, 69)}…` : cut;
}

function shortEvidence(evidence: string): string {
  const one = evidence.split(/[.\n]/)[0]?.trim() ?? evidence;
  return one.length > 110 ? `${one.slice(0, 107)}…` : one;
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

function ConditionChips({ signals }: { signals: EnterpriseSignal[] }) {
  const categories = [
    { key: 'operational', title: 'Ops' },
    { key: 'financial', title: 'Finance' },
    { key: 'experience', title: 'PX' },
    { key: 'quality', title: 'Quality' },
    { key: 'safety', title: 'Safety' },
    { key: 'capacity', title: 'Capacity' },
    { key: 'efficiency', title: 'Efficiency' },
    { key: 'strategy', title: 'Strategy' },
  ] as const;

  return (
    <section className="gc-panel span-12" data-testid="executive-condition">
      <h2>Hospital condition</h2>
      <div className="gc-exception-list" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {categories.map((category) => {
          const signal = signals.find((item) => item.category === category.key);
          if (!signal) return null;
          return (
            <Link
              key={category.key}
              to={signal.sourceRoute}
              className={`gc-exception ${toneClass(signal.severity)}`}
              style={{ textDecoration: 'none', minWidth: 120, flex: '0 1 auto' }}
              title={signal.limitation}
            >
              <strong>{category.title}</strong>
              <span>{signal.display}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function LeadershipInsight({ priorities }: { priorities: EnterprisePriority[] }) {
  const lead = priorities[0];
  if (!lead) {
    return (
      <section className="gc-panel gc-insight">
        <h2>Leadership focus</h2>
        <p>No threshold priorities for this period — continue monitoring domain command centers.</p>
      </section>
    );
  }
  return (
    <section className="gc-panel gc-insight">
      <h2>Leadership focus</h2>
      <p className={`gc-sev gc-sev-${lead.severity === 'critical' ? 'critical' : 'medium'}`}>{lead.severity}</p>
      <h3>{shortIssue(lead.issue)}</h3>
      <p>{lead.metricLabel}: {lead.metricValue} · {lead.sourceDomain}</p>
      <p>{shortEvidence(lead.evidence)}</p>
      <div className="gc-next">
        <Link to={lead.href} className="gc-btn">Open {shortDomain(lead.sourceDomain)}</Link>
      </div>
    </section>
  );
}

export function ExecutiveDashboardPage() {
  const view = useView();
  const f = view.facts;
  const occupancyFigure = fig(
    'line',
    'Bed occupancy trend',
    f.labels,
    [{ name: 'Occupancy %', values: f.monthlyOccupancy.map((v) => Math.round(v * 1000) / 10) }],
    '%',
    'Derived from Beds census stocks — not an independently fabricated executive series.',
  );
  const contributionFigure = f.monthlyContribution.length > 0
    ? fig(
      'line',
      'Operating contribution (Strategy)',
      f.contributionLabels.length ? f.contributionLabels : f.labels,
      [{ name: 'Contribution SAR', values: f.monthlyContribution }],
      'SAR',
      'Strategy operating contribution by month — contribution ≠ net profit. Synthetic cost model.',
    )
    : fig(
      'bars',
      'Revenue & contribution context',
      ['Net patient revenue', 'Operating contribution', 'Addressable'],
      [{
        name: 'SAR',
        values: [f.netPatientRevenue, f.operatingContribution, f.addressableContribution],
      }],
      'SAR',
      'RCM NPR and Strategy contribution context from domain views. Contribution ≠ net profit.',
    );

  return (
    <PageShell
      kicker="Enterprise · CEO / CFO / Board"
      title="Executive Dashboard"
      testId="executive-dashboard"
    >
      <SignalRibbon signals={view.signals} />
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <PriorityList items={view.priorities} />
        </div>
        <div className="gc-ed-pack-col">
          <LeadershipInsight priorities={view.priorities} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot figure={occupancyFigure} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot figure={contributionFigure} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <section className="gc-panel">
            <h2>Leadership note</h2>
            <p>
              Cross-domain snapshot for {view.hospital} · {view.periodLabel}. Escalate only evidence-linked priorities;
              deep analysis stays on owning domain screens.
            </p>
            <div className="gc-next" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link to="/command" className="gc-btn">Command</Link>
              <Link to="/strategy" className="gc-text-btn">Strategy</Link>
              <Link to="/quality" className="gc-text-btn">Quality</Link>
              <Link to="/supply-chain" className="gc-text-btn">Supply</Link>
            </div>
          </section>
        </div>
        <div className="gc-ed-pack-col">
          <ConditionChips signals={view.signals} />
        </div>
      </div>
    </PageShell>
  );
}

function ExceptionBoard({ items }: { items: OpsException[] }) {
  if (items.length === 0) {
    return (
      <section className="gc-panel" data-testid="ops-exceptions">
        <h2>Actionable exceptions</h2>
        <p>No threshold exceptions for the selected hospital and period.</p>
      </section>
    );
  }
  return (
    <section className="gc-panel" data-testid="ops-exceptions">
      <h2>Actionable exceptions</h2>
      <div className="gc-exception-list">
        {items.map((item) => (
          <Link
            key={item.id}
            to={item.href}
            className={`gc-exception ${toneClass(item.severity)}`}
            data-testid={`ops-${item.id}`}
            style={{ textDecoration: 'none' }}
          >
            <strong>{item.area}</strong>
            <span>{item.signal}</span>
            <em>{item.evidence} · {item.owner}</em>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function HospitalCommandPage() {
  const view = useView();
  const f = view.facts;
  const tiles = [
    { label: 'Bed pressure', value: `${(f.occupancy * 100).toFixed(1)}%`, hint: `${f.availableBeds} available`, href: '/beds' },
    { label: 'ED wait', value: `${f.edWaitMedianMin.toFixed(1)} min`, hint: `${f.edArrivals.toLocaleString('en-US')} arrivals`, href: '/emergency/flow' },
    { label: 'Theatre util', value: `${(f.orUtilization * 100).toFixed(1)}%`, hint: `Cancel ${(f.cancellationRate * 100).toFixed(1)}%`, href: '/surgery' },
    { label: 'OPD wait', value: `${f.opdWaitMedian.toFixed(1)} min`, hint: `${f.opdVisits.toLocaleString('en-US')} visits`, href: '/outpatient' },
    { label: 'Lab TAT', value: `${f.labTat.toFixed(1)} h`, hint: `${f.labCriticalPending} critical pending`, href: '/laboratory' },
    { label: 'Imaging backlog', value: f.radBacklog.toLocaleString('en-US'), hint: `${f.radUnsigned} unsigned`, href: '/radiology' },
    { label: 'ICU occupancy', value: `${(f.icuOccupancy * 100).toFixed(1)}%`, hint: `Staff gap ${Math.round(f.icuStaffingGapHours)} h`, href: '/icu' },
    { label: 'Critical stockouts', value: String(f.criticalStockouts), hint: `Avail ${(f.supplyAvailability * 100).toFixed(1)}%`, href: '/supply-chain' },
    { label: 'QS overdue', value: String(f.overdueHighRiskActions), hint: `${f.validatedEventRate.toFixed(1)}/1k events`, href: '/quality' },
  ];
  const opsChart = fig(
    'line',
    'Bed occupancy (ops)',
    f.labels,
    [{ name: 'Occupancy %', values: f.monthlyOccupancy.map((v) => Math.round(v * 1000) / 10) }],
    '%',
    'Beds domain occupancy — period-scoped synthetic reporting, not live telemetry.',
  );

  return (
    <PageShell
      kicker="Enterprise · COO / Operations"
      title="Hospital Command Center"
      testId="command-center"
    >
      <div className="gc-ribbon" data-testid="command-center-ribbon">
        {tiles.map((tile, index) => (
          <Link
            key={tile.label}
            to={tile.href}
            className="gc-score gc-tone-neutral"
            style={{ animationDelay: `${index * 35}ms`, textDecoration: 'none' }}
          >
            <span>{tile.label}</span>
            <strong className="gc-ltr">{tile.value}</strong>
            <em>{tile.hint}</em>
          </Link>
        ))}
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <ExceptionBoard items={view.opsExceptions} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot figure={opsChart} />
        </div>
      </div>
      <section className="gc-panel span-12">
        <h2>Operating context</h2>
        <p>
          Figures refresh with shared hospital / year / period filters. Not claimed as real-time live telemetry —
          escalate only actionable exceptions; deep analysis stays on owning domain screens.
        </p>
        <div className="gc-next" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link to="/executive" className="gc-btn">Executive</Link>
          <Link to="/icu/capacity" className="gc-text-btn">ICU capacity</Link>
          <Link to="/strategy/workforce" className="gc-text-btn">Strategy workforce</Link>
        </div>
      </section>
    </PageShell>
  );
}
