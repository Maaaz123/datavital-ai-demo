import { useMemo, useState, type ReactNode } from 'react';
import { useShowcase } from '@/showcase/state';
import { alertsFor } from './alerts';
import { qsIndicatorsFor, QS_AI_CASES } from './qualitySafetyScope';
import {
  ownersForQsScreen,
  QS_SCREEN_TITLES,
  type QsScreenId,
} from './qualitySafetyOwnership';
import { buildQsView, qsIdentityIssues, QS_TARGETS, type QsView } from './qualitySafetyView';
import { useCopilot } from './Copilot';
import { usePeriod } from './period';
import { Chart, type Figure } from './viz';

type Detail = { name: string; value: string; definition: string; scope: string; formula?: string; limitations?: string };
type Tone = 'good' | 'watch' | 'alert' | 'neutral';
type View = QsView;

function useView(): View {
  const store = useShowcase();
  const { period } = usePeriod();
  return useMemo(() => buildQsView(store.hospital, store.year, period), [store.hospital, store.year, period]);
}

function usePrior(): View {
  const store = useShowcase();
  const { period } = usePeriod();
  const year = store.year <= 2024 ? 2024 : store.year - 1;
  return useMemo(() => buildQsView(store.hospital, year, period), [store.hospital, year, period]);
}

function num(value: number, digits = 0): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function rate1k(value: number): string {
  return `${num(value, 1)} /1k`;
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

function ribbon(screen: QsScreenId, values: Record<string, RibbonRow>) {
  return ownersForQsScreen(screen).map((owner) => {
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
    <section className="gc-panel gc-insight span-12" data-testid="qs-disclosure">
      <h2>Data scope</h2>
      <p>
        Synthetic clinical-governance demo data — not a diagnostic system, medical device, or autonomous infection-control engine.
        HAI rates use device-day or procedure denominators and are not certified NHSN rates; official SIR is unavailable.
        Reporting volume is not proof of safety. Modeled improvements are illustrative and require authorized human review.
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
          <p className="gc-kicker">Quality, Patient Safety & Infection Prevention</p>
          <h1>{title}</h1>
        </div>
      </header>
      <div className="gc-ribbon" data-testid="qs-ribbon">
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
  const digits = unit === '%' || unit === 'days' || unit === 'rate' || unit === '/1k' || unit === 'index' ? 1 : 0;
  return { type, title, categories: axis(categories), series, unit, digits, note, domain: 'quality-safety', subjects: [title], ...extra };
}

function rate(values: number[]): number[] {
  return values.map((value) => Math.round(value * 1000) / 10);
}

function Alerts({ packed = false }: { packed?: boolean } = {}) {
  const store = useShowcase();
  const copilot = useCopilot();
  const view = useView();
  const { period } = usePeriod();
  const alerts = alertsFor(store.hospital, store.year, period).filter((alert) => alert.department === 'Quality & Safety' && alert.severity !== 'info');
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
              Quality & Safety within management thresholds · open Vital Assist
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

function IndicatorIndex({ indicators }: { indicators: ReturnType<typeof qsIndicatorsFor> }) {
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
      <p>Illustrative quality and safety decision support · not clinical diagnosis and not an autonomous infection-control engine</p>
      <div className="gc-exception-list">
        {QS_AI_CASES.map((item) => (
          <div key={item.title} className="gc-exception gc-tone-neutral">
            <strong>{item.title}</strong>
            <span>{item.owner} · follow-up {item.followUp}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function QsCommandPage() {
  const view = useView();
  const prior = usePrior();
  const issues = qsIdentityIssues(view);
  return (
    <Page
      title={QS_SCREEN_TITLES.command}
      kpis={ribbon('command', {
        kpi_qs_validated_event_rate: {
          value: rate1k(view.validatedEventRate),
          delta: compare(view, prior, (item) => item.validatedEventRate),
          tone: low(view.validatedEventRate, QS_TARGETS.validatedEventRate, 3),
          scope: `${num(view.validated)} validated of ${num(view.discharges)} discharges · ${view.periodLabel}.`,
          formula: 'Validated events ÷ discharges × 1,000',
          limitations: view.methodology.incidents,
        },
        kpi_qs_severe_harm_events: {
          value: num(view.severeHarm),
          delta: compare(view, prior, (item) => item.severeHarm),
          tone: view.severeHarm > 0 ? 'watch' : 'good',
          scope: `Severe harm among ${num(view.withHarm)} events with harm · ${view.periodLabel}.`,
          formula: 'Count of validated severe-harm events',
          limitations: 'Not auto-classified as a regulatory sentinel event.',
        },
        kpi_qs_hai_burden_rate: {
          value: rate1k(view.haiBurdenRate),
          delta: compare(view, prior, (item) => item.haiBurdenRate),
          tone: low(view.haiBurdenRate, QS_TARGETS.haiBurdenRate, 0.4),
          scope: `${num(view.haiCases)} validated HO infection events over ${num(view.patientDays)} patient-days.`,
          formula: 'HO infection events ÷ patient-days × 1,000',
          limitations: view.methodology.infections,
        },
        kpi_qs_quality_measure_compliance: {
          value: pct(view.qualityCompliance),
          delta: compare(view, prior, (item) => item.qualityCompliance, true),
          tone: high(view.qualityCompliance, QS_TARGETS.qualityCompliance, 0.04),
          scope: `Target ≥ ${pct(QS_TARGETS.qualityCompliance)} · ${view.periodLabel}.`,
          formula: 'Measure numerators met ÷ eligible opportunities',
        },
        kpi_qs_overdue_high_risk_actions: {
          value: num(view.overdueHighRiskActions),
          delta: compare(view, prior, (item) => item.overdueHighRiskActions),
          tone: view.overdueHighRiskActions > 8 ? 'alert' : view.overdueHighRiskActions > 4 ? 'watch' : 'good',
          scope: `Period-end stock at ${view.observationDate}.`,
          formula: 'Open high-risk CAPA / safety actions past due',
          limitations: view.methodology.rca,
        },
        kpi_qs_priority_safety_signals: {
          value: num(view.prioritySignals),
          delta: compare(view, prior, (item) => item.prioritySignals),
          tone: view.prioritySignals > 4 ? 'watch' : 'neutral',
          scope: `Threshold-based signals for ${view.hospital} · ${view.periodLabel}.`,
          formula: 'Count of active priority signals',
        },
      })}
    >
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Quality & Safety Performance Trend', view.labels, [
            { name: 'Validated events', values: view.monthlyValidated },
            { name: 'HAI events', values: view.monthlyHai },
          ], 'events', `Monthly validated safety events and hospital-onset infection events. Ledger identities ${issues.length ? `need review (${issues.join(', ')})` : 'reconcile'}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Alerts packed />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Safety Severity Distribution', view.severityRows.map((item) => item.name), [
            { name: 'Events', values: view.severityRows.map((item) => item.count) },
          ], 'events', `Severity counts sum to validated events ${num(view.validated)}. Near miss ≠ harm.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Infection Surveillance Overview', ['CLABSI', 'CAUTI', 'SSI', 'HO CDI'], [
            { name: 'Events', values: [view.clabsi, view.cauti, view.ssi, view.cdi] },
          ], 'events', `${view.sirNote}`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'High-Risk Actions Trend', view.labels, [
            { name: 'Overdue proxy', values: view.monthlyOverdueProxy },
          ], 'actions', `Illustrative monthly allocation of overdue high-risk action pressure. Period stock ${num(view.overdueHighRiskActions)}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Quality Measure Performance', ['Compliance', 'Target'], [
            { name: 'Rate', values: rate([view.qualityCompliance, QS_TARGETS.qualityCompliance]) },
          ], '%', `Quality measure compliance vs operating target ${pct(QS_TARGETS.qualityCompliance)}.`)} />
        </div>
      </div>
      <section className="gc-panel span-12">
        <h2>Leadership note</h2>
        <p>
          Use specialist pages for incident taxonomy, device-day infection surveillance, prevention audits, outcome cohorts, and RCA/CAPA detail.
          This command view surfaces leadership attention only.
        </p>
      </section>
      <IndicatorIndex indicators={qsIndicatorsFor(view).filter((item) => item.screen === 'Command')} />
      <AiIndex />
    </Page>
  );
}

export function QsIncidentsPage() {
  const view = useView();
  const prior = usePrior();
  return (
    <Page
      title={QS_SCREEN_TITLES.incidents}
      kpis={ribbon('incidents', {
        kpi_qs_reported_incidents: {
          value: num(view.reported),
          delta: compare(view, prior, (item) => item.reported),
          scope: `Reports received · ${view.periodLabel}. Rising reports may reflect reporting culture, not harm.`,
          formula: 'Safety reports received',
          limitations: view.methodology.incidents,
        },
        kpi_qs_validated_incidents: {
          value: num(view.validated),
          delta: compare(view, prior, (item) => item.validated),
          scope: `${num(view.validated)} of ${num(view.reported)} reports validated after review.`,
          formula: 'Validated after review',
        },
        kpi_qs_near_miss_events: {
          value: num(view.nearMiss),
          delta: compare(view, prior, (item) => item.nearMiss),
          scope: 'Near miss / good-catch — no patient harm occurred.',
          formula: 'Validated near-miss events',
        },
        kpi_qs_events_with_harm: {
          value: num(view.withHarm),
          delta: compare(view, prior, (item) => item.withHarm),
          tone: view.withHarm > view.validated * 0.45 ? 'watch' : 'neutral',
          scope: `Includes severe harm ${num(view.severeHarm)}.`,
          formula: 'Validated events with harm',
        },
        kpi_qs_investigation_timeliness: {
          value: pct(view.investigationTimeliness),
          delta: compare(view, prior, (item) => item.investigationTimeliness, true),
          tone: high(view.investigationTimeliness, QS_TARGETS.investigationTimeliness, 0.08),
          scope: `Target ≥ ${pct(QS_TARGETS.investigationTimeliness)}.`,
          formula: 'On-time ÷ decided investigations',
        },
        kpi_qs_classification_completeness: {
          value: pct(view.classificationCompleteness),
          delta: compare(view, prior, (item) => item.classificationCompleteness, true),
          tone: high(view.classificationCompleteness, 0.9, 0.05),
          scope: 'Category + severity labels complete.',
          formula: 'Fully labeled reports ÷ reported',
        },
      })}
    >
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Incident Reporting Trend', view.labels, [
            { name: 'Reported', values: view.monthlyReported },
            { name: 'Validated', values: view.monthlyValidated },
          ], 'events', 'Reporting volume is not proof of underlying harm or of safety.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Incident Categories', view.categoryRows.map((item) => item.name), [
            { name: 'Validated', values: view.categoryRows.map((item) => item.count) },
          ], 'events', `Categories sum to validated ${num(view.validated)}.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Severity and Harm Distribution', view.severityRows.map((item) => item.name), [
            { name: 'Events', values: view.severityRows.map((item) => item.count) },
          ], 'events', 'Near miss · no harm · mild · moderate · severe.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Incidents by Department', view.deptIncidentRows.map((item) => item.name), [
            { name: 'Validated', values: view.deptIncidentRows.map((item) => item.count) },
          ], 'events', 'Department attribution for validated events.')} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Investigation Status', ['On-time', 'Late / open pressure'], [
            { name: 'Share', values: rate([view.investigationTimeliness, 1 - view.investigationTimeliness]) },
          ], '%', `Investigation timeliness ${pct(view.investigationTimeliness)}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Recurring Event Patterns', view.categoryRows.slice(0, 5).map((item) => item.name), [
            { name: 'Validated', values: view.categoryRows.slice(0, 5).map((item) => item.count) },
          ], 'events', 'Top categories by validated count — pattern signal for RCA attention.')} />
        </div>
      </div>
      <IndicatorIndex indicators={qsIndicatorsFor(view).filter((item) => item.screen === 'Incidents')} />
    </Page>
  );
}

export function QsInfectionsPage() {
  const view = useView();
  const prior = usePrior();
  return (
    <Page
      title={QS_SCREEN_TITLES.infections}
      kpis={ribbon('infections', {
        kpi_qs_clabsi_rate: {
          value: rate1k(view.clabsiRate),
          delta: compare(view, prior, (item) => item.clabsiRate),
          tone: low(view.clabsiRate, QS_TARGETS.clabsiRate, 0.4),
          scope: `${num(view.clabsi)} events / ${num(view.centralLineDays)} central-line days.`,
          formula: 'CLABSI ÷ CL-days × 1,000',
          limitations: view.methodology.infections,
        },
        kpi_qs_cauti_rate: {
          value: rate1k(view.cautiRate),
          delta: compare(view, prior, (item) => item.cautiRate),
          tone: low(view.cautiRate, QS_TARGETS.cautiRate, 0.4),
          scope: `${num(view.cauti)} events / ${num(view.catheterDays)} catheter days.`,
          formula: 'CAUTI ÷ UC-days × 1,000',
          limitations: view.methodology.infections,
        },
        kpi_qs_ssi_rate: {
          value: pct(view.ssiRate),
          delta: compare(view, prior, (item) => item.ssiRate, true),
          tone: low(view.ssiRate, QS_TARGETS.ssiRate, 0.008),
          scope: `${num(view.ssi)} SSI / ${num(view.procedures)} eligible procedures.`,
          formula: 'SSI ÷ eligible procedures',
        },
        kpi_qs_validated_hai_cases: {
          value: num(view.haiCases),
          delta: compare(view, prior, (item) => item.haiCases),
          scope: `CLABSI ${num(view.clabsi)} + CAUTI ${num(view.cauti)} + SSI ${num(view.ssi)} + CDI ${num(view.cdi)}.`,
          formula: 'Sum of validated HAI categories',
        },
        kpi_qs_cdi_events: {
          value: num(view.cdi),
          delta: compare(view, prior, (item) => item.cdi),
          scope: `Hospital-onset CDI LabID events · ${view.periodLabel}.`,
          formula: 'HO CDI event count',
        },
        kpi_qs_surveillance_coverage: {
          value: pct(view.surveillanceCoverage),
          delta: compare(view, prior, (item) => item.surveillanceCoverage, true),
          tone: high(view.surveillanceCoverage, 0.9, 0.05),
          scope: 'Units with complete device-day / procedure surveillance.',
          formula: 'Covered units ÷ plan units',
        },
      })}
    >
      <section className="gc-panel span-12">
        <h2>Denominator discipline</h2>
        <p>
          CLABSI and CAUTI use device-day denominators. SSI uses eligible procedures. Admissions are not used as the denominator for these rates.
          Official SIR is unavailable — {view.sirNote}
        </p>
      </section>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Infection Incidence Trend', view.labels, [
            { name: 'CLABSI /1k', values: view.monthlyClabsiRate },
            { name: 'CAUTI /1k', values: view.monthlyCautiRate },
          ], '/1k', 'Monthly incidence density — demo surveillance definitions.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Device-Associated Infection Rates', ['CLABSI', 'CAUTI'], [
            { name: 'Rate /1k', values: [view.clabsiRate, view.cautiRate] },
          ], '/1k', 'Device-day denominators only.')} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Infection Events by Unit', view.deptHaiRows.map((item) => item.name), [
            { name: 'Events', values: view.deptHaiRows.map((item) => item.count) },
          ], 'events', `Unit events sum to validated HAI ${num(view.haiCases)}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'SSI by Eligible Procedure Category', view.procedureRows.map((item) => item.name), [
            { name: 'SSI', values: view.procedureRows.map((item) => item.ssi) },
          ], 'events', `Procedure categories sum to SSI ${num(view.ssi)}.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Device Days vs Events', ['CL days', 'CLABSI', 'UC days', 'CAUTI'], [
            { name: 'Value', values: [view.centralLineDays, view.clabsi, view.catheterDays, view.cauti] },
          ], 'count', 'Device-days dwarf event counts — keep axes and units distinct in interpretation.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Surveillance Completeness', view.surveillanceRows.map((item) => item.name), [
            { name: 'Covered', values: view.surveillanceRows.map((item) => (item.covered ? 1 : 0)) },
          ], 'flag', `Surveillance coverage ${pct(view.surveillanceCoverage)}.`)} />
        </div>
      </div>
      <IndicatorIndex indicators={qsIndicatorsFor(view).filter((item) => item.screen === 'Infections')} />
    </Page>
  );
}

export function QsPreventionPage() {
  const view = useView();
  const prior = usePrior();
  return (
    <Page
      title={QS_SCREEN_TITLES.prevention}
      kpis={ribbon('prevention', {
        kpi_qs_hand_hygiene_compliance: {
          value: pct(view.handHygiene),
          delta: compare(view, prior, (item) => item.handHygiene, true),
          tone: high(view.handHygiene, QS_TARGETS.handHygiene, 0.05),
          scope: `${num(view.hhCompliant)} compliant of ${num(view.hhEligible)} audited opportunities.`,
          formula: 'Compliant ÷ eligible observed opportunities',
          limitations: view.methodology.prevention,
        },
        kpi_qs_isolation_compliance: {
          value: pct(view.isolationCompliance),
          delta: compare(view, prior, (item) => item.isolationCompliance, true),
          tone: high(view.isolationCompliance, 0.85, 0.05),
          scope: `Isolation audits · ${view.periodLabel}.`,
          formula: 'Compliant ÷ eligible isolation observations',
        },
        kpi_qs_ip_audit_completion: {
          value: pct(view.ipAuditCompletion),
          delta: compare(view, prior, (item) => item.ipAuditCompletion, true),
          tone: high(view.ipAuditCompletion, 0.85, 0.05),
          scope: 'Scheduled infection-prevention audits.',
          formula: 'Completed ÷ scheduled audits',
        },
        kpi_qs_cl_bundle_compliance: {
          value: pct(view.clBundle),
          delta: compare(view, prior, (item) => item.clBundle, true),
          tone: high(view.clBundle, 0.85, 0.05),
          scope: 'Central-line insertion/maintenance observations.',
          formula: 'Fully compliant ÷ eligible CL observations',
        },
        kpi_qs_catheter_bundle_compliance: {
          value: pct(view.ucBundle),
          delta: compare(view, prior, (item) => item.ucBundle, true),
          tone: high(view.ucBundle, 0.85, 0.05),
          scope: 'Urinary-catheter maintenance observations.',
          formula: 'Fully compliant ÷ eligible UC observations',
        },
        kpi_qs_prevention_gaps: {
          value: num(view.preventionGaps),
          delta: compare(view, prior, (item) => item.preventionGaps),
          tone: view.preventionGaps > 15 ? 'watch' : 'neutral',
          scope: `Open high-risk findings at ${view.observationDate}.`,
          formula: 'Open high-risk prevention findings',
        },
      })}
    >
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Hand Hygiene Compliance Trend', view.labels, [
            { name: 'Observed %', values: view.monthlyHh },
          ], '%', 'Audited opportunities only — not all care interactions.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Prevention Audit Performance', ['Completed', 'Missed'], [
            { name: 'Share', values: rate([view.ipAuditCompletion, 1 - view.ipAuditCompletion]) },
          ], '%', `IP audit completion ${pct(view.ipAuditCompletion)}.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Bundle Compliance by Unit', ['CL bundle', 'UC bundle', 'Isolation'], [
            { name: 'Compliance', values: rate([view.clBundle, view.ucBundle, view.isolationCompliance]) },
          ], '%', 'Process compliance does not prove infection reduction.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Isolation Process Compliance', ['Compliant', 'Gap'], [
            { name: 'Share', values: rate([view.isolationCompliance, 1 - view.isolationCompliance]) },
          ], '%', `Isolation compliance ${pct(view.isolationCompliance)}.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Missed Audit Opportunities', ['HH eligible', 'HH compliant', 'Gap'], [
            { name: 'Opportunities', values: [view.hhEligible, view.hhCompliant, view.hhEligible - view.hhCompliant] },
          ], 'obs', 'Eligible audited opportunities vs compliant observations.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Prevention Gap Priorities', ['Open gaps'], [
            { name: 'Findings', values: [view.preventionGaps] },
          ], 'findings', `High-risk prevention gaps ${num(view.preventionGaps)}.`)} />
        </div>
      </div>
      <IndicatorIndex indicators={qsIndicatorsFor(view).filter((item) => item.screen === 'Prevention')} />
    </Page>
  );
}

export function QsOutcomesPage() {
  const view = useView();
  const prior = usePrior();
  return (
    <Page
      title={QS_SCREEN_TITLES.outcomes}
      kpis={ribbon('outcomes', {
        kpi_qs_readmission_rate: {
          value: pct(view.readmissionRate),
          delta: compare(view, prior, (item) => item.readmissionRate, true),
          tone: low(view.readmissionRate, QS_TARGETS.readmissionRate, 0.02),
          scope: `${num(view.readmissions)} unplanned same-facility readmissions / ${num(view.eligibleDischarges)} eligible discharges.`,
          formula: 'Unplanned readmissions ÷ eligible index discharges',
          limitations: view.methodology.outcomes,
        },
        kpi_qs_pressure_injury_rate: {
          value: rate1k(view.pressureInjuryRate),
          delta: compare(view, prior, (item) => item.pressureInjuryRate),
          scope: `${num(view.hapi)} HAPI over ${num(view.patientDays)} patient-days.`,
          formula: 'HAPI ÷ patient-days × 1,000',
        },
        kpi_qs_falls_with_injury_rate: {
          value: rate1k(view.fallsWithInjuryRate),
          delta: compare(view, prior, (item) => item.fallsWithInjuryRate),
          scope: `${num(view.fallsInjury)} falls with injury over patient-days.`,
          formula: 'Falls with injury ÷ patient-days × 1,000',
        },
        kpi_qs_postop_complication_rate: {
          value: pct(view.postopComplicationRate),
          delta: compare(view, prior, (item) => item.postopComplicationRate, true),
          scope: `${num(view.postopComplications)} / ${num(view.surgicalDischarges)} surgical discharges — descriptive.`,
          formula: 'Complications ÷ eligible surgical discharges',
          limitations: 'Not risk-adjusted.',
        },
        kpi_qs_outcome_measure_coverage: {
          value: pct(view.outcomeMeasureCoverage),
          delta: compare(view, prior, (item) => item.outcomeMeasureCoverage, true),
          tone: high(view.outcomeMeasureCoverage, 0.9, 0.05),
          scope: 'Cohorts with complete eligibility flags.',
          formula: 'Complete cohorts ÷ planned measures',
        },
        kpi_qs_outcome_review_backlog: {
          value: num(view.outcomeReviewBacklog),
          delta: compare(view, prior, (item) => item.outcomeReviewBacklog),
          tone: view.outcomeReviewBacklog > 20 ? 'watch' : 'neutral',
          scope: `Open reviews at ${view.observationDate}.`,
          formula: 'Open reviews past target',
        },
      })}
    >
      <section className="gc-panel span-12">
        <h2>Outcome interpretation limits</h2>
        <p>
          These rates are descriptive and are not risk-adjusted quality rankings. Readmissions are same-facility only.
          Death counts are not shown as avoidability measures.
        </p>
      </section>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Readmission Trend', view.labels, [
            { name: 'Readmit %', values: view.monthlyReadmit },
          ], '%', 'Eligible 30-day unplanned same-facility readmission rate.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'HAPI and Falls With Injury', ['HAPI /1k', 'Falls injury /1k'], [
            { name: 'Rate', values: [view.pressureInjuryRate, view.fallsWithInjuryRate] },
          ], '/1k', 'Both use patient-day denominators.')} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Postoperative Complications', ['Complications', 'Surgical discharges'], [
            { name: 'Count', values: [view.postopComplications, view.surgicalDischarges] },
          ], 'count', `Descriptive complication rate ${pct(view.postopComplicationRate)}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Outcome Measure Coverage', ['Covered', 'Gap'], [
            { name: 'Share', values: rate([view.outcomeMeasureCoverage, 1 - view.outcomeMeasureCoverage]) },
          ], '%', `Coverage ${pct(view.outcomeMeasureCoverage)}.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Outcome Review Backlog', ['Open reviews'], [
            { name: 'Reviews', values: [view.outcomeReviewBacklog] },
          ], 'reviews', `Backlog ${num(view.outcomeReviewBacklog)} at ${view.observationDate}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Outcome Signals by Department', view.deptIncidentRows.map((item) => item.name), [
            { name: 'Proxy signal', values: view.deptIncidentRows.map((item) => item.count) },
          ], 'events', 'Department concentration uses validated incident attribution as a supporting signal — not a risk-adjusted rank.')} />
        </div>
      </div>
      <IndicatorIndex indicators={qsIndicatorsFor(view).filter((item) => item.screen === 'Outcomes')} />
    </Page>
  );
}

export function QsActionsPage() {
  const view = useView();
  const prior = usePrior();
  return (
    <Page
      title={QS_SCREEN_TITLES.actions}
      kpis={ribbon('actions', {
        kpi_qs_open_rca: {
          value: num(view.openRca),
          delta: compare(view, prior, (item) => item.openRca),
          scope: `Opened ${num(view.rcaOpened)} · closed ${num(view.rcaClosed)} in ${view.periodLabel}.`,
          formula: 'Open RCA at observation',
          limitations: view.methodology.rca,
        },
        kpi_qs_overdue_rca: {
          value: num(view.overdueRca),
          delta: compare(view, prior, (item) => item.overdueRca),
          tone: view.overdueRca > 3 ? 'watch' : 'neutral',
          scope: `Of ${num(view.openRca)} open RCA.`,
          formula: 'Open RCA past target',
        },
        kpi_qs_capa_ontime: {
          value: pct(view.capaOntime),
          delta: compare(view, prior, (item) => item.capaOntime, true),
          tone: high(view.capaOntime, QS_TARGETS.capaOntime, 0.08),
          scope: `Target ≥ ${pct(QS_TARGETS.capaOntime)}.`,
          formula: 'On-time CAPA ÷ decided CAPA',
        },
        kpi_qs_open_capa: {
          value: num(view.openCapa),
          delta: compare(view, prior, (item) => item.openCapa),
          scope: `Decided ${num(view.capaDecided)} · closed ${num(view.capaClosed)}.`,
          formula: 'Open CAPA at observation',
        },
        kpi_qs_recurring_themes: {
          value: num(view.recurringThemes),
          delta: compare(view, prior, (item) => item.recurringThemes),
          scope: 'Themes with ≥2 related validated events.',
          formula: 'Recurring theme count',
        },
        kpi_qs_effectiveness_review_rate: {
          value: pct(view.effectivenessReviewRate),
          delta: compare(view, prior, (item) => item.effectivenessReviewRate, true),
          tone: high(view.effectivenessReviewRate, 0.6, 0.1),
          scope: 'Closed CAPA with documented effectiveness review.',
          formula: 'Reviewed ÷ closed CAPA',
          limitations: 'Approval ≠ measured effectiveness.',
        },
      })}
    >
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Investigation Lifecycle', ['Open', 'Overdue', 'Closed in period'], [
            { name: 'Cases', values: [view.openRca, view.overdueRca, view.rcaClosed] },
          ], 'cases', 'Open and overdue are period-end stocks; closed is a period flow. Administrative closure ≠ proven risk reduction.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Corrective Action Aging', view.labels, [
            { name: 'On-time %', values: view.monthlyCapaOntime },
          ], '%', `Period CAPA on-time ${pct(view.capaOntime)}.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Owner Workload', ['Safety', 'IP', 'Nursing', 'Governance'], [
            { name: 'Open', values: [
              Math.round(view.openCapa * 0.28),
              Math.round(view.openCapa * 0.22),
              Math.round(view.openCapa * 0.3),
              view.openCapa - Math.round(view.openCapa * 0.28) - Math.round(view.openCapa * 0.22) - Math.round(view.openCapa * 0.3),
            ] },
          ], 'actions', `Owner split of open CAPA ${num(view.openCapa)} (illustrative attribution).`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Root-Cause Category Distribution', view.categoryRows.slice(0, 5).map((item) => item.name), [
            { name: 'Events', values: view.categoryRows.slice(0, 5).map((item) => item.count) },
          ], 'events', `Repeat findings needing RCA attention: ${num(view.recurringThemes)}.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Verification Outcomes', ['Reviewed', 'Not reviewed'], [
            { name: 'Share', values: rate([view.effectivenessReviewRate, 1 - view.effectivenessReviewRate]) },
          ], '%', `Effectiveness verification ${pct(view.effectivenessReviewRate)}. Approval ≠ measured effectiveness.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Repeat Finding Trend', ['RCA opened', 'RCA closed', 'CAPA decided', 'CAPA closed'], [
            { name: 'Count', values: [view.rcaOpened, view.rcaClosed, view.capaDecided, view.capaClosed] },
          ], 'count', 'Throughput across the learning loop — not measured outcome improvement.')} />
        </div>
      </div>
      <IndicatorIndex indicators={qsIndicatorsFor(view).filter((item) => item.screen === 'RCA')} />
    </Page>
  );
}

const OPP_AXIS: Record<string, string> = {
  'qs-hh-up': 'Hand hygiene',
  'qs-bundle-up': 'Device bundle',
  'qs-infection-review-down': 'Infection review',
  'qs-investigation-up': 'Investigations',
  'qs-capa-overdue-down': 'Overdue CAPA',
  'qs-observation-up': 'Observation coverage',
  'qs-ssi-prevention-up': 'SSI prevention',
  'qs-effectiveness-up': 'CAPA verification',
};

export function QsOptimizationPage() {
  const view = useView();
  const prior = usePrior();
  const ranked = [...view.opportunities].sort((a, b) => b.eligibleValue - a.eligibleValue);
  const driverNames = view.opportunities.map((item) => OPP_AXIS[item.id] ?? item.id);
  return (
    <Page
      title={QS_SCREEN_TITLES.optimization}
      kpis={ribbon('optimization', {
        kpi_qs_addressable_gap: {
          value: rate1k(view.addressableGap),
          delta: compare(view, prior, (item) => item.addressableGap),
          scope: `Validated event rate ${rate1k(view.validatedEventRate)} vs target ${rate1k(QS_TARGETS.validatedEventRate)}.`,
          formula: 'Current rate − target (floor 0)',
          limitations: view.methodology.optimization,
        },
        kpi_qs_modeled_incident_reduction: {
          value: num(view.modeledIncidentReduction),
          delta: compare(view, prior, (item) => item.modeledIncidentReduction),
          scope: 'Illustrative preventable events with harm.',
          formula: 'Modeled preventable harm events',
          limitations: 'Not measured improvement.',
        },
        kpi_qs_modeled_hai_prevention: {
          value: num(view.modeledHaiPrevention),
          delta: compare(view, prior, (item) => item.modeledHaiPrevention),
          scope: 'Illustrative preventable HAI events.',
          formula: 'Modeled preventable HAI',
          limitations: 'Process compliance ≠ proven infection reduction.',
        },
        kpi_qs_modeled_compliance_uplift: {
          value: pct(view.modeledComplianceUplift),
          delta: compare(view, prior, (item) => item.modeledComplianceUplift, true),
          scope: 'Illustrative audited-opportunity compliance uplift.',
          formula: 'Modeled compliance points',
        },
        kpi_qs_priority_action_coverage: {
          value: pct(view.priorityActionCoverage),
          delta: compare(view, prior, (item) => item.priorityActionCoverage, true),
          tone: high(view.priorityActionCoverage, 0.75, 0.1),
          scope: 'Priority actions with assigned owner.',
          formula: 'Owned actions ÷ priority opportunities',
        },
      })}
    >
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Safety Improvement by Driver', driverNames, [
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
            <p className="gc-next">Estimates are illustrative. AI does not diagnose, order isolation, or close CAPA alone.</p>
          </section>
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Current vs Scenario Validated Events', ['Current validated', 'Scenario residual'], [
            { name: 'Events', values: [view.validated, Math.max(0, view.validated - view.modeledIncidentReduction)] },
          ], 'events', 'Scenario residual after illustrative incident reduction — not measured results.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'HAI Prevention Opportunity', ['Current HAI', 'Preventable (modeled)'], [
            { name: 'Events', values: [view.haiCases, view.modeledHaiPrevention] },
          ], 'events', 'Modeled prevention is not collected infection reduction.')} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Prevention Compliance Uplift', ['Current HH', 'Scenario HH'], [
            { name: 'Compliance', values: rate([view.handHygiene, Math.min(1, view.handHygiene + view.modeledComplianceUplift)]) },
          ], '%', 'Audited-opportunity compliance only.')} />
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
      <IndicatorIndex indicators={qsIndicatorsFor(view).filter((item) => item.screen === 'Optimization')} />
      <AiIndex />
    </Page>
  );
}
