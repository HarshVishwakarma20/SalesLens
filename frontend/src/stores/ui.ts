import { create } from 'zustand'

type Theme = 'dark' | 'light'

interface UiState {
  sidebarCollapsed: boolean
  theme: Theme
  commandOpen: boolean
  toggleSidebar: () => void
  toggleTheme: () => void
  setCommandOpen: (open: boolean) => void
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export const useUiStore = create<UiState>((set, get) => ({
  sidebarCollapsed: false,
  theme: 'dark',
  commandOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  toggleTheme: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    set({ theme: next })
  },
  setCommandOpen: (commandOpen) => set({ commandOpen }),
}))
