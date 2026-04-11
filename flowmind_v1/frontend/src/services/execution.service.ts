import { apiRequest } from '@/services/api.client'
import type { ExecutionStatus } from '@/types/execution.types'
import type { Workflow } from '@/types/workflow.types'

export interface StartExecutionInput {
	workflowId: string
	dagJson: Workflow['dag_json']
}

export interface StartExecutionResponse {
	execution_id: string
	status: ExecutionStatus
	workflow_id: string
}

export interface ApproveStepInput {
	executionId: string
	stepId: string
	approved: boolean
}

export interface ApproveStepResponse {
	execution_id: string
	step_id: string
	approved: boolean
	status: 'recorded'
}

export interface ExecutionStatusResponse {
	execution_id: string
	workflow_id: string
	status: ExecutionStatus
	current_step: string | null
	pending_approval_steps: string[]
	error_message: string | null
	started_at: string | null
	completed_at: string | null
}

export const startExecution = async (
	input: StartExecutionInput,
): Promise<StartExecutionResponse> =>
	apiRequest<StartExecutionResponse>('/execution/start', {
		method: 'POST',
		body: JSON.stringify({
			workflow_id: input.workflowId,
			dag_json: input.dagJson,
		}),
	})

export const approveStep = async (
	input: ApproveStepInput,
): Promise<ApproveStepResponse> =>
	apiRequest<ApproveStepResponse>(`/execution/${input.executionId}/approve`, {
		method: 'POST',
		body: JSON.stringify({
			step_id: input.stepId,
			approved: input.approved,
		}),
	})

export const getExecutionStatus = async (
	executionId: string,
): Promise<ExecutionStatusResponse> =>
	apiRequest<ExecutionStatusResponse>(`/execution/${executionId}/status`)
