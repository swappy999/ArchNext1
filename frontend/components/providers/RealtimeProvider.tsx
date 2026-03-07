'use client'

import { useEffect } from 'react'
import { useRealtimeStore } from '@/store/realtimeStore'

/**
 * RealtimeProvider
 * Mount this once at the dashboard layout level so every page in the
 * dashboard gets access to live property updates through the WS stream.
 */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
    const { connect, disconnect } = useRealtimeStore()

    useEffect(() => {
        connect()
        return () => { disconnect() }
    }, [])

    return <>{children}</>
}
