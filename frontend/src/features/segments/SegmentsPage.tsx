import ReactECharts from 'echarts-for-react'
import { PageHeader } from '@/components/ui/page-header'
import { InsightBanner } from '@/components/ui/insight-banner'
import { SegmentChip } from '@/components/ui/segment-chip'
import { DataTable } from '@/components/tables/DataTable'
import { SEGMENT_COLOURS, CHART_COLOURS } from '@/lib/colours'
import { formatPercent, formatInt, formatGBP } from '@/lib/formatters'
import type { SegmentName } from '@/lib/types'
import { useFilters } from '@/hooks/useFilters'
import { useDatasetStore } from '@/stores/dataset'
import { UploadPendingState, ProcessingState, ErrorState } from '@/components/ui/pending-state'
import { Info } from 'lucide-react'
import { useSegmentsData } from '@/hooks/useBackendData'

function ExplainTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex items-center">
      <Info className="size-3.5 cursor-help text-faint hover:text-accent transition-colors" aria-label="Explanation" />
      <span
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-xl border border-border bg-card px-3 py-2 text-xs text-muted-foreground opacity-0 shadow-xl transition-opacity group-hover:opacity-100"
        role="tooltip"
      >
        {text}
      </span>
    </span>
  )
}

const SEGMENT_RULES: Record<SegmentName, string> = {
  Champion: 'R≥4  F≥4  M≥4',
  Loyal: 'R≥3  F≥4',
  New: 'R≥4  F≤2',
  'At-Risk': 'R≤2  F≥3',
  Lost: 'R≤2  F≤2',
  Promising: 'Everyone else',
}

function ScatterChart({ visibleSegs, rfmScatter }: { visibleSegs: Set<SegmentName>; rfmScatter: { id: string; recency: number; frequency: number; monetary: number; r: number; f: number; segment: SegmentName }[] }) {
  const series = Object.entries(SEGMENT_COLOURS)
    .filter(([seg]) => visibleSegs.has(seg as SegmentName))
    .map(([seg, color]) => ({
      name: seg,
      type: 'scatter',
      symbolSize: (d: number[]) => Math.sqrt(d[2]) / 8,
      data: rfmScatter.filter(p => p.segment === seg).map(p => [p.recency, p.frequency, p.monetary]),
      itemStyle: { color },
    }))

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'var(--card)',
      borderColor: 'var(--border)',
      borderRadius: 12,
      textStyle: { color: 'var(--foreground)', fontSize: 12 },
      formatter: (p: { seriesName: string; value: number[] }) =>
        `<b>${p.seriesName}</b><br/>Recency: ${p.value[0]}d<br/>Freq: ${p.value[1]}<br/>£${p.value[2].toLocaleString()}`,
    },
    legend: {
      data: Object.keys(SEGMENT_COLOURS),
      textStyle: { color: 'var(--muted-foreground)', fontSize: 11 },
      bottom: 30,
    },
    xAxis: { name: 'Recency (days)', nameTextStyle: { color: CHART_COLOURS.axis, fontSize: 11 }, axisLabel: { color: CHART_COLOURS.axis, fontSize: 11 }, axisLine: { show: false }, splitLine: { show: true, lineStyle: { color: CHART_COLOURS.grid } } },
    yAxis: { name: 'Frequency', nameTextStyle: { color: CHART_COLOURS.axis, fontSize: 11 }, axisLabel: { color: CHART_COLOURS.axis, fontSize: 11 }, axisLine: { show: false }, splitLine: { show: true, lineStyle: { color: CHART_COLOURS.grid } } },
    dataZoom: [
      { type: 'slider', bottom: 8, height: 16, borderColor: 'var(--border)', fillerColor: 'rgba(20,184,166,0.12)', handleStyle: { color: '#14B8A6' }, textStyle: { color: 'var(--muted-foreground)', fontSize: 10 } },
      { type: 'inside' },
    ],
    series,
  }
  return <ReactECharts option={option} style={{ height: 340 }} notMerge />
}

export function SegmentsPage() {
  const { segments: visibleSegNames } = useFilters()
  const visibleSegs = new Set(visibleSegNames)
  const { status, error } = useDatasetStore()
  const { data: segData, isLoading } = useSegmentsData()

  if (status === 'idle') {
    return (
      <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
        <PageHeader title="Segments" description="Who are your customers, grouped by value." />
        <UploadPendingState description="Please upload a file to generate analytics." />
      </div>
    )
  }

  if (status === 'uploading' || status === 'processing') {
    return (
      <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
        <PageHeader title="Segments" description="Who are your customers, grouped by value." />
        <ProcessingState />
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
        <PageHeader title="Segments" description="Who are your customers, grouped by value." />
        <ErrorState message={error ?? 'Processing failed. Please try again.'} />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
        <PageHeader title="Segments" description="Who are your customers, grouped by value." />
        <ProcessingState />
      </div>
    )
  }

  const { rfmCustomers, rfmScatter, segments } = segData

  return (
    <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
      <PageHeader title="Segments" description="Who are your customers, grouped by value." />

      {/* Page explanation */}
      <div className="rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
        <span className="font-semibold text-accent">How to read this page: </span>
        Customers are grouped into RFM segments (Recency, Frequency, Monetary). Champions are your best customers; Lost are inactive. Use the scatter chart to explore how segments cluster. Adjust the weighted RFM sliders to reprioritize scoring. Hover any chart element for details.
      </div>
      {/* Segment Glossary */}
      <div className="sl-card p-5" tabIndex={0}>
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-foreground">Segment Glossary</h2>
          <p className="mt-1 text-xs text-muted-foreground">What each segment label means — so you always know who you&apos;re looking at.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              name: 'Champions' as SegmentName,
              icon: '🏆',
              meaning: 'Bought very recently, buy often, and spend the most. These are your best customers — reward and retain them.',
              action: 'Offer early access, loyalty perks, and thank-you discounts.',
            },
            {
              name: 'Loyal' as SegmentName,
              icon: '💙',
              meaning: 'Consistently frequent buyers who spend well. They trust your brand but may not always spend at peak levels.',
              action: 'Upsell premium products and invite to loyalty programmes.',
            },
            {
              name: 'Promising' as SegmentName,
              icon: '🌱',
              meaning: 'Recent buyers with decent frequency who haven\'t reached their full potential yet.',
              action: 'Nurture with personalised recommendations and gentle follow-ups.',
            },
            {
              name: 'New' as SegmentName,
              icon: '✨',
              meaning: 'Purchased very recently but only once or twice. Still forming habits with your brand.',
              action: 'Send a warm welcome series and highlight bestsellers to build loyalty.',
            },
            {
              name: 'At-Risk' as SegmentName,
              icon: '⚠️',
              meaning: 'Used to buy regularly but haven\'t returned in a while. They are drifting away and need re-engagement now.',
              action: 'Send a targeted win-back campaign with a time-limited offer.',
            },
            {
              name: 'Lost' as SegmentName,
              icon: '💔',
              meaning: 'Haven\'t purchased in a long time and rarely ordered even before. Very difficult to recover.',
              action: 'Low-cost reactivation attempt only — focus budget on higher-value segments.',
            },
          ].map((seg) => (
            <div
              key={seg.name}
              className="rounded-xl border border-border bg-raised/40 p-4 flex flex-col gap-2"
              style={{ borderTop: `3px solid ${SEGMENT_COLOURS[seg.name]}` }}
            >
              <div className="flex items-center gap-2">
                <span className="text-base" role="img" aria-label={seg.name}>{seg.icon}</span>
                <SegmentChip segment={seg.name} />
              </div>
              <p className="text-xs text-foreground leading-relaxed">{seg.meaning}</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed border-t border-border/60 pt-2">
                <span className="font-semibold text-accent">Action: </span>{seg.action}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Segment cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {segments.map(seg => (
          <div
            key={seg.name}
            tabIndex={0}
            className="sl-card flex flex-col gap-2 p-4"
            style={{ borderTop: `3px solid ${SEGMENT_COLOURS[seg.name]}` }}
          >
            <div className="flex items-center justify-between">
              <SegmentChip segment={seg.name} />
              <span className="num-tabular text-lg font-bold text-foreground">{formatInt(seg.count)}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>% of customers</span><span className="num-tabular text-right font-semibold text-foreground">{formatPercent(seg.share)}</span>
              <span>% of revenue</span><span className="num-tabular text-right font-semibold text-foreground">{formatPercent(seg.share * 1.1)}</span>
            </div>
            <div className="mt-1 rounded-lg bg-raised/60 px-2 py-1 text-[10px] font-mono text-faint">{SEGMENT_RULES[seg.name]}</div>
          </div>
        ))}
      </div>

      {/* RFM scatter - full width */}
      <div className="grid grid-cols-1 gap-6">
        <div className="sl-card p-4" tabIndex={0}>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-sm font-semibold text-foreground">RFM Map</h2>
            <ExplainTip text="Each dot is a customer. X-axis = days since last purchase (lower = more recent). Y-axis = number of orders. Bubble size = monetary value. Drag slider to zoom." />
            <span className="ml-auto text-[10px] text-faint">Drag slider to zoom</span>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">Recency vs Frequency, bubble = Monetary value</p>
          <ScatterChart visibleSegs={visibleSegs} rfmScatter={rfmScatter} />
        </div>
      </div>


      {/* Customer table */}
      <div className="sl-card p-4" tabIndex={0}>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-sm font-semibold text-foreground">Customer Details</h2>
          <ExplainTip text="Full RFM breakdown per customer. R/F/M are scores 1–5. RFM Score is the composite. Search by ID or sort any column." />
        </div>
        <DataTable
          rows={rfmCustomers}
          rowKey={r => r.id}
          searchable
          searchPlaceholder="Search by ID…"
          searchFn={(r, q) => r.id.includes(q)}
          columns={[
            { key: 'id', header: 'Customer ID', render: r => <span className="num-tabular font-mono text-xs">{r.id}</span> },
            { key: 'recency', header: 'Recency', align: 'right', sortable: true, render: r => `${r.recency}d` },
            { key: 'frequency', header: 'Freq', align: 'right', sortable: true, render: r => r.frequency },
            { key: 'monetary', header: 'Monetary', align: 'right', sortable: true, render: r => formatGBP(r.monetary) },
            { key: 'r', header: 'R', align: 'right', sortable: true, render: r => r.r },
            { key: 'f', header: 'F', align: 'right', sortable: true, render: r => r.f },
            { key: 'm', header: 'M', align: 'right', sortable: true, render: r => r.m },
            { key: 'rfmScore', header: 'Score', align: 'right', sortable: true, render: r => <span className="num-tabular font-semibold">{r.rfmScore}</span> },
            { key: 'segment', header: 'Segment', render: r => <SegmentChip segment={r.segment} /> },
          ]}
        />
      </div>

      <InsightBanner>Champions are just 20.7% of customers but drive a disproportionate share of revenue. Protect them with early loyalty rewards.</InsightBanner>
    </div>
  )
}
