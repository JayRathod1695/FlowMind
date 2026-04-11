import { SSE_ENDPOINT } from '@/lib/constants'
import { useConnectorStore } from '@/store/connector.store'
import { useExecutionStore } from '@/store/execution.store'
import { useLogStore } from '@/store/log.store'
import type {
	ConnectorConnection,
	ConnectorConnectionStatus,
} from '@/types/connector.types'
import type { StepStatus } from '@/types/execution.types'
import type { LogEntry, LogLevel } from '@/types/log.types'

type ConnectionListener = (connected: boolean) => void

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null

const isStepStatus = (value: unknown): value is StepStatus =>
	value === 'pending' ||
	value === 'running' ||
	value === 'completed' ||
	value === 'failed'

const isLogLevel = (value: unknown): value is LogLevel =>
	value === 'DEBUG' || value === 'INFO' || value === 'WARN' || value === 'ERROR'

const isConnectorStatus = (value: unknown): value is ConnectorConnectionStatus =>
	value === 'connected' ||
	value === 'connecting' ||
	value === 'disconnected' ||
	value === 'error'

const toSseUrl = (executionId: string): string => {
	const url = /^https?:\/\//i.test(SSE_ENDPOINT)
		? new URL(SSE_ENDPOINT)
		: new URL(SSE_ENDPOINT, window.location.origin)

	url.searchParams.set('execution_id', executionId)
	return url.toString()
}

const toLogEntry = (payload: unknown): LogEntry | null => {
	if (!isRecord(payload)) {
		return null
	}

	if (
		typeof payload.id !== 'string' ||
		typeof payload.timestamp !== 'string' ||
		typeof payload.subsystem !== 'string' ||
		typeof payload.action !== 'string' ||
		!isLogLevel(payload.level)
	) {
		return null
	}

	return {
		id: payload.id,
		trace_id: typeof payload.trace_id === 'string' ? payload.trace_id : null,
		timestamp: payload.timestamp,
		level: payload.level,
		subsystem: payload.subsystem,
		action: payload.action,
		data: isRecord(payload.data) ? payload.data : null,
		duration_ms:
			typeof payload.duration_ms === 'number' ? payload.duration_ms : null,
		execution_id:
			typeof payload.execution_id === 'string' ? payload.execution_id : null,
	}
}

const toConnectorConnection = (
	payload: Record<string, unknown>,
): ConnectorConnection | null => {
	const candidate = isRecord(payload.connection) ? payload.connection : payload

	if (
		typeof candidate.connector_name !== 'string' ||
		!isConnectorStatus(candidate.status)
	) {
		return null
	}

	return {
		connector_name: candidate.connector_name,
		status: candidate.status,
		connected_account_label:
			typeof candidate.connected_account_label === 'string'
				? candidate.connected_account_label
				: null,
		connected_at:
			typeof candidate.connected_at === 'string' ? candidate.connected_at : null,
		last_used_at:
			typeof candidate.last_used_at === 'string' ? candidate.last_used_at : null,
		error_message:
			typeof candidate.error_message === 'string' ? candidate.error_message : null,
	}
}

export class SSEManager {
	private eventSource: EventSource | null = null
	private executionId: string | null = null
	private listeners = new Set<ConnectionListener>()

	connect(executionId: string): EventSource {
		if (this.eventSource && this.executionId === executionId) {
			return this.eventSource
		}

		this.disconnect()

		const eventSource = new EventSource(toSseUrl(executionId))
		this.eventSource = eventSource
		this.executionId = executionId
		this.publishConnection(false)

		eventSource.onopen = () => {
			this.publishConnection(true)
		}

		eventSource.onerror = () => {
			this.publishConnection(false)
		}

		eventSource.onmessage = (event) => {
			this.handleMessage(event.data)
		}

		return eventSource
	}

	disconnect(): void {
		if (this.eventSource) {
			this.eventSource.close()
		}

		this.eventSource = null
		this.executionId = null
		this.publishConnection(false)
	}

	subscribe(listener: ConnectionListener): () => void {
		this.listeners.add(listener)
		listener(this.eventSource?.readyState === EventSource.OPEN)

		return () => {
			this.listeners.delete(listener)
		}
	}

	private publishConnection(isConnected: boolean): void {
		for (const listener of this.listeners) {
			listener(isConnected)
		}
	}

	private handleMessage(rawMessage: string): void {
		let parsed: unknown
		try {
			parsed = JSON.parse(rawMessage)
		} catch {
			return
		}

		if (!isRecord(parsed) || typeof parsed.type !== 'string') {
			return
		}

		switch (parsed.type) {
			case 'log': {
				const logEntry = toLogEntry(parsed.entry)
				if (logEntry) {
					useLogStore.getState().addEntry(logEntry)
				}
				return
			}
			case 'step_status': {
				if (typeof parsed.step_id !== 'string' || !isStepStatus(parsed.status)) {
					return
				}

				useExecutionStore.getState().setStepStatus(parsed.step_id, parsed.status, {
					durationMs:
						typeof parsed.duration_ms === 'number' ? parsed.duration_ms : null,
					errorMessage:
						typeof parsed.error_message === 'string'
							? parsed.error_message
							: null,
					outputJson: isRecord(parsed.output_json) ? parsed.output_json : undefined,
				})
				return
			}
			case 'approval_required': {
				useExecutionStore
					.getState()
					.setPaused(typeof parsed.step_id === 'string' ? parsed.step_id : null)
				return
			}
			case 'execution_complete': {
				useExecutionStore.getState().setComplete()
				return
			}
			case 'connector_status_change': {
				const connection = toConnectorConnection(parsed)
				if (connection) {
					useConnectorStore.getState().setConnection(connection)
				}
				return
			}
			default:
				return
		}
	}
}

export const sseManager = new SSEManager()
