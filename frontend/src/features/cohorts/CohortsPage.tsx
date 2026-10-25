import { useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { PageHeader } from '@/components/ui/page-header'
import { InsightBanner } from '@/components/ui/insight-banner'
import { DataTable } from '@/components/tables/DataTable'
import { CHART_COLOURS } from '@/lib/colours'
import { useDatasetStore } from '@/stores/dataset'
import { UploadPendingState, ProcessingState, ErrorState } from '@/components/ui/pending-state'
import { Info } from 'lucide-react'
import { useCohortsData } from '@/hooks/useBackendData'
import type { CohortRow } from '@/lib/types'

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

function CohortHeatmap({ mode, showAbsolute, cohortRows }: { mode: 'customer' | 'revenue'; showAbsolute: boolean; cohortRows: CohortRow[] }) {
  const [focusCell, setFocusCell] = useState<string | null>(null)
  const maxVal = 100
  const maxMonths = Math.max(...cohortRows.map(r => r.retention.length), 13)
  const MONTHS = Array.from({ length: maxMonths }, (_, i) => `M${i}`)

  return (
    <div className="w-full overflow-auto rounded-xl" style={{ maxHeight: 420 }}>
      <table className="text-xs border-separate border-spacing-0.5 min-w-max">
        <thead className="sticky top-0 z-10 bg-card">
          <tr>
            <th className="pr-2 text-right text-[10px] text-faint font-normal w-20">Cohort</th>
            <th className="text-[10px] text-faint font-normal w-12 text-center">Size</th>
            {MONTHS.map(m => (
              <th key={m} className="text-[10px] text-faint font-normal w-12 text-center">{m}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohortRows.map((row) => {
            const data = mode === 'customer' ? row.retention : row.revenue
            return (
              <tr key={row.label}>
                <td className="pr-2 text-right text-[10px] text-muted-foreground whitespace-nowrap sticky left-0 bg-card z-[1]">{row.label}</td>
                <td className="text-center text-[10px] num-tabular text-faint w-12">{row.size.toLocaleString()}</td>
                {MONTHS.map((_, mi) => {
                  const val = data[mi]
                  if (val === undefined) return <td key={mi} className="w-12 h-[34px]" />
                  const isLast = mi === data.length - 1
                  const intensity = val / maxVal
                  const displayVal = showAbsolute
                    ? Math.round((val / 100) * row.size)
                    : val.toFixed(1)
                  const cellKey = `${row.label}-${mi}`
                  const isFocused = focusCell === cellKey
                  return (
                    <td
                      key={mi}
                      tabIndex={0}
                      onClick={() => setFocusCell(isFocused ? null : cellKey)}
                      onKeyDown={e => e.key === 'Enter' && setFocusCell(isFocused ? null : cellKey)}
                      title={`${row.label} M${mi}: ${val.toFixed(1)}%${isLast ? ' | Partial month' : ''}`}
                      className={`h-[34px] w-12 rounded-md text-center text-[10px] font-semibold transition-all cursor-pointer select-none ${isLast ? 'ring-1 ring-dashed ring-border' : ''
                        } ${isFocused ? 'ring-2 ring-accent scale-110 z-10 relative' : 'hover:scale-110 hover:ring-1 hover:ring-accent/60'}`}
                      style={{
                        background: `rgba(20,184,166,${0.06 + intensity * 0.6})`,
                        color: intensity > 0.5 ? 'var(--foreground)' : 'var(--muted-foreground)',
                      }}
                    >
                      {displayVal}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function RetentionWaterfallChart({ cohortRows }: { cohortRows: CohortRow[] }) {
  const cohortAvg = cohortRows.map((row) => ({
    month: row.label,
    val: row.retention[row.retention.length - 1] ?? 0,
  }))

  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: 12, textStyle: { color: 'var(--foreground)', fontSize: 12 } },
    xAxis: { data: cohortRows.map(r => r.label), axisLabel: { color: CHART_COLOURS.axis, fontSize: 10, rotate: 30 }, axisLine: { show: false } },
    yAxis: { axisLabel: { color: CHART_COLOURS.axis, fontSize: 11, formatter: (v: number) => `${v}%` }, axisLine: { show: false }, splitLine: { lineStyle: { color: CHART_COLOURS.grid } } },
    dataZoom: [
      { type: 'slider', bottom: 8, height: 18, borderColor: 'var(--border)', fillerColor: 'rgba(20,184,166,0.12)', handleStyle: { color: '#14B8A6' }, textStyle: { color: 'var(--muted-foreground)', fontSize: 10 } },
      { type: 'inside' },
    ],
    series: [{
      type: 'bar',
      data: cohortAvg.map(d => d.val),
      itemStyle: { color: '#14B8A6', borderRadius: [4, 4, 0, 0] },
      label: { show: true, position: 'top', color: 'var(--muted-foreground)', fontSize: 9, formatter: (p: { value: number }) => `${p.value.toFixed(1)}%` },
    }],
    grid: { top: 30, bottom: 72, left: 50, right: 20 },
  }
  return <ReactECharts option={option} style={{ height: 280 }} notMerge />
}

function RetentionCurvesChart({ mode, cohortRows }: { mode: 'customer' | 'revenue'; cohortRows: CohortRow[] }) {
  const maxMonths = Math.max(...cohortRows.map(r => r.retention.length), 13)
  const MONTHS = Array.from({ length: maxMonths }, (_, i) => `M${i}`)

  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: 12, textStyle: { color: 'var(--foreground)', fontSize: 11 } },
    legend: { textStyle: { color: 'var(--muted-foreground)', fontSize: 10 }, bottom: 30, type: 'scroll' },
    xAxis: { data: MONTHS, axisLabel: { color: CHART_COLOURS.axis, fontSize: 10 }, axisLine: { show: false } },
    yAxis: { axisLabel: { color: CHART_COLOURS.axis, fontSize: 10, formatter: (v: number) => `${v}%` }, axisLine: { show: false }, splitLine: { lineStyle: { color: CHART_COLOURS.grid } } },
    dataZoom: [
      { type: 'slider', bottom: 8, height: 16, borderColor: 'var(--border)', fillerColor: 'rgba(20,184,166,0.12)', handleStyle: { color: '#14B8A6' }, textStyle: { color: 'var(--muted-foreground)', fontSize: 10 } },
      { type: 'inside' },
    ],
    series: cohortRows.slice(0, 6).map((row, i) => {
      const data = (mode === 'customer' ? row.retention : row.revenue).map((v, mi) => ({ value: v, symbol: mi === (row.retention.length - 1) ? 'emptyCircle' : 'none' }))
      const hue = i * 45
      return {
        name: row.label,
        type: 'line',
        data,
        smooth: true,
        lineStyle: { width: 2 },
        itemStyle: { color: `hsl(${170 + hue},70%,50%)` },
        emphasis: { focus: 'series' },
      }
    }),
    grid: { top: 20, bottom: 72, left: 50, right: 20 },
  }
  return <ReactECharts option={option} style={{ height: 300 }} notMerge />
}

export function CohortsPage() {
  const [mode, setMode] = useState<'customer' | 'revenue'>('customer')
  const [showAbsolute, setShowAbsolute] = useState(false)
  const { status, error } = useDatasetStore()
  const { data: cohortRows, isLoading } = useCohortsData()

  if (status === 'idle') {
    return (
      <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
        <PageHeader title="Cohorts and Retention" description="Do customers, and their money, come back?" />
        <UploadPendingState description="Please upload a file to generate analytics." />
      </div>
    )
  }

  if (status === 'uploading' || status === 'processing') {
    return (
      <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
        <PageHeader title="Cohorts and Retention" description="Do customers, and their money, come back?" />
        <ProcessingState />
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
        <PageHeader title="Cohorts and Retention" description="Do customers, and their money, come back?" />
        <ErrorState message={error ?? 'Processing failed. Please try again.'} />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
        <PageHeader title="Cohorts and Retention" description="Do customers, and their money, come back?" />
        <ProcessingState />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
      <PageHeader title="Cohorts and Retention" description="Do customers, and their money, come back?" />

      {/* Page explanation */}
      <div className="rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
        <span className="font-semibold text-accent">How to read this page: </span>
        Each row is a cohort of customers who made their first purchase in that month. Columns M0–M12 show what percentage returned in subsequent months. Darker teal = stronger retention. Toggle between Customer and Revenue retention. Click any heatmap cell to highlight it.
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-[10px] border border-border bg-raised/60 p-0.5">
          {(['customer', 'revenue'] as const).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${mode === m ? 'bg-card text-foreground shadow' : 'text-faint hover:text-foreground'}`}
            >
              {m === 'customer' ? 'Customer retention' : 'Revenue retention'}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={showAbsolute} onChange={e => setShowAbsolute(e.target.checked)} className="accent-[var(--accent)]" />
          Show absolute numbers
        </label>
      </div>

      {/* Heatmap */}
      <div className="sl-card p-4" tabIndex={0}>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">Cohort Retention Heatmap</h2>
            <ExplainTip text="Each cell shows what % of the original cohort (or revenue) is still active N months later. Click any cell to highlight it. M0 is always 100%." />
          </div>
          <span className="text-xs text-faint">{mode === 'customer' ? '% of original cohort still active' : '% of month-0 revenue retained'}</span>
        </div>
        <CohortHeatmap mode={mode} showAbsolute={showAbsolute} cohortRows={cohortRows} />
      </div>

      {/* Waterfall + Curves */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="sl-card p-4" tabIndex={0}>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-sm font-semibold text-foreground">Last-Month Retention by Cohort</h2>
            <ExplainTip text="Shows the retention rate of each cohort at its most recent observable month. Drag the slider below to zoom into specific cohorts." />
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            <span className="rounded-full border border-negative/30 bg-negative/10 px-2 py-0.5 text-negative text-[10px]">Biggest drop-off: month 0 → 1</span>
            <span className="ml-2 text-faint">· drag slider to zoom</span>
          </p>
          <RetentionWaterfallChart cohortRows={cohortRows} />
        </div>
        <div className="sl-card p-4" tabIndex={0}>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-sm font-semibold text-foreground">Retention Curves</h2>
            <ExplainTip text="Each line tracks how a cohort's retention evolves over 12 months. Hover a line to focus it. Drag the slider to zoom into specific months." />
          </div>
          <RetentionCurvesChart mode={mode} cohortRows={cohortRows} />
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-border/60 bg-raised/30 px-3 py-2 text-xs text-muted-foreground leading-relaxed">
            <span><strong className="text-foreground">Chart Explanation: </strong>Tracks customer repeat purchasing or revenue decay over 12 months (M0 to M12) from initial acquisition, revealing retention half-life.</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="sl-card p-4" tabIndex={0}>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-sm font-semibold text-foreground">Cohort Summary</h2>
          <ExplainTip text="Sortable table showing M1, M3, M6, M12 retention milestones for each cohort. Click column headers to sort." />
        </div>
        <DataTable
          rows={cohortRows.map(r => ({ cohort: r.label, size: r.size, m1: r.retention[1] ?? 0, m3: r.retention[3] ?? 0, m6: r.retention[6] ?? 0, m12: r.retention[12] ?? 0 }))}
          rowKey={r => r.cohort}
          columns={[
            { key: 'cohort', header: 'Cohort', render: r => r.cohort },
            { key: 'size', header: 'Size', align: 'right', sortable: true, render: r => r.size.toLocaleString() },
            { key: 'm1', header: 'M1 %', align: 'right', sortable: true, render: r => r.m1 > 0 ? `${r.m1.toFixed(1)}%` : '—' },
            { key: 'm3', header: 'M3 %', align: 'right', sortable: true, render: r => r.m3 > 0 ? `${r.m3.toFixed(1)}%` : '—' },
            { key: 'm6', header: 'M6 %', align: 'right', sortable: true, render: r => r.m6 > 0 ? `${r.m6.toFixed(1)}%` : '—' },
            { key: 'm12', header: 'M12 %', align: 'right', sortable: true, render: r => r.m12 > 0 ? `${r.m12.toFixed(1)}%` : '—' },
          ]}
        />
      </div>

      <InsightBanner>The biggest retention drop is always month 0 → 1. A post-first-purchase email sequence within 7 days can recover 8–12% of customers.</InsightBanner>
    </div>
  )
}
