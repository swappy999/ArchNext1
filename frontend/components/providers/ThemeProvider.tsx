'use client'

import { useEffect } from 'react'
import { useUIStore } from '@/store/uiStore'

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
    const { setTheme } = useUIStore()

    useEffect(() => {
        // Read persisted theme from localStorage on mount and apply it
        const saved = (localStorage.getItem('archnext-theme') as 'dark' | 'light') || 'dark'
        document.documentElement.setAttribute('data-theme', saved)
        setTheme(saved)
    }, [setTheme])

    return <>{children}</>
}
