import { API_BASE_URL } from '@/lib/constants'

export type FrontendLogEvent =
	| 'workflow_submitted'
	| 'dag_generation_started'
	| 'dag_generation_completed'
	| 'dag_generation_failed'
	| 'execution_started'
	| 'step_approved'
	| 'step_rejected'
	| 'page_navigated'
	| 'connector_connect_initiated'
	| 'connector_connect_completed'
	| 'connector_disconnect'

export interface FrontendLog {
	event: FrontendLogEvent
	metadata?: Record<string, unknown>
	timestamp?: string
}

const LOGS_PATH = '/logs'

const buildLogsUrl = (): string => {
	if (/^https?:\/\//i.test(API_BASE_URL)) {
		return `${API_BASE_URL.replace(/\/$/, '')}${LOGS_PATH}`
	}

	const normalizedBase = API_BASE_URL.startsWith('/') ? API_BASE_URL : `/${API_BASE_URL}`
	return `${normalizedBase.replace(/\/$/, '')}${LOGS_PATH}`
}

export const logFrontendEvent = (entry: FrontendLog): void => {
	try {
		const payload = JSON.stringify({
			...entry,
			timestamp: entry.timestamp ?? new Date().toISOString(),
		})

		const endpoint = buildLogsUrl()
		if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
			const blob = new Blob([payload], { type: 'application/json' })
			navigator.sendBeacon(endpoint, blob)
			return
		}

		void fetch(endpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: payload,
			keepalive: true,
		}).catch(() => undefined)
	} catch {
		// Explicitly ignore telemetry failures.
	}
}

export const logWorkflowSubmitted = (metadata?: Record<string, unknown>): void =>
	logFrontendEvent({ event: 'workflow_submitted', metadata })

export const logDagGenerationStarted = (metadata?: Record<string, unknown>): void =>
	logFrontendEvent({ event: 'dag_generation_started', metadata })

export const logDagGenerationCompleted = (metadata?: Record<string, unknown>): void =>
	logFrontendEvent({ event: 'dag_generation_completed', metadata })

export const logDagGenerationFailed = (metadata?: Record<string, unknown>): void =>
	logFrontendEvent({ event: 'dag_generation_failed', metadata })

export const logExecutionStarted = (metadata?: Record<string, unknown>): void =>
	logFrontendEvent({ event: 'execution_started', metadata })

export const logStepApproved = (metadata?: Record<string, unknown>): void =>
	logFrontendEvent({ event: 'step_approved', metadata })

export const logStepRejected = (metadata?: Record<string, unknown>): void =>
	logFrontendEvent({ event: 'step_rejected', metadata })

export const logPageNavigated = (metadata?: Record<string, unknown>): void =>
	logFrontendEvent({ event: 'page_navigated', metadata })

export const logConnectorConnectInitiated = (
	metadata?: Record<string, unknown>,
): void => logFrontendEvent({ event: 'connector_connect_initiated', metadata })

export const logConnectorConnectCompleted = (
	metadata?: Record<string, unknown>,
): void => logFrontendEvent({ event: 'connector_connect_completed', metadata })

export const logConnectorDisconnect = (metadata?: Record<string, unknown>): void =>
	logFrontendEvent({ event: 'connector_disconnect', metadata })
