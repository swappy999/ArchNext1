'use client'

import React, { useEffect } from 'react'
import { CheckCircle, XCircle, Loader2, Wallet, Zap, Shield, ArrowRight, type LucideIcon } from 'lucide-react'

export type TransactionStep =
    | 'idle'
    | 'ai_verify'
    | 'wallet_confirm'
    | 'mining'
    | 'db_sync'
    | 'success'
    | 'error'

interface TransactionModalProps {
    isOpen: boolean
    step: TransactionStep
    title: string
    description?: string
    errorMessage?: string
    txHash?: string
    onClose: () => void
}

const STEPS: { key: TransactionStep; label: string; Icon: LucideIcon }[] = [
    { key: 'ai_verify', label: 'AI Verification', Icon: Shield },
    { key: 'wallet_confirm', label: 'Wallet Confirmation', Icon: Wallet },
    { key: 'mining', label: 'On-Chain Commit', Icon: Zap },
    { key: 'db_sync', label: 'Sync & Update', Icon: ArrowRight },
]

const STEP_ORDER: TransactionStep[] = ['ai_verify', 'wallet_confirm', 'mining', 'db_sync', 'success']

function getStepStatus(step: TransactionStep, key: TransactionStep): 'done' | 'active' | 'pending' {
    const currentIdx = STEP_ORDER.indexOf(step)
    const keyIdx = STEP_ORDER.indexOf(key)
    if (keyIdx < currentIdx) return 'done'
    if (keyIdx === currentIdx) return 'active'
    return 'pending'
}

export function TransactionModal({
    isOpen,
    step,
    title,
    description,
    errorMessage,
    txHash,
    onClose,
}: TransactionModalProps) {
    if (!isOpen) return null

    const isError = step === 'error'
    const isSuccess = step === 'success'

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
            <div
                className={`relative w-full max-w-md mx-4 rounded-2xl border p-6 shadow-2xl transition-all duration-300 ${isSuccess
                    ? 'bg-emerald-950/90 border-emerald-500/40 shadow-emerald-500/20'
                    : isError
                        ? 'bg-red-950/90 border-red-500/40 shadow-red-500/20'
                        : 'bg-slate-900/95 border-cyan-500/20 shadow-cyan-500/10'
                    }`}
            >
                {/* Glow overlay for wallet confirmation step */}
                {step === 'wallet_confirm' && (
                    <div className="absolute inset-0 rounded-2xl bg-amber-500/5 animate-pulse pointer-events-none border border-amber-500/20" />
                )}

                {/* Header */}
                <div className="flex items-center gap-3 mb-5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSuccess ? 'bg-emerald-500/20' : isError ? 'bg-red-500/20' : 'bg-cyan-500/10'
                        }`}>
                        {isSuccess ? (
                            <CheckCircle className="text-emerald-400" size={20} />
                        ) : isError ? (
                            <XCircle className="text-red-400" size={20} />
                        ) : (
                            <Loader2 className="text-cyan-400 animate-spin" size={20} />
                        )}
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-sm tracking-wide">{title}</h3>
                        {description && (
                            <p className="text-slate-400 text-xs mt-0.5">{description}</p>
                        )}
                    </div>
                </div>

                {/* Success Animation */}
                {isSuccess && (
                    <div className="text-center py-4">
                        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 animate-[pulse_1s_ease-in-out]">
                            <CheckCircle size={32} className="text-emerald-400" />
                        </div>
                        <p className="text-emerald-300 font-semibold text-sm">Transaction Complete!</p>
                        {txHash && (
                            <p className="text-slate-500 text-[10px] mt-1 font-mono break-all">{txHash.slice(0, 20)}...{txHash.slice(-8)}</p>
                        )}
                        <p className="text-slate-400 text-xs mt-2">All pages updated in real-time.</p>
                    </div>
                )}

                {/* Error */}
                {isError && (
                    <div className="text-center py-4">
                        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30">
                            <XCircle size={32} className="text-red-400" />
                        </div>
                        <p className="text-red-300 font-semibold text-sm">Transaction Failed</p>
                        {errorMessage && (
                            <p className="text-slate-400 text-xs mt-2 max-h-20 overflow-auto">{errorMessage}</p>
                        )}
                        <p className="text-slate-500 text-xs mt-2">State has been restored.</p>
                    </div>
                )}

                {/* Progress Steps (shown while processing) */}
                {!isSuccess && !isError && (
                    <div className="space-y-3 mb-4">
                        {STEPS.map(({ key, label, Icon }) => {
                            const status = getStepStatus(step, key)
                            return (
                                <div key={key} className="flex items-center gap-3">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300 ${status === 'done'
                                        ? 'bg-emerald-500/20 border border-emerald-500/30'
                                        : status === 'active'
                                            ? 'bg-cyan-500/20 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                                            : 'bg-slate-800 border border-white/5'
                                        }`}>
                                        {status === 'done' ? (
                                            <CheckCircle size={12} className="text-emerald-400" />
                                        ) : status === 'active' ? (
                                            <Loader2 size={12} className="text-cyan-400 animate-spin" />
                                        ) : (
                                            <Icon size={12} className="text-slate-600" />
                                        )}
                                    </div>
                                    <span className={`text-xs font-medium transition-colors duration-300 ${status === 'done'
                                        ? 'text-emerald-400 line-through decoration-emerald-500/50'
                                        : status === 'active'
                                            ? 'text-cyan-300'
                                            : 'text-slate-600'
                                        }`}>{label}</span>
                                    {status === 'active' && key === 'wallet_confirm' && (
                                        <span className="ml-auto text-[9px] text-amber-400 font-bold uppercase tracking-widest animate-pulse">
                                            Action Required
                                        </span>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Action Buttons */}
                {(isSuccess || isError) && (
                    <button
                        onClick={onClose}
                        className={`w-full mt-2 py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all ${isSuccess
                            ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/20'
                            : 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/20'
                            }`}
                    >
                        {isSuccess ? 'Done' : 'Dismiss'}
                    </button>
                )}
            </div>
        </div>
    )
}
