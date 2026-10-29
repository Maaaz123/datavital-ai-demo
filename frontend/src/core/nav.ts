/** Screen catalog for the public showcase. Add domains here as the library grows past 39 screens. */

export type NavScreen = {
  to: string;
  /** Short rail label */
  short: string;
  /** Business page title (H1 + nav tooltip) */
  title: string;
  /** One-line purpose for expanded nav */
  purpose: string;
  end?: boolean;
  glyph: 'home' | 'flow' | 'quality' | 'beds' | 'assign' | 'plan' | 'ipd' | 'stay' | 'outcome';
};

export type NavDomain = {
  id: string;
  /** Business domain name shown in the sidebar */
  label: string;
  /** Compact rail mark */
  mark: string;
  match: (path: string) => boolean;
  screens: NavScreen[];
};

export const NAV_DOMAINS: NavDomain[] = [
  {
    id: 'emergency',
    label: 'Emergency',
    mark: 'ED',
    match: (path) => path === '/' || path.startsWith('/emergency'),
    screens: [
      {
        to: '/',
        short: 'Snapshot',
        title: 'Emergency Snapshot',
        purpose: 'ED visits, acuity, wait, boarding, and disposition',
        end: true,
        glyph: 'home',
      },
      {
        to: '/emergency/flow',
        short: 'Waiting',
        title: 'Waiting & Patient Flow',
        purpose: 'Door-to-provider, ED length of stay, and flow',
        glyph: 'flow',
      },
      {
        to: '/emergency/quality',
        short: 'Safety',
        title: 'Safety & Return Visits',
        purpose: 'LWBS, 72-hour returns, and ED mortality',
        glyph: 'quality',
      },
    ],
  },
  {
    id: 'beds',
    label: 'Beds & Capacity',
    mark: 'Bed',
    match: (path) => path.startsWith('/beds'),
    screens: [
      {
        to: '/beds',
        short: 'Status',
        title: 'Bed Status',
        purpose: 'Operational, occupied, vacant, and blocked beds',
        end: true,
        glyph: 'beds',
      },
      {
        to: '/beds/placement',
        short: 'Assign',
        title: 'Bed Assignment',
        purpose: 'Requests, assignment time, and bed turnover',
        glyph: 'assign',
      },
      {
        to: '/beds/capacity',
        short: 'Outlook',
        title: 'Bed Capacity Outlook',
        purpose: 'Shortfall risk and next-day availability sketch',
        glyph: 'plan',
      },
    ],
  },
  {
    id: 'inpatient',
    label: 'Inpatient Care',
    mark: 'IPD',
    match: (path) => path.startsWith('/inpatient'),
    screens: [
      {
        to: '/inpatient',
        short: 'Snapshot',
        title: 'Inpatient Snapshot',
        purpose: 'Admissions, census, and admission source mix',
        end: true,
        glyph: 'ipd',
      },
      {
        to: '/inpatient/stay',
        short: 'Stay',
        title: 'Stay & Discharge',
        purpose: 'Length of stay, long stays, and delayed discharge',
        glyph: 'stay',
      },
      {
        to: '/inpatient/outcomes',
        short: 'Outcomes',
        title: 'Care Progress & Outcomes',
        purpose: 'Readmissions, mortality, and documentation gaps',
        glyph: 'outcome',
      },
    ],
  },
];

export function screenForPath(path: string): { domain: NavDomain; screen: NavScreen } | null {
  for (const domain of NAV_DOMAINS) {
    const screen = domain.screens.find((item) => {
      if (item.end) return path === item.to || path === '';
      return path === item.to || path.startsWith(`${item.to}/`);
    });
    if (screen) return { domain, screen };
  }
  const fallback = NAV_DOMAINS[0];
  return { domain: fallback, screen: fallback.screens[0] };
}

export function glyphPath(kind: NavScreen['glyph']): string {
  if (kind === 'home' || kind === 'beds' || kind === 'ipd') return 'M4 10.5 12 4l8 6.5V20H4z';
  if (kind === 'flow' || kind === 'stay') return 'M4 16c2-4 14-4 16 0M8 8a4 4 0 1 0 8 0 4 4 0 0 0-8 0';
  if (kind === 'assign') return 'M4 7h16M4 12h10M4 17h14';
  if (kind === 'outcome') return 'M12 4v16M7 9l5-5 5 5M7 15l5 5 5-5';
  return 'M5 19V5h10l4 4v10H5zm8-14v4h4';
}
