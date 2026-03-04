'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useWalletStore } from '@/store/walletStore'
import { Search, Bell, Wallet, ChevronDown, LogOut, User, Activity, Fingerprint, Shield, LogIn } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

export default function Navbar() {
    const { user, logout } = useAuthStore()
    const { isConnected: walletIsConnected, address, connect, disconnect } = useWalletStore()
    const router = useRouter()
    const [profileOpen, setProfileOpen] = useState(false)
    const [isSearchFocused, setIsSearchFocused] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setProfileOpen(false)
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [])

    // Mock wallet address shortener
    const shortAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

    return (
        <header className="h-20 flex items-center justify-between px-8 border-b border-white/[0.04] bg-[#0B0F1A]/40 backdrop-blur-2xl z-40 sticky top-0">
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/[0.01] to-transparent pointer-events-none" />

            {/* Left: Global Search */}
            <div className="flex items-center gap-8 relative z-10">
                <div className="relative group/search">
                    <Search
                        size={16}
                        className={cn(
                            "absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-300",
                            isSearchFocused ? "text-cyan-400" : "text-slate-300 group-hover/search:text-slate-300"
                        )}
                    />
                    <input
                        type="text"
                        placeholder="SEARCH PROPERTIES..."
                        aria-label="Global Property Search"
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setIsSearchFocused(false)}
                        className={cn(
                            "w-72 h-11 pl-12 pr-6 bg-[#05070A]/50 border rounded-2xl text-[11px] font-black tracking-[0.1em] text-white placeholder:text-slate-400 focus:outline-none transition-all duration-500",
                            isSearchFocused
                                ? "border-cyan-500/50 ring-1 ring-cyan-500/20 w-80 shadow-[0_0_20px_rgba(6,182,212,0.1)]"
                                : "border-white/[0.06] hover:border-white/10"
                        )}
                    />
                    {/* Animated Focus Line */}
                    <AnimatePresence>
                        {isSearchFocused && (
                            <motion.div
                                layoutId="search-glow"
                                className="absolute -bottom-px left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent"
                                initial={{ opacity: 0, scaleX: 0 }}
                                animate={{ opacity: 1, scaleX: 1 }}
                                exit={{ opacity: 0, scaleX: 0 }}
                            />
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-5 relative z-10">
                {/* System Metrics Indicator */}
                <div className="hidden lg:flex items-center gap-4 px-4 h-11 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex flex-col items-end">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Latency</span>
                        <span className="text-[10px] font-bold text-emerald-400 tracking-tight" aria-label="Latency: 12ms">12ms</span>
                    </div>
                    <div className="w-px h-6 bg-white/10" />
                    <div className="flex flex-col items-end">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">System Status</span>
                        <span className="text-[10px] font-bold text-white tracking-tight" aria-label="System Status: Online">Online</span>
                    </div>
                </div>

                {/* Notifications */}
                <button
                    className="relative w-11 h-11 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] hover:border-cyan-500/20 flex items-center justify-center text-slate-300 hover:text-cyan-400 transition-all group"
                    aria-label="View Notifications"
                >
                    <Bell size={18} className="group-hover:rotate-12 transition-transform duration-300" />
                    <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_10px_#06b6d4] border-2 border-[#0B0F1A]" />
                </button>

                {/* Auth / Wallet Status */}
                {user ? (
                    <div
                        className={cn(
                            "group flex items-center gap-3 h-11 px-5 rounded-2xl text-[11px] font-black tracking-[0.1em] uppercase transition-all duration-500 border relative overflow-hidden",
                            "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"
                        )}
                    >
                        <Shield size={14} className="text-emerald-400 relative z-10" />
                        <span className="relative z-10">AUTHENTICATED</span>
                        {walletIsConnected && address && (
                            <span className="relative z-10 text-[9px] text-emerald-300/60 ml-1 hidden lg:inline">{shortAddress(address)}</span>
                        )}
                    </div>
                ) : (
                    <button
                        onClick={() => router.push('/auth/signin')}
                        aria-label="Connect Wallet"
                        className="group flex items-center gap-3 h-11 px-5 rounded-2xl text-[11px] font-black tracking-[0.1em] uppercase transition-all duration-500 border relative overflow-hidden bg-[#0B0F1A] border-white/10 text-slate-300 hover:border-cyan-500/30 hover:text-white"
                    >
                        <Fingerprint size={14} className="text-slate-400 group-hover:text-cyan-400 transition-colors relative z-10" />
                        <span className="relative z-10">CONNECT WALLET</span>
                    </button>
                )}

                <div className="h-8 w-px bg-white/10 mx-1" />

                <div className="relative">
                    {!mounted ? (
                        <div className="w-10 h-10 rounded-xl bg-white/5 animate-pulse" />
                    ) : user ? (
                        <button
                            onClick={() => setProfileOpen(!profileOpen)}
                            aria-expanded={profileOpen}
                            aria-haspopup="true"
                            className="flex items-center gap-4 pl-3 pr-2 h-11 rounded-2xl hover:bg-white/[0.04] transition-all group border border-transparent hover:border-white/[0.06]"
                        >
                            <div className="text-right hidden sm:block">
                                <div className="text-[10px] font-black text-white group-hover:text-cyan-400 transition-colors uppercase tracking-widest">
                                    {user?.username || 'GUEST_01'}
                                </div>
                                <div className="text-[8px] text-slate-300 font-black uppercase tracking-widest mt-0.5">
                                    {user?.role || 'INVESTOR'}
                                </div>
                            </div>
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-900 to-blue-900 border border-white/10 flex items-center justify-center shadow-2xl relative overflow-hidden">
                                <div className="absolute inset-0 bg-cyan-500/20 animate-pulse" />
                                <User size={14} className="text-cyan-200 relative z-10" />
                            </div>
                            <ChevronDown size={14} className={cn("text-slate-400 transition-transform duration-500", profileOpen ? 'rotate-180' : '')} />
                        </button>
                    ) : (
                        <div className="flex items-center gap-4">
                            <Link href="/auth/signin" className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400 hover:text-cyan-300 transition-colors">
                                LOGIN
                            </Link>
                            <button
                                onClick={() => router.push('/auth/signin')}
                                aria-label="Login to Account"
                                className="group flex items-center gap-2 h-11 px-5 rounded-2xl bg-white text-black text-[11px] font-black tracking-[0.1em] hover:bg-cyan-50 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all uppercase"
                            >
                                <LogIn size={14} className="group-hover:translate-x-0.5 transition-transform" />
                                LOGIN
                            </button>
                        </div>
                    )}

                    <AnimatePresence>
                        {profileOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 12, scale: 0.95 }}
                                transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
                                className="absolute right-0 top-16 w-64 p-2 rounded-[2rem] glass-panel border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 overflow-hidden"
                            >
                                {/* Dropdown Background Glow */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                                <div className="px-5 py-5 border-b border-white/[0.04] mb-2 relative z-10">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.1em]">User Account</span>
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20">
                                            <Shield size={8} className="text-cyan-400" />
                                            <span className="text-[9px] font-black text-cyan-400 tracking-tighter uppercase">SECURED</span>
                                        </div>
                                    </div>
                                    <div className="text-sm font-black text-white tracking-tight truncate">{user?.email || 'guest@archnext.io'}</div>
                                </div>

                                <div className="space-y-1 relative z-10">
                                    <Link href="/portfolio" onClick={() => setProfileOpen(false)}>
                                        <div className="flex items-center gap-4 px-4 py-3.5 rounded-xl text-[10px] font-black text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all cursor-pointer group/item uppercase tracking-widest">
                                            <Activity size={16} className="text-slate-400 group-hover/item:text-cyan-400 transition-colors" />
                                            Portfolio Stats
                                        </div>
                                    </Link>
                                    <Link href="/settings" onClick={() => setProfileOpen(false)}>
                                        <div className="flex items-center gap-4 px-4 py-3.5 rounded-xl text-[10px] font-black text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all cursor-pointer group/item uppercase tracking-widest">
                                            <Fingerprint size={16} className="text-slate-400 group-hover/item:text-cyan-400 transition-colors" />
                                            Security Key
                                        </div>
                                    </Link>
                                    <button
                                        onClick={() => { logout(); setProfileOpen(false); router.push('/') }}
                                        className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-[10px] font-black text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all uppercase tracking-widest"
                                    >
                                        <LogOut size={16} />
                                        Disconnect
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </header>
    )
}

