import { useMemo } from 'react'
import type { Segment } from '@/lib/types'
import { SEGMENT_COLOURS } from '@/lib/colours'
import { formatInt } from '@/lib/formatters'
import { EChart, baseTooltip } from './EChart'

export function SegmentDonut({ segments, total }: { segments: Segment[]; total: number }) {
  const option = useMemo(
    () => ({
      tooltip: { ...baseTooltip, trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      series: [
        {
          type: 'pie',
          radius: ['64%', '86%'],
          padAngle: 2,
          itemStyle: { borderRadius: 4 },
          label: { show: false },
          emphasis: { scaleSize: 4 },
          data: segments.map((s) => ({ name: s.name, value: s.count, itemStyle: { color: SEGMENT_COLOURS[s.name] } })),
        },
      ],
    }),
    [segments],
  )

  return (
    <div className="relative mx-auto size-48">
      <EChart option={option} className="h-full" ariaLabel="Customer segment mix donut chart" />
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="num-tabular text-2xl font-bold text-foreground">{formatInt(total)}</span>
        <span className="text-[11px] text-muted-foreground">customers</span>
      </div>
    </div>
  )
}
