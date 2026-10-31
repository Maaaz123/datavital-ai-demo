/**
 * Domain 16 — Enterprise AI pages (Investigation / Decisions / Governance + secondary tools).
 * Same Page / ribbon / pack pattern as Quality & Executive — lean leadership UX.
 */
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useShowcase } from '@/showcase/state';
import { useCopilot } from '../Copilot';
import { usePeriod } from '../period';
import { listKnowledgeEdges } from './knowledgeGraph';
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
import type { GroundedAnswer, InvestigationState } from './types';

const SUGGESTIONS = [
  FLAGSHIP_QUESTION,
  'Why are denials rising and what intervention should finance review?',
  'What if we improve supply efficiency without adding staff?',
  'How is hospital performing this period?',
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
    window.sessionStorage.setItem(`${HISTORY_KEY}.label`, 'demo-session-state');
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
    window.sessionStorage.setItem(`${STATE_KEY}.label`, 'demo-session-state');
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

function score(
  name: string,
  value: string,
  delta: string,
  fullName: string,
  definition: string,
  scope: string,
  extra?: { formula?: string; limitations?: string; testId?: string; tone?: Tone },
): Kpi {
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
    },
  };
}

function Disclosure() {
  return (
    <section className="gc-panel gc-insight span-12" data-testid="enterprise-ai-disclosure">
      <h2>Data scope</h2>
      <p>
        Deterministic management analytics on illustrative hospital demo data — not an unrestricted live LLM,
        not clinical diagnosis, and not an autonomous decision engine. Approval does not mutate domain KPI ledgers.
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

function TechnicalAudit({ answer }: { answer: GroundedAnswer }) {
  return (
    <details data-testid="enterprise-ai-technical-audit">
      <summary className="gc-kicker">Technical audit</summary>
      <p>Analysis Mode: {answer.modeLabel}</p>
      <p className="gc-kicker">Steps</p>
      <ol>
        {answer.steps.map((step) => <li key={step}>{step}</li>)}
      </ol>
      <p className="gc-kicker">Supporting Evidence (tool result IDs)</p>
      <ul className="gc-alert-list" data-testid="enterprise-ai-citations">
        {answer.citations.map((c) => (
          <li key={c.toolResultId}>
            <strong>{c.toolResultId}</strong> · {c.claim}
          </li>
        ))}
      </ul>
    </details>
  );
}

function ToolLinks() {
  return (
    <nav className="gc-next" data-testid="enterprise-ai-subnav">
      <Link to="/enterprise-ai" className="gc-btn">Investigate</Link>
      <Link to="/enterprise-ai/decisions" className="gc-text-btn">Decisions</Link>
      <Link to="/enterprise-ai/governance" className="gc-text-btn">Governance</Link>
      <Link to="/enterprise-ai/optimization" className="gc-text-btn">Optimize</Link>
      <Link to="/enterprise-ai/forecasting" className="gc-text-btn">Forecast</Link>
    </nav>
  );
}

export function EnterpriseAiPage() {
  const store = useShowcase();
  const { period } = usePeriod();
  const copilot = useCopilot();
  const mode = resolveActiveMode();
  const [query, setQuery] = useState(FLAGSHIP_QUESTION);
  const [history, setHistory] = useState<string[]>(() => readHistory());
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<GroundedAnswer | null>(null);
  const [invState, setInvState] = useState<InvestigationState | null>(() => readState());
  const [role, setRole] = useState<ExecutiveRole>(() => readRole());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);

  const focusMetricId = answer?.focusMetricId
    ?? invState?.focusMetricId
    ?? resolveFocusFromQuestion(query).focusMetricId
    ?? null;

  const investigation = useMemo(
    () => {
      if (!focusMetricId) {
        return runInvestigation({
          hospital: store.hospital,
          year: store.year,
          period,
          focusMetricId: 'beds.occupancy',
          additionalMetricIds: [
            'ed.wait.median_min',
            'icu.staffing_gap_hours',
            'rcm.net_patient_revenue',
            'sc.critical_stockouts',
            'px.overall_satisfaction',
            'qs.overdue_high_risk_actions',
          ],
        });
      }
      return runInvestigation({
        hospital: store.hospital,
        year: store.year,
        period,
        focusMetricId,
      });
    },
    [store.hospital, store.year, period, focusMetricId],
  );

  const lineage = useMemo(() => {
    const ids = new Set<string>([
      focusMetricId ?? 'beds.occupancy',
      ...(investigation.relatedMetrics.slice(0, 6)),
    ]);
    return listMetrics().filter((m) => ids.has(m.id)).slice(0, 6);
  }, [focusMetricId, investigation.relatedMetrics]);

  const risks = useMemo(
    () => rankHospitalRisks({ hospital: store.hospital, year: store.year, period, limit: 5 }),
    [store.hospital, store.year, period],
  );

  useEffect(() => {
    if (invState && (invState.hospital !== store.hospital || invState.period !== period || invState.year !== store.year)) {
      const next = { ...invState, hospital: store.hospital, year: store.year, period };
      setInvState(next);
      writeState(next);
    }
  }, [store.hospital, store.year, period, invState]);

  function runQuery(raw: string) {
    const q = raw.trim();
    if (!q) return;
    setLoading(true);
    try {
      const result = orchestrate({
        question: q,
        hospital: store.hospital,
        year: store.year,
        period,
        priorState: invState ?? undefined,
      });
      setAnswer(result);
      if (result.investigationState) {
        setInvState(result.investigationState);
        writeState(result.investigationState);
        if (result.investigationState.pendingApprovalConfirm) {
          setConfirmOpen(true);
        }
      }
      if (/show evidence|expand evidence|supporting evidence/i.test(q)) {
        setShowEvidence(true);
      }
      setHistory(pushHistory(q));
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    runQuery(query);
  }

  function onRoleChange(next: ExecutiveRole) {
    setRole(next);
    try {
      window.sessionStorage.setItem(ROLE_KEY, next);
      window.sessionStorage.setItem(`${ROLE_KEY}.label`, 'demo-session-state');
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
  const periodLabel = `${store.hospital} · ${period} ${store.year}`;

  const kpis: Kpi[] = [
    score('Mode', 'Deterministic', mode.label, 'Analysis Mode', mode.disclosure, periodLabel, {
      testId: 'enterprise-ai-mode',
      tone: 'good',
    }),
    score('Focus', executiveMetricLabel(focusMetricId).slice(0, 18), focusMetricId ? 'Topic-aligned' : 'Hospital-wide', 'Investigation focus', 'Focus metric derived from the management question', periodLabel, {
      testId: 'value-eai-focus',
      tone: focusMetricId ? 'neutral' : 'watch',
    }),
    score('Drivers', String(investigation.drivers.length), investigation.disclaimer.includes('not definitive') ? 'Associative' : 'Reviewed', 'Contributing factors', 'Knowledge-graph linked drivers for the focus metric', periodLabel, {
      testId: 'value-eai-drivers',
      tone: 'neutral',
    }),
    score('Risks', String(risks.risks.length), 'Period watch', 'Period risks', 'Threshold risks across domains for this hospital / period', periodLabel, {
      testId: 'value-eai-risks',
      tone: risks.risks.some((r) => r.severity === 'critical') ? 'alert' : 'watch',
    }),
    score('Decision', activeDecision?.status ?? 'None', activeDecision ? 'Demo state' : 'No proposal', 'Decision status', decisionStorageMeta().note, periodLabel, {
      testId: 'value-eai-decision',
      tone: activeDecision?.status === 'Approved' ? 'good' : activeDecision ? 'watch' : 'neutral',
    }),
    score('Role', role.split('/')[0] ?? role, 'Presentation', 'Executive role', emphasis.note, periodLabel, {
      testId: 'value-eai-role',
      tone: 'neutral',
    }),
  ];

  return (
    <Page
      kicker="Enterprise AI · CEO / COO / CFO / CMO"
      title="Enterprise AI Investigation"
      testId="enterprise-ai-page"
      ribbonTestId="enterprise-ai-ribbon"
      kpis={kpis}
    >
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <section className="gc-panel" data-testid="enterprise-ai-composer">
            <h2>Ask a management question</h2>
            <form onSubmit={onSubmit}>
              <label className="gc-fit">
                <span className="gc-kicker">Question</span>
                <textarea
                  data-testid="enterprise-ai-query"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  rows={3}
                />
              </label>
              <label className="gc-fit" data-testid="enterprise-ai-role">
                <span className="gc-kicker">Executive role (presentation only)</span>
                <select
                  data-testid="enterprise-ai-role-select"
                  value={role}
                  onChange={(e) => onRoleChange(e.target.value as ExecutiveRole)}
                >
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </label>
              <div className="gc-next">
                <button type="submit" className="gc-btn" disabled={loading} data-testid="enterprise-ai-ask">
                  {loading ? 'Running…' : 'Investigate'}
                </button>
                <button
                  type="button"
                  className="gc-text-btn"
                  data-testid="enterprise-ai-clear"
                  onClick={() => { setQuery(''); setAnswer(null); setInvState(null); writeState(null); setConfirmOpen(false); }}
                >
                  Clear
                </button>
                <button type="button" className="gc-text-btn" onClick={() => copilot.setOpen(true)}>
                  Open Vital Assist
                </button>
              </div>
            </form>
          </section>
        </div>
        <div className="gc-ed-pack-col">
          <section className="gc-panel gc-insight">
            <h2>Priority signals</h2>
            <ul className="gc-alert-list" data-testid="enterprise-ai-suggestions">
              {SUGGESTIONS.map((item) => (
                <li key={item}>
                  <button type="button" onClick={() => { setQuery(item); runQuery(item); }}>
                    <span className="gc-sev gc-sev-medium">ask</span>
                    {item.length > 72 ? `${item.slice(0, 69)}…` : item}
                  </button>
                </li>
              ))}
            </ul>
            {history.length > 0 ? (
              <div data-testid="enterprise-ai-history">
                <p className="gc-kicker">Recent (demo session)</p>
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
          </section>
        </div>
      </div>

      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <section className="gc-panel" data-testid="enterprise-ai-workspace">
            <h2>Executive brief</h2>
            <p data-testid="enterprise-ai-focus-label">
              Focus: {executiveMetricLabel(focusMetricId)}{focusMetricId ? '' : ' (clarification / hospital-wide)'}
            </p>
            {answer && executive ? (
              <div data-testid="enterprise-ai-executive-response">
                <div data-testid="enterprise-ai-section-A">
                  <h3>Executive summary</h3>
                  <p data-testid="enterprise-ai-answer">{executive.A_executiveSummary}</p>
                </div>
                <div data-testid="enterprise-ai-section-B">
                  <h3>Risk assessment</h3>
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
                        <span className={`gc-sev gc-sev-${d.status === 'Contradicted' ? 'critical' : 'medium'}`}>{d.status}</span>
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
                  <p data-testid="enterprise-ai-preferred">{executive.F_preferredOption.label}</p>
                  <p>{executive.F_preferredOption.rationale}</p>
                </div>
                <div data-testid="enterprise-ai-section-E">
                  <h3>Recommended actions</h3>
                  {executive.E_recommendedActions.length === 0 ? (
                    <p>No recommended actions yet — clarify focus or compare improvement options.</p>
                  ) : (
                    <ul className="gc-alert-list">
                      {executive.E_recommendedActions.map((a) => (
                        <li key={a.id}>
                          <strong>{a.label}</strong> · {a.owner} · {a.feasibility}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div data-testid="enterprise-ai-section-G">
                  <h3>Follow-up & measurement</h3>
                  <p>{executive.G_followUpMeasurement}</p>
                </div>
                {executive.clarificationTopics && executive.clarificationTopics.length > 0 ? (
                  <div data-testid="enterprise-ai-clarification">
                    <h3>Clarification topics</h3>
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
                <TechnicalAudit answer={answer} />
              </div>
            ) : (
              <>
                <p>Run Investigate to assemble a grounded executive brief from domain facts.</p>
                <h3>Possible contributing factors</h3>
                <ul className="gc-alert-list" data-testid="enterprise-ai-drivers">
                  {investigation.drivers.map((d) => (
                    <li key={`${d.edgeId}-${d.relatedMetricId}`}>
                      <span className={`gc-sev gc-sev-${d.status === 'contradicted' ? 'critical' : 'medium'}`}>
                        {driverStatusLabel(d.status)}
                      </span>
                      {' '}{executiveMetricLabel(d.relatedMetricId)}
                    </li>
                  ))}
                </ul>
                <p data-testid="enterprise-ai-missing">{investigation.disclaimer}</p>
              </>
            )}
          </section>
        </div>
        <div className="gc-ed-pack-col">
          <section className="gc-panel" data-testid="enterprise-ai-evidence">
            <h2>Supporting evidence</h2>
            <p>Focus-aligned metrics for {periodLabel}.</p>
            <div className="gc-exception-list">
              {lineage.map((m) => {
                const value = resolveMetric(m.id, { hospital: store.hospital, year: store.year, period });
                return (
                  <article key={m.id} className="gc-exception gc-tone-neutral" data-testid={`lineage-${m.id}`}>
                    <strong>{executiveMetricLabel(m.id)}</strong>
                    <span>{m.owningDomain} · <span className="gc-ltr">{formatMetricValue(m.id, value)}</span></span>
                  </article>
                );
              })}
            </div>
            {(showEvidence || answer || risks.risks.length > 0) ? (
              <div data-testid="enterprise-ai-risks">
                <h3>Other factors to consider</h3>
                <ul className="gc-alert-list">
                  {(answer?.risks ?? risks.risks.map((r) => ({
                    id: r.id,
                    title: r.title,
                    severity: r.severity,
                    metricId: r.metricId,
                    evidence: r.evidence,
                  }))).slice(0, 5).map((r) => (
                    <li key={r.id}>
                      <span className={`gc-sev gc-sev-${r.severity === 'critical' ? 'critical' : 'medium'}`}>{r.severity}</span>
                      {' '}{r.title}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p className="gc-kicker">Knowledge graph edges: {listKnowledgeEdges().length}</p>
          </section>

          <section className="gc-panel" data-testid="enterprise-ai-decision-panel">
            <h2>Recommended action</h2>
            <p>{decisionStorageMeta().note}</p>
            {activeDecision ? (
              <div className="gc-exception" data-testid="enterprise-ai-active-decision">
                <strong>{activeDecision.title}</strong>
                <span>Status: {activeDecision.status}</span>
                <p>{activeDecision.rationale}</p>
                <p>Observed: {outcome?.observed ?? 'Outcome not yet measured'}</p>
                {(confirmOpen || invState?.pendingApprovalConfirm) ? (
                  <p data-testid="enterprise-ai-approval-confirm">
                    Confirm below — Approve does not mutate KPI ledgers.
                  </p>
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
                </div>
              </div>
            ) : (
              <p>No decision proposal yet — run an investigation that prepares a management action.</p>
            )}
          </section>
        </div>
      </div>

      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <section className="gc-panel" data-testid="enterprise-ai-simulation">
            <h2>Leadership note</h2>
            <p>
              Investigate → compare options → propose → human review. What-if benefits are illustrative and overlapping
              gains are not summed. Deep domain analysis stays on owning screens.
            </p>
            <ToolLinks />
          </section>
        </div>
        <div className="gc-ed-pack-col">
          <section className="gc-panel">
            <h2>Compare options</h2>
            <p>Constrained what-if ranking for operational improvement under staffing rules.</p>
            <div className="gc-next">
              <Link to="/enterprise-ai/optimization" className="gc-btn">Open Optimize</Link>
              <Link to="/enterprise-ai/decisions" className="gc-text-btn">Decisions</Link>
            </div>
          </section>
        </div>
      </div>
    </Page>
  );
}

export function EnterpriseAiInvestigationsPage() {
  const store = useShowcase();
  const { period } = usePeriod();
  const prior = readState();
  const focusMetricId = prior?.focusMetricId ?? 'beds.occupancy';
  const report = useMemo(
    () => runInvestigation({ hospital: store.hospital, year: store.year, period, focusMetricId }),
    [store.hospital, store.year, period, focusMetricId],
  );
  const kpis: Kpi[] = [
    score('Focus', executiveMetricLabel(report.focusMetricId).slice(0, 18), 'Session', 'Focus metric', 'Last investigation focus', `${store.hospital} · ${period}`, { tone: 'neutral' }),
    score('Observed', formatMetricValue(report.focusMetricId, report.observedValue), 'Current', 'Observed value', 'Resolved from domain canonical view', `${store.hospital} · ${period}`, { tone: 'neutral' }),
    score('Baseline', formatMetricValue(report.focusMetricId, report.baselineValue), 'Prior year', 'Baseline value', 'Prior-year comparison baseline', `${store.hospital} · ${period}`, { tone: 'neutral' }),
    score('Domains', String(report.domainsTouched.length), report.domainsTouched.slice(0, 2).join(', '), 'Domains touched', report.domainsTouched.join(', '), `${store.hospital} · ${period}`, { tone: 'neutral' }),
    score('Reconcile', report.reconciliationOk ? 'OK' : 'Issues', 'Lineage', 'Reconciliation', 'Identity / lineage checks for focus metrics', `${store.hospital} · ${period}`, { tone: report.reconciliationOk ? 'good' : 'alert' }),
    score('Drivers', String(report.drivers.length), 'Associative', 'Driver count', report.disclaimer, `${store.hospital} · ${period}`, { tone: 'watch' }),
  ];
  return (
    <Page
      kicker="Enterprise AI · Specialist"
      title="Investigations"
      testId="enterprise-ai-investigations"
      ribbonTestId="enterprise-ai-inv-ribbon"
      kpis={kpis}
    >
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <section className="gc-panel gc-insight">
            <h2>Priority signals</h2>
            <ul className="gc-alert-list">
              {report.drivers.map((d) => (
                <li key={`${d.edgeId}-${d.relatedMetricId}`}>
                  <span className={`gc-sev gc-sev-${d.status === 'contradicted' ? 'critical' : 'medium'}`}>
                    {driverStatusLabel(d.status)}
                  </span>
                  {' '}{executiveMetricLabel(d.relatedMetricId)}
                </li>
              ))}
            </ul>
            <p>{report.disclaimer}</p>
          </section>
        </div>
        <div className="gc-ed-pack-col">
          <section className="gc-panel">
            <h2>Leadership note</h2>
            <p>Specialist investigation detail. Return to the primary Investigation screen for the executive brief.</p>
            <ToolLinks />
          </section>
        </div>
      </div>
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
  const kpis: Kpi[] = [
    score('Series', executiveMetricLabel(seriesId).slice(0, 18), 'Selected', 'Forecast series', 'Illustrative outlook series', `${store.hospital} · ${store.year}`, { tone: 'neutral' }),
    score('Model', FORECAST_MODEL_VERSION, forecast.readiness, 'Forecast model', 'Deterministic demo forecast model version', `${store.hospital} · ${store.year}`, { tone: 'neutral' }),
    score('MAE', forecast.backtest.mae == null ? '—' : forecast.backtest.mae.toFixed(2), `n=${forecast.backtest.n}`, 'Backtest MAE', 'Mean absolute error on held-out points', `${store.hospital} · ${store.year}`, { tone: 'watch' }),
    score('WAPE', forecast.backtest.wape == null ? '—' : formatForecastPoint('beds.occupancy', forecast.backtest.wape), 'Backtest', 'Backtest WAPE', 'Weighted absolute percentage error', `${store.hospital} · ${store.year}`, { tone: 'watch' }),
    score('Horizon', String(forecast.points.length), 'Points', 'Series length', 'History + outlook points', `${store.hospital} · ${store.year}`, { tone: 'neutral' }),
    score('Claim', 'Illustrative', 'Not ROI', 'Forecast claim', forecast.disclaimer, `${store.hospital} · ${store.year}`, { tone: 'watch' }),
  ];
  return (
    <Page
      kicker="Enterprise AI · Specialist"
      title="Forecasting"
      testId="enterprise-ai-forecasting"
      ribbonTestId="enterprise-ai-fc-ribbon"
      kpis={kpis}
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
                  {p.label}: forecast {formatForecastPoint(seriesId, p.forecast)}
                  {p.actual != null ? ` · actual ${formatForecastPoint(seriesId, p.actual)}` : ''}
                </li>
              ))}
            </ul>
            <p>{forecast.disclaimer}</p>
          </section>
        </div>
        <div className="gc-ed-pack-col">
          <section className="gc-panel">
            <h2>Leadership note</h2>
            <p>Forecasts are illustrative management analytics — not claimed clinical or financial accuracy.</p>
            <ToolLinks />
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

  const kpis: Kpi[] = [
    score('Feasible', result.feasible ? 'Yes' : 'No', 'Constrained', 'Feasibility', result.infeasibleReason ?? 'Constraint set satisfied', `${store.hospital} · ${period}`, { tone: result.feasible ? 'good' : 'alert' }),
    score('Selected', (result.selected ?? '—').slice(0, 18), 'Preferred', 'Selected option', 'Ranked under objective and constraints', `${store.hospital} · ${period}`, { tone: 'neutral' }),
    score('Options', String(result.comparison.ranking.length), 'Compared', 'Option count', 'Candidate interventions in ranking', `${store.hospital} · ${period}`, { tone: 'neutral' }),
    score('No staff+', noStaff ? 'On' : 'Off', 'Constraint', 'No additional staffing cost', 'Hard OpEx staffing constraint when enabled', `${store.hospital} · ${period}`, { tone: noStaff ? 'good' : 'watch' }),
    score('Tradeoffs', String(result.tradeoffs.length), 'Noted', 'Tradeoff notes', result.tradeoffs[0] ?? 'None', `${store.hospital} · ${period}`, { tone: 'watch' }),
    score('Claim', 'Illustrative', 'Not ROI', 'Optimization claim', 'Overlapping benefits are not summed', `${store.hospital} · ${period}`, { tone: 'watch' }),
  ];

  return (
    <Page
      kicker="Enterprise AI · Specialist"
      title="Compare Improvement Options"
      testId="enterprise-ai-optimization"
      ribbonTestId="enterprise-ai-opt-ribbon"
      kpis={kpis}
    >
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <section className="gc-panel">
            <h2>Constraints</h2>
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
              <input
                type="checkbox"
                data-testid="enterprise-ai-opt-nostaff"
                checked={noStaff}
                onChange={(e) => setNoStaff(e.target.checked)}
              />
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
            <h2>Priority signals</h2>
            <p data-testid="enterprise-ai-opt-selected">
              Feasible: {result.feasible ? 'yes' : 'no'} · Selected: {result.selected ?? '—'}
            </p>
            <p>Constraints: {result.constraintsApplied.join('; ')}</p>
            <ul className="gc-alert-list" data-testid="enterprise-ai-opt-ranking">
              {result.comparison.ranking.map((r) => (
                <li key={r.id}>{r.id} · score {r.score} · {r.label}</li>
              ))}
            </ul>
            <ul className="gc-alert-list">
              {result.tradeoffs.map((t) => <li key={t}>{t}</li>)}
            </ul>
            {result.infeasibleReason ? <p>{result.infeasibleReason}</p> : null}
            <ToolLinks />
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
  const proposed = byStatus('Proposed') + byStatus('PendingApproval');
  const approved = byStatus('Approved');
  const rejected = byStatus('Rejected');
  const deferred = byStatus('Deferred');
  const meta = decisionStorageMeta();

  const kpis: Kpi[] = [
    score('Total', String(decisions.length), 'Demo state', 'Decision count', meta.note, 'Enterprise AI decisions', { testId: 'value-eai-dec-total', tone: 'neutral' }),
    score('Proposed', String(proposed), 'Awaiting review', 'Proposed decisions', 'Human review required before approval', 'Enterprise AI decisions', { tone: proposed ? 'watch' : 'good' }),
    score('Approved', String(approved), 'Human OK', 'Approved decisions', 'Approved does not mutate KPI ledgers', 'Enterprise AI decisions', { tone: approved ? 'good' : 'neutral' }),
    score('Rejected', String(rejected), 'Closed', 'Rejected decisions', 'Rejected proposals remain in demo history', 'Enterprise AI decisions', { tone: 'neutral' }),
    score('Deferred', String(deferred), 'Parked', 'Deferred decisions', 'Deferred for later leadership review', 'Enterprise AI decisions', { tone: deferred ? 'watch' : 'neutral' }),
    score('Outcomes', String(outcomes.length), 'Tracked', 'Outcome records', 'Expected / simulated / observed outcome text', 'Enterprise AI decisions', { tone: 'neutral' }),
  ];

  return (
    <Page
      kicker="Enterprise AI · Decision lifecycle"
      title="Enterprise AI Decisions"
      testId="enterprise-ai-decisions"
      ribbonTestId="enterprise-ai-decisions-ribbon"
      kpis={kpis}
    >
      <div className="gc-ed-pack">
        <div className="gc-ed-pack-col">
          <section className="gc-panel gc-insight">
            <h2>Priority signals</h2>
            <p>Path: Investigate → Compare → Propose → Review → Approve / Reject / Defer</p>
            <ul className="gc-alert-list">
              {decisions.length === 0 ? (
                <li data-testid="enterprise-ai-decisions-empty">
                  <Link to="/enterprise-ai" data-testid="enterprise-ai-start-investigation">
                    <span className="gc-sev gc-sev-medium">start</span>
                    No decisions yet · Start an Investigation
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
              <p>No measured outcomes yet — approve a proposal from Investigation to create demo outcome state.</p>
            ) : (
              <div className="gc-exception-list">
                {outcomes.map((o) => (
                  <article key={o.id} className="gc-exception gc-tone-neutral">
                    <strong>{o.id}</strong>
                    <span>Observed: {o.observed}</span>
                    <span>Expected: {o.expected.slice(0, 100)}{o.expected.length > 100 ? '…' : ''}</span>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
      <section className="gc-panel span-12">
        <h2>Leadership note</h2>
        <p>
          {meta.note} Decision records are demo-session state only — not a production workflow system.
        </p>
        <ToolLinks />
      </section>
    </Page>
  );
}

export function EnterpriseAiGovernancePage() {
  const mode = resolveActiveMode();
  const edges = listKnowledgeEdges().length;
  const metrics = listMetrics().length;

  const kpis: Kpi[] = [
    score('Mode', 'Deterministic', mode.label, 'Analysis Mode', mode.disclosure, 'Enterprise AI governance', { testId: 'value-eai-gov-mode', tone: 'good' }),
    score('LLM keys', 'None', 'Frontend safe', 'API keys', 'No model API keys are stored in the frontend', 'Enterprise AI governance', { tone: 'good' }),
    score('Diagnosis', 'Refused', 'Guardrail', 'Clinical diagnosis', 'No patient-level clinical diagnosis claims', 'Enterprise AI governance', { tone: 'good' }),
    score('CapEx', 'Human only', 'No auto-approve', 'Capital spend', 'CapEx is never auto-approved by the demo agent', 'Enterprise AI governance', { tone: 'good' }),
    score('Metrics', String(metrics), 'Registry', 'Metric registry', 'Canonical metric definitions used for grounding', 'Enterprise AI governance', { tone: 'neutral' }),
    score('Graph', String(edges), 'Associative', 'Knowledge edges', 'Operational links — not definitive root causes', 'Enterprise AI governance', { tone: 'neutral' }),
  ];

  const guardrails = [
    { sev: 'medium' as const, title: 'Deterministic orchestration', detail: 'Public demo runs tool orchestration with an explicit Analysis Mode label.' },
    { sev: 'medium' as const, title: 'No frontend API keys', detail: 'LLM mode stays stubbed unless a secure backend exists.' },
    { sev: 'critical' as const, title: 'No clinical diagnosis', detail: 'Patient-level clinical diagnosis is refused.' },
    { sev: 'critical' as const, title: 'No CapEx auto-approve', detail: 'Capital decisions require human authorization.' },
    { sev: 'medium' as const, title: 'Ledger integrity', detail: 'Decision approval does not mutate historical KPI facts.' },
    { sev: 'medium' as const, title: 'Associative language', detail: 'Causal claims limited to operational-link knowledge-graph wording.' },
    { sev: 'medium' as const, title: 'Illustrative what-if / forecast', detail: 'Not claimed clinical or ROI accuracy; overlapping benefits not summed.' },
    { sev: 'high' as const, title: 'Topic-aligned focus', detail: 'Focus and scenario IDs follow the question — no silent Emergency default for unrelated topics.' },
  ];

  return (
    <Page
      kicker="Enterprise AI · Guardrails"
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
              {guardrails.map((item) => (
                <li key={item.title}>
                  <span className={`gc-sev gc-sev-${item.sev}`}>{item.sev === 'critical' ? 'critical' : item.sev === 'high' ? 'high' : 'medium'}</span>
                  {' '}{item.title} · {item.detail}
                </li>
              ))}
            </ul>
          </section>
        </div>
        <div className="gc-ed-pack-col">
          <section className="gc-panel">
            <h2>Analysis Mode</h2>
            <p data-testid="enterprise-ai-mode">
              Analysis Mode: {mode.label} · illustrative hospital demo data — not an unrestricted live LLM.
            </p>
            <p>{mode.disclosure}</p>
            <h3>Refusals</h3>
            <div className="gc-exception-list">
              <article className="gc-exception gc-tone-alert">
                <strong>Clinical diagnosis</strong>
                <span>Refused — not a medical device or diagnostic system.</span>
              </article>
              <article className="gc-exception gc-tone-alert">
                <strong>Silent CapEx approval</strong>
                <span>Refused — capital spend requires human decision.</span>
              </article>
              <article className="gc-exception gc-tone-watch">
                <strong>Live unrestricted LLM</strong>
                <span>Disabled on public demo — deterministic tools only.</span>
              </article>
            </div>
          </section>
        </div>
      </div>
      <section className="gc-panel span-12">
        <h2>Leadership note</h2>
        <p>
          Governance discloses how Enterprise AI may assist leadership — and what it will not do.
          Use Investigation for briefs and Decisions for human review of proposals.
        </p>
        <ToolLinks />
      </section>
    </Page>
  );
}
