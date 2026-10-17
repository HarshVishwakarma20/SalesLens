import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useFiltersStore } from '@/stores/filters'
import { useDatasetStore } from '@/stores/dataset'
import { DEMO_DATASET } from '@/lib/mock-data'

export function useDataset() {
  const datasetId = useFiltersStore((s) => s.datasetId)
  return useQuery({
    queryKey: ['dataset', datasetId],
    queryFn: async () => {
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
        // Fallback to demo dataset on connection error or 404
      }
      return DEMO_DATASET
    },
    staleTime: 30000,
  })
}

export function useRecentDatasets() {
  return useQuery({
    queryKey: ['datasets'],
    queryFn: async () => {
      try {
        const list = await api.listDatasets()
        if (list && list.length > 0) {
          return list
        }
      } catch {
        // Fallback
      }
      return [
        { id: 'uci-demo', name: 'UCI Online Retail - Demo (Standard)', uploaded: 'Today, 09:41 AM', rows: 399659, status: 'Processed' as const, primary: true },
      ]
    },
    staleTime: 30000,
  })
}
