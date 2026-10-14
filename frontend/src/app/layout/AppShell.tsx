import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useUiStore } from '@/stores/ui'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { MobileTabBar } from './MobileTabBar'
import { CommandPalette } from './CommandPalette'

export function AppShell() {
  const { pathname } = useLocation()
  const setCommandOpen = useUiStore((s) => s.setCommandOpen)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCommandOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setCommandOpen])

  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main key={pathname} className="flex-1 overflow-y-auto p-4 sm:p-8">
          <Outlet />
        </main>
        <MobileTabBar />
      </div>
      <CommandPalette />
    </div>
  )
}
