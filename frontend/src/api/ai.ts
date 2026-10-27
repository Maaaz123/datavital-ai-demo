import { apiClient, buildFilterParams } from './client';
import type { ApiResponse, GlobalFilterState } from '@/types/api';

export async function fetchBedDemandForecast(filters: GlobalFilterState = {}, horizonHours?: number) {
  const { data } = await apiClient.get<ApiResponse<{ predictions: Record<string, unknown>[]; disclaimer: string }>>(
    '/ai/beds/demand-forecast',
    { params: { ...buildFilterParams(filters), ...(horizonHours ? { horizon_hours: horizonHours } : {}) } },
  );
  return data.data;
}

export async function fetchBedCapacityRisk(filters: GlobalFilterState = {}) {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>[]>>('/ai/beds/capacity-risk', {
    params: buildFilterParams(filters),
  });
  return data.data;
}

export async function fetchDischargePredictions(filters: GlobalFilterState = {}) {
  const { data } = await apiClient.get<ApiResponse<{ predictions: Record<string, unknown>[]; disclaimer: string }>>(
    '/ai/beds/discharge-predictions',
    { params: buildFilterParams(filters) },
  );
  return data.data;
}

export async function fetchBedRecommendations(filters: GlobalFilterState = {}) {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>[]>>('/ai/beds/recommendations', {
    params: buildFilterParams(filters),
  });
  return data.data;
}

export async function fetchBedModelPerformance() {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>[]>>('/ai/beds/model-performance');
  return data.data;
}

export async function runBedForecast() {
  const { data } = await apiClient.post<ApiResponse<{ status: string }>>('/ai/beds/run-forecast');
  return data.data;
}

export async function reviewBedPrediction(body: { entity_id: string; review_status: string; notes?: string }) {
  const { data } = await apiClient.post('/ai/beds/review-prediction', body);
  return data;
}

export async function fetchEdCrowding(filters: GlobalFilterState = {}, horizonHours?: number) {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>[]>>('/ai/emergency/crowding-forecast', {
    params: { ...buildFilterParams(filters), ...(horizonHours ? { horizon_hours: horizonHours } : {}) },
  });
  return data.data;
}

export async function fetchEdWaiting(filters: GlobalFilterState = {}) {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>[]>>('/ai/emergency/waiting-time', {
    params: buildFilterParams(filters),
  });
  return data.data;
}

export async function fetchEdBottlenecks(filters: GlobalFilterState = {}) {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>[]>>('/ai/emergency/bottlenecks', {
    params: buildFilterParams(filters),
  });
  return data.data;
}

export async function fetchEdRecommendations(filters: GlobalFilterState = {}) {
  const { data } = await apiClient.get<ApiResponse<{ items: Record<string, unknown>[]; note: string }>>(
    '/ai/emergency/recommendations',
    { params: buildFilterParams(filters) },
  );
  return data.data;
}

export async function runEdPrediction() {
  const { data } = await apiClient.post('/ai/emergency/run-prediction');
  return data;
}

export async function fetchNoShowRisk(filters: GlobalFilterState = {}) {
  const { data } = await apiClient.get<ApiResponse<{ predictions: Record<string, unknown>[]; policy: string }>>(
    '/ai/appointments/no-show-risk',
    { params: buildFilterParams(filters) },
  );
  return data.data;
}

export async function fetchClinicDemand(filters: GlobalFilterState = {}) {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>[]>>('/ai/appointments/clinic-demand', {
    params: buildFilterParams(filters),
  });
  return data.data;
}

export async function fetchWaitlistRecs(filters: GlobalFilterState = {}) {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>[]>>('/ai/appointments/waitlist-recommendations', {
    params: buildFilterParams(filters),
  });
  return data.data;
}

export async function applyAppointmentIntervention(body: { appointment_id: string; intervention_type: string; notes?: string }) {
  const { data } = await apiClient.post('/ai/appointments/apply-intervention', body);
  return data;
}

export async function fetchClaimsAtRisk(filters: GlobalFilterState = {}) {
  const { data } = await apiClient.get<ApiResponse<{ claims: Record<string, unknown>[]; policy: string }>>(
    '/ai/rcm/claims-at-risk',
    { params: buildFilterParams(filters) },
  );
  return data.data;
}

export async function fetchRevenueLeakage(filters: GlobalFilterState = {}) {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>[]>>('/ai/rcm/revenue-leakage', {
    params: buildFilterParams(filters),
  });
  return data.data;
}

export async function fetchDenialReasons(filters: GlobalFilterState = {}) {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>[]>>('/ai/rcm/denial-reasons', {
    params: buildFilterParams(filters),
  });
  return data.data;
}

export async function fetchDqSummary() {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>>>('/ai/data-quality/summary');
  return data.data;
}

export async function fetchDqIssues() {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>[]>>('/ai/data-quality/issues');
  return data.data;
}

export async function fetchDqAnomalies() {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>[]>>('/ai/data-quality/anomalies');
  return data.data;
}

export async function fetchDqDomainScores() {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>[]>>('/ai/data-quality/domain-scores');
  return data.data;
}

export async function fetchPipelineHealth() {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>[]>>('/ai/data-quality/pipeline-health');
  return data.data;
}

export async function runDqAnalysis() {
  const { data } = await apiClient.post('/ai/data-quality/run-analysis');
  return data;
}
