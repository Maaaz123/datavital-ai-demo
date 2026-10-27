import { apiClient, buildFilterParams } from './client';
import type { AlertItem, ApiResponse, ChartPayload, DomainTrends, GlobalFilterState, KPICardData } from '@/types/api';

export interface AlertListOptions {
  status?: string;
  severity?: string;
  domain?: string;
}

export async function fetchAlerts(filters: GlobalFilterState, options: AlertListOptions = {}): Promise<ApiResponse<AlertItem[]>> {
  const { data } = await apiClient.get<ApiResponse<AlertItem[]>>('/alerts', {
    params: {
      ...buildFilterParams(filters),
      ...(options.status ? { status: options.status } : {}),
      ...(options.severity ? { severity: options.severity } : {}),
      ...(options.domain ? { domain: options.domain } : {}),
    },
  });
  return data;
}

export async function fetchAlertsSummary(filters: GlobalFilterState): Promise<ApiResponse<KPICardData[]>> {
  const { data } = await apiClient.get<ApiResponse<KPICardData[]>>('/alerts/summary', { params: buildFilterParams(filters) });
  return data;
}

export async function fetchAlertsTrends(filters: GlobalFilterState): Promise<DomainTrends> {
  const { data } = await apiClient.get<ApiResponse<DomainTrends>>('/alerts/trends', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchAlertsBreakdown(filters: GlobalFilterState): Promise<ChartPayload> {
  const { data } = await apiClient.get<ApiResponse<ChartPayload>>('/alerts/breakdown', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchAlertsStatusDistribution(filters: GlobalFilterState): Promise<ChartPayload> {
  const { data } = await apiClient.get<ApiResponse<ChartPayload>>('/alerts/status-distribution', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchAlertsDetails(filters: GlobalFilterState): Promise<ApiResponse<AlertItem[]>> {
  const { data } = await apiClient.get<ApiResponse<AlertItem[]>>('/alerts/details', { params: buildFilterParams(filters) });
  return data;
}

export async function acknowledgeAlert(alertId: number): Promise<AlertItem> {
  const { data } = await apiClient.post<ApiResponse<AlertItem>>(`/alerts/${alertId}/acknowledge`);
  return data.data;
}

export async function resolveAlert(alertId: number, resolutionNote?: string): Promise<AlertItem> {
  const { data } = await apiClient.post<ApiResponse<AlertItem>>(`/alerts/${alertId}/resolve`, {
    resolution_note: resolutionNote,
  });
  return data.data;
}
