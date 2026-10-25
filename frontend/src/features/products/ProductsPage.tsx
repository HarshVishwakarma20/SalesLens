import ReactECharts from 'echarts-for-react'
import { PageHeader } from '@/components/ui/page-header'
import { InsightBanner } from '@/components/ui/insight-banner'
import { DataTable } from '@/components/tables/DataTable'
import { formatGBP, formatPercent } from '@/lib/formatters'
import { CHART_COLOURS } from '@/lib/colours'
import { useDatasetStore } from '@/stores/dataset'
import { UploadPendingState, ProcessingState, ErrorState } from '@/components/ui/pending-state'
import { useProductsData } from '@/hooks/useBackendData'
import type { Product } from '@/lib/types'

function TopProductsChart({ products }: { products: Product[] }) {
  const top10 = products.slice(0, 10)
  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: 12, textStyle: { color: 'var(--foreground)', fontSize: 12 } },
    xAxis: { type: 'value', axisLabel: { color: CHART_COLOURS.axis, fontSize: 10, formatter: (v: number) => `£${(v / 1000).toFixed(0)}k` }, splitLine: { lineStyle: { color: CHART_COLOURS.grid } } },
    yAxis: {
      type: 'category',
      data: [...top10].reverse().map(p => p.code),
      axisLabel: { color: CHART_COLOURS.axis, fontSize: 10 },
      axisLine: { show: false },
    },
    series: [
      { name: 'Net Revenue', type: 'bar', data: [...top10].reverse().map(p => p.netRevenue), itemStyle: { color: '#14B8A6', borderRadius: [0, 4, 4, 0] } },
      { name: 'Returned Value', type: 'bar', stack: 'total', data: [...top10].reverse().map(p => p.returnedValue), itemStyle: { color: '#F87171', borderRadius: [0, 4, 4, 0] } },
    ],
    grid: { top: 46, bottom: 25, left: 70, right: 20 },
    legend: {
      data: ['Net Revenue', 'Returned Value'],
      textStyle: { color: 'var(--muted-foreground)', fontSize: 11 },
      top: 4,
      left: 'center',
      itemWidth: 12,
      itemHeight: 10,
      itemGap: 20,
    },
  }
  return <ReactECharts option={option} style={{ height: 340 }} notMerge />
}

function QuadrantChart({ products }: { products: Product[] }) {
  const portfolioAvg = products.length > 0 ? products.reduce((s, p) => s + p.returnRate, 0) / products.length : 0.0512
  const sample = products.slice(0, 40)
  const aboveAvg = sample.filter(p => p.returnRate > portfolioAvg)
  const belowAvg = sample.filter(p => p.returnRate <= portfolioAvg)

  const option = {
    backgroundColor: 'transparent',
    legend: {
      data: ['Above Avg Return Rate', 'Below Avg Return Rate'],
      textStyle: { color: 'var(--muted-foreground)', fontSize: 11 },
      top: 4,
      left: 'center',
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 16,
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: 'var(--card)',
      borderColor: 'var(--border)',
      borderRadius: 12,
      textStyle: { color: 'var(--foreground)', fontSize: 12 },
      formatter: (p: { value: [number, number, string] }) =>
        `<b>${p.value[2]}</b><br/>Return rate: ${(p.value[0] * 100).toFixed(1)}%<br/>Attach rate: ${(p.value[1] * 100).toFixed(1)}%`,
    },
    xAxis: { name: 'Return Rate', nameTextStyle: { color: CHART_COLOURS.axis, fontSize: 10 }, axisLabel: { color: CHART_COLOURS.axis, fontSize: 10, formatter: (v: number) => `${(v * 100).toFixed(0)}%` }, splitLine: { lineStyle: { color: CHART_COLOURS.grid } } },
    yAxis: { name: 'Attach Rate', nameTextStyle: { color: CHART_COLOURS.axis, fontSize: 10 }, axisLabel: { color: CHART_COLOURS.axis, fontSize: 10, formatter: (v: number) => `${(v * 100).toFixed(0)}%` }, splitLine: { lineStyle: { color: CHART_COLOURS.grid } } },
    series: [
      {
        name: 'Above Avg Return Rate',
        type: 'scatter',
        symbolSize: 8,
        data: aboveAvg.map(p => [p.returnRate, p.attachRate, p.code]),
        itemStyle: { color: '#F87171' },
      },
      {
        name: 'Below Avg Return Rate',
        type: 'scatter',
        symbolSize: 8,
        data: belowAvg.map(p => [p.returnRate, p.attachRate, p.code]),
        itemStyle: { color: '#14B8A6' },
      },
    ],
    grid: { top: 48, bottom: 40, left: 60, right: 20 },
  }
  return <ReactECharts option={option} style={{ height: 280 }} notMerge />
}

export function ProductsPage() {
  const { status, error } = useDatasetStore()
  const { data: products, isLoading } = useProductsData()

  if (status === 'idle') {
    return (
      <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
        <PageHeader title="Products" description="Revenue, returns, and attach rates by SKU" />
        <UploadPendingState description="Please upload a file to generate analytics." />
      </div>
    )
  }

  if (status === 'uploading' || status === 'processing') {
    return (
      <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
        <PageHeader title="Products" description="Revenue, returns, and attach rates by SKU" />
        <ProcessingState />
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
        <PageHeader title="Products" description="Revenue, returns, and attach rates by SKU" />
        <ErrorState message={error ?? 'Processing failed. Please try again.'} />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
        <PageHeader title="Products" description="Revenue, returns, and attach rates by SKU" />
        <ProcessingState />
      </div>
    )
  }

  const portfolioAvg = products.length > 0 ? products.reduce((s, p) => s + p.returnRate, 0) / products.length : 0.0512

  return (
    <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
      <PageHeader title="Products" description="Revenue, returns, and attach rates by SKU" />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="sl-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Top 10 Products — Net vs Returned Value</h2>
          <TopProductsChart products={products} />
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-border/60 bg-raised/30 px-3 py-2 text-xs text-muted-foreground leading-relaxed">
            <span><strong className="text-foreground">Chart Explanation: </strong>Ranks top revenue-generating SKUs, comparing retained Net Revenue (teal) with refunded Return Value (red) per item.</span>
          </div>
        </div>
        <div className="sl-card p-4">
          <h2 className="mb-1 text-sm font-semibold text-foreground">Return Rate vs Attach Rate</h2>
          <p className="mb-3 text-xs text-muted-foreground">Red = return rate above portfolio avg ({(portfolioAvg * 100).toFixed(2)}%)</p>
          <QuadrantChart products={products} />
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-border/60 bg-raised/30 px-3 py-2 text-xs text-muted-foreground leading-relaxed">
            <span><strong className="text-foreground">Chart Explanation: </strong>Scatter quadrant evaluating catalog performance. High attach-rate items with elevated return rates (red dots) indicate potential quality or fit issues.</span>
          </div>
        </div>
      </div>

      <div className="sl-card p-4">
        <h2 className="mb-4 text-sm font-semibold text-foreground">All Products</h2>
        <DataTable
          rows={products}
          rowKey={r => r.code}
          searchable
          searchPlaceholder="Search SKU or name…"
          searchFn={(r, q) => r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)}
          columns={[
            { key: 'code', header: 'SKU', render: r => <span className="font-mono text-xs">{r.code}</span> },
            { key: 'name', header: 'Name', render: r => <span className="text-xs">{r.name}</span> },
            { key: 'netRevenue', header: 'Net Revenue', align: 'right', sortable: true, render: r => formatGBP(r.netRevenue) },
            { key: 'grossSold', header: 'Gross Sold', align: 'right', sortable: true, render: r => formatGBP(r.grossSold) },
            { key: 'returnedValue', header: 'Returned', align: 'right', sortable: true, render: r => <span className="text-negative">{formatGBP(r.returnedValue)}</span> },
            {
              key: 'returnRate', header: 'Return %', align: 'right', sortable: true, render: r => (
                <span style={{ color: r.returnRate > portfolioAvg ? 'var(--negative)' : 'var(--positive)' }}>
                  {formatPercent(r.returnRate, 1)}
                </span>
              )
            },
            { key: 'attachRate', header: 'Attach %', align: 'right', sortable: true, render: r => formatPercent(r.attachRate, 1) },
            { key: 'buyers', header: 'Buyers', align: 'right', sortable: true, render: r => r.buyers.toLocaleString() },
          ]}
        />
      </div>

      <InsightBanner>The top 10 SKUs account for ~62% of net revenue. Protect them with stock alerts and prioritise in any win-back bundle campaigns.</InsightBanner>
    </div>
  )
}
