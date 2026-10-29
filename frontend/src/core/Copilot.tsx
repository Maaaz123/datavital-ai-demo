import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { answerQuestion } from '@/showcase/assistant';
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

const ASSIST_NAME = { en: 'Vital Assist', ar: 'Vital Assist' } as const;

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Home' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'investigate', label: 'Review' },
  { id: 'predictions', label: 'Forecast' },
  { id: 'actions', label: 'Actions' },
  { id: 'approvals', label: 'Decide' },
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
      aria-label={tx(store.lang, ASSIST_NAME.en, ASSIST_NAME.ar)}
      title={tx(store.lang, ASSIST_NAME.en, ASSIST_NAME.ar)}
      aria-expanded={copilot.open}
      onClick={() => {
        copilot.setTab(copilot.open ? copilot.tab : 'overview');
        copilot.setOpen(!copilot.open);
      }}
    >
      <span className="gc-copilot-ring" aria-hidden="true" />
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4.2 19.8l7-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M13.1 4.8l1.5 3.6 3.6 1.5-3.6 1.5-1.5 3.6-1.5-3.6-3.6-1.5 3.6-1.5z" fill="currentColor" />
        <path d="M19.2 3.6l.75 1.8 1.8.75-1.8.75-.75 1.8-.75-1.8-1.8-.75 1.8-.75z" fill="currentColor" />
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
        <div className="gc-assist-brand">
          <span className="gc-assist-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M4.2 19.8l7-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M13.1 4.8l1.5 3.6 3.6 1.5-3.6 1.5-1.5 3.6-1.5-3.6-3.6-1.5 3.6-1.5z" fill="currentColor" />
              <path d="M19.2 3.6l.75 1.8 1.8.75-1.8.75-.75 1.8-.75-1.8-1.8-.75 1.8-.75z" fill="currentColor" />
            </svg>
          </span>
          <div>
            <p className="gc-kicker">Emergency decision support</p>
            <h2 id={titleId}>{ASSIST_NAME.en}</h2>
          </div>
        </div>
        <button type="button" className="gc-assist-close" onClick={() => copilot.setOpen(false)} aria-label={tx(lang, 'Close', 'إغلاق')}>
          ×
        </button>
      </header>

      <div className="gc-assist-meta">
        <span className="gc-assist-chip">{name}</span>
        <span className="gc-assist-chip">{store.year}</span>
        <span className="gc-assist-chip">{page}</span>
        {copilot.chart ? <span className="gc-assist-chip gc-assist-chip-focus">{copilot.chart}</span> : null}
        <span className={`gc-assist-chip ${count ? 'gc-assist-chip-alert' : 'gc-assist-chip-good'}`}>
          {count} open alert{count === 1 ? '' : 's'}
        </span>
      </div>
      {note ? <p className="gc-assist-note">{note}</p> : null}

      <div className="gc-copilot-tabs" role="tablist" aria-label={tx(lang, 'Vital Assist sections', 'أقسام Vital Assist')}>
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
        {copilot.tab === 'ask' ? <Ask label={name ?? store.hospital} /> : null}
      </div>
    </aside>
  );
}

function Overview({ alerts, selected }: { alerts: DemoAlert[]; selected: DemoAlert | null }) {
  const copilot = useCopilot();
  const ranked = [...alerts].sort((a, b) => rank(a.severity) - rank(b.severity));
  return (
    <div className="gc-assist-stack">
      <section className="gc-assist-card">
        <h3>Current scope</h3>
        <p>This dashboard is the live scope. Drivers are hypotheses. Forecasts are estimates, not validated predictions.</p>
      </section>
      <section className={`gc-assist-card ${selected ? 'gc-tone-watch' : 'gc-tone-neutral'}`}>
        <h3>Primary signal</h3>
        {selected ? (
          <p><strong>{selected.title}</strong> · observed {selected.observed}</p>
        ) : (
          <p>No alert is defined for this screen.</p>
        )}
      </section>
      <ul className="gc-assist-alerts">
        {ranked.slice(0, 4).map((alert) => (
          <li key={alert.id}>
            <button type="button" className={`gc-assist-alert gc-tone-${severityTone(alert.severity)}`} onClick={() => copilot.openAlert(alert)}>
              <SeverityMark severity={alert.severity} />
              <span>
                <strong>{alert.title}</strong>
                <em>{alert.observed}</em>
              </span>
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
    <ul className="gc-assist-alerts">
      {ranked.map((alert) => (
        <li key={alert.id} className={`gc-assist-card gc-tone-${severityTone(alert.severity)}`}>
          <button type="button" className="gc-assist-alert" onClick={() => copilot.openAlert(alert)}>
            <SeverityMark severity={alert.severity} />
            <span>
              <strong>{alert.title}</strong>
              <em>{alert.observed}</em>
            </span>
          </button>
          <p className="gc-assist-note">{statusLabel(statusOf(alert))} · {alert.period} · {alert.department}</p>
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
  if (!alert) return <section className="gc-assist-card"><p>Choose an alert from this hospital and year.</p></section>;
  return (
    <article className="gc-assist-stack">
      <section className={`gc-assist-card gc-tone-${severityTone(alert.severity)}`}>
        <p className="gc-kicker">{statusLabel(status)}</p>
        <h3>{alert.title}</h3>
        <p>{alert.observed}</p>
      </section>
      <ol className="gc-assist-steps">
        <li><strong>Measurement</strong><span>{alert.observed}</span></li>
        <li><strong>Detection</strong><span>{alert.rule}</span></li>
        <li><strong>Hypotheses</strong><span>{alert.investigation} These are not proven causes.</span></li>
        <li><strong>Evidence</strong><span>{alert.evidence}</span></li>
      </ol>
      <div className="gc-inline">
        <button type="button" className="gc-ai-cta" onClick={() => copilot.setTab('approvals')}>
          <span className="gc-ai-orb" aria-hidden="true">✓</span>
          Open decision review
        </button>
        <button type="button" className="gc-btn quiet" onClick={() => copilot.setTab('actions')}>Review recommendation</button>
      </div>
    </article>
  );
}

function Prediction({ alert }: { alert: DemoAlert | null }) {
  if (!alert) return <section className="gc-assist-card"><p>No signal is selected.</p></section>;
  return (
    <article className="gc-assist-stack">
      <section className="gc-assist-card">
        <h3>Illustrative prediction</h3>
        <p>Not a validated model. If the current {alert.title.toLowerCase()} stayed near {alert.observed}, the story would continue at that level.</p>
      </section>
      <section className="gc-assist-card gc-tone-watch">
        <h3>Comparison</h3>
        <p>{alert.comparison}</p>
      </section>
    </article>
  );
}

function Actions({ alert, mode }: { alert: DemoAlert | null; mode: 'recommend' | 'decide' }) {
  const store = useShowcase();
  const copilot = useCopilot();
  if (!alert) return <section className="gc-assist-card"><p>No recommendation is selected.</p></section>;
  const key = decisionKey(alert.kpi, store.hospital, store.year, 'Emergency');
  const decision = store.approvals[key];
  return (
    <article className="gc-assist-stack">
      <section className="gc-assist-card">
        <h3>{alert.action}</h3>
        <p>{alert.investigation}</p>
      </section>
      <section className="gc-assist-card gc-tone-neutral">
        <p><strong>{alert.title}</strong> · observed {alert.observed}</p>
        <p>Expected impact is an estimate. It is not a result that has already occurred.</p>
        <p>Owner: {alert.owner}</p>
        <p>Decision: {decision ?? 'waiting for a person'}</p>
      </section>
      {mode === 'decide' ? null : (
        <button type="button" className="gc-ai-cta" onClick={() => copilot.setTab('approvals')}>
          <span className="gc-ai-orb" aria-hidden="true">✓</span>
          Open decision review
        </button>
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
    <article className="gc-decision gc-assist-stack">
      <section className="gc-assist-card">
        <h3>Decision review</h3>
        <p>{lead ? `${lead.title} · ${lead.observed}` : 'Door-to-provider wait · selected hospital and year'}</p>
      </section>
      <div className="gc-progress-steps" role="tablist" aria-label="Decision stages">
        {STEPS.map((label, index) => (
          <button key={label} type="button" role="tab" aria-selected={step === index} aria-label={`${index + 1}. ${label}`} data-done={index < step ? 'true' : undefined} onClick={() => setStep(index)}>
            <i />
            <span>{index === step ? label : index + 1}</span>
          </button>
        ))}
      </div>
      <section className="gc-assist-card">
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
      </section>
    </article>
  );
}

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  title?: string;
  body: string[];
};

function Ask({ label }: { label: string }) {
  const store = useShowcase();
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: 'welcome',
    role: 'assistant',
    title: 'Vital Assist',
    body: [
      `Scoped to ${label}, ${store.year}, Emergency.`,
      'Ask about arrivals, waiting time, boarding, or disposition. Answers stay inside this demo scope.',
    ],
  }]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, typing]);

  const send = () => {
    const text = draft.trim();
    if (!text || typing) return;
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', body: [text] }]);
    setDraft('');
    setTyping(true);
    window.setTimeout(() => {
      const answer = answerQuestion(text, store.hospital, store.year, 'Emergency', store.lang);
      setMessages((prev) => [...prev, {
        id: `a-${Date.now()}`,
        role: 'assistant',
        title: answer.title,
        body: [answer.observation, answer.evidence, answer.explanation, answer.action, answer.approval].filter(Boolean),
      }]);
      setTyping(false);
    }, 700);
  };

  return (
    <div className="gc-chat">
      <div className="gc-chat-stream" aria-live="polite">
        {messages.map((message) => (
          <div key={message.id} className={`gc-chat-bubble is-${message.role}`}>
            {message.role === 'assistant' ? <span className="gc-chat-avatar" aria-hidden="true">✦</span> : null}
            <div className="gc-chat-card">
              {message.title ? <strong>{message.title}</strong> : null}
              {message.body.map((line) => <p key={`${message.id}-${line.slice(0, 24)}`}>{line}</p>)}
            </div>
          </div>
        ))}
        {typing ? (
          <div className="gc-chat-bubble is-assistant">
            <span className="gc-chat-avatar" aria-hidden="true">✦</span>
            <div className="gc-chat-card is-typing" aria-label="Vital Assist is typing">
              <i /><i /><i />
            </div>
          </div>
        ) : null}
        <div ref={endRef} />
      </div>
      <form
        className="gc-chat-composer"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask about this Emergency view…"
          aria-label="Message Vital Assist"
          disabled={typing}
        />
        <button type="submit" className="gc-chat-send" disabled={typing || !draft.trim()} aria-label="Send">
          Send
        </button>
      </form>
    </div>
  );
}

function severityTone(severity: Severity): 'alert' | 'watch' | 'neutral' | 'good' {
  if (severity === 'critical' || severity === 'high') return 'alert';
  if (severity === 'medium') return 'watch';
  return 'neutral';
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
