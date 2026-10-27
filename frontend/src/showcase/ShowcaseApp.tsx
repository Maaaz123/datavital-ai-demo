import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { ASSISTANT_PROMPTS, answerQuestion } from './assistant';
import { EXTENSIONS, SCREENS, SEMANTIC_VIEWS, TOUR, UI } from './catalog';
import {
  DEPARTMENTS,
  DISCLAIMER,
  HOSPITALS,
  KPIS,
  USE_CASES,
  YEARS,
  demoValue,
  findKpi,
  formatValue,
  hash,
  kpisForDomains,
  needsCohortReview,
  series,
  trend,
  type KpiDef,
} from './engine';
import { ShowcaseState, useShowcase } from './state';
import './showcase.css';

export function ShowcaseApp() {
  return (
    <ShowcaseState>
      <Shell />
    </ShowcaseState>
  );
}

function Shell() {
  const store = useShowcase();
  const t = UI[store.lang];
  const [openAssistant, setOpenAssistant] = useState(false);
  return (
    <div className="sx-shell" dir={store.lang === 'ar' ? 'rtl' : 'ltr'} lang={store.lang}>
      <nav className="sx-nav" aria-label="Demo">
        <p className="sx-brand">DataVital AI</p>
        <p className="sx-kicker">{DISCLAIMER}</p>
        <p className="sx-group">{t.screens}</p>
        <ul>
          {SCREENS.map((item) => (
            <li key={item.id}>
              <NavLink to={`/showcase/screens/${item.id}`}>{store.lang === 'ar' ? item.titleAr : item.title}</NavLink>
            </li>
          ))}
        </ul>
        <p className="sx-group">{t.extensions}</p>
        <ul>
          {EXTENSIONS.map((item) => (
            <li key={item.id}>
              <NavLink to={`/showcase/extensions/${item.id}`}>{store.lang === 'ar' ? item.titleAr : item.title}</NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="sx-main">
        <div className="sx-banner" role="status">{t.banner}</div>
        <div className="sx-toolbar">
          <label>
            {t.hospital}
            <select aria-label={t.hospital} value={store.hospital} onChange={(e) => store.setHospital(e.target.value)}>
              {HOSPITALS.map((item) => (
                <option key={item.code} value={item.code}>{store.lang === 'ar' ? item.nameAr : item.name}</option>
              ))}
            </select>
          </label>
          <label>
            {t.year}
            <select aria-label={t.year} value={store.year} onChange={(e) => store.setYear(Number(e.target.value))}>
              {YEARS.map((year) => <option key={year}>{year}</option>)}
            </select>
          </label>
          <label>
            {t.department}
            <select aria-label={t.department} value={store.department} onChange={(e) => store.setDepartment(e.target.value)}>
              {DEPARTMENTS.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <Link className="sx-btn" to="/showcase/tour">{t.tour}</Link>
          <Link className="sx-btn" to="/showcase/experience">{t.experience}</Link>
          <Link className="sx-btn" to="/showcase/compare">{t.compare}</Link>
          <Link className="sx-btn" to="/showcase/catalog">{t.catalog}</Link>
          <button type="button" className="sx-btn" onClick={() => setOpenAssistant((v) => !v)}>{t.assistant}</button>
          <button type="button" className="sx-btn" onClick={store.toggleLang}>{t.language}</button>
          <button type="button" className="sx-btn" onClick={store.reset}>{t.reset}</button>
          <Link className="sx-btn" to="/login">{t.classic}</Link>
        </div>
        <div className="sx-content">
          <Outlet />
        </div>
        {openAssistant ? (
          <aside className="sx-assistant sx-panel" aria-label={t.assistant}>
            <AssistantBody />
          </aside>
        ) : null}
      </div>
    </div>
  );
}

export function HomePage() {
  const store = useShowcase();
  return (
    <>
      <header>
        <p className="sx-kicker">Executive showcase</p>
        <h1>DataVital AI</h1>
        <p>A conceptual tour for hospital leaders. Every number is synthetic. Every prediction is simulated and not clinically validated.</p>
      </header>
      <section className="sx-grid">
        <Link className="sx-card" to="/showcase/tour"><h2>Start Demo</h2><p>Ten guided steps. No account.</p></Link>
        <Link className="sx-card" to="/showcase/screens/command"><h2>Command center</h2><p>{HOSPITALS.find((h) => h.code === store.hospital)?.name} · {store.year}</p></Link>
        <Link className="sx-card" to="/showcase/experience"><h2>Patient experience</h2><p>Satisfaction through service recovery.</p></Link>
        <Link className="sx-card" to="/showcase/coverage"><h2>Coverage</h2><p>{SCREENS.length} screens · {EXTENSIONS.length} extensions · {KPIS.length} KPI demonstrations · {USE_CASES.length} simulated use cases.</p></Link>
      </section>
    </>
  );
}

export function ScreenPage({ source }: { source: 'screen' | 'extension' }) {
  const { screenId = '' } = useParams();
  const list = source === 'screen' ? SCREENS : EXTENSIONS;
  const screen = list.find((item) => item.id === screenId);
  const store = useShowcase();
  const rows = useMemo(() => (screen ? kpisForDomains(screen.domains) : []), [screen]);
  const [month, setMonth] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  if (!screen) return <p>This demonstration screen is not in the inventory.</p>;
  const title = store.lang === 'ar' ? screen.titleAr : screen.title;
  const visible = showAll ? rows : rows.slice(0, 8);
  const lead = visible[0];
  return (
    <>
      <header>
        <p className="sx-kicker">{screen.group}</p>
        <h1>{title}</h1>
        <p>{screen.decision}</p>
        <p className="sx-kicker">{screen.story}</p>
      </header>
      {screen.id === 'experience' || screen.id === 'patient-experience' ? <ExperiencePage /> : null}
      {screen.id === 'semantic-views' ? <SemanticList /> : null}
      {screen.id === 'verified-queries' ? <QueryNotice /> : null}
      {screen.id === 'ai-cases' || screen.id === 'ai-overview' || screen.id === 'ai-case' || screen.id === 'ai-governance' ? <UseCaseList /> : null}
      {screen.id === 'comparison' ? <ComparePage /> : null}
      {screen.id === 'kpi-catalog' ? <CatalogPage /> : null}
      {screen.id === 'assistant' ? <AssistantPage /> : null}
      {lead ? (
        <section className="sx-panel">
          <h2>{lead.name}</h2>
          <TrendLine kpi={lead} month={month} onMonth={setMonth} />
        </section>
      ) : null}
      <div className="sx-grid">
        {visible.map((kpi) => <KpiCard key={kpi.key} kpi={kpi} />)}
      </div>
      {rows.length > 8 ? (
        <button type="button" className="sx-btn" onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'Show fewer KPIs' : `Show all ${rows.length} KPIs on this screen`}
        </button>
      ) : null}
    </>
  );
}

function KpiCard({ kpi }: { kpi: KpiDef }) {
  const store = useShowcase();
  const move = trend(kpi, store.hospital, store.year, store.department);
  return (
    <article className="sx-card">
      <p className="sx-kicker">{kpi.origin === 'demo_assumption' ? 'Demo assumption' : kpi.origin === 'registry' ? 'Registry label' : 'Catalog definition'}</p>
      <h2>{kpi.name}</h2>
      <p className="sx-metric" data-testid={`value-${kpi.key}`}>{formatValue(kpi, move.current)}</p>
      <p className={move.direction === 'down' ? 'sx-down' : 'sx-up'}>
        {move.direction} vs {store.year === 2024 ? '2024 baseline' : store.year - 1}: {formatValue(kpi, Math.abs(move.delta))}
      </p>
      <Link to={`/showcase/kpis/${kpi.key}`}>Open decision lifecycle</Link>
    </article>
  );
}

function TrendLine({ kpi, month, onMonth }: { kpi: KpiDef; month: number | null; onMonth: (n: number) => void }) {
  const store = useShowcase();
  const points = series(kpi, store.hospital, store.year, store.department);
  const max = Math.max(...points);
  return (
    <>
      <svg className="sx-chart" viewBox="0 0 360 140" role="img" aria-label={`${kpi.name} by month`}>
        {points.map((value, index) => (
          <rect
            key={index}
            x={12 + index * 29}
            y={120 - (value / max) * 100}
            width="18"
            height={(value / max) * 100}
            fill={month === index ? '#0b3f3d' : '#0f6e6a'}
            rx="4"
          >
            <title>{`Month ${index + 1}: ${formatValue(kpi, value)}`}</title>
          </rect>
        ))}
      </svg>
      <div className="sx-stages">
        {points.map((value, index) => (
          <button key={index} type="button" className="sx-btn" onClick={() => onMonth(index)}>
            M{index + 1}
            <span className="sx-kicker"> {formatValue(kpi, value)}</span>
          </button>
        ))}
      </div>
      {month !== null ? (
        <p className="sx-note">
          Drill-down for month {month + 1}: {formatValue(kpi, points[month])}. Source explanation: {kpi.source}. This is the synthetic series for {store.hospital}, {store.department}, {store.year}.
        </p>
      ) : null}
    </>
  );
}

export function KpiPage() {
  const { metricKey = '' } = useParams();
  const kpi = findKpi(metricKey);
  const store = useShowcase();
  const t = UI[store.lang];
  const [stage, setStage] = useState(0);
  const [month, setMonth] = useState<number | null>(null);
  if (!kpi) return <p>This KPI is not in the demonstration catalog.</p>;
  const move = trend(kpi, store.hospital, store.year, store.department);
  const decision = store.approvals[kpi.key];
  const cohort = needsCohortReview(kpi);
  const factors = factorsFor(kpi.key);
  const illustrated = Math.round(move.current * (decision === 'approved' ? 0.93 : 1) * 1000) / 1000;
  return (
    <>
      <header>
        <p className="sx-kicker">{kpi.domain} · {kpi.origin}</p>
        <h1>{kpi.name}</h1>
        <p>{kpi.note}</p>
      </header>
      <div className="sx-stages" role="tablist" aria-label="Simulated lifecycle">
        {t.stages.map((label, index) => (
          <button key={label} type="button" className="sx-btn" role="tab" aria-selected={stage === index} onClick={() => setStage(index)}>
            {index + 1}. {label}
          </button>
        ))}
      </div>
      <section className="sx-panel" role="tabpanel">
        {stage === 0 ? (
          <>
            <p className="sx-metric">{formatValue(kpi, move.current)}</p>
            <p>Unit: {kpi.unit}. Prior period: {formatValue(kpi, move.prior)}.</p>
            <p>Calculation: {kpi.formula}</p>
            <p>Numerator: {kpi.numerator}. Denominator: {kpi.denominator}.</p>
            <p>Source explanation: {kpi.source}{kpi.columns ? ` (${kpi.columns})` : ''}.</p>
            <TrendLine kpi={kpi} month={month} onMonth={setMonth} />
          </>
        ) : null}
        {stage === 1 ? <p>Detection: the synthetic value moved {move.direction} by {formatValue(kpi, Math.abs(move.delta))} versus the prior period. This is a scenario change, not a statistical alert from a hospital.</p> : null}
        {stage === 2 ? (
          <>
            <p>Possible scenario factors. They are not proven causes.</p>
            <ul>{factors.map((item) => <li key={item}>{item}</li>)}</ul>
          </>
        ) : null}
        {stage === 3 ? (
          cohort ? (
            <p>Controlled review: this topic is not given an individual patient prediction. The demonstration shows a cohort scenario only. Simulated and not clinically validated.</p>
          ) : (
            <p>Simulated prediction: if the scenario pattern continued, the next period would sit near {formatValue(kpi, illustrated)}. Not a validated model.</p>
          )
        ) : null}
        {stage === 4 ? (
          <ul>
            <li>Evidence: {formatValue(kpi, move.current)} at {store.hospital} / {store.department} / {store.year}.</li>
            <li>Business rationale: the scenario suggests reviewing the largest factor before adding capacity.</li>
            <li>Proposed action: hold a simulated operations review on this KPI.</li>
            <li>Responsible role: domain lead for {kpi.domain}.</li>
            <li>Expected illustrative benefit: a small easing of the series. Not a guaranteed result.</li>
          </ul>
        ) : null}
        {stage === 5 ? (
          <>
            <p>Demo-only approval. It stays in this browser and does not change a hospital system.</p>
            <div className="sx-stages">
              <button type="button" className="sx-btn primary" onClick={() => store.decide(kpi.key, 'approved')}>Approve simulated action</button>
              <button type="button" className="sx-btn" onClick={() => store.decide(kpi.key, 'rejected')}>Reject simulated action</button>
            </div>
            <p>{decision ? `Recorded: ${decision}` : 'No decision yet.'}</p>
          </>
        ) : null}
        {stage === 6 ? (
          decision === 'approved' ? (
            <p>Simulated outcome: the illustration moves from {formatValue(kpi, move.current)} to {formatValue(kpi, illustrated)}. This is not a measured hospital result.</p>
          ) : (
            <p>Outcome stays unillustrated until a simulated approval is recorded.</p>
          )
        ) : null}
      </section>
    </>
  );
}

function factorsFor(key: string): string[] {
  const pool = [
    'Arrival mix in the selected period',
    'Boarding overlap with inpatient discharge',
    'Department staffing pattern in the scenario',
    'Authorization completeness in the scenario',
    'Prior-year comparison at the same hospital',
    'Survey and complaint timing in the experience scenario',
  ];
  const start = hash(key) % pool.length;
  return [0, 1, 2].map((offset) => pool[(start + offset) % pool.length]);
}

export function ExperiencePage() {
  const store = useShowcase();
  const kinds = ['satisfaction', 'complaint', 'survey', 'discharge', 'followup', 'recovery'] as const;
  return (
    <section className="sx-panel">
      <h2>Patient experience workflows</h2>
      <p>Fictional cases. Advancing a case is a demo-only status change in this browser.</p>
      {kinds.map((kind) => (
        <div key={kind}>
          <h3>{kind}</h3>
          <ul>
            {store.cases.filter((item) => item.kind === kind).map((item) => (
              <li key={item.id}>
                {item.id} · {item.title} · {item.status}. {item.detail}{' '}
                <button type="button" className="sx-btn" onClick={() => store.advanceCase(item.id)}>
                  Advance
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

export function ComparePage() {
  const store = useShowcase();
  const [key, setKey] = useState('kpi_bed_occupancy_rate');
  const kpi = findKpi(key) ?? KPIS[0];
  return (
    <section className="sx-panel">
      <h2>Compare hospitals</h2>
      <label>
        KPI
        <select className="sx-input" aria-label="KPI to compare" value={kpi.key} onChange={(e) => setKey(e.target.value)}>
          {KPIS.slice(0, 80).map((item) => <option key={item.key} value={item.key}>{item.name}</option>)}
        </select>
      </label>
      <table className="sx-table">
        <caption>Synthetic {kpi.name} for {store.year}, {store.department}</caption>
        <thead><tr><th>Hospital</th><th>Value</th></tr></thead>
        <tbody>
          {HOSPITALS.filter((item) => item.code !== 'ALL').map((item) => (
            <tr key={item.code}>
              <td>{item.name}</td>
              <td>{formatValue(kpi, demoValue(kpi, item.code, store.year, store.department))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function CatalogPage() {
  const [query, setQuery] = useState('');
  const [domain, setDomain] = useState('All');
  const [limit, setLimit] = useState(30);
  const domains = ['All', ...Array.from(new Set(KPIS.map((item) => item.domain))).sort()];
  const rows = KPIS.filter((item) => {
    const text = `${item.key} ${item.name} ${item.domain}`.toLowerCase();
    if (query && !text.includes(query.toLowerCase())) return false;
    if (domain !== 'All' && item.domain !== domain) return false;
    return true;
  });
  return (
    <section className="sx-panel">
      <h2>KPI catalog</h2>
      <p>{KPIS.length} demonstrations. {rows.length} match. Catalog, registry, and labelled assumptions stay distinct.</p>
      <div className="sx-stages">
        <input className="sx-input" aria-label="Search KPIs" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select aria-label="KPI domain" value={domain} onChange={(e) => setDomain(e.target.value)}>
          {domains.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      <table className="sx-table">
        <thead><tr><th>KPI</th><th>Origin</th><th>Value</th></tr></thead>
        <tbody>
          {rows.slice(0, limit).map((kpi) => <CatalogRow key={kpi.key} kpi={kpi} />)}
        </tbody>
      </table>
      {rows.length > limit ? <button type="button" className="sx-btn" onClick={() => setLimit((n) => n + 40)}>Show more</button> : null}
    </section>
  );
}

function CatalogRow({ kpi }: { kpi: KpiDef }) {
  const store = useShowcase();
  return (
    <tr>
      <td><Link to={`/showcase/kpis/${kpi.key}`}>{kpi.name}</Link><div className="sx-kicker">{kpi.key}</div></td>
      <td>{kpi.origin}</td>
      <td>{formatValue(kpi, demoValue(kpi, store.hospital, store.year, store.department))}</td>
    </tr>
  );
}

export function AssistantPage() {
  return (
    <section className="sx-panel">
      <h1>Simulated assistant</h1>
      <AssistantBody />
    </section>
  );
}

function AssistantBody() {
  const store = useShowcase();
  const [question, setQuestion] = useState(ASSISTANT_PROMPTS[0]);
  const reply = answerQuestion(question, store.hospital, store.year, store.department);
  return (
    <>
      <div className="sx-stages">
        {ASSISTANT_PROMPTS.map((prompt) => (
          <button key={prompt} type="button" className="sx-btn" onClick={() => setQuestion(prompt)}>{prompt}</button>
        ))}
      </div>
      <label>
        Ask the scenario
        <input className="sx-input" aria-label="Ask the scenario" value={question} onChange={(e) => setQuestion(e.target.value)} />
      </label>
      <h2>{reply.title}</h2>
      <ul>
        <li>Evidence: {reply.evidence}</li>
        <li>Business rationale: {reply.rationale}</li>
        <li>Proposed action: {reply.action}</li>
        <li>Responsible role: {reply.role}</li>
        <li>Expected illustrative benefit: {reply.benefit}</li>
        <li>Simulated approval: {reply.approval}</li>
        <li>Simulated outcome: {reply.outcome}</li>
      </ul>
    </>
  );
}

export function TourPage() {
  const store = useShowcase();
  const step = TOUR[store.tourStep] ?? TOUR[0];
  const title = store.lang === 'ar' ? step.titleAr : step.title;
  return (
    <section className="sx-panel">
      <h1>Guided demonstration</h1>
      <p>Step {store.tourStep + 1} of {TOUR.length}. No account is required.</p>
      <div className="sx-progress" aria-hidden="true"><span style={{ width: `${((store.tourStep + 1) / TOUR.length) * 100}%` }} /></div>
      <h2>{title}</h2>
      <p>{step.body}</p>
      <div className="sx-stages">
        <Link className="sx-btn primary" to={step.href}>Open this step</Link>
        <button type="button" className="sx-btn" onClick={() => store.setTourStep(Math.max(0, store.tourStep - 1))}>Back</button>
        <button type="button" className="sx-btn" onClick={() => store.setTourStep(Math.min(TOUR.length - 1, store.tourStep + 1))}>Next</button>
      </div>
    </section>
  );
}

export function CoveragePage() {
  return (
    <section className="sx-panel">
      <h1>Coverage matrix</h1>
      <table className="sx-table">
        <thead><tr><th>Requirement</th><th>Demonstration</th></tr></thead>
        <tbody>
          <tr><td>Screens</td><td>{SCREENS.length} navigable screens</td></tr>
          <tr><td>Enterprise extensions</td><td>{EXTENSIONS.length} navigable modules</td></tr>
          <tr><td>KPI demonstrations</td><td>{KPIS.length} ({KPIS.filter((k) => k.origin === 'catalog').length} catalog, {KPIS.filter((k) => k.origin === 'registry').length} registry, {KPIS.filter((k) => k.origin === 'demo_assumption').length} labelled assumptions)</td></tr>
          <tr><td>AI use cases</td><td>{USE_CASES.length} simulated, not validated</td></tr>
          <tr><td>Semantic view names</td><td>{SEMANTIC_VIEWS.length} names. SQL text is not invented.</td></tr>
          <tr><td>Verified queries</td><td>280 were contracted in the source pack. Query text is not in this demo, so none is fabricated.</td></tr>
        </tbody>
      </table>
      <h2>Use cases</h2>
      <UseCaseList />
    </section>
  );
}

function UseCaseList() {
  return (
    <ul>
      {USE_CASES.map((item) => (
        <li key={item.key}>
          <strong>{item.name}</strong> — simulated. {item.objective} Review: {item.review}
        </li>
      ))}
    </ul>
  );
}

function SemanticList() {
  return (
    <ul>
      {SEMANTIC_VIEWS.map((name) => <li key={name}>{name} — name only. SQL is not invented for this demo.</li>)}
    </ul>
  );
}

function QueryNotice() {
  return <p className="sx-note">The source pack contracts 280 verified queries. Their SQL text is not in this demonstration, so the list is not filled with invented queries.</p>;
}
