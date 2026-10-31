/**
 * Domain 16 Stage 7 — Enterprise AI UX.
 * Match existing gc-* CSS patterns from qualitySafety / enterprise — no redesign.
 */
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useShowcase } from '@/showcase/state';
import { useCopilot } from '../Copilot';
import { usePeriod } from '../period';
import { listKnowledgeEdges } from './knowledgeGraph';
import { listMetrics, resolveMetric } from './metricRegistry';
import { runInvestigation } from './investigation';
import { runOptimization } from './optimization';
import { runForecast, FORECAST_MODEL_VERSION } from './forecast';
import {
  approveDecision,
  decisionStorageMeta,
  listDecisions,
  transitionDecision,
} from './decisions';
import { getOutcome, listOutcomes } from './outcomes';
import { FLAGSHIP_QUESTION, orchestrate } from './orchestrator';
import { resolveActiveMode } from './gateway';
import { AI_MODE_DISCLOSURE } from './types';
import type { GroundedAnswer } from './types';

const SUGGESTIONS = [
  FLAGSHIP_QUESTION,
  'Explain ED door-to-provider median and its data readiness.',
  'Compare bed occupancy across hospitals.',
  'What if we improve supply efficiency without adding staff?',
  'Show reconciliation and data quality for revenue lineage.',
  'What is the status of my decision proposals?',
];

const HISTORY_KEY = 'datavital.enterpriseAi.queryHistory.demo';

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
      <p className="gc-panel gc-fit" data-testid="enterprise-ai-mode" style={{ marginBottom: 12 }}>
        {AI_MODE_DISCLOSURE}
      </p>
      {children}
    </article>
  );
}

function SecondaryNav() {
  return (
    <nav className="gc-next" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }} data-testid="enterprise-ai-subnav">
      <Link to="/enterprise-ai" className="gc-btn">Investigate</Link>
      <Link to="/enterprise-ai/investigations" className="gc-text-btn">Investigations</Link>
      <Link to="/enterprise-ai/forecasting" className="gc-text-btn">Forecasting</Link>
      <Link to="/enterprise-ai/optimization" className="gc-text-btn">Optimization</Link>
      <Link to="/enterprise-ai/decisions" className="gc-text-btn">Decisions</Link>
      <Link to="/enterprise-ai/governance" className="gc-text-btn">Governance</Link>
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

  const investigation = useMemo(
    () => runInvestigation({
      hospital: store.hospital,
      year: store.year,
      period,
      focusMetricId: 'ed.wait.median_min',
    }),
    [store.hospital, store.year, period],
  );

  const lineage = useMemo(() => listMetrics().filter((m) => (
    m.id.startsWith('ed.') || m.id.startsWith('beds.') || m.id.startsWith('rcm.') || m.id.startsWith('st.')
  )).slice(0, 8), []);

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
      });
      setAnswer(result);
      setHistory(pushHistory(q));
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    runQuery(query);
  }

  const decisionId = answer?.decisionProposalId;
  const decisions = listDecisions();
  const activeDecision = decisionId
    ? decisions.find((d) => d.id === decisionId) ?? decisions[0]
    : decisions[0];
  const outcome = activeDecision?.outcomeId ? getOutcome(activeDecision.outcomeId) : null;

  return (
    <PageShell kicker="Enterprise AI · Decision Intelligence" title="Enterprise AI Investigation" testId="enterprise-ai-page">
      <SecondaryNav />

      <section className="gc-panel span-12" data-testid="enterprise-ai-composer">
        <h2>Query composer</h2>
        <p>Deterministic tool orchestration · mode: {mode.label}</p>
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 8 }}>
          <label className="gc-fit">
            <span className="gc-kicker">Natural language question</span>
            <textarea
              data-testid="enterprise-ai-query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={3}
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
              onClick={() => { setQuery(''); setAnswer(null); }}
            >
              Clear
            </button>
            <button type="button" className="gc-text-btn" onClick={() => copilot.setOpen(true)}>
              Open Vital Assist
            </button>
          </div>
        </form>
        <div style={{ marginTop: 8 }}>
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
          <div style={{ marginTop: 8 }} data-testid="enterprise-ai-history">
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
          {answer ? (
            <>
              <p data-testid="enterprise-ai-answer">{answer.summary}</p>
              <p className="gc-kicker">Steps</p>
              <ol>
                {answer.steps.map((step) => <li key={step}>{step}</li>)}
              </ol>
              <p className="gc-kicker">Evidence citations (tool result IDs)</p>
              <ul className="gc-alert-list" data-testid="enterprise-ai-citations">
                {answer.citations.map((c) => (
                  <li key={c.toolResultId}>
                    <strong>{c.toolResultId}</strong> · {c.claim}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p>Run a question to assemble a grounded answer with tool citations.</p>
          )}
          <div style={{ marginTop: 12 }}>
            <h3>Drivers</h3>
            <ul className="gc-alert-list" data-testid="enterprise-ai-drivers">
              {investigation.drivers.map((d) => (
                <li key={`${d.edgeId}-${d.relatedMetricId}`}>
                  <span className={`gc-sev gc-sev-${d.status === 'contradicted' ? 'critical' : 'medium'}`}>{d.status}</span>
                  {' '}{d.relatedMetricId} · {d.causalClaim} · {d.evidence}
                  {d.confounders.length > 0 && <em> Confounders: {d.confounders.join(', ')}</em>}
                </li>
              ))}
            </ul>
            <p data-testid="enterprise-ai-missing">{investigation.disclaimer}</p>
          </div>
        </section>

        <section className="gc-panel span-12" data-testid="enterprise-ai-evidence">
          <h2>Evidence explorer</h2>
          <p>Metric lineage cards from the Enterprise AI registry (existing domain sourceFns).</p>
          <div className="gc-exception-list">
            {lineage.map((m) => {
              const value = resolveMetric(m.id, { hospital: store.hospital, year: store.year, period });
              return (
                <div key={m.id} className="gc-exception" data-testid={`lineage-${m.id}`}>
                  <strong>{m.name}</strong>
                  <span>{m.id} · {m.owningDomain}</span>
                  <span className="gc-ltr">{value == null ? '—' : value}</span>
                  <em>{m.qualityNotes}</em>
                </div>
              );
            })}
          </div>
          <p className="gc-kicker">Knowledge graph edges: {listKnowledgeEdges().length}</p>
        </section>

        <section className="gc-panel span-12" data-testid="enterprise-ai-simulation">
          <h2>Decision simulation</h2>
          <p>
            Interventions are illustrative what-ifs. Overlapping benefits are not summed.
            Constraint: no-additional-staffing-cost preferred for flagship path.
          </p>
          <Link to="/enterprise-ai/optimization" className="gc-btn">Open constrained optimization</Link>
        </section>

        <section className="gc-panel span-12" data-testid="enterprise-ai-decision-panel">
          <h2>Human decision panel</h2>
          <p>{decisionStorageMeta().note}</p>
          {activeDecision ? (
            <div className="gc-exception" data-testid="enterprise-ai-active-decision">
              <strong>{activeDecision.title}</strong>
              <span>Status: {activeDecision.status}</span>
              <p>{activeDecision.rationale}</p>
              <p>Observed: {outcome?.observed ?? 'Outcome not yet measured'}</p>
              <div className="gc-next" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="gc-btn" onClick={() => { approveDecision(activeDecision.id); setAnswer((a) => (a ? { ...a } : a)); }}>
                  Approve
                </button>
                <button type="button" className="gc-text-btn" onClick={() => { transitionDecision(activeDecision.id, 'Rejected'); setAnswer((a) => (a ? { ...a } : a)); }}>
                  Reject
                </button>
                <button type="button" className="gc-text-btn" onClick={() => { transitionDecision(activeDecision.id, 'Deferred'); setAnswer((a) => (a ? { ...a } : a)); }}>
                  Defer
                </button>
              </div>
            </div>
          ) : (
            <p>No decision proposal yet — run the flagship investigation to create a draft.</p>
          )}
        </section>
      </div>
    </PageShell>
  );
}

export function EnterpriseAiInvestigationsPage() {
  const store = useShowcase();
  const { period } = usePeriod();
  const report = useMemo(
    () => runInvestigation({ hospital: store.hospital, year: store.year, period }),
    [store.hospital, store.year, period],
  );
  return (
    <PageShell kicker="Enterprise AI" title="Investigations" testId="enterprise-ai-investigations">
      <SecondaryNav />
      <section className="gc-panel span-12">
        <h2>Focus: {report.focusMetricId}</h2>
        <p>Observed {report.observedValue} · prior-year baseline {report.baselineValue}</p>
        <p>Domains: {report.domainsTouched.join(', ')}</p>
        <p>Reconciliation: {report.reconciliationOk ? 'OK' : 'Issues'}</p>
        <ul className="gc-alert-list">
          {report.drivers.map((d) => (
            <li key={`${d.edgeId}-${d.relatedMetricId}`}>{d.status}: {d.relatedMetricId}</li>
          ))}
        </ul>
        <p>{report.disclaimer}</p>
      </section>
    </PageShell>
  );
}

export function EnterpriseAiForecastingPage() {
  const store = useShowcase();
  const forecast = useMemo(
    () => runForecast({ hospital: store.hospital, year: store.year, seriesId: 'beds.occupancy' }),
    [store.hospital, store.year],
  );
  return (
    <PageShell kicker="Enterprise AI" title="Forecasting" testId="enterprise-ai-forecasting">
      <SecondaryNav />
      <section className="gc-panel span-12">
        <h2>Bed occupancy series</h2>
        <p>Model {FORECAST_MODEL_VERSION} · readiness: {forecast.readiness}</p>
        <p>Backtest MAE {forecast.backtest.mae ?? '—'} · WAPE {forecast.backtest.wape ?? '—'} (n={forecast.backtest.n})</p>
        <ul className="gc-alert-list">
          {forecast.points.slice(-6).map((p) => (
            <li key={p.label}>{p.label}: forecast {p.forecast.toFixed?.(3) ?? p.forecast}{p.actual != null ? ` · actual ${p.actual}` : ''}</li>
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
  const result = useMemo(
    () => runOptimization({
      hospital: store.hospital,
      year: store.year,
      period,
      decisionVariables: ['ent-bed-assign-flow', 'st-supply-efficiency', 'st-reduce-overtime', 'ent-staffing-uplift'],
      objective: 'strongest_operational_improvement',
      noAdditionalStaffingCost: true,
    }),
    [store.hospital, store.year, period],
  );
  return (
    <PageShell kicker="Enterprise AI" title="Constrained optimization" testId="enterprise-ai-optimization">
      <SecondaryNav />
      <section className="gc-panel span-12">
        <h2>Objective: strongest operational improvement</h2>
        <p>Feasible: {result.feasible ? 'yes' : 'no'} · Selected: {result.selected ?? '—'}</p>
        <p>Constraints: {result.constraintsApplied.join('; ')}</p>
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
        <ul className="gc-alert-list">
          {decisions.length === 0 && <li>No decisions yet — create via Investigate.</li>}
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
          <li>Public demo runs deterministic tool orchestration with explicit mode label.</li>
          <li>No API keys in the frontend; LLM mode stubbed unless a secure backend exists.</li>
          <li>No patient-level clinical diagnosis; CapEx is never auto-approved.</li>
          <li>Decision approval does not mutate historical KPI facts (RCM NPR lineage intact).</li>
          <li>Causal language limited to associative / operational-link knowledge-graph claims.</li>
          <li>What-if and forecasts are illustrative — not claimed clinical or ROI accuracy.</li>
        </ul>
        <p>{AI_MODE_DISCLOSURE}</p>
      </section>
    </PageShell>
  );
}
