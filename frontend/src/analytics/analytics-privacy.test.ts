import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveAnalyticsConfig } from './config';
import { createEngagementClient, clearAnalyticsLocalData } from './client';
import { clearConsent, mayCapture, writeConsent } from './consent';
import { ENGAGEMENT_EVENTS, EVENT_DICTIONARY } from './events';
import {
  generateInviteToken,
  isWellFormedInviteToken,
  opaqueInviteId,
  readInviteFromSearch,
} from './invite';
import {
  FORBIDDEN_EVENT_PROPERTY_KEYS,
  sanitizeUrlForAnalytics,
  scrubEventProperties,
} from './privacy';
import { domainIdFromPath, domainNameFromPath } from './domainMap';
import { resetPosthogForTests } from './posthog';
import { resetRouteTrackingForTests, trackRouteChange } from './routeTracking';

vi.mock('./posthog', async () => {
  const actual = await vi.importActual<typeof import('./posthog')>('./posthog');
  return {
    ...actual,
    initPosthog: vi.fn(() => false),
    captureAnalyticsEvent: vi.fn(() => false),
    capturePageview: vi.fn(() => false),
    capturePageleave: vi.fn(() => false),
    isPosthogInitialized: vi.fn(() => false),
  };
});

describe('analytics config', () => {
  it('disables without project key', () => {
    const cfg = resolveAnalyticsConfig({});
    expect(cfg.enabled).toBe(false);
    expect(cfg.autocapture).toBe(false);
    expect(cfg.sessionRecording).toBe(false);
  });

  it('enables with public project key', () => {
    const cfg = resolveAnalyticsConfig({
      VITE_POSTHOG_KEY: 'phc_test_public_key',
    });
    expect(cfg.enabled).toBe(true);
    expect(cfg.posthogKey).toBe('phc_test_public_key');
  });

  it('can be explicitly disabled even with a key', () => {
    expect(
      resolveAnalyticsConfig({
        VITE_POSTHOG_KEY: 'phc_test',
        VITE_ANALYTICS_ENABLED: 'false',
      }).enabled,
    ).toBe(false);
  });
});

describe('invite tokens', () => {
  it('generates cryptographically random well-formed tokens', () => {
    const a = generateInviteToken();
    const b = generateInviteToken();
    expect(isWellFormedInviteToken(a)).toBe(true);
    expect(isWellFormedInviteToken(b)).toBe(true);
    expect(a).not.toBe(b);
  });

  it('reads invite from search and rejects short tokens', () => {
    expect(readInviteFromSearch('?invite=short')).toBeNull();
    const token = generateInviteToken();
    expect(readInviteFromSearch(`?invite=${token}&x=1`)).toBe(token);
  });

  it('opaque id is deterministic and does not equal raw token', async () => {
    const token = generateInviteToken();
    const id1 = await opaqueInviteId(token);
    const id2 = await opaqueInviteId(token);
    expect(id1).toBe(id2);
    expect(id1).not.toBe(token);
  });
});

describe('URL / property privacy', () => {
  it('strips invite and secrets from analytics URLs', () => {
    const clean = sanitizeUrlForAnalytics(
      'https://demo.datavital.io/enterprise-ai?invite=SECRETTOKEN123456789012&utm_source=email',
    );
    expect(clean).not.toMatch(/invite=/i);
    expect(clean).not.toMatch(/SECRETTOKEN/);
    expect(clean).toMatch(/utm_source=email/);
  });

  it('scrubs forbidden question / PHI properties', () => {
    const scrubbed = scrubEventProperties({
      path: '/enterprise-ai',
      question: 'Why are claims denied?',
      patient_id: 'MRN-1',
      interaction_type: 'cta',
    });
    expect(scrubbed.question).toBeUndefined();
    expect(scrubbed.patient_id).toBeUndefined();
    for (const key of FORBIDDEN_EVENT_PROPERTY_KEYS) {
      expect(Object.prototype.hasOwnProperty.call(scrubbed, key)).toBe(false);
    }
  });
});

describe('consent + capture client', () => {
  beforeEach(() => {
    clearConsent();
    clearAnalyticsLocalData();
    resetPosthogForTests();
    vi.clearAllMocks();
  });

  it('does not capture when disabled', async () => {
    writeConsent('granted');
    const client = createEngagementClient({
      enabled: false,
      posthogKey: 'phc_x',
      posthogHost: 'https://us.i.posthog.com',
      inviteApiBase: null,
      persistence: 'memory',
      autocapture: false,
      sessionRecording: false,
      projectId: null,
    });
    const result = await client.capture(ENGAGEMENT_EVENTS.session_started, {
      question: 'should never send',
    });
    expect(result.skipped).toBe('analytics_disabled');
  });

  it('requires consent before capture', async () => {
    expect(mayCapture(true, 'unknown')).toBe(false);
    const client = createEngagementClient({
      enabled: true,
      posthogKey: 'phc_x',
      posthogHost: 'https://us.i.posthog.com',
      inviteApiBase: null,
      persistence: 'memory',
      autocapture: false,
      sessionRecording: false,
      projectId: '701149',
    });
    const before = await client.capture(ENGAGEMENT_EVENTS.session_started, {});
    expect(before.skipped).toBe('consent_required');
    writeConsent('granted');
    const { captureAnalyticsEvent } = await import('./posthog');
    await client.capture(ENGAGEMENT_EVENTS.session_started, { path: '/executive' });
    expect(captureAnalyticsEvent).toHaveBeenCalled();
  });
});

describe('route tracking dedupe + domain map', () => {
  beforeEach(() => {
    resetRouteTrackingForTests();
    vi.clearAllMocks();
  });

  it('maps enterprise-ai path to Enterprise domain', () => {
    expect(domainIdFromPath('/enterprise-ai')).toBe('enterprise');
    expect(domainNameFromPath('/enterprise-ai')).toBe('Enterprise');
    expect(domainIdFromPath('/emergency')).toBe('emergency');
  });

  it('dedupes rapid identical route changes', async () => {
    const { capturePageview } = await import('./posthog');
    const seen = new Set<string>();
    const attr = { invite_id: null, invite_verified: false, identity_verified: false as const };
    trackRouteChange('/executive', '', attr, seen);
    trackRouteChange('/executive', '', attr, seen);
    expect(capturePageview).toHaveBeenCalledTimes(1);
    expect(seen.has('enterprise')).toBe(true);
  });
});

describe('event dictionary', () => {
  it('documents allowlisted events and forbids sensitive fields', () => {
    expect(EVENT_DICTIONARY.demo_invitation_opened.forbidden).toContain('client_name');
    expect(EVENT_DICTIONARY.$pageview.allowed_properties).toContain('path');
    expect(EVENT_DICTIONARY.demo_domain_viewed.dedupe).toMatch(/domainsSeen/i);
  });
});
