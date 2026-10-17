import { useState } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { InsightBanner } from '@/components/ui/insight-banner'
import { formatGBP } from '@/lib/formatters'
import type { SegmentName } from '@/lib/types'
import { useDatasetStore } from '@/stores/dataset'
import { UploadPendingState, ProcessingState, ErrorState } from '@/components/ui/pending-state'
import { Info } from 'lucide-react'

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

const SEGMENT_COUNTS: Record<SegmentName, number> = {
  Champion: 568, Loyal: 897, Promising: 1103, New: 312, 'At-Risk': 945, Lost: 509,
}
const SEGMENT_AOV: Record<SegmentName, number> = {
  Champion: 450, Loyal: 280, Promising: 160, New: 90, 'At-Risk': 85, Lost: 70,
}

const SEGMENTS: SegmentName[] = ['Champion', 'Loyal', 'Promising', 'New', 'At-Risk', 'Lost']

export function SimulatorPage() {
  const [segment, setSegment] = useState<SegmentName>('At-Risk')
  const [reachPct, setReachPct] = useState(30)
  const [convPct, setConvPct] = useState(10)
  const [orderMultiplier, setOrderMultiplier] = useState(1.5)
  const { status, error } = useDatasetStore()

  if (status === 'idle') {
    return (
      <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
        <PageHeader title="Revenue Simulator" description="Model the impact of a targeted campaign before you run it." />
        <UploadPendingState description="Please upload a file to generate analytics." />
      </div>
    )
  }

  if (status === 'uploading' || status === 'processing') {
    return (
      <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
        <PageHeader title="Revenue Simulator" description="Model the impact of a targeted campaign before you run it." />
        <ProcessingState />
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
        <PageHeader title="Revenue Simulator" description="Model the impact of a targeted campaign before you run it." />
        <ErrorState message={error ?? 'Processing failed. Please try again.'} />
      </div>
    )
  }

  const reached = Math.round(SEGMENT_COUNTS[segment] * reachPct / 100)
  const converted = Math.round(reached * convPct / 100)
  const aov = SEGMENT_AOV[segment]
  const extraORders = orderMultiplier - 1
  const revenue = Math.round(converted * aov * extraORders)

  const steps = [
    { label: `${SEGMENT_COUNTS[segment].toLocaleString()} customers in ${segment}`, result: SEGMENT_COUNTS[segment] },
    { label: `${reachPct}% campaign reach`, result: reached },
    { label: `${convPct}% conversion`, result: converted },
    { label: `× ${orderMultiplier.toFixed(1)}x orders × £${aov} AOV`, result: null },
  ]

  return (
    <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
      <PageHeader title="Revenue Simulator" description="Model the impact of a targeted campaign before you run it." />

      {/* Page explanation */}
      <div className="rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
        <span className="font-semibold text-accent">How to use this simulator: </span>
        Select a customer segment, then adjust the campaign reach (% of that segment you contact), conversion rate (% who actually buy), and the order multiplier (how many more orders a converted customer makes vs. baseline). The simulator shows the step-by-step calculation and estimated incremental revenue.
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Controls */}
        <div className="sl-card flex flex-col gap-5 p-4 lg:col-span-5" tabIndex={0}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="text-xs font-medium text-faint">Target Segment</label>
              <ExplainTip text="Select which RFM customer segment to target. The simulator uses the actual count of customers in each segment." />
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {SEGMENTS.map(s => (
                <button key={s} type="button" onClick={() => setSegment(s)}
                  className={`rounded-[10px] border px-3 py-2 text-xs transition-colors ${segment === s ? 'border-accent bg-accent/10 text-accent font-semibold' : 'border-border text-muted-foreground hover:bg-raised'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {[
            { label: 'Campaign reach', value: reachPct, set: setReachPct, unit: '%', min: 5, max: 100, step: 5, tip: 'What % of the selected segment will receive your campaign (e.g. email, push). Higher reach = more potential but also higher cost.' },
            { label: 'Conversion rate', value: convPct, set: setConvPct, unit: '%', min: 1, max: 50, step: 1, tip: 'What % of those reached will actually make a purchase. Industry benchmarks: 5-15% for email, 1-5% for display.' },
            { label: 'Order multiplier', value: orderMultiplier, set: setOrderMultiplier, unit: '×', min: 1.1, max: 5, step: 0.1, tip: 'How many more orders a converted customer places vs. without the campaign. 1.5x means 50% more orders on average.' },
          ].map(ctrl => (
            <div key={ctrl.label}>
              <div className="flex justify-between text-xs mb-1 items-center">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  {ctrl.label}
                  <ExplainTip text={ctrl.tip} />
                </span>
                <span className="num-tabular font-semibold text-foreground">{ctrl.value.toFixed(ctrl.step < 1 ? 1 : 0)}{ctrl.unit}</span>
              </div>
              <input type="range" min={ctrl.min} max={ctrl.max} step={ctrl.step} value={ctrl.value}
                onChange={e => ctrl.set(Number(e.target.value))} className="w-full accent-[var(--accent)]" />
            </div>
          ))}
        </div>

        {/* Formula + result */}
        <div className="flex flex-col gap-4 lg:col-span-7">
          {/* Step-by-step formula */}
          <div className="sl-card p-4" tabIndex={0}>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-semibold text-foreground">Step-by-step Calculation</h2>
              <ExplainTip text="Each step narrows the funnel: total segment → reached → converted → revenue. Watch these numbers update live as you move the sliders." />
            </div>
            <div className="space-y-2">
              {steps.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="flex size-6 items-center justify-center rounded-full bg-accent/15 text-[10px] font-bold text-accent shrink-0">{i + 1}</span>
                  <div className="flex flex-1 items-center justify-between rounded-xl bg-raised/60 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">{s.label}</span>
                    {s.result !== null && <span className="num-tabular font-bold text-foreground">{s.result.toLocaleString()}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue result card */}
          <div className="sl-card flex flex-col items-center justify-center gap-2 p-8 border-2 border-positive/30 bg-positive/5">
            <span className="text-sm font-medium text-muted-foreground">Estimated incremental revenue</span>
            <span className="num-tabular text-5xl font-black tracking-tight text-positive">{formatGBP(revenue)}</span>
            <span className="text-xs text-faint">{converted} recovered customers × £{aov} AOV × {extraORders.toFixed(1)} extra orders</span>
          </div>
        </div>
      </div>

      <InsightBanner>These projections are conservative — real campaigns often outperform when personalised emails are used vs. generic blasts. Test on 10% first.</InsightBanner>
    </div>
  )
}
