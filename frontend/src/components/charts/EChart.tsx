import ReactEChartsCoreModule from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart, ScatterChart } from 'echarts/charts'
import {
  DataZoomComponent,
  GridComponent,
  MarkLineComponent,
  TooltipComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsCoreOption } from 'echarts/core'
import { cn } from '@/lib/utils'

// echarts-for-react ships CommonJS; Vite's interop can hand back `{ default: Component }`.
const ReactEChartsCore =
  (ReactEChartsCoreModule as unknown as { default?: typeof ReactEChartsCoreModule }).default ??
  ReactEChartsCoreModule

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  MarkLineComponent,
  CanvasRenderer,
])

export const baseTooltip = {
  backgroundColor: '#112A33',
  borderColor: '#1B3A45',
  borderWidth: 1,
  padding: [8, 10],
  textStyle: { color: '#E8F3F5', fontSize: 11, fontFamily: 'Inter' },
  extraCssText: 'border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.35);',
}

import { useMemo } from 'react'

interface EChartProps {
  option: EChartsCoreOption
  className?: string
  ariaLabel: string
  zoomable?: boolean
}

export function EChart({ option, className, ariaLabel, zoomable = true }: EChartProps) {
  const mergedOption = useMemo(() => {
    if (!zoomable) return option

    const opt = { ...(option as Record<string, unknown>) }
    // If chart has an xAxis and dataZoom is not explicitly defined, add an inside zoom
    if (opt.xAxis && !opt.dataZoom) {
      opt.dataZoom = [
        {
          type: 'inside',
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
          preventDefaultMouseMove: false,
        },
      ]
    }
    return opt as EChartsCoreOption
  }, [option, zoomable])

  return (
    <div role="img" aria-label={ariaLabel} className={cn('h-full w-full', className)}>
      <ReactEChartsCore
        echarts={echarts}
        option={mergedOption}
        notMerge
        lazyUpdate
        style={{ height: '100%', width: '100%' }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  )
}

