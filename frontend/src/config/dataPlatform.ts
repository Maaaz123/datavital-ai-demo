/** External URLs for Airbyte / Dagster / OpenMetadata (set via Vite env at build time). */
export const dataPlatformUrls = {
  // Port 8001 — HAP backend already binds host :8000
  airbyte: import.meta.env.VITE_AIRBYTE_URL || 'http://localhost:8001',
  dagster: import.meta.env.VITE_DAGSTER_URL || 'http://localhost:3001',
  openMetadata: import.meta.env.VITE_OPENMETADATA_URL || 'http://localhost:8585',
} as const;

export type DataPlatformToolId = keyof typeof dataPlatformUrls;

/** When true, in-app pages call FastAPI OpenMetadata proxies for live catalog data. */
export const openMetadataUiIntegrationEnabled =
  String(import.meta.env.VITE_OPENMETADATA_UI_INTEGRATION_ENABLED || 'false').toLowerCase() === 'true';

export function openMetadataAssetProfileUrl(fqn: string): string {
  return `${dataPlatformUrls.openMetadata}/table/${encodeURIComponent(fqn)}`;
}

export function openMetadataLineageUrl(fqn: string): string {
  return `${dataPlatformUrls.openMetadata}/table/${encodeURIComponent(fqn)}/lineage`;
}
