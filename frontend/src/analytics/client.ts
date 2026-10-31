/**
 * Local session helpers + thin capture facade used by tests and bootstrap.
 * Production capture goes through posthog-js (`./posthog`).
 */
import { resolveAnalyticsConfig, type AnalyticsConfig } from './config';
import { mayCapture, readConsent } from './consent';
import type { EngagementEventName } from './events';
import { captureAnalyticsEvent } from './posthog';
import { scrubEventProperties } from './privacy';

const DISTINCT_KEY = 'datavital-analytics-distinct-v1';
const SESSION_KEY = 'datavital-analytics-session-v1';
const VISIT_COUNT_KEY = 'datavital-analytics-visit-count-v1';

export type CaptureResult = { ok: boolean; skipped?: string };

function randomId(prefix: string): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return `${prefix}_${Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

export function getOrCreateDistinctId(persistence: AnalyticsConfig['persistence'] = 'localStorage'): string {
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

export function createEngagementClient(config: AnalyticsConfig = resolveAnalyticsConfig()): EngagementClient {
  return {
    config,
    isActive: () => mayCapture(config.enabled, readConsent()),
    capture: async (event, properties) => {
      if (!config.enabled) return { ok: true, skipped: 'analytics_disabled' };
      if (!mayCapture(config.enabled, readConsent())) return { ok: true, skipped: 'consent_required' };
      const ok = captureAnalyticsEvent(event, scrubEventProperties(properties));
      return ok ? { ok: true } : { ok: false, skipped: 'sdk_or_network' };
    },
  };
}
