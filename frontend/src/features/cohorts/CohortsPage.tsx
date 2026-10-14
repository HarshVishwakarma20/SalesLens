import { useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { PageHeader } from '@/components/ui/page-header'
import { InsightBanner } from '@/components/ui/insight-banner'
import { DataTable } from '@/components/tables/DataTable'
import { COHORT_ROWS } from '@/lib/mock-data'
import { CHART_COLOURS } from '@/lib/colours'

const MONTHS = Array.from({ length: 13 }, (_, i) => `M${i}`)

function CohortHeatmap({ mode, showAbsolute }: { mode: 'customer' | 'revenue'; showAbsolute: boolean }) {
  const maxVal = 100

  return (
    <div className="overflow-x-auto">
      <table className="text-xs border-separate border-spacing-0.5">
        <thead>
          <tr>
            <th className="pr-2 text-right text-[10px] text-faint font-normal w-20">Cohort</th>
            <th className="text-[10px] text-faint font-normal w-8">Size</th>
            {MONTHS.map(m => (
              <th key={m} className="text-[10px] text-faint font-normal w-11">{m}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COHORT_ROWS.map((row) => {
            const data = mode === 'customer' ? row.retention : row.revenue
            return (
              <tr key={row.label}>
                <td className="pr-2 text-right text-[10px] text-muted-foreground">{row.label}</td>
                <td className="text-center text-[10px] num-tabular text-faint">{row.size}</td>
                {MONTHS.map((_, mi) => {
                  const val = data[mi]
                  if (val === undefined) return <td key={mi} className="w-11 h-[34px]" />
                  const isLast = mi === data.length - 1
                  const intensity = val / maxVal
                  const displayVal = showAbsolute
                    ? Math.round((val / 100) * row.size)
                    : val.toFixed(1)
                  return (
                    <td
                      key={mi}
                      title={`${row.label} M${mi}: ${val.toFixed(1)}% | ${isLast ? 'Partial month' : ''}`}
                      className={`h-[34px] w-11 rounded-md text-center text-[10px] font-semibold transition-transform hover:scale-110 cursor-default ${isLast ? 'ring-1 ring-dashed ring-border' : ''}`}
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

function RetentionWaterfallChart() {
  // Month 0->1 is the biggest drop-off
  const cohortAvg = COHORT_ROWS.map((row) => ({
    month: row.label,
    val: row.retention[row.retention.length - 1] ?? 0,
  }))

  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: 12, textStyle: { color: 'var(--foreground)', fontSize: 12 } },
    xAxis: { data: COHORT_ROWS.map(r => r.label), axisLabel: { color: CHART_COLOURS.axis, fontSize: 10, rotate: 30 }, axisLine: { show: false } },
    yAxis: { axisLabel: { color: CHART_COLOURS.axis, fontSize: 11, formatter: (v: number) => `${v}%` }, axisLine: { show: false }, splitLine: { lineStyle: { color: CHART_COLOURS.grid } } },
    series: [{
      type: 'bar',
      data: cohortAvg.map(d => d.val),
      itemStyle: { color: '#14B8A6', borderRadius: [4, 4, 0, 0] },
      label: { show: true, position: 'top', color: 'var(--muted-foreground)', fontSize: 9, formatter: (p: { value: number }) => `${p.value.toFixed(1)}%` },
    }],
    grid: { top: 30, bottom: 60, left: 50, right: 20 },
  }
  return <ReactECharts option={option} style={{ height: 240 }} notMerge />
}

function RetentionCurvesChart({ mode }: { mode: 'customer' | 'revenue' }) {
  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: 12, textStyle: { color: 'var(--foreground)', fontSize: 11 } },
    legend: { textStyle: { color: 'var(--muted-foreground)', fontSize: 10 }, bottom: 0, type: 'scroll' },
    xAxis: { data: MONTHS, axisLabel: { color: CHART_COLOURS.axis, fontSize: 10 }, axisLine: { show: false } },
    yAxis: { axisLabel: { color: CHART_COLOURS.axis, fontSize: 10, formatter: (v: number) => `${v}%` }, axisLine: { show: false }, splitLine: { lineStyle: { color: CHART_COLOURS.grid } } },
    series: COHORT_ROWS.slice(0, 6).map((row, i) => {
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
    grid: { top: 20, bottom: 60, left: 50, right: 20 },
  }
  return <ReactECharts option={option} style={{ height: 260 }} notMerge />
}

export function CohortsPage() {
  const [mode, setMode] = useState<'customer' | 'revenue'>('customer')
  const [showAbsolute, setShowAbsolute] = useState(false)

  return (
    <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
      <PageHeader title="Cohorts and Retention" description="Do customers, and their money, come back?" />

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
      <div className="sl-card p-4 overflow-x-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Cohort Retention Heatmap</h2>
          <span className="text-xs text-faint">{mode === 'customer' ? '% of original cohort still active' : '% of month-0 revenue retained'}</span>
        </div>
        <CohortHeatmap mode={mode} showAbsolute={showAbsolute} />
      </div>

      {/* Waterfall + Curves */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="sl-card p-4">
          <h2 className="mb-1 text-sm font-semibold text-foreground">Last-Month Retention by Cohort</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            <span className="rounded-full border border-negative/30 bg-negative/10 px-2 py-0.5 text-negative text-[10px]">Biggest drop-off: month 0 → 1</span>
          </p>
          <RetentionWaterfallChart />
        </div>
        <div className="sl-card p-4">
          <h2 className="mb-1 text-sm font-semibold text-foreground">Retention Curves</h2>
          <p className="mb-3 text-xs text-muted-foreground">First 6 cohorts shown</p>
          <RetentionCurvesChart mode={mode} />
        </div>
      </div>

      {/* Table */}
      <div className="sl-card p-4">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Cohort Summary</h2>
        <DataTable
          rows={COHORT_ROWS.map(r => ({ cohort: r.label, size: r.size, m1: r.retention[1] ?? 0, m3: r.retention[3] ?? 0, m6: r.retention[6] ?? 0, m12: r.retention[12] ?? 0 }))}
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
