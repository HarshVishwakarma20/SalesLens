import ReactECharts from 'echarts-for-react'
import { PageHeader } from '@/components/ui/page-header'
import { InsightBanner } from '@/components/ui/insight-banner'
import { DataTable } from '@/components/tables/DataTable'
import { PRODUCTS } from '@/lib/mock-data'
import { formatGBP, formatPercent } from '@/lib/formatters'
import { CHART_COLOURS } from '@/lib/colours'

const TOP10 = PRODUCTS.slice(0, 10)

function TopProductsChart() {
  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: 12, textStyle: { color: 'var(--foreground)', fontSize: 12 } },
    xAxis: { type: 'value', axisLabel: { color: CHART_COLOURS.axis, fontSize: 10, formatter: (v: number) => `£${(v / 1000).toFixed(0)}k` }, splitLine: { lineStyle: { color: CHART_COLOURS.grid } } },
    yAxis: {
      type: 'category',
      data: [...TOP10].reverse().map(p => p.code),
      axisLabel: { color: CHART_COLOURS.axis, fontSize: 10 },
      axisLine: { show: false },
    },
    series: [
      { name: 'Net Revenue', type: 'bar', data: [...TOP10].reverse().map(p => p.netRevenue), itemStyle: { color: '#14B8A6', borderRadius: [0, 4, 4, 0] } },
      { name: 'Returned Value', type: 'bar', stack: 'total', data: [...TOP10].reverse().map(p => p.returnedValue), itemStyle: { color: '#F87171', borderRadius: [0, 4, 4, 0] } },
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

function QuadrantChart() {
  const option = {
    backgroundColor: 'transparent',
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
    series: [{
      type: 'scatter',
      symbolSize: 8,
      data: PRODUCTS.slice(0, 40).map(p => [p.returnRate, p.attachRate, p.code]),
      itemStyle: {
        color: (p: { value: [number, number] }) => p.value[0] > 0.0512 ? '#F87171' : '#14B8A6',
      },
    }],
    grid: { top: 30, bottom: 40, left: 60, right: 20 },
  }
  return <ReactECharts option={option} style={{ height: 260 }} notMerge />
}

export function ProductsPage() {
  return (
    <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
      <PageHeader title="Products" description="Revenue, returns, and attach rates by SKU" />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="sl-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Top 10 Products — Net vs Returned Value</h2>
          <TopProductsChart />
        </div>
        <div className="sl-card p-4">
          <h2 className="mb-1 text-sm font-semibold text-foreground">Return Rate vs Attach Rate</h2>
          <p className="mb-3 text-xs text-muted-foreground">Red = return rate above portfolio avg (5.12%)</p>
          <QuadrantChart />
        </div>
      </div>

      <div className="sl-card p-4">
        <h2 className="mb-4 text-sm font-semibold text-foreground">All Products</h2>
        <DataTable
          rows={PRODUCTS}
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
                <span style={{ color: r.returnRate > 0.0512 ? 'var(--negative)' : 'var(--positive)' }}>
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
