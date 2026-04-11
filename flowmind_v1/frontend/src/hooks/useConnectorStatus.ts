import { useCallback, useEffect, useRef, useState } from 'react'

import {
	CONNECTOR_STATUS_POLL_INTERVAL_MS,
	DEFAULT_USER_ID,
} from '@/lib/constants'
import { ApiError } from '@/services/api.client'
import { getConnectorStatus } from '@/services/connector.service'
import { useConnectorStore } from '@/store/connector.store'
import type {
	ConnectorConnection,
	ConnectorHealthStatus,
} from '@/types/connector.types'

export interface UseConnectorStatusResult {
	isLoading: boolean
	error: string | null
	refresh: () => Promise<void>
}

const toErrorMessage = (error: unknown): string => {
	if (error instanceof ApiError) {
		return error.message
	}

	if (error instanceof Error) {
		return error.message
	}

	return 'Unable to load connector status right now.'
}

const toHealthStatus = (
	connection: ConnectorConnection,
): ConnectorHealthStatus => {
	if (connection.status === 'error') {
		return 'down'
	}

	if (connection.status === 'connecting') {
		return 'degraded'
	}

	return 'healthy'
}

export const useConnectorStatus = (
	userId: string = DEFAULT_USER_ID,
): UseConnectorStatusResult => {
	const refreshConnections = useConnectorStore((state) => state.refreshConnections)
	const setHealthStatus = useConnectorStore((state) => state.setHealthStatus)

	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const inFlightRef = useRef(false)
	const isMountedRef = useRef(true)

	useEffect(
		() => () => {
			isMountedRef.current = false
		},
		[],
	)

	const refresh = useCallback(async () => {
		if (inFlightRef.current) {
			return
		}

		inFlightRef.current = true
		if (isMountedRef.current) {
			setIsLoading(true)
		}

		try {
			const connections = await getConnectorStatus(userId)
			refreshConnections(connections)

			for (const connection of connections) {
				setHealthStatus(connection.connector_name, toHealthStatus(connection))
			}

			if (isMountedRef.current) {
				setError(null)
			}
		} catch (requestError) {
			if (isMountedRef.current) {
				setError(toErrorMessage(requestError))
			}
		} finally {
			inFlightRef.current = false
			if (isMountedRef.current) {
				setIsLoading(false)
			}
		}
	}, [refreshConnections, setHealthStatus, userId])

	useEffect(() => {
		void refresh()

		const intervalId = window.setInterval(() => {
			void refresh()
		}, CONNECTOR_STATUS_POLL_INTERVAL_MS)

		return () => {
			window.clearInterval(intervalId)
		}
	}, [refresh])

	return {
		isLoading,
		error,
		refresh,
	}
}
