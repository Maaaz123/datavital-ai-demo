/**
 * Privacy-preserving PostHog capture via HTTP (no SDK dependency).
 * Failures never throw into the demo UI.
 */

import type { AnalyticsConfig } from './config';
import { ENGAGEMENT_EVENTS, type EngagementEventName } from './events';
import { mayCapture, readConsent, type ConsentState } from './consent';
import { scrubEventProperties, sanitizeUrlForAnalytics } from './privacy';

const DISTINCT_KEY = 'datavital-analytics-distinct-v1';
const SESSION_KEY = 'datavital-analytics-session-v1';
const VISIT_COUNT_KEY = 'datavital-analytics-visit-count-v1';

export type CaptureResult = { ok: boolean; skipped?: string; status?: number };

function randomId(prefix: string): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return `${prefix}_${Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

export function getOrCreateDistinctId(persistence: AnalyticsConfig['persistence']): string {
  if (persistence === 'memory') return randomId('anon');
  try {
    const existing = localStorage.getItem(DISTINCT_KEY);
    if (existing) return existing;
    const id = randomId('anon');
    localStorage.setItem(DISTINCT_KEY, id);
    return id;
  } catch {
    return randomId('anon');
  }
}

export function getOrCreateSessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = randomId('sess');
    sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return randomId('sess');
  }
}

export function bumpVisitCount(): number {
  try {
    const n = Number(localStorage.getItem(VISIT_COUNT_KEY) ?? '0');
    const next = Number.isFinite(n) ? n + 1 : 1;
    localStorage.setItem(VISIT_COUNT_KEY, String(next));
    return next;
  } catch {
    return 1;
  }
}

export function clearAnalyticsLocalData(): void {
  try {
    localStorage.removeItem(DISTINCT_KEY);
    localStorage.removeItem(VISIT_COUNT_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export type EngagementClient = {
  config: AnalyticsConfig;
  capture: (event: EngagementEventName, properties?: Record<string, unknown>) => Promise<CaptureResult>;
  isActive: () => boolean;
};

/**
 * Create a capture client. When disabled or consent denied, all captures no-op successfully for the UI.
 * Does not load posthog-js — uses PostHog's public /i/v0/e/ (or /capture/) HTTP endpoint only when enabled.
 */
export function createEngagementClient(config: AnalyticsConfig): EngagementClient {
  const capture = async (
    event: EngagementEventName,
    properties?: Record<string, unknown>,
  ): Promise<CaptureResult> => {
    const consent: ConsentState = readConsent();
    if (!config.enabled) return { ok: true, skipped: 'analytics_disabled' };
    if (!mayCapture(config.enabled, consent)) return { ok: true, skipped: 'consent_required' };
    if (!config.posthogKey) return { ok: true, skipped: 'missing_project_key' };

    const scrubbed = scrubEventProperties(properties);
    const path = typeof scrubbed.path === 'string'
      ? scrubbed.path
      : sanitizeUrlForAnalytics(typeof window !== 'undefined' ? window.location.href : '/');

    const payload = {
      api_key: config.posthogKey,
      event,
      distinct_id: getOrCreateDistinctId(config.persistence),
      properties: {
        ...scrubbed,
        path,
        session_id: getOrCreateSessionId(),
        $autocapture: false,
        $session_recording_enabled: false,
        // Disable PostHog session recording / person profiles enrichment from client flags
        $set_once: { demo_product: 'datavital_ai' },
      },
      timestamp: new Date().toISOString(),
    };

    try {
      const endpoint = `${config.posthogHost}/i/v0/e/`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
        credentials: 'omit',
        mode: 'cors',
      });
      if (!res.ok) return { ok: false, status: res.status };
      return { ok: true, status: res.status };
    } catch {
      // Ad blockers / offline — never break the demo
      return { ok: false, skipped: 'network_or_blocked' };
    }
  };

  return {
    config,
    capture,
    isActive: () => mayCapture(config.enabled, readConsent()),
  };
}

export { ENGAGEMENT_EVENTS };
