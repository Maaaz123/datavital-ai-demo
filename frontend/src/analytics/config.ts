/**
 * Client engagement analytics configuration.
 * Production: enabled when public VITE_POSTHOG_KEY is present (see .env.production).
 * Tests / local without key: disabled. Private API keys must never appear here.
 */

export type AnalyticsConfig = {
  enabled: boolean;
  posthogKey: string | null;
  posthogHost: string;
  inviteApiBase: string | null;
  persistence: 'memory' | 'localStorage';
  autocapture: false;
  sessionRecording: false;
  projectId: string | null;
};

function envFlag(value: string | undefined): boolean {
  return value === 'true' || value === '1' || value === 'yes';
}

function trimOrNull(value: string | undefined): string | null {
  const v = (value ?? '').trim();
  return v.length > 0 ? v : null;
}

export function resolveAnalyticsConfig(
  env: ImportMetaEnv | Record<string, string | undefined> = import.meta.env,
): AnalyticsConfig {
  const posthogKey = trimOrNull(env.VITE_POSTHOG_KEY ?? env.VITE_POSTHOG_PROJECT_KEY);
  const posthogHost = (trimOrNull(env.VITE_POSTHOG_HOST) ?? 'https://us.i.posthog.com').replace(/\/$/, '');
  const inviteApiBase = trimOrNull(env.VITE_INVITE_API_BASE);
  const projectId = trimOrNull(env.VITE_POSTHOG_PROJECT_ID);
  const explicitOff = env.VITE_ANALYTICS_ENABLED === 'false' || env.VITE_ANALYTICS_ENABLED === '0';
  const explicitOn = envFlag(env.VITE_ANALYTICS_ENABLED);
  // Enable when a public project key is configured, unless explicitly disabled.
  // Automated tests set MODE=test and never initialize the real SDK.
  const enabled = Boolean(posthogKey) && !explicitOff && (explicitOn || Boolean(posthogKey));

  return {
    enabled,
    posthogKey: enabled ? posthogKey : null,
    posthogHost,
    inviteApiBase,
    persistence: 'localStorage',
    autocapture: false,
    sessionRecording: false,
    projectId,
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
  projectId: null,
};
