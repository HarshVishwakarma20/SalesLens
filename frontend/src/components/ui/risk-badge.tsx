import { cn } from '@/lib/utils'
import { RISK_COLOURS } from '@/lib/colours'
import type { RiskBand } from '@/lib/types'

interface RiskBadgeProps {
    band: RiskBand
    score: number
    className?: string
}

export function RiskBadge({ band, score, className }: RiskBadgeProps) {
    const color = RISK_COLOURS[band]
    return (
        <div className={cn('flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', `bg-${color}/10 text-${color}`, className)}>
            <span className={`size-2 rounded-full bg-${color}`} />
            <span className={`text-${color}`}>Risk {band}</span>
            <span className="ml-1 num-tabular font-mono">{score.toFixed(1)}</span>
        </div>
    )
}
