import { apiClient, buildFilterParams } from './client';
import type { ApiResponse, DataRow, DomainTrends, ChartPayload, GlobalFilterState, KPICardData } from '@/types/api';

export async function fetchEmergencySummary(filters: GlobalFilterState): Promise<ApiResponse<KPICardData[]>> {
  const { data } = await apiClient.get<ApiResponse<KPICardData[]>>('/emergency/summary', { params: buildFilterParams(filters) });
  return data;
}

export async function fetchEmergencyTrends(filters: GlobalFilterState): Promise<DomainTrends> {
  const { data } = await apiClient.get<ApiResponse<DomainTrends>>('/emergency/trends', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchEmergencyBreakdown(filters: GlobalFilterState): Promise<ChartPayload> {
  const { data } = await apiClient.get<ApiResponse<ChartPayload>>('/emergency/breakdown', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchEmergencyStatusDistribution(filters: GlobalFilterState): Promise<ChartPayload> {
  const { data } = await apiClient.get<ApiResponse<ChartPayload>>('/emergency/status-distribution', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchEmergencyDetails(filters: GlobalFilterState): Promise<ApiResponse<DataRow[]>> {
  const { data } = await apiClient.get<ApiResponse<DataRow[]>>('/emergency/details', { params: buildFilterParams(filters) });
  return data;
}

export async function fetchEmergencyCurrentPatients(filters: GlobalFilterState): Promise<DataRow[]> {
  const { data } = await apiClient.get<ApiResponse<DataRow[]>>('/emergency/current-patients', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchEmergencyHourlyVolume(filters: GlobalFilterState): Promise<ChartPayload> {
  const { data } = await apiClient.get<ApiResponse<ChartPayload>>('/emergency/hourly-volume', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchEmergencyTriageDistribution(filters: GlobalFilterState): Promise<ChartPayload> {
  const { data } = await apiClient.get<ApiResponse<ChartPayload>>('/emergency/triage-distribution', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchEmergencyArrivalMethod(filters: GlobalFilterState): Promise<ChartPayload> {
  const { data } = await apiClient.get<ApiResponse<ChartPayload>>('/emergency/arrival-method-breakdown', {
    params: buildFilterParams(filters),
  });
  return data.data;
}

export async function fetchEmergencyWaitByTriage(filters: GlobalFilterState): Promise<ChartPayload> {
  const { data } = await apiClient.get<ApiResponse<ChartPayload>>('/emergency/wait-by-triage', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchEmergencyThresholdExceptions(filters: GlobalFilterState): Promise<DataRow[]> {
  const { data } = await apiClient.get<ApiResponse<DataRow[]>>('/emergency/threshold-exceptions', {
    params: buildFilterParams(filters),
  });
  return data.data;
}

export async function downloadEmergencyExport(filters: GlobalFilterState): Promise<void> {
  const response = await apiClient.get('/emergency/export', {
    params: buildFilterParams(filters),
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'emergency_export.csv';
  a.click();
  window.URL.revokeObjectURL(url);
}
