import { apiClient, buildFilterParams } from './client';
import type {
  ApiResponse,
  ChartPayload,
  DomainTrends,
  GlobalFilterState,
  KPICardData,
  Patient360,
  PatientSearchResult,
  TimelineEvent,
} from '@/types/api';

export async function fetchPatientsSummary(filters: GlobalFilterState): Promise<ApiResponse<KPICardData[]>> {
  const { data } = await apiClient.get<ApiResponse<KPICardData[]>>('/patients/summary', { params: buildFilterParams(filters) });
  return data;
}

export async function fetchPatientsTrends(filters: GlobalFilterState): Promise<DomainTrends> {
  const { data } = await apiClient.get<ApiResponse<DomainTrends>>('/patients/trends', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchPatientsBreakdown(filters: GlobalFilterState): Promise<ChartPayload> {
  const { data } = await apiClient.get<ApiResponse<ChartPayload>>('/patients/breakdown', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchPatientsStatusDistribution(filters: GlobalFilterState): Promise<ChartPayload> {
  const { data } = await apiClient.get<ApiResponse<ChartPayload>>('/patients/status-distribution', { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchPatientsDetails(filters: GlobalFilterState): Promise<ApiResponse<PatientSearchResult[]>> {
  const { data } = await apiClient.get<ApiResponse<PatientSearchResult[]>>('/patients/details', { params: buildFilterParams(filters) });
  return data;
}

export async function searchPatients(filters: GlobalFilterState, query?: string): Promise<ApiResponse<PatientSearchResult[]>> {
  const { data } = await apiClient.get<ApiResponse<PatientSearchResult[]>>('/patients/search', {
    params: { ...buildFilterParams(filters), ...(query ? { q: query } : {}) },
  });
  return data;
}

export async function fetchPatient360(patientId: number, filters: GlobalFilterState = {}): Promise<Patient360> {
  const { data } = await apiClient.get<ApiResponse<Patient360>>(`/patients/${patientId}/360`, { params: buildFilterParams(filters) });
  return data.data;
}

export async function fetchPatientTimeline(patientId: number, filters: GlobalFilterState = {}): Promise<TimelineEvent[]> {
  const { data } = await apiClient.get<ApiResponse<TimelineEvent[]>>(`/patients/${patientId}/timeline`, { params: buildFilterParams(filters) });
  return data.data;
}
