import { SEGMENT_COLOURS } from '@/lib/colours'
import type { SegmentName } from '@/lib/types'
import { cn } from '@/lib/utils'

interface SegmentChipProps {
    segment: SegmentName
    className?: string
}

export function SegmentChip({ segment, className }: SegmentChipProps) {
    const color = SEGMENT_COLOURS[segment]
    return (
        <span
            className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold', className)}
            style={{ background: `${color}20`, color }}
        >
            <span className="size-1.5 rounded-full" style={{ background: color }} aria-hidden />
            {segment}
        </span>
    )
}
