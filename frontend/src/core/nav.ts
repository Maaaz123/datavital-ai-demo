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
  glyph: 'home' | 'flow' | 'quality' | 'beds' | 'assign' | 'plan';
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
        purpose: 'Visits, wait, and boarding at a glance',
        end: true,
        glyph: 'home',
      },
      {
        to: '/emergency/flow',
        short: 'Waiting',
        title: 'Waiting & Patient Flow',
        purpose: 'How long patients wait and how they move',
        glyph: 'flow',
      },
      {
        to: '/emergency/quality',
        short: 'Safety',
        title: 'Safety & Return Visits',
        purpose: 'Returns, walkaways, and emergency deaths',
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
        purpose: 'Ready, occupied, vacant, and blocked beds',
        glyph: 'beds',
      },
      {
        to: '/beds/placement',
        short: 'Assign',
        title: 'Bed Assignment',
        purpose: 'Requests, assignment speed, and turnover',
        glyph: 'assign',
      },
      {
        to: '/beds/capacity',
        short: 'Outlook',
        title: 'Bed Capacity Outlook',
        purpose: 'Shortfall risk and next-day bed sketch',
        glyph: 'plan',
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
  if (kind === 'home' || kind === 'beds') return 'M4 10.5 12 4l8 6.5V20H4z';
  if (kind === 'flow') return 'M4 16c2-4 14-4 16 0M8 8a4 4 0 1 0 8 0 4 4 0 0 0-8 0';
  if (kind === 'assign') return 'M4 7h16M4 12h10M4 17h14';
  return 'M5 19V5h10l4 4v10H5zm8-14v4h4';
}
