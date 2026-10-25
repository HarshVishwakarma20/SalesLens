import { useState, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { PageHeader } from '@/components/ui/page-header'
import { InsightBanner } from '@/components/ui/insight-banner'
import { SegmentChip } from '@/components/ui/segment-chip'
import { DataTable } from '@/components/tables/DataTable'
import { CHART_COLOURS } from '@/lib/colours'
import { formatGBP, formatPercent } from '@/lib/formatters'
import type { ReturnRow, SegmentName } from '@/lib/types'
import { useDatasetStore } from '@/stores/dataset'
import { UploadPendingState, ProcessingState, ErrorState } from '@/components/ui/pending-state'
import { Info } from 'lucide-react'
import { useReturnsData } from '@/hooks/useBackendData'

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

function ReturnRateBar({ tab, rows, portfolioRate }: { tab: 'product' | 'segment' | 'month'; rows: ReturnRow[]; portfolioRate: number }) {
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'var(--card)',
      borderColor: 'var(--border)',
      borderRadius: 12,
      textStyle: { color: 'var(--foreground)', fontSize: 12 },
      formatter: (params: { name: string; value: number }[]) => {
        const p = params[0]
        return `${p.name}<br/><b>${(p.value * 100).toFixed(2)}%</b> return rate`
      },
    },
    xAxis: {
      type: 'category',
      data: rows.slice(0, tab === 'product' ? 20 : rows.length).map(r => r.key),
      axisLabel: { color: CHART_COLOURS.axis, fontSize: 9, rotate: tab === 'product' ? 40 : 0 },
      axisLine: { show: false },
    },
    yAxis: {
      axisLabel: { color: CHART_COLOURS.axis, fontSize: 10, formatter: (v: number) => `${(v * 100).toFixed(0)}%` },
      axisLine: { show: false },
      splitLine: { lineStyle: { color: CHART_COLOURS.grid } },
    },
    dataZoom: [
      { type: 'slider', bottom: 8, height: 18, borderColor: 'var(--border)', fillerColor: 'rgba(20,184,166,0.12)', handleStyle: { color: '#14B8A6' }, textStyle: { color: 'var(--muted-foreground)', fontSize: 10 } },
      { type: 'inside' },
    ],
    legend: {
      data: ['Return Rate', 'Portfolio Average'],
      textStyle: { color: 'var(--muted-foreground)', fontSize: 11 },
      bottom: tab === 'product' ? 32 : 8,
    },
    series: [
      {
        name: 'Return Rate',
        type: 'bar',
        data: rows.slice(0, tab === 'product' ? 20 : rows.length).map(r => ({
          value: r.returnRate,
          itemStyle: { color: r.returnRate > portfolioRate ? '#F87171' : '#14B8A6', borderRadius: [4, 4, 0, 0] },
        })),
      },
      {
        name: 'Portfolio Average',
        type: 'line',
        data: Array(Math.min(rows.length, tab === 'product' ? 20 : rows.length)).fill(portfolioRate),
        lineStyle: { type: 'dashed', color: '#FBBF24', width: 1.5 },
        symbol: 'none',
        tooltip: { show: false },
      },
    ],
    grid: { top: 20, bottom: tab === 'product' ? 95 : 65, left: 60, right: 20 },
  }
  return <ReactECharts option={option} style={{ height: 320 }} notMerge />
}

function SegmentShareBars({ segs }: { segs: ReturnRow[] }) {
  const totalSales = segs.reduce((s, r) => s + r.sales, 0)
  const totalReturns = segs.reduce((s, r) => s + r.returns, 0)

  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: 12, textStyle: { color: 'var(--foreground)', fontSize: 12 } },
    legend: { data: ['Share of sales', 'Share of returns'], textStyle: { color: 'var(--muted-foreground)', fontSize: 11 }, bottom: 0 },
    xAxis: { data: segs.map(s => s.key), axisLabel: { color: CHART_COLOURS.axis, fontSize: 11 }, axisLine: { show: false } },
    yAxis: { axisLabel: { color: CHART_COLOURS.axis, fontSize: 10, formatter: (v: number) => `${(v * 100).toFixed(0)}%` }, axisLine: { show: false }, splitLine: { lineStyle: { color: CHART_COLOURS.grid } } },
    dataZoom: [{ type: 'inside' }],
    series: [
      { name: 'Share of sales', type: 'bar', barGap: 0, data: segs.map(s => (s.sales / totalSales).toFixed(4)), itemStyle: { color: '#14B8A6', borderRadius: [3, 3, 0, 0] } },
      { name: 'Share of returns', type: 'bar', data: segs.map(s => (s.returns / totalReturns).toFixed(4)), itemStyle: { color: '#F87171', borderRadius: [3, 3, 0, 0] } },
    ],
    grid: { top: 20, bottom: 50, left: 60, right: 20 },
  }
  return <ReactECharts option={option} style={{ height: 240 }} notMerge />
}

function MonthlyLine({ byMonth, portfolioRate }: { byMonth: ReturnRow[]; portfolioRate: number }) {
  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: 12, textStyle: { color: 'var(--foreground)', fontSize: 12 } },
    legend: {
      data: ['Monthly Return Rate', 'Portfolio Average'],
      textStyle: { color: 'var(--muted-foreground)', fontSize: 11 },
      bottom: 28,
    },
    xAxis: { data: byMonth.map(r => r.key), axisLabel: { color: CHART_COLOURS.axis, fontSize: 10 }, axisLine: { show: false } },
    yAxis: { axisLabel: { color: CHART_COLOURS.axis, fontSize: 10, formatter: (v: number) => `${(v * 100).toFixed(0)}%` }, axisLine: { show: false }, splitLine: { lineStyle: { color: CHART_COLOURS.grid } } },
    dataZoom: [
      { type: 'slider', bottom: 4, height: 16, borderColor: 'var(--border)', fillerColor: 'rgba(248,113,113,0.12)', handleStyle: { color: '#F87171' }, textStyle: { color: 'var(--muted-foreground)', fontSize: 10 } },
      { type: 'inside' },
    ],
    series: [
      { name: 'Monthly Return Rate', type: 'line', data: byMonth.map(r => r.returnRate), smooth: true, lineStyle: { color: '#F87171', width: 2 }, symbol: 'circle', symbolSize: 5, itemStyle: { color: '#F87171' } },
      { name: 'Portfolio Average', type: 'line', data: Array(byMonth.length).fill(portfolioRate), lineStyle: { type: 'dashed', color: '#FBBF24', width: 1.5 }, symbol: 'none' },
    ],
    grid: { top: 20, bottom: 60, left: 60, right: 20 },
  }
  return <ReactECharts option={option} style={{ height: 260 }} notMerge />
}

type Tab = 'product' | 'segment' | 'month'

export function ReturnsPage() {
  const [tab, setTab] = useState<Tab>('product')
  const [minSales, setMinSales] = useState(500)
  const [showReturnsOnly, setShowReturnsOnly] = useState(false)
  const { status, error } = useDatasetStore()
  const { data: returnsData, isLoading } = useReturnsData()

  const { byProduct, bySegment, byMonth, portfolioAvgReturnRate } = returnsData
  const PORTFOLIO_RATE = portfolioAvgReturnRate

  const kpis = useMemo(() => {
    const totalRet = byProduct.reduce((s, r) => s + r.returns, 0)
    const totalSales = byProduct.reduce((s, r) => s + r.sales, 0)
    const rate = totalSales > 0 ? totalRet / totalSales : PORTFOLIO_RATE
    const atRiskSeg = bySegment.find(s => s.key === 'At-Risk')
    return [
      { label: 'Return rate', value: `${(rate * 100).toFixed(2)}%`, tone: 'negative' },
      { label: 'Returns value', value: `£${(totalRet / 1000).toFixed(0)}k`, tone: 'negative' },
      { label: 'Sales value', value: `£${(totalSales / 1_000_000).toFixed(2)}M`, tone: 'positive' },
      { label: 'At-Risk returns share', value: atRiskSeg ? `${(atRiskSeg.returnRate * 100).toFixed(1)}% rate` : '—', tone: 'warning' },
    ]
  }, [byProduct, bySegment, PORTFOLIO_RATE])

  if (status === 'idle') {
    return (
      <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
        <PageHeader title="Returns and Leakage" description="Where is revenue leaking?" />
        <UploadPendingState description="Please upload a file to generate analytics." />
      </div>
    )
  }

  if (status === 'uploading' || status === 'processing') {
    return (
      <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
        <PageHeader title="Returns and Leakage" description="Where is revenue leaking?" />
        <ProcessingState />
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
        <PageHeader title="Returns and Leakage" description="Where is revenue leaking?" />
        <ErrorState message={error ?? 'Processing failed. Please try again.'} />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
        <PageHeader title="Returns and Leakage" description="Where is revenue leaking?" />
        <ProcessingState />
      </div>
    )
  }

  const productRows = byProduct.filter(r => {
    if (!showReturnsOnly && r.sales === 0) return false
    if (r.sales < minSales && r.sales > 0) return false
    return true
  })

  const activeRows: ReturnRow[] = tab === 'product' ? productRows : tab === 'segment' ? bySegment : byMonth

  return (
    <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
      <PageHeader title="Returns and Leakage" description="Where is revenue leaking?" />

      {/* Page explanation */}
      <div className="rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
        <span className="font-semibold text-accent">How to read this page: </span>
        Bars above the dashed yellow portfolio average are flagged as high-return items. Switch between Product, Segment, and Month tabs to drill into where revenue is leaking. Use the slider beneath charts to zoom into specific date ranges or SKUs.
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {kpis.map(k => (
          <div key={k.label} className="sl-card p-4" tabIndex={0}>
            <p className="text-[11px] uppercase tracking-wider text-faint">{k.label}</p>
            <p className="num-tabular mt-1 text-xl font-bold" style={{ color: k.tone === 'negative' ? 'var(--negative)' : k.tone === 'positive' ? 'var(--positive)' : 'var(--warning)' }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['product', 'segment', 'month'] as Tab[]).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-[10px] border px-4 py-1.5 text-sm transition-colors ${tab === t ? 'border-accent bg-accent/10 text-accent' : 'border-border text-muted-foreground hover:bg-raised'}`}
          >
            By {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Product tab controls */}
      {tab === 'product' && (
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Min sales (£)
            <input type="range" min={0} max={5000} step={100} value={minSales} onChange={e => setMinSales(Number(e.target.value))} className="w-32 accent-[var(--accent)]" />
            <span className="num-tabular w-12">{formatGBP(minSales)}</span>
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={showReturnsOnly} onChange={e => setShowReturnsOnly(e.target.checked)} className="accent-[var(--accent)]" />
            Show returns-only products
          </label>
        </div>
      )}

      {/* Chart */}
      <div className="sl-card p-4" tabIndex={0}>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold text-foreground">
            {tab === 'product' ? 'Return Rate by SKU' : tab === 'segment' ? 'Return Rate by Segment' : 'Return Rate by Month'}
          </h2>
          <ExplainTip text="Bars above the dashed yellow line exceed the portfolio average return rate. Red = above avg, Teal = below. Drag the slider to zoom in on specific items." />
          <span className="ml-auto text-[10px] text-faint">Drag slider below to zoom</span>
        </div>
        <ReturnRateBar tab={tab} rows={activeRows} portfolioRate={PORTFOLIO_RATE} />
        <div className="mt-3 rounded-lg border border-border/50 bg-raised/40 p-3 text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">Graph Explanation: </span>
          Compares return rates across dimension keys against the portfolio benchmark (dashed amber line). Red bars denote items exceeding the portfolio average, pinpointing products or segments generating disproportionate reverse logistics cost.
        </div>
      </div>

      {/* DataTable */}
      <div className="sl-card p-4" tabIndex={0}>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-sm font-semibold text-foreground">Detailed Breakdown</h2>
          <ExplainTip text="Click column headers to sort. Flagged items exceed the portfolio average return rate. 'No sales' products had only returns in the period." />
        </div>
        <DataTable
          rows={activeRows}
          rowKey={r => r.key}
          columns={[
            {
              key: 'key', header: tab === 'segment' ? 'Segment' : tab === 'product' ? 'SKU' : 'Month', render: r =>
                tab === 'segment'
                  ? <SegmentChip segment={r.key as SegmentName} />
                  : <span className="num-tabular font-mono text-xs">{r.key}</span>
            },
            { key: 'sales', header: 'Sales', align: 'right', sortable: true, render: r => formatGBP(r.sales) },
            { key: 'returns', header: 'Returns', align: 'right', sortable: true, render: r => formatGBP(r.returns) },
            {
              key: 'returnRate', header: 'Return rate', align: 'right', sortable: true, render: r => (
                <span style={{ color: r.returnRate > PORTFOLIO_RATE ? 'var(--negative)' : 'var(--positive)' }}>
                  {formatPercent(r.returnRate, 2)}
                </span>
              )
            },
            {
              key: 'flagged', header: 'Flagged', render: r => r.flagged
                ? <span className="rounded-full bg-negative/15 px-2 py-0.5 text-[10px] font-semibold text-negative">Above avg</span>
                : r.sales === 0
                  ? <span className="rounded-full bg-raised px-2 py-0.5 text-[10px] font-medium text-faint">No sales</span>
                  : null
            },
          ]}
        />
      </div>

      {/* Segment share bars */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="sl-card p-4 flex flex-col justify-between" tabIndex={0}>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-semibold text-foreground">Share of Sales vs Returns by Segment</h2>
              <ExplainTip text="Compares each segment's share of total sales vs total returns. If a segment's return share exceeds its sales share, it's a disproportionate leakage source." />
            </div>
            <SegmentShareBars segs={bySegment} />
          </div>
          <div className="mt-3 rounded-lg border border-border/50 bg-raised/40 p-3 text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">Graph Explanation: </span>
            Side-by-side comparison of gross turnover contribution vs returns incurred. Segments where return share exceeds revenue share signal high-friction customer journeys.
          </div>
        </div>
        <div className="sl-card p-4 flex flex-col justify-between" tabIndex={0}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-sm font-semibold text-foreground">Monthly Return Rate Trajectory</h2>
              <ExplainTip text="Tracks the return rate across all months. Spikes above the dashed average line indicate months with unusually high returns worth investigating. Drag slider to zoom." />
            </div>
            <p className="mb-3 text-xs text-muted-foreground">Dashed = {(PORTFOLIO_RATE * 100).toFixed(2)}% portfolio average · drag slider to zoom</p>
            <MonthlyLine byMonth={byMonth} portfolioRate={PORTFOLIO_RATE} />
          </div>
          <div className="mt-3 rounded-lg border border-border/50 bg-raised/40 p-3 text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">Graph Explanation: </span>
            Chronological trendline of portfolio return rates. Elevated periods often align with holiday post-sales or specific product batch quality issues.
          </div>
        </div>
      </div>

      <InsightBanner>At-Risk customers account for 9.3% of returns vs 10.3% of sales — they are not the biggest leakage driver. Watch the Lost segment instead.</InsightBanner>
    </div>
  )
}
