import { motion } from 'framer-motion'
import { Building2, MapPin, Activity, ArrowRight, Fingerprint, Shield, Cpu, TrendingUp } from 'lucide-react'
import { formatCurrency, shortAddress, cn, formatAddress } from '@/lib/utils'
import Link from 'next/link'

export function PropertyCard({ property, view, index }: { property: any; view: 'grid' | 'list'; index: number }) {
    const status = property.status || 'draft'

    const statusConfig: Record<string, { label: string, color: string, border: string, bg: string }> = {
        draft:    { label: 'Draft',       color: 'text-slate-400',  border: 'border-slate-500/30',  bg: 'bg-slate-500/10' },
        verified: { label: 'Verified',    color: 'text-cyan-400',   border: 'border-cyan-500/30',   bg: 'bg-cyan-500/10' },
        minted:   { label: 'Minted',      color: 'text-blue-400',   border: 'border-blue-500/30',   bg: 'bg-blue-500/10' },
        owned:    { label: 'Owned',       color: 'text-emerald-400',border: 'border-emerald-500/30',bg: 'bg-emerald-500/10' },
        listed:   { label: 'For Sale',    color: 'text-amber-400',  border: 'border-amber-500/30',  bg: 'bg-amber-500/10' },
        auction:  { label: 'Auction Live',color: 'text-purple-400', border: 'border-purple-500/30', bg: 'bg-purple-500/10' },
        sold:     { label: 'Sold',        color: 'text-rose-500',   border: 'border-rose-500/30',   bg: 'bg-rose-500/20' },
    }

    const config = statusConfig[status] || statusConfig.draft
    const isSoldOrDraft = status === 'sold' || status === 'draft'
    const priceLabel = property.price_listed_matic ? `${property.price_listed_matic} POL` : formatCurrency(property.price || 0)

    // ─── List View ────────────────────────────────────────────────────────────
    if (view === 'list') {
        return (
            <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.04 }}
                className={cn(
                    "group flex flex-col sm:flex-row sm:items-center gap-4 p-4 sm:p-5 rounded-xl bg-[var(--background)]/80 border border-[var(--border)] hover:border-cyan-500/25 transition-all duration-300",
                    isSoldOrDraft && "opacity-70"
                )}
            >
                {/* Icon */}
                <div className="w-12 h-12 shrink-0 rounded-xl bg-[var(--background)]/90 border border-[var(--border)] flex items-center justify-center group-hover:border-cyan-500/30 transition-colors">
                    <Building2 size={20} className={cn("transition-colors", isSoldOrDraft ? "text-slate-700" : "text-slate-600 group-hover:text-cyan-400")} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-sm font-bold text-white truncate">{property.title || property.address}</p>
                        {property.nft_token_id != null && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/25 text-blue-400 uppercase tracking-widest">
                                <Fingerprint size={9} /> #{property.nft_token_id}
                            </span>
                        )}
                        <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-md border uppercase tracking-widest", config.bg, config.border, config.color)}>
                            {config.label}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                        <MapPin size={10} className="text-cyan-500/50 shrink-0" />
                        <span className="truncate">{formatAddress(property.address, property.ward) || property.area || property.location?.city || 'Kolkata'}</span>
                    </div>
                </div>

                {/* Price & scores */}
                <div className="flex items-center gap-6 shrink-0">
                    <div className="text-right hidden sm:block">
                        <p className="text-base font-black text-white group-hover:text-cyan-400 transition-colors">{priceLabel}</p>
                        <div className="flex items-center gap-2 justify-end mt-1">
                            <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400">
                                <Activity size={9} /> {property.investment_score?.toFixed(1) ?? '84.0'}
                            </span>
                            <span className="flex items-center gap-1 text-[9px] font-bold text-cyan-400">
                                <TrendingUp size={9} /> {property.growth_score?.toFixed(1) ?? '78.0'}
                            </span>
                        </div>
                    </div>
                    <Link href={`/properties/${property.id}`}>
                        <button className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/[0.03] border border-white/[0.07] hover:bg-cyan-500/10 hover:border-cyan-500/20 text-slate-500 hover:text-cyan-400 transition-all">
                            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                        </button>
                    </Link>
                </div>
            </motion.div>
        )
    }

    // ─── Grid View ────────────────────────────────────────────────────────────
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.35 }}
            className={cn(
                "group relative flex flex-col rounded-2xl bg-[var(--background)]/80 border border-[var(--border)] hover:border-cyan-500/25 transition-all duration-400 overflow-hidden glass-card",
                isSoldOrDraft && "opacity-75"
            )}
        >
            <Link href={`/properties/${property.id}`} className="flex flex-col h-full">
                {/* Image / Preview */}
                <div className="relative h-48 sm:h-52 bg-[var(--background)]/50 overflow-hidden">
                    <div className="absolute inset-0 grid-bg opacity-25 group-hover:opacity-40 transition-opacity duration-500" />

                    {(property.image_url || property.images?.[0]) ? (
                        <img
                            src={property.image_url || property.images[0]}
                            alt={property.title}
                            loading="lazy"
                            className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Building2 size={48} className="text-slate-800 group-hover:text-slate-700 transition-colors duration-500" />
                        </div>
                    )}

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F1A] via-[#0B0F1A]/30 to-transparent" />

                    {/* Top-left badges */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                        {property.nft_token_id != null && (
                            <span className="inline-flex items-center gap-1.5 text-[9px] font-black px-2.5 py-1 rounded-lg border border-blue-500/25 bg-blue-500/10 backdrop-blur-md text-blue-400 uppercase tracking-widest">
                                <Fingerprint size={10} /> #{property.nft_token_id}
                            </span>
                        )}
                        <span className={cn(
                            "inline-flex items-center gap-1.5 text-[9px] font-black px-2.5 py-1 rounded-lg border backdrop-blur-md uppercase tracking-widest",
                            config.bg, config.border, config.color
                        )}>
                            <Activity size={9} /> {config.label}
                        </span>
                    </div>

                    {/* Chain badge — top right */}
                    {(property.chain === 'algorand' || property.chain === 'polygon' || property.price_listed_matic > 0) && (
                        <div className="absolute top-3 right-3 z-10">
                            <span className={cn(
                                "text-[9px] font-black px-2.5 py-1 rounded-lg border backdrop-blur-md",
                                property.chain === 'algorand'
                                    ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400'
                                    : 'border-purple-500/25 bg-purple-500/10 text-purple-400'
                            )}>
                                {property.chain === 'algorand' ? 'Algorand' : 'Polygon'}
                            </span>
                        </div>
                    )}

                    {/* AI Verified ribbon on hover */}
                    {(property.verification_hash || property.is_verified) && (
                        <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-gradient-to-t from-[#05070A] to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-400 flex items-center justify-between z-10">
                            <span className="flex items-center gap-1.5 text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                                <Cpu size={11} /> AI Verified ✓
                            </span>
                            {property.investment_score && (
                                <span className="text-[9px] font-black text-cyan-400 flex items-center gap-1">
                                    <Activity size={9} /> {property.investment_score.toFixed(1)}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Card body */}
                <div className="flex flex-col flex-1 p-4 gap-3">
                    {/* Title & owner */}
                    <div>
                        <h3 className="text-sm font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                            {property.title || property.address || 'Property Asset'}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1">
                            <MapPin size={10} className="text-slate-600 shrink-0" />
                            <span className="text-[10px] text-slate-500 truncate">
                                {formatAddress(property.address, property.ward) || property.area || property.location?.city || 'Kolkata'}
                            </span>
                        </div>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/[0.04]">
                        <div className="bg-white/[0.02] rounded-lg p-2.5 border border-white/[0.04]">
                            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1">Price</p>
                            <p className="text-xs font-black text-white truncate">{priceLabel}</p>
                        </div>
                        <div className="bg-white/[0.02] rounded-lg p-2.5 border border-white/[0.04]">
                            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1">Growth</p>
                            <p className="text-xs font-black text-emerald-400 flex items-center gap-1">
                                <TrendingUp size={10} />
                                {property.growth_score !== undefined ? property.growth_score : '8.4'}
                            </p>
                        </div>
                    </div>

                    {/* Owner row + CTA */}
                    <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                                <Shield size={9} className="text-cyan-400" />
                            </div>
                            <span className="text-[9px] text-slate-500 truncate max-w-[100px]">
                                {property.owner?.name || (property.owner_id ? shortAddress(property.owner_id) : 'ArchNext')}
                            </span>
                        </div>
                        <div className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl bg-white/[0.02] border border-white/[0.07] group-hover:bg-cyan-500/10 group-hover:border-cyan-500/20 transition-all">
                            <ArrowRight size={14} className="text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                        </div>
                    </div>
                </div>
            </Link>
        </motion.div>
    )
}
