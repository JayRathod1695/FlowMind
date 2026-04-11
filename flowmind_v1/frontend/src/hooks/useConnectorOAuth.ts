import { useCallback, useState } from 'react'

import { DEFAULT_USER_ID } from '@/lib/constants'
import {
	logConnectorConnectCompleted,
	logConnectorConnectInitiated,
} from '@/lib/logger'
import { ApiError } from '@/services/api.client'
import { getConnectorStatus, initiateConnect } from '@/services/connector.service'
import { useConnectorStore } from '@/store/connector.store'

const OAUTH_POPUP_FEATURES = 'popup=yes,width=600,height=700,left=200,top=120'
const OAUTH_POLL_INTERVAL_MS = 500
const OAUTH_TIMEOUT_MS = 120_000

export interface UseConnectorOAuthResult {
	connect: (connectorName: string) => Promise<void>
	isConnecting: boolean
	error: string | null
	clearError: () => void
}

const normalizeConnectorName = (connectorName: string): string => {
	const normalized = connectorName.trim().toLowerCase()
	return normalized === 'google' ? 'sheets' : normalized
}

const formatOAuthErrorCode = (errorCode: string): string => {
	const normalized = errorCode.replace(/_/g, ' ').trim()
	if (!normalized) {
		return 'OAuth failed.'
	}

	return `${normalized[0].toUpperCase()}${normalized.slice(1)}.`
}

const isConnectorsPath = (pathname: string): boolean =>
	pathname === '/connectors' || pathname === '/connectors/'

const waitForPopupResolution = (
	popup: Window,
	connectorName: string,
): Promise<void> =>
	new Promise((resolve, reject) => {
		const expectedConnector = normalizeConnectorName(connectorName)
		const startedAt = Date.now()

		const timerId = window.setInterval(() => {
			if (popup.closed) {
				window.clearInterval(timerId)
				reject(new Error('OAuth window was closed before completion.'))
				return
			}

			if (Date.now() - startedAt > OAUTH_TIMEOUT_MS) {
				window.clearInterval(timerId)
				popup.close()
				reject(new Error('OAuth flow timed out. Please try again.'))
				return
			}

			let currentHref: string
			try {
				currentHref = popup.location.href
			} catch {
				return
			}

			if (!currentHref) {
				return
			}

			const currentUrl = new URL(currentHref, window.location.origin)
			if (!isConnectorsPath(currentUrl.pathname)) {
				return
			}

			const connected = currentUrl.searchParams.get('connected')
			if (connected && normalizeConnectorName(connected) === expectedConnector) {
				window.clearInterval(timerId)
				popup.close()
				resolve()
				return
			}

			const errorCode = currentUrl.searchParams.get('error')
			if (!errorCode) {
				return
			}

			const errorConnector = currentUrl.searchParams.get('connector')
			if (
				errorConnector &&
				normalizeConnectorName(errorConnector) !== expectedConnector
			) {
				window.clearInterval(timerId)
				popup.close()
				reject(new Error('OAuth failed for a different connector.'))
				return
			}

			window.clearInterval(timerId)
			popup.close()
			reject(new Error(formatOAuthErrorCode(errorCode)))
		}, OAUTH_POLL_INTERVAL_MS)
	})

const toErrorMessage = (error: unknown): string => {
	if (error instanceof ApiError) {
		if (error.message === 'Connector OAuth configuration is missing') {
			return 'Connector OAuth is not configured on the backend. Fill the connector CLIENT_ID and CLIENT_SECRET in backend .env, then restart the backend.'
		}
		return error.message
	}

	if (error instanceof Error) {
		return error.message
	}

	return 'Unable to connect this connector right now.'
}

export const useConnectorOAuth = (
	userId: string = DEFAULT_USER_ID,
): UseConnectorOAuthResult => {
	const refreshConnections = useConnectorStore((state) => state.refreshConnections)
	const [isConnecting, setIsConnecting] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const clearError = useCallback(() => {
		setError(null)
	}, [])

	const connect = useCallback(
		async (connectorName: string) => {
			const normalizedConnectorName = normalizeConnectorName(connectorName)
			if (!normalizedConnectorName) {
				setError('Connector name is required.')
				return
			}

			setError(null)
			setIsConnecting(true)
			logConnectorConnectInitiated({
				connector: normalizedConnectorName,
				userId,
			})

			try {
				const connectResponse = await initiateConnect(normalizedConnectorName, userId)
				const popup = window.open(
					connectResponse.auth_url,
					'flowmind-oauth',
					OAUTH_POPUP_FEATURES,
				)

				if (!popup) {
					throw new Error('Popup was blocked. Please allow popups and try again.')
				}

				await waitForPopupResolution(popup, normalizedConnectorName)
				const updatedConnections = await getConnectorStatus(userId)
				refreshConnections(updatedConnections)
				logConnectorConnectCompleted({
					connector: normalizedConnectorName,
					userId,
				})
			} catch (requestError) {
				setError(toErrorMessage(requestError))
			} finally {
				setIsConnecting(false)
			}
		},
		[refreshConnections, userId],
	)

	return {
		connect,
		isConnecting,
		error,
		clearError,
	}
}
