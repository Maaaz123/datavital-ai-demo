import { apiClient, buildFilterParams } from './client';
import type { ApiResponse, DataRow, DomainTrends, ChartPayload, GlobalFilterState, KPICardData } from '@/types/api';

export async function fetchSurgerySummary(filters: GlobalFilterState): Promise<ApiResponse<KPICardData[]>> {
  const { data } = await apiClient.get<ApiResponse<KPICardData[]>>('/surgery/summary', { params: buildFilterParams(filters) });
  return data;
}

export async function fetchSurgeryTrends(filters: GlobalFilterState): Promise<DomainTrends> {
  const { data } = await apiClient.get<ApiResponse<DomainTrends>>('/surgery/trends', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchSurgeryBreakdown(filters: GlobalFilterState): Promise<ChartPayload> {
  const { data } = await apiClient.get<ApiResponse<ChartPayload>>('/surgery/breakdown', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchSurgeryStatusDistribution(filters: GlobalFilterState): Promise<ChartPayload> {
  const { data } = await apiClient.get<ApiResponse<ChartPayload>>('/surgery/status-distribution', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchSurgeryDetails(filters: GlobalFilterState): Promise<ApiResponse<DataRow[]>> {
  const { data } = await apiClient.get<ApiResponse<DataRow[]>>('/surgery/details', { params: buildFilterParams(filters) });
  return data;
}

export async function fetchTodaySchedule(filters: GlobalFilterState): Promise<DataRow[]> {
  const { data } = await apiClient.get<ApiResponse<DataRow[]>>('/surgery/today-schedule', { params: buildFilterParams(filters) });
  return data.data;
}
