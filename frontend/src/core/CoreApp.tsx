import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { DISCLAIMER, HOSPITALS, YEARS } from '@/showcase/engine';
import { ShowcaseState, useShowcase } from '@/showcase/state';
import { CopilotButton, CopilotPanel, CopilotState, useCopilot } from './Copilot';
import { PERIODS, PeriodContext, type ReportPeriod } from './period';
import './core.css';

const NAV = [
  { to: '/', label: 'Overview', end: true },
  { to: '/emergency/flow', label: 'Patient Flow & Waiting', end: false },
  { to: '/emergency/capacity-quality', label: 'Capacity & Quality', end: false },
  { to: '/emergency/ai-decisions', label: 'AI Decisions', end: false },
];

function Shell() {
  const store = useShowcase();
  const copilot = useCopilot();
  const location = useLocation();
  const [menu, setMenu] = useState(false);
  const [period, setPeriod] = useState<ReportPeriod>('year');

  useEffect(() => {
    if (store.department !== 'All') store.setDepartment('All');
  }, [store.department, store.setDepartment]);

  useEffect(() => {
    setMenu(false);
    copilot.clearChart();
    try {
      if (!/jsdom/i.test(window.navigator.userAgent)) window.scrollTo(0, 0);
    } catch {
      /* ignore */
    }
  }, [location.pathname, copilot.clearChart]);

  return (
    <PeriodContext.Provider value={{ period, setPeriod }}>
      <div className="gc-shell" dir="ltr">
        <div className="gc-frame" data-nav="open" data-copilot={copilot.open ? 'open' : 'closed'}>
          <aside className={`gc-side ${menu ? 'open' : ''}`}>
            <div className="gc-side-brand">
              <Link to="/">
                <span>DataVital</span>
                <strong>AI</strong>
              </Link>
            </div>
            <nav className="gc-nav" aria-label="Primary">
              {NAV.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} title={item.label}>
                  <NavGlyph label={item.label} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </aside>
          <div className="gc-workspace">
            <header className="gc-top">
              <button type="button" className="gc-menu gc-btn quiet" aria-expanded={menu} onClick={() => setMenu((value) => !value)}>
                Menu
              </button>
              <div className="gc-scope">
                <label>
                  Hospital
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
                  Period
                  <select aria-label="Period" value={period} onChange={(event) => setPeriod(event.target.value as ReportPeriod)}>
                    {PERIODS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                  </select>
                </label>
              </div>
              <div className="gc-inline">
                <button type="button" className="gc-btn quiet" onClick={() => { store.reset(); setPeriod('year'); }}>Reset view</button>
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
    </PeriodContext.Provider>
  );
}

function NavGlyph({ label }: { label: string }) {
  const path = label.startsWith('Overview') ? 'M4 10.5 12 4l8 6.5V20H4z'
    : label.startsWith('Patient') ? 'M4 16c2-4 14-4 16 0M8 8a4 4 0 1 0 8 0 4 4 0 0 0-8 0'
    : label.startsWith('Capacity') ? 'M4 16h4V8H4zm6 0h4V4h-4zm6 0h4v-6h-4z'
    : 'M12 3l1.8 4.7L18 9.5l-4.2 1.8L12 16l-1.8-4.7L6 9.5l4.2-1.8z';
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
