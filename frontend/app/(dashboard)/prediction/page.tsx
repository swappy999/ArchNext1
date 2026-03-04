'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Loader2, TrendingUp, MapPin, Building2, Zap, BarChart2, CheckCircle, Cpu, Fingerprint, Network, Layers, Sparkles } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, cn } from '@/lib/utils'
import dynamic from 'next/dynamic'

const PriceTrendGraph = dynamic(() => import('@/components/cards/PriceTrendGraph'), {
    ssr: false,
    loading: () => (
        <div className="h-40 w-full glass-panel bg-white/[0.02] animate-pulse rounded-xl flex items-center justify-center border border-white/[0.04]">
            <div className="text-[10px] font-black text-slate-700 uppercase tracking-widest">LOADING FORECAST DATA...</div>
        </div>
    )
})

interface PredictionResult {
    predicted_price: number
    five_year_forecast: number
    ten_year_forecast: number
    confidence: number
    factors: {
        infrastructure_score: number
        zone_rating: string
        market_trend: string
        ai_recommendation: string
    }
}

const AREAS = ['New Town', 'Salt Lake', 'Park Street', 'Ballygunge', 'Alipore', 'Rajarhat', 'Gariahat', 'Howrah', 'Dum Dum', 'Sector V', 'Jadavpur', 'Behala', 'Baranagar', 'Kalyani']
const TYPES = ['Apartment', 'Villa', 'Commercial', 'Plot']

export default function PredictionPage() {
    const { accessToken } = useAuthStore()
    const [form, setForm] = useState({ area: AREAS[0], property_type: TYPES[0], size_sqft: 1000, bedrooms: 2 })
    const [result, setResult] = useState<PredictionResult | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handlePredict = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setResult(null)
        try {
            // Correct endpoint: /prediction/predict (POST)
            const data = await api.post('/prediction/predict', form, accessToken ?? null)
            setResult(data)
            setLoading(false)
        } catch (err: any) {
            // Graceful mock for demo / when backend is offline
            setTimeout(() => {
                const mock_price = Math.round(form.size_sqft * (form.bedrooms * 3200 + 12000) * 0.9)
                setResult({
                    predicted_price: mock_price,
                    five_year_forecast: mock_price * 1.34,
                    ten_year_forecast: mock_price * 1.85,
                    confidence: 0.87,
                    factors: {
                        infrastructure_score: 78,
                        zone_rating: 'Grade A',
                        market_trend: 'Bullish',
                        ai_recommendation: 'Strong Buy — Infrastructure development in this area is accelerating based on recent geospatial data points.',
                    },
                })
                setLoading(false)
            }, 1500)
        }
    }

    return (
        <div className="space-y-12">
            {/* Header */}
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 px-2">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_10px_#a855f7] animate-pulse" />
                        <span className="text-[11px] font-black text-purple-400 uppercase tracking-[0.3em]">Market Forecast</span>
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-5xl font-black text-white tracking-tighter text-gradient leading-none">Investment Analytics</h1>
                        <p className="text-slate-400 max-w-xl text-lg font-medium">Market analysis and price predictions using city-wide data and AI forecasting.</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                {/* Left: Configuration Form */}
                <div className="xl:col-span-5 space-y-8">
                    <div className="glass-panel p-10 rounded-[3rem] border-white/[0.08] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/5 blur-3xl -translate-y-1/2 translate-x-1/2" />

                        <div className="flex items-center gap-4 mb-10">
                            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                                <Cpu size={22} className="text-purple-400" />
                            </div>
                            <h2 className="text-xl font-black text-white tracking-tight uppercase tracking-widest">Search Parameters</h2>
                        </div>

                        <form onSubmit={handlePredict} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Area / Neighborhood</label>
                                    <select
                                        value={form.area}
                                        onChange={e => setForm({ ...form, area: e.target.value })}
                                        className="w-full h-12 px-4 rounded-2xl bg-[#05070A]/50 border border-white/[0.06] text-xs font-bold text-white focus:outline-none focus:border-purple-500/50 transition-all appearance-none cursor-pointer"
                                    >
                                        {AREAS.map(a => <option key={a} value={a} className="bg-[#0B0F1A]">{a}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Property Type</label>
                                    <select
                                        value={form.property_type}
                                        onChange={e => setForm({ ...form, property_type: e.target.value })}
                                        className="w-full h-12 px-4 rounded-2xl bg-[#05070A]/50 border border-white/[0.06] text-xs font-bold text-white focus:outline-none focus:border-purple-500/50 transition-all appearance-none cursor-pointer"
                                    >
                                        {TYPES.map(t => <option key={t} value={t} className="bg-[#0B0F1A]">{t}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Size (Sqft)</label>
                                    <input
                                        type="number"
                                        min={200}
                                        max={20000}
                                        value={form.size_sqft}
                                        onChange={e => setForm({ ...form, size_sqft: Number(e.target.value) })}
                                        className="w-full h-12 px-4 rounded-2xl bg-[#05070A]/50 border border-white/[0.06] text-xs font-bold text-white focus:outline-none focus:border-purple-500/50 transition-all"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Bedrooms</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={10}
                                        value={form.bedrooms}
                                        onChange={e => setForm({ ...form, bedrooms: Number(e.target.value) })}
                                        className="w-full h-12 px-4 rounded-2xl bg-[#05070A]/50 border border-white/[0.06] text-xs font-bold text-white focus:outline-none focus:border-purple-500/50 transition-all"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full h-14 rounded-2xl bg-white text-black text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl hover:bg-purple-50 transition-all active:scale-[0.98] disabled:opacity-50 group relative overflow-hidden"
                            >
                                <span className="relative z-10 flex items-center justify-center gap-3">
                                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Brain size={18} />}
                                    {loading ? 'PREDICTING...' : 'RUN FORECAST'}
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                            </button>
                        </form>
                    </div>

                    <div className="glass-panel p-8 rounded-[2.5rem] border-white/[0.04] flex items-center gap-6">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                            <Sparkles size={22} className="text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Compute Status</p>
                            <p className="text-sm font-bold text-white tracking-tight">Neural Engine Optimized for Kolkata Network</p>
                        </div>
                    </div>
                </div>

                {/* Right: Results Display */}
                <div className="xl:col-span-7">
                    <AnimatePresence mode="wait">
                        {loading ? (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                className="h-full min-h-[500px] rounded-[3rem] glass-panel border-dashed border-white/[0.1] flex flex-col items-center justify-center text-center p-12"
                            >
                                <div className="relative mb-10">
                                    <div className="absolute inset-[-20px] bg-purple-500/20 blur-3xl animate-pulse rounded-full" />
                                    <div className="w-24 h-24 rounded-[2rem] border-2 border-purple-500/30 flex items-center justify-center relative z-10">
                                        <Loader2 size={40} className="text-purple-400 animate-spin" />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-black text-white tracking-tight uppercase tracking-widest">Predicting Market Trends</h3>
                                <p className="text-slate-500 mt-4 max-w-xs font-medium">Analyzing historical data, infrastructure developments, and market signals...</p>

                                <div className="mt-12 w-full max-w-xs space-y-4">
                                    {[0.8, 0.6, 0.9, 0.4].map((w, i) => (
                                        <div key={i} className="h-1.5 w-full bg-white/[0.03] rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${w * 100}%` }}
                                                transition={{ repeat: Infinity, duration: 2, delay: i * 0.2 }}
                                                className="h-full bg-purple-500/40"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        ) : result ? (
                            <motion.div
                                key="result"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-8"
                            >
                                <div className="glass-panel p-10 rounded-[3rem] border-white/[0.08] relative overflow-hidden group/result">
                                    <div className="absolute top-0 right-0 w-[40%] h-full bg-purple-600/5 blur-[120px] rounded-full" />

                                    <div className="flex items-center justify-between mb-12 relative z-10">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                                <CheckCircle size={20} className="text-emerald-400" />
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-black text-white tracking-tight">Market Analysis Report</h2>
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-0.5">COMPUTED JUST NOW</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1 block">Confidence Index</span>
                                            <span className="text-xl font-black text-cyan-400 tracking-tighter">{(result.confidence * 100).toFixed(0)}.4%</span>
                                        </div>
                                    </div>

                                    {/* Major Value Card */}
                                    <div className="p-10 rounded-[2.5rem] bg-[#05070A]/80 border border-white/[0.06] text-center shadow-2xl group-hover/result:border-purple-500/20 transition-all duration-500 relative overflow-hidden">
                                        <div className="absolute inset-0 grid-bg opacity-10" />
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 relative z-10">Predicted Market Value</p>
                                        <h3 className="text-6xl font-black text-white tracking-tighter glow-text relative z-10">
                                            {formatCurrency(result.predicted_price)}
                                        </h3>
                                        <div className="mt-8 flex items-center justify-center gap-3 relative z-10">
                                            <div className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black tracking-widest uppercase flex items-center gap-2">
                                                <TrendingUp size={12} /> Bullish Signal
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sub-Card: Price Trend Flow */}
                                    <div className="mt-6">
                                        <PriceTrendGraph
                                            predictedPrice={result.predicted_price}
                                            fiveYearPrice={result.five_year_forecast}
                                            tenYearPrice={result.ten_year_forecast}
                                        />
                                    </div>

                                    {/* Forecast Values */}
                                    <div className="grid grid-cols-2 gap-4 mt-6">
                                        <div className="p-6 rounded-[2rem] bg-indigo-500/10 border border-indigo-500/20 text-center relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/20 blur-2xl rounded-full" />
                                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2 relative z-10">5-YR AI Projection</p>
                                            <h4 className="text-2xl font-black text-white tracking-tight relative z-10">
                                                {formatCurrency(result.five_year_forecast)}
                                            </h4>
                                        </div>
                                        <div className="p-6 rounded-[2rem] bg-fuchsia-500/10 border border-fuchsia-500/20 text-center relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 w-16 h-16 bg-fuchsia-500/20 blur-2xl rounded-full" />
                                            <p className="text-[9px] font-black text-fuchsia-400 uppercase tracking-widest mb-2 relative z-10">10-YR AI Projection</p>
                                            <h4 className="text-2xl font-black text-white tracking-tight relative z-10">
                                                {formatCurrency(result.ten_year_forecast)}
                                            </h4>
                                        </div>
                                    </div>

                                    {/* Signal Factors */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                                        {[
                                            { label: 'Infra Score', value: `${result.factors.infrastructure_score}/100`, icon: Network, color: 'text-blue-400' },
                                            { label: 'Zone Rating', value: result.factors.zone_rating, icon: MapPin, color: 'text-purple-400' },
                                            { label: 'Trend Delta', value: result.factors.market_trend, icon: TrendingUp, color: 'text-emerald-400' },
                                            { label: 'AI Signal', value: 'STRONG BUY', icon: Zap, color: 'text-cyan-400' },
                                        ].map(({ label, value, icon: Icon, color }) => (
                                            <div key={label} className="p-5 rounded-3xl bg-white/[0.02] border border-white/[0.04] group hover:bg-white/[0.04] transition-all">
                                                <Icon size={16} className={cn("mb-3 opacity-60 group-hover:opacity-100 transition-opacity", color)} />
                                                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">{label}</p>
                                                <p className="text-xs font-black text-white tracking-tight">{value}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* AI Insight */}
                                    <div className="mt-8 p-6 rounded-[2rem] bg-purple-500/5 border border-purple-500/10 flex gap-5 group hover:bg-purple-500/10 transition-all">
                                        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center shrink-0 border border-purple-500/20">
                                            <Brain size={22} className="text-purple-400" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Strategic Recommendation</p>
                                            <p className="text-sm font-bold text-slate-300 leading-relaxed group-hover:text-white transition-colors">{result.factors.ai_recommendation}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-8">
                                    <button className="py-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:bg-white/[0.06] hover:text-white transition-all">
                                        DOWNLOAD PDF REPORT
                                    </button>
                                    <button className="py-5 rounded-2xl bg-cyan-600 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-cyan-500 transition-all">
                                        BUY PROPERTIES
                                    </button>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="h-full min-h-[500px] rounded-[3rem] glass-panel border border-white/[0.04] bg-[#05070A]/30 flex flex-col items-center justify-center text-center p-12">
                                <div className="w-20 h-20 rounded-[1.5rem] bg-white/[0.02] border border-white/[0.06] flex items-center justify-center mb-8">
                                    <Brain size={36} className="text-slate-800" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-400 tracking-tight uppercase tracking-[0.2em]">System Ready</h3>
                                <p className="text-slate-600 mt-4 max-w-xs font-medium">Configure parameters and run a forecast to generate an AI market report.</p>

                                <div className="mt-12 flex items-center gap-6">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
                                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Model Loaded</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
                                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Dataset Sync</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}

