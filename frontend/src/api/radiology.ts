import { apiClient, buildFilterParams } from './client';
import type { ApiResponse, DataRow, DomainTrends, ChartPayload, GlobalFilterState, KPICardData } from '@/types/api';

export async function fetchRadiologySummary(filters: GlobalFilterState): Promise<ApiResponse<KPICardData[]>> {
  const { data } = await apiClient.get<ApiResponse<KPICardData[]>>('/radiology/summary', { params: buildFilterParams(filters) });
  return data;
}

export async function fetchRadiologyTrends(filters: GlobalFilterState): Promise<DomainTrends> {
  const { data } = await apiClient.get<ApiResponse<DomainTrends>>('/radiology/trends', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchRadiologyBreakdown(filters: GlobalFilterState): Promise<ChartPayload> {
  const { data } = await apiClient.get<ApiResponse<ChartPayload>>('/radiology/breakdown', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchRadiologyStatusDistribution(filters: GlobalFilterState): Promise<ChartPayload> {
  const { data } = await apiClient.get<ApiResponse<ChartPayload>>('/radiology/status-distribution', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchRadiologyDetails(filters: GlobalFilterState): Promise<ApiResponse<DataRow[]>> {
  const { data } = await apiClient.get<ApiResponse<DataRow[]>>('/radiology/details', { params: buildFilterParams(filters) });
  return data;
}

export async function fetchPendingReports(filters: GlobalFilterState): Promise<DataRow[]> {
  const { data } = await apiClient.get<ApiResponse<DataRow[]>>('/radiology/pending-reports', { params: buildFilterParams(filters) });
  return data.data;
}
