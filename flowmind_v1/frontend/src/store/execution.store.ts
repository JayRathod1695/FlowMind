import { create } from 'zustand'

import type { StepStatus } from '@/types/execution.types'

export interface ExecutionStepItem {
	stepId: string
	connector: string
	toolName: string
	inputJson: Record<string, unknown> | null
	outputJson: Record<string, unknown> | null
	requiresApproval: boolean
}

export interface StepMeta {
	durationMs: number | null
	errorMessage: string | null
	outputJson: Record<string, unknown> | null
}

export interface StepMetaUpdate {
	durationMs?: number | null
	errorMessage?: string | null
	outputJson?: Record<string, unknown> | null
}

export interface ExecutionStore {
	executionId: string | null
	steps: ExecutionStepItem[]
	stepStatuses: Record<string, StepStatus>
	stepMeta: Record<string, StepMeta>
	isRunning: boolean
	isPaused: boolean
	pendingApprovalStepId: string | null
	initializeExecution: (
		executionId: string,
		steps: ExecutionStepItem[],
		isRunning: boolean,
	) => void
	setStepStatus: (
		stepId: string,
		status: StepStatus,
		meta?: StepMetaUpdate,
	) => void
	setPaused: (stepId?: string | null) => void
	setComplete: () => void
	reset: () => void
}

const initialExecutionState = {
	executionId: null,
	steps: [],
	stepStatuses: {},
	stepMeta: {},
	isRunning: false,
	isPaused: false,
	pendingApprovalStepId: null,
} satisfies Pick<
	ExecutionStore,
	| 'executionId'
	| 'steps'
	| 'stepStatuses'
	| 'stepMeta'
	| 'isRunning'
	| 'isPaused'
	| 'pendingApprovalStepId'
>

export const useExecutionStore = create<ExecutionStore>((set) => ({
	...initialExecutionState,
	initializeExecution: (executionId, steps, isRunning) => {
		const nextStatuses: Record<string, StepStatus> = {}
		for (const step of steps) {
			nextStatuses[step.stepId] = 'pending'
		}

		set({
			executionId,
			steps,
			stepStatuses: nextStatuses,
			stepMeta: {},
			isRunning,
			isPaused: false,
			pendingApprovalStepId: null,
		})
	},
	setStepStatus: (stepId, status, meta) =>
		set((state) => {
			const nextStepStatuses = {
				...state.stepStatuses,
				[stepId]: status,
			}
			const previousMeta = state.stepMeta[stepId] ?? {
				durationMs: null,
				errorMessage: null,
				outputJson: null,
			}
			const nextStepMeta = meta
				? {
					...state.stepMeta,
					[stepId]: {
						durationMs:
							meta.durationMs !== undefined
								? meta.durationMs
								: previousMeta.durationMs,
						errorMessage:
							meta.errorMessage !== undefined
								? meta.errorMessage
								: previousMeta.errorMessage,
						outputJson:
							meta.outputJson !== undefined
								? meta.outputJson
								: previousMeta.outputJson,
					},
				}
				: state.stepMeta
			const hasRunningSteps = Object.values(nextStepStatuses).some(
				(stepStatus) => stepStatus === 'running',
			)

			return {
				stepStatuses: nextStepStatuses,
				stepMeta: nextStepMeta,
				isRunning: hasRunningSteps,
				isPaused: hasRunningSteps ? false : state.isPaused,
			}
		}),
	setPaused: (stepId = null) =>
		set({
			isPaused: true,
			isRunning: false,
			pendingApprovalStepId: stepId,
		}),
	setComplete: () =>
		set({
			isRunning: false,
			isPaused: false,
			pendingApprovalStepId: null,
		}),
	reset: () =>
		set({
			...initialExecutionState,
			steps: [],
			stepStatuses: {},
			stepMeta: {},
		}),
}))
