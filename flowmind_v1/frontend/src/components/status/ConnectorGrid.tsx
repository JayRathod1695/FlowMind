import { Line, LineChart, ResponsiveContainer } from 'recharts'

import StatusDot, { type StatusDotState } from '@/components/shared/StatusDot'
import { Card, CardContent } from '@/components/ui/card'
import { useConnectorStore } from '@/store/connector.store'
import type { ConnectorConnectionStatus } from '@/types/connector.types'

const CONNECTORS = [
  { id: 'jira', label: 'Jira' },
  { id: 'github', label: 'GitHub' },
  { id: 'slack', label: 'Slack' },
  { id: 'sheets', label: 'Google Sheets' },
] as const

const BASE_LATENCY: Record<(typeof CONNECTORS)[number]['id'], number> = { jira: 116, github: 92, slack: 104, sheets: 128 }

const toDotState = (status: ConnectorConnectionStatus | undefined): StatusDotState => {
  if (!status || status === 'disconnected') return 'unknown'
  if (status === 'connecting') return 'degraded'
  if (status === 'error') return 'down'
  return 'healthy'
}

const buildLatency = (seed: number, connected: boolean) =>
  Array.from({ length: 14 }, (_, index) => ({
    index,
    latency: connected ? Math.round(seed + (index % 4 - 1.5) * 6 + (index % 2) * 3) : 0,
  }))

function ConnectorGrid() {
  const connections = useConnectorStore((state) => state.connections)

  return (
    <section className="space-y-3 rounded-2xl border border-[#AFAFAF] bg-[#E5E5E5] p-4 shadow-[0_4px_6px_rgba(0,0,0,0.1)] md:p-5">
      <h2 className="text-xl font-semibold text-[#000000]">Connector Health</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {CONNECTORS.map((connector) => {
          const status = connections[connector.id]?.status
          const connected = status === 'connected'
          const latencyPoints = buildLatency(BASE_LATENCY[connector.id], connected)
          const avgLatency = connected ? Math.round(latencyPoints.reduce((sum, point) => sum + point.latency, 0) / latencyPoints.length) : null

          return (
            <Card key={connector.id} className="border border-[#AFAFAF] bg-[#FFFFFF] py-0 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              <CardContent className="space-y-3 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#000000]">
                    <StatusDot state={toDotState(status)} />
                    {connector.label}
                  </span>
                  <span className="font-mono text-xs text-[#1F1F1F]">{avgLatency ? `${avgLatency} ms` : '-- ms'}</span>
                </div>
                <div className="h-12 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={latencyPoints}>
                      <Line type="monotone" dataKey="latency" stroke={connected ? '#007AFF' : '#AFAFAF'} strokeWidth={2} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </section>
  )
}

export default ConnectorGrid