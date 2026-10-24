import { useMemo } from 'react'
import type { MonthlyPoint } from '@/lib/types'
import { CHART_COLOURS } from '@/lib/colours'
import { formatAxisK } from '@/lib/formatters'
import { EChart, baseTooltip } from './EChart'

export function MonthlySalesChart({ data }: { data: MonthlyPoint[] }) {
  const option = useMemo(
    () => ({
      animationDuration: 700,
      grid: { left: 44, right: 36, top: 24, bottom: 28 },
      tooltip: {
        ...baseTooltip,
        trigger: 'axis',
        axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(20,184,166,0.06)' } },
        valueFormatter: (v: number) => (v < 20 ? `${v}%` : `£${v}k`),
      },
      xAxis: {
        type: 'category',
        data: data.map((d) => d.month),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#1B3A45' } },
        axisLabel: { color: CHART_COLOURS.axis, fontSize: 9, fontFamily: 'JetBrains Mono' },
      },
      yAxis: [
        {
          type: 'value',
          max: 1400,
          interval: 200,
          splitLine: { lineStyle: { color: CHART_COLOURS.grid, type: 'dashed' } },
          axisLabel: {
            color: CHART_COLOURS.axis,
            fontSize: 9,
            fontFamily: 'JetBrains Mono',
            formatter: (v: number) => (v % 400 === 0 || v === 200 ? formatAxisK(v) : ''),
          },
        },
        {
          type: 'value',
          min: 0,
          max: 12,
          interval: 4,
          splitLine: { show: false },
          axisLabel: { color: CHART_COLOURS.returnRate, fontSize: 9, fontFamily: 'JetBrains Mono', formatter: '{value}%' },
        },
      ],

      series: [
        {
          name: 'Sales',
          type: 'bar',
          barWidth: 9,
          barGap: '40%',
          data: data.map((d) => ({
            value: d.sales,
            itemStyle: { color: CHART_COLOURS.sales, opacity: d.partial ? 0.55 : 1, borderRadius: [2, 2, 0, 0] },
          })),
        },
        {
          name: 'Returns',
          type: 'bar',
          barWidth: 6,
          data: data.map((d) => ({
            value: d.returns,
            itemStyle: { color: CHART_COLOURS.returns, opacity: d.partial ? 0.55 : 1, borderRadius: [2, 2, 0, 0] },
          })),
        },
        {
          name: 'Return %',
          type: 'line',
          yAxisIndex: 1,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { color: CHART_COLOURS.returnRate, width: 2 },
          itemStyle: { color: '#0C1D24', borderColor: CHART_COLOURS.returnRate, borderWidth: 1.5 },
          data: data.map((d) => d.returnRate),
        },
      ],
    }),
    [data],
  )

  return <EChart option={option} className="h-72" ariaLabel="Monthly sales and returns bar chart with return rate line" />
}
