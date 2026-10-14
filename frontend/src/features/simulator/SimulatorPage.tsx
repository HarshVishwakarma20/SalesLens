import { useState } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { InsightBanner } from '@/components/ui/insight-banner'
import { formatGBP } from '@/lib/formatters'
import type { SegmentName } from '@/lib/types'

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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Controls */}
        <div className="sl-card flex flex-col gap-5 p-4 lg:col-span-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-faint">Target Segment</label>
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
            { label: 'Campaign reach', value: reachPct, set: setReachPct, unit: '%', min: 5, max: 100, step: 5 },
            { label: 'Conversion rate', value: convPct, set: setConvPct, unit: '%', min: 1, max: 50, step: 1 },
            { label: 'Order multiplier', value: orderMultiplier, set: setOrderMultiplier, unit: '×', min: 1.1, max: 5, step: 0.1 },
          ].map(ctrl => (
            <div key={ctrl.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">{ctrl.label}</span>
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
          <div className="sl-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Step-by-step Calculation</h2>
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
