import { useMemo, useState, type ReactNode } from 'react';
import { useShowcase } from '@/showcase/state';
import { alertsFor } from './alerts';
import { PX_AI_CASES, pxIndicatorsFor, type Indicator } from './patientExperienceScope';
import {
  ownersForPxScreen,
  PX_SCREEN_TITLES,
  type PxScreenId,
} from './patientExperienceOwnership';
import { buildPxView, type PxView } from './patientExperienceView';
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
type View = PxView;

function useView(): View {
  const store = useShowcase();
  const { period } = usePeriod();
  return useMemo(() => buildPxView(store.hospital, store.year, period), [store.hospital, store.year, period]);
}

function usePrior(): View {
  const store = useShowcase();
  const { period } = usePeriod();
  const year = store.year <= 2024 ? 2024 : store.year - 1;
  return useMemo(() => buildPxView(store.hospital, year, period), [store.hospital, year, period]);
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

type RibbonRow = {
  value: string;
  delta: string;
  tone?: Tone;
  scope: string;
  formula?: string;
  limitations?: string;
};

/** Build ribbon KPIs from ownership so every owner.id gets data-testid={`value-${owner.id}`}. */
function ribbon(screen: PxScreenId, values: Record<string, RibbonRow>) {
  return ownersForPxScreen(screen).map((owner) => {
    const row = values[owner.id];
    return score(
      owner.display,
      row.value,
      row.delta,
      owner.fullName,
      owner.decision,
      row.scope,
      {
        formula: row.formula,
        limitations: row.limitations,
        testId: `value-${owner.id}`,
        tone: row.tone,
      },
    );
  });
}

function Page({ title, kpis, children }: { title: string; kpis: { name: string; value: string; delta: string; tone?: Tone; testId?: string; detail: Detail }[]; children: ReactNode }) {
  const [open, setOpen] = useState<Detail | null>(null);
  return (
    <article className="gc-command gc-ed">
      <header className="gc-command-head">
        <div>
          <p className="gc-kicker">Patient Experience & Satisfaction</p>
          <h1>{title}</h1>
        </div>
      </header>
      <div className="gc-ribbon" data-testid="px-ribbon">
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

/** Axis-safe short labels so charts do not ellipsize PX categories. */
const PX_AXIS: Record<string, string> = {
  Emergency: 'Emergency',
  Inpatient: 'Inpatient',
  Outpatient: 'Outpatient',
  'Day-case / procedure': 'Day-case',
  'Overall rating': 'Overall',
  Waiting: 'Waiting',
  Communication: 'Commun.',
  Coordination: 'Coord.',
  Discharge: 'Discharge',
  'Respect & dignity': 'Respect',
  Environment: 'Environ.',
  'Appointment booking': 'Booking',
  Registration: 'Register',
  'Arrival / check-in': 'Check-in',
  Consultation: 'Consult',
  'Diagnostic services': 'Diagnostics',
  'Medication dispensing': 'Pharmacy',
  Admission: 'Admission',
  'Inpatient stay': 'IP stay',
  'Follow-up': 'Follow-up',
  'Waiting time': 'Wait time',
  'Staff communication': 'Staff comm.',
  'Care coordination': 'Care coord.',
  'Facility & environment': 'Facility',
  'Billing & admin': 'Billing',
  'Discharge planning': 'DC plan',
  'Medication information': 'Med info',
  'Appointment availability': 'Appt avail.',
  'Respect and dignity': 'Respect',
  Privacy: 'Privacy',
  'Information clarity': 'Info clear',
  'Facility environment': 'Facility',
  'Medication communication': 'Med comm.',
  'Discharge coordination': 'DC coord.',
  'Billing communication': 'Bill comm.',
  'Outpatient clinics': 'OP clinics',
  'Medicine wards': 'Medicine',
  'Surgery wards': 'Surgery',
  'Women & children': 'W&C',
  Diagnostics: 'Diagnost.',
  Pharmacy: 'Pharmacy',
  'Intensive care': 'ICU',
  'Emergency care': 'ED care',
  'Ambulatory care': 'Ambulatory',
  'Medical inpatient': 'Med IP',
  'Surgical inpatient': 'Surg IP',
  'Maternity & pediatrics': 'Mat/Ped',
  'Critical care': 'Critical',
  'Diagnostics & pharmacy': 'Dx/Rx',
  '≤2 days': '≤2 d',
  '3–7 days': '3–7 d',
  '8–14 days': '8–14 d',
  '>14 days': '>14 d',
  'Open / in progress': 'Open',
  'Closed in period': 'Closed',
  Withdrawn: 'Withdrawn',
  'Reopened events': 'Reopened',
  'Escalated (events)': 'Escalated',
  '<7.0': '<7.0',
  '7.0–7.9': '7.0–7.9',
  '8.0–8.9': '8.0–8.9',
  '≥9.0': '≥9.0',
  'Overall vs target': 'vs Target',
  'Response coverage': 'Coverage',
  'Overdue complaints': 'Overdue',
  'Negative feedback share': 'Neg. share',
  'Emerging themes': 'Emerging',
  'Survey coverage / sample size': 'Sample size',
  'Journey linkage gaps': 'Link gaps',
  'Complaint investigation capacity': 'Invest. cap.',
  'Cross-domain operational limits': 'Ops limits',
  'Current overall': 'Current',
  'Scenario overall': 'Scenario',
  Target: 'Target',
};

function axis(labels: string[]): string[] {
  return labels.map((label) => {
    if (PX_AXIS[label]) return PX_AXIS[label];
    if (label.length <= 12) return label;
    const words = label.split(/\s+/);
    if (words.length >= 2) return words.map((word) => word.slice(0, 6)).join(' ').slice(0, 14);
    return label.slice(0, 12);
  });
}

function fig(type: Figure['type'], title: string, categories: string[], series: Figure['series'], unit: string, note: string, extra?: Partial<Figure>): Figure {
  const digits = unit === '%' || unit === 'days' || unit === 'hours' || unit === 'min' || unit === 'rate' || unit === 'index' || unit === 'score' || unit === 'pts' ? 1 : 0;
  return { type, title, categories: axis(categories), series, unit, digits, note, domain: 'patient-experience', subjects: [title], ...extra };
}

function sampleNote(view: View): string {
  const thin = view.departmentRows.filter((item) => !item.adequateSample).length;
  if (view.eligibleCompleted < view.minDeptSample) {
    return `Low sample: ${num(view.eligibleCompleted)} eligible completions — interpret scores with caution (min dept sample ${view.minDeptSample}).`;
  }
  if (thin > 0) {
    return `${thin} department(s) below minimum sample ${view.minDeptSample} — those scores are flagged, not suppressed.`;
  }
  return `Eligible completions ${num(view.eligibleCompleted)} · instrument ${view.instrument.id}.`;
}

function Alerts({ packed = false }: { packed?: boolean } = {}) {
  const store = useShowcase();
  const copilot = useCopilot();
  const view = useView();
  const { period } = usePeriod();
  const alerts = alertsFor(store.hospital, store.year).filter((alert) => alert.department === 'Patient Experience' && alert.severity !== 'info');
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
              Patient Experience within management thresholds · open Vital Assist
            </button>
          </li>
        )}
      </ul>
      {period === 'year' ? null : <p>These alerts use the full reporting year. The scores above use the selected period.</p>}
      <div className="gc-next">
        <h2>Management action</h2>
        <p>
          Review overall satisfaction ({num(view.overallSatisfaction, 1)}/10), unresolved issues ({num(view.unresolvedIssues)}),
          and overdue complaints ({num(view.overdueComplaints)}) for {view.periodLabel}.
        </p>
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
    <section className="gc-panel span-12 gc-scope gc-scope-tight" data-testid="px-indicator-catalog">
      <div className="gc-scope-head">
        <div>
          <h2>Performance indicators</h2>
          <p>
            Definition catalog for this screen — full names, formulas, units, and ownership. Headline numbers stay in the KPI ribbon above.
            Operational waits, bed occupancy, and ICU capacity stay in Domains 1–10 — supporting context only here.
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
          <p>Illustrative patient-experience improvement intelligence · not official HCAHPS reporting or a clinical decision engine</p>
        </div>
      </div>
      <div className="gc-scope-grid gc-scope-grid-dense">
        {PX_AI_CASES.map((item) => (
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

export function PxCommandPage() {
  const view = useView();
  const prior = usePrior();
  return (
    <Page
      title={PX_SCREEN_TITLES.command}
      kpis={ribbon('command', {
        kpi_px_overall_satisfaction: {
          value: `${num(view.overallSatisfaction, 1)}/10`,
          delta: compare(view, prior, (item) => item.overallSatisfaction),
          tone: view.overallSatisfaction < view.overallTarget - 0.3 ? 'alert' : view.overallSatisfaction < view.overallTarget ? 'watch' : 'good',
          scope: `${view.hospital} · ${view.periodLabel}. Scale 0–10 (not /100). Valid overall answers n=${num(view.overallCount)}. Target ${num(view.overallTarget, 1)}/10. Instrument ${view.instrument.id} v${view.instrument.version}.`,
          formula: 'Σ Q_OVERALL ÷ eligible overall answers',
          limitations: `${view.methodology.instrument} Missing overall answers are excluded from the mean (not zero-imputed).`,
        },
        kpi_px_response_rate: {
          value: pct(view.responseRate),
          delta: compare(view, prior, (item) => item.responseRate, true),
          tone: view.responseRate < 0.3 ? 'alert' : view.responseRate < 0.35 ? 'watch' : 'good',
          scope: `${view.hospital} · ${view.periodLabel}. Eligible invitations ${num(view.eligibleInvitations)} · raw completions ${num(view.completionsRaw)} · duplicates discarded ${num(view.duplicateCompletions)} · eligible completed ${num(view.eligibleCompleted)}. Instrument ${view.instrument.id}.`,
          formula: 'eligibleCompleted ÷ eligibleInvitations',
          limitations: view.methodology.responseRate,
        },
        kpi_px_positive_share: {
          value: pct(view.positiveShare),
          delta: compare(view, prior, (item) => item.positiveShare, true),
          scope: `Survey cohort: ${num(view.topBox)} top-box (9–10) of ${num(view.overallCount)} eligible overall ratings · ${view.periodLabel}.`,
          formula: 'Top-box ÷ eligible overall survey ratings',
        },
        kpi_px_negative_share: {
          value: pct(view.negativeShare),
          delta: compare(view, prior, (item) => item.negativeShare, true),
          tone: view.negativeShare >= 0.28 ? 'alert' : view.negativeShare >= 0.2 ? 'watch' : 'good',
          scope: `Negative Survey Rating Share — survey bottom-box (0–6): ${num(view.bottomBox)} of ${num(view.overallCount)} eligible overall ratings. Not the same as Negative Comment Sentiment Share on Voice.`,
          formula: 'Bottom-box ÷ eligible overall survey ratings',
          limitations: 'Survey rating distribution ≠ free-text sentiment polarity. Different grains and cohorts.',
        },
        kpi_px_recommendation: {
          value: `${num(view.recommendationScore, 1)} pts`,
          delta: compare(view, prior, (item) => item.recommendationScore),
          scope: `${view.recommendationLabel}: promoters ${pct(view.promoterShare)} − detractors ${pct(view.detractorShare)} on Q_RECOMMEND (n=${num(view.recommendCount)}). Points index, not a 0–10 mean.`,
          formula: '(%promoters − %detractors) × 100',
          limitations: view.methodology.recommendation,
        },
        kpi_px_unresolved_issues: {
          value: num(view.unresolvedIssues),
          delta: compare(view, prior, (item) => item.unresolvedIssues),
          tone: view.unresolvedIssues >= 40 ? 'alert' : view.unresolvedIssues >= 20 ? 'watch' : 'good',
          scope: `${num(view.complaintsOpen)} open complaints + ${num(view.highPriorityUnreviewed)} high-priority unreviewed · ${view.observationDate}.`,
          formula: 'Open complaints + high-priority unreviewed',
        },
      })}
    >
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('area', 'Patient Experience Trend', view.labels, [
            { name: 'Overall', values: view.surveyTrend.map((item) => item.overall) },
          ], 'score', `Monthly overall mean on ${view.instrument.id}. Period mean ${num(view.overallSatisfaction, 1)}. ${sampleNote(view)}`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Alerts packed />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Satisfaction by Care Setting', view.settingRows.map((item) => item.name), [
            { name: 'Score', values: view.settingRows.map((item) => item.score) },
          ], 'score', `Setting scores use eligible completions. ${view.settingRows.map((item) => `${item.name} n=${item.responses}`).join(' · ')}. ${sampleNote(view)}`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Experience Dimension Performance', view.dimensionRows.map((item) => item.name), [
            { name: 'Score', values: view.dimensionRows.map((item) => item.score) },
          ], 'score', `Numerator/denominator means. Lowest: ${view.lowestDimension} (${num(view.lowestDimensionScore, 1)}).`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Survey Responses Trend', view.labels, [
            { name: 'Invitations', values: view.surveyTrend.map((item) => item.invitations) },
            { name: 'Completed', values: view.surveyTrend.map((item) => item.completed) },
          ], 'count', `Eligible completions exclude duplicates. Period response rate ${pct(view.responseRate)}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Patient Experience Distribution', view.experienceDistribution.map((item) => String(item.score)), [
            { name: 'Responses', values: view.experienceDistribution.map((item) => item.count) },
          ], 'responses', `0–10 overall rating bins sum to ${num(view.overallCount)}. Not official HCAHPS.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Priority Experience Signals', view.prioritySignals.map((item) => item.name), [
            { name: 'Signal index', values: view.prioritySignals.map((item) => (
              item.severity === 'high' ? 3 : item.severity === 'medium' ? 2 : 1
            )) },
          ], 'index', `Leadership attention signals for ${view.periodLabel}. Full labels preserved in tooltips.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <section className="gc-panel gc-insight">
            <h2>Sample & instrument</h2>
            <div className="gc-exception-list">
              <div className="gc-exception gc-tone-neutral"><strong>Instrument</strong><span>{view.instrument.id} v{view.instrument.version}</span></div>
              <div className={`gc-exception ${view.eligibleCompleted < view.minDeptSample ? 'gc-tone-watch' : 'gc-tone-neutral'}`}>
                <strong>Eligible completions</strong>
                <span>{num(view.eligibleCompleted)} · min dept sample {view.minDeptSample}</span>
              </div>
              <div className="gc-exception gc-tone-neutral"><strong>Official benchmarking</strong><span>Unavailable — internal instrument only</span></div>
            </div>
            <p className="gc-next">{sampleNote(view)}</p>
          </section>
        </div>
      </div>
      <IndicatorIndex indicators={pxIndicatorsFor(view)} domains={['Survey']} />
    </Page>
  );
}

export function PxJourneyPage() {
  const view = useView();
  const prior = usePrior();
  const waitSetting = view.settingRows.map((item) => ({
    name: item.name,
    waiting: Math.max(0, Math.min(10, view.waitingScore + (item.score - view.overallSatisfaction))),
    overall: item.score,
  }));
  return (
    <Page
      title={PX_SCREEN_TITLES.journey}
      kpis={ribbon('journey', {
        kpi_px_journey_satisfaction: {
          value: `${num(view.journeySatisfaction, 1)}/10`,
          delta: compare(view, prior, (item) => item.journeySatisfaction),
          scope: `Linked journeys ${num(view.linkedJourneyResponses)} · unlinked ${num(view.unlinkedJourneyResponses)} · linkage ${pct(view.journeyLinkageCoverage)} · ${view.periodLabel}.`,
          formula: 'Mean of linked touchpoint dimensions (0–10)',
          limitations: view.methodology.journey,
        },
        kpi_px_waiting_score: {
          value: `${num(view.waitingScore, 1)}/10`,
          delta: compare(view, prior, (item) => item.waitingScore),
          tone: view.waitingScore < 7.2 ? 'alert' : view.waitingScore < 7.8 ? 'watch' : 'good',
          scope: `Waiting dimension 0–10 · supporting ED wait ${num(view.operationalContext.edWaitMedianMin)} min (context only — correlation ≠ causation).`,
          formula: 'Mean waiting score (0–10)',
        },
        kpi_px_communication_score: {
          value: `${num(view.communicationScore, 1)}/10`,
          delta: compare(view, prior, (item) => item.communicationScore),
          scope: `Communication dimension 0–10 · ${view.periodLabel}.`,
          formula: 'Mean communication score (0–10)',
        },
        kpi_px_coordination_score: {
          value: `${num(view.coordinationScore, 1)}/10`,
          delta: compare(view, prior, (item) => item.coordinationScore),
          scope: `Care-coordination dimension 0–10 · ${view.periodLabel}.`,
          formula: 'Mean coordination score (0–10)',
        },
        kpi_px_discharge_score: {
          value: `${num(view.dischargeScore, 1)}/10`,
          delta: compare(view, prior, (item) => item.dischargeScore),
          tone: view.dischargeScore < 7.4 ? 'watch' : 'good',
          scope: `Discharge answers among eligible discharges surveyed · 0–10 scale · ${view.periodLabel}.`,
          formula: 'Mean discharge score (0–10)',
        },
        kpi_px_negative_touchpoint_share: {
          value: pct(view.negativeTouchpointShare),
          delta: compare(view, prior, (item) => item.negativeTouchpointShare, true),
          tone: view.negativeTouchpointShare >= 0.3 ? 'alert' : view.negativeTouchpointShare >= 0.2 ? 'watch' : 'good',
          scope: `${num(view.touchpointNegative)} of ${num(view.touchpointRatings)} linked touchpoint ratings ≤6.`,
          formula: '≤6 ratings ÷ linked touchpoint ratings',
          limitations: `${num(view.unlinkedJourneyResponses)} unlinked completions retained without fabricated joins.`,
        },
      })}
    >
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Patient Journey Experience Map', view.touchpointRows.map((item) => item.name), [
            { name: 'Score', values: view.touchpointRows.map((item) => item.score) },
          ], 'score', `Journey stages with linked ratings. Linkage coverage ${pct(view.journeyLinkageCoverage)}. ${sampleNote(view)}`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Satisfaction by Touchpoint', [...view.touchpointRows].sort((a, b) => a.score - b.score).map((item) => item.name), [
            { name: 'Score', values: [...view.touchpointRows].sort((a, b) => a.score - b.score).map((item) => item.score) },
          ], 'score', 'Touchpoints ordered lowest→highest. Unlinked responses stay in aggregates without fabricated joins.')} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Experience by Service Setting', view.settingRows.map((item) => item.name), [
            { name: 'Journey score', values: view.settingRows.map((item) => item.score) },
          ], 'score', `Service-setting journey experience. Sample: ${view.settingRows.map((item) => `${item.name} n=${item.responses}`).join(' · ')}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Waiting vs Reported Experience', waitSetting.map((item) => item.name), [
            { name: 'Waiting', values: waitSetting.map((item) => item.waiting) },
            { name: 'Overall', values: waitSetting.map((item) => item.overall) },
          ], 'score', 'Correlation view only — not causation. Operational waits are supporting context from Access / ED, not PX headlines.')} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Communication Experience', view.settingRows.map((item) => item.name), [
            { name: 'Communication', values: view.settingRows.map((item) => Math.max(0, Math.min(10, view.communicationScore + (item.score - view.overallSatisfaction) * 0.6))) },
          ], 'score', `Hospital communication mean ${num(view.communicationScore, 1)}. Not a clinician performance ranking.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Discharge Journey Feedback', view.settingRows.map((item) => item.name), [
            { name: 'Discharge', values: view.settingRows.map((item) => Math.max(0, Math.min(10, view.dischargeScore + (item.score - view.overallSatisfaction) * 0.5))) },
          ], 'score', `Discharge dimension mean ${num(view.dischargeScore, 1)}. Supporting discharges ${num(view.operationalContext.discharges)} (context only).`)} />
        </div>
      </div>
      <IndicatorIndex indicators={pxIndicatorsFor(view)} domains={['Journey']} />
    </Page>
  );
}

export function PxComplaintsPage() {
  const view = useView();
  const prior = usePrior();
  return (
    <Page
      title={PX_SCREEN_TITLES.complaints}
      kpis={ribbon('complaints', {
        kpi_px_complaints_total: {
          value: num(view.complaintsTotal),
          delta: compare(view, prior, (item) => item.complaintsTotal),
          scope: `${num(view.complaintsTotal)} received · ledger balanced=${view.complaintLedgerBalanced ? 'yes' : 'no'} · ${view.periodLabel}.`,
          formula: 'Complaints received in period',
          limitations: view.methodology.complaints,
        },
        kpi_px_complaints_open: {
          value: num(view.complaintsOpen),
          delta: compare(view, prior, (item) => item.complaintsOpen),
          tone: view.complaintsOpen >= 25 ? 'alert' : view.complaintsOpen >= 12 ? 'watch' : 'good',
          scope: `Closing open ${num(view.complaintClosingOpen)} · opening ${num(view.complaintOpeningOpen)} · ${view.observationDate}.`,
          formula: 'opening + new + reopened − closed − withdrawn',
        },
        kpi_px_median_resolution: {
          value: `${num(view.medianResolutionDays, 1)} d`,
          delta: compare(view, prior, (item) => item.medianResolutionDays),
          tone: view.medianResolutionDays > view.resolutionTargetDays ? 'watch' : 'good',
          scope: `Median ${num(view.medianResolutionDays, 1)} · P90 ${num(view.p90ResolutionDays, 1)} · target ${view.resolutionTargetDays} d.`,
          formula: 'Median(received → resolved)',
          limitations: 'Closed ≠ patient satisfied.',
        },
        kpi_px_overdue_complaints: {
          value: num(view.overdueComplaints),
          delta: compare(view, prior, (item) => item.overdueComplaints),
          tone: view.overdueComplaints > 12 ? 'alert' : view.overdueComplaints > 5 ? 'watch' : 'good',
          scope: `Open past illustrative ${view.resolutionTargetDays}-day / ${view.ackTargetHours}h ack target.`,
          formula: 'Open past target',
        },
        kpi_px_first_contact_resolution: {
          value: pct(view.firstContactResolution),
          delta: compare(view, prior, (item) => item.firstContactResolution, true),
          scope: `Closed without reopen among ${num(view.complaintsClosed)} closed.`,
          formula: 'Closed without reopen ÷ closed',
        },
        kpi_px_reopen_rate: {
          value: pct(view.reopenRate),
          delta: compare(view, prior, (item) => item.reopenRate, true),
          tone: view.reopenRate >= 0.12 ? 'alert' : view.reopenRate >= 0.08 ? 'watch' : 'good',
          scope: `${num(view.complaintsReopened)} reopen events in ${view.periodLabel}.`,
          formula: 'Reopened ÷ previously closed',
        },
      })}
    >
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Complaints Trend', view.labels, [
            { name: 'New', values: view.complaintTrend.map((item) => item.newComplaints) },
            { name: 'Closed', values: view.complaintTrend.map((item) => item.closed) },
          ], 'complaints', `Monthly new vs closed. Period new ${num(view.complaintsNew)} · closed ${num(view.complaintsClosed)}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Complaints by Category', view.complaintByCategory.map((item) => item.name), [
            { name: 'Complaints', values: view.complaintByCategory.map((item) => item.count) },
          ], 'complaints', `Categories sum to ${num(view.complaintsTotal)}. Service recovery ledger — not clinical severity.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Complaint Aging', view.complaintAging.map((item) => item.name), [
            { name: 'Open', values: view.complaintAging.map((item) => item.count) },
          ], 'complaints', `Aging bands sum to open stock ${num(view.complaintsOpen)}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Resolution Time Distribution', view.resolutionBands.map((item) => item.name), [
            { name: 'Closed', values: view.resolutionBands.map((item) => item.count) },
          ], 'complaints', `Closed resolutions in period. Median ${num(view.medianResolutionDays, 1)} days.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Complaint Status Breakdown', view.complaintStatus.map((item) => item.name), [
            { name: 'Count', values: view.complaintStatus.map((item) => item.count) },
          ], 'complaints', 'Status mix at observation. Closed status is not proof of satisfaction.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Escalation and Reopening Patterns', ['Reopened', 'Escalated', 'Overdue', 'Withdrawn'], [
            { name: 'Events', values: [
              view.complaintsReopened,
              view.complaintStatus.find((item) => item.name.startsWith('Escalated'))?.count ?? 0,
              view.overdueComplaints,
              view.complaintsWithdrawn,
            ] },
          ], 'events', `Reopen rate ${pct(view.reopenRate)}. Safety-flagged items require human review.`)} />
        </div>
      </div>
      <IndicatorIndex indicators={pxIndicatorsFor(view)} domains={['Complaints']} />
    </Page>
  );
}

export function PxVoicePage() {
  const view = useView();
  const prior = usePrior();
  const themeDeptTop = [...view.themeByDepartment].sort((a, b) => b.negativeTotal - a.negativeTotal).slice(0, 8);
  return (
    <Page
      title={PX_SCREEN_TITLES.voice}
      kpis={ribbon('voice', {
        kpi_px_comments_analyzed: {
          value: num(view.commentsAnalyzed),
          delta: compare(view, prior, (item) => item.commentsAnalyzed),
          scope: `${num(view.commentsAnalyzed)} analyzed · EN/AR synthetic templates · ${view.periodLabel}.`,
          formula: 'Comments with theme/sentiment labels',
          limitations: view.methodology.voice,
        },
        kpi_px_negative_feedback_share: {
          value: pct(view.negativeFeedbackShare),
          delta: compare(view, prior, (item) => item.negativeFeedbackShare, true),
          tone: view.negativeFeedbackShare > 0.35 ? 'alert' : view.negativeFeedbackShare > 0.28 ? 'watch' : 'good',
          scope: `Negative Comment Sentiment Share: ${num(view.negativeComments)} negative of ${num(view.commentsAnalyzed)} analyzed comments · ${view.periodLabel}. Distinct from Neg. Survey Share on Command.`,
          formula: 'Negative-sentiment comments ÷ analyzed comments',
          limitations: 'Comment polarity ≠ survey bottom-box. Sentiment is not clinical harm.',
        },
        kpi_px_emerging_themes: {
          value: num(view.emergingThemes),
          delta: compare(view, prior, (item) => item.emergingThemes),
          tone: view.emergingThemes >= 4 ? 'alert' : view.emergingThemes >= 2 ? 'watch' : 'good',
          scope: `${num(view.emergingThemes)} themes rising vs baseline with negative polarity.`,
          formula: 'Rising negative themes',
        },
        kpi_px_high_priority_feedback: {
          value: num(view.highPriorityFeedback),
          delta: compare(view, prior, (item) => item.highPriorityFeedback),
          tone: view.highPriorityFeedback >= 20 ? 'alert' : view.highPriorityFeedback >= 10 ? 'watch' : 'good',
          scope: `Safety or pending-review flags · ${view.observationDate}.`,
          formula: 'Priority / pending review flags',
        },
        kpi_px_theme_review_coverage: {
          value: pct(view.themeReviewCoverage),
          delta: compare(view, prior, (item) => item.themeReviewCoverage, true),
          scope: `Human-reviewed classifications among analyzed comments.`,
          formula: 'Human-reviewed ÷ analyzed',
        },
      })}
    >
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Sentiment Trend', view.labels, [
            { name: 'Comments', values: view.sentimentTrend.map((item) => item.comments) },
            { name: 'Negative', values: view.sentimentTrend.map((item) => item.negative) },
          ], 'comments', `Monthly comment volume vs negative. Period negative share ${pct(view.negativeFeedbackShare)}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Feedback Themes', view.themeCounts.map((item) => item.name), [
            { name: 'Comments', values: view.themeCounts.map((item) => item.count) },
          ], 'comments', `Theme frequency across ${num(view.commentsAnalyzed)} analyzed comments. Labels are synthetic.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Top Positive Topics', view.topPositiveTopics.map((item) => item.name), [
            { name: 'Positive lean', values: view.topPositiveTopics.map((item) => Math.max(0, item.count - item.negative)) },
          ], 'comments', 'Topics with the strongest non-negative lean. Not real patient quotes.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Top Negative Topics', view.topNegativeTopics.map((item) => item.name), [
            { name: 'Negative', values: view.topNegativeTopics.map((item) => item.negative) },
          ], 'comments', 'Recurring negative themes. Safety-flagged items require human review.')} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Theme Frequency by Department', themeDeptTop.map((item) => item.department), [
            { name: 'Negative themes', values: themeDeptTop.map((item) => item.negativeTotal) },
          ], 'comments', `Departments with the highest negative theme counts. Low sample departments: interpret with caution.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Emerging Experience Issues', (view.emergingThemeRows.length ? view.emergingThemeRows : view.topNegativeTopics.slice(0, 4)).map((item) => item.name), [
            { name: 'Negative', values: (view.emergingThemeRows.length ? view.emergingThemeRows : view.topNegativeTopics.slice(0, 4)).map((item) => item.negative) },
          ], 'comments', view.emergingThemeRows.length
            ? `${num(view.emergingThemes)} emerging themes vs prior-period baseline.`
            : 'No emerging themes above threshold — showing top negative topics as empty-state friendly fallback.')} />
        </div>
      </div>
      <IndicatorIndex indicators={pxIndicatorsFor(view)} domains={['Voice']} />
    </Page>
  );
}

export function PxDepartmentsPage() {
  const view = useView();
  const prior = usePrior();
  const opportunity = [...view.departmentRows]
    .filter((item) => item.adequateSample)
    .sort((a, b) => a.score - b.score)
    .slice(0, 8);
  const thinDepts = view.departmentRows.filter((item) => !item.adequateSample);
  return (
    <Page
      title={PX_SCREEN_TITLES.departments}
      kpis={ribbon('departments', {
        kpi_px_depts_meeting_target: {
          value: num(view.deptsMeetingTarget),
          delta: compare(view, prior, (item) => item.deptsMeetingTarget),
          tone: view.deptsMeetingTarget <= 2 ? 'watch' : 'good',
          scope: `${num(view.deptsMeetingTarget)} of ${view.departmentRows.length} ≥ ${num(view.overallTarget, 1)} with n≥${view.minDeptSample}.`,
          formula: 'Score ≥ target and adequate sample',
        },
        kpi_px_lowest_dimension: {
          value: `${num(view.lowestDimensionScore, 1)}/10`,
          delta: compare(view, prior, (item) => item.lowestDimensionScore),
          tone: view.lowestDimensionScore < 7.5 ? 'watch' : 'good',
          scope: `Lowest dimension: ${view.lowestDimension} (${num(view.lowestDimensionScore, 1)}/10). Small-sample departments are not ranked against large samples without qualification.`,
          formula: 'Argmin of dimension means (0–10)',
        },
        kpi_px_coverage_gap: {
          value: num(view.coverageGap),
          delta: compare(view, prior, (item) => item.coverageGap),
          tone: view.coverageGap >= 3 ? 'alert' : view.coverageGap >= 1 ? 'watch' : 'good',
          scope: `${num(view.coverageGap)} departments below min sample ${view.minDeptSample}. Thin samples are coverage warnings, not automatic poor performance.`,
          formula: 'Departments below minimum sample',
        },
        kpi_px_material_variance: {
          value: `${num(view.materialVariance, 1)} pts`,
          delta: compare(view, prior, (item) => item.materialVariance),
          scope: `Max−min among adequate-sample departments only (n≥${view.minDeptSample}) · ${view.periodLabel}.`,
          formula: 'Max − min adequate scores',
        },
        kpi_px_depts_requiring_review: {
          value: num(view.deptsRequiringReview),
          delta: compare(view, prior, (item) => item.deptsRequiringReview),
          tone: view.deptsRequiringReview >= 3 ? 'alert' : view.deptsRequiringReview >= 1 ? 'watch' : 'good',
          scope: `Below target or elevated negative share with adequate sample. Not individual clinician ranking.`,
          formula: 'Departments needing review',
        },
      })}
    >
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Experience by Department', view.departmentRows.map((item) => item.name), [
            { name: 'Score', values: view.departmentRows.map((item) => item.score) },
          ], 'score', `Scores shown with sample flags. ${thinDepts.length ? `${thinDepts.length} dept(s) n<${view.minDeptSample} — interpret with caution.` : sampleNote(view)}`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Experience by Service Line', view.serviceLineRows.map((item) => item.name), [
            { name: 'Score', values: view.serviceLineRows.map((item) => item.score) },
          ], 'score', `Same internal instrument across service lines. ${view.serviceLineRows.map((item) => `${item.name} n=${item.responses}`).join(' · ')}.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Satisfaction Distribution', view.deptSatDistribution.map((item) => item.name), [
            { name: 'Departments', values: view.deptSatDistribution.map((item) => item.count) },
          ], 'departments', 'Department overall-score bands (not patient-level distribution).')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Response Coverage by Department', view.departmentRows.map((item) => item.name), [
            { name: 'Responses', values: view.departmentRows.map((item) => item.responses) },
          ], 'responses', `Min sample ${view.minDeptSample}. Thin coverage: ${thinDepts.length ? thinDepts.map((item) => item.name).join(', ') : 'none'}.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Experience Trends by Care Setting', view.labels, view.settingTrend.map((row) => ({
            name: row.name,
            values: row.monthly,
          })), 'score', `Monthly setting scores for ${view.periodLabel}. Internal instrument only.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Opportunity Matrix', (opportunity.length ? opportunity : view.departmentRows).map((item) => item.name), [
            { name: 'Score', values: (opportunity.length ? opportunity : view.departmentRows).map((item) => item.score) },
            { name: 'Neg %', values: (opportunity.length ? opportunity : view.departmentRows).map((item) => Math.round(item.negativeShare * 1000) / 10) },
          ], 'index', opportunity.length
            ? 'Low scores with adequate sample — priority review candidates.'
            : `Empty-state: no department yet meets min sample ${view.minDeptSample}; showing all scores for orientation.`)} />
        </div>
      </div>
      <IndicatorIndex indicators={pxIndicatorsFor(view)} domains={['Departments']} />
    </Page>
  );
}

export function PxOptimizationPage() {
  const view = useView();
  const prior = usePrior();
  return (
    <Page
      title={PX_SCREEN_TITLES.optimization}
      kpis={ribbon('optimization', {
        kpi_px_addressable_gap: {
          value: `${num(view.addressableGap, 1)} pts`,
          delta: compare(view, prior, (item) => item.addressableGap),
          scope: `${num(view.overallSatisfaction, 1)}/10 → target ${num(view.overallTarget, 1)}/10 · ${view.periodLabel}. Gap in 0–10 points — illustrative only.`,
          formula: 'Target − current overall',
          limitations: view.methodology.optimization,
        },
        kpi_px_improvement_opportunities: {
          value: num(view.improvementOpportunities),
          delta: compare(view, prior, (item) => item.improvementOpportunities),
          scope: `${num(view.improvementOpportunities)} eligible actions with evidence, owner, and follow-up measure.`,
          formula: 'Prioritized opportunity count',
        },
        kpi_px_modeled_uplift: {
          value: `${num(view.modeledUplift, 1)} pts`,
          delta: compare(view, prior, (item) => item.modeledUplift),
          scope: `Illustrative overall-score points on the 0–10 scale under documented assumptions — not realized results.`,
          formula: 'Constrained modeled uplift',
          limitations: 'Illustrative — not achieved. Not a financial savings claim.',
        },
        kpi_px_complaint_reduction: {
          value: num(view.complaintReduction),
          delta: compare(view, prior, (item) => item.complaintReduction),
          scope: `Eligible preventable complaints under scenario assumptions.`,
          formula: 'Σ opportunity complaint reductions',
        },
        kpi_px_priority_coverage: {
          value: pct(view.priorityCoverage),
          delta: compare(view, prior, (item) => item.priorityCoverage, true),
          scope: `Priority actions with assigned owner ÷ priority opportunities.`,
          formula: 'Owned priorities ÷ priority opportunities',
        },
      })}
    >
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Improvement Opportunities', view.opportunities.map((item) => item.title), [
            { name: 'Modeled pts', values: view.opportunities.map((item) => item.modeledUpliftPoints) },
          ], 'pts', `Six illustrative opportunities. Impacts assumed — not guaranteed. ${sampleNote(view)}`)} />
        </div>
        <div className="gc-ed-pack-col">
          <section className="gc-panel gc-insight">
            <h2>Management decisions</h2>
            <div className="gc-exception-list">
              {view.opportunities.filter((item) => item.priority).slice(0, 3).map((item) => (
                <div key={item.id} className="gc-exception gc-tone-neutral">
                  <strong>{item.title}</strong>
                  <span>+{num(item.modeledUpliftPoints, 1)} pts · {item.owner}</span>
                </div>
              ))}
            </div>
            <p className="gc-next">Estimates are illustrative. AI does not close complaints or change clinical care alone, invent survey responses, or claim official HCAHPS results.</p>
          </section>
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Current vs Scenario Experience', ['Current overall', 'Scenario overall', 'Target'], [
            { name: 'Score', values: [view.overallSatisfaction, Math.min(10, view.overallSatisfaction + view.modeledUplift), view.overallTarget] },
          ], 'score', 'Full labels: Current overall, Scenario overall, Target. Scenario uplift is illustrative only.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Complaint Reduction Potential', view.opportunities.map((item) => item.theme), [
            { name: 'Eligible', values: view.opportunities.map((item) => item.complaintReduction) },
          ], 'complaints', `Addressable complaint potential by theme. Total ${num(view.complaintReduction)} — not every complaint is preventable.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Experience Improvement by Touchpoint', view.touchpointImprovement.map((item) => item.name), [
            { name: 'Baseline', values: view.touchpointImprovement.map((item) => item.baselineScore) },
            { name: 'Modeled', values: view.touchpointImprovement.map((item) => item.modeledScore) },
          ], 'score', 'Weakest linked touchpoints with illustrative modeled gain. Constrained by linkage coverage.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Implementation Constraints', view.constraints.map((item) => item.name), [
            { name: 'Attention', values: view.constraints.map((_, index) => 4 - index) },
          ], 'index', view.constraints.map((item) => `${item.name}: ${item.detail}`).join(' · '))} />
        </div>
      </div>
      <IndicatorIndex indicators={pxIndicatorsFor(view)} domains={['Optimization', 'Cross-domain context']} />
      <AiIndex />
    </Page>
  );
}
