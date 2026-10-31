/**
 * Consent gate for engagement analytics.
 * No events are sent until consent is granted (when analytics is enabled).
 * Falls back to in-memory store when localStorage is unavailable (private mode / broken env).
 */

const CONSENT_KEY = 'datavital-analytics-consent-v1';

export type ConsentState = 'unknown' | 'granted' | 'denied';

let memoryConsent: ConsentState = 'unknown';

function readStorage(): string | null {
  try {
    return localStorage.getItem(CONSENT_KEY);
  } catch {
    return null;
  }
}

function writeStorage(value: string): boolean {
  try {
    localStorage.setItem(CONSENT_KEY, value);
    // Some environments accept setItem but do not persist — verify.
    return localStorage.getItem(CONSENT_KEY) === value;
  } catch {
    return false;
  }
}

export function readConsent(): ConsentState {
  const v = readStorage();
  if (v === 'granted' || v === 'denied') return v;
  if (memoryConsent === 'granted' || memoryConsent === 'denied') return memoryConsent;
  return 'unknown';
}

export function writeConsent(state: 'granted' | 'denied'): void {
  memoryConsent = state;
  writeStorage(state);
}

export function clearConsent(): void {
  memoryConsent = 'unknown';
  try {
    localStorage.removeItem(CONSENT_KEY);
  } catch {
    /* ignore */
  }
}

/** Analytics may capture only when enabled AND consent granted. */
export function mayCapture(enabled: boolean, consent: ConsentState = readConsent()): boolean {
  return enabled && consent === 'granted';
}
