import { apiClient, buildFilterParams } from './client';
import type { ApiResponse, DataRow, DomainTrends, ChartPayload, GlobalFilterState, KPICardData } from '@/types/api';

export async function fetchOutpatientSummary(filters: GlobalFilterState): Promise<ApiResponse<KPICardData[]>> {
  const { data } = await apiClient.get<ApiResponse<KPICardData[]>>('/outpatient/summary', { params: buildFilterParams(filters) });
  return data;
}

export async function fetchOutpatientTrends(filters: GlobalFilterState): Promise<DomainTrends> {
  const { data } = await apiClient.get<ApiResponse<DomainTrends>>('/outpatient/trends', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchOutpatientBreakdown(filters: GlobalFilterState): Promise<ChartPayload> {
  const { data } = await apiClient.get<ApiResponse<ChartPayload>>('/outpatient/breakdown', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchOutpatientStatusDistribution(filters: GlobalFilterState): Promise<ChartPayload> {
  const { data } = await apiClient.get<ApiResponse<ChartPayload>>('/outpatient/status-distribution', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchOutpatientDetails(filters: GlobalFilterState): Promise<ApiResponse<DataRow[]>> {
  const { data } = await apiClient.get<ApiResponse<DataRow[]>>('/outpatient/details', { params: buildFilterParams(filters) });
  return data;
}
