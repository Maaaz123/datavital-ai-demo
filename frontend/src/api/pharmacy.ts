import { apiClient, buildFilterParams } from './client';
import type { ApiResponse, DataRow, DomainTrends, ChartPayload, GlobalFilterState, KPICardData } from '@/types/api';

export async function fetchPharmacySummary(filters: GlobalFilterState): Promise<ApiResponse<KPICardData[]>> {
  const { data } = await apiClient.get<ApiResponse<KPICardData[]>>('/pharmacy/summary', { params: buildFilterParams(filters) });
  return data;
}

export async function fetchPharmacyTrends(filters: GlobalFilterState): Promise<DomainTrends> {
  const { data } = await apiClient.get<ApiResponse<DomainTrends>>('/pharmacy/trends', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchPharmacyBreakdown(filters: GlobalFilterState): Promise<ChartPayload> {
  const { data } = await apiClient.get<ApiResponse<ChartPayload>>('/pharmacy/breakdown', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchPharmacyStatusDistribution(filters: GlobalFilterState): Promise<ChartPayload> {
  const { data } = await apiClient.get<ApiResponse<ChartPayload>>('/pharmacy/status-distribution', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchPharmacyDetails(filters: GlobalFilterState): Promise<ApiResponse<DataRow[]>> {
  const { data } = await apiClient.get<ApiResponse<DataRow[]>>('/pharmacy/details', { params: buildFilterParams(filters) });
  return data;
}

export async function fetchLowStock(filters: GlobalFilterState): Promise<DataRow[]> {
  const { data } = await apiClient.get<ApiResponse<DataRow[]>>('/pharmacy/low-stock', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchPendingOrders(filters: GlobalFilterState): Promise<DataRow[]> {
  const { data } = await apiClient.get<ApiResponse<DataRow[]>>('/pharmacy/pending-orders', { params: buildFilterParams(filters) });
  return data.data;
}
