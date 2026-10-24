import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useFiltersStore } from '@/stores/filters'
import { useDatasetStore } from '@/stores/dataset'
import { DEMO_DATASET } from '@/lib/mock-data'

export function useDataset() {
  const datasetId = useFiltersStore((s) => s.datasetId)
  const datasetStatus = useDatasetStore((s) => s.status)

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
        // Only fall back to demo data when no upload has been attempted yet.
        // If an upload is in progress or has completed, propagate the error
        // rather than silently masking it with stale mock data.
        const status = useDatasetStore.getState().status
        if (status !== 'idle') throw new Error('Backend not ready — please wait for processing to complete.')
      }
      return DEMO_DATASET
    },
    // Never treat data as fresh — always re-validate when the queryKey changes
    // or when the component remounts after a new upload.
    staleTime: 0,
    refetchOnMount: 'always',
    // Retry briefly on failure, but don't hammer the backend during processing.
    retry: 2,
    retryDelay: 1500,
    // Only run the query when we are not actively uploading/processing.
    enabled: datasetStatus !== 'uploading' && datasetStatus !== 'processing',
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
    staleTime: 0,
  })
}
