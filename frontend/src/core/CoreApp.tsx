import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { DISCLAIMER, HOSPITALS, YEARS } from '@/showcase/engine';
import { ShowcaseState, useShowcase } from '@/showcase/state';
import { CopilotButton, CopilotPanel, CopilotState, useCopilot } from './Copilot';
import { glyphPath, NAV_DOMAINS, screenForPath, type NavScreen } from './nav';
import { PERIODS, PeriodContext, type ReportPeriod } from './period';
import './core.css';

function Shell() {
  const store = useShowcase();
  const copilot = useCopilot();
  const location = useLocation();
  const [menu, setMenu] = useState(false);
  const [navWide, setNavWide] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [period, setPeriod] = useState<ReportPeriod>('year');
  const [query, setQuery] = useState('');
  const current = screenForPath(location.pathname);
  const [openDomains, setOpenDomains] = useState<Record<string, boolean>>(() => (
    Object.fromEntries(NAV_DOMAINS.map((domain) => [domain.id, domain.match(location.pathname)]))
  ));
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
    setOpenDomains((prev) => {
      const next = { ...prev };
      for (const domain of NAV_DOMAINS) {
        if (domain.match(location.pathname)) next[domain.id] = true;
      }
      return next;
    });
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

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return NAV_DOMAINS;
    return NAV_DOMAINS
      .map((domain) => ({
        ...domain,
        screens: domain.screens.filter((screen) => (
          screen.title.toLowerCase().includes(needle)
          || screen.short.toLowerCase().includes(needle)
          || screen.purpose.toLowerCase().includes(needle)
          || domain.label.toLowerCase().includes(needle)
        )),
      }))
      .filter((domain) => domain.screens.length > 0);
  }, [query]);

  const screenCount = NAV_DOMAINS.reduce((sum, domain) => sum + domain.screens.length, 0);

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

            <label className="gc-nav-find">
              <span className="gc-sr-only">Find a screen</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find a screen"
                aria-label="Find a screen"
              />
            </label>
            <p className="gc-nav-count">{screenCount} screens · {NAV_DOMAINS.length} domains</p>

            <nav className="gc-nav" aria-label="Primary">
              {filtered.map((domain) => {
                const open = Boolean(query) || openDomains[domain.id];
                const active = domain.match(location.pathname);
                return (
                  <div key={domain.id} className={`gc-nav-domain ${active ? 'is-active' : ''} ${open ? 'is-open' : ''}`}>
                    <button
                      type="button"
                      className="gc-nav-domain-btn"
                      aria-expanded={open}
                      aria-label={`${domain.label} domain`}
                      title={domain.label}
                      onClick={() => setOpenDomains((prev) => ({ ...prev, [domain.id]: !prev[domain.id] }))}
                    >
                      <span className="gc-nav-domain-mark" aria-hidden="true">{domain.mark}</span>
                      <span className="gc-nav-domain-copy">
                        <strong>{domain.label}</strong>
                        <em>{domain.screens.length} screens</em>
                      </span>
                      <span className="gc-nav-domain-caret" aria-hidden="true">{open ? '▾' : '▸'}</span>
                    </button>
                    {open ? (
                      <div className="gc-nav-screens">
                        {domain.screens.map((screen) => (
                          <NavLink key={screen.to} to={screen.to} end={screen.end} title={screen.title}>
                            <NavGlyph screen={screen} />
                            <span className="gc-nav-label">
                              <strong>{screen.short}</strong>
                              <em>{screen.title}</em>
                            </span>
                          </NavLink>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
              {filtered.length === 0 ? <p className="gc-nav-empty">No screen matches “{query}”.</p> : null}
            </nav>
          </aside>
          <div className="gc-workspace">
            <header className="gc-top">
              <button type="button" className="gc-menu gc-btn quiet" aria-expanded={menu} onClick={() => setMenu((value) => !value)}>
                Menu
              </button>
              {current ? (
                <p className="gc-crumb" aria-label="Current screen">
                  <span>{current.domain.label}</span>
                  <i>/</i>
                  <strong>{current.screen.title}</strong>
                </p>
              ) : null}
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

function NavGlyph({ screen }: { screen: NavScreen }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={glyphPath(screen.glyph)} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
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
