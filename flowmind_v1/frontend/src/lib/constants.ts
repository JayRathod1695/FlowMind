const env = import.meta.env

const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const API_BASE_URL = env.VITE_API_BASE_URL ?? '/api'
export const SSE_ENDPOINT = env.VITE_SSE_ENDPOINT ?? '/api/logs/stream'
export const OAUTH_CALLBACK_PATH = env.VITE_OAUTH_CALLBACK_PATH ?? '/oauth/callback'
export const CONNECTOR_STATUS_POLL_INTERVAL_MS = toNumber(
  env.VITE_CONNECTOR_STATUS_POLL_INTERVAL_MS,
  30_000,
)
export const DEFAULT_USER_ID = env.VITE_DEFAULT_USER_ID ?? 'default-user'
