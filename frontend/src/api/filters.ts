import { apiClient } from './client';
import type { ApiResponse, AvailableYearsResponse, FilterOptions } from '@/types/api';

export async function fetchFilterOptions(): Promise<FilterOptions> {
  const { data } = await apiClient.get<ApiResponse<FilterOptions>>('/filters/options');
  return data.data;
}

export async function fetchAvailableYears(params?: {
  hospital_key?: number;
  timezone?: string;
}): Promise<AvailableYearsResponse> {
  const { data } = await apiClient.get<ApiResponse<AvailableYearsResponse>>('/filters/years', {
    params: {
      hospital_key: params?.hospital_key,
      timezone: params?.timezone,
    },
  });
  return data.data;
}
