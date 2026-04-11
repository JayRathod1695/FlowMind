import { useEffect, useState } from 'react'

import { sseManager } from '@/services/log.stream.service'

export interface UseExecutionStreamResult {
	isConnected: boolean
}

export const useExecutionStream = (
	executionId: string | null | undefined,
): UseExecutionStreamResult => {
	const [isConnected, setIsConnected] = useState(false)

	useEffect(() => sseManager.subscribe(setIsConnected), [])

	useEffect(() => {
		if (!executionId) {
			sseManager.disconnect()
			return
		}

		sseManager.connect(executionId)

		return () => {
			sseManager.disconnect()
		}
	}, [executionId])

	return { isConnected }
}
