/**
 * Reusable empty/pending states for analytics pages.
 * Used when no dataset has been uploaded yet, or while processing.
 */
import { Link } from 'react-router-dom'
import { CloudUpload, Loader2, AlertTriangle } from 'lucide-react'

interface PendingProps {
  title?: string
  description?: string
}

export function UploadPendingState({ title = 'No dataset loaded', description = 'Upload your transaction data to view analytics.' }: PendingProps) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-border bg-raised/30 px-8 py-12 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
        <CloudUpload className="size-7" aria-hidden />
      </div>
      <div>
        <p className="text-base font-semibold text-foreground">{title}</p>
        <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">{description}</p>
      </div>
      <Link
        to="/data-source"
        className="inline-flex items-center gap-2 rounded-[10px] bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        <CloudUpload className="size-4" aria-hidden />
        Go to Data Source
      </Link>
    </div>
  )
}

export function ProcessingState({ message = 'Processing your dataset…' }: { message?: string }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-raised/30 px-8 py-12 text-center">
      <Loader2 className="size-8 animate-spin text-accent" aria-hidden />
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
      <p className="text-xs text-faint">This can take up to 30 seconds for large files.</p>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-2xl border border-negative/30 bg-negative/5 px-8 py-12 text-center">
      <AlertTriangle className="size-7 text-negative" aria-hidden />
      <div>
        <p className="text-sm font-semibold text-foreground">Processing failed</p>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">{message}</p>
      </div>
      <div className="flex gap-3">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-[10px] bg-accent px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90"
          >
            Retry
          </button>
        )}
        <Link
          to="/data-source"
          className="rounded-[10px] border border-border px-4 py-1.5 text-xs font-medium text-muted-foreground hover:bg-raised"
        >
          Upload new file
        </Link>
      </div>
    </div>
  )
}

/** KPI placeholder card shown before data is ready */
export function KpiPlaceholder({ label }: { label: string }) {
  return (
    <div className="sl-card p-5 flex flex-col gap-1.5">
      <p className="text-[11px] uppercase tracking-wider text-faint">{label}</p>
      <p className="text-2xl font-bold text-muted-foreground/40">--</p>
    </div>
  )
}
