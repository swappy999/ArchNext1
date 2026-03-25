import { create } from 'zustand'
import { api } from '@/lib/api'
import { useAuthStore } from './authStore'

interface PortfolioAsset {
    id?: string
    property_id: string
    title: string
    address: string
    area?: string
    location?: string
    purchase_price: number
    current_value: number
    current_price?: number
    predicted_price?: number
    growth_percent?: number
    ai_growth_prediction?: number
    is_nft?: boolean
    nft_minted?: boolean
    nft_token_id?: number | null
    listed_for_sale?: boolean
    listing_price_matic?: number
    blockchain_verified?: boolean
    chain?: 'polygon' | 'algorand' | 'mock'
}

interface PortfolioState {
    assets: PortfolioAsset[]
    active_auctions: any[]
    my_bids: any[]
    total_current_value: number
    total_invested: number
    loading: boolean
    _lastFetched: number
    fetchPortfolio: () => Promise<void>
    invalidatePortfolio: () => void
    _ws?: WebSocket
    subscribeToUpdates: () => void
}

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
    assets: [],
    active_auctions: [],
    my_bids: [],
    total_current_value: 0,
    total_invested: 0,
    loading: false,
    _lastFetched: 0,

    fetchPortfolio: async () => {
        const token = useAuthStore.getState().accessToken
        if (!token) return

        set({ loading: true })
        try {
            const data = await api.get('/portfolio/me', token)
            if (!data) return set({ loading: false })

            const portfolio = data?.properties || []
            const active_auctions = data?.active_auctions || []
            const my_bids = data?.my_bids || []

            const totalValue = data?.total_current_value || portfolio.reduce((acc: number, a: any) => acc + (a.current_price || 0), 0)
            const totalInvested = portfolio.reduce((acc: number, a: any) => acc + (a.purchase_price || a.current_price || 0), 0)

            set({
                assets: portfolio,
                active_auctions: active_auctions,
                my_bids: my_bids,
                total_current_value: totalValue,
                total_invested: totalInvested,
                loading: false,
                _lastFetched: Date.now(),
            })
        } catch (e: any) {
            console.warn('[Portfolio] Fetch error:', e?.message)
            set({ loading: false })
        }
    },
    invalidatePortfolio: () => set({ _lastFetched: 0 }),
    subscribeToUpdates: () => {
        if (get()._ws) return;
        try {
            const wsUrl = process.env.NEXT_PUBLIC_API_URL?.replace('http', 'ws') || 'ws://127.0.0.1:8000';
            const ws = new WebSocket(`${wsUrl}/ws`);
            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    if (message.event || message.topic === 'property:update' || message.event === 'BID_PLACED') {
                        console.log("⚡ [Realtime] Portfolio Sync Triggered:", message.event || message.topic);
                        get().invalidatePortfolio();
                        get().fetchPortfolio();
                    }
                } catch (e) {
                    console.error("Portfolio WS Parse Error", e);
                }
            };
            ws.onclose = () => {
                setTimeout(() => {
                    set({ _ws: undefined } as any);
                    get().subscribeToUpdates();
                }, 5000);
            };
            set({ _ws: ws } as any);
        } catch (err) {
            console.error("Failed to connect Portfolio WS", err);
        }
    }
}))
