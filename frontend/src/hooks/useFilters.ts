import { useShallow } from 'zustand/react/shallow'
import { ALL_SEGMENTS, useFiltersStore } from '@/stores/filters'

export function useFilters() {
  const state = useFiltersStore(
    useShallow((s) => ({
      segments: s.segments,
      toggleSegment: s.toggleSegment,
      selectAllSegments: s.selectAllSegments,
    })),
  )
  return {
    ...state,
    total: ALL_SEGMENTS.length,
    isSelected: (segment: (typeof ALL_SEGMENTS)[number]) => state.segments.includes(segment),
  }
}
