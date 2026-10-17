import { useMemo } from 'react'
import type { DailyPoint } from '@/lib/types'
import { CHART_COLOURS } from '@/lib/colours'
import { EChart, baseTooltip } from './EChart'

export function DailyAnomalyChart({ data }: { data: DailyPoint[] }) {
  const option = useMemo(
    () => ({
      grid: { left: 8, right: 8, top: 12, bottom: 8 },
      tooltip: { ...baseTooltip, trigger: 'axis', valueFormatter: (v: number) => `£${v.toLocaleString('en-GB')}` },
      xAxis: { type: 'category', data: data.map((d) => d.date), show: false, boundaryGap: false },
      yAxis: { type: 'value', show: false, splitLine: { show: false } },
      series: [
        {
          name: 'Daily sales',
          type: 'line',
          showSymbol: false,
          smooth: 0.2,
          lineStyle: { color: CHART_COLOURS.sales, width: 1.25 },
          areaStyle: { color: 'rgba(20,184,166,0.08)' },
          data: data.map((d) => d.sales),
        },
        {
          name: 'Flagged',
          type: 'scatter',
          symbolSize: 7,
          itemStyle: { color: CHART_COLOURS.returns, borderColor: '#0C1D24', borderWidth: 1.5 },
          data: data.map((d) => (d.flagged ? d.sales : null)),
        },
      ],
    }),
    [data],
  )

  return <EChart option={option} className="h-40" ariaLabel="Daily sales line chart with flagged anomaly days" />
}
