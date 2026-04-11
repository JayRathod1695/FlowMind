import { useParams } from 'react-router-dom'

import ApprovalGate from '@/components/execution/ApprovalGate'
import ExecutionPanel from '@/components/execution/ExecutionPanel'
import LogFilters from '@/components/logs/LogFilters'
import LogViewer from '@/components/logs/LogViewer'
import { useExecutionStream } from '@/hooks/useExecutionStream'
import { useExecutionStore } from '@/store/execution.store'

function ExecutionPage() {
  const { id } = useParams<{ id: string }>()
  const executionId = useExecutionStore((state) => state.executionId)
  const isPaused = useExecutionStore((state) => state.isPaused)
  const isRunning = useExecutionStore((state) => state.isRunning)
  const activeExecutionId = id ?? executionId
  const { isConnected } = useExecutionStream(activeExecutionId)

  const executionStateLabel = isPaused ? 'Paused' : isRunning ? 'Running' : 'Complete'

  return (
    <section className="space-y-6 text-[#000000]">
      <header className="space-y-2">
        <h1 className="text-4xl font-semibold tracking-tight text-[#000000]">Execution</h1>
        <p className="text-[#1F1F1F]">Live workflow execution monitoring and approval control.</p>
      </header>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#AFAFAF] bg-[#E5E5E5] p-4 shadow-[0_4px_6px_rgba(0,0,0,0.1)]">
        <span className="text-sm font-medium">Execution: {activeExecutionId ?? 'unknown'}</span>
        <span className="rounded-full border border-[#AFAFAF] bg-[#FFFFFF] px-3 py-1 text-xs font-semibold text-[#000000]">
          {executionStateLabel}
        </span>
        <span className={isConnected ? 'text-xs font-medium text-[#16A34A]' : 'text-xs font-medium text-[#D97706]'}>
          {isConnected ? 'SSE connected' : 'SSE reconnecting...'}
        </span>
      </div>

      {isPaused ? <ApprovalGate /> : null}
      <ExecutionPanel />

      <section className="space-y-3 rounded-2xl border border-[#AFAFAF] bg-[#E5E5E5] p-4 shadow-[0_4px_6px_rgba(0,0,0,0.1)] md:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-[#000000]">Live Logs</h2>
          <span className="text-xs text-[#1F1F1F]">Virtualized rendering</span>
        </div>
        <LogFilters />
        <LogViewer className="h-[320px]" />
      </section>
    </section>
  )
}

export default ExecutionPage
