import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FileSpreadsheet, Trash2, Trash } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { DataTable, type Column } from '@/components/tables/DataTable'
import { useRecentDatasets } from '@/hooks/useDataset'
import { formatInt } from '@/lib/formatters'
import type { DatasetSummary } from '@/lib/types'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'

import { useFiltersStore } from '@/stores/filters'
import { useDatasetStore } from '@/stores/dataset'

export function RecentDatasets() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data, isLoading } = useRecentDatasets()
  const [isClearing, setIsClearing] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all stored datasets and cached storage files? This will reset the workspace to the baseline demo dataset.')) {
      return
    }
    setIsClearing(true)
    try {
      const res = await api.clearDatasets()
      useFiltersStore.getState().setDataset('demo')
      useDatasetStore.getState().reset()
      await queryClient.invalidateQueries({ queryKey: ['datasets'] })
      await queryClient.invalidateQueries({ queryKey: ['dataset'] })
      toast.success(res.message || 'Datasets and storage cleared successfully.')
    } catch (err: any) {
      toast.error(err.message || 'Failed to clear datasets.')
    } finally {
      setIsClearing(false)
    }
  }

  const handleDeleteOne = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}" from storage?`)) {
      return
    }
    setDeletingId(id)
    try {
      await api.deleteDataset(id)
      const currentActiveId = useFiltersStore.getState().datasetId
      if (currentActiveId === id) {
        useFiltersStore.getState().setDataset('demo')
        useDatasetStore.getState().reset()
      }
      await queryClient.invalidateQueries({ queryKey: ['datasets'] })
      await queryClient.invalidateQueries({ queryKey: ['dataset'] })
      toast.success(`Dataset "${name}" removed.`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete dataset.')
    } finally {
      setDeletingId(null)
    }
  }

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
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => {
              useFiltersStore.getState().setDataset(row.id)
              useDatasetStore.getState().setReady()
              useDatasetStore.setState({ datasetName: row.name })
              toast.success(`Active dataset set to: ${row.name}`)
              navigate('/overview')
            }}
            className="rounded bg-raised px-2.5 py-1 text-xs font-medium text-foreground hover:bg-border transition-colors"
            aria-label={`Open ${row.name}`}
          >
            Open
          </button>
          <button
            type="button"
            disabled={deletingId === row.id || isClearing}
            onClick={() => handleDeleteOne(row.id, row.name)}
            className="rounded p-1 text-muted-foreground hover:bg-negative/15 hover:text-negative transition-colors disabled:opacity-40"
            title="Delete dataset and clean storage"
            aria-label={`Delete ${row.name}`}
          >
            <Trash className="size-3.5" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <Card className="p-6">
      <CardHeader
        className="mb-4"
        title="Recent datasets"
        description="Inspect previously analyzed retail transaction datasets or purge storage cache"
        actions={
          <div className="flex items-center gap-3">
            <span className="num-tabular font-mono text-xs text-faint">{data?.length ?? 0} active stores</span>
            <button
              type="button"
              disabled={isClearing || !data || data.length === 0}
              onClick={handleClearAll}
              className="inline-flex items-center gap-1.5 rounded-md border border-negative/30 bg-negative/10 px-2.5 py-1 text-xs font-medium text-negative hover:bg-negative/20 transition-colors disabled:opacity-50"
              title="Delete all stored datasets and clear temporary files from storage"
            >
              <Trash2 className="size-3.5" />
              <span>{isClearing ? 'Clearing...' : 'Clear All Datasets'}</span>
            </button>
          </div>
        }
      />
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-10 rounded-lg" />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <DataTable columns={columns} rows={data} rowKey={(r) => r.id} caption="Recent datasets" />
      ) : (
        <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-border rounded-xl">
          <FileSpreadsheet className="size-8 text-muted-foreground/40 mb-2" />
          <p className="text-sm font-medium text-foreground">No datasets stored yet</p>
          <p className="text-xs text-muted-foreground mt-1">Upload a CSV or Excel transaction file above to begin analytics.</p>
        </div>
      )}
    </Card>
  )
}
