'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Building2, Layers, Search, Grid, List, ExternalLink, MapPin, Activity, ArrowRight, Fingerprint, Filter, RefreshCw, X } from 'lucide-react'
import { usePropertyStore } from '@/store/propertyStore'
import { useSearchStore } from '@/store/searchStore'
import { useMapStore } from '@/store/mapStore'
import { formatCurrency, cn } from '@/lib/utils'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'

import { PropertyCard } from '@/components/cards/PropertyCard'

function PropertiesContent() {
    const searchParams = useSearchParams()
    const urlQuery = searchParams.get('q') || ''
    const router = useRouter()
    
    const { properties, loading, fetchProperties } = usePropertyStore()
    const { query, setQuery, isSearching } = useSearchStore()
    const { setSelectedProperty } = useMapStore()
    
    // UI State
    const [view, setView] = useState<'grid' | 'list'>('grid')
    const [showFilters, setShowFilters] = useState(false)
    
    // Filter State
    const [priceMin, setPriceMin] = useState<string>('')
    const [priceMax, setPriceMax] = useState<string>('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'auction' | 'sold'>('all')
    const [typeFilter, setTypeFilter] = useState<'all' | 'nft' | 'standard'>('all')
    const [onlyVerified, setOnlyVerified] = useState(false)

    useEffect(() => { 
        fetchProperties() 
        if (urlQuery) setQuery(urlQuery, properties)
    }, [urlQuery, properties.length])

    // Listen for Archbot filter events
    useEffect(() => {
        const handleArchBotFilters = (e: any) => {
             const filters = e.detail;
             if (filters.priceMin) setPriceMin(filters.priceMin.toString())
             if (filters.priceMax) setPriceMax(filters.priceMax.toString())
             setShowFilters(true)
        }
        window.addEventListener('archbot:applyFilters', handleArchBotFilters)
        return () => window.removeEventListener('archbot:applyFilters', handleArchBotFilters)
    }, [])

    const filtered = useMemo(() => {
        let result = [...properties]
        
        // 1. Search Query
        if (query.trim()) {
            const term = query.toLowerCase()
            result = result.filter((p: any) => 
                (p.title || p.property_title || '').toLowerCase().includes(term) ||
                (p.address || '').toLowerCase().includes(term) ||
                (p.ward?.toString() || '').includes(term)
            )
        }

        // 2. Price Range
        if (priceMin) {
            const min = parseFloat(priceMin)
            if (!isNaN(min)) result = result.filter(p => (p.price || 0) >= min)
        }
        if (priceMax) {
            const max = parseFloat(priceMax)
            if (!isNaN(max)) result = result.filter(p => (p.price || 0) <= max)
        }

        // 3. Status
        if (statusFilter !== 'all') {
            if (statusFilter === 'available') result = result.filter(p => p.status === 'listed')
            else result = result.filter(p => p.status === statusFilter)
        }

        // 4. Type
        if (typeFilter === 'nft') result = result.filter(p => p.is_nft)
        if (typeFilter === 'standard') result = result.filter(p => !p.is_nft)

        // 5. Verification
        if (onlyVerified) result = result.filter(p => p.is_verified || p.ai_valuation)

        return result
    }, [properties, query, priceMin, priceMax, statusFilter, typeFilter, onlyVerified])

    const activeFilterCount = (priceMin ? 1 : 0) + (priceMax ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0) + (typeFilter !== 'all' ? 1 : 0) + (onlyVerified ? 1 : 0)

    const resetFilters = () => {
        setPriceMin('')
        setPriceMax('')
        setStatusFilter('all')
        setTypeFilter('all')
        setOnlyVerified(false)
        setQuery('', properties)
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
                <div className="space-y-2">
                    <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_#06b6d4] animate-pulse" />
                        <span className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.25em]">Property Database</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tighter text-gradient leading-none">Property Index</h1>
                    <p className="text-slate-400 max-w-xl text-sm sm:text-base font-medium">Monitoring {properties.length} active property assets on the network.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative group/search flex-1 sm:w-64 shrink-0">
                        {isSearching ? (
                            <Activity size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400 animate-pulse" />
                        ) : (
                            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/search:text-cyan-400 transition-colors" />
                        )}
                        <input
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value, properties)}
                            placeholder="Search properties..."
                            className="h-10 pl-10 pr-4 w-full rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/40 transition-all"
                        />
                    </div>
                    
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={cn(
                            "h-10 px-4 flex items-center gap-2 rounded-xl border transition-all text-sm font-semibold shrink-0",
                            showFilters || activeFilterCount > 0
                                ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                                : "bg-white/[0.04] border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.06]"
                        )}
                    >
                        <Filter size={14} />
                        Filters
                        {activeFilterCount > 0 && (
                            <span className="w-5 h-5 rounded-md bg-cyan-500 text-black flex items-center justify-center text-[10px] font-black ml-1 absolute -top-2 -right-2 sm:relative sm:top-0 sm:right-0">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>

                    <div className="hidden sm:flex p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] shrink-0">
                        <button
                            onClick={() => setView('grid')}
                            className={cn(
                                "w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200",
                                view === 'grid' ? "bg-white text-black shadow" : "text-slate-600 hover:text-slate-300"
                            )}
                        ><Grid size={14} /></button>
                        <button
                            onClick={() => setView('list')}
                            className={cn(
                                "w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200",
                                view === 'list' ? "bg-white text-black shadow" : "text-slate-600 hover:text-slate-300"
                            )}
                        ><List size={14} /></button>
                    </div>
                </div>
            </div>

            {/* Advanced Filters Panel */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-5 glass-card rounded-2xl border border-white/[0.06] grid grid-cols-1 md:grid-cols-4 gap-6">
                            
                            {/* Price */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Price Range (INR)</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={priceMin}
                                        onChange={e => setPriceMin(e.target.value)}
                                        placeholder="Min"
                                        className="w-full h-9 px-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white focus:border-cyan-500/40 focus:outline-none"
                                    />
                                    <span className="text-slate-600">-</span>
                                    <input
                                        type="number"
                                        value={priceMax}
                                        onChange={e => setPriceMax(e.target.value)}
                                        placeholder="Max"
                                        className="w-full h-9 px-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white focus:border-cyan-500/40 focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Status */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Status</label>
                                <select 
                                    value={statusFilter}
                                    onChange={e => setStatusFilter(e.target.value as any)}
                                    className="w-full h-9 px-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white focus:border-cyan-500/40 focus:outline-none appearance-none cursor-pointer"
                                >
                                    <option value="all" className="bg-[var(--background)]">All Statuses</option>
                                    <option value="available" className="bg-[var(--background)]">Available (Listed)</option>
                                    <option value="auction" className="bg-[var(--background)]">Live Auction</option>
                                    <option value="sold" className="bg-[var(--background)]">Sold</option>
                                </select>
                            </div>

                            {/* Type */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Asset Type</label>
                                <select 
                                    value={typeFilter}
                                    onChange={e => setTypeFilter(e.target.value as any)}
                                    className="w-full h-9 px-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white focus:border-cyan-500/40 focus:outline-none appearance-none cursor-pointer"
                                >
                                    <option value="all" className="bg-[var(--background)]">All Types</option>
                                    <option value="nft" className="bg-[var(--background)]">Blockchain NFT</option>
                                    <option value="standard" className="bg-[var(--background)]">Standard Digital</option>
                                </select>
                            </div>

                            {/* Toggles & Actions */}
                            <div className="space-y-3 flex flex-col justify-end">
                                <label className="flex items-center gap-3 cursor-pointer group h-9">
                                    <div className={cn(
                                        "w-5 h-5 rounded-md border flex items-center justify-center transition-colors",
                                        onlyVerified ? "bg-emerald-500 border-emerald-500" : "bg-white/[0.03] border-white/[0.08] group-hover:border-slate-500"
                                    )}>
                                        {onlyVerified && <X size={12} className="text-black rotate-45" />}
                                    </div>
                                    <span className="text-sm font-semibold text-slate-300">AI Verified Only</span>
                                </label>
                                
                                {activeFilterCount > 0 && (
                                    <button 
                                        onClick={resetFilters}
                                        className="text-[11px] font-bold text-slate-500 hover:text-rose-400 uppercase tracking-widest text-left mt-2 flex items-center gap-1.5 transition-colors"
                                    >
                                        <RefreshCw size={12} /> Reset all filters
                                    </button>
                                )}
                            </div>

                        </div>
                    </motion.div>
                )}
            </AnimatePresence>


            {loading ? (
                <div className={cn(
                    "grid gap-5",
                    view === 'grid' ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
                )}>
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className={cn(
                            "rounded-2xl skeleton",
                            view === 'grid' ? "h-[380px]" : "h-20"
                        )} />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 bg-[var(--background)]/20 rounded-2xl border border-dashed border-[var(--border)]">
                    <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mb-6 relative">
                        <Building2 size={28} className="text-slate-800" />
                        <div className="absolute inset-0 border border-cyan-500/10 rounded-2xl animate-pulse" />
                    </div>
                    <h2 className="text-lg font-black text-slate-400 tracking-tight">No Properties Found</h2>
                    <p className="text-slate-600 mt-1 text-sm font-medium max-w-xs text-center">No assets match your search criteria.</p>
                    <button
                        onClick={resetFilters}
                        className="mt-8 px-6 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.07] text-sm font-bold text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/20 transition-all"
                    >
                        Clear Filters
                    </button>
                </div>
            ) : (
                <div className={cn(
                    "gap-5",
                    view === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "flex flex-col"
                )}>
                    {filtered.map((p: any, i) => (
                        <div key={p.id || i} onClick={() => {
                            if (p.longitude && p.latitude) {
                                setSelectedProperty(p.id, p.longitude, p.latitude)
                                // Only route if we are in desktop view where map might be side-by-side or useful
                                router.push('/map')
                            }
                        }}>
                           <PropertyCard property={p} view={view} index={i} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default function PropertiesPage() {
    return (
        <Suspense fallback={<div className="h-96 skeleton rounded-2xl"></div>}>
            <PropertiesContent />
        </Suspense>
    )
}

