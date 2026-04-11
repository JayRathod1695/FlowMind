import { apiRequest } from '@/services/api.client'
import type { Workflow } from '@/types/workflow.types'

const DEFAULT_CONNECTORS = ['jira', 'github', 'slack', 'sheets'] as const

export type GeneratedDAG = Workflow['dag_json']

export interface GenerateDAGInput {
	naturalLanguage: string
	availableConnectors?: string[]
}

export interface SaveWorkflowInput {
	name: string
	naturalLanguage: string
	dagJson: GeneratedDAG
}

export interface SaveWorkflowResponse {
	workflow_id: string
}

const sanitizeConnectorList = (connectors?: string[]): string[] => {
	if (!connectors || connectors.length === 0) {
		return [...DEFAULT_CONNECTORS]
	}

	const connectorSet = new Set<string>()
	for (const connector of connectors) {
		const normalized = connector.trim().toLowerCase()
		if (normalized) {
			connectorSet.add(normalized === 'google' ? 'sheets' : normalized)
		}
	}

	if (connectorSet.size === 0) {
		return [...DEFAULT_CONNECTORS]
	}

	return [...connectorSet]
}

export const generateDAG = async ({
	naturalLanguage,
	availableConnectors,
}: GenerateDAGInput): Promise<GeneratedDAG> => {
	const payload = await apiRequest<{ dag_json: GeneratedDAG }>('/workflow/generate', {
		method: 'POST',
		body: JSON.stringify({
			natural_language: naturalLanguage,
			available_connectors: sanitizeConnectorList(availableConnectors),
		}),
	})

	return payload.dag_json
}

export const getPastWorkflows = async (): Promise<Workflow[]> =>
	apiRequest<Workflow[]>('/workflow/past')

export const saveWorkflow = async (
	input: SaveWorkflowInput,
): Promise<SaveWorkflowResponse> =>
	apiRequest<SaveWorkflowResponse>('/workflow/save', {
		method: 'POST',
		body: JSON.stringify({
			name: input.name,
			natural_language: input.naturalLanguage,
			dag_json: input.dagJson,
		}),
	})
