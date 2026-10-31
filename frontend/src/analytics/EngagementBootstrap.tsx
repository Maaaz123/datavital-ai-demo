/**
 * Silent engagement bootstrap — no visible UI chrome.
 * Safe when analytics is disabled, blocked, or offline.
 */
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { createEngagementClient } from './client';
import { resolveAnalyticsConfig } from './config';
import { mayCapture, readConsent } from './consent';
import { ENGAGEMENT_EVENTS } from './events';
import { captureInviteFromLocation } from './invite';
import { sanitizeUrlForAnalytics } from './privacy';
import { domainIdFromPath, screenTitleFromPath } from './domainMap';
import { bumpVisitCount } from './client';

const ACTIVITY_THROTTLE_MS = 60_000;

export function EngagementBootstrap() {
  const location = useLocation();
  const clientRef = useRef(createEngagementClient(resolveAnalyticsConfig()));
  const attrRef = useRef({ invite_id: null as string | null, invite_verified: false, identity_verified: false as const });
  const domainsSeen = useRef(new Set<string>());
  const sessionBooted = useRef(false);
  const lastActivityAt = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const config = clientRef.current.config;

    void (async () => {
      const captured = await captureInviteFromLocation({
        inviteApiBase: config.inviteApiBase,
      });
      if (cancelled) return;
      attrRef.current = captured.attribution;

      if (!mayCapture(config.enabled, readConsent())) return;

      const visits = bumpVisitCount();
      if (visits > 1) {
        void clientRef.current.capture(ENGAGEMENT_EVENTS.return_visit, {
          ...attrRef.current,
          prior_session_count: visits - 1,
        });
      }

      if (captured.rawToken) {
        void clientRef.current.capture(ENGAGEMENT_EVENTS.invitation_opened, {
          ...attrRef.current,
          path: sanitizeUrlForAnalytics(window.location.href),
          country_code: null,
        });
      }

      if (!sessionBooted.current) {
        sessionBooted.current = true;
        void clientRef.current.capture(ENGAGEMENT_EVENTS.session_started, {
          ...attrRef.current,
          country_code: null,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const config = clientRef.current.config;
    if (!mayCapture(config.enabled, readConsent())) return;

    const path = sanitizeUrlForAnalytics(
      `${location.pathname}${location.search}${location.hash}`,
    );
    const domain_id = domainIdFromPath(location.pathname);
    const screen_title = screenTitleFromPath(location.pathname);

    void clientRef.current.capture(ENGAGEMENT_EVENTS.page_viewed, {
      ...attrRef.current,
      path,
      domain_id,
      screen_title,
      country_code: null,
    });

    if (domain_id && !domainsSeen.current.has(domain_id)) {
      domainsSeen.current.add(domain_id);
      void clientRef.current.capture(ENGAGEMENT_EVENTS.domain_visited, {
        ...attrRef.current,
        domain_id,
        path,
      });
    }
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    const onActivity = () => {
      const now = Date.now();
      if (now - lastActivityAt.current < ACTIVITY_THROTTLE_MS) return;
      lastActivityAt.current = now;
      if (!mayCapture(clientRef.current.config.enabled, readConsent())) return;
      void clientRef.current.capture(ENGAGEMENT_EVENTS.last_activity, {
        ...attrRef.current,
        path: sanitizeUrlForAnalytics(window.location.href),
      });
    };
    window.addEventListener('pointerdown', onActivity, { passive: true });
    window.addEventListener('keydown', onActivity, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', onActivity);
      window.removeEventListener('keydown', onActivity);
    };
  }, []);

  return null;
}

export default EngagementBootstrap;
