const defaultApiBaseUrl = `http://${window.location.hostname || "localhost"}:8000`;
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl).replace(/\/$/, "");

export interface ApiErrorPayload {
  code: string;
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiErrorPayload;
}

// ─── Plan Types ──────────────────────────────────────────────────

export interface PlanStep {
  step: number;
  description: string;
  server: string;
  server_icon: string;
  tool: string;
  args: Record<string, unknown>;
  depends_on: number[];
}

export interface AgentPlan {
  plan_id: string;
  prompt: string;
  plan_summary: string;
  steps: PlanStep[];
  step_count: number;
  failed_servers: string[];
  status: string;
}

// ─── Execution Types ─────────────────────────────────────────────

export interface ExecutionStep {
  step: number;
  server: string;
  server_icon: string;
  tool: string;
  args: Record<string, unknown>;
  result: string;
}

export interface ExecutionResult {
  plan_id: string;
  assistant_response: string;
  steps: ExecutionStep[];
  tool_step_count: number;
}

export interface AgentRunResult {
  queued: boolean;
  task_id?: string;
  webhook_type?: string;
  assistant_response: string;
  steps: ExecutionStep[];
  tool_step_count: number;
  failed_servers: string[];
  plan_id?: string;
}

export interface ChatListItem {
  id: string;
  prompt: string;
  plan_id: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
}

export interface ChatRecord extends ChatListItem {
  plan_json: Record<string, unknown> | null;
  result_json: Record<string, unknown> | null;
}

export interface WaitingTask {
  id: string;
  prompt: string;
  status: string;
  webhook_type: string;
  webhook_filter: Record<string, unknown>;
  created_at: string;
}

export type HookStatus = "waiting" | "resumed" | "done" | "failed";

export interface HookTask {
  id: string;
  prompt: string;
  status: HookStatus;
  webhook_type: string;
  webhook_filter: Record<string, unknown>;
  event_data: Record<string, unknown> | null;
  created_at: string;
}

export interface HooksSummary {
  active: HookTask[];
  inactive: HookTask[];
  summary: {
    total: number;
    active_count: number;
    inactive_count: number;
    breakdown: Record<HookStatus, number>;
  };
}

// ─── SSE Event Types ─────────────────────────────────────────────

export interface SSEStepStart {
  type: "step_start";
  step: number;
  server: string;
  server_icon: string;
  tool: string;
  args: Record<string, unknown>;
}

export interface SSEStepComplete {
  type: "step_complete";
  step: number;
  result: string;
}

export interface SSEStepError {
  type: "step_error";
  step: number;
  error: string;
}

export interface SSELLMToken {
  type: "llm_token";
  token: string;
}

export interface SSEExecutionComplete {
  type: "execution_complete";
  summary: string;
}

export interface SSEExecutionError {
  type: "execution_error";
  error: string;
}

export type SSEEvent =
  | SSEStepStart
  | SSEStepComplete
  | SSEStepError
  | SSELLMToken
  | SSEExecutionComplete
  | SSEExecutionError;

// ─── Other Types ─────────────────────────────────────────────────

export interface AgentRuntimeStatus {
  runtime_initialized: boolean;
  tool_count: number;
  failed_servers: string[];
  waiting_task_count: number;
  pending_plans: number;
  waiting_tasks: Array<{ id: string; type: string; status: string }>;
}

export interface HealthStatus {
  status: string;
  uptime_seconds: number;
  runtime_initialized: boolean;
  tool_count: number;
  failed_servers: string[];
}

export interface LogQueryEntry {
  id: string;
  trace_id: string | null;
  timestamp: string;
  level: string;
  subsystem: string;
  action: string;
  data: Record<string, unknown> | null;
  duration_ms: number | null;
  execution_id: string | null;
}

export interface LogStreamPayload {
  type: string;
  entry?: {
    id?: string;
    trace_id?: string | null;
    timestamp?: string;
    level?: string;
    subsystem?: string;
    action?: string;
    source?: string;
    event?: string;
    message?: string;
    data?: Record<string, unknown> | null;
    metadata?: Record<string, unknown> | null;
    execution_id?: string | null;
  };
  [key: string]: unknown;
}

// ─── Helpers ─────────────────────────────────────────────────────

function buildUrl(path: string, query?: Record<string, string | number | undefined>): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${API_BASE_URL}${normalizedPath}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  query?: Record<string, string | number | undefined>
): Promise<T> {
  const shouldSetJsonContentType =
    options.body !== undefined && !(options.body instanceof FormData);

  const response = await fetch(buildUrl(path, query), {
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

// ─── Agent API: Plan + Execute ───────────────────────────────────

export async function planAgent(prompt: string): Promise<AgentPlan> {
  return await apiRequest<AgentPlan>("/api/agent/plan", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
}

export async function executePlan(planId: string): Promise<ExecutionResult> {
  return await apiRequest<ExecutionResult>(`/api/agent/execute/${planId}`, {
    method: "POST",
  });
}

export async function getPlan(planId: string): Promise<AgentPlan> {
  return await apiRequest<AgentPlan>(`/api/agent/plan/${planId}`, { method: "GET" });
}

export function createExecutionStream(planId: string): EventSource {
  return new EventSource(buildUrl(`/api/agent/execute/${planId}/stream`));
}

// ─── Agent API: Quick Mode ───────────────────────────────────────

export async function runAgent(prompt: string): Promise<AgentRunResult> {
  return await apiRequest<AgentRunResult>("/api/agent/run", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
}

export async function getChats(limit = 50): Promise<ChatListItem[]> {
  return await apiRequest<ChatListItem[]>("/api/chats", { method: "GET" }, { limit });
}

export async function getChat(chatId: string): Promise<ChatRecord> {
  return await apiRequest<ChatRecord>(`/api/chats/${chatId}`, { method: "GET" });
}

export async function getWaitingTasks(): Promise<WaitingTask[]> {
  return await apiRequest<WaitingTask[]>("/api/chats/waiting", { method: "GET" });
}

export async function getHooksSummary(): Promise<HooksSummary> {
  return await apiRequest<HooksSummary>("/api/chats/hooks", { method: "GET" });
}

// ─── Runtime & Health ────────────────────────────────────────────

export async function getAgentRuntimeStatus(): Promise<AgentRuntimeStatus> {
  return await apiRequest<AgentRuntimeStatus>("/api/agent/runtime", { method: "GET" });
}

export async function getHealthStatus(): Promise<HealthStatus> {
  return await apiRequest<HealthStatus>("/api/health", { method: "GET" });
}

// ─── Logs ────────────────────────────────────────────────────────

export async function queryLogs(params?: {
  level?: string;
  subsystem?: string;
  fromTime?: string;
  limit?: number;
}): Promise<LogQueryEntry[]> {
  const payload = await apiRequest<{ entries: LogQueryEntry[] }>("/api/logs/query", { method: "GET" }, {
    level: params?.level,
    subsystem: params?.subsystem,
    from_time: params?.fromTime,
    limit: params?.limit,
  });
  return payload.entries;
}

export function createLogEventSource(executionId?: string): EventSource {
  return new EventSource(buildUrl("/api/logs/stream", { execution_id: executionId }));
}
