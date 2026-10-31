/**
 * Client engagement analytics configuration.
 * Default: DISABLED. No PostHog SDK is loaded unless explicitly enabled and configured.
 * Private API keys must never appear here — only the public project key when approved.
 */

export type AnalyticsConfig = {
  /** Master switch — false unless VITE_ANALYTICS_ENABLED=true AND approved project key present. */
  enabled: boolean;
  /** PostHog public project API key (phc_…). Safe for frontend when approved; not a private key. */
  posthogKey: string | null;
  /** PostHog ingest host (EU/US). */
  posthogHost: string;
  /** Optional server base for invite validation / consent audit (not GitHub Pages). */
  inviteApiBase: string | null;
  /** Persist anonymous distinct id in localStorage when consent granted. */
  persistence: 'memory' | 'localStorage';
  /** Autocapture is always off in this product configuration. */
  autocapture: false;
  /** Session recording is always off in this product configuration. */
  sessionRecording: false;
};

function envFlag(value: string | undefined): boolean {
  return value === 'true' || value === '1' || value === 'yes';
}

function trimOrNull(value: string | undefined): string | null {
  const v = (value ?? '').trim();
  return v.length > 0 ? v : null;
}

/**
 * Resolve runtime analytics config from Vite env.
 * Tracking remains a no-op unless both the enable flag and project key are set.
 */
export function resolveAnalyticsConfig(
  env: ImportMetaEnv | Record<string, string | undefined> = import.meta.env,
): AnalyticsConfig {
  const enabledFlag = envFlag(env.VITE_ANALYTICS_ENABLED);
  const posthogKey = trimOrNull(env.VITE_POSTHOG_PROJECT_KEY ?? env.VITE_POSTHOG_KEY);
  const posthogHost = trimOrNull(env.VITE_POSTHOG_HOST) ?? 'https://us.i.posthog.com';
  const inviteApiBase = trimOrNull(env.VITE_INVITE_API_BASE);

  return {
    enabled: enabledFlag && Boolean(posthogKey),
    posthogKey: enabledFlag ? posthogKey : null,
    posthogHost: posthogHost.replace(/\/$/, ''),
    inviteApiBase,
    persistence: 'localStorage',
    autocapture: false,
    sessionRecording: false,
  };
}

export const DEFAULT_ANALYTICS_DISABLED: AnalyticsConfig = {
  enabled: false,
  posthogKey: null,
  posthogHost: 'https://us.i.posthog.com',
  inviteApiBase: null,
  persistence: 'memory',
  autocapture: false,
  sessionRecording: false,
};
