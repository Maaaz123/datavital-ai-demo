import { useMemo, useState, type ReactNode } from 'react';
import { useShowcase } from '@/showcase/state';
import { alertsFor } from './alerts';
import { splitExact } from './ipdView';
import { RCM_AI_CASES, rcmIndicatorsFor, type Indicator } from './rcmScope';
import {
  ownersForRcmScreen,
  RCM_SCREEN_TITLES,
  type RcmScreenId,
} from './rcmOwnership';
import { buildRcmView, rcmIdentityIssues, RCM_TARGETS, type RcmView } from './rcmView';
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
type View = RcmView;

function useView(): View {
  const store = useShowcase();
  const { period } = usePeriod();
  return useMemo(() => buildRcmView(store.hospital, store.year, period), [store.hospital, store.year, period]);
}

function usePrior(): View {
  const store = useShowcase();
  const { period } = usePeriod();
  const year = store.year <= 2024 ? 2024 : store.year - 1;
  return useMemo(() => buildRcmView(store.hospital, year, period), [store.hospital, year, period]);
}

function num(value: number, digits = 0): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function pct(value: number): string {
  const shown = value * 100;
  if (shown !== 0 && Math.abs(shown) < 0.1) return `${shown.toFixed(3)}%`;
  return `${shown.toFixed(1)}%`;
}

/** Money display: SAR with grouped digits. */
function sar(value: number): string {
  return `SAR ${num(value)}`;
}

/** Day measures display: X.X d. */
function days(value: number): string {
  return `${num(value, 1)} d`;
}

/** Higher-is-better tone against a target. */
function high(value: number, target: number, band = 0.03): Tone {
  if (value >= target) return 'good';
  return value >= target - band ? 'watch' : 'alert';
}

/** Lower-is-better tone against a target. */
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

/** Build ribbon KPIs from ownership so every owner.id gets data-testid={`value-${owner.id}`}. */
function ribbon(screen: RcmScreenId, values: Record<string, RibbonRow>) {
  return ownersForRcmScreen(screen).map((owner) => {
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

function Disclosure() {
  return (
    <section className="gc-panel gc-insight span-12" data-testid="rcm-disclosure">
      <h2>Data scope</h2>
      <p>
        Synthetic demo data — not an ERP and not a live claims engine; no claims are submitted to payers.
        Simulated recovery is illustrative and is not collected cash. Contractual adjustments are not revenue leakage.
        Amounts are SAR; all figures are deterministic and reconcile to the ledger conventions on this domain.
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
          <p className="gc-kicker">Revenue Cycle Management</p>
          <h1>{title}</h1>
        </div>
      </header>
      <div className="gc-ribbon" data-testid="rcm-ribbon">
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

/** Axis-safe short labels so charts do not ellipsize RCM categories. */
const RCM_AXIS: Record<string, string> = {
  'National Health Fund': 'Natl Health',
  'Cooperative Care': 'Coop Care',
  'Employer Alliance': 'Employer',
  'Self-Pay / Patient': 'Self-Pay',
  'Regional Mutual': 'Regional',
  'Eligibility issues': 'Eligibility',
  'Missing authorization': 'Missing auth',
  'Coding/documentation': 'Coding/doc',
  'Duplicate claim': 'Duplicate',
  'Filing deadline': 'Filing',
  'Contractual dispute': 'Contract',
  'Medical necessity': 'Med. necessity',
  'Coverage exclusion': 'Exclusion',
  'Incorrect patient/payer info': 'Wrong info',
  'Emergency care': 'ED care',
  'Ambulatory care': 'Ambulatory',
  'Medical inpatient': 'Med IP',
  'Surgical inpatient': 'Surg IP',
  'Maternity & pediatrics': 'Mat/Ped',
  'Critical care': 'Critical',
  'Diagnostics & pharmacy': 'Dx/Rx',
  'Outpatient clinics': 'OP clinics',
  'Inpatient wards': 'IP wards',
  'Surgery & theatres': 'Surgery',
  'Intensive care': 'ICU',
  'Missed charges': 'Missed chg.',
  'Avoidable write-offs': 'Avoidable WO',
  'Contract underpayments': 'Underpaid',
  'Other write-offs': 'Other WO',
  'Unique claims': 'Unique',
  'First-pass accepted': 'First-pass',
  Adjudicated: 'Adjudicated',
  'Net collection rate': 'Net coll.',
  'Gross denial rate': 'Denial rate',
  'Days in AR': 'Days in AR',
  'Charge capture rate': 'Capture',
  'First-pass acceptance': 'First-pass',
  'Auth-related denials': 'Auth denials',
  'Pending requests': 'Pending',
  'Rejected requests': 'Rejected',
  'Ready for coding': 'Ready',
  'Coding complete': 'Complete',
  'Missing coding': 'No coding',
  'Charge mismatch': 'Mismatch',
  'Payer data gap': 'Payer gap',
  'Documentation hold': 'Doc hold',
  'Denied value': 'Denied',
  'Preventable (process)': 'Preventable',
  'Eligible recovery': 'Eligible',
  'Current cash applied': 'Current',
  'Scenario cash applied': 'Scenario',
  'Opening AR': 'Opening AR',
  'AR over 90 days': 'AR > 90 d',
  'Accelerated cash': 'Accelerated',
};

function axis(labels: string[]): string[] {
  return labels.map((label) => {
    if (RCM_AXIS[label]) return RCM_AXIS[label];
    if (label.length <= 12) return label;
    const words = label.split(/\s+/);
    if (words.length >= 2) return words.map((word) => word.slice(0, 6)).join(' ').slice(0, 14);
    return label.slice(0, 12);
  });
}

function fig(type: Figure['type'], title: string, categories: string[], series: Figure['series'], unit: string, note: string, extra?: Partial<Figure>): Figure {
  const digits = unit === '%' || unit === 'days' || unit === 'rate' || unit === 'index' || unit === 'SAR M' ? 1 : 0;
  return { type, title, categories: axis(categories), series, unit, digits, note, domain: 'rcm', subjects: [title], ...extra };
}

function mil(values: number[]): number[] {
  return values.map((value) => Math.round(value / 1e5) / 10);
}

function kilo(values: number[]): number[] {
  return values.map((value) => Math.round(value / 1e3));
}

function rate(values: number[]): number[] {
  return values.map((value) => Math.round(value * 1000) / 10);
}

function Alerts({ packed = false }: { packed?: boolean } = {}) {
  const store = useShowcase();
  const copilot = useCopilot();
  const view = useView();
  const { period } = usePeriod();
  const alerts = alertsFor(store.hospital, store.year, period).filter((alert) => alert.department === 'Revenue Cycle' && alert.severity !== 'info');
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
              Revenue Cycle within management thresholds · open Vital Assist
            </button>
          </li>
        )}
      </ul>
      <p>Alert scope matches the selected reporting period ({view.periodLabel}). Period-end stocks use the period-end snapshot.</p>
      <div className="gc-next">
        <h2>Management action</h2>
        <p>
          Review net collection rate ({pct(view.netCollectionRate)}), days in AR ({days(view.daysInAr)}),
          and gross denial rate ({pct(view.grossDenialRate)}) for {view.periodLabel}.
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
    <section className="gc-panel span-12 gc-scope gc-scope-tight" data-testid="rcm-indicator-catalog">
      <div className="gc-scope-head">
        <div>
          <h2>Performance indicators</h2>
          <p>
            Definition catalog for this screen — full names, formulas, units, and ownership. Headline numbers stay in the KPI ribbon above.
            Clinical volumes, occupancy, and patient-experience scores stay in their own domains — supporting context only here.
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
          <p>Illustrative revenue-cycle finance decision support · not clinical, not an ERP, and not a live payer submission engine</p>
        </div>
      </div>
      <div className="gc-scope-grid gc-scope-grid-dense">
        {RCM_AI_CASES.map((item) => (
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

/** Average net value per unique claim — used only to translate counts into illustrative exposure. */
function avgClaimNet(view: View): number {
  return view.uniqueClaims > 0 ? view.netPatientRevenue / view.uniqueClaims : 0;
}

function oppValue(view: View, id: string): number {
  return view.opportunities.find((item) => item.id === id)?.eligibleValue ?? 0;
}

export function RcmCommandPage() {
  const view = useView();
  const prior = usePrior();
  const issues = rcmIdentityIssues(view);
  const identityTotal = Object.keys(view.identities).length;
  return (
    <Page
      title={RCM_SCREEN_TITLES.command}
      kpis={ribbon('command', {
        kpi_rcm_net_patient_revenue: {
          value: sar(view.netPatientRevenue),
          delta: compare(view, prior, (item) => item.netPatientRevenue),
          scope: `${view.hospital} · ${view.periodLabel}. Gross charges ${sar(view.grossCharges)} − contractual allowances ${sar(view.contractualAllowances)}.`,
          formula: 'Gross charges − contractual allowances',
          limitations: view.methodology.netRevenue,
        },
        kpi_rcm_net_collection_rate: {
          value: pct(view.netCollectionRate),
          delta: compare(view, prior, (item) => item.netCollectionRate, true),
          tone: high(view.netCollectionRate, RCM_TARGETS.netCollectionRate, 0.04),
          scope: `Period cash applied ${sar(view.cashApplied)} ÷ period net patient revenue ${sar(view.netPatientRevenue)} · target ${pct(RCM_TARGETS.netCollectionRate)}. Cash may settle prior-period AR.`,
          formula: 'Period cash applied ÷ period net patient revenue',
          limitations: 'Period Cash-to-Net Revenue Ratio — not a cohort-adjusted / collectible net collection rate. ' + view.methodology.cash,
        },
        kpi_rcm_gross_denial_rate: {
          value: pct(view.grossDenialRate),
          delta: compare(view, prior, (item) => item.grossDenialRate, true),
          tone: low(view.grossDenialRate, RCM_TARGETS.grossDenialRate, 0.02),
          scope: `${num(view.deniedClaims)} denied of ${num(view.adjudicatedClaims)} adjudicated unique claims · target ≤ ${pct(RCM_TARGETS.grossDenialRate)}.`,
          formula: 'Denied unique claims ÷ adjudicated unique claims',
          limitations: view.methodology.denialRate,
        },
        kpi_rcm_days_in_ar: {
          value: days(view.daysInAr),
          delta: compare(view, prior, (item) => item.daysInAr),
          tone: low(view.daysInAr, RCM_TARGETS.daysInAr, 10),
          scope: `Closing AR ${sar(view.closingAR)} over ${view.daysInPeriod} days · target ≤ ${RCM_TARGETS.daysInAr} d.`,
          formula: 'Closing AR ÷ (net patient revenue ÷ days in period)',
        },
        kpi_rcm_outstanding_ar: {
          value: sar(view.closingAR),
          delta: compare(view, prior, (item) => item.closingAR),
          scope: `Period-end snapshot at ${view.observationDate}. Insurer AR ${sar(view.insurerAR)} · patient AR ${sar(view.patientAR)}.`,
          formula: 'Opening AR + new receivables − cash applied − adjustments − write-offs ± corrections',
          limitations: view.methodology.arRollForward,
        },
        kpi_rcm_revenue_at_risk: {
          value: sar(view.revenueAtRisk),
          delta: compare(view, prior, (item) => item.revenueAtRisk),
          tone: view.netPatientRevenue > 0 && view.revenueAtRisk / view.netPatientRevenue > 0.12 ? 'watch' : 'neutral',
          scope: `Recoverable denials ${sar(view.recoverableDenialValue)} + unbilled ${sar(view.unbilledValue)} + AR over 90 days ${sar(view.arOver90)}.`,
          formula: 'Recoverable denial value + unbilled value + AR over 90 days',
          limitations: 'Exposure under recoverability caps — not collected cash and not a forecast.',
        },
      })}
    >
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Revenue and Collections Trend', view.labels, [
            { name: 'Net revenue', values: mil(view.monthlyRevenue) },
            { name: 'Cash applied', values: mil(view.monthlyCollections) },
          ], 'SAR M', `Monthly net patient revenue vs applied cash (Y-axis SAR millions). Period cash-to-net ratio ${pct(view.netCollectionRate)}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Alerts packed />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Claims Lifecycle Overview', ['Unique claims', 'First-pass accepted', 'Adjudicated', 'Paid', 'Denied'], [
            { name: 'Claims', values: [view.uniqueClaims, view.firstPassAccepted, view.adjudicatedClaims, view.paidClaims, view.deniedClaims] },
          ], 'claims', `Unique claims ${num(view.uniqueClaims)} vs submission attempts ${num(view.submissionAttempts)} (${num(view.resubmissions)} resubmissions). Clearinghouse rejects are not payer denials.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Revenue Cycle Health by Payer', view.payerRows.map((item) => item.name), [
            { name: 'Collection rate', values: rate(view.payerRows.map((item) => (item.netRevenue > 0 ? item.collections / item.netRevenue : 0))) },
            { name: 'Denial rate', values: rate(view.payerRows.map((item) => item.denialRate)) },
          ], '%', 'Applied cash ÷ net revenue and denied ÷ adjudicated claims by payer. Self-pay carries patient-responsibility collection patterns.')} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Denial Pressure Trend', view.labels, [
            { name: 'Denied claims', values: view.monthlyDenials },
          ], 'claims', `Monthly denied unique claims. Period gross denial rate ${pct(view.grossDenialRate)} (target ≤ ${pct(RCM_TARGETS.grossDenialRate)}).`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'AR Aging Overview', view.agingRows.map((item) => item.name), [
            { name: 'AR', values: mil(view.agingRows.map((item) => item.amount)) },
          ], 'SAR M', `Buckets sum to closing AR ${sar(view.closingAR)}. ${view.methodology.aging}`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Executive Financial Priority Signals', view.prioritySignals.map((item) => item.name), [
            { name: 'Signal index', values: view.prioritySignals.map((item) => (
              item.severity === 'high' ? 3 : item.severity === 'medium' ? 2 : 1
            )) },
          ], 'index', `Leadership attention signals for ${view.periodLabel} against illustrative operating targets.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <section className="gc-panel gc-insight">
            <h2>Ledger integrity</h2>
            <div className="gc-exception-list">
              <div className={`gc-exception ${issues.length ? 'gc-tone-watch' : 'gc-tone-neutral'}`}>
                <strong>Ledger identities</strong>
                <span>{identityTotal - issues.length} of {identityTotal} reconcile{issues.length ? ` · review ${issues.join(', ')}` : ''}</span>
              </div>
              <div className="gc-exception gc-tone-neutral">
                <strong>AR roll-forward</strong>
                <span>{view.arRollForward.balanced ? 'Balanced' : `Residual ${sar(view.arRollForward.residual)}`} · closing {sar(view.closingAR)}</span>
              </div>
              <div className="gc-exception gc-tone-neutral"><strong>Hospital ALL</strong><span>{view.methodology.allMode}</span></div>
            </div>
            <p className="gc-next">Observation date {view.observationDate}. Outstanding AR is a snapshot, never a sum of monthly balances.</p>
          </section>
        </div>
      </div>
      <IndicatorIndex indicators={rcmIndicatorsFor(view)} domains={['Command']} />
    </Page>
  );
}

export function RcmEligibilityPage() {
  const view = useView();
  const prior = usePrior();
  const claimNet = avgClaimNet(view);
  const required = splitExact(view.eligibilityRequired, view.monthlyRevenue);
  const verified = splitExact(view.eligibilityVerified, view.monthlyRevenue);
  const pendingAge = splitExact(view.authPending, [0.42, 0.28, 0.18, 0.12]);
  return (
    <Page
      title={RCM_SCREEN_TITLES.eligibility}
      kpis={ribbon('eligibility', {
        kpi_rcm_eligibility_verification_rate: {
          value: pct(view.eligibilityVerificationRate),
          delta: compare(view, prior, (item) => item.eligibilityVerificationRate, true),
          tone: high(view.eligibilityVerificationRate, RCM_TARGETS.eligibilityVerificationRate, 0.03),
          scope: `${num(view.eligibilityVerified)} verified of ${num(view.eligibilityRequired)} encounters requiring verification · target ${pct(RCM_TARGETS.eligibilityVerificationRate)}.`,
          formula: 'Verified eligibility responses ÷ encounters requiring verification',
          limitations: 'Synthetic demo checks — no live payer eligibility transactions.',
        },
        kpi_rcm_coverage_exception_rate: {
          value: pct(view.coverageExceptionRate),
          delta: compare(view, prior, (item) => item.coverageExceptionRate, true),
          tone: low(view.coverageExceptionRate, 0.07, 0.03),
          scope: `${num(view.coverageExceptions)} coverage exceptions among ${num(view.eligibilityVerified)} verified responses.`,
          formula: 'Coverage exceptions ÷ verified eligibility responses',
        },
        kpi_rcm_preauth_approval_rate: {
          value: pct(view.preauthApprovalRate),
          delta: compare(view, prior, (item) => item.preauthApprovalRate, true),
          tone: high(view.preauthApprovalRate, 0.88, 0.04),
          scope: `${num(view.authApproved)} approved of ${num(view.authDecided)} decided requests · ${num(view.authRejected)} rejected. Pending excluded.`,
          formula: 'Approved ÷ decided authorization requests',
          limitations: 'Administrative decision queue — not a care decision.',
        },
        kpi_rcm_pending_authorizations: {
          value: num(view.pendingAuthorizations),
          delta: compare(view, prior, (item) => item.pendingAuthorizations),
          scope: `Opening pending ${num(view.authOpeningPending)} + requested ${num(view.authRequested)} − decided ${num(view.authDecided)} = ${num(view.authPending)} at ${view.observationDate}.`,
          formula: 'Opening pending + requested − decided',
        },
        kpi_rcm_auth_turnaround_days: {
          value: days(view.authTurnaroundDays),
          delta: compare(view, prior, (item) => item.authTurnaroundDays),
          tone: low(view.authTurnaroundDays, 3.5, 1.5),
          scope: `Volume-weighted mean over ${num(view.authDecided)} decided requests · ${view.periodLabel}.`,
          formula: 'Volume-weighted mean days from request to decision',
          limitations: view.methodology.daysMeasures,
        },
        kpi_rcm_auth_denial_exposure: {
          value: sar(view.authDenialExposure),
          delta: compare(view, prior, (item) => item.authDenialExposure),
          scope: `Denied value attributed to missing authorization · ${view.periodLabel}. Sits inside total denied value ${sar(view.deniedAmount)}.`,
          formula: 'Denied value from missing / expired / rejected authorization',
          limitations: 'Overlaps the Claims denial totals — not additive.',
        },
      })}
    >
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Eligibility Verification Trend', view.labels, [
            { name: 'Required', values: required },
            { name: 'Verified', values: verified },
          ], 'encounters', `Period totals allocated pro-rata to monthly net revenue — totals tie to the ledger. Period rate ${pct(view.eligibilityVerificationRate)}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('funnel', 'Authorization Funnel', ['Requests', 'Decided', 'Approved'], [
            { name: 'Requests', values: [view.authRequested + view.authOpeningPending, view.authDecided, view.authApproved] },
          ], 'requests', `Requests include opening pending ${num(view.authOpeningPending)}. Rejected ${num(view.authRejected)} · still pending ${num(view.authPending)}.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Pending Authorizations by Age', ['≤2 d', '3–5 d', '6–10 d', '>10 d'], [
            { name: 'Pending', values: pendingAge },
          ], 'requests', `Illustrative age split of ${num(view.authPending)} pending requests — sums to the closing pending stock.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Approval Rate by Payer', view.payerRows.map((item) => item.name), [
            { name: 'Approval rate', values: rate(view.payerRows.map((item) => item.authApproval)) },
          ], '%', 'Approved ÷ decided requests by payer. Self-pay has minimal authorization volume.')} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Financial Exposure by Authorization Status', ['Auth-related denials', 'Pending requests', 'Rejected requests'], [
            { name: 'Exposure', values: mil([view.authDenialExposure, view.authPending * claimNet, view.authRejected * claimNet]) },
          ], 'SAR M', 'Denied value from authorization issues; pending and rejected requests valued at average net per claim (illustrative exposure, not cash).')} />
        </div>
        <div className="gc-ed-pack-col">
          <section className="gc-panel gc-insight">
            <h2>Authorization context</h2>
            <div className="gc-exception-list">
              <div className={`gc-exception ${view.preauthApprovalRate < 0.84 ? 'gc-tone-watch' : 'gc-tone-neutral'}`}>
                <strong>Approval rate</strong>
                <span>{pct(view.preauthApprovalRate)} · {num(view.authRejected)} rejected</span>
              </div>
              <div className="gc-exception gc-tone-neutral"><strong>Turnaround</strong><span>{days(view.authTurnaroundDays)} volume-weighted mean</span></div>
              <div className="gc-exception gc-tone-neutral"><strong>Payer submission</strong><span>Not connected — synthetic demo only</span></div>
            </div>
            <p className="gc-next">Authorization status is an administrative workflow. It does not change clinical care or approve treatment.</p>
          </section>
        </div>
      </div>
      <IndicatorIndex indicators={rcmIndicatorsFor(view)} domains={['Eligibility']} />
    </Page>
  );
}

export function RcmBillingPage() {
  const view = useView();
  const prior = usePrior();
  const unbilledAge = splitExact(view.unbilledEncounters, [0.38, 0.27, 0.2, 0.15]);
  const exceptionReasons = splitExact(view.billingExceptions, [0.32, 0.27, 0.23, 0.18]);
  const codingBacklog = Math.max(0, view.codingReady - view.codingComplete);
  return (
    <Page
      title={RCM_SCREEN_TITLES.billing}
      kpis={ribbon('billing', {
        kpi_rcm_charge_capture_rate: {
          value: pct(view.chargeCaptureRate),
          delta: compare(view, prior, (item) => item.chargeCaptureRate, true),
          tone: high(view.chargeCaptureRate, RCM_TARGETS.chargeCaptureRate, 0.02),
          scope: `${num(view.capturedCharges)} captured of ${num(view.chargeableServices)} chargeable services · target ${pct(RCM_TARGETS.chargeCaptureRate)}.`,
          formula: 'Captured billable charges ÷ eligible chargeable services',
          limitations: 'Excludes nonbillable, bundled and cancelled services.',
        },
        kpi_rcm_unbilled_encounters: {
          value: num(view.unbilledEncounters),
          delta: compare(view, prior, (item) => item.unbilledEncounters),
          scope: `Completed encounters without an invoice at ${view.observationDate}.`,
          formula: 'Completed encounters without an invoice',
          limitations: 'Work-in-progress stock — not lost revenue.',
        },
        kpi_rcm_unbilled_service_value: {
          value: sar(view.unbilledServiceValue),
          delta: compare(view, prior, (item) => item.unbilledServiceValue),
          scope: `Expected net value of unbilled services at ${view.observationDate}. Opening ${sar(view.openingUnbilledValue)}.`,
          formula: 'Expected net value of unbilled chargeable services',
          limitations: 'Expected net value — not gross charges and not cash.',
        },
        kpi_rcm_charge_to_bill_lag: {
          value: days(view.chargeToBillLag),
          delta: compare(view, prior, (item) => item.chargeToBillLag),
          tone: low(view.chargeToBillLag, RCM_TARGETS.billingLagDays, 1.5),
          scope: `Volume-weighted mean over ${num(view.invoicesCreated)} invoices · target ≤ ${RCM_TARGETS.billingLagDays} d.`,
          formula: 'Volume-weighted mean days from charge post to invoice',
          limitations: view.methodology.daysMeasures,
        },
        kpi_rcm_coding_completion_rate: {
          value: pct(view.codingCompletionRate),
          delta: compare(view, prior, (item) => item.codingCompletionRate, true),
          tone: high(view.codingCompletionRate, RCM_TARGETS.codingCompletionRate, 0.03),
          scope: `${num(view.codingComplete)} complete of ${num(view.codingReady)} ready for coding · target ${pct(RCM_TARGETS.codingCompletionRate)}.`,
          formula: 'Encounters with completed coding ÷ encounters ready for coding',
        },
        kpi_rcm_billing_exception_rate: {
          value: pct(view.billingExceptionRate),
          delta: compare(view, prior, (item) => item.billingExceptionRate, true),
          tone: low(view.billingExceptionRate, 0.07, 0.03),
          scope: `${num(view.billingExceptions)} exceptions on ${num(view.invoicesCreated)} invoices created.`,
          formula: 'Billing exceptions ÷ invoices created',
        },
      })}
    >
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Delivered Services vs Captured Charges', view.deptCaptureRows.map((item) => item.name), [
            { name: 'Chargeable', values: view.deptCaptureRows.map((item) => item.chargeable) },
            { name: 'Captured', values: view.deptCaptureRows.map((item) => item.captured) },
          ], 'services', `Delivered chargeable services vs captured charges by department. Hospital capture ${pct(view.chargeCaptureRate)}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Charge Capture by Department', view.deptCaptureRows.map((item) => item.name), [
            { name: 'Capture rate', values: rate(view.deptCaptureRows.map((item) => item.captureRate)) },
          ], '%', `Department capture rate vs target ${pct(RCM_TARGETS.chargeCaptureRate)}. Clinical departments appear as supporting charge-capture context only.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Unbilled Encounters Aging', ['≤3 d', '4–7 d', '8–14 d', '>14 d'], [
            { name: 'Encounters', values: unbilledAge },
          ], 'encounters', `Illustrative age split of ${num(view.unbilledEncounters)} unbilled encounters — sums to the period-end stock.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Coding Backlog', ['Ready for coding', 'Coding complete', 'Backlog'], [
            { name: 'Encounters', values: [view.codingReady, view.codingComplete, codingBacklog] },
          ], 'encounters', `Completion ${pct(view.codingCompletionRate)}. Operational completion — not a coding accuracy audit.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Billing Exceptions by Reason', ['Missing coding', 'Charge mismatch', 'Payer data gap', 'Documentation hold'], [
            { name: 'Exceptions', values: exceptionReasons },
          ], 'exceptions', `Illustrative reason split of ${num(view.billingExceptions)} billing exceptions — sums to the period total.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <section className="gc-panel gc-insight">
            <h2>Billing flow</h2>
            <div className="gc-exception-list">
              <div className="gc-exception gc-tone-neutral"><strong>Charge-to-bill lag</strong><span>{days(view.chargeToBillLag)} · target ≤ {RCM_TARGETS.billingLagDays} d</span></div>
              <div className="gc-exception gc-tone-neutral"><strong>Unbilled value</strong><span>{sar(view.unbilledServiceValue)} expected net</span></div>
              <div className="gc-exception gc-tone-neutral"><strong>Invoices created</strong><span>{num(view.invoicesCreated)} for {num(view.encounters)} encounters</span></div>
            </div>
            <p className="gc-next">Unbilled work-in-progress delays cash timing; it is not counted as leakage until confirmed missed.</p>
          </section>
        </div>
      </div>
      <IndicatorIndex indicators={rcmIndicatorsFor(view)} domains={['Billing']} />
    </Page>
  );
}

export function RcmClaimsPage() {
  const view = useView();
  const prior = usePrior();
  const appealLost = Math.max(0, view.appealDecided - view.appealWon);
  return (
    <Page
      title={RCM_SCREEN_TITLES.claims}
      kpis={ribbon('claims', {
        kpi_rcm_claims_submitted: {
          value: num(view.claimsSubmitted),
          delta: compare(view, prior, (item) => item.claimsSubmitted),
          scope: `${num(view.uniqueClaims)} unique claims · ${num(view.submissionAttempts)} submission attempts (${num(view.resubmissions)} resubmissions) · ${view.periodLabel}.`,
          formula: 'Distinct claim IDs with at least one submission',
          limitations: view.methodology.claims,
        },
        kpi_rcm_first_pass_acceptance: {
          value: pct(view.firstPassAcceptance),
          delta: compare(view, prior, (item) => item.firstPassAcceptance, true),
          tone: high(view.firstPassAcceptance, RCM_TARGETS.firstPassAcceptance, 0.03),
          scope: `${num(view.firstPassAccepted)} accepted first pass · ${num(view.clearinghouseRejects)} clearinghouse rejects · target ${pct(RCM_TARGETS.firstPassAcceptance)}.`,
          formula: 'Accepted on first submission ÷ unique claims',
          limitations: 'Clearinghouse reject ≠ payer denial. No live claims engine is connected.',
        },
        kpi_rcm_denied_claims: {
          value: num(view.deniedClaims),
          delta: compare(view, prior, (item) => item.deniedClaims),
          tone: low(view.grossDenialRate, RCM_TARGETS.grossDenialRate, 0.02),
          scope: `${num(view.deniedClaims)} unique adjudicated claims with a denial · gross denial rate ${pct(view.grossDenialRate)}.`,
          formula: 'Unique adjudicated claims with a denial',
        },
        kpi_rcm_denial_rate_by_value: {
          value: pct(view.denialRateByValue),
          delta: compare(view, prior, (item) => item.denialRateByValue, true),
          scope: `${sar(view.deniedAmount)} denied of ${sar(view.adjudicatedAmount)} adjudicated amount.`,
          formula: 'Denied amount ÷ adjudicated amount',
          limitations: 'Value grain — can differ from the claim-count denial rate.',
        },
        kpi_rcm_appeal_success_rate: {
          value: pct(view.appealSuccessRate),
          delta: compare(view, prior, (item) => item.appealSuccessRate, true),
          tone: view.appealSuccessRate < 0.45 ? 'watch' : 'good',
          scope: `${num(view.appealWon)} won of ${num(view.appealDecided)} decided appeals. Pending excluded.`,
          formula: 'Successful appeals ÷ decided appeals',
        },
        kpi_rcm_recoverable_denial_value: {
          value: sar(view.recoverableDenialValue),
          delta: compare(view, prior, (item) => item.recoverableDenialValue),
          scope: `Assessed recoverable share of ${sar(view.deniedAmount)} denied value · ${view.periodLabel}.`,
          formula: 'Denied amount assessed recoverable under appeal rules',
          limitations: 'Simulated recovery — not collected cash.',
        },
      })}
    >
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Claims Submission Trend', view.labels, [
            { name: 'Unique claims', values: view.monthlyClaimsSubmitted },
            { name: 'Denied', values: view.monthlyDenials },
          ], 'claims', `Monthly unique claims submitted vs denied. Resubmissions (${num(view.resubmissions)}) are not new unique claims.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('funnel', 'Claims Lifecycle Funnel', ['Unique claims', 'First-pass accepted', 'Adjudicated', 'Paid', 'Denied'], [
            { name: 'Claims', values: [view.uniqueClaims, view.firstPassAccepted, view.adjudicatedClaims, view.paidClaims, view.deniedClaims] },
          ], 'claims', 'Claim counts from submission through adjudication. Denied and paid partition adjudicated claims.')} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Denials by Reason', view.denialReasonRows.map((item) => item.name), [
            { name: 'Denied value', values: mil(view.denialReasonRows.map((item) => item.amount)) },
          ], 'SAR M', `Reasons sum to denied value ${sar(view.deniedAmount)}. Authorization-related: ${sar(view.authDenialExposure)}.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Denials by Payer', view.payerRows.map((item) => item.name), [
            { name: 'Denial rate', values: rate(view.payerRows.map((item) => item.denialRate)) },
          ], '%', 'Denied ÷ adjudicated claims by payer. Self-pay carries few payer adjudications.')} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Appeal Outcome Trend', ['Decided', 'Won', 'Lost'], [
            { name: 'Appeals', values: [view.appealDecided, view.appealWon, appealLost] },
          ], 'appeals', `Period appeal outcomes — success rate ${pct(view.appealSuccessRate)}. Pending appeals are excluded.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Denial Recovery Opportunities', ['Denied value', 'Recoverable', 'Preventable (process)', 'Eligible recovery'], [
            { name: 'Value', values: mil([view.deniedAmount, view.recoverableDenialValue, view.preventableDeniedAmount, view.eligibleDenialRecovery]) },
          ], 'SAR M', 'Simulated recovery is illustrative — not collected cash. Categories overlap and are not additive.')} />
        </div>
      </div>
      <IndicatorIndex indicators={rcmIndicatorsFor(view)} domains={['Claims']} />
    </Page>
  );
}

export function RcmCollectionsPage() {
  const view = useView();
  const prior = usePrior();
  const over90Share = view.closingAR > 0 ? view.arOver90 / view.closingAR : 0;
  const worklist = [...view.payerRows]
    .map((item) => ({ name: item.name, value: item.ar * over90Share }))
    .sort((a, b) => b.value - a.value);
  return (
    <Page
      title={RCM_SCREEN_TITLES.collections}
      kpis={ribbon('collections', {
        kpi_rcm_cash_applied: {
          value: sar(view.cashApplied),
          delta: compare(view, prior, (item) => item.cashApplied),
          scope: `Cash applied in ${view.periodLabel} · received ${sar(view.cashReceived)}.`,
          formula: 'Σ cash applied to encounter AR in period',
          limitations: view.methodology.cash,
        },
        kpi_rcm_ar_over_90: {
          value: sar(view.arOver90),
          delta: compare(view, prior, (item) => item.arOver90),
          tone: over90Share > 0.2 ? 'alert' : over90Share > 0.14 ? 'watch' : 'good',
          scope: `${pct(over90Share)} of closing AR ${sar(view.closingAR)} · aging clock: ${view.agingClock}.`,
          formula: 'AR in 91–120 and >120 day buckets',
          limitations: view.methodology.aging,
        },
        kpi_rcm_collection_effectiveness: {
          value: pct(view.collectionEffectiveness),
          delta: compare(view, prior, (item) => item.collectionEffectiveness, true),
          scope: `Cash applied ÷ (opening AR ${sar(view.openingAR)} + new receivables ${sar(view.newReceivables)} − adjustments ${sar(view.approvedAdjustments)}).`,
          formula: 'Cash applied ÷ (opening AR + new receivables − approved adjustments)',
        },
        kpi_rcm_unapplied_cash: {
          value: sar(view.unappliedCash),
          delta: compare(view, prior, (item) => item.unappliedCash),
          scope: `Received ${sar(view.cashReceived)} − applied ${sar(view.cashApplied)}. Year-to-date unapplied stock ${sar(view.unappliedStockYtd)}.`,
          formula: 'Cash received − cash applied',
          limitations: 'Cash received ≠ cash applied.',
        },
        kpi_rcm_payer_payment_delay: {
          value: days(view.payerPaymentDelay),
          delta: compare(view, prior, (item) => item.payerPaymentDelay),
          tone: low(view.payerPaymentDelay, 42, 8),
          scope: `Volume-weighted mean over ${num(view.paidClaims)} paid claims.`,
          formula: 'Volume-weighted mean days from submission to payment',
          limitations: view.methodology.daysMeasures,
        },
        kpi_rcm_patient_ar: {
          value: sar(view.patientAr),
          delta: compare(view, prior, (item) => item.patientAr),
          scope: `Patient responsibility AR · ${view.closingAR > 0 ? pct(view.patientAr / view.closingAR) : '0.0%'} of closing AR. Insurer AR ${sar(view.insurerAR)}.`,
          formula: 'Closing AR owed by patients',
          limitations: 'Distinct from insurer AR; not equal to total outstanding AR.',
        },
      })}
    >
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'AR Aging Buckets', view.agingRows.map((item) => item.name), [
            { name: 'AR', values: mil(view.agingRows.map((item) => item.amount)) },
          ], 'SAR M', `Buckets sum to closing AR ${sar(view.closingAR)}. ${view.methodology.aging}`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('line', 'Collections Trend', view.labels, [
            { name: 'Cash applied', values: mil(view.monthlyCashApplied) },
            { name: 'Cash received', values: mil(view.monthlyCashReceived) },
          ], 'SAR M', `Applied cash vs remittance receipts. Unapplied ${sar(view.unappliedCash)} for the period.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'AR by Payer', view.payerRows.map((item) => item.name), [
            { name: 'AR', values: mil(view.payerRows.map((item) => item.ar)) },
          ], 'SAR M', `Payer AR sums to closing AR ${sar(view.closingAR)}. Self-pay AR is patient responsibility.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <section className="gc-panel gc-insight">
            <h2>AR roll-forward</h2>
            <div className="gc-exception-list">
              <div className="gc-exception gc-tone-neutral"><strong>Opening AR</strong><span>{sar(view.openingAR)}</span></div>
              <div className="gc-exception gc-tone-neutral"><strong>+ New receivables</strong><span>{sar(view.newReceivables)}</span></div>
              <div className="gc-exception gc-tone-neutral"><strong>− Cash applied</strong><span>{sar(view.cashApplied)}</span></div>
              <div className="gc-exception gc-tone-neutral"><strong>− Adjustments · write-offs</strong><span>{sar(view.approvedAdjustments + view.writeOffs)}</span></div>
              <div className={`gc-exception ${view.arRollForward.balanced ? 'gc-tone-neutral' : 'gc-tone-watch'}`}>
                <strong>= Closing AR</strong>
                <span>{sar(view.closingAR)}{view.arRollForward.balanced ? ' · balanced' : ` · residual ${sar(view.arRollForward.residual)}`}</span>
              </div>
            </div>
            <p className="gc-next">Corrections {sar(view.corrections)} are included in the roll-forward.</p>
          </section>
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Priority Collection Worklist', worklist.map((item) => item.name), [
            { name: 'Est. AR > 90 d', values: mil(worklist.map((item) => item.value)) },
          ], 'SAR M', 'Illustrative worklist: payer AR × hospital share of AR over 90 days. Not a collector assignment engine.')} />
        </div>
        <div className="gc-ed-pack-col">
          <section className="gc-panel gc-insight">
            <h2>Cash application</h2>
            <div className="gc-exception-list">
              <div className="gc-exception gc-tone-neutral"><strong>Net collection rate</strong><span>{pct(view.netCollectionRate)}</span></div>
              <div className="gc-exception gc-tone-neutral"><strong>Days in AR</strong><span>{days(view.daysInAr)} · target ≤ {RCM_TARGETS.daysInAr} d</span></div>
              <div className="gc-exception gc-tone-neutral"><strong>Outstanding AR</strong><span>Owned by Command — {sar(view.closingAR)}</span></div>
            </div>
            <p className="gc-next">Outstanding AR and Days in AR headlines stay on Command; this screen owns flows and concentration.</p>
          </section>
        </div>
      </div>
      <IndicatorIndex indicators={rcmIndicatorsFor(view)} domains={['Collections']} />
    </Page>
  );
}

export function RcmLeakagePage() {
  const view = useView();
  const prior = usePrior();
  const underpayWeights = view.payerRows.map((item) => (item.name.startsWith('Self-Pay') ? 0 : item.netRevenue));
  const underpayByPayer = splitExact(view.underpaymentValue, underpayWeights);
  const otherWriteoffs = Math.max(0, view.writeOffs - view.avoidableWriteoffs);
  return (
    <Page
      title={RCM_SCREEN_TITLES.leakage}
      kpis={ribbon('leakage', {
        kpi_rcm_confirmed_leakage: {
          value: sar(view.confirmedLeakage),
          delta: compare(view, prior, (item) => item.confirmedLeakage),
          tone: view.netPatientRevenue > 0 && view.confirmedLeakage / view.netPatientRevenue > 0.03 ? 'watch' : 'neutral',
          scope: `Missed charges ${sar(view.missedChargeExposure)} + avoidable write-offs ${sar(view.avoidableWriteoffs)} + underpayments ${sar(view.underpaymentValue)}.`,
          formula: 'Missed charges + avoidable write-offs + underpayments',
          limitations: view.methodology.leakage,
        },
        kpi_rcm_potential_leakage: {
          value: sar(view.potentialLeakage),
          delta: compare(view, prior, (item) => item.potentialLeakage),
          scope: `Suspected exposure under review · ${view.periodLabel}.`,
          formula: 'Suspected exposure not yet confirmed',
          limitations: 'Not additive to confirmed leakage.',
        },
        kpi_rcm_underpayment_value: {
          value: sar(view.underpaymentValue),
          delta: compare(view, prior, (item) => item.underpaymentValue),
          scope: `Allowed − paid on underpaid adjudicated lines · ${view.periodLabel}.`,
          formula: 'Allowed − paid on underpaid adjudicated lines',
          limitations: 'Contract variance with exclusive attribution.',
        },
        kpi_rcm_missed_charge_exposure: {
          value: sar(view.missedChargeExposure),
          delta: compare(view, prior, (item) => item.missedChargeExposure),
          scope: `${num(view.chargeableServices - view.capturedCharges)} uncaptured chargeable services valued at expected net.`,
          formula: 'Expected net of chargeable services not captured',
        },
        kpi_rcm_avoidable_writeoffs: {
          value: sar(view.avoidableWriteoffs),
          delta: compare(view, prior, (item) => item.avoidableWriteoffs),
          scope: `Preventable share of ${sar(view.writeOffs)} total write-offs · ${view.periodLabel}.`,
          formula: 'Write-offs classified preventable',
          limitations: 'Excludes contractual adjustments and nonrecoverable bad debt.',
        },
        kpi_rcm_recovery_opportunities: {
          value: num(view.recoveryOpportunities),
          delta: compare(view, prior, (item) => item.recoveryOpportunities),
          scope: `Open recovery work items with attributed value · ${view.observationDate}.`,
          formula: 'Open recovery work items',
          limitations: 'Work items — not recovered amounts.',
        },
      })}
    >
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Revenue Leakage by Driver', view.leakageDrivers.map((item) => item.name), [
            { name: 'Leakage', values: mil(view.leakageDrivers.map((item) => item.amount)) },
          ], 'SAR M', `Exclusive drivers sum to confirmed leakage ${sar(view.confirmedLeakage)}. Contractual allowances are not leakage.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Underpayments by Payer', view.payerRows.map((item) => item.name), [
            { name: 'Underpayment', values: kilo(underpayByPayer) },
          ], 'SAR K', 'Illustrative payer split of total underpayments, weighted by net revenue. Self-pay has no contract variance.')} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Missed Charges by Service Line', view.serviceLineMissedRows.map((item) => item.name), [
            { name: 'Missed value', values: kilo(view.serviceLineMissedRows.map((item) => item.missedValue)) },
          ], 'SAR K', `Service lines sum to missed charge exposure ${sar(view.missedChargeExposure)}. Supporting finance attribution, not clinical ownership.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Write-off Drivers', ['Avoidable write-offs', 'Other write-offs'], [
            { name: 'Write-offs', values: kilo([view.avoidableWriteoffs, otherWriteoffs]) },
          ], 'SAR K', `Avoidable ${sar(view.avoidableWriteoffs)} of total ${sar(view.writeOffs)}. Contractual allowances (${sar(view.contractualAllowances)}) sit outside write-offs.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Recovery Opportunity Matrix', view.deptCaptureRows.map((item) => item.name), [
            { name: 'Missed value', values: kilo(view.deptCaptureRows.map((item) => item.missedValue)) },
          ], 'SAR K', `Missed-charge value by department. ${num(view.recoveryOpportunities)} open recovery work items overall.`)} />
        </div>
        <div className="gc-ed-pack-col">
          <section className="gc-panel gc-insight">
            <h2>Attribution rules</h2>
            <div className="gc-exception-list">
              <div className="gc-exception gc-tone-neutral"><strong>Contractual allowances</strong><span>{sar(view.contractualAllowances)} · excluded from leakage</span></div>
              <div className="gc-exception gc-tone-neutral"><strong>Confirmed leakage</strong><span>{sar(view.confirmedLeakage)} · exclusive drivers</span></div>
              <div className="gc-exception gc-tone-neutral"><strong>Potential leakage</strong><span>{sar(view.potentialLeakage)} · not additive</span></div>
            </div>
            <p className="gc-next">Each leakage dollar is attributed to one driver only, so drivers never double count.</p>
          </section>
        </div>
      </div>
      <IndicatorIndex indicators={rcmIndicatorsFor(view)} domains={['Leakage']} />
    </Page>
  );
}

const OPPORTUNITY_AXIS: Record<string, string> = {
  'rcm-denials-down': 'Denials',
  'rcm-first-pass-up': 'First-pass',
  'rcm-ar-accelerate': 'AR accel.',
  'rcm-auth-up': 'Auth',
  'rcm-capture-up': 'Capture',
  'rcm-underpay-recover': 'Underpay',
  'rcm-writeoff-down': 'Write-offs',
  'rcm-workflow-up': 'Workflow',
};

export function RcmOptimizationPage() {
  const view = useView();
  const prior = usePrior();
  const driverNames = view.opportunities.map((item) => OPPORTUNITY_AXIS[item.id] ?? item.id);
  const ranked = [...view.opportunities].sort((a, b) => b.eligibleValue - a.eligibleValue);
  const constraints = [
    { name: 'Denials', exposure: view.recoverableDenialValue, eligible: oppValue(view, 'rcm-denials-down') },
    { name: 'Auth', exposure: view.authDenialExposure, eligible: oppValue(view, 'rcm-auth-up') },
    { name: 'Capture', exposure: view.missedChargeExposure, eligible: oppValue(view, 'rcm-capture-up') },
    { name: 'Underpay', exposure: view.underpaymentValue, eligible: oppValue(view, 'rcm-underpay-recover') },
    { name: 'Write-offs', exposure: view.avoidableWriteoffs, eligible: oppValue(view, 'rcm-writeoff-down') },
  ];
  return (
    <Page
      title={RCM_SCREEN_TITLES.optimization}
      kpis={ribbon('optimization', {
        kpi_rcm_recoverable_opportunity: {
          value: sar(view.recoverableOpportunity),
          delta: compare(view, prior, (item) => item.recoverableOpportunity),
          scope: `Eligible denial recovery ${sar(view.eligibleDenialRecovery)} + preventable leakage ${sar(view.preventableLeakage)} · ${view.periodLabel}.`,
          formula: 'Eligible denial recovery + preventable leakage',
          limitations: view.methodology.optimization,
        },
        kpi_rcm_eligible_denial_recovery: {
          value: sar(view.eligibleDenialRecovery),
          delta: compare(view, prior, (item) => item.eligibleDenialRecovery),
          scope: `Share of recoverable denial value ${sar(view.recoverableDenialValue)} under appeal and resubmission assumptions.`,
          formula: 'Recoverable denial value × appeal-recovery assumption',
          limitations: 'Simulated recovery is not collected cash.',
        },
        kpi_rcm_collection_improvement: {
          value: sar(view.collectionImprovement),
          delta: compare(view, prior, (item) => item.collectionImprovement),
          scope: 'First-pass acceptance uplift + earlier release of unbilled value — timing effects.',
          formula: 'First-pass uplift + unbilled-release value',
          limitations: 'Timing acceleration — not new recognized revenue.',
        },
        kpi_rcm_preventable_leakage: {
          value: sar(view.preventableLeakage),
          delta: compare(view, prior, (item) => item.preventableLeakage),
          scope: `Capturable missed charges + recoverable underpayments + avoidable write-offs · confirmed leakage ${sar(view.confirmedLeakage)}.`,
          formula: 'Capturable missed charges + recoverable underpayments + avoidable write-offs',
          limitations: 'Contractual adjustments are never leakage. Illustrative — not guaranteed.',
        },
        kpi_rcm_cash_acceleration: {
          value: sar(view.cashAcceleration),
          delta: compare(view, prior, (item) => item.cashAcceleration),
          scope: `Earlier collection of AR over 60 days · aged AR over 90 days ${sar(view.arOver90)}.`,
          formula: 'Earlier collection of aged AR',
          limitations: 'Timing shift only — not additional revenue.',
        },
      })}
    >
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Revenue Recovery by Driver', driverNames, [
            { name: 'Eligible value', values: mil(view.opportunities.map((item) => item.eligibleValue)) },
          ], 'SAR M', 'Eight illustrative what-if scenarios. They overlap (for example authorization exposure sits inside denials) and must not be summed.')} />
        </div>
        <div className="gc-ed-pack-col">
          <section className="gc-panel gc-insight">
            <h2>Management decisions</h2>
            <div className="gc-exception-list">
              {ranked.slice(0, 3).map((item) => (
                <div key={item.id} className="gc-exception gc-tone-neutral">
                  <strong>{item.title}</strong>
                  <span>{sar(item.eligibleValue)} · {item.owner}</span>
                </div>
              ))}
            </div>
            <p className="gc-next">Estimates are illustrative. AI does not submit claims, collect cash, or change clinical care; simulated recovery is not collected cash.</p>
          </section>
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Current vs Scenario Net Collections', ['Current cash applied', 'Scenario cash applied'], [
            { name: 'Cash applied', values: mil([view.cashApplied, view.cashApplied + view.recoverableOpportunity]) },
          ], 'SAR M', 'Scenario adds the recoverable revenue opportunity to applied cash. Illustrative uplift — not achieved collections.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Denial Reduction Opportunity', ['Denied value', 'Preventable (process)', 'Eligible recovery'], [
            { name: 'Value', values: mil([view.deniedAmount, view.preventableDeniedAmount, view.eligibleDenialRecovery]) },
          ], 'SAR M', `Preventable denied value from process-fixable reasons vs modeled recovery. Gross denial rate ${pct(view.grossDenialRate)}.`)} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Cash Collection Acceleration', ['AR over 90 days', 'Accelerated cash'], [
            { name: 'Value', values: mil([view.arOver90, view.cashAcceleration]) },
          ], 'SAR M', 'Timing shift only — earlier application of eligible collections, not new revenue.')} />
        </div>
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Financial Constraints by Intervention', constraints.map((item) => item.name), [
            { name: 'Exposure', values: kilo(constraints.map((item) => item.exposure)) },
            { name: 'Eligible', values: kilo(constraints.map((item) => item.eligible)) },
          ], 'SAR K', 'Eligible value is a documented fraction of exposure — the gap is the feasibility constraint under each assumption.')} />
        </div>
      </div>
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <Slot span={false} figure={fig('bars', 'Management Action Priorities', ranked.map((item) => OPPORTUNITY_AXIS[item.id] ?? item.id), [
            { name: '% of net revenue', values: ranked.map((item) => (view.netPatientRevenue > 0 ? Math.round((item.eligibleValue / view.netPatientRevenue) * 10000) / 100 : 0)) },
          ], '% of NPR', 'Scenarios ranked by eligible value as a share of net patient revenue. Overlapping scenarios — not additive.', { digits: 2 })} />
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
            <p className="gc-next">{view.methodology.optimization}</p>
          </section>
        </div>
      </div>
      <IndicatorIndex indicators={rcmIndicatorsFor(view)} domains={['Optimization', 'Cross-domain context']} />
      <AiIndex />
    </Page>
  );
}
