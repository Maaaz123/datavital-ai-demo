import { apiClient } from './client';
import type { ApiResponse } from '@/types/api';
import type {
  CopilotChatRequest,
  CopilotChatResponse,
  CopilotConversation,
  CopilotConversationDetail,
  CopilotDomain,
  CopilotFeedbackRating,
  CopilotMetric,
  CopilotSuggestion,
} from '@/types/copilot';

export interface SuggestionParams {
  domain?: string;
}

export async function postChat(body: CopilotChatRequest, signal?: AbortSignal): Promise<CopilotChatResponse> {
  const { data } = await apiClient.post<CopilotChatResponse>('/copilot/chat', body, { signal });
  return data;
}

export async function getConversations(): Promise<CopilotConversation[]> {
  const { data } = await apiClient.get<ApiResponse<CopilotConversation[]>>('/copilot/conversations');
  return data.data;
}

export async function getConversation(id: string): Promise<CopilotConversationDetail> {
  const { data } = await apiClient.get<ApiResponse<CopilotConversationDetail>>(`/copilot/conversations/${id}`);
  return data.data;
}

export async function deleteConversation(id: string): Promise<void> {
  await apiClient.delete(`/copilot/conversations/${id}`);
}

export async function getSuggestions(params: SuggestionParams = {}): Promise<CopilotSuggestion[]> {
  const { data } = await apiClient.get<ApiResponse<CopilotSuggestion[]>>('/copilot/suggestions', { params });
  return data.data;
}

export async function getDomains(): Promise<CopilotDomain[]> {
  const { data } = await apiClient.get<ApiResponse<CopilotDomain[]>>('/copilot/domains');
  return data.data;
}

export async function getMetrics(): Promise<CopilotMetric[]> {
  const { data } = await apiClient.get<ApiResponse<CopilotMetric[]>>('/copilot/metrics');
  return data.data;
}

export async function postFeedback(messageId: string, rating: CopilotFeedbackRating, comment?: string): Promise<void> {
  await apiClient.post(`/copilot/messages/${messageId}/feedback`, { rating, comment });
}

export async function exportResults(queryId: string): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(`/copilot/export/${queryId}`, { responseType: 'blob' });
  return data;
}
