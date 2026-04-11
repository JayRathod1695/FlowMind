import { useCallback, useEffect, useRef, useState } from 'react'

import { ApiError } from '@/services/api.client'
import { getPastWorkflows } from '@/services/workflow.service'
import type { Workflow } from '@/types/workflow.types'

export interface UseWorkflowMemoryResult {
	workflows: Workflow[]
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

	return 'Unable to load previous workflows right now.'
}

export const useWorkflowMemory = (): UseWorkflowMemoryResult => {
	const [workflows, setWorkflows] = useState<Workflow[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const isMountedRef = useRef(true)

	useEffect(
		() => () => {
			isMountedRef.current = false
		},
		[],
	)

	const refresh = useCallback(async () => {
		if (isMountedRef.current) {
			setIsLoading(true)
		}

		try {
			const workflowItems = await getPastWorkflows()
			if (isMountedRef.current) {
				setWorkflows(workflowItems)
				setError(null)
			}
		} catch (requestError) {
			if (isMountedRef.current) {
				setError(toErrorMessage(requestError))
			}
		} finally {
			if (isMountedRef.current) {
				setIsLoading(false)
			}
		}
	}, [])

	useEffect(() => {
		void refresh()
	}, [refresh])

	return {
		workflows,
		isLoading,
		error,
		refresh,
	}
}
