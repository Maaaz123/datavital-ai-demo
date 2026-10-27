import { apiClient, buildFilterParams } from './client';
import type { ApiResponse, DataRow, DomainTrends, ChartPayload, GlobalFilterState, KPICardData } from '@/types/api';

export async function fetchRcmSummary(filters: GlobalFilterState): Promise<ApiResponse<KPICardData[]>> {
  const { data } = await apiClient.get<ApiResponse<KPICardData[]>>('/rcm/summary', { params: buildFilterParams(filters) });
  return data;
}

export async function fetchRcmTrends(filters: GlobalFilterState): Promise<DomainTrends> {
  const { data } = await apiClient.get<ApiResponse<DomainTrends>>('/rcm/trends', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchRcmBreakdown(filters: GlobalFilterState): Promise<ChartPayload> {
  const { data } = await apiClient.get<ApiResponse<ChartPayload>>('/rcm/breakdown', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchRcmStatusDistribution(filters: GlobalFilterState): Promise<ChartPayload> {
  const { data } = await apiClient.get<ApiResponse<ChartPayload>>('/rcm/status-distribution', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchRcmDetails(filters: GlobalFilterState): Promise<ApiResponse<DataRow[]>> {
  const { data } = await apiClient.get<ApiResponse<DataRow[]>>('/rcm/details', { params: buildFilterParams(filters) });
  return data;
}

export async function fetchDeniedClaims(filters: GlobalFilterState): Promise<DataRow[]> {
  const { data } = await apiClient.get<ApiResponse<DataRow[]>>('/rcm/denied-claims', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchClaimAging(filters: GlobalFilterState): Promise<ChartPayload> {
  const { data } = await apiClient.get<ApiResponse<ChartPayload>>('/rcm/claim-aging', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchEligibilityBreakdown(filters: GlobalFilterState): Promise<ChartPayload> {
  const { data } = await apiClient.get<ApiResponse<ChartPayload>>('/rcm/eligibility-breakdown', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchPreauthBreakdown(filters: GlobalFilterState): Promise<ChartPayload> {
  const { data } = await apiClient.get<ApiResponse<ChartPayload>>('/rcm/preauth-breakdown', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchDenialReasons(filters: GlobalFilterState): Promise<ChartPayload> {
  const { data } = await apiClient.get<ApiResponse<ChartPayload>>('/rcm/denial-reasons', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchLeakageExceptions(filters: GlobalFilterState): Promise<DataRow[]> {
  const { data } = await apiClient.get<ApiResponse<DataRow[]>>('/rcm/leakage-exceptions', { params: buildFilterParams(filters) });
  return data.data;
}

export async function downloadRcmExport(filters: GlobalFilterState): Promise<void> {
  const response = await apiClient.get('/rcm/export', {
    params: buildFilterParams(filters),
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'rcm_export.csv';
  a.click();
  window.URL.revokeObjectURL(url);
}
