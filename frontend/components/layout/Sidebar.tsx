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

const navGroups = [
    {
        label: 'Core',
        items: [
            { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { href: '/map', label: 'Property Map', icon: Map },
            { href: '/properties', label: 'My Properties', icon: Building2 },
            { href: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
            { href: '/portfolio', label: 'Portfolio', icon: Briefcase },
        ],
    },
    {
        label: 'Analytics',
        items: [
            { href: '/investor', label: 'Investor Analytics', icon: Activity },
            { href: '/prediction', label: 'Market Insights', icon: Brain },
        ],
    },
]

export default function Sidebar() {
    const pathname = usePathname()
    const { sidebarOpen, toggleSidebar } = useUIStore()

    return (
        <motion.aside
            initial={false}
            animate={{ width: sidebarOpen ? 240 : 68 }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            className="group/sidebar relative h-screen bg-[var(--background)]/50 backdrop-blur-2xl border-r border-[var(--border)] flex flex-col z-50 overflow-hidden"
        >
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.015] to-transparent pointer-events-none" />

            {/* Navigation */}
            <nav className="flex-1 pt-5 pb-4 px-2.5 space-y-6 overflow-y-auto premium-scroll relative" aria-label="Main Navigation">
                {navGroups.map((group) => (
                    <div key={group.label} className="space-y-1">
                        {/* Group Label */}
                        <AnimatePresence>
                            {sidebarOpen && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                    className="px-3 pb-1"
                                >
                                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">
                                        {group.label}
                                    </span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {group.items.map(({ href, label, icon: Icon }) => {
                            const active = pathname === href || (href !== '/dashboard' && pathname?.startsWith(href))
                            return (
                                <div key={href} className="relative group/item">
                                    <Link
                                        href={href}
                                        className="block"
                                        aria-label={`Navigate to ${label}`}
                                        aria-current={active ? "page" : undefined}
                                    >
                                        <motion.div
                                            whileHover={{ x: sidebarOpen ? 2 : 0 }}
                                            whileTap={{ scale: 0.97 }}
                                            className={cn(
                                                "relative flex items-center h-10 px-3 rounded-xl transition-all duration-200 overflow-hidden",
                                                active
                                                    ? "bg-white/[0.06] border border-white/[0.08] text-white"
                                                    : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.03]"
                                            )}
                                        >
                                            {/* Active indicator pill */}
                                            {active && (
                                                <motion.div
                                                    layoutId="sidebar-active-pill"
                                                    className="absolute left-0 top-2 bottom-2 w-[3px] bg-cyan-400 rounded-r-full shadow-[0_0_12px_#22d3ee]"
                                                    transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                                                />
                                            )}

                                            {/* Active background glow */}
                                            {active && (
                                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/8 to-transparent pointer-events-none" />
                                            )}

                                            <Icon
                                                size={17}
                                                strokeWidth={active ? 2.5 : 2}
                                                className={cn(
                                                    "shrink-0 transition-all duration-200 relative z-10",
                                                    active ? "text-cyan-400" : "text-slate-600 group-hover/item:text-slate-300"
                                                )}
                                            />

                                            <AnimatePresence>
                                                {sidebarOpen && (
                                                    <motion.span
                                                        initial={{ opacity: 0, x: -6 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: -6 }}
                                                        transition={{ duration: 0.18 }}
                                                        className="ml-3 text-sm font-semibold tracking-tight whitespace-nowrap relative z-10"
                                                    >
                                                        {label}
                                                    </motion.span>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    </Link>

                                    {/* Tooltip for collapsed state */}
                                    {!sidebarOpen && (
                                        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-[100] pointer-events-none opacity-0 group-hover/item:opacity-100 transition-opacity duration-150">
                                            <div className="bg-[var(--background)] border border-[var(--border)] text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap">
                                                {label}
                                                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[var(--background)]" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                ))}
            </nav>

            {/* Bottom Section */}
            <div className="px-2.5 py-4 border-t border-white/[0.04] relative">
                {/* System Status — expanded only */}
                <AnimatePresence>
                    {sidebarOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-3 overflow-hidden"
                        >
                            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                                    </span>
                                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">System Online</span>
                                </div>
                                <span className="text-[9px] text-slate-600">v1.0</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Collapsed: just the dot */}
                {!sidebarOpen && (
                    <div className="flex justify-center mb-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    </div>
                )}

                {/* Collapse Toggle */}
                <button
                    onClick={toggleSidebar}
                    className="w-full flex items-center justify-center h-9 rounded-xl hover:bg-white/[0.05] text-slate-600 hover:text-white transition-all duration-200 border border-transparent hover:border-white/[0.07]"
                    aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                >
                    {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                </button>
            </div>
        </motion.aside>
    )
}
