'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
    ShoppingBag, Wallet, Loader2, Building2, Fingerprint,
    Cpu, Gavel, TrendingUp, Brain, Shield, Flame, CheckCircle2,
    Activity, Search, SlidersHorizontal, RefreshCw
} from 'lucide-react'
import { useMarketplaceStore } from '@/store/marketplaceStore'
import { useAuthStore } from '@/store/authStore'
import { useAuctionStore } from '@/store/auctionStore'
import { useSearchStore } from '@/store/searchStore'
import { formatCurrency, shortAddress, cn, formatAddress } from '@/lib/utils'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Toaster, toast } from 'react-hot-toast'
import { AnimatePresence } from 'framer-motion'
import { parseBlockchainError } from '@/store/walletStore'

// ─── AI Valuation Badge ──────────────────────────────────────────────────────
function AIValuationBadge({ valuation }: { valuation: any }) {
    if (!valuation) return null
    const tierColors: Record<string, string> = {
        A: 'from-amber-500 to-orange-600 border-amber-500/30',
        B: 'from-cyan-500 to-blue-600 border-cyan-500/30',
        C: 'from-slate-500 to-slate-600 border-slate-500/30',
    }
    const tierColor = tierColors[valuation.market_tier] || tierColors.C

    return (
        <div className="space-y-3 pt-4 border-t border-[var(--border)]">
            <div className="flex items-center gap-2">
                <Brain size={12} className="text-cyan-400" />
                <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.1em]">Value Report</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="glass-panel p-3 rounded-xl border border-[var(--border)]">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Per Sq.Ft</p>
                    <p className="text-sm font-black text-white">₹ {valuation.predicted_price_per_sqft?.toLocaleString('en-IN')}</p>
                </div>
                <div className="glass-panel p-3 rounded-xl border border-[var(--border)]">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Est.</p>
                    <p className="text-sm font-black text-emerald-400">₹ {(valuation.total_estimated_value / 10000000)?.toFixed(2)} Cr</p>
                </div>
            </div>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Shield size={10} className="text-emerald-400" />
                    <span className="text-[9px] font-bold text-slate-300">Confidence: <span className="text-emerald-400">{valuation.confidence}%</span></span>
                </div>
                <span className={`text-[8px] font-black px-2 py-1 rounded-lg bg-gradient-to-r ${tierColor} text-white uppercase tracking-widest`}>
                    <span className="sr-only">Market Tier: </span>Zone {valuation.market_tier}
                </span>
            </div>
        </div>
    )
}

// ─── NFT Card ────────────────────────────────────────────────────────────────
function NFTCard({ listing, index }: { listing: any, index: number }) {
    const { buy, buyingId } = useMarketplaceStore()
    const userWallet = useAuthStore((s: any) => s.user?.wallet_address)?.toLowerCase()

    const isBuying = buyingId === listing.id
    const [buying, setBuying] = useState(false)
    const [showBidModal, setShowBidModal] = useState(false)
    const [bidAmount, setBidAmount] = useState('')
    const [bidSuccess, setBidSuccess] = useState(false)

    const isSold = listing.status === 'sold'
    const isOwner = listing.owner_id && userWallet && (listing.owner_id.toLowerCase() === userWallet || listing.seller?.toLowerCase() === userWallet)

    const handleBuy = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (isSold || isOwner) return
        try {
            await buy(listing.id)
        } catch (e: any) {
            console.error(e)
        }
    }

    const { placeBid, bidding, approving } = useAuctionStore()
    const handleBid = async (e: React.MouseEvent) => {
        e.stopPropagation()
        setShowBidModal(true)
    }

    const submitBid = async (e: React.FormEvent) => {
        e.preventDefault()
        const amount = parseFloat(bidAmount)
        if (!amount || isNaN(amount) || amount <= 0) {
            toast.error("Please enter a valid bid amount")
            return
        }
        
        try {
             await placeBid(listing.id, amount)
             setBidSuccess(true)
             toast.success("Bid placed successfully!")
             setTimeout(() => {
                 setShowBidModal(false)
                 setBidSuccess(false)
                 setBidAmount('')
             }, 2000)
        } catch (err: any) {
             toast.error(parseBlockchainError(err) || "Failed to place bid")
        }
    }

    return (
        <>
        <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.02, duration: 0.3 }}
            className={cn(
                "group relative flex flex-col rounded-[2.5rem] bg-[var(--background)]/80 backdrop-blur-md border border-[var(--border)] hover:border-cyan-500/30 transition-all duration-500 overflow-hidden",
                isSold && "grayscale-[0.5] opacity-80"
            )}
        >
            {/* Holographic Shimmer / Sold Overlay */}
            {isSold ? (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-[30] flex items-center justify-center p-6">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="px-6 py-3 rounded-2xl border-2 border-rose-500/50 bg-rose-500/10 text-rose-500 text-xl font-black uppercase tracking-[0.3em] rotate-[-12deg] shadow-[0_0_30px_rgba(244,63,94,0.3)]"
                    >
                        SOLD OUT
                    </motion.div>
                </div>
            ) : (
                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            )}

            {/* Visual Container */}
            <div className="relative h-56 bg-[var(--background)]/50 overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 grid-bg opacity-30 group-hover:opacity-50 transition-opacity duration-500" />

                {listing.image_url ? (
                    <img
                        src={listing.image_url}
                        alt={listing.title}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                    />
                ) : (
                    <div className="relative z-10 group-hover:scale-110 transition-transform duration-700">
                        <Building2 size={56} className="text-slate-700 group-hover:text-cyan-400 transition-colors duration-500 relative z-10" />
                    </div>
                )}

                {listing.image_url && <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)] via-[var(--background)]/40 to-transparent" />}

                {/* Status Badges */}
                <div className="absolute top-5 left-5 flex flex-col gap-2 z-20">
                    <span className="text-[10px] font-black px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--background)]/60 backdrop-blur-md text-slate-400 uppercase tracking-widest shadow-lg flex items-center gap-2">
                        {listing.status === 'auction' && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_#f43f5e]" />}
                        PROPERTY #{listing.token_id || listing.id?.slice(0, 6)}
                    </span>
                    {isOwner && (
                        <span className="text-[9px] font-black px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/20 backdrop-blur-md text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 shadow-lg">
                            <CheckCircle2 size={12} /> YOUR ASSET
                        </span>
                    )}
                    {listing.is_nft && !isOwner && (
                        <a
                            href={`https://amoy.polygonscan.com/token/0xe406730EF116B58F0C6007A276185803FF134706?a=${listing.token_id || listing.nft_token_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[9px] font-black px-3 py-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 backdrop-blur-md text-blue-400 uppercase tracking-widest flex items-center gap-1.5 shadow-lg hover:bg-blue-500/20 transition-all cursor-pointer"
                        >
                            <Fingerprint size={12} /> ON-CHAIN
                        </a>
                    )}
                    {(listing.chain === 'algorand') ? (
                        <span className="text-[9px] font-black px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-md text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 shadow-lg">
                            <Cpu size={12} /> Algorand TestNet
                        </span>
                    ) : (listing.chain === 'polygon' || listing.price_listed_matic > 0) && (
                        <span className="text-[9px] font-black px-3 py-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 backdrop-blur-md text-purple-400 uppercase tracking-widest flex items-center gap-1.5 shadow-lg">
                            <Cpu size={12} /> Polygon Amoy
                        </span>
                    )}
                </div>

                {/* Market Tier Badge */}
                {listing.ai_valuation && (
                    <div className="absolute top-5 right-5 z-20">
                        <div className={cn(
                            "text-[9px] font-black px-3 py-1.5 rounded-xl backdrop-blur-md uppercase tracking-widest shadow-lg flex items-center gap-1.5",
                            listing.ai_valuation.market_tier === 'A' ? 'border border-amber-500/30 bg-amber-500/10 text-amber-400' :
                                listing.ai_valuation.market_tier === 'B' ? 'border border-cyan-500/30 bg-cyan-500/10 text-cyan-400' :
                                    'border border-slate-500/30 bg-slate-500/10 text-slate-400'
                        )}>
                            <Flame size={10} aria-hidden="true" />
                            <span className="sr-only">AI Market Tier </span>
                            ZONE {listing.ai_valuation.market_tier}
                        </div>
                    </div>
                )}

                {/* Bottom Info Bar */}
                <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-[var(--background)] to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-500 flex items-center gap-3 z-20">
                    <Cpu size={14} className="text-emerald-400" />
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">AI Verified Asset</span>
                </div>
            </div>

            {/* Content Section */}
            <div className="p-6 flex flex-col gap-4 flex-1 relative z-10">
                <div className="space-y-2">
                    <Link href={`/properties/${listing.id}`} aria-label={`View details for ${listing.title || 'Property Asset'}`}>
                        <h3 className="text-lg font-black text-white truncate tracking-tight group-hover:text-cyan-400 transition-colors cursor-pointer">
                            {listing.title || listing.property_title || 'Property Asset'}
                        </h3>
                    </Link>
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-slate-400 uppercase">Location:</span>
                            <span className="text-[10px] font-black text-white truncate max-w-[200px]">
                                {formatAddress(listing.property?.address || listing.address, listing.property?.ward || listing.ward)}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-slate-400 uppercase">Owner:</span>
                            <span className="text-[10px] font-black text-white">{listing.owner?.name || 'Protocol'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-slate-400 uppercase">Wallet:</span>
                            <span className="text-[9px] font-bold text-cyan-500/80 font-mono tracking-tighter">
                                {listing.owner?.wallet ? shortAddress(listing.owner.wallet) : '0x...'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* AI Valuation Badge */}
                <AIValuationBadge valuation={listing.ai_valuation} />

                <div className="flex items-end justify-between pt-4 border-t border-[var(--border)] mt-auto">
                    <div className="flex-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
                            {listing.status === 'auction' ? 'Highest Bid' : 'Listed Price'}
                        </p>
                        <p className="text-xl font-black text-white tracking-tighter group-hover:text-cyan-400 transition-colors glow-text truncate pr-2">
                            {listing.price_listed_matic ? `${listing.price_listed_matic} POL` : formatCurrency(listing.price || 0)}
                        </p>
                    </div>

                    <div className="flex gap-2">
                        {listing.status === 'auction' ? (
                            <button
                                onClick={handleBid}
                                disabled={isOwner || isSold}
                                aria-disabled={isOwner || isSold}
                                className="px-4 py-3 rounded-xl bg-cyan-500 text-white text-[9px] font-black uppercase tracking-widest hover:bg-cyan-400 disabled:opacity-50"
                                aria-label="Place Bid on this Property"
                            >
                                <Gavel size={12} className="inline mr-2" />
                                Place Bid
                            </button>
                        ) : listing.status === 'listed' ? (
                            <button
                                onClick={handleBuy}
                                disabled={isBuying || buying || isSold || isOwner}
                                aria-disabled={isBuying || buying || isSold || isOwner}
                                className={cn(
                                    (isSold || isOwner) ? "bg-slate-800 text-slate-300 cursor-not-allowed" : "bg-white text-black hover:bg-cyan-50 hover:shadow-cyan-500/20"
                                )}
                                aria-label={isSold ? "Property Sold" : isOwner ? "Your Property" : "Buy Property Now"}
                            >
                                {(isBuying || buying) ? <Loader2 size={12} className="animate-spin" /> : <Wallet size={12} />}
                                <span className="relative z-10">
                                    {(isBuying || buying) ? 'PROCESSING' : isSold ? 'SOLD' : isOwner ? 'YOUR ASSET' : 'BUY NOW'}
                                </span>
                            </button>
                        ) : isOwner ? (
                            <Link href="/portfolio">
                                <button className="px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white text-[9px] font-black uppercase tracking-widest hover:bg-white/[0.08]">
                                    List Asset
                                </button>
                            </Link>
                        ) : (
                            <button disabled className="px-4 py-3 rounded-xl bg-slate-800 text-slate-400 text-[9px] font-black uppercase tracking-widest cursor-not-allowed">
                                Not for Sale
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>

        {/* Bid Modal For This Specific Card */}
        <AnimatePresence>
            {showBidModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => !bidding && setShowBidModal(false)}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="w-full max-w-lg bg-[var(--background)] border border-[var(--border)] rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden"
                    >
                         {bidding || bidSuccess ? (
                            <div className="absolute inset-0 z-20 bg-[var(--background)]/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
                                {bidSuccess ? (
                                    <motion.div 
                                        initial={{ scale: 0.5, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="flex flex-col items-center animate-success-pop"
                                    >
                                        <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                                            <CheckCircle2 size={40} className="text-emerald-500" />
                                        </div>
                                        <h3 className="text-2xl font-black text-white mb-2">Bid Confirmed!</h3>
                                        <p className="text-sm text-slate-400">Your bid has been recorded on the network.</p>
                                    </motion.div>
                                ) : (
                                    <>
                                        <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
                                        <h3 className="text-xl font-bold text-white mb-2">Processing Bid on Network</h3>
                                        <p className="text-sm text-slate-400 max-w-[250px]">
                                            {approving ? "Please approve the transaction in your wallet..." : "Mining your bid on the blockchain. This usually takes 10-15 seconds."}
                                        </p>
                                    </>
                                )}
                            </div>
                         ) : null}
                         <div className="flex items-center justify-between mb-8">
                             <div>
                                 <h3 className="text-2xl font-black text-white tracking-tight">Place Bid</h3>
                                 <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-bold">Auction #{listing.id}</p>
                             </div>
                             <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                                 <Gavel size={20} className="text-cyan-400" />
                             </div>
                         </div>
                         
                         <form onSubmit={submitBid} className="space-y-6">
                              <div>
                                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Bid Amount (ARCH)</label>
                                  <div className="relative">
                                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                      <input 
                                          type="number"
                                          step="0.01"
                                          min={listing.current_bid ? listing.current_bid + (listing.min_bid_increment || 1) : listing.reserve_price}
                                          value={bidAmount}
                                          onChange={e => setBidAmount(e.target.value)}
                                          placeholder={`Min ${listing.current_bid ? listing.current_bid + (listing.min_bid_increment || 1) : listing.reserve_price}`}
                                          className="w-full h-14 bg-[var(--background)] border border-[var(--border)] rounded-2xl pl-8 pr-4 text-lg font-black text-white focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all placeholder:text-slate-600"
                                      />
                                  </div>
                              </div>
                              <div className="flex gap-3 pt-4">
                                  <button
                                       type="button"
                                       onClick={() => setShowBidModal(false)}
                                       className="flex-1 py-4 rounded-2xl border border-white/[0.1] text-sm font-bold text-slate-300 hover:bg-white/[0.05] transition-colors"
                                  >
                                      Cancel
                                  </button>
                                  <button
                                       type="submit"
                                       disabled={!bidAmount || bidding}
                                       className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-bold shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 disabled:opacity-50 transition-all flex items-center justify-center"
                                  >
                                      Confirm Bid
                                  </button>
                              </div>
                         </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
        </>
    )
}

export default function MarketplacePage() {
    const { listings, loading, fetchListings, subscribeToUpdates, buy, buyingId } = useMarketplaceStore()
    const { query, setQuery, isSearching } = useSearchStore()

    const [filter, setFilter] = useState<'all' | 'nft' | 'standard'>('all')

    // Advanced Filters
    const [showFilters, setShowFilters] = useState(false)
    const [priceMin, setPriceMin] = useState<string>('')
    const [priceMax, setPriceMax] = useState<string>('')
    const [onlyVerified, setOnlyVerified] = useState(false)

    useEffect(() => {
        fetchListings()
        subscribeToUpdates()
    }, [])

    const filtered = useMemo(() => {
        let result = listings.filter((l: any) => {
            if (filter === 'nft') return l.is_nft
            if (filter === 'standard') return !l.is_nft
            return true
        })

        // 2. Search Query
        if (query.trim()) {
            const term = query.toLowerCase()
            result = result.filter((l: any) => 
                (l.title || l.property?.title || l.property_title || '').toLowerCase().includes(term) ||
                (l.address || l.property?.address || '').toLowerCase().includes(term) ||
                (l.ward?.toString() || l.property?.ward?.toString() || '').includes(term)
            )
        }

        // 3. Price Range
        if (priceMin) {
            const min = parseFloat(priceMin)
            if (!isNaN(min)) result = result.filter(l => ((l.price_listed_matic || l.price) || 0) >= min)
        }
        if (priceMax) {
            const max = parseFloat(priceMax)
            if (!isNaN(max)) result = result.filter(l => ((l.price_listed_matic || l.price) || 0) <= max)
        }

        // 4. Verification
        if (onlyVerified) result = result.filter(l => l.is_verified || l.ai_valuation)

        return result
    }, [listings, filter, query, priceMin, priceMax, onlyVerified])

    const activeFilterCount = (priceMin ? 1 : 0) + (priceMax ? 1 : 0) + (onlyVerified ? 1 : 0)

    const resetFilters = () => {
        setPriceMin('')
        setPriceMax('')
        setOnlyVerified(false)
        setQuery('', []) 
    }

    const stats = useMemo(() => {
        const withAI = listings.filter((l: any) => l.ai_valuation)
        const avgConfidence = withAI.length > 0
            ? (withAI.reduce((s: number, l: any) => s + (l.ai_valuation?.confidence || 0), 0) / withAI.length).toFixed(1)
            : '—'
        const tierA = withAI.filter((l: any) => l.ai_valuation?.market_tier === 'A').length
        const tierB = withAI.filter((l: any) => l.ai_valuation?.market_tier === 'B').length
        return { avgConfidence, tierA, tierB, total: listings.length }
    }, [listings])

    const categories = [
        { id: 'all', label: 'All Units', icon: ShoppingBag },
        { id: 'nft', label: 'On-Chain', icon: Fingerprint },
        { id: 'standard', label: 'Standard', icon: Building2 },
    ]

    return (
        <div className="space-y-10">
            <Toaster position="top-right" reverseOrder={false} />
            {/* Header Section */}
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 px-2">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <Gavel size={16} className="text-cyan-500 animate-pulse" />
                        <span className="text-[11px] font-black text-cyan-500 uppercase tracking-[0.2em]">Verified Property Auction</span>
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-5xl font-black text-white tracking-tighter text-gradient leading-none">Marketplace</h1>
                        <p className="text-slate-400 max-w-xl text-lg font-medium">{"India's First AI-Valued, Blockchain-Secured Urban Property Auction Engine."}</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                    {/* Filter Tabs */}
                    <div role="tablist" aria-label="Market Categories" className="glass-panel p-2 rounded-[1.5rem] flex gap-2 border border-white/[0.06] shadow-2xl shrink-0 overflow-x-auto no-scrollbar">
                        {categories.map(({ id, label, icon: Icon }) => (
                            <button
                                key={id}
                                role="tab"
                                aria-selected={filter === id}
                                onClick={() => setFilter(id as any)}
                                className={cn(
                                    "relative flex items-center gap-3 px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap",
                                    filter === id
                                        ? "text-black bg-white shadow-lg"
                                        : "text-slate-300 hover:text-white hover:bg-white/[0.04]"
                                )}
                            >
                                <Icon size={14} />
                                <span>{label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        {/* Global Search */}
                        <div className="relative group/search shrink-0 w-full sm:w-56 lg:w-64">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                                {isSearching ? (
                                    <Loader2 size={16} className="animate-spin text-cyan-500" />
                                ) : (
                                    <Search size={16} />
                                )}
                            </div>
                            <input
                                type="text"
                                value={query}
                                onChange={e => setQuery(e.target.value, [])}
                                placeholder="Search marketplace..."
                                className="h-12 pl-10 pr-4 w-full rounded-2xl bg-[var(--background)]/40 border border-[var(--border)] text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/40 transition-all font-semibold"
                            />
                        </div>

                        {/* Filter Toggle */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={cn(
                                "h-12 px-5 flex items-center gap-2 rounded-2xl border transition-all text-sm font-semibold shrink-0 cursor-pointer",
                                showFilters || activeFilterCount > 0
                                    ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                                    : "bg-white/[0.04] border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.06]"
                            )}
                        >
                            <SlidersHorizontal size={14} />
                            <span className="hidden sm:inline tracking-widest uppercase text-[10px]">Filters</span>
                            {activeFilterCount > 0 && (
                                <span className="w-5 h-5 rounded-md bg-cyan-500 text-black flex items-center justify-center text-[10px] font-black ml-1 absolute -top-2 -right-2 sm:relative sm:top-0 sm:right-0">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
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
                        <div className="p-6 glass-card rounded-[2rem] border border-[var(--border)] grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Price */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Price Range (INR)</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        value={priceMin}
                                        onChange={e => setPriceMin(e.target.value)}
                                        placeholder="Min"
                                        className="w-full h-11 px-4 bg-[#0B0F1A] border border-white/[0.08] rounded-xl text-sm font-semibold text-white focus:border-cyan-500/40 focus:outline-none"
                                    />
                                    <span className="text-slate-600 font-bold">-</span>
                                    <input
                                        type="number"
                                        value={priceMax}
                                        onChange={e => setPriceMax(e.target.value)}
                                        placeholder="Max"
                                        className="w-full h-11 px-4 bg-[#0B0F1A] border border-white/[0.08] rounded-xl text-sm font-semibold text-white focus:border-cyan-500/40 focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Toggles */}
                            <div className="space-y-4 flex flex-col justify-end pb-2">
                                <label className="flex items-center gap-3 cursor-pointer group h-11">
                                    <div className={cn(
                                        "w-6 h-6 rounded-lg border flex items-center justify-center transition-all shadow-inner",
                                        onlyVerified ? "bg-emerald-500 border-emerald-500 shadow-emerald-500/20" : "bg-[var(--background)]/40 border-[var(--border)] group-hover:border-slate-500"
                                    )}>
                                        {onlyVerified && <CheckCircle2 size={14} className="text-black" />}
                                    </div>
                                    <span className="text-sm font-bold text-slate-300">AI Verified Properties Only</span>
                                </label>
                            </div>

                            {/* Actions */}
                            <div className="space-y-4 flex flex-col justify-end items-end pb-2">
                                {activeFilterCount > 0 && (
                                    <button 
                                        onClick={resetFilters}
                                        className="text-[11px] font-black text-slate-500 hover:text-rose-400 uppercase tracking-widest mt-2 flex items-center gap-2 transition-colors h-11 px-4 rounded-xl hover:bg-rose-500/10"
                                    >
                                        <RefreshCw size={14} /> Reset Filters
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>


            {/* AI Intelligence Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-2">
                <div className="glass-panel p-5 rounded-2xl border border-white/[0.06]">
                    <div className="flex items-center gap-2 mb-2">
                        <Brain size={14} className="text-cyan-400" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Confidence Score</span>
                    </div>
                    <p className="text-2xl font-black text-white">{stats.avgConfidence}%</p>
                </div>
                <div className="glass-panel p-5 rounded-2xl border border-white/[0.06]">
                    <div className="flex items-center gap-2 mb-2">
                        <Flame size={14} className="text-amber-400" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Zone A (Premium)</span>
                    </div>
                    <p className="text-2xl font-black text-amber-400">{stats.tierA}</p>
                </div>
                <div className="glass-panel p-5 rounded-2xl border border-white/[0.06]">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={14} className="text-cyan-400" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Zone B (Growth)</span>
                    </div>
                    <p className="text-2xl font-black text-cyan-400">{stats.tierB}</p>
                </div>
                <div className="glass-panel p-5 rounded-2xl border border-white/[0.06]">
                    <div className="flex items-center gap-2 mb-2">
                        <ShoppingBag size={14} className="text-slate-400" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Listed</span>
                    </div>
                    <p className="text-2xl font-black text-white">{stats.total}</p>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-[560px] rounded-[2.5rem] glass-panel bg-[var(--background)]/20 animate-pulse relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent animate-shimmer" />
                        </div>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-40 glass-panel rounded-[3rem] border border-[var(--border)] bg-[var(--background)]/20"
                >
                    <div className="w-24 h-24 rounded-full bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mb-8 relative">
                        <ShoppingBag size={40} className="text-slate-800" />
                        <div className="absolute inset-0 border border-cyan-500/10 rounded-full animate-pulse" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-300 tracking-tight">Market Offline</h2>
                    <p className="text-slate-300 mt-2 max-w-xs text-center font-medium">No assets match current search criteria.</p>
                    <button
                        onClick={resetFilters}
                        className="mt-10 px-8 py-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em] hover:bg-cyan-500/10 hover:border-cyan-500/20 transition-all"
                    >
                        Reset Filters
                    </button>
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filtered.map((listing: any, i: number) => (
                        <NFTCard key={listing.id || i} listing={listing} index={i} />
                    ))}
                </div>
            )}

            {/* Network Footer */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-6 py-10 border-t border-white/[0.06]">
                <div className="flex items-center gap-4">
                    <div className="flex -space-x-3">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="w-10 h-10 rounded-full border-2 border-[#0B0F1A] bg-slate-800" />
                        ))}
                    </div>
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                        <span className="text-white">1,204</span> ACTIVE USERS
                    </p>
                </div>
                <div className="flex items-center gap-8">
                    <div className="text-right">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Network</p>
                        <p className="text-sm font-black text-white">Polygon Amoy + Algorand TestNet</p>
                    </div>
                    <div className="w-px h-8 bg-white/10" />
                    <div className="text-right">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">System Status</p>
                        <div className="flex items-center justify-end gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                            <p className="text-[10px] font-black text-emerald-400 tracking-widest">OPTIMAL</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
