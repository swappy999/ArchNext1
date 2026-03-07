'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useUIStore } from '@/store/uiStore'
import {
    LayoutDashboard, Map, Building2, ShoppingBag,
    Briefcase, Brain, ChevronLeft, ChevronRight, Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/map', label: 'Property Map', icon: Map },
    { href: '/properties', label: 'My Properties', icon: Building2 },
    { href: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
    { href: '/portfolio', label: 'Portfolio', icon: Briefcase },
    { href: '/investor', label: 'Investor Analytics', icon: Activity },
    { href: '/prediction', label: 'Market Insights', icon: Brain },
]

export default function Sidebar() {
    const pathname = usePathname()
    const { sidebarOpen, toggleSidebar } = useUIStore()

    return (
        <motion.aside
            initial={false}
            animate={{ width: sidebarOpen ? 280 : 88 }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            className="group/sidebar relative h-screen bg-[#0B0F1A]/40 backdrop-blur-2xl border-r border-white/[0.04] flex flex-col z-50 overflow-hidden"
        >
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />

            {/* Brand */}
            <div className="h-24 flex items-center px-[22px] relative mt-2">
                <Link href="/" className="relative flex items-center w-full group/logo transition-all duration-300" aria-label="Go to Dashboard Home">
                    <AnimatePresence mode="wait">
                        {sidebarOpen ? (
                            <motion.div
                                key="full-logo"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.3 }}
                                className="relative w-40 h-10 flex items-center"
                            >
                                <Image
                                    src="/branding/logo-full.png"
                                    alt="ArchNext Full Branding"
                                    fill
                                    className="object-contain object-left drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] group-hover/logo:drop-shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all duration-300 mix-blend-lighten brightness-[1.2]"
                                    priority
                                />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="icon-logo"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.3 }}
                                className="relative w-11 h-11 ml-1"
                            >
                                <Image
                                    src="/branding/logo-icon.png"
                                    alt="ArchNext Icon"
                                    fill
                                    className="object-contain drop-shadow-[0_0_15px_rgba(14,165,233,0.3)] group-hover/logo:drop-shadow-[0_0_25px_rgba(14,165,233,0.5)] transition-all duration-300 mix-blend-lighten brightness-[1.2]"
                                    priority
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-10 px-4 space-y-2 relative" aria-label="Main Navigation">
                {navItems.map(({ href, label, icon: Icon }) => {
                    const active = pathname === href
                    return (
                        <Link
                            key={href}
                            href={href}
                            className="block relative"
                            aria-label={`Navigate to ${label}`}
                            aria-current={active ? "page" : undefined}
                        >
                            <motion.div
                                whileHover={{ x: 4 }}
                                whileTap={{ scale: 0.98 }}
                                className={cn(
                                    "relative flex items-center h-12 px-4 rounded-2xl transition-all duration-300 overflow-hidden group/item",
                                    active
                                        ? "bg-white/[0.04] border border-white/[0.08] text-white shadow-xl"
                                        : "text-slate-400 hover:text-white hover:bg-white/[0.02]"
                                )}
                            >
                                {/* Active Background Glow */}
                                {active && (
                                    <motion.div
                                        layoutId="sidebar-active-bg"
                                        className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 0.4 }}
                                    />
                                )}

                                <Icon
                                    size={20}
                                    strokeWidth={active ? 2.5 : 2}
                                    className={cn(
                                        "shrink-0 transition-all duration-300 relative z-10",
                                        active ? "text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" : "group-hover/item:text-slate-200"
                                    )}
                                />

                                <AnimatePresence>
                                    {sidebarOpen && (
                                        <motion.span
                                            initial={{ opacity: 0, x: -5 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -5 }}
                                            transition={{ duration: 0.2 }}
                                            className="ml-4 text-sm font-semibold tracking-tight whitespace-nowrap relative z-10"
                                        >
                                            {label}
                                        </motion.span>
                                    )}
                                </AnimatePresence>

                                {active && (
                                    <motion.div
                                        layoutId="sidebar-active-indicator"
                                        className="absolute left-0 w-1 h-6 bg-cyan-400 rounded-r-full shadow-[0_0_15px_#22d3ee]"
                                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                    />
                                )}
                            </motion.div>
                        </Link>
                    )
                })}
            </nav>

            {/* Bottom Section */}
            <div className="p-6 space-y-4 border-t border-white/[0.04] relative">
                <AnimatePresence>
                    {sidebarOpen && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="p-4 rounded-2xl glass-card relative overflow-hidden group/status cursor-pointer"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent group-hover:from-cyan-500/10 transition-colors" />

                            <div className="flex items-center justify-between mb-2 relative z-10">
                                <span className="text-[10px] uppercase font-bold text-cyan-500 tracking-wider">System Status</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    <span className="text-[10px] font-bold text-emerald-400 tracking-wide uppercase">Online</span>
                                </div>
                            </div>
                            <div className="text-xs text-slate-400 font-medium relative z-10">Data synchronized</div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex items-center justify-between">
                    {!sidebarOpen && (
                        <div className="flex justify-center w-full">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        </div>
                    )}

                    <button
                        onClick={toggleSidebar}
                        className="flex-1 flex items-center justify-center h-10 rounded-xl hover:bg-white/[0.04] text-slate-500 hover:text-white transition-all duration-300 border border-transparent hover:border-white/[0.08]"
                    >
                        {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                    </button>
                </div>
            </div>
        </motion.aside>
    )
}

