import { useState, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { PageHeader } from '@/components/ui/page-header'
import { InsightBanner } from '@/components/ui/insight-banner'
import { SegmentChip } from '@/components/ui/segment-chip'
import { DataTable } from '@/components/tables/DataTable'
import { SEGMENT_COLOURS, RISK_COLOURS } from '@/lib/colours'
import { formatGBP } from '@/lib/formatters'
import { useCustomerDrawer } from '@/components/ui/customer-drawer'
import type { RiskBand, RiskScore, SegmentName } from '@/lib/types'
import { useDatasetStore } from '@/stores/dataset'
import { UploadPendingState, ProcessingState, ErrorState } from '@/components/ui/pending-state'
import { useRiskData } from '@/hooks/useBackendData'

const PRESETS: { name: string; w: [number, number, number, number] }[] = [
  { name: 'Default', w: [40, 25, 20, 15] },
  { name: 'Recency-heavy', w: [55, 20, 15, 10] },
  { name: 'Returns-heavy', w: [25, 40, 20, 15] },
  { name: 'Trend-heavy', w: [30, 20, 35, 15] },
]

function bandFor(score: number): RiskBand {
  if (score >= 60) return 'Critical'
  if (score >= 45) return 'High'
  if (score >= 25) return 'Medium'
  return 'Low'
}

function RiskHistogram({ scores }: { scores: number[] }) {
  const bins = Array.from({ length: 20 }, (_, i) => ({ x: i * 5, count: 0 }))
  for (const s of scores) bins[Math.min(19, Math.floor(s / 5))].count++
  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: 12, textStyle: { color: 'var(--foreground)', fontSize: 12 }, formatter: (p: { name: string; value: number }[]) => `Score ${p[0].name}–${Number(p[0].name) + 5}: ${p[0].value} customers` },
    xAxis: { data: bins.map(b => String(b.x)), axisLabel: { color: '#888', fontSize: 10 }, axisLine: { show: false } },
    yAxis: { axisLabel: { color: '#888', fontSize: 10 }, axisLine: { show: false }, splitLine: { lineStyle: { color: '#222' } } },
    series: [{
      type: 'bar',
      data: bins.map(b => ({
        value: b.count,
        itemStyle: {
          color: b.x >= 60 ? RISK_COLOURS.Critical : b.x >= 45 ? RISK_COLOURS.High : b.x >= 25 ? RISK_COLOURS.Medium : RISK_COLOURS.Low,
          borderRadius: [3, 3, 0, 0],
        },
      })),
    }],
    grid: { top: 20, bottom: 30, left: 45, right: 10 },
  }
  return <ReactECharts option={option} style={{ height: 200 }} notMerge />
}

function SegmentRiskBars({ rows }: { rows: RiskScore[] }) {
  const segs: SegmentName[] = ['Champion', 'Loyal', 'Promising', 'New', 'At-Risk', 'Lost']
  const avgBySegment = segs.map(s => {
    const subset = rows.filter(r => r.segment === s)
    if (!subset.length) return 0
    return subset.reduce((a, b) => a + b.score, 0) / subset.length
  })
  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: 12, textStyle: { color: 'var(--foreground)', fontSize: 12 } },
    xAxis: { data: segs, axisLabel: { color: '#888', fontSize: 11 }, axisLine: { show: false } },
    yAxis: { max: 100, axisLabel: { color: '#888', fontSize: 10 }, axisLine: { show: false }, splitLine: { lineStyle: { color: '#222' } } },
    series: [{
      type: 'bar',
      data: avgBySegment.map((v, i) => ({ value: +v.toFixed(1), itemStyle: { color: SEGMENT_COLOURS[segs[i]], borderRadius: [4, 4, 0, 0] } })),
      label: { show: true, position: 'top', color: 'var(--muted-foreground)', fontSize: 10, formatter: (p: { value: number }) => p.value.toFixed(1) },
    }],
    grid: { top: 30, bottom: 30, left: 50, right: 10 },
  }
  return <ReactECharts option={option} style={{ height: 220 }} notMerge />
}

function ComponentBar({ row }: { row: RiskScore }) {
  const components = [
    { label: 'RFM', val: row.rfmDecay, color: '#14B8A6' },
    { label: 'Ret', val: row.returnRate, color: '#F87171' },
    { label: 'Gap', val: row.gapTrend, color: '#FB923C' },
    { label: 'Anom', val: row.anomaly, color: '#A78BFA' },
  ]
  return (
    <div className="flex h-3 w-32 overflow-hidden rounded-full">
      {components.map(c => (
        <div key={c.label} style={{ width: `${c.val * 100}%`, background: c.color }} title={`${c.label}: ${(c.val * 100).toFixed(0)}%`} />
      ))}
    </div>
  )
}

export function RiskPage() {
  const [weights, setWeights] = useState([40, 25, 20, 15])
  const { openDrawer } = useCustomerDrawer()
  const { status, error } = useDatasetStore()
  const { data: riskScores, isLoading } = useRiskData()

  const reScored = useMemo<RiskScore[]>(() => {
    const [wR, wRet, wG, wA] = weights.map(w => w / 100)
    return riskScores.map(r => {
      const score = Math.min(100, Math.round((r.rfmDecay * wR + r.returnRate * wRet + r.gapTrend * wG + r.anomaly * wA) * 100))
      return { ...r, score, band: bandFor(score) }
    }).sort((a, b) => b.score - a.score)
  }, [weights, riskScores])

  const kpis = useMemo(() => {
    const critical = reScored.filter(r => r.band === 'Critical')
    const high = reScored.filter(r => r.band === 'High')
    const medium = reScored.filter(r => r.band === 'Medium')
    const atRiskRev = [...critical, ...high].reduce((s, r) => s + r.revenue, 0)
    return [
      { label: 'Critical', value: critical.length, color: RISK_COLOURS.Critical },
      { label: 'High', value: high.length, color: RISK_COLOURS.High },
      { label: 'Medium', value: medium.length, color: RISK_COLOURS.Medium },
      { label: 'Value at risk', value: formatGBP(atRiskRev), color: 'var(--negative)', isGBP: true },
    ]
  }, [reScored])

  if (status === 'idle') {
    return (
      <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
        <PageHeader title="Churn Risk" description="Who is about to leave, and how bad is it?" />
        <UploadPendingState description="Please upload a file to generate analytics." />
      </div>
    )
  }

  if (status === 'uploading' || status === 'processing') {
    return (
      <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
        <PageHeader title="Churn Risk" description="Who is about to leave, and how bad is it?" />
        <ProcessingState />
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
        <PageHeader title="Churn Risk" description="Who is about to leave, and how bad is it?" />
        <ErrorState message={error ?? 'Processing failed. Please try again.'} />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
        <PageHeader title="Churn Risk" description="Who is about to leave, and how bad is it?" />
        <ProcessingState />
      </div>
    )
  }

  const updateWeight = (idx: number, val: number) => {
    const newW = [...weights]
    newW[idx] = val
    // keep sum = 100 by clamping others
    const total = newW.reduce((s, w) => s + w, 0)
    if (total !== 100) {
      const diff = total - 100
      const othersSum = newW.reduce((s, w, i) => s + (i !== idx ? w : 0), 0)
      if (othersSum > 0) newW.forEach((_, i) => { if (i !== idx) newW[i] = Math.max(0, Math.round(newW[i] - diff * (newW[i] / othersSum))) })
    }
    setWeights(newW)
  }

  const labels = ['RFM Decay (R)', 'Return Rate', 'Gap Trend', 'Anomaly']
  const formula = `Score = ${weights[0]}%·RFM + ${weights[1]}%·Ret + ${weights[2]}%·Gap + ${weights[3]}%·Anom`

  return (
    <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
      <PageHeader title="Churn Risk" description="Who is about to leave, and how bad is it?" />

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {kpis.map(k => (
          <div key={k.label} className="sl-card p-4">
            <p className="text-[11px] uppercase tracking-wider text-faint">{k.label}</p>
            <p className="num-tabular mt-1 text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Weight Lab */}
      <div className="sl-card p-4">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <h2 className="text-sm font-semibold text-foreground">Weight Lab</h2>
          <div className="flex gap-2">
            {PRESETS.map(p => (
              <button key={p.name} type="button" onClick={() => setWeights([...p.w])}
                className="rounded-lg border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-raised hover:text-foreground">
                {p.name}
              </button>
            ))}
          </div>
        </div>
        <p className="mb-3 rounded-lg bg-raised/60 px-3 py-2 font-mono text-xs text-accent">{formula}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {labels.map((label, i) => (
            <div key={label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">{label}</span>
                <span className="num-tabular font-semibold text-foreground">{weights[i]}%</span>
              </div>
              <input type="range" min={5} max={70} step={5} value={weights[i]} onChange={e => updateWeight(i, Number(e.target.value))}
                className="w-full accent-[var(--accent)]" />
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-faint">Total: {weights.reduce((s, w) => s + w, 0)}% (auto-normalised on export)</p>
      </div>

      {/* Histogram + Segment bars */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="sl-card p-4">
          <h2 className="mb-1 text-sm font-semibold text-foreground">Risk Score Distribution</h2>
          <p className="mb-3 text-xs text-muted-foreground">Colour bands: <span style={{ color: RISK_COLOURS.Low }}>Low</span> / <span style={{ color: RISK_COLOURS.Medium }}>Medium</span> / <span style={{ color: RISK_COLOURS.High }}>High</span> / <span style={{ color: RISK_COLOURS.Critical }}>Critical</span></p>
          <RiskHistogram scores={reScored.map(r => r.score)} />
          <div className="mt-2 text-[11px] text-muted-foreground">
            <strong className="text-foreground">Explanation: </strong>Population count grouped by composite churn risk score (0–100), divided across Low, Medium, High, and Critical thresholds.
          </div>
        </div>
        <div className="sl-card p-4">
          <h2 className="mb-1 text-sm font-semibold text-foreground">Avg Risk by Segment</h2>
          <SegmentRiskBars rows={reScored} />
          <div className="mt-2 text-[11px] text-muted-foreground">
            <strong className="text-foreground">Explanation: </strong>Average composite churn risk score across each RFM segment, illustrating vulnerability by lifecycle tier.
          </div>
        </div>
      </div>

      {/* Top-50 table */}
      <div className="sl-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">Top 50 Highest Risk Customers</h2>
          <span className="text-xs text-faint">Click a row to open Customer 360 →</span>
        </div>
        <DataTable
          rows={reScored.slice(0, 50)}
          rowKey={r => r.id}
          onRowClick={r => openDrawer(r.id)}
          columns={[
            { key: 'id', header: 'Customer ID', render: r => <span className="num-tabular font-mono text-xs">{r.id}</span> },
            {
              key: 'score', header: 'Score', align: 'right', sortable: true, render: r => (
                <span className="num-tabular font-bold" style={{ color: RISK_COLOURS[r.band] }}>{r.score}</span>
              )
            },
            {
              key: 'band', header: 'Band', render: r => (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: `${RISK_COLOURS[r.band]}20`, color: RISK_COLOURS[r.band] }}>{r.band}</span>
              )
            },
            { key: 'segment', header: 'Segment', render: r => <SegmentChip segment={r.segment} /> },
            { key: 'revenue', header: 'Revenue', align: 'right', sortable: true, render: r => formatGBP(r.revenue) },
            { key: 'mainDriver', header: 'Main driver', render: r => <span className="text-xs text-muted-foreground">{r.mainDriver.replace('_', ' ')}</span> },
            { key: 'components', header: 'Components', render: r => <ComponentBar row={r} /> },
          ]}
        />
      </div>

      <InsightBanner>
        {reScored.filter(r => r.band === 'Critical').length} customers are Critical risk — a win-back campaign targeting them could recover an estimated {formatGBP(reScored.filter(r => r.band === 'Critical').reduce((s, r) => s + r.revenue, 0) * 0.12)} in annual revenue.
      </InsightBanner>
    </div>
  )
}
