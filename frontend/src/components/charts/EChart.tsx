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

interface EChartProps {
  option: EChartsCoreOption
  className?: string
  ariaLabel: string
}

export function EChart({ option, className, ariaLabel }: EChartProps) {
  return (
    <div role="img" aria-label={ariaLabel} className={cn('w-full', className)}>
      <ReactEChartsCore
        echarts={echarts}
        option={option}
        notMerge
        lazyUpdate
        style={{ height: '100%', width: '100%' }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  )
}
