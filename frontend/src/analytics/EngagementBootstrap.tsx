/**
 * Consent-gated engagement bootstrap. Consent banner is the only visible chrome.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { bumpVisitCount, getOrCreateSessionId } from './client';
import { resolveAnalyticsConfig } from './config';
import { ConsentBanner } from './ConsentBanner';
import { mayCapture, readConsent, type ConsentState } from './consent';
import { ENGAGEMENT_EVENTS } from './events';
import { captureInviteFromLocation } from './invite';
import { captureAnalyticsEvent, initPosthog } from './posthog';
import { sanitizeUrlForAnalytics } from './privacy';
import { trackRouteChange } from './routeTracking';

const ACTIVITY_THROTTLE_MS = 60_000;

export function EngagementBootstrap() {
  const location = useLocation();
  const config = resolveAnalyticsConfig();
  const [consent, setConsent] = useState<ConsentState>(() => readConsent());
  const attrRef = useRef({
    invite_id: null as string | null,
    invite_verified: false,
    identity_verified: false as const,
  });
  const domainsSeen = useRef(new Set<string>());
  const sessionBooted = useRef(false);
  const inviteOpened = useRef(false);
  const lastActivityAt = useRef(0);
  const pendingInviteRaw = useRef<string | null>(null);

  const bootSession = useCallback(() => {
    if (!mayCapture(config.enabled, readConsent())) return;
    initPosthog(config);

    const visits = bumpVisitCount();
    if (visits > 1) {
      captureAnalyticsEvent(ENGAGEMENT_EVENTS.return_visit, {
        ...attrRef.current,
        prior_session_count: visits - 1,
      });
    }

    if (pendingInviteRaw.current && !inviteOpened.current) {
      inviteOpened.current = true;
      captureAnalyticsEvent(ENGAGEMENT_EVENTS.invitation_opened, {
        ...attrRef.current,
        path: sanitizeUrlForAnalytics(window.location.href),
      });
    }

    if (!sessionBooted.current) {
      sessionBooted.current = true;
      captureAnalyticsEvent(ENGAGEMENT_EVENTS.session_started, {
        ...attrRef.current,
        session_id: getOrCreateSessionId(),
      });
    }

    trackRouteChange(location.pathname, location.search, attrRef.current, domainsSeen.current);
  }, [config, location.pathname, location.search]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const captured = await captureInviteFromLocation({
        inviteApiBase: config.inviteApiBase,
      });
      if (cancelled) return;
      attrRef.current = captured.attribution;
      pendingInviteRaw.current = captured.rawToken;
      if (mayCapture(config.enabled, readConsent())) {
        bootSession();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bootSession, config.inviteApiBase, config.enabled]);

  useEffect(() => {
    if (!mayCapture(config.enabled, consent)) return;
    trackRouteChange(location.pathname, location.search, attrRef.current, domainsSeen.current);
  }, [location.pathname, location.search, consent, config.enabled]);

  useEffect(() => {
    const onActivity = () => {
      const now = Date.now();
      if (now - lastActivityAt.current < ACTIVITY_THROTTLE_MS) return;
      lastActivityAt.current = now;
      if (!mayCapture(config.enabled, readConsent())) return;
      captureAnalyticsEvent(ENGAGEMENT_EVENTS.last_activity, {
        ...attrRef.current,
        path: sanitizeUrlForAnalytics(window.location.href),
      });
    };
    window.addEventListener('pointerdown', onActivity, { passive: true });
    return () => window.removeEventListener('pointerdown', onActivity);
  }, [config.enabled]);

  const onConsentChange = (state: ConsentState) => {
    setConsent(state);
    if (state === 'granted') bootSession();
  };

  return <ConsentBanner onConsentChange={onConsentChange} />;
}

export default EngagementBootstrap;
