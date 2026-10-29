import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { answerQuestion, ASSISTANT_PROMPTS } from '@/showcase/assistant';
import { tx } from '@/showcase/copy';
import { HOSPITALS } from '@/showcase/engine';
import { decisionKey, useShowcase } from '@/showcase/state';
import { alertsFor, visibleAlerts, type AlertStatus, type DemoAlert, type Severity } from './alerts';

type Tab = 'overview' | 'alerts' | 'investigate' | 'predictions' | 'actions' | 'approvals' | 'ask';

type CopilotApi = {
  open: boolean;
  setOpen: (open: boolean) => void;
  tab: Tab;
  setTab: (tab: Tab) => void;
  chart: string | null;
  setScopeLabel: (title: string | null) => void;
  focusChart: (title: string) => void;
  clearChart: () => void;
  selectedId: string | null;
  openAlert: (alert: DemoAlert, options?: { stay?: boolean }) => void;
};

const Ctx = createContext<CopilotApi | null>(null);

export function CopilotState({ children }: { children: ReactNode }) {
  const store = useShowcase();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');
  const [chart, setChart] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const clearChart = useCallback(() => setChart(null), []);
  const setScopeLabel = useCallback((title: string | null) => setChart(title), []);

  const api: CopilotApi = {
    open,
    setOpen,
    tab,
    setTab,
    chart,
    setScopeLabel,
    focusChart: (title) => {
      setChart(title);
      setTab('overview');
      setOpen(true);
    },
    clearChart,
    selectedId,
    openAlert: (alert, options) => {
      setSelectedId(alert.id);
      setTab('investigate');
      setOpen(true);
      if ((store.alertStatus[alert.id] ?? 'new') === 'new') store.setAlertStatus(alert.id, 'investigating');
      if (!options?.stay && alert.screen !== 'emergency') {
        setTab('investigate');
        setOpen(true);
      }
    },
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useCopilot(): CopilotApi {
  const value = useContext(Ctx);
  if (!value) throw new Error('copilot missing');
  return value;
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'investigate', label: 'Investigate' },
  { id: 'predictions', label: 'Forecasts' },
  { id: 'actions', label: 'Recommendations' },
  { id: 'approvals', label: 'Approvals' },
  { id: 'ask', label: 'Ask' },
];

function emergencyCount(hospital: string, year: number, statuses: Record<string, AlertStatus>): number {
  return alertsFor(hospital, year).filter((alert) => {
    if (alert.department !== 'Emergency' || alert.severity === 'info') return false;
    const status = statuses[alert.id] ?? 'new';
    return status !== 'resolved' && status !== 'dismissed';
  }).length;
}

export function CopilotButton() {
  const store = useShowcase();
  const copilot = useCopilot();
  const count = emergencyCount(store.hospital, store.year, store.alertStatus);
  return (
    <button
      type="button"
      className="gc-copilot-launch"
      data-testid="alert-count"
      aria-label={tx(store.lang, 'AI Copilot', 'مساعد الذكاء')}
      title={tx(store.lang, 'AI Copilot', 'مساعد الذكاء')}
      aria-expanded={copilot.open}
      onClick={() => {
        copilot.setTab(copilot.open ? copilot.tab : 'overview');
        copilot.setOpen(!copilot.open);
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3l1.8 4.7L18 9.5l-4.2 1.8L12 16l-1.8-4.7L6 9.5l4.2-1.8z" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="12" cy="19" r="1.2" fill="currentColor" />
      </svg>
      <span>{count}</span>
    </button>
  );
}

export function CopilotPanel() {
  const store = useShowcase();
  const copilot = useCopilot();
  const location = useLocation();
  const panelRef = useRef<HTMLElement>(null);
  const titleId = useId();
  const lang = store.lang;
  const screenId = 'emergency';
  const page = location.pathname.startsWith('/emergency/flow') ? 'Patient Flow & Waiting'
    : location.pathname.startsWith('/emergency/quality') ? 'ED Quality & Outcomes'
    : 'Emergency Overview';
  const { alerts, note } = visibleAlerts(store.hospital, store.year, 'All', screenId);
  const selected = alerts.find((alert) => alert.id === copilot.selectedId) ?? alerts[0] ?? null;
  const hospitalName = HOSPITALS.find((item) => item.code === store.hospital);
  const name = hospitalName?.name;
  const count = emergencyCount(store.hospital, store.year, store.alertStatus);
  const [question, setQuestion] = useState('');
  const asked = question || 'Why is emergency waiting time increasing?';
  const answer = answerQuestion(asked, store.hospital, store.year, 'Emergency', lang);

  useEffect(() => {
    if (!copilot.open) return;
    panelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') copilot.setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [copilot.open, copilot.setOpen]);

  if (!copilot.open) return null;

  const statusOf = (alert: DemoAlert): AlertStatus => store.alertStatus[alert.id] ?? 'new';

  return (
    <aside
      className="gc-copilot"
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      ref={panelRef}
      tabIndex={-1}
    >
      <header className="gc-copilot-head">
        <div>
          <p className="gc-kicker">Decision support</p>
          <h2 id={titleId}>AI Copilot</h2>
        </div>
        <button type="button" className="gc-btn quiet" onClick={() => copilot.setOpen(false)}>{tx(lang, 'Close', 'إغلاق')}</button>
      </header>
      <p className="gc-copilot-scope">
        {name} · {store.year} · Emergency · {page}
        {copilot.chart ? ` · ${copilot.chart}` : ''}
      </p>
      <p>{count} open Emergency alerts for this hospital and year.</p>
      {note ? <p>{note}</p> : null}
      <div className="gc-copilot-tabs" role="tablist" aria-label={tx(lang, 'Copilot sections', 'أقسام المساعد')}>
        {TABS.map((tab) => (
          <button key={tab.id} type="button" role="tab" aria-selected={copilot.tab === tab.id} onClick={() => copilot.setTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>
      <div className="gc-copilot-body" role="tabpanel">
        {copilot.tab === 'overview' ? <Overview alerts={alerts} selected={selected} /> : null}
        {copilot.tab === 'alerts' ? <AlertFeed alerts={alerts} statusOf={statusOf} /> : null}
        {copilot.tab === 'investigate' ? <Investigate alert={selected} status={selected ? statusOf(selected) : 'new'} /> : null}
        {copilot.tab === 'predictions' ? <Prediction alert={selected} /> : null}
        {copilot.tab === 'actions' ? <Actions alert={selected} mode="recommend" /> : null}
        {copilot.tab === 'approvals' ? <DecisionReview alert={selected} /> : null}
        {copilot.tab === 'ask' ? (
          <Ask
            question={question}
            setQuestion={setQuestion}
            asked={asked}
            answer={answer}
            hospital={name ?? store.hospital}
            year={store.year}
            department={store.department}
          />
        ) : null}
      </div>
    </aside>
  );
}

function Overview({ alerts, selected }: { alerts: DemoAlert[]; selected: DemoAlert | null }) {
  const copilot = useCopilot();
  const ranked = [...alerts].sort((a, b) => rank(a.severity) - rank(b.severity));
  return (
    <div>
      <p>This dashboard is the current scope. Drivers are hypotheses. Forecasts are estimates, not validated predictions.</p>
      {selected ? <p>Primary signal: {selected.title}, observed {selected.observed}.</p> : <p>No alert is defined for this screen.</p>}
      <ul className="gc-alert-list">
        {ranked.slice(0, 4).map((alert) => (
          <li key={alert.id}>
            <button type="button" onClick={() => copilot.openAlert(alert)}>
              <SeverityMark severity={alert.severity} /> {alert.title}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AlertFeed({ alerts, statusOf }: { alerts: DemoAlert[]; statusOf: (alert: DemoAlert) => AlertStatus }) {
  const store = useShowcase();
  const copilot = useCopilot();
  const ranked = [...alerts].sort((a, b) => rank(a.severity) - rank(b.severity));
  return (
    <ul className="gc-alert-list">
      {ranked.map((alert) => (
        <li key={alert.id}>
          <button type="button" onClick={() => copilot.openAlert(alert)}>
            <SeverityMark severity={alert.severity} /> {alert.title} · {alert.observed}
          </button>
          <p>{statusLabel(statusOf(alert))} · {alert.period} · {alert.department}</p>
          <div className="gc-inline">
            <button type="button" className="gc-btn quiet" onClick={() => store.setAlertStatus(alert.id, 'acknowledged')}>Acknowledge</button>
            <button type="button" className="gc-btn quiet" onClick={() => copilot.openAlert(alert)}>Investigate</button>
            <button type="button" className="gc-btn quiet" onClick={() => store.setAlertStatus(alert.id, 'dismissed')}>Dismiss</button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Investigate({ alert, status }: { alert: DemoAlert | null; status: AlertStatus }) {
  const copilot = useCopilot();
  if (!alert) return <p>Choose an alert from this hospital and year.</p>;
  return (
    <article>
      <p className="gc-kicker">{statusLabel(status)}</p>
      <h3>{alert.title}</h3>
      <ol className="gc-steps">
        <li>KPI measurement: {alert.observed}</li>
        <li>Detection: {alert.rule}</li>
        <li>Root cause: {alert.investigation} These are not proven causes.</li>
        <li>Evidence: {alert.evidence}</li>
      </ol>
      <div className="gc-inline">
        <button type="button" className="gc-btn" onClick={() => copilot.setTab('approvals')}>Open decision review</button>
        <button type="button" className="gc-btn quiet" onClick={() => copilot.setTab('actions')}>Review recommendation</button>
      </div>
    </article>
  );
}

function Prediction({ alert }: { alert: DemoAlert | null }) {
  if (!alert) return <p>No signal is selected.</p>;
  return (
    <article>
      <h3>Illustrative prediction</h3>
      <p>Not a validated model. If the current {alert.title.toLowerCase()} stayed near {alert.observed}, the story would continue at that level. This is not a forecast and not a clinical validation.</p>
      <p>{alert.comparison}</p>
    </article>
  );
}

function Actions({ alert, mode }: { alert: DemoAlert | null; mode: 'recommend' | 'decide' }) {
  const store = useShowcase();
  const copilot = useCopilot();
  if (!alert) return <p>No recommendation is selected.</p>;
  const key = decisionKey(alert.kpi, store.hospital, store.year, 'Emergency');
  const decision = store.approvals[key];
  return (
    <article>
      <h3>{alert.action}</h3>
      <p>Rationale: {alert.investigation}</p>
      <p>Indicator: {alert.title}. Observed {alert.observed}.</p>
      <p>Expected impact is an estimate. It is not a result that has already occurred.</p>
      <p>Owner: {alert.owner}.</p>
      <p>Decision: {decision ?? 'waiting for a person'}.</p>
      {mode === 'decide' ? null : (
        <button type="button" className="gc-btn" onClick={() => copilot.setTab('approvals')}>Open decision review</button>
      )}
    </article>
  );
}

const STEPS = ['Detection', 'Investigation', 'Prediction', 'Recommendation', 'Approval', 'Outcome'] as const;

function DecisionReview({ alert }: { alert: DemoAlert | null }) {
  const store = useShowcase();
  const [step, setStep] = useState(0);
  const lead = alert;
  const key = decisionKey(lead?.kpi ?? 'kpi_ed_door_to_provider_median_minutes', store.hospital, store.year, 'Emergency');
  const decision = store.approvals[key];
  const medianMatch = lead?.observed.match(/([\d.]+)\s*minutes/i);
  const median = medianMatch ? Number(medianMatch[1]) : 63.3;
  const gap = median - 60;
  return (
    <article className="gc-decision">
      <h3>Decision review</h3>
      <p>{lead ? `${lead.title} · ${lead.observed}` : 'Door-to-provider wait · selected hospital and year'}</p>
      <div className="gc-progress-steps" role="tablist" aria-label="Decision stages">
        {STEPS.map((label, index) => (
          <button key={label} type="button" role="tab" aria-selected={step === index} aria-label={`${index + 1}. ${label}`} data-done={index < step ? 'true' : undefined} onClick={() => setStep(index)}>
            <i />
            <span>{index === step ? label : index + 1}</span>
          </button>
        ))}
      </div>
      {step === 0 ? <p>Detection: observed median is {median.toFixed(1)} minutes. Review line 60 minutes. Gap {gap > 0 ? '+' : ''}{gap.toFixed(1)} minutes. {lead?.rule ?? 'No open emergency alert.'}</p> : null}
      {step === 1 ? <p>Investigation: Compare the median with the P90. {lead?.investigation ?? 'Review arrivals and boarding together.'} These are not proven causes.</p> : null}
      {step === 2 ? <p>Prediction: Not a validated model. Continued demand is not converted into a predicted wait.</p> : null}
      {step === 3 ? <p>Recommendation: {lead?.action ?? 'Review the peak arrival hours against the door-to-provider median.'} Expected impact is not calculated.</p> : null}
      {step === 4 ? (
        <div>
          <p>Decision for this hospital, year, and emergency signal: {decision ?? 'waiting for a person'}.</p>
          <div className="gc-inline">
            <button type="button" className="gc-btn primary" onClick={() => store.decide(key, 'approved')}>Approve</button>
            <button type="button" className="gc-btn quiet" onClick={() => store.decide(key, 'rejected')}>Reject</button>
          </div>
        </div>
      ) : null}
      {step === 5 ? (
        <div>
          {decision === 'approved' ? <p>Illustrative outcome. This is not a measured hospital result. Decision: approved.</p> : null}
          {decision === 'rejected' ? <p>No illustrative outcome is shown after a rejection.</p> : null}
          {!decision ? <p>Record an approval or rejection before an outcome is shown.</p> : null}
        </div>
      ) : null}
    </article>
  );
}

function Ask({
  question,
  setQuestion,
  asked,
  answer,
  hospital,
  year,
  department,
}: {
  question: string;
  setQuestion: (value: string) => void;
  asked: string;
  answer: ReturnType<typeof answerQuestion>;
  hospital: string;
  year: number;
  department: string;
}) {
  return (
    <form onSubmit={(event) => event.preventDefault()}>
      <p>Scope: {hospital}, {year}, department {department}. The answer uses this scope.</p>
      <label className="gc-field">
        Ask DataVital AI
        <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={asked} />
      </label>
      <div className="gc-inline">
        {ASSISTANT_PROMPTS.slice(0, 4).map((prompt) => (
          <button key={prompt.en} type="button" className="gc-btn quiet" onClick={() => setQuestion(prompt.en)}>{prompt.en}</button>
        ))}
      </div>
      <h3>{answer.title}</h3>
      <p>{answer.observation}</p>
      <p>{answer.evidence}</p>
      <p>{answer.explanation}</p>
      <p>{answer.action}</p>
      <p>Suggested next step: open the related dashboard, then record a human decision. {answer.approval}</p>
    </form>
  );
}

function SeverityMark({ severity }: { severity: Severity }) {
  return <span className={`gc-sev gc-sev-${severity}`}>{severity}</span>;
}

function rank(severity: Severity): number {
  if (severity === 'critical') return 0;
  if (severity === 'high') return 1;
  if (severity === 'medium') return 2;
  return 3;
}

function statusLabel(status: AlertStatus): string {
  if (status === 'new') return 'New';
  if (status === 'acknowledged') return 'Acknowledged';
  if (status === 'investigating') return 'Under review';
  if (status === 'resolved') return 'Resolved';
  return 'Dismissed';
}
