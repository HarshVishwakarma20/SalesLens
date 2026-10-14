import { TrendingUp } from 'lucide-react'
import type { Kpi } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { InfoTip } from '@/components/ui/info-tip'
import { Sparkline } from '@/components/charts/Sparkline'

const TONE_COLOURS: Record<Kpi['tone'], string> = {
  accent: '#14B8A6',
  'accent-2': '#0EA5E9',
  warning: '#FBBF24',
  positive: '#34D399',
}

export function KpiCard({ kpi }: { kpi: Kpi }) {
  return (
    <article className="sl-card flex flex-col gap-3 p-4">
      <header className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{kpi.label}</h3>
          {kpi.badge ? (
            <Badge tone="warning" className="uppercase tracking-wide">
              {kpi.badge}
            </Badge>
          ) : null}
        </div>
        <InfoTip text={kpi.tooltip} />
      </header>

      <p className="num-tabular text-3xl font-bold tracking-tight text-foreground">
        {kpi.prefix ? <span className="mr-1 text-2xl text-muted-foreground">{kpi.prefix}</span> : null}
        {kpi.value}
      </p>

      <footer className="flex items-end justify-between gap-2 border-t border-border pt-3">
        {kpi.delta ? (
          <span className="flex items-center gap-1 text-xs font-medium text-positive">
            <TrendingUp className="size-3.5" aria-hidden />
            {kpi.delta}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">{kpi.note}</span>
        )}
        <Sparkline data={kpi.trend} color={TONE_COLOURS[kpi.tone]} className="h-6 w-16 shrink-0" />
      </footer>
    </article>
  )
}
