import { useState, useMemo, type ReactNode } from 'react'
import { ChevronDown, ChevronUp, ChevronsUpDown, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Column<T> {
  key: string
  header: string
  label?: string
  sortable?: boolean
  align?: 'left' | 'right' | 'center'
  className?: string
  render: (row: T) => ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  caption?: string
  searchable?: boolean
  searchPlaceholder?: string
  searchFn?: (row: T, query: string) => boolean
  pageSize?: number
  onRowClick?: (row: T) => void
  className?: string
}

const ALIGN = { left: 'text-left', right: 'text-right', center: 'text-center' } as const

export function DataTable<T>({
  columns, rows, rowKey, caption, searchable, searchPlaceholder = 'Search…',
  searchFn, pageSize = 10, onRowClick, className,
}: DataTableProps<T>) {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    if (!query || !searchable) return rows
    if (searchFn) return rows.filter(r => searchFn(r, query.toLowerCase()))
    return rows
  }, [rows, query, searchable, searchFn])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortKey]
      const bv = (b as Record<string, unknown>)[sortKey]
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
    })
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.ceil(sorted.length / pageSize)
  const pageRows = sorted.slice(page * pageSize, (page + 1) * pageSize)

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
    setPage(0)
  }

  const SortIcon = ({ k }: { k: string }) =>
    sortKey === k
      ? sortDir === 'asc' ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />
      : <ChevronsUpDown className="size-3 opacity-30" />

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {searchable && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-faint" aria-hidden />
          <input
            type="search"
            placeholder={searchPlaceholder}
            value={query}
            onChange={e => { setQuery(e.target.value); setPage(0) }}
            className="h-9 w-full rounded-[10px] border border-border bg-raised/60 pl-8 pr-3 text-sm text-foreground placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent-2/50"
          />
        </div>
      )}
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="sticky top-0 bg-card">
            <tr className="border-b border-border">
              {columns.map(col => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn('px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-faint', ALIGN[col.align ?? 'left'], col.className)}
                >
                  {col.sortable ? (
                    <button type="button" onClick={() => handleSort(col.key)} className="inline-flex items-center gap-1 hover:text-foreground">
                      {col.header}
                      <SortIcon k={col.key} />
                    </button>
                  ) : col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'border-b border-border/50 transition-colors last:border-0',
                  i % 2 === 1 && 'bg-raised/20',
                  onRowClick ? 'cursor-pointer hover:bg-raised/60' : 'hover:bg-raised/40',
                )}
              >
                {columns.map(col => (
                  <td key={col.key} className={cn('px-3 py-2.5', ALIGN[col.align ?? 'left'], col.className)}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-sm text-faint">
                  No results found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{sorted.length} rows · page {page + 1} of {totalPages}</span>
          <div className="flex gap-1">
            <button type="button" disabled={page === 0} onClick={() => setPage(p => p - 1)}
              className="flex size-7 items-center justify-center rounded-lg border border-border hover:bg-raised disabled:opacity-30">
              <ChevronLeft className="size-3.5" />
            </button>
            <button type="button" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
              className="flex size-7 items-center justify-center rounded-lg border border-border hover:bg-raised disabled:opacity-30">
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
