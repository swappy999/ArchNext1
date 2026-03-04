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
        set({ buyingId: listingId })
        const toastId = toast.loading('Initiating purchase...')
        try {
            const listing = get().listings.find(l => l.id === listingId)
            if (!listing) throw new Error('Listing not found')

            let txHash = ''

            // ─── On-chain purchase: only for NFTs with a MATIC price set ───────────
            const chain: ChainId = listing.chain || 'polygon'
            if (listing.is_nft && listing.price_listed_matic && listing.price_listed_matic > 0) {
                try {
                    let marketplaceAddress = ''
                    let nftContractAddress = ''

                    // Algorand doesn't need contract addresses — skip loading
                    if (chain !== 'algorand') {
                        try {
                            const marketplaceAddrData = await import('@/contracts/PropertyMarketplace-address.json')
                            const nftAddrData = await import('@/contracts/PropertyNFT-address.json')
                            marketplaceAddress = marketplaceAddrData.address
                            nftContractAddress = nftAddrData.address
                        } catch (e) {
                            // Missing files ok if in mock mode
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
                    const networkName = chainLabel(chain)

                    if (blockchainProvider.isMock()) {
                        toast.loading('Simulating transaction via Mock Layer...', { id: toastId })
                    } else if (chain === 'algorand') {
                        toast.loading(`Submitting transaction to ${networkName}...`, { id: toastId })
                    } else {
                        toast.loading('Please confirm purchase in MetaMask...', { id: toastId })
                    }

                    const priceWei = ethers.parseEther(listing.price_listed_matic.toString())
                    const result = await adapter.buyProperty(marketplaceAddress, nftContractAddress, tokenId, priceWei)

                    toast.loading(blockchainProvider.isMock() ? 'Mock Network confirms transaction...' : `Mining transaction on ${networkName}...`, { id: toastId })
                    txHash = result.txHash

                } catch (ethError: any) {
                    console.error('MetaMask Buy Error:', ethError)
                    const parsedMsg = parseBlockchainError(ethError)
                    toast.error(parsedMsg, { id: toastId })
                    throw new Error(parsedMsg)
                }
            } else if (listing.is_nft && (!listing.price_listed_matic || listing.price_listed_matic === 0)) {
                // NFT but seller hasn't set MATIC price - record intent only
                toast.loading('Recording purchase intent (no MATIC price set by seller)...', { id: toastId })
            }

            // ─── Record in Backend ────────────────────────────────────────────────
            const token = useAuthStore.getState().accessToken
            await api.post(`/marketplace/buy/${listingId}`, {
                price: listing.price,
                price_matic: listing.is_nft ? listing.price_listed_matic : undefined,
                tx_hash: txHash
            }, token)

            // ✅ Immediately refresh portfolio to show the new asset
            const { usePortfolioStore } = await import('./portfolioStore')
            usePortfolioStore.getState().fetchPortfolio()

            // ✅ Immediately refresh properties to show the 'SOLD' status globally
            const { usePropertyStore } = await import('./propertyStore')
            await usePropertyStore.getState().syncAll()

            toast.success(
                txHash
                    ? `Acquired on-chain! TX: ${txHash.slice(0, 10)}...`
                    : '✅ Property acquired successfully!',
                { id: toastId, duration: 5000 }
            )

            // Force refresh listings
            set({ _lastFetched: 0 } as any)
            await get().fetchListings()

        } catch (e: any) {
            console.error('Buy failed:', e)
        } finally {
            set({ buyingId: null })
        }
    },

    prepareListProperty: async (propertyId: string, priceMatic: number, priceInr: number) => {
        const toastId = toast.loading('Preparing to list property...')
        try {
            const token = useAuthStore.getState().accessToken

            // Get property metadata to check if listed property is an NFT
            const propRes = await api.get(`/properties/${propertyId}`)
            const property = propRes.property || propRes

            let txHash = ''

            // ─── On-chain listing if it is an NFT ───────────
            const chain: ChainId = property.chain || 'polygon'
            if (property.is_nft && property.nft_token_id !== undefined && property.nft_token_id !== null) {
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
                const networkName = chainLabel(chain)

                if (chain === 'algorand') {
                    toast.loading(`Submitting listing to ${networkName}...`, { id: toastId })
                } else {
                    toast.loading(blockchainProvider.isMock() ? 'Mock: Approving marketplace for listing...' : 'Please approve marketplace in MetaMask...', { id: toastId })
                }

                // Approve the NFT first (Polygon / non-mock only)
                if (chain !== 'algorand' && !blockchainProvider.isMock()) {
                    const signer = await getEthersSigner()
                    const nftAbi = await import('@/contracts/PropertyNFT.json')
                    const nftContract = new ethers.Contract(nftContractAddress, nftAbi.abi, signer)
                    const approveTx = await nftContract.approve(marketplaceAddress, property.nft_token_id)
                    await approveTx.wait()
                }

                if (chain !== 'algorand') {
                    toast.loading(blockchainProvider.isMock() ? 'Mock: Listing transaction...' : 'Please confirm listing in MetaMask...', { id: toastId })
                }

                const priceWei = ethers.parseEther(priceMatic.toString())
                const result = await adapter.listProperty(marketplaceAddress, nftContractAddress, property.nft_token_id, priceWei)

                toast.loading(blockchainProvider.isMock() ? 'Mock: Mining listing transaction...' : `Mining listing on ${networkName}...`, { id: toastId })
                txHash = result.txHash
            }

            const res = await api.post(`/marketplace/list/${propertyId}`, { price_matic: priceMatic, price: priceInr, tx_hash: txHash }, token)

            toast.success(
                txHash
                    ? `Property listed on-chain! TX: ${txHash.slice(0, 10)}...`
                    : '✅ Property listed successfully!',
                { id: toastId, duration: 5000 }
            )

            const { usePropertyStore } = await import('./propertyStore')
            await usePropertyStore.getState().syncAll()

            // Force refresh listings
            set({ _lastFetched: 0 } as any)
            await get().fetchListings()
            return res
        } catch (e: any) {
            console.error('List Property failed:', e)
            toast.error(parseBlockchainError(e) || 'Failed to list property', { id: toastId })
            throw e
        }
    },
}))
