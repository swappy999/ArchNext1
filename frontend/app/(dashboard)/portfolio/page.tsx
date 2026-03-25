'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Briefcase, TrendingUp, Building2,
    ArrowUpRight, ArrowDownRight, PieChart,
    History, Wallet, Target, Activity, Zap,
    X, Gavel, Tag, Shield, Brain, CheckCircle2,
    AlertTriangle, XCircle, Loader2, Timer, Plus, BarChart3
} from 'lucide-react'
import { usePortfolioStore } from '@/store/portfolioStore'
import { useMarketplaceStore } from '@/store/marketplaceStore'
import { useAuctionStore } from '@/store/auctionStore'
import { formatCurrency, cn } from '@/lib/utils'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { toast } from 'react-hot-toast'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

// ─── Verification Status Icon ────────────────────────────────────────────────
function StatusIcon({ status }: { status: string }) {
    switch (status) {
        case 'PASS':
            return <CheckCircle2 size={14} className="text-emerald-400" />
        case 'WARN':
            return <AlertTriangle size={14} className="text-amber-400" />
        case 'FAIL':
            return <XCircle size={14} className="text-rose-400" />
        default:
            return <Shield size={14} className="text-slate-300" />
    }
}

function statusColor(status: string) {
    switch (status) {
        case 'PASS': return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5'
        case 'WARN': return 'text-amber-400 border-amber-500/20 bg-amber-500/5'
        case 'FAIL': return 'text-rose-400 border-rose-500/20 bg-rose-500/5'
        default: return 'text-slate-400 border-white/10 bg-white/5'
    }
}

// ─── Listing Modal ───────────────────────────────────────────────────────────
const LISTING_STEPS = [
    { key: 'verify', label: 'Verify' },
    { key: 'choose', label: 'Configure' },
    { key: 'price', label: 'Confirm' },
]

function ListingModal({ asset, onClose }: { asset: any, onClose: () => void }) {
    const [step, setStep] = useState<'verify' | 'choose' | 'price'>('verify')
    const [verifying, setVerifying] = useState(true)
    const [report, setReport] = useState<any>(null)
    const [listingType, setListingType] = useState<'fixed' | 'auction'>('fixed')
    const [askingPrice, setAskingPrice] = useState('')
    const [durationHours, setDurationHours] = useState(24)
    const [submitting, setSubmitting] = useState(false)
    const createAuction = useAuctionStore(s => s.createAuction)
    const currentStepIdx = verifying ? 0 : report?.can_list ? 1 : 0

    // Run verification on mount
    useEffect(() => {
        const handleDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', handleDown)
        return () => document.removeEventListener('keydown', handleDown)
    }, [onClose])

    useEffect(() => {
        runVerification()
    }, [])

    useEffect(() => {
        if (report?.ai_valuation?.total_estimated_value) {
            setAskingPrice(report.ai_valuation.total_estimated_value.toString())
        }
    }, [report])

    const runVerification = async () => {
        setVerifying(true)
        try {
            const token = useAuthStore.getState().accessToken
            const data = await api.post(`/verify/${asset.id || asset.property_id}`, {
                asking_price: asset.current_value || asset.price || 0
            }, token)
            setReport(data)
        } catch (e: any) {
            setReport({
                overall_status: 'WARN',
                overall_label: 'Verification service unavailable. Proceed with caution.',
                can_list: true,
                checks: {},
                ai_valuation: null,
            })
        }
        setVerifying(false)
    }

    const handleSubmitListing = async () => {
        const price = parseFloat(askingPrice)
        if (isNaN(price) || price <= 0) {
            toast.error('Enter a valid price')
            return
        }

        setSubmitting(true)
        try {
            if (listingType === 'auction') {
                await createAuction(asset.id || asset.property_id, price, durationHours)
                toast.success(`Auction started! Ends in ${durationHours}h.`)
            } else {
                const { prepareListProperty } = useMarketplaceStore.getState()
                const priceInr = aiVal?.total_estimated_value || asset.current_value || 0
                await prepareListProperty(asset.id || asset.property_id, price, priceInr)
                toast.success('Property listed on marketplace!')
            }
            onClose()
        } catch (e: any) {
            console.error(e)
            toast.error(e.message || 'Failed to list property')
        }
        setSubmitting(false)
    }

    const checks = report?.checks || {}
    const aiVal = report?.ai_valuation

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-[560px] max-h-[90vh] overflow-y-auto bg-[var(--background)] border border-[var(--border)] rounded-2xl shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-5 border-b border-white/[0.06]">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] flex items-center gap-1.5 justify-center">
                                <Shield size={15} className="text-cyan-400" />
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-white">AI Verification & Listing</h2>
                                <p className="text-[10px] text-slate-500 truncate max-w-[200px]">{asset.title}</p>
                            </div>
                        </div>
                        <button onClick={onClose} aria-label="Close Modal" className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-colors">
                            <X size={16} />
                        </button>
                    </div>
                    {/* Step Indicator */}
                    <div className="flex items-center gap-0">
                        {LISTING_STEPS.map((s, idx) => (
                            <div key={s.key} className="flex items-center flex-1">
                                <div className="flex items-center gap-1.5">
                                    <div className={cn(
                                        "w-5 h-5 rounded-full text-[9px] font-black flex items-center justify-center transition-all",
                                        idx < currentStepIdx ? 'bg-cyan-500 text-black' :
                                            idx === currentStepIdx ? 'bg-white text-black' :
                                                'bg-white/[0.06] text-slate-600'
                                    )}>{idx + 1}</div>
                                    <span className={cn(
                                        "text-[9px] font-black uppercase tracking-wide hidden sm:block",
                                        idx === currentStepIdx ? 'text-white' : 'text-slate-600'
                                    )}>{s.label}</span>
                                </div>
                                {idx < LISTING_STEPS.length - 1 && (
                                    <div className={cn("flex-1 h-[1px] mx-2", idx < currentStepIdx ? 'bg-cyan-500/40' : 'bg-white/[0.06]')} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Step 1: Verification */}
                    {verifying ? (
                        <div className="flex flex-col items-center py-12 gap-4">
                            <div className="relative">
                                <Loader2 size={32} className="text-cyan-400 animate-spin" />
                                <div className="absolute inset-0 bg-cyan-500/20 blur-2xl rounded-full" />
                            </div>
                            <p className="text-sm font-black text-white uppercase tracking-widest">Running AI Verification</p>
                            <p className="text-xs text-slate-300">Analyzing location, price, and market data...</p>
                        </div>
                    ) : (
                        <>
                            {/* Overall Status */}
                            <div className={cn(
                                "p-4 rounded-2xl border flex items-center gap-4",
                                statusColor(report?.overall_status)
                            )}>
                                <StatusIcon status={report?.overall_status} />
                                <div>
                                    <p className="text-sm font-black uppercase tracking-widest">
                                        {report?.overall_status === 'PASS' ? 'Verified' :
                                            report?.overall_status === 'WARN' ? 'Passed with Warnings' : 'Verification Failed'}
                                    </p>
                                    <p className="text-[10px] font-bold mt-0.5 opacity-80">{report?.overall_label}</p>
                                </div>
                            </div>

                            {/* Individual Checks */}
                            <div className="space-y-2">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Verification Checks</p>
                                {Object.entries(checks).map(([key, check]: [string, any]) => (
                                    <div key={key} className={cn(
                                        "flex items-center justify-between p-3 rounded-xl border",
                                        statusColor(check.status)
                                    )}>
                                        <div className="flex items-center gap-3">
                                            <StatusIcon status={check.status} />
                                            <span className="text-xs font-bold capitalize">{key.replace('_', ' ')}</span>
                                        </div>
                                        <span className="text-[10px] font-bold opacity-70 max-w-[200px] text-right">{check.label}</span>
                                    </div>
                                ))}
                            </div>

                            {/* AI Valuation Panel */}
                            {aiVal && (
                                <div className="glass-panel p-5 rounded-2xl border border-cyan-500/10 space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Brain size={14} className="text-cyan-400" />
                                        <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em]">AI Valuation</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="text-center p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Per Sq.Ft</p>
                                            <p className="text-lg font-black text-white">₹{aiVal.predicted_price_per_sqft?.toLocaleString('en-IN')}</p>
                                        </div>
                                        <div className="text-center p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Est.</p>
                                            <p className="text-lg font-black text-emerald-400">₹{(aiVal.total_estimated_value / 10000000)?.toFixed(2)} Cr</p>
                                        </div>
                                        <div className="text-center p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Confidence</p>
                                            <p className="text-lg font-black text-cyan-400">{aiVal.confidence}%</p>
                                        </div>
                                    </div>
                                    {/* Score bars */}
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { label: 'Infra', value: aiVal.infra_score, color: 'bg-cyan-500' },
                                            { label: 'Access', value: aiVal.access_score, color: 'bg-emerald-500' },
                                            { label: 'Demand', value: aiVal.demand_score, color: 'bg-amber-500' },
                                        ].map(({ label, value, color }) => (
                                            <div key={label} className="space-y-1">
                                                <div className="flex justify-between text-[8px] font-bold text-slate-300">
                                                    <span>{label}</span>
                                                    <span>{value}%</span>
                                                </div>
                                                <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${value}%` }}
                                                        transition={{ duration: 1, delay: 0.5 }}
                                                        className={cn("h-full rounded-full", color)}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Listing Options (only if can_list) */}
                            {report?.can_list && (
                                <>
                                    {/* Listing Type Selector */}
                                    <div className="space-y-3">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Listing Type</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => setListingType('fixed')}
                                                className={cn(
                                                    "p-4 rounded-xl border text-left transition-all",
                                                    listingType === 'fixed'
                                                        ? 'border-cyan-500/30 bg-cyan-500/5'
                                                        : 'border-white/[0.06] hover:border-white/10'
                                                )}
                                            >
                                                <Tag size={16} className={listingType === 'fixed' ? 'text-cyan-400' : 'text-slate-400'} />
                                                <p className={cn("text-sm font-black mt-2", listingType === 'fixed' ? 'text-white' : 'text-slate-300')}>Fixed Price</p>
                                                <p className="text-[9px] font-bold text-slate-400 mt-1">Set a price, buyers purchase directly</p>
                                            </button>
                                            <button
                                                onClick={() => setListingType('auction')}
                                                className={cn(
                                                    "p-4 rounded-xl border text-left transition-all",
                                                    listingType === 'auction'
                                                        ? 'border-cyan-500/30 bg-cyan-500/5'
                                                        : 'border-white/[0.06] hover:border-white/10'
                                                )}
                                            >
                                                <Gavel size={16} className={listingType === 'auction' ? 'text-cyan-400' : 'text-slate-400'} />
                                                <p className={cn("text-sm font-black mt-2", listingType === 'auction' ? 'text-white' : 'text-slate-300')}>Start Auction</p>
                                                <p className="text-[9px] font-bold text-slate-400 mt-1">Set reserve price, accept bids</p>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Price input */}
                                    <div className="space-y-2">
                                        <label htmlFor="price-input" className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                                            {listingType === 'auction' ? `Reserve Price (${asset.is_nft ? 'POL' : '₹'})` : `Asking Price (${asset.is_nft ? 'POL' : '₹'})`}
                                        </label>
                                        <div className="relative group/input">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">
                                                {asset.is_nft ? 'POL' : '₹'}
                                            </span>
                                            <input
                                                id="price-input"
                                                type="number"
                                                value={askingPrice}
                                                onChange={(e) => setAskingPrice(e.target.value)}
                                                placeholder={asset.is_nft ? '0.00001' : (aiVal ? (aiVal.total_estimated_value || 0).toString() : '0')}
                                                step={asset.is_nft ? "0.000001" : "1"}
                                                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-[3.5rem] pr-4 py-3.5 text-lg font-black text-white placeholder:text-slate-700 focus:outline-none focus:border-cyan-500/50 transition-colors"
                                            />
                                            {aiVal && !asset.is_nft && askingPrice === aiVal.total_estimated_value.toString() && (
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                                                    <Brain size={14} className="text-cyan-400 animate-pulse" />
                                                    <span className="text-[9px] font-black text-cyan-400/80 uppercase tracking-widest bg-cyan-500/10 px-2 py-1 rounded-md border border-cyan-500/20">
                                                        AI Optimized
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Duration (auction only) */}
                                    {listingType === 'auction' && (
                                        <div className="space-y-2">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Auction Duration</p>
                                            <div className="grid grid-cols-4 gap-2">
                                                {[6, 12, 24, 48].map(h => (
                                                    <button
                                                        key={h}
                                                        onClick={() => setDurationHours(h)}
                                                        className={cn(
                                                            "py-2.5 rounded-xl text-xs font-black border transition-all",
                                                            durationHours === h
                                                                ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
                                                                : 'border-white/[0.06] text-slate-300 hover:text-white'
                                                        )}
                                                    >
                                                        {h}h
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Submit */}
                                    <button
                                        onClick={handleSubmitListing}
                                        disabled={submitting}
                                        className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-700 text-sm font-black text-white uppercase tracking-[0.2em] shadow-2xl hover:-translate-y-0.5 transition-all disabled:opacity-50"
                                    >
                                        {submitting ? <Loader2 size={16} className="animate-spin" /> : (listingType === 'auction' ? <Gavel size={16} /> : <Tag size={16} />)}
                                        {submitting ? 'Processing...' : listingType === 'auction' ? 'Start Auction' : 'List for Sale'}
                                    </button>
                                </>
                            )}

                            {/* Cannot list */}
                            {!report?.can_list && (
                                <div className="p-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 text-center">
                                    <XCircle size={24} className="text-rose-400 mx-auto mb-2" />
                                    <p className="text-sm font-black text-rose-400">Listing Blocked</p>
                                    <p className="text-xs text-slate-300 mt-1">Property failed verification. Please resolve the issues above.</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </motion.div>
        </motion.div>
    )
}

// ─── Asset Card ──────────────────────────────────────────────────────────────
function AssetCard({ asset, index, onListClick }: { asset: any, index: number, onListClick: () => void }) {
    const gain = (asset.current_value || 0) - (asset.purchase_price || 0)
    const gainPct = asset.purchase_price > 0 ? ((gain / asset.purchase_price) * 100).toFixed(1) : '0'
    const isPositive = gain >= 0

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
            className="group relative bg-[var(--background)]/80 backdrop-blur-md border border-[var(--border)] rounded-3xl p-6 transition-all duration-500 hover:border-cyan-500/30 overflow-hidden flex flex-col h-full"
        >
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="flex items-start justify-between mb-8">
                <div className="w-14 h-14 rounded-2xl bg-[var(--background)]/80 border border-[var(--border)] flex items-center justify-center shadow-xl group-hover:border-cyan-500/20 transition-colors relative overflow-hidden">
                    <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[var(--background)] to-transparent" />
                    <Building2 size={24} className="text-slate-300 group-hover:text-cyan-400 transition-colors relative z-10" />
                </div>
                <div className="flex flex-col items-end gap-2">
                    {asset.is_nft && (
                        <span className="text-[9px] font-black px-2.5 py-1 rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 uppercase tracking-widest shadow-lg">
                            NFT #{asset.nft_token_id !== undefined && asset.nft_token_id !== null ? asset.nft_token_id : '---'}
                        </span>
                    )}
                    {asset.shares_owned && asset.total_shares && (
                        <span className="text-[9px] font-black px-2.5 py-1 rounded-lg border border-purple-500/20 bg-purple-500/10 text-purple-400 uppercase tracking-widest shadow-lg">
                            {((asset.shares_owned / asset.total_shares) * 100).toFixed(1)}% Fractional
                        </span>
                    )}
                    {asset.status === 'available' && !asset.is_fractional && (
                        <span className="text-[9px] font-black px-2.5 py-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 uppercase tracking-widest shadow-lg animate-pulse">LISTED</span>
                    )}
                </div>
            </div>

            <div className="space-y-1.5 mb-8">
                <h3 className="text-lg font-black text-white truncate tracking-tight group-hover:text-cyan-50 transition-colors">{asset.title || 'Property Asset'}</h3>
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                    <p className="text-xs font-bold text-slate-300 group-hover:text-slate-400 transition-colors uppercase tracking-tight">
                        {asset.area || (typeof asset.location === 'string' ? asset.location : 'KOLKATA NETWORK')}
                    </p>
                </div>
            </div>

            <div className="flex flex-col gap-4 pt-6 border-t border-white/[0.04]">
                {/* Values Row */}
                <div className="flex items-end justify-between">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Current Value</p>
                        <p className="text-2xl font-black text-white tracking-tighter group-hover:text-cyan-400 transition-colors">
                            {asset.price_listed_matic && asset.price_listed_matic > 0 ? `${asset.price_listed_matic} POL` : formatCurrency(asset.current_value || 0)}
                        </p>
                    </div>

                    <div className="space-y-1 text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Purchased For</p>
                        <p className="text-lg font-black text-slate-400 tracking-tighter group-hover:text-slate-300 transition-colors">
                            {asset.purchase_price_matic && asset.purchase_price_matic > 0 ? `${asset.purchase_price_matic} POL` : formatCurrency(asset.purchase_price || 0)}
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className={cn(
                        "flex items-center gap-1 px-4 py-2 rounded-2xl border transition-all duration-500 text-[11px] font-black tracking-widest uppercase",
                        isPositive ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400' : 'bg-rose-500/5 border-rose-500/10 text-rose-400'
                    )}>
                        {isPositive ? <ArrowUpRight size={14} aria-hidden="true" /> : <ArrowDownRight size={14} aria-hidden="true" />}
                        <span className="sr-only">{isPositive ? 'Positive Return' : 'Negative Return'}</span>
                        {gainPct}%
                    </div>

                    {/* List for Sale / Start Auction Button */}
                    <button
                        onClick={onListClick}
                        className="min-h-[44px] bg-white text-black hover:bg-cyan-400 hover:text-white px-5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 flex items-center gap-2"
                        aria-label="List or Auction this Asset"
                    >
                        <Gavel size={12} />
                        List / Auction
                    </button>
                </div>
            </div>

            {asset.ai_growth_prediction && (
                <div className="mt-6 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex items-center justify-between group-hover:bg-blue-500/10 transition-colors">
                    <div className="flex items-center gap-3">
                        <Zap size={14} className="text-blue-400" />
                        <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest">AI Forecast</span>
                    </div>
                    <span className="text-xs font-black text-blue-400">+{asset.ai_growth_prediction}% YOY</span>
                </div>
            )}
        </motion.div>
    )
}

export default function PortfolioPage() {
    const { assets, active_auctions, my_bids, total_current_value, total_invested, fetchPortfolio, subscribeToUpdates, loading } = usePortfolioStore()
    const [selectedAsset, setSelectedAsset] = useState<any>(null)

    useEffect(() => { 
        fetchPortfolio() 
        subscribeToUpdates()
    }, [])

    const totalGain = total_current_value - total_invested
    const totalGainPct = total_invested > 0 ? ((totalGain / total_invested) * 100).toFixed(1) : '0'
    const isPositive = totalGain >= 0

    const mainStats = [
        { label: 'Total Value', value: formatCurrency(total_current_value), icon: Briefcase, color: 'text-white' },
        { label: 'Investment', value: formatCurrency(total_invested), icon: Wallet, color: 'text-slate-400' },
        { label: 'Total Return', value: `${isPositive ? '+' : ''}${formatCurrency(totalGain)}`, icon: TrendingUp, color: isPositive ? 'text-emerald-400' : 'text-rose-400', secondary: `${totalGainPct}% ROI` },
    ]

    // Build simple portfolio growth chart from assets
    const growthChartData = useMemo(() => {
        if (!assets.length) return []
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const now = new Date()
        return Array.from({ length: 6 }).map((_, i) => {
            const offset = 5 - i
            const monthIdx = (now.getMonth() - offset + 12) % 12
            const factor = 0.7 + (i / 5) * 0.3
            return {
                month: months[monthIdx],
                value: Math.round((total_current_value || 0) * factor),
            }
        })
    }, [assets, total_current_value])

    return (
        <div className="space-y-8">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
                <div className="page-header">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_#06b6d4] animate-pulse" />
                        <span className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.25em]">Property Portfolio</span>
                    </div>
                    <h1>Portfolio</h1>
                    <p>Overview of your property assets, performance, and active market engagement.</p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                    <Link
                        href="/properties/create"
                        className="flex items-center gap-2 min-h-[44px] px-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-bold hover:bg-cyan-500/15 transition-all active:scale-95"
                        aria-label="Add New Property Asset"
                    >
                        <Plus size={13} />
                        New Asset
                    </Link>
                    <div className="flex items-center gap-2 h-9 px-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-slate-400 text-xs font-semibold">
                        <History size={13} />
                        Just Now
                    </div>
                </div>
            </div>

            {/* ── Top Stat Cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {mainStats.map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08, duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
                        className="group p-6 rounded-2xl bg-[var(--background)]/40 border border-[var(--border)] hover:border-cyan-500/20 transition-all overflow-hidden relative"
                    >
                        <div className="flex items-start justify-between mb-5">
                            <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.07] flex items-center justify-center group-hover:border-cyan-500/25 transition-all">
                                <stat.icon size={17} className="text-slate-500 group-hover:text-cyan-400 transition-colors" />
                            </div>
                            {stat.secondary && (
                                <span className={cn("text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-lg border", stat.color, 'bg-white/[0.03] border-white/[0.06]')}>
                                    {stat.secondary}
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">{stat.label}</p>
                        {loading ? (
                            <div className="h-8 w-36 skeleton" />
                        ) : (
                            <h3 className={cn("text-2xl font-black tracking-tighter", stat.color)}>
                                {stat.value}
                            </h3>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                    </motion.div>
                ))}
            </div>

            {/* ── Portfolio Growth Chart ── */}
            {growthChartData.length > 0 && total_current_value > 0 && (
                <div className="glass-card p-5 rounded-2xl border border-white/[0.05]">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                                <BarChart3 size={15} className="text-cyan-400" />
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-white">Portfolio Growth</h2>
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">6-Month Trajectory</p>
                            </div>
                        </div>
                        <span className={cn(
                            "text-xs font-black px-2.5 py-1 rounded-lg border",
                            isPositive ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/8' : 'text-rose-400 border-rose-500/20 bg-rose-500/8'
                        )}>
                            {isPositive ? '+' : ''}{totalGainPct}% ROI
                        </span>
                    </div>
                    <div className="h-36">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={growthChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                                <YAxis hide domain={['dataMin - 100000', 'dataMax + 100000']} />
                                <Tooltip
                                    contentStyle={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.75rem', fontSize: 11 }}
                                    labelStyle={{ color: '#94a3b8', fontWeight: 700 }}
                                    formatter={(v: any) => [formatCurrency(v), 'Portfolio Value']}
                                />
                                <Area type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={2} fill="url(#portfolioGrad)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* ── Asset Holdings ── */}
            <div className="space-y-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                            <PieChart size={17} className="text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white tracking-tight">Active Holdings</h2>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-0.5">{assets.length} Properties</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--background)]/20 border border-[var(--border)] text-[10px] font-bold text-slate-400">
                        <Activity size={12} className="text-emerald-400" />
                        Efficiency: 98.2%
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-[280px] rounded-2xl skeleton" />
                        ))}
                    </div>
                ) : assets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 glass-card rounded-2xl border border-dashed border-white/[0.06]">
                        <div className="w-12 h-12 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mb-4">
                            <Briefcase size={20} className="text-slate-700" />
                        </div>
                        <h2 className="text-base font-black text-slate-400 tracking-tight">No Assets Owned</h2>
                        <p className="text-slate-600 mt-1 text-sm font-medium">Start investing via the marketplace.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {assets.map((asset: any, i: number) => (
                            <AssetCard
                                key={asset.id || i}
                                asset={asset}
                                index={i}
                                onListClick={() => setSelectedAsset(asset)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* ── Active Auctions ── */}
            <div className="space-y-5">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                        <Gavel size={17} className="text-cyan-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-white tracking-tight">Active Auctions</h2>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Properties you are currently auctioning</p>
                    </div>
                </div>

                {active_auctions.length === 0 ? (
                    <div className="py-8 text-center glass-card rounded-xl border border-white/[0.04] text-slate-600 text-[10px] font-black uppercase tracking-widest">
                        No active auctions
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {active_auctions.map((auction: any, i: number) => (
                            <Link href={`/properties/${auction.property_id}`} key={auction.id}>
                                <div className="glass-card p-5 rounded-xl border border-cyan-500/20 bg-cyan-500/5 relative overflow-hidden group hover:border-cyan-500/40 transition-all cursor-pointer">
                                    <div className="absolute top-3.5 right-3.5 text-[8px] font-black bg-cyan-500 text-black px-2 py-0.5 rounded-full">LIVE</div>
                                    <h3 className="text-white font-black truncate pr-10 mb-3 text-sm">Auction #{auction.id.slice(-6).toUpperCase()}</h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[9px] font-black text-slate-500 uppercase">Current Bid</span>
                                            <span className="text-base font-black text-cyan-400">₹{auction.current_bid?.toLocaleString('en-IN') || 0}</span>
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.03] rounded-xl">
                                            <Timer size={11} className="text-cyan-500" />
                                            <span className="text-[10px] font-semibold text-slate-400">Ends {new Date(auction.end_time).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Placed Bids ── */}
            <div className="space-y-5">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <Target size={17} className="text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-white tracking-tight">Escrow Bids</h2>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Your locked funds across auctions</p>
                    </div>
                </div>

                {my_bids.length === 0 ? (
                    <div className="py-8 text-center glass-card rounded-xl border border-white/[0.04] text-slate-600 text-[10px] font-black uppercase tracking-widest">
                        No active network bids.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {my_bids.map((bid: any, i: number) => (
                            <Link href={`/properties/${bid.property_id}`} key={bid.id}>
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="bg-[var(--background)]/60 backdrop-blur-md p-4 rounded-2xl border border-[var(--border)] flex items-center justify-between group hover:border-emerald-500/30 transition-all cursor-pointer"
                                >
                                    <div>
                                        <p className="text-[8px] font-black text-slate-300 uppercase mb-1">Auction Ref</p>
                                        <p className="text-xs font-black text-white">#{bid.auction_id.slice(-6).toUpperCase()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[8px] font-black text-emerald-500 uppercase mb-1">Bid Amount</p>
                                        <p className="text-sm font-black text-emerald-400">₹{bid.amount.toLocaleString('en-IN')}</p>
                                    </div>
                                </motion.div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>


            {/* Bottom Insight Card */}
            <div className="bg-[var(--background)]/40 backdrop-blur-xl p-10 rounded-[3rem] border border-[var(--border)] relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-[40%] h-full bg-cyan-600/5 blur-[120px] rounded-full" />

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 relative z-10">
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <Target size={20} className="text-cyan-400" />
                            <h2 className="text-2xl font-black text-white tracking-tight">Market Insights</h2>
                        </div>
                        <p className="text-slate-400 text-lg font-medium leading-relaxed">
                            Your portfolio shows a <span className="text-cyan-400">strong concentration</span> in high-growth areas. AI projections suggest increasing demand in surrounding zones over the next few months.
                        </p>
                        <div className="flex items-center gap-6 pt-4">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Confidence Index</p>
                                <p className="text-xl font-black text-white">94.8%</p>
                            </div>
                            <div className="w-px h-10 bg-white/10" />
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Risk Factor</p>
                                <p className="text-xl font-black text-emerald-400">LOW</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-center xl:justify-end">
                        <div className="relative w-full max-w-[300px] aspect-square">
                            <div className="absolute inset-0 bg-cyan-500/10 blur-3xl rounded-full animate-pulse-glow" />
                            <div className="absolute inset-0 border-[10px] border-white/[0.03] rounded-full" />
                            <div className="absolute inset-0 border-[10px] border-cyan-500/20 rounded-full border-t-cyan-500 animate-[spin_8s_linear_infinite]" />
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">PORTFOLIO SCORE</p>
                                <p className="text-6xl font-black text-white tracking-tighter glow-text">9.2</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Listing Modal */}
            <AnimatePresence>
                {selectedAsset && (
                    <ListingModal
                        asset={selectedAsset}
                        onClose={() => setSelectedAsset(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}
