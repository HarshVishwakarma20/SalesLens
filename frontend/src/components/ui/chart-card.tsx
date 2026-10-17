import { useState } from 'react'
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChartCardProps {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
  zoomable?: boolean
  actions?: React.ReactNode
}

export function ChartCard({
  title,
  description,
  children,
  className,
  zoomable = true,
  actions,
}: ChartCardProps) {
  const [zoom, setZoom] = useState(1)
  const [isExpanded, setIsExpanded] = useState(false)

  const handleZoomIn = () => setZoom((prev) => Math.min(Number((prev + 0.15).toFixed(2)), 2.0))
  const handleZoomOut = () => setZoom((prev) => Math.max(Number((prev - 0.15).toFixed(2)), 0.6))
  const handleResetZoom = () => setZoom(1)

  return (
    <div
      className={cn(
        'sl-card group flex flex-col gap-2 p-4 transition-all duration-300',
        isExpanded && 'fixed inset-4 z-50 overflow-hidden bg-background/95 p-6 shadow-2xl backdrop-blur-xl',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border/40 pb-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground tracking-tight">{title}</h2>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {actions}
          {zoomable && (
            <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-raised/40 p-0.5 text-xs text-muted-foreground">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 0.6}
                title="Zoom out (-)"
                className="rounded p-1 hover:bg-border/60 hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
                aria-label="Zoom out"
              >
                <ZoomOut className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                title="Reset zoom"
                className="px-1.5 py-0.5 font-mono text-[10px] hover:bg-border/60 hover:text-foreground transition-colors"
                aria-label="Reset zoom"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 2.0}
                title="Zoom in (+)"
                className="rounded p-1 hover:bg-border/60 hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
                aria-label="Zoom in"
              >
                <ZoomIn className="size-3.5" />
              </button>
              {zoom !== 1 && (
                <button
                  type="button"
                  onClick={handleResetZoom}
                  title="Reset"
                  className="rounded p-1 text-accent hover:bg-border/60 transition-colors"
                  aria-label="Reset"
                >
                  <RotateCcw className="size-3" />
                </button>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Minimize' : 'Maximize'}
            className="rounded-lg border border-border/60 bg-raised/40 p-1.5 text-muted-foreground hover:bg-border/60 hover:text-foreground transition-colors"
            aria-label={isExpanded ? 'Minimize chart' : 'Maximize chart'}
          >
            {isExpanded ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          </button>
        </div>
      </div>
      <div
        className="flex-1 w-full overflow-hidden transition-transform duration-200 origin-top-left"
        style={{
          transform: zoom !== 1 ? `scale(${zoom})` : undefined,
          width: zoom !== 1 ? `${(100 / zoom).toFixed(2)}%` : '100%',
          height: zoom !== 1 ? `${(100 / zoom).toFixed(2)}%` : '100%',
        }}
      >
        {children}
      </div>
    </div>
  )
}
