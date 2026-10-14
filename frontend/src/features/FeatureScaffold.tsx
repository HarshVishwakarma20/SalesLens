import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Plug } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { findNav } from '@/app/nav'

interface FeatureScaffoldProps {
  children?: ReactNode
  endpoint: string
}

/** Shared page frame for feature routes; renders an API hint card below any provided content. */
export function FeatureScaffold({ children, endpoint }: FeatureScaffoldProps) {
  const { pathname } = useLocation()
  const nav = findNav(pathname)

  return (
    <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
      <PageHeader title={nav?.label ?? 'SalesLens'} description={nav?.description} />
      {children}
      <Card className="flex items-center gap-4 p-6">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
          <Plug className="size-5" aria-hidden />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Connect the analysis backend</h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Set <code className="font-mono text-accent">VITE_API_URL</code> and this view will load from{' '}
            <code className="font-mono text-accent">{endpoint}</code>.
          </p>
        </div>
      </Card>
    </div>
  )
}
