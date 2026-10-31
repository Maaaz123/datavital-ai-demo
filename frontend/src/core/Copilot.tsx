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
      if (!options?.stay && alert.screen !== 'beds' && alert.screen !== 'emergency' && alert.screen !== 'inpatient' && alert.screen !== 'outpatient') {
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

type DomainName = 'Emergency' | 'Beds' | 'Inpatient' | 'Outpatient' | 'Appointments' | 'Surgery' | 'Radiology' | 'Laboratory' | 'Pharmacy' | 'ICU' | 'Patient Experience' | 'Revenue Cycle' | 'Quality & Safety' | 'Supply Chain' | 'Strategy';

function domainCount(
  hospital: string,
  year: number,
  department: DomainName,
  statuses: Record<string, AlertStatus>,
  period: import('./period').ReportPeriod = 'year',
): number {
  const usePeriod = department === 'Revenue Cycle' || department === 'Quality & Safety' || department === 'Supply Chain' || department === 'Strategy' ? period : 'year';
  return alertsFor(hospital, year, usePeriod).filter((alert) => {
    if (alert.department !== department || alert.severity === 'info') return false;
    const status = statuses[alert.id] ?? 'new';
    return status !== 'resolved' && status !== 'dismissed';
  }).length;
}

function domainFromPath(path: string): { screenId: 'emergency' | 'beds' | 'inpatient' | 'outpatient' | 'appointments' | 'surgery' | 'radiology' | 'laboratory' | 'pharmacy' | 'icu' | 'patient-experience' | 'rcm' | 'quality' | 'supply-chain' | 'strategy'; department: DomainName; page: string; askScope: string } {
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
  if (path.startsWith('/outpatient')) {
    const page = path.startsWith('/outpatient/flow') ? 'Clinic Waiting & Patient Flow'
      : path.startsWith('/outpatient/quality') ? 'Outpatient Quality & Follow-up'
      : 'Outpatient Performance Overview';
    return { screenId: 'outpatient', department: 'Outpatient', page, askScope: 'Outpatient Department' };
  }
  if (path.startsWith('/appointments')) {
    const page = path.startsWith('/appointments/access') ? 'Appointment Access & Capacity'
      : path.startsWith('/appointments/attendance') ? 'Attendance & No-show Intelligence'
        : path.startsWith('/appointments/recovery') ? 'Slot Recovery & Optimization'
          : 'Appointment Command Center';
    return { screenId: 'appointments', department: 'Appointments', page, askScope: 'Appointments & Scheduling' };
  }
  if (path.startsWith('/surgery')) {
    const page = path.startsWith('/surgery/or') ? 'OR Utilization & Scheduling'
      : path.startsWith('/surgery/access') ? 'Surgical Access & Backlog'
        : path.startsWith('/surgery/quality') ? 'Surgical Quality & Safety'
          : path.startsWith('/surgery/optimization') ? 'Surgical Capacity Optimization'
            : 'Surgical Command Center';
    return { screenId: 'surgery', department: 'Surgery', page, askScope: 'Operating Room & Surgery' };
  }
  if (path.startsWith('/radiology')) {
    const page = path.startsWith('/radiology/access') ? 'Imaging Access & Waitlist'
      : path.startsWith('/radiology/utilization') ? 'Modality Utilization & Scheduling'
        : path.startsWith('/radiology/quality') ? 'Reporting & Imaging Quality'
          : path.startsWith('/radiology/optimization') ? 'Imaging Capacity Optimization'
            : 'Imaging Command Center';
    return { screenId: 'radiology', department: 'Radiology', page, askScope: 'Radiology & Diagnostic Imaging' };
  }
  if (path.startsWith('/laboratory')) {
    const page = path.startsWith('/laboratory/samples') ? 'Sample Flow & Pre-Analytics'
      : path.startsWith('/laboratory/analyzers') ? 'Testing & Analyzer Performance'
        : path.startsWith('/laboratory/quality') ? 'Results, TAT & Quality'
          : path.startsWith('/laboratory/optimization') ? 'Laboratory Capacity Optimization'
            : 'Laboratory Command Center';
    return { screenId: 'laboratory', department: 'Laboratory', page, askScope: 'Laboratory & Pathology' };
  }
  if (path.startsWith('/pharmacy')) {
    const page = path.startsWith('/pharmacy/dispensing') ? 'Verification & Dispensing Flow'
      : path.startsWith('/pharmacy/inventory') ? 'Inventory & Stock Position'
        : path.startsWith('/pharmacy/safety') ? 'Medication Safety Process'
          : path.startsWith('/pharmacy/cost') ? 'Medication Cost & Waste'
            : path.startsWith('/pharmacy/optimization') ? 'Pharmacy Capacity Optimization'
              : 'Pharmacy Command Center';
    return { screenId: 'pharmacy', department: 'Pharmacy', page, askScope: 'Pharmacy & Medication Operations' };
  }
  if (path.startsWith('/icu')) {
    const page = path.startsWith('/icu/flow') ? 'ICU Patient Flow & Throughput'
      : path.startsWith('/icu/capacity') ? 'Critical Care Capacity & Staffing'
        : path.startsWith('/icu/equipment') ? 'Ventilation & Equipment Intelligence'
          : path.startsWith('/icu/quality') ? 'ICU Quality & Safety Intelligence'
            : path.startsWith('/icu/optimization') ? 'ICU Capacity Optimization'
              : 'ICU Command Center';
    return { screenId: 'icu', department: 'ICU', page, askScope: 'ICU & Critical Care' };
  }
  if (path.startsWith('/patient-experience')) {
    const page = path.startsWith('/patient-experience/journey') ? 'Patient Journey & Touchpoints'
      : path.startsWith('/patient-experience/complaints') ? 'Complaints & Service Recovery'
        : path.startsWith('/patient-experience/voice') ? 'Voice of Patient & Sentiment AI'
          : path.startsWith('/patient-experience/departments') ? 'Department & Service Experience'
            : path.startsWith('/patient-experience/optimization') ? 'Experience Improvement & What-If'
              : 'Patient Experience Command Center';
    return { screenId: 'patient-experience', department: 'Patient Experience', page, askScope: 'Patient Experience' };
  }
  if (path.startsWith('/rcm')) {
    const page = path.startsWith('/rcm/eligibility') ? 'Eligibility & Pre-Authorization'
      : path.startsWith('/rcm/billing') ? 'Charge Capture & Billing'
        : path.startsWith('/rcm/claims') ? 'Claims & Denial Intelligence'
          : path.startsWith('/rcm/collections') ? 'Accounts Receivable & Collections'
            : path.startsWith('/rcm/leakage') ? 'Revenue Leakage & Financial Integrity'
              : path.startsWith('/rcm/optimization') ? 'RCM Optimization & What-If'
                : 'RCM Command Center';
    return { screenId: 'rcm', department: 'Revenue Cycle', page, askScope: 'Revenue Cycle' };
  }
  if (path === '/quality' || path.startsWith('/quality/')) {
    const page = path.startsWith('/quality/incidents') ? 'Patient Safety Incident Intelligence'
      : path.startsWith('/quality/infections') ? 'Healthcare-Associated Infections'
        : path.startsWith('/quality/prevention') ? 'Infection Prevention & Compliance'
          : path.startsWith('/quality/outcomes') ? 'Clinical Quality & Outcomes'
            : path.startsWith('/quality/actions') ? 'Investigations & Corrective Actions'
              : path.startsWith('/quality/optimization') ? 'Quality & Safety Optimization & What-If'
                : 'Quality & Safety Command Center';
    return { screenId: 'quality', department: 'Quality & Safety', page, askScope: 'Quality & Safety' };
  }
  if (path === '/supply-chain' || path.startsWith('/supply-chain/')) {
    const page = path.startsWith('/supply-chain/inventory') ? 'Inventory & Stock Availability'
      : path.startsWith('/supply-chain/procurement') ? 'Procurement & Purchase Orders'
        : path.startsWith('/supply-chain/suppliers') ? 'Supplier Performance & Contracts'
          : path.startsWith('/supply-chain/consumption') ? 'Clinical Supply Consumption'
            : path.startsWith('/supply-chain/waste') ? 'Waste, Expiry & Financial Exposure'
              : path.startsWith('/supply-chain/optimization') ? 'Supply Optimization & What-If'
                : 'Supply Chain Command Center';
    return { screenId: 'supply-chain', department: 'Supply Chain', page, askScope: 'Supply Chain' };
  }
  if (path === '/strategy' || path.startsWith('/strategy/')) {
    const page = path.startsWith('/strategy/workforce') ? 'Workforce & Staffing Economics'
      : path.startsWith('/strategy/equipment') ? 'Equipment & Asset Productivity'
        : path.startsWith('/strategy/capacity') ? 'Clinical Capacity & Resource Allocation'
          : path.startsWith('/strategy/service-lines') ? 'Service-Line Profitability'
            : path.startsWith('/strategy/cost-efficiency') ? 'Cost Drivers & Efficiency'
              : path.startsWith('/strategy/expansion') ? 'Capital Planning & Expansion'
                : path.startsWith('/strategy/optimization') ? 'Strategic Optimization & What-if'
                  : 'Strategic Resource & Profitability Command Center';
    return { screenId: 'strategy', department: 'Strategy', page, askScope: 'Strategy' };
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
  const { period } = usePeriod();
  const { department } = domainFromPath(location.pathname);
  const count = domainCount(store.hospital, store.year, department, store.alertStatus, period);
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
  const { period } = usePeriod();
  const panelRef = useRef<HTMLElement>(null);
  const titleId = useId();
  const lang = store.lang;
  const domain = domainFromPath(location.pathname);
  const { alerts, note } = visibleAlerts(store.hospital, store.year, 'All', domain.screenId, period);
  const selected = alerts.find((alert) => alert.id === copilot.selectedId) ?? alerts[0] ?? null;
  const hospitalName = HOSPITALS.find((item) => item.code === store.hospital);
  const name = hospitalName?.name;
  const count = domainCount(store.hospital, store.year, domain.department, store.alertStatus, period);
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
                  : domain.department === 'Outpatient' ? 'Outpatient decision support'
                    : domain.department === 'Appointments' ? 'Appointments & Scheduling Decision Support'
                      : domain.department === 'Surgery' ? 'OR & Surgery Decision Support'
                        : domain.department === 'Radiology' ? 'Radiology Decision Support'
                          : domain.department === 'Laboratory' ? 'Laboratory Decision Support'
                            : domain.department === 'Pharmacy' ? 'Pharmacy Decision Support'
                              : domain.department === 'ICU' ? 'ICU Decision Support'
                                : domain.department === 'Patient Experience' ? 'Patient Experience Decision Support'
                                  : domain.department === 'Revenue Cycle' ? 'Revenue Cycle Decision Support'
                                    : domain.department === 'Quality & Safety' ? 'Quality & Safety Decision Support'
                                      : domain.department === 'Supply Chain' ? 'Supply Chain Decision Support'
                                        : domain.department === 'Strategy' ? 'Strategy Decision Support'
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
  const { period } = usePeriod();
  const periodLabel = period === 'year' ? `Full year ${store.year}` : `${period} ${store.year}`;
  const options = WHAT_IF_PROMPTS[department];
  const [selected, setSelected] = useState(options[0]);
  useEffect(() => {
    setSelected(WHAT_IF_PROMPTS[department][0]);
  }, [department]);
  const fromPrompt = useMemo(
    () => answerQuestion(selected, store.hospital, store.year, department, 'en', period),
    [department, period, selected, store.hospital, store.year],
  );
  const fallback = useMemo(
    () => runWhatIf(department as WhatIfDomain, store.hospital, store.year, null, period),
    [department, period, store.hospital, store.year],
  );
  const lines = [fromPrompt.observation, fromPrompt.evidence, fromPrompt.explanation, fromPrompt.action, fromPrompt.outcome];

  return (
    <article className="gc-assist-stack">
      <section className="gc-assist-card">
        <h3>What-if scenarios</h3>
        <p>Illustrative only for {store.hospital} · {periodLabel} · {department}. Not a validated forecast.</p>
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
  const { period } = usePeriod();
  const copilot = useCopilot();
  if (!alert) return <section className="gc-assist-card"><p>No recommendation is selected.</p></section>;
  const key = decisionKey(alert.kpi, store.hospital, store.year, department);
  const decision = store.approvals[key];
  const sketch = runWhatIf(department as WhatIfDomain, store.hospital, store.year, null, period);
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
        <p><strong>Review:</strong> after the next peak or reporting checkpoint in {alert.period}. Approval is not measured improvement.{department === 'Beds' || department === 'Inpatient' ? ' AI does not move or discharge a patient alone.' : department === 'Outpatient' || department === 'Appointments' ? ' AI does not change clinic schedules alone.' : department === 'Surgery' ? ' AI does not change theatre schedules alone.' : department === 'Radiology' ? ' AI does not change imaging schedules alone.' : department === 'Laboratory' ? ' AI does not change laboratory schedules alone.' : department === 'Pharmacy' ? ' AI does not change pharmacy schedules alone.' : department === 'ICU' ? ' AI does not discharge or transfer ICU patients and does not change clinical readiness.' : department === 'Patient Experience' ? ' AI does not close complaints or change clinical care alone.' : department === 'Revenue Cycle' ? ' AI does not submit claims or write off balances alone.' : department === 'Quality & Safety' ? ' AI does not diagnose, order isolation, or close CAPA alone.' : department === 'Supply Chain' ? ' AI does not place purchase orders, change safety stock, or approve suppliers alone.' : department === 'Strategy' ? ' AI does not approve CapEx, change rosters, or reallocate staff alone.' : ''}</p>
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
      : department === 'Outpatient' ? 'kpi_outpatient_median_wait_minutes'
        : department === 'Appointments' ? 'kpi_appointment_no_show_rate'
          : department === 'Surgery' ? 'kpi_surg_same_day_cancel_rate'
            : department === 'Radiology' ? 'kpi_rad_imaging_backlog'
              : department === 'Laboratory' ? 'kpi_lab_testing_backlog'
                : department === 'Pharmacy' ? 'kpi_rx_median_tat'
                  : department === 'ICU' ? 'kpi_icu_admission_wait'
                    : department === 'Patient Experience' ? 'kpi_px_overall_satisfaction'
                      : department === 'Revenue Cycle' ? 'kpi_rcm_net_collection_rate'
                        : department === 'Quality & Safety' ? 'kpi_qs_validated_event_rate'
                          : department === 'Supply Chain' ? 'kpi_sc_supply_availability_rate'
                            : department === 'Strategy' ? 'kpi_st_resource_utilization_index'
                  : 'kpi_ed_door_to_provider_median_minutes';
  const key = decisionKey(lead?.kpi ?? defaultKpi, store.hospital, store.year, department);
  const decision = store.approvals[key];
  const beds = department === 'Beds';
  const ipd = department === 'Inpatient';
  const opd = department === 'Outpatient';
  const appt = department === 'Appointments';
  const surg = department === 'Surgery';
  const rad = department === 'Radiology';
  const lab = department === 'Laboratory';
  const rx = department === 'Pharmacy';
  const icu = department === 'ICU';
  const px = department === 'Patient Experience';
  const rcm = department === 'Revenue Cycle';
  const qs = department === 'Quality & Safety';
  const sc = department === 'Supply Chain';
  const st = department === 'Strategy';
  const signal = beds ? 'bed-capacity' : ipd ? 'inpatient' : opd ? 'outpatient' : appt ? 'appointments' : surg ? 'surgery' : rad ? 'radiology' : lab ? 'laboratory' : rx ? 'pharmacy' : icu ? 'icu' : px ? 'patient-experience' : rcm ? 'revenue-cycle' : qs ? 'quality' : sc ? 'supply-chain' : st ? 'strategy' : 'emergency';
  const fallbackTitle = beds ? 'Operational bed occupancy · selected hospital and year'
    : ipd ? 'Median inpatient stay · selected hospital and year'
      : opd ? 'Median clinic arrival-to-provider · selected hospital and year'
        : appt ? 'Appointment no-show rate · selected hospital and year'
          : surg ? 'Same-day surgery cancellation rate · selected hospital and year'
            : rad ? 'Imaging backlog · selected hospital and year'
              : lab ? 'Laboratory testing backlog · selected hospital and year'
                : rx ? 'Median dispensing turnaround · selected hospital and year'
                  : icu ? 'Median ICU admission wait · selected hospital and year'
                    : px ? 'Overall patient experience score · selected hospital and year'
                      : rcm ? 'Net collection rate · selected hospital and year'
                        : qs ? 'Validated safety event rate · selected hospital and year'
                          : sc ? 'Supply availability rate · selected hospital and year'
                            : st ? 'Resource utilization index · selected hospital and year'
                    : 'Door-to-provider time · selected hospital and year';
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
            Why it matters: {lead?.whyMatters ?? (beds ? 'Bed capacity pressure affects placement.' : ipd ? 'Length of stay affects census and discharge planning.' : opd ? 'Clinic waiting affects outpatient throughput and completion.' : appt ? 'No-shows and access waits waste scheduling capacity.' : surg ? 'Cancellations and OR delays reduce surgical throughput.' : rad ? 'Imaging backlog and scanner delays reduce diagnostic access.' : lab ? 'Testing backlog and analyzer delays reduce laboratory throughput.' : rx ? 'Verification backlog, stockouts, and rework slow medication dispensing.' : icu ? 'ICU admission delays and staffed capacity affect critical-care flow.' : px ? 'Satisfaction, complaints, and recovery backlog affect patient experience.' : rcm ? 'Denials, aged AR, and capture gaps delay cash and put recognized revenue at risk.' : qs ? 'Validated safety events, HAI burden, and overdue CAPA need leadership attention.' : sc ? 'Availability, critical stockouts, supplier reliability, and near-expiry need leadership attention.' : st ? 'Contribution, utilization, constrained lines, and capital feasibility need leadership attention. Contribution ≠ net profit.' : 'Waiting time affects ED flow.')}
            {' '}Potential drivers: {lead?.drivers ?? lead?.investigation ?? 'Review domain evidence together.'} These are not proven causes.
          </p>
        ) : null}
        {step === 2 ? (
          <p>
            What may happen next (illustrative): {beds
              ? 'Expected releases and demand are a planning sketch, not a validated 4–48 hour forecast.'
              : ipd
                ? 'Expected discharges are a planning sketch. AI does not declare medical readiness.'
                : opd
                  ? 'Demand and waiting sketches are illustrative. Not a calibrated clinic forecast.'
                  : appt
                    ? 'Fill, recovery, and lead-time sketches are illustrative. Not a validated scheduling forecast.'
                    : surg
                      ? 'OR recovery and backlog sketches are illustrative. Not a validated theatre forecast.'
                      : rad
                        ? 'Scanner recovery and backlog sketches are illustrative. Not a validated imaging forecast.'
                        : lab
                          ? 'Analyzer recovery and backlog sketches are illustrative. Not a validated laboratory forecast.'
                          : rx
                            ? 'Dispensing, stock, and capacity sketches are illustrative. Not a validated pharmacy forecast or clinical guidance.'
                            : icu
                              ? 'Transfer, staffing, and equipment sketches are illustrative. Not a validated critical-care forecast.'
                              : px
                                ? 'Satisfaction and complaint-recovery sketches are illustrative. Not a validated experience forecast or HCAHPS claim.'
                                : rcm
                                  ? 'Recovery and cash-timing sketches are illustrative modeled values — not collected cash and not a validated financial forecast.'
                                  : qs
                                    ? 'Safety, HAI, and prevention sketches are illustrative under assumptions — not measured improvement, not certified NHSN, and not an official SIR.'
                                    : sc
                                      ? 'Supply sketches are illustrative under assumptions — never cut clinically critical safety stock solely for cost; cheapest supplier ≠ safest.'
                            : 'Continued demand is not converted into a predicted wait. Not a validated model.'}
          </p>
        ) : null}
        {step === 3 ? (
          <p>
            Recommended action: {lead?.action ?? (beds ? 'Prioritize unallocated requests and accelerate cleaning on blocked beds.' : ipd ? 'Review long-stay lists and discharge barriers with the care team.' : opd ? 'Align first-provider coverage to peak clinic hours and clear delayed sessions.' : appt ? 'Raise reminder coverage and recover late-cancelled slots via waitlist outreach.' : surg ? 'Improve first-case starts and recover unused OR hours before adding sessions.' : rad ? 'Recover scanner downtime and prioritize eligible imaging waitlist before adding unstaffed sessions.' : lab ? 'Recover analyzer downtime and prioritize eligible testing backlog before adding unstaffed sessions.' : rx ? 'Clear verification backlog and rework before adding unstaffed pharmacy sessions; review stockout SKUs with the supply lead.' : icu ? 'Clear pending ICU transfers and staffing gaps before adding unstaffed physical beds.' : px ? 'Prioritize waiting-time dissatisfaction and overdue complaint recovery with named owners.' : rcm ? 'Prioritize preventable denials, aged AR over 90 days, and capture gaps with named owners before any write-off decision.' : qs ? 'Prioritize severe harm, device-associated infection signals, and overdue high-risk CAPA with named owners for authorized human review.' : sc ? 'Prioritize critical stockouts, near-expiry exposure, and supplier fill gaps with named owners for authorized human review.' : st ? 'Compare reallocation vs capital, reduce avoidable overtime without breaching safe staffing, and complete expansion evidence before investment review.' : 'Review the peak arrival hours against the door-to-provider median.')}
            {' '}Expected effect is not calculated. Follow-up: {lead?.followUp ?? 're-measure the same indicator'}.{beds || ipd ? ' AI does not move or discharge a patient alone.' : opd || appt ? ' AI does not change clinic schedules alone.' : surg ? ' AI does not change theatre schedules alone.' : rad ? ' AI does not change imaging schedules alone.' : lab ? ' AI does not change laboratory schedules alone.' : rx ? ' AI does not change pharmacy schedules alone.' : icu ? ' AI does not discharge or transfer ICU patients and does not change clinical readiness.' : px ? ' AI does not close complaints or change clinical care alone.' : rcm ? ' AI does not submit claims or write off balances alone.' : qs ? ' AI does not diagnose, order isolation, or close CAPA alone.' : sc ? ' AI does not place purchase orders, change safety stock, or approve suppliers alone.' : st ? ' AI does not approve CapEx, change rosters, or reallocate staff alone.' : ''}
            {lead?.period ? ` Alert evidence period: ${lead.period}.` : ''}
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
  const opd = department === 'Outpatient';
  const appt = department === 'Appointments';
  const surg = department === 'Surgery';
  const rad = department === 'Radiology';
  const lab = department === 'Laboratory';
  const rx = department === 'Pharmacy';
  const icu = department === 'ICU';
  const px = department === 'Patient Experience';
  const rcm = department === 'Revenue Cycle';
  const qs = department === 'Quality & Safety';
  const sc = department === 'Supply Chain';
  const st = department === 'Strategy';
  const periodLabel = period === 'year' ? `Full year ${store.year}` : `${period} ${store.year}`;
  const prompts = beds
    ? page === 'Bed Assignment'
      ? ['Why are bed assignments delayed?', 'How many beds are awaiting cleaning?', ...WHAT_IF_PROMPTS.Beds.slice(0, 1)]
      : page === 'Bed Capacity Outlook'
        ? ['Which wards have the greatest capacity pressure?', 'What is the projected available bed outlook?', ...WHAT_IF_PROMPTS.Beds.slice(0, 1)]
        : ['Which wards have the greatest capacity pressure?', 'How many vacant and blocked beds are available?', ...WHAT_IF_PROMPTS.Beds.slice(0, 1)]
    : ipd
      ? page === 'Stay & Discharge'
        ? ['Why is the median length of stay increasing?', 'How many patients are medically ready but not discharged?', ...WHAT_IF_PROMPTS.Inpatient.slice(0, 1)]
        : page === 'Care Progress & Outcomes'
          ? ['What is the unplanned 30-day readmission rate?', 'Which specialties have the highest return share?', ...WHAT_IF_PROMPTS.Inpatient.slice(0, 1)]
          : ['Where are inpatient admissions coming from?', 'Which specialties have the longest stays?', ...WHAT_IF_PROMPTS.Inpatient.slice(0, 1)]
      : opd
        ? page === 'Clinic Waiting & Patient Flow'
          ? ['Which clinics have the longest waiting times?', 'Why are consultations starting late?', ...WHAT_IF_PROMPTS.Outpatient.slice(0, 2)]
          : page === 'Outpatient Quality & Follow-up'
            ? ['Where are follow-up actions accumulating?', 'What is reducing visit completion?', ...WHAT_IF_PROMPTS.Outpatient.slice(4, 6)]
            : ['Which specialties have the highest outpatient demand?', 'What should the OPD Director prioritize?', ...WHAT_IF_PROMPTS.Outpatient.slice(0, 1)]
        : appt
          ? page === 'Appointment Access & Capacity'
            ? ['What is causing appointment access pressure?', 'Which specialties have the longest booking lead times?', ...WHAT_IF_PROMPTS.Appointments.slice(2, 4)]
            : page === 'Attendance & No-show Intelligence'
              ? ['Which specialties have the highest no-show rates?', 'What is the potential benefit of reducing no-shows by 20%?', ...WHAT_IF_PROMPTS.Appointments.slice(0, 2)]
              : page === 'Slot Recovery & Optimization'
                ? ['How many slots were released and recovered?', 'Which actions should the scheduling manager prioritize?', ...WHAT_IF_PROMPTS.Appointments.slice(3, 6)]
                : ['Where is there unused appointment capacity?', 'What would happen if demand increased by 15%?', ...WHAT_IF_PROMPTS.Appointments.slice(0, 1)]
          : surg
            ? page === 'OR Utilization & Scheduling'
              ? ['Where are we losing operating room hours?', 'Which operating rooms have the lowest utilization?', ...WHAT_IF_PROMPTS.Surgery.slice(0, 2)]
              : page === 'Surgical Access & Backlog'
                ? ['Which surgical specialties have the largest backlog?', 'What is causing first-case delays?', ...WHAT_IF_PROMPTS.Surgery.slice(3, 5)]
                : page === 'Surgical Quality & Safety'
                  ? ['Where are surgical quality indicators showing deterioration?', ...WHAT_IF_PROMPTS.Surgery.slice(0, 1)]
                  : page === 'Surgical Capacity Optimization'
                    ? ['How many additional cases could fit within available capacity?', 'What is the estimated impact of reducing turnover time?', ...WHAT_IF_PROMPTS.Surgery.slice(1, 3)]
                    : ['Which cancellations could have been avoided operationally?', ...WHAT_IF_PROMPTS.Surgery.slice(2, 4)]
            : rad
              ? page === 'Imaging Access & Waitlist'
                ? ['Which modalities have the longest access waits?', 'Where is imaging backlog growing?', ...WHAT_IF_PROMPTS.Radiology.slice(5, 6)]
                : page === 'Modality Utilization & Scheduling'
                  ? ['Which scanners have low utilization?', 'What are the main causes of downtime?', ...WHAT_IF_PROMPTS.Radiology.slice(0, 2)]
                  : page === 'Reporting & Imaging Quality'
                    ? ['Which modality has the longest report turnaround time?', 'How many reports are unsigned?', ...WHAT_IF_PROMPTS.Radiology.slice(3, 4)]
                    : page === 'Imaging Capacity Optimization'
                      ? ['How many additional exams are operationally feasible?', 'What can reduce the imaging backlog?', ...WHAT_IF_PROMPTS.Radiology.slice(1, 3)]
                      : ['Which operational actions should radiology management prioritize?', ...WHAT_IF_PROMPTS.Radiology.slice(0, 1)]
              : lab
                ? page === 'Sample Flow & Pre-Analytics'
                  ? ['What is driving specimen rejection and hemolysis?', 'How long is specimen transport?', ...WHAT_IF_PROMPTS.Laboratory.slice(0, 2)]
                  : page === 'Testing & Analyzer Performance'
                    ? ['Which analyzers have low utilization?', 'What are the main causes of analyzer downtime?', ...WHAT_IF_PROMPTS.Laboratory.slice(2, 3)]
                    : page === 'Results, TAT & Quality'
                      ? ['Which laboratory sections have the longest TAT?', 'How many results are awaiting validation?', ...WHAT_IF_PROMPTS.Laboratory.slice(3, 4)]
                      : page === 'Laboratory Capacity Optimization'
                        ? ['How many additional tests are operationally feasible?', 'What should laboratory management prioritize?', ...WHAT_IF_PROMPTS.Laboratory.slice(4, 6)]
                        : ['Which operational actions should laboratory management prioritize?', ...WHAT_IF_PROMPTS.Laboratory.slice(0, 1)]
                : rx
                  ? page === 'Verification & Dispensing Flow'
                    ? ['Which dispensing pathways have the longest TAT?', 'How many orders are awaiting verification?', ...WHAT_IF_PROMPTS.Pharmacy.slice(0, 1)]
                    : page === 'Inventory & Stock Position'
                      ? ['Which therapeutic groups have the lowest days of supply?', 'How much stock is near expiry?', ...WHAT_IF_PROMPTS.Pharmacy.slice(1, 3)]
                      : page === 'Medication Safety Process'
                        ? ['Which care settings have the lowest barcode scan rate?', 'How many incident reviews are unresolved?', ...WHAT_IF_PROMPTS.Pharmacy.slice(3, 4)]
                        : page === 'Medication Cost & Waste'
                          ? ['What drives medication spend and waste?', 'How much waste is potentially avoidable?', ...WHAT_IF_PROMPTS.Pharmacy.slice(5, 6)]
                          : page === 'Pharmacy Capacity Optimization'
                            ? ['How many additional lines are operationally feasible?', 'What should pharmacy management prioritize?', ...WHAT_IF_PROMPTS.Pharmacy.slice(4, 5)]
                            : ['Which operational actions should pharmacy management prioritize?', ...WHAT_IF_PROMPTS.Pharmacy.slice(0, 1)]
                  : icu
                    ? page === 'ICU Patient Flow & Throughput'
                      ? ['Where are ICU admissions delayed?', 'What is the median ICU length of stay?', ...WHAT_IF_PROMPTS.ICU.slice(0, 2)]
                      : page === 'Critical Care Capacity & Staffing'
                        ? ['Which shifts have the largest staffing coverage gaps?', 'How many staffed ICU beds are available?', ...WHAT_IF_PROMPTS.ICU.slice(2, 3)]
                        : page === 'Ventilation & Equipment Intelligence'
                          ? ['Are ventilators limiting operational capacity?', 'What is driving equipment downtime?', ...WHAT_IF_PROMPTS.ICU.slice(3, 4)]
                          : page === 'ICU Quality & Safety Intelligence'
                            ? ['How large is the safety review backlog?', 'What is infection surveillance completeness?', ...WHAT_IF_PROMPTS.ICU.slice(0, 1)]
                            : page === 'ICU Capacity Optimization'
                              ? ['How many ICU bed hours could be recovered?', 'What operational improvements are feasible?', ...WHAT_IF_PROMPTS.ICU.slice(5, 6)]
                              : ['What is driving ICU demand?', 'Which ICU unit has the greatest transfer backlog?', ...WHAT_IF_PROMPTS.ICU.slice(0, 1)]
                    : px
                      ? page === 'Patient Journey & Touchpoints'
                        ? ['Which journey touchpoints score lowest?', 'How is waiting experience trending?', ...WHAT_IF_PROMPTS['Patient Experience'].slice(0, 2)]
                        : page === 'Complaints & Service Recovery'
                          ? ['What is driving complaint volume?', 'How many complaints are overdue?', ...WHAT_IF_PROMPTS['Patient Experience'].slice(2, 4)]
                          : page === 'Voice of Patient & Sentiment AI'
                            ? ['Which feedback themes are emerging?', 'What share of comments is negative?', ...WHAT_IF_PROMPTS['Patient Experience'].slice(4, 5)]
                            : page === 'Department & Service Experience'
                              ? ['Which departments fall below the experience target?', 'Where is survey coverage thin?', ...WHAT_IF_PROMPTS['Patient Experience'].slice(1, 2)]
                              : page === 'Experience Improvement & What-If'
                                ? ['Which experience actions should we intervene on first?', 'What operational improvements are feasible?', ...WHAT_IF_PROMPTS['Patient Experience'].slice(5, 6)]
                                : ['Is overall satisfaction falling?', 'What should experience leadership prioritize?', ...WHAT_IF_PROMPTS['Patient Experience'].slice(0, 1)]
                    : rcm
                      ? page === 'Eligibility & Pre-Authorization'
                        ? ['How large is the pending authorization backlog?', 'What is authorization-related denial exposure?', ...WHAT_IF_PROMPTS['Revenue Cycle'].slice(3, 4)]
                        : page === 'Charge Capture & Billing'
                          ? ['Which departments under-capture charges?', 'How many encounters are unbilled?', ...WHAT_IF_PROMPTS['Revenue Cycle'].slice(4, 5), ...WHAT_IF_PROMPTS['Revenue Cycle'].slice(7, 8)]
                          : page === 'Claims & Denial Intelligence'
                            ? ['Which denial reasons dominate by value?', 'Which payers concentrate denials?', ...WHAT_IF_PROMPTS['Revenue Cycle'].slice(0, 2)]
                            : page === 'Accounts Receivable & Collections'
                              ? ['Where is aged AR concentrated?', 'How much cash is unapplied?', ...WHAT_IF_PROMPTS['Revenue Cycle'].slice(2, 3)]
                              : page === 'Revenue Leakage & Financial Integrity'
                                ? ['Which drivers create confirmed leakage?', 'Where do contract underpayments concentrate?', ...WHAT_IF_PROMPTS['Revenue Cycle'].slice(5, 7)]
                                : page === 'RCM Optimization & What-If'
                                  ? ['Which recovery actions should we prioritize?', 'How much recovery is realistically feasible?', ...WHAT_IF_PROMPTS['Revenue Cycle'].slice(0, 2)]
                                  : ['Is net collection falling?', 'What should revenue cycle leadership prioritize?', ...WHAT_IF_PROMPTS['Revenue Cycle'].slice(0, 1)]
                    : qs
                      ? page === 'Patient Safety Incident Intelligence'
                        ? ['Which incident categories are rising?', 'How timely are investigations?', ...WHAT_IF_PROMPTS['Quality & Safety'].slice(3, 4)]
                        : page === 'Healthcare-Associated Infections'
                          ? ['Where is CLABSI or CAUTI elevated?', 'Is surveillance coverage complete?', ...WHAT_IF_PROMPTS['Quality & Safety'].slice(2, 3)]
                          : page === 'Infection Prevention & Compliance'
                            ? ['Is hand-hygiene compliance below target?', 'Where are prevention gaps concentrated?', ...WHAT_IF_PROMPTS['Quality & Safety'].slice(0, 2)]
                            : page === 'Clinical Quality & Outcomes'
                              ? ['Is the eligible readmission rate rising?', 'How large is the outcome review backlog?', ...WHAT_IF_PROMPTS['Quality & Safety'].slice(6, 7)]
                              : page === 'Investigations & Corrective Actions'
                                ? ['How many investigations are overdue?', 'Is CAPA verification improving?', ...WHAT_IF_PROMPTS['Quality & Safety'].slice(4, 5), ...WHAT_IF_PROMPTS['Quality & Safety'].slice(7, 8)]
                                : page === 'Quality & Safety Optimization & What-If'
                                  ? ['Which safety interventions should we prioritize?', 'What process uplifts are feasible?', ...WHAT_IF_PROMPTS['Quality & Safety'].slice(0, 3)]
                                  : ['Where are the largest quality and safety concerns?', 'What should leadership prioritize?', ...WHAT_IF_PROMPTS['Quality & Safety'].slice(0, 1)]
                      : sc
                        ? page === 'Inventory & Stock Availability'
                          ? ['What is days of supply?', 'Which critical SKUs are below safety stock?', ...WHAT_IF_PROMPTS['Supply Chain'].slice(0, 1)]
                          : page === 'Procurement & Purchase Orders'
                            ? ['How large is the open PO backlog?', 'How timely is PO fulfillment?', ...WHAT_IF_PROMPTS['Supply Chain'].slice(3, 4)]
                            : page === 'Supplier Performance & Contracts'
                              ? ['Is supplier fill rate below target?', 'Where is supplier concentration high?', ...WHAT_IF_PROMPTS['Supply Chain'].slice(2, 3), ...WHAT_IF_PROMPTS['Supply Chain'].slice(6, 7)]
                              : page === 'Clinical Supply Consumption'
                                ? ['Where is forecast deviation elevated?', 'Which unusual consumption signals need review?', ...WHAT_IF_PROMPTS['Supply Chain'].slice(7, 8)]
                                : page === 'Waste, Expiry & Financial Exposure'
                                  ? ['How large is near-expiry exposure?', 'What drives inventory waste?', ...WHAT_IF_PROMPTS['Supply Chain'].slice(4, 5)]
                                  : page === 'Supply Optimization & What-If'
                                    ? ['Which supply interventions should we prioritize?', 'What stockout reductions are feasible?', ...WHAT_IF_PROMPTS['Supply Chain'].slice(0, 3)]
                                    : ['Where are the largest supply chain concerns?', 'What should leadership prioritize?', ...WHAT_IF_PROMPTS['Supply Chain'].slice(0, 1)]
                  : st
                    ? page === 'Workforce & Staffing Economics'
                      ? ['Where is overtime concentrated?', 'What if we reallocate nurses across eligible units by 20%?', ...WHAT_IF_PROMPTS.Strategy.slice(0, 1)]
                      : page === 'Equipment & Asset Productivity'
                        ? ['Which assets have the highest downtime?', 'What if diagnostic utilization improves by 8 points?', ...WHAT_IF_PROMPTS.Strategy.slice(3, 5)]
                        : page === 'Clinical Capacity & Resource Allocation'
                          ? ['Where is the demand–capacity gap largest?', 'What if OR hours are extended by 15%?', ...WHAT_IF_PROMPTS.Strategy.slice(1, 3)]
                          : page === 'Service-Line Profitability'
                            ? ['Which service lines have healthy contribution margins?', 'What is contribution margin versus net profit?', ...WHAT_IF_PROMPTS.Strategy.slice(0, 1)]
                            : page === 'Cost Drivers & Efficiency'
                              ? ['Where is avoidable cost concentrated?', 'What if avoidable overtime decreases by 25%?', ...WHAT_IF_PROMPTS.Strategy.slice(6, 8)]
                              : page === 'Capital Planning & Expansion'
                                ? ['Which expansion candidates are feasible?', 'What if a high-demand specialty is expanded?', ...WHAT_IF_PROMPTS.Strategy.slice(8, 10)]
                                : page === 'Strategic Optimization & What-if'
                                  ? ['Should we reallocate or invest new capital?', 'Which strategic scenarios overlap?', ...WHAT_IF_PROMPTS.Strategy.slice(8, 10)]
                                  : ['Where should leadership focus resource and profitability attention?', 'What if we compare reallocation versus new capital?', ...WHAT_IF_PROMPTS.Strategy.slice(0, 1)]
                : page === 'Waiting & Patient Flow'
                  ? ['Why is emergency waiting time increasing?', 'When are the peak arrival hours?', ...WHAT_IF_PROMPTS.Emergency.slice(0, 1)]
                  : page === 'Safety & Return Visits'
                    ? ['What is the left-without-being-seen rate?', 'What should the Emergency Director prioritize?', ...WHAT_IF_PROMPTS.Emergency.slice(0, 1)]
                    : ['What should the Emergency Director prioritize?', 'How many visits are boarding beyond 4 hours?', ...WHAT_IF_PROMPTS.Emergency.slice(0, 1)];
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
          ? page === 'Bed Assignment'
            ? 'Ask about pending bed requests, bed allocation time, beds awaiting cleaning, or bed turnover on this screen.'
            : page === 'Bed Capacity Outlook'
              ? 'Ask about projected available beds, shortfall, ward occupancy, or capacity what-if scenarios on this screen.'
              : 'Ask about operational, occupied, vacant, and blocked beds, or occupancy on this screen.'
          : ipd
            ? page === 'Stay & Discharge'
              ? 'Ask about length of stay, long-stay patients, delayed discharge, or discharge outlook on this screen.'
              : page === 'Care Progress & Outcomes'
                ? 'Ask about unplanned readmissions, inpatient mortality, or documentation gaps on this screen.'
                : 'Ask about admissions, census, admission sources, or specialty volume on this screen.'
            : opd
              ? page === 'Clinic Waiting & Patient Flow'
                ? 'Ask about arrival-to-provider time, cycle time, delayed sessions, or clinic delay contribution on this screen.'
                : page === 'Outpatient Quality & Follow-up'
                  ? 'Ask about documentation completion, pending referrals, or follow-up coordination on this screen.'
                  : 'Ask about outpatient visit volume, specialty demand, completion, or session utilization on this screen.'
              : appt
                ? page === 'Appointment Access & Capacity'
                  ? 'Ask about booking lead time, third next available, slot fill, or specialty access pressure on this screen.'
                  : page === 'Attendance & No-show Intelligence'
                    ? 'Ask about no-show rates, cancellations, lost booked slots, or reminder coverage on this screen.'
                    : page === 'Slot Recovery & Optimization'
                      ? 'Ask about released and rebooked slots, waitlist outreach, or recovery opportunities on this screen.'
                      : 'Ask about scheduled demand, attendance outcomes, or specialty booking mix on this screen.'
                : surg
                  ? page === 'OR Utilization & Scheduling'
                    ? 'Ask about OR utilization, first-case on-time starts, turnover, unused hours, or delay reasons on this screen.'
                    : page === 'Surgical Access & Backlog'
                      ? 'Ask about surgical backlog, median or P90 wait, overdue cases, or specialty access pressure on this screen.'
                      : page === 'Surgical Quality & Safety'
                        ? 'Ask about unplanned OR returns, complications, checklist completion, or documentation gaps on this screen.'
                        : page === 'Surgical Capacity Optimization'
                          ? 'Ask about recoverable OR hours, additional cases, capacity gain, or constraint-aware what-if scenarios on this screen.'
                          : 'Ask about completed and scheduled cases, same-day cancellations, emergency share, or surgical throughput on this screen.'
                  : rad
                    ? page === 'Imaging Access & Waitlist'
                      ? 'Ask about imaging backlog, access waits, overdue imaging, or waitlist growth on this screen.'
                      : page === 'Modality Utilization & Scheduling'
                        ? 'Ask about scanner utilization, downtime, exam duration, or schedule adherence on this screen.'
                        : page === 'Reporting & Imaging Quality'
                          ? 'Ask about report TAT, unsigned reports, repeat exams, or critical acknowledgement on this screen.'
                          : page === 'Imaging Capacity Optimization'
                            ? 'Ask about recoverable hours, additional exams, eligible waitlist, or capacity what-if scenarios on this screen.'
                            : 'Ask about imaging requests, completed exams, completion rate, urgent share, or pending exams on this screen.'
                    : lab
                      ? page === 'Sample Flow & Pre-Analytics'
                        ? 'Ask about specimen rejection, hemolysis, transport time, or recollections on this screen.'
                        : page === 'Testing & Analyzer Performance'
                          ? 'Ask about analyzer utilization, downtime, testing backlog, or QC holds on this screen.'
                          : page === 'Results, TAT & Quality'
                            ? 'Ask about Lab TAT, pending validation, critical notification, or corrected reports on this screen.'
                            : page === 'Laboratory Capacity Optimization'
                              ? 'Ask about recoverable hours, additional tests, eligible backlog, or capacity what-if scenarios on this screen.'
                              : 'Ask about test orders, completed tests, completion rate, STAT share, or pending tests on this screen.'
                      : rx
                        ? page === 'Verification & Dispensing Flow'
                          ? 'Ask about dispensing TAT, verification backlog, first-pass rate, or rework on this screen.'
                          : page === 'Inventory & Stock Position'
                            ? 'Ask about stockout SKUs, low-stock SKUs, days of supply, or near-expiry stock on this screen.'
                            : page === 'Medication Safety Process'
                              ? 'Ask about verification exceptions, barcode scan rate, high-alert checks, or incident reviews on this screen. Process signals only — no clinical advice.'
                              : page === 'Medication Cost & Waste'
                                ? 'Ask about medication spend, cost per line, expired value, avoidable waste, or savings drivers on this screen.'
                                : page === 'Pharmacy Capacity Optimization'
                                  ? 'Ask about recoverable hours, additional lines, eligible pending lines, or capacity what-if scenarios on this screen.'
                                  : 'Ask about medication orders, verified orders, dispensed lines, completion rate, or pending orders on this screen.'
                        : icu
                          ? page === 'ICU Patient Flow & Throughput'
                            ? 'Ask about admission waits, transfer delays, length of stay, or pending transfers on this screen.'
                            : page === 'Critical Care Capacity & Staffing'
                              ? 'Ask about staffed beds, coverage gaps, or available staffed capacity on this screen.'
                              : page === 'Ventilation & Equipment Intelligence'
                                ? 'Ask about ventilator availability, downtime, or equipment readiness on this screen.'
                                : page === 'ICU Quality & Safety Intelligence'
                                  ? 'Ask about safety review backlog or surveillance completeness on this screen.'
                                  : page === 'ICU Capacity Optimization'
                                    ? 'Ask about recoverable bed hours, feasible capacity, or flow what-if scenarios on this screen.'
                                    : 'Ask about ICU demand, census, or unit transfer backlog on this screen.'
                          : px
                            ? page === 'Patient Journey & Touchpoints'
                              ? 'Ask about touchpoint scores, waiting experience, discharge communication, or journey linkage on this screen.'
                              : page === 'Complaints & Service Recovery'
                                ? 'Ask about complaint drivers, overdue cases, resolution time, or reopen rate on this screen.'
                                : page === 'Voice of Patient & Sentiment AI'
                                  ? 'Ask about emerging themes, negative feedback share, or review coverage on this screen. Comments are synthetic — not real patient quotes.'
                                  : page === 'Department & Service Experience'
                                    ? 'Ask about departments below target, coverage gaps, or service-line scores on this screen.'
                                    : page === 'Experience Improvement & What-If'
                                      ? 'Ask about priority interventions, modeled uplift, or experience what-if scenarios on this screen.'
                                      : 'Ask about overall satisfaction, response rate, unresolved issues, or recommendation score on this screen. Internal survey — not HCAHPS.'
                      : rcm
                        ? page === 'Eligibility & Pre-Authorization'
                          ? 'Ask about eligibility verification, authorization approval, pending requests, or authorization-related denial exposure on this screen.'
                          : page === 'Charge Capture & Billing'
                            ? 'Ask about charge capture, unbilled encounters, coding completion, or charge-to-bill lag on this screen.'
                            : page === 'Claims & Denial Intelligence'
                              ? 'Ask about denial rate, first-pass acceptance, denial reasons, payers, or appeals on this screen.'
                              : page === 'Accounts Receivable & Collections'
                                ? 'Ask about days in AR, aged balances, cash applied, or unapplied cash on this screen.'
                                : page === 'Revenue Leakage & Financial Integrity'
                                  ? 'Ask about confirmed leakage, underpayments, missed charges, or avoidable write-offs on this screen.'
                                  : page === 'RCM Optimization & What-If'
                                    ? 'Ask about recovery priorities or revenue-cycle what-if scenarios on this screen. Modeled recovery is illustrative — not collected cash.'
                                    : 'Ask about net patient revenue, net collection rate, denial rate, days in AR, or revenue at risk on this screen. AI does not submit claims or write off balances alone.'
                      : qs
                        ? page === 'Patient Safety Incident Intelligence'
                          ? 'Ask about reporting volume, validated events, harm, categories, or investigation timeliness on this screen. Reporting ≠ harm.'
                          : page === 'Healthcare-Associated Infections'
                            ? 'Ask about CLABSI, CAUTI, SSI, device-days, or surveillance coverage on this screen. Not certified NHSN; official SIR unavailable.'
                            : page === 'Infection Prevention & Compliance'
                              ? 'Ask about hand hygiene, bundles, isolation, or audit gaps on this screen. Audited opportunities only.'
                              : page === 'Clinical Quality & Outcomes'
                                ? 'Ask about readmissions, HAPI, falls with injury, or review backlog on this screen. Descriptive — not risk-adjusted.'
                                : page === 'Investigations & Corrective Actions'
                                  ? 'Ask about open investigations, overdue CAPA, repeat findings, or effectiveness verification on this screen. Approval ≠ measured effectiveness.'
                                  : page === 'Quality & Safety Optimization & What-If'
                                    ? 'Ask about illustrative process and governance scenarios on this screen. Modeled uplifts are not measured infection or harm reduction.'
                                    : 'Ask about validated event rate, severe harm, HAI burden, quality compliance, or overdue actions on this screen. AI does not diagnose, order isolation, or close CAPA alone.'
                        : sc
                          ? page === 'Inventory & Stock Availability'
                            ? 'Ask about available units, days of supply, safety stock, or replenishment exceptions on this screen. Days of Supply uses units ÷ forecast daily demand.'
                            : page === 'Procurement & Purchase Orders'
                              ? 'Ask about open POs, approval TAT, cycle time, or on-time fulfillment on this screen. PO ≠ receipt ≠ invoice ≠ payment.'
                              : page === 'Supplier Performance & Contracts'
                                ? 'Ask about fill rate, contract compliance, concentration, or dual-source coverage on this screen. OTD is owned on Command. Cheapest ≠ safest.'
                                : page === 'Clinical Supply Consumption'
                                  ? 'Ask about clinical consumption, forecast deviation, or unusual signals on this screen. Issue flows are not stocks.'
                                  : page === 'Waste, Expiry & Financial Exposure'
                                    ? 'Ask about expired value, near-expiry, damaged stock, or waste rate on this screen. Dispositions stay distinct.'
                                    : page === 'Supply Optimization & What-If'
                                      ? 'Ask about illustrative supply scenarios on this screen. Never cut clinically critical safety stock solely for cost.'
                                      : 'Ask about availability, critical stockouts, inventory value, supplier OTD, near-expiry, or PO backlog on this screen. AI does not place purchase orders, change safety stock, or approve suppliers alone.'
                        : st
                          ? page === 'Workforce & Staffing Economics'
                            ? 'Ask about staffing utilization, overtime, agency cost, or nurse reallocation on this screen. Respect safe staffing minima.'
                            : page === 'Equipment & Asset Productivity'
                              ? 'Ask about serviceable hours, downtime, or equipment utilization on this screen. Installed ≠ serviceable.'
                              : page === 'Clinical Capacity & Resource Allocation'
                                ? 'Ask about effective capacity, demand gaps, or reallocation on this screen. Cross-domain inputs only.'
                                : page === 'Service-Line Profitability'
                                  ? 'Ask about contribution margin, direct cost, or cost per encounter on this screen. Contribution ≠ net profit.'
                                  : page === 'Cost Drivers & Efficiency'
                                    ? 'Ask about synthetic cost categories, fixed vs variable, or avoidable cost on this screen.'
                                    : page === 'Capital Planning & Expansion'
                                      ? 'Ask about CapEx candidates, feasibility, or incremental contribution on this screen. Outcomes not achieved.'
                                      : page === 'Strategic Optimization & What-if'
                                        ? 'Ask about illustrative reallocation vs capital scenarios on this screen. Do not sum overlapping benefits.'
                                        : 'Ask about contribution, utilization, constrained lines, or investment coverage on this screen. AI does not approve CapEx, change rosters, or reallocate staff alone.'
                      : page === 'Waiting & Patient Flow'
                        ? 'Ask about door-to-provider time, triage completion, arrival peaks, or disposition rates on this screen.'
                        : page === 'Safety & Return Visits'
                          ? 'Ask about left without being seen, 72-hour returns, or ED mortality on this screen.'
                          : 'Ask about ED visit volume, acuity mix, ED boarding beyond 4 hours, or disposition outcomes on this screen.',
        'Recommendations reference the KPIs and charts on the current screen. Answers use this hospital scenario.',
      ],
    }]);
  }, [askScope, appt, beds, icu, ipd, lab, opd, px, qs, rcm, rad, rx, sc, st, surg, label, page, periodLabel]);

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
      const answer = answerQuestion(text, store.hospital, store.year, department, store.lang, period);
      setMessages((prev) => [...prev, {
        id: `a-${Date.now()}`,
        role: 'assistant',
        title: answer.title,
        body: [
          `What happened (${periodLabel}): ${answer.observation}`,
          `Why it matters: ${answer.benefit}`,
          `Potential reasons (hypotheses, not proven causes): ${answer.explanation}`,
          `Supporting evidence: ${answer.evidence}`,
          `Recommended actions: ${answer.action}`,
          `Expected impact (illustrative): ${answer.outcome}`,
          `Management decision: ${answer.approval}`,
          `Follow-up: Re-measure the named KPIs on this screen after the next peak or reporting checkpoint (${periodLabel}).`,
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
          placeholder={beds ? 'Ask the Bed Manager view…' : ipd ? 'Ask the Inpatient Care view…' : opd ? 'Ask the Outpatient Director view…' : appt ? 'Ask the Appointments & Scheduling view…' : surg ? 'Ask the OR & Surgery view…' : rad ? 'Ask the Radiology Director view…' : lab ? 'Ask the Laboratory Director view…' : rx ? 'Ask the Pharmacy Operations view…' : icu ? 'Ask the ICU Operations view…' : px ? 'Ask the Patient Experience view…' : rcm ? 'Ask the Revenue Cycle view…' : qs ? 'Ask the Quality & Safety view…' : sc ? 'Ask the Supply Chain view…' : st ? 'Ask the Strategy view…' : 'Ask the Emergency Director view…'}
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
