import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { UI } from '@/showcase/catalog';
import { deptLabel, tx } from '@/showcase/copy';
import { DEPARTMENTS, DISCLAIMER, HOSPITALS, YEARS } from '@/showcase/engine';
import { ShowcaseState, useShowcase } from '@/showcase/state';
import './core.css';

const NAV = [
  ['/', 'Overview', 'نظرة'],
  ['/challenge', 'Challenge', 'التحدي'],
  ['/solution', 'Solution', 'الحل'],
  ['/architecture', 'Architecture', 'البنية'],
  ['/operations', 'Operations', 'العمليات'],
  ['/intelligence', 'Intelligence', 'الذكاء'],
  ['/kpis', 'KPIs', 'المؤشرات'],
  ['/library', 'Library', 'المكتبة'],
  ['/settings', 'Settings', 'الإعدادات'],
] as const;

function Shell() {
  const store = useShowcase();
  const lang = store.lang;
  const copy = UI[lang];
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const presenting = location.pathname === '/present';

  useEffect(() => {
    setOpen(false);
    try {
      if (!/jsdom/i.test(window.navigator.userAgent)) window.scrollTo(0, 0);
    } catch {
      /* ignore */
    }
  }, [location.pathname]);

  if (presenting) return <Outlet />;

  return (
    <div className={`gc-shell ${lang === 'ar' ? 'gc-rtl' : ''}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <p className="gc-banner" role="status">{DISCLAIMER}</p>
      <header className="gc-top">
        <Link className="gc-brand" to="/">
          <span>DataVital</span>
          <strong>Global Core</strong>
        </Link>
        <button type="button" className="gc-menu gc-btn quiet" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {tx(lang, 'Menu', 'القائمة')}
        </button>
        <nav className={`gc-nav ${open ? 'open' : ''}`} aria-label="Primary">
          {NAV.map(([to, en, ar]) => (
            <NavLink key={to} to={to} end={to === '/'}>{lang === 'ar' ? ar : en}</NavLink>
          ))}
          <NavLink to="/present">{tx(lang, 'Present', 'العرض')}</NavLink>
        </nav>
      </header>
      <div className="gc-toolbar">
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
          <Link className="gc-btn quiet" to="/experience">{copy.experience}</Link>
          <button type="button" className="gc-btn quiet" onClick={store.toggleLang}>{copy.language}</button>
          <button type="button" className="gc-btn quiet" onClick={store.reset}>{copy.reset}</button>
        </div>
      </div>
      <main className="gc-main">
        <Outlet />
      </main>
      <footer className="gc-foot">
        <p>{DISCLAIMER} <Link to="/library">{tx(lang, 'Screen library', 'مكتبة الشاشات')}</Link></p>
      </footer>
    </div>
  );
}

export default function CoreApp() {
  return (
    <ShowcaseState>
      <Shell />
    </ShowcaseState>
  );
}
