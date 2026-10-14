import { FlaskConical, Lock } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'

const COMING_CARDS = [
  {
    title: 'CLV Prediction',
    description: 'XGBoost model trained on RFM + gap trend to predict 12-month customer lifetime value.',
    tag: 'Regression',
  },
  {
    title: 'Churn Propensity Model',
    description: 'Gradient-boosted binary classifier — identify which customers will churn in the next 30 days.',
    tag: 'Classification',
  },
  {
    title: 'Market-Basket Analysis',
    description: 'Apriori algorithm revealing high-confidence product association rules (lift > 2).',
    tag: 'Association rules',
  },
]

export function MlLabPage() {
  return (
    <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
      {/* Coming next pill */}
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
          <FlaskConical className="size-3.5" />
          Coming next
        </span>
        <span className="text-xs text-muted-foreground">These features are in active development.</span>
      </div>

      <PageHeader title="ML Lab" description="Predictive modelling powered by your transaction history." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {COMING_CARDS.map(card => (
          <div key={card.title} className="sl-card relative flex flex-col gap-3 p-5 opacity-70 grayscale">
            {/* Lock overlay */}
            <div className="absolute inset-0 flex items-center justify-center rounded-[inherit] bg-background/30 backdrop-blur-[1px]">
              <div className="flex flex-col items-center gap-1">
                <Lock className="size-5 text-faint" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-faint">Coming soon</span>
              </div>
            </div>

            <div className="flex items-start justify-between">
              <h3 className="text-sm font-semibold text-foreground">{card.title}</h3>
              <span className="rounded-full bg-raised px-2 py-0.5 text-[10px] font-medium text-faint">{card.tag}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{card.description}</p>
            <div className="mt-auto">
              <div className="h-2 rounded-full bg-raised" />
            </div>
          </div>
        ))}
      </div>

      <div className="sl-card flex flex-col items-center gap-4 py-12 text-center">
        <FlaskConical className="size-10 text-faint" />
        <div>
          <p className="text-sm font-semibold text-foreground">ML Lab is coming in v2</p>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm">Once launched, run models directly on your uploaded dataset — no Python, no notebooks required.</p>
        </div>
      </div>
    </div>
  )
}
