import { useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { PageHeader } from '@/components/ui/page-header'
import { InsightBanner } from '@/components/ui/insight-banner'
import { SegmentChip } from '@/components/ui/segment-chip'
import { DataTable } from '@/components/tables/DataTable'
import { SEGMENT_COLOURS, CHART_COLOURS } from '@/lib/colours'
import { RFM_CUSTOMERS, RFM_SCATTER, DEMO_DATASET } from '@/lib/mock-data'
import { formatPercent, formatInt, formatGBP } from '@/lib/formatters'
import type { SegmentName } from '@/lib/types'
import { useFilters } from '@/hooks/useFilters'
import { useDatasetStore } from '@/stores/dataset'
import { UploadPendingState, ProcessingState, ErrorState } from '@/components/ui/pending-state'
import { Info } from 'lucide-react'

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

// Build 5×5 heatmap counts
function buildHeatmap() {
  const grid: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0))
  for (const c of RFM_CUSTOMERS) {
    grid[5 - c.f][c.r - 1]++
  }
  return grid
}

const HEATMAP = buildHeatmap()

// Build R/F/M dist
function buildDist(key: 'r' | 'f' | 'm') {
  const counts = [0, 0, 0, 0, 0]
  for (const c of RFM_CUSTOMERS) counts[c[key] - 1]++
  return counts.map((v, i) => ({ score: i + 1, count: v }))
}

function ScatterChart({ visibleSegs }: { visibleSegs: Set<SegmentName> }) {
  const series = Object.entries(SEGMENT_COLOURS)
    .filter(([seg]) => visibleSegs.has(seg as SegmentName))
    .map(([seg, color]) => ({
      name: seg,
      type: 'scatter',
      symbolSize: (d: number[]) => Math.sqrt(d[2]) / 8,
      data: RFM_SCATTER.filter(p => p.segment === seg).map(p => [p.recency, p.frequency, p.monetary]),
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

function HeatmapGrid() {
  const maxVal = Math.max(...HEATMAP.flat())
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-faint w-4">F</span>
        <div className="grid grid-cols-5 gap-1 flex-1">
          {[5, 4, 3, 2, 1].map(f => (
            HEATMAP[5 - f].map((count, ri) => {
              const intensity = maxVal > 0 ? count / maxVal : 0
              return (
                <div
                  key={`${f}-${ri}`}
                  title={`F=${f} R=${ri + 1}: ${count} customers`}
                  className="flex h-9 w-full items-center justify-center rounded-md text-[11px] font-semibold transition-transform hover:scale-110 cursor-default"
                  style={{
                    background: `rgba(20,184,166,${0.08 + intensity * 0.55})`,
                    color: intensity > 0.5 ? '#fff' : 'var(--muted-foreground)',
                  }}
                >
                  {count || ''}
                </div>
              )
            })
          ))}
        </div>
      </div>
      <div className="flex gap-1 ml-6">
        {[1, 2, 3, 4, 5].map(r => (
          <div key={r} className="flex-1 text-center text-[10px] text-faint">R{r}</div>
        ))}
      </div>
    </div>
  )
}

function DistBar({ data, color }: { data: { score: number; count: number }[]; color: string }) {
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div className="flex gap-1 items-end h-16">
      {data.map(d => (
        <div key={d.score} className="flex flex-1 flex-col items-center gap-0.5">
          <div className="w-full rounded-sm" style={{ height: `${(d.count / max) * 52}px`, background: color }} />
          <span className="text-[9px] text-faint">{d.score}</span>
        </div>
      ))}
    </div>
  )
}

export function SegmentsPage() {
  const { segments: visibleSegNames } = useFilters()
  const visibleSegs = new Set(visibleSegNames)
  const [wR, setWR] = useState(0.4)
  const [wF, setWF] = useState(0.3)
  const segments = DEMO_DATASET.segments
  const { status, error } = useDatasetStore()

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

  const normalize = (changed: 'r' | 'f' | 'm', val: number) => {
    const rest = 1 - val
    if (changed === 'r') { const s = wF + wM; setWR(val); if (s > 0) { setWF((wF / s) * rest); setWM((wM / s) * rest) } }
    else if (changed === 'f') { const s = wR + wM; setWF(val); if (s > 0) { setWR((wR / s) * rest); setWM((wM / s) * rest) } }
    else { const s = wR + wF; setWM(val); if (s > 0) { setWR((wR / s) * rest); setWF((wF / s) * rest) } }
  }
  const wM = 1 - wR - wF
  const [, setWM] = useState(0.3)

  const avgRfm = ((wR * RFM_CUSTOMERS.reduce((s, c) => s + c.r, 0) +
    wF * RFM_CUSTOMERS.reduce((s, c) => s + c.f, 0) +
    wM * RFM_CUSTOMERS.reduce((s, c) => s + c.m, 0)) / RFM_CUSTOMERS.length).toFixed(2)

  return (
    <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
      <PageHeader title="Segments" description="Who are your customers, grouped by value." />

      {/* Page explanation */}
      <div className="rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
        <span className="font-semibold text-accent">How to read this page: </span>
        Customers are grouped into RFM segments (Recency, Frequency, Monetary). Champions are your best customers; Lost are inactive. Use the scatter chart to explore how segments cluster. Adjust the weighted RFM sliders to reprioritize scoring. Hover any chart element for details.
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
              <span>Avg RFM score</span><span className="num-tabular text-right font-semibold text-foreground">{(Math.random() * 2 + 1.5).toFixed(2)}</span>
            </div>
            <div className="mt-1 rounded-lg bg-raised/60 px-2 py-1 text-[10px] font-mono text-faint">{SEGMENT_RULES[seg.name]}</div>
          </div>
        ))}
      </div>

      {/* RFM scatter + heatmap */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="sl-card p-4 lg:col-span-8" tabIndex={0}>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-sm font-semibold text-foreground">RFM Map</h2>
            <ExplainTip text="Each dot is a customer. X-axis = days since last purchase (lower = more recent). Y-axis = number of orders. Bubble size = monetary value. Drag slider to zoom." />
            <span className="ml-auto text-[10px] text-faint">Drag slider to zoom</span>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">Recency vs Frequency, bubble = Monetary value</p>
          <ScatterChart visibleSegs={visibleSegs} />
        </div>
        <div className="sl-card p-4 lg:col-span-4" tabIndex={0}>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-sm font-semibold text-foreground">R × F Heatmap</h2>
            <ExplainTip text="Each cell shows how many customers fall at a given R-score × F-score intersection. Darker teal = more customers at that combination." />
          </div>
          <p className="mb-3 text-xs text-muted-foreground">Customer count at each R/F combination</p>
          <HeatmapGrid />
        </div>
      </div>

      {/* Distribution bars */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(['r', 'f', 'm'] as const).map((dim, i) => (
          <div key={dim} className="sl-card p-4" tabIndex={0}>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-faint">{['Recency', 'Frequency', 'Monetary'][i]} Score Distribution</h3>
              <ExplainTip text={[
                'How recently each customer purchased. Score 1 = oldest, 5 = most recent.',
                'How many times each customer purchased. Score 1 = fewest, 5 = most frequent.',
                'How much each customer spent. Score 1 = lowest, 5 = highest spender.',
              ][i]} />
            </div>
            <DistBar data={buildDist(dim)} color={['#14B8A6', '#38BDF8', '#0EA5E9'][i]} />
          </div>
        ))}
      </div>

      {/* Weighted RFM sliders */}
      <div className="sl-card p-4" tabIndex={0}>
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-sm font-semibold text-foreground">Weighted RFM Score</h2>
          <ExplainTip text="Adjust the weight of each RFM dimension. Weights always sum to 1.0. Moving one slider redistributes weight across the others proportionally. Watch the live average score update." />
        </div>
        <p className="mb-3 text-xs text-muted-foreground">Adjust weights — they always sum to 1. Live avg: <span className="num-tabular font-semibold text-accent">{avgRfm}</span></p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: 'Recency (R)', val: wR, set: (v: number) => normalize('r', v) },
            { label: 'Frequency (F)', val: wF, set: (v: number) => normalize('f', v) },
            { label: 'Monetary (M)', val: wM, set: (v: number) => normalize('m', v) },
          ].map(s => (
            <div key={s.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">{s.label}</span>
                <span className="num-tabular text-foreground">{(s.val * 10).toFixed(0)}</span>
              </div>
              <input type="range" min={1} max={8} step={1} value={Math.round(s.val * 10)}
                onChange={e => s.set(Number(e.target.value) / 10)}
                className="w-full accent-[var(--accent)]" />
            </div>
          ))}
        </div>
      </div>

      {/* Customer table */}
      <div className="sl-card p-4" tabIndex={0}>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-sm font-semibold text-foreground">Customer Details</h2>
          <ExplainTip text="Full RFM breakdown per customer. R/F/M are scores 1–5. RFM Score is the composite. Search by ID or sort any column." />
        </div>
        <DataTable
          rows={RFM_CUSTOMERS}
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
