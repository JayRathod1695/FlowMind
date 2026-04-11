import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import DAGCanvas from '@/components/dag/DAGCanvas'
import ConfidenceBadge from '@/components/shared/ConfidenceBadge'
import { Button } from '@/components/ui/button'
import { logExecutionStarted } from '@/lib/logger'
import { ApiError } from '@/services/api.client'
import { startExecution } from '@/services/execution.service'
import { useExecutionStore } from '@/store/execution.store'
import { useWorkflowStore } from '@/store/workflow.store'

const buildWorkflowId = (input: string): string => {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)

  if (slug.length > 0) {
    return `workflow-${slug}`
  }

  return `workflow-${Date.now()}`
}

const toErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Unable to start workflow execution right now. Please try again.'
}

function DAGPage() {
  const navigate = useNavigate()
  const generatedDAG = useWorkflowStore((state) => state.generatedDAG)
  const generatedEdges = useWorkflowStore((state) => state.generatedEdges)
  const workflowConfidence = useWorkflowStore((state) => state.workflowConfidence ?? 0)
  const naturalLanguageInput = useWorkflowStore((state) => state.naturalLanguageInput)
  const initializeExecution = useExecutionStore((state) => state.initializeExecution)

  const [isStartingExecution, setIsStartingExecution] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)

  const handleRunWorkflow = useCallback(async () => {
    if (!generatedDAG?.length) {
      setStartError('No DAG found to execute. Generate a workflow first.')
      return
    }

    setStartError(null)
    setIsStartingExecution(true)

    try {
      const edgesForExecution = generatedEdges ?? []
      const workflowId = buildWorkflowId(naturalLanguageInput)
      const response = await startExecution({
        workflowId,
        dagJson: {
          nodes: generatedDAG,
          edges: edgesForExecution,
          confidence: {
            overall: workflowConfidence,
            rationale: 'Execution requested from DAG page',
          },
          warnings: [],
        },
      })

      logExecutionStarted({
        executionId: response.execution_id,
        workflowId,
      })

      initializeExecution(
        response.execution_id,
        generatedDAG.map((node) => ({
          stepId: node.id,
          connector: node.connector,
          toolName: node.tool_name,
          inputJson: node.input,
          outputJson: null,
          requiresApproval: Boolean(node.requires_approval),
        })),
        response.status === 'running',
      )

      navigate(`/execution/${response.execution_id}`)
    } catch (error) {
      setStartError(toErrorMessage(error))
    } finally {
      setIsStartingExecution(false)
    }
  }, [generatedDAG, generatedEdges, initializeExecution, naturalLanguageInput, navigate, workflowConfidence])

  return (
    <section className="space-y-6 text-[#000000]">
      <header className="space-y-2">
        <h1 className="text-4xl font-semibold tracking-tight text-[#000000]">DAG</h1>
        <p className="text-[#1F1F1F]">Review execution flow, confidence, and launch the workflow run.</p>
      </header>

      <div className="space-y-4 rounded-2xl border border-[#AFAFAF] bg-[#E5E5E5] p-4 shadow-[0_4px_6px_rgba(0,0,0,0.1)] md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-[#000000]">Graph Canvas</h2>
            <p className="text-sm text-[#1F1F1F]">
              {generatedDAG?.length ?? 0} steps and {generatedEdges?.length ?? 0} dependencies
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#1F1F1F]">Workflow Confidence</span>
            <ConfidenceBadge score={workflowConfidence} />
          </div>
        </div>
        <DAGCanvas />
      </div>

      <div className="space-y-3 rounded-2xl border border-[#AFAFAF] bg-[#E5E5E5] p-4 shadow-[0_4px_6px_rgba(0,0,0,0.1)] md:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            className="h-10 bg-[#007AFF] text-[#000000] transition-colors duration-200 hover:bg-[#007AFF]/90"
            onClick={handleRunWorkflow}
            disabled={isStartingExecution || !generatedDAG?.length}
          >
            {isStartingExecution ? 'Starting...' : 'Run Workflow'}
          </Button>
          <Button
            className="h-10 border-[#AFAFAF] bg-[#FFFFFF] text-[#000000] transition-colors duration-200 hover:border-[#007AFF] hover:bg-[#E5E5E5]"
            variant="outline"
            onClick={() => navigate('/')}
          >
            Edit
          </Button>
        </div>
        {startError ? <p className="text-sm text-[#B42318]">{startError}</p> : null}
      </div>
    </section>
  )
}

export default DAGPage
