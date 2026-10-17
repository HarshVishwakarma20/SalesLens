import { useNavigate } from 'react-router-dom'
import { ArrowRight, PlayCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const DEMO_STATS = [
  { label: 'Customers', value: '4,334' },
  { label: 'Revenue', value: '£8.27M' },
  { label: 'Repeat', value: '65.3%', positive: true },
]

const BAR_HEIGHTS = [
  ['40%', 'bg-accent/30'],
  ['55%', 'bg-accent/40'],
  ['35%', 'bg-accent/50'],
  ['70%', 'bg-accent/60'],
  ['60%', 'bg-accent/70'],
  ['80%', 'bg-accent/80'],
  ['100%', 'bg-accent'],
] as const

export function DemoCard() {
  const navigate = useNavigate()

  return (
    <section className="sl-card flex flex-col justify-between p-6">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex size-11 items-center justify-center rounded-[10px] bg-accent/15 text-accent">
            <PlayCircle className="size-5" aria-hidden />
          </div>
          <Badge tone="positive" size="md">
            Instant
          </Badge>
        </div>
        <h3 className="text-lg font-semibold text-foreground">Try the demo</h3>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">
          Pre-loaded with 4,334 UCI Online Retail customer profiles and transactions.
        </p>
        <div className="flex h-40 flex-col justify-between rounded-xl border border-border bg-raised/70 p-3.5">
          <dl className="grid grid-cols-3 gap-2 text-center">
            {DEMO_STATS.map((stat) => (
              <div key={stat.label} className="rounded-lg border border-border/60 bg-card/70 p-1.5">
                <dt className="text-[10px] uppercase text-faint">{stat.label}</dt>
                <dd className={`num-tabular font-mono text-sm font-semibold ${stat.positive ? 'text-positive' : 'text-foreground'}`}>
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
          <div className="flex h-12 w-full items-end gap-1 px-1 pt-2" aria-hidden>
            {BAR_HEIGHTS.map(([height, colour], i) => (
              <div key={i} className={`flex-1 rounded-t ${colour}`} style={{ height }} />
            ))}
          </div>
          <div className="flex items-center justify-between text-[11px] text-faint">
            <span>13 months tracked</span>
            <span className="font-medium text-positive">Verified Clean</span>
          </div>
        </div>
      </div>
      <div className="mt-4 border-t border-border/60 pt-3">
        <Button variant="primary" className="w-full" onClick={() => navigate('/overview')}>
          Open demo
          <ArrowRight className="size-4" aria-hidden />
        </Button>
      </div>
    </section>
  )
}
