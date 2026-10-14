import type { Dataset, DatasetSummary } from './types'
import { DEMO_DATASET, RECENT_DATASETS } from './mock-data'

/**
 * Typed API client. Point VITE_API_URL at the backend to fetch real data;
 * without it the client resolves with the bundled UCI demo dataset.
 */
const API_URL = import.meta.env.VITE_API_URL as string | undefined

async function request<T>(path: string, fallback: T): Promise<T> {
  if (!API_URL) {
    await new Promise((resolve) => setTimeout(resolve, 600))
    return fallback
  }
  const res = await fetch(`${API_URL}${path}`, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Request to ${path} failed with ${res.status}`)
  return (await res.json()) as T
}

export const api = {
  getDataset: (id: string) => request<Dataset>(`/datasets/${id}`, DEMO_DATASET),
  listDatasets: () => request<DatasetSummary[]>('/datasets', RECENT_DATASETS),
}
