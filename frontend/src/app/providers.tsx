import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { CustomerDrawerProvider } from '@/components/ui/customer-drawer'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } }))

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
