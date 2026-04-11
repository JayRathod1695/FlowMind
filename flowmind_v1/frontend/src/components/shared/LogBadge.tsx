import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { LogLevel } from '@/types/log.types'

interface LogBadgeProps {
	level: LogLevel
	className?: string
}

const levelClasses: Record<LogLevel, string> = {
	DEBUG: 'border-[#AFAFAF] bg-[#E5E5E5] text-[#1F1F1F]',
	INFO: 'border-[#93C5FD] bg-[#DBEAFE] text-[#1D4ED8]',
	WARN: 'border-[#FCD34D] bg-[#FEF3C7] text-[#92400E]',
	ERROR: 'border-[#FCA5A5] bg-[#FEE2E2] text-[#991B1B]',
}

function LogBadge({ level, className }: LogBadgeProps) {
	return (
		<Badge
			variant="outline"
			className={cn('min-w-14 justify-center font-semibold tracking-wide', levelClasses[level], className)}
		>
			{level}
		</Badge>
	)
}

export default LogBadge
