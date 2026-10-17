import type { Kpi } from '@/lib/types'
import { Skeleton } from '@/components/ui/skeleton'
import { KpiCard } from './KpiCard'

export function KpiGrid({ kpis }: { kpis?: Kpi[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
      {kpis
        ? kpis.map((kpi) => <KpiCard key={kpi.key} kpi={kpi} />)
        : Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
    </div>
  )
}
