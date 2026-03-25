import { create } from 'zustand'

const getInitialTheme = (): 'dark' | 'light' => {
    if (typeof window === 'undefined') return 'dark'
    return (localStorage.getItem('archnext-theme') as 'dark' | 'light') || 'dark'
}

interface UIState {
    sidebarOpen: boolean
    theme: 'dark' | 'light'
    activeModal: string | null
    toggleSidebar: () => void
    toggleTheme: () => void
    setTheme: (t: 'dark' | 'light') => void
    openModal: (name: string) => void
    closeModal: () => void
}

export const useUIStore = create<UIState>((set, get) => ({
    sidebarOpen: true,
    theme: 'dark', // initialised properly client-side by ThemeProvider
    activeModal: null,
    toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark'
        if (typeof window !== 'undefined') {
            localStorage.setItem('archnext-theme', next)
            document.documentElement.setAttribute('data-theme', next)
        }
        set({ theme: next })
    },
    setTheme: (t) => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('archnext-theme', t)
            document.documentElement.setAttribute('data-theme', t)
        }
        set({ theme: t })
    },
    openModal: (name) => set({ activeModal: name }),
    closeModal: () => set({ activeModal: null }),
}))
