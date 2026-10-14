import { Command } from 'cmdk'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { ALL_NAV } from '@/app/nav'
import { useUiStore } from '@/stores/ui'

export function CommandPalette() {
  const open = useUiStore((s) => s.commandOpen)
  const setOpen = useUiStore((s) => s.setCommandOpen)
  const navigate = useNavigate()

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Search pages"
      overlayClassName="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
      contentClassName="fixed left-1/2 top-[15vh] z-50 w-[92vw] max-w-lg -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-fade-in"
    >
      <div className="flex items-center gap-2 border-b border-border px-4">
        <Search className="size-4 text-faint" aria-hidden />
        <Command.Input
          placeholder="Search pages, segments, customers..."
          className="h-12 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-faint"
        />
        <kbd className="rounded border border-border bg-raised px-1.5 py-0.5 font-mono text-[10px] text-faint">Esc</kbd>
      </div>
      <Command.List className="max-h-80 overflow-y-auto p-2">
        <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">No results found.</Command.Empty>
        <Command.Group heading="Pages" className="text-[11px] text-faint [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
          {ALL_NAV.map(({ path, label, icon: Icon, description }) => (
            <Command.Item
              key={path}
              value={`${label} ${description}`}
              onSelect={() => {
                navigate(path)
                setOpen(false)
              }}
              className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-foreground data-[selected=true]:bg-raised"
            >
              <Icon className="size-4 text-accent" aria-hidden />
              <span className="flex flex-col">
                <span>{label}</span>
                <span className="text-[11px] text-muted-foreground">{description}</span>
              </span>
            </Command.Item>
          ))}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  )
}
