import ExecutionPanelStep from '@/components/execution/ExecutionPanel.step'
import { useExecutionStore } from '@/store/execution.store'

function ExecutionPanel() {
  const steps = useExecutionStore((state) => state.steps)
  const stepStatuses = useExecutionStore((state) => state.stepStatuses)
  const stepMeta = useExecutionStore((state) => state.stepMeta)
  const pendingApprovalStepId = useExecutionStore((state) => state.pendingApprovalStepId)

  if (steps.length === 0) {
    return (
      <section className="rounded-2xl border border-[#AFAFAF] bg-[#E5E5E5] p-6 shadow-[0_4px_6px_rgba(0,0,0,0.1)]">
        <h2 className="text-xl font-semibold text-[#000000]">Execution Steps</h2>
        <p className="mt-2 text-sm text-[#1F1F1F]">
          No steps loaded yet. Start a workflow from the DAG page.
        </p>
      </section>
    )
  }

  return (
    <section className="space-y-3 rounded-2xl border border-[#AFAFAF] bg-[#E5E5E5] p-4 shadow-[0_4px_6px_rgba(0,0,0,0.1)] md:p-6">
      <h2 className="text-xl font-semibold text-[#000000]">Execution Steps</h2>
      {steps.map((step) => (
        <ExecutionPanelStep
          key={step.stepId}
          stepId={step.stepId}
          connector={step.connector}
          toolName={step.toolName}
          status={stepStatuses[step.stepId] ?? 'pending'}
          durationMs={stepMeta[step.stepId]?.durationMs ?? null}
          inputJson={step.inputJson}
          outputJson={stepMeta[step.stepId]?.outputJson ?? step.outputJson}
          errorMessage={stepMeta[step.stepId]?.errorMessage ?? null}
          isAwaitingApproval={pendingApprovalStepId === step.stepId}
        />
      ))}
    </section>
  )
}

export default ExecutionPanel
