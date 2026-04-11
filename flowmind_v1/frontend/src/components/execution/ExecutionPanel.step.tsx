import { useMemo, useState } from 'react'
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  LoaderCircle,
  XCircle,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import type { StepStatus } from '@/types/execution.types'

interface ExecutionPanelStepProps {
  stepId: string
  connector: string
  toolName: string
  status: StepStatus
  durationMs: number | null
  inputJson: Record<string, unknown> | null
  outputJson: Record<string, unknown> | null
  errorMessage: string | null
  isAwaitingApproval: boolean
}

const statusStyles: Record<StepStatus, string> = {
  pending: 'text-[#1F1F1F]',
  running: 'text-[#007AFF]',
  completed: 'text-[#16A34A]',
  failed: 'text-[#DC2626]',
}

const formatDuration = (durationMs: number | null): string => {
  if (durationMs === null) {
    return 'Pending'
  }

  return `${durationMs} ms`
}

const toPayload = (payload: Record<string, unknown> | null): string => {
  if (!payload) {
    return 'No payload available.'
  }

  return JSON.stringify(payload, null, 2)
}

function ExecutionPanelStep({
  stepId,
  connector,
  toolName,
  status,
  durationMs,
  inputJson,
  outputJson,
  errorMessage,
  isAwaitingApproval,
}: ExecutionPanelStepProps) {
  const [expanded, setExpanded] = useState(false)

  const StatusIcon =
    status === 'running'
      ? LoaderCircle
      : status === 'completed'
        ? CheckCircle2
        : status === 'failed'
          ? XCircle
          : Circle

  const inputPayload = useMemo(() => toPayload(inputJson), [inputJson])
  const outputPayload = useMemo(() => toPayload(outputJson), [outputJson])

  return (
    <article className="rounded-xl border border-[#AFAFAF] bg-[#FFFFFF] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusIcon
              className={cn('h-4 w-4 shrink-0', statusStyles[status], status === 'running' ? 'animate-spin' : '')}
            />
            <p className="truncate font-medium">
              {connector}.{toolName}
            </p>
            {isAwaitingApproval ? <span className="rounded-full border border-[#D97706] bg-[#FFF4D6] px-2 py-0.5 text-xs text-[#92400E]">Approval Required</span> : null}
          </div>
          <p className="mt-1 text-xs text-[#1F1F1F]">Step ID: {stepId}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#1F1F1F]">{formatDuration(durationMs)}</span>
          <button
            type="button"
            className="inline-flex items-center rounded-md border border-[#AFAFAF] bg-[#E5E5E5] px-2 py-1 text-xs font-medium text-[#000000] transition-colors duration-200 hover:border-[#007AFF] hover:bg-[#FFFFFF]"
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? <ChevronDown className="mr-1 h-3.5 w-3.5" /> : <ChevronRight className="mr-1 h-3.5 w-3.5" />}
            Details
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="mt-3 space-y-2">
          {errorMessage ? <p className="rounded-md border border-[#DC2626] bg-[#FEE2E2] px-2 py-1 text-xs text-[#991B1B]">{errorMessage}</p> : null}
          <div className="grid gap-2 md:grid-cols-2">
            <pre className="max-h-56 overflow-auto rounded-md border border-[#AFAFAF] bg-[#E5E5E5] p-2 text-left text-xs text-[#000000]">{inputPayload}</pre>
            <pre className="max-h-56 overflow-auto rounded-md border border-[#AFAFAF] bg-[#E5E5E5] p-2 text-left text-xs text-[#000000]">{outputPayload}</pre>
          </div>
        </div>
      ) : null}
    </article>
  )
}

export default ExecutionPanelStep
