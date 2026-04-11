import { create } from 'zustand'

import type { DAGEdge, DAGNode } from '@/types/workflow.types'

export interface WorkflowStore {
	naturalLanguageInput: string
	generatedDAG: DAGNode[] | null
	generatedEdges: DAGEdge[] | null
	workflowConfidence: number | null
	isGenerating: boolean
	setInput: (value: string) => void
	setDAG: (nodes: DAGNode[], edges: DAGEdge[], confidence: number) => void
	reset: () => void
}

const initialWorkflowState = {
	naturalLanguageInput: '',
	generatedDAG: null,
	generatedEdges: null,
	workflowConfidence: null,
	isGenerating: false,
} as const

export const useWorkflowStore = create<WorkflowStore>((set) => ({
	...initialWorkflowState,
	setInput: (value) => set({ naturalLanguageInput: value }),
	setDAG: (nodes, edges, confidence) =>
		set({
			generatedDAG: nodes,
			generatedEdges: edges,
			workflowConfidence: confidence,
			isGenerating: false,
		}),
	reset: () => set({ ...initialWorkflowState }),
}))
