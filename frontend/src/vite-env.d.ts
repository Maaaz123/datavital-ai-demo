/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_AIRBYTE_URL?: string;
  readonly VITE_DAGSTER_URL?: string;
  readonly VITE_OPENMETADATA_URL?: string;
  readonly VITE_OPENMETADATA_UI_INTEGRATION_ENABLED?: string;
  /** Set to "false" to force-disable even when a public project key is present. */
  readonly VITE_ANALYTICS_ENABLED?: string;
  /** PostHog public project key (phc_…). Never put private/personal API keys here. */
  readonly VITE_POSTHOG_PROJECT_KEY?: string;
  readonly VITE_POSTHOG_KEY?: string;
  /** Optional PostHog ingest host (default US cloud). */
  readonly VITE_POSTHOG_HOST?: string;
  /** PostHog project id (documentation / dashboards — not a secret). */
  readonly VITE_POSTHOG_PROJECT_ID?: string;
  /** Optional secure invite validation API (not available on GitHub Pages alone). */
  readonly VITE_INVITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
