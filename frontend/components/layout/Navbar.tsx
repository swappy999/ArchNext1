'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useWalletStore } from '@/store/walletStore'
import { useUIStore } from '@/store/uiStore'
import {
    Search, Bell, ChevronDown, LogOut, User, Activity,
    Fingerprint, Shield, LogIn, Map, ShoppingBag, Briefcase,
    Building2, Menu, X, Brain, BarChart3, Sun, Moon, Loader2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { cn, formatCurrency } from '@/lib/utils'
import Image from 'next/image'
import { useSearchStore } from '@/store/searchStore'
import { usePropertyStore } from '@/store/propertyStore'

const navLinks = [
    { href: '/map', label: 'Map', icon: Map },
    { href: '/properties', label: 'Properties', icon: Building2 },
    { href: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
    { href: '/portfolio', label: 'Portfolio', icon: Briefcase },
    { href: '/investor', label: 'Analytics', icon: BarChart3 },
    { href: '/prediction', label: 'AI Insights', icon: Brain },
]

export default function Navbar() {
    const { user, logout } = useAuthStore()
    const { isConnected: walletIsConnected, address } = useWalletStore()
    const { theme, toggleTheme } = useUIStore()
    const { query, setQuery, suggestions, clearQuery, isSearching } = useSearchStore()
    const { properties, fetchProperties } = usePropertyStore()
    const router = useRouter()
    const pathname = usePathname()
    const [profileOpen, setProfileOpen] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [isSearchFocused, setIsSearchFocused] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        fetchProperties()
    }, [fetchProperties])

    useEffect(() => {
        setMounted(true)
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setProfileOpen(false)
                setMobileMenuOpen(false)
            }
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [])

    // Close mobile menu on route change
    useEffect(() => {
        setMobileMenuOpen(false)
        setProfileOpen(false)
    }, [pathname])

    const shortAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

    return (
        <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-white/[0.05] bg-[var(--background)]/60 backdrop-blur-2xl z-50 sticky top-0 gap-4">
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/[0.01] to-transparent pointer-events-none" />

            {/* Left: Logo */}
            <Link href="/dashboard" aria-label="Go to Dashboard" className="relative z-10 shrink-0 flex items-center">
                <div className="relative w-28 h-8">
                    <Image
                        src="/branding/logo-full.png"
                        alt="ArchNext"
                        fill
                        className="object-contain object-left drop-shadow-[0_0_12px_rgba(255,255,255,0.08)] brightness-[1.15] mix-blend-lighten"
                        priority
                    />
                </div>
            </Link>

            {/* Center: Search */}
            <div className="flex-1 max-w-md relative z-10 hidden sm:block">
                <div className="relative group/search">
                    {isSearching ? (
                        <Loader2
                            size={14}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400 animate-spin"
                        />
                    ) : (
                        <Search
                            size={14}
                            className={cn(
                                "absolute left-3.5 top-1/2 -translate-y-1/2 transition-all duration-300 pointer-events-none",
                                isSearchFocused ? "text-cyan-400" : "text-slate-500"
                            )}
                        />
                    )}
                    <input
                        type="text"
                        placeholder="Search properties, zones, addresses..."
                        aria-label="Global Property Search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value, properties)}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && query.trim()) {
                                setIsSearchFocused(false)
                                router.push(`/properties?q=${encodeURIComponent(query)}`)
                            }
                        }}
                        className={cn(
                            "w-full h-9 pl-10 pr-4 bg-white/[0.04] border rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none transition-all duration-300",
                            isSearchFocused
                                ? "border-cyan-500/40 bg-white/[0.06] shadow-[0_0_16px_rgba(6,182,212,0.08)]"
                                : "border-white/[0.06] hover:border-white/10"
                        )}
                    />
                    <AnimatePresence>
                        {isSearchFocused && (
                            <motion.div
                                className="absolute -bottom-px left-3 right-3 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent"
                                initial={{ opacity: 0, scaleX: 0 }}
                                animate={{ opacity: 1, scaleX: 1 }}
                                exit={{ opacity: 0, scaleX: 0 }}
                            />
                        )}
                    </AnimatePresence>

                    {/* Suggestions Dropdown */}
                    <AnimatePresence>
                        {isSearchFocused && suggestions.length > 0 && (
                            <motion.div 
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 4 }}
                                transition={{ duration: 0.15 }}
                                className="absolute top-full left-0 right-0 mt-2 p-1.5 bg-[var(--background)] border border-[var(--border)] rounded-2xl shadow-2xl z-[70] max-h-80 overflow-y-auto premium-scroll"
                            >
                                {suggestions.map((p) => (
                                    <button
                                        key={p.id}
                                        onClick={() => {
                                            router.push(`/properties/${p.id}`)
                                            clearQuery()
                                        }}
                                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.04] transition-colors text-left group"
                                    >
                                        <div className="flex flex-col gap-0.5 max-w-[70%]">
                                            <span className="text-xs font-bold text-white group-hover:text-cyan-400 truncate transition-colors">{p.title}</span>
                                            <span className="text-[10px] text-slate-500 truncate flex items-center gap-1"><Map size={10} /> {p.address}</span>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-[11px] font-black text-emerald-400">{formatCurrency(p.price)}</span>
                                            {p.is_nft && <span className="text-[8px] font-bold text-blue-400 uppercase tracking-widest px-1.5 py-0.5 bg-blue-500/10 rounded-md">NFT</span>}
                                        </div>
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Right: Nav links + Wallet + Profile */}
            <div className="flex items-center gap-1 md:gap-2 relative z-10">

                {/* Desktop Nav Links */}
                <nav className="hidden lg:flex items-center" aria-label="Primary Navigation">
                    {navLinks.map(({ href, label }) => {
                        const active = pathname === href || pathname?.startsWith(href + '/')
                        return (
                            <Link
                                key={href}
                                href={href}
                                aria-current={active ? 'page' : undefined}
                                className={cn(
                                    "relative px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200",
                                    active
                                        ? "text-white bg-white/[0.06]"
                                        : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                                )}
                            >
                                {label}
                                {active && (
                                    <motion.div
                                        layoutId="nav-active-underline"
                                        className="absolute bottom-0.5 left-3 right-3 h-[2px] bg-cyan-500/70 rounded-full"
                                        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                                    />
                                )}
                            </Link>
                        )
                    })}
                </nav>

                <div className="hidden lg:block w-px h-5 bg-white/10 mx-1" />

                {/* Theme Toggle */}
                {mounted && (
                    <button
                        onClick={toggleTheme}
                        className="relative w-9 h-9 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-cyan-500/20 flex items-center justify-center text-slate-400 hover:text-white transition-all mr-1"
                        aria-label="Toggle Theme"
                    >
                        {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                    </button>
                )}

                {/* Notifications */}
                <button
                    className="relative w-9 h-9 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-cyan-500/20 flex items-center justify-center text-slate-400 hover:text-white transition-all"
                    aria-label="View Notifications"
                >
                    <Bell size={15} />
                    <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_6px_#06b6d4]" />
                </button>

                {/* Auth Status / Wallet */}
                {mounted && (
                    <>
                        {user ? (
                            <div className="hidden md:flex items-center gap-1.5 h-8 px-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20 text-emerald-400">
                                <Shield size={12} />
                                <span className="text-[10px] font-bold uppercase tracking-wide">
                                    {walletIsConnected && address ? shortAddress(address) : 'Verified'}
                                </span>
                            </div>
                        ) : (
                            <button
                                onClick={() => router.push('/auth/signin')}
                                aria-label="Sign In"
                                className="hidden md:flex items-center gap-2 h-8 px-3 rounded-xl text-[11px] font-bold uppercase tracking-wide border border-white/10 text-slate-300 hover:border-cyan-500/30 hover:text-white transition-all bg-white/[0.02]"
                            >
                                <LogIn size={12} />
                                Login
                            </button>
                        )}
                    </>
                )}

                <div className="w-px h-5 bg-white/10 mx-0.5" />

                {/* Profile Menu */}
                <div className="relative">
                    {!mounted ? (
                        <div className="w-8 h-8 rounded-lg bg-white/5 animate-pulse" />
                    ) : user ? (
                        <button
                            onClick={() => setProfileOpen(!profileOpen)}
                            aria-expanded={profileOpen}
                            aria-haspopup="true"
                            className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/[0.05] transition-all border border-transparent hover:border-white/[0.07]"
                        >
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-900 to-blue-900 border border-white/10 flex items-center justify-center relative overflow-hidden">
                                <div className="absolute inset-0 bg-cyan-500/20 animate-pulse" />
                                <User size={13} className="text-cyan-200 relative z-10" />
                            </div>
                            <div className="text-left hidden sm:block">
                                <div className="text-[10px] font-bold text-white uppercase tracking-wide truncate max-w-[80px]">
                                    {user?.username || 'User'}
                                </div>
                                <div className="text-[9px] text-slate-500 uppercase tracking-wide">
                                    {user?.role || 'Investor'}
                                </div>
                            </div>
                            <ChevronDown size={12} className={cn("text-slate-500 transition-transform duration-300", profileOpen ? 'rotate-180' : '')} />
                        </button>
                    ) : (
                        <button
                            onClick={() => router.push('/auth/signin')}
                            className="flex items-center gap-2 h-9 px-4 rounded-xl bg-white text-black text-[11px] font-bold uppercase tracking-wide hover:bg-cyan-50 shadow-md transition-all active:scale-95"
                        >
                            <LogIn size={13} />
                            Sign In
                        </button>
                    )}

                    {/* Profile Dropdown */}
                    <AnimatePresence>
                        {profileOpen && user && (
                            <motion.div
                                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                                transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
                                className="absolute right-0 top-12 w-60 p-1.5 rounded-2xl glass-panel border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[60] overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                                <div className="px-3 py-3 border-b border-white/[0.05] mb-1">
                                    <div className="text-[10px] font-bold text-white truncate">{user?.email || 'user@archnext.io'}</div>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <Shield size={9} className="text-cyan-400" />
                                        <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-wide">Authenticated</span>
                                    </div>
                                </div>

                                <div className="space-y-0.5">
                                    <Link href="/portfolio" onClick={() => setProfileOpen(false)}>
                                        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-semibold text-slate-400 hover:text-white hover:bg-white/[0.05] transition-all cursor-pointer">
                                            <Activity size={14} className="text-slate-500" />
                                            Portfolio Stats
                                        </div>
                                    </Link>
                                    <Link href="/settings" onClick={() => setProfileOpen(false)}>
                                        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-semibold text-slate-400 hover:text-white hover:bg-white/[0.05] transition-all cursor-pointer">
                                            <Fingerprint size={14} className="text-slate-500" />
                                            Security
                                        </div>
                                    </Link>
                                    <button
                                        onClick={() => { logout(); setProfileOpen(false); router.push('/') }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all"
                                    >
                                        <LogOut size={14} />
                                        Sign Out
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Mobile Menu Toggle */}
                <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="lg:hidden min-w-[44px] min-h-[44px] rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-95"
                    aria-label="Toggle Mobile Menu"
                    aria-expanded={mobileMenuOpen}
                >
                    {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
                </button>
            </div>

            {/* Mobile Nav Menu */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.nav
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
                        className="absolute top-full left-0 right-0 bg-[var(--background)]/98 backdrop-blur-2xl border-b border-[var(--border)] p-3 space-y-1 z-[60] lg:hidden shadow-[0_24px_48px_rgba(0,0,0,0.5)]"
                        aria-label="Mobile Navigation"
                    >
                        {/* Mobile Search */}
                        <div className="relative mb-3 sm:hidden px-1">
                            <Search size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search properties..."
                                className="w-full h-10 pl-10 pr-3 bg-white/[0.04] border border-white/[0.07] rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/30"
                            />
                        </div>
                        {navLinks.map(({ href, label, icon: Icon }) => {
                            const active = pathname === href
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    className={cn(
                                        "flex items-center gap-3 px-4 min-h-[48px] rounded-xl text-sm font-semibold transition-all",
                                        active ? "text-white bg-white/[0.07] border border-white/[0.08]" : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                                    )}
                                >
                                    <Icon size={18} className={active ? "text-cyan-400" : "text-slate-500"} />
                                    {label}
                                    {active && (
                                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-500" />
                                    )}
                                </Link>
                            )
                        })}
                        {!user && (
                            <div className="pt-2 pb-1 border-t border-white/[0.05] flex gap-2">
                                <Link href="/auth/signin" className="flex-1 text-center min-h-[44px] flex items-center justify-center rounded-xl text-sm font-bold text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/10 transition-all">
                                    Sign In
                                </Link>
                                <Link href="/auth/signup" className="flex-1 text-center min-h-[44px] flex items-center justify-center rounded-xl text-sm font-bold bg-white text-black hover:bg-cyan-50 transition-all">
                                    Sign Up
                                </Link>
                            </div>
                        )}
                    </motion.nav>
                )}
            </AnimatePresence>
        </header>
    )
}
