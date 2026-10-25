import { PageHeader } from '@/components/ui/page-header'
import { InsightBanner } from '@/components/ui/insight-banner'
import { ChartCard } from '@/components/ui/chart-card'
import { DataTable } from '@/components/tables/DataTable'
import { formatGBP } from '@/lib/formatters'
import ReactECharts from 'echarts-for-react'
import { useDatasetStore } from '@/stores/dataset'
import { UploadPendingState, ProcessingState, ErrorState } from '@/components/ui/pending-state'
import { useAnomaliesData } from '@/hooks/useBackendData'

export function AnomaliesPage() {
  const { status, error } = useDatasetStore()
  const { data: dailySeries, isLoading } = useAnomaliesData()

  if (status === 'idle') {
    return (
      <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
        <PageHeader title="Anomalies" description="Detect out-of-trend spikes and drops in daily revenue" />
        <UploadPendingState description="Please upload a file to generate analytics." />
      </div>
    )
  }

  if (status === 'uploading' || status === 'processing') {
    return (
      <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
        <PageHeader title="Anomalies" description="Detect out-of-trend spikes and drops in daily revenue" />
        <ProcessingState />
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
        <PageHeader title="Anomalies" description="Detect out-of-trend spikes and drops in daily revenue" />
        <ErrorState message={error ?? 'Processing failed. Please try again.'} />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
        <PageHeader title="Anomalies" description="Detect out-of-trend spikes and drops in daily revenue" />
        <ProcessingState />
      </div>
    )
  }

  const FLAGGED = dailySeries.filter(d => d.flagged)

  const chartOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'var(--card)',
      borderColor: 'var(--border)',
      borderRadius: 12,
      textStyle: { color: 'var(--foreground)', fontSize: 12 },
      formatter: (params: { name: string; value: number; seriesName: string }[]) =>
        params.map(p => `${p.seriesName}: ${p.seriesName === 'Sales' ? formatGBP(p.value) : p.value.toFixed(2)}`).join('<br/>'),
    },
    legend: { data: ['Sales', 'Rolling Mean', 'Z-Score'], textStyle: { color: 'var(--muted-foreground)', fontSize: 10 }, bottom: 0 },
    xAxis: { type: 'category', data: dailySeries.map(d => d.date), axisLabel: { color: '#888', fontSize: 9, rotate: 30, interval: 29 }, axisLine: { show: false } },
    yAxis: [
      { type: 'value', name: 'Revenue', nameTextStyle: { color: '#888', fontSize: 10 }, axisLabel: { color: '#888', fontSize: 9, formatter: (v: number) => `£${(v / 1000).toFixed(0)}k` }, axisLine: { show: false }, splitLine: { lineStyle: { color: '#222' } } },
      { type: 'value', name: 'Z', nameTextStyle: { color: '#888', fontSize: 10 }, axisLabel: { color: '#888', fontSize: 9 }, axisLine: { show: false }, splitLine: { show: false } },
    ],
    series: [
      { name: 'Sales', type: 'line', data: dailySeries.map(d => d.sales), smooth: true, lineStyle: { color: '#14B8A6', width: 1.5 }, itemStyle: { color: '#14B8A6' }, symbol: 'none' },
      { name: 'Rolling Mean', type: 'line', data: dailySeries.map(d => d.mean), smooth: true, lineStyle: { color: '#38BDF8', type: 'dashed', width: 1 }, symbol: 'none', itemStyle: { color: '#38BDF8' } },
      {
        name: 'Z-Score', type: 'bar', yAxisIndex: 1, data: dailySeries.map(d => ({
          value: d.zScore,
          itemStyle: { color: Math.abs(d.zScore) > 2 ? (d.zScore > 0 ? '#F87171' : '#FB923C') : 'rgba(100,100,100,0.3)', borderRadius: [2, 2, 0, 0] },
        })),
      },
    ],
    grid: { top: 30, bottom: 55, left: 60, right: 50 },
  }

  return (
    <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
      <PageHeader title="Anomalies" description="Detect out-of-trend spikes and drops in daily revenue" />

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="sl-card p-4">
          <p className="text-[11px] uppercase tracking-wider text-faint">Flagged days</p>
          <p className="num-tabular mt-1 text-2xl font-bold text-negative">{FLAGGED.length}</p>
        </div>
        <div className="sl-card p-4">
          <p className="text-[11px] uppercase tracking-wider text-faint">Spikes</p>
          <p className="num-tabular mt-1 text-2xl font-bold text-negative">{FLAGGED.filter(d => d.direction === 'spike').length}</p>
        </div>
        <div className="sl-card p-4">
          <p className="text-[11px] uppercase tracking-wider text-faint">Drops</p>
          <p className="num-tabular mt-1 text-2xl font-bold text-warning">{FLAGGED.filter(d => d.direction === 'drop').length}</p>
        </div>
      </div>

      <ChartCard title="Daily Revenue + Z-Score" description="Red bars = spike, orange = drop (|z| > 2); dashed line = 30-day rolling mean">
        <ReactECharts option={chartOption} style={{ height: 300 }} notMerge />
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-border/60 bg-raised/30 px-3 py-2 text-xs text-muted-foreground leading-relaxed">
          <span><strong className="text-foreground">Chart Explanation: </strong>Combines actual daily revenue (teal line) with a 30-day rolling baseline (blue dashed line). Daily deviations exceeding 2 standard deviations (|z| &gt; 2) are flagged as demand spikes (red) or revenue drops (orange).</span>
        </div>
      </ChartCard>

      {/* Flagged days chips */}
      <div className="sl-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Flagged Days</h2>
        <div className="flex flex-wrap gap-2">
          {FLAGGED.filter(d => d.direction !== null).map(d => (
            <span
              key={d.date}
              className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
              style={{
                background: d.direction === 'spike' ? 'rgba(248,113,113,0.15)' : 'rgba(251,146,60,0.15)',
                color: d.direction === 'spike' ? '#F87171' : '#FB923C',
              }}
            >
              {d.date} {d.direction === 'spike' ? '↑' : '↓'} z={(d.zScore ?? 0).toFixed(1)}
            </span>
          ))}
        </div>
      </div>

      {/* Flagged table */}
      <div className="sl-card p-4">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Flagged Day Detail</h2>
        <DataTable
          rows={FLAGGED}
          rowKey={r => r.date}
          columns={[
            { key: 'date', header: 'Date', render: r => r.date },
            {
              key: 'direction', header: 'Type', render: r => r.direction ? (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: r.direction === 'spike' ? 'rgba(248,113,113,0.15)' : 'rgba(251,146,60,0.15)', color: r.direction === 'spike' ? '#F87171' : '#FB923C' }}>
                  {r.direction === 'spike' ? '↑ Spike' : '↓ Drop'}
                </span>
              ) : null
            },
            { key: 'sales', header: 'Sales', align: 'right', sortable: true, render: r => formatGBP(r.sales ?? 0) },
            { key: 'mean', header: 'Rolling Mean', align: 'right', render: r => formatGBP(r.mean ?? 0) },
            { key: 'zScore', header: 'Z-Score', align: 'right', sortable: true, render: r => <span className="num-tabular font-bold">{(r.zScore ?? 0).toFixed(2)}</span> },
            {
              key: 'affectedCustomers', header: 'Affected Customers', render: r => (
                <div className="flex flex-wrap gap-1">
                  {r.affectedCustomers.slice(0, 4).map(id => (
                    <span key={id} className="rounded bg-raised px-1.5 py-0.5 font-mono text-[10px] text-faint">{id}</span>
                  ))}
                  {r.affectedCustomers.length > 4 && <span className="text-[10px] text-faint">+{r.affectedCustomers.length - 4}</span>}
                </div>
              )
            },
          ]}
        />
      </div>

      <InsightBanner>
        {FLAGGED.filter(d => d.direction === 'spike').length} spike days are strongly correlated with end-of-month bulk ordering. Monitor these with targeted stock alerts.
      </InsightBanner>
    </div>
  )
}
