import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { answerQuestion } from '@/showcase/assistant';
import { tx } from '@/showcase/copy';
import { HOSPITALS } from '@/showcase/engine';
import { decisionKey, useShowcase } from '@/showcase/state';
import { runWhatIf, WHAT_IF_PROMPTS, type DomainName as WhatIfDomain } from '@/showcase/whatIf';
import { alertsFor, visibleAlerts, type AlertStatus, type DemoAlert, type Severity } from './alerts';
import { usePeriod } from './period';

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
      if (!options?.stay && alert.screen !== 'beds' && alert.screen !== 'emergency' && alert.screen !== 'inpatient') {
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

type DomainName = 'Emergency' | 'Beds' | 'Inpatient';

function domainCount(hospital: string, year: number, department: DomainName, statuses: Record<string, AlertStatus>): number {
  return alertsFor(hospital, year).filter((alert) => {
    if (alert.department !== department || alert.severity === 'info') return false;
    const status = statuses[alert.id] ?? 'new';
    return status !== 'resolved' && status !== 'dismissed';
  }).length;
}

function domainFromPath(path: string): { screenId: 'emergency' | 'beds' | 'inpatient'; department: DomainName; page: string; askScope: string } {
  if (path.startsWith('/beds')) {
    const page = path.startsWith('/beds/placement') ? 'Bed Assignment'
      : path.startsWith('/beds/capacity') ? 'Bed Capacity Outlook'
      : 'Bed Status';
    return { screenId: 'beds', department: 'Beds', page, askScope: 'Beds & Capacity' };
  }
  if (path.startsWith('/inpatient')) {
    const page = path.startsWith('/inpatient/stay') ? 'Stay & Discharge'
      : path.startsWith('/inpatient/outcomes') ? 'Care Progress & Outcomes'
      : 'Inpatient Snapshot';
    return { screenId: 'inpatient', department: 'Inpatient', page, askScope: 'Inpatient Care' };
  }
  const page = path.startsWith('/emergency/flow') ? 'Waiting & Patient Flow'
    : path.startsWith('/emergency/quality') ? 'Safety & Return Visits'
    : 'Emergency Snapshot';
  return { screenId: 'emergency', department: 'Emergency', page, askScope: 'Emergency' };
}

export function CopilotButton() {
  const store = useShowcase();
  const copilot = useCopilot();
  const location = useLocation();
  const { department } = domainFromPath(location.pathname);
  const count = domainCount(store.hospital, store.year, department, store.alertStatus);
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
  const domain = domainFromPath(location.pathname);
  const { alerts, note } = visibleAlerts(store.hospital, store.year, 'All', domain.screenId);
  const selected = alerts.find((alert) => alert.id === copilot.selectedId) ?? alerts[0] ?? null;
  const hospitalName = HOSPITALS.find((item) => item.code === store.hospital);
  const name = hospitalName?.name;
  const count = domainCount(store.hospital, store.year, domain.department, store.alertStatus);
  const page = domain.page;

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
            <p className="gc-kicker">
              {domain.department === 'Beds' ? 'Beds & capacity decision support'
                : domain.department === 'Inpatient' ? 'Inpatient care decision support'
                  : 'Emergency decision support'}
            </p>
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
        {copilot.tab === 'predictions' ? <Prediction alert={selected} department={domain.department} /> : null}
        {copilot.tab === 'actions' ? <Actions alert={selected} mode="recommend" department={domain.department} /> : null}
        {copilot.tab === 'approvals' ? <DecisionReview alert={selected} department={domain.department} /> : null}
        {copilot.tab === 'ask' ? <Ask label={name ?? store.hospital} department={domain.department} askScope={domain.askScope} page={page} /> : null}
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
        <h3>Decision support</h3>
        <p>Investigate the open signal, explore an illustrative what-if, then approve or defer an action. Drivers are hypotheses. Outlooks are not validated forecasts.</p>
      </section>
      <section className={`gc-assist-card ${selected ? 'gc-tone-watch' : 'gc-tone-neutral'}`}>
        <h3>Primary signal</h3>
        {selected ? (
          <p><strong>{selected.title}</strong> · {selected.observed} · {selected.period}</p>
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
                <em>{alert.observed} · {alert.period}</em>
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
          <p className="gc-assist-note">{statusLabel(statusOf(alert))} · {alert.department} · {alert.hospital} · {alert.period}</p>
          <p className="gc-assist-note">Threshold: {alert.threshold}</p>
          <p className="gc-assist-note">Owner: {alert.owner}</p>
          <div className="gc-inline">
            <button type="button" className="gc-chip-btn is-watch" onClick={() => store.setAlertStatus(alert.id, 'acknowledged')}>Acknowledge</button>
            <button type="button" className="gc-chip-btn is-good" onClick={() => copilot.openAlert(alert)}>Investigate</button>
            <button type="button" className="gc-chip-btn is-mute" onClick={() => store.setAlertStatus(alert.id, 'dismissed')}>Dismiss</button>
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
        <p className="gc-kicker">{statusLabel(status)} · {alert.severity}</p>
        <h3>{alert.title}</h3>
        <p>{alert.department} · {alert.hospital} · {alert.period}</p>
      </section>
      <ol className="gc-assist-steps">
        <li><strong>What happened</strong><span>{alert.observed}. {alert.comparison}</span></li>
        <li><strong>Why it matters</strong><span>{alert.whyMatters} {alert.consequence}</span></li>
        <li><strong>Supporting evidence</strong><span>{alert.evidence}</span></li>
        <li><strong>Potential drivers</strong><span>{alert.drivers} These are hypotheses, not proven causes.</span></li>
        <li><strong>What may happen next</strong><span>Illustrative only: if no action is taken, {alert.title.toLowerCase()} may stay near {alert.observed}. Not a validated forecast.</span></li>
        <li><strong>Recommended actions</strong><span>{alert.action} Owner: {alert.owner}.</span></li>
        <li><strong>Human review</strong><span>Status: {statusLabel(status)}. Approve, reject, or defer in Decide. Approval is not measured improvement.</span></li>
        <li><strong>Outcome monitoring</strong><span>Follow up with: {alert.followUp}. Track measured change separately from estimated impact.</span></li>
      </ol>
      <div className="gc-inline">
        <button type="button" className="gc-chip-btn is-good" onClick={() => copilot.setTab('approvals')}>Open decision review</button>
        <button type="button" className="gc-chip-btn is-watch" onClick={() => copilot.setTab('actions')}>Review recommendation</button>
      </div>
    </article>
  );
}

function Prediction({ alert, department }: { alert: DemoAlert | null; department: DomainName }) {
  const store = useShowcase();
  const options = WHAT_IF_PROMPTS[department];
  const [selected, setSelected] = useState(options[0]);
  useEffect(() => {
    setSelected(WHAT_IF_PROMPTS[department][0]);
  }, [department]);
  const fromPrompt = useMemo(
    () => answerQuestion(selected, store.hospital, store.year, department, 'en'),
    [department, selected, store.hospital, store.year],
  );
  const fallback = useMemo(
    () => runWhatIf(department as WhatIfDomain, store.hospital, store.year, null),
    [department, store.hospital, store.year],
  );
  const lines = [fromPrompt.observation, fromPrompt.evidence, fromPrompt.explanation, fromPrompt.action, fromPrompt.outcome];

  return (
    <article className="gc-assist-stack">
      <section className="gc-assist-card">
        <h3>What-if scenarios</h3>
        <p>Illustrative only for {store.hospital} · {store.year} · {department}. Not a validated forecast.</p>
        <div className="gc-inline" style={{ flexWrap: 'wrap', marginTop: 8 }}>
          {options.map((option) => (
            <button
              key={option}
              type="button"
              className={`gc-chip-btn ${selected === option ? 'is-good' : 'is-mute'}`}
              aria-pressed={selected === option}
              onClick={() => setSelected(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </section>
      <section className="gc-assist-card gc-tone-watch">
        <h3>{fromPrompt.title}</h3>
        {lines.map((line) => <p key={line.slice(0, 48)}>{line}</p>)}
      </section>
      {alert ? (
        <section className="gc-assist-card">
          <h3>Linked alert</h3>
          <p>{alert.title}: {alert.observed} · {alert.period}</p>
          <p>Threshold: {alert.threshold}</p>
          <p>Follow-up if you act: {alert.followUp}</p>
        </section>
      ) : (
        <section className="gc-assist-card">
          <h3>Baseline scenario</h3>
          <p>{fallback.current}</p>
          <p>{fallback.estimated}</p>
        </section>
      )}
    </article>
  );
}

function Actions({ alert, mode, department }: { alert: DemoAlert | null; mode: 'recommend' | 'decide'; department: DomainName }) {
  const store = useShowcase();
  const copilot = useCopilot();
  if (!alert) return <section className="gc-assist-card"><p>No recommendation is selected.</p></section>;
  const key = decisionKey(alert.kpi, store.hospital, store.year, department);
  const decision = store.approvals[key];
  const sketch = runWhatIf(department as WhatIfDomain, store.hospital, store.year, null);
  return (
    <article className="gc-assist-stack">
      <section className="gc-assist-card">
        <h3>Recommended action</h3>
        <p><strong>Problem:</strong> {alert.title} is {alert.observed} ({alert.severity}) for {alert.hospital} · {alert.period}.</p>
        <p><strong>Supporting evidence:</strong> {alert.evidence}</p>
        <p><strong>Possible contributing factors:</strong> {alert.drivers} These are hypotheses, not proven causes.</p>
        <p><strong>Recommended action:</strong> {alert.action}</p>
        <p><strong>Expected benefit:</strong> {alert.consequence}</p>
        <p><strong>Illustrative scenario:</strong> {sketch.change} → {sketch.estimated}</p>
        <p><strong>Assumptions:</strong> {sketch.assumptions}</p>
        <p><strong>Priority:</strong> {alert.severity}</p>
        <p><strong>Responsible role:</strong> {alert.owner}</p>
        <p><strong>Approval status:</strong> {decision ?? 'waiting for a person'}</p>
        <p><strong>Follow-up KPI:</strong> {alert.followUp}</p>
        <p><strong>Review:</strong> after the next peak or reporting checkpoint in {alert.period}. Approval is not measured improvement.{department === 'Beds' || department === 'Inpatient' ? ' AI does not move or discharge a patient alone.' : ''}</p>
      </section>
      <div className="gc-inline">
        {mode === 'decide' ? null : (
          <button type="button" className="gc-chip-btn is-good" onClick={() => copilot.setTab('approvals')}>Open decision review</button>
        )}
        <button type="button" className="gc-chip-btn is-watch" onClick={() => copilot.setTab('predictions')}>Explore what-if</button>
      </div>
    </article>
  );
}

const STEPS = ['Detection', 'Investigation', 'Prediction', 'Recommendation', 'Approval', 'Outcome'] as const;

function DecisionReview({ alert, department }: { alert: DemoAlert | null; department: DomainName }) {
  const store = useShowcase();
  const [step, setStep] = useState(0);
  const lead = alert;
  const defaultKpi = department === 'Beds' ? 'kpi_bed_occupancy_rate'
    : department === 'Inpatient' ? 'kpi_inpatient_median_los_days'
      : 'kpi_ed_door_to_provider_median_minutes';
  const key = decisionKey(lead?.kpi ?? defaultKpi, store.hospital, store.year, department);
  const decision = store.approvals[key];
  const beds = department === 'Beds';
  const ipd = department === 'Inpatient';
  const signal = beds ? 'bed-capacity' : ipd ? 'inpatient' : 'emergency';
  const fallbackTitle = beds ? 'Operational bed occupancy · selected hospital and year'
    : ipd ? 'Median inpatient stay · selected hospital and year'
      : 'Door-to-provider wait · selected hospital and year';
  const boxTone = decision === 'approved' ? 'is-good' : decision === 'rejected' ? 'is-alert' : 'is-watch';
  return (
    <article className="gc-decision gc-assist-stack">
      <section className="gc-assist-card">
        <h3>Decision review</h3>
        <p>{lead ? `${lead.title} · ${lead.observed} · ${lead.period}` : fallbackTitle}</p>
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
        {step === 0 ? (
          <p>
            What happened: {lead?.observed ?? 'No open alert'} for {lead?.hospital ?? store.hospital} in {lead?.period ?? `Full year ${store.year}`}.
            Threshold: {lead?.threshold ?? 'No threshold selected'}.
          </p>
        ) : null}
        {step === 1 ? (
          <p>
            Why it matters: {lead?.whyMatters ?? (beds ? 'Bed capacity pressure affects placement.' : ipd ? 'Length of stay affects census and discharge planning.' : 'Waiting time affects ED flow.')}
            {' '}Potential drivers: {lead?.drivers ?? lead?.investigation ?? 'Review domain evidence together.'} These are not proven causes.
          </p>
        ) : null}
        {step === 2 ? (
          <p>
            What may happen next (illustrative): {beds
              ? 'Expected releases and demand are a planning sketch, not a validated 4–48 hour forecast.'
              : ipd
                ? 'Expected discharges are a planning sketch. AI does not declare medical readiness.'
                : 'Continued demand is not converted into a predicted wait. Not a validated model.'}
          </p>
        ) : null}
        {step === 3 ? (
          <p>
            Recommended action: {lead?.action ?? (beds ? 'Prioritize unallocated requests and accelerate cleaning on blocked beds.' : ipd ? 'Review long-stay lists and discharge barriers with the care team.' : 'Review the peak arrival hours against the door-to-provider median.')}
            {' '}Expected effect is not calculated. Follow-up: {lead?.followUp ?? 're-measure the same indicator'}.{beds || ipd ? ' AI does not move or discharge a patient alone.' : ''}
          </p>
        ) : null}
        {step === 4 ? (
          <div className={`gc-decide-box ${boxTone}`}>
            <p>Human review for {store.hospital}, {store.year}, {signal}: {decision ?? 'waiting for a person'}.</p>
            <p>Approval is not evidence of improvement.</p>
            <div className="gc-inline">
              <button type="button" className="gc-chip-btn is-good" onClick={() => store.decide(key, 'approved')}>Approve</button>
              <button type="button" className="gc-chip-btn is-alert" onClick={() => store.decide(key, 'rejected')}>Reject</button>
              <button type="button" className="gc-chip-btn is-watch" onClick={() => store.decide(key, 'deferred')}>Defer</button>
              <button type="button" className="gc-chip-btn is-mute" onClick={() => { if (lead) store.setAlertStatus(lead.id, 'investigating'); setStep(1); }}>Review</button>
            </div>
          </div>
        ) : null}
        {step === 5 ? (
          <div className={`gc-decide-box ${boxTone}`}>
            {decision === 'approved' ? <p>Outcome monitoring: track {lead?.followUp ?? 'the same indicator'} separately from any estimated impact. This illustration is not a measured hospital result. Decision: approved.</p> : null}
            {decision === 'rejected' ? <p>No illustrative outcome is shown after a rejection. Re-measure only if operations change independently.</p> : null}
            {decision === 'deferred' ? <p>Decision deferred. Keep monitoring {lead?.followUp ?? 'the open signal'} without treating deferral as improvement.</p> : null}
            {!decision ? <p>Record an approval or rejection before an outcome is shown. Defer is also available.</p> : null}
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

function Ask({ label, department, askScope, page }: { label: string; department: DomainName; askScope: string; page: string }) {
  const store = useShowcase();
  const { period } = usePeriod();
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const beds = department === 'Beds';
  const ipd = department === 'Inpatient';
  const periodLabel = period === 'year' ? `Full year ${store.year}` : `${period} ${store.year}`;
  const prompts = beds
    ? ['Which wards have the greatest capacity pressure?', 'Why are bed assignments delayed?', ...WHAT_IF_PROMPTS.Beds.slice(0, 1)]
    : ipd
      ? ['Why is the average length of stay increasing?', 'Which specialties have the longest stays?', ...WHAT_IF_PROMPTS.Inpatient.slice(0, 1)]
      : ['Why is emergency waiting time increasing?', 'What should the Emergency Director prioritize?', ...WHAT_IF_PROMPTS.Emergency.slice(0, 1)];
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      title: 'Vital Assist',
      body: [
        `${askScope} · ${label} · ${periodLabel} · ${page}.`,
        beds
          ? 'Ask about occupancy, blocked beds, assignment delays, or capacity what-if scenarios.'
          : ipd
            ? 'Ask about length of stay, delayed discharge, specialty long stays, or discharge what-if scenarios.'
            : 'Ask about arrivals, waiting time, boarding, walkaways, or demand what-if scenarios.',
        'Answers use this hospital scenario. Unsupported questions stay explicit.',
      ],
    }]);
  }, [askScope, beds, ipd, label, page, periodLabel]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, typing]);

  const send = (preset?: string) => {
    const text = (preset ?? draft).trim();
    if (!text || typing) return;
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', body: [text] }]);
    setDraft('');
    setTyping(true);
    window.setTimeout(() => {
      const answer = answerQuestion(text, store.hospital, store.year, department, store.lang);
      setMessages((prev) => [...prev, {
        id: `a-${Date.now()}`,
        role: 'assistant',
        title: answer.title,
        body: [
          `What happened: ${answer.observation}`,
          `Why it matters: ${answer.benefit}`,
          `Potential reasons: ${answer.explanation}`,
          `Supporting evidence: ${answer.evidence}`,
          `Recommended actions: ${answer.action}`,
          `Expected impact: ${answer.outcome}`,
          `Management decision: ${answer.approval}`,
          `Follow-up: Monitor the indicators named above after the next peak or reporting checkpoint (${periodLabel}).`,
        ].filter(Boolean),
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
      <div className="gc-inline" style={{ padding: '0 12px 8px', flexWrap: 'wrap' }}>
        {prompts.map((prompt) => (
          <button key={prompt} type="button" className="gc-chip-btn is-mute" disabled={typing} onClick={() => send(prompt)}>{prompt}</button>
        ))}
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
          placeholder={beds ? 'Ask the Bed Manager view…' : ipd ? 'Ask the Inpatient Care view…' : 'Ask the Emergency Director view…'}
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
