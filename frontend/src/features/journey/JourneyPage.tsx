import ReactECharts from 'echarts-for-react'
import { PageHeader } from '@/components/ui/page-header'
import { InsightBanner } from '@/components/ui/insight-banner'
import { SegmentChip } from '@/components/ui/segment-chip'
import { DataTable } from '@/components/tables/DataTable'
import { JOURNEY_CUSTOMERS, ORDERS_HIST, GAP_HIST, REVENUE_CURVE, ACQUIRED_PER_MONTH } from '@/lib/mock-data'
import { CHART_COLOURS } from '@/lib/colours'
import { formatGBP } from '@/lib/formatters'
import { useCustomerDrawer } from '@/components/ui/customer-drawer'
import { useDatasetStore } from '@/stores/dataset'
import { UploadPendingState, ProcessingState, ErrorState } from '@/components/ui/pending-state'

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

function LorenzCurve() {
  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: 12, textStyle: { color: 'var(--foreground)', fontSize: 12 }, formatter: (p: { value: [number, number] }[]) => `Top ${p[0].value[0]}% of customers → ${p[0].value[1]}% revenue` },
    xAxis: { type: 'value', min: 0, max: 100, name: '% customers', nameTextStyle: { color: CHART_COLOURS.axis, fontSize: 10 }, axisLabel: { color: CHART_COLOURS.axis, fontSize: 10, formatter: (v: number) => `${v}%` }, axisLine: { show: false } },
    yAxis: { type: 'value', min: 0, max: 100, name: '% revenue', nameTextStyle: { color: CHART_COLOURS.axis, fontSize: 10 }, axisLabel: { color: CHART_COLOURS.axis, fontSize: 10, formatter: (v: number) => `${v}%` }, axisLine: { show: false }, splitLine: { lineStyle: { color: CHART_COLOURS.grid } } },
    series: [
      { type: 'line', data: REVENUE_CURVE.map(p => [p.pct, p.revenue]), smooth: true, lineStyle: { color: '#14B8A6', width: 2 }, itemStyle: { color: '#14B8A6' }, name: 'Revenue curve', symbol: 'none', areaStyle: { color: 'rgba(20,184,166,0.12)' } },
      { type: 'line', data: [[0, 0], [100, 100]], lineStyle: { type: 'dashed', color: '#555', width: 1 }, symbol: 'none', name: 'Perfect equality', tooltip: { show: false } },
    ],
    grid: { top: 15, bottom: 35, left: 55, right: 10 },
  }
  return <ReactECharts option={option} style={{ height: 210 }} notMerge />
}

export function JourneyPage() {
  const { openDrawer } = useCustomerDrawer()
  const { status, error } = useDatasetStore()

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

  return (
    <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
      <PageHeader title="Customer Journey" description="How customers grow, plateau, and churn" />

      {/* 2×2 chart grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sl-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Orders per Customer</h2>
          <HistBar data={ORDERS_HIST} xKey="bucket" yKey="count" color="#14B8A6" xLabel="Order count" />
        </div>
        <div className="sl-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Purchase Gap Distribution (days)</h2>
          <HistBar data={GAP_HIST} xKey="bucket" yKey="count" color="#38BDF8" xLabel="Days between orders" />
        </div>
        <div className="sl-card p-4">
          <h2 className="mb-1 text-sm font-semibold text-foreground">Revenue Concentration (Lorenz Curve)</h2>
          <p className="mb-2 text-xs text-muted-foreground">20% of customers → ~66% of revenue</p>
          <LorenzCurve />
        </div>
        <div className="sl-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Customers Acquired per Month</h2>
          <HistBar data={ACQUIRED_PER_MONTH} xKey="month" yKey="acquired" color="#A78BFA" xLabel="Month" />
        </div>
      </div>

      {/* Customer table */}
      <div className="sl-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">Customer Detail</h2>
          <span className="text-xs text-faint">Click row → Customer 360</span>
        </div>
        <DataTable
          rows={JOURNEY_CUSTOMERS}
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
                const map = { up: { label: '↑ Widening', color: 'var(--negative)' }, down: { label: '↓ Shrinking', color: 'var(--positive)' }, flat: { label: '→ Stable', color: 'var(--muted-foreground)' } }
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
