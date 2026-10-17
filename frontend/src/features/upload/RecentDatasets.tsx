import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { FileSpreadsheet } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { DataTable, type Column } from '@/components/tables/DataTable'
import { useRecentDatasets } from '@/hooks/useDataset'
import { formatInt } from '@/lib/formatters'
import type { DatasetSummary } from '@/lib/types'
import { cn } from '@/lib/utils'

import { useFiltersStore } from '@/stores/filters'
import { useDatasetStore } from '@/stores/dataset'

export function RecentDatasets() {
  const navigate = useNavigate()
  const { data } = useRecentDatasets()

  const columns: Column<DatasetSummary>[] = [
    {
      key: 'name',
      header: 'Dataset Name',
      render: (row) => (
        <span className="flex items-center gap-2 text-xs font-medium text-foreground">
          <FileSpreadsheet className={cn('size-4 shrink-0', row.primary ? 'text-accent' : 'text-faint')} aria-hidden />
          {row.name}
        </span>
      ),
    },
    {
      key: 'uploaded',
      header: 'Uploaded',
      render: (row) => <span className="num-tabular font-mono text-xs text-muted-foreground">{row.uploaded}</span>,
    },
    {
      key: 'rows',
      header: 'Rows',
      align: 'right',
      render: (row) => <span className="num-tabular font-mono text-xs font-semibold text-foreground">{formatInt(row.rows)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (row) => (
        <Badge tone={row.status === 'Processed' ? 'positive' : 'neutral'} className="text-[11px]">
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      align: 'right',
      render: (row) => (
        <button
          type="button"
          onClick={() => {
            useFiltersStore.getState().setDataset(row.id)
            useDatasetStore.getState().setReady()
            useDatasetStore.setState({ datasetName: row.name })
            toast.success(`Active dataset set to: ${row.name}`)
            navigate('/overview')
          }}
          className="rounded bg-raised px-2.5 py-1 text-xs font-medium text-foreground hover:bg-border"
          aria-label={`Open ${row.name}`}
        >
          Open
        </button>
      ),
    },
  ]

  return (
    <Card className="p-6">
      <CardHeader
        className="mb-4"
        title="Recent datasets"
        description="Previously inspected retail transaction datasets"
        actions={<span className="num-tabular font-mono text-xs text-faint">{data?.length ?? 0} active stores</span>}
      />
      {data ? (
        <DataTable columns={columns} rows={data} rowKey={(r) => r.id} caption="Recent datasets" />
      ) : (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-10 rounded-lg" />
          ))}
        </div>
      )}
    </Card>
  )
}
