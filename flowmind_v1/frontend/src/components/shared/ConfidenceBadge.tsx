import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type ConfidenceRisk = 'low' | 'medium' | 'high'

export interface ConfidenceBadgeProps {
	score: number
	className?: string
}

const riskClasses: Record<ConfidenceRisk, string> = {
	low: 'border-[#007AFF] bg-[#DBEAFE] text-[#0C4A8A]',
	medium: 'border-[#60A5FA] bg-[#E6F2FF] text-[#1D4ED8]',
	high: 'border-[#AFAFAF] bg-[#E5E5E5] text-[#1F1F1F]',
}

const toPercentage = (score: number): number => {
	const normalized = score <= 1 ? score * 100 : score
	const bounded = Math.min(100, Math.max(0, normalized))
	return Math.round(bounded)
}

export const confidenceRiskForScore = (score: number): ConfidenceRisk => {
	const percentage = toPercentage(score)
	if (percentage >= 80) {
		return 'low'
	}

	if (percentage >= 60) {
		return 'medium'
	}

	return 'high'
}

function ConfidenceBadge({ score, className }: ConfidenceBadgeProps) {
	const percentage = toPercentage(score)
	const risk = confidenceRiskForScore(percentage)

	return (
		<Badge
			className={cn(
				'h-6 rounded-full border px-2.5 font-semibold tracking-tight',
				riskClasses[risk],
				className,
			)}
			variant="outline"
			aria-label={`Confidence ${percentage} percent, ${risk} risk`}
		>
			<span>{percentage}%</span>
			<span className="uppercase tracking-wide">{risk}</span>
		</Badge>
	)
}

export default ConfidenceBadge
