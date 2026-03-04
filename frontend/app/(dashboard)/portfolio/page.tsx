'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Briefcase, TrendingUp, Building2,
    ArrowUpRight, ArrowDownRight, PieChart,
    History, Wallet, Target, Activity, Zap,
    X, Gavel, Tag, Shield, Brain, CheckCircle2,
    AlertTriangle, XCircle, Loader2, Timer, Plus
} from 'lucide-react'
import { usePortfolioStore } from '@/store/portfolioStore'
import { useMarketplaceStore } from '@/store/marketplaceStore'
import { useAuctionStore } from '@/store/auctionStore'
import { formatCurrency, cn } from '@/lib/utils'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { toast } from 'react-hot-toast'

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
function ListingModal({ asset, onClose }: { asset: any, onClose: () => void }) {
    const [step, setStep] = useState<'verify' | 'choose' | 'price'>('verify')
    const [verifying, setVerifying] = useState(true)
    const [report, setReport] = useState<any>(null)
    const [listingType, setListingType] = useState<'fixed' | 'auction'>('fixed')
    const [askingPrice, setAskingPrice] = useState('')
    const [durationHours, setDurationHours] = useState(24)
    const [submitting, setSubmitting] = useState(false)
    const createAuction = useAuctionStore(s => s.createAuction)

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
                // Fixed price listing via marketplace
                const { prepareListProperty } = useMarketplaceStore.getState()
                if (asset.is_nft) {
                    const priceInr = aiVal?.total_estimated_value || asset.current_value || 0
                    const res = await prepareListProperty(asset.id || asset.property_id, price, priceInr)
                    // For on-chain NFTs, MetaMask flow
                    const { getEthersSigner } = await import('@/store/walletStore')
                    const { ethers } = await import('ethers')
                    const signer = await getEthersSigner()

                    const marketplaceArtifact = await import('@/contracts/PropertyMarketplace.json')
                    const nftArtifact = await import('@/contracts/PropertyNFT.json')

                    const marketplace = new ethers.Contract(res.marketplace_contract_address, marketplaceArtifact.abi, signer)
                    const nft = new ethers.Contract(res.nft_contract_address, nftArtifact.abi, signer)

                    toast('Approve NFT transfer in MetaMask...', { icon: '🦊' })
                    const approveTx = await nft.approve(res.marketplace_contract_address, res.nft_token_id)
                    await approveTx.wait()

                    toast('Confirm listing in MetaMask...', { icon: '🦊' })
                    const listTx = await marketplace.listProperty(
                        res.nft_contract_address,
                        res.nft_token_id,
                        res.price_wei.toString()
                    )
                    await listTx.wait()
                    toast.success('Listed on-chain successfully!')
                } else {
                    await prepareListProperty(asset.id || asset.property_id, 0, price)
                    toast.success('Property listed on marketplace!')
                }
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
                className="w-full max-w-[600px] max-h-[90vh] overflow-y-auto bg-[#0B0F1A] border border-white/[0.08] rounded-3xl shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3">
                        <Shield size={18} className="text-cyan-400" />
                        <div>
                            <h2 className="text-lg font-black text-white tracking-tight">AI Verification & Listing</h2>
                            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{asset.title}</p>
                        </div>
                    </div>
                    <button onClick={onClose} aria-label="Close Modal" className="p-2 rounded-xl hover:bg-white/5 text-slate-300 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
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
    const gain = asset.current_value - asset.purchase_price
    const gainPct = ((gain / asset.purchase_price) * 100).toFixed(1)
    const isPositive = gain >= 0

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
            className="group relative p-6 rounded-[2.5rem] glass-card border-white/[0.06] hover:border-cyan-500/30 transition-all duration-500 overflow-hidden"
        >
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="flex items-start justify-between mb-8">
                <div className="w-14 h-14 rounded-2xl bg-[#0B0F1A] border border-white/[0.05] flex items-center justify-center shadow-xl group-hover:border-cyan-500/20 transition-colors relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent" />
                    <Building2 size={24} className="text-slate-300 group-hover:text-cyan-400 transition-colors relative z-10" />
                </div>
                <div className="flex flex-col items-end gap-2">
                    {asset.is_nft && (
                        <span className="text-[9px] font-black px-2.5 py-1 rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 uppercase tracking-widest shadow-lg">
                            NFT #{asset.nft_token_id !== undefined && asset.nft_token_id !== null ? asset.nft_token_id : '---'}
                        </span>
                    )}
                    {asset.status === 'available' && (
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
                        className="bg-white text-black hover:bg-cyan-400 hover:text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 flex items-center gap-2"
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
    const { assets, active_auctions, my_bids, total_current_value, total_invested, fetchPortfolio, loading } = usePortfolioStore()
    const [selectedAsset, setSelectedAsset] = useState<any>(null)

    useEffect(() => { fetchPortfolio() }, [])

    const totalGain = total_current_value - total_invested
    const totalGainPct = total_invested > 0 ? ((totalGain / total_invested) * 100).toFixed(1) : '0'
    const isPositive = totalGain >= 0

    const mainStats = [
        { label: 'Total Value', value: formatCurrency(total_current_value), icon: Briefcase, color: 'text-white' },
        { label: 'Investment', value: formatCurrency(total_invested), icon: Wallet, color: 'text-slate-400' },
        { label: 'Total Return', value: `${isPositive ? '+' : ''}${formatCurrency(totalGain)}`, icon: TrendingUp, color: isPositive ? 'text-emerald-400' : 'text-rose-400', secondary: `${totalGainPct}% ROI` },
    ]

    return (
        <div className="space-y-12">
            {/* Header */}
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 px-2">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_10px_#06b6d4] animate-pulse" />
                        <span className="text-[11px] font-black text-cyan-500 uppercase tracking-[0.3em]">Property Portfolio</span>
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-5xl font-black text-white tracking-tighter text-gradient leading-none">Portfolio</h1>
                        <p className="text-slate-400 max-w-xl text-lg font-medium">Overview of your property assets, performance, and active market engagement.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        href="/properties/create"
                        className="glass-panel px-6 py-3.5 rounded-2xl flex items-center gap-4 border-cyan-500/20 bg-cyan-500/5 text-cyan-400 hover:bg-cyan-500/10 transition-all shadow-2xl active:scale-95"
                        aria-label="Add New Property Asset"
                    >
                        <Plus size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Add New Asset</span>
                    </Link>
                    <div className="glass-panel px-6 py-3.5 rounded-2xl flex items-center gap-4 border-white/[0.04] shadow-2xl">
                        <History size={16} className="text-slate-300" />
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Last Update: Just Now</span>
                    </div>
                </div>
            </div>

            {/* Top Summaries */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {mainStats.map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1, duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
                        className="group p-8 rounded-[2.5rem] glass-card border-white/[0.06] hover:border-cyan-500/20 transition-all duration-500 overflow-hidden relative"
                    >
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/[0.02] blur-3xl rounded-full" />

                        <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mb-10 group-hover:scale-110 group-hover:border-cyan-500/30 transition-all duration-500">
                            <stat.icon size={20} className="text-slate-400 group-hover:text-cyan-400 transition-colors" />
                        </div>

                        <div className="space-y-2 relative z-10">
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">{stat.label}</p>
                            {loading ? (
                                <div className="h-10 w-40 bg-white/[0.03] rounded-xl animate-shimmer relative overflow-hidden" />
                            ) : (
                                <div className="space-y-1">
                                    <h3 className={cn("text-3xl font-black tracking-tighter glow-text", stat.color)}>
                                        {stat.value}
                                    </h3>
                                    {stat.secondary && (
                                        <p className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">{stat.secondary}</p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700" />
                    </motion.div>
                ))}
            </div>

            {/* Asset Performance View */}
            <div className="space-y-8">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                            <PieChart size={20} className="text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight">Active Holdings</h2>
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-0.5">{assets.length} PROPERTIES OWNED</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="glass-panel px-4 py-2 rounded-xl flex items-center gap-3 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                            <Activity size={14} className="text-emerald-500" />
                            Efficiency: 98.2%
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-[320px] rounded-[2.5rem] glass-panel bg-white/[0.02] animate-pulse relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent animate-shimmer" />
                            </div>
                        ))}
                    </div>
                ) : assets.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center py-20 glass-panel rounded-[3rem] border-dashed border-white/[0.06] bg-[#05070A]/50"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mb-6 relative">
                            <Briefcase size={24} className="text-slate-800" />
                        </div>
                        <h2 className="text-lg font-black text-slate-300 tracking-tight">No Assets Owned</h2>
                        <p className="text-slate-300 mt-1 max-w-xs text-center font-medium text-xs">Start investing via the marketplace.</p>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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

            {/* My Active Auctions */}
            <div className="space-y-8">
                <div className="flex items-center gap-4 px-2">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                        <Gavel size={20} className="text-cyan-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tight">Active Auctions</h2>
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-0.5">Properties you are currently auctioning</p>
                    </div>
                </div>

                {active_auctions.length === 0 ? (
                    <div className="py-12 text-center glass-panel rounded-3xl border border-white/[0.04] text-slate-400 text-[10px] font-black uppercase tracking-widest">
                        No active auctions.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {active_auctions.map((auction: any, i: number) => (
                            <Link href={`/properties/${auction.property_id}`} key={auction.id}>
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="glass-card p-6 rounded-3xl border border-cyan-500/20 bg-cyan-500/5 relative overflow-hidden group hover:border-cyan-500/50 transition-all cursor-pointer"
                                >
                                    <div className="absolute top-4 right-4 text-[8px] font-black bg-cyan-500 text-black px-2 py-0.5 rounded-full animate-pulse">LIVE</div>
                                    <h3 className="text-white font-black truncate pr-10 mb-2">Auction #{auction.id.slice(-6).toUpperCase()}</h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[9px] font-black text-slate-300 uppercase">Current Bid</span>
                                            <span className="text-lg font-black text-cyan-400">₹{auction.current_bid?.toLocaleString('en-IN') || 0}</span>
                                        </div>
                                        <div className="flex justify-between items-center px-3 py-2 bg-white/[0.03] rounded-xl">
                                            <Timer size={12} className="text-cyan-500" />
                                            <span className="text-[10px] font-bold text-slate-300">Ends {new Date(auction.end_time).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </motion.div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* My Placed Bids */}
            <div className="space-y-8">
                <div className="flex items-center gap-4 px-2">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <Target size={20} className="text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tight">Active Bids</h2>
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-0.5">Your current bids on auction properties</p>
                    </div>
                </div>

                {my_bids.length === 0 ? (
                    <div className="py-12 text-center glass-panel rounded-3xl border border-white/[0.04] text-slate-400 text-[10px] font-black uppercase tracking-widest">
                        No active network bids.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {my_bids.map((bid: any, i: number) => (
                            <Link href={`/properties/${bid.property_id}`} key={bid.id}>
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="glass-card p-4 rounded-2xl border border-white/[0.06] flex items-center justify-between group hover:border-emerald-500/30 transition-all cursor-pointer"
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
            <div className="glass-panel p-10 rounded-[3rem] border-white/[0.06] relative overflow-hidden group">
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
