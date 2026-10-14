import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowRight, Maximize2, SlidersHorizontal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader } from '@/components/ui/card'
import { InfoTip } from '@/components/ui/info-tip'
import { DataTable, type Column } from '@/components/tables/DataTable'
import { MonthlySalesChart } from '@/components/charts/MonthlySalesChart'
import { SegmentDonut } from '@/components/charts/SegmentDonut'
import { LeakageWaterfall } from '@/components/charts/LeakageWaterfall'
import { CHART_COLOURS, RISK_COLOURS, SEGMENT_COLOURS } from '@/lib/colours'
import { formatInt, formatPercent } from '@/lib/formatters'
import { useFilters } from '@/hooks/useFilters'
import type { Dataset, RiskCustomer } from '@/lib/types'
import { cn } from '@/lib/utils'

function LegendKey({ colour, label, line }: { colour: string; label: string; line?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={line ? 'h-0.5 w-3' : 'size-2.5 rounded-sm'} style={{ background: colour }} aria-hidden />
      <span className="text-muted-foreground">{label}</span>
    </span>
  )
}

export function MonthlySalesPanel({ data }: { data: Dataset['monthly'] }) {
  return (
    <Card className="col-span-12 flex flex-col justify-between p-6 lg:col-span-8">
      <CardHeader
        className="mb-4"
        title="Monthly sales and returns"
        description="Dec 2010 to Dec 2011 • Sales vs Returns in GBP (k)"
        actions={
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <LegendKey colour={CHART_COLOURS.sales} label="Sales" />
            <LegendKey colour={CHART_COLOURS.returns} label="Returns" />
            <LegendKey colour={CHART_COLOURS.returnRate} label="Return %" line />
            <button type="button" onClick={() => toast('Chart fullscreen view')} className="text-faint hover:text-foreground" aria-label="Expand chart">
              <Maximize2 className="size-3.5" />
            </button>
          </div>
        }
      />
      <MonthlySalesChart data={data} />
      <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-3 text-xs text-faint">
        <span className="flex items-center gap-1.5">
          <SlidersHorizontal className="size-3.5" aria-hidden />
          Timeline Brush (Zoom 13 Months)
        </span>
        <div className="relative flex h-3 w-48 items-center rounded border border-border bg-raised px-1" aria-hidden>
          <div className="h-1.5 w-full rounded bg-accent/40" />
          <div className="absolute left-1 h-2.5 w-2 cursor-ew-resize rounded-sm bg-accent" />
          <div className="absolute right-1 h-2.5 w-2 cursor-ew-resize rounded-sm bg-accent" />
        </div>
      </div>
    </Card>
  )
}

export function SegmentMixPanel({ segments, total }: { segments: Dataset['segments']; total: number }) {
  const { isSelected, toggleSegment } = useFilters()

  return (
    <Card className="col-span-12 flex flex-col justify-between p-6 lg:col-span-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">Segment mix</h3>
        <InfoTip text="Click slices or rows to filter global dashboard" />
      </div>
      <SegmentDonut segments={segments} total={total} />
      <ul className="mt-2 flex flex-col gap-1 text-xs">
        {segments.map((seg) => (
          <li key={seg.name}>
            <button
              type="button"
              onClick={() => toggleSegment(seg.name)}
              aria-pressed={isSelected(seg.name)}
              className={cn(
                'flex w-full items-center justify-between rounded p-1 hover:bg-raised/50',
                !isSelected(seg.name) && 'opacity-45',
              )}
            >
              <span className="flex items-center gap-2">
                <span className="size-2.5 rounded-full" style={{ background: SEGMENT_COLOURS[seg.name] }} aria-hidden />
                <span className="text-foreground">{seg.name}</span>
              </span>
              <span className="num-tabular font-mono text-muted-foreground">
                {formatInt(seg.count)} <span className="ml-1 text-[10px] text-faint">({formatPercent(seg.share)})</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export function LeakagePanel({ leakage }: { leakage: Dataset['leakage'] }) {
  const pct = (leakage.returns / leakage.gross) * 100
  return (
    <Card className="col-span-12 p-6 lg:col-span-5">
      <CardHeader
        className="mb-4"
        title="Revenue leakage"
        description="Waterfall breakdown from Gross Sales to Net Revenue"
        actions={
          <Badge tone="negative" size="md">
            {pct.toFixed(2)}% leakage
          </Badge>
        }
      />
      <LeakageWaterfall {...leakage} />
    </Card>
  )
}

const RISK_TONE = { Low: 'positive', Medium: 'warning', High: 'warning', Critical: 'negative' } as const

export function RiskCustomersPanel({ customers }: { customers: RiskCustomer[] }) {
  const columns: Column<RiskCustomer>[] = [
    { key: 'id', header: 'ID', render: (r) => <span className="num-tabular font-mono text-xs font-semibold text-foreground">#{r.id}</span> },
    {
      key: 'segment',
      header: 'Segment',
      render: (r) => (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-raised px-2 py-0.5 text-[11px] text-foreground">
          <span className="size-1.5 rounded-full" style={{ background: SEGMENT_COLOURS[r.segment] }} aria-hidden />
          {r.segment}
        </span>
      ),
    },
    {
      key: 'band',
      header: 'Risk Band',
      render: (r) => (
        <Badge tone={RISK_TONE[r.band]} className="rounded-md text-[11px]">
          {r.band}
        </Badge>
      ),
    },
    {
      key: 'score',
      header: 'Score',
      align: 'right',
      render: (r) => (
        <span className="flex items-center justify-end gap-2">
          <span className="h-1.5 w-12 overflow-hidden rounded-full bg-raised" aria-hidden>
            <span className="block h-full rounded-full" style={{ width: `${r.score}%`, background: RISK_COLOURS[r.band] }} />
          </span>
          <span className="num-tabular w-9 font-mono text-xs font-semibold text-foreground">{r.score.toFixed(1)}</span>
        </span>
      ),
    },
  ]

  return (
    <Card className="col-span-12 p-6 lg:col-span-7">
      <CardHeader
        className="mb-4"
        title="Highest-risk customers"
        description="Top accounts flagged by RFM decay and return velocity"
        actions={
          <Link to="/risk" className="flex items-center gap-1 text-xs font-medium text-accent hover:underline">
            View all <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        }
      />
      <DataTable columns={columns} rows={customers.slice(0, 6)} rowKey={(r) => r.id} caption="Highest-risk customers" />
    </Card>
  )
}
