import { NavLink } from 'react-router-dom'
import { ChevronLeft, Lock } from 'lucide-react'
import { PRIMARY_NAV, SECONDARY_NAV, type NavItem } from '@/app/nav'
import { useUiStore } from '@/stores/ui'
import { useDataset } from '@/hooks/useDataset'
import { formatInt } from '@/lib/formatters'
import { cn } from '@/lib/utils'

function NavEntry({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const Icon = item.icon
  return (
    <li>
      <NavLink
        to={item.path}
        title={collapsed ? item.label : undefined}
        className={({ isActive }) =>
          cn(
            'relative flex h-10 items-center gap-3 rounded-[10px] px-3 text-sm transition-colors',
            collapsed && 'justify-center px-0',
            isActive
              ? 'bg-raised font-semibold text-foreground before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-accent'
              : 'text-muted-foreground hover:bg-raised/60 hover:text-foreground',
          )
        }
      >
        {({ isActive }) => (
          <>
            <Icon className={cn('size-4 shrink-0', isActive && 'text-accent')} aria-hidden />
            {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
            {!collapsed && item.locked && (
              <span className="flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                Locked <Lock className="size-2.5" aria-hidden />
              </span>
            )}
            {!collapsed && item.soon && !item.locked && (
              <span className="flex items-center gap-1 rounded-md border border-border bg-raised px-1.5 py-0.5 text-[10px] text-faint">
                Soon <Lock className="size-2.5" aria-hidden />
              </span>
            )}
          </>
        )}
      </NavLink>
    </li>
  )
}

export function Sidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)
  const { data: dataset } = useDataset()

  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200 md:flex',
        collapsed ? 'w-[72px]' : 'w-[248px]',
      )}
    >
      <div className={cn('flex h-[60px] items-center gap-2.5 border-b border-border px-4', collapsed && 'justify-center px-0')}>
        <div className="relative size-8 shrink-0">
          <img src="/acuity-logo.png" alt="Acuity" className="size-8 object-contain" style={{ filter: 'drop-shadow(0 0 6px rgba(0,245,212,0.5))' }} />
        </div>
        {!collapsed && (
          <span
            className="text-lg font-bold tracking-tight"
            style={{ background: 'linear-gradient(135deg, #00F5D4 0%, #0EA5E9 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
          >
            Acuity
          </span>
        )}
      </div>

      <nav aria-label="Main" className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-0.5">
          {PRIMARY_NAV.map((item) => (
            <NavEntry key={item.path} item={item} collapsed={collapsed} />
          ))}
        </ul>
        <div className="border-t border-border" />
        <ul className="flex flex-col gap-0.5">
          {SECONDARY_NAV.map((item) => (
            <NavEntry key={item.path} item={item} collapsed={collapsed} />
          ))}
        </ul>
      </nav>

      <div className="flex flex-col gap-2 border-t border-border p-3">
        {!collapsed && dataset ? (
          <div className="rounded-xl border border-border bg-raised/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-xs font-semibold text-foreground">{dataset.name}</span>
              <span className="size-2 shrink-0 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]" aria-label="Active" />
            </div>
            <p className="num-tabular mt-1 truncate text-[11px] text-muted-foreground">
              {formatInt(dataset.customers)} customers · {formatInt(dataset.rows)} rows
            </p>
          </div>
        ) : null}
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="mx-auto flex size-7 items-center justify-center rounded-md text-faint hover:bg-raised hover:text-foreground"
        >
          <ChevronLeft className={cn('size-4 transition-transform', collapsed && 'rotate-180')} aria-hidden />
        </button>
      </div>
    </aside>
  )
}
