import { motion } from 'framer-motion'
import { Building2, MapPin, Activity, ArrowRight, Fingerprint, Shield, Cpu } from 'lucide-react'
import { formatCurrency, shortAddress, cn } from '@/lib/utils'
import Link from 'next/link'

export function PropertyCard({ property, view, index }: { property: any; view: 'grid' | 'list'; index: number }) {
    const status = property.status || 'draft'

    // Status visual mapping
    const statusConfig: Record<string, { label: string, color: string, border: string, bg: string }> = {
        draft: { label: 'DRAFT', color: 'text-slate-400', border: 'border-slate-500/30', bg: 'bg-slate-500/10' },
        verified: { label: 'VERIFIED', color: 'text-cyan-400', border: 'border-cyan-500/30', bg: 'bg-cyan-500/10' },
        minted: { label: 'MINTED', color: 'text-blue-400', border: 'border-blue-500/30', bg: 'bg-blue-500/10' },
        owned: { label: 'OWNED', color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10' },
        listed: { label: 'LISTED (SALE)', color: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/10' },
        auction: { label: 'AUCTION (LIVE)', color: 'text-purple-400', border: 'border-purple-500/30', bg: 'bg-purple-500/10' },
        sold: { label: 'SOLD', color: 'text-rose-500', border: 'border-rose-500/30', bg: 'bg-rose-500/20' }
    }

    const config = statusConfig[status] || statusConfig.draft
    const isSoldOrDraft = status === 'sold' || status === 'draft'

    if (view === 'list') {
        return (
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                    "group flex items-center gap-6 p-5 rounded-2xl bg-[#0B0F1A]/80 backdrop-blur-md border border-white/[0.04] hover:border-cyan-500/30 transition-all duration-300",
                    isSoldOrDraft && "grayscale-[0.4] opacity-80"
                )}
            >
                <div className="w-14 h-14 rounded-xl bg-[#05070A] border border-white/[0.06] flex items-center justify-center shrink-0 group-hover:border-cyan-500/40 relative overflow-hidden overflow-hidden">
                    <Building2 size={22} className={cn("text-slate-600 transition-colors", !isSoldOrDraft && "group-hover:text-cyan-400")} />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                        <p className="text-base font-bold text-white truncate">{property.title || property.address}</p>
                        {property.nft_token_id !== undefined && property.nft_token_id !== null && (
                            <span className="text-[8px] font-black px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400 uppercase tracking-widest flex items-center gap-1 shadow-sm">
                                <Fingerprint size={10} /> ID: #{property.nft_token_id}
                            </span>
                        )}
                        <span className={cn("text-[8px] font-black px-2 py-0.5 rounded border uppercase tracking-widest shadow-sm", config.bg, config.border, config.color)}>
                            {config.label}
                        </span>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-1">
                        <span className="flex items-center gap-1.5 border-r border-white/5 pr-4">
                            <MapPin size={12} className="text-cyan-500/50" /> {property.area || property.location?.city || 'Kolkata'}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Shield size={12} className="text-emerald-500/50" />
                            Owner: <span className="text-white font-black ml-1">{property.owner?.name || (property.owner_id ? shortAddress(property.owner_id) : 'ArchNext')}</span>
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-8 shrink-0">
                    <div className="text-right">
                        <p className="text-lg font-black text-white group-hover:text-cyan-400 transition-colors tracking-tight">{property.price_listed_matic ? `${property.price_listed_matic} POL` : formatCurrency(property.price || 0)}</p>
                        <div className="flex flex-col items-end gap-1 mt-1">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                                <Activity size={10} /> Investment: {property.investment_score !== undefined ? property.investment_score.toFixed(1) : '84.0'}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-400 uppercase tracking-widest">
                                <Cpu size={10} /> Growth: {property.growth_score !== undefined ? property.growth_score.toFixed(1) : '78.0'}
                            </div>
                        </div>
                    </div>
                    <Link href={`/properties/${property.id}`}>
                        <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-cyan-500/10 hover:border-cyan-500/20 text-slate-500 hover:text-cyan-400 transition-all shadow-xl group/btn">
                            <ArrowRight size={18} className="group-hover/btn:translate-x-0.5 transition-transform" />
                        </button>
                    </Link>
                </div>
            </motion.div>
        )
    }

    // Grid View (Unified with Marketplace NFTCard style)
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
                "group relative flex flex-col rounded-[2.5rem] bg-[#0B0F1A]/80 backdrop-blur-md border border-white/[0.06] hover:border-cyan-500/30 transition-all duration-500 overflow-hidden",
                isSoldOrDraft && "grayscale-[0.4] opacity-80"
            )}
        >
            <Link href={`/properties/${property.id}`} className="block h-full cursor-pointer flex flex-col">
                <div className="relative h-48 bg-[#05070A] overflow-hidden flex items-center justify-center">
                    <div className="absolute inset-0 grid-bg opacity-30 group-hover:opacity-50 transition-opacity duration-500" />

                    {property.image_url || (property.images && property.images[0]) ? (
                        <img
                            src={property.image_url || property.images[0]}
                            alt={property.title}
                            className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                        />
                    ) : (
                        <div className="relative z-10 group-hover:scale-110 transition-transform duration-700">
                            <Building2 size={56} className="text-slate-700 group-hover:text-cyan-400 transition-colors duration-500" />
                        </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F1A] via-[#0B0F1A]/40 to-transparent" />

                    {/* Left Badges */}
                    <div className="absolute top-5 left-5 flex flex-col gap-2 z-20">
                        {property.nft_token_id !== undefined && property.nft_token_id !== null && (
                            <span className="text-[9px] font-black px-3 py-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 backdrop-blur-md text-blue-400 uppercase tracking-widest flex items-center gap-1.5 shadow-lg">
                                <Fingerprint size={12} /> TOKEN #{property.nft_token_id}
                            </span>
                        )}
                        {(property.chain === 'algorand') ? (
                            <span className="text-[9px] font-black px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-md text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 shadow-lg">
                                Algorand TestNet
                            </span>
                        ) : (property.chain === 'polygon' || property.price_listed_matic > 0) && (
                            <span className="text-[9px] font-black px-3 py-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 backdrop-blur-md text-purple-400 uppercase tracking-widest flex items-center gap-1.5 shadow-lg">
                                Polygon Amoy
                            </span>
                        )}
                        <span className={cn(
                            "text-[9px] font-black px-3 py-1.5 rounded-xl border backdrop-blur-md uppercase tracking-widest shadow-lg flex items-center gap-1.5",
                            config.bg, config.border, config.color
                        )}>
                            <Activity size={10} /> {config.label}
                        </span>
                    </div>

                    {/* AI Verified Ribbon (if applicable) */}
                    {(property.verification_hash || property.is_verified) && (
                        <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-[#05070A] via-[#05070A]/80 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-500 flex items-center justify-between z-20">
                            <div className="flex items-center gap-2">
                                <Cpu size={14} className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest drop-shadow-md">AI VERIFIED ✓</span>
                            </div>
                            {property.investment_score && (
                                <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1 bg-cyan-500/10 px-2 py-1 rounded-md border border-cyan-500/20">
                                    <Activity size={10} /> Score: {property.investment_score.toFixed(1)}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-6 flex flex-col gap-4 flex-1 relative z-10">
                    <div className="space-y-2">
                        <h3 className="text-lg font-black text-white truncate tracking-tight group-hover:text-cyan-400 transition-colors">
                            {property.title || property.address || 'Property Asset'}
                        </h3>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                                    <Shield size={10} className="text-cyan-400" />
                                </div>
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-wide truncate">
                                    {property.owner?.name || (property.owner_id ? shortAddress(property.owner_id) : 'System Owner')}
                                </span>
                            </div>
                            <span className="text-[8px] font-mono text-slate-600 uppercase">
                                {property.owner?.wallet ? shortAddress(property.owner.wallet) : (property.owner_id ? shortAddress(property.owner_id) : '0xSECURE')}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-white/[0.04]">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="glass-panel p-3 rounded-xl border border-white/[0.06]">
                                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Valuation</p>
                                <p className="text-sm font-black text-white glow-text truncate">{property.price_listed_matic ? `${property.price_listed_matic} POL` : formatCurrency(property.price || 0)}</p>
                            </div>
                            <div className="glass-panel p-3 rounded-xl border border-white/[0.06]">
                                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Growth Score</p>
                                <p className="text-sm font-black text-emerald-400 flex items-center gap-1">
                                    <Activity size={12} /> {property.growth_score !== undefined ? property.growth_score : '8.4'}
                                </p>
                            </div>
                        </div>
                        {property.verification_score && (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Shield size={10} className="text-cyan-400" />
                                    <span className="text-[9px] font-bold text-slate-500">AI Confidence: <span className="text-cyan-400">{(property.verification_score * 100).toFixed(0)}%</span></span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-end pt-2 mt-auto">
                        <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.02] border border-white/[0.08] group-hover:bg-cyan-50 hover:shadow-cyan-500/20 transition-all duration-300">
                            <ArrowRight size={18} className="text-slate-600 group-hover:text-black transition-colors" />
                        </div>
                    </div>
                </div>
            </Link>
        </motion.div>
    )
}
