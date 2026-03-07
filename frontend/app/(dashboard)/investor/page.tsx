'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, PieChart as PieChartIcon, Activity, MapPin, Building2, Gavel } from 'lucide-react'
import { usePortfolioStore } from '@/store/portfolioStore'
import { formatCurrency } from '@/lib/utils'
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie
} from 'recharts'

export default function InvestorDashboardPage() {
    const { assets, total_current_value, total_invested, fetchPortfolio, loading, active_auctions, my_bids } = usePortfolioStore()

    useEffect(() => {
        fetchPortfolio()
    }, [])

    const nftCount = assets.filter(a => a.is_nft).length
    const expectedProfit = total_current_value - total_invested
    const profitMargin = total_invested > 0 ? (expectedProfit / total_invested) * 100 : 0

    // Mock Historical Data for Charts based on current portfolio value
    const growthData = useMemo(() => {
        if (!total_current_value) return []
        const base = total_invested || total_current_value * 0.8
        return [
            { month: 'Jan', value: base },
            { month: 'Feb', value: base * 1.02 },
            { month: 'Mar', value: base * 1.05 },
            { month: 'Apr', value: base * 1.08 },
            { month: 'May', value: base * 1.15 },
            { month: 'Jun', value: total_current_value }
        ]
    }, [total_current_value, total_invested])

    const cityDistribution = useMemo(() => {
        const dist: Record<string, number> = {}
        assets.forEach(a => {
            const area = a.area || 'Kolkata'
            dist[area] = (dist[area] || 0) + (a.current_price || a.purchase_price || 0)
        })
        return Object.entries(dist).map(([name, value]) => ({ name, value }))
    }, [assets])

    const COLORS = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899']

    if (loading && assets.length === 0) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center gap-6">
                <div className="w-16 h-16 rounded-3xl border border-white/[0.08] bg-white/[0.02] flex items-center justify-center animate-pulse">
                    <Activity size={32} className="text-slate-700" />
                </div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Loading Analytics...</p>
            </div>
        )
    }

    return (
        <div className="space-y-12 pb-20">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-black text-white tracking-tighter mb-2">Investor Analytics</h1>
                <p className="text-slate-500 font-medium">Institution-grade portfolio tracking and insights.</p>
            </div>

            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 rounded-[2rem] border-cyan-500/20 bg-cyan-500/5 relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-cyan-500/20 blur-3xl rounded-full" />
                    <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Activity size={12} /> Total Portfolio Value
                    </p>
                    <p className="text-3xl font-black text-white tracking-tight">{formatCurrency(total_current_value)}</p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel p-6 rounded-[2rem] border-white/[0.06] relative overflow-hidden">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <TrendingUp size={12} className="text-emerald-500" /> Predicted Profit
                    </p>
                    <p className="text-3xl font-black text-emerald-400 tracking-tight">+{formatCurrency(expectedProfit)}</p>
                    <p className="text-xs font-bold text-slate-500 mt-1">+{profitMargin.toFixed(2)}% ROI</p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-panel p-6 rounded-[2rem] border-white/[0.06] relative overflow-hidden">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Building2 size={12} className="text-purple-500" /> Web3 Assets
                    </p>
                    <p className="text-3xl font-black text-white tracking-tight">{nftCount} <span className="text-lg text-slate-500 opacity-50">/ {assets.length} total</span></p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-panel p-6 rounded-[2rem] border-white/[0.06] relative overflow-hidden">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Gavel size={12} className="text-amber-500" /> Active Markets
                    </p>
                    <div className="flex items-center gap-4 mt-1">
                        <div>
                            <p className="text-2xl font-black text-white tracking-tight">{active_auctions.length}</p>
                            <span className="text-[9px] font-black text-slate-500 uppercase">Auctions</span>
                        </div>
                        <div className="w-px h-8 bg-white/10" />
                        <div>
                            <p className="text-2xl font-black text-white tracking-tight">{my_bids.length}</p>
                            <span className="text-[9px] font-black text-slate-500 uppercase">Bids</span>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Growth Chart */}
                <div className="lg:col-span-2 glass-panel p-8 rounded-[2.5rem] border-white/[0.06]">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-black text-white tracking-tight">Portfolio Growth Trajectory</h3>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Historical 6-Month Performance</p>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={growthData}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                                <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis
                                    stroke="#94a3b8"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => `₹${(val / 10000000).toFixed(1)}Cr`}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0B0F1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                    formatter={(value: any) => [formatCurrency(value || 0), 'Value']}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#06b6d4"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#0B0F1A', strokeWidth: 2 }}
                                    activeDot={{ r: 6, fill: '#06b6d4' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Distribution Chart */}
                <div className="glass-panel p-8 rounded-[2.5rem] border-white/[0.06] flex flex-col">
                    <h3 className="text-lg font-black text-white tracking-tight mb-1">Asset Distribution</h3>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-8">Capital Allocation by Zone</p>

                    <div className="flex-1 min-h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={cityDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {cityDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0B0F1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                    formatter={(value: any) => [formatCurrency(value || 0), 'Value']}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="mt-6 space-y-3">
                        {cityDistribution.map((entry, index) => (
                            <div key={index} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                    <span className="text-xs font-bold text-slate-300">{entry.name}</span>
                                </div>
                                <span className="text-xs font-bold text-white tracking-tight">{((entry.value / total_current_value) * 100).toFixed(1)}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
