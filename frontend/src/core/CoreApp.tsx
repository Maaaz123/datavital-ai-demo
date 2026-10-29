import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { UI } from '@/showcase/catalog';
import { deptLabel } from '@/showcase/copy';
import { DEPARTMENTS, DISCLAIMER, HOSPITALS, YEARS } from '@/showcase/engine';
import { ShowcaseState, useShowcase } from '@/showcase/state';
import { CopilotButton, CopilotPanel, CopilotState, useCopilot } from './Copilot';
import { AREAS, allScreens, findScreen } from './stories';
import './core.css';

function Shell() {
  const store = useShowcase();
  const copilot = useCopilot();
  const lang = store.lang;
  const copy = UI[lang];
  const location = useLocation();
  const [menu, setMenu] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [group, setGroup] = useState<string | null>(null);
  const [finder, setFinder] = useState('');
  const presenting = location.pathname === '/present';

  useEffect(() => {
    setMenu(false);
    copilot.clearChart();
    const match = location.pathname.match(/^\/(?:story|board)\/([^/]+)/);
    if (match) {
      const domain = match[1];
      const screenId = location.pathname.startsWith('/board/')
        ? domain === 'rcm' ? 'claims' : domain
        : domain;
      const area = AREAS.find((item) => item.screens.includes(screenId));
      if (area) setGroup(area.id);
    }
    if (location.pathname === '/intelligence') setGroup('ai');
    if (location.pathname === '/settings') setGroup('admin');
    try {
      if (!/jsdom/i.test(window.navigator.userAgent)) window.scrollTo(0, 0);
    } catch {
      /* ignore */
    }
  }, [location.pathname, copilot.clearChart]);

  if (presenting) return <Outlet />;

  return (
    <div className="gc-shell" dir="ltr">
      <div className="gc-frame" data-nav={collapsed ? 'closed' : 'open'} data-copilot={copilot.open ? 'open' : 'closed'}>
        <aside className={`gc-side ${menu ? 'open' : ''}`}>
          <div className="gc-side-brand">
            <Link to="/">
              <span>DataVital</span>
              <strong>Global Core</strong>
            </Link>
            <button type="button" className="gc-btn quiet" onClick={() => setCollapsed((value) => !value)}>
              {collapsed ? 'Expand' : 'Collapse'}
            </button>
          </div>
          <nav className="gc-nav" aria-label="Primary">
            <label className="gc-finder">
              Find a workspace
              <input aria-label="Find a workspace" value={finder} onChange={(event) => setFinder(event.target.value)} />
            </label>
            {finder.trim() ? allScreens().filter((item) => item.title.toLowerCase().includes(finder.trim().toLowerCase())).slice(0, 8).map((item) => (
              <NavLink key={item.id} to={`/story/${item.id}`} title={item.title}><NavGlyph kind="screen" /><span>{item.title}</span></NavLink>
            )) : null}
            <NavLink to="/" end title="Command Center"><NavGlyph kind="home" /><span>Command Center</span></NavLink>
            {AREAS.map((area) => (
              <div key={area.id}>
                <button type="button" title={area.title} aria-expanded={group === area.id} onClick={() => setGroup((value) => (value === area.id ? null : area.id))}>
                  <NavGlyph kind={area.id} /><span>{area.title}</span>
                </button>
                {group === area.id ? area.screens.map((id) => {
                  const screen = findScreen(id);
                  return <NavLink key={id} to={`/story/${id}`} title={screen?.title}><NavGlyph kind="screen" /><span>{screen?.title}</span></NavLink>;
                }) : null}
              </div>
            ))}
            <NavLink to="/story/comparison" title="Hospital comparison"><NavGlyph kind="compare" /><span>Hospital comparison</span></NavLink>
            <NavLink to="/experience" title="Patient experience"><NavGlyph kind="experience" /><span>{copy.experience}</span></NavLink>
            <NavLink to="/intelligence" title="AI decisions"><NavGlyph kind="ai" /><span>AI decisions</span></NavLink>
            <NavLink to="/story/actions" title="Management actions"><NavGlyph kind="actions" /><span>Management actions</span></NavLink>
            <NavLink to="/kpis" title="Performance indicators"><NavGlyph kind="kpi" /><span>Performance indicators</span></NavLink>
            <NavLink to="/library" title="All workspaces"><NavGlyph kind="library" /><span>All workspaces</span></NavLink>
            <NavLink to="/settings" title="Administration"><NavGlyph kind="admin" /><span>Administration</span></NavLink>
            <NavLink to="/present" title="Executive briefing"><NavGlyph kind="brief" /><span>Executive briefing</span></NavLink>
          </nav>
        </aside>
        <div className="gc-workspace">
          <header className="gc-top">
            <button type="button" className="gc-menu gc-btn quiet" aria-expanded={menu} onClick={() => setMenu((value) => !value)}>
              Menu
            </button>
            <div className="gc-scope">
              <label>
                {copy.hospital}
                <select aria-label="Hospital" value={store.hospital} onChange={(event) => store.setHospital(event.target.value)}>
                  {HOSPITALS.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
                </select>
              </label>
              <label>
                Reporting year
                <select aria-label="Year" value={store.year} onChange={(event) => store.setYear(Number(event.target.value))}>
                  {YEARS.map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
              </label>
              <label>
                Service
                <select aria-label="Department" value={store.department} onChange={(event) => store.setDepartment(event.target.value)}>
                  {DEPARTMENTS.map((item) => <option key={item} value={item}>{deptLabel(item, lang)}</option>)}
                </select>
              </label>
            </div>
            <div className="gc-inline">
              <button type="button" className="gc-btn quiet" onClick={store.reset}>{copy.reset}</button>
              <CopilotButton />
            </div>
          </header>
          <p className="gc-banner" role="status">{DISCLAIMER}</p>
          <main className="gc-main">
            <Outlet />
          </main>
        </div>
        <CopilotPanel />
      </div>
    </div>
  );
}

function NavGlyph({ kind }: { kind: string }) {
  const path = kind === 'home' ? 'M4 10.5 12 4l8 6.5V20H4z'
    : kind === 'compare' ? 'M4 16h4V8H4zm6 0h4V4h-4zm6 0h4v-6h-4z'
    : kind === 'ai' ? 'M12 3l1.8 4.7L18 9.5l-4.2 1.8L12 16l-1.8-4.7L6 9.5l4.2-1.8z'
    : kind === 'admin' ? 'M12 8a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm8 4-1.6.7.2 1.7-1.5 1-1.4-.9-1.5.4-.6 1.6-1.7-.4-.8 1.5h-1.8l-.8-1.5-1.7.4-.6-1.6-1.5-.4-1.4.9-1.5-1 .2-1.7L4 12l1.6-.7-.2-1.7 1.5-1 1.4.9 1.5-.4.6-1.6 1.7.4.8-1.5h1.8l.8 1.5 1.7-.4.6 1.6 1.5.4 1.4-.9 1.5 1-.2 1.7z'
    : 'M5 5h14v4H5zm0 6h14v8H5z';
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export default function CoreApp() {
  return (
    <ShowcaseState>
      <CopilotState>
        <Shell />
      </CopilotState>
    </ShowcaseState>
  );
}
