import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowRight, Check, FileCheck, Loader2, AlertTriangle, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { api } from '@/lib/api'
import { useDatasetStore } from '@/stores/dataset'
import { useFiltersStore } from '@/stores/filters'
import { CLEANED_COLUMNS, RAW_COLUMNS } from '@/lib/mock-data'
import type { UploadMode } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'

const POLL_INTERVAL_MS = 1500
const MAX_POLL_ATTEMPTS = 80  // 2 minutes

interface ValidationPanelProps {
  file: File
  mode: UploadMode
}

function formatSize(bytes: number) {
  return bytes > 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

// Simulated step labels based on mode (shown during processing)
const ANALYSIS_LABELS = ['Cleaning', 'Customer Journey', 'RFM Segments', 'Cohort Retention', 'Returns', 'Products', 'Anomaly Detection', 'Risk Scoring', 'KPIs']

export function ValidationPanel({ file, mode }: ValidationPanelProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const store = useDatasetStore()
  const filtersStore = useFiltersStore()
  const columns = mode === 'cleaned' ? CLEANED_COLUMNS : RAW_COLUMNS

  const [phase, setPhase] = useState<'idle' | 'uploading' | 'processing' | 'done' | 'failed'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [cleaningSummary, setCleaningSummary] = useState<Record<string, unknown> | null>(null)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollAttempts = useRef(0)
  const startTime = useRef(0)

  const clearTimers = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (elapsedRef.current) clearInterval(elapsedRef.current)
    pollRef.current = null
    elapsedRef.current = null
  }

  useEffect(() => () => clearTimers(), [])

  // When a new file is selected (panel mounts fresh), reset stores and clear
  // all cached query data so stale results from the previous upload are gone.
  useEffect(() => {
    if (store.status === 'ready' || store.status === 'failed') {
      store.reset()
    }
    // Reset the dataset query key back to the neutral default so any cached
    // response is invalidated. The key will be updated to the new filename
    // once processing succeeds (see startPolling below).
    filtersStore.setDataset('uci-demo')
    queryClient.clear()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startPolling = () => {
    pollAttempts.current = 0
    pollRef.current = setInterval(async () => {
      pollAttempts.current++
      if (pollAttempts.current > MAX_POLL_ATTEMPTS) {
        clearTimers()
        setPhase('failed')
        setError('Processing timed out. The file may be too large or the backend is unresponsive.')
        store.setFailed('Processing timed out.')
        return
      }

      // Advance simulated step
      setCurrentStep(prev => Math.min(prev + 1, ANALYSIS_LABELS.length - 1))

      try {
        const status = await api.getStatus()
        if (status.status === 'ready') {
          clearTimers()
          setPhase('done')
          store.setReady()
          // Update the dataset query key to the uploaded filename so that
          // React Query fetches fresh data for the new dataset, not a cached
          // response for the previous one.
          filtersStore.setDataset(file.name)
          // Use refetchQueries (not invalidateQueries) so the refetch happens
          // immediately rather than lazily on the next component focus/mount.
          await queryClient.refetchQueries()
          toast.success('Dataset ready! Dashboard populated.')
        } else if (status.status === 'failed') {
          clearTimers()
          setPhase('failed')
          setError(status.error ?? 'Backend processing failed.')
          store.setFailed(status.error ?? 'Processing failed.')
        }
      } catch {
        // transient network error — keep polling
      }
    }, POLL_INTERVAL_MS)
  }

  const handleStart = async () => {
    if (phase === 'uploading' || phase === 'processing') return

    setPhase('uploading')
    setError(null)
    setCurrentStep(0)
    startTime.current = Date.now()
    store.setUploading(file.name)

    // Elapsed timer
    elapsedRef.current = setInterval(() => {
      setElapsed((Date.now() - startTime.current) / 1000)
    }, 200)

    try {
      const result = await api.uploadFile(file)

      console.log('Selected file:', file)
      console.log('Is actual File:', file instanceof File)
      console.log('File name:', file?.name)
      console.log('File type:', file?.constructor?.name)

      setCleaningSummary(result.cleaningSummary as unknown as Record<string, unknown>)
      store.setProcessing(result)
      setPhase('processing')
      startPolling()
    } catch (err: unknown) {
      clearTimers()
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setPhase('failed')
      setError(msg)
      store.setFailed(msg)
      toast.error(msg)
    }
  }

  const handleDownloadCleaned = () => {
    window.open(api.cleanedFileUrl(), '_blank')
  }

  const isRunning = phase === 'uploading' || phase === 'processing'
  const isDone = phase === 'done'

  // Step display
  const steps = ANALYSIS_LABELS.map((label, i) => ({
    label,
    status: phase === 'done'
      ? 'done'
      : i < currentStep
        ? 'done'
        : i === currentStep && phase === 'processing'
          ? 'running'
          : 'waiting',
  }))

  return (
    <Card className="animate-fadeIn p-6" aria-live="polite">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 border-b border-border/60 pb-5 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-accent/20 text-accent">
            <FileCheck className="size-5" aria-hidden />
          </div>
          <div>
            <h4 className="text-base font-semibold text-foreground">{file.name}</h4>
            <div className="num-tabular mt-0.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>{formatSize(file.size)}</span>
              {cleaningSummary && (
                <>
                  <span aria-hidden>•</span>
                  <span>{Number(cleaningSummary.originalRows ?? 0).toLocaleString()} rows detected</span>
                  <span aria-hidden>•</span>
                  <span>{Number(cleaningSummary.finalRows ?? 0).toLocaleString()} after cleaning</span>
                </>
              )}
            </div>
          </div>
        </div>
        <Button
          variant="primary"
          onClick={handleStart}
          disabled={isRunning}
          className="bg-accent [background-image:none] hover:bg-accent-strong"
        >
          {phase === 'uploading' ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {phase === 'processing' ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {phase === 'idle' && 'Start analysis'}
          {phase === 'uploading' && 'Uploading…'}
          {phase === 'processing' && 'Processing…'}
          {phase === 'done' && 'Run again'}
          {phase === 'failed' && 'Retry'}
        </Button>
      </div>

      {/* Schema checklist */}
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

      {/* Error state */}
      {phase === 'failed' && error && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-negative/30 bg-negative/8 p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-negative" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-negative">Processing failed</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{error}</p>
          </div>
        </div>
      )}

      {/* Processing pipeline steps */}
      {(isRunning || isDone) && (
        <div className="mt-6 border-t border-border/60 pt-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {phase === 'uploading' ? 'Uploading file…' : isDone ? 'Processing complete' : 'Analysis pipeline'}
              </span>
              <span className="num-tabular text-xs text-faint">Elapsed: {elapsed.toFixed(1)}s</span>
            </div>
            <span className="font-mono text-xs text-accent">
              {isDone ? '100%' : `${Math.round((currentStep / ANALYSIS_LABELS.length) * 100)}%`}
            </span>
          </div>

          <div
            className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-raised"
            role="progressbar"
            aria-valuenow={isDone ? 100 : Math.round((currentStep / ANALYSIS_LABELS.length) * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full bg-accent transition-all duration-500"
              style={{ width: isDone ? '100%' : `${(currentStep / ANALYSIS_LABELS.length) * 100}%` }}
            />
          </div>

          {phase !== 'uploading' && (
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
          )}

          {/* Completion actions */}
          {isDone && (
            <div className="mt-6 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-4 sm:flex-row">
              {mode === 'raw' && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>Cleaning complete! Download cleaned file:</span>
                  <button
                    type="button"
                    onClick={handleDownloadCleaned}
                    className="flex items-center gap-1 rounded border border-border bg-raised px-2 py-1 font-mono text-[11px] text-foreground hover:bg-border"
                  >
                    <Download className="size-3" aria-hidden />
                    XLSX
                  </button>
                </div>
              )}
              <Button
                variant="primary"
                className="ml-auto"
                onClick={() => navigate('/overview')}
              >
                Open dashboard
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
