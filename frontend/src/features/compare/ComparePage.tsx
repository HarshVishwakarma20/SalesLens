import { useState, useMemo } from 'react'
import {
  Lock,
  Unlock,
  GitCompareArrows,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Database,
  Sparkles,
  Search,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EChart, baseTooltip } from '@/components/charts/EChart'
import { CHART_COLOURS } from '@/lib/colours'
import { formatGBPCompact } from '@/lib/formatters'
import { useDataset } from '@/hooks/useDataset'
import {
  HISTORICAL_DATASETS,
  computeComparison,
} from './compare-data'
import { cn } from '@/lib/utils'

export function ComparePage() {
  const { data: currentDataset } = useDataset()
  const [selectedBaselineId, setSelectedBaselineId] = useState<string>(
    HISTORICAL_DATASETS[0].id,
  )
  const [isLockedMode, setIsLockedMode] = useState<boolean>(true)
  const [tableSearch, setTableSearch] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')

  const baseline = useMemo(() => {
    return (
      HISTORICAL_DATASETS.find((h) => h.id === selectedBaselineId) ||
      HISTORICAL_DATASETS[0]
    )
  }, [selectedBaselineId])

  const comparison = useMemo(() => {
    return computeComparison(currentDataset, baseline)
  }, [currentDataset, baseline])

  // Filtered metrics
  const filteredMetrics = useMemo(() => {
    return comparison.metrics.filter((m) => {
      const matchCat =
        selectedCategory === 'All' || m.category === selectedCategory
      const matchSearch =
        tableSearch === '' ||
        m.label.toLowerCase().includes(tableSearch.toLowerCase()) ||
        m.description.toLowerCase().includes(tableSearch.toLowerCase())
      return matchCat && matchSearch
    })
  }, [comparison.metrics, selectedCategory, tableSearch])

  // Monthly Sales comparison chart option
  const monthlyChartOption = useMemo(() => {
    const months = comparison.monthlyComparison.map((m) => m.month)
    const prevSales = comparison.monthlyComparison.map((m) => m.previous)
    const curSales = comparison.monthlyComparison.map((m) => m.current)

    return {
      animationDuration: 700,
      grid: { left: 72, right: 28, top: 36, bottom: 28 },
      legend: {
        top: 0,
        right: 10,
        textStyle: { color: CHART_COLOURS.axis, fontSize: 11 },
        data: ['Previous Dataset', 'Current Dataset'],
      },
      tooltip: {
        ...baseTooltip,
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        formatter: (params: any) => {
          if (!Array.isArray(params)) return ''
          const month = params[0]?.name || ''
          let html = `<div style="font-weight:600;margin-bottom:4px;color:#f8fafc">${month}</div>`
          params.forEach((p: any) => {
            html += `<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;font-size:12px;margin-top:2px;">
              <span style="color:${p.color}">${p.seriesName}</span>
              <span style="font-weight:bold;color:#f8fafc">${formatGBPCompact(p.value || 0)}</span>
            </div>`
          })
          return html
        },
      },
      xAxis: {
        type: 'category',
        data: months,
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#1B3A45' } },
        axisLabel: {
          color: CHART_COLOURS.axis,
          fontSize: 10,
          fontFamily: 'JetBrains Mono, monospace',
        },
      },
      yAxis: {
        type: 'value',
        splitNumber: 4,
        splitLine: { lineStyle: { color: CHART_COLOURS.grid, type: 'dashed' } },
        axisLabel: {
          color: CHART_COLOURS.axis,
          fontSize: 10,
          fontFamily: 'JetBrains Mono, monospace',
          hideOverlap: true,
          formatter: (v: number) => formatGBPCompact(v),
        },
      },
      series: [
        {
          name: 'Previous Dataset',
          type: 'line',
          data: prevSales,
          smooth: true,
          lineStyle: {
            width: 2,
            type: 'dashed',
            color: '#64748b', // Slate gray
          },
          itemStyle: { color: '#64748b' },
          symbol: 'circle',
          symbolSize: 5,
        },
        {
          name: 'Current Dataset',
          type: 'line',
          data: curSales,
          smooth: true,
          lineStyle: {
            width: 2.5,
            color: '#00F5D4', // Teal/cyan accent
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(0, 245, 212, 0.28)' },
                { offset: 1, color: 'rgba(0, 245, 212, 0.00)' },
              ],
            },
          },
          itemStyle: { color: '#00F5D4' },
          symbol: 'circle',
          symbolSize: 6,
        },
      ],
    }
  }, [comparison.monthlyComparison])

  // Customer segment comparison chart option
  const segmentChartOption = useMemo(() => {
    const segNames = comparison.segmentComparison.map((s) => s.segment)
    const prevCounts = comparison.segmentComparison.map((s) => s.previousCount)
    const curCounts = comparison.segmentComparison.map((s) => s.currentCount)

    return {
      animationDuration: 700,
      grid: { left: 56, right: 24, top: 36, bottom: 60 },
      legend: {
        top: 0,
        right: 10,
        textStyle: { color: CHART_COLOURS.axis, fontSize: 11 },
        data: ['Previous Run', 'Current Run'],
      },
      tooltip: {
        ...baseTooltip,
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      xAxis: {
        type: 'category',
        data: segNames,
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#1B3A45' } },
        axisLabel: {
          color: CHART_COLOURS.axis,
          fontSize: 9,
          interval: 0,
          rotate: 30,
          hideOverlap: true,
        },
      },
      yAxis: {
        type: 'value',
        splitNumber: 4,
        minInterval: 1,
        splitLine: { lineStyle: { color: CHART_COLOURS.grid, type: 'dashed' } },
        axisLabel: {
          color: CHART_COLOURS.axis,
          fontSize: 10,
          fontFamily: 'JetBrains Mono, monospace',
          hideOverlap: true,
          formatter: (v: number) =>
            v >= 1000 ? `${(v / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(Math.round(v)),
        },
      },
      series: [
        {
          name: 'Previous Run',
          type: 'bar',
          data: prevCounts,
          barGap: '20%',
          barMaxWidth: 28,
          itemStyle: {
            color: '#475569',
            borderRadius: [4, 4, 0, 0],
          },
        },
        {
          name: 'Current Run',
          type: 'bar',
          data: curCounts,
          barMaxWidth: 28,
          itemStyle: {
            color: '#0EA5E9',
            borderRadius: [4, 4, 0, 0],
          },
        },
      ],
    }
  }, [comparison.segmentComparison])

  return (
    <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
      {/* Top Header */}
      <PageHeader
        title="Dataset & Historical Comparison"
        description="Compare key performance indicators, customer segment movements, and sales trajectories between consecutive data uploads."
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={isLockedMode ? 'raised' : 'primary'}
              onClick={() => setIsLockedMode(!isLockedMode)}
              className="flex items-center gap-1.5"
            >
              {isLockedMode ? (
                <>
                  <Unlock className="size-3.5 text-accent" />
                  <span>Preview Implementation</span>
                </>
              ) : (
                <>
                  <Lock className="size-3.5 text-amber-400" />
                  <span>Lock View</span>
                </>
              )}
            </Button>
          </div>
        }
      />

      {/* Feature Locked Notice Banner */}
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border p-5 transition-all',
          isLockedMode
            ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
            : 'border-accent/30 bg-accent/5 text-foreground',
        )}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-xl border',
                isLockedMode
                  ? 'border-amber-500/30 bg-amber-500/20 text-amber-400'
                  : 'border-accent/30 bg-accent/20 text-accent',
              )}
            >
              {isLockedMode ? (
                <Lock className="size-5" />
              ) : (
                <GitCompareArrows className="size-5" />
              )}
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-foreground">
                  {isLockedMode
                    ? 'Comparison Engine (Locked — Multi-Dataset Account Persistence Required)'
                    : 'Interactive Comparison Implementation (Preview Mode Active)'}
                </span>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                    isLockedMode
                      ? 'border border-amber-500/40 bg-amber-500/20 text-amber-300'
                      : 'border border-accent/40 bg-accent/20 text-accent',
                  )}
                >
                  {isLockedMode ? 'Locked Status' : 'Demo Preview'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isLockedMode
                  ? 'Multi-dataset comparison requires an authenticated customer profile (login & password) so historical dataset versions remain securely tied to your company account. Authentication is planned for upcoming releases. Click "Preview Implementation" to test the fully integrated comparison logic.'
                  : 'You are viewing the fully implemented comparison dashboard. You can switch baseline datasets, inspect delta calculations, and view comparative segment/monthly analytics.'}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <Button
              size="sm"
              variant={isLockedMode ? 'primary' : 'raised'}
              onClick={() => setIsLockedMode(!isLockedMode)}
              className="w-full sm:w-auto"
            >
              {isLockedMode ? 'Unlock Demo Preview' : 'Show Locked State'}
            </Button>
          </div>
        </div>
      </div>

      {/* Dataset Selection & Alignment Panel */}
      <div className="relative">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Baseline Dataset Card */}
          <div className="lg:col-span-5">
            <Card className="h-full">
              <CardHeader
                title={
                  <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Database className="size-3.5 text-faint" />
                    Baseline Dataset (Previous Run)
                  </span>
                }
                actions={<Badge tone="neutral">Reference</Badge>}
              />
              <div className="flex flex-col gap-3 mt-3">
                <div>
                  <label
                    htmlFor="baseline-select"
                    className="mb-1 block text-xs text-muted-foreground"
                  >
                    Select Historical Dataset Snapshot:
                  </label>
                  <select
                    id="baseline-select"
                    value={selectedBaselineId}
                    onChange={(e) => setSelectedBaselineId(e.target.value)}
                    disabled={isLockedMode}
                    className="w-full rounded-lg border border-border bg-raised px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent disabled:opacity-60"
                  >
                    {HISTORICAL_DATASETS.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2 rounded-xl border border-border bg-raised/50 p-2.5 text-center">
                  <div>
                    <span className="block text-[10px] text-muted-foreground">
                      Period
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      {baseline.dateRange}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-muted-foreground">
                      Customers
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      {baseline.customers.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-muted-foreground">
                      Row Count
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      {baseline.rows.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Comparison Divider / Direction Icon */}
          <div className="flex items-center justify-center lg:col-span-2">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-accent/30 bg-accent/10 shadow-[0_0_15px_rgba(0,245,212,0.15)]">
              <GitCompareArrows className="size-6 text-accent" />
            </div>
          </div>

          {/* Current Active Dataset Card */}
          <div className="lg:col-span-5">
            <Card className="h-full">
              <CardHeader
                title={
                  <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
                    <Sparkles className="size-3.5" />
                    Target Dataset (Current Active)
                  </span>
                }
                actions={<Badge tone="accent">Active Upload</Badge>}
              />
              <div className="flex flex-col gap-3 mt-3">
                <div>
                  <span className="mb-1 block text-xs text-muted-foreground">
                    Current Active File:
                  </span>
                  <div className="flex h-[38px] items-center rounded-lg border border-accent/30 bg-accent/5 px-3 text-sm font-semibold text-foreground">
                    {currentDataset?.name || 'Active Dataset Run'}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 rounded-xl border border-border bg-raised/50 p-2.5 text-center">
                  <div>
                    <span className="block text-[10px] text-muted-foreground">
                      Date Range
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      {currentDataset?.dateRange
                        ? `${currentDataset.dateRange.from} - ${currentDataset.dateRange.to}`
                        : '01 Dec 2010 - 09 Dec 2011'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-muted-foreground">
                      Total Customers
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      {(currentDataset?.customers ?? 4334).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-muted-foreground">
                      Cleaned Rows
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      {(currentDataset?.rows ?? 399659).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Locked Overlay for Main Interactive Dashboard if in Locked View */}
        {isLockedMode && (
          <div className="pointer-events-auto absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl bg-background/60 p-6 backdrop-blur-[3px] transition-all">
            <div className="flex max-w-md flex-col items-center gap-3 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl border border-amber-500/40 bg-card p-3 shadow-xl">
                <Lock className="size-7 text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-foreground">
                Historical Comparison Tab Locked
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Persistent comparison requires saving multi-run datasets to an
                authenticated user profile. Since authentication (login/password)
                is scheduled for a later sprint, the implementation is
                ready in preview mode below.
              </p>
              <Button
                size="sm"
                variant="primary"
                onClick={() => setIsLockedMode(false)}
                className="mt-2 flex items-center gap-2"
              >
                <Unlock className="size-4" />
                Unlock & View Full Implementation
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Headline Delta Scorecard */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Headline Delta Scorecard (Previous vs Current)
          </h2>
          <span className="text-xs text-muted-foreground">
            Changes measured against {baseline.name}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {comparison.metrics.map((m) => {
            return (
              <Card
                key={m.key}
                className="relative overflow-hidden p-4 transition-all hover:border-accent/40"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground truncate">
                    {m.label}
                  </span>
                  <span
                    className={cn(
                      'flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold',
                      m.isPositive
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/30',
                    )}
                  >
                    {m.isPositive ? (
                      <ArrowUpRight className="size-3" />
                    ) : (
                      <ArrowDownRight className="size-3" />
                    )}
                    {m.diffPct}
                  </span>
                </div>

                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-xl font-bold tracking-tight text-foreground">
                    {m.currentValue}
                  </span>
                  <span className="text-xs text-muted-foreground line-through opacity-70">
                    {m.previousValue}
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2 text-[11px]">
                  <span className="text-muted-foreground">Absolute Shift:</span>
                  <span
                    className={cn(
                      'font-semibold',
                      m.isPositive ? 'text-emerald-400' : 'text-rose-400',
                    )}
                  >
                    {m.diffValue}
                  </span>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Visual Comparison Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Monthly Sales Trajectory Comparison */}
        <div>
          <Card>
            <CardHeader
              title="Monthly Sales Growth Trajectory"
              description="Gross sales comparison by sequence month"
              actions={<Badge tone="neutral">Dual Series</Badge>}
            />
            <div className="h-80 w-full mt-2">
              <EChart
                option={monthlyChartOption}
                ariaLabel="Monthly Sales Growth Trajectory Comparison Chart"
              />
            </div>
          </Card>
        </div>

        {/* Customer Segment Migration Comparison */}
        <div>
          <Card>
            <CardHeader
              title="Customer Segment Migration"
              description="Customer count shift across lifecycle segments"
              actions={<Badge tone="neutral">RFM Shift</Badge>}
            />
            <div className="h-80 w-full mt-2">
              <EChart
                option={segmentChartOption}
                ariaLabel="Customer Segment Migration Comparison Chart"
              />
            </div>
          </Card>
        </div>
      </div>

      {/* Leakage & Returns Comparison Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-12">
          <Card>
            <CardHeader
              title="Revenue Leakage & Profitability Reconciliation"
              description="Comparison of Gross Invoiced Volume vs. Return Leakage and Net Cash Captured"
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mt-4">
              {comparison.leakageComparison.map((item) => {
                const diff = item.current - item.previous
                const pct = ((diff / item.previous) * 100).toFixed(1)
                const isRet = item.label.includes('Return')
                const isPos = isRet ? diff <= 0 : diff >= 0
                return (
                  <div
                    key={item.label}
                    className="rounded-xl border border-border bg-raised/40 p-4"
                  >
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{item.label}</span>
                      <span
                        className={cn(
                          'font-semibold',
                          isPos ? 'text-emerald-400' : 'text-rose-400',
                        )}
                      >
                        {diff >= 0 ? '+' : ''}
                        {pct}%
                      </span>
                    </div>
                    <div className="mt-2 text-xl font-bold text-foreground">
                      £{Math.round(item.current).toLocaleString()}
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>
                        Previous: £{Math.round(item.previous).toLocaleString()}
                      </span>
                      <span
                        className={cn(
                          'font-medium',
                          isPos ? 'text-emerald-400' : 'text-rose-400',
                        )}
                      >
                        {diff >= 0 ? '+' : ''}£
                        {Math.round(Math.abs(diff)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* Detailed Metrics Comparison Table */}
      <Card>
        <CardHeader
          title="Comprehensive Metric Variance Table"
          description="Line-by-line comparison with direction, absolute change, and impact assessment"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter Pills */}
              <div className="flex rounded-lg border border-border bg-raised p-0.5">
                {['All', 'Revenue', 'Customers', 'Retention', 'Efficiency'].map(
                  (cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={cn(
                        'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                        selectedCategory === cat
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {cat}
                    </button>
                  ),
                )}
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
                <input
                  type="text"
                  placeholder="Filter metrics..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="h-8 rounded-lg border border-border bg-raised pl-8 pr-3 text-xs text-foreground placeholder:text-faint outline-none focus:border-accent"
                />
              </div>
            </div>
          }
        />

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-raised/60 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Metric</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4 text-right">Previous Baseline</th>
                <th className="py-2.5 px-4 text-right">Current Active</th>
                <th className="py-2.5 px-4 text-right">Variance (Δ)</th>
                <th className="py-2.5 px-4 text-right">% Change</th>
                <th className="py-2.5 px-4">Performance Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredMetrics.map((row) => (
                <tr
                  key={row.key}
                  className="transition-colors hover:bg-raised/40"
                >
                  <td className="py-3 px-4">
                    <div className="font-semibold text-foreground">
                      {row.label}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {row.description}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="rounded-md border border-border bg-raised px-2 py-0.5 text-[10px] text-muted-foreground">
                      {row.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                    {row.previousValue}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-foreground">
                    {row.currentValue}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold">
                    <span
                      className={
                        row.isPositive ? 'text-emerald-400' : 'text-rose-400'
                      }
                    >
                      {row.diffValue}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={cn(
                        'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-bold',
                        row.isPositive
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-rose-500/10 text-rose-400',
                      )}
                    >
                      {row.isPositive ? (
                        <TrendingUp className="size-3" />
                      ) : (
                        <TrendingDown className="size-3" />
                      )}
                      {row.diffPct}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={cn(
                        'rounded-md px-2 py-0.5 text-[10px] font-medium',
                        row.isPositive
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-300 border border-rose-500/20',
                      )}
                    >
                      {row.isPositive ? 'Favourable Growth' : 'Requires Attention'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
