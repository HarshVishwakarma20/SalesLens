import { create } from 'zustand'
import type { SegmentName } from '@/lib/types'

export const ALL_SEGMENTS: SegmentName[] = ['Champion', 'Loyal', 'Promising', 'New', 'At-Risk', 'Lost']

interface FiltersState {
  datasetId: string
  segments: SegmentName[]
  toggleSegment: (segment: SegmentName) => void
  selectAllSegments: () => void
  setDataset: (id: string) => void
}

export const useFiltersStore = create<FiltersState>((set) => ({
  datasetId: 'uci-demo',
  segments: ALL_SEGMENTS.filter((s) => s !== 'Lost'),
  toggleSegment: (segment) =>
    set((state) => ({
      segments: state.segments.includes(segment)
        ? state.segments.filter((s) => s !== segment)
        : [...state.segments, segment],
    })),
  selectAllSegments: () => set({ segments: [...ALL_SEGMENTS] }),
  setDataset: (datasetId) => set({ datasetId }),
}))
