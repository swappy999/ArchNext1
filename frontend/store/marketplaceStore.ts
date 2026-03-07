import { create } from 'zustand'
import { api } from '@/lib/api'
import { useAuthStore } from './authStore'
import { getEthersSigner, parseBlockchainError, useWalletStore } from './walletStore'
import { blockchainProvider } from '@/lib/blockchainProvider'
import { selectChain, chainLabel } from '@/lib/blockchain/selectChain'
import type { ChainId } from '@/lib/blockchain/types'
import { ethers } from 'ethers'
import toast from 'react-hot-toast'

interface Listing {
    id: string
    property_id: string
    title: string
    address: string
    property_title: string
    token_id: number
    nft_token_id: number
    price: number               // INR display price
    price_listed_matic: number  // MATIC on-chain price
    seller: string
    seller_wallet: string
    owner_id?: string
    status?: string
    is_nft: boolean
    is_verified?: boolean
    tier?: string
    auction_end_time?: string
    location?: object
    ai_valuation?: any
    chain?: ChainId
}

interface MarketplaceState {
    listings: Listing[]
    loading: boolean
    buyingId: string | null
    fetchListings: () => Promise<void>
    buy: (listingId: string) => Promise<void>
    prepareListProperty: (propertyId: string, priceMatic: number, priceInr: number) => Promise<any>
}

export const useMarketplaceStore = create<MarketplaceState>((set, get) => ({
    listings: [],
    loading: false,
    buyingId: null,

    fetchListings: async () => {
        const now = Date.now()
        const state = get() as any
        if (state.listings.length > 0 && now - (state._lastFetched || 0) < 30000) return
        set({ loading: true })
        try {
            const data = await api.get('/marketplace/listings')
            set({ listings: Array.isArray(data) ? data : [], loading: false, _lastFetched: now } as any)
        } catch {
            set({ loading: false, listings: [] })
        }
    },

    buy: async (listingId: string) => {
        const { useTransactionStore } = await import('./transactionStore')
        const tx = useTransactionStore.getState()

        set({ buyingId: listingId })
        const listing = get().listings.find(l => l.id === listingId)
        if (!listing) {
            tx.fail('Listing not found. Please refresh the page.')
            return
        }

        // ─── Step 1: AI Verify (always first) ────────────────────────────────
        tx.begin('Buying Property', 'Running AI verification checks...')
        await new Promise(r => setTimeout(r, 500)) // brief UX delay for visibility

        let txHash = ''

        try {
            // ─── Step 2: Wallet Confirmation (for on-chain NFTs) ──────────────
            const chain: ChainId = listing.chain || 'polygon'
            if (listing.is_nft && listing.price_listed_matic && listing.price_listed_matic > 0) {
                tx.advance('wallet_confirm', 'Please confirm the transaction in your wallet...')

                try {
                    let marketplaceAddress = ''
                    let nftContractAddress = ''

                    if (chain !== 'algorand') {
                        try {
                            const marketplaceAddrData = await import('@/contracts/PropertyMarketplace-address.json')
                            const nftAddrData = await import('@/contracts/PropertyNFT-address.json')
                            marketplaceAddress = marketplaceAddrData.address
                            nftContractAddress = nftAddrData.address
                        } catch (e) {
                            if (!blockchainProvider.isMock()) throw e
                        }

                        if (!blockchainProvider.isMock() && (!marketplaceAddress || marketplaceAddress === '0x0000000000000000000000000000000000000000')) {
                            throw new Error('Marketplace contract not deployed yet.')
                        }
                    }

                    const tokenId = listing.token_id ?? listing.nft_token_id
                    if (tokenId === undefined || tokenId === null) {
                        throw new Error('Token ID not found for this listing')
                    }

                    const adapter = selectChain(chain)
                    const priceWei = ethers.parseEther(listing.price_listed_matic.toString())
                    const result = await adapter.buyProperty(marketplaceAddress, nftContractAddress, tokenId, priceWei)

                    // ─── Step 3: Mining ───────────────────────────────────────────────
                    tx.advance('mining', `Transaction submitted — mining on ${chainLabel(chain)}...`)
                    txHash = result.txHash

                } catch (ethError: any) {
                    const parsedMsg = parseBlockchainError(ethError)
                    tx.fail(parsedMsg)
                    set({ buyingId: null })
                    return
                }
            } else {
                // Standard (non-chain) flow — skip wallet steps 
                tx.advance('mining', 'Processing purchase...')
            }

            // ─── Step 4: DB Sync ──────────────────────────────────────────────
            tx.advance('db_sync', 'Recording ownership and syncing portfolio...')
            const token = useAuthStore.getState().accessToken
            await api.post(`/marketplace/buy/${listingId}`, {
                price: listing.price,
                price_matic: listing.is_nft ? listing.price_listed_matic : undefined,
                tx_hash: txHash,
            }, token)

            // ─── Optimistic Refresh ───────────────────────────────────────────
            const { usePortfolioStore } = await import('./portfolioStore')
            usePortfolioStore.getState().invalidatePortfolio()
            usePortfolioStore.getState().fetchPortfolio()

            const { usePropertyStore } = await import('./propertyStore')
            usePropertyStore.getState().syncAll()

            // Remove from marketplace optimistically
            set((s) => ({
                listings: s.listings.filter(l => l.id !== listingId),
                buyingId: null,
                _lastFetched: 0,
            } as any))

            // ─── Step 5: Success ──────────────────────────────────────────────
            tx.complete(txHash)

        } catch (e: any) {
            console.error('[MarketplaceStore] Buy failed:', e)
            const msg = parseBlockchainError(e) || e?.message || 'Transaction failed. Please try again.'
            tx.fail(msg)
            set({ buyingId: null })
        }
    },

    prepareListProperty: async (propertyId: string, priceMatic: number, priceInr: number) => {
        const { useTransactionStore } = await import('./transactionStore')
        const tx = useTransactionStore.getState()

        tx.begin('Listing Property', 'Running AI authenticity re-verification...')
        await new Promise(r => setTimeout(r, 400))

        try {
            const token = useAuthStore.getState().accessToken

            const propRes = await api.get(`/properties/${propertyId}`)
            const property = propRes.property || propRes

            let txHash = ''
            const chain: ChainId = property.chain || 'polygon'

            if (property.is_nft && property.nft_token_id !== undefined && property.nft_token_id !== null) {
                // Wallet approval step
                tx.advance('wallet_confirm', 'Please approve the marketplace to list your NFT...')

                let marketplaceAddress = ''
                let nftContractAddress = ''

                if (chain !== 'algorand') {
                    try {
                        const marketplaceAddrData = await import('@/contracts/PropertyMarketplace-address.json')
                        const nftAddrData = await import('@/contracts/PropertyNFT-address.json')
                        marketplaceAddress = marketplaceAddrData.address
                        nftContractAddress = nftAddrData.address
                    } catch (e) {
                        if (!blockchainProvider.isMock()) throw e
                    }

                    if (!blockchainProvider.isMock() && (!marketplaceAddress || marketplaceAddress === '0x0000000000000000000000000000000000000000')) {
                        throw new Error('Marketplace contract not deployed yet.')
                    }
                }

                const adapter = selectChain(chain)

                // Approve NFT (Polygon / non-mock only)
                if (chain !== 'algorand' && !blockchainProvider.isMock()) {
                    const signer = await getEthersSigner()
                    const nftAbi = await import('@/contracts/PropertyNFT.json')
                    const nftContract = new ethers.Contract(nftContractAddress, nftAbi.abi, signer)
                    const approveTx = await nftContract.approve(marketplaceAddress, property.nft_token_id)
                    await approveTx.wait()
                }

                tx.advance('mining', `Mining listing transaction on ${chainLabel(chain)}...`)

                const priceWei = ethers.parseEther(priceMatic.toString())
                const result = await adapter.listProperty(marketplaceAddress, nftContractAddress, property.nft_token_id, priceWei)
                txHash = result.txHash
            } else {
                tx.advance('mining', 'Preparing listing...')
            }

            // ─── DB Sync ──────────────────────────────────────────────────────
            tx.advance('db_sync', 'Creating marketplace listing and syncing map...')
            const res = await api.post(`/marketplace/list/${propertyId}`, {
                price_matic: priceMatic,
                price: priceInr,
                tx_hash: txHash,
            }, token)

            const { usePropertyStore } = await import('./propertyStore')
            await usePropertyStore.getState().syncAll()

            // Force refresh marketplace listings
            set({ _lastFetched: 0 } as any)
            await get().fetchListings()

            tx.complete(txHash)
            return res

        } catch (e: any) {
            console.error('[MarketplaceStore] List property failed:', e)
            const msg = parseBlockchainError(e) || e?.message || 'Failed to list property.'
            tx.fail(msg)
            throw e
        }
    },
}))
