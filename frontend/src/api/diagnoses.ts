import { apiClient, buildFilterParams } from './client';
import type { ApiResponse, DataRow, DomainTrends, ChartPayload, GlobalFilterState, KPICardData } from '@/types/api';

export async function fetchDiagnosesSummary(filters: GlobalFilterState): Promise<ApiResponse<KPICardData[]>> {
  const { data } = await apiClient.get<ApiResponse<KPICardData[]>>('/diagnoses/summary', { params: buildFilterParams(filters) });
  return data;
}

export async function fetchDiagnosesTrends(filters: GlobalFilterState): Promise<DomainTrends> {
  const { data } = await apiClient.get<ApiResponse<DomainTrends>>('/diagnoses/trends', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchDiagnosesBreakdown(filters: GlobalFilterState): Promise<ChartPayload> {
  const { data } = await apiClient.get<ApiResponse<ChartPayload>>('/diagnoses/breakdown', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchDiagnosesStatusDistribution(filters: GlobalFilterState): Promise<ChartPayload> {
  const { data } = await apiClient.get<ApiResponse<ChartPayload>>('/diagnoses/status-distribution', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchDiagnosesDetails(filters: GlobalFilterState): Promise<ApiResponse<DataRow[]>> {
  const { data } = await apiClient.get<ApiResponse<DataRow[]>>('/diagnoses/details', { params: buildFilterParams(filters) });
  return data;
}

export async function fetchTopDiagnosesList(filters: GlobalFilterState, limit = 10): Promise<DataRow[]> {
  const { data } = await apiClient.get<ApiResponse<DataRow[]>>('/diagnoses/top', { params: { ...buildFilterParams(filters), limit } });
  return data.data;
}

export async function fetchComorbidity(filters: GlobalFilterState, limit = 15): Promise<ChartPayload> {
  const { data } = await apiClient.get<ApiResponse<ChartPayload>>('/diagnoses/comorbidity', { params: { ...buildFilterParams(filters), limit } });
  return data.data;
}
