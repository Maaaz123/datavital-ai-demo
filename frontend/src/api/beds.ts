import { apiClient, buildFilterParams } from './client';
import type {
  ApiResponse,
  BedStatusItem,
  ChartPayload,
  GlobalFilterState,
  KPICardData,
  OperationalLists,
} from '@/types/api';

export async function fetchBedsSummary(filters: GlobalFilterState): Promise<ApiResponse<KPICardData[]>> {
  const { data } = await apiClient.get<ApiResponse<KPICardData[]>>('/beds/summary', {
    params: buildFilterParams(filters),
  });
  return data;
}

export async function fetchBedsStatus(filters: GlobalFilterState): Promise<ApiResponse<BedStatusItem[]>> {
  const { data } = await apiClient.get<ApiResponse<BedStatusItem[]>>('/beds/status', {
    params: buildFilterParams(filters),
  });
  return data;
}

export async function fetchBedsByHospital(filters: GlobalFilterState): Promise<ChartPayload> {
  const { data } = await apiClient.get<ApiResponse<ChartPayload>>('/beds/by-hospital', {
    params: buildFilterParams(filters),
  });
  return data.data;
}

export async function fetchBedsByWard(filters: GlobalFilterState): Promise<ChartPayload> {
  const { data } = await apiClient.get<ApiResponse<ChartPayload>>('/beds/by-ward', {
    params: buildFilterParams(filters),
  });
  return data.data;
}

export async function fetchHourlyOccupancy(filters: GlobalFilterState): Promise<ChartPayload> {
  const { data } = await apiClient.get<ApiResponse<ChartPayload>>('/beds/hourly-occupancy', {
    params: buildFilterParams(filters),
  });
  return data.data;
}

export async function fetchOperationalLists(filters: GlobalFilterState): Promise<OperationalLists> {
  const { data } = await apiClient.get<ApiResponse<OperationalLists>>('/beds/operational-lists', {
    params: buildFilterParams(filters),
  });
  return data.data;
}
