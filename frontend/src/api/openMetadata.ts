import { apiClient } from './client';

export interface OpenMetadataAssetSummary {
  enabled: boolean;
  message?: string;
  fqn: string;
  name?: string | null;
  owner?: string | null;
  certification?: string | null;
  classifications?: string[];
  contract_status?: string | null;
  quality_status?: string | null;
  freshness_status?: string | null;
  failed_tests?: number;
  lineage_url?: string;
  profile_url?: string;
  data_product?: string | null;
}

export interface OpenMetadataSearchHit {
  fqn: string;
  name: string;
  description?: string | null;
  service?: string | null;
  database?: string | null;
  schema?: string | null;
  profile_url: string;
  lineage_url: string;
}

export interface OpenMetadataSearchResult {
  enabled: boolean;
  message?: string;
  auth_required?: boolean;
  query: string;
  total: number;
  results: OpenMetadataSearchHit[];
}

export interface OpenMetadataFeaturedResult {
  enabled: boolean;
  message?: string;
  assets: OpenMetadataAssetSummary[];
}

export async function getOpenMetadataHealth(): Promise<{ enabled: boolean; status: string; version?: unknown }> {
  const { data } = await apiClient.get('/openmetadata/health');
  return data as { enabled: boolean; status: string; version?: unknown };
}

export async function getOpenMetadataAssetSummary(fqn: string): Promise<OpenMetadataAssetSummary> {
  const { data } = await apiClient.get('/openmetadata/assets/summary', { params: { fqn } });
  return data as OpenMetadataAssetSummary;
}

export async function searchOpenMetadataAssets(
  q: string,
  params?: { from?: number; size?: number },
): Promise<OpenMetadataSearchResult> {
  const { data } = await apiClient.get('/openmetadata/search', { params: { q, ...params } });
  return data as OpenMetadataSearchResult;
}

export async function getOpenMetadataFeaturedAssets(): Promise<OpenMetadataFeaturedResult> {
  const { data } = await apiClient.get('/openmetadata/assets/featured');
  return data as OpenMetadataFeaturedResult;
}
