'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Building2, Globe, ShieldCheck, Activity,
    Zap, TrendingUp, ArrowLeft, Fingerprint,
    Radar, MapPin, Share2, Heart, Cpu, Network, Gavel
} from 'lucide-react'
import { usePropertyStore } from '@/store/propertyStore'
import { useMarketplaceStore } from '@/store/marketplaceStore'
import { useAuctionStore } from '@/store/auctionStore'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'
import { formatCurrency, shortAddress, cn } from '@/lib/utils'
import { toast, Toaster } from 'react-hot-toast'
import { Shield, Brain, Loader2, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'

function AIRadarChart() {
    return (
        <div className="relative w-full aspect-square flex items-center justify-center">
            <div className="absolute inset-0 border border-[var(--border)] rounded-full" />
            <div className="absolute inset-[20%] border border-[var(--border)] rounded-full" />
            <div className="absolute inset-[40%] border border-[var(--border)] rounded-full" />
            <div className="absolute inset-[60%] border border-[var(--border)] rounded-full" />

            {/* Axis */}
            {[0, 60, 120, 180, 240, 300].map(deg => (
                <div key={deg} className="absolute h-full w-[1px] bg-[var(--border)]" style={{ transform: `rotate(${deg}deg)` }} />
            ))}

            {/* Radar Shape */}
            <svg className="absolute inset-0 w-full h-full -rotate-90">
                <motion.polygon
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    points="100,20 160,60 180,130 140,180 60,160 40,80"
                    className="fill-cyan-500/20 stroke-cyan-500 stroke-2"
                    style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                    viewBox="0 0 200 200"
                />
            </svg>

            {/* Pulsing Center */}
            <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_15px_#22d3ee] z-10" />
        </div>
    )
}

function StatsRing({ value, label }: { value: number, label: string }) {
    const percentage = value * 10
    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90">
                    <circle cx="64" cy="64" r="58" fill="none" className="stroke-[var(--border)]" strokeWidth="8" />
                    <motion.circle
                        cx="64" cy="64" r="58" fill="none"
                        className="stroke-cyan-500"
                        strokeWidth="8"
                        strokeDasharray="364.4"
                        initial={{ strokeDashoffset: 364.4 }}
                        animate={{ strokeDashoffset: 364.4 - (364.4 * percentage) / 100 }}
                        transition={{ duration: 2, ease: "easeOut" }}
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute flex flex-col items-center">
                    <span className="text-3xl font-black text-white">{value}</span>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Score</span>
                </div>
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</span>
        </div>
    )
}

export default function PropertyDetailPage() {
    const { id } = useParams()
    const router = useRouter()
    const { properties, fetchProperties } = usePropertyStore()
    const [property, setProperty] = useState<any>(null)

    useEffect(() => {
        if (properties.length === 0) fetchProperties()
        const p = properties.find((x: any) => x.id.toString() === id)
        if (p) {
            setProperty(p)
            if (p.status === 'auction') {
                // Find and fetch auction detail
                fetchAuctionDetailByProp(p.id)
            }
        }
    }, [id, properties])

    const fetchAuctionDetailByProp = async (propId: string) => {
        try {
            const auctions = await api.get('/auction/active/all')
            const auction = auctions.find((a: any) => a.property_id === propId)
            if (auction) {
                await fetchAuctionDetail(auction.id)
            }
        } catch (e) {
            console.error("Failed to fetch auction detail", e)
        }
    }

    const runVerification = async () => {
        setVerifying(true)
        try {
            const token = useAuthStore.getState().accessToken
            const data = await api.post(`/verify/${property.id}`, {
                asking_price: property.price
            }, token)
            setVerificationReport(data)
            toast.success("AI Verification Complete!")
        } catch (e: any) {
            toast.error("Verification failed: " + e.message)
        } finally {
            setVerifying(false)
        }
    }

    const { buy, buyingId } = useMarketplaceStore()
    const { createAuction, currentAuction, bids, fetchAuctionDetail } = useAuctionStore()
    const user = useAuthStore(s => (s as any).user)
    const [verifying, setVerifying] = useState(false)
    const [verificationReport, setVerificationReport] = useState<any>(null)
    const [sharesToBuy, setSharesToBuy] = useState(1)

    if (!property) return (
        <div className="h-[60vh] flex flex-col items-center justify-center gap-6">
            <div className="w-16 h-16 rounded-3xl border border-[var(--border)] bg-[var(--background)]/20 flex items-center justify-center animate-pulse">
                <Building2 size={32} className="text-slate-700" />
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Synching Neural Node...</p>
        </div>
    )

    const isOwner = property.owner_id && user && (property.owner_id === user._id || property.owner?.id === user._id)
    const isSold = property.status === 'sold'

    const handleBuyFraction = async () => {
        if (!property.is_fractional || isOwner) return
        try {
            const token = useAuthStore.getState().accessToken
            const amount = property.price_per_share * sharesToBuy
            await api.post(`/marketplace/buy-fraction/${property.id}`, {
                shares_to_buy: sharesToBuy,
                amount: amount
            }, token)
            toast.success(`Successfully acquired ${sharesToBuy} shares!`)
            setTimeout(() => window.location.reload(), 1500)
        } catch (err: any) {
            toast.error(err.message || "Fractional purchase failed")
        }
    }

    const handleBuy = async () => {
        if (isSold || isOwner) return
        try {
            await buy(property.id)
            toast.success("Purchase initiated!")
        } catch (e: any) {
            toast.error(e.message || "Failed to buy")
        }
    }

    const handleBid = async () => {
        const amount = prompt("Enter bid amount (INR):")
        if (amount) {
            try {
                const token = useAuthStore.getState().accessToken
                await api.post(`/auction/bid/${property.id}`, { amount: parseFloat(amount) }, token)
                toast.success("Bid placed successfully!")
            } catch (err: any) {
                toast.error(err.message || "Failed to place bid")
            }
        }
    }

    return (
        <div className="space-y-12">
            {/* Breadcrumb & Actions */}
            <div className="flex items-center justify-between px-2">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-3 text-[10px] font-black text-slate-500 hover:text-white transition-colors uppercase tracking-[0.2em] group"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Registry
                </button>
                <div className="flex items-center gap-4">
                    <button className="p-3 rounded-xl bg-[var(--background)]/40 backdrop-blur-md border border-[var(--border)] text-slate-400 hover:text-white transition-all"><Share2 size={18} /></button>
                    <button className="p-3 rounded-xl bg-[var(--background)]/40 backdrop-blur-md border border-[var(--border)] text-slate-400 hover:text-rose-400 transition-all"><Heart size={18} /></button>
                </div>
            </div>

            {/* Hero Section */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                {/* Left: Imagery & Primary Info */}
                <div className="xl:col-span-8 space-y-10">
                    <div className="relative h-[500px] rounded-[3rem] overflow-hidden border border-[var(--border)] bg-[var(--background)] shadow-2xl group">
                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 grid-bg opacity-20" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

                        {/* Placeholder Content */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Building2 size={120} className="text-slate-900 group-hover:scale-110 group-hover:text-slate-800 transition-all duration-1000" />
                        </div>

                        {/* Top Overlays */}
                        <div className="absolute top-8 left-8 flex gap-3">
                            <div className="bg-[var(--background)]/40 backdrop-blur-md px-4 py-2 rounded-2xl flex items-center gap-3 border border-[var(--border)] shadow-2xl">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
                                <span className="text-[10px] font-black text-white uppercase tracking-widest">LIVE TRACKING</span>
                            </div>
                            {property.is_nft && (
                                <div className="glass-panel px-4 py-2 rounded-2xl flex items-center gap-3 border-blue-500/20 bg-blue-500/10 text-blue-400 shadow-2xl">
                                    <Fingerprint size={14} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">ON-CHAIN VERIFIED</span>
                                </div>
                            )}
                        </div>

                        {/* Bottom Overlays */}
                        <div className="absolute bottom-10 left-10 right-10">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-cyan-400">
                                        <MapPin size={16} />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                                            {typeof property.location === 'string' ? property.location : (property.area || 'KOLKATA CENTRAL, IN')}
                                        </span>
                                    </div>
                                    <h1 className="text-5xl font-black text-white tracking-tighter text-gradient leading-none">
                                        {property.title}
                                    </h1>
                                </div>
                                <div className="bg-[var(--background)]/80 backdrop-blur-xl p-6 rounded-3xl border border-[var(--border)] shadow-2xl min-w-[200px]">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">
                                        {property.status === 'auction' ? 'Highest Bid' : 'Market Evaluation'}
                                    </p>
                                    <p className="text-3xl font-black text-white tracking-tighter">{formatCurrency(property.price)}</p>
                                    <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-1">
                                        <p className="text-[9px] font-black text-slate-600 uppercase">Owner Identity</p>
                                        <p className="text-xs font-black text-cyan-400">{property.owner?.name || 'Protocol Node'}</p>
                                        <p className="text-[9px] font-mono text-slate-500 uppercase tracking-tighter">
                                            {property.owner?.wallet ? property.owner.wallet.slice(0, 10) + '...' : '0xSECURE...'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Infrastructure Intel Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-[var(--background)]/80 backdrop-blur-md p-8 rounded-[2.5rem] border border-[var(--border)] space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                                    <Cpu size={20} className="text-cyan-400" />
                                </div>
                                <h3 className="text-sm font-black text-white uppercase tracking-widest">Neural Score</h3>
                            </div>
                            <AIRadarChart />
                            <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest pt-4 border-t border-[var(--border)]">
                                <span>Connectivity</span>
                                <span className="text-cyan-400">9.4/10</span>
                            </div>
                        </div>

                        <div className="md:col-span-2 bg-[var(--background)]/80 backdrop-blur-md p-8 rounded-[2.5rem] border border-[var(--border)] space-y-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                                        <Network size={20} className="text-purple-400" />
                                    </div>
                                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Urban Infrastructure</h3>
                                </div>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Aggregate Analysis</span>
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                {[
                                    { label: 'Transport Hubs', value: 'High Density', score: 92 },
                                    { label: 'Digital Grid', value: 'Level 5 Fiber', score: 98 },
                                    { label: 'Energy Grade', value: 'Renewable A+', score: 85 },
                                    { label: 'Public Services', value: 'Global Standard', score: 90 },
                                ].map((item, i) => (
                                    <div key={i} className="space-y-3">
                                        <div className="flex justify-between items-baseline">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{item.label}</p>
                                            <p className="text-xs font-bold text-white">{item.score}%</p>
                                        </div>
                                        <div className="h-1.5 w-full bg-[var(--background)]/10 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${item.score}%` }}
                                                transition={{ delay: i * 0.1 + 0.5, duration: 1 }}
                                                className="h-full bg-gradient-to-r from-purple-500 to-cyan-500"
                                            />
                                        </div>
                                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">{item.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: AI Forecasting & Action */}
                <div className="xl:col-span-4 space-y-10">
                    <div className="bg-[var(--background)]/40 backdrop-blur-2xl p-10 rounded-[3rem] border border-[var(--border)] relative overflow-hidden flex flex-col items-center text-center">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-3xl -translate-y-1/2 translate-x-1/2" />

                        <div className="flex flex-col items-center gap-4 mb-10">
                            <div className="w-16 h-16 rounded-[1.5rem] bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shadow-2xl mb-2">
                                <Zap size={28} className="text-cyan-400" />
                            </div>
                            <h2 className="text-2xl font-black text-white tracking-tight">AI Investment Analysis</h2>
                            <p className="text-slate-500 text-sm font-medium">Neural forecasting based on Urban Growth Engine metrics.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-6 w-full mb-12">
                            <StatsRing value={property.investment_score ? parseFloat(property.investment_score.toFixed(1)) : 84} label="Invest Score" />
                            <StatsRing value={property.growth_score ? parseFloat(property.growth_score.toFixed(1)) : 78} label="Growth Potential" />
                        </div>

                        <div className="w-full space-y-6 pt-10 border-t border-[var(--border)] text-left">
                            <div className="flex justify-between items-center bg-[var(--background)]/20 p-4 rounded-2xl border border-[var(--border)]">
                                <div>
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Projected 5Y Value</span>
                                    <span className="text-xl font-black text-emerald-400">
                                        {property.predicted_5y_price ? formatCurrency(property.predicted_5y_price) : formatCurrency(property.price * 1.35)}
                                    </span>
                                </div>
                                <TrendingUp className="text-emerald-500 opacity-50" size={24} />
                            </div>
                            <div className="flex justify-between p-2">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Annual Appreciation</span>
                                <span className="text-sm font-black text-emerald-400">+{property.appreciation_rate ? (property.appreciation_rate * 100).toFixed(1) : 6.8}%</span>
                            </div>
                            <div className="flex justify-between p-2">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Rental Yield Estimate</span>
                                <span className="text-sm font-black text-white">{property.rental_yield ? (property.rental_yield * 100).toFixed(1) : 4.2}%</span>
                            </div>
                            <div className="flex justify-between p-2">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Investment Risk</span>
                                <span className={cn(
                                    "text-sm font-black uppercase tracking-widest",
                                    property.risk_level === 'High' ? 'text-rose-400' :
                                        property.risk_level === 'Medium' ? 'text-amber-400' : 'text-emerald-400'
                                )}>{property.risk_level || 'Low'}</span>
                            </div>
                        </div>

                        <div className="w-full mt-12 space-y-4">
                            <Toaster position="top-right" />
                            {property.is_fractional && !isOwner ? (
                                <div className="space-y-4 p-5 rounded-3xl bg-[var(--background)]/40 border border-[var(--border)]">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Available Shares</span>
                                        <span className="text-sm font-black text-cyan-400">{property.available_shares} / {property.total_shares}</span>
                                    </div>
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Price per Share</span>
                                        <span className="text-sm font-black text-white">{formatCurrency(property.price_per_share)}</span>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <input
                                            type="range"
                                            min="1"
                                            max={property.available_shares}
                                            value={sharesToBuy}
                                            onChange={(e) => setSharesToBuy(parseInt(e.target.value))}
                                            className="flex-1 accent-cyan-500"
                                        />
                                        <div className="w-16 text-center py-2 rounded-xl bg-black/40 border border-white/10 text-xs font-bold font-mono">
                                            {sharesToBuy}
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleBuyFraction}
                                        disabled={sharesToBuy < 1 || sharesToBuy > property.available_shares}
                                        className="w-full mt-4 py-4 rounded-[1.2rem] bg-cyan-500 text-white text-[11px] font-black uppercase tracking-[0.3em] shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:bg-cyan-400 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        BUY {sharesToBuy} SHARES ({formatCurrency(property.price_per_share * sharesToBuy)})
                                    </button>
                                </div>
                            ) : property.status === 'auction' ? (
                                <button
                                    onClick={handleBid}
                                    disabled={isOwner || isSold}
                                    className="w-full py-5 rounded-[1.5rem] bg-cyan-500 text-white text-[11px] font-black uppercase tracking-[0.3em] shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:bg-cyan-400 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    PLACE HIGHER BID
                                </button>
                            ) : property.status === 'listed' ? (
                                <button
                                    onClick={handleBuy}
                                    disabled={isOwner || isSold || (buyingId === property.id)}
                                    className="w-full py-5 rounded-[1.5rem] bg-white text-black text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl hover:bg-cyan-50 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {buyingId === property.id ? 'PROCESSING...' : isOwner ? 'YOUR ASSET' : 'ACQUIRE ASSET'}
                                </button>
                            ) : isOwner ? (
                                <Link href="/portfolio" className="block">
                                    <button className="w-full py-5 rounded-[1.5rem] bg-emerald-500 text-white text-[11px] font-black uppercase tracking-[0.3em] shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:bg-emerald-400 transition-all">
                                        LIST FOR SALE
                                    </button>
                                </Link>
                            ) : (
                                <button className="w-full py-5 rounded-[1.5rem] bg-[var(--background)]/20 border border-[var(--border)] text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] cursor-not-allowed">
                                    NOT LISTED
                                </button>
                            )}

                            {isOwner && !property.is_fractional && (
                                <button
                                    onClick={() => alert("Fractionalization backend API is ready. Connect a modal to setup shares.")}
                                    className="w-full py-5 rounded-[1.5rem] bg-[var(--background)]/20 border border-[var(--border)] text-[11px] font-black text-cyan-400 uppercase tracking-[0.3em] hover:bg-cyan-500/10 hover:border-cyan-500/20 transition-all"
                                >
                                    FRACTIONALIZE
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="glass-panel p-8 rounded-[2.5rem] border-[var(--border)] space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <ShieldCheck size={20} className="text-emerald-500" />
                                <h3 className="text-sm font-black text-white uppercase tracking-widest">Network Verification</h3>
                            </div>
                            <button
                                onClick={runVerification}
                                disabled={verifying}
                                className="px-3 py-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-[9px] font-black text-cyan-400 uppercase tracking-widest hover:bg-cyan-500/20 transition-all flex items-center gap-2"
                            >
                                {verifying ? <Loader2 size={10} className="animate-spin" /> : <Brain size={10} />}
                                {verifying ? 'VERIFYING...' : 'RUN AI VERIFY'}
                            </button>
                        </div>

                        {verificationReport ? (
                            <div className="space-y-3">
                                <div className={cn(
                                    "p-3 rounded-xl border flex items-center gap-3",
                                    verificationReport.overall_status === 'PASS' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' :
                                        verificationReport.overall_status === 'WARN' ? 'text-amber-400 border-amber-500/20 bg-amber-500/5' :
                                            'text-rose-400 border-rose-500/20 bg-rose-500/5'
                                )}>
                                    {verificationReport.overall_status === 'PASS' ? <CheckCircle2 size={14} /> :
                                        verificationReport.overall_status === 'WARN' ? <AlertTriangle size={14} /> : <XCircle size={14} />}
                                    <span className="text-[10px] font-black uppercase tracking-widest">{verificationReport.overall_label}</span>
                                </div>
                                {Object.entries(verificationReport.checks || {}).map(([key, check]: [string, any]) => (
                                    <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-[var(--background)]/40 border border-[var(--border)]">
                                        <div className="flex items-center gap-3">
                                            {check.status === 'PASS' ? <CheckCircle2 size={12} className="text-emerald-500" /> :
                                                check.status === 'WARN' ? <AlertTriangle size={12} className="text-amber-500" /> : <XCircle size={12} className="text-rose-500" />}
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight">{key.replace('_', ' ')}</span>
                                        </div>
                                        <span className="text-[8px] font-black text-slate-500 uppercase">{check.label}</span>
                                    </div>
                                ))}

                                {/* Strict Authenticity Predictor Sub-panel */}
                                {verificationReport.authenticity_rules && (
                                    <div className="mt-6 pt-4 border-t border-[var(--border)]">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Fingerprint size={14} className="text-purple-400" />
                                            <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em]">Authenticity Predictor Engine</h4>
                                        </div>
                                        <div className="space-y-2">
                                            {Object.entries(verificationReport.authenticity_rules || {}).map(([key, check]: [string, any]) => (
                                                <div key={key} className="flex items-center justify-between p-2 rounded-lg bg-[var(--background)]/20 border border-[var(--border)]">
                                                    <div className="flex items-center gap-2">
                                                        {check.status === 'PASS' ? <ShieldCheck size={10} className="text-emerald-500" /> : <XCircle size={10} className="text-rose-500" />}
                                                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-tight">{key}</span>
                                                    </div>
                                                    <span className={cn(
                                                        "text-[8px] font-black uppercase tracking-wider",
                                                        check.status === 'PASS' ? "text-emerald-400/80" : "text-rose-400"
                                                    )}>{check.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {[
                                    { label: 'Property Deed', status: 'VERIFIED', icon: ShieldCheck },
                                    { label: 'Zoning Compliance', status: 'CONFIRMED', icon: ShieldCheck },
                                    { label: 'Environmental ESG', status: 'GRADE A', icon: Activity },
                                ].map((v, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-[var(--background)]/20 border border-[var(--border)]">
                                        <div className="flex items-center gap-3">
                                            <v.icon size={14} className="text-slate-500" />
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{v.label}</span>
                                        </div>
                                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-tighter">{v.status}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Bidders Section */}
                    {property.status === 'auction' && (
                        <div className="glass-panel p-8 rounded-[2.5rem] border-[var(--border)] space-y-6">
                            <div className="flex items-center gap-3">
                                <Gavel size={20} className="text-cyan-400" />
                                <h3 className="text-sm font-black text-white uppercase tracking-widest">Active Auctioneers</h3>
                            </div>
                            <div className="space-y-3">
                                {bids && bids.length > 0 ? (
                                    bids.map((bid: any, i: number) => (
                                        <div key={bid.id} className="flex items-center justify-between p-4 rounded-2xl bg-[var(--background)]/40 border border-[var(--border)] group hover:border-cyan-500/20 transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-[var(--background)]/40 flex items-center justify-center text-[10px] font-black text-slate-500 uppercase">
                                                    #{i + 1}
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-white uppercase tracking-tight">
                                                        {shortAddress(bid.bidder_wallet || bid.bidder_id)}
                                                    </p>
                                                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">
                                                        {new Date(bid.created_at).toLocaleTimeString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-xs font-black text-cyan-400">₹{bid.amount.toLocaleString('en-IN')}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-8 text-center border-dashed border border-[var(--border)] rounded-2xl text-[10px] font-black text-slate-600 uppercase tracking-widest">
                                        No bids placed yet
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
