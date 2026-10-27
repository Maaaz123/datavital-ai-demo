/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_AIRBYTE_URL?: string;
  readonly VITE_DAGSTER_URL?: string;
  readonly VITE_OPENMETADATA_URL?: string;
  readonly VITE_OPENMETADATA_UI_INTEGRATION_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
