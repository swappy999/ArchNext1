import { create } from 'zustand'
import { api } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MapBounds {
    ne_lng: number
    ne_lat: number
    sw_lng: number
    sw_lat: number
}

interface Viewport {
    longitude: number
    latitude: number
    zoom: number
    pitch: number
    bearing: number
}

interface HoverInfo {
    x: number
    y: number
    object: any | null
    layer: string
}

interface MapState {
    // ─── Viewport ─────────────────────────────────────
    viewport: Viewport
    bounds: MapBounds | null

    // ─── Data ─────────────────────────────────────────
    mlGeoJson: any | null
    clusters: any[]
    heatmap: any[]
    zones: any[]
    pulsePoints: any[]
    currentZone: any | null
    propertyCount: number

    // ─── UI State ─────────────────────────────────────
    loading: boolean
    activeLayers: Record<string, boolean>
    selectedFeature: any | null
    hoverInfo: HoverInfo | null
    viewMode: '2d' | '3d'
    cinematicEntry: boolean

    // ─── Actions ──────────────────────────────────────
    setViewport: (viewport: Partial<Viewport>) => void
    setBounds: (bounds: MapBounds) => void
    toggleLayer: (layerId: string) => void
    setSelectedFeature: (feature: any | null) => void
    setHoverInfo: (info: HoverInfo | null) => void
    setViewMode: (mode: '2d' | '3d') => void
    setCinematicEntry: (done: boolean) => void
    fetchMapData: (bounds: MapBounds, page?: number, limit?: number) => Promise<void>
    flyTo: (target: Partial<Viewport>, duration?: number) => void
}

// ─── Debounce Helper & Cache ──────────────────────────────────────────────────

let fetchTimer: any = null
const CACHE_DURATION = 2 * 1000 // 2 seconds for real-time reactivity
const apiCache = new Map<string, { smartData: any; aiData: any; timestamp: number }>()

// ─── Store ────────────────────────────────────────────────────────────────────

export const useMapStore = create<MapState>((set, get) => ({
    // Viewport — Kolkata default
    viewport: {
        longitude: 88.3639,
        latitude: 22.5726,
        zoom: 12,
        pitch: 60,
        bearing: -20,
    },
    bounds: null,

    // Data
    mlGeoJson: null,
    clusters: [],
    heatmap: [],
    zones: [],
    pulsePoints: [],
    currentZone: null,
    propertyCount: 0,
    growthData: null,

    // UI
    loading: false,
    activeLayers: {
        heatmap: false,
        intel: false,
        zones: false,
        properties: false,
        pulse: false,
        buildings: false,
    },
    selectedFeature: null,
    hoverInfo: null,
    viewMode: '3d',
    cinematicEntry: false,

    // ─── Actions ──────────────────────────────────────

    setViewport: (partial) =>
        set((s) => ({ viewport: { ...s.viewport, ...partial } })),

    setBounds: (bounds) => {
        set({ bounds })
        // Debounced fetch — 500ms for quicker real-time sync
        if (fetchTimer) clearTimeout(fetchTimer)
        fetchTimer = setTimeout(() => {
            get().fetchMapData(bounds)
        }, 500)
    },

    toggleLayer: (layerId) =>
        set((s) => ({
            activeLayers: {
                ...s.activeLayers,
                [layerId]: !s.activeLayers[layerId],
            },
        })),

    setSelectedFeature: (feature) => set({ selectedFeature: feature }),
    setHoverInfo: (info) => set({ hoverInfo: info }),
    setViewMode: (mode) => set({ viewMode: mode }),
    setCinematicEntry: (done) => set({ cinematicEntry: done }),

    fetchMapData: async (bounds, page = 1, limit = 100) => {
        set({ loading: true })
        try {
            const { ne_lng, ne_lat, sw_lng, sw_lat } = bounds
            const zoom = get().viewport.zoom;

            // Cache keys based on rounded coordinates to group minor pans
            const cacheKey = `${sw_lat.toFixed(3)}_${sw_lng.toFixed(3)}_${ne_lat.toFixed(3)}_${ne_lng.toFixed(3)}_${zoom.toFixed(1)}_${page}_${limit}`
            const cachedParams = apiCache.get(cacheKey)

            if (cachedParams && Date.now() - cachedParams.timestamp < CACHE_DURATION) {
                const { smartData, aiData } = cachedParams;
                set({
                    mlGeoJson: aiData,
                    clusters: smartData?.clusters || [],
                    heatmap: smartData?.heatmap || [],
                    zones: smartData?.zones || [],
                    pulsePoints: smartData?.pulse_points || [],
                    currentZone: smartData?.zone || null,
                    propertyCount: aiData?.features?.length || 0,
                    loading: false,
                })
                return;
            }

            // 1. Fetch Structural Data (Extrusions, Boundaries, Clusters) with pagination/limits
            const smartDataPromise = api.get(
                `/map/smart-map?ne_lng=${ne_lng}&ne_lat=${ne_lat}&sw_lng=${sw_lng}&sw_lat=${sw_lat}&limit=${limit}&page=${page}`
            )

            // 2. Fetch Live Machine Learning Geo-predictions
            const aiDataPromise = api.post('/prediction/map-predict', {
                bbox: [sw_lng, sw_lat, ne_lng, ne_lat],
                zoom: zoom
            })

            // Await all spatial systems concurrently
            const [smartData, aiData] = await Promise.all([smartDataPromise, aiDataPromise])

            apiCache.set(cacheKey, { smartData, aiData, timestamp: Date.now() })

            set({
                mlGeoJson: aiData,
                clusters: smartData?.clusters || [],
                heatmap: smartData?.heatmap || [],
                zones: smartData?.zones || [],
                pulsePoints: smartData?.pulse_points || [],
                currentZone: smartData?.zone || null,
                propertyCount: aiData?.features?.length || 0,
                loading: false,
            })
        } catch {
            set({ loading: false })
        }
    },

    flyTo: (target, _duration = 2000) => {
        set((s) => ({
            viewport: { ...s.viewport, ...target },
        }))
    },
}))
