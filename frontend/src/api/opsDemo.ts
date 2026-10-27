import { apiClient } from './client';
import type { ApiResponse, ChartPayload, KPICardData } from '@/types/api';

export interface OpsDqOverview {
  ready: boolean;
  kpis: KPICardData[];
  dimensions: Record<string, unknown>[];
  by_hospital: Record<string, unknown>[];
  by_domain: Record<string, unknown>[];
  by_source: Record<string, unknown>[];
  trend_12m: ChartPayload;
  freshness: Record<string, unknown>[];
}

export interface OpsPipelineOverview {
  ready: boolean;
  mode: string;
  airbyte_runtime: string;
  disclaimer: string;
  kpis: KPICardData[];
  connections: Record<string, unknown>[];
  history_trend: ChartPayload;
  failed: Record<string, unknown>[];
}

export interface OpsOrchestrationOverview {
  ready: boolean;
  dagster_runtime?: string;
  disclaimer?: string;
  kpis: KPICardData[];
  latest_run: Record<string, unknown> | null;
  steps: Record<string, unknown>[];
  runs: Record<string, unknown>[];
  history_trend: ChartPayload;
  dependencies: string[];
}

export async function fetchOpsDqOverview(): Promise<OpsDqOverview> {
  const { data } = await apiClient.get<ApiResponse<OpsDqOverview>>('/ops-demo/data-quality/overview');
  return data.data;
}

export async function fetchOpsDqRules(params: Record<string, string | number | undefined>) {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>[]>>('/ops-demo/data-quality/rules', { params });
  return data;
}

export async function fetchOpsDqEvidence(runId: number) {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>>>(`/ops-demo/data-quality/rules/${runId}/evidence`);
  return data.data;
}

export async function fetchOpsPipelines(): Promise<OpsPipelineOverview> {
  const { data } = await apiClient.get<ApiResponse<OpsPipelineOverview>>('/ops-demo/pipelines/overview');
  return data.data;
}

export async function fetchOpsOrchestration(): Promise<OpsOrchestrationOverview> {
  const { data } = await apiClient.get<ApiResponse<OpsOrchestrationOverview>>('/ops-demo/orchestration/overview');
  return data.data;
}

export async function fetchOpsAiInsights() {
  const { data } = await apiClient.get<ApiResponse<{ ready: boolean; insights: Record<string, unknown>[] }>>('/ops-demo/ai-insights');
  return data.data;
}
