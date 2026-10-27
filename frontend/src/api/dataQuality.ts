import { apiClient, buildFilterParams } from './client';
import type { ApiResponse, ChartPayload, DataQualityIssue, DomainTrends, GlobalFilterState, KPICardData } from '@/types/api';

export async function fetchDataQualitySummary(filters: GlobalFilterState): Promise<ApiResponse<KPICardData[]>> {
  const { data } = await apiClient.get<ApiResponse<KPICardData[]>>('/data-quality/summary', { params: buildFilterParams(filters) });
  return data;
}

export async function fetchDataQualityTrends(filters: GlobalFilterState): Promise<DomainTrends> {
  const { data } = await apiClient.get<ApiResponse<DomainTrends>>('/data-quality/trends', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchDataQualityBreakdown(filters: GlobalFilterState): Promise<ChartPayload> {
  const { data } = await apiClient.get<ApiResponse<ChartPayload>>('/data-quality/breakdown', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchDataQualityStatusDistribution(filters: GlobalFilterState): Promise<ChartPayload> {
  const { data } = await apiClient.get<ApiResponse<ChartPayload>>('/data-quality/status-distribution', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchDataQualityDetails(filters: GlobalFilterState): Promise<ApiResponse<DataQualityIssue[]>> {
  const { data } = await apiClient.get<ApiResponse<DataQualityIssue[]>>('/data-quality/details', { params: buildFilterParams(filters) });
  return data;
}

export async function fetchDataQualityIssues(filters: GlobalFilterState): Promise<ApiResponse<DataQualityIssue[]>> {
  const { data } = await apiClient.get<ApiResponse<DataQualityIssue[]>>('/data-quality/issues', { params: buildFilterParams(filters) });
  return data;
}
