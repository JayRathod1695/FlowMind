export type WorkflowStatus =
	| 'draft'
	| 'generated'
	| 'saved'
	| 'running'
	| 'completed'
	| 'failed'

export interface DAGNode {
	id: string
	connector: string
	tool_name: string
	input: Record<string, unknown>
	requires_approval?: boolean
	max_attempts?: number
}

export interface DAGEdge {
	from: string
	to: string
}

export interface Workflow {
	id: string
	name: string
	natural_language: string
	dag_json: {
		nodes: DAGNode[]
		edges: DAGEdge[]
		confidence: {
			overall: number
			rationale: string
		}
		warnings: Array<{
			code: string
			message: string
		}>
	}
	created_at: string
	last_executed_at: string | null
	execution_count: number
	status?: WorkflowStatus
}
