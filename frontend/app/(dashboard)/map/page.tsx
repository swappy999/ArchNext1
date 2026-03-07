'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Layers, Thermometer, Navigation2, Activity,
    TrendingUp, Crosshair, Zap, Scan, Globe,
    ShieldCheck, Eye, EyeOff, Hexagon, Radio,
    Building2, Maximize, ChevronRight, Brain, MapPin, Loader2
} from 'lucide-react'
import { useMapStore } from '@/store/mapStore'
import { formatCurrencyCompact } from '@/lib/utils'
import { api } from '@/lib/api'
import Map, { MapRef, useControl } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MapboxOverlay } from '@deck.gl/mapbox'
import { ScatterplotLayer, PolygonLayer } from '@deck.gl/layers'
import { HeatmapLayer } from '@deck.gl/aggregation-layers'
import { cn } from '@/lib/utils'
import IntelTooltip from '@/components/map/IntelTooltip'

// ─── Constants ──────────────────────────────────────────────────────
const CINEMATIC_DURATION = 3000

export default function MapPage() {
    const mapRef = useRef<MapRef | null>(null)
    const animFrameRef = useRef<number>(0)
    const [mapError, setMapError] = useState(false)
    const [mapLoaded, setMapLoaded] = useState(false)
    const [clickPred, setClickPred] = useState<any>(null)
    const [clickLoading, setClickLoading] = useState(false)
    const [clickArea, setClickArea] = useState<string>("1500")
    // Reverse geocode state
    const [clickAddress, setClickAddress] = useState<string | null>(null)
    const [clickGeoLoading, setClickGeoLoading] = useState(false)

    const {
        viewport, activeLayers, hoverInfo, viewMode,
        clusters, heatmap, zones, pulsePoints, currentZone,
        loading, cinematicEntry, propertyCount, mlGeoJson,
        setBounds, toggleLayer, setHoverInfo,
        setViewMode, setCinematicEntry, setViewport,
        selectedFeature, setSelectedFeature
    } = useMapStore()

    // Local viewState to track user interaction 
    const [viewState, setViewState] = useState({
        longitude: viewport.longitude,
        latitude: viewport.latitude,
        zoom: 10,
        pitch: 0,
        bearing: 0,
        transitionDuration: 0,
        transitionEasing: (t: number) => t
    })

    // ─── Initialize MapLibre ───────────────────────────────────────────────
    const onMapLoad = useCallback((e: any) => {
        const m = e.target
        try {
            // Support both Mapbox (composite) and Carto (carto) styles
            const sourceId = m.getSource('carto') ? 'carto' : 'composite'

            if (m.getSource(sourceId)) {
                if (!m.getLayer('3d-buildings')) {
                    m.addLayer({
                        id: '3d-buildings',
                        source: sourceId,
                        'source-layer': 'building',
                        filter: ['==', 'extrude', 'true'],
                        type: 'fill-extrusion',
                        minzoom: 13,
                        paint: {
                            'fill-extrusion-color': [
                                'interpolate', ['linear'], ['get', 'height'],
                                0, '#0a1628',
                                50, '#0c2d5e',
                                150, '#0ea5e9',
                            ],
                            'fill-extrusion-height': [
                                'interpolate', ['linear'], ['zoom'],
                                13, 0, 13.05, ['get', 'height']
                            ],
                            'fill-extrusion-base': [
                                'interpolate', ['linear'], ['zoom'],
                                13, 0, 13.05, ['get', 'min_height']
                            ],
                            'fill-extrusion-opacity': 0.45,
                        }
                    })
                }
            }
        } catch (err) {
            console.log('[Map] 3D buildings not available on this tile provider style')
        }

        // 0. CLEANUP: Remove any legacy style-based layers that might persist in style memory
        const legacyLayers = ['heatmap-layer', 'thermal-heatmap', 'property-heatmap', 'ward-heatmap']
        legacyLayers.forEach(l => {
            if (m.getLayer(l)) m.removeLayer(l)
        })

        setMapLoaded(true)

        // Cinematic entry
        setTimeout(() => {
            setViewState(prev => ({
                ...prev,
                zoom: viewport.zoom,
                pitch: viewport.pitch,
                bearing: viewport.bearing,
                transitionDuration: CINEMATIC_DURATION,
                transitionEasing: (t: number) => 1 - Math.pow(1 - t, 3),
            }))
            setTimeout(() => setCinematicEntry(true), CINEMATIC_DURATION)
        }, 500)

        // Force initial bounds update after a tiny delay to let the map size calculate
        setTimeout(() => {
            const bounds = m.getBounds()
            if (bounds) {
                setBounds({
                    ne_lng: bounds.getNorthEast().lng,
                    ne_lat: bounds.getNorthEast().lat,
                    sw_lng: bounds.getSouthWest().lng,
                    sw_lat: bounds.getSouthWest().lat,
                })
            }
        }, 100)
    }, [viewport, setCinematicEntry, setBounds])

    const onMoveEnd = useCallback((e: any) => {
        const m = e.target
        const bounds = m.getBounds()
        if (bounds) {
            setBounds({
                ne_lng: bounds.getNorthEast().lng,
                ne_lat: bounds.getNorthEast().lat,
                sw_lng: bounds.getSouthWest().lng,
                sw_lat: bounds.getSouthWest().lat,
            })
        }
        setViewState({
            longitude: m.getCenter().lng,
            latitude: m.getCenter().lat,
            zoom: m.getZoom(),
            pitch: m.getPitch(),
            bearing: m.getBearing(),
            transitionDuration: 0,
            transitionEasing: (t: number) => t
        })
    }, [setBounds])

    // ─── Reverse Geocoding (Nominatim / OpenStreetMap) ───────────────────────
    const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<string> => {
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`,
                { headers: { 'Accept-Language': 'en', 'User-Agent': 'ArchNext/1.0' } }
            )
            if (!res.ok) throw new Error('Nominatim error')
            const data = await res.json()
            // Build a concise address string
            const a = data.address || {}
            const parts = [
                a.road || a.pedestrian || a.footway || a.cycleway,
                a.neighbourhood || a.suburb || a.village || a.town,
                a.city_district || a.county,
                a.city || a.town || a.municipality,
                a.state,
            ].filter(Boolean)
            return parts.length > 0 ? parts.join(', ') : data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
        } catch {
            return `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`
        }
    }, [])

    // ─── Click Prediction Handler ─────────────────────────────────────────
    const onMapClick = useCallback(async (e: any) => {
        if (e.originalEvent.target.classList.contains('mapboxgl-canvas-container')) return

        const { lng, lat } = e.lngLat
        setClickPred(null)
        setClickAddress(null)
        setClickLoading(true)
        setClickGeoLoading(true)

        // Run AI prediction and reverse geocode in parallel
        const [predResult, geoResult] = await Promise.allSettled([
            api.post('/prediction/predict-price', { lat, lng }),
            reverseGeocode(lat, lng)
        ])

        setClickGeoLoading(false)
        setClickAddress(geoResult.status === 'fulfilled' ? geoResult.value : null)

        if (predResult.status === 'fulfilled') {
            const res = predResult.value
            setClickPred({ lat, lng, price_sqft: res.predicted_price, zone: res.zone, ward: res.ward })
        } else {
            setClickPred({ lat, lng, error: 'Location outside modeling bounds or service error' })
        }
        setClickLoading(false)
    }, [reverseGeocode])

    // ─── View Mode Toggle ─────────────────────────────────────────────────
    useEffect(() => {
        if (!mapLoaded || !mapRef.current) return
        const m = mapRef.current.getMap()
        if (viewMode === '3d') {
            m.easeTo({ pitch: 60, bearing: -20, duration: 1200 })
        } else {
            m.easeTo({ pitch: 0, bearing: 0, duration: 1200 })
        }
    }, [viewMode, mapLoaded])

    // ─── Buildings Visibility ─────────────────────────────────────────────
    useEffect(() => {
        if (!mapRef.current || !mapLoaded) return
        const m = mapRef.current.getMap()
        if (m && m.getLayer('3d-buildings')) {
            m.setLayoutProperty('3d-buildings', 'visibility',
                activeLayers.buildings ? 'visible' : 'none')
        }
    }, [activeLayers.buildings, mapLoaded])

    // ─── deck.gl Layers: Strict Isolation & Optimization ──────────────────
    const deckLayers = useMemo(() => {
        const layers: any[] = []

        // Filter utility for property nodes
        const filterProperties = (f: any) => {
            if (f.properties.is_grid) return false;
            return true;
        };

        // Layer 2 — Ward Boundaries (Base Picking Layer)
        // This is unconditionally added to the deck to ensure Hovers always work, 
        // but visually toggled via opacity/color to match the activeLayers.zones state.
        if (zones && zones.length > 0) {
            const isZonesVisible = activeLayers.zones;

            layers.push(
                new PolygonLayer({
                    id: 'ward-polygon-layer',
                    data: zones,
                    getPolygon: (d: any) => d.polygon,
                    getFillColor: isZonesVisible ? [14, 165, 233, 40] : [0, 0, 0, 0],
                    getLineColor: isZonesVisible ? [14, 165, 233, 100] : [0, 0, 0, 0],
                    getElevation: 0,
                    extruded: false,
                    wireframe: isZonesVisible,
                    lineWidthMinPixels: isZonesVisible ? 1 : 0,
                    pickable: true,
                    onClick: (info: any) => {
                        if (info.object) {
                            setSelectedFeature(info.object)
                        } else {
                            setSelectedFeature(null)
                        }
                    },
                    onHover: (info: any) => {
                        if (info.object) {
                            setHoverInfo({ x: info.x, y: info.y, object: info.object, layer: 'zones' })
                        } else {
                            setHoverInfo(null)
                        }
                    }
                })
            )
        }

        // Layer 5 — 3D Structures (Extruded Wards / Buildings)
        // Strictly isolated to the buildings toggle
        if (activeLayers.buildings && zones && zones.length > 0) {
            layers.push(
                new PolygonLayer({
                    id: '3d-structures-layer',
                    data: zones,
                    getPolygon: (d: any) => d.polygon,
                    getFillColor: (d: any) => {
                        const g = d.growth_score || 0
                        if (g > 70) return [14, 165, 233, 120]    // High growth
                        return [51, 65, 100, 80]                  // Standard
                    },
                    getLineColor: [255, 255, 255, 20],
                    getElevation: (d: any) => d.elevation || 100,
                    extruded: viewMode === '3d',
                    wireframe: true,
                    pickable: true,
                    material: {
                        ambient: 0.2,
                        diffuse: 0.6,
                        shininess: 32,
                        specularColor: [60, 60, 60]
                    },
                    transitions: {
                        getElevation: { duration: 1000, easing: (t: number) => 1 - Math.pow(1 - t, 3) },
                    },
                    updateTriggers: {
                        getElevation: [viewMode]
                    }
                })
            )
        }

        // Layer 3 — Property Nodes (Scatterplot)
        if (activeLayers.properties && mlGeoJson?.features) {
            const propFeatures = mlGeoJson.features.filter(filterProperties);

            layers.push(
                new ScatterplotLayer({
                    id: 'property-nodes-layer',
                    data: propFeatures,
                    getPosition: (d: any) => d.geometry.coordinates,
                    getRadius: (d: any) => d.properties.tier === 'premium' ? 60 : 30,
                    getFillColor: (d: any) => {
                        const s = d.properties.status;
                        if (s === 'minted' || s === 'owned') return [59, 130, 246, 160];    // Blue
                        if (s === 'auction') return [168, 85, 247, 160];                    // Purple
                        if (s === 'listed') return [249, 115, 22, 160];                     // Orange
                        if (s === 'verified') return [16, 185, 129, 160];                   // Green
                        if (s === 'sold') return [239, 68, 68, 160];                        // Red
                        return [100, 116, 139, 160];                                        // Gray (Draft/Default)
                    },
                    getLineColor: (d: any) => {
                        const s = d.properties.status;
                        if (s === 'minted' || s === 'owned') return [59, 130, 246, 255];    // Blue
                        if (s === 'auction') return [168, 85, 247, 255];                    // Purple
                        if (s === 'listed') return [249, 115, 22, 255];                     // Orange
                        if (s === 'verified') return [16, 185, 129, 255];                   // Green
                        if (s === 'sold') return [239, 68, 68, 255];                        // Red
                        return [100, 116, 139, 255];                                        // Gray (Draft/Default)
                    },
                    lineWidthMinPixels: 1,
                    stroked: true,
                    filled: true,
                    radiusMinPixels: 6,
                    pickable: true,
                    onHover: (info: any) => {
                        if (info.object) {
                            setHoverInfo({ x: info.x, y: info.y, object: info.object.properties, layer: 'properties' })
                        } else {
                            setHoverInfo(null)
                        }
                    }
                })
            )
        }

        // Layer 4 — Urban Pulse (Aggregated Ward Metrics)
        if (activeLayers.pulse && zones && zones.length > 0) {
            layers.push(
                new ScatterplotLayer({
                    id: 'urban-pulse-layer',
                    data: zones,
                    getPosition: (d: any) => d.centroid,
                    getRadius: (d: any) => (d.thermal_index || 0) * 1000,
                    getFillColor: (d: any) => [14, 165, 233, (d.thermal_index || 0.1) * 100],
                    getLineColor: [14, 165, 233, 150],
                    stroked: true,
                    filled: true,
                    lineWidthMinPixels: 1,
                    radiusMinPixels: 10,
                    pickable: false,
                })
            )
        }

        // Layer 6 - Thermal Intel Heatmap
        if (activeLayers.intel && heatmap && heatmap.length > 0) {
            layers.push(
                new HeatmapLayer({
                    id: 'thermal-heatmap',
                    data: heatmap,
                    getPosition: (d: any) => [d.longitude, d.latitude],
                    getWeight: (d: any) => d.weight || 0.5,
                    radiusPixels: 100,
                    intensity: 1.0,
                    threshold: 0.05,
                    opacity: 0.45,
                    colorRange: [
                        [26, 36, 61],
                        [73, 102, 172],
                        [129, 161, 221],
                        [253, 237, 176],
                        [248, 114, 88],
                        [188, 20, 26]
                    ]
                })
            )
        }

        return layers
    }, [activeLayers, zones, mlGeoJson, pulsePoints, heatmap, viewMode, setHoverInfo])

    // DeckGL overlay hook for react-map-gl: create only ONCE
    const deckControl = useMemo(() => {
        return new MapboxOverlay({
            interleaved: false,
            layers: []
        })
    }, [])

    // Apply overlay to map and update layers strictly
    useEffect(() => {
        if (mapRef.current && mapLoaded && deckControl) {
            const map = mapRef.current.getMap()
            if (map && !map.hasControl(deckControl as any)) {
                map.addControl(deckControl as any)
            }

            // Sync layers strictly based on visibility state
            deckControl.setProps({
                layers: [...deckLayers]
            })
        }
    }, [deckControl, mapLoaded, deckLayers])

    // ─── Layer Config ─────────────────────────────────────────────────────
    const layerConfig = [
        { id: 'intel', label: 'Thermal Intel', icon: Thermometer, color: 'rose' },
        { id: 'zones', label: 'Ward Boundaries', icon: Hexagon, color: 'indigo' },
        { id: 'properties', label: 'Property Nodes', icon: Navigation2, color: 'emerald' },
        { id: 'pulse', label: 'Urban Pulse', icon: Radio, color: 'amber' },
        { id: 'buildings', label: '3D Structures', icon: Building2, color: 'blue' },
    ]

    const colorMap: Record<string, string> = {
        cyan: 'text-cyan-400',
        indigo: 'text-indigo-400',
        emerald: 'text-emerald-400',
        amber: 'text-amber-400',
        blue: 'text-blue-400',
        rose: 'text-rose-400',
    }

    const activeCount = Object.values(activeLayers).filter(Boolean).length
    const hoveredWard = (hoverInfo?.layer === 'zones' && hoverInfo.object) ? hoverInfo.object : null;
    const displayZone = hoveredWard || (selectedFeature?.polygon ? selectedFeature : currentZone) || { count: 0, growth_score: 0, avg_price: 0, thermal_index: 0, tier: 'unknown' };


    return (
        <div className="h-[calc(100vh-140px)] flex flex-col space-y-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-2">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Scan size={14} className="text-cyan-500 animate-pulse" />
                        <span className="text-[11px] font-black text-cyan-500 uppercase tracking-[0.2em]">
                            Property Management System
                        </span>
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tighter leading-none">
                        Property Map
                    </h1>
                    <p className="text-slate-500 mt-1.5 text-sm font-medium">
                        Real-time property visualization · deck.gl + MapLibre GL
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="glass-panel px-4 py-2 rounded-2xl flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Data Synced</span>
                        </div>
                        <div className="h-4 w-px bg-white/10" />
                        {loading ? (
                            <div className="flex items-center gap-2 text-[10px] font-black text-cyan-400 uppercase tracking-widest animate-pulse">
                                <Activity size={12} /> SCANNING...
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                                    {propertyCount} PROPERTIES
                                </span>
                                <span className="text-[11px] font-black text-cyan-500/60 uppercase tracking-widest">
                                    {activeCount} LAYERS
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Map Container */}
            <div className="flex-1 relative rounded-[2.5rem] overflow-hidden border border-white/[0.06] bg-[#030508] shadow-2xl">
                <div className="absolute inset-0">
                    <Map
                        ref={mapRef}
                        initialViewState={viewState}
                        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
                        onLoad={onMapLoad}
                        onMoveEnd={onMoveEnd}
                        onClick={onMapClick}
                        interactiveLayerIds={[]} // Let DeckGL handle properties
                        reuseMaps
                    />
                </div>

                {/* Cinematic Fade-In Overlay */}
                <AnimatePresence>
                    {!cinematicEntry && mapLoaded && (
                        <motion.div
                            initial={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1.5 }}
                            className="absolute inset-0 z-50 bg-[#030508] flex items-center justify-center"
                        >
                            <motion.div
                                animate={{ opacity: [0.4, 1, 0.4] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="text-center"
                            >
                                <Scan size={32} className="text-cyan-500 mx-auto mb-3" />
                                <p className="text-[11px] font-black text-cyan-500 uppercase tracking-[0.3em]">
                                    Initializing Map
                                </p>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* HUD Corner Marks */}
                <div className="absolute inset-0 pointer-events-none z-10">
                    <div className="absolute top-6 left-6 w-8 h-8 border-t-2 border-l-2 border-cyan-500/20 rounded-tl-xl" />
                    <div className="absolute top-6 right-6 w-8 h-8 border-t-2 border-r-2 border-cyan-500/20 rounded-tr-xl" />
                    <div className="absolute bottom-6 left-6 w-8 h-8 border-b-2 border-l-2 border-cyan-500/20 rounded-bl-xl" />
                    <div className="absolute bottom-6 right-6 w-8 h-8 border-b-2 border-r-2 border-cyan-500/20 rounded-br-xl" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10">
                        <Crosshair size={24} className="text-cyan-400" />
                    </div>
                </div>

                {/* Left — Layer Controls */}
                <AnimatePresence>
                    {cinematicEntry && (
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                            className="absolute top-6 left-6 z-20 flex flex-col gap-3"
                        >
                            {/* Layer Toggles */}
                            <div className="bg-[#0a0e1a]/80 backdrop-blur-2xl p-2 rounded-2xl flex flex-col gap-1 border border-white/[0.06] shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
                                <div className="px-3 py-2 flex items-center gap-2">
                                    <Layers size={12} className="text-cyan-400" />
                                    <span className="text-[9px] font-black text-cyan-400/80 uppercase tracking-[0.15em]">Layers</span>
                                </div>
                                {layerConfig.map(({ id, label, icon: Icon, color }) => {
                                    const isActive = activeLayers[id]
                                    return (
                                        <button
                                            key={id}
                                            onClick={() => toggleLayer(id)}
                                            className={cn(
                                                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300 group/btn relative",
                                                isActive
                                                    ? "text-white bg-white/[0.06]"
                                                    : "text-slate-600 hover:text-slate-400 hover:bg-white/[0.02]"
                                            )}
                                        >
                                            <Icon size={13} className={cn(
                                                "transition-colors",
                                                isActive ? colorMap[color] : "text-slate-700"
                                            )} />
                                            <span className="flex-1 text-left">{label}</span>
                                            {isActive ? (
                                                <Eye size={11} className="text-emerald-500/60" />
                                            ) : (
                                                <EyeOff size={11} className="text-slate-700" />
                                            )}
                                        </button>
                                    )
                                })}
                            </div>

                        </motion.div>
                    )}
                </AnimatePresence>


                {/* Right — Zone Intelligence Panel & Synth Strategy */}
                <AnimatePresence>
                    {cinematicEntry && (
                        <motion.div
                            initial={{ opacity: 0, x: 40 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 40 }}
                            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                            className="absolute top-6 right-6 z-20 w-72 flex flex-col gap-4"
                        >
                            {/* Zone Intelligence Panel */}
                            {displayZone && displayZone.count > 0 && (
                                <div className="bg-[#0a0e1a]/80 backdrop-blur-2xl p-5 rounded-2xl border border-white/[0.06] shadow-[0_8px_40px_rgba(0,0,0,0.5)] relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-3xl -translate-y-1/2 translate-x-1/2" />

                                    <div className="flex items-center justify-between mb-5 relative z-10">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 border-b border-white/[0.1] pb-0.5">
                                                {displayZone.name || 'Zone Information'}
                                            </span>
                                        </div>
                                        <div className={cn(
                                            "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border",
                                            displayZone.tier === 'Grade A' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                displayZone.tier === 'Grade B' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                    displayZone.tier === 'Grade C' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                        'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                        )}>
                                            {displayZone.tier || 'STANDARD'}
                                        </div>
                                    </div>

                                    <div className="space-y-6 relative z-10">
                                        <div className="flex items-end justify-between">
                                            <div>
                                                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Thermal Index</p>
                                                <div className="flex items-baseline gap-2">
                                                    <h3 className="text-3xl font-black text-white tracking-tighter">
                                                        {displayZone.thermal_index ? Math.round(displayZone.thermal_index * 100) : 0}
                                                    </h3>
                                                    <span className="text-[10px] font-bold text-cyan-400 flex items-center gap-1">
                                                        <Zap size={10} /> AI Score
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="w-14 h-8 flex items-end gap-[2px]">
                                                {[0.4, 0.6, 0.5, 0.8, 0.7, 0.9].map((h, i) => (
                                                    <motion.div
                                                        key={i}
                                                        initial={{ height: 0 }}
                                                        animate={{ height: `${h * 100}%` }}
                                                        transition={{ delay: i * 0.08, duration: 0.5 }}
                                                        className="flex-1 bg-cyan-500/30 rounded-t-sm"
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/[0.04]">
                                            <div>
                                                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-0.5">Median Val</p>
                                                <p className="text-base font-bold text-slate-300 tracking-tight">
                                                    {displayZone.avg_price ? formatCurrencyCompact(displayZone.avg_price) : "₹0"}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-0.5">Node Count</p>
                                                <p className="text-base font-bold text-slate-300 tracking-tight">{displayZone.count || 0}</p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => {
                                                if (displayZone) {
                                                    let target: [number, number] | null = null;

                                                    if (displayZone.centroid) {
                                                        target = [displayZone.centroid[0], displayZone.centroid[1]];
                                                    } else if (displayZone.polygon && displayZone.polygon.length > 0) {
                                                        target = [displayZone.polygon[0][0], displayZone.polygon[0][1]];
                                                    } else {
                                                        // Fallback to center of viewport
                                                        target = [viewport.longitude, viewport.latitude]
                                                    }

                                                    if (target) {
                                                        mapRef.current?.getMap().flyTo({
                                                            center: target,
                                                            zoom: 15.5,
                                                            pitch: 65,
                                                            bearing: -30,
                                                            duration: 2500,
                                                            essential: true
                                                        });
                                                        setViewMode('3d');
                                                    }
                                                }
                                            }}
                                            className="w-full py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[9px] font-black text-cyan-400 uppercase tracking-[0.15em] hover:bg-cyan-500/10 hover:border-cyan-500/20 transition-all flex items-center justify-center gap-2">
                                            <Zap size={12} /> View Details
                                            <ChevronRight size={12} />
                                        </button>
                                    </div>
                                </div>
                            )}

                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Bottom Left — Status Bar */}
                <AnimatePresence>
                    {cinematicEntry && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.4 }}
                            className="absolute bottom-6 left-6 z-20 flex items-end gap-3"
                        >
                            <div className="bg-[#0a0e1a]/80 backdrop-blur-2xl px-4 py-3 rounded-xl flex items-center gap-5 border border-white/[0.06]">
                                <div className="flex items-center gap-2.5">
                                    <Globe size={16} className="text-cyan-400/60" />
                                    <div>
                                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest leading-none mb-0.5">Active Cluster</p>
                                        <p className="text-[11px] font-bold text-white tracking-tight">Kolkata Metro</p>
                                    </div>
                                </div>
                                <div className="h-6 w-px bg-white/[0.06]" />
                                <div className="flex items-center gap-3">
                                    <div className="flex flex-col">
                                        <span className="text-[7px] font-black text-slate-700 uppercase">Latency</span>
                                        <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                                            <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" /> 12ms
                                        </span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[7px] font-black text-slate-700 uppercase">Engine</span>
                                        <span className="text-[10px] font-bold text-white">deck.gl</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[7px] font-black text-slate-700 uppercase">Render</span>
                                        <span className="text-[10px] font-bold text-white">WebGL2</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[#0a0e1a]/80 backdrop-blur-2xl px-3 py-2.5 rounded-lg flex items-center gap-2 border border-white/[0.06]">
                                <ShieldCheck size={13} className="text-cyan-500/60" />
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Verified</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Bottom Right — View Mode Toggle */}
                <AnimatePresence>
                    {cinematicEntry && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.5 }}
                            className="absolute bottom-6 right-6 z-20"
                        >
                            <div className="bg-[#0a0e1a]/80 backdrop-blur-2xl p-1 rounded-xl flex border border-white/[0.06]">
                                <button
                                    onClick={() => setViewMode('2d')}
                                    className={cn(
                                        "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                                        viewMode === '2d'
                                            ? "bg-white text-black shadow-lg"
                                            : "text-slate-600 hover:text-white"
                                    )}
                                >2D</button>
                                <button
                                    onClick={() => setViewMode('3d')}
                                    className={cn(
                                        "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                                        viewMode === '3d'
                                            ? "bg-white text-black shadow-lg"
                                            : "text-slate-600 hover:text-white"
                                    )}
                                >3D</button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Intel Tooltip */}
                <IntelTooltip info={hoverInfo} />

                {/* AI Click Prediction HUD */}
                <AnimatePresence>
                    {clickPred && cinematicEntry && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30"
                        >
                            <div className="bg-[#0a0e1a]/90 backdrop-blur-2xl p-4 rounded-3xl border border-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.6)] w-[360px] relative overflow-hidden">
                                {/* Close Button */}
                                <button
                                    onClick={() => setClickPred(null)}
                                    className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
                                >
                                    <EyeOff size={14} />
                                </button>

                                {clickPred.error ? (
                                    <div className="flex flex-col items-center justify-center p-4 text-center">
                                        <ShieldCheck size={24} className="text-rose-500 mb-2" />
                                        <p className="text-xs font-bold text-rose-400 uppercase tracking-widest">{clickPred.error}</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                                                <Brain size={14} className="text-cyan-400" />
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Real-Time AI Valuation</p>
                                                {/* Coordinates row */}
                                                <p className="text-[10px] font-mono text-slate-500 tracking-tight">
                                                    {clickPred.lat.toFixed(4)}&deg;N &thinsp;{clickPred.lng.toFixed(4)}&deg;E
                                                </p>
                                                {/* Reverse-geocoded address */}
                                                <div className="mt-1 flex items-start gap-1.5">
                                                    <MapPin size={10} className="text-cyan-400 mt-0.5 shrink-0" />
                                                    {clickGeoLoading ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <Loader2 size={10} className="animate-spin text-slate-500" />
                                                            <span className="text-[10px] text-slate-500">Fetching address...</span>
                                                        </div>
                                                    ) : clickAddress ? (
                                                        <p className="text-[11px] font-semibold text-white leading-tight">{clickAddress}</p>
                                                    ) : (
                                                        <p className="text-[10px] text-slate-500 italic">Address unavailable</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="bg-white/[0.02] p-3 rounded-2xl border border-white/[0.04]">
                                                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Ward</p>
                                                    <p className="text-sm font-bold text-slate-300">{clickPred.ward}</p>
                                                </div>
                                                <div className="bg-white/[0.02] p-3 rounded-2xl border border-white/[0.04]">
                                                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Zone Type</p>
                                                    <p className={cn(
                                                        "text-sm font-bold",
                                                        clickPred.zone === 'CBD' ? 'text-amber-400' :
                                                            clickPred.zone === 'Premium' ? 'text-cyan-400' :
                                                                'text-emerald-400'
                                                    )}>{clickPred.zone}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-end justify-between border-t border-white/[0.06] pt-4">
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Predicted Value</p>
                                                    <h3 className="text-2xl font-black text-white tracking-tighter">
                                                        ₹{clickPred.price_sqft.toLocaleString('en-IN')} <span className="text-xs text-slate-500">/sqft</span>
                                                    </h3>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Valuation</p>
                                                    <div className="flex items-center gap-2 justify-end">
                                                        <input
                                                            type="number"
                                                            value={clickArea}
                                                            onChange={(e) => setClickArea(e.target.value)}
                                                            className="w-16 bg-white/[0.05] border border-white/[0.1] rounded text-[10px] font-bold text-white px-2 py-1 text-center focus:outline-none focus:border-cyan-500/50 transition-colors"
                                                            placeholder="Sqft"
                                                        />
                                                        <span className="text-xs text-slate-600">sqft</span>
                                                    </div>
                                                    <p className="text-lg font-bold text-emerald-400 mt-1">
                                                        {formatCurrencyCompact(clickPred.price_sqft * (Number(clickArea) || 0))}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* AI Click Loading State */}
                <AnimatePresence>
                    {clickLoading && cinematicEntry && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30"
                        >
                            <div className="bg-[#0a0e1a]/90 backdrop-blur-2xl px-6 py-4 rounded-2xl border border-white/[0.08] flex items-center gap-3">
                                <Scan size={16} className="text-cyan-500 animate-[spin_3s_linear_infinite]" />
                                <span className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.2em] animate-pulse">Running Geometrics...</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Error State */}
                {mapError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#030508] gap-6 z-50">
                        <div className="relative">
                            <div className="absolute inset-0 bg-cyan-500/20 blur-2xl animate-pulse" />
                            <div className="w-20 h-20 rounded-[2rem] bg-white/[0.02] border border-white/[0.08] flex items-center justify-center relative z-10">
                                <Navigation2 size={32} className="text-slate-700" />
                            </div>
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="text-lg font-black text-white uppercase tracking-[0.2em]">Map Engine Offline</h3>
                            <p className="text-slate-500 text-sm font-medium max-w-xs">
                                MapLibre GL engine failed to initialize. Check console for details.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
