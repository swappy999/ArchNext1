'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Building2, Layers, Search, Grid, List, ExternalLink, MapPin, Activity, ArrowRight, Fingerprint } from 'lucide-react'
import { usePropertyStore } from '@/store/propertyStore'
import { formatCurrency, cn } from '@/lib/utils'
import Link from 'next/link'

import { PropertyCard } from '@/components/cards/PropertyCard'

export default function PropertiesPage() {
    const { properties, loading, fetchProperties } = usePropertyStore()
    const [view, setView] = useState<'grid' | 'list'>('grid')
    const [search, setSearch] = useState('')

    useEffect(() => { fetchProperties() }, [])

    const filtered = properties.filter((p: any) =>
        (p.title || p.address || '').toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="space-y-12">
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 px-2">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_10px_#06b6d4] animate-pulse" />
                        <span className="text-[11px] font-black text-cyan-500 uppercase tracking-[0.3em]">Property Database</span>
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-5xl font-black text-white tracking-tighter text-gradient leading-none">Property Index</h1>
                        <p className="text-slate-400 max-w-xl text-lg font-medium">Monitoring {properties.length} active property assets available in the network.</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="relative group/search w-full md:w-64">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/search:text-cyan-400 transition-colors" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="SEARCH PROPERTIES..."
                            className="h-12 pl-12 pr-6 w-full rounded-2xl bg-[#05070A]/50 glass-panel border border-white/[0.06] text-[11px] font-black tracking-[0.1em] text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                        />
                    </div>
                    <div className="flex p-1 rounded-[1.25rem] bg-[#05070A]/50 glass-panel border border-white/[0.06]">
                        <button
                            onClick={() => setView('grid')}
                            className={cn(
                                "w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-300",
                                view === 'grid' ? "bg-white text-black shadow-xl" : "text-slate-600 hover:text-slate-400"
                            )}
                        ><Grid size={18} /></button>
                        <button
                            onClick={() => setView('list')}
                            className={cn(
                                "w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-300",
                                view === 'list' ? "bg-white text-black shadow-xl" : "text-slate-600 hover:text-slate-400"
                            )}
                        ><List size={18} /></button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className={cn(
                    "grid gap-8",
                    view === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
                )}>
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className={cn(
                            "rounded-[2.5rem] glass-panel bg-white/[0.02] animate-pulse relative overflow-hidden",
                            view === 'grid' ? "h-[420px]" : "h-24"
                        )}>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent animate-shimmer" />
                        </div>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-40 glass-panel rounded-[3rem] border-dashed border-white/[0.06]">
                    <div className="w-24 h-24 rounded-full bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mb-8 relative">
                        <Building2 size={40} className="text-slate-800" />
                        <div className="absolute inset-0 border border-cyan-500/10 rounded-full animate-pulse" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-300 tracking-tight uppercase tracking-widest">No Properties Found</h2>
                    <p className="text-slate-500 mt-2 max-w-xs text-center font-medium">No active property assets match your search criteria.</p>
                    <button
                        onClick={() => setSearch('')}
                        className="mt-10 px-8 py-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-[11px] font-black text-cyan-400 uppercase tracking-[0.15em] hover:bg-cyan-500/10 hover:border-cyan-500/20 transition-all"
                    >
                        Reset Search
                    </button>
                </div>
            ) : (
                <div className={cn(
                    "gap-8",
                    view === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "flex flex-col"
                )}>
                    {filtered.map((p: any, i) => (
                        <PropertyCard key={p.id || i} property={p} view={view} index={i} />
                    ))}
                </div>
            )}
        </div>
    )
}

