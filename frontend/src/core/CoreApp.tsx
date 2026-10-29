import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { UI } from '@/showcase/catalog';
import { deptLabel, tx } from '@/showcase/copy';
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
              {collapsed ? tx(lang, 'Expand', 'توسيع') : tx(lang, 'Collapse', 'طي')}
            </button>
          </div>
          <nav className="gc-nav" aria-label="Primary">
            <label className="gc-finder">
              Find a workspace
              <input aria-label="Find a workspace" value={finder} onChange={(event) => setFinder(event.target.value)} />
            </label>
            {finder.trim() ? allScreens().filter((item) => item.title.toLowerCase().includes(finder.trim().toLowerCase())).slice(0, 8).map((item) => (
              <NavLink key={item.id} to={`/story/${item.id}`} data-mark={mark(item.title)}>{item.title}</NavLink>
            )) : null}
            <NavLink to="/" end data-mark="EC">Command Center</NavLink>
            {AREAS.map((area) => (
              <div key={area.id}>
                <button type="button" data-mark={mark(area.title)} aria-expanded={group === area.id} onClick={() => setGroup((value) => (value === area.id ? null : area.id))}>
                  {area.title}
                </button>
                {group === area.id ? area.screens.map((id) => {
                  const screen = findScreen(id);
                  return <NavLink key={id} to={`/story/${id}`} data-mark={mark(screen?.title ?? id)}>{screen?.title}</NavLink>;
                }) : null}
              </div>
            ))}
            <NavLink to="/story/comparison" data-mark="HC">Hospital comparison</NavLink>
            <NavLink to="/experience" data-mark="PX">{copy.experience}</NavLink>
            <NavLink to="/intelligence" data-mark="AI">AI decisions</NavLink>
            <NavLink to="/story/actions" data-mark="MA">Management actions</NavLink>
            <NavLink to="/kpis" data-mark="PI">Performance indicators</NavLink>
            <NavLink to="/library" data-mark="ALL">All workspaces</NavLink>
            <NavLink to="/settings" data-mark="AD">Administration</NavLink>
            <NavLink to="/present" data-mark="BR">Executive briefing</NavLink>
          </nav>
        </aside>
        <div className="gc-workspace">
          <header className="gc-top">
            <button type="button" className="gc-menu gc-btn quiet" aria-expanded={menu} onClick={() => setMenu((value) => !value)}>
              {tx(lang, 'Menu', 'القائمة')}
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

function mark(title: string): string {
  return title.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase() ?? '').join('');
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
