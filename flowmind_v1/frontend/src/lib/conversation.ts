const defaultApiBaseUrl = `http://${window.location.hostname || "localhost"}:8000`;
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl).replace(/\/$/, "");

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

function buildUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const shouldSetJsonContentType = options.body !== undefined && !(options.body instanceof FormData);
  const response = await fetch(buildUrl(path), {
    ...options,
    headers: {
      ...(shouldSetJsonContentType ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });

  const payload = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !payload.success || payload.data === undefined) {
    const errorMessage = payload.error?.message || `Request failed (${response.status})`;
    throw new Error(errorMessage);
  }

  return payload.data;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  turn_index: number;
  role: "user" | "assistant" | "system";
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ConversationSession {
  id: string;
  initial_prompt: string;
  state: string;
  assistant_message: string | null;
  plan_id: string | null;
  plan_json: Record<string, unknown> | null;
  result_json: Record<string, unknown> | null;
  can_proceed: boolean;
  missing_info: string[];
  planning_prompt: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  messages: ConversationMessage[];
}

export interface ConversationTurnResult {
  conversation: ConversationSession;
  assistant_message: string;
  can_proceed: boolean;
  missing_info: string[];
  plan_id: string | null;
  plan: Record<string, unknown> | null;
}

export async function startConversation(prompt: string): Promise<ConversationTurnResult> {
  return await apiRequest<ConversationTurnResult>("/api/conversations/start", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
}

export async function sendConversationMessage(
  conversationId: string,
  message: string
): Promise<ConversationTurnResult> {
  return await apiRequest<ConversationTurnResult>(`/api/conversations/${conversationId}/message`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export async function getConversation(conversationId: string): Promise<ConversationSession> {
  return await apiRequest<ConversationSession>(`/api/conversations/${conversationId}`, {
    method: "GET",
  });
}