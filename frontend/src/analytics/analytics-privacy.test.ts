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
import { domainIdFromPath } from './domainMap';

describe('analytics config (disabled by default)', () => {
  it('stays disabled without enable flag and key', () => {
    const cfg = resolveAnalyticsConfig({});
    expect(cfg.enabled).toBe(false);
    expect(cfg.autocapture).toBe(false);
    expect(cfg.sessionRecording).toBe(false);
  });

  it('requires both enable flag and project key', () => {
    expect(resolveAnalyticsConfig({ VITE_ANALYTICS_ENABLED: 'true' }).enabled).toBe(false);
    expect(
      resolveAnalyticsConfig({
        VITE_ANALYTICS_ENABLED: 'true',
        VITE_POSTHOG_PROJECT_KEY: 'phc_test_public_key',
      }).enabled,
    ).toBe(true);
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
    expect(clean.startsWith('/enterprise-ai')).toBe(true);
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
    expect(scrubbed.interaction_type).toBe('cta');
    for (const key of FORBIDDEN_EVENT_PROPERTY_KEYS) {
      expect(Object.prototype.hasOwnProperty.call(scrubbed, key)).toBe(false);
    }
  });
});

describe('consent + capture client', () => {
  beforeEach(() => {
    clearConsent();
    clearAnalyticsLocalData();
    vi.restoreAllMocks();
  });

  it('does not capture when disabled even if consent granted', async () => {
    writeConsent('granted');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    const client = createEngagementClient({
      enabled: false,
      posthogKey: 'phc_x',
      posthogHost: 'https://us.i.posthog.com',
      inviteApiBase: null,
      persistence: 'memory',
      autocapture: false,
      sessionRecording: false,
    });
    const result = await client.capture(ENGAGEMENT_EVENTS.page_viewed, {
      path: '/enterprise-ai',
      question: 'should never send',
    });
    expect(result.skipped).toBe('analytics_disabled');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('requires consent before network capture', async () => {
    expect(mayCapture(true, 'unknown')).toBe(false);
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    const client = createEngagementClient({
      enabled: true,
      posthogKey: 'phc_x',
      posthogHost: 'https://us.i.posthog.com',
      inviteApiBase: null,
      persistence: 'memory',
      autocapture: false,
      sessionRecording: false,
    });
    await client.capture(ENGAGEMENT_EVENTS.session_started, {});
    expect(fetchSpy).not.toHaveBeenCalled();
    writeConsent('granted');
    await client.capture(ENGAGEMENT_EVENTS.session_started, { path: '/executive' });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const body = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body));
    expect(body.properties.question).toBeUndefined();
    expect(body.properties.$autocapture).toBe(false);
    expect(body.properties.$session_recording_enabled).toBe(false);
  });

  it('swallows network failures', async () => {
    writeConsent('granted');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('blocked'));
    const client = createEngagementClient({
      enabled: true,
      posthogKey: 'phc_x',
      posthogHost: 'https://us.i.posthog.com',
      inviteApiBase: null,
      persistence: 'memory',
      autocapture: false,
      sessionRecording: false,
    });
    const result = await client.capture(ENGAGEMENT_EVENTS.page_viewed, { path: '/' });
    expect(result.ok).toBe(false);
    expect(result.skipped).toBe('network_or_blocked');
  });
});

describe('event dictionary + domain map', () => {
  it('documents all engagement events', () => {
    expect(Object.keys(EVENT_DICTIONARY).length).toBeGreaterThanOrEqual(7);
    expect(EVENT_DICTIONARY[ENGAGEMENT_EVENTS.invitation_opened].forbidden).toContain('client_name');
  });

  it('maps enterprise-ai path to enterprise domain', () => {
    expect(domainIdFromPath('/enterprise-ai')).toBe('enterprise');
    expect(domainIdFromPath('/emergency')).toBe('emergency');
  });
});
