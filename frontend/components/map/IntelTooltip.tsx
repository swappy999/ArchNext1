'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, MapPin, Zap, BarChart3 } from 'lucide-react'

interface IntelTooltipProps {
    info: {
        x: number
        y: number
        object: any | null
        layer: string
    } | null
}

export default function IntelTooltip({ info }: IntelTooltipProps) {
    if (!info?.object) return null

    const data = info.object
    const isProperty = info.layer === 'properties'
    const isZone = info.layer === 'zones'

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 4 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="fixed z-[100] pointer-events-none"
                style={{
                    left: info.x + 16,
                    top: info.y - 16,
                }}
            >
                <div className="relative min-w-[200px] max-w-[280px]">
                    {/* Glow background */}
                    <div className="absolute -inset-1 bg-cyan-500/10 blur-xl rounded-2xl" />

                    {/* Glass panel */}
                    <div className="relative rounded-xl border border-white/[0.1] bg-[#0a0e1a]/90 backdrop-blur-xl p-4 shadow-[0_8px_40px_rgba(0,0,0,0.6)]">
                        {/* Top highlight */}
                        <div className="absolute top-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />

                        {(isProperty || data.is_grid) && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-cyan-500/15 flex items-center justify-center">
                                        <MapPin size={12} className="text-cyan-400" />
                                    </div>
                                    <span className="text-[9px] font-black text-cyan-400 uppercase tracking-[0.15em]">{data.is_grid ? `AI Synthesis: Ward ${data.ward || '??'}` : (data.name || 'Property Node')}</span>
                                </div>

                                <div className="space-y-1.5">
                                    {/* Traditional Price Index */}
                                    <div className="flex justify-between items-center bg-white/[0.03] p-1.5 rounded-lg mb-2 border border-white/[0.05]">
                                        <span className="text-[9px] text-zinc-500 font-black uppercase">Market Value</span>
                                        <span className="text-xs font-black text-emerald-400">
                                            ₹{Math.round(data.price || data.price_index || 0).toLocaleString('en-IN')}
                                        </span>
                                    </div>

                                    {/* AI Parameters Grid */}
                                    <div className="grid grid-cols-2 gap-2 pb-2">
                                        <div className="bg-white/[0.02] p-2 rounded-lg border border-white/[0.03]">
                                            <p className="text-[7px] text-zinc-600 font-black uppercase mb-1">Infrastructure</p>
                                            <div className="h-1 w-full bg-white/[0.05] rounded-full overflow-hidden">
                                                <div className="h-full bg-cyan-500" style={{ width: `${(data.infra_score || 0) * 100}%` }} />
                                            </div>
                                        </div>
                                        <div className="bg-white/[0.02] p-2 rounded-lg border border-white/[0.03]">
                                            <p className="text-[7px] text-zinc-600 font-black uppercase mb-1">Mobility</p>
                                            <div className="h-1 w-full bg-white/[0.05] rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500" style={{ width: `${(data.access_score || 0) * 100}%` }} />
                                            </div>
                                        </div>
                                        <div className="bg-white/[0.02] p-2 rounded-lg border border-white/[0.03]">
                                            <p className="text-[7px] text-zinc-600 font-black uppercase mb-1">Demand</p>
                                            <div className="h-1 w-full bg-white/[0.05] rounded-full overflow-hidden">
                                                <div className="h-full bg-amber-500" style={{ width: `${(data.demand_score || 0) * 100}%` }} />
                                            </div>
                                        </div>
                                        <div className="bg-white/[0.02] p-2 rounded-lg border border-white/[0.03]">
                                            <p className="text-[7px] text-zinc-600 font-black uppercase mb-1">CBD Proximity</p>
                                            <div className="h-1 w-full bg-white/[0.05] rounded-full overflow-hidden">
                                                <div className="h-full bg-indigo-500" style={{ width: `${(data.cbd_score || 0) * 100}%` }} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Meta Tags */}
                                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/[0.05]">
                                        <span className="text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                            {data.zone || 'GROWTH'}
                                        </span>
                                        {data.river_score > 0.4 && (
                                            <span className="text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                RIVERFRONT
                                            </span>
                                        )}
                                        {!data.is_grid && (
                                            <span className="text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                VERIFIED
                                            </span>
                                        )}
                                        {data.is_nft === 1.0 && (
                                            <span className="text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                {data.chain ? `${data.chain.toUpperCase()} NFT` : 'NFT'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {isZone && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                                        <BarChart3 size={12} className="text-indigo-400" />
                                    </div>
                                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.15em]">Ward Intelligence</span>
                                </div>
                                <div className="space-y-2">
                                    {data.name && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] text-zinc-500 font-medium">Ward</span>
                                            <span className="text-xs font-bold text-white">{data.name}</span>
                                        </div>
                                    )}
                                    {data.thermal_index !== undefined && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] text-zinc-500 font-medium">Thermal Index</span>
                                            <span className="text-xs font-bold text-cyan-400 flex items-center gap-1">
                                                <Zap size={10} /> {data.thermal_index}
                                            </span>
                                        </div>
                                    )}
                                    {data.growth_score !== undefined && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] text-zinc-500 font-medium">Market Pulse</span>
                                            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                                                <TrendingUp size={10} /> {data.growth_score}%
                                            </span>
                                        </div>
                                    )}
                                    {data.count !== undefined && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] text-zinc-500 font-medium">Property Nodes</span>
                                            <span className="text-xs font-bold text-white">{data.count}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {!isProperty && !isZone && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-amber-500/15 flex items-center justify-center">
                                        <Zap size={12} className="text-amber-400" />
                                    </div>
                                    <span className="text-[9px] font-black text-amber-400 uppercase tracking-[0.15em]">Intelligence</span>
                                </div>
                                {data.weight && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-zinc-500 font-medium">Intensity</span>
                                        <span className="text-xs font-bold text-white">{(data.weight * 100).toFixed(0)}%</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
