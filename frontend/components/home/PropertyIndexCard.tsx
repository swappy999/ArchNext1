'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Activity, TrendingUp, Globe } from 'lucide-react'
import { api } from '@/lib/api'
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts'

export default function PropertyIndexCard() {
    const [data, setData] = useState<{ index_value: number, history: any[] } | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get('/analytics/index')
                setData({
                    index_value: res.index_value,
                    history: res.index_history
                })
            } catch (err) {
                console.error("Failed to load Property Index", err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    if (loading) {
        return (
            <div className="w-full max-w-sm h-48 rounded-[2rem] bg-white/[0.02] border border-white/5 flex items-center justify-center animate-pulse">
                <Activity className="text-cyan-500/50" />
            </div>
        )
    }

    if (!data) return null;

    const currentVal = data.index_value || 0;
    const startVal = (data.history && data.history.length > 0) ? data.history[0]?.value : currentVal;
    const growth = startVal ? ((currentVal - startVal) / startVal) * 100 : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="w-full max-w-sm p-6 rounded-[2rem] border border-white/10 bg-[#0B0F1A]/80 backdrop-blur-2xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] relative overflow-hidden group"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-2">
                    <Globe size={14} className="text-cyan-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Global Property Index</span>
                </div>
                <div className="flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                    <TrendingUp size={10} className="text-emerald-400" />
                    <span className="text-[9px] font-black text-emerald-400">+{growth.toFixed(1)}%</span>
                </div>
            </div>

            <div className="mb-6 relative z-10">
                <p className="text-3xl font-black text-white tracking-tighter">
                    {currentVal.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-sm text-cyan-500">PTS</span>
                </p>
            </div>

            <div className="h-16 w-full -mx-2 relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.history}>
                        <defs>
                            <linearGradient id="colorIndex" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <YAxis domain={['dataMin - 100', 'dataMax + 100']} hide />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#22d3ee"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorIndex)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    )
}
