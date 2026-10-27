import { apiClient } from './client';
import type { ApiResponse } from '@/types/api';

export interface FeatureFlag {
  feature_code: string;
  feature_name?: string;
  is_enabled: boolean;
  disabled_reason?: string | null;
  domain?: string | null;
}

export async function fetchFeatures(hospitalId?: number) {
  const { data } = await apiClient.get<ApiResponse<FeatureFlag[]>>('/integration/features', {
    params: hospitalId ? { hospital_id: hospitalId } : undefined,
  });
  return data.data;
}
