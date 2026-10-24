import { useState, useEffect, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { CustomerDrawerProvider } from '@/components/ui/customer-drawer'
import { api } from '@/lib/api'
import { useDatasetStore } from '@/stores/dataset'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } }))

  useEffect(() => {
    // Sync with backend status on initial mount
    api.getStatus().then((res) => {
      if (res.status === 'ready') {
        useDatasetStore.getState().setReady()
        useDatasetStore.setState({
          datasetName: res.datasetName ?? useDatasetStore.getState().datasetName,
          isRawInput: res.isRawInput ?? useDatasetStore.getState().isRawInput,
          cleaningSummary: res.cleaningSummary ?? useDatasetStore.getState().cleaningSummary,
        })
      }
    }).catch(() => {})
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <CustomerDrawerProvider>
        {children}
      </CustomerDrawerProvider>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: { background: 'var(--raised)', border: '1px solid var(--border)', color: 'var(--foreground)', fontSize: 12 },
        }}
      />
    </QueryClientProvider>
  )
}

