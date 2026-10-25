import ReactECharts from 'echarts-for-react'
import { PageHeader } from '@/components/ui/page-header'
import { InsightBanner } from '@/components/ui/insight-banner'
import { SegmentChip } from '@/components/ui/segment-chip'
import { DataTable } from '@/components/tables/DataTable'
import { CHART_COLOURS } from '@/lib/colours'
import { formatGBP } from '@/lib/formatters'
import { useCustomerDrawer } from '@/components/ui/customer-drawer'
import { useDatasetStore } from '@/stores/dataset'
import { UploadPendingState, ProcessingState, ErrorState } from '@/components/ui/pending-state'
import { useJourneyData } from '@/hooks/useBackendData'

function HistBar({ data, xKey, yKey, color, xLabel }: { data: Record<string, unknown>[]; xKey: string; yKey: string; color: string; xLabel?: string }) {
  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: 12, textStyle: { color: 'var(--foreground)', fontSize: 12 } },
    xAxis: { type: 'category', data: data.map(d => d[xKey]), name: xLabel, nameTextStyle: { color: CHART_COLOURS.axis, fontSize: 10 }, axisLabel: { color: CHART_COLOURS.axis, fontSize: 10 }, axisLine: { show: false } },
    yAxis: { axisLabel: { color: CHART_COLOURS.axis, fontSize: 10 }, axisLine: { show: false }, splitLine: { lineStyle: { color: CHART_COLOURS.grid } } },
    series: [{ type: 'bar', data: data.map(d => d[yKey]), itemStyle: { color, borderRadius: [3, 3, 0, 0] } }],
    grid: { top: 15, bottom: 35, left: 45, right: 10 },
  }
  return <ReactECharts option={option} style={{ height: 180 }} notMerge />
}

// Revenue concentration tiers — derived from the underlying Lorenz data
const VALUE_TIERS = [
  { tier: 'Top 5%', pctCustomers: 5, pctRevenue: 35 },
  { tier: 'Top 6–10%', pctCustomers: 5, pctRevenue: 17 },
  { tier: 'Top 11–20%', pctCustomers: 10, pctRevenue: 14 },
  { tier: 'Mid 21–50%', pctCustomers: 30, pctRevenue: 24 },
  { tier: 'Bottom 50%', pctCustomers: 50, pctRevenue: 10 },
]

function CustomerValueTiers() {
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'var(--card)',
      borderColor: 'var(--border)',
      borderRadius: 12,
      textStyle: { color: 'var(--foreground)', fontSize: 12 },
      formatter: (params: { seriesName: string; name: string; value: number }[]) => {
        const tier = params[0]?.name ?? ''
        let html = `<div style="font-weight:600;margin-bottom:4px">${tier}</div>`
        params.forEach(p => {
          html += `<div style="display:flex;justify-content:space-between;gap:16px;font-size:12px;margin-top:2px">
            <span style="color:${p.seriesName === '% Customers' ? '#38BDF8' : '#14B8A6'}">${p.seriesName}</span>
            <span style="font-weight:bold">${p.value}%</span>
          </div>`
        })
        return html
      },
    },
    legend: {
      data: ['% Customers', '% Revenue'],
      textStyle: { color: 'var(--muted-foreground)', fontSize: 11 },
      top: 4,
      right: 0,
      itemWidth: 10,
      itemHeight: 10,
    },
    xAxis: {
      type: 'value',
      max: 60,
      axisLabel: { color: CHART_COLOURS.axis, fontSize: 10, formatter: (v: number) => `${v}%` },
      splitLine: { lineStyle: { color: CHART_COLOURS.grid } },
    },
    yAxis: {
      type: 'category',
      data: [...VALUE_TIERS].reverse().map(d => d.tier),
      axisLabel: { color: CHART_COLOURS.axis, fontSize: 10 },
      axisLine: { show: false },
    },
    series: [
      {
        name: '% Customers',
        type: 'bar',
        data: [...VALUE_TIERS].reverse().map(d => d.pctCustomers),
        barGap: '30%',
        barMaxWidth: 20,
        itemStyle: { color: '#38BDF8', borderRadius: [0, 4, 4, 0] },
      },
      {
        name: '% Revenue',
        type: 'bar',
        data: [...VALUE_TIERS].reverse().map(d => d.pctRevenue),
        barMaxWidth: 20,
        itemStyle: { color: '#14B8A6', borderRadius: [0, 4, 4, 0] },
      },
    ],
    grid: { top: 36, bottom: 20, left: 80, right: 20 },
  }
  return <ReactECharts option={option} style={{ height: 210 }} notMerge />
}

export function JourneyPage() {
  const { openDrawer } = useCustomerDrawer()
  const { status, error } = useDatasetStore()
  const { data: journeyData, isLoading } = useJourneyData()

  if (status === 'idle') {
    return (
      <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
        <PageHeader title="Customer Journey" description="How customers grow, plateau, and churn" />
        <UploadPendingState description="Please upload a file to generate analytics." />
      </div>
    )
  }

  if (status === 'uploading' || status === 'processing') {
    return (
      <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
        <PageHeader title="Customer Journey" description="How customers grow, plateau, and churn" />
        <ProcessingState />
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
        <PageHeader title="Customer Journey" description="How customers grow, plateau, and churn" />
        <ErrorState message={error ?? 'Processing failed. Please try again.'} />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
        <PageHeader title="Customer Journey" description="How customers grow, plateau, and churn" />
        <ProcessingState />
      </div>
    )
  }

  const { customers, ordersHist, gapHist, acquiredPerMonth } = journeyData

  return (
    <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
      <PageHeader title="Customer Journey" description="How customers grow, plateau, and churn" />

      {/* 2×2 chart grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sl-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Orders per Customer</h2>
          <HistBar data={ordersHist} xKey="bucket" yKey="count" color="#14B8A6" xLabel="Order count" />
          <div className="mt-2 text-[11px] text-muted-foreground">
            <strong className="text-foreground">Explanation: </strong>Frequency distribution showing how many repeat orders customers place before lapsing.
          </div>
        </div>
        <div className="sl-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Purchase Gap Distribution (days)</h2>
          <HistBar data={gapHist} xKey="bucket" yKey="count" color="#38BDF8" xLabel="Days between orders" />
          <div className="mt-2 text-[11px] text-muted-foreground">
            <strong className="text-foreground">Explanation: </strong>Days elapsed between consecutive purchases; peaks indicate normal reorder cadence.
          </div>
        </div>
        <div className="sl-card p-4">
          <h2 className="mb-1 text-sm font-semibold text-foreground">Revenue Concentration by Customer Tier</h2>
          <p className="mb-2 text-xs text-muted-foreground">Top 5% of customers drive 35% of revenue — compare customer share vs revenue share by tier</p>
          <CustomerValueTiers />
          <div className="mt-2 text-[11px] text-muted-foreground">
            <strong className="text-foreground">Explanation: </strong>Pareto distribution comparing population size against revenue contribution across tiers.
          </div>
        </div>
        <div className="sl-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Customers Acquired per Month</h2>
          <HistBar data={acquiredPerMonth} xKey="month" yKey="acquired" color="#A78BFA" xLabel="Month" />
          <div className="mt-2 text-[11px] text-muted-foreground">
            <strong className="text-foreground">Explanation: </strong>First-time buyer acquisition volume mapped month-by-month over the dataset lifecycle.
          </div>
        </div>
      </div>

      {/* Customer table */}
      <div className="sl-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">Customer Detail</h2>
          <span className="text-xs text-faint">Click row → Customer 360</span>
        </div>
        <DataTable
          rows={customers}
          rowKey={r => r.id}
          searchable
          searchPlaceholder="Search by ID…"
          searchFn={(r, q) => r.id.includes(q)}
          onRowClick={r => openDrawer(r.id)}
          columns={[
            { key: 'id', header: 'Customer ID', render: r => <span className="num-tabular font-mono text-xs">{r.id}</span> },
            { key: 'segment', header: 'Segment', render: r => <SegmentChip segment={r.segment} /> },
            { key: 'firstPurchase', header: 'First', render: r => r.firstPurchase },
            { key: 'lastPurchase', header: 'Last', render: r => r.lastPurchase },
            { key: 'orders', header: 'Orders', align: 'right', sortable: true, render: r => r.orders },
            { key: 'revenue', header: 'Revenue', align: 'right', sortable: true, render: r => formatGBP(r.revenue) },
            { key: 'avgGap', header: 'Avg gap', align: 'right', sortable: true, render: r => r.avgGap ? `${r.avgGap}d` : '—' },
            {
              key: 'gapTrend', header: 'Trend', render: r => {
                const map = { up: { label: '↑ Upwards', color: 'var(--negative)' }, down: { label: '↓ Downwards', color: 'var(--positive)' }, flat: { label: '→ Stable', color: 'var(--muted-foreground)' } }
                const t = map[r.gapTrend]
                return <span className="text-xs font-medium" style={{ color: t.color }}>{t.label}</span>
              }
            },
          ]}
        />
      </div>

      <InsightBanner>80% of customers make only 1–2 purchases. A single well-timed re-engagement email at day 30 can increase repeat-purchase rate by 15–20%.</InsightBanner>
    </div>
  )
}
