import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { answerQuestion, promptForPath } from '@/showcase/assistant';
import { deptLabel, kpiName, tx, type Lang } from '@/showcase/copy';
import { DEPARTMENTS, DISCLAIMER, HOSPITALS, KPIS, USE_CASES, findKpi, needsCohortReview, type KpiDef } from '@/showcase/engine';
import { scenarioFor } from '@/showcase/facts';
import { formatDelta, formatMeasure, measure, type Measure } from '@/showcase/measures';
import { decisionKey, useShowcase } from '@/showcase/state';
import { AREAS, CHALLENGES, LAYERS, PRESENTATION, allScreens, areaFor, featuredKpis, findScreen } from './stories';
import { Chart, screenCharts } from './viz';
import { visibleAlerts } from './alerts';
import { DomainTabs } from './boards';
import { useCopilot } from './Copilot';

export const COUNTRIES = [
  { id: 'sa', name: 'Saudi Arabia', currency: 'SAR', factor: 1, tz: 'Asia/Riyadh', languages: 'Arabic and English', occupancyTarget: 85 },
  { id: 'ca', name: 'Canada / Nova Scotia', currency: 'CAD', factor: 0.37, tz: 'America/Halifax', languages: 'English and French', occupancyTarget: 90 },
  { id: 'uk', name: 'United Kingdom', currency: 'GBP', factor: 0.21, tz: 'Europe/London', languages: 'English', occupancyTarget: 92 },
  { id: 'us', name: 'United States', currency: 'USD', factor: 0.27, tz: 'America/New_York', languages: 'English', occupancyTarget: 85 },
] as const;

export function countryOf(id: string) {
  return COUNTRIES.find((item) => item.id === id) ?? COUNTRIES[0];
}

export function showMeasure(item: Measure, lang: Lang, _countryId?: string): string {
  return formatMeasure(item, lang);
}

function originLabel(_origin?: KpiDef['origin'], _lang?: Lang): string {
  return 'Indicator';
}

function formulaText(kpi: KpiDef): string {
  if (kpi.origin === 'demo_assumption') return 'Working figure for this reporting period. An official calculation was not supplied with this indicator.';
  if (kpi.origin === 'registry' || /formula text is not/i.test(kpi.formula)) return 'This indicator is named in the measure list. A calculation was not included with that name.';
  return kpi.formula;
}

export function useScope() {
  const store = useShowcase();
  const country = countryOf(store.country);
  return { store, country, lang: store.lang as Lang };
}

export function Overview() {
  const { store, lang } = useScope();
  const cards = featuredKpis('command').map((key) => {
    const kpi = findKpi(key)!;
    return { kpi, item: measure(kpi, store.hospital, store.year, store.department) };
  });
  return (
    <>
      <section className="gc-hero">
        <div>
          <p className="gc-kicker">DataVital Global Core</p>
          <div className="gc-ltr">
            <h1>From Hospital Data to Intelligent Decisions.</h1>
            <p className="gc-lede">One global healthcare intelligence platform that connects clinical, operational, financial and patient experience insights — turning complexity into measurable action.</p>
            <ol className="gc-path">
              <li>See the pressure</li>
              <li>Open one indicator</li>
              <li>Review a simulated action</li>
              <li>A person approves</li>
            </ol>
          </div>
          <div className="gc-actions">
            <Link className="gc-btn primary" to="/present">Start Interactive Tour</Link>
            <Link className="gc-btn" to="/platform">Explore Platform</Link>
            <Link className="gc-btn quiet" to="/kpis">View All KPIs</Link>
          </div>
          <p className="gc-note">{DISCLAIMER} Conceptual product demonstration. Not a live hospital system.</p>
        </div>
        <aside className="gc-preview">
          <p className="gc-kicker">Live scenario preview</p>
          <p>{HOSPITALS.find((item) => item.code === store.hospital)?.[lang === 'ar' ? 'nameAr' : 'name']} · {store.year}</p>
          <ol>
            {cards.map(({ kpi, item }) => (
              <li key={kpi.key}>
                <span>{kpiName(kpi.name, lang)}</span>
                <strong className="gc-ltr">{showMeasure(item, lang, store.country)}</strong>
              </li>
            ))}
          </ol>
          <Link to="/story/emergency">Open the emergency story</Link>
        </aside>
      </section>
      <section className="gc-grid">
        {[
          ['One definition', 'A catalog figure and a workspace figure come from the same scenario.'],
          ['Detection first', 'What changed is shown against the prior year before anyone is asked to act.'],
          ['A person decides', 'Recommendations wait for approval. Nothing is sent to a hospital.'],
          ['Experience included', 'Satisfaction, complaints, and recovery sit beside flow and money.'],
          ['Local preview', 'Country, currency, and targets change the preview without a second dataset.'],
        ].map(([title, body]) => (
          <article className="gc-card" key={title}>
            <h2>{title}</h2>
            <p>{body}</p>
          </article>
        ))}
      </section>
    </>
  );
}

export function Challenge() {
  return (
    <section className="gc-mast">
      <p className="gc-kicker">Why hospitals look at this</p>
      <h1>The hospital challenge</h1>
      <p className="gc-lede">Each row is a problem, the intelligence this demo can show, a decision a person would review, and an outcome that stays inside the scenario.</p>
      <div className="gc-library">
        {CHALLENGES.map((item) => (
          <article className="gc-card" key={item.problem}>
            <h2>{item.problem}</h2>
            <p><strong>Intelligence. </strong>{item.intelligence}</p>
            <p><strong>Decision. </strong>{item.decision}</p>
            <p><strong>Outcome. </strong>{item.outcome}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function Solution() {
  return (
    <section className="gc-mast">
      <p className="gc-kicker">The DataVital solution</p>
      <h1>From a shared number to a reviewed action.</h1>
      <p className="gc-lede">Hospital problem, then a solution, then Global Core, then operations, then one KPI, then detection, root cause, an illustrated prediction, a simulated action, human approval, and a hypothetical outcome.</p>
      <div className="gc-grid">
        {['Problem', 'Solution', 'Global Core', 'Operations', 'KPI', 'Detection', 'Root cause', 'Prediction', 'AI action', 'Approval', 'Outcome'].map((step, index) => (
          <article className="gc-card" key={step}>
            <p className="gc-kicker">{String(index + 1).padStart(2, '0')}</p>
            <h2>{step}</h2>
          </article>
        ))}
      </div>
      <Link className="gc-btn primary" to="/present">Walk it in presentation mode</Link>
    </section>
  );
}

export function Architecture() {
  const [active, setActive] = useState(LAYERS[0].id);
  const layer = LAYERS.find((item) => item.id === active) ?? LAYERS[0];
  return (
    <section className="gc-mast">
      <p className="gc-kicker">Global Core architecture</p>
      <h1>Five layers. None of them is a live integration.</h1>
      <div className="gc-split">
        <div className="gc-layers">
          {LAYERS.map((item, index) => (
            <button key={item.id} type="button" aria-pressed={item.id === active} onClick={() => setActive(item.id)}>
              <strong>{index + 1}. {item.name}</strong>
            </button>
          ))}
        </div>
        <article className="gc-panel">
          <h2>{layer.name}</h2>
          <p>{layer.body}</p>
        </article>
      </div>
    </section>
  );
}

export function PlatformPage() {
  return (
    <section className="gc-mast">
      <p className="gc-kicker">Platform</p>
      <h1>Problem, solution, and the five layers.</h1>
      <p className="gc-lede">Start with the hospital problem, then the decision path, then the architecture. None of the layers is a live integration.</p>
      <div className="gc-grid">
        <article className="gc-card"><h2>The hospital challenge</h2><p>Ten operating problems, each with a decision a person would review.</p><Link to="/challenge">Open</Link></article>
        <article className="gc-card"><h2>The DataVital solution</h2><p>From a shared number to a reviewed action.</p><Link to="/solution">Open</Link></article>
        <article className="gc-card"><h2>Global Core architecture</h2><p>Sources, definitions, intelligence, action, and local settings.</p><Link to="/architecture">Open</Link></article>
        <article className="gc-card"><h2>Patient experience</h2><p>Satisfaction, complaints, discharge, and recovery beside the operational story.</p><Link to="/experience">Open</Link></article>
      </div>
    </section>
  );
}

export function OperationsHub() {
  const { lang } = useScope();
  return (
    <section className="gc-mast">
      <p className="gc-kicker">Hospital operations</p>
      <h1>Choose a solution</h1>
      <div className="gc-grid">
        {AREAS.map((area) => (
          <article className="gc-card" key={area.id}>
            <h2>{lang === 'ar' ? area.titleAr : area.title}</h2>
            <p>{area.lede}</p>
            <Link to={`/operations/${area.id}`}>Open</Link>
          </article>
        ))}
      </div>
    </section>
  );
}

export function AreaPage() {
  const { area = 'executive' } = useParams();
  const found = AREAS.find((item) => item.id === area) ?? AREAS[0];
  const screens = found.screens.map((id) => findScreen(id)).filter((item) => item != null);
  return (
    <section className="gc-mast">
      <p className="gc-kicker">{found.title}</p>
      <h1>{found.title}</h1>
      <p className="gc-lede">{found.lede}</p>
      <div className="gc-library">
        {screens.map((screen) => (
          <article className="gc-card" key={screen.id}>
            <h2>{screen.title}</h2>
            <p>{screen.decision}</p>
            <Link to={`/story/${screen.id}`}>Open story</Link>
          </article>
        ))}
      </div>
    </section>
  );
}

export function StoryPage({ forcedId }: { forcedId?: string } = {}) {
  const params = useParams();
  const screenId = forcedId || params.screenId || '';
  const { store, lang } = useScope();
  const copilot = useCopilot();
  const screen = findScreen(screenId);
  const [assistant, setAssistant] = useState(false);
  const [query, setQuery] = useState('');
  const screens = allScreens();
  const index = screens.findIndex((item) => item.id === screenId);
  if (!screen) return <p>This screen is not in the library.</p>;
  const area = AREAS.find((item) => item.id === areaFor(screen.id)) ?? AREAS[0];
  const keys = featuredKpis(screen.id);
  const cards = keys.map((key) => {
    const kpi = findKpi(key)!;
    return { kpi, item: measure(kpi, store.hospital, store.year, store.department) };
  });
  const charts = screenCharts(screen.id, store.hospital, store.year, lang);
  const fact = scenarioFor(store.hospital, store.year).focus;
  const answer = answerQuestion(query || promptForPath(`/story/${screen.id}`), store.hospital, store.year, store.department, lang);
  const previous = index > 0 ? screens[index - 1] : null;
  const next = index < screens.length - 1 ? screens[index + 1] : null;
  const actionKey = screen.id === 'claims' || screen.id === 'claims-processing' ? 'kpi_claim_denied_rate' : keys[0];
  const actionLabel = screen.id === 'emergency' ? 'Open the wait lifecycle' : screen.id === 'claims' ? 'Open the denial lifecycle' : 'Open the decision lifecycle';
  return (
    <article className="gc-story">
      <nav className="gc-crumbs" aria-label="Breadcrumb">
        <Link to="/">{tx(lang, 'Command Center', 'مركز القيادة')}</Link>
        <span>/</span>
        <Link to={`/operations/${area.id}`}>{area.title}</Link>
        <span>/</span>
        <span>{screen.title}</span>
      </nav>
      <p className="gc-kicker">{screen.decision}</p>
      <h1>{screen.title}</h1>
      <DomainTabs screenId={screen.id} />
      <p>
        {(() => {
          const count = visibleAlerts(store.hospital, store.year, store.department, screen.id).alerts.filter((alert) => alert.severity !== 'info').length;
          return tx(lang, `${count} ${count === 1 ? 'signal' : 'signals'} on this workspace.`, `${count} ${count === 1 ? 'إشارة' : 'إشارات'} في مساحة العمل هذه.`);
        })()}
        {' '}
        <button type="button" className="gc-text-btn" onClick={() => { copilot.setTab('alerts'); copilot.setOpen(true); }}>
          {tx(lang, 'Open alerts', 'فتح التنبيهات')}
        </button>
      </p>
      {store.department !== 'All' && area.id !== 'workforce' ? <p>Service scope filters alerts and staffing. Activity on this page stays at hospital level for this reporting period.</p> : null}
      <div className="gc-viz">
        {charts.map((figure) => (
          <div key={figure.title}>
            <Chart figure={figure} />
            <button type="button" className="gc-text-btn" onClick={() => copilot.focusChart(figure.title)}>
              {tx(lang, `Discuss ${figure.title} with Copilot`, `ناقش ${figure.title} مع المساعد`)}
            </button>
          </div>
        ))}
      </div>
      <div className="gc-kpis">
        {cards.map(({ kpi, item }) => (
          <div className="gc-kpi" key={kpi.key}>
            <p className="gc-kicker">{originLabel(kpi.origin, lang)}</p>
            <h3>{kpiName(kpi.name, lang)}</h3>
            <p className="gc-figure gc-ltr" data-testid={`value-${kpi.key}`}>{showMeasure(item, lang, store.country)}</p>
            <p className="gc-ltr">{formatDelta(item, lang)}</p>
          </div>
        ))}
      </div>
      <p>
        {screen.story} {screen.id === 'infection-prevention' ? `Outbreak declarations: ${fact.outbreakDeclarations} events in this period and scope.` : ''}
        {' '}Related measures are in the performance indicator library.
      </p>
      <div className="gc-actions">
        <Link to={`/kpis/${actionKey}`}>{actionLabel}</Link>
        <Link to={`/kpis?screen=${screen.id}`}>All related KPI definitions</Link>
        <button type="button" className="gc-btn quiet" onClick={() => { setQuery(promptForPath(`/story/${screen.id}`)); setAssistant(true); }}>Assistant</button>
      </div>
      {assistant ? (
        <section>
          <h2>{answer.title}</h2>
          <p>{answer.observation}</p>
          <p>{answer.evidence}</p>
          <p>{answer.explanation}</p>
          <p>{answer.action}</p>
          <p>{answer.approval}</p>
        </section>
      ) : null}
      {screen.id === 'comparison' ? <CompareTable /> : null}
      <div className="gc-pager">
        {previous ? <Link to={`/story/${previous.id}`}>Previous: {previous.title}</Link> : <span />}
        {next ? <Link to={`/story/${next.id}`}>Next: {next.title}</Link> : <span />}
      </div>
    </article>
  );
}

function CompareTable() {
  const { store, lang } = useScope();
  const [key, setKey] = useState('kpi_bed_occupancy_rate');
  const [filter, setFilter] = useState('');
  const kpi = findKpi(key) ?? KPIS[0];
  const options = KPIS.filter((item) => item.key === key || `${item.name} ${item.key}`.toLowerCase().includes(filter.toLowerCase()));
  const sites = scenarioFor('ALL', store.year).sites;
  return (
    <section>
      <label className="gc-field">
        Search measures
        <input value={filter} onChange={(event) => setFilter(event.target.value)} />
      </label>
      <label className="gc-field">
        Measure
        <select aria-label="Measure" value={kpi.key} onChange={(event) => setKey(event.target.value)}>
          {options.map((item) => <option key={item.key} value={item.key}>{item.name}</option>)}
        </select>
      </label>
      <table className="gc-table">
        <caption>Hospital comparison</caption>
        <thead>
          <tr>
            <th scope="col">Hospital</th>
            <th scope="col">{kpi.name} ({kpi.unit === 'ratio' ? 'percent' : kpi.unit})</th>
          </tr>
        </thead>
        <tbody>
          {sites.map((site) => {
            const item = measure(kpi, site.code, store.year, 'All');
            const name = HOSPITALS.find((hospital) => hospital.code === site.code);
            return (
              <tr key={site.code}>
                <th scope="row">{lang === 'ar' ? name?.nameAr : name?.name}</th>
                <td>{showMeasure(item, lang, store.country)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

export function ExperiencePage() {
  const { store, lang } = useScope();
  const fact = scenarioFor(store.hospital, store.year).focus;
  return (
    <section className="gc-mast">
      <p className="gc-kicker">Patient experience</p>
      <h1>{tx(lang, 'Patient experience', 'تجربة المريض')}</h1>
      <p className="gc-lede">Satisfaction, surveys, complaints, discharge, follow-up, and service recovery for the selected hospital and year.</p>
      <Chart figure={screenCharts('experience', store.hospital, store.year, lang)[0]} />
      <Chart figure={screenCharts('experience', store.hospital, store.year, lang)[1]} />
      <p className="gc-ltr">Satisfaction index {fact.satisfaction.toFixed(1)} / 100. Responses {fact.surveysReturned.toLocaleString('en-US')} of {fact.surveysSent.toLocaleString('en-US')} surveys. Open complaints {fact.complaintsOpened.toLocaleString('en-US')}.</p>
      <div className="gc-cases">
        {store.cases.map((item) => (
          <article className="gc-card" key={item.id}>
            <h2>{item.id} · {item.status}</h2>
            <p>{item.title}</p>
            <p>{item.detail}</p>
            <button type="button" className="gc-btn quiet" onClick={() => store.advanceCase(item.id)}>Advance</button>
          </article>
        ))}
      </div>
      <Link to="/story/patient-experience">Open the full experience story</Link>
    </section>
  );
}

export function IntelligencePage() {
  const { store, lang } = useScope();
  const [question, setQuestion] = useState(promptForPath('/intelligence'));
  const answer = answerQuestion(question, store.hospital, store.year, store.department, lang);
  const [page, setPage] = useState(0);
  const size = 8;
  const slice = USE_CASES.slice(page * size, page * size + size);
  return (
    <section className="gc-mast">
      <p className="gc-kicker">AI decision intelligence</p>
      <h1>Decision support, reviewed by a person</h1>
      <p className="gc-lede">{USE_CASES.length} decision patterns are available in this workspace. Each one is an estimate for review. No external model is called.</p>
      <form onSubmit={(event) => event.preventDefault()}>
        <label className="gc-field">
          Question
          <input value={question} onChange={(event) => setQuestion(event.target.value)} />
        </label>
        <div className="gc-inline">
          {['Why is emergency waiting time increasing?', 'Where are claim denials increasing?', 'Which hospital has the greatest capacity pressure?'].map((prompt) => (
            <button key={prompt} type="button" className="gc-btn quiet" onClick={() => setQuestion(prompt)}>{prompt}</button>
          ))}
        </div>
      </form>
      <article className="gc-panel">
        <h2>{answer.title}</h2>
        <p>{answer.observation}</p>
        <p>{answer.evidence}</p>
        <p>{answer.explanation}</p>
        <p>{answer.action}</p>
        <p>{answer.role}</p>
        <p>{answer.benefit}</p>
        <p>{answer.approval}</p>
        <p>{answer.outcome}</p>
      </article>
      <div className="gc-library">
        {slice.map((item) => (
          <article className="gc-card" key={item.key}>
            <p className="gc-kicker">{item.status}</p>
            <h2>{item.name}</h2>
            <p>{item.objective}</p>
            <p>Review: {item.review}</p>
          </article>
        ))}
      </div>
      <div className="gc-pager">
        <button type="button" className="gc-btn quiet" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Previous cases</button>
        <button type="button" className="gc-btn quiet" disabled={(page + 1) * size >= USE_CASES.length} onClick={() => setPage((value) => value + 1)}>Next cases</button>
      </div>
    </section>
  );
}

export function ExplorerPage() {
  const { store, lang } = useScope();
  const [params] = useSearchParams();
  const screenId = params.get('screen') ?? '';
  const screen = findScreen(screenId);
  const [text, setText] = useState('');
  const [domain, setDomain] = useState(screen?.domains[0] ?? 'all');
  const [origin, setOrigin] = useState('all');
  const [page, setPage] = useState(0);
  const domains = useMemo(() => ['all', ...new Set(KPIS.map((item) => item.domain))], []);
  const filtered = KPIS.filter((kpi) => {
    const blob = `${kpi.name} ${kpi.key} ${kpi.domain}`.toLowerCase();
    if (text && !blob.includes(text.toLowerCase())) return false;
    if (domain !== 'all' && kpi.domain !== domain) return false;
    if (origin !== 'all' && kpi.origin !== origin) return false;
    if (screen && !screen.domains.includes(kpi.domain)) return false;
    return true;
  });
  const size = 12;
  const slice = filtered.slice(page * size, page * size + size);
  return (
    <section className="gc-mast">
      <p className="gc-kicker">KPI explorer</p>
      <h1>Performance indicators</h1>
      <p className="gc-lede">392 measures for this hospital group. Open a measure for its current value. Calculation detail sits under methodology when it was supplied.</p>
      <div className="gc-scope">
        <label>Search<input className="gc-search" value={text} onChange={(event) => { setText(event.target.value); setPage(0); }} /></label>
        <label>Domain
          <select value={domain} onChange={(event) => { setDomain(event.target.value); setPage(0); }}>
            {domains.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label>Source
          <select value={origin} onChange={(event) => { setOrigin(event.target.value); setPage(0); }}>
            <option value="all">All sources</option>
            <option value="catalog">Measure library</option>
            <option value="registry">Named measure</option>
            <option value="demo_assumption">Working figure</option>
          </select>
        </label>
      </div>
      <p>{filtered.length} matching definitions. Page {page + 1}.</p>
      <div className="gc-library">
        {slice.map((kpi) => {
          const item = measure(kpi, store.hospital, store.year, store.department);
          return (
            <article className="gc-card" key={kpi.key}>
              <p className="gc-kicker">{originLabel(kpi.origin, lang)}</p>
              <h2>{kpiName(kpi.name, lang)}</h2>
              <p className="gc-figure gc-ltr">{showMeasure(item, lang, store.country)}</p>
              <details>
                <summary>Methodology</summary>
                <p>{formulaText(kpi)}</p>
              </details>
              <Link to={`/kpis/${kpi.key}`}>Open decision review</Link>
            </article>
          );
        })}
      </div>
      <div className="gc-pager">
        <button type="button" className="gc-btn quiet" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Previous</button>
        <button type="button" className="gc-btn quiet" disabled={(page + 1) * size >= filtered.length} onClick={() => setPage((value) => value + 1)}>Next</button>
      </div>
    </section>
  );
}

const STAGES = ['KPI', 'Detection', 'Root cause', 'Prediction', 'AI action', 'Approval', 'Outcome'];

export function LifecyclePage() {
  const { metricKey = '' } = useParams();
  const { store, lang } = useScope();
  const [stage, setStage] = useState(0);
  const kpi = findKpi(metricKey);
  if (!kpi) return <p>This KPI is not in the library.</p>;
  const item = measure(kpi, store.hospital, store.year, store.department);
  const scope = decisionKey(kpi.key, store.hospital, store.year, store.department);
  const decision = store.approvals[scope];
  const reviewer = store.approvalPolicy === 'committee' ? 'A review committee' : 'A named operational lead';
  return (
    <article className="gc-story">
      <p className="gc-kicker">{originLabel(kpi.origin, lang)} · {kpi.domain}</p>
      <h1>{kpiName(kpi.name, lang)}</h1>
      {needsCohortReview(kpi) ? <p>This signal stays at cohort level. It is not given an individual patient prediction.</p> : null}
      <div className="gc-tabs" role="tablist">
        {STAGES.map((name, index) => (
          <button key={name} type="button" role="tab" aria-selected={stage === index} onClick={() => setStage(index)}>{index + 1}. {name}</button>
        ))}
      </div>
      {stage === 0 ? (
        <section>
          <p className="gc-figure gc-ltr">{showMeasure(item, lang, store.country)}</p>
          <p>{item.note}</p>
          <p>{formulaText(kpi)}</p>
          <p>Unit: {kpi.unit}. Source: {kpi.source}</p>
        </section>
      ) : null}
      {stage === 1 ? <p>What changed: <span className="gc-ltr">{formatDelta(item, lang)}</span>. Detection compares this hospital and year with the prior year in the same scenario.</p> : null}
      {stage === 2 ? <p>Possible factors are hypotheses, not proven causes. {item.note}</p> : null}
      {stage === 3 ? <p>Not a validated model. The illustration suggests watching whether the next period moves back toward the prior year. It is not a clinical prediction.</p> : null}
      {stage === 4 ? <p>AI action: {reviewer} could review this measure with the neighboring operational story. No individual patient order is created.</p> : null}
      {stage === 5 ? (
        <section>
          <p>Reviewer for this preview: {reviewer}. Approval is hypothetical and stored only in this browser for this KPI, hospital, year, and department.</p>
          <div className="gc-actions">
            <button type="button" className="gc-btn primary" onClick={() => store.decide(scope, 'approved')}>Approve simulated action</button>
            <button type="button" className="gc-btn" onClick={() => store.decide(scope, 'rejected')}>Reject simulated action</button>
          </div>
          {decision ? <p>Recorded: {decision}</p> : null}
        </section>
      ) : null}
      {stage === 6 ? (
        <section>
          {decision === 'approved' ? <p>Illustrative outcome after the demo approval. This is not a measured hospital result. The story shows the measure easing by about 7% of the gap to the prior year, as a labelled illustration.</p> : null}
          {decision === 'rejected' ? <p>No illustrative outcome is shown after a rejection.</p> : null}
          {!decision ? <p>Record an approval or rejection before an outcome can be shown.</p> : null}
        </section>
      ) : null}
      <Chart figure={screenCharts('command', store.hospital, store.year, lang)[0]} />
    </article>
  );
}

export function SettingsPage() {
  const { store, country, lang } = useScope();
  const occupancy = measure(findKpi('kpi_bed_occupancy_rate')!, store.hospital, store.year, 'All');
  return (
    <section className="gc-mast">
      <p className="gc-kicker">Platform settings</p>
      <h1>Global Core, country, and hospital profile</h1>
      <p className="gc-lede">These previews illustrate configuration. They do not claim official regulatory alignment, and they do not replace the shared scenario.</p>
      <div className="gc-scope">
        <label>Country
          <select aria-label="Country" value={store.country} onChange={(event) => store.setCountry(event.target.value)}>
            {COUNTRIES.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label>Facility type
          <select aria-label="Facility type" value={store.facility} onChange={(event) => store.setFacility(event.target.value)}>
            {['General hospital', 'Specialty hospital', 'Ambulatory center'].map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label>Approval policy
          <select aria-label="Approval policy" value={store.approvalPolicy} onChange={(event) => store.setApprovalPolicy(event.target.value as 'lead' | 'committee')}>
            <option value="lead">Named lead</option>
            <option value="committee">Review committee</option>
          </select>
        </label>
      </div>
      <article className="gc-panel">
        <h2>{country.name}</h2>
        <p>Interface language stays English. Time zone: {country.tz}. Reporting currency remains SAR. Occupancy review line for this profile: {country.occupancyTarget}%.</p>
        <p>Country selection changes the review line, time zone, and approval context. It does not translate the application and it does not convert money with an exchange rate.</p>
        <p>Scenario occupancy is {formatMeasure(occupancy, lang)}.</p>
        <p>Departments in view: {DEPARTMENTS.filter((item) => item !== 'All').map((item) => deptLabel(item, lang)).join(', ')}.</p>
      </article>
    </section>
  );
}

export function LibraryPage() {
  const { lang } = useScope();
  const [text, setText] = useState('');
  const screens = allScreens().filter((item) => `${item.title} ${item.titleAr} ${item.decision}`.toLowerCase().includes(text.toLowerCase()));
  return (
    <section className="gc-mast">
      <p className="gc-kicker">Full screen library</p>
      <h1>39 screens and 14 extensions</h1>
      <p className="gc-lede">The library keeps every original screen. It is not the front door.</p>
      <label className="gc-field">Search screens
        <input className="gc-search" value={text} onChange={(event) => setText(event.target.value)} />
      </label>
      <div className="gc-library">
        {screens.map((item) => (
          <article className="gc-card" key={item.id}>
            <p className="gc-kicker">{item.group}</p>
            <h2>{lang === 'ar' ? item.titleAr : item.title}</h2>
            <p>{item.decision}</p>
            <Link to={`/story/${item.id}`}>Open</Link>
          </article>
        ))}
      </div>
    </section>
  );
}

export function PresentPage() {
  const [step, setStep] = useState(0);
  const slide = PRESENTATION[step];
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') setStep((value) => Math.min(PRESENTATION.length - 1, value + 1));
      if (event.key === 'ArrowLeft') setStep((value) => Math.max(0, value - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <section className="gc-present" aria-label="Presentation">
      <p className="gc-kicker">Presentation {step + 1} / {PRESENTATION.length}</p>
      <h1>{slide.title}</h1>
      <p className="gc-lede">{slide.body}</p>
      <div className="gc-progress" aria-hidden="true"><span style={{ width: `${((step + 1) / PRESENTATION.length) * 100}%` }} /></div>
      <div className="gc-actions">
        <button type="button" className="gc-btn" onClick={() => setStep((value) => Math.max(0, value - 1))}>Back</button>
        <button type="button" className="gc-btn primary" onClick={() => setStep((value) => Math.min(PRESENTATION.length - 1, value + 1))}>Next</button>
        <Link className="gc-btn quiet" to={slide.href}>Explore this part</Link>
        <Link className="gc-btn quiet" to="/">Exit presentation</Link>
      </div>
      <p>{DISCLAIMER}</p>
    </section>
  );
}
