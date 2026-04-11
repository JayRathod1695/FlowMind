export type StepStatus = 'pending' | 'running' | 'completed' | 'failed'

export type ExecutionStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed'

export interface ExecutionStep {
	id?: string
	execution_id?: string
	step_id: string
	connector: string
	tool_name: string
	status: StepStatus
	started_at: string | null
	completed_at: string | null
	duration_ms: number | null
	input_json: Record<string, unknown> | null
	output_json: Record<string, unknown> | null
	retry_count: number
	error_message: string | null
}
