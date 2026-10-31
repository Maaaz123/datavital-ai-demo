/**
 * Official posthog-js initialization — privacy-first, consent-gated.
 * Never import personal/secret PostHog API keys here.
 */
import posthog from 'posthog-js';
import { DEMO_BUILD_ID } from '@/buildId';
import { resolveAnalyticsConfig, type AnalyticsConfig } from './config';
import { mayCapture, readConsent } from './consent';
import { scrubEventProperties, sanitizeUrlForAnalytics } from './privacy';

let initialized = false;
let initAttempted = false;

export function isPosthogInitialized(): boolean {
  return initialized;
}

export function resetPosthogForTests(): void {
  initialized = false;
  initAttempted = false;
  try {
    posthog.reset();
  } catch {
    /* ignore */
  }
}

/**
 * Initialize PostHog once. Safe to call repeatedly.
 * Skips in Vitest / when disabled / when consent not granted (opt-in boot after consent).
 */
export function initPosthog(config: AnalyticsConfig = resolveAnalyticsConfig()): boolean {
  if (initAttempted && initialized) return true;
  if (typeof window === 'undefined') return false;
  // Never send real events from automated tests unless explicitly mocked.
  if (import.meta.env.MODE === 'test' || (import.meta.env as { VITEST?: boolean }).VITEST) {
    return false;
  }
  if (!config.enabled || !config.posthogKey) return false;
  if (!mayCapture(config.enabled, readConsent())) return false;

  initAttempted = true;
  try {
    posthog.init(config.posthogKey, {
      api_host: config.posthogHost,
      ui_host: 'https://us.posthog.com',
      person_profiles: 'identified_only',
      capture_pageview: false, // manual SPA pageviews — avoid duplicates
      capture_pageleave: true,
      autocapture: false,
      disable_session_recording: true,
      enable_recording_console_log: false,
      mask_all_text: true,
      mask_all_element_attributes: true,
      persistence: config.persistence === 'localStorage' ? 'localStorage+cookie' : 'memory',
      sanitize_properties: (properties) => {
        const next = { ...properties };
        if (typeof next.$current_url === 'string') {
          next.$current_url = `https://demo.datavital.io${sanitizeUrlForAnalytics(next.$current_url)}`;
        }
        if (typeof next.$pathname === 'string') {
          next.$pathname = sanitizeUrlForAnalytics(next.$pathname).split('?')[0] ?? next.$pathname;
        }
        if (typeof next.$referrer === 'string' && /invite=/i.test(next.$referrer)) {
          next.$referrer = sanitizeUrlForAnalytics(next.$referrer);
        }
        delete next.invite;
        delete next.token;
        return scrubEventProperties(next);
      },
      loaded: (ph) => {
        ph.register({
          demo_build_id: DEMO_BUILD_ID,
          demo_product: 'datavital_ai',
        });
        try {
          ph.stopSessionRecording();
        } catch {
          /* ignore */
        }
      },
    });
    initialized = true;
    return true;
  } catch {
    initialized = false;
    return false;
  }
}

export function captureAnalyticsEvent(
  event: string,
  properties?: Record<string, unknown>,
): boolean {
  try {
    const config = resolveAnalyticsConfig();
    if (!mayCapture(config.enabled, readConsent())) return false;
    if (!initialized) {
      if (!initPosthog(config)) return false;
    }
    const scrubbed = scrubEventProperties(properties);
    posthog.capture(event, {
      ...scrubbed,
      demo_build_id: DEMO_BUILD_ID,
    });
    return true;
  } catch {
    return false;
  }
}

export function capturePageview(path: string, properties?: Record<string, unknown>): boolean {
  return captureAnalyticsEvent('$pageview', {
    ...properties,
    path,
    $pathname: path.split('?')[0] ?? path,
    $current_url: `https://demo.datavital.io${path}`,
  });
}

export function capturePageleave(path: string, properties?: Record<string, unknown>): boolean {
  return captureAnalyticsEvent('$pageleave', {
    ...properties,
    path,
    $pathname: path.split('?')[0] ?? path,
  });
}

export function getPosthog(): typeof posthog {
  return posthog;
}
