import { useLocation } from 'react-router-dom'
import { Calendar, ChevronDown, CircleHelp, Database, Download, Filter, Moon, Search, Sun } from 'lucide-react'
import { toast } from 'sonner'
import { findNav } from '@/app/nav'
import { useUiStore } from '@/stores/ui'
import { useDataset } from '@/hooks/useDataset'
import { useFilters } from '@/hooks/useFilters'
import { ALL_SEGMENTS } from '@/stores/filters'
import { SEGMENT_COLOURS } from '@/lib/colours'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { generatePdfReport } from '@/lib/pdf-report'
import type { Dataset } from '@/lib/types'
import { cn } from '@/lib/utils'

const pill =
  'flex h-9 items-center gap-2 rounded-[10px] border border-border bg-raised/60 px-3 text-xs text-foreground transition-colors hover:border-accent/50'

function SegmentFilter() {
  const { segments, toggleSegment, selectAllSegments, isSelected, total } = useFilters()
  return (
    <Popover>
      <PopoverTrigger className={pill}>
        <Filter className="size-3.5 text-muted-foreground" aria-hidden />
        <span className="text-center leading-tight">
          Segments
          <br className="xl:hidden" /> ({segments.length}/{total})
        </span>
        <ChevronDown className="size-3.5 text-faint" aria-hidden />
      </PopoverTrigger>
      <PopoverContent className="w-56">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">Segments</span>
          <button type="button" onClick={selectAllSegments} className="text-[11px] text-accent hover:underline">
            Select all
          </button>
        </div>
        <ul className="flex flex-col gap-0.5">
          {ALL_SEGMENTS.map((seg) => (
            <li key={seg}>
              <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-raised">
                <input
                  type="checkbox"
                  checked={isSelected(seg)}
                  onChange={() => toggleSegment(seg)}
                  className="size-3.5 accent-[var(--accent)]"
                />
                <span className="size-2 rounded-full" style={{ backgroundColor: SEGMENT_COLOURS[seg] }} aria-hidden />
                {seg}
              </label>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

function ExportMenu({ dataset }: { dataset?: Dataset }) {
  const handleExport = (fmt: string) => {
    if (fmt === 'PDF report') {
      const toastId = toast.loading('Generating Executive PDF Report...')
      setTimeout(() => {
        try {
          generatePdfReport(dataset)
          toast.success('Executive PDF report downloaded to your files!', { id: toastId })
        } catch (err: any) {
          console.error('PDF export failed:', err)
          toast.error(`PDF generation failed: ${err?.message || 'Unknown error'}`, { id: toastId })
        }
      }, 60)
    } else if (fmt === 'CSV') {
      toast.info('Downloading Dataset CSV...')
      window.open('/api/v1/datasets/export/customer_journey.csv', '_blank')
    } else if (fmt === 'XLSX') {
      toast.info('Downloading Cleaned Excel File...')
      window.open('/api/v1/datasets/cleaned-file', '_blank')
    }
  }

  return (
    <Popover>
      <PopoverTrigger className={cn(pill, 'px-2.5')} aria-label="Export">
        <Download className="size-4" aria-hidden />
        <ChevronDown className="size-3.5 text-faint" aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-1.5">
        {['CSV', 'XLSX', 'PDF report'].map((fmt) => (
          <button
            key={fmt}
            type="button"
            onClick={() => handleExport(fmt)}
            className="w-full rounded-lg px-2.5 py-1.5 text-left text-sm text-foreground hover:bg-raised"
          >
            Export {fmt}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}

export function Topbar() {
  const { pathname } = useLocation()
  const current = findNav(pathname)
  const { data: dataset } = useDataset()
  const theme = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)
  const setCommandOpen = useUiStore((s) => s.setCommandOpen)

  return (
    <header className="flex h-[60px] shrink-0 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur sm:px-5">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
        <span className="hidden text-muted-foreground sm:inline">SalesLens</span>
        <span className="hidden text-faint sm:inline">/</span>
        <span className="truncate font-semibold text-foreground">{current?.label ?? 'Data Source'}</span>
      </nav>

      <div className="hidden items-center gap-2 lg:flex">
        <span className={cn(pill, 'max-w-44 border-accent/30 bg-accent/10')}>
          <Database className="size-3.5 shrink-0 text-accent" aria-hidden />
          <span className="truncate font-medium">{dataset?.name ?? 'Loading...'}</span>
        </span>
        <button type="button" className={pill} onClick={() => toast('Date range picker', { description: 'Full dataset range selected.' })}>
          <Calendar className="size-3.5 text-muted-foreground" aria-hidden />
          <span className="num-tabular">
            {dataset ? `${dataset.dateRange.from} - ${dataset.dateRange.to}` : '...'}
          </span>
        </button>
        <SegmentFilter />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button type="button" onClick={() => setCommandOpen(true)} className={cn(pill, 'text-muted-foreground')}>
          <Search className="size-3.5" aria-hidden />
          <span className="hidden sm:inline">Search...</span>
          <kbd className="hidden rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] text-faint sm:inline">Ctrl K</kbd>
        </button>
        <ExportMenu dataset={dataset} />
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          className="flex size-9 items-center justify-center rounded-[10px] text-muted-foreground hover:bg-raised hover:text-foreground"
        >
          {theme === 'dark' ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
        </button>
        <button
          type="button"
          aria-label="Help"
          onClick={() => toast('Need help?', { description: 'Open Methodology for metric definitions.' })}
          className="hidden size-9 items-center justify-center rounded-[10px] text-muted-foreground hover:bg-raised hover:text-foreground sm:flex"
        >
          <CircleHelp className="size-4" aria-hidden />
        </button>
      </div>
    </header>
  )
}
