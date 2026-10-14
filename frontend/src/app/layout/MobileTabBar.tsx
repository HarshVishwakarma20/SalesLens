import { NavLink } from 'react-router-dom'
import { Grid3x3, LayoutDashboard, MoreHorizontal, ShieldAlert, Users } from 'lucide-react'
import { useUiStore } from '@/stores/ui'
import { cn } from '@/lib/utils'

const TABS = [
  { path: '/overview', label: 'Overview', icon: LayoutDashboard },
  { path: '/segments', label: 'Segments', icon: Users },
  { path: '/cohorts', label: 'Cohorts', icon: Grid3x3 },
  { path: '/risk', label: 'Risk', icon: ShieldAlert },
]

export function MobileTabBar() {
  const setCommandOpen = useUiStore((s) => s.setCommandOpen)
  const tabClass = 'flex flex-col items-center gap-1 text-[10px]'

  return (
    <nav aria-label="Mobile" className="flex h-14 shrink-0 items-center justify-around border-t border-border bg-card px-2 md:hidden">
      {TABS.map(({ path, label, icon: Icon }) => (
        <NavLink
          key={path}
          to={path}
          className={({ isActive }) => cn(tabClass, isActive ? 'text-accent' : 'text-muted-foreground')}
        >
          <Icon className="size-4" aria-hidden />
          {label}
        </NavLink>
      ))}
      <button type="button" onClick={() => setCommandOpen(true)} className={cn(tabClass, 'text-muted-foreground')}>
        <MoreHorizontal className="size-4" aria-hidden />
        More
      </button>
    </nav>
  )
}
