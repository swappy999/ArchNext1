'use client'

import { create } from 'zustand'
import type { TransactionStep } from '@/components/ui/TransactionModal'

/**
 * transactionStore — Central animation state manager for all Web3 transactions.
 * Used by: marketplaceStore.buy(), marketplaceStore.prepareListProperty(),
 *           auctionStore.createAuction(), auctionStore.placeBid(), auctionStore.finalizeAuction()
 * 
 * Consumed by: TransactionProgressBar component (mounted globally in dashboard layout)
 */

interface TransactionState {
    isOpen: boolean
    step: TransactionStep
    title: string
    description: string
    errorMessage: string
    txHash: string
    /** Call this before starting any transaction */
    begin: (title: string, description?: string) => void
    /** Advance to next step */
    advance: (step: TransactionStep, description?: string) => void
    /** Complete the transaction */
    complete: (txHash?: string) => void
    /** Mark failed / rollback */
    fail: (errorMessage: string) => void
    /** Close the modal */
    close: () => void
}

export const useTransactionStore = create<TransactionState>((set) => ({
    isOpen: false,
    step: 'idle',
    title: '',
    description: '',
    errorMessage: '',
    txHash: '',

    begin: (title: string, description = '') => {
        set({
            isOpen: true,
            step: 'ai_verify',
            title,
            description,
            errorMessage: '',
            txHash: '',
        })
    },

    advance: (step: TransactionStep, description = '') => {
        set((s) => ({
            step,
            description: description || s.description,
        }))
    },

    complete: (txHash = '') => {
        set({ step: 'success', txHash })
    },

    fail: (errorMessage: string) => {
        set({ step: 'error', errorMessage })
    },

    close: () => {
        set({ isOpen: false, step: 'idle', errorMessage: '', txHash: '' })
    },
}))
