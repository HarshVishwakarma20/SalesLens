import { useMemo } from 'react'
import { CHART_COLOURS } from '@/lib/colours'
import { formatGBPCompact } from '@/lib/formatters'
import { EChart, baseTooltip } from './EChart'

interface LeakageWaterfallProps {
  gross: number
  returns: number
  net: number
}

export function LeakageWaterfall({ gross, returns, net }: LeakageWaterfallProps) {
  const option = useMemo(() => {
    const labelStyle = { show: true, position: 'top', fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 600 }
    return {
      grid: { left: 8, right: 8, top: 28, bottom: 24 },
      tooltip: {
        ...baseTooltip,
        trigger: 'axis',
        axisPointer: { type: 'none' },
        formatter: (params: { seriesName: string; name: string; value: number }[]) => {
          const p = params.find((x) => x.seriesName === 'Value')
          return p ? `${p.name}: ${formatGBPCompact(p.name === 'Returns' ? -p.value : p.value)}` : ''
        },
      },
      xAxis: {
        type: 'category',
        data: ['Gross Sales', 'Returns', 'Net Revenue'],
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#1B3A45' } },
        axisLabel: { color: CHART_COLOURS.axis, fontSize: 10 },
      },
      yAxis: { type: 'value', show: false, min: 0 },
      series: [
        {
          name: 'Offset',
          type: 'bar',
          stack: 'w',
          silent: true,
          itemStyle: { color: 'transparent' },
          data: [0, net, 0],
        },
        {
          name: 'Value',
          type: 'bar',
          stack: 'w',
          barWidth: '38%',
          data: [
            { value: gross, itemStyle: { color: CHART_COLOURS.sales, borderRadius: [6, 6, 0, 0] }, label: { ...labelStyle, color: CHART_COLOURS.sales, formatter: formatGBPCompact(gross) } },
            { value: returns, itemStyle: { color: CHART_COLOURS.returns, borderRadius: [6, 6, 0, 0] }, label: { ...labelStyle, color: CHART_COLOURS.returns, formatter: formatGBPCompact(-returns) } },
            { value: net, itemStyle: { color: CHART_COLOURS.net, borderRadius: [6, 6, 0, 0] }, label: { ...labelStyle, color: CHART_COLOURS.net, formatter: formatGBPCompact(net) } },
          ],
        },
      ],
    }
  }, [gross, returns, net])

  return <EChart option={option} className="h-56" ariaLabel="Revenue leakage waterfall from gross sales to net revenue" />
}
