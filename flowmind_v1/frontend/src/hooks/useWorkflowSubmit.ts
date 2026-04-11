import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
	logDagGenerationCompleted,
	logDagGenerationFailed,
	logDagGenerationStarted,
	logWorkflowSubmitted,
} from '@/lib/logger'
import { ApiError } from '@/services/api.client'
import { generateDAG } from '@/services/workflow.service'
import { useConnectorStore } from '@/store/connector.store'
import { useWorkflowStore } from '@/store/workflow.store'
import type { ConnectorConnection } from '@/types/connector.types'

const DEFAULT_CONNECTORS = ['jira', 'github', 'slack', 'sheets']

export interface SubmitWorkflowOptions {
	naturalLanguage?: string
	availableConnectors?: string[]
}

export interface UseWorkflowSubmitResult {
	submitWorkflow: (options?: SubmitWorkflowOptions) => Promise<void>
	isSubmitting: boolean
	error: string | null
	clearError: () => void
}

const toErrorMessage = (error: unknown): string => {
	if (error instanceof ApiError) {
		return error.message
	}

	if (error instanceof Error) {
		return error.message
	}

	return 'Unable to generate workflow right now. Please try again.'
}

const getConnectedConnectors = (
	connections: Record<string, ConnectorConnection>,
): string[] => {
	const result: string[] = []

	for (const connection of Object.values(connections)) {
		if (connection.status === 'connected') {
			result.push(connection.connector_name)
		}
	}

	return result
}

export const useWorkflowSubmit = (): UseWorkflowSubmitResult => {
	const navigate = useNavigate()
	const naturalLanguageInput = useWorkflowStore((state) => state.naturalLanguageInput)
	const setInput = useWorkflowStore((state) => state.setInput)
	const setDAG = useWorkflowStore((state) => state.setDAG)
	const connections = useConnectorStore((state) => state.connections)

	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const clearError = useCallback(() => {
		setError(null)
	}, [])

	const submitWorkflow = useCallback(
		async (options: SubmitWorkflowOptions = {}) => {
			const prompt = (options.naturalLanguage ?? naturalLanguageInput).trim()
			if (!prompt) {
				setError('Please describe a workflow before generating a DAG.')
				return
			}

			logWorkflowSubmitted({
				promptLength: prompt.length,
			})

			const connectedConnectorNames = getConnectedConnectors(connections)
			const availableConnectors =
				options.availableConnectors && options.availableConnectors.length > 0
					? options.availableConnectors
					: connectedConnectorNames.length > 0
						? connectedConnectorNames
						: DEFAULT_CONNECTORS

			setError(null)
			setIsSubmitting(true)
			setInput(prompt)
			useWorkflowStore.setState({ isGenerating: true })
			logDagGenerationStarted({
				connectorCount: availableConnectors.length,
			})

			try {
				const dag = await generateDAG({
					naturalLanguage: prompt,
					availableConnectors,
				})

				setDAG(dag.nodes, dag.edges, dag.confidence.overall)
				logDagGenerationCompleted({
					nodeCount: dag.nodes.length,
					edgeCount: dag.edges.length,
					confidence: dag.confidence.overall,
				})
				navigate('/dag')
			} catch (requestError) {
				logDagGenerationFailed({
					error: toErrorMessage(requestError),
				})
				setError(toErrorMessage(requestError))
			} finally {
				useWorkflowStore.setState({ isGenerating: false })
				setIsSubmitting(false)
			}
		},
		[connections, naturalLanguageInput, navigate, setDAG, setInput],
	)

	return {
		submitWorkflow,
		isSubmitting,
		error,
		clearError,
	}
}
