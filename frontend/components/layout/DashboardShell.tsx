'use client'

import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import { motion } from 'framer-motion'
import { TransactionModal } from '@/components/ui/TransactionModal'
import { useTransactionStore } from '@/store/transactionStore'

export default function DashboardShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const { isOpen, step, title, description, errorMessage, txHash, close } = useTransactionStore()

    return (
        <div className="flex h-screen w-screen bg-[#0B0F1A] overflow-hidden font-sans antialiased text-slate-200 selection:bg-cyan-500/30 selection:text-cyan-200">
            {/* Lightweight ambient background — no blur, pure CSS */}
            <div className="fixed inset-0 pointer-events-none" aria-hidden>
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(59,130,246,0.08)_0%,transparent_50%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(99,102,241,0.06)_0%,transparent_50%)]" />
                <div className="absolute inset-0 grid-bg opacity-[0.15]" />
            </div>

            {/* ─── Global Transaction Progress Modal ──────────────────────────────
                Shared across all dashboard pages (Marketplace, Portfolio, Auctions).
                Reads from useTransactionStore — no per-page mounting needed.
            ─────────────────────────────────────────────────────────────────── */}
            <TransactionModal
                isOpen={isOpen}
                step={step}
                title={title}
                description={description}
                errorMessage={errorMessage}
                txHash={txHash}
                onClose={close}
            />

            {/* Sidebar */}
            <div className="z-50 shrink-0 relative">
                <Sidebar />
            </div>

            {/* Main Content Area */}
            <div className="flex flex-col flex-1 min-w-0 relative">
                <Navbar />

                <main className="flex-1 overflow-y-auto overflow-x-hidden relative premium-scroll">
                    <motion.div
                        key={pathname}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.15 }}
                        className="max-w-[1700px] mx-auto p-6 md:p-8 lg:p-10 pb-24 space-y-10"
                    >
                        {children}
                    </motion.div>
                </main>

                {/* Bottom fade */}
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#0B0F1A] to-transparent pointer-events-none z-10" />
            </div>
        </div>
    )
}
