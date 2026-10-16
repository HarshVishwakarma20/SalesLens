import { PageHeader } from '@/components/ui/page-header'
import { InsightBanner } from '@/components/ui/insight-banner'
import { DataTable } from '@/components/tables/DataTable'
import { FUNNEL_STEPS, PIPELINE_SUMMARY, QUALITY_CHECKS, JOB_HISTORY } from '@/lib/mock-data'
import { CheckCircle2, XCircle } from 'lucide-react'
import { useDatasetStore } from '@/stores/dataset'
import { UploadPendingState, ProcessingState, ErrorState } from '@/components/ui/pending-state'

function FunnelViz() {
  const max = FUNNEL_STEPS[0].rows

  return (
    <div className="space-y-2">
      {FUNNEL_STEPS.map((step, i) => {
        const pct = (step.rows / max) * 100
        return (
          <div key={i}>
            <div className="flex items-center justify-between text-xs mb-0.5">
              <span className="text-muted-foreground">{step.label}</span>
              <div className="flex items-center gap-3">
                {step.removed !== undefined && (
                  <span className="text-negative">−{step.removed.toLocaleString()}</span>
                )}
                <span className="num-tabular font-semibold text-foreground w-20 text-right">{step.rows.toLocaleString()}</span>
              </div>
            </div>
            <div className="h-6 rounded-md bg-raised overflow-hidden">
              <div
                className="h-full rounded-md transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: `hsl(${170 - i * 15}, 60%, ${45 - i * 3}%)`,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function PipelinePage() {
  const { status, error } = useDatasetStore()

  if (status === 'idle') {
    return (
      <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
        <PageHeader title="Data Pipeline" description="Where rows come from and what gets cleaned out" />
        <UploadPendingState description="Please upload a file to generate analytics." />
      </div>
    )
  }

  if (status === 'uploading' || status === 'processing') {
    return (
      <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
        <PageHeader title="Data Pipeline" description="Where rows come from and what gets cleaned out" />
        <ProcessingState message="Running data pipeline…" />
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
        <PageHeader title="Data Pipeline" description="Where rows come from and what gets cleaned out" />
        <ErrorState message={error ?? 'Processing failed. Please try again.'} />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
      <PageHeader title="Data Pipeline" description="Where rows come from and what gets cleaned out" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Funnel */}
        <div className="sl-card p-4 lg:col-span-7">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Cleaning Funnel</h2>
          <FunnelViz />
        </div>

        {/* Quality checks */}
        <div className="sl-card p-4 lg:col-span-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Data Quality Checks</h2>
          <div className="space-y-2">
            {QUALITY_CHECKS.map(qc => (
              <div key={qc.field} className="flex items-center justify-between rounded-xl bg-raised/50 px-3 py-2">
                <span className="text-sm text-muted-foreground">{qc.field}</span>
                <div className="flex items-center gap-2">
                  {qc.issues > 0 && <span className="num-tabular text-xs text-negative">{qc.issues} issues</span>}
                  {qc.status === 'pass'
                    ? <CheckCircle2 className="size-4 text-positive" />
                    : <XCircle className="size-4 text-negative" />
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pipeline Summary table */}
      <div className="sl-card p-4">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Pipeline Summary</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {PIPELINE_SUMMARY.map(item => (
            <div key={item.label} className="rounded-xl bg-raised/60 px-3 py-2.5">
              <p className="text-[10px] text-faint mb-0.5">{item.label}</p>
              <p className="num-tabular text-sm font-bold text-foreground">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Job history */}
      <div className="sl-card p-4">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Job History</h2>
        <DataTable
          rows={JOB_HISTORY}
          rowKey={r => r.id}
          columns={[
            { key: 'id', header: 'Job ID', render: r => <span className="num-tabular font-mono text-xs">{r.id}</span> },
            { key: 'dataset', header: 'Dataset', render: r => r.dataset },
            { key: 'started', header: 'Started', render: r => r.started },
            { key: 'duration', header: 'Duration', align: 'right', render: r => <span className="num-tabular">{r.duration}</span> },
            {
              key: 'status', header: 'Status', render: r => {
                const map = { complete: { label: 'Complete', color: 'var(--positive)' }, processing: { label: 'Processing…', color: 'var(--warning)' }, failed: { label: 'Failed', color: 'var(--negative)' } }
                const t = map[r.status]
                return <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: `${t.color}18`, color: t.color }}>{t.label}</span>
              }
            },
          ]}
        />
      </div>

      <InsightBanner>102,996 rows had negative unit prices — all were return transactions correctly excluded from sales aggregates.</InsightBanner>
    </div>
  )
}
