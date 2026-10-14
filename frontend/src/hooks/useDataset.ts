import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useFiltersStore } from '@/stores/filters'

export function useDataset() {
  const datasetId = useFiltersStore((s) => s.datasetId)
  return useQuery({
    queryKey: ['dataset', datasetId],
    queryFn: () => api.getDataset(datasetId),
    staleTime: Infinity,
  })
}

export function useRecentDatasets() {
  return useQuery({
    queryKey: ['datasets'],
    queryFn: api.listDatasets,
    staleTime: Infinity,
  })
}
