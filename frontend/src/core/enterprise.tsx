/**
 * Enterprise Executive Dashboard + Hospital Command Center.
 * Additive cross-domain integration — reads canonical domain facts only.
 * Not a redesign of Domains 1–15 screens.
 */
import { useMemo, type ReactNode } from 'react';
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
      <p className="gc-panel gc-fit" data-testid="enterprise-disclosure" style={{ marginBottom: 12 }}>
        {ENTERPRISE_DISCLAIMER}
      </p>
      {children}
    </article>
  );
}

function SignalRibbon({ signals }: { signals: EnterpriseSignal[] }) {
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
    <div className="gc-ribbon" data-testid="enterprise-ribbon">
      {picked.map((signal, index) => (
        <Link
          key={signal.id}
          to={signal.sourceRoute}
          className={`gc-score ${toneClass(signal.severity)}`}
          data-testid={`value-${signal.id}`}
          style={{ animationDelay: `${index * 40}ms`, textDecoration: 'none' }}
          title={`${signal.formula} · Source: ${signal.sourceDomain}. ${signal.limitation}`}
        >
          <span>{signal.label}</span>
          <strong className="gc-ltr">{signal.display}</strong>
          <em>{signal.sourceDomain}</em>
        </Link>
      ))}
    </div>
  );
}

function PriorityList({ items }: { items: EnterprisePriority[] }) {
  const copilot = useCopilot();
  return (
    <section className="gc-panel gc-insight span-12" data-testid="enterprise-priorities">
      <h2>Top leadership priorities</h2>
      <p>Evidence-linked to source domains. Suggested decisions require human approval.</p>
      <ul className="gc-alert-list">
        {items.map((item) => (
          <li key={item.id}>
            <div className="gc-exception" data-testid={`priority-${item.id}`}>
              <span className={`gc-sev gc-sev-${item.severity === 'critical' ? 'critical' : 'medium'}`}>{item.severity}</span>
              <strong>{item.issue}</strong>
              <span>{item.metricLabel}: {item.metricValue} · {item.sourceDomain}</span>
              <p>{item.evidence}</p>
              <p>Suggested decision: {item.decision}</p>
              <div className="gc-next" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link to={item.href} className="gc-btn">Open {item.sourceDomain}</Link>
                <button type="button" className="gc-text-btn" onClick={() => copilot.setOpen(true)}>
                  Ask Vital Assist
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function OccupancySpark({ labels, values }: { labels: string[]; values: number[] }) {
  const figure: Figure = {
    type: 'line',
    title: 'Bed occupancy (Beds domain)',
    categories: labels,
    series: [{ name: 'Occupancy %', values: values.map((v) => Math.round(v * 1000) / 10) }],
    unit: '%',
    digits: 1,
    note: 'Derived from Beds census stocks — not an independently fabricated executive series.',
    domain: 'enterprise',
    subjects: ['Bed occupancy'],
  };
  return (
    <section className="gc-panel span-12">
      <Chart figure={figure} compact />
    </section>
  );
}

export function ExecutiveDashboardPage() {
  const view = useView();
  const categories = [
    { key: 'operational', title: 'Operational performance' },
    { key: 'financial', title: 'Financial health' },
    { key: 'experience', title: 'Patient experience' },
    { key: 'quality', title: 'Clinical quality' },
    { key: 'safety', title: 'Safety signals' },
    { key: 'capacity', title: 'Capacity pressure' },
    { key: 'efficiency', title: 'Resource efficiency' },
    { key: 'strategy', title: 'Strategic opportunities' },
  ] as const;

  return (
    <PageShell
      kicker="Enterprise · CEO / CFO / Board"
      title="Executive Dashboard"
      testId="executive-dashboard"
    >
      <SignalRibbon signals={view.signals} />
      <div className="gc-dense gc-ed-body">
        <section className="gc-panel span-12" data-testid="executive-condition">
          <h2>Hospital condition (≈30 seconds)</h2>
          <div className="gc-exception-list">
            {categories.map((category) => {
              const signal = view.signals.find((item) => item.category === category.key);
              if (!signal) return null;
              return (
                <div key={category.key} className={`gc-exception ${toneClass(signal.severity)}`}>
                  <strong>{category.title}</strong>
                  <span>{signal.display} · {signal.sourceDomain}</span>
                  <em>{signal.limitation}</em>
                </div>
              );
            })}
          </div>
        </section>
        <PriorityList items={view.priorities} />
        <OccupancySpark labels={view.facts.labels} values={view.facts.monthlyOccupancy} />
        <section className="gc-panel span-12">
          <h2>Decision discipline</h2>
          <p>
            Every executive figure above is read from a domain canonical view (Beds, Emergency, RCM, PX, Quality,
            Supply Chain, Strategy, and related ops domains). No independent fabricated totals. Contribution ≠ net profit.
            Modeled strategy benefits are not claimed ROI. AI does not approve clinical or financial actions.
          </p>
          <div className="gc-next" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link to="/command" className="gc-btn">Open Hospital Command Center</Link>
            <Link to="/strategy" className="gc-text-btn">Strategy Command</Link>
            <Link to="/quality" className="gc-text-btn">Quality Command</Link>
            <Link to="/supply-chain" className="gc-text-btn">Supply Chain Command</Link>
          </div>
        </section>
      </div>
    </PageShell>
  );
}

function ExceptionBoard({ items }: { items: OpsException[] }) {
  if (items.length === 0) {
    return (
      <section className="gc-panel span-12" data-testid="ops-exceptions">
        <h2>Actionable exceptions</h2>
        <p>No threshold exceptions for the selected hospital and period. Continue monitoring domain command centers.</p>
      </section>
    );
  }
  return (
    <section className="gc-panel span-12" data-testid="ops-exceptions">
      <h2>Actionable exceptions</h2>
      <p>COO-oriented exceptions only — not a full-domain dashboard wall. Period-scoped synthetic reporting.</p>
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
            <em>{item.evidence} · Owner: {item.owner}</em>
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

  return (
    <PageShell
      kicker="Enterprise · COO / Operations"
      title="Hospital Command Center"
      testId="hospital-command-center"
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
      <div className="gc-dense gc-ed-body">
        <ExceptionBoard items={view.opsExceptions} />
        <section className="gc-panel span-12">
          <h2>Operating context</h2>
          <p>
            Figures refresh with the shared hospital / year / period filters. This wall is <strong>not</strong> claimed
            as real-time live telemetry — the underlying synthetic ledgers are period-scoped. Escalate only actionable
            exceptions; deep analysis stays on the owning domain screens.
          </p>
          <div className="gc-next" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link to="/executive" className="gc-btn">Executive Dashboard</Link>
            <Link to="/icu/capacity" className="gc-text-btn">ICU capacity</Link>
            <Link to="/strategy/workforce" className="gc-text-btn">Staffing economics</Link>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
