'use client'

import { motion } from 'framer-motion'
import {
    TrendingUp, Building2, ShoppingBag, Brain,
    ArrowUpRight, ArrowRight, Activity, Zap,
    Globe, ShieldCheck, BarChart3, Fingerprint,
    Cpu, Layers, Network, ScanLine, MapPin,
    Bell, Clock, Flame, Eye, DiamondIcon,
    ChevronRight, Wallet, CheckCircle2, Tag, Truck
} from 'lucide-react'
import Link from 'next/link'
import { usePropertyStore } from '@/store/propertyStore'
import { usePortfolioStore } from '@/store/portfolioStore'
import { useMarketplaceStore } from '@/store/marketplaceStore'
import { useDashboardStore } from '@/store/dashboardStore'
import { useEffect } from 'react'
import { formatCurrency, cn } from '@/lib/utils'

/* ──────────────────────── ANIMATION PRESET ──────────────────────── */
const fadeUp = (d = 0) => ({
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: d, duration: 0.55, ease: [0.22, 0.8, 0.36, 1] },
})

/* ──────────────────────── MINI CHART ──────────────────────── */
function MiniChart({ data, color = '#0ea5e9', height = 60 }: { data: number[]; color?: string; height?: number }) {
    if (!data.length) return null
    const max = Math.max(...data, 1)
    const points = data.map((v, i) => {
        const x = (i / (data.length - 1 || 1)) * 100
        const y = height - (v / max) * height
        return `${x},${y}`
    }).join(' ')
    return (
        <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="overflow-visible">
            <defs>
                <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
            <polygon fill={`url(#grad-${color.replace('#', '')})`} points={`0,${height} ${points} 100,${height}`} />
        </svg>
    )
}

/* ──────────────────────── WIDGET WRAPPER ──────────────────────── */
function Widget({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
    return (
        <motion.div
            {...fadeUp(delay)}
            className={cn(
                "relative group rounded-[1.5rem] border border-white/[0.06] bg-[#0d1117]/80 backdrop-blur-xl overflow-hidden transition-all duration-500 hover:border-cyan-500/20",
                className,
            )}
        >
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            {children}
        </motion.div>
    )
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN DASHBOARD — Command Portal (Live Data)
   ═══════════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
    const { properties, fetchProperties, loading: pLoading } = usePropertyStore()
    const { total_current_value, total_invested, assets, fetchPortfolio, loading: portLoading } = usePortfolioStore()
    const { listings, fetchListings, loading: mLoading } = useMarketplaceStore()
    const { trendingZones, fetchDashboardData, loading: dLoading } = useDashboardStore()

    useEffect(() => {
        fetchProperties()
        fetchPortfolio()
        fetchListings()
        fetchDashboardData()
    }, [])

    /* ────── COMPUTED LIVE VALUES ────── */
    const portfolioValue = total_current_value || 0
    const totalInvested = total_invested || 0
    const growthPercent = totalInvested > 0 ? ((portfolioValue - totalInvested) / totalInvested * 100).toFixed(1) : '0'
    const investmentScore = Math.min(9.9, Math.max(0, (portfolioValue > 0 ? 6.5 + (Number(growthPercent) / 10) : 0))).toFixed(1)
    const scoreLabel = Number(investmentScore) >= 8 ? 'Excellent' : Number(investmentScore) >= 6 ? 'Good' : Number(investmentScore) >= 4 ? 'Fair' : 'Emerging'

    // Derive chart data from property prices (top 12 binned)
    const priceData = properties.slice(0, 12).map((p: any) => p.price || 0)
    const chartData = priceData.length ? priceData : [0]

    // Build live alerts from trending zones
    const alertIcons = [Truck, Flame, MapPin, Activity, Zap]
    const alertColors = ['text-blue-400', 'text-amber-400', 'text-emerald-400', 'text-cyan-400', 'text-purple-400']
    const liveAlerts = trendingZones.length > 0
        ? trendingZones.slice(0, 3).map((z, i) => ({
            icon: alertIcons[i % alertIcons.length],
            text: `Zone ${z.grid_key} — Growth ${z.growth_signal.toFixed(1)}%, ${z.property_count} properties`,
            time: z.tier === 'hot' ? 'Active' : 'Trending',
            color: alertColors[i % alertColors.length],
        }))
        : [
            { icon: Activity, text: 'Loading intelligence feed...', time: 'Syncing', color: 'text-slate-400' },
        ]

    // Live marketplace cards (first 2 listings)
    const nftCards = listings.slice(0, 2).map((l: any) => ({
        name: l.property_title || l.title || 'Urban Node',
        eth: l.price_listed_matic ? `${l.price_listed_matic}` : '—',
        price: formatCurrency(l.price || 0),
        img: l.image_url || '',
    }))
    // Fallback if no listings
    if (!nftCards.length) {
        nftCards.push({ name: 'No Active Listings', eth: '—', price: '—', img: '' })
    }

    // Compute asset breakdown from portfolio assets
    const computeBreakdown = () => {
        if (!assets.length) return [
            { label: 'Residential', pct: 0, color: 'bg-cyan-500' },
            { label: 'Commercial', pct: 0, color: 'bg-purple-500' },
            { label: 'Other', pct: 0, color: 'bg-slate-500' },
        ]
        let residential = 0, commercial = 0, other = 0
        assets.forEach((a: any) => {
            const title = (a.title || '').toLowerCase()
            if (title.includes('apartment') || title.includes('flat') || title.includes('residential') || title.includes('loft') || title.includes('villa')) residential++
            else if (title.includes('office') || title.includes('commercial') || title.includes('shop') || title.includes('retail')) commercial++
            else other++
        })
        const total = assets.length || 1
        return [
            { label: 'Residential', pct: Math.round((residential / total) * 100), color: 'bg-cyan-500' },
            { label: 'Commercial', pct: Math.round((commercial / total) * 100), color: 'bg-purple-500' },
            { label: 'Other', pct: Math.round((other / total) * 100), color: 'bg-slate-500' },
        ]
    }
    const assetBreakdown = computeBreakdown()

    // Dynamic Web3 Timeline based on user's newest asset
    const currentYear = new Date().getFullYear()
    const latestAsset = assets.length > 0 ? assets[0] : null // Assuming sorted newest first
    const isAssetNft = latestAsset?.is_nft || latestAsset?.nft_token_id

    // If they own an asset, all steps are "done" up to Sold.
    const timelineDone = {
        minted: !!latestAsset,
        verified: !!latestAsset,
        listed: listings.length > 0 || !!latestAsset,
        sold: !!latestAsset
    }

    // In a real app, these would come from blockchain graph data. Using relative months for simulation.
    const tMonth = new Date().getMonth()
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const timelineDates = timelineDone.sold
        ? [monthNames[Math.max(0, tMonth - 3)], monthNames[Math.max(0, tMonth - 2)], monthNames[Math.max(0, tMonth - 1)], monthNames[tMonth]]
        : ['---', '---', '---', '---']

    const timelineSteps = ['Minted', 'Verified', 'Listed', 'Sold']

    return (
        <div className="space-y-6">
            {/* ─── BENTO GRID ─── */}
            <div className="grid grid-cols-12 gap-5 auto-rows-min">

                {/* ╔═══════════════════════════════════════════════════╗
                   ║  1. SMARTCITY DASHBOARD  (spans 5 cols, 2 rows)  ║
                   ╚═══════════════════════════════════════════════════╝ */}
                <Widget className="col-span-12 lg:col-span-5 row-span-2 p-0" delay={0}>
                    {/* City Image BG */}
                    <div className="relative h-48 bg-gradient-to-br from-cyan-900/30 via-slate-900 to-indigo-900/30 overflow-hidden">
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%20200%20200%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cfilter%20id%3D%22f%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%220.65%22%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20filter%3D%22url(%23f)%22%2F%3E%3C%2Fsvg%3E')] opacity-5" />
                        <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-[#0d1117] to-transparent" />

                        {/* Title Overlay */}
                        <div className="absolute top-5 left-6 z-10">
                            <h2 className="text-lg font-black text-white tracking-tight">System Overview</h2>
                        </div>

                        {/* Portfolio Value Card */}
                        <div className="absolute bottom-4 left-6 z-10">
                            <div className="glass-panel rounded-2xl px-5 py-3">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Portfolio Value</p>
                                <h3 className="text-2xl font-black text-white tracking-tight">
                                    {portfolioValue > 0 ? formatCurrency(portfolioValue) : '—'}
                                </h3>
                            </div>
                        </div>

                        {/* AI Investment Score Card */}
                        <div className="absolute bottom-4 right-6 z-10">
                            <div className="glass-panel rounded-2xl px-5 py-3 flex items-center gap-4">
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Investment Rating</p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl font-black text-white">{investmentScore}</span>
                                        <span className="text-xs font-bold text-emerald-400">{scoreLabel}</span>
                                    </div>
                                </div>
                                <ArrowUpRight size={18} className="text-cyan-400" />
                            </div>
                        </div>
                    </div>

                    {/* Bottom Section */}
                    <div className="p-6 space-y-4">
                        {/* Growth Heatmap mini */}
                        <div>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Market Growth</p>
                            <MiniChart data={chartData} color="#0ea5e9" height={50} />
                        </div>

                        {/* Trending Zones */}
                        <div className="flex items-center gap-3 pt-2">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                                <Activity size={12} className="text-cyan-400" />
                                <span className="text-[10px] font-black text-cyan-400 uppercase tracking-wider">Trending Zones</span>
                            </div>
                            {trendingZones.slice(0, 1).map((z) => (
                                <div key={z.grid_key} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                                    <Zap size={12} className="text-amber-400" />
                                    <span className="text-[10px] font-bold text-slate-300">Zone {z.grid_key}</span>
                                    <ChevronRight size={12} className="text-slate-500" />
                                </div>
                            ))}
                        </div>
                    </div>
                </Widget>

                {/* ╔═══════════════════════════════════════════════════╗
                   ║  2. INTERACTIVE SMART MAP  (spans 7 cols, 2 rows) ║
                   ╚═══════════════════════════════════════════════════╝ */}
                <Widget className="col-span-12 lg:col-span-7 row-span-2" delay={0.1}>
                    <div className="p-6 h-full flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-black text-white tracking-tight">Property Map</h2>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                                    <Globe size={12} />
                                    <span>Listings: <span className="text-white font-black">{properties.length}</span></span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-400">
                                    <TrendingUp size={12} />
                                    <span>Growth: {Number(growthPercent) > 0 ? '+' : ''}{growthPercent}%</span>
                                </div>
                            </div>
                        </div>

                        {/* Map Placeholder with gradient */}
                        <Link href="/map" className="flex-1 relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#0a1628] via-[#0f1d32] to-[#0d1117] border border-white/[0.04] min-h-[220px] cursor-pointer group/map">
                            {/* Grid overlay */}
                            <div className="absolute inset-0 grid-bg opacity-30" />
                            {/* Heatmap glow spots */}
                            <div className="absolute top-[30%] left-[40%] w-24 h-24 bg-cyan-500/20 rounded-full blur-2xl animate-pulse" />
                            <div className="absolute top-[50%] left-[60%] w-16 h-16 bg-blue-500/15 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }} />
                            <div className="absolute top-[40%] left-[25%] w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }} />

                            {/* Layer toggles */}
                            <div className="absolute top-4 left-4 z-10 space-y-2">
                                {['Heatmap', 'Zones', 'Transit'].map((label, i) => (
                                    <div key={label} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm border border-white/[0.06]">
                                        <div className={cn("w-2 h-2 rounded-full", i === 0 ? 'bg-cyan-500' : i === 1 ? 'bg-purple-500' : 'bg-amber-500')} />
                                        <span className="text-[10px] font-bold text-slate-300">{label}</span>
                                    </div>
                                ))}
                            </div>

                            {/* "Open Map" hover CTA */}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover/map:opacity-100 transition-opacity z-10">
                                <div className="px-6 py-3 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 backdrop-blur-sm">
                                    <span className="text-xs font-black text-cyan-300 uppercase tracking-widest">Open Property Map →</span>
                                </div>
                            </div>
                        </Link>
                    </div>
                </Widget>

                {/* ╔═══════════════════════════════════════════════════╗
                   ║  3. AI PREDICTION INSIGHTS  (spans 4 cols)       ║
                   ╚═══════════════════════════════════════════════════╝ */}
                <Widget className="col-span-12 md:col-span-6 lg:col-span-4" delay={0.15}>
                    <div className="p-6 space-y-5">
                        <h2 className="text-lg font-black text-white tracking-tight">AI Prediction Insights</h2>

                        <div className="flex items-center gap-6">
                            <div>
                                <span className={cn(
                                    "text-4xl font-black tracking-tighter",
                                    Number(growthPercent) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                )}>
                                    {Number(growthPercent) > 0 ? '+' : ''}{growthPercent}%
                                </span>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <Brain size={14} className="text-purple-400" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        {Number(growthPercent) >= 10 ? 'High Confidence' : 'Moderate Confidence'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <ShieldCheck size={14} className="text-emerald-400" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        {Number(growthPercent) >= 5 ? 'Low Risk' : 'Moderate Risk'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-white/[0.06]" />

                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Cpu size={12} /> Future Growth Projection
                            </p>
                            <ul className="space-y-2">
                                {trendingZones.slice(0, 2).map((z) => (
                                    <li key={z.grid_key} className="flex items-center gap-3 text-xs font-bold text-slate-300">
                                        <div className={cn("w-1.5 h-1.5 rounded-full", z.tier === 'hot' ? 'bg-cyan-500' : 'bg-emerald-500')} />
                                        Zone {z.grid_key}: {z.growth_signal.toFixed(1)}% growth signal
                                    </li>
                                ))}
                                {!trendingZones.length && (
                                    <li className="flex items-center gap-3 text-xs font-bold text-slate-500">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                                        Loading intelligence data...
                                    </li>
                                )}
                            </ul>
                        </div>

                        <Link href="/prediction" className="block w-full py-3 rounded-xl bg-gradient-to-r from-purple-600/80 to-cyan-600/80 text-center text-[10px] font-black text-white uppercase tracking-[0.2em] hover:from-purple-500 hover:to-cyan-500 transition-all active:scale-[0.98]">
                            Run AI Forecast →
                        </Link>
                    </div>
                </Widget>

                {/* ╔═══════════════════════════════════════════════════╗
                   ║  4. NFT MARKETPLACE  (spans 4 cols)              ║
                   ╚═══════════════════════════════════════════════════╝ */}
                <Widget className="col-span-12 md:col-span-6 lg:col-span-4" delay={0.2}>
                    <div className="p-6 space-y-5">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-black text-white tracking-tight">NFT Marketplace</h2>
                            <div className="flex gap-2">
                                <button className="px-3 py-1 rounded-lg bg-cyan-500/10 text-[10px] font-black text-cyan-400 uppercase tracking-wider border border-cyan-500/20">Buy</button>
                                <button className="px-3 py-1 rounded-lg bg-white/[0.03] text-[10px] font-black text-slate-400 uppercase tracking-wider border border-white/[0.06]">List for Sale</button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {nftCards.map((card, idx) => (
                                <div key={idx} className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden hover:border-cyan-500/20 transition-colors group/card">
                                    {/* Card image area */}
                                    <div className="h-24 bg-gradient-to-br from-blue-900/40 to-indigo-900/40 flex items-center justify-center text-3xl relative overflow-hidden group/img">
                                        {card.img ? (
                                            <img src={card.img} alt={card.name} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover/img:scale-110 transition-transform duration-700" />
                                        ) : (
                                            <Building2 size={32} className="text-slate-600" />
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1117] via-[#0d1117]/40 to-transparent" />
                                    </div>
                                    <div className="p-3 space-y-2">
                                        <p className="text-xs font-black text-white truncate">{card.name}</p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-cyan-400 flex items-center gap-1">
                                                <DiamondIcon size={10} /> {card.eth} MATIC
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400">{card.price}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button className="flex-1 py-1.5 rounded-lg bg-cyan-500/10 text-[9px] font-black text-cyan-400 uppercase tracking-wider border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors">Buy</button>
                                            <button className="flex-1 py-1.5 rounded-lg bg-white/[0.03] text-[9px] font-black text-slate-400 uppercase tracking-wider border border-white/[0.06] hover:bg-white/[0.06] transition-colors">List</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <Link href="/marketplace" className="flex items-center justify-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors py-2">
                            View All Listings <ArrowRight size={12} />
                        </Link>
                    </div>
                </Widget>

                {/* ╔═══════════════════════════════════════════════════╗
                   ║  5. PORTFOLIO OVERVIEW  (spans 4 cols)           ║
                   ╚═══════════════════════════════════════════════════╝ */}
                <Widget className="col-span-12 md:col-span-6 lg:col-span-4" delay={0.25}>
                    <div className="p-6 space-y-5">
                        <h2 className="text-lg font-black text-white tracking-tight">Portfolio Overview</h2>

                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <BarChart3 size={14} className="text-cyan-400" />
                                <span className="text-[10px] font-bold text-slate-400">Total Value</span>
                            </div>
                            <span className="text-xl font-black text-white tracking-tight">
                                {portfolioValue > 0 ? formatCurrency(portfolioValue) : '—'}
                            </span>
                            {totalInvested > 0 && (
                                <span className="text-xs font-bold text-emerald-400">
                                    Invested: {formatCurrency(totalInvested)}
                                </span>
                            )}
                        </div>

                        {/* Chart */}
                        <div className="h-[90px]">
                            <MiniChart
                                data={assets.length ? assets.map((a: any) => a.current_value || a.current_price || 0) : chartData}
                                color="#22d3ee"
                                height={90}
                            />
                        </div>

                        {/* Asset Breakdown */}
                        <div className="space-y-3">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                Asset Breakdown ({assets.length} nodes)
                            </p>
                            {assetBreakdown.map((a) => (
                                <div key={a.label} className="flex items-center gap-3">
                                    <span className="text-[10px] font-bold text-slate-400 w-20">{a.label}</span>
                                    <div className="flex-1 h-2 bg-white/[0.04] rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${a.pct}%` }}
                                            transition={{ delay: 0.5, duration: 1 }}
                                            className={cn("h-full rounded-full", a.color)}
                                        />
                                    </div>
                                    <span className="text-[10px] font-black text-white w-8 text-right">{a.pct}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Widget>

                {/* ╔═══════════════════════════════════════════════════╗
                   ║  6. LIVE INTEL FEED  (spans 4 cols)             ║
                   ╚═══════════════════════════════════════════════════╝ */}
                <Widget className="col-span-12 md:col-span-6 lg:col-span-4" delay={0.3}>
                    <div className="p-6 space-y-4">
                        {/* Urban Intel Feed Chart */}
                        <div className="space-y-4 mb-2">
                            <MiniChart
                                data={trendingZones.map(z => z.growth_signal * 100).concat(properties.slice(0, 5).map((p: any) => (p.price || 0) / 100000))}
                                color="#a855f7"
                                height={40}
                            />
                        </div>

                        {liveAlerts.map((alert, i) => (
                            <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors cursor-pointer group/alert">
                                <alert.icon size={16} className={alert.color} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-200 truncate group-hover/alert:text-white transition-colors">{alert.text}</p>
                                </div>
                                <span className="text-[9px] font-bold text-slate-500 shrink-0">{alert.time}</span>
                                <ChevronRight size={12} className="text-slate-600 shrink-0" />
                            </div>
                        ))}
                    </div>
                </Widget>

                {/* ╔═══════════════════════════════════════════════════╗
                   ║  7. SMART ALERTS  (spans 4 cols)                 ║
                   ╚═══════════════════════════════════════════════════╝ */}
                <Widget className="col-span-12 md:col-span-6 lg:col-span-4" delay={0.35}>
                    <div className="p-6 space-y-4">
                        <div className="flex items-center gap-2">
                            <Bell size={16} className="text-amber-400" />
                            <h2 className="text-lg font-black text-white tracking-tight">Smart Alerts</h2>
                        </div>

                        {liveAlerts.map((alert, i) => (
                            <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors cursor-pointer">
                                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                    i === 0 ? 'bg-blue-500/10' : i === 1 ? 'bg-amber-500/10' : 'bg-emerald-500/10',
                                )}>
                                    <alert.icon size={14} className={alert.color} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-200 truncate">{alert.text}</p>
                                </div>
                                <span className="text-[9px] font-bold text-slate-500 shrink-0">{alert.time}</span>
                            </div>
                        ))}
                    </div>
                </Widget>

                {/* ╔═══════════════════════════════════════════════════╗
                   ║  8. WEB3 OWNERSHIP TIMELINE  (spans 4 cols)      ║
                   ╚═══════════════════════════════════════════════════╝ */}
                <Widget className="col-span-12 md:col-span-6 lg:col-span-4" delay={0.4}>
                    <div className="p-6 space-y-5">
                        <h2 className="text-lg font-black text-white tracking-tight">Web3 Ownership Timeline</h2>

                        {/* Timeline steps */}
                        <div className="flex items-center justify-between">
                            {timelineSteps.map((step) => (
                                <div key={step} className="flex flex-col items-center gap-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{step}</span>
                                </div>
                            ))}
                        </div>

                        {/* Progress Line */}
                        <div className="relative">
                            <div className="h-1 bg-white/[0.04] rounded-full">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: timelineDone.sold ? '100%' : timelineDone.listed ? '75%' : timelineDone.verified ? '50%' : timelineDone.minted ? '25%' : '0%' }}
                                    transition={{ delay: 0.6, duration: 1.2, ease: 'easeOut' }}
                                    className={cn(
                                        "h-full rounded-full relative",
                                        isAssetNft
                                            ? "bg-gradient-to-r from-cyan-500 to-blue-500"
                                            : "bg-gradient-to-r from-emerald-500 to-emerald-400"
                                    )}
                                >
                                    <div className={cn(
                                        "absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-[#0d1117]",
                                        isAssetNft ? "bg-cyan-400 shadow-[0_0_10px_#0ea5e9]" : "bg-emerald-400 shadow-[0_0_10px_#34d399]"
                                    )} />
                                </motion.div>
                            </div>

                            {/* Date labels */}
                            <div className="flex items-center justify-between mt-3 px-2">
                                {timelineDates.map((d, i) => (
                                    <span key={i} className="text-[9px] font-bold text-slate-600">{d}</span>
                                ))}
                            </div>
                        </div>

                        {/* Status badges */}
                        <div className="flex gap-2 flex-wrap">
                            {[
                                { label: 'Minted', icon: Fingerprint, done: timelineDone.minted },
                                { label: 'Verified', icon: CheckCircle2, done: timelineDone.verified },
                                { label: 'Listed', icon: Tag, done: timelineDone.listed },
                                { label: 'Acquired', icon: Wallet, done: timelineDone.sold },
                            ].map((s) => (
                                <div key={s.label} className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-wider",
                                    s.done
                                        ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                                        : 'bg-white/[0.02] border-white/[0.06] text-slate-500'
                                )}>
                                    <s.icon size={10} />
                                    {s.label}
                                </div>
                            ))}
                        </div>
                    </div>
                </Widget>

            </div>
        </div>
    )
}
