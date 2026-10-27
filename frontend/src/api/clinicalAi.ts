import { apiClient, buildFilterParams } from './client';
import type { ApiResponse, GlobalFilterState } from '@/types/api';

// ── Deterioration ─────────────────────────────────────────────────────────────

export async function fetchDeteriorationCurrentRisk(filters: GlobalFilterState = {}) {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>>>('/clinical-ai/deterioration/current-risk', {
    params: buildFilterParams(filters),
  });
  return data.data;
}

export async function fetchDeteriorationWardSummary(filters: GlobalFilterState = {}) {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>[]>>('/clinical-ai/deterioration/ward-summary', {
    params: buildFilterParams(filters),
  });
  return data.data;
}

export async function fetchDeteriorationHighRiskPatients(filters: GlobalFilterState = {}) {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>[]>>('/clinical-ai/deterioration/high-risk-patients', {
    params: buildFilterParams(filters),
  });
  return data.data;
}

export async function fetchDeteriorationModelPerformance() {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>[]>>('/clinical-ai/deterioration/model-performance');
  return data.data;
}

export async function fetchDeteriorationPatient(patientId: string | number) {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>>>(`/clinical-ai/deterioration/patient/${patientId}`);
  return data.data;
}

export async function runDeteriorationPrediction(filters: GlobalFilterState = {}) {
  const { data } = await apiClient.post<ApiResponse<{ status: string }>>('/clinical-ai/deterioration/run', null, {
    params: buildFilterParams(filters),
  });
  return data.data;
}

export async function reviewDeteriorationPrediction(predictionId: string | number, body: { review_status: string; notes?: string }) {
  const { data } = await apiClient.post(`/clinical-ai/deterioration/${predictionId}/review`, body);
  return data;
}

export async function acknowledgeDeteriorationPrediction(predictionId: string | number, body?: { notes?: string }) {
  const { data } = await apiClient.post(`/clinical-ai/deterioration/${predictionId}/acknowledge`, body ?? {});
  return data;
}

export async function overrideDeteriorationPrediction(predictionId: string | number, body: { reason: string; final_action: string }) {
  const { data } = await apiClient.post(`/clinical-ai/deterioration/${predictionId}/override`, body);
  return data;
}

// ── Diagnosis ─────────────────────────────────────────────────────────────────

export async function analyzeDiagnosis(body: { patient_id?: string | number; encounter_id?: string | number }) {
  const { data } = await apiClient.post<ApiResponse<Record<string, unknown>>>('/clinical-ai/diagnosis/analyze', body);
  return data.data;
}

export async function fetchDiagnosisPatient(patientId: string | number) {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>>>(`/clinical-ai/diagnosis/patient/${patientId}`);
  return data.data;
}

export async function fetchDiagnosisEncounter(encounterId: string | number) {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>>>(`/clinical-ai/diagnosis/encounter/${encounterId}`);
  return data.data;
}

export async function fetchDiagnosisSuggestion(suggestionId: string | number) {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>>>(`/clinical-ai/diagnosis/suggestions/${suggestionId}`);
  return data.data;
}

export async function acceptDiagnosisSuggestion(suggestionId: string | number, body?: { notes?: string }) {
  const { data } = await apiClient.post(`/clinical-ai/diagnosis/${suggestionId}/accept`, body ?? {});
  return data;
}

export async function rejectDiagnosisSuggestion(suggestionId: string | number, body?: { notes?: string; reason?: string }) {
  const { data } = await apiClient.post(`/clinical-ai/diagnosis/${suggestionId}/reject`, body ?? {});
  return data;
}

export async function feedbackDiagnosisSuggestion(suggestionId: string | number, body: { rating?: number; comment?: string; was_clinically_useful?: boolean }) {
  const { data } = await apiClient.post(`/clinical-ai/diagnosis/${suggestionId}/feedback`, body);
  return data;
}

export async function fetchDiagnosisModelPerformance() {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>[]>>('/clinical-ai/diagnosis/model-performance');
  return data.data;
}

// ── Imaging ───────────────────────────────────────────────────────────────────

export async function fetchImagingWorklist(filters: GlobalFilterState = {}) {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>[]>>('/clinical-ai/imaging/worklist', {
    params: buildFilterParams(filters),
  });
  return data.data;
}

export async function fetchImagingStudy(studyId: string | number) {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>>>(`/clinical-ai/imaging/study/${studyId}`);
  return data.data;
}

export async function fetchImagingCriticalStudies(filters: GlobalFilterState = {}) {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>[]>>('/clinical-ai/imaging/critical-studies', {
    params: buildFilterParams(filters),
  });
  return data.data;
}

export async function fetchImagingQualityIssues(filters: GlobalFilterState = {}) {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>[]>>('/clinical-ai/imaging/quality-issues', {
    params: buildFilterParams(filters),
  });
  return data.data;
}

export async function fetchImagingModelPerformance() {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>[]>>('/clinical-ai/imaging/model-performance');
  return data.data;
}

export async function analyzeImagingStudy(studyId: string | number) {
  const { data } = await apiClient.post<ApiResponse<Record<string, unknown>>>(`/clinical-ai/imaging/${studyId}/analyze`);
  return data.data;
}

export async function reviewImagingStudy(studyId: string | number, body: { review_status: string; notes?: string }) {
  const { data } = await apiClient.post(`/clinical-ai/imaging/${studyId}/review`, body);
  return data;
}

export async function acceptImagingStudy(studyId: string | number, body?: { notes?: string }) {
  const { data } = await apiClient.post(`/clinical-ai/imaging/${studyId}/accept`, body ?? {});
  return data;
}

export async function rejectImagingStudy(studyId: string | number, body?: { notes?: string; reason?: string }) {
  const { data } = await apiClient.post(`/clinical-ai/imaging/${studyId}/reject`, body ?? {});
  return data;
}

// ── Medication ──────────────────────────────────────────────────────────────

export async function fetchMedicationAlerts(filters: GlobalFilterState = {}) {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>[]>>('/clinical-ai/medication/alerts', {
    params: buildFilterParams(filters),
  });
  return data.data;
}

export async function fetchMedicationPatient(patientId: string | number) {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>>>(`/clinical-ai/medication/patient/${patientId}`);
  return data.data;
}

export async function fetchMedicationOrder(orderId: string | number) {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>>>(`/clinical-ai/medication/order/${orderId}`);
  return data.data;
}

export async function reviewMedicationOrder(orderId: string | number, body: { review_status: string; notes?: string }) {
  const { data } = await apiClient.post(`/clinical-ai/medication/order/${orderId}/review`, body);
  return data;
}

export async function acceptMedicationAlert(alertId: string | number, body?: { notes?: string }) {
  const { data } = await apiClient.post(`/clinical-ai/medication/alert/${alertId}/accept`, body ?? {});
  return data;
}

export async function rejectMedicationAlert(alertId: string | number, body?: { notes?: string; reason?: string }) {
  const { data } = await apiClient.post(`/clinical-ai/medication/alert/${alertId}/reject`, body ?? {});
  return data;
}

export async function overrideMedicationAlert(alertId: string | number, body: { reason: string; final_action: string }) {
  const { data } = await apiClient.post(`/clinical-ai/medication/alert/${alertId}/override`, body);
  return data;
}

export async function fetchMedicationModelPerformance() {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>[]>>('/clinical-ai/medication/model-performance');
  return data.data;
}

// ── Outcomes ──────────────────────────────────────────────────────────────────

export async function fetchOutcomesHighRiskPatients(filters: GlobalFilterState = {}) {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>[]>>('/clinical-ai/outcomes/high-risk-patients', {
    params: buildFilterParams(filters),
  });
  return data.data;
}

export async function fetchOutcomesPatient(patientId: string | number) {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>>>(`/clinical-ai/outcomes/patient/${patientId}`);
  return data.data;
}

export async function fetchOutcomesReadmission(filters: GlobalFilterState = {}) {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>>>('/clinical-ai/outcomes/readmission', {
    params: buildFilterParams(filters),
  });
  return data.data;
}

export async function fetchOutcomesComplications(filters: GlobalFilterState = {}) {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>>>('/clinical-ai/outcomes/complications', {
    params: buildFilterParams(filters),
  });
  return data.data;
}

export async function fetchOutcomesMortality(filters: GlobalFilterState = {}) {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>>>('/clinical-ai/outcomes/mortality', {
    params: buildFilterParams(filters),
  });
  return data.data;
}

export async function fetchOutcomesModelPerformance() {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>[]>>('/clinical-ai/outcomes/model-performance');
  return data.data;
}

export async function runOutcomesPrediction(filters: GlobalFilterState = {}) {
  const { data } = await apiClient.post<ApiResponse<{ status: string }>>('/clinical-ai/outcomes/run', null, {
    params: buildFilterParams(filters),
  });
  return data.data;
}

export async function reviewOutcomesPrediction(predictionId: string | number, body: { review_status: string; notes?: string }) {
  const { data } = await apiClient.post(`/clinical-ai/outcomes/${predictionId}/review`, body);
  return data;
}

export async function feedbackOutcomesPrediction(predictionId: string | number, body: { rating?: number; comment?: string; was_clinically_useful?: boolean }) {
  const { data } = await apiClient.post(`/clinical-ai/outcomes/${predictionId}/feedback`, body);
  return data;
}

// ── Governance ────────────────────────────────────────────────────────────────

export async function fetchGovernanceOverview() {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>>>('/clinical-ai/governance/overview');
  return data.data;
}

export async function fetchGovernanceBias() {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>[]>>('/clinical-ai/governance/bias');
  return data.data;
}

export async function fetchGovernanceIncidents() {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>[]>>('/clinical-ai/governance/incidents');
  return data.data;
}

export async function createGovernanceIncident(body: Record<string, unknown>) {
  const { data } = await apiClient.post<ApiResponse<Record<string, unknown>>>('/clinical-ai/governance/incidents', body);
  return data.data;
}

export async function updateGovernanceIncident(incidentId: string | number, body: Record<string, unknown>) {
  const { data } = await apiClient.put<ApiResponse<Record<string, unknown>>>(`/clinical-ai/governance/incidents/${incidentId}`, body);
  return data.data;
}

export async function activateGovernanceKillSwitch(body: { model_code: string; reason: string }) {
  const { data } = await apiClient.post<ApiResponse<{ status: string }>>('/clinical-ai/governance/kill-switch', body);
  return data.data;
}

export async function rollbackGovernanceModel(body: { model_code: string; version: string; reason: string }) {
  const { data } = await apiClient.post<ApiResponse<{ status: string }>>('/clinical-ai/governance/rollback', body);
  return data.data;
}

// ── Monitoring ────────────────────────────────────────────────────────────────

export async function fetchMonitoringOverview() {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>>>('/clinical-ai/monitoring/overview');
  return data.data;
}

export async function fetchMonitoringMetrics() {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>[]>>('/clinical-ai/monitoring/metrics');
  return data.data;
}
