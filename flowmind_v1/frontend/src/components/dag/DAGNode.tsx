import type { NodeProps } from '@xyflow/react'
import {
  Bug,
  GitBranch,
  MessageSquare,
  PlugZap,
  Table2,
  Workflow,
  type LucideIcon,
} from 'lucide-react'

import type { DAGCanvasNode, DAGNodeStatus } from '@/components/dag/DAGCanvas.layout'
import ConfidenceBadge from '@/components/shared/ConfidenceBadge'
import { cn } from '@/lib/utils'

const connectorIcons: Record<string, LucideIcon> = {
  jira: Bug,
  github: GitBranch,
  slack: MessageSquare,
  sheets: Table2,
  google: Table2,
}

const ringClasses: Record<DAGNodeStatus, string> = {
  pending: 'border-[#AFAFAF] text-[#1F1F1F]',
  running: 'border-[#007AFF] text-[#007AFF] shadow-[0_0_0_3px_rgba(0,122,255,0.2)]',
  success: 'border-[#16A34A] text-[#166534]',
  failed: 'border-[#DC2626] text-[#991B1B]',
}

const dotClasses: Record<DAGNodeStatus, string> = {
  pending: 'bg-[#AFAFAF]',
  running: 'bg-[#007AFF]',
  success: 'bg-[#16A34A]',
  failed: 'bg-[#DC2626]',
}

const labelByStatus: Record<DAGNodeStatus, string> = {
  pending: 'pending',
  running: 'running',
  success: 'success',
  failed: 'failed',
}

const getConnectorIcon = (connectorName: string): LucideIcon => {
  const normalized = connectorName.trim().toLowerCase()
  return connectorIcons[normalized] ?? (normalized.includes('webhook') ? Workflow : PlugZap)
}

function DAGNode({ data }: NodeProps<DAGCanvasNode>) {
  const Icon = getConnectorIcon(data.connector)
  const isRunning = data.status === 'running'

  return (
    <article className="w-[260px] rounded-xl border border-[#AFAFAF] bg-[#E5E5E5] p-4 shadow-[0_4px_6px_rgba(0,0,0,0.1)] transition-colors duration-200">
      <div className="flex items-start gap-3">
        <div className={cn('relative grid h-10 w-10 place-items-center rounded-xl border bg-[#FFFFFF]', ringClasses[data.status])}>
          {isRunning ? <span className="absolute inset-0 rounded-xl border-2 border-[#007AFF]/60 animate-ping" aria-hidden="true" /> : null}
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[#000000]">{data.toolName}</p>
          <p className="text-xs capitalize text-[#1F1F1F]">{data.connector}</p>
        </div>
        <span className={cn('mt-1 h-2.5 w-2.5 rounded-full', dotClasses[data.status])} aria-label={`Step status: ${labelByStatus[data.status]}`} />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <ConfidenceBadge score={data.confidence} />
        <span className="text-xs capitalize text-[#1F1F1F]">{labelByStatus[data.status]}</span>
      </div>
    </article>
  )
}

export default DAGNode
