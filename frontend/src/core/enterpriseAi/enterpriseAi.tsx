/**
 * Domain 16 — Enterprise AI pages for leadership.
 * Ready executive brief first; ask is optional. No technical meta on the face of the UI.
 */
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useShowcase } from '@/showcase/state';
import { useCopilot } from '../Copilot';
import { usePeriod } from '../period';
import { buildEnterpriseView } from '../enterpriseView';
import { listMetrics, resolveMetric } from './metricRegistry';
import { runInvestigation } from './investigation';
import { runOptimization, type OptimizationRequest } from './optimization';
import { runForecast, FORECAST_MODEL_VERSION, type ForecastSeriesId } from './forecast';
import {
  approveDecision,
  decisionStorageMeta,
  listDecisions,
  transitionDecision,
} from './decisions';
import { getOutcome, listOutcomes } from './outcomes';
import { FLAGSHIP_QUESTION, orchestrate } from './orchestrator';
import { resolveActiveMode } from './gateway';
import { driverStatusLabel, executiveMetricLabel, resolveFocusFromQuestion } from './focus';
import { formatForecastPoint, formatMetricValue } from './format';
import { rankHospitalRisks } from './riskIntelligence';
import { roleEmphasis, type ExecutiveRole } from './executiveResponse';
import { scenarioLabelForId } from './scenarioSelect';
import type { GroundedAnswer, InvestigationState } from './types';

function cleanRationale(text: string): string {
  const cleaned = text
    .replace(/OpEx constraint\.?/gi, '')
    .replace(/Overlapping benefits not summed\.?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || 'Review this recommendation with the owning domain.';
}

function humanDecisionTitle(title: string): string {
  const mapped = scenarioLabelForId(title);
  if (mapped !== title) return mapped;
  return title.replace(/^Recommended Management Action:\s*/i, '').replace(/\b[a-z]+(?:-[a-z0-9]+)+\b/g, (id) => scenarioLabelForId(id));
}

const RELATED_QUESTIONS = [
  'Why are denials rising and what intervention should finance review?',
  'What if we improve supply efficiency without adding staff?',
  'How is hospital performing this period?',
  'What is the status of my decision proposals?',
];

const HISTORY_KEY = 'datavital.enterpriseAi.queryHistory.demo';
const STATE_KEY = 'datavital.enterpriseAi.investigationState.demo';
const ROLE_KEY = 'datavital.enterpriseAi.role.demo';

const ROLES: ExecutiveRole[] = ['CEO/Board', 'COO', 'CFO', 'CMO/CNO'];

type Detail = { name: string; value: string; definition: string; scope: string; formula?: string; limitations?: string };
type Tone = 'good' | 'watch' | 'alert' | 'neutral';
type Kpi = { name: string; value: string; delta: string; tone?: Tone; testId?: string; detail: Detail };

function readHistory(): string[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = window.sessionStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function pushHistory(q: string): string[] {
  const next = [q, ...readHistory().filter((item) => item !== q)].slice(0, 8);
  try {
    window.sessionStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

function readState(): InvestigationState | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = window.sessionStorage.getItem(STATE_KEY);
    return raw ? (JSON.parse(raw) as InvestigationState) : null;
  } catch {
    return null;
  }
}

function writeState(state: InvestigationState | null) {
  try {
    if (typeof window === 'undefined') return;
    if (!state) {
      window.sessionStorage.removeItem(STATE_KEY);
      return;
    }
    window.sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function readRole(): ExecutiveRole {
  try {
    if (typeof window === 'undefined') return 'CEO/Board';
    const raw = window.sessionStorage.getItem(ROLE_KEY) as ExecutiveRole | null;
    return raw && ROLES.includes(raw) ? raw : 'CEO/Board';
  } catch {
    return 'CEO/Board';
  }
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function num(value: number, digits = 0): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function score(
  name: string,
  value: string,
  delta: string,
  fullName: string,
  definition: string,
  scope: string,
  extra?: { testId?: string; tone?: Tone },
): Kpi {
  return {
    name,
    value,
    delta,
    tone: extra?.tone,
    testId: extra?.testId,
    detail: { name: fullName, value, definition, scope },
  };
}

function Disclosure() {
  const mode = resolveActiveMode();
  return (
    <section className="gc-panel gc-insight span-12" data-testid="enterprise-ai-disclosure">
      <h2>Data scope</h2>
      <p data-testid="enterprise-ai-mode">
        Illustrative hospital demonstration for leadership review — {mode.label}.
        Not live clinical or financial records. Recommendations require human approval and do not change domain ledgers.
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
  kpis: Kpi[];
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
          <p>{open.scope}</p>
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

function severityTone(severity: string): Tone {
  if (severity === 'critical' || severity === 'Critical') return 'alert';
  if (severity === 'warning' || severity === 'high' || severity === 'Elevated') return 'watch';
  if (severity === 'healthy' || severity === 'Approved') return 'good';
  return 'neutral';
}

export function EnterpriseAiPage() {
  const store = useShowcase();
  const { period } = usePeriod();
  const copilot = useCopilot();
  const ent = useMemo(
    () => buildEnterpriseView(store.hospital, store.year, period),
    [store.hospital, store.year, period],
  );
  const [query, setQuery] = useState(FLAGSHIP_QUESTION);
  const [history, setHistory] = useState<string[]>(() => readHistory());
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<GroundedAnswer | null>(null);
  const [invState, setInvState] = useState<InvestigationState | null>(() => readState());
  const [role, setRole] = useState<ExecutiveRole>(() => readRole());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);

  const focusMetricId = answer?.focusMetricId
    ?? invState?.focusMetricId
    ?? resolveFocusFromQuestion(query).focusMetricId
    ?? null;

  const investigation = useMemo(
    () => runInvestigation({
      hospital: store.hospital,
      year: store.year,
      period,
      focusMetricId: focusMetricId ?? 'beds.occupancy',
      additionalMetricIds: focusMetricId ? undefined : [
        'ed.wait.median_min',
        'icu.staffing_gap_hours',
        'rcm.net_patient_revenue',
        'sc.critical_stockouts',
        'px.overall_satisfaction',
        'qs.overdue_high_risk_actions',
      ],
    }),
    [store.hospital, store.year, period, focusMetricId],
  );

  const lineage = useMemo(() => {
    const ids = new Set<string>([
      focusMetricId ?? 'ed.wait.median_min',
      ...(investigation.relatedMetrics.slice(0, 5)),
    ]);
    return listMetrics().filter((m) => ids.has(m.id)).slice(0, 6);
  }, [focusMetricId, investigation.relatedMetrics]);

  const risks = useMemo(
    () => rankHospitalRisks({ hospital: store.hospital, year: store.year, period, limit: 5 }),
    [store.hospital, store.year, period],
  );

  function runQuery(raw: string, prior?: InvestigationState | null) {
    const q = raw.trim();
    if (!q) return;
    setLoading(true);
    try {
      const result = orchestrate({
        question: q,
        hospital: store.hospital,
        year: store.year,
        period,
        priorState: (prior ?? invState) ?? undefined,
      });
      setAnswer(result);
      if (result.investigationState) {
        setInvState(result.investigationState);
        writeState(result.investigationState);
        if (result.investigationState.pendingApprovalConfirm) setConfirmOpen(true);
      }
      setHistory(pushHistory(q));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    try {
      const result = orchestrate({
        question: FLAGSHIP_QUESTION,
        hospital: store.hospital,
        year: store.year,
        period,
      });
      setAnswer(result);
      setQuery(FLAGSHIP_QUESTION);
      if (result.investigationState) {
        setInvState(result.investigationState);
        writeState(result.investigationState);
      }
      setHistory(pushHistory(FLAGSHIP_QUESTION));
    } finally {
      setLoading(false);
    }
  }, [store.hospital, store.year, period]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    runQuery(query);
  }

  function onRoleChange(next: ExecutiveRole) {
    setRole(next);
    try {
      window.sessionStorage.setItem(ROLE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  const decisionId = answer?.decisionProposalId ?? invState?.decisionProposalId;
  const decisions = listDecisions();
  const activeDecision = decisionId
    ? decisions.find((d) => d.id === decisionId) ?? decisions[0]
    : decisions[0];
  const outcome = activeDecision?.outcomeId ? getOutcome(activeDecision.outcomeId) : null;
  const executive = answer?.executive;
  const emphasis = roleEmphasis(role);
  const f = ent.facts;
  const periodLabel = `${ent.hospital} · ${ent.periodLabel}`;

  const riskSeverity = risks.risks[0]?.severity ?? 'watch';
  const kpis: Kpi[] = [
    score('Occupancy', pct(f.occupancy), 'Capacity', 'Bed occupancy', 'Share of staffed beds occupied', periodLabel, {
      testId: 'value-eai-occupancy',
      tone: f.occupancy >= 0.9 ? 'alert' : f.occupancy >= 0.85 ? 'watch' : 'good',
    }),
    score('ED wait', `${num(f.edWaitMedianMin, 1)} min`, 'Access', 'Emergency wait', 'Median door-to-provider minutes', periodLabel, {
      testId: 'value-eai-ed',
      tone: f.edWaitMedianMin >= 55 ? 'alert' : f.edWaitMedianMin >= 40 ? 'watch' : 'good',
    }),
    score('Denials', pct(f.grossDenialRate), 'Revenue', 'Gross denial rate', 'Denied claims share from Revenue Cycle', periodLabel, {
      testId: 'value-eai-denial',
      tone: f.grossDenialRate > 0.1 ? 'alert' : f.grossDenialRate > 0.08 ? 'watch' : 'good',
    }),
    score('Safety', String(f.overdueHighRiskActions), 'Quality', 'Overdue high-risk actions', 'Open high-risk quality actions past due', periodLabel, {
      testId: 'value-eai-safety',
      tone: f.overdueHighRiskActions > 10 ? 'alert' : f.overdueHighRiskActions > 5 ? 'watch' : 'good',
    }),
    score('Supply', String(f.criticalStockouts), 'Continuity', 'Critical stockouts', 'Critical supply items currently stocked out', periodLabel, {
      testId: 'value-eai-supply',
      tone: f.criticalStockouts >= 3 ? 'alert' : f.criticalStockouts > 0 ? 'watch' : 'good',
    }),
    score('Attention', String(risks.risks.length), riskSeverity === 'critical' ? 'Needs review' : 'Watch list', 'Leadership attention items', 'Hospital risks requiring leadership attention this period', periodLabel, {
      testId: 'value-eai-risks',
      tone: severityTone(riskSeverity),
    }),
  ];

  const priorityItems = (answer?.risks?.length
    ? answer.risks
    : risks.risks.map((r) => ({
      id: r.id,
      title: r.title,
      severity: r.severity,
      evidence: r.evidence,
    }))).slice(0, 5);

  return (
    <Page
      kicker="Enterprise AI · Leadership"
      title="Enterprise AI Investigation"
      testId="enterprise-ai-page"
      ribbonTestId="enterprise-ai-ribbon"
      kpis={kpis}
    >
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <section className="gc-panel" data-testid="enterprise-ai-workspace">
            <h2>Hospital brief</h2>
            <p data-testid="enterprise-ai-focus-label">
              Focus: {executiveMetricLabel(focusMetricId)} · {periodLabel}
            </p>
            {loading && !executive ? <p>Preparing leadership brief…</p> : null}
            {answer && executive ? (
              <div data-testid="enterprise-ai-executive-response">
                <div data-testid="enterprise-ai-section-A">
                  <h3>Summary</h3>
                  <p data-testid="enterprise-ai-answer">{executive.A_executiveSummary}</p>
                </div>
                <div data-testid="enterprise-ai-section-B">
                  <h3>Risk</h3>
                  <p>
                    <span className={`gc-sev gc-sev-${executive.B_riskAssessment.severity === 'Critical' ? 'critical' : 'medium'}`}>
                      {executive.B_riskAssessment.severity}
                    </span>
                    {' '}{executive.B_riskAssessment.rationale}
                  </p>
                </div>
                <div data-testid="enterprise-ai-section-C">
                  <h3>Why this is happening</h3>
                  <ul className="gc-alert-list" data-testid="enterprise-ai-drivers">
                    {executive.C_whyThisIsHappening.map((d) => (
                      <li key={`${d.metricId}-${d.title}`}>
                        <span className={`gc-sev gc-sev-${d.status === 'Contradicted' ? 'critical' : 'medium'}`}>
                          {d.status === 'Supported' ? 'supported' : d.status === 'Contradicted' ? 'review' : 'watch'}
                        </span>
                        {' '}{d.title} · {d.evidence}
                      </li>
                    ))}
                  </ul>
                </div>
                <div data-testid="enterprise-ai-section-D">
                  <h3>Business impact</h3>
                  <p>{executive.D_businessImpact}</p>
                </div>
                <div data-testid="enterprise-ai-section-F">
                  <h3>Preferred option</h3>
                  <p data-testid="enterprise-ai-preferred"><strong>{executive.F_preferredOption.label}</strong></p>
                  <p>{executive.F_preferredOption.rationale}</p>
                </div>
                <div data-testid="enterprise-ai-section-E">
                  <h3>Recommended actions</h3>
                  {executive.E_recommendedActions.length === 0 ? (
                    <p>No actions ready — open a related question below.</p>
                  ) : (
                    <ul className="gc-alert-list">
                      {executive.E_recommendedActions.map((a) => (
                        <li key={a.id}>
                          <strong>{a.label}</strong> · Owner: {a.owner}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div data-testid="enterprise-ai-section-G">
                  <h3>Follow-up</h3>
                  <p>{executive.G_followUpMeasurement}</p>
                </div>
                {executive.clarificationTopics && executive.clarificationTopics.length > 0 ? (
                  <div data-testid="enterprise-ai-clarification">
                    <h3>Clarify focus</h3>
                    <ul className="gc-alert-list">
                      {executive.clarificationTopics.map((t) => (
                        <li key={t}>
                          <button
                            type="button"
                            className="gc-text-btn"
                            onClick={() => { setQuery(`Investigate ${t}`); runQuery(`Investigate ${t}`); }}
                          >
                            {t}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : (
              <>
                <p>Leadership brief will appear here from hospital facts.</p>
                <ul className="gc-alert-list" data-testid="enterprise-ai-drivers">
                  {investigation.drivers.slice(0, 5).map((d) => (
                    <li key={`${d.edgeId}-${d.relatedMetricId}`}>
                      <span className="gc-sev gc-sev-medium">{driverStatusLabel(d.status)}</span>
                      {' '}{executiveMetricLabel(d.relatedMetricId)}
                    </li>
                  ))}
                </ul>
                <p data-testid="enterprise-ai-missing">Detail stays on owning domain screens.</p>
              </>
            )}
          </section>
        </div>
        <div className="gc-ed-pack-col">
          <section className="gc-panel gc-insight">
            <h2>Priority signals</h2>
            <ul className="gc-alert-list" data-testid="enterprise-ai-risks">
              {priorityItems.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => {
                      const q = `Investigate ${r.title}`;
                      setQuery(q);
                      runQuery(q);
                    }}
                  >
                    <span className={`gc-sev gc-sev-${r.severity === 'critical' ? 'critical' : 'medium'}`}>{r.severity}</span>
                    {r.title}
                    <em className="gc-alert-scope"> · {periodLabel}</em>
                  </button>
                </li>
              ))}
            </ul>
            <p>Alert scope matches the selected reporting period ({ent.periodLabel}).</p>
            <div className="gc-next">
              <h2>Management action</h2>
              <p>
                {executive?.F_preferredOption.label
                  ? `Review preferred option “${executive.F_preferredOption.label}” for ${periodLabel}.`
                  : `Review hospital attention items for ${periodLabel}.`}
              </p>
              <button type="button" className="gc-ai-cta" onClick={() => copilot.setOpen(true)}>
                <span className="gc-ai-orb" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M4 20l7.2-7.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M12.8 5.2l1.4 3.4 3.4 1.4-3.4 1.4-1.4 3.4-1.4-3.4-3.4-1.4 3.4-1.4z" fill="currentColor" />
                    <path d="M19 4l.7 1.7L21.4 6.4 19.7 7.1 19 8.8l-.7-1.7L16.6 6.4l1.7-.7z" fill="currentColor" />
                  </svg>
                </span>
                Open Vital Assist
              </button>
              <Link to="/enterprise-ai/decisions" className="gc-text-btn">Open the decision review</Link>
            </div>
          </section>
        </div>
      </div>

      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <section className="gc-panel" data-testid="enterprise-ai-evidence">
            <h2>Key figures</h2>
            <p>Figures linked to this brief for {periodLabel}.</p>
            <div className="gc-exception-list">
              {lineage.map((m) => {
                const value = resolveMetric(m.id, { hospital: store.hospital, year: store.year, period });
                return (
                  <article key={m.id} className="gc-exception gc-tone-neutral" data-testid={`lineage-${m.id}`}>
                    <strong>{executiveMetricLabel(m.id)}</strong>
                    <span>{m.owningDomain}</span>
                    <span className="gc-ltr">{formatMetricValue(m.id, value)}</span>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
        <div className="gc-ed-pack-col">
          <section className="gc-panel" data-testid="enterprise-ai-decision-panel">
            <h2>Recommended decision</h2>
            {activeDecision ? (
              <div data-testid="enterprise-ai-active-decision">
                <p><strong>{humanDecisionTitle(activeDecision.title)}</strong> · {activeDecision.status}</p>
                <p>{cleanRationale(activeDecision.rationale)}</p>
                <p>Outcome: {outcome?.observed ?? 'Not yet measured'}</p>
                {(confirmOpen || invState?.pendingApprovalConfirm) ? (
                  <p data-testid="enterprise-ai-approval-confirm">Confirm below — approval does not change hospital figures.</p>
                ) : null}
                <div className="gc-next">
                  <button
                    type="button"
                    className="gc-btn"
                    data-testid="enterprise-ai-approve"
                    onClick={() => {
                      setConfirmOpen(true);
                      approveDecision(activeDecision.id);
                      setAnswer((a) => (a ? { ...a } : a));
                      setInvState((s) => (s ? { ...s, pendingApprovalConfirm: false } : s));
                    }}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="gc-text-btn"
                    data-testid="enterprise-ai-reject"
                    onClick={() => { transitionDecision(activeDecision.id, 'Rejected'); setAnswer((a) => (a ? { ...a } : a)); }}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    className="gc-text-btn"
                    data-testid="enterprise-ai-defer"
                    onClick={() => { transitionDecision(activeDecision.id, 'Deferred'); setAnswer((a) => (a ? { ...a } : a)); }}
                  >
                    Defer
                  </button>
                  <Link to="/enterprise-ai/decisions" className="gc-text-btn">All decisions</Link>
                </div>
              </div>
            ) : (
              <p>No decision ready yet for this brief.</p>
            )}
          </section>
        </div>
      </div>

      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <section className="gc-panel">
            <h2>Leadership note</h2>
            <p>
              This screen prepares a hospital brief for leadership. Operational detail stays on owning domain screens.
              {emphasis.note ? ` ${emphasis.note}` : ''}
            </p>
          </section>
        </div>
        <div className="gc-ed-pack-col">
          <section className="gc-panel" data-testid="enterprise-ai-composer">
            <h2>Ask another question</h2>
            <p>Optional — use only to re-focus the brief.</p>
            <label className="gc-fit" data-testid="enterprise-ai-role">
              <span className="gc-kicker">View as</span>
              <select
                data-testid="enterprise-ai-role-select"
                value={role}
                onChange={(e) => onRoleChange(e.target.value as ExecutiveRole)}
              >
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            {!askOpen ? (
              <div className="gc-next">
                <button type="button" className="gc-btn" onClick={() => setAskOpen(true)}>Ask a question</button>
                <ul className="gc-alert-list" data-testid="enterprise-ai-suggestions">
                  {RELATED_QUESTIONS.slice(0, 3).map((item) => (
                    <li key={item}>
                      <button type="button" onClick={() => { setQuery(item); runQuery(item); }}>
                        <span className="gc-sev gc-sev-medium">ask</span>
                        {item.length > 64 ? `${item.slice(0, 61)}…` : item}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <form onSubmit={onSubmit}>
                <label className="gc-fit">
                  <span className="gc-kicker">Question</span>
                  <textarea
                    data-testid="enterprise-ai-query"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    rows={2}
                  />
                </label>
                <div className="gc-next">
                  <button type="submit" className="gc-btn" disabled={loading} data-testid="enterprise-ai-ask">
                    {loading ? 'Updating…' : 'Update brief'}
                  </button>
                  <button
                    type="button"
                    className="gc-text-btn"
                    data-testid="enterprise-ai-clear"
                    onClick={() => { setQuery(''); setAnswer(null); setInvState(null); writeState(null); setConfirmOpen(false); }}
                  >
                    Clear
                  </button>
                  <button type="button" className="gc-text-btn" onClick={() => setAskOpen(false)}>Hide</button>
                </div>
                {history.length > 0 ? (
                  <div data-testid="enterprise-ai-history">
                    <p className="gc-kicker">Recent</p>
                    <ul className="gc-alert-list">
                      {history.slice(0, 3).map((item) => (
                        <li key={item}>
                          <button type="button" className="gc-text-btn" onClick={() => { setQuery(item); runQuery(item); }}>
                            {item.length > 64 ? `${item.slice(0, 61)}…` : item}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </form>
            )}
          </section>
        </div>
      </div>

      {/* Keep simulation hook for tests / deep links */}
      <section className="gc-panel span-12" data-testid="enterprise-ai-simulation" hidden>
        <Link to="/enterprise-ai/optimization">Open Optimize</Link>
      </section>
    </Page>
  );
}

export function EnterpriseAiInvestigationsPage() {
  return (
    <Page
      kicker="Enterprise AI · Leadership"
      title="Investigations"
      testId="enterprise-ai-investigations"
      ribbonTestId="enterprise-ai-inv-ribbon"
      kpis={[
        score('Home', 'Brief', 'Ready', 'Investigation home', 'Return to the leadership brief', 'Enterprise AI', { tone: 'neutral' }),
      ]}
    >
      <section className="gc-panel span-12">
        <h2>Leadership note</h2>
        <p>Investigation detail is folded into the leadership brief.</p>
        <div className="gc-next">
          <Link to="/enterprise-ai" className="gc-btn">Open Investigation</Link>
        </div>
      </section>
    </Page>
  );
}

export function EnterpriseAiForecastingPage() {
  const store = useShowcase();
  const [seriesId, setSeriesId] = useState<ForecastSeriesId>('beds.occupancy');
  const forecast = useMemo(
    () => runForecast({ hospital: store.hospital, year: store.year, seriesId }),
    [store.hospital, store.year, seriesId],
  );
  return (
    <Page
      kicker="Enterprise AI · Outlook"
      title="Forecasting"
      testId="enterprise-ai-forecasting"
      ribbonTestId="enterprise-ai-fc-ribbon"
      kpis={[
        score('Series', executiveMetricLabel(seriesId).slice(0, 18), 'Selected', 'Outlook series', 'Illustrative outlook', `${store.hospital}`, { tone: 'neutral' }),
        score('Model', FORECAST_MODEL_VERSION, forecast.readiness, 'Model', 'Illustrative forecast', `${store.hospital}`, { tone: 'neutral' }),
      ]}
    >
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <section className="gc-panel">
            <h2>{executiveMetricLabel(seriesId)} outlook</h2>
            <label className="gc-fit">
              <span className="gc-kicker">Series</span>
              <select
                data-testid="enterprise-ai-forecast-series"
                value={seriesId}
                onChange={(e) => setSeriesId(e.target.value as ForecastSeriesId)}
              >
                <option value="beds.occupancy">Bed Occupancy</option>
                <option value="ed.wait.median_min">Emergency Waiting Time</option>
                <option value="ed.arrivals">Emergency Arrivals</option>
              </select>
            </label>
            <ul className="gc-alert-list" data-testid="enterprise-ai-forecast-points">
              {forecast.points.slice(-6).map((p) => (
                <li key={p.label}>
                  {p.label}: {formatForecastPoint(seriesId, p.forecast)}
                  {p.actual != null ? ` · actual ${formatForecastPoint(seriesId, p.actual)}` : ''}
                </li>
              ))}
            </ul>
            <p>Illustrative outlook only — not a financial forecast.</p>
          </section>
        </div>
        <div className="gc-ed-pack-col">
          <section className="gc-panel">
            <h2>Leadership note</h2>
            <p>Use outlook figures as discussion context, not as approved targets.</p>
            <div className="gc-next">
              <Link to="/enterprise-ai" className="gc-btn">Back to brief</Link>
            </div>
          </section>
        </div>
      </div>
    </Page>
  );
}

export function EnterpriseAiOptimizationPage() {
  const store = useShowcase();
  const { period } = usePeriod();
  const [objective, setObjective] = useState<OptimizationRequest['objective']>('strongest_operational_improvement');
  const [noStaff, setNoStaff] = useState(true);
  const [includeOvertime, setIncludeOvertime] = useState(true);
  const [includeSupply, setIncludeSupply] = useState(true);
  const [includeFlow, setIncludeFlow] = useState(true);
  const [includeStaffing, setIncludeStaffing] = useState(true);

  const decisionVariables = useMemo(() => {
    const vars: string[] = [];
    if (includeFlow) vars.push('ent-bed-assign-flow', 'ed-boarding-down');
    if (includeSupply) vars.push('st-supply-efficiency');
    if (includeOvertime) vars.push('st-reduce-overtime');
    if (includeStaffing) vars.push('ent-staffing-uplift');
    return vars.length ? vars : ['ent-bed-assign-flow', 'st-supply-efficiency'];
  }, [includeFlow, includeSupply, includeOvertime, includeStaffing]);

  const result = useMemo(
    () => runOptimization({
      hospital: store.hospital,
      year: store.year,
      period,
      decisionVariables,
      objective,
      noAdditionalStaffingCost: noStaff,
    }),
    [store.hospital, store.year, period, decisionVariables, objective, noStaff],
  );

  return (
    <Page
      kicker="Enterprise AI · Options"
      title="Compare Improvement Options"
      testId="enterprise-ai-optimization"
      ribbonTestId="enterprise-ai-opt-ribbon"
      kpis={[
        score('Ready', result.feasible ? 'Yes' : 'No', 'Under rules', 'Feasible option set', result.infeasibleReason ?? 'Options available under current rules', `${store.hospital}`, { tone: result.feasible ? 'good' : 'alert' }),
        score('Preferred', (result.selected ?? '—').slice(0, 18), 'Ranked', 'Preferred option', 'Best ranked option under the selected objective', `${store.hospital}`, { tone: 'neutral' }),
      ]}
    >
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <section className="gc-panel">
            <h2>What to compare</h2>
            <label className="gc-fit">
              <span className="gc-kicker">Objective</span>
              <select
                data-testid="enterprise-ai-opt-objective"
                value={objective}
                onChange={(e) => setObjective(e.target.value as OptimizationRequest['objective'])}
              >
                <option value="strongest_operational_improvement">Strongest operational improvement</option>
                <option value="minimize_staffing_cost">Minimize staffing cost</option>
                <option value="balanced">Balanced</option>
              </select>
            </label>
            <label className="gc-fit">
              <input type="checkbox" data-testid="enterprise-ai-opt-nostaff" checked={noStaff} onChange={(e) => setNoStaff(e.target.checked)} />
              {' '}No additional staffing cost
            </label>
            <label className="gc-fit">
              <input type="checkbox" checked={includeFlow} onChange={(e) => setIncludeFlow(e.target.checked)} /> Flow / bed assignment
            </label>
            <label className="gc-fit">
              <input type="checkbox" checked={includeSupply} onChange={(e) => setIncludeSupply(e.target.checked)} /> Supply efficiency
            </label>
            <label className="gc-fit">
              <input type="checkbox" checked={includeOvertime} onChange={(e) => setIncludeOvertime(e.target.checked)} /> Overtime reduction
            </label>
            <label className="gc-fit">
              <input type="checkbox" checked={includeStaffing} onChange={(e) => setIncludeStaffing(e.target.checked)} /> Staffing uplift candidate
            </label>
          </section>
        </div>
        <div className="gc-ed-pack-col">
          <section className="gc-panel gc-insight">
            <h2>Ranked options</h2>
            <p data-testid="enterprise-ai-opt-selected">
              Preferred: {result.selected ?? '—'} · {result.feasible ? 'Ready for review' : 'Not feasible under current rules'}
            </p>
            <ul className="gc-alert-list" data-testid="enterprise-ai-opt-ranking">
              {result.comparison.ranking.map((r) => (
                <li key={r.id}>{r.label} · score {r.score}</li>
              ))}
            </ul>
            <ul className="gc-alert-list">
              {result.tradeoffs.map((t) => <li key={t}>{t}</li>)}
            </ul>
            <div className="gc-next">
              <Link to="/enterprise-ai" className="gc-btn">Back to brief</Link>
            </div>
          </section>
        </div>
      </div>
    </Page>
  );
}

export function EnterpriseAiDecisionsPage() {
  const decisions = listDecisions();
  const outcomes = listOutcomes();
  const byStatus = (status: string) => decisions.filter((d) => d.status === status).length;
  const waiting = byStatus('Proposed') + byStatus('PendingApproval') + byStatus('Draft');
  const approved = byStatus('Approved');
  const closed = byStatus('Rejected') + byStatus('Deferred');

  const kpis: Kpi[] = [
    score('Open', String(waiting), 'Awaiting review', 'Open decisions', 'Proposals waiting for leadership review', 'Decisions', { tone: waiting ? 'watch' : 'good' }),
    score('Approved', String(approved), 'Human confirmed', 'Approved decisions', 'Approved by a leader — ledgers unchanged', 'Decisions', { tone: approved ? 'good' : 'neutral' }),
    score('Closed', String(closed), 'Rejected or deferred', 'Closed decisions', 'Rejected or deferred proposals', 'Decisions', { tone: 'neutral' }),
    score('Total', String(decisions.length), 'This demo session', 'All decisions', decisionStorageMeta().note, 'Decisions', { testId: 'value-eai-dec-total', tone: 'neutral' }),
    score('Outcomes', String(outcomes.length), 'Tracked', 'Outcome records', 'Observed outcomes linked to decisions', 'Decisions', { tone: 'neutral' }),
    score('Next', waiting ? 'Review' : 'Investigate', waiting ? 'Action needed' : 'Create from brief', 'Next step', 'Review open items or start from Investigation', 'Decisions', { tone: waiting ? 'watch' : 'neutral' }),
  ];

  return (
    <Page
      kicker="Enterprise AI · Decisions"
      title="Enterprise AI Decisions"
      testId="enterprise-ai-decisions"
      ribbonTestId="enterprise-ai-decisions-ribbon"
      kpis={kpis}
    >
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <section className="gc-panel gc-insight">
            <h2>Priority signals</h2>
            <ul className="gc-alert-list">
              {decisions.length === 0 ? (
                <li data-testid="enterprise-ai-decisions-empty">
                  <Link to="/enterprise-ai" data-testid="enterprise-ai-start-investigation">
                    <span className="gc-sev gc-sev-medium">start</span>
                    No decisions yet · Open Investigation brief
                  </Link>
                </li>
              ) : (
                decisions.map((d) => (
                  <li key={d.id}>
                    <span className={`gc-sev gc-sev-${d.status === 'Approved' ? 'medium' : d.status === 'Rejected' ? 'critical' : 'high'}`}>
                      {d.status}
                    </span>
                    {' '}{d.title}
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
        <div className="gc-ed-pack-col">
          <section className="gc-panel">
            <h2>Outcomes</h2>
            {outcomes.length === 0 ? (
              <p>No outcomes measured yet. Approve a recommendation from the Investigation brief to track one.</p>
            ) : (
              <div className="gc-exception-list">
                {outcomes.map((o) => (
                  <article key={o.id} className="gc-exception gc-tone-neutral">
                    <strong>{o.observed}</strong>
                    <span>{o.expected.slice(0, 120)}{o.expected.length > 120 ? '…' : ''}</span>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
      <section className="gc-panel span-12">
        <h2>Leadership note</h2>
        <p>Leaders approve, reject, or defer proposals. Nothing here changes hospital KPI ledgers automatically.</p>
        <div className="gc-next">
          <Link to="/enterprise-ai" className="gc-btn">Investigation brief</Link>
          <Link to="/enterprise-ai/governance" className="gc-text-btn">How we use AI</Link>
        </div>
      </section>
    </Page>
  );
}

export function EnterpriseAiGovernancePage() {
  const mode = resolveActiveMode();
  const principles = [
    { sev: 'medium' as const, title: 'Human approval required', detail: 'Recommendations never execute themselves — a leader must approve, reject, or defer.' },
    { sev: 'critical' as const, title: 'No clinical diagnosis', detail: 'This assistant does not diagnose patients or replace clinical judgment.' },
    { sev: 'critical' as const, title: 'No automatic capital spend', detail: 'Large investment decisions stay with leadership — never auto-approved.' },
    { sev: 'medium' as const, title: 'Hospital facts stay intact', detail: 'Approving a proposal does not rewrite revenue, quality, or operations ledgers.' },
    { sev: 'medium' as const, title: 'Illustrative scenarios', detail: 'What-if and outlook figures are for discussion — not claimed ROI or clinical accuracy.' },
    { sev: 'medium' as const, title: 'Topic follows the question', detail: 'The brief focuses on what leadership asked — it does not silently switch to another department.' },
  ];

  const kpis: Kpi[] = [
    score('Approval', 'Human', 'Required', 'Human approval', 'Every management action needs a person', 'Governance', { tone: 'good' }),
    score('Clinical', 'Refused', 'Guardrail', 'Clinical diagnosis', 'No patient diagnosis claims', 'Governance', { tone: 'good' }),
    score('Capital', 'Human only', 'Guardrail', 'Capital spend', 'No automatic CapEx approval', 'Governance', { tone: 'good' }),
    score('Ledgers', 'Protected', 'Unchanged', 'KPI ledgers', 'Approvals do not mutate domain facts', 'Governance', { tone: 'good' }),
    score('Scenarios', 'Illustrative', 'Discussion', 'What-if claims', 'Scenarios support discussion only', 'Governance', { tone: 'watch' }),
    score('Focus', 'Question-led', 'Aligned', 'Brief focus', 'Focus follows the leadership question', 'Governance', { testId: 'value-eai-gov-mode', tone: 'good' }),
  ];

  return (
    <Page
      kicker="Enterprise AI · Trust"
      title="Enterprise AI Governance"
      testId="enterprise-ai-governance"
      ribbonTestId="enterprise-ai-governance-ribbon"
      kpis={kpis}
    >
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <section className="gc-panel gc-insight">
            <h2>Priority signals</h2>
            <ul className="gc-alert-list">
              {principles.map((item) => (
                <li key={item.title}>
                  <span className={`gc-sev gc-sev-${item.sev}`}>{item.sev === 'critical' ? 'critical' : 'medium'}</span>
                  {' '}{item.title} · {item.detail}
                </li>
              ))}
            </ul>
          </section>
        </div>
        <div className="gc-ed-pack-col">
          <section className="gc-panel">
            <h2>How leaders should use this</h2>
            <p data-testid="enterprise-ai-mode">
              Analysis Mode: {mode.label}. Use the Investigation brief for attention items, Decisions for human review,
              and owning domain screens for operational detail.
            </p>
            <div className="gc-exception-list">
              <article className="gc-exception gc-tone-alert">
                <strong>Will not diagnose</strong>
                <span>Clinical decisions stay with clinicians.</span>
              </article>
              <article className="gc-exception gc-tone-alert">
                <strong>Will not spend</strong>
                <span>Capital and hiring decisions stay with leadership.</span>
              </article>
              <article className="gc-exception gc-tone-watch">
                <strong>Will not rewrite history</strong>
                <span>Approvals do not change published KPI ledgers.</span>
              </article>
            </div>
          </section>
        </div>
      </div>
      <section className="gc-panel span-12">
        <h2>Leadership note</h2>
        <p>Governance explains the boundaries of Enterprise AI in plain language — what it may suggest, and what only people can decide.</p>
        <div className="gc-next">
          <Link to="/enterprise-ai" className="gc-btn">Investigation brief</Link>
          <Link to="/enterprise-ai/decisions" className="gc-text-btn">Decisions</Link>
        </div>
      </section>
    </Page>
  );
}
