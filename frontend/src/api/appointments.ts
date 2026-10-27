import { apiClient, buildFilterParams } from './client';
import type { ApiResponse, DataRow, DomainTrends, ChartPayload, GlobalFilterState, KPICardData } from '@/types/api';

export async function fetchAppointmentsSummary(filters: GlobalFilterState): Promise<ApiResponse<KPICardData[]>> {
  const { data } = await apiClient.get<ApiResponse<KPICardData[]>>('/appointments/summary', { params: buildFilterParams(filters) });
  return data;
}

export async function fetchAppointmentsTrends(filters: GlobalFilterState): Promise<DomainTrends> {
  const { data } = await apiClient.get<ApiResponse<DomainTrends>>('/appointments/trends', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchAppointmentsBreakdown(filters: GlobalFilterState): Promise<ChartPayload> {
  const { data } = await apiClient.get<ApiResponse<ChartPayload>>('/appointments/breakdown', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchAppointmentsStatusDistribution(filters: GlobalFilterState): Promise<ChartPayload> {
  const { data } = await apiClient.get<ApiResponse<ChartPayload>>('/appointments/status-distribution', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchAppointmentsDetails(filters: GlobalFilterState): Promise<ApiResponse<DataRow[]>> {
  const { data } = await apiClient.get<ApiResponse<DataRow[]>>('/appointments/details', { params: buildFilterParams(filters) });
  return data;
}

export async function fetchAppointmentsToday(filters: GlobalFilterState): Promise<DataRow[]> {
  const { data } = await apiClient.get<ApiResponse<DataRow[]>>('/appointments/today', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchAvailableSlots(
  filters: GlobalFilterState,
  options?: { providerKey?: number; slotDate?: string; slotMinutes?: number },
): Promise<DataRow[]> {
  const { data } = await apiClient.get<ApiResponse<DataRow[]>>('/appointments/available-slots', {
    params: {
      ...buildFilterParams(filters),
      ...(options?.providerKey ? { provider_key: options.providerKey } : {}),
      ...(options?.slotDate ? { slot_date: options.slotDate } : {}),
      ...(options?.slotMinutes ? { slot_minutes: options.slotMinutes } : {}),
    },
  });
  return data.data;
}

export async function fetchClinicUtilization(filters: GlobalFilterState): Promise<ChartPayload> {
  const { data } = await apiClient.get<ApiResponse<ChartPayload>>('/appointments/clinic-utilization', {
    params: buildFilterParams(filters),
  });
  return data.data;
}

export async function fetchPhysicianNoShow(filters: GlobalFilterState): Promise<ChartPayload> {
  const { data } = await apiClient.get<ApiResponse<ChartPayload>>('/appointments/physician-no-show', {
    params: buildFilterParams(filters),
  });
  return data.data;
}

export async function fetchServiceModeDistribution(filters: GlobalFilterState): Promise<ChartPayload> {
  const { data } = await apiClient.get<ApiResponse<ChartPayload>>('/appointments/service-mode-distribution', {
    params: buildFilterParams(filters),
  });
  return data.data;
}

export async function fetchUnderutilizedExceptions(filters: GlobalFilterState): Promise<DataRow[]> {
  const { data } = await apiClient.get<ApiResponse<DataRow[]>>('/appointments/underutilized-exceptions', {
    params: buildFilterParams(filters),
  });
  return data.data;
}

export async function downloadAppointmentsExport(filters: GlobalFilterState): Promise<void> {
  const response = await apiClient.get('/appointments/export', {
    params: buildFilterParams(filters),
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'appointments_export.csv';
  a.click();
  window.URL.revokeObjectURL(url);
}
