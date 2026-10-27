import type { ChartSeries } from './api';

export interface CopilotSource {
  model: string;
  freshness_at?: string | null;
}

export interface CopilotAnswer {
  title: string;
  summary: string;
  language: string;
  insights: string[];
  recommended_actions: string[];
}

export interface CopilotQuery {
  domain: string;
  intent: string;
  metrics: string[];
  dimensions: string[];
  filters: Record<string, unknown>;
  sql?: string | null;
  sql_visible: boolean;
}

/** Loosely compatible with ChartPayload — `type` maps to `chart_type`. */
export interface CopilotVisualization {
  type: string;
  categories?: (string | number)[];
  series?: ChartSeries[];
  title?: string;
  x_axis?: string;
  y_axis?: string;
  meta?: Record<string, unknown>;
}

export interface CopilotTable {
  columns: string[];
  rows: Record<string, unknown>[] | unknown[][];
  total_rows: number;
}

export interface CopilotChatResponse {
  success: boolean;
  conversation_id: string;
  message_id: string;
  query_id?: string | null;
  answer: CopilotAnswer;
  query: CopilotQuery;
  visualization?: CopilotVisualization | null;
  table?: CopilotTable | null;
  sources: CopilotSource[];
  suggested_questions: string[];
  generated_at: string;
  warning?: string | null;
}

export interface CopilotChatRequest {
  question: string;
  conversation_id?: string | null;
  filters?: Record<string, unknown>;
  language?: string;
  domain?: string;
}

export interface CopilotConversation {
  conversation_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

export interface CopilotStoredMessage {
  message_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  response?: CopilotChatResponse | null;
}

export interface CopilotConversationDetail extends CopilotConversation {
  messages: CopilotStoredMessage[];
}

export interface CopilotSuggestion {
  question: string;
  domain?: string;
  category?: string;
}

export interface CopilotDomain {
  key: string;
  label: string;
  description?: string;
}

export interface CopilotMetric {
  key: string;
  label: string;
  domain?: string;
  unit?: string;
}

export type CopilotFeedbackRating = 'helpful' | 'not_helpful';

/** Client-side chat transcript item — combines both user turns and assistant responses for rendering. */
export interface CopilotChatItem {
  id: string;
  role: 'user' | 'assistant';
  question?: string;
  response?: CopilotChatResponse;
  createdAt: string;
  status: 'pending' | 'done' | 'error' | 'cancelled';
  errorMessage?: string;
}
