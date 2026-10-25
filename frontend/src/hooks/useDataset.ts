import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useFiltersStore } from '@/stores/filters'
import { useDatasetStore } from '@/stores/dataset'
import type { Dataset, DatasetSummary } from '@/lib/types'

export function useDataset() {
  const datasetId = useFiltersStore((s) => s.datasetId)
  const datasetStatus = useDatasetStore((s) => s.status)

  return useQuery({
    queryKey: ['dataset', datasetId],
    queryFn: async (): Promise<Dataset | null> => {
      if (!datasetId || datasetStatus === 'idle') {
        return null
      }
      try {
        const res = await api.getDataset(datasetId)
        if (res && res.kpis && res.kpis.length > 0) {
          if (useDatasetStore.getState().status === 'idle') {
            useDatasetStore.getState().setReady()
            useDatasetStore.setState({ datasetName: res.name })
          }
          return res
        }
      } catch {
        const status = useDatasetStore.getState().status
        if (status !== 'idle') throw new Error('Backend not ready — please wait for processing to complete.')
      }
      return null
    },
    staleTime: 0,
    refetchOnMount: 'always',
    retry: 1,
    enabled: Boolean(datasetId) && datasetStatus === 'ready',
  })
}

export function useRecentDatasets() {
  return useQuery({
    queryKey: ['datasets'],
    queryFn: async (): Promise<DatasetSummary[]> => {
      try {
        const list = await api.listDatasets()
        if (list && Array.isArray(list)) {
          return list
        }
      } catch {
        // Return empty list on failure
      }
      return []
    },
    staleTime: 0,
  })
}
