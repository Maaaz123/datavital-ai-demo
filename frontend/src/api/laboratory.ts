import { apiClient, buildFilterParams } from './client';
import type { ApiResponse, DataRow, DomainTrends, ChartPayload, GlobalFilterState, KPICardData } from '@/types/api';

export async function fetchLaboratorySummary(filters: GlobalFilterState): Promise<ApiResponse<KPICardData[]>> {
  const { data } = await apiClient.get<ApiResponse<KPICardData[]>>('/laboratory/summary', { params: buildFilterParams(filters) });
  return data;
}

export async function fetchLaboratoryTrends(filters: GlobalFilterState): Promise<DomainTrends> {
  const { data } = await apiClient.get<ApiResponse<DomainTrends>>('/laboratory/trends', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchLaboratoryBreakdown(filters: GlobalFilterState): Promise<ChartPayload> {
  const { data } = await apiClient.get<ApiResponse<ChartPayload>>('/laboratory/breakdown', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchLaboratoryStatusDistribution(filters: GlobalFilterState): Promise<ChartPayload> {
  const { data } = await apiClient.get<ApiResponse<ChartPayload>>('/laboratory/status-distribution', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchLaboratoryDetails(filters: GlobalFilterState): Promise<ApiResponse<DataRow[]>> {
  const { data } = await apiClient.get<ApiResponse<DataRow[]>>('/laboratory/details', { params: buildFilterParams(filters) });
  return data;
}

export async function fetchCriticalResults(filters: GlobalFilterState): Promise<DataRow[]> {
  const { data } = await apiClient.get<ApiResponse<DataRow[]>>('/laboratory/critical-results', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchPendingTests(filters: GlobalFilterState): Promise<DataRow[]> {
  const { data } = await apiClient.get<ApiResponse<DataRow[]>>('/laboratory/pending-tests', { params: buildFilterParams(filters) });
  return data.data;
}
