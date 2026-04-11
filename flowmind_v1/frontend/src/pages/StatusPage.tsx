import LogFilters from '@/components/logs/LogFilters'
import LogViewer from '@/components/logs/LogViewer'
import ConnectorGrid from '@/components/status/ConnectorGrid'
import SubsystemGraph from '@/components/status/SubsystemGraph'
import SystemMetrics from '@/components/status/SystemMetrics'
import { useConnectorStatus } from '@/hooks/useConnectorStatus'
import { useExecutionStream } from '@/hooks/useExecutionStream'
import { useExecutionStore } from '@/store/execution.store'

function StatusPage() {
  const executionId = useExecutionStore((state) => state.executionId)
  const { isLoading, error } = useConnectorStatus()
  const { isConnected } = useExecutionStream(executionId)

  return (
    <section className="space-y-6 text-[#000000]">
      <header className="space-y-2">
        <h1 className="text-4xl font-semibold tracking-tight text-[#000000]">Status</h1>
        <p className="text-[#1F1F1F]">Live health telemetry, subsystem visibility, and real-time execution logs.</p>
      </header>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full border border-[#AFAFAF] bg-[#E5E5E5] px-3 py-1 font-medium text-[#1F1F1F]">
          {isLoading ? 'Refreshing connectors...' : 'Connector polling active'}
        </span>
        <span
          className={`rounded-full border px-3 py-1 font-medium ${
            isConnected
              ? 'border-[#16A34A] bg-[#DCFCE7] text-[#166534]'
              : 'border-[#D97706] bg-[#FEF3C7] text-[#92400E]'
          }`}
        >
          {isConnected ? 'SSE stream connected' : executionId ? 'SSE reconnecting' : 'SSE stream idle'}
        </span>
        {error ? <span className="rounded-full border border-[#DC2626] bg-[#FEE2E2] px-3 py-1 font-medium text-[#991B1B]">{error}</span> : null}
      </div>

      <ConnectorGrid />
      <SystemMetrics />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <SubsystemGraph />
        <section className="space-y-3 rounded-2xl border border-[#AFAFAF] bg-[#E5E5E5] p-4 shadow-[0_4px_6px_rgba(0,0,0,0.1)] md:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-[#000000]">Live Logs</h2>
            <span className="text-xs text-[#1F1F1F]">Virtualized rendering</span>
          </div>
          <LogFilters />
          <LogViewer className="h-[320px]" />
        </section>
      </div>
    </section>
  )
}

export default StatusPage
