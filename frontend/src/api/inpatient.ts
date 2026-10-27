import { apiClient, buildFilterParams } from './client';
import type { ApiResponse, DataRow, DomainTrends, ChartPayload, GlobalFilterState, KPICardData } from '@/types/api';

export async function fetchInpatientSummary(filters: GlobalFilterState): Promise<ApiResponse<KPICardData[]>> {
  const { data } = await apiClient.get<ApiResponse<KPICardData[]>>('/inpatient/summary', { params: buildFilterParams(filters) });
  return data;
}

export async function fetchInpatientTrends(filters: GlobalFilterState): Promise<DomainTrends> {
  const { data } = await apiClient.get<ApiResponse<DomainTrends>>('/inpatient/trends', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchInpatientBreakdown(filters: GlobalFilterState): Promise<ChartPayload> {
  const { data } = await apiClient.get<ApiResponse<ChartPayload>>('/inpatient/breakdown', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchInpatientStatusDistribution(filters: GlobalFilterState): Promise<ChartPayload> {
  const { data } = await apiClient.get<ApiResponse<ChartPayload>>('/inpatient/status-distribution', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchInpatientDetails(filters: GlobalFilterState): Promise<ApiResponse<DataRow[]>> {
  const { data } = await apiClient.get<ApiResponse<DataRow[]>>('/inpatient/details', { params: buildFilterParams(filters) });
  return data;
}

export async function fetchExtendedStay(filters: GlobalFilterState, thresholdDays = 7): Promise<DataRow[]> {
  const { data } = await apiClient.get<ApiResponse<DataRow[]>>('/inpatient/extended-stay', {
    params: { ...buildFilterParams(filters), threshold_days: thresholdDays },
  });
  return data.data;
}

export async function fetchCurrentCensus(filters: GlobalFilterState): Promise<DataRow[]> {
  const { data } = await apiClient.get<ApiResponse<DataRow[]>>('/inpatient/current-census', { params: buildFilterParams(filters) });
  return data.data;
}
