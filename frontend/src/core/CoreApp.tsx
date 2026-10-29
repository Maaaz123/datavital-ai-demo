import { useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { DISCLAIMER, HOSPITALS, YEARS } from '@/showcase/engine';
import { ShowcaseState, useShowcase } from '@/showcase/state';
import { CopilotButton, CopilotPanel, CopilotState, useCopilot } from './Copilot';
import { PERIODS, PeriodContext, type ReportPeriod } from './period';
import './core.css';

const NAV = [
  { group: 'Emergency', to: '/', label: 'Emergency Overview', short: 'ED', end: true },
  { group: 'Emergency', to: '/emergency/flow', label: 'Patient Flow & Waiting', short: 'Flow', end: false },
  { group: 'Emergency', to: '/emergency/quality', label: 'ED Quality & Outcomes', short: 'Quality', end: false },
  { group: 'Beds', to: '/beds', label: 'Beds Overview', short: 'Beds', end: false },
  { group: 'Beds', to: '/beds/placement', label: 'Allocation & Turnover', short: 'Placement', end: false },
  { group: 'Beds', to: '/beds/capacity', label: 'Capacity Planning', short: 'Capacity', end: false },
];

function Shell() {
  const store = useShowcase();
  const copilot = useCopilot();
  const location = useLocation();
  const [menu, setMenu] = useState(false);
  const [navWide, setNavWide] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [period, setPeriod] = useState<ReportPeriod>('year');
  const filterRef = useRef<HTMLDivElement>(null);
  const filterTitle = useId();
  const hospitalName = HOSPITALS.find((item) => item.code === store.hospital)?.name ?? store.hospital;
  const periodLabel = PERIODS.find((item) => item.id === period)?.label ?? period;

  useEffect(() => {
    if (store.department !== 'All') store.setDepartment('All');
  }, [store.department, store.setDepartment]);

  useEffect(() => {
    setMenu(false);
    setFiltersOpen(false);
    copilot.clearChart();
    try {
      if (!/jsdom/i.test(window.navigator.userAgent)) window.scrollTo(0, 0);
    } catch {
      /* ignore */
    }
  }, [location.pathname, copilot.clearChart]);

  useEffect(() => {
    if (!filtersOpen) return;
    const onPointer = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) setFiltersOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFiltersOpen(false);
    };
    window.addEventListener('mousedown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [filtersOpen]);

  return (
    <PeriodContext.Provider value={{ period, setPeriod }}>
      <div className="gc-shell" dir="ltr">
        <div className="gc-frame" data-nav={navWide ? 'open' : 'rail'} data-copilot={copilot.open ? 'open' : 'closed'}>
          <aside className={`gc-side ${menu ? 'open' : ''}`}>
            <div className="gc-side-brand">
              <Link to="/" title="DataVital AI">
                <span className="gc-side-mark" aria-hidden="true">DV</span>
                <span className="gc-side-copy">
                  <span>DataVital</span>
                  <strong>AI</strong>
                </span>
              </Link>
              <button
                type="button"
                className="gc-nav-toggle"
                aria-pressed={navWide}
                aria-label={navWide ? 'Collapse navigation' : 'Expand navigation'}
                title={navWide ? 'Collapse' : 'Expand'}
                onClick={() => setNavWide((value) => !value)}
              >
                {navWide ? '‹' : '›'}
              </button>
            </div>
            <nav className="gc-nav" aria-label="Primary">
              {NAV.map((item, index) => (
                <span key={item.to} className="gc-nav-item">
                  {index === 0 || NAV[index - 1].group !== item.group ? (
                    <span className="gc-nav-group">{item.group}</span>
                  ) : null}
                  <NavLink to={item.to} end={item.end} title={item.label}>
                    <NavGlyph label={item.label} />
                    <span className="gc-nav-label">
                      <strong>{item.short}</strong>
                      <em>{item.label}</em>
                    </span>
                  </NavLink>
                </span>
              ))}
            </nav>
          </aside>
          <div className="gc-workspace">
            <header className="gc-top">
              <button type="button" className="gc-menu gc-btn quiet" aria-expanded={menu} onClick={() => setMenu((value) => !value)}>
                Menu
              </button>
              <div className="gc-filter-wrap" ref={filterRef}>
                <button
                  type="button"
                  className="gc-filter-trigger"
                  aria-expanded={filtersOpen}
                  aria-controls={filterTitle}
                  aria-label="Filters"
                  onClick={() => setFiltersOpen((value) => !value)}
                >
                  Filters
                </button>
                {filtersOpen ? (
                  <div className="gc-filter-pop" id={filterTitle} role="dialog" aria-label="Domain filters">
                    <p className="gc-filter-pop-head">
                      <strong>Filters</strong>
                      <span>{hospitalName} · {store.year} · {periodLabel}</span>
                    </p>
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
                    <button type="button" className="gc-btn quiet" onClick={() => { store.reset(); setPeriod('year'); setFiltersOpen(false); }}>Reset view</button>
                  </div>
                ) : null}
              </div>
              <div className="gc-top-actions">
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
  const path = label.startsWith('Emergency') || label.startsWith('Beds Overview') ? 'M4 10.5 12 4l8 6.5V20H4z'
    : label.startsWith('Patient') ? 'M4 16c2-4 14-4 16 0M8 8a4 4 0 1 0 8 0 4 4 0 0 0-8 0'
    : label.startsWith('Allocation') ? 'M4 7h16M4 12h10M4 17h14'
    : 'M5 19V5h10l4 4v10H5zm8-14v4h4';
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
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
