'use client'

import { create } from 'zustand'
import { api } from '@/lib/api'
import { useAuthStore } from './authStore'
import { getEthersSigner, parseBlockchainError } from './walletStore'
import { blockchainProvider } from '@/lib/blockchainProvider'
import { selectChain, chainLabel } from '@/lib/blockchain/selectChain'
import type { ChainId } from '@/lib/blockchain/types'
import { ethers } from 'ethers'
import toast from 'react-hot-toast'

interface Bid {
    id: string
    auction_id: string
    bidder_id: string
    bidder_wallet: string
    amount: number
    tx_hash: string
    created_at: string
}

interface AuctionIntelligence {
    recommended_starting_bid: number
    suggested_duration_days: number
    competition_level: string
    predicted_closing_range: [number, number]
    risk_rating: string
}

interface AIValuation {
    ward_name: string
    zone_category: string
    predicted_price_per_sqft: number
    predicted_price_per_sqm: number
    total_estimated_value: number
    confidence: number
    market_tier: string
    infra_score: number
    access_score: number
    demand_score: number
    cbd_score: number
    river_score: number
    auction_intelligence: AuctionIntelligence
}

interface Auction {
    id: string
    property_id: string
    seller_id: string
    reserve_price: number
    current_bid: number
    highest_bidder: string
    min_bid_increment: number
    start_time: string
    end_time: string
    status: string
    bid_count: number
    property?: any
    bids?: Bid[]
    ai_valuation?: AIValuation
}

interface AuctionState {
    auctions: Auction[]
    currentAuction: Auction | null
    aiValuation: AIValuation | null
    bids: Bid[]
    loading: boolean
    bidding: boolean
    approving: boolean
    fetchActiveAuctions: () => Promise<void>
    fetchAuctionDetail: (auctionId: string) => Promise<void>
    createAuction: (propertyId: string, reservePrice: number, durationHours: number) => Promise<any>
    placeBid: (auctionId: string, amount: number) => Promise<any>
    finalizeAuction: (auctionId: string) => Promise<any>
}

async function getAuctionContract(signer: ethers.Signer) {
    const addrData = await import('@/contracts/PropertyAuction-address.json')
    const abiData = await import('@/contracts/PropertyAuction.json')
    const address = addrData.address
    if (!address || address === '0x0000000000000000000000000000000000000000') {
        throw new Error('Auction contract not yet deployed. Please deploy and update the address.')
    }
    return new ethers.Contract(address, abiData.abi, signer)
}

async function getTokenContract(signer: ethers.Signer) {
    const addrData = await import('@/contracts/PropertyBiddingToken-address.json')
    const abiData = await import('@/contracts/PropertyBiddingToken.json')
    const address = addrData.address
    if (!address || address === '0x0000000000000000000000000000000000000000') {
        throw new Error('ARCH token contract not yet deployed.')
    }
    return new ethers.Contract(address, abiData.abi, signer)
}

export const useAuctionStore = create<AuctionState>((set, get) => ({
    auctions: [],
    currentAuction: null,
    aiValuation: null,
    bids: [],
    loading: false,
    bidding: false,
    approving: false,

    fetchActiveAuctions: async () => {
        set({ loading: true })
        try {
            const data = await api.get('/auction/active/all')
            set({ auctions: Array.isArray(data) ? data : [], loading: false })
        } catch {
            set({ loading: false, auctions: [] })
        }
    },

    fetchAuctionDetail: async (auctionId: string) => {
        set({ loading: true })
        try {
            const data = await api.get(`/auction/${auctionId}`)
            set({
                currentAuction: data.auction,
                aiValuation: data.ai_valuation || null,
                bids: data.bids || [],
                loading: false,
            })
        } catch {
            set({ loading: false })
        }
    },

    createAuction: async (propertyId: string, reservePrice: number, durationHours: number) => {
        const toastId = toast.loading('Preparing auction...')
        try {
            const token = useAuthStore.getState().accessToken

            // Get property detail for NFT contract info
            const propRes = await api.get(`/properties/${propertyId}`)
            const property = propRes.property || propRes

            let txHash = ''
            const chain: ChainId = property.chain || 'polygon'

            if (property.is_nft && property.nft_token_id !== undefined && property.nft_token_id !== null) {
                let auctionContractAddr = ''
                let nftContractAddr = ''

                if (chain !== 'algorand') {
                    try {
                        const addrData = await import('@/contracts/PropertyAuction-address.json')
                        auctionContractAddr = addrData.address
                        const nftData = await import('@/contracts/PropertyNFT-address.json')
                        nftContractAddr = nftData.address
                    } catch (e) {
                        if (!blockchainProvider.isMock()) throw e
                    }
                }

                let useOnChain = true;
                if (chain !== 'algorand' && (!auctionContractAddr || auctionContractAddr === '0x0000000000000000000000000000000000000000')) {
                    useOnChain = false;
                }

                const adapter = selectChain(chain)
                const networkName = chainLabel(chain)

                if (useOnChain || blockchainProvider.isMock() || chain === 'algorand') {
                    if (chain === 'algorand') {
                        toast.loading(`Creating auction on ${networkName}...`, { id: toastId })
                    } else {
                        toast.loading(blockchainProvider.isMock() ? 'Mock: Approving and starting auction...' : 'Confirm auction creation in MetaMask...', { id: toastId })
                    }

                    // Assume 1 POL reserve price format
                    const reservePriceWei = ethers.parseEther(reservePrice.toString())
                    const durationSeconds = durationHours * 3600

                    // Approve the NFT first (Polygon only)
                    if (chain !== 'algorand' && !blockchainProvider.isMock()) {
                        const signer = await getEthersSigner()
                        const nftAbi = await import('@/contracts/PropertyNFT.json')
                        const nftContract = new ethers.Contract(nftContractAddr, nftAbi.abi, signer)
                        const approveTx = await nftContract.approve(auctionContractAddr, property.nft_token_id)
                        await approveTx.wait()
                    }

                    const result = await adapter.startAuction(auctionContractAddr, nftContractAddr, property.nft_token_id, reservePriceWei, durationSeconds)
                    txHash = result.txHash
                }
            }

            const res = await api.post(`/auction/create/${propertyId}`, {
                reserve_price: reservePrice,
                duration_hours: durationHours,
                tx_hash: txHash
            }, token)

            toast.success('Auction created successfully!', { id: toastId })

            const { usePropertyStore } = await import('./propertyStore')
            await usePropertyStore.getState().syncAll()
            const { usePortfolioStore } = await import('./portfolioStore')
            usePortfolioStore.getState().fetchPortfolio()
            return res
        } catch (e: any) {
            console.error('Failed to create auction:', e)
            toast.error(parseBlockchainError(e) || 'Failed to create auction', { id: toastId })
            throw e
        }
    },

    placeBid: async (auctionId: string, amount: number) => {
        set({ bidding: true })
        const toastId = toast.loading('Preparing bid...')
        try {
            const auction = get().currentAuction
            if (!auction) throw new Error('Auction not loaded')

            let txHash = ''
            // Determine chain from auction's property (falls back to polygon)
            const chain: ChainId = (auction as any).property?.chain || 'polygon'

            try {
                const signer = await getEthersSigner()

                // ─── Step 1: Approve Token Spend ──────────────────────────────────────
                set({ approving: true })
                toast.loading('Step 1/3: Approve ARCH tokens for escrow...', { id: toastId })

                let auctionContractAddr: string = ''
                let tokenContractAddr: string = ''
                let useOnChain = true

                if (chain !== 'algorand') {
                    try {
                        const addrData = await import('@/contracts/PropertyAuction-address.json')
                        auctionContractAddr = addrData.address
                        const tokenData = await import('@/contracts/PropertyBiddingToken-address.json')
                        tokenContractAddr = tokenData.address
                        if (!auctionContractAddr || auctionContractAddr === '0x0000000000000000000000000000000000000000') {
                            useOnChain = false
                        }
                    } catch (e) {
                        if (!blockchainProvider.isMock()) useOnChain = false
                    }
                }

                const adapter = selectChain(chain)
                const networkName = chainLabel(chain)

                if (useOnChain || blockchainProvider.isMock() || chain === 'algorand') {
                    // ERC-20 Approval (amount in token units — using parseUnits for 18 decimals)
                    const amountWei = ethers.parseUnits(amount.toString(), 18)

                    if (chain === 'algorand') {
                        toast.loading(`Submitting bid to ${networkName}...`, { id: toastId })
                    } else {
                        toast.loading(blockchainProvider.isMock() ? 'Mock: Approving ARCH tokens...' : 'Approving... waiting for confirmation', { id: toastId })
                    }
                    await adapter.approveTokens(tokenContractAddr, auctionContractAddr, amountWei)

                    set({ approving: false })

                    // ─── Step 2: Place Bid ─────────────────────────────────────────────────
                    if (chain !== 'algorand') {
                        toast.loading(blockchainProvider.isMock() ? 'Mock: Confirm bid...' : 'Step 2/3: Confirm bid in MetaMask...', { id: toastId })
                    }
                    const onChainId = (auction as any).on_chain_id ?? parseInt(auction.id)
                    if (isNaN(onChainId)) throw new Error('Invalid on-chain auction ID')

                    const result = await adapter.placeBid(auctionContractAddr, onChainId, amountWei)

                    toast.loading(blockchainProvider.isMock() ? 'Mock: Mining bid transaction...' : `Step 3/3: Mining bid on ${networkName}...`, { id: toastId })
                    txHash = result.txHash
                }

            } catch (ethError: any) {
                set({ approving: false })
                const parsedMsg = parseBlockchainError(ethError)
                toast.error(parsedMsg, { id: toastId })
                throw new Error(parsedMsg)
            }

            // ─── Step 3: Record in Backend ─────────────────────────────────────────
            const token = useAuthStore.getState().accessToken
            const result = await api.post(`/auction/${auctionId}/bid`, { amount, tx_hash: txHash }, token)

            toast.success(`Bid of ₹${amount.toLocaleString('en-IN')} placed!`, { id: toastId })
            await get().fetchAuctionDetail(auctionId)
            const { usePropertyStore } = await import('./propertyStore')
            await usePropertyStore.getState().syncAll()
            return result
        } catch (e: any) {
            console.error('Bid failed:', e)
            throw e
        } finally {
            set({ bidding: false, approving: false })
        }
    },

    finalizeAuction: async (auctionId: string) => {
        const toastId = toast.loading('Finalizing auction...')
        try {
            const auction = get().currentAuction
            if (!auction) throw new Error('Auction not loaded')

            try {
                const onChainId = (auction as any).on_chain_id ?? parseInt(auction.id)
                const chain: ChainId = (auction as any).property?.chain || 'polygon'
                let auctionContractAddr = ''

                if (chain !== 'algorand') {
                    try {
                        const addrData = await import('@/contracts/PropertyAuction-address.json')
                        auctionContractAddr = addrData.address
                    } catch (e) {
                        if (!blockchainProvider.isMock()) throw e
                    }
                }

                const adapter = selectChain(chain)
                const networkName = chainLabel(chain)

                if (chain === 'algorand') {
                    toast.loading(`Finalizing auction on ${networkName}...`, { id: toastId })
                } else {
                    toast.loading(blockchainProvider.isMock() ? 'Mock: Confirm finalization...' : 'Confirm finalization in MetaMask...', { id: toastId })
                }
                await adapter.finalizeAuction(auctionContractAddr, onChainId)

            } catch (ethError: any) {
                const parsedMsg = parseBlockchainError(ethError)
                // If contract not deployed, fall through to backend-only finalization
                if (!parsedMsg.includes('not yet deployed')) {
                    toast.error(parsedMsg, { id: toastId })
                    throw new Error(parsedMsg)
                }
            }

            const token = useAuthStore.getState().accessToken
            await api.post(`/auction/${auctionId}/finalize`, {}, token)

            toast.success('Auction finalized!', { id: toastId })
            await get().fetchAuctionDetail(auctionId)
            const { usePropertyStore } = await import('./propertyStore')
            await usePropertyStore.getState().syncAll()
        } catch (e: any) {
            console.error('Finalize failed:', e)
            throw e
        }
    },
}))
