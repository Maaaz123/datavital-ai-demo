import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { UI } from '@/showcase/catalog';
import { deptLabel, tx } from '@/showcase/copy';
import { DEPARTMENTS, DISCLAIMER, HOSPITALS, YEARS } from '@/showcase/engine';
import { ShowcaseState, useShowcase } from '@/showcase/state';
import { CopilotButton, CopilotPanel, CopilotState, useCopilot } from './Copilot';
import { AREAS, findScreen } from './stories';
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
  const presenting = location.pathname === '/present';

  useEffect(() => {
    setMenu(false);
    try {
      if (!/jsdom/i.test(window.navigator.userAgent)) window.scrollTo(0, 0);
    } catch {
      /* ignore */
    }
  }, [location.pathname]);

  if (presenting) return <Outlet />;

  return (
    <div className={`gc-shell ${lang === 'ar' ? 'gc-rtl' : ''}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
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
            <NavLink to="/" end>{tx(lang, 'Command Center', 'مركز القيادة')}</NavLink>
            {AREAS.map((area) => (
              <div key={area.id}>
                <button type="button" aria-expanded={group === area.id} onClick={() => setGroup((value) => (value === area.id ? null : area.id))}>
                  {lang === 'ar' ? area.titleAr : area.title}
                </button>
                {group === area.id ? area.screens.map((id) => {
                  const screen = findScreen(id);
                  return <NavLink key={id} to={`/story/${id}`}>{lang === 'ar' ? screen?.titleAr : screen?.title}</NavLink>;
                }) : null}
              </div>
            ))}
            <NavLink to="/experience">{copy.experience}</NavLink>
            <NavLink to="/intelligence">{tx(lang, 'Intelligence', 'الذكاء')}</NavLink>
            <NavLink to="/kpis">{tx(lang, 'KPI Library', 'المؤشرات')}</NavLink>
            <NavLink to="/library">{tx(lang, 'Explore Screens', 'الشاشات')}</NavLink>
            <NavLink to="/settings">{tx(lang, 'Settings', 'الإعدادات')}</NavLink>
            <NavLink to="/present">{tx(lang, 'Presentation', 'العرض')}</NavLink>
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
                  {HOSPITALS.map((item) => <option key={item.code} value={item.code}>{lang === 'ar' ? item.nameAr : item.name}</option>)}
                </select>
              </label>
              <label>
                {copy.year}
                <select aria-label="Year" value={store.year} onChange={(event) => store.setYear(Number(event.target.value))}>
                  {YEARS.map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
              </label>
              <label>
                {copy.department}
                <select aria-label="Department" value={store.department} onChange={(event) => store.setDepartment(event.target.value)}>
                  {DEPARTMENTS.map((item) => <option key={item} value={item}>{deptLabel(item, lang)}</option>)}
                </select>
              </label>
            </div>
            <div className="gc-inline">
              <button type="button" className="gc-btn quiet" onClick={store.toggleLang}>{copy.language}</button>
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

export default function CoreApp() {
  return (
    <ShowcaseState>
      <CopilotState>
        <Shell />
      </CopilotState>
    </ShowcaseState>
  );
}
