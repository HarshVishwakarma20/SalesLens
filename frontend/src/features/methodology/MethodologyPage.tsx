import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'

interface MethodCard {
  id: string
  title: string
  subject: string
  formula: string
  example: string
  description: string
}

const CARDS: MethodCard[] = [
  {
    id: 'rfm',
    title: 'RFM Scoring',
    subject: 'Segmentation',
    formula: 'R = quintile(recency), F = quintile(frequency), M = quintile(monetary) → score = R×100 + F×10 + M',
    example: 'Customer A: 14 days ago, 12 orders, £480 → R=5, F=5, M=4 → Champion',
    description: 'Recency-Frequency-Monetary divides customers into quintiles on each axis. Champions are top-quintile on all three.',
  },
  {
    id: 'cohort',
    title: 'Cohort Retention',
    subject: 'Retention',
    formula: 'Retention_Mn = Active_Mn / Cohort_Size × 100',
    example: 'Dec-2010 cohort: 823 customers. Month-3: 298 still active → 36.2% retention',
    description: 'Groups customers by their first purchase month and tracks what fraction remains active each subsequent month.',
  },
  {
    id: 'returns',
    title: 'Return Rate',
    subject: 'Returns',
    formula: 'Return Rate = Σ(return qty × unit price) / Σ(gross sales value)',
    example: 'Product 22086: £980 returned / £4,200 sold = 23.3% — flagged (>5.12% avg)',
    description: 'Value-weighted return rate flags products or segments leaking revenue above the portfolio average.',
  },
  {
    id: 'risk',
    title: 'Churn Risk Score',
    subject: 'Risk',
    formula: 'Risk = w₁·RFM_decay + w₂·return_rate + w₃·gap_trend + w₄·anomaly (0–100)',
    example: 'w=[40,25,20,15]: customer with decay=0.8, ret=0.3 → score 61 → Critical',
    description: 'A composite 0–100 score weighting four sub-scores. Bands: Low <25, Medium 25–45, High 45–60, Critical ≥60.',
  },
  {
    id: 'gaptrend',
    title: 'Purchase Gap Trend',
    subject: 'Journey',
    formula: 'gap_i = date_i+1 − date_i; trend = slope(linear regression over gaps)',
    example: 'Gaps [14, 18, 24, 31] → positive slope → widening → At-Risk',
    description: 'A widening inter-purchase gap (positive slope) is an early churn signal even before the customer goes fully silent.',
  },
  {
    id: 'zscore',
    title: 'Anomaly Z-Score',
    subject: 'Anomalies',
    formula: 'z = (x − μ_window) / σ_window, where window = 30 days',
    example: 'day sales = £45,000; 30-day mean = £22,000; std = £5,800 → z = 3.97 → spike',
    description: 'Rolling z-score flags daily revenue deviations. |z| > 2 = flagged; direction determined by sign.',
  },
  {
    id: 'ltv',
    title: 'LTV Estimate',
    subject: 'Simulator',
    formula: 'LTV = AOV × purchase_rate × customer_lifespan',
    example: 'AOV=£240, 4 orders/year, 2.5 years → LTV = £2,400',
    description: 'Simplified LTV used in the Simulator to project campaign incremental revenue.',
  },
  {
    id: 'lorenz',
    title: 'Revenue Concentration (Lorenz Curve)',
    subject: 'Journey',
    formula: 'Plot cumulative % customers vs cumulative % revenue sorted by revenue desc',
    example: 'Top 20% of customers → 66% of revenue (Gini ≈ 0.71)',
    description: 'Shows how unequally revenue is distributed. A steeper early curve means heavier reliance on a small VIP segment.',
  },
]

const SUBJECT_COLOURS: Record<string, string> = {
  Segmentation: '#14B8A6', Retention: '#38BDF8', Returns: '#F87171', Risk: '#FB923C',
  Journey: '#A78BFA', Anomalies: '#FBBF24', Simulator: '#34D399',
}

const TOC = [...new Set(CARDS.map(c => c.subject))]

export function MethodologyPage() {
  const [open, setOpen] = useState<string | null>('rfm')
  const [activeSubject, setActiveSubject] = useState<string | null>(null)

  const visible = activeSubject ? CARDS.filter(c => c.subject === activeSubject) : CARDS

  return (
    <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6 lg:flex-row lg:items-start">
      {/* Sticky TOC */}
      <nav className="lg:sticky lg:top-16 lg:w-48 shrink-0">
        <div className="sl-card p-3">
          <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-faint">Topics</h2>
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setActiveSubject(null)}
              className={`w-full rounded-lg px-2 py-1.5 text-left text-xs transition-colors ${activeSubject === null ? 'bg-accent/10 text-accent font-semibold' : 'text-muted-foreground hover:bg-raised'}`}
            >
              All ({CARDS.length})
            </button>
            {TOC.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setActiveSubject(activeSubject === s ? null : s)}
                className={`w-full rounded-lg px-2 py-1.5 text-left text-xs transition-colors ${activeSubject === s ? 'bg-accent/10 text-accent font-semibold' : 'text-muted-foreground hover:bg-raised'}`}
              >
                <span className="inline-block size-1.5 rounded-full mr-1.5 translate-y-[-1px]" style={{ background: SUBJECT_COLOURS[s] }} />
                {s}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Accordion cards */}
      <div className="flex-1 space-y-3">
        <PageHeader title="Methodology" description="How every metric in SalesLens is calculated." />

        {visible.map(card => (
          <div key={card.id} className="sl-card overflow-hidden">
            <button
              type="button"
              onClick={() => setOpen(open === card.id ? null : card.id)}
              className="flex w-full items-center gap-3 p-4 text-left"
            >
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ background: `${SUBJECT_COLOURS[card.subject]}20`, color: SUBJECT_COLOURS[card.subject] }}
              >
                {card.subject}
              </span>
              <span className="flex-1 text-sm font-semibold text-foreground">{card.title}</span>
              <ChevronDown className={`size-4 text-faint transition-transform ${open === card.id ? 'rotate-180' : ''}`} />
            </button>
            {open === card.id && (
              <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
                <p className="text-sm text-muted-foreground leading-relaxed">{card.description}</p>
                <div className="rounded-xl bg-raised/60 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-faint mb-1">Formula</p>
                  <p className="font-mono text-xs text-accent">{card.formula}</p>
                </div>
                <div className="rounded-xl bg-raised/40 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-faint mb-1">Example</p>
                  <p className="text-xs text-muted-foreground">{card.example}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
