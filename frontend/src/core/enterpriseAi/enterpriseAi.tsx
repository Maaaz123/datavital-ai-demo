/**
 * Domain 16 Stage 7 — Enterprise AI executive UX.
 * Preserve gc-* design freeze; six routes only; deterministic disclosure.
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
  'Show reconciliation and data quality for revenue lineage.',
  'What is the status of my decision proposals?',
];

const HISTORY_KEY = 'datavital.enterpriseAi.queryHistory.demo';
const STATE_KEY = 'datavital.enterpriseAi.investigationState.demo';
const ROLE_KEY = 'datavital.enterpriseAi.role.demo';

const ROLES: ExecutiveRole[] = ['CEO/Board', 'COO', 'CFO', 'CMO/CNO'];

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
  const store = useShowcase();
  const { period } = usePeriod();
  return (
    <article className="gc-command gc-ed" data-testid={testId}>
      <header className="gc-command-head">
        <div>
          <p className="gc-kicker">{kicker}</p>
          <h1>{title}</h1>
        </div>
        <p>{store.hospital} · {period}</p>
      </header>
      {children}
    </article>
  );
}

function SecondaryNav() {
  return (
    <nav className="gc-next" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }} data-testid="enterprise-ai-subnav">
      <Link to="/enterprise-ai" className="gc-btn">Investigate</Link>
      <Link to="/enterprise-ai/investigations" className="gc-text-btn">Investigations</Link>
      <Link to="/enterprise-ai/forecasting" className="gc-text-btn">Forecast</Link>
      <Link to="/enterprise-ai/optimization" className="gc-text-btn">Optimize</Link>
      <Link to="/enterprise-ai/decisions" className="gc-text-btn">Decisions</Link>
      <Link to="/enterprise-ai/governance" className="gc-text-btn">Governance</Link>
    </nav>
  );
}

function TechnicalAudit({ answer }: { answer: GroundedAnswer }) {
  const [open, setOpen] = useState(false);
  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      data-testid="enterprise-ai-technical-audit"
      style={{ marginTop: 12 }}
    >
      <summary className="gc-kicker" style={{ cursor: 'pointer' }}>Technical audit</summary>
      <p className="gc-fit">Analysis Mode: {answer.modeLabel}</p>
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
    return listMetrics().filter((m) => ids.has(m.id)).slice(0, 8);
  }, [focusMetricId, investigation.relatedMetrics]);

  const risks = useMemo(
    () => rankHospitalRisks({ hospital: store.hospital, year: store.year, period, limit: 8 }),
    [store.hospital, store.year, period],
  );

  useEffect(() => {
    // Recalculate investigation state hospital/period when filters change.
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
  const emphasized = new Set(emphasis.emphasize);

  return (
    <PageShell kicker="Enterprise AI · Decision Intelligence" title="Ask DataVital AI" testId="enterprise-ai-page">
      <SecondaryNav />

      <p className="gc-panel gc-fit" data-testid="enterprise-ai-mode" style={{ marginBottom: 8 }}>
        Analysis Mode: {mode.label} · illustrative hospital demo data — not an unrestricted live LLM.
      </p>

      <section className="gc-panel span-12" data-testid="enterprise-ai-role" style={{ marginBottom: 8 }}>
        <label className="gc-fit">
          <span className="gc-kicker">Executive role (presentation only)</span>
          <select
            data-testid="enterprise-ai-role-select"
            value={role}
            onChange={(e) => onRoleChange(e.target.value as ExecutiveRole)}
          >
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <p className="gc-fit">{emphasis.note}</p>
      </section>

      <section className="gc-panel span-12" data-testid="enterprise-ai-composer">
        <h2>Ask DataVital AI</h2>
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 6 }}>
          <label className="gc-fit">
            <span className="gc-kicker">Management question</span>
            <textarea
              data-testid="enterprise-ai-query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={2}
              style={{ width: '100%' }}
            />
          </label>
          <div className="gc-next" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
        <div style={{ marginTop: 6 }}>
          <p className="gc-kicker">Suggestions</p>
          <ul className="gc-alert-list" data-testid="enterprise-ai-suggestions">
            {SUGGESTIONS.map((item) => (
              <li key={item}>
                <button type="button" className="gc-text-btn" onClick={() => { setQuery(item); runQuery(item); }}>
                  {item}
                </button>
              </li>
            ))}
          </ul>
        </div>
        {history.length > 0 && (
          <div style={{ marginTop: 6 }} data-testid="enterprise-ai-history">
            <p className="gc-kicker">History (demo session)</p>
            <ul className="gc-alert-list">
              {history.map((item) => (
                <li key={item}>
                  <button type="button" className="gc-text-btn" onClick={() => { setQuery(item); runQuery(item); }}>
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <div className="gc-dense gc-ed-body">
        <section className="gc-panel span-12" data-testid="enterprise-ai-workspace">
          <h2>Investigation workspace</h2>
          <p data-testid="enterprise-ai-focus-label">
            Focus: {executiveMetricLabel(focusMetricId)} {focusMetricId ? '' : '(clarification / hospital-wide)'}
          </p>
          {answer && executive ? (
            <div data-testid="enterprise-ai-executive-response">
              <div data-testid="enterprise-ai-section-A" style={{ opacity: emphasized.has('A_executiveSummary') ? 1 : 0.72 }}>
                <h3>A. Executive Summary</h3>
                <p data-testid="enterprise-ai-answer">{executive.A_executiveSummary}</p>
              </div>
              <div data-testid="enterprise-ai-section-B" style={{ opacity: emphasized.has('B_riskAssessment') ? 1 : 0.72 }}>
                <h3>B. Risk Assessment</h3>
                <p>
                  <span className={`gc-sev gc-sev-${executive.B_riskAssessment.severity === 'Critical' ? 'critical' : 'medium'}`}>
                    {executive.B_riskAssessment.severity}
                  </span>
                  {' '}{executive.B_riskAssessment.rationale}
                </p>
                {executive.B_riskAssessment.rules.length > 0 && (
                  <ul className="gc-alert-list">
                    {executive.B_riskAssessment.rules.map((r) => <li key={r}>{r}</li>)}
                  </ul>
                )}
              </div>
              <div data-testid="enterprise-ai-section-C" style={{ opacity: emphasized.has('C_whyThisIsHappening') ? 1 : 0.72 }}>
                <h3>C. Why This Is Happening</h3>
                <ul className="gc-alert-list" data-testid="enterprise-ai-drivers">
                  {executive.C_whyThisIsHappening.map((d) => (
                    <li key={`${d.metricId}-${d.title}`}>
                      <span className={`gc-sev gc-sev-${d.status === 'Contradicted' ? 'critical' : 'medium'}`}>{d.status}</span>
                      {' '}{d.title} · {d.evidence}
                    </li>
                  ))}
                </ul>
              </div>
              <div data-testid="enterprise-ai-section-D" style={{ opacity: emphasized.has('D_businessImpact') ? 1 : 0.72 }}>
                <h3>D. Business Impact</h3>
                <p>{executive.D_businessImpact}</p>
              </div>
              <div data-testid="enterprise-ai-section-E" style={{ opacity: emphasized.has('E_recommendedActions') ? 1 : 0.72 }}>
                <h3>E. Recommended Actions</h3>
                {executive.E_recommendedActions.length === 0 ? (
                  <p>No recommended actions yet — clarify focus or compare improvement options.</p>
                ) : (
                  <ul className="gc-alert-list">
                    {executive.E_recommendedActions.map((a) => (
                      <li key={a.id}>
                        <strong>{a.label}</strong> · Owner: {a.owner} · {a.feasibility} · Constraints: {a.constraints}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div data-testid="enterprise-ai-section-F" style={{ opacity: emphasized.has('F_preferredOption') ? 1 : 0.72 }}>
                <h3>F. Preferred Option</h3>
                <p data-testid="enterprise-ai-preferred">{executive.F_preferredOption.label}</p>
                <p className="gc-fit">{executive.F_preferredOption.rationale}</p>
              </div>
              <div data-testid="enterprise-ai-section-G" style={{ opacity: emphasized.has('G_followUpMeasurement') ? 1 : 0.72 }}>
                <h3>G. Follow-up & Measurement</h3>
                <p>{executive.G_followUpMeasurement}</p>
              </div>
              {executive.clarificationTopics && executive.clarificationTopics.length > 0 && (
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
              )}
              <TechnicalAudit answer={answer} />
            </div>
          ) : (
            <>
              <p>Ask a management question to assemble an executive brief with Supporting Evidence.</p>
              <div style={{ marginTop: 12 }}>
                <h3>Possible Contributing Factors (current focus)</h3>
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
              </div>
            </>
          )}
        </section>

        <section className="gc-panel span-12" data-testid="enterprise-ai-evidence" style={{ display: showEvidence || answer ? undefined : undefined }}>
          <h2>Supporting Evidence</h2>
          <p>Focus-aligned metric cards (recalculated with hospital / period filters).</p>
          <div className="gc-exception-list">
            {lineage.map((m) => {
              const value = resolveMetric(m.id, { hospital: store.hospital, year: store.year, period });
              return (
                <div key={m.id} className="gc-exception" data-testid={`lineage-${m.id}`}>
                  <strong>{executiveMetricLabel(m.id)}</strong>
                  <span>{m.owningDomain}</span>
                  <span className="gc-ltr">{formatMetricValue(m.id, value)}</span>
                  <em>{m.qualityNotes}</em>
                </div>
              );
            })}
          </div>
          {(answer?.risks?.length || risks.risks.length) > 0 && (
            <div data-testid="enterprise-ai-risks" style={{ marginTop: 12 }}>
              <h3>Other Factors to Consider — period risks</h3>
              <ul className="gc-alert-list">
                {(answer?.risks ?? risks.risks.map((r) => ({
                  id: r.id,
                  title: r.title,
                  severity: r.severity,
                  metricId: r.metricId,
                  evidence: r.evidence,
                }))).slice(0, 6).map((r) => (
                  <li key={r.id}>
                    <span className={`gc-sev gc-sev-${r.severity === 'critical' ? 'critical' : 'medium'}`}>{r.severity}</span>
                    {' '}{r.title} · {r.evidence}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="gc-kicker">Knowledge graph edges: {listKnowledgeEdges().length}</p>
        </section>

        <section className="gc-panel span-12" data-testid="enterprise-ai-simulation">
          <h2>Compare Improvement Options</h2>
          <p>Illustrative what-ifs — overlapping benefits are not summed.</p>
          <Link to="/enterprise-ai/optimization" className="gc-btn">Open Optimize</Link>
        </section>

        <section className="gc-panel span-12" data-testid="enterprise-ai-decision-panel">
          <h2>Recommended Management Action</h2>
          <p>{decisionStorageMeta().note}</p>
          {activeDecision ? (
            <div className="gc-exception" data-testid="enterprise-ai-active-decision">
              <strong>{activeDecision.title}</strong>
              <span>Status: {activeDecision.status}</span>
              <p>{activeDecision.rationale}</p>
              <p>Observed: {outcome?.observed ?? 'Outcome not yet measured'}</p>
              {(confirmOpen || invState?.pendingApprovalConfirm) && (
                <p className="gc-fit" data-testid="enterprise-ai-approval-confirm">
                  Confirm decision below — Approve does not run silently and does not mutate KPI ledgers.
                </p>
              )}
              <div className="gc-next" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
            <p>No decision proposal yet — run an investigation that prepares a Recommended Management Action.</p>
          )}
        </section>
      </div>
    </PageShell>
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
  return (
    <PageShell kicker="Enterprise AI" title="Investigations" testId="enterprise-ai-investigations">
      <SecondaryNav />
      <section className="gc-panel span-12">
        <h2>Focus: {executiveMetricLabel(report.focusMetricId)}</h2>
        <p>
          Observed {formatMetricValue(report.focusMetricId, report.observedValue)}
          {' · '}prior-year baseline {formatMetricValue(report.focusMetricId, report.baselineValue)}
        </p>
        <p>Domains: {report.domainsTouched.join(', ')}</p>
        <p>Reconciliation: {report.reconciliationOk ? 'OK' : 'Issues'}</p>
        <ul className="gc-alert-list">
          {report.drivers.map((d) => (
            <li key={`${d.edgeId}-${d.relatedMetricId}`}>
              {driverStatusLabel(d.status)}: {executiveMetricLabel(d.relatedMetricId)}
            </li>
          ))}
        </ul>
        <p>{report.disclaimer}</p>
      </section>
    </PageShell>
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
    <PageShell kicker="Enterprise AI" title="Forecasting" testId="enterprise-ai-forecasting">
      <SecondaryNav />
      <section className="gc-panel span-12">
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
        <p>Model {FORECAST_MODEL_VERSION} · readiness: {forecast.readiness}</p>
        <p>
          Backtest MAE {forecast.backtest.mae == null ? '—' : forecast.backtest.mae.toFixed(2)}
          {' · '}WAPE {forecast.backtest.wape == null ? '—' : formatForecastPoint('beds.occupancy', forecast.backtest.wape)}
          {' '}(n={forecast.backtest.n})
        </p>
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
    </PageShell>
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
    <PageShell kicker="Enterprise AI" title="Compare Improvement Options" testId="enterprise-ai-optimization">
      <SecondaryNav />
      <section className="gc-panel span-12">
        <h2>Constrained comparison</h2>
        <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
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
        </div>
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
        {result.infeasibleReason && <p>{result.infeasibleReason}</p>}
      </section>
    </PageShell>
  );
}

export function EnterpriseAiDecisionsPage() {
  const decisions = listDecisions();
  const outcomes = listOutcomes();
  return (
    <PageShell kicker="Enterprise AI" title="Decisions & outcomes" testId="enterprise-ai-decisions">
      <SecondaryNav />
      <section className="gc-panel span-12">
        <h2>Decision lifecycle (demo state)</h2>
        <p>{decisionStorageMeta().note}</p>
        <p className="gc-fit">Path: Investigate → Compare → Propose → Review → Approve / Reject / Defer</p>
        <ul className="gc-alert-list">
          {decisions.length === 0 && (
            <li data-testid="enterprise-ai-decisions-empty">
              No decisions yet —{' '}
              <Link to="/enterprise-ai" className="gc-btn" data-testid="enterprise-ai-start-investigation">
                Start an Investigation
              </Link>
            </li>
          )}
          {decisions.map((d) => (
            <li key={d.id}>
              <strong>{d.title}</strong> · {d.status} · {d.id}
            </li>
          ))}
        </ul>
        <h3>Outcomes</h3>
        <ul className="gc-alert-list">
          {outcomes.map((o) => (
            <li key={o.id}>Expected / simulated / observed: {o.expected.slice(0, 80)}… / {o.simulated.slice(0, 60)}… / {o.observed}</li>
          ))}
        </ul>
      </section>
    </PageShell>
  );
}

export function EnterpriseAiGovernancePage() {
  return (
    <PageShell kicker="Enterprise AI" title="Governance" testId="enterprise-ai-governance">
      <SecondaryNav />
      <section className="gc-panel span-12">
        <h2>Guardrails</h2>
        <ul className="gc-alert-list">
          <li>Public demo runs deterministic tool orchestration with explicit Analysis Mode label.</li>
          <li>No API keys in the frontend; LLM mode stubbed unless a secure backend exists.</li>
          <li>No patient-level clinical diagnosis; CapEx is never auto-approved.</li>
          <li>Decision approval does not mutate historical KPI facts (RCM NPR lineage intact).</li>
          <li>Causal language limited to associative / operational-link knowledge-graph claims.</li>
          <li>What-if and forecasts are illustrative — not claimed clinical or ROI accuracy.</li>
          <li>Focus and scenario IDs are derived from the question — never a silent Emergency default for unrelated topics.</li>
        </ul>
        <p>Analysis Mode: Deterministic management analytics on illustrative hospital demo data.</p>
      </section>
    </PageShell>
  );
}
