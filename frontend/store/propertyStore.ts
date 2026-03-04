import { create } from 'zustand'
import { api } from '@/lib/api'
import { useAuthStore } from './authStore'

interface Property {
    id: string
    title: string
    address: string
    price: number
    location: { type: string; coordinates: [number, number] }
    nft_minted?: boolean
    nft_token_id?: number
    blockchain_verified?: boolean
    owner_id: string
    status?: string
    chain?: 'polygon' | 'algorand' | 'mock'
}

interface PropertyState {
    properties: Property[]
    loading: boolean
    error: string | null
    _lastFetched: number
    fetchProperties: (force?: boolean) => Promise<void>
    fetchNearby: (lng: number, lat: number, radius?: number) => Promise<Property[]>
    syncAll: () => Promise<void>

    // Realtime Sync
    _ws?: WebSocket
    subscribeToUpdates: () => void
}

export const usePropertyStore = create<PropertyState>((set, get) => ({
    properties: [],
    loading: false,
    error: null,
    _lastFetched: 0,

    fetchProperties: async (force = false) => {
        // Skip if data is fresh (< 60s old) unless forced
        const now = Date.now()
        if (!force && get().properties.length > 0 && now - get()._lastFetched < 60000) return
        set({ loading: true, error: null })
        try {
            const data = await api.get('/properties/')
            set({ properties: data, loading: false, _lastFetched: now })

            // Ensure WS is connected whenever properties are loaded
            if (!get()._ws) {
                get().subscribeToUpdates()
            }
        } catch (e: any) {
            set({ error: e.message, loading: false })
        }
    },

    fetchNearby: async (lng, lat, radius = 3000) => {
        const token = useAuthStore.getState().accessToken
        return api.get(`/properties/nearby?longitude=${lng}&latitude=${lat}&radius=${radius}`, token)
    },

    syncAll: async () => {
        try {
            await get().fetchProperties(true)
            // Can be expanded to call other specific cluster refreshers if needed
        } catch (error) {
            console.error("Failed to sync global property state:", error)
        }
    },

    subscribeToUpdates: () => {
        if (get()._ws) return;

        try {
            const wsUrl = process.env.NEXT_PUBLIC_API_URL?.replace('http', 'ws') || 'ws://127.0.0.1:8000';
            const ws = new WebSocket(`${wsUrl}/ws`);

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    if (message.topic === 'property:update') {
                        console.log("⚡ [Realtime] Property State Sync Triggered:", message.data);
                        // Invalidate cache and trigger global fetch instantly
                        get().syncAll();
                    }
                } catch (e) {
                    console.error("WS Parse Error", e);
                }
            };

            ws.onclose = () => {
                // Auto-reconnect quietly
                setTimeout(() => {
                    set({ _ws: undefined });
                    get().subscribeToUpdates();
                }, 5000);
            };

            set({ _ws: ws });
        } catch (err) {
            console.error("Failed to connect realtime property updates", err);
        }
    }
}))
