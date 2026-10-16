/**
 * Global dataset state store.
 *
 * Tracks the full upload-to-ready lifecycle:
 *   idle → uploading → processing → ready | failed
 *
 * All pages read `useDatasetStore` to decide what to show.
 * The ValidationPanel writes to it.
 */
import { create } from 'zustand'
import type { UploadResponse } from '@/lib/api'

export type DatasetStatus = 'idle' | 'uploading' | 'processing' | 'ready' | 'failed'

interface DatasetState {
  status: DatasetStatus
  datasetName: string | null
  isRawInput: boolean | null
  cleaningSummary: UploadResponse['cleaningSummary'] | null
  error: string | null
  uploadProgress: number  // 0-100 during upload

  // Actions
  setUploading: (filename: string) => void
  setUploadProgress: (pct: number) => void
  setProcessing: (result: UploadResponse) => void
  setReady: () => void
  setFailed: (error: string) => void
  reset: () => void
}

export const useDatasetStore = create<DatasetState>((set) => ({
  status: 'idle',
  datasetName: null,
  isRawInput: null,
  cleaningSummary: null,
  error: null,
  uploadProgress: 0,

  setUploading: (filename) =>
    set({ status: 'uploading', datasetName: filename, error: null, uploadProgress: 0 }),

  setUploadProgress: (pct) => set({ uploadProgress: pct }),

  setProcessing: (result) =>
    set({
      status: 'processing',
      datasetName: result.datasetName,
      isRawInput: result.fileType === 'raw',
      cleaningSummary: result.cleaningSummary,
      uploadProgress: 100,
      error: null,
    }),

  setReady: () => set({ status: 'ready' }),

  setFailed: (error) => set({ status: 'failed', error }),

  reset: () =>
    set({
      status: 'idle',
      datasetName: null,
      isRawInput: null,
      cleaningSummary: null,
      error: null,
      uploadProgress: 0,
    }),
}))

/** Returns true only when backend confirms dataset is ready. */
export function isDataReady(status: DatasetStatus) {
  return status === 'ready'
}
