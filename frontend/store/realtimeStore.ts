'use client'

import { create } from 'zustand'
import toast from 'react-hot-toast'

// Real-time events pushed by the backend's property_sync_service.py
export type RealtimeEvent =
    | 'CONNECTED'
    | 'LIST_CREATED'
    | 'AUCTION_STARTED'
    | 'BID_PLACED'
    | 'PROPERTY_SOLD'
    | 'OWNERSHIP_TRANSFERRED'
    | 'DELISTED'
    | 'NFT_MINTED'
    | 'PROPERTY_VERIFIED'

export interface PropertyUpdate {
    topic: string
    data: {
        property_id: string
        event: RealtimeEvent
        status: string
        [key: string]: any
    }
    // For top-level CONNECTED messages
    event?: RealtimeEvent
    message?: string
}

interface RealtimeState {
    connected: boolean
    lastEvent: PropertyUpdate | null
    updatedPropertyIds: Set<string>
    connect: () => void
    disconnect: () => void
    _ws: WebSocket | null
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws'

// Map of backend event names → user-facing toast messages
const EVENT_MESSAGES: Record<string, string> = {
    LIST_CREATED: '🏡 A property has been listed on the marketplace.',
    AUCTION_STARTED: '🔨 An auction has started!',
    BID_PLACED: '💰 A new bid has been placed.',
    PROPERTY_SOLD: '✅ A property has been sold.',
    OWNERSHIP_TRANSFERRED: '🔐 Ownership has been transferred.',
    DELISTED: '📤 A property has been delisted.',
    NFT_MINTED: '🪙 A new NFT has been minted.',
    PROPERTY_VERIFIED: '✔️ A property has been AI-verified.',
}

let wsInstance: WebSocket | null = null
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 12 // Give up after ~5 minutes of retries

export const useRealtimeStore = create<RealtimeState>((set, get) => ({
    connected: false,
    lastEvent: null,
    updatedPropertyIds: new Set(),
    _ws: null,

    connect: () => {
        // Prevent duplicate connections
        if (wsInstance && wsInstance.readyState === WebSocket.OPEN) return

        try {
            const ws = new WebSocket(WS_URL)
            wsInstance = ws

            ws.onopen = () => {
                reconnectAttempts = 0 // Reset counter on successful connection
                set({ connected: true, _ws: ws })
                console.log('[Realtime] Connected to ArchNext stream.')
            }

            ws.onmessage = (event) => {
                try {
                    const msg: PropertyUpdate = JSON.parse(event.data)
                    set({ lastEvent: msg })

                    if (msg.event === 'CONNECTED') return // Handshake only

                    const eventName = msg.data?.event || msg.event
                    const propertyId = msg.data?.property_id

                    // Refresh relevant stores when an update arrives
                    if (propertyId) {
                        set(state => ({
                            updatedPropertyIds: new Set([...state.updatedPropertyIds, propertyId])
                        }))
                    }

                    // Optimistically refresh relevant Zustand stores
                    _dispatchStoreRefresh(eventName, propertyId)

                    // Show real-time toast with event context
                    const message = EVENT_MESSAGES[eventName || '']
                    if (message) {
                        toast(message, { icon: '📡', duration: 3000 })
                    }

                } catch (e) {
                    console.warn('[Realtime] Failed to parse WS message:', e)
                }
            }

            ws.onclose = (event) => {
                set({ connected: false, _ws: null })
                wsInstance = null

                // Don't reconnect if closed cleanly (code 1000) or too many retries
                if (event.code === 1000 || reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                        console.warn('[Realtime] Max reconnect attempts reached. Backend may be offline.')
                    }
                    reconnectAttempts = 0
                    return
                }

                // Exponential backoff: 5s, 10s, 20s, capped at 30s
                reconnectAttempts++
                const delay = Math.min(5000 * reconnectAttempts, 30000)
                console.debug(`[Realtime] Reconnecting in ${delay / 1000}s... (attempt ${reconnectAttempts})`)
                reconnectTimeout = setTimeout(() => get().connect(), delay)
            }

            ws.onerror = () => {
                // Suppress the error — browser already fires onclose after onerror.
                // Using warn (not error) to avoid the red browser console overlay.
                console.warn('[Realtime] WebSocket connection failed. Backend may not be running.')
            }

        } catch (e) {
            console.error('[Realtime] Could not connect to WebSocket:', e)
        }
    },

    disconnect: () => {
        if (reconnectTimeout) clearTimeout(reconnectTimeout)
        if (wsInstance) {
            wsInstance.close()
            wsInstance = null
        }
        set({ connected: false, _ws: null })
    }
}))

/**
 * Called when a real-time event arrives.
 * Routes the event to relevant Zustand stores for optimistic UI updates.
 */
function _dispatchStoreRefresh(event: string | undefined, propertyId?: string) {
    if (!event) return

    setTimeout(async () => {
        try {
            // Always refresh marketplace on sold/listed/delisted events
            if (['LIST_CREATED', 'PROPERTY_SOLD', 'DELISTED', 'AUCTION_STARTED'].includes(event)) {
                const { useMarketplaceStore } = await import('./marketplaceStore')
                    // Force refresh bypassing cache
                    ; (useMarketplaceStore as any).setState({ _lastFetched: 0 })
                await useMarketplaceStore.getState().fetchListings()
            }

            // Refresh portfolio on ownership changes
            if (['PROPERTY_SOLD', 'OWNERSHIP_TRANSFERRED', 'NFT_MINTED'].includes(event)) {
                const { usePortfolioStore } = await import('./portfolioStore')
                const store = usePortfolioStore.getState()
                if (typeof store.fetchPortfolio === 'function') {
                    await (store.fetchPortfolio as () => Promise<void>)()
                }
            }

            // Refresh auction bids on new bid
            if (event === 'BID_PLACED') {
                const { useAuctionStore } = await import('./auctionStore')
                const { currentAuction } = useAuctionStore.getState()
                if (currentAuction && currentAuction.property_id === propertyId) {
                    await useAuctionStore.getState().fetchAuctionDetail(currentAuction.id)
                }
                // Also refresh active auctions list
                await useAuctionStore.getState().fetchActiveAuctions()
            }

            // Refresh the property store for the smart map
            const { usePropertyStore } = await import('./propertyStore')
            await usePropertyStore.getState().syncAll()

            // Refresh smart map data
            const { useMapStore } = await import('./mapStore')
            const mapState = useMapStore.getState()
            if (mapState.bounds) {
                mapState.fetchMapData(mapState.bounds)
            }

        } catch (e) {
            console.warn('[Realtime] Store refresh failed:', e)
        }
    }, 300) // Small delay to ensure backend DB has committed
}
