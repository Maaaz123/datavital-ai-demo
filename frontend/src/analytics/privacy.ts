/**
 * Privacy helpers for engagement analytics.
 * Strip invite / secret query tokens from URLs before capture, referrer, or external share.
 */

/** Query keys that must never appear in analytics properties or captured page URLs. */
export const SENSITIVE_QUERY_KEYS = [
  'invite',
  'token',
  'access_token',
  'id_token',
  'refresh_token',
  'code',
  'state',
  'session',
  'auth',
  'key',
  'secret',
  'password',
] as const;

const SENSITIVE_SET = new Set<string>(SENSITIVE_QUERY_KEYS);

/** Properties that must never be sent (question text, PHI-adjacent inputs, etc.). */
export const FORBIDDEN_EVENT_PROPERTY_KEYS = [
  'question',
  'question_text',
  'prompt',
  'user_input',
  'message',
  'chat_body',
  'patient',
  'patient_id',
  'mrn',
  'diagnosis',
  'clinical_note',
  'email',
  'phone',
  'full_name',
  'client_registry',
] as const;

/**
 * Return a pathname + safe search string with sensitive query keys removed.
 */
export function sanitizeUrlForAnalytics(href: string): string {
  try {
    const url = new URL(href, 'https://demo.datavital.io');
    for (const key of [...url.searchParams.keys()]) {
      if (SENSITIVE_SET.has(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }
    const search = url.searchParams.toString();
    return `${url.pathname}${search ? `?${search}` : ''}${url.hash}`;
  } catch {
    return '/';
  }
}

/** Strip invite= (and other secrets) from the live browser address bar without navigation. */
export function stripSensitiveParamsFromLocation(search: string = window.location.search): string {
  const params = new URLSearchParams(search);
  let changed = false;
  for (const key of [...params.keys()]) {
    if (SENSITIVE_SET.has(key.toLowerCase())) {
      params.delete(key);
      changed = true;
    }
  }
  if (!changed) return search;
  const next = params.toString();
  const path = `${window.location.pathname}${next ? `?${next}` : ''}${window.location.hash}`;
  try {
    window.history.replaceState(window.history.state, '', path);
  } catch {
    /* ignore — never break the demo */
  }
  return next ? `?${next}` : '';
}

export function scrubEventProperties(
  props: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!props) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (FORBIDDEN_EVENT_PROPERTY_KEYS.includes(key as (typeof FORBIDDEN_EVENT_PROPERTY_KEYS)[number])) {
      continue;
    }
    if (typeof value === 'string' && /invite=|access_token=|password=/i.test(value)) {
      out[key] = sanitizeUrlForAnalytics(value);
      continue;
    }
    out[key] = value;
  }
  return out;
}

/** Coarse country only — never lat/lng or city-level precision from the client. */
export type CoarseGeo = {
  country_code: string | null;
  source: 'server_geoip' | 'unavailable';
};
