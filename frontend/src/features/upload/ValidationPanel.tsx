import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowRight, Check, FileCheck, Loader2, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useJob } from '@/hooks/useJob'
import { ANALYSIS_STEPS, CLEANED_COLUMNS, CLEANING_STEPS, RAW_COLUMNS } from '@/lib/mock-data'
import type { UploadMode } from '@/lib/types'
import { cn } from '@/lib/utils'

const RAW_STEPS = [...CLEANING_STEPS, ...ANALYSIS_STEPS]

interface ValidationPanelProps {
  file: { name: string; size: number }
  mode: UploadMode
}

function formatSize(bytes: number) {
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export function ValidationPanel({ file, mode }: ValidationPanelProps) {
  const navigate = useNavigate()
  const columns = mode === 'cleaned' ? CLEANED_COLUMNS : RAW_COLUMNS
  const { steps, state, elapsed, progress, start } = useJob(mode === 'cleaned' ? ANALYSIS_STEPS : RAW_STEPS)
  const downloadNotice = () => toast('Available when backend is connected')

  return (
    <Card className="animate-fadeIn p-6" aria-live="polite">
      <div className="flex flex-col items-start justify-between gap-4 border-b border-border/60 pb-5 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-accent/20 text-accent">
            <FileCheck className="size-5" aria-hidden />
          </div>
          <div>
            <h4 className="text-base font-semibold text-foreground">{file.name}</h4>
            <div className="num-tabular mt-0.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>{formatSize(file.size)}</span>
              <span aria-hidden>•</span>
              <span>399,659 rows detected</span>
              <span aria-hidden>•</span>
              <span>4,334 customers</span>
            </div>
          </div>
        </div>
        <Button
          variant="primary"
          onClick={start}
          disabled={state === 'running'}
          className="bg-accent [background-image:none] hover:bg-accent-strong"
        >
          {state === 'running' ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Play className="size-4" aria-hidden />}
          {state === 'running' ? 'Running...' : state === 'complete' ? 'Run again' : 'Start analysis'}
        </Button>
      </div>

      <div className="pt-5">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-faint">Schema validation checklist</div>
        <ul className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
          {columns.map((col) => (
            <li key={col} className="flex items-center gap-2 rounded-lg border border-border bg-raised/50 px-3 py-2">
              <Check className="size-3.5 text-positive" aria-hidden />
              <span className="font-mono text-foreground">{col}</span>
            </li>
          ))}
        </ul>
      </div>

      {state !== 'idle' ? (
        <div className="mt-6 border-t border-border/60 pt-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">Processing Pipeline</span>
              <span className="num-tabular text-xs text-faint">Elapsed: {elapsed.toFixed(1)}s</span>
            </div>
            <span className="font-mono text-xs text-accent">{progress}%</span>
          </div>
          <div
            className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-raised"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="h-full bg-accent transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <ol className="flex max-h-64 flex-col gap-2.5 overflow-y-auto pr-2">
            {steps.map((step, i) => (
              <li key={step.label} className="flex items-center gap-3 text-xs">
                <span
                  className={cn(
                    'flex size-5 shrink-0 items-center justify-center rounded-full border font-mono text-[10px]',
                    step.status === 'done' && 'border-positive/40 bg-positive/15 text-positive',
                    step.status === 'running' && 'border-accent bg-accent/15 text-accent',
                    step.status === 'waiting' && 'border-border text-faint',
                  )}
                >
                  {step.status === 'done' ? <Check className="size-3" aria-hidden /> : i + 1}
                </span>
                <span className={step.status === 'waiting' ? 'text-faint' : 'text-foreground'}>{step.label}</span>
                {step.status === 'running' ? <Loader2 className="ml-auto size-3.5 animate-spin text-accent" aria-hidden /> : null}
              </li>
            ))}
          </ol>

          {state === 'complete' ? (
            <div className="mt-6 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-4 sm:flex-row">
              {mode === 'raw' ? (
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>Cleaning complete! Download cleaned file:</span>
                  {['Parquet', 'CSV', 'XLSX'].map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={downloadNotice}
                      className="rounded border border-border bg-raised px-2 py-1 font-mono text-[11px] text-foreground hover:bg-border"
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              ) : null}
              <Button variant="primary" className="ml-auto" onClick={() => navigate('/overview')}>
                Open dashboard
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  )
}
