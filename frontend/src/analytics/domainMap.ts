/** Map SPA path → nav domain id for coarse domain_visited events. */

import { NAV_DOMAINS } from '@/core/nav';

export function domainIdFromPath(pathname: string): string | null {
  const path = pathname || '/';
  for (const domain of NAV_DOMAINS) {
    if (domain.match(path)) return domain.id;
  }
  return null;
}

export function domainNameFromPath(pathname: string): string | null {
  const path = pathname || '/';
  for (const domain of NAV_DOMAINS) {
    if (domain.match(path)) return domain.label;
  }
  return null;
}

export function screenTitleFromPath(pathname: string): string | null {
  const path = pathname || '/';
  for (const domain of NAV_DOMAINS) {
    for (const screen of domain.screens) {
      if (screen.end ? path === screen.to : path === screen.to || path.startsWith(`${screen.to}/`)) {
        return screen.title;
      }
    }
  }
  return null;
}
