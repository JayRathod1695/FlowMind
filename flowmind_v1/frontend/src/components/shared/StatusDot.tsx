import { cn } from '@/lib/utils'
import type { ConnectorHealthStatus } from '@/types/connector.types'

export type StatusDotState = ConnectorHealthStatus | 'unknown'

interface StatusDotProps {
	state: StatusDotState
	className?: string
}

const dotClasses: Record<StatusDotState, string> = {
	healthy: 'bg-[#16A34A]',
	degraded: 'bg-[#D97706]',
	down: 'bg-[#DC2626]',
	unknown: 'bg-[#AFAFAF]',
}

function StatusDot({ state, className }: StatusDotProps) {
	return (
		<span className={cn('relative inline-flex h-3.5 w-3.5 items-center justify-center', className)} aria-label={`Status: ${state}`}>
			{state === 'healthy' ? <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#16A34A]/60" aria-hidden="true" /> : null}
			{state === 'down' ? <span className="absolute inline-flex h-full w-full animate-pulse rounded-full bg-[#DC2626]/45" aria-hidden="true" /> : null}
			<span className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', dotClasses[state])} aria-hidden="true" />
		</span>
	)
}

export default StatusDot
