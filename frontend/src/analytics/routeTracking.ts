/**
 * SPA route pageview tracking with deduplication (StrictMode / rapid history).
 */
import { DEMO_BUILD_ID } from '@/buildId';
import type { InvitationAttribution } from './events';
import { ENGAGEMENT_EVENTS } from './events';
import { captureAnalyticsEvent, capturePageleave, capturePageview } from './posthog';
import { domainIdFromPath, domainNameFromPath, screenTitleFromPath } from './domainMap';
import { sanitizeUrlForAnalytics } from './privacy';

const DEDUPE_MS = 400;
let lastPath = '';
let lastAt = 0;

export function resetRouteTrackingForTests(): void {
  lastPath = '';
  lastAt = 0;
}

export function trackRouteChange(
  pathname: string,
  search: string,
  attribution: InvitationAttribution,
  domainsSeen: Set<string>,
): void {
  const path = sanitizeUrlForAnalytics(`${pathname}${search}`);
  const now = Date.now();
  if (path === lastPath && now - lastAt < DEDUPE_MS) return;
  // Also skip identical path within same tick (StrictMode double-invoke).
  if (path === lastPath && now - lastAt < 50) return;
  lastPath = path;
  lastAt = now;

  const domain_id = domainIdFromPath(pathname);
  const domain_name = domainNameFromPath(pathname);
  const screen_title = screenTitleFromPath(pathname);

  capturePageview(path, {
    ...attribution,
    domain_id,
    domain_name,
    screen_title,
    demo_build_id: DEMO_BUILD_ID,
  });

  if (domain_id && !domainsSeen.has(domain_id)) {
    domainsSeen.add(domain_id);
    captureAnalyticsEvent(ENGAGEMENT_EVENTS.domain_viewed, {
      ...attribution,
      domain_id,
      domain_name,
      route_path: path,
      demo_build_id: DEMO_BUILD_ID,
    });
  }
}

export function trackRouteLeave(pathname: string, search: string, attribution: InvitationAttribution): void {
  const path = sanitizeUrlForAnalytics(`${pathname}${search}`);
  capturePageleave(path, { ...attribution, demo_build_id: DEMO_BUILD_ID });
}
