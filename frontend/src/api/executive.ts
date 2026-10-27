import { apiClient, buildFilterParams } from './client';
import type {
  ApiResponse,
  ChartPayload,
  ExecutiveTrends,
  GlobalFilterState,
  KPICardData,
  TopDiagnosis,
} from '@/types/api';

export async function fetchExecutiveSummary(filters: GlobalFilterState): Promise<ApiResponse<KPICardData[]>> {
  const { data } = await apiClient.get<ApiResponse<KPICardData[]>>('/executive/summary', {
    params: buildFilterParams(filters),
  });
  return data;
}

export async function fetchExecutiveTrends(filters: GlobalFilterState): Promise<ExecutiveTrends> {
  const { data } = await apiClient.get<ApiResponse<ExecutiveTrends>>('/executive/trends', {
    params: buildFilterParams(filters),
  });
  return data.data;
}

export async function fetchEncountersByDomain(filters: GlobalFilterState): Promise<ChartPayload> {
  const { data } = await apiClient.get<ApiResponse<ChartPayload>>('/executive/encounters-by-domain', {
    params: buildFilterParams(filters),
  });
  return data.data;
}

export async function fetchHospitalComparison(filters: GlobalFilterState): Promise<ChartPayload> {
  const { data } = await apiClient.get<ApiResponse<ChartPayload>>('/executive/hospital-comparison', {
    params: buildFilterParams(filters),
  });
  return data.data;
}

export async function fetchTopDiagnoses(filters: GlobalFilterState): Promise<TopDiagnosis[]> {
  const { data } = await apiClient.get<ApiResponse<TopDiagnosis[]>>('/executive/top-diagnoses', {
    params: buildFilterParams(filters),
  });
  return data.data;
}
